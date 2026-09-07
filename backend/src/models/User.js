const { query, withTransaction } = require('../config/database');

const PUBLIC_FIELDS = `
  id, identificacion, nombres, telefono, email, ubicacion,
  whatsapp, rol, foto_perfil, created_at
`;

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    identificacion: row.identificacion,
    nombres: row.nombres,
    telefono: row.telefono,
    email: row.email,
    ubicacion: row.ubicacion,
    whatsapp: row.whatsapp,
    rol: row.rol,
    fotoPerfil: row.foto_perfil,
    createdAt: row.created_at,
  };
}

async function findByEmail(email) {
  const { rows } = await query(
    `SELECT ${PUBLIC_FIELDS}, password_hash FROM usuarios WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${PUBLIC_FIELDS} FROM usuarios WHERE id = $1`,
    [id]
  );
  return mapUser(rows[0]);
}

async function findByIdentificacion(identificacion) {
  const { rows } = await query(
    `SELECT id FROM usuarios WHERE identificacion = $1`,
    [identificacion]
  );
  return rows[0] || null;
}

async function listVendedores() {
  const { rows } = await query(
    `SELECT u.id, u.nombres, u.ubicacion, u.foto_perfil,
            COUNT(p.id)::int AS productos_count
     FROM usuarios u
     LEFT JOIN productos p ON p.vendedor_id = u.id
     WHERE u.rol = 'vendedor'
     GROUP BY u.id
     ORDER BY u.nombres ASC`
  );
  return rows.map((r) => ({
    id: r.id,
    nombres: r.nombres,
    ubicacion: r.ubicacion,
    fotoPerfil: r.foto_perfil,
    productosCount: r.productos_count,
  }));
}

async function createVendedorConProducto(user, producto) {
  return withTransaction(async (client) => {
    const u = await client.query(
      `INSERT INTO usuarios
        (identificacion, nombres, telefono, email, password_hash, ubicacion, whatsapp, rol, foto_perfil)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'vendedor',$8)
       RETURNING ${PUBLIC_FIELDS}`,
      [
        user.identificacion,
        user.nombres,
        user.telefono,
        user.email,
        user.passwordHash,
        user.ubicacion,
        user.whatsapp || null,
        user.fotoPerfil || null,
      ]
    );
    const vendedor = mapUser(u.rows[0]);
    const p = await client.query(
      `INSERT INTO productos (vendedor_id, nombre, precio, especificaciones, foto)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, vendedor_id, nombre, precio, especificaciones, foto, created_at`,
      [vendedor.id, producto.nombre, producto.precio, producto.especificaciones, producto.foto]
    );
    return { vendedor, producto: mapProducto(p.rows[0]) };
  });
}

async function updateProfile(id, data) {
  const { rows } = await query(
    `UPDATE usuarios
     SET nombres = COALESCE($2, nombres),
         telefono = COALESCE($3, telefono),
         ubicacion = COALESCE($4, ubicacion),
         whatsapp = COALESCE($5, whatsapp)
     WHERE id = $1
     RETURNING ${PUBLIC_FIELDS}`,
    [id, data.nombres, data.telefono, data.ubicacion, data.whatsapp]
  );
  return mapUser(rows[0]);
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM usuarios WHERE id = $1', [id]);
  return rowCount > 0;
}

async function createComprador(user) {
  const { rows } = await query(
    `INSERT INTO usuarios (nombres, telefono, email, password_hash, ubicacion, rol)
     VALUES ($1,$2,$3,$4,$5,'comprador')
     RETURNING ${PUBLIC_FIELDS}`,
    [user.nombres, user.telefono || null, user.email, user.passwordHash, user.ubicacion || null]
  );
  return mapUser(rows[0]);
}

function mapProducto(row) {
  if (!row) return null;
  return {
    id: row.id,
    vendedorId: row.vendedor_id,
    nombre: row.nombre,
    precio: Number(row.precio),
    especificaciones: row.especificaciones,
    foto: row.foto,
    createdAt: row.created_at,
  };
}

module.exports = {
  mapUser,
  mapProducto,
  findByEmail,
  findById,
  findByIdentificacion,
  listVendedores,
  createVendedorConProducto,
  createComprador,
  updateProfile,
  remove,
};
