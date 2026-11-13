# ChineseOS baza wiedzy i kierunek rozwoju

8 listopada 2026 • dokument wewnętrzny • wersja 1

## Decyzja produktowa

Punktem wyjścia ma być własna myśl ucznia, a nie obowiązek znalezienia i wklejenia chińskiego tekstu. Uczeń mówi lub pisze po polsku, angielsku albo w innym obsługiwanym języku, co naprawdę chce wyrazić. ChineseOS pomaga przełożyć intencję na naturalny chiński, pokazuje Hanzi, Pinyin i wymowę, a następnie umożliwia ćwiczenie tej samej myśli. To kierunek projektu, nie obietnica gotowej funkcji ani naukowo dowiedziona przewaga nad innymi metodami.

Przykład: „Pójdę tam spróbować kawy, ale tylko jeśli opinie będą dobre”. System nie powinien zastępować tego zdaniem „Kawa jest dobra”. Pokazuje pełny sens oraz prostszy wariant dla aktualnego poziomu, jasno oznaczając, co uprościł. Uczeń decyduje, czego chce się nauczyć. Złożone zdanie można rozłożyć na krótsze części i ponownie złożyć.

## Co adaptujemy z Mandarin The Wild

Przegląd z 8 listopada obejmował publiczne strony i wybrane interakcje bez logowania. Testowano nawigację, ustawienia czytania, przełączanie przykładów i stan kontrolek odtwarzania. Nie przetestowano jakości nagranego głosu, wiarygodności ocen, zalogowanych powtórek, fizycznego iPada ani dostępu w Chinach.

- **Słowo w kontekście:** karta otwierana bez opuszczania tekstu; znaczenie w zdaniu, Pinyin, audio i powiązane przykłady. Link z karty słowa prowadzi do konkretnego podświetlonego wystąpienia w opowiadaniu. W COS łączymy słowo z własną lekcją, dialogiem i esejem ucznia.
- **Wklej tekst i słuchaj:** publiczny moduł TTS przyjął własny tekst. Po Play wykres wysokości głosu zmieniał się przy kolejnych zdaniach; po odtworzeniu dostępne było pobranie MP3. Mikrofon był wyłączony. To obserwacja wizualizacji głosu syntezy, nie dowód obliczania F0 na żywo zamiast danych przygotowanych wcześniej.
- **Wymowa:** odrębne narzędzia do tonów, shadowingu i rozpoznawania wypowiedzi. Widoczne są wykresy wysokości głosu, sylaby, wolne tempo i podświetlanie. MTW deklaruje lokalne porównywanie przebiegu tonu, ale dokładność oceny nie została sprawdzona. Rozpoznanie tekstu nie oznacza poprawności tonu.
- **Czytanie:** Pinyin blisko Hanzi, rozmiar tekstu, odstępy, szerokość wiersza, opcjonalne kolory tonów, Paper/Night/System. Zmiana na Night została sprawdzona. W COS zachowujemy własną identyfikację wizualną; kolor uzupełnia oznaczenie tonu, nie zastępuje go.
- **Powrót do nauki:** słowo zachowuje zdanie źródłowe i trafia do powtórek. MTW dokumentuje SRS, więc nie należy mieszać go z prostą aplikacją HSK Words z wcześniejszych screenów.
- **Granica:** MTW ma szeroki katalog i funkcje konwersacyjne, ale nie potwierdzono, że realizuje dokładnie proponowany przez Roberta przepływ własna myśl → spersonalizowane ćwiczenie. Nie przedstawiamy braku takiej funkcji jako faktu bez pełnego testu.

Nie kopiujemy ilustracji, marki, tekstów, nagrań ani całej bazy MTW bez odpowiedniej licencji. Inspiracja interakcją nie jest licencją na zasoby.

## Autor i możliwość współpracy

Strona About podaje, że serwis stworzył nauczyciel mandaryńskiego, a operatorem jest Mandarin The Wild, LLC, mała niezależna firma w USA. W sprawdzonym opisie nie podano nazwiska. Kontakt publiczny: support@mandarinthewild.com. To potencjalny partner w zakresie komplementarnych scen przestrzennych i osobistego nauczyciela, nie potwierdzona współpraca. Żadnej wiadomości nie wysłano.

Publiczna organizacja GitHub ma repozytorium learn-chinese-free z listą zasobów oznaczoną CC0. Nie jest to kod aplikacji ani silnika wymowy. W sprawdzonych miejscach nie znaleziono publicznego kodu aplikacji; nie dowodzi to, że nie istnieje gdzie indziej. Stopka copyright i regulamin nie dają ogólnego prawa kopiowania serwisu.

