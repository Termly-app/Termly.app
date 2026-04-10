import { useState, useEffect, Component } from 'react';
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
} from './data/store';

// Pages
import Dashboard    from './pages/Dashboard';
import Students     from './pages/Students';
import Teachers     from './pages/Teachers';
import Grading      from './pages/Grading';
import Fees         from './pages/Fees';
import Timetable    from './pages/Timetable';
import Attendance   from './pages/Attendance';
import Library      from './pages/Library';
import Settings     from './pages/Settings';
import Login        from './pages/Login';
import Security     from './pages/Security';
import Billing      from './pages/Billing';
import Communications from './pages/Communications';
import SuperAdmin   from './pages/SuperAdmin';
import Landing      from './pages/Landing';
import Register     from './pages/Register';
import MpesaReconciliation from './pages/MpesaReconciliation';
import PortalManager from './pages/Portal';
import StaffPortalManager from './pages/StaffPortal';
import LMS          from './pages/LMS';
import TermsOfService  from './pages/legal/TermsOfService';
import PrivacyPolicy   from './pages/legal/PrivacyPolicy';
import AcceptableUse   from './pages/legal/AcceptableUse';
import RefundPolicy    from './pages/legal/RefundPolicy';
import ServiceLevel    from './pages/legal/ServiceLevel';
import ContactSupport  from './pages/ContactSupport';
import AboutUs         from './pages/AboutUs';
import FAQ             from './pages/FAQ';
import SecurityTrust   from './pages/SecurityTrust';
import Docs            from './pages/Docs';
import Blog            from './pages/Blog';
import Partners        from './pages/Partners';
import ForgotPassword  from './pages/ForgotPassword';
import ResetPassword   from './pages/ResetPassword';
import Loader          from './components/Common/Loader';
import SyncIndicator from './components/Common/SyncIndicator';
import HelpCenter from './pages/HelpCenter';
import PricingUpgrade from './components/PricingUpgrade';
import Select from './components/Common/Select';

