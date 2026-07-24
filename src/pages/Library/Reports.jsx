import React, { useState, useEffect, useMemo } from 'react';
import { getCurrentSchoolId, getSchoolProfile, getPrintHeader } from '../../data/coreStore';
import { getStudents } from '../../data/studentStore';;
import { getAllActiveBorrows, getStudentBorrowHistory, getLibraryBooks, getBookBorrowHistory } from '../../data/libraryStore';
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
  const [books, setBooks] = useState([]);

  useEffect(() => {
    (async () => {
      const [pf, st, bk] = await Promise.all([getSchoolProfile(), getStudents(), getLibraryBooks()]);
      setProfile(pf);
      setStudents(st);
      setBooks(bk || []);
    })();
  }, [currentPeriodId]);

  return (
    <div className="card animate-in pb-12" style={{ overflow: 'visible' }}>
      <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Library Reports</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', margin: '4px 0 0 0' }}>Analytics and printouts for library usage.</p>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '4px', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
          {[
            { id: 'by-class', label: 'By Class & Stream' },
            { id: 'by-subject', label: 'By Subject' },
            { id: 'student-history', label: 'By Student' },
            { id: 'by-book', label: 'By Book' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-light)',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-body p-6" style={{ padding: '24px', overflow: 'visible' }}>
        {activeTab === 'by-class' && <ByClassReport profile={profile} students={students} />}
        {activeTab === 'by-subject' && <BySubjectReport profile={profile} students={students} />}
        {activeTab === 'student-history' && <StudentHistoryReport students={students} />}
        {activeTab === 'by-book' && <ByBookReport books={books} students={students} />}
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
      @page{margin:10mm}
      body{font-family:Arial,sans-serif;padding:0}
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
        const borrows = await getAllActiveBorrows();
        setData(borrows || []);
      } catch (e) { console.error('Report error:', e); } 
      finally { setLoading(false); }
    })();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(r => {
      if (!r.students) return false;
      const stDetails = students.find(s => s.id === r.students.id);
      const stream = stDetails?.stream || '';
      const matchClass = filterClass === 'All' || r.students.class === filterClass;
      const matchStream = filterStream === 'All' || stream === filterStream;
      return matchClass && matchStream;
    });
  }, [data, filterClass, filterStream, students]);

  const handlePrint = () => {
    const title = `Borrowed & Lost Books - ${filterClass === 'All' ? 'All Classes' : filterClass} ${filterStream !== 'All' ? '('+filterStream+')' : ''}`;
    let html = `<table><thead><tr><th>Adm No</th><th>Student</th><th>Class & Stream</th><th>Book Title</th><th>Copy Code</th><th>Status</th><th>Due/Days Overdue</th></tr></thead><tbody>`;
    filteredData.forEach(r => {
      const st = students.find(s => s.id === r.students.id);
      html += `<tr>
        <td>${r.students.adm_no || '--'}</td><td>${r.students.name}</td>
        <td>${r.students.class} ${st?.stream ? st.stream : ''}</td>
        <td>${r.book_copies?.books?.title}</td><td>${r.book_copies?.copy_code}</td>
        <td style="text-transform: uppercase; font-weight: bold;">${r.status}</td><td>${r.due_date}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    printTable(title, html);
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Select Class</label>
          <Select 
            value={filterClass}
            onChange={e => { setFilterClass(e.target.value); setFilterStream('All'); }}
            options={[ { id: 'All', label: 'All Classes' }, ...Object.entries(CBC_STRUCTURE).flatMap(([ln, ld]) => {
                const isMatch = (g1, g2) => g1?.toLowerCase().trim() === g2?.toLowerCase().trim();
                const active = ld.grades.filter(g => (profile.activeClasses || []).some(ac => isMatch(ac, g)) );
                return active.map(g => ({ id: g, label: g }));
              }) ]}
            style={{ minWidth: 150 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Select Stream</label>
          <Select 
            value={filterStream}
            onChange={e => setFilterStream(e.target.value)}
            options={[ { id: 'All', label: 'All Streams' }, ...(filterClass !== 'All' ? (profile.streamsPerClass?.[filterClass] || []) : Object.values(profile.streamsPerClass || {}).flat().filter((v, i, a) => a.indexOf(v) === i)).map(s => ({ id: s, label: s })) ]}
            style={{ minWidth: 150 }}
          />
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={handlePrint} disabled={filteredData.length === 0}>
            <PrintIcon size={14} /> Print Report
          </button>
        </div>
      </div>

      {loading ? <Loader /> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>Student</th><th>Class</th><th>Book Info</th><th>Status</th><th>Due Date</th></tr>
            </thead>
            <tbody>
              {filteredData.map(r => {
                const st = students.find(s => s.id === r.students?.id);
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{r.students?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Adm: {r.students?.adm_no || '--'}</div>
                    </td>
                    <td>{r.students?.class} {st?.stream && <span style={{ color: 'var(--text-light)' }}>({st.stream})</span>}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{r.book_copies?.books?.title}</div>
                      <code style={{ fontSize: '0.75rem', color: '#2563eb', background: '#eff6ff', padding: '2px 4px', borderRadius: '4px' }}>{r.book_copies?.copy_code}</code>
                    </td>
                    <td><span className={`badge badge-${r.status === 'lost' ? 'danger' : r.status === 'overdue' ? 'warning' : 'primary'}`} style={{ textTransform: 'uppercase' }}>{r.status}</span></td>
                    <td style={{ color: 'var(--text-light)' }}>{r.due_date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>No active loans for this class/stream.</div>
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
        const borrows = await getAllActiveBorrows();
        setData(borrows || []);
      } catch (e) { console.error('Report error:', e); } 
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { if (subjects.length > 0 && !filterSubject) setFilterSubject(subjects[0]); }, [subjects, filterSubject]);

  const filteredData = useMemo(() => {
    return data.filter(r => r.book_copies?.books?.subject === filterSubject);
  }, [data, filterSubject]);

  const handlePrint = () => {
    const title = `Borrowed & Lost Books - ${filterSubject} Subject`;
    let html = `<table><thead><tr><th>Adm No</th><th>Student</th><th>Class</th><th>Book Title</th><th>Copy Code</th><th>Status</th><th>Due/Days Overdue</th></tr></thead><tbody>`;
    filteredData.forEach(r => {
      const st = students.find(s => s.id === r.students.id);
      html += `<tr><td>${r.students.adm_no || '--'}</td><td>${r.students.name}</td><td>${r.students.class} ${st?.stream ? st.stream : ''}</td><td>${r.book_copies?.books?.title}</td><td>${r.book_copies?.copy_code}</td><td style="text-transform: uppercase; font-weight: bold;">${r.status}</td><td>${r.due_date}</td></tr>`;
    });
    html += `</tbody></table>`;
    printTable(title, html);
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Select Subject</label>
          <Select 
            value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
            options={subjects.map(s => ({ id: s, label: s }))} style={{ minWidth: 200 }}
          />
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={handlePrint} disabled={filteredData.length === 0}>
            <PrintIcon size={14} /> Print Report
          </button>
        </div>
      </div>

      {loading ? <Loader /> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>Student</th><th>Class</th><th>Book Info</th><th>Status</th><th>Due Date</th></tr>
            </thead>
            <tbody>
              {filteredData.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{r.students?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Adm: {r.students?.adm_no || '--'}</div>
                  </td>
                  <td>{r.students?.class}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{r.book_copies?.books?.title}</div>
                    <code style={{ fontSize: '0.75rem', color: '#2563eb', background: '#eff6ff', padding: '2px 4px', borderRadius: '4px' }}>{r.book_copies?.copy_code}</code>
                  </td>
                  <td><span className={`badge badge-${r.status === 'lost' ? 'danger' : r.status === 'overdue' ? 'warning' : 'primary'}`} style={{ textTransform: 'uppercase' }}>{r.status}</span></td>
                  <td style={{ color: 'var(--text-light)' }}>{r.due_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>No active loans for this subject.</div>}
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
    return students.filter(s => s.name.toLowerCase().includes(term) || (s.adm_no && s.adm_no.toLowerCase().includes(term)) ).slice(0, 5);
  }, [searchInput, students]);

  const selectStudent = async (s) => {
    setSelectedStudent(s);
    setSearchInput(s.name);
    setLoading(true);
    try {
      const data = await getStudentBorrowHistory(s.id);
      setHistory(data || []);
    } catch (e) { console.error('Student history error:', e); } 
    finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!selectedStudent || history.length === 0) return;
    const title = `Library History - ${selectedStudent.name}`;
    let html = `<table><thead><tr><th>Book Title</th><th>Copy Code</th><th>Borrowed</th><th>Due Date</th><th>Returned</th><th>Status</th></tr></thead><tbody>`;
    history.forEach(r => {
      html += `<tr><td>${r.book_copies?.books?.title}</td><td>${r.book_copies?.copy_code}</td><td>${r.borrow_date}</td><td>${r.due_date}</td><td>${r.return_date || '--'}</td><td style="text-transform: uppercase;">${r.status}</td></tr>`;
    });
    html += `</tbody></table>`;
    printTable(title, html);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ position: 'relative', maxWidth: '400px' }}>
        <div className="search-bar" style={{ maxWidth: '100%' }}>
          <span className="search-icon"><SearchIcon size={18} /></span>
          <input type="text" placeholder="Search student by name or admission number..." value={searchInput} onChange={e => { setSearchInput(e.target.value); setSelectedStudent(null); setHistory([]); }} />
        </div>
        {matchingStudents.length > 0 && !selectedStudent && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 100, overflow: 'hidden' }}>
            {matchingStudents.map(s => (
              <button key={s.id} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => selectStudent(s)}>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Adm: {s.adm_no} | {s.class}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedStudent && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', flex: 1, marginRight: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.125rem' }}>{selectedStudent.name}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>Adm: {selectedStudent.adm_no} | Class: {selectedStudent.class} | Total Records: {history.length}</div>
            </div>
            <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={handlePrint} disabled={history.length === 0}>
              <PrintIcon size={14} /> Print Report
            </button>
          </div>

          {loading ? <Loader /> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Book Title</th><th>Copy Code</th><th>Borrowed</th><th>Due Date</th><th>Returned</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {history.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.book_copies?.books?.title}</td>
                      <td><code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{r.book_copies?.copy_code}</code></td>
                      <td>{r.borrow_date}</td><td>{r.due_date}</td><td>{r.return_date || '--'}</td>
                      <td><span className={`badge badge-${r.status === 'returned' ? 'success' : r.status === 'borrowed' ? 'primary' : r.status === 'overdue' ? 'warning' : r.status === 'lost' ? 'danger' : 'ghost'}`} style={{ textTransform: 'uppercase' }}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>No borrow history for this student.</div>}
            </div>
          )}
        </div>
      )}

      {!selectedStudent && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-light)' }}>
          <UserIcon size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
          <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>Search for a student above</p>
          <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>Their full library history will appear here.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BY BOOK REPORT
// ============================================================================
function ByBookReport({ books, students }) {
  const [searchInput, setSearchInput] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const matchingBooks = useMemo(() => {
    if (searchInput.length < 2) return [];
    const term = searchInput.toLowerCase();
    return books.filter(b => {
      if (b.title.toLowerCase().includes(term)) return true;
      if (b.author && b.author.toLowerCase().includes(term)) return true;
      if (b.isbn && b.isbn.includes(term)) return true;
      if (b.book_copies && b.book_copies.some(c => c.copy_code && c.copy_code.toLowerCase().includes(term))) return true;
      return false;
    }).slice(0, 5);
  }, [searchInput, books]);

  const selectBook = async (b) => {
    setSelectedBook(b);
    setSearchInput(b.title);
    setLoading(true);
    try {
      const data = await getBookBorrowHistory(b.id);
      setHistory(data || []);
    } catch (e) { console.error('Book history error:', e); } 
    finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!selectedBook || history.length === 0) return;
    const title = `Book Circulation History - ${selectedBook.title}`;
    let html = `<table><thead><tr><th>Adm No</th><th>Student Name</th><th>Class & Stream</th><th>Copy Code</th><th>Borrowed</th><th>Returned</th><th>Status</th></tr></thead><tbody>`;
    history.forEach(r => {
      html += `<tr><td>${r.students?.adm_no || '--'}</td><td>${r.students?.name}</td><td>${r.students?.class} ${r.students?.stream || ''}</td><td>${r.book_copies?.copy_code}</td><td>${r.borrow_date}</td><td>${r.return_date || '--'}</td><td style="text-transform: uppercase;">${r.status}</td></tr>`;
    });
    html += `</tbody></table>`;
    printTable(title, html);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ position: 'relative', maxWidth: '400px' }}>
        <div className="search-bar" style={{ maxWidth: '100%' }}>
          <span className="search-icon"><BookIcon size={18} /></span>
          <input type="text" placeholder="Search book by title, author, or ISBN..." value={searchInput} onChange={e => { setSearchInput(e.target.value); setSelectedBook(null); setHistory([]); }} />
        </div>
        {matchingBooks.length > 0 && !selectedBook && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 100, overflow: 'hidden' }}>
            {matchingBooks.map(b => (
              <button key={b.id} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => selectBook(b)}>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{b.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>By: {b.author || 'Unknown'} | {b.category}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedBook && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', flex: 1, marginRight: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.125rem' }}>{selectedBook.title}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>By: {selectedBook.author || 'Unknown'} | ISBN: {selectedBook.isbn || '--'} | Total Records: {history.length}</div>
            </div>
            <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={handlePrint} disabled={history.length === 0}>
              <PrintIcon size={14} /> Print Report
            </button>
          </div>

          {loading ? <Loader /> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Student Name</th><th>Class & Stream</th><th>Copy Code</th><th>Borrowed</th><th>Returned</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {history.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.students?.name}</td>
                      <td>{r.students?.class} {r.students?.stream || ''}</td>
                      <td><code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{r.book_copies?.copy_code}</code></td>
                      <td>{r.borrow_date}</td><td>{r.return_date || '--'}</td>
                      <td><span className={`badge badge-${r.status === 'returned' ? 'success' : r.status === 'borrowed' ? 'primary' : r.status === 'overdue' ? 'warning' : r.status === 'lost' ? 'danger' : 'ghost'}`} style={{ textTransform: 'uppercase' }}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>No circulation history for this book.</div>}
            </div>
          )}
        </div>
      )}

      {!selectedBook && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-light)' }}>
          <BookIcon size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
          <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>Search for a book above</p>
          <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>Its full circulation history will appear here.</p>
        </div>
      )}
    </div>
  );
}
