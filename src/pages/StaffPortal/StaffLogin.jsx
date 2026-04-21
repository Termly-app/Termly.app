import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TeacherIcon, ShieldIcon, PhoneIcon, EyeIcon, EyeOffIcon, RocketIcon, FlagIcon, BookIcon, GraduationIcon } from '../../components/CommonIcons';
import { validateStaffLogin } from '../../data/store';

export default function StaffLogin({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await validateStaffLogin(phone, pin);
      onLogin(result);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-res-page" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)' }}>
      <div className="card">
        {/* RIGHT PANEL - TEACHER THEMED */}
        <div className="right-panel" style={{ background: 'linear-gradient(148deg, #3730A3 0%, #4338CA 30%, #4F46E5 68%, #6366F1 100%)' }}>
          <div className="blob b1" style={{ background: 'rgba(99, 102, 241, 0.3)' }}></div>
          <div className="blob b2"></div>
          <div className="blob b3" style={{ background: 'rgba(79, 70, 229, 0.2)' }}></div>
          
          <div className="fblocks">
            <div className="fb">
              <span className="fb-ico"><GraduationIcon size={16} color="#fff" /></span>
              <div className="fb-t">Academic Excellence</div>
              <div className="fb-d">Enter marks and track curriculum progress from any device.</div>
              <div className="fb-stat">
                <div><div className="fb-n">Fast</div><div className="fb-l">mark entry</div></div>
                <div className="fb-badge">Academia</div>
              </div>
            </div>
            <div className="fb">
              <span className="fb-ico"><BookIcon size={16} color="#fff" /></span>
              <div className="fb-t">Lesson Mastery</div>
              <div className="fb-d">Manage your timetable and student attendance seamlessly.</div>
              <div className="fb-stat">
                <div><div className="fb-n">Live</div><div className="fb-l">syncing</div></div>
                <div className="fb-badge">Classroom</div>
              </div>
            </div>
          </div>

          <div className="brand-stack">
            <div className="brand-n">
              ShuleSoft Staff
            </div>
            <div className="brand-sub">The Educator's Digital Companion <FlagIcon size={10} /></div>
          </div>
        </div>

        {/* LEFT PANEL - FORM */}
        <div className="left-panel">
          <Link to="/" className="res-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5m7 7-7-7 7-7"/></svg>
            Back to Website
          </Link>
          
          <Link to="/" className="res-logo">
            <div className="logo-sq" style={{ background: '#4F46E5' }}>
              <TeacherIcon size={18} color="white" />
            </div>
            Staff Portal
          </Link>

          <div className="login-content">
            <div className="res-ftitle">Teacher Sign-In</div>
            <p className="res-fsub">Access your academic workspace to manage your classes.</p>

            {error && <div className="res-error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="res-field">
                <div className="res-fico">
                  <PhoneIcon size={18} color="#94a3b8" />
                </div>
                <input 
                  type="tel" 
                  placeholder="Primary Phone Number" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                />
                <div className="res-uline" style={{ background: '#4F46E5' }}></div>
                <div className="res-fhint">Use your registered mobile number.</div>
              </div>

              <div className="res-field">
                <div className="res-fico">
                  <ShieldIcon size={18} color="#94a3b8" />
                </div>
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
                  style={{ top: '10px' }}
                >
                  {showPin ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
                <div className="res-uline" style={{ background: '#4F46E5' }}></div>
                <div className="res-fhint" style={{ textAlign: 'center' }}>Enter your unique 4-6 digit PIN.</div>
              </div>

              <button className="res-cta" type="submit" disabled={loading} style={{ marginTop: 24, background: '#4F46E5' }}>
                {loading ? 'Authenticating...' : <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Enter Workspace <RocketIcon size={18} /></span>}
              </button>
            </form>

            <div className="res-bottom">
              <span>Need help? Contact your school administrator for PIN reset.</span>
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
        .res-field input:focus { border-color: #4F46E5; }
        .res-uline { position: absolute; bottom: 0; left: 0; height: 1.5px; width: 0; transition: width 0.3s; }
        .res-field input:focus ~ .res-uline { width: 100%; }
        .res-fhint { font-size: 0.75rem; color: #94A3B8; margin-top: 6px; }
        .res-cta { width: 100%; border: none; border-radius: 100px; padding: 14px; color: white; font-weight: 700; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        .res-cta:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3); }
        .res-error { background: #fee2e2; color: #b91c1c; padding: 12px; borderRadius: 12px; margin-bottom: 20px; font-size: 0.85rem; text-align: center; font-weight: 600; }
        .res-bottom { margin-top: auto; padding-top: 30px; text-align: center; color: #94a3b8; font-size: 0.85rem; }
        .res-back-link { display: flex; align-items: center; gap: 8px; color: #94a3b8; text-decoration: none; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 20px; }
        @media (max-width: 768px) { .right-panel { display: none; } .card { max-width: 450px; } .left-panel { padding: 30px; } }
      `}</style>
    </div>
  );
}

