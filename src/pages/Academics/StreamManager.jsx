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

  if (loading) return <div className="flex-center" style={{ minHeight: 300 }}><div className="spinner"></div></div>;

  const currentStreams = profile?.streamsPerClass?.[selectedClass] || [];
  const classStudents = students.filter(s => s.class === selectedClass);

  return (
    <div className="stream-manager">
      <div className="grid grid-2" style={{ gap: 24 }}>
        {/* Stream Definition */}
        <div className="card">
          <div className="card-header">
            <h3><SchoolIcon size={18} /> Manage Streams for {selectedClass}</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Select Class</label>
              <Select 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
                options={(profile?.activeClasses || []).map(c => ({ id: c, label: c }))}
              />
            </div>

            <div style={{ marginTop: 24 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Current Streams</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {currentStreams.map(s => (
                  <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-sidebar)', padding: '12px 16px', borderRadius: 12 }}>
                    <span style={{ fontWeight: 700 }}>{s}</span>
                    <button className="btn-icon text-danger" onClick={() => handleRemoveStream(s)}><CrossIcon size={16} /></button>
                  </div>
                ))}
                {currentStreams.length === 0 && <p className="text-muted text-center py-4">No streams defined yet.</p>}
              </div>
            </div>

            <div style={{ marginTop: 24, padding: 20, background: 'var(--primary-light)', borderRadius: 16 }}>
              <label>Add New Stream</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Blue" 
                  value={newStreamName}
                  onChange={e => setNewStreamName(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handleAddStream}>Add</button>
              </div>
            </div>
          </div>
        </div>

        {/* Student Assignment */}
        <div className="card">
          <div className="card-header">
            <h3><UsersIcon size={18} /> Student Assignments ({classStudents.length})</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              <table className="data-table responsive-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Current Stream</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map(s => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>
                        <Select 
                          value={s.stream || ''} 
                          onChange={e => handleReassignStudent(s.id, e.target.value)}
                          options={[
                            { id: '', label: 'Unassigned' },
                            ...currentStreams.map(st => ({ id: st, label: st }))
                          ]}
                          variant="minimal"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
