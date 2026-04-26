import { useState, useEffect, useRef } from 'react';
import { getSchoolProfile, saveSchoolProfile, importData, exportData, TERM_FEE, applyFeeStructure, getPeriods, createPeriod, setActivePeriod, testMpesaConnection, testSmsConnection, getCurrentAuthUser, supabase, getCurrentPeriodId, subscribeToTable, getPortalAccessSettings, updatePortalAccessSettings } from '../data/store';
import { getUserRole } from '../data/authStore';
import { getExams, createExam, deleteExam, deleteAllExams, previewClassPromotion, promoteClasses, updateExam, releaseExamToParents } from '../data/academicsStore';
import { CBC_STRUCTURE } from '../data/seedData';
import Select from '../components/Common/Select';
import { Helmet } from 'react-helmet-async';
import { useDialog } from '../contexts/DialogContext';
import { useFeature } from '../contexts/FeaturesContext';
import {
  ClockIcon, CheckIcon, SaveIcon, SchoolIcon, ImageIcon, FolderIcon,
  BookIcon, CardIcon, DiamondIcon, PhoneIcon, RefreshIcon, CrossIcon, PlusIcon,
  CalendarIcon, DownloadIcon, UploadIcon, PlatformZapIcon, ShieldIcon,
  EyeIcon, EyeOffIcon, RocketIcon
} from '../components/CommonIcons';

