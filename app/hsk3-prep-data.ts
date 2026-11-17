type Line = {hanzi: string; pinyin: string};
type Base = {id: string; prompt: string; explanation: string};
export type HskPrepTask =
  | Base & {type: 'listen'; audio: string; transcript: string; choices: string[]; answer: number}
  | Base & {type: 'read'; text: Line[]; choices: string[]; answer: number}
  | Base & {type: 'character'; answer: string; example: string}
  | Base & {type: 'sentence' | 'speaking'; example: string};

export const hskPrepTasks: HskPrepTask[] = [
  {id: 'listen-station', type: 'listen', prompt: '男的建议她怎么去火车站？', audio: '/hsk3-prep/station-dialogue.mp3',
   transcript: '女：请问，去火车站怎么走？ 男：你可以坐公交车，但是现在车还没来。 女：我的火车十点开。我怕迟到。 男：那就坐地铁吧，十分钟就到了。',
   choices: ['坐地铁', '坐公交车', '走路'], answer: 0, explanation: 'The man first mentions the bus. After hearing about the departure time, he suggests the metro: 那就坐地铁吧。'},
  {id: 'read-match', type: 'read', prompt: '选出最合适的回答。', text: [{hanzi: '你什么时候有空？', pinyin: 'Nǐ shénme shíhou yǒu kòng?'}],
   choices: ['在学校。', '明天下午。', '坐公交车。'], answer: 1, explanation: '什么时候 asks when. 明天下午 answers with a time.'},
  {id: 'read-cloze', type: 'read', prompt: '选词填空。', text: [{hanzi: '我昨天已经买了票，今天不用（　）买。', pinyin: 'Wǒ zuótiān yǐjīng mǎi le piào, jīntiān búyòng mǎi.'}],
   choices: ['在', '正', '再'], answer: 2, explanation: '再 precedes a repeated action. 在买 would mean “is buying,” which does not fit 不用 here.'},
  {id: 'read-station', type: 'read', prompt: '小王为什么坐地铁？', text: [
   {hanzi: '小王打算坐公交车去火车站。', pinyin: 'Xiǎo Wáng dǎsuàn zuò gōngjiāochē qù huǒchēzhàn.'},
   {hanzi: '可是公交车还没来，他怕迟到，就坐地铁去了。', pinyin: 'Kěshì gōngjiāochē hái méi lái, tā pà chídào, jiù zuò dìtiě qù le.'}],
   choices: ['他怕迟到。', '他想去机场。', '他没有买票。'], answer: 0, explanation: '怕迟到 means he was afraid of being late.'},
  {id: 'read-library', type: 'read', prompt: '她今天先做什么？', text: [
   {hanzi: '李老师下午要去图书馆。', pinyin: 'Lǐ lǎoshī xiàwǔ yào qù túshūguǎn.'},
   {hanzi: '她先回家吃饭，再去还书。', pinyin: 'Tā xiān huí jiā chīfàn, zài qù huán shū.'}],
   choices: ['还书。', '回家吃饭。', '去上课。'], answer: 1, explanation: '先…再… gives the order. 还 in 还书 is huán, “return”; 还 in 还没来 is hái, “still/yet.”'},
  {id: 'write-an', type: 'character', prompt: '晚上回家要注意（ān）全。', answer: '安', example: '晚上回家要注意安全。', explanation: '安全 means “safety.” The syllable ān here is 安.'},
  {id: 'write-sentence', type: 'sentence', prompt: '用「方便」写一个句子。', example: '我家离地铁站很近，出门很方便。', explanation: 'Use 方便 in a complete sentence. You can say what is convenient and add why. Compare your sentence with the example.'},
  {id: 'say-reply', type: 'speaking', prompt: '你平时怎么去学校？为什么？', example: '我平时坐地铁去学校，因为地铁又快又方便。', explanation: 'Say how you travel and give one reason. Compare your response aloud with the example.'},
];
