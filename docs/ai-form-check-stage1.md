# AI Form Check — Etap 1: plan techniczny (bez implementacji)

Status: DO AKCEPTACJI. Repozytorium `durart/moja-silownia`; gałąź `feature/ai-form-check`; baza: `main@ac6422a7e0dc1188b7764fa715c0eb031ccebf67`. Data: 2026-11-21.

## 1. Granice etapu i bezpieczeństwo

- Ten dokument jest jedynym artefaktem Etapu 1. Bez zmian w `index.html`, CSS produkcyjnym, `preview/`, magazynie `moja-silownia-v01` lub w przepływie treningowym.
- Następny Etap 2 ma być **samodzielnym PoC**, bez podpinania do aplikacji głównej i bez zapisu w `localStorage`; przeznaczony do testu na osobnym originie HTTPS. Nie publikować na `main` ani pod `/preview/`.
- Etap 3 (po osobnej zgodzie) integruje UI i dane; Etap 4 (po następnej zgodzie) domyka kalibrację, głos, wersjonowanie i PR. Bez automatycznego merge.
- Gałąź audytowa `audit/pose-estimation-readonly-2026-11-21` pozostaje nietknięta.

## 2. Decyzja o silniku i pakietach

**Wybrany:** MediaPipe Tasks Vision, `@mediapipe/tasks-vision@1.2.3` (stabilny tag npm w dniu 2026-11-21), Pose Landmarker Lite float16, VIDEO, `numPoses:1`, `outputSegmentationMasks:false`. Dostępne 33 punkty szkieletu, w tym kolano, biodro, kostka i pięta. Full jako opcja w późniejszym etapie. Nie wprowadzamy TensorFlow.js ani bundlera.

**Powody:** uruchamianie lokalnie na urządzeniu, gotowe landmarki ciała oraz dokumentowane API `PoseLandmarker.createFromOptions`, `detectForVideo` i `modelAssetBuffer`. Modele i SDK są pobierane wyłącznie na żądanie. SDK pracuje na obrazie lokalnym; jednak publiczna deklaracja pakietu mówi też o potencjalnych metrykach użycia przesyłanych do Google — przed ukończeniem projektu wymagana osobna kontrola prywatności i ruchu sieciowego. Nie deklarować "zero ruchu sieciowego".

**Pojedynczy rejestr źródeł** w `formcheck/formcheck-pose.js`:
- ESM: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs`
- WASM: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm`
- Lite: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`
- Full (nieużywany w PoC): `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task`
- Cache API: `moja-silownia-formcheck-model-v1`; klucz zależny od pełnego adresu i wersji modelu.

**Ładowanie:** dynamiczne `import()` z klasycznego skryptu IIFE — ESM tylko dla zewnętrznego SDK, bez przerabiania aplikacji na moduły; `FilesetResolver.forVisionTasks(wasmUrl)`; `PoseLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetBuffer:new Uint8Array(buffer),delegate:'GPU'},runningMode:'VIDEO',numPoses:1})`. Przy niepowodzeniu GPU inicjalizacja na CPU. Najpierw `caches.open` / `cache.match`; jeśli miss, `fetch` + opcjonalny streaming postępu + `cache.put` po prawidłowej odpowiedzi. Jeśli brak `Content-Length`, pasek pokazuje stan nieokreślony. Brak CacheStorage albo odrzucenie zapisu nie blokują działania. Jednorazowe wczytanie modelu do Uint8Array; plik .task nie jest dodawany do repozytorium ani localStorage.

**Uwaga bezpieczeństwa:** `getUserMedia` wymaga bezpiecznego kontekstu i zgody użytkownika; `http://localhost` jest do testów lokalnych traktowane jako zaufane, ale telefon otwierający adres LAN `http://192.168.x.x` — nie. Na iOS `video` ma `playsinline muted autoplay`. `CacheStorage` działa również z okna bez service workera; kopia może zostać usunięta przez przeglądarkę / limity miejsca.

