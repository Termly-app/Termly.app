import React, { useState, useEffect, useMemo } from 'react';
import { 
  getStudents, getSchoolProfile, logCommunication, getCommunicationLogs, 
  sendSMSMessage, sendWhatsAppMessage 
} from '../data/store';
import { 
  HistoryIcon, PlatformZapIcon, CheckIcon, SearchIcon, MessageIcon, RocketIcon, 
  UserIcon 
} from '../components/CommonIcons';
import Select from '../components/Common/Select';
import { Helmet } from 'react-helmet-async';
import { useDialog } from '../contexts/DialogContext';

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
  const [smsLogs, setSmsLogs] = useState([]);

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
      const phones = filteredRecipients.map(r => r.parentPhone).filter(Boolean);
      
      if (channel === 'whatsapp') {
        await sendWhatsAppMessage(phones, message.trim());
      } else {
        await sendSMSMessage(phones, message.trim());
      }

      await logCommunication({
        target: activeTab === 'individual' ? selectedStudent.name : `${targetAudience} ${targetStream}`,
        message: message.trim(),
        type: channel,
        count: phones.length
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

  const activeClasses = profile?.activeClasses || [];
  const streamsForClass = targetAudience !== 'all' && targetAudience !== 'defaulters' 
    ? Array.from(new Set(students.filter(s => s.class === targetAudience).map(s => s.stream))).filter(Boolean)
    : [];

  return (
    <div className="comm-center animate-in">
      <Helmet>
        <title>Communication Center | ShuleSoft</title>
      </Helmet>

      <div className="comm-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <div className="comm-icon-box">
            <MessageIcon size={28} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900 }}>Communication Center</h1>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '1.05rem' }}>Broadcast bulk SMS and portal notifications to the right audience.</p>
          </div>
        </div>
        
        <div className="comm-badges">
          <div className="comm-badge"><CheckIcon size={14} /> SMS Gateway: Online</div>
          <div className="comm-badge"><CheckIcon size={14} /> Portal Sync: Active</div>
          <div className="comm-badge"><CheckIcon size={14} /> ShuleSoft Cloud Delivery</div>
        </div>
      </div>

      <div className="comm-layout">
        <div className="comm-main">
          <div className="comm-card glass composer-card">
            <div className="tab-switcher">
              <button className={activeTab === 'broadcasts' ? 'active' : ''} onClick={() => setActiveTab('broadcasts')}>Class Broadcast</button>
              <button className={activeTab === 'individual' ? 'active' : ''} onClick={() => setActiveTab('individual')}>Individual Parent</button>
            </div>

            <form onSubmit={handleSend}>
              {activeTab === 'broadcasts' ? (
                <div className="row">
                  <div className="col">
                    <label className="form-label">Target Audience</label>
                    <select
                      className="form-select"
                      value={targetAudience}
                      onChange={(e) => { setTargetAudience(e.target.value); setTargetStream(''); }}
                    >
                      <option value="all">Every Parent</option>
                      <option value="defaulters">Fee Defaulters Only</option>
                      {activeClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {targetAudience !== 'all' && targetAudience !== 'defaulters' && (
                    <div className="col">
                      <label className="form-label">Stream (Optional)</label>
                      <select
                        className="form-select"
                        value={targetStream}
                        onChange={(e) => setTargetStream(e.target.value)}
                      >
                        <option value="All Streams">All Streams</option>
                        {streamsForClass.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="col" style={{ marginBottom: 24 }}>
                  <label className="form-label">Search Student/Parent</label>
                  <div className="search-field">
                    <SearchIcon size={18} />
                    <input 
                      type="text" 
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
                            <strong>{s.name}</strong>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{s.class} {s.stream} — Parent: {s.parentName}</div>
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

              <div className="col" style={{ marginTop: 20 }}>
                <label className="form-label">Message Content</label>
                <textarea
                  className="form-textarea"
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div className="char-count">
                  {message.length} characters | {Math.ceil(message.length / 160)} SMS segment(s)
                </div>
              </div>

              <div className="row" style={{ marginTop: 24, alignItems: 'center' }}>
                <div className="col">
                  <label className="form-label">Dispatch Channel</label>
                  <div className="channel-btns">
                    <button type="button" className={channel === 'sms' ? 'on' : ''} onClick={() => setChannel('sms')}>SMS</button>
                    <button type="button" className={`wa ${channel === 'whatsapp' ? 'on' : ''}`} onClick={() => setChannel('whatsapp')}>WhatsApp</button>
                  </div>
                </div>
                <button className="send-btn" type="submit" disabled={isSending || !message || (activeTab === 'individual' && !selectedStudent)}>
                  {isSending ? 'Sending...' : 'Launch Broadcast'} <RocketIcon size={20} />
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="comm-side">
          <div className="comm-card glass stats-card">
            <h4>Broadcast Insights</h4>
            <div className="stat-row">
              <span className="stat-l">Recipients</span>
              <span className="stat-v">{filteredRecipients.length}</span>
            </div>
            <div className="stat-row">
              <span className="stat-l">Target</span>
              <span className="stat-v" style={{ textTransform: 'capitalize' }}>
                {activeTab === 'individual' ? 'Specific Parent' : targetAudience} {targetStream && `(${targetStream})`}
              </span>
            </div>
          </div>

          <div className="comm-card glass recent-card">
            <h4>Recent Activity</h4>
            <div className="history-list">
              {history.slice(0, 5).map((log, i) => (
                <div key={i} className="history-item">
                  <div className="h-dot"></div>
                  <div className="h-info">
                    <div className="h-target">{log.target}</div>
                    <div className="h-msg">{log.message.substring(0, 40)}...</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .comm-center { padding: 40px; background: #f8fafc; min-height: 100vh; }
        .comm-header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 48px; border-radius: 32px; color: #fff; margin-bottom: 40px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.1); }
        .comm-icon-box { background: rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; }
        .comm-badges { display: flex; gap: 20px; margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); }
        .comm-badge { font-size: 0.8rem; font-weight: 700; display: flex; alignItems: center; gap: 8px; opacity: 0.8; }
        .comm-layout { display: grid; grid-template-columns: 1fr 320px; gap: 40px; }
        .comm-card { border-radius: 32px; padding: 32px; }
        .comm-card.glass { background: #fff; border: 1.5px solid #e2e8f0; }
        .form-label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; }
        .form-select { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600; }
        .form-textarea { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 20px; font-size: 1rem; outline: none; transition: border-color 0.2s; font-family: inherit; }
        .form-textarea:focus { border-color: #5b3ef5; }
        .char-count { text-align: right; font-size: 0.75rem; color: #94a3b8; font-weight: 700; margin-top: 8px; }
        .tab-switcher { display: flex; gap: 10px; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
        .tab-switcher button { background: transparent; border: none; padding: 8px 16px; font-size: 0.9rem; font-weight: 700; color: #64748b; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
        .tab-switcher button.active { background: #5b3ef5; color: #fff; }
        .search-field { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px; }
        .search-field input { border: none; padding: 12px; outline: none; width: 100%; font-size: 0.9rem; }
        .search-results { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; margin-top: 8px; z-index: 100; box-shadow: 0 10px 20px rgba(0,0,0,0.05); max-height: 240px; overflow-y: auto; }
        .search-item { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .search-item:hover { background: #f8fafc; }
        .selected-badge { display: inline-flex; align-items: center; gap: 10px; background: #dcfce7; color: #15803d; padding: 6px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; margin-top: 12px; }
        .selected-badge button { background: transparent; border: none; color: #15803d; font-size: 1.2rem; cursor: pointer; }
        .channel-btns { display: flex; gap: 10px; }
        .channel-btns button { padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; font-size: 0.8rem; font-weight: 800; color: #64748b; cursor: pointer; transition: all 0.2s; }
        .channel-btns button.on { background: #5b3ef5; border-color: #5b3ef5; color: #fff; }
        .channel-btns button.wa.on { background: #25d366; border-color: #25d366; }
        .send-btn { display: flex; align-items: center; justify-content: center; gap: 12px; background: #5b3ef5; color: white; border: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: all 0.25s; box-shadow: 0 10px 30px rgba(91,62,245,0.3); }
        .send-btn:hover:not(:disabled) { background: #4a32d4; transform: translateY(-2px); }
        .send-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .stat-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem; }
        .stat-l { color: #64748b; }
        .stat-v { font-weight: 800; color: #0f172a; }

        .history-list { display: flex; flex-direction: column; gap: 16px; margin-top: 20px; }
        .history-item { display: flex; gap: 12px; }
        .h-dot { width: 8px; height: 8px; border-radius: 50%; background: #5b3ef5; margin-top: 6px; flex-shrink: 0; }
        .h-target { font-size: 0.85rem; font-weight: 800; color: #0f172a; }
        .h-msg { font-size: 0.8rem; color: #64748b; margin-top: 4px; }
      `}</style>
    </div>
  );
}
