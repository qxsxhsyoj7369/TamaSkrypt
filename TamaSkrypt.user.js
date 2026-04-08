// ==UserScript==
// @name         TamaSkrypt – Żelek w przeglądarce
// @namespace    https://github.com/qxsxhsyoj7369/TamaSkrypt
// @version      2.1.0
// @description  Wirtualny żelek żyjący w Twojej przeglądarce. Karm go, opiekuj się nim i zdobywaj poziomy!
// @author       TamaSkrypt
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://raw.githubusercontent.com/qxsxhsyoj7369/TamaSkrypt/main/TamaSkrypt.user.js
// @downloadURL  https://raw.githubusercontent.com/qxsxhsyoj7369/TamaSkrypt/main/TamaSkrypt.user.js
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Stałe konfiguracyjne
  // ---------------------------------------------------------------------------
  const CONFIG = {
    HUNGER_DRAIN_RATE: 1,          // punkty głodu na minutę
    HUNGER_DRAIN_INTERVAL: 60000,  // ms – co ile zmniejsza się głód (1 minuta)
    HUNGER_FOOD_SPAWN_CHANCE: 0.35,// szansa na pojawienie się jedzenia przy każdym ticku
    FOOD_DURATION: 15000,          // ms – jak długo jedzenie czeka na ekranie
    FOOD_SPAWN_INTERVAL: 30000,    // ms – co ile sprawdzamy czy pojawić jedzenie
    HP_MAX: 100,
    XP_PER_FEED: 10,
    XP_PER_LEVEL: 100,
    HP_REGEN_INTERVAL: 120000,     // ms – co 2 minuty HP się regeneruje gdy najedzony
    HP_REGEN_AMOUNT: 5,
    HP_DRAIN_WHEN_STARVING: 3,     // HP utracone gdy głód = 0
    HP_REGEN_HUNGER_THRESHOLD: 40, // minimalny głód wymagany do regeneracji HP
    OFFLINE_CATCHUP_MAX: 7200000,  // ms – maksymalny czas offline uwzględniany (2 godziny)
    REVIVE_HP: 30,                 // HP po wskrzeszeniu
    REVIVE_HUNGER: 50,             // głód po wskrzeszeniu
    DAILY_FEED_TARGET: 5,
    DAILY_ONLINE_TARGET_MS: 15 * 60 * 1000,
    DAILY_REWARD_COINS: 50,
    DAILY_REWARD_XP: 40,
  };

  // Kolory i emoji jedzenia
  const FOODS = [
    { emoji: '🍬', name: 'Cukierek', xp: 10, hunger: 20 },
    { emoji: '🍭', name: 'Lizak',    xp: 15, hunger: 25 },
    { emoji: '🍡', name: 'Dango',    xp: 12, hunger: 22 },
    { emoji: '🧁', name: 'Mufinka',  xp: 20, hunger: 35 },
    { emoji: '🍓', name: 'Truskawka',xp: 8,  hunger: 15 },
    { emoji: '🍇', name: 'Winogrona',xp: 8,  hunger: 15 },
    { emoji: '🍩', name: 'Pączek',   xp: 18, hunger: 30 },
    { emoji: '🍰', name: 'Ciasto',   xp: 25, hunger: 40 },
  ];

  // Stany żelka
  const MOOD = {
    HAPPY:   { emoji: '😄', label: 'Szczęśliwy' },
    NEUTRAL: { emoji: '😐', label: 'Normalny'   },
    HUNGRY:  { emoji: '😟', label: 'Głodny'     },
    SAD:     { emoji: '😢', label: 'Smutny'     },
    DEAD:    { emoji: '💀', label: 'Martwy'      },
  };

  // ---------------------------------------------------------------------------
  // System kont i sesji (AUTH)
  // ---------------------------------------------------------------------------
  const AUTH = {
    SESSION_TTL: 30 * 24 * 60 * 60 * 1000, // 30 dni w ms

    // SHA-256 z solą (WebCrypto API) – async
    async _hash(username, password) {
      const enc  = new TextEncoder();
      const data = enc.encode(username + '\x00' + password + '\x00tamaskrypt_v2');
      const buf  = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    accounts() {
      try { return JSON.parse(GM_getValue('ts_accounts', '{}')); } catch { return {}; }
    },
    saveAccounts(a) {
      GM_setValue('ts_accounts', JSON.stringify(a));
    },

    session() {
      try {
        const s = JSON.parse(GM_getValue('ts_session', 'null'));
        return (s && s.expires > Date.now()) ? s : null;
      } catch { return null; }
    },
    startSession(username) {
      GM_setValue('ts_session', JSON.stringify({
        username,
        expires: Date.now() + this.SESSION_TTL,
      }));
    },
    clearSession() {
      GM_setValue('ts_session', JSON.stringify(null));
    },

    async register(username, password) {
      username = (username || '').trim();
      if (username.length < 2)               return 'Nazwa musi mieć min. 2 znaki';
      if (password.length < 4)               return 'Hasło musi mieć min. 4 znaki';
      if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) return 'Nazwa: 2–20 znaków (a-z, 0-9, _)';
      const accs = this.accounts();
      if (accs[username])                    return 'Ta nazwa jest już zajęta';
      accs[username] = { hash: await this._hash(username, password), created: Date.now() };
      this.saveAccounts(accs);
      this.startSession(username);
      return null;
    },

    async login(username, password) {
      username = (username || '').trim();
      const accs = this.accounts();
      const acc  = accs[username];
      if (!acc) return 'Nieprawidłowy login lub hasło';
      const hash = await this._hash(username, password);
      if (acc.hash !== hash) return 'Nieprawidłowy login lub hasło';
      this.startSession(username);
      return null;
    },
  };

  // ---------------------------------------------------------------------------
  // Aktualnie zalogowany użytkownik (ustawiany po auth)
  // ---------------------------------------------------------------------------
  let _currentUser = '';

  // Prefiks klucza pamięci – każdy użytkownik ma własne dane
  function sk(key) { return _currentUser ? _currentUser + '_' + key : key; }


  function load(key, def) {
    try {
      const v = GM_getValue(sk(key), null);
      return v === null ? def : v;
    } catch {
      return def;
    }
  }
  function save(key, value) {
    try { GM_setValue(sk(key), value); } catch { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Stan gry (inicjalizowany po zalogowaniu przez loadStateForUser)
  // ---------------------------------------------------------------------------
  const now = () => Date.now();

  function getDayKey(ts = Date.now()) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function makeDailyQuest() {
    return {
      dayKey: getDayKey(),
      feedProgress: 0,
      onlineProgressMs: 0,
      claimed: false,
    };
  }

  function normalizeDailyQuest(raw) {
    if (!raw || typeof raw !== 'object') return makeDailyQuest();
    if (raw.dayKey !== getDayKey()) return makeDailyQuest();
    return {
      dayKey: raw.dayKey,
      feedProgress: Math.max(0, Math.min(CONFIG.DAILY_FEED_TARGET, Number(raw.feedProgress) || 0)),
      onlineProgressMs: Math.max(0, Math.min(CONFIG.DAILY_ONLINE_TARGET_MS, Number(raw.onlineProgressMs) || 0)),
      claimed: Boolean(raw.claimed),
    };
  }

  function loadDailyQuest() {
    try {
      const raw = JSON.parse(load('dailyQuest', 'null'));
      return normalizeDailyQuest(raw);
    } catch {
      return makeDailyQuest();
    }
  }

  function isDailyQuestCompleted() {
    if (!state || !state.dailyQuest) return false;
    return state.dailyQuest.feedProgress >= CONFIG.DAILY_FEED_TARGET
      && state.dailyQuest.onlineProgressMs >= CONFIG.DAILY_ONLINE_TARGET_MS;
  }

  let state = null;

  function loadStateForUser() {
    state = {
      hunger:         load('hunger',         100),
      hp:             load('hp',             100),
      level:          load('level',          1),
      xp:             load('xp',             0),
      coins:          load('coins',          0),
      foodCollected:  load('foodCollected',  0),
      totalOnline:    load('totalOnline',    0),   // ms
      sessionStart:   now(),
      lastSave:       now(),
      lastHungerTick: load('lastHungerTick', now()),
      alive:          load('alive',          true),
      dailyQuest:     loadDailyQuest(),
      lastDailyTick:  now(),
    };

    // Nadrabiamy czas nieobecności (max 2h)
    const offlineMs   = Math.min(now() - load('lastSave', now()), CONFIG.OFFLINE_CATCHUP_MAX);
    const offlineMins = offlineMs / 60000;
    const hungerLost  = Math.floor(offlineMins * CONFIG.HUNGER_DRAIN_RATE);
    if (state.alive) {
      state.hunger = Math.max(0, state.hunger - hungerLost);
      if (state.hunger === 0) {
        const hpLost = Math.floor(offlineMins / (CONFIG.HUNGER_DRAIN_INTERVAL / 60000)) * CONFIG.HP_DRAIN_WHEN_STARVING;
        state.hp = Math.max(0, state.hp - hpLost);
        if (state.hp === 0) state.alive = false;
      }
    }
  }

  function persistState() {
    if (!state) return;
    save('hunger',       state.hunger);
    save('hp',           state.hp);
    save('level',        state.level);
    save('xp',           state.xp);
    save('coins',        state.coins);
    save('foodCollected', state.foodCollected);
    save('alive',        state.alive);
    save('dailyQuest',   JSON.stringify(state.dailyQuest));
    save('lastSave',     now());
    save('totalOnline',  state.totalOnline + (now() - state.sessionStart));
    save('lastHungerTick', state.lastHungerTick);
  }

  // ---------------------------------------------------------------------------
  // Formatowanie czasu
  // ---------------------------------------------------------------------------
  function formatTime(ms) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}g ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  // ---------------------------------------------------------------------------
  // Aktualny nastrój żelka
  // ---------------------------------------------------------------------------
  function getMood() {
    if (!state.alive)        return MOOD.DEAD;
    if (state.hunger > 60)   return MOOD.HAPPY;
    if (state.hunger > 30)   return MOOD.NEUTRAL;
    if (state.hunger > 10)   return MOOD.HUNGRY;
    return MOOD.SAD;
  }

  // ---------------------------------------------------------------------------
  // Budowanie interfejsu użytkownika
  // ---------------------------------------------------------------------------
  const WIDGET_ID   = '__tamaskrypt_widget__';
  const FOOD_PREFIX = '__tamaskrypt_food_';

  function mountWidget() {
    // Usuń widget jeśli już istnieje (np. SPA rerender)
    const existing = document.getElementById(WIDGET_ID);
    if (existing) existing.remove();

    // Upewnij się że document.body istnieje
    const target = document.body || document.documentElement;
    if (!target) {
      console.error('[TamaSkrypt] Brak document.body – spróbuję ponownie za 500ms');
      setTimeout(mountWidget, 500);
      return;
    }

    // Główny kontener widgetu
    const widget = document.createElement('div');
    widget.id = WIDGET_ID;
    widget.innerHTML = buildWidgetHTML();
    applyWidgetStyles();
    target.appendChild(widget);

    init(widget);
  }

  function buildWidgetHTML() {
    const mood    = getMood();
    const onlineMs = state.totalOnline + (now() - state.sessionStart);
    const xpPct   = Math.round((state.xp / CONFIG.XP_PER_LEVEL) * 100);
    const hungerPct = Math.max(0, Math.min(100, state.hunger));
    const hpPct     = Math.max(0, Math.min(100, state.hp));
    const dailyFeedPct = Math.round((state.dailyQuest.feedProgress / CONFIG.DAILY_FEED_TARGET) * 100);
    const dailyOnlinePct = Math.round((state.dailyQuest.onlineProgressMs / CONFIG.DAILY_ONLINE_TARGET_MS) * 100);
    const canClaimDaily = isDailyQuestCompleted() && !state.dailyQuest.claimed;

    return `
      <div id="__ts_header__">
        <span id="__ts_toggle__" title="Pokaż/Ukryj">🟢</span>
        <span id="__ts_title__">TamaSkrypt</span>
        <span id="__ts_username__" title="Zalogowany jako: ${_currentUser}">👤 ${_currentUser}</span>
        <button id="__ts_logout__" title="Wyloguj">⏏</button>
      </div>
      <div id="__ts_body__">
        <div id="__ts_zelek__" title="${mood.label}">
          <div id="__ts_body_svg__">${buildZelekSVG()}</div>
          <div id="__ts_mood__">${mood.emoji}</div>
        </div>

        <div class="__ts_stats__">
          <div class="__ts_stat_row__">
            <span class="__ts_label__">❤️ HP</span>
            <div class="__ts_bar_wrap__">
              <div class="__ts_bar__ __ts_hp_bar__" style="width:${hpPct}%"></div>
            </div>
            <span class="__ts_val__">${state.hp}/${CONFIG.HP_MAX}</span>
          </div>
          <div class="__ts_stat_row__">
            <span class="__ts_label__">🍬 Głód</span>
            <div class="__ts_bar_wrap__">
              <div class="__ts_bar__ __ts_hunger_bar__" style="width:${hungerPct}%"></div>
            </div>
            <span class="__ts_val__">${state.hunger}/100</span>
          </div>
          <div class="__ts_stat_row__">
            <span class="__ts_label__">⭐ XP</span>
            <div class="__ts_bar_wrap__">
              <div class="__ts_bar__ __ts_xp_bar__" style="width:${xpPct}%"></div>
            </div>
            <span class="__ts_val__">${state.xp}/${CONFIG.XP_PER_LEVEL}</span>
          </div>
        </div>

        <div id="__ts_info__">
          <span>Poziom: <strong>${state.level}</strong></span>
          <span>Monety: <strong id="__ts_coins__">${state.coins}</strong> 🪙</span>
          <span>Online: <strong id="__ts_online__">${formatTime(onlineMs)}</strong></span>
        </div>

        <div id="__ts_daily__">
          <div class="__ts_daily_title__">📅 Misja dnia</div>
          <div class="__ts_stat_row__">
            <span class="__ts_label__">🍽️ Karm</span>
            <div class="__ts_bar_wrap__">
              <div class="__ts_bar__ __ts_daily_feed_bar__" style="width:${Math.max(0, Math.min(100, dailyFeedPct))}%"></div>
            </div>
            <span class="__ts_val__" id="__ts_daily_feed_val__">${state.dailyQuest.feedProgress}/${CONFIG.DAILY_FEED_TARGET}</span>
          </div>
          <div class="__ts_stat_row__">
            <span class="__ts_label__">⏱️ Graj</span>
            <div class="__ts_bar_wrap__">
              <div class="__ts_bar__ __ts_daily_online_bar__" style="width:${Math.max(0, Math.min(100, dailyOnlinePct))}%"></div>
            </div>
            <span class="__ts_val__" id="__ts_daily_online_val__">${Math.floor(state.dailyQuest.onlineProgressMs / 60000)}/15m</span>
          </div>
          <button id="__ts_claim_daily__" ${canClaimDaily ? '' : 'disabled'}>
            ${state.dailyQuest.claimed ? '✅ Odebrane' : '🎁 Odbierz nagrodę'}
          </button>
        </div>

        <div id="__ts_msg__"></div>
      </div>
    `;
  }

  // SVG żelka (prosty, kolorowy)
  function buildZelekSVG() {
    const colors = ['#FF6B9D', '#FF8E53', '#A8EB12', '#12C2E9', '#F64F59', '#C471ED'];
    const color = colors[(state.level - 1) % colors.length];
    return `
      <svg width="60" height="72" viewBox="0 0 60 72" xmlns="http://www.w3.org/2000/svg">
        <!-- Ciało żelka -->
        <ellipse cx="30" cy="42" rx="22" ry="26" fill="${color}" opacity="0.9"/>
        <!-- Głowa -->
        <ellipse cx="30" cy="20" rx="18" ry="17" fill="${color}"/>
        <!-- Blask (połysk) -->
        <ellipse cx="22" cy="13" rx="6" ry="4" fill="white" opacity="0.45"/>
        <!-- Oczy -->
        <circle cx="23" cy="20" r="3.5" fill="#1a1a2e"/>
        <circle cx="37" cy="20" r="3.5" fill="#1a1a2e"/>
        <circle cx="24.2" cy="19" r="1.2" fill="white"/>
        <circle cx="38.2" cy="19" r="1.2" fill="white"/>
        <!-- Usta -->
        <path d="M24 27 Q30 32 36 27" stroke="#1a1a2e" stroke-width="2" fill="none" stroke-linecap="round"/>
        <!-- Uszka / wypustki -->
        <ellipse cx="12" cy="10" rx="6" ry="8" fill="${color}"/>
        <ellipse cx="48" cy="10" rx="6" ry="8" fill="${color}"/>
        <!-- Wewnętrzne uszka -->
        <ellipse cx="12" cy="10" rx="3.5" ry="5" fill="white" opacity="0.3"/>
        <ellipse cx="48" cy="10" rx="3.5" ry="5" fill="white" opacity="0.3"/>
        <!-- Nóżki -->
        <ellipse cx="21" cy="66" rx="7" ry="5" fill="${color}"/>
        <ellipse cx="39" cy="66" rx="7" ry="5" fill="${color}"/>
        <!-- Rączki -->
        <ellipse cx="6"  cy="42" rx="5" ry="8"  fill="${color}" transform="rotate(-20 6 42)"/>
        <ellipse cx="54" cy="42" rx="5" ry="8"  fill="${color}" transform="rotate(20 54 42)"/>
      </svg>`;
  }

  // ---------------------------------------------------------------------------
  // Style CSS
  // ---------------------------------------------------------------------------
  function applyWidgetStyles() {
    if (document.getElementById('__tamaskrypt_styles__')) return; // nie duplikuj
    const style = document.createElement('style');
    style.id = '__tamaskrypt_styles__';
    style.textContent = `
      #__tamaskrypt_widget__ {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 2147483647;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 12px;
        user-select: none;
      }
      #__ts_header__ {
        background: linear-gradient(135deg,#667eea,#764ba2);
        color: white;
        padding: 6px 10px;
        border-radius: 12px 12px 0 0;
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: bold;
        cursor: grab;
        font-size: 13px;
        touch-action: none;
      }
      #__ts_toggle__ { cursor: pointer; font-size: 10px; }
      #__ts_body__ {
        background: rgba(255,255,255,0.97);
        border: 2px solid #764ba2;
        border-top: none;
        border-radius: 0 0 12px 12px;
        padding: 8px;
        min-width: 180px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      }
      #__ts_body__.hidden { display: none; }
      #__ts_zelek__ {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 6px;
        animation: ts_bounce 2s ease-in-out infinite;
      }
      #__ts_mood__ { font-size: 18px; margin-top: -4px; }
      @keyframes ts_bounce {
        0%,100% { transform: translateY(0); }
        50%      { transform: translateY(-5px); }
      }
      @keyframes ts_shake {
        0%,100% { transform: rotate(0deg); }
        25%      { transform: rotate(-10deg); }
        75%      { transform: rotate(10deg); }
      }
      .ts_eating { animation: ts_shake 0.4s ease-in-out 3 !important; }

      .__ts_stats__ { width: 100%; }
      .__ts_stat_row__ {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 4px;
      }
      .__ts_label__ { width: 52px; font-size: 10px; }
      .__ts_bar_wrap__ {
        flex: 1;
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
      }
      .__ts_bar__ {
        height: 100%;
        border-radius: 4px;
        transition: width 0.5s ease;
      }
      .__ts_hp_bar__     { background: linear-gradient(90deg,#f093fb,#f5576c); }
      .__ts_hunger_bar__ { background: linear-gradient(90deg,#4facfe,#00f2fe); }
      .__ts_xp_bar__     { background: linear-gradient(90deg,#43e97b,#38f9d7); }
      .__ts_val__ { font-size: 9px; color: #555; width: 38px; text-align: right; }

      #__ts_info__ {
        display: flex;
        justify-content: space-between;
        margin-top: 6px;
        font-size: 10px;
        color: #444;
      }
      #__ts_msg__ {
        text-align: center;
        font-size: 11px;
        color: #764ba2;
        min-height: 14px;
        font-weight: bold;
        margin-top: 4px;
      }
      #__ts_daily__ {
        margin-top: 8px;
        border: 1px dashed #b8a6d9;
        border-radius: 10px;
        padding: 6px;
        background: #faf8ff;
      }
      .__ts_daily_title__ {
        font-size: 10px;
        font-weight: bold;
        color: #5f4692;
        margin-bottom: 5px;
        text-align: center;
      }
      .__ts_daily_feed_bar__ { background: linear-gradient(90deg,#ffd166,#fca311); }
      .__ts_daily_online_bar__ { background: linear-gradient(90deg,#06d6a0,#118ab2); }
      #__ts_claim_daily__ {
        width: 100%;
        margin-top: 6px;
        border: none;
        border-radius: 8px;
        padding: 7px 8px;
        font-size: 11px;
        font-weight: bold;
        color: white;
        background: linear-gradient(135deg,#7c5cff,#5e35b1);
        cursor: pointer;
      }
      #__ts_claim_daily__:disabled {
        background: #b3b3c7;
        cursor: not-allowed;
      }

      /* Jedzenie na stronie */
      .ts_food_item {
        position: fixed;
        font-size: 28px;
        z-index: 2147483646;
        cursor: pointer;
        animation: ts_float 1.5s ease-in-out infinite, ts_fadein 0.4s ease;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        transition: transform 0.1s;
      }
      .ts_food_item:active { transform: scale(1.3); }
      @keyframes ts_float {
        0%,100% { transform: translateY(0) rotate(-5deg); }
        50%      { transform: translateY(-8px) rotate(5deg); }
      }
      @keyframes ts_fadein {
        from { opacity: 0; transform: scale(0.5); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes ts_poof {
        0%   { opacity: 1; transform: scale(1); }
        50%  { opacity: 0.5; transform: scale(1.6); }
        100% { opacity: 0; transform: scale(0); }
      }
      .ts_food_poof { animation: ts_poof 0.4s ease forwards !important; }

      /* Powiadomienie o zdobyciu poziomy */
      #__ts_levelup__ {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%,-50%);
        background: linear-gradient(135deg,#667eea,#764ba2);
        color: white;
        padding: 16px 28px;
        border-radius: 16px;
        font-size: 20px;
        font-weight: bold;
        z-index: 2147483647;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        animation: ts_fadein 0.3s ease;
        pointer-events: none;
      }

      /* ── Nazwa użytkownika i wylogowanie w nagłówku widgetu ── */
      #__ts_username__ {
        margin-left: auto;
        font-size: 10px;
        opacity: 0.85;
        max-width: 72px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #__ts_logout__ {
        background: none;
        border: none;
        color: white;
        font-size: 13px;
        cursor: pointer;
        padding: 0 2px;
        line-height: 1;
      }

      /* ── Modal logowania / rejestracji ── */
      #__ts_auth_modal__ {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.72);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', Arial, sans-serif;
        animation: ts_fadein 0.25s ease;
      }
      #__ts_auth_card__ {
        background: #fff;
        border-radius: 20px;
        padding: 28px 24px 24px;
        width: min(340px, 92vw);
        box-shadow: 0 12px 40px rgba(0,0,0,0.45);
        text-align: center;
      }
      #__ts_auth_logo__ {
        font-size: 22px;
        font-weight: bold;
        color: #764ba2;
        margin-bottom: 4px;
      }
      #__ts_auth_sub__ {
        font-size: 13px;
        color: #888;
        margin: 0 0 18px;
      }
      #__ts_auth_tabs__ {
        display: flex;
        border-radius: 10px;
        overflow: hidden;
        border: 2px solid #764ba2;
        margin-bottom: 18px;
      }
      #__ts_auth_tabs__ button {
        flex: 1;
        padding: 9px 0;
        border: none;
        background: transparent;
        font-size: 13px;
        font-weight: bold;
        color: #764ba2;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
      }
      #__ts_auth_tabs__ button.active {
        background: linear-gradient(135deg,#667eea,#764ba2);
        color: #fff;
      }
      .__ts_field__ {
        text-align: left;
        margin-bottom: 12px;
      }
      .__ts_field__ label {
        display: block;
        font-size: 11px;
        color: #555;
        margin-bottom: 4px;
        font-weight: bold;
      }
      .__ts_field__ input {
        width: 100%;
        padding: 10px 12px;
        border: 1.5px solid #ddd;
        border-radius: 10px;
        font-size: 14px;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.2s;
      }
      .__ts_field__ input:focus {
        border-color: #764ba2;
      }
      #__ts_auth_err__ {
        color: #e74c3c;
        font-size: 12px;
        min-height: 18px;
        margin-bottom: 8px;
        font-weight: bold;
      }
      #__ts_auth_submit__ {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg,#667eea,#764ba2);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-weight: bold;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      #__ts_auth_submit__:active { opacity: 0.85; }
    `;
    (document.head || document.documentElement || document.body).appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Modal logowania / rejestracji
  // ---------------------------------------------------------------------------
  const AUTH_MODAL_ID = '__ts_auth_modal__';

  function showAuthModal(onSuccess) {
    applyWidgetStyles();
    if (document.getElementById(AUTH_MODAL_ID)) return;

    const modal = document.createElement('div');
    modal.id = AUTH_MODAL_ID;
    modal.innerHTML = buildAuthHTML();
    (document.body || document.documentElement).appendChild(modal);

    let activeTab = 'login';
    const tabLogin    = modal.querySelector('#__ts_tab_login__');
    const tabRegister = modal.querySelector('#__ts_tab_register__');
    const form        = modal.querySelector('#__ts_auth_form__');
    const errEl       = modal.querySelector('#__ts_auth_err__');
    const btnSubmit   = modal.querySelector('#__ts_auth_submit__');
    const confirmRow  = modal.querySelector('#__ts_confirm_row__');

    function setTab(t) {
      activeTab = t;
      tabLogin.classList.toggle('active', t === 'login');
      tabRegister.classList.toggle('active', t === 'register');
      confirmRow.style.display = t === 'register' ? 'block' : 'none';
      btnSubmit.textContent    = t === 'login' ? 'Zaloguj się' : 'Zarejestruj się';
      errEl.textContent        = '';
    }

    tabLogin.addEventListener('click',    () => setTab('login'));
    tabRegister.addEventListener('click', () => setTab('register'));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const username = modal.querySelector('#__ts_auth_user__').value;
      const password = modal.querySelector('#__ts_auth_pass__').value;
      const confirm  = modal.querySelector('#__ts_auth_confirm__').value;

      if (activeTab === 'register' && password !== confirm) {
        errEl.textContent = 'Hasła się nie zgadzają';
        return;
      }

      btnSubmit.disabled    = true;
      btnSubmit.textContent = '⏳';

      const err = activeTab === 'login'
        ? await AUTH.login(username, password)
        : await AUTH.register(username, password);

      btnSubmit.disabled = false;
      setTab(activeTab); // przywróć etykietę przycisku

      if (err) { errEl.textContent = err; return; }

      modal.remove();
      onSuccess(username.trim());
    });
  }

  function buildAuthHTML() {
    return `
      <div id="__ts_auth_card__">
        <div id="__ts_auth_logo__">🟣 TamaSkrypt</div>
        <p id="__ts_auth_sub__">Twój wirtualny żelek czeka!</p>
        <div id="__ts_auth_tabs__">
          <button type="button" id="__ts_tab_login__" class="active">Zaloguj się</button>
          <button type="button" id="__ts_tab_register__">Zarejestruj się</button>
        </div>
        <form id="__ts_auth_form__" autocomplete="on">
          <div class="__ts_field__">
            <label for="__ts_auth_user__">Nazwa użytkownika</label>
            <input id="__ts_auth_user__" type="text" name="username"
                   autocomplete="username" required placeholder="np. zelek123" />
          </div>
          <div class="__ts_field__">
            <label for="__ts_auth_pass__">Hasło</label>
            <input id="__ts_auth_pass__" type="password" name="password"
                   autocomplete="current-password" required placeholder="min. 4 znaki" />
          </div>
          <div class="__ts_field__" id="__ts_confirm_row__" style="display:none">
            <label for="__ts_auth_confirm__">Potwierdź hasło</label>
            <input id="__ts_auth_confirm__" type="password" name="confirm"
                   autocomplete="new-password" placeholder="powtórz hasło" />
          </div>
          <div id="__ts_auth_err__"></div>
          <button type="submit" id="__ts_auth_submit__">Zaloguj się</button>
        </form>
      </div>
    `;
  }
  const header = () => document.getElementById('__ts_header__');

  let dragging = false;
  let dragOX = 0, dragOY = 0;
  let _widgetEl = null; // ustawiane przez init()

  function onDragStart(e) {
    if (!_widgetEl) return;
    if (e.target.id === '__ts_toggle__') return;
    dragging = true;
    const touch = e.touches ? e.touches[0] : e;
    const rect = _widgetEl.getBoundingClientRect();
    dragOX = touch.clientX - rect.left;
    dragOY = touch.clientY - rect.top;
    _widgetEl.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function onDragMove(e) {
    if (!dragging || !_widgetEl) return;
    const touch = e.touches ? e.touches[0] : e;
    let x = touch.clientX - dragOX;
    let y = touch.clientY - dragOY;
    x = Math.max(0, Math.min(window.innerWidth  - _widgetEl.offsetWidth,  x));
    y = Math.max(0, Math.min(window.innerHeight - _widgetEl.offsetHeight, y));
    _widgetEl.style.right  = 'auto';
    _widgetEl.style.bottom = 'auto';
    _widgetEl.style.left   = x + 'px';
    _widgetEl.style.top    = y + 'px';
    e.preventDefault();
  }
  function onDragEnd() {
    dragging = false;
    if (_widgetEl) _widgetEl.style.cursor = 'default';
  }

  function bindDrag() {
    const h = header();
    if (!h) return;
    h.addEventListener('mousedown',  onDragStart,  { passive: false });
    h.addEventListener('touchstart', onDragStart,  { passive: false });
    document.addEventListener('mousemove', onDragMove,  { passive: false });
    document.addEventListener('touchmove', onDragMove,  { passive: false });
    document.addEventListener('mouseup',   onDragEnd);
    document.addEventListener('touchend',  onDragEnd);
  }

  // ---------------------------------------------------------------------------
  // Przełączanie widoczności treści widgetu
  // ---------------------------------------------------------------------------
  function bindToggle() {
    const btn  = document.getElementById('__ts_toggle__');
    const body = document.getElementById('__ts_body__');
    if (!btn || !body) return;
    btn.addEventListener('click', () => {
      body.classList.toggle('hidden');
      btn.textContent = body.classList.contains('hidden') ? '🔴' : '🟢';
    });
  }

  // ---------------------------------------------------------------------------
  // Aktualizacja UI
  // ---------------------------------------------------------------------------
  function updateUI() {
    const mood = getMood();
    const onlineMs = state.totalOnline + (now() - state.sessionStart);

    const zelekEl   = document.getElementById('__ts_zelek__');
    const moodEl    = document.getElementById('__ts_mood__');
    const onlineEl  = document.getElementById('__ts_online__');
    const msgEl     = document.getElementById('__ts_msg__');
    const svgEl     = document.getElementById('__ts_body_svg__');

    if (moodEl)   moodEl.textContent  = mood.emoji;
    if (onlineEl) onlineEl.textContent = formatTime(onlineMs);
    if (svgEl)    svgEl.innerHTML = buildZelekSVG();
    if (zelekEl)  zelekEl.title = mood.label;

    updateBar('__ts_hp_bar__',     state.hp,     CONFIG.HP_MAX,         `${state.hp}/${CONFIG.HP_MAX}`);
    updateBar('__ts_hunger_bar__', state.hunger, 100,                   `${state.hunger}/100`);
    updateBar('__ts_xp_bar__',     state.xp,     CONFIG.XP_PER_LEVEL,  `${state.xp}/${CONFIG.XP_PER_LEVEL}`);
    updateBar('__ts_daily_feed_bar__', state.dailyQuest.feedProgress, CONFIG.DAILY_FEED_TARGET, `${state.dailyQuest.feedProgress}/${CONFIG.DAILY_FEED_TARGET}`);
    updateBar('__ts_daily_online_bar__', state.dailyQuest.onlineProgressMs, CONFIG.DAILY_ONLINE_TARGET_MS, `${Math.floor(state.dailyQuest.onlineProgressMs / 60000)}/15m`);

    const infoEl = document.getElementById('__ts_info__');
    if (infoEl) {
      const spans = infoEl.querySelectorAll('span');
      if (spans[0]) spans[0].innerHTML = `Poziom: <strong>${state.level}</strong>`;
    }
    const coinsEl = document.getElementById('__ts_coins__');
    if (coinsEl) coinsEl.textContent = String(state.coins);

    const claimBtn = document.getElementById('__ts_claim_daily__');
    if (claimBtn) {
      const canClaim = isDailyQuestCompleted() && !state.dailyQuest.claimed;
      claimBtn.disabled = !canClaim;
      claimBtn.textContent = state.dailyQuest.claimed ? '✅ Odebrane' : '🎁 Odbierz nagrodę';
    }

    // Wiadomość w zależności od stanu
    if (msgEl) {
      if (!state.alive)          msgEl.textContent = '💀 Żelek umarł… odnów go!';
      else if (state.hunger <= 0) msgEl.textContent = '⚠️ Jestem bardzo głodny!';
      else if (state.hunger < 20) msgEl.textContent = '🙏 Chce mi się jeść…';
      else if (state.hp < 30)     msgEl.textContent = '🤕 Boli mnie…';
      else                         msgEl.textContent = '';
    }
  }

  function updateBar(cls, val, max, label) {
    const bars = document.querySelectorAll('.' + cls);
    bars.forEach(bar => {
      const pct = Math.max(0, Math.min(100, Math.round((val / max) * 100)));
      bar.style.width = pct + '%';
    });
    // Aktualizuj etykietę wartości obok paska
    const rows = document.querySelectorAll('.__ts_stat_row__');
    rows.forEach(row => {
      const barEl = row.querySelector('.' + cls);
      if (barEl) {
        const valEl = row.querySelector('.__ts_val__');
        if (valEl) valEl.textContent = label;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Logika gry – ticki
  // ---------------------------------------------------------------------------
  function hungerTick() {
    if (!state.alive) return;

    const elapsed = now() - state.lastHungerTick;
    const ticks   = Math.floor(elapsed / CONFIG.HUNGER_DRAIN_INTERVAL);
    if (ticks < 1) return;

    state.lastHungerTick += ticks * CONFIG.HUNGER_DRAIN_INTERVAL;
    state.hunger = Math.max(0, state.hunger - ticks * CONFIG.HUNGER_DRAIN_RATE);

    if (state.hunger === 0) {
      state.hp = Math.max(0, state.hp - CONFIG.HP_DRAIN_WHEN_STARVING * ticks);
      if (state.hp === 0) {
        state.alive = false;
        showMessage('💀 Żelek umarł z głodu!', 5000);
      }
    }
    updateUI();
    persistState();
  }

  function hpRegenTick() {
    if (!state.alive) return;
    if (state.hunger > CONFIG.HP_REGEN_HUNGER_THRESHOLD && state.hp < CONFIG.HP_MAX) {
      state.hp = Math.min(CONFIG.HP_MAX, state.hp + CONFIG.HP_REGEN_AMOUNT);
      updateUI();
      persistState();
    }
  }

  // ---------------------------------------------------------------------------
  // Jedzenie
  // ---------------------------------------------------------------------------
  let activeFood = null;

  function trySpawnFood() {
    if (!state.alive) return;
    if (activeFood) return; // jedno jedzenie na raz
    if (Math.random() > CONFIG.HUNGER_FOOD_SPAWN_CHANCE) return;

    const food = FOODS[Math.floor(Math.random() * FOODS.length)];
    spawnFood(food);
  }

  function spawnFood(food) {
    const el = document.createElement('div');
    el.className = 'ts_food_item';
    el.id = FOOD_PREFIX + Date.now();
    el.textContent = food.emoji;
    el.title = food.name;

    // Losowa pozycja (unikaj widgetu – prawa krawędź)
    const margin = 80;
    const maxX = window.innerWidth  - margin - 40;
    const maxY = window.innerHeight - margin - 40;
    el.style.left = Math.floor(Math.random() * maxX + margin / 2) + 'px';
    el.style.top  = Math.floor(Math.random() * maxY + margin / 2) + 'px';

    el.addEventListener('click',      () => eatFood(el, food));
    el.addEventListener('touchstart', () => eatFood(el, food), { passive: true });

    const foodTarget = document.body || document.documentElement;
    if (!foodTarget) return;
    foodTarget.appendChild(el);
    activeFood = el;

    // Usuń po czasie jeśli nie zjedzone
    setTimeout(() => {
      if (document.body && document.body.contains(el)) {
        el.remove();
        if (activeFood === el) activeFood = null;
      }
    }, CONFIG.FOOD_DURATION);
  }

  function eatFood(el, food) {
    if (!state.alive) return;

    el.classList.add('ts_food_poof');
    setTimeout(() => {
      if (document.body && document.body.contains(el)) el.remove();
      if (activeFood === el) activeFood = null;
    }, 400);

    state.hunger = Math.min(100, state.hunger + food.hunger);
    state.foodCollected += 1;
    state.dailyQuest.feedProgress = Math.min(CONFIG.DAILY_FEED_TARGET, state.dailyQuest.feedProgress + 1);
    gainXP(food.xp);

    // Animacja jedzenia
    const zelekEl = document.getElementById('__ts_zelek__');
    if (zelekEl) {
      zelekEl.classList.add('ts_eating');
      setTimeout(() => zelekEl.classList.remove('ts_eating'), 1200);
    }

    showMessage(`${food.emoji} Mniam! +${food.hunger} sytości, +${food.xp} XP`);
    updateUI();
    persistState();
  }

  function gainXP(amount) {
    if (!state.alive) return;
    state.xp += amount;
    while (state.xp >= CONFIG.XP_PER_LEVEL) {
      state.xp   -= CONFIG.XP_PER_LEVEL;
      state.level += 1;
      showLevelUp();
    }
  }

  function updateDailyQuestProgress() {
    if (!state || !state.dailyQuest) return;

    const todayKey = getDayKey();
    if (state.dailyQuest.dayKey !== todayKey) {
      state.dailyQuest = makeDailyQuest();
      state.lastDailyTick = now();
      showMessage('📅 Nowa misja dzienna jest już dostępna!', 3500);
    }

    const tickNow = now();
    const delta = Math.max(0, tickNow - state.lastDailyTick);
    state.lastDailyTick = tickNow;
    state.dailyQuest.onlineProgressMs = Math.min(
      CONFIG.DAILY_ONLINE_TARGET_MS,
      state.dailyQuest.onlineProgressMs + delta
    );
  }

  function claimDailyReward() {
    if (!state || !state.dailyQuest) return;
    if (state.dailyQuest.claimed) {
      showMessage('✅ Nagroda dzienna już odebrana');
      return;
    }
    if (!isDailyQuestCompleted()) {
      showMessage('⏳ Dokończ misję dnia, aby odebrać nagrodę');
      return;
    }

    state.dailyQuest.claimed = true;
    state.coins += CONFIG.DAILY_REWARD_COINS;
    gainXP(CONFIG.DAILY_REWARD_XP);
    showMessage(`🎁 Nagroda: +${CONFIG.DAILY_REWARD_COINS} monet i +${CONFIG.DAILY_REWARD_XP} XP!`, 4500);
    updateUI();
    persistState();
  }

  // ---------------------------------------------------------------------------
  // Powiadomienia
  // ---------------------------------------------------------------------------
  function showMessage(text, duration = 3000) {
    const msgEl = document.getElementById('__ts_msg__');
    if (!msgEl) return;
    msgEl.textContent = text;
    clearTimeout(showMessage._timer);
    showMessage._timer = setTimeout(() => {
      if (msgEl) msgEl.textContent = '';
    }, duration);
  }

  function showLevelUp() {
    const existingLU = document.getElementById('__ts_levelup__');
    if (existingLU) existingLU.remove();

    const el = document.createElement('div');
    el.id = '__ts_levelup__';
    el.innerHTML = `🎉 POZIOM ${state.level}! 🎉<br><small>Żelek urósł!</small>`;
    const target = document.body || document.documentElement;
    if (target) {
      target.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.remove(); }, 3000);
    }
  }

  // ---------------------------------------------------------------------------
  // Odrodzenie żelka
  // ---------------------------------------------------------------------------
  function reviveZelek() {
    if (state.alive) return;
    state.alive   = true;
    state.hp      = CONFIG.REVIVE_HP;
    state.hunger  = CONFIG.REVIVE_HUNGER;
    showMessage(`✨ Żelek ożył z ${CONFIG.REVIVE_HP} HP!`, 4000);
    updateUI();
    persistState();
  }

  // Kliknięcie na żelka gdy martwy → wskrzeszenie
  function bindRevive() {
    const zelekEl = document.getElementById('__ts_zelek__');
    if (!zelekEl) return;
    zelekEl.addEventListener('click', () => {
      if (!state.alive) reviveZelek();
    });
    zelekEl.addEventListener('touchstart', () => {
      if (!state.alive) reviveZelek();
    }, { passive: true });
  }

  // ---------------------------------------------------------------------------
  // Wylogowanie
  // ---------------------------------------------------------------------------
  function bindLogout() {
    const btn = document.getElementById('__ts_logout__');
    if (!btn) return;
    btn.addEventListener('click', () => {
      persistState();
      AUTH.clearSession();
      state       = null;
      _currentUser = '';
      const widget = document.getElementById(WIDGET_ID);
      if (widget) widget.remove();
      showAuthModal(startGame);
    });
  }

  function bindDailyQuest() {
    const btn = document.getElementById('__ts_claim_daily__');
    if (!btn) return;
    btn.addEventListener('click', claimDailyReward);
  }

  // ---------------------------------------------------------------------------
  // Główna pętla
  // ---------------------------------------------------------------------------
  function mainLoop() {
    updateDailyQuestProgress();
    hungerTick();
    updateUI();
  }

  // ---------------------------------------------------------------------------
  // Inicjalizacja
  // ---------------------------------------------------------------------------
  function init(widget) {
    _widgetEl = widget;
    bindDrag();
    bindToggle();
    bindRevive();
    bindLogout();
    bindDailyQuest();
    updateUI();

    // Ticki gry
    setInterval(mainLoop,       10000);  // co 10s
    setInterval(hpRegenTick,    CONFIG.HP_REGEN_INTERVAL);
    setInterval(trySpawnFood,   CONFIG.FOOD_SPAWN_INTERVAL);
    setInterval(persistState,   30000);  // zapis co 30s

    // Odliczanie online co sekundę (tylko zegar)
    setInterval(() => {
      const el = document.getElementById('__ts_online__');
      if (el) {
        const ms = state.totalOnline + (now() - state.sessionStart);
        el.textContent = formatTime(ms);
      }
    }, 1000);

    // Zapisz przy zamknięciu/przeładowaniu strony
    window.addEventListener('beforeunload', persistState);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persistState();
    });

    // Pierwsze pojawienie jedzenia z małym opóźnieniem
    setTimeout(trySpawnFood, 5000);
  }

  // ---------------------------------------------------------------------------
  // Start – sprawdź sesję lub pokaż modal logowania
  // ---------------------------------------------------------------------------

  // Zapobiega podwójnemu uruchomieniu (np. gdy launcher + bezpośredni install)
  if (window.__TS_RUNNING__) return;
  window.__TS_RUNNING__ = true;

  function startGame(username) {
    _currentUser = username;
    loadStateForUser();
    try {
      mountWidget();
    } catch (err) {
      console.error('[TamaSkrypt] Błąd montowania widgetu:', err);
    }
  }

  try {
    const session = AUTH.session();
    if (session) {
      startGame(session.username);
    } else {
      // Pierwsze wejście lub wygasła sesja – pokaż modal
      const target = document.body || document.documentElement;
      if (target) {
        showAuthModal(startGame);
      } else {
        setTimeout(() => showAuthModal(startGame), 500);
      }
    }
  } catch (err) {
    console.error('[TamaSkrypt] Błąd inicjalizacji:', err);
  }

})();
