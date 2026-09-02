export const firebaseConfig = {
  apiKey: "AIzaSyAsPMfhLr6R_SngsDpNkDSEQI9NI9XJhLE",
  authDomain: "pool-booking-system.firebaseapp.com",
  projectId: "pool-booking-system",
  storageBucket: "pool-booking-system.firebasestorage.app",
  messagingSenderId: "750277189276",
  appId: "1:750277189276:web:46123af8e441b593901759"
};

// Must match the Firebase Authentication account and Firestore rules.
// Firestore rules remain the authoritative authorization layer.
export const ADMIN_EMAIL = "admin@pool.local";

export const defaultSettings = {
  morningPrice: 100,
  eveningPrice: 120,
  standardPrices: {
    morning: 100,
    evening: 120,
    full: 200
  },
  featuredPrices: {
    morning: 130,
    evening: 150,
    full: 260
  },
  featuredWeekdays: [4, 5, 6],
  featuredDates: [],
  currency: "USD"
};

// Reference calendar presentation: a clean vertical day-card layout that
// stays consistent across screen sizes while keeping the existing behavior.
const calendarTheme = document.createElement("style");
calendarTheme.textContent = `
.customer-calendar-grid {
  grid-template-columns: 1fr !important;
  gap: 14px !important;
  max-width: 760px;
  margin: 0 auto;
}
.customer-day-card {
  position: relative;
  min-height: 160px !important;
  padding: 16px 14px 14px !important;
  border-radius: 24px !important;
  border: 1px solid #dbe9e6 !important;
  background: #ffffff !important;
  box-shadow: 0 10px 28px rgba(17,72,68,.07) !important;
  gap: 12px !important;
}
.customer-day-card.booked-day {
  border-color: rgba(15,118,110,.62) !important;
  background: #ffffff !important;
}
.customer-day-card.featured-day {
  border-color: rgba(234,179,8,.65) !important;
}
.customer-date {
  display: grid !important;
  grid-template-columns: 54px 1fr auto !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 0 !important;
  border-bottom: 0 !important;
  min-height: 54px;
}
.customer-date > div { display: contents !important; }
.customer-date span:first-of-type {
  grid-column: 1;
  grid-row: 1;
  width: 54px;
  height: 54px;
  display: grid !important;
  place-items: center;
  border-radius: 18px;
  background: #eef7f6;
  color: #0f5f59;
  font-size: 1.55rem !important;
  font-weight: 800 !important;
}
.customer-date strong {
  grid-column: 2;
  grid-row: 1;
  font-size: 1.05rem !important;
  color: #667a76 !important;
  white-space: nowrap;
}
.customer-date > span:last-child {
  grid-column: 3;
  grid-row: 1;
  color: #667a76 !important;
  font-size: .85rem !important;
  font-weight: 700 !important;
}
.day-price-line { display: none !important; }
.customer-slots {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0,1fr)) !important;
  gap: 10px !important;
}
.customer-slot {
  min-height: 70px !important;
  padding: 10px 12px !important;
  border-radius: 18px !important;
  border: 1px solid rgba(15,118,110,.35) !important;
  background: #e6f5f1 !important;
  color: #102321 !important;
  display: grid !important;
  align-content: center;
  gap: 5px;
  text-align: center;
}
.customer-slot span { font-size: .9rem; font-weight: 800; }
.customer-slot small { font-size: .72rem; line-height: 1.45; }
.customer-slot.is-booked {
  background: #fde8e8 !important;
  border-color: rgba(220,38,38,.30) !important;
  color: #b91c1c !important;
}
.customer-slot:not(.is-booked):active { transform: scale(.99); }
.customer-day-card.is-today {
  border-color: rgba(15,118,110,.65) !important;
  box-shadow: 0 0 0 1px rgba(15,118,110,.16), 0 10px 28px rgba(17,72,68,.08) !important;
}
.customer-day-card.is-today::before {
  content: "اليوم";
  position: absolute;
  left: 14px;
  top: 22px;
  padding: 5px 12px;
  border-radius: 999px;
  background: #009f73;
  color: #fff;
  font-size: .72rem;
  font-weight: 800;
}
@media (max-width: 560px) {
  .public-calendar-panel { padding: 12px !important; }
  .customer-calendar-grid { gap: 14px !important; }
  .customer-day-card { padding: 14px !important; border-radius: 24px !important; }
  .customer-date { grid-template-columns: 52px 1fr !important; }
  .customer-date > span:last-child { display: none !important; }
  .customer-slots { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
}
`;
document.head.appendChild(calendarTheme);

const markToday = () => {
  const grid = document.getElementById("publicCalendarGrid");
  if (!grid) return;
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  grid.querySelectorAll(".customer-day-card").forEach((card) => {
    const dateButton = card.querySelector("[data-date]");
    card.classList.toggle("is-today", dateButton?.dataset.date === key);
  });
};

const observeCalendar = () => {
  const grid = document.getElementById("publicCalendarGrid");
  if (!grid) return false;
  new MutationObserver(markToday).observe(grid, { childList: true });
  markToday();
  return true;
};

if (!observeCalendar()) {
  window.addEventListener("DOMContentLoaded", observeCalendar, { once: true });
}
