// ==UserScript==
// @name         TamaSkrypt – Launcher (Firebase)
// @namespace    https://github.com/qxsxhsyoj7369/TamaSkrypt
// @version      3.0.2
// @description  Modułowy launcher TamaSkrypt: pobiera manifest, weryfikuje hash, ładuje moduły i uruchamia grę.
// @author       TamaSkrypt / Gelek
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      raw.githubusercontent.com
// @connect      gelek-995f2-default-rtdb.europe-west1.firebasedatabase.app
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const MANIFEST_URL = 'https://raw.githubusercontent.com/qxsxhsyoj7369/TamaSkrypt/main/manifest.json';
  const FIREBASE_DB_URL = 'https://gelek-995f2-default-rtdb.europe-west1.firebasedatabase.app';
  const CHECK_INTERVAL_MS = 60 * 60 * 1000;

  const KEY_CODE = '__ts_launcher_code__';
  const KEY_VERSION = '__ts_launcher_version__';
  const KEY_CHECKED = '__ts_launcher_checked__';
  const KEY_SCHEMA_VER = '__ts_schema_version__';
  const KEY_MODE = '__ts_launcher_mode__';
  const KEY_MODULE_MANIFEST = '__ts_launcher_modules_manifest__';
  const KEY_MODULE_META = '__ts_launcher_modules_meta__';
  const KEY_MODULE_CODE_PREFIX = '__ts_launcher_mod_code__::';

  function getJson(key, fallback) {
    try {
      const raw = GM_getValue(key, null);
      if (raw === null || raw === undefined || raw === '') return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    GM_setValue(key, JSON.stringify(value));
  }

  function stripHeader(code) {
    return code.replace(/\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==/m, '');
  }

  function runCode(code, label) {
    try {
      // eslint-disable-next-line no-eval
      eval(stripHeader(code));
      return true;
    } catch (error) {
      console.error('[TamaSkrypt Launcher] Błąd wykonania:', label, error);
      return false;
    }
  }

  function requestText(url, timeout = 15000) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(),
        timeout,
        onload: function (resp) {
          if (resp.status < 200 || resp.status >= 300) {
            reject(new Error(`HTTP ${resp.status} for ${url}`));
            return;
          }
          resolve(resp.responseText);
        },
        onerror: function () { reject(new Error(`Network error for ${url}`)); },
        ontimeout: function () { reject(new Error(`Timeout for ${url}`)); },
      });
    });
  }

  async function sha256Hex(text) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function normalizeHashInput(text) {
    return String(text || '')
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  async function verifyHash(text, expectedHash) {
    if (!expectedHash) return true;
    const normalized = String(expectedHash).toLowerCase().replace(/^sha256:/, '');
    const got = await sha256Hex(normalizeHashInput(text));
    return got === normalized;
  }

  function showSchemaUpdateAlert(newVersion) {
    if (sessionStorage.getItem('__ts_schema_alert_shown__')) return;
    sessionStorage.setItem('__ts_schema_alert_shown__', 'true');
    console.warn(`[TamaSkrypt] Schemat bazy Firebase został zaktualizowany do v${newVersion}`);
  }

  async function checkFirebaseSchemaVersion() {
    try {
      const body = await requestText(FIREBASE_DB_URL + '/meta/schemaVersion.json', 5000);
      const schemaVer = JSON.parse(body);
      const localVer = parseFloat(GM_getValue(KEY_SCHEMA_VER, '1.0'));
      if (schemaVer > localVer) {
        showSchemaUpdateAlert(schemaVer);
        GM_setValue(KEY_SCHEMA_VER, String(schemaVer));
      }
      return schemaVer;
    } catch {
      return null;
    }
  }

  function createProgressUI(total) {
    const id = '__ts_loader_progress__';
    const old = document.getElementById(id);
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;font-family:Segoe UI,Arial,sans-serif;background:#111a;border:1px solid #ffffff33;border-radius:10px;padding:8px 10px;color:#fff;backdrop-filter:blur(3px);';
    el.innerHTML = [
      '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">',
      '<span id="__ts_loader_label__">Ładowanie modułów...</span>',
      `<span id="__ts_loader_count__">0/${total}</span>`,
      '</div>',
      '<div style="height:8px;background:#ffffff22;border-radius:999px;overflow:hidden;">',
      '<div id="__ts_loader_fill__" style="height:100%;width:0%;background:linear-gradient(90deg,#7c5cff,#36d1dc);transition:width .2s ease;"></div>',
      '</div>'
    ].join('');
    (document.body || document.documentElement).appendChild(el);
    return {
      update: function (done, label) {
        const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 100;
        const fill = document.getElementById('__ts_loader_fill__');
        const count = document.getElementById('__ts_loader_count__');
        const text = document.getElementById('__ts_loader_label__');
        if (fill) fill.style.width = pct + '%';
        if (count) count.textContent = `${done}/${total}`;
        if (text && label) text.textContent = label;
        window.dispatchEvent(new CustomEvent('__ts_loader_progress_event__', {
          detail: { done, total, label: label || '' }
        }));
      },
      done: function (label = 'Załadowano') {
        this.update(total, label);
        window.dispatchEvent(new CustomEvent('__ts_loader_done_event__'));
        setTimeout(() => {
          const node = document.getElementById(id);
          if (node) node.remove();
        }, 800);
      },
      fail: function (label = 'Błąd ładowania') {
        this.update(0, label);
        window.dispatchEvent(new CustomEvent('__ts_loader_fail_event__', {
          detail: { total, label }
        }));
        const fill = document.getElementById('__ts_loader_fill__');
        if (fill) fill.style.background = 'linear-gradient(90deg,#ff4d4f,#ff7a45)';
        setTimeout(() => {
          const node = document.getElementById(id);
          if (node) node.remove();
        }, 2500);
      }
    };
  }

  function normalizeModuleManifest(manifest) {
    const list = Array.isArray(manifest?.modules) ? manifest.modules : [];
    return list.map((entry, idx) => ({
      name: entry.name || `module_${idx}`,
      url: entry.url,
      version: entry.version || manifest.version || '0',
      hash: entry.hash || '',
      execute: entry.execute || 'raw',
      required: entry.required !== false,
    })).filter(m => typeof m.url === 'string' && m.url.length > 0);
  }

  async function executeModules(manifest, options = {}) {
    const moduleList = normalizeModuleManifest(manifest);
    if (!moduleList.length) return false;

    const allowNetwork = options.allowNetwork !== false;
    const progress = createProgressUI(moduleList.length);
    const moduleMeta = getJson(KEY_MODULE_META, {});
    const resolvedCode = {};
    let completed = 0;

    try {
      for (const mod of moduleList) {
        const cacheKey = KEY_MODULE_CODE_PREFIX + mod.name;
        const cachedInfo = moduleMeta[mod.name] || {};
        const cachedCode = GM_getValue(cacheKey, '');
        const cacheMatches = cachedCode
          && cachedInfo.url === mod.url
          && String(cachedInfo.version) === String(mod.version)
          && String(cachedInfo.hash || '') === String(mod.hash || '');

        if (cacheMatches) {
          resolvedCode[mod.name] = cachedCode;
          completed += 1;
          progress.update(completed, `Cache: ${mod.name}`);
          continue;
        }

        if (!allowNetwork) throw new Error(`Brak cache dla modułu ${mod.name}`);

        const code = await requestText(mod.url, 15000);
        const validHash = await verifyHash(code, mod.hash);
        if (!validHash) throw new Error(`Hash mismatch: ${mod.name}`);

        resolvedCode[mod.name] = code;
        moduleMeta[mod.name] = {
          url: mod.url,
          version: mod.version,
          hash: mod.hash || '',
          updatedAt: Date.now(),
        };
        GM_setValue(cacheKey, code);
        completed += 1;
        progress.update(completed, `Pobrano: ${mod.name}`);
      }

      window.GelekModules = window.GelekModules || {};
      for (const mod of moduleList) {
        const code = resolvedCode[mod.name];
        if (!runCode(code, mod.name) && mod.required) {
          throw new Error(`Nie udało się uruchomić modułu ${mod.name}`);
        }
      }

      if (manifest.entryModule) {
        const entryFn = window.GelekModules && window.GelekModules[manifest.entryModule];
        if (typeof entryFn !== 'function') {
          throw new Error(`Brak entryModule: ${manifest.entryModule}`);
        }
        await Promise.resolve(entryFn({ manifest }));
      }

      setJson(KEY_MODULE_MANIFEST, {
        version: manifest.version,
        entryModule: manifest.entryModule || '',
        modules: moduleList,
      });
      setJson(KEY_MODULE_META, moduleMeta);
      GM_setValue(KEY_MODE, 'modules');
      GM_setValue(KEY_VERSION, String(manifest.version || ''));
      GM_setValue(KEY_CHECKED, Date.now());
      progress.done('Moduły gotowe');
      return true;
    } catch (error) {
      console.error('[TamaSkrypt Launcher] Błąd modułów:', error);
      progress.fail('Błąd ładowania modułów');
      return false;
    }
  }

  async function executeCachedModules() {
    const cachedManifest = getJson(KEY_MODULE_MANIFEST, null);
    if (!cachedManifest || !Array.isArray(cachedManifest.modules)) return false;
    return executeModules(cachedManifest, { allowNetwork: false });
  }

  async function executeLegacyScript(manifest, allowNetwork) {
    const cachedCode = GM_getValue(KEY_CODE, '');
    const cachedVersion = GM_getValue(KEY_VERSION, '');

    if (!allowNetwork || (manifest.version === cachedVersion && cachedCode)) {
      return runCode(cachedCode, 'legacy-cache');
    }

    if (!manifest.scriptUrl) return false;
    try {
      const code = await requestText(manifest.scriptUrl, 15000);
      GM_setValue(KEY_CODE, code);
      GM_setValue(KEY_VERSION, String(manifest.version || ''));
      GM_setValue(KEY_CHECKED, Date.now());
      GM_setValue(KEY_MODE, 'legacy');
      return runCode(code, 'legacy-download');
    } catch (error) {
      console.warn('[TamaSkrypt Launcher] Legacy download failed:', error.message);
      return cachedCode ? runCode(cachedCode, 'legacy-cache-fallback') : false;
    }
  }

  async function runFromCacheByMode() {
    const mode = GM_getValue(KEY_MODE, 'legacy');
    if (mode === 'modules') {
      const ok = await executeCachedModules();
      if (ok) return true;
    }
    const code = GM_getValue(KEY_CODE, '');
    return code ? runCode(code, 'legacy-cache') : false;
  }

  async function fetchManifest() {
    const body = await requestText(MANIFEST_URL, 10000);
    return JSON.parse(body);
  }

  async function run() {
    await checkFirebaseSchemaVersion();

    const mode = GM_getValue(KEY_MODE, 'legacy');
    const lastCheck = GM_getValue(KEY_CHECKED, 0);
    const needsCheck = mode !== 'modules' || (Date.now() - lastCheck) > CHECK_INTERVAL_MS;

    console.log('[TamaSkrypt Launcher] mode=', mode, 'needsCheck=', needsCheck);

    if (!needsCheck) {
      const ok = await runFromCacheByMode();
      if (ok) return;
    }

    try {
      const manifest = await fetchManifest();
      const hasModules = Array.isArray(manifest.modules) && manifest.modules.length > 0;

      let ok = false;
      if (hasModules) {
        ok = await executeModules(manifest, { allowNetwork: true });
      }

      if (!ok) {
        ok = await executeLegacyScript(manifest, true);
      }

      if (!ok) {
        await runFromCacheByMode();
      }
    } catch (error) {
      console.warn('[TamaSkrypt Launcher] Manifest unavailable, fallback to cache:', error.message);
      await runFromCacheByMode();
    }
  }

  run();

})();