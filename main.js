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

const CONTACT = {
  phone: "+963980195144",
  whatsapp: "https://wa.me/963980195144"
};

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
  unsubscribePublicSlots: null
};

const periodLabels = {
  morning: "صباحي",
  evening: "مسائي",
  full: "كامل",
  mixed: "فترات متعددة",
  auto: "تلقائي"
};

const slotLabels = {
  morning: "صباحي",
  evening: "مسائي"
};

const arabicMonthNames = [
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تموز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول"
];

const arabicWeekdayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

initializePublicControls();
bindEvents();
subscribeSettings();
subscribePublicSlots();

setPersistence(auth, browserLocalPersistence).catch(() => {
  toast("تعذر تفعيل حفظ الجلسة محليًا.", "error");
});

onAuthStateChanged(auth, async (user) => {
  showLoading(true);
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
    showLoading(false);
    return;
  }

  subscribeBookings();
  renderRoute();
  showLoading(false);
});

function bindEvents() {
  window.addEventListener("hashchange", renderRoute);

  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showLoading(true);
    try {
      await signInWithEmailAndPassword(
        auth,
        els.emailInput.value.trim(),
        els.passwordInput.value
      );
      toast("تم تسجيل الدخول بنجاح.", "success");
    } catch (error) {
      toast(getFriendlyAuthError(error), "error");
    } finally {
      showLoading(false);
    }
  });

  els.logoutBtn.addEventListener("click", () => signOut(auth));
  els.publicViewMode.addEventListener("change", () => {
    syncCustomInputsVisibility();
    renderPublicCalendar();
  });
  els.publicStartDate.addEventListener("change", renderPublicCalendar);
  els.publicEndDate.addEventListener("change", renderPublicCalendar);
  els.publicPrevBtn.addEventListener("click", () => movePublicRange(-1));
  els.publicNextBtn.addEventListener("click", () => movePublicRange(1));
  els.publicTodayBtn.addEventListener("click", () => {
    state.publicAnchorDate = new Date();
    setDefaultPublicDates();
    renderPublicCalendar();
  });

  els.publicCalendarGrid.addEventListener("click", (event) => {
    const slot = event.target.closest("[data-public-slot]");
    if (!slot) return;
    openSlotModal(slot.dataset.date, slot.dataset.period);
  });
  els.closeSlotModalBtn.addEventListener("click", closeSlotModal);
  els.slotModal.addEventListener("dblclick", (event) => {
    if (event.target === els.slotModal) closeSlotModal();
  });

  els.prevMonthBtn.addEventListener("click", () => {
    state.currentMonth = new Date(
      state.currentMonth.getFullYear(),
      state.currentMonth.getMonth() - 1,
      1
    );
    renderCalendar();
  });
  els.nextMonthBtn.addEventListener("click", () => {
    state.currentMonth = new Date(
      state.currentMonth.getFullYear(),
      state.currentMonth.getMonth() + 1,
      1
    );
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

  [
    els.morningPriceInput,
    els.eveningPriceInput,
    els.featuredMorningPriceInput,
    els.featuredEveningPriceInput
  ].forEach((input) => input.addEventListener("input", updateSelectedSummary));

  els.addFeaturedDateBtn.addEventListener("click", () => {
    if (!els.featuredDateInput.value) {
      toast("اختر تاريخًا لإضافته.", "error");
      return;
    }
    state.featuredDatesDraft.add(els.featuredDateInput.value);
    els.featuredDateInput.value = "";
    renderFeaturedDatesList();
    updateSelectedSummary();
  });

  els.featuredDatesList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-date]");
    if (!button) return;
    state.featuredDatesDraft.delete(button.dataset.date);
    renderFeaturedDatesList();
    updateSelectedSummary();
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
    } finally {
      showLoading(false);
    }
  });

  els.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const settings = collectSettingsForm();
    if (!settings) return;

    showLoading(true);
    try {
      await setDoc(doc(db, "settings", "pricing"), {
        ...settings,
        updatedAt: serverTimestamp()
      });
      toast("تم تحديث إعدادات التسعير.", "success");
    } catch (error) {
      toast(error.message || "تعذر حفظ الإعدادات.", "error");
    } finally {
      showLoading(false);
    }
  });

  els.bookingsTable.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const booking = state.bookings.find((item) => item.id === button.dataset.id);
    if (!booking) return;

    if (button.dataset.action === "edit") {
      loadBookingForEdit(booking);
      return;
    }

    if (button.dataset.action === "delete") {
      const confirmed = window.confirm("هل تريد حذف هذا الحجز؟");
      if (!confirmed) return;

      showLoading(true);
      try {
        await deleteBooking(booking);
        toast("تم حذف الحجز.", "success");
        resetBookingForm();
      } catch (error) {
        toast(error.message || "تعذر حذف الحجز.", "error");
      } finally {
        showLoading(false);
      }
    }
  });

  els.exportWeeklyBtn.addEventListener("click", exportWeeklyReport);
  els.shareCalendarBtn.addEventListener("click", shareCalendarImage);
}

