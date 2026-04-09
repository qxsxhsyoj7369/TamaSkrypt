# AI_INSTRUCTIONS.md

## 1. Architektura i Stan Gry (Obiekt R)

- Cały stan gry, funkcje i zmienne są trzymane w globalnym obiekcie `window.GelekRuntime` (często aliasowanym jako `R`).
- Złota zasada modularności: nigdy nie edytuj głównych plików (np. `40-ui.js`, `80-game-loop.js`), jeśli pracujesz nad izolowanym modułem (np. `82-mini-forum.js`).
- Moduły komunikują się ze sobą przez obiekt `R`.

## 2. Baza Danych (BARDZO WAŻNE)

- Gra **NIE UŻYWA** oficjalnego SDK Firebase Firestore.
- Niedozwolone jest generowanie kodu typu `db.collection().get()` lub innych wywołań SDK Firebase.
- Gra używa autorskiego wrappera REST API do Realtime Database.
- Odczyt wykonujemy wyłącznie przez:

```js
await R.firebaseRead('sciezka/do/wezla')
```

- Zapis lub nadpisanie wykonujemy wyłącznie przez:

```js
await R.firebaseWrite('sciezka/do/wezla', payload)
```

- Wartość `null` przekazana do `R.firebaseWrite(...)` usuwa wskazany węzeł.
- Nigdy nie generuj kodu Firebase SDK dla tego projektu.

## 3. UI, DOM i Shadow DOM

- Główny widżet Gelka żyje w zamkniętym Shadow DOM, dostępnym przez `R.getWidgetRoot()`.
- Izolowane, pełnoekranowe lub pływające moduły (jak Holo-Pager) muszą żyć w Light DOM (`document.documentElement` lub `document.body`), aby nie były przycinane (`clipped`) i nie znikały podczas re-renderu `R.updateUI()`.
- Elementy osadzone wewnątrz głównego widgetu mogą korzystać z Shadow DOM, ale niezależne okna/modale powinny być renderowane poza nim.
- Dual-Injection CSS:
  - style dla elementów w Light DOM muszą być wstrzykiwane do `document.head`,
  - style dla elementów w Shadow DOM muszą być wstrzykiwane do `R.getWidgetRoot()`.

## 4. Stylistyka i Design (Cyberpunk 2026 Glassmorphism)

- Nigdy nie używaj jasnych motywów ani domyślnych stylów HTML.
- Baza glassmorphismu:
  - ciemne tła: `rgba(12, 15, 26, 0.75)`,
  - mocny blur: `backdrop-filter: blur(28px) saturate(150%)`,
  - subtelne jasne ramki: `rgba(255, 255, 255, 0.08)`.
- Akcenty:
  - neonowe gradienty, np. `#a651ff` → `#ff3fbf`,
  - alternatywnie akcent cyjanowy: `#37e9ff`.
- Czcionki:
  - preferowane są czyste, systemowe `sans-serif`,
  - unikamy `monospace`, chyba że pokazujemy dane techniczne, metadane lub debug info.

## 5. Proces Deployu (Manifest i Hashe)

- Gra jest dystrybuowana jako Userscript z systemem modułów.
- Zanim wypchniesz kod na GitHuba (`git push`), **ZAWSZE MUSISZ**:

### A. Zaktualizować wersję modułu

- Zwiększ wersję modułu w pliku, nad którym pracujesz, jeśli dany moduł utrzymuje własną wersję lub widoczne oznaczenie release'u.

### B. Wyliczyć nowy hash SHA-256

- Dla każdego zmienionego pliku `.js` wylicz nowy hash SHA-256.
- Używaj do tego `certutil -hashfile` albo `Get-FileHash` w PowerShell.

Przykład PowerShell:

```powershell
Get-FileHash 'e:\Gelek\src\modules\82-mini-forum.js' -Algorithm SHA256
```

### C. Zaktualizować `manifest.json`

- Zaktualizuj odpowiedni numer wersji modułu w `manifest.json`.
- Zaktualizuj hash SHA-256 tego modułu w `manifest.json`.
- Jeśli zmiana obejmuje release globalny, zaktualizuj również wersję i changelog manifestu zgodnie z przyjętą konwencją projektu.

### D. Dopiero wtedy wykonać commit i push

- Kolejność obowiązkowa:
  1. zmiana kodu,
  2. nowy hash,
  3. update `manifest.json`,
  4. `git commit`,
  5. `git push`.

## Obowiązek roboczy AI

- Przed zaproponowaniem lub wykonaniem większej zmiany architektonicznej należy najpierw przeczytać ten plik.
- Jeśli pojawia się konflikt między szybką poprawką a tymi zasadami, pierwszeństwo mają zasady zapisane w `AI_INSTRUCTIONS.md`.
