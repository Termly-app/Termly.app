import React, { createContext, useContext, useState, useCallback } from 'react';
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

  const handleConfirm = useCallback((inputValue) => {
    state.resolve?.(state.withInput ? inputValue : true);
    setState(DEFAULT_STATE);
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(state.withInput ? null : false);
    setState(DEFAULT_STATE);
  }, [state]);

  return (
    <DialogContext.Provider value={{ confirm, alert, prompt }}>
      {children}
      <ConfirmModal 
        {...state} 
        onConfirm={handleConfirm} 
        onCancel={handleCancel} 
      />
    </DialogContext.Provider>
  );
};
