import { useState, useRef } from 'react';
import { useDialog } from '../contexts/DialogContext';
import { 
  UploadIcon, CheckIcon, AlertIcon, DeleteIcon, EditIcon, 
  SearchIcon, StudentIcon, XIcon, FileIcon, RefreshIcon 
} from './CommonIcons';

export default function StudentImporter({ profile, onImport, onClose }) {
  const { alert, confirm } = useDialog();
  const [step, setStep] = useState(1); // 1: Upload, 2: Review
  const [dragActive, setDragActive] = useState(false);
  const [rawFile, setRawFile] = useState(null);
  const [data, setData] = useState([]);
  const [mappings, setMappings] = useState({});
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const REQUIRED_FIELDS = ['name', 'class'];
  const FIELD_MAP = {
    name: ['name', 'full name', 'student name', 'learner name', 'jina'],
    admNo: ['adm', 'admission', 'reg', 'registration', 'no', 'number'],
    class: ['class', 'grade', 'level', 'form'],
    stream: ['stream', 'house', 'extra'],
    gender: ['gender', 'sex', 'm/f'],
    parent: ['parent', 'guardian', 'father', 'mother'],
    parentPhone: ['phone', 'contact', 'mobile', 'tel']
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
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = async (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      await alert({ 
        title: 'Empty File', 
        message: 'The uploaded file is too short or empty. Please check your CSV data.', 
        variant: 'warning' 
      });
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const newMappings = {};
    
    // Fuzzy matching
    Object.keys(FIELD_MAP).forEach(field => {
      const match = headers.findIndex(h => FIELD_MAP[field].some(syn => h.includes(syn)));
      if (match !== -1) newMappings[field] = match;
    });

    const parsedData = lines.slice(1).map((line, idx) => {
      const values = line.split(',').map(v => v.trim());
      const row = { id: `row-${idx}` };
      
      Object.keys(newMappings).forEach(field => {
        let val = values[newMappings[field]] || '';
        
        // Normalization
        if (field === 'gender') {
          if (/^m/i.test(val)) val = 'Male';
          else if (/^f/i.test(val)) val = 'Female';
        }
        
        row[field] = val;
      });

      // Default values for missing mandatory fields
      if (!row.class) row.class = profile.activeClasses?.[0] || 'Grade 1';
      if (!row.gender) row.gender = 'Male';

      return row;
    });

    setData(parsedData);
    setMappings(newMappings);
    validateData(parsedData);
    setStep(2);
  };

  const validateData = (rows) => {
    const newErrors = [];
    rows.forEach((row, idx) => {
      const rowErrors = {};
      if (!row.name) rowErrors.name = "Name is required";
      if (!profile.activeClasses?.includes(row.class)) rowErrors.class = "Invalid class";
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
    if (errors.length > 0) {
      const ok = await confirm({
        title: 'Import with Issues',
        message: `There are ${errors.length} rows with validation issues. These rows will be skipped. Proceed anyway?`,
        variant: 'warning'
      });
      if (!ok) return;
      const validRows = data.filter((_, i) => !errors.find(e => e.idx === i));
      onImport(validRows);
    } else {
      onImport(data);
    }
  };

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
              <p>{step === 1 ? 'Upload your student CSV file to get started' : `Reviewing ${data.length} student records`}</p>
            </div>
          </div>
          <button className="importer-close" onClick={onClose}><XIcon size={20} /></button>
        </div>

        <div className="importer-body">
          {step === 1 ? (
            <div 
              className={`importer-dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input type="file" ref={fileInputRef} onChange={(e) => e.target.files[0] && processFile(e.target.files[0])} style={{ display: 'none' }} accept=".csv" />
              <div className="dropzone-content">
                <div className="dropzone-icon"><FileIcon size={48} color="var(--primary)" /></div>
                <h4>Drag & Drop CSV File</h4>
                <p>or click to browse from your computer</p>
                <div className="dropzone-hint">Required columns: Name, Class</div>
              </div>
            </div>
          ) : (
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
                          <td><input value={row.admNo} onChange={e => handleUpdate(idx, 'admNo', e.target.value)} /></td>
                          <td>
                            <select value={row.class} onChange={e => handleUpdate(idx, 'class', e.target.value)} className={rowError?.errors?.class ? 'error' : ''}>
                              {profile.activeClasses?.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td><input value={row.stream} onChange={e => handleUpdate(idx, 'stream', e.target.value)} /></td>
                          <td>
                            <select value={row.gender} onChange={e => handleUpdate(idx, 'gender', e.target.value)}>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </td>
                          <td><input value={row.parentPhone} onChange={e => handleUpdate(idx, 'parentPhone', e.target.value)} /></td>
                          <td><button className="i-row-del" onClick={() => handleRemove(idx)}><DeleteIcon size={14} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="importer-footer">
          <button className="i-btn-ghost" onClick={step === 2 ? () => setStep(1) : onClose}>
            {step === 2 ? 'Upload Different File' : 'Cancel'}
          </button>
          {step === 2 && (
            <button className="i-btn-primary" onClick={handleImport}>
              <CheckIcon size={16} /> Import {data.length - errors.length} Students
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

          .importer-table-container { border: 1px solid #eef2f6; border-radius: 16px; overflow: hidden; }
          .importer-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
          .importer-table th { background: #f8fafc; padding: 12px 16px; text-align: left; color: #64748b; font-weight: 600; border-bottom: 1px solid #eef2f6; }
          .importer-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
          .importer-table tr:last-child td { border-bottom: none; }
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

          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    </div>
  );
}
