import { useState, useEffect } from 'react';
import { CrossIcon, CheckIcon, UsersIcon, ShieldIcon } from '../../../components/CommonIcons';
import { updateSchoolLimits } from '../../../data/coreStore';

export default function LimitsModal({ school, onClose, onUpdated, setMessage }) {
  const [studentLimit, setStudentLimit] = useState(10000);
  const [staffLimit, setStaffLimit] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!school) return;
    const pList = Array.isArray(school.school_profiles) ? school.school_profiles : [];
    const p = pList[0] || {};
    let cSubs = p.custom_subjects || {};
    if (typeof cSubs === 'string') {
      try { cSubs = JSON.parse(cSubs); } catch(e) { cSubs = {}; }
    }
    const curStudents = cSubs.__limits?.students || p.student_limit || 10000;
    const curStaff = cSubs.__limits?.staff || p.staff_limit || 5;
    setStudentLimit(curStudents);
    setStaffLimit(curStaff);
    setError('');
  }, [school]);

  if (!school) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateSchoolLimits(school.id, {
        students: studentLimit,
        staff: staffLimit,
      });
      setMessage({ type: 'success', text: `Limits updated for ${school.name}` });
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error('Failed to update limits:', err);
      setError(err.message || 'Failed to update limits');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mo open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mb" style={{ maxWidth: 450 }}>
        <button className="mc" onClick={onClose}><CrossIcon size={18} /></button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1'
          }}>
            <ShieldIcon size={20} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--fh)', fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
              Set Capacity Limits
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sub)', marginTop: 2 }}>{school.name}</div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.75rem', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--sub)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
              Student Capacity Limit
            </label>
            <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginBottom: 8 }}>
              Current Usage: <strong style={{ color: '#fff' }}>{school._studentCount || 0}</strong> active students
            </div>
            <input
              type="number"
              min="1"
              max="50000"
              value={studentLimit}
              onChange={(e) => setStudentLimit(e.target.value)}
              className="sa-input"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg)', border: '1px solid var(--edge2)',
                color: '#fff', fontSize: '0.85rem', outline: 'none'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--sub)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
              Staff Seats Capacity Limit
            </label>
            <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginBottom: 8 }}>
              Current Usage: <strong style={{ color: '#fff' }}>{school._staffCount || 0}</strong> staff user seats
            </div>
            <input
              type="number"
              min="1"
              max="5000"
              value={staffLimit}
              onChange={(e) => setStaffLimit(e.target.value)}
              className="sa-input"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg)', border: '1px solid var(--edge2)',
                color: '#fff', fontSize: '0.85rem', outline: 'none'
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="act-btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="act-btn g" disabled={saving}>
              {saving ? 'Saving Limits...' : 'Save Limits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
