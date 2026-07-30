import { supabase } from '../lib/supabase';
import { getWelcomeTemplate, getPasswordResetTemplate } from './emailTemplates';

/**
 * Termly Email Utility
 * Sends emails via Supabase Edge Function 'send-email' which integrates with Resend.
 */

export async function sendEmail({ to, subject, template, data }) {
  try {
    let htmlContent = '';

    if (template === emailTemplates.WELCOME) {
      htmlContent = getWelcomeTemplate(data);
    } else if (template === emailTemplates.PASSWORD_RESET) {
      htmlContent = getPasswordResetTemplate(data);
    } else {
      throw new Error(`Template ${template} not supported in frontend generator.`);
    }

    const { data: res, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html: htmlContent }
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
  PASSWORD_RESET: 'password_reset'
};
