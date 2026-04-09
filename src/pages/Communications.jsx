import React, { useState, useEffect, useMemo } from 'react';
import { getStudents, getSchoolProfile, logCommunication, getCommunicationLogs, getSMSLogs } from '../data/store';
import { 
  HistoryIcon, PlatformZapIcon, CheckIcon, 
  SearchIcon, MessageIcon, RocketIcon 
} from '../components/CommonIcons';
import Select from '../components/Common/Select';
import { Helmet } from 'react-helmet-async';
import { useDialog } from '../contexts/DialogContext';

export default function Communications({ currentUser }) {
  const { alert } = useDialog();
  const [history, setHistory] = useState([]);
  const [students, setStudents] = useState([]);
  const [profile, setProfile] = useState(null);
  
  // Composer State
  const [targetAudience, setTargetAudience] = useState('all');
  const [targetStream, setTargetStream] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('broadcasts');
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
      const logs = await getSMSLogs();
      setSmsLogs(logs);
    } catch (err) {
      console.error("Error loading communications:", err);
    }
  };

  const filteredStudents = useMemo(() => {
    if (targetAudience === 'all') return students;
    if (targetAudience === 'defaulters') return students.filter(s => s.balance > 0);
    
    let base = students.filter(s => s.class === targetAudience);
    if (targetStream) {
      base = base.filter(s => s.stream === targetStream);
    }
    return base;
  }, [students, targetAudience, targetStream]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim()) return;
    setIsSending(true);
    
    try {
      const newComm = {
        type: 'SMS',
        target: targetStream ? `${targetAudience} - ${targetStream}` : targetAudience,
        message: message.trim(),
        recipientCount: filteredStudents.length
      };
      
      await logCommunication(newComm);
      
      setIsSending(false);
      setShowSuccess(true);
      setMessage('');
      loadData();
      
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert({ title: 'Broadcast Failed', message: `Failed to log broadcast: ${err.message}`, variant: 'danger' });
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

      {/* PURPOSE HEADER */}
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
          {/* COMPOSER */}
          <div className="comm-card glass">
            <h2 className="section-title">Compose Broadcast</h2>
            
            <form onSubmit={handleSend}>
              <div className="form-group">
                <label>Messaging Template</label>
                <Select 
                  options={[
                    { id: '', label: 'Select a template...' },
                    { id: 'fee', label: 'Fee Reminder' },
                    { id: 'meeting', label: 'PTA Meeting' },
                    { id: 'holiday', label: 'Holiday Notice' }
                  ]}
                  onChange={e => {
                    const t = {
                      fee: "Dear Parent, please clear your outstanding fee balance. Thank you.",
                      meeting: "Notice: There is a PTA meeting scheduled for [Date] at [Time].",
                      holiday: "School closes on [Date] for the term break. We wish you a safe holiday."
                    };
                    if (e.target.value) setMessage(t[e.target.value]);
                  }}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label>Target Class / Audience</label>
                <div className="audience-selector">
                  <button type="button" className={`aud-btn ${targetAudience === 'all' ? 'active' : ''}`} onClick={() => { setTargetAudience('all'); setTargetStream(''); }}>All Parents</button>
                  <button type="button" className={`aud-btn ${targetAudience === 'defaulters' ? 'active' : ''}`} onClick={() => { setTargetAudience('defaulters'); setTargetStream(''); }}>Defaulters</button>
                  {activeClasses.map(c => (
                    <button key={c} type="button" className={`aud-btn ${targetAudience === c ? 'active' : ''}`} onClick={() => { setTargetAudience(c); setTargetStream(''); }}>Grade {c}</button>
                  ))}
                </div>
              </div>

              {streamsForClass.length > 0 && (
                <div className="form-group animate-slide-down">
                  <label>Filter by Stream (Optional)</label>
                  <div className="stream-selector">
                    <button type="button" className={`stream-btn ${targetStream === '' ? 'active' : ''}`} onClick={() => setTargetStream('')}>All Streams</button>
                    {streamsForClass.map(s => (
                      <button key={s} type="button" className={`stream-btn ${targetStream === s ? 'active' : ''}`} onClick={() => setTargetStream(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Message Content</label>
                <textarea 
                  value={message} 
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your broadcast message here..."
                  rows={6}
                  required
                />
                <div className="char-count">
                  {message.length} chars • {Math.ceil(message.length / 160) || 1} SMS units
                </div>
              </div>

              <button className="send-btn" type="submit" disabled={isSending || !message}>
                {isSending ? 'Sending...' : 'Launch Broadcast'} <RocketIcon size={20} />
              </button>
            </form>
          </div>
        </div>

        <div className="comm-side">
          {/* STATS */}
          <div className="comm-card glass stats-card">
            <h4>Broadcast Insights</h4>
            <div className="stat-row">
              <span className="stat-l">Recipients</span>
              <span className="stat-v">{filteredStudents.length}</span>
            </div>
            <div className="stat-row">
              <span className="stat-l">Target</span>
              <span className="stat-v" style={{ textTransform: 'capitalize' }}>
                {targetAudience} {targetStream && `(${targetStream})`}
              </span>
            </div>
          </div>

          {/* RECENT */}
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
        
        .comm-header { 
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          padding: 48px; border-radius: 32px; color: #fff; margin-bottom: 40px;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.1);
        }
        .comm-icon-box { background: rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; }
        .comm-badges { display: flex; gap: 20px; margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); }
        .comm-badge { font-size: 0.8rem; font-weight: 700; display: flex; alignItems: center; gap: 8px; opacity: 0.8; }

        .comm-layout { display: grid; grid-template-columns: 1fr 320px; gap: 40px; }
        .comm-card { border-radius: 32px; padding: 32px; }
        .comm-card.glass { background: #fff; border: 1.5px solid #e2e8f0; }
        
        .section-title { font-size: 1.25rem; font-weight: 900; margin-bottom: 24px; }
        .form-group { margin-bottom: 24px; }
        .form-group label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; }
        
        .audience-selector, .stream-selector { display: flex; flex-wrap: wrap; gap: 10px; }
        .aud-btn, .stream-btn { 
          background: #f8fafc; border: 1.5px solid #e2e8f0; padding: 10px 20px; border-radius: 12px; 
          font-weight: 700; font-size: 0.85rem; color: #64748b; cursor: pointer; transition: all 0.2s;
        }
        .aud-btn.active, .stream-btn.active { background: #5b3ef5; border-color: #5b3ef5; color: #fff; box-shadow: 0 8px 16px rgba(91,62,245,0.2); }
        
        textarea { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 20px; font-size: 1rem; outline: none; transition: border-color 0.2s; font-family: inherit; }
        textarea:focus { border-color: #5b3ef5; }
        .char-count { text-align: right; font-size: 0.75rem; color: #94a3b8; font-weight: 700; margin-top: 8px; }

        .send-btn { 
          width: 100%; padding: 18px; border-radius: 100px; background: #5b3ef5; color: #fff; 
          border: none; font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; gap: 12px;
          cursor: pointer; transition: all 0.25s; box-shadow: 0 10px 30px rgba(91,62,245,0.3);
        }
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
