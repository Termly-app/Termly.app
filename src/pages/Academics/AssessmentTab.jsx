import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { getClassResults, setStudentAllMarks, getSubjectRankings, getClassList, getCBC, setCBC, getCoreCompetencies, subscribeToTable, getGradeForScore, getSubjectAssignments, getExams, releaseExamToParents } from '../../data/academicsStore';
import { getTeacherPerformance } from '../../data/staffStore';
import { getPrintHeader, getPrintFooter, getSchoolProfile } from '../../data/coreStore';;
import { CBC_STRUCTURE, CBC_LEVELS, CBC_CORE_COMPETENCIES, STREAMS, getSubjectsForGrade, getLevelForGrade } from '../../data/seedData';
import { 
  LeafIcon, BookIcon, PrintIcon, DashboardIcon, EditIcon, 
  FlagIcon, RocketIcon, TeacherIcon, SchoolIcon, SaveIcon,
  SparklesIcon, TrendUpIcon, ChartBarIcon, SettingsIcon, CrossIcon, EyeOffIcon
} from '../../components/CommonIcons';
import Select from '../../components/Common/Select';
import { useDialog } from '../../contexts/DialogContext';
import { getProfessionalRemark } from '../../utils/remarkUtils';
import { downloadReportCardPDF } from '../../utils/reportCard';
import { useFeature } from '../../contexts/FeaturesContext';

