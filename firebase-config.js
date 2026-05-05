export const firebaseConfig = {
apiKey: "AIzaSyAsPMfhLr6R_SngsDpNkDSEQI9NI9XJhLE",
  authDomain: "pool-booking-system.firebaseapp.com",
  projectId: "pool-booking-system",
  storageBucket: "pool-booking-system.firebasestorage.app",
  messagingSenderId: "750277189276",
  appId: "1:750277189276:web:46123af8e441b593901759"
};

export const ADMIN_EMAIL = "admin@pool.local";

export const defaultSettings = {
  morningPrice: 100,
  eveningPrice: 120,
  standardPrices: {
    morning: 100,
    evening: 120
  },
  featuredPrices: {
    morning: 130,
    evening: 150
  },
  featuredWeekdays: [4, 5, 6],
  featuredDates: [],
  currency: "USD"
};
