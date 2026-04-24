import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// ─── Portal temporarily disabled until database RPC functions are deployed ───
// To re-enable: uncomment the imports and restore the routes below.
// import PortalLogin from './PortalLogin';
// import PortalDashboard from './PortalDashboard';

function PortalComingSoon() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: '"Inter", sans-serif', padding: 24
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'linear-gradient(135deg, #10b981, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 32px', fontSize: '2rem'
        }}>
          🎓
        </div>
        <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.5px' }}>
          Parent Portal
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          The Parent Portal is being upgraded with new features. 
          It will be available again shortly. Thank you for your patience.
        </p>
        <a 
          href="/" 
          style={{
            display: 'inline-block', padding: '14px 32px', borderRadius: 16,
            background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '1rem',
            textDecoration: 'none', transition: 'transform 0.2s',
          }}
        >
          ← Back to Home
        </a>
      </div>
    </div>
  );
}

export default function PortalManager() {
  return (
    <div style={{ background: '#f4f4f5', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <Routes>
        <Route path="*" element={<PortalComingSoon />} />
      </Routes>
    </div>
  );
}
