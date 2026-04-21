import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  getSchoolProfile, getExams, getExamPapers, 
  getExamMarksForPaper, saveExamMarks, getClassList,
  getTeacherWorkloadSummary, getTeacherTimetable, getTimetableConfig, getPeriods,
  initPortalStore
} from '../../data/store';
import { 
  BookIcon, CheckIcon, SaveIcon, UserIcon, 
  GradingIcon, RefreshIcon, ChevronDownIcon, CalendarIcon, DashboardIcon, MenuIcon, LogoutIcon 
} from '../../components/CommonIcons';
import { useDialog } from '../../contexts/DialogContext';

// Premium UI Components
const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ 
    background: '#ffffff', borderRadius: '24px', padding: '24px', 
    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.06)', 
    border: '1px solid rgba(255,255,255,0.4)',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ...style 
  }}>
    {children}
  </div>
);

const Badge = ({ children, color = '#3b82f6', bg = '#eff6ff' }) => (
  <span style={{ 
    background: bg, color: color, padding: '6px 12px', 
    borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, 
    letterSpacing: '0.5px', textTransform: 'uppercase' 
  }}>
    {children}
  </span>
);

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
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [assignments_list, setAssignmentsList] = useState([]);
  
  // Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState(null); // 'exam' or 'paper'

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const schoolId = user.school_id || user.schoolId;
      const teacherRecordId = user.teacher_record_id || user.id;
      
      initPortalStore(schoolId, teacherRecordId);

      const [activeExams, allPeriods, profile] = await Promise.all([
        getExams().catch(() => []),
        getPeriods().catch(() => []),
        getSchoolProfile().catch(() => null)
      ]);
      
      setSchoolProfile(profile);
      const current = allPeriods.find(p => p.is_active) || allPeriods[0];
      setActivePeriod(current);
      setExams(activeExams);
      if (activeExams.length > 0) setSelectedExamId(activeExams[0].id);

      if (current) {
        const [w, s, c, al] = await Promise.all([
          getTeacherWorkloadSummary(schoolId, current.id, teacherRecordId).catch(() => 0),
          getTeacherTimetable(schoolId, current.id, teacherRecordId).catch(() => []),
          getTimetableConfig(schoolId, current.id).catch(() => []),
          // New assignment list RPC
          supabase.rpc('portal_get_teacher_assignments', { 
            p_school_id: schoolId, 
            p_period_id: current.id, 
            p_teacher_id: teacherRecordId 
          }).then(r => r.data || []).catch(() => [])
        ]);
        setWorkload(w);
        setSchedule(s);
        setConfig(c);
        setAssignmentsList(al);
      }
    } catch (err) {
      console.error('Staff Portal Init error:', err);
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
      setPapers(allPapers);
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
        getClassList(paper.classes.name, paper.class_id),
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
      message: `Save marks for ${students.length} students in ${selectedPaper.tt_subjects?.name || 'Subject'}?`,
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

  if (loading && exams.length === 0) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <div className="animate-pulse" style={{ width: 50, height: 50, borderRadius: 25, background: 'linear-gradient(135deg, #10b981, #3b82f6)' }} />
    </div>
  );

  const openPicker = (type) => {
    setPickerType(type);
    setPickerOpen(true);
  };

  const selectOption = (val) => {
    if (pickerType === 'exam') {
      setSelectedExamId(val);
    } else {
      const p = papers.find(pp => pp.id === val);
      if (p) handlePaperSelect(p);
    }
    setPickerOpen(false);
  };

  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", -apple-system, sans-serif' }}>
      
      {/* Premium Header */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', 
        padding: '20px 24px', position: 'sticky', top: 0, zIndex: 1000, 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', 
            color: '#fff', width: 44, height: 44, borderRadius: '14px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '1.4rem', fontWeight: 700, boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Staff Portal</div>
          </div>
        </div>
        <div onClick={onLogout} style={{ background: '#f1f5f9', padding: '10px', borderRadius: '12px', color: '#64748b', cursor: 'pointer' }}>
          <LogoutIcon size={20} />
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 20px 100px 20px', boxSizing: 'border-box' }}>
        
        {activeTab === 'grading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s ease-out' }}>
            
            {/* New: My Allocations Summary */}
            {assignments_list.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>My Allocations</h3>
                <Card style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {assignments_list.map((a, idx) => (
                      <Badge key={idx} bg="#f0fdf4" color="#16a34a">
                        {a.subject} - {a.class_grade}{a.stream ? ` ${a.stream}` : ''}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </div>
            )}
            
            <Card style={{ padding: '24px' }}>
               <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Grade Entry Setup</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 
                 <div onClick={() => openPicker('exam')} style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                   <div>
                     <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Examination</div>
                     <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                       {exams.find(e => e.id === selectedExamId)?.name || 'Select Exam Session'}
                     </div>
                   </div>
                   <ChevronDownIcon size={20} color="#94a3b8" />
                 </div>

                 <div onClick={() => openPicker('paper')} style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', opacity: !selectedExamId ? 0.6 : 1 }}>
                   <div>
                     <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Class & Subject</div>
                     <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                       {selectedPaper ? `${selectedPaper.classes?.name || 'Class'} — ${selectedPaper.tt_subjects?.name || 'Subject'}` : 'Choose Assigned Paper'}
                     </div>
                   </div>
                   <ChevronDownIcon size={20} color="#94a3b8" />
                 </div>
               </div>
            </Card>

            {!selectedPaper ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b' }}>
                <GradingIcon size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Ready for Entry</div>
                <div style={{ fontSize: '0.9rem' }}>Select an exam and paper to start entering marks.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Student List</h3>
                  <button 
                    onClick={handleSave} 
                    disabled={saving || loading}
                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '14px', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', cursor: 'pointer', opacity: (saving || loading) ? 0.7 : 1 }}
                  >
                    <SaveIcon size={18} /> {saving ? 'Saving...' : 'Sync All'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {students.map((s) => {
                    const data = marksBuffer[s.id] || { score: '', isAbsent: false };
                    return (
                      <Card key={s.id} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>{s.name}</div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>ADM: {s.adm_no}</div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>ABS</label>
                          <input 
                            type="checkbox" 
                            checked={data.isAbsent}
                            onChange={(e) => handleMarkChange(s.id, 'isAbsent', e.target.checked)}
                            style={{ width: 22, height: 22, cursor: 'pointer', accentColor: '#ef4444' }} 
                          />
                        </div>

                        <div style={{ width: 64 }}>
                           <input
                            type="number"
                            inputMode="numeric"
                            disabled={data.isAbsent}
                            value={data.score ?? ''}
                            onChange={(e) => handleMarkChange(s.id, 'score', e.target.value)}
                            style={{ width: '100%', padding: '12px 0', textAlign: 'center', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 800, color: data.isAbsent ? '#cbd5e1' : '#0f172a', background: data.isAbsent ? '#f8fafc' : '#fff', outline: 'none' }}
                            placeholder="—"
                          />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
              padding: '24px', borderRadius: '24px', color: '#fff',
              boxShadow: '0 12px 24px -8px rgba(15, 23, 42, 0.4)'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Weekly Workload</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{workload} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 600 }}>Periods</span></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Class Schedule</h3>
              
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                const dayLessons = schedule.filter(s => s.day_of_week === day).sort((a,b) => a.slot_index - b.slot_index);
                if (dayLessons.length === 0) return null;

                return (
                  <div key={day} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                      {day} <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {dayLessons.map(s => {
                        const time = config.find(c => c.slot_index === s.slot_index);
                        return (
                          <Card key={s.id} style={{ padding: '16px 20px', display: 'flex', gap: 16 }}>
                            <div style={{ width: 70, borderRight: '1px solid #f1f5f9', paddingRight: 12 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{time?.start_time}</div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{time?.end_time}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{s.subject}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{s.class_grade} {s.stream || ''}</div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {schedule.length === 0 && (
                <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <CalendarIcon size={40} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                  <div style={{ color: '#64748b', fontWeight: 600 }}>No classes scheduled for you this term.</div>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s ease-out' }}>
            <Card style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ 
                width: 80, height: 80, borderRadius: '24px', background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                color: '#fff', fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)'
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>{user.name}</h2>
              <Badge bg="#dcfce7" color="#16a34a">Official Staff Member</Badge>
              
              <div style={{ marginTop: 32, borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
                 <button 
                  onClick={onLogout}
                  style={{ width: '100%', background: '#fff1f2', color: '#e11d48', border: 'none', padding: '14px', borderRadius: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
                 >
                   <LogoutIcon size={18} /> Sign Out of Portal
                 </button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* App-like Bottom Navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', 
        width: '100%', maxWidth: 480, background: 'rgba(255, 255, 255, 0.9)', 
        backdropFilter: 'blur(20px)', display: 'flex', justifyContent: 'space-around',
        padding: '12px 0 calc(12px + env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(0,0,0,0.05)', zIndex: 1000
      }}>
        {[
          { id: 'grading', label: 'Grading', icon: GradingIcon },
          { id: 'schedule', label: 'Timetable', icon: CalendarIcon },
          { id: 'profile', label: 'Account', icon: UserIcon }
        ].map(tab => (
          <div 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, 
              color: activeTab === tab.id ? '#10b981' : '#94a3b8',
              cursor: 'pointer', flex: 1, position: 'relative'
            }}
          >
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span style={{ fontSize: '0.65rem', fontWeight: activeTab === tab.id ? 700 : 600 }}>{tab.label}</span>
            {activeTab === tab.id && (
              <div style={{ position: 'absolute', top: -12, width: 32, height: 4, background: '#10b981', borderRadius: '0 0 4px 4px' }} />
            )}
          </div>
        ))}
      </nav>

      {/* Modern Picker Sheet Overlay */}
      {pickerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 480, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: '24px 24px 40px', maxHeight: '80vh', overflowY: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ width: 48, height: 5, background: '#e2e8f0', borderRadius: 3, margin: '0 auto 24px' }} />
            
            <h3 style={{ margin: '0 0 20px', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
              {pickerType === 'exam' ? 'Select Exam Session' : 'Select Assigned Paper'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pickerType === 'exam' ? (
                exams.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No active exams found.</div> :
                exams.map(e => (
                  <div 
                    key={e.id} 
                    onClick={() => selectOption(e.id)}
                    style={{ padding: '16px 20px', borderRadius: '16px', background: selectedExamId === e.id ? '#f0fdf4' : '#f8fafc', border: selectedExamId === e.id ? '2px solid #10b981' : '2px solid transparent', cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 700, color: selectedExamId === e.id ? '#16a34a' : '#0f172a', fontSize: '1.05rem' }}>{e.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{e.term} • {e.status}</div>
                  </div>
                ))
              ) : (
                papers.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No papers assigned to you in this exam.</div> :
                papers.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => selectOption(p.id)}
                    style={{ padding: '16px 20px', borderRadius: '16px', background: selectedPaper?.id === p.id ? '#f0fdf4' : '#f8fafc', border: selectedPaper?.id === p.id ? '2px solid #10b981' : '2px solid transparent', cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 700, color: selectedPaper?.id === p.id ? '#16a34a' : '#0f172a', fontSize: '1.05rem' }}>
                      {p.classes?.name || 'Class'} {p.classes?.stream || ''}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{p.tt_subjects?.name || 'Subject'}</div>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => setPickerOpen(false)}
              style={{ width: '100%', padding: '14px', borderRadius: '16px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: 24 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
