import { useRef } from 'react';
import { useChart, GC, TC, TIP, fmtDate, statusLabel, sPill, getStatusRefined } from '../superAdminUtils';
import { CheckIcon, AlertIcon, ClockIcon, SchoolIcon, GraduationIcon, RocketIcon } from '../../../components/CommonIcons';
import Select from '../../../components/Common/Select';

export default function OverviewTab({
  periodFilter, setPeriodFilter,
  showFilter, setShowFilter,
  filterStatus, setFilterStatus,
  searchQuery,
  totalSchools, activeCount, expiredCount,
  newSchoolsCount,
  newSchoolsTxt, activeChangeTxt,
  schools, recentSchools, filteredSchools, filteredActivity,
  pStats, isSchoolActive,
  growChartRef,
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
          <Select 
            value={periodFilter} 
            onChange={e => setPeriodFilter(e.target.value)}
            options={[
              { id: 'weekly', label: 'This Week' },
              { id: 'monthly', label: 'This Month' },
              { id: 'yearly', label: 'This Year' }
            ]}
            style={{ minWidth: 140 }}
          />
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
          { a:'var(--te)', c:'ni-t', l:'Active Workspaces',    i:<CheckIcon size={14} />, v:activeCount,            ch:activeChangeTxt,                                        n:'Live & running', up:activeChangeTxt.includes('↑') },
          { a:'var(--ro)', c:'ni-r', l:'Attention Required',   i:<AlertIcon size={14} />, v:expiredCount,           ch:expiredCount > 0 ? 'Follow-up needed' : 'All good',     n:'Inactive schools', up:false },
          { a:'var(--sk)', c:'ni-s', l:'Module Activations',   i:<RocketIcon size={14} />, v:pStats?.activatedModules || '—', ch:'System Wide', n:'Feature adoption', up:true },
          { a:'var(--am)', c:'ni-a', l:'System Nodes',         i:<RocketIcon size={14} />, v:pStats?.totalSchools || totalSchools, ch:'Healthy', n:'Cluster status', up:true },
          { a:'rgba(16,185,129,.5)', c:'ni-t', l:'Data Integrity', i:<CheckIcon size={14} />, v:'100%', ch:'Verified', n:'Sync status', up:true },
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

      {/* ── Performance charts ── */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="panel">
          <div className="panel-hd">
            <div>
              <div className="panel-lbl">Workspace Growth</div>
              <div className="panel-val">
                {totalSchools} <span className="cbadge cup">+{newSchoolsCount} new</span>
              </div>
            </div>
          </div>
          <div className="chart-box" style={{ height: 240 }}><canvas ref={growChartRef} /></div>
        </div>
      </div>

      {/* ── Recent schools + activity ── */}
      <div className="bot-grid">
        <div className="panel">
          <div className="panel-lbl">Recent Onboarding</div>
          {(searchQuery ? filteredSchools : recentSchools).length === 0
            ? <div className="empty">No schools registered in this period.</div>
            : (searchQuery ? filteredSchools : recentSchools).slice(0, 8).map((s, i) => {
                const p   = s.school_profiles?.[0] || {};
                const cls = ['ni-v', 'ni-t', 'ni-a', 'ni-s', 'ni-r'][i % 5];
                const active = isSchoolActive(s);
                return (
                  <div className="li" key={s.id}>
                    <div className="li-l">
                      <div className={`li-ico ${cls}`}><SchoolIcon size={14} /></div>
                      <div>
                        <div className="li-name">{s.name}</div>
                        <div className="li-sub">ID: {s.school_code || '—'} · {p.location || 'Kenya'}</div>
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
            <div className="panel-lbl">Live System Activity</div>
            {filteredActivity.length === 0
              ? <div className="empty">Monitoring live system events...</div>
              : filteredActivity.slice(0, 8).map(a => (
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

          {/* Platform Health (Supabase Monitor) */}
          <div className="panel" style={{ border: '1px solid var(--border)', background: 'rgba(16,185,129,0.02)' }}>
            <div className="panel-hd">
              <div>
                <div className="panel-lbl" style={{ color: 'var(--te)' }}>Database Health</div>
                <div className="panel-val" style={{ fontSize: '0.9rem' }}>
                  {pStats?.totalRows?.toLocaleString() || '0'} Total Records
                </div>
              </div>
              <div className="panel-per" style={{ color: (pStats?.dbCapacity > 80 ? 'var(--ro)' : 'var(--te)') }}>
                {Math.round(pStats?.dbCapacity || 0)}% CAPACITY
              </div>
            </div>
            
            <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${Math.min(pStats?.dbCapacity || 0, 100)}%`, 
                background: pStats?.dbCapacity > 80 ? 'var(--ro)' : 'var(--te)',
                transition: 'width 1s ease-in-out'
              }} />
            </div>
            
            <div style={{ fontSize: '0.58rem', color: 'var(--sub)', marginTop: 10, lineHeight: 1.5 }}>
              Infrastructure monitoring for ShuleSoft HQ.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
