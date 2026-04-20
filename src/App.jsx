import { useState, useEffect, Component, lazy, Suspense } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import {
  getSchoolProfile,
  setCurrentSchoolContext,
  getUserByAuthId,
  getPeriods,
  setActivePeriod,
  initActivePeriod,
  getCurrentPeriodId,
  checkIsPlatformAdmin,
  isFeatureEnabled,
  checkIsSubscriptionActive,
  subscribeToSchoolChanges,
  isShadowMode,
} from './data/store';

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
const Billing      = lazy(() => import('./pages/Billing'));
const Communications = lazy(() => import('./pages/Communications'));
const SuperAdmin   = lazy(() => import('./pages/SuperAdmin'));
const Landing      = lazy(() => import('./pages/Landing'));
const Register     = lazy(() => import('./pages/Register'));
const MpesaReconciliation = lazy(() => import('./pages/MpesaReconciliation'));
const PortalManager = lazy(() => import('./pages/Portal'));
const StaffPortalManager = lazy(() => import('./pages/StaffPortal'));
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

import Loader          from './components/Common/Loader';
import SyncIndicator from './components/Common/SyncIndicator';
import PricingUpgrade from './components/PricingUpgrade';
import Select from './components/Common/Select';
import ErrorBoundary from './components/ErrorBoundary';
import useNetworkStatus from './hooks/useNetworkStatus';

import {
  DashboardIcon, UserIcon, StudentsIcon, StaffIcon, AttendanceIcon, GradingIcon,
  TimetableIcon, FeesIcon, SecurityIcon, SettingsIcon,
  BillingIcon, SignOutIcon, MenuIcon, CloseIcon, ChevronDownIcon,
  OverviewIcon, SchoolsIcon, PaymentsIcon, HistoryIcon, RevenueIcon,
  ActivityIcon, RecoveryIcon, StatusDotIcon, ZapIcon, SubscriptionsIcon, MessageIcon,
  DownloadIcon, UploadIcon, RefreshIcon, LogoMarkBW, BookIcon, FlagIcon
} from './components/Common/Icons';

// --- Sidebar nav link helper ------------------------------------------------
function SbLink({ to, icon: Icon, label, onClick, exact = false, locked = false, red = false }) {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to && location.search === ''
    : location.pathname === to || (to.includes('?') && location.search.includes(to.split('?')[1]));

  const finalClass = `nav-item${isActive ? ' active' : ''}${locked ? ' nav-locked' : ''}${red ? ' nav-red' : ''}`;

  return (
    <NavLink
      to={to}
      end={exact}
      className={finalClass}
      onClick={onClick}
    >
      <span className="nav-icon">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="nav-label">{label}</span>
      {locked && <span className="nav-lock-badge" style={{ fontSize:'0.55rem', background:'var(--danger)', color:'white', padding:'2px 6px', borderRadius:10, marginLeft:'auto', fontWeight: 800 }}>UPGRADE</span>}
    </NavLink>
  );
}

// --- Sidebar section label ------------------------------------------------
function SbSection({ label }) {
  return <div className="sidebar-section">{label}</div>;
}

