import { supabase } from './supabase';

/**
 * ShuleSoft Centralised Realtime Manager
 * Manages all active Supabase subscriptions to prevent leaks and duplication.
 */

class RealtimeManager {
  constructor() {
    this.subscriptions = new Map();
  }

  /**
   * Subscribe to changes on a specific table for the current school context
   * @param {string} table - Table name
   * @param {string} schoolId - School ID for filtering
   * @param {function} callback - Function to run on change
   */
  subscribe(table, schoolId, callback) {
    const key = `${table}:${schoolId}`;
    if (this.subscriptions.has(key)) {
      console.warn(`[REALTIME] Already subscribed to ${key}`);
      return this.subscriptions.get(key);
    }

    console.log(`[REALTIME] Creating subscription for ${key}`);
    const subscription = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          console.log(`[REALTIME] Change detected in ${table}:`, payload);
          callback(payload);
        }
      )
      .subscribe();

    this.subscriptions.set(key, subscription);
    return subscription;
  }

  /**
   * Unsubscribe from a table
   * @param {string} table 
   * @param {string} schoolId 
   */
  unsubscribe(table, schoolId) {
    const key = `${table}:${schoolId}`;
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      console.log(`[REALTIME] Unsubscribing from ${key}`);
      supabase.removeChannel(subscription);
      this.subscriptions.delete(key);
    }
  }

  /**
   * Unsubscribe from all active channels
   */
  clearAll() {
    console.log(`[REALTIME] Clearing all subscriptions`);
    this.subscriptions.forEach((sub) => supabase.removeChannel(sub));
    this.subscriptions.clear();
  }
}

export const realtimeManager = new RealtimeManager();
