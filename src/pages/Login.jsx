import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  findSchool,
  setCurrentSchoolContext,
  initActivePeriod,
  getSchoolByCode,
  searchPublicSchools,
} from '../data/store';
import { 
  getAuthUserDetails, getHqSchool, getUserByEmail, upsertAuthUser, 
  getMatchedUser, updateUserAuthId, getOwnedSchools, getUserRecords 
} from '../data/authStore';
import { CardIcon, DashboardIcon, RocketIcon, FlagIcon, EyeIcon, EyeOffIcon } from '../components/CommonIcons';
import { Helmet } from 'react-helmet-async';

export default function Login({ onLogin }) {
  const { schoolCode } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [brandedSchool, setBrandedSchool] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);

  // Login State
  const [schoolEmail, setSchoolEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
         const results = await searchPublicSchools(searchQuery);
         setSearchResults(results);
      } catch (err) {
         console.error(err);
      } finally {
         setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    async function initBranding() {
      if (schoolCode) {
        try {
          const school = await getSchoolByCode(schoolCode);
          if (school) {
            setBrandedSchool(school);
          } else {
            console.warn(`[Login] No school found for code: ${schoolCode}. Falling back to default.`);
          }
        } catch (e) {
           console.error('[Login] Branding load error:', e);
        }
      }
    }
    initBranding();
  }, [schoolCode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    
    // Provide early error ONLY if we definitely have not identified any context
    // Actually, let's defer it.
    
    setError('');
    setLoading(true);

    try {
      // 0. Smart Credential Routing
      let loginString = email.trim();
      let loginEmail = loginString;
      let targetSchoolRef = brandedSchool || selectedSchool;

      if (/^[0-9+]+$/.test(loginString)) {
         // Mostly numeric - decide if Phone or Adm No
         if (loginString.length >= 9) {
            setError("Phone/SMS authentication is currently coming soon. Please use Email or Adm No.");
            setLoading(false);
            return;
         } else {
            if (!targetSchoolRef) {
               setError('To login with an Admission Number, please search and select your school first.');
               setLoading(false);
               return;
            }
            loginEmail = `${loginString}@${targetSchoolRef.school_code}.Termly.com`.toLowerCase();
         }
      } else if (!loginString.includes('@')) {
          if (!targetSchoolRef) {
             setError('To login with a Username, please search and select your school first.');
             setLoading(false);
             return;
          }
          loginEmail = `${loginString}@${targetSchoolRef.school_code}.Termly.com`.toLowerCase();
      }

      // 1. Authenticate first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      if (authError) throw authError;

      const authUser = authData.user;

      // 2. Fetch all known user records (memberships) for this auth identity
      const userRecords = await getUserRecords(authUser.id);

      const knownSchoolIds = userRecords?.map(u => u.school_id) || [];

      // 3. Fallback: Check if they are the owner of any schools
      const ownedSchools = await getOwnedSchools(authUser.id);
        
      ownedSchools?.forEach(s => {
        if (!knownSchoolIds.includes(s.id)) knownSchoolIds.push(s.id);
      });

      let targetSchoolId = brandedSchool ? brandedSchool.id : (selectedSchool ? selectedSchool.id : null);

      // 4. Resolve target school intelligently 
      if (!targetSchoolId && schoolEmail && schoolEmail.trim()) {
        const emailLower = schoolEmail.trim().toLowerCase();
        // Check if platform admin email
        const isPlat = (import.meta.env.VITE_PLATFORM_ADMIN_WHITELIST || '').split(',').map(e=>e.trim()).includes(emailLower);
        
        const ownerAuth = await getAuthUserDetails(emailLower);
        if (ownerAuth) {
          targetSchoolId = ownerAuth.school_id;
        } else if (isPlat) {
          const hqSchool = await getHqSchool(emailLower);
          if (hqSchool) targetSchoolId = hqSchool.id;
        }
        
        if (!targetSchoolId) throw new Error('No school workspace found for that school email.');
      }

      // 5. Intelligent Auto-select if targetSchoolId is STILL null
      if (!targetSchoolId) {
        if (knownSchoolIds.length === 1) {
          targetSchoolId = knownSchoolIds[0];
        } else if (knownSchoolIds.length > 1) {
          throw new Error('Your account belongs to multiple schools. Please enter the School Workspace Email to specify which one you want to log into.');
        } else {
           // Fallback matching by email (legacy)
           const emailMatch = await getUserByEmail(email.toLowerCase());
           if (emailMatch && emailMatch.length > 0) {
             targetSchoolId = emailMatch[0].school_id;
           } else {
             throw new Error('Access denied. No school workspace found. If you are a staff member, enter the School Workspace Email below.');
           }
        }
      }

      // 6. Complete Login with definitively identified targetSchoolId
      let activeUser = userRecords?.find(u => u.school_id === targetSchoolId);
      
      if (!activeUser && ownedSchools?.find(s => s.id === targetSchoolId)) {
         // Auto-provision owner missing an explicit users row
         const oSchool = ownedSchools.find(s => s.id === targetSchoolId);
         const newUser = await upsertAuthUser(
            oSchool.id, authUser.id, 
            (authUser.user_metadata?.full_name || oSchool.name + ' Admin'), 
            authUser.email
         );
         activeUser = { ...newUser, schools: { name: oSchool.name }};
      }
      
      if (!activeUser) {
        // Fallback email matcher check
        const emailMatchUser = await getMatchedUser(targetSchoolId, email.toLowerCase());
        if (emailMatchUser) {
           await updateUserAuthId(emailMatchUser.id, authUser.id);
           activeUser = emailMatchUser;
        }
      }

      if (activeUser) {
        setCurrentSchoolContext(targetSchoolId, authUser);
        await initActivePeriod();
        onLogin({
          id: activeUser.id,
          name: activeUser.name,
          email: activeUser.email,
          role: activeUser.role,
          schoolName: activeUser.schools?.name,
        });
        return;
      }

      throw new Error('You do not have access to this school workspace.');


    } catch (err) {
      let msg = err.message;
      if (msg.includes('Invalid login credentials')) msg = 'Invalid Email or Password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-res-page">
      <Helmet>
        <title>Login | Termly Academic Portal</title>
        <meta name="description" content="Secure portal login for Termly administrators and staff." />
      </Helmet>
      <div className="card">
        {/* ... existing decorative panel ... */}
        <div className="right-panel">
          <div className="blob b1"></div>
          <div className="blob b2"></div>
          <div className="blob b3"></div>
          
          <div className="fblocks">
            <div className="fb">
              <span className="fb-ico"><CardIcon size={16} color="#fff" /></span>
              <div className="fb-t">Fee Management</div>
              <div className="fb-d">Automated invoicing and M-PESA reconciliation.</div>
              <div className="fb-stat">
                <div><div className="fb-n">100%</div><div className="fb-l">accuracy in records</div></div>
                <div className="fb-badge">Finance</div>
              </div>
            </div>
            <div className="fb">
              <span className="fb-ico"><DashboardIcon size={16} color="#fff" /></span>
              <div className="fb-t">CBC Analytics</div>
              <div className="fb-d">Real-time performance tracking for all learning areas.</div>
              <div className="fb-stat">
                <div><div className="fb-n">Real-time</div><div className="fb-l">data insights</div></div>
                <div className="fb-badge">Academia</div>
              </div>
            </div>
          </div>

          <div className="brand-stack">
            <div className="brand-n">
              Termly
            </div>
            <div className="brand-sub">The School Management System for modern Kenya <FlagIcon size={10} /></div>
          </div>
        </div>

        {/* LEFT PANEL - FORM */}
        <div className="left-panel">
          <Link to="/" className="res-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5m7 7-7-7 7-7"/></svg>
            Back to Website
          </Link>
          
          <Link to="/" className="res-logo">
            <div className="logo-sq">
              <svg viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.2" fill="white"/>
                <rect x="8" y="1" width="5" height="5" rx="1.2" fill="rgba(255,255,255,.55)"/>
                <rect x="1" y="8" width="5" height="5" rx="1.2" fill="rgba(255,255,255,.55)"/>
                <rect x="8" y="8" width="5" height="5" rx="1.2" fill="rgba(255,255,255,.25)"/>
              </svg>
            </div>
            Termly
          </Link>

          <div className="login-content">
            <div className="res-ftitle">{brandedSchool ? `Welcome to ${brandedSchool.name}` : `Secure Login`}</div>
            <p className="res-fsub">Sign in to your school's workspace.</p>

            {error && <div className="res-error">{error}</div>}

            <form onSubmit={handleLogin}>
              {!brandedSchool && (
              <div className="res-field" style={{ marginBottom: 32, position: 'relative', zIndex: 100 }}>
                <div className="res-fico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                {selectedSchool ? (
                  <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: '45px', fontWeight: '600', color: '#5B3EF5', justifyContent: 'space-between', paddingRight: '12px', background: 'transparent' }}>
                    {selectedSchool.name}
                    <button type="button" onClick={() => setSelectedSchool(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>✕</button>
                  </div>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Search for your school..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    autoComplete="off"
                  />
                )}
                <div className="res-uline"></div>
                {!selectedSchool && searchResults.length > 0 && (
                   <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', marginTop: '8px', zIndex: 110, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                     {searchResults.map(s => (
                        <div key={s.id} onClick={() => { setSelectedSchool(s); setSearchQuery(''); setSearchResults([]); }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontWeight: 500, color: '#1E293B', transition: 'background 0.2s', fontSize: '0.9rem' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          {s.name}
                        </div>
                     ))}
                   </div>
                )}
              </div>
              )}

              <div className="res-field">
                <div className="res-fico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
                  </svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Email, Phone, or Adm No" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
                <div className="res-uline"></div>
                <div className="res-fhint">Your personal login email.</div>
              </div>

              <div className="res-field">
                <div className="res-fico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  style={{ paddingRight: 40, letterSpacing: showPassword ? 'normal' : '0.3em' }}
                />
                <button 
                  type="button" 
                  className="res-eye" 
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
                <div className="res-uline"></div>
                <div style={{ textAlign: 'right', marginTop: 8 }}>
                  <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: '#5B3EF5', fontWeight: 600, textDecoration: 'none' }}>Forgot Password?</Link>
                </div>
              </div>

              <button className="res-cta" type="submit" disabled={loading} style={{ marginTop: 24 }}>
                {loading ? 'Authenticating...' : <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Sign In <RocketIcon size={18} /></span>}
              </button>
            </form>


            <div className="res-bottom">
              <span>Don't have a workspace? <Link to="/register">Register your school</Link></span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-res-page {
          background: linear-gradient(135deg, #C7C4FF 0%, #A5B4FC 45%, #93C5FD 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px;
          color: #111118;
          font-family: 'Inter', sans-serif;
        }

        .card {
          position: relative;
          width: 100%;
          max-width: 900px;
          min-height: 600px;
          background: white;
          border-radius: 26px;
          overflow: hidden;
          box-shadow: 0 40px 90px rgba(70, 50, 200, .25), 0 8px 24px rgba(0, 0, 0, .12);
          display: flex;
          animation: cardIn .7s cubic-bezier(.16, 1, .3, 1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(36px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* RIGHT PANEL */
        .right-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 42%;
          background: linear-gradient(148deg, #4A32E0 0%, #6155FF 30%, #3B8BEB 68%, #29C6D4 100%);
          overflow: hidden;
        }

        .blob {
          position: absolute;
          animation: morph 11s ease-in-out infinite;
        }
        .b1 { width: 480px; height: 480px; bottom: -130px; right: -90px; background: rgba(41, 198, 212, .35); border-radius: 60% 40% 70% 30%/50% 60% 40% 50%; }
        .b2 { width: 220px; height: 220px; top: 20px; right: 40px; background: rgba(255, 255, 255, .07); border-radius: 40% 60% 30% 70%; animation-delay: -4s; }
        .b3 { width: 130px; height: 130px; top: 55%; right: 36%; background: rgba(107, 85, 255, .28); border-radius: 50%; animation-delay: -7s; }

        @keyframes morph {
          0%, 100% { border-radius: 60% 40% 70% 30%/50% 60% 40% 50%; }
          50% { border-radius: 30% 70% 50% 50%/30% 50% 50% 70%; }
        }

        .fblocks {
          position: relative;
          z-index: 3;
          padding: 0 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .fb {
          background: rgba(255, 255, 255, .13);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, .22);
          border-radius: 15px;
          padding: 14px 16px;
          animation: fbob 5s ease-in-out infinite;
        }
        .fb:nth-child(2) { animation-delay: 2s; }

        @keyframes fbob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .fb-ico { font-size: 16px; margin-bottom: 5px; display: block; }
        .fb-t { font-family: 'Epilogue', sans-serif; font-size: .8rem; font-weight: 800; color: #fff; margin-bottom: 2px; }
        .fb-d { font-size: .65rem; color: rgba(255, 255, 255, .7); line-height: 1.5; }
        .fb-stat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, .12);
        }
        .fb-n { font-family: 'Epilogue', sans-serif; font-size: .9rem; font-weight: 800; color: #fff; }
        .fb-l { font-size: .55rem; color: rgba(255, 255, 255, .5); }
        .fb-badge { padding: 2px 8px; border-radius: 100px; font-size: .55rem; font-weight: 600; background: rgba(255, 255, 255, .18); color: rgba(255, 255, 255, .9); }

        .brand-stack {
          position: absolute;
          bottom: 24px;
          left: 0;
          right: 0;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .brand-n { font-family: 'Epilogue', sans-serif; font-weight: 900; font-size: .9rem; color: #fff; display: flex; align-items: center; gap: 6px; }
        .brand-sq { width: 18px; height: 18px; border-radius: 5px; background: rgba(255, 255, 255, .2); display: flex; align-items: center; justify-content: center; }
        .brand-sub { font-size: .57rem; color: rgba(255, 255, 255, .5); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.1em; }

        /* LEFT PANEL */
        .left-panel {
          position: relative;
          z-index: 2;
          flex: 1;
          background: #fff;
          padding: 38px 48px;
          display: flex;
          flex-direction: column;
          clip-path: polygon(0 0, 95% 0, 100% 5%, 100% 95%, 95% 100%, 0 100%);
        }

        .res-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Epilogue', sans-serif;
          font-weight: 900;
          font-size: 1.1rem;
          color: #111118;
          text-decoration: none;
          margin-bottom: 24px;
        }

        .res-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #B0B7C3;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 20px;
          transition: color .2s;
        }
        .res-back-link:hover { color: #5B3EF5; }
        .res-back-link svg { width: 14px; height: 14px; }
        .logo-sq {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #5B3EF5;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(91, 62, 245, .4);
        }
        .logo-sq svg { width: 14px; height: 14px; }

        .login-content {
          animation: sIn .4s cubic-bezier(.16, 1, .3, 1) both;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        @keyframes sIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }

        .res-ftitle { font-family: 'Epilogue', sans-serif; font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 6px; }
        .res-fsub { font-size: .95rem; color: #6B7280; margin-bottom: 32px; line-height: 1.6; }

        .res-field { position: relative; margin-bottom: 24px; }
        .res-fico { position: absolute; left: 0; top: 12px; color: #B0B7C3; width: 20px; transition: color .2s; }
        .res-fico svg { width: 18px; height: 18px; }

        .res-field input {
          width: 100%; padding: 12px 0 12px 32px; border: none;
          border-bottom: 1.5px solid #E8E8F0; background: transparent;
          font-family: 'Inter', sans-serif; font-size: 1rem; outline: none; transition: border-color .3s;
        }
        .res-field input:focus { border-color: #5B3EF5; }
        .res-field input:focus + .res-uline { width: 100%; }
        .res-field input::placeholder { color: #B0B7C3; }

        .res-uline { position: absolute; bottom: 0; left: 0; height: 1.5px; width: 0; background: #5B3EF5; transition: width .3s; pointer-events: none; }
        .res-fhint { font-size: .7rem; color: #B0B7C3; margin-top: 6px; padding-left: 32px; }

        .res-cta {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 14px 24px; border-radius: 100px; background: #5B3EF5; color: #fff;
          font-weight: 700; border: none; cursor: pointer; transition: all .25s;
          box-shadow: 0 6px 20px rgba(91, 62, 245, .3); font-family: 'Inter', sans-serif; font-size: .95rem;
          margin-top: 12px;
        }
        .res-cta:hover:not(:disabled) { background: #4A32D4; transform: translateY(-1px); box-shadow: 0 10px 32px rgba(91, 62, 245, .4); }
        .res-cta:disabled { opacity: 0.7; cursor: not-allowed; }

        .res-eye {
          position: absolute; right: 0; top: 12px; background: none; border: none;
          color: #B0B7C3; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center;
          transition: color .2s; z-index: 10;
        }
        .res-eye:hover { color: #5B3EF5; }
        .res-eye svg { width: 18px; height: 18px; }

        .res-error { background: #FEE2E2; color: #B91C1C; padding: 12px 16px; border-radius: 12px; font-size: .85rem; font-weight: 600; margin-bottom: 20px; text-align: center; }


        .res-bottom { margin-top: auto; padding-top: 32px; text-align: center; font-size: .9rem; color: #6B7280; }
        .res-bottom a { color: #5B3EF5; font-weight: 700; text-decoration: none; }

        @media (max-width: 768px) {
          .right-panel { display: none; }
          .left-panel { padding: 32px 24px; clip-path: none; }
          .card { max-width: 440px; min-height: auto; }
        }
      `}</style>
    </div>
  );
}
