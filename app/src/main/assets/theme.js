/* Use Instagram's own palettes; never invert photos, video, or the whole page. */
(() => {
  'use strict';
  if (window.__calmaApplyTheme) {
    window.__calmaApplyTheme(window.__calmaDarkMode !== false);
    return;
  }
  let dark = window.__calmaDarkMode !== false;
  function apply() {
    const root = document.documentElement;
    root.classList.toggle('__fb-dark-mode', dark);
    root.classList.toggle('__fb-light-mode', !dark);
    root.classList.toggle('_aa4b', dark);
    root.classList.toggle('_aa4c', !dark);
    root.style.setProperty('color-scheme', dark ? 'dark' : 'light');
  }
  window.__calmaApplyTheme = enabled => {
    dark = !!enabled;
    window.__calmaDarkMode = dark;
    apply();
  };
  // Instagram may reset the root classes during SPA rendering.
  new MutationObserver(apply).observe(document.documentElement, {attributes:true, attributeFilter:['class']});
  apply();
})();
