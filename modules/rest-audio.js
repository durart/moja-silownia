// Rest audio engine extracted from index.html; lifecycle remains in the application.
export function createRestAudio({getRestUntil,note,document,window,fetch}){
let restAudioContext=null;
let restAudioBuffer=null;
let restAudioLoading=null;
let restAudioSource=null;
let restAudioScheduledUntil=null;
const restAudioGain=0.70; // głośniej niż dawne pojedyncze piknięcie (gain=0.08)
function restAudioGetContext(){
 if(restAudioContext)return restAudioContext;
 const Context=window.AudioContext||window.webkitAudioContext;
 if(!Context)return null;
 try{restAudioContext=new Context()}catch(e){return null}
 return restAudioContext;
}
function restAudioStop(){
 if(restAudioSource){try{restAudioSource.stop()}catch(e){}}
 restAudioSource=null;
 restAudioScheduledUntil=null;
}
function restAudioLoad(){
 if(restAudioBuffer)return Promise.resolve(restAudioBuffer);
 if(restAudioLoading)return restAudioLoading;
 const ctx=restAudioGetContext();
 if(!ctx)return Promise.resolve(null);
 restAudioLoading=fetch('./assets/rest-sound-a.mp3')
  .then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.arrayBuffer()})
  .then(bytes=>ctx.decodeAudioData(bytes))
  .then(buffer=>{restAudioBuffer=buffer;restAudioSchedule(getRestUntil());return buffer})
  .catch(error=>{console.warn('Dźwięk przerwy A:',error);restAudioLoading=null;return null});
 return restAudioLoading;
}
function restAudioPlay(offset,delay,marker){
 const ctx=restAudioGetContext();
 if(!ctx||ctx.state!=='running'||!restAudioBuffer)return false;
 if(offset>=restAudioBuffer.duration-0.06)return false;
 restAudioStop();
 const source=ctx.createBufferSource(),gain=ctx.createGain();
 source.buffer=restAudioBuffer;
 gain.gain.value=restAudioGain;
 source.connect(gain);gain.connect(ctx.destination);
 try{source.start(ctx.currentTime+Math.max(0,delay),Math.max(0,offset))}
 catch(e){console.warn('Dźwięk przerwy A:',e);return false}
 restAudioSource=source;
 restAudioScheduledUntil=marker;
 source.onended=()=>{if(restAudioSource===source)restAudioSource=null};
 return true;
}
function restAudioSchedule(deadline){
 if(!deadline)return false;
 const end=Number(deadline);
 if(!Number.isFinite(end)||restAudioScheduledUntil===end)return false;
 const left=end-Date.now();
 if(left<=-300)return false;
 // MP3 zawiera piknięcia od t=0,1,2,3,4 i dłuższy sygnał od t=5.
 // Punkt t=5 próbki ustawiamy dokładnie na koniec rzeczywistej przerwy.
 const delay=Math.max(0,(left-5000)/1000);
 const offset=Math.max(0,(5000-left)/1000);
 return restAudioPlay(offset,delay,end);
}
function restAudioUnlock(){
 const ctx=restAudioGetContext();
 if(!ctx)return;
 if(ctx.state!=='running'){
  ctx.resume().then(()=>restAudioSchedule(getRestUntil())).catch(()=>{});
 }else restAudioSchedule(getRestUntil());
 void restAudioLoad();
}
async function restAudioDemo(){
 if(getRestUntil()&&Number(getRestUntil())>Date.now()){
  note('Poczekaj na koniec bieżącej przerwy, aby odtworzyć test.');
  return;
 }
 const ctx=restAudioGetContext();
 if(!ctx){note('Ta przeglądarka nie obsługuje odtwarzania sygnału.');return}
 try{if(ctx.state!=='running')await ctx.resume()}catch(e){}
 const buffer=await restAudioLoad();
 if(!buffer||ctx.state!=='running'){note('Nie udało się włączyć dźwięku. Sprawdź głośność telefonu i internet.');return}
 restAudioPlay(0,0,'preview');
}
// Safari wymaga wcześniejszej aktywacji audio po dotknięciu ekranu.

function beep(){ // dłuższy awaryjny ton końcowy, gdy MP3 nie zdążyło się wczytać
 const ctx=restAudioGetContext();
 if(!ctx||ctx.state!=='running')return;
 try{
  const start=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
  o.type='sine';o.frequency.value=1040;
  g.gain.setValueAtTime(0.20,start);
  g.gain.exponentialRampToValueAtTime(0.001,start+0.66);
  o.connect(g);g.connect(ctx.destination);o.start(start);o.stop(start+0.68);
 }catch(e){}
}

 document.addEventListener('pointerdown',restAudioUnlock,{passive:true});
 document.addEventListener('touchstart',restAudioUnlock,{passive:true});
 document.addEventListener('keydown',restAudioUnlock);
 return {stop:restAudioStop,load:restAudioLoad,schedule:restAudioSchedule,unlock:restAudioUnlock,demo:restAudioDemo,beep,getScheduledUntil:()=>restAudioScheduledUntil};
}
