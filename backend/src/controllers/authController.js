const User = require('../models/User');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { sendJson, sendError, readJson } = require('../utils/http');
const { saveDataUrl } = require('../utils/upload');
const {
  trim, isEmail, isPhone, isIdentificacion, isStrongPassword,
  toMoney, collectErrors, sanitizePlain,
} = require('../utils/validation');

function tokenPayload(user) {
  return signToken({ sub: user.id, rol: user.rol });
}

async function registroVendedor(req, res) {
  const body = await readJson(req);
  const identificacion = sanitizePlain(body.identificacion, 20);
  const nombres = sanitizePlain(body.nombres, 150);
  const telefono = sanitizePlain(body.telefono, 20);
  const email = trim(body.email).toLowerCase();
  const password = String(body.password || '');
  const ubicacion = sanitizePlain(body.ubicacion, 255);
  const whatsapp = sanitizePlain(body.whatsapp || body.telefono, 20);
  const productoNombre = sanitizePlain(body.productoNombre || body.nombreProducto, 150);
  const precio = toMoney(body.precio);
  const especificaciones = sanitizePlain(body.especificaciones, 2000);

  const errors = collectErrors([
    ['identificacion', isIdentificacion(identificacion), 'Identificación inválida (5-20 caracteres)'],
    ['nombres', nombres.length >= 3, 'Ingresa tus nombres completos'],
    ['telefono', isPhone(telefono) && telefono.length >= 7, 'Teléfono inválido'],
    ['email', isEmail(email), 'Correo electrónico inválido'],
    ['password', isStrongPassword(password), 'La contraseña debe tener al menos 8 caracteres, letras y números'],
    ['ubicacion', ubicacion.length >= 3, 'Indica tu ubicación'],
    ['productoNombre', productoNombre.length >= 2, 'Indica el nombre del producto'],
    ['precio', precio !== null, 'El precio debe ser un número mayor o igual a 0'],
    ['especificaciones', especificaciones.length >= 5, 'Describe las especificaciones del producto'],
    ['foto', Boolean(body.foto), 'Adjunta una foto del producto'],
  ]);
  if (errors.length) {
    sendJson(res, 422, { error: { message: 'Revisa los campos del formulario', fields: errors } });
    return;
  }

  if (await User.findByEmail(email)) {
    sendError(res, 409, 'Ya existe una cuenta con ese correo');
    return;
  }
  if (await User.findByIdentificacion(identificacion)) {
    sendError(res, 409, 'Ya existe un vendedor con esa identificación');
    return;
  }

  let foto;
  try {
    foto = saveDataUrl(body.foto);
  } catch (err) {
    sendError(res, err.status || 400, err.message);
    return;
  }

  const passwordHash = await hashPassword(password);
  const { vendedor, producto } = await User.createVendedorConProducto(
    { identificacion, nombres, telefono, email, passwordHash, ubicacion, whatsapp, fotoPerfil: foto },
    { nombre: productoNombre, precio, especificaciones, foto }
  );

  sendJson(res, 201, {
    token: tokenPayload(vendedor),
    usuario: vendedor,
    producto,
  });
}

async function registroComprador(req, res) {
  const body = await readJson(req);
  const nombres = sanitizePlain(body.nombres, 150);
  const email = trim(body.email).toLowerCase();
  const password = String(body.password || '');
  const telefono = sanitizePlain(body.telefono || '', 20);
  const ubicacion = sanitizePlain(body.ubicacion || '', 255);

  const errors = collectErrors([
    ['nombres', nombres.length >= 3, 'Ingresa tu nombre'],
    ['email', isEmail(email), 'Correo electrónico inválido'],
    ['password', isStrongPassword(password), 'La contraseña debe tener al menos 8 caracteres, letras y números'],
    ['telefono', isPhone(telefono), 'Teléfono inválido'],
  ]);
  if (errors.length) {
    sendJson(res, 422, { error: { message: 'Revisa los campos del formulario', fields: errors } });
    return;
  }
  if (await User.findByEmail(email)) {
    sendError(res, 409, 'Ya existe una cuenta con ese correo');
    return;
  }

  const usuario = await User.createComprador({
    nombres,
    email,
    passwordHash: await hashPassword(password),
    telefono,
    ubicacion,
  });
  sendJson(res, 201, { token: tokenPayload(usuario), usuario });
}

async function login(req, res) {
  const body = await readJson(req);
  const email = trim(body.email).toLowerCase();
  const password = String(body.password || '');
  if (!isEmail(email) || !password) {
    sendError(res, 400, 'Correo y contraseña son obligatorios');
    return;
  }
  const row = await User.findByEmail(email);
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    sendError(res, 401, 'Credenciales incorrectas');
    return;
  }
  const usuario = User.mapUser(row);
  sendJson(res, 200, { token: tokenPayload(usuario), usuario });
}

async function me(req, res) {
  sendJson(res, 200, { usuario: req.user });
}

module.exports = { registroVendedor, registroComprador, login, me };