function renderRoute() {
  const route = getRoute();

  if (route === "admin") {
    if (state.currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      showDashboard(state.currentUser);
    } else {
      showLogin();
    }
    return;
  }

  showPublicView(route);
}

function getRoute() {
  const route = window.location.hash.replace("#", "") || "home";
  const publicRoutes = ["home", "calendar", "prices", "studio", "payment", "contact"];
  if (route === "admin") return route;
  return publicRoutes.includes(route) ? route : "home";
}

function showPublicView(route) {
  els.publicView.classList.remove("is-hidden");
  els.loginView.classList.add("is-hidden");
  els.appView.classList.add("is-hidden");

  els.publicPages.forEach((page) => {
    page.classList.toggle("is-hidden", page.dataset.publicPage !== route);
  });
  els.routeLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${route}`);
  });

  if (route === "calendar") renderPublicCalendar();
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
  renderSettings();
  renderCalendar();
}

function showLoading(isActive) {
  els.loadingOverlay.classList.toggle("is-active", isActive);
}

function toast(message, type = "success") {
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  els.toastContainer.appendChild(item);
  setTimeout(() => item.remove(), 4200);
}

function cleanupAdminRealtime() {
  state.unsubscribeBookings?.();
  state.unsubscribeBookings = null;
  state.bookings = [];
}

function subscribeSettings() {
  state.unsubscribeSettings?.();
  state.unsubscribeSettings = onSnapshot(
    doc(db, "settings", "pricing"),
    (snapshot) => {
      state.settings = normalizeSettings(snapshot.exists() ? snapshot.data() : defaultSettings);
      state.featuredDatesDraft = new Set(state.settings.featuredDates);
      renderSettings();
      renderPublicCalendar();
      renderPublicPrices();
      updateSelectedSummary();
    },
    () => {
      state.settings = normalizeSettings(defaultSettings);
      renderPublicCalendar();
      renderPublicPrices();
    }
  );
}

function subscribePublicSlots() {
  state.unsubscribePublicSlots?.();
  state.unsubscribePublicSlots = onSnapshot(
    collection(db, "bookingSlots"),
    (snapshot) => {
      state.publicSlots = new Map(
        snapshot.docs.map((slotDoc) => [slotDoc.id, { id: slotDoc.id, ...slotDoc.data() }])
      );
      renderPublicCalendar();
    },
    () => {
      state.publicSlots = new Map();
      renderPublicCalendar();
    }
  );
}

function subscribeBookings() {
  state.unsubscribeBookings?.();
  state.unsubscribeBookings = onSnapshot(
    query(collection(db, "bookings"), orderBy("createdAt", "desc")),
    (snapshot) => {
      state.bookings = snapshot.docs.map((bookingDoc) => ({
        id: bookingDoc.id,
        ...bookingDoc.data()
      }));
      renderStats();
      renderCalendar();
      renderBookingsTable();
    },
    (error) => toast(error.message || "تعذر تحميل الحجوزات.", "error")
  );
}

function normalizeSettings(raw = {}) {
  const standardMorning = Number(raw.standardPrices?.morning ?? raw.morningPrice ?? defaultSettings.morningPrice ?? 0);
  const standardEvening = Number(raw.standardPrices?.evening ?? raw.eveningPrice ?? defaultSettings.eveningPrice ?? 0);
  const standardFull = Number(
    raw.standardPrices?.full ?? defaultSettings.standardPrices?.full ?? 0
  );
  const featuredMorning = Number(
    raw.featuredPrices?.morning ?? raw.featuredMorningPrice ?? defaultSettings.featuredPrices?.morning ?? standardMorning
  );
  const featuredEvening = Number(
    raw.featuredPrices?.evening ?? raw.featuredEveningPrice ?? defaultSettings.featuredPrices?.evening ?? standardEvening
  );
  const featuredFull = Number(
    raw.featuredPrices?.full ?? defaultSettings.featuredPrices?.full ?? 0
  );

  return {
    standardPrices: {
      morning: standardMorning,
      evening: standardEvening,
      full: standardFull
    },
    featuredPrices: {
      morning: featuredMorning,
      evening: featuredEvening,
      full: featuredFull
    },
    featuredWeekdays: (raw.featuredWeekdays ?? defaultSettings.featuredWeekdays ?? [4, 5, 6]).map(Number),
    featuredDates: [...new Set(raw.featuredDates ?? defaultSettings.featuredDates ?? [])].sort(),
    currency: "USD"
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
  document.querySelectorAll('input[name="featuredWeekday"]').forEach((checkbox) => {
    checkbox.checked = state.settings.featuredWeekdays.includes(Number(checkbox.value));
  });
  state.featuredDatesDraft = new Set(state.settings.featuredDates);
  renderFeaturedDatesList();
}

function renderFeaturedDatesList() {
  const dates = [...state.featuredDatesDraft].sort();
  els.featuredDatesList.innerHTML = dates.length
    ? dates
        .map(
          (dateKey) => `
            <span class="date-chip">
              ${formatLongDate(dateKey)}
              <button type="button" data-date="${dateKey}" aria-label="حذف التاريخ">×</button>
            </span>
          `
        )
        .join("")
    : '<span class="muted-note">لا توجد تواريخ مخصصة.</span>';
}

function collectSettingsForm() {
  const standardMorning = Number(els.morningPriceInput.value);
  const standardEvening = Number(els.eveningPriceInput.value);
  const standardFull = Number(els.fullPriceInput.value);
  const featuredMorning = Number(els.featuredMorningPriceInput.value);
  const featuredEvening = Number(els.featuredEveningPriceInput.value);
  const featuredFull = Number(els.featuredFullPriceInput.value);

  if (
    [standardMorning, standardEvening, standardFull, featuredMorning, featuredEvening, featuredFull].some(
      (value) => value < 0
    )
  ) {
    toast("الأسعار يجب أن تكون أرقامًا موجبة.", "error");
    return null;
  }

  return {
    standardPrices: {
      morning: standardMorning,
      evening: standardEvening,
      full: standardFull
    },
    featuredPrices: {
      morning: featuredMorning,
      evening: featuredEvening,
      full: featuredFull
    },
    featuredWeekdays: [...document.querySelectorAll('input[name="featuredWeekday"]:checked')].map((item) =>
      Number(item.value)
    ),
    featuredDates: [...state.featuredDatesDraft].sort(),
    currency: "USD"
  };
}

function renderStats() {
  const totals = state.bookings.reduce(
    (acc, booking) => {
      acc.revenue += Number(booking.price || 0);
      acc.deposits += Number(booking.deposit || 0);
      acc.slots += getBookingSlotKeys(booking).length;
      return acc;
    },
    { revenue: 0, deposits: 0, slots: 0 }
  );

  els.bookingCount.textContent = state.bookings.length;
  els.totalRevenue.textContent = formatMoney(totals.revenue);
  els.totalDeposits.textContent = formatMoney(totals.deposits);
  els.reservedSlots.textContent = totals.slots;
}

function initializePublicControls() {
  els.publicViewMode.value = "week";
  setDefaultPublicDates();
  syncCustomInputsVisibility();
}

function setDefaultPublicDates() {
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 6);
  els.publicStartDate.value = toDateKey(today);
  els.publicEndDate.value = toDateKey(weekEnd);
}

function syncCustomInputsVisibility() {
  const isCustom = els.publicViewMode.value === "custom";
  els.publicStartDate.classList.toggle("is-hidden", !isCustom);
  els.publicEndDate.classList.toggle("is-hidden", !isCustom);
}

function movePublicRange(direction) {
  const mode = els.publicViewMode.value;
  const steps = { month: 1, week: 7, day: 1, custom: 7 };

  if (mode === "month") {
    state.publicAnchorDate = new Date(
      state.publicAnchorDate.getFullYear(),
      state.publicAnchorDate.getMonth() + direction,
      1
    );
  } else {
    state.publicAnchorDate = new Date(
      state.publicAnchorDate.getFullYear(),
      state.publicAnchorDate.getMonth(),
      state.publicAnchorDate.getDate() + direction * steps[mode]
    );
  }

  if (mode === "custom") {
    const start = parseDateKey(els.publicStartDate.value || toDateKey(new Date()));
    const end = parseDateKey(els.publicEndDate.value || toDateKey(start));
    start.setDate(start.getDate() + direction * 7);
    end.setDate(end.getDate() + direction * 7);
    els.publicStartDate.value = toDateKey(start);
    els.publicEndDate.value = toDateKey(end);
  }

  renderPublicCalendar();
}

function renderPublicCalendar() {
  if (!els.publicCalendarGrid) return;
  const { title, days } = getPublicCalendarDays();
  els.publicCalendarTitle.textContent = title;

  els.publicCalendarGrid.innerHTML = days
    .map((date, index) => {
      const dateKey = toDateKey(date);
      const dateParts = getDateDisplayParts(dateKey);
      const morningBooked = state.publicSlots.has(makeSlotKey(dateKey, "morning"));
      const eveningBooked = state.publicSlots.has(makeSlotKey(dateKey, "evening"));
      const featured = isFeaturedDate(dateKey);
      const bookedDay = morningBooked || eveningBooked;
      const prices = getDayPrices(dateKey);

      return `
        <article class="customer-day-card tone-${index % 2} ${featured ? "featured-day" : ""} ${
        bookedDay ? "booked-day" : ""
      }">
          <div class="customer-date">
            <div>
              <strong>${dateParts.weekday}</strong>
              <span>${dateParts.numeric}</span>
            </div>
            <span>${dateParts.monthYear}</span>
          </div>
          <div class="day-price-line">${featured ? "يوم مميز" : "يوم عادي"} - كامل ${formatMoney(prices.full)}</div>
          <div class="customer-slots">
            ${renderCustomerSlot(dateKey, "morning", "9am - 7pm", morningBooked, prices.morning)}
            ${renderCustomerSlot(dateKey, "evening", "9pm - 7am", eveningBooked, prices.evening)}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCustomerSlot(dateKey, period, time, isBooked, price) {
  return `
    <button
      class="customer-slot ${isBooked ? "is-booked" : ""}"
      type="button"
      data-public-slot="true"
      data-date="${dateKey}"
      data-period="${period}"
    >
      <span>${slotLabels[period]}</span>
      <small>${isBooked ? "محجوز" : "متاح"} - ${formatMoney(price)} - ${time}</small>
    </button>
  `;
}

