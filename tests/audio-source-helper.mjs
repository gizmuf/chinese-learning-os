import fs from 'node:fs';
const recordings=JSON.parse(fs.readFileSync('data/practice-recordings.json','utf8'));
export function recordingAssetPath(source){
 if(source.startsWith('/api/practice-recording?')){const id=new URL(source,'https://example.test').searchParams.get('file'),clip=recordings[id];if(!clip||clip.file!==id+'.mp3')throw Error('Unregistered audio source '+source);return 'resources/practice-audio/'+clip.file;}
 return 'public'+source;
}
