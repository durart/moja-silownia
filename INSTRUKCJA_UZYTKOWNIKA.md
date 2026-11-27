# Moja Siłownia — instrukcja użytkownika

Wersja dokumentacji: 1.7 | Aplikacja: 3.9.0 | Aktualizacja: 27.11.2026

[Aplikacja](https://durart.github.io/moja-silownia/)

## 1. Przeznaczenie
Prywatny dziennik treningów siłowych, kalistenicznych, izometrycznych i kardio: plany, serie, ciężary, powtórzenia, czas aktywności, rekordy, progresja, obciążenie mięśni, szacowane kalorie, historia masy ciała i kopie danych.

## 2. Pierwsze uruchomienie
Otwórz aplikację w przeglądarce, uzupełnij Profil i wybierz plan lub trening dowolny. Na Androidzie w Chrome wybierz z menu Zainstaluj aplikację lub Dodaj do ekranu głównego. Po załadowaniu podstawowe funkcje mogą działać offline; zasoby zewnętrzne wymagają internetu.

## 3. Start
Panel umożliwia rozpoczęcie treningu oraz przegląd obciążenia mięśni. Pokaż wszystkie rozwija zestawienie. Obciążenie jest szacunkiem, nie pomiarem regeneracji.

## 4. Plany
W Plany → Moje plany wpisz nazwę, wybierz ćwiczenia według partii i zapisz plan. Możesz edytować zapisane plany i uruchamiać je. Plany trenera zawierają 10 gotowych propozycji, które można dodać bez usuwania własnych planów.
Importuj PDF, DOCX, TXT lub wklej tekst, np.:
```
Trening A
Wyciskanie sztangi 3 x 12
Wiosłowanie 3 x 10
```
W planie możesz również umieścić ćwiczenia z kategorii Kardio; ich parametry różnią się od serii siłowych. Sprawdź rozpoznane ćwiczenia, serie i powtórzenia przed zapisaniem. PDF/DOCX mogą wymagać internetu przy pierwszym użyciu; skany bez warstwy tekstowej nie są obsługiwane.

## 5. Rozpoczęcie treningu
Wybierz zapisany plan lub Start → Rozpocznij trening → Zacznij trening dowolny. Przed sesją opcjonalnie wpisz Body Battery (0–100), czas snu, ocenę snu, samopoczucie i masę ciała. Masa wpisana tutaj dotyczy sesji; pomiar historyczny zapisuje się w Profilu.
Oznacz całą sesję jako lekką/regeneracyjną, jeśli taki jest jej cel. Możesz zmienić tryb przed zakończeniem. Sesja pozostaje w historii, wpływa na kalorie i obciążenie, ale nie zastępuje standardowych treningów w analizie progresji.

## 6. Rejestrowanie serii
Wybierz ćwiczenie, wpisz rzeczywisty ciężar i powtórzenia oraz opcjonalnie RIR (liczba powtórzeń w zapasie przy poprawnej technice). Przykład: 60 kg × 12, RIR 2. Zapisuj wykonane serie. Możesz korygować podpowiedzi, usuwać serie, dodawać lub zamieniać ćwiczenia i zakończyć sesję bez wszystkich ćwiczeń. Notatka dotyczy całego ćwiczenia, np. inna maszyna lub dyskomfort. Nie zwiększaj ciężaru kosztem techniki.

Dotknij nagłówka ćwiczenia lub strzałki, aby rozwinąć lub zwinąć serie. Widoczny jest licznik wykonanych serii i zielony znacznik ukończenia. Po zapisaniu ostatniej serii otwartego ćwiczenia rozwija się następne nieukończone. Możesz ponownie otworzyć dowolną kartę; zwinięcie nie usuwa serii. Wybrana karta jest zapamiętywana dla bieżącej sesji.

### Ćwiczenia izometryczne (3.4.0)
Plank, plank boczny, zwis na drążku, hollow body hold i L-sit na poręczach mają pole Czas (s) i opcjonalny dodatkowy ciężar zamiast powtórzeń i RIR. Uruchom stoper, zatrzymaj po wykonaniu pozycji, sprawdź czas i zatwierdź serię; wtedy zacznie się przerwa. Możesz wpisać sekundy ręcznie. Jeden stoper na sesję; odświeżenie zachowuje moment startu. Przed zakończeniem sesji zatrzymaj stoper.

### Kardio (od 3.5.0)
Wybierz kategorię Kardio w atlasie lub podczas dodawania ćwiczeń do planu albo treningu dowolnego. Dostępne są:

| Ćwiczenie | Parametry dodatkowe poza czasem |
| --- | --- |
| Bieżnia – marsz | Dystans (km), prędkość (km/h), nachylenie (%) |
| Bieżnia – bieganie | Dystans (km), prędkość (km/h), nachylenie (%) |
| Rower stacjonarny | Dystans (km), prędkość (km/h) |
| Schody – StairMaster | Liczba pięter |
| Orbitrek | Dystans (km) |
| Wioślarz | Dystans (km), tempo (s/500 m) |

1. Otwórz kartę ćwiczenia. Naciśnij **Uruchom stoper** lub wpisz rzeczywisty czas w minutach.
2. Podczas pomiaru możesz użyć **Pauza**, **Wznów** i **Zatrzymaj**.
3. Uzupełnij dostępne parametry oraz opcjonalnie RPE (subiektywna intensywność wysiłku w skali 1–10).
4. Zatrzymaj stoper i wybierz **Zapisz kardio**. W razie pomyłki użyj **Cofnij zapis** i popraw dane.
5. Zakończ trening, aby zachować aktywność w historii.

Kardio nie wymaga ciężaru, powtórzeń ani RIR. RPE nie jest tym samym co RIR. Nie przeliczaj czasu lub dystansu na tonaż siłowy. Możesz łączyć kardio i ćwiczenia siłowe w jednej sesji. Kalorie pozostają szacunkiem, a nie pomiarem z urządzenia.

### Zamiana ćwiczenia podczas treningu (od 3.5.1)
Użyj opcji zamiany przy ćwiczeniu w aktywnej sesji. Dostępne są dwie rozwijane sekcje:

- **Atlas ćwiczeń** – wybierz dowolne obsługiwane ćwiczenie według kategorii lub nazwy, w tym kardio.
- **Proponowane zamienniki** – wybierz z listy uporządkowanej według podobieństwa zaangażowania mięśni. Procent dopasowania to wskaźnik porównawczy, a nie pomiar EMG.

Zamiana nie zmienia zapisanego planu ani wcześniej wykonanych serii. Aplikacja blokuje niedozwolone duplikaty i nie przenosi nieodpowiednich celów ciężaru oraz powtórzeń ze starego ćwiczenia. Zakończ lub zatrzymaj aktywny stoper przed zamianą. Sprawdź parametry nowego ćwiczenia przed zapisaniem wyniku.

## 7. Czas i przerwy
Licznik mierzy czas sesji, a timer odlicza przerwę (domyślnie 90 s według dotychczasowych ustaleń). Na ekranie aktywnego treningu licznik jest stale widoczny nad przyciskiem zakończenia. +15 s wydłuża aktywną przerwę, a Pomiń pozwala kontynuować wcześniej. Testuj dźwięk sprawdza sygnały zależne od urządzenia.

## 8. Asystent Progresji
Analizuje historię, ciężary, powtórzenia, zakres docelowy, RIR i charakter sesji. Od 3.9.0 podwójna progresja dla jednolitych serii z jawnym zakresem i RIR wymaga osiągnięcia górnej granicy we wszystkich planowanych seriach z docelowym RIR przed zwiększeniem ciężaru. Przykład: 75 kg, 3 × 5–8, RIR 2: 7/6/5 → 8/7/6 → 8/8/7 → 8/8/8, następnie 77,5 kg, jeśli sprzęt pozwala. Brak RIR, niepełne lub niewiarygodne serie ograniczają progresję. Powtarzający się spadek może uzasadnić ostrożne zmniejszenie ciężaru. Historia innego planu jest wykorzystywana przy jednoznacznym dopasowaniu. Niejednorodne piramidy nie otrzymują automatycznej progresji każdej serii. Trening regeneracyjny nie powinien zastępować standardowego odniesienia. Podpowiedź nie jest obowiązkiem ani oceną techniki.

Skrócona rekomendacja pozostaje widoczna; wybierz Pokaż uzasadnienie, aby zobaczyć szczegóły i ustawienia sprzętu.

## 9. Asystent Trenera
Przygotowuje wartości startowe kolejnego treningu na podstawie wcześniejszych zapisów. Po wykonaniu i zapisaniu treningu A kolejna sesja może otrzymać zaktualizowane propozycje. Zawsze koryguj je do rzeczywistego wykonania.

W ćwiczeniach czasowych Asystent proponuje wzrost o 5 s po ukończeniu porównywalnych serii roboczych, do limitu planu. W treningu dowolnym domyślny zakres to 30–60 s. Regeneracja, gorsza gotowość, problemy z techniką lub niepełne serie ograniczają progresję. Nie zwiększa automatycznie dodatkowego ciężaru. Zapisuj rzeczywisty czas.

### Asystent kardio
Korzysta z historii danego ćwiczenia, celów planu i intensywności wysiłku. Po dwóch porównywalnych sesjach o niskim RPE może zasugerować wydłużenie czasu lub zwiększenie nachylenia albo prędkości, zależnie od rodzaju ćwiczenia. Brak danych, długa przerwa, sesja regeneracyjna lub wysokie RPE ograniczają progresję. Rekomendacje są wskazówkami; zawsze dostosuj parametry do swoich możliwości.

## 10. Atlas ćwiczeń
Wybierz partię mięśniową lub wyszukaj nazwę. Przełącz sortowanie między ostatnio używanymi i alfabetycznym. Dla dostępnych pozycji otwórz informacje o technice. Aby dodać własne ćwiczenie, rozwiń Dodaj własne ćwiczenie, wpisz nazwę, wybierz grupę i zapisz.

### Grafiki i tożsamość ćwiczeń (3.6.0–3.7.0)
Atlas wykorzystuje 125 indywidualnych grafik ćwiczeń oraz 15 grafik kategorii. Sześć dawniej powielonych pozycji kalistenicznych współdzieli tożsamość i grafikę z odpowiednikami w katalogu podstawowym. Ćwiczenie może być dostępne w więcej niż jednej kategorii bez tworzenia oddzielnej historii progresji. Nowe grafiki są objęte cache PWA; po poprawnym pobraniu zasobów mogą być dostępne offline. Ilustracje mają charakter poglądowy i nie zastępują instrukcji techniki.

Przy aktualizacji aplikacja zachowuje historyczne serie i ich pierwotne identyfikatory. Migracja jest odraczana w trakcie aktywnego treningu i nie nadpisuje rozbieżnych ustawień lub notatek w przypadku konfliktu. Nie usuwaj danych przeglądarki w celu wymuszenia aktualizacji; najpierw wykonaj kopię JSON.

## 11. Zakończenie treningu
Wybierz Zakończ trening. Sprawdź podsumowanie: czas, ćwiczenia, serie, powtórzenia, objętość, zapisane aktywności kardio, szacowane kalorie i rekordy, zależnie od dostępnych danych. Możesz przygotować graficzne podsumowanie do zapisania lub udostępnienia. Karta PNG i Pełny PNG pokazują orientacyjne zaangażowanie mięśni: czerwony oznacza partie główne, żółty pomocnicze. Po aktualizacji do 3.3.2 można ponownie wygenerować obraz także dla wcześniej zapisanego treningu.

## 12. Historia
Przeglądaj ostatni trening, zakończone sesje i statystyki aktywności. Wybierz okres 6, 12 lub 26 tygodni oraz metrykę: czas, objętość lub powtórzenia. Objętość obciążenia to suma iloczynów ciężaru i powtórzeń zapisanych serii. Aktywności kardio są zapisywane oddzielnie od serii siłowych; porównuj ich czas, dystans i pozostałe parametry odpowiednie dla urządzenia.

## 13. Postępy
Analizuj progresję siłową, szacowane 1RM i objętość. 1RM jest estymacją, nie wynikiem testu maksymalnego. Porównuj to samo ćwiczenie, maszynę i technikę; oceniaj trend wielu sesji, nie pojedynczy słabszy wynik. Analiza pracy mięśni nie mierzy rzeczywistej hipertrofii.

W Postępach wybierz ćwiczenie czasowe: najdłuższa seria i łączny czas serii roboczych są w sekundach. Rekord czasu uwzględnia sesje standardowe, a dodatkowy ciężar jest wyświetlany osobno. Sekundy nie zwiększają tonażu ani 1RM. Historia, mapa mięśni, podsumowanie i PNG uwzględniają izometrię; CSV ma oddzielną kolumnę czasu. Stare zapisy bez jednostki czasu nie są automatycznie przeliczane.

## 14. Profil
Zapisuj masę ciała z datą i wzrost. Masa wspiera szacowanie kalorii i analizy siły względnej. Kalorie są szacowane, nie mierzone bezpośrednio.

## 15. Obciążenie mięśni
Panel Start szacuje obciążenie grup na podstawie historii. Ćwiczenia wielostawowe angażują kilka partii (np. wyciskanie: klatka, triceps, przednie barki). Wskaźnik zmienia się z czasem. Zestawiaj go z samopoczuciem i snem; nie jest oceną medyczną.

## 16. Garmin
Dane Garmin Connect można wpisywać ręcznie przed sesją: Body Battery, sen, ocena snu i masa. Automatyczna integracja Garmin LIVE jest rozwijana osobno; nie jest potwierdzoną funkcją produkcji 3.7.0.

## 17. Kopie zapasowe
Dane pozostają w pamięci przeglądarki. Historia → Kopia danych → Pobierz kopię na telefon (JSON) lub Wybierz miejsce zapisu kopii. System może udostępniać lokalny folder, Dysk Google lub Dropbox.
Aby przywrócić dane, najpierw wyeksportuj bieżący stan, następnie wybierz Import kopii JSON i sprawdź historię oraz plany. Import po potwierdzeniu zastępuje dane na danym urządzeniu. Nieprawidłowe jawne serie czasowe są odrzucane przed zastąpieniem danych; stare zapisy zachowują format. Import zatrzymuje aktywny stoper, ale zachowuje zapisane serie i robocze wartości.
Wykonuj kopię co najmniej raz w tygodniu, przed aktualizacją, zmianą urządzenia i importem. Zapis w chmurze nie oznacza automatycznej synchronizacji. Nie czyść danych witryny bez kopii.

## 18. Codzienny sposób pracy
Przed treningiem sprawdź obciążenie mięśni, wybierz plan i opcjonalnie wpisz dane regeneracyjne. Podczas sesji zapisuj rzeczywiste serie, RIR i notatki, korzystaj z przerw; przy kardio zapisuj czas, odpowiednie parametry i opcjonalnie RPE. Po sesji zakończ trening, sprawdź podsumowanie i rekordy. Przed kolejną sesją przejrzyj postępy i propozycje asystenta.

## 19. Najczęstsze pytania
- Czy internet jest konieczny? Nie przez cały czas; część zasobów wymaga połączenia.
- Czy można zmienić podpowiedź ciężaru? Tak.
- Czy trzeba wykonać cały plan? Nie.
- Czy można dodać ćwiczenie spoza planu? Tak.
- Czy zamiana ćwiczenia zmienia mój zapisany plan? Nie, dotyczy bieżącej sesji.
- Czy mogę wykonać kardio po treningu siłowym? Tak, w ramach tej samej sesji.
- Czy po aktualizacji atlasu utracę wcześniejsze rekordy? Migracja zachowuje historyczne serie i ich pierwotne identyfikatory. Przed aktualizacją warto wykonać kopię JSON.
- Czy słabsza sesja oznacza utratę siły? Nie; analizuj trend i oznaczaj sesje regeneracyjne.
- Czy aplikacja mierzy wzrost mięśni? Nie, szacuje bodziec.
- Czy dane synchronizują się między telefonami? Nie automatycznie; użyj kopii JSON.
- Czy Garmin LIVE działa na produkcji? Nie jest potwierdzony w tej wersji.

## 20. Najważniejsze zasady
Zapisuj rzeczywiste wyniki, wiarygodny RIR, sesje regeneracyjne i notatki. Analizuj trendy. Traktuj asystenta jako wsparcie. Regularnie twórz kopie.

## Zakres weryfikacji
Instrukcja opisuje wydanie produkcyjne 3.9.0 (PR #80), w tym kardio (3.5.0), zamianę ćwiczeń (3.5.1), uporządkowanie tożsamości ćwiczeń (3.6.0) i grafiki atlasu (3.7.0). Zakres oparto na wydaniach PR #71, #73 i #74 oraz ich testach regresyjnych. Garmin LIVE pozostaje poza potwierdzonym zakresem produkcji.

## Instrukcje techniki — aktualizacja 3.3.1
W katalogu wybierz przycisk Technika przy ćwiczeniu. Instrukcje 103 ćwiczeń podstawowych są przypisane do identyfikatorów ćwiczeń, nie do podobieństwa nazw. Wybrane ćwiczenia mają nowe ilustracje poglądowe. Odnośniki zewnętrzne wymagają internetu. Ilustracje nie zastępują korekty techniki przez trenera.


## Wydanie 3.9.0 — potwierdzenie
27.11.2026: commit produkcyjny `7943595cd22afab7dd54d0479881dde2437428da`; GitHub Pages 45977530736 i regresje 45977531499, 45977531471: PASS. Kandydat 3b253cf: 10/10 CI; użytkownik potwierdził 8/8 testów RC1, działanie produkcji i zachowanie danych. Preview-390 zachowany. Cache v56, klucz danych bez zmian. Przerwa z planu (15–600 s) ma pierwszeństwo i blokuje wybór przerwy dla ćwiczenia. Izolacja danych jest logiczna, nie stanowi odrębnej granicy bezpieczeństwa. Nie potwierdzono wszystkich metadanych importu ani propagacji wszystkich oznaczeń niewiarygodności z UI. Dostępność produkcji potwierdził użytkownik, nie niezależny odczyt publicznego URL. Kolejna implementacja nie została rozpoczęta.
