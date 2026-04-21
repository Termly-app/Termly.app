import React, { useState, useEffect } from 'react';
import { LogoutIcon, UserIcon, CardIcon, MessageIcon, StatusDotIcon, ActivityIcon, CheckIcon, BookIcon, DashboardIcon, HistoryIcon, MenuIcon } from '../../components/CommonIcons';
import { getFees, simulateMpesaSTKPush, getStudentExamResults, getAnnouncements, getGradeForScore, getSchoolProfile } from '../../data/store';
import { getAssignments, submitAssignment, getStudentSubmissions } from '../../data/offlineStore';
import { useDialog } from '../../contexts/DialogContext';

export default function PortalDashboard({ user, onLogout }) {
  const [feeBalance, setFeeBalance] = useState(0);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('254700000000');
  const [mpesaAmount, setMpesaAmount] = useState(0);
  const [isSTKPushing, setIsSTKPushing] = useState(false);
  const { alert } = useDialog();

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
        const [asts, profile, examRes, schoolNotices] = await Promise.all([
          getAssignments(user.class),
          getSchoolProfile(),
          getStudentExamResults(user.id),
          getAnnouncements({ status: 'published' })
        ]);
        
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

        const fees = await getFees();
        const myFee = fees[user.id];
        if (myFee) {
          setFeeBalance(myFee.balance);
          setMpesaAmount(myFee.balance > 0 ? myFee.balance : 0);
        }
      } catch (err) {
        console.error('Portal init failed:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user]);

  const handleStartWork = async (ast) => {
    if (ast.submission_type === 'quiz') {
      try {
        const content = await fetchLmsContent(ast.description_url);
        const data = typeof content === 'string' ? JSON.parse(content) : content;
        setQuizData(data);
      } catch (e) {
        console.error('Quiz data load failed', e);
        await alert({ title: 'Fetch Error', message: 'Could not load quiz questions. Please contact your teacher.', variant: 'danger' });
        return;
      }
    }
    setShowSubmitModal(ast);
  };

  const handleSubmitWork = async (e) => {
    if (e) e.preventDefault();
    if (!submissionPayload && showSubmitModal?.submission_type !== 'quiz') return;
    
    const ast = showSubmitModal;
    const isLate = new Date() > new Date(ast.due_date || ast.deadline);
    
    let grade_numeric = null;
    let finalPayload = submissionPayload;
    
    if (ast.submission_type === 'quiz') {
      // Calculate quiz score
      let correctCount = 0;
      let totalPoints = 0;
      quizData.questions.forEach((q, idx) => {
        if (quizAnswers[q.id] === q.correctIndex) {
          correctCount += q.points || 1;
        }
        totalPoints += q.points || 1;
      });
      grade_numeric = Math.round((correctCount / totalPoints) * 100);
      finalPayload = JSON.stringify({ answers: quizAnswers, score: grade_numeric });
    }
    
    await submitAssignment(ast.id, user, finalPayload, { 
      is_late: isLate,
      grade_numeric: grade_numeric,
      workflow_status: grade_numeric !== null ? 'released' : 'submitted'
    });
    
    await alert({ 
      title: ast.submission_type === 'quiz' ? 'Quiz Complete' : 'Submission Success',
      message: ast.submission_type === 'quiz' 
        ? `Quiz completed! Your score: ${grade_numeric}%` 
        : "Assignment submitted successfully!" + (isLate ? " (Note: This is a late submission)" : ""),
      variant: 'success'
    });
    
    setShowSubmitModal(null);
    setSubmissionPayload('');
    setQuizAnswers({});
    // Refresh submissions...
    try {
      const subs = await getStudentSubmissions(user.id);
      const subMap = {};
      subs.forEach(s => { subMap[s.assignment_id] = s; });
      setMySubmissions(subMap);
    } catch (e) {}
  };

  const getRemainingTime = (date) => {
    const diff = new Date(date) - new Date();
    if (diff < 0) return 'Passed';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* App-like Top Header */}
      <header style={{ 
        background: '#fff', 
        padding: '16px 20px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', 
            color: '#fff', 
            width: 40, height: 40, 
            borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '1.2rem', fontWeight: 600 
          }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#111b21', fontSize: '1.1rem', letterSpacing: '-0.3px' }}>{user.name}</div>
            <div style={{ color: '#667781', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              Class {user.class} • {user.adm_no}
            </div>
          </div>
        </div>
        <div style={{ color: '#54656f', display: 'flex', gap: 16 }}>
          <button style={{ background: 'none', border: 'none', color: 'inherit', padding: 4 }} onClick={onLogout}>
            <LogoutIcon size={22} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ padding: '16px 16px 90px 16px', flex: 1, maxWidth: 600, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {activeTab === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease-out' }}>
            
            {/* WhatsApp Status-like Notice Strip */}
            {notices.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#111b21', fontWeight: 600, fontSize: '0.95rem' }}>
                  <MessageIcon size={18} color="#25D366" /> School Updates
                </div>
                <div style={{ display: 'flex', overflowX: 'auto', gap: 12, paddingBottom: 8, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                  {notices.slice(0, 3).map((c, i) => (
                    <div key={i} style={{ minWidth: 200, background: '#f0f2f5', padding: '12px', borderRadius: 12, borderLeft: '3px solid #25D366' }}>
                      <div style={{ fontSize: '0.8rem', color: '#667781', marginBottom: 4 }}>{new Date(c.created_at).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.9rem', color: '#111b21', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div 
                onClick={() => setActiveTab('fees')}
                style={{ background: '#fff', borderRadius: 16, padding: '20px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ color: feeBalance > 0 ? '#ef4444' : '#25D366', marginBottom: 8 }}><CardIcon size={24} /></div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111b21', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8rem', verticalAlign: 'top', marginRight: 2, color: '#667781' }}>KSh</span>
                  {feeBalance.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#667781', fontWeight: 500 }}>Fee Balance</div>
              </div>

              <div 
                onClick={() => setActiveTab('academics')}
                style={{ background: '#fff', borderRadius: 16, padding: '20px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer' }}
              >
                <div style={{ color: academic.color, marginBottom: 8 }}><ActivityIcon size={24} /></div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111b21', marginBottom: 4 }}>
                  {academic.grade}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#667781', fontWeight: 500 }}>Term Average: {academic.average}%</div>
              </div>
            </div>

            {/* Instagram-like Feed Card for Latest Academic Update */}
            {examResults.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f0f2f5' }}>
                  <div style={{ background: '#e8f0fe', color: '#1a73e8', padding: 8, borderRadius: '50%' }}><DashboardIcon size={16} /></div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111b21' }}>New Results Posted</div>
                    <div style={{ fontSize: '0.75rem', color: '#667781' }}>{examResults[0].exams?.name}</div>
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', color: '#111b21', margin: '20px 0 10px' }}>
                    {examResults[0].total_marks} <span style={{ fontSize: '1rem', color: '#667781', fontWeight: 500 }}>Marks</span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.95rem', color: '#54656f', marginBottom: 20 }}>
                    Position: <strong style={{color: '#111b21'}}>{examResults[0].class_position}</strong> / {examResults[0].class_size}
                  </div>
                  <button 
                    onClick={() => setActiveTab('academics')}
                    style={{ width: '100%', background: '#f0f2f5', color: '#111b21', border: 'none', padding: 12, borderRadius: 10, fontWeight: 600, fontSize: '0.9rem' }}
                  >
                    View Full Report
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'academics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease-out' }}>
            {/* Assignments Section */}
            <h3 style={{ margin: '10px 0 0', fontSize: '1rem', color: '#111b21' }}>Assignments & E-Learning</h3>
            {assignments.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 16, padding: '30px 20px', textAlign: 'center', color: '#667781', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                No active homework for your class.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {assignments.map(ast => {
                  const now = new Date();
                  const dueDate = new Date(ast.due_date || ast.deadline);
                  const mySub = mySubmissions[ast.id];
                  const isGraded = mySub?.workflow_status === 'released' || (mySub?.grade_numeric !== null && mySub?.grade_numeric !== undefined);
                  
                  return (
                    <div key={ast.id} style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ast.subject}</span>
                          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#111b21', marginTop: 2 }}>{ast.title}</div>
                        </div>
                        {isGraded ? (
                          <div style={{ background: '#e6fbea', color: '#25D366', padding: '4px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>
                            {mySub.grade_numeric} / {ast.max_score || 100}
                          </div>
                        ) : mySub ? (
                          <div style={{ background: '#f0f2f5', color: '#54656f', padding: '4px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>Submitted</div>
                        ) : (
                          <div style={{ background: '#fdf0d5', color: '#b47b0e', padding: '4px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>Due {getRemainingTime(dueDate)}</div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#54656f', marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ast.description}
                      </div>
                      {!isGraded && (
                         <button 
                          onClick={() => handleStartWork(ast)}
                          style={{ width: '100%', background: mySub ? '#f0f2f5' : '#25D366', color: mySub ? '#111b21' : '#fff', border: 'none', padding: '10px', borderRadius: 10, fontWeight: 600 }}
                         >
                           {mySub ? 'Update Submission' : (ast.submission_type === 'quiz' ? 'Start Quiz' : 'Submit Work')}
                         </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <h3 style={{ margin: '20px 0 0', fontSize: '1rem', color: '#111b21' }}>Recent Exams</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {examResults.map(res => (
                <div key={res.id} style={{ background: '#fff', borderRadius: 16, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#111b21' }}>{res.exams?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#667781', marginTop: 2 }}>Ranked #{res.class_position} / {res.class_size}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#1a73e8', fontSize: '1.2rem' }}>
                    {res.total_marks}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'fees' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease-out' }}>
             <div style={{ background: '#fff', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
               <div style={{ display: 'inline-flex', background: '#fdf0d5', color: '#b47b0e', padding: 16, borderRadius: '50%', marginBottom: 16 }}>
                 <CardIcon size={32} />
               </div>
               <div style={{ fontSize: '0.9rem', color: '#667781', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Current Balance</div>
               <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111b21', margin: '4px 0 24px' }}>
                 <span style={{ fontSize: '1rem', color: '#667781', marginRight: 4, verticalAlign: 'middle' }}>KSh</span> 
                 {feeBalance.toLocaleString()}
               </div>
               <button 
                  onClick={() => setShowMpesaModal(true)}
                  style={{ width: '100%', background: '#25D366', color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <DashboardIcon size={18} /> Pay via M-Pesa
                </button>
             </div>

             <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#111b21', display: 'flex', alignItems: 'center', gap: 8 }}><HistoryIcon size={18} /> Payment History</h3>
                <div style={{ textAlign: 'center', color: '#667781', padding: '20px 0', fontSize: '0.9rem' }}>
                  No recent payments found.
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
                Residence Status <span style={{ color: '#667781', textTransform: 'capitalize' }}>{user.residence_type.replace('_', ' ')}</span>
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
        borderTop: '1px solid #e2e8f0', zIndex: 50,
        boxShadow: '0 -1px 3px rgba(0,0,0,0.03)'
      }}>
        {[
          { id: 'home', label: 'Home', icon: DashboardIcon },
          { id: 'academics', label: 'Academics', icon: BookIcon },
          { id: 'fees', label: 'Fees', icon: CardIcon },
          { id: 'profile', label: 'Profile', icon: UserIcon }
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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Submit Assignment Modal / Quiz Player */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11,20,26,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px 20px', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ width: 40, height: 4, background: '#d1d7db', borderRadius: 2, margin: '0 auto 20px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#111b21', fontWeight: 600 }}>
              {showSubmitModal.submission_type === 'quiz' ? 'Interactive Quiz' : 'Submit Homework'}
            </h3>
            <p style={{ margin: '0 0 24px', color: '#54656f', fontSize: '0.9rem' }}>{showSubmitModal.title}</p>
            
            {showSubmitModal.submission_type === 'quiz' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {quizData?.questions?.map((q, idx) => (
                  <div key={q.id}>
                    <div style={{ fontWeight: 500, color: '#111b21', marginBottom: 12, fontSize: '0.95rem' }}>
                      <span style={{ color: '#25D366', marginRight: 8, fontWeight: 700 }}>{idx + 1}.</span>{q.text}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {q.options.map((opt, oidx) => (
                        <label key={oidx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: quizAnswers[q.id] === oidx ? '#e6fbea' : '#f0f2f5', border: `1px solid ${quizAnswers[q.id] === oidx ? '#25D366' : 'transparent'}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' }}>
                          <input 
                            type="radio" 
                            name={`q-${q.id}`} 
                            checked={quizAnswers[q.id] === oidx} 
                            onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: oidx })} 
                          />
                          <span style={{ fontSize: '0.9rem', color: '#111b21' }}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowSubmitModal(null)} style={{ flex: 1, padding: 14, background: '#f0f2f5', color: '#54656f', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: '0.95rem' }}>Cancel</button>
                  <button type="button" onClick={handleSubmitWork} style={{ flex: 2, padding: 14, background: '#25D366', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: '0.95rem' }}>Submit Quiz</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitWork}>
                <textarea 
                  required 
                  value={submissionPayload} 
                  onChange={e => setSubmissionPayload(e.target.value)} 
                  style={{ width: '100%', minHeight: 120, padding: 16, background: '#f0f2f5', border: 'none', borderRadius: 12, fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: 24, resize: 'vertical' }}
                  placeholder="Paste your link or write answers here..."
                />
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setShowSubmitModal(null)} style={{ flex: 1, padding: 14, background: '#f0f2f5', color: '#54656f', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: '0.95rem' }}>Cancel</button>
                  <button type="submit" style={{ flex: 2, padding: 14, background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                     Turn In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp-style Bottom Sheet for M-Pesa */}
      {showMpesaModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11,20,26,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px 20px', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 400, animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ width: 40, height: 4, background: '#d1d7db', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ background: '#e6fbea', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#25D366' }}>
                <CardIcon size={28} />
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#111b21', fontWeight: 600 }}>Lipa na M-Pesa</h3>
              <p style={{ margin: '0', color: '#54656f', fontSize: '0.9rem' }}>Instant STK Push via ShulePay</p>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSTKPushing(true);
              try {
                await simulateMpesaSTKPush(user, mpesaAmount, mpesaPhone);
                setIsSTKPushing(false);
                setShowMpesaModal(false);
                const fees = await getFees();
                setFeeBalance(fees[user.id]?.balance || 0);
                await alert({ title: 'Payment Confirmed', message: 'M-Pesa payment confirmed! The administration has automatically received a receipt.', variant: 'success' });
              } catch(err) {
                console.error(err);
                setIsSTKPushing(false);
                await alert({ title: 'Payment Failed', message: 'M-Pesa push failed. Please try again.', variant: 'danger' });
              }
            }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#54656f', marginBottom: 6 }}>Phone Number</label>
                <input 
                  type="text" 
                  required 
                  value={mpesaPhone} 
                  onChange={e => setMpesaPhone(e.target.value)} 
                  style={{ width: '100%', padding: 14, background: '#f0f2f5', border: 'none', borderRadius: 12, fontSize: '1.05rem', boxSizing: 'border-box', color: '#111b21' }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#54656f', marginBottom: 6 }}>Amount (KSh)</label>
                <input 
                  type="number" 
                  min="1"
                  max={feeBalance > 0 ? feeBalance : 1000000}
                  required 
                  value={mpesaAmount} 
                  onChange={e => setMpesaAmount(e.target.value)} 
                  style={{ width: '100%', padding: 14, background: '#f0f2f5', border: 'none', borderRadius: 12, fontSize: '1.05rem', boxSizing: 'border-box', color: '#111b21', fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowMpesaModal(false)} disabled={isSTKPushing} style={{ flex: 1, padding: 14, background: '#f0f2f5', color: '#54656f', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: '0.95rem' }}>Cancel</button>
                <button type="submit" disabled={isSTKPushing} style={{ flex: 2, padding: 14, background: '#25D366', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isSTKPushing ? 0.7 : 1 }}>
                  {isSTKPushing ? 'Awaiting PIN...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
      
    </div>
  );
}
