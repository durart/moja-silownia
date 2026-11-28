# Personal Training Coach — Discovery & Architecture
Status: dokumentacja końcowa etapu analitycznego, rekomendacja warunkowa; ADR nie są jeszcze formalnie zaakceptowane. 2026-11-28.
Baseline: a8e191115b1bcbb32e2bfe19376d804974ee51e9 (4.1.1). Standard programowania 1.5 (2026-11-27). Zakres: wyłącznie dokumentacja; bez zmian runtime, testów wykonawczych, workflow i publikacji.

## 1. Cel i granice
FR-01 wiarygodna anatomia; FR-02 dobór obciążenia i powtórzeń; FR-03 zamienniki; FR-04 kolejność wykonania; FR-05 wyjaśnienia; FR-06 stagnacja; FR-07 objętość mięśniowa; FR-08 technika; FR-09 regeneracja; FR-10 kalistenika; FR-11 balans; FR-12 ocena planów. P1: FR-01–07; P2: FR-08–12. Offline first, brak płatnego API i backendu, lokalna historia i edytowalne sugestie, zachowane plany, ustawienia, import/eksport, mobilny UX i istniejące środowisko testowe. Żadna rekomendacja nie jest pomiarem fizjologicznym ani gwarancją bezpieczeństwa. Nie zmieniamy ręcznie wpisanych ani zapisanych serii automatycznie.
### Evidence base
Literatura użytkownika: Delavier, Strength Training Anatomy, wyd. 2 (m.in. klatka s. 49–65, łydki s. 110–113); Delavier/Gundill, Strength Training Anatomy Workout (kolejność 22–23, ciężar 28–29, różnice anatomiczne 30–32, stagnacja 33–35, dziennik 39–40). Dostępny skan Workout kończy się na s. 150; późniejszych rozdziałów nie zweryfikowano. Pozostałe skany/wersje językowe nie stanowią niezależnych dowodów. Nie publikować skanów, ilustracji ani danych prywatnych.
- KB-001/002/006/008: ACSM, Resistance Training Prescription 2026, https://doi.org/10.1249/MSS.0000000000003897 — progresywny trening, ciężar i kolejność w zależności od celu, brak konieczności upadku w każdej serii.
- KB-003/004/005: Pelland i in., metaregresja objętości i częstotliwości (2026), model serii bezpośrednich i pośrednich. Waga 0,5 jest modelem populacyjnym, nie procentem aktywacji ani parametrem regeneracji.
- KB-007: Robinson i in. (2024), metaregresje bliskości upadku; RIR to subiektywna estymacja, a nie pomiar.
- KB-009: Singer i in. (2024), przegląd przerw między seriami; Nunes i in. (2021), kolejność ćwiczeń. Kontekst ma znaczenie, bez uniwersalnej korekty liczbowej.
- KB-010: Kinoshita i in. (2023), Standing versus seated calf raises: różnice hipertrofii brzuchatego, podobny przyrost płaszczkowatego w tym badaniu.
- KB-011: Vigotsky i in., ograniczenia interpretacji EMG w przewidywaniu hipertrofii.
Rejestr roboczy z wcześniejszego przeglądu, nie przegląd systematyczny. Przed implementacją danej reguły potwierdzić bibliografię, populację, ograniczenia i bezpośrednią podstawę w źródle; dokładne progi, heurystyki, półtrwania i kroki progresji nie wynikają automatycznie z tych publikacji.

