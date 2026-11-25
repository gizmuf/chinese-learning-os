# Tutor w Reading Lab

## DeepSeek

Contabo obsługuje `GET` i `POST /api/reading-tutor` dla obu publicznych adresów. Usługa współdzieli aktywną bazę `DB`, klucz `DEEPSEEK_SENTENCE_CHECK_API_KEY` i limit `DEEPSEEK_SENTENCE_CHECK_DAILY_LIMIT` z korektorem zdań. Jedna operacja SQL rezerwuje próbę w tej samej dziennej i minutowej puli UTC przed wywołaniem DeepSeek. Nieudana próba także zajmuje miejsce w puli.

Na Contabo zachowaj `DEEPSEEK_SENTENCE_CHECK_ORIGIN=https://chineseos.l00p.network`. Drugi adres włącz w usłudze przez `DEEPSEEK_READING_TUTOR_ADDITIONAL_ORIGIN=https://cos.l00p.network`. Na statycznym Alibaba udostępnij przez HTTPS dokładną ścieżkę `/api/reading-tutor` do Contabo. Przy `GET` ustaw publiczny `Origin` Alibaba. Przy `POST` zaakceptuj i przekaż wyłącznie ten sam `Origin`. Wyłącz przekazywanie ciasteczek, cache i przekierowania tej ścieżki. [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)

Odczyt `GET /api/reading-tutor` na obu adresach pozwala zweryfikować dostępność bez wywoływania modelu. W odbiorze przetestuj wysłanie pytania i dopytanie do tego samego zdania. Dopytanie przesyła wybranemu dostawcy przypięte zdanie i do trzech wcześniejszych tur. Aplikacja przechowuje rozmowę w stanie otwartego panelu.

## Plan ChatGPT

Dostęp wymaga oddzielnego potwierdzenia uprawnień do użycia planu przez OpenAI i zarejestrowania dokładnego callbacku `https://chineseos.l00p.network/api/reading-tutor/plan/callback`. Dokumentacja logowania na stronie opisuje klienta do weryfikacji tożsamości. Parametry dostępu do planu trzeba potwierdzić dla przyznanego klienta przed aktywacją. [Logowanie na stronie](https://developers.openai.com/siwc/website) · [Zapytania rozliczane w planie](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)

Po potwierdzeniu zastosuj `scripts/reading-tutor-plan.sql` w aktywnej bazie `DB` na Contabo. Skonfiguruj w usłudze `COS_CHATGPT_CLIENT_ID`, `COS_CHATGPT_REDIRECT_URI` i zatwierdzone `COS_CHATGPT_TOKEN_AUTH_METHOD` (`none` albo `client_secret_basic`). Dla `client_secret_basic` dodaj `COS_CHATGPT_CLIENT_SECRET` z menedżera sekretów. W tym samym miejscu ustaw `COS_CHATGPT_SESSION_KEY` jako 32 losowe bajty kodowane w base64url bez dopełnienia. Zmiana klucza unieważnia dotychczasowe sesje. Brak wymaganej konfiguracji lub tabel wyłącza opcję ChatGPT.

Połącz konto testowe i sprawdź, czy wracasz do tego samego zdania i możesz dopytać. Sprawdź odmowę zgody, wygaśnięcie sesji i rozłączenie. Baza przechowuje skróty jednorazowych transakcji oraz zaszyfrowane, krótkotrwałe uprawnienia. Wygasłe uprawnienia są odrzucane i usuwane przy kolejnym udanym logowaniu. Po wygaśnięciu użytkownik ponownie łączy konto. Klucze, kody callbacku i ciasteczka pozostają poza logami oraz raportami odbioru.
