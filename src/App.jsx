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
  getFeeStructure,
  saveFeeStructure,
  deleteFeeItem,
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
import FeeStructure from './pages/FeeStructure';
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

import {
  LogoMark,
  DashboardIcon, StudentsIcon, StaffIcon, AttendanceIcon, GradingIcon,
  TimetableIcon, FeesIcon, FeeStructureIcon, SecurityIcon, SettingsIcon,
  BillingIcon, SignOutIcon, MenuIcon, CloseIcon, ChevronDownIcon, ClockIcon,
  OverviewIcon, SchoolsIcon, PaymentsIcon, HistoryIcon, RevenueIcon,
  ActivityIcon, RecoveryIcon, StatusDotIcon, PlatformZapIcon, SubscriptionIcon, MessageIcon,
  BookIcon, ClipboardIcon, TeacherIcon, UsersIcon
} from './components/CommonIcons';

// ── Sidebar nav link helper ───────────────────────────────────────────────
function SbLink({ to, icon: Icon, label, onClick, exact = false, locked = false, red = false }) {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to && location.search === ''
    : location.pathname === to || (to.includes('?') && location.search.includes(to.split('?')[1]));

  const finalClass = `sb-nav-item${isActive ? ' on' : ''}${locked ? ' locked' : ''}${red ? ' danger' : ''}`;

  return (
    <NavLink
      to={to}
      end={exact}
      className={finalClass}
      onClick={onClick}
    >
      <div className="sb-nav-glow" />
      <span className="sb-nav-ico">
        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
      </span>
      <span className="sb-nav-lbl">{label}</span>
      {locked && <span className="sb-nav-lock">LOCKED</span>}
    </NavLink>
  );
}

function SbSection({ label }) {
  return <div className="sb-nav-section">{label}</div>;
}

// ══ SIDEBAR ════════════════════════════════════════════════════════════════
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
  const isSandbox   = profile?.subscriptionPlan?.toLowerCase() === 'sandbox' || !subscriptionActive;

  const isPlatformAdmin = currentUser?.email === 'admin@shulesoft.com'
    || currentUser?.email === 'shulesoft8@gmail.com';

  // ── Platform Admin sidebar (Onyx Modern) ────────────────────────────────
  if (isPlatformAdmin) {
    return (
      <aside className={`sb-shell onyx ${isOpen ? 'open' : ''}`}>
        <div className="sb-header">
          <div className="sb-brand">
            <LogoMark size={28} />
            <div className="sb-brand-info">
              <div className="sb-name">ShuleSoft</div>
              <div className="sb-tag">Platform HQ</div>
            </div>
          </div>
        </div>

        <nav className="sb-nav">
          <SbSection label="Core Engine" />
          <SbLink to="/super-admin" icon={DashboardIcon} label="Intelligence" onClick={onClose} exact />
          <SbLink to="/super-admin?tab=schools" icon={SchoolsIcon} label="Entities" onClick={onClose} />
          <SbLink to="/super-admin?tab=payments" icon={PaymentsIcon} label="Finances" onClick={onClose} />
          
          <SbSection label="Ecosystem" />
          <SbLink to="/super-admin?tab=revenue"              icon={RevenueIcon}    label="Revenue"          onClick={onClose} />
          <SbLink to="/super-admin?tab=activity"             icon={ActivityIcon}   label="Telemetry"        onClick={onClose} />
          
          <SbSection label="Kernel" />
          <SbLink to="/super-admin?tab=config" icon={SettingsIcon} label="System" onClick={onClose} />
        </nav>

        <div className="sb-bottom">
          <button className="sb-user-card" onClick={onLogout}>
            <div className="sb-user-avatar">HQ</div>
            <div className="sb-user-meta">
              <div className="sb-user-n">Sign Out</div>
              <div className="sb-user-r">System Admin</div>
            </div>
            <SignOutIcon size={14} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`sb-shell ${isOpen ? 'open' : ''}`}>
      <div className="sb-header">
        <div className="sb-brand">
          <LogoMark size={30} />
          <div className="sb-brand-info">
            <div className="sb-name">ShuleSoft</div>
            <div className="sb-tag">Empowering Education</div>
          </div>
        </div>
      </div>

      <nav className="sb-nav">
        <SbSection label="Control" />
        <SbLink to="/dashboard" icon={DashboardIcon} label="Dashboard" onClick={onClose} locked={!subscriptionActive} />
        
        {(isTeacher || isAdmin) && (
          <SbLink to="/students" icon={StudentsIcon} label="Students" onClick={onClose} locked={!subscriptionActive} />
        )}
        
        {isAdmin && (
          <SbLink to="/teachers" icon={StaffIcon} label="Staff" onClick={onClose} locked={!subscriptionActive} />
        )}

        {(isLibrarian || isAdmin) && (features.library || isSandbox) && (
          <SbLink to="/library" icon={BookIcon} label="Library" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.library)} />
        )}

        {(isTeacher || isAdmin) && (isSandbox || features.attendance || features.grading || features.timetable || features.lms) && (
          <SbSection label="Academics" />
        )}
        
        {(isTeacher || isAdmin) && (features.attendance || isSandbox) && (
          <SbLink to="/attendance" icon={AttendanceIcon} label="Attendance" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.attendance)} />
        )}
        
        {(isTeacher || isAdmin) && (features.grading || isSandbox) && (
          <SbLink to="/grading" icon={GradingIcon} label="Assessment" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.grading)} />
        )}
        
        {(isTeacher || isAdmin) && (features.timetable || isSandbox) && (
          <SbLink to="/timetable" icon={TimetableIcon} label="Scheduling" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.timetable)} />
        )}

        <SbSection label="Management" />
        {(isAdmin || isFinance) && (features.fees || isSandbox) && (
          <SbLink to="/fees" icon={FeesIcon} label="Financials" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.fees)} />
        )}
        
        {isAdmin && (features.sms || isSandbox) && (
          <SbLink to="/communications" icon={MessageIcon} label="Comm. Hub" onClick={onClose} locked={!subscriptionActive || (isSandbox && !features.sms)} />
        )}

        <SbSection label="System" />
        {isAdmin && (
          <>
            <SbLink to="/billing" icon={SubscriptionIcon} label="Account" onClick={onClose} red={!subscriptionActive} />
            <SbLink to="/settings" icon={SettingsIcon} label="Settings" onClick={onClose} />
          </>
        )}
        <SbLink to="/help" icon={BookIcon} label="Help Center" onClick={onClose} />
      </nav>

      <div className="sb-bottom">
        <div className="sb-school-card">
          <div className="sb-sch-av">{schoolName.charAt(0)}</div>
          <div className="sb-sch-info">
            <div className="sb-sch-name">{schoolName}</div>
            <div className="sb-sch-plan">{profile?.subscriptionPlan || 'Foundation Tier'}</div>
          </div>
        </div>
        <button className="sb-logout-action" onClick={onLogout}>
          <SignOutIcon size={14} />
          <span>Exit Portal</span>
        </button>
      </div>
    </aside>
  );
}

