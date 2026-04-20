import React, { useState, useEffect } from 'react';
import { getSchoolProfile, getStudents } from '../../data/store';
import { UserIcon, CheckIcon, CopyIcon, SchoolIcon, SearchIcon } from '../../components/CommonIcons';

export default function ParentPortalAdmin() {
  const [profile, setProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedRow, setCopiedRow] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([getSchoolProfile(), getStudents()]);
      setProfile(p);
      setStudents(s.filter(x => x.status !== 'Inactive'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const portalUrl = `${window.location.origin}/portal/login`;
  const magicLinkUrl = `${window.location.origin}/portal/login?school=${encodeURIComponent(profile?.schoolName || '')}`;

  const handleCopyLink = (url, id) => {
    navigator.clipboard.writeText(url);
    if (id) {
      setCopiedRow(id);
      setTimeout(() => setCopiedRow(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search || (
      s.name?.toLowerCase().includes(q) || 
      s.admNo?.toLowerCase().includes(q) ||
      s.adm_no?.toLowerCase().includes(q)
    );
    const matchClass = selectedClass === 'All' || s.class === selectedClass;
    return matchSearch && matchClass;
  });

  const classes = ['All', ...new Set(students.map(s => s.class).filter(Boolean))].sort();

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.5px' }}>Parent Portal</h2>
          <p className="text-muted">Manage parent and student access to the self-service portal</p>
        </div>
      </div>

      {/* Portal Access Link */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', padding: 10, borderRadius: 12, color: '#10b981' }}>
              <UserIcon size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Portal Access</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Parents access their child's records using Admission Number + Guardian Phone</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Generic link */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>General Portal Link</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <code style={{ flex: 1, fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, wordBreak: 'break-all' }}>{portalUrl}</code>
                <button className="btn btn-primary" onClick={() => handleCopyLink(portalUrl)} style={{ whiteSpace: 'nowrap' }}>
                  {copied ? <><CheckIcon size={14} /> Copied!</> : <><CopyIcon size={14} /> Copy</>}
                </button>
              </div>
            </div>
            
            {/* Magic link */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Magic Link (School Pre-filled)</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(16,185,129,0.03)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.15)' }}>
                <code style={{ flex: 1, fontSize: '0.82rem', color: '#059669', fontWeight: 600, wordBreak: 'break-all' }}>{magicLinkUrl}</code>
                <button className="btn btn-success" onClick={() => handleCopyLink(magicLinkUrl)} style={{ whiteSpace: 'nowrap' }}>
                  <CopyIcon size={14} /> Copy
                </button>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                Share this link with parents — your school name will be automatically filled in.
              </p>
            </div>
          </div>
          
          <div style={{ marginTop: 16, padding: 16, background: 'rgba(16,185,129,0.04)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.1)' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>
              <strong>How it works:</strong> Parents enter the <strong>School Name</strong>, their child's <strong>Admission Number</strong>, and the <strong>Guardian Phone</strong> registered in the system. 
              They can view fee balances, exam results, homework assignments, and school announcements. No account creation needed.
            </p>
          </div>
        </div>
      </div>

      {/* Student Directory (for reference) */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
              <SchoolIcon size={16} style={{ marginRight: 8, verticalAlign: '-2px' }} />
              Student Directory
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="form-input"
                style={{ width: 'auto', minWidth: 120, fontSize: '0.85rem' }}
              >
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ position: 'relative' }}>
                <SearchIcon size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 9 }} />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 32, width: 200, padding: '6px 12px 6px 32px' }}
                />
              </div>
              <span className="text-muted" style={{ fontSize: '0.82rem' }}>{filtered.length} students</span>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Adm No</th>
                <th>Class</th>
                <th>Guardian Phone</th>
                <th>Portal Access</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }} className="text-muted">Loading students...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }} className="text-muted">No students found.</td></tr>
              ) : (
                filtered.slice(0, 50).map((s, i) => {
                  const hasPhone = !!(s.parentPhone || s.parent_phone);
                  return (
                    <tr key={s.id}>
                      <td className="text-muted">{i + 1}</td>
                      <td><strong>{s.name}</strong></td>
                      <td><code style={{ fontSize: '0.8rem' }}>{s.admNo || s.adm_no}</code></td>
                      <td><span className="badge badge-info">{s.class}</span></td>
                      <td>
                        {hasPhone ? (
                          <code style={{ fontSize: '0.8rem' }}>{s.parentPhone || s.parent_phone}</code>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>Not Set</span>
                        )}
                      </td>
                      <td>
                        {hasPhone ? (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                            <CheckIcon size={10} /> Ready
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                            No Phone
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {filtered.length > 50 && (
            <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', borderTop: '1px solid var(--border)' }}>
              Showing first 50 of {filtered.length} students. Use search to find specific students.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
