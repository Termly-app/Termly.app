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
  GradingIcon, RefreshIcon, ChevronDownIcon, CalendarIcon, DashboardIcon, MenuIcon, LogoutIcon, TeacherIcon 
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
  
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024);

  // Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState(null); // 'exam' or 'paper'

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 1024);
    window.addEventListener('resize', handleResize);
    loadInitialData();
    return () => window.removeEventListener('resize', handleResize);
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

  const navItems = [
    { id: 'grading', label: 'Grading', icon: GradingIcon },
    { id: 'schedule', label: 'Timetable', icon: CalendarIcon },
    { id: 'profile', label: 'Account', icon: UserIcon }
  ];

  return (
    <div style={{ 
      width: '100%', minHeight: '100vh', background: '#f8fafc', 
      display: 'flex', flexDirection: isDesktop ? 'row' : 'column',
      fontFamily: '"Inter", -apple-system, sans-serif' 
    }}>
      
      {/* DESKTOP SIDEBAR */}
      {isDesktop && (
        <div style={{ 
          width: '280px', background: '#fff', borderRight: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', padding: '32px 0', position: 'sticky', top: 0, height: '100vh'
        }}>
          <div style={{ padding: '0 32px 40px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TeacherIcon size={20} color="#fff" />
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#0f172a' }}>ShuleSoft</div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px' }}>
            {navItems.map(item => (
              <div 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{ 
                  padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: activeTab === item.id ? '#f0fdf4' : 'transparent',
                  color: activeTab === item.id ? '#10b981' : '#64748b',
                  fontWeight: 700, transition: 'all 0.2s'
                }}
              >
                <item.icon size={22} />
                {item.label}
              </div>
            ))}
          </div>

          <div style={{ padding: '0 16px' }}>
             <div onClick={onLogout} style={{ padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, color: '#ef4444', fontWeight: 700 }}>
                <LogoutIcon size={22} /> Logout
             </div>
          </div>
        </div>
      )}

      {/* MOBILE HEADER */}
      {!isDesktop && (
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
      )}

      {/* MAIN CONTENT */}
      <div style={{ 
        flex: 1, padding: isDesktop ? '48px 60px' : '24px 20px 100px 20px', 
        maxWidth: isDesktop ? '1000px' : '100%', boxSizing: 'border-box' 
      }}>
        
        {/* Desktop Greeting */}
        {isDesktop && (
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-1px' }}>Welcome back, {user.name}</h1>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '1.1rem' }}>Here is what's happening in your classes today.</p>
          </div>
        )}

        {activeTab === 'grading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isDesktop ? 32 : 20, animation: 'fadeIn 0.4s ease-out' }}>
            
            {/* My Allocations Summary */}
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
            
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 2fr' : '1fr', gap: 32 }}>
               <Card style={{ padding: '24px', alignSelf: 'start' }}>
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
                          {selectedPaper ? `${selectedPaper.classes?.name || 'Class'} - ${selectedPaper.tt_subjects?.name || 'Subject'}` : 'Choose Assigned Paper'}
                        </div>
                      </div>
                      <ChevronDownIcon size={20} color="#94a3b8" />
                    </div>
                  </div>
               </Card>

               {!selectedPaper ? (
                 <div style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b', background: '#fff', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                   <GradingIcon size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                   <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Ready for Entry</div>
                   <div style={{ fontSize: '0.9rem' }}>Select an exam and paper from the left to start entering marks.</div>
                 </div>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Student List ({students.length})</h3>
                     <button 
                       onClick={handleSave} 
                       disabled={saving || loading}
                       style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '14px', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', cursor: 'pointer' }}
                     >
                       <SaveIcon size={18} /> {saving ? 'Saving...' : 'Sync to Cloud'}
                     </button>
                   </div>

                   <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 16 }}>
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
          </div>
        )}

        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr', gap: 20 }}>
               <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '24px', borderRadius: '24px', color: '#fff' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Weekly Workload</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>{workload} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Periods</span></div>
               </div>
               <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Active Term</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{activePeriod?.term} {activePeriod?.year}</div>
               </div>
               <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Classes Today</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{schedule.filter(s => s.day_of_week === new Intl.DateTimeFormat('en-US', {weekday: 'long'}).format(new Date())).length} Sessions</div>
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : '1fr', gap: 16 }}>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                const dayLessons = schedule.filter(s => s.day_of_week === day).sort((a,b) => a.slot_index - b.slot_index);
                
                return (
                  <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', textAlign: isDesktop ? 'center' : 'left' }}>
                      {day}
                    </div>
                    {dayLessons.map(s => {
                      const time = config.find(c => c.slot_index === s.slot_index);
                      return (
                        <div key={s.id} style={{ background: '#fff', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{time?.start_time}</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{s.subject}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{s.class_grade} {s.stream}</div>
                        </div>
                      );
                    })}
                    {dayLessons.length === 0 && <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed #e2e8f0', borderRadius: '16px', fontSize: '0.7rem', color: '#cbd5e1' }}>No Classes</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ maxWidth: 600, margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
            <Card style={{ textAlign: 'center', padding: '48px 32px' }}>
              <div style={{ 
                width: 100, height: 100, borderRadius: '32px', background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                color: '#fff', fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px', boxShadow: '0 12px 24px rgba(16, 185, 129, 0.3)'
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.8rem', color: '#0f172a', fontWeight: 900 }}>{user.name}</h2>
              <Badge bg="#dcfce7" color="#16a34a">Official Staff Member</Badge>
              
              <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 12 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Institution</span>
                    <span style={{ color: '#0f172a', fontWeight: 800 }}>{schoolProfile?.name || 'Marete School'}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Phone Number</span>
                    <span style={{ color: '#0f172a', fontWeight: 800 }}>{user.phone || '0712260057'}</span>
                 </div>
              </div>

              <button 
                onClick={onLogout}
                style={{ width: '100%', background: '#fff1f2', color: '#e11d48', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', marginTop: 32 }}
               >
                 <LogoutIcon size={18} /> Sign Out of Portal
               </button>
            </Card>
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAV */}
      {!isDesktop && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, width: '100%', background: 'rgba(255, 255, 255, 0.9)', 
          backdropFilter: 'blur(20px)', display: 'flex', justifyContent: 'space-around',
          padding: '12px 0 calc(12px + env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(0,0,0,0.05)', zIndex: 1000
        }}>
          {navItems.map(tab => (
            <div 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, 
                color: activeTab === tab.id ? '#10b981' : '#94a3b8',
                cursor: 'pointer', flex: 1
              }}
            >
              <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              <span style={{ fontSize: '0.65rem', fontWeight: activeTab === tab.id ? 700 : 600 }}>{tab.label}</span>
            </div>
          ))}
        </nav>
      )}

      {/* Modern Picker Sheet Overlay */}
      {pickerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 480, borderRadius: isDesktop ? 32 : '32px 32px 0 0', padding: '24px 24px 40px', maxHeight: '80vh', overflowY: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            {!isDesktop && <div style={{ width: 48, height: 5, background: '#e2e8f0', borderRadius: 3, margin: '0 auto 24px' }} />}
            
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
