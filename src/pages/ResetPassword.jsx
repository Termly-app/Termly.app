import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        }
        setLoading(false);
    };

    return (
        <div className="login-page">
            <div className="card">
                {/* RIGHT PANEL - VISUALS */}
                <div className="right-panel">
                    <div className="blob b1"></div>
                    <div className="blob b2"></div>
                    <div className="blob b3"></div>
                    
                    <div className="fblocks">
                        <div className="fb">
                            <span className="fb-ico">🛡️</span>
                            <div className="fb-t">Secure Reset</div>
                            <div className="fb-d">Your session is encrypted and protected.</div>
                        </div>
                        <div className="fb">
                            <span className="fb-ico">🔑</span>
                            <div className="fb-t">New Credentials</div>
                            <div className="fb-d">Pick a strong password to stay safe.</div>
                        </div>
                    </div>

                    <div className="brand-stack">
                        <div className="brand-n">ShuleSoft</div>
                        <div className="brand-sub">Modern School Management</div>
                    </div>
                </div>

                {/* LEFT PANEL - FORM */}
                <div className="left-panel">
                    <div className="login-content" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                        <div className="res-logo">
                            <div className="logo-sq">
                                <svg viewBox="0 0 14 14" fill="none">
                                    <rect x="1" y="1" width="5" height="5" rx="1.2" fill="white"/>
                                    <rect x="8" y="1" width="5" height="5" rx="1.2" fill="rgba(255,255,255,.55)"/>
                                    <rect x="1" y="8" width="5" height="5" rx="1.2" fill="rgba(255,255,255,.55)"/>
                                    <rect x="8" y="8" width="5" height="5" rx="1.2" fill="rgba(255,255,255,.25)"/>
                                </svg>
                            </div>
                            ShuleSoft
                        </div>

                        {success ? (
                            <div style={{ animation: 'sIn .4s ease both' }}>
                                <div className="res-ftitle">Password Updated</div>
                                <p className="res-fsub">
                                    Your password has been successfully changed. You'll be redirected to login shortly.
                                </p>
                                <div style={{ background: '#ecfdf5', color: '#10b981', padding: '20px', borderRadius: '16px', textAlign: 'center', marginBottom: '32px' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '48px', height: '48px', marginBottom: '12px' }}>
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
                                    </svg>
                                    <div style={{ fontWeight: 700 }}>Security Update Complete</div>
                                </div>
                                <Link to="/login" className="res-cta" style={{ textDecoration: 'none' }}>
                                    Go to Login Now
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="res-ftitle">Reset Password</div>
                                <p className="res-fsub">Choose a new secure password for your workspace.</p>

                                {error && <div className="res-error">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="res-field" style={{ marginBottom: 24 }}>
                                        <div className="res-fico">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                            </svg>
                                        </div>
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="New Password" 
                                            value={password} 
                                            onChange={(e) => setPassword(e.target.value)} 
                                            required
                                            minLength={8}
                                            autoFocus
                                        />
                                        <button 
                                            type="button" 
                                            className="res-eye"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                            )}
                                        </button>
                                        <div className="res-uline"></div>
                                        <div className="res-fhint text-muted">Must be at least 8 characters long.</div>
                                    </div>

                                    <div className="res-field" style={{ marginBottom: 32 }}>
                                        <div className="res-fico">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                            </svg>
                                        </div>
                                        <input 
                                            type="password" 
                                            placeholder="Confirm New Password" 
                                            value={confirmPassword} 
                                            onChange={(e) => setConfirmPassword(e.target.value)} 
                                            required
                                        />
                                        <div className="res-uline"></div>
                                        <div className="res-fhint">Re-enter your new password.</div>
                                    </div>

                                    <button className="res-cta" type="submit" disabled={loading}>
                                        {loading ? 'Updating...' : (
                                            <>
                                                <span>Save & Update Password</span>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                                                </svg>
                                            </>
                                        )}
                                    </button>
                                </form>
                                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                                    <Link to="/login" style={{ color: '#6B7280', fontSize: '0.9rem', textDecoration: 'none' }}>
                                        Cancel and return to login
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .login-page { min-height: 100vh; background: #F3F4F6; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: 'Inter', sans-serif; color: #1F2937; }
                .card { background: #fff; width: 100%; max-width: 1040px; min-height: 640px; border-radius: 26px; overflow: hidden; box-shadow: 0 40px 90px rgba(70, 50, 200, .25), 0 8px 24px rgba(0, 0, 0, .12); display: flex; animation: cardIn .7s cubic-bezier(.16, 1, .3, 1) both; }
                @keyframes cardIn { from { opacity: 0; transform: translateY(36px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .right-panel { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 42%; background: linear-gradient(148deg, #4A32E0 0%, #6155FF 30%, #3B8BEB 68%, #29C6D4 100%); overflow: hidden; }
                .blob { position: absolute; animation: morph 11s ease-in-out infinite; }
                .b1 { width: 480px; height: 480px; bottom: -130px; right: -90px; background: rgba(41, 198, 212, .35); border-radius: 60% 40% 70% 30%/50% 60% 40% 50%; }
                .b2 { width: 220px; height: 220px; top: 20px; right: 40px; background: rgba(255, 255, 255, .07); border-radius: 40% 60% 30% 70%; animation-delay: -4s; }
                .b3 { width: 130px; height: 130px; top: 55%; right: 36%; background: rgba(107, 85, 255, .28); border-radius: 50%; animation-delay: -7s; }
                @keyframes morph { 0%, 100% { border-radius: 60% 40% 70% 30%/50% 60% 40% 50%; } 50% { border-radius: 30% 70% 50% 50%/30% 50% 50% 70%; } }
                .fblocks { position: relative; z-index: 3; padding: 0 24px; display: flex; flex-direction: column; gap: 12px; width: 100%; }
                .fb { background: rgba(255, 255, 255, .13); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, .22); border-radius: 15px; padding: 14px 16px; animation: fbob 5s ease-in-out infinite; }
                .fb:nth-child(2) { animation-delay: 2s; }
                @keyframes fbob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
                .fb-ico { font-size: 16px; margin-bottom: 5px; display: block; }
                .fb-t { font-weight: 800; color: #fff; margin-bottom: 2px; font-size: .8rem; }
                .fb-d { font-size: .65rem; color: rgba(255, 255, 255, .7); line-height: 1.5; }
                .brand-stack { position: absolute; bottom: 24px; left: 0; right: 0; z-index: 3; display: flex; flex-direction: column; align-items: center; }
                .brand-n { font-weight: 900; font-size: .9rem; color: #fff; }
                .brand-sub { font-size: .57rem; color: rgba(255, 255, 255, .5); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.1em; }
                .left-panel { position: relative; z-index: 2; flex: 1; background: #fff; padding: 60px 48px; display: flex; flex-direction: column; clip-path: polygon(0 0, 95% 0, 100% 5%, 100% 95%, 95% 100%, 0 100%); }
                .res-logo { display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: 1.1rem; color: #111118; text-decoration: none; margin-bottom: 32px; }
                .logo-sq { width: 30px; height: 30px; border-radius: 8px; background: #5B3EF5; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(91, 62, 245, .4); }
                .logo-sq svg { width: 14px; height: 14px; }
                .login-content { animation: sIn .4s cubic-bezier(.16, 1, .3, 1) both; flex: 1; display: flex; flex-direction: column; }
                @keyframes sIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
                .res-ftitle { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 12px; }
                .res-fsub { font-size: .95rem; color: #6B7280; margin-bottom: 32px; line-height: 1.6; }
                .res-field { position: relative; margin-bottom: 24px; }
                .res-fico { position: absolute; left: 0; top: 12px; color: #B0B7C3; width: 20px; transition: color .2s; }
                .res-field input { width: 100%; padding: 12px 0 12px 32px; border: none; border-bottom: 1.5px solid #E8E8F0; background: transparent; font-size: 1rem; outline: none; transition: border-color .3s; }
                .res-field input:focus { border-color: #5B3EF5; }
                .res-field input:focus + .res-uline { width: 100%; }
                .res-uline { position: absolute; bottom: 0; left: 0; height: 1.5px; width: 0; background: #5B3EF5; transition: width .3s; pointer-events: none; }
                .res-fhint { font-size: .7rem; color: #B0B7C3; margin-top: 6px; padding-left: 32px; }
                .res-cta { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 24px; border-radius: 100px; background: #5B3EF5; color: #fff; font-weight: 700; border: none; cursor: pointer; transition: all .25s; box-shadow: 0 6px 20px rgba(91, 62, 245, .3); font-size: .95rem; margin-top: 12px; }
                .res-cta:hover:not(:disabled) { background: #4A32D4; transform: translateY(-1px); box-shadow: 0 10px 32px rgba(91, 62, 245, .4); }
                .res-eye { position: absolute; right: 0; top: 12px; background: none; border: none; color: #B0B7C3; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; transition: color .2s; z-index: 10; }
                .res-eye:hover { color: #5B3EF5; }
                .res-eye svg { width: 18px; height: 18px; }
                .res-error { background: #FEE2E2; color: #B91C1C; padding: 12px 16px; border-radius: 12px; font-size: .85rem; font-weight: 600; margin-bottom: 20px; text-align: center; }
                @media (max-width: 768px) {
                    .right-panel { display: none; }
                    .left-panel { padding: 32px 24px; clip-path: none; }
                    .card { max-width: 440px; min-height: auto; }
                }
            `}</style>
        </div>
    );
};

export default ResetPassword;
