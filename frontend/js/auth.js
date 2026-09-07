/**
 * Sesión en localStorage y helpers de autorización.
 */
(function () {
  const TOKEN = 'addcom_token';
  const USER = 'addcom_user';

  function currentUser() {
    try {
      return JSON.parse(localStorage.getItem(USER) || 'null');
    } catch {
      return null;
    }
  }

  function token() {
    return localStorage.getItem(TOKEN);
  }

  function setSession(tokenValue, usuario) {
    localStorage.setItem(TOKEN, tokenValue);
    localStorage.setItem(USER, JSON.stringify(usuario));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(USER);
  }

  function requireLogin(redirect) {
    if (!token()) {
      const next = encodeURIComponent(redirect || window.location.pathname + window.location.search);
      window.location.href = `/login.html?next=${next}`;
      return false;
    }
    return true;
  }

  window.auth = { currentUser, token, setSession, clearSession, requireLogin };
})();
