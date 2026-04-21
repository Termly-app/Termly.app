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
    <div className="login-res-page" style={{ background: 'linear-gradient(135deg, #312E81 0%, #1E1B4B 100%)' }}>
      <div className="card" style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}>
        {/* RIGHT PANEL - TEACHER THEMED */}
        <div className="right-panel" style={{ background: 'linear-gradient(148deg, #4338CA 0%, #3730A3 30%, #312E81 68%, #1E1B4B 100%)' }}>
          <div className="blob b1" style={{ background: 'rgba(99, 102, 241, 0.4)' }}></div>
          <div className="blob b2"></div>
          <div className="blob b3" style={{ background: 'rgba(79, 70, 229, 0.3)' }}></div>
          
          <div className="fblocks">
            <div className="fb" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)' }}>
              <span className="fb-ico"><GraduationIcon size={16} color="#A5B4FC" /></span>
              <div className="fb-t">Classroom Records</div>
              <div className="fb-d">Instantly sync marks and lesson plans from your mobile device.</div>
              <div className="fb-stat">
                <div><div className="fb-n">Optimized</div><div className="fb-l">for teachers</div></div>
                <div className="fb-badge" style={{ background: '#4338CA' }}>Staff Portal</div>
              </div>
            </div>
            <div className="fb" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)' }}>
              <span className="fb-ico"><BookIcon size={16} color="#A5B4FC" /></span>
              <div className="fb-t">Instant Attendance</div>
              <div className="fb-d">Mark roll calls and monitor student participation on the fly.</div>
              <div className="fb-stat">
                <div><div className="fb-n">Live</div><div className="fb-l">Cloud Sync</div></div>
                <div className="fb-badge" style={{ background: '#4338CA' }}>Mobile Ready</div>
              </div>
            </div>
          </div>

          <div className="brand-stack">
            <div className="brand-n">
               ShuleSoft EDU
            </div>
            <div className="brand-sub">The Teacher's Professional Workspace <FlagIcon size={10} /></div>
          </div>
        </div>

        {/* LEFT PANEL - FORM */}
        <div className="left-panel">
          <Link to="/" className="res-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5m7 7-7-7 7-7"/></svg>
            BACK TO LANDING
          </Link>
          
          <div className="res-logo">
            <div className="logo-sq" style={{ background: '#4338CA' }}>
              <TeacherIcon size={18} color="white" />
            </div>
            Educator Access
          </div>

          <div className="login-content">
            <div className="res-ftitle" style={{ color: '#1E1B4B' }}>Staff Login</div>
            <p className="res-fsub">Sign in to your professional academic dashboard.</p>

            {error && <div className="res-error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="res-field">
                <div className="res-fico">
                  <PhoneIcon size={18} color="#4338CA" />
                </div>
                <input 
                  type="tel" 
                  placeholder="Your Registered Phone Number" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                  style={{ borderBottomColor: '#E0E7FF' }}
                />
                <div className="res-uline" style={{ background: '#4338CA' }}></div>
                <div className="res-fhint">The phone number used for SMS alerts.</div>
              </div>

              <div className="res-field">
                <div className="res-fico">
                  <ShieldIcon size={18} color="#4338CA" />
                </div>
                <input 
                  type={showPin ? "text" : "password"} 
                  placeholder="Enter 4-6 Digit PIN" 
                  value={pin} 
                  onChange={(e) => setPin(e.target.value)} 
                  required 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  style={{ paddingRight: 40, letterSpacing: '0.4em', textAlign: 'center', fontWeight: '900', fontSize: '1.4rem' }}
                />
                <button 
                  type="button" 
                  className="res-eye" 
                  onClick={() => setShowPin(!showPin)}
                  style={{ color: '#4338CA' }}
                >
                  {showPin ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
                <div className="res-uline" style={{ background: '#4338CA' }}></div>
              </div>

              <button className="res-cta" type="submit" disabled={loading} style={{ marginTop: 24, background: '#4338CA', boxShadow: '0 8px 30px rgba(67, 56, 202, 0.4)' }}>
                {loading ? 'Validating Access...' : <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>Enter Teacher Portal <RocketIcon size={18} /></span>}
              </button>
            </form>

            <div className="res-bottom">
              <span style={{ color: '#6366F1', fontWeight: 600 }}>Forgot your PIN?</span>
              <p style={{ marginTop: 8 }}>Please ask your School Admin for a PIN reset.</p>
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

