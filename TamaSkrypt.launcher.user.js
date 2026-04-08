// ==UserScript==
// @name         TamaSkrypt – Launcher
// @namespace    https://github.com/qxsxhsyoj7369/TamaSkrypt
// @version      1.0.0
// @description  Automatycznie pobiera i uruchamia najnowszą wersję TamaSkrypt z GitHub. Zainstaluj tylko ten plik – skrypt będzie się sam aktualizował.
// @author       TamaSkrypt
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      raw.githubusercontent.com
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // URL manifestu na GitHub (główna gałąź) – tylko to nigdy nie zmienia
  const MANIFEST_URL = 'https://raw.githubusercontent.com/qxsxhsyoj7369/TamaSkrypt/main/manifest.json';

  // Sprawdzaj aktualizacje co godzinę
  const CHECK_INTERVAL_MS = 60 * 60 * 1000;

  // Klucze pamięci podręcznej (niezależne od konta użytkownika)
  const KEY_CODE    = '__ts_launcher_code__';
  const KEY_VERSION = '__ts_launcher_version__';
  const KEY_CHECKED = '__ts_launcher_checked__';

  // -------------------------------------------------------------------------
  // Uruchom skrypt z pamięci podręcznej (jeśli istnieje)
  // -------------------------------------------------------------------------
  function execCached() {
    const code = GM_getValue(KEY_CODE, '');
    if (!code) return false;
    // eval() wykonuje się w bieżącym scope – GM_setValue/GM_getValue są dostępne
    // eslint-disable-next-line no-eval
    eval(stripHeader(code));
    return true;
  }

  // Usuwa blok ==UserScript== z kodu (nie jest poprawnym JS)
  function stripHeader(code) {
    return code.replace(/\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==/m, '');
  }

  // -------------------------------------------------------------------------
  // Pobierz manifest i (jeśli potrzeba) nową wersję skryptu
  // -------------------------------------------------------------------------
  function fetchAndRun() {
    GM_xmlhttpRequest({
      method: 'GET',
      url: MANIFEST_URL + '?_=' + Date.now(),
      onload: function (resp) {
        let manifest;
        try {
          manifest = JSON.parse(resp.responseText);
        } catch (e) {
          console.warn('[TamaSkrypt Launcher] Błąd parsowania manifestu – używam cache:', e);
          execCached();
          return;
        }

        const cachedVersion = GM_getValue(KEY_VERSION, '');

        if (manifest.version === cachedVersion) {
          // Ta sama wersja – wystarczy cache
          GM_setValue(KEY_CHECKED, Date.now());
          if (!execCached()) {
            // Cache pusty (np. po reinstalacji) – pobierz mimo tej samej wersji
            downloadScript(manifest.scriptUrl, manifest.version);
          }
          return;
        }

        // Nowa wersja dostępna – pobierz skrypt
        downloadScript(manifest.scriptUrl, manifest.version);
      },
      onerror: function () {
        console.warn('[TamaSkrypt Launcher] Brak sieci – uruchamiam z cache');
        execCached();
      }
    });
  }

  function downloadScript(url, version) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url + '?_=' + Date.now(),
      onload: function (resp) {
        const code = resp.responseText;
        GM_setValue(KEY_CODE,    code);
        GM_setValue(KEY_VERSION, version);
        GM_setValue(KEY_CHECKED, Date.now());
        console.info('[TamaSkrypt Launcher] Załadowano wersję', version);
        // eslint-disable-next-line no-eval
        eval(stripHeader(code));
      },
      onerror: function () {
        console.warn('[TamaSkrypt Launcher] Nie można pobrać skryptu – używam cache');
        execCached();
      }
    });
  }

  // -------------------------------------------------------------------------
  // Decyzja: użyj cache lub sprawdź aktualizację
  // -------------------------------------------------------------------------
  const lastCheck  = GM_getValue(KEY_CHECKED, 0);
  const needsCheck = (Date.now() - lastCheck) > CHECK_INTERVAL_MS;

  if (needsCheck) {
    fetchAndRun();
  } else {
    // Cache jest świeży – uruchom od razu, bez czekania na sieć
    if (!execCached()) {
      // Brak cache (pierwsze uruchomienie) – musimy pobrać
      fetchAndRun();
    }
  }

})();
