
# نظام حجوزات المسبح - Pool Booking System

تطبيق React + Firebase لإدارة حجوزات المسبح مع تقويم تفاعلي وتحديثات فورية.

---

## 🚀 التشغيل السريع

```bash
npm install
````

أنشئ ملف `.env` من المثال:

* **Windows:** `copy .env.example .env`
* **macOS / Linux:** `cp .env.example .env`

ثم املأ القيم من Firebase:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_ADMIN_EMAIL=admin@example.com
```

تشغيل المشروع:

```bash
npm run dev
```

---

## 🔥 إعداد Firebase (مهم جدًا)

1. ادخل إلى Firebase Console
2. أنشئ مشروع جديد
3. فعّل الخدمات التالية:

### ✅ Firestore Database

* Create Database
* لا تستخدم Test Mode في الإنتاج.

### ✅ Authentication

* فعّل:
  * Email / Password

---

## 👤 حساب المشرف (Admin)

أنشئ المستخدم من:

`Authentication → Users`

الحساب الإداري المستخدم في التطبيق والقواعد هو:

```text
admin@example.com
```

يجب أن يتطابق البريد مع قيمة `VITE_ADMIN_EMAIL` وقواعد Firestore.

> كلمة المرور لا تُخزن في التطبيق أو Firestore؛ تتم مصادقة المستخدم بواسطة Firebase Authentication.

---

## 🔐 قواعد الأمان (Firestore Rules)

القواعد الحالية تمنع الوصول العام إلى بيانات الحجوزات، وتسمح بالوصول العام فقط إلى البيانات اللازمة للواجهة العامة مثل حالة الفترات والإعدادات العامة. عمليات إنشاء/تعديل/حذف بيانات الإدارة تتطلب الحساب الإداري.

لتطبيق القواعد:

```bash
firebase deploy --only firestore:rules
```

---

## 📅 الميزات

### 🗓️ التقويم

* عرض شهري
* كل يوم يحتوي:
  * صباحي
  * مسائي
* منع الحجز المكرر عبر Transaction
* تلوين:
  * متاح
  * محجوز
  * محدد

### ➕ نظام الحجز

* اسم العميل
* رقم الهاتف
* ملاحظات
* اختيار الأيام والفترات
* حساب السعر تلقائي

### 💰 نظام الأسعار

* صباحي
* مسائي
* كامل
* أسعار خاصة للأيام المميزة
* قابل للتعديل من لوحة الإدارة

### 📊 لوحة التحكم (Admin Dashboard)

* عدد الحجوزات
* إجمالي الإيرادات
* عرض قائمة الحجوزات
* تحديث فوري (Realtime)

### 🔔 ميزات إضافية

* Firebase Authentication
* Realtime Firestore
* زر واتساب للحجز
* تصميم RTL عربي
* Responsive (موبايل + كمبيوتر)

---

## 🧠 هيكل قاعدة البيانات

```text
bookings/{bookingId}
  - clientName
  - phone
  - dates
  - period
  - price
  - deposit
  - notes
  - slotKeys
  - pricingSummary
  - currency
  - createdAt
  - updatedAt

bookingSlots/{date-period}
  - bookingId
  - date
  - period
  - updatedAt

settings/pricing
  - standardPrices
  - featuredPrices
  - featuredWeekdays
  - featuredDates
  - currency
```

### 🔒 ملاحظة أمنية

لا تعتمد على إخفاء لوحة الإدارة في الواجهة كوسيلة حماية. صلاحيات Firestore هي طبقة الحماية الأساسية، بينما فحص البريد في الواجهة يحسن تجربة المستخدم ويمنع الدخول غير المصرح به إلى شاشة الإدارة.
