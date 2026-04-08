// ==UserScript==
// @name         TamaSkrypt – Launcher (Firebase)
// @namespace    https://github.com/qxsxhsyoj7369/TamaSkrypt
// @version      2.0.0
// @description  Pobiera i uruchamia TamaSkrypt z Firebase sync. Obsługuje migracje danych i aktualizacje.
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

  // =========================================================================
  // KONFIGURACJA
  // =========================================================================
  const MANIFEST_URL = 'https://raw.githubusercontent.com/qxsxhsyoj7369/TamaSkrypt/main/manifest.json';
  const FIREBASE_DB_URL = 'https://gelek-995f2-default-rtdb.europe-west1.firebasedatabase.app';
  const CHECK_INTERVAL_MS = 60 * 60 * 1000; // co godzinę
  
  // Klucze pamięci lokalnej
  const KEY_CODE          = '__ts_launcher_code__';
  const KEY_VERSION       = '__ts_launcher_version__';
  const KEY_CHECKED       = '__ts_launcher_checked__';
  const KEY_SCHEMA_VER    = '__ts_schema_version__';
  const KEY_LAST_SYNC     = '__ts_last_sync__';

  // =========================================================================
  // HELPER: Uruchom skrypt z cache'a
  // =========================================================================
  function execCached() {
    const code = GM_getValue(KEY_CODE, '');
    if (!code) return false;
    try {
      // eval() wykonuje się w scope'ie z dostępem do GM_*
      // eslint-disable-next-line no-eval
      eval(stripHeader(code));
    } catch (e) {
      console.error('[TamaSkrypt Launcher] Błąd wykonania skryptu z cache:', e);
      return false;
    }
    return true;
  }

  // =========================================================================
  // HELPER: Usuń header ==UserScript==
  // =========================================================================
  function stripHeader(code) {
    return code.replace(/\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==/m, '');
  }

  // =========================================================================
  // FIREBASE: Sprawdź wersję schematu bazy
  // =========================================================================
  function checkFirebaseSchemaVersion(callback) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: FIREBASE_DB_URL + '/meta/schemaVersion.json',
      timeout: 5000,
      onload: function (resp) {
        if (resp.status !== 200) {
          console.warn('[TamaSkrypt] Nie mogę sprawdzić wersji schematu Firebase');
          callback(null);
          return;
        }
        try {
          const schemaVer = JSON.parse(resp.responseText);
          const localVer = parseFloat(GM_getValue(KEY_SCHEMA_VER, '1.0'));
          
          if (schemaVer > localVer) {
            console.warn('[TamaSkrypt] Schemat bazy został zaktualizowany! Wersja:', schemaVer);
            // Wyświetl alert użytkownikowi
            showSchemaUpdateAlert(schemaVer);
            GM_setValue(KEY_SCHEMA_VER, schemaVer.toString());
          }
          callback(schemaVer);
        } catch (e) {
          console.error('[TamaSkrypt] Błąd parsowania schemaVersion:', e);
          callback(null);
        }
      },
      onerror: function () {
        console.warn('[TamaSkrypt] Brak połączenia z Firebase');
        callback(null);
      }
    });
  }

  // =========================================================================
  // ALERT: Komunikat o aktualizacji schematu
  // =========================================================================
  function showSchemaUpdateAlert(newVersion) {
    // Wyświetl alert tylko raz na sesję
    if (sessionStorage.getItem('__ts_schema_alert_shown__')) return;
    sessionStorage.setItem('__ts_schema_alert_shown__', 'true');
    
    console.warn(`
╔════════════════════════════════════════════════════════════════╗
║          🔄 Schemat bazy TamaSkrypt został zaktualizowany      ║
║                                                                ║
║  Nowa wersja: ${newVersion}                                          ║
║  Twoje dane zostaną automatycznie zmigrowane.                  ║
║  Jeśli napotkasz problemy, odśwież stronę.                    ║
╚════════════════════════════════════════════════════════════════╝
    `);
  }

  // =========================================================================
  // FETCH: Pobierz manifest z GitHub
  // =========================================================================
  function fetchAndRun() {
    GM_xmlhttpRequest({
      method: 'GET',
      url: MANIFEST_URL + '?_=' + Date.now(),
      timeout: 10000,
      onload: function (resp) {
        if (resp.status !== 200) {
          console.warn('[TamaSkrypt Launcher] Błąd pobierania manifestu (status ' + resp.status + ')');
          execCached();
          return;
        }

        let manifest;
        try {
          manifest = JSON.parse(resp.responseText);
        } catch (e) {
          console.warn('[TamaSkrypt Launcher] Błąd parsowania manifestu:', e);
          execCached();
          return;
        }

        const cachedVersion = GM_getValue(KEY_VERSION, '');

        // Jeśli wersja się zgadza, użyj cache'a
        if (manifest.version === cachedVersion) {
          GM_setValue(KEY_CHECKED, Date.now());
          console.log('[TamaSkrypt] Uruchamiam v' + manifest.version + ' z cache');
          
          // Sprawdź schemat Firebase (asynchronicznie)
          checkFirebaseSchemaVersion(function () {
            if (!execCached()) {
              // Cache pusty — pobierz skrypt mimo tej samej wersji
              downloadScript(manifest.scriptUrl, manifest.version);
            }
          });
          return;
        }

        // Nowa wersja dostępna — pobierz
        console.log('[TamaSkrypt] Nowa wersja dostępna:', manifest.version);
        downloadScript(manifest.scriptUrl, manifest.version);
      },
      onerror: function () {
        console.warn('[TamaSkrypt Launcher] Brak sieci — uruchamiam z cache');
        execCached();
      }
    });
  }

  // =========================================================================
  // DOWNLOAD: Pobierz skrypt z GitHub
  // =========================================================================
  function downloadScript(url, version) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url + '?_=' + Date.now(),
      timeout: 15000,
      onload: function (resp) {
        if (resp.status !== 200) {
          console.warn('[TamaSkrypt Launcher] Błąd pobierania skryptu (status ' + resp.status + ')');
          execCached();
          return;
        }

        const code = resp.responseText;
        GM_setValue(KEY_CODE, code);
        GM_setValue(KEY_VERSION, version);
        GM_setValue(KEY_CHECKED, Date.now());
        
        console.info('[TamaSkrypt Launcher] Załadowano wersję', version);

        // Sprawdź schemat Firebase
        checkFirebaseSchemaVersion(function () {
          try {
            // eslint-disable-next-line no-eval
            eval(stripHeader(code));
          } catch (e) {
            console.error('[TamaSkrypt Launcher] Błąd wykonania pobranego skryptu:', e);
            // Spróbuj cache'a na wypadek gdyby nowa wersja była uszkodzona
            execCached();
          }
        });
      },
      onerror: function () {
        console.warn('[TamaSkrypt Launcher] Nie można pobrać skryptu — używam cache');
        execCached();
      }
    });
  }

  // =========================================================================
  // MAIN: Decyzja — cache czy pobierz?
  // =========================================================================
  const lastCheck = GM_getValue(KEY_CHECKED, 0);
  const needsCheck = (Date.now() - lastCheck) > CHECK_INTERVAL_MS;

  if (needsCheck) {
    // Cache nie jest świeży — sprawdź aktualizacje
    console.log('[TamaSkrypt Launcher] Sprawdzam aktualizacje...');
    fetchAndRun();
  } else {
    // Cache jest świeży — uruchom od razu
    console.log('[TamaSkrypt Launcher] Używam cache (ostatnia aktualizacja: ' + new Date(lastCheck).toLocaleString() + ')');
    if (!execCached()) {
      // Brak cache'a na pierwszym uruchomieniu — pobierz
      fetchAndRun();
    }
  }

})();