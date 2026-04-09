import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  getSchoolProfile, getAssignments, createAssignment, 
  getSubmissions, updateSubmission, fetchLmsContent, getQuizAnalytics 
} from '../data/store';
import { 
  BookIcon, CheckIcon, UsersIcon, DownloadIcon, ClockIcon, MessageIcon, GraduationIcon, 
  DashboardIcon, TrendingUpIcon, AlertIcon, ArrowRightIcon
} from '../components/CommonIcons';
import Select from '../components/Common/Select';
import { useDialog } from '../contexts/DialogContext';

/**
 * Moodle-Inspired LMS Module (Assignment Hub)
 * Handles the full lifecycle of an assignment: Setup -> Targeting -> Submissions -> Grading.
 */
// Sub-component for individual assignment stats
function SubmissionProgress({ ast }) {
  const [stats, setStats] = useState({ submitted: 0, total: 10 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getStats() {
      const { getAssignmentStats } = await import('../data/store');
      try {
        const res = await getAssignmentStats(ast.id, ast.class, ast.stream);
        setStats(res);
      } catch (e) {
        console.warn('Stats fetch failed', e);
      } finally {
        setLoading(false);
      }
    }
    getStats();
  }, [ast.id]);

  if (loading) return <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, marginTop: 8 }}></div>;

  const pct = Math.min((stats.submitted / stats.total) * 100, 100);
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, marginBottom: 6 }}>
        <span style={{ color: 'var(--text-muted)' }}>Submission Progress</span>
        <span style={{ color: 'var(--primary)' }}>{stats.submitted} / {stats.total} Students</span>
      </div>
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', transition: 'width 0.5s ease' }}></div>
      </div>
    </div>
  );
}

