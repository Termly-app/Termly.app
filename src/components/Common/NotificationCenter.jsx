import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, CheckIcon, MessageIcon } from '../CommonIcons';

export default function NotificationCenter({ notifications = [], onMarkRead, onMarkAllRead, lang = 'en' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadList = notifications.filter(n => !n.read_at && !n.is_read);
  const unreadCount = unreadList.length;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: isOpen ? '#f1f5f9' : 'transparent',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          transition: 'all 0.2s ease'
        }}
        aria-label="Notifications"
      >
        <BellIcon size={20} color="#334155" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#ef4444',
            color: '#ffffff',
            fontSize: '0.7rem',
            fontWeight: 800,
            borderRadius: '10px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid #ffffff',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '48px',
          width: '320px',
          maxWidth: '90vw',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
          zIndex: 1000,
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            background: '#f8fafc'
          }}>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BellIcon size={18} color="#10b981" />
              <span>{lang === 'sw' ? 'Taarifa' : 'Notifications'}</span>
              {unreadCount > 0 && (
                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                  {unreadCount} {lang === 'sw' ? 'mpya' : 'new'}
                </span>
              )}
            </div>
            {unreadCount > 0 && onMarkAllRead && (
              <button
                onClick={onMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {lang === 'sw' ? 'Weka zote zimesomwa' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 20px', textCenter: 'center', textAlign: 'center', color: '#94a3b8' }}>
                <MessageIcon size={32} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
                  {lang === 'sw' ? 'Hakuna taarifa mpya' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              notifications.map((n, idx) => (
                <div
                  key={n.id || idx}
                  onClick={() => onMarkRead && onMarkRead(n.id)}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid #f8fafc',
                    background: (!n.read_at && !n.is_read) ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    gap: 12
                  }}
                >
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: (!n.read_at && !n.is_read) ? '#3b82f6' : 'transparent',
                    marginTop: 6,
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: (!n.read_at && !n.is_read) ? 700 : 600, fontSize: '0.85rem', color: '#1e293b' }}>
                      {n.title || n.subject || 'System Notification'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
                      {n.message || n.body}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>
                      {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
