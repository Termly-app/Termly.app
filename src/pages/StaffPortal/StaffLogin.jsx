import React, { useState } from 'react';
import { TeacherIcon, ShieldIcon } from '../../components/CommonIcons';
import { db } from '../../data/offlineStore';

export default function StaffLogin({ onLogin }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Offline authentication simulation. In production, this uses Supabase Auth.
    // For this isolated mobile UI demo, we simulate checking local Dexie teachers table.
    try {
      const teachers = await db.teachers.toArray();
      if (teachers.length > 0) {
        // Fallback demo: any 4+ digit PIN logs into the first available teacher account for simulation
        if (pin.length >= 4) {
          onLogin({ id: teachers[0].id, name: teachers[0].name, role: 'teacher' });
        } else {
          setError('Invalid PIN format. Enter at least 4 digits.');
        }
      } else {
        // No teachers found offline
        if (pin === '1234') {
          onLogin({ id: 'staff-999', name: 'Demo Teacher', role: 'teacher' });
        } else {
          setError('No staff found. Please try PIN 1234');
        }
      }
    } catch(err) {
      setError('Unable to reach storage. Try again later.');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, background: '#3b82f6', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'white', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)' }}>
            <TeacherIcon size={32} />
          </div>
          <h1 style={{ color: 'white', margin: '0 0 8px', fontSize: '1.4rem' }}>Staff Portal</h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>Quickly enter marks from anywhere.</p>
        </div>

        <div style={{ background: 'white', padding: 32, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', textAlign: 'center' }}>
          <ShieldIcon size={24} color="#94a3b8" style={{ marginBottom: 16 }} />
          <h2 style={{ margin: '0 0 24px', fontSize: '1rem', color: '#0f172a' }}>Enter Access PIN</h2>
          
          {error && <div style={{ color: '#ef4444', background: '#fef2f2', padding: 12, borderRadius: 8, fontSize: '0.85rem', marginBottom: 20 }}>{error}</div>}

          <form onSubmit={handleLogin}>
            {/* Optimized for mobile number pads */}
            <input 
              type="password" 
              inputMode="numeric" 
              pattern="[0-9]*" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              style={{ width: '100%', padding: 16, border: '2px solid #cbd5e1', borderRadius: 12, fontSize: '2rem', textAlign: 'center', letterSpacing: '0.5em', fontWeight: 800, boxSizing: 'border-box', marginBottom: 24 }}
              autoFocus
              required
            />

            <button 
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', padding: 16, borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Authenticating...' : 'Access Workspace'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
