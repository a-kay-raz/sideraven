// Sideraven True #000000 AMOLED Dark Mode Content Script
(function () {
  'use strict';

  const SKIP_TAGS = new Set([
    'IMG', 'VIDEO', 'CANVAS', 'PICTURE', 'SVG', 'PATH', 'CIRCLE',
    'RECT', 'IFRAME', 'SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD'
  ]);

  function ensureMetaDarkScheme() {
    if (!document.documentElement) return;
    document.documentElement.style.setProperty('color-scheme', 'dark', 'important');
    document.documentElement.style.setProperty('background-color', '#000000', 'important');

    if (document.head && !document.querySelector('meta[name="color-scheme"]')) {
      const meta = document.createElement('meta');
      meta.name = 'color-scheme';
      meta.content = 'dark';
      document.head.prepend(meta);
    }
  }

  function parseRgb(colorStr) {
    if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') {
      return null;
    }
    const m = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (!m) return null;
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (a < 0.15) return null;
    return {
      r: parseInt(m[1], 10),
      g: parseInt(m[2], 10),
      b: parseInt(m[3], 10),
      a: a
    };
  }

  function processElement(el) {
    if (!el || el.nodeType !== 1 || SKIP_TAGS.has(el.tagName)) return;

    try {
      const style = window.getComputedStyle(el);
      const bgImg = style.backgroundImage;
      const hasImageBg = bgImg && bgImg !== 'none' && !bgImg.startsWith('linear-gradient') && !bgImg.startsWith('radial-gradient');

      if (!hasImageBg) {
        const bg = parseRgb(style.backgroundColor);
        if (bg) {
          const maxC = Math.max(bg.r, bg.g, bg.b);
          const minC = Math.min(bg.r, bg.g, bg.b);
          const saturation = maxC - minC;
          const lum = 0.2126 * bg.r + 0.7152 * bg.g + 0.0722 * bg.b;

          // Convert bright/white backgrounds OR non-AMOLED dark-gray backgrounds (low saturation) to #000000
          if (saturation < 45 && (lum > 110 || (lum > 2 && lum <= 55))) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 220 || rect.height > 120 || el === document.body || el === document.documentElement) {
              el.setAttribute('data-sideraven-amoled', 'bg');
            } else {
              el.setAttribute('data-sideraven-amoled', 'surface');
            }
          }
        }
      }

      const fg = parseRgb(style.color);
      if (fg) {
        const fgLum = 0.2126 * fg.r + 0.7152 * fg.g + 0.0722 * fg.b;
        if (fgLum < 65) {
          el.setAttribute('data-sideraven-amoled-text', 'light');
        }
      }
    } catch (_) {
      // Ignore cross-origin or detached node errors
    }
  }

  function scanTree(root) {
    ensureMetaDarkScheme();
    if (!root || root.nodeType !== 1) return;
    processElement(root);
    const nodes = root.querySelectorAll(
      'body, div, main, section, article, aside, header, footer, nav, ul, ol, li, table, tr, td, th, form, fieldset, dialog, p, span, h1, h2, h3, h4, h5, h6'
    );
    const limit = Math.min(nodes.length, 1500);
    for (let i = 0; i < limit; i++) {
      processElement(nodes[i]);
    }
  }

  ensureMetaDarkScheme();

  let scheduled = false;
  const pendingRoots = new Set();

  function scheduleScan(target) {
    pendingRoots.add(target || document.documentElement);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      pendingRoots.forEach((r) => scanTree(r));
      pendingRoots.clear();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scanTree(document.documentElement);
    }, { passive: true });
  } else {
    scanTree(document.documentElement);
  }

  window.addEventListener('load', () => scanTree(document.documentElement), { passive: true });

  const observer = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        for (let j = 0; j < m.addedNodes.length; j++) {
          const n = m.addedNodes[j];
          if (n.nodeType === 1) {
            scheduleScan(n);
          }
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
