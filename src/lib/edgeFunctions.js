/**
 * Edge Function Call Helpers
 * Wraps supabase.functions.invoke() for all server-side operations.
 * If Edge Functions aren't deployed yet, falls back to local-only behaviour.
 */
import { supabase } from './supabase';

async function invokeEdge(functionName, payload) {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    // If Edge Functions are not deployed, log a warning
    if (err?.message?.includes('FunctionNotFound') ||
        err?.message?.includes('FunctionsRelayError') ||
        err?.message?.includes('Failed to fetch')) {
      console.warn(`[Edge] Function "${functionName}" not available. Using fallback.`);
      return { error: 'not_deployed', message: `Edge function "${functionName}" is not deployed yet.` };
    }
    throw err;
  }
}

/**
 * Provision a new user account (teacher, student, parent)
 * The Edge Function uses service_role key to create auth.users entries.
 */
export async function provisionUser({
  schoolId,
  name,
  email,
  phone,
  role,
  staffNumber,
  defaultPasswordType = 'phone',
  studentId,       // For parent linking
  relationship,    // For parent linking
}) {
  return invokeEdge('provision-user', {
    schoolId, name, email, phone, role, staffNumber,
    defaultPasswordType, studentId, relationship,
  });
}

/**
 * Admin credential cascade: update username/email/phone atomically
 */
export async function updateUserCredentials({
  userId,
  newEmail,
  newPhone,
  newUsername,
}) {
  return invokeEdge('update-credentials', {
    userId, newEmail, newPhone, newUsername,
  });
}

/**
 * Request a password reset OTP via SMS
 */
export async function requestOTP({ schoolCode, identifier }) {
  return invokeEdge('generate-otp', { schoolCode, identifier });
}

/**
 * Verify an OTP code
 */
export async function verifyOTP({ userId, otpCode }) {
  return invokeEdge('verify-otp', { userId, otpCode });
}

/**
 * Reset password after OTP verification
 */
export async function resetPasswordWithOTP({ userId, otpCode, newPassword }) {
  return invokeEdge('reset-password', { userId, otpCode, newPassword });
}

/**
 * Send a bulk SMS (admin only)
 */
export async function sendBulkSMS({ schoolId, recipientPhones, message, eventType }) {
  return invokeEdge('send-sms', {
    schoolId, phones: recipientPhones, message, eventType,
  });
}

/**
 * Generate a signed URL for a file in Supabase Storage
 */
export async function getSignedUrl({ bucket, path, expiresIn = 3600 }) {
  // This can be done client-side with the anon key for public buckets
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
