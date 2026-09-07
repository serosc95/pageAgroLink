/**
 * Pool de conexiones PostgreSQL.
 * Todas las consultas deben usar parámetros ($1, $2, ...) para evitar inyección SQL.
 */
const { Pool } = require('pg');
const { env } = require('./env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,
});

pool.on('error', (err) => {
  console.error('[pg] Error inesperado en el pool:', err.message);
});

async function query(text, params = []) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const ms = Date.now() - start;
  if (!env.isProd && ms > 200) {
    console.warn(`[pg] Consulta lenta (${ms}ms):`, text.slice(0, 80));
  }
  return result;
}

/** Ejecuta varias consultas en una transacción. */
async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function ping() {
  const { rows } = await query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}

module.exports = { pool, query, withTransaction, ping };
