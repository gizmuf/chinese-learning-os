export function recordSpeakingAnswer(stream: MediaStream, onError: () => void) {
  const nativeType=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
  const recorder=new MediaRecorder(stream,nativeType?{mimeType:nativeType}:undefined);
  const pieces:Blob[]=[];
  let settle:(answer:Blob|null)=>void;
  const result=new Promise<Blob|null>(resolve=>{settle=resolve;});

  recorder.ondataavailable=event=>{if(event.data.size)pieces.push(event.data);};
  recorder.onstop=()=>settle(pieces.length?new Blob(pieces,{type:recorder.mimeType||pieces[0].type}):null);
  recorder.onerror=()=>{settle(null);onError();};
  recorder.start();

  return {
    async finish(){
      if(recorder.state!=='inactive')recorder.stop();
      let timer:ReturnType<typeof setTimeout>|undefined;
      try {
        return await Promise.race([result,new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),3000);})]);
      } finally {
        clearTimeout(timer);
      }
    },
    discard(){
      recorder.ondataavailable=null;
      if(recorder.state!=='inactive')recorder.stop();
      settle(null);
    },
  };
}
