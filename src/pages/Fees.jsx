import { useState, useEffect } from 'react';
import { getStudents, getFees, recordPayment, getFeeSummary, getPrintHeader, getSchoolProfile, TERM_FEE, subscribeToChanges, getMpesaLogs } from '../data/store';
import Loader from '../components/Common/Loader';
import { CLASSES, CBC_STRUCTURE } from '../data/seedData';
import { 
  CardIcon, RocketIcon, UserIcon, InfoIcon, SearchIcon, CheckIcon, ReceiptIcon, PrintIcon, AlertIcon, DashboardIcon, ClockIcon
} from '../components/CommonIcons';
import { printReceipt } from '../utils/receiptPrint';
import MpesaReconciliation from './MpesaReconciliation';

function PaymentModal({ student, fee, onPay, onClose }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('M-Pesa');
  const [reference, setReference] = useState('');
  const formatKSh = (n) => `KSh ${Number(n||0).toLocaleString()}`;
  const handleSubmit = (e) => { e.preventDefault(); if(!amount||Number(amount)<=0)return; onPay(student.id,amount,method,reference); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3><CardIcon size={20} /> Record Payment</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{background:'#f8fafc',borderRadius:8,padding:16,marginBottom:20}}>
              <div className="flex-between"><span><strong>{student.name}</strong></span><span className="badge badge-info">{student.class}</span></div>
              <div className="flex-between mt-1" style={{fontSize:'0.85rem'}}><span className="text-muted">Balance:</span><span className="text-danger font-bold">{formatKSh(fee?.balance)}</span></div>
            </div>
            <div className="form-group"><label>Amount (KSh) *</label><input className="form-input" type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} required placeholder="Enter amount"/></div>
            <div className="form-row">
              <div className="form-group"><label>Method</label><select className="form-select" value={method} onChange={e=>setMethod(e.target.value)}><option>M-Pesa</option><option>Cash</option><option>Bank Transfer</option></select></div>
              <div className="form-group"><label>Reference</label><input className="form-input" value={reference} onChange={e=>setReference(e.target.value)} placeholder="e.g. MPE1234"/></div>
            </div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-success"><CheckIcon size={16} /> Record Payment</button></div>
        </form>
      </div>
    </div>
  );
}

function ReceiptModal({ receipt, onClose, profile }) {
  const formatKSh = (n) => `KSh ${Number(n||0).toLocaleString()}`;
  const handlePrint = () => {
    printReceipt({
      school: {
        name: profile?.school_name || 'ShuleSoft Academy',
        location: profile?.address || 'Nairobi, Kenya',
        phone: profile?.phone || '',
        email: profile?.email || ''
      },
      student: {
        name: receipt.studentName,
        admission_number: receipt.admNo,
        grade: receipt.studentClass
      },
      payment: {
        id: receipt.id,
        amount: receipt.amount,
        transaction_code: receipt.reference,
        created_at: receipt.date,
        method: receipt.method,
        balance: receipt.balance // Passed from parent
      }
    });
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
        <div className="modal-header"><h3><ReceiptIcon size={20} /> Receipt</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="receipt">
            <div className="receipt-header"><h2>{profile?.school_name || 'ShuleSoft Academy'}</h2><p className="text-muted" style={{fontSize:'0.82rem'}}>Payment Receipt</p></div>
            <div className="receipt-row"><span>Receipt No:</span><strong>{receipt.id}</strong></div>
            <div className="receipt-row"><span>Date:</span><strong>{receipt.date}</strong></div>
            <div className="receipt-row"><span>Student:</span><strong>{receipt.studentName}</strong></div>
            <div className="receipt-row"><span>Class:</span><strong>{receipt.studentClass}</strong></div>
            <div className="receipt-row"><span>Method:</span><strong>{receipt.method}</strong></div>
            {receipt.reference && <div className="receipt-row"><span>Ref:</span><strong>{receipt.reference}</strong></div>}
            <div className="receipt-row receipt-total"><span>Amount Paid:</span><strong style={{color:'var(--success)'}}>{formatKSh(receipt.amount)}</strong></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={handlePrint}><PrintIcon size={16} /> Print</button></div>
      </div>
    </div>
  );
}

