/**
 * FeeStructure/index.jsx — Itemised fee structure builder for school admins
 *
 * Allows a school administrator to:
 *   1. Create fee items (name, category, amount, which classes, mandatory/optional)
 *   2. Assign different amounts per class/grade
 *   3. Save to Supabase via store functions
 *   4. Print the fee schedule
 *
 * Requires from store (see storeAdditions.js):
 *   getFeeStructure(schoolId, term)
 *   saveFeeStructure(schoolId, term, items)
 *   deleteFeeItem(itemId)
 */

import { useState, useEffect } from 'react';
import './FeeStructure.css';
import { printFeeStatement } from '../../utils/receiptPrint';

const CATEGORIES = ['Tuition', 'Activity / Clubs', 'Boarding', 'Transport', 'Development Levy', 'Uniform', 'Computer', 'Library', 'Examination', 'Other'];

const CBC_GRADES = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
const ALL_GRADES_OPT = ['All Classes', ...CBC_GRADES, 'Form 1', 'Form 2', 'Form 3', 'Form 4'];

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const CURRENT_YEAR = new Date().getFullYear();

const EMPTY_ITEM = { id: null, name: '', category: 'Tuition', amount: '', classes: ['All Classes'], is_mandatory: true };

export default function FeeStructure({ currentUser, schoolId, schoolName, getFeeStructure, saveFeeStructure, deleteFeeItem }) {
  const [term,     setTerm]     = useState(`Term 1 ${CURRENT_YEAR}`);
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState(null);
  const [editId,   setEditId]   = useState(null); // which item is being edited inline

  useEffect(() => {
    if (!schoolId || !term) return;
    loadStructure();
  }, [schoolId, term]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const loadStructure = async () => {
    setLoading(true);
    try {
      const data = await getFeeStructure(schoolId, term);
      setItems(data || []);
    } catch (err) {
      console.error('FeeStructure load error:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    const newItem = { ...EMPTY_ITEM, id: `new_${Date.now()}` };
    setItems(prev => [...prev, newItem]);
    setEditId(newItem.id);
  };

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const toggleClass = (itemId, grade) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      if (grade === 'All Classes') return { ...item, classes: ['All Classes'] };
      const current = item.classes.filter(c => c !== 'All Classes');
      const updated = current.includes(grade) ? current.filter(c => c !== grade) : [...current, grade];
      return { ...item, classes: updated.length ? updated : ['All Classes'] };
    }));
  };

  const removeItem = async (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (!String(id).startsWith('new_')) {
      try { await deleteFeeItem(id); } catch (e) { console.warn('Delete fee item error:', e); }
    }
  };

  const handleSave = async () => {
    const invalid = items.filter(i => !i.name.trim() || !i.amount || isNaN(Number(i.amount)));
    if (invalid.length) {
      setMessage({ type: 'error', text: `${invalid.length} item(s) missing a name or valid amount.` });
      return;
    }
    setSaving(true);
    try {
      const clean = items.map(i => ({
        ...i,
        amount      : Number(i.amount),
        id          : String(i.id).startsWith('new_') ? undefined : i.id,
      }));
      await saveFeeStructure(schoolId, term, clean);
      setMessage({ type: 'success', text: 'Fee structure saved.' });
      setEditId(null);
      loadStructure();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePrintSchedule = () => {
    const win = window.open('', '_blank', 'width=700,height=900');
    const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      * { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:Arial,sans-serif; font-size:11pt; padding:15mm; }
      h2 { text-align:center; font-size:14pt; text-transform:uppercase; margin-bottom:4px; }
      .sub { text-align:center; color:#555; font-size:9pt; margin-bottom:16px; }
      table { width:100%; border-collapse:collapse; }
      th { text-align:left; padding:7px 8px; border-bottom:2px solid #000; font-size:9pt; text-transform:uppercase; }
      td { padding:7px 8px; border-bottom:1px solid #ddd; font-size:10pt; }
      .amt { text-align:right; }
      .total { font-weight:bold; border-top:2px solid #000; }
      @media print { @page { margin:0; } body { margin:10mm; } }
    </style></head><body>
      <h2>${schoolName || 'School'}</h2>
      <div class="sub">Fee Schedule — ${term}</div>
      <table>
        <thead><tr><th>Fee Item</th><th>Category</th><th>Applies To</th><th>Type</th><th class="amt">Amount (KSh)</th></tr></thead>
        <tbody>
          ${items.map(i => `<tr>
            <td>${i.name}</td>
            <td>${i.category}</td>
            <td>${(i.classes || ['All Classes']).join(', ')}</td>
            <td>${i.is_mandatory ? 'Mandatory' : 'Optional'}</td>
            <td class="amt">${Number(i.amount || 0).toLocaleString()}</td>
          </tr>`).join('')}
          <tr class="total"><td colspan="4">Total</td><td class="amt">${total.toLocaleString()}</td></tr>
        </tbody>
      </table>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.onafterprint = () => win.close(); }, 400);
  };

  const totalAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div className="fs-root">
      <div className="fs-header">
        <div className="fs-title-group">
          <div className="fs-icon">💰</div>
          <div>
            <div className="fs-title">Fee Structure</div>
            <div className="fs-sub">Define itemised fees per term and class</div>
          </div>
        </div>
        <div className="fs-header-actions">
          <select className="fs-select" value={term} onChange={e => setTerm(e.target.value)}>
            {TERMS.flatMap(t => [`${t} ${CURRENT_YEAR}`, `${t} ${CURRENT_YEAR + 1}`]).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button className="fs-btn-outline" onClick={handlePrintSchedule} disabled={!items.length}>
            🖨️ Print Schedule
          </button>
          <button className="fs-btn-primary" onClick={handleSave} disabled={saving || !items.length}>
            {saving ? 'Saving...' : '💾 Save Structure'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div className={`fs-toast ${message.type === 'success' ? 'fs-toast-ok' : 'fs-toast-err'}`}>
          {message.type === 'success' ? '✓' : '✗'} {message.text}
        </div>
      )}

      {/* Summary bar */}
      {items.length > 0 && (
        <div className="fs-summary">
          <div className="fs-sum-item">
            <div className="fs-sum-label">Fee Items</div>
            <div className="fs-sum-val">{items.length}</div>
          </div>
          <div className="fs-sum-item">
            <div className="fs-sum-label">Total per Student</div>
            <div className="fs-sum-val" style={{ color:'var(--te)' }}>KSh {totalAmount.toLocaleString()}</div>
          </div>
          <div className="fs-sum-item">
            <div className="fs-sum-label">Mandatory</div>
            <div className="fs-sum-val">{items.filter(i => i.is_mandatory).length}</div>
          </div>
          <div className="fs-sum-item">
            <div className="fs-sum-label">Optional</div>
            <div className="fs-sum-val">{items.filter(i => !i.is_mandatory).length}</div>
          </div>
        </div>
      )}

      {/* Fee items */}
      <div className="fs-body">
        {loading ? (
          <div className="fs-empty">
            <div className="fs-spin" />
            <div>Loading fee structure...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="fs-empty">
            <div className="fs-empty-ico">📋</div>
            <div className="fs-empty-title">No fee items yet for {term}</div>
            <div className="fs-empty-sub">Add your first fee item to get started</div>
            <button className="fs-btn-primary" style={{ marginTop:16 }} onClick={addItem}>+ Add Fee Item</button>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="fs-table-head">
              <div style={{ flex:2 }}>Fee Item</div>
              <div style={{ flex:1.2 }}>Category</div>
              <div style={{ flex:2 }}>Applies To</div>
              <div style={{ flex:0.8 }}>Type</div>
              <div style={{ flex:0.9, textAlign:'right' }}>Amount (KSh)</div>
              <div style={{ width:60 }}></div>
            </div>

            {items.map(item => (
              <div key={item.id} className={`fs-item ${editId === item.id ? 'fs-item-editing' : ''}`}>
                {editId === item.id ? (
                  /* ── Edit mode ── */
                  <div className="fs-edit-form">
                    <div className="fs-edit-row">
                      <div className="fs-edit-field" style={{ flex:2 }}>
                        <label className="fs-field-label">Fee Name *</label>
                        <input className="fs-input" type="text" placeholder="e.g. Tuition Fee"
                          value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} />
                      </div>
                      <div className="fs-edit-field" style={{ flex:1.2 }}>
                        <label className="fs-field-label">Category</label>
                        <select className="fs-input" value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="fs-edit-field" style={{ flex:0.9 }}>
                        <label className="fs-field-label">Amount (KSh) *</label>
                        <input className="fs-input" type="number" placeholder="0"
                          value={item.amount} onChange={e => updateItem(item.id, 'amount', e.target.value)} />
                      </div>
                    </div>

                    <div className="fs-edit-row" style={{ marginTop:10 }}>
                      <div className="fs-edit-field" style={{ flex:3 }}>
                        <label className="fs-field-label">Applies to Classes</label>
                        <div className="fs-grade-grid">
                          {ALL_GRADES_OPT.map(g => (
                            <button key={g}
                              className={`fs-grade-pill ${(item.classes || ['All Classes']).includes(g) ? 'active' : ''}`}
                              onClick={() => toggleClass(item.id, g)}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="fs-edit-field" style={{ flex:1 }}>
                        <label className="fs-field-label">Requirement</label>
                        <div style={{ display:'flex', gap:8, marginTop:4 }}>
                          {[true, false].map(m => (
                            <button key={String(m)}
                              className={`fs-type-btn ${item.is_mandatory === m ? 'active' : ''}`}
                              onClick={() => updateItem(item.id, 'is_mandatory', m)}>
                              {m ? 'Mandatory' : 'Optional'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="fs-edit-actions">
                      <button className="fs-btn-primary" style={{ padding:'6px 18px' }} onClick={() => setEditId(null)}>✓ Done</button>
                      <button className="fs-btn-outline" style={{ padding:'6px 14px' }} onClick={() => removeItem(item.id)}>Delete</button>
                    </div>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <>
                    <div style={{ flex:2 }}>
                      <div className="fs-item-name">{item.name || <span style={{ color:'var(--sub)' }}>Unnamed item</span>}</div>
                      <div className="fs-item-sub">{item.category}</div>
                    </div>
                    <div style={{ flex:1.2 }} className="fs-item-sub">{item.category}</div>
                    <div style={{ flex:2 }} className="fs-item-sub">
                      {(item.classes || ['All Classes']).join(', ')}
                    </div>
                    <div style={{ flex:0.8 }}>
                      <span className={`fs-badge ${item.is_mandatory ? 'fs-badge-m' : 'fs-badge-o'}`}>
                        {item.is_mandatory ? 'Mandatory' : 'Optional'}
                      </span>
                    </div>
                    <div style={{ flex:0.9, textAlign:'right', fontFamily:"'Space Mono',monospace", fontSize:'.82rem', fontWeight:700, color:'var(--te)' }}>
                      {Number(item.amount || 0).toLocaleString()}
                    </div>
                    <div style={{ width:60, display:'flex', gap:4, justifyContent:'flex-end' }}>
                      <button className="fs-icon-btn" onClick={() => setEditId(item.id)} title="Edit">✏️</button>
                      <button className="fs-icon-btn fs-icon-del" onClick={() => removeItem(item.id)} title="Remove">✕</button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Total row */}
            <div className="fs-total-row">
              <div style={{ flex:1 }}>Total per Student</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:'1rem', fontWeight:700, color:'var(--te)' }}>
                KSh {totalAmount.toLocaleString()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add item button */}
      {!loading && (
        <button className="fs-add-btn" onClick={addItem}>+ Add Fee Item</button>
      )}
    </div>
  );
}
