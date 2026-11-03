/* Hide only recommendation collections with an explicit semantic boundary. */
(() => {
  'use strict';
  if (window.__calmaHideRecommendationCards) return;
  const labelPattern = /^(suggested for you|recommended for you|sugerencias para ti|recomendaciones para ti)$/i;
  const text = element => (element?.textContent || '').trim().replace(/\s+/g, ' ');
  const profile = /^\/[a-z0-9._]{1,30}\/?$/i;
  const followPattern = /^(follow|seguir)$/i;
  function labelled(list) {
    if (labelPattern.test((list.getAttribute('aria-label') || '').trim())) return true;
    const ids = (list.getAttribute('aria-labelledby') || '').trim().split(/\s+/);
    return ids.some(id => id && labelPattern.test(text(document.getElementById(id))));
  }
  function accountCard(card, observedRow = false) {
    // A labelled list can also contain loading or unrelated content. Hide only
    // individual list items containing a profile and an explicit Follow action.
    if ((!observedRow && !card.matches('li, [role="listitem"]')) ||
        card.querySelector('main, nav, article, input, textarea, video, h1, h2, h3, h4')) return false;
    if (observedRow && (card.tagName !== 'DIV' || card.children.length !== 3 ||
        card.querySelectorAll('img').length !== 1 || card.querySelectorAll('a[href]').length !== 2 ||
        card.querySelectorAll('button, [role="button"]').length !== 1)) return false;
    const links = [...card.querySelectorAll('a[href]')].filter(link => {
      try {
        const url = new URL(link.href, location.href);
        return url.origin === location.origin && profile.test(url.pathname) &&
          !/^\/(direct|accounts|explore|stories|notifications|reels?)\/?$/i.test(url.pathname);
      } catch (_) { return false; }
    });
    const users = new Set(links.map(link => new URL(link.href, location.href).pathname.replace(/\/$/, '').toLowerCase()));
    return users.size === 1 && [...card.querySelectorAll('button, [role="button"]')]
      .some(button => followPattern.test(text(button)) || followPattern.test(button.getAttribute('aria-label') || ''));
  }
  function hide(card) {
    card.setAttribute('data-calma-recommendation', '');
    card.style.setProperty('display', 'none', 'important');
  }
  window.__calmaHideRecommendationCards = () => {
    for (const list of document.querySelectorAll('ul, ol, [role="list"]')) {
      if (!labelled(list)) continue;
      for (const card of list.children) {
        if (!accountCard(card)) continue;
        hide(card);
      }
    }
    // Observed mobile notifications markup: a standalone suggestions heading,
    // followed by a separate collection ending in the Explore/people link.
    // Never climb from that heading into the page section or hide a collection.
    for (const heading of document.querySelectorAll('h2, h3, h4')) {
      if (!labelPattern.test(text(heading))) continue;
      const wrapper = heading.parentElement;
      const collection = wrapper?.nextElementSibling;
      if (wrapper?.tagName !== 'DIV' || wrapper.children.length !== 1 ||
          collection?.tagName !== 'DIV' ||
          !collection.querySelector('a[href="/explore/people/"], a[href="/explore/people"]') ||
          collection.querySelector('main, nav, article, form, h1, h2, h3, h4')) continue;
      for (const button of collection.querySelectorAll('button, [role="button"]')) {
        if (!followPattern.test(text(button))) continue;
        let card = button.parentElement;
        for (let depth = 0; card && card !== collection && depth < 5; depth++, card = card.parentElement) {
          if (accountCard(card, true)) { hide(card); break; }
        }
      }
    }
  };
})();
