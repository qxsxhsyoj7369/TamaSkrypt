(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R) return;

  R.getLauncherDiagnostics = function getLauncherDiagnostics() {
    const info = window.__TS_LAUNCHER_DIAGNOSTICS__ || {};
    return {
      mode: info.mode || 'unknown',
      manifestVersion: info.manifestVersion || 'n/a',
      source: info.source || 'unknown',
    };
  };

  R.getWidgetRoot = function getWidgetRoot() {
    if (R.widgetShadowRoot) return R.widgetShadowRoot;
    if (R.widgetEl && R.widgetEl.shadowRoot) return R.widgetEl.shadowRoot;
    return null;
  };

  R.getElById = function getElById(id) {
    const root = R.getWidgetRoot ? R.getWidgetRoot() : null;
    if (root && typeof root.getElementById === 'function') {
      const node = root.getElementById(id);
      if (node) return node;
    }
    return document.getElementById(id);
  };

  R.queryAllInWidget = function queryAllInWidget(selector) {
    const root = R.getWidgetRoot ? R.getWidgetRoot() : null;
    if (root && typeof root.querySelectorAll === 'function') {
      return root.querySelectorAll(selector);
    }
    return document.querySelectorAll(selector);
  };

  R.getGoalBarClass = function getGoalBarClass(goalId) {
    if (goalId === 'feed') return '__ts_goal_bar_feed__';
    if (goalId === 'online') return '__ts_goal_bar_online__';
    if (goalId === 'pet') return '__ts_goal_bar_pet__';
    if (goalId === 'gain_xp') return '__ts_goal_bar_xp__';
    if (goalId === 'keep_hp') return '__ts_goal_bar_hp__';
    if (goalId === 'keep_hunger') return '__ts_goal_bar_hunger__';
    if (goalId === 'eat_specific_food') return '__ts_goal_bar_feed__';
    if (goalId === 'survive_time') return '__ts_goal_bar_survive__';
    return '__ts_goal_bar_default__';
  };

  R.getGoalRarityClass = function getGoalRarityClass(rarity) {
    if (rarity === 'uncommon') return '__ts_goal_badge_uncommon__';
    if (rarity === 'rare') return '__ts_goal_badge_rare__';
    if (rarity === 'epic') return '__ts_goal_badge_epic__';
    return '__ts_goal_badge_common__';
  };

  R.renderEvolutionSummary = function renderEvolutionSummary() {
    const evolution = R.getCurrentEvolution ? R.getCurrentEvolution() : null;
    const level = Math.max(1, Number(R.state && R.state.level) || 1);
    const bonuses = R.getEvolutionBonuses && R.state ? R.getEvolutionBonuses(level, R.state.profileFaction) : null;
    if (!evolution || !bonuses) return '<span>Forma: podstawowa</span>';

    const factionId = (R.normalizeFactionId && R.state)
      ? R.normalizeFactionId(R.state.profileFaction)
      : String((R.state && R.state.profileFaction) || 'neutral').toLowerCase();
    const accentMap = {
      neon: '#ff00ff',
      toxic: '#00ff00',
      plasma: '#00ffff',
      neutral: 'rgba(255,255,255,.5)',
    };

    const hpBonus = Math.round(bonuses.hpMax || 0);
    const regenBonusPct = Math.round(((bonuses.regenMultiplier || 1) - 1) * 100);
    const foodBonusPct = Math.round(((bonuses.foodXpMultiplier || 1) - 1) * 100);
    const drainReductionPct = Math.round((1 - (bonuses.hungerDrainMultiplier || 1)) * 100);

    const perkParts = [];
    if (hpBonus > 0) perkParts.push(`+${hpBonus} HP`);
    if (regenBonusPct > 0) perkParts.push(`+${regenBonusPct}% Regen`);
    if (foodBonusPct > 0) perkParts.push(`+${foodBonusPct}% XP jedzenia`);
    if (drainReductionPct > 0) perkParts.push(`-${drainReductionPct}% głodu`);

    const hasPerks = level >= 10 && perkParts.length > 0;
    const accentColor = accentMap[factionId] || accentMap.neutral;

    return `
      <div class="__ts_class_badge__" style="--ts-class-accent:${accentColor}">
        <span class="__ts_class_icon__" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 4C11 6 13 10 17 12C13 14 11 18 7 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M17 4C13 6 11 10 7 12C11 14 13 18 17 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="8.2" cy="8" r="1.25" fill="currentColor"/>
            <circle cx="15.8" cy="16" r="1.25" fill="currentColor"/>
          </svg>
        </span>
        <div class="__ts_class_text__">
          <span class="__ts_class_name__">Klasa: ${evolution.name}</span>
          ${hasPerks ? `<span class="__ts_class_perks__">${perkParts.join(' • ')}</span>` : ''}
        </div>
      </div>
    `;
  };

  R.renderActiveSkillCard = function renderActiveSkillCard() {
    return `
      <div id="__ts_skill_card__" class="__ts_skill_card__">
        <div id="__ts_skill_title__" class="__ts_skill_title__"><span class="__ts_skill_icon__">✨</span>Umiejętność formy</div>
        <div id="__ts_skill_desc__" class="__ts_skill_desc__">Brak aktywnej umiejętności.</div>
        <div id="__ts_skill_meta__" class="__ts_skill_meta__">—</div>
        <button id="__ts_active_skill_btn__" type="button" class="__ts_btn__ __ts_skill_btn__" disabled>
          <span class="__ts_skill_btn_icon__">✨</span>
          <span class="__ts_skill_btn_label__">Brak</span>
        </button>
      </div>
    `;
  };

  R.setActiveSkillButtonContent = function setActiveSkillButtonContent(buttonEl, icon, label) {
    if (!buttonEl) return;
    buttonEl.innerHTML = `<span class="__ts_skill_btn_icon__">${icon || '✨'}</span><span class="__ts_skill_btn_label__">${label || 'Brak'}</span>`;
    buttonEl.setAttribute('aria-label', String(label || 'Brak'));
  };

  R.refreshActiveSkillUI = function refreshActiveSkillUI() {
    const card = R.getElById('__ts_skill_card__');
    const titleEl = R.getElById('__ts_skill_title__');
    const descEl = R.getElById('__ts_skill_desc__');
    const metaEl = R.getElById('__ts_skill_meta__');
    const buttonEl = R.getElById('__ts_active_skill_btn__');
    if (!card || !titleEl || !descEl || !metaEl || !buttonEl) return;

    const skill = R.getCurrentActiveSkill ? R.getCurrentActiveSkill() : null;
    if (!skill) {
      titleEl.innerHTML = '<span class="__ts_skill_icon__">✨</span>Umiejętność formy';
      descEl.textContent = 'Brak aktywnej umiejętności dla tej formy.';
      metaEl.textContent = 'Odblokuj wyższą formę Gelka.';
      if (R.setActiveSkillButtonContent) R.setActiveSkillButtonContent(buttonEl, '✨', 'Brak');
      buttonEl.disabled = true;
      card.classList.remove('__ts_skill_spark__');
      buttonEl.classList.remove('__ts_skill_cooling__');
      buttonEl.style.removeProperty('--ts-energy-ratio');
      buttonEl.classList.remove('__ts_skill_ready__');
      return;
    }

    if (skill.id === 'spark-xp') {
      titleEl.innerHTML = '<span class="__ts_neon_bolt__">⚡</span>Iskrzący Zgryz';
    } else {
      titleEl.innerHTML = `<span class="__ts_skill_icon__">${skill.emoji || '✨'}</span>${skill.name}`;
    }
    descEl.textContent = skill.description || 'Aktywna umiejętność formy.';
    card.classList.toggle('__ts_skill_spark__', skill.id === 'spark-xp');

    const cooldownRemaining = R.getActiveSkillCooldownRemaining ? R.getActiveSkillCooldownRemaining(skill) : 0;
    const effectRemaining = R.getActiveSkillEffectRemaining ? R.getActiveSkillEffectRemaining(skill) : 0;
    const alive = R.state ? R.state.alive !== false : true;
    const cooldownTotal = Math.max(1, Number(skill.cooldownMs) || 1);
    const energyRatio = cooldownRemaining > 0
      ? (1 - (cooldownRemaining / cooldownTotal))
      : 1;
    const ratio = R.clamp(energyRatio, 0, 1);
    const energyHue = Math.round(282 + ((48 - 282) * ratio));
    const energyHue2 = Math.max(36, energyHue - 14);
    buttonEl.style.setProperty('--ts-energy-ratio', String(ratio));
    buttonEl.style.setProperty('--ts-energy-start', `hsl(${energyHue} 86% 60%)`);
    buttonEl.style.setProperty('--ts-energy-end', `hsl(${energyHue2} 92% 62%)`);
    buttonEl.style.setProperty('--ts-energy-glow', `hsl(${energyHue} 90% 62%)`);

    if (!alive) {
      metaEl.textContent = 'Umiejętność niedostępna gdy Gelek nie żyje.';
      if (R.setActiveSkillButtonContent) R.setActiveSkillButtonContent(buttonEl, '💀', 'Niedostępna');
      buttonEl.disabled = true;
      buttonEl.classList.remove('__ts_skill_cooling__');
      buttonEl.classList.remove('__ts_skill_ready__');
      return;
    }

    if (cooldownRemaining > 0) {
      metaEl.textContent = effectRemaining > 0
        ? `Efekt aktywny: ${R.formatTime(effectRemaining)} • Cooldown: ${R.formatTime(cooldownRemaining)}`
        : `Cooldown: ${R.formatTime(cooldownRemaining)}`;
      if (R.setActiveSkillButtonContent) R.setActiveSkillButtonContent(buttonEl, '⏳', R.formatTime(cooldownRemaining));
      buttonEl.disabled = true;
      buttonEl.classList.add('__ts_skill_cooling__');
      buttonEl.classList.remove('__ts_skill_ready__');
      return;
    }

    metaEl.textContent = effectRemaining > 0
      ? `Efekt aktywny: ${R.formatTime(effectRemaining)} • Umiejętność gotowa`
      : 'Gotowe do użycia';
    if (R.setActiveSkillButtonContent) R.setActiveSkillButtonContent(buttonEl, skill.emoji || '✨', skill.id === 'seed-heal' ? 'Aktywuj regenerację' : 'Użyj umiejętności');
    buttonEl.disabled = false;
    buttonEl.classList.remove('__ts_skill_cooling__');
    buttonEl.classList.add('__ts_skill_ready__');
  };

  R.renderHourlyGoalRows = function renderHourlyGoalRows() {
    const quest = R.state && R.state.dailyQuest ? R.state.dailyQuest : null;
    const goals = quest && Array.isArray(quest.goals) ? quest.goals : [];
    if (!goals.length) {
      return '<div class="__ts_card__">Brak aktywnych celów godzinowych.</div>';
    }

    return goals.map((goal) => {
      const pct = R.getHourlyGoalPercent ? R.getHourlyGoalPercent(goal) : 0;
      const progressLabel = R.formatGoalProgress ? R.formatGoalProgress(goal) : '0/0';
      const barClass = R.getGoalBarClass(goal.id);
      const goalLabel = goal.displayLabel || goal.label || goal.id;
      const rarity = String(goal.rarity || 'common').toLowerCase();
      const rarityLabel = goal.rarityLabel || 'Pospolite';
      const rarityClass = R.getGoalRarityClass(rarity);
      return `
        <div class="__ts_goal_block__">
          <div class="__ts_stat_row__"><span class="__ts_label__">${goal.icon || '🎯'} ${goalLabel}</span><div class="__ts_bar_wrap__"><div class="__ts_bar__ ${barClass}" id="__ts_goal_bar_${goal.id}__" style="width:${R.clamp(pct,0,100)}%"></div></div><span class="__ts_val__" id="__ts_goal_val_${goal.id}__">${progressLabel}</span></div>
          <div class="__ts_goal_reward__"><span class="__ts_goal_badge__ ${rarityClass}">${rarityLabel}</span>Nagroda: +${goal.rewardCoins || 0} 🪙, +${goal.rewardXp || 0} XP</div>
        </div>
      `;
    }).join('');
  };

  R.buildZelekSVG = function buildZelekSVG() {
    const level = R.state && Number.isFinite(R.state.level) ? R.state.level : 1;
    const mood = R.getMood ? R.getMood() : null;
    const moodEmoji = mood && mood.emoji ? mood.emoji : '😐';
    const palettes = [
      {
        body: '#1abc9c',
        rim: '#16a085',
        mouth: '#14806d',
        tongue: '#91f0e2',
        glow: 'rgba(26,188,156,0.34)',
      },
      {
        body: '#2ecc71',
        rim: '#27ae60',
        mouth: '#1d7d48',
        tongue: '#acf1c8',
        glow: 'rgba(46,204,113,0.34)',
      },
      {
        body: '#3498db',
        rim: '#2980b9',
        mouth: '#21618c',
        tongue: '#abd8ff',
        glow: 'rgba(52,152,219,0.34)',
      },
      {
        body: '#9b59b6',
        rim: '#8e44ad',
        mouth: '#a862a6',
        tongue: '#e0b7e5',
        glow: 'rgba(155,89,182,0.34)',
      },
    ];
    const paletteIndex = level >= 15 ? 3 : level >= 10 ? 2 : level >= 5 ? 1 : 0;
    const palette = palettes[paletteIndex];
    let moodClass = '__ts_slime_mood_neutral__';
    let eyesMarkup = `
      <g class="__ts_slime_eye__ __ts_slime_eye_l__">
        <ellipse class="__ts_slime_eye_white__" cx="38" cy="70" rx="6.1" ry="6.4"/>
        <circle class="__ts_slime_eye_core__" cx="38.8" cy="70.6" r="2.5"/>
        <circle class="__ts_slime_eye_gloss__" cx="39.8" cy="69.3" r="0.9"/>
      </g>
      <g class="__ts_slime_eye__ __ts_slime_eye_r__">
        <ellipse class="__ts_slime_eye_white__" cx="89" cy="70" rx="6.1" ry="6.4"/>
        <circle class="__ts_slime_eye_core__" cx="89.8" cy="70.6" r="2.5"/>
        <circle class="__ts_slime_eye_gloss__" cx="90.8" cy="69.3" r="0.9"/>
      </g>
    `;
    let browsMarkup = '';
    let mouthMarkup = '<path class="__ts_slime_mouth_line__" d="M54 80 L76.8 80"/>';

    if (moodEmoji === '😄') {
      moodClass = '__ts_slime_mood_happy__';
      mouthMarkup = `
        <path class="__ts_slime_mouth_fill__" d="M49.8,77.5c0,3.4,2.1,6.2,5.1,8.1c3.6-2.1,7.6-3.2,10.9-3.2c3.3,0,7.2,1.1,10.8,3.2c3-1.9,5.1-4.7,5.1-8.1H65.8H49.8z"/>
        <path class="__ts_slime_tongue__" d="M53.2 84.5c6.9 3.4 13.8 3.4 20.7 0c-5.9-3.2-14.8-3.2-20.7 0z"/>
      `;
    } else if (moodEmoji === '😟') {
      moodClass = '__ts_slime_mood_hungry__';
      browsMarkup = `
        <path class="__ts_slime_brow__" d="M31.6 63.7c4.6-2.4 8.1-2.8 12.6-1.2"/>
        <path class="__ts_slime_brow__" d="M82.2 62.5c4.5-1.6 8-1.2 12.6 1.2"/>
      `;
      mouthMarkup = '<path class="__ts_slime_mouth_line__" d="M54.8 82.5c3.2-3 6.4-4.2 10.9-4.2c4.5 0 7.6 1.2 10.8 4.2"/>';
    } else if (moodEmoji === '😢') {
      moodClass = '__ts_slime_mood_sad__';
      browsMarkup = `
        <path class="__ts_slime_brow__" d="M32.2 63.3c4.2-2 7.8-2.6 12-1.1"/>
        <path class="__ts_slime_brow__" d="M82.9 62.2c4.1-1.5 7.8-0.9 12 1.1"/>
      `;
      eyesMarkup = `
        <g class="__ts_slime_eye__ __ts_slime_eye_l__">
          <path class="__ts_slime_eye_line__" d="M32.6 71.3c2.9 2.1 5.8 2.1 8.7 0"/>
        </g>
        <g class="__ts_slime_eye__ __ts_slime_eye_r__">
          <path class="__ts_slime_eye_line__" d="M83.6 71.3c2.9 2.1 5.8 2.1 8.7 0"/>
        </g>
        <path class="__ts_slime_tear__" d="M92.6 74.8c1.2 1.9 1.5 3.2 0 4.7c-1.4-1.5-1.2-2.8 0-4.7z"/>
      `;
      mouthMarkup = '<path class="__ts_slime_mouth_line__" d="M54.4 84.3c3.4-3.4 7-4.7 11.3-4.7c4.4 0 7.9 1.3 11.3 4.7"/>';
    } else if (moodEmoji === '💀') {
      moodClass = '__ts_slime_mood_dead__';
      eyesMarkup = `
        <g class="__ts_slime_eye__ __ts_slime_eye_l__">
          <path class="__ts_slime_dead_mark__" d="M33.8 66.5l7.8 7.8"/>
          <path class="__ts_slime_dead_mark__" d="M41.6 66.5l-7.8 7.8"/>
        </g>
        <g class="__ts_slime_eye__ __ts_slime_eye_r__">
          <path class="__ts_slime_dead_mark__" d="M84.8 66.5l7.8 7.8"/>
          <path class="__ts_slime_dead_mark__" d="M92.6 66.5l-7.8 7.8"/>
        </g>
      `;
      mouthMarkup = '<path class="__ts_slime_mouth_line__" d="M55.2 82.2h21.2"/>';
    }

    return `
      <div class="__ts_slime_stage__ ${moodClass}" aria-label="Gelek" style="--ts-slime-body:${palette.body};--ts-slime-rim:${palette.rim};--ts-slime-mouth:${palette.mouth};--ts-slime-tongue:${palette.tongue};--ts-slime-glow:${palette.glow};">
        <svg class="__ts_slime_svg__" viewBox="0 0 126.75 103.25" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g class="__ts_slime_body__">
            <path d="M126.153,71.798c0,35.275-30.128,31.452-65.403,31.452S0.411,107.073,0.411,71.798S34,0.927,63.282,0.927C92,0.927,126.153,36.523,126.153,71.798z"/>
          </g>
          <g class="__ts_slime_shadow__">
            <path d="M98.583,98.968c0,5.085-4.708,4.313-37.833,4.313c-29.563,0-32.769,0.771-32.769-4.313c0-8.718,18.86-10.218,35.301-10.218C79.407,88.75,98.583,91.125,98.583,98.968z"/>
          </g>
          <g class="__ts_slime_highlight__">
            <ellipse transform="matrix(0.5486 -0.8361 0.8361 0.5486 20.2905 77.5842)" cx="82" cy="20" rx="7.75" ry="13.75"/>
          </g>
          <g class="__ts_slime_eyes__">
            ${eyesMarkup}
          </g>
          <g class="__ts_slime_brows__">
            ${browsMarkup}
          </g>
          <g class="__ts_slime_mouth__">
            ${mouthMarkup}
          </g>
        </svg>
      </div>`;
  };

  R.spawnParticle = function spawnParticle(x, y, content, type) {
    const widgetEl = R.getElById ? R.getElById('__tamaskrypt_widget__') : document.getElementById('__tamaskrypt_widget__');
    if (!widgetEl) return;

    const safeX = Number.isFinite(x) ? x : 0;
    const safeY = Number.isFinite(y) ? y : 0;

    const particle = document.createElement('span');
    const particleType = String(type || 'default').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
    particle.className = `__ts_particle__ __ts_particle_${particleType || 'default'}__`;
    particle.textContent = content == null ? '✨' : String(content);

    const localX = safeX;
    const localY = safeY;
    particle.style.left = `${Math.round(localX)}px`;
    particle.style.top = `${Math.round(localY)}px`;

    widgetEl.appendChild(particle);
    const removeParticle = () => {
      if (particle.parentNode) particle.remove();
    };
    particle.addEventListener('animationend', removeParticle, { once: true });
    setTimeout(removeParticle, 2300);
  };

  R.applyWidgetStyles = function applyWidgetStyles() {
    const root = R.getWidgetRoot ? R.getWidgetRoot() : null;
    const styleHost = root || document.head || document.documentElement || document.body;
    if (!styleHost) return;
    if (styleHost.getElementById && styleHost.getElementById('__tamaskrypt_styles__')) return;
    if (!styleHost.getElementById && document.getElementById('__tamaskrypt_styles__')) return;

    const style = document.createElement('style');
    style.id = '__tamaskrypt_styles__';
    style.textContent = `
      :host {
        --ts-bg-panel: oklch(20% 0.05 280 / 0.8);
        --ts-accent: oklch(65% 0.25 310);
        --ts-accent-2: oklch(72% 0.18 292);
        --ts-violet-1: oklch(72% 0.18 292);
        --ts-neon-cyan: oklch(76% 0.13 232);
        --ts-neon-pink: oklch(73% 0.21 338);
        --ts-neon-lime: oklch(78% 0.2 154);
        --ts-text-main: oklch(95% 0.01 300);
        --ts-text-muted: oklch(82% 0.02 295);
        --ts-glass: oklch(99% 0.01 300 / 0.1);
        --ts-glass-edge: oklch(100% 0 0 / 0.24);
        --ts-shadow: 0 20px 50px oklch(5% 0.02 275 / 0.45);
        --ts-font: Inter, "Geist Sans", "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif;
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 2147483647;
        display: block;
      }

      #__tamaskrypt_widget__ {
        font-family: var(--ts-font);
        font-variation-settings: "wght" 510;
        font-size: 12px;
        user-select: none;
        color: var(--ts-text-main);
        position: relative;
        overflow: visible;
      }

      #__ts_header__ {
        background:
          linear-gradient(120deg, oklch(34% 0.09 288 / 0.86), oklch(24% 0.06 280 / 0.9)),
          radial-gradient(120% 130% at 15% 0%, oklch(65% 0.25 310 / 0.28), transparent 62%);
        color: var(--ts-text-main);
        padding: 9px 11px;
        border-radius: 18px 18px 0 0;
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 680;
        cursor: move;
        letter-spacing: -0.02em;
        border: 1px solid oklch(100% 0 0 / 0.2);
        border-bottom-color: oklch(100% 0 0 / 0.12);
        box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.32);
        transition: padding .22s ease, border-radius .22s ease, background .22s ease, box-shadow .22s ease, border-color .22s ease;
      }

      #__ts_body__ {
        min-width: 258px;
        padding: 10px 8px 10px 10px;
        border-radius: 0 0 18px 18px;
        display: grid;
        gap: 8px;
        position: relative;
        max-height: min(85vh, calc(100vh - 86px));
        overflow-y: auto;
        overflow-x: hidden;
        background:
          radial-gradient(115% 90% at 8% 6%, oklch(65% 0.25 310 / 0.23), transparent 62%),
          radial-gradient(120% 100% at 95% 16%, oklch(76% 0.13 232 / 0.15), transparent 66%),
          radial-gradient(130% 110% at 50% 105%, oklch(73% 0.21 338 / 0.13), transparent 70%),
          linear-gradient(150deg, var(--ts-bg-panel), oklch(18% 0.03 280 / 0.88));
        background-size: 170% 170%;
        border: 1px solid oklch(100% 0 0 / 0.16);
        backdrop-filter: blur(20px) saturate(1.28);
        box-shadow: var(--ts-shadow), inset 0 1px 0 oklch(100% 0 0 / 0.18);
        animation: __ts_panel_flow__ 26s ease-in-out infinite alternate;
      }

      #__ts_zelek__ {
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        min-width: 258px;
        padding: 8px 10px 6px;
        margin-top: -1px;
        border-left: 1px solid oklch(100% 0 0 / 0.16);
        border-right: 1px solid oklch(100% 0 0 / 0.16);
        background:
          radial-gradient(95% 58% at 50% -14%, oklch(72% 0.2 292 / 0.2), transparent 68%),
          linear-gradient(180deg, oklch(24% 0.06 286 / 0.56), oklch(19% 0.04 278 / 0.34));
        backdrop-filter: blur(14px) saturate(1.22);
        z-index: 3;
      }

      #__ts_zelek_floe_container__ {
        position: relative;
        width: 130px;
        height: 96px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }

      #__ts_zelek_shadow__ {
        position: absolute;
        left: 50%;
        bottom: 6px;
        width: 84px;
        height: 17px;
        transform: translateX(-50%);
        border-radius: 999px;
        background: radial-gradient(ellipse at center, rgba(4, 10, 18, 0.5) 0%, rgba(8, 14, 24, 0.32) 52%, rgba(8, 14, 24, 0) 100%);
        filter: blur(1.6px);
        opacity: 0.85;
        z-index: 1;
        animation: __ts_shadow_breathe__ 4.8s ease-in-out infinite;
      }

      #__ts_zelek_floe__ {
        position: absolute;
        left: 50%;
        bottom: 10px;
        width: 102px;
        height: 24px;
        transform: translateX(-50%);
        border-radius: 999px;
        border: 1px solid oklch(100% 0 0 / 0.34);
        background:
          radial-gradient(120% 130% at 50% 0%, oklch(100% 0 0 / 0.55), oklch(92% 0.03 232 / 0.2) 45%, transparent 85%),
          linear-gradient(180deg, oklch(98% 0.02 242 / 0.38), oklch(90% 0.02 232 / 0.16));
        box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.42), 0 8px 22px oklch(5% 0.01 250 / 0.22);
        z-index: 2;
      }

      #__ts_body__,
      #__ts_panel_shop__,
      #__ts_panel_inventory__,
      #__ts_panel_ranking__ {
        scrollbar-width: thin;
        scrollbar-color: transparent transparent;
        scrollbar-gutter: stable;
        overscroll-behavior: contain;
        -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%);
        mask-image: linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%);
        -webkit-mask-size: 100% 100%;
        mask-size: 100% 100%;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
      }

      #__ts_body__:hover,
      #__ts_body__:focus-within,
      #__ts_panel_shop__:hover,
      #__ts_panel_shop__:focus-within,
      #__ts_panel_inventory__:hover,
      #__ts_panel_inventory__:focus-within,
      #__ts_panel_ranking__:hover,
      #__ts_panel_ranking__:focus-within {
        scrollbar-color: oklch(92% 0.01 300 / 0.46) transparent;
      }

      #__ts_body__::-webkit-scrollbar,
      #__ts_panel_shop__::-webkit-scrollbar,
      #__ts_panel_inventory__::-webkit-scrollbar,
      #__ts_panel_ranking__::-webkit-scrollbar {
        width: 8px;
      }
      #__ts_body__::-webkit-scrollbar-track,
      #__ts_panel_shop__::-webkit-scrollbar-track,
      #__ts_panel_inventory__::-webkit-scrollbar-track,
      #__ts_panel_ranking__::-webkit-scrollbar-track {
        background: transparent;
      }
      #__ts_body__::-webkit-scrollbar-thumb,
      #__ts_panel_shop__::-webkit-scrollbar-thumb,
      #__ts_panel_inventory__::-webkit-scrollbar-thumb,
      #__ts_panel_ranking__::-webkit-scrollbar-thumb {
        background: oklch(100% 0 0 / 0);
        border: 2px solid transparent;
        border-radius: 999px;
        background-clip: padding-box;
        transition: background-color .22s ease;
      }

      #__ts_body__:hover::-webkit-scrollbar-thumb,
      #__ts_body__:focus-within::-webkit-scrollbar-thumb,
      #__ts_panel_shop__:hover::-webkit-scrollbar-thumb,
      #__ts_panel_shop__:focus-within::-webkit-scrollbar-thumb,
      #__ts_panel_inventory__:hover::-webkit-scrollbar-thumb,
      #__ts_panel_inventory__:focus-within::-webkit-scrollbar-thumb,
      #__ts_panel_ranking__:hover::-webkit-scrollbar-thumb,
      #__ts_panel_ranking__:focus-within::-webkit-scrollbar-thumb {
        background: oklch(92% 0.01 300 / 0.46);
      }
      #__ts_body__::-webkit-scrollbar-thumb:hover,
      #__ts_panel_shop__::-webkit-scrollbar-thumb:hover,
      #__ts_panel_inventory__::-webkit-scrollbar-thumb:hover,
      #__ts_panel_ranking__::-webkit-scrollbar-thumb:hover {
        background: oklch(96% 0.01 300 / 0.66);
      }
      @keyframes __ts_panel_flow__ {
        0% { background-position: 0% 10%, 100% 25%, 42% 100%, 50% 50%; }
        50% { background-position: 52% 22%, 68% 80%, 38% 20%, 50% 50%; }
        100% { background-position: 100% 40%, 0% 0%, 60% 75%, 50% 50%; }
      }

      #__ts_toggle__ {
        cursor: pointer;
        font-size: 11px;
        font-weight: 800;
        line-height: 1;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: oklch(98% 0.01 300);
        border: 1px solid oklch(100% 0 0 / 0.45);
        background: var(--ts-toggle-bg, oklch(100% 0 0 / 0.1));
        box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.32), 0 0 0 0 var(--ts-toggle-glow, rgba(255,255,255,0.25));
        animation: __ts_toggle_pulse__ 2.6s ease-in-out infinite;
      }
      #__ts_toggle__.__ts_toggle_faction_neon__ { --ts-toggle-bg: rgba(255, 63, 191, 0.2); --ts-toggle-glow: rgba(255, 63, 191, 0.56); }
      #__ts_toggle__.__ts_toggle_faction_toxic__ { --ts-toggle-bg: rgba(141, 255, 79, 0.2); --ts-toggle-glow: rgba(141, 255, 79, 0.56); }
      #__ts_toggle__.__ts_toggle_faction_plasma__ { --ts-toggle-bg: rgba(55, 233, 255, 0.2); --ts-toggle-glow: rgba(55, 233, 255, 0.56); }
      #__ts_toggle__.__ts_toggle_faction_neutral__ { --ts-toggle-bg: oklch(100% 0 0 / 0.1); --ts-toggle-glow: rgba(210, 210, 235, 0.36); }
      @keyframes __ts_toggle_pulse__ {
        0%, 100% { box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.32), 0 0 0 0 var(--ts-toggle-glow, rgba(255,255,255,0.25)); }
        50% { box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.32), 0 0 10px 1px var(--ts-toggle-glow, rgba(255,255,255,0.25)); }
      }

      #__tamaskrypt_widget__.__ts_minimized__ #__ts_header__ {
        padding: 6px 10px;
        border-radius: 16px;
        background: transparent;
        border-color: transparent;
        box-shadow: none;
      }
      #__tamaskrypt_widget__.__ts_minimized__ #__ts_body__ {
        display: none;
      }
      #__tamaskrypt_widget__.__ts_minimized__ #__ts_zelek__ {
        min-width: 0;
        margin-top: 2px;
        padding: 2px 4px 0;
        border: none;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        backdrop-filter: none;
      }
      #__tamaskrypt_widget__.__ts_minimized__ #__ts_zelek_floe__ {
        opacity: 0.85;
      }
      #__tamaskrypt_widget__.__ts_minimized__ #__ts_zelek_shadow__ {
        opacity: 0.44;
      }

      .__ts_particle__ {
        position: absolute;
        pointer-events: none;
        z-index: 18;
        left: 0;
        top: 0;
        transform: translate(-50%, 0) scale(0.5);
        opacity: 0;
        font-size: 18px;
        line-height: 1;
        font-weight: 700;
        letter-spacing: -0.02em;
        text-shadow: 0 2px 8px oklch(4% 0.02 280 / 0.45), 0 0 14px oklch(100% 0 0 / 0.52);
        filter: saturate(1.2) brightness(1.08);
        animation: floatUp 2.15s cubic-bezier(.16,.72,.24,1) forwards;
        will-change: transform, opacity;
      }
      .__ts_particle_heart__ { color: oklch(82% 0.22 8); }
      .__ts_particle_spark__ { color: oklch(92% 0.08 90); }
      .__ts_particle_music__ { color: oklch(84% 0.13 238); }
      .__ts_particle_xp__ {
        color: oklch(85% 0.2 154);
        font-size: 13px;
        font-weight: 800;
        text-shadow: 0 1px 0 oklch(0% 0 0 / 0.55), 0 0 12px oklch(80% 0.2 154 / 0.58);
      }

      @keyframes floatUp {
        0% { opacity: 1; transform: translate(-50%, 0) scale(0.5); }
        24% { opacity: 1; transform: translate(-50%, -14px) scale(1.22); }
        72% { opacity: .82; transform: translate(-50%, -44px) scale(1.08); }
        100% { opacity: 0; transform: translate(-50%, -74px) scale(0.98); }
      }

      #__ts_body_svg__ {
        width: 108px;
        height: 86px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        position: relative;
        z-index: 3;
      }
      #__ts_body_svg__ .__ts_slime_stage__ {
        width: 92px;
        height: 76px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        filter: drop-shadow(0 15px 18px rgba(0,0,0,0.22)) drop-shadow(0 0 18px var(--ts-slime-glow));
        animation: __ts_slime_idle_tilt__ 8.8s ease-in-out infinite, __ts_slime_float__ 4.8s ease-in-out infinite;
      }
      #__ts_body_svg__ .__ts_slime_svg__ {
        width: 92px;
        height: auto;
        overflow: visible;
        transform-origin: 50% 100%;
        animation: __ts_slime_breathe__ 3s infinite ease-in-out;
      }
      #__ts_zelek__:hover #__ts_body_svg__ .__ts_slime_svg__ {
        animation: __ts_slime_squish__ 1s ease-in-out;
      }
      #__ts_zelek__:hover #__ts_zelek_shadow__ {
        animation-duration: 2.4s;
      }
      #__ts_body_svg__ .__ts_slime_body__ path {
        fill: var(--ts-slime-body);
        stroke: var(--ts-slime-rim);
        stroke-width: 1.75;
      }
      #__ts_body_svg__ .__ts_slime_shadow__ path {
        fill: rgba(8, 12, 22, 0.16);
      }
      #__ts_body_svg__ .__ts_slime_highlight__ ellipse {
        fill: #ffffff;
        opacity: 0.48;
        transform-origin: center;
        animation: __ts_slime_gloss_drift__ 6.5s ease-in-out infinite;
      }
      #__ts_body_svg__ .__ts_slime_eyes__ {
        transform-origin: 62.5px 72px;
      }
      #__ts_body_svg__ .__ts_slime_eye__ {
        transform-origin: center;
      }
      #__ts_body_svg__ .__ts_slime_eye_l__ {
        animation: __ts_slime_blink_base__ 4.2s infinite ease-in-out, __ts_slime_wink_left__ 17.5s infinite ease-in-out;
      }
      #__ts_body_svg__ .__ts_slime_eye_r__ {
        animation: __ts_slime_blink_base__ 4.2s infinite ease-in-out .14s, __ts_slime_wink_right__ 19.5s infinite ease-in-out;
      }
      #__ts_body_svg__ .__ts_slime_eye_white__ {
        fill: #eff8ff;
      }
      #__ts_body_svg__ .__ts_slime_eye_core__ {
        fill: #17202a;
      }
      #__ts_body_svg__ .__ts_slime_eye_gloss__ {
        fill: #ffffff;
      }
      #__ts_body_svg__ .__ts_slime_eye_line__,
      #__ts_body_svg__ .__ts_slime_brow__,
      #__ts_body_svg__ .__ts_slime_mouth_line__,
      #__ts_body_svg__ .__ts_slime_dead_mark__ {
        fill: none;
        stroke: #18212b;
        stroke-width: 2.2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      #__ts_body_svg__ .__ts_slime_brow__ {
        stroke-width: 1.9;
      }
      #__ts_body_svg__ .__ts_slime_tear__ {
        fill: rgba(220, 241, 255, 0.9);
        stroke: rgba(138, 192, 229, 0.8);
        stroke-width: 0.5;
      }
      #__ts_body_svg__ .__ts_slime_mouth_fill__ {
        fill: var(--ts-slime-mouth);
      }
      #__ts_body_svg__ .__ts_slime_tongue__ {
        fill: var(--ts-slime-tongue);
      }
      #__ts_body_svg__ .__ts_slime_stage.__ts_slime_mood_dead__ .__ts_slime_eyes__ {
        animation: none;
      }
      #__ts_body_svg__ .__ts_slime_stage.__ts_slime_mood_dead__ .__ts_slime_eye_l__,
      #__ts_body_svg__ .__ts_slime_stage.__ts_slime_mood_dead__ .__ts_slime_eye_r__ {
        animation: none;
      }
      #__ts_body_svg__ .__ts_slime_stage.__ts_slime_mood_dead__ .__ts_slime_svg__ {
        filter: saturate(0.6) brightness(0.92);
      }
      @keyframes __ts_slime_idle_tilt__ {
        0%, 100% { transform: rotate(-1deg) translateY(0); }
        50% { transform: rotate(1deg) translateY(-1px); }
      }
      @keyframes __ts_slime_float__ {
        0%, 100% { translate: 0 0; }
        50% { translate: 0 -5px; }
      }
      @keyframes __ts_shadow_breathe__ {
        0%, 100% { transform: translateX(-50%) scaleX(1); opacity: 0.86; }
        50% { transform: translateX(-50%) scaleX(0.84); opacity: 0.58; }
      }
      @keyframes __ts_slime_breathe__ {
        0% { transform-origin: 50% 100%; transform: scaleX(1) scaleY(1); }
        50% { transform-origin: 50% 100%; transform: scaleX(1.05) scaleY(0.95); }
        100% { transform-origin: 50% 100%; transform: scaleX(1) scaleY(1); }
      }
      @keyframes __ts_slime_squish__ {
        0% { transform-origin: 50% 100%; transform: scaleX(1) scaleY(1); }
        40% { transform-origin: 50% 100%; transform: scaleX(0.8) scaleY(1.2); }
        50% { transform-origin: 50% 100%; transform: scaleX(1.2) scaleY(0.8); }
        60% { transform-origin: 50% 100%; transform: scaleX(0.9) scaleY(1.1); }
        70% { transform-origin: 50% 100%; transform: scaleX(1.2) scaleY(0.8); }
        80% { transform-origin: 50% 100%; transform: scaleX(0.9) scaleY(1.1); }
        90% { transform-origin: 50% 100%; transform: scaleX(1.2) scaleY(0.8); }
        100% { transform-origin: 50% 100%; transform: scaleX(1) scaleY(1); }
      }
      @keyframes __ts_slime_blink_base__ {
        0% { transform: scaleY(1); }
        74% { transform: scaleY(1); }
        78% { transform: scaleY(0.14); }
        82% { transform: scaleY(1); }
        100% { transform: scaleY(1); }
      }
      @keyframes __ts_slime_wink_left__ {
        0%, 89%, 100% { transform: scaleY(1); }
        92% { transform: scaleY(0.22); }
        95% { transform: scaleY(1); }
      }
      @keyframes __ts_slime_wink_right__ {
        0%, 93%, 100% { transform: scaleY(1); }
        96% { transform: scaleY(0.22); }
        98% { transform: scaleY(1); }
      }
      @keyframes __ts_slime_gloss_drift__ {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.45; }
        50% { transform: translate(-0.8px, 0.6px) scale(1.04); opacity: 0.62; }
      }

      #__ts_levelup_inline__ {
        margin: 0;
        padding: 7px 8px;
        border-radius: 12px;
        text-align:center;
        font-size:11px;
        font-weight:700;
        color: oklch(92% 0.02 100);
        background: linear-gradient(135deg, oklch(61% 0.2 62 / 0.35), oklch(68% 0.13 95 / 0.28));
        border: 1px solid oklch(96% 0.04 100 / 0.38);
        box-shadow: 0 0 18px oklch(74% 0.15 85 / 0.28), inset 0 1px 0 oklch(100% 0 0 / 0.2);
        opacity:0;
        max-height:0;
        overflow:hidden;
        transform: translateY(-8px) scale(.98);
        transition: opacity .25s ease, transform .25s ease, max-height .25s ease;
      }
      #__ts_levelup_inline__.show { opacity:1; max-height:52px; transform:translateY(0) scale(1); }

      .__ts_stat_row__ {
        display:flex;
        align-items:center;
        gap:6px;
        margin:0;
        padding: 7px 8px;
        border-radius: 14px;
        background: var(--ts-glass);
        border: 1px solid var(--ts-glass-edge);
        box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.2);
      }
      .__ts_label__ { width:66px; font-size:10px; color: var(--ts-text-muted); }
      .__ts_val__ { width:54px; text-align:right; font-size:9px; color: oklch(88% 0.01 294); }

      .__ts_bar_wrap__ {
        flex:1;
        height:8px;
        border-radius:999px;
        background: linear-gradient(180deg, oklch(31% 0.03 282 / 0.88), oklch(23% 0.02 280 / 0.93));
        border: 1px solid oklch(100% 0 0 / 0.14);
        box-shadow: inset 0 0 0 1px oklch(100% 0 0 / 0.06), inset 0 2px 4px oklch(8% 0.02 280 / 0.5);
        overflow:hidden;
      }
      .__ts_bar__ {
        height:100%;
        border-radius:999px;
        transition: width .42s cubic-bezier(.2,.8,.2,1);
        position: relative;
      }
      .__ts_bar__::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, oklch(100% 0 0 / 0.48), transparent);
        opacity: .86;
      }
      .__ts_hp_bar__ { background: linear-gradient(90deg, oklch(72% 0.22 345), oklch(64% 0.22 18)); filter: drop-shadow(0 0 5px oklch(70% 0.21 344)); }
      .__ts_hunger_bar__ { background: linear-gradient(90deg, oklch(76% 0.14 232), oklch(69% 0.13 215)); filter: drop-shadow(0 0 5px oklch(74% 0.13 225)); }
      .__ts_xp_bar__ { background: linear-gradient(90deg, oklch(79% 0.21 154), oklch(67% 0.17 164)); filter: drop-shadow(0 0 6px oklch(74% 0.18 155)); }
      .__ts_goal_bar_default__ { background: linear-gradient(90deg, oklch(69% 0.04 275), oklch(60% 0.05 275)); }
      .__ts_goal_bar_feed__ { background: linear-gradient(90deg, oklch(82% 0.13 92), oklch(74% 0.16 72)); filter: drop-shadow(0 0 4px oklch(79% 0.14 82)); }
      .__ts_goal_bar_online__ { background: linear-gradient(90deg, oklch(76% 0.13 188), oklch(69% 0.14 223)); filter: drop-shadow(0 0 4px oklch(73% 0.12 212)); }
      .__ts_goal_bar_pet__ { background: linear-gradient(90deg, oklch(77% 0.19 342), oklch(69% 0.2 8)); filter: drop-shadow(0 0 4px oklch(72% 0.18 350)); }
      .__ts_goal_bar_xp__ { background: linear-gradient(90deg, oklch(76% 0.13 282), oklch(72% 0.12 238)); filter: drop-shadow(0 0 4px oklch(73% 0.12 260)); }
      .__ts_goal_bar_hp__ { background: linear-gradient(90deg, oklch(72% 0.21 350), oklch(66% 0.21 22)); filter: drop-shadow(0 0 4px oklch(69% 0.2 350)); }
      .__ts_goal_bar_hunger__ { background: linear-gradient(90deg, oklch(77% 0.16 229), oklch(72% 0.14 198)); filter: drop-shadow(0 0 4px oklch(75% 0.14 214)); }
      .__ts_goal_bar_survive__ { background: linear-gradient(90deg, oklch(79% 0.21 154), oklch(67% 0.17 164)); filter: drop-shadow(0 0 4px oklch(74% 0.17 154)); }

      #__ts_info {
        display:flex;
        justify-content:space-between;
        gap:8px;
        padding: 6px 8px;
        border-radius: 14px;
        background: var(--ts-glass);
        border: 1px solid rgba(255, 255, 255, 0.04);
        box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.12), 0 10px 30px rgba(0, 0, 0, 0.4);
        font-size:10px;
        color: var(--ts-text-muted);
      }
      #__ts_evolution_line__ {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        padding: 7px 8px;
        border-radius: 14px;
        background: var(--ts-glass);
        border: 1px solid rgba(255, 255, 255, 0.04);
        box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.12), 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      #__ts_territory_card__ {
        border-radius: 14px;
        background: var(--ts-glass);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: inset 0 1px 1px rgba(255,255,255,.12), 0 8px 22px rgba(0,0,0,.24);
        padding: 6px 8px;
      }
      #__ts_territory_toggle__ {
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        font-size: 10px;
        font-weight: 700;
      }
      #__ts_territory_title__ {
        color: var(--ts-violet-1);
      }
      #__ts_territory_domain__ {
        color: var(--ts-text-main);
        opacity: .92;
        font-size: 9px;
      }
      #__ts_territory_content__ {
        margin-top: 6px;
        display: none;
      }
      #__ts_territory_king__,
      #__ts_territory_status__ {
        font-size: 9px;
        margin-bottom: 4px;
        color: var(--ts-text-muted);
      }
      #__ts_territory_status__.__ts_status_ally__ { color: oklch(84% 0.13 154); }
      #__ts_territory_status__.__ts_status_enemy__ { color: oklch(83% 0.13 24); }
      #__ts_territory_actions__ { display: flex; justify-content: flex-end; }
      #__ts_territory_action_btn__ { min-width: 94px; }
      .__ts_class_badge__ {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 9px;
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255,255,255,.16);
        border-left: 2px solid var(--ts-class-accent, rgba(255,255,255,.52));
        box-shadow: inset 0 1px 0 rgba(255,255,255,.1), 0 8px 18px rgba(0,0,0,.28);
        backdrop-filter: blur(10px) saturate(1.12);
      }
      .__ts_class_icon__ {
        width: 16px;
        height: 16px;
        color: rgba(255,255,255,.95);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 0 6px rgba(255,255,255,.48));
        flex-shrink: 0;
      }
      .__ts_class_icon__ svg { width: 100%; height: 100%; }
      .__ts_class_text__ {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .__ts_class_name__ {
        font-size: 9px;
        font-weight: 800;
        line-height: 1.2;
        color: rgba(255,255,255,.96);
      }
      .__ts_class_perks__ {
        font-size: 9px;
        color: rgba(255,255,255,.72);
        line-height: 1.2;
      }
      .__ts_class_perks_muted__ {
        color: rgba(255,255,255,.58);
      }
      .__ts_evo_badge__,
      .__ts_evo_badge {
        display:inline-flex;
        align-items:center;
        gap:4px;
        padding:0;
        border-radius:0;
        font-size:9px;
        font-weight:800;
        background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(215,198,255,.9));
        -webkit-background-clip:text;
        background-clip:text;
        -webkit-text-fill-color:transparent;
        color: transparent;
        letter-spacing: .01em;
      }
      .__ts_evo_meta__,
      .__ts_evo_meta {
        font-size:9px;
        color: rgba(255,255,255,.6);
        text-align:right;
      }
      .__ts_faction_dot__ {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
        flex-shrink: 0;
      }
      .__ts_faction_dot_neon__ {
        background: #ff00ff;
        box-shadow: 0 0 7px #ff00ff, 0 0 14px rgba(255, 0, 255, .75);
      }
      .__ts_faction_dot_toxic__ {
        background: #00ff00;
        box-shadow: 0 0 7px #00ff00, 0 0 14px rgba(0, 255, 0, .75);
      }
      .__ts_faction_dot_plasma__ {
        background: #00ffff;
        box-shadow: 0 0 7px #00ffff, 0 0 14px rgba(0, 255, 255, .75);
      }

      .__ts_skill_card__,
      #__ts_hourly_box__,
      #__ts_panel_shop__,
      #__ts_panel_inventory__,
      #__ts_panel_ranking__,
      .__ts_goal_block__,
      .__ts_card__ {
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.04);
        background: var(--ts-glass);
        backdrop-filter: blur(20px) saturate(1.2);
        box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.12), 0 10px 30px rgba(0, 0, 0, 0.4);
      }

      .__ts_goal_block__ { padding: 7px 8px; margin-bottom: 6px; }
      .__ts_goal_reward__ { margin:0 0 2px 68px; font-size:9px; color: var(--ts-text-muted); }
      .__ts_goal_badge__ { display:inline-flex; align-items:center; padding:1px 7px; border-radius:999px; font-size:8px; font-weight:700; margin-right:5px; border:1px solid transparent; }
      .__ts_goal_badge_common__ { background:oklch(58% 0.03 278 / 0.34); color:oklch(93% 0.01 300); border-color:oklch(100% 0 0 / 0.2); }
      .__ts_goal_badge_uncommon__ { background:oklch(61% 0.11 154 / 0.34); color:oklch(95% 0.02 150); border-color:oklch(80% 0.15 154 / 0.5); }
      .__ts_goal_badge_rare__ { background:oklch(63% 0.12 242 / 0.34); color:oklch(95% 0.02 240); border-color:oklch(80% 0.15 230 / 0.5); }
      .__ts_goal_badge_epic__ { background:oklch(66% 0.18 306 / 0.32); color:oklch(96% 0.02 306); border-color:oklch(79% 0.2 306 / 0.56); }

      .__ts_skill_card__ { margin-top:8px; padding:8px; }
      .__ts_skill_card__.__ts_skill_spark__ {
        background:
          radial-gradient(120% 130% at 10% 0%, oklch(65% 0.25 310 / 0.34), transparent 60%),
          radial-gradient(90% 120% at 90% 100%, oklch(77% 0.15 82 / 0.24), transparent 60%),
          var(--ts-glass);
        box-shadow:
          0 0 0 1px oklch(100% 0 0 / 0.2),
          0 0 20px oklch(65% 0.25 310 / 0.34),
          0 0 26px oklch(77% 0.15 84 / 0.22),
          0 12px 24px oklch(8% 0.03 278 / 0.3);
      }
      #__ts_hourly_box__ { margin-top:8px; padding:8px; }
      #__ts_hourly_box__ > div:first-child { letter-spacing: -0.02em; color: oklch(95% 0.02 300) !important; }
      .__ts_skill_title__ {
        font-size:10px;
        font-weight:730;
        color: oklch(96% 0.01 300);
        margin-bottom:2px;
        letter-spacing: -0.02em;
      }
      .__ts_skill_desc__ { font-size:9px; color: var(--ts-text-muted); margin-bottom:3px; }
      .__ts_skill_meta__ { font-size:9px; color: oklch(84% 0.02 296); margin-bottom:6px; }
      .__ts_skill_icon__ { display:inline-flex; margin-right:4px; }
      .__ts_skill_btn_icon__ {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        font-size: 12px;
        flex-shrink: 0;
        filter: drop-shadow(0 0 8px rgba(255,255,255,.24));
      }
      .__ts_skill_btn_label__ {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 0;
        letter-spacing: -.01em;
      }
      .__ts_neon_bolt__ {
        display:inline-flex;
        margin-right:4px;
        color: oklch(82% 0.15 79);
        text-shadow: 0 0 6px oklch(82% 0.16 79), 0 0 13px oklch(70% 0.22 302);
        animation: __ts_neon_bolt__ 1.2s ease-in-out infinite;
      }
      @keyframes __ts_neon_bolt__ {
        0%, 100% { transform: translateY(0); text-shadow: 0 0 6px oklch(82% 0.16 79), 0 0 13px oklch(70% 0.22 302); }
        50% { transform: translateY(-1px); text-shadow: 0 0 8px oklch(84% 0.17 92), 0 0 16px oklch(69% 0.22 299); }
      }

      .__ts_btn__ {
        border: 1px solid oklch(100% 0 0 / 0.22);
        border-radius: 12px;
        padding: 6px 8px;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
        color: oklch(97% 0.01 300);
        background: linear-gradient(140deg, oklch(58% 0.19 299 / 0.72), oklch(50% 0.16 282 / 0.78));
        box-shadow: 0 0 12px oklch(65% 0.24 310 / 0.24), 0 8px 18px oklch(8% 0.03 280 / 0.35);
      }
      .__ts_skill_btn__ {
        width:100%;
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        position: relative;
        isolation: isolate;
        overflow: hidden;
        background:
          linear-gradient(180deg, oklch(37% 0.05 282 / 0.92), oklch(29% 0.04 278 / 0.96)) padding-box,
          linear-gradient(120deg, oklch(67% 0.14 286 / 0.9), oklch(82% 0.09 86 / 0.78), oklch(75% 0.1 228 / 0.76), oklch(67% 0.14 286 / 0.9)) border-box;
        background-size: 100% 100%, 220% 220%;
        animation: __ts_shiny_border__ 4s linear infinite;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 8px 20px oklch(8% 0.03 280 / 0.34);
      }
      .__ts_skill_btn__::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: -52%;
        width: 36%;
        background: linear-gradient(110deg, transparent, oklch(100% 0 0 / 0.45), transparent);
        transform: skewX(-24deg);
        animation: __ts_button_shine__ 2.8s ease-in-out infinite;
        pointer-events: none;
      }
      .__ts_skill_btn__.__ts_skill_ready__ {
        background:
          linear-gradient(180deg, oklch(62% 0.18 292 / 0.92), oklch(56% 0.18 312 / 0.92)) padding-box,
          linear-gradient(120deg, oklch(84% 0.08 84), oklch(72% 0.21 305), oklch(84% 0.08 84)) border-box;
        animation: __ts_skill_ready_pulse__ 1.6s ease-in-out infinite;
      }
      .__ts_skill_btn__.__ts_skill_cooling__ {
        background:
          linear-gradient(140deg, hsl(var(--ts-energy-start, 286 72% 58%) / 0.86), hsl(var(--ts-energy-end, 42 92% 62%) / 0.85)) padding-box,
          linear-gradient(120deg, hsl(var(--ts-energy-start, 286 72% 58%)), hsl(var(--ts-energy-end, 42 92% 62%)), hsl(var(--ts-energy-start, 286 72% 58%))) border-box;
        box-shadow: 0 0 12px hsl(var(--ts-energy-glow, 286 86% 64%) / 0.5), 0 8px 18px oklch(8% 0.03 280 / 0.35);
        animation: __ts_skill_cooling_pulse__ 1.1s ease-in-out infinite;
      }
      .__ts_btn__:disabled,
      .__ts_skill_btn__:disabled {
        opacity: .8;
        cursor: not-allowed;
      }
      @keyframes __ts_shiny_border__ {
        0% { background-position: 0% 50%, 0% 50%; }
        100% { background-position: 0% 50%, 200% 50%; }
      }
      @keyframes __ts_button_shine__ {
        0%, 22% { left: -52%; opacity: 0; }
        35% { opacity: 1; }
        68% { left: 122%; opacity: 0; }
        100% { left: 122%; opacity: 0; }
      }
      @keyframes __ts_skill_ready_pulse__ {
        0%,100% { box-shadow: 0 0 14px oklch(65% 0.25 310 / 0.38), 0 10px 22px oklch(8% 0.03 280 / 0.42); }
        50% { box-shadow: 0 0 18px oklch(80% 0.14 88 / 0.5), 0 12px 24px oklch(8% 0.03 280 / 0.48); }
      }
      @keyframes __ts_skill_cooling_pulse__ {
        0%,100% { transform: translateY(0); }
        50% { transform: translateY(-1px); }
      }

      #__ts_diag__ { margin-top:7px; display:flex; justify-content:flex-end; }
      #__ts_diag_badge { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:999px; font-size:9px; font-weight:700; background:var(--ts-glass); border:1px solid var(--ts-glass-edge); color: var(--ts-text-muted); }
      #__ts_msg__ { text-align:center; font-size:11px; color: oklch(88% 0.04 310); min-height:14px; font-weight:700; margin-top:2px; }

      #__ts_tabs__ {
        display:flex;
        gap:4px;
        margin-top:2px;
        padding: 4px;
        border-radius: 24px;
        background: rgba(0, 0, 0, 0.25);
      }
      #__ts_tabs__ > button {
        appearance: none;
        -webkit-appearance: none;
        background-color: transparent;
        flex:1;
        border:none;
        border-radius:20px;
        padding:8px 0;
        font-size:10px;
        font-weight:680;
        letter-spacing: -0.02em;
        cursor:pointer;
        color: rgba(255, 255, 255, 0.5);
        background: transparent;
        box-shadow: none;
        transition: all 0.3s ease;
      }
      #__ts_tabs__ > button:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      #__ts_tabs__ > button:active,
      #__ts_tabs__ > button.__ts_tab_active__ {
        color: #fff;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }

      #__ts_panel_shop__, #__ts_panel_inventory__, #__ts_panel_ranking__ {
        margin-top:6px;
        max-height: clamp(136px, 24vh, 206px);
        overflow-y:auto;
        overflow-x:hidden;
        padding: 7px 8px 10px 7px;
      }
      .__ts_card__ { padding:6px; margin-bottom:6px; font-size:10px; }
      .__ts_card__ h5 { margin:0 0 4px 0; font-size:11px; letter-spacing:-0.02em; }
      .ts_food_item { position: fixed; font-size: 28px; z-index: 2147483646; cursor: pointer; }
      #__ts_auth_modal__ { position:fixed; inset:0; background:rgba(0,0,0,0.72); z-index:2147483647; display:flex; align-items:center; justify-content:center; font-family:'Segoe UI',Arial,sans-serif; }
      #__ts_auth_card__ {
        background: linear-gradient(160deg, rgba(36, 24, 58, 0.95), rgba(23, 17, 40, 0.94));
        border: 1px solid rgba(255,255,255,0.16);
        border-radius:20px;
        padding:28px 24px 24px;
        width:min(560px, 94vw);
        box-shadow:0 20px 52px rgba(0,0,0,0.56), inset 0 1px 0 rgba(255,255,255,0.16);
        text-align:center;
        backdrop-filter: blur(12px) saturate(1.15);
      }
      #__ts_auth_tabs__ { display:flex; border-radius:10px; overflow:hidden; border:2px solid #764ba2; margin-bottom:18px; }
      #__ts_auth_tabs__ button { flex:1; padding:9px 0; border:none; background:transparent; font-size:13px; font-weight:bold; color:#b79cf1; cursor:pointer; }
      #__ts_auth_tabs__ button.active { background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; }
      .__ts_field__ { text-align:left; margin-bottom:12px; }
      .__ts_field__ input {
        width:100%;
        padding:10px 12px;
        border:1.5px solid rgba(255,255,255,0.2);
        border-radius:10px;
        font-size:14px;
        box-sizing:border-box;
        color:#f4ecff;
        background:rgba(255,255,255,0.06);
      }
      .__ts_field__ input::placeholder { color: rgba(237, 227, 255, 0.58); }
      .__ts_field__ input:focus {
        outline:none;
        border-color: rgba(184, 133, 255, 0.85);
        box-shadow: 0 0 0 3px rgba(155, 97, 255, 0.2);
      }
      #__ts_auth_err__ { color:#ff8b8b; font-size:12px; min-height:18px; margin-bottom:8px; font-weight:bold; }
      #__ts_auth_submit__ {
        width:100%;
        padding:12px;
        background:linear-gradient(135deg,#667eea,#764ba2);
        color:#fff;
        border:none;
        border-radius:12px;
        font-size:15px;
        font-weight:bold;
        cursor:pointer;
      }
      #__ts_faction_select_row__ {
        display: none;
        text-align: left;
        margin: 4px 0 12px;
      }
      #__ts_faction_select_row__ .__ts_faction_label__ {
        display:block;
        margin-bottom:10px;
        font-size:11px;
        font-weight:700;
        letter-spacing:.04em;
        color:rgba(255,255,255,0.74);
        text-transform:uppercase;
      }
      #__ts_faction_cards__ {
        display:flex;
        gap:15px;
      }
      #__ts_auth_faction__ {
        position:absolute;
        width:0;
        height:0;
        opacity:0;
        pointer-events:none;
      }
      .__ts_faction_card {
        position: relative;
        flex: 1;
        background: rgba(0, 0, 0, 0.4);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 20px 14px 14px;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        min-height: 158px;
        overflow: hidden;
        box-sizing: border-box;
      }
      .__ts_faction_card::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 18px;
        background: linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0));
        pointer-events: none;
      }
      .__ts_faction_radio__ {
        position:absolute;
        opacity:0;
        width:0;
        height:0;
        pointer-events:none;
      }
      .__ts_faction_card:hover {
        transform: translateY(-5px);
        border-color: rgba(255,255,255,0.24);
        background: rgba(0, 0, 0, 0.48);
      }
      .__ts_faction_title__ {
        margin-top: 10px;
        color:#fff;
        font-size:14px;
        font-weight:800;
        letter-spacing:.01em;
      }
      .__ts_faction_tagline__ {
        margin-top:5px;
        color:rgba(255,255,255,0.6);
        font-size:11px;
        line-height:1.35;
      }
      .__ts_faction_emblem__ {
        width: 58px;
        height: 58px;
        position: relative;
        margin: 0 auto;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius: 14px;
        transition: transform .34s ease, box-shadow .34s ease, filter .34s ease;
      }
      .__ts_faction_card:hover .__ts_faction_emblem__ {
        transform: translateY(-2px) scale(1.03);
      }

      .__ts_faction_card_neon__ .__ts_faction_title__ { text-shadow: 0 0 12px rgba(255, 0, 255, .45); }
      .__ts_faction_emblem_neon__ {
        background: radial-gradient(circle at 30% 20%, rgba(255,0,255,.2), rgba(0,0,0,.12) 75%);
        box-shadow: 0 0 18px rgba(255,0,255,.45);
      }
      .__ts_faction_emblem_neon__::before,
      .__ts_faction_emblem_neon__::after {
        content: '';
        position: absolute;
        width: 34px;
        height: 34px;
        background: conic-gradient(from 220deg, #ff5cff, #ff00ff 42%, #b200ff 72%, #ff5cff);
        clip-path: polygon(48% 0%, 64% 0%, 54% 39%, 76% 39%, 36% 100%, 46% 58%, 27% 58%);
        filter: drop-shadow(0 0 10px rgba(255,0,255,.8));
      }
      .__ts_faction_emblem_neon__::after {
        transform: scale(.72) translate(7px, -6px) rotate(12deg);
        opacity:.86;
      }
      .__ts_faction_card_neon__:hover .__ts_faction_emblem_neon__ {
        box-shadow: 0 0 24px rgba(255,0,255,.72), 0 0 42px rgba(255,0,255,.35);
      }

      .__ts_faction_card_toxic__ .__ts_faction_title__ { text-shadow: 0 0 12px rgba(0, 255, 0, .42); }
      .__ts_faction_emblem_toxic__ {
        background: radial-gradient(circle at 30% 25%, rgba(122,255,122,.36), rgba(16,42,16,.22) 74%);
        border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
        box-shadow: 0 0 16px rgba(0,255,0,.46), inset 0 -7px 14px rgba(0, 70, 0, .46);
        filter: blur(.05px);
      }
      .__ts_faction_emblem_toxic__::before,
      .__ts_faction_emblem_toxic__::after {
        content: '';
        position: absolute;
        border-radius: 50%;
        background: rgba(175,255,175,.82);
      }
      .__ts_faction_emblem_toxic__::before {
        width: 14px;
        height: 14px;
        top: 11px;
        left: 10px;
      }
      .__ts_faction_emblem_toxic__::after {
        width: 10px;
        height: 10px;
        right: 11px;
        bottom: 12px;
        filter: blur(.6px);
      }
      .__ts_faction_card_toxic__:hover .__ts_faction_emblem_toxic__ {
        box-shadow: 0 0 22px rgba(0,255,0,.56), 0 0 38px rgba(0,255,0,.24), inset 0 -8px 16px rgba(0,90,0,.52);
      }

      .__ts_faction_card_plasma__ .__ts_faction_title__ { text-shadow: 0 0 12px rgba(0, 255, 255, .44); }
      .__ts_faction_emblem_plasma__ {
        border-radius: 50%;
        background: radial-gradient(circle, rgba(190,255,255,.92) 0 26%, rgba(0,255,255,.72) 35%, rgba(0,0,0,.16) 68%);
        box-shadow: 0 0 14px rgba(0,255,255,.62), 0 0 34px rgba(0,255,255,.26);
        filter: drop-shadow(0 0 8px rgba(0,255,255,.7));
      }
      .__ts_faction_emblem_plasma__ .__ts_orbit__ {
        position:absolute;
        width: 46px;
        height: 20px;
        border: 2px solid rgba(136,255,255,.85);
        border-radius: 50%;
      }
      .__ts_faction_emblem_plasma__ .__ts_orbit_1__ { transform: rotate(24deg); }
      .__ts_faction_emblem_plasma__ .__ts_orbit_2__ { transform: rotate(-30deg); }
      .__ts_faction_emblem_plasma__ .__ts_orbit_3__ { transform: rotate(88deg) scale(.9); }
      .__ts_faction_card_plasma__:hover .__ts_faction_emblem_plasma__ {
        box-shadow: 0 0 20px rgba(0,255,255,.74), 0 0 44px rgba(0,255,255,.3);
      }

      .__ts_faction_card_neon__:has(.__ts_faction_radio__:checked) {
        border-color: #ff00ff;
        background: rgba(255, 0, 255, 0.15);
        box-shadow: 0 0 0 1px rgba(255,0,255,.52), 0 0 26px rgba(255,0,255,.38);
      }
      .__ts_faction_card_toxic__:has(.__ts_faction_radio__:checked) {
        border-color: #00ff00;
        background: rgba(0, 255, 0, 0.15);
        box-shadow: 0 0 0 1px rgba(0,255,0,.5), 0 0 26px rgba(0,255,0,.34);
      }
      .__ts_faction_card_plasma__:has(.__ts_faction_radio__:checked) {
        border-color: #00ffff;
        background: rgba(0, 255, 255, 0.15);
        box-shadow: 0 0 0 1px rgba(0,255,255,.5), 0 0 26px rgba(0,255,255,.35);
      }

      .__ts_faction_card:has(.__ts_faction_radio__:checked) .__ts_faction_emblem__ {
        animation: __ts_faction_jitter__ .18s linear infinite alternate, __ts_faction_pulse__ .9s ease-in-out infinite;
      }
      .__ts_faction_card_neon__:has(.__ts_faction_radio__:checked) .__ts_faction_emblem__ {
        box-shadow: 0 0 16px rgba(255,0,255,.92), 0 0 32px rgba(255,0,255,.66), 0 0 58px rgba(255,0,255,.35);
      }
      .__ts_faction_card_toxic__:has(.__ts_faction_radio__:checked) .__ts_faction_emblem__ {
        box-shadow: 0 0 14px rgba(0,255,0,.86), 0 0 30px rgba(0,255,0,.58), 0 0 54px rgba(0,255,0,.3);
      }
      .__ts_faction_card_plasma__:has(.__ts_faction_radio__:checked) .__ts_faction_emblem__ {
        box-shadow: 0 0 15px rgba(0,255,255,.9), 0 0 34px rgba(0,255,255,.62), 0 0 56px rgba(0,255,255,.34);
      }

      @keyframes __ts_faction_jitter__ {
        from { transform: translateX(-0.6px); }
        to { transform: translateX(0.6px); }
      }
      @keyframes __ts_faction_pulse__ {
        0%, 100% { filter: brightness(1) saturate(1.02); }
        50% { filter: brightness(1.16) saturate(1.28); }
      }

      @media (max-width: 560px) {
        #__ts_faction_cards__ { flex-direction: column; }
        .__ts_faction_card { min-height: 130px; }
      }
    `;
    styleHost.appendChild(style);
  };

  R.buildWidgetHTML = function buildWidgetHTML() {
    const state = R.state;
    const mood = R.getMood();
    const onlineMs = state.totalOnline + (R.now() - state.sessionStart);
    const xpPct = Math.round((state.xp / R.CONFIG.XP_PER_LEVEL) * 100);
    const hungerPct = R.clamp(state.hunger, 0, 100);
    const hpMax = R.getEffectiveHpMax ? R.getEffectiveHpMax() : R.CONFIG.HP_MAX;
    const hpPct = R.clamp(Math.round((state.hp / Math.max(1, hpMax)) * 100), 0, 100);
    const hpDisplay = Number.isInteger(state.hp) ? String(state.hp) : state.hp.toFixed(1);
    const canClaimDaily = R.isDailyQuestCompleted() && !state.dailyQuest.claimed;
    const diagnostics = R.getLauncherDiagnostics();
    const questRewards = R.getHourlyQuestRewards ? R.getHourlyQuestRewards(state.dailyQuest) : { coins: 0, xp: 0 };

    return `
      <div id="__tamaskrypt_widget__">
        <div id="__ts_header__">
          <span id="__ts_toggle__" title="Minimalizuj">−</span>
          <span>Gelek</span>
          <span style="margin-left:auto;font-size:10px;opacity:.85;">👤 ${R.currentUser}</span>
          <button id="__ts_logout__" style="background:none;border:none;color:#fff;cursor:pointer;">⏏</button>
        </div>
        <div id="__ts_zelek__" title="${mood.label}">
          <div id="__ts_zelek_floe_container__">
            <div id="__ts_zelek_shadow__"></div>
            <div id="__ts_zelek_floe__"></div>
            <div id="__ts_body_svg__">${R.buildZelekSVG()}</div>
          </div>
        </div>
        <div id="__ts_body__">
          <div id="__ts_levelup_inline__"></div>
          <div class="__ts_stat_row__"><span class="__ts_label__">❤️ HP</span><div class="__ts_bar_wrap__"><div class="__ts_bar__ __ts_hp_bar__" style="width:${hpPct}%"></div></div><span class="__ts_val__">${hpDisplay}/${hpMax}</span></div>
          <div class="__ts_stat_row__"><span class="__ts_label__">🍬 Głód</span><div class="__ts_bar_wrap__"><div class="__ts_bar__ __ts_hunger_bar__" style="width:${hungerPct}%"></div></div><span class="__ts_val__">${state.hunger}/100</span></div>
          <div class="__ts_stat_row__"><span class="__ts_label__">⭐ XP</span><div class="__ts_bar_wrap__"><div class="__ts_bar__ __ts_xp_bar__" style="width:${xpPct}%"></div></div><span class="__ts_val__">${state.xp}/${R.CONFIG.XP_PER_LEVEL}</span></div>
          <div id="__ts_info__"><span>Poziom: <strong>${state.level}</strong></span><span>Monety: <strong id="__ts_coins__">${state.coins}</strong> 🪙</span><span>Online: <strong id="__ts_online__">${R.formatTime(onlineMs)}</strong></span></div>
          <div id="__ts_territory_card__">
            <div id="__ts_territory_toggle__">
              <span id="__ts_territory_title__">🌐 Terytorium</span>
              <span id="__ts_territory_domain__">${window.location && window.location.hostname ? window.location.hostname : 'unknown'}</span>
              <span id="__ts_territory_arrow__" style="transition:transform .25s;">▼</span>
            </div>
            <div id="__ts_territory_content__">
              <div id="__ts_territory_king__">Władca: —</div>
              <div id="__ts_territory_status__">Status: skanowanie...</div>
              <div id="__ts_territory_actions__">
                <button id="__ts_territory_action_btn__" class="__ts_btn__" data-action="" disabled>Brak akcji</button>
                <button id="__ts_btn_claim_neutral__" class="__ts_btn__" style="display:none">🌐 Zajmij (Darmowe)</button>
              </div>
            </div>
          </div>
          <div id="__ts_evolution_line__">${R.renderEvolutionSummary ? R.renderEvolutionSummary() : ''}</div>
          ${R.renderActiveSkillCard ? R.renderActiveSkillCard() : ''}
          <div id="__ts_diag__"><span id="__ts_diag_badge__" title="source: ${diagnostics.source}"><span id="__ts_diag_mode__">${diagnostics.mode}</span><span id="__ts_diag_version__">v${diagnostics.manifestVersion}</span></span></div>
          <div id="__ts_hourly_box__" class="__ts_card__">
            <div id="__ts_missions_toggle__" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-size:11px; font-weight:bold; color:var(--ts-violet-1);">
              <span>🕐 Misje godzinowe</span>
              <span id="__ts_missions_arrow__" style="transition: transform 0.3s;">▼</span>
            </div>
            <div id="__ts_missions_content__" style="display:none; margin-top:8px;">
              ${R.renderHourlyGoalRows()}
              <div id="__ts_hourly_reward_total__" style="font-size:10px;color:#6b5a8f;margin:4px 0 6px 0;text-align:center;">Suma nagrody: +${questRewards.coins} 🪙, +${questRewards.xp} XP</div>
              <button id="__ts_claim_daily__" class="__ts_btn__" ${canClaimDaily ? '' : 'disabled'}>${state.dailyQuest.claimed ? '✅ Odebrane' : '🎁 Odbierz nagrodę'}</button>
            </div>
          </div>
          <div id="__ts_tabs__">
            <button id="__ts_tab_status__">Status</button>
            <button id="__ts_tab_shop__">Sklep</button>
            <button id="__ts_tab_inventory__">Ekwipunek</button>
            <button id="__ts_tab_ranking__">Ranking</button>
          </div>
          <div id="__ts_panel_shop__" style="display:none"></div>
          <div id="__ts_panel_inventory__" style="display:none"></div>
          <div id="__ts_panel_ranking__" style="display:none"></div>
          <div id="__ts_msg__"></div>
        </div>
      </div>
    `;
  };

  R.updateBar = function updateBar(cls, val, max, label) {
    const bars = R.queryAllInWidget('.' + cls);
    bars.forEach(bar => {
      const pct = R.clamp(Math.round((val / max) * 100), 0, 100);
      bar.style.width = pct + '%';
    });
    const rows = R.queryAllInWidget('.__ts_stat_row__');
    rows.forEach(row => {
      const barEl = row.querySelector('.' + cls);
      if (!barEl) return;
      const valEl = row.querySelector('.__ts_val__');
      if (valEl) valEl.textContent = label;
    });
  };

  R.showMessage = function showMessage(text, duration = 3000) {
    const msgEl = R.getElById('__ts_msg__');
    if (!msgEl) return;
    msgEl.textContent = text;
    clearTimeout(R.showMessageTimer);
    R.showMessageTimer = setTimeout(() => {
      if (msgEl) msgEl.textContent = '';
    }, duration);
  };

  R.showLevelUp = function showLevelUp() {
    const level = R.state && Number.isFinite(R.state.level) ? R.state.level : '?';
    const inline = R.getElById('__ts_levelup_inline__');
    if (!inline) {
      R.showMessage(`🎉 Poziom ${level}!`, 2600);
      return;
    }

    inline.textContent = `🎉 LEVEL UP! Poziom ${level}`;
    inline.classList.remove('show');
    void inline.offsetWidth;
    inline.classList.add('show');

    clearTimeout(R.levelUpInlineTimer);
    R.levelUpInlineTimer = setTimeout(() => {
      if (inline) inline.classList.remove('show');
    }, 2600);
  };

  R.updateUI = function updateUI() {
    if (!R.state) return;
    const state = R.state;
    const mood = R.getMood();

    const onlineEl = R.getElById('__ts_online__');
    const svgEl = R.getElById('__ts_body_svg__');
    const zelekEl = R.getElById('__ts_zelek__');

    if (onlineEl) onlineEl.textContent = R.formatTime(state.totalOnline + (R.now() - state.sessionStart));
    if (svgEl) svgEl.innerHTML = R.buildZelekSVG();
    if (zelekEl) zelekEl.title = mood.label;

    const hpDisplay = Number.isInteger(state.hp) ? String(state.hp) : state.hp.toFixed(1);
    const hpMax = R.getEffectiveHpMax ? R.getEffectiveHpMax() : R.CONFIG.HP_MAX;
    R.updateBar('__ts_hp_bar__', state.hp, hpMax, `${hpDisplay}/${hpMax}`);
    R.updateBar('__ts_hunger_bar__', state.hunger, 100, `${state.hunger}/100`);
    R.updateBar('__ts_xp_bar__', state.xp, R.CONFIG.XP_PER_LEVEL, `${state.xp}/${R.CONFIG.XP_PER_LEVEL}`);

    const evolutionLine = R.getElById('__ts_evolution_line__');
    if (evolutionLine && R.renderEvolutionSummary) {
      evolutionLine.innerHTML = R.renderEvolutionSummary();
    }
    if (R.refreshActiveSkillUI) {
      R.refreshActiveSkillUI();
    }
    if (R.bindActiveSkillButton) {
      R.bindActiveSkillButton();
    }

    const goals = state.dailyQuest && Array.isArray(state.dailyQuest.goals) ? state.dailyQuest.goals : [];
    goals.forEach((goal) => {
      const pct = R.getHourlyGoalPercent ? R.getHourlyGoalPercent(goal) : 0;
      const label = R.formatGoalProgress ? R.formatGoalProgress(goal) : '0/0';
      const bar = R.getElById(`__ts_goal_bar_${goal.id}__`);
      const val = R.getElById(`__ts_goal_val_${goal.id}__`);
      if (bar) bar.style.width = `${R.clamp(pct, 0, 100)}%`;
      if (val) val.textContent = label;
    });

    const rewardTotalEl = R.getElById('__ts_hourly_reward_total__');
    if (rewardTotalEl && R.getHourlyQuestRewards) {
      const rewards = R.getHourlyQuestRewards(state.dailyQuest);
      rewardTotalEl.textContent = `Suma nagrody: +${rewards.coins} 🪙, +${rewards.xp} XP`;
    }

    const coinsEl = R.getElById('__ts_coins__');
    if (coinsEl) coinsEl.textContent = String(state.coins);

    const domainState = (R.multiplayer && typeof R.multiplayer.getCurrentDomainState === 'function')
      ? R.multiplayer.getCurrentDomainState()
      : null;

    if (!domainState && R.multiplayer && typeof R.multiplayer.getDomainControl === 'function' && !R.__tsDomainFetchInFlight__) {
      R.__tsDomainFetchInFlight__ = true;
      R.multiplayer.getDomainControl({ force: false }).catch(() => {}).finally(() => {
        R.__tsDomainFetchInFlight__ = false;
      });
    }

    const toggleEl = R.getElById('__ts_toggle__');
    const territoryDomainEl = R.getElById('__ts_territory_domain__');
    const territoryKingEl = R.getElById('__ts_territory_king__');
    const territoryStatusEl = R.getElById('__ts_territory_status__');
    const territoryActionBtn = R.getElById('__ts_territory_action_btn__');

    if (territoryDomainEl) {
      territoryDomainEl.textContent = domainState && domainState.hostname
        ? String(domainState.hostname)
        : (window.location && window.location.hostname ? window.location.hostname : 'unknown');
    }

    let factionKey = 'neutral';
    if (domainState && domainState.faction) {
      factionKey = String(domainState.faction);
    }

    if (toggleEl) {
      toggleEl.classList.remove('__ts_toggle_faction_neon__', '__ts_toggle_faction_toxic__', '__ts_toggle_faction_plasma__', '__ts_toggle_faction_neutral__');
      toggleEl.classList.add(`__ts_toggle_faction_${factionKey === 'neon' || factionKey === 'toxic' || factionKey === 'plasma' ? factionKey : 'neutral'}__`);
    }

    const playerFaction = (R.multiplayer && typeof R.multiplayer.getPlayerFaction === 'function')
      ? R.multiplayer.getPlayerFaction().id
      : '';
    const multiplayerAvailable = Boolean(
      R.multiplayer
      && typeof R.multiplayer.isAvailable === 'function'
      && R.multiplayer.isAvailable()
    );
    const domainStatus = (R.multiplayer && typeof R.multiplayer.getDomainStatus === 'function')
      ? R.multiplayer.getDomainStatus(domainState)
      : {
        status: Boolean(domainState && (domainState.kingUid === String(R.currentUid || '') || (domainState.faction && domainState.faction === playerFaction))) ? 'allied' : 'hostile',
        message: 'Strefa Wroga (Opłacasz podatek)',
      };

    if (territoryKingEl) {
      if (domainState && domainState.kingUid) {
        const factionEmoji = R.multiplayer && typeof R.multiplayer.getFactionTheme === 'function'
          ? (R.multiplayer.getFactionTheme(domainState.faction).emoji || '⚑')
          : '⚑';
        territoryKingEl.textContent = `Władca: ${factionEmoji} ${domainState.kingName || domainState.kingUid} • DEF ${Math.round(Number(domainState.defensePoints) || 0)}`;
      } else {
        territoryKingEl.textContent = 'Władca: brak (Ziemia Niczyja)';
      }
    }

    if (territoryStatusEl) {
      territoryStatusEl.classList.remove('__ts_status_ally__', '__ts_status_enemy__');
      if (domainStatus.status === 'allied') {
        territoryStatusEl.textContent = domainStatus.message || 'Terytorium Sojusznicze (+10% Drop)';
        territoryStatusEl.classList.add('__ts_status_ally__');
      } else if (domainStatus.status === 'neutral') {
        territoryStatusEl.textContent = domainStatus.message || 'Ziemia Niczyja';
      } else {
        territoryStatusEl.textContent = domainStatus.message || 'Strefa Wroga (Opłacasz podatek)';
        territoryStatusEl.classList.add('__ts_status_enemy__');
      }
    }

    const claimNeutralBtn = R.widgetShadowRoot
      ? R.widgetShadowRoot.getElementById('__ts_btn_claim_neutral__')
      : document.getElementById('__ts_btn_claim_neutral__');

    if (claimNeutralBtn) {
      if (domainStatus.status === 'neutral' && multiplayerAvailable) {
        claimNeutralBtn.style.display = '';
        claimNeutralBtn.disabled = false;
        claimNeutralBtn.onclick = async () => {
          claimNeutralBtn.disabled = true;
          claimNeutralBtn.textContent = '⏳ Zajmowanie...';
          try {
            await R.multiplayer.claimNeutralDomain();
            if (R.multiplayer.forceRefreshCache) R.multiplayer.forceRefreshCache();
            if (R.showMessage) R.showMessage('🌐 Domena przejęta!', 2400);
            if (typeof R.updateUI === 'function') R.updateUI();
          } catch (err) {
            const msg = err && err.message ? err.message : 'Błąd zajmowania';
            if (R.showMessage) R.showMessage(`⚠️ ${msg}`, 2800);
            claimNeutralBtn.disabled = false;
            claimNeutralBtn.textContent = '🌐 Zajmij (Darmowe)';
          }
        };
      } else {
        claimNeutralBtn.style.display = 'none';
        claimNeutralBtn.onclick = null;
      }
    }

    if (territoryActionBtn) {
      if (domainStatus.status === 'neutral') {
        territoryActionBtn.style.display = 'none';
        territoryActionBtn.disabled = true;
        territoryActionBtn.setAttribute('data-action', '');
      } else if (domainState && domainState.kingUid === String(R.currentUid || '')) {
        territoryActionBtn.style.display = '';
        territoryActionBtn.disabled = false;
        territoryActionBtn.setAttribute('data-action', 'fortify');
        territoryActionBtn.textContent = 'Fortyfikuj';
      } else if (domainState && domainState.kingUid) {
        territoryActionBtn.style.display = '';
        territoryActionBtn.disabled = false;
        territoryActionBtn.setAttribute('data-action', 'sabotage');
        territoryActionBtn.textContent = 'Sabotuj';
      } else {
        territoryActionBtn.style.display = 'none';
        territoryActionBtn.disabled = true;
        territoryActionBtn.setAttribute('data-action', '');
        territoryActionBtn.textContent = 'Brak akcji';
      }
    }

    const diagnostics = R.getLauncherDiagnostics();
    const diagModeEl = R.getElById('__ts_diag_mode__');
    const diagVersionEl = R.getElById('__ts_diag_version__');
    const diagBadgeEl = R.getElById('__ts_diag_badge__');
    if (diagModeEl) diagModeEl.textContent = diagnostics.mode;
    if (diagVersionEl) diagVersionEl.textContent = `v${diagnostics.manifestVersion}`;
    if (diagBadgeEl) diagBadgeEl.title = `source: ${diagnostics.source}`;

    const claimBtn = R.getElById('__ts_claim_daily__');
    if (claimBtn) {
      const canClaim = R.isDailyQuestCompleted() && !state.dailyQuest.claimed;
      claimBtn.disabled = !canClaim;
      claimBtn.textContent = state.dailyQuest.claimed ? '✅ Odebrane' : '🎁 Odbierz nagrodę';
    }

    if (R.renderShopPanel) R.renderShopPanel();
    if (R.renderInventoryPanel) R.renderInventoryPanel();
    if (R.renderRankingPanel) R.renderRankingPanel();

    if (R.clampWidgetToViewport) {
      requestAnimationFrame(() => R.clampWidgetToViewport());
    }
  };

  R.clampWidgetToViewport = function clampWidgetToViewport() {
    if (!R.widgetEl) return;

    const padding = 8;
    const rect = R.widgetEl.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let nextX = rect.left;
    let nextY = rect.top;

    const maxX = Math.max(padding, viewportW - rect.width - padding);
    const maxY = Math.max(padding, viewportH - rect.height - padding);

    nextX = Math.min(Math.max(nextX, padding), maxX);
    nextY = Math.min(Math.max(nextY, padding), maxY);

    if (Math.abs(nextX - rect.left) < 0.5 && Math.abs(nextY - rect.top) < 0.5) {
      return;
    }

    R.widgetEl.style.right = 'auto';
    R.widgetEl.style.bottom = 'auto';
    R.widgetEl.style.left = `${Math.round(nextX)}px`;
    R.widgetEl.style.top = `${Math.round(nextY)}px`;
  };

  R.mountWidget = function mountWidget() {
    const existing = document.getElementById(R.ids.WIDGET_ID);
    if (existing) existing.remove();
    const target = document.body || document.documentElement;
    if (!target) {
      setTimeout(R.mountWidget, 500);
      return;
    }

    const widget = document.createElement('div');
    widget.id = R.ids.WIDGET_ID;
    const shadowRoot = widget.attachShadow({ mode: 'open' });
    R.widgetShadowRoot = shadowRoot;
    shadowRoot.innerHTML = R.buildWidgetHTML();
    R.applyWidgetStyles();
    target.appendChild(widget);
    R.widgetEl = widget;
    requestAnimationFrame(() => {
      if (R.clampWidgetToViewport) R.clampWidgetToViewport();
    });
  };

  R.buildAuthHTML = function buildAuthHTML() {
    return `
      <div id="__ts_auth_card__">
        <div style="font-size:22px;font-weight:bold;color:#b995ff;margin-bottom:4px;">🟣 Gelek</div>
        <p style="font-size:13px;color:#888;margin:0 0 18px;">Twój wirtualny żelek czeka!</p>
        <div id="__ts_auth_tabs__">
          <button type="button" id="__ts_tab_login__" class="active">Zaloguj się</button>
          <button type="button" id="__ts_tab_register__">Zarejestruj się</button>
        </div>
        <form id="__ts_auth_form__" autocomplete="on">
          <div class="__ts_field__"><input id="__ts_auth_user__" type="text" name="username" autocomplete="username" required placeholder="nazwa użytkownika" /></div>
          <div class="__ts_field__"><input id="__ts_auth_pass__" type="password" name="password" autocomplete="current-password" required placeholder="hasło" /></div>
          <div class="__ts_field__" id="__ts_confirm_row__" style="display:none"><input id="__ts_auth_confirm__" type="password" name="confirm" autocomplete="new-password" placeholder="powtórz hasło" /></div>
          <div id="__ts_faction_select_row__">
            <span class="__ts_faction_label__">⚑ Wybierz frakcję</span>
            <select id="__ts_auth_faction__" name="faction" aria-hidden="true" tabindex="-1">
              <option value="neon" selected>Neon</option>
              <option value="toxic">Toxic</option>
              <option value="plasma">Plasma</option>
            </select>
            <div id="__ts_faction_cards__" role="radiogroup" aria-label="Wybór frakcji">
              <label class="__ts_faction_card __ts_faction_card_neon__">
                <input class="__ts_faction_radio__" type="radio" name="faction_card" value="neon" checked onchange="this.closest('#__ts_faction_select_row__').querySelector('#__ts_auth_faction__').value='neon'" />
                <div class="__ts_faction_emblem__ __ts_faction_emblem_neon__"></div>
                <div class="__ts_faction_title__">Neon</div>
                <div class="__ts_faction_tagline__">Ewolucja i Styl</div>
              </label>

              <label class="__ts_faction_card __ts_faction_card_toxic__">
                <input class="__ts_faction_radio__" type="radio" name="faction_card" value="toxic" onchange="this.closest('#__ts_faction_select_row__').querySelector('#__ts_auth_faction__').value='toxic'" />
                <div class="__ts_faction_emblem__ __ts_faction_emblem_toxic__"></div>
                <div class="__ts_faction_title__">Toxic</div>
                <div class="__ts_faction_tagline__">Mutacja i Dominacja</div>
              </label>

              <label class="__ts_faction_card __ts_faction_card_plasma__">
                <input class="__ts_faction_radio__" type="radio" name="faction_card" value="plasma" onchange="this.closest('#__ts_faction_select_row__').querySelector('#__ts_auth_faction__').value='plasma'" />
                <div class="__ts_faction_emblem__ __ts_faction_emblem_plasma__">
                  <span class="__ts_orbit__ __ts_orbit_1__"></span>
                  <span class="__ts_orbit__ __ts_orbit_2__"></span>
                  <span class="__ts_orbit__ __ts_orbit_3__"></span>
                </div>
                <div class="__ts_faction_title__">Plasma</div>
                <div class="__ts_faction_tagline__">Technologia i Burza</div>
              </label>
            </div>
          </div>
          <div id="__ts_auth_err__"></div>
          <button type="submit" id="__ts_auth_submit__">Zaloguj się</button>
        </form>
      </div>
    `;
  };

  R.showAuthModal = function showAuthModal(onSuccess) {
    R.applyWidgetStyles();
    if (document.getElementById(R.ids.AUTH_MODAL_ID)) return;

    const modal = document.createElement('div');
    modal.id = R.ids.AUTH_MODAL_ID;
    modal.innerHTML = R.buildAuthHTML();
    (document.body || document.documentElement).appendChild(modal);

    let activeTab = 'login';
    const tabLogin = modal.querySelector('#__ts_tab_login__');
    const tabRegister = modal.querySelector('#__ts_tab_register__');
    const form = modal.querySelector('#__ts_auth_form__');
    const errEl = modal.querySelector('#__ts_auth_err__');
    const btnSubmit = modal.querySelector('#__ts_auth_submit__');
    const confirmRow = modal.querySelector('#__ts_confirm_row__');

    const factionRow = modal.querySelector('#__ts_faction_select_row__');
    const factionSelect = modal.querySelector('#__ts_auth_faction__');

    function setTab(t) {
      activeTab = t;
      tabLogin.classList.toggle('active', t === 'login');
      tabRegister.classList.toggle('active', t === 'register');
      confirmRow.style.display = t === 'register' ? 'block' : 'none';
      if (factionRow) factionRow.style.display = t === 'register' ? 'block' : 'none';
      btnSubmit.textContent = t === 'login' ? 'Zaloguj się' : 'Zarejestruj się';
      errEl.textContent = '';
    }

    tabLogin.addEventListener('click', () => setTab('login'));
    tabRegister.addEventListener('click', () => setTab('register'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = modal.querySelector('#__ts_auth_user__').value;
      const password = modal.querySelector('#__ts_auth_pass__').value;
      const confirm = modal.querySelector('#__ts_auth_confirm__').value;
      const faction = factionSelect ? (factionSelect.value || 'neon') : 'neon';

      if (activeTab === 'register' && password !== confirm) {
        errEl.textContent = 'Hasła się nie zgadzają';
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.textContent = '⏳';

      try {
        const err = activeTab === 'login'
          ? await R.AUTH.login(username, password)
          : await R.AUTH.register(username, password, faction);

        btnSubmit.disabled = false;
        setTab(activeTab);

        if (err) {
          errEl.textContent = err;
          return;
        }

        modal.remove();
        await onSuccess(R.AUTH.normalizeUsername(username), R.AUTH.session()?.uid || '');
      } catch (error) {
        btnSubmit.disabled = false;
        setTab(activeTab);
        errEl.textContent = 'Błąd połączenia z bazą';
        console.error('[Gelek] Auth error:', error);
      }
    });
  };
})();
