import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getStudents, getSchoolProfile } from '../../data/store';
import { issueBook, returnBook, getOverdueBooks } from '../../data/libraryStore';
import { supabase } from '../../lib/supabase';
import { 
  SearchIcon, CheckIcon, UserIcon, BookIcon, AlertIcon, 
  ClockIcon, PlatformZapIcon
} from '../../components/CommonIcons';
import { useDialog } from '../../contexts/DialogContext';
import Select from '../../components/Common/Select';

export default function IssueReturn({ currentUser, currentPeriodId }) {
  const role = currentUser?.role?.toLowerCase() || '';
  const canManage = role === 'admin' || role === 'librarian';
  
  const { alert, toast } = useDialog();
  const [activeTab, setActiveTab] = useState('issue'); // 'issue', 'return'
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);

  if (!canManage) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <AlertIcon size={48} color="var(--warning)" style={{ marginBottom: 16 }} />
        <h3>Access Denied</h3>
        <p className="text-muted">Only Librarians and Admins can access the Circulation Desk.</p>
      </div>
    );
  }
  
  // Load initial data
  useEffect(() => {
    (async () => {
      try {
        const st = await getStudents();
        setStudents(st);
      } catch (err) {
        console.error("Failed to load students:", err);
      }
    })();
  }, [currentPeriodId]);

  return (
    <div className="card animate-in" style={{ marginBottom: '32px', overflow: 'visible' }}>
      <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Issue & Return Circulation</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', margin: '4px 0 0 0' }}>Fast checkout and check-in desk.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '4px', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
          <button 
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: activeTab === 'issue' ? '#fff' : 'transparent',
              color: activeTab === 'issue' ? 'var(--primary)' : 'var(--text-light)',
              boxShadow: activeTab === 'issue' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
            onClick={() => setActiveTab('issue')}
          >
            Issue Book
          </button>
          <button 
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: activeTab === 'return' ? '#fff' : 'transparent',
              color: activeTab === 'return' ? 'var(--primary)' : 'var(--text-light)',
              boxShadow: activeTab === 'return' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
            onClick={() => setActiveTab('return')}
          >
            Return Book
          </button>
        </div>
      </div>

      <div className="card-body p-6" style={{ padding: '24px', overflow: 'visible' }}>
        {activeTab === 'issue' ? (
          <IssueTab currentUser={currentUser} students={students} alert={alert} toast={toast} />
        ) : (
          <ReturnTab currentUser={currentUser} students={students} alert={alert} toast={toast} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ISSUE TAB
// ============================================================================
function IssueTab({ currentUser, students, alert, toast }) {
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [overdueWarning, setOverdueWarning] = useState(false);
  
  const [copySearch, setCopySearch] = useState('');
  const [availableCopies, setAvailableCopies] = useState([]);
  const [selectedCopy, setSelectedCopy] = useState(null);
  
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const studentInputRef = useRef(null);

  useEffect(() => {
    // Default: 14 days
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().split('T')[0]);
    
    // Autofocus
    if(studentInputRef.current) studentInputRef.current.focus();
  }, []);

  // Student Search
  const matchingStudents = useMemo(() => {
    if (studentSearch.length < 2) return [];
    const term = studentSearch.toLowerCase();
    return students.filter(s => 
      s.name.toLowerCase().includes(term) || 
      (s.adm_no && s.adm_no.toLowerCase().includes(term))
    ).slice(0, 5); // top 5
  }, [studentSearch, students]);

  const selectStudent = async (s) => {
    setSelectedStudent(s);
    setStudentSearch('');
    // Check if they have overdue books
    try {
      const overdues = await getOverdueBooks();
      const studentOverdues = overdues.filter(o => o.student_id === s.id);
      setOverdueWarning(studentOverdues.length > 0);
    } catch(e) {}
  };

  // Copy Search Trigger
  useEffect(() => {
    if (copySearch.length < 3) {
      setAvailableCopies([]);
      return;
    }
    const timer = setTimeout(async () => {
      // Find available copies by code or title
      const { data } = await supabase.from('book_copies')
        .select('*, books!inner(title, category, subject)')
        .eq('status', 'available')
        .or(`copy_code.ilike.%${copySearch}%,books.title.ilike.%${copySearch}%`)
        .limit(10);
      setAvailableCopies(data || []);
    }, 400);
    return () => clearTimeout(timer);
  }, [copySearch]);

  const selectCopy = (c) => {
    setSelectedCopy(c);
    setCopySearch('');
  };

  const handleIssue = async () => {
    if (!selectedStudent || !selectedCopy || !dueDate) return;
    setIsSubmitting(true);
    try {
      await issueBook(selectedStudent.id, selectedCopy.id, dueDate, "Issued at desk", currentUser.id);
      toast("Book issued successfully!", 'success');
      // Reset
      setSelectedStudent(null);
      setSelectedCopy(null);
      setOverdueWarning(false);
      setCopySearch('');
      setStudentSearch('');
    } catch (e) {
      alert({title: "Error issuing book", message: e.message, variant: 'danger'});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '600px', margin: '0 auto' }}>
      {/* 1. STUDENT */}
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
          <span style={{ backgroundColor: 'var(--primary)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>1</span> 
          Student Details
        </h3>
        
        {!selectedStudent ? (
          <div style={{ position: 'relative' }}>
            <div className="search-bar" style={{ maxWidth: '100%' }}>
              <span className="search-icon"><SearchIcon size={18} /></span>
              <input 
                ref={studentInputRef}
                type="text" 
                placeholder="Search by student name or admission number..." 
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
              />
            </div>
            
            {matchingStudents.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 100, overflow: 'hidden' }}>
                {matchingStudents.map(s => (
                  <button 
                    key={s.id} 
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => selectStudent(s)}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Adm: {s.adm_no} • {s.class}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, padding: '16px', opacity: 0.05, pointerEvents: 'none' }}><UserIcon size={64} /></div>
            <div>
              <div style={{ color: '#1e3a8a', fontWeight: 700, fontSize: '1.125rem' }}>{selectedStudent.name}</div>
              <div style={{ fontSize: '0.875rem', color: '#1d4ed8', marginTop: '4px' }}>Adm: <strong>{selectedStudent.adm_no}</strong> | Class: <strong>{selectedStudent.class}</strong></div>
              {overdueWarning && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', background: '#fee2e2', padding: '6px 12px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid #fecaca', width: 'fit-content' }}>
                  <AlertIcon size={14} /> This student has overdue books!
                </div>
              )}
            </div>
            <button style={{ color: '#3b82f6', background: 'transparent', border: 'none', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', zIndex: 1 }} onClick={() => setSelectedStudent(null)}>Change Student</button>
          </div>
        )}
      </div>

      {/* 2. BOOK */}
      <div style={{ opacity: !selectedStudent ? 0.5 : 1, pointerEvents: !selectedStudent ? 'none' : 'auto' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
          <span style={{ backgroundColor: 'var(--primary)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>2</span> 
          Book Selection
        </h3>
        
        {!selectedCopy ? (
           <div style={{ position: 'relative' }}>
             <div className="search-bar" style={{ maxWidth: '100%' }}>
               <span className="search-icon"><BookIcon size={18} /></span>
               <input 
                 type="text" 
                 placeholder="Scan barcode or type book code / title..." 
                 style={{ fontFamily: 'monospace' }}
                 value={copySearch}
                 onChange={e => setCopySearch(e.target.value)}
               />
             </div>
             
             {availableCopies.length > 0 && (
               <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 100, overflow: 'hidden' }}>
                 {availableCopies.map(c => (
                   <button 
                     key={c.id} 
                     className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex justify-between items-center"
                     onClick={() => selectCopy(c)}
                   >
                     <div>
                       <div className="font-bold text-gray-800">{c.books?.title}</div>
                       <div className="text-xs text-gray-500 flex gap-2 mt-1">
                         <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{c.copy_code}</span> 
                         <span>{c.books?.category}</span>
                         <span>Condition: {c.condition}</span>
                       </div>
                     </div>
                   </button>
                 ))}
               </div>
             )}
           </div>
         ) : (
           <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex justify-between items-center">
             <div>
               <div className="text-green-900 font-bold text-lg">{selectedCopy.books?.title}</div>
               <div className="text-sm text-green-700 mt-1 flex items-center gap-2">
                 <span>Code: <code className="bg-green-100 px-2 py-0.5 rounded font-bold">{selectedCopy.copy_code}</code></span>
                 <span>| Condition: {selectedCopy.condition}</span>
               </div>
             </div>
             <button className="text-green-600 hover:text-green-800 text-sm font-semibold underline" onClick={() => setSelectedCopy(null)}>Change Book</button>
           </div>
         )}
      </div>

      {/* 3. DUE DATE */}
      <div style={{ opacity: (!selectedStudent || !selectedCopy) ? 0.5 : 1, pointerEvents: (!selectedStudent || !selectedCopy) ? 'none' : 'auto' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
          <span style={{ backgroundColor: 'var(--primary)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>3</span> 
          Return Date
        </h3>
        <input 
          type="date" 
          className="form-input" 
          style={{ maxWidth: 200 }}
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />
      </div>

      <div style={{ paddingTop: '24px', borderTop: '1px solid var(--border)', marginTop: '16px' }}>
        <button 
          className="btn btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: '1.125rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: (!selectedStudent || !selectedCopy || !dueDate || isSubmitting) ? 0.5 : 1 }}
          disabled={!selectedStudent || !selectedCopy || !dueDate || isSubmitting}
          onClick={handleIssue}
        >
          {isSubmitting ? <span className="loader-spinner"></span> : <><PlatformZapIcon size={20} /> Issue Book Now</>}
        </button>
      </div>

    </div>
  );
}

// ============================================================================
// RETURN TAB
// ============================================================================
function ReturnTab({ currentUser, students, alert, toast }) {
  const [searchMethod, setSearchMethod] = useState('student'); // 'student' or 'code'
  
  const [searchInput, setSearchInput] = useState('');
  const [matchingStudents, setMatchingStudents] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  
  const [condition, setCondition] = useState('good');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student Autocomplete Mode
  useEffect(() => {
    if (searchMethod !== 'student') return;
    if (searchInput.length < 2) { setMatchingStudents([]); return; }
    
    const term = searchInput.toLowerCase();
    setMatchingStudents(students.filter(s => 
      s.name.toLowerCase().includes(term) || 
      (s.adm_no && s.adm_no.toLowerCase().includes(term))
    ).slice(0, 5));
  }, [searchInput, searchMethod, students]);

  const selectStudent = async (s) => {
    setSearchInput(s.name);
    setMatchingStudents([]);
    fetchActiveLoans({ student_id: s.id });
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if(searchInput.trim()) fetchActiveLoans({ copy_code: searchInput.trim() });
  };

  const fetchActiveLoans = async (filter) => {
    let query = supabase.from('borrow_records')
      .select('*, students(name, adm_no), book_copies!inner(copy_code, condition, books(title, book_code))')
      .eq('status', 'borrowed')
      .eq('school_id', currentUser.school_id);

    if (filter.student_id) query = query.eq('student_id', filter.student_id);
    if (filter.copy_code) query = query.eq('book_copies.copy_code', filter.copy_code);

    const { data } = await query;
    setActiveLoans(data || []);
    
    if (data && data.length === 0 && filter.copy_code) {
      alert({ title: "Not Found", message: "No active loan found for that copy code.", variant: 'warning' });
    }
  };

  const handleReturnAction = async (loan) => {
    setIsSubmitting(true);
    try {
      await returnBook(loan.id, currentUser.id, condition, "Returned at desk");
      
      const isLate = new Date() > new Date(loan.due_date);
      let successMsg = "Book checked in successfully!";
      if (isLate) {
         successMsg = "Returned (was overdue). Student should be notified.";
      } else if (condition === 'poor' || condition === 'damaged') {
         successMsg = "Returned with damage noted. Student may need to replace.";
      }
      toast(successMsg, isLate ? 'warning' : 'success');
      
      // Remove from list
      setActiveLoans(prev => prev.filter(l => l.id !== loan.id));
      setSearchInput('');
      setCondition('good');
    } catch(e) {
      alert({title: "Error returning book", message: e.message, variant: 'danger'});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* SEARCH HEADER */}
      <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'visible', zIndex: 50 }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
            <input type="radio" checked={searchMethod === 'student'} onChange={() => { setSearchMethod('student'); setSearchInput(''); setActiveLoans([]); }} /> Locate by Student
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
            <input type="radio" checked={searchMethod === 'code'} onChange={() => { setSearchMethod('code'); setSearchInput(''); setActiveLoans([]); }} /> Locate by Book Code
          </label>
        </div>

        {searchMethod === 'student' ? (
          <div className="relative mt-4">
             <div className="search-bar" style={{ maxWidth: '100%' }}>
               <span className="search-icon"><UserIcon size={18} /></span>
               <input 
                 type="text" 
                 placeholder="Search student by name or admission..." 
                 value={searchInput}
                 onChange={e => setSearchInput(e.target.value)}
               />
             </div>
             {matchingStudents.length > 0 && (
               <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 100, overflow: 'hidden' }}>
                 {matchingStudents.map(s => (
                   <button key={s.id} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => selectStudent(s)}>
                     <div><div style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Adm: {s.adm_no} • {s.class}</div></div>
                   </button>
                 ))}
               </div>
             )}
          </div>
        ) : (
          <form className="relative flex gap-2 mt-4" onSubmit={handleBarcodeSubmit}>
             <div className="search-bar" style={{ flex: 1, maxWidth: '100%' }}>
               <span className="search-icon"><BookIcon size={18} /></span>
               <input 
                 type="text" 
                 placeholder="Scan or type book copy code (e.g. MAT-F1-001)..." 
                 className="font-mono"
                 value={searchInput}
                 onChange={e => setSearchInput(e.target.value)}
               />
             </div>
             <button type="submit" className="btn btn-primary" style={{ padding: '0 32px', fontWeight: 700 }}>Find Loan</button>
          </form>
        )}
      </div>

      {/* LOAN RESULTS */}
      {activeLoans.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-700 text-lg border-b border-gray-200 pb-2">Active Loans Found ({activeLoans.length})</h3>
          
          <div className="grid gap-4">
            {activeLoans.map(loan => {
               const today = new Date();
               const due = new Date(loan.due_date);
               const isOverdue = today > due;
               
               return (
                 <div key={loan.id} className={`border-l-4 ${isOverdue ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-white'} rounded-xl shadow-sm border-t border-r border-b p-5 flex flex-col md:flex-row gap-6 items-center justify-between`}>
                   
                   <div className="flex-1">
                     <div className="font-bold text-xl text-gray-800 mb-1">{loan.book_copies?.books?.title}</div>
                     <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                        <span className="text-gray-500">Copy: <code className="bg-gray-100 px-1 font-bold rounded text-gray-800">{loan.book_copies?.copy_code}</code></span>
                        <span className="text-gray-500">Borrower: <strong className="text-gray-800">{loan.students?.name}</strong></span>
                        <span className="text-gray-500">Due: <strong className={isOverdue ? 'text-red-600' : 'text-gray-800'}>{loan.due_date}</strong></span>
                     </div>
                     {isOverdue && (
                       <div className="mt-2 text-xs font-bold text-red-600 uppercase flex items-center gap-1"><AlertIcon size={12}/> Overdue - Fine will apply</div>
                     )}
                   </div>

                   <div className="w-full md:w-auto bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-3 min-w-[280px]">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Return Condition</label>
                        <Select 
                          value={condition} 
                          onChange={(e) => setCondition(e.target.value)}
                          options={[
                            {id: 'good', label: 'Good (Normal Wear)'},
                            {id: 'fair', label: 'Fair'},
                            {id: 'poor', label: 'Poor (Damaged - Needs Replacement)'},
                            {id: 'lost', label: 'Lost Book - Needs Replacement'}
                          ]}
                          style={{width:'100%', padding: '8px 12px'}}
                        />
                      </div>
                      <button 
                        className="btn btn-primary w-full py-3"
                        disabled={isSubmitting}
                        onClick={() => handleReturnAction(loan)}
                      >
                        {isSubmitting ? 'Processing...' : 'Confirm Return'}
                      </button>
                   </div>
                 </div>
               )
            })}
          </div>
        </div>
      )}

      {activeLoans.length === 0 && searchInput && searchMethod === 'student' && matchingStudents.length === 0 && (
         <div className="text-center py-10 text-gray-400 font-semibold">
           No active loans found for that student.
         </div>
      )}

    </div>
  );
}
