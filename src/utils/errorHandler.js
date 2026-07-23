// ============================================================================
// ERROR HANDLER — Domain 5
// Maps Supabase error codes to safe user-facing messages.
// Never exposes table names, column names, or RLS policy names to end users.
// ============================================================================

const ERROR_MAP = {
  // PostgrestError codes
  '23505': 'This record already exists.',
  '23503': 'This action references a record that no longer exists.',
  '42501': "You don't have permission to do this.",
  'PGRST301': "You don't have permission to do this.",
  '42P01': 'A required resource could not be found.',
  '23502': 'A required field is missing.',
  '22P02': 'Invalid data format provided.',

  // Auth errors
  'invalid_credentials': 'Incorrect email or password.',
  'email_not_confirmed': 'Please verify your email address first.',
  'user_not_found': 'No account found with this email address.',
  'weak_password': 'Password is too weak. Use at least 6 characters.',
  'email_exists': 'An account with this email already exists.',
  'invalid_grant': 'Your session has expired. Please sign in again.',
  'otp_expired': 'This link has expired. Please request a new one.',
  'same_password': 'New password must be different from your current password.',
};

/**
 * Maps a raw Supabase/Postgres error to a safe, user-facing string.
 * Logs the full raw error to Sentry (if available) with user context.
 *
 * @param {Error|Object} err — The raw error from Supabase
 * @param {string} context — A label for where this error occurred (e.g. 'recordPayment')
 * @returns {string} — A safe message to show to the user
 */
export function handleError(err, context = 'unknown') {
  if (!err) return 'An unknown error occurred.';

  const code = err.code || err.error?.code || '';
  const message = err.message || err.error_description || err.error?.message || '';
  const statusCode = err.status || err.statusCode || 0;

  // 1. Check for network / timeout errors
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('timeout')) {
    return 'Connection lost. Check your internet and try again.';
  }

  // 2. Check for token expiry — auto sign-out
  if (
    message.includes('JWT expired') ||
    message.includes('token is expired') ||
    code === 'invalid_grant' ||
    statusCode === 401
  ) {
    // Lazy import to avoid circular deps
    try {
      import('../lib/supabase').then(({ supabase }) => {
        supabase.auth.signOut();
        window.location.href = '/login';
      });
    } catch (_) { /* ignore */ }
    return 'Your session has expired. Redirecting to login...';
  }

  // 3. Map known error codes
  if (code && ERROR_MAP[code]) {
    return ERROR_MAP[code];
  }

  // 4. Check message for known patterns
  for (const [key, safeMsg] of Object.entries(ERROR_MAP)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return safeMsg;
    }
  }

  // 5. Check for RLS / permission denied patterns
  if (message.includes('row-level security') || message.includes('policy') || message.includes('permission denied')) {
    return "You don't have permission to do this.";
  }

  // 6. Check for unique constraint violations in message
  if (message.includes('duplicate key') || message.includes('unique constraint') || message.includes('already exists')) {
    return 'This record already exists.';
  }

  // 7. Sentry integration
  try {
    import('@sentry/react').then(Sentry => {
      Sentry.captureException(err, { tags: { context } });
    });
  } catch (_) { /* ignore */ }

  // 8. In development, log to console
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, err);
  }

  // 9. Generic safe fallback
  return 'Something went wrong. Please try again or contact support.';
}

/**
 * Wraps an async operation with error handling.
 * Returns { data, error } where error is a safe user-facing string.
 */
export async function safeAsync(fn, context = 'unknown') {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleError(err, context) };
  }
}
