import { fmtMoney } from '../superAdminUtils';
import Select from '../../../components/Common/Select';

export default function PaymentHistoryTab({
  allPayments,
  historyStatusFilter, setHistoryStatusFilter,
  historySchoolFilter, setHistorySchoolFilter,
}) {
  const filtered = allPayments
    .filter(p => historyStatusFilter === 'all' || p.status === historyStatusFilter)
    .filter(p => historySchoolFilter === 'all' || p.school_profiles?.school_name === historySchoolFilter);

  const schoolNames = [...new Set(allPayments.map(p => p.school_profiles?.school_name).filter(Boolean))].sort();

  return (
    <div className="tv">
      <div className="lp">
        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
          <div className="lp-t" style={{ margin:0 }}>All Payment Records ({allPayments.length})</div>
        </div>

        {/* ── Filters ── */}
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:'.6rem', color:'var(--sub)', textTransform:'uppercase', letterSpacing:'.08em' }}>Status:</span>
          {['all', 'Pending', 'Approved', 'Rejected'].map(st => (
            <button key={st} className={`fbtn${historyStatusFilter === st ? ' on' : ''}`}
              onClick={() => setHistoryStatusFilter(st)}>
              {st === 'all' ? 'All' : st}
            </button>
          ))}
          <span style={{ fontSize:'.6rem', color:'var(--sub)', textTransform:'uppercase', letterSpacing:'.08em', marginLeft:12 }}>School:</span>
          <Select 
            value={historySchoolFilter} 
            onChange={e => setHistorySchoolFilter(e.target.value)}
            options={[
              { id: 'all', label: 'All Schools' },
              ...schoolNames.map(nm => ({ id: nm, label: nm }))
            ]}
            variant="minimal"
            style={{ minWidth: 160 }}
          />
        </div>

        {/* ── Table ── */}
        {filtered.length === 0
          ? <div className="empty"><div className="empty-ico">📋</div>No payment records found.</div>
          : (
            <div className="tbl-w">
              <table className="data-table">
                <thead>
                  <tr><th>School</th><th>Amount</th><th>Code</th><th>Status</th><th>Plan</th><th>Date</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const d         = new Date(p.created_at);
                    const statusCls = p.status === 'Approved' ? 'pill pill-g' : p.status === 'Rejected' ? 'pill pill-r' : 'pill pill-y';
                    return (
                      <tr key={p.id}>
                        <td data-label="School" className="td-b">{p.school_profiles?.school_name || 'Unknown'}</td>
                        <td data-label="Amount" className="td-m" style={{ color:'var(--te)', fontWeight:700 }}>{fmtMoney(p.amount)}</td>
                        <td data-label="Code" style={{ fontSize:'.7rem', fontFamily:'var(--fh)' }}>{p.transaction_code || '—'}</td>
                        <td data-label="Status"><span className={statusCls}>{p.status}</span></td>
                        <td data-label="Plan" style={{ textTransform:'capitalize' }}>{p.school_profiles?.subscription_plan || '—'}</td>
                        <td data-label="Date">{d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</td>
                        <td data-label="Time" style={{ fontSize:'.68rem', color:'var(--sub)' }}>{d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}
