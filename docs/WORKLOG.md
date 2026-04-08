# Dziennik prac

## 2026-04-08 (Ciąg dalszy)

### Zrobione — Infrastruktura Firebase
- ✅ Opracowano pełny schemat bazy `firebase/database-schema.json` z tabelami:
  - `users/{uid}/profile` — login, HP, hunger, XP, level, role
  - `users/{uid}/pet` — emocje, stats, ulepszenia
  - `users/{uid}/inventory` — przedmioty, jedzenie
  - `ranking/daily` i `ranking/allTime` — ranking graczy
  - `chat/global` i `chat/rooms` — czat międzygraczowy
  - `itemsCatalog`, `foodSpawns`, `sessions`, `opsLog`

- ✅ Napisano reguły zabezpieczeń `firebase/database.rules.json`:
  - Izolacja per-użytkownik (`.read` i `.write` tylko dla własnych danych)
  - Publiczny dostęp do rankingów i chatu
  - Admin-only modyfikacja katalogów

- ✅ Stworzono dokumentację mapowania pól `docs/FIREBASE_DATA_MAP.md` (sekcje 1-10):
  - Strategia login/hasło (Firebase Auth + `usernameToUid` lookup)
  - Pola wymagane vs opcjonalne
  - Synchronizacja danych, konflikt resolution (`updatedAt` timestamps)
  - Normalizacja username (lowercase)

- ✅ Opracowano system wersjonowania i migracji `docs/MIGRATIONS.md`:
  - Baseline v1.0
  - Plan v1.1
  - Kod JavaScript do walidacji constraintów (HP/hunger/joy [0-100], XP [0-∞), level [1-999])
  - Procedury backup/restore

- ✅ Rozbudowano launcher `TamaSkrypt.launcher.user.js` do v2.0.0:
  - Dodano stałe Firebase (`FIREBASE_DB_URL`, `KEY_SCHEMA_VER`)
  - Funkcja `checkFirebaseSchemaVersion()` — pobiera `/meta/schemaVersion.json`
  - Funkcja `showSchemaUpdateAlert()` — komunikat o aktualizacji schematu
  - Wsparcie dla automatycznej migracji danych przy zmianach schematu

- ✅ Zaktualizowano `manifest.json`:
  - Wersja: 2.0.0
  - `minLauncherVersion`: 2.0.0
  - Changelog: "Dodano integrację Firebase, system versjonowania schematu, auto-migracja danych, sprawdzanie kompatybilności przy starcie"

- ✅ Wypchnięto wszystkie zmiany na GitHub (`gelek-firebase` branch)

### Ustalenia
- Firebase Realtime Database endpoint: `https://gelek-995f2-default-rtdb.europe-west1.firebasedatabase.app/`
- Launcher będzie automatycznie sprawdzać wersję schematu co 1 godzinę
- System obsługuje backward-compatible migracje — stare skrypty mogą działać z nowym schematem
- Username jest unique key, dlatego stored w `usernameToUid` mapie dla szybkiego lookup

### Następne kroki
- Przygotować testowe dane w Firebase (przykładowy użytkownik z pełnym state'em)
- Rozbudować main skrypt `TamaSkrypt.user.js` z Firebase sync
- Zaimplementować Firebase Auth (login/registration panel w UI)
- Testy integracyjne — launcher + Firebase + main script

---

## 2026-04-08

### Zrobione
- Utworzono repo robocze w `e:\Gelek`.
- Odczytano endpoint Firebase z `firebase.txt`.
- Pobrano repozytorium referencyjne `TamaSkrypt` do `prototype_tmp/`.
- Przeanalizowano `TamaSkrypt.user.js`, `TamaSkrypt.launcher.user.js`, `README.md` i `manifest.json`.
- Spisano roadmapę projektu i analizę prototypu.
- Przygotowano strukturę dokumentacji i miejsce na snapshoty.

### Ustalenia
- Prototyp już dostarcza działający widget, lokalny auth, podstawowe statystyki oraz spawn jedzenia.
- Docelowy projekt `Gelek` powinien zachować userscriptowy charakter, ale wymaga przebudowy pod Firebase i dalszą rozbudowę gameplayu.
- Od teraz pracujemy z checkpointami git, żeby łatwo wracać do stabilnych wersji.

### Następne kroki
- Zaprojektować model danych gracza i żelka pod Firebase.
- Zdecydować o integracji z Firebase Auth lub własnym mechanizmie logowania.
- Wybrać strukturę źródeł i sposób budowania finalnego userscriptu.


