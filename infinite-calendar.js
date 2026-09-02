import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  getFirestore,
  onSnapshot,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const config = window.__POOL_FIREBASE_CONFIG__;
if (!config) throw new Error("Firebase configuration is not available.");

const app = initializeApp(config, "infinite-calendar");
const auth = getAuth(app);
const db = getFirestore(app);

const publicGrid = document.getElementById("publicCalendarGrid");
const publicPanel = document.getElementById("pageCalendar");
const adminGrid = document.getElementById("calendarGrid");
const adminPanel = document.getElementById("calendarCapture");

const DAY_MS = 86400000;
const PUBLIC_CHUNK_DAYS = 90;
const ADMIN_CHUNK_DAYS = 90;

const publicState = {
  loadedStart: null,
  loadedEnd: null,
  slots: new Map(),
  unsubscribe: null,
  settings: {
    standardPrices: { morning: 100, evening: 120, full: 200 },
    featuredPrices: { morning: 130, evening: 150, full: 260 },
    featuredWeekdays: [4, 5, 6],
    featuredDates: []
  },
  initialized: false
};

const adminState = {
  start: startOfDay(addDays(new Date(), -ADMIN_CHUNK_DAYS)),
  end: endOfDay(addDays(new Date(), ADMIN_CHUNK_DAYS)),
  bookings: [],
  unsubscribe: null,
  initialized: false,
  liveMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
};

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function money(value) {
  return `${Number(value || 0).toLocaleString("en-US")} USD`;
}

const weekdays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const months = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];

function normalizeSettings(data = {}) {
  return {
    standardPrices: {
      morning: Number(data.standardPrices?.morning ?? data.morningPrice ?? 100),
      evening: Number(data.standardPrices?.evening ?? data.eveningPrice ?? 120),
      full: Number(data.standardPrices?.full ?? 200)
    },
    featuredPrices: {
      morning: Number(data.featuredPrices?.morning ?? 130),
      evening: Number(data.featuredPrices?.evening ?? 150),
      full: Number(data.featuredPrices?.full ?? 260)
    },
    featuredWeekdays: (data.featuredWeekdays ?? [4, 5, 6]).map(Number),
    featuredDates: [...new Set(data.featuredDates ?? [])]
  };
}

function isFeatured(key, settings) {
  return settings.featuredDates.includes(key) || settings.featuredWeekdays.includes(parseKey(key).getDay());
}

function dayPrices(key, settings) {
  return isFeatured(key, settings) ? settings.featuredPrices : settings.standardPrices;
}

function slotKey(key, period) {
  return `${key}_${period}`;
}

