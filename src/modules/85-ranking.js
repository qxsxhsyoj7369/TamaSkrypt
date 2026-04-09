(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R || !R.firebaseRead || !R.firebaseWrite) return;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function computeScoreFromValues(values) {
    const level = Math.max(1, Number(values?.level) || 1);
    const xp = Math.max(0, Number(values?.xp) || 0);
    const foodsEaten = Math.max(0, Number(values?.foodsEaten ?? values?.foodCollected) || 0);
    const coins = Math.max(0, Number(values?.coins) || 0);
    return (level * 1000) + (xp * 2) + (foodsEaten * 5) + coins;
  }

  function resolveFactionId(value) {
    const key = String(value || '').toLowerCase();
    if (key === 'neon' || key === 'toxic' || key === 'plasma') return key;
    return 'neon';
  }

  function factionDot(id) {
    const factionId = resolveFactionId(id);
    return `<span class="__ts_faction_dot__ __ts_faction_dot_${factionId}__"></span>`;
  }

  R.ranking = R.ranking || {
    scope: 'allTime',
    loading: false,
    lastUpdatedAt: 0,
    lastFetchedAt: 0,
    source: 'none',
    daily: [],
    allTime: [],
    factionDominance: null,
    factionKings: null,
    lastFactionFetchAt: 0,
    factionLoading: false,
  };

  R.computeScore = function computeScore() {
    if (!R.state) return 0;
    return computeScoreFromValues(R.state);
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
      totalOnlineMs: R.state.totalOnline + (R.now() - R.state.sessionStart),
      updatedAt: R.now(),
      dayKey: scope === 'daily' ? R.getDayKey() : null,
    };
  };

  function buildUserDerivedRecord(uid, user, scope) {
    const profile = user && user.profile ? user.profile : {};
    const pet = user && user.pet ? user.pet : {};
    const progress = user && user.progress ? user.progress : {};
    const stats = user && user.stats ? user.stats : {};
    const rankingProfile = user && user.rankingProfile ? user.rankingProfile : {};
    const scopedSnapshot = rankingProfile && rankingProfile[scope] ? rankingProfile[scope] : null;

    const record = {
      uid,
      username: (scopedSnapshot && scopedSnapshot.username) || profile.username || uid,
      level: Number((scopedSnapshot && scopedSnapshot.level) ?? pet.level) || 1,
      xp: Number((scopedSnapshot && scopedSnapshot.xp) ?? pet.xp) || 0,
      foodsEaten: Number((scopedSnapshot && scopedSnapshot.foodsEaten) ?? pet.foodCollected) || 0,
      coins: Number((scopedSnapshot && scopedSnapshot.coins) ?? progress.coins) || 0,
      totalOnlineMs: Number((scopedSnapshot && scopedSnapshot.totalOnlineMs) ?? stats.totalOnlineMs) || 0,
      updatedAt: Number((scopedSnapshot && scopedSnapshot.updatedAt) ?? progress.updatedAt ?? pet.updatedAt) || 0,
      dayKey: scope === 'daily'
        ? ((scopedSnapshot && scopedSnapshot.dayKey) || (progress.dailyQuest && progress.dailyQuest.dayKey) || R.getDayKey())
        : null,
    };

    record.score = Number((scopedSnapshot && scopedSnapshot.score)) || computeScoreFromValues(record);
    return record;
  }

  function normalizeRecords(records, scope) {
    const currentDay = R.getDayKey();
    return (Array.isArray(records) ? records : [])
      .map((item) => ({
        uid: item.uid,
        username: item.username || item.uid,
        level: Math.max(1, Number(item.level) || 1),
        xp: Math.max(0, Number(item.xp) || 0),
        foodsEaten: Math.max(0, Number(item.foodsEaten ?? item.foodCollected) || 0),
        coins: Math.max(0, Number(item.coins) || 0),
        totalOnlineMs: Math.max(0, Number(item.totalOnlineMs) || 0),
        updatedAt: Number(item.updatedAt) || 0,
        dayKey: scope === 'daily' ? (item.dayKey || currentDay) : null,
        score: Number(item.score) || computeScoreFromValues(item),
      }))
      .filter((item) => item && item.uid)
      .filter((item) => scope !== 'daily' || item.dayKey === currentDay)
      .sort((a, b) => {
        if ((Number(b.score) || 0) !== (Number(a.score) || 0)) {
          return (Number(b.score) || 0) - (Number(a.score) || 0);
        }
        return (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0);
      })
      .slice(0, 10);
  }

  function normalizeRankingNode(raw, scope) {
    const entries = raw && typeof raw === 'object' ? Object.entries(raw) : [];
    return normalizeRecords(entries.map(([uid, value]) => ({ uid, ...(value || {}) })), scope);
  }

  function normalizeUsersFallback(rawUsers, scope) {
    const entries = rawUsers && typeof rawUsers === 'object' ? Object.entries(rawUsers) : [];
    return normalizeRecords(entries.map(([uid, user]) => buildUserDerivedRecord(uid, user || {}, scope)), scope);
  }

  R.syncRanking = async function syncRanking(reason = 'state-change') {
    if (!R.currentUid || !R.state) return;
    const now = R.now();
    if (R.ranking.lastSyncAttemptAt && now - R.ranking.lastSyncAttemptAt < 15000) return;
    R.ranking.lastSyncAttemptAt = now;

    const dailyRecord = R.getRankingRecord('daily');
    const allTimeRecord = R.getRankingRecord('allTime');
    const rankingProfile = {
      daily: dailyRecord,
      allTime: allTimeRecord,
      updatedAt: now,
    };

    try {
      const results = await Promise.allSettled([
        R.firebaseWrite(`ranking/daily/${R.currentUid}`, dailyRecord, 'PUT'),
        R.firebaseWrite(`ranking/allTime/${R.currentUid}`, allTimeRecord, 'PUT'),
        R.firebaseWrite(`users/${R.currentUid}/rankingProfile`, rankingProfile, 'PATCH'),
      ]);

      const failures = results.filter((item) => item.status === 'rejected');
      if (failures.length === results.length) {
        throw failures[0].reason || new Error('Ranking sync failed');
      }

      R.ranking.lastUpdatedAt = now;
      R.ranking.lastReason = reason;
      R.ranking.lastError = '';
      R.ranking.lastSyncAt = now;
      if (R.fetchLeaderboard) {
        R.fetchLeaderboard(false).catch(() => {});
      }
    } catch (error) {
      R.ranking.lastError = error && error.message ? error.message : String(error);
      console.warn('[Gelek] Ranking sync error:', R.ranking.lastError);
    }
  };

  R.fetchLeaderboard = async function fetchLeaderboard(force = false) {
    const now = R.now();
    if (!force && R.ranking.lastFetchedAt && now - R.ranking.lastFetchedAt < 20000) {
      return R.ranking;
    }

    R.ranking.loading = true;
    if (R.renderRankingPanel) R.renderRankingPanel();

    try {
      const [dailyResult, allTimeResult] = await Promise.allSettled([
        R.firebaseRead('ranking/daily'),
        R.firebaseRead('ranking/allTime'),
      ]);

      const dailyRaw = dailyResult.status === 'fulfilled' ? dailyResult.value : null;
      const allTimeRaw = allTimeResult.status === 'fulfilled' ? allTimeResult.value : null;
      let dailyRows = normalizeRankingNode(dailyRaw, 'daily');
      let allTimeRows = normalizeRankingNode(allTimeRaw, 'allTime');
      let source = (dailyRows.length || allTimeRows.length) ? 'ranking' : 'none';

      if (!dailyRows.length && !allTimeRows.length) {
        const usersRaw = await R.firebaseRead('users');
        dailyRows = normalizeUsersFallback(usersRaw, 'daily');
        allTimeRows = normalizeUsersFallback(usersRaw, 'allTime');
        source = (dailyRows.length || allTimeRows.length) ? 'users-fallback' : 'empty';
      }

      R.ranking.daily = dailyRows;
      R.ranking.allTime = allTimeRows;
      R.ranking.lastFetchedAt = now;
      R.ranking.lastError = '';
      R.ranking.source = source;
      return R.ranking;
    } catch (error) {
      R.ranking.lastError = error && error.message ? error.message : String(error);
      R.ranking.source = 'error';
      console.warn('[Gelek] Ranking fetch error:', R.ranking.lastError);
      return R.ranking;
    } finally {
      R.ranking.loading = false;
      if (R.renderRankingPanel) R.renderRankingPanel();
    }
  };

  R.fetchFactionWarStats = async function fetchFactionWarStats(force = false) {
    if (!R.multiplayer || typeof R.multiplayer.refreshWarStats !== 'function') {
      const now = R.now();
      R.ranking.lastFactionFetchAt = now;
      return {
        dominance: R.ranking.factionDominance,
        kings: R.ranking.factionKings,
      };
    }
    const now = R.now();
    if (!force && R.ranking.lastFactionFetchAt && now - R.ranking.lastFactionFetchAt < 30000) {
      return {
        dominance: R.ranking.factionDominance,
        kings: R.ranking.factionKings,
      };
    }

    try {
      R.ranking.factionLoading = true;
      const stats = await R.multiplayer.refreshWarStats(force);
      R.ranking.factionDominance = stats && stats.dominance ? stats.dominance : null;
      R.ranking.factionKings = stats && stats.kings ? stats.kings : null;
      R.ranking.lastFactionFetchAt = now;
      return stats;
    } catch (_) {
      R.ranking.lastFactionFetchAt = now;
      return {
        dominance: R.ranking.factionDominance,
        kings: R.ranking.factionKings,
      };
    } finally {
      R.ranking.factionLoading = false;
    }
  };

  R.renderRankingPanel = function renderRankingPanel() {
    const panel = R.getElById ? R.getElById('__ts_panel_ranking__') : document.getElementById('__ts_panel_ranking__');
    if (!panel || panel.style.display === 'none') return;

    const scope = R.ranking.scope || 'allTime';
    const rows = scope === 'daily' ? R.ranking.daily : R.ranking.allTime;
    const myUid = R.currentUid;

    const dominance = R.ranking.factionDominance;
    const factionKings = R.ranking.factionKings || {};
    const hasDominanceData = Boolean(dominance && Number(dominance.total || 0) > 0 && Array.isArray(dominance.factions));

    const dominanceSegments = hasDominanceData
      ? dominance.factions.map((entry) => `<span style="height:100%;width:${Math.max(0, Math.min(100, Number(entry.percent) || 0))}%;background:${escapeHtml(entry.color || '#888')};display:inline-block;"></span>`).join('')
      : '<span style="height:100%;width:100%;background:rgba(160,160,160,.45);display:inline-block;"></span>';

    const dominanceLegend = hasDominanceData
      ? dominance.factions.map((entry) => {
          const id = resolveFactionId(entry.id || entry.name);
          return `<span style="display:inline-flex;align-items:center;gap:5px;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,.08);font-size:9px;">${factionDot(id)} ${escapeHtml(entry.name || entry.id)} ${Number(entry.percent || 0).toFixed(1)}%</span>`;
        }).join('')
      : '<span style="font-size:9px;opacity:.85;">Internet czeka na podbój!</span>';

    const factionRows = ['neon', 'toxic', 'plasma'].map((factionId) => {
      const rowsForFaction = Array.isArray(factionKings[factionId]) ? factionKings[factionId] : [];
      const title = factionId.charAt(0).toUpperCase() + factionId.slice(1);
      const body = rowsForFaction.length
        ? rowsForFaction.map((entry, index) => `
            <div style="display:flex;justify-content:space-between;gap:8px;font-size:9px;margin-top:${index === 0 ? 0 : 3}px;">
              <span>#${index + 1} ${escapeHtml(entry.kingName || entry.kingUid || 'unknown')}</span>
              <span>${Math.max(0, Number(entry.defensePoints) || 0)} DEF</span>
            </div>
          `).join('')
        : '<div style="font-size:9px;opacity:.72;">Brak króla</div>';
      return `<div class="__ts_card__" style="padding:5px 6px;margin-bottom:4px;"><div style="font-size:10px;font-weight:700;margin-bottom:3px;display:inline-flex;align-items:center;gap:5px;">${factionDot(factionId)} ${escapeHtml(title)}</div>${body}</div>`;
    }).join('');

    const header = `
      <div class="__ts_card__" style="padding:6px 7px;margin-bottom:6px;">
        <div style="font-size:10px;font-weight:700;margin-bottom:4px;">Pasek Dominacji</div>
        <div style="height:8px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.08);display:flex;">${dominanceSegments}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;">${dominanceLegend}</div>
      </div>
      <div style="margin-bottom:6px;">${factionRows}</div>
      <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
        <button class="__ts_btn__" data-ranking-scope="daily" style="flex:1;opacity:${scope === 'daily' ? '1' : '.75'};">Dzienny</button>
        <button class="__ts_btn__" data-ranking-scope="allTime" style="flex:1;opacity:${scope === 'allTime' ? '1' : '.75'};">All-time</button>
        <button class="__ts_btn__" data-ranking-refresh="1" style="padding:4px 7px;">↻</button>
      </div>
    `;

    const status = R.ranking.loading
      ? '<div class="__ts_card__">⏳ Ładowanie rankingu...</div>'
      : rows.length
        ? rows.map((item, index) => {
            const isMe = item.uid === myUid;
            return `
              <div class="__ts_card__" style="${isMe ? 'border-color:#7c5cff;background:#f6f0ff;' : ''}">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
                  <strong>#${index + 1} ${escapeHtml(item.username || item.uid)}${isMe ? ' • Ty' : ''}</strong>
                  <span>${item.score || 0} pkt</span>
                </div>
                <div style="margin-top:4px;font-size:10px;color:#555;">Lvl ${item.level || 1} • XP ${item.xp || 0} • Jedzenie ${item.foodsEaten || 0} • Monety ${item.coins || 0}</div>
              </div>
            `;
          }).join('')
        : '<div class="__ts_card__">Brak danych rankingu jeszcze. Zagraj chwilę, aby zapisać pierwszy wynik.</div>';

    const footer = R.ranking.lastError
      ? `<div style="font-size:10px;color:#c53030;margin-top:6px;">Błąd: ${R.ranking.lastError}</div>`
      : `<div style="font-size:10px;color:#666;margin-top:6px;">Źródło: ${escapeHtml(R.ranking.source || '—')} • Aktualizacja: ${R.ranking.lastFetchedAt ? new Date(R.ranking.lastFetchedAt).toLocaleTimeString() : '—'}</div>`;

    panel.innerHTML = header + status + footer;

    panel.querySelectorAll('[data-ranking-scope]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        R.ranking.scope = btn.getAttribute('data-ranking-scope') || 'allTime';
        R.renderRankingPanel();
        await R.fetchLeaderboard(true);
        R.renderRankingPanel();
      });
    });

    panel.querySelectorAll('[data-ranking-refresh]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await Promise.all([
          R.fetchLeaderboard(true),
          R.fetchFactionWarStats ? R.fetchFactionWarStats(true) : Promise.resolve(),
        ]);
        R.renderRankingPanel();
      });
    });

    const shouldAutoFetchFaction = Boolean(
      R.fetchFactionWarStats
      && !R.ranking.factionLoading
      && !R.ranking.lastFactionFetchAt
      && !R.ranking.factionDominance
      && !R.ranking.factionKings
    );

    if (shouldAutoFetchFaction) {
      R.fetchFactionWarStats(false).then(() => {
        if (panel.style.display !== 'none') R.renderRankingPanel();
      }).catch(() => {});
    }
  };
})();
