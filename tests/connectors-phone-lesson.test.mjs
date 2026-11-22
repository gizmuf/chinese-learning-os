import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {test} from 'node:test';
import {build} from 'esbuild';

const data = JSON.parse(readFileSync('data/connectors-phone-lesson.json'));
const audio = JSON.parse(readFileSync('data/connectors-phone-audio.json'));
const ran = JSON.parse(readFileSync('data/connectors-phone-ran.json'));
const {outputFiles: [bundle]} = await build({stdin: {contents: "export * from './app/connectors-phone-model'; export {linkedReadingId} from './app/reading-lab-linked-route';", resolveDir: process.cwd()}, bundle: true, platform: 'node', format: 'esm', write: false});
const model = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('the unchanged 27-page source is downloadable and every source page has a destination', () => {
  assert.equal(sha(readFileSync('public' + data.source.download)), '74b5db271fea7c66eb57512eb6b3cbb91c0561051052a620adf8774c21d32b54');
  assert.equal(data.source.sha256, '74b5db271fea7c66eb57512eb6b3cbb91c0561051052a620adf8774c21d32b54');
  assert.deepEqual(data.coverage.flatMap(item => item.pages), Array.from({length: 27}, (_, i) => i + 1));
  assert.equal(data.title, model.connectorsPhoneTitle);
  assert.equal(data.connectors.length, 18);
  assert.equal(data.frequency.length, 10);
  assert.equal(data.phoneVocabulary.length, 5);
  assert.equal(data.caution.length, 7);
  assert.equal(data.practice.length, 6);
  assert.equal(data.grammar.length, 4);
  assert.equal(data.speaking.length, 2);
});

test('all fifteen article sentences match the supplied PDF, including the five absent from the old recording', () => {
  const pdf = execFileSync('pdftotext', ['-f', '5', '-l', '6', '-layout', 'public' + data.source.download, '-'], {encoding: 'utf8'});
  const source = [...pdf.matchAll(/^\s*\d{2}\s+(\p{Script=Han}[\s\S]*?)(?=^\s*[A-Za-zĀ-ž])/gmu)].map(match => match[1].replace(/\s/gu, ''));
  assert.equal(source.length, 15);
  assert.deepEqual(data.reading.map(row => row.hanzi), source);
  assert.equal(data.reading[9].hanzi, '出门在外，一边走路一边看手机，很容易撞到别人。');
  assert.ok(data.reading[12].hanzi.startsWith('有时候会撞到门'));
  assert.ok(data.reading.every(row => row.pinyin && row.english && !row.english.includes('MANDARIN PRACTICE')));
});

test('all 63 characters retain their source order, readings and stroke counts', () => {
  assert.equal(data.characters.length, 63);
  assert.equal(new Set(data.characters.map(row => row.hanzi)).size, 63);
  const source = execFileSync('pdftotext', ['-f', '12', '-l', '24', '-layout', 'public' + data.source.download, '-'], {encoding: 'utf8'});
  const sourceChars = [...source.matchAll(/^([\p{Script=Han}])\s*$/gmu)].map(match => match[1]);
  // Page 24 has the character and English meaning on the same line.
  const lastFive = ['挤', '胖', '急', '错', '愈'];
  assert.deepEqual(data.characters.map(row => row.hanzi), [...sourceChars, ...lastFive]);
  for (const row of data.characters) {
    assert.ok(source.includes(row.pinyin + ' · ' + row.strokes + ' strokes'), row.hanzi);
  }
});

