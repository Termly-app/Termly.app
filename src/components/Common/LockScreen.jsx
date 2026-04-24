import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RocketIcon, ShieldIcon } from '../CommonIcons';

export default function LockScreen({ user, onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (authError) throw authError;

      onUnlock();
    } catch (err) {
      setError('Invalid password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lock-screen">
      <div className="lock-content">
        <div className="lock-avatar">
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <h2>Session Locked</h2>
        <p>Hi {user.name}, please enter your password to continue.</p>

        {error && <div className="lock-error">{error}</div>}

        <form onSubmit={handleUnlock}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Unlocking...' : 'Unlock Session'}
          </button>
        </form>

        <button 
          className="lock-logout" 
          onClick={() => {
            supabase.auth.signOut();
            window.location.reload();
          }}
        >
          Sign out instead
        </button>
      </div>

      <style>{`
        .lock-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          z-index: 20000;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .lock-content {
          width: 100%;
          max-width: 380px;
          text-align: center;
          padding: 40px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: lockPop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes lockPop {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .lock-avatar {
          width: 80px;
          height: 80px;
          background: #5B3EF5;
          border-radius: 50%;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 800;
          box-shadow: 0 10px 25px rgba(91, 62, 245, 0.4);
        }
        h2 { font-size: 1.5rem; margin-bottom: 8px; font-weight: 800; }
        p { color: #94A3B8; margin-bottom: 32px; font-size: 0.9rem; }
        .lock-error {
          background: rgba(239, 68, 68, 0.2);
          color: #F87171;
          padding: 10px;
          border-radius: 8px;
          font-size: 0.8rem;
          margin-bottom: 20px;
          font-weight: 600;
        }
        form input {
          width: 100%;
          padding: 14px 20px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 1rem;
          margin-bottom: 16px;
          outline: none;
        }
        form input:focus { border-color: #5B3EF5; background: rgba(255, 255, 255, 0.1); }
        form button {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          background: #5B3EF5;
          color: white;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        form button:hover { background: #4A32D4; transform: translateY(-1px); }
        .lock-logout {
          margin-top: 24px;
          background: none;
          border: none;
          color: #94A3B8;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }
        .lock-logout:hover { color: white; }
      `}</style>
    </div>
  );
}
