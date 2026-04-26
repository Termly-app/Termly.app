import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { hasFeature, getCurrentSchoolId } from '../data/store';

const FeaturesContext = createContext();

export const FeaturesProvider = ({ children, user }) => {
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);

  // Use the new feature keys mapped from our features_registry seed
  const featureSlugs = [
    'grading', 'attendance', 'timetable', 'lms', 'fees',
    'communications', 'teacher_portal', 'parent_portal', 'library',
    'transport', 'payroll', 'inventory', 'nemis'
  ];

  const refreshFeatures = async () => {
    const schoolId = getCurrentSchoolId();
    if (!user || !schoolId) {
      console.log("[FeaturesProvider] Skipping fetch: No user or schoolId", { hasUser: !!user, schoolId });
      setFeatures({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`[FeaturesProvider] Fetching features for school: ${schoolId}`);
      
      const [{ data: registry, error: regErr }, { data: schoolFeatures, error: sfErr }] = await Promise.all([
        supabase.from('features_registry').select('feature_key'),
        supabase.from('school_features').select('feature_key, is_enabled, expires_at').eq('school_id', schoolId)
      ]);

      if (regErr) console.warn("[FeaturesProvider] Registry fetch error:", regErr);
      if (sfErr) console.error("[FeaturesProvider] School features fetch error:", sfErr);

      const now = new Date();
      const featuresMap = {};

      // 1. Initialize from registry if available
      if (registry) {
        registry.forEach(r => {
          featuresMap[r.feature_key] = { enabled: false, expires_at: null };
        });
      }

      // 2. Layer school-specific settings (Authoritative)
      if (schoolFeatures && schoolFeatures.length > 0) {
        console.log(`[FeaturesProvider] Found ${schoolFeatures.length} feature toggles in DB`);
        schoolFeatures.forEach(sf => {
          const isExpired = sf.expires_at && new Date(sf.expires_at) < now;
          featuresMap[sf.feature_key] = {
            enabled: sf.is_enabled && !isExpired,
            expires_at: sf.expires_at,
            raw_enabled: sf.is_enabled,
            is_expired: isExpired
          };
        });
      } else {
        console.warn("[FeaturesProvider] No features found in school_features table for this school.");
      }

      console.log("[FeaturesProvider] Final Map:", featuresMap);
      setFeatures(featuresMap);
    } catch (error) {
      console.error("[FeaturesProvider] Exception loading features:", error);
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
  }, [user?.id, user?.school_id]);

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
