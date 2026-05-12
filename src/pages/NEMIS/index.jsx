import React, { useState, useEffect } from 'react';
import { 
  getNEMISComplianceReport, getSchoolProfile, getStudents 
} from '../../data/store';
import { 
  exportNEMIS, downloadCSV, nemisFilename 
} from '../../utils/nemisExport';
import { 
  FlagIcon, CheckIcon, AlertIcon, SearchIcon, 
  DownloadIcon, RefreshIcon, UserIcon, EditIcon, 
  ChevronRightIcon, ActivityIcon, PrintIcon
} from '../../components/CommonIcons';
import { LogoMarkBW } from '../../components/Common/Icons';
import { Helmet } from 'react-helmet-async';
import Loader from '../../components/Common/Loader';
import Select from '../../components/Common/Select';
import { useNavigate } from 'react-router-dom';
import { CBC_STRUCTURE } from '../../data/seedData';

export default function NEMISDashboard({ currentUser }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);
  const [profile, setProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');

  // Clean branding from browser print headers
  useEffect(() => {
    const handleBefore = () => { document.title = "NEMIS Data Compliance Report"; };
    const handleAfter = () => { document.title = "NEMIS Compliance | Termly"; };
    window.addEventListener('beforeprint', handleBefore);
    window.addEventListener('afterprint', handleAfter);
    return () => {
      window.removeEventListener('beforeprint', handleBefore);
      window.removeEventListener('afterprint', handleAfter);
    };
  }, []);

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

  const handleExport = async (filterByClass) => {
    if (!audit || audit.total === 0) return;
    const studs = await getStudents();
    const toExport = filterByClass && classFilter !== 'All'
      ? studs.filter(s => s.class === classFilter)
      : studs;
    const csv = exportNEMIS(toExport, { includeIncomplete: true });
    const classLabel = filterByClass && classFilter !== 'All' ? `_${classFilter.replace(/\s+/g, '_')}` : '';
    downloadCSV(csv, nemisFilename(profile?.schoolName || 'School', `Term_1_2026${classLabel}`));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFix = (studentId) => {
    navigate('/students', { state: { editStudentId: studentId } });
  };

  if (loading && !audit) return <Loader />;

  // Build unique class list from school profile (only active classes)
  const allClasses = (profile?.activeClasses || []).sort();

  const filteredIssues = audit.studentsWithIssues.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.admNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = classFilter === 'All' || s.class === classFilter;
    return matchSearch && matchClass;
  });

  // Class-level stats
  const classStats = {};
  audit.studentsWithIssues.forEach(s => {
    if (!classStats[s.class]) classStats[s.class] = 0;
    classStats[s.class]++;
  });

  return (
    <div className="animate-in nemis-report" style={{ padding: '0 0 40px' }}>
      <Helmet>
        <title>NEMIS Compliance | Termly</title>
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm no-print" onClick={handlePrint}><PrintIcon size={14} /> Print Report</button>
          </div>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--primary)' }}>
          <div style={{ color: 'var(--text-light)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Total Enrollment</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)' }}>{audit.total}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.75rem', color: '#10b981' }}>
            <CheckIcon size={12} /> Synced
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #10b981' }}>
          <div style={{ color: 'var(--text-light)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>NEMIS Ready</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981' }}>{audit.ready}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 6 }}>
            Readiness: <strong>{audit.readinessRate}%</strong>
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ color: 'var(--text-light)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Data Gaps</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b' }}>{audit.nonReady}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 6 }}>
            Students missing MoE fields
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #6366f1' }}>
          <div style={{ color: 'var(--text-light)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Classes Affected</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#6366f1' }}>{Object.keys(classStats).length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 6 }}>
            {classFilter !== 'All' ? `Viewing: ${classFilter}` : 'All classes'}
          </div>
        </div>
      </div>

      <div className="nemis-main-grid">
        
        {/* Compliance Issues List */}
        <div className="card">
          <div className="card-header no-print" style={{ flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0 }}>Learner Readiness Audit</h3>
                <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>{filteredIssues.length}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--border-light)' }}>
              <div className="search-bar no-print" style={{ maxWidth: 240, flex: 1 }}>
                <span className="search-icon"><SearchIcon size={16} /></span>
                <input 
                  type="text" 
                  placeholder="Search by name or adm no..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="no-print">
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Class</span>
                <Select 
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  options={[
                    { id: 'All', label: 'All Classes' },
                    ...allClasses.map(c => ({ id: c, label: c }))
                  ]}
                  style={{ minWidth: 120 }}
                />
              </div>
            </div>
          </div>

          {/* Print header (only visible when printing) */}
          <div className="print-only" style={{ padding: '0 0 20px', borderBottom: '1px solid #000', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                {profile?.logo && (
                  <img src={profile.logo} alt="School Logo" style={{ width: 60, height: 60, objectFit: 'contain' }} className="print-only" />
                )}
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{profile?.schoolName || 'School'}</h1>
                  <h2 style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#333', textTransform: 'uppercase', fontWeight: 700 }}>NEMIS Data Compliance Report</h2>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#444' }}>
                <div><strong>Class:</strong> {classFilter !== 'All' ? classFilter : 'All Classes'}</div>
                <div><strong>Issues:</strong> {filteredIssues.length} Students</div>
                <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
          
          <table className="premium-table">
            <thead>
              <tr>
                <th className="no-print" style={{ width: 30 }}>#</th>
                <th>Student Name</th>
                <th className="no-print">Adm No</th>
                <th>Class</th>
                <th>Compliance Gaps</th>
                <th style={{ textAlign: 'right' }} className="no-print">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>
                  {classFilter !== 'All' 
                    ? `No compliance issues found for ${classFilter}.`
                    : 'No compliance issues found.'}
                </td></tr>
              ) : filteredIssues.map((s, idx) => (
                <tr key={s.id}>
                  <td className="no-print" style={{ color: 'var(--text-light)', fontSize: '0.7rem' }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#000' }}>{s.name}</div>
                    <div className="print-only" style={{ fontSize: '0.65rem', color: '#666' }}>Adm: {s.admNo}</div>
                  </td>
                  <td className="no-print"><code style={{ fontSize: '0.72rem', color: '#444' }}>{s.admNo}</code></td>
                  <td><span className="badge badge-ghost">{s.class}</span></td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {s.issues.map((iss, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: 3, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontWeight: 600 }}>
                          {iss}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }} className="no-print">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleFix(s.id)}>
                      <EditIcon size={14} /> Fix
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="print-only" style={{ marginTop: 40, paddingTop: 10, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', opacity: 0.6 }}>
              <LogoMarkBW size={16} />
            </div>
            <div style={{ fontSize: '0.65rem', color: '#999' }}>
               NEMIS Compliance Audit Report — Page 1 of 1
            </div>
          </div>
        </div>

        {/* Breakdown Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="no-print">
          
          {/* Class Breakdown */}
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserIcon size={16} color="var(--primary)" /> Issues by Class
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allClasses.map(cls => {
                const count = classStats[cls] || 0;
                return (
                  <div 
                    key={cls} 
                    onClick={() => setClassFilter(cls)}
                    style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 10px', borderRadius: 6, cursor: 'pointer', 
                      transition: 'all 0.15s',
                      background: classFilter === cls ? 'var(--primary-light)' : 'transparent',
                      border: classFilter === cls ? '1px solid var(--primary)' : '1px solid transparent'
                    }}
                    className="no-print"
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: classFilter === cls ? 700 : 500, color: classFilter === cls ? 'var(--primary)' : 'var(--text-main)' }}>{cls}</span>
                    {count > 0 && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 10 }}>{count}</span>
                    )}
                    {count === 0 && (
                      <CheckIcon size={12} color="#10b981" />
                    )}
                  </div>
                );
              })}
              {classFilter !== 'All' && (
                <button 
                  className="btn btn-ghost btn-sm no-print" 
                  style={{ marginTop: 4, fontSize: '0.7rem' }} 
                  onClick={() => setClassFilter('All')}
                >
                  Clear Filter · Show All
                </button>
              )}
            </div>
          </div>

          {/* Issue Breakdown */}
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ActivityIcon size={16} color="var(--primary)" /> Issue Breakdown
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'UPI / NEMIS No', value: audit.missingStats.upi, color: '#f59e0b' },
                { label: 'Date of Birth', value: audit.missingStats.dob, color: '#ef4444' },
                { label: 'Gender Label', value: audit.missingStats.gender, color: '#6366f1' },
                { label: 'Birth Certificate', value: audit.missingStats.birth_cert, color: '#10b981' },
                { label: 'Parent Contacts', value: audit.missingStats.parent_contact, color: '#8b5cf6' },
                { label: 'Class/Stream', value: audit.missingStats.class_stream, color: '#14b8a6' }
              ].map((stat, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>{stat.label}</span>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{stat.value}</span>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
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

          {/* Official Submission Card */}
          <div className="card no-print" style={{ padding: 20, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', border: 'none' }}>
            <h4 style={{ margin: '0 0 10px', color: '#38bdf8', fontSize: '0.85rem' }}>Official Submission</h4>
            <p style={{ fontSize: '0.75rem', lineHeight: 1.6, opacity: 0.8, marginBottom: 16 }}>
              The NEMIS portal (Kenya MoE) requires complete records for funding and placement. Ensure all data gaps are resolved before submitting manually on the MoE portal.
            </p>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
               <a href="https://nemis.education.go.ke" target="_blank" rel="noreferrer" style={{ fontSize: '0.65rem', color: '#94a3b8', textDecoration: 'none' }}>
                 Open NEMIS Portal <ChevronRightIcon size={10} />
               </a>
            </div>
          </div>
        </div>

      </div>

      {/* Print Styles */}
      <style>{`
        /* Desktop/UI Grid Layout */
        .nemis-main-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .nemis-main-grid {
            grid-template-columns: 1fr;
          }
        }

        .print-only { display: none !important; }

        @media print {
          /* Force TOTAL HIDING of non-essential UI */
          .no-print, .sidebar, .topbar, .mobile-toggle, .sidebar-overlay, .page-header, .no-print *,
          header, footer, nav {
            display: none !important;
          }
          
          /* Force EVERYTHING to span 100% width */
          body, #root, .app-layout, .main-content, .page-content, .nemis-report, .nemis-main-grid, .card {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 100% !important;
            display: block !important;
            position: static !important;
          }
          
          .card { border: none !important; box-shadow: none !important; }
          .print-only { display: block !important; }

          /* Header: BIG AND BOLD */
          .print-only h1 { 
            font-size: 3rem !important; 
            margin: 0 0 10px 0 !important; 
            line-height: 1 !important;
            letter-spacing: -2px !important;
          }
          .print-only h2 { font-size: 1.5rem !important; margin: 0 !important; border-bottom: 2px solid #000; padding-bottom: 5px; }
          .print-only .meta-info div { font-size: 1.2rem !important; font-weight: 600 !important; }

          /* Table: FULL WIDTH & LARGE TEXT */
          .data-table { 
            width: 100% !important;
            font-size: 1.2rem !important; 
            border-collapse: collapse !important;
            border: 3px solid #000 !important;
            margin-top: 30px !important;
          }
          .data-table th { 
            background: #eee !important; 
            font-size: 1.3rem !important;
            font-weight: 800 !important;
            padding: 15px !important;
            border-bottom: 3px solid #000 !important;
          }
          .data-table td { 
            padding: 15px !important; 
            border: 1px solid #000 !important;
            vertical-align: top !important;
            line-height: 1.4 !important;
          }

          /* Important Student Name */
          .data-table b, .data-table strong, .data-table div[style*="font-weight: 600"] {
            font-size: 1.4rem !important;
            display: block !important;
            margin-bottom: 5px !important;
          }

          /* Issue Labels: Clear and Big */
          .data-table span[style*="background"] {
            background: #fff !important;
            border: 1px solid #000 !important;
            padding: 5px 12px !important;
            font-size: 1rem !important;
            font-weight: bold !important;
            border-radius: 6px !important;
            margin: 4px !important;
            display: inline-block !important;
          }

          /* Removed local @page and body padding to inherit safe global margins */
        }
      `}</style>
    </div>
  );
}
