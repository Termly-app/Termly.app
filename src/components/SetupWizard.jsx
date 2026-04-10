import { useState, useEffect } from 'react';
import { 
  SchoolIcon, BookIcon, GraduationIcon, CardIcon, 
  CheckIcon, RocketIcon, ChevronRightIcon, ChevronLeftIcon,
  PlusIcon, CrossIcon, ShieldIcon
} from './CommonIcons';
import { saveSchoolProfile, CBC_STRUCTURE } from '../data/store';

export default function SetupWizard({ profile, onComplete, totalStudents }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    schoolName: profile?.schoolName || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    address: profile?.address || '',
    motto: profile?.motto || '',
    logo: profile?.logo || '',
    activeClasses: profile?.activeClasses || [],
    streamsPerClass: profile?.streamsPerClass || {},
    customSubjects: profile?.customSubjects || {},
    gradeFees: profile?.gradeFees || {}
  });

  // Sync formData if profile data arrives late
  useEffect(() => {
    if (profile?.schoolName && !formData.schoolName) {
      setFormData(prev => ({ ...prev, schoolName: profile.schoolName }));
    }
  }, [profile]);

  const [saving, setSaving] = useState(false);
  const [activeLevel, setActiveLevel] = useState('Upper Primary');
  const [newStream, setNewStream] = useState('');

  const steps = [
    { id: 1, title: 'Welcome', icon: <RocketIcon size={20} /> },
    { id: 2, title: 'Identity', icon: <SchoolIcon size={20} /> },
    { id: 3, title: 'Architecture', icon: <BookIcon size={20} /> },
    { id: 4, title: 'Subjects', icon: <GraduationIcon size={20} /> },
    { id: 5, title: 'Finance', icon: <CardIcon size={20} /> },
    { id: 6, title: 'Launch', icon: <CheckIcon size={20} /> }
  ];

  const handleNext = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(s => Math.min(s + 1, steps.length));
  };
  const handlePrev = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSchoolProfile({
        ...profile,
        ...formData,
        setup_completed: step === 6
      });
      if (step === 6) {
        onComplete();
      } else {
        handleNext();
      }
    } catch (err) {
      console.error('Setup Wizard Error:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const toggleGrade = (grade) => {
    const active = formData.activeClasses.includes(grade);
    const newClasses = active 
      ? formData.activeClasses.filter(c => c !== grade)
      : [...formData.activeClasses, grade];
    updateField('activeClasses', newClasses);
  };

  const addStream = (grade) => {
    if (!newStream.trim()) return;
    const current = formData.streamsPerClass[grade] || [];
    if (current.includes(newStream.trim())) return;
    const newStreams = { ...formData.streamsPerClass, [grade]: [...current, newStream.trim()] };
    updateField('streamsPerClass', newStreams);
    setNewStream('');
  };

  const removeStream = (grade, stream) => {
    const current = formData.streamsPerClass[grade] || [];
    const newStreams = { ...formData.streamsPerClass, [grade]: current.filter(s => s !== stream) };
    updateField('streamsPerClass', newStreams);
  };

  const getLevelSubjects = (lv) => {
    if (formData.customSubjects?.[lv]) return formData.customSubjects[lv];
    const defaultSubs = CBC_STRUCTURE[lv].subjects;
    if (Array.isArray(defaultSubs)) return defaultSubs;
    return [...new Set(Object.values(defaultSubs).flat())];
  };

  const removeSubject = (lv, sub) => {
    const current = getLevelSubjects(lv);
    const newSubs = { ...formData.customSubjects, [lv]: current.filter(s => s !== sub) };
    updateField('customSubjects', newSubs);
  };

  return (
    <div className="setup-wizard-overlay animate-fade-in">
      <div className="setup-wizard-card">
        {/* Progress Bar with Glow */}
        <div className="wizard-progress">
          {steps.map(s => (
            <div key={s.id} className={`progress-step ${step >= s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}>
              <div className="step-number">{step > s.id ? <CheckIcon size={14} /> : s.id}</div>
              <span className="step-title">{s.title}</span>
            </div>
          ))}
          <div className="progress-bg-line"></div>
          <div className="progress-fill-line" style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}></div>
        </div>

        <div className="wizard-content scroll-y">
          {step === 1 && (
            <div className="wizard-step-inner animate-fade-up">
              <div className="wizard-hero-box">
                <div className="wizard-hero-icon"><RocketIcon size={58} color="#fff" /></div>
                <div className="hero-glow"></div>
              </div>
              <h1 className="premium-title">Revolutionize Your School</h1>
              <p className="premium-desc">Welcome to ShuleSoft. Let's build your school's digital architecture together. This configuration will prepare your system for registration, grading, and fee management.</p>
              
              <div className="wizard-intro-grid">
                <div className="intro-card">
                  <div className="intro-val">{profile?.subscriptionPlan || 'Sandbox'}</div>
                  <div className="intro-lbl">Academic Plan</div>
                </div>
                <div className="intro-card accent">
                  <div className="intro-val">Ready</div>
                  <div className="intro-lbl">Cloud Instance</div>
                </div>
              </div>
              
              <button className="btn-premium-lg" onClick={handleNext}>
                Get Started
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-7-7 7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step-inner animate-fade-up text-left">
              <h2 className="step-heading">Institution Identity</h2>
              <p className="step-subheading">Verify your official details. These will appear on all reports, invoices, and certificates.</p>
              
              <div className="setup-form-v2">
                <div className="form-field-v2 full">
                  <label>Official School Name</label>
                  <div className="input-wrap-v2">
                    <SchoolIcon size={18} className="f-ico" />
                    <input type="text" placeholder="e.g. Alliance High School" value={formData.schoolName} onChange={e => updateField('schoolName', e.target.value)} />
                  </div>
                </div>
                
                <div className="form-field-v2">
                  <label>Contact Phone</label>
                  <div className="input-wrap-v2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="f-ico" style={{width:18, height:18}}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <input type="text" placeholder="07xx xxx xxx" value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
                  </div>
                </div>

                <div className="form-field-v2">
                  <label>Official Email</label>
                  <div className="input-wrap-v2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="f-ico" style={{width:18, height:18}}><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><rect x="2" y="5" width="20" height="14" rx="2"/></svg>
                    <input type="email" placeholder="info@school.ac.ke" value={formData.email} onChange={e => updateField('email', e.target.value)} />
                  </div>
                </div>

                <div className="form-field-v2 full">
                  <label>Physical Address / Location</label>
                  <div className="input-wrap-v2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="f-ico" style={{width:18, height:18}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <input type="text" placeholder="Nairobi, Kenya" value={formData.address} onChange={e => updateField('address', e.target.value)} />
                  </div>
                </div>

                <div className="form-field-v2 full">
                  <label>School Motto</label>
                  <div className="input-wrap-v2">
                    <ShieldIcon size={18} className="f-ico" />
                    <input type="text" placeholder="e.g. Strive for Excellence" value={formData.motto} onChange={e => updateField('motto', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step-inner animate-fade-up text-left">
              <div className="step-header-flex">
                <div>
                  <h2 className="step-heading">School Architecture</h2>
                  <p className="step-subheading">Define your grades and streams. This builds your core database structure.</p>
                </div>
                <div className="level-tabs-v2">
                  {Object.keys(CBC_STRUCTURE).map(lv => (
                    <button key={lv} className={`tab-v2 ${activeLevel === lv ? 'active' : ''}`} onClick={() => setActiveLevel(lv)}>
                      {lv.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="arch-grid-v2">
                <div className="arch-col">
                  <div className="col-label">Select Active Grades</div>
                  <div className="grades-grid-v2">
                    {CBC_STRUCTURE[activeLevel].grades.map(g => (
                      <button 
                        key={g} 
                        className={`grade-pill-v2 ${formData.activeClasses.includes(g) ? 'active' : ''}`}
                        onClick={() => toggleGrade(g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="arch-col">
                  <div className="col-label">Stream Management</div>
                  <div className="streams-stack-v2">
                    {formData.activeClasses.filter(g => CBC_STRUCTURE[activeLevel].grades.includes(g)).map(g => (
                      <div key={g} className="stream-card-v2">
                        <div className="s-card-hd">{g}</div>
                        <div className="s-card-body">
                          <div className="s-tags-v2">
                            {(formData.streamsPerClass[g] || []).map(s => (
                              <span key={s} className="s-tag-v2">
                                {s} <button onClick={() => removeStream(g, s)}><CrossIcon size={10} /></button>
                              </span>
                            ))}
                          </div>
                          <div className="s-add-wrap">
                            <input 
                              type="text" 
                              placeholder="Add Stream..." 
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  addStream(g);
                                  e.target.value = '';
                                }
                              }}
                              onChange={e => setNewStream(e.target.value)}
                            />
                            <button onClick={() => addStream(g)}><PlusIcon size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {formData.activeClasses.filter(g => CBC_STRUCTURE[activeLevel].grades.includes(g)).length === 0 && (
                      <div className="empty-v2">Select grades on the left to configure streams.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="wizard-step-inner animate-fade-up text-left">
              <h2 className="step-heading">Learning Areas</h2>
              <p className="step-subheading">Verify the subjects offered at each level. We've pre-filled these based on KICD requirements.</p>
              
              <div className="level-pills-v2">
                {Object.keys(CBC_STRUCTURE).map(lv => (
                  <button key={lv} className={`pill-v2 ${activeLevel === lv ? 'active' : ''}`} onClick={() => setActiveLevel(lv)}>
                    {lv}
                  </button>
                ))}
              </div>

              <div className="subjects-list-v2">
                {getLevelSubjects(activeLevel).map(sub => (
                  <div key={sub} className="subject-row-v2">
                    <span>{sub}</span>
                    <button onClick={() => removeSubject(activeLevel, sub)}><CrossIcon size={14} /></button>
                  </div>
                ))}
                <div className="subject-add-v2">
                  <input type="text" placeholder="Add custom learning area..." />
                  <button className="btn-add-v2"><PlusIcon size={16} /> Add</button>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="wizard-step-inner animate-fade-up text-left">
              <h2 className="step-heading">Finance & Fee Structure</h2>
              <p className="step-subheading">Define base tuition fees per grade. These can be customized for specific students later.</p>
              
              <div className="fees-grid-v2">
                {formData.activeClasses.map(g => (
                  <div key={g} className="fee-field-v2">
                    <label>{g}</label>
                    <div className="fee-input-v2">
                      <span className="cur">KSh</span>
                      <input 
                        type="number" 
                        value={formData.gradeFees[g] || ''} 
                        onChange={e => {
                          const newFees = { ...formData.gradeFees, [g]: Number(e.target.value) };
                          updateField('gradeFees', newFees);
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
                {formData.activeClasses.length === 0 && (
                  <div className="empty-v2" style={{ gridColumn: 'span 2' }}>No active grades selected. Please go back to Architecture.</div>
                )}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="wizard-step-inner animate-fade-up">
              <div className="success-lottie-wrap">
                <CheckIcon size={80} color="#10B981" />
              </div>
              <h1 className="premium-title">Architecture Verified</h1>
              <p className="premium-desc">Your school's digital foundation is now ready. You can now start onboarding students and generating invoices.</p>
              
              <div className="wizard-summary-v2">
                <div className="sum-item">
                  <span className="sum-k">Institution</span>
                  <span className="sum-v">{formData.schoolName}</span>
                </div>
                <div className="sum-item">
                  <span className="sum-k">Active Grades</span>
                  <span className="sum-v">{formData.activeClasses.length} Levels</span>
                </div>
                <div className="sum-item">
                  <span className="sum-k">Data Security</span>
                  <span className="sum-v">AES-256 Encrypted</span>
                </div>
              </div>

              <div className="trust-badge-v2">
                <ShieldIcon size={16} /> ShuleSoft Cloud-Native Security Active
              </div>
            </div>
          )}
        </div>

        <div className="wizard-footer-v2">
          {step > 1 && (
            <button className="btn-v2-ghost" onClick={handlePrev} disabled={saving}>
              <ChevronLeftIcon size={18} /> Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button 
            className="btn-v2-primary" 
            onClick={handleSave} 
            disabled={saving || (step === 2 && !formData.schoolName)}
          >
            {saving ? 'Processing...' : step === 6 ? 'Launch Dashboard' : 'Save & Continue'}
            {!saving && <ChevronRightIcon size={18} />}
          </button>
        </div>
      </div>

      <style>{`
        .setup-wizard-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(10, 10, 15, 0.94);
          backdrop-filter: blur(12px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .setup-wizard-card {
          background: #111118;
          width: 100%;
          max-width: 900px;
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 40px 120px rgba(0,0,0,0.6);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        /* PROGRESS BAR */
        .wizard-progress {
          display: flex;
          padding: 32px 40px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          justify-content: space-between;
          position: relative;
        }
        .progress-bg-line {
          position: absolute;
          top: 48px; left: 60px; right: 60px;
          height: 3px; background: rgba(255,255,255,0.05);
          border-radius: 10px; z-index: 1;
        }
        .progress-fill-line {
          position: absolute;
          top: 48px; left: 60px;
          height: 3px; background: linear-gradient(90deg, #5B3EF5, #29C6D4);
          box-shadow: 0 0 12px rgba(91, 62, 245, 0.5);
          border-radius: 10px; z-index: 2;
          transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .progress-step {
          display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; z-index: 3;
        }
        .step-number {
          width: 34px; height: 34px; border-radius: 50%;
          background: #1A1A24; border: 2px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; font-weight: 800; color: rgba(255,255,255,0.4);
          transition: all 0.4s;
        }
        .progress-step.active .step-number {
          border-color: #5B3EF5; color: #5B3EF5; transform: scale(1.15);
          box-shadow: 0 0 20px rgba(91, 62, 245, 0.4); background: #fff;
        }
        .progress-step.done .step-number {
          background: linear-gradient(135deg, #5B3EF5, #29C6D4);
          border-color: transparent; color: #fff;
        }
        .step-title {
          font-size: 0.65rem; font-weight: 900; text-transform: uppercase;
          letter-spacing: 0.1em; color: rgba(255,255,255,0.3);
          transition: color 0.4s;
        }
        .progress-step.active .step-title { color: #fff; }

        .wizard-content {
          padding: 48px 64px;
          min-height: 520px;
          max-height: 75vh;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        .animate-fade-up { animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .wizard-hero-box { position: relative; width: 120px; height: 120px; margin: 0 auto 32px; }
        .wizard-hero-icon {
          width: 100%; height: 100%; border-radius: 36px;
          background: linear-gradient(145deg, #5B3EF5, #29C6D4);
          display: flex; align-items: center; justify-content: center;
          position: relative; z-index: 2; box-shadow: 0 20px 40px rgba(91, 62, 245, 0.4);
        }
        .hero-glow {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: #5B3EF5; filter: blur(40px); opacity: 0.4; z-index: 1;
        }
        .premium-title { font-size: 2.2rem; font-weight: 900; color: #fff; margin-bottom: 12px; letter-spacing: -0.02em; }
        .premium-desc { font-size: 1.05rem; color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 40px; }
        
        .wizard-intro-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 48px; }
        .intro-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          padding: 24px; border-radius: 20px; text-align: left;
        }
        .intro-card.accent { border-color: rgba(41, 198, 212, 0.2); }
        .intro-val { font-size: 1.4rem; font-weight: 900; color: #fff; margin-bottom: 4px; }
        .intro-lbl { font-size: 0.75rem; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; }

        .btn-premium-lg {
          background: #fff; color: #111; padding: 18px 40px; border-radius: 100px;
          border: none; font-size: 1.1rem; font-weight: 800; cursor: pointer;
          display: inline-flex; align-items: center; gap: 12px; transition: all 0.3s;
        }
        .btn-premium-lg:hover { transform: translateY(-4px); box-shadow: 0 15px 30px rgba(255,255,255,0.2), 0 0 20px rgba(91, 62, 245, 0.3); }

        .step-heading { font-size: 1.8rem; font-weight: 900; color: #fff; margin-bottom: 8px; letter-spacing: -0.01em; }
        .step-subheading { color: rgba(255,255,255,0.5); font-size: 0.95rem; margin-bottom: 32px; }
        
        .setup-form-v2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .form-field-v2.full { grid-column: span 2; }
        .form-field-v2 label { display: block; font-size: 0.75rem; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
        .input-wrap-v2 {
          position: relative; display: flex; align-items: center;
          background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 14px; transition: all 0.2s;
        }
        .input-wrap-v2:focus-within { border-color: #5B3EF5; background: rgba(91, 62, 245, 0.04); }
        .input-wrap-v2 .f-ico { position: absolute; left: 16px; color: rgba(255,255,255,0.3); }
        .input-wrap-v2 input {
          width: 100%; background: transparent; border: none; padding: 14px 14px 14px 48px;
          color: #fff; font-size: 1rem; font-weight: 500; outline: none;
        }
        .input-wrap-v2 input::placeholder { color: rgba(255,255,255,0.2); }

        .step-header-flex { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 32px; }
        .level-tabs-v2 { display: flex; gap: 6px; padding: 5px; background: rgba(255,255,255,0.05); border-radius: 12px; }
        .tab-v2 {
          background: transparent; border: none; color: rgba(255,255,255,0.4);
          padding: 8px 16px; font-size: 0.8rem; font-weight: 800; cursor: pointer; border-radius: 8px; transition: all 0.2s;
        }
        .tab-v2.active { background: #fff; color: #111; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }

        .arch-grid-v2 { display: grid; grid-template-columns: 1fr 1.2fr; gap: 32px; margin-top: 24px; }
        .col-label { font-size: 0.75rem; font-weight: 800; color: #5B3EF5; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.05em; }
        
        .grades-grid-v2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .grade-pill-v2 {
          background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.06);
          padding: 12px; border-radius: 12px; color: rgba(255,255,255,0.6);
          font-weight: 700; text-align: left; cursor: pointer; transition: all 0.2s;
        }
        .grade-pill-v2.active { border-color: #5B3EF5; background: rgba(91, 62, 245, 0.12); color: #fff; }

        .stream-card-v2 {
          background: rgba(255,255,255,0.03); border-radius: 16px; padding: 16px; margin-bottom: 12px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .s-card-hd { font-weight: 900; color: #29C6D4; font-size: 0.75rem; margin-bottom: 12px; text-transform: uppercase; }
        .s-tags-v2 { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .s-tag-v2 {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          padding: 6px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 700;
          display: flex; align-items: center; gap: 6px; color: #fff;
        }
        .s-tag-v2 button { background: none; border: none; color: #EF4444; cursor: pointer; padding: 0; }
        
        .s-add-wrap { display: flex; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 4px; }
        .s-add-wrap input { flex: 1; background: transparent; border: none; padding: 8px 10px; color: #fff; font-size: 0.85rem; outline: none; }
        .s-add-wrap button {
          width: 32px; height: 32px; border-radius: 6px; border: none;
          background: #5B3EF5; color: #fff; cursor: pointer;
        }

        .level-pills-v2 { display: flex; gap: 10px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 4px; }
        .pill-v2 {
          white-space: nowrap; background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.4); padding: 10px 20px; border-radius: 50px; font-weight: 800; font-size: 0.8rem; cursor: pointer;
        }
        .pill-v2.active { border-color: #29C6D4; color: #fff; background: rgba(41, 198, 212, 0.1); }
        
        .subjects-list-v2 {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px;
        }
        .subject-row-v2 {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          padding: 16px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center;
          font-weight: 600; color: #fff; font-size: 0.9rem;
        }
        .subject-row-v2 button { background: none; border: none; color: #EF4444; cursor: pointer; }
        
        .subject-add-v2 { grid-column: 1 / -1; display: flex; gap: 12px; margin-top: 12px; }
        .subject-add-v2 input { flex: 1; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.08); padding: 14px 20px; color: #fff; }
        .btn-add-v2 { background: #5B3EF5; color: #fff; border: none; padding: 0 24px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; }

        .fees-grid-v2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .fee-field-v2 label { display: block; font-size: 0.85rem; font-weight: 900; color: #fff; margin-bottom: 12px; }
        .fee-input-v2 {
          display: flex; align-items: center; background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden;
        }
        .fee-input-v2 .cur { padding: 0 16px; font-size: 0.75rem; font-weight: 900; color: rgba(255,255,255,0.3); border-right: 1px solid rgba(255,255,255,0.1); }
        .fee-input-v2 input { width: 100%; height: 50px; background: transparent; border: none; color: #fff; padding: 0 16px; font-size: 1.1rem; font-weight: 700; outline: none; }

        .success-lottie-wrap { width: 100px; height: 100px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); margin: 0 auto 32px; display: flex; align-items: center; justify-content: center; position: relative; }
        .wizard-summary-v2 {
          background: rgba(255,255,255,0.03); border-radius: 20px; border: 1px solid rgba(255,255,255,0.08);
          max-width: 440px; margin: 0 auto 32px; padding: 24px;
        }
        .sum-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .sum-item:last-child { border: none; }
        .sum-k { font-size: 0.85rem; color: rgba(255,255,255,0.4); }
        .sum-v { font-size: 0.95rem; font-weight: 800; color: #fff; }
        
        .trust-badge-v2 { display: flex; align-items: center; gap: 8px; color: #10B981; font-size: 0.8rem; font-weight: 800; justify-content: center; }

        .wizard-footer-v2 {
          padding: 32px 64px; background: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex; align-items: center; gap: 20px;
        }
        .btn-v2-ghost {
          background: transparent; border: 1.5px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6); padding: 14px 28px; border-radius: 100px;
          font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; gap: 8px;
        }
        .btn-v2-ghost:hover { border-color: #fff; color: #fff; }
        .btn-v2-primary {
          background: linear-gradient(135deg, #5B3EF5, #4A32D4); color: #fff; padding: 14px 32px;
          border-radius: 100px; border: none; font-weight: 800; font-size: 0.95rem; cursor: pointer;
          display: flex; align-items: center; gap: 10px; transition: all 0.2s;
          box-shadow: 0 8px 20px rgba(91, 62, 245, 0.4);
        }
        .btn-v2-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(91, 62, 245, 0.5); }
        .btn-v2-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 768px) {
          .setup-wizard-overlay { padding: 0; }
          .setup-wizard-card { height: 100vh; max-height: 100vh; border-radius: 0; }
          .wizard-progress { padding: 20px; }
          .step-title { display: none; }
          .progress-bg-line, .progress-fill-line { left: 20px; right: 20px; }
          .wizard-content { padding: 32px 20px; }
          .setup-form-v2 { grid-template-columns: 1fr; gap: 16px; }
          .form-field-v2.full { grid-column: span 1; }
          .arch-grid-v2 { grid-template-columns: 1fr; gap: 40px; }
          .fees-grid-v2 { grid-template-columns: 1fr; }
          .wizard-footer-v2 { padding: 20px; }
          .premium-title { font-size: 1.6rem; }
          .btn-v2-primary { flex: 1; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
