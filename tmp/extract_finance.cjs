const fs = require('fs');
const content = fs.readFileSync('src/data/store.js', 'utf8');

const exportsList = [
  'getFees', 'getStudentFeeSummary', 'recordPayment', 'deletePayment',
  'getPayments', 'generateBulkFeeInvoices', 'deleteBulkFeeInvoices',
  'applyFeeWaiver', 'updateAllStudentsFeeStructure', 'getFeeSummary',
  'getFeeStructures', 'createFeeStructure', 'updateFeeStructure',
  'deleteFeeStructure', 'calculateStudentTermFee', 'processMpesaPayment',
  'getMpesaLogs', 'testMpesaConnection', 'getOrphanedMpesaCallbacks',
  'autoProcessMpesaCallbacks', 'simulateMpesaCallback', 'reconcileMpesaPayment'
];

let financeContent = `import { supabase } from '../lib/supabase';
import { db, queueChange } from './offlineStore';
import { 
  _currentSchoolId, _currentPeriodId, mutationGuard, cachedQuery, invalidateCache, getCurrentSchoolId, getCurrentPeriodId 
} from './coreStore';
import { logAudit } from './store'; // for now, assuming logAudit is still in store

// ==========================================
// FINANCE & FEES (Extracted from store.js)
// ==========================================

`;

let newStoreContent = content;

exportsList.forEach(funcName => {
  const regex = new RegExp(`export async function ${funcName}\\b[\\s\\S]*?\\n\\}`, 'gm');
  const match = content.match(regex);
  if (match) {
    financeContent += match[0] + '\n\n';
    newStoreContent = newStoreContent.replace(match[0], '');
  }
});

// Add export statements to store.js
const exportStatement = `export * from './financeStore';\n`;
newStoreContent = newStoreContent.replace(/export \* from '\.\/coreStore';/, `export * from './coreStore';\n${exportStatement}`);

fs.writeFileSync('src/data/financeStore.js', financeContent);
fs.writeFileSync('src/data/store.js', newStoreContent);
console.log('Extraction complete');
