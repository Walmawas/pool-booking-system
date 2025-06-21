// src/BookingForm.js
import React, { useState } from "react";
import { db } from "./firebase"; // استيراد اتصالنا بـ Firebase
import { collection, addDoc } from "firebase/firestore";

const BookingForm = ({ date, onBookingSuccess }) => {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [timeSlot, setTimeSlot] = useState(""); // جديد: لفتحة الوقت
  const [loading, setLoading] = useState(false); // جديد: لحالة التحميل
  const [error, setError] = useState(null); // جديد: للتعامل مع الأخطاء

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null); // مسح الأخطاء السابقة

    // التحقق من صحة الإدخال الأساسية
    if (!clientName || !clientPhone || !timeSlot) {
        setError("الرجاء ملء جميع الحقول.");
        setLoading(false);
        return;
    }

    try {
      // إضافة مستند جديد إلى مجموعة "bookings" (الحجوزات)
      await addDoc(collection(db, "bookings"), {
        date: date.toISOString().split('T')[0], // تخزين التاريخ كسلسلة YYYY-MM-DD
        timeSlot,
        clientName,
        clientPhone,
        createdAt: new Date(), // جديد: طابع زمني للفرز
      });
      setClientName("");
      setClientPhone("");
      setTimeSlot("");
      alert("تم حفظ الحجز بنجاح!"); // رد فعل أساسي
      if (onBookingSuccess) {
        onBookingSuccess(); // إعلام المكون الأصلي بتحديث الحجوزات
      }
    } catch (err) {
      console.error("خطأ في إضافة المستند: ", err);
      setError("فشل حفظ الحجز. الرجاء المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  // فتحات زمنية للمسبح (يمكنك تعديلها)
  const availableTimeSlots = ["9:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM", "1:00 PM - 2:00 PM", "2:00 PM - 3:00 PM", "3:00 PM - 4:00 PM"];

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', margin: '20px auto', maxWidth: '400px', backgroundColor: '#f9f9f9' }}>
      <h3 style={{ textAlign: 'center', color: '#333' }}>حجز ليوم {date ? date.toDateString() : "التاريخ المحدد"}</h3>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          اسم العميل:
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </label>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          رقم الهاتف:
          <input
            type="text"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </label>
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          الفتحة الزمنية:
          <select
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">اختر وقتًا</option>
            {availableTimeSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px 15px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? "جاري الحفظ..." : "حفظ الحجز"}
      </button>
    </form>
  );
};

export default BookingForm;