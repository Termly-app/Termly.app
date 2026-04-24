import React from 'react';
import { LockIcon } from './CommonIcons'; // Adjust if LockIcon is not in CommonIcons

export default function FeatureGate({ featureName, fallback }) {
  if (fallback) {
    return fallback;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      justifyContent: 'center', padding: '64px 24px', textAlign: 'center',
      background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', maxWidth: 600, margin: '40px auto'
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        color: '#64748b'
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: 12, letterSpacing: '-0.5px' }}>
        Feature Not Enabled
      </h2>
      
      <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.6, maxWidth: 400 }}>
        The <strong>{featureName}</strong> feature hasn't been enabled for your school. Contact your administrator to activate it.
      </p>
    </div>
  );
}
