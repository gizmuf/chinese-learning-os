type StoryPhrase = {hanzi: string; pinyin: string; english: string};

export type SwipeStory = {
  id: string;
  target: string;
  reading: string;
  meaning: string;
  kind: 'character' | 'word';
  frames: readonly {focus: string; structure: string; scene: string}[];
  example: StoryPhrase & {recording?: string};
  related?: StoryPhrase;
};

const stories: readonly {story: SwipeStory; wordEntryId: string}[] = [
  {
    wordEntryId: 'hsk1-112',
    story: {
      id: 'zero',
      target: '零',
      reading: 'líng',
      meaning: 'zero',
      kind: 'character',
      frames: [
        {
          focus: '雨',
          structure: '雨 (yǔ), “rain,” sits at the top of 零.',
          scene: 'Rain taps on the roof of a weather station.',
        },
        {
          focus: '令',
          // Shuowen, as transcribed by the Ministry of Education: https://dict.variants.moe.edu.tw/dictView.jsp?ID=49382
          structure: '令 is the sound clue in 零 (líng). The word 令 (lìng) can mean “command.”',
          scene: 'The forecaster gives the command to set the display to zero degrees.',
        },
        {
          focus: '零',
          structure: '雨 above 令 forms 零 (líng), “zero” in numbers.',
          scene: 'The last raindrop falls as the display flips to 0°.',
        },
      ],
      example: {
        hanzi: '一百零一是多少？',
        pinyin: 'Yì bǎi líng yī shì duō shao?',
        english: 'How much is one hundred and one?',
        recording: '/audio/hsk1-112-sentence.mp3',
      },
    },
  },
  {
    wordEntryId: 'hsk-browse:5:挤',
    story: {
      id: 'crowded-subway',
      target: '挤',
      reading: 'jǐ',
      meaning: 'to squeeze / to be crowded',
      kind: 'character',
      frames: [
        {
          focus: '扌',
          structure: '扌 is the hand component on the left of 挤. It gives a clue to the action of squeezing or pushing.',
          scene: 'A hand reaches for the rail as the subway doors open.',
        },
        {
          focus: '齐',
          structure: '齐 sits on the right. As a word, 齐 (qí) can mean “neat” or “even.”',
          scene: 'A neat line of passengers waits on the platform.',
        },
        {
          focus: '挤',
          structure: '扌 and 齐 form 挤 (jǐ), “to squeeze” or “to be crowded.”',
          scene: 'The whole line squeezes through the doors, and the car fills up.',
        },
      ],
      example: {
        hanzi: '地铁站越来越挤。',
        pinyin: 'Dìtiězhàn yuè lái yuè jǐ.',
        english: 'The subway station is getting more crowded.',
        recording: '/audio/connectors-phone/4d3aff38baea66c7ea14.mp3',
      },
      related: {hanzi: '济', pinyin: 'jì', english: 'to help or give relief'},
    },
  },
  {
    wordEntryId: 'hsk1-127',
    story: {
      id: 'noodles',
      target: '面条儿',
      reading: 'miàntiáor',
      meaning: 'noodles',
      kind: 'word',
      frames: [
        {
          focus: '面',
          structure: '面 (miàn) points to the wheat flour in this food word.',
          scene: 'A cook kneads flour and water into a ball of dough.',
        },
        {
          focus: '条',
          structure: '条 (tiáo) can mean “strip” or “strand.” 面条 (miàntiáo) means “noodles.”',
          scene: 'The cook pulls the dough into long, thin strands.',
        },
        {
          focus: '儿',
          structure: 'Here 儿 adds an r sound to tiáo, making tiáor. 面条儿 (miàntiáor) is still two syllables and means “noodles.”',
          scene: 'As the cook serves the noodles, picture the curl of a strand as a reminder of the final r sound.',
        },
      ],
      example: {
        hanzi: '这碗面条儿很好吃。',
        pinyin: 'Zhè wǎn miàn tiáor hěn hǎo chī.',
        english: 'This bowl of noodles is delicious.',
        recording: '/audio/hsk1-127-sentence.mp3',
      },
    },
  },
];

function readingKey(value: string) {
  return value.normalize('NFC').toLowerCase().replace(/\s+/gu, '');
}

export function findSwipeStory(input: {
  text: string;
  pinyin: string;
  id: string;
  mode: 'characters' | 'words';
}): SwipeStory | undefined {
  const reading = readingKey(input.pinyin);
  return stories.find(({story, wordEntryId}) =>
    story.target === input.text &&
    readingKey(story.reading) === reading &&
    (input.mode === 'characters'
      ? story.kind === 'character' && input.id === story.target
      : input.id === wordEntryId)
  )?.story;
}