## 2. HLD 0.3 — modularny monolit PWA
Presentation (istniejące karty i raporty) -> Application (obsługa sesji, szkiców i rekomendacji) -> Training Domain (czyste funkcje) -> Data Contracts (walidacja, tożsamość, jednostki) / Knowledge Base (statyczna wiedza) / Storage adapter (stan użytkownika). Zależności domeny nie prowadzą do DOM, localStorage, sieci ani UI. Adapter aplikacyjny przekazuje dane i zegar do funkcji; UI nie rozstrzyga reguł bezpieczeństwa samodzielnie. Warstwy logiczne, nie obowiązkowe nowe katalogi ani framework. Stopniowa ekstrakcja tylko potrzebnej wspólnej logiki.
### Macierz zależności AS-IS / TO-BE
| Obszar | Istniejące źródło / wejście | Konsument / zmiana |
|---|---|---|
| Katalog | index.html, exercise-catalog-shared.js, calisthenics-library.js, modules/cardio-catalog.js | atlas, plany, selektory; zachować ID |
| Tożsamość | modules/exercise-identity.mjs, exercise-migration.mjs | katalog, historia, aliasy, migracja |
| Anatomia | muscle-fatigue-core.js, exercise-technique-library.js | atlas, zamienniki, objętość; wspólny profil semantyczny |
| Klasyfikacja serii | zapisane sets, programSet, session-mode.js | records, progress, fatigue, trainer, summary; wspólna walidacja |
| Metryki | progress-core-v2.js, modules/records.js, summary-core.js | raporty i progresja; jedna definicja estymacji, odrębne agregacje |
| Obciążenie mięśni | muscle-fatigue-core.js | atlas, assistant-core.js, calisthenics-progression.js; heurystyka jawnie oddzielona od objętości |
| Progresja | assistant-progression.js -> adaptive-evidence.js -> adaptive-adapter.js / adaptive-trends.js / adaptive-prescription.js | trainer-preparation.js -> trainer-drafts.js -> UI |
| Regeneracja | adaptive-recovery.js, assistant-core.js, preWorkout | rekomendacja wymagająca potwierdzenia, nie diagnoza |
| Czas/kardio | modules/timed-exercise-core.js, timed-preparation.js, cardio-progression.js | oddzielne jednostki i ścieżki, wspólne zasady bezpieczeństwa |
| Programy | modules/circuit-core.js, program-history.js, calisthenics-progression.js | rzeczywiste wyniki, strony, warianty |
| Zamienniki | index.html swapSuggestions/applySwap | profil i wzorzec ruchu; nie przenosić automatycznie ciężaru |
| Kolejność | planSlotIndex, planSetIndex, at, active state | osobny kontekst wykonania; at nie jest pomiarem odpoczynku |
| Polityka bezpieczeństwa | aktualne flagi, readiness, tryb, sprzęt, porównywalność | przygotowanie i zastosowanie sugestii, także karta bez szkicu |
| Trwałość | modules/storage-recovery.js, state-storage.js, backup/backup-core.mjs | zapis i import, odtwarzanie, rollback |
| Publikacja | sw.js, preview/sw.js, tests/release-surfaces.cjs, scripts/verify-staging-release.cjs | niezależne oczekiwania, SHA, artefakty i cache |
Nie jest to automatyczny pełny graf wszystkich importów. W każdym wydaniu sprawdzić konkretnych konsumentów i ścieżki wywołań.

### Kontrakty logiczne
- ExerciseIdentity: istniejący exerciseId, canonicalId jako projekcja, originalExerciseId zachowany; nie łączyć fizycznie dwóch obserwacji tylko z powodu aliasu.
- ExerciseKnowledge: exerciseId, knowledgeVersion, activityKind (resistance, mobility, conditioning, breathing, cardio), movementPattern, jointType, primary/secondary/stabilizer muscle IDs, sourceRefs, reviewStatus; unknown jawne. Bez współczynników EMG. Stabilizator nie jest automatycznie serią hipertroficzną.
- LoadDefinition: resistanceKind external_load/assisted_load/bodyweight/elastic_resistance/unknown, weightConvention (total/perImplement/assistance/unknown), equipment identity/config/step; measurementType reps/duration/cardio jest odrębnym wymiarem, nie rodzajem ciężaru. Bez automatycznej konwersji maszyn, gum czy asysty. Nieznana konwencja blokuje automatyczną progresję wymagającą porównania.
- SetObservation: raw record niezmienny; normalizowana projekcja wartości, RIR valid/missing/invalid, setClass working/warmup/unknown/conflict, reliability status, jednostka reps/perSide/cycle/breaths lub seconds; legacy brak typu przyjmowany jako working z oznaczeniem legacy, sprzeczne oznaczenia wymagają oceny. Nie zastępować wartości nieznanej zerem.
- ExecutionContext: opcjonalny planId, stabilny slot/revision (projekt do uszczegółowienia), exerciseId/variant/equipment identity, executionSequence, performedAt (tylko znane), recordedAt, editedAt, rest duration/provenance; brak historycznych danych pozostaje unknown. Nie wnioskować dokładnego odpoczynku z at.
- TrainingMetrics: tonnageAll, tonnageWorking w kg × reps tylko w znanej konwencji; e1RM estymacja z quality i modelVersion, przyjęty zakres reps+RIR <=12 jako konserwatywna polityka produktu do zatwierdzenia, nie uniwersalne prawo. Osobne max i średnia z jasno określonej próbki; direct/indirect/equivalent sets, duration, modelowy muscle load. Bez sumowania różnych jednostek.
- Recommendation: action (hold/review/increase/decrease/manual), reasonCodes, observations, dataQuality, context/version, editable proposed rows; kontrola w chwili zastosowania. Rozróżnić brak wystarczających danych od negatywnego sygnału bezpieczeństwa; żaden fallback nie obchodzi blokady. Priorytety: bezpieczeństwo > porównywalność > gotowość > cel > progresja > optymalizacja. Nie nadpisywać completed/edited.
- TrainingRule: ruleId, version, sourceRefs, evidenceType, scope, limitations, reviewStatus. Zasady naukowe odróżnione od decyzji produktowych.
Dane dodawane tylko opcjonalnie, po testach starego/nowego formatu; nie zmieniać kluczy storage ani formatu backupu bez osobnego uzasadnienia. Nie przechowywać w repozytorium danych użytkownika.

