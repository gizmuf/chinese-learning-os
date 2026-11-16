import type { Locale } from './translate';

export const sentenceCheckCopy = {
  en: {
    ai: 'Check with DeepSeek', aiPending: 'Checking with DeepSeek…', aiResult: 'DeepSeek feedback',
    aiPrivacy: 'This option sends your sentence to DeepSeek. Leave out names and other personal details.',
    aiUnavailable: 'DeepSeek is unavailable. The local check is shown below.',

    title: 'Check my sentence', back: 'Back', intro: 'Check a Mandarin sentence for selected grammar patterns.',
    input: 'Your Mandarin sentence', submit: 'Check sentence',
    examples: 'Try an example', exampleNames: ['Comparing height', 'Going to school'],
    checked: 'Checked sentence', result: 'Result', correct: 'Correct', corrected: 'Correction needed',
    uncertain: 'Uncertain', correction: 'Minimal correction', explanation: 'Explanation', natural: 'Natural variant',
    listen: 'Listen', noAudio: 'Recording unavailable for this sentence.', playError: 'The recording could not play. Try again.',
    audioPrivacy: 'When you tap Listen, the selected Mandarin sentence may be sent to Microsoft to generate audio.',
    audioLoading: 'Loading audio…', audioLoadError: 'Could not load audio for this sentence. Try again.',
    audioReady: 'Audio is ready. Tap Listen again to play it.',
    invalid: 'Enter one short Mandarin sentence and try again.',
  },
  fr: {
    ai: 'Vérifier avec DeepSeek', aiPending: 'Vérification avec DeepSeek…', aiResult: 'Avis de DeepSeek',
    aiPrivacy: 'Cette option envoie votre phrase à DeepSeek. Évitez les noms et autres données personnelles.',
    aiUnavailable: 'DeepSeek est indisponible. Le résultat de la vérification locale est affiché ci-dessous.',

    title: 'Vérifier ma phrase', back: 'Retour', intro: 'Vérifiez certaines structures grammaticales dans une phrase en mandarin.',
    input: 'Votre phrase en mandarin', submit: 'Vérifier la phrase',
    examples: 'Essayer un exemple', exampleNames: ['Comparer des tailles', 'Aller à l’école'],
    checked: 'Phrase vérifiée', result: 'Résultat', correct: 'Correcte', corrected: 'À corriger',
    uncertain: 'Incertain', correction: 'Correction minimale', explanation: 'Explication', natural: 'Variante naturelle',
    listen: 'Écouter', noAudio: 'Aucun enregistrement pour cette phrase.', playError: 'Impossible de lire l’enregistrement. Réessayez.',
    audioPrivacy: 'Lorsque vous appuyez sur Écouter, la phrase en mandarin sélectionnée peut être envoyée à Microsoft pour générer l’audio.',
    audioLoading: 'Chargement de l’audio…', audioLoadError: 'Impossible de charger l’audio pour cette phrase. Réessayez.',
    audioReady: 'L’audio est prêt. Appuyez de nouveau sur Écouter pour le lire.',
    invalid: 'Saisissez une courte phrase en mandarin, puis réessayez.',
  },
  ru: {
    ai: 'Проверить с DeepSeek', aiPending: 'DeepSeek проверяет…', aiResult: 'Результат DeepSeek',
    aiPrivacy: 'Эта функция отправляет предложение в DeepSeek. Не указывайте имена и другие личные данные.',
    aiUnavailable: 'DeepSeek недоступен. Ниже показан результат локальной проверки.',

    title: 'Проверить моё предложение', back: 'Назад', intro: 'Проверьте, как употреблены отдельные грамматические конструкции в китайском предложении.',
    input: 'Ваше предложение на китайском', submit: 'Проверить предложение',
    examples: 'Попробуйте пример', exampleNames: ['Сравнить рост', 'Идти в школу'],
    checked: 'Проверенное предложение', result: 'Результат', correct: 'Правильно', corrected: 'Нужно исправить',
    uncertain: 'Неопределённо', correction: 'Минимальное исправление', explanation: 'Объяснение', natural: 'Естественный вариант',
    listen: 'Послушать', noAudio: 'Для этого предложения нет записи.', playError: 'Не удалось воспроизвести запись. Повторите попытку.',
    audioPrivacy: 'Когда вы нажимаете «Послушать», выбранное предложение на китайском может быть отправлено в Microsoft для озвучивания.',
    audioLoading: 'Загрузка аудио…', audioLoadError: 'Не удалось загрузить аудио для этого предложения. Повторите попытку.',
    audioReady: 'Аудио готово. Нажмите «Послушать» ещё раз, чтобы его воспроизвести.',
    invalid: 'Введите одно короткое предложение на китайском и повторите попытку.',
  },
  tr: {
    ai: 'DeepSeek ile kontrol et', aiPending: 'DeepSeek kontrol ediyor…', aiResult: 'DeepSeek değerlendirmesi',
    aiPrivacy: 'Bu seçenek cümleni DeepSeek’e gönderir. İsimleri ve diğer kişisel bilgileri yazma.',
    aiUnavailable: 'DeepSeek kullanılamıyor. Aşağıda yerel kontrol sonucu gösteriliyor.',

    title: 'Cümlemi kontrol et', back: 'Geri', intro: 'Mandarin Çincesi bir cümlede belirli dil bilgisi kalıplarını kontrol et.',
    input: 'Mandarin Çincesi cümlen', submit: 'Cümleyi kontrol et',
    examples: 'Bir örnek dene', exampleNames: ['Boy karşılaştırmak', 'Okula gitmek'],
    checked: 'Kontrol edilen cümle', result: 'Sonuç', correct: 'Doğru', corrected: 'Düzeltme gerekli',
    uncertain: 'Belirsiz', correction: 'Gerekli düzeltme', explanation: 'Açıklama', natural: 'Daha doğal ifade',
    listen: 'Dinle', noAudio: 'Bu cümle için ses kaydı yok.', playError: 'Ses kaydı oynatılamadı. Tekrar dene.',
    audioPrivacy: 'Dinle’ye dokunduğunda, seçtiğin Mandarin Çincesi cümle seslendirme için Microsoft’a gönderilebilir.',
    audioLoading: 'Ses yükleniyor…', audioLoadError: 'Bu cümle için ses yüklenemedi. Tekrar dene.',
    audioReady: 'Ses hazır. Oynatmak için tekrar Dinle’ye dokun.',
    invalid: 'Mandarin Çincesi kısa bir cümle girip tekrar dene.',
  },
} satisfies Record<Locale, Record<string, string | string[]>>;

export const sentenceCheckTitle = (locale: Locale) => sentenceCheckCopy[locale].title;
