import { RefreshIcon, CheckIcon, CrossIcon } from '../../../components/CommonIcons';

export default function PlanModal({
  planModal, setPlanModal,
  chosenPlan, setChosenPlan,
  planSaving,
  handleChangePlan,
  settings,
}) {
  if (!planModal) return null;

  return (
    <div
      className={`mo${planModal ? ' open' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) { setPlanModal(null); setChosenPlan(''); } }}
    >
      <div className="mb" style={{ maxWidth:400 }}>
        <button className="mc" onClick={() => { setPlanModal(null); setChosenPlan(''); }}><CrossIcon size={18} /></button>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <div className="li-ico ni-s" style={{ width:36, height:36, borderRadius:9 }}><RefreshIcon size={20} /></div>
          <div>
            <div style={{ fontFamily:'var(--fh)', fontSize:'.9rem', fontWeight:700, color:'#fff' }}>
              Change Subscription
            </div>
            <div style={{ fontSize:'.68rem', color:'var(--sub)', marginTop:2 }}>{planModal.schoolName}</div>
          </div>
        </div>

        {/* ── Current plan ── */}
        <div style={{ background:'var(--bg)', border:'1px solid var(--edge)', borderRadius:8, padding:'10px 13px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:'.65rem', color:'var(--sub)' }}>Current plan</span>
          <span style={{ fontFamily:'var(--fh)', fontSize:'.75rem', fontWeight:700, color:'var(--txt)', textTransform:'capitalize' }}>
            {planModal.currentPlan}
          </span>
        </div>

        {/* ── Plan options ── */}
        <div style={{ marginBottom:18 }}>
          <div className="sb-lbl" style={{ marginBottom:8 }}>Select new plan</div>
          {Object.entries(settings?.pricing || {}).map(([plan, p]) => {
            const isCur = plan.toLowerCase() === planModal.currentPlan?.toLowerCase();
            const isSel = chosenPlan === plan;
            return (
              <div key={plan}
                className={`po${isSel ? ' sel' : ''}${isCur ? ' cur' : ''}`}
                onClick={() => !isCur && setChosenPlan(plan)}>
                <div>
                  <div style={{ fontSize:'.76rem', fontWeight:600, color:'var(--txt)' }}>{plan}</div>
                  <div style={{ fontSize:'.6rem', color:'var(--sub)', marginTop:2 }}>
                    Up to {p.limit?.toLocaleString() || 0} students
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {isCur && <span style={{ fontSize:'.6rem', color:'var(--sub)' }}>Current</span>}
                  {isSel && !isCur && <span style={{ color:'var(--sk)' }}><CheckIcon size={14} /></span>}
                  <span style={{ fontFamily:'var(--fh)', fontSize:'.72rem', color:'var(--sub)' }}>
                    KSh {p.price?.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Confirm button ── */}
        <button
          onClick={handleChangePlan}
          disabled={!chosenPlan || planSaving}
          style={{
            width:'100%', padding:12, borderRadius:9,
            background: chosenPlan ? 'linear-gradient(135deg,var(--sk),#2B7FD4)' : 'var(--dim)',
            color:       chosenPlan ? '#fff' : 'var(--sub)',
            fontFamily:'var(--fb)', fontSize:'.88rem', fontWeight:600,
            border:'none',
            cursor:   chosenPlan ? 'pointer' : 'not-allowed',
            opacity:  planSaving ? .7 : 1,
            transition:'all .25s',
          }}>
          {planSaving ? 'Updating...' : chosenPlan ? `Confirm — Switch to ${chosenPlan}` : 'Select a plan above'}
        </button>
      </div>
    </div>
  );
}
