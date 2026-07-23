import React, { useState, useEffect, useMemo } from 'react';
import { getLibraryBooks, createBook, updateBook, bulkGenerateCopies, getBookCopies, createManualCopies, updateBookCopy } from '../../data/libraryStore';
import { getSchoolProfile } from '../../data/coreStore';;
import { CBC_STRUCTURE, getSubjectsForGrade } from '../../data/seedData';
import Select from '../../components/Common/Select';
import { useDialog } from '../../contexts/DialogContext';
import {
  SearchIcon, PlusIcon, FilterIcon, BookIcon, EditIcon,
  MenuIcon, CloseIcon
} from '../../components/CommonIcons';
import Loader from '../../components/Common/Loader';

export default function BooksManagement({ currentUser, currentPeriodId }) {
  const role = currentUser?.role?.toLowerCase() || '';
  const isAdmin = role === 'admin';
  const isLibrarian = role === 'librarian';
  const canManage = isAdmin || isLibrarian;
  const { alert, toast } = useDialog();
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState([]);
  const [profile, setProfile] = useState({});

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setCategory] = useState('');
  const [filterSubject, setSubject] = useState('');
  const [filterLevel, setLevel] = useState('');

  // Modals
  const [bookModal, setBookModal] = useState({ open: false, data: null });
  const [copiesModal, setCopiesModal] = useState({ open: false, book: null, copies: [] });
  const [bulkModal, setBulkModal] = useState({ open: false, book: null });
  const [editCopyModal, setEditCopyModal] = useState(null);
  const [barcodeMethod, setBarcodeMethod] = useState('auto'); // auto or manual

  const LIB_CATEGORIES = ['textbook', 'setbook', 'revision', 'storybook', 'reference'];

  const availableSubjects = useMemo(() => {
    if (!profile.activeClasses) return [];
    const subs = new Set();
    profile.activeClasses.forEach(grade => {
      const gSubs = getSubjectsForGrade(grade, profile);
      if (gSubs) { Object.values(gSubs).flat().forEach(s => subs.add(s)); }
    });
    return Array.from(subs).sort();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bk, pf] = await Promise.all([
        getLibraryBooks(),
        getSchoolProfile()
      ]);
      setBooks(bk);
      setProfile(pf);
    } catch (e) {
      console.error(e);
      alert({ message: "Failed to load books. Please try again.", variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentPeriodId]);

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchSearch = !search ||
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        (b.author && b.author.toLowerCase().includes(search.toLowerCase())) ||
        (b.isbn && b.isbn.includes(search)) ||
        (b.book_copies && b.book_copies.some(c => c.copy_code && c.copy_code.toLowerCase().includes(search.toLowerCase())));
      const matchCat = !filterCategory || b.category === filterCategory;
      const matchSub = !filterSubject || b.subject === filterSubject;
      const matchLev = !filterLevel || b.level === filterLevel;
      return matchSearch && matchCat && matchSub && matchLev;
    });
  }, [books, search, filterCategory, filterSubject, filterLevel]);

  // Actions
  const handleSaveBook = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      title: fd.get('title'),
      author: fd.get('author'),
      isbn: fd.get('isbn'),
      subject: fd.get('subject'),
      category: fd.get('category'),
      level: fd.get('level'),
      publisher: fd.get('publisher'),
      edition: fd.get('edition')
    };

    try {
      if (bookModal.data) {
        await updateBook(bookModal.data.id, payload);
        toast('Book updated successfully', 'success');
      } else {
        const newBook = await createBook(payload);
        
        // Process Initial Copies
        const initialCopies = parseInt(fd.get('initialCopies')) || 0;
        const method = fd.get('barcodeMethod') || 'auto';
        
        if (method === 'auto' && initialCopies > 0) {
          const prefix = fd.get('prefix') || 'BK';
          await bulkGenerateCopies(newBook.id, prefix, initialCopies);
        } else if (method === 'manual') {
          const codesStr = fd.get('manualBarcodes') || '';
          const codes = codesStr.split(',').map(s => s.trim()).filter(Boolean);
          if (codes.length > 0) {
            await createManualCopies(newBook.id, codes);
          }
        }
        
        toast('Book created successfully', 'success');
      }
      setBookModal({ open: false, data: null });
      setBarcodeMethod('auto');
      loadData();
    } catch (err) {
      alert({ title: 'Error', message: err.message, variant: 'danger' });
    }
  };

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const method = fd.get('barcodeMethod') || 'auto';
    
    try {
      if (method === 'auto') {
        const count = parseInt(fd.get('count'));
        await bulkGenerateCopies(bulkModal.book.id, fd.get('prefix'), count);
      } else {
        const codesStr = fd.get('manualBarcodes') || '';
        const codes = codesStr.split(',').map(s => s.trim()).filter(Boolean);
        if (codes.length > 0) {
          await createManualCopies(bulkModal.book.id, codes);
        }
      }
      toast('Copies added successfully!', 'success');
      setBulkModal({ open: false, book: null });
      setBarcodeMethod('auto');
      
      // If copiesModal is open for this book, refresh it
      if (copiesModal.open && copiesModal.book?.id === bulkModal.book.id) {
        const c = await getBookCopies(bulkModal.book.id);
        setCopiesModal(prev => ({ ...prev, copies: c }));
      }
      
      loadData();
    } catch (err) {
      alert({ title: 'Error generating copies', message: err.message, variant: 'danger' });
    }
  };

  const viewCopies = async (book) => {
    setCopiesModal({ open: true, book, copies: [], loading: true });
    try {
      const c = await getBookCopies(book.id);
      setCopiesModal({ open: true, book, copies: c, loading: false });
    } catch (e) {
      setCopiesModal({ open: false, book: null, copies: [] });
    }
  };

  const handleSaveCopyDetails = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await updateBookCopy(editCopyModal.id, {
        condition: fd.get('condition'),
        notes: fd.get('notes')
      });
      toast('Copy updated successfully', 'success');
      setEditCopyModal(null);
      // Refresh copies
      if (copiesModal.book) {
        const c = await getBookCopies(copiesModal.book.id);
        setCopiesModal(prev => ({ ...prev, copies: c }));
      }
    } catch (err) {
      alert({ title: 'Error', message: err.message, variant: 'danger' });
    }
  };

  if (loading && books.length === 0) return <Loader />;

  return (
    <div className="card animate-in pb-12">
      <div className="card-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Books Catalog</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', margin: '4px 0 0 0' }}>Manage titles, subjects, and bulk copies.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setBookModal({ open: true, data: null })}>
              <PlusIcon size={18} />
              <span>Add Book</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200, maxWidth: '100%' }}>
          <span className="search-icon"><SearchIcon size={16} /></span>
          <input
            type="text"
            placeholder="Search titles, authors, or ISBN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={filterCategory}
          onChange={e => setCategory(e.target.value)}
          options={[{ id: '', label: 'All Categories' }, ...LIB_CATEGORIES.map(c => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]}
          style={{ minWidth: 160 }}
        />

        <Select
          value={filterSubject}
          onChange={e => setSubject(e.target.value)}
          options={[{ id: '', label: 'All Subjects' }, ...availableSubjects.map(s => ({ id: s, label: s }))]}
          style={{ minWidth: 160 }}
        />

        <Select
          value={filterLevel}
          onChange={e => setLevel(e.target.value)}
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
          style={{ minWidth: 160 }}
        />
      </div>

      <div className="table-wrapper">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Title / Author</th>
              <th>Category</th>
              <th>Level & Subject</th>
              <th>Inventory (<span style={{ color: 'var(--success)' }}>Avail</span>/Total)</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBooks.map(b => (
              <tr key={b.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{b.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 4 }}>
                    by {b.author || 'Unknown'} {b.isbn ? `• ISBN: ${b.isbn}` : ''}
                  </div>
                </td>
                <td style={{ textTransform: 'capitalize' }}>
                  <span className={`badge ${
                    b.category === 'setbook' ? 'badge-danger' : 
                    b.category === 'revision' ? 'badge-warning' : 
                    'badge-ghost'
                  }`}>
                    {b.category}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.level || '--'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 }}>{b.subject || '--'}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: b.available_copies > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {b.available_copies}
                    </span>
                    <span style={{ color: 'var(--text-light)' }}>/</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{b.total_copies}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" title="Edit Metadata" onClick={() => setBookModal({ open: true, data: b })}>
                      <EditIcon size={14} /> <span className="hidden sm:inline">Edit</span>
                    </button>
                    {canManage && (
                      <button className="btn btn-ghost btn-sm" title="Manage Inventory" onClick={() => viewCopies(b)}>
                        <BookIcon size={14} /> <span className="hidden sm:inline">Copies</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredBooks.length === 0 && !loading && (
          <div className="text-center py-20 bg-gray-50 border-t border-gray-100">
            <BookIcon size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-500">No books found</h3>
            <p className="text-sm text-gray-400">Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>

      {/* NEW/EDIT BOOK MODAL */}
      {bookModal.open && (
        <div className="modal-overlay">
          <div className="modal relative max-w-2xl w-full mx-4">
            <div className="modal-header">
              <h3>{bookModal.data ? 'Edit Book Record' : 'Register New Title'}</h3>
              <button className="modal-close" onClick={() => setBookModal({ open: false })}>×</button>
            </div>
            <form onSubmit={handleSaveBook}>
              <div className="modal-body p-6 grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label>Resource Title</label>
                  <input className="form-input" name="title" defaultValue={bookModal.data?.title} required />
                </div>
                <div className="form-group">
                  <label>Author / Editor</label>
                  <input className="form-input" name="author" defaultValue={bookModal.data?.author} />
                </div>
                <div className="form-group">
                  <label>ISBN</label>
                  <input className="form-input" name="isbn" defaultValue={bookModal.data?.isbn} />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <Select
                    name="category"
                    options={LIB_CATEGORIES.map(c => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
                    defaultValue={bookModal.data?.category}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Target Class/Level</label>
                  <Select
                    name="level"
                    options={[{ id: '', label: '-- General --' }, ...(profile.activeClasses || []).map(g => ({ id: g, label: g }))]}
                    defaultValue={bookModal.data?.level}
                  />
                </div>
                <div className="form-group">
                  <label>Subject Focus</label>
                  <Select
                    name="subject"
                    options={[{ id: '', label: '-- General --' }, ...availableSubjects.map(s => ({ id: s, label: s }))]}
                    defaultValue={bookModal.data?.subject}
                  />
                </div>
                <div className="form-group">
                  <label>Publisher & Edition</label>
                  <input className="form-input" name="publisher" defaultValue={bookModal.data?.publisher} placeholder="e.g. Oxford, 3rd Ed." />
                </div>
                
                {!bookModal.data && (
                  <div className="col-span-2 border-t border-gray-200 mt-2 pt-6">
                    <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Initial Inventory</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group col-span-2">
                        <label>Barcode Generation Method</label>
                        <Select 
                          name="barcodeMethod" 
                          value={barcodeMethod} 
                          onChange={(e) => setBarcodeMethod(e.target.value)}
                          options={[{ id: 'auto', label: 'Auto-Generate Barcodes' }, { id: 'manual', label: 'Manual Barcode Entry (Existing System)' }]}
                        />
                      </div>
                      {barcodeMethod === 'auto' ? (
                        <>
                          <div className="form-group">
                            <label>Initial Copies</label>
                            <input className="form-input" type="number" name="initialCopies" min="0" defaultValue="0" />
                          </div>
                          <div className="form-group">
                            <label>Barcode Prefix</label>
                            <input className="form-input font-mono uppercase" name="prefix" defaultValue="BK" />
                          </div>
                        </>
                      ) : (
                        <div className="form-group col-span-2">
                          <label>Paste/Scan Existing Barcodes (Comma Separated)</label>
                          <textarea className="form-input font-mono text-sm" name="manualBarcodes" rows={3} placeholder="e.g. 987213, LIB-002, 987214" />
                          <p className="text-xs text-gray-500 mt-1">We will create a physical copy record for each barcode provided.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setBookModal({ open: false })}>Cancel</button>
                <button type="submit" className="btn btn-primary">{bookModal.data ? 'Save Changes' : 'Register Book'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK COPY GENERATION MODAL */}
      {bulkModal.open && (
        <div className="modal-overlay" style={{ zIndex: 1010 }}>
          <div className="modal relative max-w-sm w-full">
            <div className="modal-header">
              <h3>Add Inventory Copies</h3>
              <button className="modal-close" onClick={() => setBulkModal({ open: false })}>×</button>
            </div>
            <form onSubmit={handleBulkGenerate}>
              <div className="modal-body p-6 space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="font-bold text-gray-800 text-sm">{bulkModal.book?.title}</div>
                  <div className="text-xs text-gray-500 mt-1">Current total: {bulkModal.book?.total_copies}</div>
                </div>

                <div className="form-group">
                  <label>Barcode Generation Method</label>
                  <Select 
                    name="barcodeMethod" 
                    value={barcodeMethod} 
                    onChange={(e) => setBarcodeMethod(e.target.value)}
                    options={[{ id: 'auto', label: 'Auto-Generate Barcodes' }, { id: 'manual', label: 'Manual Barcode Entry' }]}
                  />
                </div>

                {barcodeMethod === 'auto' ? (
                  <>
                    <div className="form-group">
                      <label>Number of new copies to generate</label>
                      <input className="form-input" type="number" name="count" min="1" max="500" required defaultValue="10" />
                    </div>

                    <div className="form-group">
                      <label>Code Prefix</label>
                      <input className="form-input font-mono uppercase" name="prefix" required
                        defaultValue={
                          bulkModal.book?.subject ?
                            bulkModal.book.subject.substring(0, 3).toUpperCase() + '-' + (bulkModal.book.level?.charAt(0) || 'B')
                            : 'BK'
                        }
                      />
                    </div>
                  </>
                ) : (
                  <div className="form-group">
                    <label>Paste/Scan Existing Barcodes (Comma Separated)</label>
                    <textarea className="form-input font-mono text-sm" name="manualBarcodes" rows={4} required placeholder="e.g. 987213, LIB-002, 987214" />
                    <p className="text-xs text-gray-500 mt-1">We will create a physical copy record for each barcode provided.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setBulkModal({ open: false })}>Cancel</button>
                <button type="submit" className="btn btn-primary">Generate Copies</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COPIES LISTING DRAWER/MODAL */}
      {copiesModal.open && (
        <div className="modal-overlay">
          <div className="modal relative max-w-3xl w-full h-[80vh] flex flex-col">
            <div className="modal-header">
              <div>
                <h3>Inventory Detail</h3>
                <div className="text-sm font-normal text-gray-500">{copiesModal.book?.title}</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setBulkModal({ open: true, book: copiesModal.book })}>
                  <PlusIcon size={14} /> Add Copies
                </button>
                <button className="modal-close" onClick={() => setCopiesModal({ open: false, book: null, copies: [] })}>×</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {copiesModal.loading ? <Loader /> : (
                <div className="table-wrapper bg-white">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Copy Code (Barcode)</th>
                        <th>Status</th>
                        <th>Condition & Notes</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {copiesModal.copies.map(c => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.copy_code}</div>
                          </td>
                          <td>
                            <span className={`badge ${c.status === 'available' ? 'badge-success' : c.status === 'borrowed' ? 'badge-warning' : 'badge-danger'}`} style={{ textTransform: 'uppercase' }}>
                              {c.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ textTransform: 'capitalize', fontWeight: 500 }}>{c.condition || 'Good'}</div>
                            {c.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 }}>{c.notes}</div>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditCopyModal(c)}>
                              <EditIcon size={14} /> <span className="hidden sm:inline">Edit Notes</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT COPY DETAILS MODAL */}
      {editCopyModal && (
        <div className="modal-overlay" style={{ zIndex: 1020 }}>
          <div className="modal relative max-w-sm w-full mx-4">
            <div className="modal-header">
              <h3>Edit Condition & Notes</h3>
              <button className="modal-close" onClick={() => setEditCopyModal(null)}>×</button>
            </div>
            <form onSubmit={handleSaveCopyDetails}>
              <div className="modal-body p-6 space-y-4">
                <div className="form-group">
                  <label>Physical Condition</label>
                  <Select name="condition" defaultValue={editCopyModal.condition || 'good'} options={[
                    {id: 'new', label: 'New'},
                    {id: 'good', label: 'Good'},
                    {id: 'fair', label: 'Fair'},
                    {id: 'poor', label: 'Poor'}
                  ]} />
                </div>
                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea className="form-input" name="notes" defaultValue={editCopyModal.notes || ''} rows={3} placeholder="Add any details about damage..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditCopyModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
