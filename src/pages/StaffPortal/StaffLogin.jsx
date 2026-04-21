import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TeacherIcon, ShieldIcon, PhoneIcon, EyeIcon, EyeOffIcon, RocketIcon, FlagIcon, BookIcon, GraduationIcon, SchoolIcon } from '../../components/CommonIcons';
import { validateStaffLogin, searchSchools } from '../../data/store';

export default function StaffLogin({ onLogin }) {
  const [searchParams] = useSearchParams();
  const magicSchool = searchParams.get('school');
  
  const [schoolSearch, setSchoolSearch] = useState(magicSchool || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (schoolSearch.length > 1 && !magicSchool) {
        try {
          const results = await searchSchools(schoolSearch);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (err) {
          console.error("Suggestion fetch failed:", err);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [schoolSearch, magicSchool]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!schoolSearch.trim()) {
      setError('Please search for your school first.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await validateStaffLogin(schoolSearch, phone, pin);
      onLogin(result);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-res-page" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)' }}>
      <div className="card">
        {/* RIGHT PANEL */}
        <div className="right-panel" style={{ background: 'linear-gradient(148deg, #3730A3 0%, #4338CA 30%, #4F46E5 68%, #6366F1 100%)' }}>
          <div className="blob b1" style={{ background: 'rgba(99, 102, 241, 0.3)' }}></div>
          <div className="blob b2"></div>
          <div className="blob b3" style={{ background: 'rgba(79, 70, 229, 0.2)' }}></div>
          
          <div className="fblocks">
            <div className="fb">
              <span className="fb-ico"><GraduationIcon size={16} color="#fff" /></span>
              <div className="fb-t">Classroom Records</div>
              <div className="fb-d">Manage marks and lesson plans from any device.</div>
              <div className="fb-stat">
                <div><div className="fb-n">Optimized</div><div className="fb-l">for teachers</div></div>
                <div className="fb-badge" style={{ background: '#3730A3' }}>Educator</div>
              </div>
            </div>
            <div className="fb">
              <span className="fb-ico"><BookIcon size={16} color="#fff" /></span>
              <div className="fb-t">Live Attendance</div>
              <div className="fb-d">Track participation and attendance in real-time.</div>
              <div className="fb-stat">
                <div><div className="fb-n">Real-time</div><div className="fb-l">Cloud Sync</div></div>
                <div className="fb-badge" style={{ background: '#3730A3' }}>Classroom</div>
              </div>
            </div>
          </div>

          <div className="brand-stack">
            <div className="brand-n">ShuleSoft STAFF</div>
            <div className="brand-sub">The Teacher's Workspace <FlagIcon size={10} /></div>
          </div>
        </div>

        {/* LEFT PANEL */}
        <div className="left-panel">
          <Link to="/" className="res-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><path d="M19 12H5m7 7-7-7 7-7"/></svg>
            Back to Website
          </Link>
          
          <Link to="/" className="res-logo">
            <div className="logo-sq" style={{ background: '#4F46E5' }}>
              <TeacherIcon size={18} color="white" />
            </div>
            Staff Portal
          </Link>

          <div className="login-content">
            <div className="res-ftitle" style={{ color: '#1E1B4B' }}>Teacher Sign-In</div>
            <p className="res-fsub">Access your academic workspace to manage your classes.</p>

            {error && <div className="res-error">{error}</div>}

            <form onSubmit={handleLogin} autoComplete="off">
              <div className="res-field" style={{ position: 'relative', zIndex: 100 }}>
                <div className="res-fico"><SchoolIcon size={18} color="#94a3b8" /></div>
                <input 
                  type="text" 
                  placeholder="Search for your school..." 
                  value={schoolSearch} 
                  onChange={(e) => setSchoolSearch(e.target.value)} 
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  required 
                  autoComplete="off"
                />
                <div className="res-uline" style={{ background: '#4F46E5' }}></div>
                {magicSchool && <div className="res-fhint" style={{ color: '#6366F1', fontWeight: 'bold' }}>Magic link applied!</div>}
                
                {showSuggestions && suggestions.length > 0 && (
                  <div className="res-suggestions">
                    {suggestions.map(s => (
                      <div 
                        key={s.id} 
                        className="suggestion-item"
                        onClick={() => {
                          setSchoolSearch(s.name);
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="s-name">{s.name}</div>
                        <div className="s-code">{s.school_code}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="res-field">
                <div className="res-fico"><PhoneIcon size={18} color="#94a3b8" /></div>
                <input 
                  type="tel" 
                  placeholder="Primary Phone Number" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                />
                <div className="res-uline" style={{ background: '#4F46E5' }}></div>
                <div className="res-fhint">The phone number used for SMS alerts.</div>
              </div>

              <div className="res-field">
                <div className="res-fico"><ShieldIcon size={18} color="#94a3b8" /></div>
                <input 
                  type={showPin ? "text" : "password"} 
                  placeholder="Access PIN" 
                  value={pin} 
                  onChange={(e) => setPin(e.target.value)} 
                  required 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  style={{ paddingRight: 40, letterSpacing: showPin ? 'normal' : '0.5em', textAlign: 'center', fontWeight: '800' }}
                />
                <button 
                  type="button" 
                  className="res-eye" 
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
                <div className="res-uline" style={{ background: '#4F46E5' }}></div>
              </div>

              <button className="res-cta" type="submit" disabled={loading} style={{ background: '#4F46E5' }}>
                {loading ? 'Validating...' : <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Enter Portal <RocketIcon size={18} /></span>}
              </button>
            </form>

            <div className="res-bottom">
              <span>Need help with PIN? Contact your administrator.</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-res-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 28px; font-family: 'Inter', sans-serif; }
        .card { width: 100%; max-width: 900px; min-height: 600px; background: white; border-radius: 26px; overflow: hidden; display: flex; box-shadow: 0 40px 90px rgba(0,0,0,0.15); position: relative; }
        .right-panel { width: 42%; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; padding: 40px; color: white; }
        .left-panel { flex: 1; padding: 48px; display: flex; flex-direction: column; background: white; position: relative; }
        .res-logo { display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 1.2rem; color: #111; text-decoration: none; margin-bottom: 24px; }
        .logo-sq { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 15px rgba(79, 70, 229, 0.4); }
        .res-ftitle { font-size: 1.8rem; font-weight: 800; margin-bottom: 8px; color: #111; letter-spacing: -0.02em; }
        .res-fsub { color: #64748b; margin-bottom: 32px; font-size: 0.95rem; line-height: 1.6; }
        
        .fblocks { padding: 0 24px; display: flex; flex-direction: column; gap: 12px; width: 100%; z-index: 5; }
        .fb { background: rgba(255, 255, 255, .15); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, .25); border-radius: 18px; padding: 16px; }
        .fb-t { font-size: .85rem; font-weight: 800; color: #fff; margin-bottom: 3px; }
        .fb-d { font-size: .7rem; color: rgba(255, 255, 255, .75); line-height: 1.5; }
        .fb-stat { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, .1); }
        .fb-n { font-size: .95rem; font-weight: 800; color: #fff; }
        .fb-l { font-size: .6rem; color: rgba(255, 255, 255, .55); }
        .fb-badge { padding: 3px 10px; border-radius: 100px; font-size: .6rem; font-weight: 700; background: rgba(255, 255, 255, .2); }

        .res-field { position: relative; margin-bottom: 24px; }
        .res-fico { position: absolute; left: 0; top: 12px; color: #94a3b8; }
        .res-field input { width: 100%; border: none; border-bottom: 1.5px solid #E2E8F0; padding: 12px 12px 12px 32px; outline: none; font-size: 1rem; background: transparent; transition: all 0.3s; }
        .res-field input:focus { border-color: #4F46E5; }
        .res-uline { position: absolute; bottom: 0; left: 0; height: 1.5px; width: 0; transition: width 0.3s; }
        .res-field input:focus ~ .res-uline { width: 100%; }
        .res-fhint { font-size: 0.75rem; color: #94A3B8; margin-top: 6px; padding-left: 32px; }
        
        .res-cta { width: 100%; border: none; border-radius: 12px; padding: 14px; color: white; font-weight: 700; cursor: pointer; transition: all 0.3s; margin-top: 32px; box-shadow: 0 8px 25px rgba(79, 70, 229, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1rem; }
        .res-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(79, 70, 229, 0.4); opacity: 0.95; }
        .res-cta:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .res-error { background: #fee2e2; color: #b91c1c; padding: 12px; border-radius: 12px; margin-bottom: 20px; font-size: 0.85rem; text-align: center; font-weight: 600; }
        .res-back-link { display: inline-flex; align-items: center; gap: 8px; color: #94a3b8; text-decoration: none; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 20px; transition: color 0.2s; }
        .res-back-link:hover { color: #4F46E5; }
        
        .brand-stack { position: absolute; bottom: 30px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; }
        .brand-n { font-weight: 900; font-size: .95rem; color: #fff; letter-spacing: 0.05em; }
        .brand-sub { font-size: .6rem; color: rgba(255, 255, 255, .5); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.15em; }
        
        .blob { position: absolute; border-radius: 50%; opacity: 0.5; filter: blur(60px); }
        .b1 { width: 300px; height: 300px; bottom: -100px; right: -50px; background: rgba(99, 102, 241, 0.4); }
        .b2 { width: 180px; height: 180px; top: 50px; right: 10%; background: rgba(255,255,255,0.08); }
        .b3 { width: 120px; height: 120px; top: 50%; left: 10%; background: rgba(255,255,255,0.05); }

        .res-bottom { margin-top: auto; padding-top: 32px; text-align: center; color: #94a3b8; font-size: 0.85rem; }

        .res-eye { position: absolute; right: 0; top: 12px; background: none; border: none; color: #B0B7C3; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; transition: color .2s; }
        .res-eye:hover { color: #4F46E5; }

        .res-suggestions { position: absolute; top: 100%; left: 0; right: 0; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #E2E8F0; margin-top: 5px; max-height: 200px; overflow-y: auto; z-index: 1000; }
        .suggestion-item { padding: 12px 16px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid #F1F5F9; }
        .suggestion-item:last-child { border-bottom: none; }
        .suggestion-item:hover { background: #F8FAFC; }
        .s-name { font-size: 0.9rem; font-weight: 700; color: #1E1B4B; }
        .s-code { font-size: 0.7rem; color: #94A3B8; text-transform: uppercase; margin-top: 2px; }

        @media (max-width: 768px) { .right-panel { display: none; } .card { max-width: 450px; min-height: auto; } .left-panel { padding: 32px 24px; } }
      `}</style>
    </div>
  );
}

