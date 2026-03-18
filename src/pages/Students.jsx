import { useState, useEffect } from 'react';
import { getStudents, addStudent, updateStudent, deleteStudent, getFees, transferStudents, getClassList, getCBC, getCoreCompetencies, getPrintHeader, getSchoolProfile, TERM_FEE } from '../data/store';
import Loader from '../components/Common/Loader';
import { CBC_STRUCTURE, CBC_CORE_COMPETENCIES, getLevelForGrade } from '../data/seedData';

function getCurrentTermLabel() {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  let term, range;
  if (m <= 3)      { term = 1; range = 'Jan – Apr'; }
  else if (m <= 7) { term = 2; range = 'May – Aug'; }
  else             { term = 3; range = 'Sep – Dec'; }
  return `Term ${term}, ${y}  ·  ${range}`;
}

export default function Students({ currentUser }) {
  const [students, setStudents]       = useState([]);
  const [search, setSearch]           = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [streamFilter, setStreamFilter] = useState('All');
  const [showModal, setShowModal]     = useState(false);
  const [editingStudent, setEditingStudent]   = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [fees, setFees]     = useState({});
  const [profile, setProfile] = useState({ activeClasses: [], streamsPerClass: {}, gradeFees: {} });
  const [loading, setLoading] = useState(true);
  const [showTransitionModal, setShowTransitionModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, fData, pData] = await Promise.all([getStudents(), getFees(), getSchoolProfile()]);
      setStudents(sData); setFees(fData); setProfile(pData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, []);
  const refresh = async () => {
    try { const [s, f] = await Promise.all([getStudents(), getFees()]); setStudents(s); setFees(f); }
    catch (err) { console.error(err); }
  };

  const isAdmin   = currentUser?.role?.toLowerCase() === 'admin';
  const isTeacher = currentUser?.role?.toLowerCase() === 'teacher';

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return (
      (!q || (s.name||'').toLowerCase().includes(q) || (s.admNo||'').toLowerCase().includes(q) || (s.parentPhone||'').includes(q)) &&
      (classFilter === 'All' || s.class === classFilter) &&
      (streamFilter === 'All' || s.stream === streamFilter)
    );
  });

  const handleSave = async (st) => {
    setLoading(true);
    try {
      if (editingStudent) await updateStudent(editingStudent.id, st); else await addStudent(st);
      await refresh(); setShowModal(false); setEditingStudent(null);
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Remove this student?')) return;
    setLoading(true);
    try { await deleteStudent(id); await refresh(); setSelectedStudent(null); }
    catch (err) { alert(err.message); } finally { setLoading(false); }
  };
  const handleTransfer = async (ids, dir) => {
    setLoading(true);
    try { await transferStudents(ids, dir); await refresh(); setShowTransitionModal(false); alert(`Students ${dir === 'promote' ? 'promoted' : 'demoted'}!`); }
    catch (err) { alert(err.message); } finally { setLoading(false); }
  };
  const printClassList = async () => {
    try {
      const cls = classFilter === 'All' ? 'All Classes' : classFilter;
      const h = await getPrintHeader(`${cls} — Student List (${filtered.length})`);
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>Class List</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #e2e8f0;padding:8px 12px;font-size:13px;text-align:left}th{background:#0EA5E9;color:#fff}</style></head><body>${h}<table><thead><tr><th>#</th><th>Adm No</th><th>Name</th><th>Class</th><th>Gender</th><th>Parent</th><th>Phone</th></tr></thead><tbody>${filtered.map((s,i)=>`<tr><td>${i+1}</td><td>${s.admNo}</td><td>${s.name}</td><td>${s.class}</td><td>${s.gender}</td><td>${s.parent}</td><td>${s.parentPhone}</td></tr>`).join('')}</tbody></table></body></html>`);
      w.document.close(); w.print();
    } catch (err) { alert('Print failed: ' + err.message); }
  };

  const fmtKSh = (n) => `KSh ${Number(n||0).toLocaleString()}`;
  const getLb = (grade) => {
    const lv = getLevelForGrade(grade);
    if (lv === 'Early Years')      return { cls:'early-years',     ico:'🌱' };
    if (lv === 'Upper Primary')    return { cls:'upper-primary',   ico:'📚' };
    if (lv === 'Junior Secondary') return { cls:'junior-secondary',ico:'🎓' };
    return                                { cls:'senior-secondary',ico:'🚀' };
  };
  const initials = (n='') => n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const pal = ['#0EA5E9','#8B5CF6','#10B981','#F59E0B','#EF4444','#F97316'];
  const avBg  = (n='') => pal[n.charCodeAt(0) % pal.length];

  if (loading && students.length === 0) return <Loader />;

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>Students</h2>
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
              <span style={{fontSize:'0.875rem',color:'var(--text-light)'}}>
                {students.length} students enrolled
              </span>
              <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 11px',borderRadius:20,background:'var(--primary-light)',color:'var(--primary)',fontSize:'0.75rem',fontWeight:600}}>
                📅 {getCurrentTermLabel()}
              </span>
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button className="btn btn-ghost btn-sm" onClick={printClassList}>🖨️ Print List</button>
            {isAdmin && <button className="btn btn-ghost btn-sm" onClick={()=>setShowTransitionModal(true)}>🔄 Transitions</button>}
            {isAdmin && <button className="btn btn-primary btn-sm" onClick={()=>{setEditingStudent(null);setShowModal(true);}}>+ Add Student</button>}
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-header">
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <h3 style={{margin:0}}>All Students</h3>
            <span style={{background:'var(--primary)',color:'#fff',fontSize:'0.65rem',fontWeight:700,padding:'2px 8px',borderRadius:12}}>{filtered.length}</span>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            <div className="search-bar" style={{maxWidth:240}}>
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="Search students..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select className="form-select" style={{width:'auto'}} value={classFilter}
              onChange={e=>{setClassFilter(e.target.value);setStreamFilter('All');}}>
              <option value="All">All Classes</option>
              {Object.entries(CBC_STRUCTURE).map(([ln,ld])=>{
                const a=ld.grades.filter(g=>(profile.activeClasses||[]).includes(g));
                if(!a.length)return null;
                return <optgroup key={ln} label={ln}>{a.map(g=><option key={g} value={g}>{g}</option>)}</optgroup>;
              })}
            </select>
            <select className="form-select" style={{width:'auto'}} value={streamFilter} onChange={e=>setStreamFilter(e.target.value)}>
              <option value="All">All Streams</option>
              {(classFilter!=='All'?(profile.streamsPerClass?.[classFilter]||[]):Object.values(profile.streamsPerClass||{}).flat().filter((v,i,a)=>a.indexOf(v)===i)).map((s,i)=><option key={i} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{opacity:loading?0.6:1}}>
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Full Name</th><th>Adm No</th><th>Class</th><th>Level</th><th>Stream</th>
                <th>Parent</th><th>Phone</th>
                {!isTeacher&&<th>Fee Balance</th>}
                {isAdmin&&<th style={{textAlign:'center'}}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0?(
                <tr><td colSpan="9" style={{padding:'48px',textAlign:'center',color:'var(--text-muted)'}}>
                  <div style={{fontSize:'2rem',marginBottom:8}}>👨‍🎓</div>No students found
                </td></tr>
              ):filtered.map(s=>{
                const fd=fees[s.id]||{};
                const lb=getLb(s.class);
                return(
                  <tr key={s.id}>
                    <td data-label="Full Name">
                      <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'inherit'}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:avBg(s.name),color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.72rem',fontWeight:700,flexShrink:0}}>{initials(s.name)}</div>
                        <div style={{textAlign:'left'}}>
                          <div style={{fontWeight:600,color:'var(--primary)',cursor:'pointer'}} onClick={()=>setSelectedStudent(s)}>{s.name}</div>
                          <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{s.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Adm No"><code style={{fontSize:'0.78rem',color:'var(--text-light)'}}>{s.admNo}</code></td>
                    <td data-label="Class"><span className="badge badge-info">{s.class}</span></td>
                    <td data-label="Level"><span className={`level-badge ${lb.cls}`}>{lb.ico} {getLevelForGrade(s.class)}</span></td>
                    <td data-label="Stream">{s.stream||<span className="text-muted">—</span>}</td>
                    <td data-label="Parent">{s.parent}</td>
                    <td data-label="Phone" style={{color:'var(--text-light)',fontSize:'0.85rem'}}>{s.parentPhone}</td>
                    {!isTeacher&&(
                      <td data-label="Fee Balance">{(()=>{const b=fd.balance!==undefined?fd.balance:(profile.gradeFees?.[s.class]||TERM_FEE);return<span style={{fontWeight:700,color:b>0?'var(--danger)':'var(--success)'}}>{fmtKSh(b)}</span>;})()}</td>
                    )}
                    {isAdmin&&(
                      <td data-label="Actions" style={{textAlign:'center'}}>
                        <div style={{display:'inline-flex',gap:4}}>
                          <button className="btn btn-ghost btn-sm" onClick={()=>{setEditingStudent(s);setShowModal(true);}}>✏️</button>
                          <button className="btn btn-ghost btn-sm" onClick={()=>handleDelete(s.id)}>🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal&&<StudentModal student={editingStudent} profile={profile} onSave={handleSave} onClose={()=>{setShowModal(false);setEditingStudent(null);}}/>}
      {selectedStudent&&<StudentDetail student={selectedStudent} feeData={fees[selectedStudent.id]||{}} onClose={()=>setSelectedStudent(null)} onEdit={()=>{setSelectedStudent(null);setEditingStudent(selectedStudent);setShowModal(true);}} currentUser={currentUser} profile={profile}/>}
      {showTransitionModal&&<TransitionModal students={students} profile={profile} onTransfer={handleTransfer} onClose={()=>setShowTransitionModal(false)}/>}
    </div>
  );
}

function StudentModal({ student, profile, onSave, onClose }) {
  const ic=profile.activeClasses?.[0]||'Grade 1';
  const [form,setForm]=useState(student||{name:'',admNo:'',class:ic,stream:profile.streamsPerClass?.[ic]?.[0]||'',parent:'',parentPhone:'',gender:'Male',dob:'',joinDate:new Date().toISOString().split('T')[0],notes:''});
  const hc=(e)=>{const{name,value}=e.target;if(name==='class'){const s=profile.streamsPerClass?.[value]||[];setForm({...form,class:value,stream:s[0]||''});}else setForm({...form,[name]:value});};
  return(
    <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-header"><h3>{student?'✏️ Edit Student':'➕ Add New Student'}</h3><button className="modal-close" onClick={onClose}>×</button></div>
      <form onSubmit={e=>{e.preventDefault();onSave(form);}}>
        <div className="modal-body">
          <div className="form-group"><label>Full Name *</label><input className="form-input" name="name" value={form.name} onChange={hc} required placeholder="e.g. John Kamau"/></div>
          <div className="form-row">
            <div className="form-group"><label>Admission No</label><input className="form-input" name="admNo" value={form.admNo} onChange={hc} placeholder="Auto if blank"/></div>
            <div className="form-group"><label>Gender</label><select className="form-select" name="gender" value={form.gender} onChange={hc}><option>Male</option><option>Female</option></select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Class *</label>
              <select className="form-select" name="class" value={form.class} onChange={hc}>
                {Object.entries(CBC_STRUCTURE).map(([ln,ld])=>{const a=ld.grades.filter(g=>profile.activeClasses?.includes(g));if(!a.length)return null;return<optgroup key={ln} label={ln}>{a.map(g=><option key={g} value={g}>{g}</option>)}</optgroup>;})}
              </select>
            </div>
            <div className="form-group"><label>Stream</label><select className="form-select" name="stream" value={form.stream} onChange={hc}><option value="">General</option>{(profile.streamsPerClass?.[form.class]||[]).map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Parent / Guardian *</label><input className="form-input" name="parent" value={form.parent} onChange={hc} required/></div>
            <div className="form-group"><label>Parent Phone *</label><input className="form-input" name="parentPhone" value={form.parentPhone} onChange={hc} required/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Date of Birth</label><input className="form-input" type="date" name="dob" value={form.dob} onChange={hc}/></div>
            <div className="form-group"><label>Join Date</label><input className="form-input" type="date" name="joinDate" value={form.joinDate} onChange={hc}/></div>
          </div>
          <div className="form-group"><label>Notes</label><textarea className="form-input" name="notes" value={form.notes} onChange={hc} rows={2} style={{resize:'vertical'}}/></div>
        </div>
        <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">{student?'Save Changes':'Add Student'}</button></div>
      </form>
    </div></div>
  );
}

function StudentDetail({ student, feeData, onClose, onEdit, currentUser, profile }) {
  const [data,setData]=useState({cbc:{}});
  const [loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{try{const c=await getCBC();setData({cbc:c[student.id]||{}});}catch(e){console.error(e);}finally{setLoading(false);}})();},[student.id]);
  const isAdmin=currentUser?.role?.toLowerCase()==='admin';
  const isTeacher=currentUser?.role?.toLowerCase()==='teacher';
  const fmtKSh=(n)=>`KSh ${Number(n||0).toLocaleString()}`;
  const lv=getLevelForGrade(student.class);
  const lb=(()=>{if(lv==='Early Years')return{cls:'early-years',ico:'🌱'};if(lv==='Upper Primary')return{cls:'upper-primary',ico:'📚'};if(lv==='Junior Secondary')return{cls:'junior-secondary',ico:'🎓'};return{cls:'senior-secondary',ico:'🚀'};})();
  const cc=lv=>({'Exceeding Expectation':'#10B981','Meeting Expectation':'#3B82F6','Approaching Expectation':'#F59E0B','Below Expectation':'#EF4444'}[lv]||'#3B82F6');
  const cs=lv=>({'Exceeding Expectation':'EE','Meeting Expectation':'ME','Approaching Expectation':'AE','Below Expectation':'BE'}[lv]||'ME');
  const pal=['#0EA5E9','#8B5CF6','#10B981','#F59E0B','#EF4444'];
  const bg=pal[student.name.charCodeAt(0)%pal.length];
  const ini=student.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return(
    <div className="modal-overlay" onClick={onClose}><div className="modal" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
      <div className="modal-header"><h3>Student Profile</h3><button className="modal-close" onClick={onClose}>×</button></div>
      <div className="modal-body">
        {loading?<p className="text-muted text-center" style={{padding:20}}>Loading...</p>:<>
          <div style={{textAlign:'center',marginBottom:18}}>
            <div style={{width:60,height:60,borderRadius:'50%',background:bg,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',fontWeight:700,margin:'0 auto 10px'}}>{ini}</div>
            <h3 style={{fontSize:'1.05rem',marginBottom:6}}>{student.name}</h3>
            <div style={{display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap'}}>
              <span className="badge badge-info">{student.class} {student.stream||''}</span>
              <span className={`level-badge ${lb.cls}`}>{lb.ico} {lv}</span>
              <code style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{student.admNo}</code>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,background:'var(--bg)',borderRadius:10,padding:14,marginBottom:12,fontSize:'0.875rem'}}>
            {[{l:'Gender',v:student.gender},{l:'D.O.B',v:student.dob||'—'},{l:'Parent',v:student.parent},{l:'Phone',v:student.parentPhone},{l:'Joined',v:student.joinDate||'—'},
              ...(!isTeacher?[{l:'Fee Balance',v:(()=>{const b=feeData.balance!==undefined?feeData.balance:(profile?.gradeFees?.[student.class]||TERM_FEE);return<span style={{fontWeight:700,color:b>0?'var(--danger)':'var(--success)'}}>{fmtKSh(b)}</span>;})()}]:[]),
            ].map((r,i)=>(
              <div key={i}><div style={{fontSize:'0.68rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:2}}>{r.l}</div><div style={{fontWeight:500}}>{r.v}</div></div>
            ))}
          </div>
          {student.notes&&<div style={{padding:'9px 13px',background:'var(--warning-light)',borderRadius:8,fontSize:'0.85rem',marginBottom:12}}><span style={{color:'var(--warning)',fontWeight:600,marginRight:6}}>Note:</span>{student.notes}</div>}
          <div style={{borderTop:'1px solid var(--border)',paddingTop:12}}>
            <h4 style={{fontSize:'0.8rem',fontWeight:700,marginBottom:8}}>🎯 CBC Competencies</h4>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {Object.keys(data.cbc).length>0?Object.keys(data.cbc).map(sub=>{const lv=data.cbc[sub]||'Meeting Expectation';return(
                <div key={sub} style={{padding:'3px 8px',borderRadius:6,fontSize:'0.72rem',background:`${cc(lv)}15`,border:`1px solid ${cc(lv)}30`,display:'flex',gap:5,alignItems:'center'}}>
                  <span style={{fontWeight:500}}>{sub.length>16?sub.slice(0,14)+'..':sub}</span>
                  <span style={{color:cc(lv),fontWeight:700}}>{cs(lv)}</span>
                </div>);}):
                <span className="text-muted" style={{fontSize:'0.8rem'}}>No assessment data yet</span>}
            </div>
          </div>
        </>}
      </div>
      <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Close</button>{isAdmin&&<button className="btn btn-primary" onClick={onEdit}>✏️ Edit</button>}</div>
    </div></div>
  );
}

function TransitionModal({ students, profile, onTransfer, onClose }) {
  const [sel,setSel]=useState([]);
  const [cf,setCf]=useState('All');
  const [dir,setDir]=useState('promote');
  const grades=Object.values(CBC_STRUCTURE).flatMap(l=>l.grades);
  const filtered=students.filter(s=>cf==='All'||s.class===cf);
  const getNew=(c)=>{const i=grades.indexOf(c);return dir==='promote'?(i<grades.length-1?grades[i+1]:'Graduated'):(i>0?grades[i-1]:c);};
  const toggleAll=()=>setSel(sel.length===filtered.length?[]:filtered.map(s=>s.id));
  const toggle=(id)=>setSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  return(
    <div className="modal-overlay" onClick={onClose}><div className="modal" style={{maxWidth:760}} onClick={e=>e.stopPropagation()}>
      <div className="modal-header"><h3>🔄 Class Transitions</h3><button className="modal-close" onClick={onClose}>×</button></div>
      <div className="modal-body" style={{maxHeight:'65vh',overflowY:'auto'}}>
        <div style={{display:'flex',gap:14,marginBottom:18,background:'var(--bg)',padding:14,borderRadius:10,border:'1px solid var(--border)'}}>
          <div style={{flex:1}}>
            <label style={{display:'block',fontSize:'0.72rem',fontWeight:700,color:'var(--text-light)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Action</label>
            <div style={{display:'inline-flex',background:'var(--bg-card)',padding:3,borderRadius:8,border:'1px solid var(--border)'}}>
              <button className={`btn btn-sm ${dir==='promote'?'btn-primary':'btn-ghost'}`} onClick={()=>setDir('promote')}>↑ Promote</button>
              <button className={`btn btn-sm ${dir==='demote'?'btn-primary':'btn-ghost'}`} onClick={()=>setDir('demote')}>↓ Demote</button>
            </div>
          </div>
          <div style={{flex:1}}>
            <label style={{display:'block',fontSize:'0.72rem',fontWeight:700,color:'var(--text-light)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Filter Class</label>
            <select className="form-select" value={cf} onChange={e=>setCf(e.target.value)}>
              <option value="All">All Students</option>
              {profile.activeClasses?.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th style={{width:36}}><input type="checkbox" checked={filtered.length>0&&filtered.every(s=>sel.includes(s.id))} onChange={toggleAll}/></th><th>Student</th><th>Current</th><th>Target</th><th style={{textAlign:'right'}}>Status</th></tr></thead>
          <tbody>
            {filtered.map(s=>{const isSel=sel.includes(s.id);return(
              <tr key={s.id} style={{opacity:isSel?1:0.55}}>
                <td><input type="checkbox" checked={isSel} onChange={()=>toggle(s.id)}/></td>
                <td><strong>{s.name}</strong></td>
                <td><span className="badge">{s.class}</span></td>
                <td>{isSel?<span className={`badge ${dir==='promote'?'badge-success':'badge-warning'}`}>{getNew(s.class)}</span>:<span className="text-muted">—</span>}</td>
                <td style={{textAlign:'right'}}>{isSel&&<span style={{fontSize:'0.8rem',fontWeight:600,color:dir==='promote'?'var(--success)':'var(--warning)'}}>{dir==='promote'?'↑ Promoting':'↓ Demoting'}</span>}</td>
              </tr>);})}
          </tbody>
        </table>
      </div>
      <div className="modal-footer" style={{justifyContent:'space-between'}}>
        <span className="text-muted" style={{fontSize:'0.85rem'}}><strong>{sel.length}</strong> students selected</span>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${dir==='promote'?'btn-primary':'btn-accent'}`} disabled={!sel.length}
            onClick={()=>{if(confirm(`${dir==='promote'?'Promote':'Demote'} ${sel.length} students?`))onTransfer(sel,dir);}}>
            Confirm {dir==='promote'?'Promotions':'Demotions'}
          </button>
        </div>
      </div>
    </div></div>
  );
}