Źródła:
- https://www.npmjs.com/package/@mediapipe/tasks-vision?activeTab=versions
- https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker
- https://developers.google.com/edge/api/mediapipe/js/tasks-vision.poselandmarker
- https://developers.google.com/edge/mediapipe/solutions/setup_web
- https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari

## 3. Lista plików i zakres własności

| Plik | Etap | Odpowiedzialność |
|---|---:|---|
| `docs/ai-form-check-stage1.md` | 1 | Wyłącznie niniejszy plan |
| `formcheck/demo.html` | 2 | Samodzielny ekran PoC, brak zależności od produkcyjnego `index.html` |
| `formcheck/formcheck-engine.js` | 2 | Czyste funkcje kąta, jakości, wygładzania, FSM, powtórzeń i checkpointów; zero DOM/storage |
| `formcheck/formcheck-library.js` | 2 | Konfiguracje przysiadu, później innych ćwiczeń; nazwowe matchery |
| `formcheck/formcheck-pose.js` | 2 | SDK, model, Cache API, kamera, ujednolicony stream landmarków i źródło fixture JSON |
| `formcheck/formcheck-ui.js` | 2 | Pełnoekranowy PoC: podgląd, szkielet, licznik, STOP, wynik; bez zapisu |
| `formcheck.css` | 2 | CSS odizolowany prefiksem `.fc-*`; zgodny z paletą Sport Performance |
| `tests/formcheck-engine.test.mjs` | 2 | Syntetyczne sekwencje, weryfikacja licznika, checkpointów i utraty punktów |
| `tests/fixtures/formcheck-squat-*.json` | 2 | Tylko landmarki / timestamps; bez zdjęć i klatek |
| `formcheck/formcheck-store.js` | 3 | Integracja `state.formCheck`, referencje serii, historia i agregaty |
| `index.html` | 3 | Minimalne hooki z `// [FormCheck]`; wersję podbić dopiero w Etapie 4 |
| `.github/workflows/plan-extras-tests.yml` | 2 | Dodać branch do `push` oraz ścieżki do filtrowania PR; istniejący `node --test tests/*.test.mjs` wykryje nowy test |
| `formcheck/formcheck-ui.js` | 4 | Kalibracja, wskazówki, głos, degradacja i zwalnianie zasobów |
| `formcheck/formcheck-pose.js` | 4 | Tuning wydajności, GPU/CPU, cache, cleanup; model Full |
| `formcheck/formcheck-store.js` | 4 | Limit miejsca, ograniczanie per-rep i obsługa błędów zapisu |

Brak `package.json`, bundlera, serwera, backendu, produkcyjnego service workera. Podglądy `preview/` są zamrożone.

## 4. Mapa dokładnych hooków do `index.html` (wyłącznie przyszły Etap 3/4)

