import fs from 'fs';

const storePath = 'src/data/store.js';
const newStorePath = 'src/data/academicsStore.js';

let code = fs.readFileSync(storePath, 'utf8');

const funcsToExtract = [
  'getExams', 'migrateLegacyExams', 'createExam', 'deleteExam', 'updateExam', 'updateExamStatus',
  'releaseExamToParents', 'openExamForTeacherEntry', 'getExamPapers', 'saveExamMarks',
  'saveExamPapers', 'getExamResults', 'getStudentExamResults', 'getStudentProfile',
  'getSubjectDetails', 'calculateExamResults', 'setStudentMarks', 'setStudentAllMarks',
  'getClassStreams', 'createClassStream', 'getTeacherAssignments', 'assignTeacher',
  'removeTeacherAssignment', 'getSubjectConfigurations', 'updateSubjectConfig',
  'publishExamForTeacherEntry', 'releaseResultsToParents', 'retractExamResults',
  'getOpenExamsForTeacher', 'previewClassPromotion', 'promoteClasses',
  'isCurrentPeriod', 'carryForwardTeacherAssignments'
];

let extractedCode = `import { supabase } from '../lib/supabase';
import { 
  _currentSchoolId, 
  _currentPeriodId, 
  _currentUserId, 
  _currentAuthUser, 
  mutationGuard, 
  cachedQuery, 
  invalidateCache,
  logAuditEvent,
  sendEmail,
  getUserByAuthId,
  _currentExamType,
  getSubjects
} from './store';
import { getSubjectsForGrade } from './seedData';
import { emailTemplates } from '../utils/emailService';

`;

funcsToExtract.forEach(funcName => {
  // Try finding 'export async function funcName' or 'export function funcName' or 'async function funcName'
  let regexStr = `(?:export\\s+)?(?:async\\s+)?function\\s+${funcName}\\s*\\(`;
  let match = new RegExp(regexStr).exec(code);
  
  if (match) {
    console.log('Extracting', funcName);
    let startIndex = match.index;
    
    // Also include preceding JSDoc comment if present
    const precedingCode = code.slice(Math.max(0, startIndex - 200), startIndex);
    const commentMatch = precedingCode.lastIndexOf('/**');
    if (commentMatch !== -1 && precedingCode.indexOf('*/', commentMatch) !== -1) {
       // if there's no other function declaration between comment and function
       if (!/function\s+/.test(precedingCode.slice(precedingCode.indexOf('*/', commentMatch)))) {
           startIndex = startIndex - 200 + commentMatch;
       }
    }

    let braceCount = 0;
    let endIndex = -1;
    let inString = false;
    let stringChar = '';
    let started = false;

    for (let i = match.index; i < code.length; i++) {
      const char = code[i];
      const prevChar = code[i - 1];

      if ((char === '"' || char === "'" || char === '\`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
        }
      }

      if (started && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }

    if (endIndex !== -1) {
      extractedCode += code.slice(startIndex, endIndex) + '\n\n';
      // remove from original code
      code = code.slice(0, startIndex) + code.slice(endIndex);
    }
  } else {
    console.log('Could not find', funcName);
  }
});

fs.writeFileSync(newStorePath, extractedCode);
fs.writeFileSync(storePath, code);

console.log('Extraction complete!');
