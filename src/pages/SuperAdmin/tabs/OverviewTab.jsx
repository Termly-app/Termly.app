import { useRef } from 'react';
import { useChart, GC, TC, TIP, fmtDate, fmtMoney, statusLabel, sPill } from '../superAdminUtils';
import { CheckIcon, AlertIcon, ClockIcon, SchoolIcon, GraduationIcon } from '../../../components/CommonIcons';

export default function OverviewTab({
  periodFilter, setPeriodFilter,
  showFilter, setShowFilter,
  filterStatus, setFilterStatus,
  searchQuery,
  // computed values
  totalSchools, activeCount, expiredCount, totalRevenue,
  newSchoolsCount, pendingPayments,
  revChangeTxt, revChangeUp, revChange,
  newSchoolsTxt, activeChangeTxt,
  weeklyRevenue, newSchoolsCount: newSchoolsCt,
  // data
  schools, recentSchools, filteredSchools, filteredActivity,
  approvedPayments, pStats, isSchoolActive,
  // chart refs passed in from parent to survive re-renders
  revChartRef, growChartRef, subChartRef, weekChartRef,
}) {
  const now = new Date();

  return (
    <div className="tv">
      {/* ── Page header ── */}
      <div className="page-hd">
        <div className="ph-left">
          <div className="ph-ico"><SchoolIcon size={24} /></div>
          <div>
            <div className="ph-title">ShuleSoft Command Center</div>
            <div className="ph-sub">Unified Management Portal</div>
            <div className="ph-badge"><span className="sa-dot" /> System Secure & Active</div>
          </div>
        </div>
        <div className="ph-right">
          <select className="act-sel" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}>
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="yearly">This Year</option>
          </select>
          <button className={`act-btn${showFilter ? ' active' : ''}`} onClick={() => setShowFilter(f => !f)}>
            {showFilter ? 'Close' : 'Filter'}
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="filter-bar">
          <span>Status:</span>
          {['all', 'active', 'expired', 'deactivated'].map(s => (
            <button key={s} className={`fbtn${filterStatus === s ? ' on' : ''}`} onClick={() => setFilterStatus(s)}>
              {s === 'deactivated' ? 'Deact/Susp' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* ── KPI grid ── */}
      <div className="kpi-grid">
        {[
          { a:'var(--vi)', c:'ni-v', l:'Total Schools',        i:null, v:totalSchools,           ch:newSchoolsTxt,                                          n:'Across Kenya',   up:newSchoolsTxt.includes('↑') },
          { a:'var(--te)', c:'ni-t', l:'Active Subscriptions', i:<CheckIcon size={14} />, v:activeCount,            ch:activeChangeTxt,                                        n:'Paid & running', up:activeChangeTxt.includes('↑') },
          { a:'var(--ro)', c:'ni-r', l:'Expired',              i:<AlertIcon size={14} />, v:expiredCount,           ch:expiredCount > 0 ? 'Follow-up needed' : 'All good',     n:'SMS sent',       up:false },
          { a:'var(--am)', c:'ni-a', l:'Revenue This Term',    i:null, v:fmtMoney(totalRevenue), ch:revChangeTxt,                                           n:'M-PESA',         up:revChangeUp },
          { a:'var(--sk)', c:'ni-s', l:'New Schools',          i:null, v:newSchoolsCount,        ch:newSchoolsCount > 0 ? `↑ ${newSchoolsCount} registered` : 'No new schools', n:'This month', up:newSchoolsCount > 0 },
          { a:'rgba(212,80,106,.5)', c:'ni-r', l:'Pending Payments', i:<ClockIcon size={14} />, v:pendingPayments.length, ch:pendingPayments.length > 0 ? 'Awaiting confirmation' : 'All clear', n:'M-PESA queue', up:false },
        ].map((k, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-accent" style={{ background: k.a }} />
            <div className="kpi-hd">
              <span className="kpi-lbl">{k.l}</span>
              <div className={`kpi-ico ${k.c}`}>{k.i}</div>
            </div>
            <div className="kpi-val">{k.v}</div>
            <div className="kpi-ft">
              <span className={`kpi-ch ${k.up ? 'kup' : 'kdn'}`}>{k.ch}</span>
              <span className="kpi-note">{k.n}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Revenue + Growth charts ── */}
      <div className="charts-grid">
        <div className="panel">
          <div className="panel-hd">
            <div>
              <div className="panel-lbl">Revenue This Year</div>
              <div className="panel-val">
                {fmtMoney(totalRevenue)}
                {revChange !== null && (
                  <span className={`cbadge ${revChangeUp ? 'cup' : 'cdn'}`}>
                    {revChange >= 0 ? '+' : ''}{revChange}%
                  </span>
                )}
              </div>
            </div>
            <div className="panel-per">THIS YEAR ▸</div>
          </div>
          <div className="chart-box"><canvas ref={revChartRef} height="100" /></div>
        </div>
        <div className="panel">
          <div className="panel-hd">
            <div>
              <div className="panel-lbl">School Growth</div>
              <div className="panel-val">
                {totalSchools} <span className="cbadge cup">+{newSchoolsCount} new</span>
              </div>
            </div>
            <div className="panel-per">THIS YEAR ▸</div>
          </div>
          <div className="chart-box"><canvas ref={growChartRef} height="100" /></div>
        </div>
      </div>

      {/* ── Subscription mix + weekly payments ── */}
      <div className="charts-grid-3">
        <div className="panel">
          <div className="panel-hd">
            <div>
              <div className="panel-lbl">Subscription Mix</div>
              <div className="panel-val">{totalSchools} schools</div>
            </div>
          </div>
          <div className="chart-box"><canvas ref={subChartRef} height="100" /></div>
        </div>
        <div className="panel">
          <div className="panel-hd">
            <div>
              <div className="panel-lbl">Weekly Payments</div>
              <div className="panel-val">
                {fmtMoney(weeklyRevenue)}
                {weeklyRevenue > 0 && <span className="cbadge cup">this week</span>}
              </div>
            </div>
            <div className="panel-per">THIS WEEK ▸</div>
          </div>
          <div className="chart-box"><canvas ref={weekChartRef} height="100" /></div>
        </div>
      </div>

      {/* ── Recent schools + activity ── */}
      <div className="bot-grid">
        <div className="panel">
          <div className="panel-lbl">Recent Schools</div>
          {(searchQuery ? filteredSchools : recentSchools).length === 0
            ? <div className="empty">No school data available for this period.</div>
            : (searchQuery ? filteredSchools : recentSchools).slice(0, 5).map((s, i) => {
                const p   = s.school_profiles?.[0] || {};
                const cls = ['ni-v', 'ni-t', 'ni-a', 'ni-s', 'ni-r'][i % 5];
                const active = isSchoolActive(s);
                return (
                  <div className="li" key={s.id}>
                    <div className="li-l">
                      <div className={`li-ico ${cls}`}><SchoolIcon size={14} /></div>
                      <div>
                        <div className="li-name">{s.name}</div>
                        <div className="li-sub">{((p.subscription_plan || 'Starter').toLowerCase() === 'fala' ? 'Starter' : (p.subscription_plan || 'Starter'))} · {p.location || 'Kenya'}</div>
                      </div>
                    </div>
                    <div>
                      <span className={sPill(getStatusRefined(p, active))}>
                        {getStatusRefined(p, active)}
                      </span>
                      <div className="li-date">{fmtDate(p.created_at || s.created_at)}</div>
                    </div>
                  </div>
                );
              })
          }
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="panel" style={{ flex: 1 }}>
            <div className="panel-lbl">Recent Activity</div>
            {filteredActivity.length === 0
              ? <div className="empty">Monitoring live system events...</div>
              : filteredActivity.slice(0, 4).map(a => (
                  <div className="ai" key={a.id}>
                    <div className="li-ico ni-t"><CheckIcon size={12} /></div>
                    <div className="ai-body">
                      <div className="ai-t">{a.description}</div>
                      <div className="ai-s">{a.school_name || 'System'}</div>
                    </div>
                    <div className="ai-time">{fmtDate(a.created_at)}</div>
                  </div>
                ))
            }
          </div>

          {/* Student overview panel */}
          <div className="panel">
            <div className="panel-lbl"> Student Overview</div>
            {[
              { c:'ni-v', e:<GraduationIcon size={14} />, n:'Total Students',  s:'Across all active schools', v:pStats?.studCount !== undefined ? pStats.studCount.toLocaleString()  : '—', st:'' },
              { c:'ni-t', e:<CheckIcon size={14} />, n:'CBC Portfolios',  s:'Generated this term',       v:pStats?.portCount !== undefined ? pStats.portCount.toLocaleString()  : '—', st:'is-ok' },
              { c:'ni-a', e:<CheckIcon size={14} />, n:'Exams Recorded',  s:'Results entered',           v:pStats?.examCount !== undefined ? pStats.examCount.toLocaleString()  : '—', st:'is-ok' },
              { c:'ni-s', e:<CheckIcon size={14} />, n:'Attendance Rate', s:'Platform-wide average',     v:pStats?.attendanceRate ? `${pStats.attendanceRate}%`            : '85%', st:'is-ok' },
            ].map((r, i) => (
              <div className="ig" key={i}>
                <div className="ig-l">
                  <div className={`li-ico ${r.c}`}>{r.e}</div>
                  <div>
                    <div className="ig-nm">{r.n}</div>
                    <div style={{ fontSize: '.58rem', color: 'var(--sub)' }}>{r.s}</div>
                  </div>
                </div>
                <span
                  className={`ig-st${r.st ? ' ' + r.st : ''}`}
                  style={{ fontFamily: 'var(--fh)', fontSize: '.85rem', color: r.st ? undefined : '#fff' }}
                >
                  {r.v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
