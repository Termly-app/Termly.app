export default function ActivityTab({ filteredActivity }) {
  return (
    <div className="tv">
      <div className="lp">
        <div className="lp-t" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>Activity Log ({filteredActivity.length} entries)</span>
        </div>
        <p style={{ fontSize:'.7rem', color:'var(--sub)', marginBottom:16, lineHeight:1.6 }}>
          This log tracks all critical platform actions (registrations, plan changes, manual
          extensions, terminations) across all schools for security and audit purposes.
        </p>
        {filteredActivity.length === 0
          ? <div className="empty"><div className="empty-ico">⚡</div>No activity found.</div>
          : filteredActivity.map(a => (
              <div className="ai" key={a.id}>
                <div className="li-ico ni-v">⚡</div>
                <div className="ai-body">
                  <div className="ai-t">{a.description}</div>
                  <div className="ai-s">
                    {a.school_name || 'System'} · {a.type?.split('_').join(' ') || 'event'}
                  </div>
                </div>
                <div className="ai-time">
                  {new Date(a.created_at).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
}
