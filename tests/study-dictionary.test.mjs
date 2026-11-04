import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const result=await build({stdin:{contents:`
 import {createElement as h,createRef} from 'react';
 import {renderToStaticMarkup} from 'react-dom/server';
 import {DictionaryWords,DictionaryAudio,StudyDictionaryDialog} from './app/study-dictionary';
 import {studyDictionary} from './app/atlas-spatial-model';
 import {StudyText,LookupContext} from './app/study-lookup-context';
 import {lesson05Terms} from './app/lesson05-data';
 const dictionary=studyDictionary('en');
 for(const v of lesson05Terms)dictionary.set(v.hanzi,{...dictionary.get(v.hanzi),text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning.en,audio:{text:v.hanzi,pinyin:v.pinyin,context:false,source:'/course05/audio/course05-'+v.id+'-word.mp3'}});
 export const aligned=(text,pinyin,enabled=true,sourceText,offset)=>renderToStaticMarkup(h(LookupContext.Provider,{value:{dictionary,open:()=>{}}},h(StudyText,{text,pinyin,annotatePinyin:enabled,sourceText,offset})));
 export const words=text=>renderToStaticMarkup(h(DictionaryWords,{text,dictionary,onLookup:()=>{}}));
 export const contextualDefinition=(entry)=>renderToStaticMarkup(h(StudyDictionaryDialog,{entry,dictionary,dialog:createRef(),opener:createRef(),onClose:()=>{},onLookup:()=>{},onWrite:()=>{},onExplore:()=>{},speaker:recording=>h(DictionaryAudio,{recording,playing:null,onPlay:()=>{}})}));
 export const definition=text=>renderToStaticMarkup(h(StudyDictionaryDialog,{entry:dictionary.get(text),dictionary,dialog:createRef(),opener:createRef(),headingId:'lesson-word',onClose:()=>{},onLookup:()=>{},speaker:recording=>h(DictionaryAudio,{recording,playing:null,onPlay:()=>{}})}));
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
 assert.match(html,/aria-labelledby="lesson-word"/);assert.match(html,/long time no see/);assert.match(html,/Inside this expression/);
 for(const ch of ['好','久','不','见'])assert.match(html,new RegExp('>'+ch+'</strong>'));
 assert.match(html,/Whole word: 好久不见/);
});
test('A selected character shows its own reading and pronunciation instead of retaining the full expression',()=>{
 const html=m.definition('久');assert.match(html,/jiǔ/);assert.match(html,/a long time/);assert.match(html,/Whole word: 久/);assert.doesNotMatch(html,/<h2[^>]*>好久不见<\/h2>/);
});
test('Every Lesson 5 writing character has adjacent reading and meaning, including source-backed additions',async()=>{
 const result=await build({stdin:{contents:`import {createElement as h} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {WritingCharacterContext} from './app/writing-context';import {lesson05All} from './app/lesson05-data';export const contexts=[...new Set(lesson05All.flatMap(v=>Array.from(v.hanzi).filter(c=>/[\\u3400-\\u9fff]/u.test(c))))].map(ch=>({ch,html:renderToStaticMarkup(h(WritingCharacterContext,{character:ch}))}));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'cjs',platform:'node',write:false,loader:{'.css':'empty'},logLevel:'silent'});
 const output={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),output,output.exports);
 for(const {ch,html} of output.exports.contexts){assert.ok(!html.includes('Not yet in this study dictionary'),ch);assert.match(html,/class="pinyin">[^<]+<\/p>/,ch);assert.ok(!html.includes('<p></p>'),ch);}
});

test('source sentence recording stays with its source while isolated headword audio remains separate',()=>{
 const sentence={text:'我每天八点左右醒来。',pinyin:'Wǒ měitiān bā diǎn zuǒyòu xǐnglái.',meaning:'I wake up around eight every day.',audio:{text:'我每天八点左右醒来。',pinyin:'Wǒ měitiān bā diǎn zuǒyòu xǐnglái.',source:'/source.mp3',kind:'sentence',context:false}};
 const entry={text:'醒',pinyin:'xǐng',meaning:'wake up',audio:{text:'醒',pinyin:'xǐng',source:'/isolated.mp3',context:false},contextual:sentence};
 const html=m.contextualDefinition(entry),header=html.slice(html.indexOf('<header'),html.indexOf('</header>')),context=html.slice(html.indexOf('<section class="sp-dictionary-context"'),html.indexOf('</section>'));
 assert.match(header,/Whole word: 醒/);assert.doesNotMatch(header,/Listen to the sentence/);assert.match(context,/Listen to the sentence: 我每天八点左右醒来/);
 const sourceOnly=m.contextualDefinition({...entry,audio:sentence.audio});assert.doesNotMatch(sourceOnly.slice(0,sourceOnly.indexOf('</header>')),/Listen to the sentence/);assert.match(sourceOnly,/Listen to the sentence/);
 const missing=m.contextualDefinition({...entry,audio:undefined,contextual:{...sentence,audio:undefined}});assert.doesNotMatch(missing,/class="sp-speaker/);
});

test('all headwords expose the same nearby writing action and supported Atlas link',()=>{
 for(const entry of [{text:'在',pinyin:'zài',meaning:'at',character:'在'},{text:'书店',pinyin:'shūdiàn',meaning:'bookshop'},{text:'银行',pinyin:'yínháng',meaning:'bank'}]){
  const html=m.contextualDefinition(entry),actions=html.slice(html.indexOf('class="sp-dictionary-actions"'),html.indexOf('</div>',html.indexOf('class="sp-dictionary-actions"')));
  assert.match(actions,/>Write<\/button>/,entry.text);
  assert.match(actions,/Explore in Atlas/,entry.text);
  assert.equal((html.match(/>Write<\/button>/g)||[]).length,1);
 }
 const unavailable=m.contextualDefinition({text:'口',pinyin:'kǒu',meaning:'mouth',atlasAvailable:false});assert.match(unavailable,/>Write<\/button>/);assert.doesNotMatch(unavailable,/Explore in Atlas/);
});
test('source context precedes character structure while examples and writing remain intact',()=>{
 const html=m.contextualDefinition({text:'得',pinyin:'de',meaning:'complement particle',contextual:{text:'我跑得很快。',pinyin:'Wǒ pǎo de hěn kuài.',meaning:'I run fast.'}});
 assert.ok(html.indexOf('sp-dictionary-context')<html.indexOf('sp-dictionary-structure'));
 assert.match(html,/In this sentence/);assert.match(html,/I run fast/);
 const examples=m.definition('久');assert.match(examples,/Examples in use/);
});

test('aligned Pinyin remains attached to the right Hanzi without replacing dictionary word targets',()=>{
 const html=m.aligned('银行在书店东边。','Yínháng zài shūdiàn dōngbian.');
 assert.match(html,/<ruby[^>]*>银<rt>yín<\/rt>/);assert.match(html,/<ruby[^>]*>行<rt>háng<\/rt>/);
 assert.match(html,/aria-label="银行"/);assert.match(html,/aria-label="书店"/);
 assert.doesNotMatch(m.aligned('银行','yínháng',false),/<rt>/);
 const chunk=m.aligned('书店','Yínháng zài shūdiàn dōngbian.',true,'银行在书店东边。',3);assert.match(chunk,/>书<rt>shū<\/rt>/);assert.match(chunk,/>店<rt>diàn<\/rt>/);
 assert.doesNotMatch(m.aligned('哪儿','nǎr'),/<rt>/,'ambiguous erhua is never assigned to the wrong character');
});
