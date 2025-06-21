// src/App.js
import React from "react";
import Calendar from "./Calendar"; // استيراد مكون التقويم

const App = () => {
  return (
    <div style={{ textAlign: 'center', backgroundColor: '#f0f2f5', minHeight: '100vh', paddingTop: '20px' }}>
      {/* <h1 style={{ color: '#2c3e50', marginBottom: '30px' }}>نظام حجز المسبح</h1> */}
      <Calendar /> {/* عرض مكون التقويم */}
    </div>
  );
};

export default App;