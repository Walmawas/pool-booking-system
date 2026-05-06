
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
* Start in test mode

### ✅ Authentication

* فعّل:

  * Email / Password

---

## 👤 حساب المشرف (Admin)

* أنشئ مستخدم من:
  Authentication → Users

مثال:

```
Email: admin@example.com
Password: 12345678
```

⚠️ مهم:
يجب أن يتطابق مع:

* `VITE_ADMIN_EMAIL` داخل `.env`
* قواعد Firestore

---

## 🔐 قواعد الأمان (Firestore Rules)

استبدل القواعد بـ:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
             request.auth.token.email == "admin@example.com";
    }

    match /bookings/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

ثم نفّذ:

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
* منع الحجز المكرر
* تلوين:

  * متاح
  * محجوز
  * محدد

---

### ➕ نظام الحجز

* اسم العميل
* رقم الهاتف
* ملاحظات
* اختيار الأيام والفترات
* حساب السعر تلقائي

---

### 💰 نظام الأسعار

* صباحي
* مسائي
* كامل
* قابل للتعديل

---

### 📊 لوحة التحكم (Admin Dashboard)

* عدد الحجوزات
* إجمالي الإيرادات
* عرض قائمة الحجوزات
* تحديث فوري (Realtime)

---

### 🔔 ميزات إضافية

* Firebase Authentication
* Realtime Firestore
* إشعارات (اختياري)
* زر واتساب للحجز
* تصميم RTL عربي
* Responsive (موبايل + كمبيوتر)

---

## 🧠 هيكل قاعدة البيانات

```json
bookings: {
  id: {
    clientName: "string",
    phone: "string",
    dates: ["2026-5-10-صباحي"],
    period: "صباحي",
    price: 100,
    notes: "string",
    createdAt: timestamp
  }
}
```

---

## 🧪 التطوير

```bash
npm run dev
```

---

## 🏗️ البناء للإنتاج

```bash
npm run build
```

الناتج سيكون داخل:

```
dist/
```

---

## 🌍 النشر

يمكنك النشر على:

### 🚀 Vercel

* Import من GitHub
* Build: `npm run build`
* Output: `dist`

---

### 🔥 Firebase Hosting

```bash
firebase deploy
```

---

## 📱 التكامل مع تطبيق الجوال

هذا المشروع مرتبط بـ:

* تطبيق React Native (Expo)
* نفس Firebase

👉 يعني:
✔ نفس الحجوزات
✔ نفس البيانات
✔ تحديث فوري بين الموقع والتطبيق

---

## 💡 ملاحظات مهمة

* لا ترفع ملف `.env` إلى GitHub
* تأكد من حماية Firestore قبل الإنتاج
* استخدم أسعار حقيقية من لوحة التحكم لاحقًا

---

## 🔥 مستقبل المشروع

يمكن تطويره ليشمل:

* 💳 دفع إلكتروني
* 📲 إشعارات واتساب تلقائية
* 🏊‍♂️ إدارة عدة مسابح
* 🌐 موقع عام للعملاء + لوحة خاصة للإدارة

---

## 👨‍💻 المطور

تم تطويره كنظام حجوزات احترافي قابل للتوسع التجاري.

```

---

# 💥 ماذا فعلنا الآن؟

✔ حولنا المشروع من متجر ذهب ❌  
✔ إلى نظام حجوزات احترافي ✔  
✔ متوافق مع Firebase ✔  
✔ جاهز للنشر ✔  

---

## 🔥 الخطوة التالية (أنصحك بها)

هل تريد أضيف لك داخل المشروع:

### 1️⃣ نظام واتساب تلقائي حقيقي (API وليس فقط رابط)  
### 2️⃣ نظام دفع Stripe 💳  
### 3️⃣ تعدد مسابح (تحول المشروع إلى منصة)
