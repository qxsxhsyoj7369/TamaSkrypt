(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R) return;

  const URL_DROPS_COLLECTION = 'url_drops';
  const DOMAINS_COLLECTION = 'domains';
  const RTDB_MULTIPLAYER_DOMAINS_PATH = 'mp_domains';
  const DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000;
  const WAR_CACHE_TTL_MS = 5 * 60 * 1000;
  const MULTIPLAYER_FLUSH_INTERVAL_MS = 60 * 1000;
  const CONQUEST_POINTS_PER_MINUTE = 6;
  const TAX_RATE = 0.05;

  const FACTIONS = Object.freeze({
    neon: {
      id: 'neon',
      name: 'Neon',
      emoji: '🟣',
      color: '#ff3fbf',
      glow: 'rgba(255, 63, 191, 0.6)',
    },
    toxic: {
      id: 'toxic',
      name: 'Toxic',
      emoji: '🟢',
      color: '#8dff4f',
      glow: 'rgba(141, 255, 79, 0.62)',
    },
    plasma: {
      id: 'plasma',
      name: 'Plasma',
      emoji: '🔵',
      color: '#37e9ff',
      glow: 'rgba(55, 233, 255, 0.62)',
    },
  });

  function getEventBus() {
    if (R.events && typeof R.events.emit === 'function') return R.events;
    if (window.Gelek && window.Gelek.events && typeof window.Gelek.events.emit === 'function') return window.Gelek.events;
    return null;
  }

  function emitEvent(name, detail) {
    const bus = getEventBus();
    if (bus) {
      bus.emit(name, detail);
      return;
    }
    if (typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  }

  function emitError(operation, error, extra) {
    const message = error && error.message ? error.message : String(error);
    emitEvent('multiplayer:error', {
      operation,
      message,
      ...(extra && typeof extra === 'object' ? extra : {}),
    });
  }

  function isAuthenticated() {
    return Boolean(R.currentUid && R.currentUser);
  }

  function normalizeAmount(value, fallback = 1) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(1, Math.floor(num));
  }

  function normalizePositive(value, fallback = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, num);
  }

  function getCurrentUrlNoQuery() {
    const origin = window.location && window.location.origin ? String(window.location.origin) : '';
    const pathname = window.location && window.location.pathname ? String(window.location.pathname) : '/';
    return `${origin}${pathname}`;
  }

  function getCurrentDomain() {
    return window.location && window.location.hostname
      ? String(window.location.hostname).toLowerCase()
      : '';
  }

  function hasRtdbApi() {
    return typeof R.firebaseRead === 'function' && typeof R.firebaseWrite === 'function';
  }

  function getDomainRtdbKey(hostname) {
    return encodeURIComponent(String(hostname || '').toLowerCase());
  }

  async function readDomainFromRtdb(hostname) {
    if (!hasRtdbApi() || !hostname) return null;
    const key = getDomainRtdbKey(hostname);
    const data = await R.firebaseRead(`${RTDB_MULTIPLAYER_DOMAINS_PATH}/${key}`);
    return data && typeof data === 'object' ? data : null;
  }

  async function writeDomainToRtdb(hostname, payload) {
    if (!hasRtdbApi() || !hostname) return null;
    const key = getDomainRtdbKey(hostname);
    const normalized = payload && typeof payload === 'object' ? payload : {};
    await R.firebaseWrite(`${RTDB_MULTIPLAYER_DOMAINS_PATH}/${key}`, normalized, 'PUT');
    return normalized;
  }

  async function readAllDomainsFromRtdb() {
    if (!hasRtdbApi()) return {};
    const data = await R.firebaseRead(RTDB_MULTIPLAYER_DOMAINS_PATH);
    return data && typeof data === 'object' ? data : {};
  }

  function getFirestoreDb() {
    if (R.firestoreDb) return R.firestoreDb;
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      return window.firebase.firestore();
    }
    return null;
  }

  function getServerTimestamp() {
    const firestore = window.firebase && window.firebase.firestore;
    if (firestore && firestore.FieldValue && typeof firestore.FieldValue.serverTimestamp === 'function') {
      return firestore.FieldValue.serverTimestamp();
    }
    return Date.now();
  }

  function ensureFirestoreReady(operation) {
    const db = getFirestoreDb();
    if (!db || typeof db.collection !== 'function') {
      const error = new Error('Firestore not initialized');
      emitError(operation, error, { code: 'firestore-unavailable' });
      throw error;
    }
    return db;
  }

  function safeSessionStorageGet(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSessionStorageSet(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (_) {}
  }

  function safeSessionStorageRemove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (_) {}
  }

  function getFactionOrDefault(value) {
    const key = String(value || '').toLowerCase();
    if (FACTIONS[key]) return FACTIONS[key];
    return FACTIONS.neon;
  }

  function pickFactionFromUid(uid) {
    const variants = Object.keys(FACTIONS);
    if (!uid) return variants[0];
    let score = 0;
    const source = String(uid);
    for (let index = 0; index < source.length; index += 1) {
      score += source.charCodeAt(index);
    }
    return variants[score % variants.length];
  }

  function toStashData(docSnap) {
    const value = docSnap && typeof docSnap.data === 'function' ? docSnap.data() : {};
    return {
      id: docSnap.id,
      url: value.url || '',
      itemType: value.itemType || 'coins',
      amount: normalizeAmount(value.amount, 1),
      hiddenBy: value.hiddenBy || '',
      timestamp: value.timestamp || null,
    };
  }

  function toDomainData(docSnap) {
    if (!docSnap || !docSnap.exists) return null;
    const value = docSnap.data() || {};
    const faction = getFactionOrDefault(value.faction);
    const conquestByUid = value.conquestByUid && typeof value.conquestByUid === 'object'
      ? value.conquestByUid
      : {};

    return {
      id: docSnap.id,
      hostname: value.hostname || docSnap.id,
      kingUid: value.kingUid || '',
      kingName: value.kingName || '',
      faction: faction.id,
      factionName: faction.name,
      factionColor: faction.color,
      defensePoints: normalizePositive(value.defensePoints, 30),
      collectedTax: normalizePositive(value.collectedTax, 0),
      conquestByUid,
      updatedAt: value.updatedAt || null,
    };
  }

  function applyStashReward(stashData) {
    if (!R.state || !stashData) return;

    const amount = normalizeAmount(stashData.amount, 1);
    const itemType = String(stashData.itemType || '').toLowerCase();

    if (itemType === 'coins') {
      R.state.coins = Math.max(0, Number(R.state.coins) || 0) + amount;
      if (R.multiplayer && typeof R.multiplayer.reportEarnings === 'function') {
        R.multiplayer.reportEarnings({ coins: amount }).catch(() => {});
      }
    } else if (itemType === 'xp') {
      if (typeof R.gainXP === 'function') {
        R.gainXP(amount);
      } else {
        R.state.xp = Math.max(0, Number(R.state.xp) || 0) + amount;
      }
    } else if (itemType === 'food') {
      R.state.hunger = R.clamp((Number(R.state.hunger) || 0) + amount, 0, 100);
      R.state.foodCollected = Math.max(0, Number(R.state.foodCollected) || 0) + 1;
    } else if (itemType === 'hp') {
      const hpMax = R.getEffectiveHpMax ? R.getEffectiveHpMax() : (R.CONFIG ? R.CONFIG.HP_MAX : 100);
      R.state.hp = R.clamp((Number(R.state.hp) || 0) + amount, 0, hpMax);
    } else {
      R.state.inventory = (R.state.inventory && typeof R.state.inventory === 'object') ? R.state.inventory : {};
      const prev = Math.max(0, Number(R.state.inventory[itemType]) || 0);
      R.state.inventory[itemType] = prev + amount;
    }

    if (typeof R.persistState === 'function') R.persistState();
    if (typeof R.updateUI === 'function') R.updateUI();
  }

  const multiplayer = R.multiplayer && typeof R.multiplayer === 'object' ? R.multiplayer : {};

  multiplayer.factions = FACTIONS;
  multiplayer.initialized = Boolean(multiplayer.initialized);
  multiplayer.flushTimer = multiplayer.flushTimer || null;
  multiplayer.lastFlushAt = multiplayer.lastFlushAt || Date.now();
  multiplayer.currentDomainState = multiplayer.currentDomainState || null;
  multiplayer.playerFaction = multiplayer.playerFaction || 'neon';
  multiplayer.disabledReason = multiplayer.disabledReason || '';
  multiplayer.factionDominance = multiplayer.factionDominance || null;
  multiplayer.factionKings = multiplayer.factionKings || null;
  multiplayer.lastWarStatsFetchAt = multiplayer.lastWarStatsFetchAt || 0;

  multiplayer.isAvailable = function isAvailable() {
    if (multiplayer.disabledReason && multiplayer.disabledReason !== 'firestore-unavailable') return false;
    const db = getFirestoreDb();
    if (db && typeof db.collection === 'function') return true;
    return hasRtdbApi();
  };

  multiplayer.getFactionTheme = function getFactionTheme(factionId) {
    return getFactionOrDefault(factionId);
  };

  multiplayer.getPlayerFaction = function getPlayerFaction() {
    return getFactionOrDefault(multiplayer.playerFaction);
  };

  multiplayer.getCurrentDomainState = function getCurrentDomainState() {
    return multiplayer.currentDomainState;
  };

  multiplayer.getDomainStatus = function getDomainStatus(domainState) {
    const state = domainState || multiplayer.currentDomainState;
    const currentUid = String(R.currentUid || '');
    const playerFaction = multiplayer.getPlayerFaction().id;

    if (!state || !state.kingUid) {
      return {
        status: 'neutral',
        message: 'Ziemia Niczyja (Brak podatku)',
        taxable: false,
      };
    }

    if (String(state.kingUid) === currentUid || (state.faction && state.faction === playerFaction)) {
      return {
        status: 'allied',
        message: 'Terytorium Sojusznicze (+10% Drop)',
        taxable: false,
      };
    }

    return {
      status: 'hostile',
      message: 'Strefa Wroga (Opłacasz podatek)',
      taxable: true,
    };
  };

  function getDomainCacheKey(hostname) {
    return `gelek_domain_cache_v1:${hostname}`;
  }

  function getWarCacheKey() {
    return 'gelek_war_cache_v1';
  }

  function readDomainCache(hostname) {
    const raw = safeSessionStorageGet(getDomainCacheKey(hostname));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.cachedAt || Date.now() - parsed.cachedAt > DOMAIN_CACHE_TTL_MS) return null;
      return parsed.data || null;
    } catch (_) {
      return null;
    }
  }

  function writeDomainCache(hostname, data) {
    safeSessionStorageSet(getDomainCacheKey(hostname), JSON.stringify({
      cachedAt: Date.now(),
      data,
    }));
  }

  function clearDomainCache(hostname) {
    if (!hostname) return;
    safeSessionStorageRemove(getDomainCacheKey(hostname));
  }

  function readWarCache() {
    const raw = safeSessionStorageGet(getWarCacheKey());
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.cachedAt || Date.now() - parsed.cachedAt > WAR_CACHE_TTL_MS) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeWarCache(data) {
    safeSessionStorageSet(getWarCacheKey(), JSON.stringify({
      cachedAt: Date.now(),
      ...data,
    }));
  }

  multiplayer.ensurePlayerFaction = async function ensurePlayerFaction() {
    if (!isAuthenticated()) return getFactionOrDefault('neon');

    try {
      const profile = await R.firebaseRead(`users/${R.currentUid}/profile`);
      let factionId = profile && profile.faction ? String(profile.faction).toLowerCase() : '';
      if (!FACTIONS[factionId]) {
        factionId = pickFactionFromUid(R.currentUid);
        await R.firebaseWrite(`users/${R.currentUid}/profile/faction`, factionId, 'PUT');
      }

      multiplayer.playerFaction = factionId;
      if (R.state) {
        R.state.profileFaction = factionId;
      }

      emitEvent('multiplayer:faction_ready', {
        uid: R.currentUid,
        faction: factionId,
        theme: getFactionOrDefault(factionId),
      });

      return getFactionOrDefault(factionId);
    } catch (error) {
      emitError('ensurePlayerFaction', error);
      multiplayer.playerFaction = pickFactionFromUid(R.currentUid);
      return getFactionOrDefault(multiplayer.playerFaction);
    }
  };

  multiplayer.hideStash = async function hideStash(itemType, amount) {
    if (!isAuthenticated()) {
      const error = new Error('User not authenticated');
      emitError('hideStash', error);
      throw error;
    }

    const db = ensureFirestoreReady('hideStash');
    const currentUrl = getCurrentUrlNoQuery();
    const stashPayload = {
      url: currentUrl,
      itemType: String(itemType || 'coins').toLowerCase(),
      amount: normalizeAmount(amount, 1),
      hiddenBy: String(R.currentUid),
      timestamp: getServerTimestamp(),
    };

    const ref = db.collection(URL_DROPS_COLLECTION).doc();
    await ref.set(stashPayload);
    const result = { id: ref.id, ...stashPayload };
    emitEvent('multiplayer:stash_hidden', result);
    return result;
  };

  multiplayer.checkForStash = async function checkForStash() {
    if (!isAuthenticated()) return null;

    const db = ensureFirestoreReady('checkForStash');
    const currentUrl = getCurrentUrlNoQuery();
    const snapshot = await db
      .collection(URL_DROPS_COLLECTION)
      .where('url', '==', currentUrl)
      .limit(10)
      .get();

    if (!snapshot || snapshot.empty) return null;

    let found = null;
    snapshot.forEach((docSnap) => {
      if (found) return;
      const stashData = toStashData(docSnap);
      if (stashData.hiddenBy !== String(R.currentUid)) {
        found = stashData;
      }
    });

    if (found) {
      emitEvent('multiplayer:stash_found', found);
    }

    return found;
  };

  multiplayer.claimStash = async function claimStash(stashId) {
    if (!isAuthenticated()) throw new Error('User not authenticated');
    if (!stashId) throw new Error('Missing stashId');

    const db = ensureFirestoreReady('claimStash');
    const stashData = await db.runTransaction(async (tx) => {
      const ref = db.collection(URL_DROPS_COLLECTION).doc(String(stashId));
      const snap = await tx.get(ref);

      if (!snap.exists) throw new Error('Stash already claimed');

      const data = toStashData(snap);
      if (data.hiddenBy === String(R.currentUid)) throw new Error('Cannot claim your own stash');

      tx.delete(ref);
      return data;
    });

    applyStashReward(stashData);
    emitEvent('multiplayer:stash_claimed', stashData);
    return stashData;
  };

  multiplayer.getDomainControl = async function getDomainControl(options = {}) {
    const force = Boolean(options.force);
    const hostname = options.hostname ? String(options.hostname).toLowerCase() : getCurrentDomain();
    if (!hostname) return null;

    if (!force) {
      const cached = readDomainCache(hostname);
      if (cached) {
        multiplayer.currentDomainState = cached;
        return cached;
      }
    }

    const db = getFirestoreDb();
    let domainData = null;
    if (db && typeof db.collection === 'function') {
      const ref = db.collection(DOMAINS_COLLECTION).doc(hostname);
      const snap = await ref.get();
      domainData = toDomainData(snap);
    } else if (hasRtdbApi()) {
      const raw = await readDomainFromRtdb(hostname);
      if (raw && typeof raw === 'object') {
        const faction = getFactionOrDefault(raw.faction);
        domainData = {
          id: hostname,
          hostname: raw.hostname || hostname,
          kingUid: raw.kingUid || '',
          kingName: raw.kingName || '',
          faction: faction.id,
          factionName: faction.name,
          factionColor: faction.color,
          defensePoints: normalizePositive(raw.defensePoints, 30),
          collectedTax: normalizePositive(raw.collectedTax, 0),
          conquestByUid: raw.conquestByUid && typeof raw.conquestByUid === 'object' ? raw.conquestByUid : {},
          updatedAt: raw.updatedAt || null,
          timeSpent: normalizePositive(raw.timeSpent, 0),
          timeByUid: raw.timeByUid && typeof raw.timeByUid === 'object' ? raw.timeByUid : {},
        };
      }
    }

    if (!domainData) {
      const playerFaction = multiplayer.getPlayerFaction().id;
      domainData = {
        hostname,
        kingUid: '',
        kingName: '',
        faction: playerFaction,
        factionName: multiplayer.getPlayerFaction().name,
        factionColor: multiplayer.getPlayerFaction().color,
        defensePoints: 30,
        collectedTax: 0,
        conquestByUid: {},
      };
    }

    multiplayer.currentDomainState = domainData;
    writeDomainCache(hostname, domainData);
    emitEvent('multiplayer:domain_updated', domainData);
    return domainData;
  };

  multiplayer.getDomainKing = async function getDomainKing() {
    const domainData = await multiplayer.getDomainControl({ force: false });
    if (!domainData) return null;

    if (domainData.kingUid && domainData.kingUid !== String(R.currentUid || '')) {
      emitEvent('multiplayer:king_present', domainData);
    }

    return domainData;
  };

  multiplayer.claimNeutralDomain = async function claimNeutralDomain() {
    if (!isAuthenticated()) throw new Error('User not authenticated');
    if (multiplayer.disabledReason === 'firestore-unavailable') {
      multiplayer.disabledReason = '';
    }

    const hostname = getCurrentDomain();
    if (!hostname) throw new Error('Brak hosta domeny');

    const playerFaction = multiplayer.getPlayerFaction().id;
    const db = getFirestoreDb();
    let claimed;
    if (db && typeof db.collection === 'function') {
      claimed = await db.runTransaction(async (tx) => {
        const ref = db.collection(DOMAINS_COLLECTION).doc(hostname);
        const snap = await tx.get(ref);
        const current = snap.exists ? (snap.data() || {}) : {};

        if (current.kingUid) {
          throw new Error('Domena już ma władcę');
        }

        const payload = {
          hostname,
          kingUid: String(R.currentUid),
          kingName: String(R.currentUser || R.currentUid),
          faction: playerFaction,
          defensePoints: 100,
          collectedTax: 0,
          timeSpent: normalizePositive(current.timeSpent, 0),
          timeByUid: current.timeByUid && typeof current.timeByUid === 'object' ? current.timeByUid : {},
          conquestByUid: current.conquestByUid && typeof current.conquestByUid === 'object' ? current.conquestByUid : {},
          updatedAt: getServerTimestamp(),
        };

        tx.set(ref, payload, { merge: true });
        return payload;
      });
    } else if (hasRtdbApi()) {
      const current = await readDomainFromRtdb(hostname) || {};
      if (current.kingUid) throw new Error('Domena już ma władcę');
      claimed = {
        hostname,
        kingUid: String(R.currentUid),
        kingName: String(R.currentUser || R.currentUid),
        faction: playerFaction,
        defensePoints: 100,
        collectedTax: 0,
        timeSpent: normalizePositive(current.timeSpent, 0),
        timeByUid: current.timeByUid && typeof current.timeByUid === 'object' ? current.timeByUid : {},
        conquestByUid: current.conquestByUid && typeof current.conquestByUid === 'object' ? current.conquestByUid : {},
        updatedAt: Date.now(),
      };
      await writeDomainToRtdb(hostname, claimed);
    } else {
      throw new Error('Multiplayer chwilowo niedostępny');
    }

    const nextState = {
      ...claimed,
      factionName: getFactionOrDefault(claimed.faction).name,
      factionColor: getFactionOrDefault(claimed.faction).color,
    };

    clearDomainCache(hostname);
    multiplayer.currentDomainState = nextState;
    writeDomainCache(hostname, nextState);

    emitEvent('multiplayer:domain_updated', nextState);
    emitEvent('multiplayer:domain_conquered', nextState);
    return nextState;
  };

  multiplayer.reportEarnings = async function reportEarnings(payload) {
    if (!isAuthenticated()) return null;

    const gains = payload && typeof payload === 'object' ? payload : {};
    const xpGain = normalizePositive(gains.xp, 0);
    const coinGain = normalizePositive(gains.coins, 0);
    if (xpGain <= 0 && coinGain <= 0) return null;

    const domainData = multiplayer.currentDomainState || await multiplayer.getDomainControl({ force: false });
    const domainStatus = multiplayer.getDomainStatus(domainData);
    if (!domainData || domainStatus.status !== 'hostile') return null;

    const taxFromXp = Math.max(0, Math.floor(xpGain * TAX_RATE));
    const taxFromCoins = Math.max(0, Math.floor(coinGain * TAX_RATE));
    const totalTax = taxFromXp + taxFromCoins;
    if (totalTax <= 0) return null;

    const hostname = getCurrentDomain();
    if (!hostname) return null;

    const db = getFirestoreDb();
    if (db && typeof db.collection === 'function') {
      const ref = db.collection(DOMAINS_COLLECTION).doc(hostname);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;

        const current = snap.data() || {};
        const currentTax = normalizePositive(current.collectedTax, 0);
        tx.set(ref, {
          collectedTax: currentTax + totalTax,
          updatedAt: getServerTimestamp(),
        }, { merge: true });
      });
    } else if (hasRtdbApi()) {
      const current = await readDomainFromRtdb(hostname);
      if (!current || !current.kingUid) return null;
      const currentTax = normalizePositive(current.collectedTax, 0);
      await writeDomainToRtdb(hostname, {
        ...current,
        collectedTax: currentTax + totalTax,
        updatedAt: Date.now(),
      });
    } else {
      return null;
    }

    emitEvent('multiplayer:tax_paid', {
      hostname,
      totalTax,
      xpTax: taxFromXp,
      coinTax: taxFromCoins,
    });

    return totalTax;
  };

  multiplayer.collectPendingTax = async function collectPendingTax() {
    if (!isAuthenticated()) return 0;
    const db = getFirestoreDb();

    let totalCollected = 0;
    const updates = [];

    if (db && typeof db.collection === 'function') {
      const snapshot = await db
        .collection(DOMAINS_COLLECTION)
        .where('kingUid', '==', String(R.currentUid))
        .limit(200)
        .get();

      if (!snapshot || snapshot.empty) return 0;
      snapshot.forEach((docSnap) => {
        const value = docSnap.data() || {};
        const tax = normalizePositive(value.collectedTax, 0);
        if (tax <= 0) return;
        totalCollected += tax;
        updates.push({ ref: docSnap.ref });
      });
    } else if (hasRtdbApi()) {
      const all = await readAllDomainsFromRtdb();
      Object.keys(all).forEach((key) => {
        const value = all[key] || {};
        if (String(value.kingUid || '') !== String(R.currentUid)) return;
        const tax = normalizePositive(value.collectedTax, 0);
        if (tax <= 0) return;
        totalCollected += tax;
        updates.push({ key, value });
      });
    } else {
      return 0;
    }

    if (totalCollected <= 0) return 0;

    if (db && typeof db.collection === 'function') {
      const batch = db.batch();
      updates.forEach((item) => {
        batch.set(item.ref, {
          collectedTax: 0,
          updatedAt: getServerTimestamp(),
        }, { merge: true });
      });
      await batch.commit();
    } else {
      await Promise.all(updates.map((item) => R.firebaseWrite(
        `${RTDB_MULTIPLAYER_DOMAINS_PATH}/${item.key}`,
        {
          ...item.value,
          collectedTax: 0,
          updatedAt: Date.now(),
        },
        'PUT'
      )));
    }

    if (R.state) {
      R.state.coins = Math.max(0, Number(R.state.coins) || 0) + Math.floor(totalCollected);
      if (typeof R.persistState === 'function') R.persistState();
      if (typeof R.updateUI === 'function') R.updateUI();
    }

    emitEvent('multiplayer:tax_collected', {
      amount: Math.floor(totalCollected),
      domains: updates.length,
    });

    return Math.floor(totalCollected);
  };

  multiplayer.updateDomainTime = async function updateDomainTime(minutes) {
    if (!isAuthenticated()) return null;

    const addMinutes = Math.max(0, Number(minutes) || 0);
    if (addMinutes <= 0) return null;

    const db = ensureFirestoreReady('updateDomainTime');
    const hostname = getCurrentDomain();
    if (!hostname) return null;

    const playerFaction = multiplayer.getPlayerFaction().id;
    const result = await db.runTransaction(async (tx) => {
      const ref = db.collection(DOMAINS_COLLECTION).doc(hostname);
      const snap = await tx.get(ref);
      const previous = snap.exists ? (snap.data() || {}) : {};
      const timeByUid = previous.timeByUid && typeof previous.timeByUid === 'object'
        ? { ...previous.timeByUid }
        : {};

      const currentUid = String(R.currentUid);
      const prevValue = normalizePositive(timeByUid[currentUid], 0);
      timeByUid[currentUid] = prevValue + addMinutes;

      let kingUid = previous.kingUid || currentUid;
      let kingName = previous.kingName || String(R.currentUser || currentUid);
      let kingTime = normalizePositive(previous.timeSpent, 0);

      Object.keys(timeByUid).forEach((uid) => {
        const value = normalizePositive(timeByUid[uid], 0);
        if (value > kingTime || (uid === currentUid && value === kingTime)) {
          kingTime = value;
          kingUid = uid;
        }
      });

      let faction = previous.faction || playerFaction;
      if (kingUid === currentUid) {
        kingName = String(R.currentUser || kingUid);
        faction = playerFaction;
      }

      const payload = {
        hostname,
        kingUid,
        kingName,
        faction,
        timeSpent: kingTime,
        defensePoints: normalizePositive(previous.defensePoints, 30),
        collectedTax: normalizePositive(previous.collectedTax, 0),
        timeByUid,
        conquestByUid: previous.conquestByUid && typeof previous.conquestByUid === 'object'
          ? previous.conquestByUid
          : {},
        updatedAt: getServerTimestamp(),
      };

      tx.set(ref, payload, { merge: true });
      return payload;
    });

    multiplayer.currentDomainState = {
      ...result,
      factionName: getFactionOrDefault(result.faction).name,
      factionColor: getFactionOrDefault(result.faction).color,
    };
    writeDomainCache(hostname, multiplayer.currentDomainState);

    emitEvent('multiplayer:domain_time_updated', multiplayer.currentDomainState);
    return multiplayer.currentDomainState;
  };

  multiplayer.tickConquest = async function tickConquest(minutes = 1) {
    if (!isAuthenticated()) return null;

    const points = Math.max(1, Math.round((Number(minutes) || 1) * CONQUEST_POINTS_PER_MINUTE));
    const db = ensureFirestoreReady('tickConquest');
    const hostname = getCurrentDomain();
    if (!hostname) return null;

    const playerFaction = multiplayer.getPlayerFaction().id;
    const result = await db.runTransaction(async (tx) => {
      const ref = db.collection(DOMAINS_COLLECTION).doc(hostname);
      const snap = await tx.get(ref);
      const previous = snap.exists ? (snap.data() || {}) : {};

      const currentUid = String(R.currentUid);
      const conquestByUid = previous.conquestByUid && typeof previous.conquestByUid === 'object'
        ? { ...previous.conquestByUid }
        : {};

      conquestByUid[currentUid] = normalizePositive(conquestByUid[currentUid], 0) + points;

      let kingUid = previous.kingUid || '';
      let kingName = previous.kingName || '';
      let faction = previous.faction || playerFaction;
      let defensePoints = normalizePositive(previous.defensePoints, 30);
      let captured = false;

      if (!kingUid) {
        kingUid = currentUid;
        kingName = String(R.currentUser || currentUid);
        faction = playerFaction;
        defensePoints = Math.max(30, points + 10);
        conquestByUid[currentUid] = 0;
        captured = true;
      } else if (kingUid !== currentUid) {
        const contenderPoints = normalizePositive(conquestByUid[currentUid], 0);
        if (contenderPoints > defensePoints) {
          kingUid = currentUid;
          kingName = String(R.currentUser || currentUid);
          faction = playerFaction;
          defensePoints = Math.max(28, Math.round(contenderPoints * 0.72));
          conquestByUid[currentUid] = 0;
          captured = true;
        }
      } else {
        defensePoints += Math.max(1, Math.round(points * 0.4));
      }

      const payload = {
        hostname,
        kingUid,
        kingName,
        faction,
        defensePoints,
        collectedTax: normalizePositive(previous.collectedTax, 0),
        timeSpent: normalizePositive(previous.timeSpent, 0),
        timeByUid: previous.timeByUid && typeof previous.timeByUid === 'object' ? previous.timeByUid : {},
        conquestByUid,
        updatedAt: getServerTimestamp(),
        _captured: captured,
      };

      tx.set(ref, payload, { merge: true });
      return payload;
    });

    const domainState = {
      ...result,
      factionName: getFactionOrDefault(result.faction).name,
      factionColor: getFactionOrDefault(result.faction).color,
    };

    multiplayer.currentDomainState = domainState;
    writeDomainCache(hostname, domainState);
    emitEvent('multiplayer:domain_updated', domainState);

    if (result._captured) {
      emitEvent('multiplayer:domain_conquered', domainState);
    }

    return domainState;
  };

  multiplayer.fortifyDomain = async function fortifyDomain(amount = 10) {
    if (!isAuthenticated() || !R.state) return null;

    const fortifyCost = normalizeAmount(amount, 10);
    if ((Number(R.state.coins) || 0) < fortifyCost) {
      throw new Error('Za mało monet na fortyfikację');
    }

    const domainState = multiplayer.currentDomainState || await multiplayer.getDomainControl({ force: true });
    if (!domainState) throw new Error('Brak danych domeny');
    if (domainState.kingUid !== String(R.currentUid)) {
      throw new Error('Możesz fortyfikować tylko własną domenę');
    }

    const db = ensureFirestoreReady('fortifyDomain');
    const hostname = getCurrentDomain();

    await db.runTransaction(async (tx) => {
      const ref = db.collection(DOMAINS_COLLECTION).doc(hostname);
      const snap = await tx.get(ref);
      const current = snap.exists ? (snap.data() || {}) : {};
      const currentDefense = normalizePositive(current.defensePoints, 30);

      tx.set(ref, {
        defensePoints: currentDefense + fortifyCost,
        updatedAt: getServerTimestamp(),
      }, { merge: true });
    });

    R.state.coins -= fortifyCost;
    if (typeof R.persistState === 'function') R.persistState();
    if (typeof R.updateUI === 'function') R.updateUI();

    const refreshed = await multiplayer.getDomainControl({ force: true });
    emitEvent('multiplayer:fortified', {
      hostname,
      spent: fortifyCost,
      domain: refreshed,
    });
    return refreshed;
  };

  multiplayer.sabotageDomain = async function sabotageDomain() {
    if (!isAuthenticated() || !R.state) return null;

    const domainState = multiplayer.currentDomainState || await multiplayer.getDomainControl({ force: true });
    if (!domainState) throw new Error('Brak danych domeny');
    if (!domainState.kingUid || domainState.kingUid === String(R.currentUid)) {
      throw new Error('Sabotaż działa tylko na wrogiej domenie');
    }

    const inventory = (R.state.inventory && typeof R.state.inventory === 'object') ? R.state.inventory : {};
    const kits = normalizePositive(inventory.sabotage_kit, 0);
    if (kits < 1) {
      throw new Error('Brak itemu sabotage_kit');
    }

    const sabotagePower = 18;
    const db = ensureFirestoreReady('sabotageDomain');
    const hostname = getCurrentDomain();

    await db.runTransaction(async (tx) => {
      const ref = db.collection(DOMAINS_COLLECTION).doc(hostname);
      const snap = await tx.get(ref);
      if (!snap.exists) return;

      const current = snap.data() || {};
      const currentDefense = normalizePositive(current.defensePoints, 20);
      const nextDefense = Math.max(8, currentDefense - sabotagePower);
      tx.set(ref, {
        defensePoints: nextDefense,
        updatedAt: getServerTimestamp(),
      }, { merge: true });
    });

    inventory.sabotage_kit = Math.max(0, kits - 1);
    R.state.inventory = inventory;

    if (typeof R.persistState === 'function') R.persistState();
    if (typeof R.updateUI === 'function') R.updateUI();

    const refreshed = await multiplayer.getDomainControl({ force: true });
    emitEvent('multiplayer:sabotaged', {
      hostname,
      used: 1,
      domain: refreshed,
    });
    return refreshed;
  };

  multiplayer.getFactionDominance = async function getFactionDominance(force = false) {
    if (!force) {
      const cache = readWarCache();
      if (cache && cache.factionDominance) {
        multiplayer.factionDominance = cache.factionDominance;
        multiplayer.lastWarStatsFetchAt = cache.cachedAt || Date.now();
        return multiplayer.factionDominance;
      }
    }

    const db = getFirestoreDb();
    const counts = { neon: 0, toxic: 0, plasma: 0 };
    let total = 0;

    if (db && typeof db.collection === 'function') {
      const snapshot = await db.collection(DOMAINS_COLLECTION).limit(500).get();
      if (snapshot && !snapshot.empty) {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          if (!data.kingUid) return;
          const faction = getFactionOrDefault(data.faction).id;
          counts[faction] += 1;
          total += 1;
        });
      }
    } else if (hasRtdbApi()) {
      const all = await readAllDomainsFromRtdb();
      Object.keys(all).forEach((key) => {
        const data = all[key] || {};
        if (!data.kingUid) return;
        const faction = getFactionOrDefault(data.faction).id;
        counts[faction] += 1;
        total += 1;
      });
    }

    const domination = {
      total,
      factions: Object.keys(FACTIONS).map((id) => ({
        id,
        name: FACTIONS[id].name,
        color: FACTIONS[id].color,
        emoji: FACTIONS[id].emoji,
        count: counts[id],
        percent: total > 0 ? Math.round((counts[id] / total) * 1000) / 10 : 0,
      })),
    };

    multiplayer.factionDominance = domination;
    multiplayer.lastWarStatsFetchAt = Date.now();
    writeWarCache({
      factionDominance: domination,
      factionKings: multiplayer.factionKings,
    });

    return domination;
  };

  multiplayer.getTopFactionKings = async function getTopFactionKings(force = false) {
    if (!force) {
      const cache = readWarCache();
      if (cache && cache.factionKings) {
        multiplayer.factionKings = cache.factionKings;
        multiplayer.lastWarStatsFetchAt = cache.cachedAt || Date.now();
        return multiplayer.factionKings;
      }
    }

    const result = {};

    const db = getFirestoreDb();
    const factionIds = Object.keys(FACTIONS);
    await Promise.all(factionIds.map(async (factionId) => {
      const rows = [];
      if (db && typeof db.collection === 'function') {
        const snapshot = await db
          .collection(DOMAINS_COLLECTION)
          .where('faction', '==', factionId)
          .limit(50)
          .get();

        if (snapshot && !snapshot.empty) {
          snapshot.forEach((docSnap) => {
            const value = docSnap.data() || {};
            if (!value.kingUid) return;
            rows.push({
              hostname: value.hostname || docSnap.id,
              kingUid: value.kingUid,
              kingName: value.kingName || value.kingUid,
              defensePoints: normalizePositive(value.defensePoints, 0),
              collectedTax: normalizePositive(value.collectedTax, 0),
            });
          });
        }
      } else if (hasRtdbApi()) {
        const all = await readAllDomainsFromRtdb();
        Object.keys(all).forEach((key) => {
          const value = all[key] || {};
          if (!value.kingUid) return;
          if (String(value.faction || '') !== factionId) return;
          rows.push({
            hostname: value.hostname || decodeURIComponent(key),
            kingUid: value.kingUid,
            kingName: value.kingName || value.kingUid,
            defensePoints: normalizePositive(value.defensePoints, 0),
            collectedTax: normalizePositive(value.collectedTax, 0),
          });
        });
      }

      rows.sort((a, b) => {
        if (b.defensePoints !== a.defensePoints) return b.defensePoints - a.defensePoints;
        return b.collectedTax - a.collectedTax;
      });

      result[factionId] = rows.slice(0, 3);
    }));

    multiplayer.factionKings = result;
    multiplayer.lastWarStatsFetchAt = Date.now();
    writeWarCache({
      factionDominance: multiplayer.factionDominance,
      factionKings: result,
    });

    return result;
  };

  multiplayer.refreshWarStats = async function refreshWarStats(force = false) {
    const now = Date.now();
    if (!force && multiplayer.lastWarStatsFetchAt && now - multiplayer.lastWarStatsFetchAt < WAR_CACHE_TTL_MS) {
      return {
        dominance: multiplayer.factionDominance,
        kings: multiplayer.factionKings,
      };
    }

    const [dominance, kings] = await Promise.all([
      multiplayer.getFactionDominance(force),
      multiplayer.getTopFactionKings(force),
    ]);

    emitEvent('multiplayer:war_stats_updated', {
      dominance,
      kings,
    });

    return { dominance, kings };
  };

  multiplayer.flushDomainTime = async function flushDomainTime() {
    if (!multiplayer.initialized || !isAuthenticated()) return;

    const now = Date.now();
    const elapsedMs = Math.max(0, now - (multiplayer.lastFlushAt || now));
    multiplayer.lastFlushAt = now;

    const elapsedMinutes = elapsedMs / 60000;
    if (elapsedMinutes < 0.2) return;

    try {
      await multiplayer.updateDomainTime(elapsedMinutes);
    } catch (_) {}
  };

  multiplayer.init = async function init() {
    if (multiplayer.initialized) return;
    multiplayer.initialized = true;
    multiplayer.lastFlushAt = Date.now();

    try {
      const db = getFirestoreDb();
      if (!db || typeof db.collection !== 'function') {
        if (!hasRtdbApi()) {
          multiplayer.disabledReason = 'firestore-unavailable';
          emitEvent('multiplayer:disabled', {
            reason: 'firestore-unavailable',
          });
          return;
        }
      }
      multiplayer.disabledReason = '';
      await multiplayer.ensurePlayerFaction();

      const [domainState, stashState] = await Promise.allSettled([
        multiplayer.getDomainControl({ force: false }),
        multiplayer.checkForStash(),
      ]);

      if (domainState.status === 'fulfilled' && domainState.value && domainState.value.kingUid && domainState.value.kingUid !== String(R.currentUid || '')) {
        emitEvent('multiplayer:king_present', domainState.value);
      }
      if (stashState.status === 'fulfilled' && stashState.value) {
        emitEvent('multiplayer:stash_found', stashState.value);
      }

      await multiplayer.collectPendingTax().catch(() => {});
      await multiplayer.refreshWarStats(false).catch(() => {});

      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          multiplayer.flushDomainTime().catch(() => {});
        } else if (document.visibilityState === 'visible') {
          multiplayer.getDomainControl({ force: true }).catch(() => {});
        }
      };

      window.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('beforeunload', () => {
        multiplayer.flushDomainTime().catch(() => {});
      });

      if (!multiplayer.flushTimer) {
        multiplayer.flushTimer = setInterval(() => {
          multiplayer.flushDomainTime().catch(() => {});
        }, MULTIPLAYER_FLUSH_INTERVAL_MS);
      }

      emitEvent('multiplayer:ready', {
        uid: R.currentUid || '',
        domain: getCurrentDomain(),
        url: getCurrentUrlNoQuery(),
        faction: multiplayer.playerFaction,
      });
    } catch (error) {
      multiplayer.initialized = false;
      multiplayer.disabledReason = '';
      emitError('init', error);
      throw error;
    }
  };

  R.multiplayer = multiplayer;
})();
