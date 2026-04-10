/**
 * SettingsTab.jsx — Platform Settings & Subscription Plan Builder
 *
 * Plans are stored in platform_settings.pricing as:
 * {
 *   "PlanName": {
 *     price        : 5999,       // KSh per term
 *     limit        : 5,        // student seats
 *     admins       : 5,          // staff accounts
 *     active       : true,       // visible on registration/landing
 *     trial_days   : 14,         // free trial period
 *     description  : "...",      // shown to schools on registration
 *     color        : "#10B981",  // accent colour for UI
 *     features     : [           // feature list displayed on landing page
 *       "CBC Report Cards",
 *       "M-PESA Integration",
 *       ...
 *     ]
 *   }
 * }
 *
 * When saved here, ALL of the following update automatically:
 *   - Registration page plan picker
 *   - School billing page
 *   - SuperAdmin schools table (plan badge, revenue column)
 *   - SuperAdmin activate modal (amount shown)
 *   - SuperAdmin change-plan modal (options listed)
 *   - Landing page pricing section (if it reads from settings)
 */

import { useState } from 'react';
import { calcExpiry } from '../superAdminUtils';
import { 
  CrossIcon, CheckIcon, RefreshIcon, SubscriptionsIcon
} from '../../../components/CommonIcons';
import { 
  ALL_SYSTEM_MODULES, FEATURE_SUGGESTIONS 
} from '../../../data/constants';



const PLAN_COLORS = [
  '#ffffff','#f4f4f5','#e1eed1','#e8A020','#D4506A','#71717a','#F97316',
];

const EMPTY_PLAN = {
  id          : '',
  name        : '',
  price       : 0,
  limit       : 5,
  admins      : 5,
  active      : true,
  trial_days  : 14,
  description : '',
  color       : PLAN_COLORS[0],
  features    : [],
  modules     : [],   // <-- Hard feature access control slugs
};

