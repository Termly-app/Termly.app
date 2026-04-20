import React, { useState, useEffect } from 'react';
import { LogoutIcon, UserIcon, CardIcon, MessageIcon, StatusDotIcon, ActivityIcon, CheckIcon } from '../../components/CommonIcons';
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
    <div className="portal-container">
      
      {/* Header */}
      <header className="portal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div className="avatar-box" style={{ background: '#ecfdf5', color: '#10b981', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
            {user.name.charAt(0)}
          </div>
          <div style={{ textAlign: 'inherit' }}>
            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{user.adm_no}</div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>{user.name}</h2>
            <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, justifyContent: 'inherit' }}>
              <span>Class {user.class}</span>
              <span>•</span>
              <span style={{ textTransform: 'capitalize' }}>{user.residence_type.replace('_', ' ')} Student</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="btn btn-ghost"
          style={{ padding: '10px 20px', borderRadius: 100, transition: 'all 0.2s' }}
        >
          Sign Out <LogoutIcon size={16} />
        </button>
      </header>

      <div className="portal-grid">
        
        {/* Financial Snapshot */}
        <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', borderRadius: 20, padding: 32, boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.5)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1, transform: 'scale(3)' }}>
            <CardIcon size={100} />
          </div>
          <h3 style={{ margin: '0 0 20px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CardIcon size={16} color="#94a3b8" /> Financial Snapshot
          </h3>
          <div style={{ fontSize: '3rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            <span style={{ fontSize: '1.25rem', verticalAlign: 'super', marginRight: 4, color: '#cbd5e1' }}>KSh</span> 
            {feeBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: 24 }}>
            Outstanding Balance for Current Term
          </div>
          <button 
            onClick={() => setShowMpesaModal(true)}
            style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 100, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}
          >
            Proceed to Payment <span style={{ marginLeft: 4 }}>→</span>
          </button>
        </div>

        {/* Academics Snapshot */}
        <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 24px', fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ActivityIcon size={18} color="#10b981" /> Academic Performance
          </h3>
          
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
              width: 64, height: 64, borderRadius: '50%', border: `4px solid ${academic.color}`, 
              color: academic.color, fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 
            }}>
              {academic.grade}
            </div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>Current Term Average: {academic.average}%</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Last updated by your teacher recently</div>
            
            <button style={{ marginTop: 20, background: 'white', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: '20px auto 0' }}>
              <ActivityIcon size={14} /> Full Performance Report
            </button>
          </div>
        </div>
      </div>

      {/* Formal Exams results */}
      <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 24px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ActivityIcon size={20} color="var(--primary)" /> Formal Exam Results
        </h3>
        
        {examResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', background: '#f8fafc', borderRadius: 12 }}>
            No formal exams have been published yet for this term.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {examResults.map(res => (
              <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{res.exams?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{res.exams?.term} • {res.exams?.exam_type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>{res.total_marks} Marks</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>Ranked #{res.class_position} / {res.class_size}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Homework / LMS Portal */}
      <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 24px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ActivityIcon size={20} color="#f59e0b" /> Pending Homework & Assignments
        </h3>

        {assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
            <ActivityIcon size={40} color="#e2e8f0" style={{ marginBottom: 12 }} />
            <div>No active homework for your class. Stay sharp!</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
             {assignments.map(ast => {
              const now = new Date();
              const openDate = new Date(ast.allow_from || ast.allowFrom);
              const dueDate  = new Date(ast.due_date || ast.deadline);
              const cutDate  = ast.cutoff_date || ast.cutoffDate ? new Date(ast.cutoff_date || ast.cutoffDate) : null;
              
              const isLocked  = now < openDate;
              const isExpired = cutDate && now > cutDate;
              const mySub = mySubmissions[ast.id];
              const isOverdue = !mySub && now > dueDate;
              const isGraded = mySub?.workflow_status === 'released' || (mySub?.grade_numeric !== null && mySub?.grade_numeric !== undefined);
              
              return (
                  <div style={{ 
                    padding: 24, 
                    background: isLocked ? '#f8fafc' : isOverdue ? '#fff1f2' : isGraded ? '#f0fdf4' : '#fffbeb', 
                    borderRadius: 16, 
                    border: `1px solid ${isLocked ? '#e2e8f0' : isOverdue ? '#fecdd3' : isGraded ? '#bbf7d0' : '#fde68a'}`,
                    transition: 'transform 0.2s',
                    opacity: isLocked ? 0.7 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span className="badge" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-main)', fontSize: '0.65rem' }}>{ast.subject}</span>
                          {isGraded ? (
                            <span className="badge badge-success">Graded: {mySub.grade_numeric} / {ast.max_score || 100}</span>
                          ) : mySub ? (
                            <span className="badge badge-info">Submitted {mySub.is_late ? '(Late)' : ''}</span>
                          ) : isLocked ? (
                            <span className="badge" style={{ background: '#e2e8f0', color: '#64748b' }}>Scheduled</span>
                          ) : isExpired ? (
                            <span className="badge badge-danger">Closed</span>
                          ) : isOverdue ? (
                            <span className="badge badge-danger">Overdue</span>
                          ) : (
                            <span className="badge badge-warning">Pending</span>
                          )}
                        </div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isLocked && <ClockIcon size={16} color="#94a3b8" />}
                          {ast.title}
                        </div>
                      </div>
                      <div style={{ textAlign: 'inherit', fontSize: '0.8rem', color: '#64748b' }}>
                         <div style={{ fontWeight: 700, color: isOverdue || isExpired ? 'var(--danger)' : isLocked ? '#94a3b8' : '#64748b' }}>
                           {isLocked ? `Opens in ${getRemainingTime(openDate)}` : 
                            isExpired ? 'Closed' : 
                            isOverdue ? 'Overdue' : 
                            getRemainingTime(dueDate)}
                         </div>
                         <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                           {isLocked ? `Starts ${openDate.toLocaleString()}` : `Due ${dueDate.toLocaleString()}`}
                         </div>
                      </div>
                    </div>

                  <div style={{ fontSize: '0.9rem', color: '#475569', background: 'rgba(255,255,255,0.5)', padding: 16, borderRadius: 12, marginBottom:16, border: '1px solid rgba(0,0,0,0.03)' }}>
                    {isLocked ? 
                      <em style={{ color: '#94a3b8' }}>Instructions will be visible once the assignment opens.</em> : 
                      (ast.description || "No description provided.")
                    }
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {!isGraded && !isLocked && !isExpired && (
                      <button 
                        onClick={() => handleStartWork(ast)}
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', flex: 1, minWidth: '120px' }}
                      >
                        {mySub ? (ast.submission_type === 'quiz' ? 'Retake Quiz' : 'Resubmit Work') : (ast.submission_type === 'quiz' ? 'Start Quiz' : 'Turn In Work')}
                      </button>
                    )}
                    {isLocked && (
                      <button disabled style={{ background: '#f1f5f9', color: '#94a3b8', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'not-allowed', width: '100%' }}>
                        Assignment Locked
                      </button>
                    )}
                    {isExpired && !mySub && (
                      <button disabled style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'not-allowed', width: '100%' }}>
                        Submissions Closed
                      </button>
                    )}
                    {mySub?.feedback && (
                      <button 
                        onClick={() => alert({ title: 'Teacher Feedback', message: `Feedback for ${ast.title}:\n\n"${mySub.feedback}"`, variant: 'info' })}
                        style={{ background: 'white', border: '1.5px solid var(--border)', padding: '10px 20px', borderRadius: 8, fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer', flex: 1, minWidth: '120px' }}
                      >
                        View Feedback
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
        <h3 style={{ margin: '0 0 24px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageIcon size={20} color="#6366f1" /> Official School Notices
        </h3>

        {notices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <MessageIcon size={48} color="#e2e8f0" style={{ marginBottom: 16 }} />
            <div>No recent announcements from the school.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {notices.map((c, i) => (
              <div key={c.id || i} style={{ padding: 20, background: '#f8fafc', borderRadius: 16, borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusDotIcon color="#10b981" /> {c.title || 'Official Notice'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
                   {c.content}
                </div>
                {c.metadata?.channel && (
                  <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#94a3b8' }}>
                    Broadcast via {c.metadata.channel.toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Assignment Modal / Quiz Player */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 24, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', animation: 'sIn 0.3s ease-out' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0f172a' }}>
              {showSubmitModal.submission_type === 'quiz' ? 'Interactive Quiz' : 'Submit Homework'}
            </h3>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.9rem' }}>{showSubmitModal.title}</p>
            
            {showSubmitModal.submission_type === 'quiz' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {quizData?.questions?.map((q, idx) => (
                  <div key={q.id} style={{ padding: 20, background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, marginBottom: 12, display: 'flex', gap: 10 }}>
                      <span style={{ color: 'var(--primary)' }}>{idx + 1}.</span>
                      <span>{q.text}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {q.options.map((opt, oidx) => (
                        <label key={oidx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'white', border: `2px solid ${quizAnswers[q.id] === oidx ? 'var(--primary)' : '#e2e8f0'}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' }}>
                          <input 
                            type="radio" 
                            name={`q-${q.id}`} 
                            checked={quizAnswers[q.id] === oidx} 
                            onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: oidx })} 
                          />
                          <span style={{ fontSize: '0.95rem', fontWeight: quizAnswers[q.id] === oidx ? 600 : 400 }}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowSubmitModal(null)} style={{ flex: 1, padding: 14, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                  <button type="button" onClick={handleSubmitWork} style={{ flex: 2, padding: 14, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Submit Quiz</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitWork}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: 8 }}>Paste your work or Google Doc link</label>
                <textarea 
                  required 
                  value={submissionPayload} 
                  onChange={e => setSubmissionPayload(e.target.value)} 
                  style={{ width: '100%', minHeight: 120, padding: 16, border: '1.5px solid #cbd5e1', borderRadius: 12, fontSize: '1rem', boxSizing: 'border-box', marginBottom: 24, resize: 'vertical' }}
                  placeholder="https://docs.google.com/document/d/...&#10;OR write your answers directly here..."
                />
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setShowSubmitModal(null)} style={{ flex: 1, padding: 14, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 2, padding: 14, background: '#10b981', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CheckIcon size={18} /> Turn In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* M-Pesa STK Push Modal */}
      {showMpesaModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 24, width: '100%', maxWidth: 400, animation: 'sIn 0.3s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ background: '#ecfdf5', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#10b981' }}>
                <CardIcon size={32} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0f172a' }}>Lipa na M-Pesa</h3>
              <p style={{ margin: '0', color: '#64748b', fontSize: '0.9rem' }}>Instant STK Push for {user.name}</p>
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
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: 8 }}>M-Pesa Phone Number</label>
                <input 
                  type="text" 
                  required 
                  value={mpesaPhone} 
                  onChange={e => setMpesaPhone(e.target.value)} 
                  style={{ width: '100%', padding: 12, border: '2px solid #cbd5e1', borderRadius: 12, fontSize: '1.1rem', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: 8 }}>Amount (KSh)</label>
                <input 
                  type="number" 
                  min="1"
                  max={feeBalance > 0 ? feeBalance : 1000000}
                  required 
                  value={mpesaAmount} 
                  onChange={e => setMpesaAmount(e.target.value)} 
                  style={{ width: '100%', padding: 12, border: '2px solid #cbd5e1', borderRadius: 12, fontSize: '1.1rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowMpesaModal(false)} disabled={isSTKPushing} style={{ flex: 1, padding: 14, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSTKPushing} style={{ flex: 2, padding: 14, background: '#10b981', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isSTKPushing ? 0.7 : 1 }}>
                  {isSTKPushing ? 'Awaiting PIN...' : <><CardIcon size={18} /> Request STK Push</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}
