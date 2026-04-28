import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);

    const [resendLoading, setResendLoading] = useState(false);
    const [lastSent, setLastSent] = useState(0);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        // Rate limit frontend slightly (60s)
        const now = Date.now();
        if (now - lastSent < 60000) {
            setError(`Please wait ${Math.ceil((60000 - (now - lastSent)) / 1000)} seconds before resending.`);
            return;
        }

        setLoading(true);
        setResendLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                setError(error.message);
            } else {
                setSubmitted(true);
                setLastSent(Date.now());
            }
        } catch (err) {
            setError("Authentication service is temporarily unavailable. Please try again later.");
        } finally {
            setLoading(false);
            setResendLoading(false);
        }
    };

    return (
        <div className="login-page">
            <Helmet>
                <title>Forgot Password | Termly</title>
                <meta name="description" content="Reset your Termly account password. Enter your email to receive a secure recovery link." />
            </Helmet>
            <div className="card">
                {/* RIGHT PANEL - VISUALS */}
                <div className="right-panel">
                    <div className="blob b1"></div>
                    <div className="blob b2"></div>
                    <div className="blob b3"></div>
                    
                    <div className="fblocks">
                        <div className="fb">
                            <span className="fb-ico">🔒</span>
                            <div className="fb-t">Secure Recovery</div>
                            <div className="fb-d">Multi-factor authentication enabled for all accounts.</div>
                        </div>
                        <div className="fb">
                            <span className="fb-ico">⚡</span>
                            <div className="fb-t">Instant Access</div>
                            <div className="fb-d">Recovery links are sent immediately to your email.</div>
                        </div>
                    </div>

                    <div className="brand-stack">
                        <div className="brand-n">Termly</div>
                        <div className="brand-sub">Modern School Management</div>
                    </div>
                </div>

                {/* LEFT PANEL - FORM */}
                <div className="left-panel">
                    <Link to="/login" className="res-back-link">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5m7 7-7-7 7-7"/></svg>
                        Back to login
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
                        {submitted ? (
                            <div style={{ animation: 'sIn .4s ease both' }}>
                                <div className="res-ftitle">Check your email</div>
                                <p className="res-fsub">
                                    We've sent a recovery link to <strong>{email}</strong>. Check your inbox and follow the instructions.
                                </p>
                                <div style={{ background: '#ecfdf5', color: '#10b981', padding: '20px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '48px', height: '48px', marginBottom: '12px' }}>
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                                    </svg>
                                    <div style={{ fontWeight: 700 }}>Recovery Link Sent</div>
                                </div>

                                {/* Troubleshooting Block */}
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '32px' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#6366f1' }}>💡</span> Didn't receive an email?
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                                        <li>Check your <strong>Spam/Junk</strong> folder.</li>
                                        <li>Verify that <strong>{email}</strong> is spelled correctly.</li>
                                        <li>Wait up to 5 minutes (delivery can be delayed).</li>
                                        <li>Ensure <code>noreply@mail.supabase.co</code> is not blocked.</li>
                                    </ul>
                                    <button 
                                        onClick={handleSubmit} 
                                        disabled={resendLoading || (Date.now() - lastSent < 60000)}
                                        style={{ marginTop: '14px', background: 'none', border: 'none', color: '#5B3EF5', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}
                                    >
                                        {resendLoading ? 'Sending...' : '→ Resend Recovery Link'}
                                    </button>
                                </div>

                                <Link to="/login" className="res-cta" style={{ textDecoration: 'none' }}>
                                    Back to Login
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="res-ftitle">Forgot Password?</div>
                                <p className="res-fsub">Enter your email and we'll send you a recovery link.</p>

                                {error && <div className="res-error">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="res-field" style={{ marginBottom: 32 }}>
                                        <div className="res-fico">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                                            </svg>
                                        </div>
                                        <input 
                                            type="email" 
                                            placeholder="Your Email Address" 
                                            value={email} 
                                            onChange={(e) => setEmail(e.target.value)} 
                                            required
                                            autoFocus
                                        />
                                        <div className="res-uline"></div>
                                        <div className="res-fhint">The email associated with your account.</div>
                                    </div>

                                    <button className="res-cta" type="submit" disabled={loading}>
                                        {loading ? 'Sending...' : (
                                            <>
                                                <span>Send Recovery Link</span>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                                                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                                </svg>
                                            </>
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .login-page {
                    min-height: 100vh;
                    background: #F3F4F6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    font-family: 'Inter', sans-serif;
                    color: #1F2937;
                }
                .card {
                    background: #fff;
                    width: 100%;
                    max-width: 1040px;
                    min-height: 640px;
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
                .blob { position: absolute; animation: morph 11s ease-in-out infinite; }
                .b1 { width: 480px; height: 480px; bottom: -130px; right: -90px; background: rgba(41, 198, 212, .35); border-radius: 60% 40% 70% 30%/50% 60% 40% 50%; }
                .b2 { width: 220px; height: 220px; top: 20px; right: 40px; background: rgba(255, 255, 255, .07); border-radius: 40% 60% 30% 70%; animation-delay: -4s; }
                .b3 { width: 130px; height: 130px; top: 55%; right: 36%; background: rgba(107, 85, 255, .28); border-radius: 50%; animation-delay: -7s; }
                @keyframes morph {
                    0%, 100% { border-radius: 60% 40% 70% 30%/50% 60% 40% 50%; }
                    50% { border-radius: 30% 70% 50% 50%/30% 50% 50% 70%; }
                }
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
                .left-panel { position: relative; z-index: 2; flex: 1; background: #fff; padding: 38px 48px; display: flex; flex-direction: column; clip-path: polygon(0 0, 95% 0, 100% 5%, 100% 95%, 95% 100%, 0 100%); }
                .res-logo { display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: 1.1rem; color: #111118; text-decoration: none; margin-bottom: 24px; }
                .res-back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; color: #B0B7C3; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; transition: color .2s; }
                .res-back-link:hover { color: #5B3EF5; }
                .res-back-link svg { width: 14px; height: 14px; }
                .logo-sq { width: 30px; height: 30px; border-radius: 8px; background: #5B3EF5; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(91, 62, 245, .4); }
                .logo-sq svg { width: 14px; height: 14px; }
                .login-content { animation: sIn .4s cubic-bezier(.16, 1, .3, 1) both; flex: 1; display: flex; flex-direction: column; }
                @keyframes sIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
                .res-ftitle { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 6px; }
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

export default ForgotPassword;
