/* Shared, accessible controls for one deliberately selected media item. */
(() => {
  'use strict';
  if (window.__calmaViewerControls) return;
  const paths = {
    back: 'M19 12H5m7 7-7-7 7-7',
    play: 'm8 5 11 7-11 7Z',
    pause: 'M8 5v14M16 5v14',
    sound: 'm11 5-6 4H2v6h3l6 4Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
    mute: 'm11 5-6 4H2v6h3l6 4Zm5 4 5 6m0-6-5 6',
    replay: 'M3 10a9 9 0 1 1 2 8M3 4v6h6'
  };
  const style = document.createElement('style');
  style.textContent = `
    .calma-media-viewer {position:fixed!important;inset:0!important;z-index:2147483647!important;display:flex!important;flex-direction:column!important;background:#050505!important;color:#f4f5f7!important;width:100%!important;height:100dvh!important;max-width:none!important;overflow:hidden!important;touch-action:none!important;font-family:system-ui,sans-serif!important;box-sizing:border-box!important}
    .calma-media-viewer * {box-sizing:border-box!important}
    .calma-media-screen {flex:1!important;min-height:0!important;min-width:0!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;position:relative!important;background:#050505!important}
    .calma-media-screen > video,.calma-media-screen > img {position:static!important;display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;min-width:0!important;min-height:0!important;transform:none!important;object-fit:contain!important;object-position:center!important;margin:auto!important;border:0!important;inset:auto!important;opacity:1!important;visibility:visible!important}
    .calma-media-controls {display:flex!important;flex:none!important;align-items:center!important;justify-content:space-evenly!important;min-height:60px!important;padding:4px 8px!important;background:#111318!important;z-index:2!important}
    .calma-media-controls button {display:grid!important;place-items:center!important;width:52px!important;height:52px!important;padding:14px!important;border:0!important;border-radius:12px!important;background:transparent!important;color:#f4f5f7!important;cursor:pointer!important}
    .calma-media-controls button:focus-visible {outline:2px solid #88d7b7!important}
    .calma-media-controls button[hidden] {display:none!important}
    .calma-media-controls svg {display:block!important;width:24px!important;height:24px!important;fill:none!important;stroke:currentColor!important;stroke-width:2!important;stroke-linecap:round!important;stroke-linejoin:round!important}
    .calma-media-error {position:absolute!important;inset:40% 16px auto!important;text-align:center!important;color:#f4f5f7!important;background:#111318!important;padding:16px!important}
  `;
  (document.head || document.documentElement).append(style);
  function setIcon(button, icon, label) {
    button.setAttribute('aria-label', label); button.title = label;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', paths[icon]); svg.append(path); button.replaceChildren(svg);
  }
  function button(icon, label, action) {
    const control = document.createElement('button'); control.type = 'button';
    setIcon(control, icon, label); control.onclick = action; return control;
  }
  function controls(media, overlay, backLabel, onBack) {
    const bar = document.createElement('div'); bar.className = 'calma-media-controls';
    bar.append(button('back', backLabel, onBack));
    if (media.tagName !== 'VIDEO') return bar;
    media.controls = false; media.loop = false;
    const play = button('play', 'Reproducir', () => {
      if (media.paused) media.play().catch(() => {}); else media.pause();
    });
    const sound = button('mute', 'Activar sonido', () => {
      media.muted = !media.muted; media.volume = 1;
    });
    const replay = button('replay', 'Volver a ver', () => {
      overlay.classList.remove('ended'); replay.hidden = true; play.hidden = false;
      media.currentTime = 0; media.play().catch(() => {});
    });
    replay.hidden = true;
    const update = () => {
      setIcon(play, media.paused ? 'play' : 'pause', media.paused ? 'Reproducir' : 'Pausar');
      setIcon(sound, media.muted ? 'mute' : 'sound', media.muted ? 'Activar sonido' : 'Silenciar');
    };
    media.addEventListener('play', update); media.addEventListener('pause', update);
    media.addEventListener('volumechange', update);
    media.addEventListener('ended', event => {
      event.stopImmediatePropagation(); media.pause(); overlay.classList.add('ended');
      replay.hidden = false; play.hidden = true;
    }, true);
    media.addEventListener('error', () => {
      if (overlay.querySelector('.calma-media-error')) return;
      const error = document.createElement('div'); error.className = 'calma-media-error';
      error.setAttribute('role', 'status'); error.textContent = 'No se pudo reproducir este video.';
      overlay.querySelector('.calma-media-screen').append(error);
    });
    bar.append(play, sound, replay); update(); return bar;
  }
  window.__calmaViewerControls = {controls};
})();
