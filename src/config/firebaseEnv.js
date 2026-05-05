/** مفاتيح البيئة المطلوبة لتشغيل Firebase (بادئة Vite) */
export const REQUIRED_FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

/**
 * @returns {{ ok: boolean, missing: string[] }}
 */
export const validateFirebaseEnv = () => {
  const missing = REQUIRED_FIREBASE_ENV_KEYS.filter((key) => {
    const value = import.meta.env[key];
    return typeof value !== 'string' || value.trim() === '';
  });
  return { ok: missing.length === 0, missing };
};