import {
  DashboardIcon, UserIcon, StudentsIcon, StaffIcon, AttendanceIcon, GradingIcon,
  TimetableIcon, FeesIcon, SecurityIcon, SettingsIcon,
  BillingIcon, SignOutIcon, MenuIcon, CloseIcon, ChevronDownIcon,
  OverviewIcon, SchoolsIcon, PaymentsIcon, HistoryIcon, RevenueIcon,
  ActivityIcon, RecoveryIcon, StatusDotIcon, ZapIcon, SubscriptionsIcon, MessageIcon,
  DownloadIcon, UploadIcon, RefreshIcon, ShieldIcon, LogoMarkBW, BookIcon
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
        <SbLink to="/dashboard" icon={DashboardIcon} label="Dashboard" onClick={onClose} locked={!subscriptionActive && !isSandbox} />
        
        {/* Teachers and Admins manage students */}
        {(isTeacher || isAdmin) && (
          <SbLink to="/students"  icon={StudentsIcon}  label="Students"  onClick={onClose} locked={!subscriptionActive && !isSandbox} />
        )}
        
        {/* Only Admins manage staff */}
        {isAdmin && (
          <SbLink to="/teachers" icon={StaffIcon} label="Staff" onClick={onClose} locked={!subscriptionActive && !isSandbox} />
        )}

        {/* Librarians and Admins manage library */}
        {(isLibrarian || isAdmin) && (features.library || isSandbox) && (
          <SbLink to="/library" icon={BookIcon} label="Library" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.library)} />
        )}

        {/* Academic section - always visible for Sandbox, else gated */}
        {(isTeacher || isAdmin) && (isSandbox || features.attendance || features.grading || features.timetable || features.lms) && (
          <SbSection label="Academics" />
        )}
        
        {(isTeacher || isAdmin) && (features.attendance || isSandbox) && (
          <SbLink to="/attendance" icon={AttendanceIcon} label="Attendance" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.attendance)} />
        )}
        
        {(isTeacher || isAdmin) && (features.grading || isSandbox) && (
          <SbLink to="/grading"   icon={GradingIcon}   label="Grading"    onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.grading)} />
        )}
        
        {(isTeacher || isAdmin) && (features.timetable || isSandbox) && (
          <SbLink to="/timetable" icon={TimetableIcon} label={features.exam_scheduling ? "Scheduling" : "Timetable"} onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.timetable)} />
        )}

        {(isTeacher || isAdmin) && (features.lms || isSandbox) && (
          <SbLink to="/lms" icon={ActivityIcon} label="E-Learning" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.lms)} />
        )}

        {/* Administration/Finance section - always visible for Sandbox, else gated */}
        {(isAdmin || isFinance) && (isSandbox || features.fees || isAdmin) && (
          <SbSection label="Administration" />
        )}
        
        {(isAdmin || isFinance) && (features.fees || isSandbox) && (
          <SbLink to="/fees" icon={FeesIcon} label="Fees & Billing" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.fees)} />
        )}

        

        {isAdmin && (features.sms || isSandbox) && (
          <SbLink to="/communications" icon={MessageIcon} label="Comm. Center" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.sms)} />
        )}

        {(isAdmin || isTeacher) && (features.teacher_portal || isSandbox) && (
          <SbLink to="/portal/teacher" icon={StaffIcon} label="Teacher Portal" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.teacher_portal)} />
        )}

        {isAdmin && (features.parent_portal || isSandbox) && (
          <SbLink to="/portal/parent" icon={UserIcon} label="Parent Portal" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.parent_portal)} />
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
                  background : subscriptionActive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  color      : subscriptionActive ? '#10B981'               : '#EF4444',
                  border     : `1px solid ${subscriptionActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
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

// --- ERROR BOUNDARY ---
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 48, background: '#fef2f2', color: '#991b1b',
          height: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
            An error occurred
          </div>
          <div style={{ fontSize: '.85rem', color: '#B91C1C', marginBottom: 20 }}>
            Please refresh the page. If the problem persists, contact support.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px', borderRadius: 8, background: '#DC2626',
              color: '#fff', border: 'none', cursor: 'pointer', fontSize: '.85rem',
            }}
          >
            Refresh Page
          </button>
          <details style={{ marginTop: 20, fontSize: '.75rem', color: '#9CA3AF', whiteSpace: 'pre-wrap', maxWidth: 600 }}>
            {this.state.error?.toString()}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        <Routes>
          <Route path="/"                   element={<Landing />} />
          <Route path="/login"              element={<Login onLogin={setCurrentUser} />} />
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
      </>
    );
  }

  // --- Platform Admin ---
  if (isPlatformAdmin) {
    return (
      <>
        <div className="admin-layout">
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
            <Route path="*" element={<Navigate to="/super-admin" replace />} />
          </Routes>
        </div>
      </>
    );
  }

  // --- School portal ---
  return (
    <div className="app-layout app-shell">
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
          <ErrorBoundary>
            <Routes>
              {!subscriptionActive ? (
                <>
                  <Route path="/billing"  element={<Billing currentUser={currentUser} />} />
                  <Route path="/support"  element={<ContactSupport />} />
                  <Route path="*"         element={<Navigate to="/billing" replace />} />
                </>
              ) : (
                <>
                  {/* Shared Dashboard */}
                  <Route path="/dashboard" element={<Dashboard currentUser={currentUser} onLogout={handleLogout} currentPeriodId={currentPeriodId} />} />
                  <Route path="/help"      element={<HelpCenter />} />
                  
                  {/* Academic Routes: Admin & Teacher */}
                  {(isAdmin || isTeacher) && (
                    <>
                      <Route path="/students"     element={<Students currentUser={currentUser} currentPeriodId={currentPeriodId} />} />
                      <Route path="/grading"      element={<SectionGate featureSlug="grading" featureName="Grading" profile={profile}><Grading currentUser={currentUser} currentPeriodId={currentPeriodId} /></SectionGate>} />
                      <Route path="/attendance"   element={<SectionGate featureSlug="attendance" featureName="Attendance" profile={profile}><Attendance currentUser={currentUser} currentPeriodId={currentPeriodId} /></SectionGate>} />
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

                  {/* Library Routes: Admin & Librarian */}
                  {(isAdmin || isLibrarian) && (
                    <Route path="/library" element={<SectionGate featureSlug="library" featureName="Library" profile={profile}><Library currentUser={currentUser} currentPeriodId={currentPeriodId} /></SectionGate>} />
                  )}

                  {/* Admin-Only Routes */}
                  {isAdmin && (
                    <>
                      <Route path="/teachers" element={<Teachers currentUser={currentUser} currentPeriodId={currentPeriodId} />} />
                      <Route path="/security" element={<Security currentUser={currentUser} />} />
                      <Route path="/settings" element={<Settings currentUser={currentUser} />} />
                      <Route path="/billing"  element={<Billing currentUser={currentUser} />} />
                      <Route path="/portal/teacher" element={<SectionGate featureSlug="teacher_portal" featureName="Teacher Portal" profile={profile}><div style={{padding:40}}>Teacher Portal Management (Coming Soon)</div></SectionGate>} />
                      <Route path="/portal/parent"  element={<SectionGate featureSlug="parent_portal"  featureName="Parent Portal"  profile={profile}><div style={{padding:40}}>Parent Portal Management (Coming Soon)</div></SectionGate>} />
                    </>
                  )}

                  <Route path="*"         element={<div style={{padding:48, textAlign:'center'}}><h2>403 - Unauthorized</h2><p>You don't have permission to access this module.</p></div>} />
                </>
              )}
            </Routes>
          </ErrorBoundary>
        </div>
      </main>
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

