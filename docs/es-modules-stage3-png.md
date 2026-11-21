# ES Modules — etap 3: eksport PNG

- `modules/workout-png.js` zawiera renderer pełnej grafiki treningowej przeniesiony z `index.html` bez zmiany układu, kolorów, metryk, rysowania anatomii ani tekstów.
- `exportWorkoutPNG(id)` pozostaje globalnym handlerem dla istniejących przycisków. Dynamiczny `import()` ładuje moduł przy pierwszym użyciu, bez wyścigu z ładowaniem aplikacji.
- Funkcje rysowania anatomii, szacowania kalorii, formatowania czasu oraz API przeglądarki są wstrzykiwane jako zależności.
- `sw.js` v21 buforuje moduł PNG do pracy offline.
- Dane w `localStorage` i schemat sesji nie są modyfikowane.

Testy: `node --test tests/es-modules-stage3-png.test.mjs`. Kontrole logiczne: render, metryki, PR, pobranie pliku, Web Share, składnia inline i cache (11/11). Przed wdrożeniem do produkcji przetestować eksport na iPhonie, w tym udostępnianie i anulowanie, oraz offline.
