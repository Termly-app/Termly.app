/**
 * realtimeManager.js — Centralized Supabase Realtime Subscription Manager
 * 
 * Prevents duplicate subscriptions and provides a single point of control
 * for all real-time table listeners across the app.
 */
import { supabase } from '../lib/supabase';

const _channels = new Map();

/**
 * Subscribe to a Supabase table with deduplication.
 * If a subscription for the same key already exists, it is reused.
 * 
 * @param {string} key - Unique subscription key (e.g., 'portal_fees_<studentId>')
 * @param {string} table - Supabase table name
 * @param {Function} onChange - Callback when a change is detected
 * @param {object} [filter] - Optional filter object { column, value }
 * @returns {Function} Unsubscribe function
 */
export function subscribe(key, table, onChange, filter = null) {
  // If already subscribed to this key, unsubscribe first to prevent leaks
  if (_channels.has(key)) {
    const existing = _channels.get(key);
    supabase.removeChannel(existing);
    _channels.delete(key);
  }

  let channelConfig = supabase.channel(key);
  
  const pgChangesConfig = {
    event: '*',
    schema: 'public',
    table: table,
  };
  
  if (filter?.column && filter?.value) {
    pgChangesConfig.filter = `${filter.column}=eq.${filter.value}`;
  }

  channelConfig = channelConfig.on('postgres_changes', pgChangesConfig, (payload) => {
    onChange(payload);
  });

  const channel = channelConfig.subscribe();
  _channels.set(key, channel);

  return () => {
    supabase.removeChannel(channel);
    _channels.delete(key);
  };
}

/**
 * Unsubscribe all active channels. Call on logout or navigation away.
 */
export function unsubscribeAll() {
  _channels.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  _channels.clear();
}

/**
 * Get the count of active subscriptions (for debugging).
 */
export function getActiveSubscriptionCount() {
  return _channels.size;
}
