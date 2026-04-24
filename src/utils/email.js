import { supabase } from '../lib/supabase';

/**
 * ShuleSoft Email Utility
 * Sends emails via Supabase Edge Function 'send-email' which integrates with Resend.
 */

export async function sendEmail({ to, subject, template, data }) {
  try {
    const { data: res, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, template, data }
    });
    if (error) throw error;
    return res;
  } catch (err) {
    console.error('Email sending failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Branded Email Templates
 */

export const emailTemplates = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  SUBSCRIPTION_EXPIRY: 'subscription_expiry',
  RESULTS_PUBLISHED: 'results_published',
  MARK_ENTRY_OPENED: 'mark_entry_opened',
  NEW_TERM_STARTED: 'new_term_started'
};
