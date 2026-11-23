import type {ReferenceEntry, ReferenceLesson} from './reference-lesson-types';

type Phrase = [hanzi: string, pinyin: string, english: string, note?: string];
type Topic = {
  id: string;
  title: string;
  rule: string;
  sourcePages: number[];
  summary: string;
  words: Phrase[];
  examples: Phrase[];
  checks: [kind: 'meaning' | 'hanzi' | 'pinyin', example: number, alternatives?: number[]][];
};

const topics: Topic[] = [
  {
    id: 'room-existence', title: '房间里有什么？ · What’s in the room?',
    rule: 'Place + 有 + thing introduces what is there. In this pattern use 房间里, 桌子上 or 墙上. To say there are no books, use 没有书. 一本书 is also possible under negation when you mean “not a single book”, often with 也 or 都.',
    sourcePages: [1, 13, 15, 16], summary: 'Existence with 有 and 没有, room vocabulary and measure words.',
    words: [
      ['房间', 'fángjiān', 'room'], ['桌子', 'zhuōzi', 'table or desk'], ['椅子', 'yǐzi', 'chair'],
      ['墙', 'qiáng', 'wall'], ['床', 'chuáng', 'bed'], ['书架', 'shūjià', 'bookshelf'],
      ['柜子', 'guìzi', 'cupboard or wardrobe'], ['本子', 'běnzi', 'notebook'], ['笔', 'bǐ', 'pen'],
      ['地图', 'dìtú', 'map'], ['词典', 'cídiǎn', 'dictionary'], ['把', 'bǎ', 'measure word for chairs and many objects with handles'],
      ['张', 'zhāng', 'measure word for flat objects such as tables, beds and sheets'],
      ['本', 'běn', 'measure word for bound volumes'], ['支', 'zhī', 'measure word for long, thin objects such as pens'],
      ['书店', 'shūdiàn', 'bookshop'], ['银行', 'yínháng', 'bank'],
    ],
    examples: [
      ['房间里有一张桌子。', 'Fángjiān lǐ yǒu yì zhāng zhuōzi.', 'There is a table in the room.'],
      ['墙上有一张中国地图。', 'Qiáng shang yǒu yì zhāng Zhōngguó dìtú.', 'There is a map of China on the wall.'],
      ['桌子上没有书。', 'Zhuōzi shang méiyǒu shū.', 'There are no books on the table.'],
      ['桌子上有一本书、一个本子和一支笔。', 'Zhuōzi shang yǒu yì běn shū, yí ge běnzi hé yì zhī bǐ.', 'There’s a book, a notebook and a pen on the table.'],
      ['房间里有床吗？', 'Fángjiān lǐ yǒu chuáng ma?', 'Is there a bed in the room?'],
      ['宿舍楼旁边有一家书店。', 'Sùshèlóu pángbiān yǒu yì jiā shūdiàn.', 'There is a bookshop next to the dormitory building.'],
      ['外边有一把椅子。', 'Wàibian yǒu yì bǎ yǐzi.', 'There’s a chair outside.'],
      ['桌子上一本书也没有。', 'Zhuōzi shang yì běn shū yě méiyǒu.', 'There isn’t a single book on the table.'],
    ],
    checks: [['meaning', 0, [1, 2]], ['hanzi', 3, [2, 7]], ['hanzi', 6, [0, 1]]],
  },
  {
    id: 'room-location', title: '词典在哪儿？ · Where is the dictionary?',
    rule: 'Thing + 在 + place tells you where something already mentioned is. After a noun, 里 and 上 keep phrases like 房间里 and 桌子上 short. Use 左边、右边、旁边 and 中间 to describe positions. 呢 can ask about a topic that follows from the previous sentence.',
    sourcePages: [13, 14, 15, 16], summary: 'Locating known objects with 在, position words, and topic follow-up with 呢.',
    words: [
      ['里', 'lǐ', 'inside a place'], ['里边', 'lǐbian', 'the inside'], ['外', 'wài', 'outside'],
      ['外边', 'wàibian', 'the outside'], ['上', 'shàng', 'on or above, after a noun', 'Often unstressed (shang) after a noun, as in 桌子上.'],
      ['上边', 'shàngbian', 'the upper part'], ['下边', 'xiàbian', 'the lower part'],
      ['左边', 'zuǒbian', 'left side'], ['右边', 'yòubian', 'right side'],
      ['旁边', 'pángbiān', 'next to or beside'], ['中间', 'zhōngjiān', 'in the middle'],
      ['呢', 'ne', 'particle used to follow up on a topic'], ['在', 'zài', 'to be at or in'],
    ],
    examples: [
      ['桌子在床旁边。', 'Zhuōzi zài chuáng pángbiān.', 'The table is next to the bed.'],
      ['我的床在左边，大卫的床在右边。', 'Wǒ de chuáng zài zuǒbian, Dàwèi de chuáng zài yòubian.', 'My bed is on the left, and David’s is on the right.'],
      ['大卫的书呢？都在书架上。', 'Dàwèi de shū ne? Dōu zài shūjià shang.', 'What about David’s books? They’re all on the bookshelf.'],
      ['汉语书在上边，英语书在下边，词典在中间。', 'Hànyǔ shū zài shàngbian, Yīngyǔ shū zài xiàbian, cídiǎn zài zhōngjiān.', 'The Chinese books are on top, the English books are below, and the dictionary is in the middle.'],
      ['书架上有一本词典。', 'Shūjià shang yǒu yì běn cídiǎn.', 'There is a dictionary on the bookshelf.'],
      ['词典在书架上。', 'Cídiǎn zài shūjià shang.', 'The dictionary is on the bookshelf.'],
    ],
    checks: [['meaning', 1, [0, 3]], ['hanzi', 5, [4, 0]], ['hanzi', 4, [5, 2]]],
  },
  {
    id: 'room-housing', title: '我租了一个公寓 · Renting an apartment',
    rule: '还 asks whether a previous situation continues. 现在 introduces what is true now. After the verb, 了 marks a completed event in 我租了一个公寓. 家 and 套 are also useful classifiers: 一家书店 and 一套公寓.',
    sourcePages: [3, 5, 8, 11], summary: 'Catching up, asking whether someone still lives at the dorm, and describing a move.',
    words: [
      ['好久不见', 'hǎo jiǔ bú jiàn', 'long time no see'], ['最近', 'zuìjìn', 'recently or lately'],
      ['还', 'hái', 'still'], ['住', 'zhù', 'to live or stay'], ['宿舍', 'sùshè', 'dormitory'],
      ['现在', 'xiànzài', 'now'], ['租', 'zū', 'to rent'], ['公寓', 'gōngyù', 'apartment'],
      ['青年公寓', 'qīngnián gōngyù', 'residence or apartments for young people'], ['套', 'tào', 'measure word for sets and apartments'],
    ],
    examples: [
      ['好久不见！你最近好吗？', 'Hǎo jiǔ bú jiàn! Nǐ zuìjìn hǎo ma?', 'Long time no see! How have you been?'],
      ['我很好。你还住宿舍吗？', 'Wǒ hěn hǎo. Nǐ hái zhù sùshè ma?', 'I’m well. Do you still live in the dorm?'],
      ['不，我现在住学校外边。', 'Bù, wǒ xiànzài zhù xuéxiào wàibian.', 'No, I live off campus now.'],
      ['我租了一个公寓。', 'Wǒ zū le yí ge gōngyù.', 'I rented an apartment.'],
      ['我租了一套公寓。', 'Wǒ zū le yí tào gōngyù.', 'I rented an apartment.', '套 counts the apartment as a residential unit.'],
    ],
    checks: [['meaning', 1, [0, 2]], ['hanzi', 2, [1, 3]], ['pinyin', 3]],
  },
  {
    id: 'room-commute', title: '你怎么去学校？ · How do you get to school?',
    rule: 'Put the way you travel before 去: 走路去, 坐地铁去, 骑自行车去. Usually use 或者 when giving alternatives in a statement, and 还是 when asking someone to choose. 马上 means “right away” or “very soon”.',
    sourcePages: [2, 4, 6, 7], summary: 'Methods of transport, 或者 and 还是, and classroom time expressions.',
    words: [
      ['怎么', 'zěnme', 'how'], ['走路', 'zǒulù', 'to walk'], ['坐地铁', 'zuò dìtiě', 'to take the metro'],
      ['坐火车', 'zuò huǒchē', 'to take the train'], ['打的', 'dǎdī', 'to take a taxi'],
      ['坐出租车', 'zuò chūzūchē', 'to take a taxi'], ['骑自行车', 'qí zìxíngchē', 'to ride a bicycle'],
      ['骑马', 'qí mǎ', 'to ride a horse'], ['或者', 'huòzhě', 'or, typically in a statement'],
      ['还是', 'háishi', 'or, in a choice question'], ['马上', 'mǎshàng', 'right away, very soon'],
      ['上课', 'shàngkè', 'to attend or teach class'], ['一块', 'yí kuài', 'one piece or chunk'],
      ['一块儿', 'yíkuàir', 'together'],
    ],
    examples: [
      ['你怎么去学校？', 'Nǐ zěnme qù xuéxiào?', 'How do you get to school?'],
      ['我走路去学校。', 'Wǒ zǒulù qù xuéxiào.', 'I walk to school.'],
      ['我坐地铁或者骑自行车去学校。', 'Wǒ zuò dìtiě huòzhě qí zìxíngchē qù xuéxiào.', 'I go to school by metro or by bike.'],
      ['你走路去，还是坐地铁去？', 'Nǐ zǒulù qù, háishi zuò dìtiě qù?', 'Will you walk or take the metro?'],
      ['马上要上课了。', 'Mǎshàng yào shàngkè le.', 'Class is about to start.'],
      ['晚上我想见你。', 'Wǎnshang wǒ xiǎng jiàn nǐ.', 'I’d like to see you this evening.'],
      ['我们一块儿去学校吧。', 'Wǒmen yíkuàir qù xuéxiào ba.', 'Let’s go to school together.'],
    ],
    checks: [['hanzi', 3, [0, 2]], ['hanzi', 2, [1, 3]], ['meaning', 4, [5, 6]]],
  },
  {
    id: 'room-potential', title: '放得下吗？ · Will it fit?',
    rule: 'Verb + 得/不 + complement says whether the result is possible. Compare 放得下 / 放不下 for capacity, 看得见 / 看不见 for visibility, and 听得懂 / 听不懂 for understanding. 没看见 says you did not see something on one occasion. 看不见 says you cannot see it.',
    sourcePages: [9, 10, 12], summary: 'Potential complements for capacity, sight, listening and eating.',
    words: [
      ['放得下', 'fàng de xià', 'to have room for something'], ['放不下', 'fàng bu xià', 'to not have room for something'],
      ['沙发', 'shāfā', 'sofa'], ['饱', 'bǎo', 'full after eating'], ['吃不下', 'chī bu xià', 'to be unable to eat any more'],
      ['看得见', 'kàn de jiàn', 'to be able to see'], ['看不见', 'kàn bu jiàn', 'to be unable to see'],
      ['听得懂', 'tīng de dǒng', 'to be able to understand what is heard'], ['听不懂', 'tīng bu dǒng', 'to be unable to understand what is heard'],
    ],
    examples: [
      ['我的包放得下三本书。', 'Wǒ de bāo fàng de xià sān běn shū.', 'My bag can hold three books.'],
      ['我的包放不下十本书。', 'Wǒ de bāo fàng bu xià shí běn shū.', 'My bag can’t hold ten books.'],
      ['这间公寓放不下那张沙发。', 'Zhè jiān gōngyù fàng bu xià nà zhāng shāfā.', 'That sofa won’t fit in this apartment.'],
      ['我饱了，吃不下一碗米饭。', 'Wǒ bǎo le, chī bu xià yì wǎn mǐfàn.', 'I’m full. I can’t eat a bowl of rice.'],
      ['你看得见墙上的地图吗？', 'Nǐ kàn de jiàn qiáng shang de dìtú ma?', 'Can you see the map on the wall?'],
      ['我坐在后边，看不见地图。', 'Wǒ zuò zài hòubian, kàn bu jiàn dìtú.', 'I’m sitting at the back, and I can’t see the map.'],
      ['我听得懂这句话。', 'Wǒ tīng de dǒng zhè jù huà.', 'I can understand this sentence when I hear it.'],
      ['他说得太快了，我听不懂。', 'Tā shuō de tài kuài le, wǒ tīng bu dǒng.', 'He’s speaking too fast. I can’t understand him.'],
      ['我刚才没看见你。', 'Wǒ gāngcái méi kànjiàn nǐ.', 'I didn’t see you just now.'],
    ],
    checks: [['hanzi', 1, [0, 2]], ['meaning', 7, [5, 6]], ['hanzi', 5, [4, 8]], ['pinyin', 6]],
  },
  {
    id: 'room-board-notes', title: '课堂补充 · More from the board',
    rule: 'Use 朵 to count individual flowers and 束 for bunches. Compare 一朵玫瑰花 with 一束百合花. The words 他 and 地 can both contain 也, but the left component changes: 亻 is the person component and 土 is the earth component.',
    sourcePages: [3, 5, 6], summary: 'Supplemental classroom notes on dates, flowers, classifiers and character components.',
    words: [
      ['十一月二十号', 'shíyī yuè èrshí hào', 'November 20'], ['星期五', 'xīngqīwǔ', 'Friday'],
      ['上午', 'shàngwǔ', 'morning or the period before noon'], ['半夜', 'bànyè', 'the middle of the night'],
      ['百合花', 'bǎihéhuā', 'lily'], ['玫瑰花', 'méiguihuā', 'rose'], ['朵', 'duǒ', 'measure word for individual flowers'],
      ['束', 'shù', 'measure word for bunches or bouquets'], ['送', 'sòng', 'to give as a gift'],
      ['看见', 'kànjiàn', 'to catch sight of'], ['他', 'tā', 'he or him'], ['地', 'dì', 'ground, land'],
    ],
    examples: [
      ['十一月二十号是星期五。', 'Shíyī yuè èrshí hào shì xīngqīwǔ.', 'November 20 is a Friday.', 'This matches the 2026 date on the board.'],
      ['他送了她九十九朵玫瑰花。', 'Tā sòng le tā jiǔshíjiǔ duǒ méiguihuā.', 'He gave her ninety-nine roses.'],
      ['我想买一束百合花。', 'Wǒ xiǎng mǎi yí shù bǎihéhuā.', 'I’d like to buy a bunch of lilies.'],
    ],
    checks: [['hanzi', 1, [0, 2]], ['meaning', 2, [0, 1]]],
  },
];

