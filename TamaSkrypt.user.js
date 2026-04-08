// ==UserScript==
// @name         TamaSkrypt – Żelek w przeglądarce
// @namespace    https://github.com/qxsxhsyoj7369/TamaSkrypt
// @version      1.0.0
// @description  Wirtualny żelek żyjący w Twojej przeglądarce. Karm go, opiekuj się nim i zdobywaj poziomy!
// @author       TamaSkrypt
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
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
  // Persystencja danych
  // ---------------------------------------------------------------------------
  function load(key, def) {
    try {
      const v = GM_getValue(key, null);
      return v === null ? def : v;
    } catch {
      return def;
    }
  }
  function save(key, value) {
    try { GM_setValue(key, value); } catch { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Stan gry
  // ---------------------------------------------------------------------------
  const now = () => Date.now();

  let state = {
    hunger:       load('hunger',       100),
    hp:           load('hp',           100),
    level:        load('level',        1),
    xp:           load('xp',           0),
    totalOnline:  load('totalOnline',  0),   // ms
    sessionStart: now(),
    lastSave:     now(),
    lastHungerTick: load('lastHungerTick', now()),
    alive:        load('alive', true),
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

  function persistState() {
    save('hunger',       state.hunger);
    save('hp',           state.hp);
    save('level',        state.level);
    save('xp',           state.xp);
    save('alive',        state.alive);
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

  // Usuń widget jeśli już istnieje (np. SPA rerender)
  const existing = document.getElementById(WIDGET_ID);
  if (existing) existing.remove();

  // Główny kontener widgetu
  const widget = document.createElement('div');
  widget.id = WIDGET_ID;
  widget.innerHTML = buildWidgetHTML();
  applyWidgetStyles(widget);
  document.body.appendChild(widget);

  function buildWidgetHTML() {
    const mood    = getMood();
    const onlineMs = state.totalOnline + (now() - state.sessionStart);
    const xpPct   = Math.round((state.xp / CONFIG.XP_PER_LEVEL) * 100);
    const hungerPct = Math.max(0, Math.min(100, state.hunger));
    const hpPct     = Math.max(0, Math.min(100, state.hp));

    return `
      <div id="__ts_header__">
        <span id="__ts_toggle__" title="Pokaż/Ukryj">🟢</span>
        <span id="__ts_title__">TamaSkrypt</span>
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
          <span>Online: <strong id="__ts_online__">${formatTime(onlineMs)}</strong></span>
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
  function applyWidgetStyles(el) {
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
        touch-action: none;
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
    `;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Obsługa przeciągania widgetu
  // ---------------------------------------------------------------------------
  const header = () => document.getElementById('__ts_header__');

  let dragging = false;
  let dragOX = 0, dragOY = 0;

  function onDragStart(e) {
    if (e.target.id === '__ts_toggle__') return;
    dragging = true;
    const touch = e.touches ? e.touches[0] : e;
    const rect = widget.getBoundingClientRect();
    dragOX = touch.clientX - rect.left;
    dragOY = touch.clientY - rect.top;
    widget.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function onDragMove(e) {
    if (!dragging) return;
    const touch = e.touches ? e.touches[0] : e;
    let x = touch.clientX - dragOX;
    let y = touch.clientY - dragOY;
    x = Math.max(0, Math.min(window.innerWidth  - widget.offsetWidth,  x));
    y = Math.max(0, Math.min(window.innerHeight - widget.offsetHeight, y));
    widget.style.right  = 'auto';
    widget.style.bottom = 'auto';
    widget.style.left   = x + 'px';
    widget.style.top    = y + 'px';
    e.preventDefault();
  }
  function onDragEnd() {
    dragging = false;
    widget.style.cursor = 'default';
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

    const infoEl = document.getElementById('__ts_info__');
    if (infoEl) {
      const spans = infoEl.querySelectorAll('span');
      if (spans[0]) spans[0].innerHTML = `Poziom: <strong>${state.level}</strong>`;
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

    document.body.appendChild(el);
    activeFood = el;

    // Usuń po czasie jeśli nie zjedzone
    setTimeout(() => {
      if (document.body.contains(el)) {
        el.remove();
        if (activeFood === el) activeFood = null;
      }
    }, CONFIG.FOOD_DURATION);
  }

  function eatFood(el, food) {
    if (!state.alive) return;

    el.classList.add('ts_food_poof');
    setTimeout(() => {
      if (document.body.contains(el)) el.remove();
      if (activeFood === el) activeFood = null;
    }, 400);

    state.hunger = Math.min(100, state.hunger + food.hunger);
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
    const existing = document.getElementById('__ts_levelup__');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = '__ts_levelup__';
    el.innerHTML = `🎉 POZIOM ${state.level}! 🎉<br><small>Żelek urósł!</small>`;
    document.body.appendChild(el);
    setTimeout(() => { if (document.body.contains(el)) el.remove(); }, 3000);
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
  // Główna pętla
  // ---------------------------------------------------------------------------
  function mainLoop() {
    hungerTick();
    updateUI();
  }

  // ---------------------------------------------------------------------------
  // Inicjalizacja
  // ---------------------------------------------------------------------------
  function init() {
    bindDrag();
    bindToggle();
    bindRevive();
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

  init();

})();
