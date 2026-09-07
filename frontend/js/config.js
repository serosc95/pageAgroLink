/**
 * Configuración del cliente. Si el frontend se sirve desde el mismo Node
 * (puerto 3000), las URLs relativas funcionan solas.
 */
(function () {
  const sameOrigin = ['3000', ''].includes(window.location.port);
  const host = sameOrigin ? '' : 'http://localhost:3000';
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = sameOrigin
    ? `${wsProtocol}//${window.location.host}`
    : 'ws://localhost:3000';

  window.APP_CONFIG = {
    API_URL: host,
    WS_URL: `${wsHost}/ws`,
    MAX_UPLOAD_MB: 5,
  };
})();
