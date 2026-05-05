import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseBootstrap } from '../firebase';
import { defaultSettings, useRealtimeData } from '../hooks/useRealtimeData';
import MediaManager from '../components/MediaManager';

const emptyForm = {
  name: '',
  weight: '',
  carat: '21',
  laborCost: '',
  category: 'new',
  image: ''
};

const createSettingsForm = (settings = defaultSettings) => ({
  goldPrices: {
    '18': String(settings.goldPrices?.['18'] ?? ''),
    '21': String(settings.goldPrices?.['21'] ?? ''),
    '24': String(settings.goldPrices?.['24'] ?? '')
  },
  usdToSyp: String(settings.usdToSyp ?? '')
});

const mapProductToForm = (product) => ({
  name: product.name ?? '',
  weight: String(product.weight ?? ''),
  carat: String(product.carat ?? '21'),
  laborCost: String(product.laborCost ?? ''),
  category: product.category ?? 'new',
  image: product.image ?? ''
});

const expectedAdminEmail = () => (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();

const isAdminUser = (user) => {
  if (!user?.email) {
    return false;
  }
  const expected = expectedAdminEmail();
  if (!expected) {
    return false;
  }
  return user.email.toLowerCase() === expected;
};

const AdminPage = () => {
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginEmail, setLoginEmail] = useState(() => (import.meta.env.VITE_ADMIN_EMAIL || '').trim());
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [settingsForm, setSettingsForm] = useState(createSettingsForm());
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { products, settings, error } = useRealtimeData();

  useEffect(() => {
    if (!firebaseBootstrap.ok || !auth) {
      setAuthReady(true);
      return undefined;
    }

    return onAuthStateChanged(auth, async (user) => {
      if (user && !isAdminUser(user)) {
        setLoginError('هذا الحساب غير مصرح له بالدخول إلى لوحة الإدارة.');
        try {
          await signOut(auth);
        } catch (e) {
          console.error(e);
        }
        setAuthUser(null);
        setAuthReady(true);
        return;
      }

      setAuthUser(user);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    setSettingsForm(createSettingsForm(settings));
  }, [settings]);

  const resetEditor = useCallback(() => {
    setForm(emptyForm);
    setEditingId('');
  }, []);

  const login = useCallback(async () => {
    if (!auth) {
      setLoginError('Firebase غير مهيأ.');
      return;
    }

    const email = loginEmail.trim();
    const password = loginPassword;

    if (!email || !password) {
      setLoginError('أدخل البريد وكلمة المرور.');
      return;
    }

    if (!expectedAdminEmail()) {
      setLoginError('اضبط المتغير VITE_ADMIN_EMAIL في ملف .env ليطابق بريد المشرف في Firebase.');
      return;
    }

    if (email.toLowerCase() !== expectedAdminEmail()) {
      setLoginError('البريد لا يطابق VITE_ADMIN_EMAIL وقواعد Firestore.');
      return;
    }

    setLoginSubmitting(true);
    setLoginError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoginPassword('');
    } catch (e) {
      console.error(e);
      const code = e?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setLoginError('البريد أو كلمة المرور غير صحيحة.');
      } else if (code === 'auth/too-many-requests') {
        setLoginError('محاولات كثيرة. حاول لاحقًا.');
      } else {
        setLoginError('تعذر تسجيل الدخول. تحقق من تفعيل Email/Password في Firebase.');
      }
    } finally {
      setLoginSubmitting(false);
    }
  }, [loginEmail, loginPassword, auth]);

  const logout = useCallback(async () => {
    if (!auth) {
      return;
    }
    try {
      await signOut(auth);
      setFeedback(null);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const requireWriteSession = useCallback(() => {
    if (!db || !auth?.currentUser || !isAdminUser(auth.currentUser)) {
      setFeedback({ type: 'error', text: 'انتهت الجلسة. سجّل الدخول مجددًا.' });
      return false;
    }
    return true;
  }, []);

  const upsertProduct = useCallback(async () => {
    if (!requireWriteSession()) {
      return;
    }

    const normalizedName = form.name.trim();
    const normalizedImage = form.image.trim();
    const weight = Number(form.weight);
    const laborCost = Number(form.laborCost || 0);
    const caratNum = Number(form.carat);

    if (!normalizedName || Number.isNaN(weight) || weight <= 0) {
      setFeedback({ type: 'error', text: 'أدخل اسمًا ووزنًا صالحين قبل الحفظ.' });
      return;
    }

    if (!['18', '21', '24'].includes(String(form.carat))) {
      setFeedback({ type: 'error', text: 'اختر عيارًا صالحًا (18 أو 21 أو 24).' });
      return;
    }

    if (Number.isNaN(laborCost) || laborCost < 0) {
      setFeedback({ type: 'error', text: 'أجرة الصياغة يجب أن تكون رقمًا صالحًا.' });
      return;
    }

    const payload = {
      name: normalizedName,
      weight,
      carat: caratNum,
      laborCost,
      category: form.category,
      image: normalizedImage
    };

    setSubmitting(true);
    setFeedback(null);

    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), payload);
        setFeedback({ type: 'success', text: 'تم تحديث المنتج بنجاح.' });
      } else {
        await setDoc(doc(db, 'products', crypto.randomUUID()), {
          ...payload,
          isSold: false,
          createdAt: Date.now()
        });
        setFeedback({ type: 'success', text: 'تمت إضافة المنتج بنجاح.' });
      }

      resetEditor();
    } catch (saveError) {
      console.error(saveError);
      setFeedback({ type: 'error', text: 'تعذر حفظ المنتج. تحقق من الصلاحيات في قواعد Firestore.' });
    } finally {
      setSubmitting(false);
    }
  }, [editingId, form, resetEditor, requireWriteSession]);

  const saveSettings = useCallback(async () => {
    if (!requireWriteSession()) {
      return;
    }

    const nextSettings = {
      goldPrices: {
        '18': Number(settingsForm.goldPrices['18'] || 0),
        '21': Number(settingsForm.goldPrices['21'] || 0),
        '24': Number(settingsForm.goldPrices['24'] || 0)
      },
      usdToSyp: Number(settingsForm.usdToSyp || 0)
    };

    if (Object.values(nextSettings.goldPrices).some((value) => Number.isNaN(value)) || Number.isNaN(nextSettings.usdToSyp)) {
      setFeedback({ type: 'error', text: 'تأكد من أن جميع الأسعار أرقام صالحة.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await setDoc(doc(db, 'settings', 'global'), nextSettings, { merge: true });
      setFeedback({ type: 'success', text: 'تم تحديث الأسعار العامة.' });
    } catch (settingsError) {
      console.error(settingsError);
      setFeedback({ type: 'error', text: 'تعذر تحديث الأسعار العامة.' });
    } finally {
      setSubmitting(false);
    }
  }, [settingsForm, requireWriteSession]);

  const toggleSold = useCallback(async (product) => {
    if (!requireWriteSession()) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await updateDoc(doc(db, 'products', product.id), { isSold: !product.isSold });
      setFeedback({
        type: 'success',
        text: product.isSold ? 'أُعيد المنتج إلى المعروض.' : 'تم تعليم المنتج كمباع.'
      });
    } catch (toggleError) {
      console.error(toggleError);
      setFeedback({ type: 'error', text: 'تعذر تحديث حالة البيع.' });
    } finally {
      setSubmitting(false);
    }
  }, [requireWriteSession]);

  const removeProduct = useCallback(async (productId) => {
    if (!requireWriteSession()) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await deleteDoc(doc(db, 'products', productId));

      if (editingId === productId) {
        resetEditor();
      }

      setFeedback({ type: 'success', text: 'تم حذف المنتج.' });
    } catch (deleteError) {
      console.error(deleteError);
      setFeedback({ type: 'error', text: 'تعذر حذف المنتج.' });
    } finally {
      setSubmitting(false);
    }
  }, [editingId, resetEditor, requireWriteSession]);

  const soldCount = useMemo(() => products.filter((item) => item.isSold).length, [products]);

  if (!firebaseBootstrap.ok || !db || !auth) {
    return (
      <section className="mx-auto mt-8 max-w-md rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
        إعداد Firebase غير مكتمل. راجع المتغيرات في ملف .env.
      </section>
    );
  }

  if (!expectedAdminEmail()) {
    return (
      <section className="mx-auto mt-8 max-w-md rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-100">
        <p className="font-semibold text-amber-200">تعيين بريد المشرف</p>
        <p className="mt-2 text-slate-200">
          أضف <code className="rounded bg-slate-950 px-1">VITE_ADMIN_EMAIL</code> إلى{' '}
          <code className="rounded bg-slate-950 px-1">.env</code> بنفس البريد المصرح به في{' '}
          <code className="rounded bg-slate-950 px-1">firestore.rules</code>، ثم أنشئ مستخدمًا بهذا البريد في Firebase
          Authentication (Email/Password).
        </p>
      </section>
    );
  }

  if (!authReady) {
    return (
      <section className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-8 text-center text-slate-300">
        جاري التحقق من الجلسة…
      </section>
    );
  }

  if (!authUser) {
    return (
      <section className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-6 text-white">
        <h2 className="text-xl font-bold text-gold-300">دخول الإدارة</h2>
        <p className="mt-2 text-sm text-slate-400">سجّل الدخول بحساب المشرف في Firebase (البريد وكلمة المرور).</p>
        <input
          type="email"
          dir="ltr"
          value={loginEmail}
          onChange={(event) => {
            setLoginEmail(event.target.value);
            setLoginError('');
          }}
          className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
          placeholder="البريد الإلكتروني"
          autoComplete="username"
        />
        <input
          type="password"
          dir="ltr"
          value={loginPassword}
          onChange={(event) => {
            setLoginPassword(event.target.value);
            setLoginError('');
          }}
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
          placeholder="كلمة المرور"
          autoComplete="current-password"
        />
        {loginError && <p className="mt-3 text-sm text-rose-300">{loginError}</p>}
        <button
          type="button"
          onClick={login}
          disabled={loginSubmitting}
          className="mt-4 w-full rounded-lg bg-gold-500 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loginSubmitting ? 'جاري الدخول…' : 'دخول'}
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-8 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
        <span dir="ltr">{authUser.email}</span>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-slate-600 px-4 py-2 text-slate-100 hover:bg-slate-800"
        >
          تسجيل الخروج
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            feedback.type === 'error'
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-white">
        <h2 className="text-xl font-bold text-gold-300">إضافة / تعديل منتج</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            ['name', 'الاسم'],
            ['weight', 'الوزن'],
            ['laborCost', 'أجرة الصياغة'],
            ['image', 'رابط الصورة (يفضّل رابطًا وليس Base64)']
          ].map(([field, label]) => (
            <input
              key={field}
              value={form[field]}
              onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950 p-3"
              placeholder={label}
            />
          ))}
          <select
            value={form.carat}
            onChange={(event) => setForm((prev) => ({ ...prev, carat: event.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 p-3"
          >
            <option value="18">18</option>
            <option value="21">21</option>
            <option value="24">24</option>
          </select>
          <select
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 p-3"
          >
            <option value="new">جديد</option>
            <option value="used">مستعمل</option>
            <option value="ounces">أونصات</option>
            <option value="custom">تفصيل</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={upsertProduct}
            disabled={submitting}
            className="rounded-lg bg-gold-500 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editingId ? 'تحديث المنتج' : 'حفظ المنتج'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetEditor}
              disabled={submitting}
              className="rounded-lg border border-slate-600 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-white">
        <h2 className="text-xl font-bold text-gold-300">الأسعار العامة</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['18', '21', '24'].map((carat) => (
            <input
              key={carat}
              type="number"
              value={settingsForm.goldPrices[carat]}
              onChange={(event) => setSettingsForm((prev) => ({
                ...prev,
                goldPrices: {
                  ...prev.goldPrices,
                  [carat]: event.target.value
                }
              }))}
              className="rounded-lg border border-slate-700 bg-slate-950 p-3"
              placeholder={`سعر ${carat}`}
            />
          ))}
          <input
            type="number"
            value={settingsForm.usdToSyp}
            onChange={(event) => setSettingsForm((prev) => ({ ...prev, usdToSyp: event.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 p-3"
            placeholder="USD -> SYP"
          />
        </div>
        <button
          type="button"
          onClick={saveSettings}
          disabled={submitting}
          className="mt-4 rounded-lg bg-gold-500 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          حفظ الأسعار
        </button>
      </div>

      <MediaManager />

      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-white">
        <h2 className="text-xl font-bold text-gold-300">إدارة المنتجات ({products.length}) - مباعة: {soldCount}</h2>
        <div className="mt-4 space-y-3">
          {products.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950 p-3">
              <p>{item.name}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleSold(item)}
                  disabled={submitting}
                  className="rounded bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {item.isSold ? 'إرجاع للبيع' : 'تم البيع'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm(mapProductToForm(item));
                    setEditingId(item.id);
                    setFeedback(null);
                  }}
                  className="rounded bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => removeProduct(item.id)}
                  disabled={submitting}
                  className="rounded bg-rose-500 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdminPage;
