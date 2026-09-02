import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { ADMIN_EMAIL, defaultSettings, firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const els = {
  loadingOverlay: document.getElementById("loadingOverlay"),
  toastContainer: document.getElementById("toastContainer"),
  publicView: document.getElementById("publicView"),
  loginView: document.getElementById("loginView"),
  appView: document.getElementById("appView"),
  publicPages: [...document.querySelectorAll("[data-public-page]")],
  routeLinks: [...document.querySelectorAll("[data-route-link]")],
  loginForm: document.getElementById("loginForm"),
  emailInput: document.getElementById("emailInput"),
  passwordInput: document.getElementById("passwordInput"),
  userEmail: document.getElementById("userEmail"),
  logoutBtn: document.getElementById("logoutBtn"),
  bookingCount: document.getElementById("bookingCount"),
  totalRevenue: document.getElementById("totalRevenue"),
  totalDeposits: document.getElementById("totalDeposits"),
  reservedSlots: document.getElementById("reservedSlots"),
  monthTitle: document.getElementById("monthTitle"),
  calendarGrid: document.getElementById("calendarGrid"),
  prevMonthBtn: document.getElementById("prevMonthBtn"),
  nextMonthBtn: document.getElementById("nextMonthBtn"),
  todayBtn: document.getElementById("todayBtn"),
  bookingForm: document.getElementById("bookingForm"),
  formTitle: document.getElementById("formTitle"),
  editingBookingId: document.getElementById("editingBookingId"),
  resetFormBtn: document.getElementById("resetFormBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  selectedDaysCount: document.getElementById("selectedDaysCount"),
  periodSelect: document.getElementById("periodSelect"),
  clientNameInput: document.getElementById("clientNameInput"),
  phoneInput: document.getElementById("phoneInput"),
  priceInput: document.getElementById("priceInput"),
  depositInput: document.getElementById("depositInput"),
  notesInput: document.getElementById("notesInput"),
  settingsForm: document.getElementById("settingsForm"),
  morningPriceInput: document.getElementById("morningPriceInput"),
  eveningPriceInput: document.getElementById("eveningPriceInput"),
  fullPriceInput: document.getElementById("fullPriceInput"),
  featuredMorningPriceInput: document.getElementById("featuredMorningPriceInput"),
  featuredEveningPriceInput: document.getElementById("featuredEveningPriceInput"),
  featuredFullPriceInput: document.getElementById("featuredFullPriceInput"),
  currencySelect: document.getElementById("currencySelect"),
  featuredDateInput: document.getElementById("featuredDateInput"),
  addFeaturedDateBtn: document.getElementById("addFeaturedDateBtn"),
  featuredDatesList: document.getElementById("featuredDatesList"),
  bookingsTable: document.getElementById("bookingsTable"),
  exportWeeklyBtn: document.getElementById("exportWeeklyBtn"),
  shareCalendarBtn: document.getElementById("shareCalendarBtn"),
  calendarCapture: document.getElementById("calendarCapture"),
  publicCalendarTitle: document.getElementById("publicCalendarTitle"),
  publicCalendarGrid: document.getElementById("publicCalendarGrid"),
  publicPricesGrid: document.getElementById("publicPricesGrid"),
  publicViewMode: document.getElementById("publicViewMode"),
  publicStartDate: document.getElementById("publicStartDate"),
  publicEndDate: document.getElementById("publicEndDate"),
  publicPrevBtn: document.getElementById("publicPrevBtn"),
  publicNextBtn: document.getElementById("publicNextBtn"),
  publicTodayBtn: document.getElementById("publicTodayBtn"),
  slotModal: document.getElementById("slotModal"),
  closeSlotModalBtn: document.getElementById("closeSlotModalBtn"),
  slotModalStatus: document.getElementById("slotModalStatus"),
  slotModalTitle: document.getElementById("slotModalTitle"),
  slotModalMeta: document.getElementById("slotModalMeta"),
  slotModalPrice: document.getElementById("slotModalPrice")
};

const state = {
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  bookings: [],
  selectedSlots: new Set(),
  publicSlots: new Map(),
  publicAnchorDate: new Date(),
  featuredDatesDraft: new Set(defaultSettings.featuredDates || []),
  settings: normalizeSettings(defaultSettings),
  currentUser: null,
  unsubscribeBookings: null,
  unsubscribeSettings: null,
  unsubscribePublicSlots: null,
  publicQueryKey: ""
};

const periodLabels = { morning: "صباحي", evening: "مسائي", full: "كامل", mixed: "فترات متعددة", auto: "تلقائي" };
const slotLabels = { morning: "صباحي", evening: "مسائي" };
const arabicMonthNames = ["كانون الثاني","شباط","آذار","نيسان","أيار","حزيران","تموز","آب","أيلول","تشرين الأول","تشرين الثاني","كانون الأول"];
const arabicWeekdayNames = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

injectPerformanceStyles();
initializePublicControls();
bindEvents();
subscribeSettings();
subscribePublicSlots();

setPersistence(auth, browserLocalPersistence).catch(() => toast("تعذر حفظ الجلسة محليًا.", "error"));

onAuthStateChanged(auth, async (user) => {
  state.currentUser = user;
  if (!user) {
    cleanupAdminRealtime();
    renderRoute();
    showLoading(false);
    return;
  }
  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    await signOut(auth);
    toast("هذا الحساب لا يملك صلاحية المدير.", "error");
    renderRoute();
    return;
  }
  subscribeBookings();
  renderRoute();
});

function bindEvents() {
  window.addEventListener("hashchange", renderRoute);
  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showLoading(true);
    try {
      await signInWithEmailAndPassword(auth, els.emailInput.value.trim(), els.passwordInput.value);
      toast("تم تسجيل الدخول بنجاح.", "success");
    } catch (error) {
      toast(getFriendlyAuthError(error), "error");
    } finally { showLoading(false); }
  });
  els.logoutBtn.addEventListener("click", () => signOut(auth));

  els.publicViewMode.addEventListener("change", () => {
    syncCustomInputsVisibility();
    subscribePublicSlots();
    renderPublicCalendar();
  });
  els.publicStartDate.addEventListener("change", () => { subscribePublicSlots(); renderPublicCalendar(); });
  els.publicEndDate.addEventListener("change", () => { subscribePublicSlots(); renderPublicCalendar(); });
  els.publicPrevBtn.addEventListener("click", () => movePublicRange(-1));
  els.publicNextBtn.addEventListener("click", () => movePublicRange(1));
  els.publicTodayBtn.addEventListener("click", () => {
    state.publicAnchorDate = new Date();
    setDefaultPublicDates();
    subscribePublicSlots();
    renderPublicCalendar();
  });
  els.publicCalendarGrid.addEventListener("click", (event) => {
    const slot = event.target.closest("[data-public-slot]");
    if (slot) openSlotModal(slot.dataset.date, slot.dataset.period);
  });
  els.closeSlotModalBtn.addEventListener("click", closeSlotModal);
  els.slotModal.addEventListener("click", (event) => {
    if (event.target === els.slotModal) closeSlotModal();
  });

  els.prevMonthBtn.addEventListener("click", () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  els.nextMonthBtn.addEventListener("click", () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
    renderCalendar();
  });
  els.todayBtn.addEventListener("click", () => {
    const today = new Date();
    state.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    renderCalendar();
  });
  els.periodSelect.addEventListener("change", () => {
    state.selectedSlots.clear();
    updateSelectedSummary();
    renderCalendar();
  });
  els.resetFormBtn.addEventListener("click", resetBookingForm);
  els.cancelEditBtn.addEventListener("click", resetBookingForm);
  [els.morningPriceInput, els.eveningPriceInput, els.featuredMorningPriceInput, els.featuredEveningPriceInput]
    .forEach((input) => input.addEventListener("input", updateSelectedSummary));

  els.addFeaturedDateBtn.addEventListener("click", () => {
    const date = els.featuredDateInput.value;
    if (!date) return toast("اختر تاريخًا لإضافته.", "error");
    state.featuredDatesDraft.add(date);
    els.featuredDateInput.value = "";
    renderFeaturedDatesList();
  });
  els.featuredDatesList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-date]");
    if (!button) return;
    state.featuredDatesDraft.delete(button.dataset.date);
    renderFeaturedDatesList();
  });

  els.bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const booking = collectBookingForm();
    if (!booking) return;
    showLoading(true);
    try {
      await saveBooking(booking);
      toast(booking.id ? "تم تعديل الحجز بنجاح." : "تم حفظ الحجز بنجاح.", "success");
      resetBookingForm();
    } catch (error) {
      toast(error.message || "تعذر حفظ الحجز.", "error");
    } finally { showLoading(false); }
  });

  els.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const settings = collectSettingsForm();
    if (!settings) return;
    showLoading(true);
    try {
      await setDoc(doc(db, "settings", "pricing"), { ...settings, updatedAt: serverTimestamp() });
      toast("تم تحديث إعدادات التسعير.", "success");
    } catch (error) { toast(error.message || "تعذر حفظ الإعدادات.", "error"); }
    finally { showLoading(false); }
  });

  els.bookingsTable.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const booking = state.bookings.find((item) => item.id === button.dataset.id);
    if (!booking) return;
    if (button.dataset.action === "edit") return loadBookingForEdit(booking);
    if (button.dataset.action === "delete") {
      if (!window.confirm("هل تريد حذف هذا الحجز؟")) return;
      showLoading(true);
      try { await deleteBooking(booking); toast("تم حذف الحجز.", "success"); resetBookingForm(); }
      catch (error) { toast(error.message || "تعذر حذف الحجز.", "error"); }
      finally { showLoading(false); }
    }
  });

  els.exportWeeklyBtn.addEventListener("click", exportWeeklyReport);
  els.shareCalendarBtn.addEventListener("click", shareCalendarImage);
}