## 3. ADR-001–024
Wszystkie: proposed. R = rekomendowane do przyjęcia, C = warunkowe; brak formalnej akceptacji. Alternatywy: przebudowa, równoległe silniki, masowa migracja lub dalsze powielanie odrzucone ze względu na koszt/regresję. Konsekwencje i warunki poniżej.
| ADR | Ocena | Decyzja i konsekwencja |
|---|---|---|
| 001 | R | Rozbudowa istniejącego monolitu; nie rewrite; małe diffy. |
| 002 | R | Wspólny model wiedzy; nie duplikować opisów między silnikami. |
| 003 | R | Anatomia, objętość, zmęczenie odrębne; brak wspólnych arbitralnych procentów. |
| 004 | R | Deterministyczne reguły zamiast LLM; offline, przewidywalne testy. |
| 005 | R | Stabilne ID i zachowane aliasy; nazwa nie jest kluczem. |
| 006 | C | Addytywne dane; dowód round-trip i rollback z nowymi wynikami, migracja odroczona przy aktywnej sesji. |
| 007 | R | Wersjonowane reguły i źródła; odtwarzalne obliczenia. |
| 008 | R | Nie zmieniać planów automatycznie; rekomendacje edytowalne. |
| 009 | R | Jawne reason codes i jakość danych; bez medycznych deklaracji. |
| 010 | R | Obecny atlas wizualny; szczegółowość najpierw w danych. |
| 011 | R | Własne opracowania; brak publikacji książek i chronionych grafik. |
| 012 | C | Stały staging i osobne release gates; sprawdzić pełny artefakt, SHA i wspólny origin. |
| 013 | R | Jedna klasyfikacja/normalizacja serii; zgodność legacy. |
| 014 | C | Wspólny estymator e1RM; zakres, konwencja ciężaru i agregacje zatwierdzane testami. |
| 015 | R | Tonaż całkowity i roboczy rozdzielone; nie mieszać jednostek. |
| 016 | R | Ciężar i asysta różne semantycznie; blokada automatycznej zmiany asysty do walidacji. |
| 017 | R | Null/invalid różne od zera; nie klamrować błędnego RIR do upadku. |
| 018 | C | Planowana a rzeczywista kolejność; wykonanie/zapis/edycja osobno, brak rekonstrukcji czasu. |
| 019 | C | Kontekst planu, slotu, wersji, wariantu i sprzętu; ustalić zgodność starszych danych. |
| 020 | R | Wspólna nadrzędna polityka bezpieczeństwa; sprawdzanie również przy zastosowaniu. |
| 021 | R | Surowe obserwacje niezmienne; przeliczenia wyłącznie jako projekcje. |
| 022 | R | Mobilność, oddechy i trening oporowy osobno; bez sztucznej objętości. |
| 023 | C | Jakość danych zamiast pewności statystycznej; jawne braki i liczba obserwacji. |
| 024 | R | Charakterystyka baseline przed zmianą; test oczekiwanego zachowania oddzielny od reprodukcji błędu. |

