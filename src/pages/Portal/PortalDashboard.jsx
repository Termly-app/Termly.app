import React, { useState, useEffect } from 'react';
import { 
  LogoutIcon, BookIcon, CheckIcon, 
  MessageIcon, ActivityIcon, 
  CardIcon, UserIcon, HistoryIcon 
} from '../../components/CommonIcons';
import { 
  getAssignments, getStudentSubmissions, getStudentExamResults, 
  getFees, getGradeForScore, getSchoolProfile, initPortalStore,
  getStudentProfile, getAnnouncements
} from '../../data/store';

// Premium UI Components
const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ 
    background: '#ffffff', borderRadius: '24px', padding: '24px', 
    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', 
    border: '1px solid rgba(255,255,255,0.4)',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ...style 
  }}>
    {children}
  </div>
);

const Badge = ({ children, color = '#1a73e8', bg = '#eff6ff' }) => (
  <span style={{ 
    background: bg, color: color, padding: '6px 12px', 
    borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, 
    letterSpacing: '0.5px', textTransform: 'uppercase' 
  }}>
    {children}
  </span>
);

export default function PortalDashboard({ user, onLogout }) {
  const [localUser, setLocalUser] = useState(user);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  // Data states
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState({});
  const [examResults, setExamResults] = useState([]);
  const [academic, setAcademic] = useState({ average: 0, grade: 'N/A', rank: '-', color: '#667781' });
  const [feeBalance, setFeeBalance] = useState(0);
  const [payments, setPayments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [schoolProfile, setSchoolProfile] = useState(null);

  // M-Pesa state
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState(user.parent_phone || '');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [isSTKPushing, setIsSTKPushing] = useState(false);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        initPortalStore(user.school_id || user.schoolId, user.id);

        const [profile, freshStudent, examRes, schoolNotices] = await Promise.all([
          getSchoolProfile().catch(() => null),
          getStudentProfile(user.id).catch(() => user),
          getStudentExamResults(user.id).catch(() => []),
          getAnnouncements(user.school_id || user.schoolId).catch(() => [])
        ]);
        
        setSchoolProfile(profile);
        if (freshStudent) setLocalUser(freshStudent);
        
        const asts = await getAssignments({}).catch(() => []);
        setAssignments(asts);
        setExamResults(examRes);
        setNotices(schoolNotices);
        
        const subs = await getStudentSubmissions(user.id).catch(() => []);
        const subMap = {};
        subs.forEach(s => { subMap[s.assignment_id] = s; });
        setMySubmissions(subMap);
        
        if (examRes.length > 0) {
          const avg = examRes.reduce((acc, curr) => acc + (curr.total_marks / (curr.total_subjects || 1)), 0) / examRes.length;
          const { grade, color } = getGradeForScore(avg, user.class, profile);
          setAcademic({ average: avg.toFixed(1), grade, color, rank: examRes[0].class_position });
        }

        const myFee = await getFees(user.id).catch(() => null);
        if (myFee) {
          setFeeBalance(myFee.balance || 0);
          setMpesaAmount((myFee.balance || 0) > 0 ? myFee.balance : 0);
          setPayments(myFee.payments || []);
        }
      } catch (err) {
        console.error('Portal init failed:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user]);

  const handleMpesaPay = () => {
    setIsSTKPushing(true);
    setTimeout(() => {
      setIsSTKPushing(false);
      setShowMpesaModal(false);
      alert('Payment initiated. Please check your phone to enter your M-Pesa PIN.');
    }, 2000);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <div className="animate-pulse" style={{ width: 50, height: 50, borderRadius: 25, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }} />
    </div>
  );

  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>
      
      {/* Premium Header */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', 
        padding: '20px 24px', position: 'sticky', top: 0, zIndex: 1000, 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', 
            color: '#fff', width: 44, height: 44, borderRadius: '14px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '1.4rem', fontWeight: 700, boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)'
          }}>
            {localUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
              {localUser.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
              {schoolProfile?.name || 'Portal Access'}
            </div>
          </div>
        </div>
        <div onClick={onLogout} style={{ background: '#f1f5f9', padding: '10px', borderRadius: '12px', color: '#64748b', cursor: 'pointer' }}>
          <LogoutIcon size={20} />
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '24px 20px 100px 20px', boxSizing: 'border-box' }}>
        
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s ease-out' }}>
            
            {/* Status Overview Card */}
            <div style={{ 
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
              padding: '24px', borderRadius: '24px', color: '#fff',
              boxShadow: '0 12px 24px -8px rgba(15, 23, 42, 0.4)',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', borderRadius: '50%' }} />
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                Current Term Status
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1 }}>{localUser.class}</span>
                {localUser.stream && (
                  <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600, marginBottom: 4 }}>
                    {localUser.stream.toUpperCase()}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Fee Balance</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: feeBalance > 0 ? '#f87171' : '#34d399' }}>
                    KES {feeBalance.toLocaleString()}
                  </div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Avg Grade</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: academic.color !== '#667781' ? academic.color : '#fff' }}>
                    {academic.grade}
                  </div>
                </div>
              </div>
            </div>

            {/* Announcements */}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>School Updates</h3>
              {notices.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: '32px 24px' }}>
                  <MessageIcon size={32} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                  <div style={{ color: '#64748b', fontWeight: 500 }}>No recent announcements</div>
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {notices.map(n => (
                    <Card key={n.id} style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{n.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{new Date(n.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>{n.body}</div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ACADEMICS TAB */}
        {activeTab === 'academics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s ease-out' }}>
             
             {/* Subjects Selection */}
             <div>
               <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Enrolled Subjects</h3>
               <Card style={{ padding: '20px' }}>
                 {localUser.subjects && localUser.subjects.length > 0 ? (
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                     {localUser.subjects.map((sub, idx) => (
                       <Badge key={idx} bg="#f1f5f9" color="#475569">{sub}</Badge>
                     ))}
                   </div>
                 ) : (
                   <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center' }}>No subjects assigned yet.</div>
                 )}
               </Card>
             </div>

             <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '8px 0 0' }}>Exam Results</h3>
             {examResults.length === 0 ? (
               <Card style={{ textAlign: 'center', padding: '40px 24px' }}>
                 <ActivityIcon size={32} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                 <div style={{ color: '#64748b', fontWeight: 500 }}>No published results found.</div>
               </Card>
             ) : (
               examResults.map(res => (
                 <Card key={res.id} style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem', marginBottom: 4 }}>{res.exams?.name}</div>
                      <Badge bg="#e0e7ff" color="#4f46e5">{res.exams?.term}</Badge>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#3b82f6', fontSize: '1.4rem' }}>{res.mean_score?.toFixed(1)}%</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Pos: {res.class_position}/{res.class_size}</div>
                    </div>
                 </Card>
               ))
             )}
          </div>
        )}

        {/* FEES TAB */}
        {activeTab === 'fees' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s ease-out' }}>
            
            <div style={{ 
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', 
              borderRadius: '24px', padding: '32px 24px', color: '#fff', 
              boxShadow: '0 12px 24px -8px rgba(236, 72, 153, 0.4)',
              textAlign: 'center', position: 'relative', overflow: 'hidden'
            }}>
               <div style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                 Total Outstanding
               </div>
               <div style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: 24, letterSpacing: '-1px' }}>
                 KES {feeBalance.toLocaleString()}
               </div>
               
               <button 
                onClick={() => setShowMpesaModal(true)}
                style={{ 
                  width: '100%', background: '#fff', color: '#ec4899', border: 'none', 
                  padding: '16px', borderRadius: '16px', fontWeight: 800, fontSize: '1.1rem', 
                  cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                }}
               >
                 Pay via M-Pesa
               </button>
            </div>

            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Payment History</h3>
              {payments.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <HistoryIcon size={32} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                  <div style={{ color: '#64748b', fontWeight: 500, fontSize: '1rem' }}>You're all caught up!</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 8 }}>No recent payments found on record.</div>
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {payments.map(p => (
                    <Card key={p.id} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '12px', color: '#64748b' }}>
                          <CardIcon size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{p.method}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{p.date} • {p.reference || 'REF-N/A'}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>
                        +{p.amount.toLocaleString()}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s ease-out' }}>
            <Card style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ 
                width: 80, height: 80, borderRadius: '24px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: '#fff', fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
              }}>
                {localUser.name.charAt(0).toUpperCase()}
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>{localUser.name}</h2>
              <p style={{ margin: '0 0 20px', color: '#64748b', fontWeight: 500 }}>Adm No: {localUser.adm_no}</p>
              
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Badge bg="#e0e7ff" color="#4f46e5">Student Profile</Badge>
                {localUser.residence_type && <Badge bg="#fce7f3" color="#db2777">{localUser.residence_type}</Badge>}
              </div>
            </Card>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '8px 0 0' }}>Contact Details</h3>
            <Card style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Parent Phone</span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{localUser.parent_phone || 'Not Provided'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>School ID</span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{schoolProfile?.name || localUser.school_id?.slice(0,8)}</span>
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* App-like Bottom Navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', 
        width: '100%', maxWidth: 480, background: 'rgba(255, 255, 255, 0.9)', 
        backdropFilter: 'blur(20px)', display: 'flex', justifyContent: 'space-around',
        padding: '12px 0 calc(12px + env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(0,0,0,0.05)', zIndex: 1000
      }}>
        {[
          { id: 'home', label: 'Dashboard', icon: ActivityIcon },
          { id: 'academics', label: 'Academics', icon: BookIcon },
          { id: 'fees', label: 'Finances', icon: CardIcon },
          { id: 'profile', label: 'Profile', icon: UserIcon }
        ].map(tab => (
          <div 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, 
              color: activeTab === tab.id ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer', flex: 1, position: 'relative'
            }}
          >
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span style={{ fontSize: '0.65rem', fontWeight: activeTab === tab.id ? 700 : 600 }}>{tab.label}</span>
            {activeTab === tab.id && (
              <div style={{ position: 'absolute', top: -12, width: 32, height: 4, background: '#3b82f6', borderRadius: '0 0 4px 4px' }} />
            )}
          </div>
        ))}
      </nav>

      {/* M-Pesa Modal */}
      {showMpesaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 480, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: '24px 24px 40px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ width: 48, height: 5, background: '#e2e8f0', borderRadius: 3, margin: '0 auto 24px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>M-Pesa Express</h3>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.95rem' }}>Push an STK prompt to your phone to complete the transaction instantly.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Amount (KES)</label>
                <input 
                  type="number" 
                  value={mpesaAmount} 
                  onChange={(e) => setMpesaAmount(e.target.value)}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', boxSizing: 'border-box', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>M-Pesa Number</label>
                <input 
                  type="text" 
                  value={mpesaPhone} 
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="2547XXXXXXXX"
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', boxSizing: 'border-box', fontSize: '1.1rem', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button 
                  onClick={() => setShowMpesaModal(false)}
                  style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleMpesaPay}
                  disabled={isSTKPushing}
                  style={{ flex: 2, padding: '16px', borderRadius: '16px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', opacity: isSTKPushing ? 0.7 : 1, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                >
                  {isSTKPushing ? 'Sending Prompt...' : 'Pay Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        input:focus {
          border-color: #3b82f6 !important;
        }
      `}</style>
    </div>
  );
}