| Miejsce obecnie | Planowany hook | Warunek bezpieczeństwa |
|---|---|---|
| `index.html:228` | `<link rel="stylesheet" href="./formcheck.css?v=1">` | Po obecnych CSS; tylko po zgodzie na Etap 3 |
| `index.html:262` | Overlay `#formCheckOverlay` obok `#techOverlay` | Domyślnie ukryty; `role=dialog`, focus trap i aria |
| `index.html:479–483` | `state.formCheck ??= {schemaVersion:1,sessions:[],settings:{...}}` | Nigdy nie nadpisywać istniejącej zawartości |
| `index.html:767` | Ikona/przycisk przy ćwiczeniu planowym | Kontekst `planId + planSlotIndex` |
| `index.html:769` | Akcja kamery przy konkretnej serii planowej | `planSetIndex=j`, bez zmiany semantyki ✓/✕ |
| `index.html:817–820` | Akcja przy dodatkowych ćwiczeniach i ich seriach | `manualSetIndex=j` |
| `index.html:981–984` | Akcja przy ćwiczeniu/serii dowolnej | `manualSetIndex=j` |
| `index.html:1029–1038` | Lista kontrolna i przycisk w `openTechnique(id)` | Tylko dla `FormCheck.hasConfig(e)`; nie usuwać istniejącej instrukcji |
| `index.html:993` | `FormCheck.onWorkoutFinished(session)` przed końcowym zapisem | Wywołanie synchroniczne, tylko po potwierdzeniu zakończenia i w bezpiecznej transakcji |
| `index.html:1180` | Badge `%` i rozwinięte checkpointy w historii | Bez modyfikowania starych sesji |
| `index.html:1091–1093` | Metryka i wykres `Technika` (6/12/26 tyg.) | Osobna metryka, zachować obecne trzy |
| `index.html:1201–1202` | Istniejący eksport/import cały `state` | Normalizacja brakującego `formCheck` w starym imporcie |
| `index.html:1204` | Skrypty `formcheck-library.js`, `formcheck-engine.js`, `formcheck-pose.js`, `formcheck-store.js`, `formcheck-ui.js` | W tej kolejności, `defer`; jedyny globalny punkt `window.FormCheck` |
| `index.html:1,223,228` | `v1.7.0 — AI Form Check` | Wyłącznie Etap 4 |

`render()` z `index.html:546` nie buduje bezpośrednio serii, tylko wywołuje `renderPlanWorkout()` i `renderToday()`. Funkcja `renderCatalog()` ma oryginał w `index.html:1041` i bieżącą redefinicję w `ui-enhancements.js:65` — nie dopisywać hooków do obu wersji.

W tej wersji `renderHistory()` nie ma usuwania pojedynczej zakończonej sesji; `onWorkoutDeleted(id)` pozostanie bez wywołań, dopóki taka funkcja nie powstanie.

## 5. Publiczny interfejs i izolacja

Jedyny punkt integracji: `window.FormCheck`, którego metody są no-op/fallback przy braku gotowego silnika:
- `isAvailable() -> boolean` — synchroniczne sprawdzenie `isSecureContext`, `navigator.mediaDevices?.getUserMedia`, `WebAssembly`; nie pyta o zgodę; brak WebGL nie oznacza automatycznej blokady, ponieważ dopuszczamy CPU.
- `hasConfig(exercise) -> boolean` — dopasowanie nazwy / nadpisanie `exercise.formCheck`.
- `open({exerciseId,setContext?}) -> Promise<FormCheckResult|null>` — model i kamera inicjowane po geście; anulowanie zwraca `null`.
- `getSessions({exerciseId?,workoutId?,since?}) -> FormCheckSession[]`.
- `getSetBadge(set) -> {score,sessionId}|null`.
- `getStats({weeks}) -> {trends,avgScore,topIssues,count}`.
- `onWorkoutFinished(session)` — przypisanie workoutId do nierozliczonych FC sesji pasujących do rozpoczynanego treningu.
- `onWorkoutDeleted(sessionId)` — pozostawiony na przyszłość (w aplikacji brak usuwania zakończonej sesji).

Silnik ma niezależny interfejs testowy `createSession(config)`, `ingest(frame)`, `finish()`; `frame` zawiera timestamp i znormalizowane landmarks. Nie importuje `state`, `document`, `window` ani żadnego pliku UI. IIFE eksportuje `window.FormCheckEngine`; testy w Node odczytują kod przez `readFileSync` i wykonują w `node:vm`, jak `tests/summary.test.mjs:6–17`. Prawdziwy ESM export nie jest konieczny.

## 6. Model danych końcowy (Etap 3)

Minimalna inicjalizacja:

`state.formCheck ??= {schemaVersion:1,sessions:[],settings:{voiceEnabled:false,model:'lite',facingMode:'environment',mirror:false}}`.

Ważne: nie resetować ustawień ani historii przy każdej inicjalizacji; uzupełniać brakujące pola osobno. Starsze kopie JSON bez `formCheck` są prawidłowe; w `importData(event)` należy normalizować pole bez utraty starych danych.

