/**
 * Carga y valida las variables de entorno.
 * Falla al arrancar si falta un valor crítico en producción.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Variable de entorno requerida: ${name}`);
  }
  return value;
}

const NODE_ENV = process.env.NODE_ENV || 'development';

const env = {
  NODE_ENV,
  isProd: NODE_ENV === 'production',
  PORT: Number(process.env.PORT || 3000),
  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || 'addcom',
    user: process.env.DB_USER || 'addcom',
    password: process.env.DB_PASSWORD || 'addcom_dev_password',
  },
  JWT_SECRET: required('JWT_SECRET', NODE_ENV === 'production' ? undefined : 'dev_only_change_me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  MAX_UPLOAD_BYTES: Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024),
};

module.exports = { env };