function QuizAnalyticsModal({ assignmentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getQuizAnalytics(assignmentId);
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [assignmentId]);

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass-morph" style={{ maxWidth: 400, padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Analyzing Class Performance...</p>
      </div>
    </div>
  );

  if (!data || data.totalSubmissions === 0) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass-morph" style={{ maxWidth: 500, padding: 40, textAlign: 'center' }}>
        <div style={{ color: 'var(--warning)', marginBottom: 20 }}><AlertIcon size={48} /></div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>No Analytics Yet</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Once students complete this quiz, you'll see a breakdown of question difficulty and score averages here.</p>
        <button className="btn btn-primary" onClick={onClose}>Close</button>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass-morph" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, padding: 0 }}>
        <div className="modal-header" style={{ padding: '24px 32px', background: 'var(--primary)', color: 'white' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>Teacher Insights</div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{data.title} - Analytics</h3>
          </div>
          <button className="modal-close" onClick={onClose} style={{ color: 'white' }}>×</button>
        </div>
        
        <div className="modal-body" style={{ padding: 32, maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 16, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>{data.totalSubmissions}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>Submissions</div>
            </div>
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 16, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--success)' }}>{data.avgScore}%</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>Class Average</div>
            </div>
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 16, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)' }}>{data.highestScore}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>High Score</div>
            </div>
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 16, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--danger)' }}>{data.lowestScore}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>Low Score</div>
            </div>
          </div>

          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUpIcon size={20} color="var(--primary)" />
            Question Difficulty Breakdown
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.questionStats.map((q, idx) => {
              const color = q.successRate > 80 ? '#10b981' : q.successRate > 50 ? '#f59e0b' : '#ef4444';
              return (
                <div key={idx} style={{ padding: 20, background: 'white', border: '1px solid var(--border)', borderRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1, paddingRight: 20 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>QUESTION {idx + 1}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.4 }}>{q.text}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color }}>{q.successRate.toFixed(0)}%</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Success Rate</div>
                    </div>
                  </div>
                  <div style={{ height: 10, background: '#f1f5f9', borderRadius: 20, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${q.successRate}%`, background: color, borderRadius: 20, transition: 'width 1s ease-out' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="modal-footer" style={{ padding: 24, justifyContent: 'center' }}>
          <button className="btn btn-secondary" style={{ padding: '12px 32px' }} onClick={onClose}>Close Report</button>
        </div>
      </div>
    </div>
  );
}

export default function LMS({ currentUser }) {
  const { alert } = useDialog();
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState(null);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form State (Moodle-inspired Setup)
  const [formData, setFormData] = useState({
    title: '',
    class: '',
    stream: '',
    subject: '',
    allowFrom: new Date().toISOString().slice(0, 16),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    cutoffDate: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 16),
    description: '',
    links: '',
    maxScore: 100,
    submissionType: 'online_text',
    questions: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const prof = await getSchoolProfile();
    setProfile(prof);
    const active = await getAssignments();
    setAssignments(active);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createAssignment({
        ...formData,
        teacher: currentUser?.name || 'Staff'
      });
      // Reset form
      setFormData({ 
        title: '', class: '', stream: '', subject: '', 
        allowFrom: new Date().toISOString().slice(0, 16), 
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16), 
        cutoffDate: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 16), 
        description: '', links: '',
        maxScore: 100, submissionType: 'online_text',
        questions: []
      });
      await loadData();
    } catch (err) {
      alert({ title: 'Creation Error', message: `Error creating assignment: ${err.message}`, variant: 'danger' });
    }
    setLoading(false);
  };

  const [showQuestionModal, setShowQuestionModal] = useState(false);

  const handleAddQuestion = () => {
    setFormData({
      ...formData,
      questions: [...(formData.questions || []), { 
        id: Date.now(), 
        text: '', 
        type: 'multiple_choice', 
        options: ['', '', '', ''], 
        correctIndex: 0, 
        points: 1 
      }]
    });
  };

  const updateQuestion = (id, fields) => {
    setFormData({
      ...formData,
      questions: formData.questions.map(q => q.id === id ? { ...q, ...fields } : q)
    });
  };

  const removeQuestion = (id) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter(q => q.id !== id)
    });
  };

  const activeClasses = profile?.activeClasses || ['1', '2', '3', '4', '5', '6', '7', '8'];
  const streams = ['North', 'South', 'East', 'West', 'Central'];
  const subjects = profile?.customSubjects ? Object.keys(profile.customSubjects) : ['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies', 'CRE/IRE', 'ICT', 'Arts'];

  return (
    <div className="section-card animate-in" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, minHeight: 'calc(100vh - 120px)' }}>
      <Helmet>
        <title>Assignments Hub | ShuleSoft LMS</title>
        <meta name="description" content="Create, target, and grade assignments in the ShuleSoft digital classroom." />
      </Helmet>
      
      {/* LEFT PANE: Professional Assignment Setup */}
      <div style={{ paddingRight: 24, borderRight: '1px solid var(--border)', background: '#fcfcfc', padding: 20, borderRadius: '12px 0 0 12px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-main)' }}>
          <div style={{ background: 'var(--primary-light)', padding: 8, borderRadius: 8, color: 'var(--primary)' }}>
            <BookIcon size={20} />
          </div>
          Create Assignment
        </h2>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Assignment Title</label>
            <input className="form-input" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Mid-term Algebra Review" />
          </div>

          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>Target Class</label>
              <Select 
                value={formData.class} 
                onChange={e => setFormData({ ...formData, class: e.target.value })}
                options={activeClasses.map(c => ({ id: c, label: `Class ${c}` }))}
                placeholder="Select Class"
                style={{ width: '100%' }}
              />
            </div>
            <div className="form-group">
              <label>Stream</label>
              <Select 
                value={formData.stream} 
                onChange={e => setFormData({ ...formData, stream: e.target.value })}
                options={streams.map(s => ({ id: s, label: s }))}
                placeholder="Select Stream"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Subject</label>
            <Select 
              value={formData.subject} 
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              options={subjects.map(s => ({ id: s, label: s }))}
              placeholder="Select Subject"
              style={{ width: '100%' }}
            />
          </div>

          {/* Moodle Availability Controls */}
          <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>Availability Settings</div>
            <div className="form-group">
              <label style={{ fontSize: '0.7rem' }}>Allow Submissions From</label>
              <input className="form-input" type="datetime-local" required value={formData.allowFrom} onChange={e => setFormData({ ...formData, allowFrom: e.target.value })} />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.7rem' }}>Due Date (Deadline)</label>
              <input className="form-input" type="datetime-local" required value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.7rem' }}>Hard Cut-off (Locked After)</label>
              <input className="form-input" type="datetime-local" required value={formData.cutoffDate} onChange={e => setFormData({ ...formData, cutoffDate: e.target.value })} />
            </div>
          </div>

          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label>Max Score</label>
              <input type="number" className="form-input" value={formData.maxScore} onChange={e => setFormData({ ...formData, maxScore: parseInt(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Submission Method</label>
              <Select 
                value={formData.submissionType} 
                onChange={e => setFormData({ ...formData, submissionType: e.target.value })}
                options={[
                  { id: 'online_text', label: 'Online Text Response' },
                  { id: 'file_upload', label: 'File Upload (PDF/Scan)' },
                  { id: 'quiz', label: 'Interactive Quiz (Auto-graded)' }
                ]}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {formData.submissionType === 'quiz' && (
            <div style={{ background: 'var(--primary-light)', padding: 16, borderRadius: 12, border: '1.5px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Quiz Questions ({formData.questions.length})</div>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAddQuestion}>+ Add Question</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                {formData.questions.map((q, qidx) => (
                  <div key={q.id} style={{ background: 'white', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>Q{qidx+1}</span>
                      <button type="button" onClick={() => removeQuestion(q.id)} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem' }}>&times;</button>
                    </div>
                    <input 
                      className="form-input" 
                      placeholder="Question text..." 
                      value={q.text} 
                      onChange={e => updateQuestion(q.id, { text: e.target.value })}
                      style={{ marginBottom: 8, fontSize: '0.8rem' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {q.options.map((opt, oidx) => (
                        <div key={oidx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input 
                            type="radio" 
                            name={`correct-${q.id}`} 
                            checked={q.correctIndex === oidx} 
                            onChange={() => updateQuestion(q.id, { correctIndex: oidx })} 
                          />
                          <input 
                            className="form-input" 
                            placeholder={`Option ${oidx+1}`} 
                            value={opt} 
                            onChange={e => {
                              const newOpts = [...q.options];
                              newOpts[oidx] = e.target.value;
                              updateQuestion(q.id, { options: newOpts });
                            }}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontSize: '0.7rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                      <span>Points:</span>
                      <input 
                        type="number" 
                        value={q.points} 
                        onChange={e => updateQuestion(q.id, { points: parseInt(e.target.value) || 1 })}
                        style={{ width: 40, border: '1px solid var(--border)', textAlign: 'center' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
             <label>Task Instructions</label>
             <textarea 
               className="form-input" 
               required 
               style={{ minHeight: 100, border: '1.5px solid var(--border)' }}
               value={formData.description}
               onChange={e => setFormData({ ...formData, description: e.target.value })}
               placeholder="Enter detailed instructions for students..."
             />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ padding: '14px', fontSize: '1rem', fontWeight: 800, marginTop: 5, boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}>
            {loading ? 'Publishing...' : 'Send to Portals'}
          </button>
        </form>
      </div>

      {/* RIGHT PANE: Tracking & Moodle-style Marking Workflow */}
      <div style={{ padding: 10 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', padding: 8, borderRadius: 8, color: 'var(--success)' }}>
            <UsersIcon size={20} />
          </div>
          Assignment Lifecycle Tracker
        </h2>

        {!selectedSubmissions ? (
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {assignments.length === 0 ? (
              <div style={{ gridColumn: '1/-1', padding: 60, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 16, border: '2px dashed var(--border)' }}>
                <ClockIcon size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>No active assignments found.</div>
                <p>Start by creating one using the left panel.</p>
              </div>
            ) : (
              assignments.map(ast => (
                <div key={ast.id} className="card-hover" style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 22, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span className="badge badge-accent">Class {ast.class} {ast.stream}</span>
                        <span className="badge badge-success">{ast.subject}</span>
                      </div>
                      <div className="badge badge-info sm">Active</div>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 12, marginBottom: 4 }}>{ast.title}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                       <ClockIcon size={14} /> 
                       {new Date(ast.allow_from || ast.allowFrom) > new Date() ? (
                         <span style={{ color: 'var(--warning)', fontWeight: 700 }}>Starts {new Date(ast.allow_from || ast.allowFrom).toLocaleString()}</span>
                       ) : (
                         <span>Due {new Date(ast.due_date || ast.dueDate).toLocaleString()}</span>
                       )}
                    </div>
                    <SubmissionProgress ast={ast} />
                  </div>
                  
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', gap: 10 }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ flex: 1, justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}
                      onClick={() => viewSubmissions(ast)}
                    >
                      Process →
                    </button>
                    {ast.submission_type === 'quiz' && (
                      <button 
                        className="btn btn-ghost" 
                        style={{ border: '1.5px solid var(--border)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.85rem' }}
                        title="View Analytics"
                        onClick={() => setShowAnalytics(ast.id)}
                      >
                        <DashboardIcon size={16} /> Data
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
           </div>
        ) : (
          <div className="animate-in" style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedSubmissions.assignment.title}</h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 10 }}>
                   <span><strong>Class:</strong> {selectedSubmissions.assignment.class} {selectedSubmissions.assignment.stream}</span>
                   <span>•</span>
                   <span><strong>Subject:</strong> {selectedSubmissions.assignment.subject}</span>
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setSelectedSubmissions(null)} style={{ border: '1.5px solid var(--border)', fontWeight: 600 }}>Back to List</button>
            </div>
            
            <div style={{ padding: 24 }}>
              {selectedSubmissions.subs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <MessageIcon size={48} style={{ opacity: 0.15, marginBottom: 12 }} />
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>No submissions yet.</div>
                  <p>Students will see this task in their portal.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table responsive-table">
                    <thead>
                      <tr>
                        <th>Adm No</th>
                        <th>Student</th>
                        <th>Workflow Status</th>
                        <th>Grade</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSubmissions.subs.map(sub => (
                        <tr key={sub.id}>
                          <td data-label="Adm No" style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sub.students?.adm_no || '—'}</td>
                          <td data-label="Student">
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{sub.students?.name || sub.student_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sent: {new Date(sub.submitted_at || sub.timestamp).toLocaleString()}</div>
                          </td>
                          <td data-label="Workflow Status">
                            <Select 
                              value={sub.workflow_status || 'Submitted'}
                              onChange={(e) => handleUpdateGrade(sub.id, { workflow_status: e.target.value })}
                              options={[
                                { id: 'Submitted', label: 'Submitted' },
                                { id: 'In Grading', label: 'In Grading' },
                                { id: 'Ready for Release', label: 'Ready for Release' },
                                { id: 'Released', label: 'Released' }
                              ]}
                              variant="minimal"
                              style={{ padding: '2px 8px', fontSize: '0.75rem', minWidth: 120 }}
                            />
                          </td>
                          <td data-label="Grade">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input 
                                type="text" 
                                className="form-input sm" 
                                style={{ width: 60, padding: '5px 8px', textAlign: 'center', fontWeight: 700 }}
                                placeholder="-"
                                value={sub.grade_numeric ?? ''}
                                onChange={(e) => handleUpdateGrade(sub.id, { grade_numeric: e.target.value ? parseFloat(e.target.value) : null })}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ {selectedSubmissions.assignment.max_score || 100}</span>
                            </div>
                            {sub.is_late && <div style={{ fontSize: '0.65rem', color: 'var(--danger)', fontWeight: 700, marginTop: 2 }}>LATE SUBMISSION</div>}
                          </td>
                          <td data-label="Actions">
                            <div style={{ display: 'flex', gap: 6 }}>
                               <button className="topbar-icon-btn" title="Review & Grade" onClick={() => setGradingSubmission(sub)}>
                                <CheckIcon size={14} />
                              </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MOODLE-STYLE GRADING MODAL */}
      {gradingSubmission && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 40 }}>
          <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 960, height: '80vh', display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden', animation: 'sIn 0.3s ease-out', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            {/* CONTENT AREA */}
            <div style={{ padding: 40, overflowY: 'auto', background: '#f8fafc', borderRight: '1px solid var(--border)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                 <div>
                   <div style={{ display:'flex', gap:8, marginBottom: 8 }}>
                     <span className="badge badge-info">{gradingSubmission.workflow_status}</span>
                     {gradingSubmission.is_late && <span className="badge badge-danger">LATE SUBMISSION</span>}
                   </div>
                   <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 2 }}>{gradingSubmission.students?.adm_no || 'No ID'}</div>
                   <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{gradingSubmission.students?.name || gradingSubmission.student_name}</h3>
                   <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                     Submitted: {new Date(gradingSubmission.submitted_at || gradingSubmission.timestamp).toLocaleString()}
                   </div>
                 </div>
               </div>

               <div style={{ position: 'relative' }}>
                 <div style={{ position: 'absolute', top: -10, left: 20, background: 'white', padding: '2px 10px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', border: '1px solid var(--border)', borderRadius: 4 }}>STUDENT SUBMISSION</div>
                 <div style={{ background: 'white', padding: 32, borderRadius: 16, border: '1px solid var(--border)', minHeight: 400, boxShadow: 'var(--shadow-sm)', whiteSpace: 'pre-wrap', color: '#1e293b', lineHeight: 1.6, fontSize: '1rem' }}>
                   <LmsContentFetcher url={gradingSubmission.content_url} />
                 </div>
               </div>
            </div>

            {/* GRADING SIDEBAR */}
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24, background: 'white' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)' }}>
                 <GraduationIcon size={20} />
                 <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Grading & Feedback</h4>
               </div>
               
               <div className="form-group">
                 <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                   Numerical Grade (out of {selectedSubmissions.assignment.max_score || 100})
                 </label>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                   <input 
                     type="number" 
                     className="form-input" 
                     style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', color: 'var(--primary)', height: 60 }}
                     value={gradingSubmission.grade_numeric ?? ''}
                     onChange={(e) => setGradingSubmission({ ...gradingSubmission, grade_numeric: e.target.value ? parseFloat(e.target.value) : null })}
                   />
                   <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-muted)' }}>/ {selectedSubmissions.assignment.max_score || 100}</span>
                 </div>
               </div>

               <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                 <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Feedback to Student</label>
                 <textarea 
                   className="form-input" 
                   style={{ flex: 1, minHeight: 200, resize: 'none', padding: 16, fontSize: '0.95rem' }}
                   placeholder="Enter constructive feedback..."
                   value={gradingSubmission.feedback || ''}
                   onChange={(e) => setGradingSubmission({ ...gradingSubmission, feedback: e.target.value })}
                 />
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '16px', fontWeight: 800, fontSize: '1rem', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }} 
                    onClick={async () => {
                      setLoading(true);
                      await handleUpdateGrade(gradingSubmission.id, { 
                        grade_numeric: gradingSubmission.grade_numeric, 
                        feedback: gradingSubmission.feedback,
                        workflow_status: 'released' 
                      });
                      setGradingSubmission(null);
                      setLoading(false);
                    }}
                  >
                    {loading ? 'Releasing...' : 'Release Grade'}
                  </button>
                  <button className="btn btn-ghost" style={{ padding: 12, fontWeight: 600 }} onClick={() => setGradingSubmission(null)}>
                    Close Editor
                  </button>
               </div>
            </div>

          </div>
        </div>
      )}
      {showAnalytics && <QuizAnalyticsModal assignmentId={showAnalytics} onClose={() => setShowAnalytics(null)} />}
    </div>
  );
}

// Child component to fetch content on load inside the modal
function LmsContentFetcher({ url }) {
  const [content, setContent] = useState('Loading...');
  useEffect(() => {
    async function getIt() {
      if (!url) { setContent('No submission content found.'); return; }
      const { fetchLmsContent } = await import('../data/store');
      try {
        const res = await fetchLmsContent(url);
        setContent(typeof res === 'object' ? JSON.stringify(res, null, 2) : res || 'No content found.');
      } catch (e) {
        setContent('Error loading content.');
      }
    }
    getIt();
  }, [url]);
  return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>;
}
