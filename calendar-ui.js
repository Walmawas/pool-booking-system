(() => {
  const GRID_ID = "publicCalendarGrid";
  const WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }
  function parseDateKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  function formatDate(key) {
    const date = parseDateKey(key);
    return { day: date.getDate(), weekday: WEEKDAYS[date.getDay()], month: MONTHS[date.getMonth()] };
  }
  function extractDate(card) { return card.querySelector("[data-public-slot]")?.dataset.date || ""; }
  function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function rebuildCard(card) {
    const dateKey = extractDate(card);
    if (!dateKey || card.dataset.redesigned === "1") return;
    const info = formatDate(dateKey);
    const originalSlots = [...card.querySelectorAll("[data-public-slot]")];
    const morning = originalSlots.find((slot) => slot.dataset.period === "morning");
    const evening = originalSlots.find((slot) => slot.dataset.period === "evening");
    const featured = card.classList.contains("featured-day");
    const isToday = dateKey === todayKey();

    const slotHtml = (slot, period, label) => {
      if (!slot) return "";
      const booked = slot.classList.contains("is-booked");
      const small = slot.querySelector("small")?.textContent?.trim() || (booked ? "محجوز" : "متاح");
      const priceTime = small.replace(/^(محجوز|متاح)\s*-\s*/, "");
      return `<button class="customer-slot redesigned-slot ${booked ? "is-booked" : ""}" type="button" data-public-slot="true" data-date="${escapeHtml(dateKey)}" data-period="${period}">
        <span class="slot-label">${label}</span>
        <small>${booked ? "محجوز" : "متاح"}${priceTime ? ` - ${escapeHtml(priceTime)}` : ""}</small>
      </button>`;
    };

    card.className = `customer-day-card ${featured ? "featured-day" : ""} ${isToday ? "is-today" : ""}`.trim();
    card.dataset.redesigned = "1";
    card.innerHTML = `
      <div class="redesigned-day-head">
        <div class="redesigned-day-name">
          <strong>${escapeHtml(info.weekday)}</strong>
          <span>${escapeHtml(info.month)}</span>
        </div>
        <div class="redesigned-day-number" aria-label="اليوم ${info.day}">${info.day}</div>
        ${isToday ? '<span class="redesigned-today">اليوم</span>' : ""}
      </div>
      <div class="redesigned-slots">
        ${slotHtml(morning, "morning", "ص: صباحًا")}
        ${slotHtml(evening, "evening", "م: مساءً")}
      </div>`;
  }

  function render(grid) { grid.querySelectorAll(":scope > .customer-day-card").forEach(rebuildCard); }

  function install() {
    const grid = document.getElementById(GRID_ID);
    if (!grid) { window.setTimeout(install, 50); return; }
    if (grid.dataset.redesignInstalled === "1") return;
    grid.dataset.redesignInstalled = "1";
    injectStyles();
    render(grid);
    const observer = new MutationObserver(() => render(grid));
    observer.observe(grid, { childList: true });
  }

  function injectStyles() {
    if (document.getElementById("customer-calendar-redesign")) return;
    const style = document.createElement("style");
    style.id = "customer-calendar-redesign";
    style.textContent = `
      .customer-calendar-grid{display:flex!important;flex-direction:column!important;gap:14px!important;}
      .customer-day-card{position:relative!important;display:block!important;min-height:0!important;padding:14px 15px 15px!important;border:1px solid rgba(22,148,137,.18)!important;border-radius:24px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 7px 22px rgba(24,63,72,.08)!important;overflow:hidden!important;}
      .customer-day-card.featured-day{border-color:rgba(22,148,137,.58)!important;}
      .customer-day-card.is-today{box-shadow:0 9px 26px rgba(16,110,103,.14)!important;}
      .redesigned-day-head{position:relative;display:flex;align-items:center;direction:ltr;gap:12px;min-height:58px;padding:0 0 10px;}
      .redesigned-day-name{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:2px;flex:1;order:1;padding-inline-end:2px;direction:rtl;}
      .redesigned-day-name strong{font-size:1.08rem;font-weight:800;color:#4f6077;line-height:1.2;}
      .redesigned-day-name span{font-size:.92rem;font-weight:600;color:#65748a;line-height:1.15;}
      .redesigned-day-number{display:grid;place-items:center;order:2;width:58px;height:58px;border-radius:18px;background:#edf8f6;color:#075f5a;font-size:1.85rem;font-weight:800;line-height:1;flex:0 0 58px;}
      .redesigned-today{position:absolute;left:0;bottom:5px;padding:5px 12px;border-radius:999px;background:#07986f;color:#fff;font-size:.76rem;font-weight:800;}
      .redesigned-slots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;direction:rtl;}
      .redesigned-slot{min-height:76px!important;border:1px solid rgba(11,160,134,.35)!important;border-radius:18px!important;background:#e9f7f3!important;color:#112530!important;display:flex!important;align-items:center!important;justify-content:center!important;flex-direction:column!important;gap:5px!important;padding:10px 8px!important;box-shadow:none!important;font-family:inherit!important;}
      .redesigned-slot .slot-label{font-size:1rem;font-weight:800;line-height:1.2;}
      .redesigned-slot small{font-size:.82rem;font-weight:700;line-height:1.2;color:#35515b;}
      .redesigned-slot.is-booked{background:#fdebed!important;border-color:#ef9ea5!important;color:#a82229!important;}
      .redesigned-slot.is-booked small{color:#b5292f!important;}
      .redesigned-slot:active{transform:scale(.99);}
      @media(max-width:620px){
        .customer-day-card{padding:13px 12px 14px!important;border-radius:22px!important;}
        .redesigned-day-number{width:54px;height:54px;flex-basis:54px;border-radius:17px;font-size:1.7rem;}
        .redesigned-day-name strong{font-size:1rem;}
        .redesigned-day-name span{font-size:.88rem;}
        .redesigned-slot{min-height:72px!important;border-radius:17px!important;}
        .redesigned-slot .slot-label{font-size:.93rem;}
        .redesigned-slot small{font-size:.76rem;}
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
