# Firebase Data Map (`Gelek`)

Ten plik opisuje mapowanie danych aplikacji do Firebase Realtime Database.

## 1) Logowanie i rejestracja

## Rekomendacja bezpieczeństwa
- **Nie zapisujemy hasła w Realtime Database**.
- Rejestracja/logowanie powinny iść przez **Firebase Authentication**.
- W bazie trzymamy tylko dane profilu i gameplayu.

## Co odpowiada za login/hasło
- `Firebase Auth / users`:
  - `email` lub login-mapowany do maila technicznego
  - `password` (obsługiwane przez Firebase, niedostępne jako plaintext)
- `Realtime Database /usernameToUid/{usernameLower}`:
  - mapowanie nazwy użytkownika na `uid`

Przykład:
- `usernameToUid/zelek = "uid_abc123"`

## 2) Wymagane pola gameplayu

Podstawowa ścieżka użytkownika:
- `users/{uid}/pet/hp` → życie żelka
- `users/{uid}/pet/hunger` → głód żelka
- `users/{uid}/pet/xp` → XP żelka
- `users/{uid}/pet/foodCollected` → liczba zebranych jedzeń

Dodatkowe pola bazowe:
- `users/{uid}/pet/level`
- `users/{uid}/pet/joy`
- `users/{uid}/pet/alive`
- `users/{uid}/pet/lastFedAt`
- `users/{uid}/pet/updatedAt`

## 3) Struktura główna (skrót)

- `meta` — wersja schematu i metadane projektu
- `users/{uid}` — profil + żelek + statystyki + inventory + ustawienia
- `usernameToUid/{username}` — lookup użytkownika po loginie
- `ranking/{daily|allTime}/{uid}` — publiczne leaderboardy
- `chat/global/{messageId}` — globalny czat
- `chat/rooms/{roomId}` — pokoje czatu
- `itemsCatalog/{itemId}` — katalog przedmiotów
- `foodSpawns/{spawnId}` — definicje/spawn table jedzenia
- `sessions/{uid}/{deviceId}` — sesje urządzeń
- `opsLog/{uid}/{eventId}` — log zdarzeń gameplayowych

## 4) Przyszłe tabele / sekcje

## Czat
- `chat/global/{messageId}`
- W polu: `uid`, `username`, `text`, `createdAt`, `editedAt`, `deleted`

## Ranking
- `ranking/daily/{uid}`
- `ranking/allTime/{uid}`
- W polu: `level`, `xp`, `foodsEaten`, `score`, `updatedAt`

## Przedmioty
- `itemsCatalog/{itemId}` — definicja itemów globalnych
- `users/{uid}/inventory/{itemId}` — stan posiadania u gracza

## 5) Reguły bezpieczeństwa

Plik: `firebase/database.rules.json`
- domyślnie brak globalnego read/write,
- użytkownik czyta i zapisuje tylko własne `users/{uid}`,
- ranking i czat do odczytu publicznego,
- modyfikacje katalogu itemów i spawnów tylko admin.

## 6) Konwencje techniczne

- Timestamps zapisujemy jako `unix ms` (np. `Date.now()`).
- Login normalizujemy do lowercase w `usernameToUid`.
- Operacje gameplayowe warto logować do `opsLog`, żeby łatwiej debugować i odtwarzać błędy.
- Przy zmianie kształtu danych podbijamy `meta/schemaVersion`.

## 7) Minimalny rekord startowy użytkownika

```json
{
  "profile": {
    "username": "Zelek",
    "createdAt": 1710000000000,
    "lastLoginAt": 1710000000000,
    "avatar": "pink",
    "roles": {
      "isAdmin": false,
      "isModerator": false
    }
  },
  "pet": {
    "name": "Gelek",
    "level": 1,
    "xp": 0,
    "hp": 100,
    "hpMax": 100,
    "hunger": 100,
    "hungerMax": 100,
    "joy": 100,
    "joyMax": 100,
    "foodCollected": 0,
    "alive": true,
    "mood": "happy",
    "lastFedAt": 1710000000000,
    "lastTickAt": 1710000000000,
    "updatedAt": 1710000000000
  },
  "stats": {
    "totalOnlineMs": 0,
    "foodsEaten": 0,
    "deaths": 0,
    "revives": 0,
    "bestLevel": 1,
    "updatedAt": 1710000000000
  }
}
```
