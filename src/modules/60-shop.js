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
    if (!panel) return;

    const cards = R.SHOP_ITEMS.map((item) => {
      const itemDescription = item.description || item.desc || '';
      return `
        <div class="__ts_shop_item_card__">
          <div class="__ts_shop_item_header__">
            <span class="__ts_shop_item_icon__">🛍️</span>
            <span class="__ts_shop_item_name__">${item.name}</span>
          </div>
          <div class="__ts_shop_item_desc__">${itemDescription}</div>
          <div class="__ts_shop_item_footer__">
            <span class="__ts_shop_item_price__">🪙 ${item.price}</span>
            <button class="__ts_forum_btn__ __ts_shop_buy_btn__" data-action="buy-item" data-id="${item.id}">Kup</button>
          </div>
        </div>
      `;
    }).join('');

    panel.innerHTML = `<div class="__ts_shop_grid__">${cards}</div>`;

    panel.querySelectorAll('[data-action="buy-item"]').forEach((btn) => {
      btn.addEventListener('click', () => R.buyShopItem(btn.getAttribute('data-id')));
    });
  };
})();
