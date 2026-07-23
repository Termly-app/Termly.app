import React, { useState, useEffect } from 'react';
import { getPlatformAdmins, addPlatformAdmin, removePlatformAdmin } from '../../../data/coreStore';;
import { ShieldIcon, UserIcon, CrossIcon, CheckIcon } from '../../../components/CommonIcons';
import { fmtDate } from '../superAdminUtils';
import { useDialog } from '../../../contexts/DialogContext';

export default function AdminsTab() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  
  const { alert, confirm } = useDialog();

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await getPlatformAdmins();
      setAdmins(data);
    } catch (err) {
      console.error('Failed to load platform admins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      await addPlatformAdmin(newEmail.trim());
      setNewEmail('');
      loadAdmins();
      alert({ title: 'Success', message: 'Platform admin added successfully.' });
    } catch (err) {
      console.error('Failed to add admin:', err);
      alert({ title: 'Error', message: err.message || 'Failed to add admin.' });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (email) => {
    if (await confirm({ title: 'Confirm Removal', message: `Are you sure you want to remove ${email} from platform admins?` })) {
      try {
        await removePlatformAdmin(email);
        loadAdmins();
      } catch (err) {
        alert({ title: 'Error', message: 'Failed to remove admin.' });
      }
    }
  };

  return (
    <div className="tv animate-in">
      <div className="page-hd">
        <div className="ph-left">
          <div className="ph-ico" style={{ background: 'var(--vi)', color: '#fff' }}><ShieldIcon size={24} /></div>
          <div>
            <div className="ph-title">Platform Administrators</div>
            <div className="ph-sub">Manage accounts with global access to all schools</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-lbl">Add New Administrator</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--sub)', marginBottom: 20 }}>
            Enter the email of an existing user to grant them platform-wide administrative privileges.
          </p>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10 }}>
            <input 
              type="email" 
              className="sa-input" 
              placeholder="admin@Termly.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              style={{ flex: 1, padding: '10px 15px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--txt)' }}
            />
            <button className="act-btn g" type="submit" disabled={adding || !newEmail}>
              {adding ? 'Adding...' : 'Add Admin'}
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-lbl">Current Administrators ({admins.length})</div>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>
          ) : admins.length === 0 ? (
            <div className="empty">No platform admins found.</div>
          ) : (
            <div className="sa-table-wrap" style={{ marginTop: 15 }}>
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Admin Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <UserIcon size={14} color="var(--vi)" />
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.email}</span>
                        </div>
                      </td>
                      <td><span className="s-pill is-ok">{a.role || 'Super Admin'}</span></td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--sub)' }}>{fmtDate(a.created_at)}</td>
                      <td>
                        <button 
                          className="act-btn r small" 
                          onClick={() => handleDelete(a.email)}
                          style={{ padding: '4px 8px' }}
                        >
                          Remove
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

      <div className="panel" style={{ marginTop: 20, background: 'rgba(124,92,252,0.05)', border: '1px solid rgba(124,92,252,0.1)' }}>
        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
          <ShieldIcon size={32} color="var(--vi)" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--vi)' }}>Security Note</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--sub)', marginTop: 4, lineHeight: 1.5 }}>
              Platform admins can bypass all school-level RLS policies and access sensitive configuration data. 
              Only grant this role to trusted Termly HQ staff. All platform actions are recorded in the global activity log.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
