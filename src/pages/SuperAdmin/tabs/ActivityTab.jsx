import React, { useState } from 'react';
import { ClockIcon, ShieldIcon, ActivityIcon } from '../../../components/CommonIcons';

export default function ActivityTab({ filteredActivity, filteredAuditLogs = [] }) {
  const [subTab, setSubTab] = useState('platform');

  return (
    <div className="tv animate-in">
      <div className="panel">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 20 }}>
          <div className="panel-lbl" style={{ margin: 0 }}>System Activity & Audit Logs</div>
          <div className="tab-pill-box">
            <button 
              className={`tab-pill ${subTab === 'platform' ? 'on' : ''}`}
              onClick={() => setSubTab('platform')}
            >
              Platform Events
            </button>
            <button 
              className={`tab-pill ${subTab === 'audit' ? 'on' : ''}`}
              onClick={() => setSubTab('audit')}
            >
              System Audits
            </button>
          </div>
        </div>

        {subTab === 'platform' ? (
          <>
            <p style={{ fontSize:'.75rem', color:'var(--sub)', marginBottom:20, lineHeight:1.6 }}>
              Tracks platform-level lifecycle events: school registrations, plan activations, manual extensions, and staff assignments.
            </p>
            {filteredActivity.length === 0 ? (
              <div className="empty"><div className="empty-ico"><ActivityIcon size={32} /></div>No platform activity found.</div>
            ) : (
              <div className="ai-list">
                {filteredActivity.map(a => (
                  <div className="ai" key={a.id}>
                    <div className="li-ico ni-v"><ActivityIcon size={14} /></div>
                    <div className="ai-body">
                      <div className="ai-t">{a.description}</div>
                      <div className="ai-s">
                        {a.schools?.name || 'Platform'} · {a.type?.split('_').join(' ')}
                      </div>
                    </div>
                    <div className="ai-time">
                      {new Date(a.created_at).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize:'.75rem', color:'var(--sub)', marginBottom:20, lineHeight:1.6 }}>
              Tracks detailed school-level operations: feature toggles, security changes, and administrative actions recorded via logAuditEvent.
            </p>
            {filteredAuditLogs.length === 0 ? (
              <div className="empty"><div className="empty-ico"><ShieldIcon size={32} /></div>No audit logs found.</div>
            ) : (
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>School</th>
                      <th>Actor</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.map(log => (
                      <tr key={log.id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--vi)' }}>{log.action}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--sub)' }}>{log.target_table}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{log.schools?.name || 'Global'}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem' }}>{log.actor_email || 'System'}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--sub)' }}>{log.actor_role}</div>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--sub)' }}>
                          {new Date(log.created_at).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
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
          padding: 6px 12px;
          border-radius: 7px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--sub);
          transition: all 0.2s;
        }
        .tab-pill.on {
          background: var(--vi);
          color: white;
        }
        .ai-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
      `}</style>
    </div>
  );
}
