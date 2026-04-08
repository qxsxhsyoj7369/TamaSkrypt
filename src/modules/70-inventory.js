(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R) return;

  R.consumeItem = function consumeItem(itemId) {
    if (!R.state || !R.state.inventory[itemId] || R.state.inventory[itemId] < 1) {
      R.showMessage('Brak itemu w ekwipunku');
      return;
    }

    const item = R.getShopItem ? R.getShopItem(itemId) : null;
    if (!item) return;

    R.state.inventory[itemId] -= 1;
    if (R.state.inventory[itemId] <= 0) delete R.state.inventory[itemId];

    if (item.type === 'consume') {
      if (item.effect.hunger) R.state.hunger = R.clamp(R.state.hunger + item.effect.hunger, 0, 100);
      if (item.effect.hp) {
        const hpMax = R.getEffectiveHpMax ? R.getEffectiveHpMax() : R.CONFIG.HP_MAX;
        R.state.hp = R.clamp(R.state.hp + item.effect.hp, 0, hpMax);
      }
      if (item.effect.xp) {
        R.state.xp += item.effect.xp;
        while (R.state.xp >= R.CONFIG.XP_PER_LEVEL) {
          R.state.xp -= R.CONFIG.XP_PER_LEVEL;
          R.state.level += 1;
          if (R.recalculateEvolutionStats) R.recalculateEvolutionStats();
          R.showLevelUp();
        }
      }
      R.showMessage(`✨ Użyto: ${item.name}`);
    } else if (item.type === 'buff') {
      const expiresAt = R.now() + item.effect.durationMs;
      R.state.activeEffects[item.effect.key] = expiresAt;
      R.showMessage(`🧪 Aktywowano buff: ${item.name}`);
    }

    R.persistState();
    R.updateUI();
  };

  R.getActiveEffect = function getActiveEffect(key) {
    if (!R.state || !R.state.activeEffects) return false;
    const exp = Number(R.state.activeEffects[key] || 0);
    if (!exp) return false;
    if (exp < R.now()) {
      delete R.state.activeEffects[key];
      return false;
    }
    return true;
  };

  R.renderInventoryPanel = function renderInventoryPanel() {
    const panel = R.getElById ? R.getElById('__ts_panel_inventory__') : document.getElementById('__ts_panel_inventory__');
    if (!panel || panel.style.display === 'none') return;

    const inv = R.state && R.state.inventory ? R.state.inventory : {};
    const ids = Object.keys(inv);

    if (!ids.length) {
      panel.innerHTML = '<div class="__ts_card__">Pusto. Kup coś w sklepie.</div>';
      return;
    }

    panel.innerHTML = ids.map((id) => {
      const item = R.getShopItem ? R.getShopItem(id) : null;
      const name = item ? item.name : id;
      const amount = inv[id];
      return `
        <div class="__ts_card__">
          <h5>${name}</h5>
          <div>Ilość: ${amount}</div>
          <div style="margin-top:4px;"><button class="__ts_btn__" data-use-item="${id}">Użyj</button></div>
        </div>
      `;
    }).join('');

    panel.querySelectorAll('[data-use-item]').forEach((btn) => {
      btn.addEventListener('click', () => R.consumeItem(btn.getAttribute('data-use-item')));
    });
  };
})();
