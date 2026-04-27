/**
 * Timetable/index.jsx — ShuleSoft Timetable Builder
 *
 * Features:
 *  - Constraint-guided manual timetable builder
 *  - Click-to-assign grid with real-time conflict validation
 *  - Double lessons (lab, practical — two consecutive slots)
 *  - CBC Primary, CBC Junior Secondary, CBC Senior Secondary, 8-4-4 support
 *  - Class view + Teacher view + Print
 *
 * Place at: src/pages/Timetable/index.jsx
 *
 * Props: currentUser, currentPeriodId, periods
 * All Supabase calls imported directly from store.js
 */

import { useState, useEffect, useCallback } from 'react';
import './Timetable.css';
import {
  printClassTimetable, 
  printTeacherTimetable, 
  printAllTeachersTimetables
} from '../../utils/timetablePrint';
import Select from '../../components/Common/Select';
import { Helmet } from 'react-helmet-async';
import {
  getTeachers, getSchoolProfile,
  getTimetableConfig, saveTimetableConfig,
  getTimetableSlots, saveTimetableSlot, clearTimetableSlot,
  getTeacherTimetable, clearAllTimetableSlots, duplicateTimetable,
  checkTimetableConflicts, setCurrentSchoolContext, getSubjectsForGrade,
  getClassSubjectAssignments
} from '../../data/store';
import { 
  CalendarIcon, PrintIcon, BookIcon, CheckIcon, CrossIcon, 
  AlertIcon, UserIcon, HomeIcon, TeacherIcon, PlusIcon,
  SettingsIcon, ChevronDownIcon
} from '../../components/CommonIcons';
import FeatureGate from '../../components/FeatureGate';
import { useDialog } from '../../contexts/DialogContext';

import { useFeature } from '../../contexts/FeaturesContext';

// ── Colour palette for subjects (Modern, Premium Palette) ────────────────

const MOE_ABBREVIATIONS = {
  'Mathematics': 'MATH',
  'English': 'ENG',
  'Kiswahili': 'KISW',
  'Biology': 'BIO',
  'Physics': 'PHY',
  'Chemistry': 'CHEM',
  'History & Government': 'HIST',
  'Geography': 'GEO',
  'Christian Religious Education': 'CRE',
  'Islamic Religious Education': 'IRE',
  'Hindu Religious Education': 'HRE',
  'Business Studies': 'BST',
  'Agriculture': 'AGR',
  'Integrated Science': 'SCI',
  'Social Studies': 'SST',
  'Literacy Activities': 'LIT',
  'Mathematical Activities': 'MATH',
  'Environmental Activities': 'ENV',
  'Religious Education': 'R.E',
  'Science & Technology': 'S&T',
  'Agriculture & Nutrition': 'A&N',
  'Creative Arts': 'C.A',
  'Physical Education': 'P.E',
  'Physical and Health Education': 'P.E',
  'Life Skills': 'LSE',
  'ICT': 'ICT',
  'Home Science': 'H.SCI'
};

// ── Subject suggestions by school level ──────────────────────────────────

function getLevel(grade) {
  if (['PP1','PP2'].includes(grade))                                   return 'Early Years';
  if (['Grade 1','Grade 2','Grade 3'].includes(grade))                 return 'Lower Primary';
  if (['Grade 4','Grade 5','Grade 6'].includes(grade))                 return 'Upper Primary';
  if (['Grade 7','Grade 8','Grade 9'].includes(grade))                 return 'Junior Secondary (CBC)';
  if (['Grade 10','Grade 11','Grade 12'].includes(grade))              return 'Senior Secondary (CBC)';
  if (['Form 1','Form 2','Form 3','Form 4'].includes(grade))           return '8-4-4 Form 1–4';
  return 'Upper Primary';
}

