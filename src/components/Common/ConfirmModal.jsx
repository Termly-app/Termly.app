/**
 * ConfirmModal — styled replacement for window.confirm / window.prompt
 *
 * Spread the confirmModal object from useConfirm() directly onto this component:
 *   <ConfirmModal {...confirmModal} />
 */

import { useState, useEffect } from 'react';
import { DeleteIcon, AlertIcon, DashboardIcon } from '../CommonIcons';

const VARIANTS = {
  danger  : { accent: '#D4506A', btnBg: 'linear-gradient(135deg,#D4506A,#B03050)', shadow: 'rgba(212,80,106,.3)'  },
  warning : { accent: '#E8A020', btnBg: 'linear-gradient(135deg,#E8A020,#C07010)', shadow: 'rgba(232,160,32,.3)'  },
  default : { accent: '#7C5CFC', btnBg: 'linear-gradient(135deg,#7C5CFC,#5B3ED4)', shadow: 'rgba(124,92,252,.3)' },
};

export default function ConfirmModal({
  open, title, message, confirmText, cancelText,
  variant = 'default', withInput, inputLabel, inputPlaceholder,
  onConfirm, onCancel,
}) {
  const [inputValue, setInputValue] = useState('');
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
        background  : '#161A17',
        border      : `1px solid ${v.accent}40`,
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
            fontSize:'.82rem', color:'#8A9B8C', lineHeight:1.6, marginBottom:18,
            padding:'10px 13px', borderRadius:8,
            background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)',
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
                width:'100%', background:'#0C0E0D',
                border:'1px solid rgba(255,255,255,.12)', borderRadius:7,
                padding:'9px 11px', color:'#D4DDD6',
                fontFamily:"'Inter',sans-serif", fontSize:'.82rem',
                outline:'none', transition:'border-color .18s',
              }}
            />
          </div>
        )}

        {/* ── Actions ── */}
        <div style={{ display:'flex', gap:10 }}>
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
