document.addEventListener("DOMContentLoaded", function () {
  // Initialize Flatpickr for date selection
  flatpickr("#datepicker", {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    minDate: "today",
    // Additional options as needed
  });

  // Fetch events and populate the calendar
  fetch("/get-events")
    .then((response) => response.json())
    .then((events) => {
      const calendarEl = document.getElementById("calendar");
      if (calendarEl) {
        events.forEach((event) => {
          const eventElement = document.createElement("div");
          eventElement.className = "event";
          eventElement.innerHTML = `<strong>${event.title}</strong><br>${event.start}`;
          calendarEl.appendChild(eventElement);
        });
      }
    })
    .catch((error) => console.error("Error fetching events:", error));
});
