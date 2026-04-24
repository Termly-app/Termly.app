import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { useDialog } from '../contexts/DialogContext';
import { bulkImportStudents } from '../data/store';
import {
  UploadIcon, CheckIcon, AlertIcon, DeleteIcon,
  XIcon, FileIcon
} from './CommonIcons';

export default function StudentImporter({ profile, onImport, onClose }) {
  const { alert, confirm } = useDialog();
  const [step, setStep] = useState(1); // 1: Upload, 2: Review, 3: Importing, 4: Done
  const [dragActive, setDragActive] = useState(false);
  const [rawFile, setRawFile] = useState(null);
  const [data, setData] = useState([]);
  const [mappings, setMappings] = useState({});
  const [errors, setErrors] = useState([]);
  const [progress, setProgress] = useState({ imported: 0, total: 0 });
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const FIELD_MAP = {
    name: ['name', 'full name', 'student name', 'learner name', 'jina', 'student'],
    admNo: ['adm', 'admission', 'reg', 'registration', 'no', 'number', 'adm no', 'admission number'],
    class: ['class', 'grade', 'level', 'form'],
    stream: ['stream', 'house', 'section'],
    gender: ['gender', 'sex', 'm/f'],
    parent: ['parent', 'guardian', 'father', 'mother'],
    parentPhone: ['phone', 'contact', 'mobile', 'tel', 'parent phone']
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (file) => {
    setRawFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim().toLowerCase().replace(/[^\w\s]/g, ''),
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          alert({ title: 'Empty File', message: 'The uploaded file contains no data rows.', variant: 'warning' });
          return;
        }

        const headers = results.meta.fields || [];
        const newMappings = {};

        // Fuzzy column matching
        Object.keys(FIELD_MAP).forEach(field => {
          const match = headers.find(h => FIELD_MAP[field].some(syn => h.includes(syn)));
          if (match) newMappings[field] = match;
        });

        const parsedData = results.data.map((row, idx) => {
          const mapped = { id: `row-${idx}` };

          Object.keys(newMappings).forEach(field => {
            let val = (row[newMappings[field]] || '').trim();

            // Normalize gender
            if (field === 'gender') {
              if (/^m/i.test(val)) val = 'Male';
              else if (/^f/i.test(val)) val = 'Female';
            }

            mapped[field] = val;
          });

          // Defaults for missing mandatory fields
          if (!mapped.class) mapped.class = profile.activeClasses?.[0] || 'Grade 1';
          if (!mapped.gender) mapped.gender = 'Male';

          return mapped;
        });

        setData(parsedData);
        setMappings(newMappings);
        validateData(parsedData);
        setStep(2);
      },
      error: (err) => {
        alert({ title: 'Parse Error', message: `Could not parse file: ${err.message}`, variant: 'danger' });
      }
    });
  };

  const validateData = (rows) => {
    const newErrors = [];
    const seenAdm = new Set();
    rows.forEach((row, idx) => {
      const rowErrors = {};
      if (!row.name || row.name.length < 2) rowErrors.name = "Name is required (min 2 chars)";
      if (!profile.activeClasses?.includes(row.class)) rowErrors.class = "Invalid class";
      if (row.admNo && seenAdm.has(row.admNo.toLowerCase())) rowErrors.admNo = "Duplicate admission number";
      if (row.admNo) seenAdm.add(row.admNo.toLowerCase());
      if (Object.keys(rowErrors).length > 0) {
        newErrors.push({ idx, errors: rowErrors });
      }
    });
    setErrors(newErrors);
  };

  const handleUpdate = (idx, field, value) => {
    const newData = [...data];
    newData[idx][field] = value;
    setData(newData);
    validateData(newData);
  };

  const handleRemove = (idx) => {
    const newData = data.filter((_, i) => i !== idx);
    setData(newData);
    validateData(newData);
  };

  const handleImport = async () => {
    let rowsToImport = data;

    if (errors.length > 0) {
      const ok = await confirm({
        title: 'Import with Issues',
        message: `There are ${errors.length} rows with validation issues. These rows will be skipped. Proceed anyway?`,
        variant: 'warning'
      });
      if (!ok) return;
      rowsToImport = data.filter((_, i) => !errors.find(e => e.idx === i));
    }

    if (rowsToImport.length === 0) {
      await alert({ title: 'Nothing to Import', message: 'No valid rows to import.', variant: 'warning' });
      return;
    }

    setStep(3);
    setProgress({ imported: 0, total: rowsToImport.length });

    try {
      const res = await bulkImportStudents(rowsToImport, (imported, total) => {
        setProgress({ imported, total });
      });
      setResult(res);
      setStep(4);
      // Notify parent to refresh
      if (onImport) onImport(res);
    } catch (err) {
      await alert({ title: 'Import Failed', message: err.message, variant: 'danger' });
      setStep(2);
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.imported / progress.total) * 100) : 0;

  return (
    <div className="importer-overlay" onClick={onClose}>
      <div className="importer-card" onClick={e => e.stopPropagation()}>
        <div className="importer-header">
          <div className="importer-h-left">
            <div className="importer-icon-cube">
              <UploadIcon size={20} color="#fff" />
            </div>
            <div>
              <h3>Bulk Student Importer</h3>
              <p>
                {step === 1 && 'Upload your student CSV or Excel file'}
                {step === 2 && `Reviewing ${data.length} student records`}
                {step === 3 && 'Importing students...'}
                {step === 4 && 'Import complete!'}
              </p>
            </div>
          </div>
          <button className="importer-close" onClick={onClose}><XIcon size={20} /></button>
        </div>

        <div className="importer-body">
          {/* Step 1: File Upload */}
          {step === 1 && (
            <div
              className={`importer-dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input type="file" ref={fileInputRef} onChange={(e) => e.target.files[0] && processFile(e.target.files[0])} style={{ display: 'none' }} accept=".csv,.tsv,.txt" />
              <div className="dropzone-content">
                <div className="dropzone-icon"><FileIcon size={48} color="var(--primary)" /></div>
                <h4>Drag & Drop CSV File</h4>
                <p>or click to browse from your computer</p>
                <div className="dropzone-hint">Supports CSV, TSV, and tab-delimited files • Required columns: Name, Class</div>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="importer-review">
              <div className="importer-stats">
                <div className="i-stat">
                  <span className="i-stat-v">{data.length}</span>
                  <span className="i-stat-l">Total Rows</span>
                </div>
                <div className="i-stat warning">
                  <span className="i-stat-v">{errors.length}</span>
                  <span className="i-stat-l">Issues Found</span>
                </div>
                <div className="i-stat success">
                  <span className="i-stat-v">{data.length - errors.length}</span>
                  <span className="i-stat-l">Ready to Import</span>
                </div>
              </div>

              {/* Column mapping summary */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: '0.82rem' }}>
                <strong style={{ color: '#0369a1' }}>Detected Columns:</strong>{' '}
                {Object.entries(mappings).map(([field, col]) => (
                  <span key={field} style={{ display: 'inline-block', background: '#e0f2fe', padding: '2px 8px', borderRadius: 6, margin: '2px 4px', fontWeight: 600 }}>
                    {field} ← {col}
                  </span>
                ))}
              </div>

              <div className="importer-table-container">
                <table className="importer-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Adm No</th>
                      <th>Class</th>
                      <th>Stream</th>
                      <th>Gender</th>
                      <th>Parent Phone</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => {
                      const rowError = errors.find(e => e.idx === idx);
                      return (
                        <tr key={row.id} className={rowError ? 'has-error' : ''}>
                          <td>
                            <input
                              value={row.name}
                              onChange={e => handleUpdate(idx, 'name', e.target.value)}
                              className={rowError?.errors?.name ? 'error' : ''}
                            />
                            {rowError?.errors?.name && <span className="err-hint">{rowError.errors.name}</span>}
                          </td>
                          <td>
                            <input value={row.admNo || ''} onChange={e => handleUpdate(idx, 'admNo', e.target.value)} className={rowError?.errors?.admNo ? 'error' : ''} />
                            {rowError?.errors?.admNo && <span className="err-hint">{rowError.errors.admNo}</span>}
                          </td>
                          <td>
                            <select value={row.class} onChange={e => handleUpdate(idx, 'class', e.target.value)} className={rowError?.errors?.class ? 'error' : ''}>
                              {profile.activeClasses?.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td><input value={row.stream || ''} onChange={e => handleUpdate(idx, 'stream', e.target.value)} /></td>
                          <td>
                            <select value={row.gender} onChange={e => handleUpdate(idx, 'gender', e.target.value)}>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </td>
                          <td><input value={row.parentPhone || ''} onChange={e => handleUpdate(idx, 'parentPhone', e.target.value)} /></td>
                          <td><button className="i-row-del" onClick={() => handleRemove(idx)}><DeleteIcon size={14} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: Progress */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: 20 }}>📥</div>
              <h3 style={{ marginBottom: 8 }}>Importing Students...</h3>
              <p className="text-muted" style={{ marginBottom: 24 }}>{progress.imported} of {progress.total} processed</p>
              <div style={{ height: 12, background: '#e2e8f0', borderRadius: 100, overflow: 'hidden', maxWidth: 400, margin: '0 auto' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                  borderRadius: 100,
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 12 }}>{pct}% complete</p>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && result && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✅</div>
              <h3 style={{ marginBottom: 8, color: '#16a34a' }}>Import Complete!</h3>

              <div className="importer-stats" style={{ maxWidth: 500, margin: '24px auto' }}>
                <div className="i-stat success">
                  <span className="i-stat-v">{result.imported}</span>
                  <span className="i-stat-l">Imported</span>
                </div>
                <div className="i-stat warning">
                  <span className="i-stat-v">{result.skipped}</span>
                  <span className="i-stat-l">Plan-Capped</span>
                </div>
                <div className="i-stat" style={{ background: result.errors.length > 0 ? '#fef2f2' : '#f8fafc' }}>
                  <span className="i-stat-v" style={{ color: result.errors.length > 0 ? '#dc2626' : '#1e293b' }}>{result.errors.length}</span>
                  <span className="i-stat-l">Batch Errors</span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto', background: '#fef2f2', padding: 16, borderRadius: 12, border: '1px solid #fecaca' }}>
                  <strong style={{ color: '#991b1b', fontSize: '0.85rem' }}>Error Details:</strong>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: 6 }}>
                      Batch {e.batch}: {e.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="importer-footer">
          {step === 1 && (
            <button className="i-btn-ghost" onClick={onClose}>Cancel</button>
          )}
          {step === 2 && (
            <>
              <button className="i-btn-ghost" onClick={() => { setStep(1); setData([]); setErrors([]); setRawFile(null); }}>
                Upload Different File
              </button>
              <button className="i-btn-primary" onClick={handleImport} disabled={data.length === 0}>
                <CheckIcon size={16} /> Import {data.length - errors.length} Students
              </button>
            </>
          )}
          {step === 4 && (
            <button className="i-btn-primary" onClick={onClose}>
              <CheckIcon size={16} /> Done
            </button>
          )}
        </div>

        <style>{`
          .importer-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center; z-index: 9999;
            padding: 20px; animation: fadeIn 0.3s ease;
          }
          .importer-card {
            background: rgba(255, 255, 255, 0.95);
            width: 100%; max-width: 1000px; max-height: 90vh;
            border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            display: flex; flex-direction: column; overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .importer-header {
            padding: 24px 32px; display: flex; align-items: center; justify-content: space-between;
            border-bottom: 1px solid #eef2f6;
          }
          .importer-h-left { display: flex; align-items: center; gap: 16px; }
          .importer-icon-cube {
            width: 40px; height: 40px; border-radius: 12px;
            background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
            display: flex; align-items: center; justify-content: center;
          }
          .importer-header h3 { margin: 0; font-size: 1.25rem; color: #1e293b; }
          .importer-header p { margin: 4px 0 0; font-size: 0.875rem; color: #64748b; }
          .importer-close { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 8px; transition: all 0.2s; }
          .importer-close:hover { background: #f1f5f9; color: #64748b; }

          .importer-body { padding: 32px; flex: 1; overflow-y: auto; }
          .importer-dropzone {
            height: 300px; border: 2px dashed #e2e8f0; border-radius: 20px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s; background: #f8fafc;
          }
          .importer-dropzone:hover, .importer-dropzone.active { border-color: #6366f1; background: #eef2ff; }
          .dropzone-content { text-align: center; }
          .dropzone-icon { margin-bottom: 16px; }
          .dropzone-content h4 { margin: 0; font-size: 1.125rem; color: #1e293b; }
          .dropzone-content p { margin: 8px 0; color: #64748b; }
          .dropzone-hint { font-size: 0.75rem; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 12px; }

          .importer-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
          .i-stat { background: #f8fafc; padding: 16px; border-radius: 16px; text-align: center; border: 1px solid #f1f5f9; }
          .i-stat-v { display: block; font-size: 1.5rem; font-weight: 700; color: #1e293b; }
          .i-stat-l { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
          .i-stat.warning { background: #fffbeb; border-color: #fef3c7; }
          .i-stat.warning .i-stat-v { color: #d97706; }
          .i-stat.success { background: #f0fdf4; border-color: #dcfce7; }
          .i-stat.success .i-stat-v { color: #16a34a; }

          .importer-table-container { border: 1px solid #eef2f6; border-radius: 16px; overflow: auto; max-height: 400px; }
          .importer-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
          .importer-table th { background: #f8fafc; padding: 12px 16px; text-align: left; color: #64748b; font-weight: 600; border-bottom: 1px solid #eef2f6; position: sticky; top: 0; z-index: 1; }
          .importer-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
          .importer-table tr:last-child td { border-bottom: none; }
          .importer-table tr.has-error { background: #fef2f2; }
          .importer-table input, .importer-table select {
            width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
            font-size: 0.875rem; transition: all 0.2s; outline: none;
          }
          .importer-table input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
          .importer-table input.error { border-color: #ef4444; background: #fef2f2; }
          .err-hint { font-size: 0.7rem; color: #ef4444; display: block; margin-top: 4px; font-weight: 500; }
          .i-row-del { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 6px; border-radius: 6px; transition: all 0.2s; }
          .i-row-del:hover { background: #fee2e2; color: #ef4444; }

          .importer-footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #eef2f6; display: flex; justify-content: flex-end; gap: 12px; }
          .i-btn-ghost { padding: 10px 20px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; color: #64748b; font-weight: 600; cursor: pointer; transition: all 0.2s; }
          .i-btn-ghost:hover { background: #f1f5f9; }
          .i-btn-primary {
            padding: 10px 24px; border-radius: 12px; border: none;
            background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
            color: white; font-weight: 600; cursor: pointer; transition: all 0.2s;
            display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
          }
          .i-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3); }
          .i-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    </div>
  );
}
