/**
 * Hub en memoria: conecta sockets autenticados con conversaciones.
 * Un usuario puede tener varias pestañas (varios sockets).
 */
const rooms = new Map();
const userSockets = new Map();

function roomKey(vendedorId, compradorId) {
  return `${vendedorId}:${compradorId}`;
}

function add(setMap, key, ws) {
  if (!setMap.has(key)) setMap.set(key, new Set());
  setMap.get(key).add(ws);
}

function drop(setMap, key, ws) {
  const set = setMap.get(key);
  if (!set) return;
  set.delete(ws);
  if (!set.size) setMap.delete(key);
}

function join(ws, userId, vendedorId, compradorId) {
  ws.userId = userId;
  ws.room = roomKey(vendedorId, compradorId);
  add(rooms, ws.room, ws);
  add(userSockets, userId, ws);
}

function leave(ws) {
  if (ws.room) drop(rooms, ws.room, ws);
  if (ws.userId) drop(userSockets, ws.userId, ws);
}

function broadcastChat(vendedorId, compradorId, mensaje) {
  const key = roomKey(vendedorId, compradorId);
  const payload = JSON.stringify({ type: 'mensaje', mensaje });
  const targets = rooms.get(key);
  if (targets) {
    for (const ws of targets) {
      if (ws.readyState === 1) ws.send(payload);
    }
  }
}

function sendToUser(userId, data) {
  const set = userSockets.get(userId);
  if (!set) return;
  const payload = JSON.stringify(data);
  for (const ws of set) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

module.exports = { join, leave, broadcastChat, sendToUser, roomKey };
