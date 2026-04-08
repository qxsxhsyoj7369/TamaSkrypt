(function () {
  'use strict';

  const ID = '__gelek_loader_badge__';

  function ensureBadge() {
    let badge = document.getElementById(ID);
    if (badge) return badge;

    badge = document.createElement('div');
    badge.id = ID;
    badge.style.cssText = [
      'position:fixed',
      'top:10px',
      'right:10px',
      'z-index:2147483647',
      'padding:4px 8px',
      'border-radius:999px',
      'font:11px/1.3 Segoe UI,Arial,sans-serif',
      'background:#2d3748cc',
      'color:#fff',
      'border:1px solid #ffffff33',
      'backdrop-filter: blur(2px)',
      'pointer-events:none'
    ].join(';');
    badge.textContent = 'Loader: start';
    (document.body || document.documentElement).appendChild(badge);
    return badge;
  }

  window.addEventListener('__ts_loader_progress_event__', function (event) {
    const detail = event.detail || {};
    const badge = ensureBadge();
    const done = detail.done || 0;
    const total = detail.total || 0;
    const label = detail.label || 'loading';
    badge.textContent = `Loader: ${done}/${total} • ${label}`;
  });

  window.addEventListener('__ts_loader_done_event__', function () {
    const badge = ensureBadge();
    badge.textContent = 'Loader: done';
    setTimeout(() => {
      if (badge.parentNode) badge.remove();
    }, 1200);
  });

  window.addEventListener('__ts_loader_fail_event__', function () {
    const badge = ensureBadge();
    badge.style.background = '#8b1c1ccc';
    badge.textContent = 'Loader: error';
  });
})();
