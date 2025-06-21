// src/Calendar.js
import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
import BookingForm from "./BookingForm"; // استيراد BookingForm

const Calendar = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null); // للحجز الذي يتم تعديله

  // دالة لجلب الحجوزات
  const fetchBookings = async () => {
    const bookingsRef = collection(db, "bookings");
    try {
      const bookingSnapshot = await getDocs(bookingsRef);
      const bookingList = bookingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // تحويل تاريخ Firebase إلى كائن Date
        date: new Date(doc.data().date + 'T00:00:00'), // إضافة جزء الوقت لتجنب مشاكل المنطقة الزمنية
      }));
      setBookings(bookingList);
    } catch (error) {
      console.error("خطأ في جلب الحجوزات: ", error);
    }
  };

  useEffect(() => {
    fetchBookings(); // جلب الحجوزات عند تحميل المكون
  }, []);

  // جلب الحجوزات مرة أخرى عند نجاح عملية الحجز
  const handleBookingSuccess = () => {
    setShowBookingForm(false);
    fetchBookings();
    setEditingBooking(null); // مسح أي حجز كان يتم تعديله
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setShowBookingForm(true); // إظهار نموذج الحجز عند النقر على اليوم
    setEditingBooking(null); // التأكد من عدم وجود حجز قيد التعديل
  };

  // منطق التقويم
  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 للأحد، 1 للإثنين، إلخ.

  // إنشاء مصفوفة لخلايا التقويم، بما في ذلك الحشو لبداية الأسبوع
  const calendarCells = Array(firstDayOfMonth).fill(null).concat(daysInMonth);

  const goToPreviousMonth = () => {
    setCurrentMonth(prevMonth => new Date(prevMonth.getFullYear(), prevMonth.getMonth() - 1, 1));
    setSelectedDate(null); // إلغاء تحديد التاريخ عند تغيير الشهر
    setShowBookingForm(false);
  };

  const goToNextMonth = () => {
    setCurrentMonth(prevMonth => new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1));
    setSelectedDate(null); // إلغاء تحديد التاريخ عند تغيير الشهر
    setShowBookingForm(false);
  };

  // دالة لتجميع الحجوزات حسب التاريخ لتسهيل البحث
  const getBookingsForDate = (date) => {
    if (!date) return [];
    const dateString = date.toISOString().split('T')[0];
    return bookings.filter(booking => booking.date.toISOString().split('T')[0] === dateString);
  };

  const handleDeleteBooking = async (bookingId) => {
    if (window.confirm("هل أنت متأكد أنك تريد حذف هذا الحجز؟")) {
      try {
        await deleteDoc(doc(db, "bookings", bookingId));
        alert("تم حذف الحجز بنجاح!");
        fetchBookings(); // إعادة جلب الحجوزات بعد الحذف
      } catch (error) {
        console.error("خطأ في حذف الحجز: ", error);
        alert("فشل حذف الحجز. الرجاء المحاولة مرة أخرى.");
      }
    }
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setSelectedDate(booking.date); // تحديد تاريخ الحجز الذي يتم تعديله
    setShowBookingForm(true); // إظهار النموذج للتعديل
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '20px auto', padding: '20px', border: '1px solid #eee', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '25px' }}>نظام حجز المسبح</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={goToPreviousMonth} style={{ padding: '10px 15px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', fontSize: '1em' }}>الشهر السابق</button>
        <h3 style={{ margin: '0', color: '#555' }}>{currentMonth.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={goToNextMonth} style={{ padding: '10px 15px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', fontSize: '1em' }}>الشهر التالي</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
              <th key={day} style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center', color: '#666' }}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* تقسيم الخلايا إلى صفوف كل 7 أيام */}
          {Array(Math.ceil(calendarCells.length / 7)).fill(null).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {calendarCells.slice(rowIndex * 7, (rowIndex + 1) * 7).map((day, colIndex) => {
                const isToday = day && day.toDateString() === new Date().toDateString();
                const isSelected = selectedDate && day && day.toDateString() === selectedDate.toDateString();
                const dailyBookings = day ? getBookingsForDate(day) : [];

                return (
                  <td
                    key={colIndex}
                    onClick={() => day && handleDayClick(day)}
                    style={{
                      padding: '15px',
                      border: '1px solid #eee',
                      textAlign: 'center',
                      height: '100px',
                      verticalAlign: 'top',
                      cursor: day ? 'pointer' : 'default',
                      backgroundColor: isSelected ? '#e6f7ff' : (isToday ? '#ffe6e6' : (day ? '#fff' : '#f8f8f8')),
                      color: day ? '#333' : '#bbb',
                      fontWeight: isToday ? 'bold' : 'normal',
                      position: 'relative', // للسماح بوضع معلومات الحجز بشكل مطلق
                    }}
                  >
                    {day && (
                      <>
                        <div style={{ fontSize: '1.2em', marginBottom: '5px' }}>{day.getDate()}</div>
                        {dailyBookings.length > 0 && (
                          <div style={{ fontSize: '0.8em', color: '#007bff', marginTop: '5px', fontWeight: 'bold' }}>
                            {dailyBookings.length} حجوزات
                            {/* يمكنك عرض تفاصيل الحجوزات هنا أو في مكون BookingDetails */}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {selectedDate && (
        <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fdfdfd' }}>
          <h3 style={{ textAlign: 'center', color: '#333' }}>الحجوزات ليوم {selectedDate.toDateString()}</h3>
          {getBookingsForDate(selectedDate).length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>لا توجد حجوزات لهذا اليوم.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {getBookingsForDate(selectedDate).map(booking => (
                <li key={booking.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px dashed #eee',
                  fontSize: '0.95em'
                }}>
                  <div>
                    <strong>{booking.clientName}</strong> - {booking.clientPhone}
                    <br />
                    <span style={{ color: '#555' }}>الوقت: {booking.timeSlot}</span>
                  </div>
                  <div>
                    <button
                      onClick={() => handleEditBooking(booking)}
                      style={{
                        marginLeft: '10px',
                        padding: '6px 12px',
                        backgroundColor: '#ffc107',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85em'
                      }}
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteBooking(booking.id)}
                      style={{
                        marginLeft: '10px',
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85em'
                      }}
                    >
                      حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {showBookingForm && (
              <BookingForm
                  date={selectedDate}
                  onBookingSuccess={handleBookingSuccess}
              />
          )}
        </div>
      )}
    </div>
  );
};

export default Calendar;