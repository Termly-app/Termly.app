import { withRetry } from './resilience';
import { supabase } from '../lib/supabase';

/**
 * Termly M-PESA Daraja API Utility
 * Implementation for STK Push and Transaction Verification via Edge Function
 */

export async function initiateStkPush({ phoneNumber, amount, accountRef, description }) {
  // 1. Sanitize Phone
  let cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.slice(1);
  if (cleanPhone.length === 9) cleanPhone = '254' + cleanPhone;

  if (cleanPhone.length !== 12) throw new Error('Invalid M-Pesa phone number. Format: 254XXXXXXXXX');

  return withRetry(async () => {
    const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
      body: {
        action: 'push',
        payload: {
          phoneNumber: cleanPhone,
          amount,
          accountRef,
          description
        }
      }
    });

    if (error) {
      throw new Error(error.message || 'Edge function error');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  });
}

export async function checkTransactionStatus(checkoutRequestId) {
  return withRetry(async () => {
    const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
      body: {
        action: 'status',
        payload: { checkoutRequestId }
      }
    });

    if (error) {
      throw new Error(error.message || 'Edge function error');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  });
}
