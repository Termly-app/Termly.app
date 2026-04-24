/**
 * useRetry — Custom hook for resilient data fetching with automatic retry.
 * 
 * Features:
 * - Exponential backoff (1s, 2s, 4s)
 * - Max 3 retries
 * - Loading, error, and data states
 * - Manual refetch trigger
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

export default function useRetry(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const retryCount = useRef(0);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    retryCount.current = 0;

    const attemptFetch = async () => {
      try {
        const result = await fetchFn();
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
          retryCount.current = 0;
        }
      } catch (err) {
        retryCount.current += 1;
        if (retryCount.current <= MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, retryCount.current - 1);
          console.warn(
            `[useRetry] Attempt ${retryCount.current}/${MAX_RETRIES} failed. Retrying in ${delay}ms...`,
            err.message
          );
          setTimeout(attemptFetch, delay);
        } else {
          if (mountedRef.current) {
            setError(err);
            setLoading(false);
          }
        }
      }
    };

    attemptFetch();
  }, [fetchFn]);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => { mountedRef.current = false; };
  }, deps);

  return { data, loading, error, refetch: execute };
}