export default function AssessmentTab({ currentUser, currentPeriodId }) {
  const { alert, confirm } = useDialog();
  const { enabled: hasTeacherPortal } = useFeature('teacher_portal');
  const { enabled: hasParentPortal } = useFeature('parent_portal');
  const allGrades = Object.values(CBC_STRUCTURE).flatMap(l => l.grades);
  const [selectedClass, setSelectedClass] = useState(sessionStorage.getItem('grading_class') || 'All');
  const [streamFilter, setStreamFilter] = useState('All');
  const [results, setResults] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editMarks, setEditMarks] = useState({});
  const [showReport, setShowReport] = useState(null);
  const [activeTab, setActiveTab] = useState('marks');
  const [subjectRankings, setSubjectRankings] = useState({});
  const [showSubjectPicker, setShowSubjectPicker] = useState(null);
  const [cbcData, setCbcData] = useState({});
  const [teacherPerf, setTeacherPerf] = useState({});
  const [selectedSubject, setSelectedSubject] = useState('');
  const [coreCompData, setCoreCompData] = useState({});
  
  // Trigger migration on load if needed
  useEffect(() => {
    import('../../data/studentStore').then(m => m.migrateExistingStudentsSubjects());
  }, []);

  const [profile, setProfile] = useState({ streams: [], activeClasses: [] });
  const [selectedPathway, setSelectedPathway] = useState('STEM');
  const [examType, setExamType] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState({});
  const [robustExams, setRobustExams] = useState([]);
  const [syncingExam, setSyncingExam] = useState(false);

  const userRole = currentUser?.role?.toLowerCase() || 'teacher';
  const isFinance = userRole === 'finance';
  const isTeacher = userRole === 'teacher';
  const isAdmin = userRole === 'admin';

  const subjects = getSubjectsForGrade(selectedClass, profile, selectedPathway);
  const level = getLevelForGrade(selectedClass);
  const isEarlyYears = level === 'Early Years';
  const isSeniorSecondary = level === 'Senior Secondary';

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [p, a, e] = await Promise.all([getSchoolProfile(), getSubjectAssignments(), getExams()]);
        setProfile(p);
        setAssignments(a);
        setRobustExams(e);
        
        let currentExam = examType;
        if (e.length > 0) {
          const exists = e.find(ex => ex.name === examType);
          if (!exists) {
            currentExam = e[0].name;
            setExamType(currentExam);
          }
        }

        await loadResults(currentExam);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();

    // Subscribe to real-time changes using Supabase Realtime
    const unsubMarks = subscribeToTable('exam_marks', () => {
      // Refresh results when marks change
      loadResults(); // Uses current state
    });

    return () => {
      unsubMarks();
    };

  }, [selectedClass, streamFilter, selectedPathway, examType, currentUser, currentPeriodId]);

  const loadResults = async (overrideExamType = null) => {
    const targetExam = overrideExamType || examType;
    if (!selectedClass || selectedClass === 'All') {
      setResults([]);
      setSubjectRankings([]);
      setCbcData({});
      setTeacherPerf([]);
      setCoreCompData({});
      return;
    }
    let r = await getClassResults(selectedClass, targetExam);
    if (streamFilter !== 'All') r = r.filter(s => s.stream === streamFilter);
    
    r.sort((a, b) => b.total - a.total);
    r.forEach((student, index) => { student.rank = index + 1; });
    
    setResults(r);
    const em = {};
    r.forEach(s => { em[s.id] = { ...s.marks }; });
    setEditMarks(em);

    const [rankD, cbcD, perfD, ccD] = await Promise.all([
      getSubjectRankings(selectedClass, targetExam),
      getCBC(),
      getTeacherPerformance(targetExam),
      getCoreCompetencies()
    ]);
    setSubjectRankings(rankD);
    setCbcData(cbcD);
    setTeacherPerf(perfD);
    setCoreCompData(ccD);

    const pway = level === 'Senior Secondary' ? selectedPathway : 'STEM';
    const subs = getSubjectsForGrade(selectedClass, profile, pway);
    setSelectedSubject(subs[0] || '');
  };

  const handleMarkChange = (sid, sub, val) => {
    const num = Number(val);
    const clamped = isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
    setEditMarks(prev => ({ ...prev, [sid]: { ...prev[sid], [sub]: clamped } }));
  };

  // Spreadsheet-style navigation. Each mark input gets an id of
  // `mark-r{row}-c{col}` (row = student index, col = subject index) so
  // arrow keys / Enter can jump straight to the DOM node instead of
  // relying on default browser tab order, which only ever moves forward.
  const focusMarkCell = (row, col) => {
    const el = document.getElementById(`mark-r${row}-c${col}`);
    if (el) { el.focus(); el.select(); }
  };

  const handleMarkKeyDown = (e, row, col) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault(); focusMarkCell(row - 1, col); break;
      case 'ArrowDown':
      case 'Enter':
        e.preventDefault(); focusMarkCell(row + 1, col); break;
      case 'ArrowLeft':
        if (e.target.selectionStart === 0) { e.preventDefault(); focusMarkCell(row, col - 1); }
        break;
      case 'ArrowRight':
        if (e.target.selectionStart === e.target.value.length) { e.preventDefault(); focusMarkCell(row, col + 1); }
        break;
      case 'Tab':
        // Let Tab do its native thing, but Shift+Tab at the row start and
        // Tab at the row end should still feel like a grid, not a jump
        // out of the table — plain browser tab order already handles the
        // common case, so no extra handling needed here.
        break;
      default:
        break;
    }
  };

  // Paste a block copied from Excel/Sheets: tab-separated columns,
  // newline-separated rows, starting from whichever cell has focus. This
  // is the single biggest "feels like a spreadsheet" win — a teacher who
  // already has marks in a spreadsheet can paste one column or a whole
  // grid in one action instead of retyping every cell.
  const handleMarkPaste = (e, row, col) => {
    const text = e.clipboardData?.getData('text');
    if (!text || !text.includes('\t') && !text.includes('\n')) return; // let a single value paste normally
    e.preventDefault();
    const rows = text.replace(/\r/g, '').split('\n').filter(r => r.length > 0);
    rows.forEach((rowText, rOffset) => {
      const cells = rowText.split('\t');
      cells.forEach((cellText, cOffset) => {
        const targetRow = results[row + rOffset];
        const targetSub = subjects[col + cOffset];
        if (!targetRow || !targetSub) return;
        const val = cellText.trim();
        if (val !== '' && !isNaN(Number(val))) {
          handleMarkChange(targetRow.id, targetSub, val);
        }
      });
    });
    // Land the cursor at the end of the pasted block rather than leaving
    // it on the first cell, matching how Sheets/Excel behave.
    setTimeout(() => focusMarkCell(row + rows.length - 1, col + Math.max(...rows.map(r => r.split('\t').length)) - 1), 0);
  };

  const saveAllMarks = async () => {
    setLoading(true);
    setSyncingExam(true);
    try {
      await Promise.all(Object.entries(editMarks).map(([sid, m]) => setStudentAllMarks(sid, m, examType)));
      setEditMode(false); 
      await loadResults();
    } catch(err) { 
      alert({ title: 'Save Error', message: err.message, variant: 'danger' }); 
    } finally { 
      setLoading(false); 
      setSyncingExam(false);
    }
  };

  const handleCBCChange = async (sid, sub, lv) => { 
    try {
      await setCBC(sid, sub, lv); 
      setCbcData(await getCBC()); 
    } catch(err) { alert({ title: 'Assessment Error', message: err.message, variant: 'danger' }); }
  };

  const getGrade = (avg) => {
    return getGradeForScore(avg, selectedClass, profile);
  };

  const handleSubjectSelection = async (subjects) => {
    if (!showSubjectPicker) return;
    setLoading(true);
    try {
      const { updateStudent } = await import('../../data/studentStore');
      await updateStudent(showSubjectPicker.id, { subjects });
      setShowSubjectPicker(null);
      await loadResults();
    } catch (err) {
      alert({ title: 'Update Error', message: err.message, variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseResults = async () => {
    if (!examType) return;
    const exam = robustExams.find(e => e.name === examType);
    if (!exam) return;

    const isCurrentlyReleased = exam.released_to_parents;
    const confirmed = await confirm({
      title: isCurrentlyReleased ? 'Hide from Parents?' : 'Post to Parents?',
      message: isCurrentlyReleased 
        ? `Are you sure you want to hide these results? Parents will no longer see them.` 
        : `Are you sure you want to post these results? They will become immediately visible to all parents.`,
      variant: isCurrentlyReleased ? 'warning' : 'primary'
    });

    if (confirmed) {
      setLoading(true);
      try {
        await releaseExamToParents(exam.id, !isCurrentlyReleased);
        alert({ 
          title: isCurrentlyReleased ? 'Hidden' : 'Posted!', 
          message: isCurrentlyReleased 
            ? 'Results have been hidden from the Parent Portal.' 
            : 'Results are now live on the Parent Portal.', 
          variant: 'success' 
        });
      } catch (err) {
        alert({ title: 'Error', message: 'Operation failed: ' + err.message, variant: 'danger' });
      } finally {
        setLoading(true); // Trigger refresh
        setTimeout(() => setLoading(false), 500);
      }
    }
  };

  const cbcLabel = (lv) => {
    const short = { 'Exceeding Expectation': 'EE', 'Meeting Expectation': 'ME', 'Approaching Expectation': 'AE', 'Below Expectation': 'BE' };
    return short[lv] || 'ME';
  };

  const cbcColor = (lv) => {
    const c = { 'Exceeding Expectation': '#10b981', 'Meeting Expectation': '#3b82f6', 'Approaching Expectation': '#f59e0b', 'Below Expectation': '#ef4444' };
    return c[lv] || '#3b82f6';
  };

  // ─── Shared Excel-style CSS for all print sheets ───
  const excelCSS = `
    body{font-family:'Calibri','Arial',sans-serif;padding:12px;margin:0;color:#000;font-size:11px}
    h2{font-size:14px;margin:0 0 2px;text-transform:uppercase;font-weight:700}
    .sub{font-size:10px;color:#000;margin-bottom:10px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th,td{border:1px solid #000;padding:4px 6px;text-align:center;font-size:10px}
    th{background:#fff;font-weight:700;text-transform:uppercase;font-size:9px}
    td{background:#fff}
    td.nm{text-align:left;font-weight:500;white-space:nowrap}
    .ft{margin-top:12px;font-size:9px;color:#000;display:flex;justify-content:space-between}
    @page{size:portrait;margin:0}
    @media print{body{padding:15mm}}
  `;

  // Subject abbreviations for print-friendly A4 portrait
  const subjectAbbr = (name) => {
    const map = {
      // 8-4-4 Secondary
      'English': 'ENG', 'Kiswahili': 'KIS', 'Mathematics': 'MATH', 'Biology': 'BIO',
      'Physics': 'PHY', 'Chemistry': 'CHEM', 'History & Government': 'HIST', 'History': 'HIST',
      'Geography': 'GEO', 'Christian Religious Education': 'CRE', 'Islamic Religious Education': 'IRE',
      'Hindu Religious Education': 'HRE', 'Business Studies': 'BST', 'Agriculture': 'AGRI',
      'Computer Studies': 'COMP', 'Computer studies': 'COMP', 'Computer Science': 'COMP',
      'France': 'FRE', 'French': 'FRE', 'German': 'GER', 'Arabic': 'ARB',
      'Art & Design': 'ART', 'Art and Design': 'ART', 'Music': 'MUS',
      'Home Science': 'H/SC', 'Aviation': 'AVI', 'Electricity': 'ELEC',
      'Power Mechanics': 'P/M', 'Metalwork': 'M/W', 'Woodwork': 'W/W',
      'Building Construction': 'B/C', 'Drawing & Design': 'D&D',
      // CBC Early Years (PP1, PP2, Grade 1-3)
      'Literacy Activities': 'LIT', 'Mathematical Activities': 'MATH',
      'Environmental Activities': 'ENV', 'Creative Activities': 'CRA',
      'Religious Education': 'RE', 'Movement & Creative Activities': 'MCA',
      // CBC Upper Primary (Grade 4-6)
      'Science & Technology': 'S&T', 'Social Studies': 'SST',
      'Agriculture & Nutrition': 'A&N', 'Creative Arts': 'C/ART',
      'Physical & Health Education': 'PHE',
      // CBC Junior Secondary (Grade 7-9)
      'Integrated Science': 'I/SCI', 'Pre-Technical Studies': 'PTS',
      'ICT': 'ICT', 'Health Education': 'HLT',
      'Life Skills Education': 'LSE', 'Life Skills': 'LSE',
      'Social Studies & Ethics': 'SSE',
      // CBC Senior Secondary (Grade 10-12)
      'Advanced Math': 'A/M', 'Technical Drawing': 'T/D',
      'Visual Arts': 'V/ART', 'Physical Education': 'PE',
      'Performing Arts': 'P/ART', 'Sports Management': 'SPM',
      // Other
      'Science': 'SCI', 'Hygiene & Nutrition': 'H&N',
    };
    if (map[name]) return map[name];
    // Smart fallback for admin-added subjects
    const words = name.split(/[\s&\/]+/).filter(w => w.length > 0);
    if (words.length >= 2) {
      // Multi-word: use initials e.g. "Business Management" → "BM"
      return words.map(w => w[0]).join('').toUpperCase().substring(0, 4);
    }
    // Single word: first 4 chars e.g. "Metalwork" → "META"
    return name.substring(0, 4).toUpperCase();
  };

  const printClassList = async () => {
    try {
      let list = await getClassList(selectedClass);
      if (streamFilter !== 'All') list = list.filter(s => s.stream === streamFilter);
      list.sort((a, b) => String(a.admNo || '').localeCompare(String(b.admNo || ''), undefined, { numeric: true }));
      const sl = streamFilter === 'All' ? '' : ` - ${streamFilter}`;
      
      const headerStr = await getPrintHeader(`${selectedClass}${sl} CLASS LIST | ${examType} | Students: ${list.length}`);
      const footerStr = await getPrintFooter();
      
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>Class List - ${selectedClass}</title>
      <style>${excelCSS}</style></head><body>
      ${headerStr}
      <table><thead><tr>
        <th style="width:30px">#</th><th style="width:70px">ADM NO</th>
        <th style="text-align:left;min-width:140px">STUDENT NAME</th>
        ${subjects.map(s => `<th>${subjectAbbr(s)}</th>`).join('')}
        <th>TTL</th><th>AVG</th><th>GRD</th>
      </tr></thead><tbody>
        ${list.map((s, i) => `<tr><td>${i + 1}</td><td>${s.admNo || ''}</td><td class="nm">${s.name}</td>${subjects.map(() => '<td></td>').join('')}<td></td><td></td><td></td></tr>`).join('')}
      </tbody></table>
      <div class="ft"><span>Class Teacher: _________________________ Sign: _____________</span><span>Printed: ${new Date().toLocaleDateString()}</span></div>
      ${footerStr}
      </body></html>`);
      w.document.close(); w.print();
    } catch (err) { alert({ title: 'Print Error', message: "Print failed: " + err.message, variant: 'danger' }); }
  };

  // Print results for current stream selection - clean Excel style
  const printClassResults = async () => {
    try {
      const sl = streamFilter === 'All' ? ' (All Streams)' : ` - ${streamFilter}`;
      
      const headerStr = await getPrintHeader(`${selectedClass}${sl} ${examType} RESULTS | Students: ${results.length}`);
      const footerStr = await getPrintFooter();
      
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>Results - ${selectedClass}</title>
      <style>${excelCSS}</style></head><body>
      ${headerStr}
      <table><thead><tr>
        <th style="width:30px">#</th><th style="width:70px">ADM NO</th>
        <th style="text-align:left;min-width:140px">STUDENT NAME</th>
        ${streamFilter === 'All' ? '<th>STR</th>' : ''}
        ${subjects.map(s => `<th>${subjectAbbr(s)}</th>`).join('')}
        <th>TTL</th><th>AVG</th><th>GRD</th>
      </tr></thead><tbody>
        ${results.map(s => {
          const { grade: g } = getGrade(s.average);
          const enrolled = s.enrolledSubjects || subjects;
          return `<tr>
            <td>${s.rank}</td><td>${s.admNo || ''}</td><td class="nm">${s.name}</td>
            ${streamFilter === 'All' ? `<td>${s.stream || '-'}</td>` : ''}
            ${subjects.map(sub => !enrolled.includes(sub) ? '<td>-</td>' : `<td>${s.marks[sub] !== undefined ? s.marks[sub] : ''}</td>`).join('')}
            <td style="font-weight:700">${s.total}</td><td style="font-weight:700">${s.average}</td>
            <td style="font-weight:700">${g}</td>
          </tr>`;
        }).join('')}
      </tbody></table>
      <div class="ft"><span>Class Teacher: _________________________ Sign: _____________</span><span>H.O.D: _________________________ Sign: _____________</span><span>Printed: ${new Date().toLocaleDateString()}</span></div>
      ${footerStr}
      </body></html>`);
      w.document.close(); w.print();
    } catch(err) { alert({ title: 'Print Error', message: "Print failed: " + err.message, variant: 'danger' }); }
  };

  // Print entire grade (all streams combined, re-ranked together)
  const printGradeResults = async () => {
    try {
      const all = await getClassResults(selectedClass, examType);
      all.sort((a, b) => b.total - a.total);
      all.forEach((s, i) => { s.rank = i + 1; });
      
      const headerStr = await getPrintHeader(`${selectedClass} OVERALL ${examType} RESULTS | All Streams Combined | Students: ${all.length}`);
      const footerStr = await getPrintFooter();
      
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>Grade Results - ${selectedClass}</title>
      <style>${excelCSS}</style></head><body>
      ${headerStr}
      <table><thead><tr>
        <th style="width:30px">#</th><th style="width:70px">ADM NO</th>
        <th style="text-align:left;min-width:140px">STUDENT NAME</th><th>STR</th>
        ${subjects.map(s => `<th>${subjectAbbr(s)}</th>`).join('')}
        <th>TTL</th><th>AVG</th><th>GRD</th>
      </tr></thead><tbody>
        ${all.map(s => {
          const { grade: g } = getGrade(s.average);
          const enrolled = s.enrolledSubjects || subjects;
          return `<tr>
            <td>${s.rank}</td><td>${s.admNo || ''}</td><td class="nm">${s.name}</td><td>${s.stream || '-'}</td>
            ${subjects.map(sub => !enrolled.includes(sub) ? '<td>-</td>' : `<td>${s.marks[sub] !== undefined ? s.marks[sub] : ''}</td>`).join('')}
            <td style="font-weight:700">${s.total}</td><td style="font-weight:700">${s.average}</td>
            <td style="font-weight:700">${g}</td>
          </tr>`;
        }).join('')}
      </tbody></table>
      <div class="ft"><span>Principal: _________________________ Sign: _____________</span><span>D.O.S: _________________________ Sign: _____________</span><span>Printed: ${new Date().toLocaleDateString()}</span></div>
      ${footerStr}
      </body></html>`);
      w.document.close(); w.print();
    } catch(err) { alert({ title: 'Print Error', message: "Print failed: " + err.message, variant: 'danger' }); }
  };

  // Print all individual report cards for the class
  const printAllReportCards = async () => {
    try {
      const w = window.open('', '_blank');
      const [cbc, cc, headerStr, profileStr] = await Promise.all([
        getCBC(), getCoreCompetencies(), getPrintHeader(`Term 1 ${examType} Report Card — 2026`), getSchoolProfile()
      ]);
      const classSize = results.length;

      const ccHtmlFor = (studentId) => CBC_CORE_COMPETENCIES.map(comp => {
        const lv = (cc[studentId] || {})[comp] || 'Meeting Expectation';
        const cls = lv.startsWith('Exceeding') ? 'ee' : lv.startsWith('Meeting') ? 'me' : lv.startsWith('Approaching') ? 'ae' : 'be';
        return `<tr><td>${comp}</td><td class="${cls}">${lv}</td></tr>`;
      }).join('');

      const reportCards = results.map(student => {
        const studentCBC = cbc[student.id] || {};
        const { grade } = getGrade(student.average);
        return `<div class="report-page">
        ${headerStr}
        <div style="text-align:center;margin-top:-14px;margin-bottom:18px">
          ${isEarlyYears ? `<div class="level">${level}</div>` : ''}
          <div class="level" style="background:var(--accent);color:white;margin-left:8px">${examType}</div>
        </div>
      <div class="info">
        <div style="font-size: 1.1rem; color: var(--primary); font-weight: 800; border-bottom: 2px solid var(--border); margin-bottom: 12px; padding-bottom: 8px;">ADM NO: ${student.admNo} — ${student.name}</div>
        <div><strong>Class:</strong> ${student.class}</div>${!isEarlyYears ? `<div><strong>Position:</strong> ${student.rank} of ${classSize}</div>` : ''}
      </div>
      <div class="section-title">${isEarlyYears ? 'Learning Areas & Development' : 'Academic Performance'}</div>
      <table><thead><tr><th>Learning Area</th>${!isEarlyYears ? '<th>Marks</th><th>Grade</th>' : '<th>CBC Level</th><th>Remarks</th>'}</tr></thead>
      <tbody>${subjects.map(sub => {
        const mark = student.marks[sub] || 0;
        const g = getGrade(mark);
        const cbcLv = studentCBC[sub] || 'Meeting Expectation';
        const cbcCls = cbcLv.startsWith('Exceeding') ? 'ee' : cbcLv.startsWith('Meeting') ? 'me' : cbcLv.startsWith('Approaching') ? 'ae' : 'be';
        const remark = isEarlyYears
          ? (cbcLv.startsWith('Exceeding') ? 'Outstanding progress' : cbcLv.startsWith('Meeting') ? 'Good progress' : cbcLv.startsWith('Approaching') ? 'Developing well' : 'Needs support')
          : getProfessionalRemark(mark, student.id);
        return `<tr><td>${sub}</td>${!isEarlyYears ? `<td style="font-weight:700">${mark}</td><td style="color:${g.color};font-weight:700">${g.grade}</td>` : `<td class="${cbcCls}">${cbcLv}</td><td>${remark}</td>`}</tr>`;
      }).join('')}
      ${!isEarlyYears ? `<tr style="font-weight:700;background:#f8fafc"><td>Total</td><td colspan="2">${student.total} / ${subjects.length * 100} — Average: ${student.average}% (Grade ${grade})</td></tr>` : ''}
      </tbody></table>
      ${isEarlyYears ? `
      <div class="section-title">📋 Core Competencies & Values</div>
      <table><thead><tr><th>Competency</th><th>Rating</th></tr></thead><tbody>${ccHtmlFor(student.id)}</tbody></table>
      <div class="strengths"><strong>Learner Strengths:</strong> ___________________________________</div>
      <div class="strengths"><strong>Areas for Improvement:</strong> ___________________________________</div>
      <div class="strengths"><strong>Overall Academic Remark:</strong> ${getProfessionalRemark(student.average, student.id)}</div>
      <div class="strengths"><strong>Class Teacher Remarks:</strong> ___________________________________</div>
      <div class="strengths"><strong>Principal Remarks:</strong> ___________________________________</div>
      ` : `
      <div class="strengths"><strong>Class Teacher Remarks:</strong> __________________________________________________  <strong>Name:</strong> _______________________</div>
      <div class="strengths"><strong>Principal Remarks:</strong> ______________________________________________________  <strong>Name:</strong> _______________________</div>
      `}
      <div class="sigs"><div><div class="ln"></div>Class Teacher</div><div><div class="ln"></div>Principal</div><div><div class="ln"></div>Parent/Guardian</div></div>
      </div>`;
    }).join('');

      const footerStr = await getPrintFooter();
      w.document.write(`<html><head><title>All Report Cards - ${selectedClass}</title>
    <style>@page{margin:0}body{font-family:Arial,sans-serif;padding:15mm;color:#1e293b;margin:0}
    .report-page{max-width:700px;margin:0 auto;padding:20px;page-break-after:always}
    .report-page:last-child{page-break-after:auto}
    .level{display:inline-block;background:#e2e8f0;padding:3px 12px;border-radius:10px;font-size:11px;margin-top:6px;color:#475569}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:18px;font-size:12px}.info strong{color:#64748b}
    table{width:100%;border-collapse:collapse;margin-bottom:18px}th,td{border:1px solid #e2e8f0;padding:7px 10px;text-align:left;font-size:11px}
    th{background:#1e3a5f;color:white}
    .ee{color:#10b981;font-weight:700}.me{color:#3b82f6;font-weight:700}.ae{color:#f59e0b;font-weight:700}.be{color:#ef4444;font-weight:700}
    .sigs{display:flex;justify-content:space-between;margin-top:40px;font-size:11px}.sigs div{text-align:center}.sigs .ln{width:130px;border-top:1px solid #1e3a5f;margin:0 auto 5px}
    .strengths{margin:14px 0;font-size:12px}.strengths strong{color:#1e3a5f}
    .section-title{margin:20px 0 8px;font-size:13px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #e2e8f0;padding-bottom:4px}
      @media print{.report-page{padding:15px}}
      </style></head><body>${reportCards}${footerStr}</body></html>`);
      w.document.close(); w.print();
    } catch(err) { alert({ title: 'Print Error', message: "Print failed: " + err.message, variant: 'danger' }); }
  };

  return (
    <div className="animate-in">
      <Helmet>
        <title>Grading & Academic Performance | Termly</title>
        <meta name="description" content="Manage student marks, CBC assessments, and generate professional report cards instantly." />
      </Helmet>
      <div className="tab-header" style={{ marginBottom: 20 }}>
        <div className="page-header-actions" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div className="inline-flex" style={{ gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={printClassList}><PrintIcon size={16} /> Class List</button>
            <button className="btn btn-ghost" onClick={printClassResults}><DashboardIcon size={16} /> Stream Results</button>
            <button className="btn btn-ghost" onClick={printGradeResults}><ChartBarIcon size={16} /> Grade Results</button>
            <button className="btn btn-accent" onClick={printAllReportCards}><BookIcon size={16} /> Print All Report Cards</button>
            {activeTab === 'marks' && !isEarlyYears && currentUser?.role?.toLowerCase() !== 'finance' && (editMode ? (
              <><button className="btn btn-ghost" onClick={() => { setEditMode(false); loadResults(); }} disabled={syncingExam}>Cancel</button>
              <button className="btn btn-success" onClick={saveAllMarks} disabled={syncingExam}>
                {syncingExam ? <span className="animate-spin" style={{ display: 'inline-block', marginRight: 8 }}>↻</span> : <SaveIcon size={16} />}
                {syncingExam ? 'Saving...' : 'Save Marks'}
              </button></>
            ) : (
              (isAdmin || (isTeacher && Object.keys(assignments[selectedClass] || {}).some(str => 
                typeof assignments[selectedClass][str] === 'string' ? assignments[selectedClass][str] === currentUser?.id :
                Object.values(assignments[selectedClass][str]).some(tid => tid === currentUser?.id)
              ))) && (
                <button className="btn btn-primary" onClick={() => {
                  const initial = {};
                  results.forEach(s => { initial[s.id] = { ...s.marks }; });
                  setEditMarks(initial);
                  setEditMode(true);
                }}><EditIcon size={16} /> Enter Marks</button>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="filter-bar" style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Class:</label>
          <Select 
            value={selectedClass} 
            onChange={e => { setSelectedClass(e.target.value); setStreamFilter('All'); setActiveTab('marks'); }}
            options={[
              { id: 'All', label: 'All Classes' },
              ...Object.entries(CBC_STRUCTURE).flatMap(([ln, ld]) => {
                const isMatch = (g1, g2) => g1?.toLowerCase().trim() === g2?.toLowerCase().trim();
                const active = ld.grades.filter(g => 
                  (profile.activeClasses || []).some(ac => isMatch(ac, g))
                );
                return active.map(g => ({ id: g, label: g }));
              })
            ]}
            style={{ minWidth: 160 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Stream:</label>
          <Select 
            value={streamFilter} 
            onChange={(e) => setStreamFilter(e.target.value)}
            options={[
              { id: 'All', label: 'All Streams' },
              ...(selectedClass !== 'All' 
                ? (profile.streamsPerClass?.[selectedClass] || []) 
                : Array.from(new Set(
                    Object.entries(profile.streamsPerClass || {})
                      .filter(([cls]) => (profile.activeClasses || []).includes(cls))
                      .flatMap(([, streams]) => streams)
                  ))
              ).map(stream => ({ id: stream, label: stream }))
            ]}
            style={{ minWidth: 140 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Exam:</label>
          <Select 
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            options={robustExams.map(re => ({ id: re.name, label: re.name }))}
            style={{ minWidth: 150 }}
          />
          {examType && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginLeft: 15, paddingLeft: 15, borderLeft: '1.5px solid var(--border)' }}>
              {/* STAFF STATUS — only show if teacher_portal feature is enabled */}
              {hasTeacherPortal && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 2, letterSpacing: '0.05em' }}>
                  Staff Portal
                </span>
                {robustExams.find(e => e.name === examType)?.status === 'published' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, border: '1px solid var(--primary-border)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
                    Open for Grading
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, border: '1px solid #fee2e2' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                    Locked
                  </div>
                )}
              </div>
              )}

              {/* PARENT STATUS — only show if parent_portal feature is enabled */}
              {hasParentPortal && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 2, letterSpacing: '0.05em' }}>
                  Parent Portal
                </span>
                {robustExams.find(e => e.name === examType)?.released_to_parents ? (
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', 
                    background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)', 
                    color: '#15803d', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900, 
                    border: '1.5px solid #bbf7d0', boxShadow: '0 4px 10px rgba(34, 197, 94, 0.1)' 
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} className="animate-pulse" />
                    Live for Parents
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#f8fafc', color: '#64748b', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, border: '1.5px solid var(--border)' }}>
                    <EyeOffIcon size={12} />
                    Hidden
                  </div>
                )}
              </div>
              )}

              {isAdmin && hasParentPortal && (
                <button
                  onClick={handleReleaseResults}
                  disabled={loading}
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: '12px',
                    background: robustExams.find(e => e.name === examType)?.released_to_parents 
                      ? 'var(--bg-card)' 
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: robustExams.find(e => e.name === examType)?.released_to_parents ? 'var(--text-light)' : '#fff',
                    border: robustExams.find(e => e.name === examType)?.released_to_parents ? '1.5px solid var(--border)' : 'none',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    boxShadow: robustExams.find(e => e.name === examType)?.released_to_parents ? 'none' : '0 6px 15px -3px rgba(16, 185, 129, 0.4)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    height: 36
                  }}
                >
                  <RocketIcon size={16} />
                  {robustExams.find(e => e.name === examType)?.released_to_parents ? 'Hide from Parents' : 'Post to Parents'}
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />
        <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>{selectedClass}</span>
        <span className="badge badge-outline" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>{selectedClass === 'All' ? 'All Levels' : level}</span>
      </div>

      {/* View Tabs — pill strip */}
      <div className="scroll-x-hide" style={{ alignItems:'center', marginBottom:20, padding:'4px 5px', background:'var(--bg)', borderRadius:12, border:'1px solid var(--border)', width:'max-content', maxWidth: '100%' }}>
        {[
          { key:'marks',       icon: isEarlyYears ? <FlagIcon /> : <BookIcon />, label: isEarlyYears ? 'Competency Focus' : 'Marks & Rankings' },
          ...(!isEarlyYears ? [{ key:'subjects', icon:<DashboardIcon />, label:'Subject Rankings' }] : []),
          ...(level !== 'Secondary (8-4-4)' ? [{ key:'cbc', icon:<FlagIcon />, label:'CBC Levels' }] : []),
          { key:'performance', icon:<TeacherIcon />, label:'Teacher Performance' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'8px 18px', borderRadius:9, border:'none',
              fontFamily:'inherit', fontSize:'0.85rem',
              fontWeight: activeTab===t.key ? 700 : 500,
              cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap',
              background: activeTab===t.key ? 'var(--bg-card)' : 'transparent',
              color: activeTab===t.key ? 'var(--primary)' : 'var(--text-light)',
              boxShadow: activeTab===t.key ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
            }}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* MARKS TAB */}
      {activeTab === 'marks' && (
        <div className="card">
          <div className="card-header">
            <h3>{selectedClass === 'All' ? 'All Classes' : selectedClass} — {results.length} Students {isEarlyYears && selectedClass !== 'All' && <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 400 }}>  (Activity-based assessment)</span>}</h3>
            {!editMode && !isEarlyYears && <span className="text-muted" style={{ fontSize: '0.82rem' }}>Click a name for report card</span>}
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {isEarlyYears ? (
              /* Early Years: competency-focused view */
              <table className="data-table responsive-table">
                <thead><tr><th>Student</th>{subjects.map(s => <th key={s} style={{ fontSize: '0.72rem' }}>{subjectAbbr(s)}</th>)}<th>Overall</th></tr></thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan={subjects.length + 2} className="text-center text-muted" style={{ padding: 40 }}>{selectedClass === 'All' ? 'Please select a specific class to view and manage grades.' : 'No students in this class'}</td></tr>
                  ) : results.map(s => {
                    const studentCbc = cbcData[s.id] || {};
                    return (
                      <tr key={s.id}>
                        <td data-label="Student">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setShowReport(s)}>{s.name}</strong>
                            <button 
                              onClick={() => setShowSubjectPicker(s)}
                              className="btn-icon" 
                              title="Manage Student Subjects"
                              style={{ padding: 4, opacity: 0.6 }}
                            >
                              <SettingsIcon size={14} />
                            </button>
                          </div>
                        </td>
                        {subjects.map(sub => {
                          const lv = studentCbc[sub] || 'Meeting Expectation';
                          return (
                            <td key={sub}>
                              <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700,
                                background: `${cbcColor(lv)}18`, color: cbcColor(lv), border: `1.5px solid ${cbcColor(lv)}40` }}>
                                {cbcLabel(lv)}
                              </span>
                            </td>
                          );
                        })}
                        <td>
                          {(() => {
                            const levels = subjects.map(sub => (studentCbc[sub] || 'Meeting Expectation'));
                            const score = levels.reduce((s, l) => s + (l.startsWith('Exceeding') ? 4 : l.startsWith('Meeting') ? 3 : l.startsWith('Approaching') ? 2 : 1), 0);
                            const avg = score / levels.length;
                            const overall = avg >= 3.5 ? 'Exceeding' : avg >= 2.5 ? 'Meeting' : avg >= 1.5 ? 'Approaching' : 'Below';
                            const c = { Exceeding: '#10b981', Meeting: '#3b82f6', Approaching: '#f59e0b', Below: '#ef4444' };
                            return <span style={{ color: c[overall], fontWeight: 700, fontSize: '0.82rem' }}>{overall}</span>;
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* Upper Primary / Junior Secondary: marks-based view */
              <table className="data-table responsive-table">
                <thead><tr><th>Rank</th><th>Adm No</th><th>Name</th>{subjects.map(s => <th key={s} style={{ fontSize: '0.72rem' }}>{subjectAbbr(s)}</th>)}<th>Total</th><th>Avg</th><th>Grade</th><th>Action</th></tr></thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan={subjects.length + 5} className="text-center text-muted" style={{ padding: 40 }}>{selectedClass === 'All' ? 'Please select a specific class to view and manage grades.' : 'No students in this class'}</td></tr>
                  ) : results.map((s, rowIdx) => {
                    const marks = editMode ? editMarks[s.id] || {} : s.marks;
                    const total = editMode ? Object.values(marks).reduce((a, b) => a + b, 0) : s.total;
                    const avg = editMode ? (Object.keys(marks).length > 0 ? total / Object.keys(marks).length : 0) : s.average;
                    const { grade, color } = getGrade(avg);
                    return (
                      <tr key={s.id}>
                        <td><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: s.rank <= 3 ? '#fef3c7' : '#f1f5f9', color: s.rank <= 3 ? '#d97706' : '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>{s.rank}</span></td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.admNo}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => !editMode && setShowReport(s)}>{s.name}</strong>
                            {!editMode && (
                              <button 
                                onClick={() => setShowSubjectPicker(s)}
                                className="btn-icon" 
                                title="Manage Subjects"
                                style={{ padding: 4, opacity: 0.6 }}
                              >
                                <SettingsIcon size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        {subjects.map((sub, colIdx) => {
                          // Check if this teacher is assigned to this subject in THIS stream
                          const teacherAssigned = (assignments[selectedClass]?.[s.stream || 'General']?.[sub] === currentUser?.id) || 
                                                 (assignments[selectedClass]?.['General']?.[sub] === currentUser?.id);
                          const canEdit = isAdmin || teacherAssigned;
                          
                          const isEnrolled = !s.subjects || s.subjects.length === 0 || s.subjects.includes(sub);
                          if (!isEnrolled) {
                            return <td key={sub} className="text-center text-muted" style={{ background: 'var(--bg)', opacity: 0.4 }}>—</td>;
                          }
                          
                          return (
                            <td key={sub}>
                              {editMode && canEdit ? (
                                <input id={`mark-r${rowIdx}-c${colIdx}`} type="number" min="0" max="100" value={marks[sub] !== undefined ? marks[sub] : ''} 
                                  onChange={e => handleMarkChange(s.id, sub, e.target.value)}
                                  onKeyDown={e => handleMarkKeyDown(e, rowIdx, colIdx)}
                                  onPaste={e => handleMarkPaste(e, rowIdx, colIdx)}
                                  style={{ width: 50, padding: '3px 5px', border: '2px solid var(--primary)', borderRadius: 4, textAlign: 'center', fontFamily: 'var(--font)', fontSize: '0.82rem', background: 'rgba(59,130,246,0.05)' }} />
                              ) : (
                                <span style={{ color: (marks[sub] || 0) < 50 && marks[sub] !== undefined ? '#ef4444' : 'inherit', opacity: editMode && !canEdit ? 0.5 : 1 }}>
                                  {marks[sub] !== undefined ? marks[sub] : '—'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td data-label="Total" className="font-bold">{total}</td>
                        <td data-label="Avg" className="font-bold">{typeof avg === 'number' ? avg.toFixed(1) : avg}</td>
                        <td data-label="Grade"><span style={{ color, fontWeight: 700 }}>{grade}</span></td>
                        <td data-label="Action"><button className="btn btn-ghost btn-sm" onClick={() => setShowReport(s)}><BookIcon size={14} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUBJECT RANKINGS TAB */}
      {activeTab === 'subjects' && !isEarlyYears && (
        <div className="card">
          <div className="card-header">
            <h3>Subject Rankings — {selectedClass}</h3>
            <Select 
              value={selectedSubject} 
              onChange={e => setSelectedSubject(e.target.value)}
              options={subjects.map(s => ({ id: s, label: s }))}
              style={{ minWidth: 160 }}
            />
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="data-table responsive-table">
              <thead><tr><th>Rank</th><th>Student</th><th>Marks</th><th>Grade</th><th>Performance</th></tr></thead>
              <tbody>
                {(subjectRankings[selectedSubject] || []).map(s => {
                  const { grade, color } = getGrade(s.mark);
                  return (
                    <tr key={s.id}>
                      <td data-label="Rank"><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: s.rank <= 3 ? '#fef3c7' : '#f1f5f9', color: s.rank <= 3 ? '#d97706' : '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>{s.rank}</span></td>
                      <td data-label="Student"><strong>{s.name}</strong></td>
                      <td data-label="Marks" className="font-bold">{s.mark}</td>
                      <td data-label="Grade"><span style={{ color, fontWeight: 700 }}>{grade}</span></td>
                      <td data-label="Performance" style={{ width: '40%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 6, height: 18, overflow: 'hidden' }}>
                            <div style={{ width: `${s.mark}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}aa)`, borderRadius: 6 }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: 35 }}>{s.mark}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CBC COMPETENCIES TAB */}
      {activeTab === 'cbc' && (
        <div className="animate-in">
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3><FlagIcon size={20} /> CBC Competency Matrix — {selectedClass}</h3>
            </div>
            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    {subjects.map(s => <th key={s} style={{ fontSize: '0.7rem' }}>{subjectAbbr(s)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {results.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong></td>
                      {subjects.map(sub => {
                        const lv = (cbcData[s.id] || {})[sub] || 'Meeting Expectation';
                        return (
                          <td key={sub}>
                            <Select 
                              value={lv} 
                              onChange={e => handleCBCChange(s.id, sub, e.target.value)}
                              options={CBC_LEVELS.map(l => ({ id: l, label: l.split(' ')[0] }))}
                              variant="minimal"
                              style={{ 
                                padding: '2px 4px', 
                                fontSize: '0.72rem', 
                                border: `2px solid ${cbcColor(lv)}`, 
                                borderRadius: 6,
                                background: `${cbcColor(lv)}15`, 
                                color: cbcColor(lv), 
                                fontWeight: 600, 
                                width: '100%', 
                                minWidth: 70 
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3><LeafIcon size={20} /> Core Competencies — {selectedClass}</h3>
            </div>
            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    {CBC_CORE_COMPETENCIES.map(c => <th key={c} style={{ fontSize: '0.7rem' }}>{c.split(' ').slice(0,2).join(' ')}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {results.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong></td>
                      {CBC_CORE_COMPETENCIES.map(comp => {
                        const lv = (coreCompData[s.id] || {})[comp] || 'Meeting Expectation';
                        return (
                          <td key={comp}>
                            <Select 
                              value={lv} 
                              onChange={async (e) => {
                                try {
                                  await import('../../data/academicsStore').then(m => m.setCoreCompetency(s.id, comp, e.target.value));
                                  const newData = await import('../../data/academicsStore').then(m => m.getCoreCompetencies());
                                  setCoreCompData(newData);
                                } catch(err) { alert({ title: 'Update Error', message: err.message, variant: 'danger' }); }
                              }}
                              options={CBC_LEVELS.map(l => ({ id: l, label: l.split(' ')[0] }))}
                              variant="minimal"
                              style={{ 
                                padding: '2px 4px', 
                                fontSize: '0.72rem', 
                                border: `2px solid ${cbcColor(lv)}`, 
                                borderRadius: 6,
                                background: `${cbcColor(lv)}15`, 
                                color: cbcColor(lv), 
                                fontWeight: 600, 
                                width: '100%', 
                                minWidth: 70 
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PERFORMANCE ANALYTICS TAB */}
      {activeTab === 'performance' && (
        <div className="animate-in">
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--primary), var(--purple))', color: '#fff' }}>
              <h3 style={{ color: '#fff' }}><RocketIcon size={20} /> Academic Competition Leaderboard</h3>
              <p style={{ fontSize: '0.8rem', opacity: 0.9 }}>Celebrating our top performers this term</p>
            </div>
            <div className="card-body">
              <div className="responsive-grid-stack">
                {/* Overall Top 5 */}
                <div style={{ padding: 16, border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <FlagIcon size={18} color="var(--warning)" />
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Top 5 Overall</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {results.slice(0, 5).map((s, idx) => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>#{idx + 1}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.name}</span>
                        </div>
                        <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>{s.average.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subject Champions */}
                <div style={{ padding: 16, border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <SparklesIcon size={18} color="var(--primary)" />
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Subject Champions</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {subjects.slice(0, 5).map(sub => {
                      const top = (subjectRankings[sub] || [])[0];
                      if (!top) return null;
                      return (
                        <div key={sub} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>{sub}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{top.name}</div>
                          </div>
                          <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>{top.mark}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* removed Academic Health section by user request */}
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="card-header"><h3><DashboardIcon size={20} /> Subject Performance Analysis — {selectedClass}</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead><tr><th>Subject</th><th>Mean Marks</th><th>Highest</th><th>Lowest</th><th>Dev. from Last Term</th></tr></thead>
                <tbody>
                  {subjects.map(sub => {
                    const marks = results.map(s => s.marks[sub] || 0).filter(m => m > 0);
                    if (marks.length === 0) return null;
                    const avg = (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1);
                    const high = Math.max(...marks);
                    const low = Math.min(...marks);
                    return (
                      <tr key={sub}>
                        <td><strong>{sub}</strong></td>
                        <td className="font-bold">{avg}%</td>
                        <td className="text-success">{high}</td>
                        <td className="text-danger">{low}</td>
                        <td><span className="text-muted" style={{opacity: 0.5}}>—</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Subject Teacher Engagement removed */}
        </div>
      )}

      {/* Subject Picker Modal */}
      {showSubjectPicker && (
        <SubjectPicker 
          student={showSubjectPicker} 
          allSubjects={subjects} 
          onClose={() => setShowSubjectPicker(null)} 
          onSave={handleSubjectSelection} 
        />
      )}

      {/* Report Card Modal */}
      {showReport && <ReportCardModal student={showReport} cbcData={cbcData} coreCompData={coreCompData} onClose={() => setShowReport(null)} getGrade={getGrade} cbcLabel={cbcLabel} cbcColor={cbcColor} classSize={results.length} subjects={subjects} level={level} isEarlyYears={isEarlyYears} profile={profile} examType={examType} />}
    </div>
  );
}

function ReportCardModal({ student, cbcData, coreCompData, onClose, getGrade, cbcLabel, cbcColor, classSize, subjects, level, isEarlyYears, profile, examType }) {
  const { alert } = useDialog();
  const { grade } = getGrade(student.average);
  const studentCBC = cbcData[student.id] || {};
  const studentCC = coreCompData[student.id] || {};

  const ccHtml = () => CBC_CORE_COMPETENCIES.map(comp => {
    const lv = studentCC[comp] || 'Meeting Expectation';
    const cls = lv.startsWith('Exceeding') ? 'ee' : lv.startsWith('Meeting') ? 'me' : lv.startsWith('Approaching') ? 'ae' : 'be';
    return `<tr><td>${comp}</td><td class="${cls}">${lv}</td></tr>`;
  }).join('');

  const handlePrint = async () => {
    try {
      const headerStr = await getPrintHeader(`Term 1 ${examType} Report Card — 2026`);
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>Report Card - ${student.name}</title>
      <style>@page{margin:0}body{font-family:Arial,sans-serif;padding:15mm;color:#1e293b;max-width:700px;margin:0 auto}
      .level{display:inline-block;background:#e2e8f0;padding:3px 12px;border-radius:10px;font-size:11px;margin-top:6px;color:#475569}
      .info{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:18px;font-size:12px}.info strong{color:#64748b}
      table{width:100%;border-collapse:collapse;margin-bottom:18px}th,td{border:1px solid #e2e8f0;padding:7px 10px;text-align:left;font-size:11px}
      th{background:#1e3a5f;color:white}
      .ee{color:#10b981;font-weight:700}.me{color:#3b82f6;font-weight:700}.ae{color:#f59e0b;font-weight:700}.be{color:#ef4444;font-weight:700}
      .sigs{display:flex;justify-content:space-between;margin-top:40px;font-size:11px}.sigs div{text-align:center}.sigs .ln{width:130px;border-top:1px solid #1e3a5f;margin:0 auto 5px}
      .strengths{margin:14px 0;font-size:12px}.strengths strong{color:#1e3a5f}
      .section-title{margin:20px 0 8px;font-size:13px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #e2e8f0;padding-bottom:4px}
      </style></head><body>
      ${headerStr}
      <div style="text-align:center;margin-top:-14px;margin-bottom:18px">
        ${isEarlyYears ? `<div class="level">${level}</div>` : ''}
        <div class="level" style="background:#f59e0b;color:white;margin-left:8px">${examType}</div>
      </div>
    <div class="info">
      <div style="font-size: 1.1rem; color: var(--primary); font-weight: 800; border-bottom: 2px solid var(--border); margin-bottom: 12px; padding-bottom: 8px;">ADM NO: ${student.admNo} — ${student.name}</div>
      <div><strong>Class:</strong> ${student.class}</div>${!isEarlyYears ? `<div><strong>Position:</strong> ${student.rank} of ${classSize}</div>` : ''}
    </div>
    <div class="section-title">${isEarlyYears ? 'Learning Areas & Development' : 'Academic Performance'}</div>
    <table><thead><tr><th>Learning Area</th>${!isEarlyYears ? '<th>Marks</th><th>Grade</th>' : '<th>CBC Level</th><th>Remarks</th>'}</tr></thead>
    <tbody>${(student.enrolledSubjects || subjects).map(sub => {
      const mark = student.marks[sub] || 0;
      const g = getGrade(mark);
      const cbc = studentCBC[sub] || 'Meeting Expectation';
      const cbcCls = cbc.startsWith('Exceeding') ? 'ee' : cbc.startsWith('Meeting') ? 'me' : cbc.startsWith('Approaching') ? 'ae' : 'be';
      const remark = isEarlyYears
        ? (cbc.startsWith('Exceeding') ? 'Outstanding progress' : cbc.startsWith('Meeting') ? 'Good progress' : cbc.startsWith('Approaching') ? 'Developing well' : 'Needs support')
        : (mark >= 80 ? 'Excellent' : mark >= 70 ? 'Good' : mark >= 60 ? 'Average' : mark >= 50 ? 'Below Avg' : 'Needs Improvement');
      return `<tr><td>${sub}</td>${!isEarlyYears ? `<td style="font-weight:700">${mark}</td><td style="color:${g.color};font-weight:700">${g.grade}</td>` : `<td class="${cbcCls}">${cbc}</td><td>${remark}</td>`}</tr>`;
    }).join('')}
    ${!isEarlyYears ? `<tr style="font-weight:700;background:#f8fafc"><td>Total</td><td colspan="2">${student.total} / ${(student.enrolledSubjects?.length || subjects.length) * 100} — Average: ${student.average}% (Grade ${grade})</td></tr>` : ''}
    </tbody></table>
    ${isEarlyYears ? `
    <div class="section-title">Core Competencies & Values</div>
    <table><thead><tr><th>Competency</th><th>Rating</th></tr></thead><tbody>${ccHtml()}</tbody></table>
    <div class="strengths"><strong>Learner Strengths:</strong> ___________________________________</div>
    <div class="strengths"><strong>Areas for Improvement:</strong> ___________________________________</div>
    <div class="strengths"><strong>Class Teacher Remarks:</strong> ___________________________________</div>
    <div class="strengths"><strong>Principal Remarks:</strong> ___________________________________</div>
    ` : `
    <div class="strengths"><strong>Class Teacher Remarks:</strong> __________________________________________________  <strong>Name:</strong> _______________________</div>
    <div class="strengths"><strong>Principal Remarks:</strong> ______________________________________________________  <strong>Name:</strong> _______________________</div>
    `}
      <div class="sigs"><div><div class="ln"></div>Class Teacher</div><div><div class="ln"></div>Principal</div><div><div class="ln"></div>Parent/Guardian</div></div>
      </body></html>`);
      w.document.close(); w.print();
    } catch(err) { alert({ title: 'Print Error', message: "Print failed: " + err.message, variant: 'danger' }); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div className="modal-header"><h3><BookIcon size={20} /> Report Card — {student.name}</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="report-card">
            <div className="report-card-header"><h1><SchoolIcon size={24} /> {profile?.schoolName || ''}</h1><h2>Term 1 {examType} Report Card — 2026</h2>
              {isEarlyYears && <span className="badge badge-info" style={{ marginTop: 6 }}>{level}</span>}
            </div>
            <div className="report-card-info">
              <div><strong>Adm No:</strong> {student.admNo}</div><div><strong>Student:</strong> {student.name}</div>
              <div><strong>Class:</strong> {student.class}</div>{!isEarlyYears && <div><strong>Position:</strong> {student.rank} of {classSize}</div>}
            </div>

            {/* Academic Performance Table */}
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 8, borderBottom: '2px solid var(--border)', paddingBottom: 4 }}>
              {isEarlyYears ? <LeafIcon size={16} /> : <BookIcon size={16} />} {isEarlyYears ? 'Learning Areas & Development' : 'Academic Performance'}
            </h4>
            <table>
              <thead><tr><th>Learning Area</th>{!isEarlyYears ? <><th>Marks</th><th>Grade</th></> : <><th>CBC Level</th><th>Remarks</th></>}</tr></thead>
              <tbody>
                {(student.enrolledSubjects || subjects).map(sub => {
                  const mark = student.marks[sub] || 0;
                  const g = getGrade(mark);
                  const cbc = studentCBC[sub] || 'Meeting Expectation';
                  const remark = isEarlyYears
                    ? (cbc.startsWith('Exceeding') ? 'Outstanding progress' : cbc.startsWith('Meeting') ? 'Good progress' : cbc.startsWith('Approaching') ? 'Developing well' : 'Needs support')
                    : (mark >= 80 ? 'Excellent' : mark >= 70 ? 'Good' : mark >= 60 ? 'Average' : mark >= 50 ? 'Below Avg' : 'Needs Improvement');
                  return (
                    <tr key={sub}>
                      <td>{sub}</td>
                      {!isEarlyYears ? <><td className="font-bold">{mark}</td><td style={{ color: g.color, fontWeight: 700 }}>{g.grade}</td></> : 
                      <><td style={{ color: cbcColor(cbc), fontWeight: 600, fontSize: '0.82rem' }}>{cbc}</td>
                      <td className="text-muted" style={{ fontSize: '0.82rem' }}>{remark}</td></>}
                    </tr>
                  );
                })}
                {!isEarlyYears && (
                  <tr style={{ fontWeight: 700, background: '#f8fafc' }}>
                    <td>Total</td><td colSpan="2">{student.total} / {(student.enrolledSubjects?.length || subjects.length) * 100} — Avg: {student.average}% — Grade {grade}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Core Competencies & Values */}
            {isEarlyYears && (
              <>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)', marginTop: 20, marginBottom: 8, borderBottom: '2px solid var(--border)', paddingBottom: 4 }}>
                  <BookIcon size={16} /> Core Competencies & Values
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {CBC_CORE_COMPETENCIES.map(comp => {
                    const lv = studentCC[comp] || 'Meeting Expectation';
                    return (
                      <div key={comp} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 10px', borderRadius: 6, fontSize: '0.8rem',
                        background: 'var(--bg)', border: '1px solid var(--border-light)',
                      }}>
                        <span style={{ fontWeight: 500 }}>{comp}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700,
                          color: cbcColor(lv), background: `${cbcColor(lv)}15`,
                        }}>{cbcLabel(lv)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div style={{ marginTop: 20, fontSize: '0.88rem' }}>
              {isEarlyYears ? (
                <>
                  <p><strong>Learner Strengths:</strong> ________________________________</p>
                  <p><strong>Areas for Improvement:</strong> ________________________________</p>
                  <p><strong>Class Teacher Remarks:</strong> ________________________________</p>
                  <p><strong>Principal Remarks:</strong> ________________________________</p>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <p style={{ borderBottom: '1px dotted var(--border)', paddingBottom: 5 }}><strong>Class Teacher Remarks:</strong> ____________________________________________________  <strong>Name:</strong> ________________</p>
                  <p style={{ borderBottom: '1px dotted var(--border)', paddingBottom: 5 }}><strong>Principal Remarks:</strong> ________________________________________________________  <strong>Name:</strong> ________________</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handlePrint}><PrintIcon size={16} /> Print</button>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                downloadReportCardPDF(
                  student,
                  student.marks || {},
                  { teacherComments: '', headComments: '' },
                  { schoolName: profile?.schoolName || 'Termly Academy', term: examType, year: '2026' },
                  { isDraft: false }
                );
              }}
              style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
            >
              <BookIcon size={16} /> Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MODAL: Manage which subjects a student specifically studies
 */
function SubjectPicker({ student, allSubjects, onClose, onSave }) {
  const [selected, setSelected] = useState(student.enrolledSubjects && student.enrolledSubjects.length > 0 ? student.enrolledSubjects : (student.subjects && student.subjects.length > 0 ? student.subjects : allSubjects));

  const toggle = (sub) => {
    if (selected.includes(sub)) setSelected(selected.filter(s => s !== sub));
    else setSelected([...selected, sub]);
  };

  const allSelected = selected.length === allSubjects.length;
  const toggleAll = () => setSelected(allSelected ? [] : [...allSubjects]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3><SettingsIcon size={20} /> Manage Subjects</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '10px 14px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(59,130,246,0.06))', borderRadius: 10, border: '1px solid rgba(99,102,241,0.15)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{student.name}</div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>Class {student.class} &middot; {selected.length} of {allSubjects.length} subjects selected</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={toggleAll} style={{ fontSize: '0.78rem' }}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <p className="text-muted" style={{ marginBottom: 14, fontSize: '0.82rem' }}>Tick the subjects this student studies. Unticked subjects won't appear in marks entry or report cards.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {allSubjects.map(sub => {
              const isChecked = selected.includes(sub);
              return (
                <label key={sub} style={{ 
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', 
                  background: isChecked ? 'rgba(99,102,241,0.06)' : 'var(--bg)', 
                  borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  border: isChecked ? '1.5px solid rgba(99,102,241,0.3)' : '1.5px solid var(--border)',
                }}>
                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={() => toggle(sub)} 
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: isChecked ? 600 : 400, color: isChecked ? 'var(--text)' : 'var(--text-light)' }}>{sub}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(selected)} disabled={selected.length === 0}>
            <SaveIcon size={15} /> Save ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}
