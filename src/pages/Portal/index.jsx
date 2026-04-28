import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PortalLogin from './PortalLogin';
import PortalDashboard from './PortalDashboard';

export default function PortalManager() {
  const [portalUser, setPortalUser] = useState(() => {
    const saved = localStorage.getItem('Termly_portal_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (data) => {
    setPortalUser(data);
    localStorage.setItem('Termly_portal_user', JSON.stringify(data));
  };

  const handleLogout = () => {
    setPortalUser(null);
    localStorage.removeItem('Termly_portal_user');
    localStorage.removeItem('Termly_portal_school_id');
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <Routes>
        <Route 
          path="/login" 
          element={!portalUser ? <PortalLogin onLogin={handleLogin} /> : <Navigate to="/portal/dashboard" replace />} 
        />
        <Route 
          path="/dashboard" 
          element={portalUser ? <PortalDashboard user={portalUser} onLogout={handleLogout} /> : <Navigate to="/portal/login" replace />} 
        />
        <Route path="*" element={<Navigate to={portalUser ? "/portal/dashboard" : "/portal/login"} replace />} />
      </Routes>
    </div>
  );
}
