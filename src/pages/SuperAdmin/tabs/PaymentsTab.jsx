import { fmtDate, fmtMoney, planAmt } from '../superAdminUtils';
import { CardIcon, CheckIcon } from '../../../components/CommonIcons';

export default function PaymentsTab({
  filteredPayments, activeSchools, filteredSchools,
  searchQuery, totalRevenue, settings,
  handleApprove, handleReject,
  payChartRef,
}) {
  return (
    <div className="tv">
      <div className="bot-grid">
        {/* ── Pending / recent payments list ── */}
        <div className="lp">
          <div className="lp-t">
            {filteredPayments.length > 0
              ? `Pending Approvals (${filteredPayments.length})`
              : 'Recent Payments'}
          </div>

          {filteredPayments.length > 0
            ? filteredPayments.map((p, i) => {
                const cls = ['ni-t','ni-v','ni-a','ni-r','ni-s'][i % 5];
                return (
                  <div className="pay" key={p.id} style={{ flexWrap:'wrap', gap:12 }}>
                    <div className="pay-l" style={{ flex:1, minWidth:'200px' }}>
                      <div className={`li-ico ${cls}`}><CardIcon size={14} /></div>
                      <div>
                        <div className="pay-nm">{p.school_profiles?.school_name || '—'}</div>
                        <div className="pay-dt">{fmtDate(p.created_at)} · {p.transaction_code}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', minWidth:'100px' }}>
                      <div className="pay-v pos">+{fmtMoney(p.amount)}</div>
                      <div className="pay-tp">Pending · M-PESA</div>
                    </div>
                    <div style={{ display:'flex', gap:8, width:'100%', justifyContent:'flex-end' }}>
                      <button className="btn"
                        style={{ color:'#fff', borderColor:'rgba(255,255,255,.2)', background:'rgba(255,255,255,.05)' }}
                        onClick={() => handleApprove(p)}>
                        Approve
                      </button>
                      <button className="btn"
                        style={{ color:'var(--sub)', borderColor:'var(--edge2)', background:'transparent' }}
                        onClick={() => handleReject(p)}>
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })
            : activeSchools.length === 0
              ? <div className="empty"><div className="empty-ico"><CheckIcon size={24} /></div>No payments yet.</div>
              : (searchQuery ? filteredSchools.filter(s => s.school_profiles?.[0]?.subscription_status === 'Active') : activeSchools)
                  .slice(0, 6).map((s, i) => {
                    const p   = s.school_profiles?.[0] || {};
                    const cls = ['ni-t','ni-v','ni-a','ni-r','ni-s'][i % 5];
                    return (
                      <div className="pay" key={s.id}>
                        <div className="pay-l">
                          <div className={`li-ico ${cls}`}><CardIcon size={14} /></div>
                          <div>
                            <div className="pay-nm">{s.name}</div>
                            <div className="pay-dt">{fmtDate(p.created_at || s.created_at)}</div>
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div className="pay-v pos">+{fmtMoney(planAmt(p.subscription_plan, settings))}</div>
                          <div className="pay-tp" style={{ textTransform:'capitalize' }}>
                            M-PESA · {p.subscription_plan || 'Starter'}
                          </div>
                        </div>
                      </div>
                    );
                  })
          }
        </div>

        {/* ── Payment volume chart ── */}
        <div className="cp">
          <div className="cp-hd">
            <div>
              <div className="cp-lbl">Payment Volume This Year</div>
              <div className="cp-val">{fmtMoney(totalRevenue)} <span className="cbadge cup">live</span></div>
            </div>
          </div>
          <div className="chart-box"><canvas ref={payChartRef} height="200" /></div>
        </div>
      </div>
    </div>
  );
}
