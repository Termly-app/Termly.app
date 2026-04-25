const fs = require('fs');

const diffContent = fs.readFileSync('diff.patch', 'utf8');

// split diff into header and hunks
// A hunk starts with "@@ -"
const parts = diffContent.split('\n@@ ');

const header = parts[0] + '\n';
const hunks = parts.slice(1).map(h => '@@ ' + h);

const funcsWeMessedUp = [
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

const filteredHunks = hunks.filter(hunk => {
  // Check if this hunk deletes any of our target functions
  let shouldRemove = false;
  funcsWeMessedUp.forEach(func => {
    if (hunk.includes('-export async function ' + func) || 
        hunk.includes('-export function ' + func) ||
        hunk.includes('-async function ' + func) ||
        hunk.includes('-function ' + func)) {
      shouldRemove = true;
    }
  });
  return !shouldRemove;
});

fs.writeFileSync('filtered.patch', header + filteredHunks.join(''));
console.log(`Original hunks: ${hunks.length}, Filtered hunks: ${filteredHunks.length}`);
