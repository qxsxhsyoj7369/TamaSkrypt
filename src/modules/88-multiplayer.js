(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R) return;

  const URL_DROPS_COLLECTION = 'url_drops';
  const DOMAIN_KINGS_COLLECTION = 'domain_kings';
  const MULTIPLAYER_FLUSH_INTERVAL_MS = 60 * 1000;

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

  function applyStashReward(stashData) {
    if (!R.state || !stashData) return;

    const amount = normalizeAmount(stashData.amount, 1);
    const itemType = String(stashData.itemType || '').toLowerCase();

    if (itemType === 'coins') {
      R.state.coins = Math.max(0, Number(R.state.coins) || 0) + amount;
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

  function toDomainKingData(docSnap) {
    if (!docSnap || !docSnap.exists) return null;
    const value = docSnap.data() || {};
    return {
      id: docSnap.id,
      domain: value.domain || docSnap.id,
      kingUid: value.kingUid || '',
      kingName: value.kingName || '',
      timeSpent: Math.max(0, Number(value.timeSpent) || 0),
      taxCollected: Math.max(0, Number(value.taxCollected) || 0),
      updatedAt: value.updatedAt || null,
    };
  }

  const multiplayer = R.multiplayer && typeof R.multiplayer === 'object' ? R.multiplayer : {};

  multiplayer.initialized = Boolean(multiplayer.initialized);
  multiplayer.flushTimer = multiplayer.flushTimer || null;
  multiplayer.lastFlushAt = multiplayer.lastFlushAt || Date.now();

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

    try {
      const ref = db.collection(URL_DROPS_COLLECTION).doc();
      await ref.set(stashPayload);
      const result = { id: ref.id, ...stashPayload };
      emitEvent('multiplayer:stash_hidden', result);
      return result;
    } catch (error) {
      emitError('hideStash', error, { url: currentUrl });
      throw error;
    }
  };

  multiplayer.checkForStash = async function checkForStash() {
    if (!isAuthenticated()) return null;

    const db = ensureFirestoreReady('checkForStash');
    const currentUrl = getCurrentUrlNoQuery();

    try {
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
    } catch (error) {
      emitError('checkForStash', error, { url: currentUrl });
      throw error;
    }
  };

  multiplayer.claimStash = async function claimStash(stashId) {
    if (!isAuthenticated()) {
      const error = new Error('User not authenticated');
      emitError('claimStash', error);
      throw error;
    }

    if (!stashId) {
      const error = new Error('Missing stashId');
      emitError('claimStash', error);
      throw error;
    }

    const db = ensureFirestoreReady('claimStash');

    try {
      const stashData = await db.runTransaction(async (tx) => {
        const ref = db.collection(URL_DROPS_COLLECTION).doc(String(stashId));
        const snap = await tx.get(ref);

        if (!snap.exists) {
          throw new Error('Stash already claimed');
        }

        const data = toStashData(snap);
        if (data.hiddenBy === String(R.currentUid)) {
          throw new Error('Cannot claim your own stash');
        }

        tx.delete(ref);
        return data;
      });

      applyStashReward(stashData);
      emitEvent('multiplayer:stash_claimed', stashData);
      return stashData;
    } catch (error) {
      emitError('claimStash', error, { stashId: String(stashId) });
      throw error;
    }
  };

  multiplayer.updateDomainTime = async function updateDomainTime(minutes) {
    if (!isAuthenticated()) return null;

    const addMinutes = Math.max(0, Number(minutes) || 0);
    if (addMinutes <= 0) return null;

    const db = ensureFirestoreReady('updateDomainTime');
    const domain = getCurrentDomain();
    if (!domain) return null;

    try {
      const result = await db.runTransaction(async (tx) => {
        const ref = db.collection(DOMAIN_KINGS_COLLECTION).doc(domain);
        const snap = await tx.get(ref);
        const previous = snap.exists ? (snap.data() || {}) : {};
        const timeByUid = previous.timeByUid && typeof previous.timeByUid === 'object'
          ? { ...previous.timeByUid }
          : {};

        const currentUid = String(R.currentUid);
        const prevValue = Math.max(0, Number(timeByUid[currentUid]) || 0);
        timeByUid[currentUid] = prevValue + addMinutes;

        let kingUid = previous.kingUid || currentUid;
        let kingName = previous.kingName || String(R.currentUser || currentUid);
        let kingTime = Math.max(0, Number(previous.timeSpent) || 0);

        Object.keys(timeByUid).forEach((uid) => {
          const value = Math.max(0, Number(timeByUid[uid]) || 0);
          if (value > kingTime || (uid === currentUid && value === kingTime)) {
            kingTime = value;
            kingUid = uid;
          }
        });

        if (kingUid === currentUid) {
          kingName = String(R.currentUser || kingUid);
        }

        const payload = {
          domain,
          kingUid,
          kingName,
          timeSpent: kingTime,
          taxCollected: Math.max(0, Number(previous.taxCollected) || 0),
          timeByUid,
          updatedAt: getServerTimestamp(),
        };

        tx.set(ref, payload, { merge: true });
        return payload;
      });

      emitEvent('multiplayer:domain_time_updated', result);
      return result;
    } catch (error) {
      emitError('updateDomainTime', error, { domain: getCurrentDomain() });
      throw error;
    }
  };

  multiplayer.getDomainKing = async function getDomainKing() {
    const db = ensureFirestoreReady('getDomainKing');
    const domain = getCurrentDomain();
    if (!domain) return null;

    try {
      const docSnap = await db.collection(DOMAIN_KINGS_COLLECTION).doc(domain).get();
      const kingData = toDomainKingData(docSnap);
      if (!kingData) return null;

      if (kingData.kingUid && kingData.kingUid !== String(R.currentUid || '')) {
        emitEvent('multiplayer:king_present', kingData);
      }

      return kingData;
    } catch (error) {
      emitError('getDomainKing', error, { domain });
      throw error;
    }
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
      ensureFirestoreReady('init');
      await Promise.allSettled([
        multiplayer.checkForStash(),
        multiplayer.getDomainKing(),
      ]);

      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          multiplayer.flushDomainTime().catch(() => {});
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
      });
    } catch (error) {
      multiplayer.initialized = false;
      emitError('init', error);
      throw error;
    }
  };

  R.multiplayer = multiplayer;
})();
