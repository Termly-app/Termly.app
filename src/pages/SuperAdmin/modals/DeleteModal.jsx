import { DeleteIcon, CrossIcon } from '../../../components/CommonIcons';

export default function DeleteModal({ deleteModal, setDeleteModal, deleting, handleDeleteSchool }) {
  if (!deleteModal) return null;

  return (
    <div
      className={`mo${deleteModal ? ' open' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) setDeleteModal(null); }}
    >
      <div className="mb" style={{ borderColor:'var(--ro)' }}>
        <button className="mc" onClick={() => setDeleteModal(null)}><CrossIcon size={18} /></button>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <div className="li-ico ni-r" style={{ width:42, height:42, borderRadius:10, color:'var(--ro)' }}><DeleteIcon size={24} /></div>
          <div>
            <div style={{ fontFamily:'var(--fh)', fontSize:'1rem', fontWeight:700, color:'var(--ro)' }}>
              Terminate School
            </div>
            <div style={{ fontSize:'.72rem', color:'var(--sub)', marginTop:2 }}>
              Irreversible administrative action
            </div>
          </div>
        </div>

        {/* ── Warning ── */}
        <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid var(--edge)', borderRadius:10, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:'.8rem', color:'#fff', fontWeight:600, marginBottom:6 }}>
            Are you absolutely sure?
          </div>
          <div style={{ fontSize:'.72rem', color:'var(--sub)', lineHeight:1.5 }}>
            You are about to permanently delete{' '}
            <strong style={{ color:'var(--txt)' }}>{deleteModal.name}</strong>{' '}
            and all associated profiles, payments, and data. This cannot be undone.
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display:'flex', gap:10 }}>
          <button className="act-btn"
            style={{ flex:1, padding:12, borderRadius:9, fontSize:'.82rem' }}
            onClick={() => setDeleteModal(null)}>
            No, Cancel
          </button>
          <button className="save-btn"
            disabled={deleting}
            onClick={handleDeleteSchool}
            style={{ flex:1.4, background:'var(--dim)', padding:12, borderRadius:9, fontSize:'.82rem', fontWeight:700 }}>
            {deleting ? 'Terminating...' : 'Yes, Terminate School'}
          </button>
        </div>
      </div>
    </div>
  );
}
