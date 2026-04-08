# TamaSkrypt 🟢

**Wirtualny żelek żyjący w Twojej przeglądarce!**

Skrypt Tampermonkey do przeglądarki Firefox na Androida (działa też na desktopie).
Twój żelek pojawi się na każdej stronie – karm go, dbaj o niego i zdobywaj poziomy!

---

## Funkcje

| Funkcja | Opis |
|---|---|
| 🟢 **Żelek na ekranie** | Widoczny na każdej odwiedzanej stronie jako pływający widget |
| ⏱️ **Czas online** | Zlicza łączny czas spędzony z żelkiem w przeglądarce |
| 🍬 **Pasek głodu** | Opada z upływem czasu; gdy dojdzie do 0, żelek traci HP |
| 🎲 **Losowe jedzenie** | Co jakiś czas na stronie pojawia się jedzenie – kliknij, żeby nakarmić żelka! |
| ❤️ **HP (życie)** | Żelek ma punkty życia, regeneruje je gdy jest najedzony |
| ⭐ **Poziomy i XP** | Karmienie daje XP; po zebraniu 100 XP żelek awansuje na wyższy poziom |
| 💾 **Persystencja** | Stan żelka jest zapamiętany między sesjami i stronami |
| 🖱️ **Przeciąganie** | Widget możesz swobodnie przesuwać po ekranie |

---

## Instalacja

### Wymagania
- Firefox na Androida **lub** Firefox / Chrome na desktopie
- Rozszerzenie **Tampermonkey** ([Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/))

### Kroki

1. Zainstaluj rozszerzenie Tampermonkey w Firefox.
2. Kliknij ikonę Tampermonkey → **Utwórz nowy skrypt**.
3. Usuń cały domyślny kod i wklej zawartość pliku [`TamaSkrypt.user.js`](TamaSkrypt.user.js).
4. Zapisz skrypt (`Ctrl+S` lub przycisk **Zapisz**).
5. Odśwież dowolną stronę – w prawym dolnym rogu powinien pojawić się żelek! 🎉

> **Alternatywnie:** Jeśli przeglądasz ten plik na GitHubie, możesz kliknąć [TamaSkrypt.user.js](TamaSkrypt.user.js), a następnie kliknąć przycisk **Raw** – Tampermonkey automatycznie zaproponuje instalację.

---

## Jak grać?

- **🍬 Karm żelka** – czekaj na losowo pojawiające się jedzenie (emoji na stronie) i klikaj je jak najszybciej!
- **❤️ Dbaj o HP** – gdy żelek jest najedzony (głód > 40), HP powoli się regeneruje.
- **💀 Śmierć** – gdy HP spadnie do 0, żelek umiera. Kliknij go, żeby go wskrzesić (z 30 HP).
- **⭐ Zdobywaj poziomy** – każde jedzenie daje XP. Co 100 XP → nowy poziom i nowy kolor żelka!
- **↕️ Ukryj widget** – kliknij zielone/czerwone kółko (🟢/🔴) w nagłówku.
- **✋ Przesuń widget** – przytrzymaj i przeciągnij nagłówek w dowolne miejsce.

---

## Parametry gry

| Parametr | Wartość |
|---|---|
| Utrata głodu | 1 punkt / minuta |
| Jedzenie – szansa pojawienia | 35% co 30 sekund |
| Jedzenie – czas wyświetlania | 15 sekund |
| Regeneracja HP | +5 HP co 2 minuty (gdy głód > 40) |
| Utrata HP przy głodzie 0 | –3 HP / minutę |
| XP do awansu | 100 XP |

---

## Licencja

[MIT](LICENSE)
