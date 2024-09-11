const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();

// Open SQLite database
const db = new sqlite3.Database("mydatabase.db");

// Initialize database schema
function initializeDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS vehicle_wash (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_name TEXT,
      driver_name TEXT,
      wash_date TEXT,
      wash_time TEXT,
      vehicle_size TEXT,
      number_of_units INTEGER,
      wash_type TEXT,
      polish_type TEXT,
      number_of_pieces INTEGER,
      calculated_price REAL
    );

    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY,
      password TEXT
    );
  `;

  db.exec(schema, (err) => {
    if (err) {
      console.error("Error initializing database schema:", err.message);
    } else {
      console.log("Database schema initialized");
    }
  });

  const hashedPassword = "seiffies";  // Ideally, use a hashed password
  db.run(
    `INSERT OR IGNORE INTO admin (id, password) VALUES (?, ?)`,
    [1, hashedPassword],
    (err) => {
      if (err) {
        console.error("Error inserting admin user:", err.message);
      } else {
        console.log("Admin user added");
      }
    }
  );
  const hashedPassword2 = "123seiffies321";  // Ideally, use a hashed password
  db.run(
    `INSERT OR IGNORE INTO admin (id, password) VALUES (?, ?)`,
    [2, hashedPassword2],
    (err) => {
      if (err) {
        console.error("Error inserting admin user:", err.message);
      } else {
        console.log("Admin user added");
      }
    }
  );
}

// Call schema initialization function
initializeDatabase();

/* GET home page with available hours only for "lavage rapide" */
router.get("/", (req, res) => {
  db.all(
    `SELECT DISTINCT wash_time FROM vehicle_wash WHERE wash_date = ? AND wash_type = ?`,
    [req.query.date, "lavage rapide"],
    (err, rows) => {
      if (err) {
        return console.error(err.message);
      }
      const bookedHours = rows.map((row) => row.wash_time);
      res.render("index", { bookedHours: bookedHours });
    }
  );
});

/* POST form data to add a new vehicle wash entry */
router.post("/submit", (req, res) => {
  const {
    vehicle_name,
    driver_name,
    wash_date,
    wash_time,
    vehicle_size,
    number_of_units,
    wash_type,
    polish_type = null,  // Optional polish_type field
    number_of_pieces = null,  // Optional field for pieces in case of "Polissage par Pièce"
    calculated_price
  } = req.body;

  if (!vehicle_name || !driver_name || !wash_date || !wash_type || !calculated_price) {
    return res.render('error', { message: "fill the full form" });
  }

  db.run(
    `INSERT INTO vehicle_wash (vehicle_name, driver_name, wash_date, wash_time, vehicle_size, number_of_units, wash_type, polish_type, number_of_pieces, calculated_price)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      vehicle_name,
      driver_name,
      wash_date,
      wash_time,
      vehicle_size,
      number_of_units,
      wash_type,
      polish_type,
      number_of_pieces,
      calculated_price,
    ],
    (err) => {
      if (err) {
        return res.render('error', { message: "error inserting data" });
      }
      res.render('index')
    }
  );
});

/* GET available hours for 'Lavage Rapide' on a specific date */
router.get("/available-hours", (req, res) => {
  const washDate = req.query.date;

  if (!washDate) {
    return res.status(400).json({ error: "Date is required" });
  }

  db.all(
    `SELECT DISTINCT wash_time FROM vehicle_wash WHERE wash_date = ? AND wash_type = ?`,
    [washDate, "rapide"],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const bookedHours = rows.map((row) => row.wash_time);
      res.json(bookedHours);
    }
  );
});

// Route for Admin Login Page
router.get("/admin-login", (req, res) => {
  res.render("admin-login");
});

router.get("/ca-page", (req, res) => {
  res.render("ca-page");
});

router.post("/admin-login", (req, res) => {
  const { password } = req.body;

  db.get(`SELECT * FROM admin WHERE id = 1`, (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send("Internal Server Error");
    }

    if (row && password == row.password) {
      res.redirect("/admin-page");
    } else {
      // Check for the second admin user
      db.get(`SELECT * FROM admin WHERE id = 2`, (err, row) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send("Internal Server Error");
        }

        if (row && password == row.password) {
          res.redirect("/ca-page");
        } else {
          res.render("admin-login", { error: "Invalid credentials" });
        }
      });
    }
  });
});

// Route for Admin Page
router.get("/admin-page", (req, res) => {
  res.render("admin-page");
});

router.get("/events", (req, res) => {
  db.all("SELECT * FROM vehicle_wash", (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
      return;
    }

    const events = rows.map((row) => {
      // Start time set to 8:00 AM
      let start = new Date(`${row.wash_date}T08:00:00`);

      let end;
      let allDay = false;

      if (row.wash_type === 'interieur' || row.wash_type === 'polissage') {
        // All day event from 8:00 AM to 10:00 PM
        end = new Date(`${row.wash_date}T22:00:00`);
        allDay = false; // Not actually an all-day event, but spans the day within the specified hours
      } else if (row.wash_type === 'lavage rapide') {
        // 30 minutes for lavage rapide
        start = new Date(`${row.wash_date}T${row.wash_time}`);
        end = new Date(start.getTime() + 30 * 60 * 1000);
        allDay = false;
      } else {
        // Default to 30 minutes if size/type isn't specified
        start = new Date(`${row.wash_date}T${row.wash_time}`);
        end = new Date(start.getTime() + 30 * 60 * 1000);
        allDay = false;
      }

      return {
        id: row.id,
        title: `${row.vehicle_name} - ${row.driver_name}`,
        start: start,
        end: end,
        allDay: allDay, // Set to false if it's not a full-day event
        extendedProps: {
          size: row.vehicle_size,
          number: row.number_of_units,
          wash_type: row.wash_type,
          polish_type: row.polish_type ?? null,
          number_of_pieces: row.number_of_pieces ?? null,
          calculated_price: row.calculated_price,
        }
      };
    });

    res.json(events);
  });
});




// DELETE event by ID
router.delete("/delete-event/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM vehicle_wash WHERE id = ?", [id], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Failed to delete event");
      return;
    }
    res.sendStatus(200);
  });
});

module.exports = router;
