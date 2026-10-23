import {readFile,mkdir,copyFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const source=(await Promise.all(['app/content.ts','app/course-data.ts','app/lesson04-data.ts','data/lesson04/content.json'].map(file=>readFile(path.join(root,file),'utf8')))).join('\n');
const chars=[...new Set(source.match(/[\u3400-\u9fff]/gu))];
const target=path.join(root,'public/characters');
await mkdir(target,{recursive:true});
await mkdir(path.join(root,'public/licenses'),{recursive:true});
for(const c of chars)await copyFile(path.join(root,'node_modules/hanzi-writer-data',c+'.json'),path.join(target,c+'.json'));
for(const pkg of ['hanzi-writer','hanzi-writer-data','ts-fsrs']){
 const dir=path.join(root,'node_modules',pkg);
 for(const filename of await readdir(dir))if(/license|arphic|copying/i.test(filename))await copyFile(path.join(dir,filename),path.join(root,'public/licenses',pkg+'-'+filename));
}
await writeFile(path.join(root,'public/licenses/README.txt'),'Hanzi Writer code: MIT. Hanzi Writer character data: Arphic Public License; preserve dataset attribution. FSRS: see bundled ts-fsrs license. Character data is served locally without a CDN.\n');
console.log(`Prepared ${chars.length} locally served characters and dependency licenses.`);

await import("./verify-audio.mjs");
await import("./verify-course.mjs");
await import("./verify-lesson04.mjs");
await import('./prepare-atlas.mjs');
