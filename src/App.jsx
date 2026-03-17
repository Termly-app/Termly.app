import { useState, useEffect, Component } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { 
  getSchoolProfile, 
  setCurrentSchoolContext, 
  getUserByAuthId, 
  getPeriods, 
  setActivePeriod, 
  initActivePeriod,
  getCurrentPeriodId,
  checkIsSubscriptionActive
} from './data/store';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Grading from './pages/Grading';
import Fees from './pages/Fees';
import Attendance from './pages/Attendance';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Security from './pages/Security';
import Billing from './pages/Billing';
import SuperAdmin from './pages/SuperAdmin';
import Landing from './pages/Landing';
import Register from './pages/Register';
import TermsOfService from './pages/legal/TermsOfService';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import AcceptableUse from './pages/legal/AcceptableUse';
import RefundPolicy from './pages/legal/RefundPolicy';
import ServiceLevel from './pages/legal/ServiceLevel';
import ContactSupport from './pages/ContactSupport';
import AboutUs from './pages/AboutUs';
import FAQ from './pages/FAQ';
import SecurityTrust from './pages/SecurityTrust';
import Docs from './pages/Docs';
import CustomCursor from './components/Common/CustomCursor';
import Loader from './components/Common/Loader';

import ScrollToTop from './components/ScrollToTop';

