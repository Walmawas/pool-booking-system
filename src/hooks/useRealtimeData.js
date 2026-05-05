import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db, firebaseBootstrap } from '../firebase';

export const defaultSettings = {
  goldPrices: { '18': 0, '21': 0, '24': 0 },
  usdToSyp: 0
};

const dataErrorMessage = 'تعذر تحميل البيانات الآن. تحقق من إعدادات Firebase ثم أعد المحاولة.';

export const useRealtimeData = () => {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) {
      setError('إعداد Firebase غير مكتمل.');
      setLoading(false);
      return undefined;
    }

    let ignore = false;
    let unsubProducts;
    let unsubSettings;

    const handleError = (snapshotError) => {
      console.error(snapshotError);

      if (ignore) {
        return;
      }

      setError(dataErrorMessage);
      setLoading(false);
    };

    setLoading(true);
    setError('');

    unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        if (ignore) {
          return;
        }

        const nextProducts = snapshot.docs
          .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
          .sort((firstItem, secondItem) => Number(secondItem.createdAt || 0) - Number(firstItem.createdAt || 0));

        setProducts(nextProducts);
        setLoading(false);
      },
      handleError
    );

    unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (ignore) {
        return;
      }

      if (!snapshot.exists()) {
        setSettings(defaultSettings);
        return;
      }

      const nextSettings = snapshot.data();

      setSettings({
        ...defaultSettings,
        ...nextSettings,
        goldPrices: {
          ...defaultSettings.goldPrices,
          ...nextSettings.goldPrices
        }
      });
    }, handleError);

    return () => {
      ignore = true;
      unsubProducts?.();
      unsubSettings?.();
    };
  }, []);

  const enhancedProducts = useMemo(() => {
    return products.map((item) => {
      const goldPrice = settings.goldPrices?.[String(item.carat)] || 0;
      const priceUsd = Number(item.weight || 0) * Number(goldPrice) + Number(item.laborCost || 0);
      return {
        ...item,
        priceUsd,
        priceSyp: priceUsd * Number(settings.usdToSyp || 0)
      };
    });
  }, [products, settings]);

  return { products: enhancedProducts, settings, loading, error };
};
