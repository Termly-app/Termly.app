import React, { useState, useEffect } from 'react';
import { getSchoolProfile, saveSchoolProfile, getStudents, updateStudent } from '../../data/store';
import { CBC_STRUCTURE } from '../../data/seedData';
import { SchoolIcon, UsersIcon, EditIcon, CheckIcon, CrossIcon } from '../../components/CommonIcons';
import Select from '../../components/Common/Select';
import { useDialog } from '../../contexts/DialogContext';

export default function StreamManager() {
  const { alert, confirm } = useDialog();
  const [profile, setProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('Grade 1');
  const [newStreamName, setNewStreamName] = useState('');
  const [editingStream, setEditingStream] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([getSchoolProfile(), getStudents()]);
      setProfile(p);
      setStudents(s);
      if (p.activeClasses?.length > 0 && !p.activeClasses.includes(selectedClass)) {
        setSelectedClass(p.activeClasses[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStream = async () => {
    if (!newStreamName) return;
    const currentStreams = profile.streamsPerClass?.[selectedClass] || [];
    if (currentStreams.includes(newStreamName)) {
      alert({ title: 'Duplicate Stream', message: 'This stream name already exists for this class.', variant: 'warning' });
      return;
    }

    const updatedStreams = {
      ...profile.streamsPerClass,
      [selectedClass]: [...currentStreams, newStreamName]
    };

    try {
      await saveSchoolProfile({ streamsPerClass: updatedStreams });
      setNewStreamName('');
      await loadData();
    } catch (err) {
      alert({ title: 'Update Error', message: err.message, variant: 'danger' });
    }
  };

  const handleRemoveStream = async (stream) => {
    const hasStudents = students.some(s => s.class === selectedClass && s.stream === stream);
    if (hasStudents) {
      alert({ title: 'Cannot Remove', message: 'There are students assigned to this stream. Reassign them first.', variant: 'danger' });
      return;
    }

    if (!await confirm({ title: 'Remove Stream', message: `Are you sure you want to remove '${stream}'?` })) return;

    const updatedStreams = {
      ...profile.streamsPerClass,
      [selectedClass]: profile.streamsPerClass[selectedClass].filter(s => s !== stream)
    };

    try {
      await saveSchoolProfile({ streamsPerClass: updatedStreams });
      await loadData();
    } catch (err) {
      alert({ title: 'Update Error', message: err.message, variant: 'danger' });
    }
  };

  const handleReassignStudent = async (studentId, newStream) => {
    try {
      await updateStudent(studentId, { stream: newStream });
      await loadData();
    } catch (err) {
      alert({ title: 'Update Error', message: err.message, variant: 'danger' });
    }
  };

  if (loading) return <div className="flex-center" style={{ minHeight: 400 }}><Loader /></div>;

  const currentStreams = profile?.streamsPerClass?.[selectedClass] || [];
  const classStudents = students.filter(s => s.class_grade === selectedClass || s.class === selectedClass);

  return (
    <div className="stream-manager animate-in">
      <div className="grid grid-2" style={{ gap: 32 }}>
        {/* Stream Definition */}
        <div className="card glass-card" style={{ border: 'none', background: 'white', boxShadow: '0 20px 50px rgba(0,0,0,0.04)' }}>
          <div className="card-header" style={{ background: 'transparent', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '24px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-50)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyCenter: 'center', display: 'flex', justifyContent: 'center' }}>
                <SchoolIcon size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Manage Streams</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>Configure sections for {selectedClass}</p>
              </div>
            </div>
          </div>
          
          <div className="card-body" style={{ padding: '32px' }}>
            <div className="form-group" style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', marginBottom: 12, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>SELECT CLASS</label>
              <Select 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
                options={(profile?.activeClasses || []).map(c => ({ id: c, label: c }))}
                style={{ width: '100%', height: '52px', borderRadius: 14 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 16, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>CURRENT STREAMS</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {currentStreams.map(s => (
                  <div 
                    key={s} 
                    className="stream-pill animate-pop"
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: '#f8fafc', 
                      padding: '14px 20px', 
                      borderRadius: 16,
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary-light)' }}></div>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{s}</span>
                    </div>
                    <button 
                      className="btn-icon" 
                      onClick={() => handleRemoveStream(s)}
                      style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '10px', width: '36px', height: '36px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <CrossIcon size={16} />
                    </button>
                  </div>
                ))}
                
                {currentStreams.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 20, border: '1px dashed #cbd5e1' }}>
                    <UsersIcon size={32} style={{ color: '#94a3b8', marginBottom: 12, opacity: 0.5 }} />
                    <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>No streams defined for this class yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 40, padding: 28, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: 24, color: 'white', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.2)' }}>
              <label style={{ display: 'block', marginBottom: 12, fontWeight: 700, fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>ADD NEW STREAM</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Blue" 
                  value={newStreamName}
                  onChange={e => setNewStreamName(e.target.value)}
                  style={{ flex: 1, height: '48px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,1)', color: '#1e293b', fontWeight: 600, padding: '0 16px' }}
                />
                <button 
                  className="btn" 
                  onClick={handleAddStream}
                  style={{ background: '#000', color: '#fff', borderRadius: 12, padding: '0 24px', fontWeight: 700, height: '48px' }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Student Assignment */}
        <div className="card glass-card" style={{ border: 'none', background: 'white', boxShadow: '0 20px 50px rgba(0,0,0,0.04)' }}>
          <div className="card-header" style={{ background: 'transparent', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '24px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UsersIcon size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Student Assignments</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>{classStudents.length} students in this class</p>
              </div>
            </div>
          </div>
          
          <div className="card-body" style={{ padding: 0 }}>
            {classStudents.length > 0 ? (
              <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '16px 32px', color: '#64748b', fontSize: '0.7rem', letterSpacing: '0.05em' }}>STUDENT NAME</th>
                      <th style={{ padding: '16px 32px', color: '#64748b', fontSize: '0.7rem', letterSpacing: '0.05em', textAlign: 'right' }}>CURRENT STREAM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map(s => (
                      <tr key={s.id} className="hover-row">
                        <td style={{ padding: '16px 32px' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{s.name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.adm_no || s.admNo || 'No ADM'}</div>
                        </td>
                        <td style={{ padding: '16px 32px', textAlign: 'right' }}>
                          <Select 
                            value={s.stream || ''} 
                            onChange={e => handleReassignStudent(s.id, e.target.value)}
                            options={[
                              { id: '', label: 'Unassigned' },
                              ...currentStreams.map(st => ({ id: st, label: st }))
                            ]}
                            variant="minimal"
                            style={{ minWidth: 140, height: 40, borderRadius: 10, fontSize: '0.85rem' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                   <UsersIcon size={32} style={{ color: '#cbd5e1' }} />
                </div>
                <h4 style={{ fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>No Students Found</h4>
                <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: 260, margin: '0 auto' }}>
                  We couldn't find any students enrolled in <strong>{selectedClass}</strong> yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .hover-row:hover { background: #fafbfc; }
        .stream-pill:hover { border-color: var(--primary-light) !important; transform: translateX(4px); }
        .hover-row Select:hover { border-color: var(--primary) !important; }
      `}</style>
    </div>
  );
}