export default function SettingsTab({
  gwInstructions, setGwInstructions,
  statusMsg, setStatusMsg,
  subEndDate, setSubEndDate,
  plans, setPlans,
  smsConfig, setSmsConfig,
  mpesaConfig, setMpesaConfig,
  priceSaved, setPriceSaved,
  handleUpdateSetting,
  updatePlatformSetting,
  loadData,
  setMessage,
  onWipeSchools, // New prop for bulk cleanup
}) {
  const expiryInfo   = calcExpiry(subEndDate);
  const [expandedPlan, setExpandedPlan] = useState(null); // plan id being edited
  const [savingPricing, setSavingPricing] = useState(false);

  // ── Global settings ────────────────────────────────────────────────────
  const handleSaveGlobal = () => {
    let formattedDate = subEndDate;
    if (subEndDate) {
      const d = new Date(subEndDate);
      if (!isNaN(d.getTime())) formattedDate = d.toISOString();
    }
    handleUpdateSetting('billing',  { instructions: gwInstructions, expiry_date: formattedDate });
    handleUpdateSetting('platform', { status_message: statusMsg });
    handleUpdateSetting('sms',      smsConfig);
    handleUpdateSetting('mpesa_api', mpesaConfig);
  };

  // ── Plan management ────────────────────────────────────────────────────
  const addPlan = () => {
    const newPlan = {
      ...EMPTY_PLAN,
      id    : `new_${Date.now()}`,
      color : PLAN_COLORS[plans.length % PLAN_COLORS.length],
    };
    setPlans(p => [...p, newPlan]);
    setExpandedPlan(newPlan.id);
  };

  const updatePlan = (id, field, value) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addFeature = (id, feature) => {
    setPlans(prev => prev.map(p =>
      p.id === id ? { ...p, features: [...(p.features || []), feature] } : p
    ));
  };

  const removeFeature = (id, idx) => {
    setPlans(prev => prev.map(p =>
      p.id === id ? { ...p, features: p.features.filter((_, i) => i !== idx) } : p
    ));
  };

  const removePlan = (id) => {
    setPlans(prev => prev.filter(p => p.id !== id));
    if (expandedPlan === id) setExpandedPlan(null);
  };

  const toggleModule = (planId, slug) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const mods = p.modules || [];
      return { ...p, modules: mods.includes(slug) ? mods.filter(m => m !== slug) : [...mods, slug] };
    }));
  };

  const handleSavePricing = async () => {
    const invalid = plans.filter(p => !p.name.trim());
    if (invalid.length) {
      setMessage({ type:'error', text:'All plans must have a name.' });
      return;
    }
    setSavingPricing(true);
    try {
      const newPricing = {};
      plans.forEach(p => {
        const key = p.name.trim();
        newPricing[key] = {
          price       : Number(p.price) || 0,
          limit       : Number(p.limit) || 5,
          admins      : Number(p.admins) || 5,
          active      : p.active !== false,
          trial_days  : Number(p.trial_days) || 0,
          description : p.description || '',
          color       : p.color || PLAN_COLORS[0],
          features    : Array.isArray(p.features) ? p.features : [],
          modules     : Array.isArray(p.modules)  ? p.modules  : [],
        };
      });
      await updatePlatformSetting('pricing', newPricing);
      setPriceSaved(true);
      setTimeout(() => setPriceSaved(false), 3000);
      setMessage({ type:'success', text:'Pricing saved. All pages updated automatically.' });
      loadData();
    } catch (err) {
      setMessage({ type:'error', text: err.message });
    } finally { setSavingPricing(false); }
  };

  const S = {
    label  : { fontSize:'.52rem', color:'var(--sub)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:5, display:'block' },
    input  : { width:'100%', background:'var(--bg)', border:'1px solid var(--edge)', borderRadius:7, padding:'8px 11px', color:'var(--txt)', fontFamily:'var(--fb)', fontSize:'.78rem', outline:'none' },
    numInput: { background:'var(--bg)', border:'1px solid var(--edge)', borderRadius:6, padding:'7px 10px', color:'var(--txt)', fontFamily:"'Space Mono',monospace", fontSize:'.78rem', outline:'none', width:'100%' },
    chip   : { padding:'3px 9px', borderRadius:5, fontSize:'.65rem', cursor:'pointer', border:'1px solid rgba(255,255,255,.1)', background:'transparent', color:'var(--sub)', fontFamily:'var(--fb)', transition:'all .13s', display:'inline-block', marginRight:5, marginBottom:5 },
    fChip  : (added) => ({ padding:'2px 8px', borderRadius:4, fontSize:'.62rem', border:`1px solid ${added ? 'rgba(13,216,138,.3)' : 'rgba(255,255,255,.08)'}`, background: added ? 'rgba(13,216,138,.08)' : 'transparent', color: added ? 'var(--te)' : 'var(--sub)', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4, marginRight:4, marginBottom:4, transition:'all .13s' }),
  };

  return (
    <div className="tv">
      <div className="grid-2">

        {/* ── Global Settings ─────────────────────────────────────────── */}
        <div className="lp">
          <div className="lp-t">Global Settings</div>

          <div style={{ marginBottom:14 }}>
            <label style={S.label}>M-PESA Gateway Instructions</label>
            <textarea rows={4} style={{ ...S.input, resize:'vertical' }}
              placeholder="Payment instructions shown to schools on the billing page..."
              value={gwInstructions}
              onChange={e => setGwInstructions(e.target.value)} />
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={S.label}>Platform Status Message</label>
            <input type="text" style={S.input}
              placeholder="e.g. System maintenance on Sunday 10pm–12am"
              value={statusMsg}
              onChange={e => setStatusMsg(e.target.value)} />
            <div style={{ fontSize:'.6rem', color:'var(--sub)', marginTop:4 }}>
              Shown as a banner to all logged-in users when set.
            </div>
          </div>

          <div style={{ marginBottom:20, padding:'16px 0', borderTop:'1px solid var(--edge)', borderBottom:'1px solid var(--edge)' }}>
            <label style={{ ...S.label, color:'var(--vi)', marginBottom:12 }}>Platform Integration Gateways (HQ Only)</label>
            
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:'.62rem', color:'var(--sub2)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>SMS (Platform Notifications)</div>
              <div style={{ fontSize:'.55rem', color:'var(--sub)', marginBottom:6, fontStyle:'italic' }}>Used for system-wide alerts and ShuleSoft HQ communications.</div>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <input type="text" style={{ ...S.input, flex:2 }} placeholder="Sender ID" value={smsConfig.senderId} onChange={e => setSmsConfig({...smsConfig, senderId: e.target.value.toUpperCase()})} />
                <input type="password" style={{ ...S.input, flex:3 }} placeholder="API Key" value={smsConfig.apiKey} onChange={e => setSmsConfig({...smsConfig, apiKey: e.target.value})} />
              </div>
            </div>

            <div style={{ marginBottom:4 }}>
              <div style={{ fontSize:'.62rem', color:'var(--sub2)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>M-Pesa (Platform Revenue)</div>
              <div style={{ fontSize:'.55rem', color:'var(--sub)', marginBottom:6, fontStyle:'italic' }}>Used for school's subscription payments to ShuleSoft.</div>
              <input type="text" style={{ ...S.input, marginBottom:8 }} placeholder="Shortcode" value={mpesaConfig.shortcode} onChange={e => setMpesaConfig({...mpesaConfig, shortcode: e.target.value})} />
              <div style={{ display:'flex', gap:8 }}>
                <input type="password" style={{ ...S.input }} placeholder="Consumer Key" value={mpesaConfig.consumerKey} onChange={e => setMpesaConfig({...mpesaConfig, consumerKey: e.target.value})} />
                <input type="password" style={{ ...S.input }} placeholder="Consumer Secret" value={mpesaConfig.consumerSecret} onChange={e => setMpesaConfig({...mpesaConfig, consumerSecret: e.target.value})} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={S.label}>
              Global Subscription End Date{' '}
              <span style={{ color:'var(--sub)', textTransform:'none', letterSpacing:0 }}>(applies to all schools)</span>
            </label>
            <input type="date" style={{ ...S.input, colorScheme:'dark', appearance:'none' }}
              value={subEndDate}
              onChange={e => setSubEndDate(e.target.value)} />
            {subEndDate && expiryInfo && (
              <div style={{ marginTop:10, padding:'10px 13px', borderRadius:7, background:'rgba(212,80,106,.07)', border:'1px solid rgba(212,80,106,.18)' }}>
                <div style={{ fontSize:'.55rem', color:'var(--sub)', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:3 }}>
                  All subscriptions expire on
                </div>
                <div style={{ fontFamily:'var(--fh)', fontSize:'.88rem', fontWeight:700, color:'var(--ro)' }}>
                  {expiryInfo.label}
                </div>
                <div style={{ fontSize:'.62rem', color:expiryInfo.color, marginTop:3 }}>
                  {expiryInfo.note}
                </div>
              </div>
            )}
          </div>

          <button className="save-btn" onClick={handleSaveGlobal} style={{ width:'100%' }}>
            Save Global Settings
          </button>

          {/* ── System Maintenance ── */}
          <div style={{ marginTop:24, padding:'20px', borderRadius:11, background:'rgba(212,80,106,.05)', border:'1px solid rgba(212,80,106,.15)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <RefreshIcon size={18} color="var(--ro)" />
              <div style={{ fontFamily:'var(--fh)', fontSize:'.85rem', fontWeight:800, color:'var(--ro)', letterSpacing:'-0.01em' }}>System Maintenance</div>
            </div>
            
            <p style={{ fontSize:'.68rem', color:'var(--sub)', lineHeight:1.6, marginBottom:16 }}>
              Perform a bulk cleanup of the entire platform. This will permanently delete all school workspaces, students, and staff <strong style={{ color:'#fff' }}>EXCEPT</strong> the ShuleSoft HQ admin workspace.
            </p>

            <button 
              onClick={onWipeSchools}
              style={{ 
                width:'100%', padding:'10px', borderRadius:8, background:'rgba(212,80,106,.1)', 
                border:'1px solid rgba(212,80,106,.25)', color:'var(--ro)', fontSize:'.72rem', 
                fontWeight:700, cursor:'pointer', transition:'all .2s' 
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(212,80,106,.15)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(212,80,106,.1)'}
            >
              Terminate All Non-Admin Schools
            </button>
            <div style={{ fontSize:'.55rem', color:'rgba(212,80,106,.6)', marginTop:8, textAlign:'center' }}>
              Warning: This action is irreversible.
            </div>
          </div>
        </div>

        {/* ── Subscription Plan Builder ────────────────────────────────── */}
        <div className="lp" style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div className="lp-t" style={{ margin:0 }}>Subscription Plans</div>
            <button onClick={addPlan}
              style={{ padding:'5px 12px', borderRadius:6, background:'rgba(124,92,252,.1)', border:'1px solid rgba(124,92,252,.25)', color:'var(--vi)', fontSize:'.68rem', fontWeight:700, cursor:'pointer' }}>
              + New Plan
            </button>
          </div>
          <div style={{ fontSize:'.65rem', color:'var(--sub)', marginBottom:14, lineHeight:1.5 }}>
            Plans appear on the registration and billing pages automatically. Features, limits, and prices update everywhere when saved.
          </div>

          {plans.length === 0 ? (
            <div className="empty" style={{ flex:1 }}>
              <div style={{ marginBottom:8, opacity:.4, color:'var(--sub)' }}><SubscriptionsIcon size={32} /></div>
              <div style={{ fontSize:'.8rem', color:'var(--sub)' }}>No plans yet. Add your first plan.</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8, flex:1, overflowY:'auto' }}>
              {plans.map((plan) => {
                const isOpen = expandedPlan === plan.id;
                const existingFeatures = plan.features || [];

                return (
                  <div key={plan.id} style={{
                    background:'var(--bg)', border:`1px solid ${isOpen ? 'rgba(124,92,252,.3)' : 'var(--edge)'}`,
                    borderRadius:9, overflow:'hidden', transition:'all .2s',
                  }}>
                    {/* Plan header row */}
                    <div
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 13px', cursor:'pointer' }}
                      onClick={() => setExpandedPlan(isOpen ? null : plan.id)}
                    >
                      <div style={{ width:10, height:10, borderRadius:'50%', background: plan.color || 'var(--vi)', flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'var(--fh)', fontSize:'.75rem', fontWeight:700, color: plan.active ? '#fff' : 'var(--sub)', display:'flex', alignItems:'center', gap:8 }}>
                          {plan.name || 'Unnamed Plan'}
                          {!plan.active && <span style={{ fontSize:'.55rem', padding:'1px 6px', borderRadius:3, background:'rgba(255,255,255,.06)', color:'var(--sub)', fontWeight:600 }}>Hidden</span>}
                        </div>
                        <div style={{ fontSize:'.62rem', color:'var(--sub)', marginTop:1 }}>
                          KSh {Number(plan.price || 0).toLocaleString()} / term · {plan.limit || 0} students · {plan.admins || 0} staff
                        </div>
                      </div>
                      <div style={{ fontSize:'.65rem', color:'var(--sub)' }}>
                        {(plan.modules || []).length} Enabled
                      </div>
                      <div style={{ fontSize:10, color:'var(--sub)', transform: isOpen ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>▾</div>
                    </div>

                    {/* Plan editor (expanded) */}
                    {isOpen && (
                      <div style={{ padding:'0 13px 14px', borderTop:'1px solid var(--edge)' }}>
                        <div className="grid-2" style={{ marginTop:12 }}>
                          <div>
                            <label style={S.label}>Plan Name *</label>
                            <input style={{ ...S.input, fontWeight:700 }} type="text"
                              placeholder="e.g. Starter" value={plan.name}
                              onChange={e => updatePlan(plan.id, 'name', e.target.value)} />
                          </div>
                          <div>
                            <label style={S.label}>Accent Colour</label>
                            <div style={{ display:'flex', gap:6, marginTop:2 }}>
                              {PLAN_COLORS.map(c => (
                                <div key={c} onClick={() => updatePlan(plan.id, 'color', c)}
                                  style={{ width:20, height:20, borderRadius:'50%', background:c, cursor:'pointer', flexShrink:0, border: plan.color === c ? '2px solid #fff' : '2px solid transparent', transform: plan.color === c ? 'scale(1.15)' : 'none', transition:'all .13s' }} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="grid-3">
                          <div>
                            <label style={S.label}>Price (KSh / term)</label>
                            <input style={S.numInput} type="number" min={0}
                              value={plan.price} onChange={e => updatePlan(plan.id, 'price', e.target.value)} />
                          </div>
                          <div>
                            <label style={S.label}>Student Limit</label>
                            <input style={S.numInput} type="number" min={1}
                              value={plan.limit} onChange={e => updatePlan(plan.id, 'limit', e.target.value)} />
                          </div>
                          <div>
                            <label style={S.label}>Staff Accounts</label>
                            <input style={S.numInput} type="number" min={1}
                              value={plan.admins || 5} onChange={e => updatePlan(plan.id, 'admins', e.target.value)} />
                          </div>
                        </div>
                        <div className="grid-2">
                          <div>
                            <label style={S.label}>Free Trial (days, 0 = no trial)</label>
                            <input style={S.numInput} type="number" min={0}
                              value={plan.trial_days || 0} onChange={e => updatePlan(plan.id, 'trial_days', e.target.value)} />
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                            <label style={{ ...S.label, cursor:'pointer', userSelect:'none', display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                              <input type="checkbox" checked={plan.active !== false}
                                onChange={e => updatePlan(plan.id, 'active', e.target.checked)}
                                style={{ accentColor:'var(--te)', width:15, height:15 }} />
                              <span style={{ fontSize:'.72rem', color: plan.active !== false ? 'var(--te)' : 'var(--sub)', fontWeight:600 }}>
                                {plan.active !== false ? 'Visible on registration' : 'Hidden from schools'}
                              </span>
                            </label>
                          </div>
                        </div>

                        <div style={{ marginBottom:12 }}>
                          <label style={S.label}>Plan Description (shown to schools)</label>
                          <textarea rows={2} style={{ ...S.input, resize:'vertical' }}
                            placeholder="Brief description of what this plan includes..."
                            value={plan.description || ''}
                            onChange={e => updatePlan(plan.id, 'description', e.target.value)} />
                        </div>

                        {/* ── MODULE ACCESS TOGGLES (Hard Feature Gating) ─── */}
                        <div style={{ marginBottom:14 }}>
                          <label style={{ ...S.label, color:'var(--vi)', marginBottom:8 }}>Module Access Control</label>
                          <div style={{ fontSize:'.58rem', color:'var(--sub)', marginBottom:10, lineHeight:1.5 }}>
                            Toggle system modules ON/OFF for this plan. Schools on this plan will only see enabled modules in their sidebar.
                          </div>
                          <div style={{ 
                            display:'grid', 
                            gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', 
                            gap:8, 
                            maxHeight:400, 
                            overflowY:'auto', 
                            overflowX:'auto', 
                            padding:'4px',
                            background:'rgba(255,255,255,0.02)',
                            borderRadius:8,
                            border:'1px solid rgba(255,255,255,0.05)'
                          }}>
                            {ALL_SYSTEM_MODULES.map(mod => {
                              const enabled = (plan.modules || []).includes(mod.slug);
                              return (
                                <div key={mod.slug}
                                  onClick={() => toggleModule(plan.id, mod.slug)}
                                  style={{
                                    display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                                    borderRadius:7, cursor:'pointer', transition:'all .15s',
                                    background: enabled ? 'rgba(13,216,138,.06)' : 'var(--bg)',
                                    border: `1px solid ${enabled ? 'rgba(13,216,138,.25)' : 'var(--edge)'}`,
                                  }}>
                                  <div style={{ flexShrink:0, display:'flex', alignItems:'center', color: enabled ? 'var(--te)' : 'var(--sub)' }}>
                                    <mod.icon size={18} />
                                  </div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ fontSize:'.68rem', fontWeight:700, color: enabled ? 'var(--te)' : 'var(--sub)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                      {mod.label}
                                    </div>
                                    <div style={{ fontSize:'.52rem', color:'var(--sub)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                      {mod.desc}
                                    </div>
                                  </div>
                                  <div style={{
                                    width:32, height:18, borderRadius:9, position:'relative', transition:'all .2s',
                                    background: enabled ? 'var(--te)' : 'rgba(255,255,255,.1)',
                                    border: `1px solid ${enabled ? 'rgba(13,216,138,.4)' : 'rgba(255,255,255,.15)'}`,
                                    flexShrink:0,
                                  }}>
                                    <div style={{
                                      width:12, height:12, borderRadius:'50%', background:'#fff',
                                      position:'absolute', top:2, transition:'left .2s',
                                      left: enabled ? 16 : 3,
                                      boxShadow:'0 1px 3px rgba(0,0,0,.3)',
                                    }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ marginTop:8, padding:'8px 12px', borderRadius:6, background:'rgba(124,92,252,.06)', border:'1px solid rgba(124,92,252,.15)', fontSize:'.6rem', color:'var(--sub)', lineHeight:1.5, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span><strong style={{ color:'var(--vi)', fontFamily:'var(--fh)' }}>{(plan.modules || []).length}</strong> of {ALL_SYSTEM_MODULES.length} modules enabled</span>
                            {(plan.modules || []).length === 0 && <span style={{ color:'var(--ro)', fontSize:'.55rem' }}>No access beyond dashboard</span>}
                            {(plan.modules || []).length > 0 && (plan.modules || []).length < ALL_SYSTEM_MODULES.length && <span style={{ color:'var(--am)', fontSize:'.55rem' }}>Partial access</span>}
                            {(plan.modules || []).length === ALL_SYSTEM_MODULES.length && <span style={{ color:'var(--te)', fontSize:'.55rem' }}>Full access</span>}
                          </div>
                        </div>

                        {/* ── MARKETING FEATURES (Text bullets for landing page) ─── */}
                        <div style={{ marginBottom:10 }}>
                          <label style={S.label}>Marketing Features (Landing Page Display)</label>

                          {/* Current features */}
                          {existingFeatures.length > 0 && (
                            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
                              {existingFeatures.map((f, i) => (
                                <div key={i} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px', borderRadius:5, background:'rgba(13,216,138,.08)', border:'1px solid rgba(13,216,138,.2)', fontSize:'.65rem', color:'var(--te)' }}>
                                  {f}
                                  <button onClick={() => removeFeature(plan.id, i)}
                                    style={{ background:'none', border:'none', color:'rgba(13,216,138,.6)', cursor:'pointer', padding:0, display:'flex', alignItems:'center' }}><CrossIcon size={12} /></button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Quick-add suggestions */}
                          <div style={{ fontSize:'.58rem', color:'var(--sub)', marginBottom:6 }}>Quick add:</div>
                          <div style={{ maxHeight:120, overflowY:'auto' }}>
                            {FEATURE_SUGGESTIONS.filter(f => !existingFeatures.includes(f)).map(f => (
                              <button key={f} style={S.fChip(false)}
                                onClick={() => addFeature(plan.id, f)}>
                                + {f}
                              </button>
                            ))}
                          </div>

                          {/* Custom feature input */}
                          <div style={{ display:'flex', gap:6, marginTop:8 }}>
                            <input type="text" style={{ ...S.input, flex:1 }}
                              placeholder="Type a custom feature and press Enter"
                              id={`custom-feat-${plan.id}`}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && e.target.value.trim()) {
                                  addFeature(plan.id, e.target.value.trim());
                                  e.target.value = '';
                                }
                              }} />
                            <button
                              onClick={() => {
                                const el = document.getElementById(`custom-feat-${plan.id}`);
                                if (el && el.value.trim()) { addFeature(plan.id, el.value.trim()); el.value = ''; }
                              }}
                              style={{ padding:'7px 12px', borderRadius:7, background:'rgba(124,92,252,.15)', border:'1px solid rgba(124,92,252,.3)', color:'var(--vi)', fontSize:'.72rem', cursor:'pointer', whiteSpace:'nowrap' }}>
                              + Add
                            </button>
                          </div>
                        </div>

                        {/* Plan actions */}
                        <div style={{ display:'flex', gap:8, justifyContent:'space-between', marginTop:14, paddingTop:12, borderTop:'1px solid var(--edge)' }}>
                          <button onClick={() => removePlan(plan.id)}
                            style={{ padding:'6px 14px', borderRadius:7, background:'rgba(212,80,106,.08)', border:'1px solid rgba(212,80,106,.2)', color:'var(--ro)', fontSize:'.72rem', cursor:'pointer', fontWeight:600 }}>
                            Delete Plan
                          </button>
                          <button onClick={() => setExpandedPlan(null)}
                            style={{ padding:'6px 14px', borderRadius:7, background:'transparent', border:'1px solid var(--edge2)', color:'var(--sub)', fontSize:'.72rem', cursor:'pointer' }}>
                            Collapse
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Save pricing */}
          <div style={{ marginTop:12, display:'flex', gap:8 }}>
            <button className="save-btn" style={{ flex:1 }}
              onClick={handleSavePricing} disabled={savingPricing}>
              {savingPricing ? 'Saving...' : 'Save All Plans'}
            </button>
            <button onClick={loadData}
              style={{ padding:'9px 14px', borderRadius:7, background:'transparent', border:'1px solid var(--edge2)', color:'var(--sub)', fontFamily:'var(--fb)', fontSize:'.76rem', cursor:'pointer' }}>
              Reset
            </button>
          </div>
          {priceSaved && (
            <div style={{ marginTop:10, padding:'8px 12px', borderRadius:7, background:'rgba(13,216,138,.08)', border:'1px solid rgba(13,216,138,.2)', fontSize:'.72rem', color:'var(--te)', display:'flex', alignItems:'center', gap:6 }}>
              <CheckIcon size={12} /> Plans saved — registration, billing, and admin pages updated.
            </div>
          )}
        </div>
      </div>

      {/* ── Suggested subscription tiers (read-only guide) ─────────────── */}
      <div className="lp" style={{ marginBottom:14 }}>
        <div className="lp-t" style={{ marginBottom:6 }}>Recommended Tier Guide</div>
        <div style={{ fontSize:'.68rem', color:'var(--sub)', marginBottom:14, lineHeight:1.5 }}>
          Reference guide for Kenyan school market pricing. Use the plan builder above to create and customise your actual plans.
        </div>
        <div className="tier-grid">
          {[
            {
              name:'Starter', price:'KSh 4,999', color:'#0DD88A',
              limit:'Up to 100 students · 3 staff',
              trial:'14-day free trial',
              modules: 12,
              features:[
                'Student Management', 'Staff Management', 'Attendance Tracking', 'Dashboard & Analytics',
                'CBC Report Cards (PP1–G9)', 'CBC Competency Grading', 'Fee & Billing Engine',
                'Fee Structure Builder', 'Student Fee Statements', 'M-Pesa Paybill Integration',
                'M-Pesa Receipt Generation', 'Email Support',
              ],
            },
            {
              name:'School', price:'KSh 9,999', color:'#e4e4e7',
              limit:'Up to 300 students · 10 staff',
              trial:'14-day free trial',
              popular:true,
              modules: 22,
              features:[
                'Everything in Starter',
                'KCSE / KCPE Report Cards (8-4-4)', 'Academic Grading & Reports',
                'Timetable Builder', 'Automated Timetable Generation', 'Exam Scheduling',
                'M-Pesa STK Push', 'SMS & Communications', 'Parent SMS Notifications',
                'NEMIS Data Export', 'Bulk Student Import (CSV)', 'Multi-Stream Support',
                'Multiple Academic Periods', 'Priority Support',
              ],
            },
            {
              name:'Academy', price:'KSh 24,999', color:'#E8A020',
              limit:'Up to 1,000 students · Unlimited staff',
              trial:'30-day free trial',
              modules: 35,
              features:[
                'Everything in School',
                'Teacher Mobile Portal', 'Parent & Student Portal',
                'E-Learning / LMS', 'Library Management',
                'WhatsApp Fee Reminders', 'Airtel Money Integration',
                'Smart Analytics & Insights', 'Data Recovery Tools',
                'Custom Branding', 'API Access', 'Dedicated Account Manager',
              ],
            },
          ].map(tier => (
            <div key={tier.name} style={{
              background:'var(--bg)', border:`1px solid ${tier.popular ? 'rgba(124,92,252,.3)' : 'var(--edge)'}`,
              borderRadius:10, padding:14, position:'relative',
            }}>
              {tier.popular && (
                <div style={{ position:'absolute', top:-1, right:14, background:'var(--vi)', color:'#fff', fontSize:'.5rem', fontWeight:700, padding:'2px 8px', borderRadius:'0 0 5px 5px', letterSpacing:'.06em' }}>
                  POPULAR
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:tier.color }} />
                <div style={{ fontFamily:'var(--fh)', fontSize:'.75rem', fontWeight:700, color:'#fff' }}>{tier.name}</div>
              </div>
              <div style={{ fontFamily:'var(--fh)', fontSize:'1rem', fontWeight:700, color:tier.color, marginBottom:3 }}>{tier.price}</div>
              <div style={{ fontSize:'.6rem', color:'var(--sub)', marginBottom:3 }}>per term</div>
              <div style={{ fontSize:'.62rem', color:'var(--sub)', marginBottom:6, paddingBottom:6, borderBottom:'1px solid var(--edge)' }}>{tier.limit}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontSize:'.6rem', color:'var(--te)', display:'flex', alignItems:'center', gap:4 }}><CheckIcon size={10} /> {tier.trial}</div>
                <div style={{ fontSize:'.55rem', color:'var(--vi)', fontWeight:600 }}>{tier.modules} modules</div>
              </div>
              {tier.features.map(f => (
                <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:4 }}>
                  <CheckIcon size={12} color="var(--te)" style={{ flexShrink:0, marginTop:1 }} />
                  <span style={{ fontSize:'.63rem', color:'var(--sub)' }}>{f}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
