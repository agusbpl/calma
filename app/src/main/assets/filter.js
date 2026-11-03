/*
 * CALMA: filtro local en la página de Instagram.
 * Sin API privada, sin recolección de datos, sin servidor intermedio.
 * Se ejecuta únicamente sobre páginas instagram.com de la WebView.
 * Los selectores de Instagram pueden cambiar: ocultar no garantiza imposibilidad absoluta.
 */
(() => {
  'use strict';
  if (window.__calmaInstalled) { window.__calmaRefresh?.(); return; }
  window.__calmaInstalled = true;

  const INBOX = 'https://www.instagram.com/direct/inbox/';
  const FORBIDDEN = /^\/(?:reel(?:s)?|explore|stories|tv|clips)(?:\/|$)/i;
  const SINGLE_CLIP = /^\/(?:reel\/[a-z0-9_-]+|stories\/[a-z0-9._]+\/[0-9]+)(?:\/|$)/i;
  const normalizeClipPath = path => (path || '').replace(/\/+$/, '');
  const isSharedClipAllowed = path => SINGLE_CLIP.test(path) && (
    normalizeClipPath(window.__calmaApprovedSingleClipPath) === normalizeClipPath(path) ||
    (Date.now() < (window.__calmaClipPendingUntil || 0))
  );
  const isSearch = path => /^\/explore\/search\/?$/i.test(path);
  const isBlocked = path => (FORBIDDEN.test(path) && !isSearch(path) && !isSharedClipAllowed(path) && !window.__calmaProfileStoryAllowed?.(path)) || path === '/';
  let lastPath = location.pathname;
  let lastUrl = location.href;

  const style = document.createElement('style');
  style.id = 'calma-hide-noise';
  style.textContent = `
    body:not(.calma-chat) a[href^="/reel/"], a[href^="/reels/"],
    a[href^="/explore/"]:not([href="/explore/search"]):not([href="/explore/search/"]):not([href^="/explore/search?"]):not([href^="/explore/search/?"]), body:not(.calma-chat):not(.calma-profile):not(.calma-profile-story) a[href^="/stories/"],
    a[href^="/tv/"], a[href^="/clips/"],
    body:not(.calma-chat) a[href*="instagram.com/reel/"], a[href*="instagram.com/reels/"],
    a[href*="instagram.com/explore/"]:not([href$="/explore/search"]):not([href$="/explore/search/"]):not([href*="/explore/search?"]):not([href*="/explore/search/?"]), body:not(.calma-chat):not(.calma-profile):not(.calma-profile-story) a[href*="instagram.com/stories/"]
      { display: none !important; visibility: hidden !important; }
    body { overscroll-behavior-y: contain !important; }
  `;
  (document.head || document.documentElement).appendChild(style);

  function isInstagramUrl(url) {
    try { const h = new URL(url, location.href).hostname.toLowerCase();
      return h === 'instagram.com' || h.endsWith('.instagram.com');
    } catch (_) { return false; }
  }
  function redirectIfBlocked() {
    // No tocar la pantalla de login, challenge, consentimiento ni OAuth.
    if (isInstagramUrl(location.href) && isBlocked(location.pathname)) {
      location.replace(INBOX);
      return true;
    }
    return false;
  }
  function hideAppNags() {
    const patterns = [
      /^(get|download|install|open) (the )?(instagram )?app$/i,
      /^abrir (en|con) (la aplicación|instagram|la app)$/i,
      /^(descargar|instalar) (la )?(aplicación|app|instagram)$/i,
      /^usar (la )?app de instagram$/i,
      /^get instagram( app)?$/i,
      /^use (the )?app$/i,
    ];
    const tags = document.querySelectorAll('a, button, [role="button"]');
    for (const el of tags) {
      if (el.closest('[data-calma-ignored="1"]')) continue;
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (text.length < 4 || text.length > 70) continue;
      let link = (el.getAttribute('href') || '').toLowerCase();
      const isAppLink = /^(intent:|instagram:|market:)/.test(link) ||
         /play\.google\.com\/store\/apps\/details/.test(link) ||
         /apps\.apple\.com\/.*instagram/.test(link);
      if (isAppLink || patterns.some(p => p.test(text))) {
        el.style.setProperty('display', 'none', 'important');
        // Instagram comparte contenedores con contenido aún en carga.
        // Ocultar sólo el control: el tamaño/texto del padre no prueba que sea un banner.
      }
    }
  }

  const recommendations = [
    /^suggested for you$/i, /^recommended for you$/i,
    /^suggested posts$/i, /^because you follow$/i,
    /^sugerencias para ti$/i, /^recomendaciones para ti$/i,
    /^publicaciones sugeridas$/i, /^recomendado para ti$/i,
    /^porque sigues a/i, /^porque seguís a/i,
  ];
  function hideRecommendations() {
    // Sólo eliminar bloques acotados; no ocultar una página entera por accidente.
    const nodes = document.querySelectorAll('h2, h3, h4, span, strong, div');
    for (const el of nodes) {
      if (el.children.length > 0) continue;
      const text = (el.textContent || '').trim();
      if (text.length > 65 || !recommendations.some(re => re.test(text))) continue;
      const block = el.closest('article, li, section');
      if (block && block.textContent.length < 5000) {
        block.style.setProperty('display', 'none', 'important');
      }
    }
  }
  let scheduled = false;
  function refresh() {
    if (redirectIfBlocked()) return;
    document.body?.classList.toggle('calma-profile', !!profileFromPath(location.pathname));
    hideAppNags();
    hideRecommendations();
    if (!style.isConnected) (document.head || document.documentElement).appendChild(style);
    window.__calmaProfileStoryRefresh?.();
    window.__calmaClipRefresh?.();
  }
  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; refresh(); }, 250);
  }
  document.addEventListener('click', (ev) => {
    const anchor = ev.target instanceof Element && ev.target.closest('a[href]');
    if (!anchor) return;
    try {
      const url = new URL(anchor.href, location.href);
      // Un enlace a un clip compartido dentro de Direct se arma en clip.js.
      // Fuera del chat permanece prohibido.
      const sharedInChat = /^\/direct(?:\/|$)/i.test(location.pathname) &&
        SINGLE_CLIP.test(url.pathname);
      const profileStory = isInstagramUrl(url.href) && window.__calmaProfileStoryClick?.(ev, url);
      if (isInstagramUrl(url.href) && isBlocked(url.pathname) && !sharedInChat && !profileStory) {
        ev.preventDefault(); ev.stopImmediatePropagation();
      }
      if (/^(intent:|instagram:|market:)$/.test(url.protocol)) {
        ev.preventDefault(); ev.stopImmediatePropagation();
      }
    } catch (_) { /* Enlaces malformados ignorados. */ }
  }, true);
  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, {subtree: true, childList: true});
  // SPA: la URL puede cambiar sin carga completa ni mutaciones en la página.
  setInterval(() => {
    if (location.pathname !== lastPath || location.href !== lastUrl) {
      lastPath = location.pathname; lastUrl = location.href; scheduleRefresh();
    }
  }, 1400);
  // Estado de la pantalla actual, usado sólo para mostrar al usuario que se
  // está visitando. No se envía nada fuera del teléfono.
  const RESERVED = new Set([
    'p','reel','reels','direct','create','explore','accounts','stories','tv','clips',
    'notifications','about','developer','legal','api','web','privacy','terms','challenge','graphql'
  ]);
  function profileFromPath(path) {
    const match = /^\/([a-z0-9._]{1,30})\/?$/i.exec(path || '');
    return match && !RESERVED.has(match[1].toLowerCase()) ? match[1] : '';
  }
  function postAuthor() {
    // Elegir sólo enlaces del encabezado de una publicación para evitar
    // confundir autores de comentarios o cuentas recomendadas con el autor.
    const roots = [...document.querySelectorAll(
      '[role="dialog"] article header, [role="dialog"] header, article header'
    )];
    for (const root of roots) {
      for (const link of root.querySelectorAll('a[href]')) {
        try {
          const url = new URL(link.href, location.href);
          if (!isInstagramUrl(url.href)) continue;
          const name = profileFromPath(url.pathname);
          if (name && !link.closest('[hidden], [aria-hidden="true"]')) return name;
        } catch (_) { /* Enlace externo o no válido. */ }
      }
    }
    return '';
  }
  window.__calmaContext = () => {
    const path = location.pathname;
    if (/^\/p\/[^/]+/i.test(path)) {
      return JSON.stringify({type:'post', path, profile:'', author:postAuthor()});
    }
    const profile = profileFromPath(path);
    if (profile) return JSON.stringify({type:'profile', path, profile, author:''});
    if (/^\/(?:notifications|accounts\/activity)\/?$/i.test(path)) {
      return JSON.stringify({type:'activity', path, profile:'', author:''});
    }
    if (isSearch(path)) return JSON.stringify({type:'search', path, profile:'', author:''});
    if (/^\/direct\//i.test(path)) {
      return JSON.stringify({type:'messages', path, profile:'', author:''});
    }
    return JSON.stringify({type:'other', path, profile:'', author:''});
  };

  // Abrir el buscador propio de Instagram, sin consultar APIs ni recrear resultados.
  window.__calmaOpenSearch = () => {
    const visible = el => !!(el && el.getClientRects().length);
    const input = [...document.querySelectorAll(
      'input[placeholder="Search"], input[placeholder="Buscar"], ' +
      'input[aria-label="Search input"], input[aria-label="Entrada de búsqueda"]'
    )].find(el => visible(el) && (isSearch(location.pathname) || el.closest('[role="dialog"]')));
    if (input) { input.focus(); return true; }
    const links = document.querySelectorAll('a[href]');
    let target = [...links].find(el => {
      try { return visible(el) && isInstagramUrl(el.href) && isSearch(new URL(el.href, location.href).pathname); }
      catch (_) { return false; }
    });
    if (!target) {
      const controls = document.querySelectorAll(
        'nav a, nav button, nav [role="button"], aside a, aside [role="button"], ' +
        '[role="navigation"] a, [role="navigation"] [role="button"]'
      );
      target = [...controls].find(el => {
        const icon = el.querySelector('svg[aria-label]');
        const labels = [el.textContent, el.getAttribute('aria-label'), icon?.getAttribute('aria-label')];
        return visible(el) && labels.some(label => /^(search|buscar|búsqueda)$/i.test((label || '').trim()));
      });
    }
    if (!target) return false;
    target.click();
    return true;
  };

  // Clic explícito del usuario sobre '+ Publicar' en Calma. Sólo abre el
  // creador oficial; nunca confirma ni envía una publicación automáticamente.
  window.__calmaOpenComposer = () => {
    const direct = document.querySelector(
      'a[href^="/create/"], a[href*="instagram.com/create/"], ' +
      '[aria-label="New post"], [aria-label="Nueva publicación"], ' +
      '[aria-label="Create"], [aria-label="Crear"]'
    );
    const visible = el => !!(el && el.getClientRects().length);
    let target = visible(direct) ? direct : null;
    if (!target) {
      const navigation = document.querySelectorAll(
        'nav a, nav button, nav [role="button"], nav [role="link"], ' +
        'aside a, aside button, [role="navigation"] a, [role="navigation"] [role="button"]'
      );
      target = [...navigation].find(el => {
        const label = [el.textContent, el.getAttribute('aria-label'), el.getAttribute('title')]
          .filter(Boolean).join(' ').trim();
        return visible(el) && /^(crear|create|nueva publicación|new post)$/i.test(label);
      });
    }
    if (!target) return false;
    const tappable = target.closest('a,button,[role="button"],[role="link"]') || target;
    tappable.click();
    // En algunos diseños aparece un segundo menú con 'Publicación / Post'.
    // Buscarlo sólo dentro de un menú visible, nunca tocar 'Compartir'.
    setTimeout(() => {
      const menus = document.querySelectorAll('[role="menu"]');
      for (const menu of menus) {
        if (!visible(menu)) continue;
        const items = menu.querySelectorAll('button,a,[role="menuitem"],[role="button"]');
        for (const item of items) {
          if (visible(item) && /^(post|publicación|publicacion)$/i.test(
              (item.textContent || '').trim())) { item.click(); return; }
        }
      }
    }, 380);
    return true;
  };

  window.__calmaRefresh = scheduleRefresh;
  refresh();
})();
