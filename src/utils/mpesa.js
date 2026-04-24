import { withRetry } from './resilience';

/**
 * ShuleSoft M-PESA Daraja API Utility
 * Implementation for STK Push and Transaction Verification
 */

const CONSUMER_KEY = import.meta.env.VITE_MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.VITE_MPESA_CONSUMER_SECRET;
const PASSKEY = import.meta.env.VITE_MPESA_PASSKEY;
const SHORTCODE = import.meta.env.VITE_MPESA_SHORTCODE;
const CALLBACK_URL = import.meta.env.VITE_MPESA_CALLBACK_URL;
const ENVIRONMENT = import.meta.env.VITE_MPESA_ENVIRONMENT || 'sandbox';

async function getOAuthToken() {
  const url = ENVIRONMENT === 'sandbox'
    ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Basic ${auth}` }
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.errorMessage || 'M-Pesa Auth Failed');
  return data.access_token;
}

export async function initiateStkPush({ phoneNumber, amount, accountRef, description }) {
  // 1. Sanitize Phone
  let cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.slice(1);
  if (cleanPhone.length === 9) cleanPhone = '254' + cleanPhone;

  if (cleanPhone.length !== 12) throw new Error('Invalid M-Pesa phone number. Format: 254XXXXXXXXX');

  // 2. Mock in dev if no keys
  if (!CONSUMER_KEY || CONSUMER_KEY === 'MOCK_KEY') {
    console.log(`[MPESA-MOCK] STK Push to ${cleanPhone} for KSh ${amount}`);
    return { success: true, MerchantRequestID: 'MOCK-' + Date.now(), CheckoutRequestID: 'WS-' + Math.random().toString(36).substr(2, 9) };
  }

  return withRetry(async () => {
    const token = await getOAuthToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = btoa(`${SHORTCODE}${PASSKEY}${timestamp}`);

    const url = ENVIRONMENT === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: cleanPhone,
        PartyB: SHORTCODE,
        PhoneNumber: cleanPhone,
        CallBackURL: CALLBACK_URL,
        AccountReference: accountRef || 'Fees',
        TransactionDesc: description || 'School Fees Payment'
      })
    });

    const result = await response.json();
    if (result.ResponseCode !== '0') {
      throw new Error(result.ResponseDescription || 'STK Push Failed');
    }

    return {
      success: true,
      MerchantRequestID: result.MerchantRequestID,
      CheckoutRequestID: result.CheckoutRequestID,
      ResponseDescription: result.ResponseDescription
    };
  });
}

export async function checkTransactionStatus(checkoutRequestId) {
  // Usually handled via callback, but useful for manual poll
  if (!CONSUMER_KEY || CONSUMER_KEY === 'MOCK_KEY') return { status: 'Pending' };

  return withRetry(async () => {
    const token = await getOAuthToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = btoa(`${SHORTCODE}${PASSKEY}${timestamp}`);

    const url = ENVIRONMENT === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'
      : 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      })
    });

    const result = await response.json();
    return result;
  });
}
