import React, { useState, useEffect } from 'react';
import { supabase, logAuditEvent } from '../../../data/store';
import { fmtDate } from '../superAdminUtils';
import { SchoolIcon, ShieldIcon, MenuIcon, CheckIcon, CrossIcon } from '../../../components/CommonIcons';
import { useDialog } from '../../../contexts/DialogContext';

export default function SchoolDetailTab({ school, onBack, setActivateModal, handleRowDeleteSchool }) {
  const [activeTab, setActiveTab] = useState('features');
  const [features, setFeatures] = useState([]);
  const [registry, setRegistry] = useState([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [savingFeature, setSavingFeature] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  const { alert, confirm } = useDialog();

  useEffect(() => {
    if (activeTab === 'features') {
      loadFeatures();
    } else if (activeTab === 'activity') {
      loadLogs();
    }
  }, [activeTab, school.id]);

  const loadFeatures = async () => {
    setLoadingFeatures(true);
    try {
      const [{ data: regData }, { data: schData }] = await Promise.all([
        supabase.from('features_registry').select('*').order('feature_name'),
        supabase.from('school_features').select('*').eq('school_id', school.id)
      ]);
      setRegistry(regData || []);
      setFeatures(schData || []);
    } catch (err) {
      console.error('Error loading features:', err);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('school_id', school.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error loading logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const toggleFeature = async (featureKey, currentStatus) => {
    setSavingFeature(featureKey);
    const newStatus = !currentStatus;
    try {
      if (newStatus) {
        await supabase.from('school_features').upsert({
          school_id: school.id,
          feature_key: featureKey,
          is_enabled: true,
          enabled_at: new Date().toISOString()
        }, { onConflict: 'school_id, feature_key' });
      } else {
        await supabase.from('school_features')
          .update({ is_enabled: false })
          .eq('school_id', school.id)
          .eq('feature_key', featureKey);
      }
      // Refresh local state
      setFeatures(prev => {
        const exists = prev.find(f => f.feature_key === featureKey);
        if (exists) {
          return prev.map(f => f.feature_key === featureKey ? { ...f, is_enabled: newStatus } : f);
        }
        return [...prev, { feature_key: featureKey, is_enabled: newStatus }];
      });
      
      // Log audit
      await logAuditEvent({
        school_id: school.id,
        action: newStatus ? 'FEATURE_ENABLED' : 'FEATURE_DISABLED',
        target_table: 'school_features',
        target_id: school.id,
        metadata: { feature_key: featureKey }
      });
      
    } catch (err) {
      console.error('Toggle error:', err);
      alert({ title: 'Error', message: 'Failed to update feature.' });
    } finally {
      setSavingFeature(null);
    }
  };

  return (
    <div className="tv">
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="act-btn" onClick={onBack}>&larr; Back</button>
          <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SchoolIcon size={24} color="#64748b" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{school.name}</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>{school.location || 'No Location'} &bull; Joined {fmtDate(school.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {['features', 'users', 'activity', 'settings'].map(tab => (
          <button key={tab} className={`fbtn${activeTab === tab ? ' on' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'features' && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Feature Toggles</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Enable or disable specific modules for this school. Changes take effect within 5 minutes.</p>
          
          {loadingFeatures ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading features...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {registry.map(reg => {
                const schoolFeat = features.find(f => f.feature_key === reg.feature_key);
                const isEnabled = schoolFeat?.is_enabled || false;
                const isSaving = savingFeature === reg.feature_key;
                
                return (
                  <div key={reg.feature_key} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isEnabled ? '#f8fafc' : '#fff' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {reg.feature_name}
                        {reg.is_beta && <span style={{ fontSize: '0.7rem', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: 4 }}>BETA</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>{reg.category}</div>
                    </div>
                    <button 
                      onClick={() => toggleFeature(reg.feature_key, isEnabled)}
                      disabled={isSaving}
                      style={{
                        padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                        background: isEnabled ? '#10b981' : '#e2e8f0',
                        color: isEnabled ? '#fff' : '#475569',
                        fontWeight: 600, fontSize: '0.8rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isSaving ? '...' : isEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Users & Admins</h3>
          <p style={{ color: '#64748b' }}>User management interface will be displayed here.</p>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>School Activity Log</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Detailed audit trail for this school. Tracks configuration changes, feature toggles, and administrative actions.</p>
          
          {loadingLogs ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading activity logs...</div>
          ) : logs.length === 0 ? (
            <div className="empty">No activity logs found for this school.</div>
          ) : (
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Actor</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 700, fontSize: '0.75rem' }}>{log.action}</td>
                      <td style={{ fontSize: '0.8rem' }}>{log.target_table} ({log.target_id?.slice(0,8)})</td>
                      <td>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{log.actor_email || 'Unknown'}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{log.actor_role}</div>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{fmtDate(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="panel" style={{ border: '1px solid #fee2e2' }}>
          <h3 style={{ marginTop: 0, color: '#ef4444' }}>Danger Zone</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Destructive actions for this school.</p>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="act-btn r" onClick={() => handleRowDeleteSchool(school.id, school.name)}>Terminate School</button>
          </div>
        </div>
      )}
    </div>
  );
}
