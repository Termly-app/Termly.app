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
        featMap[f.feature_key] = f.is_enabled;
      });
      setSchoolFeatures(featMap);
    } catch (err) {
      console.error('Failed to load features:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (featureKey) => {
    const isEnabled = !schoolFeatures[featureKey];
    setSaving(featureKey); // Track which one is saving
    try {
      await updateSchoolFeature(school.id, featureKey, isEnabled);
      setSchoolFeatures(prev => ({ ...prev, [featureKey]: isEnabled }));
      setMessage({ type: 'success', text: `${isEnabled ? 'Enabled' : 'Disabled'} feature successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update feature.' });
    } finally {
      setSaving(false);
    }
  };

  if (!school) return null;

  return (
    <div className={`mo ${school ? 'open' : ''}`}>
      <div className="mb" style={{ maxWidth: '600px' }}>
        <button className="mc" onClick={onClose}><CrossIcon size={18} /></button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ 
            width: 42, height: 42, borderRadius: 10, background: 'rgba(99, 102, 241, 0.1)', 
            display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#6366f1' 
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
                const isEnabled = !!schoolFeatures[feat.feature_key];
                const isSaving = saving === feat.feature_key;
                
                return (
                  <div 
                    key={feat.feature_key}
                    style={{ 
                      padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', 
                      justifyContent: 'space-between', transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{feat.feature_name}</div>
                      <div style={{ color: 'var(--sub)', fontSize: '0.7rem', marginTop: 2 }}>{feat.description || 'No description available'}</div>
                    </div>
                    
                    <button 
                      onClick={() => !isSaving && toggleFeature(feat.feature_key)}
                      disabled={isSaving}
                      style={{ 
                        padding: '6px 12px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700,
                        background: isEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid',
                        borderColor: isEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)',
                        color: isEnabled ? '#10b981' : 'var(--sub)',
                        cursor: 'pointer', opacity: isSaving ? 0.5 : 1, transition: 'all 0.2s',
                        minWidth: 80, textAlign: 'center'
                      }}
                    >
                      {isSaving ? 'Saving...' : (isEnabled ? 'ACTIVE' : 'INACTIVE')}
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
