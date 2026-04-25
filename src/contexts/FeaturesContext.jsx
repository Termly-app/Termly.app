import React, { createContext, useContext, useState, useEffect } from 'react';
import { hasFeature, getCurrentSchoolId } from '../data/store';

const FeaturesContext = createContext();

export const FeaturesProvider = ({ children, user }) => {
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);

  // Use the new feature keys mapped from our features_registry seed
  const featureSlugs = [
    'parent_portal', 'sms_alerts', 'email_notifications', 'exam_module',
    'timetable', 'library_management', 'transport_management', 'fee_management',
    'payroll', 'attendance_tracking', 'student_reports', 'analytics_dashboard',
    'bulk_import', 'multi_campus', 'custom_branding', 'api_access'
  ];

  const refreshFeatures = async () => {
    const schoolId = getCurrentSchoolId();
    if (!user || !schoolId) {
      setFeatures({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch registry and school toggles in parallel
      const [{ data: registry }, { data: schoolFeatures }] = await Promise.all([
        supabase.from('features_registry').select('feature_key'),
        supabase.from('school_features').select('feature_key, is_enabled, expires_at').eq('school_id', schoolId)
      ]);

      const now = new Date();
      const featuresMap = {};

      // Initialize all registry features as disabled
      if (registry) {
        registry.forEach(r => {
          featuresMap[r.feature_key] = { enabled: false, expires_at: null };
        });
      }

      // Layer school-specific settings
      if (schoolFeatures) {
        schoolFeatures.forEach(sf => {
          const isExpired = sf.expires_at && new Date(sf.expires_at) < now;
          featuresMap[sf.feature_key] = {
            enabled: sf.is_enabled && !isExpired,
            expires_at: sf.expires_at,
            raw_enabled: sf.is_enabled,
            is_expired: isExpired
          };
        });
      }

      setFeatures(featuresMap);
    } catch (error) {
      console.error("[FeaturesProvider] Failed to load features:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshFeatures();

    // Re-evaluate on custom events
    const handleProfileChange = () => refreshFeatures();
    window.addEventListener('schoolProfileChanged', handleProfileChange);
    window.addEventListener('platformSettingsChanged', handleProfileChange);

    return () => {
      window.removeEventListener('schoolProfileChanged', handleProfileChange);
      window.removeEventListener('platformSettingsChanged', handleProfileChange);
    };
  }, [user]);

  const value = {
    features,
    loading,
    useFeature: (slug) => ({
      enabled: features[slug]?.enabled || false,
      expiresAt: features[slug]?.expires_at || null,
      isExpired: features[slug]?.is_expired || false,
      loading
    })
  };

  return (
    <FeaturesContext.Provider value={value}>
      {children}
    </FeaturesContext.Provider>
  );
};

export const useFeatures = () => {
  const context = useContext(FeaturesContext);
  if (!context) {
    throw new Error('useFeatures must be used within a FeaturesProvider');
  }
  return context;
};

// Clean helper for components
export const useFeature = (slug) => {
  const { useFeature: getFeature } = useFeatures();
  return getFeature(slug);
};
