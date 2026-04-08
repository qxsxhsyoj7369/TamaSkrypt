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
    return `
      <div class="__ts_liquid_blob_wrap__" aria-label="Gelek">
        <div class="__ts_liquid_blob__">
          <span class="__ts_blob_eye__ __ts_blob_eye_l__"></span>
          <span class="__ts_blob_eye__ __ts_blob_eye_r__"></span>
          <span class="__ts_blob_mouth__"></span>
        </div>
      </div>`;
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
      }

      #__ts_body__ {
        min-width: 258px;
        padding: 10px;
        border-radius: 0 0 18px 18px;
        display: grid;
        gap: 8px;
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
      @keyframes __ts_panel_flow__ {
        0% { background-position: 0% 10%, 100% 25%, 42% 100%, 50% 50%; }
        50% { background-position: 52% 22%, 68% 80%, 38% 20%, 50% 50%; }
        100% { background-position: 100% 40%, 0% 0%, 60% 75%, 50% 50%; }
      }

      #__ts_body__.hidden { display: none; }
      #__ts_toggle__ { cursor: pointer; font-size: 10px; }

      #__ts_zelek__ {
        display:flex;
        flex-direction:column;
        align-items:center;
        padding: 8px;
        border-radius: 16px;
        background: var(--ts-glass);
        border: 1px solid rgba(255, 255, 255, 0.04);
        box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.12), 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      #__ts_body_svg__ { width:78px; height:86px; display:flex; align-items:center; justify-content:center; }
      #__ts_body_svg__ .__ts_liquid_blob_wrap__ { width:72px; height:82px; display:flex; align-items:flex-end; justify-content:center; }
      #__ts_body_svg__ .__ts_liquid_blob__ {
        width:56px;
        height:66px;
        position: relative;
        border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
        background: radial-gradient(130% 130% at 30% 18%, oklch(92% 0.05 324), oklch(72% 0.2 314) 42%, oklch(58% 0.23 300) 100%);
        box-shadow:
          inset -8px -10px 18px oklch(48% 0.24 302 / 0.62),
          inset 8px 10px 15px rgba(255, 255, 255, 0.72),
          0 10px 22px oklch(18% 0.08 284 / 0.45),
          0 0 22px oklch(66% 0.22 310 / 0.28);
        animation: __ts_blob_morph__ 8.2s ease-in-out infinite, __ts_blob_drift__ 4.8s ease-in-out infinite;
      }
      #__ts_body_svg__ .__ts_liquid_blob__::before {
        content: '';
        position: absolute;
        top: 8px;
        left: 10px;
        width: 16px;
        height: 9px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.58);
        filter: blur(0.3px);
      }
      #__ts_body_svg__ .__ts_blob_eye__ {
        position: absolute;
        top: 22px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #111827;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
      }
      #__ts_body_svg__ .__ts_blob_eye_l__ { left: 17px; }
      #__ts_body_svg__ .__ts_blob_eye_r__ { right: 17px; }
      #__ts_body_svg__ .__ts_blob_mouth__ {
        position: absolute;
        left: 50%;
        bottom: 21px;
        transform: translateX(-50%);
        width: 15px;
        height: 8px;
        border-bottom: 2.2px solid #1f2937;
        border-radius: 0 0 10px 10px;
      }
      @keyframes __ts_blob_morph__ {
        0% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
        25% { border-radius: 52% 48% 38% 62% / 52% 40% 60% 48%; }
        50% { border-radius: 60% 40% 44% 56% / 45% 62% 38% 55%; }
        75% { border-radius: 36% 64% 58% 42% / 58% 42% 64% 36%; }
        100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
      }
      @keyframes __ts_blob_drift__ {
        0%, 100% { transform: translateY(0) rotate(0.001deg); }
        50% { transform: translateY(-2px) rotate(-1deg); }
      }
      #__ts_mood__ { font-size:19px; margin-top:-2px; }

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
      .__ts_evo_badge__,
      .__ts_evo_badge {
        display:inline-flex;
        align-items:center;
        gap:4px;
        padding:3px 8px;
        border-radius:999px;
        font-size:9px;
        font-weight:700;
        background: linear-gradient(135deg, oklch(65% 0.25 310 / 0.35), oklch(73% 0.18 292 / 0.25));
        border: 1px solid oklch(100% 0 0 / 0.24);
        color: oklch(96% 0.01 300);
      }
      .__ts_evo_meta__,
      .__ts_evo_meta {
        font-size:9px;
        color: var(--ts-text-muted);
        text-align:right;
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
        position: relative;
        isolation: isolate;
        overflow: hidden;
        background:
          linear-gradient(140deg, oklch(42% 0.08 282 / 0.85), oklch(33% 0.06 278 / 0.9)) padding-box,
          linear-gradient(120deg, oklch(65% 0.25 310), oklch(80% 0.14 90), oklch(75% 0.14 230), oklch(65% 0.25 310)) border-box;
        background-size: 100% 100%, 220% 220%;
        animation: __ts_shiny_border__ 4s linear infinite;
        box-shadow: 0 0 14px oklch(65% 0.25 310 / 0.35), 0 10px 22px oklch(8% 0.03 280 / 0.45);
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
          linear-gradient(140deg, oklch(58% 0.22 300 / 0.88), oklch(66% 0.2 322 / 0.85)) padding-box,
          linear-gradient(120deg, oklch(65% 0.25 310), oklch(82% 0.16 85), oklch(65% 0.25 310)) border-box;
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

      #__ts_tabs {
        display:flex;
        gap:2px;
        margin-top:2px;
        padding: 4px;
        border-radius: 99px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.04);
        box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.12), 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      #__ts_tabs button {
        flex:1;
        border:1px solid transparent;
        border-radius:99px;
        padding:6px;
        font-size:10px;
        font-weight:680;
        letter-spacing: -0.02em;
        cursor:pointer;
        color: rgba(255, 255, 255, 0.88);
        background: transparent;
        box-shadow: none;
        transition: background-color .22s ease, box-shadow .22s ease, color .22s ease, transform .22s ease;
      }
      #__ts_tabs button:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.07);
      }
      #__ts_tabs button:active,
      #__ts_tabs button.__ts_tab_active__ {
        color: #fff;
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.12);
        box-shadow: 0 0 18px oklch(65% 0.25 310 / 0.42), inset 0 1px 1px rgba(255, 255, 255, 0.2);
      }

      #__ts_panel_shop__, #__ts_panel_inventory__, #__ts_panel_ranking__ {
        margin-top:6px;
        max-height:168px;
        overflow:auto;
        padding:6px;
      }
      .__ts_card__ { padding:6px; margin-bottom:6px; font-size:10px; }
      .__ts_card__ h5 { margin:0 0 4px 0; font-size:11px; letter-spacing:-0.02em; }
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
