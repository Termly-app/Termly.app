import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PortalLogin from './PortalLogin';
import PortalDashboard from './PortalDashboard';

export default function PortalManager() {
  const [portalUser, setPortalUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('shulesoft_portal_user');
    if (saved) setPortalUser(JSON.parse(saved));
  }, []);

  const handleLogin = (data) => {
    setPortalUser(data);
    localStorage.setItem('shulesoft_portal_user', JSON.stringify(data));
  };

  const handleLogout = () => {
    setPortalUser(null);
    localStorage.removeItem('shulesoft_portal_user');
  };

  return (
    <div style={{ background: '#f4f4f5', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
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
