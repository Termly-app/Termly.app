import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StaffLogin from './StaffLogin';
import MobileGrading from './MobileGrading';

export default function StaffPortalManager() {
  const [staffUser, setStaffUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('shulesoft_staff_user');
    if (saved) setStaffUser(JSON.parse(saved));
  }, []);

  const handleLogin = (data) => {
    setStaffUser(data);
    localStorage.setItem('shulesoft_staff_user', JSON.stringify(data));
  };

  const handleLogout = () => {
    setStaffUser(null);
    localStorage.removeItem('shulesoft_staff_user');
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <Routes>
        <Route 
          path="/login" 
          element={!staffUser ? <StaffLogin onLogin={handleLogin} /> : <Navigate to="/staff/grading" replace />} 
        />
        <Route 
          path="/grading" 
          element={staffUser ? <MobileGrading user={staffUser} onLogout={handleLogout} /> : <Navigate to="/staff/login" replace />} 
        />
        <Route path="*" element={<Navigate to={staffUser ? "/staff/grading" : "/staff/login"} replace />} />
      </Routes>
    </div>
  );
}
