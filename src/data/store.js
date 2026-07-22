/**
 * store.js — Unified Facade Index Module
 * 
 * Re-exports all domain store modules cleanly.
 * Eliminates duplicate function declarations while maintaining 100% backward
 * compatibility for all components importing from 'src/data/store'.
 */

import { supabase } from '../lib/supabase';
import { db, queueChange, getPendingSync, updateSyncStatus, syncTypes } from './offlineStore';
import { CBC_STRUCTURE, CBC_CORE_COMPETENCIES, TERM_FEE, getLevelForGrade, getSubjectsForGrade } from './seedData';

export { supabase, db, queueChange, getPendingSync, updateSyncStatus, syncTypes };
export { CBC_STRUCTURE, CBC_CORE_COMPETENCIES, TERM_FEE, getLevelForGrade, getSubjectsForGrade };

export * from './coreStore';
export * from './financeStore';
export * from './studentStore';
export * from './academicsStore';
export * from './staffStore';
export * from './authStore';
export * from './libraryStore';
export * from './smsStore';
export * from './offlineStore';
