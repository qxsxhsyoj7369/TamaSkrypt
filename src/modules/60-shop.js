(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R) return;

  function getDomainRtdbKey(hostname) {
    return String(hostname || '')
      .toLowerCase()
      .replace(/[.#$\[\]\/]/g, '_');
  }

  async function adjustDomainDefense(delta, mode) {
    const multiplayer = R.multiplayer;
    if (!multiplayer || typeof multiplayer.getDomainControl !== 'function') {
      throw new Error('Multiplayer chwilowo niedostępny');
    }

    const hostname = window.location && window.location.hostname
      ? String(window.location.hostname).toLowerCase()
      : '';
    if (!hostname) throw new Error('Brak hosta domeny');

    const currentUid = String(R.currentUid || '');
    if (!currentUid) throw new Error('Brak autoryzacji');

    const domainState = await multiplayer.getDomainControl({ force: true });
    if (!domainState) throw new Error('Brak danych domeny');

    const isOwnedByPlayer = String(domainState.kingUid || '') === currentUid;
    const isHostile = Boolean(domainState.kingUid) && !isOwnedByPlayer;

    if (mode === 'own') {
      if (!isOwnedByPlayer) throw new Error('Wymagana Twoja zajęta domena');
    }
    if (mode === 'hostile') {
      if (!isHostile) throw new Error('Wymagana wroga domena');
      if (Math.max(0, Number(domainState.defensePoints) || 0) <= 0) {
        throw new Error('Wroga domena ma już DEF = 0');
      }
    }

    const firestore = window.firebase && typeof window.firebase.firestore === 'function'
      ? window.firebase.firestore()
      : null;

    if (firestore && typeof firestore.collection === 'function') {
      await firestore.runTransaction(async (tx) => {
        const ref = firestore.collection('domains').doc(hostname);
        const snap = await tx.get(ref);
        const current = snap.exists ? (snap.data() || {}) : {};

        const ownerUid = String(current.kingUid || '');
        const ownedNow = ownerUid === currentUid;
        const hostileNow = Boolean(ownerUid) && !ownedNow;

        if (mode === 'own' && !ownedNow) {
          throw new Error('Wymagana Twoja zajęta domena');
        }
        if (mode === 'hostile' && !hostileNow) {
          throw new Error('Wymagana wroga domena');
        }

        const currentDefense = Math.max(0, Number(current.defensePoints) || 0);
        if (mode === 'hostile' && currentDefense <= 0) {
          throw new Error('Wroga domena ma już DEF = 0');
        }

        const nextDefense = Math.max(0, currentDefense + delta);

        const serverTimestamp = window.firebase
          && window.firebase.firestore
          && window.firebase.firestore.FieldValue
          && typeof window.firebase.firestore.FieldValue.serverTimestamp === 'function'
          ? window.firebase.firestore.FieldValue.serverTimestamp()
          : Date.now();

        tx.set(ref, {
          defensePoints: nextDefense,
          updatedAt: serverTimestamp,
        }, { merge: true });
      });
    } else if (typeof R.firebaseRead === 'function' && typeof R.firebaseWrite === 'function') {
      const key = getDomainRtdbKey(hostname);
      const path = `mp_domains/${key}`;
      const current = await R.firebaseRead(path);
      const value = current && typeof current === 'object' ? current : null;
      if (!value) throw new Error('Brak danych domeny');

      const ownerUid = String(value.kingUid || '');
      const ownedNow = ownerUid === currentUid;
      const hostileNow = Boolean(ownerUid) && !ownedNow;

      if (mode === 'own' && !ownedNow) {
        throw new Error('Wymagana Twoja zajęta domena');
      }
      if (mode === 'hostile' && !hostileNow) {
        throw new Error('Wymagana wroga domena');
      }

      const currentDefense = Math.max(0, Number(value.defensePoints) || 0);
      if (mode === 'hostile' && currentDefense <= 0) {
        throw new Error('Wroga domena ma już DEF = 0');
      }

      const nextDefense = Math.max(0, currentDefense + delta);
      await R.firebaseWrite(path, {
        ...value,
        defensePoints: nextDefense,
        updatedAt: Date.now(),
      }, 'PUT');
    } else {
      throw new Error('Multiplayer chwilowo niedostępny');
    }

    if (multiplayer.forceRefreshCache) multiplayer.forceRefreshCache();
    await multiplayer.getDomainControl({ force: true });
  }

  R.getShopItem = function getShopItem(id) {
    if (!Array.isArray(R.SHOP_ITEMS)) return null;
    return R.SHOP_ITEMS.find(item => item && item.id === id) || null;
  };

  R.buyShopItem = async function buyShopItem(itemId) {
    if (!R.state) return false;
    const item = R.getShopItem(itemId);
    if (!item) return false;

    if (!R.state.purchases || typeof R.state.purchases !== 'object') {
      R.state.purchases = {};
    }
    if (!R.state.inventory || typeof R.state.inventory !== 'object') {
      R.state.inventory = {};
    }

    const price = R.getShopItemPrice ? R.getShopItemPrice(itemId) : Math.max(0, Number(item.basePrice) || 0);

    if ((Number(R.state.coins) || 0) < price) {
      R.showMessage('❌ Za mało monet!');
      return false;
    }

    const prevCoins = Math.max(0, Number(R.state.coins) || 0);
    const prevOwned = Math.max(0, Number(R.state.purchases[itemId]) || 0);
    const prevInventory = { ...(R.state.inventory || {}) };

    R.state.coins = prevCoins - price;
    R.state.purchases[itemId] = prevOwned + 1;

    let inventoryChanged = false;

    try {
      if (item.type === 'consume' || item.type === 'buff') {
        const currentAmount = Math.max(0, Number(R.state.inventory[item.id]) || 0);
        R.state.inventory[item.id] = currentAmount + 1;
        inventoryChanged = true;
      } else if (itemId === 'domain_shield') {
        await adjustDomainDefense(50, 'own');
      } else if (itemId === 'domain_nuke') {
        await adjustDomainDefense(-50, 'hostile');
      }
    } catch (error) {
      R.state.coins = prevCoins;
      R.state.inventory = prevInventory;
      if (prevOwned > 0) {
        R.state.purchases[itemId] = prevOwned;
      } else {
        delete R.state.purchases[itemId];
      }
      const message = error && error.message ? String(error.message) : 'Zakup nieudany';
      R.showMessage(`⚠️ ${message}`);
      return false;
    }

    const saveFn = typeof R.saveProgress === 'function'
      ? R.saveProgress
      : (typeof R.persistState === 'function' ? R.persistState : null);

    try {
      if (saveFn) {
        await saveFn();
      }
    } catch (error) {
      R.state.coins = prevCoins;
      R.state.inventory = prevInventory;
      if (prevOwned > 0) {
        R.state.purchases[itemId] = prevOwned;
      } else {
        delete R.state.purchases[itemId];
      }
      const message = error && error.message ? String(error.message) : 'Błąd zapisu postępu';
      R.showMessage(`⚠️ ${message}`);
      return false;
    }

    R.updateUI();
    R.showMessage(`🛒 Kupiono: ${item.name}`);
    return inventoryChanged;
  };

  R.renderShopPanel = function renderShopPanel() {
    const panel = R.getElById ? R.getElById('__ts_panel_shop__') : document.getElementById('__ts_panel_shop__');
    if (!panel) return;

    if (!R.state || !R.state.purchases || typeof R.state.purchases !== 'object') {
      if (R.state) R.state.purchases = {};
    }

    const shopItems = Array.isArray(R.SHOP_ITEMS) ? R.SHOP_ITEMS : [];

    const renderCard = (item) => {
      const currentPrice = R.getShopItemPrice ? R.getShopItemPrice(item.id) : Math.max(0, Number(item.basePrice) || 0);
      const owned = Math.max(0, Number(R.state && R.state.purchases && R.state.purchases[item.id]) || 0);
      return `
        <div class="__ts_shop_item_card__">
          <div class="__ts_shop_item_header__">
            <span class="__ts_shop_item_icon__">${item.icon || '🛍️'}</span>
            <span class="__ts_shop_item_name__">${item.name}</span>
            <span class="__ts_shop_item_owned__" style="margin-left: auto; color: #37e9ff; font-size: 10px;">Posiadasz: ${owned}</span>
          </div>
          <div class="__ts_shop_item_desc__">${item.desc || item.description || ''}</div>
          <div class="__ts_shop_item_footer__">
            <span class="__ts_shop_item_price__">🪙 ${R.formatNum ? R.formatNum(currentPrice) : currentPrice}</span>
            <button class="__ts_forum_btn__ __ts_shop_buy_btn__" data-action="buy-item" data-id="${item.id}">Kup</button>
          </div>
        </div>
      `;
    };

    const personalItems = shopItems.filter(item => String(item && item.category || '').toLowerCase() === 'personal');
    const factionItems = shopItems.filter(item => String(item && item.category || '').toLowerCase() === 'faction');

    const personalHtml = personalItems.map(renderCard).join('') || '<div class="__ts_card__">Brak pozycji osobistych.</div>';
    const factionHtml = factionItems.map(renderCard).join('') || '<div class="__ts_card__">Brak pozycji domenowych.</div>';

    panel.innerHTML = `
      <div class="__ts_shop_section_title__">Dla Gelka</div>
      <div class="__ts_shop_grid__">${personalHtml}</div>
      <div class="__ts_shop_section_title__">Domenowe & Frakcyjne</div>
      <div class="__ts_shop_grid__">${factionHtml}</div>
    `;

    panel.querySelectorAll('[data-action="buy-item"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        btn.disabled = true;
        try {
          await R.buyShopItem(id);
        } finally {
          btn.disabled = false;
          if (R.renderShopPanel) R.renderShopPanel();
        }
      });
    });
  };
})();
