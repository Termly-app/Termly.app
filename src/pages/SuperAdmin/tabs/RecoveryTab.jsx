import { fmtDate } from '../superAdminUtils';

export default function RecoveryTab({ discoveryMeta, repairingId, handleRepair }) {
  return (
    <div className="tv">
      <div className="page-hd">
        <div className="ph-left">
          <div className="ph-ico">🛡️</div>
          <div>
            <div className="ph-title">Data Discovery &amp; Recovery</div>
            <div className="ph-sub">Integrity Audit &amp; Legacy Import</div>
          </div>
        </div>
      </div>

      <div className="bot-grid">
        {/* ── Orphaned schools ── */}
        <div className="lp">
          <div className="lp-t">Orphaned Schools ({discoveryMeta.orphans.length})</div>
          <div style={{ fontSize:'.68rem', color:'var(--sub)', marginBottom:16, lineHeight:1.4 }}>
            These accounts exist in the database but are missing metadata profiles.
            They do not appear in dashboard metrics.
          </div>

          {discoveryMeta.orphans.length === 0 ? (
            <div className="empty">
              <div className="empty-ico">✅</div>No orphaned accounts found.
            </div>
          ) : (
            discoveryMeta.orphans.map(s => (
              <div className="li" key={s.id}
                style={{ background:'rgba(255,255,255,0.02)', padding:12, borderRadius:8, marginBottom:8 }}>
                <div className="li-l">
                  <div className="li-ico ni-r">🏫</div>
                  <div>
                    <div className="li-name">{s.name}</div>
                    <div className="li-sub">Created: {fmtDate(s.created_at)}</div>
                  </div>
                </div>
                <button className="act-btn"
                  style={{ background:'rgba(13,216,138,.1)', color:'var(--te)', borderColor:'rgba(13,216,138,.3)' }}
                  disabled={repairingId === s.id}
                  onClick={() => handleRepair(s.id, s.name)}>
                  {repairingId === s.id ? 'Fixing...' : 'Repair & Link'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── Legacy discovery ── */}
        <div className="lp">
          <div className="lp-t">Legacy Discovery Scanning</div>
          <div style={{ fontSize:'.68rem', color:'var(--sub)', marginBottom:16, lineHeight:1.4 }}>
            Identifying data in older/legacy tables that might belong to earlier platform versions.
          </div>

          {discoveryMeta.legacy.length === 0 ? (
            <div className="empty" style={{ opacity:.4 }}>
              <div className="empty-ico">🔬</div>No legacy tables detected in primary schema.
            </div>
          ) : (
            discoveryMeta.legacy.map(l => (
              <div className="ig" key={l.table} style={{ marginBottom:10, opacity: l.count > 0 ? 1 : .5 }}>
                <div className="ig-l">
                  <div className="li-ico ni-s">📚</div>
                  <div>
                    <div className="ig-nm">Table: {l.table}</div>
                    <div style={{ fontSize:'.55rem', color:'var(--sub)' }}>Found {l.count} records</div>
                  </div>
                </div>
                {l.count > 0 && <span className="pill pill-r" style={{ fontSize:'.55rem' }}>Legacy Data</span>}
              </div>
            ))
          )}

          <div style={{ marginTop:20, padding:12, background:'rgba(74,158,232,0.05)', borderRadius:8, border:'1px dashed rgba(74,158,232,0.2)' }}>
            <div style={{ fontSize:'.65rem', color:'var(--sk)', fontWeight:700, marginBottom:4 }}>💡 Pro Tip</div>
            <div style={{ fontSize:'.6rem', color:'var(--sub)', lineHeight:1.4 }}>
              If legacy tables match your previous platform versions, custom import scripts can pull
              that data into your modern Command Tower.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
