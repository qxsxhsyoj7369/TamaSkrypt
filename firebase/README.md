# Firebase assets (`Gelek`)

Pliki w tym katalogu:
- `database-schema.json` — referencyjny kształt danych Realtime Database.
- `database.rules.json` — reguły bezpieczeństwa dla Realtime Database.

Uwaga: `database-schema.json` to dokumentacja struktury (nie import 1:1 do produkcji).

## Szybkie wdrożenie reguł (Firebase CLI)

1. Zaloguj się:
   - `firebase login`
2. Zainicjalizuj projekt (jeśli potrzeba):
   - `firebase init database`
3. Skopiuj reguły z `database.rules.json` do wygenerowanego pliku reguł.
4. Wdróż:
   - `firebase deploy --only database`

## Endpoint projektu
- `https://gelek-995f2-default-rtdb.europe-west1.firebasedatabase.app/`
