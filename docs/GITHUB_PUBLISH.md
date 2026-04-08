# Publikacja `Gelek` na GitHub

Aktualny stan lokalny:
- repo: `e:\Gelek`
- branch: `gelek-firebase`
- ostatni commit: (Firebase pliki w trakcie dodawania)
- zdalny push z tego środowiska: **✅ DZIAŁA** (zalogowane na nowe konto qxsxhsyoj7369)

## Publikacja Firebase schema na GitHub

Push Firebase dokumentów w nowej gałęzi:

```powershell
Set-Location "e:\Gelek"
git add firebase/ docs/FIREBASE_DATA_MAP.md docs/GITHUB_PUBLISH.md
git commit -m "feat: add firebase realtime database schema and documentation"
git push -u origin gelek-firebase
```

## Merge do main (opcjonalnie)

Kiedy jesteś zadowolony z schematu Firebase, utwórz PR:
- Gałąź: `gelek-firebase` → `main`
- GitHub UI: "New Pull Request"

## Standard pracy dalej (lokalnie + GitHub)

Po każdej większej zmianie:

```powershell
cd "e:\Gelek"
git add .
git commit -m "feat: [opis zmiany]"
git push origin [current-branch]
```

## Alternatywa: Push bezpośrednio do main

Jeśli wolisz pracować bezpośrednio na main:

```powershell
git checkout main
git pull origin main
git add .
git commit -m "feat: [opis]"
git push origin main
```
