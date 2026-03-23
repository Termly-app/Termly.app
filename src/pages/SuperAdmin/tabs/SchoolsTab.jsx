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
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-school">School</th>
                  <th className="col-plan">Plan</th>
                  <th className="col-usage">Staff Usage</th>
                  <th className="col-loc">Location</th>
                  <th className="col-stud">Students</th>
                  <th className="col-joined">Joined</th>
                  <th className="col-status">Status</th>
                  <th className="col-rev">Revenue</th>
                  <th className="col-sub">Sub</th>
                  <th className="col-act">Action</th>
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
                      <td data-label="School" className="col-school">
                        <div className="td-b">{s.name}</div>
                        {s.phone && <div className="td-sub">{s.phone}</div>}
                      </td>

                      <td data-label="Plan" className="col-plan">
                        <span className="p-pill">{curPlan}</span>
                      </td>

                      <td data-label="Staff Usage" className="col-usage">
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div className="td-m" style={{
                            color:      (s._staffCount || 0) > adminLimit ? 'var(--ro)' : 'var(--txt)',
                            fontWeight: (s._staffCount || 0) > adminLimit ? 700 : 400,
                          }}>
                            {s._staffCount || 0} / {adminLimit}
                          </div>
                          <button className="mini-btn" onClick={() => handleOpenStaffModal(s.id, s.name)}>List</button>
                        </div>
                      </td>

                      <td data-label="Location" className="col-loc">{s.location || p.location || 'Kenya'}</td>

                      <td data-label="Students" className="col-stud">
                        <div className="td-b">{s._studentCount || 0}</div>
                        <div className="td-sub">Limit: {studentLimit}</div>
                      </td>

                      <td data-label="Joined" className="col-joined">{fmtDate(p.created_at || s.created_at)}</td>

                      <td data-label="Status" className="col-status">
                        <span className={`pill ${isActive ? 'pill-g' : 'pill-r'}`}>
                          {p.subscription_status || (isActive ? 'Active' : 'Inactive')}
                        </span>
                      </td>

                      <td data-label="Revenue" className="col-rev">
                        <div className="td-m" style={{ color: isActive ? 'var(--te)' : 'var(--sub)' }}>
                          {isActive ? fmtMoney(amt) : '—'}
                        </div>
                      </td>

                      <td data-label="Sub" className="col-sub">
                        <button className="row-btn" onClick={() => { setPlanModal({ schoolId:s.id, schoolName:s.name, currentPlan:curPlan }); setChosenPlan(''); }}>
                          Change Plan
                        </button>
                      </td>

                      <td data-label="Action" className="col-act">
                        <div className="act-group">
                          <button className="act-btn g" onClick={() => { setActivateModal(s); setPayMethod('mpesa'); setPayRef(''); setActivateSuccess(false); }}>Activate</button>
                          <button className="act-btn r" onClick={() => handleRowDeleteSchool(s.id, s.name)}>Terminate</button>
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
