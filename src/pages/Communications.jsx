import React, { useState, useEffect, useMemo } from 'react';
import { isFeatureEnabled, getSchoolProfile } from '../data/coreStore';
import { getStudents } from '../data/studentStore';
import { logCommunication, sendSMSMessage, sendWhatsAppMessage } from '../data/smsStore';
import { sendBroadcast, BROADCAST_TEMPLATES } from '../data/broadcastStore';
import { getAnnouncements } from '../data/academicsStore';
import { CBC_STRUCTURE } from '../data/seedData';
import { 
  HistoryIcon, PlatformZapIcon, CheckIcon, SearchIcon, MessageIcon, RocketIcon, 
  UserIcon 
} from '../components/CommonIcons';
import Select from '../components/Common/Select';
import { Helmet } from 'react-helmet-async';
import FeatureGate from '../components/FeatureGate';
import { useDialog } from '../contexts/DialogContext';
import { useFeature } from '../contexts/FeaturesContext';

export default function Communications({ currentUser }) {
  const { alert, confirm } = useDialog();
  const [history, setHistory] = useState([]);
  const [students, setStudents] = useState([]);
  const [profile, setProfile] = useState(null);
  
  // Tabs: broadcasts, individual
  const [activeTab, setActiveTab] = useState('broadcasts');
  
  // Composer State
  const [targetAudience, setTargetAudience] = useState('all');
  const [targetStream, setTargetStream] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [channel, setChannel] = useState('sms');
  
  const { enabled: hasAccess, loading: featureLoading } = useFeature('communications');

  useEffect(() => {
    if (hasAccess) loadData();
  }, [hasAccess]);

  if (featureLoading) return <div className="p-4"><div className="spinner"></div></div>;
  if (!hasAccess) return <FeatureGate featureName="Communications & SMS" />;

  const loadData = async () => {
    try {
      const comms = await getAnnouncements();
      setHistory(comms);
      const studs = await getStudents();
      setStudents(studs);
      const prof = await getSchoolProfile();
      setProfile(prof);
    } catch (err) {
      console.error("Error loading communications:", err);
    }
  };

  const filteredRecipients = useMemo(() => {
    if (activeTab === 'individual') return selectedStudent ? [selectedStudent] : [];
    
    if (targetAudience === 'all') return students;
    if (targetAudience === 'defaulters') return students.filter(s => (s.balance || 0) > 0);
    
    let base = students.filter(s => s.class === targetAudience);
    if (targetStream && targetStream !== 'All Streams') {
      base = base.filter(s => s.stream === targetStream);
    }
    return base;
  }, [students, targetAudience, targetStream, activeTab, selectedStudent]);

  const searchedStudents = useMemo(() => {
    if (!searchQuery) return [];
    return students.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.admNo?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8);
  }, [students, searchQuery]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim()) return;
    if (filteredRecipients.length === 0) {
      alert({ title: 'No Recipients', message: 'Please select a valid audience with at least one recipient.', variant: 'warning' });
      return;
    }

    const confirmed = await confirm({
      title: `Send ${channel.toUpperCase()}?`,
      message: `You are about to send this message to ${filteredRecipients.length} recipient(s). Proceed?`,
      variant: channel === 'whatsapp' ? 'success' : 'primary'
    });

    if (!confirmed) return;

    setIsSending(true);
    try {
      const recipients = filteredRecipients.map(r => ({
        phone: r.parentPhone || r.parent_phone,
        parentName: r.parentName || r.parent_name || 'Parent',
        childName: r.name,
        admNo: r.admNo || r.adm_no,
        balance: r.balance || 0,
      }));

      await sendBroadcast({
        channel,
        templateKey: 'general_notice',
        recipients,
        data: { message: message.trim() },
        schoolName: profile?.schoolName || 'School',
      });

      setShowSuccess(true);
      setMessage('');
      if (activeTab === 'individual') setSelectedStudent(null);
      loadData();
      
      setTimeout(() => setShowSuccess(false), 3000);
      setIsSending(false);
    } catch (err) {
      alert({ title: 'Dispatch Failed', message: `Failed to send messages: ${err.message}`, variant: 'danger' });
      setIsSending(false);
    }
  };

  const allGradesOrder = useMemo(() => {
    if (!CBC_STRUCTURE) return [];
    return Object.values(CBC_STRUCTURE).flatMap(l => l.grades);
  }, []);

  const sortedActiveClasses = useMemo(() => {
    const classes = profile?.activeClasses || [];
    if (allGradesOrder.length === 0) return classes;
    return [...classes].sort((a, b) => {
      const idxA = allGradesOrder.indexOf(a);
      const idxB = allGradesOrder.indexOf(b);
      const scoreA = idxA === -1 ? 999 : idxA;
      const scoreB = idxB === -1 ? 999 : idxB;
      return scoreA - scoreB;
    });
  }, [profile?.activeClasses, allGradesOrder]);

  const streamsForClass = targetAudience !== 'all' && targetAudience !== 'defaulters' 
    ? (profile?.streamsPerClass?.[targetAudience] || [])
    : [];

  const tabBtn = (isActive) => ({
    padding:'6px 14px',borderRadius:8,border:'none',fontFamily:'inherit',fontSize:'0.8rem',
    fontWeight:isActive?700:500,cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap',
    background:isActive?'var(--bg-card)':'transparent',
    color:isActive?'var(--primary)':'var(--text-light)',
    boxShadow:isActive?'0 1px 5px rgba(0,0,0,0.08)':'none',
  });

  return (
    <div className="animate-in">
      <Helmet>
        <title>Communication Center | Termly</title>
      </Helmet>

      <div className="page-header">
        <div className="page-header-actions">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  Communication Center
                </h2>
              </div>
            </div>
            <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>Broadcast mass notifications and SMS alerts to the school community.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, alignItems: 'start' }} className="comm-responsive-grid">
        <div className="card" style={{ gridColumn: '1 / span 2', maxWidth: '800px' }}>
          <div className="card-header" style={{ paddingBottom: 12 }}>
            <div className="scroll-x-hide" style={{padding:'4px',background:'var(--bg)',borderRadius:10,border:'1px solid var(--border)',display:'inline-flex'}}>
              <button 
                onClick={() => setActiveTab('broadcasts')} 
                style={tabBtn(activeTab === 'broadcasts')}>
                Class Broadcast
              </button>
              <button 
                onClick={() => setActiveTab('individual')} 
                style={tabBtn(activeTab === 'individual')}>
                Individual Parent
              </button>
            </div>
          </div>

          <div className="card-body">
            <form onSubmit={handleSend}>
              {activeTab === 'broadcasts' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: 20 }}>
                  <div className="form-group">
                    <label>Target Audience</label>
                    <Select
                      value={targetAudience}
                      onChange={(e) => { setTargetAudience(e.target.value); setTargetStream(''); }}
                      options={[
                        { id: 'all', label: 'Every Parent' },
                        { id: 'defaulters', label: 'Fee Defaulters Only' },
                        ...sortedActiveClasses.map(c => ({ id: c, label: c }))
                      ]}
                      style={{ width: '100%' }}
                    />
                  </div>
                  {targetAudience !== 'all' && targetAudience !== 'defaulters' && (
                    <div className="form-group">
                      <label>Stream (Optional)</label>
                      <Select
                        value={targetStream}
                        onChange={(e) => setTargetStream(e.target.value)}
                        options={[
                          { id: 'All Streams', label: 'All Streams' },
                          ...streamsForClass.map(s => ({ id: s, label: s }))
                        ]}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label>Search Student/Parent</label>
                  <div className="search-field" style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '0 12px' }}>
                    <SearchIcon size={18} />
                    <input 
                      type="text" 
                      style={{ border: 'none', background: 'transparent', padding: '12px', outline: 'none', width: '100%', fontSize: '0.9rem', color: 'var(--text-main)' }}
                      placeholder="Type student name or Admission No..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {searchedStudents.length > 0 && !selectedStudent && (
                    <div className="search-results">
                      {searchedStudents.map(s => (
                        <div key={s.id} className="search-item" onClick={() => { setSelectedStudent(s); setSearchQuery(''); }}>
                          <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 2 }}>{s.admNo}</div>
                            <strong style={{ fontSize: '0.95rem' }}>{s.name}</strong>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{s.class} {s.stream} - Parent: {s.parentName}</div>
                          </div>
                          <UserIcon size={14} />
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedStudent && (
                    <div className="selected-badge">
                      <span>Target: {selectedStudent.name} ({selectedStudent.parentName})</span>
                      <button type="button" onClick={() => setSelectedStudent(null)}>&times;</button>
                    </div>
                  )}
                </div>
              )}

              {/* Phase 1: Broadcast Templates */}
              <div className="form-group" style={{ marginTop: 16 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span>Quick Templates</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 500 }}>WhatsApp & SMS Flow Templates</span>
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {Object.entries(BROADCAST_TEMPLATES).map(([key, tpl]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        const sampleData = {
                          schoolName: profile?.schoolName || 'School',
                          message: message || 'Important announcement from administration.',
                          phone: profile?.phone || '0700000000',
                          parentName: 'Parent',
                          childName: 'Student Name',
                          balance: 15000,
                          paybill: profile?.paybill || '247247',
                          admNo: 'ADM-101',
                          examName: 'Opener Exam',
                          average: 78.5,
                        };
                        setMessage(tpl.smsTemplate(sampleData));
                      }}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                        background: tpl.bg, color: tpl.color, fontSize: '0.75rem', fontWeight: 700,
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <span>{tpl.icon}</span> {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Message Content</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: 120, resize: 'vertical' }}
                  placeholder="Type your message here or select a template above..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: 4 }}>
                  {message.length} characters | {Math.ceil(message.length / 160)} SMS segment(s)
                </div>
              </div>

              <div style={{ marginTop: 24, padding: 16, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: 8 }}>Dispatch Channel</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className={channel === 'sms' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setChannel('sms')} style={{ border: channel !== 'sms' ? '1px solid var(--border)' : 'none' }}>SMS</button>
                    <button type="button" className={channel === 'whatsapp' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setChannel('whatsapp')} style={{ border: channel !== 'whatsapp' ? '1px solid var(--border)' : 'none', background: channel === 'whatsapp' ? '#25d366' : undefined }}>WhatsApp</button>
                    <button type="button" className={channel === 'both' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setChannel('both')} style={{ border: channel !== 'both' ? '1px solid var(--border)' : 'none', background: channel === 'both' ? 'linear-gradient(135deg, #10b981, #2563eb)' : undefined }}>Both (SMS + WA)</button>
                  </div>
                </div>
                <button className="btn btn-primary" type="submit" style={{ flexShrink: 0, height: 44, padding: '0 24px', borderRadius: 10 }} disabled={isSending || !message || (activeTab === 'individual' && !selectedStudent)}>
                  {isSending ? 'Sending...' : 'Launch Broadcast'} <RocketIcon size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <h3>Broadcast Insights</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Recipients</span>
                <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem' }}>{filteredRecipients.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Target</span>
                <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                  {activeTab === 'individual' ? 'Specific Parent' : targetAudience} {targetStream && `(${targetStream})`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
