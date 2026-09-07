const { query } = require('../config/database');

async function create({ nombre, email, mensaje }) {
  const { rows } = await query(
    `INSERT INTO sugerencias (nombre, email, mensaje)
     VALUES ($1,$2,$3)
     RETURNING id, nombre, email, mensaje, created_at`,
    [nombre, email, mensaje]
  );
  const r = rows[0];
  return {
    id: r.id,
    nombre: r.nombre,
    email: r.email,
    mensaje: r.mensaje,
    createdAt: r.created_at,
  };
}

module.exports = { create };