Źródła: https://mandarinthewild.com/about • https://mandarinthewild.com/terms • https://github.com/Mandarin-The-Wild • https://github.com/Mandarin-The-Wild/learn-chinese-free

## Architektura własna myśl do ćwiczenia

1. **Wejście:** tekst albo nagranie za zgodą ucznia. Transkrypcja jest widoczna i edytowalna przed dalszą pracą. Zachowujemy język, intencję, kontekst oraz wybrane ograniczenie poziomu. Nie wysyłamy całej historii ani sekretów.
2. **Warstwa pedagogiczna:** model proponuje naturalny wariant, prostszy wariant i krótkie wyjaśnienie różnic. Oznacza nowe słowa i nieudowodnione odczytania. Trudne zdanie dzieli na części, lecz nie zmienia sensu po cichu.
3. **Walidowany wynik:** struktura danych zawiera Hanzi, segmenty słów, Pinyin, znaczenie, odczyt słownikowy i wymowę w kontekście, poziom, pochodzenie oraz identyfikatory treści. Aplikacja waliduje dane. Model nie zwraca wykonywalnego kodu ani dowolnych poleceń do interfejsu.
4. **Audio i wizualizacja:** właściwe nagranie dla dokładnie tej wersji zdania; powtórka, wolniejsze tempo i dopasowanie sylab. Krzywa F0 obrazuje wysokość głosu, nie pełną jakość wymowy. Należy uwzględnić ciszę, bezdźwięczne głoski, szum, zakres głosu i rzeczywiste sandhi. Nie rysujemy wymyślonego wykresu jako pomiaru nagrania.
5. **Ćwiczenie:** odsłuch → powtórzenie → własne nagranie i porównanie → odtworzenie sensu bez podpowiedzi. Oddzielamy rozpoznany tekst, podobieństwo kształtu tonu i ocenę wymowy. Automatyczny wynik procentowy dopiero po walidacji z rzeczywistymi nagraniami.
6. **Pamięć i sceny:** za zgodą ucznia zapisujemy zdanie z intencją i źródłem w istniejących strukturach COS. Powtórki nie powstają w drugim katalogu. Scena kuchni lub drogi do sklepu wynika z tej samej treści semantycznej, dzięki czemu interakcja i zdanie nie rozjeżdżają się.

Integracja rozwija istniejące dokumenty ASSISTANT_ARCHITECTURE.md i ASSISTANT_NEXT_STEP.md: wspólny panel, wersjonowany kontekst, rejestr dozwolonych komponentów, zachowanie miejsca w lekcji i limit kosztów. Te dokumenty zawierają historyczne propozycje, nie stan wdrożenia każdej funkcji. Inspekcja aktualnego źródła Sites v105 potwierdziła istniejący pronunciation-lab; należy go rozszerzać, nie tworzyć konkurencyjny moduł.

## Klocki i licencje

| Komponent | Rola | Licencja i ograniczenie |
|---|---|---|
| pinyin-pro | Segmentacja i Pinyin, poprawki odczytań | MIT; automatyczne odczytania wymagają walidacji w kontekście |
| CC-CEDICT | Słownik chińsko-angielski | CC BY-SA 4.0; autorstwo, oznaczenie zmian i warunki adaptacji danych |
| Hanzi Writer | Animacja i ćwiczenie kresek | Kod MIT; dane znaków osobno Arphic Public License |
| ts-fsrs | Harmonogram powtórek | MIT; sprawdzić zgodność wersji z runtime; nie zmieniać istniejącego SRS bez planu migracji |
| Wenbun | Przykład aplikacji pisania i FSRS | Apache-2.0 dla własnego kodu; audyt zależności i danych osobno |
| Zhongwen | Wzorzec kontekstowego słownika | GPL-2.0; bezpośrednie włączanie kodu wymaga zgodności, niezależna implementacja UX prostsza |
| Syng | Słownik, czytnik i fiszki | GPL-3.0 z wyjątkiem sklepowym; przeanalizować dystrybucję |
| Audio-cmn | Kandydat nagrań słów i sylab | Deklarowane CC BY-SA; pochodzenie i wersja licencji poszczególnych zestawów do sprawdzenia |

Kandydaci TTS do osobnego testu: Qwen3-TTS i CosyVoice deklarują Apache-2.0; MeloTTS ma kod i sprawdzone chińskie wagi MIT. Domyślne wagi F5-TTS mają ograniczenie niekomercyjne, mimo innej licencji kodu. Dobór konkretnego checkpointu, zasobów CPU/GPU, jakości mandaryńskiego i praw do głosu wymaga weryfikacji przed wdrożeniem. Nie wykonano benchmarku ani porównania nagrań. Istniejąca integracja Qwen w COS nie oznacza automatycznie gotowego endpointu dla dowolnego tekstu.