`formCheckLibrary`: wpisy `{match: RegExp,cameraView,cameraHint,repJoint,repThresholds,checkpoints[]}`. Prywatne ustawienie `exercise.formCheck?` jest opcjonalne, dopuszczone po walidacji konfiguracji. Dopasowanie przez nazwę ćwiczenia, nie numer `seed-`. `exerciseId` służy do łączenia wykonania z atlasem.

Checkpoint:
- `id:string`, `label:string`, `type:'angle'|'alignment'|'ratio'|'stability'|'tempo'|'symmetry'`,
- `points:string[]`, `phase:'top'|'down'|'bottom'|'up'|'whole'`,
- `ok?:{min?:number,max?:number}`, `warn?:{min?:number,max?:number}`,
- `hint:string`, `weight:number`, `minVisibility?:number`.

Wynik serii:
- `id:string` (UUID, z bezpiecznym fallbackiem), `createdAt:string`, `exerciseId:string`, `exerciseName:string`, `workoutId?:number`,
- `setRef?:{exerciseId:string,at?:string,planId?:number,planSlotIndex?:number,planSetIndex?:number,manualSetIndex?:number,workoutStartedAt?:string}`,
- `cameraView:'side'|'front'|'angle45'`, `durationMs:number`, `repsDetected:number`, `repsGood:number`,
- `score:number|null` (0–100, `null` oznacza brak miarodajnej oceny), `quality:{validFrameRatio:number,meanVisibility:number,uncertain:boolean}`,
- `checkpoints:{id,passRate:number|null,avgValue:number|null,worstValue:number|null,assessedReps:number}[]`,
- `reps:{n:number,score:number|null,failed:string[],values:Record<string,number|null>,tempo:{down:number|null,up:number|null}}[]` — maks. 30,
- `mainIssue:string|null`, `appVersion:string`, `modelVersion:string`.

Pola serii treningowej, dodane tylko gdy zapis jest możliwy: `set.formCheckId?:string` i `set.formCheckScore?:number`. Nie wprowadzać obowiązkowego nowego pola do starych serii.

**Relacja z serią:** nie ma trwałego `set.id`. Dla serii istniejącej identyfikacja przez `formCheckId` (główny klucz) oraz awaryjnie `exerciseId + at + planId + planSlotIndex + planSetIndex` albo `manualSetIndex`. Dla serii jeszcze niezapisanej Form Check wynik pozostaje tymczasowy, aż użytkownik zatwierdzi serię przyciskiem ✓. Nie zapisywać bezpośrednio w historii nieukończonych serii ani nie nadpisywać PR/ciężaru/RIR.

**Rozmiar:** nie przechowywać obrazów, wideo, obrazków z kamery ani surowego strumienia landmarków. `reps.length <= 30`; historyczne podsumowanie można zachować bez `reps[]` w sytuacji braku miejsca. Żądany warunek `JSON.stringify(state).length > 4_000_000` należy egzekwować przed dodaniem sesji; ponieważ JS length liczy jednostki UTF-16, a nie bajty, dodatkowo kontrolować `Blob([json]).size` i obsłużyć `QuotaExceededError`. Nie ingerować w niezwiązane z Form Check zapisy treningów.

## 7. Reguły silnika — doprecyzowanie i ryzyka

