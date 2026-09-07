/**
 * Cliente HTTP de la API. Adjunta JWT y normaliza errores.
 */
(function () {
  function authHeader() {
    const token = localStorage.getItem('addcom_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function request(path, options = {}) {
    const url = `${window.APP_CONFIG.API_URL}${path}`;
    const headers = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...authHeader(),
      ...(options.headers || {}),
    };
    let res;
    try {
      res = await fetch(url, { ...options, headers });
    } catch {
      throw new Error('No se pudo conectar con el servidor. ¿Está el backend en marcha?');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error?.message || 'Error en la petición');
      err.status = res.status;
      err.fields = data.error?.fields;
      throw err;
    }
    return data;
  }

  window.api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    del: (path) => request(path, { method: 'DELETE' }),
  };
})();
