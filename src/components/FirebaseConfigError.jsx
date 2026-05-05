const FirebaseConfigError = ({ missingKeys }) => (
  <div
    dir="rtl"
    lang="ar"
    className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100"
  >
    <div className="mx-auto max-w-lg rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
      <h1 className="text-xl font-bold text-rose-200">إعداد Firebase غير مكتمل</h1>
      <p className="mt-3 text-sm text-slate-300">
        انسخ <code className="rounded bg-slate-900 px-1">.env.example</code> إلى{' '}
        <code className="rounded bg-slate-900 px-1">.env</code> واملأ القيم التالية:
      </p>
      <ul className="mt-4 list-inside list-disc text-sm text-amber-200">
        {missingKeys.map((key) => (
          <li key={key}>
            <code className="text-gold-300">{key}</code>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default FirebaseConfigError;
