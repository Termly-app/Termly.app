import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, CheckIcon } from '../CommonIcons';

/**
 * High-Fidelity Custom Select Component
 * Replaces native unstyleable dropdowns with a premium, styleable UI.
 */
export default function Select({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select...",
  className = "",
  style = {},
  variant = "premium",
  name
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Find currently selected label
  const selectedOption = options.find(opt => opt.value === value) || options.find(opt => opt.id === value);
  const displayLabel = selectedOption ? (selectedOption.label || selectedOption.name || selectedOption.year + ' — ' + selectedOption.term) : placeholder;

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange({ target: { value: option.value || option.id } });
    setIsOpen(false);
  };

  return (
    <div 
      className={`custom-select-container ${className}`} 
      ref={containerRef}
      style={{ position: 'relative', width: 'auto', minWidth: 160, ...style }}
    >
      {name && <input type="hidden" name={name} value={value} />}
      {/* Trigger Button */}
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''} ${variant}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--bg-card, #fff)',
          border: '1.5px solid var(--border, #e2e8f0)',
          borderRadius: 'var(--radius-sm, 10px)',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-main, #0f172a)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOpen ? '0 0 0 4px rgba(14, 165, 233, 0.15)' : '0 1px 2px rgba(0,0,0,0.05)',
          borderColor: isOpen ? 'var(--primary, #4f46e5)' : 'var(--border, #e2e8f0)'
        }}
      >
        <span style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          marginRight: 8
        }}>
          {displayLabel}
        </span>
        <div style={{ 
          transform: `rotate(${isOpen ? '180deg' : '0deg'})`,
          transition: 'transform 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          color: isOpen ? 'var(--primary)' : 'var(--text-light)'
        }}>
          <ChevronDownIcon size={14} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="custom-select-menu animate-pop"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(14, 165, 233, 0.1)',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
            zIndex: 1000,
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px'
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '0.75rem', color: 'var(--text-light)', textAlign: 'center' }}>
              No options available
            </div>
          ) : (
            options.map((opt, idx) => {
              const isSelected = (opt.value === value || opt.id === value);
              return (
                <div
                  key={opt.value || opt.id || idx}
                  className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 700 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                    background: isSelected ? 'rgba(14, 165, 233, 0.08)' : 'transparent',
                    marginBottom: '2px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(14, 165, 233, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>{opt.label || opt.name || (opt.year && opt.term ? `${opt.year} — ${opt.term}` : '') || 'Option'}</span>
                  {isSelected && <CheckIcon size={14} color="var(--primary)" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
