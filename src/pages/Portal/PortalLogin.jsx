import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SchoolIcon, UserIcon, PhoneIcon, RocketIcon, FlagIcon, GraduationIcon, CardIcon, ChevronRightIcon } from '../../components/CommonIcons';
import { validateParentLogin, getSchoolsForPortalSearch } from '../../data/store';
import Loader from '../../components/Common/Loader';

export default function PortalLogin({ onLogin }) {
  const [searchParams] = useSearchParams();
  const magicSchool = searchParams.get('school');
  
  const [schoolSearch, setSchoolSearch] = useState(magicSchool || '');
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [admNo, setAdmNo] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (schoolSearch.length > 1 && !magicSchool) {
        try {
          const results = await getSchoolsForPortalSearch(schoolSearch);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!schoolSearch.trim()) {
      setError('Please select or search for your institution first.');
      return;
    }

    setLoading(true);
    try {
      const result = await validateParentLogin(schoolSearch, admNo, phone, selectedSchoolId);
      if (result) {
        onLogin(result);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your details or contact the school office.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-res-page" style={{ background: 'linear-gradient(135deg, #022C22 0%, #064E3B 100%)' }}>
      <Loader visible={loading} />
      <div className="card">
        {/* RIGHT PANEL */}
        <div className="right-panel" style={{ background: 'linear-gradient(148deg, #059669 0%, #065F46 30%, #064E3B 68%, #022C22 100%)' }}>
          <div className="blob b1" style={{ background: 'rgba(16, 185, 129, 0.3)' }}></div>
          <div className="blob b2"></div>
          <div className="blob b3" style={{ background: 'rgba(5, 150, 105, 0.2)' }}></div>
          
          <div className="fblocks">
            <div className="fb">
              <span className="fb-ico"><GraduationIcon size={16} color="#fff" /></span>
              <div className="fb-t">Student Success</div>
              <div className="fb-d">Track children's academic performance and termly results.</div>
              <div className="fb-stat">
                <div><div className="fb-n">Real-time</div><div className="fb-l">Updates</div></div>
                <div className="fb-badge" style={{ background: '#059669' }}>Academia</div>
              </div>
            </div>
            <div className="fb">
              <span className="fb-ico"><CardIcon size={16} color="#fff" /></span>
              <div className="fb-t">Fee Transparency</div>
              <div className="fb-d">View fee statements and secure payment history instantly.</div>
              <div className="fb-stat">
                <div><div className="fb-n">100%</div><div className="fb-l">Secure</div></div>
                <div className="fb-badge" style={{ background: '#059669' }}>Finance</div>
              </div>
            </div>
          </div>

          <div className="brand-stack">
            <div className="brand-n">Termly FAMILY</div>
            <div className="brand-sub">Modern Education, Connected Homes <FlagIcon size={10} /></div>
          </div>
        </div>

        {/* LEFT PANEL */}
        <div className="left-panel">
          <Link to="/" className="res-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><path d="M19 12H5m7 7-7-7 7-7"/></svg>
            Back to Website
          </Link>
          
          <Link to="/" className="res-logo">
            <div className="logo-sq" style={{ background: '#10B981' }}>
              <SchoolIcon size={18} color="white" />
            </div>
            Family Access
          </Link>

          <div className="login-content">
            <div className="res-ftitle" style={{ color: '#064E3B' }}>Parent Login</div>
            <p className="res-fsub">Access your child's academic and financial records.</p>

            {error && <div className="res-error">{error}</div>}

            <form onSubmit={handleSubmit} autoComplete="off">
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
                <div className="res-uline" style={{ background: '#10B981' }}></div>
                {magicSchool && <div className="res-fhint" style={{ color: '#059669', fontWeight: 'bold' }}>Magic link applied!</div>}
                
                {showSuggestions && suggestions.length > 0 && (
                  <div className="res-suggestions">
                    {suggestions.map((s) => (
                      <div 
                        key={s.id} 
                        className="suggestion-item"
                        onClick={() => {
                          setSchoolSearch(s.name);
                          setSelectedSchoolId(s.id);
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
                <div className="res-fico"><UserIcon size={18} color="#94a3b8" /></div>
                <input 
                  type="text" 
                  placeholder="Student Admission Number" 
                  value={admNo} 
                  onChange={(e) => setAdmNo(e.target.value)} 
                  required 
                  style={{ textTransform: 'uppercase' }}
                />
                <div className="res-uline" style={{ background: '#10B981' }}></div>
              </div>

              <div className="res-field">
                <div className="res-fico"><PhoneIcon size={18} color="#94a3b8" /></div>
                <input 
                  type="tel" 
                  placeholder="Registered Guardian Phone" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                />
                <div className="res-uline" style={{ background: '#10B981' }}></div>
              </div>

              <button className="res-cta" type="submit" disabled={loading} style={{ background: '#10B981', justifyContent: 'center' }}>
                {loading ? 'Validating...' : (
                  <>
                    Access Portal
                    <RocketIcon size={18} style={{ marginLeft: 8 }} />
                  </>
                )}
              </button>
            </form>

            <div className="res-bottom">
              <span>Need help? Contact the school office for support.</span>
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
        .logo-sq { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4); }
        .res-ftitle { font-size: 1.8rem; font-weight: 800; margin-bottom: 8px; color: #111; letter-spacing: -0.02em; }
        .res-fsub { color: #64748b; margin-bottom: 32px; font-size: 0.95rem; line-height: 1.6; }
        
        .fblocks { padding: 0 24px; display: flex; flex-direction: column; gap: 12px; width: 100%; z-index: 5; }
        .fb { background: rgba(255, 255, 255, .16); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, .25); border-radius: 18px; padding: 16px; }
        .fb-t { font-size: .85rem; font-weight: 800; color: #fff; margin-bottom: 3px; }
        .fb-d { font-size: .7rem; color: rgba(255, 255, 255, .75); line-height: 1.5; }
        .fb-stat { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, .1); }
        .fb-n { font-size: .95rem; font-weight: 800; color: #fff; }
        .fb-l { font-size: .6rem; color: rgba(255, 255, 255, .55); }
        .fb-badge { padding: 3px 10px; border-radius: 100px; font-size: .6rem; font-weight: 700; background: rgba(255, 255, 255, .2); }

        .res-field { position: relative; margin-bottom: 24px; }
        .res-fico { position: absolute; left: 0; top: 12px; color: #94a3b8; }
        .res-field input { width: 100%; border: none; border-bottom: 1.5px solid #E2E8F0; padding: 12px 12px 12px 32px; outline: none; font-size: 1rem; background: transparent; transition: all 0.3s; }
        .res-field input:focus { border-color: #10B981; }
        .res-uline { position: absolute; bottom: 0; left: 0; height: 1.5px; width: 0; transition: width 0.3s; }
        .res-field input:focus ~ .res-uline { width: 100%; }
        .res-fhint { font-size: 0.75rem; color: #94A3B8; margin-top: 6px; padding-left: 32px; }
        
        .res-cta { width: 100%; border: none; border-radius: 12px; padding: 14px; color: white; font-weight: 700; cursor: pointer; transition: all 0.3s; margin-top: 32px; box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1rem; }
        .res-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(16, 185, 129, 0.4); opacity: 0.95; }
        .res-cta:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .res-suggestions { position: absolute; top: 100%; left: 0; right: 0; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #E2E8F0; margin-top: 5px; max-height: 200px; overflow-y: auto; z-index: 1000; }
        .suggestion-item { padding: 12px 16px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid #F1F5F9; }
        .suggestion-item:last-child { border-bottom: none; }
        .suggestion-item:hover { background: #F8FAFC; }
        .s-name { font-size: 0.9rem; font-weight: 700; color: #064E3B; }
        .s-code { font-size: 0.7rem; color: #94A3B8; text-transform: uppercase; margin-top: 2px; }
        .res-error { background: #fee2e2; color: #b91c1c; padding: 12px; border-radius: 12px; margin-bottom: 20px; font-size: 0.85rem; text-align: center; font-weight: 600; }
        .res-back-link { display: inline-flex; align-items: center; gap: 8px; color: #94a3b8; text-decoration: none; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 20px; transition: color 0.2s; }
        .res-back-link:hover { color: #10B981; }
        
        .brand-stack { position: absolute; bottom: 30px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; }
        .brand-n { font-weight: 900; font-size: .95rem; color: #fff; letter-spacing: 0.05em; }
        .brand-sub { font-size: .6rem; color: rgba(255, 255, 255, .5); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.15em; }
        
        .blob { position: absolute; border-radius: 50%; opacity: 0.5; filter: blur(60px); }
        .b1 { width: 300px; height: 300px; bottom: -100px; right: -50px; background: rgba(16, 185, 129, 0.4); }
        .b2 { width: 180px; height: 180px; top: 50px; right: 10%; background: rgba(255,255,255,0.08); }
        .b3 { width: 120px; height: 120px; top: 50%; left: 10%; background: rgba(255,255,255,0.05); }

        .res-bottom { margin-top: auto; padding-top: 32px; text-align: center; color: #94a3b8; font-size: 0.85rem; }

        @media (max-width: 768px) { .right-panel { display: none; } .card { max-width: 450px; min-height: auto; } .left-panel { padding: 32px 24px; } }
      `}</style>
    </div>
  );
}