function renderPublicPrices() {
  if (!els.publicPricesGrid) return;
  const standard = state.settings.standardPrices;
  const featured = state.settings.featuredPrices;
  els.publicPricesGrid.innerHTML = `
    ${renderPriceCard("الأيام العادية", standard)}
    ${renderPriceCard("الأيام المميزة", featured)}
    <article class="price-card special-days-card">
      <span class="eyebrow">الأيام المميزة الحالية</span>
      <h2>${getFeaturedDaysLabel()}</h2>
      <p>تضاف إليها التواريخ المخصصة التي يحددها المدير.</p>
    </article>
    <article class="price-card weekly-price-card">
      <span class="eyebrow">حسب أيام الأسبوع</span>
      <div class="weekly-price-list">
        ${renderWeekdayPriceList()}
      </div>
    </article>
  `;
}

function renderPriceCard(title, prices) {
  return `
    <article class="price-card">
      <span class="eyebrow">${title}</span>
      <div><strong>صباحي</strong><b>${formatMoney(prices.morning)}</b></div>
      <div><strong>مسائي</strong><b>${formatMoney(prices.evening)}</b></div>
      <div><strong>كامل</strong><b>${formatMoney(prices.full)}</b></div>
    </article>
  `;
}

function renderWeekdayPriceList() {
  const names = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return names
    .map((name, day) => {
      const featured = state.settings.featuredWeekdays.includes(day);
      const prices = featured ? state.settings.featuredPrices : state.settings.standardPrices;
      return `
        <span class="weekday-price-row">
          <strong>${name} ${featured ? "مميز" : "عادي"}</strong>
          <b>${formatMoney(prices.full)}</b>
        </span>
      `;
    })
    .join("");
}

