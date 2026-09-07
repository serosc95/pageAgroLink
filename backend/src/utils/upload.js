/**
 * Guarda fotos enviadas como data URL (base64) en /uploads.
 * Solo acepta JPEG, PNG y WebP.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { env } = require('../config/env');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * @param {string} dataUrl  data:image/jpeg;base64,...
 * @returns {string} ruta pública /uploads/archivo.ext
 */
function saveDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    const err = new Error('La foto debe ser JPEG, PNG o WebP en formato data URL');
    err.status = 400;
    throw err;
  }
  const mime = match[1];
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length) {
    const err = new Error('La foto está vacía');
    err.status = 400;
    throw err;
  }
  if (buffer.length > env.MAX_UPLOAD_BYTES) {
    const err = new Error('La foto supera el tamaño máximo permitido (5 MB)');
    err.status = 413;
    throw err;
  }
  ensureDir();
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ALLOWED[mime]}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

function publicUrl(rel) {
  return rel || null;
}

module.exports = { saveDataUrl, publicUrl, UPLOAD_DIR, ensureDir };
