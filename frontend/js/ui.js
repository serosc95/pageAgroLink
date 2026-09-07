/**
 * Header compartido, menú de tres puntos, toasts y utilidades de UI.
 */
(function () {
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function money(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n);
  }

  function toast(message, type = 'ok') {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-host';
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 280);
    }, 3600);
  }

  function showFieldErrors(form, fields) {
    form.querySelectorAll('.field-error').forEach((n) => n.remove());
    form.querySelectorAll('.invalid').forEach((n) => n.classList.remove('invalid'));
    (fields || []).forEach(({ field, message }) => {
      const input = form.querySelector(`[name="${field}"]`);
      if (!input) return;
      input.classList.add('invalid');
      const hint = document.createElement('p');
      hint.className = 'field-error';
      hint.textContent = message;
      input.closest('label')?.appendChild(hint) || input.insertAdjacentElement('afterend', hint);
    });
  }

  function fileToDataUrl(file) {
    const max = (window.APP_CONFIG.MAX_UPLOAD_MB || 5) * 1024 * 1024;
    const ok = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ok.includes(file.type)) {
      return Promise.reject(new Error('Usa una imagen JPEG, PNG o WebP'));
    }
    if (file.size > max) {
      return Promise.reject(new Error(`La imagen no puede superar ${window.APP_CONFIG.MAX_UPLOAD_MB} MB`));
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
      reader.readAsDataURL(file);
    });
  }

  function renderHeader(active) {
    const user = window.auth.currentUser();
    const root = document.getElementById('site-header');
    if (!root) return;

    const account = user
      ? `<div class="account">
           <a class="account-name" href="${user.rol === 'vendedor' ? '/panel.html' : '/inbox.html'}">${escapeHtml(user.nombres.split(' ')[0])}</a>
           <button type="button" class="linkish" id="logout-btn">Salir</button>
         </div>`
      : `<a class="btn btn-ghost btn-sm" href="/login.html">Iniciar sesión</a>`;

    root.innerHTML = `
      <header class="topbar">
        <a class="brand" href="/">
          <img src="/assets/logo.png" alt="ADD-COM" width="52" height="52">
          <span>
            <strong>ADD-COM</strong>
            <small>Del campo a tu mesa</small>
          </span>
        </a>
        <nav class="top-actions">
          ${account}
          <div class="menu-wrap">
            <button type="button" class="dots-btn" id="menu-toggle" aria-haspopup="true" aria-expanded="false" aria-label="Más información">
              <span></span><span></span><span></span>
            </button>
            <div class="dropdown" id="site-menu" hidden>
              <a href="/quienes-somos.html" data-nav="nosotros">Quiénes somos</a>
              <a href="/contacto.html" data-nav="contacto">Cómo contactarnos</a>
              <a href="/sugerencias.html" data-nav="sugerencias">Sugerencias</a>
            </div>
          </div>
        </nav>
      </header>
    `;

    if (active) {
      const link = root.querySelector(`[data-nav="${active}"]`);
      if (link) link.classList.add('is-active');
    }

    const toggle = root.querySelector('#menu-toggle');
    const menu = root.querySelector('#site-menu');
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.hasAttribute('hidden');
      if (open) menu.removeAttribute('hidden');
      else menu.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', () => {
      menu.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', 'false');
    });
    menu.addEventListener('click', (e) => e.stopPropagation());

    const logout = root.querySelector('#logout-btn');
    if (logout) {
      logout.addEventListener('click', () => {
        window.auth.clearSession();
        window.location.href = '/';
      });
    }
  }

  window.ui = { escapeHtml, money, toast, showFieldErrors, fileToDataUrl, renderHeader };
})();
