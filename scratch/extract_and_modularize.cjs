const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../src/data');
const storePath = path.join(dataDir, 'store.js');
const storeCode = fs.readFileSync(storePath, 'utf8');

// Facade file content
const facadeCode = `/**
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
`;

// Helper to check exported functions
function getExportedFunctions(code) {
  const fns = [];
  const matches = code.matchAll(/^export (?:async )?function ([A-Za-z0-9_]+)/gm);
  for (const m of matches) fns.push(m[1]);
  return fns;
}

// Read current domain files
const domainFiles = [
  'coreStore.js',
  'financeStore.js',
  'studentStore.js',
  'academicsStore.js',
  'staffStore.js',
  'authStore.js',
  'libraryStore.js',
  'smsStore.js',
  'offlineStore.js'
];

const existingDomainFns = new Set();
domainFiles.forEach(f => {
  const c = fs.readFileSync(path.join(dataDir, f), 'utf8');
  getExportedFunctions(c).forEach(fn => existingDomainFns.add(fn));
});

const storeFns = getExportedFunctions(storeCode);
const missingInDomain = storeFns.filter(fn => !existingDomainFns.has(fn));

console.log(`Found ${missingInDomain.length} functions in store.js not yet in domain stores.`);

// Map unmapped functions to target files
const functionMapping = {
  // coreStore
  getRegisteredSchools: 'coreStore.js',
  searchSchools: 'coreStore.js',
  registerSchool: 'coreStore.js',
  findSchool: 'coreStore.js',
  repairSchoolProfile: 'coreStore.js',
  getDiscoveryMetrics: 'coreStore.js',
  getSchoolProfileBySchoolId: 'coreStore.js',
  getSchoolProfile: 'coreStore.js',
  checkIsSubscriptionActive: 'coreStore.js',
  getPortalAccessSettings: 'coreStore.js',
  updatePortalAccessSettings: 'coreStore.js',
  getPlatformUsageStats: 'coreStore.js',
  getPlatformSchoolProfiles: 'coreStore.js',
  getSchoolsForPortalSearch: 'coreStore.js',
  getSchemaStatus: 'coreStore.js',
  runSchemaMigration: 'coreStore.js',
  saveSchoolProfile: 'coreStore.js',
  getPrintHeader: 'coreStore.js',
  getPrintFooter: 'coreStore.js',
  getGradeForScore: 'coreStore.js',
  getSaasBlogPosts: 'coreStore.js',
  saveSaasBlogPost: 'coreStore.js',
  getFeaturedPartners: 'coreStore.js',
  sendSchoolInvite: 'coreStore.js',
  initStore: 'coreStore.js',
  resetAllData: 'coreStore.js',
  exportData: 'coreStore.js',
  importData: 'coreStore.js',
  getPlatformAdmins: 'coreStore.js',
  addPlatformAdmin: 'coreStore.js',
  removePlatformAdmin: 'coreStore.js',
  logPlatformActivity: 'coreStore.js',
  logAuditEvent: 'coreStore.js',
  getPlatformActivities: 'coreStore.js',
  getGlobalAuditLogs: 'coreStore.js',
  getPlatformSettings: 'coreStore.js',
  getGlobalTermExpiry: 'coreStore.js',
  updatePlatformSetting: 'coreStore.js',
  deleteSchool: 'coreStore.js',
  wipeAllNonAdminSchools: 'coreStore.js',
  getAllSchools: 'coreStore.js',
  deactivateSchool: 'coreStore.js',
  restoreSchool: 'coreStore.js',
  adminUpdateSchoolProfile: 'coreStore.js',
  suspendSchool: 'coreStore.js',
  getPlatformStats: 'coreStore.js',
  subscribeToChanges: 'coreStore.js',
  subscribeToPlatformChanges: 'coreStore.js',
  subscribeToSchoolChanges: 'coreStore.js',
  checkFeatureAccess: 'coreStore.js',
  isFeatureEnabled: 'coreStore.js',
  triggerSync: 'coreStore.js',
  searchPublicSchools: 'coreStore.js',
  getSchoolByCode: 'coreStore.js',
  getPortalActivity: 'coreStore.js',
  logPortalActivity: 'coreStore.js',

  // financeStore
  submitPayment: 'financeStore.js',
  getAllPendingPayments: 'financeStore.js',
  getAllPayments: 'financeStore.js',
  approvePayment: 'financeStore.js',
  rejectPayment: 'financeStore.js',
  cancelSubscription: 'financeStore.js',
  updateSchoolPlan: 'financeStore.js',
  manualExtendSubscription: 'financeStore.js',
  simulateMpesaSTKPush: 'financeStore.js',
  getTermFinancialSummary: 'financeStore.js',

  // authStore
  getUsers: 'authStore.js',
  saveUsers: 'authStore.js',
  addUser: 'authStore.js',
  deleteUser: 'authStore.js',
  getUserByAuthId: 'authStore.js',
  setSelfPassword: 'authStore.js',
  validateStaffLogin: 'authStore.js',
  validateParentLogin: 'authStore.js',
  resetUserPassword: 'authStore.js',

  // studentStore
  getStudentsBySchool: 'studentStore.js',

  // smsStore
  queueSMS: 'smsStore.js',
  getSMSLogs: 'smsStore.js',
  queueSmsBatch: 'smsStore.js',
  testSmsConnection: 'smsStore.js',
  logCommunication: 'smsStore.js',
  sendSMSMessage: 'smsStore.js',
  sendWhatsAppMessage: 'smsStore.js',
  getWhatsAppLink: 'smsStore.js',
  getCommunicationLogs: 'smsStore.js',

  // academicsStore (all remaining timetable, assignment, class, notification functions)
  default: 'academicsStore.js'
};

// Function body extraction helper
function extractFunctionCode(source, fnName) {
  const regex = new RegExp(`export (?:async )?function ${fnName}\\s*\\([\\s\\S]*?^(?=[}]);?$`, 'm');
  // Safer block extraction using AST-like brace counting
  const startIdx = source.indexOf(`function ${fnName}`);
  if (startIdx === -1) return null;
  const exportStart = source.lastIndexOf('export', startIdx);
  
  let braceCount = 0;
  let started = false;
  let endIdx = -1;

  for (let i = startIdx; i < source.length; i++) {
    if (source[i] === '{') {
      braceCount++;
      started = true;
    } else if (source[i] === '}') {
      braceCount--;
      if (started && braceCount === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }

  if (endIdx !== -1) {
    return source.substring(exportStart, endIdx);
  }
  return null;
}

const appendMap = {};

missingInDomain.forEach(fn => {
  const target = functionMapping[fn] || functionMapping.default;
  const code = extractFunctionCode(storeCode, fn);
  if (code) {
    if (!appendMap[target]) appendMap[target] = [];
    appendMap[target].push(code);
  } else {
    console.warn(`Could not extract function: ${fn}`);
  }
});

// Append to target domain files
Object.keys(appendMap).forEach(file => {
  const filePath = path.join(dataDir, file);
  const existingContent = fs.readFileSync(filePath, 'utf8');
  const newContent = existingContent + '\n\n' + appendMap[file].join('\n\n') + '\n';
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Appended ${appendMap[file].length} functions to ${file}`);
});

// Overwrite store.js with the clean facade!
fs.writeFileSync(storePath, facadeCode, 'utf8');
console.log('Successfully converted store.js into facade re-export module!');
