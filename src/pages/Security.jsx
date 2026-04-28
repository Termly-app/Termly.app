import { useState, useEffect } from 'react';
import { getUsers, addUser, deleteUser, getSchoolProfile, getPlatformSettings } from '../data/store';
import { DiamondIcon, UsersIcon, EyeIcon, EyeOffIcon } from '../components/CommonIcons';
import Select from '../components/Common/Select';
import { Helmet } from 'react-helmet-async';
import { useDialog } from '../contexts/DialogContext';

export default function Security({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [profile, setProfile] = useState({});
  const [settings, setSettings] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const { alert, confirm } = useDialog();

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

  const planName = profile.subscriptionPlan || 'Starter Plan';
  
  // Try to find the plan case-insensitively in settings
  const pricing = settings?.pricing || {};
  const activePlanKey = Object.keys(pricing).find(k => k.toLowerCase() === planName.toLowerCase());
  
  // Fallbacks in case settings fail or plan isn't found
  const fallbackPlans = {
    "Sandbox": { price: 0, limit: 150, seats: 10 },
    "Starter Plan": { price: 5999, limit: 150, seats: 5 },
    "Champe": { price: 50000, limit: 5000, seats: 20 }
  };
  
  const planDetails = activePlanKey ? pricing[activePlanKey] : (fallbackPlans[planName] || fallbackPlans["Starter Plan"]);
  
  // Seat limit is for STAFF (Admins + Teachers)
  // Priority: 1. Manual Super Admin Override, 2. Pricing Config, 3. Fallback Plans
  let seatLimit = profile.staffLimit || 5;
  
  // If we haven't set a custom limit (still at fallback 1000 from store.js mapping), 
  // or if we want to be more specific, we check the pricing.
  // Note: if profile.staffLimit is exactly 1000 (the store.js fallback), we try to refine it with plan info.
  if (!profile.staffLimit || profile.staffLimit === 1000) {
    if (activePlanKey && pricing[activePlanKey]) {
      seatLimit = pricing[activePlanKey].admins || pricing[activePlanKey].seat_limit || 5;
    } else if (fallbackPlans[planName]) {
      seatLimit = fallbackPlans[planName].seats || 5;
    }
  }
  
  const actualStaffCount = users.length;
  const isAtLimit = actualStaffCount >= seatLimit;

  const handleDelete = async (id) => {
    try {
      if (await confirm({ title: 'Delete User', message: 'Are you sure you want to delete this user?', variant: 'danger' })) {
        setLoading(true);
        await deleteUser(id);
        await refresh();
        setLoading(false);
      }
    } catch (err) {
      alert({ title: 'Error', message: err.message, variant: 'danger' });
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
      <Helmet>
        <title>Security & Access Control | Termly — System Safety</title>
        <meta name="description" content="Manage staff roles, user permissions, and school security settings. Monitor admin access and platform seats." />
      </Helmet>
      <div className="page-header">
        <div className="page-header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h2>Security & Access</h2>
              <p>Manage administrator roles and access control</p>
            </div>
            {loading && <span className="text-muted" style={{ fontSize: '0.85rem' }}>Loading...</span>}
          </div>
          <div>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowModal(true)}
                style={{ opacity: isAtLimit ? 0.6 : 1, cursor: isAtLimit ? 'not-allowed' : 'pointer'}}
                disabled={isAtLimit}
                title={isAtLimit ? 'Limit reached' : 'Add new user'}
              >
                + Add Staff Member
              </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, alignItems: 'start' }}>
        
        {/* Users Table */}
        <div className="card">
          <div className="card-header">
            <h3><UsersIcon size={18} /> Access Management</h3>
            <span className="badge badge-primary">{actualStaffCount} / {seatLimit} staff seats</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
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

      </div>

      {showModal && (
        <UserModal 
          onClose={() => { setShowModal(false); setError(''); }}
          onSave={handleAdd}
          error={error}
          adminExists={users.some(u => u.role === 'Admin' || u.role === 'admin')}
        />
      )}
    </div>
  );
}

function UserModal({ onClose, onSave, error, adminExists }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'Teacher', password: '' });
  const [showPassword, setShowPassword] = useState(false);

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
              <Select 
                value={form.role} 
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                options={[
                  { id: 'Teacher', label: 'Teacher (Grading, Attendance, Students)' },
                  { id: 'Finance', label: 'Finance (Fees, Students List)' },
                  { id: 'Librarian', label: 'Librarian (Library, Students List)' },
                  { id: 'Admin', label: `Admin (Full Access) ${adminExists ? '— (Limit: 1)' : ''}`, disabled: adminExists }
                ]}
                style={{ width: '100%' }}
              />
            </div>
            <div className="form-group">
              <label>Temporary Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"}
                  className="form-input" 
                  value={form.password || ''} 
                  onChange={(e) => setForm({ ...form, password: e.target.value })} 
                  placeholder="password123"
                  minLength={6}
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-light)' }}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
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
