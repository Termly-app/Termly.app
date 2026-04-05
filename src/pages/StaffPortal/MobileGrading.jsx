import React, { useState, useEffect } from 'react';
import { getSchoolProfile, getClassResults, setStudentAllMarks, getSubjectAssignments } from '../../data/store';
import { CBC_STRUCTURE } from '../../data/seedData';
import { BookIcon, CheckIcon, SignOutIcon, SaveIcon, UserIcon } from '../../components/CommonIcons';

export default function MobileGrading({ user, onLogout }) {
  const [profile, setProfile] = useState({});
  const [assignments, setAssignments] = useState({});
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [marksBuffer, setMarksBuffer] = useState({});
  const [examType, setExamType] = useState('End Term');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const [p, a] = await Promise.all([getSchoolProfile(), getSubjectAssignments()]);
      setProfile(p);
      setAssignments(a);
      
      const activeClassList = p.activeClasses || [];
      const assigned = activeClassList.filter(g => 
        a[g] && Object.values(a[g]).some(streams => 
          typeof streams === 'string' ? streams === user.id :
          Object.values(streams).some(tid => tid === user.id)
        )
      );

      if (assigned.length > 0) setSelectedClass(assigned[0]);
      setLoading(false);
    }
    init();
  }, [user]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      loadStudents();
    }
  }, [selectedClass, selectedSubject, examType]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await getClassResults(selectedClass, examType);
      const sorted = res.sort((a,b) => a.name.localeCompare(b.name));
      setStudents(sorted);
      
      const buffer = {};
      sorted.forEach(s => {
        buffer[s.id] = s.marks[selectedSubject] || '';
      });
      setMarksBuffer(buffer);
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Loop through all students and save their marks
      for (const s of students) {
        const val = marksBuffer[s.id];
        if (val !== '' && !isNaN(Number(val))) {
          const updatedMarks = { ...s.marks, [selectedSubject]: Number(val) };
          await setStudentAllMarks(s.id, updatedMarks, examType);
        }
      }
      alert('Marks Synchronized successfully!');
    } catch(err) {
      alert('Error saving marks.');
    }
    setSaving(false);
  };

  const assignedClasses = (profile?.activeClasses || []).filter(g => 
    assignments[g] && Object.values(assignments[g]).some(streams => 
      typeof streams === 'string' ? streams === user.id :
      Object.values(streams).some(tid => tid === user.id)
    )
  );

  const assignedSubjects = [];
  if (selectedClass && assignments[selectedClass]) {
    Object.entries(assignments[selectedClass]).forEach(([subject, streams]) => {
      if (typeof streams === 'string' && streams === user.id) {
        assignedSubjects.push(subject);
      } else if (typeof streams === 'object' && Object.values(streams).includes(user.id)) {
        assignedSubjects.push(subject);
      }
    });
  }

  if (loading && students.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading classes...</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Mobile Header Menu */}
      <div style={{ background: '#1e293b', color: 'white', padding: '20px 16px 32px', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Teacher Portal</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{user.name}</div>
          </div>
          <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: 8, borderRadius: 8, display: 'flex' }}>
            <SignOutIcon size={18} />
          </button>
        </div>

        {/* Wizard Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <select 
            value={selectedClass} 
            onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject(''); }}
            style={{ padding: 12, borderRadius: 8, border: 'none', background: 'white', fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}
          >
            <option value="" disabled>Select Class</option>
            {assignedClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
          <select 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{ padding: 12, borderRadius: 8, border: 'none', background: 'white', fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}
          >
            <option value="" disabled>Select Subject</option>
            {assignedSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Vertical Data Entry List */}
      <div style={{ padding: '24px 16px', flex: 1 }}>
        {!selectedSubject ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <BookIcon size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569' }}>Select a Subject</div>
            <div style={{ fontSize: '0.9rem', marginTop: 4 }}>To begin entering marks for {selectedClass}.</div>
          </div>
        ) : (
          <div style={{ animation: 'sIn 0.3s ease-out' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>{students.length} Students Found</div>
              <button 
                onClick={handleSave} 
                disabled={saving}
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 100, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', opacity: saving ? 0.7 : 1 }}
              >
                <SaveIcon size={16} /> {saving ? 'Syncing...' : 'Save All'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {students.map((s, index) => (
                <div key={s.id} style={{ background: 'white', padding: 16, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                  <div style={{ background: '#f1f5f9', color: '#64748b', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{s.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>{s.admNo}</div>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    max="100"
                    value={marksBuffer[s.id] !== undefined ? marksBuffer[s.id] : ''}
                    onChange={(e) => setMarksBuffer({ ...marksBuffer, [s.id]: e.target.value })}
                    style={{ width: 64, padding: '12px 8px', textAlign: 'center', border: '2px solid #cbd5e1', borderRadius: 8, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>

            {/* Sticky Bottom Save Button for Mobile ergonomics */}
            <div style={{ position: 'sticky', bottom: 16, marginTop: 24, padding: '0 16px' }}>
              <button 
                onClick={handleSave} 
                disabled={saving}
                style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', padding: 16, borderRadius: 16, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)' }}
              >
                {saving ? 'Synchronizing...' : <><CheckIcon size={20} /> SYNCHRONIZE MARKS</>}
              </button>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
