# Dashboard Cyan v2 — etapy 0–1
Status: izolowany prototyp na gałęzi feature/dashboard-cyan-v2. Produkcja main bez zmian.
## Ochrona danych
- Prototyp w preview/dashboard-cyan/index.html jest statyczny, nie importuje aplikacji i nie odczytuje ani nie zapisuje localStorage.
- Nie używać adresu produkcyjnego jako testowej instalacji PWA. Ścieżka w obrębie tego samego origin NIE izoluje localStorage.
- Przed integracją z rzeczywistym stanem przygotować osobny origin (np. oddzielne repo Pages lub subdomena) oraz wykonać eksport JSON historii.
- Nie czyścić danych aplikacji. Nie zmieniać schematu state ani mechanizmu save().
## Zakres
Etap 0: gałąź, zasady izolacji, dokumentacja ochrony danych.
Etap 1: osobny plik CSS z tokenami Cyan i statyczny szkic UI. Nie podłączać do produkcyjnego index.html.
## Następny etap
Po przygotowaniu niezależnego hostingu testowego: odczyt sesji, ostatni trening według daty, trend i obciążenie mięśni. Integracja wyłącznie z ekranem #dashboard; nie dotykać #workout ani sport-performance.css.
## Kontrole odbiorowe
- Prototyp bez JS i bez odczytu localStorage.
- W CSS selektory izolowane przez .dashboard-cyan-v2.
- Brak zmian w index.html, sw.js, sport-performance.css i plikach produkcyjnych.
- Przy integracji wymagana regresja aktywnego treningu i backup JSON.
