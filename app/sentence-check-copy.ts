import type { Locale } from './translate';

export const sentenceCheckCopy = {
  en: {
    title: 'Check my sentence', back: 'Back', intro: 'Check a Mandarin sentence for selected grammar patterns.',
    input: 'Your Mandarin sentence', submit: 'Check sentence',
    examples: 'Try an example', exampleNames: ['Comparing height', 'Going to school'],
    checked: 'Checked sentence', result: 'Result', correct: 'Correct', corrected: 'Correction needed',
    uncertain: 'Uncertain', correction: 'Minimal correction', explanation: 'Explanation', natural: 'Natural variant',
    listen: 'Listen', noAudio: 'Mandarin playback is unavailable in this browser.',
    invalid: 'Enter one short Mandarin sentence and try again.',
  },
  fr: {
    title: 'Vérifier ma phrase', back: 'Retour', intro: 'Vérifiez certaines structures grammaticales dans une phrase en mandarin.',
    input: 'Votre phrase en mandarin', submit: 'Vérifier la phrase',
    examples: 'Essayer un exemple', exampleNames: ['Comparer des tailles', 'Aller à l’école'],
    checked: 'Phrase vérifiée', result: 'Résultat', correct: 'Correcte', corrected: 'À corriger',
    uncertain: 'Incertain', correction: 'Correction minimale', explanation: 'Explication', natural: 'Variante naturelle',
    listen: 'Écouter', noAudio: 'La lecture en mandarin est indisponible dans ce navigateur.',
    invalid: 'Saisissez une courte phrase en mandarin, puis réessayez.',
  },
  ru: {
    title: 'Проверить моё предложение', back: 'Назад', intro: 'Проверьте, как употреблены отдельные грамматические конструкции в китайском предложении.',
    input: 'Ваше предложение на китайском', submit: 'Проверить предложение',
    examples: 'Попробуйте пример', exampleNames: ['Сравнить рост', 'Идти в школу'],
    checked: 'Проверенное предложение', result: 'Результат', correct: 'Правильно', corrected: 'Нужно исправить',
    uncertain: 'Неопределённо', correction: 'Минимальное исправление', explanation: 'Объяснение', natural: 'Естественный вариант',
    listen: 'Послушать', noAudio: 'В этом браузере озвучивание на китайском недоступно.',
    invalid: 'Введите одно короткое предложение на китайском и повторите попытку.',
  },
  tr: {
    title: 'Cümlemi kontrol et', back: 'Geri', intro: 'Mandarin Çincesi bir cümlede belirli dil bilgisi kalıplarını kontrol et.',
    input: 'Mandarin Çincesi cümlen', submit: 'Cümleyi kontrol et',
    examples: 'Bir örnek dene', exampleNames: ['Boy karşılaştırmak', 'Okula gitmek'],
    checked: 'Kontrol edilen cümle', result: 'Sonuç', correct: 'Doğru', corrected: 'Düzeltme gerekli',
    uncertain: 'Belirsiz', correction: 'Gerekli düzeltme', explanation: 'Açıklama', natural: 'Daha doğal ifade',
    listen: 'Dinle', noAudio: 'Bu tarayıcıda Mandarin Çincesi seslendirme kullanılamıyor.',
    invalid: 'Mandarin Çincesi kısa bir cümle girip tekrar dene.',
  },
} satisfies Record<Locale, Record<string, string | string[]>>;

export const sentenceCheckTitle = (locale: Locale) => sentenceCheckCopy[locale].title;
