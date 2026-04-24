import React from 'react';

export default function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} style={{ padding: '16px' }}>
                <div className="skeleton-box" style={{ height: 16, width: i === 0 ? '60%' : '80%', borderRadius: 4, background: '#e2e8f0' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rIndex) => (
            <tr key={rIndex} style={{ borderTop: '1px solid #f1f5f9' }}>
              {Array.from({ length: columns }).map((_, cIndex) => (
                <td key={cIndex} style={{ padding: '16px' }}>
                  <div 
                    className="skeleton-box animate-pulse" 
                    style={{ 
                      height: cIndex === 0 ? 20 : 16, 
                      width: cIndex === 0 ? '70%' : (cIndex === columns - 1 ? '40%' : '90%'), 
                      borderRadius: 4, 
                      background: '#f1f5f9' 
                    }} 
                  />
                  {cIndex === 0 && (
                    <div 
                      className="skeleton-box animate-pulse" 
                      style={{ height: 12, width: '40%', borderRadius: 4, background: '#f1f5f9', marginTop: 8 }} 
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
