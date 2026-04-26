import { useState, useEffect, useRef, Component, lazy, Suspense } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { getSchoolProfile, setCurrentSchoolContext, getUserByAuthId, getPeriods, setActivePeriod, initActivePeriod, getCurrentPeriodId, checkIsPlatformAdmin, isFeatureEnabled, checkIsSubscriptionActive, subscribeToSchoolChanges, isShadowMode, getUnreadNotificationCount, subscribeToNotifications, getNotifications, markNotificationRead, markAllNotificationsRead, getPlatformSettings } from './data/store';

// Pages (Lazy Loaded)
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Students     = lazy(() => import('./pages/Students'));
const Teachers     = lazy(() => import('./pages/Teachers'));
const Academics    = lazy(() => import('./pages/Academics'));
const Fees         = lazy(() => import('./pages/Fees'));
const Timetable    = lazy(() => import('./pages/Timetable'));
const Attendance   = lazy(() => import('./pages/Attendance'));
const Library      = lazy(() => import('./pages/Library/index'));
const Settings     = lazy(() => import('./pages/Settings'));
const Login        = lazy(() => import('./pages/Login'));
const Security     = lazy(() => import('./pages/Security'));

const Communications = lazy(() => import('./pages/Communications'));
const SuperAdmin   = lazy(() => import('./pages/SuperAdmin'));
const Landing      = lazy(() => import('./pages/Landing'));
const Register     = lazy(() => import('./pages/Register'));
const MpesaReconciliation = lazy(() => import('./pages/MpesaReconciliation'));
const PortalManager = lazy(() => import('./pages/Portal'));
const StaffPortalManager = lazy(() => import('./pages/StaffPortal'));
const TeacherPortalAdmin = lazy(() => import('./pages/Portal/TeacherPortalAdmin'));
const ParentPortalAdmin  = lazy(() => import('./pages/Portal/ParentPortalAdmin'));
const LMS          = lazy(() => import('./pages/LMS'));
const NEMISDashboard = lazy(() => import('./pages/NEMIS/index'));
const TermsOfService  = lazy(() => import('./pages/legal/TermsOfService'));
const PrivacyPolicy   = lazy(() => import('./pages/legal/PrivacyPolicy'));
const AcceptableUse   = lazy(() => import('./pages/legal/AcceptableUse'));
const RefundPolicy    = lazy(() => import('./pages/legal/RefundPolicy'));
const ServiceLevel    = lazy(() => import('./pages/legal/ServiceLevel'));
const ContactSupport  = lazy(() => import('./pages/ContactSupport'));
const AboutUs         = lazy(() => import('./pages/AboutUs'));
const FAQ             = lazy(() => import('./pages/FAQ'));
const SecurityTrust   = lazy(() => import('./pages/SecurityTrust'));
const Docs            = lazy(() => import('./pages/Docs'));
const Blog            = lazy(() => import('./pages/Blog'));
const Partners        = lazy(() => import('./pages/Partners'));
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword   = lazy(() => import('./pages/ResetPassword'));
const SetPassword  = lazy(() => import('./pages/SetPassword'));
const HelpCenter      = lazy(() => import('./pages/HelpCenter'));
const PortalLogin     = lazy(() => import('./pages/Portal/PortalLogin'));
const StaffLogin      = lazy(() => import('./pages/StaffPortal/StaffLogin'));

import { initAnalytics, trackEvent } from './utils/analytics';
import Loader          from './components/Common/Loader';
import SyncIndicator from './components/Common/SyncIndicator';
import PricingUpgrade from './components/PricingUpgrade';
import Select from './components/Common/Select';
import { ErrorBoundary } from './components/ErrorBoundary';
import useNetworkStatus from './hooks/useNetworkStatus';
import { FeaturesProvider, useFeature } from './contexts/FeaturesContext';
import { useDialog } from './contexts/DialogContext';
import LockScreen from './components/Common/LockScreen';

