/**
 * Security Utilities for Termly
 * Uses Web Crypto API for AES-256-GCM encryption
 */

const ALGO = 'AES-GCM';
const KEY_LEN = 256;

/**
 * Derives a cryptographic key from a school ID and a system secret
 * @param {string} schoolId 
 * @returns {Promise<CryptoKey>}
 */
async function getEncryptionKey(schoolId) {
  // In a real production app, 'SYSTEM_SECRET' would be an environment variable 
  // or fetched via a secure vault. For this architectural demonstration, 
  // we use a platform-stable seed combined with the unique schoolId.
  const seed = `Termly-v1-${schoolId}`;
  const enc = new TextEncoder();
  const keyData = enc.encode(seed.padEnd(32, '0').slice(0, 32)); // 256-bit

  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGO },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a JS object or string
 * @param {any} data 
 * @param {string} schoolId 
 * @returns {Promise<string>} Base64 encoded JSON {iv, data}
 */
export async function encryptData(data, schoolId) {
  if (!data) return null;
  const key = await getEncryptionKey(schoolId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  
  const plainText = typeof data === 'string' ? data : JSON.stringify(data);
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    enc.encode(plainText)
  );

  const result = {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  };

  return `ENC:${JSON.stringify(result)}`;
}

/**
 * Decrypts a previously encrypted string
 * @param {string} encryptedStr 
 * @param {string} schoolId 
 * @returns {Promise<any>}
 */
export async function decryptData(encryptedStr, schoolId) {
  if (!encryptedStr || !encryptedStr.startsWith('ENC:')) return encryptedStr;

  try {
    const { iv: ivB64, data: dataB64 } = JSON.parse(encryptedStr.slice(4));
    const key = await getEncryptionKey(schoolId);
    
    const iv = new Uint8Array(atob(ivB64).split('').map(c => c.charCodeAt(0)));
    const encrypted = new Uint8Array(atob(dataB64).split('').map(c => c.charCodeAt(0)));

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      encrypted
    );

    const result = new TextDecoder().decode(decrypted);
    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  } catch (err) {
    console.error("Decryption failed:", err);
    return null; 
  }
}

/**
 * Domain 16: Security Headers & CSP
 * In a real production environment, these are usually set at the CDN/Server level (Vercel/Nginx).
 * This function generates the <meta> tag equivalent for client-side enforcement.
 */
export function applySecurityHeaders() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseDomain = supabaseUrl ? new URL(supabaseUrl).hostname : '';
  
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.africastalking.com https://cdn.jsdelivr.net",
    `connect-src 'self' ${supabaseUrl} wss://*.supabase.co https://*.supabase.co https://*.africastalking.com https://*.safaricom.co.ke https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com`,
    "img-src 'self' data: https://*.supabase.co https://*.googleusercontent.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "frame-src 'none'",
    "object-src 'none'"
  ].join('; ');

  // Inject Meta CSP
  let meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.httpEquiv = "Content-Security-Policy";
    document.head.appendChild(meta);
  }
  meta.content = csp;

  console.log('[SECURITY] Security headers applied (CSP Restricted).');
}

/**
 * Domain 1: Granular RBAC Permissions
 */
const ROLE_PERMISSIONS = {
  admin: ['*'], // All permissions
  finance: [
    'fees:read', 'fees:write', 'fees:delete',
    'students:read',
    'reports:read'
  ],
  teacher: [
    'students:read',
    'academics:read', 'academics:write',
    'attendance:read', 'attendance:write',
    'lms:read', 'lms:write'
  ],
  librarian: [
    'library:read', 'library:write',
    'students:read'
  ],
  parent: [
    'portal:read',
    'student:read'
  ]
};

export function checkPermission(role, action) {
  if (!role) return false;
  const normalizedRole = role.toLowerCase();
  const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
  
  if (permissions.includes('*')) return true;
  return permissions.includes(action);
}
