import React, { useState } from 'react';
import { ClockIcon, ShieldIcon, ActivityIcon, CheckIcon } from '../../../components/CommonIcons';
import { formatAuditDescription, getRelativeTime } from '../superAdminUtils';

export default function ActivityTab({ filteredActivity = [], filteredAuditLogs = [] }) {
  const [subTab, setSubTab] = useState('platform');

  const combinedLogs = subTab === 'platform' ? filteredActivity : filteredAuditLogs;

  const getActionBadge = (action = '', type = '') => {
    const key = (action + ' ' + type).toUpperCase();
    if (key.includes('PLAN')) return { label: 'Plan Change', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    if (key.includes('LIMIT')) return { label: 'Seat Limits', bg: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)' };
    if (key.includes('DEACTIVAT')) return { label: 'Deactivated', bg: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: 'rgba(239, 68, 68, 0.3)' };
    if (key.includes('ACTIVAT')) return { label: 'Activated', bg: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: 'rgba(16, 185, 129, 0.3)' };
    if (key.includes('REGISTER')) return { label: 'New School', bg: 'rgba(14, 165, 233, 0.15)', color: '#7dd3fc', border: 'rgba(14, 165, 233, 0.3)' };
    return { label: 'System Action', bg: 'rgba(255, 255, 255, 0.08)', color: 'var(--sub)', border: 'rgba(255, 255, 255, 0.12)' };
  };

  return (
    <div className="tv animate-in" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="panel-lbl" style={{ margin: 0, fontSize: '0.9rem' }}>Activity & Audit Trail</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sub)', marginTop: 2 }}>
              Human-readable timeline of all administrative changes and system actions
            </div>
          </div>
          <div className="tab-pill-box">
            <button 
              className={`tab-pill ${subTab === 'platform' ? 'on' : ''}`}
              onClick={() => setSubTab('platform')}
            >
              Platform Events ({filteredActivity.length})
            </button>
            <button 
              className={`tab-pill ${subTab === 'audit' ? 'on' : ''}`}
              onClick={() => setSubTab('audit')}
            >
              System Audits ({filteredAuditLogs.length})
            </button>
          </div>
        </div>

        {combinedLogs.length === 0 ? (
          <div className="empty" style={{ padding: '40px 20px' }}>
            <div className="empty-ico" style={{ marginBottom: 12 }}>
              {subTab === 'platform' ? <ActivityIcon size={32} /> : <ShieldIcon size={32} />}
            </div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>No recent activity records</div>
            <div style={{ color: 'var(--sub)', fontSize: '0.72rem', marginTop: 4 }}>System changes will appear here automatically.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {combinedLogs.map((log) => {
              const badge = getActionBadge(log.action, log.type);
              const readableText = formatAuditDescription(log);
              const schoolName = log.schools?.name || log.school_name || 'System / Global';
              const actorEmail = log.actor_email || 'Platform Admin';

              return (
                <div 
                  key={log.id} 
                  style={{
                    padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: badge.bg,
                      border: `1px solid ${badge.border}`, color: badge.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <ActivityIcon size={18} />
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.4 }}>
                        {readableText}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--txt)', fontWeight: 600 }}>{schoolName}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--sub)' }}>• {actorEmail}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{
                      padding: '3px 9px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700,
                      background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`
                    }}>
                      {badge.label}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--sub)', fontWeight: 500, minWidth: 70, textAlign: 'right' }}>
                      {getRelativeTime(log.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .tab-pill-box {
          display: flex;
          background: rgba(255,255,255,0.03);
          padding: 4px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .tab-pill {
          padding: 6px 14px;
          border-radius: 7px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--sub);
          transition: all 0.2s;
          cursor: pointer;
          background: transparent;
          border: none;
        }
        .tab-pill.on {
          background: var(--vi);
          color: white;
        }
      `}</style>
    </div>
  );
}
