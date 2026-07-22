const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '../src/data/store.js');
const staffStorePath = path.join(__dirname, '../src/data/staffStore.js');

let storeContent = fs.readFileSync(storePath, 'utf8');

const functionsToExtract = [
  'getUsers',
  'saveUsers',
  'addUser',
  'deleteUser',
  'getUserByAuthId',
  'validateStaffLogin',
  'getTeachers',
  'setTeacherLeaveStatus',
  'getTeachersBySchool',
  'addTeacher',
  'updateTeacher',
  'deleteTeacher',
  'isStaffCodeAvailable',
  'getSubjectAssignments',
  'getTeacherForSubject',
  'getTeacherPerformance',
  'getTeacherWorkload',
  'checkIsPlatformAdmin',
  'getPlatformAdmins',
  'addPlatformAdmin',
  'removePlatformAdmin',
  'wipeAllNonAdminSchools',
  'resetUserPassword',
  'getTeacherTimetable',
  'getTeacherWorkloadSummary',
  'getClassSubjectAssignments',
  'saveClassSubjectAssignment',
  'getTTTeacherSubjects',
  'saveTTTeacherSubject'
];

let staffStoreContent = `import { supabase } from '../lib/supabase';
import { logPlatformActivity, logAuditEvent } from './store';
import {
  _currentSchoolId,
  _currentAuthUser,
  _currentExamType,
  mutationGuard
} from './coreStore';
import { withRetry } from '../utils/resilience';

`;

for (const fn of functionsToExtract) {
  const regex = new RegExp(`export\\s+async\\s+function\\s+${fn}\\s*\\([\\s\\S]*?\\n}\\n`, 'g');
  const match = regex.exec(storeContent);
  if (match) {
    staffStoreContent += match[0] + '\n';
    storeContent = storeContent.replace(match[0], '');
    console.log(`Extracted ${fn}`);
  } else {
    console.log(`Function ${fn} not found`);
  }
}

fs.writeFileSync(staffStorePath, staffStoreContent);
fs.writeFileSync(storePath, storeContent);
console.log('Extraction complete');
