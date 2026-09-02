import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { collection, getFirestore, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const config = window.__POOL_FIREBASE_CONFIG__;
if (!config) throw new Error("Firebase configuration is not available.");
const app = initializeApp(config, "admin-infinite-calendar");
const auth = getAuth(app);
const db = getFirestore(app);

const grid = document.getElementById("calendarGrid");
const prevBtn = document.getElementById("prevMonthBtn");
const nextBtn = document.getElementById("nextMonthBtn");
const monthTitle = document.getElementById("monthTitle");
if (!grid) throw new Error("Admin calendar grid is missing.");

const CHUNK_DAYS = 90;
const weekdays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const months = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
let bookings = [];
let initialized = false;
let rendering = false;
let topObserver;
let bottomObserver;
let liveMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

let start = addDays(new Date(), -CHUNK_DAYS);
let end = addDays(new Date(), CHUNK_DAYS);

function addDays(date, amount) { const d = new Date(date); d.setDate(d.getDate() + amount); return d; }
function key(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function parseKey(value) { const [y,m,d] = value.split("-").map(Number); return new Date(y,m-1,d); }
function slotKey(date, period) { return `${date}_${period}`; }
function monthStart(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function monthEnd(date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0); }
function monthLabel(date) { return `${months[date.getMonth()]} ${date.getFullYear()}`; }
function bookedMap() {
  const map = new Map();
  bookings.forEach((booking) => (booking.slotKeys || []).forEach((slot) => map.set(slot, booking)));
  return map;
}

function installStyle() {
  const style = document.createElement("style");
  style.textContent = `
    #calendarGrid { overflow:visible !important; }
    #calendarGrid > .admin-infinite-root { display:block; }
    .admin-infinite-month { margin-bottom:18px; padding:14px; border:1px solid #dbe9e6; border-radius:24px; background:#fff; box-shadow:0 10px 28px rgba(17,72,68,.06); }
    .admin-infinite-month-title { margin:0 0 12px; color:#0f5f59; font-size:1.1rem; font-weight:800; }
    .admin-infinite-days { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:8px; }
    .admin-infinite-day { min-height:105px; border:1px solid #e1ecea; border-radius:16px; padding:8px; background:#fff; }
    .admin-infinite-day.today { border-color:#0f766e; }
    .admin-infinite-day-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:7px; }
    .admin-infinite-day-head strong { color:#0f5f59; font-size:.9rem; }
    .admin-infinite-day-head small { color:#667a76; font-size:.68rem; }
    .admin-infinite-periods { display:grid; grid-template-columns:1fr; gap:5px; }
    .admin-infinite-period { width:100%; min-height:31px; border-radius:9px; border:1px solid #b8ded8; background:#e6f5f1; color:#16443f; font-size:.72rem; cursor:pointer; }
    .admin-infinite-period.booked { background:#fde8e8; border-color:#efb3b3; color:#b91c1c; cursor:not-allowed; }
    .admin-infinite-sentinel { height:12px; }
    @media(max-width:700px){ .admin-infinite-days{grid-template-columns:repeat(2,minmax(0,1fr));} }
  `;
  document.head.appendChild(style);
}

function render() {
  if (!initialized || rendering) return;
  rendering = true;
  const map = bookedMap();
  grid.innerHTML = `<div class="admin-infinite-root"><div class="admin-infinite-sentinel" data-top></div></div>`;
  const root = grid.querySelector(".admin-infinite-root");
  const cursor = monthStart(start);
  const last = monthStart(end);

  for (let month = new Date(cursor); month <= last; month = new Date(month.getFullYear(), month.getMonth() + 1, 1)) {
    const section = document.createElement("section");
    section.className = "admin-infinite-month";
    section.innerHTML = `<h3 class="admin-infinite-month-title">${monthLabel(month)}</h3><div class="admin-infinite-days"></div>`;
    const days = section.querySelector(".admin-infinite-days");
    const first = monthStart(month);
    const lastDay = monthEnd(month);
    for (let i = 0; i < first.getDay(); i++) days.appendChild(document.createElement("span"));
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      const dateValue = key(date);
      const morning = map.get(slotKey(dateValue, "morning"));
      const evening = map.get(slotKey(dateValue, "evening"));
      const cell = document.createElement("div");
      cell.className = `admin-infinite-day ${dateValue === key(new Date()) ? "today" : ""}`;
      cell.innerHTML = `<div class="admin-infinite-day-head"><strong>${d}</strong><small>${weekdays[date.getDay()]}</small></div><div class="admin-infinite-periods">
        <button type="button" class="admin-infinite-period ${morning ? "booked" : ""}" data-admin-date="${dateValue}" data-admin-period="morning">${morning ? "محجوز" : "صباحي"}</button>
        <button type="button" class="admin-infinite-period ${evening ? "booked" : ""}" data-admin-date="${dateValue}" data-admin-period="evening">${evening ? "محجوز" : "مسائي"}</button>
      </div>`;
      days.appendChild(cell);
    }
    root.appendChild(section);
  }
  root.insertAdjacentHTML("beforeend", `<div class="admin-infinite-sentinel" data-bottom></div>`);
  root.querySelectorAll("[data-admin-date]").forEach((button) => {
    button.addEventListener("click", () => selectSlot(button.dataset.adminDate, button.dataset.adminPeriod));
  });
  monthTitle.textContent = "الروزنامة — ممتدة بلا نهاية";
  rendering = false;
  observeSentinels(root);
}

function observeSentinels(root) {
  topObserver?.disconnect();
  bottomObserver?.disconnect();
  const top = root.querySelector("[data-top]");
  const bottom = root.querySelector("[data-bottom]");
  topObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) extendBackward();
  }, { rootMargin: "900px" });
  bottomObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) extendForward();
  }, { rootMargin: "900px" });
  topObserver.observe(top);
  bottomObserver.observe(bottom);
}

function extendBackward() { start = addDays(start, -CHUNK_DAYS); render(); }
function extendForward() { end = addDays(end, CHUNK_DAYS); render(); }

function selectSlot(dateValue, period) {
  if (bookedMap().has(slotKey(dateValue, period))) return;
  const target = parseKey(dateValue);
  const diff = (target.getFullYear() - liveMonth.getFullYear()) * 12 + target.getMonth() - liveMonth.getMonth();
  const button = diff >= 0 ? nextBtn : prevBtn;
  for (let i = 0; i < Math.abs(diff); i++) button?.click();
  liveMonth = new Date(target.getFullYear(), target.getMonth(), 1);
  const liveSlot = grid.querySelector(`.period-slot[data-date="${dateValue}"][data-period="${period}"]`);
  if (liveSlot && !liveSlot.disabled) liveSlot.click();
}

function startApp() {
  installStyle();
  onAuthStateChanged(auth, (user) => {
    if (!user) return;
    onSnapshot(collection(db, "bookings"), (snapshot) => {
      bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      initialized = true;
      render();
    });
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startApp, { once: true });
else startApp();
