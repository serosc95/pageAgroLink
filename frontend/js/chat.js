/**
 * Chat en tiempo real (WebSocket) con respaldo REST.
 * No abandona la ficha del vendedor: el panel vive en la misma página.
 */
(function () {
  let socket = null;
  let destId = null;
  let onMessage = null;

  function connect(destinatarioId, handlers) {
    destId = destinatarioId;
    onMessage = handlers || {};
    const token = window.auth.token();
    if (!token) {
      if (onMessage.onNeedAuth) onMessage.onNeedAuth();
      return;
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'unirse', destinatarioId }));
      return;
    }
    socket = new WebSocket(`${window.APP_CONFIG.WS_URL}?token=${encodeURIComponent(token)}`);
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'unirse', destinatarioId }));
    });
    socket.addEventListener('message', (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (data.type === 'historial' && onMessage.onHistory) onMessage.onHistory(data.mensajes);
      if (data.type === 'mensaje' && onMessage.onMessage) onMessage.onMessage(data.mensaje);
      if (data.type === 'error' && onMessage.onError) onMessage.onError(data.message);
    });
    socket.addEventListener('close', () => {
      if (onMessage.onClose) onMessage.onClose();
    });
  }

  function send(contenido) {
    const text = String(contenido || '').trim();
    if (!text || !destId) return Promise.resolve();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'mensaje', destinatarioId: destId, contenido: text }));
      return Promise.resolve();
    }
    return window.api.post('/api/mensajes', { destinatarioId: destId, contenido: text });
  }

  function disconnect() {
    if (socket) {
      socket.close();
      socket = null;
    }
  }

  window.chat = { connect, send, disconnect };
})();
