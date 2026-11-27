# Moja Siłownia 4.1.0-rc.1 — karta wydania

Status: kandydat, niezatwierdzony do publikacji. PR #89.

## Zakres
Adaptacyjna progresja per seria, porównywalna historia planu i pozycji, trendy, dobrowolna regeneracja, uzasadnienia rekomendacji. Kalistenika pozostaje odrębnym mechanizmem. Progi trendów są heurystykami, nie diagnozą fizjologiczną.

## Bramki
- Wszystkie workflow dla dokładnego SHA: success.
- Dedykowane testy, Playwright, aktualizacja z 4.0.0, import kopii, offline, izolacja.
- Audyt bezpieczeństwa i akceptacja użytkownika przed scaleniem lub publikacją.
- Schemat danych roboczych 1, bez planowanej migracji; oddzielne klucze i cache stagingu.

## Rollback (plan, niewykonany)
1. Wstrzymać publikację i ustalić SHA wadliwego wydania oraz zakres błędu. Nie usuwać danych ani pamięci lokalnej.
2. Zalecić eksport JSON z aktualnej aplikacji przed zmianą wersji. Nie nadpisywać istniejących kopii.
3. Przygotować osobny PR przywracający sprawdzony kod produkcji 4.0.0 (568a2e2fdd64c6a79117713b05018ab1fd96e5ec), z nowym identyfikatorem cache, bez resetu historii Git.
4. Sprawdzić na syntetycznych danych zgodność wsteczną zapisów RC.1, aktywny trening, import, offline i izolację. Jeśli niezgodność, wstrzymać rollback i przygotować bezstratną korektę.
5. Uzyskać wyraźną zgodę na publikację rollbacku. Zweryfikować Pages, wersję, cache i dane po publikacji.
6. Zachować raport incydentu i kopie; nie przywracać automatycznie starszej kopii kosztem nowych treningów.

Ryzyko rezydualne: heurystyki wymagają obserwacji w rzeczywistych treningach; aktywacja SW może wymagać zamknięcia wszystkich kart. Test rollbacku pozostaje do wykonania.
