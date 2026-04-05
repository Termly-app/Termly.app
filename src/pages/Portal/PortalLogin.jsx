import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SchoolIcon, UserIcon, PhoneIcon } from '../../components/CommonIcons';
import { validatePortalLogin } from '../../data/offlineStore';

export default function PortalLogin({ onLogin }) {
  const [searchParams] = useSearchParams();
  const magicSchool = searchParams.get('school');
  
  const [schoolSearch, setSchoolSearch] = useState(magicSchool || '');
  const [admNo, setAdmNo] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!schoolSearch.trim()) {
      setError('Please select or search for your institution first.');
      return;
    }

    setLoading(true);
    try {
      // Offline Simulation
      const result = await validatePortalLogin(schoolSearch, admNo);
      
      if (result) {
        // Success
        onLogin(result);
      } else {
        // Did not match
        setError('No student found matching this Admission Number and Phone at the selected school.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 480, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ background: '#f8fafc', padding: '32px 40px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ background: '#10B981', color: 'white', width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}>
            <SchoolIcon size={24} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Parent & Student Portal</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Access your academic and financial records.</p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '40px' }}>
          {error && (
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8, fontSize: '0.85rem', marginBottom: 20, textAlign: 'center', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Institution Search</label>
            <div style={{ position: 'relative' }}>
              <SchoolIcon size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input 
                type="text" 
                placeholder="Type your school's name..." 
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '1rem', boxSizing: 'border-box' }}
                required
              />
            </div>
            {magicSchool && <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 4, fontWeight: 600 }}>Magic link applied! School automatically locked.</div>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Student Admission Number</label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input 
                type="text" 
                placeholder="e.g. ADM-001" 
                value={admNo}
                onChange={(e) => setAdmNo(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '1rem', textTransform: 'uppercase', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Registered Guardian Phone</label>
            <div style={{ position: 'relative' }}>
              <PhoneIcon size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input 
                type="tel" 
                placeholder="e.g. 0712345678" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '1rem', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', background: '#10B981', color: 'white', border: 'none', padding: 14, borderRadius: 8, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Authenticating...' : 'Access Portal'}
          </button>
        </form>
        
        <div style={{ padding: 20, textAlign: 'center', borderTop: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#94a3b8' }}>
          Powered by <strong>ShuleSoft System</strong>
        </div>
      </div>
    </div>
  );
}
