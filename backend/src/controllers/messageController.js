const User = require('../models/User');
const Message = require('../models/Message');
const { sendJson, sendError, readJson } = require('../utils/http');
const { sanitizePlain } = require('../utils/validation');
const { broadcastChat } = require('../services/chatHub');

function pairFor(user, otherId) {
  if (user.rol === 'vendedor') {
    return { vendedorId: user.id, compradorId: otherId };
  }
  return { vendedorId: otherId, compradorId: user.id };
}

async function inbox(req, res) {
  const conversaciones = await Message.listInbox(req.user.id);
  sendJson(res, 200, { conversaciones });
}

async function historial(req, res) {
  const otherId = Number(req.params.usuarioId);
  if (!Number.isInteger(otherId)) {
    sendError(res, 400, 'Identificador inválido');
    return;
  }
  const other = await User.findById(otherId);
  if (!other) {
    sendError(res, 404, 'Usuario no encontrado');
    return;
  }
  const { vendedorId, compradorId } = pairFor(req.user, otherId);
  const mensajes = await Message.listConversation(vendedorId, compradorId);
  sendJson(res, 200, { mensajes, vendedorId, compradorId });
}

async function enviar(req, res) {
  const body = await readJson(req);
  const destinatarioId = Number(body.destinatarioId);
  const contenido = sanitizePlain(body.contenido, 2000);
  if (!Number.isInteger(destinatarioId) || !contenido) {
    sendError(res, 400, 'Destinatario y mensaje son obligatorios');
    return;
  }
  const other = await User.findById(destinatarioId);
  if (!other) {
    sendError(res, 404, 'Destinatario no encontrado');
    return;
  }

  let vendedorId;
  let compradorId;
  if (req.user.rol === 'vendedor' && other.rol === 'comprador') {
    vendedorId = req.user.id;
    compradorId = other.id;
  } else if (req.user.rol === 'comprador' && other.rol === 'vendedor') {
    vendedorId = other.id;
    compradorId = req.user.id;
  } else {
    sendError(res, 400, 'El chat solo está disponible entre un comprador y un vendedor');
    return;
  }

  const mensaje = await Message.create({
    vendedorId,
    compradorId,
    remitenteId: req.user.id,
    contenido,
  });
  mensaje.remitenteNombre = req.user.nombres;
  broadcastChat(vendedorId, compradorId, mensaje);
  sendJson(res, 201, { mensaje });
}

module.exports = { inbox, historial, enviar };
