import React from 'react';

export default function SuccessState({ title = 'Success!', message, actionText = 'Continue', onAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 400, margin: '0 auto' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: '#dcfce7',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
        color: '#16a34a'
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{title}</h2>
      {message && <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.5, marginBottom: 24 }}>{message}</p>}
      {onAction && (
        <button
          onClick={onAction}
          style={{
            background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
            padding: '12px 24px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#059669'}
          onMouseOut={(e) => e.target.style.background = '#10b981'}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
