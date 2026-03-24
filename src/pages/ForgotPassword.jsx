import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/CommonIcons';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';

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
