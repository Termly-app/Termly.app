import { useState } from 'react';
import { setSelfPassword } from '../data/store';
import { EyeIcon, EyeOffIcon, ShieldIcon, CheckIcon } from '../components/CommonIcons';
import { useNavigate } from 'react-router-dom';

export default function SetPassword({ currentUser, onPasswordChanged }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const getPasswordStrength = () => {
    const v = password;
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    return s;
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (getPasswordStrength() < 3) {
      setError('Password is too weak. Please use at least 8 characters, a number, and an uppercase letter.');
      return;
    }

    setLoading(true);
    try {
      if (!currentPassword) {
        setError('Current password is required to verify your identity.');
        setLoading(false);
        return;
      }
      await setSelfPassword(password, currentPassword);
      if (onPasswordChanged) onPasswordChanged();
      // On success, redirect to dashboard or they will automatically be re-routed
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="set-password-page">
      <div className="sp-card">
        <div className="sp-header">
          <div className="sp-icon-box">
            <ShieldIcon size={32} strokeWidth={1.5} color="#5B3EF5" />
          </div>
          <h2 className="sp-title">Update Your Password</h2>
          <p className="sp-subtitle">
            Welcome, <strong>{currentUser?.name || 'User'}</strong>! 
            For your security, please configure a new personal password before accessing the workspace.
          </p>
        </div>

        {error && <div className="sp-error">{error}</div>}

        <form onSubmit={handleUpdate} className="sp-form">
          <div className="sp-field" style={{ marginBottom: 24 }}>
            <label>Current Password</label>
            <div className="sp-input-wrap">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Verify identity with current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="sp-eye" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </div>
          <div className="sp-field">
            <label>New Password</label>
            <div className="sp-input-wrap">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="sp-eye" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
            {password && (
              <div className="sp-strength">
                <div className="sp-strength-bar">
                  <div 
                    className="sp-strength-fill" 
                    style={{ 
                      width: `${(getPasswordStrength() / 4) * 100}%`,
                      background: getPasswordStrength() < 2 ? '#EF4444' : getPasswordStrength() < 3 ? '#F59E0B' : '#10B981' 
                    }} 
                  ></div>
                </div>
                <span className="sp-strength-text">
                  {getPasswordStrength() < 2 ? 'Weak' : getPasswordStrength() < 3 ? 'Fair' : 'Strong'}
                </span>
              </div>
            )}
          </div>

          <div className="sp-field" style={{ marginTop: 24 }}>
            <label>Confirm Password</label>
            <div className="sp-input-wrap">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="sp-eye" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="sp-submit-btn">
            {loading ? 'Updating Security...' : 'Save & Continue'}
            {!loading && <CheckIcon size={18} />}
          </button>
        </form>
      </div>

      <style>{`
        .set-password-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 40px 20px;
          box-sizing: border-box;
        }
        .sp-card {
          width: 100%;
          max-width: 480px;
          background: #fff;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08); border: 1px solid rgba(255, 255, 255, 0.8);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sp-header { text-align: center; margin-bottom: 32px; }
        .sp-icon-box {
          display: inline-flex; align-items: center; justify-content: center;
          width: 72px; height: 72px; border-radius: 20px;
          background: rgba(91, 62, 245, 0.08); margin-bottom: 20px;
        }
        .sp-title { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin-bottom: 12px; font-family: 'Epilogue', sans-serif; }
        .sp-subtitle { font-size: 0.95rem; color: #64748b; line-height: 1.6; }
        
        .sp-error { background: #fee2e2; color: #b91c1c; padding: 12px 16px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; margin-bottom: 24px; text-align: center; }
        
        .sp-field label { display: block; font-size: 0.8rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
        .sp-input-wrap { position: relative; }
        .sp-input-wrap input {
          width: 100%; height: 52px; padding: 0 45px 0 16px; border-radius: 12px;
          border: 1.5px solid #e2e8f0; background: #f8fafc; font-size: 1rem;
          transition: all 0.2s; outline: none; fontFamily: inherit;
        }
        .sp-input-wrap input:focus { border-color: #5b3ef5; background: #fff; box-shadow: 0 0 0 4px rgba(91,62,245,0.1); }
        .sp-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;
        }
        
        .sp-strength { margin-top: 12px; display: flex; align-items: center; gap: 12px; }
        .sp-strength-bar { flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
        .sp-strength-fill { height: 100%; transition: all 0.3s ease; }
        .sp-strength-text { font-size: 0.75rem; font-weight: 700; color: #64748b; width: 40px; text-align: right; }
        
        .sp-submit-btn {
          width: 100%; height: 52px; border-radius: 12px; margin-top: 36px;
          background: #5b3ef5; color: #fff; border: none; font-size: 1.05rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          cursor: pointer; transition: all 0.2s;
        }
        .sp-submit-btn:hover:not(:disabled) { background: #4a32d4; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(91,62,245,0.2); }
        .sp-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
