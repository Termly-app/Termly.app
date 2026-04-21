import React, { useState, useEffect } from 'react';
import { 
  getSchoolProfile, getExams, getExamPapers, 
  getExamMarksForPaper, saveExamMarks, getClassList,
  getTeacherWorkloadSummary, getTeacherTimetable, getTimetableConfig, getPeriods
} from '../../data/store';
import { 
  BookIcon, CheckIcon, SignOutIcon, SaveIcon, UserIcon, 
  GradingIcon, RefreshIcon, ChevronDownIcon, CalendarIcon, DashboardIcon, MenuIcon 
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
  const [activeTab, setActiveTab] = useState('grading');
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
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', background: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* App-like Sticky Header */}
      <div style={{ background: '#fff', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #174ea6 100%)', color: '#fff', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 600 }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111b21', letterSpacing: '-0.3px' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#667781', display: 'flex', alignItems: 'center', gap: 4 }}>Staff Portal</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#54656f', padding: 4, cursor: 'pointer' }}>
          <SignOutIcon size={22} />
        </button>
      </div>

      <div style={{ flex: 1, padding: '16px 16px 90px 16px', boxSizing: 'border-box' }}>
        {activeTab === 'grading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease-out' }}>
            {/* Context Selectors Card */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
               <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: '#111b21', display: 'flex', alignItems: 'center', gap: 8 }}>
                 <GradingIcon size={18} color="#1a73e8" /> Grade Entry Setup
               </h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 <div style={{ position: 'relative' }}>
                   <select 
                     value={selectedExamId} 
                     onChange={(e) => setSelectedExamId(e.target.value)}
                     style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: '#f0f2f5', border: 'none', color: '#111b21', fontWeight: 600, fontSize: '0.95rem', appearance: 'none' }}
                   >
                     <option value="" disabled>Active Exam Session</option>
                     {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                     {exams.length === 0 && <option>No Open Exams</option>}
                   </select>
                   <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#667781' }}>
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
                     style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#111b21', fontWeight: 600, fontSize: '0.95rem', appearance: 'none' }}
                   >
                     <option value="" disabled>Select Class & Subject</option>
                     {papers.map(p => (
                       <option key={p.id} value={p.id}>
                         {p.classes.name} {p.classes.stream} — {p.tt_subjects.name}
                       </option>
                     ))}
                     {papers.length === 0 && <option disabled>No assigned papers found</option>}
                   </select>
                   <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#667781' }}>
                     <ChevronDownIcon size={18} />
                   </div>
                 </div>
               </div>
            </div>

            {/* Student List */}
            {!selectedPaper ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#667781' }}>
                <div style={{ background: '#e8f0fe', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#1a73e8' }}>
                   <CheckIcon size={32} />
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#111b21', marginBottom: 8 }}>Ready for Marks Entry</div>
                <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>Select a paper from the list above to begin entering scores.</div>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 16, padding: '16px 0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ padding: '0 16px 16px', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a73e8', textTransform: 'uppercase' }}>{selectedPaper.classes.name} {selectedPaper.classes.stream}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111b21' }}>{selectedPaper.tt_subjects.name}</div>
                  </div>
                  <button 
                    onClick={handleSave} 
                    disabled={saving || loading}
                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 20, fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, opacity: (saving || loading) ? 0.7 : 1, cursor: 'pointer' }}
                  >
                    <SaveIcon size={16} /> {saving ? 'Syncing...' : 'Save All'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {students.map((s, index) => {
                    const data = marksBuffer[s.id] || { score: '', isAbsent: false };
                    const isLast = index === students.length - 1;
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', borderBottom: isLast ? 'none' : '1px solid #f0f2f5' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#111b21', fontSize: '0.95rem' }}>{s.name}</div>
                          <div style={{ color: '#667781', fontSize: '0.8rem', marginTop: 2, fontWeight: 500 }}>ADM: {s.adm_no}</div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#667781' }}>ABS</label>
                          <input 
                            type="checkbox" 
                            checked={data.isAbsent}
                            onChange={(e) => handleMarkChange(s.id, 'isAbsent', e.target.checked)}
                            style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#ef4444' }} 
                          />
                        </div>

                        <div style={{ width: 64 }}>
                           <input
                            type="number"
                            inputMode="numeric"
                            disabled={data.isAbsent}
                            value={data.score ?? ''}
                            onChange={(e) => handleMarkChange(s.id, 'score', e.target.value)}
                            style={{ width: '100%', padding: '10px 0', textAlign: 'center', border: '1.5px solid #cbd5e1', borderRadius: 10, fontSize: '1rem', fontWeight: 600, color: data.isAbsent ? '#94a3b8' : '#111b21', background: data.isAbsent ? '#f8fafc' : '#fff', boxSizing: 'border-box' }}
                            placeholder="—"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#667781', fontWeight: 600, textTransform: 'uppercase' }}>Weekly Workload</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111b21' }}>{workload} <span style={{ fontSize: '0.9rem', color: '#667781', fontWeight: 500 }}>Periods</span></div>
              </div>
              <div style={{ background: '#fdf0d5', padding: 12, borderRadius: '50%', color: '#b47b0e' }}>
                 <CalendarIcon size={24} />
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: '#111b21', display: 'flex', alignItems: 'center', gap: 8 }}>
                 <DashboardIcon size={18} color="#1a73e8" /> {activePeriod?.term} Timetable
              </h3>

              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                const dayLessons = schedule.filter(s => s.day_of_week === day).sort((a,b) => a.slot_index - b.slot_index);
                if (dayLessons.length === 0) return null;

                return (
                  <div key={day} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1a73e8', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {day} <div style={{ flex: 1, height: 1, background: '#f0f2f5' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {dayLessons.map(s => {
                        const time = config.find(c => c.slot_index === s.slot_index);
                        return (
                          <div key={s.id} style={{ display: 'flex', gap: 16, background: '#f8fafc', padding: '12px 16px', borderRadius: 12, border: '1px solid #f0f2f5' }}>
                            <div style={{ width: 70, borderRight: '1px solid #e2e8f0', paddingRight: 10 }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111b21' }}>{time?.start_time}</div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#667781' }}>{time?.end_time}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111b21' }}>{s.subject}</div>
                              <div style={{ fontSize: '0.8rem', color: '#667781' }}>{s.class_grade} {s.stream || ''}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {schedule.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#667781' }}>
                  <CalendarIcon size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
                  <div>No lessons assigned to you yet for this term.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ background: '#e8f0fe', color: '#1a73e8', width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 600 }}>
                {user.name.charAt(0)}
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', color: '#111b21' }}>{user.name}</h2>
              <p style={{ margin: 0, color: '#667781', fontSize: '0.95rem' }}>Staff Member • School Portal</p>
            </div>
            
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div 
                onClick={onLogout}
                style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign Out <LogoutIcon size={18} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* App-like Bottom Navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', display: 'flex', justifyContent: 'space-around',
        padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
        borderTop: '1px solid #e2e8f0', zIndex: 50,
        boxShadow: '0 -1px 3px rgba(0,0,0,0.03)'
      }}>
        {[
          { id: 'grading', label: 'Grading', icon: GradingIcon },
          { id: 'schedule', label: 'Timetable', icon: CalendarIcon },
          { id: 'profile', label: 'Profile', icon: UserIcon }
        ].map(tab => (
          <div 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, 
              color: activeTab === tab.id ? '#1a73e8' : '#54656f',
              cursor: 'pointer', flex: 1
            }}
          >
            <tab.icon size={24} />
            <span style={{ fontSize: '0.65rem', fontWeight: activeTab === tab.id ? 600 : 500 }}>{tab.label}</span>
          </div>
        ))}
      </nav>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
