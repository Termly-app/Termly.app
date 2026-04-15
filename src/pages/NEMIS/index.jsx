import React, { useState, useEffect } from 'react';
import { 
  getNEMISComplianceReport, getSchoolProfile 
} from '../../data/store';
import { 
  exportNEMIS, downloadCSV, nemisFilename 
} from '../../utils/nemisExport';
import { 
  FlagIcon, CheckIcon, AlertIcon, SearchIcon, 
  DownloadIcon, RefreshIcon, UserIcon, EditIcon, 
  ChevronRightIcon, ActivityIcon 
} from '../../components/CommonIcons';
import { Helmet } from 'react-helmet-async';
import Loader from '../../components/Common/Loader';
import { useNavigate } from 'react-router-dom';

export default function NEMISDashboard({ currentUser }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);
  const [profile, setProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAudit();
  }, []);

  const loadAudit = async () => {
    setLoading(true);
    try {
      const [rpt, prof] = await Promise.all([
        getNEMISComplianceReport(),
        getSchoolProfile()
      ]);
      setAudit(rpt);
      setProfile(prof);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!audit || audit.total === 0) return;
    // For the export, we need the raw students list. 
    // However, store.js getNEMISComplianceReport returns everything we need except the full array.
    // Let's grab the students specifically.
    import('../../data/store').then(async (m) => {
      const studs = await m.getStudents();
      const csv = exportNEMIS(studs, { includeIncomplete: true });
      downloadCSV(csv, nemisFilename(profile?.name || 'School', 'Term 1 2025'));
    });
  };

  if (loading && !audit) return <Loader />;

  const filteredIssues = audit.studentsWithIssues.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.admNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in" style={{ padding: '0 0 40px' }}>
      <Helmet>
        <title>NEMIS Compliance | ShuleSoft</title>
      </Helmet>

      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
               <FlagIcon size={24} color="#0EA5E9" />
               <h2 style={{ margin: 0 }}>NEMIS Compliance</h2>
            </div>
            <p style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Kenya National Education Management Information System Reporting</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={loadAudit}><RefreshIcon size={14} /> Refresh Audit</button>
            <button className="btn btn-primary btn-sm" onClick={handleExport}><DownloadIcon size={14} /> Export NEMIS CSV</button>
          </div>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 30 }}>
        <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--primary)' }}>
          <div style={{ color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Total Enrollment</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>{audit.total}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.8rem', color: '#10b981' }}>
            <CheckIcon size={14} /> Data synchronization active
          </div>
        </div>

        <div className="card" style={{ padding: 24, borderLeft: '4px solid #10b981' }}>
          <div style={{ color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>NEMIS Ready</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>{audit.ready}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.8rem', color: 'var(--text-light)' }}>
            Overall Readiness: <strong>{audit.readinessRate}%</strong>
          </div>
        </div>

        <div className="card" style={{ padding: 24, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Data Gaps</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b' }}>{audit.nonReady}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.8rem', color: 'var(--text-light)' }}>
            Students missing MoE fields
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        
        {/* Compliance Issues List */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0 }}>Learner Readiness Audit</h3>
            <div className="search-bar" style={{ maxWidth: 280 }}>
              <span className="search-icon"><SearchIcon size={16} /></span>
              <input 
                type="text" 
                placeholder="Find student..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <table className="data-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Class</th>
                <th>Identified Issues</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>No compliance issues found. All students are ready for NEMIS export!</td></tr>
              ) : filteredIssues.slice(0, 50).map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>ADM: {s.admNo}</div>
                  </td>
                  <td><span className="badge badge-ghost">{s.class}</span></td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {s.issues.map((iss, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', fontWeight: 600 }}>
                          {iss}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => navigate('/students', { state: { editStudentId: s.id } })}
                      title="Fix record in Students module"
                    >
                      <EditIcon size={14} /> Fix
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredIssues.length > 50 && (
            <div style={{ padding: 16, textAlign: 'center', borderTop: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-light)' }}>
              Showing first 50 results. Please use search to find specific students.
            </div>
          )}
        </div>

        {/* Breakdown Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ActivityIcon size={18} color="var(--primary)" /> Issue Breakdown
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'UPI / NEMIS No', value: audit.missingStats.upi, color: '#f59e0b' },
                { label: 'Date of Birth', value: audit.missingStats.dob, color: '#ef4444' },
                { label: 'Gender Label', value: audit.missingStats.gender, color: '#6366f1' },
                { label: 'Birth Certificate', value: audit.missingStats.birth_cert, color: '#10b981' },
                { label: 'Parent Contacts', value: audit.missingStats.parent_contact, color: '#8b5cf6' },
                { label: 'Class/Stream', value: audit.missingStats.class_stream, color: '#14b8a6' }
              ].map((stat, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>{stat.label}</span>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{stat.value}</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${(stat.value / (audit.total || 1)) * 100}%`, 
                      background: stat.color,
                      borderRadius: 3
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', border: 'none' }}>
            <h4 style={{ margin: '0 0 12px', color: '#38bdf8', fontSize: '0.9rem' }}>Official Submission</h4>
            <p style={{ fontSize: '0.8rem', lineHeight: 1.6, opacity: 0.8, marginBottom: 20 }}>
              The NEMIS portal (Kenya MoE) requires complete records for funding and placement. Use our CSV export to match their official spreadsheet format.
            </p>
            <button 
              className="btn btn-primary btn-sm" 
              style={{ width: '100%', justifyContent: 'center', background: '#38bdf8', border: 'none' }}
              onClick={handleExport}
            >
              <DownloadIcon size={14} /> Download Final CSV
            </button>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
               <a href="https://nemis.education.go.ke" target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#94a3b8', textDecoration: 'none' }}>
                 Open NEMIS Portal <ChevronRightIcon size={10} />
               </a>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .level-badge { display: flex; align-items: center; gap: 5; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
        .early-years { background: #f0fdf4; color: #16a34a; }
        .upper-primary { background: #eff6ff; color: #2563eb; }
        .junior-secondary { background: #faf5ff; color: #9333ea; }
        .senior-secondary { background: #fff7ed; color: #ea580c; }
      `}</style>
    </div>
  );
}
