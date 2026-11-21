# Rozwój funkcjonalny — wspólne zmęczenie, e1RM, rozgrzewka, gotowość

## Model i kompatybilność
- `muscle-fatigue-core.js` jest wspólnym, czystym źródłem profili mięśni, zaniku i impulsu. Funkcje w `index.html` delegują do niego; `assistant/assistant-core.js` używa tego samego modułu.
- Dotychczasowe sesje z `fatigueModel: 2` zachowują zapisany `fatigueImpulse`. Brak migracji, nie przeliczamy historycznych wartości.
- Model to heurystyka, a nie medyczny pomiar regeneracji. Kalorie nadal są szacowane.

## Serie
- `setType: 'W'` — robocza; `setType: 'R'` — rozgrzewkowa.
- Brak pola w starych zapisach oznacza serię roboczą.
- Serie R liczą się do ogólnej objętości, kalorii i szacowanego obciążenia mięśni, ale nie są brane pod uwagę przy wykrywaniu PR, e1RM i sugestiach progresji.
- Nowa seria domyślnie W. Zmiana typu zapisanej serii jest utrwalana przy zapisie serii, nie przy samym wyborze.
- Rozgrzewka nie jest automatycznie wykrywana po ciężarze — użytkownik oznacza ją ręcznie.

## e1RM
- `e1RM = ciężar × (1 + (powtórzenia + RIR)/30)` — wzór Epleya, RIR jest dodawany tylko, gdy został podany.
- Wynik tylko dla serii roboczych z dodatnim ciężarem i od 1 do 12 efektywnych powtórzeń.
- Wykres e1RM był już obecny w Postępach 2.0; teraz uwzględnia RIR i pomija rozgrzewkę. Tonaż nadal obejmuje wszystkie serie.
- e1RM jest orientacyjny, szczególnie przy ćwiczeniach maszynowych i zmiennym sprzęcie.

## Doradca i deload
- Doradca sprawdza `preWorkout.feeling` (`tired`, `bad`), `sleepHours < 6`, `battery < 30`, `sleepScore < 50`.
- Przy propozycji progresji dodaje ostrzeżenie o możliwości utrzymania ciężaru albo zmniejszenia objętości; nie dokonuje automatycznych zmian.
- Puste pola nie wywołują ostrzeżeń.

## Testy i wdrożenie
- `node --test tests/unified-fatigue-e1rm-warmup.test.cjs`
- `node --test tests/advisor-stage1.test.cjs tests/advisor-stage2.test.cjs tests/advisor-stage3.test.cjs`
- Ręcznie sprawdź iPhone/PWA: trening planowy, trening dowolny, dodatkowe ćwiczenia, oznaczenie R/W, zapis, odświeżenie, zakończenie, wykres e1RM, eksport/import JSON, ostrzeżenie przy `tired`.
- Przed testami na danych produkcyjnych wyeksportuj kopię JSON.
