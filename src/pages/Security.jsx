import { useState, useEffect } from 'react';
import { getUsers, addUser, deleteUser, getSchoolProfile, getPlatformSettings } from '../data/store';
import { DiamondIcon, UsersIcon } from '../components/CommonIcons';

export default function Security({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [profile, setProfile] = useState({});
  const [settings, setSettings] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [uData, pData, sData] = await Promise.all([
          getUsers(), 
          getSchoolProfile(),
          getPlatformSettings()
        ]);
        setUsers(uData);
        setProfile(pData);
        setSettings(sData || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();

    const loadProfile = async () => {
      try { setProfile(await getSchoolProfile()); } catch(err) {} 
    };
    window.addEventListener('schoolProfileChanged', loadProfile);
    return () => window.removeEventListener('schoolProfileChanged', loadProfile);
  }, []);

  const refresh = async () => {
    try { setUsers(await getUsers()); } catch (err) { console.error(err); }
  };

  const planName = profile.subscriptionPlan || 'Fala';
  
  // Try to find the plan case-insensitively in settings
  const pricing = settings?.pricing || {};
  const activePlanKey = Object.keys(pricing).find(k => k.toLowerCase() === planName.toLowerCase());
  
  // Fallbacks in case settings fail or plan isn't found
  const fallbackPlans = {
    "Fala": { price: 5999, limit: 150 },
    "Champe": { price: 50000, limit: 5000 },
    "Starter": { price: 5999, limit: 150 }
  };
  
  const planDetails = activePlanKey ? pricing[activePlanKey] : (fallbackPlans[planName] || fallbackPlans["Fala"]);
  
  // Seat limit is for STAFF (Admins + Teachers)
  let seatLimit = activePlanKey ? (pricing[activePlanKey].seat_limit || 5) : 5;
  
  // Strict override for Starter/Fala plans (5 staff seats)
  if (planName.toLowerCase().includes('starter') || planName.toLowerCase().includes('fala')) {
    seatLimit = 5;
  }

  const actualStaffCount = users.length;
  const isAtLimit = actualStaffCount >= seatLimit;

  const handleDelete = async (id) => {
    try {
      if (confirm('Are you sure you want to delete this user?')) {
        setLoading(true);
        await deleteUser(id);
        await refresh();
        setLoading(false);
      }
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  const handleAdd = async (user) => {
    try {
      setLoading(true);
      await addUser(user);
      await refresh();
      setShowModal(false);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h2>Security & Access</h2>
              <p>Manage administrator roles and subscription limits</p>
            </div>
            {loading && <span className="text-muted" style={{ fontSize: '0.85rem' }}>Loading...</span>}
          </div>
          <div>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowModal(true)}
              style={{ opacity: isAtLimit ? 0.6 : 1, cursor: isAtLimit ? 'not-allowed' : 'pointer'}}
              title={isAtLimit ? 'Limit reached' : 'Add new user'}
            >
              + Add Admin User
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24, alignItems: 'start' }}>
        
        {/* Users Table */}
        <div className="card">
          <div className="card-header">
            <h3><UsersIcon size={18} /> Access Management</h3>
            <span className="badge badge-primary">{actualStaffCount} / {seatLimit} seats used</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelf = currentUser && currentUser.id === u.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="badge" title={u.id}>
                          {u.id.substring(0, 8)}...
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{u.name} {isSelf && <span style={{ color: 'var(--primary)', fontSize: '0.75rem', marginLeft: 4 }}>(You)</span>}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'Admin' || u.role === 'admin' ? 'badge-primary' : u.role === 'Finance' ? 'badge-success' : 'badge-info'}`}>
                          {(u.role || 'Teacher').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {isSelf ? (
                          <span className="text-muted" style={{ fontSize: '0.85rem' }}>Current User</span>
                        ) : (
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(u.id)}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subscription Sidebar info */}
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="card-header">
            <h3><DiamondIcon size={18} /> Active Plan</h3>
          </div>
          <div className="card-body">
            <div style={{ marginBottom: 16 }}>
              <div className="text-muted" style={{ fontSize: '0.82rem', marginBottom: 4 }}>Current Tier</div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary)' }}>{planName}</div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <div className="text-muted" style={{ fontSize: '0.82rem', marginBottom: 4 }}>Price</div>
              <div style={{ fontWeight: 600 }}>KSh {(planDetails.price || 0).toLocaleString()}/term</div>
            </div>

            <div style={{ borderBottom: '1px solid #e2e8f0', margin: '16px 0' }}></div>

            <h4 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--text-main)' }}>Plan Limits</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', color: 'var(--text-light)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Max Students:</span>
                <strong>{(planDetails.limit || 150).toLocaleString()}</strong>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', color: isAtLimit ? 'var(--danger)' : 'inherit' }}>
                <span>Total Staff (Admins + Teachers):</span>
                <strong>{actualStaffCount} / {seatLimit}</strong>
              </li>
            </ul>
            
            {isAtLimit && (
              <div style={{ marginTop: 16, padding: 12, background: '#fee2e2', color: '#b91c1c', borderRadius: 6, fontSize: '0.85rem' }}>
                You have reached your seat limit of {seatLimit}. Delete inactive staff or contact ShuleSoft to upgrade.
              </div>
            )}
          </div>
        </div>

      </div>

      {showModal && (
        <UserModal 
          onClose={() => { setShowModal(false); setError(''); }}
          onSave={handleAdd}
          error={error}
        />
      )}
    </div>
  );
}

function UserModal({ onClose, onSave, error }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'Teacher' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New User</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ color: 'var(--danger)', marginBottom: 16, fontSize: '0.9rem' }}>{error}</div>}
            
            <div className="form-group">
              <label>Full Name</label>
              <input 
                className="form-input" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select 
                className="form-select" 
                value={form.role} 
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="Teacher">Teacher (Grading, Attendance, Students)</option>
                <option value="Finance">Finance (Fees, Students List)</option>
                <option value="Admin">Admin (Full Access)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Temporary Password</label>
              <input 
                type="password"
                className="form-input" 
                value={form.password || ''} 
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
                placeholder="password123"
                minLength={6}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 4, display: 'block' }}>Must be at least 6 characters. If left blank, defaults to "password123".</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create User</button>
          </div>
        </form>
      </div>
    </div>
  );
}
