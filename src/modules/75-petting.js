(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R) return;

  const STYLE_ID_WIDGET = '__ts_petting_styles_widget__';
  const PET_PARTICLES = [
    { content: '❤️', type: 'heart' },
    { content: '✨', type: 'spark' },
    { content: '🎵', type: 'music' },
  ];
  const PETTING_SOUND_URL = 'https://www.myinstants.com/media/sounds/cartoonslip.mp3';
  const PETTING_PERSIST_DEBOUNCE_MS = 850;
  let pettingPersistTimer = null;
  let pettingAudio = null;

  function ensureStyles() {
    const widgetRoot = R.getWidgetRoot ? R.getWidgetRoot() : null;
    if (widgetRoot && !widgetRoot.getElementById(STYLE_ID_WIDGET)) {
      const widgetStyle = document.createElement('style');
      widgetStyle.id = STYLE_ID_WIDGET;
      widgetStyle.textContent = `
      #__ts_zelek__ { position: relative; }
      #__ts_body_svg__, #__ts_body_svg__ .__ts_slime_svg__ { cursor: pointer; }
      #__ts_body_svg__.__ts_petting_pop__ .__ts_slime_svg__ { animation: __tsPetHop .3s cubic-bezier(.2,.8,.2,1); }
      #__ts_body_svg__.__ts_petting_pop__ .__ts_slime_stage { animation: __tsPetTilt .3s cubic-bezier(.2,.8,.2,1); }
      @keyframes __tsPetPop {
        0% { transform: scale(1); }
        50% { transform: scale(1.08); }
        100% { transform: scale(1); }
      }
      @keyframes __tsPetHop {
        0% { transform: translateY(0) scaleX(1) scaleY(1); }
        35% { transform: translateY(-8px) scaleX(1.04) scaleY(0.96); }
        65% { transform: translateY(-2px) scaleX(0.97) scaleY(1.03); }
        100% { transform: translateY(0) scaleX(1) scaleY(1); }
      }
      @keyframes __tsPetTilt {
        0% { transform: rotate(0deg); }
        30% { transform: rotate(-3deg); }
        70% { transform: rotate(2deg); }
        100% { transform: rotate(0deg); }
      }
    `;
      widgetRoot.appendChild(widgetStyle);
    }

  }

  function playPettingAnimation(targetEl) {
    if (!targetEl) return;
    targetEl.classList.remove('__ts_petting_pop__');
    void targetEl.offsetWidth;
    targetEl.classList.add('__ts_petting_pop__');
  }

  function schedulePersistState() {
    if (pettingPersistTimer) clearTimeout(pettingPersistTimer);
    pettingPersistTimer = setTimeout(() => {
      pettingPersistTimer = null;
      if (typeof R.persistState === 'function') R.persistState();
    }, PETTING_PERSIST_DEBOUNCE_MS);
  }

  function playPettingSound() {
    try {
      if (!pettingAudio) {
        pettingAudio = new Audio(PETTING_SOUND_URL);
        pettingAudio.preload = 'auto';
        pettingAudio.volume = 0.2;
      }
      const snd = pettingAudio.cloneNode ? pettingAudio.cloneNode() : new Audio(PETTING_SOUND_URL);
      snd.volume = 0.2;
      const playPromise = snd.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    } catch (_) {}
  }

  function spawnPetParticles(evt, targetEl) {
    if (!R.spawnParticle) return;
    const rect = targetEl && targetEl.getBoundingClientRect ? targetEl.getBoundingClientRect() : null;
    const pointX = evt && Number.isFinite(evt.clientX) ? evt.clientX : (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
    const pointY = evt && Number.isFinite(evt.clientY) ? evt.clientY : (rect ? rect.top + 14 : window.innerHeight / 2);
    const widget = R.getElById ? R.getElById('__tamaskrypt_widget__') : document.getElementById('__tamaskrypt_widget__');
    const widgetRect = widget && widget.getBoundingClientRect ? widget.getBoundingClientRect() : { left: 0, top: 0 };
    const x = pointX - widgetRect.left;
    const y = pointY - widgetRect.top;
    const randomParticle = PET_PARTICLES[Math.floor(Math.random() * PET_PARTICLES.length)] || PET_PARTICLES[0];
    const centerX = rect ? (rect.left + rect.width / 2) : pointX;
    const centerY = rect ? (rect.top + rect.height / 2) : pointY;
    let dx = pointX - centerX;
    let dy = pointY - centerY;
    let magnitude = Math.hypot(dx, dy);
    if (magnitude < 0.001) {
      const angle = Math.random() * Math.PI * 2;
      dx = Math.cos(angle);
      dy = Math.sin(angle);
      magnitude = 1;
    }
    const nx = dx / magnitude;
    const ny = dy / magnitude;
    const px = -ny;
    const py = nx;

    const primaryOutward = 16 + (Math.random() * 16);
    const primaryLateral = (Math.random() * 16) - 8;
    const xpOutward = 10 + (Math.random() * 12);
    const xpLateral = (Math.random() * 14) - 7;
    const bonusOutward = 22 + (Math.random() * 16);
    const bonusLateral = (Math.random() * 20) - 10;

    const primaryXOffset = (nx * primaryOutward) + (px * primaryLateral);
    const primaryYOffset = (ny * primaryOutward) + (py * primaryLateral) - (10 + (Math.random() * 8));
    const xpXOffset = (nx * xpOutward) - (px * xpLateral);
    const xpYOffset = (ny * xpOutward) - (py * xpLateral) - (16 + (Math.random() * 10));
    const bonusXOffset = (nx * bonusOutward) + (px * bonusLateral);
    const bonusYOffset = (ny * bonusOutward) + (py * bonusLateral) - (18 + (Math.random() * 12));

    R.spawnParticle(x + primaryXOffset, y + primaryYOffset, randomParticle.content, randomParticle.type);
    R.spawnParticle(x + xpXOffset, y + xpYOffset, '+1 XP', 'xp');
    if (Math.random() > 0.35) {
      const extraParticle = PET_PARTICLES[Math.floor(Math.random() * PET_PARTICLES.length)] || PET_PARTICLES[0];
      R.spawnParticle(x + bonusXOffset, y + bonusYOffset, extraParticle.content, extraParticle.type);
    }
  }

  R.handlePetting = function handlePetting(evt) {
    if (!R.state || !R.state.alive) return;

    const petEl = evt && evt.currentTarget ? evt.currentTarget : (R.getElById ? R.getElById('__ts_zelek__') : document.getElementById('__ts_zelek__'));
    spawnPetParticles(evt, petEl);
    playPettingSound();

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

    const petBody = R.getElById ? R.getElById('__ts_body_svg__') : document.getElementById('__ts_body_svg__');
    playPettingAnimation(petBody || petEl);

    schedulePersistState();
    if (typeof R.updateUI === 'function') R.updateUI();
  };

  R.bindPettingEvents = function bindPettingEvents() {
    ensureStyles();
    const petEl = R.getElById ? R.getElById('__ts_zelek__') : document.getElementById('__ts_zelek__');
    const petBody = R.getElById ? R.getElById('__ts_body_svg__') : document.getElementById('__ts_body_svg__');
    const root = R.getWidgetRoot ? R.getWidgetRoot() : null;
    const slimeSvg = root && typeof root.querySelector === 'function'
      ? root.querySelector('#__ts_body_svg__ .__ts_slime_svg__')
      : document.querySelector('#__ts_body_svg__ .__ts_slime_svg__');
    const interactEl = slimeSvg || petBody;

    if (!petEl || !interactEl || interactEl.dataset.tsPettingBound === '1') return;

    interactEl.dataset.tsPettingBound = '1';
    interactEl.addEventListener('click', (evt) => {
      R.handlePetting(evt);
    });
    interactEl.addEventListener('touchstart', (evt) => {
      const touch = evt.touches && evt.touches[0] ? evt.touches[0] : null;
      const syntheticEvt = touch
        ? { currentTarget: interactEl, clientX: touch.clientX, clientY: touch.clientY }
        : { currentTarget: interactEl };
      R.handlePetting(syntheticEvt);
    }, { passive: true });
  };
})();