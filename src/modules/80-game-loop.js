(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R) return;

  R.gainXP = function gainXP(amount) {
    if (!R.state || !R.state.alive) return;
    const gain = Math.max(0, Number(amount) || 0);
    R.state.xp += gain;
    if (R.incrementHourlyGoalProgress) {
      R.incrementHourlyGoalProgress('gain_xp', gain);
    }
    while (R.state.xp >= R.CONFIG.XP_PER_LEVEL) {
      const prevEvolution = R.getCurrentEvolution ? R.getCurrentEvolution() : null;
      R.state.xp -= R.CONFIG.XP_PER_LEVEL;
      R.state.level += 1;
      if (R.recalculateEvolutionStats) R.recalculateEvolutionStats();
      R.showLevelUp();
      const nextEvolution = R.getCurrentEvolution ? R.getCurrentEvolution() : null;
      if (prevEvolution && nextEvolution && prevEvolution.id !== nextEvolution.id && R.showMessage) {
        R.showMessage(`✨ Ewolucja! ${nextEvolution.emoji || '🧬'} ${nextEvolution.name}`, 3600);
      }
    }
  };

  R.claimDailyReward = function claimDailyReward() {
    if (!R.state || !R.state.dailyQuest) return;
    if (R.state.dailyQuest.claimed) {
      R.showMessage('✅ Nagroda godzinowa już odebrana');
      return;
    }
    if (!R.isDailyQuestCompleted()) {
      R.showMessage('⏳ Dokończ misję godzinową');
      return;
    }

    const rewards = R.getHourlyQuestRewards ? R.getHourlyQuestRewards(R.state.dailyQuest) : {
      coins: R.CONFIG.HOURLY_REWARD_COINS,
      xp: R.CONFIG.HOURLY_REWARD_XP,
    };

    R.state.dailyQuest.claimed = true;
    R.state.coins += rewards.coins;
    R.gainXP(rewards.xp);
    R.showMessage(`🎁 +${rewards.coins} monet, +${rewards.xp} XP`, 3500);
    R.persistState();
    R.updateUI();
  };

  R.useActiveSkill = function useActiveSkill() {
    if (!R.activateCurrentActiveSkill) return;
    const result = R.activateCurrentActiveSkill();
    if (!result || !result.ok) {
      if (R.showMessage) R.showMessage((result && result.reason) || 'Umiejętność niedostępna', 2400);
      return;
    }

    const skill = result.skill;
    const effectLabel = result.activatedEffects && result.activatedEffects.length
      ? ` (${result.activatedEffects.length} efekt${result.activatedEffects.length > 1 ? 'y' : ''})`
      : '';
    const healLabel = result.healed > 0 ? ` +${Math.round(result.healed)} HP` : '';
    R.showMessage(`${skill.emoji || '✨'} ${skill.name}${healLabel}${effectLabel}`, 3200);
    R.persistState();
    R.updateUI();
  };

  R.hungerTick = function hungerTick() {
    if (!R.state || !R.state.alive) return;

    const elapsed = R.now() - R.state.lastHungerTick;
    const ticks = Math.floor(elapsed / R.CONFIG.HUNGER_DRAIN_INTERVAL);
    if (ticks < 1) return;

    const hungerMultiplier = R.getActiveEffect && R.getActiveEffect('slow_hunger') ? 0.5 : 1;
    const drainRate = R.getEffectiveHungerDrainRate ? R.getEffectiveHungerDrainRate() : R.CONFIG.HUNGER_DRAIN_RATE;
    const hungerDrain = Math.max(1, Math.floor(ticks * drainRate * hungerMultiplier));

    R.state.lastHungerTick += ticks * R.CONFIG.HUNGER_DRAIN_INTERVAL;
    R.state.hunger = Math.max(0, R.state.hunger - hungerDrain);

    if (R.state.hunger === 0) {
      R.state.hp = Math.max(0, R.state.hp - R.CONFIG.HP_DRAIN_WHEN_STARVING * ticks);
      if (R.state.hp === 0) {
        R.state.alive = false;
        R.showMessage('💀 Żelek umarł z głodu!', 5000);
      }
    }

    R.persistState();
  };

  R.hpRegenTick = function hpRegenTick() {
    if (!R.state || !R.state.alive) return;
    const regenBoost = R.getActiveEffect && R.getActiveEffect('regen_boost') ? 2 : 1;
    const hpMax = R.getEffectiveHpMax ? R.getEffectiveHpMax() : R.CONFIG.HP_MAX;
    const hpRegen = R.getEffectiveHpRegenAmount ? R.getEffectiveHpRegenAmount() : R.CONFIG.HP_REGEN_AMOUNT;
    if (R.state.hunger > R.CONFIG.HP_REGEN_HUNGER_THRESHOLD && R.state.hp < hpMax) {
      R.state.hp = Math.min(hpMax, R.state.hp + (hpRegen * regenBoost));
      R.persistState();
      R.updateUI();
    }
  };

  R.trySpawnFood = function trySpawnFood() {
    if (!R.state || !R.state.alive || R.activeFood) return;
    if (Math.random() > R.CONFIG.HUNGER_FOOD_SPAWN_CHANCE) return;
    const food = R.FOODS[Math.floor(Math.random() * R.FOODS.length)];

    const el = document.createElement('div');
    el.className = 'ts_food_item';
    el.id = R.ids.FOOD_PREFIX + Date.now();
    el.textContent = food.emoji;
    el.title = food.name;
    el.style.left = Math.floor(Math.random() * (window.innerWidth - 120) + 60) + 'px';
    el.style.top = Math.floor(Math.random() * (window.innerHeight - 120) + 60) + 'px';

    const eat = () => {
      if (!R.state || !R.state.alive) return;
      if (el.parentNode) el.remove();
      if (R.activeFood === el) R.activeFood = null;

      R.state.hunger = R.clamp(R.state.hunger + food.hunger, 0, 100);
      R.state.foodCollected += 1;
      if (R.incrementHourlyGoalProgress) {
        R.incrementHourlyGoalProgress('feed', 1);
        R.incrementHourlyGoalProgress('eat_specific_food', 1, { foodName: food.name });
      }

      const xpBoost = R.getActiveEffect && R.getActiveEffect('xp_boost') ? 1.5 : 1;
      const baseFoodXp = R.getEffectiveFoodXp ? R.getEffectiveFoodXp(food.xp) : food.xp;
      const gainedXp = Math.round(baseFoodXp * xpBoost);
      R.gainXP(gainedXp);
      R.showMessage(`${food.emoji} Mniam! +${food.hunger} sytości, +${gainedXp} XP`);
      R.persistState();
      R.updateUI();
    };

    el.addEventListener('click', eat);
    el.addEventListener('touchstart', eat, { passive: true });
    (document.body || document.documentElement).appendChild(el);
    R.activeFood = el;

    setTimeout(() => {
      if (el.parentNode) el.remove();
      if (R.activeFood === el) R.activeFood = null;
    }, R.CONFIG.FOOD_DURATION);
  };

  R.bindUIEvents = function bindUIEvents() {
    const toggle = R.getElById ? R.getElById('__ts_toggle__') : document.getElementById('__ts_toggle__');
    const body = R.getElById ? R.getElById('__ts_body__') : document.getElementById('__ts_body__');
    if (toggle && body) {
      toggle.addEventListener('click', () => {
        body.classList.toggle('hidden');
        toggle.textContent = body.classList.contains('hidden') ? '🔴' : '🟢';
      });
    }

    const logoutBtn = R.getElById ? R.getElById('__ts_logout__') : document.getElementById('__ts_logout__');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        R.persistState();
        R.AUTH.clearSession();
        R.state = null;
        R.currentUser = '';
        R.currentUid = '';
        const widget = document.getElementById(R.ids.WIDGET_ID);
        if (widget) widget.remove();
        R.showAuthModal(R.startGame);
      });
    }

    const claimBtn = R.getElById ? R.getElById('__ts_claim_daily__') : document.getElementById('__ts_claim_daily__');
    if (claimBtn) claimBtn.addEventListener('click', R.claimDailyReward);

    const activeSkillBtn = R.getElById ? R.getElById('__ts_active_skill_btn__') : document.getElementById('__ts_active_skill_btn__');
    if (activeSkillBtn) activeSkillBtn.addEventListener('click', R.useActiveSkill);

    if (R.bindPettingEvents) R.bindPettingEvents();

    const tabStatus = R.getElById ? R.getElById('__ts_tab_status__') : document.getElementById('__ts_tab_status__');
    const tabShop = R.getElById ? R.getElById('__ts_tab_shop__') : document.getElementById('__ts_tab_shop__');
    const tabInventory = R.getElById ? R.getElById('__ts_tab_inventory__') : document.getElementById('__ts_tab_inventory__');
    const tabRanking = R.getElById ? R.getElById('__ts_tab_ranking__') : document.getElementById('__ts_tab_ranking__');
    const panelShop = R.getElById ? R.getElById('__ts_panel_shop__') : document.getElementById('__ts_panel_shop__');
    const panelInventory = R.getElById ? R.getElById('__ts_panel_inventory__') : document.getElementById('__ts_panel_inventory__');
    const panelRanking = R.getElById ? R.getElById('__ts_panel_ranking__') : document.getElementById('__ts_panel_ranking__');

    function hidePanels() {
      if (panelShop) panelShop.style.display = 'none';
      if (panelInventory) panelInventory.style.display = 'none';
      if (panelRanking) panelRanking.style.display = 'none';
    }

    if (tabStatus) tabStatus.addEventListener('click', () => hidePanels());
    if (tabShop) tabShop.addEventListener('click', () => {
      hidePanels();
      if (panelShop) panelShop.style.display = 'block';
      if (R.renderShopPanel) R.renderShopPanel();
    });
    if (tabInventory) tabInventory.addEventListener('click', () => {
      hidePanels();
      if (panelInventory) panelInventory.style.display = 'block';
      if (R.renderInventoryPanel) R.renderInventoryPanel();
    });
    if (tabRanking) tabRanking.addEventListener('click', async () => {
      hidePanels();
      if (panelRanking) panelRanking.style.display = 'block';
      if (R.ranking) {
        R.ranking.loading = true;
        if (R.renderRankingPanel) R.renderRankingPanel();
      }
      if (R.fetchLeaderboard) await R.fetchLeaderboard(true);
      if (R.renderRankingPanel) R.renderRankingPanel();
    });

    const header = R.getElById ? R.getElById('__ts_header__') : document.getElementById('__ts_header__');
    if (header && R.widgetEl) {
      let dragging = false;
      let dragOX = 0;
      let dragOY = 0;

      const onDragStart = (e) => {
        if (e.target.id === '__ts_toggle__') return;
        dragging = true;
        const touch = e.touches ? e.touches[0] : e;
        const rect = R.widgetEl.getBoundingClientRect();
        dragOX = touch.clientX - rect.left;
        dragOY = touch.clientY - rect.top;
        e.preventDefault();
      };
      const onDragMove = (e) => {
        if (!dragging) return;
        const touch = e.touches ? e.touches[0] : e;
        let x = touch.clientX - dragOX;
        let y = touch.clientY - dragOY;
        x = Math.max(0, Math.min(window.innerWidth - R.widgetEl.offsetWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - R.widgetEl.offsetHeight, y));
        R.widgetEl.style.right = 'auto';
        R.widgetEl.style.bottom = 'auto';
        R.widgetEl.style.left = x + 'px';
        R.widgetEl.style.top = y + 'px';
        e.preventDefault();
      };
      const onDragEnd = () => { dragging = false; };

      header.addEventListener('mousedown', onDragStart, { passive: false });
      header.addEventListener('touchstart', onDragStart, { passive: false });
      document.addEventListener('mousemove', onDragMove, { passive: false });
      document.addEventListener('touchmove', onDragMove, { passive: false });
      document.addEventListener('mouseup', onDragEnd);
      document.addEventListener('touchend', onDragEnd);
    }
  };

  R.mainLoop = function mainLoop() {
    R.updateDailyQuestProgress();
    R.hungerTick();
    R.updateUI();
  };

  R.initGame = function initGame() {
    R.bindUIEvents();
    R.updateUI();
    if (R.fetchLeaderboard) {
      R.fetchLeaderboard(true).then(() => {
        if (R.renderRankingPanel) R.renderRankingPanel();
      }).catch(() => {});
    }
    if (R.syncRanking) {
      R.syncRanking('game-init').catch(() => {});
    }

    setInterval(R.mainLoop, 10000);
    setInterval(R.hpRegenTick, R.CONFIG.HP_REGEN_INTERVAL);
    setInterval(R.trySpawnFood, R.CONFIG.FOOD_SPAWN_INTERVAL);
    setInterval(R.persistState, 30000);
    if (R.fetchLeaderboard) {
      setInterval(() => {
        R.fetchLeaderboard(false).then(() => {
          if (R.renderRankingPanel) R.renderRankingPanel();
        }).catch(() => {});
      }, 30000);
    }

    setInterval(() => {
      const onlineEl = R.getElById ? R.getElById('__ts_online__') : document.getElementById('__ts_online__');
      if (onlineEl && R.state) {
        const ms = R.state.totalOnline + (R.now() - R.state.sessionStart);
        onlineEl.textContent = R.formatTime(ms);
      }
      if (R.refreshActiveSkillUI) {
        R.refreshActiveSkillUI();
      }
    }, 1000);

    window.addEventListener('beforeunload', R.persistState);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') R.persistState();
    });

    setTimeout(R.trySpawnFood, 5000);
  };

  R.startGame = async function startGame(username, uid) {
    R.currentUser = R.AUTH.normalizeUsername(username);
    R.currentUid = uid || await R.AUTH.resolveUidByUsername(username);
    if (!R.currentUid) throw new Error('Brak UID użytkownika');

    await R.loadStateForUser();
    R.mountWidget();
    R.initGame();
  };
})();
