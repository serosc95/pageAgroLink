/**
 * Enrutador mínimo
 * Soporta rutas con parámetros: /api/vendedores/:id
 */
class Router {
  constructor() {
    this.routes = [];
  }

  get(path, ...handlers) {
    this.#add('GET', path, handlers);
  }

  post(path, ...handlers) {
    this.#add('POST', path, handlers);
  }

  put(path, ...handlers) {
    this.#add('PUT', path, handlers);
  }

  patch(path, ...handlers) {
    this.#add('PATCH', path, handlers);
  }

  delete(path, ...handlers) {
    this.#add('DELETE', path, handlers);
  }

  #add(method, path, handlers) {
    const keys = [];
    const pattern = path.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.routes.push({
      method,
      path,
      keys,
      regex: new RegExp(`^${pattern}$`),
      handlers,
    });
  }

  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const found = pathname.match(route.regex);
      if (!found) continue;
      const params = {};
      route.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(found[i + 1]);
      });
      return { route, params };
    }
    return null;
  }
}

module.exports = { Router };
