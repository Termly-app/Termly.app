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
 * Guard against CSV injection attacks.
 * Strips leading characters that could be interpreted as formulas by Excel/Sheets.
 */
function sanitizeCSVValue(value) {
  if (!value) return '';
  let str = String(value).trim();
  // Strip leading formula-triggering characters
  while (str.length > 0 && ['=', '+', '-', '@', '\t', '\r'].includes(str.charAt(0))) {
    str = str.substring(1).trim();
  }
  return str;
}

/**
 * Safely escape a CSV cell value
 */
function cell(value) {
  const str = sanitizeCSVValue(value);
  if (str === '') return '';
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
 * Sanitize a Kenyan phone number to +254XXXXXXXXX format.
 * Handles: 0712345678, 254712345678, +254712345678, 712345678
 */
function sanitizePhone(phone) {
  if (!phone) return '';
  // Remove all non-digit characters except leading +
  let cleaned = String(phone).replace(/[^\d+]/g, '');
  
  // Remove leading +
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  
  // Handle Kenyan numbers
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '254' + cleaned.substring(1);
  }
  if (cleaned.length === 9 && !cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  // Add + prefix
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return '+' + cleaned;
  }
  
  // Return original if we can't normalize
  return phone.trim();
}

/**
 * Validate UPI format — NEMIS UPIs are typically 13 numeric digits
 */
function validateUPI(upi) {
  if (!upi) return { valid: false, reason: 'Missing UPI' };
  const cleaned = String(upi).trim();
  if (!/^\d+$/.test(cleaned)) return { valid: false, reason: 'UPI must be numeric' };
  if (cleaned.length !== 13) return { valid: false, reason: `UPI should be 13 digits (got ${cleaned.length})` };
  return { valid: true };
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
      cell(sanitizePhone(s.father_phone)),
      cell(s.mother_name      || ''),
      cell(sanitizePhone(s.mother_phone)),
      cell(s.guardian_name    || s.parent_name      || s.father_name || s.mother_name || ''),
      cell(sanitizePhone(s.guardian_phone || s.parent_phone || s.father_phone || s.mother_phone)),
      cell(s.guardian_relationship || (s.father_name ? 'Father' : s.mother_name ? 'Mother' : 'Guardian')),
    ].join(','));

  // Add row count as a comment at the end for verification
  const csv = [NEMIS_HEADERS.join(','), ...rows].join('\n');
  
  return csv;
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
    
    // Validate UPI if present
    const upi = s.nemis_number || s.upi;
    if (upi) {
      const upiCheck = validateUPI(upi);
      if (!upiCheck.valid) issues.push(`${name}: ${upiCheck.reason}`);
    }
  });

  return issues;
}

/**
 * Get export summary for display in UI
 * @param {Array} students
 * @returns {Object} { totalRows, validRows, issueCount, issues }
 */
export function getExportSummary(students) {
  const issues = validateNEMISData(students);
  const validRows = students.filter(s => 
    (s.surname || s.last_name) && 
    (s.first_name || s.name) && 
    (s.admission_number || s.adm_no)
  ).length;

  return {
    totalRows: students.length,
    validRows,
    issueCount: issues.length,
    issues
  };
}
