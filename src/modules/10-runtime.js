(function () {
  'use strict';

  const runtime = window.GelekRuntime || {};

  runtime.CONFIG = {
    HUNGER_DRAIN_RATE: 1,
    HUNGER_DRAIN_INTERVAL: 60000,
    HUNGER_FOOD_SPAWN_CHANCE: 0.35,
    FOOD_DURATION: 15000,
    FOOD_SPAWN_INTERVAL: 30000,
    HP_MAX: 100,
    XP_PER_LEVEL: 100,
    HP_REGEN_INTERVAL: 120000,
    HP_REGEN_AMOUNT: 5,
    HP_DRAIN_WHEN_STARVING: 3,
    HP_REGEN_HUNGER_THRESHOLD: 40,
    OFFLINE_CATCHUP_MAX: 7200000,
    REVIVE_HP: 30,
    REVIVE_HUNGER: 50,
    HOURLY_FEED_TARGET: 2,
    HOURLY_ONLINE_TARGET_MS: 5 * 60 * 1000,
    HOURLY_PET_TARGET: 20,
    HOURLY_REWARD_COINS: 20,
    HOURLY_REWARD_XP: 15,
  };

  runtime.CONFIG.DAILY_FEED_TARGET = runtime.CONFIG.HOURLY_FEED_TARGET;
  runtime.CONFIG.DAILY_ONLINE_TARGET_MS = runtime.CONFIG.HOURLY_ONLINE_TARGET_MS;
  runtime.CONFIG.DAILY_REWARD_COINS = runtime.CONFIG.HOURLY_REWARD_COINS;
  runtime.CONFIG.DAILY_REWARD_XP = runtime.CONFIG.HOURLY_REWARD_XP;

  runtime.HOURLY_GOAL_DEFS = [
    {
      id: 'feed',
      icon: '🍽️',
      label: 'Karm',
      unit: 'count',
      minTarget: 2,
      maxTarget: 5,
      baseRewardCoins: 8,
      baseRewardXp: 6,
      rewardStepCoins: 4,
      rewardStepXp: 3,
    },
    {
      id: 'online',
      icon: '⏱️',
      label: 'Graj',
      unit: 'ms',
      minTargetMinutes: 4,
      maxTargetMinutes: 12,
      baseRewardCoins: 10,
      baseRewardXp: 8,
      rewardStepCoins: 3,
      rewardStepXp: 2,
    },
    {
      id: 'pet',
      icon: '🤲',
      label: 'Głaszcz',
      unit: 'count',
      minTarget: 12,
      maxTarget: 36,
      baseRewardCoins: 9,
      baseRewardXp: 7,
      rewardStepCoins: 3,
      rewardStepXp: 2,
    },
  ];

  runtime.FIREBASE_DB_URL = 'https://gelek-995f2-default-rtdb.europe-west1.firebasedatabase.app';
  runtime.FIREBASE_TIMEOUT = 10000;

  runtime.FOODS = [
    { emoji: '🍬', name: 'Cukierek', xp: 10, hunger: 20 },
    { emoji: '🍭', name: 'Lizak', xp: 15, hunger: 25 },
    { emoji: '🍡', name: 'Dango', xp: 12, hunger: 22 },
    { emoji: '🧁', name: 'Mufinka', xp: 20, hunger: 35 },
    { emoji: '🍓', name: 'Truskawka', xp: 8, hunger: 15 },
    { emoji: '🍇', name: 'Winogrona', xp: 8, hunger: 15 },
    { emoji: '🍩', name: 'Pączek', xp: 18, hunger: 30 },
    { emoji: '🍰', name: 'Ciasto', xp: 25, hunger: 40 },
  ];

  runtime.MOOD = {
    HAPPY: { emoji: '😄', label: 'Szczęśliwy' },
    NEUTRAL: { emoji: '😐', label: 'Normalny' },
    HUNGRY: { emoji: '😟', label: 'Głodny' },
    SAD: { emoji: '😢', label: 'Smutny' },
    DEAD: { emoji: '💀', label: 'Martwy' },
  };

  runtime.ids = {
    WIDGET_ID: '__tamaskrypt_widget__',
    FOOD_PREFIX: '__tamaskrypt_food_',
    AUTH_MODAL_ID: '__ts_auth_modal__',
  };

  runtime.currentUser = '';
  runtime.currentUid = '';
  runtime.state = null;
  runtime.activeFood = null;
  runtime.widgetEl = null;

  runtime.now = () => Date.now();

  runtime.clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  runtime.getDayKey = function getDayKey(ts = Date.now()) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  runtime.getHourKey = function getHourKey(ts = Date.now()) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    return `${y}-${m}-${day}-${h}`;
  };

  runtime.createSeededRng = function createSeededRng(seedText) {
    let seed = 2166136261;
    const text = String(seedText || 'gelek');
    for (let index = 0; index < text.length; index += 1) {
      seed ^= text.charCodeAt(index);
      seed = Math.imul(seed, 16777619);
      seed >>>= 0;
    }
    return function nextRandom() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  };

  runtime.randomInt = function randomInt(min, max, random) {
    if (max <= min) return min;
    const roll = typeof random === 'function' ? random() : Math.random();
    return min + Math.floor(roll * (max - min + 1));
  };

  runtime.computeHourlyGoalReward = function computeHourlyGoalReward(definition, targetValue) {
    if (!definition) return { coins: 0, xp: 0 };
    if (definition.unit === 'ms') {
      const minutes = Math.max(1, Math.round(targetValue / 60000));
      const level = Math.max(0, minutes - (definition.minTargetMinutes || minutes));
      return {
        coins: definition.baseRewardCoins + (level * definition.rewardStepCoins),
        xp: definition.baseRewardXp + (level * definition.rewardStepXp),
      };
    }
    const level = Math.max(0, Number(targetValue) - Number(definition.minTarget || targetValue));
    return {
      coins: definition.baseRewardCoins + (level * definition.rewardStepCoins),
      xp: definition.baseRewardXp + (level * definition.rewardStepXp),
    };
  };

  runtime.createHourlyGoal = function createHourlyGoal(definition, random) {
    if (!definition) return null;
    const target = definition.unit === 'ms'
      ? runtime.randomInt(definition.minTargetMinutes, definition.maxTargetMinutes, random) * 60000
      : runtime.randomInt(definition.minTarget, definition.maxTarget, random);
    const reward = runtime.computeHourlyGoalReward(definition, target);
    return {
      id: definition.id,
      icon: definition.icon,
      label: definition.label,
      unit: definition.unit,
      target,
      progress: 0,
      rewardCoins: reward.coins,
      rewardXp: reward.xp,
    };
  };

  runtime.createHourlyGoals = function createHourlyGoals(seedText) {
    const random = runtime.createSeededRng(seedText);
    return runtime.HOURLY_GOAL_DEFS
      .map(definition => runtime.createHourlyGoal(definition, random))
      .filter(Boolean);
  };

  runtime.getHourlyGoalById = function getHourlyGoalById(quest, goalId) {
    if (!quest || !Array.isArray(quest.goals)) return null;
    return quest.goals.find(goal => goal && goal.id === goalId) || null;
  };

  runtime.formatGoalProgress = function formatGoalProgress(goal) {
    if (!goal) return '0/0';
    if (goal.unit === 'ms') {
      const currentMinutes = Math.floor((Number(goal.progress) || 0) / 60000);
      const targetMinutes = Math.max(1, Math.round((Number(goal.target) || 0) / 60000));
      return `${currentMinutes}/${targetMinutes}m`;
    }
    return `${Math.floor(Number(goal.progress) || 0)}/${Math.max(1, Math.floor(Number(goal.target) || 0))}`;
  };

  runtime.getHourlyGoalPercent = function getHourlyGoalPercent(goal) {
    if (!goal) return 0;
    const target = Math.max(1, Number(goal.target) || 1);
    const progress = Math.max(0, Number(goal.progress) || 0);
    return runtime.clamp(Math.round((progress / target) * 100), 0, 100);
  };

  runtime.getHourlyQuestRewards = function getHourlyQuestRewards(quest) {
    const goals = quest && Array.isArray(quest.goals) ? quest.goals : [];
    return goals.reduce((acc, goal) => {
      acc.coins += Math.max(0, Number(goal && goal.rewardCoins) || 0);
      acc.xp += Math.max(0, Number(goal && goal.rewardXp) || 0);
      return acc;
    }, { coins: 0, xp: 0 });
  };

  runtime.incrementHourlyGoalProgress = function incrementHourlyGoalProgress(goalId, amount) {
    if (!runtime.state || !runtime.state.dailyQuest) return;
    const goal = runtime.getHourlyGoalById(runtime.state.dailyQuest, goalId);
    if (!goal) return;
    const delta = Math.max(0, Number(amount) || 0);
    goal.progress = runtime.clamp((Number(goal.progress) || 0) + delta, 0, Math.max(1, Number(goal.target) || 1));
  };

  runtime.makeHourlyQuest = function makeHourlyQuest() {
    const hourKey = runtime.getHourKey();
    const seedIdentity = runtime.currentUid || runtime.currentUser || 'guest';
    const goals = runtime.createHourlyGoals(`${seedIdentity}::${hourKey}`);
    const rewards = runtime.getHourlyQuestRewards({ goals });
    return {
      hourKey,
      goals,
      rewardCoins: rewards.coins,
      rewardXp: rewards.xp,
      claimed: false,
    };
  };

  runtime.makeDailyQuest = function makeDailyQuest() {
    return runtime.makeHourlyQuest();
  };

  runtime.normalizeDailyQuest = function normalizeDailyQuest(raw) {
    if (!raw || typeof raw !== 'object') return runtime.makeHourlyQuest();
    const hourKey = raw.hourKey || raw.dayKey;
    if (hourKey !== runtime.getHourKey()) return runtime.makeHourlyQuest();

    const seedIdentity = runtime.currentUid || runtime.currentUser || 'guest';
    const defaults = runtime.createHourlyGoals(`${seedIdentity}::${hourKey}`);
    const incomingGoals = Array.isArray(raw.goals) ? raw.goals : [];
    const mergedGoals = defaults.map((defGoal) => {
      const existing = incomingGoals.find(goal => goal && goal.id === defGoal.id) || null;
      let progressValue = Number(existing && existing.progress);
      if (!Number.isFinite(progressValue)) {
        if (defGoal.id === 'feed') progressValue = Number(raw.feedProgress);
        if (defGoal.id === 'online') progressValue = Number(raw.onlineProgressMs);
        if (defGoal.id === 'pet') progressValue = Number(raw.petProgress);
      }
      const target = Math.max(1, Number(existing && existing.target) || Number(defGoal.target) || 1);
      const rewardCoins = Math.max(0, Number(existing && existing.rewardCoins) || Number(defGoal.rewardCoins) || 0);
      const rewardXp = Math.max(0, Number(existing && existing.rewardXp) || Number(defGoal.rewardXp) || 0);
      return {
        ...defGoal,
        target,
        progress: runtime.clamp(Number.isFinite(progressValue) ? progressValue : 0, 0, target),
        rewardCoins,
        rewardXp,
      };
    });

    const rewards = runtime.getHourlyQuestRewards({ goals: mergedGoals });
    return {
      hourKey,
      goals: mergedGoals,
      rewardCoins: rewards.coins,
      rewardXp: rewards.xp,
      claimed: Boolean(raw.claimed),
    };
  };

  runtime.normalizeHourlyQuest = runtime.normalizeDailyQuest;

  runtime.isDailyQuestCompleted = function isDailyQuestCompleted() {
    if (!runtime.state || !runtime.state.dailyQuest) return false;
    const goals = runtime.state.dailyQuest.goals;
    if (!Array.isArray(goals) || goals.length < 1) return false;
    return goals.every(goal => (Number(goal.progress) || 0) >= (Number(goal.target) || 1));
  };

  runtime.formatTime = function formatTime(ms) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}g ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  runtime.getMood = function getMood() {
    const state = runtime.state;
    if (!state || !state.alive) return runtime.MOOD.DEAD;
    if (state.hunger > 60) return runtime.MOOD.HAPPY;
    if (state.hunger > 30) return runtime.MOOD.NEUTRAL;
    if (state.hunger > 10) return runtime.MOOD.HUNGRY;
    return runtime.MOOD.SAD;
  };

  window.GelekRuntime = runtime;
})();