function Sidebar({ isOpen, onClose, onLogout, currentUser, subscriptionActive }) {
  const [schoolName, setSchoolName] = useState('ShuleSoft');
  const [profile, setProfile] = useState(null);
  const [periods, setPeriods] = useState([]);
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
    window.addEventListener('periodChanged', loadPeriods);
    window.addEventListener('schoolChanged', loadPeriods);
    
    return () => {
      window.removeEventListener('schoolProfileChanged', loadProfile);
      window.removeEventListener('periodChanged', loadPeriods);
      window.removeEventListener('schoolChanged', loadPeriods);
    };
  }, []);

  const handlePeriodChange = async (e) => {
    const periodId = e.target.value;
    await setActivePeriod(periodId);
    setSelectedPeriod(periodId);
  };

  const role = currentUser?.role?.toLowerCase() || 'teacher';
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isFinance = role === 'finance';

  const isPlatformAdmin = currentUser?.email === 'admin@shulesoft.com' || currentUser?.email === 'shulesoft8@gmail.com';

  if (isPlatformAdmin) {
    return (
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sb-brand">
          <div className="sb-logo">S</div>
          <div className="sb-brand-txt">
            <div className="sb-name">Shulesoft HQ</div>
            <div className="sb-tag">MANAGEMENT SYSTEM</div>
          </div>
        </div>

        <div className="sidebar-dropdown">
          <label>ACADEMIC PERIOD</label>
          <select className="custom-select" value={selectedPeriod || ''} onChange={handlePeriodChange}>
            {periods.map(p => (
              <option key={p.id} value={p.id} style={{ color: '#000' }}>
                {p.year} — Term {p.term} {p.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        <nav style={{ flex: 1, paddingBottom: '32px' }}>
          <div className="sidebar-sec-lbl">GENERAL</div>
          <NavLink to="/super-admin" end className={({ isActive }) => `sb-link ${isActive && location.search === '' ? 'on' : ''}`} onClick={onClose}>
            <div className="nav-ico ni-v">◈</div>Overview
          </NavLink>
          <NavLink to="/super-admin?tab=schools" className={({ isActive }) => `sb-link ${isActive || location.search.includes('tab=schools') ? 'on' : ''}`} onClick={onClose}>
            <div className="nav-ico ni-t">🏫</div>Schools
          </NavLink>
          <NavLink to="/super-admin?tab=payments" className={({ isActive }) => `sb-link ${isActive || location.search.includes('tab=payments') ? 'on' : ''}`} onClick={onClose}>
            <div className="nav-ico ni-a">💳</div>Payments
          </NavLink>
          <NavLink to="/super-admin?tab=subscriptions" className={({ isActive }) => `sb-link ${isActive || location.search.includes('tab=subscriptions') ? 'on' : ''}`} onClick={onClose}>
            <div className="nav-ico ni-s">📅</div>Subscriptions
          </NavLink>
          <NavLink to="/super-admin?tab=revenue" className={({ isActive }) => `sb-link ${isActive || location.search.includes('tab=revenue') ? 'on' : ''}`} onClick={onClose}>
            <div className="nav-ico ni-v">📈</div>Revenue
          </NavLink>
          <NavLink to="/super-admin?tab=activity" className={({ isActive }) => `sb-link ${isActive || location.search.includes('tab=activity') ? 'on' : ''}`} onClick={onClose}>
            <div className="nav-ico ni-t">⚡</div>Activity
          </NavLink>
          <NavLink to="/super-admin?tab=settings" className={({ isActive }) => `sb-link ${isActive || location.search.includes('tab=settings') ? 'on' : ''}`} onClick={onClose}>
            <div className="nav-ico ni-d">⚙</div>Settings
          </NavLink>
        </nav>

        <div className="sb-footer">
          <div className="status-card">
            <div className="status-top">
              <span className="status-lbl">STATUS</span>
              <div className="status-dot-box">
                <span className="status-dot"></span> Active
              </div>
            </div>
            <div className="status-name">{profile?.schoolName || 'Kaulani Corp'}</div>
          </div>
          <button className="btn-signout" onClick={onLogout}>
            <span>⬡</span> Sign Out
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-img" style={{ background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 13 13" fill="none" width="24" height="24">
            <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="white"/>
            <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill="rgba(255,255,255,.5)"/>
            <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill="rgba(255,255,255,.5)"/>
            <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill="rgba(255,255,255,.2)"/>
          </svg>
        </div>
        <div className="sidebar-logo-txt">
          <div className="sidebar-logo-name">ShuleSoft</div>
          <div className="sidebar-logo-sub">SCHOOL PORTAL</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">GENERAL</div>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="nav-icon">📊</span> Dashboard
        </NavLink>
        <NavLink to="/students" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="nav-icon">🎓</span> Students
        </NavLink>
        {isAdmin && (
          <NavLink to="/teachers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">👩‍🏫</span> Staff
          </NavLink>
        )}
        
        <div className="sidebar-section">ACADEMICS</div>
        {(isAdmin || isTeacher) && (
          <NavLink to="/attendance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">📋</span> Attendance
          </NavLink>
        )}
        <NavLink to="/grading" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="nav-icon">📝</span> Grading
        </NavLink>

        <div className="sidebar-section">ADMINISTRATION</div>
        {!isTeacher && (
          <NavLink to="/fees" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">💰</span> Fees & Billing
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/security" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🛡️</span> Security
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/billing" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">💳</span> Subscriptions
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">⚙️</span> Settings
          </NavLink>
        )}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-school-badge">
          <div className="school-avatar">{schoolName.charAt(0)}</div>
          <div className="school-info">
            <div className="school-name">{schoolName}</div>
            <div className="school-plan">
              <span className={`badge ${subscriptionActive ? 'badge-success sm' : 'badge-danger sm'}`} style={{ 
                textTransform: 'uppercase',
                background: subscriptionActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: subscriptionActive ? '#10B981' : '#EF4444',
                border: `1px solid ${subscriptionActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
              }}>
                {profile?.subscriptionPlan || (subscriptionActive ? 'Active' : 'Restricted')}
              </span>
            </div>
          </div>
        </div>
        <button className="sb-logout-btn" onClick={onLogout}>
          <span className="sb-logout-ico">🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, background: '#fee2e2', color: '#991b1b', height: '100vh', width: '100vw' }}>
          <h2>Something went wrong in the component tree.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [subscriptionActive, setSubscriptionActive] = useState(true);
  const [currentPeriodId, setPeriodId] = useState(getCurrentPeriodId());
  const [periods, setPeriods] = useState([]);
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
            setCurrentSchoolContext(userRecord.school_id, session.user);
            const activePeriod = await initActivePeriod();
            const allPeriods = await getPeriods();
            setPeriods(allPeriods);
            setPeriodId(activePeriod?.id);
            setCurrentUser({
              id: userRecord.id,
              name: userRecord.name,
              email: userRecord.email || session.user.email,
              role: userRecord.role,
              schoolName: userRecord.schools?.name,
            });

            const profileData = await getSchoolProfile();
            const PLATFORM_ADMINS = ['admin@shulesoft.com', 'shulesoft8@gmail.com'];
            const isPlatAdmin = session.user.email && PLATFORM_ADMINS.includes(session.user.email);
            const isSubActive = await checkIsSubscriptionActive(profileData);
            setSubscriptionActive(isPlatAdmin || isSubActive);
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
      window.removeEventListener('periodChanged', handleGlobalPeriodRefresh);
      window.removeEventListener('schoolChanged', handleGlobalPeriodRefresh);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentSchoolContext(null, null);
    setCurrentUser(null);
  };

  const loadPeriods = async () => {
    // This is just a trigger to refresh sidebar
    window.dispatchEvent(new CustomEvent('periodChanged'));
  };

  const isPlatformAdmin = currentUser?.email && ['admin@shulesoft.com', 'shulesoft8@gmail.com'].includes(currentUser.email);

  return (
    <>
      <CustomCursor disabled={!isPlatformAdmin && currentUser} />
      {authLoading ? (
        <Loader />
      ) : !currentUser ? (
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login onLogin={setCurrentUser} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/legal/terms" element={<TermsOfService />} />
          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
          <Route path="/legal/acceptable-use" element={<AcceptableUse />} />
          <Route path="/legal/refunds" element={<RefundPolicy />} />
          <Route path="/legal/service-level" element={<ServiceLevel />} />
          <Route path="/support" element={<ContactSupport />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/security-trust" element={<SecurityTrust />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      ) : (
        <div className={`app-layout ${isPlatformAdmin ? 'theme-onyx' : 'app-shell'}`}>
          <>
            {!isPlatformAdmin && (
              <>
                <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                  {sidebarOpen ? '✕' : '☰'}
                </button>
                {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
              </>
            )}
            
            <Sidebar 
              isOpen={sidebarOpen} 
              onClose={() => setSidebarOpen(false)} 
              onLogout={handleLogout} 
              currentUser={currentUser} 
              subscriptionActive={subscriptionActive} 
            />

            <main className="main-content">
              {!isPlatformAdmin && (
                <div className="topbar">
                  <div className="topbar-title desktop-only">School Control Center</div>
                  <div className="topbar-title mobile-only">ShuleSoft</div>
                  <div className="topbar-actions">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>PERIOD:</span>
                      <select 
                        className="topbar-program-select" 
                        value={currentPeriodId || ''} 
                        onChange={async (e) => {
                          await setActivePeriod(e.target.value);
                        }}
                      >
                        <option value="">Select Period</option>
                        {periods.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.year} {p.term} {p.is_active ? '(Active)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="topbar-avatar" style={{ border: '2px solid var(--primary-light)' }}>
                      {currentUser?.name?.charAt(0) || 'U'}
                    </div>
                  </div>
                </div>
              )}

              <div className={!isPlatformAdmin ? "page-content" : ""}>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard currentUser={currentUser} onLogout={handleLogout} />} />
                    <Route path="/students" element={subscriptionActive ? <Students currentUser={currentUser} /> : <Navigate to="/billing" />} />
                    <Route path="/teachers" element={subscriptionActive ? <Teachers currentUser={currentUser} /> : <Navigate to="/billing" />} />
                    <Route path="/grading" element={subscriptionActive ? <Grading currentUser={currentUser} /> : <Navigate to="/billing" />} />
                    <Route path="/fees" element={subscriptionActive ? <Fees currentUser={currentUser} /> : <Navigate to="/billing" />} />
                    <Route path="/attendance" element={subscriptionActive ? <Attendance currentUser={currentUser} /> : <Navigate to="/billing" />} />
                    <Route path="/security" element={<Security currentUser={currentUser} />} />
                    <Route path="/settings" element={<Settings currentUser={currentUser} />} />
                    <Route path="/super-admin" element={<SuperAdmin currentUser={currentUser} />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/" element={<Navigate to={isPlatformAdmin ? "/super-admin" : "/dashboard"} replace />} />
                    <Route path="*" element={<Navigate to={isPlatformAdmin ? "/super-admin" : "/dashboard"} replace />} />
                  </Routes>
                </ErrorBoundary>
              </div>
            </main>
          </>
        </div>
      )}
    </>
  );
}

export default App;
