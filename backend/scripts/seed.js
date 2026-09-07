/**
 * Datos de demostración: 3 vendedores con productos y 1 comprador.
 * Contraseña de todas las cuentas demo: Demo1234
 */
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'addcom',
  user: process.env.DB_USER || 'addcom',
  password: process.env.DB_PASSWORD || 'addcom_dev_password',
});

const VENDEDORES = [
  {
    identificacion: '1098765432',
    nombres: 'María Elena González',
    telefono: '+57 310 555 1201',
    email: 'maria.gonzalez@addcom.demo',
    ubicacion: 'Pitalito, Huila',
    whatsapp: '573105551201',
    productos: [
      {
        nombre: 'Café de altura huilense',
        precio: 28000,
        especificaciones: 'Café arábica lavado, tostado medio. Altura 1.700 m.s.n.m. Empaque de 500 g. Notas a panela y cacao.',
      },
      {
        nombre: 'Plátano hartón',
        precio: 1800,
        especificaciones: 'Racimo fresco cosechado el mismo día. Precio por kilo. Mínimo de pedido: 10 kg.',
      },
    ],
  },
  {
    identificacion: '712345678',
    nombres: 'Carlos Ramírez Restrepo',
    telefono: '+57 312 444 8800',
    email: 'carlos.ramirez@addcom.demo',
    ubicacion: 'El Peñol, Antioquia',
    whatsapp: '573124448800',
    productos: [
      {
        nombre: 'Aguacate Hass',
        precio: 4500,
        especificaciones: 'Calibre 14-16. Pulpa cremosa, sin fibras. Precio por kilo. Disponible todo el año.',
      },
      {
        nombre: 'Tomate chonto',
        precio: 2200,
        especificaciones: 'Cultivo de clima templado, cosecha semanal. Precio por kilo. Entrega en canastilla de 20 kg.',
      },
    ],
  },
  {
    identificacion: '524198763',
    nombres: 'Ana Lucía Pérez',
    telefono: '+57 320 777 3344',
    email: 'ana.perez@addcom.demo',
    ubicacion: 'Tunja, Boyacá',
    whatsapp: '573207773344',
    productos: [
      {
        nombre: 'Papa criolla',
        precio: 3200,
        especificaciones: 'Papa criolla lavada, calibre mediano. Precio por kilo. Ideal para sopas y frituras.',
      },
      {
        nombre: 'Maíz blanco',
        precio: 2100,
        especificaciones: 'Maíz seco para arepas y mute. Saco de 50 kg o venta al detal por kilo.',
      },
    ],
  },
];

async function seed() {
  const passwordHash = await bcrypt.hash('Demo1234', 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      "SELECT id FROM usuarios WHERE email = 'comprador@addcom.demo'"
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      console.log('Los datos demo ya existen. No se insertó nada.');
      return;
    }

    for (const v of VENDEDORES) {
      const u = await client.query(
        `INSERT INTO usuarios
          (identificacion, nombres, telefono, email, password_hash, ubicacion, whatsapp, rol)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'vendedor')
         RETURNING id`,
        [v.identificacion, v.nombres, v.telefono, v.email, passwordHash, v.ubicacion, v.whatsapp]
      );
      const vendedorId = u.rows[0].id;
      for (const p of v.productos) {
        await client.query(
          `INSERT INTO productos (vendedor_id, nombre, precio, especificaciones)
           VALUES ($1,$2,$3,$4)`,
          [vendedorId, p.nombre, p.precio, p.especificaciones]
        );
      }
      console.log(`Vendedor: ${v.nombres}`);
    }

    await client.query(
      `INSERT INTO usuarios (nombres, telefono, email, password_hash, ubicacion, rol)
       VALUES ($1,$2,$3,$4,$5,'comprador')`,
      ['Nicol Herrera', '+57 300 111 2233', 'comprador@addcom.demo', passwordHash, 'Bogotá D.C.']
    );
    console.log('Comprador: Nicol Herrera');

    await client.query('COMMIT');
    console.log('\nCuentas demo (contraseña: Demo1234)');
    console.log('  maria.gonzalez@addcom.demo  (vendedor)');
    console.log('  carlos.ramirez@addcom.demo  (vendedor)');
    console.log('  ana.perez@addcom.demo       (vendedor)');
    console.log('  comprador@addcom.demo       (comprador)');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Error en seed:', err.message);
  process.exit(1);
});
