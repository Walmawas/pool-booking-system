import { useCallback, useState } from 'react';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useMediaData } from '../hooks/useMediaData';

const MediaManager = () => {
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [mediaTitle, setMediaTitle] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { media, loading, error } = useMediaData();

  const requireWriteSession = useCallback(() => {
    if (!db || !auth?.currentUser) {
      setFeedback({ type: 'error', text: 'انتهت الجلسة. سجّل الدخول مجددًا.' });
      return false;
    }
    return true;
  }, []);

  const addMedia = useCallback(async () => {
    if (!requireWriteSession()) {
      return;
    }

    const normalizedUrl = mediaUrl.trim();
    const normalizedTitle = mediaTitle.trim();

    if (!normalizedUrl) {
      setFeedback({ type: 'error', text: 'أدخل رابط الوسائط.' });
      return;
    }

    if (!normalizedTitle) {
      setFeedback({ type: 'error', text: 'أدخل عنوان الوسائط.' });
      return;
    }

    if (!['image', 'video'].includes(mediaType)) {
      setFeedback({ type: 'error', text: 'اختر نوع الوسائط الصحيح.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await setDoc(doc(db, 'media', crypto.randomUUID()), {
        url: normalizedUrl,
        type: mediaType,
        title: normalizedTitle,
        createdAt: Date.now()
      });

      setFeedback({ type: 'success', text: 'تمت إضافة الوسائط بنجاح.' });
      setMediaUrl('');
      setMediaTitle('');
    } catch (saveError) {
      console.error(saveError);
      setFeedback({ type: 'error', text: 'تعذر حفظ الوسائط.' });
    } finally {
      setSubmitting(false);
    }
  }, [mediaUrl, mediaType, mediaTitle, requireWriteSession]);

  const removeMedia = useCallback(async (mediaId) => {
    if (!requireWriteSession()) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await deleteDoc(doc(db, 'media', mediaId));
      setFeedback({ type: 'success', text: 'تم حذف الوسائط.' });
    } catch (deleteError) {
      console.error(deleteError);
      setFeedback({ type: 'error', text: 'تعذر حذف الوسائط.' });
    } finally {
      setSubmitting(false);
    }
  }, [requireWriteSession]);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-white">
      <h2 className="text-xl font-bold text-gold-300">إدارة الوسائط (الاستوديو)</h2>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={mediaTitle}
          onChange={(event) => setMediaTitle(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 p-3"
          placeholder="عنوان الوسائط"
        />
        <input
          value={mediaUrl}
          onChange={(event) => setMediaUrl(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 p-3"
          placeholder="رابط الصورة أو الفيديو"
        />
        <select
          value={mediaType}
          onChange={(event) => setMediaType(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 p-3"
        >
          <option value="image">صورة</option>
          <option value="video">فيديو</option>
        </select>
      </div>

      <button
        type="button"
        onClick={addMedia}
        disabled={submitting}
        className="mt-4 rounded-lg bg-gold-500 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        إضافة الوسائط
      </button>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      {feedback && (
        <div
          className={`mt-4 rounded-2xl border p-4 text-sm ${
            feedback.type === 'error'
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gold-300">الوسائط المضافة ({media.length})</h3>
        <div className="mt-4 space-y-3">
          {loading && <p className="text-slate-400">جاري التحميل...</p>}
          {!loading && media.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950 p-3">
              <div className="flex-1">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-slate-400">{item.type === 'image' ? 'صورة' : 'فيديو'}</p>
              </div>
              <button
                type="button"
                onClick={() => removeMedia(item.id)}
                disabled={submitting}
                className="rounded bg-rose-500 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MediaManager;