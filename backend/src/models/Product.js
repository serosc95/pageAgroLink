const { query } = require('../config/database');
const { mapProducto } = require('./User');

async function listByVendedor(vendedorId) {
  const { rows } = await query(
    `SELECT id, vendedor_id, nombre, precio, especificaciones, foto, created_at
     FROM productos
     WHERE vendedor_id = $1
     ORDER BY created_at DESC`,
    [vendedorId]
  );
  return rows.map(mapProducto);
}

async function findById(id) {
  const { rows } = await query(
    `SELECT id, vendedor_id, nombre, precio, especificaciones, foto, created_at
     FROM productos WHERE id = $1`,
    [id]
  );
  return mapProducto(rows[0]);
}

async function create(data) {
  const { rows } = await query(
    `INSERT INTO productos (vendedor_id, nombre, precio, especificaciones, foto)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, vendedor_id, nombre, precio, especificaciones, foto, created_at`,
    [data.vendedorId, data.nombre, data.precio, data.especificaciones, data.foto]
  );
  return mapProducto(rows[0]);
}

async function update(id, vendedorId, data) {
  const { rows } = await query(
    `UPDATE productos
     SET nombre = COALESCE($3, nombre),
         precio = COALESCE($4, precio),
         especificaciones = COALESCE($5, especificaciones),
         foto = COALESCE($6, foto)
     WHERE id = $1 AND vendedor_id = $2
     RETURNING id, vendedor_id, nombre, precio, especificaciones, foto, created_at`,
    [id, vendedorId, data.nombre, data.precio, data.especificaciones, data.foto]
  );
  return mapProducto(rows[0]);
}

async function remove(id, vendedorId) {
  const { rowCount } = await query(
    `DELETE FROM productos WHERE id = $1 AND vendedor_id = $2`,
    [id, vendedorId]
  );
  return rowCount > 0;
}

module.exports = { listByVendedor, findById, create, update, remove };
