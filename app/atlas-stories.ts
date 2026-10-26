import {withTurkish} from "./turkish";
import type { AtlasCopy } from "./atlas-data";
const A = (en: string, fr: string, ru: string): AtlasCopy => (withTurkish({ en, fr, ru }));
const narratedStories = {
  sun: {
    character: "日",
    title: A("From sunlight to 日", "Du soleil à 日", "От солнца к 日"),
    source:
      "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%97%A5",
    steps: [
      {
        label: A("The world", "Le monde", "Окружающий мир"),
        caption: A(
          "The sun: a round shape in the sky.",
          "Le soleil : une forme ronde dans le ciel.",
          "Солнце — круглая форма в небе.",
        ),
      },
      {
        label: A("A pictorial idea", "Une idée pictographique", "Идея рисунка"),
        caption: A(
          "Early forms pictured the sun, often with an inner mark. This is a teaching sketch.",
          "Les formes anciennes représentaient le soleil, souvent avec une marque intérieure. Ceci est un schéma pédagogique.",
          "Ранние формы изображали солнце, часто с отметкой внутри. Это учебная схема.",
        ),
      },
      {
        label: A(
          "The modern character",
          "Le caractère moderne",
          "Современный иероглиф",
        ),
        caption: A(
          "Today, this character means sun or day. Notice its rectangular outline and central stroke.",
          "Aujourd’hui, ce caractère signifie soleil ou jour. Observez son contour rectangulaire et son trait central.",
          "Сегодня этот иероглиф означает солнце или день. Обратите внимание на прямоугольный контур и среднюю черту.",
        ),
      },
    ],
  },
  wood: {
    character: "木",
    title: A("From a tree to 木", "De l’arbre à 木", "От дерева к 木"),
    source:
      "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%9C%A8",
    steps: [
      {
        label: A("The world", "Le monde", "Окружающий мир"),
        caption: A(
          "A tree: branches above, a trunk, and roots below.",
          "Un arbre : des branches en haut, un tronc et des racines en bas.",
          "Дерево: ветви вверху, ствол и корни внизу.",
        ),
      },
      {
        label: A("A pictorial idea", "Une idée pictographique", "Идея рисунка"),
        caption: A(
          "Early forms pictured a tree. This sketch highlights its branches, trunk and roots.",
          "Les formes anciennes représentaient un arbre. Ce schéma souligne les branches, le tronc et les racines.",
          "Ранние формы изображали дерево. Эта схема выделяет ветви, ствол и корни.",
        ),
      },
      {
        label: A(
          "The modern character",
          "Le caractère moderne",
          "Современный иероглиф",
        ),
        caption: A(
          "Today, this character means tree or wood. Follow this component into other characters.",
          "Aujourd’hui, ce caractère signifie arbre ou bois. Suivez ce composant dans d’autres caractères.",
          "Сегодня этот иероглиф означает дерево или древесину. Найдите этот компонент в других иероглифах.",
        ),
      },
    ],
  },
} as const;

