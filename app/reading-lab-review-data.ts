import {knownHskInScope} from './global-hsk-model';
import type {BrowseScope} from './hsk-scope';
import type {ReadingReviewStore} from './reading-lab-review-model';
import {readingLabReadings} from './reading-lab-data';
import {splitReadingSentences} from './reading-lab-model';
import type {ReadingLabExample} from './reading-lab-types';

type Scenario = ReadingLabExample & {prompt: string};
function scenario(prompt: string, hanzi: string, pinyin: string, english: string): Scenario {
  return {prompt, hanzi, pinyin, english};
}
function target(article: string, paragraph: string, hanzi: string, meaning: string, a: Scenario, b: Scenario) {
  const reading = readingLabReadings.find(item => item.id === article);
  const block = reading?.paragraphs.find(item => item.id === paragraph);
  if (!reading || !block) throw Error('Missing reading review article or paragraph for ' + hanzi);
  const sentences = splitReadingSentences(block);
  const sentenceIndex = sentences.findIndex(sentence => sentence.tokens.some(token => token.text === hanzi));
  if (sentenceIndex < 0) throw Error('Missing reading review source for ' + hanzi);
  const articleSentences = reading.paragraphs.flatMap(splitReadingSentences).map(sentence => sentence.hanzi);
  const {tokens, ...source} = sentences[sentenceIndex];
  const token = tokens.find(item => item.text === hanzi)!;
  const chunk = block.chunks.find(item => item.tokens.includes(token))!;
  return {id: `${reading.id}:${hanzi}`, article: reading.id, level: reading.level, paragraph: block.id, chunk: chunk.id,
    title: reading.title, hanzi, pinyin: token.pinyin.join(''), meaning, source, articleSentences, scenarios: [a, b] as const};
}

