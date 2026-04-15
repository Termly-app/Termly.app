import React, { useState, useEffect } from 'react';
import { 
  getExamPapers, getExamMarksForPaper, saveExamMarks, 
  getClassList 
} from '../../data/store';
import { 
  CheckIcon, SaveIcon, ArrowRightIcon, UsersIcon, 
  GradingIcon, RefreshIcon 
} from '../../components/CommonIcons';
import Loader from '../../components/Common/Loader';

const MarksEntry = ({ paper, onBack }) => {
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPaperData();
  }, [paper.id]);

  const loadPaperData = async () => {
    try {
      setLoading(true);
      // Get class list and existing marks
      const [classList, existingMarks] = await Promise.all([
        getClassList(paper.classes.name), // Assuming paper has nested classes object from join
        getExamMarksForPaper(paper.id)
      ]);
      
      setStudents(classList);
      
      // Map existing marks to state
      const marksMap = {};
      existingMarks.forEach(m => {
        marksMap[m.student_id] = {
          raw_score: m.raw_score,
          is_absent: m.is_absent,
          remarks: m.remarks || ''
        };
      });
      setMarks(marksMap);
    } catch (err) {
      console.error('Failed to load marks data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId, field, value) => {
    setMarks({
      ...marks,
      [studentId]: {
        ...(marks[studentId] || { raw_score: '', is_absent: false, remarks: '' }),
        [field]: value
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const rows = Object.entries(marks).map(([studentId, data]) => ({
        student_id: studentId,
        raw_score: data.is_absent ? null : Number(data.raw_score),
        is_absent: data.is_absent,
        remarks: data.remarks
      }));
      
      await saveExamMarks(paper.id, rows);
      alert('Marks saved successfully');
    } catch (err) {
      alert('Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="marks-entry" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <button 
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        &larr; Back to Papers
      </button>

      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <GradingIcon size={28} color="var(--primary)" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)' }}>
            Marks Entry: {paper.tt_subjects.name}
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          {paper.classes.name} {paper.classes.stream} • Max Score: {paper.max_score}
        </p>
      </header>

      <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Student Name</th>
              <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Score / {paper.max_score}</th>
              <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Absent</th>
              <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const studentMarks = marks[student.id] || { raw_score: '', is_absent: false, remarks: '' };
              return (
                <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{student.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ADM: {student.adm_no}</div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <input 
                      type="number" 
                      disabled={studentMarks.is_absent}
                      value={studentMarks.raw_score || ''}
                      onChange={(e) => handleMarkChange(student.id, 'raw_score', e.target.value)}
                      max={paper.max_score}
                      style={{ 
                        width: '80px', 
                        padding: '0.5rem', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border)', 
                        textAlign: 'center',
                        background: studentMarks.is_absent ? 'var(--bg-secondary)' : 'white',
                        fontWeight: 700
                      }}
                    />
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={studentMarks.is_absent}
                      onChange={(e) => handleMarkChange(student.id, 'is_absent', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <input 
                      type="text" 
                      placeholder="Optional comment..."
                      value={studentMarks.remarks || ''}
                      onChange={(e) => handleMarkChange(student.id, 'remarks', e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button 
            disabled={saving}
            onClick={loadPaperData}
            style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshIcon size={18} /> Reset
          </button>
          <button 
            disabled={saving}
            onClick={handleSave}
            style={{ padding: '0.75rem 2rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {saving ? 'Saving...' : (
              <>
                <SaveIcon size={18} /> Save Marks
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarksEntry;
