// Sideraven True #000000 AMOLED Dark Mode Content Script
(function () {
  'use strict';

  const SKIP_TAGS = new Set([
    'IMG', 'VIDEO', 'CANVAS', 'PICTURE', 'SVG', 'PATH', 'CIRCLE',
    'RECT', 'IFRAME', 'SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD',
    'NOSCRIPT', 'SOURCE', 'TRACK', 'AUDIO', 'OBJECT', 'EMBED'
  ]);

  const SURFACE_TAGS = new Set([
    'ASIDE', 'NAV', 'DIALOG', 'FIELDSET', 'FORM', 'BLOCKQUOTE'
  ]);

  const processedNodes = new WeakSet();
  const queue = [];
  let frameScheduled = false;

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
    // Preserve translucent / glassmorphism headers & overlays
    if (a < 0.72) return null;
    return {
      r: parseInt(m[1], 10),
      g: parseInt(m[2], 10),
      b: parseInt(m[3], 10),
      a: a
    };
  }

  function processElement(el) {
    if (!el || el.nodeType !== 1 || SKIP_TAGS.has(el.tagName) || processedNodes.has(el)) return;
    processedNodes.add(el);

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

          // Convert opaque bright/white or dark-gray low-saturation backgrounds to AMOLED #000000
          if (saturation < 45 && (lum > 110 || (lum > 2 && lum <= 58))) {
            const isSmallSurface = SURFACE_TAGS.has(el.tagName) || el.getAttribute('role') === 'dialog';
            el.setAttribute('data-sideraven-amoled', isSmallSurface ? 'surface' : 'bg');
          }
        }
      }

      const fg = parseRgb(style.color);
      if (fg) {
        const fgLum = 0.2126 * fg.r + 0.7152 * fg.g + 0.0722 * fg.b;
        if (fgLum < 68) {
          el.setAttribute('data-sideraven-amoled-text', 'light');
        }
      }
    } catch (_) {
      // Ignore cross-origin or detached node errors
    }
  }

  function flushQueue() {
    frameScheduled = false;
    const batchSize = 250;
    let count = 0;
    while (queue.length > 0 && count < batchSize) {
      const node = queue.shift();
      processElement(node);
      count++;
    }
    if (queue.length > 0) {
      scheduleFlush();
    }
  }

  function scheduleFlush() {
    if (frameScheduled) return;
    frameScheduled = true;
    requestAnimationFrame(flushQueue);
  }

  function enqueueSubtree(root) {
    if (!root || root.nodeType !== 1 || SKIP_TAGS.has(root.tagName)) return;
    if (!processedNodes.has(root)) {
      queue.push(root);
    }
    const children = root.querySelectorAll(
      'body, div, main, section, article, aside, header, footer, nav, ul, ol, li, table, tr, td, th, form, fieldset, dialog, p, span, h1, h2, h3, h4, h5, h6'
    );
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!processedNodes.has(child)) {
        queue.push(child);
      }
    }
    if (queue.length > 0) {
      scheduleFlush();
    }
  }

  ensureMetaDarkScheme();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureMetaDarkScheme();
      enqueueSubtree(document.documentElement);
    }, { passive: true });
  } else {
    enqueueSubtree(document.documentElement);
  }

  window.addEventListener('load', () => {
    ensureMetaDarkScheme();
    enqueueSubtree(document.documentElement);
  }, { passive: true });

  const observer = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        for (let j = 0; j < m.addedNodes.length; j++) {
          const n = m.addedNodes[j];
          if (n.nodeType === 1) {
            enqueueSubtree(n);
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