function installStyle() {
  const style = document.createElement("style");
  style.id = "infinite-calendar-style";
  style.textContent = `
    .calendar-controls { display:none !important; }
    .calendar-panel .panel-header .month-actions { display:none !important; }
    .calendar-panel .weekdays { display:none !important; }
    .infinite-calendar {
      display:grid; grid-template-columns:1fr; gap:14px; max-height:none;
      overflow:visible; padding:0; max-width:760px; margin:0 auto;
    }
    .infinite-day {
      position:relative; min-height:160px; padding:16px 14px 14px; border-radius:24px;
      border:1px solid #dbe9e6; background:#fff; box-shadow:0 10px 28px rgba(17,72,68,.07);
    }
    .infinite-day.today { border-color:rgba(15,118,110,.65); box-shadow:0 0 0 1px rgba(15,118,110,.14),0 10px 28px rgba(17,72,68,.08); }
    .infinite-day.booked { border-color:rgba(15,118,110,.62); }
    .infinite-day.featured { border-color:rgba(234,179,8,.65); }
    .infinite-day-head { display:grid; grid-template-columns:54px 1fr auto; align-items:center; gap:12px; min-height:54px; }
    .infinite-day-number { width:54px; height:54px; display:grid; place-items:center; border-radius:18px; background:#eef7f6; color:#0f5f59; font-size:1.55rem; font-weight:800; }
    .infinite-day-name { color:#667a76; font-size:1.05rem; font-weight:800; }
    .infinite-day-month { color:#667a76; font-size:.85rem; font-weight:700; }
    .infinite-day-today { position:absolute; left:14px; top:22px; padding:5px 12px; border-radius:999px; background:#009f73; color:#fff; font-size:.72rem; font-weight:800; }
    .infinite-slots { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:12px; }
    .infinite-slot { min-height:70px; padding:10px 12px; border-radius:18px; border:1px solid rgba(15,118,110,.35); background:#e6f5f1; color:#102321; display:grid; align-content:center; gap:5px; text-align:center; cursor:pointer; }
    .infinite-slot span { font-size:.9rem; font-weight:800; }
    .infinite-slot small { font-size:.72rem; line-height:1.45; }
    .infinite-slot.booked { background:#fde8e8; border-color:rgba(220,38,38,.3); color:#b91c1c; cursor:not-allowed; }
    .infinite-sentinel { height:2px; width:100%; }
    .infinite-title { margin:0 0 14px; color:#667a76; font-size:.95rem; font-weight:700; text-align:center; }
    .admin-infinite-calendar { display:grid; grid-template-columns:1fr; gap:18px; }
    .admin-infinite-month { padding:14px; border:1px solid #dbe9e6; border-radius:24px; background:#fff; box-shadow:0 10px 28px rgba(17,72,68,.06); }
    .admin-infinite-month-title { margin:0 0 12px; color:#0f5f59; font-size:1.1rem; font-weight:800; }
    .admin-infinite-days { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:8px; }
    .admin-infinite-day { min-height:105px; border:1px solid #e1ecea; border-radius:16px; padding:8px; background:#fff; }
    .admin-infinite-day.today { border-color:#0f766e; }
    .admin-infinite-day.outside { opacity:.5; }
    .admin-infinite-day-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:7px; }
    .admin-infinite-day-head strong { color:#0f5f59; font-size:.9rem; }
    .admin-infinite-day-head small { color:#667a76; font-size:.68rem; }
    .admin-infinite-periods { display:grid; grid-template-columns:1fr; gap:5px; }
    .admin-infinite-period { width:100%; min-height:31px; border-radius:9px; border:1px solid #b8ded8; background:#e6f5f1; color:#16443f; font-size:.72rem; cursor:pointer; }
    .admin-infinite-period.booked { background:#fde8e8; border-color:#efb3b3; color:#b91c1c; cursor:not-allowed; }
    .admin-infinite-period.selected { outline:2px solid #0f766e; }
    @media(max-width:700px){ .admin-infinite-days{grid-template-columns:repeat(2,minmax(0,1fr));} .infinite-day-month{display:none;} .infinite-day{padding:14px;} }
  `;
  document.head.appendChild(style);
}

