(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R || !R.firebaseRead || !R.firebaseWrite) return;

  R.persistInFlight = false;
  R.persistQueued = false;

  R.loadStateForUser = async function loadStateForUser() {
    const [profile, pet, stats, progress] = await Promise.all([
      R.firebaseRead(`users/${R.currentUid}/profile`),
      R.firebaseRead(`users/${R.currentUid}/pet`),
      R.firebaseRead(`users/${R.currentUid}/stats`),
      R.firebaseRead(`users/${R.currentUid}/progress`),
    ]);

    R.state = {
      hunger: R.clamp(Number(pet?.hunger) || 100, 0, 100),
      hp: R.clamp(Number(pet?.hp) || 100, 0, R.CONFIG.HP_MAX),
      level: Math.max(1, Number(pet?.level) || 1),
      xp: Math.max(0, Number(pet?.xp) || 0),
      coins: Math.max(0, Number(progress?.coins) || 0),
      foodCollected: Math.max(0, Number(pet?.foodCollected) || 0),
      totalOnline: Math.max(0, Number(stats?.totalOnlineMs) || 0),
      sessionStart: R.now(),
      lastSave: Number(pet?.updatedAt) || R.now(),
      lastHungerTick: Number(pet?.lastTickAt) || R.now(),
      alive: typeof pet?.alive === 'boolean' ? pet.alive : true,
      dailyQuest: R.normalizeDailyQuest(progress?.dailyQuest),
      inventory: (progress && progress.inventory && typeof progress.inventory === 'object') ? progress.inventory : {},
      activeEffects: (progress && progress.activeEffects && typeof progress.activeEffects === 'object') ? progress.activeEffects : {},
      lastDailyTick: R.now(),
      profileCreatedAt: Number(profile?.createdAt) || R.now(),
    };

    const offlineMs = Math.min(R.now() - (R.state.lastSave || R.now()), R.CONFIG.OFFLINE_CATCHUP_MAX);
    const offlineMins = offlineMs / 60000;
    const hungerLost = Math.floor(offlineMins * R.CONFIG.HUNGER_DRAIN_RATE);
    if (R.state.alive) {
      R.state.hunger = Math.max(0, R.state.hunger - hungerLost);
      if (R.state.hunger === 0) {
        const hpLost = Math.floor(offlineMins / (R.CONFIG.HUNGER_DRAIN_INTERVAL / 60000)) * R.CONFIG.HP_DRAIN_WHEN_STARVING;
        R.state.hp = Math.max(0, R.state.hp - hpLost);
        if (R.state.hp === 0) R.state.alive = false;
      }
    }
  };

  R.persistState = function persistState() {
    if (!R.state || !R.currentUid) return;
    if (R.persistInFlight) {
      R.persistQueued = true;
      return;
    }

    R.persistInFlight = true;
    const savedAt = R.now();
    const totalOnlineMs = R.state.totalOnline + (savedAt - R.state.sessionStart);

    const payload = {
      profile: {
        username: R.currentUser,
        createdAt: R.state.profileCreatedAt || savedAt,
        lastLoginAt: savedAt,
      },
      pet: {
        level: R.state.level,
        xp: R.state.xp,
        hp: R.state.hp,
        hpMax: R.CONFIG.HP_MAX,
        hunger: R.state.hunger,
        hungerMax: 100,
        foodCollected: R.state.foodCollected,
        alive: R.state.alive,
        lastTickAt: R.state.lastHungerTick,
        updatedAt: savedAt,
      },
      stats: {
        totalOnlineMs,
        updatedAt: savedAt,
      },
      progress: {
        coins: R.state.coins,
        inventory: R.state.inventory || {},
        activeEffects: R.state.activeEffects || {},
        dailyQuest: R.state.dailyQuest,
        updatedAt: savedAt,
      },
    };

    R.firebaseWrite(`users/${R.currentUid}`, payload, 'PATCH')
      .then(() => {
        R.state.lastSave = savedAt;
        if (R.syncRanking) {
          R.syncRanking('persist-state').catch(() => {});
        }
      })
      .catch((error) => {
        console.warn('[Gelek] Sync error:', error.message);
      })
      .finally(() => {
        R.persistInFlight = false;
        if (R.persistQueued) {
          R.persistQueued = false;
          R.persistState();
        }
      });
  };

  R.updateDailyQuestProgress = function updateDailyQuestProgress() {
    if (!R.state || !R.state.dailyQuest) return;

    const hourKey = R.getHourKey();
    if ((R.state.dailyQuest.hourKey || R.state.dailyQuest.dayKey) !== hourKey) {
      R.state.dailyQuest = R.makeDailyQuest();
      R.state.lastDailyTick = R.now();
      if (R.showMessage) R.showMessage('🕐 Nowy zestaw 3 misji godzinowych!', 3000);
    }

    const tickNow = R.now();
    const delta = Math.max(0, tickNow - R.state.lastDailyTick);
    R.state.lastDailyTick = tickNow;
    if (R.incrementHourlyGoalProgress) {
      R.incrementHourlyGoalProgress('online', delta);
    }
  };
})();
