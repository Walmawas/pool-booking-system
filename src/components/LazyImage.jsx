import { useEffect, useState } from 'react';

const LazyImage = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(!src);

  useEffect(() => {
    setLoaded(false);
    setHasError(!src);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className="flex h-60 w-full items-center justify-center rounded-xl bg-slate-800 px-4 text-center text-sm text-slate-400">
        الصورة غير متوفرة
      </div>
    );
  }

  return (
    <div className="relative h-60 w-full overflow-hidden rounded-xl bg-slate-800">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-700" />}
      <img
        src={src}
        alt={alt || 'صورة المنتج'}
        loading="lazy"
        className={`h-full w-full object-cover transition duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
};

export default LazyImage;
