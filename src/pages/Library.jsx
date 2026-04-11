import React, { useState, useEffect, useMemo } from 'react';
import Select from '../components/Common/Select';
import { Helmet } from 'react-helmet-async';
import { 
  getBooks, saveBook, getBorrows, saveBorrow, returnBook, deleteBook,
  getStudents, getPrintHeader, getSchoolProfile
} from '../data/store';
import { CBC_STRUCTURE, getSubjectsForGrade } from '../data/seedData';
import { 
  PlusIcon, SearchIcon, BookIcon, UserIcon, PrintIcon, 
  CheckIcon, CloseIcon, EditIcon, DeleteIcon, ChevronDownIcon,
  ClockIcon, AlertIcon, PlatformZapIcon, FilterIcon, GraduationIcon
} from '../components/CommonIcons';
import Loader from '../components/Common/Loader';
import { useDialog } from '../contexts/DialogContext';

export default function Library({ currentUser, currentPeriodId }) {
  const { alert, confirm, prompt } = useDialog();
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('catalog'); // catalog, loans
  const [searchTerm, setSearchTerm] = useState('');
  const [profile, setProfile] = useState({ streams: [], activeClasses: [] });
  
  // Modals
  const [bookModal, setBookModal] = useState({ open: false, data: null });
  const [borrowModal, setBorrowModal] = useState({ open: false, data: null });
  const [printModal, setPrintModal] = useState({ open: false });
  const [modalGrade, setModalGrade] = useState('');
  const [modalCategory, setModalCategory] = useState('');

  const LIB_CATEGORIES = [
    'Textbook', 'Setbook', 'Storybook', 'Revision Kit', 
    'Reference Work', 'Teacher Manual', 'Periodical', 'Visual Aid'
  ];

  // Filters for search
  const [filters, setFilters] = useState({
    subject: '',
    category: '',
    grade: '',
    stream: '',
    year: '',
  });

  const availableSubjects = useMemo(() => {
    if (!profile.activeClasses || profile.activeClasses.length === 0) return [];
    const subs = new Set();
    profile.activeClasses.forEach(grade => {
      const gSubs = getSubjectsForGrade(grade, profile);
      if (Array.isArray(gSubs)) {
        gSubs.forEach(s => subs.add(s));
      } else if (typeof gSubs === 'object') {
        Object.values(gSubs).flat().forEach(s => subs.add(s));
      }
    });
    return Array.from(subs).sort();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bk, br, st, prof] = await Promise.all([
        getBooks(),
        getBorrows(),
        getStudents(),
        getSchoolProfile()
      ]);
      setBooks(bk);
      setBorrows(br);
      setStudents(st);
      setProfile(prof);
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
      
      const isGlobal = ['Storybook', 'Reference Work', 'Periodical', 'Visual Aid'].includes(b.category);
      const matchesCategory = !filters.category || b.category === filters.category;
      const matchesSubject = !filters.subject || b.subject === filters.subject;
      const matchesGrade = isGlobal || !filters.grade || b.grade === filters.grade;
      const matchesYear = !filters.year || String(b.year_registered) === filters.year;
      
      return matchesSearch && matchesCategory && matchesSubject && matchesGrade && matchesYear;
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
      const matchesCategory = !filters.category || b.library_books?.category === filters.category;
      
      return matchesSearch && matchesClass && matchesStream && matchesSubject && matchesCategory;
    });
  }, [borrows, searchTerm, filters]);

  const handleSaveBook = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      id: bookModal.data?.id,
      title: formData.get('title'),
      author: formData.get('author'),
      category: formData.get('category'),
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
    } catch (err) { alert({ message: err.message, variant: 'danger' }); }
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
    } catch (err) { alert({ message: err.message, variant: 'danger' }); }
  };

  const handleReturn = async (borrow) => {
    const ok = await confirm({ 
      title: 'Return Book', 
      message: `Mark "${borrow.library_books?.title}" as returned?`,
      variant: 'warning'
    });
    if (!ok) return;
    try {
      await returnBook(borrow.id, borrow.book_id);
      loadData();
    } catch (err) { alert({ message: err.message, variant: 'danger' }); }
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
                <th>Admission</th>
                <th>Student</th>
                <th>Book Title</th>
                <th>Code</th>
                <th>Borrowed On</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(r => `
                <tr>
                  <td>${r.students?.adm_no}</td>
                  <td>${r.students?.name}</td>
                  <td>${r.library_books?.title}</td>
                  <td>${r.library_books?.book_code || '-'}</td>
                  <td>${r.borrow_date}</td>
                  <td>${r.due_date || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8;">
            Library Management System
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
    <div className="animate-in">
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
            <button className="btn btn-primary btn-sm" onClick={() => { setModalGrade(''); setModalCategory(''); setBookModal({ open: true, data: null }); }}>
              <PlusIcon size={14} /> New Entry
            </button>
          </div>
        </div>
      </div>

      <div className="">
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <div className="kpi-card purple">
            <div className="kpi-icon purple"><BookIcon size={24} /></div>
            <div className="kpi-value">{books.length}</div>
            <div className="kpi-label">Total Books</div>
          </div>
          <div className="kpi-card orange">
            <div className="kpi-icon orange"><ClockIcon size={24} /></div>
            <div className="kpi-value">{borrows.filter(b => b.status === 'borrowed').length}</div>
            <div className="kpi-label">Active Loans</div>
          </div>
        </div>

      {/* Standard Card Container */}
      <div className="card">
        <div className="card-header" style={{ paddingBottom: 16 }}>
          <div className="tab-nav" style={{ marginBottom: 0 }}>
            <button className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}>Inventory View</button>
            <button className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`} onClick={() => setActiveTab('loans')}>Circulation Desk</button>
          </div>
          <div className="search-bar" style={{ 
            maxWidth: 320, 
            background: 'var(--bg)', 
            borderRadius: '12px', 
            border: '1.5px solid var(--border)', 
            transition: 'var(--transition)' 
          }}>
            <span className="search-icon" style={{ color: 'var(--text-light)' }}><SearchIcon size={16} /></span>
            <input className="form-input" 
              type="text" 
              placeholder={activeTab === 'catalog' ? "Search resources..." : "Find loan records..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
              onFocus={(e) => e.target.parentElement.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.parentElement.style.borderColor = 'var(--border)'}
            />
          </div>
        </div>

        <div className="filter-bar" style={{ padding: "0 20px" }}>
          <div className="filter-group">
            <FilterIcon size={14} />
            
            <Select 
              value={filters.category} 
              onChange={e => setFilters({...filters, category: e.target.value})}
              options={[
                { id: '', label: 'All Categories' },
                ...LIB_CATEGORIES.map(c => ({ id: c, label: c }))
              ]}
              variant="minimal"
            />

            <Select 
              value={filters.grade} 
              onChange={e => setFilters({...filters, grade: e.target.value, stream: ''})}
              options={[
                { id: '', label: 'All Classes' },
                ...Object.entries(CBC_STRUCTURE).flatMap(([ln, ld]) => {
                  const isMatch = (g1, g2) => g1?.toLowerCase().trim() === g2?.toLowerCase().trim();
                  const active = ld.grades.filter(g => 
                    (profile.activeClasses || []).some(ac => isMatch(ac, g))
                  );
                  return active.map(g => ({ id: g, label: g }));
                })
              ]}
              variant="minimal"
            />
            
            <Select 
              value={filters.stream} 
              onChange={e => setFilters({...filters, stream: e.target.value})}
              options={[
                { id: '', label: 'All Streams' },
                ...(filters.grade 
                  ? (profile.streamsPerClass?.[filters.grade] || []) 
                  : Object.values(profile.streamsPerClass || {}).flat().filter((v, i, a) => a.indexOf(v) === i)
                ).map(stream => ({ id: stream, label: stream }))
              ]}
              variant="minimal"
            />

            <Select 
              value={filters.subject} 
              onChange={e => setFilters({...filters, subject: e.target.value})}
              options={[
                { id: '', label: 'All Subjects' },
                ...availableSubjects.map(s => ({ id: s, label: s }))
              ]}
              variant="minimal"
            />
          </div>
          <div className="results-count">
            Showing {activeTab === 'catalog' ? filteredBooks.length : filteredBorrows.length} records
          </div>
        </div>

        {/* Content Section */}
        <div className="card-body" style={{ padding: 20 }}>
          {activeTab === 'catalog' ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
              {filteredBooks.map(book => (
                <div key={book.id} className="card">
                  <div style={{ height: 160, background: "#f8fafc", position: "relative" }}>
                    {book.available_copies > 0 ? (
                      <div className="badge badge-success" style={{ position: "absolute", top: 12, right: 12, zIndex: 5 }}>Available</div>
                    ) : (
                      <div className="badge badge-success" style={{ position: "absolute", top: 12, right: 12, zIndex: 5, background: '#fef2f2', color: '#ef4444' }}>All Loaned</div>
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
                  <div className="card-body" style={{ padding: "16px 20px" }}>
                    <h4 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 4px 0" }}>{book.title}</h4>
                    <div className="text-muted" style={{ marginBottom: 16, fontSize: "0.85rem" }}>by {book.author || 'Unknown'}</div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{book.category || 'Book'}</span>
                      {book.grade && <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{book.grade}</span>}
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem' }}>{book.subject || 'General'}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: 16 }}>
                      Code: <code className="font-mono">{book.book_code || 'N/A'}</code>
                    </div>

                    <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>Available</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: book.available_copies > 0 ? '#10b981' : '#f59e0b' }}>
                          {book.available_copies} / {book.total_copies}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>Location</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>{book.location || 'N/A'}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                      <button 
                        onClick={() => setBorrowModal({ open: true, data: { book_id: book.id } })}
                        disabled={book.available_copies === 0}
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}
                      >
                        Issue Book
                      </button>
                      <button 
                        onClick={() => { 
                          setModalGrade(book.grade || ''); 
                          setModalCategory(book.category || 'Textbook');
                          setBookModal({ open: true, data: book }); 
                        }}
                        className="btn btn-ghost" 
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
            <div className="table-wrapper">
              {filteredBorrows.length === 0 ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', background: 'rgba(248, 250, 252, 0.5)', borderRadius: 20, border: '2px dashed var(--border)' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--text-light)' }}>
                  <ClockIcon size={32} />
                </div>
                <h3 style={{ color: 'var(--text-main)', marginBottom: 8 }}>No active loans</h3>
                <p style={{ color: 'var(--text-light)', maxWidth: 300, margin: '0 auto' }}>Loan records will appear here once you issue books to students.</p>
              </div>
            ) : (
                 <table className="data-table">
                   <thead>
                     <tr>
                       <th >Adm No</th>
                       <th >Student Name</th>
                       <th >Resource Title</th>
                       <th >Dates</th>
                       <th >Status</th>
                       <th >Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredBorrows.map(borrow => (
                       <tr key={borrow.id} >
                         <td >
                            <div className="row-main">{borrow.students?.adm_no}</div>
                         </td>
                         <td >
                           <div className="row-main">{borrow.students?.name}</div>
                           <div className="row-sub">{borrow.students?.class}</div>
                         </td>
                         <td >
                           <div className="row-main">{borrow.library_books?.title}</div>
                           <div className="row-sub">{borrow.library_books?.book_code}</div>
                         </td>
                         <td >
                           <div className="row-main"><ClockIcon size={12} /> {borrow.due_date || 'N/A'}</div>
                           <div className="row-sub">Out: {borrow.borrow_date}</div>
                         </td>
                         <td >
                           <span className={`badge-pills ${borrow.status}`}>
                             {borrow.status}
                           </span>
                         </td>
                         <td >
                           {borrow.status === 'borrowed' ? (
                             <button className="btn btn-sm btn-ghost" onClick={() => handleReturn(borrow)}>
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

      </div>
      {/* Modals Implementation */}
      {bookModal.open && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{bookModal.data ? 'Update Resource' : 'New Library Resource'}</h3>
              <button className="modal-close" onClick={() => setBookModal({ open: false })}>×</button>
            </div>
            <div className="modal-body">
            <form onSubmit={handleSaveBook} className="form-group">
               <div className="form-row">
                 <div className="form-group">
                   <label>Resource Title</label>
                   <input className="form-input" name="title" defaultValue={bookModal.data?.title} required placeholder="e.g. Peak Physics Form 4" />
                 </div>
                 <div className="form-group">
                   <label>Resource Category</label>
                   <Select 
                      name="category"
                      value={modalCategory}
                      onChange={e => setModalCategory(e.target.value)}
                      options={LIB_CATEGORIES.map(c => ({ id: c, label: c }))}
                      style={{ width: '100%' }}
                      required
                   />
                 </div>
               </div>
               <div className="form-row">
                 <div className="form-group">
                   <label>Author / Publisher</label>
                   <input className="form-input" name="author" defaultValue={bookModal.data?.author} placeholder="e.g. Oxford Press" />
                 </div>
                 <div className="form-group">
                   <label>Class / Grade</label>
                   <Select
                     name="grade"
                     value={modalGrade}
                     onChange={e => setModalGrade(e.target.value)}
                     options={[
                       { id: '', label: '-- Select Class (Optional) --' },
                       ...Object.entries(CBC_STRUCTURE).flatMap(([ln, ld]) => {
                         const isMatch = (g1, g2) => g1?.toLowerCase().trim() === g2?.toLowerCase().trim();
                         const active = ld.grades.filter(g => 
                           (profile.activeClasses || []).some(ac => isMatch(ac, g))
                         );
                         return active.map(g => ({ id: g, label: g }));
                       })
                     ]}
                     style={{ width: '100%' }}
                   />
                 </div>
               </div>
               <div className="form-row">
                 <div className="form-group">
                   <label>Subject</label>
                   <Select
                     name="subject"
                     defaultValue={bookModal.data?.subject}
                     options={[
                       { id: '', label: '-- Select Subject (Optional) --' },
                       ...(modalGrade ? getSubjectsForGrade(modalGrade, profile) : availableSubjects).map(s => ({ id: s, label: s }))
                     ]}
                     style={{ width: '100%' }}
                   />
                 </div>
                 <div className="form-group">
                   <label>ISBN</label>
                   <input className="form-input" name="isbn" defaultValue={bookModal.data?.isbn} placeholder="e.g. 978-3-16..." />
                 </div>
               </div>
               <div className="form-row">
                  <div className="form-group">
                    <label>Catalog Code</label>
                    <input className="form-input" name="book_code" defaultValue={bookModal.data?.book_code} required placeholder="e.g. BK-4412" />
                  </div>
                  <div className="form-group">
                    <label>Total Inventory</label>
                    <input className="form-input" type="number" name="total_copies" defaultValue={bookModal.data?.total_copies || 1} min="1" />
                  </div>
                </div>
               <div className="form-row">
                 <div className="form-group">
                   <label>Placement (Shelf/Room)</label>
                   <input className="form-input" name="location" defaultValue={bookModal.data?.location} placeholder="e.g. Shelf A-1" />
                 </div>
               </div>
               </form>
            </div>
            <div className="modal-footer">
                 <button type="button" className="btn btn-ghost" onClick={() => setBookModal({ open: false })}>Cancel</button>
                 <button type="submit" className="btn btn-primary">Save to Catalog</button>
               </div>
                      </div>
        </div>
      )}

      {borrowModal.open && (
        <div className="modal-overlay">
          <div className="modal">
             <div className="modal-header">
              <h3>Issue Book Loan</h3>
              <button className="modal-close" onClick={() => setBorrowModal({ open: false })}>×</button>
            </div>
            <div className="modal-body">
            <form onSubmit={handleIssueBook} className="form-group">
               <div className="form-group">
                 <label>Select Resource</label>
                  <Select 
                    name="book_id"
                    defaultValue={borrowModal.data?.book_id}
                    options={books.filter(b => b.available_copies > 0).map(b => ({ 
                      id: b.id, 
                      label: `${b.title} [Code: ${b.book_code}]` 
                    }))}
                    placeholder="-- Search by Title or Book Code --"
                    style={{ width: '100%' }}
                    searchable={true}
                  />
               </div>
               <div className="form-group">
                 <label>Select Student</label>
                  <Select 
                    name="student_id"
                    options={students.sort((a,b) => a.name.localeCompare(b.name)).map(s => ({ 
                      id: s.id, 
                      label: `${s.adm_no} - ${s.name} (${s.class})` 
                    }))}
                    placeholder="-- Search by Name or Admission No --"
                    style={{ width: '100%' }}
                    searchable={true}
                  />
               </div>
               <div className="form-row">
                 <div className="form-group">
                   <label>Due Date</label>
                   <input className="form-input" type="date" name="due_date" defaultValue={new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]} />
                 </div>
               </div>
               <div className="form-group">
                 <label>Admin Notes</label>
                 <textarea className="form-input" name="notes" placeholder="Condition details, etc..." />
               </div>
               </form>
            </div>
            <div className="modal-footer">
                 <button type="button" className="btn btn-ghost" onClick={() => setBorrowModal({ open: false })}>Cancel</button>
                 <button type="submit" className="btn btn-primary">Confirm Issue</button>
               </div>
                      </div>
        </div>
      )}

      {printModal.open && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Export Reports</h3>
              <button className="modal-close" onClick={() => setPrintModal({ open: false })}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { id: 'all', title: 'All Outstanding Loans', sub: 'List of all unreturned resources', icon: <PrintIcon size={20} />, onClick: () => printReport('all') },
                  { id: 'student', title: 'Specific Student Ledger', sub: 'Loan history for a particular student', icon: <UserIcon size={20} />, onClick: async () => {
                    const adm = await prompt({ title: 'Student Ledger', message: 'Enter Student Admission Number', inputPlaceholder: 'e.g. ADM-001' });
                    if(adm) { setFilters({...filters, searchTerm: adm}); printReport('student'); }
                  }},
                  { id: 'class', title: `Class Report: ${filters.grade || 'None'}`, sub: 'Library usage summary for this class', icon: <GraduationIcon size={20} />, onClick: () => {
                    if(!filters.grade) return alert({ message: "Select a class in filters first", title: "Class Required", variant: 'warning' });
                    printReport('class');
                  }}
                ].map(item => (
                  <button 
                    key={item.id}
                    onClick={item.onClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '16px 20px',
                      background: 'rgba(255, 255, 255, 0.7)',
                      border: '1.5px solid rgba(0, 0, 0, 0.05)',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      width: '100%',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(14, 165, 233, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
                      e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)';
                    }}
                  >
                    <div style={{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: 12, 
                      background: 'var(--primary-50)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'var(--primary)',
                      flexShrink: 0
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>{item.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 }}>{item.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}
