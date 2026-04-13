import React, { useState, useEffect, useMemo } from 'react';
import { getLibraryBooks, createBook, updateBook, bulkGenerateCopies, getBookCopies } from '../../data/libraryStore';
import { getSchoolProfile } from '../../data/store';
import { CBC_STRUCTURE, getSubjectsForGrade } from '../../data/seedData';
import Select from '../../components/Common/Select';
import { useDialog } from '../../contexts/DialogContext';
import { 
  SearchIcon, PlusIcon, FilterIcon, BookIcon, EditIcon, 
  MenuIcon, CloseIcon
} from '../../components/CommonIcons';
import Loader from '../../components/Common/Loader';

export default function BooksManagement({ currentPeriodId }) {
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
    } catch(e) {
      console.error(e);
      alert({message: "Failed to load books. Please try again.", variant: 'danger'});
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
        (b.isbn && b.isbn.includes(search));
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
        await createBook(payload);
        toast('Book created successfully', 'success');
      }
      setBookModal({open: false, data: null});
      loadData();
    } catch(err) {
      alert({title: 'Error', message: err.message, variant: 'danger'});
    }
  };

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await bulkGenerateCopies(bulkModal.book.id, fd.get('prefix'), parseInt(fd.get('count')));
      toast('Copies generated successfully!', 'success');
      setBulkModal({open: false, book: null});
      loadData();
    } catch(err) {
      alert({title: 'Error generating copies', message: err.message, variant: 'danger'});
    }
  };

  const viewCopies = async (book) => {
    setCopiesModal({ open: true, book, copies: [], loading: true });
    try {
      const c = await getBookCopies(book.id);
      setCopiesModal({ open: true, book, copies: c, loading: false });
    } catch(e) {
      setCopiesModal({ open: false, book: null, copies: [] });
    }
  };

  if (loading && books.length === 0) return <Loader />;

  return (
    <div className="card animate-in pb-12">
      <div className="card-header border-b border-gray-100 flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Books Catalog</h2>
          <p className="text-sm text-gray-500">Manage titles, subjects, and bulk copies.</p>
        </div>
        <button 
          className="btn btn-primary flex items-center gap-2"
          onClick={() => setBookModal({ open: true, data: null })}
        >
          <PlusIcon size={16} /> Add New Title
        </button>
      </div>

      <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search titles, authors, or ISBN..." 
            className="form-input pl-9 w-full bg-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <Select 
            value={filterCategory} 
            onChange={e => setCategory(e.target.value)}
            options={[ {id:'', label:'All Categories'}, ...LIB_CATEGORIES.map(c => ({id:c, label:c.charAt(0).toUpperCase() + c.slice(1)})) ]}
            style={{ minWidth: 160 }}
        />

        <Select 
            value={filterSubject} 
            onChange={e => setSubject(e.target.value)}
            options={[ {id:'', label:'All Subjects'}, ...availableSubjects.map(s => ({id:s, label:s})) ]}
            style={{ minWidth: 160 }}
        />
        
        <Select 
            value={filterLevel} 
            onChange={e => setLevel(e.target.value)}
            options={[ 
              {id:'', label:'All Classes'}, 
              ...(profile.activeClasses || []).map(g => ({id:g, label:g})) 
            ]}
            style={{ minWidth: 160 }}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white border-b border-gray-200 text-gray-500 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4">Title / Author</th>
              <th className="p-4">Category</th>
              <th className="p-4">Level & Subject</th>
              <th className="p-4">Inventory (<span className="text-green-600">Avail</span>/Total)</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredBooks.map(b => (
              <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-gray-800 text-base">{b.title}</div>
                  <div className="text-gray-500 text-xs mt-1">by {b.author || 'Unknown'} {b.isbn ? `• ISBN: ${b.isbn}` : ''}</div>
                </td>
                <td className="p-4 capitalize">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    b.category === 'setbook' ? 'bg-purple-100 text-purple-700' :
                    b.category === 'revision' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {b.category}
                  </span>
                </td>
                <td className="p-4">
                  <div className="font-semibold">{b.level || '--'}</div>
                  <div className="text-xs text-gray-500 mt-1">{b.subject || '--'}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg" style={{color: b.available_copies > 0 ? 'var(--success)' : 'var(--danger)'}}>
                      {b.available_copies}
                    </span>
                    <span className="text-gray-400 font-medium">/</span>
                    <span className="text-gray-600 font-bold">{b.total_copies}</span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="btn btn-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3" onClick={() => viewCopies(b)}>
                       Copies Details
                    </button>
                    <button className="btn btn-sm btn-ghost px-2 text-primary hover:bg-primary-50" onClick={() => setBulkModal({open: true, book: b})} title="Add Bulk Copies">
                       <PlusIcon size={16} />
                    </button>
                    <button className="btn btn-sm btn-ghost px-2" onClick={() => setBookModal({open: true, data: b})} title="Edit Title">
                       <EditIcon size={16} />
                    </button>
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
              <button className="modal-close" onClick={() => setBookModal({open:false})}>×</button>
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
                    options={LIB_CATEGORIES.map(c => ({id:c, label:c.charAt(0).toUpperCase() + c.slice(1)}))}
                    defaultValue={bookModal.data?.category}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Target Class/Level</label>
                  <Select 
                    name="level"
                    options={[{id:'', label:'-- General --'}, ...(profile.activeClasses || []).map(g => ({id:g, label:g}))]}
                    defaultValue={bookModal.data?.level}
                  />
                </div>
                <div className="form-group">
                  <label>Subject Focus</label>
                  <Select 
                    name="subject"
                    options={[{id:'', label:'-- General --'}, ...availableSubjects.map(s => ({id:s, label:s}))]}
                    defaultValue={bookModal.data?.subject}
                  />
                </div>
                <div className="form-group">
                  <label>Publisher & Edition</label>
                  <input className="form-input" name="publisher" defaultValue={bookModal.data?.publisher} placeholder="e.g. Oxford, 3rd Ed." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setBookModal({open:false})}>Cancel</button>
                <button type="submit" className="btn btn-primary">{bookModal.data ? 'Save Changes' : 'Register Book'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK COPY GENERATION MODAL */}
      {bulkModal.open && (
        <div className="modal-overlay">
          <div className="modal relative max-w-sm w-full">
            <div className="modal-header">
              <h3>Add Inventory Copies</h3>
              <button className="modal-close" onClick={() => setBulkModal({open:false})}>×</button>
            </div>
            <form onSubmit={handleBulkGenerate}>
              <div className="modal-body p-6 space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="font-bold text-gray-800 text-sm">{bulkModal.book?.title}</div>
                  <div className="text-xs text-gray-500 mt-1">Current total: {bulkModal.book?.total_copies}</div>
                </div>

                <div className="form-group">
                  <label>Number of new copies to generate</label>
                  <input className="form-input" type="number" name="count" min="1" max="500" required defaultValue="10" />
                  <p className="text-xs text-gray-400 mt-1">We will generate unique barcodes/codes for each.</p>
                </div>

                <div className="form-group">
                  <label>Code Prefix</label>
                  <input className="form-input font-mono uppercase" name="prefix" required 
                    defaultValue={
                      bulkModal.book?.subject ? 
                        bulkModal.book.subject.substring(0,3).toUpperCase() + '-' + (bulkModal.book.level?.charAt(0) || 'B') 
                        : 'BK'
                    } 
                  />
                  <p className="text-xs text-gray-400 mt-1">E.g. MAT-F1 -> MAT-F1-001</p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setBulkModal({open:false})}>Cancel</button>
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
              <button className="modal-close" onClick={() => setCopiesModal({open:false, book:null, copies:[]})}>×</button>
            </div>
            <div className="flex-1 overflow-auto p-0 bg-gray-50">
              {copiesModal.loading ? <Loader /> : (
                <table className="w-full text-left text-sm bg-white">
                  <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="p-4">Copy Code (Barcode)</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Physical Condition</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {copiesModal.copies.map(c => (
                      <tr key={c.id}>
                        <td className="p-4 font-mono font-bold">{c.copy_code}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${c.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 capitalize">{c.condition}</td>
                        <td className="p-4"><button className="text-blue-500 text-xs font-bold hover:underline">Edit Notes</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
