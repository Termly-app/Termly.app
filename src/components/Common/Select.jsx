import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon } from '../CommonIcons';

/**
 * Premium Portalized Select Component
 * Renders into a portal to avoid clipping by parent container overflow.
 * Features intelligent positioning and collision detection.
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
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' });
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  // Find currently selected label
  const selectedOption = options.find(opt => opt.value === value) || options.find(opt => opt.id === value);
  const displayLabel = selectedOption ? (selectedOption.label || selectedOption.name || selectedOption.year + ' — ' + selectedOption.term) : placeholder;

  // Positioning Logic
  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const menuHeight = 280; // Estimated max height
      
      let placement = 'bottom';
      let top = rect.bottom + window.scrollY + 8;
      
      // Collision detection: if not enough space below, flip to top
      if (rect.bottom + menuHeight > windowHeight && rect.top > menuHeight) {
        placement = 'top';
        top = rect.top + window.scrollY - menuHeight - 8;
      }

      setCoords({
        top,
        left: rect.left + window.scrollX,
        width: rect.width,
        placement
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        // Also check if the click was inside the portal menu
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange({ target: { name, value: option.value || option.id } });
    setIsOpen(false);
  };

  const Menu = (
    <div 
      ref={menuRef}
      className={`custom-select-menu animate-pop ${coords.placement}`}
      style={{
        position: 'absolute',
        top: coords.top,
        left: coords.left,
        width: coords.width,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(14, 165, 233, 0.15)',
        borderRadius: '14px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        zIndex: 99999,
        maxHeight: '260px',
        overflowY: 'auto',
        padding: '6px',
        pointerEvents: 'auto'
      }}
    >
      {options.length === 0 ? (
        <div style={{ padding: '16px', fontSize: '0.8rem', color: 'var(--text-light)', textAlign: 'center' }}>
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
                padding: '12px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: isSelected ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                background: isSelected ? 'var(--primary-50)' : 'transparent',
                marginBottom: '2px',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'var(--bg)';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis' 
              }}>
                {opt.label || opt.name || (opt.year && opt.term ? `${opt.year} — ${opt.term}` : '') || 'Option'}
              </span>
              {isSelected && <CheckIcon size={14} color="var(--primary)" />}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div 
      className={`custom-select-container ${className}`} 
      ref={containerRef}
      style={{ position: 'relative', width: 'auto', display: 'inline-block', ...style }}
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
          padding: '10px 18px',
          minWidth: 'inherit',
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-main)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOpen ? '0 0 0 4px var(--primary-50)' : 'var(--shadow-sm)',
          borderColor: isOpen ? 'var(--primary)' : 'var(--border)'
        }}
      >
        <span style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          marginRight: 10
        }}>
          {displayLabel}
        </span>
        <div style={{ 
          transform: `rotate(${isOpen ? '180deg' : '0deg'})`,
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          color: isOpen ? 'var(--primary)' : 'var(--text-light)'
        }}>
          <ChevronDownIcon size={14} />
        </div>
      </div>

      {/* Portalized Menu */}
      {isOpen && createPortal(Menu, document.body)}
    </div>
  );
}
