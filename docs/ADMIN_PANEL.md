# Admin Panel (HTML5)

Plik: `docs/admin-panel.html`

## Co umożliwia
- Wczytanie użytkownika po `UID` lub `username` (`usernameToUid/*`)
- Edycję pól:
  - `profile.username` (nick)
  - `pet.level`, `pet.xp`, `pet.hp`, `pet.hunger`, `pet.alive`, `pet.foodCollected`
  - `stats.totalOnlineMs`
  - `progress.coins`
  - `progress.dailyQuest` (JSON)
- Edycję ustawień gameplay per-user:
  - `progress.settings.gameplay.HUNGER_FOOD_SPAWN_CHANCE`
  - `progress.settings.gameplay.FOOD_SPAWN_INTERVAL`
  - `progress.settings.gameplay.FOOD_DURATION`
  - `progress.settings.gameplay.HUNGER_DRAIN_RATE`
  - `progress.settings.gameplay.HUNGER_DRAIN_INTERVAL`
  - `progress.settings.gameplay.XP_PER_LEVEL`

## Jak uruchomić
Najprościej otworzyć plik bezpośrednio w przeglądarce:
- `docs/admin-panel.html`

Możesz też uruchomić przez prosty serwer statyczny (opcjonalnie).

## Ważne uwagi
- Panel zapisuje dane przez Firebase REST API (`PATCH`/`PUT`) pod `users/{uid}`.
- Pole `auth token` jest opcjonalne — użyj, jeśli reguły bazy tego wymagają.
- Zmiana `profile.username` nie aktualizuje automatycznie hasha loginu.
- Opcja „Synchronizuj usernameToUid” jest zaawansowana; używaj świadomie.

## Integracja z runtime
W projekcie runtime respektuje teraz `progress.settings.gameplay` przy ładowaniu użytkownika.
Dzięki temu zmiana spawn rate i innych parametrów z panelu ma realny wpływ na grę tego użytkownika.
