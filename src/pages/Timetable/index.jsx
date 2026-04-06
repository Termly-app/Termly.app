/**
 * Timetable/index.jsx — ShuleSoft Timetable Builder
 *
 * Features:
 *  - Three panels: Grid · Requirements · Slot Config
 *  - Auto-generation with no teacher or class overlaps
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
import { printClassTimetable, printTeacherTimetable } from '../../utils/timetablePrint';
import {
  getTimetableConfig, saveTimetableConfig,
  getTimetableSlots, saveTimetableSlot, clearTimetableSlot,
  getTeacherTimetable, clearAndSaveTimetable,
  getRequirements, getAllRequirements, saveRequirement, deleteRequirement,
  getClassSubjectAssignments, getTeachers, checkTeacherConflict, getSchoolProfile,
} from '../../data/store';
import { 
  CalendarIcon, PrintIcon, BookIcon, SettingsIcon, CheckIcon, CrossIcon, 
  RocketIcon, SaveIcon, AlertIcon, UserIcon, HomeIcon, TeacherIcon, PlusIcon
} from '../../components/CommonIcons';

// ── Colour palette for subjects (Modern, Premium Palette) ────────────────
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

const ALL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const DEFAULT_SLOTS = [
  { label:'Assembly',  start_time:'07:50', end_time:'08:00', is_break:true  },
  { label:'Period 1',  start_time:'08:00', end_time:'08:40', is_break:false },
  { label:'Period 2',  start_time:'08:40', end_time:'09:20', is_break:false },
  { label:'Period 3',  start_time:'09:20', end_time:'10:00', is_break:false },
  { label:'Break',     start_time:'10:00', end_time:'10:20', is_break:true  },
  { label:'Period 4',  start_time:'10:20', end_time:'11:00', is_break:false },
  { label:'Period 5',  start_time:'11:00', end_time:'11:40', is_break:false },
  { label:'Period 6',  start_time:'11:40', end_time:'12:20', is_break:false },
  { label:'Lunch',     start_time:'12:20', end_time:'13:00', is_break:true  },
  { label:'Period 7',  start_time:'13:00', end_time:'13:40', is_break:false },
  { label:'Period 8',  start_time:'13:40', end_time:'14:20', is_break:false },
];

// ── Subject suggestions by school level ──────────────────────────────────
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
// AUTO-GENERATE ALGORITHM
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Generates a complete school timetable from requirements.
 * Guarantees:
 *   - No teacher teaches two classes at the same time
 *   - No class has two subjects at the same time
 *   - Same subject not repeated on the same day (when avoidable)
 *   - Double lessons placed as two consecutive non-break slots
 *
 * @param {Array}  config       — time slot config [{slot_index, is_break, ...}]
 * @param {Array}  requirements — all lesson requirements for all classes
 * @param {Array}  activeDays   — ['Monday','Tuesday',...]
 * @param {Number} maxPerDay    — maximum lessons of any subject per day (for exams)
 * @returns {{ slots: Array, unplaced: Array }}
 */
