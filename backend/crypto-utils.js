const crypto = require('crypto');

// Ключ шифрования берём из .env. Если он короче 32 байт — дополняем хешем,
// чтобы crypto не падал (но в бою нужно использовать полноценный случайный ключ).
function getKey() {
  const raw = process.env.ENCRYPTION_KEY || 'insecure_default_key_change_me';
  return crypto.createHash('sha256').update(raw).digest();
}

function encrypt(text) {
  if (text === null || text === undefined) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Храним как base64: iv + authTag + ciphertext, через точку
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join('.');
}

function decrypt(payload) {
  if (!payload) return null;
  try {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    // Если payload не был зашифрован (старые данные) — возвращаем как есть
    return payload;
  }
}

module.exports = { encrypt, decrypt };