function renderRoute() {
  const route = getRoute();
  if (route === "admin") {
    if (state.currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) showDashboard(state.currentUser);
    else showLogin();
    return;
  }
  showPublicView(route);
}

function getRoute() {
  const route = window.location.hash.replace("#", "") || "home";
  return ["home","calendar","prices","studio","payment","contact","admin"].includes(route) ? route : "home";
}

function showPublicView(route) {
  els.publicView.classList.remove("is-hidden");
  els.loginView.classList.add("is-hidden");
  els.appView.classList.add("is-hidden");
  els.publicPages.forEach((page) => page.classList.toggle("is-hidden", page.dataset.publicPage !== route));
  els.routeLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${route}`));
  if (route === "calendar") { subscribePublicSlots(); renderPublicCalendar(); }
  if (route === "prices") renderPublicPrices();
}

function showLogin() {
  els.publicView.classList.add("is-hidden");
  els.loginView.classList.remove("is-hidden");
  els.appView.classList.add("is-hidden");
}

function showDashboard(user) {
  els.userEmail.textContent = user.email || "";
  els.publicView.classList.add("is-hidden");
  els.loginView.classList.add("is-hidden");
  els.appView.classList.remove("is-hidden");
  renderSettings(); renderStats(); renderCalendar(); renderBookingsTable(); showLoading(false);
}

function showLoading(isActive) { els.loadingOverlay.classList.toggle("is-active", isActive); }
function toast(message, type = "success") {
  const item = document.createElement("div");
  item.className = `toast ${type}`; item.textContent = message; els.toastContainer.appendChild(item);
  window.setTimeout(() => item.remove(), 4200);
}
function cleanupAdminRealtime() { state.unsubscribeBookings?.(); state.unsubscribeBookings = null; state.bookings = []; }

function subscribeSettings() {
  state.unsubscribeSettings?.();
  state.unsubscribeSettings = onSnapshot(doc(db, "settings", "pricing"), (snapshot) => {
    state.settings = normalizeSettings(snapshot.exists() ? snapshot.data() : defaultSettings);
    state.featuredDatesDraft = new Set(state.settings.featuredDates);
    renderSettings(); renderPublicCalendar(); renderPublicPrices(); updateSelectedSummary();
  }, () => {
    state.settings = normalizeSettings(defaultSettings);
    renderPublicCalendar(); renderPublicPrices();
  });
}

function subscribePublicSlots() {
  const range = getPublicDateRange();
  const key = `${range.start}_${range.end}`;
  if (key === state.publicQueryKey && state.unsubscribePublicSlots) return;
  state.unsubscribePublicSlots?.();
  state.unsubscribePublicSlots = null;
  state.publicQueryKey = key;
  state.publicSlots = new Map();
  if (!range.start || !range.end) { renderPublicCalendar(); return; }
  state.unsubscribePublicSlots = onSnapshot(
    query(collection(db, "bookingSlots"), where("date", ">=", range.start), where("date", "<=", range.end)),
    (snapshot) => {
      state.publicSlots = new Map(snapshot.docs.map((slotDoc) => [slotDoc.id, { id: slotDoc.id, ...slotDoc.data() }]));
      renderPublicCalendar();
    },
    (error) => { state.publicSlots = new Map(); renderPublicCalendar(); toast(error.message || "تعذر تحديث الرزنامة.", "error"); }
  );
}

function subscribeBookings() {
  state.unsubscribeBookings?.();
  state.unsubscribeBookings = onSnapshot(query(collection(db, "bookings"), orderBy("createdAt", "desc")), (snapshot) => {
    state.bookings = snapshot.docs.map((bookingDoc) => ({ id: bookingDoc.id, ...bookingDoc.data() }));
    renderStats(); renderCalendar(); renderBookingsTable();
  }, (error) => toast(error.message || "تعذر تحميل الحجوزات.", "error"));
}

function normalizeSettings(raw = {}) {
  const standardMorning = Number(raw.standardPrices?.morning ?? raw.morningPrice ?? defaultSettings.morningPrice ?? 0);
  const standardEvening = Number(raw.standardPrices?.evening ?? raw.eveningPrice ?? defaultSettings.eveningPrice ?? 0);
  const standardFull = Number(raw.standardPrices?.full ?? defaultSettings.standardPrices?.full ?? standardMorning + standardEvening);
  const featuredMorning = Number(raw.featuredPrices?.morning ?? raw.featuredMorningPrice ?? defaultSettings.featuredPrices?.morning ?? standardMorning);
  const featuredEvening = Number(raw.featuredPrices?.evening ?? raw.featuredEveningPrice ?? defaultSettings.featuredPrices?.evening ?? standardEvening);
  const featuredFull = Number(raw.featuredPrices?.full ?? defaultSettings.featuredPrices?.full ?? featuredMorning + featuredEvening);
  return {
    standardPrices: { morning: standardMorning, evening: standardEvening, full: standardFull },
    featuredPrices: { morning: featuredMorning, evening: featuredEvening, full: featuredFull },
    featuredWeekdays: (raw.featuredWeekdays ?? defaultSettings.featuredWeekdays ?? [4,5,6]).map(Number),
    featuredDates: [...new Set(raw.featuredDates ?? defaultSettings.featuredDates ?? [])].sort(), currency: "USD"
  };
}

function renderSettings() {
  if (!els.morningPriceInput) return;
  els.morningPriceInput.value = state.settings.standardPrices.morning;
  els.eveningPriceInput.value = state.settings.standardPrices.evening;
  els.fullPriceInput.value = state.settings.standardPrices.full;
  els.featuredMorningPriceInput.value = state.settings.featuredPrices.morning;
  els.featuredEveningPriceInput.value = state.settings.featuredPrices.evening;
  els.featuredFullPriceInput.value = state.settings.featuredPrices.full;
  els.currencySelect.value = "USD";
  document.querySelectorAll('input[name="featuredWeekday"]').forEach((checkbox) => checkbox.checked = state.settings.featuredWeekdays.includes(Number(checkbox.value)));
  renderFeaturedDatesList();
}

function renderFeaturedDatesList() {
  const dates = [...state.featuredDatesDraft].sort();
  els.featuredDatesList.innerHTML = dates.length ? dates.map((dateKey) => `<span class="date-chip">${escapeHtml(formatLongDate(dateKey))}<button type="button" data-date="${dateKey}" aria-label="حذف التاريخ">×</button></span>`).join("") : '<span class="muted-note">لا توجد تواريخ مخصصة.</span>';
}

function collectSettingsForm() {
  const values = [els.morningPriceInput, els.eveningPriceInput, els.fullPriceInput, els.featuredMorningPriceInput, els.featuredEveningPriceInput, els.featuredFullPriceInput].map((input) => Number(input.value));
  if (values.some((value) => !Number.isFinite(value) || value < 0)) { toast("الأسعار يجب أن تكون أرقامًا غير سالبة.", "error"); return null; }
  return {
    standardPrices: { morning: values[0], evening: values[1], full: values[2] },
    featuredPrices: { morning: values[3], evening: values[4], full: values[5] },
    featuredWeekdays: [...document.querySelectorAll('input[name="featuredWeekday"]:checked')].map((item) => Number(item.value)),
    featuredDates: [...state.featuredDatesDraft].sort(), currency: "USD"
  };
}

function renderStats() {
  const totals = state.bookings.reduce((acc, booking) => {
    acc.revenue += Number(booking.price || 0); acc.deposits += Number(booking.deposit || 0); acc.slots += getBookingSlotKeys(booking).length; return acc;
  }, { revenue: 0, deposits: 0, slots: 0 });
  els.bookingCount.textContent = state.bookings.length;
  els.totalRevenue.textContent = formatMoney(totals.revenue);
  els.totalDeposits.textContent = formatMoney(totals.deposits);
  els.reservedSlots.textContent = totals.slots;
}

function initializePublicControls() { els.publicViewMode.value = "week"; setDefaultPublicDates(); syncCustomInputsVisibility(); }
function setDefaultPublicDates() { const today = new Date(); const end = new Date(today); end.setDate(today.getDate() + 6); els.publicStartDate.value = toDateKey(today); els.publicEndDate.value = toDateKey(end); }
function syncCustomInputsVisibility() { const custom = els.publicViewMode.value === "custom"; els.publicStartDate.classList.toggle("is-hidden", !custom); els.publicEndDate.classList.toggle("is-hidden", !custom); }

function getPublicCalendarDays() {
  const mode = els.publicViewMode.value, anchor = state.publicAnchorDate;
  if (mode === "day") return { title: formatLongDate(toDateKey(anchor)), days: [new Date(anchor)] };
  if (mode === "week") {
    const start = startOfWeek(anchor);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    return { title: `الأسبوع ${formatShortDate(toDateKey(days[0]))} - ${formatShortDate(toDateKey(days[6]))}`, days };
  }
  if (mode === "custom") {
    const start = parseDateKey(els.publicStartDate.value || toDateKey(new Date()));
    const rawEnd = parseDateKey(els.publicEndDate.value || toDateKey(start));
    const end = rawEnd < start ? start : rawEnd; const days = [], cursor = new Date(start);
    while (cursor <= end && days.length < 62) { days.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }
    return { title: `فترة مخصصة ${formatShortDate(toDateKey(start))} - ${formatShortDate(toDateKey(end))}`, days };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1), last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { title: formatMonthYear(first), days: Array.from({ length: last.getDate() }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1)) };
}

function getPublicDateRange() {
  const { days } = getPublicCalendarDays();
  if (!days.length) return { start: "", end: "" };
  return { start: toDateKey(days[0]), end: toDateKey(days[days.length - 1]) };
}

function movePublicRange(direction) {
  const mode = els.publicViewMode.value;
  if (mode === "month") state.publicAnchorDate = new Date(state.publicAnchorDate.getFullYear(), state.publicAnchorDate.getMonth() + direction, 1);
  else if (mode === "custom") { const start = parseDateKey(els.publicStartDate.value || toDateKey(new Date())); const end = parseDateKey(els.publicEndDate.value || toDateKey(start)); start.setDate(start.getDate() + direction * 7); end.setDate(end.getDate() + direction * 7); els.publicStartDate.value = toDateKey(start); els.publicEndDate.value = toDateKey(end); }
  else { const step = mode === "week" ? 7 : 1; state.publicAnchorDate = new Date(state.publicAnchorDate.getFullYear(), state.publicAnchorDate.getMonth(), state.publicAnchorDate.getDate() + direction * step); }
  subscribePublicSlots(); renderPublicCalendar();
}

function renderPublicCalendar() {
  const { title, days } = getPublicCalendarDays();
  els.publicCalendarTitle.textContent = title;
  els.publicCalendarGrid.innerHTML = days.map((date, index) => {
    const dateKey = toDateKey(date), morningBooked = state.publicSlots.has(makeSlotKey(dateKey, "morning")), eveningBooked = state.publicSlots.has(makeSlotKey(dateKey, "evening"));
    const featured = isFeaturedDate(dateKey), prices = getDayPrices(dateKey);
    return `<article class="customer-day-card tone-${index % 2} ${featured ? "featured-day" : ""} ${morningBooked || eveningBooked ? "booked-day" : ""}">
      <div class="customer-date"><div><strong>${escapeHtml(formatWeekday(dateKey))}</strong><span>${formatShortDate(dateKey)}</span></div><span>${formatMonthYear(date)}</span></div>
      <div class="day-price-line">${featured ? "يوم مميز" : "يوم عادي"} - كامل ${formatMoney(prices.full)}</div>
      <div class="customer-slots">${renderCustomerSlot(dateKey, "morning", "9am - 7pm", morningBooked, prices.morning)}${renderCustomerSlot(dateKey, "evening", "9pm - 7am", eveningBooked, prices.evening)}</div>
    </article>`;
  }).join("");
}

function renderCustomerSlot(dateKey, period, time, booked, price) {
  return `<button class="customer-slot ${booked ? "is-booked" : ""}" type="button" data-public-slot="true" data-date="${dateKey}" data-period="${period}"><span>${slotLabels[period]}</span><small>${booked ? "محجوز" : "متاح"} - ${formatMoney(price)} - ${time}</small></button>`;
}

function renderPublicPrices() {
  const standard = state.settings.standardPrices, featured = state.settings.featuredPrices;
  els.publicPricesGrid.innerHTML = `${renderPriceCard("الأيام العادية", standard)}${renderPriceCard("الأيام المميزة", featured)}<article class="price-card special-days-card"><span class="eyebrow">الأيام المميزة الحالية</span><h2>${escapeHtml(getFeaturedDaysLabel())}</h2><p>تضاف إليها التواريخ المخصصة التي يحددها المدير.</p></article><article class="price-card weekly-price-card"><span class="eyebrow">حسب أيام الأسبوع</span><div class="weekly-price-list">${renderWeekdayPriceList()}</div></article>`;
}
function renderPriceCard(title, prices) { return `<article class="price-card"><span class="eyebrow">${title}</span><div><strong>صباحي</strong><b>${formatMoney(prices.morning)}</b></div><div><strong>مسائي</strong><b>${formatMoney(prices.evening)}</b></div><div><strong>كامل</strong><b>${formatMoney(prices.full)}</b></div></article>`; }
function renderWeekdayPriceList() { return arabicWeekdayNames.map((name, day) => { const featured = state.settings.featuredWeekdays.includes(day), prices = featured ? state.settings.featuredPrices : state.settings.standardPrices; return `<span class="weekday-price-row"><strong>${name} ${featured ? "مميز" : "عادي"}</strong><b>${formatMoney(prices.full)}</b></span>`; }).join(""); }

function openSlotModal(dateKey, period) {
  const booked = state.publicSlots.has(makeSlotKey(dateKey, period));
  els.slotModalStatus.textContent = booked ? "محجوز" : "متاح";
  els.slotModalStatus.classList.toggle("is-booked", booked);
  els.slotModalTitle.textContent = `${formatLongDate(dateKey)} - ${slotLabels[period]}`;
  els.slotModalMeta.textContent = `${isFeaturedDate(dateKey) ? "يوم مميز" : "يوم عادي"} • ${period === "morning" ? "9am - 7pm" : "9pm - 7am"}`;
  els.slotModalPrice.textContent = `السعر: ${formatMoney(getDayPrices(dateKey)[period])}`;
  els.slotModal.classList.remove("is-hidden");
}
function closeSlotModal() { els.slotModal.classList.add("is-hidden"); }

function renderCalendar() {
  els.monthTitle.textContent = formatMonthYear(state.currentMonth);
  const bookedSlots = buildBookedSlotMap(), days = getCalendarDays(state.currentMonth), month = state.currentMonth.getMonth(), todayKey = toDateKey(new Date());
  els.calendarGrid.innerHTML = days.map((day) => {
    const dateKey = toDateKey(day), outside = day.getMonth() !== month, today = dateKey === todayKey, featured = isFeaturedDate(dateKey), booked = bookedSlots.has(makeSlotKey(dateKey, "morning")) || bookedSlots.has(makeSlotKey(dateKey, "evening"));
    return `<article class="calendar-day ${outside ? "outside" : ""} ${today ? "today" : ""} ${featured ? "featured-day" : ""} ${booked ? "booked-day" : ""}"><div class="day-number"><span>${escapeHtml(formatWeekday(dateKey))}</span><small>${formatShortDate(dateKey)}</small></div><div class="admin-day-price">${featured ? "مميز" : "عادي"} - ${formatMoney(getDayPrices(dateKey).full)}</div><div class="periods">${renderSlotButton(dateKey, "morning", bookedSlots)}${renderSlotButton(dateKey, "evening", bookedSlots)}</div></article>`;
  }).join("");
  els.calendarGrid.querySelectorAll(".period-slot").forEach((button) => button.addEventListener("click", () => toggleSlot(button.dataset.date, button.dataset.period)));
}
function renderSlotButton(dateKey, period, bookedSlots) { const booking = bookedSlots.get(makeSlotKey(dateKey, period)), selected = state.selectedSlots.has(makeSlotKey(dateKey, period)); return `<button class="period-slot ${booking ? "booked" : ""} ${selected ? "selected" : ""}" type="button" data-date="${dateKey}" data-period="${period}" ${booking ? "disabled" : ""} title="${escapeHtml(booking?.clientName || (booking ? "محجوز" : "متاح"))}"><span>${slotLabels[period]}</span><small>${booking ? "محجوز" : formatMoney(getDayPrices(dateKey)[period])}</small></button>`; }
function toggleSlot(dateKey, period) { const key = makeSlotKey(dateKey, period), booked = buildBookedSlotMap(); if (booked.has(key)) return toast("هذه الفترة محجوزة بالفعل.", "error"); if (state.selectedSlots.has(key)) state.selectedSlots.delete(key); else state.selectedSlots.add(key); updateSelectedSummary(); renderCalendar(); }
function updateSelectedSummary() { const summary = summarizeSelectedSlots([...state.selectedSlots]); els.selectedDaysCount.textContent = `${summary.slotCount} فترة / ${summary.fullBlocks} كامل`; els.priceInput.value = summary.price; }

function renderBookingsTable() {
  if (!state.bookings.length) { els.bookingsTable.innerHTML = '<tr><td class="empty-row" colspan="7">لا توجد حجوزات بعد.</td></tr>'; return; }
  els.bookingsTable.innerHTML = state.bookings.map((booking) => `<tr><td>${escapeHtml(booking.clientName || "-")}</td><td>${escapeHtml(booking.phone || "-")}</td><td>${(booking.dates || []).slice().sort().map(formatShortDate).join("، ")}</td><td>${escapeHtml(formatBookingPeriod(booking))}</td><td>${formatMoney(booking.price || 0)}</td><td>${formatMoney(booking.deposit || 0)}</td><td><div class="table-actions"><button class="ghost-action compact" type="button" data-action="edit" data-id="${booking.id}">تعديل</button><button class="danger-action" type="button" data-action="delete" data-id="${booking.id}">حذف</button></div></td></tr>`).join("");
}

function collectBookingForm() {
  const slotKeys = [...state.selectedSlots].sort(compareSlotKeys), dates = getDatesFromSlotKeys(slotKeys), summary = summarizeSelectedSlots(slotKeys), clientName = els.clientNameInput.value.trim(), phone = els.phoneInput.value.trim(), deposit = Number(els.depositInput.value || 0), id = els.editingBookingId.value || null;
  if (!slotKeys.length) return toast("اختر فترة واحدة على الأقل من التقويم.", "error"), null;
  if (clientName.length < 2) return toast("أدخل اسم العميل بشكل صحيح.", "error"), null;
  if (!/^[+\d\s()-]{7,}$/.test(phone)) return toast("أدخل رقم هاتف صحيح.", "error"), null;
  if (!Number.isFinite(deposit) || deposit < 0 || deposit > summary.price) return toast("العربون غير صالح.", "error"), null;
  const period = summary.slotCount === 1 ? splitSlotKey(slotKeys[0])[1] : summary.remainderCount ? "mixed" : "full";
  return { id, dates, slotKeys, period, pricingSummary: summary, clientName, phone, price: summary.price, deposit, notes: els.notesInput.value.trim() };
}

async function saveBooking(booking) {
  const bookingRef = booking.id ? doc(db, "bookings", booking.id) : doc(collection(db, "bookings")), bookingId = bookingRef.id;
  const requestedSlotRefs = booking.slotKeys.map((key) => doc(db, "bookingSlots", key));
  await runTransaction(db, async (transaction) => {
    const oldSnapshot = booking.id ? await transaction.get(bookingRef) : null;
    const oldSlotKeys = oldSnapshot?.exists() ? getBookingSlotKeys(oldSnapshot.data()) : [];
    const snapshots = [];
    for (const ref of requestedSlotRefs) snapshots.push(await transaction.get(ref));
    snapshots.forEach((snapshot) => { if (snapshot.exists() && snapshot.data().bookingId !== bookingId) throw new Error("يوجد حجز آخر يتعارض مع الأيام أو الفترات المختارة."); });
    oldSlotKeys.filter((key) => !booking.slotKeys.includes(key)).forEach((key) => transaction.delete(doc(db, "bookingSlots", key)));
    booking.slotKeys.forEach((key) => { const [date, period] = splitSlotKey(key); transaction.set(doc(db, "bookingSlots", key), { bookingId, date, period, updatedAt: serverTimestamp() }); });
    transaction.set(bookingRef, { dates: booking.dates, period: booking.period, clientName: booking.clientName, phone: booking.phone, price: booking.price, deposit: booking.deposit, notes: booking.notes, slotKeys: booking.slotKeys, pricingSummary: booking.pricingSummary, currency: "USD", createdAt: oldSnapshot?.data()?.createdAt || serverTimestamp(), updatedAt: serverTimestamp() });
  });
}

async function deleteBooking(booking) {
  const batch = writeBatch(db), slotKeys = getBookingSlotKeys(booking);
  batch.delete(doc(db, "bookings", booking.id));
  slotKeys.forEach((key) => batch.delete(doc(db, "bookingSlots", key)));
  if (!slotKeys.length) {
    const orphanSlots = await getDocs(query(collection(db, "bookingSlots"), where("bookingId", "==", booking.id)));
    orphanSlots.forEach((slotDoc) => batch.delete(slotDoc.ref));
  }
  await batch.commit();
}

function loadBookingForEdit(booking) {
  resetBookingForm(false); els.formTitle.textContent = "تعديل الحجز"; els.editingBookingId.value = booking.id; els.cancelEditBtn.classList.remove("is-hidden"); els.periodSelect.value = booking.period || "auto"; els.clientNameInput.value = booking.clientName || ""; els.phoneInput.value = booking.phone || ""; els.depositInput.value = booking.deposit || 0; els.notesInput.value = booking.notes || ""; state.selectedSlots = new Set(getBookingSlotKeys(booking)); updateSelectedSummary(); renderCalendar(); els.bookingForm.scrollIntoView({ behavior: "smooth", block: "start" });
}
function resetBookingForm(clearSelection = true) { els.formTitle.textContent = "تفاصيل الحجز"; els.editingBookingId.value = ""; els.bookingForm.reset(); els.periodSelect.value = "auto"; els.depositInput.value = 0; els.cancelEditBtn.classList.add("is-hidden"); if (clearSelection) state.selectedSlots.clear(); updateSelectedSummary(); renderCalendar(); }

function exportWeeklyReport() {
  const start = startOfWeek(new Date()), end = new Date(start); end.setDate(start.getDate() + 6);
  const rows = state.bookings.filter((booking) => (booking.dates || []).some((dateKey) => { const date = parseDateKey(dateKey); return date >= start && date <= end; }));
  const header = ["العميل","الهاتف","التواريخ","النوع","السعر","العربون","العملة","ملاحظات"], csvRows = [header, ...rows.map((booking) => [booking.clientName || "", booking.phone || "", (booking.dates || []).join(" | "), formatBookingPeriod(booking), booking.price || 0, booking.deposit || 0, "USD", booking.notes || ""])];
  downloadTextFile(`weekly-report-${toDateKey(start)}.csv`, "\ufeff" + csvRows.map((row) => row.map(csvCell).join(",")).join("\n")); toast("تم تصدير التقرير الأسبوعي.", "success");
}

async function shareCalendarImage() {
  showLoading(true);
  try {
    await ensureHtml2Canvas();
    const canvas = await window.html2canvas(els.calendarCapture, { backgroundColor: "#eef7f6", scale: Math.min(2, window.devicePixelRatio || 1) });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("تعذر إنشاء الصورة.");
    const file = new File([blob], "pool-calendar.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "تقويم حجوزات المسبح" });
    else { const link = document.createElement("a"); link.download = "pool-calendar.png"; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href); }
    toast("تم تجهيز صورة التقويم.", "success");
  } catch (error) { if (error?.name !== "AbortError") toast(error.message || "تعذر إنشاء صورة التقويم.", "error"); }
  finally { showLoading(false); }
}

let html2canvasPromise;
function ensureHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve();
  if (html2canvasPromise) return html2canvasPromise;
  html2canvasPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"; script.async = true; script.onload = () => window.html2canvas ? resolve() : reject(new Error("تعذر تحميل أداة الصور.")); script.onerror = () => reject(new Error("تعذر تحميل أداة الصور.")); document.head.appendChild(script);
  });
  return html2canvasPromise;
}

function buildBookedSlotMap() { const map = new Map(); const currentEditId = els.editingBookingId.value; state.bookings.forEach((booking) => { if (currentEditId && booking.id === currentEditId) return; getBookingSlotKeys(booking).forEach((key) => map.set(key, booking)); }); return map; }
function getBookingSlotKeys(booking) { return Array.isArray(booking.slotKeys) && booking.slotKeys.length ? [...booking.slotKeys].sort(compareSlotKeys) : getSlotKeys(booking.dates || [], booking.period); }
function formatBookingPeriod(booking) { const keys = getBookingSlotKeys(booking); return keys.length > 1 ? `${keys.length} فترات` : periodLabels[booking.period] || booking.period || "-"; }
function getDatesFromSlotKeys(keys) { return [...new Set(keys.map((key) => splitSlotKey(key)[0]))].sort(); }
function getSlotKeys(dates, period) { if (period === "mixed" || period === "auto") return []; const periods = period === "full" ? ["morning", "evening"] : [period]; return dates.flatMap((date) => periods.map((item) => makeSlotKey(date, item))); }

function summarizeSelectedSlots(slotKeys) {
  const sorted = [...slotKeys].sort(compareSlotKeys); let price = 0, fullBlocks = 0, remainderCount = 0;
  const grouped = new Map(); sorted.forEach((key) => { const [date, period] = splitSlotKey(key); if (!grouped.has(date)) grouped.set(date, new Set()); grouped.get(date).add(period); });
  grouped.forEach((periods, date) => { if (periods.has("morning") && periods.has("evening")) { price += getDayPrices(date).full; fullBlocks += 1; } else { periods.forEach((period) => { price += getDayPrices(date)[period]; remainderCount += 1; }); } });
  return { slotCount: sorted.length, fullBlocks, remainderCount, price: Number(price.toFixed(2)), slotKeys: sorted };
}
function getDayPrices(dateKey) { const source = isFeaturedDate(dateKey) ? state.settings.featuredPrices : state.settings.standardPrices; return { morning: Number(source.morning || 0), evening: Number(source.evening || 0), full: Number(source.full ?? Number(source.morning || 0) + Number(source.evening || 0)) }; }
function compareSlotKeys(a, b) { return slotOrderValue(a) - slotOrderValue(b); }
function slotOrderValue(key) { const [date, period] = splitSlotKey(key); return parseDateKey(date).getTime() + (period === "evening" ? 12 * 60 * 60 * 1000 : 0); }
function isFeaturedDate(dateKey) { const date = parseDateKey(dateKey); return state.settings.featuredWeekdays.includes(date.getDay()) || state.settings.featuredDates.includes(dateKey); }
function getFeaturedDaysLabel() { const weekdays = state.settings.featuredWeekdays.map((day) => arabicWeekdayNames[day]).join("، "); const dates = state.settings.featuredDates.map(formatShortDate).join("، "); return [weekdays, dates].filter(Boolean).join(" + ") || "لا توجد أيام مميزة"; }
function formatMoney(value) { return `${Number(value || 0).toLocaleString("ar", { maximumFractionDigits: 2 })} USD`; }
function getCalendarDays(monthDate) { const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), startOffset = (first.getDay() + 1) % 7, start = new Date(first); start.setDate(first.getDate() - startOffset); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; }); }
function startOfWeek(date) { const result = new Date(date.getFullYear(), date.getMonth(), date.getDate()); result.setDate(result.getDate() - ((result.getDay() + 1) % 7)); result.setHours(0,0,0,0); return result; }
function toDateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function parseDateKey(dateKey) { const [year, month, day] = dateKey.split("-").map(Number); return new Date(year, month - 1, day); }
function formatShortDate(dateKey) { const date = parseDateKey(dateKey); return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`; }
function formatLongDate(dateKey) { const date = parseDateKey(dateKey); return `${formatWeekday(dateKey)} ${date.getDate()} ${arabicMonthNames[date.getMonth()]} ${date.getFullYear()}`; }
function formatWeekday(dateKey) { return arabicWeekdayNames[parseDateKey(dateKey).getDay()]; }
function formatMonthYear(date) { return `${arabicMonthNames[date.getMonth()]} ${date.getFullYear()}`; }
function makeSlotKey(date, period) { return `${date}_${period}`; }
function splitSlotKey(key) { const [date, period] = key.split("_"); return [date, period]; }
function csvCell(value) { return `"${String(value).replaceAll('"', '""')}"`; }
function downloadTextFile(name, content) { const blob = new Blob([content], { type: "text/csv;charset=utf-8" }), url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }
function getFriendlyAuthError(error) { const code = error?.code || ""; const messages = { "auth/invalid-credential": "البريد أو كلمة المرور غير صحيحة.", "auth/invalid-email": "البريد الإلكتروني غير صحيح.", "auth/too-many-requests": "تم تجاوز عدد المحاولات. حاول لاحقًا." }; return messages[code] || "تعذر تسجيل الدخول."; }

