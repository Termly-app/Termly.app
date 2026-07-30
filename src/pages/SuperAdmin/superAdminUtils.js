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

// ── Audit Log Human-Readable Formatter ────────────────────────────────────
export const formatAuditDescription = (log) => {
  if (!log) return 'System activity recorded';
  const desc = log.description || log.action || '';
  const schoolName = log.schools?.name || 'School';
  const actor = log.actor_email || 'Super Admin';

  if (desc.includes('PLAN_CHANGE') || log.action === 'PLAN_CHANGE') {
    return `${actor} changed ${schoolName}'s plan tier.`;
  }
  if (desc.includes('LIMITS_UPDATE') || log.action === 'LIMITS_UPDATE') {
    return `${actor} updated student & staff seat capacity limits for ${schoolName}.`;
  }
  if (desc.includes('DEACTIVATION') || log.action === 'DEACTIVATION') {
    return `${actor} deactivated ${schoolName}'s account access.`;
  }
  if (desc.includes('ACTIVATION') || log.action === 'ACTIVATION') {
    return `${actor} activated ${schoolName}'s account access.`;
  }
  if (desc.includes('REGISTER') || log.action === 'REGISTER') {
    return `New school "${schoolName}" was registered on the platform.`;
  }
  if (desc.includes('FEATURE') || log.action === 'FEATURE') {
    return `${actor} updated feature module permissions for ${schoolName}.`;
  }

  // If description has raw text, strip any technical IDs or UUIDs
  let cleanDesc = desc
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/School\s+[0-9a-f-]+/gi, schoolName)
    .replace(/Platform activity/gi, 'System activity')
    .trim();

  return cleanDesc || `Activity recorded for ${schoolName}`;
};

export const getRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return fmtDate(dateStr);
};
