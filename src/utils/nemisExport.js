/**
 * nemisExport.js — Kenya NEMIS CSV export utility
 *
 * Generates a CSV file in the standard NEMIS format used by the
 * Kenya National Education Management Information System.
 *
 * NEMIS required fields (as per MoE specification):
 *   UPI, Surname, First Name, Other Name, Gender, DOB,
 *   Admission No, Class, Stream, Birth Certificate No,
 *   Special Needs, County, Sub-County, Ward,
 *   Father Name/Phone, Mother Name/Phone, Guardian Name/Phone/Relationship
 *
 * Usage:
 *   import { exportNEMIS, downloadCSV } from '../../utils/nemisExport';
 *   const csv = exportNEMIS(students, schoolName);
 *   downloadCSV(csv, `NEMIS_${schoolName}_Term1_2025.csv`);
 */

// ── CBC Kenya grade labels ────────────────────────────────────────────────
export const CBC_GRADES = [
  'PP1', 'PP2',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
  'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
];

export const SECONDARY_GRADES = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
export const ALL_GRADES = [...CBC_GRADES, ...SECONDARY_GRADES];

// ── NEMIS column headers (exact MoE spelling) ─────────────────────────────
const NEMIS_HEADERS = [
  'UPI',
  'Surname',
  'First Name',
  'Other Name',
  'Gender',
  'Date of Birth',
  'Admission Number',
  'Class',
  'Stream',
  'Birth Certificate No',
  'Special Needs Category',
  'County',
  'Sub-County',
  'Ward',
  'Village',
  "Father's Name",
  "Father's Phone",
  "Mother's Name",
  "Mother's Phone",
  "Guardian's Name",
  "Guardian's Phone",
  "Guardian's Relationship",
];

/**
 * Safely escape a CSV cell value
 */
function cell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  // Wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format a date string to DD/MM/YYYY (NEMIS standard)
 */
function formatDOB(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

/**
 * Normalise gender to M/F (NEMIS standard)
 */
function normaliseGender(g) {
  if (!g) return '';
  const v = g.toLowerCase();
  if (v === 'm' || v === 'male' || v === 'boy')   return 'M';
  if (v === 'f' || v === 'female' || v === 'girl') return 'F';
  return g.toUpperCase().charAt(0);
}

/**
 * Main export function
 * @param {Array}  students   — array of student objects from Supabase
 * @param {Object} options    — { includeIncomplete: bool }
 * @returns {string}          — CSV string ready for download
 */
export function exportNEMIS(students, options = {}) {
  const { includeIncomplete = true } = options;

  const rows = students
    .filter(s => includeIncomplete || (s.surname && s.first_name && s.admission_number))
    .map(s => [
      cell(s.nemis_number     || s.upi             || ''),
      cell(s.surname          || s.last_name        || ''),
      cell(s.first_name       || s.name?.split(' ')[0] || ''),
      cell(s.other_name       || s.middle_name      || ''),
      cell(normaliseGender(s.gender)),
      cell(formatDOB(s.date_of_birth || s.dob)),
      cell(s.admission_number || s.adm_no           || ''),
      cell(s.grade            || s.class            || ''),
      cell(s.stream           || ''),
      cell(s.birth_cert_no    || s.birth_certificate || ''),
      cell(s.special_needs    || ''),
      cell(s.county           || ''),
      cell(s.sub_county       || s.subcounty        || ''),
      cell(s.ward             || ''),
      cell(s.village          || ''),
      cell(s.father_name      || ''),
      cell(s.father_phone     || ''),
      cell(s.mother_name      || ''),
      cell(s.mother_phone     || ''),
      cell(s.guardian_name    || s.parent_name      || s.father_name || s.mother_name || ''),
      cell(s.guardian_phone   || s.parent_phone     || s.father_phone || s.mother_phone || ''),
      cell(s.guardian_relationship || (s.father_name ? 'Father' : s.mother_name ? 'Mother' : 'Guardian')),
    ].join(','));

  return [NEMIS_HEADERS.join(','), ...rows].join('\n');
}

/**
 * Download the CSV string as a file in the browser
 * @param {string} csvString
 * @param {string} filename
 */
export function downloadCSV(csvString, filename) {
  // BOM so Excel opens it correctly with UTF-8 characters
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a NEMIS-ready filename
 * @param {string} schoolName
 * @param {string} term  — e.g. 'Term 1 2025'
 */
export function nemisFilename(schoolName, term = '') {
  const clean = schoolName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  const termClean = term ? `_${term.replace(/\s+/g, '_')}` : '';
  const date = new Date().toISOString().slice(0, 10);
  return `NEMIS_${clean}${termClean}_${date}.csv`;
}

/**
 * Validate student records — returns array of issues
 * Useful for showing warnings before export
 */
export function validateNEMISData(students) {
  const issues = [];

  students.forEach((s, i) => {
    const row = i + 1;
    const name = s.name || s.first_name || `Row ${row}`;
    if (!s.surname && !s.last_name)      issues.push(`${name}: Missing surname`);
    if (!s.first_name && !s.name)        issues.push(`${name}: Missing first name`);
    if (!s.admission_number && !s.adm_no) issues.push(`${name}: Missing admission number`);
    if (!s.gender)                        issues.push(`${name}: Missing gender`);
    if (!s.date_of_birth && !s.dob)      issues.push(`${name}: Missing date of birth`);
    if (!s.grade && !s.class)            issues.push(`${name}: Missing class/grade`);
  });

  return issues;
}
