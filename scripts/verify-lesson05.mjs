import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
const data=JSON.parse(readFileSync('data/lesson05/content.json','utf8'));
const manifest=JSON.parse(readFileSync('public/course05/audio/manifest.json','utf8'));
const entries=[...data.terms,...data.sentences];
if(manifest.voice!=='zh-CN-XiaoxiaoNeural'||manifest.generationRate!=='-10%')throw Error('Unexpected Lesson05 Mandarin voice');
if(manifest.recordings.length!==entries.length*2)throw Error('Lesson05 audio inventory mismatch');
for(const item of entries){
 for(const kind of ['word','sentence']){
  const file='course05-'+item.id+'-'+kind+'.mp3',row=manifest.recordings.find(v=>v.file===file),bytes=readFileSync('public/course05/audio/'+file);
  if(!row||row.text!==item.hanzi||bytes.length<1000||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Missing/stale Lesson05 recording '+file);
 }
 for(const ch of item.hanzi.match(/\p{Script=Han}/gu)??[]){const glyph=JSON.parse(readFileSync('public/characters/'+ch+'.json','utf8'));if(!glyph.strokes?.length||glyph.strokes.length!==glyph.medians?.length)throw Error('Missing Lesson05 writing glyph '+ch);}
}
if(readdirSync('public/course05/audio').filter(v=>v.endsWith('.mp3')).length!==entries.length*2)throw Error('Unexpected Lesson05 audio files');
const pdfs=JSON.parse(readFileSync('data/lesson05/materials-manifest.json','utf8'));
if(createHash('sha256').update(Buffer.concat([readFileSync('data/lesson05/content.json'),readFileSync('app/lesson05-data.ts')])).digest('hex')!==pdfs.sourceSha256)throw Error('Lesson05 PDFs need regeneration');
for(const kind of ['guide','workbook','quick-reference']){
 const counts=[];for(const lang of ['en','fr','ru']){
  const file=kind+'-'+lang+'.pdf',bytes=readFileSync('public/course05/materials/'+file),row=pdfs.documents.find(v=>v.file===file),pdf=await PDFDocument.load(bytes);
  if(!row||row.pages!==pdf.getPageCount()||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Changed Lesson05 PDF '+file);
  counts.push(pdf.getPageCount());
 }
 if(new Set(counts).size!==1)throw Error('Lesson05 document pagination differs across languages: '+kind);
}
console.log(`Verified Lesson05: ${data.terms.length} expressions, ${data.sentences.length} sentences, ${manifest.recordings.length} Mandarin clips, all writing glyphs and nine PDFs.`);
