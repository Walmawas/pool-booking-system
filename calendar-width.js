// Desktop calendar width override.
// Keeps the infinite calendar layout intact while using the available screen width.
const style = document.createElement("style");
style.id = "calendar-width-override";
style.textContent = `
  .infinite-calendar {
    width: min(1180px, calc(100vw - 48px)) !important;
    max-width: 1180px !important;
    margin-inline: auto !important;
  }

  .calendar-panel,
  #pageCalendar,
  #calendarCapture {
    width: 100% !important;
    max-width: none !important;
  }

  @media (min-width: 1400px) {
    .infinite-calendar {
      width: min(1280px, calc(100vw - 64px)) !important;
      max-width: 1280px !important;
    }
  }

  @media (max-width: 700px) {
    .infinite-calendar {
      width: 100% !important;
      max-width: 100% !important;
    }
  }
`;
document.head.appendChild(style);
