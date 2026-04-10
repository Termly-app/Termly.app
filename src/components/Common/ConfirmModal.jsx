/**
 * ConfirmModal — styled replacement for window.confirm / window.prompt
 *
 * Spread the confirmModal object from useConfirm() directly onto this component:
 *   <ConfirmModal {...confirmModal} />
 */

import { useState, useEffect } from 'react';
import { DeleteIcon, AlertIcon, DashboardIcon } from '../CommonIcons';


export default function ConfirmModal({
  open, title, message, confirmText, cancelText,
  variant = 'default', withInput, inputLabel, inputPlaceholder,
  onConfirm, onCancel,
}) {
  const [inputValue, setInputValue] = useState('');

  const VARIANTS = {
    danger  : { accent: '#ef4444', btnBg: 'linear-gradient(135deg,#ef4444,#b91c1c)', shadow: 'rgba(239,68,68,.3)'  },
    warning : { accent: '#f59e0b', btnBg: 'linear-gradient(135deg,#f59e0b,#d97706)', shadow: 'rgba(245,158,11,.3)'  },
    default : { accent: '#ffffff', btnBg: 'linear-gradient(135deg,#71717a,#3f3f46)', shadow: 'rgba(255,255,255,.1)' },
  };
  const v = VARIANTS[variant] || VARIANTS.default;

  // Reset input when modal opens
  useEffect(() => { if (open) setInputValue(''); }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const handleConfirm = () => {
    if (withInput && !inputValue.trim()) return; // require non-empty input
    onConfirm?.(withInput ? inputValue.trim() : true);
  };

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:99999,
        background:'rgba(0,0,0,.75)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:20,
        animation: 'cmFadeIn .15s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <style>{`
        @keyframes cmFadeIn { from { opacity:0; transform:scale(.96) } to { opacity:1; transform:scale(1) } }
        .cm-input:focus { border-color: rgba(255,255,255,.25) !important; }
      `}</style>

      <div style={{
        background  : '#121212',
        border      : `1px solid rgba(255,255,255,0.1)`,
        borderRadius: 14,
        padding     : 28,
        width       : '100%',
        maxWidth    : 420,
        boxShadow   : `0 8px 40px rgba(0,0,0,.5), 0 0 0 1px ${v.accent}20`,
      }}>
        {/* ── Icon + Title ── */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <div style={{
            width:38, height:38, borderRadius:9, flexShrink:0,
            background: `${v.accent}20`,
            border: `1px solid ${v.accent}40`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
          }}>
            {variant === 'danger' ? <DeleteIcon size={32} color="var(--danger)" /> : variant === 'warning' ? <AlertIcon size={32} color="var(--warning)" /> : <DashboardIcon size={32} color="var(--primary)" />}
          </div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:'.95rem', fontWeight:700, color:'#fff' }}>
            {title}
          </div>
        </div>

        {/* ── Message ── */}
        {message && (
          <div style={{
            fontSize:'.82rem', color:'#d1d1d1', lineHeight:1.6, marginBottom:18,
            padding:'10px 13px', borderRadius:8,
            background:'rgba(255,255,255,.03)', border:'1px solid var(--edge)',
          }}>
            {message}
          </div>
        )}

        {/* ── Input (for prompt variant) ── */}
        {withInput && (
          <div style={{ marginBottom:18 }}>
            {inputLabel && (
              <div style={{ fontSize:'.6rem', color:'#5A6B5C', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 }}>
                {inputLabel}
              </div>
            )}
            <input
              autoFocus
              className="cm-input"
              type="text"
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
              style={{
                width:'100%', background:'#050505',
                border:'1px solid rgba(255,255,255,.12)', borderRadius:7,
                padding:'9px 11px', color:'#fff',
                fontFamily:"var(--fb)", fontSize:'.82rem',
                outline:'none', transition:'border-color .18s',
              }}
            />
          </div>
        )}

        {/* ── Actions ── */}
        <div style={{ display:'flex', gap:10 }}>
          {cancelText && (
            <button
              onClick={onCancel}
              style={{
                flex:1, padding:'10px 0', borderRadius:8,
                background:'transparent', border:'1px solid rgba(255,255,255,.1)',
                color:'#5A6B5C', fontFamily:"'Inter',sans-serif", fontSize:'.82rem',
                fontWeight:500, cursor:'pointer', transition:'all .18s',
              }}
              onMouseOver={e => { e.currentTarget.style.color='#D4DDD6'; e.currentTarget.style.borderColor='rgba(255,255,255,.2)'; }}
              onMouseOut={e  => { e.currentTarget.style.color='#5A6B5C'; e.currentTarget.style.borderColor='rgba(255,255,255,.1)'; }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={withInput && !inputValue.trim()}
            style={{
              flex:1.4, padding:'10px 0', borderRadius:8,
              background    : (withInput && !inputValue.trim()) ? '#354037' : v.btnBg,
              color         : (withInput && !inputValue.trim()) ? '#5A6B5C' : '#fff',
              border        : 'none',
              fontFamily    : "'Inter',sans-serif", fontSize:'.82rem', fontWeight:700,
              cursor        : (withInput && !inputValue.trim()) ? 'not-allowed' : 'pointer',
              boxShadow     : (withInput && !inputValue.trim()) ? 'none' : `0 4px 16px ${v.shadow}`,
              transition    : 'all .18s',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
