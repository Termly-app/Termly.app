import React, { useState, useEffect } from 'react';
import { LogoutIcon, UserIcon, CardIcon, MessageIcon, StatusDotIcon, ActivityIcon, ClipboardIcon, CheckIcon } from '../../components/CommonIcons';
import { getFees, simulateMpesaSTKPush, getMarks, getGradeForScore, getSchoolProfile } from '../../data/store';
import { getAssignments, submitAssignment } from '../../data/offlineStore';

export default function PortalDashboard({ user, onLogout }) {
  const [feeBalance, setFeeBalance] = useState(0);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('254700000000');
  const [mpesaAmount, setMpesaAmount] = useState(0);
  const [isSTKPushing, setIsSTKPushing] = useState(false);

  // If they have recent comms from offline store
  const comms = user.recent_comms || [];
  const [assignments, setAssignments] = useState([]);
  const [showSubmitModal, setShowSubmitModal] = useState(null);
  const [submissionPayload, setSubmissionPayload] = useState('');
  const [academic, setAcademic] = useState({ average: 0, grade: '—', color: '#64748b', rank: '—' });
  const [mySubmissions, setMySubmissions] = useState({});

  useEffect(() => {
    async function init() {
      const [asts, profile, allMarks] = await Promise.all([
        getAssignments(user.class),
        getSchoolProfile(),
        getMarks()
      ]);
      setAssignments(asts);
      
      try {
        const { getStudentSubmissions } = await import('../../data/store');
        const subs = await getStudentSubmissions(user.id);
        const subMap = {};
        subs.forEach(s => { subMap[s.assignment_id] = s; });
        setMySubmissions(subMap);
      } catch (e) { console.warn('LMS Submissions fetch failed', e); }
      const myMarks = allMarks[user.id] || {};
      const values = Object.values(myMarks);
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const { grade, color } = getGradeForScore(avg, user.class, profile);
        setAcademic({ average: avg.toFixed(1), grade, color });
      }

      const fees = await getFees();
      const myFee = fees[user.id];
      if (myFee) {
        setFeeBalance(myFee.balance);
        setMpesaAmount(myFee.balance > 0 ? myFee.balance : 0);
      } else {
        setFeeBalance(0);
        setMpesaAmount(0);
      }
    }
    init();
  }, [user]);

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!submissionPayload) return;
    await submitAssignment(showSubmitModal.id, user, submissionPayload);
    alert("Assignment Submitted successfully!");
    setShowSubmitModal(null);
    setSubmissionPayload('');
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, background: 'white', padding: '20px 32px', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#ecfdf5', color: '#10b981', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>{user.name}</h2>
            <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontWeight: 600, color: '#10b981' }}>{user.adm_no}</span>
              <span>•</span>
              <span>Class {user.class}</span>
              <span>•</span>
              <span style={{ textTransform: 'capitalize' }}>{user.residence_type.replace('_', ' ')} Student</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onLogout}
          style={{ background: 'none', border: '1.5px solid #e2e8f0', padding: '10px 20px', borderRadius: 100, color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
          onMouseOver={(e) => {e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a';}}
          onMouseOut={(e) => {e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b';}}
        >
          Sign Out <LogoutIcon size={16} />
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        
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
              <ClipboardIcon size={14} /> Full Performance Report
            </button>
          </div>
        </div>
      </div>

      {/* Homework / LMS Portal */}
      <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 24px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardIcon size={20} color="#f59e0b" /> Pending Homework & Assignments
        </h3>

        {assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
            <ClipboardIcon size={40} color="#e2e8f0" style={{ marginBottom: 12 }} />
            <div>No active homework for your class. Stay sharp!</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {assignments.map(ast => {
              const mySub = mySubmissions[ast.id];
              const isOverdue = !mySub && new Date() > new Date(ast.due_date || ast.deadline);
              const isGraded = mySub?.workflow_status === 'released' || mySub?.grade_numeric !== null;
              
              return (
                <div key={ast.id} style={{ 
                  padding: 24, 
                  background: isOverdue ? '#fff1f2' : isGraded ? '#f0fdf4' : '#fffbeb', 
                  borderRadius: 16, 
                  border: `1px solid ${isOverdue ? '#fecdd3' : isGraded ? '#bbf7d0' : '#fde68a'}`,
                  transition: 'transform 0.2s'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="badge" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-main)', fontSize: '0.65rem' }}>{ast.subject}</span>
                        {isGraded ? (
                          <span className="badge badge-success">Graded: {mySub.grade_numeric} / {ast.max_score || 100}</span>
                        ) : mySub ? (
                          <span className="badge badge-info">Submitted {mySub.is_late ? '(Late)' : ''}</span>
                        ) : isOverdue ? (
                          <span className="badge badge-danger">Overdue</span>
                        ) : (
                          <span className="badge badge-warning">Pending</span>
                        )}
                      </div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>{ast.title}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                       <div style={{ fontWeight: 700, color: isOverdue ? 'var(--danger)' : '#64748b' }}>
                         {isOverdue ? 'Overdue' : `Due in ${Math.ceil((new Date(ast.due_date || ast.deadline) - new Date()) / 3600000)}h`}
                       </div>
                       <div style={{ fontSize: '0.7rem opacity: 0.8' }}>{new Date(ast.due_date || ast.deadline).toLocaleDateString()}</div>
                       {mySub && <div style={{ color: '#10b981', fontWeight: 600, marginTop: 2 }}>Sent {new Date(mySub.submitted_at).toLocaleDateString()}</div>}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: '#475569', background: 'rgba(255,255,255,0.5)', padding: 16, borderRadius: 12, marginBottom:16, border: '1px solid rgba(0,0,0,0.03)' }}>
                    {ast.description || "No description provided."}
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    {!isGraded && (
                      <button 
                        onClick={() => setShowSubmitModal(ast)}
                        disabled={ast.cutoff_date && new Date() > new Date(ast.cutoff_date)}
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {mySub ? 'Resubmit Work' : 'Turn In Work'}
                      </button>
                    )}
                    {mySub?.feedback && (
                      <button 
                        onClick={() => alert(`Teacher Feedback for ${ast.title}:\n\n"${mySub.feedback}"`)}
                        style={{ background: 'white', border: '1.5px solid var(--border)', padding: '10px 20px', borderRadius: 8, fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer' }}
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

      {/* Communications Feed */}
      <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
        <h3 style={{ margin: '0 0 24px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageIcon size={20} color="#6366f1" /> Official School Notices
        </h3>

        {comms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <MessageIcon size={48} color="#e2e8f0" style={{ marginBottom: 16 }} />
            <div>No recent announcements from the school.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {comms.map((c, i) => (
              <div key={c.id || i} style={{ padding: 20, background: '#f8fafc', borderRadius: 16, borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusDotIcon color="#10b981" /> General Notice
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                    {new Date(c.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  "{c.message}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Assignment Modal */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 24, width: '100%', maxWidth: 500, animation: 'sIn 0.3s ease-out' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0f172a' }}>Submit Homework</h3>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.9rem' }}>{showSubmitModal.title}</p>
            
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
                alert('M-Pesa payment confirmed! The administration has automatically received a receipt.');
              } catch(err) {
                console.error(err);
                setIsSTKPushing(false);
                alert('M-Pesa push failed. Please try again.');
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