function openSlotModal(dateKey, period) {
  const booked = state.publicSlots.has(makeSlotKey(dateKey, period));
  const price = getDayPrices(dateKey)[period];
  els.slotModalStatus.textContent = booked ? "محجوز" : "متاح";
  els.slotModalStatus.classList.toggle("is-booked", booked);
  els.slotModalTitle.textContent = `${formatLongDate(dateKey)} - ${slotLabels[period]}`;
  els.slotModalMeta.textContent = `${isFeaturedDate(dateKey) ? "يوم مميز" : "يوم عادي"} • ${
    period === "morning" ? "9am - 7pm" : "9pm - 7am"
  }`;
  els.slotModalPrice.textContent = `السعر: ${formatMoney(price)}`;
  els.slotModal.classList.remove("is-hidden");
}

function closeSlotModal() {
  els.slotModal.classList.add("is-hidden");
}

function getPublicCalendarDays() {
  const mode = els.publicViewMode.value;
  const anchor = state.publicAnchorDate;

  if (mode === "day") {
    return {
      title: formatLongDate(toDateKey(anchor)),
      days: [new Date(anchor)]
    };
  }

  if (mode === "week") {
    const start = startOfWeek(anchor);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
    return {
      title: `الأسبوع ${formatShortDate(toDateKey(days[0]))} - ${formatShortDate(toDateKey(days[6]))}`,
      days
    };
  }

  if (mode === "custom") {
    const start = parseDateKey(els.publicStartDate.value || toDateKey(new Date()));
    const end = parseDateKey(els.publicEndDate.value || els.publicStartDate.value || toDateKey(new Date()));
    const safeEnd = end < start ? start : end;
    const days = [];
    const cursor = new Date(start);
    while (cursor <= safeEnd && days.length < 62) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return {
      title: `فترة مخصصة ${formatShortDate(toDateKey(start))} - ${formatShortDate(toDateKey(safeEnd))}`,
      days
    };
  }

  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const days = Array.from({ length: last.getDate() }, (_, index) => {
    return new Date(first.getFullYear(), first.getMonth(), index + 1);
  });
  return {
    title: formatMonthYear(first),
    days
  };
}

