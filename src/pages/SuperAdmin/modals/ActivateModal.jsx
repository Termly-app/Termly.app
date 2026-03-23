import { fmtMoney, planAmt } from '../superAdminUtils';
import { CheckIcon } from '../../../components/CommonIcons';

export default function ActivateModal({
  activateModal, setActivateModal,
  payMethod, setPayMethod,
  payRef, setPayRef,
  activating, activateSuccess,
  handleConfirmActivate,
  settings,
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
              Confirm Payment &amp; Activate
            </div>
            <div style={{ fontSize:'.68rem', color:'var(--sub)', marginTop:2 }}>
              School account will be activated immediately
            </div>
          </div>
        </div>

        {/* ── School summary ── */}
        <div className="mi">
          <div className="mir"><span className="mil">School</span><span className="miv">{activateModal.name}</span></div>
          <div className="mir">
            <span className="mil">Plan</span>
            <span style={{ fontSize:'.75rem', color:'var(--txt)', textTransform:'capitalize' }}>
              {activateModal.school_profiles?.[0]?.subscription_plan || 'Starter'} Plan
            </span>
          </div>
          <div className="mir">
            <span className="mil">Amount</span>
            <span style={{ fontFamily:'var(--fh)', fontSize:'.82rem', fontWeight:700, color:'var(--te)' }}>
              {fmtMoney(planAmt(activateModal.school_profiles?.[0]?.subscription_plan, settings))}
            </span>
          </div>
        </div>

        {/* ── Payment method ── */}
        <div style={{ marginBottom:14 }}>
          <div className="sb-lbl" style={{ marginBottom:7 }}>Payment Method</div>
          <div className="pms">
            {[['mpesa','M-PESA','Paybill'],['cash','Cash','Manual'],['bank','Bank','Transfer']].map(([id, n, s]) => (
              <div key={id} className={`pm${payMethod === id ? ' on' : ''}`} onClick={() => setPayMethod(id)}>
                <div className="pmt" style={{ color: payMethod === id ? 'var(--te)' : 'var(--sub)' }}>{n}</div>
                <div className="pms2">{s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Reference ── */}
        <div style={{ marginBottom:20 }}>
          <div className="sb-lbl" style={{ marginBottom:7 }}>
            Payment Reference <span style={{ color:'var(--dim)' }}>(optional)</span>
          </div>
          <input type="text" placeholder="e.g. QHX7K2P3 or receipt no."
            value={payRef} onChange={e => setPayRef(e.target.value)}
            style={{ fontFamily:'var(--fh)', fontSize:'.75rem' }} />
        </div>

        {/* ── Action / success ── */}
        {!activateSuccess ? (
          <button onClick={handleConfirmActivate} disabled={activating}
            style={{
              width:'100%', padding:12, borderRadius:9,
              background:'linear-gradient(135deg,var(--te),#09A86A)',
              color:'#000', fontFamily:'var(--fb)', fontSize:'.88rem', fontWeight:700,
              border:'none', cursor:'pointer',
              boxShadow:'0 4px 18px rgba(13,216,138,.3)',
              opacity: activating ? .7 : 1,
            }}>
            {activating ? 'Activating...' : 'Confirm Payment & Activate Account'}
          </button>
        ) : (
          <div style={{ textAlign:'center', marginTop:16 }}>
            <div style={{ marginBottom:8, color:'var(--te)' }}><CheckIcon size={40} /></div>
            <div style={{ fontFamily:'var(--fh)', fontSize:'.88rem', fontWeight:700, color:'var(--te)', marginBottom:4 }}>
              Account Activated!
            </div>
            <div style={{ fontSize:'.72rem', color:'var(--sub)' }}>
              {activateModal.name} is now active.{payRef ? ` Ref: ${payRef}` : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
