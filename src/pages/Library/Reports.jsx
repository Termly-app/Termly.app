import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentSchoolId, getStudents, getSchoolProfile } from '../../data/store';
import Select from '../../components/Common/Select';
import Loader from '../../components/Common/Loader';
import { useDialog } from '../../contexts/DialogContext';
import {
  SearchIcon, DownloadIcon, BookIcon, UserIcon, FilterIcon
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
          <p className="text-sm text-gray-500">Analytics and data exports for library usage.</p>
        </div>

        <div className="tab-nav mb-0 flex gap-1 bg-gray-50 p-1 rounded-xl w-full max-w-lg">
          {[
            { id: 'by-class', label: 'By Class' },
            { id: 'popular', label: 'Popular Books' },
            { id: 'student-history', label: 'Student History' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all ${activeTab === tab.id ? 'bg-white shadow text-primary' : 'text-gray-500 hover:bg-gray-100'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-body p-6">
        {activeTab === 'by-class' && <ByClassReport profile={profile} />}
        {activeTab === 'popular' && <PopularBooksReport />}
        {activeTab === 'student-history' && <StudentHistoryReport students={students} />}
      </div>
    </div>
  );
}

// ============================================================================
// BY CLASS REPORT
// ============================================================================
function ByClassReport({ profile }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const schoolId = getCurrentSchoolId();
        const classes = profile.activeClasses || [];
        const results = [];

        for (const cls of classes) {
          // Get students in class
          const { count: studentCount } = await supabase.from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('class', cls);

          // Get borrows for students of this class
          const { data: borrows } = await supabase.from('borrow_records')
            .select('status, students!inner(class)')
            .eq('school_id', schoolId)
            .eq('students.class', cls);

          const borrowed = borrows ? borrows.filter(b => b.status === 'borrowed').length : 0;
          const overdue = borrows ? borrows.filter(b => b.status === 'overdue' || (b.status === 'borrowed' && new Date(b.due_date) < new Date())).length : 0;
          const totalBorrows = borrows ? borrows.length : 0;

          // Get allocations for this class
          const { data: allocs } = await supabase.from('book_class_allocations')
            .select('quantity')
            .eq('school_id', schoolId)
            .eq('class_name', cls);
          const allocated = allocs ? allocs.reduce((sum, a) => sum + a.quantity, 0) : 0;

          results.push({
            class_name: cls,
            student_count: studentCount || 0,
            allocated,
            borrowed,
            overdue,
            total_borrows: totalBorrows
          });
        }
        setData(results);
      } catch (e) {
        console.error('By class report error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  const exportCSV = () => {
    const header = 'Class,Students,Allocated,Currently Borrowed,Overdue,Total Borrows\n';
    const rows = data.map(r => `${r.class_name},${r.student_count},${r.allocated},${r.borrowed},${r.overdue},${r.total_borrows}`).join('\n');
    downloadCSV(header + rows, 'library_report_by_class.csv');
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-sm btn-ghost flex items-center gap-2" onClick={exportCSV}>
          <DownloadIcon size={14} /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-xs">
            <tr>
              <th className="p-4">Class</th>
              <th className="p-4">Students</th>
              <th className="p-4">Books Allocated</th>
              <th className="p-4">Currently Borrowed</th>
              <th className="p-4">Overdue</th>
              <th className="p-4">Total Borrows</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(r => (
              <tr key={r.class_name} className="hover:bg-gray-50/50">
                <td className="p-4 font-bold text-gray-800">{r.class_name}</td>
                <td className="p-4">{r.student_count}</td>
                <td className="p-4">{r.allocated}</td>
                <td className="p-4 font-semibold text-blue-600">{r.borrowed}</td>
                <td className="p-4">
                  {r.overdue > 0 ? (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">{r.overdue}</span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="p-4 text-gray-600">{r.total_borrows}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="text-center py-16 text-gray-400">No class data available.</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// POPULAR BOOKS REPORT
// ============================================================================
function PopularBooksReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const schoolId = getCurrentSchoolId();
        // Get all borrow records with book info
        const { data: borrows } = await supabase.from('borrow_records')
          .select('book_copy_id, book_copies(book_id, books(title, author, category, subject))')
          .eq('school_id', schoolId);

        // Count borrows per book (by book_id)
        const counts = {};
        (borrows || []).forEach(b => {
          const bookId = b.book_copies?.book_id;
          const title = b.book_copies?.books?.title || 'Unknown';
          const author = b.book_copies?.books?.author || '';
          const category = b.book_copies?.books?.category || '';
          const subject = b.book_copies?.books?.subject || '';
          if (!bookId) return;
          if (!counts[bookId]) counts[bookId] = { bookId, title, author, category, subject, count: 0 };
          counts[bookId].count++;
        });

        const sorted = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10);
        setData(sorted);
      } catch (e) {
        console.error('Popular books error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const exportCSV = () => {
    const header = 'Rank,Title,Author,Category,Subject,Times Borrowed\n';
    const rows = data.map((r, i) => `${i + 1},${r.title},${r.author},${r.category},${r.subject},${r.count}`).join('\n');
    downloadCSV(header + rows, 'library_popular_books.csv');
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-sm btn-ghost flex items-center gap-2" onClick={exportCSV}>
          <DownloadIcon size={14} /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-xs">
            <tr>
              <th className="p-4 w-12">#</th>
              <th className="p-4">Book Title</th>
              <th className="p-4">Author</th>
              <th className="p-4">Category</th>
              <th className="p-4">Subject</th>
              <th className="p-4">Times Borrowed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((r, i) => (
              <tr key={r.bookId} className="hover:bg-gray-50/50">
                <td className="p-4">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-200 text-gray-700' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{i + 1}</span>
                </td>
                <td className="p-4 font-bold text-gray-800">{r.title}</td>
                <td className="p-4 text-gray-600">{r.author || '--'}</td>
                <td className="p-4 capitalize">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-600">{r.category}</span>
                </td>
                <td className="p-4">{r.subject || '--'}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 rounded-full bg-primary/20 flex-1 max-w-[120px]">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, (r.count / (data[0]?.count || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="font-black text-primary">{r.count}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="text-center py-16 text-gray-400">No borrow history found yet.</div>
        )}
      </div>
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
      (s.adm_no && s.adm_no.toLowerCase().includes(term))
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

  const exportCSV = () => {
    if (!selectedStudent || history.length === 0) return;
    const header = 'Book Title,Copy Code,Borrow Date,Due Date,Return Date,Status\n';
    const rows = history.map(r =>
      `${r.book_copies?.books?.title},${r.book_copies?.copy_code},${r.borrow_date},${r.due_date},${r.return_date || 'N/A'},${r.status}`
    ).join('\n');
    downloadCSV(header + rows, `library_history_${selectedStudent.adm_no}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Student search */}
      <div className="relative max-w-md">
        <div className="flex items-center border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary transition-colors bg-gray-50">
          <SearchIcon size={18} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search student by name or admission number..."
            className="w-full bg-transparent border-none outline-none"
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
                <div className="text-xs text-gray-500">Adm: {s.adm_no} | {s.class}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {selectedStudent && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex-1 mr-4">
              <div className="font-bold text-blue-900 text-lg">{selectedStudent.name}</div>
              <div className="text-sm text-blue-700">Adm: {selectedStudent.adm_no} | Class: {selectedStudent.class} | Total Records: {history.length}</div>
            </div>
            <button className="btn btn-sm btn-ghost flex items-center gap-2" onClick={exportCSV}>
              <DownloadIcon size={14} /> Export CSV
            </button>
          </div>

          {loading ? <Loader /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-xs">
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          r.status === 'returned' ? 'bg-green-100 text-green-700' :
                          r.status === 'borrowed' ? 'bg-blue-100 text-blue-700' :
                          r.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          r.status === 'lost' ? 'bg-gray-200 text-gray-700' :
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

// ============================================================================
// CSV DOWNLOAD UTILITY
// ============================================================================
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