function renderCalendar() {
  els.monthTitle.textContent = formatMonthYear(state.currentMonth);

  const bookedSlots = buildBookedSlotMap();
  const days = getCalendarDays(state.currentMonth);
  const currentMonthIndex = state.currentMonth.getMonth();
  const todayKey = toDateKey(new Date());

  els.calendarGrid.innerHTML = days
    .map((day) => {
      const dateKey = toDateKey(day);
      const isOutside = day.getMonth() !== currentMonthIndex;
      const isToday = dateKey === todayKey;
      const featured = isFeaturedDate(dateKey);
      const hasBookedSlot =
        bookedSlots.has(makeSlotKey(dateKey, "morning")) ||
        bookedSlots.has(makeSlotKey(dateKey, "evening"));

      return `
        <article class="calendar-day ${isOutside ? "outside" : ""} ${isToday ? "today" : ""} ${
        featured ? "featured-day" : ""
      } ${hasBookedSlot ? "booked-day" : ""}">
          <div class="day-number">
            <span>${formatWeekday(dateKey)}</span>
            <small>${formatShortDate(dateKey)}</small>
          </div>
          <div class="admin-day-price">${featured ? "مميز" : "عادي"} - ${formatMoney(getDayPrices(dateKey).full)}</div>
          <div class="periods">
            ${renderSlotButton(dateKey, "morning", bookedSlots)}
            ${renderSlotButton(dateKey, "evening", bookedSlots)}
          </div>
        </article>
      `;
    })
    .join("");

  els.calendarGrid.querySelectorAll(".period-slot").forEach((button) => {
    button.addEventListener("click", () => toggleSlot(button.dataset.date, button.dataset.period));
  });
}

function renderSlotButton(dateKey, period, bookedSlots) {
  const slotKey = makeSlotKey(dateKey, period);
  const booking = bookedSlots.get(slotKey);
  const selected = state.selectedSlots.has(slotKey);

  return `
    <button
      class="period-slot ${booking ? "booked" : ""} ${selected ? "selected" : ""}"
      type="button"
      data-date="${dateKey}"
      data-period="${period}"
      ${booking ? "disabled" : ""}
      title="${booking ? booking.clientName || "محجوز" : "متاح"}"
    >
      <span>${slotLabels[period]}</span>
      <small>${booking ? "محجوز" : formatMoney(getDayPrices(dateKey)[period])}</small>
    </button>
  `;
}

