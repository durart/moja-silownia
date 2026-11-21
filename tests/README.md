# Etap 7 — testy regresji

Testy uruchamiają aplikację na lokalnym serwerze HTTP i w mobilnym Chromium (Playwright).
Każdy test korzysta z **izolowanego kontekstu przeglądarki** oraz sztucznych danych w localStorage; nigdy nie korzysta z danych użytkownika.
Service Worker jest wyłączony w testach UI, aby deterministycznie testować bieżący kod; zachowanie offline wymaga oddzielnych testów.

## Uruchomienie

```bash
npm install
npx playwright install chromium
npm test
```

Workflow GitHub Actions uruchamia testy przy każdym PR do main i ręcznie (workflow_dispatch).
Aby **blokować merge**, administrator repozytorium musi włączyć regułę ochrony gałęzi main i wymagać statusu `browser-regression` — samo dodanie workflow nie blokuje scalania.

Zakres: start i nawigacja, pusty trening dowolny, pusty plan, zakończenie treningu z serią, trwałość historii/planów, eksport/import JSON.
Nie zastępuje to ręcznych testów Android/iOS, dźwięku ani offline. W etapie 7 nie zmieniamy numeru aplikacji ani produkcji.
