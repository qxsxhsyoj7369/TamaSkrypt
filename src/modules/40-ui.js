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
    const bonuses = R.getEvolutionBonuses && R.state ? R.getEvolutionBonuses(R.state.level) : null;
    if (!evolution || !bonuses) return '<span>Forma: podstawowa</span>';

    const hpBonus = Math.round(bonuses.hpMax || 0);
    const foodBonusPct = Math.round(((bonuses.foodXpMultiplier || 1) - 1) * 100);
    const drainReductionPct = Math.round((1 - (bonuses.hungerDrainMultiplier || 1)) * 100);
    return `<span class="__ts_evo_badge__">${evolution.emoji || '🧬'} ${evolution.name}</span><span class="__ts_evo_meta__">+${hpBonus} HP • +${foodBonusPct}% XP z jedzenia • -${drainReductionPct}% głodu</span>`;
  };

  R.renderActiveSkillCard = function renderActiveSkillCard() {
    return `
      <div id="__ts_skill_card__" class="__ts_skill_card__">
        <div id="__ts_skill_title__" class="__ts_skill_title__"><span class="__ts_skill_icon__">✨</span>Umiejętność formy</div>
        <div id="__ts_skill_desc__" class="__ts_skill_desc__">Brak aktywnej umiejętności.</div>
        <div id="__ts_skill_meta__" class="__ts_skill_meta__">—</div>
        <button id="__ts_active_skill_btn__" class="__ts_btn__ __ts_skill_btn__" disabled>Brak</button>
      </div>
    `;
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
      buttonEl.textContent = 'Brak';
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
      buttonEl.textContent = '💀 Niedostępna';
      buttonEl.disabled = true;
      buttonEl.classList.remove('__ts_skill_cooling__');
      buttonEl.classList.remove('__ts_skill_ready__');
      return;
    }

    if (cooldownRemaining > 0) {
      metaEl.textContent = effectRemaining > 0
        ? `Efekt aktywny: ${R.formatTime(effectRemaining)} • Cooldown: ${R.formatTime(cooldownRemaining)}`
        : `Cooldown: ${R.formatTime(cooldownRemaining)}`;
      buttonEl.textContent = `⏳ ${R.formatTime(cooldownRemaining)}`;
      buttonEl.disabled = true;
      buttonEl.classList.add('__ts_skill_cooling__');
      buttonEl.classList.remove('__ts_skill_ready__');
      return;
    }

    metaEl.textContent = effectRemaining > 0
      ? `Efekt aktywny: ${R.formatTime(effectRemaining)} • Umiejętność gotowa`
      : 'Gotowe do użycia';
    buttonEl.textContent = '✨ Użyj umiejętności';
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
    const state = R.state;
    const level = state ? state.level : 1;
    const glowPower = 0.3 + (Math.min(30, level) / 100);
    return `
      <svg width="64" height="78" viewBox="0 0 64 78" xmlns="http://www.w3.org/2000/svg" aria-label="Gelek">
        <defs>
          <radialGradient id="__ts_blob_grad__" cx="36%" cy="20%" r="80%">
            <stop offset="0%" stop-color="#fff8ff" stop-opacity="0.94" />
            <stop offset="18%" stop-color="#ffc8ea" stop-opacity="0.92" />
            <stop offset="58%" stop-color="#ff7ec8" stop-opacity="0.86" />
            <stop offset="100%" stop-color="#ff5fb4" stop-opacity="0.72" />
          </radialGradient>
          <radialGradient id="__ts_head_grad__" cx="38%" cy="20%" r="84%">
            <stop offset="0%" stop-color="#fff7ff" stop-opacity="0.95" />
            <stop offset="40%" stop-color="#ffa8de" stop-opacity="0.86" />
            <stop offset="100%" stop-color="#ff6ec3" stop-opacity="0.68" />
          </radialGradient>
          <radialGradient id="__ts_inner_glow__" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stop-color="#fff6ff" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
          <filter id="__ts_jelly_filter__" x="-35%" y="-35%" width="170%" height="180%" color-interpolation-filters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="alphaBlur" />
            <feSpecularLighting in="alphaBlur" surfaceScale="5" specularConstant="0.8" specularExponent="22" lighting-color="#fff4ff" result="specLight">
              <fePointLight x="18" y="8" z="42" />
            </feSpecularLighting>
            <feComposite in="specLight" in2="SourceAlpha" operator="in" result="specIn" />
            <feBlend in="SourceGraphic" in2="specIn" mode="screen" />
          </filter>
          <filter id="__ts_soft_glow__" x="-30%" y="-30%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="2.4" result="blur"/>
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 0.55 0 0 0.15  0 0 0.75 0 0.25  0 0 0 ${glowPower} 0"/>
          </filter>
        </defs>

        <ellipse cx="32" cy="66" rx="20" ry="5.6" fill="#5f2b6a" opacity="0.16" filter="url(#__ts_soft_glow__)" />
        <g class="__ts_blob_body__" filter="url(#__ts_jelly_filter__)">
          <ellipse cx="32" cy="44" rx="23.5" ry="27.5" fill="url(#__ts_blob_grad__)" />
          <ellipse cx="32" cy="22" rx="19" ry="17" fill="url(#__ts_head_grad__)" />
          <ellipse cx="32" cy="42" rx="17" ry="20" fill="url(#__ts_inner_glow__)" opacity="0.78" />
          <ellipse cx="23" cy="14" rx="7.2" ry="4.8" fill="#ffffff" opacity="0.66" filter="url(#__ts_soft_glow__)" />
          <ellipse cx="39" cy="37" rx="4.6" ry="3.1" fill="#fff6ff" opacity="0.35" />
        </g>

        <circle cx="25" cy="22" r="3.7" fill="#111827" />
        <circle cx="39" cy="22" r="3.7" fill="#111827" />
        <circle cx="24.1" cy="20.9" r="1" fill="#ffffff" opacity="0.45" />
        <circle cx="38.1" cy="20.9" r="1" fill="#ffffff" opacity="0.45" />
        <path d="M25 30 Q32 36 39 30" stroke="#1f2937" stroke-width="2.3" fill="none" stroke-linecap="round" />
      </svg>`;
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
        --ts-violet-1: oklch(68% .23 309);
        --ts-violet-2: oklch(56% .19 288);
        --ts-pink-1: oklch(74% .19 350);
        --ts-cyan-1: oklch(79% .13 235);
        --ts-green-1: oklch(79% .2 153);
        --ts-green-2: oklch(66% .17 164);
        --ts-soft-shadow: 0 14px 36px rgba(28, 12, 52, .28);
        --ts-font: InterVariable, "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif;
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 2147483647;
        display: block;
      }

      #__tamaskrypt_widget__ {
        font-family: var(--ts-font);
        font-variation-settings: "wght" 520;
        font-size: 12px;
        user-select: none;
      }

      #__ts_header__ {
        background: linear-gradient(132deg, color-mix(in oklab, var(--ts-violet-1) 82%, white 18%), var(--ts-violet-2));
        color: #fff;
        padding: 8px 10px;
        border-radius: 16px 16px 0 0;
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 700;
        cursor: move;
        letter-spacing: .01em;
      }

      #__ts_body__ {
        min-width: 248px;
        padding: 10px;
        border-radius: 0 0 16px 16px;
        background:
          radial-gradient(130% 90% at 8% 6%, color-mix(in oklab, var(--ts-violet-1) 32%, transparent) 0%, transparent 58%),
          radial-gradient(120% 90% at 96% 14%, color-mix(in oklab, var(--ts-pink-1) 28%, transparent) 0%, transparent 58%),
          radial-gradient(140% 120% at 52% 100%, color-mix(in oklab, var(--ts-cyan-1) 24%, transparent) 0%, transparent 62%),
          linear-gradient(160deg, rgba(255,255,255,.52), rgba(247,240,255,.36));
        border: 0.5px solid rgba(255,255,255,.56);
        backdrop-filter: blur(20px) saturate(1.28);
        box-shadow: var(--ts-soft-shadow), inset 0 1px 0 rgba(255,255,255,.65);
      }

      #__ts_body__.hidden { display: none; }
      #__ts_toggle__ { cursor: pointer; font-size: 10px; }

      #__ts_zelek__ { display:flex; flex-direction:column; align-items:center; margin-bottom:8px; }
      #__ts_body_svg__ svg { animation: __ts_blob_breathe__ 3.8s ease-in-out infinite; transform-origin: 50% 58%; }
      #__ts_mood__ { font-size:19px; margin-top:-2px; }
      @keyframes __ts_blob_breathe__ {
        0%,100% { transform: scale(1, 1); }
        50% { transform: scale(1.018, 0.986); }
      }

      #__ts_levelup_inline__ {
        margin: 0 0 8px;
        padding: 7px 8px;
        border-radius: 12px;
        text-align:center;
        font-size:11px;
        font-weight:700;
        color: oklch(42% .13 40);
        background: linear-gradient(135deg, oklch(90% .08 94), oklch(94% .06 110));
        box-shadow: inset 0 1px 0 rgba(255,255,255,.55), 0 8px 16px rgba(240, 180, 45, .18);
        opacity:0;
        max-height:0;
        overflow:hidden;
        transform: translateY(-8px) scale(.98);
        transition: opacity .25s ease, transform .25s ease, max-height .25s ease;
      }
      #__ts_levelup_inline__.show { opacity:1; max-height:52px; transform:translateY(0) scale(1); }

      .__ts_stat_row__ { display:flex; align-items:center; gap:6px; margin-bottom:6px; }
      .__ts_label__ { width:66px; font-size:10px; color: oklch(42% .05 278); }
      .__ts_val__ { width:54px; text-align:right; font-size:9px; color: oklch(40% .04 278); }

      .__ts_bar_wrap__ {
        flex:1;
        height:11px;
        border-radius:999px;
        background: linear-gradient(180deg, rgba(255,255,255,.7), rgba(213, 205, 238, .45));
        border: 1px solid rgba(255,255,255,.7);
        box-shadow: inset 0 2px 2px rgba(255,255,255,.62), inset 0 -2px 4px rgba(76, 56, 117, .22);
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
        background: linear-gradient(180deg, rgba(255,255,255,.62), rgba(255,255,255,0));
        opacity: .8;
        pointer-events: none;
      }
      .__ts_hp_bar__ { background: linear-gradient(102deg, oklch(74% .2 349), oklch(66% .22 18), oklch(78% .16 332)); box-shadow: 0 0 7px oklch(67% .22 350); }
      .__ts_hunger_bar__ { background: linear-gradient(102deg, oklch(79% .14 232), oklch(72% .14 208), oklch(76% .11 250)); box-shadow: 0 0 7px oklch(74% .13 224); }
      .__ts_xp_bar__ { background: linear-gradient(102deg, var(--ts-green-1), var(--ts-green-2), oklch(74% .14 183)); box-shadow: 0 0 8px oklch(71% .17 151); }
      .__ts_goal_bar_default__ { background: linear-gradient(90deg, oklch(70% .02 260), oklch(61% .03 260)); }
      .__ts_goal_bar_feed__ { background: linear-gradient(90deg, oklch(85% .12 90), oklch(76% .15 70)); filter: drop-shadow(0 0 3px oklch(76% .14 78)); }
      .__ts_goal_bar_online__ { background: linear-gradient(90deg, oklch(76% .13 180), oklch(69% .13 220)); filter: drop-shadow(0 0 3px oklch(71% .12 210)); }
      .__ts_goal_bar_pet__ { background: linear-gradient(90deg, oklch(78% .18 344), oklch(69% .2 8)); filter: drop-shadow(0 0 3px oklch(72% .18 350)); }
      .__ts_goal_bar_xp__ { background: linear-gradient(90deg, oklch(75% .13 280), oklch(73% .12 235)); }
      .__ts_goal_bar_hp__ { background: linear-gradient(90deg, oklch(73% .19 350), oklch(66% .21 18)); }
      .__ts_goal_bar_hunger__ { background: linear-gradient(90deg, oklch(77% .16 229), oklch(73% .14 198)); }
      .__ts_goal_bar_survive__ { background: linear-gradient(90deg, var(--ts-green-1), var(--ts-green-2)); }

      #__ts_info { display:flex; justify-content:space-between; margin-top:6px; font-size:10px; color: oklch(37% .05 280); }
      #__ts_evolution_line__ { margin-top:6px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .__ts_evo_badge {
        display:inline-flex;
        align-items:center;
        gap:4px;
        padding:3px 8px;
        border-radius:999px;
        font-size:9px;
        font-weight:700;
        background: linear-gradient(135deg, oklch(90% .04 300), oklch(85% .06 290));
        border: 0.5px solid rgba(255,255,255,.75);
      }
      .__ts_evo_meta { font-size:9px; color: oklch(45% .04 284); text-align:right; }

      .__ts_skill_card__,
      #__ts_hourly_box__,
      #__ts_panel_shop__,
      #__ts_panel_inventory__,
      #__ts_panel_ranking__,
      .__ts_goal_block__,
      .__ts_card__ {
        border-radius: 18px;
        border: 0.5px solid rgba(255,255,255,.66);
        background: linear-gradient(160deg, rgba(255,255,255,.8), rgba(247,238,255,.64));
        box-shadow: 0 12px 24px rgba(49, 35, 86, .16), inset 0 1px 0 rgba(255,255,255,.72);
      }

      .__ts_goal_block__ { padding: 6px 7px; margin-bottom: 5px; }
      .__ts_goal_reward__ { margin:0 0 2px 68px; font-size:9px; color: oklch(43% .06 300); }
      .__ts_goal_badge__ { display:inline-flex; align-items:center; padding:1px 7px; border-radius:999px; font-size:8px; font-weight:700; margin-right:5px; border:1px solid transparent; }
      .__ts_goal_badge_common__ { background:#f3f4f6; color:#4b5563; border-color:#d1d5db; }
      .__ts_goal_badge_uncommon__ { background:#dcfce7; color:#166534; border-color:#86efac; }
      .__ts_goal_badge_rare__ { background:#dbeafe; color:#1d4ed8; border-color:#93c5fd; }
      .__ts_goal_badge_epic__ { background:#f3e8ff; color:#7e22ce; border-color:#d8b4fe; }

      .__ts_skill_card__ { margin-top:8px; padding:8px; }
      .__ts_skill_card__.__ts_skill_spark__ {
        background:
          radial-gradient(120% 130% at 10% 0%, rgba(156, 112, 255, .28), transparent 60%),
          radial-gradient(90% 120% at 90% 100%, rgba(255, 213, 93, .22), transparent 60%),
          linear-gradient(160deg, rgba(255,255,255,.82), rgba(242,235,255,.7));
        box-shadow:
          0 0 0 0.5px rgba(255,255,255,.64),
          0 0 18px oklch(73% .16 300 / .35),
          0 0 26px oklch(80% .13 88 / .25),
          0 12px 24px rgba(53, 31, 98, .24);
      }
      #__ts_hourly_box__ { margin-top:8px; padding:8px; }
      .__ts_skill_title__ { font-size:10px; font-weight:730; color: oklch(42% .09 297); margin-bottom:2px; }
      .__ts_skill_desc__ { font-size:9px; color: oklch(46% .05 286); margin-bottom:3px; }
      .__ts_skill_meta__ { font-size:9px; color: oklch(45% .04 282); margin-bottom:6px; }
      .__ts_skill_icon__ { display:inline-flex; margin-right:4px; }
      .__ts_neon_bolt__ {
        display:inline-flex;
        margin-right:4px;
        color: oklch(81% .14 76);
        text-shadow: 0 0 5px oklch(81% .15 76), 0 0 11px oklch(73% .2 300);
        animation: __ts_neon_bolt__ 1.2s ease-in-out infinite;
      }
      @keyframes __ts_neon_bolt__ {
        0%, 100% { transform: translateY(0); text-shadow: 0 0 5px oklch(81% .15 76), 0 0 11px oklch(73% .2 300); }
        50% { transform: translateY(-1px); text-shadow: 0 0 7px oklch(83% .17 92), 0 0 14px oklch(71% .2 299); }
      }

      .__ts_btn__ {
        border: none;
        border-radius: 12px;
        padding: 6px 8px;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
        color: #fff;
        background: linear-gradient(130deg, var(--ts-violet-1), var(--ts-violet-2), color-mix(in oklab, var(--ts-cyan-1) 42%, var(--ts-violet-2)));
        box-shadow: 0 0 10px oklch(66% .18 300 / .26), 0 8px 18px rgba(89, 52, 155, .28);
      }
      .__ts_skill_btn__ { width:100%; }
      .__ts_skill_btn__.__ts_skill_ready__ {
        background: linear-gradient(130deg, oklch(64% .21 297), oklch(76% .15 84));
        animation: __ts_skill_ready_pulse__ 1.6s ease-in-out infinite;
      }
      .__ts_skill_btn__.__ts_skill_cooling__ {
        background: linear-gradient(130deg, var(--ts-energy-start, hsl(276 78% 58%)), var(--ts-energy-end, hsl(262 84% 60%)));
        box-shadow: 0 0 10px var(--ts-energy-glow, hsl(274 84% 60%));
        animation: __ts_skill_cooling_pulse__ 1.1s ease-in-out infinite;
      }
      @keyframes __ts_skill_ready_pulse__ {
        0%,100% { box-shadow: 0 0 10px oklch(72% .16 92 / .35), 0 8px 18px rgba(89,52,155,.26); }
        50% { box-shadow: 0 0 16px oklch(74% .16 92 / .55), 0 10px 20px rgba(89,52,155,.3); }
      }
      @keyframes __ts_skill_cooling_pulse__ {
        0%,100% { transform: translateY(0); }
        50% { transform: translateY(-1px); }
      }

      #__ts_diag__ { margin-top:7px; display:flex; justify-content:flex-end; }
      #__ts_diag_badge { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:999px; font-size:9px; font-weight:700; background:rgba(255,255,255,.68); border:0.5px solid rgba(255,255,255,.72); color: oklch(41% .06 290); }
      #__ts_msg__ { text-align:center; font-size:11px; color: oklch(45% .12 300); min-height:14px; font-weight:700; margin-top:5px; }

      #__ts_tabs {
        display:grid;
        grid-template-columns: repeat(4,1fr);
        gap:6px;
        margin-top:8px;

        & button {
          border:none;
          border-radius:12px;
          padding:6px;
          font-size:10px;
          font-weight:680;
          cursor:pointer;
          color: oklch(35% .08 285);
          background: rgba(255,255,255,.7);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.85), 0 4px 12px rgba(87, 70, 130, .12);
        }
      }

      #__ts_panel_shop__, #__ts_panel_inventory__, #__ts_panel_ranking__ {
        margin-top:6px;
        max-height:168px;
        overflow:auto;
        padding:6px;
      }
      .__ts_card__ { padding:6px; margin-bottom:6px; font-size:10px; }
      .__ts_card__ h5 { margin:0 0 4px 0; font-size:11px; }
      .ts_food_item { position: fixed; font-size: 28px; z-index: 2147483646; cursor: pointer; }
      #__ts_auth_modal__ { position:fixed; inset:0; background:rgba(0,0,0,0.72); z-index:2147483647; display:flex; align-items:center; justify-content:center; font-family:'Segoe UI',Arial,sans-serif; }
      #__ts_auth_card__ { background:#fff; border-radius:20px; padding:28px 24px 24px; width:min(340px, 92vw); box-shadow:0 12px 40px rgba(0,0,0,0.45); text-align:center; }
      #__ts_auth_tabs__ { display:flex; border-radius:10px; overflow:hidden; border:2px solid #764ba2; margin-bottom:18px; }
      #__ts_auth_tabs__ button { flex:1; padding:9px 0; border:none; background:transparent; font-size:13px; font-weight:bold; color:#764ba2; cursor:pointer; }
      #__ts_auth_tabs__ button.active { background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; }
      .__ts_field__ { text-align:left; margin-bottom:12px; }
      .__ts_field__ input { width:100%; padding:10px 12px; border:1.5px solid #ddd; border-radius:10px; font-size:14px; box-sizing:border-box; }
      #__ts_auth_err__ { color:#e74c3c; font-size:12px; min-height:18px; margin-bottom:8px; font-weight:bold; }
      #__ts_auth_submit__ { width:100%; padding:12px; background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; border:none; border-radius:12px; font-size:15px; font-weight:bold; cursor:pointer; }
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
          <span id="__ts_toggle__">🟢</span>
          <span>TamaSkrypt</span>
          <span style="margin-left:auto;font-size:10px;opacity:.85;">👤 ${R.currentUser}</span>
          <button id="__ts_logout__" style="background:none;border:none;color:#fff;cursor:pointer;">⏏</button>
        </div>
        <div id="__ts_body__">
          <div id="__ts_levelup_inline__"></div>
          <div id="__ts_zelek__" title="${mood.label}"><div id="__ts_body_svg__">${R.buildZelekSVG()}</div><div id="__ts_mood__">${mood.emoji}</div></div>
          <div class="__ts_stat_row__"><span class="__ts_label__">❤️ HP</span><div class="__ts_bar_wrap__"><div class="__ts_bar__ __ts_hp_bar__" style="width:${hpPct}%"></div></div><span class="__ts_val__">${hpDisplay}/${hpMax}</span></div>
          <div class="__ts_stat_row__"><span class="__ts_label__">🍬 Głód</span><div class="__ts_bar_wrap__"><div class="__ts_bar__ __ts_hunger_bar__" style="width:${hungerPct}%"></div></div><span class="__ts_val__">${state.hunger}/100</span></div>
          <div class="__ts_stat_row__"><span class="__ts_label__">⭐ XP</span><div class="__ts_bar_wrap__"><div class="__ts_bar__ __ts_xp_bar__" style="width:${xpPct}%"></div></div><span class="__ts_val__">${state.xp}/${R.CONFIG.XP_PER_LEVEL}</span></div>
          <div id="__ts_info__"><span>Poziom: <strong>${state.level}</strong></span><span>Monety: <strong id="__ts_coins__">${state.coins}</strong> 🪙</span><span>Online: <strong id="__ts_online__">${R.formatTime(onlineMs)}</strong></span></div>
          <div id="__ts_evolution_line__">${R.renderEvolutionSummary ? R.renderEvolutionSummary() : ''}</div>
          ${R.renderActiveSkillCard ? R.renderActiveSkillCard() : ''}
          <div id="__ts_diag__"><span id="__ts_diag_badge__" title="source: ${diagnostics.source}"><span id="__ts_diag_mode__">${diagnostics.mode}</span><span id="__ts_diag_version__">v${diagnostics.manifestVersion}</span></span></div>
          <div id="__ts_hourly_box__">
            <div style="font-size:10px;font-weight:bold;color:#5f4692;margin-bottom:5px;text-align:center;">🕐 Misja godzinowa</div>
            ${R.renderHourlyGoalRows()}
            <div id="__ts_hourly_reward_total__" style="font-size:10px;color:#6b5a8f;margin:4px 0 6px 0;text-align:center;">Suma nagrody: +${questRewards.coins} 🪙, +${questRewards.xp} XP</div>
            <button id="__ts_claim_daily__" class="__ts_btn__" ${canClaimDaily ? '' : 'disabled'}>${state.dailyQuest.claimed ? '✅ Odebrane' : '🎁 Odbierz nagrodę'}</button>
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

    const moodEl = R.getElById('__ts_mood__');
    const onlineEl = R.getElById('__ts_online__');
    const svgEl = R.getElById('__ts_body_svg__');
    const zelekEl = R.getElById('__ts_zelek__');

    if (moodEl) moodEl.textContent = mood.emoji;
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
  };

  R.buildAuthHTML = function buildAuthHTML() {
    return `
      <div id="__ts_auth_card__">
        <div style="font-size:22px;font-weight:bold;color:#764ba2;margin-bottom:4px;">🟣 TamaSkrypt</div>
        <p style="font-size:13px;color:#888;margin:0 0 18px;">Twój wirtualny żelek czeka!</p>
        <div id="__ts_auth_tabs__">
          <button type="button" id="__ts_tab_login__" class="active">Zaloguj się</button>
          <button type="button" id="__ts_tab_register__">Zarejestruj się</button>
        </div>
        <form id="__ts_auth_form__" autocomplete="on">
          <div class="__ts_field__"><input id="__ts_auth_user__" type="text" name="username" autocomplete="username" required placeholder="nazwa użytkownika" /></div>
          <div class="__ts_field__"><input id="__ts_auth_pass__" type="password" name="password" autocomplete="current-password" required placeholder="hasło" /></div>
          <div class="__ts_field__" id="__ts_confirm_row__" style="display:none"><input id="__ts_auth_confirm__" type="password" name="confirm" autocomplete="new-password" placeholder="powtórz hasło" /></div>
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

    function setTab(t) {
      activeTab = t;
      tabLogin.classList.toggle('active', t === 'login');
      tabRegister.classList.toggle('active', t === 'register');
      confirmRow.style.display = t === 'register' ? 'block' : 'none';
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

      if (activeTab === 'register' && password !== confirm) {
        errEl.textContent = 'Hasła się nie zgadzają';
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.textContent = '⏳';

      try {
        const err = activeTab === 'login'
          ? await R.AUTH.login(username, password)
          : await R.AUTH.register(username, password);

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
