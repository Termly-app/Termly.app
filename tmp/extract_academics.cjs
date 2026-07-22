const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '../src/data/store.js');
const targetStorePath = path.join(__dirname, '../src/data/academicsStore.js');

let storeContent = fs.readFileSync(storePath, 'utf8');

const functionsToExtract = [
  'getPeriods', 'createPeriod', 'setActivePeriod', 'initActivePeriod', 'getCurrentPeriodDetails', 'getMarks', 'setStudentAllMarks', 'getClassResults', 'getSubjectRankings', 'getClassList', 'getExamMarksForPaper', 'getExams', 'createExam', 'deleteExam', 'updateExam', 'updateExamStatus', 'releaseExamToParents', 'getExamPapers', 'saveExamMarks', 'saveExamPapers', 'getExamResults', 'getStudentExamResults', 'getSubjectDetails', 'calculateExamResults', 'getAttendance', 'markAttendance', 'getAttendanceSummary', 'getCBC', 'setCBC', 'getSubjectAssignments', 'getTeacherForSubject', 'getClassSubjectAssignments', 'saveClassSubjectAssignment', 'getTTPeriods', 'saveTTPeriod', 'deleteTTPeriod', 'getTTSubjects', 'saveTTSubject', 'getTTTeacherSubjects', 'saveTTTeacherSubject', 'getSubjectsBySchool', 'getSubjects', 'saveSubject', 'deleteSubject'
];

let targetStoreContent = '';
if (fs.existsSync(targetStorePath)) {
  targetStoreContent = fs.readFileSync(targetStorePath, 'utf8');
} else {
  targetStoreContent = `import { supabase } from '../lib/supabase';
import { logPlatformActivity, logAuditEventEvent, maskSecret } from './store';
import {
  _currentSchoolId,
  _currentAuthUser,
  _currentExamType,
  _currentPeriodId,
  mutationGuard,
  updateSchoolFeature
} from './coreStore';
import { getTeachers } from './staffStore';
import { withRetry } from '../utils/resilience';

`;
}

for (const fn of functionsToExtract) {
  const exportDecl = 'export async function ' + fn + '(';
  const startIndex = storeContent.indexOf(exportDecl);
  if (startIndex === -1) {
    console.log('Function ' + fn + ' not found in store');
    continue;
  }
  
  const match = storeContent.substring(startIndex).match(/\)\s*\{/);
  if (!match) {
    console.log('Could not find body start for ' + fn);
    continue;
  }
  const bodyStartIndex = startIndex + match.index + match[0].indexOf('{');
  
  let braceCount = 0;
  let endIndex = -1;
  let inString = false;
  let stringChar = '';
  
  for (let i = bodyStartIndex; i < storeContent.length; i++) {
    const char = storeContent[i];
    const prevChar = storeContent[i-1];
    
    if ((char === "'" || char === '"' || char === "`") && prevChar !== "\\\\") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (stringChar === char) {
        inString = false;
      }
    }
    
    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
  
  if (endIndex !== -1) {
    const extractedContent = storeContent.substring(startIndex, endIndex);
    if (!targetStoreContent.includes(exportDecl)) {
      targetStoreContent += extractedContent + '\\n\\n';
    }
    storeContent = storeContent.substring(0, startIndex) + storeContent.substring(endIndex);
    console.log('Extracted ' + fn);
  } else {
    console.log('Failed to parse bounds for ' + fn);
  }
}

fs.writeFileSync(targetStorePath, targetStoreContent);
fs.writeFileSync(storePath, storeContent);
console.log('Extraction complete');
