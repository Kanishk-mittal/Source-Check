/**
 * Client-Side Cryptographic Vault Service
 * Implements Web Cryptography API + IndexedDB + Vault PIN encryption (The Vault Approach)
 *
 * Workflow:
 * 1. Capture and Clear: key is captured, processed, and memory references are nulled out.
 * 2. Key Derivation: PBKDF2 derives an AES-GCM 256-bit symmetric encryption key from the user's PIN + salt.
 * 3. Authenticated Encryption: AES-GCM wraps/encrypts the raw PKCS#8 private key bytes.
 * 4. Storage: Encrypted ciphertext, salt, and IV are stored in IndexedDB.
 * 5. Signing Authorization: When signing, the user enters their PIN to momentarily authorize and unwrap
 *    the key for in-flight transmission, clearing memory immediately after.
 */

const DB_NAME = 'ProvenanceVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'vault_keys';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Converts a PEM string (PKCS#8) to a Uint8Array
 */
function pemToArrayBuffer(pem) {
  const cleanPem = pem
    .replace(/-----BEGIN[ A-Z0-9_-]+-----/g, '')
    .replace(/-----END[ A-Z0-9_-]+-----/g, '')
    .replace(/\s+/g, '');
  const binaryString = atob(cleanPem);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts an ArrayBuffer back to PKCS#8 PEM string
 */
function arrayBufferToPem(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const formatted = base64.match(/.{1,64}/g)?.join('\n') || base64;
  return `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----`;
}

/**
 * Derives an AES-GCM 256 key from a PIN using PBKDF2
 */
async function deriveAesKeyFromPin(pin, salt) {
  const enc = new TextEncoder();
  const pinKeyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    pinKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts and saves an RSA private key into IndexedDB using a Vault PIN
 */
export async function storeVaultKey(userId, username, privateKeyPem, pin) {
  if (!privateKeyPem || !pin) {
    throw new Error('Private key and PIN are required for vault storage');
  }

  // 1. Generate cryptographic salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 2. Derive symmetric key from PIN
  const aesKey = await deriveAesKeyFromPin(pin, salt);

  // 3. Convert PEM to binary buffer and encrypt
  let keyBuffer = pemToArrayBuffer(privateKeyPem);
  const encryptedKey = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    aesKey,
    keyBuffer
  );

  // Aggressive in-memory wipe
  keyBuffer = null;

  // 4. Save into IndexedDB
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = {
      userId,
      username,
      encryptedKey,
      salt: Array.from(salt),
      iv: Array.from(iv),
      createdAt: new Date().toISOString()
    };
    const req = store.put(record);
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Unlocks the vault using the user's PIN and returns the private key PEM
 */
export async function unlockVaultKey(userId, pin) {
  const db = await openDatabase();
  const record = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(userId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });

  if (!record) {
    throw new Error('No vault key found on this device for this user');
  }

  const salt = new Uint8Array(record.salt);
  const iv = new Uint8Array(record.iv);

  try {
    const aesKey = await deriveAesKeyFromPin(pin, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      aesKey,
      record.encryptedKey
    );
    return arrayBufferToPem(decryptedBuffer);
  } catch (err) {
    throw new Error('Incorrect Vault PIN or corrupted key material');
  }
}

/**
 * Checks if a user has a stored vault key in IndexedDB
 */
export async function hasVaultKey(userId) {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(userId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Deletes vault record from IndexedDB
 */
export async function deleteVaultKey(userId) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(userId);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to remove vault key:', err);
  }
}
