/**
 * WebSocket de chat en tiempo real.
 * Autenticación: ws://host/ws?token=JWT
 * Mensajes del cliente:
 *   { type: "unirse", vendedorId, compradorId }
 *   { type: "mensaje", destinatarioId, contenido }
 */
const { WebSocketServer } = require('ws');
const { verifyToken } = require('./utils/jwt');
const User = require('./models/User');
const Message = require('./models/Message');
const { sanitizePlain } = require('./utils/validation');
const chatHub = require('./services/chatHub');

function attachWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, url);
    });
  });

  wss.on('connection', async (ws, _req, url) => {
    const token = url.searchParams.get('token') || '';
    let user;
    try {
      const payload = verifyToken(token);
      user = await User.findById(payload.sub);
    } catch {
      user = null;
    }
    if (!user) {
      ws.close(4401, 'No autenticado');
      return;
    }

    ws.user = user;
    ws.send(JSON.stringify({ type: 'listo', usuario: { id: user.id, nombres: user.nombres, rol: user.rol } }));

    ws.on('message', async (raw) => {
      let data;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'JSON inválido' }));
        return;
      }
      try {
        await handleClientMessage(ws, data);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message || 'Error interno' }));
      }
    });

    ws.on('close', () => chatHub.leave(ws));
  });

  return wss;
}

async function handleClientMessage(ws, data) {
  const user = ws.user;
  if (data.type === 'unirse') {
    const otherId = Number(data.destinatarioId || data.vendedorId || data.compradorId);
    if (!Number.isInteger(otherId)) throw new Error('Destinatario inválido');
    const pair = resolvePair(user, otherId);
    chatHub.join(ws, user.id, pair.vendedorId, pair.compradorId);
    const historial = await Message.listConversation(pair.vendedorId, pair.compradorId);
    ws.send(JSON.stringify({ type: 'historial', mensajes: historial, ...pair }));
    return;
  }

  if (data.type === 'mensaje') {
    const destinatarioId = Number(data.destinatarioId);
    const contenido = sanitizePlain(data.contenido, 2000);
    if (!Number.isInteger(destinatarioId) || !contenido) {
      throw new Error('Destinatario y contenido son obligatorios');
    }
    const other = await User.findById(destinatarioId);
    if (!other) throw new Error('Destinatario no encontrado');
    const pair = resolvePair(user, destinatarioId);
    chatHub.join(ws, user.id, pair.vendedorId, pair.compradorId);
    const mensaje = await Message.create({
      ...pair,
      remitenteId: user.id,
      contenido,
    });
    mensaje.remitenteNombre = user.nombres;
    chatHub.broadcastChat(pair.vendedorId, pair.compradorId, mensaje);
    return;
  }

  ws.send(JSON.stringify({ type: 'error', message: 'Tipo de mensaje no soportado' }));
}

function resolvePair(user, otherId) {
  if (user.rol === 'vendedor') {
    return { vendedorId: user.id, compradorId: otherId };
  }
  if (user.rol === 'comprador') {
    return { vendedorId: otherId, compradorId: user.id };
  }
  throw new Error('Rol no válido para el chat');
}

module.exports = { attachWebSocket };
