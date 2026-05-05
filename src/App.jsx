import { Helmet } from 'react-helmet-async';
import { Link, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import StudioPage from './pages/StudioPage';

const App = () => (
  <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8">
    <Helmet>
      <title>مجوهرات جود | Joud Jewelry</title>
      <meta name="description" content="عرض مجوهرات جود مع أسعار الذهب المحدثة لحظيًا والتواصل عبر واتساب." />
    </Helmet>

    <header className="mx-auto mb-8 flex w-full max-w-7xl items-center justify-between">
      <Link to="/" className="text-xl font-black text-gold-300">مجوهرات جود</Link>
      <nav className="flex gap-3">
        <Link to="/studio" className="rounded-lg border border-slate-600 px-4 py-2 text-sm">الاستوديو</Link>
        <Link to="/admin" className="rounded-lg border border-slate-600 px-4 py-2 text-sm">لوحة الإدارة</Link>
      </nav>
    </header>

    <div className="mx-auto w-full max-w-7xl">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  </div>
);

export default App;