- Źródłem jest `landmarks[]`: piksele analizowane lokalnie, na dysk trafiają wyłącznie wyniki matematyczne.
- Kąty 2D obliczane z trzech landmarków; kąt ≈ 0–180°. Wysokość sylwetki (skalowanie) wyznaczana przy dobrej widoczności.
- Wygładzanie EMA dla osobnych stawów z resetem po utracie sylwetki. Wersja testowa trzyma także surową wartość w debug.
- Maszyna stanów `TOP → DOWN → BOTTOM → UP → TOP`, histereza, `minRepMs:1200`, minimum obserwacji w każdej fazie i maksymalna przerwa między ważnymi klatkami.
- Wymóg widoczności podstawowych stawów min. `0.6`; brak widoczności przez 3 s → pauza; klatki niepewne nie generują kar ani nowych rep.
- **Ważny konflikt wymagań:** jeśli BOTTOM dla zliczania wymaga kolana <=100°, przysiad zbyt płytki (~110°) nie zostanie policzony i nie otrzyma błędu `depth`. Rozdzielamy **detekcję pełnego cyklu** (provisional BOTTOM ~115–125°, do strojenia) od **oceny poprawnej głębokości** (<=95°, ostrzeżenie <=110°). Próg 120° jest punktem testowym, nie dowiedzioną granicą biomechaniczną.
- W Etapie 2 checkpointy: `depth` (kąt kolana w dolnej fazie), `heels` (zmiana pozycji pięty znormalizowana rozmiarem sylwetki). Gdy pięta zasłonięta albo ruszy się kamera, ocena `heels` = niepewna zamiast błędu.
- Ocena rep = suma wag checkpointów ocenionych w wiarygodnych klatkach / suma ich wag; checkpoint niepewny wyłączony z mianownika, nie oceniony jako porażka. W PoC wynik jest demonstracyjny, nie poradą medyczną.
- Powolny ruch, ocena klatek osobno dla faz, bez naliczania fałszywych rep przy drżeniu odczytu.
- Testy: 5 poprawnych przysiadów (5 rep, 0 błędów), płytkie (policzone i `depth` fail), ruch pięty (fail przy czytelnych punktach), koślawienie (test typu `ratio` późniejszego etapu), szum, utrata sylwetki, ruch poniżej minRepMs, wielokrotne przejście przez próg.
- Wskaźnik false positives <10% i ±1 na 10 powtórzeń są **celami akceptacyjnymi** wymagającymi testów na realnym wideo; nie wynikają z kodu ani testów syntetycznych.

## 8. PoC Etap 2 — zakres i przepływ

1. Użytkownik otwiera `formcheck/demo.html` na originie HTTPS, wybiera przysiad z boku.
2. Jeden przycisk "Włącz kamerę" wywołuje `getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}})` po geście (bez blokowania przez pobieranie modelu); start modelu równolegle.
3. Ekran pokazuje `<video playsinline muted autoplay>`, nakładkę `<canvas>`, status widoczności, instrukcję kadru; szkielet i duży licznik. W Etapie 2 wyłącznie podstawowa kontrola kadru, bez pełnego coachingowego prowadzenia z Etapu 4.
4. `requestAnimationFrame` + `detectForVideo(source,performance.now())` tylko dla nowych klatek; rozdzielczość obrazu wejściowego eksperymentalnie ~320 px krótszy bok, bez gwarantowania accuracy. Przy FPS <20 redukcja liczby inferencji, nie renderowania UI.
5. `STOP` lub restart → podsumowanie wyników `depth`/`heels`, policzone rep, procent z widocznym zastrzeżeniem; **bez zapisu**.
6. Zamknięcie, pagehide, zatrzymanie i ponowne otwarcie: `cancelAnimationFrame`, `MediaStreamTrack.stop()` dla wszystkich tracków, `video.srcObject=null`, `PoseLandmarker.close()`, `WakeLockSentinel.release()`. Nie utrzymywać strumieni między uruchomieniami.
7. Źródło testowe: te same sygnatury co adapter kamery, fixture JSON z landmarkami i timestampami, bez obrazów.
8. W Etapie 2 bez głosu, bez zapisu do serii/historii, bez zmiany głównego atlasu lub planów, bez kalibracji 5 s (to część Etapu 4).

**Kontrole testowe na telefonie**: Android Chrome i iOS Safari w przeglądarce oraz PWA tam, gdzie dostępna; zgoda na kamerę, odmowa, brak połączenia przy pierwszym pobraniu, przywracanie po utracie widoczności, obrót urządzenia, przełączenie przedniej/tylnej kamery, zamknięcie overlayu i lampka kamery, 10 cykli otwarcia, FPS/płynność, ponowne użycie cache modelu.

