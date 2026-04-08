(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R) return;

  function firebaseUrl(path) {
    return `${R.FIREBASE_DB_URL}/${path}.json`;
  }

  function firebaseRequest(method, path, body) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url: firebaseUrl(path),
        timeout: R.FIREBASE_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
        data: body === undefined ? undefined : JSON.stringify(body),
        onload: function (resp) {
          if (resp.status < 200 || resp.status >= 300) {
            reject(new Error(`Firebase ${method} ${path} failed (${resp.status})`));
            return;
          }
          if (!resp.responseText || resp.responseText === 'null') {
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(resp.responseText));
          } catch {
            resolve(null);
          }
        },
        onerror: function () { reject(new Error(`Firebase ${method} ${path} network error`)); },
        ontimeout: function () { reject(new Error(`Firebase ${method} ${path} timeout`)); },
      });
    });
  }

  R.firebaseRead = (path) => firebaseRequest('GET', path);
  R.firebaseWrite = (path, data, method = 'PUT') => firebaseRequest(method, path, data);

  R.AUTH = {
    SESSION_TTL: 30 * 24 * 60 * 60 * 1000,

    async _hash(username, password) {
      const enc = new TextEncoder();
      const data = enc.encode(username + '\x00' + password + '\x00tamaskrypt_v2');
      const buf = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    session() {
      try {
        const s = JSON.parse(GM_getValue('ts_session', 'null'));
        return (s && s.expires > Date.now()) ? s : null;
      } catch {
        return null;
      }
    },

    startSession(username, uid) {
      GM_setValue('ts_session', JSON.stringify({
        username,
        uid,
        expires: Date.now() + this.SESSION_TTL,
      }));
    },

    clearSession() {
      GM_setValue('ts_session', JSON.stringify(null));
    },

    normalizeUsername(username) {
      return (username || '').trim().toLowerCase();
    },

    async resolveUidByUsername(username) {
      const uname = this.normalizeUsername(username);
      if (!uname) return null;
      return R.firebaseRead(`usernameToUid/${encodeURIComponent(uname)}`);
    },

    async register(username, password, faction) {
      username = this.normalizeUsername(username);
      if (username.length < 2) return 'Nazwa musi mieć min. 2 znaki';
      if (password.length < 4) return 'Hasło musi mieć min. 4 znaki';
      if (!/^[a-z0-9_]{2,20}$/.test(username)) return 'Nazwa: 2–20 znaków (a-z, 0-9, _)';

      const VALID_FACTIONS = ['neon', 'toxic', 'plasma'];
      const chosenFaction = VALID_FACTIONS.includes(String(faction || '').toLowerCase())
        ? String(faction).toLowerCase()
        : 'neon';

      const existingUid = await this.resolveUidByUsername(username);
      if (existingUid) return 'Ta nazwa jest już zajęta';

      const uid = `uid_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = Date.now();
      const hash = await this._hash(username, password);

      await R.firebaseWrite(`usernameToUid/${encodeURIComponent(username)}`, uid, 'PUT');
      try {
        await R.firebaseWrite(`users/${uid}`, {
          profile: {
            username,
            faction: chosenFaction,
            createdAt,
            lastLoginAt: createdAt,
            roles: { isAdmin: false, isModerator: false },
          },
          auth: { passwordHash: hash, updatedAt: createdAt },
          pet: {
            level: 1,
            xp: 0,
            hp: 100,
            hpMax: 100,
            hunger: 100,
            hungerMax: 100,
            foodCollected: 0,
            alive: true,
            lastTickAt: createdAt,
            updatedAt: createdAt,
          },
          stats: { totalOnlineMs: 0, updatedAt: createdAt },
          progress: { coins: 0, inventory: {}, activeEffects: {}, dailyQuest: R.makeDailyQuest(), updatedAt: createdAt },
        }, 'PUT');
      } catch (error) {
        await R.firebaseWrite(`usernameToUid/${encodeURIComponent(username)}`, null, 'PUT');
        throw error;
      }

      this.startSession(username, uid);
      return null;
    },

    async login(username, password) {
      username = this.normalizeUsername(username);
      const uid = await this.resolveUidByUsername(username);
      if (!uid) return 'Nieprawidłowy login lub hasło';

      const authData = await R.firebaseRead(`users/${uid}/auth`);
      if (!authData || !authData.passwordHash) return 'Nieprawidłowy login lub hasło';

      const hash = await this._hash(username, password);
      if (authData.passwordHash !== hash) return 'Nieprawidłowy login lub hasło';

      await R.firebaseWrite(`users/${uid}/profile/lastLoginAt`, Date.now(), 'PUT');
      this.startSession(username, uid);
      return null;
    },
  };
})();
