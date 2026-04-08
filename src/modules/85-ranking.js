(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R || !R.firebaseRead || !R.firebaseWrite) return;

  R.ranking = R.ranking || {
    scope: 'allTime',
    loading: false,
    lastUpdatedAt: 0,
    daily: [],
    allTime: [],
  };

  R.computeScore = function computeScore() {
    if (!R.state) return 0;
    return (R.state.level * 1000)
      + (R.state.xp * 2)
      + (R.state.foodCollected * 5)
      + R.state.coins;
  };

  R.getRankingRecord = function getRankingRecord(scope) {
    if (!R.state) return null;
    return {
      uid: R.currentUid,
      username: R.currentUser,
      level: R.state.level,
      xp: R.state.xp,
      foodsEaten: R.state.foodCollected,
      coins: R.state.coins,
      score: R.computeScore(),
      updatedAt: R.now(),
      dayKey: scope === 'daily' ? R.getDayKey() : null,
    };
  };

  R.syncRanking = async function syncRanking(reason = 'state-change') {
    if (!R.currentUid || !R.state) return;
    const now = R.now();
    if (R.ranking.lastSyncAttemptAt && now - R.ranking.lastSyncAttemptAt < 15000) return;
    R.ranking.lastSyncAttemptAt = now;

    const dailyRecord = R.getRankingRecord('daily');
    const allTimeRecord = R.getRankingRecord('allTime');

    try {
      await Promise.all([
        R.firebaseWrite(`ranking/daily/${R.currentUid}`, dailyRecord, 'PUT'),
        R.firebaseWrite(`ranking/allTime/${R.currentUid}`, allTimeRecord, 'PUT'),
      ]);
      R.ranking.lastUpdatedAt = now;
      R.ranking.lastReason = reason;
      R.ranking.lastError = '';
      if (R.renderRankingPanel) {
        R.fetchLeaderboard(false).catch(() => {});
      }
    } catch (error) {
      R.ranking.lastError = error && error.message ? error.message : String(error);
      console.warn('[Gelek] Ranking sync error:', R.ranking.lastError);
    }
  };

  function normalizeRecords(obj, scope) {
    const entries = obj && typeof obj === 'object' ? Object.entries(obj) : [];
    const currentDay = R.getDayKey();
    return entries
      .map(([uid, value]) => ({ uid, ...(value || {}) }))
      .filter((item) => item && typeof item === 'object')
      .filter((item) => scope !== 'daily' || !item.dayKey || item.dayKey === currentDay)
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
      .slice(0, 10);
  }

  R.fetchLeaderboard = async function fetchLeaderboard(force = false) {
    const now = R.now();
    if (!force && R.ranking.lastFetchedAt && now - R.ranking.lastFetchedAt < 20000) {
      return R.ranking;
    }

    R.ranking.loading = true;
    try {
      const [dailyRaw, allTimeRaw] = await Promise.all([
        R.firebaseRead('ranking/daily'),
        R.firebaseRead('ranking/allTime'),
      ]);
      R.ranking.daily = normalizeRecords(dailyRaw, 'daily');
      R.ranking.allTime = normalizeRecords(allTimeRaw, 'allTime');
      R.ranking.lastFetchedAt = now;
      R.ranking.lastError = '';
      return R.ranking;
    } catch (error) {
      R.ranking.lastError = error && error.message ? error.message : String(error);
      console.warn('[Gelek] Ranking fetch error:', R.ranking.lastError);
      return R.ranking;
    } finally {
      R.ranking.loading = false;
    }
  };

  R.renderRankingPanel = function renderRankingPanel() {
    const panel = document.getElementById('__ts_panel_ranking__');
    if (!panel || panel.style.display === 'none') return;

    const scope = R.ranking.scope || 'allTime';
    const rows = scope === 'daily' ? R.ranking.daily : R.ranking.allTime;

    const header = `
      <div style="display:flex;gap:4px;margin-bottom:6px;">
        <button class="__ts_btn__" data-ranking-scope="daily" style="flex:1;opacity:${scope === 'daily' ? '1' : '.75'};">Dzienny</button>
        <button class="__ts_btn__" data-ranking-scope="allTime" style="flex:1;opacity:${scope === 'allTime' ? '1' : '.75'};">All-time</button>
      </div>
    `;

    const body = rows.length
      ? rows.map((item, index) => `
          <div class="__ts_card__">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
              <strong>#${index + 1} ${item.username || item.uid}</strong>
              <span>${item.score || 0} pkt</span>
            </div>
            <div style="margin-top:4px;font-size:10px;color:#555;">Lvl ${item.level || 1} • XP ${item.xp || 0} • Jedzenie ${item.foodsEaten || 0} • Monety ${item.coins || 0}</div>
          </div>
        `).join('')
      : '<div class="__ts_card__">Brak danych rankingu jeszcze.</div>';

    const footer = R.ranking.lastError
      ? `<div style="font-size:10px;color:#c53030;margin-top:6px;">Błąd: ${R.ranking.lastError}</div>`
      : `<div style="font-size:10px;color:#666;margin-top:6px;">Aktualizacja: ${R.ranking.lastFetchedAt ? new Date(R.ranking.lastFetchedAt).toLocaleTimeString() : '—'}</div>`;

    panel.innerHTML = header + body + footer;

    panel.querySelectorAll('[data-ranking-scope]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        R.ranking.scope = btn.getAttribute('data-ranking-scope') || 'allTime';
        await R.fetchLeaderboard(true);
        R.renderRankingPanel();
      });
    });
  };
})();
