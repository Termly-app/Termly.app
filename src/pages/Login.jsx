import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  findSchool,
  setCurrentSchoolContext,
  initActivePeriod,
} from '../data/store';
import { CardIcon, DashboardIcon, RocketIcon, FlagIcon } from '../components/CommonIcons';

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login State
  const [schoolEmail, setSchoolEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    
    // Suggest school email if missing but potentially an admin
    if (!schoolEmail.trim() && !email.toLowerCase().endsWith('@shulesoft.com')) {
      setError('Staff & Admins: Please enter your School Workspace Email to continue.');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      // 1. Authenticate first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;

      const authUser = authData.user;

      // 2. If schoolEmail is provided, resolve school by that email
      let targetSchoolId = null;
      if (schoolEmail && schoolEmail.trim()) {
        // Find the school whose owner registered with this email
        const { data: ownerAuth } = await supabase
          .from('users')
          .select('school_id')
          .eq('email', schoolEmail.trim().toLowerCase())
          .eq('role', 'Admin')
          .maybeSingle();

        if (ownerAuth) {
          targetSchoolId = ownerAuth.school_id;
        } else {
          // Try finding by school owner_id via schools table
          // First look up the auth user for this school email
          const { data: schoolsByName } = await supabase
            .from('schools')
            .select('id, owner_id')
            .limit(50);
          
          if (schoolsByName) {
            // Check if any school's owner has this email by checking users table
            const { data: ownerUser } = await supabase
              .from('users')
              .select('school_id')
              .eq('email', schoolEmail.trim().toLowerCase())
              .limit(1);
            if (ownerUser && ownerUser.length > 0) {
              targetSchoolId = ownerUser[0].school_id;
            }
          }
        }

        if (!targetSchoolId) {
          throw new Error('No school workspace found for that school email. Please check and try again.');
        }
      }

      // 3. Look up user record by auth_user_id
      let userQuery = supabase
        .from('users')
        .select('*, schools(id, name, plan)')
        .eq('auth_user_id', authUser.id);
      
      // If we have a target school, filter by it
      if (targetSchoolId) {
        userQuery = userQuery.eq('school_id', targetSchoolId);
      }

      const { data: userRecord } = await userQuery.maybeSingle();

      if (userRecord) {
        setCurrentSchoolContext(userRecord.school_id, authUser);
        await initActivePeriod();
        onLogin({
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          role: userRecord.role,
          schoolName: userRecord.schools?.name,
        });
        return;
      }

      // 4. Fallback: match by email in users table (for accounts created before RPC)
      if (targetSchoolId) {
        const { data: emailMatch } = await supabase
          .from('users')
          .select('*, schools(id, name, plan)')
          .eq('school_id', targetSchoolId)
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (emailMatch) {
          // Link the auth_user_id for future logins
          await supabase.from('users').update({ auth_user_id: authUser.id }).eq('id', emailMatch.id);
          setCurrentSchoolContext(emailMatch.school_id, authUser);
          await initActivePeriod();
          onLogin({
            id: emailMatch.id,
            name: emailMatch.name,
            email: emailMatch.email,
            role: emailMatch.role,
            schoolName: emailMatch.schools?.name,
          });
          return;
        }
      }

      // 5. Fallback: Check if they are the owner of a school
      const { data: ownedSchool } = await supabase
        .from('schools')
        .select('*')
        .eq('owner_id', authUser.id)
        .maybeSingle();

      if (ownedSchool) {
        const { data: newUser, error: newUserErr } = await supabase
          .from('users')
          .upsert({
            school_id: ownedSchool.id,
            auth_user_id: authUser.id,
            name: (authUser.user_metadata?.full_name || ownedSchool.name + ' Admin'),
            email: authUser.email,
            role: 'Admin',
          })
          .select()
          .single();
        
        if (newUserErr) throw newUserErr;

        setCurrentSchoolContext(ownedSchool.id, authUser);
        await initActivePeriod();
        onLogin({ ...newUser, schoolName: ownedSchool.name });
        return;
      }

      throw new Error('Access denied. No school workspace found for this account. If you are a staff member, please enter the School Email to identify your workspace.');
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
              ShuleSoft
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
            ShuleSoft
          </Link>

          <div className="login-content">
            <div className="res-ftitle">Secure Login</div>
            <p className="res-fsub">Sign in to your school's workspace.</p>

            {error && <div className="res-error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="res-field" style={{ marginBottom: 32 }}>
                <div className="res-fico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <input 
                  type="email" 
                  placeholder="School Workspace Email" 
                  value={schoolEmail} 
                  onChange={(e) => setSchoolEmail(e.target.value)} 
                />
                <div className="res-uline"></div>
                <div className="res-fhint" style={{ 
                  color: schoolEmail ? '#5B3EF5' : '#D4506A',
                  background: schoolEmail ? 'rgba(91, 62, 245, 0.05)' : 'rgba(212, 80, 106, 0.05)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginTop: '10px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  Staff/Admins: Enter the email used to register your school account here.
                </div>
              </div>

              <div className="res-field">
                <div className="res-fico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
                  </svg>
                </div>
                <input 
                  type="email" 
                  placeholder="Your Email Address" 
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
                  style={{ paddingRight: 40 }}
                />
                <button 
                  type="button" 
                  className="res-eye" 
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
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
