import { fmtDate, fmtMoney, sPill } from '../superAdminUtils';

export default function SchoolsTab({
  filteredSchools, totalSchools, activeCount, expiredCount,
  showFilter, setShowFilter,
  filterStatus, setFilterStatus,
  searchQuery,
  schools,
  settings,
  isSchoolActive,
  expiredSchools,
  handleBulkActivate, handleBulkDeactivate,
  setActivateModal, setPayMethod, setPayRef, setActivateSuccess,
  handleDeactivate,
  handleRowDeleteSchool,
  setPlanModal, setChosenPlan,
  handleOpenStaffModal,
  onNEMISExport,          // ← new: opens NEMIS export modal for a school
}) {
  return (
    <div className="tv">
      <div className="lp">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
          <div className="lp-t" style={{ margin:0 }}>
            All Schools ({filteredSchools.length}/{totalSchools})
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="act-btn" onClick={handleBulkActivate}
              style={{ color:'var(--te)', borderColor:'rgba(13,216,138,.2)' }}>
              Activate All
            </button>
            <button className="act-btn" onClick={handleBulkDeactivate}
              style={{ color:'var(--ro)', borderColor:'rgba(212,80,106,.2)' }}>
              Deactivate All
            </button>
            <button className={`act-btn${showFilter ? ' active' : ''}`} onClick={() => setShowFilter(f => !f)}>
              {showFilter ? '✕ Close' : '⚙️ Filter'}
            </button>
          </div>
        </div>

        {showFilter && (
          <div className="filter-bar" style={{ marginBottom:12 }}>
            <span>Status:</span>
            {['all', 'active', 'expired', 'deactivated'].map(s => (
              <button key={s} className={`fbtn${filterStatus === s ? ' on' : ''}`} onClick={() => setFilterStatus(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
                {s !== 'all' && (
                  <span style={{ marginLeft:4, opacity:.7 }}>
                    ({s === 'active' ? activeCount : s === 'expired' ? expiredCount
                      : schools.filter(x => !['Active','Suspended'].includes(x.school_profiles?.[0]?.subscription_status)).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {filteredSchools.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">🏫</div>
            {searchQuery ? 'No schools match your search.' : 'No schools registered yet.'}
          </div>
        ) : (
          <div className="tbl-w">
            <table className="data-table responsive-table">
              <thead>
                <tr>
                  <th>School</th><th>Plan</th><th>Staff Usage</th><th>Location</th>
                  <th>Students</th><th>Joined</th><th>Status</th><th>Revenue</th>
                  <th>Sub</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map(s => {
                  const p         = s.school_profiles?.[0] || {};
                  const curPlan   = s.plan || p.subscription_plan || 'Fala';
                  const isActive  = isSchoolActive(s);
                  const pricing   = settings?.pricing || {};
                  const planKey   = Object.keys(pricing).find(k => k.toLowerCase() === curPlan.toLowerCase());
                  const planInfo  = planKey ? pricing[planKey] : { price:5999, limit:150 };
                  const amt          = planInfo.price || 0;
                  const studentLimit = planInfo.limit || 150;
                  const adminLimit   = planInfo.admins || 5;

                  return (
                    <tr key={s.id}>
                      <td data-label="School" className="td-b">
                        <div style={{ fontWeight:600 }}>{s.name}</div>
                        {s.phone && <div style={{ fontSize:'.65rem', color:'var(--sub)', fontWeight:400 }}>{s.phone}</div>}
                      </td>

                      <td data-label="Plan" style={{ textTransform:'capitalize' }}>
                        <span style={{
                          padding:'2px 8px', borderRadius:12,
                          background: settings?.pricing?.[curPlan] ? 'rgba(124,92,252,0.1)' : 'rgba(255,255,255,0.05)',
                          color:      settings?.pricing?.[curPlan] ? 'var(--vi)'             : 'var(--sub)',
                          fontSize:'.68rem', fontWeight:600, display:'inline-block',
                        }}>
                          {curPlan}
                        </span>
                      </td>

                      <td data-label="Staff Usage">
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div className="td-m" style={{
                            color:      (s._staffCount || 0) > adminLimit ? 'var(--ro)' : 'var(--txt)',
                            fontWeight: (s._staffCount || 0) > adminLimit ? 700 : 400,
                          }}>
                            {s._staffCount || 0} / {adminLimit}
                          </div>
                          {(s._staffCount || 0) > adminLimit && (
                            <span title="Seat limit exceeded" style={{ cursor:'help' }}>⚠️</span>
                          )}
                        </div>
                      </td>

                      <td data-label="Location">{s.location || p.location || 'Kenya'}</td>

                      <td data-label="Students" className="td-m">
                        <div style={{ fontWeight:600 }}>{s._studentCount || 0}</div>
                        <div style={{ fontSize:'.6rem', color:'var(--sub)' }}>Limit: {studentLimit}</div>
                      </td>

                      <td data-label="Joined">{fmtDate(p.created_at || s.created_at)}</td>

                      <td data-label="Status">
                        <span className={`pill ${isActive ? 'pill-g' : 'pill-r'}`}>
                          {p.subscription_status || (isActive ? 'Active' : 'Inactive')}
                        </span>
                      </td>

                      <td data-label="Revenue" className="td-m"
                        style={{ color: isActive ? 'var(--te)' : 'var(--sub)' }}>
                        {isActive ? fmtMoney(amt) : '—'}
                      </td>

                      <td data-label="Sub">
                        <button className="act-btn"
                          style={{ fontSize:'.63rem', padding:'3px 10px', color:'var(--sk)', borderColor:'rgba(74,158,232,.25)' }}
                          onClick={() => { setPlanModal({ schoolId:s.id, schoolName:s.name, currentPlan:curPlan }); setChosenPlan(''); }}>
                          Change Plan
                        </button>
                      </td>

                      <td data-label="Action">
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          <button className="act-btn"
                            style={{ fontSize:'.63rem', padding:'3px 8px', color:'var(--te)', borderColor:'rgba(13,216,138,.25)', background:'rgba(13,216,138,.05)' }}
                            onClick={() => { setActivateModal(s); setPayMethod('mpesa'); setPayRef(''); setActivateSuccess(false); }}>
                            Activate
                          </button>
                          <button className="act-btn"
                            style={{ fontSize:'.63rem', padding:'3px 8px', color:'var(--ro)', borderColor:'rgba(212,80,106,.25)', background:'rgba(212,80,106,.06)' }}
                            onClick={() => handleDeactivate(s.id, s.name)}>
                            Deactivate
                          </button>
                          <button className="act-btn"
                            style={{ fontSize:'.63rem', padding:'3px 8px', color:'var(--sub)', borderColor:'var(--edge2)', background:'rgba(255,255,255,.05)' }}
                            onClick={() => handleRowDeleteSchool(s.id, s.name)}>
                            Terminate
                          </button>
                          <button className="act-btn"
                            style={{ fontSize:'.63rem', padding:'3px 8px', color:'var(--vi)', borderColor:'rgba(124,92,252,.25)', background:'rgba(124,92,252,.05)' }}
                            onClick={() => handleOpenStaffModal(s.id, s.name)}>
                            Staff
                          </button>
                          <button className="act-btn"
                            style={{ fontSize:'.63rem', padding:'3px 8px', color:'var(--sk)', borderColor:'rgba(74,158,232,.25)', background:'rgba(74,158,232,.05)' }}
                            onClick={() => onNEMISExport && onNEMISExport(s)}>
                            🇰🇪 NEMIS
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
