import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { LogoMark } from '../components/CommonIcons';
import { ShieldCheck, Eye, EyeOff, Save, ArrowRight } from 'lucide-react';

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
            // Optional: Auto redirect after few seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ background: 'var(--success-bg, #ecfdf5)', color: 'var(--success, #10b981)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <ShieldCheck size={32} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px', color: 'var(--text-main, #1e293b)' }}>Password Updated</h2>
                    <p style={{ color: 'var(--text-muted, #64748b)', lineHeight: '1.6', marginBottom: '30px' }}>
                        Your password has been successfully changed. You will be redirected to the login page shortly.
                    </p>
                    <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
                        Login now
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <LogoMark size={40} />
                        <span>ShuleSoft</span>
                    </div>
                    <h1>Reset Password</h1>
                    <p>Enter your new password below to regain access.</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-danger" style={{ marginBottom: '20px', padding: '12px', borderRadius: '8px', fontSize: '14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' }}>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="password">New Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                autoFocus
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)} 
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Must be at least 8 characters long.</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                        {loading ? 'Updating...' : (
                            <>
                                <span>Save Password</span>
                                <Save size={18} />
                            </>
                        )}
                    </button>
                    
                    <div className="auth-footer" style={{ marginTop: '24px', textAlign: 'center' }}>
                        <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                            Cancel and return to login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
