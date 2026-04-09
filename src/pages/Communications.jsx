import { 
  getStudents, getSchoolProfile, logCommunication, getCommunicationLogs, 
  sendSMSMessage, sendWhatsAppMessage, getWhatsAppLink 
} from '../data/store';
import { 
  HistoryIcon, PlatformZapIcon, CheckIcon, 
  SearchIcon, MessageIcon, RocketIcon, 
  UsersIcon, UserIcon, FilterIcon, AlertIcon,
  ChevronDownIcon, SchoolIcon
} from '../components/CommonIcons';
import Select from '../components/Common/Select';
import { Helmet } from 'react-helmet-async';
import { useDialog } from '../contexts/DialogContext';

export default function Communications({ currentUser }) {
  const { alert, confirm } = useDialog();
  const [history, setHistory] = useState([]);
  const [students, setStudents] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Tabs: broadcasts, individual, triggers, history
  const [activeTab, setActiveTab] = useState('broadcasts');
  
  // Composer State
  const [targetAudience, setTargetAudience] = useState('all'); // all, defaulters, [class]
  const [targetStream, setTargetStream] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [channel, setChannel] = useState('sms'); // sms, whatsapp

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [comms, studs, prof] = await Promise.all([
        getCommunicationLogs(),
        getStudents(),
        getSchoolProfile()
      ]);
      setHistory(comms);
      setStudents(studs);
      setProfile(prof);
    } catch (err) {
      console.error("Error loading communications:", err);
    } finally {
      setLoading(false);
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
      
      setIsSending(false);
      setShowSuccess(true);
      if (activeTab !== 'triggers') setMessage('');
      loadData();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert({ title: 'Dispatch Failed', message: `Failed to send messages: ${err.message}`, variant: 'danger' });
      setIsSending(false);
    }
  };

  const triggerFlow = (type) => {
    setActiveTab('broadcasts');
    if (type === 'fee') {
      setTargetAudience('defaulters');
      setMessage("Dear Parent, this is a reminder to settle your child's outstanding fee balance of KSh [BALANCE]. Please pay via Paybill 400400. Thank you.");
    } else if (type === 'attendance') {
      setTargetAudience('all');
      setMessage("Dear Parent, your child [NAME] was marked ABSENT today. Please contact the school office if this was not expected.");
    }
  };

  const activeClasses = profile?.activeClasses || [];
  const streamsForClass = targetAudience !== 'all' && targetAudience !== 'defaulters' 
    ? Array.from(new Set(students.filter(s => s.class === targetAudience).map(s => s.stream))).filter(Boolean)
    : [];

  return (
    <div className="comm-premium-v2 animate-in theme-onyx">
      <Helmet>
        <title>Command Center | ShuleSoft Communications</title>
      </Helmet>

      {/* COMMAND HEADER */}
      <div className="command-header glass">
        <div className="header-top">
          <div className="brand-badge">
            <PlatformZapIcon size={14} />
            <span>Enterprise Gateway</span>
          </div>
          <div className="status-indicator">
            <span className="dot pulse"></span>
            System Operational
          </div>
        </div>
        
        <div className="header-main">
          <div className="title-group">
            <h1>Communications Dashboard</h1>
            <p>Unified messaging command center for SMS and WhatsApp integration.</p>
          </div>
          <div className="header-actions">
            <button className={`tab-btn ${activeTab === 'broadcasts' ? 'on' : ''}`} onClick={() => setActiveTab('broadcasts')}>
              <UsersIcon size={16} /> Broadcast
            </button>
            <button className={`tab-btn ${activeTab === 'individual' ? 'on' : ''}`} onClick={() => setActiveTab('individual')}>
              <UserIcon size={16} /> Individual
            </button>
            <button className={`tab-btn ${activeTab === 'triggers' ? 'on' : ''}`} onClick={() => setActiveTab('triggers')}>
              <RocketIcon size={16} /> Automation
            </button>
            <button className={`tab-btn ${activeTab === 'history' ? 'on' : ''}`} onClick={() => setActiveTab('history')}>
              <HistoryIcon size={16} /> Logs
            </button>
          </div>
        </div>
      </div>

      <div className="command-grid">
        <div className="command-left">
          {/* COMPOSER CARD */}
          <div className="composer-card glass">
            <div className="card-hd">
              <MessageIcon size={20} />
              <span>{activeTab === 'triggers' ? 'Automation Flow' : 'Message Composer'}</span>
            </div>

            {activeTab === 'individual' && (
              <div className="control-group animate-pop">
                <label className="ctrl-lbl">Search Parent/Student</label>
                <div className="search-wrap">
                  <SearchIcon size={16} className="search-ico" />
                  <input 
                    type="text" 
                    placeholder="Type name or Admission Number..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                {searchedStudents.length > 0 && (
                  <div className="search-results glass-overlay">
                    {searchedStudents.map(s => (
                      <div key={s.id} className="search-item" onClick={() => { setSelectedStudent(s); setSearchQuery(''); }}>
                        <div className="s-info">
                          <span className="s-name">{s.name}</span>
                          <span className="s-sub">{s.class} · {s.parentPhone || 'No Phone'}</span>
                        </div>
                        <CheckIcon size={14} className={selectedStudent?.id === s.id ? 'v' : 'h'} />
                      </div>
                    ))}
                  </div>
                )}
                {selectedStudent && (
                  <div className="selected-tag">
                    <UserIcon size={14} />
                    <span>{selectedStudent.name} ({selectedStudent.class})</span>
                    <button onClick={() => setSelectedStudent(null)}>×</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'broadcasts' && (
              <div className="broadcast-selector animate-pop">
                <div className="control-group">
                  <label className="ctrl-lbl">Target Audience</label>
                  <div className="pill-grid">
                    <button className={`pill ${targetAudience === 'all' ? 'on' : ''}`} onClick={() => setTargetAudience('all')}>Global</button>
                    <button className={`pill ${targetAudience === 'defaulters' ? 'on semi' : ''}`} onClick={() => setTargetAudience('defaulters')}>Defaulters</button>
                    {activeClasses.map(c => (
                      <button key={c} className={`pill ${targetAudience === c ? 'on' : ''}`} onClick={() => setTargetAudience(c)}>Grade {c}</button>
                    ))}
                  </div>
                </div>

                {streamsForClass.length > 0 && (
                  <div className="control-group animate-slide">
                    <label className="ctrl-lbl">Specific Stream</label>
                    <div className="pill-grid">
                      <button className={`pill ${targetStream === '' ? 'on' : ''}`} onClick={() => setTargetStream('')}>All Streams</button>
                      {streamsForClass.map(s => (
                        <button key={s} className={`pill ${targetStream === s ? 'on' : ''}`} onClick={() => setTargetStream(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'triggers' && (
              <div className="triggers-grid animate-slide">
                <div className="trigger-box" onClick={() => triggerFlow('fee')}>
                  <div className="t-icon fee"><FeesIcon size={24} /></div>
                  <div className="t-txt">
                    <div className="t-title">Fee Reminder</div>
                    <div className="t-desc">Target all parents with debt.</div>
                  </div>
                </div>
                <div className="trigger-box" onClick={() => triggerFlow('attendance')}>
                  <div className="t-icon att"><AttendanceIcon size={24} /></div>
                  <div className="t-txt">
                    <div className="t-title">Absence Alert</div>
                    <div className="t-desc">Notify parents of missing kids.</div>
                  </div>
                </div>
              </div>
            )}

            <div className="control-group">
              <label className="ctrl-lbl">Message Payload</label>
              <div className="textarea-wrap">
                <textarea 
                  placeholder="Draft your enterprise message here..." 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                />
                <div className="txt-footer">
                  <div className="stats">
                    <span>{message.length} chars</span>
                    <span className="dot"></span>
                    <span>{Math.ceil(message.length / 160)} SMS units</span>
                  </div>
                  <button className="template-btn">
                    <FilterIcon size={12} /> Templates
                  </button>
                </div>
              </div>
            </div>

            <div className="dispatch-actions">
              <div className="channel-toggle">
                <button className={`ch-btn ${channel === 'sms' ? 'on' : ''}`} onClick={() => setChannel('sms')}>SMS</button>
                <button className={`ch-btn ${channel === 'whatsapp' ? 'on wa' : ''}`} onClick={() => setChannel('whatsapp')}>WhatsApp</button>
              </div>
              <button className="launch-btn" disabled={isSending || !message} onClick={handleSend}>
                {isSending ? 'Dispatching...' : channel === 'whatsapp' ? 'Blast WhatsApp' : 'Launch Broadcast'}
                <RocketIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="command-right">
          {/* ANALYTICS SECTION */}
          <div className="side-card glass">
            <div className="card-hd"><PlatformZapIcon size={16} /> Dispatch Intel</div>
            <div className="intel-stats">
              <div className="intel-item">
                <div className="intel-val">{filteredRecipients.length}</div>
                <div className="intel-lbl">Targeted Recipients</div>
              </div>
              <div className="intel-item">
                <div className="intel-val">{channel.toUpperCase()}</div>
                <div className="intel-lbl">Selected Channel</div>
              </div>
            </div>
            {targetAudience === 'defaulters' && (
              <div className="financial-intel">
                <div className="fi-lbl">Aggregate Debt Detected</div>
                <div className="fi-val">KSh 1.28M</div>
                <div className="fi-sub">Targeting 42 families</div>
              </div>
            )}
          </div>

          {/* LOGS PREVIEW */}
          <div className="side-card glass log-card">
            <div className="card-hd"><HistoryIcon size={16} /> Transmission Logs</div>
            <div className="log-list">
              {history.slice(0, 6).map((log, i) => (
                <div key={i} className="log-entry">
                  <div className={`log-type ${log.type.toLowerCase()}`}>{log.type}</div>
                  <div className="log-body">
                    <div className="log-target">{log.target}</div>
                    <div className="log-msg">{log.message}</div>
                  </div>
                  <div className="log-time">1m ago</div>
                </div>
              ))}
            </div>
            <button className="view-all-btn" onClick={() => setActiveTab('history')}>View Audit Trail</button>
          </div>
        </div>
      </div>

      <style>{`
        .comm-premium-v2 { padding: 32px; min-height: 100vh; background: #050505; color: #fff; font-family: 'Inter', sans-serif; }
        .glass { background: #121212; border: 1.5px solid rgba(255,255,255,0.06); border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
        
        .command-header { padding: 24px 32px; margin-bottom: 24px; }
        .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .brand-badge { display: flex; align-items: center; gap: 8px; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #5b3ef5; background: rgba(91,62,245,0.1); padding: 4px 10px; border-radius: 100px; }
        .status-indicator { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: #0dd88a; font-weight: 700; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #0dd88a; }
        .pulse { box-shadow: 0 0 10px #0dd88a; animation: pulse 2s infinite; }
        
        .header-main { display: flex; justify-content: space-between; align-items: flex-end; }
        .title-group h1 { font-size: 1.75rem; font-weight: 900; margin: 0; letter-spacing: -0.02em; }
        .title-group p { font-size: 0.85rem; color: #71717a; margin: 4px 0 0; }
        
        .header-actions { display: flex; gap: 8px; }
        .tab-btn { background: transparent; border: 1px solid rgba(255,255,255,0.06); color: #71717a; padding: 8px 16px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .tab-btn:hover { background: rgba(255,255,255,0.03); color: #fff; }
        .tab-btn.on { background: #fff; border-color: #fff; color: #050505; }
        
        .command-grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
        .composer-card { padding: 32px; }
        .card-hd { display: flex; align-items: center; gap: 12px; font-size: 0.85rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin-bottom: 24px; }
        
        .ctrl-lbl { display: block; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; color: #52525b; margin-bottom: 10px; letter-spacing: 0.05em; }
        .control-group { margin-bottom: 24px; position: relative; }
        
        .search-wrap { display: flex; align-items: center; background: #1a1a1a; border: 1.5px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 0 16px; }
        .search-wrap input { background: transparent; border: none; padding: 14px 12px; color: #fff; font-size: 0.9rem; outline: none; width: 100%; }
        .search-ico { color: #52525b; }
        
        .search-results { position: absolute; top: 100%; left: 0; right: 0; z-index: 100; margin-top: 8px; max-height: 300px; overflow-y: auto; background: #1a1a1a; border: 1.5px solid rgba(255,255,255,0.1); border-radius: 14px; }
        .search-item { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .search-item:hover { background: rgba(255,255,255,0.03); }
        .s-name { display: block; font-size: 0.9rem; font-weight: 700; color: #fff; }
        .s-sub { display: block; font-size: 0.75rem; color: #71717a; margin-top: 2px; }
        
        .selected-tag { display: inline-flex; align-items: center; gap: 8px; background: #5b3ef5; color: #fff; padding: 6px 14px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; margin-top: 12px; }
        .selected-tag button { background: transparent; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; padding: 0 4px; line-height: 0; }
        
        .pill-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .pill { background: #1a1a1a; border: 1.5px solid rgba(255,255,255,0.05); color: #71717a; padding: 8px 16px; border-radius: 10px; font-size: 0.75rem; font-weight: 800; cursor: pointer; transition: all 0.2s; }
        .pill:hover { border-color: rgba(255,255,255,0.15); }
        .pill.on { background: #5b3ef5; border-color: #5b3ef5; color: #fff; }
        .pill.semi { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.2); color: #f59e0b; }
        .pill.semi.on { background: #f59e0b; color: #000; }
        
        .textarea-wrap { background: #1a1a1a; border: 1.5px solid rgba(255,255,255,0.05); border-radius: 14px; overflow: hidden; }
        textarea { width: 100%; background: transparent; border: none; padding: 16px; color: #fff; font-size: 1rem; outline: none; resize: vertical; min-height: 120px; font-family: inherit; }
        .txt-footer { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.05); }
        .stats { font-size: 0.7rem; color: #52525b; display: flex; align-items: center; gap: 8px; font-weight: 700; }
        .stats .dot { font-size: 1.2rem; opacity: 0.3; }
        .template-btn { background: transparent; border: none; color: #71717a; font-size: 0.7rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        
        .dispatch-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; gap: 16px; }
        .channel-toggle { display: flex; gap: 4px; background: #1a1a1a; padding: 4px; border-radius: 14px; }
        .ch-btn { background: transparent; border: none; color: #52525b; padding: 10px 20px; border-radius: 10px; font-size: 0.75rem; font-weight: 900; cursor: pointer; transition: all 0.2s; }
        .ch-btn.on { background: #262626; color: #fff; }
        .ch-btn.on.wa { background: #25d366; color: #fff; }
        
        .launch-btn { flex: 1; background: #5b3ef5; color: #fff; border: none; padding: 16px; border-radius: 14px; font-size: 1rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.25s; box-shadow: 0 10px 25px rgba(91,62,245,0.25); }
        .launch-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(91,62,245,0.35); filter: brightness(1.1); }
        .launch-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }
        
        .side-card { padding: 24px; margin-bottom: 24px; }
        .intel-stats { display: flex; gap: 20px; margin-top: 16px; }
        .intel-item { flex: 1; }
        .intel-val { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.02em; }
        .intel-lbl { font-size: 0.65rem; color: #71717a; font-weight: 800; text-transform: uppercase; margin-top: 4px; }
        
        .financial-intel { margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(245,158,11,0.15); background: linear-gradient(to bottom, rgba(245,158,11,0.05), transparent); padding: 16px; border-radius: 14px; }
        .fi-lbl { font-size: 0.6rem; color: #f59e0b; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
        .fi-val { font-size: 1.25rem; font-weight: 900; color: #fff; margin-top: 4px; }
        .fi-sub { font-size: 0.7rem; color: #71717a; font-weight: 600; margin-top: 2px; }
        
        .log-card { flex: 1; display: flex; flex-direction: column; }
        .log-list { margin-top: 16px; display: flex; flex-direction: column; gap: 14px; }
        .log-entry { display: flex; gap: 12px; font-size: 0.8rem; align-items: flex-start; }
        .log-type { font-size: 0.55rem; font-weight: 900; background: #262626; color: #71717a; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; margin-top: 2px; }
        .log-type.whatsapp { background: rgba(37,211,102,0.1); color: #25d366; }
        .log-body { flex: 1; }
        .log-target { font-weight: 800; color: #fff; }
        .log-msg { font-size: 0.75rem; color: #71717a; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
        .log-time { font-size: 0.6rem; color: #404040; margin-top: 3px; white-space: nowrap; }
        
        .view-all-btn { background: transparent; border: 1px solid rgba(255,255,255,0.06); color: #71717a; width: 100%; padding: 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 800; cursor: pointer; margin-top: 20px; }

        .trigger-box { display: flex; gap: 16px; padding: 16px; background: #1a1a1a; border: 1.5px solid rgba(255,255,255,0.05); border-radius: 16px; cursor: pointer; transition: all 0.2s; margin-bottom: 12px; }
        .trigger-box:hover { background: #212121; border-color: rgba(255,255,255,0.15); transform: translateX(4px); }
        .t-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .t-icon.fee { background: rgba(245,158,11,0.1); color: #f59e0b; }
        .t-icon.att { background: rgba(13,216,138,0.1); color: #0dd88a; }
        .t-title { font-size: 0.9rem; font-weight: 800; color: #fff; }
        .t-desc { font-size: 0.75rem; color: #71717a; margin-top: 2px; }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-pop { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-slide { animation: slide 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        
        @keyframes pop { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slide { from { transform: translateX(-10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

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
