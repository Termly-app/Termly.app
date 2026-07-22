const fs = require('fs');
const content = fs.readFileSync('src/data/store.js', 'utf8');
const lines = content.split('\n');

// We know from our view_file that line 259 is "// ============= SCHOOLS ============="
// so we slice from index 258 (which is line 259).
const newLines = lines.slice(258);

const header = `import { supabase } from '../lib/supabase';
import { db, queueChange, getPendingSync, updateSyncStatus, syncTypes } from './offlineStore';
import { SANDBOX_PLAN } from './constants';

import {
  _currentSchoolId,
  _currentAuthUser,
  _currentPeriodId,
  _currentUserId,
  _currentExamType,
  initPortalStore,
  isShadowMode,
  mutationGuard,
  shouldFetchCloud,
  cachedQuery,
  invalidateCache,
  hasFeature,
  invalidateFeatureCache,
  getAllFeaturesRegistry,
  updateSchoolFeature,
  getSchoolFeatures,
  setCurrentSchoolContext,
  setCurrentPeriodId,
  getCurrentPeriodId,
  setCurrentExamType,
  getCurrentExamType,
  getCurrentSchoolId,
  getCurrentAuthUser,
  setCurrentSchool,
  getCurrentSchool
} from './coreStore';

export * from './coreStore';

function maskSecret(val) {
  if (!val || val.length < 4) return val;
  return \`\${val.substring(0, 4)}...********\`;
}

import { CBC_STRUCTURE, CBC_CORE_COMPETENCIES, TERM_FEE, getLevelForGrade, getSubjectsForGrade } from './seedData';
export { CBC_STRUCTURE, CBC_CORE_COMPETENCIES, TERM_FEE, getLevelForGrade, getSubjectsForGrade };

import { encryptData as encrypt, decryptData as decrypt } from '../utils/securityUtils';
import { withRetry } from '../utils/resilience';
import { sanitizeString, sanitizeName } from '../utils/sanitize';

var _profileCache    = null;
var _profilePromise  = null;
var _settingsCache   = null;
var _settingsPromise = null;

window.addEventListener('schoolProfileChanged', () => {
  _profileCache = null;
  _profilePromise = null;
});`;

fs.writeFileSync('src/data/store.js', header + '\n' + newLines.join('\n'));
console.log('Header replaced successfully.');
