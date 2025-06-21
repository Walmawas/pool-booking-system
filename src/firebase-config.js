// src/firebase-config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // إذا كنت ستستخدم المصادقة

const firebaseConfig = {
  apiKey: "AIzaSyAsPMfhLr6R_SngsDpNkDSEQI9NI9XJhLE",
  authDomain: "pool-booking-system.firebaseapp.com",
  projectId: "pool-booking-system",
  storageBucket: "pool-booking-system.firebasestorage.app",
  messagingSenderId: "750277189276",
  appId: "1:750277189276:web:7dfa1907b1de9d81901759"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// الحصول على مرجع Firestore
export const db = getFirestore(app);

// الحصول على مرجع المصادقة (إذا كنت تخطط لاستخدامه)
// export const auth = getAuth(app);

// يمكنك تصدير "app" إذا احتجت الوصول إليها مباشرة في مكان آخر
export default app;