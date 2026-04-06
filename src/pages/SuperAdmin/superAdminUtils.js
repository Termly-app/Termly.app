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
  const fallbacks = { 'starter plan': 4000, 'growth plan': 10000, 'pro plan': 20000, 'enterprise': 35000 };
  return fallbacks[p] || 4000;
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

/**
 * Refined status that takes activity (date) into account
 */
export const getStatusRefined = (p, isActive) => {
  const s = p.subscription_status || 'Inactive';
  // If functionally active (HQ override or future expiry), show as Active in UI
  if (isActive && s === 'Inactive') return 'Active';
  if (isActive) return s;
  
  // If conceptually active/trial but the date-check (isActive) failed
  if (s === 'Active' || s === 'Trial') return 'Expired';
  return s;
};

// ── Module slug → human-friendly label for display ──────────────────────
const MODULE_LABELS = {
  student_mgmt:    'Student Management',
  staff_mgmt:      'Staff Management',
  attendance:      'Attendance Tracking',
  dashboard:       'Dashboard & Analytics',
  grading:         'Academic Grading & Reports',
  cbc_reports:     'CBC Report Cards (PP1–G9)',
  '844_reports':   'KCSE / KCPE Report Cards',
  cbc_competency:  'CBC Competency Grading',
  exam_scheduling: 'Exam Scheduling',
  timetable:       'Timetable Builder',
  auto_timetable:  'Automated Timetable Generation',
  fees:            'Fee & Billing Engine',
  fee_structure:   'Fee Structure Builder',
  fee_statements:  'Student Fee Statements',
  mpesa:           'M-Pesa STK Push',
  mpesa_paybill:   'M-Pesa Paybill Integration',
  mpesa_receipts:  'M-Pesa Receipt Generation',
  airtel_money:    'Airtel Money Integration',
  sms:             'SMS & Communications',
  parent_sms:      'Parent SMS Notifications',
  whatsapp:        'WhatsApp Fee Reminders',
  lms:             'E-Learning / LMS',
  library:         'Library Management',
  nemis:           'NEMIS Data Export',
  bulk_import:     'Bulk Student Import (CSV)',
  teacher_portal:  'Teacher Mobile Portal',
  parent_portal:   'Parent & Student Portal',
  analytics:       'Smart Analytics & Insights',
  multi_stream:    'Multi-Stream Support',
  multi_period:    'Multiple Academic Periods',
  data_recovery:   'Data Recovery Tools',
  custom_brand:    'Custom Branding',
  api_access:      'API Access',
  priority_support:'Priority Support',
};

/**
 * Get the final display-ready feature list for a plan.
 * Priority:
 *   1. If the plan has marketing text `features[]`, show those.
 *   2. If marketing text is empty but `modules[]` exists, auto-generate labels.
 *   3. If both exist, merge them (modules first, then any extra marketing text that isn't a duplicate).
 */
export const getPlanDisplayFeatures = (plan) => {
  const textFeatures   = Array.isArray(plan.features) ? plan.features : [];
  const modulesSlugs   = Array.isArray(plan.modules)  ? plan.modules  : [];

  // Auto-generate labels from module slugs
  const moduleLabels = modulesSlugs.map(s => MODULE_LABELS[s] || s);

  if (moduleLabels.length === 0) return textFeatures;
  if (textFeatures.length === 0) return moduleLabels;

  // Merge: show module labels first, then any extra marketing text not already covered
  const lowerModuleLabels = moduleLabels.map(l => l.toLowerCase());
  const extras = textFeatures.filter(f => !lowerModuleLabels.some(ml => 
    ml.includes(f.toLowerCase()) || f.toLowerCase().includes(ml)
  ));
  return [...moduleLabels, ...extras];
};
