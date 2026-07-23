import React, { useState, useEffect } from 'react';
import { getStudents, transferStudents } from '../../data/studentStore';
import { getSchoolProfile } from '../../data/coreStore';;
import { CBC_STRUCTURE } from '../../data/seedData';
import { PlatformZapIcon, CheckIcon, AlertIcon, UsersIcon, ArrowRightIcon } from '../../components/CommonIcons';
import { useDialog } from '../../contexts/DialogContext';

export default function PromotionManager() {
  const { alert, confirm } = useDialog();
  const [students, setStudents] = useState([]);
  const [profile, setProfile] = useState({});
  const [sourceClass, setSourceClass] = useState('');
  const [targetClass, setTargetClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, p] = await Promise.all([getStudents(), getSchoolProfile()]);
        setStudents(s);
        setProfile(p);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const allGrades = Object.values(CBC_STRUCTURE).flatMap(l => l.grades);
  const filteredStudents = students.filter(s => s.class === sourceClass && s.status === 'Active');

  const handleSourceChange = (val) => {
    setSourceClass(val);
    const idx = allGrades.indexOf(val);
    if (idx >= 0 && idx < allGrades.length - 1) {
      setTargetClass(allGrades[idx + 1]);
    } else if (idx === allGrades.length - 1) {
      setTargetClass('Graduated');
    } else {
      setTargetClass('');
    }
    setSelectedIds([]);
  };

  const handlePromote = async () => {
    if (selectedIds.length === 0) return;

    const ok = await confirm({
      title: 'Execute Promotion',
      message: `Are you sure you want to promote ${selectedIds.length} students from ${sourceClass} to ${targetClass}? Historical records will be created automatically.`,
      confirmText: 'Promote Now',
      variant: 'primary'
    });

    if (ok) {
      setLoading(true);
      try {
        await transferStudents(selectedIds, 'promote');
        alert({ title: 'Promotion Complete', message: `Successfully transitioned ${selectedIds.length} students to ${targetClass}.`, variant: 'success' });
        // Refresh data
        const s = await getStudents();
        setStudents(s);
        setSelectedIds([]);
      } catch (err) {
        alert({ title: 'Promotion Failed', message: err.message, variant: 'danger' });
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === filteredStudents.length) setSelectedIds([]);
    else setSelectedIds(filteredStudents.map(s => s.id));
  };

  return (
    <div className="promotion-manager">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div className="setup-card" style={{ background: '#fff', padding: 24, borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <PlatformZapIcon size={18} color="var(--primary)" /> Step 1: Selection
          </h3>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 8 }}>Source Class</label>
            <select 
              className="form-input" 
              value={sourceClass} 
              onChange={e => handleSourceChange(e.target.value)}
              style={{ width: '100%', borderRadius: 12, border: '1px solid #e2e8f0', padding: '10px 14px' }}
            >
              <option value="">Select source class...</option>
              {allGrades.filter(g => profile.activeClasses?.includes(g)).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px 0' }}>
             <ArrowRightIcon size={20} color="#cbd5e1" />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 8 }}>Target Class</label>
            <div style={{ padding: '12px 16px', background: '#f8faFc', borderRadius: 12, border: '1px solid #e2e8f0', color: 'var(--primary)', fontWeight: 800 }}>
              {targetClass || 'Auto-calculated...'}
            </div>
          </div>
        </div>

        <div className="info-card" style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', padding: 24, borderRadius: 20, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
             <div style={{ background: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10 }}><AlertIcon size={20} color="#fff" /></div>
             <h3 style={{ margin: 0, fontWeight: 800 }}>Promotion Protocol</h3>
          </div>
          <p style={{ fontSize: '0.9rem', opacity: 0.9, lineHeight: 1.6 }}>
            Promoting students will move them to the next academic level. The system will:
          </p>
          <ul style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: 12, paddingLeft: 20 }}>
            <li>Snapshot current marks & attendance to history</li>
            <li>Update current class & stream to the target grade</li>
            <li>Generate a historical log for school audits</li>
          </ul>
        </div>
      </div>

      {sourceClass && (
        <div className="student-list-card animate-in" style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontWeight: 800 }}>{filteredStudents.length} Students in {sourceClass}</h4>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={selectAll}>
                 {selectedIds.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handlePromote} disabled={selectedIds.length === 0 || loading}>
                 <CheckIcon size={14} /> Promote Selected ({selectedIds.length})
              </button>
            </div>
          </div>
          
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Adm No</th>
                  <th>Student Name</th>
                  <th>Stream</th>
                  <th>Gender</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s.id} onClick={() => toggleSelect(s.id)} style={{ cursor: 'pointer', background: selectedIds.includes(s.id) ? '#f0f7ff' : 'transparent' }}>
                    <td><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => {}} /></td>
                    <td><code>{s.admNo}</code></td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.stream || '—'}</td>
                    <td>{s.gender || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