function renderPublic() {
  if (!publicGrid || !publicState.initialized) return;
  const start = publicState.loadedStart;
  const end = publicState.loadedEnd;
  const days = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) days.push(new Date(cursor));

  publicGrid.innerHTML = `<div class="infinite-title">من البارحة فصاعدًا — مرر للأسفل لعرض المزيد</div><div class="infinite-calendar"></div><div class="infinite-sentinel" data-public-sentinel></div>`;
  const grid = publicGrid.querySelector(".infinite-calendar");
  const today = dateKey(new Date());

  days.forEach((date) => {
    const key = dateKey(date);
    const morningBooked = publicState.slots.has(slotKey(key, "morning"));
    const eveningBooked = publicState.slots.has(slotKey(key, "evening"));
    const prices = dayPrices(key, publicState.settings);
    const article = document.createElement("article");
    article.className = `infinite-day ${key === today ? "today" : ""} ${morningBooked || eveningBooked ? "booked" : ""} ${isFeatured(key, publicState.settings) ? "featured" : ""}`;
    article.innerHTML = `
      <div class="infinite-day-head">
        <span class="infinite-day-number">${date.getDate()}</span>
        <strong class="infinite-day-name">${weekdays[date.getDay()]}</strong>
        <span class="infinite-day-month">${months[date.getMonth()]}</span>
      </div>
      ${key === today ? '<span class="infinite-day-today">اليوم</span>' : ''}
      <div class="infinite-slots">
        <button class="infinite-slot ${morningBooked ? "booked" : ""} customer-slot ${morningBooked ? "is-booked" : ""}" type="button" data-public-slot="true" data-date="${key}" data-period="morning">
          <span>صباحي</span><small>${morningBooked ? "محجوز" : "متاح"} - ${money(prices.morning)} - 9am - 7pm</small>
        </button>
        <button class="infinite-slot ${eveningBooked ? "booked" : ""} customer-slot ${eveningBooked ? "is-booked" : ""}" type="button" data-public-slot="true" data-date="${key}" data-period="evening">
          <span>مسائي</span><small>${eveningBooked ? "محجوز" : "متاح"} - ${money(prices.evening)} - 9pm - 7am</small>
        </button>
      </div>`;
    grid.appendChild(article);
  });

  const sentinel = publicGrid.querySelector("[data-public-sentinel]");
  if (sentinel) observePublicSentinel(sentinel);
  if (publicPanel) publicPanel.querySelector("#publicCalendarTitle").textContent = "الروزنامة — من البارحة فصاعدًا";
}

let publicObserver;
function observePublicSentinel(sentinel) {
  publicObserver?.disconnect();
  publicObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) extendPublicForward();
  }, { rootMargin: "900px" });
  publicObserver.observe(sentinel);
}

function extendPublicForward() {
  const newEnd = addDays(publicState.loadedEnd, PUBLIC_CHUNK_DAYS);
  subscribePublicRange(publicState.loadedStart, newEnd);
}

function subscribePublicRange(start, end) {
  const nextStart = startOfDay(start);
  const nextEnd = endOfDay(end);
  if (publicState.loadedStart && publicState.loadedEnd && nextStart >= publicState.loadedStart && nextEnd <= publicState.loadedEnd) return;
  publicState.unsubscribe?.();
  publicState.loadedStart = publicState.loadedStart && publicState.loadedStart < nextStart ? publicState.loadedStart : nextStart;
  publicState.loadedEnd = publicState.loadedEnd && publicState.loadedEnd > nextEnd ? publicState.loadedEnd : nextEnd;
  publicState.slots.clear();
  publicState.unsubscribe = onSnapshot(
    query(collection(db, "bookingSlots"), where("date", ">=", dateKey(publicState.loadedStart)), where("date", "<=", dateKey(publicState.loadedEnd))),
    (snapshot) => {
      publicState.slots.clear();
      snapshot.forEach((doc) => publicState.slots.set(doc.id, doc.data()));
      publicState.initialized = true;
      renderPublic();
    },
    () => { publicState.initialized = true; publicState.slots.clear(); renderPublic(); }
  );
}

function subscribePublicSettings() {
  onSnapshot(collection(db, "settings"), (snapshot) => {
    const pricing = snapshot.docs.find((item) => item.id === "pricing");
    if (pricing) publicState.settings = normalizeSettings(pricing.data());
    renderPublic();
  });
}

function getAdminBookedMap() {
  const map = new Map();
  adminState.bookings.forEach((booking) => {
    const keys = Array.isArray(booking.slotKeys) ? booking.slotKeys : [];
    keys.forEach((key) => map.set(key, booking));
  });
  return map;
}

function monthStart(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function monthEnd(date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0); }
function monthLabel(date) { return `${months[date.getMonth()]} ${date.getFullYear()}`; }

