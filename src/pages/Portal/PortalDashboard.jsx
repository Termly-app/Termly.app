import React, { useState, useEffect } from 'react';
import { LogoutIcon, UserIcon, CardIcon, MessageIcon, StatusDotIcon, ActivityIcon, CheckIcon, BookIcon, DashboardIcon, HistoryIcon, MenuIcon } from '../../components/CommonIcons';
import { 
  getFees, simulateMpesaSTKPush, getStudentExamResults, getAnnouncements, 
  getGradeForScore, getSchoolProfile, initPortalStore,
  getAssignments, submitAssignment, getStudentSubmissions
} from '../../data/store';
import { useDialog } from '../../contexts/DialogContext';

export default function PortalDashboard({ user, onLogout }) {
  const [feeBalance, setFeeBalance] = useState(0);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('254700000000');
  const [mpesaAmount, setMpesaAmount] = useState(0);
  const [isSTKPushing, setIsSTKPushing] = useState(false);
  const { alert } = useDialog();
  const [payments, setPayments] = useState([]);

  // If they have recent comms from offline store
  const comms = user.recent_comms || [];
  const [assignments, setAssignments] = useState([]);
  const [showSubmitModal, setShowSubmitModal] = useState(null);
  const [submissionPayload, setSubmissionPayload] = useState('');
  const [academic, setAcademic] = useState({ average: 0, grade: '—', color: '#64748b', rank: '—' });
  const [mySubmissions, setMySubmissions] = useState({});
  const [quizData, setQuizData] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [examResults, setExamResults] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        // Initialize store context for portal mode
        initPortalStore(user.school_id || user.schoolId, user.id);

        // Fetch data individually so one failure doesn't block others
        const [profile, examRes, schoolNotices] = await Promise.all([
          getSchoolProfile().catch(e => { console.warn('Profile fetch:', e); return null; }),
          getStudentExamResults(user.id).catch(e => { console.warn('Results fetch:', e); return []; }),
          getAnnouncements({ status: 'published' }).catch(e => { console.warn('Announcements fetch:', e); return []; })
        ]);
        
        // Assignments may fail due to RLS - that's OK for parent portal
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

        const myFee = await getFees(user.id).catch(e => { console.warn('Fees fetch:', e); return null; });
        if (myFee) {
          setFeeBalance(myFee.balance);
          setMpesaAmount(myFee.balance > 0 ? myFee.balance : 0);
          setPayments(myFee.payments || []);
        }
      } catch (err) {
        console.error('Portal init failed:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleMpesaPay = async () => {
    setIsSTKPushing(true);
    try {
      await simulateMpesaSTKPush(user.id, mpesaAmount, mpesaPhone);
      alert({ title: 'Payment Initiated', message: 'Please check your phone for the M-Pesa PIN prompt.', variant: 'success' });
      setShowMpesaModal(false);
    } catch (err) {
      alert({ title: 'Payment Failed', message: err.message, variant: 'danger' });
    } finally {
      setIsSTKPushing(false);
    }
  };

  const handleAssignmentSubmit = async (assignmentId) => {
    try {
      await submitAssignment(user.id, assignmentId, submissionPayload);
      alert({ title: 'Submitted', message: 'Assignment uploaded successfully.', variant: 'success' });
      setShowSubmitModal(null);
      setSubmissionPayload('');
      // Refresh submissions
      const subs = await getStudentSubmissions(user.id);
      const subMap = {};
      subs.forEach(s => { subMap[s.assignment_id] = s; });
      setMySubmissions(subMap);
    } catch (err) {
      alert({ title: 'Error', message: 'Could not submit assignment.', variant: 'danger' });
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <StatusDotIcon size={40} color="#1a73e8" className="animate-pulse" />
    </div>
  );

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', background: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* App-like Sticky Header */}
      <div style={{ background: '#fff', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #174ea6 100%)', color: '#fff', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 600 }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111b21', letterSpacing: '-0.3px' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#667781', display: 'flex', alignItems: 'center', gap: 4 }}>
              <StatusDotIcon size={8} color="#10b981" /> Active Session
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, color: '#54656f' }}>
          <ActivityIcon 
            size={22} 
            style={{ cursor: 'pointer' }} 
            onClick={() => setActiveTab('academics')} 
          />
          <MenuIcon 
            size={22} 
            style={{ cursor: 'pointer' }} 
            onClick={() => setActiveTab('profile')} 
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '16px 16px 90px 16px', boxSizing: 'border-box' }}>
        
        {activeTab === 'home' && (
          <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Quick Status Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#fff', padding: 16, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ color: '#667781', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Fee Balance</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: feeBalance > 0 ? '#ef4444' : '#10b981' }}>
                  KES {feeBalance.toLocaleString()}
                </div>
              </div>
              <div style={{ background: '#fff', padding: 16, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ color: '#667781', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Avg Grade</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: academic.color }}>
                  {academic.grade} ({academic.average}%)
                </div>
              </div>
            </div>

            {/* School Announcements */}
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageIcon size={18} color="#1a73e8" /> 
                <span style={{ fontWeight: 600, color: '#111b21', fontSize: '0.9rem' }}>School Updates</span>
              </div>
              <div style={{ padding: 0 }}>
                {notices.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#667781', fontSize: '0.9rem' }}>No recent announcements</div>
                ) : (
                  notices.map((n, i) => (
                    <div key={n.id} style={{ padding: 16, borderBottom: i === notices.length - 1 ? 'none' : '1px solid #f0f2f5' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: '#111b21', fontSize: '0.95rem' }}>{n.title}</span>
                        <span style={{ fontSize: '0.7rem', color: '#667781' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#54656f', lineHeight: 1.4 }}>{n.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Assignments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#111b21', fontSize: '1rem' }}>Pending Tasks</span>
                <span 
                  onClick={() => setActiveTab('academics')} 
                  style={{ color: '#1a73e8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  See All
                </span>
              </div>
              {assignments.length === 0 && <div style={{ background: '#fff', padding: 20, borderRadius: 16, textAlign: 'center', color: '#667781' }}>No pending assignments! ✨</div>}
              {assignments.slice(0, 3).map(ast => (
                <div key={ast.id} style={{ background: '#fff', padding: 16, borderRadius: 16, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ background: '#e8f0fe', color: '#1a73e8', padding: 10, borderRadius: 12 }}>
                    <BookIcon size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#111b21', fontSize: '0.95rem' }}>{ast.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#667781' }}>Due: {new Date(ast.due_date).toLocaleDateString()} • {ast.subject}</div>
                  </div>
                  {mySubmissions[ast.id] ? (
                    <div style={{ color: '#10b981' }}><CheckIcon size={20} /></div>
                  ) : (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'academics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease-out' }}>
             <div style={{ background: '#fff', borderRadius: 16, padding: '20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#667781', textTransform: 'uppercase', marginBottom: 8 }}>Term Performance</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: academic.color }}>{academic.grade}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111b21' }}>{academic.average}% Average</div>
                <div style={{ marginTop: 12, display: 'inline-block', background: '#f0fdf4', color: '#16a34a', padding: '4px 12px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600 }}>
                  Rank: #{academic.rank} in Class
                </div>
             </div>

             <h3 style={{ margin: '8px 0 0', fontSize: '1rem', color: '#111b21', fontWeight: 600 }}>Exam History</h3>
             {examResults.map(res => (
               <div key={res.id} style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#111b21' }}>{res.exams?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#667781' }}>{res.exams?.term} • {res.exams?.exam_type}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#1a73e8', fontSize: '1.1rem' }}>{res.mean_score?.toFixed(1)}%</div>
                    <div style={{ fontSize: '0.75rem', color: '#667781' }}>Pos: {res.class_position}/{res.class_size}</div>
                  </div>
               </div>
             ))}
             {examResults.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#667781' }}>No published results found.</div>}
          </div>
        )}

        {activeTab === 'fees' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #174ea6 100%)', borderRadius: 20, padding: '24px', color: '#fff', boxShadow: '0 4px 12px rgba(26, 115, 232, 0.2)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                 <CardIcon size={32} />
                 <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600 }}>{user.id.slice(0, 8)}</div>
               </div>
               <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: 4 }}>Outstanding Balance</div>
               <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 20 }}>KES {feeBalance.toLocaleString()}</div>
               
               <button 
                onClick={() => setShowMpesaModal(true)}
                style={{ width: '100%', background: '#fff', color: '#1a73e8', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
               >
                 Pay Now with M-Pesa
               </button>
            </div>

            {/* Payment History */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#111b21', display: 'flex', alignItems: 'center', gap: 8 }}><HistoryIcon size={18} /> Payment History</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {payments.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#667781', padding: '20px 0', fontSize: '0.9rem' }}>No recent payments found.</div>
                  ) : (
                    payments.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#111b21', fontSize: '0.9rem' }}>{p.method} — {p.reference || 'REF-N/A'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#667781' }}>{p.date}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: '#22c55e' }}>+KES {p.amount.toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ 
                background: '#e8f0fe', color: '#1a73e8', width: 80, height: 80, borderRadius: '50%', 
                margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '2rem', fontWeight: 600 
              }}>
                {user.name.charAt(0)}
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', color: '#111b21' }}>{user.name}</h2>
              <p style={{ margin: 0, color: '#667781', fontSize: '0.95rem' }}>{user.adm_no} • Class {user.class}</p>
            </div>

            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#111b21', fontWeight: 500 }}>
                Residence Status <span style={{ color: '#667781', textTransform: 'capitalize' }}>{(user.residence_type || 'day').replace('_', ' ')}</span>
              </div>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#111b21', fontWeight: 500 }}>
                Guardian Phone <span style={{ color: '#667781' }}>{user.parent_phone || 'Not set'}</span>
              </div>
              <div 
                onClick={onLogout}
                style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ef4444', fontWeight: 500, cursor: 'pointer' }}
              >
                Sign Out <LogoutIcon size={18} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* App-like Bottom Navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', display: 'flex', justifyContent: 'space-around',
        padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
        borderTop: '1px solid #e2e8f0', zIndex: 1000,
        boxShadow: '0 -1px 3px rgba(0,0,0,0.03)'
      }}>
        {[
          { id: 'home', label: 'Updates', icon: MessageIcon },
          { id: 'academics', label: 'Results', icon: ActivityIcon },
          { id: 'fees', label: 'Fees', icon: CardIcon },
          { id: 'profile', label: 'Me', icon: UserIcon }
        ].map(tab => (
          <div 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, 
              color: activeTab === tab.id ? '#1a73e8' : '#54656f',
              cursor: 'pointer', flex: 1
            }}
          >
            <tab.icon size={24} />
            <span style={{ fontSize: '0.65rem', fontWeight: activeTab === tab.id ? 600 : 500 }}>{tab.label}</span>
          </div>
        ))}
      </nav>

      {/* M-Pesa Modal */}
      {showMpesaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#fff', width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px 40px', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 20px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#111b21' }}>Pay Service Fee</h3>
            <p style={{ margin: '0 0 24px', color: '#667781', fontSize: '0.9rem' }}>Enter your M-Pesa number to initiate payment.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111b21', display: 'block', marginBottom: 8 }}>Amount (KES)</label>
                <input 
                  type="number" 
                  value={mpesaAmount} 
                  onChange={(e) => setMpesaAmount(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', boxSizing: 'border-box', fontSize: '1rem', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111b21', display: 'block', marginBottom: 8 }}>Phone Number</label>
                <input 
                  type="text" 
                  value={mpesaPhone} 
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="2547XXXXXXXX"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', boxSizing: 'border-box', fontSize: '1rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button 
                  onClick={() => setShowMpesaModal(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: '#f0f2f5', color: '#111b21', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleMpesaPay}
                  disabled={isSTKPushing}
                  style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: '#1a73e8', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: isSTKPushing ? 0.7 : 1 }}
                >
                  {isSTKPushing ? 'Processing...' : 'Confirm Payment'}
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
      `}</style>
    </div>
  );
}
