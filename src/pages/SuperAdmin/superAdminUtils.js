import { useEffect } from 'react';
import { MODULE_LABELS } from '../../data/constants';

// ── Chart.js shared constants ──────────────────────────────────────────────
export const GC  = 'rgba(255,255,255,0.05)';
export const TC  = '#71717a';
export const TIP = {
  backgroundColor : '#1C2119',
  borderColor     : 'rgba(255,255,255,.08)',
  borderWidth     : 1,
  titleColor      : '#D4DDD6',
  bodyColor       : '#5A6B5C',
};

// ── useChart hook ──────────────────────────────────────────────────────────
export function useChart(ref, factory, deps) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window.Chart === 'undefined') return;
    const chart = factory(el.getContext('2d'));
    return () => chart.destroy();
  }, deps);
}

// ── Date formatter ─────────────────────────────────────────────────────────
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Expiry calculator ──────────────────────────────────────────────────────
export const calcExpiry = (ds) => {
  if (!ds) return null;
  const end   = new Date(ds);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end - today) / 86400000);
  return {
    label : end.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    note  : diff > 0 ? `${diff} days remaining` : diff === 0 ? 'Expires today' : 'Already passed',
    color : diff <= 0 ? 'var(--ro)' : diff < 30 ? 'var(--am)' : 'var(--sub)',
  };
};

// ── Status label / pill helpers ────────────────────────────────────────────
export const statusLabel = (s) => {
  if (!s) return 'Inactive';
  const map = { 
    Active: 'Active', 
    Suspended: 'Suspended', 
    Deactivated: 'Deactivated', 
    Expired: 'Expired' 
  };
  return map[s] ?? 'Deactivated';
};

export const sPill = (s) => {
  if (s === 'Active')                      return 'pill pill-v';
  if (s === 'Suspended')                   return 'pill pill-y';
  if (s === 'Expired' || s === 'Deactivated') return 'pill pill-r';
  return 'pill pill-s';
};

export const getStatusRefined = (p, isActive) => {
  const s = p.subscription_status || 'Inactive';
  if (isActive) return 'Active';
  if (s === 'Active') return 'Expired';
  return s;
};

// ── Feature Count ──────────────────────────────────────────────────────────
export const getFeatureCount = (school) => {
  const p = school?.school_profiles?.[0] || {};
  const settings = p.portal_settings || {};
  const modules = settings.modules || [];
  return Array.isArray(modules) ? modules.length : 0;
};
