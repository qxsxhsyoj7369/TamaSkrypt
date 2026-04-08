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

  runtime.makeHourlyQuest = function makeHourlyQuest() {
    return {
      hourKey: runtime.getHourKey(),
      feedProgress: 0,
      onlineProgressMs: 0,
      petProgress: 0,
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
    return {
      hourKey,
      feedProgress: runtime.clamp(Number(raw.feedProgress) || 0, 0, runtime.CONFIG.HOURLY_FEED_TARGET),
      onlineProgressMs: runtime.clamp(Number(raw.onlineProgressMs) || 0, 0, runtime.CONFIG.HOURLY_ONLINE_TARGET_MS),
      petProgress: runtime.clamp(Number(raw.petProgress) || 0, 0, runtime.CONFIG.HOURLY_PET_TARGET),
      claimed: Boolean(raw.claimed),
    };
  };

  runtime.normalizeHourlyQuest = runtime.normalizeDailyQuest;

  runtime.isDailyQuestCompleted = function isDailyQuestCompleted() {
    if (!runtime.state || !runtime.state.dailyQuest) return false;
    return runtime.state.dailyQuest.feedProgress >= runtime.CONFIG.HOURLY_FEED_TARGET
      && runtime.state.dailyQuest.onlineProgressMs >= runtime.CONFIG.HOURLY_ONLINE_TARGET_MS
      && runtime.state.dailyQuest.petProgress >= runtime.CONFIG.HOURLY_PET_TARGET;
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
