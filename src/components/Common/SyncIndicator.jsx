import { useState, useEffect } from 'react';
import { getPendingSyncCount } from '../../data/offlineStore';
import { CloudSyncIcon } from '../CommonIcons';

export default function SyncIndicator() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  const updateCount = async () => {
    const count = await getPendingSyncCount();
    setPendingCount(count);
  };

  useEffect(() => {
    updateCount();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncComplete = () => {
      setIsSyncing(false);
      updateCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('syncStarted', handleSyncStart);
    window.addEventListener('syncCompleted', handleSyncComplete);

    // Also poll every 10 seconds just in case
    const interval = setInterval(updateCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('syncStarted', handleSyncStart);
      window.removeEventListener('syncCompleted', handleSyncComplete);
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = () => {
    if (!isOnline) return '#EF4444'; // Red
    if (isSyncing || pendingCount > 0) return '#F59E0B'; // Amber
    return '#10B981'; // Green
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (pendingCount > 0) return `${pendingCount} pending`;
    return 'Synced';
  };

  return (
    <div className="sync-indicator" title={getStatusText()}>
      <div className="sync-icon-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <CloudSyncIcon 
          size={18} 
          color={getStatusColor()} 
          className={isSyncing ? 'animate-spin' : ''} 
          style={{ transition: 'color 0.3s ease' }}
        />
        {pendingCount > 0 && (
          <span className="sync-badge">
            {pendingCount}
          </span>
        )}
      </div>
      <span className="sync-status-text desktop-only">
        {getStatusText()}
      </span>

      <style jsx>{`
        .sync-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: default;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .sync-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #F59E0B;
          color: white;
          font-size: 0.6rem;
          padding: 1px 4px;
          border-radius: 10px;
          min-width: 14px;
          text-align: center;
          font-weight: 700;
          border: 1px solid #1a1a1a;
        }
        .animate-spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sync-status-text {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