function renderAdmin() {
  if (!adminGrid || !adminState.initialized) return;
  adminGrid.innerHTML = `<div class="admin-infinite-calendar"></div><div class="infinite-sentinel" data-admin-sentinel></div>`;
  const wrapper = adminGrid.querySelector(".admin-infinite-calendar");
  const booked = getAdminBookedMap();
  const cursor = new Date(adminState.start.getFullYear(), adminState.start.getMonth(), 1);
  const last = new Date(adminState.end.getFullYear(), adminState.end.getMonth(), 1);

  for (let month = new Date(cursor); month <= last; month = new Date(month.getFullYear(), month.getMonth() + 1, 1)) {
    const section = document.createElement("section");
    section.className = "admin-infinite-month";
    section.innerHTML = `<h3 class="admin-infinite-month-title">${monthLabel(month)}</h3><div class="admin-infinite-days"></div>`;
    const daysGrid = section.querySelector(".admin-infinite-days");
    const first = monthStart(month);
    const lastDay = monthEnd(month);
    const offset = first.getDay();
    for (let i = 0; i < offset; i++) daysGrid.appendChild(document.createElement("span"));
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      const key = dateKey(date);
      const morning = booked.get(slotKey(key, "morning"));
      const evening = booked.get(slotKey(key, "evening"));
      const cell = document.createElement("div");
      cell.className = `admin-infinite-day ${key === dateKey(new Date()) ? "today" : ""}`;
      cell.innerHTML = `<div class="admin-infinite-day-head"><strong>${d}</strong><small>${weekdays[date.getDay()]}</small></div><div class="admin-infinite-periods">
        <button class="admin-infinite-period ${morning ? "booked" : ""}" data-admin-date="${key}" data-admin-period="morning" type="button">${morning ? "محجوز" : "صباحي"}</button>
        <button class="admin-infinite-period ${evening ? "booked" : ""}" data-admin-date="${key}" data-admin-period="evening" type="button">${evening ? "محجوز" : "مسائي"}</button>
      </div>`;
      daysGrid.appendChild(cell);
    }
    wrapper.appendChild(section);
  }

  adminGrid.querySelectorAll("[data-admin-date]").forEach((button) => {
    button.addEventListener("click", () => syncAdminSelection(button.dataset.adminDate, button.dataset.adminPeriod));
  });
  const sentinel = adminGrid.querySelector("[data-admin-sentinel]");
  if (sentinel) observeAdminSentinel(sentinel);
  if (adminPanel) adminPanel.querySelector("#monthTitle").textContent = "الروزنامة — ممتدة بلا نهاية";
}

let adminObserver;
function observeAdminSentinel(sentinel) {
  adminObserver?.disconnect();
  adminObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) extendAdminForward();
  }, { rootMargin: "900px" });
  adminObserver.observe(sentinel);
}

function extendAdminForward() {
  adminState.end = addDays(adminState.end, ADMIN_CHUNK_DAYS);
  renderAdmin();
}

function syncAdminSelection(date, period) {
  const target = parseKey(date);
  const current = adminState.liveMonth;
  const monthDiff = (target.getFullYear() - current.getFullYear()) * 12 + target.getMonth() - current.getMonth();
  const nextButton = document.getElementById("nextMonthBtn");
  const prevButton = document.getElementById("prevMonthBtn");
  if (nextButton && prevButton) {
    const button = monthDiff >= 0 ? nextButton : prevButton;
    for (let i = 0; i < Math.abs(monthDiff); i++) button.click();
    adminState.liveMonth = new Date(target.getFullYear(), target.getMonth(), 1);
    const liveSlot = adminGrid?.querySelector(`.period-slot[data-date="${date}"][data-period="${period}"]`);
    if (liveSlot && !liveSlot.disabled) liveSlot.click();
  }
}

function start() {
  installStyle();
  subscribePublicSettings();
  subscribePublicRange(addDays(new Date(), -1), addDays(new Date(), PUBLIC_CHUNK_DAYS));
  onAuthStateChanged(auth, (user) => {
    if (!user) return;
    adminState.unsubscribe?.();
    adminState.unsubscribe = onSnapshot(collection(db, "bookings"), (snapshot) => {
      adminState.bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      adminState.initialized = true;
      renderAdmin();
    });
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
