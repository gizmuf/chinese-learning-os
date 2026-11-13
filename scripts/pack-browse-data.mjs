import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
for(const name of ['hsk-browse-index','hanzi-structure','simplified-dictionary-policy']){
 const source=fs.readFileSync(`data/${name}.json`);
 const packed=gzipSync(source,{level:9,mtime:0}).toString('base64');
 fs.writeFileSync(`data/${name}-packed.ts`,`// Generated losslessly by scripts/pack-browse-data.mjs. Keep source JSON for provenance.\nexport default ${JSON.stringify(packed)};\n`);
 console.log(`${name}: ${source.length} → ${packed.length} bytes`);
}