export default function Fees({ currentPeriodId }) {
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState({});
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showPayment, setShowPayment] = useState(null);
  const [showReceipt, setShowReceipt] = useState(null);
  const [profile, setProfile] = useState({});
  const [streamFilter, setStreamFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // list or mpesa
  const [mpesaLogs, setMpesaLogs] = useState([]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        setProfile(await getSchoolProfile());
        await refresh();
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    init();

    // Subscribe to real-time changes
    const unsubFees = subscribeToChanges('fees', refresh);
    const unsubPayments = subscribeToChanges('payments', refresh);

    return () => {
      unsubFees();
      unsubPayments();
    };
  }, [currentPeriodId]);

  const refresh = async () => {
    try {
      const [sData, fData, sumData, mLogs] = await Promise.all([getStudents(), getFees(), getFeeSummary(), getMpesaLogs()]);
      setStudents(sData); setFees(fData); setSummary(sumData); setMpesaLogs(mLogs);
    } catch (err) { console.error(err); }
  };
  const formatKSh = (n) => `KSh ${Number(n||0).toLocaleString()}`;
  const filtered = students.filter(s => {
    const f = fees[s.id]||{};
    const ms = s.name.toLowerCase().includes(search.toLowerCase())||s.admNo.toLowerCase().includes(search.toLowerCase());
    const mc = classFilter==='All'||s.class===classFilter;
    const mstr = streamFilter==='All'||s.stream===streamFilter;
    let mst = true;
    if(statusFilter==='Paid') mst=(f.balance||0)<=0;
    else if(statusFilter==='Partial') mst=(f.paid||0)>0&&(f.balance||0)>0;
    else if(statusFilter==='Unpaid') mst=(f.paid||0)===0;
    return ms&&mc&&mstr&&mst;
  });
  const printFeeList = async () => {
    try {
      const list = filtered;
      const headerStr = await getPrintHeader(`Fee Report — ${classFilter} | ${streamFilter} | ${statusFilter}`);
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>Fee List - ${classFilter}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}
      table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #e2e8f0;padding:8px 12px;text-align:left;font-size:13px}
      th{background:#1e3a5f;color:white}.footer{margin-top:30px;font-size:12px;color:#64748b}
      .text-success{color:#10b981}.text-danger{color:#ef4444}.font-bold{font-weight:700}</style></head><body>
      ${headerStr}
    <table><thead><tr><th>Student</th><th>Class</th><th>Stream</th><th>Total Fee</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
    <tbody>${list.map(s => {
      const f = fees[s.id] || {totalFee:15000,paid:0,balance:15000};
      const st = f.balance<=0?'Paid':f.paid>0?'Partial':'Unpaid';
      return `<tr><td><strong>${s.name}</strong><br/>${s.admNo}</td><td>${s.class}</td><td>${s.stream||'—'}</td>
        <td>${formatKSh(f.totalFee)}</td><td class="text-success font-bold">${formatKSh(f.paid)}</td>
        <td class="${f.balance>0?'text-danger':'text-success'} font-bold">${formatKSh(f.balance)}</td>
        <td>${st}</td></tr>`;
    }).join('')}</tbody></table>
    <div class="footer">Printed on ${new Date().toLocaleDateString()}</div></body></html>`);
      w.document.close(); w.print();
    } catch(err){ alert("Print failed: " + err.message); }
  };
  const handlePayment = async (sid,amount,method,ref) => {
    setLoading(true);
    try {
      const p = await recordPayment(sid,amount,method,ref);
      const s = students.find(x=>x.id===sid);
      const fee = (await getFees())[sid] || {};
      setShowReceipt({...p,studentName:s.name,studentClass:s.class,admNo:s.admNo,balance:fee.balance});
      setShowPayment(null); 
      await refresh();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (loading && students.length === 0) return <Loader />;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.5px' }}>Fees Tracking</h2>
              <p className="text-muted">Manage fee payments and balances</p>
            </div>
            {loading && <span className="text-muted" style={{ fontSize: '0.85rem' }}>Loading...</span>}
          </div>
          <button className="btn btn-ghost" onClick={printFeeList}><PrintIcon size={16} /> Print Fee List</button>
        </div>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card green"><div className="kpi-icon green"><CardIcon size={20} /></div><div className="kpi-value">{formatKSh(summary.totalCollected)}</div><div className="kpi-label">Total Collected</div></div>
        <div className="kpi-card red"><div className="kpi-icon red"><AlertIcon size={20} /></div><div className="kpi-value">{formatKSh(summary.totalOutstanding)}</div><div className="kpi-label">Outstanding</div></div>
        <div className="kpi-card blue"><div className="kpi-icon blue"><DashboardIcon size={20} /></div><div className="kpi-value">{formatKSh(summary.totalExpected)}</div><div className="kpi-label">Expected</div></div>
        <div className="kpi-card purple"><div className="kpi-icon purple"><CheckIcon size={20} /></div><div className="kpi-value">{summary.fullyPaid||0}</div><div className="kpi-label">Fully Paid</div></div>
      </div>
      <div className="tabs-container" style={{ marginBottom: 20 }}>
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>Student Fee List</button>
        <button className={`tab-btn ${activeTab === 'mpesa' ? 'active' : ''}`} onClick={() => setActiveTab('mpesa')}>M-Pesa Transactions</button>
        {(currentUser?.role === 'Admin' || currentUser?.role === 'Finance') && (
          <button className={`tab-btn ${activeTab === 'reconcile' ? 'active' : ''}`} onClick={() => setActiveTab('reconcile')}>Manual Reconciliation</button>
        )}
      </div>

      {activeTab === 'list' ? (
        <>
          <div className="filter-bar">
            <div className="search-bar"><span className="search-icon"><SearchIcon size={16} /></span><input type="text" placeholder="Search student..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <select className="form-select" value={classFilter} onChange={e=>{setClassFilter(e.target.value); setStreamFilter('All');}}>
              <option value="All">All Classes</option>
              {Object.entries(CBC_STRUCTURE).map(([levelName, levelData]) => {
                const activeInLevel = levelData.grades.filter(g => profile.activeClasses?.includes(g));
                if (activeInLevel.length === 0) return null;
                return (
                  <optgroup key={levelName} label={levelName}>
                    {activeInLevel.map(g => <option key={g} value={g}>{g}</option>)}
                  </optgroup>
                )
              })}
            </select>
            <select className="form-select" value={streamFilter} onChange={e=>setStreamFilter(e.target.value)}>
              <option value="All">All Streams</option>
              {classFilter !== 'All' 
                ? (profile.streamsPerClass?.[classFilter] || []).map(stream => <option key={stream} value={stream}>{stream}</option>)
                : Object.values(profile.streamsPerClass || {}).flat().filter((v,i,a) => a.indexOf(v)===i).map((stream, idx) => <option key={idx} value={stream}>{stream}</option>)
              }
            </select>
            <select className="form-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="All">All Status</option><option value="Paid">Fully Paid</option><option value="Partial">Partial</option><option value="Unpaid">Unpaid</option></select>
          </div>
          <div className="card"><div className="card-body" style={{padding:0}}>
            <table className="data-table responsive-table"><thead><tr><th>Student</th><th>Class</th><th>Total Fee</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{filtered.map(s=>{
                const f=fees[s.id]||{totalFee:(profile.gradeFees?.[s.class]||TERM_FEE),paid:0,balance:(profile.gradeFees?.[s.class]||TERM_FEE)};
                const st=f.balance<=0?'Paid':f.paid>0?'Partial':'Unpaid';
                return(
                  <tr key={s.id}>
                    <td data-label="Student"><strong>{s.name}</strong><br/><span className="text-muted" style={{fontSize:'0.78rem'}}>{s.admNo}</span></td>
                    <td data-label="Class">{s.class}</td>
                    <td data-label="Total Fee">{formatKSh(f.totalFee)}</td>
                    <td data-label="Paid" className="text-success font-bold">{formatKSh(f.paid)}</td>
                    <td data-label="Balance" className={f.balance>0?'text-danger font-bold':'text-success font-bold'}>{formatKSh(f.balance)}</td>
                    <td data-label="Status"><span className={`badge ${st==='Paid'?'badge-success':st==='Partial'?'badge-warning':'badge-danger'}`}>{st}</span></td>
                    <td data-label="Action">
                      <div className="inline-flex" style={{justifyContent:'inherit'}}>
                        {f.balance>0&&<button className="btn btn-primary btn-sm" onClick={()=>setShowPayment(s)}><CardIcon size={14} /> Pay</button>}
                        {f.payments&&f.payments.length>0&&<button className="btn btn-ghost btn-sm" onClick={()=>setShowReceipt({...f.payments[f.payments.length-1],studentName:s.name,studentClass:s.class,admNo:s.admNo,balance:f.balance})}><ReceiptIcon size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}</tbody></table>
          </div></div>
        </>
      ) : activeTab === 'reconcile' ? (
        <MpesaReconciliation currentUser={currentUser} />
      ) : (
        <div className="card slide-up">
          <div className="card-header flex-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h4 style={{ margin: 0 }}>M-Pesa Callbacks (Daraja API)</h4>
            <div className="badge badge-info">{mpesaLogs.length} Transactions</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Receipt</th>
                  <th>Student/Account</th>
                  <th>Phone</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mpesaLogs.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-muted" style={{ padding: 40 }}>No automated payments received yet.</td></tr>
                ) : (
                  mpesaLogs.map(log => (
                    <tr key={log.id}>
                      <td className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td><strong>{log.mpesa_receipt_number}</strong></td>
                      <td>
                        {log.students ? (
                          <div>
                            <strong>{log.students.name}</strong><br/>
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>{log.students.adm_no} ({log.students.class})</span>
                          </div>
                        ) : (
                          <div className="text-danger flex-center" style={{ gap: 4 }}>
                            <AlertIcon size={14} /> 
                            <span>Orphan: {log.bill_ref_number}</span>
                          </div>
                        )}
                      </td>
                      <td>{log.phone_number}</td>
                      <td className="font-bold text-success">{formatKSh(log.amount)}</td>
                      <td>
                        <span className={`badge ${log.status === 'processed' ? 'badge-success' : log.status === 'orphaned' ? 'badge-danger' : 'badge-warning'}`}>
                          {log.status === 'processed' ? 'Matched' : log.status === 'orphaned' ? 'Mismatch' : log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showPayment&&<PaymentModal student={showPayment} fee={fees[showPayment.id] || {totalFee:(profile.gradeFees?.[showPayment.class]||TERM_FEE),paid:0,balance:(profile.gradeFees?.[showPayment.class]||TERM_FEE)}} onPay={handlePayment} onClose={()=>setShowPayment(null)}/>}
      {showReceipt&&<ReceiptModal receipt={showReceipt} profile={profile} onClose={()=>setShowReceipt(null)}/>}
    </div>
  );
}
