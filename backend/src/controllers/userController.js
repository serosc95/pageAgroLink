const User = require('../models/User');
const Product = require('../models/Product');
const { sendJson, sendError, readJson } = require('../utils/http');
const { sanitizePlain, isPhone, collectErrors } = require('../utils/validation');

async function listVendedores(_req, res) {
  const vendedores = await User.listVendedores();
  sendJson(res, 200, { vendedores });
}

async function getVendedor(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    sendError(res, 400, 'Identificador inválido');
    return;
  }
  const vendedor = await User.findById(id);
  if (!vendedor || vendedor.rol !== 'vendedor') {
    sendError(res, 404, 'Vendedor no encontrado');
    return;
  }
  const productos = await Product.listByVendedor(id);
  sendJson(res, 200, { vendedor, productos });
}

async function updateMe(req, res) {
  const body = await readJson(req);
  const nombres = body.nombres != null ? sanitizePlain(body.nombres, 150) : undefined;
  const telefono = body.telefono != null ? sanitizePlain(body.telefono, 20) : undefined;
  const ubicacion = body.ubicacion != null ? sanitizePlain(body.ubicacion, 255) : undefined;
  const whatsapp = body.whatsapp != null ? sanitizePlain(body.whatsapp, 20) : undefined;
  const errors = collectErrors([
    ['nombres', nombres === undefined || nombres.length >= 3, 'Nombre demasiado corto'],
    ['telefono', telefono === undefined || isPhone(telefono), 'Teléfono inválido'],
    ['whatsapp', whatsapp === undefined || isPhone(whatsapp), 'WhatsApp inválido'],
  ]);
  if (errors.length) {
    sendJson(res, 422, { error: { message: 'Revisa los campos', fields: errors } });
    return;
  }
  const usuario = await User.updateProfile(req.user.id, { nombres, telefono, ubicacion, whatsapp });
  sendJson(res, 200, { usuario });
}

async function deleteMe(req, res) {
  await User.remove(req.user.id);
  sendJson(res, 200, { ok: true });
}

module.exports = { listVendedores, getVendedor, updateMe, deleteMe };
