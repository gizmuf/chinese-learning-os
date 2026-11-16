import {practicalZuoGongExercises} from './practical-family-exercise-zuo-gong-data';
import {practicalTouDianExercises} from './practical-family-exercise-tou-dian-data';

type ExerciseCopy = Readonly<Record<'en' | 'fr' | 'ru' | 'tr', string>>;

export type PracticalFamilyExerciseQuestion = {
  id: string;
  before: string;
  after: string;
  answer: string;
  pinyin: string;
  meaning: ExerciseCopy;
  explanation: ExerciseCopy;
};

export type PracticalFamilyExercise = {
  options: readonly string[];
  questions: readonly PracticalFamilyExerciseQuestion[];
};

export const practicalFamilyExercises = {
  '木 · 本 · 末 · 未': {
    options: ['木', '本', '末', '未'],
    questions: [
      {
        id: 'book-classifier',
        before: '我买了一',
        after: '书。',
        answer: '本',
        pinyin: 'Wǒ mǎi le yì běn shū.',
        meaning: {
          en: 'I bought a book.',
          fr: 'J’ai acheté un livre.',
          ru: 'Я купил книгу.',
          tr: 'Bir kitap aldım.',
        },
        explanation: {
          en: '本 is the measure word for books. In 一本书, it goes between 一 (one) and 书 (book).',
          fr: '本 est le classificateur des livres. Dans 一本书, il se place entre 一 (un) et 书 (livre).',
          ru: '本 — счётное слово для книг. В 一本书 оно стоит между 一 (один) и 书 (книга).',
          tr: '本 kitaplar için kullanılan sayma sözcüğüdür. 一本书 ifadesinde 一 (bir) ile 书 (kitap) arasına gelir.',
        },
      },
      {
        id: 'wooden-table',
        before: '这张桌子是',
        after: '头做的。',
        answer: '木',
        pinyin: 'Zhè zhāng zhuōzi shì mùtou zuò de.',
        meaning: {
          en: 'This table is made of wood.',
          fr: 'Cette table est en bois.',
          ru: 'Этот стол сделан из дерева.',
          tr: 'Bu masa ahşaptan yapılmış.',
        },
        explanation: {
          en: '木 is the first character in 木头 (wood). Here, 木头 names the material the table is made of.',
          fr: '木 est le premier caractère de 木头 (bois). Ici, 木头 désigne la matière de la table.',
          ru: '木 — первый иероглиф в слове 木头 (древесина). Здесь 木头 обозначает материал стола.',
          tr: '木, 木头 (ahşap) sözcüğünün ilk karakteridir. Burada 木头 masanın malzemesini belirtir.',
        },
      },
      {
        id: 'future-plans',
        before: '我想为',
        after: '来做准备。',
        answer: '未',
        pinyin: 'Wǒ xiǎng wèi wèilái zuò zhǔnbèi.',
        meaning: {
          en: 'I want to prepare for the future.',
          fr: 'Je veux me préparer pour l’avenir.',
          ru: 'Я хочу подготовиться к будущему.',
          tr: 'Geleceğe hazırlanmak istiyorum.',
        },
        explanation: {
          en: '未 (not yet) starts 未来 (the future). Think of the time that has yet to come.',
          fr: '未 (pas encore) commence le mot 未来 (l’avenir). Pense au temps qui reste à venir.',
          ru: 'С 未 (ещё не) начинается слово 未来 (будущее). Это время, которое ещё не наступило.',
          tr: '未 (henüz değil), 未来 (gelecek) sözcüğünün başında yer alır. Henüz gelmemiş zamanı düşün.',
        },
      },
      {
        id: 'weekend',
        before: '我们周',
        after: '不用上班。',
        answer: '末',
        pinyin: 'Wǒmen zhōumò bú yòng shàngbān.',
        meaning: {
          en: 'We don’t have to work on the weekend.',
          fr: 'Nous n’avons pas besoin de travailler le week-end.',
          ru: 'По выходным нам не надо работать.',
          tr: 'Hafta sonu işe gitmemiz gerekmiyor.',
        },
        explanation: {
          en: '末 means “end” in 周末 (weekend). 周 is the week, and 末 is its end.',
          fr: '末 signifie « fin » dans 周末 (week-end). 周 désigne la semaine et 末 sa fin.',
          ru: 'В слове 周末 (выходные) 末 означает «конец», а 周 — «неделя».',
          tr: '周末 (hafta sonu) sözcüğünde 周 “hafta”, 末 ise “son” demektir.',
        },
      },
    ],
  },
  '再 · 在': {
    options: ['再', '在'],
    questions: [
      {
        id: 'live-in-suzhou',
        before: '我住',
        after: '苏州。',
        answer: '在',
        pinyin: 'Wǒ zhù zài Sūzhōu.',
        meaning: {
          en: 'I live in Suzhou.',
          fr: 'J’habite à Suzhou.',
          ru: 'Я живу в Сучжоу.',
          tr: 'Suzhou’da yaşıyorum.',
        },
        explanation: {
          en: '在 introduces the place where you live. In 住在苏州, the name of the city follows 在.',
          fr: '在 introduit le lieu où l’on habite. Dans 住在苏州, le nom de la ville suit 在.',
          ru: '在 указывает место жительства. В 住在苏州 после 在 идёт название города.',
          tr: '在 yaşadığın yeri belirtir. 住在苏州 ifadesinde şehir adı 在 karakterinden sonra gelir.',
        },
      },
      {
        id: 'review-then-homework',
        before: '先复习，',
        after: '做作业。',
        answer: '再',
        pinyin: 'Xiān fùxí, zài zuò zuòyè.',
        meaning: {
          en: 'Review first, then do your homework.',
          fr: 'Révise d’abord, puis fais tes devoirs.',
          ru: 'Сначала повтори материал, потом сделай домашнее задание.',
          tr: 'Önce konuyu tekrar et, sonra ödevini yap.',
        },
        explanation: {
          en: 'In 先…再…, 先 marks the first action and 再 introduces what you do next.',
          fr: 'Dans 先…再…, 先 marque la première action et 再 introduit celle qui vient ensuite.',
          ru: 'В конструкции 先…再… 先 обозначает первое действие, а 再 вводит следующее.',
          tr: '先…再… kalıbında 先 ilk eylemi, 再 ise ardından gelen eylemi belirtir.',
        },
      },
      {
        id: 'homework-in-progress',
        before: '她正',
        after: '做作业。',
        answer: '在',
        pinyin: 'Tā zhèngzài zuò zuòyè.',
        meaning: {
          en: 'She’s doing her homework right now.',
          fr: 'Elle est en train de faire ses devoirs.',
          ru: 'Она сейчас делает домашнее задание.',
          tr: 'Şu anda ödevini yapıyor.',
        },
        explanation: {
          en: '正在 goes before a verb to show that the action is already in progress.',
          fr: '正在 se place avant le verbe pour indiquer que l’action est en cours.',
          ru: '正在 ставится перед глаголом и показывает, что действие уже идёт.',
          tr: '正在 fiilden önce gelir ve eylemin şu anda sürdüğünü gösterir.',
        },
      },
      {
        id: 'say-it-again',
        before: '我没听清，请',
        after: '说一遍。',
        answer: '再',
        pinyin: 'Wǒ méi tīngqīng, qǐng zài shuō yí biàn.',
        meaning: {
          en: 'I didn’t catch that. Please say it again.',
          fr: 'Je n’ai pas bien entendu. Répète, s’il te plaît.',
          ru: 'Я не расслышал. Повтори, пожалуйста.',
          tr: 'Tam duyamadım. Lütfen bir daha söyle.',
        },
        explanation: {
          en: '再 asks for a repeat here. 再说一遍 means to say the whole thing one more time.',
          fr: 'Ici, 再 sert à demander une répétition. 再说一遍 signifie « redire le tout une fois ».',
          ru: 'Здесь 再 обозначает повтор. 再说一遍 значит «сказать всё ещё раз».',
          tr: 'Burada 再 bir tekrar isteğini belirtir. 再说一遍, söylenenin tamamını bir kez daha söylemek demektir.',
        },
      },
    ],
  },
  ...practicalZuoGongExercises,
  ...practicalTouDianExercises,
} satisfies Record<string, PracticalFamilyExercise>;
