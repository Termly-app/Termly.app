import { fmtMoney } from '../superAdminUtils';

export default function RevenueTab({
  totalRevenue, revChange, revChangeUp, revPeriod, setRevPeriod, revPeriodLabel,
  activeCount, pendingPayments, expiredCount,
  revBigRef,
}) {
  return (
    <div className="tv">
      <div className="cp">
        {/* ── Header ── */}
        <div className="cp-hd">
          <div>
            <div className="cp-lbl">Total Revenue — {revPeriodLabel}</div>
            <div className="cp-val">
              {fmtMoney(totalRevenue)}
              {revChange !== null && (
                <span className={`cbadge ${revChangeUp ? 'cup' : 'cdn'}`}>
                  {revChange >= 0 ? '+' : ''}{revChange}% YoY
                </span>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {['day', 'month', 'year'].map(p => (
              <button key={p}
                className={`act-btn${revPeriod === p ? ' active' : ''}`}
                style={{
                  fontSize:'.65rem', padding:'4px 9px',
                  background: revPeriod === p ? 'var(--panel2)' : undefined,
                  color:      revPeriod === p ? 'var(--txt)'    : undefined,
                }}
                onClick={() => setRevPeriod(p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chart ── */}
        <div className="chart-box"><canvas ref={revBigRef} height="220" /></div>

        {/* ── Legend ── */}
        <div style={{ marginTop:14, display:'flex', gap:16, flexWrap:'wrap' }}>
          {[
            { l:'Active paying schools', v:activeCount,              c:'var(--vi)' },
            { l:'Revenue this period',   v:fmtMoney(totalRevenue),   c:'var(--te)' },
            { l:'Pending payments',      v:pendingPayments.length,   c:'var(--am)' },
            { l:'Expired accounts',      v:expiredCount,             c:'var(--ro)' },
          ].map((r, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:2, background:r.c, flexShrink:0, display:'inline-block' }} />
              <span style={{ fontSize:'.62rem', color:'var(--sub)' }}>{r.l}:</span>
              <span style={{ fontSize:'.68rem', fontFamily:'var(--fh)', color:r.c, fontWeight:700 }}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
