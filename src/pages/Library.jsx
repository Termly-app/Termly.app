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
  ClockIcon, AlertIcon
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
    <div className="library-page glass-panel">
      <Helmet>
        <title>School Library & Resource Management | ShuleSoft — Digital Catalog</title>
        <meta name="description" content="Track school books, manage student loans, and audit library resources with our digital catalog system." />
      </Helmet>
      {/* Header */}
      <div className="lib-header">
        <div className="lib-title-area">
          <div className="lib-icon-sq"><BookIcon size={24} color="var(--primary)" /></div>
          <div>
            <h1 className="lib-h1">Library Management</h1>
            <p className="lib-sub">Manage catalog, track borrows, and audit school resources.</p>
          </div>
        </div>
        <div className="lib-actions">
          <button className="btn-p" onClick={() => setBookModal({ open: true, data: null })}>
            <PlusIcon size={16} /> Add Book
          </button>
          <button className="btn-s" onClick={() => setBorrowModal({ open: true, data: null })}>
            <ZapIcon size={16} /> Issue Book
          </button>
          <button className="btn-s" onClick={() => setPrintModal({ open: true })}>
            <PrintIcon size={16} /> Reports
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="lib-tabs">
        <button className={`lib-tab ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}>Book Catalog</button>
        <button className={`lib-tab ${activeTab === 'loans' ? 'active' : ''}`} onClick={() => setActiveTab('loans')}>Active Loans</button>
      </div>

      {/* Toolbar */}
      <div className="lib-toolbar">
        <div className="lib-search">
          <SearchIcon size={16} />
          <input 
            type="text" 
            placeholder={activeTab === 'catalog' ? "Search by title, author, isbn or code..." : "Search by student name, adm no or book..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="lib-filters">
          <Select 
            value={filters.subject} 
            onChange={e => setFilters({...filters, subject: e.target.value})}
            options={[
              { id: '', label: 'All Subjects' },
              ...Array.from(new Set(books.map(b => b.subject))).filter(Boolean).sort().map(s => ({ id: s, label: s }))
            ]}
            style={{ minWidth: 140 }}
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
                style={{ minWidth: 120 }}
              />
              <Select 
                value={filters.stream} 
                onChange={e => setFilters({...filters, stream: e.target.value})}
                options={[
                  { id: '', label: 'All Streams' },
                  ...Array.from(new Set(students.map(s => s.stream))).filter(Boolean).sort().map(s => ({ id: s, label: s }))
                ]}
                style={{ minWidth: 120 }}
              />
            </>
          )}
          {activeTab === 'catalog' && (
            <Select 
              value={filters.year} 
              onChange={e => setFilters({...filters, year: e.target.value})}
              options={[
                { id: '', label: 'All Years' },
                ...Array.from(new Set(books.map(b => String(b.year_registered)))).filter(Boolean).sort().map(y => ({ id: y, label: y }))
              ]}
              style={{ minWidth: 110 }}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="lib-content">
        {activeTab === 'catalog' ? (
          <div className="catalog-grid">
            {filteredBooks.map(book => (
              <div key={book.id} className="book-card">
                <div className="book-info">
                  <div className="book-main">
                    <div className="book-title">{book.title}</div>
                    <div className="book-author">by {book.author || 'Unknown'}</div>
                  </div>
                  <div className="book-details">
                    <span className="b-tag">{book.subject || 'General'}</span>
                    <span className="b-tag">{book.book_code || book.isbn || 'No Code'}</span>
                  </div>
                </div>
                <div className="book-meta">
                  <div className="b-stat">
                    <span className="b-label">Available</span>
                    <span className={`b-val ${book.available_copies === 0 ? 'out' : ''}`}>
                      {book.available_copies} / {book.total_copies}
                    </span>
                  </div>
                  <div className="b-ops">
                    <button className="op-btn" onClick={() => setBookModal({ open: true, data: book })}><EditIcon size={14} /></button>
                    <button className="op-btn red" onClick={async () => { if(window.confirm('Delete book?')) { await deleteBook(book.id); loadData(); } }}><DeleteIcon size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            {filteredBooks.length === 0 && <div className="empty-state">No books found matching criteria.</div>}
          </div>
        ) : (
          <div className="loans-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Student Info</th>
                  <th>Book Owed</th>
                  <th>Borrow Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBorrows.map(borrow => (
                  <tr key={borrow.id} className={borrow.status === 'returned' ? 'row-returned' : ''}>
                    <td>
                      <div className="td-name">{borrow.students?.name}</div>
                      <div className="td-sub">{borrow.students?.adm_no} · {borrow.students?.class} {borrow.students?.stream}</div>
                    </td>
                    <td>
                      <div className="td-book">{borrow.library_books?.title}</div>
                      <div className="td-sub">{borrow.library_books?.book_code || '-'}</div>
                    </td>
                    <td>{borrow.borrow_date}</td>
                    <td>{borrow.due_date || 'N/A'}</td>
                    <td>
                      <span className={`status-pill ${borrow.status}`}>
                        {borrow.status}
                      </span>
                    </td>
                    <td>
                      {borrow.status === 'borrowed' && (
                        <button className="btn-sm" onClick={() => handleReturn(borrow)}>
                          Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBorrows.length === 0 && <div className="empty-state">No active loans found.</div>}
          </div>
        )}
      </div>

      {/* Modals - Simplified for brevity in this prompt, will implement full in final pass */}
      {bookModal.open && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h2>{bookModal.data ? 'Edit Book' : 'Add New Book'}</h2>
              <button onClick={() => setBookModal({ open: false })} className="modal-close"><CloseIcon size={20} /></button>
            </div>
            <form onSubmit={handleSaveBook} className="modal-form">
              <div className="f-row">
                <div className="f-group">
                  <label>Title *</label>
                  <input name="title" defaultValue={bookModal.data?.title} required />
                </div>
                <div className="f-group">
                  <label>Author</label>
                  <input name="author" defaultValue={bookModal.data?.author} />
                </div>
              </div>
              <div className="f-row">
                <div className="f-group">
                  <label>Subject</label>
                  <input name="subject" defaultValue={bookModal.data?.subject} />
                </div>
                <div className="f-group">
                  <label>Grade/Level</label>
                  <input name="grade" defaultValue={bookModal.data?.grade} />
                </div>
              </div>
              <div className="f-row">
                <div className="f-group">
                  <label>ISBN</label>
                  <input name="isbn" defaultValue={bookModal.data?.isbn} />
                </div>
                <div className="f-group">
                  <label>Book Code *</label>
                  <input name="book_code" defaultValue={bookModal.data?.book_code} required />
                </div>
              </div>
              <div className="f-row">
                <div className="f-group">
                  <label>Total Copies</label>
                  <input type="number" name="total_copies" defaultValue={bookModal.data?.total_copies || 1} min="1" required />
                </div>
                <div className="f-group">
                  <label>Registration Year</label>
                  <input type="number" name="year_registered" defaultValue={bookModal.data?.year_registered || new Date().getFullYear()} />
                </div>
              </div>
              <div className="f-row">
                  <div className="f-group">
                    <label>Location (Shelf/Room)</label>
                    <input name="location" defaultValue={bookModal.data?.location} />
                  </div>
                  {bookModal.data && (
                    <div className="f-group">
                      <label>Available Copies</label>
                      <input type="number" name="available_copies" defaultValue={bookModal.data?.available_copies} />
                    </div>
                  )}
              </div>
              <div className="modal-foot">
                <button type="submit" className="btn-p">Save Book</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {borrowModal.open && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h2>Issue Book</h2>
              <button onClick={() => setBorrowModal({ open: false })} className="modal-close"><CloseIcon size={20} /></button>
            </div>
            <form onSubmit={handleIssueBook} className="modal-form">
              <div className="f-group">
                <label>Select Book *</label>
                <Select 
                  name="book_id"
                  options={books.filter(b => b.available_copies > 0).map(b => ({ id: b.id, label: `${b.title} (${b.book_code})` }))}
                  placeholder="-- Choose Book --"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="f-group">
                <label>Select Student *</label>
                <Select 
                  name="student_id"
                  options={students.sort((a,b) => a.name.localeCompare(b.name)).map(s => ({ id: s.id, label: `${s.name} (${s.adm_no}) - ${s.class}` }))}
                  placeholder="-- Choose Student --"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="f-group">
                <label>Due Date</label>
                <input type="date" name="due_date" defaultValue={new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]} />
              </div>
              <div className="f-group">
                <label>Notes</label>
                <textarea name="notes" placeholder="Condition of book, special instructions..." />
              </div>
              <div className="modal-foot">
                <button type="submit" className="btn-p">Issue Book</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printModal.open && (
        <div className="modal-overlay">
          <div className="modal-card small">
            <div className="modal-head">
              <h2>Library Reports</h2>
              <button onClick={() => setPrintModal({ open: false })} className="modal-close"><CloseIcon size={20} /></button>
            </div>
            <div className="print-options">
              <button className="print-opt" onClick={() => printReport('all')}>
                <div className="opt-icon"><PrintIcon size={20} /></div>
                <div className="opt-txt">All Outstanding Loans</div>
              </button>
              <button className="print-opt" onClick={() => {
                const adm = window.prompt("Enter Student Admission Number");
                if(adm) { setFilters({...filters, searchTerm: adm}); printReport('student'); }
              }}>
                <div className="opt-icon"><UserIcon size={20} /></div>
                <div className="opt-txt">By Student (Admission No)</div>
              </button>
              <button className="print-opt" onClick={() => {
                if(!filters.grade) return alert("Select a class in the dashboard filters first");
                printReport('class');
              }}>
                <div className="opt-icon"><GraduationIcon size={20} /></div>
                <div className="opt-txt">By Class: {filters.grade || 'Select Grade'}</div>
              </button>
              <button className="print-opt" onClick={() => {
                if(!filters.subject || !filters.grade) return alert("Select both a Subject and a Class in the filters first");
                printReport('subject-class');
              }}>
                <div className="opt-icon"><SearchIcon size={20} /></div>
                <div className="opt-txt">By Subject for this Class</div>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .library-page { padding: 30px; }
        .lib-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .lib-title-area { display: flex; gap: 15px; align-items: center; }
        .lib-icon-sq { width: 48px; height: 48px; border-radius: 12px; background: rgba(124, 92, 252, 0.1); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(124, 92, 252, 0.2); }
        .lib-h1 { fontSize: 1.5rem; fontWeight: 800; color: #fff; margin: 0; }
        .lib-sub { fontSize: 0.85rem; color: var(--sub); margin: 0; }
        .lib-actions { display: flex; gap: 10px; }
        
        .lib-tabs { display: flex; gap: 10px; margin-bottom: 24px; border-bottom: 1px solid var(--edge); padding-bottom: 10px; }
        .lib-tab { background: none; border: none; padding: 8px 16px; font-size: 0.9rem; color: var(--sub); cursor: pointer; border-radius: 8px; transition: all 0.2s; }
        .lib-tab.active { background: rgba(124, 92, 252, 0.1); color: var(--vi); font-weight: 700; }
        
        .lib-toolbar { display: flex; gap: 20px; align-items: center; margin-bottom: 24px; }
        .lib-search { flex: 1; display: flex; align-items: center; gap: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--edge); padding: 10px 16px; borderRadius: 12px; }
        .lib-search input { background: none; border: none; color: #fff; width: 100%; outline: none; font-size: 0.9rem; }
        .lib-filters { display: flex; gap: 10px; }
        .lib-filters select { background: rgba(255, 255, 255, 0.03); border: 1px solid var(--edge); color: var(--sub); padding: 8px 12px; borderRadius: 10px; outline: none; font-size: 0.85rem; }
        
        .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .book-card { background: rgba(255, 255, 255, 0.02); border: 1px solid var(--edge); padding: 20px; borderRadius: 16px; display: flex; flex-direction: column; gap: 20px; transition: transform 0.2s; }
        .book-card:hover { transform: translateY(-4px); background: rgba(255, 255, 255, 0.04); }
        .book-title { fontSize: 1.1rem; fontWeight: 700; color: #fff; margin-bottom: 4px; }
        .book-author { fontSize: 0.8rem; color: var(--sub); }
        .book-details { display: flex; gap: 8px; margin-top: 10px; }
        .b-tag { fontSize: 0.65rem; background: rgba(255, 255, 255, 0.05); padding: 3px 8px; borderRadius: 4px; color: var(--sub); textTransform: uppercase; letterSpacing: 0.05em; }
        .book-meta { display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px dashed var(--edge); }
        .b-stat { display: flex; flex-direction: column; }
        .b-label { fontSize: 0.6rem; color: var(--sub); textTransform: uppercase; }
        .b-val { fontSize: 0.9rem; fontWeight: 700; color: var(--primary); }
        .b-val.out { color: var(--ro); }
        .b-ops { display: flex; gap: 6px; }
        .op-btn { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--edge); color: var(--sub); width: 32px; height: 32px; borderRadius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .op-btn:hover { background: rgba(124, 92, 252, 0.15); color: var(--vi); }
        .op-btn.red:hover { background: rgba(239, 68, 68, 0.1); color: var(--ro); }

        .loans-table-wrapper { overflow-x: auto; background: rgba(255, 255, 255, 0.02); borderRadius: 16px; border: 1px solid var(--edge); }
        .lib-table { width: 100%; border-collapse: collapse; }
        .lib-table th { text-align: left; padding: 16px; fontSize: 0.75rem; textTransform: uppercase; letterSpacing: 0.05em; color: var(--sub); border-bottom: 1px solid var(--edge); }
        .lib-table td { padding: 16px; border-bottom: 1px solid var(--edge); verticalAlign: middle; }
        .td-name { fontSize: 0.95rem; fontWeight: 700; color: #fff; }
        .td-book { fontSize: 0.95rem; fontWeight: 600; color: var(--primary); }
        .td-sub { fontSize: 0.75rem; color: var(--sub); marginTop: 2px; }
        .status-pill { padding: 4px 10px; borderRadius: 20px; fontSize: 0.7rem; fontWeight: 700; textTransform: uppercase; }
        .status-pill.borrowed { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-pill.returned { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .btn-sm { padding: 6px 14px; background: rgba(124, 92, 252, 0.15); border: 1px solid rgba(124, 92, 252, 0.3); color: var(--vi); borderRadius: 8px; fontSize: 0.75rem; fontWeight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-sm:hover { background: var(--vi); color: #fff; }
        .row-returned { opacity: 0.6; }

        .empty-state { padding: 60px; text-align: center; color: var(--sub); fontSize: 0.9rem; fontStyle: italic; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }
        .modal-card { background: var(--bg); border: 1px solid var(--edge); borderRadius: 24px; padding: 30px; width: 100%; maxWidth: 600px; boxShadow: 0 40px 80px rgba(0,0,0,0.5); }
        .modal-card.small { maxWidth: 400px; }
        .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .modal-head h2 { fontSize: 1.3rem; margin: 0; color: #fff; }
        .modal-close { background: none; border: none; color: var(--sub); cursor: pointer; }
        .f-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .f-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .f-group label { fontSize: 0.75rem; color: var(--sub); textTransform: uppercase; fontWeight: 600; }
        .f-group input, .f-group select, .f-group textarea { background: rgba(255,255,255,0.03); border: 1px solid var(--edge); color: #fff; padding: 12px 14px; borderRadius: 12px; outline: none; font-size: 0.9rem; }
        .f-group textarea { height: 80px; resize: none; }
        .modal-foot { display: flex; justify-content: flex-end; margin-top: 10px; }
        
        .print-options { display: grid; gap: 12px; }
        .print-opt { display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(255,255,255,0.03); border: 1px solid var(--edge); borderRadius: 16px; color: #fff; text-align: left; cursor: pointer; transition: all 0.2s; width: 100%; }
        .print-opt:hover { background: rgba(124, 92, 252, 0.1); border-color: rgba(124, 92, 252, 0.3); }
        .opt-icon { width: 40px; height: 40px; background: rgba(255,255,255,0.05); borderRadius: 10px; display: flex; align-items: center; justify-content: center; color: var(--sub); }
        .opt-txt { fontWeight: 600; font-size: 0.9rem; }
      `}</style>
    </div>
  );
}
