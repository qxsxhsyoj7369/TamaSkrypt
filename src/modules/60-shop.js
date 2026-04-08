(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R) return;

  R.SHOP_ITEMS = [
    { id: 'snack_box', name: 'Snack Box', price: 30, desc: '+25 głodu (użyj w ekwipunku)', type: 'consume', effect: { hunger: 25 } },
    { id: 'vitamin_shot', name: 'Vitamin Shot', price: 45, desc: '+20 HP (użyj w ekwipunku)', type: 'consume', effect: { hp: 20 } },
    { id: 'xp_candy', name: 'XP Candy', price: 60, desc: '+40 XP (użyj w ekwipunku)', type: 'consume', effect: { xp: 40 } },
    { id: 'slow_hunger', name: 'Slow Hunger', price: 80, desc: '10 min wolniejszy głód', type: 'buff', effect: { key: 'slow_hunger', durationMs: 10 * 60 * 1000 } },
    { id: 'regen_boost', name: 'Regen Boost', price: 75, desc: '10 min szybsza regeneracja HP', type: 'buff', effect: { key: 'regen_boost', durationMs: 10 * 60 * 1000 } },
  ];

  R.getShopItem = function getShopItem(id) {
    return R.SHOP_ITEMS.find(item => item.id === id) || null;
  };

  R.buyShopItem = function buyShopItem(itemId) {
    if (!R.state) return;
    const item = R.getShopItem(itemId);
    if (!item) return;

    if (R.state.coins < item.price) {
      R.showMessage('💸 Za mało monet');
      return;
    }

    R.state.coins -= item.price;
    if (!R.state.inventory[item.id]) R.state.inventory[item.id] = 0;
    R.state.inventory[item.id] += 1;

    R.showMessage(`🛒 Kupiono: ${item.name}`);
    R.persistState();
    R.updateUI();
  };

  R.renderShopPanel = function renderShopPanel() {
    const panel = R.getElById ? R.getElById('__ts_panel_shop__') : document.getElementById('__ts_panel_shop__');
    if (!panel || panel.style.display === 'none') return;

    panel.innerHTML = R.SHOP_ITEMS.map((item) => {
      return `
        <div class="__ts_card__">
          <h5>${item.name}</h5>
          <div>${item.desc}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
            <span>💰 ${item.price}</span>
            <button class="__ts_btn__" data-buy-item="${item.id}">Kup</button>
          </div>
        </div>
      `;
    }).join('');

    panel.querySelectorAll('[data-buy-item]').forEach((btn) => {
      btn.addEventListener('click', () => R.buyShopItem(btn.getAttribute('data-buy-item')));
    });
  };
})();
