import React, { useState, useEffect } from 'react';
import OfflineState from './OfflineState';

export default function OfflineDetector({ children }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {children}
      {isOffline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.95)', zIndex: 99999, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <OfflineState onRetry={() => {
            if (navigator.onLine) setIsOffline(false);
          }} />
        </div>
      )}
    </>
  );
}
