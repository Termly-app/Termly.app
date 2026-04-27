import React, { useState, useEffect } from 'react';
import { supabase, logAuditEvent, updateSchoolFeature, adminUpdateSchoolProfile } from '../../../data/store';
import { fmtDate } from '../superAdminUtils';
import { SchoolIcon, ShieldIcon, MenuIcon, CheckIcon, CrossIcon, ClockIcon, CalendarIcon } from '../../../components/CommonIcons';
import { useDialog } from '../../../contexts/DialogContext';

export default function SchoolDetailTab({ school, onBack, setActivateModal, handleRowDeleteSchool }) {
  const [activeTab, setActiveTab] = useState('features');
  const [features, setFeatures] = useState([]);
  const [registry, setRegistry] = useState([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [savingFeature, setSavingFeature] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  
  const { alert, confirm } = useDialog();

  useEffect(() => {
    if (activeTab === 'features') {
      loadFeatures();
    } else if (activeTab === 'activity') {
      loadLogs();
    } else if (activeTab === 'config') {
      loadProfile();
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

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase.from('school_profiles').select('*').eq('school_id', school.id).single();
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoadingProfile(false);
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

  const handleToggleFeature = async (featureKey, currentStatus, expiry = null) => {
    setSavingFeature(featureKey);
    const newStatus = !currentStatus;
    try {
      await updateSchoolFeature(school.id, featureKey, newStatus, expiry);
      
      // Refresh local state
      setFeatures(prev => {
        const exists = prev.find(f => f.feature_key === featureKey);
        if (exists) {
          return prev.map(f => f.feature_key === featureKey ? { ...f, is_enabled: newStatus } : f);
        }
        return [...prev, { feature_key: featureKey, is_enabled: newStatus, expires_at: expiry }];
      });
      
      // Log audit
      await logAuditEvent({
        school_id: school.id,
        action: newStatus ? 'FEATURE_ENABLED' : 'FEATURE_DISABLED',
        target_table: 'school_features',
        target_id: school.id,
        metadata: { feature_key: featureKey, expiry }
      });
      
    } catch (err) {
      console.error('Toggle error:', err);
      alert({ title: 'Error', message: 'Failed to update feature.' });
    } finally {
      setSavingFeature(null);
    }
  };

  const handleUpdateExpiry = async (featureKey, expiryDate) => {
    setSavingFeature(featureKey);
    try {
      const feat = features.find(f => f.feature_key === featureKey);
      const isEnabled = feat ? feat.is_enabled : false;
      
      await updateSchoolFeature(school.id, featureKey, isEnabled, expiryDate);
      
      setFeatures(prev => prev.map(f => f.feature_key === featureKey ? { ...f, expires_at: expiryDate } : f));
      
      await logAuditEvent({
        school_id: school.id,
        action: 'FEATURE_EXPIRY_UPDATED',
        target_table: 'school_features',
        target_id: school.id,
        metadata: { feature_key: featureKey, expires_at: expiryDate }
      });
    } catch (err) {
      console.error('Expiry update error:', err);
      alert({ title: 'Error', message: 'Failed to update expiry date.' });
    } finally {
      setSavingFeature(null);
    }
  };

  const handleSaveLimits = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const students = parseInt(formData.get('studentLimit'));
    const staff = parseInt(formData.get('staffLimit'));

    setSavingLimits(true);
    try {
      const customSubjects = profile.custom_subjects || {};
      const newCustom = { 
        ...customSubjects, 
        __limits: { students, staff } 
      };
      
      await adminUpdateSchoolProfile(school.id, { custom_subjects: newCustom });
      setProfile(prev => ({ ...prev, custom_subjects: newCustom }));
      alert({ title: 'Success', message: 'School limits updated successfully.' });
    } catch (err) {
      console.error('Limit update error:', err);
      alert({ title: 'Error', message: err.message });
    } finally {
      setSavingLimits(false);
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
        {['features', 'config', 'users', 'activity', 'settings'].map(tab => (
          <button key={tab} className={`fbtn${activeTab === tab ? ' on' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'config' ? 'Configuration' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'features' && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Module & Feature Control</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
            Enable modules and set expiration dates. If a date is set, the feature will automatically lock after that time.
          </p>
          
          {loadingFeatures ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading features...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
              {registry.map(reg => {
                const schoolFeat = features.find(f => f.feature_key === reg.feature_key);
                const isEnabled = schoolFeat?.is_enabled || false;
                const expiry = schoolFeat?.expires_at;
                const isSaving = savingFeature === reg.feature_key;
                const isExpired = expiry && new Date(expiry) < new Date();
                
                return (
                  <div key={reg.feature_key} style={{ 
                    border: '1px solid #e2e8f0', 
                    borderRadius: 12, 
                    padding: 20, 
                    background: isEnabled ? '#f8fafc' : '#fff',
                    transition: 'all 0.2s',
                    boxShadow: isEnabled ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem' }}>
                          {reg.feature_name}
                          {reg.is_beta && <span style={{ fontSize: '0.65rem', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>BETA</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{reg.category}</div>
                      </div>
                      <button 
                        onClick={() => handleToggleFeature(reg.feature_key, isEnabled, expiry)}
                        disabled={isSaving}
                        style={{
                          padding: '8px 16px', borderRadius: 30, border: 'none', cursor: 'pointer',
                          background: isEnabled ? '#10b981' : '#f1f5f9',
                          color: isEnabled ? '#fff' : '#64748b',
                          fontWeight: 700, fontSize: '0.75rem',
                          transition: 'all 0.2s',
                          minWidth: 80
                        }}
                      >
                        {isSaving ? '...' : isEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CalendarIcon size={14} color="#94a3b8" />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Expires on:</span>
                        </div>
                        {isExpired && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: 10 }}>EXPIRED</span>}
                      </div>
                      <input 
                        type="date" 
                        defaultValue={expiry ? expiry.split('T')[0] : ''}
                        onChange={(e) => handleUpdateExpiry(reg.feature_key, e.target.value)}
                        style={{
                          width: '100%',
                          marginTop: 8,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1.5px solid #e2e8f0',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          color: isExpired ? '#ef4444' : '#0f172a',
                          background: isExpired ? '#fffcfc' : '#fff'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="panel animate-in">
          <h3 style={{ marginTop: 0 }}>Limits & Capacity</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 24 }}>
            Define custom student and staff seat limits for this school. These limits are enforced during registration.
          </p>

          {loadingProfile ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading profile configuration...</div>
          ) : (
            <form onSubmit={handleSaveLimits} style={{ maxWidth: 500 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Student Seat Limit</label>
                <input 
                  type="number" 
                  name="studentLimit"
                  defaultValue={profile?.custom_subjects?.__limits?.students || 10000}
                  className="sa-input"
                  required
                  min="1"
                />
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>Maximum number of active students allowed.</p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Staff Seat Limit</label>
                <input 
                  type="number" 
                  name="staffLimit"
                  defaultValue={profile?.custom_subjects?.__limits?.staff || 1000}
                  className="sa-input"
                  required
                  min="1"
                />
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>Maximum number of teachers and staff allowed.</p>
              </div>

              <button 
                type="submit" 
                className="act-btn b" 
                disabled={savingLimits}
                style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
              >
                {savingLimits ? 'Saving Changes...' : 'Save Configuration'}
              </button>
            </form>
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
