(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R) return;

  const CYBERCORE_CSS_ID = '__ts_cybercore_css__';
  const CYBERCORE_CSS_URL = 'https://unpkg.com/cybercore-css@latest/dist/cybercore.min.css';
  const FORUM_STYLE_ID = '__ts_forum_styles__';
  const TRIGGER_ID = '__ts_forum_trigger__';
  const MODAL_ID = '__ts_forum_modal__';

  const LIMITS = Object.freeze({
    title: 10,
    thread: 32,
    comment: 13,
  });

  function nowMs() {
    return Date.now();
  }

  function normalizeText(value, maxLen) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureStateUid() {
    if (!R.state) return;
    if (!R.state.uid) {
      R.state.uid = String(R.currentUid || '');
    }
  }

  function getCurrentUid() {
    ensureStateUid();
    return String((R.state && R.state.uid) || '');
  }

  function isOwner(authorUid) {
    ensureStateUid();
    return String((R.state && R.state.uid) || '') === String(authorUid || '');
  }

  function getFaction() {
    const rawFaction = (R.state && R.state.profileFaction) || (R.multiplayer && R.multiplayer.playerFaction) || 'neon';
    const key = String(rawFaction || '').toLowerCase();
    if (key === 'toxic' || key === 'plasma' || key === 'neon') return key;
    return 'neon';
  }

  function getFactionColor(faction) {
    if (faction === 'toxic') return '#8dff4f';
    if (faction === 'plasma') return '#37e9ff';
    return '#ff3fbf';
  }

  function getTimestampMs(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return Number(value.toMillis()) || 0;
    if (typeof value.toDate === 'function') {
      const date = value.toDate();
      return date instanceof Date ? date.getTime() : 0;
    }
    if (typeof value === 'number') return value;
    return 0;
  }

  function formatTime(value) {
    const ms = getTimestampMs(value);
    if (!ms) return '--';
    try {
      return new Date(ms).toLocaleString();
    } catch (_) {
      return '--';
    }
  }

  function ensureCybercoreCss() {
    const root = R.getWidgetRoot ? R.getWidgetRoot() : document.head;
    const target = root instanceof ShadowRoot ? root : document.head;
    if (target && typeof target.querySelector === 'function' && target.querySelector(`#${CYBERCORE_CSS_ID}`)) return;
    const link = document.createElement('link');
    link.id = CYBERCORE_CSS_ID;
    link.rel = 'stylesheet';
    link.href = CYBERCORE_CSS_URL;
    (target || document.head || document.documentElement).appendChild(link);
  }

  function ensureForumStyles() {
    const root = R.getWidgetRoot ? R.getWidgetRoot() : document.head;
    const target = root instanceof ShadowRoot ? root : document.head;
    if (target && typeof target.querySelector === 'function' && target.querySelector(`#${FORUM_STYLE_ID}`)) return;
    const style = document.createElement('style');
    style.id = FORUM_STYLE_ID;
    style.textContent = `
      #${MODAL_ID} {
        position: fixed !important;
        top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
        width: 100vw !important; height: 100vh !important;
        z-index: 2147483647 !important;
        background: rgba(3, 8, 18, 0.75) !important;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        pointer-events: auto !important;
      }
      #${MODAL_ID} .__ts_forum_window__ {
        width: min(700px, 96vw);
        max-height: min(84vh, 760px);
        min-height: 300px;
        overflow: auto;
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(8, 14, 28, 0.96), rgba(8, 14, 28, 0.9));
        border: 1px solid rgba(115, 169, 255, 0.34);
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.42);
        padding: 12px;
      }
      #${MODAL_ID} .__ts_forum_header__ {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }
      #${MODAL_ID} .__ts_forum_header__ h4 {
        margin: 0;
        font-size: 14px;
        letter-spacing: .02em;
      }
      #${MODAL_ID} .__ts_forum_close__ {
        margin-left: auto;
      }
      #${MODAL_ID} .__ts_forum_split__ {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }
      #${MODAL_ID} .__ts_forum_card__ {
        padding: 8px;
        border-radius: 10px;
      }
      #${MODAL_ID} .__ts_forum_empty__ {
        font-family: Consolas, 'Courier New', monospace;
        font-size: 11px;
        opacity: .86;
        padding: 8px;
      }
      #${MODAL_ID} .__ts_forum_row__ {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6px;
        align-items: center;
      }
      #${MODAL_ID} .__ts_forum_title__ {
        font-weight: 700;
        font-size: 12px;
      }
      #${MODAL_ID} .__ts_forum_text__ {
        font-size: 11px;
        opacity: .92;
      }
      #${MODAL_ID} .__ts_forum_meta__ {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        opacity: .76;
      }
      #${MODAL_ID} .__ts_forum_actions__ {
        display: inline-flex;
        gap: 4px;
      }
      #${MODAL_ID} .__ts_forum_btn_tiny__ {
        min-width: 22px;
        height: 22px;
        border-radius: 6px;
        cursor: pointer;
      }
      #${MODAL_ID} .__ts_forum_form__ {
        display: grid;
        gap: 6px;
      }
      #${MODAL_ID} .__ts_forum_inline__ {
        display: flex;
        gap: 6px;
      }
      #${MODAL_ID} .__ts_forum_inline__ > .cyber-input {
        flex: 1;
      }
      #${MODAL_ID} .__ts_forum_comments__ {
        display: grid;
        gap: 6px;
        max-height: 200px;
        overflow: auto;
      }
      .__ts_pager_btn__ {
        position: absolute;
        right: 15px;
        top: 140px;
        font-family: Consolas, 'Courier New', monospace;
        font-size: 11px;
        padding: 6px 12px;
        cursor: pointer;
        z-index: 9999;
        background: rgba(8, 14, 28, 0.85);
        border: 1px solid #37e9ff;
        border-radius: 8px;
        box-shadow: 0 0 12px rgba(55, 233, 255, 0.3);
        transition: all 0.2s ease-in-out;
        pointer-events: auto !important;
        backdrop-filter: blur(10px);
      }
      .__ts_pager_btn__:hover {
        background: rgba(55, 233, 255, 0.15);
        box-shadow: 0 0 18px rgba(55, 233, 255, 0.6);
        transform: scale(1.05);
      }
      #${MODAL_ID} .text-glow { text-shadow: 0 0 9px currentColor; }
    `;
    (target || document.head || document.documentElement).appendChild(style);
    
    // Wstrzykiwanie linku Cybercore do document.head (globalnie dla modala)
    if (!document.head.querySelector(`link[href*="cybercore"]`) && 
        !document.head.querySelector(`#${CYBERCORE_CSS_ID}`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CYBERCORE_CSS_URL;
      link.id = CYBERCORE_CSS_ID;
      document.head.appendChild(link);
    }
  }
  function generateId() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  }

  async function listThreads() {
    const data = await R.firebaseRead('pager_threads');
    if (!data) return [];
    const rows = Object.values(data).map(item => ({
      id: item.id,
      title: String(item.title || ''),
      content: String(item.content || ''),
      authorUid: String(item.authorUid || ''),
      authorName: String(item.authorName || 'unknown'),
      authorFaction: String(item.authorFaction || 'neon'),
      timestamp: Number(item.timestamp) || 0,
    }));
    return rows.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  }

  async function createThread(title, content) {
    const cleanTitle = normalizeText(title, LIMITS.title);
    const cleanContent = normalizeText(content, LIMITS.thread);
    if (!cleanTitle || !cleanContent) throw new Error('Tytuł i treść są wymagane');
    
    const id = generateId();
    const payload = {
      id, title: cleanTitle, content: cleanContent,
      authorUid: getCurrentUid(), authorName: String(R.currentUser || 'unknown'),
      authorFaction: getFaction(), timestamp: Date.now()
    };
    await R.firebaseWrite(`pager_threads/${id}`, payload);
  }

  async function updateThread(threadId, payload) {
    const current = await R.firebaseRead(`pager_threads/${threadId}`);
    if (!current) throw new Error('Wątek nie istnieje');
    if (!isOwner(current.authorUid)) throw new Error('Brak uprawnień');
    
    const next = { ...current };
    if (payload.title) next.title = normalizeText(payload.title, LIMITS.title);
    if (payload.content) next.content = normalizeText(payload.content, LIMITS.thread);
    next.editedAt = Date.now();
    
    await R.firebaseWrite(`pager_threads/${threadId}`, next);
  }

  async function deleteThread(threadId) {
    const current = await R.firebaseRead(`pager_threads/${threadId}`);
    if (!current) return;
    if (!isOwner(current.authorUid)) throw new Error('Brak uprawnień');
    await R.firebaseWrite(`pager_threads/${threadId}`, null);
  }

  async function listComments(threadId) {
    const data = await R.firebaseRead(`pager_comments/${threadId}`);
    if (!data) return [];
    const rows = Object.values(data).map(item => ({
      id: item.id, content: String(item.content || ''),
      authorUid: String(item.authorUid || ''), authorName: String(item.authorName || 'unknown'),
      authorFaction: String(item.authorFaction || 'neon'), timestamp: Number(item.timestamp) || 0,
    }));
    return rows.sort((a, b) => a.timestamp - b.timestamp).slice(0, 100);
  }

  async function createComment(threadId, content) {
    const cleanContent = normalizeText(content, LIMITS.comment);
    if (!cleanContent) throw new Error('Komentarz wymagany');
    
    const id = generateId();
    const payload = {
      id, content: cleanContent, authorUid: getCurrentUid(),
      authorName: String(R.currentUser || 'unknown'), authorFaction: getFaction(), timestamp: Date.now()
    };
    await R.firebaseWrite(`pager_comments/${threadId}/${id}`, payload);
  }

  async function updateComment(threadId, commentId, content) {
    const current = await R.firebaseRead(`pager_comments/${threadId}/${commentId}`);
    if (!current) throw new Error('Komentarz nie istnieje');
    if (!isOwner(current.authorUid)) throw new Error('Brak uprawnień');
    
    const cleanContent = normalizeText(content, LIMITS.comment);
    if (!cleanContent) throw new Error('Komentarz jest wymagany');
    
    const next = { ...current, content: cleanContent, editedAt: Date.now() };
    await R.firebaseWrite(`pager_comments/${threadId}/${commentId}`, next);
  }

  async function deleteComment(threadId, commentId) {
    const current = await R.firebaseRead(`pager_comments/${threadId}/${commentId}`);
    if (!current) return;
    if (!isOwner(current.authorUid)) throw new Error('Brak uprawnień');
    await R.firebaseWrite(`pager_comments/${threadId}/${commentId}`, null);
  }

  function findTriggerInShadow() {
    // ShadowRoot nie ma getElementById – używamy querySelector
    const root = R.getWidgetRoot ? R.getWidgetRoot() : null;
    if (root && typeof root.querySelector === 'function') {
      const el = root.querySelector('#' + TRIGGER_ID);
      if (el) return el;
    }
    return document.getElementById(TRIGGER_ID);
  }

  function ensureTrigger() {
    const root = R.getWidgetRoot ? R.getWidgetRoot() : document;
    const widgetRoot = root.querySelector('#__tamaskrypt_widget__');

    const existing = findTriggerInShadow();
    if (existing && widgetRoot && widgetRoot.contains(existing)) return existing;

    if (existing) existing.remove();

    const trigger = document.createElement('button');
    trigger.id = TRIGGER_ID;
    trigger.type = 'button';
    trigger.className = 'cyber-button variant-ghost neon-border __ts_pager_btn__';
    trigger.title = 'Holo-Pager';
    trigger.innerHTML = '<span class="text-glow" style="color: #37e9ff; font-weight: bold;">[ PAGER ]</span>';
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (R.forum && typeof R.forum.open === 'function') R.forum.open();
    });

    if (widgetRoot) {
      widgetRoot.style.position = 'relative';
      widgetRoot.appendChild(trigger);
    } else {
      document.body.appendChild(trigger);
    }
    return trigger;
  }

  function syncTriggerPosition() {
    // Trigger jest teraz wewnątrz headera widgetu, nie potrzeba ręcznego pozycjonowania
    ensureTrigger();
  }

  function closeModal() {
    const root = R.getWidgetRoot ? R.getWidgetRoot() : document;
    const modal = root.querySelector('#' + MODAL_ID);
    if (modal) modal.remove();
  }

  function renderAuthorTag(name, faction) {
    const color = getFactionColor(String(faction || '').toLowerCase());
    return `<span class="text-glow" style="color:${color}">${escapeHtml(name)}</span>`;
  }

  async function renderThreadDetails(thread) {
    const comments = await listComments(thread.id);
    const myUid = getCurrentUid();

    if (!comments.length) {
      return '<div class="__ts_forum_empty__">[SYSTEM: Brak komentarzy]</div>';
    }

    return comments.map((comment) => {
      const mine = String(comment.authorUid || '') === myUid && isOwner(comment.authorUid);
      const actions = mine
        ? `<span class="__ts_forum_actions__"><button type="button" class="__ts_forum_btn_tiny__ cyber-button variant-ghost" data-action="edit-comment" data-thread-id="${escapeHtml(thread.id)}" data-comment-id="${escapeHtml(comment.id)}">E</button><button type="button" class="__ts_forum_btn_tiny__ cyber-button variant-ghost" data-action="delete-comment" data-thread-id="${escapeHtml(thread.id)}" data-comment-id="${escapeHtml(comment.id)}">X</button></span>`
        : '';

      return `
        <div class="cyber-card glitch-hover __ts_forum_card__">
          <div class="__ts_forum_row__">
            <div class="__ts_forum_text__">${escapeHtml(comment.content)}</div>
            ${actions}
          </div>
          <div class="__ts_forum_meta__">${renderAuthorTag(comment.authorName, comment.authorFaction)} • ${escapeHtml(formatTime(comment.timestamp))}</div>
        </div>
      `;
    }).join('');
  }

  async function renderModal(activeThreadId) {
    closeModal();

    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'cyber-modal cyber-scanlines';
    modal.innerHTML = `
      <div class="__ts_forum_window__">
        <div class="__ts_forum_header__">
          <h4>📟 Holo-Pager</h4>
          <button type="button" class="cyber-button variant-ghost __ts_forum_close__" data-action="close">Zamknij</button>
        </div>
        <div id="__ts_forum_root__" class="__ts_forum_split__"></div>
      </div>
    `;

    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });

    const root = R.getWidgetRoot ? R.getWidgetRoot() : document.body;
    
    // Usuń stary modal, jeśli istnieje (aby się nie dublowały)
    const existingModal = root.querySelector('#' + MODAL_ID);
    if (existingModal) existingModal.remove();

    // Doczep nowy modal BEZPOŚREDNIO do ShadowRoot
    root.appendChild(modal);

    const root2 = modal.querySelector('#__ts_forum_root__');
    if (!root2) return;

    const threads = await listThreads();
    const activeThread = threads.find((item) => item.id === activeThreadId) || null;
    const myUid = getCurrentUid();

    const listHtml = threads.length
      ? threads.map((thread) => {
        const mine = String(thread.authorUid || '') === myUid && isOwner(thread.authorUid);
        const actions = mine
          ? `<span class="__ts_forum_actions__"><button type="button" class="__ts_forum_btn_tiny__ cyber-button variant-ghost" data-action="edit-thread" data-thread-id="${escapeHtml(thread.id)}">E</button><button type="button" class="__ts_forum_btn_tiny__ cyber-button variant-ghost" data-action="delete-thread" data-thread-id="${escapeHtml(thread.id)}">X</button></span>`
          : '';

        return `
          <div class="cyber-card glitch-hover __ts_forum_card__">
            <div class="__ts_forum_row__">
              <button type="button" class="cyber-button variant-ghost" data-action="open-thread" data-thread-id="${escapeHtml(thread.id)}">${escapeHtml(thread.title)}</button>
              ${actions}
            </div>
            <div class="__ts_forum_text__">${escapeHtml(thread.content)}</div>
            <div class="__ts_forum_meta__">${renderAuthorTag(thread.authorName, thread.authorFaction)} • ${escapeHtml(formatTime(thread.timestamp))}</div>
          </div>
        `;
      }).join('')
      : '<div class="__ts_forum_empty__">[SYSTEM: Eter czysty. Brak transmisji]</div>';

    const detailComments = activeThread ? await renderThreadDetails(activeThread) : '';
    const detailBlock = activeThread
      ? `
        <div class="cyber-card __ts_forum_card__">
          <div class="__ts_forum_title__">${escapeHtml(activeThread.title)}</div>
          <div class="__ts_forum_text__">${escapeHtml(activeThread.content)}</div>
          <div class="__ts_forum_meta__">${renderAuthorTag(activeThread.authorName, activeThread.authorFaction)} • ${escapeHtml(formatTime(activeThread.timestamp))}</div>
          <div class="__ts_forum_comments__">${detailComments}</div>
          <form class="__ts_forum_form__" data-form="comment" data-thread-id="${escapeHtml(activeThread.id)}">
            <div class="__ts_forum_inline__">
              <input class="cyber-input" type="text" name="comment" maxlength="${LIMITS.comment}" placeholder="Komentarz (max ${LIMITS.comment})" required />
              <button type="submit" class="cyber-button variant-ghost">Wyślij</button>
            </div>
          </form>
        </div>
      `
      : '';

    root2.innerHTML = `
      <form class="__ts_forum_form cyber-card __ts_forum_card__" data-form="thread">
        <input class="cyber-input" type="text" name="title" maxlength="${LIMITS.title}" placeholder="Tytuł (max ${LIMITS.title})" required />
        <input class="cyber-input" type="text" name="content" maxlength="${LIMITS.thread}" placeholder="Treść (max ${LIMITS.thread})" required />
        <button type="submit" class="cyber-button variant-ghost">Nadaj transmisję</button>
      </form>
      <div>${listHtml}</div>
      ${detailBlock}
    `;

    root2.querySelectorAll('button[data-action="open-thread"]').forEach((button) => {
      button.addEventListener('click', async () => {
        await renderModal(button.getAttribute('data-thread-id'));
      });
    });

    root2.querySelectorAll('button[data-action="delete-thread"]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          await deleteThread(button.getAttribute('data-thread-id'));
          if (R.showMessage) R.showMessage('🧹 Wątek usunięty', 1800);
          await renderModal(activeThread && activeThread.id === button.getAttribute('data-thread-id') ? '' : activeThreadId);
        } catch (error) {
          if (R.showMessage) R.showMessage(`⚠️ ${error.message}`, 2400);
        }
      });
    });

    root2.querySelectorAll('button[data-action="edit-thread"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const threadId = button.getAttribute('data-thread-id');
        const existing = threads.find((item) => item.id === threadId);
        if (!existing) return;
        const nextTitle = normalizeText(window.prompt('Nowy tytuł (max 10):', existing.title) || '', LIMITS.title);
        const nextContent = normalizeText(window.prompt('Nowa treść (max 32):', existing.content) || '', LIMITS.thread);
        if (!nextTitle || !nextContent) return;

        try {
          await updateThread(threadId, { title: nextTitle, content: nextContent });
          if (R.showMessage) R.showMessage('✏️ Wątek zaktualizowany', 1800);
          await renderModal(threadId);
        } catch (error) {
          if (R.showMessage) R.showMessage(`⚠️ ${error.message}`, 2400);
        }
      });
    });

    root2.querySelectorAll('button[data-action="delete-comment"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const threadId = button.getAttribute('data-thread-id');
        const commentId = button.getAttribute('data-comment-id');
        try {
          await deleteComment(threadId, commentId);
          if (R.showMessage) R.showMessage('🧹 Komentarz usunięty', 1800);
          await renderModal(threadId);
        } catch (error) {
          if (R.showMessage) R.showMessage(`⚠️ ${error.message}`, 2400);
        }
      });
    });

    root2.querySelectorAll('button[data-action="edit-comment"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const threadId = button.getAttribute('data-thread-id');
        const commentId = button.getAttribute('data-comment-id');
        const nextContent = normalizeText(window.prompt('Nowy komentarz (max 13):', '') || '', LIMITS.comment);
        if (!nextContent) return;
        try {
          await updateComment(threadId, commentId, nextContent);
          if (R.showMessage) R.showMessage('✏️ Komentarz zaktualizowany', 1800);
          await renderModal(threadId);
        } catch (error) {
          if (R.showMessage) R.showMessage(`⚠️ ${error.message}`, 2400);
        }
      });
    });

    const threadForm = root2.querySelector('form[data-form="thread"]');
    if (threadForm) {
      threadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const titleInput = threadForm.querySelector('input[name="title"]');
        const contentInput = threadForm.querySelector('input[name="content"]');
        const title = titleInput ? titleInput.value : '';
        const content = contentInput ? contentInput.value : '';

        try {
          await createThread(title, content);
          threadForm.reset();
          if (R.showMessage) R.showMessage('📡 Wątek nadany', 1700);
          await renderModal('');
        } catch (error) {
          if (R.showMessage) R.showMessage(`⚠️ ${error.message}`, 2500);
        }
      });
    }

    const commentForm = root2.querySelector('form[data-form="comment"]');
    if (commentForm) {
      commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const threadId = commentForm.getAttribute('data-thread-id') || '';
        const contentInput = commentForm.querySelector('input[name="comment"]');
        const content = contentInput ? contentInput.value : '';

        try {
          await createComment(threadId, content);
          commentForm.reset();
          if (R.showMessage) R.showMessage('💬 Komentarz wysłany', 1500);
          await renderModal(threadId);
        } catch (error) {
          if (R.showMessage) R.showMessage(`⚠️ ${error.message}`, 2500);
        }
      });
    }

    const closeBtn = modal.querySelector('button[data-action="close"]');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
  }

  function bindRepositionEvents() {
    // Trigger jest w headerze widgetu – nie wymaga ręcznego repozycjonowania
  }

  function init() {
    ensureCybercoreCss();
    ensureForumStyles();
    ensureStateUid();

    // Upewnij się że R.forum.open jest zawsze świeżo ustawiony
    R.forum = R.forum || {};
    R.forum.__initialized__ = true;
    R.forum.init = init;
    R.forum.open = async function openForum() {
      try {
        console.log('[Holo-Pager] Otwieranie terminala...');
        ensureStateUid();
        await renderModal('');
        console.log('[Holo-Pager] Połączenie nawiązane!');
      } catch (error) {
        console.error('[Holo-Pager] Błąd bazy danych:', error);
        if (R.showMessage) R.showMessage(`⚠️ ${error.message || 'Brak sygnału bazy'}`, 3000);
      }
    };
    R.forum.close = closeModal;

    // Trigger dodajemy po ustawieniu R.forum.open
    ensureTrigger();
  }

  function installInitHook() {
    const originalMountWidget = R.mountWidget;
    if (typeof originalMountWidget === 'function' && !R.__ts_forum_mount_hook__) {
      R.__ts_forum_mount_hook__ = true;
      R.mountWidget = function patchedMountWidget() {
        const result = originalMountWidget.apply(this, arguments);
        setTimeout(() => {
          try {
            init();
          } catch (_) {}
        }, 0);
        return result;
      };
    }

    if (!R.__ts_forum_boot_timer__) {
      R.__ts_forum_boot_timer__ = setInterval(() => {
        if (!R.currentUid || !R.widgetEl) return;
        clearInterval(R.__ts_forum_boot_timer__);
        R.__ts_forum_boot_timer__ = null;
        try {
          init();
        } catch (_) {}
      }, 600);
    }

    const originalUpdateUI = R.updateUI;
    if (typeof originalUpdateUI === 'function' && !R.__ts_forum_update_hook__) {
      R.__ts_forum_update_hook__ = true;
      R.updateUI = function patchedUpdateUI() {
        const result = originalUpdateUI.apply(this, arguments);
        setTimeout(() => {
          if (R.forum && typeof R.forum.init === 'function') R.forum.init();
        }, 0);
        return result;
      };
    }
  }

  R.forum = R.forum || {};
  R.forum.init = init;
  installInitHook();
})();
