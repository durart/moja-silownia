# Migracja do ES Modules — etap 1

Cel: stopniowe wydzielanie logiki z monolitycznego `index.html` bez bundlera, zmiany formatu zapisanych danych ani przerywania działania PWA.

## Zakres etapu
- `modules/records.js`: czysty silnik rekordów PR, z wyłączeniem serii rozgrzewkowych; brak zależności od DOM i globalnego `state`.
- `modules/storage.js`: czyste funkcje walidacji, serializacji i odczytu kopii JSON oraz decyzji o kopii poprzedniego stanu.
- `modules/bootstrap.js`: natywny entrypoint ES Modules z `import` i kompatybilnym mostem `window.MojaSilowniaModules`.
- `index.html`: stopniowe delegowanie PR, serializacji zapisu/eksportu i walidacji importu do modułów. Klasyczny kod nadal działa podczas ładowania modułów i offline, gdy moduł nie jest dostępny.
- `sw.js`: nowe zasoby w app shell, wersja cache v19.
- `tests/es-modules-stage1.test.mjs`: testy czystej logiki i integracji statycznej.

## Ochrona danych
- Nie zmieniono klucza localStorage ani schematu zapisów.
- Nie usuwano i nie przenoszono danych użytkownika.
- Funkcja `save()` zachowuje mechanizm kopii poprzedniego stanu oraz komunikat o błędzie zapisu.
- Import nadal wymaga potwierdzenia i zachowuje dotychczasową normalizację.
- Rozgrzewka `R` nie bierze udziału w PR; brak oznaczenia nadal oznacza serię roboczą.

## Ograniczenia
To **etap 1**, a nie całkowite rozbicie monolitu. Kod UI, zarządzanie stanem i eksport PNG pozostają na razie w `index.html`. Nie przenosić całego skryptu do `type=module` bez audytu inline `onclick`, gdyż funkcje modułów nie stają się globalne.

## Weryfikacja
`node --test tests/es-modules-stage1.test.mjs`

Przed kolejnym etapem: test na iPhone/PWA (offline, historia, zapis serii, eksport/import JSON, wykrywanie PR), następnie wydzielenie adaptera stanu i eksportu PNG z osobnymi testami regresyjnymi.
