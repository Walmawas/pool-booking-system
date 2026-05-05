import { useState } from 'react';
import { useMediaData } from '../hooks/useMediaData';

const StudioPage = () => {
  const [filter, setFilter] = useState('all');
  const { media, loading, error } = useMediaData();

  const filteredMedia = media.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  return (
    <main className="pb-20">
      <section className="rounded-2xl border border-gold-500/30 bg-slate-900/70 p-6 text-white">
        <h1 className="text-3xl font-black text-gold-300">الاستوديو</h1>
        <p className="mt-2 text-slate-300">معرض أعمالنا وتصاميمنا الفاخرة.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'image', label: 'الصور' },
            { key: 'video', label: 'الفيديوهات' }
          ].map((type) => (
            <button
              type="button"
              key={type.key}
              className={`rounded-xl px-4 py-2 text-sm ${filter === type.key ? 'bg-gold-500 text-slate-950' : 'border border-slate-600'}`}
              onClick={() => setFilter(type.key)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <section className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </section>
      )}

      <section className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="aspect-video animate-pulse rounded-2xl bg-slate-800" />
        ))}
        {!loading && filteredMedia.map((item) => (
          <div key={item.id} className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/50">
            {item.type === 'image' ? (
              <img
                src={item.url}
                alt={item.title}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <video
                src={item.url}
                controls
                className="h-full w-full object-cover"
                poster=""
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            </div>
          </div>
        ))}
      </section>

      {!loading && !error && filteredMedia.length === 0 && (
        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/70 p-6 text-center text-slate-300">
          لا توجد وسائط متاحة ضمن هذا التصنيف الآن.
        </section>
      )}
    </main>
  );
};

export default StudioPage;