const Suggestion = require('../models/Suggestion');
const { sendJson, sendError, readJson } = require('../utils/http');
const { isEmail, sanitizePlain, collectErrors, trim } = require('../utils/validation');

async function create(req, res) {
  const body = await readJson(req);
  const nombre = sanitizePlain(body.nombre || '', 150);
  const email = trim(body.email || '').toLowerCase();
  const mensaje = sanitizePlain(body.mensaje, 2000);

  const errors = collectErrors([
    ['mensaje', mensaje.length >= 10, 'La sugerencia debe tener al menos 10 caracteres'],
    ['email', !email || isEmail(email), 'Correo inválido'],
  ]);
  if (errors.length) {
    sendJson(res, 422, { error: { message: 'Revisa el formulario', fields: errors } });
    return;
  }

  const sugerencia = await Suggestion.create({
    nombre: nombre || null,
    email: email || null,
    mensaje,
  });
  sendJson(res, 201, { sugerencia, message: 'Gracias por tu sugerencia' });
}

module.exports = { create };