const labels = [A("The world", "Le monde", "Окружающий мир"), A("A pictorial idea", "Une idée pictographique", "Идея рисунка"), A("The modern character", "Le caractère moderne", "Современный иероглиф")];
function picture(character: string, title: AtlasCopy, captions: AtlasCopy[]) {
  return { character, title, source: "https://www.dong-chinese.com/wiki/" + encodeURIComponent(character), steps: captions.map((caption, i) => ({ label: labels[i], caption })) };
}
export const atlasStories = {
  ...narratedStories,
  moon: picture("月", A("A moon you can remember.", "Une lune à retenir.", "Луна, которую легко запомнить."), [
    A("A crescent hangs above the quiet landscape.", "Un croissant de lune surplombe le paysage calme.", "Над тихим пейзажем висит серп луны."),
    A("The character began as a picture of the moon. Our sketch is a memory aid, not a copied ancient form.", "Le caractère vient d’une image de la lune. Notre dessin aide la mémoire ; ce n’est pas une forme ancienne copiée.", "Иероглиф возник из изображения луны. Наш рисунок — подсказка, а не копия древней формы."),
    A("月 · yuè means moon or month. The same-looking part in some body characters instead comes from flesh.", "月 · yuè signifie lune ou mois. Dans certains caractères du corps, une forme semblable vient du composant chair.", "月 · yuè — луна или месяц. В некоторых иероглифах тела похожая часть происходит от знака плоти.")]),
  water: picture("水", A("Follow the flow of water.", "Suivez le cours de l’eau.", "Следуйте за течением воды."), [
    A("A river bends through the hills, with little currents on each side.", "Une rivière serpente entre les collines, avec de petits courants de chaque côté.", "Река петляет среди холмов; по сторонам видны маленькие потоки."),
    A("Early forms depicted flowing water. Watch the river and its side currents become a simple sketch.", "Les formes anciennes représentaient de l’eau qui coule. La rivière et ses courants deviennent un dessin simple.", "Древние формы изображали текущую воду. Река и боковые потоки превращаются в простой рисунок."),
    A("水 · shuǐ means water. In many compounds it appears on the left as 氵, a water component.", "水 · shuǐ signifie eau. Dans de nombreux caractères, il prend à gauche la forme 氵, composant de l’eau.", "水 · shuǐ означает воду. Во многих знаках слева используется его форма 氵 — компонент воды.")]),
  fire: picture("火", A("A spark becomes a character.", "Une étincelle devient un caractère.", "Искра становится иероглифом."), [
    A("A flame rises, with two little sparks beside it.", "Une flamme monte, accompagnée de deux petites étincelles.", "Поднимается пламя, а рядом — две маленькие искры."),
    A("The character began as a picture of fire. Our four strands are a modern teaching illustration.", "Le caractère vient d’une image du feu. Nos quatre lignes sont une illustration pédagogique moderne.", "Иероглиф возник из изображения огня. Наши четыре линии — современная учебная иллюстрация."),
    A("火 · huǒ means fire. Keep its shape in mind when learning words connected with heat.", "火 · huǒ signifie feu. Retenez sa forme dans les mots liés à la chaleur.", "火 · huǒ означает огонь. Вспоминайте эту форму в словах, связанных с теплом.")]),
  mountain: picture("山", A("Three peaks. One shape.", "Trois sommets. Une forme.", "Три вершины. Одна форма."), [
    A("Look at the tall middle peak and its two neighbours.", "Observez le haut sommet central et ses deux voisins.", "Посмотрите на высокую среднюю вершину и две соседние."),
    A("The early character pictured mountain peaks. This simplified ridge is our visual bridge.", "Le caractère ancien représentait des sommets. Cette crête simplifiée sert de repère visuel.", "Древний знак изображал горные вершины. Упрощённый хребет помогает увидеть связь."),
    A("山 · shān means mountain. The three upright parts keep the mountain silhouette visible.", "山 · shān signifie montagne. Les trois parties verticales gardent la silhouette des sommets.", "山 · shān означает гору. Три вертикальные части сохраняют силуэт вершин.")]),
};
export type StoryId = keyof typeof atlasStories;
export const storyPinyin: Record<StoryId,string> = { sun: "rì", wood: "mù", moon: "yuè", water: "shuǐ", fire: "huǒ", mountain: "shān" };
export const storyMeaning: Record<StoryId,AtlasCopy> = {
 sun:A("sun · day","soleil · jour","солнце · день"), wood:A("tree · wood","arbre · bois","дерево · древесина"),
 moon:A("moon · month","lune · mois","луна · месяц"), water:A("water","eau","вода"), fire:A("fire","feu","огонь"), mountain:A("mountain","montagne","гора")
};
export const hasNarration = (id: StoryId) => id === "sun" || id === "wood";
