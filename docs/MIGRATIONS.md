# Firebase Database Migrations & Versioning

Dokument opisuje wersjonowanie schematu bazy i procedury migracji danych w projekcie `Gelek`.

## Wersja schematu

`meta/schemaVersion` — aktualna wersja to **1.0** (2026-04-08).

Każda zmiana struktury bazy powinna podwyższać wersję:
- `1.0` → `1.1` — dodanie nowego pola opcjonalnego
- `1.0` → `2.0` — usunięcie pola, zmiana typu, zmiana struktury (breaking change)

## Procedura migracji

### 1. Zmiana schematu w repo
Edytuj `firebase/database-schema.json`:
```json
{
  "meta": {
    "schemaVersion": 1.1
  }
}
```

### 2. Zapis w dzienniku (`MIGRATIONS.md`)
Dodaj wpis z datą, opisem i instrukcjami:
```markdown
## v1.1 — Dodanie pola `pet.seasonalBonus`
- **Data**: 2026-04-15
- **Opis**: Nowe pole dla bonusów sezonowych
- **Automatyczne**: Brak — domyślna wartość to 0
- **Opis dla gracza**: Nowa sekcja w statystykach
```

### 3. Wdrożenie migracji (Firebase CLI)
```bash
# Jeśli potrzeba ręcznej migracji danych
firebase functions:deploy migrateToSchemaV1_1
```

### 4. Aktualizacja userscriptu
Launcher sprawdza `meta/schemaVersion` i wyświetla komunikat:
- Jeśli lokalna wersja < wersja serwera: pokaż alert i zaproponuj reset danych lub czekaj na aktualizację skryptu
- Jeśli wersja się zgadza: kontynuuj normalnie

## Pola obowiązkowe (non-nullable)

Pola, które zawsze muszą istnieć w rekordzie:

```javascript
const REQUIRED_USER_FIELDS = {
  'profile.username': 'string (2-20 chars)',
  'profile.createdAt': 'number (unix ms)',
  'pet.name': 'string',
  'pet.level': 'number >= 1',
  'pet.hp': 'number >= 0',
  'pet.hunger': 'number >= 0',
  'pet.xp': 'number >= 0',
  'pet.alive': 'boolean',
};

const OPTIONAL_USER_FIELDS = {
  'pet.joy': 'number (default 100)',
  'pet.foodCollected': 'number (default 0)',
  'inventory': 'object (default {})',
  'stats.foodsEaten': 'number (default 0)',
};
```

## Validacja w userscripcie

Podczas logowania:
```javascript
function validateUserState(userData) {
  const errors = [];
  
  // Sprawdź wymagane pola
  if (!userData.profile?.username) errors.push('Missing profile.username');
  if (userData.pet?.level < 1) errors.push('Invalid pet.level');
  if (!Number.isInteger(userData.pet?.hp)) errors.push('pet.hp must be integer');
  
  if (errors.length > 0) {
    console.error('Invalid user state:', errors);
    return false;
  }
  return true;
}
```

## Constraints i business logic

### Pola numeryczne

```javascript
const CONSTRAINTS = {
  hp: { min: 0, max: 100, default: 100 },
  hunger: { min: 0, max: 100, default: 100 },
  joy: { min: 0, max: 100, default: 100 },
  xp: { min: 0, max: Infinity },
  level: { min: 1, max: 999 },
  foodCollected: { min: 0, max: Infinity },
};
```

### Walidacja zapisania do Firebase

Przed `set()` do bazy:
```javascript
async function safeUserUpdate(userId, updates) {
  // Sprawdź constraints
  if (updates.hp !== undefined && (updates.hp < 0 || updates.hp > 100)) {
    throw new Error('hp out of range');
  }
  
  // Sprawdź conflict resolution
  const existing = await ref(`users/${userId}/pet`).once('value');
  if (existing.updatedAt > updates.updatedAt) {
    // Zmiany na serwerze są nowsze — zmerguj je
    console.warn('Server has newer version, merging...');
    return mergeUpdates(existing.val(), updates);
  }
  
  await ref(`users/${userId}/pet`).update(updates);
}
```

## Indeksy Firebase (dla wydajności)

Rekomendowane indeksy do ustawienia w Firebase Console:

```json
{
  "indexes": [
    {
      "collection": "users",
      "fields": [
        { "fieldPath": "profile.createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collection": "ranking",
      "fields": [
        { "fieldPath": "score", "order": "DESCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Backup i disaster recovery

### Ręczny backup
```bash
firebase database:get / --json > backup_$(date +%Y%m%d_%H%M%S).json
```

### Restore z backupu
```bash
firebase database:set / backup_20260408_120000.json
```

## Historia zmian

| Wersja | Data | Opis |
|--------|------|------|
| 1.0 | 2026-04-08 | Inicjalna wersja: users, ranking, chat, itemsCatalog, foodSpawns, sessions, opsLog |

---

**Następna migracja (planowana):** Dodanie `pet.seasonalBonus` oraz `inventory.rarity`
