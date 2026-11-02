/*
 * Calma · Reproductor de un solo clip (Instagram WebView).
 * Sólo se arma tras abrir contenido compartido desde Direct. No solicita
 * archivos ni usa servicios externos; usa el <video> ya cargado por Instagram.
 * Aísla un único elemento de video: nunca muestra el siguiente clip sugerido.
 */
(() => {
  'use strict';
  if (window.__calmaClipInstalled) return;
  window.__calmaClipInstalled = true;

  const DIRECT = /^\/direct(?:\/|$)/i;
  const CLIP = /^\/(?:reel\/[a-zA-Z0-9_-]+|stories\/[a-zA-Z0-9._]+\/[0-9]+)(?:\/|$)/i;
  const POST = /^\/p\/[a-zA-Z0-9_-]+(?:\/|$)/i;
  const MAX_WAIT_MS = 12000;
  const player = {armedUntil: 0, overlay: null, video: null, closing: false,
    returnChatUrl: '', sourceUrl: ''};
  const normalize = path => (path || '').replace(/\/+$/, '');
  const isDirect = () => DIRECT.test(location.pathname);
  const isClip = path => CLIP.test(path);
  const matchesPost = path => POST.test(path);
  const active = () => !!(player.overlay && player.overlay.isConnected);

  function informAndroid(path) {
    try { window.CalmaBridge?.armClip(path || ''); } catch (_) { /* navegador estándar */ }
  }
  function approveUrl(href) {
    try {
      const parsed = new URL(href, location.href);
      if (parsed.protocol !== 'https:' || !['www.instagram.com', 'instagram.com'].includes(parsed.hostname)) return false;
      const path = parsed.pathname;
      if (!isClip(path) && !matchesPost(path)) return false;
      window.__calmaApprovedSingleClipPath = normalize(path);
      player.sourceUrl = normalize(path);
      player.armedUntil = Date.now() + MAX_WAIT_MS;
      player.returnChatUrl = location.href;
      informAndroid(parsed.href);
      return true;
    } catch (_) { return false; }
  }
  function armUnknownPreview() {
    if (!isDirect()) return;
    player.armedUntil = Date.now() + MAX_WAIT_MS;
    player.returnChatUrl = location.href;
    window.__calmaClipPendingUntil = player.armedUntil;
    informAndroid(''); // Una sola navegación a Reel/Historia durante 12 s.
  }

  // Tocar el contenido compartido es el único gesto que activa el visor.
  // Nunca interceptar clicks en chats que no apuntan a un video.
  document.addEventListener('click', e => {
    if (!(e.target instanceof Element) || active() || !isDirect()) return;
    const el = e.target;
    const anchor = el.closest('a[href]');
    if (anchor && approveUrl(anchor.href)) {
      // Dejar que React abra el clip. Android autoriza sólo esta URL.
      return;
    }
    // En Direct, algunas tarjetas de historia/reel son un <div> con onClick,
    // sin enlace. Sólo armar si se tocó una miniatura de medios en un mensaje.
    const media = el.closest('img, video') || el.querySelector?.('img, video');
    if (media && !el.closest('header, nav, [role="navigation"], form, [contenteditable]') &&
        el.closest('a, [role="button"], [role="link"]')) armUnknownPreview();
  }, true);

  const css = `
    #calma-single-clip { position:fixed!important; inset:0!important;
      z-index:2147483647!important; display:flex!important; flex-direction:column!important;
      background:#050505!important; color:white!important; width:100vw!important;
      height:100dvh!important; min-height:100vh!important; max-width:none!important;
      overflow:hidden!important; touch-action:pan-x!important; font-family:system-ui,sans-serif!important;
      box-sizing:border-box!important; }
    #calma-single-clip * { box-sizing:border-box!important; }
    #calma-single-clip .calma-clip-top, #calma-single-clip .calma-clip-bottom {
      display:flex!important; flex:none!important; align-items:center!important; gap:12px!important;
      min-height:56px!important; padding:8px 14px!important; background:#111318!important;
      color:white!important; z-index:2!important; }
    #calma-single-clip button { background:#25282c!important; border:0!important;
      border-radius:12px!important; color:white!important; padding:11px 15px!important;
      font:600 14px system-ui,sans-serif!important; min-height:44px!important; cursor:pointer!important; }
    #calma-single-clip button:focus-visible { outline:2px solid #88d7b7!important; }
    #calma-single-clip .calma-clip-screen { flex:1!important; display:flex!important;
      align-items:center!important; justify-content:center!important; min-height:0!important;
      min-width:0!important; overflow:hidden!important; background:#000!important;
      position:relative!important; touch-action:pan-x!important; }
    #calma-single-clip video { position:static!important; display:block!important;
      width:100%!important; height:100%!important; max-width:100%!important;
      max-height:100%!important; min-width:0!important; min-height:0!important;
      transform:none!important; object-fit:contain!important; object-position:center!important;
      margin:auto!important;
      border:0!important; inset:auto!important; opacity:1!important;
      visibility:visible!important; pointer-events:auto!important; }
    #calma-single-clip .calma-clip-bottom { justify-content:space-between!important; }
    #calma-single-clip .calma-clip-badge { font:500 12px system-ui,sans-serif!important;
      color:#88d7b7!important; flex:1!important; white-space:nowrap!important; }
    #calma-single-clip .calma-clip-finished { position:absolute!important; inset:0!important;
      display:none!important; align-items:center!important; justify-content:center!important;
      flex-direction:column!important; gap:16px!important; background:#111318f2!important;
      font:500 16px system-ui,sans-serif!important; z-index:2!important; }
    #calma-single-clip.ended .calma-clip-finished { display:flex!important; }
    body.calma-single-clip-open { overflow:hidden!important; overscroll-behavior:none!important; }
    body.calma-chat a[href^="/reel/"], body.calma-chat a[href^="/stories/"] {
      display:revert!important; visibility:visible!important; }
  `;
  const style = document.createElement('style');
  style.id = 'calma-one-video-style'; style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  function notify(visible) {
    try { window.CalmaBridge?.setClipActive(visible); } catch (_) { /* no WebView */ }
  }
  function element(tag, classname, label) {
    const node = document.createElement(tag);
    if (classname) node.className = classname;
    if (label) node.textContent = label;
    return node;
  }
  function button(label, callback) {
    const node = element('button', '', label);
    node.type = 'button'; node.addEventListener('click', callback); return node;
  }
  function stopMedia() {
    if (player.video) {
      try { player.video.pause(); } catch (_) {}
    }
  }
  function endHandler(event) {
    event?.stopImmediatePropagation?.();
    event?.stopPropagation?.();
    if (!active()) return;
    stopMedia();
    player.overlay.classList.add('ended');
  }
  function returnChatUrl() {
    const back = player.returnChatUrl || window.__calmaReturnChatUrl;
    try {
      const url = new URL(back);
      if (url.origin === 'https://www.instagram.com' && /^\/direct\//.test(url.pathname)) return url.href;
    } catch (_) {}
    return 'https://www.instagram.com/direct/inbox/';
  }
  function dismiss() {
    if (!active() || player.closing) return false;
    player.closing = true;
    stopMedia();
    player.video?.removeEventListener('ended', endHandler, true);
    // No devolver el video al modal/carrusel de Instagram. Mantener una tapa
    // hasta la nueva carga impide mostrar sugeridos incluso durante la salida.
    for (const video of document.querySelectorAll('video')) {
      try { video.pause(); } catch (_) {}
    }
    const returning = element('div', 'calma-clip-top', 'Volviendo al chat…');
    player.overlay.replaceChildren(returning);
    player.video = null;
    player.armedUntil = 0;
    window.__calmaClipPendingUntil = 0;
    window.__calmaApprovedSingleClipPath = '';
    notify(false);
    return true;
  }
  function close() {
    const back = returnChatUrl();
    if (!dismiss()) return;
    // Instagram puede abrir el carrusel sin salir de /direct/ o dentro de /p/.
    // Siempre cargar el chat de nuevo, aunque la URL actual ya sea la del chat.
    location.replace(back);
  }
  function isolate(video) {
    if (!video || active() || !document.body) return false;
    player.video = video;
    const overlay = element('div');
    overlay.id = 'calma-single-clip';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Video compartido: un solo clip');
    const top = element('div', 'calma-clip-top');
    top.appendChild(button('← Chats', close));
    const title = element('span', '', 'Un solo video · sin sugeridos');
    title.style.fontSize = '13px'; top.appendChild(title);
    const screen = element('div', 'calma-clip-screen');
    // Trasladar el MISMO elemento conserva la fuente de reproducción y evita
    // descargar enlaces privados o reconstruir streams blob:/MSE.
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    video.controls = false;
    video.loop = false;
    video.addEventListener('ended', endHandler, true);
    screen.appendChild(video);
    const finished = element('div', 'calma-clip-finished', 'Video terminado');
    finished.appendChild(button('↻ Volver a ver', () => {
      overlay.classList.remove('ended');
      try { video.currentTime = 0; video.play().catch(() => {}); } catch (_) {}
    }));
    finished.appendChild(button('← Volver al chat', close));
    screen.appendChild(finished);
    const bottom = element('div', 'calma-clip-bottom');
    const state = element('span', 'calma-clip-badge', 'Sin swipe');
    bottom.appendChild(state);
    const play = button('Ⅱ Pausar', () => {
      if (video.paused) { video.play().catch(() => {}); play.textContent = 'Ⅱ Pausar'; }
      else { video.pause(); play.textContent = '▶ Reproducir'; }
    });
    video.addEventListener('play', () => { play.textContent='Ⅱ Pausar'; });
    video.addEventListener('pause', () => { play.textContent='▶ Reproducir'; });
    const sound = button(video.muted ? '🔇 Activar sonido' : '🔊 Sonido activo', () => {
      // Gesto explícito: Chromium puede bloquear autoplay con audio hasta que se toque.
      try {
        video.muted = false; video.defaultMuted = false; video.volume = 1;
        sound.textContent = video.muted ? '🔇 Activar sonido' : '🔊 Sonido activo';
        if (video.paused) video.play().catch(() => {});
      } catch (_) { sound.textContent = 'Audio no disponible'; }
    });
    bottom.appendChild(play); bottom.appendChild(sound);
    overlay.appendChild(top); overlay.appendChild(screen); overlay.appendChild(bottom);
    document.body.appendChild(overlay);
    document.body.classList.add('calma-single-clip-open');
    player.overlay = overlay;
    // Capturar los gestos antes de que lleguen al carrusel de Instagram.
    let sx = 0, sy = 0;
    overlay.addEventListener('touchstart', e => {
      sx = e.touches[0]?.clientX || 0; sy = e.touches[0]?.clientY || 0;
    }, {passive:true});
    overlay.addEventListener('touchmove', e => {
      const t = e.touches[0];
      if (t && (Math.abs(t.clientY - sy) > 8 || Math.abs(t.clientX - sx) > 8)) e.preventDefault();
    }, {passive:false, capture:true});
    overlay.addEventListener('wheel', e => e.preventDefault(), {passive:false});
    notify(true);
    // Reproducir con el mismo estado de Instagram. Si el dispositivo exige
    // gesto previo, el botón Reproducir sigue disponible.
    if (video.paused) video.play().catch(() => {});
    return true;
  }
  function selectVideo() {
    let best = null, bestScore = -1;
    for (const video of document.querySelectorAll('video')) {
      if (active() && player.overlay.contains(video)) continue;
      const box = video.getBoundingClientRect();
      if (box.width < 64 || box.height < 64) continue;
      if (getComputedStyle(video).visibility === 'hidden') continue;
      const score = (!video.paused ? 10000000 : 0) +
        Math.min(box.width, innerWidth) * Math.min(box.height, innerHeight);
      if (score > bestScore) { best = video; bestScore = score; }
    }
    return best;
  }
  function tick() {
    if (active()) return;
    // En un enlace explícito a Reel/Historia, sólo se entra desde Direct.
    // No armar automáticamente el catálogo de videos de Instagram.
    if (Date.now() > player.armedUntil) return;
    const video = selectVideo();
    if (video) isolate(video);
  }
  window.__calmaClipRefresh = () => {
    document.body?.classList.toggle('calma-chat', isDirect());
    if (active()) {
      // Si Instagram cambia de clip sin una acción del usuario, salir al chat.
      // Las SPA pueden cambiar la URL sin pasar por shouldOverrideUrlLoading.
      if (isClip(location.pathname) && player.sourceUrl &&
          normalize(location.pathname) !== player.sourceUrl) close();
      return;
    }
    if (isClip(location.pathname) && Date.now() < (window.__calmaClipPendingUntil || 0)) {
      window.__calmaApprovedSingleClipPath = normalize(location.pathname);
      player.sourceUrl = normalize(location.pathname);
    }
    // Historial permitido por Android al abrir una ruta desde el chat.
    if (isClip(location.pathname) &&
        normalize(window.__calmaApprovedSingleClipPath) === normalize(location.pathname) &&
        player.armedUntil === 0) {
      player.armedUntil = Date.now() + MAX_WAIT_MS;
    }
    if (isClip(location.pathname) && player.armedUntil > 0 &&
        Date.now() > player.armedUntil) {
      const back = window.__calmaReturnChatUrl;
      location.replace(typeof back === 'string' &&
        /^https:\/\/www\.instagram\.com\/direct\//.test(back)
        ? back : 'https://www.instagram.com/direct/inbox/');
      return;
    }
    tick();
  };
  window.__calmaClipClose = close;
  // Android usa esto antes de navegar a un destino explícito (Buscar/Publicar).
  window.__calmaClipDismiss = dismiss;
  // Fallback: si un modal tarda en dibujarse, evitar swipes de Instagram
  // incluso antes de que el video quede aislado.
  document.addEventListener('touchmove', e => {
    if (!active() && Date.now() < player.armedUntil &&
        (isClip(location.pathname) || document.querySelector('[role="dialog"] video'))) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, {capture:true, passive:false});
  document.addEventListener('keydown', e => {
    if (active() && /^(Arrow(Up|Down|Left|Right)|Page(Up|Down)|Space)$/i.test(e.code)) {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);
  // Poll corto: el modal del chat aparece sin modificar la URL ni la página.
  // Sólo busca videos durante los 12 s posteriores a un toque de usuario.
  setInterval(window.__calmaClipRefresh, 220);
  window.__calmaClipRefresh();
})();