export const readingReviewTargets = [
  target('hsk2-library-meeting', 'p2', '图书馆', 'library',
    scenario('Tell a friend where you borrowed a book.', '我在图书馆借了一本书。', 'Wǒ zài túshūguǎn jiè le yī běn shū.', 'I borrowed a book from the library.'),
    scenario('Ask when the library opens.', '图书馆几点开门？', 'Túshūguǎn jǐ diǎn kāimén?', 'What time does the library open?')),
  target('hsk2-library-meeting', 'p2', '旁边', 'beside; next to',
    scenario('Tell someone where their bag is, using a chair as a landmark.', '你的包在椅子旁边。', 'Nǐ de bāo zài yǐzi pángbiān.', 'Your bag is beside the chair.'),
    scenario('Describe a shop next to your home.', '我家旁边有一家商店。', 'Wǒ jiā pángbiān yǒu yī jiā shāngdiàn.', 'There is a shop next to my home.')),
  target('hsk2-cooking-together', 'p1', '帮忙', 'to help out',
    scenario('Ask a friend to help move a table.', '你能来帮忙搬桌子吗？', 'Nǐ néng lái bāngmáng bān zhuōzi ma?', 'Can you come and help move the table?'),
    scenario('Thank a classmate for helping today.', '谢谢你今天来帮忙。', 'Xièxie nǐ jīntiān lái bāngmáng.', 'Thanks for coming to help today.')),
  target('hsk2-cooking-together', 'p2', '杯子', 'cup; drinking glass',
    scenario('Tell a guest where a clean cup is.', '杯子在桌子上。', 'Bēizi zài zhuōzi shàng.', 'The cup is on the table.'),
    scenario('Ask for a clean cup in a café.', '请给我一个干净的杯子。', 'Qǐng gěi wǒ yī ge gānjìng de bēizi.', 'Please give me a clean cup.')),
  target('hsk3-rain-bike', 'p1', '本来', 'originally; used for the original plan or situation',
    scenario('Say you first planned to cook, but went out instead.', '我本来想做饭，可是后来出去吃了。', 'Wǒ běnlái xiǎng zuò fàn, kěshì hòulái chūqu chī le.', 'I originally planned to cook, but later ate out.'),
    scenario('Say what you originally planned for Sunday before it changed.', '我本来想星期天去看电影。', 'Wǒ běnlái xiǎng xīngqītiān qù kàn diànyǐng.', 'I originally planned to see a film on Sunday.')),
  target('hsk3-rain-bike', 'p3', '马上', 'right away',
    scenario('Tell a friend you will call back right away.', '我马上给你打回去。', 'Wǒ mǎshàng gěi nǐ dǎ huíqu.', 'I’ll call you back right away.'),
    scenario('Tell someone who is waiting that you will leave right away.', '我换好衣服就马上出门。', 'Wǒ huàn hǎo yīfu jiù mǎshàng chūmén.', 'I’ll leave as soon as I’ve changed.')),
  target('hsk3-exchanging-clothes', 'p2', '换', 'to exchange an item',
    scenario('Ask to exchange shoes that are too small.', '这双鞋太小了，我想换一双。', 'Zhè shuāng xié tài xiǎo le, wǒ xiǎng huàn yī shuāng.', 'These shoes are too small. I’d like to exchange them.'),
    scenario('Ask to exchange a red cup for a blue one.', '我可以把红色的杯子换成蓝色的吗？', 'Wǒ kěyǐ bǎ hóngsè de bēizi huàn chéng lánsè de ma?', 'Can I exchange the red cup for a blue one?')),
  target('hsk3-exchanging-clothes', 'p3', '舒服', 'comfortable',
    scenario('Compare how two chairs feel to sit in.', '这把椅子坐起来更舒服。', 'Zhè bǎ yǐzi zuò qǐlái gèng shūfu.', 'This chair is more comfortable to sit in.'),
    scenario('Describe how new shoes feel on a walk.', '这双鞋走路的时候很舒服。', 'Zhè shuāng xié zǒulù de shíhou hěn shūfu.', 'These shoes are comfortable to walk in.')),
  target('hsk4-repair-before-replace', 'p1', '提醒', 'to remind',
    scenario('Ask a friend to remind you to take your key.', '出门前请提醒我带钥匙。', 'Chūmén qián qǐng tíxǐng wǒ dài yàoshi.', 'Please remind me to take my key before I leave.'),
    scenario('Tell someone what your phone reminded you to do.', '手机提醒我下午有个会。', 'Shǒujī tíxǐng wǒ xiàwǔ yǒu ge huì.', 'My phone reminded me I had a meeting in the afternoon.')),
  target('hsk4-repair-before-replace', 'p2', '值得', 'worth doing',
    scenario('Recommend a place to visit, giving a reason.', '那个公园很安静，值得去看看。', 'Nà ge gōngyuán hěn ānjìng, zhíde qù kànkan.', 'That park is quiet and worth a visit.'),
    scenario('Say whether a book is worth reading.', '这本书不长，但是值得读。', 'Zhè běn shū bù cháng, dànshì zhíde dú.', 'This book isn’t long, but it is worth reading.')),
  target('hsk4-phone-free-dinner', 'p2', '建议', 'to suggest',
    scenario('Suggest an earlier time to meet tomorrow.', '我建议我们明天早点见面。', 'Wǒ jiànyì wǒmen míngtiān zǎodiǎn jiànmiàn.', 'I suggest that we meet earlier tomorrow.'),
    scenario('Suggest dividing the group into two.', '我建议把大家分成两组。', 'Wǒ jiànyì bǎ dàjiā fēn chéng liǎng zǔ.', 'I suggest dividing everyone into two groups.')),
  target('hsk4-phone-free-dinner', 'p2', '否则', 'otherwise',
    scenario('Tell a friend when to leave so they catch the train.', '我们得早点出门，否则会错过火车。', 'Wǒmen děi zǎodiǎn chūmén, fǒuzé huì cuòguò huǒchē.', 'We need to leave earlier, otherwise we’ll miss the train.'),
    scenario('Explain why someone should write down a phone number.', '把电话号码写下来，否则你可能会忘。', 'Bǎ diànhuà hàomǎ xiě xiàlái, fǒuzé nǐ kěnéng huì wàng.', 'Write the phone number down, otherwise you might forget it.')),
  target('hsk5-building-secondhand', 'p2', '整理', 'to tidy or organize',
    scenario('Say what you want to organize before a guest arrives.', '客人来以前，我要整理一下房间。', 'Kèrén lái yǐqián, wǒ yào zhěnglǐ yīxià fángjiān.', 'Before the guest arrives, I need to tidy my room.'),
    scenario('Tell a classmate what you did with your notes after class.', '下课以后，我整理了今天的笔记。', 'Xiàkè yǐhòu, wǒ zhěnglǐ le jīntiān de bǐjì.', 'After class, I organized today’s notes.')),
  target('hsk5-building-secondhand', 'p2', '规则', 'rule; rules',
    scenario('Tell someone a rule at a swimming pool.', '这里的规则是下水前要先洗澡。', 'Zhèlǐ de guīzé shì xià shuǐ qián yào xiān xǐzǎo.', 'The rule here is to shower before entering the water.'),
    scenario('Ask a friend to explain the rules of a game.', '你可以给我讲讲这个游戏的规则吗？', 'Nǐ kěyǐ gěi wǒ jiǎngjiang zhè ge yóuxì de guīzé ma?', 'Can you explain the rules of this game to me?')),
  target('hsk5-neighborhood-deliveries', 'p2', '预约', 'to book or arrange in advance',
    scenario('Call to ask for a dental appointment tomorrow.', '我想预约明天看牙。', 'Wǒ xiǎng yùyuē míngtiān kàn yá.', 'I’d like to book a dental appointment for tomorrow.'),
    scenario('Explain that a visit to an exhibition needs a booking.', '参观这个展览需要提前预约。', 'Cānguān zhè ge zhǎnlǎn xūyào tíqián yùyuē.', 'You need to book in advance to visit this exhibition.')),
  target('hsk5-neighborhood-deliveries', 'p1', '顺便', 'while you are at it; in passing',
    scenario('Ask someone already going to the supermarket to bring milk.', '你去超市的时候，可以顺便买点牛奶吗？', 'Nǐ qù chāoshì de shíhou, kěyǐ shùnbiàn mǎi diǎn niúnǎi ma?', 'Could you pick up some milk while you’re at the supermarket?'),
    scenario('Say what extra errand you can do on your way to the station.', '我去车站的时候可以顺便寄一封信。', 'Wǒ qù chēzhàn de shíhou kěyǐ shùnbiàn jì yī fēng xìn.', 'I can mail a letter on my way to the station.')),
];

