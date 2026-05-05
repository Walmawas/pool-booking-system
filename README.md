# مجوهرات جود - Joud Jewelry

تطبيق React + Firebase لإدارة وعرض منتجات الذهب مع تحديثات لحظية للأسعار.

## التشغيل السريع

```bash
npm install
```

أنشئ ملف `.env` من المثال:

- **Windows:** `copy .env.example .env`
- **macOS / Linux:** `cp .env.example .env`

املأ `.env` بقيم مشروعك من [Firebase Console](https://console.firebase.google.com) → Project settings → Your apps.

```bash
npm run dev
```

## إعداد Firebase (مطلوب ليعمل التطبيق بالكامل)

1. **إنشاء مشروع** وتمكين **Cloud Firestore**.
2. **Authentication** → تفعيل طريقة **Email/Password**.
3. إنشاء مستخدم مشرف بنفس البريد الموجود في `VITE_ADMIN_EMAIL` داخل `.env` (القيمة الافتراضية في المثال: `admin@joud.local`). يمكنك تغيير البريد، لكن يجب أن يتطابق مع:
   - الملف `firestore.rules` (دالة `isAllowedAdmin` → مقارنة `request.auth.token.email`)
   - المتغير `VITE_ADMIN_EMAIL` في `.env`
4. نشر قواعد الأمان:

```bash
firebase deploy --only firestore:rules
```

(يتطلب تثبيت [Firebase CLI](https://firebase.google.com/docs/cli) وربط المشروع بـ `firebase login` و`firebase use`.)

القواعد الافتراضية في المستودع تسمح بـ **قراءة عامة** للمنتجات والإعدادات، و**الكتابة** فقط لحساب المشرف المعرّف في `firestore.rules`.

## المزايا

- عرض المنتجات مباشرة من Firestore مع تحديث فوري.
- لوحة إدارة بتسجيل دخول **Firebase (بريد + كلمة مرور)** وليس كلمة مرور داخل الحزمة.
- فلترة حسب التصنيف + تبديل عملة USD/SYP مع تذكّر الاختيار في المتصفح.
- زر واتساب تلقائي لكل منتج.
- Lazy loading للصور + Skeleton loading.
- التحقق من متغيرات البيئة عند التشغيل ورسالة واضحة إن نقص شيء.

## البناء للإنتاج

```bash
npm run build
```

ثم ارفع مجلد `dist` إلى أي استضافة ثابتة (مثل Firebase Hosting).
