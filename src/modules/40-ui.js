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
    const colors = ['#FF6B9D', '#FF8E53', '#A8EB12', '#12C2E9', '#F64F59', '#C471ED'];
    const color = colors[(level - 1) % colors.length];
    return `
      <svg width="60" height="72" viewBox="0 0 60 72" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="42" rx="22" ry="26" fill="${color}" opacity="0.9"/>
        <ellipse cx="30" cy="20" rx="18" ry="17" fill="${color}"/>
        <ellipse cx="22" cy="13" rx="6" ry="4" fill="white" opacity="0.45"/>
        <circle cx="23" cy="20" r="3.5" fill="#1a1a2e"/>
        <circle cx="37" cy="20" r="3.5" fill="#1a1a2e"/>
        <path d="M24 27 Q30 32 36 27" stroke="#1a1a2e" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>`;
  };

  R.applyWidgetStyles = function applyWidgetStyles() {
    if (document.getElementById('__tamaskrypt_styles__')) return;
    const style = document.createElement('style');
    style.id = '__tamaskrypt_styles__';
    style.textContent = `
      #__tamaskrypt_widget__ { position: fixed; bottom: 16px; right: 16px; z-index: 2147483647; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; user-select: none; }
      #__ts_header__ { background: linear-gradient(135deg,#667eea,#764ba2); color: white; padding: 6px 10px; border-radius: 12px 12px 0 0; display: flex; align-items: center; gap: 6px; font-weight: bold; cursor: move; font-size: 13px; }
      #__ts_toggle__ { cursor: pointer; font-size: 10px; }
      #__ts_body__ { background: rgba(255,255,255,0.97); border: 2px solid #764ba2; border-top: none; border-radius: 0 0 12px 12px; padding: 8px; min-width: 230px; box-shadow: 0 4px 20px rgba(0,0,0,0.25); }
      #__ts_body__.hidden { display: none; }
      #__ts_levelup_inline__ { margin:0 0 6px 0; padding:6px 8px; border-radius:10px; font-size:11px; font-weight:800; text-align:center; letter-spacing:.02em; background:linear-gradient(135deg,#fef3c7,#fde68a,#fef9c3); color:#7c2d12; border:1px solid #f59e0b; box-shadow:0 2px 10px rgba(245,158,11,.22); opacity:0; transform:translateY(-6px) scale(.98); pointer-events:none; max-height:0; overflow:hidden; transition:opacity .25s ease, transform .25s ease, max-height .25s ease, margin .25s ease, padding .25s ease; }
      #__ts_levelup_inline__.show { opacity:1; transform:translateY(0) scale(1); max-height:52px; margin:0 0 8px 0; animation:__ts_levelup_pulse__ 1.3s ease-in-out; }
      @keyframes __ts_levelup_pulse__ { 0%{ box-shadow:0 0 0 0 rgba(245,158,11,.35);} 70%{ box-shadow:0 0 0 10px rgba(245,158,11,0);} 100%{ box-shadow:0 0 0 0 rgba(245,158,11,0);} }
      #__ts_zelek__ { display:flex; flex-direction:column; align-items:center; margin-bottom:6px; }
      #__ts_mood__ { font-size:18px; margin-top:-4px; }
      .__ts_stat_row__ { display:flex; align-items:center; gap:4px; margin-bottom:4px; }
      .__ts_label__ { width:64px; font-size:10px; }
      .__ts_bar_wrap__ { flex:1; height:8px; background:#e0e0e0; border-radius:4px; overflow:hidden; }
      .__ts_bar__ { height:100%; border-radius:4px; transition: width .4s ease; }
      .__ts_hp_bar__ { background: linear-gradient(90deg,#f093fb,#f5576c); }
      .__ts_hunger_bar__ { background: linear-gradient(90deg,#4facfe,#00f2fe); }
      .__ts_xp_bar__ { background: linear-gradient(90deg,#43e97b,#38f9d7); }
      .__ts_goal_bar_default__ { background: linear-gradient(90deg,#9aa5b1,#7b8794); }
      .__ts_goal_bar_feed__ { background: linear-gradient(90deg,#ffd166,#fca311); }
      .__ts_goal_bar_online__ { background: linear-gradient(90deg,#06d6a0,#118ab2); }
      .__ts_goal_bar_pet__ { background: linear-gradient(90deg,#ff7eb3,#ff4d6d); }
      .__ts_goal_bar_xp__ { background: linear-gradient(90deg,#7f7fd5,#86a8e7); }
      .__ts_goal_bar_hp__ { background: linear-gradient(90deg,#f093fb,#f5576c); }
      .__ts_goal_bar_hunger__ { background: linear-gradient(90deg,#4facfe,#00f2fe); }
      .__ts_goal_bar_survive__ { background: linear-gradient(90deg,#43e97b,#38f9d7); }
      .__ts_goal_reward__ { margin:0 0 5px 68px; font-size:9px; color:#6b5a8f; }
      .__ts_goal_badge__ { display:inline-flex; align-items:center; padding:1px 6px; border-radius:999px; font-size:8px; font-weight:700; letter-spacing:.01em; margin-right:5px; border:1px solid transparent; }
      .__ts_goal_badge_common__ { background:#f3f4f6; color:#4b5563; border-color:#d1d5db; }
      .__ts_goal_badge_uncommon__ { background:#dcfce7; color:#166534; border-color:#86efac; }
      .__ts_goal_badge_rare__ { background:#dbeafe; color:#1d4ed8; border-color:#93c5fd; }
      .__ts_goal_badge_epic__ { background:#f3e8ff; color:#7e22ce; border-color:#d8b4fe; }
      .__ts_val__ { font-size: 9px; color:#555; width:52px; text-align:right; }
      #__ts_info__ { display:flex; justify-content:space-between; margin-top:6px; font-size:10px; color:#444; }
      #__ts_diag__ { margin-top:6px; display:flex; justify-content:flex-end; }
      #__ts_diag_badge__ { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:999px; font-size:9px; font-weight:700; letter-spacing:.02em; background:#efe9ff; color:#5f4692; border:1px solid #d7caf5; }
      #__ts_diag_mode__ { text-transform:uppercase; }
      #__ts_msg__ { text-align:center; font-size:11px; color:#764ba2; min-height:14px; font-weight:bold; margin-top:4px; }
      #__ts_tabs__ { display:grid; grid-template-columns: repeat(4,1fr); gap:4px; margin-top:8px; }
      #__ts_tabs__ button { border:none; border-radius:6px; padding:5px; font-size:10px; cursor:pointer; background:#ece8f8; color:#49327a; }
      #__ts_panel_shop__, #__ts_panel_inventory__, #__ts_panel_ranking__ { margin-top:6px; max-height:160px; overflow:auto; border:1px solid #d9d0ef; border-radius:8px; padding:5px; background:#faf8ff; }
      .__ts_card__ { border:1px solid #e1daf3; border-radius:8px; padding:5px; margin-bottom:5px; font-size:10px; }
      .__ts_card__ h5 { margin:0 0 4px 0; font-size:11px; }
      .__ts_btn__ { border:none; border-radius:6px; padding:4px 6px; font-size:10px; cursor:pointer; background:#6b46c1; color:#fff; }
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
    (document.head || document.documentElement || document.body).appendChild(style);
  };

  R.buildWidgetHTML = function buildWidgetHTML() {
    const state = R.state;
    const mood = R.getMood();
    const onlineMs = state.totalOnline + (R.now() - state.sessionStart);
    const xpPct = Math.round((state.xp / R.CONFIG.XP_PER_LEVEL) * 100);
    const hungerPct = R.clamp(state.hunger, 0, 100);
    const hpPct = R.clamp(state.hp, 0, 100);
    const hpDisplay = Number.isInteger(state.hp) ? String(state.hp) : state.hp.toFixed(1);
    const canClaimDaily = R.isDailyQuestCompleted() && !state.dailyQuest.claimed;
    const diagnostics = R.getLauncherDiagnostics();
    const questRewards = R.getHourlyQuestRewards ? R.getHourlyQuestRewards(state.dailyQuest) : { coins: 0, xp: 0 };

    return `
      <div id="__ts_header__">
        <span id="__ts_toggle__">🟢</span>
        <span>TamaSkrypt</span>
        <span style="margin-left:auto;font-size:10px;opacity:.85;">👤 ${R.currentUser}</span>
        <button id="__ts_logout__" style="background:none;border:none;color:#fff;cursor:pointer;">⏏</button>
      </div>
      <div id="__ts_body__">
        <div id="__ts_levelup_inline__"></div>
        <div id="__ts_zelek__" title="${mood.label}"><div id="__ts_body_svg__">${R.buildZelekSVG()}</div><div id="__ts_mood__">${mood.emoji}</div></div>
        <div class="__ts_stat_row__"><span class="__ts_label__">❤️ HP</span><div class="__ts_bar_wrap__"><div class="__ts_bar__ __ts_hp_bar__" style="width:${hpPct}%"></div></div><span class="__ts_val__">${hpDisplay}/${R.CONFIG.HP_MAX}</span></div>
        <div class="__ts_stat_row__"><span class="__ts_label__">🍬 Głód</span><div class="__ts_bar_wrap__"><div class="__ts_bar__ __ts_hunger_bar__" style="width:${hungerPct}%"></div></div><span class="__ts_val__">${state.hunger}/100</span></div>
        <div class="__ts_stat_row__"><span class="__ts_label__">⭐ XP</span><div class="__ts_bar_wrap__"><div class="__ts_bar__ __ts_xp_bar__" style="width:${xpPct}%"></div></div><span class="__ts_val__">${state.xp}/${R.CONFIG.XP_PER_LEVEL}</span></div>
        <div id="__ts_info__"><span>Poziom: <strong>${state.level}</strong></span><span>Monety: <strong id="__ts_coins__">${state.coins}</strong> 🪙</span><span>Online: <strong id="__ts_online__">${R.formatTime(onlineMs)}</strong></span></div>
        <div id="__ts_diag__"><span id="__ts_diag_badge__" title="source: ${diagnostics.source}"><span id="__ts_diag_mode__">${diagnostics.mode}</span><span id="__ts_diag_version__">v${diagnostics.manifestVersion}</span></span></div>
        <div style="margin-top:8px;border:1px dashed #b8a6d9;border-radius:10px;padding:6px;background:#faf8ff;">
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
    `;
  };

  R.updateBar = function updateBar(cls, val, max, label) {
    const bars = document.querySelectorAll('.' + cls);
    bars.forEach(bar => {
      const pct = R.clamp(Math.round((val / max) * 100), 0, 100);
      bar.style.width = pct + '%';
    });
    const rows = document.querySelectorAll('.__ts_stat_row__');
    rows.forEach(row => {
      const barEl = row.querySelector('.' + cls);
      if (!barEl) return;
      const valEl = row.querySelector('.__ts_val__');
      if (valEl) valEl.textContent = label;
    });
  };

  R.showMessage = function showMessage(text, duration = 3000) {
    const msgEl = document.getElementById('__ts_msg__');
    if (!msgEl) return;
    msgEl.textContent = text;
    clearTimeout(R.showMessageTimer);
    R.showMessageTimer = setTimeout(() => {
      if (msgEl) msgEl.textContent = '';
    }, duration);
  };

  R.showLevelUp = function showLevelUp() {
    const level = R.state && Number.isFinite(R.state.level) ? R.state.level : '?';
    const inline = document.getElementById('__ts_levelup_inline__');
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

    const moodEl = document.getElementById('__ts_mood__');
    const onlineEl = document.getElementById('__ts_online__');
    const svgEl = document.getElementById('__ts_body_svg__');
    const zelekEl = document.getElementById('__ts_zelek__');

    if (moodEl) moodEl.textContent = mood.emoji;
    if (onlineEl) onlineEl.textContent = R.formatTime(state.totalOnline + (R.now() - state.sessionStart));
    if (svgEl) svgEl.innerHTML = R.buildZelekSVG();
    if (zelekEl) zelekEl.title = mood.label;

    const hpDisplay = Number.isInteger(state.hp) ? String(state.hp) : state.hp.toFixed(1);
    R.updateBar('__ts_hp_bar__', state.hp, R.CONFIG.HP_MAX, `${hpDisplay}/${R.CONFIG.HP_MAX}`);
    R.updateBar('__ts_hunger_bar__', state.hunger, 100, `${state.hunger}/100`);
    R.updateBar('__ts_xp_bar__', state.xp, R.CONFIG.XP_PER_LEVEL, `${state.xp}/${R.CONFIG.XP_PER_LEVEL}`);

    const goals = state.dailyQuest && Array.isArray(state.dailyQuest.goals) ? state.dailyQuest.goals : [];
    goals.forEach((goal) => {
      const pct = R.getHourlyGoalPercent ? R.getHourlyGoalPercent(goal) : 0;
      const label = R.formatGoalProgress ? R.formatGoalProgress(goal) : '0/0';
      const bar = document.getElementById(`__ts_goal_bar_${goal.id}__`);
      const val = document.getElementById(`__ts_goal_val_${goal.id}__`);
      if (bar) bar.style.width = `${R.clamp(pct, 0, 100)}%`;
      if (val) val.textContent = label;
    });

    const rewardTotalEl = document.getElementById('__ts_hourly_reward_total__');
    if (rewardTotalEl && R.getHourlyQuestRewards) {
      const rewards = R.getHourlyQuestRewards(state.dailyQuest);
      rewardTotalEl.textContent = `Suma nagrody: +${rewards.coins} 🪙, +${rewards.xp} XP`;
    }

    const coinsEl = document.getElementById('__ts_coins__');
    if (coinsEl) coinsEl.textContent = String(state.coins);

    const diagnostics = R.getLauncherDiagnostics();
    const diagModeEl = document.getElementById('__ts_diag_mode__');
    const diagVersionEl = document.getElementById('__ts_diag_version__');
    const diagBadgeEl = document.getElementById('__ts_diag_badge__');
    if (diagModeEl) diagModeEl.textContent = diagnostics.mode;
    if (diagVersionEl) diagVersionEl.textContent = `v${diagnostics.manifestVersion}`;
    if (diagBadgeEl) diagBadgeEl.title = `source: ${diagnostics.source}`;

    const claimBtn = document.getElementById('__ts_claim_daily__');
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
    widget.innerHTML = R.buildWidgetHTML();
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
