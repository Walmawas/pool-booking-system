// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// إعدادات Firebase لتطبيق الويب الخاص بك
// استبدل هذه القيم بإعدادات Firebase الفعلية الخاصة بك
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
const db = getFirestore(app); // الحصول على مرجع لقاعدة بيانات Firestore

export { db }; // تصدير db حتى تتمكن المكونات الأخرى من استخدامه