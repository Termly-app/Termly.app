import { useEffect } from 'react';

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
// Creates a Chart.js instance when the canvas mounts and destroys it on cleanup.
// `factory` receives the 2D context and must return the Chart instance.
export function useChart(ref, factory, deps) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window.Chart === 'undefined') return;
    const chart = factory(el.getContext('2d'));
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── Plan price lookup ──────────────────────────────────────────────────────
export const planAmt = (plan, settings) => {
  const p = plan?.toLowerCase();
  if (settings?.pricing) {
    const key = Object.keys(settings.pricing).find(k => k.toLowerCase() === p);
    if (key) return settings.pricing[key].price;
  }
  return { champe: 50000, fala: 5999, starter: 5999 }[p] || 5999;
};

// ── Get all plans from settings ──────────────────────────────────────────
export const getAllPlans = (settings) => {
  const p = settings?.pricing || {};
  return Object.keys(p).map(k => ({ id: k, ...p[k] }));
};

// ── Date / money formatters ────────────────────────────────────────────────
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtMoney = (n) => `KSh ${Number(n || 0).toLocaleString()}`;

// ── Expiry calculator (used by Settings tab and main component) ────────────
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
  const map = { Active:'Active', Trial:'Trial', Suspended:'Suspended', Expired:'Expired', Inactive:'Inactive', Pending:'Pending' };
  return map[s] ?? 'Deactivated';
};

export const sPill = (s) => {
  if (s === 'Active')                    return 'pill pill-g';
  if (s === 'Trial')                     return 'pill pill-v';
  if (s === 'Suspended')                 return 'pill pill-y';
  if (s === 'Expired')                   return 'pill pill-r';
  if (s === 'Inactive' || s === 'Pending') return 'pill pill-s';
  return 'pill pill-r';
};
