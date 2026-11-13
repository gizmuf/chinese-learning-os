// Describes the supplied signal. This module does not recognize speech or grade pronunciation.
export function summarizeSamples(samples,sampleRate,bins=100){
 if(!samples?.length||!(sampleRate>0))throw new Error('No decodable audio samples.');
 const stride=Math.max(1,Math.ceil(samples.length/bins)),wave=[];let sum=0,peak=0;
 for(let start=0;start<samples.length;start+=stride){let local=0;for(let i=start;i<Math.min(start+stride,samples.length);i++){const n=Number.isFinite(samples[i])?samples[i]:0;sum+=n*n;local=Math.max(local,Math.abs(n));peak=Math.max(peak,Math.abs(n));}wave.push(local)}
 return{duration:samples.length/sampleRate,rms:Math.sqrt(sum/samples.length),peak,wave,hasAudibleSignal:peak>.005};
}
export function recorderMime(isSupported){return ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(isSupported)||''}
export function recordingAvailability(secure,hasDevices,hasRecorder){return secure&&hasDevices&&hasRecorder}
