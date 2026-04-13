import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentSchoolId, getStudents, getSchoolProfile, getPrintHeader } from '../../data/store';
import { CBC_STRUCTURE, getSubjectsForGrade } from '../../data/seedData';
import Select from '../../components/Common/Select';
import Loader from '../../components/Common/Loader';
import { useDialog } from '../../contexts/DialogContext';
import {
  SearchIcon, PrintIcon, BookIcon, UserIcon
} from '../../components/CommonIcons';

export default function Reports({ currentPeriodId }) {
  const { alert } = useDialog();
  const [activeTab, setActiveTab] = useState('by-class');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({});
  const [students, setStudents] = useState([]);

  useEffect(() => {
    (async () => {
      const [pf, st] = await Promise.all([getSchoolProfile(), getStudents()]);
      setProfile(pf);
      setStudents(st);
    })();
  }, [currentPeriodId]);

  return (
    <div className="card animate-in pb-12">
      <div className="card-header border-b border-gray-100 flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold">Library Reports</h2>
          <p className="text-sm text-gray-500">Analytics and printouts for library usage.</p>
        </div>

        <div className="tab-nav mb-0 flex gap-1 bg-gray-50 p-1 rounded-xl w-full max-w-lg">
          {[
            { id: 'by-class', label: 'By Class & Stream' },
            { id: 'by-subject', label: 'By Subject' },
            { id: 'student-history', label: 'By Student' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all flex justify-center items-center ${activeTab === tab.id ? 'bg-white shadow text-primary' : 'text-gray-500 hover:bg-gray-100'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-body p-6">
        {activeTab === 'by-class' && <ByClassReport profile={profile} students={students} />}
        {activeTab === 'by-subject' && <BySubjectReport profile={profile} students={students} />}
        {activeTab === 'student-history' && <StudentHistoryReport students={students} />}
      </div>
    </div>
  );
}

// ============================================================================
// PRINT HELPER
// ============================================================================
async function printTable(title, tableHTML) {
  try {
    const h = await getPrintHeader(title);
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${title}</title><style>
      body{font-family:Arial,sans-serif;padding:20px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #e2e8f0;padding:8px 12px;font-size:13px;text-align:left}
      th{background:#0EA5E9;color:#fff}
    </style></head><body>${h}${tableHTML}</body></html>`);
    w.document.close(); 
    setTimeout(() => w.print(), 500);
  } catch (err) {
    console.error('Print failed', err);
  }
}

// ============================================================================
// BY CLASS & STREAM REPORT
// ============================================================================
function ByClassReport({ profile, students }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filterClass, setFilterClass] = useState('All');
  const [filterStream, setFilterStream] = useState('All');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const schoolId = getCurrentSchoolId();
        // Fetch only borrowed, overdue, or lost books
        const { data: borrows } = await supabase.from('borrow_records')
          .select('id, borrow_date, due_date, status, students(id, name, class, adm_no), book_copies(copy_code, books(title, subject))')
          .eq('school_id', schoolId)
          .in('status', ['borrowed', 'overdue', 'lost'])
          .order('due_date', { ascending: true });
        
        setData(borrows || []);
      } catch (e) {
        console.error('Report error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(r => {
      if (!r.students) return false;
      // We must match student stream manually if it's not in the DB record
      const stDetails = students.find(s => s.id === r.students.id);
      const stream = stDetails?.stream || '';
      const matchClass = filterClass === 'All' || r.students.class === filterClass;
      const matchStream = filterStream === 'All' || stream === filterStream;
      return matchClass && matchStream;
    });
  }, [data, filterClass, filterStream, students]);

  const handlePrint = () => {
    const title = `Borrowed & Lost Books - ${filterClass === 'All' ? 'All Classes' : filterClass} ${filterStream !== 'All' ? `(${filterStream})` : ''}`;
    let html = `<table><thead><tr><th>Student</th><th>Adm No</th><th>Class & Stream</th><th>Book Title</th><th>Copy Code</th><th>Status</th><th>Due/Days Overdue</th></tr></thead><tbody>`;
    filteredData.forEach(r => {
      const st = students.find(s => s.id === r.students.id);
      html += `<tr>
        <td>${r.students.name}</td>
        <td>${r.students.adm_no || '--'}</td>
        <td>${r.students.class} ${st?.stream ? st.stream : ''}</td>
        <td>${r.book_copies?.books?.title}</td>
        <td>${r.book_copies?.copy_code}</td>
        <td style="text-transform: uppercase; font-weight: bold;">${r.status}</td>
        <td>${r.due_date}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    printTable(title, html);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-4 items-end mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Class</label>
          <Select 
            value={filterClass}
            onChange={e => { setFilterClass(e.target.value); setFilterStream('All'); }}
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
            style={{ minWidth: 150 }}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Stream</label>
          <Select 
            value={filterStream}
            onChange={e => setFilterStream(e.target.value)}
            options={[
              { id: 'All', label: 'All Streams' },
              ...(filterClass !== 'All' 
                ? (profile.streamsPerClass?.[filterClass] || []) 
                : Object.values(profile.streamsPerClass || {}).flat().filter((v, i, a) => a.indexOf(v) === i)
              ).map(s => ({ id: s, label: s }))
            ]}
            style={{ minWidth: 150 }}
          />
        </div>
        <div className="flex-1 text-right">
          <button className="btn btn-primary flex items-center gap-2 ml-auto" onClick={handlePrint} disabled={filteredData.length === 0}>
            <PrintIcon size={14} /> Print Report
          </button>
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-gray-200 text-gray-500 font-bold uppercase text-xs">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Class</th>
                <th className="p-4">Book Info</th>
                <th className="p-4">Status</th>
                <th className="p-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map(r => {
                const st = students.find(s => s.id === r.students?.id);
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{r.students?.name}</div>
                      <div className="text-xs text-gray-500">Adm: {r.students?.adm_no || '--'}</div>
                    </td>
                    <td className="p-4">{r.students?.class} {st?.stream && <span className="text-gray-400">({st.stream})</span>}</td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-700">{r.book_copies?.books?.title}</div>
                      <code className="text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{r.book_copies?.copy_code}</code>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                        r.status === 'lost' ? 'bg-red-100 text-red-700' : 
                        r.status === 'overdue' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>{r.status}</span>
                    </td>
                    <td className="p-4 text-gray-600">{r.due_date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="text-center py-16 text-gray-400">No active loans for this class/stream.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BY SUBJECT REPORT
// ============================================================================
function BySubjectReport({ profile, students }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filterSubject, setFilterSubject] = useState('');

  const subjects = useMemo(() => {
    const subs = new Set();
    (profile.activeClasses || []).forEach(grade => {
      const gSubs = getSubjectsForGrade(grade, profile);
      if (gSubs) { Object.values(gSubs).flat().forEach(s => subs.add(s)); }
    });
    return Array.from(subs).sort();
  }, [profile]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const schoolId = getCurrentSchoolId();
        const { data: borrows } = await supabase.from('borrow_records')
          .select('id, borrow_date, due_date, status, students(id, name, class, adm_no), book_copies(copy_code, books(title, subject))')
          .eq('school_id', schoolId)
          .in('status', ['borrowed', 'overdue', 'lost'])
          .order('due_date', { ascending: true });
        
        setData(borrows || []);
      } catch (e) {
        console.error('Report error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (subjects.length > 0 && !filterSubject) setFilterSubject(subjects[0]);
  }, [subjects, filterSubject]);

  const filteredData = useMemo(() => {
    return data.filter(r => r.book_copies?.books?.subject === filterSubject);
  }, [data, filterSubject]);

  const handlePrint = () => {
    const title = `Borrowed & Lost Books - ${filterSubject} Subject`;
    let html = `<table><thead><tr><th>Student</th><th>Adm No</th><th>Class</th><th>Book Title</th><th>Copy Code</th><th>Status</th><th>Due/Days Overdue</th></tr></thead><tbody>`;
    filteredData.forEach(r => {
      const st = students.find(s => s.id === r.students.id);
      html += `<tr>
        <td>${r.students.name}</td>
        <td>${r.students.adm_no || '--'}</td>
        <td>${r.students.class} ${st?.stream ? st.stream : ''}</td>
        <td>${r.book_copies?.books?.title}</td>
        <td>${r.book_copies?.copy_code}</td>
        <td style="text-transform: uppercase; font-weight: bold;">${r.status}</td>
        <td>${r.due_date}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    printTable(title, html);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-4 items-end mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Subject</label>
          <Select 
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            options={subjects.map(s => ({ id: s, label: s }))}
            style={{ minWidth: 200 }}
          />
        </div>
        <div className="flex-1 text-right">
          <button className="btn btn-primary flex items-center gap-2 ml-auto" onClick={handlePrint} disabled={filteredData.length === 0}>
            <PrintIcon size={14} /> Print Report
          </button>
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-gray-200 text-gray-500 font-bold uppercase text-xs">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Class</th>
                <th className="p-4">Book Info</th>
                <th className="p-4">Status</th>
                <th className="p-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="font-bold text-gray-800">{r.students?.name}</div>
                    <div className="text-xs text-gray-500">Adm: {r.students?.adm_no || '--'}</div>
                  </td>
                  <td className="p-4">{r.students?.class}</td>
                  <td className="p-4">
                    <div className="font-semibold text-gray-700">{r.book_copies?.books?.title}</div>
                    <code className="text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{r.book_copies?.copy_code}</code>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                      r.status === 'lost' ? 'bg-red-100 text-red-700' : 
                      r.status === 'overdue' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>{r.status}</span>
                  </td>
                  <td className="p-4 text-gray-600">{r.due_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="text-center py-16 text-gray-400">No active loans for this subject.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STUDENT HISTORY REPORT
// ============================================================================
function StudentHistoryReport({ students }) {
  const [searchInput, setSearchInput] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const matchingStudents = useMemo(() => {
    if (searchInput.length < 2) return [];
    const term = searchInput.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(term) ||
      (s.admNo && s.admNo.toLowerCase().includes(term))
    ).slice(0, 5);
  }, [searchInput, students]);

  const selectStudent = async (s) => {
    setSelectedStudent(s);
    setSearchInput(s.name);
    setLoading(true);
    try {
      const { data } = await supabase.from('borrow_records')
        .select('*, book_copies(copy_code, books(title, category))')
        .eq('student_id', s.id)
        .order('created_at', { ascending: false });
      setHistory(data || []);
    } catch (e) {
      console.error('Student history error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!selectedStudent || history.length === 0) return;
    const title = `Library History - ${selectedStudent.name}`;
    let html = `<table><thead><tr><th>Book Title</th><th>Copy Code</th><th>Borrowed</th><th>Due Date</th><th>Returned</th><th>Status</th></tr></thead><tbody>`;
    history.forEach(r => {
      html += `<tr>
        <td>${r.book_copies?.books?.title}</td>
        <td>${r.book_copies?.copy_code}</td>
        <td>${r.borrow_date}</td>
        <td>${r.due_date}</td>
        <td>${r.return_date || '--'}</td>
        <td style="text-transform: uppercase;">${r.status}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    printTable(title, html);
  };

  return (
    <div className="space-y-6">
      {/* Student search */}
      <div className="relative max-w-md">
        <div className="search-bar" style={{ maxWidth: '100%' }}>
          <span className="search-icon"><SearchIcon size={18} /></span>
          <input
            type="text"
            placeholder="Search student by name or admission number..."
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setSelectedStudent(null); setHistory([]); }}
          />
        </div>
        {matchingStudents.length > 0 && !selectedStudent && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden">
            {matchingStudents.map(s => (
              <button
                key={s.id}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                onClick={() => selectStudent(s)}
              >
                <div className="font-semibold text-gray-800">{s.name}</div>
                <div className="text-xs text-gray-500">Adm: {s.admNo} | {s.class}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {selectedStudent && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex-1 mr-4">
              <div className="font-bold text-gray-900 text-lg">{selectedStudent.name}</div>
              <div className="text-sm text-gray-600">Adm: {selectedStudent.admNo} | Class: {selectedStudent.class} | Total Records: {history.length}</div>
            </div>
            <button className="btn btn-primary flex items-center gap-2" onClick={handlePrint} disabled={history.length === 0}>
              <PrintIcon size={14} /> Print Report
            </button>
          </div>

          {loading ? <Loader /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white border-b border-gray-200 text-gray-500 font-bold uppercase text-xs">
                  <tr>
                    <th className="p-4">Book Title</th>
                    <th className="p-4">Copy Code</th>
                    <th className="p-4">Borrowed</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Returned</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-800">{r.book_copies?.books?.title}</td>
                      <td className="p-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{r.book_copies?.copy_code}</code>
                      </td>
                      <td className="p-4">{r.borrow_date}</td>
                      <td className="p-4">{r.due_date}</td>
                      <td className="p-4">{r.return_date || '--'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                          r.status === 'returned' ? 'bg-green-100 text-green-700' :
                          r.status === 'borrowed' ? 'bg-blue-100 text-blue-700' :
                          r.status === 'overdue' ? 'bg-amber-100 text-amber-700' :
                          r.status === 'lost' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length === 0 && (
                <div className="text-center py-12 text-gray-400">No borrow history for this student.</div>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedStudent && (
        <div className="text-center py-16 text-gray-400">
          <UserIcon size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Search for a student above</p>
          <p className="text-sm mt-1">Their full library history will appear here.</p>
        </div>
      )}
    </div>
  );
}
