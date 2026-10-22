import {
  L,
  terms,
  sentences,
  timelines,
  type Copy,
  type Topic,
} from "./course-data";
export type Option = {
  id: string;
  hanzi?: string;
  pinyin?: string;
  label: Copy;
};
export type Exercise = {
  id: string;
  topic: Topic;
  kind: "order" | "choice" | "listen" | "cloze";
  prompt: Copy;
  options: Option[];
  answers: string[][];
  explanation: Copy;
  audio?: string;
  frame?: string;
  framePinyin?: string;
  example?: string;
};
const from = (ids: string[]): Option[] =>
  ids.map((id) => {
    const value =
      terms.find((t) => t.id === id) ?? sentences.find((s) => s.id === id);
    if (!value) throw Error("Unknown course option " + id);
    return {
      id,
      hanzi: value.hanzi,
      pinyin: value.pinyin,
      label: value.meaning,
    };
  });
const order = (
  id: string,
  topic: Topic,
  prompt: Copy,
  ids: string[],
  explanation: Copy,
  example?: string,
): Exercise => ({
  id,
  topic,
  kind: "order",
  prompt,
  options: from(ids),
  answers: [ids],
  explanation,
  example,
});
const select = (
  id: string,
  topic: Topic,
  prompt: Copy,
  ids: string[],
  answer: string,
  explanation: Copy,
  extra: Partial<Exercise> = {},
): Exercise => ({
  id,
  topic,
  kind: "choice",
  prompt,
  options: from(ids),
  answers: [[answer]],
  explanation,
  ...extra,
});
const direction = L(
  "Read from earlier to later; the third position is the current one.",
  "Lisez du passé au futur ; la troisième position est le présent.",
  "Читайте от прошлого к будущему; третья точка — настоящее.",
);
export const exercises: Exercise[] = [
  order(
    "time-days",
    "time",
    L(
      "Put the five days in chronological order.",
      "Placez les cinq jours dans l’ordre chronologique.",
      "Расположите пять дней по порядку.",
    ),
    timelines.days,
    direction,
  ),
  order(
    "time-years",
    "time",
    L(
      "Put the five years in order, from two years ago to two years ahead.",
      "Classez les années, d’il y a deux ans à dans deux ans.",
      "Расположите годы: от позапрошлого до года через два года.",
    ),
    timelines.years,
    direction,
  ),
  order(
    "time-months",
    "time",
    L(
      "Put the five month expressions in order.",
      "Classez les cinq expressions de mois.",
      "Расположите пять выражений о месяцах по порядку.",
    ),
    timelines.months,
    L(
      "上个月 is last month; 下个月 is next month. Repeating the direction means two steps away.",
      "上个月 : le mois dernier ; 下个月 : le mois prochain. Répéter la direction signifie deux étapes.",
      "上个月 — прошлый месяц, 下个月 — следующий. Повтор направления означает два шага.",
    ),
  ),
  order(
    "time-weeks",
    "time",
    L(
      "Put the five week expressions in order.",
      "Classez les cinq expressions de semaine.",
      "Расположите пять выражений о неделях по порядку.",
    ),
    timelines.weeks,
    direction,
  ),
  order(
    "rhythm-dayparts",
    "rhythm",
    L(
      "Follow the day, from morning to evening.",
      "Suivez la journée, du matin au soir.",
      "Расположите время суток от утра к вечеру.",
    ),
    timelines.dayparts,
    L(
      "早上 → 上午 → 中午 → 下午 → 晚上. The boundaries are approximate, not fixed clock times.",
      "早上 → 上午 → 中午 → 下午 → 晚上. Les limites sont approximatives, pas des horaires fixes.",
      "早上 → 上午 → 中午 → 下午 → 晚上. Границы приблизительные, без жёстких часов.",
    ),
  ),
  order(
    "rhythm-meals",
    "rhythm",
    L(
      "Put the three meals in daily order.",
      "Classez les trois repas de la journée.",
      "Расположите три приёма пищи по порядку.",
    ),
    timelines.meals,
    L(
      "早饭 is breakfast, 午饭 is lunch and 晚饭 is dinner. 中饭 is another word for lunch.",
      "早饭 : petit-déjeuner ; 午饭 : déjeuner ; 晚饭 : dîner. 中饭 est une autre forme pour le déjeuner.",
      "早饭 — завтрак, 午饭 — обед, 晚饭 — ужин. 中饭 — другой вариант слова «обед».",
    ),
  ),
  select(
    "rhythm-lunch",
    "rhythm",
    L(
      "Which other word means lunch?",
      "Quel autre mot signifie le déjeuner ?",
      "Какое ещё слово означает обед?",
    ),
    ["lunch-variant", "breakfast", "dinner"],
    "lunch-variant",
    L(
      "The board pairs 午饭 and 中饭 as lunch.",
      "Le tableau associe 午饭 et 中饭 au déjeuner.",
      "На доске 午饭 и 中饭 обозначают обед.",
    ),
  ),
  select(
    "rhythm-listen",
    "rhythm",
    L(
      "Listen. What does the sentence mean?",
      "Écoutez. Que signifie la phrase ?",
      "Послушайте. Что означает предложение?",
    ),
    ["s15", "s12", "s13"],
    "s15",
    L(
      "早 describes being early here. It is not the word for breakfast, 早饭.",
      "早 signifie ici être en avance. Ce n’est pas 早饭, le petit-déjeuner.",
      "早 здесь означает «рано». Это не 早饭 — «завтрак».",
    ),
    { kind: "listen", audio: "s15", example: "s15" },
  ),
  select(
    "weather-sun",
    "weather",
    L(
      "Complete: 今天有 ___ 。 Choose a noun for the sun.",
      "Complétez 今天有 ___ 。 Choisissez le nom du soleil.",
      "Дополните 今天有 ___ 。 Выберите существительное «солнце».",
    ),
    ["sun", "sunny", "cold"],
    "sun",
    L(
      "有 is followed by the noun 太阳. 晴 is an adjective.",
      "有 est suivi du nom 太阳. 晴 est un adjectif.",
      "После 有 используется существительное 太阳. 晴 — прилагательное.",
    ),
    { frame: "今天有 ___ 。", framePinyin: "Jīntiān yǒu ___.", example: "s14" },
  ),
  select(
    "weather-cool",
    "weather",
    L(
      "Which word means cool rather than cold?",
      "Quel mot signifie frais, plutôt que froid ?",
      "Какое слово означает «прохладно», а не «холодно»?",
    ),
    ["cold", "cool", "rain"],
    "cool",
    L(
      "凉 is cool; 冷 is cold. The teacher contrasted their sounds and meanings.",
      "凉 : frais ; 冷 : froid. Le professeur a comparé leur son et leur sens.",
      "凉 — прохладно, 冷 — холодно. Учитель сравнивал их звучание и значение.",
    ),
  ),
  select(
    "weather-listen",
    "weather",
    L(
      "Listen and choose the matching meaning.",
      "Écoutez et choisissez le sens correspondant.",
      "Послушайте и выберите подходящий перевод.",
    ),
    ["s13", "s14", "s12"],
    "s13",
    L(
      "但是 introduces a contrast: sunny, but cold.",
      "但是 introduit un contraste : du soleil, mais du froid.",
      "但是 выражает противопоставление: солнечно, но холодно.",
    ),
    { kind: "listen", audio: "s13", example: "s13" },
  ),
  select(
    "weather-rain",
    "weather",
    L(
      "Which is the noun ‘rain’?",
      "Quel est le nom « pluie » ?",
      "Какое слово — существительное «дождь»?",
    ),
    ["rain", "sunny", "degree"],
    "rain",
    L(
      "雨 is the noun rain. The board contrasts 有 + noun with adjective descriptions.",
      "雨 est le nom pluie. Le tableau oppose 有 + nom aux descriptions avec adjectif.",
      "雨 — существительное «дождь». На доске сравниваются 有 + существительное и описание прилагательным.",
    ),
  ),
  select(
    "questions-have",
    "questions",
    L(
      "Choose the question equivalent to 你有中国朋友吗？",
      "Choisissez la question équivalente à 你有中国朋友吗？",
      "Выберите вопрос, равнозначный 你有中国朋友吗？",
    ),
    ["s08", "s10", "s17"],
    "s08",
    L(
      "有 + 吗 corresponds here to 有没有. Do not add 吗 to this A-not-A question.",
      "有 + 吗 correspond ici à 有没有. N’ajoutez pas 吗 à cette question A-non-A.",
      "有 + 吗 здесь соответствует 有没有. К этому вопросу A-не-A не добавляют 吗.",
    ),
    {
      frame: "你有中国朋友吗？",
      framePinyin: "Nǐ yǒu Zhōngguó péngyou ma?",
      example: "s08",
    },
  ),
  select(
    "questions-eat",
    "questions",
    L(
      "Ask the same thing as 你吃包子吗？ using A-not-A.",
      "Reformulez 你吃包子吗？ avec A-non-A.",
      "Переформулируйте 你吃包子吗？ с помощью A-не-A.",
    ),
    ["s10", "s08", "s17"],
    "s10",
    L(
      "吃 becomes 吃不吃. Keep the object 包子 together.",
      "吃 devient 吃不吃. Gardez l’objet 包子 entier.",
      "吃 превращается в 吃不吃. Сохраняйте дополнение 包子 целиком.",
    ),
    { frame: "你吃包子吗？", framePinyin: "Nǐ chī bāozi ma?", example: "s10" },
  ),
  select(
    "questions-person",
    "questions",
    L(
      "Which A-not-A question asks whether someone is Chinese?",
      "Quelle question A-non-A demande si la personne est chinoise ?",
      "Какой вопрос A-не-A спрашивает, китаец ли человек?",
    ),
    ["s17", "s08", "s10"],
    "s17",
    L(
      "The verb 是 forms 是不是; the full noun phrase is 中国人.",
      "Le verbe 是 forme 是不是 ; le groupe nominal complet est 中国人.",
      "Глагол 是 образует 是不是; полное именное выражение — 中国人.",
    ),
    { example: "s17" },
  ),
  select(
    "questions-negative",
    "questions",
    L(
      "Someone asks 你有没有中国朋友？ You have none. Choose the short answer.",
      "On demande 你有没有中国朋友？ Vous n’en avez pas. Choisissez la réponse courte.",
      "Вас спрашивают 你有没有中国朋友？ У вас их нет. Выберите краткий ответ.",
    ),
    ["have", "not-have", "bu"],
    "not-have",
    L(
      "The negative of 有 is 没有. 不有 is not the correct form.",
      "La négation de 有 est 没有. 不有 n’est pas correct.",
      "Отрицание 有 — 没有. Форма 不有 неверна.",
    ),
    {
      frame: "你有没有中国朋友？",
      framePinyin: "Nǐ yǒu méiyǒu Zhōngguó péngyou?",
    },
  ),
  select(
    "negation-habit",
    "negation",
    L(
      "Choose the negation for a breakfast habit.",
      "Choisissez la négation d’une habitude au petit-déjeuner.",
      "Выберите отрицание для привычки не завтракать.",
    ),
    ["bu", "mei"],
    "bu",
    L(
      "The board uses 不 for this regular habit: 每天我不吃早饭.",
      "Le tableau utilise 不 pour cette habitude : 每天我不吃早饭.",
      "Для этой привычки на доске используется 不: 每天我不吃早饭.",
    ),
    {
      kind: "cloze",
      frame: "每天我 ___ 吃早饭。",
      framePinyin: "Měitiān wǒ ___ chī zǎofàn.",
      example: "s11",
    },
  ),
  select(
    "negation-yesterday",
    "negation",
    L(
      "The breakfast did not happen yesterday. Complete the sentence.",
      "Le petit-déjeuner n’a pas été pris hier. Complétez.",
      "Вчера завтрак не состоялся. Дополните предложение.",
    ),
    ["bu", "mei"],
    "mei",
    L(
      "没 says this action did not happen. It is the contrast with the daily habit.",
      "没 indique que l’action n’a pas eu lieu, contrairement à l’habitude quotidienne.",
      "没 означает, что действие не произошло. Это отличие от ежедневной привычки.",
    ),
    {
      kind: "cloze",
      frame: "昨天我 ___ 吃早饭。",
      framePinyin: "Zuótiān wǒ ___ chī zǎofàn.",
      example: "s12",
    },
  ),
  select(
    "negation-experience",
    "negation",
    L(
      "Say you have not seen it before. Choose the negation.",
      "Dites que vous ne l’avez jamais vu. Choisissez la négation.",
      "Скажите, что вы раньше этого не смотрели. Выберите отрицание.",
    ),
    ["bu", "mei"],
    "mei",
    L(
      "Negating an experience keeps 过: 我没看过. The board explicitly crosses out 不看过.",
      "La négation d’expérience garde 过 : 我没看过. Le tableau barre explicitement 不看过.",
      "При отрицании опыта 过 сохраняется: 我没看过. На доске 不看过 зачёркнуто.",
    ),
    {
      kind: "cloze",
      frame: "我 ___ 看过。",
      framePinyin: "Wǒ ___ kàn guo.",
      example: "s21",
    },
  ),
  select(
    "negation-now",
    "negation",
    L(
      "Which answer means ‘I do not have any’ now?",
      "Quelle réponse signifie « je n’en ai pas » maintenant ?",
      "Какой ответ означает «у меня нет» сейчас?",
    ),
    ["not-have", "bu", "have"],
    "not-have",
    L(
      "没有 can describe not having something now. 没 is not limited to past time.",
      "没有 peut exprimer un manque actuel. 没 n’est pas réservé au passé.",
      "没有 может означать отсутствие чего-либо сейчас. 没 не ограничивается прошлым временем.",
    ),
  ),
  select(
    "experience-meaning",
    "experience",
    L(
      "Which sentence specifically recalls a past experience?",
      "Quelle phrase évoque précisément une expérience passée ?",
      "Какое предложение говорит именно о прошлом опыте?",
    ),
    ["s01", "s03", "s02"],
    "s01",
    L(
      "V + 过 marks experience. It does not tell you the person’s current location.",
      "V + 过 marque l’expérience, sans préciser la position actuelle.",
      "Глагол + 过 обозначает опыт, не указывая нынешнее местонахождение.",
    ),
    { example: "s01" },
  ),
  select(
    "experience-change",
    "experience",
    L(
      "Which sentence presents the departure for Shanghai as an event or new situation?",
      "Quelle phrase présente le départ à Shanghai comme un événement ou une situation nouvelle ?",
      "Какое предложение представляет отъезд в Шанхай как событие или новую ситуацию?",
    ),
    ["s03", "s01", "s02"],
    "s03",
    L(
      "他去上海了 is the board’s contrast with past experience. A separate sentence supplies the present location.",
      "他去上海了 contraste au tableau avec l’expérience passée. Une autre phrase précise la position actuelle.",
      "На доске 他去上海了 противопоставляется прошлому опыту. Нынешнее место уточняется отдельно.",
    ),
    { example: "s03" },
  ),
  select(
    "experience-listen",
    "experience",
    L(
      "Listen. Which meaning matches?",
      "Écoutez. Quel sens correspond ?",
      "Послушайте. Какой перевод подходит?",
    ),
    ["s01", "s03", "s02"],
    "s01",
    L(
      "You heard 过 after 去: a past experience of going to Shanghai.",
      "Vous avez entendu 过 après 去 : l’expérience d’un voyage à Shanghai.",
      "Вы услышали 过 после 去: прошлый опыт поездки в Шанхай.",
    ),
    { kind: "listen", audio: "s01", example: "s01" },
  ),
  select(
    "experience-location",
    "experience",
    L(
      "After 他去过上海, which sentence explicitly says where he is NOW in the board example?",
      "Après 他去过上海, quelle phrase précise où il est MAINTENANT dans l’exemple du tableau ?",
      "Какое предложение после 他去过上海 прямо говорит, где он СЕЙЧАС в примере с доски?",
    ),
    ["s02", "s01", "s05"],
    "s02",
    L(
      "The board adds 他现在在苏州. Past experience alone does not establish a current location.",
      "Le tableau ajoute 他现在在苏州. L’expérience seule ne fixe pas la position actuelle.",
      "На доске добавлено 他现在在苏州. Сам по себе прошлый опыт не задаёт нынешнее местонахождение.",
    ),
    {
      frame: "他去过上海。",
      framePinyin: "Tā qù guo Shànghǎi.",
      example: "s02",
    },
  ),
];
export const normalizeAnswer = (value: string) =>
  value.normalize("NFKC").replace(/[\s。！？?!，,、]/g, "");
export function isCorrect(exercise: Exercise, answer: string[]) {
  return exercise.answers.some(
    (expected) =>
      expected.length === answer.length &&
      expected.every(
        (v, i) => normalizeAnswer(v) === normalizeAnswer(answer[i]),
      ),
  );
}
export function shuffledOptions(options: Option[], seed: number) {
  const out = [...options];
  let state = seed >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