// === SIDEBAR ================================================================
function Sidebar({ isOpen, onClose, onLogout, currentUser, subscriptionActive }) {
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
        window.dispatchEvent(new Event('platformSettingsChanged'));
      },
      () => {
        // This school's profile changed (plan upgrade, status, etc.)
        loadProfile();
        window.dispatchEvent(new Event('schoolProfileChanged'));
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

  const [features, setFeatures] = useState({
    library: false,
    timetable: false,
    attendance: false,
    grading: false,
    fees: false,
    sms: false,
    lms: false,
    exam_scheduling: false,
    teacher_portal: false,
    parent_portal: false,
    mpesa: false,
    whatsapp: false,
    nemis: false,
  });

  useEffect(() => {
    const checkFeatures = async () => {
      const keys = [
        'library', 'timetable', 'attendance', 'grading', 'fees', 'sms', 'lms', 
        'exam_scheduling', 'teacher_portal', 'parent_portal', 'mpesa', 'whatsapp', 'nemis'
      ];
      
      try {
        const results = await Promise.all(keys.map(k => isFeatureEnabled(k)));
        const f = {};
        keys.forEach((k, i) => { f[k] = results[i]; });
        setFeatures(f);
      } catch (err) {
        console.error("Feature check failed:", err);
      }
    };
    if (currentUser) checkFeatures();

    // Re-evaluate features when platform settings change in real-time
    window.addEventListener('platformSettingsChanged', checkFeatures);
    window.addEventListener('schoolProfileChanged', checkFeatures);
    return () => {
      window.removeEventListener('platformSettingsChanged', checkFeatures);
      window.removeEventListener('schoolProfileChanged', checkFeatures);
    };
  }, [currentUser, profile]);

  const role        = currentUser?.role?.toLowerCase() || 'teacher';
  const isAdmin     = role === 'admin';
  const isTeacher   = role === 'teacher';
  const isLibrarian = role === 'librarian';
  const isFinance   = role === 'finance';

  // Sandbox plan: show all modules in sidebar but locked with UPGRADE badge
  const isSandbox   = profile?.subscriptionPlan?.toLowerCase() === 'sandbox';

  const isPlatformAdmin = currentUser?.email === 'admin@shulesoft.com'
    || currentUser?.email === 'shulesoft8@gmail.com';

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
          <SbSection label="Overview" />
          <SbLink to="/super-admin"                          icon={OverviewIcon}   label="Dashboard"        onClick={onClose} exact />
          <SbLink to="/super-admin?tab=schools"              icon={SchoolsIcon}    label="Schools"          onClick={onClose} />
          <SbLink to="/super-admin?tab=payments"             icon={PaymentsIcon}   label="Payments"         onClick={onClose} />
          <SbLink to="/super-admin?tab=history"              icon={HistoryIcon}    label="Payment History"  onClick={onClose} />
          <SbSection label="Analytics" />
          <SbLink to="/super-admin?tab=subscriptions"        icon={BillingIcon}    label="Subscriptions"    onClick={onClose} />
          <SbLink to="/super-admin?tab=revenue"              icon={RevenueIcon}    label="Revenue"          onClick={onClose} />
          <SbLink to="/super-admin?tab=activity"             icon={ActivityIcon}   label="Activity Log"     onClick={onClose} />
          <SbSection label="System" />
          <SbLink to="/super-admin?tab=config"               icon={SettingsIcon}   label="Settings"         onClick={onClose} />
          <SbLink to="/super-admin?tab=recovery"             icon={RecoveryIcon}   label="Data Recovery"    onClick={onClose} />
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
          <button className="sb-signout-btn" onClick={onLogout}>
            <SignOutIcon size={15} strokeWidth={1.75} />
            <span>Sign Out</span>
          </button>
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
        <SbLink to="/dashboard" icon={DashboardIcon} label="Dashboard" onClick={onClose} locked={(!subscriptionActive && !isSandbox) && !isPlatformAdmin} />
        
        {/* Teachers, Admins, Finance and Librarians manage students */}
        {(isTeacher || isAdmin || isFinance || isLibrarian) && (
          <SbLink to="/students"  icon={StudentsIcon}  label="Students"  onClick={onClose} locked={(!subscriptionActive && !isSandbox) && !isPlatformAdmin} />
        )}
        
        {/* Only Admins manage staff */}
        {isAdmin && (
          <SbLink to="/teachers" icon={StaffIcon} label="Staff" onClick={onClose} locked={(!subscriptionActive && !isSandbox) && !isPlatformAdmin} />
        )}

        {/* Librarians, Teachers, and Admins can see the Library catalog */}
        {(isLibrarian || isTeacher || isAdmin) && (features.library || isSandbox) && (
          <SbLink to="/library" icon={BookIcon} label="Library" onClick={onClose} locked={(!subscriptionActive || (isSandbox && !features.library)) && !isPlatformAdmin} />
        )}

        {/* Academic section - always visible for Sandbox, else gated */}
        {(isTeacher || isAdmin) && (isSandbox || features.attendance || features.grading || features.timetable || features.lms) && (
          <SbSection label="Academics" />
        )}
        
        {(isAdmin || isTeacher) && (features.attendance || isSandbox) && (
          <SbLink to="/attendance" icon={AttendanceIcon} label="Attendance" onClick={onClose} locked={!subscriptionActive && !isPlatformAdmin} />
        )}
        
        {(isAdmin || isTeacher) && (
          <SbLink to="/academics" icon={GradingIcon} label="Grading & Exams" onClick={onClose} locked={!subscriptionActive && !isPlatformAdmin} />
        )}
        
        {/* Timetable — Reactivated for Sandbox/Production */}
        {(isTeacher || isAdmin) && (features.timetable || isSandbox) && (
          <SbLink to="/timetable" icon={TimetableIcon} label="Timetable" onClick={onClose} locked={!subscriptionActive && !isPlatformAdmin} />
        )}

        {/* E-Learning — Reactivated for Sandbox/Production */}
        {(isTeacher || isAdmin) && (features.lms || isSandbox) && (
          <SbLink to="/lms" icon={ActivityIcon} label="E-Learning" onClick={onClose} locked={!subscriptionActive && !isPlatformAdmin} />
        )}

        {/* Administration/Finance section - always visible for Sandbox, else gated */}
        {(isAdmin || isFinance) && (isSandbox || features.fees || isAdmin) && (
          <SbSection label="Administration" />
        )}
        
        {(isAdmin || isFinance) && (features.fees || isSandbox) && (
          <SbLink to="/fees" icon={FeesIcon} label="Fees & Billing" onClick={onClose} locked={!subscriptionActive && !isPlatformAdmin} />
        )}

        

        {isAdmin && (features.sms || isSandbox) && (
          <SbLink to="/communications" icon={MessageIcon} label="Comm. Center" onClick={onClose} locked={!subscriptionActive && !isPlatformAdmin} />
        )}

        {(isAdmin || isTeacher) && (features.teacher_portal || isSandbox) && (
          <SbLink to="/portal/teacher" icon={StaffIcon} label="Teacher Portal" onClick={onClose} locked={!subscriptionActive && !isPlatformAdmin} />
        )}

        {isAdmin && (features.parent_portal || isSandbox) && (
          <SbLink to="/portal/parent" icon={UserIcon} label="Parent Portal" onClick={onClose} locked={(!subscriptionActive || (isSandbox && !features.parent_portal)) && !isPlatformAdmin} />
        )}
        {/* Compliance section - Admins ONLY (as requested: no finance) */}
        {isAdmin && (
          <>
            <SbSection label="Compliance" />
            <SbLink to="/compliance/nemis" icon={FlagIcon} label="NEMIS Audit" onClick={onClose} locked={false} />
          </>
        )}

        <SbSection label="Resources" />
        <SbLink to="/help" icon={BookIcon} label="Help Center" onClick={onClose} />
        
        {/* Strictly Admin-only settings */}
        {isAdmin && (
          <>
            <SbSection label="System" />
            <SbLink to="/security" icon={SecurityIcon} label="Security" onClick={onClose} />
            <SbLink to="/billing"  icon={SubscriptionsIcon}  label="Subscription" onClick={onClose} red={!subscriptionActive} />
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
                {profile?.subscriptionPlan || (subscriptionActive ? 'Active' : 'Restricted')}
              </span>
            </div>
          </div>
        </div>
        <button className="sb-logout-btn" onClick={onLogout}>
          <SignOutIcon size={15} strokeWidth={1.75} />
          <span>Sign Out</span>
        </button>
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

            setCurrentUser({
              id         : userRecord.id,
              name       : userRecord.name,
              email      : userRecord.email || session.user.email,
              role       : userRecord.role,
              schoolName : userRecord.schools?.name,
              school_id  : (realIsPlatAdmin && isActingAs && overrideSchoolId) ? overrideSchoolId : userRecord.school_id,
              password_changed: userRecord.password_changed
            });
            const profileData = await getSchoolProfile();
            setProfile(profileData);

            const isSubActive = await checkIsSubscriptionActive(profileData);
            setSubscriptionActive(realIsPlatAdmin || isSubActive);
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
          <Route path="/portal/*"           element={<PortalManager />} />
          <Route path="/staff/*"            element={<StaffPortalManager />} />
          <Route path="*"                   element={<Landing />} />
        </Routes>
      </Suspense>
      </>
    );
  }

  // --- Platform Admin ---
  if (isPlatformAdmin) {
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

        {/* Page content */}
        <div className="page-content">
          <Suspense fallback={<Loader />}>
            <ErrorBoundary>
              <Routes>
                {!subscriptionActive ? (
                  <>
                    <Route path="/billing"  element={<Billing currentUser={currentUser} />} />
                    <Route path="/support"  element={<ContactSupport />} />
                    <Route path="/login"    element={<Navigate to="/billing" replace />} />
                    <Route path="/"        element={<Navigate to="/billing" replace />} />
                    <Route path="*"        element={<Navigate to="/billing" replace />} />
                  </>
                ) : (
                  <>
                    {/* Redirects for logged-in users */}
                    <Route path="/login"     element={<Navigate to="/dashboard" replace />} />
                    <Route path="/"         element={<Navigate to="/dashboard" replace />} />

                    {/* Shared Dashboard */}
                    <Route path="/dashboard" element={<Dashboard currentUser={currentUser} onLogout={handleLogout} currentPeriodId={currentPeriodId} />} />
                    <Route path="/help"      element={<HelpCenter />} />
                    
                    {/* Academic Routes: Admin & Teacher */}
                    {(isAdmin || isTeacher) && (
                      <>
                        <Route path="/students"     element={<Students currentUser={currentUser} currentPeriodId={currentPeriodId} />} />
                        <Route path="/attendance"   element={<SectionGate featureSlug="attendance" featureName="Attendance" profile={profile}><Attendance currentUser={currentUser} currentPeriodId={currentPeriodId} /></SectionGate>}  />
                        <Route path="/academics"    element={<SectionGate featureSlug="grading" featureName="Grading & Exams" profile={profile}><Academics currentUser={currentUser} currentPeriodId={currentPeriodId} /></SectionGate>}  />
                        {/* Timetable and E-Learning routes */}
                        <Route path="/timetable"    element={<SectionGate featureSlug="timetable" featureName="Timetable" profile={profile}><Timetable currentUser={currentUser} currentPeriodId={currentPeriodId} periods={periods} /></SectionGate>} />
                        <Route path="/lms"          element={<SectionGate featureSlug="lms" featureName="E-Learning" profile={profile}><LMS currentUser={currentUser} /></SectionGate>} />
                      </>
                    )}

                    {/* Finance Routes: Admin & Finance */}
                    {(isAdmin || isFinance) && (
                      <>
                        <Route path="/fees"      element={<SectionGate featureSlug="fees" featureName="Fees" profile={profile}><Fees currentUser={currentUser} currentPeriodId={currentPeriodId} /></SectionGate>} />
                      </>
                    )}

                    {/* Communications Routes: Admin */}
                    {isAdmin && (
                      <Route path="/communications" element={<SectionGate featureSlug="sms" featureName="Communications" profile={profile}><Communications currentUser={currentUser} /></SectionGate>} />
                    )}

                    {/* Library Routes: Admin, Librarian & Teacher (View Only) */}
                    {(isAdmin || isLibrarian || isTeacher) && (
                      <Route path="/library/*" element={<SectionGate featureSlug="library" featureName="Library" profile={profile}><Library currentUser={currentUser} currentPeriodId={currentPeriodId} /></SectionGate>} />
                    )}

                    {/* Admin-Only Routes */}
                    {isAdmin && (
                      <>
                        <Route path="/teachers" element={<Teachers currentUser={currentUser} currentPeriodId={currentPeriodId} />} />
                        <Route path="/security" element={<Security currentUser={currentUser} />} />
                        <Route path="/settings" element={<Settings currentUser={currentUser} />} />
                        <Route path="/billing"  element={<Billing currentUser={currentUser} />} />
                        <Route path="/compliance/nemis" element={<NEMISDashboard currentUser={currentUser} />} />
                        <Route path="/portal/teacher" element={<SectionGate featureSlug="teacher_portal" featureName="Teacher Portal" profile={profile}><div style={{padding:40}}>Teacher Portal Management (Coming Soon)</div></SectionGate>} />
                        <Route path="/portal/parent"  element={<SectionGate featureSlug="parent_portal"  featureName="Parent Portal"  profile={profile}><div style={{padding:40}}>Parent Portal Management (Coming Soon)</div></SectionGate>} />
                      </>
                    )}

                    <Route path="*"         element={<div style={{padding:48, textAlign:'center'}}><h2>403 - Unauthorized</h2><p>You don't have permission to access this module.</p></div>} />
                  </>
                )}
              </Routes>
            </ErrorBoundary>
          </Suspense>
        </div>
      </main>

      {/* Global Print Overlay Header & Footer */}
      {profile?.logo && (
        <div className="global-print-element global-print-header" style={{ margin: '15mm' }}>
          <img src={profile.logo} alt="School Logo" style={{ height: 50, objectFit: 'contain' }} />
        </div>
      )}
      <div className="global-print-element global-print-footer" style={{ margin: '15mm', opacity: 0.8 }}>
        <LogoMarkBW size={20} />
      </div>

    </div>
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
  if (!hasAccess) return <PricingUpgrade featureName={featureName} />;
  
  return children;
}

export default App;

