const crypto = require('crypto');
const zlib = require('zlib');

// v1 files (header RFAC) used a key hard-coded in the source, so anyone could decrypt them.
// They stay importable, including exports made by upstream Riff, but are never written again.
const LEGACY_KEYS = ['riff-account-key-v1', 'ngeringukno-account-key-v1'].map((s) => crypto.createHash('sha256').update(s).digest());

// v2 (header RFA2): AES-256-GCM with a key derived from the user's password.
const V2_HEADER = Buffer.from('RFA2');
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const MIN_PASSWORD = 8;

function deriveKey(password, salt) {
  return crypto.scryptSync(String(password), salt, 32, SCRYPT);
}

function encryptAccount(dataObj, password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new Error(`Password must be at least ${MIN_PASSWORD} characters`);
  }
  const jsonStr = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
  const compressed = zlib.deflateRawSync(Buffer.from(jsonStr, 'utf8'));
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(password, salt), iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  return Buffer.concat([V2_HEADER, salt, iv, cipher.getAuthTag(), encrypted]);
}

function openGcm(key, iv, tag, encrypted) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(zlib.inflateRawSync(decrypted).toString('utf8'));
}

function needsPassword(buffer) {
  return Buffer.isBuffer(buffer) && buffer.subarray(0, 4).equals(V2_HEADER);
}

function decryptAccount(buffer, password) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 32) throw new Error('Invalid account file');
  const header = buffer.subarray(0, 4).toString('utf8');
  if (header === 'RFAC') {
    const iv = buffer.subarray(4, 16);
    const tag = buffer.subarray(16, 32);
    const encrypted = buffer.subarray(32);
    for (const key of LEGACY_KEYS) {
      try { return openGcm(key, iv, tag, encrypted); } catch (_) {}
    }
    throw new Error('Invalid account file');
  }
  if (header === 'RFA2') {
    if (buffer.length < 4 + 16 + 12 + 16 + 1) throw new Error('Invalid account file');
    if (typeof password !== 'string' || !password) throw new Error('Password required');
    const salt = buffer.subarray(4, 20);
    const iv = buffer.subarray(20, 32);
    const tag = buffer.subarray(32, 48);
    try {
      return openGcm(deriveKey(password, salt), iv, tag, buffer.subarray(48));
    } catch (_) {
      throw new Error('Wrong password or damaged file');
    }
  }
  throw new Error('Invalid file header');
}

module.exports = { encryptAccount, decryptAccount, needsPassword, MIN_PASSWORD };
