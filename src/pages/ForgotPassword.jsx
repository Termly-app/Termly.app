import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/CommonIcons';

// Local SVG icons to avoid external dependencies
const ArrowLeft = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5m7 7-7-7 7-7"/>
  </svg>
);

const Send = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const CheckCircle = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            setError(error.message);
        } else {
            setSubmitted(true);
        }
        setLoading(false);
    };

    if (submitted) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ background: 'var(--success-bg, #ecfdf5)', color: 'var(--success, #10b981)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <CheckCircle size={32} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px', color: 'var(--text-main, #1e293b)' }}>Check your email</h2>
                    <p style={{ color: 'var(--text-muted, #64748b)', lineHeight: '1.6', marginBottom: '30px' }}>
                        We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the instructions.
                    </p>
                    <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
                        <ArrowLeft size={18} />
                        Back to login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <Link to="/" className="auth-logo">
                        <LogoMark size={40} />
                        <span>ShuleSoft</span>
                    </Link>
                    <h1>Forgot Password?</h1>
                    <p>Enter your email and we'll send you a recovery link.</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-danger" style={{ marginBottom: '20px', padding: '12px', borderRadius: '8px', fontSize: '14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' }}>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Work Email</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="admin@school.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                        {loading ? 'Sending...' : (
                            <>
                                <span>Send Reset Link</span>
                                <Send size={18} />
                            </>
                        )}
                    </button>
                    
                    <div className="auth-footer" style={{ marginTop: '24px', textAlign: 'center' }}>
                        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ArrowLeft size={14} />
                            Back to login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;
