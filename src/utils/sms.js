import { withRetry } from './resilience';

const API_KEY = import.meta.env.VITE_SMS_API_KEY;
const USERNAME = import.meta.env.VITE_SMS_USERNAME || 'sandbox'; // Use 'sandbox' for testing
const SENDER_ID = import.meta.env.VITE_SMS_SENDER_ID || 'Termly';

export async function dispatchSMS(to, message) {
  // 1. Sanitize numbers
  const recipients = Array.isArray(to) ? to : [to];
  const cleanRecipients = recipients.map(r => {
    let clean = String(r).replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '254' + clean.slice(1);
    if (!clean.startsWith('254') && clean.length === 9) clean = '254' + clean;
    return clean;
  }).filter(r => r.length >= 10);

  if (cleanRecipients.length === 0) return { success: false, error: 'No valid recipients' };
  
  // If no API key, fallback to mock in dev/sandbox
  if (!API_KEY || API_KEY === 'MOCK_KEY') {
    console.log(`[SMS-MOCK] to: ${cleanRecipients.join(',')}, msg: ${message}`);
    return { success: true, messageId: 'MOCK-' + Date.now(), count: cleanRecipients.length };
  }

  const endpoint = USERNAME === 'sandbox' 
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging';

  return withRetry(async () => {
    const params = new URLSearchParams();
    params.append('username', USERNAME);
    params.append('to', cleanRecipients.join(','));
    params.append('message', message);
    if (SENDER_ID && SENDER_ID !== 'Termly') {
      params.append('from', SENDER_ID);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': API_KEY
      },
      body: params
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.errorMessage || 'SMS Gateway Error');
    }

    // Africa's Talking returns SMSMessageData
    const data = result.SMSMessageData;
    const successCount = data.Recipients.filter(r => r.status === 'Success' || r.status === 'Sent').length;

    return {
      success: successCount > 0,
      recipients: data.Recipients,
      count: successCount,
      total: cleanRecipients.length
    };
  }, { maxAttempts: 1 }); // Don't retry SMS too many times to avoid double billing if gateway is slow
}

export function generateAttendanceMessage(studentName, status, date) {
  const d = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (status === 'absent') {
    return `Dear Parent, ${studentName} was ABSENT from school today, ${d}. Please contact the office for any clarification. - Termly`;
  }
  if (status === 'late') {
    return `Dear Parent, ${studentName} arrived LATE to school today, ${d}. Prompt arrival is encouraged. - Termly`;
  }
  return `Dear Parent, ${studentName} was present in school today, ${d}. - Termly`;
}

export function generateFeeReminder(studentName, balance) {
  const fmt = (n) => `KSh ${Number(n).toLocaleString()}`;
  return `Dear Parent, this is a reminder that ${studentName} has an outstanding fee balance of ${fmt(balance)}. Kindly settle to avoid disruptions. - Termly`;
}