export const readingReviewTargetsById = new Map(readingReviewTargets.map(item => [item.id, item]));

export type ReadingReviewSourcePin = {
  article: string;
  chunk: string;
  tokenIndex: number;
  hanzi: string;
  pinyin: string[];
  sentence: string;
};

type AuthoredReviewTarget = typeof readingReviewTargets[number];
export type ReadingReviewTarget = Omit<AuthoredReviewTarget, 'meaning' | 'scenarios'> & {
  meaning?: string;
  cloze?: string;
  scenarios: readonly [{prompt: string} & Partial<ReadingLabExample>, {prompt: string} & Partial<ReadingLabExample>];
};

const dynamicScenarios: ReadingReviewTarget['scenarios'] = [
  {prompt: 'Use this word in a short Chinese message to someone about a situation different from the reading.'},
  {prompt: 'Use this word in a short Chinese sentence about your own day or plans.'},
];
const readingById = new Map(readingLabReadings.map(reading => [reading.id, reading]));
const articleSentenceCache = new Map<string, string[]>();

export const readingReviewPinId = ({article, chunk, tokenIndex}: ReadingReviewSourcePin) => `${article}:${chunk}:${tokenIndex}`;

function alternatePinId(pin: ReadingReviewSourcePin) {
  let hash = 2166136261;
  for (const glyph of [pin.hanzi, ...pin.pinyin, pin.sentence].join('|')) hash = Math.imul(hash ^ glyph.codePointAt(0)!, 16777619);
  return readingReviewPinId(pin) + '~' + (hash >>> 0).toString(36);
}

export function readingReviewMatchesPinId(id: string, pin: ReadingReviewSourcePin) {
  return id === readingReviewPinId(pin) || id === alternatePinId(pin);
}

