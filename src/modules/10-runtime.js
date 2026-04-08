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

  runtime.BASE_CONFIG = Object.freeze({ ...runtime.CONFIG });

  runtime.applyUserGameplaySettings = function applyUserGameplaySettings(gameplay) {
    const defaults = runtime.BASE_CONFIG;
    const source = gameplay && typeof gameplay === 'object' ? gameplay : {};

    runtime.CONFIG.HUNGER_FOOD_SPAWN_CHANCE = runtime.clamp(Number(source.HUNGER_FOOD_SPAWN_CHANCE), 0, 1);
    if (!Number.isFinite(runtime.CONFIG.HUNGER_FOOD_SPAWN_CHANCE)) {
      runtime.CONFIG.HUNGER_FOOD_SPAWN_CHANCE = defaults.HUNGER_FOOD_SPAWN_CHANCE;
    }

    runtime.CONFIG.FOOD_SPAWN_INTERVAL = Math.max(1000, Math.floor(Number(source.FOOD_SPAWN_INTERVAL)));
    if (!Number.isFinite(runtime.CONFIG.FOOD_SPAWN_INTERVAL)) {
      runtime.CONFIG.FOOD_SPAWN_INTERVAL = defaults.FOOD_SPAWN_INTERVAL;
    }

    runtime.CONFIG.FOOD_DURATION = Math.max(1000, Math.floor(Number(source.FOOD_DURATION)));
    if (!Number.isFinite(runtime.CONFIG.FOOD_DURATION)) {
      runtime.CONFIG.FOOD_DURATION = defaults.FOOD_DURATION;
    }

    runtime.CONFIG.HUNGER_DRAIN_RATE = Math.max(0, Number(source.HUNGER_DRAIN_RATE));
    if (!Number.isFinite(runtime.CONFIG.HUNGER_DRAIN_RATE)) {
      runtime.CONFIG.HUNGER_DRAIN_RATE = defaults.HUNGER_DRAIN_RATE;
    }

    runtime.CONFIG.HUNGER_DRAIN_INTERVAL = Math.max(1000, Math.floor(Number(source.HUNGER_DRAIN_INTERVAL)));
    if (!Number.isFinite(runtime.CONFIG.HUNGER_DRAIN_INTERVAL)) {
      runtime.CONFIG.HUNGER_DRAIN_INTERVAL = defaults.HUNGER_DRAIN_INTERVAL;
    }

    runtime.CONFIG.XP_PER_LEVEL = Math.max(10, Math.floor(Number(source.XP_PER_LEVEL)));
    if (!Number.isFinite(runtime.CONFIG.XP_PER_LEVEL)) {
      runtime.CONFIG.XP_PER_LEVEL = defaults.XP_PER_LEVEL;
    }
  };

  runtime.HOURLY_QUEST_VERSION = 2;
  runtime.HOURLY_GOAL_POOL_SIZE = 3;

  runtime.HOURLY_GOAL_DEFS = [
    {
      id: 'feed',
      icon: '🍽️',
      label: 'Karm',
      rarity: 'common',
      rarityLabel: 'Pospolite',
      weight: 24,
      rewardMultiplier: 1,
      unit: 'count',
      minTarget: 2,
      maxTarget: 6,
      baseRewardCoins: 8,
      baseRewardXp: 6,
      rewardStepCoins: 4,
      rewardStepXp: 3,
    },
    {
      id: 'online',
      icon: '⏱️',
      label: 'Graj',
      rarity: 'common',
      rarityLabel: 'Pospolite',
      weight: 22,
      rewardMultiplier: 1,
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
      rarity: 'common',
      rarityLabel: 'Pospolite',
      weight: 20,
      rewardMultiplier: 1,
      unit: 'count',
      minTarget: 12,
      maxTarget: 40,
      baseRewardCoins: 9,
      baseRewardXp: 7,
      rewardStepCoins: 3,
      rewardStepXp: 2,
    },
    {
      id: 'gain_xp',
      icon: '⭐',
      label: 'Zdobądź XP',
      rarity: 'uncommon',
      rarityLabel: 'Niepospolite',
      weight: 15,
      rewardMultiplier: 1.08,
      unit: 'count',
      minTarget: 20,
      maxTarget: 90,
      baseRewardCoins: 10,
      baseRewardXp: 10,
      rewardStepCoins: 2,
      rewardStepXp: 2,
    },
    {
      id: 'keep_hp',
      icon: '❤️',
      label: 'Utrzymaj HP',
      rarity: 'rare',
      rarityLabel: 'Rzadkie',
      weight: 9,
      rewardMultiplier: 1.2,
      unit: 'ms',
      minTargetMinutes: 3,
      maxTargetMinutes: 10,
      minThreshold: 55,
      maxThreshold: 85,
      baseRewardCoins: 11,
      baseRewardXp: 9,
      rewardStepCoins: 2,
      rewardStepXp: 2,
    },
    {
      id: 'keep_hunger',
      icon: '🍬',
      label: 'Utrzymaj sytość',
      rarity: 'rare',
      rarityLabel: 'Rzadkie',
      weight: 9,
      rewardMultiplier: 1.2,
      unit: 'ms',
      minTargetMinutes: 3,
      maxTargetMinutes: 10,
      minThreshold: 45,
      maxThreshold: 80,
      baseRewardCoins: 10,
      baseRewardXp: 8,
      rewardStepCoins: 2,
      rewardStepXp: 2,
    },
    {
      id: 'eat_specific_food',
      icon: '🍓',
      label: 'Zjedz konkretny przysmak',
      rarity: 'epic',
      rarityLabel: 'Epickie',
      weight: 5,
      rewardMultiplier: 1.35,
      unit: 'count',
      minTarget: 1,
      maxTarget: 3,
      baseRewardCoins: 12,
      baseRewardXp: 9,
      rewardStepCoins: 4,
      rewardStepXp: 3,
    },
    {
      id: 'survive_time',
      icon: '🛡️',
      label: 'Przetrwaj',
      rarity: 'uncommon',
      rarityLabel: 'Niepospolite',
      weight: 12,
      rewardMultiplier: 1.1,
      unit: 'ms',
      minTargetMinutes: 5,
      maxTargetMinutes: 15,
      baseRewardCoins: 9,
      baseRewardXp: 8,
      rewardStepCoins: 2,
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

  runtime.EVOLUTION_FORMS = [
    {
      id: 'jelly-seed',
      name: 'Żelkowy Pąk',
      emoji: '🟢',
      minLevel: 1,
      color: '#A8EB12',
      bonuses: {
        hpMax: 0,
        regenMultiplier: 1,
        foodXpMultiplier: 1,
        hungerDrainMultiplier: 1,
      },
    },
    {
      id: 'jelly-spark',
      name: 'Żelkowa Iskra',
      emoji: '🟡',
      minLevel: 5,
      color: '#facc15',
      bonuses: {
        hpMax: 8,
        regenMultiplier: 1.08,
        foodXpMultiplier: 1.05,
        hungerDrainMultiplier: 0.96,
      },
    },
    {
      id: 'jelly-bloom',
      name: 'Żelkowy Kwiat',
      emoji: '🟣',
      minLevel: 10,
      color: '#c084fc',
      bonuses: {
        hpMax: 16,
        regenMultiplier: 1.15,
        foodXpMultiplier: 1.1,
        hungerDrainMultiplier: 0.9,
      },
    },
    {
      id: 'jelly-nova',
      name: 'Żelkowa Nova',
      emoji: '🔵',
      minLevel: 15,
      color: '#38bdf8',
      bonuses: {
        hpMax: 24,
        regenMultiplier: 1.23,
        foodXpMultiplier: 1.16,
        hungerDrainMultiplier: 0.84,
      },
    },
    {
      id: 'jelly-legend',
      name: 'Legendarny Gelek',
      emoji: '🌈',
      minLevel: 25,
      color: '#fb7185',
      bonuses: {
        hpMax: 36,
        regenMultiplier: 1.32,
        foodXpMultiplier: 1.24,
        hungerDrainMultiplier: 0.78,
      },
    },
  ];

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

  runtime.getEvolutionForLevel = function getEvolutionForLevel(level) {
    const forms = Array.isArray(runtime.EVOLUTION_FORMS) ? runtime.EVOLUTION_FORMS : [];
    const targetLevel = Math.max(1, Math.floor(Number(level) || 1));
    let selected = forms[0] || null;

    for (let index = 0; index < forms.length; index += 1) {
      const form = forms[index];
      if (!form) continue;
      const minLevel = Math.max(1, Math.floor(Number(form.minLevel) || 1));
      if (targetLevel >= minLevel) selected = form;
    }

    return selected || {
      id: 'jelly-seed',
      name: 'Żelkowy Pąk',
      emoji: '🟢',
      minLevel: 1,
      color: '#A8EB12',
      bonuses: { hpMax: 0, regenMultiplier: 1, foodXpMultiplier: 1, hungerDrainMultiplier: 1 },
    };
  };

  runtime.getCurrentEvolution = function getCurrentEvolution() {
    const level = runtime.state ? runtime.state.level : 1;
    return runtime.getEvolutionForLevel(level);
  };

  runtime.getEvolutionBonuses = function getEvolutionBonuses(level) {
    const evolution = runtime.getEvolutionForLevel(level);
    const source = evolution && evolution.bonuses && typeof evolution.bonuses === 'object'
      ? evolution.bonuses
      : {};
    return {
      hpMax: Math.max(0, Number(source.hpMax) || 0),
      regenMultiplier: Math.max(0.1, Number(source.regenMultiplier) || 1),
      foodXpMultiplier: Math.max(0.1, Number(source.foodXpMultiplier) || 1),
      hungerDrainMultiplier: Math.max(0.1, Number(source.hungerDrainMultiplier) || 1),
    };
  };

  runtime.getEffectiveHpMaxForLevel = function getEffectiveHpMaxForLevel(level) {
    const bonuses = runtime.getEvolutionBonuses(level);
    return Math.max(1, Math.round((Number(runtime.CONFIG.HP_MAX) || 100) + bonuses.hpMax));
  };

  runtime.getEffectiveHpMax = function getEffectiveHpMax() {
    const level = runtime.state ? runtime.state.level : 1;
    return runtime.getEffectiveHpMaxForLevel(level);
  };

  runtime.getEffectiveHpRegenAmount = function getEffectiveHpRegenAmount() {
    const level = runtime.state ? runtime.state.level : 1;
    const bonuses = runtime.getEvolutionBonuses(level);
    return Math.max(0.1, (Number(runtime.CONFIG.HP_REGEN_AMOUNT) || 0) * bonuses.regenMultiplier);
  };

  runtime.getEffectiveFoodXp = function getEffectiveFoodXp(baseXp) {
    const level = runtime.state ? runtime.state.level : 1;
    const bonuses = runtime.getEvolutionBonuses(level);
    return Math.max(0, Math.round((Number(baseXp) || 0) * bonuses.foodXpMultiplier));
  };

  runtime.getEffectiveHungerDrainRate = function getEffectiveHungerDrainRate() {
    const level = runtime.state ? runtime.state.level : 1;
    const bonuses = runtime.getEvolutionBonuses(level);
    return Math.max(0, (Number(runtime.CONFIG.HUNGER_DRAIN_RATE) || 0) * bonuses.hungerDrainMultiplier);
  };

  runtime.recalculateEvolutionStats = function recalculateEvolutionStats() {
    if (!runtime.state) return;
    const maxHp = runtime.getEffectiveHpMax();
    runtime.state.hp = runtime.clamp(Number(runtime.state.hp) || 0, 0, maxHp);
    const evo = runtime.getCurrentEvolution();
    runtime.state.evolutionId = evo.id;
    runtime.state.evolutionName = evo.name;
  };

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

  runtime.pickWeightedItems = function pickWeightedItems(items, count, random) {
    const pool = Array.isArray(items) ? items.slice() : [];
    const selected = [];
    const drawCount = Math.max(0, Math.min(count, pool.length));

    for (let draw = 0; draw < drawCount; draw += 1) {
      const totalWeight = pool.reduce((sum, item) => sum + Math.max(0.0001, Number(item && item.weight) || 1), 0);
      let cursor = (typeof random === 'function' ? random() : Math.random()) * totalWeight;
      let pickedIndex = pool.length - 1;

      for (let index = 0; index < pool.length; index += 1) {
        cursor -= Math.max(0.0001, Number(pool[index] && pool[index].weight) || 1);
        if (cursor <= 0) {
          pickedIndex = index;
          break;
        }
      }

      selected.push(pool[pickedIndex]);
      pool.splice(pickedIndex, 1);
    }

    return selected;
  };

  runtime.computeHourlyGoalReward = function computeHourlyGoalReward(definition, targetValue) {
    if (!definition) return { coins: 0, xp: 0 };
    const multiplier = Math.max(0.5, Number(definition.rewardMultiplier) || 1);
    if (definition.unit === 'ms') {
      const minutes = Math.max(1, Math.round(targetValue / 60000));
      const level = Math.max(0, minutes - (definition.minTargetMinutes || minutes));
      return {
        coins: Math.round((definition.baseRewardCoins + (level * definition.rewardStepCoins)) * multiplier),
        xp: Math.round((definition.baseRewardXp + (level * definition.rewardStepXp)) * multiplier),
      };
    }
    const level = Math.max(0, Number(targetValue) - Number(definition.minTarget || targetValue));
    return {
      coins: Math.round((definition.baseRewardCoins + (level * definition.rewardStepCoins)) * multiplier),
      xp: Math.round((definition.baseRewardXp + (level * definition.rewardStepXp)) * multiplier),
    };
  };

  runtime.createHourlyGoal = function createHourlyGoal(definition, random) {
    if (!definition) return null;

    const goal = {
      id: definition.id,
      icon: definition.icon,
      label: definition.label,
      displayLabel: definition.label,
      rarity: definition.rarity || 'common',
      rarityLabel: definition.rarityLabel || 'Pospolite',
      unit: definition.unit,
      target: 1,
      progress: 0,
      rewardCoins: 0,
      rewardXp: 0,
    };

    if (definition.id === 'eat_specific_food') {
      const foodList = Array.isArray(runtime.FOODS) ? runtime.FOODS : [];
      const foodIndex = foodList.length ? runtime.randomInt(0, foodList.length - 1, random) : 0;
      const food = foodList[foodIndex] || { name: 'Przysmak', emoji: '🍓' };
      goal.foodName = food.name;
      goal.foodEmoji = food.emoji;
      goal.target = runtime.randomInt(definition.minTarget, definition.maxTarget, random);
      goal.displayLabel = `Zjedz ${food.emoji} ${food.name}`;
    } else if (definition.id === 'keep_hp') {
      goal.threshold = runtime.randomInt(definition.minThreshold, definition.maxThreshold, random);
      goal.target = runtime.randomInt(definition.minTargetMinutes, definition.maxTargetMinutes, random) * 60000;
      goal.displayLabel = `HP ≥ ${goal.threshold}`;
    } else if (definition.id === 'keep_hunger') {
      goal.threshold = runtime.randomInt(definition.minThreshold, definition.maxThreshold, random);
      goal.target = runtime.randomInt(definition.minTargetMinutes, definition.maxTargetMinutes, random) * 60000;
      goal.displayLabel = `Sytość ≥ ${goal.threshold}`;
    } else if (definition.unit === 'ms') {
      goal.target = runtime.randomInt(definition.minTargetMinutes, definition.maxTargetMinutes, random) * 60000;
    } else {
      goal.target = runtime.randomInt(definition.minTarget, definition.maxTarget, random);
    }

    const target = definition.unit === 'ms'
      ? goal.target
      : goal.target;
    const reward = runtime.computeHourlyGoalReward(definition, target);
    goal.rewardCoins = reward.coins;
    goal.rewardXp = reward.xp;
    return goal;
  };

  runtime.createHourlyGoals = function createHourlyGoals(seedText) {
    const random = runtime.createSeededRng(seedText);
    const pickedDefs = runtime.pickWeightedItems(runtime.HOURLY_GOAL_DEFS, runtime.HOURLY_GOAL_POOL_SIZE, random);
    return pickedDefs
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
    const extra = arguments.length > 2 ? arguments[2] : null;
    const goals = Array.isArray(runtime.state.dailyQuest.goals) ? runtime.state.dailyQuest.goals : [];
    const candidateGoals = goals.filter(goal => goal && goal.id === goalId);
    if (!candidateGoals.length) return;
    const delta = Math.max(0, Number(amount) || 0);
    candidateGoals.forEach((goal) => {
      if (goal.id === 'eat_specific_food') {
        const consumedName = extra && extra.foodName ? String(extra.foodName) : '';
        const expectedName = goal.foodName ? String(goal.foodName) : '';
        if (!consumedName || !expectedName || consumedName !== expectedName) return;
      }
      goal.progress = runtime.clamp((Number(goal.progress) || 0) + delta, 0, Math.max(1, Number(goal.target) || 1));
    });
  };

  runtime.updateTimedHourlyGoals = function updateTimedHourlyGoals(deltaMs) {
    if (!runtime.state || !runtime.state.dailyQuest) return;
    const goals = Array.isArray(runtime.state.dailyQuest.goals) ? runtime.state.dailyQuest.goals : [];
    const delta = Math.max(0, Number(deltaMs) || 0);
    if (delta <= 0) return;

    goals.forEach((goal) => {
      if (!goal || goal.unit !== 'ms') return;
      let canProgress = false;
      if (goal.id === 'online') canProgress = true;
      if (goal.id === 'survive_time') canProgress = runtime.state.alive === true;
      if (goal.id === 'keep_hp') canProgress = Number(runtime.state.hp) >= Number(goal.threshold || 0);
      if (goal.id === 'keep_hunger') canProgress = Number(runtime.state.hunger) >= Number(goal.threshold || 0);
      if (!canProgress) return;
      goal.progress = runtime.clamp((Number(goal.progress) || 0) + delta, 0, Math.max(1, Number(goal.target) || 1));
    });
  };

  runtime.makeHourlyQuest = function makeHourlyQuest() {
    const hourKey = runtime.getHourKey();
    const seedIdentity = runtime.currentUid || runtime.currentUser || 'guest';
    const goals = runtime.createHourlyGoals(`${seedIdentity}::${hourKey}`);
    const rewards = runtime.getHourlyQuestRewards({ goals });
    return {
      hourKey,
      questVersion: runtime.HOURLY_QUEST_VERSION,
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
    if (Number(raw.questVersion) !== runtime.HOURLY_QUEST_VERSION) return runtime.makeHourlyQuest();

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
      const threshold = Number(existing && existing.threshold);
      return {
        ...defGoal,
        target,
        progress: runtime.clamp(Number.isFinite(progressValue) ? progressValue : 0, 0, target),
        rewardCoins,
        rewardXp,
        threshold: Number.isFinite(threshold) ? threshold : defGoal.threshold,
        foodName: (existing && existing.foodName) || defGoal.foodName,
        foodEmoji: (existing && existing.foodEmoji) || defGoal.foodEmoji,
        displayLabel: (existing && existing.displayLabel) || defGoal.displayLabel || defGoal.label,
        rarity: (existing && existing.rarity) || defGoal.rarity,
        rarityLabel: (existing && existing.rarityLabel) || defGoal.rarityLabel,
      };
    });

    const rewards = runtime.getHourlyQuestRewards({ goals: mergedGoals });
    return {
      hourKey,
      questVersion: runtime.HOURLY_QUEST_VERSION,
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
