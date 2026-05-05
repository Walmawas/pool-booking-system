import { useEffect, useMemo, useState } from 'react';
import { Facebook, Instagram, MapPin } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';
import { useRealtimeData } from '../hooks/useRealtimeData';

const categories = [
  { key: 'all', label: 'الكل' },
  { key: 'new', label: 'جديد' },
  { key: 'used', label: 'مستعمل' },
  { key: 'ounces', label: 'أونصات' },
  { key: 'custom', label: 'تفصيل' }
];

const CURRENCY_STORAGE_KEY = 'joud-jewelry-currency';

const HomePage = () => {
  const [category, setCategory] = useState('all');
  const [currency, setCurrency] = useState(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
      return saved === 'SYP' || saved === 'USD' ? saved : 'USD';
    } catch {
      return 'USD';
    }
  });
  const { products, settings, loading, error } = useRealtimeData();

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch {
      /* ignore quota / private mode */
    }
  }, [currency]);

  const visibleProducts = useMemo(() => {
    return products.filter((item) => {
      if (item.isSold) {
        return false;
      }

      if (category === 'all') {
        return true;
      }

      return item.category === category;
    });
  }, [category, products]);

  return (
    <main className="pb-20">
      <section className="rounded-2xl border border-gold-500/30 bg-slate-900/70 p-6 text-white">
        <h1 className="text-3xl font-black text-gold-300">مجوهرات جود</h1>
        <p className="mt-2 text-slate-300">تصاميم ذهبية فاخرة مع تحديث لحظي للأسعار.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm"
            onClick={() => setCurrency((prev) => (prev === 'USD' ? 'SYP' : 'USD'))}
          >
            تبديل العملة: {currency}
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.key}
              className={`rounded-xl px-4 py-2 text-sm ${category === cat.key ? 'bg-gold-500 text-slate-950' : 'border border-slate-600'}`}
              onClick={() => setCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <section className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </section>
      )}

      <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 6 }).map((_, idx) => <ProductSkeleton key={idx} />)}
        {!loading && visibleProducts.map((item) => (
          <ProductCard key={item.id} product={item} currency={currency} usdToSyp={settings.usdToSyp || 0} />
        ))}
      </section>

      {!loading && !error && visibleProducts.length === 0 && (
        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/70 p-6 text-center text-slate-300">
          لا توجد منتجات متاحة ضمن هذا التصنيف الآن.
        </section>
      )}

      <footer className="mt-12 rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-slate-300">
        <p className="flex items-center gap-2"><MapPin size={16} /> كفرتخاريم</p>
        <div className="mt-3 flex flex-wrap gap-4 text-gold-300">
          <a className="flex items-center gap-1" href="https://www.instagram.com/joud_jewellry/" target="_blank" rel="noreferrer"><Instagram size={16} /> Instagram</a>
          <a className="flex items-center gap-1" href="https://www.facebook.com/p/%D9%85%D8%AC%D9%88%D9%87%D8%B1%D8%A7%D8%AA-%D8%AC%D9%88%D8%AF-Joud-Jewelry-61554192278916/" target="_blank" rel="noreferrer"><Facebook size={16} /> Facebook</a>
          <a className="flex items-center gap-1" href="https://maps.app.goo.gl/5a62ei8d2rDDAbNC6" target="_blank" rel="noreferrer"><MapPin size={16} /> Google Maps</a>
        </div>
      </footer>
    </main>
  );
};

export default HomePage;
