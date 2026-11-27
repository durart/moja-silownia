# Moja Siłownia 4.1.0-rc.1 — karta wydania

Status: regresja automatyczna zaliczona dla c2edbbb90f4f7557d68b649f21ff93f351db3c93; kandydat niezatwierdzony do publikacji. PR #89.

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

Ryzyko rezydualne: heurystyki wymagają obserwacji w rzeczywistych treningach; aktywacja SW może wymagać zamknięcia wszystkich kart. Rollback syntetyczny zaliczony; rzeczywisty rollback produkcyjny nie był wykonywany.

## Weryfikacja rollbacku
Dodano test lokalny: zapis nowej serii w RC.1, powrót do kodu 4.0.0 z odrębnym cache, porównanie danych i odczyt offline. Wynik PASS dla c2edbbb90f4f7557d68b649f21ff93f351db3c93.

## Wyniki CI — b09c44eef5485e914408f69721eeb5844e60ebd4
9/10 workflow PASS; 63/63 testów adaptacyjnych, Playwright progresji i Security hardening PASS. Aktualizacja SW osiągnęła porównanie danych, które wykazało dodanie manualSetIndex: 0 w syntetycznej serii. Import i rollback nieosiągnięte. NO-GO do ponownej regresji.

## Wyniki CI — 7aaefa892377097eb83640624cc3b72612d5a234
9/10 workflow PASS, 63/63 testów adaptacyjnych. Workflow 46014045255: aktualizacja 4.0.0 → RC.1, import JSON, offline i izolacja PASS. Rollback: timeout podczas oczekiwania na kontroler i tytuł po ponownym otwarciu strony. Test uzupełniono o oczekiwanie na aktywację cache rollbacku i ponowne przeładowanie. NO-GO do potwierdzenia.

## Wyniki CI — c2edbbb90f4f7557d68b649f21ff93f351db3c93
10/10 workflow PASS, 63/63 testów adaptacyjnych, 0 błędów. Workflow 46014690287: Playwright, aktualizacja z 4.0.0, import JSON, offline, izolacja i rollback z danymi zapisanymi w RC.1 PASS. Security hardening 46014690298 PASS.

## Ocena audytu
Przejrzano integrację przygotowania serii, szkiców i uzasadnień: rozdzielenie historii od rekomendacji, ochrona ręcznych korekt i wykonanych serii, blokady progresji przy flagach bezpieczeństwa, oddzielny mechanizm kalisteniki. Ograniczenia: progi trendów są heurystyczne; regeneracja przy istniejącej historii regeneracyjnej wykorzystuje dotychczasowe obciążenia, a nie gwarantowaną redukcję względem każdej ostatniej sesji. Test rollbacku obejmuje syntetyczny trening i nie stanowi dowodu dla wszystkich możliwych kopii użytkownika. GO dla automatycznej regresji RC.1; publikacja NO-GO bez akceptacji użytkownika, weryfikacji finalnego SHA i wersji stabilnej. Nie wykonano publikacji ani scalenia.
