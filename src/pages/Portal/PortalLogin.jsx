import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SchoolIcon, UserIcon, PhoneIcon, RocketIcon, FlagIcon, GraduationIcon, CardIcon, ChevronRightIcon } from '../../components/CommonIcons';
import { validateParentLogin } from '../../data/store';
import '../Login.css';

export default function PortalLogin({ onLogin }) {
  const [searchParams] = useSearchParams();
  const magicSchool = searchParams.get('school');
  
  const [schoolSearch, setSchoolSearch] = useState(magicSchool || '');
  const [admNo, setAdmNo] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!schoolSearch.trim()) {
      setError('Please select or search for your institution first.');
      return;
    }

    setLoading(true);
    try {
      const result = await validateParentLogin(schoolSearch, admNo, phone);
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
    <div className="login-res-page" style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' }}>
      <div className="card">
        {/* RIGHT PANEL - FAMILY THEMED */}
        <div className="right-panel" style={{ background: 'linear-gradient(148deg, #065F46 0%, #064E3B 30%, #059669 68%, #10B981 100%)' }}>
          <div className="blob b1" style={{ background: 'rgba(16, 185, 129, 0.3)' }}></div>
          <div className="blob b2"></div>
          <div className="blob b3" style={{ background: 'rgba(5, 150, 105, 0.2)' }}></div>
          
          <div className="fblocks">
            <div className="fb">
              <span className="fb-ico"><GraduationIcon size={16} color="#fff" /></span>
              <div className="fb-t">Academic Progress</div>
              <div className="fb-d">Track your child's performance and termly results in real-time.</div>
              <div className="fb-stat">
                <div><div className="fb-n">Real-time</div><div className="fb-l">results</div></div>
                <div className="fb-badge">Academia</div>
              </div>
            </div>
            <div className="fb">
              <span className="fb-ico"><CardIcon size={16} color="#fff" /></span>
              <div className="fb-t">Fees & Payments</div>
              <div className="fb-d">View fee statements and secure payment history instantly.</div>
              <div className="fb-stat">
                <div><div className="fb-n">100%</div><div className="fb-l">transparency</div></div>
                <div className="fb-badge">Finance</div>
              </div>
            </div>
          </div>

          <div className="brand-stack">
            <div className="brand-n">
              ShuleSoft Portal
            </div>
            <div className="brand-sub">Modern Education, Connected Families <FlagIcon size={10} /></div>
          </div>
        </div>

        {/* LEFT PANEL - FORM */}
        <div className="left-panel">
          <Link to="/" className="res-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5m7 7-7-7 7-7"/></svg>
            Back to Website
          </Link>
          
          <Link to="/" className="res-logo">
            <div className="logo-sq" style={{ background: '#10B981' }}>
              <SchoolIcon size={18} color="white" />
            </div>
            Parent Portal
          </Link>

          <div className="login-content">
            <div className="res-ftitle">Family Sign-In</div>
            <p className="res-fsub">Access your child's academic and financial records.</p>

            {error && <div className="res-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="res-field">
                <div className="res-fico">
                  <SchoolIcon size={18} color="#94a3b8" />
                </div>
                <input 
                  type="text" 
                  placeholder="Institution Search (e.g. Alliance High)" 
                  value={schoolSearch} 
                  onChange={(e) => setSchoolSearch(e.target.value)} 
                  required 
                />
                <div className="res-uline" style={{ background: '#10B981' }}></div>
                {magicSchool && <div className="res-fhint" style={{ color: '#059669', fontWeight: 'bold' }}>Magic link applied! School detected.</div>}
              </div>

              <div className="res-field">
                <div className="res-fico">
                  <UserIcon size={18} color="#94a3b8" />
                </div>
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
                <div className="res-fico">
                  <PhoneIcon size={18} color="#94a3b8" />
                </div>
                <input 
                  type="tel" 
                  placeholder="Registered Guardian Phone" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                />
                <div className="res-uline" style={{ background: '#10B981' }}></div>
                <div className="res-fhint">The phone number registered with the school.</div>
              </div>

              <button className="res-cta" type="submit" disabled={loading} style={{ marginTop: 24, background: '#10B981' }}>
                {loading ? 'Authenticating...' : <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Access Portal <RocketIcon size={18} /></span>}
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
        .card { width: 100%; max-width: 900px; min-height: 600px; background: white; border-radius: 26px; overflow: hidden; display: flex; box-shadow: 0 40px 90px rgba(0,0,0,0.1); }
        .right-panel { width: 42%; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; padding: 40px; color: white; }
        .left-panel { flex: 1; padding: 48px; display: flex; flex-direction: column; background: white; }
        .res-logo { display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 1.2rem; color: #111; text-decoration: none; margin-bottom: 30px; }
        .logo-sq { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .res-ftitle { font-size: 1.8rem; font-weight: 800; margin-bottom: 8px; }
        .res-fsub { color: #64748b; margin-bottom: 32px; font-size: 0.95rem; }
        .res-field { position: relative; margin-bottom: 24px; }
        .res-fico { position: absolute; left: 0; top: 12px; }
        .res-field input { width: 100%; border: none; border-bottom: 1.5px solid #E2E8F0; padding: 12px 12px 12px 30px; outline: none; font-size: 1rem; background: transparent; transition: border-color 0.3s; }
        .res-field input:focus { border-color: #10B981; }
        .res-uline { position: absolute; bottom: 0; left: 0; height: 1.5px; width: 0; transition: width 0.3s; }
        .res-field input:focus ~ .res-uline { width: 100%; }
        .res-fhint { font-size: 0.75rem; color: #94A3B8; margin-top: 6px; }
        .res-cta { width: 100%; border: none; border-radius: 100px; padding: 14px; color: white; font-weight: 700; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        .res-cta:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3); }
        .res-error { background: #fee2e2; color: #b91c1c; padding: 12px; borderRadius: 12px; margin-bottom: 20px; font-size: 0.85rem; text-align: center; font-weight: 600; }
        .res-bottom { margin-top: auto; padding-top: 30px; text-align: center; color: #94a3b8; font-size: 0.85rem; }
        .res-back-link { display: flex; align-items: center; gap: 8px; color: #94a3b8; text-decoration: none; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 20px; }
        @media (max-width: 768px) { .right-panel { display: none; } .card { max-width: 450px; } .left-panel { padding: 30px; } }
      `}</style>
    </div>
  );
}
  );
}
