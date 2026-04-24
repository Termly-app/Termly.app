import React from 'react';
import { ERROR_CONFIG } from '../../config/errors.config';

export default function ServerErrorState({ onRetry, errorDetails }) {
  const config = ERROR_CONFIG.SERVER_ERROR;

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 400, margin: '0 auto' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: '#fee2e2',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
        color: '#ef4444'
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
          <line x1="6" y1="6" x2="6.01" y2="6"></line>
          <line x1="6" y1="18" x2="6.01" y2="18"></line>
          <path d="M12 10v4"></path>
          <path d="M16 10v4"></path>
          <path d="M8 10v4"></path>
        </svg>
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{config.title}</h2>
      <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.5, marginBottom: 24 }}>{config.message}</p>
      
      {errorDetails && (
        <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: 8, fontSize: '0.85rem', color: '#475569', textAlign: 'left', marginBottom: 24, wordBreak: 'break-all' }}>
          <code>{errorDetails}</code>
        </div>
      )}

      <button
        onClick={onRetry || (() => window.location.reload())}
        style={{
          background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8,
          padding: '12px 24px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
          transition: 'background 0.2s'
        }}
        onMouseOver={(e) => e.target.style.background = '#dc2626'}
        onMouseOut={(e) => e.target.style.background = '#ef4444'}
      >
        Try Again
      </button>
    </div>
  );
}
