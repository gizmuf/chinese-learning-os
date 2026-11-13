import { L, terms, type Term, type Copy } from "./course-data";
import { items } from "./content";
import { localizeItem } from "./translate";
const friend = items.find((i) => i.hanzi === "朋友")!;
export const labExtraTerms: Term[] = [
  {
    id: "lab-word-friend",
    hanzi: friend.hanzi,
    pinyin: friend.pinyin,
    meaning: L(
      friend.english,
      localizeItem(friend, "fr").english,
      localizeItem(friend, "ru").english,
    ),
    topic: "questions",
    baseId: friend.id,
  },
];
export const labTerms = [...terms, ...labExtraTerms];
export function labTermById(id: string) {
  return labTerms.find((t) => t.id === id)!;
}
export function labTerm(hanzi: string): Term {
  const value = labTerms.find((t) => t.hanzi === hanzi);
  if (!value) throw Error("Unknown lesson term " + hanzi);
  return value;
}
export type BlockTask = {
  id: string;
  termId: string;
  pieces: string[];
  pool: string[];
  pairId?: string;
  note: Copy;
};
const shortNote = L(
  "Build the full classroom expression. Keep the shared part and change the time unit.",
  "Construisez l’expression complète du cours. Gardez la partie commune et changez l’unité de temps.",
  "Соберите полное выражение из урока. Сохраните общую часть и замените единицу времени.",
);
const directionNote = L(
  "Months and weeks use a direction, 个, then the unit. 上 is previous, 这 is this, 下 is next; 下下 moves two steps ahead.",
  "Pour les mois et semaines : direction, 个, puis unité. 上 signifie précédent, 这 actuel, 下 prochain ; 下下 avance de deux étapes.",
  "Для месяцев и недель: направление, 个, затем единица. 上 — предыдущий, 这 — текущий, 下 — следующий; 下下 — на два шага вперёд.",
);
export const blockTasks: BlockTask[] = [
  ["today", ["今", "天"]],
  ["this-year", ["今", "年"]],
  ["tomorrow", ["明", "天"]],
  ["next-year", ["明", "年"]],
  ["yesterday", ["昨", "天"]],
  ["last-year", ["去", "年"]],
  ...["上", "这", "下", "下下"].flatMap((prefix) => [
    [prefix + "-month", [prefix, "个", "月"]],
    [prefix + "-week", [prefix, "个", "星期"]],
  ]),
].map(([key, pieces]) => {
  const p = pieces as string[],
    term = labTerm(p.join(""));
  return {
    id:
      "lab-build-" +
      String(key)
        .replace("上", "previous")
        .replace("这", "current")
        .replace("下下", "after-next")
        .replace("下", "next"),
    termId: term.id,
    pieces: p,
    pool:
      p.length === 2
        ? ["今", "明", "昨", "去", "天", "年"]
        : ["上", "这", "下", "下下", "个", "月", "星期"],
    note:
      p[0] === "去" || p[0] === "昨"
        ? L(
            "昨天 is yesterday; 去年 is last year. Changing 天 to 年 is not enough here: the first part also changes.",
            "昨天 signifie hier ; 去年 signifie l’année dernière. Remplacer 天 par 年 ne suffit pas ici : la première partie change aussi.",
            "昨天 — вчера; 去年 — прошлый год. Здесь недостаточно заменить 天 на 年: первая часть тоже меняется.",
          )
        : p.length === 2
          ? shortNote
          : directionNote,
  };
});
for (const task of blockTasks) {
  const unit = task.pieces.at(-1);
  const alternate =
    unit === "天" ? "年" : unit === "年" ? "天" : unit === "月" ? "星期" : "月";
  const pieces = [...task.pieces.slice(0, -1), alternate];
  task.pairId = blockTasks.find(
    (other) => other.pieces.join("") === pieces.join(""),
  )?.id;
}
export type WordFamily = {
  id: string;
  kind: "component" | "character" | "word";
  anchor: string;
  title: Copy;
  note: Copy;
  members: string[];
  options: string[];
};
export const wordFamilies: WordFamily[] = [
  {
    id: "lab-family-sun",
    kind: "component",
    anchor: "日",
    title: L(
      "Sun and day shapes",
      "Les formes du soleil et du jour",
      "Формы солнца и дня",
    ),
    note: L(
      "Find the 日 shape inside these characters. A shared shape is a clue, not a promise of the same meaning.",
      "Repérez la forme 日 dans ces caractères. Une forme commune donne un indice, sans garantir le même sens.",
      "Найдите форму 日 внутри этих иероглифов. Общая форма — подсказка, но не гарантия одинакового значения.",
    ),
    members: ["昨天", "明天", "早上", "晴"].map((h) => labTerm(h).id),
    options: ["日", "目", "月", "口"],
  },
  {
    id: "lab-family-ice",
    kind: "component",
    anchor: "冫",
    title: L("Cold and cool", "Froid et frais", "Холодно и прохладно"),
    note: L(
      "冫 is the two-dot ice component in 冷 and 凉. It is a component shape, not a separate vocabulary word here.",
      "冫 est le composant glace à deux points dans 冷 et 凉. Ici, c’est une forme composante, pas un mot à apprendre seul.",
      "冫 — компонент «лёд» с двумя точками в 冷 и 凉. Здесь это часть иероглифа, а не отдельное слово.",
    ),
    members: ["冷", "凉"].map((h) => labTerm(h).id),
    options: ["冫", "氵", "日", "木"],
  },
  {
    id: "lab-family-meals",
    kind: "character",
    anchor: "饭",
    title: L(
      "One character, three meals",
      "Un caractère, trois repas",
      "Один иероглиф, три приёма пищи",
    ),
    note: L(
      "The whole character 饭 repeats in the three meal words. Learn each complete word with its pronunciation.",
      "Le caractère entier 饭 revient dans les trois noms de repas. Apprenez chaque mot complet avec sa prononciation.",
      "Целый иероглиф 饭 повторяется в названиях трёх приёмов пищи. Учите каждое слово целиком с произношением.",
    ),
    members: ["早饭", "午饭", "晚饭"].map((h) => labTerm(h).id),
    options: ["饭", "天", "友", "月"],
  },
  {
    id: "lab-family-friends",
    kind: "word",
    anchor: "朋友",
    title: L(
      "Build around friend",
      "Construire autour d’ami",
      "Слова вокруг слова «друг»",
    ),
    note: L(
      "朋友 is a complete word. 中国 and 女 add information to build a longer expression; this is a word pattern, not a character decomposition.",
      "朋友 est un mot complet. 中国 et 女 précisent le sens dans une expression plus longue ; c’est une structure de mots, pas une décomposition de caractère.",
      "朋友 — целое слово. 中国 и 女 уточняют значение в более длинном выражении. Это модель словосочетания, а не разбор иероглифа.",
    ),
    members: ["朋友", "中国朋友", "女朋友"].map((h) => labTerm(h).id),
    options: ["朋友", "中国", "包子", "女"],
  },
];
export type ReadingCheck = { id: string; termId: string; options: string[] };
export const readingChecks: ReadingCheck[] = [
  ["今天", "昨天", "明天", "今年"],
  ["去年", "今年", "明年", "前年"],
  ["上上个星期", "上个星期", "下个星期", "下下个星期"],
  ["下下个月", "下个月", "上个月", "这个月"],
  ["中午", "上午", "下午", "晚上"],
  ["中国朋友", "女朋友", "中国人", "朋友"],
].map((words, i) => ({
  id: "lab-read-" + (i + 1),
  termId: labTerm(words[0]).id,
  options: words.map((h) => labTerm(h).id),
}));
export const recallChecks = ["今年", "上个月", "早饭", "凉"].map(
  (hanzi, i) => ({ id: "lab-recall-" + (i + 1), termId: labTerm(hanzi).id }),
);
export const labActivityIds = [
  ...blockTasks,
  ...wordFamilies,
  ...readingChecks,
  ...recallChecks,
].map((t) => t.id);
export function checkBlocks(task: BlockTask, pieces: string[]) {
  return (
    task.pieces.length === pieces.length &&
    task.pieces.every((piece, i) => piece === pieces[i])
  );
}
export function checkRecall(term: Term, answer: string) {
  return answer.normalize("NFKC").replace(/[\s。.!！?？]/gu, "") === term.hanzi;
}
