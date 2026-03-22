import { calcExpiry } from '../superAdminUtils';

export default function SettingsTab({
  gwInstructions, setGwInstructions,
  statusMsg, setStatusMsg,
  subEndDate, setSubEndDate,
  plans, setPlans,
  priceSaved,
  handleUpdateSetting,
  updatePlatformSetting,
  loadData,
  setMessage,
  setPriceSaved,
}) {
  const expiryInfo = calcExpiry(subEndDate);

  const handleSaveGlobal = () => {
    let formattedDate = subEndDate;
    if (subEndDate) {
      const d = new Date(subEndDate);
      if (!isNaN(d.getTime())) formattedDate = d.toISOString();
    }
    handleUpdateSetting('billing',  { instructions: gwInstructions, expiry_date: formattedDate });
    handleUpdateSetting('platform', { status_message: statusMsg });
  };

  const handleSavePricing = async () => {
    const newPricing = {};
    plans.forEach(p => {
      const key = p.name.trim() || p.id;
      newPricing[key] = { price: p.price, limit: p.limit, active: p.active, features: p.features || [] };
    });
    try {
      await updatePlatformSetting('pricing', newPricing);
      setPriceSaved(true);
      setTimeout(() => setPriceSaved(false), 3000);
      loadData();
    } catch (err) {
      setMessage({ type:'error', text: err.message });
    }
  };

  return (
    <div className="tv">
      <div className="bot-grid" style={{ marginBottom:12 }}>
        {/* ── Global Settings ── */}
        <div className="lp">
          <div className="lp-t">⚙️ Global Settings</div>

          <div style={{ marginBottom:14 }}>
            <div className="sb-lbl" style={{ marginBottom:6 }}>Gateway Instructions</div>
            <textarea rows={4} placeholder="Enter M-PESA gateway instructions..."
              value={gwInstructions} onChange={e => setGwInstructions(e.target.value)} />
          </div>

          <div style={{ marginBottom:14 }}>
            <div className="sb-lbl" style={{ marginBottom:6 }}>Platform Status Message</div>
            <input type="text" value={statusMsg} onChange={e => setStatusMsg(e.target.value)} />
          </div>

          <div style={{ marginBottom:18 }}>
            <div className="sb-lbl" style={{ marginBottom:6 }}>
              Subscription End Date <span style={{ color:'var(--sub)' }}>(all schools)</span>
            </div>
            <input type="date" value={subEndDate} onChange={e => setSubEndDate(e.target.value)} />
            {subEndDate && expiryInfo && (
              <div style={{ marginTop:10, padding:'10px 13px', borderRadius:7, background:'rgba(212,80,106,.08)', border:'1px solid rgba(212,80,106,.18)' }}>
                <div style={{ fontSize:'.58rem', color:'var(--sub)', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:4 }}>
                  All subscriptions auto-expire on
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

          <button className="save-btn" onClick={handleSaveGlobal}>Save Changes</button>
        </div>

        {/* ── Pricing Control ── */}
        <div className="lp">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div className="lp-t" style={{ marginBottom:0 }}>💰 Pricing Control</div>
            <button
              onClick={() => setPlans(p => [...p, { id:`new_${Date.now()}`, name:'New Plan', price:5000, limit:500, active:true, features:[] }])}
              style={{ padding:'4px 10px', borderRadius:6, background:'rgba(124,92,252,.1)', border:'1px solid rgba(124,92,252,.2)', color:'var(--vi)', fontSize:'.65rem', fontWeight:700, cursor:'pointer' }}>
              + Add Plan
            </button>
          </div>

          <p style={{ fontSize:'.7rem', color:'var(--sub)', marginBottom:16, lineHeight:1.6 }}>
            Set custom names, costs, and limits. Toggled plans appear globally on landing and registration pages.
          </p>

          {plans.map((p, idx) => (
            <div key={p.id} style={{ background:'var(--bg)', border:'1px solid var(--edge)', borderRadius:8, padding:'12px 14px', marginBottom:10, opacity:p.active ? 1 : .5, transition:'opacity .2s' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                  <input type="text" value={p.name}
                    onChange={e => { const n = [...plans]; n[idx].name = e.target.value; setPlans(n); }}
                    style={{ background:'transparent', border:'none', padding:0, fontSize:'.82rem', fontWeight:700, width:'100%', color:'#fff', outline:'none' }}
                    placeholder="Plan Name" />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', userSelect:'none' }}>
                    <input type="checkbox" checked={p.active}
                      onChange={e => { const n = [...plans]; n[idx].active = e.target.checked; setPlans(n); }}
                      style={{ accentColor:'var(--te)' }} />
                    <span style={{ fontSize:'.6rem', color: p.active ? 'var(--te)' : 'var(--sub)', fontWeight:600 }}>
                      {p.active ? 'Public' : 'Hidden'}
                    </span>
                  </label>
                  <button onClick={() => setPlans(plans.filter((_, i) => i !== idx))}
                    style={{ background:'transparent', border:'none', color:'var(--ro)', fontSize:'11px', cursor:'pointer', padding:4 }}>
                    ✕
                  </button>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <div className="sb-lbl" style={{ marginBottom:4, fontSize:'.55rem' }}>Price (KSh / term)</div>
                  <input type="number" value={p.price}
                    onChange={e => { const n = [...plans]; n[idx].price = Number(e.target.value); setPlans(n); }}
                    style={{ width:'100%', background:'var(--panel)', border:'1px solid var(--edge2)', borderRadius:6, padding:'6px 8px', color:'var(--txt)', fontFamily:'var(--fh)', fontSize:'.76rem' }} />
                </div>
                <div>
                  <div className="sb-lbl" style={{ marginBottom:4, fontSize:'.55rem' }}>Student Limit</div>
                  <input type="number" value={p.limit}
                    onChange={e => { const n = [...plans]; n[idx].limit = Number(e.target.value); setPlans(n); }}
                    style={{ width:'100%', background:'var(--panel)', border:'1px solid var(--edge2)', borderRadius:6, padding:'6px 8px', color:'var(--txt)', fontFamily:'var(--fh)', fontSize:'.76rem' }} />
                </div>
              </div>
            </div>
          ))}

          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
            <button className="save-btn" style={{ flex:1 }} onClick={handleSavePricing}>
              Save Pricing
            </button>
            <button onClick={loadData}
              style={{ padding:'9px 14px', borderRadius:7, background:'transparent', border:'1px solid var(--edge2)', color:'var(--sub)', fontFamily:'var(--fb)', fontSize:'.76rem', cursor:'pointer' }}>
              Reset
            </button>
          </div>

          {priceSaved && (
            <div style={{ marginTop:10, padding:'8px 12px', borderRadius:7, background:'rgba(13,216,138,.1)', border:'1px solid rgba(13,216,138,.2)', fontSize:'.72rem', color:'var(--te)' }}>
              ✓ Pricing updated successfully
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
