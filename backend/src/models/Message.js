const { query } = require('../config/database');

function mapMessage(row) {
  return {
    id: row.id,
    vendedorId: row.vendedor_id,
    compradorId: row.comprador_id,
    remitenteId: row.remitente_id,
    contenido: row.contenido,
    leido: row.leido,
    createdAt: row.created_at,
    remitenteNombre: row.remitente_nombre || null,
  };
}

async function listConversation(vendedorId, compradorId, limit = 100) {
  const { rows } = await query(
    `SELECT m.id, m.vendedor_id, m.comprador_id, m.remitente_id,
            m.contenido, m.leido, m.created_at, u.nombres AS remitente_nombre
     FROM mensajes m
     JOIN usuarios u ON u.id = m.remitente_id
     WHERE m.vendedor_id = $1 AND m.comprador_id = $2
     ORDER BY m.created_at ASC
     LIMIT $3`,
    [vendedorId, compradorId, limit]
  );
  return rows.map(mapMessage);
}

async function create({ vendedorId, compradorId, remitenteId, contenido }) {
  const { rows } = await query(
    `INSERT INTO mensajes (vendedor_id, comprador_id, remitente_id, contenido)
     VALUES ($1,$2,$3,$4)
     RETURNING id, vendedor_id, comprador_id, remitente_id, contenido, leido, created_at`,
    [vendedorId, compradorId, remitenteId, contenido]
  );
  return mapMessage(rows[0]);
}

/** Conversaciones del usuario autenticado (último mensaje de cada par). */
async function listInbox(userId) {
  const { rows } = await query(
    `SELECT DISTINCT ON (m.vendedor_id, m.comprador_id)
            m.id, m.vendedor_id, m.comprador_id, m.remitente_id,
            m.contenido, m.leido, m.created_at,
            v.nombres AS vendedor_nombre,
            c.nombres AS comprador_nombre
     FROM mensajes m
     JOIN usuarios v ON v.id = m.vendedor_id
     JOIN usuarios c ON c.id = m.comprador_id
     WHERE m.vendedor_id = $1 OR m.comprador_id = $1
     ORDER BY m.vendedor_id, m.comprador_id, m.created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({
    ...mapMessage(r),
    vendedorNombre: r.vendedor_nombre,
    compradorNombre: r.comprador_nombre,
  }));
}

module.exports = { listConversation, create, listInbox, mapMessage };
