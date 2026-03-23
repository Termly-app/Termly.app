import { fmtDate, fmtMoney, sPill, getStatusRefined } from '../superAdminUtils';
import { SchoolIcon } from '../../../components/CommonIcons';

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
  approvedPayments,
}) {
  return (
    <div className="tv">
      <div className="panel">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div className="panel-lbl" style={{ margin:0, fontSize: '0.8rem' }}>
            ALL SCHOOLS ({filteredSchools.length}/{totalSchools})
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="act-btn g" onClick={handleBulkActivate}>Activate All</button>
            <button className="act-btn r" onClick={handleBulkDeactivate}>Deactivate All</button>
            <button className={`act-btn${showFilter ? ' active' : ''}`} onClick={() => setShowFilter(f => !f)}>
              {showFilter ? 'Close' : 'Filter'}
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
            <div className="empty-ico"><SchoolIcon size={48} /></div>
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
                  const p = s.school_profiles?.[0] || {};
                  const isActive = isSchoolActive(s);

                  const curPlan   = s.plan || p.subscription_plan || 'Fala';
                  const pricing   = settings?.pricing || {};
                  const planKey   = Object.keys(pricing).find(k => k.toLowerCase() === curPlan.toLowerCase());
                  const planInfo  = planKey ? pricing[planKey] : { price:5999, limit:5 };
                  const studentLimit = planInfo.limit || 5;
                  const adminLimit   = planInfo.admins || 5;

                  const schoolRevenue = (approvedPayments || [])
                    .filter(ap => ap.school_id === s.id)
                    .reduce((sum, ap) => sum + (ap.amount || 0), 0);

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
                          <div className="td-m" style={{ color: 'var(--txt)' }}>
                            {s._staffCount || 0} / {adminLimit}
                          </div>
                          <button className="mini-btn" onClick={() => handleOpenStaffModal(s.id, s.name)}>Details</button>
                        </div>
                      </td>

                      <td data-label="Location" className="col-loc">{s.location || p.location || 'Kenya'}</td>

                      <td data-label="Students" className="col-stud">
                        <div className="td-b" style={{ fontSize: '0.9rem' }}>{s._studentCount || 0}</div>
                        <div className="td-sub">Cap: {studentLimit}</div>
                      </td>

                      <td data-label="Joined" className="col-joined">{fmtDate(p.created_at || s.created_at)}</td>

                      <td data-label="Status" className="col-status">
                        <span className={sPill(getStatusRefined(p, isActive))}>
                          {getStatusRefined(p, isActive)}
                        </span>
                      </td>

                      <td data-label="Revenue" className="col-rev">
                        <div className="td-m" style={{ color: 'var(--txt)', opacity: schoolRevenue > 0 ? 1 : 0.4 }}>
                          {schoolRevenue > 0 ? fmtMoney(schoolRevenue) : '—'}
                        </div>
                      </td>

                      <td data-label="Sub" className="col-sub">
                        <button className="row-btn" onClick={() => { setPlanModal({ schoolId:s.id, schoolName:s.name, currentPlan:curPlan }); setChosenPlan(''); }}>
                          Change Plan
                        </button>
                      </td>

                      <td data-label="Action" className="col-act">
                        <div className="act-group">
                          {['Active', 'Trial'].includes(p.subscription_status) ? (
                            <button className="act-btn" onClick={() => handleDeactivate(s.id, s.name)}>Deactivate</button>
                          ) : (
                            <button className="act-btn g" onClick={() => { setActivateModal(s); setPayMethod('mpesa'); setPayRef(''); setActivateSuccess(false); }}>Activate</button>
                          )}
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
