/**
 * useConfirm — drop-in replacement for window.confirm and window.prompt
 *
 * Usage:
 *   const { confirmModal, confirm, prompt } = useConfirm();
 *
 *   // In JSX: <ConfirmModal {...confirmModal} />
 *
 *   // In handlers:
 *   const ok = await confirm({ title: 'Delete?', message: '...', variant: 'danger' });
 *   if (!ok) return;
 *
 *   const reason = await prompt({ title: 'Reject', message: 'Enter reason:' });
 *   if (reason === null) return; // cancelled
 */

import { useState, useCallback } from 'react';

const DEFAULT = {
  open        : false,
  title       : 'Confirm',
  message     : 'Are you sure?',
  confirmText : 'Confirm',
  cancelText  : 'Cancel',
  variant     : 'default',   // 'default' | 'danger' | 'warning'
  withInput   : false,
  inputLabel  : '',
  inputPlaceholder: '',
  resolve     : null,
};

export function useConfirm() {
  const [confirmModal, setConfirmModal] = useState(DEFAULT);

  // Simple yes/no — resolves true/false
  const confirm = useCallback(({ title, message, confirmText, cancelText, variant = 'default' } = {}) => {
    return new Promise((resolve) => {
      setConfirmModal({
        open: true,
        title       : title       || 'Confirm',
        message     : message     || 'Are you sure?',
        confirmText : confirmText || 'Confirm',
        cancelText  : cancelText  || 'Cancel',
        variant,
        withInput   : false,
        inputLabel  : '',
        inputPlaceholder: '',
        resolve,
      });
    });
  }, []);

  // With text input — resolves with the string value, or null if cancelled
  const prompt = useCallback(({ title, message, inputLabel, inputPlaceholder, confirmText, cancelText } = {}) => {
    return new Promise((resolve) => {
      setConfirmModal({
        open: true,
        title       : title       || 'Enter value',
        message     : message     || '',
        confirmText : confirmText || 'Submit',
        cancelText  : cancelText  || 'Cancel',
        variant     : 'default',
        withInput   : true,
        inputLabel  : inputLabel  || '',
        inputPlaceholder: inputPlaceholder || '',
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback((inputValue) => {
    confirmModal.resolve?.(confirmModal.withInput ? inputValue : true);
    setConfirmModal(DEFAULT);
  }, [confirmModal]);

  const handleCancel = useCallback(() => {
    confirmModal.resolve?.(confirmModal.withInput ? null : false);
    setConfirmModal(DEFAULT);
  }, [confirmModal]);

  return {
    confirmModal : { ...confirmModal, onConfirm: handleConfirm, onCancel: handleCancel },
    confirm,
    prompt,
  };
}
