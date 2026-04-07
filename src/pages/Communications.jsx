import React, { useState, useEffect } from 'react';
import { db } from '../data/offlineStore';
import { MessageIcon, SendIcon, HistoryIcon, UsersIcon, CheckIcon } from '../components/CommonIcons';
import { getStudents, getSchoolProfile } from '../data/store';
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const comms = await db.communications.orderBy('timestamp').reverse().toArray();
    setHistory(comms);
    const studs = await getStudents();
    setStudents(studs);
    const prof = await getSchoolProfile();
    setProfile(prof);
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
    // specific class count
    return students.filter(s => s.class === targetAudience).length;
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    
    // Simulate network delay
    setTimeout(async () => {
      const newComm = {
        type: channel.toUpperCase(),
        target: targetAudience,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        user: currentUser?.name || 'Administrator',
        recipientCount: getRecipientCount()
      };
      
      await db.communications.add(newComm);
      
      setIsSending(false);
      setShowSuccess(true);
      setMessage('');
      loadData();
      
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1500);
  };

  const activeClasses = profile?.activeClasses || [];

  return (
    <div className="section-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: 24, minHeight: 'calc(100vh - 120px)' }}>
      <Helmet>
        <title>Bulk Communications & SMS | ShuleSoft — Parent Engagement</title>
        <meta name="description" content="Send bulk SMS and WhatsApp broadcasts to parents, staff, and students. Improve school-to-home engagement." />
      </Helmet>
      
      {/* LEFT PANE: History */}
      <div style={{ paddingRight: 24, borderRight: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <HistoryIcon size={20} /> Broadcast Logs
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {history.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12 }}>
              No messages sent yet.
            </div>
          ) : (
            history.map(log => (
              <div key={log.id} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className={`badge badge-${log.type === 'SMS' ? 'accent' : 'success'}`}>{log.type}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: 8, textTransform: 'capitalize' }}>
                  Target: {log.target.replace('_', ' ')} ({log.recipientCount} recipients)
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  "{log.message}"
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
                  Sent by {log.user}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANE: Composer */}
      <div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageIcon size={20} /> Compose Broadcast
        </h2>

        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
          {showSuccess && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '12px 16px', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
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
              <span>Message Contents</span>
              <span style={{ fontSize: '0.8rem', color: message.length > 160 && channel === 'sms' ? 'var(--danger)' : 'var(--text-muted)' }}>
                {message.length} chars {channel === 'sms' && `(${Math.ceil(message.length / 160 || 1)} SMS part/s)`}
              </span>
            </label>
            <textarea 
              className="form-input" 
              style={{ minHeight: 180, resize: 'vertical', fontSize: '0.95rem', lineHeight: 1.5, fontFamily: 'inherit' }}
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
              style={{ padding: '12px 24px', fontSize: '1rem', display: 'flex', gap: 8, alignItems: 'center' }}
            >
              {isSending ? 'Dispatching...' : <>Dispatch {channel.toUpperCase()}</>} <SendIcon size={16} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