## 9. Jak testować PoC na telefonie bez zmian produkcji

W Etapie 2 kod pojawi się w gałęzi `feature/ai-form-check`, ale **nie będzie publicznego URL GitHub Pages tej gałęzi** — obecne GitHub Pages publikuje `main`.

Wariant preferowany do pierwszych testów: lokalny serwer + zewnętrzny tunel HTTPS na osobnym originie.

```bash
git clone https://github.com/durart/moja-silownia.git
cd moja-silownia
git switch feature/ai-form-check
python3 -m http.server 8080
```

W drugim terminalu:
```bash
cloudflared tunnel --url http://localhost:8080
```

Otworzyć z telefonu przydzielony przez Cloudflare adres `https://…trycloudflare.com/formcheck/demo.html`. Tunel udostępnia tylko dane z lokalnego serwera; nie używać w nim prywatnych kopii treningów ani danych produkcyjnych. Lokalny serwer powinien być zatrzymany po teście.

Alternatywa: certyfikat HTTPS zaufany przez telefon i lokalny adres sieciowy; sam podpisany certyfikat bez zaufania na iOS nie jest pewną drogą do `getUserMedia`. `http://localhost:8080` na telefonie wskazuje telefon, nie laptop.

Podgląd opublikowany na `/preview/form-check/` wymagałby ingerencji w publikowaną gałąź `main`, sprzecznej z obecnymi ograniczeniami. Do osobnej decyzji przed publikacją pozostaje inne środowisko hostingu / odrębny origin i sposób automatycznej aktualizacji podglądu.

## 10. Kontrola regresji i bramki akceptacji

Po Etapie 2:
- Testy `node --test tests/*.test.mjs` oraz `node --check` nowych plików.
- Workflow GitHub Actions ma zostać rozszerzony o `feature/ai-form-check` i `formcheck/**`, aby testy uruchamiały się po push.
- Porównanie do `main` musi wykazać brak zmian w `index.html`, `manifest.webmanifest` i `preview/**` podczas Etapu 2.
- Testy bez kamery i offline mają kończyć się informacją, a nie błędem aplikacji.
- Brak zapisu do `localStorage` w `formcheck/demo.html`.
- Zero commitów na `main`, zero merge, zero produkcyjnych migracji danych.

## 11. Pytania otwarte i decyzje odłożone

1. Czy do prób Etapu 2 wystarczy tunel HTTPS z lokalnego laptopa, czy wymagany będzie osobny publiczny URL testowy? Wariant domyślny: tunel.
2. Które telefony będą sprzętem akceptacyjnym (konkretne modele i wersje OS)? Brak tych informacji nie blokuje implementacji, lecz nie wolno obiecywać metryk FPS/accuracy.
3. Czy priorytetem późniejszej kalibracji jest większa czułość wychwytywania błędów, czy unikanie fałszywych alarmów? Z obecnego briefu: unikanie fałszywych alarmów.
4. Z jakim treningiem wiązać Form Check uruchomiony z Atlasu poza aktywnym treningiem? Domyślnie `workoutId:null`, "Zapisz bez serii".
5. Jak postępować z błędem głębokości niewidocznym z jednej kamery? Domyślnie: `unknown`, bez kar.
6. MediaPipe deklaruje lokalne przetwarzanie obrazu, ale SDK może przesyłać metryki użycia; na etapie wdrożenia wymagane sprawdzenie realnych żądań i komunikatu prywatności.

## 12. Kryterium wejścia do Etapu 2

Akceptacja planu Etapu 1 przez właściciela. **Bez tej akceptacji nie powstają pliki implementacji ani demo.** Przyjęcie oznacza zgodę na izolowane PoC przysiadu, a nie na pełną integrację albo publikację produkcyjną.
