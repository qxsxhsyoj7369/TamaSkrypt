(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R) return;

  const STYLE_ID_WIDGET = '__ts_petting_styles_widget__';
  const STYLE_ID_GLOBAL = '__ts_petting_styles_global__';

  function ensureStyles() {
    const widgetRoot = R.getWidgetRoot ? R.getWidgetRoot() : null;
    if (widgetRoot && !widgetRoot.getElementById(STYLE_ID_WIDGET)) {
      const widgetStyle = document.createElement('style');
      widgetStyle.id = STYLE_ID_WIDGET;
      widgetStyle.textContent = `
      #__ts_zelek__ { cursor: pointer; position: relative; }
      #__ts_zelek__.__ts_petting_pop__ { animation: __tsPetPop .22s ease; }
      @keyframes __tsPetPop {
        0% { transform: scale(1); }
        50% { transform: scale(1.08); }
        100% { transform: scale(1); }
      }
    `;
      widgetRoot.appendChild(widgetStyle);
    }

    if (document.getElementById(STYLE_ID_GLOBAL)) return;
    const globalStyle = document.createElement('style');
    globalStyle.id = STYLE_ID_GLOBAL;
    globalStyle.textContent = `
      .__ts_petting_fx__ {
        position: fixed;
        z-index: 2147483647;
        font: 700 11px/1 'Segoe UI', Arial, sans-serif;
        color: #6b46c1;
        pointer-events: none;
        animation: __tsPetFloat .8s ease-out forwards;
        text-shadow: 0 1px 2px rgba(255,255,255,.75);
      }
      @keyframes __tsPetFloat {
        0% { opacity: 0; transform: translate(-50%, 0) scale(.85); }
        15% { opacity: 1; transform: translate(-50%, -3px) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -28px) scale(1.05); }
      }
    `;
    (document.head || document.documentElement).appendChild(globalStyle);
  }

  function playPettingAnimation(targetEl) {
    if (!targetEl) return;
    targetEl.classList.remove('__ts_petting_pop__');
    void targetEl.offsetWidth;
    targetEl.classList.add('__ts_petting_pop__');
  }

  function showPettingFx(x, y) {
    const fx = document.createElement('div');
    fx.className = '__ts_petting_fx__';
    fx.textContent = '🤲 +1XP +0.1HP';
    fx.style.left = `${Math.round(x)}px`;
    fx.style.top = `${Math.round(y)}px`;
    (document.body || document.documentElement).appendChild(fx);
    setTimeout(() => {
      if (fx.parentNode) fx.remove();
    }, 900);
  }

  R.handlePetting = function handlePetting(evt) {
    if (!R.state || !R.state.alive) return;

    const previousHp = Number(R.state.hp) || 0;
    const increasedHp = Math.round((previousHp + 0.1) * 10) / 10;
    const hpMax = R.getEffectiveHpMax ? R.getEffectiveHpMax() : R.CONFIG.HP_MAX;
    R.state.hp = R.clamp(increasedHp, 0, hpMax);

    if (typeof R.gainXP === 'function') {
      R.gainXP(1);
    } else {
      R.state.xp = (Number(R.state.xp) || 0) + 1;
    }

    if (R.incrementHourlyGoalProgress) {
      R.incrementHourlyGoalProgress('pet', 1);
    }

    const rect = evt && evt.currentTarget && evt.currentTarget.getBoundingClientRect
      ? evt.currentTarget.getBoundingClientRect()
      : null;
    const pointX = evt && Number.isFinite(evt.clientX) ? evt.clientX : (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
    const pointY = evt && Number.isFinite(evt.clientY) ? evt.clientY : (rect ? rect.top + 10 : window.innerHeight / 2);

    const petRoot = R.getElById ? R.getElById('__ts_zelek__') : document.getElementById('__ts_zelek__');
    playPettingAnimation(petRoot);
    showPettingFx(pointX, pointY);

    if (typeof R.persistState === 'function') R.persistState();
    if (typeof R.updateUI === 'function') R.updateUI();
  };

  R.bindPettingEvents = function bindPettingEvents() {
    ensureStyles();
    const petEl = R.getElById ? R.getElById('__ts_zelek__') : document.getElementById('__ts_zelek__');
    if (!petEl || petEl.dataset.tsPettingBound === '1') return;

    petEl.dataset.tsPettingBound = '1';
    petEl.addEventListener('click', (evt) => {
      R.handlePetting(evt);
    });
    petEl.addEventListener('touchstart', (evt) => {
      const touch = evt.touches && evt.touches[0] ? evt.touches[0] : null;
      const syntheticEvt = touch
        ? { currentTarget: petEl, clientX: touch.clientX, clientY: touch.clientY }
        : { currentTarget: petEl };
      R.handlePetting(syntheticEvt);
    }, { passive: true });
  };
})();