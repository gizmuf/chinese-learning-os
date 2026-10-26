import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const result=await build({stdin:{contents:`
 import {createElement as h,createRef} from 'react';
 import {renderToStaticMarkup} from 'react-dom/server';
 import {DictionaryWords,DictionaryAudio,StudyDictionaryDialog} from './app/study-dictionary';
 import {studyDictionary} from './app/atlas-spatial-model';
 import {lesson05Terms} from './app/lesson05-data';
 const dictionary=studyDictionary('en');
 for(const v of lesson05Terms)dictionary.set(v.hanzi,{...dictionary.get(v.hanzi),text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning.en,audio:{text:v.hanzi,pinyin:v.pinyin,context:false,source:'/course05/audio/course05-'+v.id+'-word.mp3'}});
 export const words=text=>renderToStaticMarkup(h(DictionaryWords,{text,dictionary,onLookup:()=>{}}));
 export const definition=text=>renderToStaticMarkup(h(StudyDictionaryDialog,{entry:dictionary.get(text),dialog:createRef(),opener:createRef(),headingId:'lesson-word',onClose:()=>{},onLookup:()=>{},speaker:recording=>h(DictionaryAudio,{recording,playing:null,onPlay:()=>{}})}));
 `,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'cjs',platform:'node',write:false,loader:{'.css':'empty'},logLevel:'silent'});
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const m=module.exports;
test('Lesson sentence exposes individual word buttons rather than one sentence action',()=>{
 const html=m.words('请介绍一下你自己。');
 for(const word of ['介绍','一下','你','自己'])assert.match(html,new RegExp('>'+word+'</button>'));
 assert.doesNotMatch(html,/>请介绍一下你自己。<\/button>/);
});
test('The shared Atlas definition lets the learner inspect every character of a lesson expression',()=>{
 const html=m.definition('好久不见');
 assert.match(html,/aria-labelledby="lesson-word"/);assert.match(html,/long time no see/);assert.match(html,/Characters/);
 for(const ch of ['好','久','不','见'])assert.match(html,new RegExp('>'+ch+'</button>'));
 assert.match(html,/Whole word: 好久不见/);
});
test('A selected character shows its own reading and pronunciation instead of retaining the full expression',()=>{
 const html=m.definition('久');assert.match(html,/jiǔ/);assert.match(html,/a long time/);assert.match(html,/Whole word: 久/);assert.doesNotMatch(html,/好久不见/);
});
