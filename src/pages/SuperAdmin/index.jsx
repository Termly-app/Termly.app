/**
 * SuperAdmin — Platform Command Tower
 *
 * Drop-in replacement for the original monolithic SuperAdmin.jsx.
 * Same default export, same props interface — nothing else in the app changes.
 *
 * Props:
 *   currentUser   — Supabase auth user object
 *   sidebarOpen   — boolean (mobile sidebar state, controlled by parent)
 *   setSidebarOpen — setter
 *   onSignOut     — callback for sign-out button
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  getAllPendingPayments, getAllPayments, approvePayment, rejectPayment,
  getAllSchools, getPlatformActivities, getPlatformSettings,
  getPlatformStats, updatePlatformSetting, manualExtendSubscription,
  suspendSchool, restoreSchool, updateSchoolPlan, subscribeToPlatformChanges,
  deleteSchool, repairSchoolProfile, getDiscoveryMetrics, deactivateSchool,
  getTeachersBySchool, deleteTeacher, SEAT_LIMITS,
} from '../../data/store';

// Components
import Loader          from '../../components/Common/Loader';
import SuperAdminLoader from '../../components/Common/SuperAdminLoader';

// Tabs
import OverviewTab        from './tabs/OverviewTab';
import SchoolsTab         from './tabs/SchoolsTab';
import PaymentsTab        from './tabs/PaymentsTab';
import PaymentHistoryTab  from './tabs/PaymentHistoryTab';
import SubscriptionsTab   from './tabs/SubscriptionsTab';
import RevenueTab         from './tabs/RevenueTab';
import ActivityTab        from './tabs/ActivityTab';
import SettingsTab        from './tabs/SettingsTab';
import RecoveryTab        from './tabs/RecoveryTab';

// Modals
import ActivateModal    from './modals/ActivateModal';
import PlanModal        from './modals/PlanModal';
import DeleteModal      from './modals/DeleteModal';
import StaffModal       from './modals/StaffModal';
import NEMISExportModal from './modals/NEMISExportModal';

// Shared confirm dialog — replaces all window.confirm / window.prompt
import ConfirmModal from '../../components/Common/ConfirmModal';
import { useConfirm } from '../../components/Common/useConfirm';

// Utilities
import {
  useChart, GC, TC, TIP,
  fmtDate, fmtMoney, calcExpiry, statusLabel, sPill, planAmt,
} from './superAdminUtils';

// Store additions (NEMIS student fetch)
import { getStudentsBySchool } from '../../data/store';

// Styles — imported once, no more useEffect injection
import './SuperAdmin.css';

// ── Supabase client (reuse the singleton already used by store.js) ─────────
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// ── Platform admin whitelist ───────────────────────────────────────────────
const PLATFORM_ADMINS = ['admin@shulesoft.com', 'shulesoft8@gmail.com'];

// ══════════════════════════════════════════════════════════════════════════════
export default function SuperAdmin({ currentUser, sidebarOpen, setSidebarOpen, onSignOut }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // ── Core data state ──────────────────────────────────────────────────────
  const [pendingPayments, setPendingPayments] = useState([]);
  const [allPayments,     setAllPayments]     = useState([]);
  const [schools,         setSchools]         = useState([]);
  const [activity,        setActivity]        = useState([]);
  const [settings,        setSettings]        = useState({});
  const [pStats,          setPStats]          = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [message,         setMessage]         = useState(null);

  // ── UI / filter state ────────────────────────────────────────────────────
  const [searchQuery,   setSearchQuery]   = useState('');
  const [periodFilter,  setPeriodFilter]  = useState('monthly');
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [showFilter,    setShowFilter]    = useState(false);
  const [revPeriod,     setRevPeriod]     = useState('year');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historySchoolFilter, setHistorySchoolFilter] = useState('all');

  // ── Modal state ──────────────────────────────────────────────────────────
  const [activateModal,   setActivateModal]   = useState(null);
  const [payMethod,       setPayMethod]       = useState('mpesa');
  const [payRef,          setPayRef]          = useState('');
  const [activating,      setActivating]      = useState(false);
  const [activateSuccess, setActivateSuccess] = useState(false);
  const [planModal,       setPlanModal]       = useState(null);
  const [chosenPlan,      setChosenPlan]      = useState('');
  const [planSaving,      setPlanSaving]      = useState(false);
  const [deleteModal,     setDeleteModal]     = useState(null);
  const [deleting,        setDeleting]        = useState(false);
  const [discoveryMeta,   setDiscoveryMeta]   = useState({ orphans: [], legacy: [] });
  const [repairingId,     setRepairingId]     = useState(null);
  const [staffModal,      setStaffModal]      = useState(null);
  const [loadingStaff,    setLoadingStaff]    = useState(false);

  // ── Settings form state ──────────────────────────────────────────────────
  const [gwInstructions, setGwInstructions] = useState('');
  const [statusMsg,      setStatusMsg]      = useState('');
  const [subEndDate,     setSubEndDate]     = useState('');
  const [plans,          setPlans]          = useState([]);
  const [priceSaved,     setPriceSaved]     = useState(false);

  // ── Chart refs ───────────────────────────────────────────────────────────
  const revChartRef  = useRef(null);
  const growChartRef = useRef(null);
  const subChartRef  = useRef(null);
  const weekChartRef = useRef(null);
  const payChartRef  = useRef(null);
  const subBreakRef  = useRef(null);
  const revBigRef    = useRef(null);

  const isSuperOwner = currentUser?.email && PLATFORM_ADMINS.includes(currentUser.email);

  // ── Styled confirm dialogs (replaces window.confirm / window.prompt) ─────
  const { confirmModal, confirm, prompt } = useConfirm();

  // ── NEMIS export modal ────────────────────────────────────────────────────
  const [nemisSchool, setNemisSchool] = useState(null);

  // ── Auto-dismiss toast after 4 s ─────────────────────────────────────────
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  // ══ DATE HELPERS ══════════════════════════════════════════════════════════
  const now            = new Date();
  const thirtyDaysAgo  = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo   = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo   = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // ══ isSchoolActive — mirrors Billing page logic ════════════════════════
  const isSchoolActive = (s) => {
    const p = s.school_profiles?.[0];
    if (!p) return false;
    if (['Deactivated', 'Suspended', 'Terminated'].includes(p.subscription_status)) return false;
    if (p.subscription_status === 'Trial') {
      return !p.subscription_expiry || new Date(p.subscription_expiry) > now;
    }
    if (subEndDate && p.subscription_status !== 'Trial') {
      if (new Date(subEndDate) < now) return false;
    }
    if (p.subscription_status === 'Active') return true;
    if (p.subscription_expiry && new Date(p.subscription_expiry) > now) return true;
    return false;
  };

  // ══ COMPUTED VALUES ════════════════════════════════════════════════════
  const activeSchools        = schools.filter(isSchoolActive);
  const expiredSchools       = schools.filter(s => {
    const p = s.school_profiles?.[0];
    return p?.subscription_expiry && new Date(p.subscription_expiry) < now && !isSchoolActive(s);
  });
  const newThisMonth         = schools.filter(s => {
    const d = s.created_at || s.school_profiles?.[0]?.created_at;
    return d && new Date(d) > thirtyDaysAgo;
  });
  const newLastMonth         = schools.filter(s => {
    const d = s.created_at || s.school_profiles?.[0]?.created_at;
    return d && new Date(d) > sixtyDaysAgo && new Date(d) <= thirtyDaysAgo;
  });
  const newActiveThisMonth   = activeSchools.filter(s => {
    const p = s.school_profiles?.[0];
    const d = p?.subscription_start || p?.created_at || s.created_at;
    return d && new Date(d) > thirtyDaysAgo;
  });

  const approvedPayments  = allPayments.filter(p => p.status === 'Approved');
  const totalRevenue      = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const lastMonthRevenue  = approvedPayments
    .filter(p => { const d = new Date(p.created_at); return d > sixtyDaysAgo && d <= thirtyDaysAgo; })
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const weeklyRevenue     = approvedPayments
    .filter(p => new Date(p.created_at) > sevenDaysAgo)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalSchools    = pStats?.totalSchools     ?? schools.length;
  const activeCount     = pStats?.activeSubscribers ?? activeSchools.length;
  const expiredCount    = pStats?.expiredSubscribers ?? expiredSchools.length;
  const newSchoolsCount = pStats?.newSchools        ?? newThisMonth.length;

  const revChange    = totalRevenue > 0 && lastMonthRevenue > 0
    ? Math.round(((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : null;
  const revChangeTxt = revChange !== null
    ? (revChange >= 0 ? `↑ +${revChange}%` : `↓ ${revChange}%`)
    : activeCount > 0 ? `${activeCount} paying` : 'No data yet';
  const revChangeUp  = revChange === null ? true : revChange >= 0;

  const newSchoolsTxt    = newThisMonth.length > 0
    ? `↑ +${newThisMonth.length} this month`
    : newLastMonth.length > 0 ? `${newLastMonth.length} last month` : 'No new schools';
  const activeChangeTxt  = newActiveThisMonth.length > 0
    ? `↑ +${newActiveThisMonth.length} this month`
    : 'No new this month';

  const revPeriodLabel = { day:'Last 30 Days', month:'Last 4 Weeks', year:`Year ${now.getFullYear()}` }[revPeriod];

  // ── Period-filtered school list (for overview lists) ────────────────────
  const periodMs     = { weekly: 7*24*60*60*1000, monthly: 30*24*60*60*1000, yearly: 365*24*60*60*1000 };
  const periodCutoff = new Date(now.getTime() - (periodMs[periodFilter] || periodMs.monthly));
  const recentSchools = schools.filter(s => {
    const d = s.created_at || s.school_profiles?.[0]?.created_at;
    return !d || new Date(d) > periodCutoff;
  });

  // ── Search-filtered data ─────────────────────────────────────────────────
  const q = searchQuery.toLowerCase();
  const filteredSchools = schools.filter(s => {
    const p      = s.school_profiles?.[0] || {};
    const sPlan  = (s.plan || p.subscription_plan || 'Fala').toLowerCase();
    const sStatus = (p.subscription_status || 'Active').toLowerCase();
    const matchQ  = !q || s.name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q) || sPlan.includes(q);
    const matchS  = filterStatus === 'all'
      || (filterStatus === 'active'      && sStatus === 'active')
      || (filterStatus === 'expired'     && expiredSchools.some(ex => ex.id === s.id))
      || (filterStatus === 'deactivated' && sStatus === 'deactivated');
    return matchQ && matchS;
  });
  const filteredActivity = activity.filter(a =>
    !q || a.description?.toLowerCase().includes(q) || a.school_name?.toLowerCase().includes(q)
  );
  const filteredPayments = pendingPayments.filter(p =>
    !q || p.school_profiles?.school_name?.toLowerCase().includes(q) || p.transaction_code?.toLowerCase().includes(q)
  );

  // ══ REVENUE CHART DATA ═════════════════════════════════════════════════
  const getRevData = (period) => {
    if (period === 'year') {
      const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const data   = labels.map((_, mi) =>
        approvedPayments
          .filter(p => { const d = new Date(p.created_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === mi; })
          .reduce((sum, p) => sum + (p.amount || 0), 0)
      );
      return { labels, data };
    }
    if (period === 'month') {
      const labels = ['Week 1','Week 2','Week 3','Week 4'];
      const data   = labels.map((_, wi) => {
        const wEnd   = new Date(now.getTime() - (3 - wi) * 7 * 24 * 60 * 60 * 1000);
        const wStart = new Date(now.getTime() - (4 - wi) * 7 * 24 * 60 * 60 * 1000);
        return approvedPayments
          .filter(p => { const d = new Date(p.created_at); return d >= wStart && d < wEnd; })
          .reduce((sum, p) => sum + (p.amount || 0), 0);
      });
      return { labels, data };
    }
    // day = last 30 days
    const labels = [], data = [];
    for (let i = 29; i >= 0; i--) {
      const dStart = new Date(now); dStart.setDate(now.getDate() - i); dStart.setHours(0, 0, 0, 0);
      const dEnd   = new Date(dStart.getTime() + 86400000);
      labels.push(dStart.toLocaleDateString('en-KE', { day:'numeric', month:'short' }));
      data.push(approvedPayments
        .filter(p => { const d = new Date(p.created_at); return d >= dStart && d < dEnd; })
        .reduce((sum, p) => sum + (p.amount || 0), 0));
    }
    return { labels, data };
  };

  // ══ CHARTS ════════════════════════════════════════════════════════════
  useChart(revChartRef, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 100);
    g.addColorStop(0, 'rgba(124,92,252,0.35)'); g.addColorStop(1, 'rgba(124,92,252,0)');
    const { labels, data } = getRevData('year');
    return new window.Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor:'#7C5CFC', backgroundColor:g, borderWidth:1.5, fill:true, tension:0.4, pointRadius:0, pointHoverRadius:3 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{...TIP, callbacks:{label:c => ' KSh ' + c.raw.toLocaleString()}} }, scales:{ x:{grid:{color:GC},ticks:{color:TC}}, y:{grid:{color:GC},ticks:{color:TC,callback:v=>v>0?'KSh '+v/1000+'K':0}} } },
    });
  }, [activeTab, schools]);

  useChart(growChartRef, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 100);
    g.addColorStop(0, 'rgba(13,216,138,0.3)'); g.addColorStop(1, 'rgba(13,216,138,0)');
    const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].slice(0, now.getMonth() + 1);
    let cum = 0;
    const data = labels.map((_, mi) => {
      cum += schools.filter(s => { const d = new Date(s.created_at || s.school_profiles?.[0]?.created_at || 0); return d.getFullYear() === now.getFullYear() && d.getMonth() === mi; }).length;
      return cum;
    });
    return new window.Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor:'#0DD88A', backgroundColor:g, borderWidth:1.5, fill:true, tension:0.4, pointRadius:0, pointHoverRadius:3 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:TIP }, scales:{ x:{grid:{color:GC},ticks:{color:TC}}, y:{grid:{color:GC},ticks:{color:TC}} } },
    });
  }, [activeTab, schools]);

  useChart(subChartRef, (ctx) => {
    const planLabels = ['Fala', 'Champe'];
    const active = planLabels.map(p => schools.filter(s => {
      const d = s.school_profiles?.[0] || {};
      return d.subscription_status?.toLowerCase() === 'active' && (s.plan || d.subscription_plan || 'Fala').toLowerCase() === p.toLowerCase();
    }).length);
    const deact = planLabels.map(p => schools.filter(s => {
      const d = s.school_profiles?.[0] || {};
      const st = d.subscription_status?.toLowerCase();
      return st !== 'active' && !expiredSchools.some(ex => ex.id === s.id) && (s.plan || d.subscription_plan || 'Fala').toLowerCase() === p.toLowerCase();
    }).length);
    const expd = planLabels.map(p => expiredSchools.filter(s => {
      const d = s.school_profiles?.[0] || {};
      return (s.plan || d.subscription_plan || 'Fala').toLowerCase() === p.toLowerCase();
    }).length);
    return new window.Chart(ctx, {
      type: 'bar',
      data: { labels: planLabels, datasets: [{ label:'Active', data:active, backgroundColor:'#7C5CFC' }, { label:'Deactivated', data:deact, backgroundColor:'#5A6B5C' }, { label:'Expired', data:expd, backgroundColor:'#D4506A' }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:TIP }, scales:{ x:{stacked:true,grid:{display:false},ticks:{color:TC}}, y:{stacked:true,grid:{color:GC},ticks:{color:TC}} } },
    });
  }, [activeTab, schools]);

  useChart(weekChartRef, (ctx) => {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const data = days.map((_, di) => {
      const dStart = new Date(sevenDaysAgo.getTime() + di * 86400000);
      const dEnd   = new Date(dStart.getTime() + 86400000);
      return approvedPayments.filter(p => { const d = new Date(p.created_at); return d >= dStart && d < dEnd; }).reduce((sum, p) => sum + (p.amount || 0), 0);
    });
    const pendData = days.map((_, di) => {
      const dStart = new Date(sevenDaysAgo.getTime() + di * 86400000);
      const dEnd   = new Date(dStart.getTime() + 86400000);
      return pendingPayments.filter(p => new Date(p.created_at) > sevenDaysAgo)
        .filter(p => { const d = new Date(p.created_at); return d >= dStart && d < dEnd; })
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    });
    return new window.Chart(ctx, {
      type: 'bar',
      data: { labels: days, datasets: [{ label:'Collected', data, backgroundColor:'#7C5CFC' }, { label:'Pending', data:pendData, backgroundColor:'#E8A020' }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{...TIP, callbacks:{label:c=>' KSh '+c.raw.toLocaleString()}} }, scales:{ x:{stacked:true,grid:{display:false},ticks:{color:TC}}, y:{stacked:true,grid:{color:GC},ticks:{color:TC,callback:v=>v>0?'KSh '+v/1000+'K':0}} } },
    });
  }, [activeTab, schools, pendingPayments, allPayments]);

  useChart(payChartRef, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 200);
    g.addColorStop(0, 'rgba(212,80,106,0.35)'); g.addColorStop(1, 'rgba(212,80,106,0)');
    const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].slice(0, now.getMonth() + 1);
    const data   = labels.map((_, mi) =>
      approvedPayments.filter(p => { const d = new Date(p.created_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === mi; }).reduce((sum, p) => sum + (p.amount || 0), 0)
    );
    return new window.Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor:'#D4506A', backgroundColor:g, borderWidth:1.5, fill:true, tension:0.4, pointRadius:0 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{...TIP, callbacks:{label:c=>' KSh '+c.raw.toLocaleString()}} }, scales:{ x:{grid:{color:GC},ticks:{color:TC}}, y:{grid:{color:GC},ticks:{color:TC,callback:v=>v>0?'KSh '+v/1000+'K':0}} } },
    });
  }, [activeTab, schools, allPayments]);

  useChart(subBreakRef, (ctx) => {
    const susp  = schools.filter(s => s.school_profiles?.[0]?.subscription_status === 'Suspended').length;
    const deact = schools.filter(s => !['Active','Suspended'].includes(s.school_profiles?.[0]?.subscription_status)).length;
    return new window.Chart(ctx, {
      type: 'doughnut',
      data: { labels:['Active','Suspended','Deactivated','Expired'], datasets:[{ data:[activeCount,susp,deact,expiredCount], backgroundColor:['#7C5CFC','#4A9EE8','#5A6B5C','#D4506A'], borderWidth:0, hoverOffset:6 }] },
      options: { responsive:true, maintainAspectRatio:false, cutout:'68%', plugins:{ legend:{ display:true, position:'right', labels:{ color:'#5A6B5C', padding:14, font:{size:11} } }, tooltip:TIP } },
    });
  }, [activeTab, schools]);

  useChart(revBigRef, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 220);
    g.addColorStop(0, 'rgba(124,92,252,0.4)'); g.addColorStop(1, 'rgba(124,92,252,0)');
    const { labels, data } = getRevData(revPeriod);
    return new window.Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label:'Revenue', data, borderColor:'#7C5CFC', backgroundColor:g, borderWidth:2, fill:true, tension:0.4, pointRadius:0, pointHoverRadius:4 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{...TIP, callbacks:{label:c=>' KSh '+c.raw.toLocaleString()}} }, scales:{ x:{grid:{color:GC},ticks:{color:TC}}, y:{grid:{color:GC},ticks:{color:TC,callback:v=>v>0?'KSh '+v/1000+'K':0}} } },
    });
  }, [activeTab, revPeriod, schools]);

  // ══ DATA LOADING ══════════════════════════════════════════════════════
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Platform settings
      try {
        const cf = await getPlatformSettings();
        setSettings(cf || {});
        setGwInstructions(cf?.billing?.instructions || '');
        setStatusMsg(cf?.platform?.status_message || '');
        setSubEndDate(cf?.billing?.expiry_date || '');
        const pricing = cf?.pricing || {};
        setPlans(Object.entries(pricing).map(([id, p]) => ({
          id, name: id, price: p.price || 0, limit: p.limit || 0,
          active: p.active !== false, features: p.features || [],
        })));
      } catch (e) {
        console.error('Failed to load platform settings:', e);
        setError('Could not load pricing settings. Please check your connection.');
      }

      // 2. Parallel data fetches
      const fetch = async (fn, setter, fallback) => {
        try { const r = await fn(); setter(r || fallback); }
        catch (e) { console.warn(`Dashboard partial failure (${fn.name}):`, e); if (fallback !== undefined) setter(fallback); }
      };

      await Promise.all([
        fetch(getAllPendingPayments, setPendingPayments, []),
        fetch(getAllPayments,        setAllPayments,     []),
        (async () => {
          const rawSchools = await getAllSchools();

          // Per-school user counts
          let userCounts = {};
          try {
            const { data: allUsers } = await supabase.from('users').select('school_id');
            if (allUsers) allUsers.forEach(u => { if (u.school_id) userCounts[u.school_id] = (userCounts[u.school_id] || 0) + 1; });
          } catch (e) { console.warn('Could not fetch user counts', e); }

          const enriched = rawSchools.map(s => ({ ...s, _staffCount: userCounts[s.id] || 0 }));
          setSchools(enriched);

          // Optional profile merge (catches anything the join missed)
          try {
            const { data: profiles } = await supabase.from('school_profiles').select('*');
            if (profiles?.length > 0) {
              setSchools(enriched.map(s => {
                const existing = s.school_profiles || [];
                const extra    = profiles.filter(p => p.school_id === s.id);
                const merged   = [...existing, ...extra].reduce((acc, curr) => {
                  if (!acc.find(p => p.id === curr.id)) acc.push(curr);
                  return acc;
                }, []);
                return { ...s, school_profiles: merged };
              }));
            }
          } catch (e) { console.warn('SuperAdmin: Could not fetch profiles', e); }
        })(),
        fetch(getPlatformActivities, setActivity,      []),
        fetch(getPlatformStats,      setPStats,         null),
        fetch(getDiscoveryMetrics,   setDiscoveryMeta,  { orphans: [], legacy: [] }),
      ]);
    } catch (err) {
      console.error('Overall loadData error:', err);
      setError('An unexpected error occurred while loading dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load + real-time subscription
  useEffect(() => {
    if (!isSuperOwner) return;
    loadData();
    const unsubscribe = subscribeToPlatformChanges(() => loadData());
    return () => unsubscribe();
  }, [isSuperOwner]);

  // ══ TAB NAVIGATION ════════════════════════════════════════════════════
  const setTab = (tab) => { setSearchParams({ tab }); setSidebarOpen(false); setSearchQuery(''); };

  // ══ ACTION HANDLERS ═══════════════════════════════════════════════════
  const handleApprove = async (p) => {
    const ok = await confirm({
      title: 'Approve Payment',
      message: `Approve M-PESA transaction ${p.transaction_code} from ${p.school_profiles?.school_name || 'this school'}?`,
      confirmText: 'Approve',
      variant: 'default',
    });
    if (!ok) return;
    try   { await approvePayment(p.id, p.school_id); setMessage({ type:'success', text:'Payment approved.' }); loadData(); }
    catch (err) { setMessage({ type:'error', text: err.message }); }
  };

  const handleReject = async (p) => {
    const reason = await prompt({
      title: 'Reject Payment',
      message: `Rejecting payment from ${p.school_profiles?.school_name || 'this school'} · ${p.transaction_code}`,
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'e.g. Invalid transaction code',
      confirmText: 'Reject Payment',
      cancelText: 'Cancel',
    });
    if (reason === null) return;
    try   { await rejectPayment(p.id, p.school_id, reason); setMessage({ type:'success', text:'Payment rejected.' }); loadData(); }
    catch (err) { setMessage({ type:'error', text: err.message }); }
  };

  const handleRestore = async (id, name) => {
    const ok = await confirm({
      title: 'Restore Access',
      message: `Restore portal access for ${name}? Their subscription will be extended.`,
      confirmText: 'Restore',
    });
    if (!ok) return;
    try   { await restoreSchool(id); setMessage({ type:'success', text:`${name} restored.` }); loadData(); }
    catch (err) { setMessage({ type:'error', text: err.message }); }
  };

  const handleDeactivate = async (id, name) => {
    const ok = await confirm({
      title: 'Deactivate School',
      message: `Deactivate ${name}? Their staff will lose portal access until reactivated.`,
      confirmText: 'Deactivate',
      variant: 'warning',
    });
    if (!ok) return;
    try   { await deactivateSchool(id); setMessage({ type:'success', text:`${name} deactivated.` }); loadData(); }
    catch (err) { setMessage({ type:'error', text: err.message || 'Failed to deactivate school' }); }
  };

  const handleBulkDeactivate = async () => {
    if (!filteredSchools.length) return;
    const ok = await confirm({
      title: 'Bulk Deactivate',
      message: `This will deactivate ALL ${filteredSchools.length} schools currently visible. Their staff will lose portal access immediately.`,
      confirmText: `Deactivate ${filteredSchools.length} Schools`,
      variant: 'danger',
    });
    if (!ok) return;
    try {
      setMessage({ type:'info', text:'Processing bulk deactivation...' });
      for (const s of filteredSchools) await deactivateSchool(s.id);
      setMessage({ type:'success', text:`Successfully deactivated ${filteredSchools.length} schools.` });
      loadData();
    } catch (err) { setMessage({ type:'error', text: err.message }); }
  };

  const handleBulkActivate = async () => {
    if (!filteredSchools.length) return;
    const ok = await confirm({
      title: 'Bulk Activate',
      message: `This will activate ALL ${filteredSchools.length} schools currently visible and extend their subscriptions by 4 months.`,
      confirmText: `Activate ${filteredSchools.length} Schools`,
      variant: 'warning',
    });
    if (!ok) return;
    try {
      setMessage({ type:'info', text:'Processing bulk activation...' });
      for (const s of filteredSchools) await restoreSchool(s.id);
      setMessage({ type:'success', text:`Successfully activated ${filteredSchools.length} schools.` });
      loadData();
    } catch (err) { setMessage({ type:'error', text: err.message }); }
  };

  const handleRowDeleteSchool = async (id, name) => {
    const ok = await confirm({
      title: 'Terminate School',
      message: `Permanently delete ${name} and ALL associated data — students, payments, profiles? This action cannot be undone.`,
      confirmText: 'Yes, Terminate Forever',
      variant: 'danger',
    });
    if (!ok) return;
    try   { await deleteSchool(id); setMessage({ type:'success', text:`${name} terminated and deleted.` }); loadData(); }
    catch (err) { setMessage({ type:'error', text: err.message || 'Failed to terminate school' }); }
  };

  const handleSuspend = async (id, name) => {
    const ok = await confirm({
      title: 'Suspend School',
      message: `Suspend ${name}? Their account will be locked until you manually restore it.`,
      confirmText: 'Suspend',
      variant: 'warning',
    });
    if (!ok) return;
    try   { await suspendSchool(id); setMessage({ type:'success', text:`${name} suspended.` }); loadData(); }
    catch (err) { setMessage({ type:'error', text: err.message || 'Failed to suspend school' }); }
  };

  const handleUpdateSetting = async (key, value) => {
    try   { await updatePlatformSetting(key, { ...(settings[key] || {}), ...value }); setMessage({ type:'success', text:'Settings saved.' }); loadData(); }
    catch (err) { setMessage({ type:'error', text: err.message }); }
  };

  const handleConfirmActivate = async () => {
    if (!activateModal) return;
    setActivating(true);
    try {
      await restoreSchool(activateModal.id);
      setActivateSuccess(true);
      setMessage({ type:'success', text:`Successfully activated ${activateModal.name}` });
      loadData();
      setTimeout(() => { setActivateModal(null); setActivateSuccess(false); setPayRef(''); }, 2800);
    } catch (err) {
      setMessage({ type:'error', text: err.message || 'Failed to activate school' });
      setActivateModal(null);
    } finally { setActivating(false); }
  };

  const handleChangePlan = async () => {
    if (!chosenPlan || !planModal) return;
    setPlanSaving(true);
    try {
      await updateSchoolPlan(planModal.schoolId, chosenPlan);
      setMessage({ type:'success', text:`${planModal.schoolName} switched to ${chosenPlan}.` });
      setPlanModal(null); setChosenPlan('');
      loadData();
    } catch (err) { setMessage({ type:'error', text: err.message }); }
    finally { setPlanSaving(false); }
  };

  const handleDeleteSchool = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await deleteSchool(deleteModal.id);
      setMessage({ type:'success', text:`Successfully terminated ${deleteModal.name}` });
      setDeleteModal(null);
      loadData();
    } catch (err) {
      setMessage({ type:'error', text:'Failed to terminate school' });
    } finally { setDeleting(false); }
  };

  const handleRepair = async (id, name) => {
    setRepairingId(id);
    try {
      await repairSchoolProfile(id);
      setMessage({ type:'success', text:`Successfully repaired ${name}` });
      loadData();
    } catch (err) { setMessage({ type:'error', text:'Failed to repair school metadata' }); }
    finally { setRepairingId(null); }
  };

  const handleOpenStaffModal = async (id, name) => {
    setStaffModal({ id, name, staff: [] });
    setLoadingStaff(true);
    try {
      const staff = await getTeachersBySchool(id);
      setStaffModal(prev => ({ ...prev, staff }));
    } catch (err) { setMessage({ type:'error', text:'Failed to load staff list' }); }
    finally { setLoadingStaff(false); }
  };

  const handleDeleteStaff = async (teacherId, teacherName) => {
    const ok = await confirm({
      title: 'Delete Staff Member',
      message: `Permanently delete ${teacherName}? This will remove their portal access and all assigned grading/attendance records.`,
      confirmText: 'Delete Staff',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteTeacher(teacherId);
      setStaffModal(prev => ({ ...prev, staff: prev.staff.filter(t => t.id !== teacherId) }));
      setMessage({ type:'success', text:`Deleted teacher ${teacherName}` });
      loadData();
    } catch (err) { setMessage({ type:'error', text:'Failed to delete staff' }); }
  };

  const handleSignOut = () => { if (onSignOut) onSignOut(); else window.location.href = '/'; };

  // ══ ACCESS GUARD ══════════════════════════════════════════════════════
  if (!isSuperOwner) {
    return (
      <div style={{ padding:48, textAlign:'center', background:'#0C0E0D', color:'#D4DDD6', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#D4506A" strokeWidth="1.5" width="48" height="48" style={{ marginBottom:16, opacity:.8 }}>
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <h2 style={{ color:'#D4506A', fontFamily:"'Space Mono',monospace", marginBottom:8, fontSize:'1rem' }}>Access Restricted</h2>
        <p style={{ color:'#5A6B5C', fontSize:'0.85rem', maxWidth:320 }}>This area is restricted to ShuleSoft platform administrators only.</p>
      </div>
    );
  }

  // ══ NAV ITEMS ═════════════════════════════════════════════════════════
  const navItems = [
    { id:'overview',      cls:'ni-v', label:'Overview',        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { id:'schools',       cls:'ni-t', label:'Schools',         icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id:'payments',      cls:'ni-a', label:'Payments',        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
    { id:'history',       cls:'ni-s', label:'Payment History', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg> },
    { id:'subscriptions', cls:'ni-s', label:'Subscriptions',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="7.01" y2="15" strokeWidth="3"/></svg> },
    { id:'revenue',       cls:'ni-v', label:'Revenue',         icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
    { id:'activity',      cls:'ni-t', label:'Activity Log',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { id:'config',        cls:'ni-d', label:'Settings',        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
    { id:'recovery',      cls:'ni-r', label:'Data Recovery',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> },
  ];

  const expiryInfo = calcExpiry(subEndDate);

  // ── Shared tab props (avoids repetition below) ───────────────────────
  const commonProps = {
    searchQuery, filteredSchools, filteredActivity, filteredPayments,
    activeSchools, schools, settings, totalSchools, activeCount, expiredCount,
    totalRevenue, weeklyRevenue, newSchoolsCount, pendingPayments, pStats,
    revChangeTxt, revChangeUp, revChange, newSchoolsTxt, activeChangeTxt,
    recentSchools, approvedPayments, expiredSchools, isSchoolActive,
    showFilter, setShowFilter, filterStatus, setFilterStatus,
    periodFilter, setPeriodFilter,
  };

  // ══ RENDER ════════════════════════════════════════════════════════════
  return (
    <div className="sa-root">

      {/* ── Mobile overlay ── */}
      <div
        className={`sa-overlay${sidebarOpen ? ' show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`sa-sidebar${sidebarOpen ? ' open' : ''}`}>
        {/* Brand */}
        <div className="sb-brand">
          <div className="sb-logo">
            <div className="sb-logo-grid">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
          <div className="sb-brand-txt">
            <div className="sb-name">ShuleSoft</div>
            <div className="sb-tag">PLATFORM ENGINE</div>
          </div>
          <button
            className="sa-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Academic Period Selector (New Sidebar Position) */}
        <div className="sidebar-dropdown">
          <label>ACADEMIC PERIOD</label>
          <select 
            className="custom-select"
            value={searchQuery} // Temporary or bind to a global period state if available
            onChange={() => {}} // Hook this to period change logic
          >
            <option>2026 — Term 1 (Active)</option>
          </select>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'8px 0 16px' }}>
          <div className="sidebar-sec-lbl">GENERAL</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sb-nav${activeTab === item.id ? ' on' : ''}`}
              onClick={() => { setTab(item.id); }}
            >
              <div className={`nav-ico ${item.cls}`}>{item.icon}</div>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sb-spacer" />
        <div className="sb-footer">
          <div className="sb-status-card">
            <div className="sb-status-row">
              <span className="sb-status-label">Status</span>
              <div className="sb-status-live">
                <span className="sa-dot" />
                Live
              </div>
            </div>
            <div className="sb-status-name">{currentUser?.name || 'Administrator'}</div>
          </div>
          <button className="sb-signout-btn" onClick={handleSignOut}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="sa-main">

        {/* Top bar */}
        <div className="sa-topbar">
          <button className="sa-menu-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="sa-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search schools, payments, activity..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <span className="sa-search-clear" onClick={() => setSearchQuery('')}>✕</span>
            )}
          </div>
          <div className="sa-tb-right">
            <div className="sa-tb-badge">
              <div className="sa-tb-badge-dot">SA</div>
              <span>Super Admin</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="sa-content">
          <div className="sa">

            {/* Toast */}
            {message && (
              <div className={`toast ${message.type === 'success' ? 'toast-ok' : 'toast-err'}`}>
                <span>{message.type === 'success' ? '✓' : '✕'}</span> {message.text}
              </div>
            )}

            {loading ? <SuperAdminLoader /> : (
              <>
                {activeTab === 'overview'      && <OverviewTab       {...commonProps} revChartRef={revChartRef} growChartRef={growChartRef} subChartRef={subChartRef} weekChartRef={weekChartRef} />}
                {activeTab === 'schools'       && <SchoolsTab        {...commonProps} handleBulkActivate={handleBulkActivate} handleBulkDeactivate={handleBulkDeactivate} handleDeactivate={handleDeactivate} handleRowDeleteSchool={handleRowDeleteSchool} handleOpenStaffModal={handleOpenStaffModal} setActivateModal={setActivateModal} setPayMethod={setPayMethod} setPayRef={setPayRef} setActivateSuccess={setActivateSuccess} setPlanModal={setPlanModal} setChosenPlan={setChosenPlan} onNEMISExport={setNemisSchool} />}
                {activeTab === 'payments'      && <PaymentsTab       {...commonProps} handleApprove={handleApprove} handleReject={handleReject} payChartRef={payChartRef} />}
                {activeTab === 'history'       && <PaymentHistoryTab allPayments={allPayments} historyStatusFilter={historyStatusFilter} setHistoryStatusFilter={setHistoryStatusFilter} historySchoolFilter={historySchoolFilter} setHistorySchoolFilter={setHistorySchoolFilter} />}
                {activeTab === 'subscriptions' && <SubscriptionsTab  {...commonProps} settings={settings} subBreakRef={subBreakRef} />}
                {activeTab === 'revenue'       && <RevenueTab        {...commonProps} revPeriod={revPeriod} setRevPeriod={setRevPeriod} revPeriodLabel={revPeriodLabel} revBigRef={revBigRef} />}
                {activeTab === 'activity'      && <ActivityTab       filteredActivity={filteredActivity} />}
                {activeTab === 'config'        && <SettingsTab       gwInstructions={gwInstructions} setGwInstructions={setGwInstructions} statusMsg={statusMsg} setStatusMsg={setStatusMsg} subEndDate={subEndDate} setSubEndDate={setSubEndDate} plans={plans} setPlans={setPlans} priceSaved={priceSaved} setPriceSaved={setPriceSaved} handleUpdateSetting={handleUpdateSetting} updatePlatformSetting={updatePlatformSetting} loadData={loadData} setMessage={setMessage} />}
                {activeTab === 'recovery'      && <RecoveryTab       discoveryMeta={discoveryMeta} repairingId={repairingId} handleRepair={handleRepair} />}

                {/* Footer */}
                <div style={{ padding:'24px 0 6px', textAlign:'center', opacity:.2, borderTop:'1px solid var(--edge)', marginTop:20 }}>
                  <div style={{ fontFamily:'var(--fh)', fontSize:'.65rem', color:'var(--sub)' }}>
                    ShuleSoft Platform Engine · {now.getFullYear()}
                  </div>
                </div>
              </>
            )}

            {/* Modals */}
            <ActivateModal
              activateModal={activateModal} setActivateModal={setActivateModal}
              payMethod={payMethod} setPayMethod={setPayMethod}
              payRef={payRef} setPayRef={setPayRef}
              activating={activating} activateSuccess={activateSuccess}
              handleConfirmActivate={handleConfirmActivate}
              settings={settings}
            />
            <PlanModal
              planModal={planModal} setPlanModal={setPlanModal}
              chosenPlan={chosenPlan} setChosenPlan={setChosenPlan}
              planSaving={planSaving} handleChangePlan={handleChangePlan}
              settings={settings}
            />
            <DeleteModal
              deleteModal={deleteModal} setDeleteModal={setDeleteModal}
              deleting={deleting} handleDeleteSchool={handleDeleteSchool}
            />
            <StaffModal
              staffModal={staffModal} setStaffModal={setStaffModal}
              loadingStaff={loadingStaff} handleDeleteStaff={handleDeleteStaff}
            />
            <NEMISExportModal
              school={nemisSchool}
              onClose={() => setNemisSchool(null)}
              getStudentsBySchool={getStudentsBySchool}
            />
            <ConfirmModal {...confirmModal} />

          </div>
        </div>
      </div>
    </div>
  );
}
