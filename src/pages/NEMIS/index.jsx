import React, { useState, useEffect } from 'react';
import { getNEMISComplianceReport, getStudents } from '../../data/studentStore';
import { getSchoolProfile } from '../../data/coreStore';
import {
  getKemisConfig, saveKemisConfig, validateKemisBatch,
  exportKemisPayload, syncKemisBatch, getKemisSyncLogs
} from '../../data/kemisStore';
import { exportNEMIS, downloadCSV, nemisFilename } from '../../utils/nemisExport';
import { 
  FlagIcon, CheckIcon, AlertIcon, SearchIcon, 
  DownloadIcon, RefreshIcon, UserIcon, EditIcon, 
  ChevronRightIcon, ActivityIcon, PrintIcon, RocketIcon,
  DashboardIcon
} from '../../components/CommonIcons';
import { Helmet } from 'react-helmet-async';
import Loader from '../../components/Common/Loader';
import Select from '../../components/Common/Select';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext';

export default function NEMISDashboard({ currentUser }) {
  const navigate = useNavigate();
  const { alert, confirm, toast } = useDialog();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'sync' | 'settings'
  
  // Data states
  const [audit, setAudit] = useState(null);
  const [profile, setProfile] = useState(null);
  const [kemisConfig, setKemisConfig] = useState(null);
  const [kemisValidation, setKemisValidation] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [isSyncing, setIsSyncing] = useState(false);

  // Settings form state
  const [configForm, setConfigForm] = useState({
    institution_code: '',
    nemis_center_no: '',
    county: 'Nairobi',
    sub_county: 'Westlands',
    sync_mode: 'manual',
    api_endpoint: 'https://kemis.education.go.ke/api/v1',
    auto_sync_weekly: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rpt, prof, kConfig, kVal, kLogs] = await Promise.all([
        getNEMISComplianceReport(),
        getSchoolProfile(),
        getKemisConfig(),
        validateKemisBatch(),
        getKemisSyncLogs(),
      ]);
      setAudit(rpt);
      setProfile(prof);
      setKemisConfig(kConfig);
      setConfigForm(kConfig);
      setKemisValidation(kVal);
      setSyncLogs(kLogs);
    } catch (err) {
      console.error('[KEMIS] Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    const studs = await getStudents();
    const filtered = classFilter !== 'All' ? studs.filter(s => s.class === classFilter) : studs;
    const csv = exportKemisPayload(filtered, kemisConfig, 'csv');
    downloadCSV(csv, nemisFilename(profile?.schoolName || 'School', `KEMIS_MoE_Export_${new Date().getFullYear()}`));
    toast('KEMIS MoE CSV Payload Exported', 'success');
  };

  const handleExportJSON = async () => {
    const studs = await getStudents();
    const filtered = classFilter !== 'All' ? studs.filter(s => s.class === classFilter) : studs;
    const jsonStr = exportKemisPayload(filtered, kemisConfig, 'json');
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KEMIS_Payload_${(profile?.schoolName || 'School').replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    toast('KEMIS Government JSON Payload Exported', 'success');
  };

  const handleLiveSync = async () => {
    const confirmed = await confirm({
      title: 'Launch KEMIS Government Portal Sync?',
      message: `You are about to sync ${kemisValidation?.total || 0} learner records with the National Education Portal (${kemisConfig?.institution_code}). Proceed?`,
      variant: 'primary',
    });
    if (!confirmed) return;

    setIsSyncing(true);
    try {
      const res = await syncKemisBatch();
      toast(`Successfully synced ${res.syncedCount} records to KEMIS Portal!`, 'success');
      await loadData();
    } catch (err) {
      alert({ title: 'KEMIS Sync Error', message: err.message, variant: 'danger' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = async (e) => {
    if (e) e.preventDefault();
    try {
      await saveKemisConfig(configForm);
      toast('KEMIS Center Configuration Saved!', 'success');
      loadData();
    } catch (err) {
      alert({ title: 'Save Failed', message: err.message, variant: 'danger' });
    }
  };

  const handleFix = (studentId) => {
    navigate('/students', { state: { editStudentId: studentId } });
  };

  if (loading || !audit) return <Loader />;

  const allClasses = (profile?.activeClasses || []).sort();

  const filteredIssues = audit.studentsWithIssues.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.admNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = classFilter === 'All' || s.class === classFilter;
    return matchSearch && matchClass;
  });

  return (
    <div className="animate-in nemis-report" style={{ padding: '0 0 40px' }}>
      <Helmet>
        <title>KEMIS & NEMIS Sync Provider | Termly</title>
      </Helmet>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <FlagIcon size={24} color="#0EA5E9" />
              <h2 style={{ margin: 0 }}>KEMIS / NEMIS API Sync Provider</h2>
            </div>
            <p style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>
              Kenya Ministry of Education National Database Alignment ({kemisConfig?.institution_code || 'KEMIS-254'})
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} className="no-print">
            <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}>
              <DownloadIcon size={14} /> Export CSV
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleExportJSON}>
              <DownloadIcon size={14} /> Export MoE JSON
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleLiveSync} disabled={isSyncing}>
              <RocketIcon size={14} /> {isSyncing ? 'Syncing...' : 'Sync to KEMIS Portal'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        {[
          { id: 'audit', label: 'Learner Readiness Audit', icon: FlagIcon },
          { id: 'sync', label: 'KEMIS API Direct Sync Engine', icon: RocketIcon },
          { id: 'settings', label: 'KEMIS Portal Settings', icon: ActivityIcon },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 16px', borderRadius: 10, border: 'none',
              cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', gap: 8,
              background: activeTab === t.id ? 'var(--primary)' : 'var(--bg-card)',
              color: activeTab === t.id ? '#fff' : 'var(--text-light)',
              boxShadow: activeTab === t.id ? '0 4px 12px rgba(26,115,232,0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Summary Stats Row */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--primary)' }}>
          <div style={{ color: 'var(--text-light)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Total Learner Enrollment</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)' }}>{audit.total}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.75rem', color: '#10b981' }}>
            <CheckIcon size={12} /> Scanned against MoE Schema
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #10b981' }}>
          <div style={{ color: 'var(--text-light)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>KEMIS Compliant</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981' }}>{kemisValidation?.compliantCount || audit.ready}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 6 }}>
            Compliance Score: <strong>{kemisValidation?.overallScore || 0}%</strong>
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ color: 'var(--text-light)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>MoE Data Gaps</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b' }}>{audit.nonReady}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 6 }}>
            Missing Birth Cert / UPI / Parents ID
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #6366f1' }}>
          <div style={{ color: 'var(--text-light)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Institution Code</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#6366f1' }}>{kemisConfig?.institution_code}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 6 }}>
            {kemisConfig?.county} · {kemisConfig?.sub_county}
          </div>
        </div>
      </div>

      {/* TAB 1: AUDIT */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header no-print" style={{ flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0 }}>Learner Compliance Audit</h3>
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

          <table className="premium-table">
            <thead>
              <tr>
                <th className="no-print" style={{ width: 30 }}>#</th>
                <th>Student Name</th>
                <th className="no-print">Adm No</th>
                <th>Class</th>
                <th>MoE Compliance Gaps</th>
                <th style={{ textAlign: 'right' }} className="no-print">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>
                  No compliance issues found for {classFilter !== 'All' ? classFilter : 'the institution'}. All learners meet MoE guidelines! 🎉
                </td></tr>
              ) : filteredIssues.map((s, idx) => (
                <tr key={s.id}>
                  <td className="no-print" style={{ color: 'var(--text-light)', fontSize: '0.7rem' }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#000' }}>{s.name}</div>
                  </td>
                  <td className="no-print"><code style={{ fontSize: '0.72rem', color: '#444' }}>{s.admNo}</code></td>
                  <td><span className="badge badge-ghost">{s.class}</span></td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {s.issues.map((iss, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 4, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 700 }}>
                          {iss}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }} className="no-print">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleFix(s.id)}>
                      <EditIcon size={14} /> Edit Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: DIRECT SYNC ENGINE */}
      {activeTab === 'sync' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>KEMIS Portal Direct Sync Engine</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-light)' }}>
                  Automated REST API sync with Ministry of Education National Repository
                </p>
              </div>
              <button className="btn btn-primary" onClick={handleLiveSync} disabled={isSyncing}>
                <RocketIcon size={16} /> {isSyncing ? 'Syncing with Ministry...' : 'Run Live KEMIS Batch Sync'}
              </button>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 16, padding: 18, border: '1px solid #E2E8F0', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                <span>National Portal Readiness</span>
                <span style={{ color: '#10B981' }}>{kemisValidation?.overallScore || 0}% Ready</span>
              </div>
              <div style={{ height: 10, background: '#E2E8F0', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${kemisValidation?.overallScore || 0}%`, background: 'linear-gradient(135deg, #10B981, #059669)', borderRadius: 5 }} />
              </div>
            </div>

            <h4 style={{ margin: '20px 0 12px', fontSize: '0.95rem' }}>Recent KEMIS Sync Execution Logs</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Execution Time</th>
                    <th>Center Code</th>
                    <th>Total Learners</th>
                    <th>Synced</th>
                    <th>Failed</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(syncLogs || []).map((l, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{new Date(l.created_at).toLocaleString('en-KE')}</td>
                      <td><code>{l.institution_code}</code></td>
                      <td>{l.total_records}</td>
                      <td style={{ color: '#10B981', fontWeight: 700 }}>{l.synced_records}</td>
                      <td style={{ color: l.failed_records > 0 ? '#DC2626' : '#6B7280' }}>{l.failed_records}</td>
                      <td>
                        <span style={{
                          background: l.status === 'success' ? '#ECFDF5' : '#FFFBEB',
                          color: l.status === 'success' ? '#059669' : '#D97706',
                          padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                        }}>
                          {l.status === 'success' ? 'Completed ✅' : 'Partial Sync ⚠️'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="card" style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}>KEMIS Provider Configuration</h3>
          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label>KEMIS School Institution Code</label>
              <input
                type="text" className="form-input"
                value={configForm.institution_code}
                onChange={e => setConfigForm({ ...configForm, institution_code: e.target.value })}
                placeholder="e.g. KEMIS-254-NBI-091" required
              />
            </div>
            <div className="form-group">
              <label>NEMIS Center Registration Number</label>
              <input
                type="text" className="form-input"
                value={configForm.nemis_center_no}
                onChange={e => setConfigForm({ ...configForm, nemis_center_no: e.target.value })}
                placeholder="e.g. NEMIS-CTR-994" required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>County</label>
                <input
                  type="text" className="form-input"
                  value={configForm.county}
                  onChange={e => setConfigForm({ ...configForm, county: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Sub-County</label>
                <input
                  type="text" className="form-input"
                  value={configForm.sub_county}
                  onChange={e => setConfigForm({ ...configForm, sub_county: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Sync Mode</label>
              <Select
                value={configForm.sync_mode}
                onChange={e => setConfigForm({ ...configForm, sync_mode: e.target.value })}
                options={[
                  { id: 'manual', label: 'Manual Export (CSV & MoE JSON Payloads)' },
                  { id: 'live_api', label: 'Direct REST API Live Sync' },
                ]}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
              Save KEMIS Settings
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
