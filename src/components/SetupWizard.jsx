import { useState } from 'react';
import { 
  SchoolIcon, BookIcon, GraduationIcon, CardIcon, 
  CheckIcon, RocketIcon, ChevronRightIcon, ChevronLeftIcon,
  PlusIcon, CrossIcon, RefreshIcon, ImageIcon, ShieldIcon
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
        {/* Progress Bar */}
        <div className="wizard-progress">
          {steps.map(s => (
            <div key={s.id} className={`progress-step ${step >= s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}>
              <div className="step-number">{step > s.id ? <CheckIcon size={14} /> : s.id}</div>
              <span className="step-title">{s.title}</span>
            </div>
          ))}
        </div>

        <div className="wizard-content">
          {step === 1 && (
            <div className="wizard-step-inner animate-fade-up">
              <div className="wizard-hero-icon"><RocketIcon size={64} color="var(--primary)" /></div>
              <h1>Revolutionize Your School</h1>
              <p>Welcome to ShuleSoft. Let's build your school's digital architecture together. This 6-step setup will prepare your system for registration, grading, and fee management.</p>
              <div className="wizard-stats-preview" style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
                <div className="stat-mini" style={{ background: 'var(--bg)', padding: '12px 20px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--primary)' }}>{profile?.subscription_plan || 'Starter'}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Platform Tier</span>
                </div>
                <div className="stat-mini" style={{ background: 'var(--bg)', padding: '12px 20px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--success)' }}>Active</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cloud Instance</span>
                </div>
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleNext}>
                Start Configuration <ChevronRightIcon size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step-inner animate-fade-up text-left">
              <h2>Institution Identity</h2>
              <p>Verify your school details. These will appear on all official documents and portals.</p>
              <div className="form-grid-2">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Official School Name</label>
                  <input type="text" value={formData.schoolName} onChange={e => updateField('schoolName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input type="text" value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Official Email</label>
                  <input type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Physical Address / Location</label>
                  <input type="text" value={formData.address} onChange={e => updateField('address', e.target.value)} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>School Motto</label>
                  <input type="text" value={formData.motto} onChange={e => updateField('motto', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step-inner animate-fade-up text-left">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h2>School Architecture</h2>
                  <p>Select active grades and define streams for each. Streams are used to group students within a grade.</p>
                </div>
                <div className="scroll-x-hide" style={{ gap: 4, padding: 4, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', maxWidth: '100%' }}>
                  {Object.keys(CBC_STRUCTURE).map(lv => (
                    <button key={lv} className={`btn-tab ${activeLevel === lv ? 'on' : ''}`} onClick={() => setActiveLevel(lv)}>
                      {lv.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginTop: 20 }}>
                <div className="grades-selector" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <div className="label-sec" style={{ width: '100%' }}>Active Grades</div>
                  {CBC_STRUCTURE[activeLevel].grades.map(g => (
                    <label key={g} className={`grade-item ${formData.activeClasses.includes(g) ? 'on' : ''}`}>
                      <span>{g}</span>
                      <input type="checkbox" checked={formData.activeClasses.includes(g)} onChange={() => toggleGrade(g)} />
                    </label>
                  ))}
                </div>
                <div className="streams-manager">
                  <div className="label-sec">Stream Management</div>
                  <div className="responsive-grid-stack" style={{ gap: 12 }}>
                    {formData.activeClasses.filter(g => CBC_STRUCTURE[activeLevel].grades.includes(g)).map(g => (
                      <div key={g} className="stream-box">
                        <div className="stream-box-hd">{g} Streams</div>
                        <div className="stream-tags">
                          {(formData.streamsPerClass[g] || []).map(s => (
                            <span key={s} className="tag">
                              {s} <button onClick={() => removeStream(g, s)}><CrossIcon size={12} /></button>
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <input type="text" className="form-input-sm" value={newStream} onChange={e => setNewStream(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStream(g)} placeholder="e.g. North" />
                          <button className="btn-add-sm" onClick={() => addStream(g)}><PlusIcon size={14} /></button>
                        </div>
                      </div>
                    ))}
                    {formData.activeClasses.filter(g => CBC_STRUCTURE[activeLevel].grades.includes(g)).length === 0 && (
                      <div className="empty-mini">Select grades on the left to add streams.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="wizard-step-inner animate-fade-up text-left">
              <h2>Learning Areas (Subjects)</h2>
              <p>Review and customize the subjects offered at each level. We've pre-filled these based on KICD requirements.</p>
              
              <div className="scroll-x-hide" style={{ gap: 10, marginBottom: 20, maxWidth: '100%' }}>
                {Object.keys(CBC_STRUCTURE).map(lv => (
                  <button key={lv} className={`btn-pill ${activeLevel === lv ? 'on' : ''}`} onClick={() => setActiveLevel(lv)}>
                    {lv}
                  </button>
                ))}
              </div>

              <div className="subjects-grid">
                {getLevelSubjects(activeLevel).map(sub => (
                  <div key={sub} className="subject-item">
                    <span>{sub}</span>
                    <button onClick={() => removeSubject(activeLevel, sub)}><CrossIcon size={14} /></button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                <input type="text" className="form-input" placeholder="Add custom subject..." />
                <button className="btn btn-ghost"><PlusIcon size={16} /> Add Subject</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="wizard-step-inner animate-fade-up text-left">
              <h2>Financial Configuration</h2>
              <p>Set the standard term fee for each active grade. You can adjust this for individual students later.</p>
              <div className="fees-grid">
                {formData.activeClasses.map(g => (
                  <div key={g} className="fee-card">
                    <div className="fee-card-name">{g}</div>
                    <div className="fee-input-wrap">
                      <span className="unit">KSh</span>
                      <input 
                        type="number" 
                        value={formData.gradeFees[g] || ''} 
                        onChange={e => {
                          const newFees = { ...formData.gradeFees, [g]: Number(e.target.value) };
                          updateField('gradeFees', newFees);
                        }}
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
                {formData.activeClasses.length === 0 && (
                  <div className="empty-mini" style={{ gridColumn: 'span 3' }}>No active grades selected. Go back to Architecture.</div>
                )}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="wizard-step-inner animate-fade-up">
              <div className="wizard-hero-icon success"><CheckIcon size={64} color="var(--success)" /></div>
              <h1>Configuration Success!</h1>
              <p>Your school architecture is now fully defined. You are ready to start managing students and processing fee payments.</p>
              
              <div className="summary-list">
                <div className="summary-row"><span>Institution:</span> <strong>{formData.schoolName}</strong></div>
                <div className="summary-row"><span>Active Grades:</span> <strong>{formData.activeClasses.length} Grades</strong></div>
                <div className="summary-row"><span>Fee Collected:</span> <strong>System Ready</strong></div>
              </div>

              <div className="next-action-note">
                <ShieldIcon size={16} /> Data is secured with AES-256 school-specific encryption.
              </div>
            </div>
          )}
        </div>

        <div className="wizard-footer">
          {step > 1 && step < 6 && (
            <button className="btn btn-ghost" onClick={handlePrev} disabled={saving}>
              <ChevronLeftIcon size={18} /> Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step === 1 ? (
             <button className="btn btn-primary btn-lg" onClick={handleNext}>Let's Start <ChevronRightIcon size={18} /></button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || (step === 2 && !formData.schoolName)}>
              {saving ? 'Saving...' : step === 6 ? 'Go to Subscription Payment' : 'Save & Continue'} <ChevronRightIcon size={18} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        .setup-wizard-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(10px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .setup-wizard-card {
          background: var(--bg-card);
          width: 100%;
          max-width: 800px;
          border-radius: 24px;
          border: 1px solid var(--border);
          box-shadow: 0 40px 100px rgba(0,0,0,0.6);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .wizard-progress {
          display: flex;
          padding: 24px 30px;
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid var(--border);
          justify-content: space-between;
        }
        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          flex: 1;
          position: relative;
        }
        .progress-step:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 13px;
          left: 50%;
          width: 100%;
          height: 2px;
          background: var(--border);
          z-index: 1;
        }
        .progress-step.active:not(:last-child)::after {
          background: var(--primary);
          box-shadow: 0 0 10px var(--primary);
        }
        .step-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg);
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          z-index: 2;
          color: var(--text-muted);
          transition: all 0.4s;
        }
        .progress-step.active .step-number {
          border-color: var(--primary);
          color: var(--primary);
          background: var(--bg-card);
          transform: scale(1.1);
        }
        .progress-step.done .step-number {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
        }
        .step-title {
          font-size: 0.6rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }
        .progress-step.active .step-title { color: var(--text); }
        
        .wizard-content {
          padding: 40px;
          min-height: 480px;
          overflow-y: auto;
          max-height: 70vh;
        }
        .wizard-step-inner.text-left { text-align: left; }
        .wizard-hero-icon {
          width: 120px;
          height: 120px;
          border-radius: 34px;
          background: var(--primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 30px;
        }
        .wizard-hero-icon.success { background: rgba(34,197,94,0.1); }
        
        h2 { font-size: 1.6rem; font-weight: 800; margin-bottom: 6px; }
        p { color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6; font-size: 0.95rem; }
        
        .btn-tab {
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
        }
        .btn-tab.on { background: var(--bg-card); color: var(--primary); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        
        .label-sec { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; letter-spacing:0.05em; }
        .grade-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          background: var(--bg);
          border: 1px solid var(--border);
          margin-bottom: 6px;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.2s;
        }
        .grade-item.on { border-color: var(--primary); background: var(--primary-light); color: var(--primary); }
        
        .stream-box {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
        }
        .stream-box-hd { font-weight: 800; font-size: 0.8rem; margin-bottom: 12px; color: var(--primary); }
        .stream-tags { display: flex; flex-wrap: wrap; gap: 6px; min-height: 24px; }
        .tag {
          padding: 4px 10px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tag button { background:none; border:none; cursor:pointer; color: var(--danger); }
        
        .btn-add-sm {
          width: 32px;
          height: 32px;
          background: var(--text-main);
          color: #fff;
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        
        .btn-pill {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: var(--bg);
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .btn-pill.on { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
        
        .subjects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
        .subject-item {
          padding: 12px 16px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          font-size: 0.85rem;
        }
        .subject-item button { background:none; border:none; color: var(--danger); cursor:pointer; }
        
        .fees-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .fee-card { padding: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 16px; }
        .fee-card-name { font-weight: 800; font-size: 0.9rem; margin-bottom: 12px; }
        .fee-input-wrap { display: flex; align-items: center; border: 1.5px solid var(--border); border-radius: 10px; background: var(--bg-card); overflow:hidden; }
        .fee-input-wrap .unit { padding: 0 10px; font-weight: 800; font-size: 0.7rem; color: var(--text-muted); border-right: 1px solid var(--border); }
        .fee-input-wrap input { width: 100%; border: none; background: transparent; padding: 10px; font-weight: 700; outline: none; text-align: right; }
        
        .summary-list {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          max-width: 400px;
          margin: 0 auto 30px;
        }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .summary-row span { color: var(--text-muted); }
        .summary-row strong { color: var(--primary); }
        
        .next-action-note { font-size: 0.75rem; color: var(--text-light); display: flex; alignItems: center; gap: 6px; justify-content: center; }
        .empty-mini { grid-column: span 2; padding: 30px; text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.85rem; }
        
        .wizard-footer { padding: 24px 40px; background: rgba(255,255,255,0.02); border-top: 1px solid var(--border); display: flex; align-items: center; }

        @media (max-width: 768px) {
          .setup-wizard-overlay { padding: 0; }
          .setup-wizard-card { height: 100vh; max-height: 100vh; border-radius: 0; border: none; }
          .wizard-progress { padding: 15px 10px; }
          .step-title { display: none; }
          .progress-step:not(:last-child)::after { top: 11px; }
          .step-number { width: 22px; height: 22px; font-size: 0.65rem; }
          
          .wizard-content { padding: 20px; min-height: 0; flex: 1; }
          h2 { font-size: 1.3rem; }
          
          .form-grid-2 { grid-template-columns: 1fr; }
          .form-group { grid-column: span 1 !important; }
          
          .wizard-step-inner > div[style*="gridTemplateColumns"] { 
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          
          .streams-manager div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
          
          .fees-grid { grid-template-columns: 1fr; }
          
          .wizard-footer { padding: 15px 20px; }
          .btn-lg { width: 100%; justify-content: center; }
          
          .wizard-hero-icon { width: 80px; height: 80px; margin-bottom: 20px; }
          .wizard-hero-icon svg { width: 40px !important; height: 40px !important; }
          
          .grade-item { padding: 12px 16px; margin-bottom: 8px; }
          .tag { padding: 6px 12px; font-size: 0.85rem; }
        }
      `}</style>
    </div>
  );
}