## 4. Rejestr 28 ustaleń audytowych i ryzyk
S = statycznie stwierdzona właściwość kodu; H = hipoteza skutku wymagająca testu integracyjnego. Priorytet P0 = blokada przed dalszą automatyzacją, P1 = istotna poprawa, P2 = późniejsza. Wszystkie otwarte; nie deklarować wykonanej regresji.
| ID | Ustalenie | Status | Priorytet | Weryfikacja / docelowe wydanie |
|---|---|---|---|---|
| A-01 | Wspólny profil używany do mapowania, zmęczenia i podobieństwa | S | P1 | ML; 4.2/4.7 |
| A-02 | Różne agregacje i kryteria e1RM | S | P1 | TM-001/002; 4.3 |
| A-03 | Zamienniki oparte głównie na podobieństwie mięśni | S | P1 | ML-004, WC-005; 4.4 |
| A-04 | Brak pełnego kontekstu kolejności i odpoczynku w progresji | S | P1 | WC-001/004; 4.5/4.6 |
| A-05 | Stałe półtrwania zmęczenia 36–60 h, heurystyka | S | P2 | ML-007; 4.8 |
| A-06 | Różne klasyfikacje serii w modułach | S | P1 | DQ-005–009; 4.1.3 |
| A-07 | Doradca dopasowuje plan po nazwie | S | P2 | WC-006; 4.6 |
| A-08 | planMuscles nie uwzględnia pełnej dawki treningowej | S | P2 | ML-010 + fixture różnej liczby serii; 4.7 |
| A-09 | Estymator asystenta bez ograniczenia efektywnych reps do 12 | S | P1 | TM-001/002; 4.3 |
| A-10 | type:R traktowane niejednakowo | S | P1 | DQ-006; 4.1.3 |
| A-11 | Pusty/błędny RIR może dać impuls jak RIR 0 | S | P1 | DQ-002–004; 4.1.3 |
| A-12 | Różny wpływ rozgrzewki czasowej i powtórzeniowej na impuls | S | P1 | ML-007; 4.1.3/4.8 |
| A-13 | Niewiarygodne serie nie są wszędzie odrzucane z PR/e1RM | S | P1 | DQ-009, TM-004; 4.1.3/4.3 |
| A-14 | Powtórzenia na stronę, cykle i oddechy różnie agregowane | S | P2 | TM-007; 4.3 |
| A-15 | Odrzucenie historii przez adapter może pozostawić wcześniejszą sugestię | H | P0 | PS-010; 4.1.3 |
| A-16 | seed-28 maszyna z asystą ma zwykłą klasyfikację sprzętu | S/H | P0 | PS-008; 4.1.3 |
| A-17 | Fallback podstawowy korzysta z historii innego planu | S/H | P1 | WC-007; 4.1.3/4.6 |
| A-18 | Edycja planu może zmienić znaczenie indeksu slotu | H | P1 | WC-007; 4.5/4.6 |
| A-19 | Znacznik zapisu nie mierzy faktycznej przerwy | S | P1 | WC-003/004; 4.5 |
| A-20 | Liczba obserwacji nie daje pewności statystycznej | S | P2 | PS-001/003; 4.6 |
| A-21 | Mobilność może zanieczyścić przyszłą metrykę hipertrofii | H | P1 | ML-006; 4.2/4.7 |
| A-22 | Niewłaściwe domyślne kroki przy nieznanym sprzęcie | H | P0 | PS-006/007; 4.1.3 |
| A-23 | resolveEquipmentType ma fallback barbell dla nieznanych wartości | S | P0 | PS-006; 4.1.3 |
| A-24 | Karta UI ma odrębną ścieżkę zastosowania ciężaru | S/H | P0 | PS-004/011/012/013; 4.1.3 |
| A-25 | savePlanRow aktualizuje at przy edycji | S | P1 | WC-003; 4.5 |
| A-26 | Persistowane szkice mogą być nieaktualne po zmianie warunków | H | P0 | PS-011–014; 4.1.3 |
| A-27 | PR i raporty różnie kwalifikują historię (m.in. tryb) | S | P1 | TM-004/008; 4.1.3/4.3 |
| A-28 | Wspólny origin stagingu i produkcji, logiczna izolacja | S | P1 | SR-009/010; 4.1.2 |
P0: potwierdzić przyczynę na rzeczywistych modułach, blokować automatyczne zastosowanie niebezpiecznej/nieporównywalnej sugestii; nie blokować ręcznego zapisu faktycznych wyników bez odrębnej potrzeby.
Ryzyka przekrojowe: utrata historii (krytyczne: snapshot, rollback, SR-001–006, 012); błędna sugestia (wysokie: PS); niespójne raporty (TM); błędna anatomia (ML); pozorna regeneracja (jawna heurystyka); copyright (własne opracowanie); CI/CD/cache (SR); over-engineering (minimalny zakres). Właściciel wykonania: implementujący; akceptacja ryzyka/release: użytkownik. Nie traktować pozytywnego przeglądu jako akceptacji ryzyka.

## 5. Katalog — pokrycie i ograniczenia
103 seed + 64 cali + 6 cardio = 173 definicje. Sześć znanych aliasów: cali-02/09/10/11/18/19 -> seed-13/26/27/67/91/89. 167 kanonicznych identyfikatorów łącznie, 161 niekardio (nie to samo co unikalne biomechanicznie ruchy). 40/103 seed i 64/64 cali mają indywidualne profile; 63 seed korzystają z ogólnych. 104/167 definicji niekardio z indywidualnym profilem; wszystkie 167 mają opis techniki. To pokrycie techniczne, nie walidacja naukowa. Macierz per-ID przygotowana wcześniej w rozmowie; nie jest plikiem tego repozytorium. Audyt 4.2: każdy ID, alias, activityKind, profile roles, sourceRef, reviewStatus; nieznane wartości oznaczyć, nie wymyślać profili.
