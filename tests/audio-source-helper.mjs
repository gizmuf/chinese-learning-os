import fs from 'node:fs';
const recordings=JSON.parse(fs.readFileSync('data/practice-recordings.json','utf8'));
export function recordingAssetPath(source){
 if(source.startsWith('/api/practice-recording?')){const id=new URL(source,'https://example.test').searchParams.get('file'),clip=recordings[id];if(!clip||clip.file!==id+'.mp3')throw Error('Unregistered audio source '+source);return 'resources/practice-audio/'+clip.file;}
 if(source.startsWith('/api/lesson12-asset?')){const id=new URL(source,'https://example.test').searchParams.get('file'),r=JSON.parse(fs.readFileSync('data/lesson12/assets.json')).files[id];if(!r||r.type!=='audio/mpeg')throw Error('Unregistered lesson12 audio '+source);return r.path;}
 return 'public'+source;
}