function toggleSlot(dateKey, slotPeriod) {
  const bookedSlots = buildBookedSlotMap();
  const slotKey = makeSlotKey(dateKey, slotPeriod);
  if (bookedSlots.has(slotKey)) {
    toast("هذه الفترة محجوزة بالفعل.", "error");
    return;
  }

  if (state.selectedSlots.has(slotKey)) state.selectedSlots.delete(slotKey);
  else state.selectedSlots.add(slotKey);

  updateSelectedSummary();
  renderCalendar();
}

function updateSelectedSummary() {
  const summary = summarizeSelectedSlots([...state.selectedSlots]);
  els.selectedDaysCount.textContent = `${summary.slotCount} فترة / ${summary.fullBlocks} كامل`;
  els.priceInput.value = summary.price;
}

function renderBookingsTable() {
  if (!state.bookings.length) {
    els.bookingsTable.innerHTML = `
      <tr>
        <td class="empty-row" colspan="7">لا توجد حجوزات بعد.</td>
      </tr>
    `;
    return;
  }

  els.bookingsTable.innerHTML = state.bookings
    .map((booking) => {
      const dates = [...(booking.dates || [])].sort();
      return `
        <tr>
          <td>${escapeHtml(booking.clientName || "-")}</td>
          <td>${escapeHtml(booking.phone || "-")}</td>
          <td>${dates.map(formatShortDate).join("، ")}</td>
          <td>${formatBookingPeriod(booking)}</td>
          <td>${formatMoney(booking.price || 0)}</td>
          <td>${formatMoney(booking.deposit || 0)}</td>
          <td>
            <div class="table-actions">
              <button class="ghost-action compact" type="button" data-action="edit" data-id="${booking.id}">تعديل</button>
              <button class="danger-action" type="button" data-action="delete" data-id="${booking.id}">حذف</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function collectBookingForm() {
  const slotKeys = [...state.selectedSlots].sort(compareSlotKeys);
  const dates = getDatesFromSlotKeys(slotKeys);
  const summary = summarizeSelectedSlots(slotKeys);
  const period = summary.slotCount === 1 ? splitSlotKey(slotKeys[0])[1] : summary.remainderCount ? "mixed" : "full";
  const clientName = els.clientNameInput.value.trim();
  const phone = els.phoneInput.value.trim();
  const price = summary.price;
  const deposit = Number(els.depositInput.value || 0);
  const notes = els.notesInput.value.trim();
  const id = els.editingBookingId.value || null;

  if (!slotKeys.length) {
    toast("اختر فترة واحدة على الأقل من التقويم.", "error");
    return null;
  }
  if (!clientName || clientName.length < 2) {
    toast("أدخل اسم العميل بشكل صحيح.", "error");
    return null;
  }
  if (!/^[+\d\s()-]{7,}$/.test(phone)) {
    toast("أدخل رقم هاتف صحيح.", "error");
    return null;
  }
  if (deposit > price) {
    toast("العربون لا يمكن أن يكون أكبر من السعر.", "error");
    return null;
  }

  return {
    id,
    dates,
    slotKeys,
    period,
    pricingSummary: summary,
    clientName,
    phone,
    price,
    deposit,
    notes
  };
}

async function saveBooking(booking) {
  const bookingRef = booking.id ? doc(db, "bookings", booking.id) : doc(collection(db, "bookings"));
  const bookingId = bookingRef.id;
  const slotRefs = booking.slotKeys.map((slotKey) => doc(db, "bookingSlots", slotKey));

  await runTransaction(db, async (transaction) => {
    const oldSnapshot = booking.id ? await transaction.get(bookingRef) : null;
    const oldSlotKeys = oldSnapshot?.exists()
      ? getBookingSlotKeys(oldSnapshot.data())
      : [];

    const slotSnapshots = [];
    for (const slotRef of slotRefs) {
      slotSnapshots.push(await transaction.get(slotRef));
    }

    slotSnapshots.forEach((slotSnapshot) => {
      if (slotSnapshot.exists() && slotSnapshot.data().bookingId !== bookingId) {
        throw new Error("يوجد حجز آخر يتعارض مع الأيام أو الفترات المختارة.");
      }
    });

    oldSlotKeys
      .filter((slotKey) => !booking.slotKeys.includes(slotKey))
      .forEach((slotKey) => transaction.delete(doc(db, "bookingSlots", slotKey)));

    booking.slotKeys.forEach((slotKey) => {
      const [date, period] = splitSlotKey(slotKey);
      transaction.set(doc(db, "bookingSlots", slotKey), {
        bookingId,
        date,
        period,
        updatedAt: serverTimestamp()
      });
    });

    transaction.set(bookingRef, {
      dates: booking.dates,
      period: booking.period,
      clientName: booking.clientName,
      phone: booking.phone,
      price: booking.price,
      deposit: booking.deposit,
      notes: booking.notes,
      slotKeys: booking.slotKeys,
      pricingSummary: booking.pricingSummary,
      currency: "USD",
      createdAt: oldSnapshot?.data()?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
}

async function deleteBooking(booking) {
  const batch = writeBatch(db);
  const slotKeys = getBookingSlotKeys(booking);

  batch.delete(doc(db, "bookings", booking.id));
  slotKeys.forEach((slotKey) => batch.delete(doc(db, "bookingSlots", slotKey)));

  const orphanSlots = await getDocs(
    query(collection(db, "bookingSlots"), where("bookingId", "==", booking.id))
  );
  orphanSlots.forEach((slotDoc) => batch.delete(slotDoc.ref));
  await batch.commit();
}

function loadBookingForEdit(booking) {
  resetBookingForm(false);
  els.formTitle.textContent = "تعديل الحجز";
  els.editingBookingId.value = booking.id;
  els.cancelEditBtn.classList.remove("is-hidden");
  els.periodSelect.value = booking.period;
  els.clientNameInput.value = booking.clientName || "";
  els.phoneInput.value = booking.phone || "";
  els.depositInput.value = booking.deposit || 0;
  els.notesInput.value = booking.notes || "";
  state.selectedSlots = new Set(getBookingSlotKeys(booking));
  updateSelectedSummary();
  renderCalendar();
  els.bookingForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetBookingForm(clearSelection = true) {
  els.formTitle.textContent = "تفاصيل الحجز";
  els.editingBookingId.value = "";
  els.bookingForm.reset();
  els.periodSelect.value = "auto";
  els.depositInput.value = 0;
  els.cancelEditBtn.classList.add("is-hidden");
  if (clearSelection) state.selectedSlots.clear();
  updateSelectedSummary();
  renderCalendar();
}

function exportWeeklyReport() {
  const today = new Date();
  const start = startOfWeek(today);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const rows = state.bookings.filter((booking) =>
    (booking.dates || []).some((dateKey) => {
      const date = parseDateKey(dateKey);
      return date >= start && date <= end;
    })
  );

  const header = ["العميل", "الهاتف", "التواريخ", "النوع", "السعر", "العربون", "العملة", "ملاحظات"];
  const csvRows = [
    header,
    ...rows.map((booking) => [
      booking.clientName || "",
      booking.phone || "",
      (booking.dates || []).join(" | "),
      formatBookingPeriod(booking),
      booking.price || 0,
      booking.deposit || 0,
      "USD",
      booking.notes || ""
    ])
  ];

  downloadTextFile(
    `weekly-report-${toDateKey(start)}.csv`,
    "\ufeff" + csvRows.map((row) => row.map(csvCell).join(",")).join("\n")
  );
  toast("تم تصدير التقرير الأسبوعي.", "success");
}

async function shareCalendarImage() {
  if (!window.html2canvas) {
    toast("مكتبة التقاط الصورة غير جاهزة.", "error");
    return;
  }

  showLoading(true);
  try {
    const canvas = await window.html2canvas(els.calendarCapture, {
      backgroundColor: "#eef7f6",
      scale: 2
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], "pool-calendar.png", { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "تقويم حجوزات المسبح" });
    } else {
      const link = document.createElement("a");
      link.download = "pool-calendar.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }

    toast("تم تجهيز صورة التقويم.", "success");
  } catch (error) {
    toast(error.message || "تعذر إنشاء صورة التقويم.", "error");
  } finally {
    showLoading(false);
  }
}

function buildBookedSlotMap() {
  const map = new Map();
  state.bookings.forEach((booking) => {
    const currentEditId = els.editingBookingId.value;
    if (currentEditId && booking.id === currentEditId) return;
    const slotKeys = getBookingSlotKeys(booking);
    slotKeys.forEach((slotKey) => map.set(slotKey, booking));
  });
  return map;
}

function getBookingSlotKeys(booking) {
  if (Array.isArray(booking.slotKeys) && booking.slotKeys.length) {
    return [...booking.slotKeys].sort(compareSlotKeys);
  }
  return getSlotKeys(booking.dates || [], booking.period);
}

function formatBookingPeriod(booking) {
  const slotKeys = getBookingSlotKeys(booking);
  if (slotKeys.length > 1) return `${slotKeys.length} فترات`;
  return periodLabels[booking.period] || booking.period || "-";
}

function getDatesFromSlotKeys(slotKeys) {
  return [...new Set(slotKeys.map((slotKey) => splitSlotKey(slotKey)[0]))].sort();
}

function getSlotKeys(dates, period) {
  if (period === "mixed" || period === "auto") return [];
  const periods = period === "full" ? ["morning", "evening"] : [period];
  return dates.flatMap((date) => periods.map((item) => makeSlotKey(date, item)));
}

function summarizeSelectedSlots(slotKeys) {
  const sorted = [...slotKeys].sort(compareSlotKeys);
  let price = 0;
  let fullBlocks = 0;
  let remainderCount = 0;

  for (let index = 0; index < sorted.length; index += 2) {
    const pair = sorted.slice(index, index + 2);
    if (pair.length === 2) {
      const dateKey = splitSlotKey(pair[0])[0];
      price += getDayPrices(dateKey).full;
      fullBlocks += 1;
    } else {
      const [dateKey, period] = splitSlotKey(pair[0]);
      price += getDayPrices(dateKey)[period];
      remainderCount += 1;
    }
  }

  return {
    slotCount: sorted.length,
    fullBlocks,
    remainderCount,
    price: Number(price.toFixed(2)),
    slotKeys: sorted
  };
}

function getDayPrices(dateKey) {
  const source = isFeaturedDate(dateKey) ? state.settings.featuredPrices : state.settings.standardPrices;
  const morning = Number(source.morning || 0);
  const evening = Number(source.evening || 0);
  const full = Number(source.full ?? morning + evening);
  return { morning, evening, full };
}

function compareSlotKeys(a, b) {
  return slotOrderValue(a) - slotOrderValue(b);
}

function slotOrderValue(slotKey) {
  const [dateKey, period] = splitSlotKey(slotKey);
  const date = parseDateKey(dateKey);
  return date.getTime() + (period === "evening" ? 12 * 60 * 60 * 1000 : 0);
}

function isFeaturedDate(dateKey) {
  const date = parseDateKey(dateKey);
  return (
    state.settings.featuredWeekdays.includes(date.getDay()) ||
    state.settings.featuredDates.includes(dateKey)
  );
}

function getFeaturedDaysLabel() {
  const names = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const weekdays = state.settings.featuredWeekdays.map((day) => names[day]).join("، ");
  const dates = state.settings.featuredDates.map(formatShortDate).join("، ");
  return [weekdays, dates].filter(Boolean).join(" + ") || "لا توجد أيام مميزة";
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ar", { maximumFractionDigits: 2 })} USD`;
}

function getCalendarDays(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = (first.getDay() + 1) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (result.getDay() + 1) % 7;
  result.setDate(result.getDate() - offset);
  result.setHours(0, 0, 0, 0);
  return result;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatShortDate(dateKey) {
  const date = parseDateKey(dateKey);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

function formatLongDate(dateKey) {
  const date = parseDateKey(dateKey);
  return `${formatWeekday(dateKey)} ${date.getDate()} ${arabicMonthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function formatWeekday(dateKey) {
  return arabicWeekdayNames[parseDateKey(dateKey).getDay()];
}

function formatMonthYear(date) {
  return `${arabicMonthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function getDateDisplayParts(dateKey) {
  const date = parseDateKey(dateKey);
  return {
    weekday: formatWeekday(dateKey),
    numeric: formatShortDate(dateKey),
    monthYear: formatMonthYear(date)
  };
}

function makeSlotKey(date, period) {
  return `${date}_${period}`;
}

function splitSlotKey(slotKey) {
  const [date, period] = slotKey.split("_");
  return [date, period];
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFriendlyAuthError(error) {
  const code = error?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) {
    return "بيانات الدخول غير صحيحة.";
  }
  if (code.includes("user-not-found")) return "هذا المستخدم غير موجود.";
  if (code.includes("too-many-requests")) return "محاولات كثيرة، حاول لاحقًا.";
  return "تعذر تسجيل الدخول. تحقق من إعدادات Firebase.";
}
