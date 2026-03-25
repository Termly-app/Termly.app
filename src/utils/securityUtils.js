/**
 * Security Utilities for ShuleSoft
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
  const seed = `shulesoft-v1-${schoolId}`;
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
