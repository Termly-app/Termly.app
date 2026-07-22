import React from 'react';

export const CardSkeleton = ({ height = 180, style = {} }) => (
  <div 
    style={{ 
      background: '#ffffff', 
      borderRadius: '24px', 
      padding: '24px', 
      boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)', 
      border: '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      position: 'relative',
      overflow: 'hidden',
      minHeight: `${height}px`,
      ...style 
    }}
  >
    <div style={{ width: '40%', height: '20px', background: '#e2e8f0', borderRadius: '8px', animation: 'skeletonPulse 1.5s infinite ease-in-out' }} />
    <div style={{ width: '70%', height: '36px', background: '#f1f5f9', borderRadius: '10px', animation: 'skeletonPulse 1.5s infinite ease-in-out' }} />
    <div style={{ width: '100%', height: '16px', background: '#f8fafc', borderRadius: '6px', animation: 'skeletonPulse 1.5s infinite ease-in-out', marginTop: 'auto' }} />
    
    <style>{`
      @keyframes skeletonPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
    `}</style>
  </div>
);

export const TableSkeleton = ({ rows = 4 }) => (
  <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9' }}>
    <div style={{ width: '30%', height: '24px', background: '#e2e8f0', borderRadius: '8px', marginBottom: '20px' }} />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
        <div style={{ width: '35%', height: '18px', background: '#f1f5f9', borderRadius: '6px', animation: 'skeletonPulse 1.5s infinite' }} />
        <div style={{ width: '20%', height: '18px', background: '#e2e8f0', borderRadius: '6px', animation: 'skeletonPulse 1.5s infinite' }} />
      </div>
    ))}
  </div>
);