import {
  DashboardIcon, UserIcon, StudentsIcon, StaffIcon, AttendanceIcon, GradingIcon,
  TimetableIcon, FeesIcon, SecurityIcon, SettingsIcon,
  BillingIcon, SignOutIcon, MenuIcon, CloseIcon, ChevronDownIcon,
  OverviewIcon, SchoolsIcon, PaymentsIcon, HistoryIcon, RevenueIcon,
  ActivityIcon, RecoveryIcon, StatusDotIcon, ZapIcon, SubscriptionsIcon, MessageIcon,
  DownloadIcon, UploadIcon, RefreshIcon, LogoMarkBW, BookIcon, FlagIcon, LockIcon, BellIcon,
  ShieldIcon
} from './components/Common/Icons';

// --- Sidebar nav link helper ------------------------------------------------
function SbLink({ to, icon: Icon, label, onClick, exact = false, locked = false, red = false }) {
  const location = useLocation();
  const { alert } = useDialog();
  const isActive = exact
    ? location.pathname === to && location.search === ''
    : location.pathname === to || (to.includes('?') && location.search.includes(to.split('?')[1]));

  const finalClass = `nav-item${isActive ? ' active' : ''}${locked ? ' nav-locked' : ''}${red ? ' nav-red' : ''}`;

  const handleClick = async (e) => {
    if (locked) {
      e.preventDefault();
      
      const settings = await getPlatformSettings();
      const phone = settings?.support?.phone || '+254712260057';
      const email = settings?.support?.email || 'shulesoft8@gmail.com';
      
      alert({
        title: 'Module Locked',
        message: (
          <div style={{ textAlign: 'left' }}>
            <p style={{ marginBottom: 16, fontSize: '0.9rem' }}>This feature is currently disabled for your school or requires a higher tier plan (Professional Edition).</p>
            
            <div style={{ 
              background: 'rgba(255,255,255,0.03)', 
              padding: 20, 
              borderRadius: 16, 
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.65rem', color: 'var(--primary-light)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Contact Support to Activate</div>
              
              <a href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ 
                display: 'flex', alignItems: 'center', gap: 12, color: '#fff', textDecoration: 'none',
                background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: 10, transition: 'all 0.2s'
              }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'} onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageIcon size={16} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 600 }}>WhatsApp / Call</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{phone}</div>
                </div>
              </a>

              <a href={`mailto:${email}`} style={{ 
                display: 'flex', alignItems: 'center', gap: 12, color: '#fff', textDecoration: 'none',
                background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: 10, transition: 'all 0.2s'
              }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'} onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SettingsIcon size={16} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: '#d4d4d8', fontWeight: 600 }}>Official Email</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{email}</div>
                </div>
              </a>
            </div>
            
            <p style={{ marginTop: 16, fontSize: '0.75rem', color: '#a1a1aa', textAlign: 'center' }}>
              Mon – Fri, 8:00 AM – 6:00 PM EAT
            </p>
          </div>
        ),
        confirmText: 'Dismiss'
      });
      return;
    }
    if (onClick) onClick();
  };

  return (
    <NavLink
      to={locked ? '#' : to}
      end={exact}
      className={finalClass}
      onClick={handleClick}
      style={locked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
    >
      <span className="nav-icon">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="nav-label">{label}</span>
      {locked && <span className="nav-lock-badge" style={{ fontSize:'0.55rem', background:'#94a3b8', color:'white', padding:'2px 6px', borderRadius:10, marginLeft:'auto', fontWeight: 800 }}>LOCKED</span>}
    </NavLink>
  );
}

// --- Sidebar section label ------------------------------------------------
function SbSection({ label }) {
  return <div className="sidebar-section">{label}</div>;
}

// === SIDEBAR ================================================================
function Sidebar({ isOpen, onClose, onLogout, onLock, currentUser, subscriptionActive }) {
  const [schoolName,     setSchoolName]     = useState('ShuleSoft');
  const [profile,        setProfile]        = useState(null);
  const [periods,        setPeriods]        = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriodId());
  const location = useLocation();

  const loadProfile = async () => {
    try {
      const p = await getSchoolProfile();
      setProfile(p);
      setSchoolName(p.schoolName || 'ShuleSoft');
    } catch { /* ignore */ }
  };

  const loadPeriods = async () => {
    try {
      const p = await getPeriods();
      setPeriods(p);
      setSelectedPeriod(getCurrentPeriodId());
    } catch { /* ignore */ }
  };

  useEffect(() => {
    initAnalytics();
    loadProfile();
    loadPeriods();
    window.addEventListener('schoolProfileChanged', loadProfile);
    window.addEventListener('periodChanged',        loadPeriods);
    window.addEventListener('schoolChanged',        loadPeriods);

    // Real-time: re-fetch profile & features when SuperAdmin modifies settings or this school's profile
    const unsubRealtime = subscribeToSchoolChanges(
      () => {
        // Platform settings changed (pricing, features, plans)
        loadProfile();
      },
      () => {
        // This school's profile changed (plan upgrade, status, etc.)
        loadProfile();
      }
    );

    return () => {
      window.removeEventListener('schoolProfileChanged', loadProfile);
      window.removeEventListener('periodChanged',        loadPeriods);
      window.removeEventListener('schoolChanged',        loadPeriods);
      unsubRealtime();
    };
  }, []);

  const handlePeriodChange = async (e) => {
    const periodId = e.target.value;
    await setActivePeriod(periodId);
    setSelectedPeriod(periodId);
  };

  // Get all features at the top level to follow Rules of Hooks
  const libFeature = useFeature('library');
  const attFeature = useFeature('attendance');
  const gradFeature = useFeature('grading');
  const timeFeature = useFeature('timetable');
  const lmsFeature = useFeature('lms');
  const feesFeature = useFeature('fees');
  const commFeature = useFeature('communications');
  const teacherFeature = useFeature('teacher_portal');
  const nemisFeature = useFeature('nemis');

  // Replaced manual feature state with useFeature() hook inside components below
  // useEffect removed as FeaturesProvider handles real-time updates via events

  const role        = currentUser?.role?.toLowerCase() || 'teacher';
  const isAdmin     = role === 'admin';
  const isTeacher   = role === 'teacher';
  const isLibrarian = role === 'librarian';
  const isFinance   = role === 'finance';

  // Sandbox plan: show all modules in sidebar but locked with UPGRADE badge
  const isSandbox   = profile?.subscriptionPlan?.toLowerCase() === 'sandbox';

  const isPlatformAdmin = (import.meta.env.VITE_PLATFORM_ADMIN_WHITELIST || '').split(',').includes(currentUser?.email);

  // --- Platform Admin sidebar ------------------------------------------------
  if (isPlatformAdmin) {
    return (
      <aside className={`sidebar sidebar--admin ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sb-brand">
          <LogoMarkBW size={32} />
          <div className="sb-brand-txt">
            <div className="sb-name">ShuleSoft</div>
            <div className="sb-tag">Platform Admin</div>
          </div>
        </div>

        {/* Period picker */}
        <div className="sidebar-period">
          <label className="sidebar-period-label">Academic Period</label>
          <div className="sidebar-period-select-wrap">
            <Select
              value={selectedPeriod || ''}
              options={periods}
              onChange={handlePeriodChange}
              className="sidebar-period-select-custom"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <SbSection label="Operations" />
          <SbLink to="/super-admin"                          icon={OverviewIcon}   label="Dashboard"        onClick={onClose} exact />
          <SbLink to="/super-admin?tab=schools"              icon={SchoolsIcon}    label="Schools"          onClick={onClose} />
          <SbLink to="/super-admin?tab=admins"               icon={ShieldIcon}     label="Admins"           onClick={onClose} />
          <SbLink to="/super-admin?tab=activity"             icon={ActivityIcon}   label="Audit Log"        onClick={onClose} />
          <SbSection label="System" />
          <SbLink to="/super-admin?tab=config"               icon={SettingsIcon}   label="Settings"         onClick={onClose} />
        </nav>

        {/* Footer */}
        <div className="sb-footer">
          <div className="sb-status-card">
            <div className="sb-status-row">
              <span className="sb-status-label">System Status</span>
              <div className="sb-status-live">
                <StatusDotIcon size={6} color="#0DD88A" />
                <span>Operational</span>
              </div>
            </div>
            <div className="sb-status-name">
              {profile?.schoolName || 'ShuleSoft HQ'}
            </div>
          </div>
          <div className="sb-footer-actions">
            <button className="sb-action-btn" onClick={onLock}>
              <LockIcon size={16} strokeWidth={2} />
              <span>Lock</span>
            </button>
            <button className="sb-action-btn danger" onClick={onLogout}>
              <SignOutIcon size={16} strokeWidth={2} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // --- School Admin / Teacher sidebar ----------------------------------------
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-logo">
        <LogoMarkBW size={34} />
        <div className="sidebar-logo-txt">
          <div className="sidebar-logo-name">ShuleSoft</div>
          <div className="sidebar-logo-sub">School Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <SbSection label="General" />
        <SbLink to="/dashboard" icon={DashboardIcon} label="Dashboard" onClick={onClose} />
        
        {/* Core modules always visible for appropriate roles */}
        {(isTeacher || isAdmin || isFinance || isLibrarian) && (
          <SbLink to="/students" icon={StudentsIcon} label="Students" onClick={onClose} />
        )}
        
        {isAdmin && (
          <SbLink to="/teachers" icon={StaffIcon} label="Staff" onClick={onClose} />
        )}

        {/* Dynamic features based on activation */}
        {(isLibrarian || isTeacher || isAdmin) && libFeature.enabled && (
          <SbLink to="/library" icon={BookIcon} label="Library" onClick={onClose} />
        )}

        {/* Academic section */}
        {(isTeacher || isAdmin) && (
          <>
            {(attFeature.enabled || gradFeature.enabled || timeFeature.enabled) && (
              <SbSection label="Academics" />
            )}
            
            {attFeature.enabled && (
              <SbLink to="/attendance" icon={AttendanceIcon} label="Attendance" onClick={onClose} />
            )}
            
            {gradFeature.enabled && (
              <SbLink to="/academics" icon={GradingIcon} label="Academic Results" onClick={onClose} />
            )}
            
            {timeFeature.enabled && (
              <SbLink to="/timetable" icon={TimetableIcon} label="Timetable" onClick={onClose} />
            )}
            
            {lmsFeature.enabled && (
              <SbLink to="/lms" icon={ActivityIcon} label="E-Learning" onClick={onClose} />
            )}
          </>
        )}

        {/* Administration section */}
        {(isAdmin || isFinance) && (
          <>
            {(feesFeature.enabled || commFeature.enabled) && (
              <SbSection label="Administration" />
            )}
            
            {feesFeature.enabled && (
              <SbLink to="/fees" icon={FeesIcon} label="Fees & Billing" onClick={onClose} />
            )}

            {commFeature.enabled && (
              <SbLink to="/communications" icon={MessageIcon} label="Comm. Center" onClick={onClose} />
            )}

            {teacherFeature.enabled && (
              <SbLink to="/portal/teacher" icon={StaffIcon} label="Teacher Portal" onClick={onClose} />
            )}
          </>
        )}

        {/* Compliance section */}
        {isAdmin && nemisFeature.enabled && (
          <>
            <SbSection label="Compliance" />
            <SbLink to="/compliance/nemis" icon={FlagIcon} label="NEMIS Audit" onClick={onClose} />
          </>
        )}

        <SbSection label="Resources" />
        <SbLink to="/help" icon={BookIcon} label="Help Center" onClick={onClose} />
        
        {isAdmin && (
          <>
            <SbSection label="System" />
            <SbLink to="/security" icon={SecurityIcon} label="Security" onClick={onClose} />
            <SbLink to="/settings" icon={SettingsIcon} label="Settings" onClick={onClose} />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-bottom">
        <div className="sidebar-school-badge">
          <div className="school-avatar">{schoolName.charAt(0)}</div>
          <div className="school-info">
            <div className="school-name">{schoolName}</div>
            <div className="school-plan">
              <span
                className="school-plan-badge"
                style={{
                  background : isSandbox ? 'rgba(99,102,241,0.08)' : (subscriptionActive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'),
                  color      : isSandbox ? '#6366F1' : (subscriptionActive ? '#10B981' : '#EF4444'),
                  border     : `1px solid ${isSandbox ? 'rgba(99,102,241,0.2)' : (subscriptionActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)')}`,
                  fontWeight : 700
                }}
              >
                School Edition
              </span>
            </div>
          </div>
        </div>
        <div className="sb-footer-actions">
          <button className="sb-action-btn" onClick={onLock}>
            <LockIcon size={16} strokeWidth={2} />
            <span>Lock</span>
          </button>
          <button className="sb-action-btn danger" onClick={onLogout}>
            <SignOutIcon size={16} strokeWidth={2} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

// (ErrorBoundary imported from components folder)
// ==================== APP =================================================
function App() {
  const [sidebarOpen,        setSidebarOpen]        = useState(false);
  const [currentUser,        setCurrentUser]        = useState(null);
  const [authLoading,        setAuthLoading]        = useState(true);
  const [subscriptionActive, setSubscriptionActive] = useState(true);
  const [currentPeriodId,    setPeriodId]           = useState(getCurrentPeriodId());
  const [periods,            setPeriods]            = useState([]);
  const [isPlatformAdmin,    setIsPlatformAdmin]    = useState(false);
  const [profile,            setProfile]            = useState(null);
  const location = useLocation();
  const isOnline = useNetworkStatus();
  const [isLocked, setIsLocked] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);

  // Close notification panel when clicking outside
  useEffect(() => {
    if (!showNotifPanel) return;
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifPanel]);

  useEffect(() => {
    if (currentUser?.id) {
      getUnreadNotificationCount().then(setUnreadCount);
      const sub = subscribeToNotifications(currentUser.id, () => {
        getUnreadNotificationCount().then(setUnreadCount);
      });
      return () => {
        if (sub && typeof sub.unsubscribe === 'function') sub.unsubscribe();
      };
    }
  }, [currentUser]);

  // Inactivity tracking (15 minutes)
  useEffect(() => {
    if (!currentUser) return;

    let timer;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!isLocked) setIsLocked(true);
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(name => document.addEventListener(name, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(name => document.removeEventListener(name, resetTimer));
    };
  }, [currentUser, isLocked]);
  
  // Auto-close sidebar on mobile navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePeriodChange = () => setPeriodId(getCurrentPeriodId());
    window.addEventListener('periodChanged', handlePeriodChange);

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userRecord = await getUserByAuthId(session.user.id);
          if (userRecord) {
            const realIsPlatAdmin = await checkIsPlatformAdmin(session.user.email);
            setIsPlatformAdmin(realIsPlatAdmin);

            // Override context if acting-as from Super Admin
            const overrideSchoolId = sessionStorage.getItem('shulesoft_school_id');
            const overridePeriodId = sessionStorage.getItem('shulesoft_period_id');
            const isActingAs = sessionStorage.getItem('shulesoft_acting_as_admin') === 'true';

            if (realIsPlatAdmin && isActingAs && overrideSchoolId) {
              setCurrentSchoolContext(overrideSchoolId, session.user);
              if (overridePeriodId) {
                setCurrentPeriodId(overridePeriodId);
                setPeriodId(overridePeriodId);
              }
            } else {
              setCurrentSchoolContext(userRecord.school_id, session.user);
              const activePeriod = await initActivePeriod();
              setPeriodId(activePeriod?.id);
            }

            const allPeriods   = await getPeriods();
            setPeriods(allPeriods);

            const profileData = await getSchoolProfile();
            setProfile(profileData);

            const isSubActive = await checkIsSubscriptionActive(profileData);
            setSubscriptionActive(realIsPlatAdmin || isSubActive);

            setCurrentUser({
              id         : userRecord.id,
              name       : userRecord.name,
              email      : userRecord.email || session.user.email,
              role       : userRecord.role,
              schoolName : profileData?.schoolName || 'School',
              school_id  : (realIsPlatAdmin && isActingAs && overrideSchoolId) ? overrideSchoolId : userRecord.school_id,
              password_changed: userRecord.password_changed
            });
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setCurrentSchoolContext(null, null);
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        checkSession();
      }
    });

    const handleGlobalPeriodRefresh = async () => {
      const p = await getPeriods();
      setPeriods(p);
      setPeriodId(getCurrentPeriodId());
    };
    window.addEventListener('periodChanged', handleGlobalPeriodRefresh);
    window.addEventListener('schoolChanged', handleGlobalPeriodRefresh);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('periodChanged',    handleGlobalPeriodRefresh);
      window.removeEventListener('schoolChanged',    handleGlobalPeriodRefresh);
      window.removeEventListener('periodChanged',    handlePeriodChange);
    };
  }, []);

  const role = currentUser?.role?.toLowerCase() || '';
  const isAdmin     = role === 'admin';
  const isTeacher   = role === 'teacher';
  const isLibrarian = role === 'librarian';
  const isFinance   = role === 'finance';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentSchoolContext(null, null);
    setCurrentUser(null);
    setIsPlatformAdmin(false);
  };

  // ════════ Auth loading ══════════════════════════════════════════════════
  if (authLoading) return <Loader />;

  // ════════ Not logged in ═════════════════════════════════════════════════
  if (!currentUser) {
    return (
      <>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/"                   element={<Landing />} />
          
          <Route path="/portal/login"       element={<PortalLogin onLogin={(u) => { localStorage.setItem('shulesoft_portal_user', JSON.stringify(u)); window.location.href='/portal/dashboard'; }} />} />
          <Route path="/staff/login"        element={<StaffLogin onLogin={(u) => { localStorage.setItem('shulesoft_staff_user', JSON.stringify(u)); window.location.href='/staff/grading'; }} />} />

          <Route path="/portal/*"           element={<PortalManager />} />
          <Route path="/staff/*"            element={<StaffPortalManager />} />
          <Route path="/login"              element={<Login onLogin={setCurrentUser} />} />
          <Route path="/:schoolCode/login"  element={<Login onLogin={setCurrentUser} />} />
          <Route path="/register"           element={<Register />} />
          <Route path="/legal/terms"        element={<TermsOfService />} />
          <Route path="/legal/privacy"      element={<PrivacyPolicy />} />
          <Route path="/legal/acceptable-use" element={<AcceptableUse />} />
          <Route path="/legal/refunds"      element={<RefundPolicy />} />
          <Route path="/legal/service-level" element={<ServiceLevel />} />
          <Route path="/support"            element={<ContactSupport />} />
          <Route path="/about"              element={<AboutUs />} />
          <Route path="/faq"                element={<FAQ />} />
          <Route path="/docs"               element={<Docs />} />
          <Route path="/blog"               element={<Blog />} />
          <Route path="/partners"           element={<Partners />} />
          <Route path="/forgot-password"    element={<ForgotPassword />} />
          <Route path="/reset-password"     element={<ResetPassword />} />
          <Route path="/security-trust"     element={<SecurityTrust />} />
          <Route path="*"                   element={<Landing />} />
        </Routes>
      </Suspense>
      </>
    );
  }

  // --- Platform Admin ---
  if (isPlatformAdmin && !isShadowMode()) {
    return (
      <>
        <div className="admin-layout">
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/super-admin" element={
                    <ErrorBoundary>
                      <SuperAdmin
                        currentUser={currentUser}
                        isPlatformAdmin={isPlatformAdmin}
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                        onSignOut={handleLogout}
                      />
                    </ErrorBoundary>
              } />
                <Route path="/academics" element={<Suspense fallback={<Loader />}><Academics /></Suspense>} />
                <Route path="/lms" element={<Suspense fallback={<Loader />}><LMS /></Suspense>} />
              <Route path="/login" element={<Navigate to="/super-admin" replace />} />
              <Route path="/"     element={<Navigate to="/super-admin" replace />} />
              <Route path="*"     element={<Navigate to="/super-admin" replace />} />
            </Routes>
          </Suspense>
        </div>
      </>
    );
  }

  // --- Required Password Update ---
  if (currentUser && currentUser.password_changed === false) {
    return (
      <div className="app-layout">
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/set-password" element={<SetPassword currentUser={currentUser} onPasswordChanged={() => setCurrentUser({...currentUser, password_changed: true})} />} />
            <Route path="*" element={<Navigate to="/set-password" replace />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  // --- School portal ---
  return (
    <>
      {isLocked && <LockScreen user={currentUser} onUnlock={() => setIsLocked(false)} />}
      <FeaturesProvider user={currentUser}>
      <div className="app-layout app-shell">
        {!isOnline && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, 
            background: '#ef4444', color: '#fff', padding: '8px', 
            textAlign: 'center', fontWeight: 'bold', fontSize: '14px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            You are currently offline. Critical actions have been paused to prevent data loss.
          </div>
        )}

        {isShadowMode() && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000, 
            background: 'linear-gradient(90deg, #F97316 0%, #EF4444 100%)', // Deep Orange to Red
            color: '#fff', padding: '12px 20px', 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <SecurityIcon size={18} />
              <span>Read-Only Shadow Mode: You are viewing {profile?.schoolName || 'School'} as an Administrator</span>
            </div>
            <button 
              onClick={() => {
                sessionStorage.removeItem('shulesoft_acting_as_admin');
                sessionStorage.removeItem('shulesoft_school_id');
                window.location.href = '/super-admin';
              }}
              style={{
                background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)',
                padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              EXIT SHADOW MODE
            </button>
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          className="mobile-toggle"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        >
          {sidebarOpen
            ? <CloseIcon  size={18} color="currentColor" />
            : <MenuIcon   size={18} color="currentColor" />
          }
        </button>

        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          onLock={() => setIsLocked(true)}
          currentUser={currentUser}
          subscriptionActive={subscriptionActive}
        />

        <main className="main-content">
          {/* Top bar */}
          <div className="topbar">
            <div className="topbar-left">
              <div className="topbar-title desktop-only">Administration</div>
              <div className="topbar-title mobile-only">ShuleSoft</div>
            </div>
            <div className="topbar-actions">
              <SyncIndicator />
              
              <div className="topbar-notif" ref={notifRef} style={{ position: 'relative' }}>
                <button className="notif-btn" title="Notifications" onClick={async () => {
                  const next = !showNotifPanel;
                  setShowNotifPanel(next);
                  if (next) {
                    setNotifLoading(true);
                    try { const n = await getNotifications(); setNotifications(n); } catch(e) { console.error(e); }
                    finally { setNotifLoading(false); }
                  }
                }}>
                  <BellIcon size={20} />
                  {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                </button>

                {showNotifPanel && (
                  <div className="notif-panel animate-in" style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                    width: 380, maxHeight: 480, background: 'var(--bg-card)',
                    borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
                    border: '1px solid var(--border)', zIndex: 9999,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '16px 20px', borderBottom: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Notifications</h4>
                      {unreadCount > 0 && (
                        <button onClick={async () => {
                          await markAllNotificationsRead();
                          setNotifications(n => n.map(x => ({ ...x, is_read: true })));
                          setUnreadCount(0);
                        }} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)'
                        }}>Mark all read</button>
                      )}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                      {notifLoading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>Loading…</div>
                      ) : notifications.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                          <BellIcon size={32} color="var(--border)" />
                          <p style={{ marginTop: 12, fontSize: '0.85rem', fontWeight: 600 }}>No notifications yet</p>
                        </div>
                      ) : notifications.map(n => (
                        <div key={n.id} onClick={async () => {
                          if (!n.is_read) {
                            await markNotificationRead(n.id);
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                            setUnreadCount(c => Math.max(0, c - 1));
                          }
                        }} style={{
                          padding: '12px 20px', cursor: 'pointer',
                          borderBottom: '1px solid var(--border-light)',
                          background: n.is_read ? 'transparent' : 'rgba(79, 70, 229, 0.04)',
                          transition: 'background 0.15s'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                              background: n.is_read ? 'transparent' : (
                                n.type === 'warning' ? '#F59E0B' : n.type === 'alert' ? '#EF4444' : n.type === 'success' ? '#10B981' : 'var(--primary)'
                              )
                            }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{n.title}</div>
                              {n.body && <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>}
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

                <div className="topbar-period">
                  <span className="topbar-period-label">Period:</span>
                  <Select
                    value={currentPeriodId || ''}
                    options={periods}
                    onChange={async (e) => { await setActivePeriod(e.target.value); }}
                    className="topbar-period-select"
                    style={{ minWidth: 220, whiteSpace: 'nowrap' }}
                  />
                </div>
              <div
                className="topbar-avatar"
                title={currentUser?.name}
                style={{ border: '2px solid var(--primary-light)' }}
              >
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>

          {/* Global Print Overlay Header (In Flow to push content down) */}
          {profile?.logo && (
            <div className="global-print-flow-header" style={{ margin: '15mm 15mm 0', paddingBottom: '10px', alignItems: 'center', gap: '15px' }}>
              <img src={profile.logo} alt="School Logo" style={{ height: 60, objectFit: 'contain' }} />
            </div>
          )}

          {/* Page content */}
          <div className="page-content">
            <Suspense fallback={<Loader />}>
              <ErrorBoundary>
                <Routes>

                  <Route path="/support"  element={<ContactSupport />} />
                  
                  {/* Redirects for logged-in users */}
                      <Route path="/login"     element={<Navigate to="/dashboard" replace />} />
                      <Route path="/"         element={<Navigate to="/dashboard" replace />} />

                      {/* Shared Dashboard */}
                      <Route path="/dashboard" element={<Dashboard currentUser={currentUser} onLogout={handleLogout} currentPeriodId={currentPeriodId} />} />
                      <Route path="/help"      element={<HelpCenter />} />
                      
                      {/* Academic Results Section */}
                      <Route path="/academics"    element={<SectionGate featureSlug="grading" featureName="Academic Results" profile={profile}><Academics currentUser={currentUser} currentPeriodId={currentPeriodId} /></SectionGate>}  />
                      
                      {/* Student and Teacher Management */}
                      <Route path="/students"     element={<Students currentUser={currentUser} currentPeriodId={currentPeriodId} />} />
                      <Route path="/teachers"     element={<Teachers currentUser={currentUser} currentPeriodId={currentPeriodId} />} />
 
                      {/* Feature Gated Modules */}
                      <Route path="/attendance"   element={<SectionGate featureSlug="attendance" featureName="Attendance" profile={profile}><Attendance currentUser={currentUser} currentPeriodId={currentPeriodId} /></SectionGate>}  />
                      <Route path="/timetable"    element={<SectionGate featureSlug="timetable" featureName="Timetable" profile={profile}><Timetable currentUser={currentUser} currentPeriodId={currentPeriodId} periods={periods} /></SectionGate>} />
                      <Route path="/lms"          element={<SectionGate featureSlug="lms" featureName="E-Learning" profile={profile}><LMS currentUser={currentUser} /></SectionGate>} />
                      <Route path="/fees"         element={<SectionGate featureSlug="fees" featureName="Fees" profile={profile}><Fees currentUser={currentUser} currentPeriodId={currentPeriodId} /></SectionGate>} />
                      <Route path="/communications" element={<SectionGate featureSlug="communications" featureName="Communications" profile={profile}><Communications currentUser={currentUser} /></SectionGate>} />
                      <Route path="/library/*"    element={<SectionGate featureSlug="library" featureName="Library" profile={profile}><Library currentUser={currentUser} currentPeriodId={currentPeriodId} /></SectionGate>} />
                      <Route path="/compliance/nemis" element={<SectionGate featureSlug="nemis" featureName="NEMIS Audit" profile={profile}><NEMISDashboard currentUser={currentUser} /></SectionGate>} />
 
                      {/* Admin/Portal Management */}
                      <Route path="/security"     element={<Security currentUser={currentUser} />} />
                      <Route path="/settings"     element={<Settings currentUser={currentUser} />} />
                      <Route path="/portal/teacher" element={<SectionGate featureSlug="teacher_portal" featureName="Teacher Portal" profile={profile}><TeacherPortalAdmin /></SectionGate>} />
                      {/* <Route path="/portal/parent"  element={<SectionGate featureSlug="parent_portal"  featureName="Parent Portal"  profile={profile}><ParentPortalAdmin /></SectionGate>} /> */}

                      <Route path="*"         element={<div style={{padding:48, textAlign:'center'}}><h2>403 - Unauthorized</h2><p>You don't have permission to access this module.</p></div>} />
                  </Routes>
              </ErrorBoundary>
            </Suspense>
          </div>
        </main>
        <div className="global-print-fixed-footer">
          <LogoMarkBW size={22} color="#000" />
        </div>

      </div>
    </FeaturesProvider>
    </>
  );
}

/**
 * SectionGate Component
 * Redirects Sandbox users to an upsell page if they try to access premium features.
 */
function SectionGate({ featureSlug, featureName, children, profile }) {
  const [hasAccess, setHasAccess] = useState(null);

  useEffect(() => {
    const check = async () => {
      const ok = await isFeatureEnabled(featureSlug);
      setHasAccess(ok);
    };
    check();
  }, [featureSlug, profile]);

  if (hasAccess === null) return <Loader />;
  if (!hasAccess) return <PricingUpgrade featureName={featureName} profile={profile} />;
  
  return children;
}

export default App;

