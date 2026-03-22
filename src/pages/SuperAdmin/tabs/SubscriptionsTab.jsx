export default function SubscriptionsTab({
  pStats, activeCount, expiredCount, totalSchools, schools, isSchoolActive,
  subBreakRef,
}) {
  return (
    <div className="tv">
      {/* ── KPIs ── */}
      <div className="kpi-grid" style={{ marginBottom:14 }}>
        {[
          { a:'var(--te)',  c:'ni-t', l:'Active',      i:'✅',  v:pStats?.activeSchools      || activeCount,
            ch:`${totalSchools ? Math.round((pStats?.activeSchools || activeCount) / totalSchools * 100) : 0}% of total`, up:true },
          { a:'var(--sub)', c:'ni-d', l:'Deactivated', i:'🔒',  v:pStats?.deactivatedSchools || schools.filter(s => !isSchoolActive(s)).length,
            ch:'Awaiting payment', up:false },
          { a:'var(--am)',  c:'ni-a', l:'Suspended',   i:'⏸️', v:pStats?.suspendedSchools   || 0,
            ch:'Admin action', up:false },
          { a:'var(--ro)',  c:'ni-r', l:'Expired',     i:'⚠️', v:pStats?.expiredSchools     || expiredCount,
            ch:'Needs renewal', up:false },
        ].map((k, i) => (
          <div className="kpi" key={i}>
            <div className="kpi-accent" style={{ background:k.a }} />
            <div className="kpi-hd"><span className="kpi-lbl">{k.l}</span><div className={`kpi-ico ${k.c}`}>{k.i}</div></div>
            <div className="kpi-val">{k.v}</div>
            <div className="kpi-ft"><span className={`kpi-ch ${k.up ? 'kup' : 'kdn'}`}>{k.ch}</span></div>
          </div>
        ))}
      </div>

      {/* ── Breakdown chart ── */}
      <div className="cp">
        <div className="cp-hd"><div><div className="cp-lbl">Subscription Breakdown</div></div></div>
        <div className="chart-box"><canvas ref={subBreakRef} height="220" /></div>
      </div>
    </div>
  );
}
