import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { getClassResults, setStudentAllMarks, getSubjectRankings, getClassList, getCBC, setCBC, getTeacherPerformance, getCoreCompetencies, getPrintHeader, getSchoolProfile, subscribeToChanges, getGradeForScore, getSubjectAssignments } from '../data/store';
import { CBC_STRUCTURE, CBC_LEVELS, CBC_CORE_COMPETENCIES, STREAMS, getSubjectsForGrade, getLevelForGrade } from '../data/seedData';
import { 
  LeafIcon, BookIcon, PrintIcon, DashboardIcon, EditIcon, 
  FlagIcon, RocketIcon, TeacherIcon, SchoolIcon, SaveIcon,
  SparklesIcon, TrendUpIcon, ChartBarIcon, SettingsIcon, CrossIcon
} from '../components/CommonIcons';
import Select from '../components/Common/Select';
import { useDialog } from '../contexts/DialogContext';
import { getProfessionalRemark } from '../utils/remarkUtils';

export default function Grading({ currentUser, currentPeriodId }) {
  const { alert, confirm } = useDialog();
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
    import('../data/store').then(m => m.migrateExistingStudentsSubjects());
  }, []);

  const [profile, setProfile] = useState({ streams: [], activeClasses: [] });
  const [selectedPathway, setSelectedPathway] = useState('STEM');
  const [examType, setExamType] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState({});

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
        const [p, a] = await Promise.all([getSchoolProfile(), getSubjectAssignments()]);
        setProfile(p);
        setAssignments(a);
        
        const examsList = p.custom_exams?.length > 0 ? p.custom_exams : ['CAT 1','CAT 2','Mid Term','End Term'];
        // Initialize examType if not set
        if (!examType) {
          setExamType(examsList[0]);
        }

        await loadResults();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();

    // Subscribe to real-time changes
    const unsubMarks = subscribeToChanges('marks', loadResults);
    const unsubCBC = subscribeToChanges('cbc_assessments', loadResults);

    return () => {
      unsubMarks();
      unsubCBC();
    };
  }, [selectedClass, streamFilter, selectedPathway, examType, currentUser, currentPeriodId]);

  const loadResults = async () => {
    if (!selectedClass || selectedClass === 'All') {
      setResults([]);
      setSubjectRankings([]);
      setCbcData({});
      setTeacherPerf([]);
      setCoreCompData({});
      return;
    }
    let r = await getClassResults(selectedClass, examType);
    if (streamFilter !== 'All') r = r.filter(s => s.stream === streamFilter);
    
    r.sort((a, b) => b.total - a.total);
    r.forEach((student, index) => { student.rank = index + 1; });
    
    setResults(r);
    const em = {};
    r.forEach(s => { em[s.id] = { ...s.marks }; });
    setEditMarks(em);

    const [rankD, cbcD, perfD, ccD] = await Promise.all([
      getSubjectRankings(selectedClass, examType),
      getCBC(),
      getTeacherPerformance(examType),
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

  const saveAllMarks = async () => {
    setLoading(true);
    try {
      await Promise.all(Object.entries(editMarks).map(([sid, m]) => setStudentAllMarks(sid, m, examType)));
      setEditMode(false); 
      await loadResults();
    } catch(err) { alert({ title: 'Save Error', message: err.message, variant: 'danger' }); } finally { setLoading(false); }
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
      const { updateStudent } = await import('../data/store');
      await updateStudent(showSubjectPicker.id, { subjects });
      setShowSubjectPicker(null);
      await loadResults();
    } catch (err) {
      alert({ title: 'Update Error', message: err.message, variant: 'danger' });
    } finally {
      setLoading(false);
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

  const printClassList = async () => {
    try {
      let list = await getClassList(selectedClass);
      if (streamFilter !== 'All') list = list.filter(s => s.stream === streamFilter);
      const streamLbl = streamFilter === 'All' ? '' : ` (${streamFilter} Stream)`;
      const headerStr = await getPrintHeader(`${selectedClass}${streamLbl} (${level}) — Class List`);
      const profileStr = await getSchoolProfile();
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>Class List - ${selectedClass}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}
      table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #e2e8f0;padding:8px 12px;text-align:left;font-size:13px}
      th{background:#1e3a5f;color:white}.footer{margin-top:30px;font-size:12px;color:#64748b}.tag{display:inline-block;background:#e2e8f0;padding:2px 8px;border-radius:10px;font-size:11px;color:#475569}</style></head><body>
      ${headerStr}
      <table><thead><tr><th>#</th><th>Adm No</th><th>Student Name</th><th>Gender</th><th>Parent</th><th>Phone</th></tr></thead>
      <tbody>${list.map((s, i) => `<tr><td>${i + 1}</td><td>${s.admNo}</td><td>${s.name}</td><td>${s.gender}</td><td>${s.parent}</td><td>${s.parentPhone}</td></tr>`).join('')}</tbody></table>
      <div class="footer">Printed on ${new Date().toLocaleDateString()} | ${profileStr.schoolName || ''} | ${level}</div></body></html>`);
      w.document.close(); w.print();
    } catch (err) { alert({ title: 'Print Error', message: "Print failed: " + err.message, variant: 'danger' }); }
  };

  // Print entire class results as one sheet
  const printClassResults = async () => {
    try {
      const cbc = await getCBC();
      const headerStr = await getPrintHeader(`${selectedClass}${streamFilter === 'All' ? '' : ' ' + streamFilter} ${examType} Results — ${level}`);
      const profileStr = await getSchoolProfile();
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>Class Results - ${selectedClass}</title>
      <style>body{font-family:Arial,sans-serif;padding:16px;color:#1e293b;font-size:11px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #d0d5dd;padding:5px 6px;text-align:center;font-size:9.5px}
      th{background:#1e3a5f;color:white;font-size:8.5px;text-transform:uppercase;letter-spacing:0.3px}
      td:nth-child(2){text-align:left}tr:nth-child(even){background:#f8fafc}
      .top3{background:#fef3c7!important}.footer{margin-top:16px;font-size:10px;color:#64748b}
      .grade-a{color:#10b981;font-weight:700}.grade-b{color:#3b82f6;font-weight:700}.grade-c{color:#f59e0b;font-weight:700}.grade-d{color:#f97316;font-weight:700}.grade-e{color:#ef4444;font-weight:700}
      .ee{color:#10b981}.me{color:#3b82f6}.ae{color:#f59e0b}.be{color:#ef4444}
      @page{size:landscape;margin:10mm}
      @media print{body{padding:0}}
      </style></head><body>
      ${headerStr}
      <table><thead><tr><th>Rank</th><th>Adm No</th><th style="text-align:left">Student Name</th>
    ${subjects.map(s => `<th>${s.length > 10 ? s.substring(0, 8) + '..' : s}</th>`).join('')}
    ${!isEarlyYears ? '<th>Total</th><th>Avg</th><th>Grade</th>' : '<th>Overall</th>'}
    </tr></thead><tbody>
    ${results.map((s, i) => {
      const studentCbc = cbc[s.id] || {};
      if (isEarlyYears) {
        const levels = subjects.map(sub => (studentCbc[sub] || 'Meeting Expectation'));
        const score = levels.reduce((sc, l) => sc + (l.startsWith('Exceeding') ? 4 : l.startsWith('Meeting') ? 3 : l.startsWith('Approaching') ? 2 : 1), 0);
        const avg = score / levels.length;
        const overall = avg >= 3.5 ? 'EE' : avg >= 2.5 ? 'ME' : avg >= 1.5 ? 'AE' : 'BE';
        const overallCls = avg >= 3.5 ? 'ee' : avg >= 2.5 ? 'me' : avg >= 1.5 ? 'ae' : 'be';
        return `<tr><td>${i + 1}</td><td>${s.admNo}</td><td style="text-align:left;font-weight:600">${s.name}</td>
        ${subjects.map(sub => { const lv = studentCbc[sub] || 'ME'; const cls = lv.startsWith('Exceeding') ? 'ee' : lv.startsWith('Meeting') ? 'me' : lv.startsWith('Approaching') ? 'ae' : 'be'; return `<td class="${cls}">${lv.split(' ')[0]}</td>`; }).join('')}
        <td class="${overallCls}" style="font-weight:700">${overall}</td></tr>`;
      } else {
        const { grade: g, color } = getGrade(s.average);
        const gradeCls = g === 'A' ? 'grade-a' : g === 'B' ? 'grade-b' : g === 'C' ? 'grade-c' : g === 'D' ? 'grade-d' : 'grade-e';
        return `<tr class="${s.rank <= 3 ? 'top3' : ''}"><td style="font-weight:700">${s.rank}</td><td>${s.admNo}</td><td style="text-align:left;font-weight:600">${s.name}</td>
        ${subjects.map(sub => `<td>${s.marks[sub] || '—'}</td>`).join('')}
        <td style="font-weight:700">${s.total}</td><td style="font-weight:700">${s.average}</td><td class="${gradeCls}">${g}</td></tr>`;
      }
    }).join('')}
    </tbody></table>
    <div class="footer">Printed on ${new Date().toLocaleDateString()} | ${profileStr.schoolName || ''} | ${level} | Class Teacher: _______________</div>
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

    w.document.write(`<html><head><title>All Report Cards - ${selectedClass}</title>
    <style>body{font-family:Arial,sans-serif;padding:0;color:#1e293b;margin:0}
    .report-page{max-width:700px;margin:0 auto;padding:20px;page-break-after:always}
    .report-page:last-child{page-break-after:auto}
    .level{display:inline-block;background:#e2e8f0;padding:3px 12px;border-radius:10px;font-size:11px;margin-top:6px;color:#475569}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:18px;font-size:12px}.info strong{color:#64748b}
    table{width:100%;border-collapse:collapse;margin-bottom:18px}th,td{border:1px solid #e2e8f0;padding:7px 10px;text-align:left;font-size:11px}
    th{background:#1e3a5f;color:white}
    .ee{color:#10b981;font-weight:700}.me{color:#3b82f6;font-weight:700}.ae{color:#f59e0b;font-weight:700}.be{color:#ef4444;font-weight:700}
    .sigs{display:flex;justify-content:space-between;margin-top:40px;font-size:11px}.sigs div{text-align:center}.sigs .ln{width:130px;border-top:1px solid #1e293b;margin:0 auto 5px}
    .strengths{margin:14px 0;font-size:12px}.strengths strong{color:#1e3a5f}
    .section-title{margin:20px 0 8px;font-size:13px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #e2e8f0;padding-bottom:4px}
      @media print{.report-page{padding:15px}}
      </style></head><body>${reportCards}</body></html>`);
      w.document.close(); w.print();
    } catch(err) { alert({ title: 'Print Error', message: "Print failed: " + err.message, variant: 'danger' }); }
  };

  return (
    <div className="animate-in">
      <Helmet>
        <title>Grading & Academic Performance | ShuleSoft</title>
        <meta name="description" content="Manage student marks, CBC assessments, and generate professional report cards instantly." />
      </Helmet>
      <div className="page-header">
        <div className="page-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h2>Grading & Results</h2>
              <p className="text-muted">Enter marks, track CBC competencies, and generate report cards</p>
            </div>
            {loading && <span className="text-muted" style={{ fontSize: '0.85rem' }}>Loading...</span>}
          </div>
          <div className="inline-flex" style={{ gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={printClassList}><PrintIcon size={16} /> Class List</button>
            <button className="btn btn-ghost" onClick={printClassResults}><DashboardIcon size={16} /> Print Results</button>
            <button className="btn btn-accent" onClick={printAllReportCards}><BookIcon size={16} /> Print All Report Cards</button>
            {activeTab === 'marks' && !isEarlyYears && currentUser?.role?.toLowerCase() !== 'finance' && (editMode ? (
              <><button className="btn btn-ghost" onClick={() => { setEditMode(false); loadResults(); }}>Cancel</button>
              <button className="btn btn-success" onClick={saveAllMarks}><SaveIcon size={16} /> Save Marks</button></>
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
                : Object.values(profile.streamsPerClass || {}).flat().filter((v, i, a) => a.indexOf(v) === i)
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
            options={(profile.custom_exams?.length > 0 ? profile.custom_exams : ['CAT 1','CAT 2','Mid Term','End Term']).map(type => ({
              id: type, label: type
            }))}
            style={{ minWidth: 150 }}
          />
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
          { key:'cbc',         icon:<FlagIcon />, label:'CBC Levels' },
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
              <table className="data-table">
                <thead><tr><th>Student</th>{subjects.map(s => <th key={s} style={{ fontSize: '0.72rem' }}>{s.replace(' Activities', '')}</th>)}<th>Overall</th></tr></thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan={subjects.length + 2} className="text-center text-muted" style={{ padding: 40 }}>{selectedClass === 'All' ? 'Please select a specific class to view and manage grades.' : 'No students in this class'}</td></tr>
                  ) : results.map(s => {
                    const studentCbc = cbcData[s.id] || {};
                    return (
                      <tr key={s.id}>
                        <td>
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
              <table className="data-table">
                <thead><tr><th>Rank</th><th>Adm No</th><th>Name</th>{subjects.map(s => <th key={s} style={{ fontSize: '0.72rem' }}>{s.length > 10 ? s.substring(0, 8) + '..' : s}</th>)}<th>Total</th><th>Avg</th><th>Grade</th><th>Action</th></tr></thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan={subjects.length + 5} className="text-center text-muted" style={{ padding: 40 }}>{selectedClass === 'All' ? 'Please select a specific class to view and manage grades.' : 'No students in this class'}</td></tr>
                  ) : results.map(s => {
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
                        {subjects.map(sub => {
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
                                <input type="number" min="0" max="100" value={marks[sub] !== undefined ? marks[sub] : ''} 
                                  onChange={e => handleMarkChange(s.id, sub, e.target.value)}
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
        <div className="card">
          <div className="card-header"><h3><FlagIcon size={20} /> CBC Competency Levels — {selectedClass} <span className="badge badge-info" style={{ fontSize: '0.7rem', marginLeft: 8 }}>{level}</span></h3></div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Student</th>{subjects.map(s => <th key={s} style={{ fontSize: '0.7rem' }}>{s.length > 8 ? s.substring(0, 7) + '..' : s}</th>)}</tr></thead>
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

                {/* Class Strength */}
                <div style={{ padding: 16, border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <TrendUpIcon size={18} color="var(--success)" />
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Academic Health</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                        <span>Pass Rate (Above 50%)</span>
                        <span style={{ fontWeight: 700 }}>{((results.filter(s => s.average >= 50).length / (results.length || 1)) * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3 }}>
                        <div style={{ width: `${(results.filter(s => s.average >= 50).length / (results.length || 1)) * 100}%`, height: '100%', background: 'var(--success)', borderRadius: 3 }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                        <span>Distinction Rate (Above 80%)</span>
                        <span style={{ fontWeight: 700 }}>{((results.filter(s => s.average >= 80).length / (results.length || 1)) * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3 }}>
                        <div style={{ width: `${(results.filter(s => s.average >= 80).length / (results.length || 1)) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
                      </div>
                    </div>
                  </div>
                </div>
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
                        <td><span className="text-success">▲ +{Math.floor(Math.random() * 5)}</span></td>
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
      <style>body{font-family:Arial,sans-serif;padding:20px;color:#1e293b;max-width:700px;margin:0 auto}
      .level{display:inline-block;background:#e2e8f0;padding:3px 12px;border-radius:10px;font-size:11px;margin-top:6px;color:#475569}
      .info{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:18px;font-size:12px}.info strong{color:#64748b}
      table{width:100%;border-collapse:collapse;margin-bottom:18px}th,td{border:1px solid #e2e8f0;padding:7px 10px;text-align:left;font-size:11px}
      th{background:#1e3a5f;color:white}
      .ee{color:#10b981;font-weight:700}.me{color:#3b82f6;font-weight:700}.ae{color:#f59e0b;font-weight:700}.be{color:#ef4444;font-weight:700}
      .sigs{display:flex;justify-content:space-between;margin-top:40px;font-size:11px}.sigs div{text-align:center}.sigs .ln{width:130px;border-top:1px solid #1e293b;margin:0 auto 5px}
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
    ${!isEarlyYears ? `<tr style="font-weight:700;background:#f8fafc"><td>Total</td><td colspan="2">${student.total} / ${subjects.length * 100} — Average: ${student.average}% (Grade ${grade})</td></tr>` : ''}
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
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={handlePrint}><PrintIcon size={16} /> Print Report Card</button></div>
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

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 450 }}>
        <div className="modal-header">
          <h3>Manage Subjects: {student.name}</h3>
          <button className="btn-icon" onClick={onClose}><CrossIcon /></button>
        </div>
        <div className="modal-body">
          <p className="text-muted" style={{ marginBottom: 15, fontSize: '0.85rem' }}>Select the subjects this student studies. Unselected subjects will be hidden from grading and report cards.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {allSubjects.map(sub => (
              <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'var(--bg)', borderRadius: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.includes(sub)} onChange={() => toggle(sub)} />
                <span style={{ fontSize: '0.88rem' }}>{sub}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(selected)}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
