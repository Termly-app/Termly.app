import { useState, useEffect, useRef } from 'react';
import { getSchoolProfile, saveSchoolProfile, importData, exportData, CBC_STRUCTURE, TERM_FEE, applyFeeStructure, getPeriods, createPeriod, setActivePeriod, testMpesaConnection, testSmsConnection, getCurrentAuthUser, supabase } from '../data/store';
import {
  ClockIcon, CheckIcon, SaveIcon, SchoolIcon, ImageIcon, FolderIcon,
  BookIcon, CardIcon, DiamondIcon, PhoneIcon, RefreshIcon, CrossIcon, PlusIcon,
  CalendarIcon, DownloadIcon, UploadIcon, ZapIcon, ShieldIcon
} from '../components/CommonIcons';

export default function Settings() {
  const [profile, setProfile] = useState({
    schoolName:'',motto:'',phone:'',email:'',address:'',
    logo:'',subscriptionPlan:'Basic',
    activeClasses:[],gradeFees:{},streamsPerClass:{},customSubjects:{},
    mpesa_config: { shortcode: '', consumer_key: '', consumer_secret: '' },
    sms_config: { sender_id: '', api_key: '' }
  });
  const [saved,setSaved]       = useState(false);
  const [loading,setLoading]   = useState(false);
  const [logoPreview,setLogoPreview] = useState('');
  const [activeLevel,setActiveLevel] = useState('Upper Primary');
  const [newSubject,setNewSubject]   = useState('');
  const [newStream,setNewStream]     = useState({});
  const [newHouse,setNewHouse]       = useState('');
  const [newExam, setNewExam]       = useState('');
  const [newGradeItem, setNewGradeItem] = useState({ symbol: '', min: 0, max: 100, color: '#3b82f6' });
  const [periods, setPeriods]     = useState([]);
  const [newPeriod, setNewPeriod] = useState({ year: new Date().getFullYear(), term: 'Term 1' });
  const [testingMpesa, setTestingMpesa] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const fileRef   = useRef(null);
  const backupRef = useRef(null);

  useEffect(()=>{
    (async()=>{
      try{
        const p=await getSchoolProfile();
        if(!p.customSubjects)  p.customSubjects={};
        if(!p.streamsPerClass) p.streamsPerClass={};
        setProfile(p); setLogoPreview(p.logo||'');
        
        const per = await getPeriods();
        setPeriods(per);

        const authUser = await getCurrentAuthUser();
        if (authUser) {
          const { data: userData } = await supabase.from('users').select('role').eq('auth_user_id', authUser.id).single();
          setIsAdmin(userData?.role === 'Admin');
        }
      }catch(e){console.error(e);}
    })();
  },[]);

  const handleSave=async(e)=>{
    if(e)e.preventDefault(); setLoading(true);
    try{await saveSchoolProfile(profile);setSaved(true);setTimeout(()=>setSaved(false),3000);}
    catch(err){alert(err.message);}finally{setLoading(false);}
  };
  const handleChange=(e)=>{const{name,value}=e.target;setProfile(p=>({...p,[name]:value}));setSaved(false);};
  const handleLogoUpload=(e)=>{
    const f=e.target.files[0];if(!f)return;
    if(f.size>512000){alert('Max 500KB');return;}
    const r=new FileReader();
    r.onload=ev=>{setLogoPreview(ev.target.result);setProfile(p=>({...p,logo:ev.target.result}));};
    r.readAsDataURL(f);
  };
  const toggleGrade=(g)=>{
    let nc=[...(profile.activeClasses||[])];
    if(nc.includes(g))nc=nc.filter(c=>c!==g);else nc.push(g);
    setProfile({...profile,activeClasses:nc});
  };
  const getLevelSubjects = (lv) => {
    if (profile.customSubjects?.[lv]) return profile.customSubjects[lv];
    const defaultSubs = CBC_STRUCTURE[lv].subjects;
    if (Array.isArray(defaultSubs)) return defaultSubs;
    // Senior Secondary - Flatten all pathways for management
    return [...new Set(Object.values(defaultSubs).flat())];
  };

  const addSubject=(lv)=>{
    if(!newSubject.trim())return;
    const cur=getLevelSubjects(lv);
    if(cur.includes(newSubject.trim()))return;
    setProfile({...profile,customSubjects:{...profile.customSubjects,[lv]:[...cur,newSubject.trim()]}});
    setNewSubject('');
  };
  const removeSubject=(lv,sub)=>{
    const cur=getLevelSubjects(lv);
    setProfile({...profile,customSubjects:{...profile.customSubjects,[lv]:cur.filter(s=>s!==sub)}});
  };
  const resetSubjects=(lv)=>{
    if(!confirm(`Reset ${lv} subjects to defaults?`))return;
    const newCustom = { ...profile.customSubjects };
    delete newCustom[lv];
    setProfile({...profile,customSubjects:newCustom});
  };
  const addStream=(grade)=>{
    const val=(newStream[grade]||'').trim();if(!val)return;
    const cur=profile.streamsPerClass?.[grade]||[];
    if(cur.includes(val))return;
    setProfile({...profile,streamsPerClass:{...profile.streamsPerClass,[grade]:[...cur,val]}});
    setNewStream({...newStream,[grade]:''});
  };
  const removeStream=(grade,stream)=>{
    const cur=profile.streamsPerClass?.[grade]||[];
    setProfile({...profile,streamsPerClass:{...profile.streamsPerClass,[grade]:cur.filter(s=>s!==stream)}});
  };
  const addHouse=()=>{
    const val=newHouse.trim();if(!val)return;
    const cur=profile.boardingHouses||[];
    if(cur.includes(val))return;
    setProfile({...profile,boardingHouses:[...cur,val]});
    setNewHouse('');setSaved(false);
  };
  const removeHouse=(house)=>{
    const cur=profile.boardingHouses||[];
    setProfile({...profile,boardingHouses:cur.filter(h=>h!==house)});setSaved(false);
  };
  const handleFeeChange=(grade,type,val)=>{
    const current = profile.gradeFees?.[grade] || {};
    const updated = typeof current === 'object' ? { ...current, [type]: Number(val) } : { day: Number(current), [type]: Number(val) };
    setProfile({...profile,gradeFees:{...profile.gradeFees,[grade]:updated}});setSaved(false);
  };
  const runFeeApplication=async()=>{
    setLoading(true);
    try{await saveSchoolProfile(profile);await applyFeeStructure();alert('Fee structure applied to students.');}
    catch(err){alert(err.message);}finally{setLoading(false);}
  };
  const addExam=()=>{
    const val=newExam.trim();if(!val)return;
    const cur=profile.customExams||['CAT 1','CAT 2','Mid Term','End Term'];
    if(cur.includes(val))return;
    setProfile({...profile,customExams:[...cur,val]});
    setNewExam('');setSaved(false);
  };
  const removeExam=(exam)=>{
    const cur=profile.customExams||[];
    setProfile({...profile,customExams:cur.filter(e=>e!==exam)});setSaved(false);
  };
  const addGradeItem=()=>{
    if(!newGradeItem.symbol) return;
    const cur = profile.gradingSystems?.[activeLevel] || profile.gradingSystems?.default || [];
    setProfile({
      ...profile,
      gradingSystems: {
        ...profile.gradingSystems,
        [activeLevel]: [...cur, { ...newGradeItem }].sort((a,b) => b.min - a.min)
      }
    });
    setNewGradeItem({ symbol: '', min: 0, max: 100, color: '#3b82f6' });setSaved(false);
  };
  const removeGradeItem=(idx)=>{
    const cur = profile.gradingSystems?.[activeLevel] || [];
    setProfile({...profile, gradingSystems: {...profile.gradingSystems, [activeLevel]: cur.filter((_,i)=>i!==idx)}});
    setSaved(false);
  };
  const resetGrading=()=>{
    if(!confirm('Reset grading to default?'))return;
    const {[activeLevel]:_, ...rest} = profile.gradingSystems;
    setProfile({...profile, gradingSystems: rest}); setSaved(false);
  };
  const handleAddPeriod = async () => {
    setLoading(true);
    try {
      await createPeriod(newPeriod.year, newPeriod.term);
      const per = await getPeriods();
      setPeriods(per);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };
  const handleSetActivePeriod = async (id) => {
    setLoading(true);
    try {
      await setActivePeriod(id);
      const per = await getPeriods();
      setPeriods(per);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleTestMpesa = async () => {
    setTestingMpesa(true);
    try {
      const res = await testMpesaConnection(profile.mpesa_config);
      alert(res.message);
    } finally { setTestingMpesa(false); }
  };

  const handleTestSms = async () => {
    setTestingSms(true);
    try {
      const res = await testSmsConnection(profile.sms_config);
      alert(res.message);
    } finally { setTestingSms(false); }
  };

  const levels=Object.keys(CBC_STRUCTURE);

  /* shared styles */
  const sectionBox={background:'var(--bg)',borderRadius:12,padding:18,border:'1px solid var(--border)'};
  const levelBtn=(lv)=>({
    padding:'6px 14px',borderRadius:8,border:'none',fontFamily:'inherit',fontSize:'0.8rem',
    fontWeight:activeLevel===lv?700:500,cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap',
    background:activeLevel===lv?'var(--bg-card)':'transparent',
    color:activeLevel===lv?'var(--primary)':'var(--text-light)',
    boxShadow:activeLevel===lv?'0 1px 5px rgba(0,0,0,0.08)':'none',
  });

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>Settings</h2>
            <p>School identity, academic structure, and system configuration</p>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <ClockIcon size={14} /> : saved ? <CheckIcon size={14} /> : <SaveIcon size={14} />}
            {loading ? ' Saving…' : saved ? ' Saved!' : ' Save Settings'}
          </button>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:24}}>

        {/* Identity & Branding */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

          {/* Identity */}
          <div className="card">
            <div className="card-header"><h3><SchoolIcon size={20} /> School Identity</h3></div>
            <div className="card-body">
              <div className="form-group"><label>School Name</label><input className="form-input" name="schoolName" value={profile.schoolName} onChange={handleChange} placeholder="e.g. Greenfield Academy"/></div>
              <div className="form-group"><label>Motto</label><input className="form-input" name="motto" value={profile.motto} onChange={handleChange} placeholder="Excellence in Education"/></div>
              <div className="form-row">
                <div className="form-group"><label>Phone</label><input className="form-input" name="phone" value={profile.phone} onChange={handleChange} placeholder="07xx xxx xxx"/></div>
                <div className="form-group"><label>Email</label><input className="form-input" name="email" value={profile.email} onChange={handleChange} placeholder="admin@school.com"/></div>
              </div>
              <div className="form-group"><label>Location</label><input className="form-input" name="address" value={profile.address} onChange={handleChange} placeholder="Nairobi, Kenya"/></div>
            </div>
          </div>

          {/* Logo */}
          <div className="card">
            <div className="card-header"><h3><ImageIcon size={20} /> Visual Identity</h3></div>
            <div className="card-body" style={{textAlign:'center'}}>
              <div
                onClick={()=>fileRef.current.click()}
                style={{width:110,height:110,borderRadius:16,margin:'0 auto 14px',background:'var(--bg)',border:'2px dashed var(--border)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',transition:'border-color 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                {logoPreview?<img src={logoPreview} alt="Logo" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:
                  <div style={{color:'var(--text-muted)',textAlign:'center'}}>
                    <div style={{fontSize:'1.8rem',marginBottom:4}}><ImageIcon size={32} /></div>
                    <div style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>Upload Logo</div>
                  </div>}
              </div>
              <input ref={fileRef} type="file" hidden onChange={handleLogoUpload} accept="image/*"/>
              <button className="btn btn-ghost btn-sm" style={{width:'100%',marginBottom:6}} onClick={()=>fileRef.current.click()}><FolderIcon size={14} /> Choose File</button>
              <p style={{fontSize:'0.72rem',color:'var(--text-muted)',margin:0}}>PNG or JPG · Max 500KB</p>
              {profile.schoolName&&(
                <div style={{marginTop:16,padding:'12px 14px',background:'var(--bg)',borderRadius:10,border:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12,textAlign:'left'}}>
                  <div style={{width:38,height:38,borderRadius:9,background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                    {logoPreview?<img src={logoPreview} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<SchoolIcon size={20} />}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'0.875rem'}}>{profile.schoolName}</div>
                    <div style={{fontSize:'0.72rem',color:'var(--text-light)',fontStyle:'italic'}}>{profile.motto||'Excellence in Education'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Academic Configuration */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>📐 Academic Configuration</h3>
              <p style={{fontSize:'0.78rem',color:'var(--text-light)',margin:'2px 0 0'}}>Classes, streams, subjects, and fee structure per level</p>
            </div>
            {/* Level tab switcher */}
            <div style={{display:'flex',gap:4,padding:'4px',background:'var(--bg)',borderRadius:10,border:'1px solid var(--border)'}}>
              {levels.map(lv=>(
                <button key={lv} onClick={()=>setActiveLevel(lv)} style={levelBtn(lv)}>{lv}</button>
              ))}
            </div>
          </div>

          <div className="card-body">
            <div style={{display:'grid',gridTemplateColumns:'190px 1fr',gap:24}}>

              {/* Active grades */}
              <div>
                <div style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text-light)',marginBottom:10}}>Active Grades</div>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {CBC_STRUCTURE[activeLevel].grades.map(grade=>{
                    const on=profile.activeClasses?.includes(grade);
                    return(
                      <label key={grade} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',borderRadius:9,cursor:'pointer',border:'1.5px solid',transition:'all 0.15s',borderColor:on?'var(--primary)':'var(--border)',background:on?'var(--primary-light)':'var(--bg)'}}>
                        <span style={{fontSize:'0.875rem',fontWeight:600,color:on?'var(--primary)':'var(--text-main)'}}>{grade}</span>
                        <input type="checkbox" checked={on} onChange={()=>toggleGrade(grade)} style={{width:15,height:15,accentColor:'var(--primary)',cursor:'pointer'}}/>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Right side */}
              <div style={{display:'flex',flexDirection:'column',gap:18}}>

                {/* Subjects */}
                <div style={sectionBox}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:'0.9rem',color:'var(--text-main)'}}>Learning Areas — {activeLevel}</div>
                      <div style={{fontSize:'0.74rem',color:'var(--text-light)',marginTop:1}}>Click × to remove a subject</div>
                    </div>
                    <button onClick={()=>resetSubjects(activeLevel)}
                      style={{padding:'5px 12px',borderRadius:7,border:'1.5px solid var(--border)',background:'var(--bg-card)',color:'var(--text-light)',fontSize:'0.78rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}>
                      <RefreshIcon size={14} /> Reset Defaults
                    </button>
                  </div>

                  {/* Subject pills — like screenshot */}
                  <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:12,minHeight:36}}>
                    {getLevelSubjects(activeLevel).map(sub=>(
                      <div key={sub} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:20,background:'var(--bg-card)',border:'1.5px solid var(--border)',fontSize:'0.85rem',fontWeight:500,color:'var(--text-main)',transition:'border-color 0.15s'}}>
                        <span>{sub}</span>
                        <button onClick={()=>removeSubject(activeLevel,sub)}
                          style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',color:'var(--danger)',fontSize:'0.9rem',fontWeight:700,lineHeight:1,width:14,height:14,justifyContent:'center'}}>×</button>
                      </div>
                    ))}
                  </div>

                  <div style={{display:'flex',gap:8}}>
                    <input className="form-input" style={{flex:1}} value={newSubject} onChange={e=>setNewSubject(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSubject(activeLevel)} placeholder={`Add to ${activeLevel}...`}/>
                    <button onClick={()=>addSubject(activeLevel)} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'var(--text-main)',color:'#fff',fontFamily:'inherit',fontSize:'0.875rem',fontWeight:700,cursor:'pointer',flexShrink:0}}>Add</button>
                  </div>
                </div>

                {/* Streams */}
                <div style={sectionBox}>
                  <div style={{fontWeight:700,fontSize:'0.9rem',color:'var(--text-main)',marginBottom:12}}>Stream Management</div>
                  {profile.activeClasses?.filter(g=>CBC_STRUCTURE[activeLevel].grades.includes(g)).length===0?(
                    <p style={{fontSize:'0.875rem',color:'var(--text-muted)',fontStyle:'italic',textAlign:'center',padding:'16px 0'}}>Select active grades on the left to manage streams.</p>
                  ):(
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      {CBC_STRUCTURE[activeLevel].grades.filter(g=>profile.activeClasses?.includes(g)).map(grade=>(
                        <div key={grade} style={{background:'var(--bg-card)',padding:12,borderRadius:10,border:'1px solid var(--border)'}}>
                          <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--primary)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>{grade} Streams</div>
                          <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8,minHeight:28}}>
                            {(profile.streamsPerClass?.[grade]||[]).map(stream=>(
                              <div key={stream} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:6,background:'var(--bg)',border:'1px solid var(--border)',fontSize:'0.8rem',fontWeight:600}}>
                                <span>{stream}</span>
                                <button onClick={()=>removeStream(grade,stream)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'0.85rem',fontWeight:700,padding:0,lineHeight:1,display:'flex',alignItems:'center'}}><CrossIcon size={12} /></button>
                              </div>
                            ))}
                            {!(profile.streamsPerClass?.[grade]||[]).length&&<span style={{fontSize:'0.75rem',color:'var(--text-muted)',fontStyle:'italic'}}>No streams yet</span>}
                          </div>
                          <div style={{display:'flex',gap:6}}>
                            <input className="form-input" style={{flex:1,fontSize:'0.82rem',padding:'6px 10px'}} value={newStream[grade]||''} onChange={e=>setNewStream({...newStream,[grade]:e.target.value})} onKeyDown={e=>e.key==='Enter'&&addStream(grade)} placeholder="New stream..."/>
                            <button onClick={()=>addStream(grade)} style={{padding:'6px 12px',borderRadius:7,border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text-main)',fontFamily:'inherit',fontSize:'0.82rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><PlusIcon size={12} /> Add</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Boarding Houses */}
                <div style={sectionBox}>
                  <div style={{fontWeight:700,fontSize:'0.9rem',color:'var(--text-main)',marginBottom:12}}>Boarding Houses</div>
                  <div style={{background:'var(--bg-card)',padding:12,borderRadius:10,border:'1px solid var(--border)'}}>
                    <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8,minHeight:28}}>
                      {(profile.boardingHouses||[]).map(house=>(
                        <div key={house} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:6,background:'var(--bg)',border:'1px solid var(--border)',fontSize:'0.82rem',fontWeight:600}}>
                          <span>{house}</span>
                          <button onClick={()=>removeHouse(house)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'0.9rem',fontWeight:700,padding:0,lineHeight:1,display:'flex',alignItems:'center'}}><CrossIcon size={12} /></button>
                        </div>
                      ))}
                      {!(profile.boardingHouses||[]).length&&<span style={{fontSize:'0.8rem',color:'var(--text-muted)',fontStyle:'italic'}}>No houses added yet</span>}
                    </div>
                    <div style={{display:'flex',gap:6,maxWidth:300}}>
                      <input className="form-input" style={{flex:1,fontSize:'0.82rem',padding:'8px 12px'}} value={newHouse} onChange={e=>setNewHouse(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addHouse()} placeholder="e.g. Red House"/>
                      <button onClick={addHouse} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'var(--text-main)',color:'#fff',fontFamily:'inherit',fontSize:'0.82rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><PlusIcon size={12} /> Add</button>
                    </div>
                  </div>
                </div>

                {/* Grading & Exams */}
                <div style={sectionBox}>
                  <div style={{fontWeight:700,fontSize:'0.9rem',color:'var(--text-main)',marginBottom:15}}><BookIcon size={20} /> Grading & Exam Types</div>
                  
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    {/* Exam Names */}
                    <div>
                      <div style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-light)',textTransform:'uppercase',marginBottom:8}}>Exam Types</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10,minHeight:36}}>
                        {(profile.customExams||['CAT 1','CAT 2','Mid Term','End Term']).map(e=>(
                          <div key={e} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:20,background:'var(--bg-card)',border:'1px solid var(--border)',fontSize:'0.82rem'}}>
                            <span>{e}</span>
                            <button onClick={()=>removeExam(e)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontWeight:700}}>×</button>
                          </div>
                        ))}
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <input className="form-input" style={{flex:1,fontSize:'0.82rem'}} value={newExam} onChange={e=>setNewExam(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addExam()} placeholder="e.g. Mock Exam"/>
                        <button onClick={addExam} className="btn btn-ghost btn-sm" style={{display:'flex',alignItems:'center',gap:4}}><PlusIcon size={14} /> Add</button>
                      </div>
                    </div>

                    {/* Grading Scale */}
                    <div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                        <div style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-light)',textTransform:'uppercase'}}>Grading Scale ({activeLevel})</div>
                        <button onClick={resetGrading} style={{fontSize:'0.65rem',background:'none',border:'none',color:'var(--primary)',cursor:'pointer',fontWeight:700,display:'flex',alignItems:'center',gap:4}}><RefreshIcon size={12} /> Reset</button>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:10,maxHeight:150,overflowY:'auto',paddingRight:5}}>
                        {(profile.gradingSystems?.[activeLevel] || profile.gradingSystems?.default || []).map((g,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',background:'var(--bg-card)',borderRadius:8,border:`1px solid ${g.color}30`,borderLeft:`4px solid ${g.color}`}}>
                            <span style={{fontWeight:800,fontSize:'0.9rem',color:g.color}}>{g.symbol}</span>
                            <span style={{fontSize:'0.75rem',color:'var(--text-light)'}}>{g.min} - {g.max}%</span>
                            <button onClick={()=>removeGradeItem(i)} style={{background:'none',border:'none',color:'var(--danger)',fontSize:'0.8rem',cursor:'pointer'}}>×</button>
                          </div>
                        ))}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'40px 1fr 1fr 30px',gap:5,alignItems:'center'}}>
                        <input className="form-input" style={{padding:'4px',fontSize:'0.75rem',textAlign:'center'}} value={newGradeItem.symbol} onChange={e=>setNewGradeItem({...newGradeItem,symbol:e.target.value.toUpperCase()})} placeholder="A"/>
                        <input className="form-input" type="number" style={{padding:'4px',fontSize:'0.75rem'}} value={newGradeItem.min} onChange={e=>setNewGradeItem({...newGradeItem,min:Number(e.target.value)})} placeholder="Min"/>
                        <input className="form-input" type="number" style={{padding:'4px',fontSize:'0.75rem'}} value={newGradeItem.max} onChange={e=>setNewGradeItem({...newGradeItem,max:Number(e.target.value)})} placeholder="Max"/>
                        <input type="color" style={{width:'100%',height:24,border:'none',background:'none',cursor:'pointer'}} value={newGradeItem.color} onChange={e=>setNewGradeItem({...newGradeItem,color:e.target.value})}/>
                        <button onClick={addGradeItem} className="btn btn-primary btn-sm" style={{gridColumn:'1 / span 4',marginTop:5}}>Add Grade Boundary</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fees */}
                <div style={sectionBox}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:'0.9rem',color:'var(--text-main)'}}><CardIcon size={20} /> Fee Structure (Per Term)</div>
                      <div style={{fontSize:'0.74rem',color:'var(--text-light)',marginTop:1}}>Tuition per grade level</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={runFeeApplication} disabled={loading}>Apply Campus-wide</button>
                  </div>
                  {profile.activeClasses?.filter(g=>CBC_STRUCTURE[activeLevel].grades.includes(g)).length===0?(
                    <p style={{fontSize:'0.875rem',color:'var(--text-muted)',fontStyle:'italic',textAlign:'center',padding:'14px 0'}}>Select active grades to configure fees.</p>
                  ):(
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
                      {CBC_STRUCTURE[activeLevel].grades.filter(g=>profile.activeClasses?.includes(g)).map(grade=>(
                        <div key={grade} style={{display:'flex',flexDirection:'column',gap:8,padding:'12px 14px',background:'var(--bg-card)',borderRadius:10,border:'1px solid var(--border)'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <span style={{fontSize:'0.875rem',fontWeight:700,color:'var(--primary)'}}>{grade}</span>
                            <span style={{fontSize:'0.65rem',color:'var(--text-light)',fontWeight:600,textTransform:'uppercase'}}>KSh / Term</span>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                            <div className="form-group" style={{margin:0}}>
                              <label style={{fontSize:'0.65rem',marginBottom:2}}>Day</label>
                              <input type="number" 
                                value={typeof profile.gradeFees?.[grade] === 'object' ? profile.gradeFees[grade].day : profile.gradeFees?.[grade] || TERM_FEE} 
                                onChange={e=>handleFeeChange(grade,'day',e.target.value)}
                                style={{width:'100%',textAlign:'right',fontWeight:700,padding:'5px 7px',border:'1.5px solid var(--border)',borderRadius:7,fontSize:'0.875rem',outline:'none',background:'var(--bg)',color:'var(--text-main)',fontFamily:'inherit'}}/>
                            </div>
                            <div className="form-group" style={{margin:0}}>
                              <label style={{fontSize:'0.65rem',marginBottom:2}}>Boarding</label>
                              <input type="number" 
                                value={typeof profile.gradeFees?.[grade] === 'object' ? (profile.gradeFees[grade].boarding || 0) : 0} 
                                onChange={e=>handleFeeChange(grade,'boarding',e.target.value)}
                                style={{width:'100%',textAlign:'right',fontWeight:700,padding:'5px 7px',border:'1.5px solid var(--border)',borderRadius:7,fontSize:'0.875rem',outline:'none',background:'var(--bg)',color:'var(--text-main)',fontFamily:'inherit'}}/>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Integrations (M-Pesa & SMS) - ONLY FOR ADMINS */}
        {isAdmin && (
          <div className="card">
            <div className="card-header">
              <div>
                <h3><ZapIcon size={20} color="var(--primary)" /> Gateway Integrations</h3>
                <p style={{fontSize:'0.78rem',color:'var(--text-light)',margin:'2px 0 0'}}>Connect your school to M-Pesa and SMS networks</p>
              </div>
            </div>
            <div className="card-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
                
                {/* M-Pesa Daraja */}
                <div style={sectionBox}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:15}}>
                    <div>
                      <div style={{fontWeight:800,fontSize:'1rem',color:'var(--text-main)'}}>M-Pesa (Daraja API)</div>
                      <div style={{fontSize:'0.75rem',color:'var(--text-light)'}}>Automate fee reconciliation & STK Pushes</div>
                    </div>
                    <div style={{padding:'4px 10px',borderRadius:20,background:'var(--primary-light)',color:'var(--primary)',fontSize:'0.65rem',fontWeight:700}}>Safaricom</div>
                  </div>

                  <div style={{background:'var(--bg-card)',padding:12,borderRadius:10,marginBottom:15,border:'1px solid var(--border)'}}>
                    <div style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-light)',textTransform:'uppercase',marginBottom:8}}>Setup Instructions</div>
                    <ol style={{fontSize:'0.75rem',color:'var(--text-main)',paddingLeft:16,lineHeight:1.6}}>
                      <li>Login to <a href="https://developer.safaricom.co.ke/" target="_blank" rel="noreferrer" style={{color:'var(--primary)',fontWeight:600}}>Daraja Portal</a></li>
                      <li>Create a "Lipan M-Pesa Paybill" app in My Apps</li>
                      <li>Copy your **Shortcode**, **Consumer Key**, and **Secret** below</li>
                    </ol>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <div className="form-group">
                      <label style={{fontSize:'0.7rem'}}>Business Shortcode / Paybill</label>
                      <input className="form-input" placeholder="e.g. 174379" value={profile.mpesa_config?.shortcode||''} 
                        onChange={e=>setProfile({...profile, mpesa_config: {...profile.mpesa_config, shortcode: e.target.value}})}/>
                    </div>
                    <div className="form-group">
                      <label style={{fontSize:'0.7rem'}}>Consumer Key</label>
                      <input className="form-input" type="password" placeholder="Daraja Consumer Key" value={profile.mpesa_config?.consumer_key||''} 
                        onChange={e=>setProfile({...profile, mpesa_config: {...profile.mpesa_config, consumer_key: e.target.value}})}/>
                    </div>
                    <div className="form-group">
                      <label style={{fontSize:'0.7rem'}}>Consumer Secret</label>
                      <input className="form-input" type="password" placeholder="Daraja Consumer Secret" value={profile.mpesa_config?.consumer_secret||''} 
                        onChange={e=>setProfile({...profile, mpesa_config: {...profile.mpesa_config, consumer_secret: e.target.value}})}/>
                    </div>
                    
                    <div style={{marginTop:12,padding:12,background:'var(--bg)',borderRadius:8,border:'1px dashed var(--border)',display:'flex',flexDirection:'column',gap:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <ShieldIcon size={18} color="var(--primary)" />
                        <p style={{fontSize:'0.68rem',color:'var(--text-light)',margin:0,fontWeight:600}}>AES-256 Encryption Active</p>
                      </div>
                      <p style={{fontSize:'0.65rem',color:'var(--text-light)',margin:0,lineHeight:1.4}}>
                        Your Consumer Key and Secret are encrypted at the database level. They are only decrypted temporarily when performing a connection test or during automated reconciliation. <strong>ShuleSoft staff cannot see your raw credentials.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Africa's Talking SMS */}
                <div style={sectionBox}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:15}}>
                    <div>
                      <div style={{fontWeight:800,fontSize:'1rem',color:'var(--text-main)'}}>SMS (Africa's Talking)</div>
                      <div style={{fontSize:'0.75rem',color:'var(--text-light)'}}>Send automated payment & attendance alerts</div>
                    </div>
                    <div style={{padding:'4px 10px',borderRadius:20,background:'#DCFCE7',color:'#166534',fontSize:'0.65rem',fontWeight:700}}>Africa's Talking</div>
                  </div>

                  <div style={{background:'var(--bg-card)',padding:12,borderRadius:10,marginBottom:15,border:'1px solid var(--border)'}}>
                    <div style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-light)',textTransform:'uppercase',marginBottom:8}}>Setup Instructions</div>
                    <ul style={{fontSize:'0.75rem',color:'var(--text-main)',paddingLeft:16,lineHeight:1.6}}>
                      <li>Create account at <a href="https://africastalking.com/" target="_blank" rel="noreferrer" style={{color:'#166534',fontWeight:600}}>Africa's Talking</a></li>
                      <li>Apply for a **Sender ID** (Alphanumeric)</li>
                      <li>Generate an **API Key** from the dashboard</li>
                    </ul>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <div className="form-group">
                      <label style={{fontSize:'0.7rem'}}>Sender ID (Optional)</label>
                      <input className="form-input" placeholder="e.g. SHULESOFT" value={profile.sms_config?.sender_id||''} 
                        onChange={e=>setProfile({...profile, sms_config: {...profile.sms_config, sender_id: e.target.value}})}/>
                    </div>
                    <div className="form-group">
                      <label style={{fontSize:'0.7rem'}}>API Key</label>
                      <input className="form-input" type="password" placeholder="Africa's Talking API Key" value={profile.sms_config?.api_key||''} 
                        onChange={e=>setProfile({...profile, sms_config: {...profile.sms_config, api_key: e.target.value}})}/>
                    </div>
                    
                    <div style={{marginTop:8,padding:12,background:'var(--bg)',borderRadius:8,border:'1px dashed var(--border)',display:'flex',flexDirection:'column',gap:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <ShieldIcon size={18} color="var(--primary)" />
                        <p style={{fontSize:'0.68rem',color:'var(--text-light)',margin:0,fontWeight:600}}>Secure API Storage</p>
                      </div>
                      <p style={{fontSize:'0.65rem',color:'var(--text-light)',margin:0,lineHeight:1.4}}>
                        Your Africa's Talking API key is stored using hardware-level encryption primitives. We use this key only to dispatch automated SMS alerts (Attendance, Fees, Exams) as configured in your communication settings.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Subscription + Data Node */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

          {/* Subscription */}
          <div style={{borderRadius:16,padding:28,background:'linear-gradient(135deg,#1e3a5f 0%,#0369a1 100%)',color:'#fff',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-35,right:-35,width:130,height:130,borderRadius:'50%',background:'rgba(255,255,255,0.07)'}}/>
            <div style={{position:'absolute',bottom:-25,left:-25,width:90,height:90,borderRadius:'50%',background:'rgba(255,255,255,0.05)'}}/>
            <div style={{position:'relative'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22}}>
                <div>
                  <div style={{fontSize:'0.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',opacity:0.65,marginBottom:7}}>Platform Subscription</div>
                  <div style={{fontSize:'1.4rem',fontWeight:900,letterSpacing:'-0.3px',marginBottom:6}}>ShuleSoft</div>
                  <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:20,background:'rgba(255,255,255,0.15)',fontSize:'0.75rem',fontWeight:700}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',display:'inline-block'}}/>
                    Active Subscription
                  </div>
                </div>
                <div style={{width:50,height:50,borderRadius:14,background:'rgba(255,255,255,0.14)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem'}}><DiamondIcon size={24} color="#fff" /></div>
              </div>
              <div style={ {background:'rgba(255,255,255,0.12)',borderRadius:12,padding:16} }>
                <div style={{fontSize:'0.62rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',opacity:0.6,marginBottom:10}}>Payment Details</div>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:42,height:42,borderRadius:'50%',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',flexShrink:0}}><PhoneIcon size={20} color="var(--primary)" /></div>
                  <div>
                    <div style={{fontSize:'1.05rem',fontWeight:800,letterSpacing:'-0.2px'}}>M-PESA: 0712260057</div>
                    <div style={{fontSize:'0.75rem',opacity:0.8,marginTop:2,fontWeight:500}}>Payee: Peter Kaulani</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Eras & Terms */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3><CalendarIcon size={20} /> Academic Eras & Terms</h3>
                <p style={{fontSize:'0.78rem',color:'var(--text-light)',margin:'2px 0 0'}}>Manage terms and set current active period</p>
              </div>
            </div>
            <div className="card-body">
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:20}}>
                {periods.map(p => (
                  <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',background:p.is_active?'var(--primary-light)':'var(--bg-card)',borderRadius:12,border:'1.5px solid',borderColor:p.is_active?'var(--primary)':'var(--border)'}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:'0.9rem',color:p.is_active?'var(--primary)':'var(--text-main)'}}>{p.year} {p.term}</div>
                      {p.is_active && <div style={{fontSize:'0.65rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--primary)',marginTop:2}}>Current Active Period</div>}
                    </div>
                    {!p.is_active && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleSetActivePeriod(p.id)} disabled={loading}>Set Active</button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{background:'var(--bg)',borderRadius:12,padding:16,border:'1px dashed var(--border)'}}>
                <div style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'var(--text-light)',marginBottom:12}}>Create New Era/Term</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,alignItems:'flex-end'}}>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label style={{fontSize:'0.65rem'}}>Year</label>
                    <select className="form-input" value={newPeriod.year} onChange={e=>setNewPeriod({...newPeriod,year:Number(e.target.value)})}>
                      {[2023,2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label style={{fontSize:'0.65rem'}}>Term</label>
                    <select className="form-input" value={newPeriod.term} onChange={e=>setNewPeriod({...newPeriod,term:e.target.value})}>
                      {['Term 1','Term 2','Term 3','Semester 1','Semester 2','Quarter 1','Quarter 2','Quarter 3','Quarter 4'].map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                      <button className="btn btn-primary" onClick={handleAddPeriod} disabled={loading} style={{height:40,display:'flex',alignItems:'center',gap:6}}><PlusIcon size={16} /> Add Period</button>
                </div>
              </div>
            </div>
          </div>

          {/* Data node */}
          <div className="card">
            <div className="card-header"><h3><SaveIcon size={20} /> System Data</h3></div>
            <div className="card-body" style={{textAlign:'center',padding:'24px 20px'}}>
              <div style={{width:58,height:58,background:'var(--primary-light)',borderRadius:15,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',margin:'0 auto 14px'}}><SaveIcon size={32} color="var(--primary)" /></div>
              <h4 style={{fontWeight:700,fontSize:'1rem',marginBottom:6}}>Local Data Backup & Sync</h4>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:15}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:navigator.onLine?'#4ade80':'#fbbf24'}}></div>
                <span style={{fontSize:'0.75rem',fontWeight:600,color:'var(--text-light)'}}>
                  {navigator.onLine ? 'Cloud Sync Engine Active' : 'Offline Mode: Local Storage active'}
                </span>
              </div>
              <p style={{color:'var(--text-light)',fontSize:'0.875rem',marginBottom:22,lineHeight:1.6,maxWidth:280,margin:'0 auto 20px'}}>
                Your data is automatically synced to the cloud via IndexedDB. Export your school's data for safekeeping, or restore from a previous backup file.
              </p>
              <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                <button className="btn btn-primary" onClick={()=>exportData()} style={{display:'flex',alignItems:'center',gap:6}}><DownloadIcon size={14} /> Export Data</button>
                <button className="btn btn-ghost" onClick={()=>backupRef.current.click()} style={{display:'flex',alignItems:'center',gap:6}}><UploadIcon size={14} /> Restore Backup</button>
              </div>
              <input ref={backupRef} type="file" hidden accept=".json" onChange={e=>{
                const file=e.target.files[0];if(!file)return;
                const r=new FileReader();
                r.onload=ev=>{
                  if(confirm('Overwrite all local data with this backup? This is irreversible.')){
                    importData(ev.target.result); window.location.reload();
                  }
                };
                r.readAsText(file);
              }}/>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
