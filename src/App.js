import React, { useState, useEffect } from "react";

// --- دوال مساعدة عامة ---
const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

// أسماء الأشهر بالصيغة المطلوبة (كانون الثاني - شباط ... الخ)
const customArabicMonthNames = [
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
];

// تحويل كائن Date إلى صيغةYYYY-MM-DD
function formatDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const d = dateObj.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// دالة لتحويل لون Hex إلى RGBA لتطبيق الشفافية
function hexToRgba(hex, alpha) {
  let r = 0, g = 0, b = 0;

  // 3 digits
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  }
  // 6 digits
  else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// دالة لتوليد رابط واتساب من رقم هاتف (تنظيف الرقم)
function getWhatsAppLink(phoneNumber) {
  // إزالة أي أحرف غير رقمية من الرقم
  const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
  // بما أن الرقم المعطى بدأ بـ +352، فسنفترض أنه رقم دولي جاهز
  return `https://wa.me/${cleanedNumber}`;
}

// Function to get the start of the week (Sunday for this calendar)
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 for Sunday
  const diff = d.getDate() - day; // Adjust to Sunday of the current week
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// --- المكون الرئيسي App ---
export default function App() {
  // محاكاة بيانات الحجوزات (في التطبيق الحقيقي يتم جلبها من قاعدة بيانات)
  const [bookings, setBookings] = useState([]);

  // اختيارات الأيام مع الفترات المختارة (قبل الحفظ النهائي)
  // مثال: [{ date: "2025-06-19", periods: ["صباحي", "مسائي"] }]
  const [selectedDays, setSelectedDays] = useState([]);

  // للتحكم في ظهور نافذة اختيار فترة يوم معين (في Admin View)
  const [selectPeriodDate, setSelectPeriodDate] = useState(null);

  // لبيانات نموذج الحجز الجديد (في Admin View)
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  // جديد: نسبة الخصم
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // جديد: السعر المدخل يدوياً للحجز الجديد (بعد تطبيق الخصم)
  const [manualBookingPrice, setManualBookingPrice] = useState(0);
  // جديد: لتخزين القيمة النصية الخام لحقل إدخال السعر الكلي للحجز
  const [rawManualBookingPriceInput, setRawManualBookingPriceInput] = useState("");

  // لإدارة عرض تفاصيل يوم محجوز (في Admin View)
  const [viewingDate, setViewingDate] = useState(null);

  // لتعديل حجز معين (في Admin View)
  const [editingBooking, setEditingBooking] = useState(null);

  // للتحكم في نافذة "اتصل بالمالك" (في Customer View)
  const [showContactModal, setShowContactModal] = useState(false);

  // للتبديل بين واجهة الإدارة وواجهة العميل
  const [currentInterface, setCurrentInterface] = useState("customer"); // 'customer' أصبح الافتراضي

  // جديد: لإدارة أسعار الفترات (بالدولار الأمريكي كقاعدة)
  const [prices, setPrices] = useState({
    "صباحي": 50,
    "مسائي": 40,
    "يوم كامل": 75,
  });

  // جديد: أسعار الصرف (افتراضية لأغراض المحاكاة)
  const [exchangeRates, setExchangeRates] = useState({
    "USD": 1,
    "TRY": 40, // مثال: 1 دولار = 32 ليرة تركية
    "SYP": 10000, // مثال: 1 دولار = 15000 ليرة سورية
  });

  // جديد: العملة المختارة
  const [selectedCurrency, setSelectedCurrency] = useState("USD"); // الافتراضي دولار أمريكي

  // جديد: للتحكم في نافذة تعديل الأسعار
  const [showPriceEditModal, setShowPriceEditModal] = useState(false);

  // جديد: حالة تسجيل دخول المسؤول
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const ADMIN_USERNAME = "admin"; // اسم المستخدم الافتراضي للمسؤول
  const ADMIN_PASSWORD = "155"; // كلمة المرور الافتراضية للمسؤول

  // حالة الشهر المعروض في التقويم (مهمة للتنقل بين الأشهر)
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());


  // دالة لحساب السعر بناءً على الفترة وعدد الأيام والخصم (تستخدم state الأسعار)
  const getBookingPrice = (periods, numDays, discount = 0) => {
    let pricePerPeriod = 0;
    if (periods.includes("يوم كامل")) {
      pricePerPeriod = prices["يوم كامل"];
    } else if (periods.includes("صباحي") && periods.includes("مسائي")) {
      pricePerPeriod = prices["صباحي"] + prices["مسائي"];
    } else if (periods.includes("صباحي")) {
      pricePerPeriod = prices["صباحي"];
    } else if (periods.includes("مسائي")) {
      pricePerPeriod = prices["مسائي"];
    }

    let totalBasePrice = pricePerPeriod * numDays;
    // تطبيق الخصم
    const finalPrice = totalBasePrice * (1 - Math.min(Math.max(0, discount), 100) / 100);
    return Math.round(finalPrice); // تقريب السعر النهائي
  };

  // جديد: دالة لتحويل السعر إلى العملة المختارة
  const convertPrice = (priceInUSD) => {
    return (priceInUSD * exchangeRates[selectedCurrency]).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  // جديد: حساب السعر الافتراضي للحجز الجديد وتحديث manualBookingPrice
  useEffect(() => {
    if (selectedDays.length > 0) {
      const calculatedTotalPrice = getBookingPrice(selectedDays.flatMap(day => day.periods), selectedDays.length, discountPercentage);
      setManualBookingPrice(calculatedTotalPrice);
      setRawManualBookingPriceInput(convertPrice(calculatedTotalPrice)); // تحديث القيمة الخام للعرض
    } else {
      setManualBookingPrice(0);
      setRawManualBookingPriceInput(""); // مسح القيمة الخام عند عدم وجود أيام مختارة
    }
  }, [selectedDays, prices, discountPercentage, selectedCurrency]); // يعاد الحساب عند تغيير الأيام المختارة أو الأسعار أو الخصم أو العملة

  // --- دوال التعامل مع الحجوزات والتقويم ---

  // عند الضغط على يوم في التقويم (سلوك مختلف حسب الواجهة)
  function handleDayClick(dateStr, isBookedAdmin, isBookedCustomer) {
    if (currentInterface === "admin") {
      // سلوك واجهة الإدارة:
      if (isBookedAdmin) {
        setViewingDate(dateStr); // عرض تفاصيل الحجوزات لهذا اليوم
      } else {
        setSelectPeriodDate(dateStr); // فتح نافذة اختيار الفترة للحجز الجديد
      }
    } else {
      // سلوك واجهة العميل:
      if (isBookedCustomer) {
        alert("هذا اليوم محجوز."); // رسالة بسيطة "محجوز"
      } else {
        setShowContactModal(true); // فتح نافحة معلومات الاتصال
      }
    }
  }

  // حفظ فترة الحجز المختارة ليوم معين (في Admin View)
  function savePeriodForDate(periods) {
    if (!periods || periods.length === 0) {
      setSelectedDays((prev) => prev.filter((d) => d.date !== selectPeriodDate));
    } else {
      setSelectedDays((prev) => {
        const filtered = prev.filter((d) => d.date !== selectPeriodDate);
        return [...filtered, { date: selectPeriodDate, periods }];
      });
    }
    setSelectPeriodDate(null);
  }

  // حذف يوم من الاختيارات الحالية قبل الحفظ النهائي (في Admin View)
  function removeSelectedDay(date) {
    setSelectedDays((prev) => prev.filter((d) => d.date !== date));
  }

  // حفظ الحجز النهائي لجميع الأيام والفترات المختارة (في Admin View)
  function handleSaveBooking() {
    if (!clientName.trim()) {
      setErrorMsg("يرجى إدخال اسم العميل");
      return;
    }
    if (!clientPhone.trim()) {
      setErrorMsg("يرجى إدخال رقم الهاتف");
      return;
    }
    if (selectedDays.length === 0) {
      setErrorMsg("يرجى اختيار يوم واحد على الأقل");
      return;
    }
    // استخدام manualBookingPrice مباشرة لأنه يتم تحديثه من raw input
    if (manualBookingPrice <= 0) {
        setErrorMsg("السعر لا يمكن أن يكون صفر أو أقل.");
        return;
    }
    setErrorMsg("");

    let newBookingsToAdd = [];
    const totalSelectedPeriodsCount = selectedDays.flatMap(day => day.periods).length;
    // السعر لكل فترة يتم حسابه من السعر اليدوي الإجمالي
    const pricePerSinglePeriodBooking = totalSelectedPeriodsCount > 0 ? (manualBookingPrice / totalSelectedPeriodsCount) : 0;


    selectedDays.forEach(({ date, periods }) => {
      periods.forEach(period => {
        newBookingsToAdd.push({
          id: Math.random().toString(36).substr(2, 9), // معرف عشوائي مؤقت
          date,
          period, // الفترة المحددة (صباحي، مسائي، يوم كامل)
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          price: Math.round(pricePerSinglePeriodBooking), // استخدام السعر اليدوي مقسمًا
          discount: discountPercentage, // جديد: حفظ نسبة الخصم
          status: "active", // نشط (upcoming)
          createdAt: new Date(),
        });
      });
    });

    setBookings((prev) => [...prev, ...newBookingsToAdd]);
    setSelectedDays([]);
    setClientName("");
    setClientPhone("");
    setDiscountPercentage(0); // إعادة تعيين الخصم
    setManualBookingPrice(0); // إعادة تعيين السعر اليدوي
    setRawManualBookingPriceInput(""); // مسح القيمة الخام بعد الحفظ
    alert("تم حفظ الحجز بنجاح");
  }

  // فتح نموذج تعديل حجز معين (في Admin View)
  function openEditBooking(b) {
    setEditingBooking(b);
    setViewingDate(null); // إغلاق نافذة العرض إذا كانت مفتوحة
  }

  // حفظ تعديل الحجز (في Admin View)
  function saveEditBooking(updatedBooking) {
    setBookings((prev) =>
      prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
    );
    setEditingBooking(null);
  }

  // إغلاق نافذة عرض تفاصيل اليوم (في Admin View)
  function closeViewing() {
    setViewingDate(null);
  }

  // تبديل اختيار الفترة (في PeriodPickerModal)
  function togglePeriod(selectedPeriods, period) {
    if (selectedPeriods.includes(period)) {
      return selectedPeriods.filter((p) => p !== period);
    } else {
      if (period === "يوم كامل") {
        return ["يوم كامل"];
      } else {
        return selectedPeriods.filter((p) => p !== "يوم كامل").concat(period);
      }
    }
  }

  // دالة لتحديد لون الخلية في التقويم بناءً على الحجوزات
  function getCellColor(dateStr) {
    const dayBookings = bookings.filter(
      (b) => b.date === dateStr && b.status === "active"
    );
    const selectedDayInfo = selectedDays.find((sd) => sd.date === dateStr);
    const selectedPeriods = selectedDayInfo ? selectedDayInfo.periods : [];

    let color = ""; // No default background color

    if (dayBookings.length > 0) {
      const hasFullDay = dayBookings.some(b => b.period === "يوم كامل");
      const hasMorning = dayBookings.some(b => b.period === "صباحي");
      const hasEvening = dayBookings.some(b => b.period === "مسائي");

      if (hasFullDay) {
        color = "#e57373"; // أحمر ليوم كامل
      } else if (hasMorning || hasEvening) {
        color = "#ffb74d"; // برتقالي لفترة واحدة (صباحي أو مسائي أو كلاهما)
      }
    } else if (selectedPeriods.length > 0) {
      if (selectedPeriods.includes("يوم كامل")) {
        color = "#f28b82"; // أحمر فاتح للتحديد المؤقت ليوم كامل
      } else if (selectedPeriods.includes("صباحي") || selectedPeriods.includes("مسائي")) {
        color = "#ffd180"; // برتقالي فاتح للتحديد المؤقت لفترة
      }
    } else {
        // If no bookings or selected periods, and it's an available future day (for customer) or any unbooked day (for admin)
        // this color should be for *available* days, not just an empty background
        const today = new Date();
        today.setHours(0,0,0,0);
        const currentDate = new Date(dateStr);
        currentDate.setHours(0,0,0,0);

        const futureLimitDateForBooking = new Date(today);
        futureLimitDateForBooking.setDate(today.getDate() + 14);
        futureLimitDateForBooking.setHours(0,0,0,0);

        if (currentInterface === "customer" && currentDate >= today && currentDate <= futureLimitDateForBooking) {
            color = "#e6ffe6"; // Light green for available in customer view
        } else if (currentInterface === "admin") {
            color = "#e6ffe6"; // Light green for available in admin view (any unbooked day)
        }
    }
    return color;
  }

  // دوال التنقل بين الأشهر
  const handlePrevMonth = () => {
    setCurrentMonthDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setMonth(newDate.getMonth() - 1);
        return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setMonth(newDate.getMonth() + 1);
        return newDate;
    });
  };

  // --- رسم التقويم الشهري (الآن يعرض الشهر كاملاً مع التنقل) ---
  function renderCalendar() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Calculate the start of the first week displayed (Sunday of the week containing the 1st of the month)
    const displayStartDate = getStartOfWeek(firstDayOfMonth);

    // This is the limit for making new bookings (15 days from TODAY)
    const futureLimitDateForBooking = new Date(today);
    futureLimitDateForBooking.setDate(today.getDate() + 14);
    futureLimitDateForBooking.setHours(0, 0, 0, 0);

    const cells = [];

    // Loop for 6 full weeks (42 days) to ensure the entire month is displayed
    let currentDate = new Date(displayStartDate);
    for (let i = 0; i < 42; i++) {
        const dateStr = formatDate(currentDate);

        const dayBookings = bookings.filter(
            (b) => b.date === dateStr && b.status === "active"
        );
        const isBooked = dayBookings.length > 0; // Check for any active booking

        let bookingDisplayStatus = "";
        if (isBooked) {
            const hasFullDay = dayBookings.some(b => b.period === "يوم كامل");
            const hasMorning = dayBookings.some(b => b.period === "صباحي");
            const hasEvening = dayBookings.some(b => b.period === "مسائي");

            if (hasFullDay) {
                bookingDisplayStatus = "محجوز كامل";
            } else if (hasMorning && hasEvening && dayBookings.length === 2) {
                bookingDisplayStatus = "محجوز نهار وليل";
            } else if (hasMorning) {
                bookingDisplayStatus = "محجوز نهار";
            } else if (hasEvening) {
                bookingDisplayStatus = "محجوز ليل";
            } else {
                bookingDisplayStatus = "محجوز";
            }
        }

        let cellBackgroundColor = getCellColor(dateStr);
        let cellBorderColor = '#eee';
        let cellTextColor = '#333';
        let cursorStyle = 'pointer';

        const isPastDay = currentDate < today;
        const isTodayDate = currentDate.toDateString() === today.toDateString();
        const isCurrentMonthDay = currentDate.getMonth() === month && currentDate.getFullYear() === year;

        // --- Styling and Interactivity Logic ---
        if (currentInterface === "admin") {
            // Admin can click on any day
            // Past days are not colored by default if empty
            if (isPastDay) {
                cellBackgroundColor = ""; // No background color for past days
                cellTextColor = '#888'; // Dim text for past days
                if (isBooked) {
                    cellBackgroundColor = hexToRgba(getCellColor(dateStr), 0.3); // Faded for past booked days
                    cellTextColor = hexToRgba('#333', 0.5);
                }
            } else if (!isBooked) {
                cellBackgroundColor = '#e6ffe6'; // Light green for available future/current days
            }

            // Dim days not in the current month visually, but keep interactive
            if (!isCurrentMonthDay) {
                cellBackgroundColor = hexToRgba(cellBackgroundColor || '#FFFFFF', 0.4); // Apply transparency to any background
                cellTextColor = hexToRgba(cellTextColor, 0.6);
            }

        } else { // Customer Interface Logic
            if (isPastDay) {
                // Past days are completely uncolored and non-interactive
                cellBackgroundColor = ""; // No background color
                cellBorderColor = '#f0f0f0';
                cellTextColor = '#ccc';
                cursorStyle = 'default';
                if (isBooked) { // If it's a past booked day
                    cellBackgroundColor = hexToRgba(getCellColor(dateStr), 0.2); // Very faded booked color
                    cellTextColor = hexToRgba('#999', 0.5);
                }
            } else if (currentDate > futureLimitDateForBooking) {
                // Days beyond 15-day limit are uncolored and non-interactive
                cellBackgroundColor = ""; // No background color
                cellBorderColor = '#f0f0f0';
                cellTextColor = '#ccc';
                cursorStyle = 'default';
            } else if (isTodayDate) {
                // Today's date (customer view)
                cellBackgroundColor = '#ffe6e6';
                cellBorderColor = '#ffb3b3';
                cellTextColor = '#333';
                cursorStyle = 'pointer';
            } else {
                // All other future days within 15-day limit (customer view)
                if (!isBooked) {
                    cellBackgroundColor = '#e6ffe6'; // Light green for available
                }
                cellTextColor = '#333';
                cursorStyle = 'pointer';
            }

            // Dim days not in the current month visually for customer
            if (!isCurrentMonthDay && cursorStyle !== 'default') {
                cellBackgroundColor = hexToRgba(cellBackgroundColor || '#FFFFFF', 0.4);
                cellTextColor = hexToRgba(cellTextColor, 0.6);
            }
        }

        const handleCellClick = () => {
            // Customer: If it's a past day or beyond future limit, do nothing.
            if (currentInterface === "customer" && (isPastDay || currentDate > futureLimitDateForBooking)) {
                return;
            }
            // Admin: All days are clickable based on whether they are booked or not.
            handleDayClick(dateStr, isBooked, isBooked);
        };

        cells.push(
            <td
                key={dateStr}
                onClick={handleCellClick}
                style={{
                    cursor: cursorStyle,
                    backgroundColor: cellBackgroundColor,
                    border: `1px solid ${cellBorderColor}`,
                    padding: 8,
                    textAlign: "center",
                    userSelect: "none",
                    color: cellTextColor,
                    // Additional styling for hover and selected if needed
                }}
                title={`اليوم: ${currentDate.getDate()} ${dayNames[currentDate.getDay()]}`}
            >
                {currentDate.getDate()}
                <br />
                {/* Display booking status only for admin, or for customer if not a past day */}
                {bookingDisplayStatus && (currentInterface === "admin" || (currentInterface === "customer" && !isPastDay)) && (
                    <small style={{ fontSize: 10, color: cellTextColor }}>
                        ({bookingDisplayStatus})
                    </small>
                )}
            </td>
        );

        currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
    }

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(<tr key={"row-" + i}>{cells.slice(i, i + 7)}</tr>);
    }

    return (
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          maxWidth: 600,
          margin: "auto",
          direction: "rtl",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <thead>
          <tr>
            {dayNames.map((day) => (
              <th
                key={day}
                style={{
                  border: "1px solid #ccc",
                  padding: 8,
                  backgroundColor: "#ddd",
                  color: '#555'
                }}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
  }

  // --- مكونات النوافذ المنبثقة (Modals) ---

  // نافذة اختيار فترات يوم معين (للاستخدام في Admin View)
  function PeriodPickerModal({ date, onSave, onCancel }) {
    const [periods, setPeriods] = useState([]);

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          direction: "rtl",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: 20,
            borderRadius: 10,
            width: 320,
            textAlign: "right",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <h3>اختر نوع الحجز ليوم {date}</h3>
          <label style={{ display: "block", marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={periods.includes("صباحي")}
              onChange={() => setPeriods(togglePeriod(periods, "صباحي"))}
            />{" "}
            صباحي
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={periods.includes("مسائي")}
              onChange={() => setPeriods(togglePeriod(periods, "مسائي"))}
            />{" "}
            مسائي
          </label>
          <label style={{ display: "block", marginBottom: 20 }}>
            <input
              type="checkbox"
              checked={periods.includes("يوم كامل")}
              onChange={() => setPeriods(togglePeriod(periods, "يوم كامل"))}
            />{" "}
            يوم كامل
          </label>

          <div style={{ textAlign: "center" }}>
            <button
              disabled={periods.length === 0}
              onClick={() => onSave(periods)}
              style={{
                backgroundColor: periods.length === 0 ? "#ccc" : "#4caf50",
                color: "white",
                border: "none",
                padding: "8px 20px",
                borderRadius: 6,
                marginRight: 10,
                cursor: periods.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              حفظ
            </button>
            <button
              onClick={onCancel}
              style={{
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                padding: "8px 20px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  // نافذة عرض تفاصيل الحجوزات ليوم معين (للاستخدام في Admin View)
  function BookingDetailsModal({ date, onClose }) {
    const dayBookings = bookings.filter(
      (b) => b.date === date && b.status === "active"
    );

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          direction: "rtl",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: 20,
            borderRadius: 10,
            width: 600,
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <h3>تفاصيل الحجوزات ليوم {date}</h3>
          {dayBookings.length === 0 ? (
            <p>لا توجد حجوزات.</p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: 20,
              }}
            >
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>
                    اسم العميل
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>
                    رقم الهاتف
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>
                    الفترة
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>
                    السعر
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>
                    الحالة
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {dayBookings.map((b) => (
                  <tr key={b.id}>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {b.clientName}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {b.clientPhone || "لا يوجد رقم"}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {b.period}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {convertPrice(b.price)} {selectedCurrency}
                      {b.discount > 0 && <small style={{ color: 'green', marginLeft: '5px' }}>({b.discount}% حسم)</small>}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {b.status === "active" ? "نشط" : "ملغى"}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      <button
                        onClick={() => {
                          setEditingBooking(b);
                          setViewingDate(null); // إغلاق نافذة العرض
                        }}
                        style={{
                          backgroundColor: "#2196f3",
                          color: "white",
                          border: "none",
                          borderRadius: 5,
                          padding: "6px 12px",
                          cursor: "pointer",
                          marginRight: 5
                        }}
                      >
                        تعديل
                      </button>
                      {b.clientPhone && ( // زر التواصل يظهر فقط إذا كان هناك رقم هاتف
                        <a
                          href={getWhatsAppLink(b.clientPhone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            backgroundColor: "#25d366", // واتساب أخضر
                            color: "white",
                            border: "none",
                            borderRadius: 5,
                            padding: "6px 12px",
                            cursor: "pointer",
                            textDecoration: 'none', // لإزالة خط الرابط
                            display: 'inline-block' // لجعل الأزرار بجانب بعضها
                          }}
                        >
                          تواصل
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ textAlign: "center" }}>
            <button
              onClick={onClose}
              style={{
                backgroundColor: "#ccc",
                border: "none",
                padding: "10px 20px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  // نافذة تعديل حجز (للاستخدام في Admin View)
  function EditBookingModal({ booking, onClose, onSave }) {
    const [clientName, setClientName] = useState(booking.clientName);
    const [clientPhone, setClientPhone] = useState(booking.clientPhone || "");
    const [status, setStatus] = useState(booking.status);
    // يمكن إضافة حقل تعديل للسعر والخصم هنا إذا لزم الأمر
    const [bookingPrice, setBookingPrice] = useState(booking.price);


    function save() {
      if (!clientName.trim()) {
        alert("يرجى إدخال اسم العميل");
        return;
      }
      onSave({
        ...booking,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        status,
        price: bookingPrice, // حفظ السعر المعدل
      });
      onClose();
    }

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          direction: "rtl",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: 20,
            borderRadius: 10,
            width: 400,
            textAlign: "right",
          }}
        >
          <h3>تعديل الحجز ليوم {booking.date}</h3>
          <label style={{ display: "block", marginBottom: 10 }}>
            اسم العميل:
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 4, border: "1px solid #ddd", boxSizing: "border-box" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            رقم الهاتف:
            <input
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 4, border: "1px solid #ddd", boxSizing: "border-box" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            السعر ($):
            <input
              type="number"
              value={bookingPrice}
              onChange={(e) => setBookingPrice(Math.max(0, parseInt(e.target.value) || 0))}
              style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 4, border: "1px solid #ddd", boxSizing: "border-box" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            الحالة:
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 4, border: "1px solid #ddd", boxSizing: "border-box" }}
            >
              <option value="active">نشط</option>
              <option value="cancelled">ملغى</option>
            </select>
          </label>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={save}
              style={{
                backgroundColor: "#4caf50",
                color: "white",
                border: "none",
                padding: "8px 20px",
                borderRadius: 6,
                marginRight: 10,
                cursor: "pointer",
              }}
            >
              حفظ
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                padding: "8px 20px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  // نافذة معلومات الاتصال (للاستخدام في Customer View)
  function ContactOwnerModal({ onClose }) {
    // تم تحديث رقم الواتساب هنا
    const whatsappLink = "https://wa.me/352681567159"; // رقم الواتساب لصاحب المسبح
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          direction: "rtl",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: 30,
            borderRadius: 10,
            width: 350,
            textAlign: "center",
          }}
        >
          <h3>تواصل مع صاحب المسبح</h3>
          <p>للحجز أو الاستفسار، الرجاء التواصل عبر واتساب:</p>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              backgroundColor: "#25d366",
              color: "white",
              padding: "12px 25px",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: "1.1em",
              fontWeight: "bold",
              marginBottom: 20,
            }}
          >
            تواصل عبر واتساب
          </a>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#ccc",
              border: "none",
              padding: "10px 20px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    );
  }

  // جديد: نافذة تعديل الأسعار (للاستخدام في Admin Panel)
  function PriceEditModal({ currentPrices, onSave, onClose, exchangeRates, selectedCurrency }) {
    const [tempPrices, setTempPrices] = useState(currentPrices);

    const handlePriceChange = (period, value) => {
      setTempPrices(prev => ({
        ...prev,
        [period]: Math.max(0, parseInt(value) || 0) // التأكد من أن القيمة عدد صحيح وموجب
      }));
    };

    const convertDisplayPrice = (priceInUSD) => {
      return (priceInUSD * exchangeRates[selectedCurrency]).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    };

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          direction: "rtl",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: 20,
            borderRadius: 10,
            width: 400,
            textAlign: "right",
          }}
        >
          <h3>تعديل أسعار الحجز (بالدولار الأمريكي)</h3>
          <label style={{ display: "block", marginBottom: 10 }}>
            سعر الفترة الصباحية ($):
            <input
              type="number"
              value={tempPrices["صباحي"]}
              onChange={(e) => handlePriceChange("صباحي", e.target.value)}
              style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 4, border: "1px solid #ddd", boxSizing: "border-box" }}
            />
            <small style={{ display: 'block', color: '#666' }}>
              = {convertDisplayPrice(tempPrices["صباحي"])} {selectedCurrency}
            </small>
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            سعر الفترة المسائية ($):
            <input
              type="number"
              value={tempPrices["مسائي"]}
              onChange={(e) => handlePriceChange("مسائي", e.target.value)}
              style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 4, border: "1px solid #ddd", boxSizing: "border-box" }}
            />
            <small style={{ display: 'block', color: '#666' }}>
              = {convertDisplayPrice(tempPrices["مسائي"])} {selectedCurrency}
            </small>
          </label>
          <label style={{ display: "block", marginBottom: 20 }}>
            سعر اليوم الكامل ($):
            <input
              type="number"
              value={tempPrices["يوم كامل"]}
              onChange={(e) => handlePriceChange("يوم كامل", e.target.value)}
              style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 4, border: "1px solid #ddd", boxSizing: "border-box" }}
            />
            <small style={{ display: 'block', color: '#666' }}>
              = {convertDisplayPrice(tempPrices["يوم كامل"])} {selectedCurrency}
            </small>
          </label>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => { onSave(tempPrices); onClose(); }}
              style={{
                backgroundColor: "#4caf50",
                color: "white",
                border: "none",
                padding: "8px 20px",
                borderRadius: 6,
                marginRight: 10,
                cursor: "pointer",
              }}
            >
              حفظ الأسعار
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                padding: "8px 20px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  // جديد: مكون نافذة تسجيل الدخول للمسؤول
  function AdminLoginModal({ onLoginSuccess, onClose }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    const handleLogin = () => {
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        onLoginSuccess();
      } else {
        setLoginError("اسم المستخدم أو كلمة المرور غير صحيحة.");
      }
    };

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10000,
          direction: "rtl",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: 30,
            borderRadius: 10,
            width: 350,
            textAlign: "right",
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
          }}
        >
          <h3 style={{ textAlign: "center", marginBottom: 20 }}>تسجيل دخول المسؤول</h3>
          {loginError && <p style={{ color: 'red', textAlign: 'center' }}>{loginError}</p>}
          <label style={{ display: 'block', marginBottom: 15 }}>
            اسم المستخدم:
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", marginTop: 5, boxSizing: "border-box" }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 20 }}>
            كلمة المرور:
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", marginTop: 5, boxSizing: "border-box" }}
            />
          </label>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={handleLogin}
              style={{
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "1.1em",
                fontWeight: "bold",
                marginRight: 10
              }}
            >
              دخول
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "1.1em",
                fontWeight: "bold"
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- مكون صفحة الإدارة (Admin Panel) ---
  function AdminPanel() {
    // دوال لفلترة الحجوزات (قادمة، ملغاة، منقضية)
    const getUpcomingBookings = () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return bookings
        .filter((b) => b.status === "active" && new Date(b.date) >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const getCancelledBookings = () => {
      return bookings.filter((b) => b.status === "cancelled");
    };

    const getExpiredBookings = () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return bookings
        .filter((b) => b.status === "active" && new Date(b.date) < now)
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // الأحدث أولاً
    };

    const [currentBookingListFilter, setCurrentBookingListFilter] = useState("upcoming");

    const filteredBookings =
      currentBookingListFilter === "upcoming"
        ? getUpcomingBookings()
        : currentBookingListFilter === "cancelled"
        ? getCancelledBookings()
        : getExpiredBookings();

    return (
      <div style={{ maxWidth: 900, margin: "20px auto", direction: "rtl", fontFamily: "Arial, sans-serif" }}>
        <h2 style={{ textAlign: "center", marginBottom: 30 }}>لوحة تحكم الإدارة</h2>

        {/* جديد: اختيار العملة */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <label style={{ fontWeight: 'bold', marginRight: '10px' }}>العملة:</label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: "border-box" }}
          >
            <option value="USD">دولار أمريكي ($)</option>
            <option value="TRY">ليرة تركية (₺)</option>
            <option value="SYP">ليرة سورية (ل.س)</option>
          </select>
        </div>

        {/* بداية قسم أزرار التنقل وعرض الشهر في لوحة الإدارة */}
        <div style={{ textAlign: 'center', marginBottom: 20, paddingTop: 10, borderTop: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>التنقل في التقويم</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 600, margin: 'auto' }}>
                <button onClick={handlePrevMonth} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #007bff', backgroundColor: '#e0f2ff', color: '#007bff', cursor: 'pointer', fontSize: '1em', fontWeight: 'bold' }}>الشهر السابق</button>
                <h3 style={{ margin: 0, color: '#333' }}>
                    {customArabicMonthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
                </h3>
                <button onClick={handleNextMonth} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #007bff', backgroundColor: '#e0f2ff', color: '#007bff', cursor: 'pointer', fontSize: '1em', fontWeight: 'bold' }}>الشهر التالي</button>
            </div>
        </div>
        {/* نهاية قسم أزرار التنقل وعرض الشهر في لوحة الإدارة */}


        {renderCalendar()}

        <h3 style={{ marginTop: 40, marginBottom: 20 }}>تسجيل حجز جديد</h3>

        {/* قائمة الأيام المختارة (غير المحفوظة) */}
        {selectedDays.length > 0 && (
          <div style={{ marginBottom: 20, padding: 15, border: "1px solid #ccc", borderRadius: 6, backgroundColor: '#f9f9f9' }}>
            <p style={{ fontWeight: 'bold' }}>الأيام المختارة للحجز:</p>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {selectedDays.sort((a, b) => new Date(a.date) - new Date(b.date)).map(({ date, periods }) => (
                <li key={date} style={{ marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #eee', paddingBottom: 5 }}>
                  <span>
                    {date} - {periods.join(", ")}
                    <span style={{ marginLeft: 15, fontWeight: 'bold', color: '#28a745' }}>
                      ({convertPrice(getBookingPrice(periods, 1, 0))} {selectedCurrency} لليوم)
                    </span>
                  </span>
                  <button
                    onClick={() => removeSelectedDay(date)}
                    style={{
                      marginLeft: 10,
                      color: "red",
                      cursor: "pointer",
                      border: "none",
                      background: "none",
                    }}
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
            <p style={{ fontWeight: 'bold', fontSize: '1.1em', marginTop: 15, textAlign: 'center' }}>
                السعر الأساسي الإجمالي للأيام المختارة: {convertPrice(getBookingPrice(selectedDays.flatMap(day => day.periods), selectedDays.length, 0))} {selectedCurrency}
            </p>
          </div>
        )}

        {/* نموذج بيانات العميل */}
        <div
          style={{
            marginBottom: 30,
            border: "1px solid #ccc",
            padding: 15,
            borderRadius: 6,
            backgroundColor: '#f9f9f9',
          }}
        >
          <label style={{ display: 'block', marginBottom: 10 }}>
            اسم العميل:
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", boxSizing: "border-box" }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 10 }}>
            رقم الهاتف:
            <input
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", boxSizing: "border-box" }}
            />
          </label>
          {/* حقل إدخال نسبة الخصم */}
          <label style={{ display: 'block', marginBottom: 10 }}>
            نسبة الخصم (%):
            <input
              type="number"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", boxSizing: "border-box" }}
            />
          </label>
          {/* حقل إدخال السعر الكلي للحجز، الآن يعكس الخصم تلقائيًا ويتم التعامل مع إدخال النص */}
          <label style={{ display: 'block', marginBottom: 10 }}>
            السعر الكلي للحجز ({selectedCurrency}):
            <input
              type="text" // تم التغيير إلى type="text"
              value={rawManualBookingPriceInput}
              onChange={(e) => {
                const inputValue = e.target.value;
                setRawManualBookingPriceInput(inputValue); // تخزين القيمة الخام المدخلة
                // إزالة أي فواصل أو أحرف غير رقمية قبل التحويل إلى رقم
                const cleanedValue = inputValue.replace(/[^0-9.]/g, '');
                const parsedValue = parseFloat(cleanedValue);

                if (!isNaN(parsedValue)) {
                    // تحديث السعر الأساسي بالدولار
                    setManualBookingPrice(parsedValue / exchangeRates[selectedCurrency]);
                } else if (inputValue === "") {
                    setManualBookingPrice(0); // إذا كان فارغاً، السعر 0
                }
                // لا نغير manualBookingPrice إذا كانت القيمة غير صالحة حتى لا نفقد القيمة السابقة
              }}
              onBlur={(e) => {
                // عند فقدان التركيز، قم بتنسيق القيمة النهائية للعرض
                const finalValueInUSD = manualBookingPrice;
                setRawManualBookingPriceInput(convertPrice(finalValueInUSD));
              }}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", boxSizing: "border-box" }}
            />
          </label>
          {errorMsg && (
            <p style={{ color: "red", fontWeight: "bold" }}>{errorMsg}</p>
          )}

          <button
            onClick={handleSaveBooking}
            disabled={selectedDays.length === 0 || !clientName.trim() || !clientPhone.trim() || manualBookingPrice <= 0}
            style={{
              backgroundColor:
                selectedDays.length === 0 || !clientName.trim() || !clientPhone.trim() || manualBookingPrice <= 0
                  ? "#ccc"
                  : "#4caf50",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: 6,
              cursor:
                selectedDays.length === 0 || !clientName.trim() || !clientPhone.trim() || manualBookingPrice <= 0
                  ? "not-allowed"
                  : "pointer",
              fontSize: '1em',
              fontWeight: 'bold',
            }}
          >
            حفظ الحجز الجديد
          </button>
        </div>

        <h3 style={{ marginTop: 40, marginBottom: 20, textAlign: 'center' }}>قائمة الحجوزات</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: 20 }}>
            <button
                onClick={() => setCurrentBookingListFilter('upcoming')}
                style={{ padding: '8px 15px', borderRadius: 5, border: '1px solid #ccc', cursor: 'pointer', backgroundColor: currentBookingListFilter === 'upcoming' ? '#2196f3' : 'white', color: currentBookingListFilter === 'upcoming' ? 'white' : 'black' }}
            >
                قادمة
            </button>
            <button
                onClick={() => setCurrentBookingListFilter('cancelled')}
                style={{ padding: '8px 15px', borderRadius: 5, border: '1px solid #ccc', cursor: 'pointer', backgroundColor: currentBookingListFilter === 'cancelled' ? '#f44336' : 'white', color: currentBookingListFilter === 'cancelled' ? 'white' : 'black' }}
            >
                ملغاة
            </button>
            <button
                onClick={() => setCurrentBookingListFilter('expired')}
                style={{ padding: '8px 15px', borderRadius: 5, border: '1px solid #ccc', cursor: 'pointer', backgroundColor: currentBookingListFilter === 'expired' ? '#607d8b' : 'white', color: currentBookingListFilter === 'expired' ? 'white' : 'black' }}
            >
                منقضية
            </button>
        </div>

        {filteredBookings.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>لا توجد حجوزات في هذه الفئة.</p>
        ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {filteredBookings.map((b) => (
                    <li key={b.id} style={{
                        border: "1px solid #eee",
                        padding: 10,
                        marginBottom: 10,
                        borderRadius: 8,
                        backgroundColor: '#fff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                        <div>
                            <strong>{b.clientName}</strong> - {b.clientPhone} ({b.period})
                            <br />
                            <small>تاريخ: {b.date}</small>
                            <br />
                            <small style={{ fontWeight: 'bold', color: '#28a745' }}>السعر: {convertPrice(b.price)} {selectedCurrency}</small>
                            {b.discount > 0 && <small style={{ color: 'green', marginLeft: '5px' }}>({b.discount}% حسم)</small>}
                            <br />
                            <small style={{ color: b.status === "active" ? "green" : "red" }}>
                                الحالة: {b.status === "active" ? "نشط" : "ملغى"}
                            </small>
                        </div>
                        <div>
                            <button
                                onClick={() => openEditBooking(b)}
                                style={{
                                    backgroundColor: "#ffc107",
                                    color: "white",
                                    border: "none",
                                    padding: "8px 15px",
                                    borderRadius: 5,
                                    cursor: "pointer",
                                    marginRight: 5
                                }}
                            >
                                تعديل
                            </button>
                            {b.clientPhone && ( // زر التواصل يظهر فقط إذا كان هناك رقم هاتف
                                <a
                                  href={getWhatsAppLink(b.clientPhone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    backgroundColor: "#25d366", // واتساب أخضر
                                    color: "white",
                                    border: "none",
                                    borderRadius: 5,
                                    padding: "8px 15px",
                                    cursor: "pointer",
                                    textDecoration: 'none',
                                    display: 'inline-block'
                                  }}
                                >
                                  تواصل
                                </a>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        )}
        <div style={{ textAlign: 'center', marginTop: 30 }}>
            <button
                onClick={() => setShowPriceEditModal(true)} // زر لفتح نافذة تعديل الأسعار
                style={{
                    backgroundColor: "#607d8b",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: '1em',
                    fontWeight: 'bold',
                    boxShadow: '0 3px 10px rgba(96,125,139,0.4)'
                }}
            >
                تعديل الأسعار
            </button>
        </div>
      </div>
    );
  }

  // --- مكون صفحة العميل (Customer View) ---
  function CustomerView() {
    return (
      <div style={{ maxWidth: 700, margin: "20px auto", direction: "rtl", fontFamily: "Arial, sans-serif" }}>
        <h2 style={{ textAlign: "center", marginBottom: 30 }}>أهلاً بك في مسبح الريحان!</h2>
        <p style={{ textAlign: 'center', color: '#666' }}>اضغط على أي يوم في التقويم لمعرفة حالة الحجز.</p>

        {/* جديد: اختيار العملة للعميل */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <label style={{ fontWeight: 'bold', marginRight: '10px' }}>العملة:</label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: "border-box" }}
          >
            <option value="USD">دولار أمريكي ($)</option>
            <option value="TRY">ليرة تركية (₺)</option>
            <option value="SYP">ليرة سورية (ل.س)</option>
          </select>
        </div>

        {/* بداية قسم أزرار التنقل وعرض الشهر في واجهة العميل */}
        <div style={{ textAlign: 'center', marginBottom: 20, paddingTop: 10, borderTop: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>التنقل في التقويم</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 600, margin: 'auto' }}>
                <button onClick={handlePrevMonth} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #007bff', backgroundColor: '#e0f2ff', color: '#007bff', cursor: 'pointer', fontSize: '1em', fontWeight: 'bold' }}>الشهر السابق</button>
                <h3 style={{ margin: 0, color: '#333' }}>
                    {customArabicMonthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
                </h3>
                <button onClick={handleNextMonth} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #007bff', backgroundColor: '#e0f2ff', color: '#007bff', cursor: 'pointer', fontSize: '1em', fontWeight: 'bold' }}>الشهر التالي</button>
            </div>
        </div>
        {/* نهاية قسم أزرار التنقل وعرض الشهر في واجهة العميل */}

        {renderCalendar()}

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button
            onClick={() => setShowContactModal(true)}
            style={{
              backgroundColor: "#25d366", // لون الواتساب
              color: "white",
              border: "none",
              padding: "15px 30px",
              borderRadius: 10,
              fontSize: "1.2em",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: '0 4px 10px rgba(37, 211, 102, 0.4)'
            }}
          >
            تواصل مع صاحب المسبح
          </button>
        </div>
      </div>
    );
  }

  // --- الواجهة الرئيسية (App) ---
  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "20px auto",
        fontFamily: "Arial, sans-serif",
        direction: "rtl",
        backgroundColor: '#f0f2f5',
        minHeight: '95vh',
        borderRadius: '15px',
        padding: '20px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.1)'
      }}
    >
      <h1 style={{ textAlign: "center", color: '#2c3e50', marginBottom: 30 }}>نظام حجز مسبح الريحان</h1>

      {/* أزرار التبديل بين واجهة الإدارة والعميل */}
      <div style={{ textAlign: "center", marginBottom: 30, display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <button
          onClick={() => {
            setCurrentInterface("customer");
            setIsAdminLoggedIn(false); // التأكد من تسجيل الخروج من الإدارة عند التبديل
          }}
          style={{
            padding: "12px 25px",
            backgroundColor: currentInterface === "customer" ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: "1em",
            fontWeight: "bold",
            transition: 'background-color 0.3s ease',
            boxShadow: currentInterface === "customer" ? '0 3px 10px rgba(0,123,255,0.4)' : 'none'
          }}
        >
          واجهة العميل
        </button>
        <button
          onClick={() => {
            setCurrentInterface("admin");
            setIsAdminLoggedIn(false); // عند التبديل للإدارة، اطلب تسجيل الدخول مرة أخرى
          }}
          style={{
            padding: "12px 25px",
            backgroundColor: currentInterface === "admin" ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: "1em",
            fontWeight: "bold",
            transition: 'background-color 0.3s ease',
            boxShadow: currentInterface === "admin" ? '0 3px 10px rgba(0,123,255,0.4)' : 'none'
          }}
        >
          واجهة الإدارة
        </button>
      </div>

      {/* عرض الواجهة المختارة */}
      {currentInterface === "admin" ? (
        isAdminLoggedIn ? (
          <AdminPanel />
        ) : (
          <AdminLoginModal
            onLoginSuccess={() => setIsAdminLoggedIn(true)}
            onClose={() => setCurrentInterface("customer")} // العودة إلى واجهة العميل عند الإلغاء
          />
        )
      ) : (
        <CustomerView />
      )}

      {/* نوافذ الحجز (تظهر حسب الحاجة) */}
      {selectPeriodDate && currentInterface === "admin" && (
        <PeriodPickerModal
          date={selectPeriodDate}
          onSave={savePeriodForDate}
          onCancel={() => setSelectPeriodDate(null)}
        />
      )}

      {viewingDate && currentInterface === "admin" && (
        <BookingDetailsModal date={viewingDate} onClose={viewingDate === null ? undefined : closeViewing} />
      )}

      {editingBooking && currentInterface === "admin" && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSave={saveEditBooking}
        />
      )}

      {showContactModal && currentInterface === "customer" && (
        <ContactOwnerModal onClose={() => setShowContactModal(false)} />
      )}

      {/* جديد: نافذة تعديل الأسعار */}
      {showPriceEditModal && currentInterface === "admin" && (
        <PriceEditModal
          currentPrices={prices}
          onSave={(newPrices) => setPrices(newPrices)}
          onClose={() => setShowPriceEditModal(false)}
          exchangeRates={exchangeRates} // تمرير أسعار الصرف
          selectedCurrency={selectedCurrency} // تمرير العملة المختارة
        />
      )}
    </div>
  );
}
