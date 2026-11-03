/* One explicitly chosen profile story. The captured media never advances. */
(() => {
  'use strict';
  if (window.__calmaProfileStoryInstalled) return;
  window.__calmaProfileStoryInstalled = true;
  const clean = path => (path || '').replace(/\/+$/, '').toLowerCase();
  const story = path => /^\/stories\/(?:[a-z0-9._]+(?:\/[0-9]+)?|highlights\/[0-9]+(?:\/[0-9]+)?)\/?$/i.test(path);
  let approved = window.__calmaApprovedProfileStoryPath || '';
  let back = window.__calmaReturnProfileUrl || '';
  let overlay = null, pendingUntil = approved ? Date.now() + 12000 : 0;
  function allowed(path) {
    if (!approved || !story(path)) return false;
    const selected = clean(approved), candidate = clean(path);
    if (candidate === selected) return true;
    if (/^\/stories\/highlights\/\d+$/.test(selected) && candidate.startsWith(selected + '/') && /^\d+$/.test(candidate.slice(selected.length + 1))) {
      approved = path; window.__calmaApprovedProfileStoryPath = path; return true;
    }
    if (/^\/stories\/(?!highlights\/)[a-z0-9._]+$/.test(selected) &&
        candidate.startsWith(selected + '/') && /^\d+$/.test(candidate.slice(selected.length + 1))) {
      approved = path;
      window.__calmaApprovedProfileStoryPath = path;
      return true;
    }
    return false;
  }
  window.__calmaProfileStoryAllowed = allowed;
  window.__calmaProfileStoryClick = (event, url) => {
    const profile = /^\/([a-z0-9._]{1,30})\/?$/i.exec(location.pathname);
    if (!profile || !story(url.pathname) || url.origin !== location.origin) return false;
    const owner = /^\/stories\/([^/]+)/i.exec(url.pathname)?.[1];
    if (owner?.toLowerCase() !== profile[1].toLowerCase() && owner !== 'highlights') return false;
    approved = url.pathname; back = location.href;
    pendingUntil = Date.now() + 12000;
    window.__calmaApprovedProfileStoryPath = approved;
    window.__calmaReturnProfileUrl = back;
    try { window.CalmaBridge?.armProfileStory(url.href, back); } catch (_) {}
    return true;
  };
  // Some profile avatars are buttons rather than links. Arm only the visible
  // profile header avatar after its explicit click; never arbitrary images.
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element) || event.target.closest('a[href]')) return;
    const button = event.target.closest('button, [role="button"]');
    if (!button || !button.closest('header')) return;
    const avatar = button.querySelector('img');
    if (!avatar || !/profile picture|foto (?:del|de) perfil|foto del perfil/i.test(avatar.alt || '')) return;
    const profile = /^\/([a-z0-9._]{1,30})\/?$/i.exec(location.pathname);
    if (profile) window.__calmaProfileStoryClick(event,
      new URL('/stories/' + profile[1] + '/', location.href));
  }, true);
  function close() {
    for (const video of document.querySelectorAll('video')) video.pause();
    location.replace(back || 'https://www.instagram.com/direct/inbox/');
  }
  function capture() {
    if (overlay || !allowed(location.pathname) || !document.body) return;
    const candidates = [...document.querySelectorAll('video, img')].filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width >= 120 && rect.height >= 180 &&
        getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none' &&
        (el.tagName === 'VIDEO' ? !!(el.currentSrc || el.src) : el.complete && el.naturalWidth > 0);
    });
    candidates.sort((a,b) => {
      const score = el => {
        const r = el.getBoundingClientRect();
        return Math.max(0, Math.min(r.right,innerWidth)-Math.max(r.left,0)) *
          Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));
      };
      return score(b)-score(a);
    });
    const source = candidates[0];
    if (!source) return;
    overlay = document.createElement('div');
    overlay.id = 'calma-profile-story';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Historia elegida, sin avanzar');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#111;color:white;display:flex;flex-direction:column;touch-action:none;';
    const closeButton = document.createElement('button');
    closeButton.textContent = '← Perfil · Elegir otra historia';
    closeButton.style.cssText = 'padding:16px;background:#253c31;color:white;border:0;font-size:16px;';
    closeButton.onclick = close;
    const media = source.cloneNode(true);
    if (source.tagName === 'VIDEO') {
      media.src = source.currentSrc || source.src;
      media.muted = source.muted;
      source.pause();
    }
    media.style.cssText = 'width:100%;height:0;flex:1;min-height:0;object-fit:contain;position:static;transform:none;';
    if (source.tagName === 'VIDEO') {
      media.loop = false; media.controls = true;
      media.addEventListener('ended', e => { e.stopImmediatePropagation(); media.pause(); }, true);
      media.addEventListener('timeupdate', e => e.stopImmediatePropagation(), true);
    }
    overlay.append(closeButton, media);
    const label = document.createElement('div');
    label.textContent = 'Una historia · sin reproducción encadenada';
    label.style.cssText = 'padding:12px;text-align:center;font:14px sans-serif;';
    overlay.append(label);
    if (media.tagName === 'VIDEO') {
      media.addEventListener('error', () => {
        label.textContent = 'Instagram no expuso un video reproducible. Volvé al perfil para elegir otra historia.';
      });
    }
    for (const name of ['click','pointerdown','pointerup','touchstart','touchend']) {
      overlay.addEventListener(name, e => e.stopPropagation());
    }
    overlay.addEventListener('touchmove', e => { e.preventDefault(); e.stopPropagation(); }, {passive:false});
    overlay.addEventListener('wheel', e => { e.preventDefault(); e.stopPropagation(); }, {passive:false});
    document.body.append(overlay);
    if (media.tagName === 'VIDEO') media.play().catch(() => {});
  }
  window.__calmaProfileStoryRefresh = () => {
    if (!approved) return;
    if (overlay) for (const video of document.querySelectorAll('video')) {
      if (!overlay.contains(video)) video.pause();
    }
    if (story(location.pathname) && !allowed(location.pathname)) { close(); return; }
    if (allowed(location.pathname)) {
      capture();
      if (!overlay && Date.now() > pendingUntil) close();
    }
  };
  // Keep Instagram's timer/keyboard/swipes behind a stable captured item.
  for (const method of ['pushState','replaceState']) {
    const original = history[method];
    history[method] = function(state, title, url) {
      if (approved && url != null) {
        const target = new URL(url, location.href);
        if ((overlay && target.href !== location.href) ||
            (story(target.pathname) && !allowed(target.pathname))) return;
      }
      return original.apply(this, arguments);
    };
  }
  document.addEventListener('keydown', e => {
    if (!overlay) return;
    if (e.key === 'Escape') close();
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageDown','PageUp',' '].includes(e.key)) {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);
  setInterval(window.__calmaProfileStoryRefresh, 150);
  window.__calmaProfileStoryRefresh();
})();