function findSource(article: string, chunk: string, tokenIndex: number) {
  const reading = readingById.get(article);
  const block = reading?.paragraphs.find(paragraph => paragraph.chunks.some(part => part.id === chunk));
  const part = block?.chunks.find(item => item.id === chunk);
  const token = part?.tokens[tokenIndex];
  if (!reading || !block || !token) return;
  const hanzi = token.text.replaceAll(/[^\p{Script=Han}]/gu, '');
  if (!hanzi || [...hanzi].length !== token.pinyin.length) return;
  const sentence = splitReadingSentences(block).find(value => value.tokens.includes(token));
  if (!sentence) return;
  const {tokens, ...source} = sentence;
  const pin: ReadingReviewSourcePin = {article, chunk, tokenIndex, hanzi, pinyin: [...token.pinyin], sentence: source.hanzi};
  return {reading, block, source, pin};
}

const sourceCache = new Map<string, NonNullable<ReturnType<typeof findSource>>>();
function sourceAt(article: string, chunk: string, tokenIndex: number) {
  const id = `${article}:${chunk}:${tokenIndex}`;
  const existing = sourceCache.get(id);
  if (existing) return existing;
  const found = findSource(article, chunk, tokenIndex);
  if (found) sourceCache.set(id, found);
  return found;
}

export function findReadingReviewSource(article: string, chunk: string, tokenIndex: number): ReadingReviewSourcePin | undefined {
  const pin = sourceAt(article, chunk, tokenIndex)?.pin;
  return pin && {...pin, pinyin: [...pin.pinyin]};
}

function sameWord(a: ReadingReviewSourcePin, b: ReadingReviewSourcePin) {
  return a.article === b.article && a.hanzi === b.hanzi && a.pinyin.join(' ') === b.pinyin.join(' ');
}

export function readingReviewTargetId(pin: ReadingReviewSourcePin, cards: Record<string, {target?: ReadingReviewSourcePin}>) {
  const authored = readingReviewTargetsById.get(`${pin.article}:${pin.hanzi}`);
  if (authored?.pinyin === pin.pinyin.join('')) return authored.id;
  const equivalent = Object.entries(cards).find(([id, card]) => card.target?.sentence === pin.sentence && sameWord(card.target, pin)
    && resolveReadingReviewTarget(id, card));
  if (equivalent) return equivalent[0];
  const id = readingReviewPinId(pin);
  return cards[id] ? alternatePinId(pin) : id;
}

export function resolveReadingReviewTarget(id: string, card?: {target?: ReadingReviewSourcePin}): ReadingReviewTarget | undefined {
  const authored = readingReviewTargetsById.get(id);
  if (authored && !card?.target) return authored;
  const pin = card?.target;
  if (!pin || !readingReviewMatchesPinId(id, pin)) return;
  const actual = sourceAt(pin.article, pin.chunk, pin.tokenIndex);
  if (!actual || !sameWord(pin, actual.pin) || pin.sentence !== actual.pin.sentence) return;
  let articleSentences = articleSentenceCache.get(pin.article);
  if (!articleSentences) {
    articleSentences = actual.reading.paragraphs.flatMap(splitReadingSentences).map(sentence => sentence.hanzi);
    articleSentenceCache.set(pin.article, articleSentences);
  }
  return {id, article: pin.article, level: actual.reading.level, paragraph: actual.block.id, chunk: pin.chunk,
    title: actual.reading.title, hanzi: pin.hanzi, pinyin: pin.pinyin.join(''), source: actual.source, articleSentences,
    cloze: actual.source.hanzi.replaceAll(pin.hanzi, '＿＿'), scenarios: dynamicScenarios};
}

export function readingReviewsInHskScope(store: ReadingReviewStore, scope: BrowseScope): ReadingReviewStore {
 if (scope === 'all') return store;
 return {...store, cards: Object.fromEntries(Object.entries(store.cards).filter(([id, card]) =>
  knownHskInScope(resolveReadingReviewTarget(id, card)?.level, scope)))};
}
