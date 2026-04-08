(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R || !R.firebaseRead || !R.firebaseWrite) return;
  if (R.dbStatusModuleReady) return;
  R.dbStatusModuleReady = true;

  R.dbStatus = {
    state: 'INIT',
    retries: 0,
    lastError: '',
    lastSuccessAt: 0,
    lastErrorAt: 0,
    nextRetryAt: 0,
  };

  const BADGE_ID = '__gelek_db_status_badge__';

  function ensureBadge() {
    let badge = document.getElementById(BADGE_ID);
    if (badge) return badge;

    badge = document.createElement('div');
    badge.id = BADGE_ID;
    badge.style.cssText = [
      'position:fixed',
      'top:10px',
      'left:10px',
      'z-index:2147483647',
      'padding:5px 8px',
      'border-radius:999px',
      'font:11px/1.2 Segoe UI,Arial,sans-serif',
      'border:1px solid #ffffff44',
      'backdrop-filter: blur(2px)',
      'color:#fff',
      'background:#4a5568cc',
      'pointer-events:none'
    ].join(';');

    badge.textContent = 'DB: INIT';
    (document.body || document.documentElement).appendChild(badge);
    return badge;
  }

  function renderBadge() {
    const badge = ensureBadge();
    const s = R.dbStatus;

    let text = 'DB: INIT';
    let bg = '#4a5568cc';

    if (s.state === 'OK') {
      text = 'DB: OK';
      bg = '#1f8b4ccc';
    } else if (s.state === 'RETRY') {
      text = `DB: RETRY (${s.retries})`;
      bg = '#b7791fcc';
    } else if (s.state === 'ERROR') {
      text = 'DB: ERROR';
      bg = '#c53030cc';
    }

    badge.style.background = bg;
    badge.title = s.lastError
      ? `Ostatni błąd: ${s.lastError}`
      : (s.lastSuccessAt ? `Ostatni sukces: ${new Date(s.lastSuccessAt).toLocaleTimeString()}` : 'Brak danych');
    badge.textContent = text;
  }

  function setDbStatus(state, extra) {
    R.dbStatus.state = state;
    if (extra && typeof extra === 'object') {
      Object.assign(R.dbStatus, extra);
    }
    renderBadge();
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  R.withDbRetry = async function withDbRetry(label, operation, options = {}) {
    const maxRetries = Number.isInteger(options.maxRetries) ? options.maxRetries : 2;
    const baseDelay = Number.isFinite(options.baseDelayMs) ? options.baseDelayMs : 500;

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const result = await operation();
        setDbStatus('OK', {
          retries: attempt,
          lastError: '',
          lastSuccessAt: Date.now(),
          nextRetryAt: 0,
        });
        return result;
      } catch (error) {
        const errMessage = error && error.message ? error.message : String(error);

        if (attempt >= maxRetries) {
          setDbStatus('ERROR', {
            retries: attempt,
            lastError: `${label}: ${errMessage}`,
            lastErrorAt: Date.now(),
            nextRetryAt: 0,
          });
          throw error;
        }

        const jitter = Math.floor(Math.random() * 250);
        const waitMs = baseDelay * Math.pow(2, attempt) + jitter;
        const nextRetryAt = Date.now() + waitMs;

        setDbStatus('RETRY', {
          retries: attempt + 1,
          lastError: `${label}: ${errMessage}`,
          lastErrorAt: Date.now(),
          nextRetryAt,
        });

        await delay(waitMs);
      }

      attempt += 1;
    }

    throw new Error('Retry policy failed unexpectedly');
  };

  if (!R._firebaseReadRaw) {
    R._firebaseReadRaw = R.firebaseRead;
  }
  if (!R._firebaseWriteRaw) {
    R._firebaseWriteRaw = R.firebaseWrite;
  }

  R.firebaseRead = async function firebaseReadWithRetry(path) {
    return R.withDbRetry(`read:${path}`, () => R._firebaseReadRaw(path), {
      maxRetries: 2,
      baseDelayMs: 450,
    });
  };

  R.firebaseWrite = async function firebaseWriteWithRetry(path, data, method) {
    return R.withDbRetry(`write:${path}`, () => R._firebaseWriteRaw(path, data, method), {
      maxRetries: 3,
      baseDelayMs: 600,
    });
  };

  const bootBadge = () => {
    ensureBadge();
    renderBadge();
  };

  if (document.body || document.documentElement) {
    bootBadge();
  } else {
    window.addEventListener('DOMContentLoaded', bootBadge, { once: true });
  }
})();
