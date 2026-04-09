import React, { useState, useEffect, useMemo } from 'react';
import Select from '../components/Common/Select';
import { Helmet } from 'react-helmet-async';
import { 
  getBooks, saveBook, getBorrows, saveBorrow, returnBook, deleteBook,
  getStudents, getPrintHeader 
} from '../data/store';
import { 
  PlusIcon, SearchIcon, BookIcon, UserIcon, PrintIcon, 
  CheckIcon, CloseIcon, EditIcon, DeleteIcon, ChevronDownIcon,
  ClockIcon, AlertIcon, PlatformZapIcon, FilterIcon, GraduationIcon
} from '../components/CommonIcons';
import Loader from '../components/Common/Loader';

export default function Library({ currentUser, currentPeriodId }) {
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('catalog'); // catalog, loans
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [bookModal, setBookModal] = useState({ open: false, data: null });
  const [borrowModal, setBorrowModal] = useState({ open: false, data: null });
  const [printModal, setPrintModal] = useState({ open: false });

  // Filters for search
  const [filters, setFilters] = useState({
    subject: '',
    grade: '',
    stream: '',
    year: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [bk, br, st] = await Promise.all([
        getBooks(),
        getBorrows(),
        getStudents()
      ]);
      setBooks(bk);
      setBorrows(br);
      setStudents(st);
    } catch (err) {
      console.error("Library load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPeriodId]);

  // Search/Filter Logic
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchesSearch = !searchTerm || 
        b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.book_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.isbn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.author?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSubject = !filters.subject || b.subject === filters.subject;
      const matchesYear = !filters.year || String(b.year_registered) === filters.year;
      
      return matchesSearch && matchesSubject && matchesYear;
    });
  }, [books, searchTerm, filters]);

  const filteredBorrows = useMemo(() => {
    return borrows.filter(b => {
      const student = b.students || {};
      const matchesSearch = !searchTerm || 
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.adm_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.library_books?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.library_books?.book_code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClass = !filters.grade || student.class === filters.grade;
      const matchesStream = !filters.stream || student.stream === filters.stream;
      const matchesSubject = !filters.subject || b.library_books?.subject === filters.subject;
      
      return matchesSearch && matchesClass && matchesStream && matchesSubject;
    });
  }, [borrows, searchTerm, filters]);

  const handleSaveBook = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      id: bookModal.data?.id,
      title: formData.get('title'),
      author: formData.get('author'),
      isbn: formData.get('isbn'),
      book_code: formData.get('book_code'),
      subject: formData.get('subject'),
      grade: formData.get('grade'),
      year_registered: parseInt(formData.get('year_registered')),
      total_copies: parseInt(formData.get('total_copies')),
      available_copies: bookModal.data ? parseInt(formData.get('available_copies')) : parseInt(formData.get('total_copies')),
      location: formData.get('location'),
    };
    try {
      await saveBook(data);
      setBookModal({ open: false, data: null });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleIssueBook = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      book_id: formData.get('book_id'),
      student_id: formData.get('student_id'),
      due_date: formData.get('due_date'),
      notes: formData.get('notes'),
    };
    try {
      await saveBorrow(data);
      setBorrowModal({ open: false, data: null });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleReturn = async (borrow) => {
    if (!window.confirm(`Mark "${borrow.library_books?.title}" as returned?`)) return;
    try {
      await returnBook(borrow.id, borrow.book_id);
      loadData();
    } catch (err) { alert(err.message); }
  };

  const printReport = async (type) => {
    let reportData = [];
    let title = "Library Report";
    
    if (type === 'student' && filters.searchTerm) {
      reportData = borrows.filter(b => b.status === 'borrowed' && b.students?.adm_no === filters.searchTerm);
      title = `Books Owed by Student: ${reportData[0]?.students?.name || filters.searchTerm}`;
    } else if (type === 'class' && filters.grade) {
      reportData = borrows.filter(b => b.status === 'borrowed' && b.students?.class === filters.grade && (!filters.stream || b.students?.stream === filters.stream));
      title = `Books Owed by Class: ${filters.grade} ${filters.stream || ''}`;
    } else if (type === 'subject-class' && filters.subject && filters.grade) {
      reportData = borrows.filter(b => b.status === 'borrowed' && b.library_books?.subject === filters.subject && b.students?.class === filters.grade);
      title = `${filters.subject} Books Owed by Class ${filters.grade}`;
    } else {
      reportData = filteredBorrows.filter(b => b.status === 'borrowed');
      title = "Outstanding Library Loans";
    }

    const header = await getPrintHeader(title);
    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #f8fafc; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 13px; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .meta { margin-bottom: 20px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          ${header}
          <div class="meta">Generated on: ${new Date().toLocaleDateString()}</div>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission</th>
                <th>Book Title</th>
                <th>Code</th>
                <th>Borrowed On</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(r => `
                <tr>
                  <td>${r.students?.name}</td>
                  <td>${r.students?.adm_no}</td>
                  <td>${r.library_books?.title}</td>
                  <td>${r.library_books?.book_code || '-'}</td>
                  <td>${r.borrow_date}</td>
                  <td>${r.due_date || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8;">
            ShuleSoft Library Management System
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  if (loading) return <Loader />;

  return (
    <div className="library-modern animate-fade-in">
      <Helmet>
        <title>Library & Resource Catalog | ShuleSoft</title>
        <meta name="description" content="Manage school library books, track loans, and generate resource reports." />
      </Helmet>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>Library & Resources</h2>
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
              <span style={{fontSize:'0.875rem',color:'var(--text-light)'}}>
                {books.length} resources cataloged
              </span>
              <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 11px',borderRadius:20,background:'var(--primary-light)',color:'var(--primary)',fontSize:'0.75rem',fontWeight:600}}>
                <BookIcon size={12} /> Digital Inventory
              </span>
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPrintModal({ open: true })}>
              <PrintIcon size={14} /> Reports
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setBorrowModal({ open: true, data: null })}>
              <PlatformZapIcon size={14} /> Loan Book
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setBookModal({ open: true, data: null })}>
              <PlusIcon size={14} /> New Entry
            </button>
          </div>
        </div>
      </div>

      <div className="lib-main-wrap">
        <div className="stats-header-grid" style={{
           display: 'grid', 
           gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
           gap: '20px', 
           marginBottom: '32px'
        }}>
          <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', color: '#fff', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
              <BookIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Total Books</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{books.length}</div>
            </div>
          </div>
          <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--warning)', color: '#fff', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
              <ClockIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Active Loans</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{borrows.filter(b => b.status === 'borrowed').length}</div>
            </div>
          </div>
        </div>

      {/* Toolbar & Filters */}
        <div className="lib-nav-bar">
          <div className="lib-tabs-modern">
            <button className={activeTab === 'catalog' ? 'active' : ''} onClick={() => setActiveTab('catalog')}>Inventory View</button>
            <button className={activeTab === 'loans' ? 'active' : ''} onClick={() => setActiveTab('loans')}>Circulation Desk</button>
          </div>
          
          <div className="lib-search-modern">
            <SearchIcon size={18} />
            <input 
              type="text" 
              placeholder={activeTab === 'catalog' ? "Search by title, author, or code..." : "Search students or books..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="lib-filter-strip">
          <div className="filter-group">
            <FilterIcon size={14} />
            <Select 
              value={filters.subject} 
              onChange={e => setFilters({...filters, subject: e.target.value})}
              options={[
                { id: '', label: 'All Subjects' },
                ...Array.from(new Set(books.map(b => b.subject))).filter(Boolean).sort().map(s => ({ id: s, label: s }))
              ]}
              variant="minimal"
            />
            {activeTab === 'loans' && (
              <>
                <Select 
                  value={filters.grade} 
                  onChange={e => setFilters({...filters, grade: e.target.value})}
                  options={[
                    { id: '', label: 'All Classes' },
                    ...Array.from(new Set(students.map(s => s.class))).filter(Boolean).sort().map(c => ({ id: c, label: c }))
                  ]}
                  variant="minimal"
                />
              </>
            )}
          </div>
          <div className="results-count">
            Showing {activeTab === 'catalog' ? filteredBooks.length : filteredBorrows.length} records
          </div>
        </div>

        {/* Content Section */}
        <div className="lib-body-content">
          {activeTab === 'catalog' ? (
            <div className="lib-grid">
              {filteredBooks.map(book => (
                <div key={book.id} className="lib-card">
                  <div className="lib-card-img">
                    {book.available_copies > 0 ? (
                      <div className="lib-card-badge">Available</div>
                    ) : (
                      <div className="lib-card-badge" style={{ background: '#fef2f2', color: '#ef4444' }}>All Loaned</div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(45deg, #f8fafc 0%, #f1f5f9 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ 
                        width: 100, height: 140, background: '#fff', borderRadius: 8, boxShadow: '0 10px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', padding: 12, border: '1px solid #e2e8f0',
                        transform: 'rotate(-5deg) translateX(-10px)'
                      }}>
                        <div style={{ height: 4, width: '40%', background: '#e2e8f0', borderRadius: 2, marginBottom: 8 }}></div>
                        <div style={{ height: 4, width: '80%', background: '#5b3ef5', borderRadius: 2, marginBottom: 4, opacity: 0.3 }}></div>
                        <div style={{ height: 4, width: '60%', background: '#5b3ef5', borderRadius: 2, marginBottom: 4, opacity: 0.3 }}></div>
                        <div style={{ marginTop: 'auto', display: 'flex', gap: 4 }}>
                           <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f1f5f9' }}></div>
                           <div style={{ flex: 1, height: 12, borderRadius: 4, background: '#f1f5f9' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="lib-card-body">
                    <h4 className="lib-card-t">{book.title}</h4>
                    <div className="lib-card-auth">by {book.author || 'Unknown'}</div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#64748b', marginBottom: 20 }}>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>{book.subject || 'General'}</span>
                      <span>•</span>
                      <span>Code: {book.book_code || 'N/A'}</span>
                    </div>

                    <div className="lib-stats">
                      <div className="lib-stat">
                        <div className="lib-stat-l">Available</div>
                        <div className="lib-stat-v" style={{ color: book.available_copies > 0 ? '#10b981' : '#f59e0b' }}>
                          {book.available_copies} / {book.total_copies}
                        </div>
                      </div>
                      <div className="lib-stat">
                        <div className="lib-stat-l">Location</div>
                        <div className="lib-stat-v">{book.location || 'N/A'}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                      <button 
                        onClick={() => setBorrowModal({ open: true, data: { book_id: book.id } })}
                        disabled={book.available_copies === 0}
                        className="btn-primary" 
                        style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}
                      >
                        Issue Book
                      </button>
                      <button 
                        onClick={() => setBookModal({ open: true, data: book })}
                        className="btn-ghost" 
                        style={{ padding: '10px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredBooks.length === 0 && (
                <div className="lib-empty-state">
                  <div className="empty-ico"><SearchIcon size={48} /></div>
                  <h3>No books found</h3>
                  <p>Try adjusting your search terms or filters.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="lib-table-container">
                 <table className="lib-table">
                   <thead>
                     <tr>
                       <th className="lib-th">Student Detail</th>
                       <th className="lib-th">Resource Title</th>
                       <th className="lib-th">Dates</th>
                       <th className="lib-th">Status</th>
                       <th className="lib-th">Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredBorrows.map(borrow => (
                       <tr key={borrow.id} className="lib-tr">
                         <td className="lib-td">
                           <div className="row-main">{borrow.students?.name}</div>
                           <div className="row-sub">{borrow.students?.adm_no} • {borrow.students?.class}</div>
                         </td>
                         <td className="lib-td">
                           <div className="row-main">{borrow.library_books?.title}</div>
                           <div className="row-sub">{borrow.library_books?.book_code}</div>
                         </td>
                         <td className="lib-td">
                           <div className="row-main"><ClockIcon size={12} /> {borrow.due_date || 'N/A'}</div>
                           <div className="row-sub">Out: {borrow.borrow_date}</div>
                         </td>
                         <td className="lib-td">
                           <span className={`badge-pills ${borrow.status}`}>
                             {borrow.status}
                           </span>
                         </td>
                         <td className="lib-td">
                           {borrow.status === 'borrowed' ? (
                             <button className="btn-action-return" onClick={() => handleReturn(borrow)}>
                               Mark Returned
                             </button>
                           ) : (
                             <div className="row-main text-success" style={{ display:'flex', alignItems:'center', gap:4 }}>
                               <CheckIcon size={14} /> Done
                             </div>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {filteredBorrows.length === 0 && (
                   <div className="lib-empty-state">
                     <div className="empty-ico"><PlatformZapIcon size={48} /></div>
                     <h3>No active loans</h3>
                     <p>Everything is returned or no records match filters.</p>
                   </div>
                 )}
            </div>
          )}
        </div>
      </div>

      {/* Modals Implementation */}
      {bookModal.open && (
        <div className="modern-modal-overlay">
          <div className="modern-modal-card animate-scale-up">
            <div className="modal-header-modern">
              <h2>{bookModal.data ? 'Update Resource' : 'New Library Resource'}</h2>
              <button onClick={() => setBookModal({ open: false })}><CloseIcon size={20} /></button>
            </div>
            <form onSubmit={handleSaveBook} className="modal-form-modern">
               <div className="input-row">
                 <div className="input-group">
                   <label>Book Title</label>
                   <input name="title" defaultValue={bookModal.data?.title} required placeholder="e.g. Peak Physics Form 4" />
                 </div>
                 <div className="input-group">
                   <label>Author / Publisher</label>
                   <input name="author" defaultValue={bookModal.data?.author} placeholder="e.g. Oxford Press" />
                 </div>
               </div>
               <div className="input-row">
                 <div className="input-group">
                   <label>Subject</label>
                   <input name="subject" defaultValue={bookModal.data?.subject} placeholder="e.g. Science" />
                 </div>
                 <div className="input-group">
                   <label>ISBN / Catalog Code</label>
                   <input name="book_code" defaultValue={bookModal.data?.book_code} required placeholder="e.g. BK-4412" />
                 </div>
               </div>
               <div className="input-row">
                 <div className="input-group">
                   <label>Total Inventory</label>
                   <input type="number" name="total_copies" defaultValue={bookModal.data?.total_copies || 1} min="1" />
                 </div>
                 <div className="input-group">
                   <label>Placement (Shelf/Room)</label>
                   <input name="location" defaultValue={bookModal.data?.location} placeholder="e.g. Shelf A-1" />
                 </div>
               </div>
               <div className="modal-actions-modern">
                 <button type="button" className="btn-ghost" onClick={() => setBookModal({ open: false })}>Cancel</button>
                 <button type="submit" className="btn-primary">Save to Catalog</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {borrowModal.open && (
        <div className="modern-modal-overlay">
          <div className="modern-modal-card animate-scale-up">
             <div className="modal-header-modern">
              <h2>Issue Book Loan</h2>
              <button onClick={() => setBorrowModal({ open: false })}><CloseIcon size={20} /></button>
            </div>
            <form onSubmit={handleIssueBook} className="modal-form-modern">
               <div className="input-group">
                 <label>Select Resource</label>
                 <Select 
                   name="book_id"
                   defaultValue={borrowModal.data?.book_id}
                   options={books.filter(b => b.available_copies > 0).map(b => ({ id: b.id, label: `${b.title} (${b.book_code})` }))}
                   placeholder="-- Choose available book --"
                   style={{ width: '100%' }}
                 />
               </div>
               <div className="input-group">
                 <label>Select Student</label>
                 <Select 
                   name="student_id"
                   options={students.sort((a,b) => a.name.localeCompare(b.name)).map(s => ({ id: s.id, label: `${s.name} (${s.adm_no}) - ${s.class}` }))}
                   placeholder="-- Search student --"
                   style={{ width: '100%' }}
                 />
               </div>
               <div className="input-row">
                 <div className="input-group">
                   <label>Due Date</label>
                   <input type="date" name="due_date" defaultValue={new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]} />
                 </div>
               </div>
               <div className="input-group">
                 <label>Admin Notes</label>
                 <textarea name="notes" placeholder="Condition details, etc..." />
               </div>
               <div className="modal-actions-modern">
                 <button type="button" className="btn-ghost" onClick={() => setBorrowModal({ open: false })}>Cancel</button>
                 <button type="submit" className="btn-primary">Confirm Issue</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {printModal.open && (
        <div className="modern-modal-overlay">
          <div className="modern-modal-card mini animate-scale-up">
            <div className="modal-header-modern">
              <h2>Export Reports</h2>
              <button onClick={() => setPrintModal({ open: false })}><CloseIcon size={20} /></button>
            </div>
            <div className="report-options-modern">
               <button onClick={() => printReport('all')}>
                 <div className="r-icon"><PrintIcon size={20} /></div>
                 <div className="r-txt">All Outstanding Loans</div>
               </button>
               <button onClick={() => {
                 const adm = window.prompt("Enter Student Admission Number");
                 if(adm) { setFilters({...filters, searchTerm: adm}); printReport('student'); }
               }}>
                 <div className="r-icon"><UserIcon size={20} /></div>
                 <div className="r-txt">Specific Student Ledger</div>
               </button>
               <button onClick={() => {
                 if(!filters.grade) return alert("Select a class in filters first");
                 printReport('class');
               }}>
                 <div className="r-icon"><GraduationIcon size={20} /></div>
                 <div className="r-txt">Class Report: {filters.grade}</div>
               </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .library-modern { padding: 0px; background: transparent; min-height: 100vh; animation: libFadeIn 0.5s ease-out; }
        @keyframes libFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .lib-main-wrap { padding: 0; }

        .lib-nav-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; gap: 24px; }
        .lib-tabs-modern { display: flex; background: #eaedf2; padding: 6px; border-radius: 100px; gap: 4px; }
        .lib-tabs-modern button { 
          padding: 10px 24px; border-radius: 100px; border: none; background: transparent; 
          font-weight: 700; font-size: 0.9rem; color: #64748b; cursor: pointer; transition: all 0.2s;
        }
        .lib-tabs-modern button.active { background: #fff; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

        .lib-search-modern { 
          flex: 1; max-width: 400px; position: relative; display: flex; align-items: center; 
          background: #fff; border: 1.5px solid #e2e8f0; border-radius: 100px; padding: 0 20px;
          transition: all 0.2s;
        }
        .lib-search-modern:focus-within { border-color: #5b3ef5; box-shadow: 0 0 0 4px rgba(91, 62, 245, 0.1); }
        .lib-search-modern input { border: none; padding: 14px 12px; width: 100%; outline: none; font-size: 0.95rem; font-weight: 500; }
        .lib-search-modern svg { color: #94a3b8; }

        .lib-filter-strip { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 0 8px; }
        .filter-group { display: flex; align-items: center; gap: 12px; }
        .results-count { font-size: 0.85rem; color: #64748b; font-weight: 500; }

        .lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 32px; }
        .lib-card { 
          background: #fff; border-radius: 32px; border: 1.5px solid #e2e8f0; overflow: hidden; 
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lib-card:hover { transform: translateY(-8px); box-shadow: 0 30px 60px rgba(15, 23, 42, 0.08); border-color: #5b3ef5; }
        
        .lib-card-img { height: 200px; background: #f8fafc; position: relative; transition: all 0.4s; }
        .lib-card-badge { 
          position: absolute; top: 16px; right: 16px; z-index: 5; background: #10b981; color: #fff; 
          padding: 6px 14px; border-radius: 100px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
        }
        .lib-card-body { padding: 32px; }
        .lib-card-t { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
        .lib-card-auth { font-size: 0.9rem; color: #64748b; margin-bottom: 20px; }
        .badge { background: #f1f5f9; color: #64748b; padding: 4px 10px; border-radius: 100px; font-size: 0.75rem; font-weight: 700; }

        .lib-stats { display: flex; gap: 16px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #f1f5f9; }
        .lib-stat { flex: 1; }
        .lib-stat-l { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; }
        .lib-stat-v { font-size: 0.95rem; font-weight: 700; color: #0f172a; }

        .btn-primary { background: #5b3ef5; color: #fff; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; }
        .btn-primary:hover { background: #4a32d4; }
        .btn-ghost { background: transparent; border: 1px solid #e2e8f0; color: #64748b; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-ghost:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }

        .lib-table-container { background: #fff; border-radius: 32px; border: 1.5px solid #e2e8f0; padding: 8px; overflow: hidden; }
        .lib-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .lib-th { text-align: left; padding: 20px 24px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; border-bottom: 1.5px solid #f1f5f9; }
        .lib-td { padding: 20px 24px; font-size: 0.95rem; color: #1e293b; border-bottom: 1px solid #f8fafc; }
        .lib-tr:last-child .lib-td { border-bottom: none; }
        .lib-tr:hover .lib-td { background: #f8fafc; }
        .row-main { font-weight: 700; color: #0f172a; margin-bottom: 2px; }
        .row-sub { font-size: 0.8rem; color: #64748b; }
        
        .badge-pills { padding: 6px 14px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
        .badge-pills.borrowed { background: #fff7ed; color: #f59e0b; }
        .badge-pills.returned { background: #f0fdf4; color: #10b981; }

        .btn-action-return { background: #eff6ff; color: #2563eb; border: none; padding: 8px 16px; border-radius: 100px; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
        .btn-action-return:hover { background: #2563eb; color: #fff; }

        .modern-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 24px; }
        .modern-modal-card { background: #fff; border-radius: 32px; width: 100%; max-width: 600px; padding: 40px; box-shadow: 0 40px 100px rgba(0,0,0,0.2); }
        .modern-modal-card.mini { max-width: 440px; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

        .modal-header-modern { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .modal-header-modern h2 { font-size: 1.5rem; font-weight: 900; margin: 0; color: #0f172a; }
        .modal-header-modern button { background: #f1f5f9; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; }

        .input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .input-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; }
        .input-group input, .input-group textarea { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px; outline: none; font-size: 0.95rem; font-weight: 500; transition: all 0.2s; }
        .input-group input:focus { border-color: #5b3ef5; background: #fff; }
        .modal-actions-modern { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }

        .report-options-modern { display: flex; flex-direction: column; gap: 12px; }
        .report-options-modern button { 
          display: flex; align-items: center; gap: 16px; padding: 20px; background: #f8fafc; 
          border: 1.5px solid #e2e8f0; border-radius: 20px; cursor: pointer; transition: all 0.2s; text-align: left;
        }
        .report-options-modern button:hover { border-color: #5b3ef5; background: #fff; transform: translateX(8px); }
        .r-icon { width: 44px; height: 44px; background: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #5b3ef5; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .r-txt { font-weight: 700; color: #0f172a; font-size: 0.95rem; }
      `}</style>
    </div>
  );
}
