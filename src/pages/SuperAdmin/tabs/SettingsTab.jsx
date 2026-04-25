import { useState } from 'react';
import { calcExpiry } from '../superAdminUtils';
import { 
  RocketIcon, RefreshIcon, ShieldIcon
} from '../../../components/CommonIcons';

export default function SettingsTab({
  statusMsg, setStatusMsg,
  subEndDate, setSubEndDate,
  smsConfig, setSmsConfig,
  handleUpdateSetting,
  setMessage,
  onWipeSchools,
}) {
  const S = {
    label  : { fontSize:'.52rem', color:'var(--sub)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:5, display:'block' },
    input  : { width:'100%', background:'var(--bg)', border:'1px solid var(--edge)', borderRadius:7, padding:'8px 11px', color:'var(--txt)', fontFamily:'var(--fb)', fontSize:'.78rem', outline:'none' },
    card   : { padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--edge)', marginBottom: 20 }
  };

  const expiryInfo = calcExpiry(subEndDate);

  const handleSaveGlobal = () => {
    handleUpdateSetting('platform', { status_message: statusMsg });
    handleUpdateSetting('sms',      smsConfig);
    setMessage({ type: 'success', text: 'Platform configuration updated.' });
  };

  return (
    <div className="tv" style={{ maxWidth: 1000, margin: '0 auto' }}>
      
      <div className="grid-2">
        
        {/* --- LEFT: CORE CONFIG --- */}
        <div>
          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                <RocketIcon size={16} />
              </div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Platform Configuration</h3>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={S.label}>Global Status Message</label>
              <input type="text" style={S.input}
                placeholder="e.g. System maintenance on Sunday 10pm–12am"
                value={statusMsg}
                onChange={e => setStatusMsg(e.target.value)} />
              <div style={{ fontSize:'.6rem', color:'var(--sub)', marginTop:4 }}>
                Shown as a banner to all schools when active.
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={S.label}>Platform Expiry Lock</label>
              <input type="date" style={{ ...S.input, colorScheme:'dark' }}
                value={subEndDate}
                onChange={e => setSubEndDate(e.target.value)} />
              {subEndDate && expiryInfo && (
                <div style={{ marginTop:10, padding:'10px 13px', borderRadius:7, background:'rgba(212,80,106,.07)', border:'1px solid rgba(212,80,106,.18)' }}>
                  <div style={{ fontSize:'.55rem', color:'var(--sub)', textTransform:'uppercase', marginBottom:3 }}>System-wide Expiry</div>
                  <div style={{ fontFamily:'var(--fh)', fontSize:'.88rem', fontWeight:700, color:'var(--ro)' }}>{expiryInfo.label}</div>
                  <div style={{ fontSize:'.62rem', color:expiryInfo.color, marginTop:3 }}>{expiryInfo.note}</div>
                </div>
              )}
            </div>

            <button className="act-btn" onClick={handleSaveGlobal} style={{ width:'100%', padding: '12px' }}>
              Save Configuration
            </button>
          </div>

          {/* --- DANGER ZONE --- */}
          <div style={{ ...S.card, border: '1px solid rgba(212,80,106,0.2)', background: 'rgba(212,80,106,0.02)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <RefreshIcon size={18} color="var(--ro)" />
              <div style={{ fontFamily:'var(--fh)', fontSize:'.85rem', fontWeight:800, color:'var(--ro)' }}>System Maintenance</div>
            </div>
            <p style={{ fontSize:'.68rem', color:'var(--sub)', lineHeight:1.6, marginBottom:16 }}>
              Wipe all non-admin school data. This permanently deletes all school workspaces, students, and staff records.
            </p>
            <button onClick={onWipeSchools} style={{ width:'100%', padding:'10px', borderRadius:8, background:'rgba(212,80,106,0.1)', border:'1px solid rgba(212,80,106,0.2)', color:'var(--ro)', fontSize:'.72rem', fontWeight:700, cursor:'pointer' }}>
              Terminate All School Data
            </button>
          </div>
        </div>

        {/* --- RIGHT: GATEWAYS --- */}
        <div>
          <div style={S.card}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <ShieldIcon size={16} />
                </div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Communication Gateways</h3>
             </div>
             
             <div style={{ marginBottom:20 }}>
                <label style={S.label}>SMS Platform API (System Alerts)</label>
                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <input type="text" style={{ ...S.input, flex:1 }} placeholder="Sender ID" value={smsConfig.senderId} onChange={e => setSmsConfig({...smsConfig, senderId: e.target.value.toUpperCase()})} />
                  <input type="password" style={{ ...S.input, flex:2 }} placeholder="API Key" value={smsConfig.apiKey} onChange={e => setSmsConfig({...smsConfig, apiKey: e.target.value})} />
                </div>
                <div style={{ fontSize:'.6rem', color:'var(--sub)', marginTop:4 }}>
                  Used for system-wide notifications and onboarding alerts.
                </div>
             </div>
          </div>

          <div style={{ padding: 20, textAlign: 'center', color: 'var(--sub)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🛡️</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>Secure Infrastructure</div>
            <p style={{ fontSize: '0.65rem', marginTop: 4 }}>Platform security and integrity are managed via HQ protocols.</p>
          </div>
        </div>

      </div>

    </div>
  );
}
