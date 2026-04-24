// ============================================================================
// RESILIENT DATA FETCHING — Domain 8
// withRetry: Exponential backoff with Dexie fallback
// useFetch: Hook returning { data, loading, error, retry }
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Retries an async function with exponential backoff.
 * On final failure, optionally falls back to a Dexie cache lookup.
 *
 * @param {Function} fn — The async function to retry
 * @param {Object} options
 * @param {number} options.maxAttempts — Max retry attempts (default 2)
 * @param {number} options.baseDelayMs — Base delay in ms (default 600)
 * @param {Function} options.fallback — Optional fallback function (e.g., Dexie cache read)
 * @returns {Promise<any>}
 */
export async function withRetry(fn, { maxAttempts = 2, baseDelayMs = 600, fallback = null } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Don't retry on auth/permission errors — they won't resolve with a retry
      const code = err?.code || '';
      const msg = err?.message || '';
      if (
        code === '42501' || code === 'PGRST301' ||
        msg.includes('JWT expired') || msg.includes('permission denied') ||
        err?.status === 401 || err?.status === 403
      ) {
        throw err;
      }

      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted — try fallback (e.g., Dexie cache)
  if (fallback) {
    try {
      const cached = await fallback();
      if (cached !== undefined && cached !== null) {
        return cached;
      }
    } catch (_) { /* fallback also failed */ }
  }

  throw lastError;
}

/**
 * React hook for resilient data fetching with loading, error, and retry states.
 *
 * @param {Function} fetcher — Async function that returns data
 * @param {Array} deps — Dependency array (re-fetches when deps change)
 * @param {Object} options
 * @param {boolean} options.immediate — Whether to fetch immediately (default true)
 * @param {Function} options.fallback — Optional Dexie fallback
 * @returns {{ data: any, loading: boolean, error: string|null, retry: Function }}
 */
export function useFetch(fetcher, deps = [], { immediate = true, fallback = null } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await withRetry(fetcher, { fallback });
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        // Import handleError lazily to avoid circular deps
        let safeMessage = err?.message || 'Something went wrong.';
        try {
          const { handleError } = await import('./errorHandler.js');
          safeMessage = handleError(err, 'useFetch');
        } catch (_) { /* errorHandler not available */ }
        setError(safeMessage);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) execute();
    return () => { mountedRef.current = false; };
  }, [execute, immediate]);

  return { data, loading, error, retry: execute };
}
