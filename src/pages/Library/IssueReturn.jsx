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
  const { alert, toast } = useDialog();
  const [activeTab, setActiveTab] = useState('issue'); // 'issue', 'return'
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  
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
    <div className="card animate-in pb-8">
      <div className="card-header border-b border-gray-100 flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold">Issue & Return Circulation</h2>
          <p className="text-sm text-gray-500">Fast checkout and check-in desk.</p>
        </div>
        
        <div className="tab-nav mb-0 flex gap-1 bg-gray-50 p-1 rounded-xl w-full max-w-md">
          <button 
            className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${activeTab === 'issue' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('issue')}
          >
            Issue Book
          </button>
          <button 
            className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${activeTab === 'return' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('return')}
          >
            Return Book
          </button>
        </div>
      </div>

      <div className="card-body p-6">
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
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      {/* 1. STUDENT */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 font-bold text-gray-700">
          <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> 
          Student Details
        </h3>
        
        {!selectedStudent ? (
          <div className="relative">
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
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden">
                {matchingStudents.map(s => (
                  <button 
                    key={s.id} 
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex justify-between items-center"
                    onClick={() => selectStudent(s)}
                  >
                    <div>
                      <div className="font-semibold text-gray-800">{s.name}</div>
                      <div className="text-xs text-gray-500">Adm: {s.adm_no} • {s.class}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-start relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><UserIcon size={64} /></div>
            <div>
              <div className="text-blue-900 font-bold text-lg">{selectedStudent.name}</div>
              <div className="text-sm text-blue-700 mt-1">Adm: <strong>{selectedStudent.adm_no}</strong> | Class: <strong>{selectedStudent.class}</strong></div>
              {overdueWarning && (
                <div className="mt-3 flex items-center gap-1 text-red-600 bg-red-100 px-3 py-1.5 rounded-lg text-sm font-semibold max-w-max border border-red-200">
                  <AlertIcon size={14} /> This student has overdue books!
                </div>
              )}
            </div>
            <button className="text-blue-500 hover:text-blue-700 text-sm font-semibold underline" onClick={() => setSelectedStudent(null)}>Change Student</button>
          </div>
        )}
      </div>

      {/* 2. BOOK */}
      <div className={`space-y-4 ${!selectedStudent ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="flex items-center gap-2 font-bold text-gray-700">
          <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> 
          Book Selection
        </h3>
        
        {!selectedCopy ? (
           <div className="relative">
             <div className="search-bar" style={{ maxWidth: '100%' }}>
               <span className="search-icon"><BookIcon size={18} /></span>
               <input 
                 type="text" 
                 placeholder="Scan barcode or type book code / title..." 
                 className="font-mono"
                 value={copySearch}
                 onChange={e => setCopySearch(e.target.value)}
               />
             </div>
             
             {availableCopies.length > 0 && (
               <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden">
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
      <div className={`space-y-4 ${(!selectedStudent || !selectedCopy) ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="flex items-center gap-2 font-bold text-gray-700">
          <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> 
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

      <div className="pt-6 border-t border-gray-100 mt-4">
        <button 
          className="btn btn-primary w-full py-4 text-lg rounded-xl shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      
      {/* SEARCH HEADER */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 relative">
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
            <input type="radio" checked={searchMethod === 'student'} onChange={() => { setSearchMethod('student'); setSearchInput(''); setActiveLoans([]); }} /> Locate by Student
          </label>
          <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
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
               <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden">
                 {matchingStudents.map(s => (
                   <button key={s.id} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 flex justify-between items-center" onClick={() => selectStudent(s)}>
                     <div><div className="font-semibold text-gray-800">{s.name}</div><div className="text-xs text-gray-500">Adm: {s.adm_no} • {s.class}</div></div>
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
             <button type="submit" className="btn btn-primary px-8 rounded-xl font-bold">Find Loan</button>
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
