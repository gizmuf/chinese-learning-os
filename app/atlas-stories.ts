import type { AtlasCopy } from "./atlas-data";
const A = (en: string, fr: string, ru: string): AtlasCopy => ({ en, fr, ru });
export const atlasStories = {
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
