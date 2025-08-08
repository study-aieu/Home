const crypto = require('crypto');

const HEX_KEY_LEN = 64; // 32 bytes

function getKey() {
  const hex = process.env.ENCRYPTION_KEY || '';
  if (hex.length !== HEX_KEY_LEN) {
    throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

function encryptString(plainText) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([encrypted, authTag]).toString('base64');
  return { payload, iv: iv.toString('base64') };
}

function decryptString(payloadBase64, ivBase64) {
  const key = getKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const payload = Buffer.from(payloadBase64, 'base64');
  const encrypted = payload.slice(0, payload.length - 16);
  const authTag = payload.slice(payload.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encryptString, decryptString };