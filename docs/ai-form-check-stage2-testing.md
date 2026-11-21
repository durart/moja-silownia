# AI Form Check — Etap 2: izolowany PoC (przysiad)

Stan: wyłącznie `feature/ai-form-check`. Nie integrowano z `index.html`, `state`, `localStorage`, `manifest.webmanifest` ani katalogiem `preview/`. To **nie** jest publikacja produkcyjna.

## Co zostało zaimplementowane

- `formcheck/demo.html`: osobna strona do uruchamiania kamery lub syntetycznej symulacji.
- `formcheck/formcheck-engine.js`: czysty JS — kąty kolana z landmarków 2D, EMA, TOP/DOWN/BOTTOM/UP/TOP, histereza, minimalny czas powtórzenia, licznik, ocena głębokości i stabilności pięty, pauza przy utracie punktów, wynik serii.
- `formcheck/formcheck-library.js`: dopasowanie po nazwie, tylko „Przysiad ze sztangą” i „Przysiad goblet z hantlem”. Przysiad bułgarski celowo wyłączony.
- `formcheck/formcheck-pose.js`: `@mediapipe/tasks-vision@1.2.3`, Pose Landmarker Lite, model pobierany na żądanie, cache Cache API bez service workera, GPU→CPU, kamera `getUserMedia`, streaming fixture landmarków, zwalnianie wszystkich tracków.
- `formcheck/formcheck-ui.js`, `formcheck.css`: podgląd kamery z nakładką 2D, licznik, kąt kolana, feedback, stan ładowania, STOP/podsumowanie, układ telefon/pion/poziom.
- `tests/formcheck-engine.test.mjs` + pięć fixture JSON: poprawne/przypadki błędne/szum/utrata punktów.

**Nie ma:** zapisu filmów ani zdjęć, zapisu wyników, głosu, integracji z atlasem, historii i planami, edycji konfiguracji, pełnej kalibracji odległości/światła, produkcyjnego SW. Są to kolejne etapy wymagające zgody.

## Test na Windows — najkrótsza ścieżka

Wymagane: Git, Python 3 (komenda `py`) oraz `cloudflared`. W PowerShell:

```powershell
git clone --branch feature/ai-form-check https://github.com/durart/moja-silownia.git
cd moja-silownia
py -m http.server 8080 --bind 127.0.0.1
```

Sprawdź na **tym komputerze** `http://localhost:8080/formcheck/demo.html` — symulacja nie wymaga kamery ani modelu.

W drugim PowerShell zainstalowany `cloudflared`:

```powershell
cloudflared tunnel --url http://localhost:8080
```

Otrzymasz tymczasowy adres `https://<losowe>.trycloudflare.com`. Na telefonie otwórz **ten adres** z końcówką `/formcheck/demo.html`. Tunnel jest wymagany, bo zwykłe `http://192.168.x.x` z telefonu nie udostępnia kamery w bezpiecznym kontekście. Lokalny `localhost` jest wyjątkiem dla uruchomienia na samym komputerze.

**Uwaga:** Quick Tunnel udostępnia serwer publicznie osobom znającym adres. Nie wgrywaj prywatnych kopii JSON do katalogu repozytorium uruchomionego na serwerze. Po zakończeniu zamknij oba terminale (Ctrl+C). Komputer musi działać w trakcie testowania.

Możesz też użyć własnego, poprawnie zaufanego lokalnego certyfikatu HTTPS, ale samopodpisany certyfikat niezaakceptowany przez telefon może blokować `getUserMedia`.

## Instrukcja testu kamery

1. Otwórz `/formcheck/demo.html` przez HTTPS i wybierz „Otwórz analizę przysiadu”.
2. Sprawdź przycisk „Uruchom symulację 5 przysiadów”. Po zakończeniu powinny pojawić się **5 powtórzeń**, **5 bez uwag** i **100%**. Symulacja nie używa kamery.
3. Wróć, wybierz „Włącz kamerę i rozpocznij”, potwierdź dostęp. Podczas pierwszego uruchomienia powinien być widoczny postęp pobierania modelu albo informacja o ładowaniu, jeśli serwer nie podaje `Content-Length`.
4. Ustaw telefon na statywie bokiem ok. 3 m od ćwiczącego, na wysokości bioder, tak aby stopy/pięty i głowa były widoczne. Wykonaj 5–10 **powolnych przysiadów bez obciążenia**, na stabilnym podłożu.
5. Sprawdź nakładkę szkieletu, licznik, kąt kolana i feedback. Dotknij „STOP — podsumowanie”.
6. Sprawdź liczbę powtórzeń, punkty kontrolne i komunikat o ograniczeniach. Zamknij; **dioda kamery powinna zgasnąć**.
7. Otwórz ponownie: model powinien pojawić się w cache, ale nie ma gwarancji trwałości Cache API (przeglądarka może usunąć cache).
8. Testy negatywne: odmów uprawnień, zasłoń sylwetkę na ponad 3 s, przetestuj obrót ekranu, kilka kolejnych uruchomień i zamknięcie w trakcie ładowania.
9. `?fcdebug=1` w URL wyświetla fazę licznika, FPS i używany delegat.

## Testy automatyczne

```bash
node --check formcheck/formcheck-engine.js
node --check formcheck/formcheck-library.js
node --check formcheck/formcheck-pose.js
node --check formcheck/formcheck-ui.js
node --test tests/*.test.mjs
```

GitHub Actions: `.github/workflows/plan-extras-tests.yml`, dla push na `feature/ai-form-check`. Testy nie wymagają kamery, sieci ani prywatnych danych.

## Ograniczenia i warunki dalszego rozwoju

- Progi głębokości i pięty są eksperymentalne; testy na sztucznych punktach **nie dowodzą** poprawności na iPhone / Android.
- Z pojedynczej kamery w widoku bocznym nie da się w pełni ocenić techniki ani obciążenia stawów; potrzebne jest rozpoznanie kadrów niepewnych.
- Tempo i ocena jakości zależą od stabilności położenia telefonu i widoczności landmarków; są to metryki poglądowe.
- Pętla MediaPipe jest synchroniczna na głównym wątku, co może blokować UI na wolniejszych urządzeniach. FPS należy zmierzyć na realnym telefonie.
- Pierwsze pobranie SDK/WASM/modelu wymaga internetu. MediaPipe pochodzi z zewnętrznego CDN.
- Przy zamknięciu lub przejściu w tło kamera i model są zwalniane; sprawdzić zachowanie w rzeczywistej Safari PWA dopiero po oddzielnej instalacji prototypu.
- **Brak publicznego URL uruchomionego pod GitHub Pages**: gałąź nie jest publikowana, `main` i `preview/` są zamrożone. Test przez tymczasowy osobny HTTPS.
- Nie wdrażać na produkcję ani nie przechodzić do Etapu 3 bez osobnej akceptacji.
