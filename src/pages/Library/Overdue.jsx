import React, { useState, useEffect, useMemo } from 'react';
import { getOverdueBooks, markBookLost, markBookReplaced, returnBook } from '../../data/libraryStore';
import { supabase } from '../../lib/supabase';
import { getCurrentSchoolId } from '../../data/store';
import { getSchoolProfile } from '../../data/store';
import { useDialog } from '../../contexts/DialogContext';
import Select from '../../components/Common/Select';
import Loader from '../../components/Common/Loader';
import {
  AlertIcon, ClockIcon, SearchIcon, FilterIcon, BookIcon
} from '../../components/CommonIcons';

export default function Overdue({ currentUser, currentPeriodId }) {
  const { alert, confirm, toast } = useDialog();
  const [loading, setLoading] = useState(true);
  const [overdueRecords, setOverdueRecords] = useState([]);
  const [profile, setProfile] = useState({});
  const [filterClass, setFilterClass] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [lostBooks, setLostBooks] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [records, pf] = await Promise.all([
        getOverdueBooks(),
        getSchoolProfile()
      ]);
      setOverdueRecords(records);
      setProfile(pf);
      // Also fetch lost (pending replacement) records
      const { data: lost } = await supabase.from('borrow_records')
        .select('*, students(id, name, class, adm_no), book_copies(copy_code, books(title))')
        .eq('school_id', getCurrentSchoolId())
        .eq('status', 'lost');
      setLostBooks(lost || []);
    } catch (e) {
      console.error('Overdue load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentPeriodId]);

  const filtered = useMemo(() => {
    if (!filterClass) return overdueRecords;
    return overdueRecords.filter(r => r.students?.class === filterClass);
  }, [overdueRecords, filterClass]);



  const handleMarkLost = async (record) => {
    const ok = await confirm({
      title: 'Mark as Lost',
      message: `Mark "${record.book_copies?.books?.title}" (${record.book_copies?.copy_code}) as LOST? The student will be required to replace this book.`,
      variant: 'danger'
    });
    if (!ok) return;
    try {
      await markBookLost(record.id);
      toast('Book marked as lost. Student must replace.', 'warning');
      loadData();
    } catch (e) {
      alert({ title: 'Error', message: e.message, variant: 'danger' });
    }
  };

  const handleBulkMarkLost = async () => {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Bulk Mark Lost (${selected.size} items)`,
      message: `Are you sure you want to mark ${selected.size} overdue books as LOST? Students will be required to replace these books.`,
      variant: 'danger'
    });
    if (!ok) return;
    try {
      for (const id of selected) {
        await markBookLost(id);
      }
      toast(`${selected.size} books marked as lost.`, 'warning');
      setSelected(new Set());
      loadData();
    } catch (e) {
      alert({ title: 'Bulk Error', message: e.message, variant: 'danger' });
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.id)));
    }
  };

  const getDaysOverdue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) return <Loader />;

  return (
    <div className="animate-in space-y-6 pb-12">

      {/* SUMMARY CARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
        <div className="p-6 rounded-2xl border border-red-200 bg-red-50 flex items-center gap-5">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <AlertIcon size={28} className="text-red-500" />
          </div>
          <div>
            <div className="text-3xl font-black text-red-700">{filtered.length}</div>
            <div className="text-sm font-bold text-red-500 uppercase tracking-wide">Overdue Books</div>
          </div>
        </div>
        <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50 flex items-center gap-5">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <BookIcon size={28} className="text-amber-500" />
          </div>
          <div>
            <div className="text-3xl font-black text-amber-700">{filtered.filter(r => getDaysOverdue(r.due_date) > 30).length}</div>
            <div className="text-sm font-bold text-amber-500 uppercase tracking-wide">30+ Days Overdue</div>
          </div>
        </div>
      </div>

      {/* FILTER + BULK ACTION BAR */}
      <div className="card shadow-sm border border-gray-100">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <FilterIcon size={16} className="text-gray-400" />
            <Select
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              options={[
                { id: '', label: 'All Classes' },
                ...(profile.activeClasses || []).map(g => ({ id: g, label: g }))
              ]}
              style={{ minWidth: 180 }}
            />
            <span className="text-sm text-gray-500 font-medium">Showing {filtered.length} records</span>
          </div>

          {selected.size > 0 && (
            <button
              className="btn btn-sm bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
              onClick={handleBulkMarkLost}
            >
              <AlertIcon size={14} /> Mark {selected.size} as Lost
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {filtered.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-gray-200 text-gray-500 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Book Title</th>
                  <th className="p-4">Copy Code</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Days Overdue</th>
                  <th className="p-4">Action Required</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => {
                  const days = getDaysOverdue(r.due_date);

                  return (
                    <tr key={r.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{r.students?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">Adm: {r.students?.adm_no}</div>
                      </td>
                      <td className="p-4 font-semibold">{r.students?.class || '--'}</td>
                      <td className="p-4 font-semibold">{r.book_copies?.books?.title || 'Unknown'}</td>
                      <td className="p-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-bold border border-gray-200">
                          {r.book_copies?.copy_code}
                        </code>
                      </td>
                      <td className="p-4 text-red-600 font-semibold">{r.due_date}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                          days > 30 ? 'bg-red-200 text-red-800' :
                          days > 14 ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          <ClockIcon size={12} /> {days} days
                        </span>
                      </td>
                      <td className="p-4 text-amber-600 font-semibold text-xs">Replace Book</td>
                      <td className="p-4 text-right">
                        <button
                          className="btn btn-sm bg-red-100 text-red-700 hover:bg-red-200 font-bold"
                          onClick={() => handleMarkLost(r)}
                        >
                          Mark Lost
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-20 bg-white">
              <BookIcon size={48} className="mx-auto text-green-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-500">No overdue books!</h3>
              <p className="text-sm text-gray-400 mt-1">All books have been returned on time.</p>
            </div>
          )}
        </div>
      </div>
      {/* LOST BOOKS PENDING REPLACEMENT */}
      {lostBooks.length > 0 && (
        <div className="card shadow-sm border border-gray-100 mt-6">
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
            <BookIcon size={18} className="text-amber-600" />
            <span className="font-bold text-amber-800">Lost Books - Pending Replacement ({lostBooks.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-gray-200 text-gray-500 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Book Title</th>
                  <th className="p-4">Lost Copy Code</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lostBooks.map(r => (
                  <tr key={r.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{r.students?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">Adm: {r.students?.adm_no}</div>
                    </td>
                    <td className="p-4 font-semibold">{r.students?.class || '--'}</td>
                    <td className="p-4 font-semibold">{r.book_copies?.books?.title || 'Unknown'}</td>
                    <td className="p-4">
                      <code className="bg-red-100 px-2 py-1 rounded text-xs font-bold border border-red-200 text-red-700 line-through">
                        {r.book_copies?.copy_code}
                      </code>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Lost - Awaiting Replacement</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn btn-sm bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Confirm Book Found',
                              message: `Has the lost copy of "${r.book_copies?.books?.title}" been found? This will mark it as available again.`,
                              confirmText: 'Yes, Check In Book',
                              variant: 'default'
                            });
                            if (!ok) return;
                            try {
                              await returnBook(r.id, currentUser.id, 'good', 'Book was lost but has been found.');
                              toast('Book found and checked back into the system successfully.', 'success');
                              loadData();
                            } catch(e) {
                              alert({ title: 'Error', message: e.message, variant: 'danger' });
                            }
                          }}
                        >
                          Found (Check In)
                        </button>
                        <button
                          className="btn btn-sm bg-green-100 text-green-700 hover:bg-green-200 font-bold"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Confirm Book Replacement',
                              message: `Has the student brought a replacement copy of "${r.book_copies?.books?.title}"? A new copy code will be generated automatically.`,
                              confirmText: 'Yes, Register Replacement',
                              variant: 'default'
                            });
                            if (!ok) return;
                            try {
                              const result = await markBookReplaced(r.id);
                              toast(`Replaced! New copy: ${result.newCode} (old: ${result.oldCode})`, 'success');
                              loadData();
                            } catch(e) {
                              alert({ title: 'Error', message: e.message, variant: 'danger' });
                            }
                          }}
                        >
                          Replaced
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
