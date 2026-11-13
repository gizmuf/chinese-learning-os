import { familyStories, storySource } from "./atlas-family-stories-data";
import { items, type Item } from "./content";

export type StoryTarget = "幕" | "明天" | "姓";
export type StoryLinkKind = "component" | "character" | "word" | "sentence";

type StoryTerm = {
  text: string;
  pinyin: string;
  english: string;
  kind: StoryLinkKind;
  audio?: string;
};

type StoryPart = StoryTerm & { position: string };

type Story = {
  target: StoryTerm;
  scene: {
    title: string;
    description: string;
    action: string;
    reset: string;
    states: readonly [string, string];
    narration?: string;
  };
  structure: {
    layout: "stacked" | "paired" | "word";
    description: string;
    parts: readonly [StoryPart, StoryPart];
  };
  example: StoryTerm;
  related?: StoryTerm;
  source: { name: string; id: string; url?: string };
};

const curtain = familyStories.find(({ id }) => id === "mu-curtain")!;
const curtainUsage = curtain.word!;
const tomorrow = items.find(({ id }) => id === "tomorrow")!;
const surname = items.find(({ id }) => id === "hsk2-464")!;
const fullName = items.find(({ id }) => id === "hsk2-465")!;

function courseWord(item: Item, kind: "word" | "character" = "word"): StoryTerm {
  return {
    text: item.hanzi, pinyin: item.pinyin, english: item.english, kind,
    audio: `/audio/${item.id}-word.mp3`,
  };
}

function courseSentence(item: Item, pinyin = item.sentencePinyin): StoryTerm {
  return {
    text: item.sentence, pinyin, english: item.translation, kind: "sentence",
    audio: `/audio/${item.id}-sentence.mp3`,
  };
}

export const atlasExplorerStories: Record<StoryTarget, Story> = {
  幕: {
    target: { text: curtain.hanzi, pinyin: curtain.pinyin, english: curtain.meaning.en, kind: "character" },
    scene: {
      title: "The curtain falls",
      description: "Imagine a theatre curtain sliding across the evening sky. Remember the cloth and its shape as it closes.",
      action: "Close the curtain",
      reset: "Open the curtain",
      states: ["Curtain open", "Curtain closed"],
      narration: "/atlas/family-stories/mu-curtain-en.mp3",
    },
    structure: {
      layout: "stacked",
      description: "In the modern character, 莫 sits above 巾. 巾 points to cloth, and 莫 is the historical sound component.",
      parts: [
        { text: "莫", pinyin: "mò", english: "sound clue", kind: "component", position: "Top" },
        { text: "巾", pinyin: "jīn", english: "cloth", kind: "component", position: "Bottom" },
      ],
    },
    example: {
      text: curtainUsage.sentence, pinyin: curtainUsage.sentencePinyin, english: curtainUsage.translation.en,
      kind: "sentence", audio: "/atlas/family-stories/mu-curtain-sentence.mp3",
    },
    related: {
      text: curtainUsage.hanzi, pinyin: curtainUsage.pinyin, english: curtainUsage.meaning.en,
      kind: "word", audio: "/atlas/family-stories/mu-curtain-word.mp3",
    },
    source: { name: "CUHK character entry and Chinese OS family story", id: curtain.id, url: storySource(curtain.hanzi) },
  },
  明天: {
    target: courseWord(tomorrow),
    scene: {
      title: "See you tomorrow",
      description: "Picture saying goodbye at dusk and meeting again after the sun comes up. Say the two syllables together: míngtiān.",
      action: "Advance to tomorrow",
      reset: "Return to today",
      states: ["Today at dusk", "Tomorrow at sunrise"],
    },
    structure: {
      layout: "word",
      description: "Read 明 then 天. Together they form one word, míngtiān, meaning tomorrow.",
      parts: [
        { text: "明", pinyin: "míng", english: "next, in this word", kind: "character", position: "First" },
        { text: "天", pinyin: "tiān", english: "day", kind: "character", position: "Second" },
      ],
    },
    example: courseSentence(tomorrow),
    source: { name: "Chinese OS · Time & plans", id: tomorrow.id },
  },
  姓: {
    target: courseWord(surname, "character"),
    scene: {
      title: "A name at the door",
      description: "Picture arriving at a meeting and being handed a name badge. Before writing, the host asks for your surname.",
      action: "Reveal the surname field",
      reset: "Turn the badge back",
      states: ["Name badge face down", "Surname field revealed"],
    },
    structure: {
      layout: "paired",
      description: "In the modern character, 女 sits to the left of 生. Remember the position of both parts when you read xìng.",
      parts: [
        { text: "女", pinyin: "nǚ", english: "woman", kind: "component", position: "Left" },
        { text: "生", pinyin: "shēng", english: "birth / life", kind: "component", position: "Right" },
      ],
    },
    example: courseSentence(surname, "Nǐ xìng shénme?"),
    related: courseWord(fullName),
    source: { name: "CUHK character entry and Chinese OS · First conversations", id: `${surname.id}, ${fullName.id}`, url: storySource(surname.hanzi) },
  },
};

export function isStoryTarget(text: unknown): text is StoryTarget {
  return typeof text === 'string' && Object.hasOwn(atlasExplorerStories, text);
}
