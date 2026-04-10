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
    gradeFees: profile?.gradeFees || {},
    schoolType: profile?.schoolType || 'Day',
    boardingHouses: profile?.boardingHouses || []
  });

  // Sync formData if profile data arrives late
  useEffect(() => {
    if (profile?.schoolName && !formData.schoolName) {
      setFormData(prev => ({ 
        ...prev, 
        schoolName: profile.schoolName,
        schoolType: profile.schoolType || 'Day',
        boardingHouses: profile.boardingHouses || [] 
      }));
    }
  }, [profile]);

  const [saving, setSaving] = useState(false);
  const [activeLevel, setActiveLevel] = useState('Upper Primary');
  const [newStream, setNewStream] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newHouse, setNewHouse] = useState('');

  const steps = [
    { id: 1, title: 'Welcome', icon: <RocketIcon size={20} /> },
    { id: 2, title: 'Identity', icon: <SchoolIcon size={20} /> },
    { id: 3, title: 'Architecture', icon: <BookIcon size={20} /> },
    { id: 4, title: 'Subjects', icon: <GraduationIcon size={20} /> },
    { id: 5, title: 'Finance', icon: <CardIcon size={20} /> },
    { id: 6, title: 'Launch', icon: <CheckIcon size={20} /> }
  ];

  const handleNext = () => setStep(s => Math.min(s + 1, steps.length));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

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

  const addHouse = () => {
    if (!newHouse.trim()) return;
    if (formData.boardingHouses.includes(newHouse.trim())) return;
    updateField('boardingHouses', [...formData.boardingHouses, newHouse.trim()]);
    setNewHouse('');
  };

  const removeHouse = (house) => {
    updateField('boardingHouses', formData.boardingHouses.filter(h => h !== house));
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

  const addSubject = () => {
    if (!newSubject.trim()) return;
    const current = getLevelSubjects(activeLevel);
    if (current.includes(newSubject.trim())) return;
    const newSubs = { ...formData.customSubjects, [activeLevel]: [...current, newSubject.trim()] };
    updateField('customSubjects', newSubs);
    setNewSubject('');
  };

  const isBoardingEnabled = formData.schoolType === 'Boarding' || formData.schoolType === 'Mixed';

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal">
        {/* Header/Progress */}
        <div className="wizard-header">
          <div className="wizard-steps-nav">
            {steps.map(s => (
              <div key={s.id} className={`step-item ${step >= s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}>
                <div className="step-point">{step > s.id ? <CheckIcon size={12} /> : s.id}</div>
                <span className="step-label">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="wizard-body scroll-y">
          {step === 1 && (
            <div className="wizard-welcome text-center animate-fade-in">
              <div className="hero-icon-box"><RocketIcon size={48} /></div>
              <h1>Welcome to ShuleSoft</h1>
              <p>Let's get your school set up in 5 minutes. We'll configure your branding, classes, and fee structure to get you ready for the term.</p>
              
              <div className="info-grid">
                <div className="info-card">
                  <div className="info-val">{profile?.subscriptionPlan || 'Sandbox'}</div>
                  <div className="info-lbl">Active Plan</div>
                </div>
                <div className="info-card">
                  <div className="info-val">Active</div>
                  <div className="info-lbl">System Status</div>
                </div>
              </div>
              
              <button className="btn btn-primary btn-lg" onClick={handleNext}>
                Start Configuration <ChevronRightIcon size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step-content animate-fade-in">
              <h2>School Identity</h2>
              <p className="step-desc">Enter your school's official details for reports and invoices.</p>
              
              <div className="form-grid">
                <div className="form-group full">
                  <label>Official School Name</label>
                  <input type="text" placeholder="Enter school name" value={formData.schoolName} onChange={e => updateField('schoolName', e.target.value)} />
                </div>
                
                <div className="form-group full">
                  <label>School Type / Categorization</label>
                  <div className="type-selector">
                    {['Day', 'Boarding', 'Mixed'].map(type => (
                      <button 
                        key={type} 
                        className={`type-btn ${formData.schoolType === type ? 'active' : ''}`}
                        onClick={() => updateField('schoolType', type)}
                      >
                        {type} School
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="text" placeholder="07xx xxx xxx" value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Official Email</label>
                  <input type="email" placeholder="info@school.com" value={formData.email} onChange={e => updateField('email', e.target.value)} />
                </div>
                <div className="form-group full">
                  <label>Physical Address</label>
                  <input type="text" placeholder="e.g. Nairobi, Kenya" value={formData.address} onChange={e => updateField('address', e.target.value)} />
                </div>
                <div className="form-group full">
                  <label>School Motto</label>
                  <input type="text" placeholder="Optional" value={formData.motto} onChange={e => updateField('motto', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step-content animate-fade-in">
              <div className="flex-between" style={{ marginBottom: 20 }}>
                <div>
                  <h2>School Structure</h2>
                  <p className="step-desc">Select your grades and define streams (branches).</p>
                </div>
                <div className="tab-switcher">
                  {Object.keys(CBC_STRUCTURE).map(lv => (
                    <button key={lv} className={`tab-btn ${activeLevel === lv ? 'active' : ''}`} onClick={() => setActiveLevel(lv)}>
                      {lv.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="arch-layout">
                <div className="arch-left">
                  <div className="label-sm">SELECT GRADES</div>
                  <div className="grade-selector">
                    {CBC_STRUCTURE[activeLevel].grades.map(g => (
                      <div 
                        key={g} 
                        className={`grade-chip ${formData.activeClasses.includes(g) ? 'active' : ''}`}
                        onClick={() => toggleGrade(g)}
                      >
                        {g}
                        {formData.activeClasses.includes(g) && <CheckIcon size={12} />}
                      </div>
                    ))}
                  </div>

                  {isBoardingEnabled && (
                    <div style={{ marginTop: 32 }}>
                      <div className="label-sm">RESIDENTIAL HOUSES</div>
                      <div className="house-manager">
                        <div className="streams-list">
                          {formData.boardingHouses.map(h => (
                            <span key={h} className="tag">
                              {h} <button onClick={() => removeHouse(h)}><CrossIcon size={10} /></button>
                            </span>
                          ))}
                          <div className="add-tag">
                            <input 
                              type="text" 
                              placeholder="New House..." 
                              value={newHouse}
                              onKeyDown={e => { if (e.key === 'Enter') addHouse(); }}
                              onChange={e => setNewHouse(e.target.value)}
                            />
                            <button onClick={addHouse}><PlusIcon size={14} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="arch-right">
                  <div className="label-sm">STREAMS & SECTIONS</div>
                  <div className="stream-manager">
                    {formData.activeClasses.filter(g => CBC_STRUCTURE[activeLevel].grades.includes(g)).map(g => (
                      <div key={g} className="class-section">
                        <div className="class-name">{g}</div>
                        <div className="streams-list">
                          {(formData.streamsPerClass[g] || []).map(s => (
                            <span key={s} className="tag">
                              {s} <button onClick={() => removeStream(g, s)}><CrossIcon size={10} /></button>
                            </span>
                          ))}
                          <div className="add-tag">
                            <input 
                              type="text" 
                              placeholder="New Stream..." 
                              onKeyDown={e => { if (e.key === 'Enter') addStream(g); }}
                              onChange={e => setNewStream(e.target.value)}
                            />
                            <button onClick={() => addStream(g)}><PlusIcon size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {formData.activeClasses.filter(g => CBC_STRUCTURE[activeLevel].grades.includes(g)).length === 0 && (
                      <div className="empty-notice">Select grades on the left to configure streams.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="wizard-step-content animate-fade-in">
              <h2>Learning Areas (Subjects)</h2>
              <p className="step-desc">Verify subjects per level. Pre-filled based on KICD standards.</p>
              
              <div className="level-tabs-scroll">
                {Object.keys(CBC_STRUCTURE).map(lv => (
                  <button key={lv} className={`pill-btn ${activeLevel === lv ? 'active' : ''}`} onClick={() => setActiveLevel(lv)}>
                    {lv}
                  </button>
                ))}
              </div>

              <div className="subject-grid">
                {getLevelSubjects(activeLevel).map(sub => (
                  <div key={sub} className="subject-item">
                    <span>{sub}</span>
                    <button onClick={() => removeSubject(activeLevel, sub)} className="remove-btn"><CrossIcon size={14} /></button>
                  </div>
                ))}
                <div className="subject-item add-item">
                   <input 
                    type="text" 
                    placeholder="Add custom subject..." 
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubject()}
                   />
                   <button onClick={addSubject} className="add-btn"><PlusIcon size={16} /></button>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="wizard-step-content animate-fade-in">
              <h2>Fees Management</h2>
              <p className="step-desc">Set the base tuition {isBoardingEnabled && 'and boarding'} fees for each grade.</p>
              
              <div className="fees-layout">
                {formData.activeClasses.map(g => (
                  <div key={g} className="fee-card-v2">
                    <div className="fee-card-header">{g}</div>
                    <div className="fee-inputs-row">
                      <div className="fee-input-wrap">
                        <label>Tuition Fee</label>
                        <div className="input-with-cur">
                          <span>KSh</span>
                          <input 
                            type="number" 
                            value={typeof formData.gradeFees[g] === 'object' ? formData.gradeFees[g]?.day : formData.gradeFees[g] || ''} 
                            onChange={e => {
                                const val = Number(e.target.value);
                                const current = typeof formData.gradeFees[g] === 'object' ? formData.gradeFees[g] : { day: formData.gradeFees[g] || 0, boarding: 0 };
                                updateField('gradeFees', { ...formData.gradeFees, [g]: { ...current, day: val } });
                            }}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      {isBoardingEnabled && (
                        <div className="fee-input-wrap">
                          <label>Boarding Fee</label>
                          <div className="input-with-cur">
                            <span>KSh</span>
                            <input 
                              type="number" 
                              value={formData.gradeFees[g]?.boarding || ''} 
                              onChange={e => {
                                  const val = Number(e.target.value);
                                  const current = typeof formData.gradeFees[g] === 'object' ? formData.gradeFees[g] : { day: formData.gradeFees[g] || 0, boarding: 0 };
                                  updateField('gradeFees', { ...formData.gradeFees, [g]: { ...current, boarding: val } });
                              }}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {formData.activeClasses.length === 0 && (
                  <div className="empty-notice">No grades selected. Go back to Architecture Step.</div>
                )}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="wizard-success text-center animate-fade-in">
              <div className="success-icon"><CheckIcon size={48} /></div>
              <h1>Configuration Ready!</h1>
              <p>Your school architecture is verified. You can now access your dashboard and start managing students.</p>
              
              <div className="summary-box">
                <div className="sum-row"><strong>Institution:</strong> <span>{formData.schoolName}</span></div>
                <div className="sum-row"><strong>Type:</strong> <span>{formData.schoolType} School</span></div>
                <div className="sum-row"><strong>Structure:</strong> <span>{formData.activeClasses.length} Grades Enabled</span></div>
                <div className="sum-row"><strong>Status:</strong> <span className="text-success">Ready for Term</span></div>
              </div>
              
              <div className="security-tag"><ShieldIcon size={14} /> Encrypted Cloud Instance Active</div>
            </div>
          )}
        </div>

        <div className="wizard-footer">
          {step > 1 && (
            <button className="btn btn-ghost" onClick={handlePrev} disabled={saving}>
              <ChevronLeftIcon size={18} /> Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={saving || (step === 2 && !formData.schoolName)}
          >
            {saving ? 'Saving...' : step === 6 ? 'Go to Dashboard' : 'Save & Continue'}
            {!saving && <ChevronRightIcon size={18} />}
          </button>
        </div>
      </div>

      <style>{`
        .wizard-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .wizard-modal {
          background: #ffffff;
          width: 100%;
          max-width: 860px;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(0,0,0,0.05);
        }

        .wizard-header {
          padding: 24px 40px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .wizard-steps-nav {
          display: flex;
          justify-content: space-between;
          position: relative;
          max-width: 600px;
          margin: 0 auto;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          flex: 1;
          z-index: 2;
          position: relative;
        }

        .step-point {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          transition: all 0.3s;
        }

        .step-item.active .step-point {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #eff6ff;
        }

        .step-item.done .step-point {
          background: #3b82f6;
          border-color: #3b82f6;
          color: #fff;
        }

        .step-label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
        }

        .step-item.active .step-label { color: #1e293b; }

        .wizard-body {
          padding: 40px 64px;
          min-height: 480px;
          max-height: 70vh;
          overflow-y: auto;
        }

        .wizard-welcome h1 { font-size: 2rem; color: #1e293b; margin-bottom: 12px; }
        .wizard-welcome p { color: #64748b; line-height: 1.6; margin-bottom: 32px; }
        
        .hero-icon-box {
          width: 90px; height: 90px; background: #eff6ff; color: #3b82f6;
          border-radius: 24px; display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.1);
        }

        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 40px; }
        .info-card { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; }
        .info-val { font-size: 1.25rem; font-weight: 800; color: #1e293b; }
        .info-lbl { font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 700; }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-group.full { grid-column: span 2; }
        .form-group label { display: block; font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 8px; }
        .form-group input {
          width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0;
          font-size: 0.95rem; transition: border-color 0.2s; outline: none;
        }
        .form-group input:focus { border-color: #3b82f6; }

        .type-selector { display: flex; gap: 10px; margin-top: 5px; }
        .type-btn {
          flex: 1; padding: 12px; border-radius: 12px; border: 1.5px solid #e2e8f0;
          background: #fff; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s;
        }
        .type-btn.active { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }

        .arch-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 32px; }
        .label-sm { font-size: 0.65rem; font-weight: 800; color: #94a3b8; margin-bottom: 16px; letter-spacing: 0.1em; }
        
        .grade-selector { display: flex; flex-wrap: wrap; gap: 8px; }
        .grade-chip {
          padding: 8px 16px; background: #f1f5f9; border-radius: 10px; cursor: pointer;
          font-size: 0.85rem; font-weight: 600; color: #475569; border: 1px solid transparent;
          display: flex; align-items: center; gap: 6px; transition: all 0.2s;
        }
        .grade-chip.active { background: #eff6ff; color: #3b82f6; border-color: #3b82f6; }

        .class-section { background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0; }
        .class-name { font-weight: 800; color: #1e293b; font-size: 0.85rem; margin-bottom: 12px; }
        .streams-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .tag { background: #fff; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; }
        .tag button { background: none; border: none; color: #ef4444; cursor: pointer; padding: 0; }
        .add-tag { display: flex; align-items: center; gap: 4px; background: #fff; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 2px 6px; }
        .add-tag input { border: none; width: 80px; font-size: 0.8rem; outline: none; }
        .add-tag button { background: none; border: none; color: #3b82f6; cursor: pointer; }

        .tab-switcher { display: flex; background: #f1f5f9; padding: 4px; border-radius: 10px; gap: 4px; }
        .tab-btn { background: none; border: none; padding: 6px 14px; font-size: 0.75rem; font-weight: 800; color: #64748b; cursor: pointer; border-radius: 7px; transition: all 0.2s; }
        .tab-btn.active { background: #fff; color: #1e293b; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }

        .level-tabs-scroll { display: flex; gap: 8px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 8px; }
        .pill-btn { white-space: nowrap; background: #f1f5f9; border: 1px solid #e2e8f0; color: #64748b; padding: 8px 16px; border-radius: 50px; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
        .pill-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }

        .subject-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .subject-item { background: #f8fafc; padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 600; color: #1e293b; }
        .remove-btn { background: none; border: none; color: #ef4444; cursor: pointer; opacity: 0.6; transition: opacity 0.2s; }
        .remove-btn:hover { opacity: 1; }
        
        .subject-item.add-item { background: #fff; border-style: dashed; padding: 8px 12px; border-color: #cbd5e1; }
        .subject-item.add-item input { border: none; background: transparent; flex: 1; font-size: 0.85rem; font-weight: 500; outline: none; }
        .add-btn { background: #3b82f6; color: #fff; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

        .fees-layout { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .fee-card-v2 { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
        .fee-card-header { font-weight: 800; color: #1e293b; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .fee-inputs-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .fee-input-wrap label { display: block; font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }

        .input-with-cur { display: flex; align-items: center; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        .input-with-cur span { background: #f1f5f9; padding: 0 12px; color: #94a3b8; font-size: 0.7rem; font-weight: 800; border-right: 1px solid #e2e8f0; height: 40px; display: flex; align-items: center; }
        .input-with-cur input { border: none; background: transparent; padding: 0 12px; width: 100%; height: 40px; font-weight: 700; outline: none; }

        .wizard-success h1 { font-size: 1.75rem; color: #1e293b; margin-bottom: 12px; }
        .success-icon { width: 80px; height: 80px; background: #dcfce7; color: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .summary-box { background: #f8fafc; border-radius: 16px; padding: 24px; max-width: 400px; margin: 0 auto 24px; text-align: left; }
        .sum-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem; }
        .sum-row strong { color: #64748b; font-weight: 600; }
        .sum-row span { color: #1e293b; font-weight: 700; }
        .security-tag { font-size: 0.75rem; color: #10b981; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; }

        .wizard-footer {
          padding: 24px 40px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
        }

        .btn { padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: 0.875rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; border: none; transition: all 0.2s; }
        .btn-primary { background: #3b82f6; color: #fff; }
        .btn-primary:hover { background: #2563eb; }
        .btn-ghost { background: transparent; color: #64748b; }
        .btn-ghost:hover { background: #f1f5f9; color: #1e293b; }
        .btn-lg { padding: 14px 28px; font-size: 1rem; }

        .animate-fade-in { animation: fadeIn 0.4s ease-out both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .empty-notice { padding: 40px; text-align: center; color: #94a3b8; font-style: italic; }

        @media (max-width: 768px) {
          .wizard-overlay { padding: 0; align-items: flex-end; }
          .wizard-modal { height: 90vh; border-radius: 20px 20px 0 0; }
          .wizard-header { padding: 20px; }
          .step-label { display: none; }
          .wizard-body { padding: 32px 20px; }
          .form-grid { grid-template-columns: 1fr; }
          .arch-layout { grid-template-columns: 1fr; }
          .info-grid { grid-template-columns: 1fr; }
          .fee-inputs-row { grid-template-columns: 1fr; }
          .wizard-footer { padding: 16px 20px; }
          .btn-primary { flex: 1; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
