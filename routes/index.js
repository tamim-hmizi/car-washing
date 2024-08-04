const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();

// Open SQLite database
const db = new sqlite3.Database("mydatabase.db");

/* GET home page. */
router.get("/", (req, res) => {
  // Get available hours for a specific date
  db.all(
    `SELECT DISTINCT wash_time FROM vehicle_wash WHERE wash_date = ?`,
    [req.query.date],
    (err, rows) => {
      if (err) {
        return console.error(err.message);
      }
      // Extract booked hours
      const bookedHours = rows.map((row) => row.wash_time);
      // Render form with available hours
      res.render("index", { bookedHours: bookedHours });
    }
  );
});

/* POST form data */
router.post("/submit", (req, res) => {
  const { vehicle_name, driver_name, wash_date, wash_time } = req.body;

  db.run(
    `INSERT INTO vehicle_wash (vehicle_name, driver_name, wash_date, wash_time) VALUES (?, ?, ?, ?)`,
    [vehicle_name, driver_name, wash_date, wash_time],
    function (err) {
      if (err) {
        return console.log(err.message);
      }
      res.redirect("/");
    }
  );
});

// GET available hours for a specific date
router.get("/available-hours", (req, res) => {
    const { date } = req.query;
    db.all(`SELECT DISTINCT wash_time FROM vehicle_wash WHERE wash_date = ?`, [date], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        // Send booked hours as JSON response
        const bookedHours = rows.map(row => row.wash_time);
        res.json(bookedHours);
    });
});


// Route for Admin Login Page
router.get("/admin-login", (req, res) => {
    res.render("admin-login");
});

// Route to handle Admin Login Form
router.post("/admin-login", (req, res) => {
    const { password } = req.body;

    db.get(`SELECT * FROM admin WHERE id = 1`, (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (row && row.password === password) {
            res.redirect("/admin-page");
        } else {
            res.render('error',{message:"invalid password!"
        })}
    });
});

// Route for Admin Page
router.get("/admin-page", (req, res) => {
    res.render("admin-page");
});

// GET events (reservations) for FullCalendar
router.get("/events", (req, res) => {
  db.all("SELECT * FROM vehicle_wash", (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
      return;
    }

    // Format events for FullCalendar
    const events = rows.map((row) => {
      const start = new Date(`${row.wash_date}T${row.wash_time}`);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // Add one hour

      return {
        title: `${row.vehicle_name} - ${row.driver_name}`,
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: false, // Events are not all-day
      };
    });

    res.json(events);
  });
});




module.exports = router;
