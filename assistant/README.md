# Inteligentny Asystent Treningu — Etap 1 (Doradca aktywny)
## Status
Osobna gałąź. Moduły tylko do odczytu. Brak integracji z index.html, SW, Dashboardem, Sport Performance, localStorage i produkcją.
## Źródła danych
Dopasowanie do stanu produkcyjnego: state.sessions (date, planName, sets, fatigueImpulse), state.plans (id, name, exerciseIds), state.exercises (id, group), state.startedAt, state.activePlan, state.manualStarted, state.active. Obciążenie korzysta z tego samego modelu połowicznego zaniku i profili grup mięśniowych co index.html. Uwaga: profile zdefiniowane w obu miejscach należy scalić przez adapter przed integracją, aby uniknąć rozjazdu.
## Reguły
- Wykrywanie trwającego treningu ma pierwszeństwo nad oceną planów.
- Punktacja 30/30/20/10/10 jest heurystyką do kalibracji, nie naukowym wskaźnikiem gotowości.
- Wybór planu nie modyfikuje stanu i nie uruchamia treningu.
- Progresja podwójna jest sugestią; brak RIR, ćwiczenia z masą ciała i mała liczba serii blokują propozycję zwiększenia ciężaru.
- Wariant bez planów i bez historii zwraca jawny stan braku danych.
## Ochrona danych
- Zero odczytów/zapisów localStorage, brak sieci, DOM i zmian schematu.
- Nie dodawać nowych plików do index.html ani sw.js w tym etapie.
- Nie publikować gałęzi na Pages ani nie testować na origin produkcji.
- Przed przyszłą integracją wykonać eksport JSON, zweryfikować odtwarzanie, przetestować na osobnym origin i zachować wyłącznik funkcji.
## Ryzyka przed Etapem 2
- Rozpoznawanie sesji po planName jest słabsze niż po stabilnym planId (obecne sesje zapisują nazwę). Zmiana nazwy planu osłabia dopasowanie.
- Szacunki obciążenia są wskaźnikiem modelowym, nie pomiarem regeneracji.
- Zewnętrzne zmiany katalogu ćwiczeń wymagają testów profili mięśni.
- Bez rozróżnienia maszyn/profilu sprzętu nie należy porównywać różnych ćwiczeń.
## Testy
Uruchom: node --test tests/advisor-stage1.test.cjs
