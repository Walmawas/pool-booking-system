# نظام مجوهرات جود - Joud Jewelry

تطبيق React + Firebase لعرض وإدارة منتجات المجوهرات مع أسعار الذهب وتحديثات لحظية.

---

## 🚀 التشغيل السريع

```bash
npm install
```

أنشئ ملف `.env` من المثال:

* **Windows:** `copy .env.example .env`
* **macOS / Linux:** `cp .env.example .env`

ثم املأ قيم Firebase من إعدادات المشروع.

تشغيل المشروع:

```bash
npm run dev
```

## 🔥 إعداد Firebase

فعّل في Firebase:

- Firestore Database
- Authentication → Email / Password

لا تستخدم Test Mode في الإنتاج.

## 👤 حساب المشرف

أنشئ حساب المشرف من Firebase Authentication → Users.

يجب أن تكون قيمة `VITE_ADMIN_EMAIL` مطابقة لبريد الحساب المسموح به في `firestore.rules`. كلمة المرور لا تُخزّن في التطبيق أو في ملفات الإعدادات المرفوعة إلى Git.

القيمة المستخدمة حالياً في القواعد:

```text
admin@pool.local
```

## 🔐 قواعد الأمان

Firestore Rules هي طبقة الحماية الأساسية. فحص البريد في الواجهة مخصص لتحسين تجربة المستخدم وليس بديلاً عن قواعد Firestore.

لتطبيق القواعد:

```bash
firebase deploy --only firestore:rules
```

بيانات الحجوزات خاصة بالمشرف، بينما بيانات التوفر العامة يجب أن تعرض الحد الأدنى المطلوب للواجهة العامة.

## 📦 بنية البيانات الحالية

```text
products/{productId}
media/{mediaId}
settings/{docId}
bookings/{bookingId}
bookingSlots/{date-period}
```

## 🧩 Codex Plugin

يحتوي المشروع أيضاً على Plugin خاص بـ Codex ضمن:

```text
.agents/plugins/marketplace.json
.agents/plugins/plugins/pool-booking/
```

وهو مخصص لمراجعة وتطوير المشروع، خصوصاً الأمن، Firebase، الأداء، الواجهات، والاختبارات.

## 📋 ملاحظات التطوير

- حافظ على RTL العربية.
- لا تضع كلمات مرور أو tokens في Git.
- لا تضعف Firestore Rules لحل مشكلة في الواجهة.
- افحص تأثير أي تعديل على Firebase reads/listeners قبل دمجه.
- شغّل `npm run build` بعد التعديلات البرمجية المهمة.
