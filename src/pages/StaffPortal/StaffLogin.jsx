import React, { useState } from 'react';
import { TeacherIcon, ShieldIcon, PhoneIcon, EyeIcon, EyeOffIcon } from '../../components/CommonIcons';
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
      // Secure Validation via Supabase
      const result = await validateStaffLogin(phone, pin);
      onLogin(result);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, background: '#3b82f6', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'white', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)' }}>
            <TeacherIcon size={32} />
          </div>
          <h1 style={{ color: 'white', margin: '0 0 8px', fontSize: '1.4rem' }}>Staff Portal</h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>Quickly enter marks from anywhere.</p>
        </div>

        <div style={{ background: 'white', padding: '24px 20px', borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', textAlign: 'center' }}>
          <ShieldIcon size={24} color="#94a3b8" style={{ marginBottom: 16 }} />
          <h2 style={{ margin: '0 0 24px', fontSize: '1rem', color: '#0f172a' }}>Enter Access Details</h2>
          
          {error && <div style={{ color: '#ef4444', background: '#fef2f2', padding: 12, borderRadius: 8, fontSize: '0.85rem', marginBottom: 20 }}>{error}</div>}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16, textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Primary Phone</label>
              <div style={{ position: 'relative' }}>
                <PhoneIcon size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 14 }} />
                <input 
                  type="tel"
                  placeholder="e.g. 0712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 40px', border: '2px solid #cbd5e1', borderRadius: 12, boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 24, textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Access PIN</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPin ? "text" : "password"} 
                  inputMode="numeric" 
                  pattern="[0-9]*" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  style={{ width: '100%', padding: '12px 40px 12px 12px', border: '2px solid #cbd5e1', borderRadius: 12, fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.4em', fontWeight: 800, boxSizing: 'border-box' }}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{ position: 'absolute', right: 12, top: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                  tabIndex="-1"
                >
                  {showPin ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', padding: 16, borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Authenticating...' : 'Access Workspace'}
            </button>
          </form>
          
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 20 }}>
            Contact Admin if you forgot your PIN or need to register your mobile number.
          </div>
        </div>

      </div>
    </div>
  );
}
