import React, { useState, useEffect } from 'react';
import { 
  getSchoolProfile, getExams, getExamPapers, 
  getExamMarksForPaper, saveExamMarks, getClassList,
  getTeacherWorkloadSummary, getTeacherTimetable, getTimetableConfig, getPeriods
} from '../../data/store';
import { 
  BookIcon, CheckIcon, SignOutIcon, SaveIcon, UserIcon, 
  GradingIcon, RefreshIcon, ChevronDownIcon 
} from '../../components/CommonIcons';
import { useDialog } from '../../contexts/DialogContext';
import Loader from '../../components/Common/Loader';

export default function MobileGrading({ user, onLogout }) {
  const { alert, confirm } = useDialog();
  const [exams, setExams] = useState([]);
  const [papers, setPapers] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [marksBuffer, setMarksBuffer] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Timetable/Workload stats
  const [workload, setWorkload] = useState(0);
  const [schedule, setSchedule] = useState([]);
  const [config, setConfig] = useState([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [activePeriod, setActivePeriod] = useState(null);


  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [activeExams, allPeriods, profile] = await Promise.all([
        getExams({ status: 'open' }),
        getPeriods(),
        getSchoolProfile()
      ]);
      
      const current = allPeriods.find(p => p.is_active) || allPeriods[0];
      setActivePeriod(current);
      setExams(activeExams);
      if (activeExams.length > 0) setSelectedExamId(activeExams[0].id);

      if (current && profile?.id) {
        const [w, s, c] = await Promise.all([
          getTeacherWorkloadSummary(profile.id, current.id, user.id),
          getTeacherTimetable(profile.id, current.id, user.id),
          getTimetableConfig(profile.id, current.id)
        ]);
        setWorkload(w);
        setSchedule(s);
        setConfig(c);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (selectedExamId) {
      loadTeacherPapers();
    }
  }, [selectedExamId]);

  const loadTeacherPapers = async () => {
    try {
      setLoading(true);
      const allPapers = await getExamPapers(selectedExamId);
      // Filter papers assigned to this teacher
      // Note: user.id in StaffPortal matches the id in the users table
      const myPapers = allPapers.filter(p => p.teacher_id === user.id);
      setPapers(myPapers);
      setSelectedPaper(null);
      setStudents([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaperSelect = async (paper) => {
    setSelectedPaper(paper);
    try {
      setLoading(true);
      const [classList, existingMarks] = await Promise.all([
        getClassList(paper.classes.name),
        getExamMarksForPaper(paper.id)
      ]);
      
      setStudents(classList);
      const buffer = {};
      existingMarks.forEach(m => {
        buffer[m.student_id] = {
          score: m.raw_score,
          isAbsent: m.is_absent
        };
      });
      setMarksBuffer(buffer);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId, field, value) => {
    setMarksBuffer({
      ...marksBuffer,
      [studentId]: {
        ...(marksBuffer[studentId] || { score: '', isAbsent: false }),
        [field]: value
      }
    });
  };

  const handleSave = async () => {
    if (!selectedPaper) return;
    
    const confirmed = await confirm({
      title: 'Sync Marks?',
      message: `Save marks for ${students.length} students in ${selectedPaper.tt_subjects.name}?`,
      variant: 'primary'
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      const payload = Object.entries(marksBuffer).map(([studentId, data]) => ({
        student_id: studentId,
        raw_score: data.isAbsent ? null : (data.score === '' ? null : Number(data.score)),
        is_absent: data.isAbsent,
        remarks: ''
      }));
      
      await saveExamMarks(selectedPaper.id, payload);
      alert({ title: 'Success', message: 'Marks Synchronized to Cloud!', variant: 'success' });
    } catch (err) {
      alert({ title: 'Sync Error', message: 'Failed to save marks. Check connectivity.', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  if (loading && exams.length === 0) return <Loader />;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Mobile Header Menu */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', padding: '24px 20px 32px', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: 4 }}>Teacher Portal</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{user.name}</div>
          </div>
          <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
            <SignOutIcon size={20} />
          </button>
        </div>

        {/* Workload Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Weekly Workload</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24' }}>{workload} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Periods</span></div>
          </div>
          <button 
            onClick={() => setShowSchedule(true)}
            style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 20px -5px rgba(59, 130, 246, 0.4)' }}
          >
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, opacity: 0.8 }}>My Timetable</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>View Schedule <ChevronDownIcon size={14} /></div>
          </button>
        </div>


        {/* Wizard Selectors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <select 
              value={selectedExamId} 
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, fontSize: '0.95rem', appearance: 'none', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="" disabled style={{ color: '#000' }}>Active Exam Session</option>
              {exams.map(e => <option key={e.id} value={e.id} style={{ color: '#000' }}>{e.name}</option>)}
              {exams.length === 0 && <option style={{ color: '#000' }}>No Open Exams</option>}
            </select>
            <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.6 }}>
              <ChevronDownIcon size={18} />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <select 
              value={selectedPaper?.id || ''} 
              onChange={(e) => {
                const p = papers.find(pp => pp.id === e.target.value);
                if (p) handlePaperSelect(p);
              }}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: 'none', background: 'white', color: '#0f172a', fontWeight: 700, fontSize: '0.95rem', appearance: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            >
              <option value="" disabled>Select Your Paper</option>
              {papers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.classes.name} {p.classes.stream} — {p.tt_subjects.name}
                </option>
              ))}
              {papers.length === 0 && <option disabled>No assigned papers found</option>}
            </select>
            <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
              <ChevronDownIcon size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Vertical Data Entry List */}
      <div style={{ padding: '24px 16px', flex: 1 }}>
        {!selectedPaper ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', color: '#94a3b8' }}>
            <GradingIcon size={64} color="#e2e8f0" style={{ marginBottom: 20 }} />
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#475569', marginBottom: 8 }}>Ready to grade?</div>
            <div style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>Select an exam session and one of your assigned subjects to begin entering marks.</div>
          </div>
        ) : (
          <div style={{ animation: 'sIn 0.3s ease-out' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '0 4px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>{selectedPaper.classes.name} {selectedPaper.classes.stream}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{selectedPaper.tt_subjects.name}</div>
              </div>
              <button 
                onClick={handleSave} 
                disabled={saving || loading}
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)', opacity: (saving || loading) ? 0.7 : 1, cursor: 'pointer' }}
              >
                <SaveIcon size={18} /> {saving ? 'Saving...' : 'Sync Cloud'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 100 }}>
              {students.map((s, index) => {
                const data = marksBuffer[s.id] || { score: '', isAbsent: false };
                return (
                  <div key={s.id} style={{ background: 'white', padding: '16px 20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{s.name}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 2, fontWeight: 600 }}>ADM: {s.adm_no}</div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>ABSENT</label>
                      <input 
                        type="checkbox" 
                        checked={data.isAbsent}
                        onChange={(e) => handleMarkChange(s.id, 'isAbsent', e.target.checked)}
                        style={{ width: 22, height: 22, cursor: 'pointer' }} 
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                       <label style={{ fontSize: '0.65rem', fontWeight: 800, color: data.isAbsent ? '#cbd5e1' : '#64748b' }}>SCORE</label>
                       <input
                        type="number"
                        inputMode="numeric"
                        disabled={data.isAbsent}
                        value={data.score ?? ''}
                        onChange={(e) => handleMarkChange(s.id, 'score', e.target.value)}
                        style={{ width: 68, padding: '10px 0', textAlign: 'center', border: '2.5px solid #e2e8f0', borderRadius: '12px', fontSize: '1.25rem', fontWeight: 900, color: data.isAbsent ? '#cbd5e1' : '#0f172a', background: data.isAbsent ? '#f8fafc' : 'white' }}
                        placeholder="—"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sticky Bottom Save Button */}
            <div style={{ position: 'fixed', bottom: 20, left: 16, right: 16 }}>
              <button 
                onClick={handleSave} 
                disabled={saving || loading}
                style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 15px 30px -5px rgba(59, 130, 246, 0.4)', cursor: 'pointer' }}
              >
                {saving ? 'SYNCHRONIZING...' : <><CheckIcon size={24} /> PUSH MARKS TO CLOUD</>}
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Timetable Modal (Mobile View) */}
      {showSchedule && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'white', zIndex: 9999, display: 'flex', flexDirection: 'column', animation: 'sIn 0.3s ease-out' }}>
          <div style={{ padding: '24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>My Weekly Schedule</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{activePeriod?.term} {activePeriod?.year}</div>
            </div>
            <button onClick={() => setShowSchedule(false)} style={{ background: '#f1f5f9', border: 'none', color: '#0f172a', padding: '12px', borderRadius: '12px', cursor: 'pointer' }}>
              <SignOutIcon size={20} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
              const dayLessons = schedule.filter(s => s.day_of_week === day).sort((a,b) => a.slot_index - b.slot_index);
              if (dayLessons.length === 0) return null;

              return (
                <div key={day} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {day} <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {dayLessons.map(s => {
                      const time = config.find(c => c.slot_index === s.slot_index);
                      return (
                        <div key={s.id} style={{ display: 'flex', gap: 16, background: '#f8fafc', padding: 12, borderRadius: 16, border: '1px solid #f1f5f9' }}>
                          <div style={{ width: 70, textAlign: 'center' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>{time?.start_time}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>TO {time?.end_time}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 750, color: '#0f172a' }}>{s.subject}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{s.class_grade} {s.stream || ''}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {schedule.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <CalendarIcon size={48} color="#e2e8f0" style={{ marginBottom: 16 }} />
                <div>No lessons assigned to you yet for this term.</div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes sIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
