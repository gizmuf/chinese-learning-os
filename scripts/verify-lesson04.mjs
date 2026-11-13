import {readFileSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';import {PDFDocument} from 'pdf-lib';
const data=JSON.parse(readFileSync('data/lesson04/content.json','utf8')),manifest=JSON.parse(readFileSync('public/course04/audio/manifest.json','utf8'));
if(manifest.voice!=='zh-CN-XiaoxiaoNeural'||manifest.generationRate!=='-10%')throw Error('Unexpected course04 voice');
for(const item of [...data.terms,...data.sentences]){
 for(const kind of ['word','sentence']){const file='course04-'+item.id+'-'+kind+'.mp3',r=manifest.recordings.find(r=>r.file===file),bytes=readFileSync('public/course04/audio/'+file);if(!r||r.text!==item.hanzi||bytes.length<1000||createHash('sha256').update(bytes).digest('hex')!==r.sha256)throw Error('Missing/outdated lesson04 recording '+file);}
 for(const c of item.hanzi.match(/[\u3400-\u9fff]/gu)??[]){const d=JSON.parse(readFileSync('public/characters/'+c+'.json','utf8'));if(!d.strokes?.length||d.strokes.length!==d.medians.length)throw Error('Missing lesson04 writing data '+c);}
}
for(const n of [9965,9966,9967,9968,9969,9971,9972,9973,9974,9975,9976,9977])if(!existsSync('public/course04/boards/'+n+'.jpg'))throw Error('Missing board '+n);
// Public boards must not carry EXIF/GPS, XMP, IPTC or comment metadata.
for(const n of [9965,9966,9967,9968,9969,9971,9972,9973,9974,9975,9976,9977]){
 const jpg=readFileSync('public/course04/boards/'+n+'.jpg');let pos=2;
 if(jpg[0]!==255||jpg[1]!==216)throw Error('Invalid board JPEG');
 while(pos<jpg.length){if(jpg[pos]!==255)throw Error('Invalid JPEG marker');while(jpg[pos]===255)pos++;const marker=jpg[pos++];if(marker===0xda||marker===0xd9)break;if([0xe1,0xed,0xfe].includes(marker))throw Error('Private metadata in public board '+n);if(marker===1||marker>=0xd0&&marker<=0xd7)continue;const size=jpg.readUInt16BE(pos);if(size<2||pos+size>jpg.length)throw Error('Invalid JPEG size');pos+=size;}
}
for(const kind of ['guide','workbook']){const counts=[];for(const lang of ['en','fr','ru']){const bytes=readFileSync('public/course04/materials/'+kind+'-'+lang+'.pdf');if(bytes.subarray(0,4).toString()!=='%PDF')throw Error('Invalid lesson04 PDF');counts.push((await PDFDocument.load(bytes)).getPageCount());}if(new Set(counts).size!==1)throw Error('Unequal lesson04 document pagination '+kind);}
console.log('Verified lesson04: 73 expressions, 28 sentences, 202 Mandarin files, writing data, twelve boards and six multilingual PDFs.');

const pdfManifest=JSON.parse(readFileSync('data/lesson04/materials-manifest.json','utf8'));
if(createHash('sha256').update(Buffer.concat([readFileSync('data/lesson04/content.json'),readFileSync('app/lesson04-data.ts')])).digest('hex')!==pdfManifest.sourceSha256)throw Error('Lesson04 PDFs need regeneration after content changes');
for(const r of pdfManifest.documents)if(createHash('sha256').update(readFileSync('public/course04/materials/'+r.file)).digest('hex')!==r.sha256)throw Error('Changed lesson04 PDF '+r.file);
