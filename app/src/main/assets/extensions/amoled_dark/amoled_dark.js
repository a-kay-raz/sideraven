// AMOLED Dark Mode Content Script
(function() {
  'use strict';

  function applyAmoledTheme() {
    if (document.documentElement) {
      document.documentElement.style.setProperty('color-scheme', 'dark', 'important');
      document.documentElement.style.setProperty('background-color', '#000000', 'important');
    }

    if (!document.body) return;

    try {
      const bodyStyle = window.getComputedStyle(document.body);
      const bg = bodyStyle.backgroundColor;
      if (bg === 'rgb(255, 255, 255)' || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
        document.body.style.setProperty('background-color', '#000000', 'important');
        if (bodyStyle.color === 'rgb(0, 0, 0)') {
          document.body.style.setProperty('color', '#e2e2e6', 'important');
        }
      }
    } catch (e) {
      // Ignore security/origin exceptions on restricted frames
    }
  }

  applyAmoledTheme();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAmoledTheme, { passive: true });
  }
})();
