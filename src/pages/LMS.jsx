import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { getSchoolProfile } from '../data/store';
import { addAssignment, getAssignments, getSubmissions, updateSubmissionGrade } from '../data/offlineStore';
import { BookIcon, CheckIcon, UsersIcon, DownloadIcon, ClockIcon, MessageIcon, GraduationIcon } from '../components/CommonIcons';
import Select from '../components/Common/Select';

/**
 * Moodle-Inspired LMS Module (Assignment Hub)
 * Handles the full lifecycle of an assignment: Setup -> Targeting -> Submissions -> Grading.
 */
export default function LMS({ currentUser }) {
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form State (Moodle-inspired Setup)
  const [formData, setFormData] = useState({
    title: '',
    class: '',
    stream: '',
    subject: '',
    allowFrom: new Date().toISOString().split('T')[0],
    dueDate: '',
    cutoffDate: '',
    description: '',
    links: ''
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
    await addAssignment({
      ...formData,
      teacher: currentUser?.name || 'Staff',
      status: 'Active'
    });
    // Reset form
    setFormData({ 
      title: '', class: '', stream: '', subject: '', 
      allowFrom: new Date().toISOString().split('T')[0], 
      dueDate: '', cutoffDate: '', description: '', links: '' 
    });
    await loadData();
    setLoading(false);
  };

  const viewSubmissions = async (assignment) => {
    const subs = await getSubmissions(assignment.id);
    setSelectedSubmissions({ assignment, subs });
  };

  const handleUpdateGrade = async (submissionId, data) => {
    await updateSubmissionGrade(submissionId, data);
    // Refresh current view
    if (selectedSubmissions) {
      const updatedSubs = await getSubmissions(selectedSubmissions.assignment.id);
      setSelectedSubmissions({ ...selectedSubmissions, subs: updatedSubs });
    }
  };

  const activeClasses = profile?.activeClasses || ['1', '2', '3', '4', '5', '6', '7', '8'];
  const streams = ['North', 'South', 'East', 'West', 'Central'];
  const subjects = ['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies', 'CRE/IRE', 'ICT', 'Arts'];

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
          <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>Availability</div>
            <div className="form-group">
              <label style={{ fontSize: '0.65rem' }}>Allow Submissions From</label>
              <input className="form-input" type="date" required value={formData.allowFrom} onChange={e => setFormData({ ...formData, allowFrom: e.target.value })} />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.65rem' }}>Due Date</label>
              <input className="form-input" type="date" required value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.65rem' }}>Cut-off Date (No uploads after)</label>
              <input className="form-input" type="date" required value={formData.cutoffDate} onChange={e => setFormData({ ...formData, cutoffDate: e.target.value })} />
            </div>
          </div>

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
                       <ClockIcon size={14} /> Due {new Date(ast.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
                      onClick={() => viewSubmissions(ast)}
                    >
                      Process Submissions →
                    </button>
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
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Workflow Status</th>
                        <th>Grade</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSubmissions.subs.map(sub => (
                        <tr key={sub.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{sub.student_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sent: {new Date(sub.timestamp).toLocaleString()}</div>
                          </td>
                          <td>
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
                          <td>
                            <input 
                              type="text" 
                              className="form-input sm" 
                              style={{ width: 60, padding: '5px 8px', textAlign: 'center', fontWeight: 700 }}
                              placeholder="-"
                              value={sub.grade || ''}
                              onChange={(e) => handleUpdateGrade(sub.id, { grade: e.target.value })}
                            />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="topbar-icon-btn" title="Review Submission" onClick={() => alert(`Reviewing: ${sub.student_name}\n\nContent: ${sub.payload}`)}>
                                <DownloadIcon size={14} />
                              </button>
                               <button className="topbar-icon-btn" title="Send Feedback Message" onClick={async () => {
                                 const f = prompt(`Feedback for ${sub.student_name}:`, sub.feedback || '');
                                 if (f !== null) await handleUpdateGrade(sub.id, { feedback: f });
                               }}>
                                <MessageIcon size={14} />
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

    </div>
  );
}