function injectPerformanceStyles() {
  if (document.getElementById("pool-performance-styles")) return;
  const style = document.createElement("style"); style.id = "pool-performance-styles"; style.textContent = `
    .public-shell-header{backdrop-filter:none;background:rgba(238,247,246,.96)}
    .loading-overlay{backdrop-filter:none}
    .customer-slot,.period-slot,.primary-action,.secondary-action,.ghost-action,.icon-action{touch-action:manipulation}
    .customer-slot:focus-visible,.period-slot:focus-visible,.primary-action:focus-visible,.secondary-action:focus-visible,.ghost-action:focus-visible,.icon-action:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid rgba(37,99,235,.28);outline-offset:2px}
    @media(max-width:900px){.workspace-grid{grid-template-columns:1fr}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero-content{grid-template-columns:1fr}.studio-grid{grid-template-columns:1fr 1fr}.public-nav{align-items:stretch;flex-direction:column}.public-links{justify-content:flex-start}.panel{padding:17px}.customer-calendar-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:620px){.app-shell{width:min(100% - 18px,1480px);padding-top:10px}.stats-grid{grid-template-columns:1fr}.studio-grid{grid-template-columns:1fr}.customer-calendar-grid{grid-template-columns:1fr}.topbar,.panel-header{align-items:flex-start;flex-direction:column}.calendar-controls{width:100%}.calendar-controls>*{flex:1 1 auto}.report-actions{width:100%}.report-actions>*{flex:1 1 100%}.login-card{padding:22px}.public-hero{min-height:620px;padding:18px}.hero-content h1{font-size:clamp(2rem,13vw,3.4rem)}}
  `; document.head.appendChild(style);
}
