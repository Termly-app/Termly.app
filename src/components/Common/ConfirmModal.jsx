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
    danger  : { accent: '#ef4444', btnBg: 'linear-gradient(135deg,#ef4444,#dc2626)', shadow: 'rgba(239,68,68,.4)'  },
    warning : { accent: '#f59e0b', btnBg: 'linear-gradient(135deg,#f59e0b,#d97706)', shadow: 'rgba(245,158,11,.4)'  },
    success : { accent: '#10b981', btnBg: 'linear-gradient(135deg,#10b981,#059669)', shadow: 'rgba(16,185,129,.4)'  },
    primary : { accent: '#4f46e5', btnBg: 'linear-gradient(135deg,#4f46e5,#3730a3)', shadow: 'rgba(79,70,229,.4)'  },
    default : { accent: '#ffffff', btnBg: 'linear-gradient(135deg,#27272a,#09090b)', shadow: 'rgba(0,0,0,.3)' },
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
    if (withInput && !inputValue.trim()) return;
    onConfirm?.(withInput ? inputValue.trim() : true);
  };

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:99999,
        background:'rgba(0,0,0,.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:20,
        animation: 'cmFadeIn .2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <style>{`
        @keyframes cmFadeIn { 
          from { opacity:0; transform:scale(.95) translateY(10px) } 
          to { opacity:1; transform:scale(1) translateY(0) } 
        }
        .cm-input:focus { border-color: ${v.accent} !important; box-shadow: 0 0 0 4px ${v.accent}15 !important; }
      `}</style>

      <div style={{
        background  : '#09090b',
        border      : `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 20,
        padding     : 32,
        width       : '100%',
        maxWidth    : 440,
        boxShadow   : `0 24px 48px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow effect */}
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 200, height: 200,
          background: v.accent, opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none'
        }} />

        {/* ── Icon + Title ── */}
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
          <div style={{
            width:44, height:44, borderRadius:12, flexShrink:0,
            background: `${v.accent}15`,
            border: `1px solid ${v.accent}30`,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: `0 4px 12px ${v.accent}10`
          }}>
            {variant === 'danger' ? <DeleteIcon size={24} color="#ef4444" /> : 
             variant === 'warning' ? <AlertIcon size={24} color="#f59e0b" /> : 
             variant === 'success' ? <ZapIcon size={24} color="#10b981" /> :
             variant === 'primary' ? <DashboardIcon size={24} color="#4f46e5" /> :
             <LockIcon size={24} color="#fff" />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize:'1.1rem', fontWeight:800, color:'#fff', letterSpacing: '-0.02em' }}>
              {title}
            </div>
          </div>
        </div>

        {/* ── Message ── */}
        {message && (
          <div style={{
            fontSize:'.88rem', color:'#a1a1aa', lineHeight:1.6, marginBottom:24,
            fontWeight: 400
          }}>
            {message}
          </div>
        )}

        {/* ── Input ── */}
        {withInput && (
          <div style={{ marginBottom:24 }}>
            {inputLabel && (
              <div style={{ fontSize:'.65rem', color:'#71717a', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8, fontWeight: 700 }}>
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
                width:'100%', background:'rgba(255,255,255,0.03)',
                border:'1px solid rgba(255,255,255,.1)', borderRadius:12,
                padding:'12px 16px', color:'#fff',
                fontFamily:"var(--font)", fontSize:'.9rem',
                outline:'none', transition:'all .2s',
              }}
            />
          </div>
        )}

        {/* ── Actions ── */}
        <div style={{ display:'flex', gap:12 }}>
          {cancelText && (
            <button
              onClick={onCancel}
              style={{
                flex:1, padding:'12px 0', borderRadius:12,
                background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
                color:'#a1a1aa', fontFamily:"var(--font)", fontSize:'.9rem',
                fontWeight:600, cursor:'pointer', transition:'all .2s',
              }}
              onMouseOver={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='#fff'; }}
              onMouseOut={e  => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#a1a1aa'; }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={withInput && !inputValue.trim()}
            style={{
              flex:1.5, padding:'12px 0', borderRadius:12,
              background    : (withInput && !inputValue.trim()) ? '#27272a' : v.btnBg,
              color         : (withInput && !inputValue.trim()) ? '#71717a' : '#fff',
              border        : 'none',
              fontFamily    : "var(--font)", fontSize:'.9rem', fontWeight:800,
              cursor        : (withInput && !inputValue.trim()) ? 'not-allowed' : 'pointer',
              boxShadow     : (withInput && !inputValue.trim()) ? 'none' : `0 8px 24px -4px ${v.shadow}`,
              transition    : 'all .2s',
            }}
            onMouseOver={e => { if (!e.currentTarget.disabled) e.currentTarget.style.transform='translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
