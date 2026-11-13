import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
const read=p=>JSON.parse(readFileSync(p,'utf8')),hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const root='public/video-self-introduction/',data=read('data/video-self-introduction/content.json'),chars=read('data/video-self-introduction/characters.json').characters;
const audio=read(root+'audio/manifest.json');
if(audio.voice!=='zh-CN-XiaoxiaoNeural'||audio.generationRate!=='-10%')throw Error('Changed video voice');
const expected=[...chars.map(c=>({id:'char-'+c.text.codePointAt(0).toString(16),text:c.text})),...data.segments.map(s=>({id:s.id,text:s.hanzi}))];
if(audio.recordings.length!==expected.length||readdirSync(root+'audio').filter(v=>v.endsWith('.mp3')).length!==expected.length)throw Error('Unexpected video recording coverage');
for(const row of expected){const r=audio.recordings.find(r=>r.id===row.id);if(!r||r.text!==row.text||r.sha256!==hash(root+'audio/'+r.file))throw Error('Missing or mismatched audio '+row.id);}
for(const c of chars){if(!c.pinyin||!c.meaning)throw Error('Missing character metadata '+c.text);const glyph=read('public/characters/'+c.text+'.json');if(!glyph.strokes?.length||glyph.strokes.length!==glyph.medians.length)throw Error('Missing writing glyph '+c.text);}
const manifest=read(root+'materials/manifest.json');
if(manifest.contentSha256!==hash('data/video-self-introduction/content.json')||manifest.generatorSha256!==hash('scripts/build-video-study-pdfs.py'))throw Error('Video PDFs need regeneration');
for(const locale of ['en','fr','ru','tr']){const file='guide-'+locale+'.pdf',row=manifest.documents.find(d=>d.file===file),pdf=await PDFDocument.load(readFileSync(root+'materials/'+file));if(!row||row.sha256!==hash(root+'materials/'+file)||row.pages!==pdf.getPageCount()||row.verifiedSegments!==data.segments.length)throw Error('Invalid PDF '+file);}
const writingContext=read('data/writing-character-context.json'),writingAudio=read('public/writing-context/audio/manifest.json');
for(const ch of writingContext.characters){const clip=writingAudio.recordings.find(r=>r.text===ch.text);if(!ch.pinyin||!ch.meaning||!clip||clip.sha256!==hash('public/writing-context/audio/'+clip.file))throw Error('Missing writing context '+ch.text);}
console.log(`Verified video study: ${data.segments.flatMap(s=>s.sourceSpans).length} source spans, ${data.segments.length} passages, ${chars.length} characters, ${audio.recordings.length} recordings, four PDFs.`);
