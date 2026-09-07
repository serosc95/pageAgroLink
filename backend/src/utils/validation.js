/**
 * Validaciones de entrada reutilizables (servidor).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
const ID_RE = /^[0-9A-Za-z.\-]{5,20}$/;

function trim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isEmail(value) {
  return EMAIL_RE.test(trim(value)) && trim(value).length <= 150;
}

function isPhone(value) {
  return !value || PHONE_RE.test(trim(value));
}

function isIdentificacion(value) {
  return ID_RE.test(trim(value));
}

function isStrongPassword(value) {
  const v = String(value || '');
  return v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);
}

function clampText(value, max) {
  return trim(value).slice(0, max);
}

function toMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function collectErrors(checks) {
  const errors = [];
  for (const [field, ok, message] of checks) {
    if (!ok) errors.push({ field, message });
  }
  return errors;
}

function sanitizePlain(value, max = 2000) {
  return clampText(String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''), max);
}

module.exports = {
  trim,
  isEmail,
  isPhone,
  isIdentificacion,
  isStrongPassword,
  clampText,
  toMoney,
  collectErrors,
  sanitizePlain,
};