const roomRoutes: ReferenceLesson = {
  id: 'room-routes',
  title: '房间里有什么？ · Rooms, routes & what fits',
  intro: 'Classroom board photos and textbook excerpts from November 20. Learn to describe a room, talk about an apartment and a commute, and explain what you can see, understand or fit.',
  source: {filename: 'Classroom photos and textbook screenshots · November 20, 2026', sha256: 'e9d98cb9b089093990da70211b3fc57ad2d199f7cabf76986c97817c3d5c64c1', pages: 16},
  terms: [],
  examples: [],
  topics: [],
  checks: [],
  coverage: [],
};

for (const {id, title, rule, sourcePages, summary, words, examples, checks} of topics) {
  const entries = (phrases: Phrase[], kind: 'word' | 'example'): ReferenceEntry[] =>
    phrases.map(([hanzi, pinyin, en, note], index) => ({
      id: `${id}:${kind}:${index + 1}`, hanzi, pinyin, en, sourcePages, ...(note ? {note} : {}),
    }));
  const terms = entries(words, 'word');
  const sentences = entries(examples, 'example');
  roomRoutes.terms.push(...terms);
  roomRoutes.examples.push(...sentences);
  roomRoutes.topics.push({
    id, title, explanation: rule, sourcePages, termIds: terms.map(term => term.id),
    exampleIds: sentences.map(sentence => sentence.id), visualIntent: summary,
  });
  roomRoutes.checks.push(...checks.map(([kind, target, alternatives = []], index) => ({
    id: `${id}:check:${index + 1}`, kind, targetId: sentences[target].id,
    prompt: kind === 'meaning' ? 'What does this sentence mean?' :
      kind === 'pinyin' ? 'Type the pinyin for this sentence.' : 'Which sentence matches the meaning?',
    optionIds: kind === 'pinyin' ? [] : alternatives.toSpliced((index + sourcePages[0]) % 3, 0, target).map(option => sentences[option].id),
    sourcePages,
  })));
}

for (let page = 1; page <= roomRoutes.source.pages; page++) {
  const matches = topics.filter(topic => topic.sourcePages.includes(page));
  roomRoutes.coverage.push({page, topicIds: matches.map(topic => topic.id), summary: matches.map(topic => topic.summary).join(' ')});
}

export default roomRoutes;