test('ready narration covers the exact full text with ordered in-file cues, using one voice', () => {
  const wav = readFileSync('public' + audio.source);
  assert.equal(sha(wav), audio.sha256);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.readUInt32LE(24), audio.sampleRate);
  assert.equal(wav.readUInt32LE(40) / 2, audio.frames);
  assert.equal(audio.voiceId, 'zh-CN-XiaoxiaoNeural');
  assert.deepEqual(audio.cues.map(cue => cue.text), data.reading.map(row => row.hanzi));
  assert.deepEqual(audio.cues.map(cue => cue.key), data.reading.map(row => row.id));
  assert.equal(audio.cues[0].startFrame, 0);
  audio.cues.forEach((cue, index) => {
    assert.ok(cue.startFrame < audio.frames);
    if (index) assert.ok(cue.startFrame > audio.cues[index - 1].startFrame);
  });
  for (const rows of [data.connectorExamples, data.trends, data.relationships, data.variants, data.reading, data.caution, data.practice, data.grammar, data.speaking]) {
    for (const row of rows) {
      const clip = audio.recordings[row.hanzi];
      assert.equal(clip?.text, row.hanzi);
      const media = readFileSync('public' + clip.source);
      assert.equal(sha(media), clip.sha256);
      assert.equal(media.length, clip.bytes);
    }
  }
});

test('lesson and full reader links are additive, and back targets remain in the library', () => {
  assert.equal(model.linkedReadingId(model.connectorsPhoneReadingHref.slice(1)), 'ditouzu-full');
  assert.equal(model.linkedReadingId('?readingText=ditouzu'), 'ditouzu');
  assert.equal(model.connectorsSection('?section=reading'), 'reading');
  assert.equal(model.connectorsSection('?section=bogus'), 'connectors');
  const library = '/?study=library&layout=notebook&set=selected&hsk=3';
  assert.equal(model.connectorsBackHref('?returnTo=' + encodeURIComponent(library)), library);
  for (const unsafe of ['https://example.com', '//example.com', '/?study=library\\evil', '/?study=library\n']) {
    assert.equal(model.connectorsBackHref('?returnTo=' + encodeURIComponent(unsafe)), '/?study=library');
  }
});

test('grammar gaps require every missing part, and frequency contrasts are not called synonyms', () => {
  assert.equal(model.grammarGapCorrect('越来越', ['越来越']), true);
  assert.equal(model.grammarGapCorrect('越，越', ['越', '越']), true);
  assert.equal(model.grammarGapCorrect('越', ['越', '越']), false);
  assert.equal(model.grammarGapCorrect('越来越 越', ['越', '越']), false);
  assert.equal(model.grammarGapCorrect('', ['越来越']), false);
  assert.deepEqual(model.frequencyAlternatives.filter(row => row.role === 'near-synonym').map(row => row.term), ['经常', '常常']);
  assert.ok(model.frequencyAlternatives.filter(row => row.role === 'frequency contrast').every(row => row.term !== '然后'));
  assert.ok(model.resultAlternatives[0].hanzi.includes('好处'));
  assert.ok(model.resultAlternatives[1].hanzi.includes('坏处'));
  assert.ok(!model.resultAlternatives.some(row => row.hanzi.includes('造成了好处')));
});

test('the bounded 然 family teaches eight different words, with contextual practice and recorded examples', () => {
  assert.deepEqual(ran.words.map(row => row.word), ['然后', '当然', '突然', '仍然', '果然', '居然', '不然', '要不然']);
  for (const row of ran.words) {
    assert.ok(row.pinyin && row.english && row.examplePinyin && row.exampleEnglish);
    assert.ok(row.accepted.includes(row.word));
    assert.ok(row.example.includes(row.word));
    assert.ok(row.cloze.includes('_____'));
    for (const text of [row.word, row.example]) {
      const clip = audio.recordings[text];
      assert.equal(clip.text, text);
      assert.equal(sha(readFileSync('public' + clip.source)), clip.sha256);
    }
  }
  assert.equal(ran.timeContrast.length, 3);
  assert.ok(ran.timeContrast[1].hanzi.includes('早饭以后'));
  assert.ok(ran.timeContrast[2].hanzi.startsWith('以后'));
  assert.match(ran.note, /not a list of synonyms/u);
});
