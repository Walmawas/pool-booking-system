# نظام حجز مسبح الريحان - Pool Booking System

تطبيق ويب خفيف لحجز فترات مسبح الريحان، مبني على JavaScript + Firebase مع واجهة عربية RTL، رزنامة عامة، لوحة إدارة، إدارة الأسعار، ومنع تعارض الحجوزات.

## التشغيل

```bash
npm install
npm run dev
```

المشروع يستخدم `index.html` كواجهة الاستضافة و`main.js` كتطبيق المتصفح الرئيسي.

## Firebase

فعّل:

- Firestore Database
- Authentication → Email / Password
- Firebase Hosting عند النشر عبر Firebase

لا تستخدم Test Mode في الإنتاج.

## حساب المدير

أنشئ حساب المدير من Firebase Authentication → Users.

البريد المسموح به مضبوط حاليًا في `firebase-config.js` ويجب أن يطابق البريد الموجود في `firestore.rules`. كلمة المرور لا تُحفظ في Git ولا داخل ملفات المشروع.

## الأمان

قواعد Firestore هي طبقة التفويض الأساسية. فحص البريد في الواجهة ليس بديلاً عن القواعد.

```bash
firebase deploy --only firestore:rules
```

بيانات `bookings` خاصة بالمدير، بينما `bookingSlots` تعرض فقط حالة التوفر اللازمة للواجهة العامة.

## بنية البيانات

```text
settings/pricing
bookings/{bookingId}
bookingSlots/{date_period}
```

## ملاحظة حول النسخة السابقة

كان المشروع يحتوي على أكثر من تطبيق تقويم مستقل يتم تحميله من `firebase-config.js`. هذا كان يسبب عدة Firebase listeners ومنافسة على نفس عناصر DOM. تم توحيد التشغيل بحيث يكون `main.js` هو التطبيق الوحيد المسؤول عن التقويم والحجوزات، وإزالة ملفات التقويم القديمة غير المستخدمة.

## Codex Plugin

يحتوي المشروع على Plugin خاص بـ Codex ضمن:

```text
.agents/plugins/marketplace.json
.agents/plugins/plugins/pool-booking/
```

## قواعد التطوير

- حافظ على RTL والعربية.
- لا تضع كلمات مرور أو tokens في Git.
- لا تضعف Firestore Rules لحل مشكلة في الواجهة.
- لا تضف Firebase listeners مكررة لنفس البيانات.
- اختبر منع تعارض الحجز عند الإنشاء والتعديل.
- شغّل `npm run build` بعد أي تعديل برمجي مهم إذا كان إعداد Vite مستخدماً في بيئة البناء.
