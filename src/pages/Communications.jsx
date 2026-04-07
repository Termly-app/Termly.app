import React, { useState, useEffect } from 'react';
import { getStudents, getSchoolProfile, logCommunication, getCommunicationLogs, getSMSLogs } from '../data/store';
import { 
  HistoryIcon, ZapIcon, PhoneIcon, CheckIcon, CrossIcon, ClockIcon, 
  SearchIcon, MessageIcon, SendIcon, UsersIcon 
} from '../components/CommonIcons';
import Select from '../components/Common/Select';
import { Helmet } from 'react-helmet-async';

export default function Communications({ currentUser }) {
  const [history, setHistory] = useState([]);
  const [students, setStudents] = useState([]);
  const [profile, setProfile] = useState(null);
  
  // Composer State
  const [targetAudience, setTargetAudience] = useState('all');
  const [channel, setChannel] = useState('sms');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('broadcasts');
  const [smsLogs, setSmsLogs] = useState([]);
  const [smsLoading, setSmsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const comms = await getCommunicationLogs();
      setHistory(comms);
      const studs = await getStudents();
      setStudents(studs);
      const prof = await getSchoolProfile();
      setProfile(prof);
      
      setSmsLoading(true);
      const logs = await getSMSLogs();
      setSmsLogs(logs);
      setSmsLoading(false);
    } catch (err) {
      console.error("Error loading communications:", err);
      setSmsLoading(false);
    }
  };

  const templates = {
    fee_reminder: "Dear Parent, this is a gentle reminder to clear your pending fee balance of {balance} for {student_name} to avoid disruptions. Pay via Paybill 123456.",
    holiday: "Notice: The school closes on Friday for half-term. Students are expected back on Tuesday. Enjoy the break!",
    meeting: "Dear Parents, we have a scheduled PTA Meeting this Saturday at 9:00 AM. Your attendance is highly valued."
  };

  const handleTemplateChange = (e) => {
    const val = e.target.value;
    if (templates[val]) setMessage(templates[val]);
  };

  const getRecipientCount = () => {
    if (targetAudience === 'all') return students.length || 0;
    if (targetAudience === 'defaulters') return Math.floor((students.length || 0) * 0.4); // Mock count
    return students.filter(s => s.class === targetAudience).length;
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    
    setTimeout(async () => {
      try {
        const newComm = {
          type: channel.toUpperCase(),
          target: targetAudience,
          message: message.trim(),
          recipientCount: getRecipientCount()
        };
        
        await logCommunication(newComm);
        
        setIsSending(false);
        setShowSuccess(true);
        setMessage('');
        loadData();
        
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (err) {
        alert(`Failed to log broadcast: ${err.message}`);
        setIsSending(false);
      }
    }, 1500);
  };

  const activeClasses = profile?.activeClasses || [];

  return (
    <div className="section-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1.2fr) 2fr', gap: 24, minHeight: 'calc(100vh - 120px)' }}>
      <Helmet>
        <title>Bulk Communications & SMS | ShuleSoft — Parent Engagement</title>
        <meta name="description" content="Send bulk SMS and WhatsApp broadcasts to parents, staff, and students. Improve school-to-home engagement." />
      </Helmet>
      
      {/* LEFT PANE: History & Logs */}
      <div style={{ paddingRight: 24, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 20 }}>
          <button 
            onClick={() => setActiveTab('broadcasts')}
            style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: activeTab === 'broadcasts' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'broadcasts' ? 'var(--primary)' : 'var(--text-light)', transition: 'all 0.2s' }}
          >
            Broadcasts
          </button>
          <button 
            onClick={() => setActiveTab('sms')}
            style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: activeTab === 'sms' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'sms' ? 'var(--primary)' : 'var(--text-light)', transition: 'all 0.2s' }}
          >
            SMS Logs
          </button>
        </div>

        {activeTab === 'broadcasts' ? (
          <>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main)' }}>
              <HistoryIcon size={20} /> Broadcast History
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
              {history.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  No broadcasts yet.
                </div>
              ) : history.map(log => (
                <div key={log.id} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{log.type}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{new Date(log.date).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>Target: {log.target}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', lineHeight: 1.4, marginBottom: 10 }}>{log.message}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>{log.recipientCount} Recipients</span>
                    <CheckIcon size={14} color="var(--success)" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main)' }}>
              <PhoneIcon size={20} /> Message History
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
              {smsLoading ? (
                <div style={{ padding: 20, textAlign: 'center' }}>Loading logs...</div>
              ) : smsLogs.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  No SMS messages in log.
                </div>
              ) : smsLogs.map((log, i) => (
                <div key={i} style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{log.phone_number}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', marginTop: 2 }}>{new Date(log.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ 
                      fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20,
                      background: log.status === 'sent' ? '#dcfce7' : log.status === 'failed' ? '#fee2e2' : '#fef3c7',
                      color: log.status === 'sent' ? '#166534' : log.status === 'failed' ? '#991b1b' : '#92400e'
                    }}>
                      {log.status}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', lineHeight: 1.4, fontStyle: log.type === 'attendance' ? 'italic' : 'normal' }}>
                    {log.message}
                  </div>
                  {log.type === 'attendance' && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <ClockIcon size={12} color="var(--primary)" />
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)' }}>Attendance Alert</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* RIGHT PANE: Composer */}
      <div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageIcon size={20} /> Compose Broadcast
        </h2>

        <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 24, border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          {showSuccess && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '12px 16px', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <CheckIcon size={18} /> Broadcast successfully dispatched to carrier!
            </div>
          )}

          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>Communication Channel</label>
              <Select 
                value={channel} 
                onChange={(e) => setChannel(e.target.value)}
                options={[
                  { id: 'sms', label: 'Standard SMS' },
                  { id: 'whatsapp', label: 'WhatsApp Business API' }
                ]}
                style={{ width: '100%' }}
              />
            </div>
            
            <div className="form-group">
              <label>Target Audience</label>
              <Select 
                value={targetAudience} 
                onChange={(e) => setTargetAudience(e.target.value)}
                options={[
                  { id: 'all', label: 'All Parents' },
                  { id: 'defaulters', label: 'Fee Defaulters (Balance > 0)' },
                  ...activeClasses.map(c => ({ id: c, label: `${c} Parents` }))
                ]}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 10 }}>
            <label>Quick Templates</label>
            <Select 
              value={''} 
              placeholder="Select a pre-written template..."
              onChange={(e) => handleTemplateChange(e)}
              options={[
                { id: 'fee_reminder', label: 'Fee Arrears Reminder' },
                { id: 'holiday', label: 'Holiday Announcement' },
                { id: 'meeting', label: 'PTA Meeting Notice' }
              ]}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginTop: 24 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Message Contents</span>
              <span style={{ fontSize: '0.8rem', color: message.length > 160 && channel === 'sms' ? 'var(--danger)' : 'var(--text-muted)' }}>
                {message.length} chars {channel === 'sms' && `(${Math.ceil(message.length / 160 || 1)} SMS part/s)`}
              </span>
            </label>
            <textarea 
              className="form-input" 
              style={{ minHeight: 180, resize: 'vertical', fontSize: '0.95rem', lineHeight: 1.5, fontFamily: 'inherit', borderRadius: 12 }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here. For standard SMS, keep it under 160 characters for a single billing unit."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <UsersIcon size={16} /> 
              Estimated Recipients: <strong>{getRecipientCount()}</strong>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleSend}
              disabled={isSending || !message.trim()}
              style={{ padding: '12px 28px', borderRadius: 12, fontSize: '1rem', display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}
            >
              {isSending ? 'Dispatching...' : <>Dispatch {channel.toUpperCase()} <SendIcon size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
