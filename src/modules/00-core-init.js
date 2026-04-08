(function () {
  'use strict';

  if (!window.Gelek) {
    window.Gelek = {
      version: '3.0.0',
      bootedAt: Date.now(),
      events: {
        emit(name, detail) {
          window.dispatchEvent(new CustomEvent(name, { detail }));
        },
        on(name, handler) {
          window.addEventListener(name, handler);
        }
      },
      runtime: {
        env: 'tampermonkey',
        moduleMode: true,
      },
    };
  }

  window.Gelek.events.emit('__gelek_core_ready__', {
    version: window.Gelek.version,
    bootedAt: window.Gelek.bootedAt,
  });
})();
