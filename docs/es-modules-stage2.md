# ES Modules — etap 2: stan i localStorage

## Zakres
- `modules/state-core.js`: czyste funkcje odczytu, wyboru kopii, normalizacji podstawowego stanu oraz odzyskiwania aktywnego treningu.
- `modules/state-storage.js`: adapter `localStorage` z wstrzykiwanym interfejsem pamięci, kopią poprzedniego poprawnego stanu i zabezpieczeniem nieczytelnego zapisu.
- `modules/bootstrap.js`: eksport interfejsu `state` i `stateStorage` do mostu kompatybilności.
- `index.html`: zapis i odzyskiwanie aktywnego treningu delegowane do modułów po ich załadowaniu, z dotychczasową ścieżką awaryjną.
- `sw.js`: wersja v20, moduły dostępne offline.

## Istotne ograniczenie architektury
Pierwszy odczyt stanu pozostaje synchroniczny w skrypcie klasycznym. Natywne `type="module"` jest odroczone i nie może bezpośrednio udostępnić eksportów przed wykonaniem istniejącego inline script. Pełna ekstrakcja inicjalizacji wymaga w kolejnym kroku przeniesienia bootstrapu UI i audytu globalnych handlerów `onclick`.

## Ochrona danych
Klucz `moja-silownia-v01` i schemat JSON bez zmian. Kopia `-previous-valid` zachowana. Uszkodzony zapis zachowywany w `-unreadable`. Brak czyszczenia pamięci i migracji.

## Weryfikacja
Dodano `tests/es-modules-stage2.test.mjs`. Przed produkcją: `node --test tests/es-modules-stage2.test.mjs` oraz test na iPhone: zamknięcie aplikacji podczas aktywnego treningu, odtworzenie po ponownym uruchomieniu, zapis serii, eksport i import JSON, brak utraty planów i historii.
