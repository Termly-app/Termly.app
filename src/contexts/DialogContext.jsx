import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmModal from '../components/Common/ConfirmModal';

const DialogContext = createContext();

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

const DEFAULT_STATE = {
  open: false,
  title: 'Confirm',
  message: 'Are you sure?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'default',
  withInput: false,
  inputLabel: '',
  inputPlaceholder: '',
  resolve: null,
};

export const DialogProvider = ({ children }) => {
  const [state, setState] = useState(DEFAULT_STATE);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setState({
        ...DEFAULT_STATE,
        open: true,
        title: options.title || 'Confirm',
        message: options.message || 'Are you sure?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options = {}) => {
    const message = typeof options === 'string' ? options : options.message;
    const title = typeof options === 'string' ? 'Alert' : (options.title || 'Alert');
    
    return new Promise((resolve) => {
      setState({
        ...DEFAULT_STATE,
        open: true,
        title,
        message,
        confirmText: options.confirmText || 'OK',
        cancelText: null, // Hides cancel button in alert mode
        variant: options.variant || 'default',
        resolve,
      });
    });
  }, []);

  const prompt = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setState({
        ...DEFAULT_STATE,
        open: true,
        title: options.title || 'Enter value',
        message: options.message || '',
        confirmText: options.confirmText || 'Submit',
        cancelText: options.cancelText || 'Cancel',
        withInput: true,
        inputLabel: options.inputLabel || '',
        inputPlaceholder: options.inputPlaceholder || '',
        resolve,
      });
    });
  }, []);

  // Lightweight toast notification
  const toast = useCallback((message, variant = 'success') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const handleConfirm = useCallback((inputValue) => {
    state.resolve?.(state.withInput ? inputValue : true);
    setState(DEFAULT_STATE);
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(state.withInput ? null : false);
    setState(DEFAULT_STATE);
  }, [state]);

  const toastColors = {
    success: { bg: '#ecfdf5', border: '#a7f3d0', color: '#065f46' },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
    danger:  { bg: '#fef2f2', border: '#fecaca', color: '#991b1b' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
  };

  return (
    <DialogContext.Provider value={{ confirm, alert, prompt, toast }}>
      {children}
      <ConfirmModal 
        {...state} 
        onConfirm={handleConfirm} 
        onCancel={handleCancel} 
      />
      {/* Toast container */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
          display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380,
        }}>
          {toasts.map(t => {
            const c = toastColors[t.variant] || toastColors.success;
            return (
              <div key={t.id} style={{
                padding: '12px 20px', borderRadius: 12,
                background: c.bg, border: `1.5px solid ${c.border}`, color: c.color,
                fontSize: '0.85rem', fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                animation: 'slideInRight 0.3s ease',
              }}>
                {t.message}
              </div>
            );
          })}
        </div>
      )}
    </DialogContext.Provider>
  );
};