function generateTimetable(config, requirements, activeDays, maxPerDay = 999) {
  const sorted = [...config].sort((a, b) => a.slot_index - b.slot_index);
  const teachingSlots = sorted.filter(c => !c.is_break);

  // Map slot_index → next CONSECUTIVE teaching slot_index (no break between them)
  const consecutiveNext = {};
  for (let i = 0; i < teachingSlots.length - 1; i++) {
    const curr = teachingSlots[i];
    const next = teachingSlots[i + 1];
    // Find positions in full sorted config
    const currPos = sorted.findIndex(c => c.slot_index === curr.slot_index);
    const nextPos = sorted.findIndex(c => c.slot_index === next.slot_index);
    // Check nothing between them is a break
    const between = sorted.slice(currPos + 1, nextPos);
    if (!between.some(c => c.is_break)) {
      consecutiveNext[curr.slot_index] = next.slot_index;
    }
  }

  // State maps
  const placed      = {};  // `${cls}::${day}::${slot}` → slot data
  const teacherBusy = {};  // `${teacherId}::${day}::${slot}` → true
  const dayLoad     = {};  // `${cls}::${day}` → count (spread days evenly)
  const daySubject  = {};  // `${cls}::${day}::${subject}` → count (avoid same subject twice/day)

  const clsKey  = r  => `${r.class_grade}::${r.stream || ''}`;
  const gridKey = (cls, day, slot) => `${cls}::${day}::${slot}`;
  const tKey    = (tid, day, slot) => `${tid}::${day}::${slot}`;
  const dKey    = (cls, day)       => `${cls}::${day}`;
  const dsKey   = (cls, day, sub)  => `${cls}::${day}::${sub}`;

  // Group requirements by class
  const byClass = {};
  for (const req of requirements) {
    const k = clsKey(req);
    if (!byClass[k]) byClass[k] = [];
    byClass[k].push(req);
  }

  const unplaced = [];

  // Fisher-Yates shuffle for day/slot variety
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  for (const [clsK, reqs] of Object.entries(byClass)) {
    // Build lesson list
    const lessons = [];
    for (const req of reqs) {
      let rem = req.periods_per_week || 1;
      // Place one double lesson first if requested
      if (req.allow_double && rem >= 2) {
        lessons.push({ ...req, _double: true });
        rem -= 2;
      }
      for (let i = 0; i < rem; i++) {
        lessons.push({ ...req, _double: false });
      }
    }

    // Sort: doubles first (hardest to place), then most-periods-per-week
    lessons.sort((a, b) => {
      if (a._double !== b._double) return a._double ? -1 : 1;
      return (b.periods_per_week || 1) - (a.periods_per_week || 1);
    });

    for (const lesson of lessons) {
      let placed_ = false;

      // Sort days: prefer less-loaded days, prefer days without this subject already
      const sortedDays = [...activeDays].sort((a, b) => {
        const loadDiff = (dayLoad[dKey(clsK, a)] || 0) - (dayLoad[dKey(clsK, b)] || 0);
        if (loadDiff !== 0) return loadDiff;
        const subA = daySubject[dsKey(clsK, a, lesson.subject)] || 0;
        const subB = daySubject[dsKey(clsK, b, lesson.subject)] || 0;
        return subA - subB;
      });

      outer: for (const day of sortedDays) {
        for (const slotCfg of teachingSlots) {
          const si  = slotCfg.slot_index;
          const gk  = gridKey(clsK, day, si);
          const tk  = lesson.teacher_id ? tKey(lesson.teacher_id, day, si) : null;

          if (placed[gk])           continue; // class busy
          if (tk && teacherBusy[tk]) continue; // teacher busy

          // Enforce max exams/lessons per day for this class
          if ((dayLoad[dKey(clsK, day)] || 0) >= maxPerDay) continue;

          if (lesson._double) {
            // Need next consecutive slot too
            const nextSi = consecutiveNext[si];
            if (nextSi === undefined) continue;

            const gk2 = gridKey(clsK, day, nextSi);
            const tk2 = lesson.teacher_id ? tKey(lesson.teacher_id, day, nextSi) : null;

            if (placed[gk2])            continue;
            if (tk2 && teacherBusy[tk2]) continue;

            // Place double
            placed[gk]  = { ...lesson, day_of_week:day, slot_index:si,     is_double_first:true,  is_double_second:false };
            placed[gk2] = { ...lesson, day_of_week:day, slot_index:nextSi, is_double_first:false, is_double_second:true  };
            if (tk)  teacherBusy[tk]  = true;
            if (tk2) teacherBusy[tk2] = true;
            dayLoad[dKey(clsK, day)]              = (dayLoad[dKey(clsK, day)] || 0) + 2;
            daySubject[dsKey(clsK, day, lesson.subject)] = (daySubject[dsKey(clsK, day, lesson.subject)] || 0) + 1;
          } else {
            placed[gk] = { ...lesson, day_of_week:day, slot_index:si, is_double_first:false, is_double_second:false };
            if (tk) teacherBusy[tk] = true;
            dayLoad[dKey(clsK, day)]              = (dayLoad[dKey(clsK, day)] || 0) + 1;
            daySubject[dsKey(clsK, day, lesson.subject)] = (daySubject[dsKey(clsK, day, lesson.subject)] || 0) + 1;
          }

          placed_ = true;
          break outer;
        }
      }

      if (!placed_) unplaced.push(lesson);
    }
  }

  // Convert to slot rows
  const slots = Object.values(placed).map(s => ({
    class_grade      : s.class_grade,
    stream           : s.stream           || null,
    day_of_week      : s.day_of_week,
    slot_index       : s.slot_index,
    subject          : s.subject,
    teacher_id       : s.teacher_id       || null,
    room             : s.room             || null,
    color            : s.color            || null,
    is_double_first  : s.is_double_first  || false,
    is_double_second : s.is_double_second || false,
  }));

  return { slots, unplaced };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const todayName = ALL_DAYS[new Date().getDay() - 1] || 'Monday';

export default function Timetable({ currentUser, currentPeriodId, periods = [] }) {
  // ── Panel / view ──────────────────────────────────────────────────────
  const [panel,  setPanel]  = useState('grid');   // 'grid' | 'req' | 'config'
  const [view,   setView]   = useState('class');  // 'class' | 'teacher'
  const [mode,   setMode]   = useState('weekly'); // 'weekly' | 'CAT 1' | 'End Term' etc.
  const [examTypes, setExamTypes] = useState([]); // from profile

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
  const [draftConfig,  setDraftConfig]  = useState([]);
  const [activeDays,   setActiveDays]   = useState(['Monday','Tuesday','Wednesday','Thursday','Friday']);
  const [configSaving, setConfigSaving] = useState(false);

  // ── Grid slots ────────────────────────────────────────────────────────
  const [slots,        setSlots]        = useState([]);

  // ── Requirements ─────────────────────────────────────────────────────
  const [reqs,         setReqs]         = useState([]);   // for selected class
  const [allReqs,      setAllReqs]      = useState([]);   // for generator
  const [reqSubject,   setReqSubject]   = useState('');
  const [reqTeacher,   setReqTeacher]   = useState('');
  const [reqPerWeek,   setReqPerWeek]   = useState(1);
  const [reqDouble,    setReqDouble]    = useState(false);
  const [reqColor,     setReqColor]     = useState(COLORS[0]);
  const [addingReq,    setAddingReq]    = useState(false);
  const [reqSaving,    setReqSaving]    = useState(false);

  // ── Auto-generate ─────────────────────────────────────────────────────
  const [preview,      setPreview]      = useState(null); // { slots, unplaced } or null
  const [generating,   setGenerating]   = useState(false);
  const [savingGen,    setSavingGen]    = useState(false);
  const [maxExamsPerDay, setMaxExamsPerDay] = useState(2); 

  // ── Cell edit modal ───────────────────────────────────────────────────
  const [editCell,        setEditCell]        = useState(null);
  const [editSubject,     setEditSubject]      = useState('');
  const [editTeacher,     setEditTeacher]      = useState('');
  const [editRoom,        setEditRoom]         = useState('');
  const [editColor,       setEditColor]        = useState(COLORS[0]);
  const [conflictWarning, setConflictWarning]  = useState(null);
  const [cellSaving,      setCellSaving]       = useState(false);

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
        setClasses(cls);
        setStreams(profile?.streamsPerClass || {});
        setTeachers(tList);
        setExamTypes(profile?.custom_exams || ['CAT 1', 'CAT 2', 'Mid Term', 'End Term']);
        if (cls.length > 0 && !selClass) setSelClass(cls[0]);
      } catch (e) { console.error(e); }
    })();
  }, [schoolId]);

  // ── Load config when period changes ───────────────────────────────────
  useEffect(() => {
    if (!schoolId || !periodId) return;
    (async () => {
      try {
        const cfg = await getTimetableConfig(schoolId, periodId, mode);
        const resolved = cfg.length > 0
          ? cfg
          : DEFAULT_SLOTS.map((s, i) => ({ ...s, slot_index: i }));
        setConfig(resolved);
        setDraftConfig(resolved.map(c => ({ ...c })));
      } catch (e) { console.error(e); }
    })();
  }, [schoolId, periodId, mode]);

  // ── Load slots for selected class ─────────────────────────────────────
  useEffect(() => {
    if (!schoolId || !periodId || !selClass || panel !== 'grid' || view !== 'class') return;
    (async () => {
      setLoading(true);
      try {
        const data = await getTimetableSlots(schoolId, periodId, selClass, selStream || null, mode);
        setSlots(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [schoolId, periodId, selClass, selStream, panel, view, mode]);

  // ── Load teacher slots ────────────────────────────────────────────────
  useEffect(() => {
    if (!schoolId || !periodId || !selTeacher || view !== 'teacher') return;
    (async () => {
      setLoading(true);
      try { 
        setTeacherSlots(await getTeacherTimetable(schoolId, periodId, selTeacher, mode)); 
      }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [schoolId, periodId, selTeacher, view, mode]);

  // ── Load requirements for selected class ──────────────────────────────
  useEffect(() => {
    if (!schoolId || !periodId || !selClass || panel !== 'req') return;
    (async () => {
      try {
        const data = await getRequirements(schoolId, periodId, selClass, selStream || undefined, mode);
        setReqs(data);
      } catch (e) { console.error(e); }
    })();
  }, [schoolId, periodId, selClass, selStream, panel, mode]);

  // ── Slot lookup helper ────────────────────────────────────────────────
  const slotLookup = useCallback((day, slotIndex, src) => {
    return (src || slots).find(s => s.day_of_week === day && s.slot_index === slotIndex) || null;
  }, [slots]);

  // ── Cell click (grid view) ────────────────────────────────────────────
  const openEdit = (day, slotIndex) => {
    if (!isAdmin || view !== 'class') return;
    // In preview mode, don't allow manual edits
    if (preview) { setMessage({ type:'err', text:'Discard or save the preview first.' }); return; }
    const existing = slotLookup(day, slotIndex);
    setEditCell({ day, slotIndex, existing });
    setEditSubject(existing?.subject || '');
    setEditTeacher(existing?.teacher_id || '');
    setEditRoom(existing?.room || '');
    setEditColor(existing?.color || COLORS[0]);
    setConflictWarning(null);
  };

  // ── Save cell ─────────────────────────────────────────────────────────
  const handleSaveCell = async () => {
    if (!editCell || !editSubject.trim()) return;
    // Conflict check
    if (editTeacher) {
      try {
        const clash = await checkTeacherConflict(
          schoolId, periodId, editTeacher,
          editCell.day, editCell.slotIndex,
          selClass, selStream || null,
          mode
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
      await saveTimetableSlot(schoolId, periodId, {
        class_grade : selClass,
        stream      : selStream || null,
        day_of_week : editCell.day,
        slot_index  : editCell.slotIndex,
        subject     : editSubject.trim(),
        teacher_id  : editTeacher || null,
        room        : editRoom.trim() || null,
        color       : editColor,
        is_double_first  : false,
        is_double_second : false,
        type: mode,
      });
      setSlots(await getTimetableSlots(schoolId, periodId, selClass, selStream || null, mode));
      setEditCell(null);
      setMessage({ type:'ok', text:'Slot saved.' });
    } catch (e) { setMessage({ type:'err', text: e.message }); }
    finally { setCellSaving(false); }
  };

  // ── Clear cell ────────────────────────────────────────────────────────
  const handleClearCell = async (day, slotIndex, e) => {
    e.stopPropagation();
    if (!isAdmin || preview) return;
    try {
      await clearTimetableSlot(schoolId, periodId, selClass, selStream || null, day, slotIndex, mode);
      setSlots(await getTimetableSlots(schoolId, periodId, selClass, selStream || null, mode));
    } catch (e) { setMessage({ type:'err', text: e.message }); }
  };

  // ── Save config ───────────────────────────────────────────────────────
  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      await saveTimetableConfig(schoolId, periodId, draftConfig, mode);
      setConfig(draftConfig.map((s, i) => ({ ...s, slot_index: i })));
      setMessage({ type:'ok', text:'Time slot configuration saved.' });
      setPanel('grid');
    } catch (e) { setMessage({ type:'err', text: e.message }); }
    finally { setConfigSaving(false); }
  };

  const addDraftSlot = () => setDraftConfig(p => [...p, {
    label:'Period', start_time:'14:00', end_time:'14:40', is_break:false,
  }]);
  const updateDraft = (i, f, v) => setDraftConfig(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  const removeDraft = (i) => setDraftConfig(p => p.filter((_, idx) => idx !== i));

  // ── Save requirement ──────────────────────────────────────────────────
  const handleSaveReq = async () => {
    if (!reqSubject.trim()) return;
    setReqSaving(true);
    try {
      await saveRequirement(schoolId, periodId, {
        class_grade      : selClass,
        stream           : selStream || null,
        subject          : reqSubject.trim(),
        teacher_id       : reqTeacher || null,
        periods_per_week : Number(reqPerWeek) || 1,
        allow_double     : reqDouble,
        color            : reqColor,
        type             : mode,
      });
      const updated = await getRequirements(schoolId, periodId, selClass, selStream || undefined, mode);
      setReqs(updated);
      setReqSubject(''); setReqTeacher(''); setReqPerWeek(1); setReqDouble(false);
      setReqColor(COLORS[updated.length % COLORS.length]);
      setAddingReq(false);
      setMessage({ type:'ok', text:'Requirement saved.' });
    } catch (e) { setMessage({ type:'err', text: e.message }); }
    finally { setReqSaving(false); }
  };

  const handleDeleteReq = async (subject) => {
    try {
      await deleteRequirement(schoolId, periodId, selClass, selStream || null, subject, mode);
      setReqs(p => p.filter(r => r.subject !== subject));
    } catch (e) { setMessage({ type:'err', text: e.message }); }
  };

  // ── Auto-import from subject_assignments ──────────────────────────────
  const handleAutoImport = async () => {
    try {
      const assignments = await getClassSubjectAssignments(schoolId, periodId, selClass, selStream || null);
      if (assignments.length === 0) {
        setMessage({ type:'err', text:'No subject assignments found for this class.' });
        return;
      }
      let count = 0;
      for (const a of assignments) {
        if (reqs.some(r => r.subject === a.subject)) continue;
        await saveRequirement(schoolId, periodId, {
          class_grade      : selClass,
          stream           : selStream || null,
          subject          : a.subject,
          teacher_id       : a.teacher_id || null,
          periods_per_week : 5,
          allow_double     : false,
          color            : COLORS[count % COLORS.length],
          type             : mode,
        });
        count++;
      }
      setReqs(await getRequirements(schoolId, periodId, selClass, selStream || undefined, mode));
      setMessage({ type:'ok', text:`Imported ${count} subject${count !== 1 ? 's' : ''}.` });
    } catch (e) { setMessage({ type:'err', text: e.message }); }
  };

  // ── Generate timetable ────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (config.length === 0) {
      setMessage({ type:'err', text:'Configure time slots first.' });
      return;
    }
    setGenerating(true);
    try {
      // Load all requirements across all classes for THIS mode
      const all = await getAllRequirements(schoolId, periodId, mode);
      setAllReqs(all);

      if (all.length === 0) {
        setMessage({ type:'err', text:'No requirements found. Add lesson requirements first.' });
        return;
      }

      const configSorted = [...config].sort((a, b) => a.slot_index - b.slot_index);
      const limitPerDay = (mode === 'weekly') ? 999 : (maxExamsPerDay || 2);
      const result = generateTimetable(configSorted, all, activeDays, limitPerDay);

      setPreview(result);
      setPanel('grid');
      if (result.unplaced.length > 0) {
        setMessage({ type:'err', text: `Generated with ${result.unplaced.length} unplaced lesson(s). See warnings below.` });
      } else {
        setMessage({ type:'ok', text: `Generated ${result.slots.length} slots with no conflicts. Review and save.` });
      }
    } catch (e) { setMessage({ type:'err', text: e.message }); }
    finally { setGenerating(false); }
  };

  // ── Save generated timetable ──────────────────────────────────────────
  const handleSaveGenerated = async () => {
    if (!preview) return;
    setSavingGen(true);
    try {
      const classGrades = [...new Set(preview.slots.map(s => s.class_grade))];
      await clearAndSaveTimetable(schoolId, periodId, preview.slots, classGrades, mode);
      // Reload current class view
      const updated = await getTimetableSlots(schoolId, periodId, selClass, selStream || null, mode);
      setSlots(updated);
      setPreview(null);
      setMessage({ type:'ok', text: `Timetable saved for all classes in ${mode} mode!` });
    } catch (e) { setMessage({ type:'err', text: e.message }); }
    finally { setSavingGen(false); }
  };

  // ── Computed ──────────────────────────────────────────────────────────
  const classStreams    = selClass ? (streams[selClass] || []) : [];
  const activePeriod    = periods.find(p => p.id === periodId);
  const suggestedSubs   = SUBJECT_SUGGESTIONS[getLevel(selClass)] || [];
  const existingSubjects= reqs.map(r => r.subject);
  const teacherName     = (id) => teachers.find(t => t.id === id)?.name || '';
  const levelBadge      = getLevelBadge(selClass);

  // Grid data source: preview slots or saved slots
  const activeSlots = preview
    ? preview.slots.filter(s => s.class_grade === selClass && (s.stream || null) === (selStream || null))
    : (view === 'teacher' ? teacherSlots : slots);

  // Weekly slot capacity info
  const teachingSlotCount = config.filter(c => !c.is_break).length;
  const weeklyCapacity    = teachingSlotCount * activeDays.length;
  const weeklyRequired    = reqs.reduce((s, r) => s + (r.periods_per_week || 1), 0);

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="tt-root">

      {/* ── Header ── */}
      <div className="tt-header">
        <div className="tt-title-group">
          <div className="tt-icon">{mode === 'exam' ? <AlertIcon size={24} color="#F59E0B" /> : <CalendarIcon size={24} />}</div>
          <div>
            <div className="tt-title">{mode === 'exam' ? 'Exam Scheduling' : 'Timetable'}</div>
            <div className="tt-sub">
              {selClass || '—'}
              {selClass && <span className={`tt-level-badge ${levelBadge.cls}`}>{levelBadge.label}</span>}
              {mode !== 'weekly' && <span className="tt-mode-badge">{mode.toUpperCase()}</span>}
            </div>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="tt-mode-toggle">
          <button 
            className={`tt-mode-btn ${mode === 'weekly' ? 'active' : ''}`}
            onClick={() => setMode('weekly')}
          >
            Weekly
          </button>
          
          {examTypes.map(et => (
            <button 
              key={et}
              className={`tt-mode-btn ${mode === et ? 'active' : ''}`}
              onClick={() => {
                setMode(et);
                setPanel('grid');
              }}
            >
              {et}
            </button>
          ))}
        </div>

        <div className="tt-header-actions">
          {panel === 'grid' && view === 'class' && !preview && (
            <button className="tt-btn" onClick={() => printClassTimetable({
              school: { name: currentUser?.schoolName }, classGrade: selClass,
              stream: selStream, period: activePeriod, config, slots, activeDays,
              isExam: mode === 'exam'
            })}><PrintIcon size={14} /> Print</button>
          )}
          {panel === 'grid' && view === 'teacher' && selTeacher && (
            <button className="tt-btn" onClick={() => printTeacherTimetable({
              school: { name: currentUser?.schoolName },
              teacher: teachers.find(t => t.id === selTeacher),
              period: activePeriod, config, slots: teacherSlots, activeDays,
              isExam: mode === 'exam'
            })}><PrintIcon size={14} /> Print</button>
          )}
          {/* Period selector always visible */}
          <select className="tt-select" value={periodId} onChange={e => setPeriodId(e.target.value)}>
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.year} — {p.term}{p.is_active ? ' (Active)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Panel tabs ── */}
      <div className="tt-panel-tabs">
        {[['grid',<><CalendarIcon size={14} /> Timetable</>],['req',<><BookIcon size={14} /> Requirements</>],['config',<><SettingsIcon size={14} /> Slot Config</>]].map(([k, label]) => (
          <button key={k} className={`tt-panel-tab ${panel === k ? 'active' : ''}`}
            onClick={() => setPanel(k)}>{label}</button>
        ))}
      </div>

      {/* ── Toast ── */}
      {message && (
        <div className={`tt-toast ${message.type === 'ok' ? 'tt-toast-ok' : 'tt-toast-err'}`}>
          {message.type === 'ok' ? <CheckIcon size={14} /> : <CrossIcon size={14} />} {message.text}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PANEL: GRID
         ═══════════════════════════════════════════════════════════════ */}
      {panel === 'grid' && (
        <>
          {/* Generate Button (Admin only) */}
          {isAdmin && !preview && (
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
              {mode !== 'weekly' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: '.75rem', fontWeight: 600, color: '#5A6B5C' }}>
                    Max {mode.includes('CAT') ? 'CATs' : 'Exams'} per day:
                  </label>
                  <input 
                    type="number" 
                    min={1} 
                    max={5} 
                    className="tt-select" 
                    style={{ width: 60 }}
                    value={maxExamsPerDay}
                    onChange={e => setMaxExamsPerDay(Number(e.target.value))}
                  />
                </div>
              )}
              <button className="tt-generate-btn" disabled={generating} onClick={handleGenerate}>
                {generating ? (
                  <><div className="tt-spin" style={{ width: 14, height: 14, borderWidth: 2, margin: 0, marginRight: 8 }} /> Generating...</>
                ) : (
                  <><SparklesIcon size={16} /> Auto-Generate {mode === 'weekly' ? 'Timetable' : 'Schedule'}</>
                )}
              </button>
            </div>
          )}

          {/* Preview banner */}
          {preview && (
            <div className="tt-preview-banner">
              <div className="tt-preview-banner-text">
                <RocketIcon size={18} /> 
                <div style={{ display:'flex', flexDirection:'column' }}>
                  <span>Preview Mode</span>
                  <span style={{ fontSize:'.68rem', fontWeight:400, opacity:.8 }}>{preview.slots.length} slots generated. Discard or save to apply changes.</span>
                </div>
              </div>
              <div className="tt-preview-actions">
                <button className="tt-btn tt-btn-sm" onClick={() => { setPreview(null); setMessage(null); }}>
                  Discard
                </button>
                <button className="tt-btn tt-btn-success tt-btn-sm" disabled={savingGen} onClick={handleSaveGenerated}>
                  {savingGen ? 'Saving...' : <><SaveIcon size={14} /> Save Timetable</>}
                </button>
              </div>
            </div>
          )}

          {/* Unplaced warnings */}
          {preview?.unplaced?.length > 0 && (
            <div className="tt-unplaced">
              <div className="tt-unplaced-title">
                <AlertIcon size={16} /> {preview.unplaced.length} lesson{preview.unplaced.length !== 1 ? 's' : ''} could not be placed
                — not enough free slots. Reduce periods/week or add more time slots.
              </div>
              {preview.unplaced.map((u, i) => (
                <div key={i} className="tt-unplaced-item">
                  {u.class_grade}{u.stream ? ` ${u.stream}` : ''} — {u.subject}
                  {u._double ? ' (double)' : ''}
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="tt-controls">
            <div className="tt-view-toggle">
              <button className={`tt-view-btn ${view === 'class' ? 'active' : ''}`}   onClick={() => setView('class')}><BookIcon size={14} /> Class</button>
              <button className={`tt-view-btn ${view === 'teacher' ? 'active' : ''}`} onClick={() => setView('teacher')}><TeacherIcon size={14} /> Teacher</button>
            </div>
            <div className="tt-divider" />
            {view === 'class' && (
              <>
                <select className="tt-select" value={selClass} onChange={e => { setSelClass(e.target.value); setSelStream(''); setPreview(null); }}>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {classStreams.length > 0 && (
                  <select className="tt-select" value={selStream} onChange={e => { setSelStream(e.target.value); setPreview(null); }}>
                    <option value="">All Streams</option>
                    {classStreams.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </>
            )}
            {view === 'teacher' && (
              <select className="tt-select" value={selTeacher} onChange={e => setSelTeacher(e.target.value)}>
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div style={{ padding:48, textAlign:'center' }}>
              <div className="tt-spin" />
              <div style={{ fontSize:'.78rem', color:'#5A6B5C' }}>Loading timetable...</div>
            </div>
          ) : config.filter(c => !c.is_break).length === 0 ? (
            <div className="tt-empty">
              <div className="tt-empty-ico"><SettingsIcon size={48} /></div>
              <div className="tt-empty-title">No time slots configured</div>
              <div className="tt-empty-sub">Set up your school day structure in the Slot Config panel first.</div>
              {isAdmin && <button className="tt-btn tt-btn-primary" onClick={() => setPanel('config')}><SettingsIcon size={14} /> Configure Slots</button>}
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
                              {hasData && isAdmin && view === 'class' && !preview && (
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
                                          <UserIcon size={12} /> {cell.teachers?.name || teacherName(cell.teacher_id)}
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
                                    {isAdmin && view === 'class' && !preview ? '+ Add' : ''}
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
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PANEL: REQUIREMENTS
         ═══════════════════════════════════════════════════════════════ */}
      {panel === 'req' && (
        <div className="tt-req-panel">
          {/* Header with class picker + generate button */}
          <div className="tt-req-header">
            <div className="tt-req-class-picker">
              <select className="tt-select" value={selClass} onChange={e => { setSelClass(e.target.value); setSelStream(''); }}>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {classStreams.length > 0 && (
                <select className="tt-select" value={selStream} onChange={e => setSelStream(e.target.value)}>
                  <option value="">All Streams</option>
                  {classStreams.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <span className={`tt-level-badge ${levelBadge.cls}`}>{levelBadge.label}</span>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <div className="tt-req-stats">
                <span className="tt-req-stat">Lessons/week: <strong>{weeklyRequired}</strong></span>
                <span className="tt-req-stat">Slots available: <strong>{weeklyCapacity}</strong></span>
                {weeklyRequired > weeklyCapacity && (
                  <span style={{ fontSize:'.68rem', color:'#D4506A', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}><AlertIcon size={12} /> Over capacity</span>
                )}
              </div>
              <button className="tt-btn tt-btn-sm" onClick={handleAutoImport}>Auto-import</button>
              <button className="tt-generate-btn" disabled={generating} onClick={handleGenerate}>
                {generating ? <><SettingsIcon size={14} /> Generating...</> : <><RocketIcon size={14} /> Generate Timetable</>}
              </button>
            </div>
          </div>

          <div className="tt-req-info" style={{ marginBottom:8 }}>
            Set how many lessons per week each subject needs. The system will auto-place them with no overlaps.
            <strong> Double lesson</strong> = two consecutive periods placed together (e.g. lab, practical).
          </div>

          {/* Requirements table */}
          <div className="tt-req-table-wrap">
            <table className="tt-req-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Lessons / Week</th>
                  <th>Double Lesson</th>
                  <th>Colour</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {reqs.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding:'30px', textAlign:'center', color:'#5A6B5C', fontSize:'.8rem' }}>
                    No requirements yet. Add subjects below or use Auto-import.
                  </td></tr>
                ) : reqs.map(r => (
                  <tr key={r.subject}>
                    <td>
                      <div className="tt-req-subject">{r.subject}</div>
                    </td>
                    <td style={{ fontSize:'.72rem', color:'#8A9B8C' }}>
                      {r.teachers?.name || '—'}
                    </td>
                    <td>
                      <span style={{ fontFamily:"'Space Mono',monospace", fontSize:'.82rem', fontWeight:700, color:'#D4DDD6' }}>
                        {r.periods_per_week}×
                      </span>
                    </td>
                    <td>
                      {r.allow_double
                        ? <span className="tt-req-double-badge">×2 Double</span>
                        : <span style={{ fontSize:'.68rem', color:'#5A6B5C' }}>Single</span>}
                    </td>
                    <td>
                      <div className="tt-color-swatch" style={{ background: r.color || '#5A6B5C' }} />
                    </td>
                    {isAdmin && (
                      <td>
                        <button className="tt-btn tt-btn-sm tt-btn-danger"
                          onClick={() => handleDeleteReq(r.subject)}><CrossIcon size={12} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add requirement form */}
          {isAdmin && (
            <div className="tt-add-req">
              <div className="tt-add-req-title"><PlusIcon size={14} /> Add Subject Requirement</div>
              <div className="tt-add-req-grid">
                <div>
                  <label className="tt-req-label">Subject *</label>
                  <input className="tt-req-input" type="text" placeholder="e.g. Mathematics"
                    value={reqSubject}
                    onChange={e => setReqSubject(e.target.value)}
                    list="subject-suggestions" />
                  <datalist id="subject-suggestions">
                    {suggestedSubs.filter(s => !existingSubjects.includes(s)).map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  {/* Quick chips */}
                  <div className="tt-suggestion-chips" style={{ marginTop:6 }}>
                    {suggestedSubs.filter(s => !existingSubjects.includes(s)).slice(0, 8).map(s => (
                      <button key={s} className="tt-chip" onClick={() => setReqSubject(s)}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="tt-req-label">Teacher</label>
                  <select className="tt-req-input" value={reqTeacher} onChange={e => setReqTeacher(e.target.value)}>
                    <option value="">— Unassigned —</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="tt-req-label">Lessons / Week</label>
                  <input className="tt-req-input" type="number" min={1} max={weeklyCapacity || 20}
                    value={reqPerWeek} onChange={e => setReqPerWeek(Number(e.target.value))} />
                </div>
                <div>
                  <label className="tt-req-label">Colour</label>
                  <div className="tt-color-row" style={{ marginTop:4 }}>
                    {COLORS.slice(0, 8).map(c => (
                      <div key={c} className={`tt-color-dot ${reqColor === c ? 'active' : ''}`}
                        style={{ background: c, width:18, height:18 }}
                        onClick={() => setReqColor(c)} />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:10 }}>
                <label className="tt-double-check">
                  <input type="checkbox" checked={reqDouble} onChange={e => setReqDouble(e.target.checked)} />
                  Double lesson (lab / practical — two consecutive slots)
                </label>
                <button className="tt-btn tt-btn-primary tt-btn-sm" style={{ marginLeft:'auto' }}
                  disabled={!reqSubject.trim() || reqSaving} onClick={handleSaveReq}>
                  {reqSaving ? 'Saving...' : 'Add Subject'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PANEL: SLOT CONFIG
         ═══════════════════════════════════════════════════════════════ */}
      {panel === 'config' && (
        <div className="tt-config">
          <div className="tt-config-hd">
            <div>
              <div className="tt-config-title">{mode === 'weekly' ? 'Weekly' : mode} Slot Configuration</div>
              <div className="tt-config-sub">Set the periods, breaks, and times for your {mode === 'weekly' ? 'regular school day' : mode + ' schedule'}.</div>
            </div>
            <button className="tt-btn tt-btn-primary" disabled={configSaving} onClick={handleSaveConfig}>
              {configSaving ? 'Saving...' : <><SaveIcon size={14} /> Save Configuration</>}
            </button>
          </div>

          {/* Active days */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:'.6rem', color:'#5A6B5C', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:7 }}>
              Active School Days
            </div>
            <div className="tt-days-row">
              {ALL_DAYS.map(d => (
                <button key={d}
                  className={`tt-day-pill ${activeDays.includes(d) ? 'active' : ''}`}
                  onClick={() => setActiveDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])}>
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Slot rows */}
          {draftConfig.map((slot, i) => (
            <div key={i} className="tt-slot-row">
              <span className="tt-slot-drag">⠿</span>
              <input type="text" value={slot.label} placeholder="Label"
                onChange={e => updateDraft(i, 'label', e.target.value)}
                style={{ width:110 }} />
              <input type="time" value={slot.start_time}
                onChange={e => updateDraft(i, 'start_time', e.target.value)} />
              <span style={{ fontSize:'.7rem', color:'#5A6B5C' }}>→</span>
              <input type="time" value={slot.end_time}
                onChange={e => updateDraft(i, 'end_time', e.target.value)} />
              <label className="tt-slot-break-label">
                <input type="checkbox" checked={slot.is_break}
                  onChange={e => updateDraft(i, 'is_break', e.target.checked)} />
                Break / Non-teaching
              </label>
              <button className="tt-btn tt-btn-danger tt-btn-sm" 
                onClick={() => removeDraft(i)} style={{ marginLeft:'auto', display:'flex', alignItems:'center', justifyContent:'center' }}><CrossIcon size={14} /></button>
            </div>
          ))}
          <button className="tt-add-slot" onClick={addDraftSlot}><PlusIcon size={14} /> Add Time Slot</button>

          {/* Info */}
          <div style={{ marginTop:14, padding:'10px 13px', borderRadius:8, background:'rgba(74,158,232,.07)', border:'1px solid rgba(74,158,232,.15)' }}>
            <div style={{ fontSize:'.68rem', color:'#4A9EE8', lineHeight:1.6 }}>
              <strong>Teaching slots:</strong> {draftConfig.filter(s => !s.is_break).length} per day &nbsp;·&nbsp;
              <strong>Active days:</strong> {activeDays.length} &nbsp;·&nbsp;
              <strong>Weekly capacity per class:</strong> {draftConfig.filter(s => !s.is_break).length * activeDays.length} lessons
            </div>
          </div>
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
            {reqs.length > 0 && (
              <div className="tt-suggestion-chips" style={{ marginTop:6 }}>
                {reqs.map(r => (
                  <button key={r.subject} className={`tt-chip ${editSubject === r.subject ? 'active' : ''}`}
                    onClick={() => {
                      setEditSubject(r.subject);
                      if (r.teacher_id) setEditTeacher(r.teacher_id);
                      if (r.color) setEditColor(r.color);
                    }}>
                    {r.subject}
                  </button>
                ))}
              </div>
            )}

            {/* Teacher */}
            <label className="tt-field-label">Teacher</label>
            <select className="tt-field" value={editTeacher}
              onChange={e => { setEditTeacher(e.target.value); setConflictWarning(null); }}>
              <option value="">— Unassigned —</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id} style={t.on_leave ? {color:'var(--warning)'} : {}}>
                  {t.name} {t.on_leave ? '(On Leave 🏖️)' : ''}
                </option>
              ))}
            </select>

            {/* Conflict warning */}
            {conflictWarning && (
              <div className="tt-conflict-box">
                <div className="tt-conflict-title"><AlertIcon size={16} /> Teacher Unavailable</div>
                <div className="tt-conflict-body">
                  <strong style={{ color:'#D4DDD6' }}>{teacherName(editTeacher)}</strong> is already teaching{' '}
                  <strong style={{ color:'#D4DDD6' }}>{conflictWarning.subject}</strong> in{' '}
                  <strong style={{ color:'#D4DDD6' }}>{conflictWarning.class_grade}{conflictWarning.stream ? ` ${conflictWarning.stream}` : ''}</strong>{' '}
                  at this time. Choose a different teacher or leave unassigned.
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
            <input className="tt-field" type="text" placeholder="e.g. Room 4, Science Lab, Hall"
              value={editRoom} onChange={e => setEditRoom(e.target.value)} />

            {/* Colour */}
            <label className="tt-field-label">Colour</label>
            <div className="tt-color-row">
              {COLORS.map(c => (
                <div key={c} className={`tt-color-dot ${editColor === c ? 'active' : ''}`}
                  style={{ background: c }} onClick={() => setEditColor(c)} />
              ))}
            </div>

            {/* Actions */}
            <div className="tt-modal-actions">
              <button className="tt-btn" style={{ flex:1 }}
                onClick={() => { setEditCell(null); setConflictWarning(null); }}>
                Cancel
              </button>
              <button className="tt-btn tt-btn-primary" style={{ flex:1.4 }}
                disabled={!editSubject.trim() || cellSaving || !!conflictWarning}
                onClick={handleSaveCell}>
                {cellSaving ? 'Saving...' : editCell.existing ? 'Update Slot' : 'Add Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
