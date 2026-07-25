// src/pages/SuperAdmin/modals/RegisterSchoolModal.jsx
//
// The other half of the book-a-demo flow: you fill this in after
// actually talking to the school, it creates their admin account
// + school record via the admin-register-school edge function, and
// shows you the temp password to relay to them yourself (call,
// WhatsApp, whatever — matches how you're actually onboarding
// schools right now, and sidesteps depending on transactional
// email, which isn't reliable yet).

import { useState } from 'react';
import { CrossIcon, SchoolIcon, CheckIcon } from '../../../components/CommonIcons';
import { supabase } from '../../../lib/supabase';

export default function RegisterSchoolModal({ open, onClose, onRegistered, prefill }) {
  const [form, setForm] = useState({
    schoolName: prefill?.school_name || '',
    adminName: prefill?.contact_name || '',
    adminEmail: prefill?.email || '',
    phone: prefill?.phone || '',
    location: '',
    curriculum: 'CBC',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { tempPassword, adminEmail, school }
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError('');
    if (!form.schoolName || !form.adminName || !form.adminEmail) {
      setError('School name, admin name, and admin email are required.');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-register-school`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            schoolName: form.schoolName,
            adminName: form.adminName,
            adminEmail: form.adminEmail,
            phone: form.phone,
            location: form.location,
            curriculum: form.curriculum,
            demoRequestId: prefill?.id || null,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Registration failed');
      setResult(json);
      onRegistered?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    navigator.clipboard.writeText(
      `School: ${form.schoolName}\nLogin: ${result.adminEmail}\nTemporary password: ${result.tempPassword}\nLogin at: ${window.location.origin}/login`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mo open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mb">
        <button className="mc" onClick={onClose}><CrossIcon size={18} /></button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className="li-ico ni-t" style={{ width: 36, height: 36, borderRadius: 9 }}><SchoolIcon size={20} /></div>
          <div>
            <div style={{ fontFamily: 'var(--fh)', fontSize: '.9rem', fontWeight: 700, color: '#fff' }}>
              {result ? 'School registered' : 'Register a School'}
            </div>
            <div style={{ fontSize: '.68rem', color: 'var(--sub)', marginTop: 2 }}>
              {result ? 'Relay these credentials to the school yourself' : 'Creates the admin account and school workspace'}
            </div>
          </div>
        </div>

        {result ? (
          <>
            <div className="mi" style={{ marginBottom: 16 }}>
              <div className="mir"><span className="mil">School</span><span className="miv">{form.schoolName}</span></div>
              <div className="mir"><span className="mil">Login email</span><span className="miv">{result.adminEmail}</span></div>
              <div className="mir"><span className="mil">Temp password</span><span className="miv" style={{ fontFamily: 'monospace', letterSpacing: '.05em' }}>{result.tempPassword}</span></div>
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--sub)', marginBottom: 16, lineHeight: 1.5 }}>
              This password only shows once — copy it now. Relay it to the school directly
              (call or WhatsApp, not email, since that's not reliably delivering yet) and
              have them change it after their first login.
            </div>
            <button className="act-btn g" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }} onClick={copyCredentials}>
              {copied ? <><CheckIcon size={14} /> Copied</> : 'Copy credentials'}
            </button>
            <button className="act-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <div className="sb-lbl" style={{ marginBottom: 7 }}>School name *</div>
              <input type="text" value={form.schoolName} onChange={update('schoolName')} style={{ fontFamily: 'var(--fh)', fontSize: '.75rem' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div className="sb-lbl" style={{ marginBottom: 7 }}>Admin name *</div>
                <input type="text" value={form.adminName} onChange={update('adminName')} style={{ fontFamily: 'var(--fh)', fontSize: '.75rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="sb-lbl" style={{ marginBottom: 7 }}>Admin email *</div>
                <input type="email" value={form.adminEmail} onChange={update('adminEmail')} style={{ fontFamily: 'var(--fh)', fontSize: '.75rem' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div className="sb-lbl" style={{ marginBottom: 7 }}>Phone</div>
                <input type="tel" value={form.phone} onChange={update('phone')} style={{ fontFamily: 'var(--fh)', fontSize: '.75rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="sb-lbl" style={{ marginBottom: 7 }}>Location</div>
                <input type="text" value={form.location} onChange={update('location')} style={{ fontFamily: 'var(--fh)', fontSize: '.75rem' }} />
              </div>
            </div>

            {error && <div style={{ color: '#ef4444', fontSize: '.75rem', marginBottom: 14 }}>{error}</div>}

            <button className="act-btn g" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSubmit} disabled={loading}>
              {loading ? 'Registering…' : 'Register school'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
