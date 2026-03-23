import { getAllPlans, fmtMoney } from '../superAdminUtils';
import { CheckIcon, AlertIcon, ClockIcon } from '../../../components/CommonIcons';

export default function SubscriptionsTab({
  pStats, activeCount, expiredCount, totalSchools,
  schools, isSchoolActive, settings,
  subBreakRef,
}) {
  // Dynamic plan breakdown — reads from settings.pricing, never hardcoded
  const allPlans    = getAllPlans(settings);
  const activePlans = allPlans.filter(p => p.active !== false);

  // Count schools on each plan
  const planCounts = allPlans.map(plan => ({
    ...plan,
    count: schools.filter(s => {
      const sp = s.school_profiles?.[0]?.subscription_plan || s.plan || '';
      return sp.toLowerCase() === plan.id.toLowerCase();
    }).length,
  }));

  const suspendedCount = schools.filter(s => s.school_profiles?.[0]?.subscription_status === 'Suspended').length;
  const deactivatedCount = pStats?.deactivatedSchools ?? schools.filter(s => !isSchoolActive(s) && s.school_profiles?.[0]?.subscription_status !== 'Suspended' && s.school_profiles?.[0]?.subscription_status !== 'Expired').length;

  return (
    <div className="tv">
      {/* Status KPIs */}
      <div className="kpi-grid" style={{ marginBottom:14 }}>
        {[
          { a:'var(--te)',  c:'ni-t', l:'Active',      i:<CheckIcon size={14} />, v: activeCount,           ch:`${totalSchools ? Math.round((activeCount / totalSchools) * 100) : 0}% of total`, up:true  },
          { a:'var(--sub)', c:'ni-d', l:'Deactivated', i:<ClockIcon size={14} />, v: deactivatedCount,      ch:'Awaiting payment', up:false },
          { a:'var(--am)',  c:'ni-a', l:'Suspended',   i:<AlertIcon size={14} />, v: suspendedCount,        ch:'Admin action',     up:false },
          { a:'var(--ro)',  c:'ni-r', l:'Expired',     i:<AlertIcon size={14} />, v: expiredCount,          ch:'Needs renewal',    up:false },
        ].map((k, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-accent" style={{ background:k.a }} />
            <div className="kpi-hd">
              <span className="kpi-lbl">{k.l}</span>
              <div className={`kpi-ico ${k.c}`}>{k.i}</div>
            </div>
            <div className="kpi-val">{k.v}</div>
            <div className="kpi-ft"><span className={`kpi-ch ${k.up ? 'kup' : 'kdn'}`}>{k.ch}</span></div>
          </div>
        ))}
      </div>

      {/* Dynamic plan distribution */}
      {planCounts.length > 0 && (
        <div className="lp" style={{ marginBottom:14 }}>
          <div className="lp-t" style={{ marginBottom:4 }}>Plan Distribution</div>
          <div style={{ fontSize:'.66rem', color:'var(--sub)', marginBottom:14, lineHeight:1.5 }}>
            Live breakdown by subscription plan. Edit plans in Settings — changes reflect here instantly.
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {planCounts.map(plan => {
              const pct      = totalSchools > 0 ? Math.round((plan.count / totalSchools) * 100) : 0;
              const barColor = plan.color || 'var(--vi)';
              return (
                <div key={plan.id}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:barColor, flexShrink:0 }} />
                      <span style={{ fontSize:'.74rem', fontWeight:600, color:'var(--txt)' }}>{plan.id}</span>
                      {plan.active === false && (
                        <span style={{ fontSize:'.54rem', padding:'1px 6px', borderRadius:4, background:'rgba(255,255,255,.06)', color:'var(--sub)' }}>Hidden</span>
                      )}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontFamily:'var(--fh)', fontSize:'.68rem', color:'var(--sub)' }}>{fmtMoney(plan.price || 0)}/term</span>
                      <span style={{ fontFamily:'var(--fh)', fontSize:'.8rem', fontWeight:700, color:barColor }}>{plan.count}</span>
                      <span style={{ fontSize:'.62rem', color:'var(--sub)', width:30, textAlign:'right' }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height:5, borderRadius:3, background:'var(--dim)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, background:barColor, width:`${pct}%`, transition:'width .4s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:14, padding:'10px 12px', borderRadius:8, background:'var(--bg)', border:'1px solid var(--edge)', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { l:'Active Plans',   v:activePlans.length, c:'var(--te)'  },
              { l:'No Plan',        v:schools.filter(s => !s.school_profiles?.[0]?.subscription_plan && !s.plan).length, c:'var(--sub)' },
              { l:'Total Schools',  v:totalSchools, c:'#fff' },
            ].map((r, i) => (
              <div key={i}>
                <div style={{ color:'var(--sub)', marginBottom:2, fontSize:'.55rem', textTransform:'uppercase', letterSpacing:'.06em' }}>{r.l}</div>
                <div style={{ color:r.c, fontWeight:700, fontFamily:'var(--fh)', fontSize:'.82rem' }}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="cp">
        <div className="cp-hd">
          <div>
            <div className="cp-lbl">Status Breakdown</div>
            <div style={{ fontSize:'.62rem', color:'var(--sub)', marginTop:2 }}>Visual split: Active / Suspended / Deactivated / Expired</div>
          </div>
        </div>
        <div className="chart-box"><canvas ref={subBreakRef} height="220" /></div>
      </div>
    </div>
  );
}
