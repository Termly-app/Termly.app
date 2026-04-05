import React, { useState, useEffect } from 'react';
import { getSchoolProfile } from '../data/store';
import { addAssignment, getAssignments, getSubmissions } from '../data/offlineStore';
import { BookIcon, CheckIcon, UsersIcon, DownloadIcon } from '../components/CommonIcons';

export default function LMS({ currentUser }) {
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    class: '',
    subject: '',
    deadline: '',
    description: '',
    link: ''
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
      teacher: currentUser?.name || 'Staff'
    });
    setFormData({ title: '', class: '', subject: '', deadline: '', description: '', link: '' });
    await loadData();
    setLoading(false);
  };

  const viewSubmissions = async (assignment) => {
    const subs = await getSubmissions(assignment.id);
    setSelectedSubmissions({ assignment, subs });
  };

  const activeClasses = profile?.activeClasses || [];
  const subjects = ['Mathematics', 'English', 'Science', 'History', 'Geography', 'Swahili'];

  return (
    <div className="section-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 2fr', gap: 24, minHeight: 'calc(100vh - 120px)' }}>
      
      {/* LEFT PANE: Create Assignment */}
      <div style={{ paddingRight: 24, borderRight: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookIcon size={20} /> Create Assignment
        </h2>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Assignment Title</label>
            <input className="form-input" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Chapter 4 Algebra Exercises" />
          </div>

          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>Target Class</label>
              <select className="form-select" required value={formData.class} onChange={e => setFormData({ ...formData, class: e.target.value })}>
                <option value="">Select Class</option>
                {activeClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Subject</label>
              <select className="form-select" required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Deadline</label>
            <input className="form-input" type="date" required value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
          </div>

          <div className="form-group">
            <label>Task Instructions & External Links</label>
            <textarea 
              className="form-input" 
              required 
              style={{ minHeight: 120, resize: 'vertical' }}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detail the homework here. If there are PDF attachments, paste your Google Drive or Dropbox link here."
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ padding: '14px', fontSize: '1rem', fontWeight: 700, marginTop: 8 }}>
            {loading ? 'Publishing...' : 'Publish to Parent Portal'}
          </button>
        </form>
      </div>

      {/* RIGHT PANE: Track & Submissions */}
      <div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <UsersIcon size={20} /> Active Assignments Tracker
        </h2>

        {!selectedSubmissions ? (
           <div style={{ display: 'grid', gap: 16 }}>
            {assignments.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12 }}>
                No active assignments.
              </div>
            ) : (
              assignments.map(ast => (
                <div key={ast.id} className="card-hover" style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span className="badge badge-accent">Class {ast.class}</span>
                      <span className="badge badge-success">{ast.subject}</span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>{ast.title}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Due: {new Date(ast.deadline).toLocaleDateString()}</div>
                  </div>
                  <button className="btn btn-secondary" onClick={() => viewSubmissions(ast)}>
                    View Submissions →
                  </button>
                </div>
              ))
            )}
           </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Submissions: {selectedSubmissions.assignment.title}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Class {selectedSubmissions.assignment.class} • Due {new Date(selectedSubmissions.assignment.deadline).toLocaleDateString()}</div>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedSubmissions(null)}>Close</button>
            </div>
            
            <div style={{ padding: 24 }}>
              {selectedSubmissions.subs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  No students have submitted this assignment yet.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Submitted At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSubmissions.subs.map(sub => (
                      <tr key={sub.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sub.student_name}</div>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{new Date(sub.timestamp).toLocaleString()}</td>
                        <td>
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => alert(`Submission Output:\n\n${sub.payload}`)}>
                            <DownloadIcon size={14} /> Review Work
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
