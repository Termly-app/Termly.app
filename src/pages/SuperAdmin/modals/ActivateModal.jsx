import { CheckIcon, CrossIcon } from '../../../components/CommonIcons';

export default function ActivateModal({
  activateModal, setActivateModal,
  activationNote, setActivationNote,
  activating, activateSuccess,
  handleConfirmActivate,
}) {
  if (!activateModal) return null;

  return (
    <div
      className={`mo${activateModal ? ' open' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) setActivateModal(null); }}
    >
      <div className="mb">
        <button className="mc" onClick={() => setActivateModal(null)}><CrossIcon size={18} /></button>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <div className="li-ico ni-t" style={{ width:36, height:36, borderRadius:9 }}><CheckIcon size={20} /></div>
          <div>
            <div style={{ fontFamily:'var(--fh)', fontSize:'.9rem', fontWeight:700, color:'#fff' }}>
              Confirm Activation
            </div>
            <div style={{ fontSize:'.68rem', color:'var(--sub)', marginTop:2 }}>
              Set school status to Active immediately
            </div>
          </div>
        </div>

        {/* ── School summary ── */}
        <div className="mi" style={{ marginBottom: 20 }}>
          <div className="mir"><span className="mil">School</span><span className="miv">{activateModal.name}</span></div>
          <div className="mir"><span className="mil">Workspace</span><span className="miv">{activateModal.school_code || '—'}</span></div>
        </div>

        {/* ── Reference ── */}
        <div style={{ marginBottom:20 }}>
          <div className="sb-lbl" style={{ marginBottom:7 }}>
            Internal Reference / Note <span style={{ color:'var(--dim)' }}>(optional)</span>
          </div>
          <input type="text" placeholder="e.g. Onboarding complete or specific note."
            value={activationNote} onChange={e => setActivationNote(e.target.value)}
            style={{ fontFamily:'var(--fh)', fontSize:'.75rem' }} />
        </div>

        {/* ── Action / success ── */}
        {!activateSuccess ? (
          <button onClick={() => handleConfirmActivate(0)} disabled={activating}
            style={{
              width:'100%', padding:14, borderRadius:9,
              background:'linear-gradient(135deg,#fff,#a1a1aa)',
              color:'#000', fontFamily:'var(--fb)', fontSize:'.88rem', fontWeight:700,
              border:'none', cursor:'pointer',
              boxShadow:'0 4px 18px rgba(255,255,255,.1)',
              opacity: activating ? .7 : 1,
            }}>
            {activating ? 'Activating...' : 'Activate School Workspace'}
          </button>
        ) : (
          <div style={{ textAlign:'center', marginTop:16 }}>
            <div style={{ marginBottom:8, color:'var(--te)' }}><CheckIcon size={40} /></div>
            <div style={{ fontFamily:'var(--fh)', fontSize:'.88rem', fontWeight:700, color:'var(--te)', marginBottom:4 }}>
              Account Activated!
            </div>
            <div style={{ fontSize:'.72rem', color:'var(--sub)' }}>
              {activateModal.name} is now active.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