Źródła TTS: https://github.com/QwenLM/Qwen3-TTS • https://github.com/QwenAudio/CosyVoice • https://github.com/myshell-ai/MeloTTS • https://huggingface.co/myshell-ai/MeloTTS-Chinese • https://github.com/SWivid/F5-TTS

Priorytet: istniejące komponenty COS, następnie małe sprawdzone biblioteki. Nie fork całej konkurencyjnej aplikacji. Licencję kodu, słownika, kresek, audio, fontów i ilustracji zapisujemy oddzielnie. Żadna pozycja tabeli nie jest wynikiem testu wdrożeniowego.

Źródła kodu i licencji: https://github.com/zh-lx/pinyin-pro • https://www.mdbg.net/chinese/dictionary?page=cc-cedict • https://hanziwriter.org/license.html • https://github.com/open-spaced-repetition/ts-fsrs • https://github.com/ray-pH/wenbun • https://github.com/cschiller/zhongwen • https://github.com/sotch-pr35mac/syng • https://github.com/hugolpz/audio-cmn

## Kolejność wdrażania

**Etap 1: domknięcie istniejącej nauki.** Spójny dark mode, karta słowa w kontekście, dokładne przykłady z własnych lekcji, poprawny powrót do miejsca i odsłuch normalny/wolny. Zachować trzy etapy odkrywania odpowiedzi, postęp i SRS. Osobno dokończyć wklejanie tekstu do odsłuchu jako prosty wariant wejścia.

**Etap 2: własna myśl jako wejście.** Tekst i edytowalna transkrypcja, tłumaczenie z zachowaniem intencji, prostszy wariant, Hanzi/Pinyin/audio oraz zapis wybranego zdania. Najpierw ograniczony zestaw języków i testowanych konstrukcji. Nie obiecywać wszystkich języków ani nieograniczonej rozmowy.

**Etap 3: shadowing i tony.** Odsłuch i własne nagranie, prawdziwe krzywe referencji i głosu ucznia. Ocena automatyczna pozostaje eksperymentem do czasu badania; ASR może służyć orientacji, nie certyfikowaniu tonów.

**Etap 4: pamięć sytuacyjna.** Intencja → dialog → scena przestrzenna → samodzielna wypowiedź → powtórka. Mierzymy, czy uczeń przywołuje zdanie później bez podpowiedzi. To hipoteza uczenia do sprawdzenia, nie gwarancja szybszego opanowania języka.

## Bramy jakości i decyzje otwarte

- Test sensu: „spróbuję, czy dobra”, „tylko jeśli dobre opinie” i „kawa jest dobra” nie mogą stać się tym samym zdaniem.
- Test poziomu: nowe słowa i gramatyka jawne; wariant zgodny z lekcjami 1–4 nie udaje, że zawiera wyłącznie znane elementy, gdy brakuje danych.
- Test wymowy: wieloznaczne znaki, erhua, ton neutralny, 一/不 i trzeci ton; referencja odpowiada dokładnemu tekstowi.
- Test techniczny: telefon/iPad, blokada mikrofonu, przerwanie, ponowne nagranie, szum, brak audio, utrata sieci, koszt i limity, brak przecieku nagrania do niezatwierdzonego dostawcy.
- Test pamięci: zachowanie danych, miejsc i SRS po zmianie trybu, konta i odświeżeniu. Odsłuch nie oznacza opanowania.
- Decyzje: dostawca i budżet audio/modelu; lokalne versus serwerowe przetwarzanie głosu; walidacja pedagogiczna; licencje zasobów; ewentualny kontakt z MTW po osobnym zatwierdzeniu wiadomości.

## Źródła audytu MTW

https://mandarinthewild.com/words/一会儿
https://mandarinthewild.com/chinese-text-to-speech
https://mandarinthewild.com/tone-practice
https://mandarinthewild.com/chinese-shadowing
https://mandarinthewild.com/chinese-pronunciation-checker
https://mandarinthewild.com/library/read/colors-in-chinese#library-word-70-73
https://mandarinthewild.com/help
https://mandarinthewild.com/privacy
https://mandarinthewild.com/teachers

Rejestr badania: obserwacje interfejsu oddzielono od deklaracji serwisu. Brak logowania lub testu mikrofonu nie stanowi dowodu braku funkcji. Ceny, kompatybilność i licencje należy ponownie sprawdzić przed wdrożeniem.
