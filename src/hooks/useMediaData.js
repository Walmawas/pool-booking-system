import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, firebaseBootstrap } from '../firebase';

const mediaErrorMessage = 'تعذر تحميل الوسائط. تحقق من إعدادات Firebase.';

export const useMediaData = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) {
      setError('إعداد Firebase غير مكتمل.');
      setLoading(false);
      return undefined;
    }

    let ignore = false;
    let unsubMedia;

    const handleError = (snapshotError) => {
      console.error(snapshotError);

      if (ignore) {
        return;
      }

      setError(mediaErrorMessage);
      setLoading(false);
    };

    setLoading(true);
    setError('');

    unsubMedia = onSnapshot(
      collection(db, 'media'),
      (snapshot) => {
        if (ignore) {
          return;
        }

        const nextMedia = snapshot.docs
          .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
          .sort((firstItem, secondItem) => Number(secondItem.createdAt || 0) - Number(firstItem.createdAt || 0));

        setMedia(nextMedia);
        setLoading(false);
      },
      handleError
    );

    return () => {
      ignore = true;
      unsubMedia?.();
    };
  }, []);

  return { media, loading, error };
};