export default function Settings() {
  const { alert, confirm } = useDialog();
  const { enabled: teacherPortalEnabled } = useFeature('teacher_portal');
  const { enabled: parentPortalEnabled } = useFeature('parent_portal');
  const [profile, setProfile] = useState({
    schoolName:'',motto:'',phone:'',email:'',address:'',
    logo:'',subscriptionPlan:'Pro',
    activeClasses:[],gradeFees:{},streamsPerClass:{},customSubjects:{},
    mpesa_config: { shortcode: '', consumer_key: '', consumer_secret: '' },
    sms_config: { sender_id: '', api_key: '' },
    custom_exams:[], timetable_label:''
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
  const [applyGradingToAll, setApplyGradingToAll] = useState(true);
  const [periods, setPeriods]     = useState([]);
  const [newPeriod, setNewPeriod] = useState({ year: new Date().getFullYear(), term: 'Term 1' });
  const [testingMpesa, setTestingMpesa] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [robustExams, setRobustExams] = useState([]);
  const [promotionPreview, setPromotionPreview] = useState(null);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionConfirmText, setPromotionConfirmText] = useState('');
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [portalSettings, setPortalSettings] = useState(null);
  const [portalSaving, setPortalSaving] = useState(false);
  const [modules, setModules] = useState([]);
  const [savingModule, setSavingModule] = useState(null);
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

        const ex = await getExams();
        const ps = await getPortalAccessSettings();
        if (ps) setPortalSettings(ps);
        setRobustExams(ex);

        // Load modules/features
        const { data: feats } = await supabase.from('school_features').select('*, features_registry(feature_name)').eq('school_id', p.id);
        setModules(feats || []);

        const authUser = await getCurrentAuthUser();
        if (authUser) {
          const userData = await getUserRole(authUser.id);
          setIsAdmin(userData?.role === 'Admin');
        }
      }catch(e){console.error(e);}
    })();
  },[]);

  useEffect(() => {
    // Realtime Exam Sync
    const unsubExams = subscribeToTable('exams', () => {
      getExams().then(setRobustExams).catch(console.error);
    });
    return () => unsubExams();
  }, []);

  const handleSave=async(e)=>{
    if(e)e.preventDefault(); setLoading(true);
    // Sanitize negative values from configuration
    const sanitizedProfile = { ...profile };
    if (sanitizedProfile.gradingSystems) {
      Object.keys(sanitizedProfile.gradingSystems).forEach(lv => {
        sanitizedProfile.gradingSystems[lv] = sanitizedProfile.gradingSystems[lv].map(g => ({
          ...g,
          min: Math.max(0, Math.min(100, g.min)),
          max: Math.max(0, Math.min(100, g.max))
        }));
      });
    }
    if (sanitizedProfile.gradeFees) {
      Object.keys(sanitizedProfile.gradeFees).forEach(g => {
        if (typeof sanitizedProfile.gradeFees[g] === 'object') {
          sanitizedProfile.gradeFees[g].day = Math.max(0, sanitizedProfile.gradeFees[g].day);
          sanitizedProfile.gradeFees[g].boarding = Math.max(0, sanitizedProfile.gradeFees[g].boarding || 0);
        } else {
          sanitizedProfile.gradeFees[g] = Math.max(0, sanitizedProfile.gradeFees[g]);
        }
      });
    }

    try{await saveSchoolProfile(sanitizedProfile);setSaved(true);setTimeout(()=>setSaved(false),3000);}
    catch(err){alert({ title: 'Save Error', message: err.message, variant: 'danger' });}finally{setLoading(false);}
  };
  const handleChange=(e)=>{const{name,value}=e.target;setProfile(p=>({...p,[name]:value}));setSaved(false);};
  const handleLogoUpload=(e)=>{
    const f=e.target.files[0];if(!f)return;
    if(f.size>512000){alert({ title: 'Upload Limit', message: 'Logo file is too large. Max size is 500KB.', variant: 'warning' });return;}
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
  const resetSubjects=async(lv)=>{
    if(!await confirm({ title: 'Reset Subjects', message: `Reset ${lv} subjects to defaults?`, variant: 'warning' }))return;
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
    try{await saveSchoolProfile(profile);await applyFeeStructure();alert({ title: 'Success', message: 'Fee structure applied to students.', variant: 'success' });}
    catch(err){alert({ title: 'Application Error', message: err.message, variant: 'danger' });}finally{setLoading(false);}
  };
  const addExam=async()=>{
    const val=newExam.trim();if(!val)return;
    const cur=robustExams.map(e => e.name);
    if(cur.includes(val))return;
    
    setLoading(true);
    try {
      const periodId = getCurrentPeriodId() || '2026';
      const status = 'draft';
      const created = await createExam(val, 'endterm', periodId, status);
      setRobustExams([...robustExams, created]);
      setNewExam('');
    } catch(err) {
      alert({ title: 'Error', message: err.message, variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };
  const removeExam=async(examName)=>{
    const exam = robustExams.find(e => e.name === examName);
    if (!exam) return;
    
    if (await confirm({ title: 'Delete Exam?', message: `Are you sure you want to delete "${examName}"? This will remove all associated marks.`, variant: 'danger' })) {
      setLoading(true);
      try {
        await deleteExam(exam.id);
        setRobustExams(robustExams.filter(e => e.id !== exam.id));
      } catch(err) {
        alert({ title: 'Error', message: err.message, variant: 'danger' });
      } finally {
        setLoading(false);
      }
    }
  };
  const handleClearAllExams = async () => {
    if (await confirm({ 
      title: 'Clear All Exams?', 
      message: 'This will permanently delete ALL exams and their marks for this school. This cannot be undone. Are you sure you want a clean slate?', 
      variant: 'danger' 
    })) {
      setLoading(true);
      try {
        await deleteAllExams();
        setRobustExams([]);
        alert({ title: 'Success', message: 'All exams have been cleared.', variant: 'success' });
      } catch(err) {
        alert({ title: 'Error', message: err.message, variant: 'danger' });
      } finally {
        setLoading(false);
      }
    }
  };
  const toggleExamStatus = async (exam) => {
    const newStatus = exam.status === 'published' ? 'draft' : 'published';
    setLoading(true);
    try {
      await updateExam(exam.id, { status: newStatus });
      setRobustExams(robustExams.map(e => e.id === exam.id ? { ...e, status: newStatus } : e));
    } catch (err) {
      alert({ title: 'Error', message: err.message, variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };
  const handleReleaseToggle = async (examId, isReleased) => {
    setLoading(true);
    try {
      await releaseExamToParents(examId, isReleased);
      setRobustExams(robustExams.map(e => e.id === examId ? { ...e, released_to_parents: isReleased } : e));
    } catch (err) {
      alert({ title: 'Error', message: err.message, variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };
  const addGradeItem=()=>{
    if(!newGradeItem.symbol) return;
    if(newGradeItem.min >= newGradeItem.max) {
      alert({ title: 'Invalid Range', message: 'Min value must be less than max value.', variant: 'warning' });
      return;
    }
    if (applyGradingToAll) {
      const newSystems = { ...profile.gradingSystems };
      Object.keys(CBC_STRUCTURE).forEach(lv => {
        const cur = newSystems[lv] || profile.gradingSystems?.default || [];
        newSystems[lv] = [...cur, { ...newGradeItem }].sort((a,b) => b.min - a.min);
      });
      setProfile({ ...profile, gradingSystems: newSystems });
    } else {
      const cur = profile.gradingSystems?.[activeLevel] || profile.gradingSystems?.default || [];
      setProfile({
        ...profile,
        gradingSystems: {
          ...profile.gradingSystems,
          [activeLevel]: [...cur, { ...newGradeItem }].sort((a,b) => b.min - a.min)
        }
      });
    }
    setNewGradeItem({ symbol: '', min: 0, max: 100, color: '#3b82f6' });setSaved(false);
  };
  const removeGradeItem=(idx)=>{
    const cur = profile.gradingSystems?.[activeLevel] || [];
    setProfile({...profile, gradingSystems: {...profile.gradingSystems, [activeLevel]: cur.filter((_,i)=>i!==idx)}});
    setSaved(false);
  };
  const resetGrading=async()=>{
    if(!await confirm({ title: 'Reset Grading', message: 'Reset grading to default?', variant: 'warning' }))return;
    const {[activeLevel]:_, ...rest} = profile.gradingSystems;
    setProfile({...profile, gradingSystems: rest}); setSaved(false);
  };
  const handleAddPeriod = async () => {
    setLoading(true);
    try {
      const existingYears = (periods || []).map(p => Number(p.year));
      const maxYear = Math.max(...existingYears, 0);

      await createPeriod(newPeriod.year, newPeriod.term);
      const per = await getPeriods();
      setPeriods(per);

      if (Number(newPeriod.year) > maxYear && maxYear > 0) {
        if (await confirm({ 
          title: 'New Academic Year', 
          message: `You've started ${newPeriod.year}. Would you like to promote students from ${maxYear} to the next grade level?`,
          variant: 'primary'
        })) {
          handlePreviewPromotion(maxYear, Number(newPeriod.year));
        }
      }
    } catch (err) { alert({ title: 'Configuration Error', message: err.message, variant: 'danger' }); }
    finally { setLoading(false); }
  };
  const handleSetActivePeriod = async (id) => {
    setLoading(true);
    try {
      await setActivePeriod(id);
      const per = await getPeriods();
      setPeriods(per);
    } catch (err) { alert({ title: 'Period Error', message: err.message, variant: 'danger' }); }
    finally { setLoading(false); }
  };

  const handleTestMpesa = async () => {
    setTestingMpesa(true);
    try {
      const res = await testMpesaConnection(profile.mpesa_config);
      alert({ title: 'Connection Test', message: res.message, variant: res.success ? 'success' : 'danger' });
    } finally { setTestingMpesa(false); }
  };

  const handleTestSms = async () => {
    setTestingSms(true);
    try {
      const res = await testSmsConnection(profile.sms_config);
      alert({ title: 'Connection Test', message: res.message, variant: res.success ? 'success' : 'danger' });
    } finally { setTestingSms(false); }
  };

  const handlePreviewPromotion = async (fYear, tYear) => {
    const fromYear = fYear || new Date().getFullYear();
    const toYear = tYear || (fromYear + 1);
    
    setPromotionLoading(true);
    try {
      const preview = await previewClassPromotion(fromYear, toYear);
      setPromotionPreview({ ...preview, fromYear, toYear });
      setShowPromotionModal(true);
      setPromotionConfirmText('');
    } catch (err) {
      alert({ title: 'Preview Error', message: err.message, variant: 'danger' });
    } finally {
      setPromotionLoading(false);
    }
  };

  const handleConfirmPromotion = async () => {
    const { fromYear, toYear } = promotionPreview;
    if (promotionConfirmText !== `PROMOTE ${fromYear}`) {
      alert({ title: 'Invalid Confirmation', message: `Please type exactly 'PROMOTE ${fromYear}'`, variant: 'warning' });
      return;
    }
    setPromotionLoading(true);
    try {
      const res = await promoteClasses(fromYear, toYear);
      setShowPromotionModal(false);
      alert({ title: 'Promotion Complete', message: `Successfully promoted ${res.promotedStreams} streams and graduated ${res.graduatedStudents} students to ${toYear}.`, variant: 'success' });
    } catch (err) {
      alert({ title: 'Promotion Error', message: err.message, variant: 'danger' });
    } finally {
      setPromotionLoading(false);
    }
  };

  const handleToggleModule = async (featureKey, currentStatus) => {
    setSavingModule(featureKey);
    try {
      const newStatus = !currentStatus;
      const feat = modules.find(m => m.feature_key === featureKey);
      await updateSchoolFeature(profile.id, featureKey, newStatus, feat?.expires_at);
      setModules(prev => prev.map(m => m.feature_key === featureKey ? { ...m, is_enabled: newStatus } : m));
      alert({ title: 'Module Updated', message: `${featureKey.charAt(0).toUpperCase() + featureKey.slice(1)} module has been ${newStatus ? 'enabled' : 'disabled'}.`, variant: 'success' });
    } catch (err) {
      alert({ title: 'Error', message: 'Failed to update module status.', variant: 'danger' });
    } finally {
      setSavingModule(null);
    }
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
      <Helmet>
        <title>School Settings & Configuration | ShuleSoft — System Admin</title>
        <meta name="description" content="Configure school identity, academic structures, grading systems, and gateway integrations." />
      </Helmet>
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
        <div className="responsive-grid-stack">

          {/* Identity */}
          <div className="card">
            <div className="card-header"><h3><SchoolIcon size={20} /> School Identity</h3></div>
            <div className="card-body">
              <div className="form-group"><label>School Name</label><input className="form-input" name="schoolName" value={profile.schoolName} onChange={handleChange} placeholder="e.g. Greenfield Academy"/></div>
              <div className="form-group"><label>School Motto</label><input className="form-input" name="motto" value={profile.motto} onChange={handleChange} placeholder="Excellence in Education"/></div>
              <div className="form-group">
                <label>School Type / Categorization</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {['Day', 'Boarding', 'Mixed'].map(type => (
                    <button 
                      key={type} 
                      type="button"
                      onClick={() => setProfile({ ...profile, schoolType: type })}
                      style={{
                        flex: 1, padding: '8px', fontSize: '0.8rem', borderRadius: 8, border: '1.5px solid',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                        borderColor: profile.schoolType === type ? 'var(--primary)' : 'var(--border)',
                        background: profile.schoolType === type ? 'var(--primary-light)' : 'var(--bg)',
                        color: profile.schoolType === type ? 'var(--primary)' : 'var(--text-light)'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
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
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:24}}>
          {/* Module Management */}
          <div className="card">
            <div className="card-header">
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{background:'var(--primary-light)',color:'var(--primary)',padding:8,borderRadius:10,display:'flex'}}>
                  <PlatformZapIcon size={20} />
                </div>
                <div>
                  <h3 style={{margin:0}}>Module Management</h3>
                  <p style={{fontSize:'0.75rem',color:'var(--text-light)',margin:0}}>Enable or disable major school features</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:14,background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--border)'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:'0.9rem'}}>Attendance Tracking</div>
                    <div style={{fontSize:'0.75rem',color:'var(--text-light)'}}>Manage daily student presence and reporting</div>
                  </div>
                  <label className="switch" style={{position:'relative',display:'inline-block',width:44,height:24}}>
                    <input 
                      type="checkbox" 
                      checked={profile.enabledModules?.attendance !== false} 
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setProfile(p => ({
                          ...p,
                          enabledModules: { ...p.enabledModules, attendance: isChecked }
                        }));
                        setSaved(false);
                      }}
                      style={{opacity:0,width:0,height:0}}
                    />
                    <span 
                      style={{
                        position:'absolute',cursor:'pointer',top:0,left:0,right:0,bottom:0,
                        backgroundColor: (profile.enabledModules?.attendance !== false) ? 'var(--primary)' : 'var(--border)',
                        transition:'.3s',borderRadius:24
                      }}
                    >
                      <span 
                        style={{
                          position:'absolute',content:'""',height:18,width:18,left: 3,bottom: 3,
                          backgroundColor:'white',transition:'.3s',borderRadius:'50%',
                          transform: (profile.enabledModules?.attendance !== false) ? 'translateX(20px)' : 'translateX(0)'
                        }}
                      />
                    </span>
                  </label>
                </div>
                
                <p style={{fontSize:'0.7rem',color:'var(--text-muted)',margin:'4px 0 0',padding:'0 4px'}}>
                  Note: Disabling a module hides its navigation and dashboard widgets but preserves existing data.
                </p>
              </div>
            </div>
          </div>
        </div>

          {/* Portal Access Settings */}
          {/* <div className="card">
            <div className="card-header">
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{background:'#f3e8ff',color:'#7c3aed',padding:8,borderRadius:10,display:'flex'}}>
                  <EyeIcon size={20} />
                </div>
                <div>
                  <h3 style={{margin:0}}>Portal Access</h3>
                  <p style={{fontSize:'0.75rem',color:'var(--text-light)',margin:0}}>Control parent and teacher portal visibility</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              {portalSettings ? (
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  {[
                    { key: 'parent_portal_enabled', label: 'Parent Portal', desc: 'Allow parents to login and view student data' },
                    { key: 'teacher_portal_enabled', label: 'Teacher Portal', desc: 'Allow teachers to login to their staff portal' },
                    { key: 'parent_can_view_fees', label: 'Fee Balances Visible', desc: 'Parents can view outstanding fee balances' },
                    { key: 'parent_can_view_results', label: 'Results Visible', desc: 'Parents can view released exam results' },
                    { key: 'parent_can_view_attendance', label: 'Attendance Visible', desc: 'Parents can view attendance records' },
                    { key: 'allow_parent_self_register', label: 'Self-Registration', desc: 'Allow parents to create their own portal accounts' },
                  ].map(item => (
                    <div key={item.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:14,background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--border)'}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:'0.9rem'}}>{item.label}</div>
                        <div style={{fontSize:'0.75rem',color:'var(--text-light)'}}>{item.desc}</div>
                      </div>
                      <label className="switch" style={{position:'relative',display:'inline-block',width:44,height:24}}>
                        <input 
                          type="checkbox" 
                          checked={portalSettings[item.key] !== false}
                          onChange={async (e) => {
                            const updated = { ...portalSettings, [item.key]: e.target.checked };
                            setPortalSettings(updated);
                            setPortalSaving(true);
                            try { await updatePortalAccessSettings(updated); }
                            catch(err) { alert({ title: 'Error', message: err.message, variant: 'danger' }); }
                            finally { setPortalSaving(false); }
                          }}
                          style={{opacity:0,width:0,height:0}}
                        />
                        <span style={{
                          position:'absolute',cursor:'pointer',top:0,left:0,right:0,bottom:0,
                          backgroundColor: portalSettings[item.key] !== false ? 'var(--primary)' : 'var(--border)',
                          transition:'.3s',borderRadius:24
                        }}>
                          <span style={{
                            position:'absolute',height:18,width:18,left:3,bottom:3,
                            backgroundColor:'white',transition:'.3s',borderRadius:'50%',
                            transform: portalSettings[item.key] !== false ? 'translateX(20px)' : 'translateX(0)'
                          }} />
                        </span>
                      </label>
                    </div>
                  ))}
                  {portalSaving && <p style={{fontSize:'0.72rem',color:'var(--primary)',fontWeight:600,textAlign:'center'}}>Saving portal settings…</p>}
                </div>
              ) : (
                <p style={{fontSize:'0.85rem',color:'var(--text-muted)',textAlign:'center',padding:20}}>Loading portal settings…</p>
              )}
            </div>
          </div> */}

        {/* Academic Configuration */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>📐 Academic Configuration</h3>
              <p style={{fontSize:'0.78rem',color:'var(--text-light)',margin:'2px 0 0'}}>Classes, streams, subjects, and fee structure per level</p>
            </div>
            {/* Level tab switcher - FIXED: Scrollable on mobile */}
            <div className="scroll-x-hide" style={{padding:'4px',background:'var(--bg)',borderRadius:10,border:'1px solid var(--border)',maxWidth:'100%'}}>
              {levels.map(lv=>(
                <button key={lv} onClick={()=>setActiveLevel(lv)} style={levelBtn(lv)}>{lv}</button>
              ))}
            </div>
          </div>

          <div className="card-body">
            <div className="settings-grid-stack">

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
                    <div className="responsive-grid-stack" style={{ gap: 12 }}>
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
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:15}}>
                    <div style={{fontWeight:700,fontSize:'0.9rem',color:'var(--text-main)'}}><BookIcon size={20} /> Grading & Exam Types</div>
                    {robustExams.length > 0 && (
                      <button onClick={handleClearAllExams} style={{fontSize:'0.65rem',background:'none',border:'none',color:'var(--danger)',cursor:'pointer',fontWeight:700,display:'flex',alignItems:'center',gap:4}} title="Remove all unconfigured exams">
                        <CrossIcon size={12} /> Clear All
                      </button>
                    )}
                  </div>
                  
                  <div className="responsive-grid-stack">
                    {/* Exam Names */}
                      <div style={{display:'flex',flexDirection:'column',gap:10}}>
                        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10,minHeight:36}}>
                          {robustExams.map(e=>(
                            <div key={e.id} style={{
                              display:'inline-flex',
                              alignItems:'center',
                              gap:10,
                              padding:'8px 16px',
                              borderRadius:24,
                              background: e.status==='published' ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'var(--bg-card)',
                              border: e.status==='published' ? '1.5px solid #22c55e' : '1.5px solid var(--border)',
                              fontSize:'0.82rem',
                              transition:'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: e.status==='published' ? '0 4px 12px rgba(34, 197, 94, 0.15)' : 'none'
                            }}>
                              <span style={{fontWeight:700, color: 'var(--text-main)'}}>{e.name}</span>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderLeft: '1.5px solid var(--border)', paddingLeft: 10 }}>
                                {teacherPortalEnabled && (
                                <button 
                                  onClick={() => toggleExamStatus(e)}
                                  style={{ 
                                    fontSize:'0.6rem', 
                                    textTransform:'uppercase', 
                                    fontWeight:900, 
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    background: e.status === 'published' ? 'var(--primary-light)' : '#f1f5f9',
                                    color: e.status === 'published' ? 'var(--primary)' : '#64748b',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {e.status === 'published' ? 'Open for Teachers' : 'Locked'}
                                </button>
                                )}
                                
                                {parentPortalEnabled && (
                                <button 
                                  onClick={() => handleReleaseToggle(e.id, !e.released_to_parents)}
                                  style={{ 
                                    fontSize:'0.65rem', 
                                    textTransform:'uppercase', 
                                    fontWeight:800, 
                                    padding: '5px 10px',
                                    borderRadius: 8,
                                    background: e.released_to_parents ? '#10b981' : '#f1f5f9',
                                    color: e.released_to_parents ? '#fff' : '#64748b',
                                    border: `1px solid ${e.released_to_parents ? '#059669' : '#e2e8f0'}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {e.released_to_parents ? <><CheckIcon size={12} /> Results Posted</> : 'Post to Parents'}
                                </button>
                                )}
                              </div>

                              <button onClick={()=>removeExam(e.name)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontWeight:700,fontSize:'1.1rem', padding: 0}} title="Delete Exam">×</button>
                            </div>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          <input className="form-input" style={{flex:1,fontSize:'0.82rem'}} value={newExam} onChange={e=>setNewExam(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addExam()} placeholder="e.g. End Term 1 2026"/>
                          <button onClick={addExam} className="btn btn-ghost btn-sm" style={{display:'flex',alignItems:'center',gap:4}}><PlusIcon size={14} /> Create Exam</button>
                        </div>

                      {/* Timetable label - WIP (module disabled)
                      <div style={{marginTop: 16}}>
                        <label style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-light)',textTransform:'uppercase',marginBottom:8,display:'block'}}>Regular Timetable Name</label>
                        <input 
                          className="form-input" 
                          style={{fontSize:'0.82rem'}} 
                          name="timetable_label"
                          value={profile.timetable_label} 
                          onChange={handleChange} 
                          placeholder="e.g. Weekly, Regular, Core Schedule"
                        />
                        <p style={{fontSize:'0.65rem',color:'var(--text-muted)',marginTop:4}}>This label appears on the main scheduling button.</p>
                      </div>
                      */}
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
                      <div style={{display:'grid',gridTemplateColumns:'65px 1fr 1fr 40px',gap:8,alignItems:'end'}}>
                        <div style={{display:'flex',flexDirection:'column',gap:4}}>
                          <label style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text-muted)'}}>GRADE</label>
                          <input className="form-input" style={{padding:'6px',fontSize:'0.82rem',textAlign:'center',height:32}} value={newGradeItem.symbol} onChange={e=>setNewGradeItem({...newGradeItem,symbol:e.target.value.toUpperCase()})} placeholder="A-"/>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:4}}>
                          <label style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text-muted)'}}>MIN %</label>
                          <input type="number" className="form-input" style={{padding:'6px',fontSize:'0.82rem',textAlign:'center',height:32}}
                            value={newGradeItem.min} 
                            onChange={e=>setNewGradeItem({...newGradeItem,min:Number(e.target.value)})}
                            min="0" max="100"
                          />
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:4}}>
                          <label style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text-muted)'}}>MAX %</label>
                          <input type="number" className="form-input" style={{padding:'6px',fontSize:'0.82rem',textAlign:'center',height:32}}
                            value={newGradeItem.max} 
                            onChange={e=>setNewGradeItem({...newGradeItem,max:Number(e.target.value)})}
                            min="0" max="100"
                          />
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:4}}>
                          <label style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text-muted)'}}>COLOR</label>
                          <input type="color" style={{width:'100%',height:32,border:'1.5px solid var(--border)',borderRadius:8,background:'none',cursor:'pointer',padding:0}} value={newGradeItem.color} onChange={e=>setNewGradeItem({...newGradeItem,color:e.target.value})}/>
                        </div>
                        <div style={{gridColumn:'1 / span 4', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10}}>
                          <label style={{display:'flex', alignItems:'center', gap:8, fontSize:'0.75rem', cursor:'pointer', fontWeight:600, color:'var(--text-main)'}}>
                            <input type="checkbox" checked={applyGradingToAll} onChange={e => setApplyGradingToAll(e.target.checked)} style={{accentColor:'var(--primary)', width:16, height:16, cursor:'pointer'}} />
                            Apply boundary to all school categories
                          </label>
                          <button onClick={addGradeItem} className="btn btn-primary btn-sm" style={{height:36,fontWeight:700}}>
                            <PlusIcon size={16} /> Add Selected
                          </button>
                        </div>
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

        {/* Integrations (M-Pesa & SMS) - WIP, ENTIRE CARD DISABLED
        {isAdmin && (
          <div className="card">
            <div className="card-header">
              <div>
                <h3><PlatformZapIcon size={20} color="var(--primary)" /> Gateway Integrations</h3>
                <p style={{fontSize:'0.78rem',color:'var(--text-light)',margin:'2px 0 0'}}>Connect your school to M-Pesa and SMS networks</p>
              </div>
            </div>
            <div className="card-body">
              <div className="responsive-grid-stack">
                
                M-Pesa Daraja WIP 
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
                      <div style={{ position: 'relative' }}>
                        <input className="form-input" 
                          type={showMpesaKey ? "text" : "password"} 
                          placeholder="Daraja Consumer Key" 
                          value={profile.mpesa_config?.consumer_key||''} 
                          onChange={e=>setProfile({...profile, mpesa_config: {...profile.mpesa_config, consumer_key: e.target.value}})}
                          style={{ paddingRight: '40px' }}
                        />
                        <button type="button" onClick={() => setShowMpesaKey(!showMpesaKey)} style={{ position: 'absolute', right: 10, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
                          {showMpesaKey ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label style={{fontSize:'0.7rem'}}>Consumer Secret</label>
                      <div style={{ position: 'relative' }}>
                        <input className="form-input" 
                          type={showMpesaSec ? "text" : "password"} 
                          placeholder="Daraja Consumer Secret" 
                          value={profile.mpesa_config?.consumer_secret||''} 
                          onChange={e=>setProfile({...profile, mpesa_config: {...profile.mpesa_config, consumer_secret: e.target.value}})}
                          style={{ paddingRight: '40px' }}
                        />
                        <button type="button" onClick={() => setShowMpesaSec(!showMpesaSec)} style={{ position: 'absolute', right: 10, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
                          {showMpesaSec ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                        </button>
                      </div>
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

                Africa's Talking SMS WIP
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
                      <div style={{ position: 'relative' }}>
                        <input className="form-input" 
                          type={showSmsKey ? "text" : "password"} 
                          placeholder="Africa's Talking API Key" 
                          value={profile.sms_config?.api_key||''} 
                          onChange={e=>setProfile({...profile, sms_config: {...profile.sms_config, api_key: e.target.value}})}
                          style={{ paddingRight: '40px' }}
                        />
                        <button type="button" onClick={() => setShowSmsKey(!showSmsKey)} style={{ position: 'absolute', right: 10, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
                          {showSmsKey ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                        </button>
                      </div>
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
        )} */}

        {/* Module Management */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3><PlatformZapIcon size={20} /> Module Management</h3>
              <p style={{fontSize:'0.78rem',color:'var(--text-light)',margin:'2px 0 0'}}>Enable or disable system features for your school.</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {modules.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-light)', gridColumn: '1 / -1' }}>
                  No optional modules currently available for your school. Contact support to activate features.
                </div>
              ) : modules.map(m => {
                const isSaving = savingModule === m.feature_key;
                return (
                  <div key={m.feature_key} style={{ 
                    padding: 16, borderRadius: 12, border: '1px solid var(--border)', 
                    background: m.is_enabled ? 'var(--bg-card)' : 'transparent',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {m.features_registry?.feature_name || m.feature_key}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: 2 }}>
                        {m.is_enabled ? 'Active' : 'Disabled'}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggleModule(m.feature_key, m.is_enabled)}
                      disabled={isSaving}
                      className={`btn btn-sm ${m.is_enabled ? 'btn-ghost' : 'btn-primary'}`}
                      style={{ minWidth: 80 }}
                    >
                      {isSaving ? '...' : m.is_enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                );
              })}
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
                    <Select 
                      value={newPeriod.year} 
                      onChange={e=>setNewPeriod({...newPeriod,year:Number(e.target.value)})}
                      options={[2023,2024,2025,2026,2027].map(y=>({ id: y, label: String(y) }))}
                      style={{ width: '100%', minWidth: 100 }}
                    />
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label style={{fontSize:'0.65rem'}}>Term</label>
                    <Select 
                      value={newPeriod.term} 
                      onChange={e=>setNewPeriod({...newPeriod,term:e.target.value})}
                      options={['Term 1','Term 2','Term 3','Semester 1','Semester 2','Quarter 1','Quarter 2','Quarter 3','Quarter 4'].map(t=>({ id: t, label: t }))}
                      style={{ width: '100%', minWidth: 140 }}
                    />
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
                r.onload=async(ev)=>{
                  if(await confirm({ title: 'Confirm Restore', message: 'Overwrite all local data with this backup? This is irreversible.', variant: 'danger' })){
                    importData(ev.target.result); window.location.reload();
                  }
                };
                r.readAsText(file);
              }}/>
            </div>
          </div>

        {/* Academic Year Promotion */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3><RocketIcon size={20} /> Academic Year Promotion</h3>
              <p style={{fontSize:'0.78rem',color:'var(--text-light)',margin:'2px 0 0'}}>Advance all active streams to the next class and carry forward teachers.</p>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => handlePreviewPromotion()} 
              disabled={promotionLoading}
            >
              {promotionLoading ? 'Loading Preview...' : 'Preview Promotion'}
            </button>
          </div>
        </div>

      </div>

      {showPromotionModal && promotionPreview && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:20}}>
          <div style={{background:'var(--bg)',width:'100%',maxWidth:600,borderRadius:16,boxShadow:'0 20px 40px rgba(0,0,0,0.2)',display:'flex',flexDirection:'column',maxHeight:'90vh'}}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h3 style={{margin:0,fontSize:'1.2rem',display:'flex',alignItems:'center',gap:8}}><RocketIcon size={20} color="var(--primary)" /> Promotion Preview</h3>
              <button onClick={()=>setShowPromotionModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-light)',padding:4}}><CrossIcon size={20} /></button>
            </div>
            
            <div style={{padding:24,overflowY:'auto',flex:1}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
                <div style={{background:'var(--primary-light)',padding:16,borderRadius:12,textAlign:'center'}}>
                  <div style={{fontSize:'1.5rem',fontWeight:800,color:'var(--primary)'}}>{promotionPreview.studentsPromoted}</div>
                  <div style={{fontSize:'0.75rem',fontWeight:600,color:'var(--primary)'}}>Students Moving Up</div>
                </div>
                <div style={{background:'#dcfce7',padding:16,borderRadius:12,textAlign:'center'}}>
                  <div style={{fontSize:'1.5rem',fontWeight:800,color:'#166534'}}>{promotionPreview.studentsGraduated}</div>
                  <div style={{fontSize:'0.75rem',fontWeight:600,color:'#166534'}}>Graduating</div>
                </div>
                <div style={{background:'#f3e8ff',padding:16,borderRadius:12,textAlign:'center'}}>
                  <div style={{fontSize:'1.5rem',fontWeight:800,color:'#6b21a8'}}>{promotionPreview.teachersCarriedForward}</div>
                  <div style={{fontSize:'0.75rem',fontWeight:600,color:'#6b21a8'}}>Teachers Forwarded</div>
                </div>
              </div>

              <h4 style={{margin:'0 0 12px',fontSize:'0.9rem'}}>Stream Actions</h4>
              <div style={{display:'flex',flexDirection:'column',gap:8,background:'var(--bg-card)',padding:12,borderRadius:12,border:'1px solid var(--border)'}}>
                {promotionPreview.details.map((detail, idx) => (
                  <div key={idx} style={{fontSize:'0.8rem',display:'flex',flexDirection:'column',gap:2,padding:'8px 0',borderBottom:idx===promotionPreview.details.length-1?'none':'1px solid var(--border)'}}>
                    <strong style={{color:'var(--text-main)'}}>{detail.stream}</strong>
                    <span style={{color:'var(--text-light)'}}>{detail.status}</span>
                  </div>
                ))}
              </div>

              <div style={{marginTop:24,padding:16,background:'#fee2e2',borderRadius:12,border:'1px solid #fca5a5'}}>
                <label style={{fontSize:'0.85rem',fontWeight:700,color:'#991b1b',display:'block',marginBottom:8}}>
                  Type <strong>PROMOTE {new Date().getFullYear()}</strong> to confirm
                </label>
                <input 
                  className="form-input" 
                  value={promotionConfirmText}
                  onChange={e=>setPromotionConfirmText(e.target.value)}
                  placeholder={`PROMOTE ${new Date().getFullYear()}`}
                  style={{background:'#fff',borderColor:'#fca5a5'}}
                />
              </div>
            </div>

            <div style={{padding:'16px 24px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:12,background:'var(--bg-card)',borderBottomLeftRadius:16,borderBottomRightRadius:16}}>
              <button className="btn btn-ghost" onClick={()=>setShowPromotionModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={handleConfirmPromotion}
                disabled={promotionConfirmText !== `PROMOTE ${new Date().getFullYear()}` || promotionLoading}
                style={{background:promotionConfirmText === `PROMOTE ${new Date().getFullYear()}` ? '#dc2626' : 'var(--text-light)'}}
              >
                {promotionLoading ? 'Promoting...' : 'Confirm Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
