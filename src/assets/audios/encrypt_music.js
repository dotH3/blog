const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const algo = 'aes-256-cbc';

function deriveKey(key) {
  return crypto.createHash('sha256').update(key).digest(); // 32 bytes
}

// Nombre del archivo en disco: opaco, no revela el original.
// Determinístico por (nombre, key) — re-encriptar el mismo archivo da el mismo nombre.
function opaqueName(originalName, key) {
  return crypto
    .createHash('sha256')
    .update(originalName + '::' + key)
    .digest('hex')
    .slice(0, 32) + '.enc';
}

// payload encriptado = [len nombre (2 bytes BE)] [nombre utf8] [bytes del archivo]
// Así el nombre original viaja dentro del cifrado y solo aparece al desencriptar.
function cifrar(input, key) {
  const k = deriveKey(key);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algo, k, iv);

  const name = path.basename(input);
  const nameBuf = Buffer.from(name, 'utf8');
  const header = Buffer.alloc(2);
  header.writeUInt16BE(nameBuf.length, 0);
  const data = fs.readFileSync(input);

  const plain = Buffer.concat([header, nameBuf, data]);
  const enc = Buffer.concat([iv, cipher.update(plain), cipher.final()]);

  const out = path.join(path.dirname(input), opaqueName(name, key));
  fs.writeFileSync(out, enc);
  return out;
}

function descifrar(input, key) {
  const k = deriveKey(key);
  const file = fs.readFileSync(input);
  const iv = file.subarray(0, 16);
  const enc = file.subarray(16);
  const decipher = crypto.createDecipheriv(algo, k, iv);
  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);

  const nameLen = plain.readUInt16BE(0);
  const name = plain.subarray(2, 2 + nameLen).toString('utf8');
  const data = plain.subarray(2 + nameLen);
  return { name, data };
}

module.exports = { cifrar, descifrar, opaqueName };

// CLI: node encrypt_music.js <archivo> <key>
if (require.main === module) {
  const [, , input, key] = process.argv;
  if (!input || !key) {
    console.error('uso: node encrypt_music.js <archivo> <key>');
    process.exit(1);
  }
  const out = cifrar(input, key);
  console.log('encriptado ->', out);
}
