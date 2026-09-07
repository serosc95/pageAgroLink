const Product = require('../models/Product');
const { sendJson, sendError, readJson } = require('../utils/http');
const { saveDataUrl } = require('../utils/upload');
const { sanitizePlain, toMoney, collectErrors } = require('../utils/validation');

async function listMine(req, res) {
  const productos = await Product.listByVendedor(req.user.id);
  sendJson(res, 200, { productos });
}

async function create(req, res) {
  const body = await readJson(req);
  const nombre = sanitizePlain(body.nombre, 150);
  const precio = toMoney(body.precio);
  const especificaciones = sanitizePlain(body.especificaciones, 2000);
  const errors = collectErrors([
    ['nombre', nombre.length >= 2, 'Nombre del producto requerido'],
    ['precio', precio !== null, 'Precio inválido'],
    ['especificaciones', especificaciones.length >= 5, 'Especificaciones requeridas'],
  ]);
  if (errors.length) {
    sendJson(res, 422, { error: { message: 'Revisa los campos', fields: errors } });
    return;
  }
  let foto = null;
  if (body.foto) {
    try {
      foto = saveDataUrl(body.foto);
    } catch (err) {
      sendError(res, err.status || 400, err.message);
      return;
    }
  }
  const producto = await Product.create({
    vendedorId: req.user.id,
    nombre,
    precio,
    especificaciones,
    foto,
  });
  sendJson(res, 201, { producto });
}

async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    sendError(res, 400, 'Identificador inválido');
    return;
  }
  const body = await readJson(req);
  const data = {
    nombre: body.nombre != null ? sanitizePlain(body.nombre, 150) : undefined,
    precio: body.precio != null ? toMoney(body.precio) : undefined,
    especificaciones: body.especificaciones != null ? sanitizePlain(body.especificaciones, 2000) : undefined,
    foto: undefined,
  };
  if (data.precio === null) {
    sendError(res, 422, 'Precio inválido');
    return;
  }
  if (body.foto) {
    try {
      data.foto = saveDataUrl(body.foto);
    } catch (err) {
      sendError(res, err.status || 400, err.message);
      return;
    }
  }
  const producto = await Product.update(id, req.user.id, data);
  if (!producto) {
    sendError(res, 404, 'Producto no encontrado');
    return;
  }
  sendJson(res, 200, { producto });
}

async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    sendError(res, 400, 'Identificador inválido');
    return;
  }
  const ok = await Product.remove(id, req.user.id);
  if (!ok) {
    sendError(res, 404, 'Producto no encontrado');
    return;
  }
  sendJson(res, 200, { ok: true });
}

module.exports = { listMine, create, update, remove };
