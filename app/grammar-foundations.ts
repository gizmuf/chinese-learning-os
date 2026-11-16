type Copy = Record<'en' | 'fr' | 'ru' | 'tr', string>;

export type GrammarExercise = {
  id: string;
  prompt: Copy;
  sentence: string;
  options: string[];
  answer: number;
  explanation: Copy;
};

export type GrammarCard = {
  id: string;
  pattern: string;
  explanation: Copy;
  example: {hanzi: string; pinyin: string; meaning: Copy};
  exercises: GrammarExercise[];
};

export type GrammarUnit = {id: string; title: Copy; cards: GrammarCard[]};

const text = (en: string, fr: string, ru: string, tr: string): Copy => ({en, fr, ru, tr});
const prompt = text('Complete the sentence.', 'Complétez la phrase.', 'Дополните предложение.', 'Cümleyi tamamlayın.');

function card(
  id: string, pattern: string, rule: Copy, hanzi: string, pinyin: string, meaning: Copy,
  sentence: string, options: string[], answer: number, feedback: Copy,
): GrammarCard {
  return {id, pattern, explanation: rule, example: {hanzi, pinyin, meaning},
    exercises: [{id: id + '-1', prompt, sentence, options, answer, explanation: feedback}]};
}

export const grammarFoundations: Record<1 | 2, GrammarUnit[]> = {
  1: [
    {
      id: 'grammar-1-statements',
      title: text('Make a statement', 'Faire une affirmation', 'Строим утверждения', 'Bir ifade kurun'),
      cards: [
        card('grammar-1-shi', 'A + 是 + noun',
          text('Use 是 to identify or classify someone or something.', 'Utilisez 是 pour identifier ou classer une personne ou une chose.', '是 связывает подлежащее с названием или категорией.', 'Bir kişiyi veya şeyi tanımlamak ya da sınıflandırmak için 是 kullanın.'),
          '她是老师。', 'Tā shì lǎoshī.', text('She is a teacher.', 'Elle est enseignante.', 'Она учительница.', 'O öğretmen.'),
          '我___学生。', ['有', '是', '在'], 1,
          text('是 connects 我 with the category 学生.', '是 relie 我 à la catégorie 学生.', '是 связывает 我 с категорией 学生.', '是, 我 ile 学生 kategorisini bağlar.')),
        card('grammar-1-you', 'A + 有 + noun',
          text('Put 有 before the person or thing someone has.', 'Placez 有 avant la personne ou la chose que l’on a.', 'После 有 называют того или то, что у кого-то есть.', '有, sahip olunan kişi veya şeyden önce gelir.'),
          '我有一个姐姐。', 'Wǒ yǒu yí ge jiějie.', text('I have an older sister.', 'J’ai une grande sœur.', 'У меня есть старшая сестра.', 'Bir ablam var.'),
          '他___两本书。', ['是', '有', '吗'], 1,
          text('有 expresses possession of the two books.', '有 indique que les deux livres lui appartiennent.', '有 показывает, что у него есть две книги.', '有, iki kitaba sahip olduğunu belirtir.')),
      ],
    },
    {
      id: 'grammar-1-questions-negation',
      title: text('Ask and negate', 'Poser une question et nier', 'Задаём вопросы и отрицаем', 'Soru sorun ve olumsuz yapın'),
      cards: [
        card('grammar-1-ma', 'statement + 吗？',
          text('Add 吗 at the end of a statement to ask a yes–no question.', 'Ajoutez 吗 à une affirmation pour poser une question fermée.', 'Добавьте 吗 в конце утверждения, чтобы задать общий вопрос.', 'Evet-hayır sorusu sormak için ifadenin sonuna 吗 ekleyin.'),
          '你是老师吗？', 'Nǐ shì lǎoshī ma?', text('Are you a teacher?', 'Êtes-vous enseignant ?', 'Вы учитель?', 'Öğretmen misiniz?'),
          '你是学生___？', ['在', '吗', '过'], 1,
          text('吗 leaves the original word order in place.', '吗 conserve l’ordre initial des mots.', '吗 сохраняет исходный порядок слов.', '吗, ilk kelime sırasını korur.')),
        card('grammar-1-negation', '不 + verb · 没有 + noun',
          text('Use 不 before actions such as 喝 to express a habit or a choice. Use 没有 to negate possession.', 'Devant une action comme 喝, 不 exprime une habitude ou un choix. Utilisez 没有 pour nier la possession.', '不 перед глаголом вроде 喝 выражает привычку или выбор. Для отрицания наличия используйте 没有.', 'Alışkanlık veya seçim belirtmek için 喝 gibi fiillerden önce 不 kullanın. Sahip olmamayı 没有 ile belirtin.'),
          '我不喝咖啡。', 'Wǒ bù hē kāfēi.', text('I don’t drink coffee.', 'Je ne bois pas de café.', 'Я не пью кофе.', 'Kahve içmem.'),
          '我___车。', ['不有', '不在', '没有'], 2,
          text('没有 means “do not have” here.', 'Ici, 没有 signifie « ne pas avoir ».', 'Здесь 没有 означает «не иметь».', 'Burada 没有, sahip olmamak anlamına gelir.')),
      ],
    },
    {
      id: 'grammar-1-quantity-action',
      title: text('Count and describe actions', 'Compter et décrire des actions', 'Считаем и описываем действия', 'Sayın ve eylemleri anlatın'),
      cards: [
        card('grammar-1-classifiers', 'number + classifier + noun',
          text('Put a classifier between a number and the noun. Use 本 for books.', 'Placez un classificateur entre le nombre et le nom. Pour les livres, utilisez 本.', 'Между числом и существительным ставится счётное слово. Для книг это 本.', 'Sayı ile isim arasına bir sınıflandırıcı koyun. Kitaplar için 本 kullanın.'),
          '我买了两本书。', 'Wǒ mǎi le liǎng běn shū.', text('I bought two books.', 'J’ai acheté deux livres.', 'Я купил две книги.', 'İki kitap aldım.'),
          '我喝了一___茶。', ['本', '杯', '家'], 1,
          text('杯 counts cups of a drink.', '杯 sert à compter les tasses de boisson.', '杯 считает чашки напитка.', '杯, içeceğin fincan sayısını belirtir.')),
        card('grammar-1-progressive', '正在 + verb',
          text('Place 正在 before the verb to say that an action is in progress.', 'Placez 正在 devant le verbe pour indiquer une action en cours.', '正在 перед глаголом показывает, что действие идёт сейчас.', 'Bir eylemin sürmekte olduğunu belirtmek için fiilden önce 正在 kullanın.'),
          '她正在看书。', 'Tā zhèngzài kàn shū.', text('She is reading right now.', 'Elle est en train de lire.', 'Она сейчас читает.', 'Şu anda kitap okuyor.'),
          '他___吃饭呢。', ['吗', '过', '正在'], 2,
          text('正在 before 吃饭 marks the action in progress.', '正在 devant 吃饭 marque l’action en cours.', '正在 перед 吃饭 отмечает действие в процессе.', '吃饭 önündeki 正在, eylemin sürdüğünü belirtir.')),
      ],
    },
  ],
  2: [
    {
      id: 'grammar-2-compare-choose',
      title: text('Compare and offer choices', 'Comparer et proposer un choix', 'Сравниваем и предлагаем выбор', 'Karşılaştırın ve seçenek sunun'),
      cards: [
        card('grammar-2-bi', 'A + 比 + B + adjective',
          text('Put the comparison reference after 比 and the quality at the end.', 'Placez le point de comparaison après 比 et la qualité en dernier.', 'После 比 ставится объект сравнения, а признак — в конце.', '比 sonrasında karşılaştırılan ögeyi, sonda ise niteliği belirtin.'),
          '今天比昨天冷。', 'Jīntiān bǐ zuótiān lěng.', text('Today is colder than yesterday.', 'Il fait plus froid aujourd’hui qu’hier.', 'Сегодня холоднее, чем вчера.', 'Bugün dünden daha soğuk.'),
          '哥哥___我高。', ['过', '比', '着'], 1,
          text('比 introduces 我 as the reference for 高.', '比 introduit 我 comme point de comparaison pour 高.', '比 вводит 我 как объект сравнения по росту.', '比, 高 için karşılaştırma ögesi olarak 我 sözcüğünü getirir.')),
        card('grammar-2-haishi', 'A + 还是 + B？',
          text('Use 还是 between two options in a question that asks someone to choose.', 'Utilisez 还是 entre deux options dans une question qui demande de choisir.', '还是 ставится между вариантами в вопросе с выбором.', 'Seçim isteyen bir soruda iki seçenek arasına 还是 koyun.'),
          '你喝茶还是喝咖啡？', 'Nǐ hē chá háishi hē kāfēi?', text('Will you have tea or coffee?', 'Prendrez-vous du thé ou du café ?', 'Вы будете чай или кофе?', 'Çay mı kahve mi içersiniz?'),
          '你今天去___明天去？', ['因为', '所以', '还是'], 2,
          text('还是 links the two choices in the question.', '还是 relie les deux choix dans la question.', '还是 связывает два варианта в вопросе.', '还是, sorudaki iki seçeneği bağlar.')),
      ],
    },
    {
      id: 'grammar-2-aspect',
      title: text('Talk about experience and states', 'Parler d’expériences et d’états', 'Говорим об опыте и состоянии', 'Deneyim ve durumlardan söz edin'),
      cards: [
        card('grammar-2-guo', 'verb + 过',
          text('Add 过 after a verb to say that someone has had an experience before.', 'Ajoutez 过 après le verbe pour parler d’une expérience passée.', '过 после глагола обозначает опыт, который у человека уже был.', 'Daha önce yaşanmış bir deneyim için fiilden sonra 过 ekleyin.'),
          '我去过北京。', 'Wǒ qùguo Běijīng.', text('I have been to Beijing.', 'Je suis déjà allé à Pékin.', 'Я бывал в Пекине.', 'Pekin’e daha önce gittim.'),
          '你以前去___北京吗？', ['过', '正在', '比'], 0,
          text('过 after 去 asks about previous experience.', '过 après 去 porte sur une expérience passée.', '过 после 去 позволяет спросить о прошлом опыте.', '去 sonrasındaki 过, geçmiş deneyimi sorar.')),
        card('grammar-2-zhe', 'verb + 着',
          text('Put 着 after a verb to describe a state that continues.', 'Placez 着 après le verbe pour décrire un état qui se prolonge.', '着 после глагола обозначает продолжающееся состояние.', 'Süren bir durumu anlatmak için fiilden sonra 着 kullanın.'),
          '门开着。', 'Mén kāizhe.', text('The door is open.', 'La porte est ouverte.', 'Дверь открыта.', 'Kapı açık.'),
          '门还开___，请关上。', ['正在', '比', '着'], 2,
          text('开着 describes the door remaining open.', '开着 décrit la porte qui reste ouverte.', '开着 описывает дверь, которая остаётся открытой.', '开着, kapının açık kalmış olduğunu anlatır.')),
      ],
    },
    {
      id: 'grammar-2-connect',
      title: text('Connect reasons and events', 'Relier les raisons et les événements', 'Связываем причины и события', 'Nedenleri ve olayları bağlayın'),
      cards: [
        card('grammar-2-cause', '因为……，所以……',
          text('Put the reason after 因为 and the result after 所以.', 'Placez la cause après 因为 et le résultat après 所以.', 'Причина следует за 因为, результат — за 所以.', 'Neden 因为, sonuç ise 所以 sonrasında gelir.'),
          '因为下雨，所以我没出去。', 'Yīnwèi xiàyǔ, suǒyǐ wǒ méi chūqù.', text('Because it was raining, I didn’t go out.', 'Comme il pleuvait, je ne suis pas sorti.', 'Я не вышел, потому что шёл дождь.', 'Yağmur yağdığı için dışarı çıkmadım.'),
          '因为我很累，___我想回家。', ['还是', '所以', '因为'], 1,
          text('所以 introduces the result of being tired.', '所以 introduit la conséquence de la fatigue.', '所以 вводит следствие усталости.', '所以, yorgun olmanın sonucunu getirir.')),
        card('grammar-2-as-soon-as', '一……就……',
          text('Put 一 before what happens first and 就 before what follows immediately.', 'Placez 一 devant le premier événement et 就 devant ce qui suit immédiatement.', '一 ставится перед первым событием, 就 — перед тем, что случается сразу после него.', 'İlk olaydan önce 一, hemen ardından olan olaydan önce 就 kullanın.'),
          '我一到家就给你打电话。', 'Wǒ yí dào jiā jiù gěi nǐ dǎ diànhuà.', text('As soon as I get home, I’ll call you.', 'Je t’appellerai dès que je serai chez moi.', 'Как только я приду домой, я позвоню тебе.', 'Eve varır varmaz seni arayacağım.'),
          '他一到学校___给我打电话。', ['吗', '还是', '就'], 2,
          text('就 introduces the action that follows the arrival immediately.', '就 introduit l’action qui suit immédiatement l’arrivée.', '就 вводит действие, которое происходит сразу после прибытия.', '就, varışın hemen ardından olan eylemi getirir.')),
      ],
    },
  ],
};
