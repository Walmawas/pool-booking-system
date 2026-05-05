import { MessageCircle } from 'lucide-react';
import LazyImage from './LazyImage';

const phone = '+963968451348';

const ProductCard = ({ product, currency, usdToSyp }) => {
  const rawPrice = currency === 'USD'
    ? product.priceUsd
    : (product.priceSyp ?? product.priceUsd * usdToSyp);
  const price = Number.isFinite(rawPrice) ? rawPrice : 0;
  const formattedPrice = new Intl.NumberFormat('ar-SY', {
    maximumFractionDigits: 2
  }).format(price);

  const message = encodeURIComponent(
    `مرحباً، أريد الاستفسار عن هذه القطعة:\n\n${product.name}\nالوزن: ${product.weight} غرام\nالعيار: ${product.carat}\nالسعر: ${formattedPrice} ${currency}`
  );

  return (
    <article className="card-gradient rounded-2xl border border-slate-700 p-4 text-slate-100 shadow-lg shadow-black/20">
      <LazyImage src={product.image} alt={product.name} />
      <h3 className="mt-4 text-xl font-bold text-gold-300">{product.name}</h3>
      <div className="mt-3 space-y-2 text-sm text-slate-300">
        <p>الوزن: {product.weight} غرام</p>
        <p>العيار: {product.carat}</p>
        <p>أجرة الصياغة: {product.laborCost} USD</p>
        <p className="text-base font-semibold text-gold-400">السعر: {formattedPrice} {currency}</p>
      </div>
      <a
        href={`https://wa.me/${phone.replace('+', '')}?text=${message}`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-500"
      >
        <MessageCircle size={18} />
        استفسار عبر واتساب
      </a>
    </article>
  );
};

export default ProductCard;
