// Full-resolution workout PNG renderer, including independent cardio activities.
// Dependencies injected to keep this module independent of app state and DOM globals.
export async function renderWorkoutPNG(s,{drawAnatomyPNG,estimateCalories,formatTime,note,document,navigator,URL,File,cardioLabel,cardioName}){
 if(!s)return;
 const W=1080,pad=70,ctxCanvas=document.createElement('canvas'),ctx=ctxCanvas.getContext('2d');
 const groups=[];for(const x of s.sets){let g=groups.find(a=>a.id===x.exerciseId);if(!g){g={id:x.exerciseId,name:x.name,sets:[]};groups.push(g)}g.sets.push(x)}
 const lines=[];for(const g of groups){lines.push({type:'name',text:g.name});for(const x of g.sets)lines.push({type:'set',text:(x.measurementType==='duration'?`${Number.isInteger(x.durationSeconds)&&x.durationSeconds>0?x.durationSeconds+' s':'Brak prawidłowego czasu'}${x.weight?' · '+x.weight+' kg dodatkowo':''}`:`${x.weight} kg × ${x.reps} powt.${x.rir!=null?' · RIR '+x.rir:''}`)+(x.pr?.length?'  🏆 PR: '+x.pr.join(', '):'')});lines.push({type:'gap'})}
 const cardio=(Array.isArray(s.cardio)?s.cardio:[]).filter(a=>a&&Number.isInteger(a.durationSeconds)&&a.durationSeconds>0);
 for(const a of cardio){lines.push({type:'name',text:cardioName?.(a.exerciseId)||'Kardio'},{type:'set',text:cardioLabel?.(a)||formatTime(a.durationSeconds)},{type:'gap'});}
 function splitLines(t,maxW,size,weight){ctx.font=weight+' '+size+'px system-ui, sans-serif';let lines=[],line='';for(const word of String(t).split(' ')){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxW&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
 const detailHeight=lines.reduce((sum,l)=>sum+(l.type==='gap'?32:l.type==='name'?splitLines(l.text,W-pad*2,36,'700').length*45+12:splitLines('• '+l.text,W-pad*2-12,30,'400').length*40+6),0);
 const H=1455+detailHeight+140;ctxCanvas.width=W;ctxCanvas.height=H;
 const fill=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
 fill('#101722',0,0,W,H);ctx.textBaseline='top';
 function write(t,x,y,size=34,color='#ffffff',weight='400'){ctx.fillStyle=color;ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.fillText(t,x,y)}
 function wrap(t,x,y,maxW,size=34,color='#fff',weight='400',lh=44){const wrapped=splitLines(t,maxW,size,weight);for(let i=0;i<wrapped.length;i++)write(wrapped[i],x,y+i*lh,size,color,weight);return y+wrapped.length*lh;}
 write('🏋 MOJA SIŁOWNIA',pad,55,48,'#73baff','700');write(s.planName||'Trening dowolny',pad,130,49,'#ffffff','700');write(new Date(s.date).toLocaleString('pl-PL'),pad,200,30,'#b7c5d7');
 fill('#213149',pad,270,W-pad*2,310);let sets=s.sets||[],vol=sets.reduce((a,x)=>a+(x.measurementType==='duration'?0:(Number(x.weight)||0)*(Number(x.reps)||0)),0),reps=sets.reduce((a,x)=>a+(x.measurementType==='duration'?0:(Number(x.reps)||0)),0),timed=sets.reduce((a,x)=>a+(x.measurementType==='duration'&&Number.isInteger(x.durationSeconds)&&x.durationSeconds>0?x.durationSeconds:0),0),cal=s.calories||estimateCalories(s),prCount=sets.filter(x=>x.pr?.length).length;
 const metrics=[['CZAS',formatTime(s.durationSeconds||0)],['ĆWICZENIA',String(groups.length+cardio.length)],['SERIE',String(sets.length)],[timed?'POWT. / IZOMETRIA':'POWTÓRZENIA',timed?reps+' / '+timed+' s':String(reps)],['OBJĘTOŚĆ',Math.round(vol).toLocaleString('pl-PL')+' kg'],['KCAL AKTYWNE',cal.active+' kcal']];metrics.forEach((m,i)=>{let x=pad+28+(i%2)*460,y=292+Math.floor(i/2)*96;write(m[0],x,y,24,'#9cb1cb');write(m[1],x,y+30,39,'#ffffff','700')});
 write('ZAANGAŻOWANE MIĘŚNIE',pad,625,36,'#ffffff','700');if(sets.length){await drawAnatomyPNG(ctx,s,pad,690,680);write('CZERWONY: GŁÓWNE    ŻÓŁTY: POMOCNICZE    SZARY: POZOSTAŁE',pad,1290,23,'#c8d5e5');}else{write('Brak serii siłowych — trening kardio',pad,790,35,'#c8d5e5');}if(cardio.length){write('Kardio: '+formatTime(cardio.reduce((n,a)=>n+a.durationSeconds,0))+(cal.cardio?' · '+cal.cardio.active+' kcal aktyw.':''),pad,1330,27,'#83bdff','700');}let y=1380;write('WYKONANE ĆWICZENIA',pad,y,36,'#ffffff','700');y+=75;
 for(const l of lines){if(l.type==='gap'){y+=22;fill('#34445a',pad,y,W-pad*2,2);y+=10}else if(l.type==='name'){y=wrap(l.text,pad,y,W-pad*2,36,'#83bdff','700',45)+12}else{y=wrap('• '+l.text,pad+12,y,W-pad*2-12,30,l.text.includes('PR:')?'#f5c46c':'#dce5f0','400',40)+6}}
 write(`🏆 Serie z rekordami: ${prCount}`,pad,y+15,30,'#f5c46c','700');write('Szacunek kalorii · zapis z Mojej Siłowni',pad,H-75,25,'#91a6c0');
 const blob=await new Promise(resolve=>ctxCanvas.toBlob(resolve,'image/png'));if(!blob){note('Nie udało się utworzyć obrazu');return}let filename='moja-silownia-trening-'+new Date(s.date).toISOString().slice(0,10)+'.png';let file=new File([blob],filename,{type:'image/png'});
 try{if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:'Mój trening'});return}}catch(err){if(err.name==='AbortError')return}
 let u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);note('Obraz PNG przygotowany')
}
