import React from 'react';
import { ERROR_CONFIG } from '../../config/errors.config';

export default function OfflineState({ onRetry }) {
  const config = ERROR_CONFIG.NETWORK_OFFLINE;

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 400, margin: '0 auto' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
        color: '#64748b'
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 1l22 22"></path>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{config.title}</h2>
      <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.5, marginBottom: 24 }}>{config.message}</p>
      
      <button
        onClick={onRetry || (() => window.location.reload())}
        style={{
          background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8,
          padding: '12px 24px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
          transition: 'background 0.2s'
        }}
        onMouseOver={(e) => e.target.style.background = '#334155'}
        onMouseOut={(e) => e.target.style.background = '#0f172a'}
      >
        Retry Connection
      </button>
    </div>
  );
}
