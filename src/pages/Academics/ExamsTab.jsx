import React, { useState, useEffect } from 'react';
import { 
  getExams, createExam, updateExam, getExamPapers, saveExamPapers, 
  getClasses, getTTSubjects, getSchoolProfile 
} from '../../data/store';
import { 
  GradingIcon, PlusIcon, CalendarIcon, CheckIcon, 
  SettingsIcon, LockIcon, EyeIcon, FilterIcon, RefreshIcon,
  SearchIcon
} from '../../components/CommonIcons';
import Loader from '../../components/Common/Loader';
import MarksEntry from './MarksEntry';

const ExamsTab = ({ currentUser, currentPeriodId }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'detail', or 'entry'
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [papers, setPapers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddPapersModal, setShowAddPapersModal] = useState(false);
  const [newExam, setNewExam] = useState({ name: '', type: 'endterm', term: 'Term 1' });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [examList, classList, subjectList] = await Promise.all([
        getExams(),
        getClasses(),
        getTTSubjects()
      ]);
      setExams(examList);
      setClasses(classList);
      setSubjects(subjectList);
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadExamDetails = async (exam) => {
    setSelectedExam(exam);
    setLoading(true);
    try {
      const examPapers = await getExamPapers(exam.id);
      setPapers(examPapers);
      setView('detail');
    } catch (err) {
      alert('Failed to load exam papers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPapers = async () => {
    if (selectedClasses.length === 0 || selectedSubjects.length === 0) return;
    try {
      setLoading(true);
      const newPapers = [];
      selectedClasses.forEach(classId => {
        selectedSubjects.forEach(subjectId => {
          newPapers.push({
            class_id: classId,
            subject_id: subjectId,
            max_score: 100,
            out_of: 100
          });
        });
      });
      await saveExamPapers(selectedExam.id, newPapers);
      const updatedPapers = await getExamPapers(selectedExam.id);
      setPapers(updatedPapers);
      setShowAddPapersModal(false);
      setSelectedClasses([]);
      setSelectedSubjects([]);
    } catch (err) {
      alert('Failed to add papers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async () => {
    if (!newExam.name) return;
    try {
      const created = await createExam(newExam.name, newExam.type, newExam.term);
      setExams([created, ...exams]);
      setShowCreateModal(false);
      setNewExam({ name: '', type: 'endterm', term: 'Term 1' });
    } catch (err) {
      alert('Failed to create exam');
    }
  };

  const updateStatus = async (examId, newStatus) => {
    try {
      setLoading(true);
      await updateExam(examId, { status: newStatus });
      
      // If closing, calculate results
      if (newStatus === 'closed') {
        const { calculateExamResults } = await import('../../data/store');
        await calculateExamResults(examId);
      }
      
      setExams(exams.map(e => e.id === examId ? { ...e, status: newStatus } : e));
      if (selectedExam?.id === examId) {
        setSelectedExam({ ...selectedExam, status: newStatus });
      }
    } catch (err) {
      console.error('Status update failed:', err);
      alert('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'setup': return '#64748b'; // Slate
      case 'open': return '#3b82f6';  // Blue
      case 'closed': return '#f59e0b'; // Amber
      case 'published': return '#10b981'; // Emerald
      default: return '#64748b';
    }
  };

  if (loading) return <Loader />;

  if (view === 'detail' && selectedExam) {
    return (
      <div className="exams-detail" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <button 
          onClick={() => setView('list')}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          &larr; Back to Exams
        </button>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>{selectedExam.name}</h1>
              <span style={{ 
                fontSize: '0.75rem', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                color: getStatusColor(selectedExam.status),
                background: `${getStatusColor(selectedExam.status)}15`,
                padding: '4px 12px',
                borderRadius: '20px'
              }}>
                {selectedExam.status}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{selectedExam.term} • {selectedExam.exam_type}</p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
              <SettingsIcon size={18} /> Edit Settings
            </button>
          </div>
        </header>

        <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Exam Papers (Subjects per Class)</h3>
            <button 
              onClick={() => setShowAddPapersModal(true)}
              style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}
            >
              + Add Papers
            </button>
          </div>
          <div style={{ padding: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem' }}>Class</th>
                  <th style={{ padding: '1rem' }}>Subject</th>
                  <th style={{ padding: '1rem' }}>Max Score</th>
                  <th style={{ padding: '1rem' }}>Entry Progress</th>
                  <th style={{ padding: '1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {papers.length === 0 ? (
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No papers configured yet. Tap "Add Papers" to link subjects to classes for this exam.
                    </td>
                  </tr>
                ) : papers.map(paper => (
                  <tr key={paper.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>{paper.classes.name} {paper.classes.stream}</td>
                    <td style={{ padding: '1rem' }}>{paper.tt_subjects.name}</td>
                    <td style={{ padding: '1rem' }}>{paper.max_score}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ width: '100px', height: '6px', background: 'var(--bg-secondary)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${(paper.marks_entered || 0)}%`, height: '100%', background: 'var(--primary)' }} />
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button 
                        onClick={() => { setSelectedPaper(paper); setView('entry'); }}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Enter Marks &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showAddPapersModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '800px', borderRadius: '24px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text)' }}>Add Papers</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Select classes and subjects to generate exam targets.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Classes</h4>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.5rem' }}>
                    {classes.map(c => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedClasses.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedClasses([...selectedClasses, c.id]);
                            else setSelectedClasses(selectedClasses.filter(id => id !== c.id));
                          }}
                        />
                        <span>{c.name} {c.stream}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Subjects</h4>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.5rem' }}>
                    {subjects.map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedSubjects.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSubjects([...selectedSubjects, s.id]);
                            else setSelectedSubjects(selectedSubjects.filter(id => id !== s.id));
                          }}
                        />
                        <span>{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowAddPapersModal(false)}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddPapers}
                  style={{ padding: '0.75rem 2rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Generate {selectedClasses.length * selectedSubjects.length} Papers
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'entry' && selectedPaper) {
    return <MarksEntry paper={selectedPaper} onBack={() => loadExamDetails(selectedExam)} />;
  }

  return (
    <div className="exams-tab animate-in">
      <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setShowCreateModal(true)}
          style={{ 
            background: 'var(--primary)', 
            color: 'white', 
            border: 'none', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}
        >
          <PlusIcon size={18} />
          Create Exam
        </button>
      </header>

      {/* Exam Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {exams.map(exam => (
          <div 
            key={exam.id} 
            style={{ 
              background: 'var(--card-bg)', 
              borderRadius: '16px', 
              padding: '1.5rem',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: getStatusColor(exam.status) }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 800, 
                  textTransform: 'uppercase', 
                  color: getStatusColor(exam.status),
                  background: `${getStatusColor(exam.status)}15`,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  letterSpacing: '0.05em'
                }}>
                  {exam.status}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text)' }}>{exam.name}</h3>
              </div>
              <CalendarIcon size={20} color="var(--text-muted)" />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>{exam.term}</span>
              <span>•</span>
              <span>{exam.exam_type}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button 
                onClick={() => loadExamDetails(exam)}
                style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border)', 
                  padding: '0.6rem', 
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Configure
              </button>
              
              {exam.status === 'setup' && (
                <button 
                  onClick={() => updateStatus(exam.id, 'open')}
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Open Entry
                </button>
              )}
              {exam.status === 'open' && (
                <button 
                  onClick={() => updateStatus(exam.id, 'closed')}
                  style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Close & Rank
                </button>
              )}
              {exam.status === 'closed' && (
                <button 
                  onClick={() => updateStatus(exam.id, 'published')}
                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Publish
                </button>
              )}
              {exam.status === 'published' && (
                <button 
                  disabled
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: 'none', padding: '0.6rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Published
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '450px', borderRadius: '24px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text)' }}>New Exam Session</h2>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Exam Name</label>
              <input 
                type="text" 
                placeholder="e.g. Mid-Term 1 2026"
                value={newExam.name}
                onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Term</label>
                <select 
                  value={newExam.term}
                  onChange={(e) => setNewExam({ ...newExam, term: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }}
                >
                  <option>Term 1</option>
                  <option>Term 2</option>
                  <option>Term 3</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Type</label>
                <select 
                  value={newExam.type}
                  onChange={(e) => setNewExam({ ...newExam, type: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }}
                >
                  <option value="opener">Opener</option>
                  <option value="midterm">Midterm</option>
                  <option value="endterm">End Term</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateExam}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                Create Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamsTab;