function getLevelBadge(grade) {
  const l = getLevel(grade);
  if (l === 'Early Years')              return { cls:'tt-level-early',         label:'Early Years' };
  if (l === 'Lower Primary')            return { cls:'tt-level-cbc-primary',   label:'CBC Primary' };
  if (l === 'Upper Primary')            return { cls:'tt-level-cbc-primary',   label:'CBC Primary' };
  if (l === 'Junior Secondary (CBC)')   return { cls:'tt-level-cbc-secondary', label:'CBC Jr. Sec' };
  if (l === 'Senior Secondary (CBC)')   return { cls:'tt-level-cbc-secondary', label:'CBC Sr. Sec' };
  if (l === '8-4-4 Form 1–4')          return { cls:'tt-level-844',           label:'8-4-4' };
  return { cls:'tt-level-cbc-primary', label:'CBC' };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const ALL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const todayName = ALL_DAYS[new Date().getDay() - 1] || 'Monday';

export default function Timetable({ currentUser, currentPeriodId, periods = [] }) {
  const COLORS = [
    '#6F52E8', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', 
    '#F97316', '#06B6D4', '#EC4899', '#D946EF', '#84CC16', '#EAB308'
  ];

  const DEFAULT_SLOTS = [
    { label:'Assembly',  start_time:'08:00', end_time:'08:20', is_break:true  },
    { label:'Period 1',  start_time:'08:20', end_time:'09:00', is_break:false },
    { label:'Period 2',  start_time:'09:00', end_time:'09:40', is_break:false },
    { label:'Tea Break', start_time:'09:40', end_time:'10:00', is_break:true  },
    { label:'Period 3',  start_time:'10:00', end_time:'10:40', is_break:false },
    { label:'Period 4',  start_time:'10:40', end_time:'11:20', is_break:false },
    { label:'Period 5',  start_time:'11:20', end_time:'12:00', is_break:false },
    { label:'Lunch',     start_time:'12:00', end_time:'12:40', is_break:true  },
    { label:'Period 6',  start_time:'12:40', end_time:'13:20', is_break:false },
    { label:'Period 7',  start_time:'13:20', end_time:'14:00', is_break:false },
    { label:'Period 8',  start_time:'14:00', end_time:'14:40', is_break:false },
  ];

  const SUBJECT_SUGGESTIONS = {
    'Early Years': [
      'English Activities','Kiswahili Activities','Mathematical Activities',
      'Environmental Activities','Psychomotor & Creative Activities','Religious Education','Music',
    ],
    'Lower Primary': [
      'English','Kiswahili','Mathematics','Environmental Activities',
      'Creative Arts','Physical Education','Religious Education',
    ],
    'Upper Primary': [
      'English','Kiswahili','Mathematics','Science & Technology','Social Studies',
      'Creative Arts','Agriculture','Home Science','Physical Education','Religious Education',
    ],
    'Junior Secondary (CBC)': [
      'English','Kiswahili','Mathematics','Integrated Science','Social Studies',
      'Business Studies','Agriculture & Nutrition','Home Science','Pre-Technical Studies',
      'Creative Arts & Sports','Computer Science','Religious Education','Life Skills',
    ],
    'Senior Secondary (CBC)': [
      'English','Kiswahili','Mathematics','Biology','Chemistry','Physics',
      'History & Government','Geography','CRE','IRE','Business Studies',
      'Computer Science','Agriculture','Home Science','Art & Design','Music','PE',
    ],
    '8-4-4 Form 1–4': [
      'English','Kiswahili','Mathematics','Biology','Chemistry','Physics',
      'History & Government','Geography','CRE','IRE','Home Science',
      'Agriculture','Business Studies','Computer Studies','Art & Design',
      'Music','Physical Education','French','German','Arabic',
    ],
  };
  // ── Panel / view ──────────────────────────────────────────────────────
  const [view,   setView]   = useState('class');  // 'class' | 'teacher'
  const [ttLabel, setTtLabel]     = useState('Weekly');

  // ── Period ────────────────────────────────────────────────────────────
  const [periodId, setPeriodId] = useState(currentPeriodId || '');

  // ── School data ───────────────────────────────────────────────────────
  const [classes,    setClasses]    = useState([]);
  const [streams,    setStreams]    = useState({});
  const [teachers,   setTeachers]  = useState([]);
  const [fullProfile, setFullProfile] = useState(null);

  // ── Class selector (grid + req panels) ───────────────────────────────
  const [selClass,  setSelClass]  = useState('');
  const [selStream, setSelStream] = useState('');

  // ── Teacher view ──────────────────────────────────────────────────────
  const [selTeacher,   setSelTeacher]   = useState('');
  const [teacherSlots, setTeacherSlots] = useState([]);

  // ── Config ────────────────────────────────────────────────────────────
  const [config,       setConfig]       = useState([]);
  const [activeDays,   setActiveDays]   = useState(['Monday','Tuesday','Wednesday','Thursday','Friday']);

  // ── Grid slots ────────────────────────────────────────────────────────
  const [slots,        setSlots]        = useState([]);
  const [showConfig,   setShowConfig]   = useState(false);
  const [draftConfig,  setDraftConfig]  = useState([]);
  const [configSaving, setConfigSaving] = useState(false);
  const [bulkLoading,  setBulkLoading]  = useState(false);
  const [showBulk,     setShowBulk]     = useState(false);
  const [classAssignments, setClassAssignments] = useState([]);

  const { alert, confirm } = useDialog();

  // ── Cell edit modal ───────────────────────────────────────────────────
  const [editCell,        setEditCell]        = useState(null);
  const [editSubject,     setEditSubject]      = useState('');
  const [editTeacher,     setEditTeacher]      = useState('');
  const [editColor,       setEditColor]        = useState(COLORS[0]);
  const [conflictWarning, setConflictWarning]  = useState(null);
  const [cellSaving,      setCellSaving]       = useState(false);
  const [isDouble,        setIsDouble]         = useState(false);

  const [loading,  setLoading]  = useState(false);
  const [message,  setMessage]  = useState(null);

  const { enabled: hasAccess, loading: featureLoading } = useFeature('timetable');

  const schoolId = currentUser?.school_id;
  const isAdmin  = currentUser?.role?.toLowerCase() === 'admin';

  // Auto-dismiss toast
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  // ── Load school profile (classes, streams, teachers) ──────────────────
  useEffect(() => {
    if (!schoolId || !hasAccess) return;
    (async () => {
      try {
        setLoading(true);
        setCurrentSchoolContext(schoolId, currentUser);
        
        const [profile, tList] = await Promise.all([getSchoolProfile(), getTeachers(schoolId)]);
        const cls = profile?.activeClasses || [];
        const sortedCls = [...cls].sort((a, b) => {
          const order = ['PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12','Form 1','Form 2','Form 3','Form 4'];
          const ai = order.indexOf(a), bi = order.indexOf(b);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return a.localeCompare(b);
        });
        setClasses(sortedCls);
        setStreams(profile?.streamsPerClass || {});
        setTeachers(tList);
        setFullProfile(profile);
        setTtLabel(profile?.timetable_label || 'Weekly');

        if (sortedCls.length > 0 && !selClass) setSelClass(sortedCls[0]);
      } catch (e) { 
        console.error("Profile load failed", e); 
        setMessage({ type:'err', text:'Failed to load school profile. Please refresh.' });
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId, hasAccess]);

  // ── Load config when period changes ───
  useEffect(() => {
    if (!schoolId || !periodId || !hasAccess) return;
    (async () => {
      try {
        const cfg = await getTimetableConfig(schoolId, periodId);
        const resolved = cfg.length > 0
          ? cfg
          : DEFAULT_SLOTS.map((s, i) => ({ ...s, slot_index: i }));
        setConfig(resolved);
        setDraftConfig(resolved.map(c => ({ ...c })));
      } catch (e) { console.error(e); }
    })();
  }, [schoolId, periodId, hasAccess]);

  // ── Load slots for selected class ─────────────────────────────────────
  useEffect(() => {
    if (!schoolId || !periodId || !selClass || view !== 'class' || !hasAccess) return;
    (async () => {
      try { 
        setLoading(true); 
        const [slotData, assignData] = await Promise.all([
          getTimetableSlots(schoolId, periodId, selClass, selStream || null),
          getClassSubjectAssignments(schoolId, periodId, selClass, selStream || null)
        ]);
        setSlots(slotData); 
        setClassAssignments(assignData);
      }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [schoolId, periodId, selClass, selStream, view, hasAccess]);

  // ── Load teacher slots ────────────────────────────────────────────────
  useEffect(() => {
    if (!schoolId || !periodId || !selTeacher || view !== 'teacher' || !hasAccess) return;
    (async () => {
      setLoading(true);
      try { 
        setTeacherSlots(await getTeacherTimetable(schoolId, periodId, selTeacher)); 
      }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [schoolId, periodId, selTeacher, view, hasAccess]);

  // ── Slot lookup helper ────────────────────────────────────────────────
  const slotLookup = useCallback((day, slotIndex, src) => {
    return (src || slots).find(s => s.day_of_week === day && s.slot_index === slotIndex) || null;
  }, [slots]);

  // ── Real-time conflict checking ───────────────────────────────────────
  useEffect(() => {
    if (!editCell || !hasAccess) return;
    const checkConflicts = async () => {
      try {
        const timeCfg = config.find(c => c.slot_index === editCell.slotIndex);
        if (!timeCfg) return;

        let startTime = timeCfg.start_time;
        let endTime   = timeCfg.end_time;

        if (isDouble) {
          const fullSorted = [...config].sort((a,b) => a.slot_index - b.slot_index);
          const i = fullSorted.findIndex(c => c.slot_index === editCell.slotIndex);
          if (i !== -1 && i < fullSorted.length - 1) {
            if (fullSorted[i+1].is_break) {
              setConflictWarning("Cannot place a double lesson across a break.");
              return;
            } else {
              endTime = fullSorted[i+1].end_time;
            }
          } else {
            setConflictWarning("Cannot place a double lesson at the end of the day.");
            return;
          }
        }

        const clash = await checkTimetableConflicts(schoolId, periodId, {
          day: editCell.day,
          startTime,
          endTime,
          teacherId: editTeacher || null,
          classGrade: selClass,
          stream: selStream || null,
          currentSlotIndex: editCell.slotIndex
        });

        if (clash) {
          setConflictWarning(clash.msg);
        } else {
          setConflictWarning(null);
        }
      } catch (e) { console.error("Conflict check failed", e); }
    };
    checkConflicts();
  }, [editTeacher, isDouble, editCell, schoolId, periodId, selClass, selStream, config, hasAccess]);

  if (featureLoading) return <div className="p-4"><div className="tt-spin" /></div>;
  if (!hasAccess) return <FeatureGate featureName="Timetable Builder" />;

  // ── Cell click (grid view) ────────────────────────────────────────────
  const openEdit = (day, slotIndex) => {
    if (!isAdmin || view !== 'class') return;
    const existing = slotLookup(day, slotIndex);
    setEditCell({ day, slotIndex, existing });
    setEditSubject(existing?.subject || '');
    setEditTeacher(existing?.teacher_id || '');
    setEditColor(existing?.color || COLORS[0]);
    setIsDouble(existing?.is_double_first || false);
    setConflictWarning(null);
  };

  // ── Save cell ─────────────────────────────────────────────────────────
  const handleSaveCell = async () => {
    if (!editCell || !editSubject.trim()) return;
    
    const timeCfg = config.find(c => c.slot_index === editCell.slotIndex);
    if (!timeCfg) return;
    
    let startTime = timeCfg.start_time;
    let endTime   = timeCfg.end_time;
    let nextSlot  = null;

    if (isDouble) {
      const fullSorted = [...config].sort((a,b) => a.slot_index - b.slot_index);
      const i = fullSorted.findIndex(c => c.slot_index === editCell.slotIndex);
      
      if (i !== -1 && i < fullSorted.length - 1) {
        const immediateNext = fullSorted[i+1];
        if (immediateNext.is_break) {
          setConflictWarning('Cannot place a double lesson across a break.');
          return;
        } else {
          nextSlot = immediateNext;
          endTime = nextSlot.end_time;
        }
      } else {
        setConflictWarning('Cannot place double lesson at the end of the day.');
        return;
      }
    }

    try {
      const clash = await checkTimetableConflicts(schoolId, periodId, {
        day: editCell.day,
        startTime,
        endTime,
        teacherId: editTeacher || null,
        classGrade: selClass,
        stream: selStream || null,
        currentSlotIndex: editCell.slotIndex
      });
      if (clash) { 
        setConflictWarning(clash.msg); 
        return; 
      }
    } catch (e) {
      setMessage({ type:'err', text:'Conflict check failed.' });
      return;
    }

    setCellSaving(true);
    try {
      await saveTimetableSlot(schoolId, periodId, {
        class_grade : selClass,
        stream      : selStream || null,
        day_of_week : editCell.day,
        slot_index  : editCell.slotIndex,
        subject     : editSubject.trim(),
        teacher_id  : editTeacher || null,
        color       : editColor,
        is_double_first  : !!nextSlot,
        is_double_second : false,
        start_time  : timeCfg.start_time,
        end_time    : !!nextSlot ? nextSlot.end_time : timeCfg.end_time
      });

      if (nextSlot) {
        await saveTimetableSlot(schoolId, periodId, {
          class_grade : selClass,
          stream      : selStream || null,
          day_of_week : editCell.day,
          slot_index  : nextSlot.slot_index,
          subject     : editSubject.trim(),
          teacher_id  : editTeacher || null,
          color       : editColor,
          is_double_first  : false,
          is_double_second : true,
          start_time  : nextSlot.start_time,
          end_time    : nextSlot.end_time
        });
      } else if (editCell.existing?.is_double_first && !isDouble) {
        const fullSorted = [...config].sort((a,b) => a.slot_index - b.slot_index);
        const fullIdx = fullSorted.findIndex(c => c.slot_index === editCell.slotIndex);
        if (fullIdx !== -1 && fullIdx < fullSorted.length - 1) {
          const orphanedNext = fullSorted[fullIdx + 1];
          await clearTimetableSlot(schoolId, periodId, selClass, selStream || '', editCell.day, orphanedNext.slot_index);
        }
      }

      setSlots(await getTimetableSlots(schoolId, periodId, selClass, selStream || null));
      setEditCell(null);
      setMessage({ type:'ok', text: nextSlot ? 'Double slot saved.' : 'Slot saved.' });

    } catch (e) { setMessage({ type:'err', text: e.message }); }
    finally { setCellSaving(false); }
  };

  // ── Clear cell ────────────────────────────────────────────────────────
  const handleClearCell = async (day, slotIndex, e) => {
    e?.stopPropagation();
    if (!isAdmin) return;
    
    const existing = slotLookup(day, slotIndex, slots);

    try {
      await clearTimetableSlot(schoolId, periodId, selClass, selStream || '', day, slotIndex);
      
      if (existing?.is_double_first) {
        const fullSorted = [...config].sort((a,b) => a.slot_index - b.slot_index);
        const fullIdx = fullSorted.findIndex(c => c.slot_index === slotIndex);
        if (fullIdx !== -1 && fullIdx < fullSorted.length - 1) {
          const nextSlot = fullSorted[fullIdx + 1];
          await clearTimetableSlot(schoolId, periodId, selClass, selStream || '', day, nextSlot.slot_index);
        }
      }
      
      setSlots(await getTimetableSlots(schoolId, periodId, selClass, selStream || ''));
      setEditCell(null);
    } catch (e) { setMessage({ type:'err', text: e.message }); }
  };

  // ── Computed ──────────────────────────────────────────────────────────
  const classStreams    = selClass ? (streams[selClass] || []) : [];
  const activePeriod    = periods.find(p => p.id === periodId);
  const suggestedSubs   = getSubjectsForGrade(selClass, fullProfile);
  const teacherName     = (id) => teachers.find(t => t.id === id)?.name || '';
  const levelBadge      = getLevelBadge(selClass);
  const activeSlots     = view === 'teacher' ? teacherSlots : slots;

  return (
    <div className="tt-root">
      <Helmet>
        <title>School Timetable & Scheduling | ShuleSoft — Master Calendar</title>
        <meta name="description" content="Generate custom school timetables and manage teacher workloads with flexible time slots." />
      </Helmet>

      <div className="tt-header">
        <div className="tt-title-group">
          <div className="tt-icon"><CalendarIcon size={24} /></div>
          <div>
            <div className="tt-title">Timetable</div>
            <div className="tt-sub">
              {selClass || '—'}
              {selClass && <span className={`tt-level-badge ${levelBadge.cls}`}>{levelBadge.label}</span>}
              {ttLabel !== 'Weekly' && <span className="tt-mode-badge">{ttLabel.toUpperCase()}</span>}
            </div>
          </div>
        </div>

        <div className="tt-header-actions">
          {isAdmin && (
            <button className="tt-btn tt-btn-primary" onClick={() => { setDraftConfig(config.map(c => ({...c}))); setShowConfig(true); }}>
              <SettingsIcon size={14} /> Set Up Day Structure
            </button>
          )}

          {view === 'class' && (
            <button className="tt-btn" onClick={async () => await printClassTimetable({
              school: { name: currentUser?.schoolName }, classGrade: selClass,
              stream: selStream, period: activePeriod, config, slots, activeDays
            })}><PrintIcon size={14} /> Print Class</button>
          )}

          {view === 'teacher' && (
            <button className="tt-btn" onClick={async () => await printTeacherTimetable({
              school: { name: currentUser?.schoolName }, 
              teacher: teachers.find(t => t.id === selTeacher),
              period: activePeriod, config, slots: activeSlots, activeDays
            })}><PrintIcon size={14} /> Print Timetable</button>
          )}

          <Select 
            value={periodId} 
            onChange={e => setPeriodId(e.target.value)}
            options={periods.map(p => ({ 
              id: p.id, 
              label: `${p.year} — ${p.term}${p.is_active ? ' (Active)' : ''}` 
            }))}
            style={{ minWidth: 180 }}
          />
        </div>
      </div>

      {message && (
        <div className={`tt-toast ${message.type === 'ok' ? 'tt-toast-ok' : 'tt-toast-err'}`}>
          {message.type === 'ok' ? <CheckIcon size={14} /> : <CrossIcon size={14} />} {message.text}
        </div>
      )}

      <div className="tt-controls">
        <div className="tt-view-toggle">
          <button className={`tt-view-btn ${view === 'class' ? 'active' : ''}`}   onClick={() => setView('class')}><BookIcon size={14} /> Class</button>
          <button className={`tt-view-btn ${view === 'teacher' ? 'active' : ''}`} onClick={() => setView('teacher')}><TeacherIcon size={14} /> Teacher</button>
        </div>
        <div className="tt-divider" />
        {view === 'class' && (
          <>
            <Select 
              value={selClass} 
              onChange={e => { setSelClass(e.target.value); setSelStream(''); }}
              options={classes.map(c => ({ id: c, label: c }))}
              style={{ minWidth: 120 }}
            />
            {classStreams.length > 0 && (
              <Select 
                value={selStream} 
                onChange={e => setSelStream(e.target.value)}
                options={[
                  { id: '', label: 'All Streams' },
                  ...classStreams.map(s => ({ id: s, label: s }))
                ]}
                style={{ minWidth: 120 }}
              />
            )}
          </>
        )}
        {view === 'teacher' && (
          <Select 
            value={selTeacher} 
            onChange={e => setSelTeacher(e.target.value)}
            options={teachers.map(t => ({ id: t.id, label: t.name }))}
            placeholder="Select Teacher"
            style={{ minWidth: 180 }}
          />
        )}
      </div>

      {loading ? (
        <div style={{ padding:48, textAlign:'center' }}>
          <div className="tt-spin" />
          <div style={{ fontSize:'.78rem', color:'#5A6B5C' }}>Loading timetable...</div>
        </div>
      ) : (
        <div className="tt-grid-wrap">
          <table className="tt-grid">
            <thead>
              <tr>
                <th style={{ textAlign:'left', paddingLeft:12 }}>Time</th>
                {activeDays.map(d => (
                  <th key={d} className={d === todayName ? 'tt-day-today' : ''}>
                    {d.slice(0, 3).toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...config].sort((a, b) => a.slot_index - b.slot_index).map((cfg, ci) => {
                if (cfg.is_break) {
                  return (
                    <tr key={ci} className="tt-break-row">
                      <td className="tt-time-cell">
                        <div className="tt-time-range">{cfg.start_time}–{cfg.end_time}</div>
                      </td>
                      {activeDays.map(d => (
                        <td key={d}><span className="tt-break-label">{cfg.label}</span></td>
                      ))}
                    </tr>
                  );
                }
                return (
                  <tr key={ci}>
                    <td className="tt-time-cell">
                      <div className="tt-time-label">{cfg.label}</div>
                      <div className="tt-time-range">{cfg.start_time}–{cfg.end_time}</div>
                    </td>
                    {activeDays.map(d => {
                      const cell    = slotLookup(d, cfg.slot_index, activeSlots);
                      const hasData = !!(cell?.subject);
                      const bg      = hasData ? (cell.color || COLORS[0]) : null;
                      const isDoubleFirst  = cell?.is_double_first;
                      const isDoubleSecond = cell?.is_double_second;
                      
                      if (isDoubleSecond) return null;

                      return (
                        <td key={d}
                          rowSpan={isDoubleFirst ? 2 : 1}
                          className={`tt-cell${hasData ? '' : ' empty'}${isDoubleFirst ? ' double-first' : ''}`}
                          onClick={() => openEdit(d, cfg.slot_index)}>
                          <div className="tt-cell-inner" style={hasData ? {
                            background: `${bg}22`, border: `1px solid ${bg}55`, minHeight: isDoubleFirst ? '120px' : 'auto'
                          } : {}}>
                            {hasData && (
                              <>
                                <div className="tt-cell-subject" style={{ color: bg }}>
                                  {MOE_ABBREVIATIONS[cell.subject] || cell.subject}
                                </div>
                                {view === 'class' && (
                                  <div className="tt-cell-teacher" style={{ color: bg, opacity: 0.8 }}>
                                    {teacherName(cell.teacher_id)}
                                  </div>
                                )}
                                {view === 'teacher' && cell.class_grade && (
                                  <div className="tt-cell-class" style={{ color: bg, opacity: 0.8 }}>
                                    {cell.class_grade}{cell.stream ? ` · ${cell.stream}` : ''}
                                  </div>
                                )}
                              </>
                            )}
                            {!hasData && isAdmin && view === 'class' && (
                              <div className="tt-add-hint">+ Add</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editCell && (
        <div className="modal-overlay" onClick={() => setEditCell(null)}>
          <div className="modal tt-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editCell.existing ? 'Edit Lesson' : 'Add Lesson'}</h3>
              <button className="modal-close" onClick={() => setEditCell(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Subject</label>
                <input list="subjects" className="form-input" value={editSubject} onChange={e => setEditSubject(e.target.value)} />
                <datalist id="subjects">
                  {suggestedSubs.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label>Teacher</label>
                <Select value={editTeacher} onChange={e => setEditTeacher(e.target.value)} options={teachers.map(t => ({ id: t.id, label: t.name }))} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={isDouble} onChange={e => setIsDouble(e.target.checked)} />
                  Double Lesson (2 slots)
                </label>
              </div>
              {conflictWarning && (
                <div className="tt-warning" style={{ background: '#FFF7ED', color: '#C2410C', padding: 12, borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>
                  <AlertIcon size={14} /> {conflictWarning}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {editCell.existing && (
                <button className="btn btn-danger btn-ghost" onClick={e => handleClearCell(editCell.day, editCell.slotIndex, e)}>Clear Slot</button>
              )}
              <button className="btn btn-primary" onClick={handleSaveCell} disabled={cellSaving}>
                {cellSaving ? 'Saving...' : 'Save Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfig && (
        <div className="modal-overlay" onClick={() => setShowConfig(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Day Structure</h3>
              <button className="modal-close" onClick={() => setShowConfig(false)}>×</button>
            </div>
            <div className="modal-body">
              {draftConfig.map((c, i) => (
                <div key={i} className="tt-config-row" style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <input className="form-input" style={{ flex: 2 }} value={c.label} onChange={e => {
                    const next = [...draftConfig];
                    next[i].label = e.target.value;
                    setDraftConfig(next);
                  }} />
                  <input type="time" className="form-input" value={c.start_time} onChange={e => {
                    const next = [...draftConfig];
                    next[i].start_time = e.target.value;
                    setDraftConfig(next);
                  }} />
                  <input type="time" className="form-input" value={c.end_time} onChange={e => {
                    const next = [...draftConfig];
                    next[i].end_time = e.target.value;
                    setDraftConfig(next);
                  }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                    <input type="checkbox" checked={c.is_break} onChange={e => {
                      const next = [...draftConfig];
                      next[i].is_break = e.target.checked;
                      setDraftConfig(next);
                    }} /> Break
                  </label>
                </div>
              ))}
              <button className="btn btn-ghost" onClick={() => setDraftConfig([...draftConfig, { label: 'New Period', start_time: '14:40', end_time: '15:20', is_break: false, slot_index: draftConfig.length }])}>
                + Add Slot
              </button>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={async () => {
                setConfigSaving(true);
                try {
                  await saveTimetableConfig(schoolId, periodId, draftConfig);
                  setConfig(draftConfig);
                  setShowConfig(false);
                } catch (e) { console.error(e); }
                finally { setConfigSaving(false); }
              }} disabled={configSaving}>
                {configSaving ? 'Saving...' : 'Save Structure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
