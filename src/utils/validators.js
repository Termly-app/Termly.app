/**
 * validators.js — Centralized input validation for Termly
 * 
 * All validation functions return { valid: boolean, message: string }
 */

/**
 * Validate M-PESA transaction code (10 alphanumeric characters, uppercase)
 */
export function validateMpesaCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'M-PESA code is required.' };
  }
  const cleaned = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(cleaned)) {
    return { valid: false, message: 'M-PESA code must be exactly 10 alphanumeric characters (e.g., SJK4ABCDEF).' };
  }
  return { valid: true, message: '', value: cleaned };
}

/**
 * Validate exam marks (0–100 range)
 */
export function validateMarks(score) {
  const num = Number(score);
  if (isNaN(num)) {
    return { valid: false, message: 'Score must be a number.' };
  }
  if (num < 0 || num > 100) {
    return { valid: false, message: 'Score must be between 0 and 100.' };
  }
  return { valid: true, message: '', value: num };
}

/**
 * Validate Kenyan phone number
 * Accepts: 0712345678, +254712345678, 254712345678
 */
export function validateKenyanPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, message: 'Phone number is required.' };
  }
  const cleaned = phone.trim().replace(/\s/g, '');
  
  // Match: +254XXXXXXXXX, 254XXXXXXXXX, or 0XXXXXXXXX
  if (/^\+?254[0-9]{9}$/.test(cleaned) || /^0[0-9]{9}$/.test(cleaned)) {
    // Normalize to 254 format
    let normalized = cleaned;
    if (normalized.startsWith('+')) normalized = normalized.substring(1);
    if (normalized.startsWith('0')) normalized = '254' + normalized.substring(1);
    return { valid: true, message: '', value: normalized };
  }
  
  return { valid: false, message: 'Invalid Kenyan phone number. Use format: 0712345678 or +254712345678.' };
}

/**
 * Validate student admission number
 */
export function validateAdmissionNumber(admNo) {
  if (!admNo || typeof admNo !== 'string' || admNo.trim().length < 2) {
    return { valid: false, message: 'Admission number must be at least 2 characters.' };
  }
  if (admNo.trim().length > 20) {
    return { valid: false, message: 'Admission number is too long (max 20 characters).' };
  }
  return { valid: true, message: '', value: admNo.trim() };
}

/**
 * Sanitize text input to prevent XSS
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
