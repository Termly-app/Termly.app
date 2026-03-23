import { sPill } from '../superAdminUtils';
import { TeacherIcon } from '../../../components/CommonIcons';

export default function StaffModal({
  staffModal, setStaffModal,
  loadingStaff,
  handleDeleteStaff,
}) {
  if (!staffModal) return null;

  return (
    <div
      className={`mo${staffModal ? ' open' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) setStaffModal(null); }}
    >
      <div className="mb" style={{ maxWidth:500 }}>
        <button className="mc" onClick={() => setStaffModal(null)}><CrossIcon size={18} /></button>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <div className="li-ico ni-v" style={{ width:36, height:36, borderRadius:9 }}><TeacherIcon size={20} /></div>
          <div>
            <div style={{ fontFamily:'var(--fh)', fontSize:'.9rem', fontWeight:700, color:'#fff' }}>
              Manage Staff
            </div>
            <div style={{ fontSize:'.68rem', color:'var(--sub)', marginTop:2 }}>{staffModal.name}</div>
          </div>
        </div>

        {/* ── Staff table ── */}
        <div className="tbl-w" style={{ maxHeight:300, overflowY:'auto', background:'var(--bg)', borderRadius:8, border:'1px solid var(--edge)' }}>
          {loadingStaff ? (
            <div style={{ padding:40, textAlign:'center' }}>
              <div className="spin" style={{ margin:'0 auto 10px' }} />
              Loading staff...
            </div>
          ) : staffModal.staff.length === 0 ? (
            <div className="empty" style={{ padding:30 }}>No staff accounts found.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Name</th><th>Phone / Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {staffModal.staff.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontSize:'.75rem', fontWeight:600 }}>{t.name}</div>
                      <div style={{ fontSize:'.6rem', color:'var(--sub)' }}>{t.id.slice(0, 8)}</div>
                    </td>
                    <td>
                      <div style={{ fontSize:'.7rem' }}>{t.phone || '—'}</div>
                      <span className={sPill(t.status)} style={{ fontSize:'9px' }}>{t.status}</span>
                    </td>
                    <td style={{ textAlign:'right' }}>
                      <button className="act-btn"
                        style={{ color:'var(--ro)', borderColor:'rgba(212,80,106,.2)', padding:'3px 8px', fontSize:'10px' }}
                        onClick={() => handleDeleteStaff(t.id, t.name)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer note ── */}
        <div style={{ marginTop:20, fontSize:'.65rem', color:'var(--sub)', lineHeight:1.4, padding:'0 4px' }}>
          <strong>Note:</strong> Deleting a staff member will permanently remove their portal access
          and grading/attendance assignments.
        </div>
      </div>
    </div>
  );
}