// ══ ERROR BOUNDARY ═════════════════════════════════════════════════════════
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

// ══ APP ═══════════════════════════════════════════════════════════════════
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

  // ── Auth loading ────────────────────────────────────────────────────────
  if (authLoading) return <Loader />;

  // ── Not logged in ───────────────────────────────────────────────────────
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

  // ── Platform Admin ──────────────────────────────────────────────────────
  if (isPlatformAdmin) {
    return (
      <>
        <div className="theme-onyx" style={{ minHeight: '100vh', background: '#050505' }}>
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

  // ── School portal ───────────────────────────────────────────────────────
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

      <main className="sb-main">
        <header className="sb-topbar">
          <div className="sb-topbar-left">
            <h2 className="sb-topbar-title desktop-only">Command Tower</h2>
            <h2 className="sb-topbar-title mobile-only">ShuleSoft</h2>
          </div>
          
          <div className="sb-topbar-actions">
            <SyncIndicator />
            <div className="sb-period-pill">
              <span className="sb-period-ico"><ClockIcon size={14} /></span>
              <select
                className="sb-period-select"
                value={currentPeriodId || ''}
                onChange={async (e) => { await setActivePeriod(e.target.value); }}
              >
                <option value="">Select Period</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.year} — Term {p.term}{p.is_active ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="sb-topbar-divider" />
            
            <div className="sb-profile-pill">
              <div className="sb-profile-info">
                <span className="sb-profile-name">{currentUser?.name || 'User'}</span>
                <span className="sb-profile-role">{currentUser?.role || 'Staff'}</span>
              </div>
              <div className="sb-profile-avatar">
                {currentUser?.name?.charAt(0)?.toUpperCase()}
              </div>
            </div>
          </div>
        </header>

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
                      {isAdmin && (
                        <Route path="/fee-structure" element={
                          <SectionGate featureSlug="fees" featureName="Fee Structure" profile={profile}>
                            <FeeStructure
                              schoolId={currentUser?.school_id}
                              schoolName={currentUser?.schoolName}
                              getFeeStructure={getFeeStructure}
                              saveFeeStructure={saveFeeStructure}
                              deleteFeeItem={deleteFeeItem}
                            />
                          </SectionGate>
                        } />
                      )}
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

                  <Route path="*"         element={<div style={{padding:48, textAlign:'center'}}><h2>403 — Unauthorized</h2><p>You don't have permission to access this module.</p></div>} />
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
