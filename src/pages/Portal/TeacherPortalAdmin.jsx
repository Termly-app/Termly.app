import React, { useState, useEffect } from 'react';
import { getTeachers, getSchoolProfile, updateTeacher } from '../../data/store';
import { StaffIcon, CheckIcon, RefreshIcon, CopyIcon, EyeIcon, EyeOffIcon, ShieldIcon, SearchIcon } from '../../components/CommonIcons';
import Loader from '../../components/Common/Loader';
import { useDialog } from '../../contexts/DialogContext';

export default function TeacherPortalAdmin() {
  const { alert, confirm } = useDialog();
  const [teachers, setTeachers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPins, setShowPins] = useState({});
  const [editPin, setEditPin] = useState({});
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([getTeachers(), getSchoolProfile()]);
      setTeachers(t.filter(x => x.status !== 'Inactive'));
      setProfile(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const portalUrl = `${window.location.origin}/staff/login`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetPin = async (teacher) => {
    const newPin = editPin[teacher.id];
    if (!newPin || newPin.length < 4) {
      alert({ title: 'Invalid PIN', message: 'PIN must be at least 4 digits.', variant: 'warning' });
      return;
    }
    const ok = await confirm({
      title: 'Reset PIN',
      message: `Set a new PIN for ${teacher.name}?`,
      variant: 'primary'
    });
    if (!ok) return;
    try {
      await updateTeacher(teacher.id, { pin: newPin });
      alert({ title: 'PIN Updated', message: `${teacher.name}'s PIN has been changed.`, variant: 'success' });
      setEditPin(prev => ({ ...prev, [teacher.id]: '' }));
      loadData();
    } catch (err) {
      alert({ title: 'Error', message: err.message, variant: 'danger' });
    }
  };

  const filtered = teachers.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search || (
      t.name?.toLowerCase().includes(q) || 
      t.phone?.toLowerCase().includes(q)
    );
    return matchSearch;
  });



  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.5px' }}>Teacher Portal</h2>
          <p className="text-muted">Manage teacher access to the mobile grading portal</p>
        </div>
      </div>

      {/* Portal Access Link */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(59,130,246,0.1)', padding: 10, borderRadius: 12, color: '#3b82f6' }}>
              <StaffIcon size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Portal Access Link</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Share this link with your teachers to access the mobile grading portal</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <code style={{ flex: 1, fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600, wordBreak: 'break-all' }}>{portalUrl}</code>
            <button className="btn btn-primary" onClick={handleCopyLink} style={{ whiteSpace: 'nowrap' }}>
              {copied ? <><CheckIcon size={14} /> Copied!</> : <><CopyIcon size={14} /> Copy Link</>}
            </button>
          </div>
          
          <div style={{ marginTop: 16, padding: 16, background: 'rgba(59,130,246,0.04)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.1)' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>
              <strong>How it works:</strong> Teachers log in using their registered <strong>phone number</strong> and a <strong>4-digit PIN</strong>. 
              The default PIN is <code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: 4 }}>1234</code>. 
              You can reset PINs below. Teachers can enter marks on any device — no app install required.
            </p>
          </div>
        </div>
      </div>

      {/* Teacher Access Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
              <ShieldIcon size={16} style={{ marginRight: 8, verticalAlign: '-2px' }} />
              Staff Access Management
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="search-bar" style={{ maxWidth: 300, minWidth: 240, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div className="search-icon" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 1, color: '#94a3b8', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                  <SearchIcon size={14} />
                </div>
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="form-input"
                  style={{ padding: '10px 12px 10px 40px', borderRadius: 24, fontSize: '0.85rem', width: '100%', background: '#fff' }}
                />
              </div>
              <span className="text-muted" style={{ fontSize: '0.82rem' }}>{filtered.length} active teachers</span>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Subjects</th>
                <th>Current PIN</th>
                <th>Reset PIN</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}><Loader visible={true} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }} className="text-muted">No teachers found matching your filters.</td></tr>
              ) : (
                filtered.map((t, i) => (
                  <tr key={t.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td><strong>{t.name}</strong></td>
                    <td><code style={{ fontSize: '0.8rem' }}>{t.phone || '—'}</code></td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {(t.subjects || []).slice(0, 3).join(', ') || '—'}
                      {(t.subjects || []).length > 3 && <span className="text-muted"> +{t.subjects.length - 3}</span>}
                    </td>
                    <td>
                      <button 
                        className="btn btn-ghost" 
                        style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        onClick={() => setShowPins(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                      >
                        {showPins[t.id] ? (
                          <><EyeOffIcon size={14} /> <code>{t.pin || '1234'}</code></>
                        ) : (
                          <><EyeIcon size={14} /> Show</>
                        )}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="New PIN"
                          value={editPin[t.id] || ''}
                          onChange={e => setEditPin(prev => ({ ...prev, [t.id]: e.target.value.replace(/\D/g, '') }))}
                          className="form-input"
                          style={{ width: 80, padding: '4px 8px', textAlign: 'center', fontSize: '0.85rem' }}
                        />
                        <button 
                          className="btn btn-success" 
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => handleResetPin(t)}
                          disabled={!editPin[t.id]}
                        >
                          <RefreshIcon size={12} /> Set
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
