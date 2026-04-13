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
  getTeachers, checkTeacherConflict, checkRoomConflict, getSchoolProfile,
  getTimetableRooms, saveTimetableRoom, deleteTimetableRoom,
  getTimetableConfig, saveTimetableConfig,
  getTimetableSlots, saveTimetableSlot, clearTimetableSlot,
  getTeacherTimetable
} from '../../data/store';
import { 
  CalendarIcon, PrintIcon, BookIcon, CheckIcon, CrossIcon, 
  AlertIcon, UserIcon, HomeIcon, TeacherIcon, PlusIcon
} from '../../components/CommonIcons';
import PricingUpgrade from '../../components/PricingUpgrade';

// ── Colour palette for subjects (Modern, Premium Palette) ────────────────

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
    'hsla(250, 84%, 63%, 0.85)', // Indigo
    'hsla(158, 82%, 40%, 0.85)', // Emerald
    'hsla(38, 92%, 50%, 0.85)',  // Amber
    'hsla(341, 89%, 60%, 0.85)', // Rose
    'hsla(199, 89%, 48%, 0.85)', // Sky
    'hsla(271, 91%, 65%, 0.85)', // Violet
    'hsla(11, 90%, 63%, 0.85)',  // Orange/Coral
    'hsla(170, 78%, 45%, 0.85)', // Teal
    'hsla(320, 80%, 60%, 0.85)', // Pink
    'hsla(45, 93%, 47%, 0.85)',  // Yellow/Gold
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
  const [rooms,        setRooms]        = useState([]);
  const [roomPanel,    setRoomPanel]    = useState('list'); // 'list' | 'add'
  const [newRoom,      setNewRoom]      = useState({ name: '', building: '' });

  const [showUpgrade,    setShowUpgrade]   = useState(false);

  // ── Cell edit modal ───────────────────────────────────────────────────
  const [editCell,        setEditCell]        = useState(null);
  const [editSubject,     setEditSubject]      = useState('');
  const [editTeacher,     setEditTeacher]      = useState('');
  const [editRoom,        setEditRoom]         = useState('');
  const [editColor,       setEditColor]        = useState(COLORS[0]);
  const [conflictWarning, setConflictWarning]  = useState(null);
  const [cellSaving,      setCellSaving]       = useState(false);
  const [isDouble,        setIsDouble]         = useState(false);



  // ── UI ────────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true);
  const [message,  setMessage]  = useState(null);

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
    if (!schoolId) return;
    (async () => {
      try {
        const [profile, tList] = await Promise.all([getSchoolProfile(), getTeachers(schoolId)]);
        const cls = profile?.activeClasses || [];
        // Sort classes naturally: PP1, PP2, Grade 1..12, Form 1..4
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
        setTtLabel(profile?.timetable_label || 'Weekly');
        if (sortedCls.length > 0 && !selClass) setSelClass(sortedCls[0]);
      } catch (e) { console.error(e); }
    })();
  }, [schoolId]);

  // ── Load config when period changes (auto-apply template if empty) ───
  useEffect(() => {
    if (!schoolId || !periodId) return;
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
  }, [schoolId, periodId]);



  // ── Load slots for selected class ─────────────────────────────────────
  useEffect(() => {
    if (!schoolId || !periodId || !selClass || view !== 'class') return;
    (async () => {
      try { setLoading(true); setSlots(await getTimetableSlots(schoolId, periodId, selClass, selStream || null)); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [schoolId, periodId, selClass, selStream, view]);

  // ── Load teacher slots ────────────────────────────────────────────────
  useEffect(() => {
    if (!schoolId || !periodId || !selTeacher || view !== 'teacher') return;
    (async () => {
      setLoading(true);
      try { 
        setTeacherSlots(await getTeacherTimetable(schoolId, periodId, selTeacher)); 
      }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [schoolId, periodId, selTeacher, view]);



  // ── Load rooms ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try { setRooms(await getTimetableRooms(schoolId)); }
      catch (e) { console.error(e); }
    })();
  }, [schoolId]);

  const handleSaveRoom = async () => {
    if (!newRoom.name.trim()) return;
    try {
      await saveTimetableRoom(schoolId, newRoom);
      setRooms(await getTimetableRooms(schoolId));
      setNewRoom({ name: '', building: '' });
      setRoomPanel('list');
      setMessage({ type: 'ok', text: 'Room saved successfully.' });
    } catch (e) { setMessage({ type: 'err', text: e.message }); }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm("Delete this room? It will be removed from future allocations.")) return;
    try {
      await deleteTimetableRoom(id);
      setRooms(await getTimetableRooms(schoolId));
      setMessage({ type: 'ok', text: 'Room deleted.' });
    } catch (e) { setMessage({ type: 'err', text: e.message }); }
  };

  // ── Slot lookup helper ────────────────────────────────────────────────
  const slotLookup = useCallback((day, slotIndex, src) => {
    return (src || slots).find(s => s.day_of_week === day && s.slot_index === slotIndex) || null;
  }, [slots]);

  // ── Cell click (grid view) ────────────────────────────────────────────
  const openEdit = (day, slotIndex) => {
    if (!isAdmin || view !== 'class') return;
    const existing = slotLookup(day, slotIndex);
    setEditCell({ day, slotIndex, existing });
    setEditSubject(existing?.subject || '');
    setEditTeacher(existing?.teacher_id || '');
    setEditRoom(existing?.room || '');
    setEditColor(existing?.color || COLORS[0]);
    setIsDouble(existing?.is_double_first || false);
    setConflictWarning(null);
  };

  // ── Real-time conflict checking ───────────────────────────────────────
  useEffect(() => {
    if (!editCell) return;
    const checkConflicts = async () => {
      try {
        // 1. Teacher Conflict
        if (editTeacher) {
          const tClash = await checkTeacherConflict(schoolId, periodId, editTeacher, editCell.day, editCell.slotIndex, selClass, selStream);
          if (tClash) {
            setConflictWarning({ type: 'teacher', ...tClash });
            return;
          }
        }
        // 2. Room Conflict
        if (editRoom) {
          const rClash = await checkRoomConflict(schoolId, periodId, editRoom, editCell.day, editCell.slotIndex, selClass, selStream);
          if (rClash) {
            setConflictWarning({ type: 'room', ...rClash });
            return;
          }
        }
        setConflictWarning(null);
      } catch (e) { console.error("Conflict check failed", e); }
    };
    checkConflicts();
  }, [editTeacher, editRoom, editCell, schoolId, periodId, selClass, selStream]);

  // ── Save cell ─────────────────────────────────────────────────────────
  const handleSaveCell = async () => {
    if (!editCell || !editSubject.trim()) return;
    // Conflict check
    if (editTeacher) {
      try {
        const clash = await checkTeacherConflict(
          schoolId, periodId, editTeacher,
          editCell.day, editCell.slotIndex,
          selClass, selStream || null
        );
        if (clash) { setConflictWarning(clash); return; }
      } catch (e) {
        setMessage({ type:'err', text:'Could not verify teacher schedule.' });
        return;
      }
    }
    setConflictWarning(null);
    setCellSaving(true);
    try {
      let isDoubleSupported = false;
      let nextSlotIndex = null;

      if (isDouble) {
        const sortedTeaching = [...config]
          .sort((a,b) => a.slot_index - b.slot_index)
          .filter(c => !c.is_break);
        
        const curIdx = sortedTeaching.findIndex(c => c.slot_index === editCell.slotIndex);
        if (curIdx !== -1 && curIdx < sortedTeaching.length - 1) {
          nextSlotIndex = sortedTeaching[curIdx + 1].slot_index;
          isDoubleSupported = true;
        } else {
          setMessage({ type:'err', text: 'Cannot place double lesson at the end of the teaching day.' });
          setCellSaving(false);
          return;
        }
      }

      // Save first slot
      await saveTimetableSlot(schoolId, periodId, {
        class_grade : selClass,
        stream      : selStream || null,
        day_of_week : editCell.day,
        slot_index  : editCell.slotIndex,
        subject     : editSubject.trim(),
        teacher_id  : editTeacher || null,
        room        : editRoom.trim() || null,
        color       : editColor,
        is_double_first  : isDoubleSupported,
        is_double_second : false
      });

      // Save second slot if requested
      if (isDoubleSupported && nextSlotIndex !== null) {
        await saveTimetableSlot(schoolId, periodId, {
          class_grade : selClass,
          stream      : selStream || null,
          day_of_week : editCell.day,
          slot_index  : nextSlotIndex,
          subject     : editSubject.trim(),
          teacher_id  : editTeacher || null,
          room        : editRoom.trim() || null,
          color       : editColor,
          is_double_first  : false,
          is_double_second : true
        });
      }

      setSlots(await getTimetableSlots(schoolId, periodId, selClass, selStream || null));
      setEditCell(null);
      setMessage({ type:'ok', text: isDoubleSupported ? 'Double slot saved.' : 'Slot saved.' });
    } catch (e) { setMessage({ type:'err', text: e.message }); }
    finally { setCellSaving(false); }
  };

  // ── Clear cell ────────────────────────────────────────────────────────
  const handleClearCell = async (day, slotIndex, e) => {
    e.stopPropagation();
    if (!isAdmin) return;
    try {
      await clearTimetableSlot(schoolId, periodId, selClass, selStream || null, day, slotIndex);
      setSlots(await getTimetableSlots(schoolId, periodId, selClass, selStream || null));
    } catch (e) { setMessage({ type:'err', text: e.message }); }
  };

  };


  // ── Computed ──────────────────────────────────────────────────────────
  const classStreams    = selClass ? (streams[selClass] || []) : [];
  const activePeriod    = periods.find(p => p.id === periodId);
  const suggestedSubs   = SUBJECT_SUGGESTIONS[getLevel(selClass)] || [];
  const teacherName     = (id) => teachers.find(t => t.id === id)?.name || '';
  const levelBadge      = getLevelBadge(selClass);

  // Grid data source: saved slots
  const activeSlots = view === 'teacher' ? teacherSlots : slots;

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="tt-root">
      <Helmet>
        <title>School Timetable & Scheduling | ShuleSoft — Master Calendar</title>
        <meta name="description" content="Generate automated school timetables, manage teacher workloads, and schedule exams with ease." />
      </Helmet>

      {/* ── Header ── */}
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
          {view === 'class' && (
            <button className="tt-btn" onClick={() => printClassTimetable({
              school: { name: currentUser?.schoolName }, classGrade: selClass,
              stream: selStream, period: activePeriod, config, slots, activeDays
            })}><PrintIcon size={14} /> Print Class</button>
          )}

          {view === 'teacher' && (
            <div style={{ display:'flex', gap:8 }}>
              {selTeacher && (
                <button className="tt-btn" onClick={() => printTeacherTimetable({
                  school: { name: currentUser?.schoolName },
                  teacher: teachers.find(t => t.id === selTeacher),
                  period: activePeriod, config, slots: teacherSlots, activeDays
                })}><PrintIcon size={14} /> Print Personal</button>
              )}
              <button className="tt-btn tt-btn-ghost" onClick={() => printAllTeachersTimetables({
                school: { name: currentUser?.schoolName },
                teachers,
                period: activePeriod,
                config,
                allSlots: slots,
                activeDays
              })}><PrintIcon size={14} /> Print All Teachers</button>
            </div>
          )}
          {/* Period selector always visible */}
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



      {/* ── Toast ── */}
      {message && (
        <div className={`tt-toast ${message.type === 'ok' ? 'tt-toast-ok' : 'tt-toast-err'}`}>
          {message.type === 'ok' ? <CheckIcon size={14} /> : <CrossIcon size={14} />} {message.text}
        </div>
      )}

      {/* ═══════════════ TIMETABLE GRID ═══════════════ */}
      <>

          {/* Controls */}
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

          {/* Grid */}
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
                        {d === todayName && <span style={{ display:'block', fontSize:'.5rem', opacity:.7 }}>Today</span>}
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
                          const dblCls  = isDoubleFirst ? ' double-first' : isDoubleSecond ? ' double-second' : '';

                          return (
                            <td key={d}
                              className={`tt-cell${hasData ? '' : ' empty'}${dblCls}`}
                              onClick={() => openEdit(d, cfg.slot_index)}>
                              {hasData && isAdmin && view === 'class' && (
                                <button className="tt-cell-clear"
                                  onClick={e => handleClearCell(d, cfg.slot_index, e)}><CrossIcon size={12} /></button>
                              )}
                              <div className="tt-cell-inner" style={hasData ? {
                                background: `${bg}22`, border: `1px solid ${bg}55`,
                              } : {}}>
                                {hasData ? (
                                  <>
                                    <div className="tt-cell-subject" style={{ color: bg }}>
                                      {cell.subject}
                                      {isDoubleFirst && <span className="tt-double-badge">×2</span>}
                                    </div>
                                    {isDoubleSecond && <div className="tt-double-cont">↑ continued</div>}
                                    {view === 'class' && (cell.teachers?.name || teacherName(cell.teacher_id)) && !isDoubleSecond && (
                                      <div style={{display:'flex', flexDirection:'column', gap:2}}>
                                        <div className="tt-cell-teacher">
                                          <UserIcon size={12} /> {cell.teachers?.staff_code || teachers.find(t => t.id === cell.teacher_id)?.staff_code || cell.teachers?.name || teacherName(cell.teacher_id)}
                                        </div>
                                        {teachers.find(t => t.id === cell.teacher_id)?.on_leave && (
                                          <div className="tt-leave-warning" style={{fontSize:'0.6rem', background:'var(--warning-light)', color:'var(--warning)', padding:'1px 4px', borderRadius:4, fontWeight:700, display:'inline-flex', alignItems:'center', gap:2}}>
                                            <AlertIcon size={10} /> COVER NEEDED
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {view === 'teacher' && cell.class_grade && (
                                      <div className="tt-cell-class">
                                        {cell.class_grade}{cell.stream ? ` · ${cell.stream}` : ''}
                                      </div>
                                    )}
                                    {cell.room && !isDoubleSecond && (
                                      <div className="tt-cell-room">{cell.room && `Room: ${cell.room}`}</div>
                                    )}
                                  </>
                                ) : (
                                  <div className="tt-add-hint">
                                    {isAdmin && view === 'class' ? '+ Add' : ''}
                                  </div>
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

          {/* Legend */}
          {activeSlots.length > 0 && view === 'class' && (
            <div className="tt-legend">
              {[...new Set(activeSlots.filter(s => s.subject && !s.is_double_second).map(s => s.subject))].map(sub => {
                const s = activeSlots.find(sl => sl.subject === sub);
                return (
                  <div key={sub} className="tt-legend-item">
                    <div className="tt-legend-dot" style={{ background: s?.color || COLORS[0] }} />
                    {sub}{s?.is_double_first || activeSlots.find(sl => sl.subject === sub && sl.is_double_first) ? ' ×2' : ''}
                  </div>
                );
              })}
            </div>
          )}
        </>

      {/* Room Management (inline, below grid) */}
      {isAdmin && (
        <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: 'rgba(0,0,0,.02)', border: '1px solid rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5A6B5C' }}>
              <HomeIcon size={14} /> Rooms / Locations
            </div>
            {roomPanel === 'list' && (
              <button className="tt-btn tt-btn-sm" onClick={() => setRoomPanel('add')}>
                <PlusIcon size={12} /> Add Room
              </button>
            )}
          </div>

          {roomPanel === 'list' && (
            rooms.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', opacity: 0.5, fontSize: '.75rem' }}>
                No rooms registered yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {rooms.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, background: 'white', border: '1px solid rgba(0,0,0,.08)', fontSize: '.72rem' }}>
                    <strong>{r.name}</strong>
                    {r.building && <span style={{ opacity: .6 }}>({r.building})</span>}
                    <button className="tt-btn-icon" style={{ padding: 2, marginLeft: 4 }} onClick={() => handleDeleteRoom(r.id)}>
                      <CrossIcon size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {roomPanel === 'add' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '.6rem', display: 'block', marginBottom: 4 }}>Room Name *</label>
                <input className="tt-field" type="text" placeholder="e.g. Lab 1"
                  value={newRoom.name} onChange={e => setNewRoom({...newRoom, name: e.target.value})}
                  style={{ width: 140 }} />
              </div>
              <div>
                <label style={{ fontSize: '.6rem', display: 'block', marginBottom: 4 }}>Building</label>
                <input className="tt-field" type="text" placeholder="e.g. Science Wing"
                  value={newRoom.building} onChange={e => setNewRoom({...newRoom, building: e.target.value})}
                  style={{ width: 140 }} />
              </div>
              <button className="tt-btn tt-btn-primary tt-btn-sm" disabled={!newRoom.name.trim()} onClick={handleSaveRoom}>Save</button>
              <button className="tt-btn tt-btn-sm" onClick={() => { setRoomPanel('list'); setNewRoom({ name: '', building: '' }); }}>Cancel</button>
            </div>
          )}
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════════════
          CELL EDIT MODAL
         ═══════════════════════════════════════════════════════════════ */}
      {editCell && (
        <div className="tt-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setEditCell(null); setConflictWarning(null); }}}>
          <div className="tt-modal">
            <button className="tt-modal-close" onClick={() => { setEditCell(null); setConflictWarning(null); }}><CrossIcon size={14} /></button>
            <div className="tt-modal-title">
              {editCell.existing?.subject ? 'Edit Slot' : 'Add to Slot'}
            </div>
            <div className="tt-modal-sub">
              {editCell.day} · {config.find(c => c.slot_index === editCell.slotIndex)?.label} · {selClass}{selStream ? ` ${selStream}` : ''}
            </div>

            {/* Subject */}
            <label className="tt-field-label">Subject *</label>
            <input className="tt-field" type="text" placeholder="e.g. Mathematics"
              value={editSubject} onChange={e => setEditSubject(e.target.value)} />
            {suggestedSubs && suggestedSubs.length > 0 && (
              <div className="tt-suggestion-chips" style={{ marginTop:6 }}>
                {suggestedSubs.slice(0, 8).map(s => (
                  <button key={s} className={`tt-chip ${editSubject === s ? 'active' : ''}`}
                    onClick={() => setEditSubject(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Teacher */}
            <label className="tt-field-label">Teacher</label>
            <Select 
              value={editTeacher} 
              onChange={e => { setEditTeacher(e.target.value); setConflictWarning(null); }}
              options={[
                { id: '', label: '— Unassigned —' },
                ...teachers.map(t => ({ id: t.id, label: `${t.name}${t.on_leave ? ' (On Leave 🏖️)' : ''}` }))
              ]}
              style={{ width: '100%' }}
            />

            {/* Conflict warnings */}
            {conflictWarning && (
              <div className="tt-conflict-box" style={{ 
                borderLeft: `4px solid ${conflictWarning.type === 'room' ? '#FFAD5F' : '#E06C75'}`,
                background: conflictWarning.type === 'room' ? 'rgba(255,173,95,0.05)' : 'rgba(224,108,117,0.05)'
              }}>
                <div className="tt-conflict-title" style={{ color: conflictWarning.type === 'room' ? '#CC8A4A' : '#E06C75' }}>
                  <AlertIcon size={16} /> {conflictWarning.type === 'room' ? 'Room Occupied' : 'Teacher Unavailable'}
                </div>
                <div className="tt-conflict-body">
                  {conflictWarning.type === 'room' ? (
                    <>
                      <strong style={{ color: '#5A6B5C' }}>{editRoom}</strong> is currently being used for{' '}
                      <strong>{conflictWarning.subject}</strong> by{' '}
                      <strong>{conflictWarning.class_grade}{conflictWarning.stream ? ` ${conflictWarning.stream}` : ''}</strong>.
                    </>
                  ) : (
                    <>
                      <strong style={{ color: '#5A6B5C' }}>{teacherName(editTeacher)}</strong> is already teaching{' '}
                      <strong>{conflictWarning.subject}</strong> in{' '}
                      <strong>{conflictWarning.class_grade}{conflictWarning.stream ? ` ${conflictWarning.stream}` : ''}</strong>.
                    </>
                  )}
                  <div style={{ marginTop: 4, fontSize: '0.65rem', opacity: 0.8 }}>
                    You can still save if this is intentional (e.g., shared hall).
                  </div>
                </div>
              </div>
            )}

            {/* Leave Warning in Modal */}
            {!conflictWarning && editTeacher && teachers.find(t => t.id === editTeacher)?.on_leave && (
              <div className="tt-conflict-box" style={{borderColor:'var(--warning)', background:'var(--warning-light)'}}>
                <div className="tt-conflict-title" style={{color:'var(--warning)'}}><AlertIcon size={16} /> Teacher On Leave</div>
                <div className="tt-conflict-body" style={{color:'var(--text-main)'}}>
                  <strong style={{ color:'var(--warning)' }}>{teacherName(editTeacher)}</strong> is currently marked as <strong>On Leave</strong>. 
                  Assigning them will require a cover teacher to be placed manually later.
                </div>
              </div>
            )}

            {/* Room */}
            <label className="tt-field-label">Room / Location</label>
            <Select 
              value={editRoom} 
              onChange={e => setEditRoom(e.target.value)}
              options={[
                { id: '', label: '— No Room Assigned —' },
                ...rooms.map(r => ({ id: r.name, label: `${r.name}${r.building ? ` (${r.building})` : ''}` }))
              ]}
              style={{ width: '100%' }}
            />

            {/* Colour */}
            <label className="tt-field-label">Colour</label>
            <div className="tt-color-row">
              {COLORS.map(c => (
                <div key={c} className={`tt-color-dot ${editColor === c ? 'active' : ''}`}
                  style={{ background: c }} onClick={() => setEditColor(c)} />
              ))}
            </div>

            {/* Double Lesson Checkbox */}
            <label className="tt-double-check" style={{ marginTop:16, display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:'.8rem' }}>
              <input type="checkbox" checked={isDouble} onChange={e => setIsDouble(e.target.checked)} />
              Double lesson (consecutive slot handling)
            </label>

            {/* Actions */}
            <div className="tt-modal-actions">
              <button className="tt-btn" style={{ flex:1 }}
                onClick={() => { setEditCell(null); setConflictWarning(null); }}>
                Cancel
              </button>
              <button className="tt-btn tt-btn-primary" style={{ flex:1.4 }}
                disabled={!editSubject.trim() || cellSaving}
                onClick={handleSaveCell}>
                {cellSaving ? 'Saving...' : editCell.existing ? 'Update Slot' : 'Add Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgrade && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999, background: 'rgba(255,255,255,0.95)',
          overflowY: 'auto',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ position: 'absolute', top: 30, right: 30, zIndex: 10001 }}>
            <button className="tt-btn tt-btn-ghost" onClick={() => setShowUpgrade(false)} style={{ fontSize: '1.5rem' }}>&times;</button>
          </div>
          <PricingUpgrade featureName="Timetable" />
        </div>
      )}
    </div>
  );
}
