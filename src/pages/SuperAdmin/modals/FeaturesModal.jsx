import { useState, useEffect } from 'react';
import { CrossIcon, CheckIcon, RocketIcon } from '../../../components/CommonIcons';
import { getAllFeaturesRegistry, getSchoolFeatures, updateSchoolFeature } from '../../../data/store';

export default function FeaturesModal({ school, onClose, setMessage }) {
  const [registry, setRegistry] = useState([]);
  const [schoolFeatures, setSchoolFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!school) return;
    loadFeatures();
  }, [school]);

  const loadFeatures = async () => {
    setLoading(true);
    try {
      const [reg, schoolFeats] = await Promise.all([
        getAllFeaturesRegistry(),
        getSchoolFeatures(school.id)
      ]);
      setRegistry(reg);
      
      const featMap = {};
      schoolFeats.forEach(f => {
        featMap[f.feature_key] = f;
      });
      setSchoolFeatures(featMap);
    } catch (err) {
      console.error('Failed to load features:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (featureKey) => {
    const current = schoolFeatures[featureKey];
    const isEnabled = !current?.is_enabled;
    setSaving(featureKey); 
    try {
      await updateSchoolFeature(school.id, featureKey, isEnabled);
      // Refresh the whole map to get latest dates etc.
      const schoolFeats = await getSchoolFeatures(school.id);
      const featMap = {};
      schoolFeats.forEach(f => { featMap[f.feature_key] = f; });
      setSchoolFeatures(featMap);
      
      setMessage({ type: 'success', text: `${isEnabled ? 'Enabled' : 'Disabled'} feature successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update feature.' });
    } finally {
      setSaving(false);
    }
  };

  if (!school) return null;

  const now = new Date();

  return (
    <div className={`mo ${school ? 'open' : ''}`}>
      <div className="mb" style={{ maxWidth: '600px' }}>
        <button className="mc" onClick={onClose}><CrossIcon size={18} /></button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ 
            width: 42, height: 42, borderRadius: 10, background: 'rgba(99, 102, 241, 0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' 
          }}>
            <RocketIcon size={20} />
          </div>
          <div>
            <h3 style={{ color: '#fff', fontSize: '1.1rem' }}>Manage Features</h3>
            <p style={{ color: 'var(--sub)', fontSize: '0.8rem' }}>{school.name}</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--sub)' }}>
            Loading platform registry...
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {registry.map(feat => {
                const featData = schoolFeatures[feat.feature_key];
                const isEnabled = !!featData?.is_enabled;
                const expiresAt = featData?.expires_at ? new Date(featData.expires_at) : null;
                const isExpired = isEnabled && expiresAt && expiresAt < now;
                const isSaving = saving === feat.feature_key;
                
                let statusText = isEnabled ? 'ACTIVE' : 'INACTIVE';
                let statusColor = isEnabled ? '#10b981' : 'var(--sub)';
                let bgOpacity = isEnabled ? '0.1' : '0.05';
                
                if (isExpired) {
                  statusText = 'EXPIRED';
                  statusColor = '#ef4444';
                }

                return (
                  <div 
                    key={feat.feature_key}
                    style={{ 
                      padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', 
                      justifyContent: 'space-between', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{feat.feature_name}</div>
                      <div style={{ color: 'var(--sub)', fontSize: '0.7rem', marginTop: 2 }}>{feat.description || 'No description available'}</div>
                      {expiresAt && isEnabled && (
                        <div style={{ fontSize: '0.65rem', color: isExpired ? '#ef4444' : 'var(--te)', marginTop: 4, fontWeight: 500 }}>
                          {isExpired ? 'Expired on ' : 'Expires '} {expiresAt.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => !isSaving && toggleFeature(feat.feature_key)}
                      disabled={isSaving}
                      style={{ 
                        padding: '6px 12px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700,
                        background: isEnabled ? `rgba(${isExpired ? '239, 68, 68' : '16, 185, 129'}, ${bgOpacity})` : 'rgba(255,255,255,0.05)',
                        border: '1px solid',
                        borderColor: isEnabled ? `rgba(${isExpired ? '239, 68, 68' : '16, 185, 129'}, 0.3)` : 'rgba(255,255,255,0.1)',
                        color: statusColor,
                        cursor: 'pointer', opacity: isSaving ? 0.5 : 1, transition: 'all 0.2s',
                        minWidth: 80, textAlign: 'center'
                      }}
                    >
                      {isSaving ? 'Saving...' : statusText}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--edge)', textAlign: 'right' }}>
          <button className="act-btn" onClick={onClose} style={{ padding: '8px 24px' }}>Done</button>
        </div>
      </div>
    </div>
  );
}
