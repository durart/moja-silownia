(function(root){'use strict';
// Stable paths for the approved R6 library. No state mutations.
const aliases=Object.freeze({'cali-02':'seed-13','cali-09':'seed-26','cali-10':'seed-27','cali-11':'seed-67','cali-18':'seed-91','cali-19':'seed-89'});
const exerciseIds=Object.freeze([...Array.from({length:103},(_,i)=>'seed-'+i),...Array.from({length:40},(_,i)=>'cali-'+String(i+1).padStart(2,'0')).filter(id=>!Object.hasOwn(aliases,id)),...['treadmill-walk','treadmill-run','bike','stairmaster','elliptical','rowing'].map(id=>'cardio-'+id)]);
const categoryIds=Object.freeze(['Klatka piersiowa','Plecy','Barki','Triceps','Biceps','Przedramiona','Nogi','Brzuch','Łydki','Kalistenika','__all__','__cardio__','Pośladki','Uda','Rozgrzewka']);
const exerciseGraphics=Object.freeze(Object.fromEntries(exerciseIds.map(id=>[id,'./assets/graphics-r6/'+id+'.webp'])));
const categoryGraphics=Object.freeze(Object.fromEntries(categoryIds.map((id,i)=>[id,'./assets/graphics-r6/category-'+String(i+1).padStart(2,'0')+'.webp'])));
function exerciseGraphic(id){if(typeof id!=='string')return null;const canonical=Object.hasOwn(aliases,id)?aliases[id]:id;return Object.hasOwn(exerciseGraphics,canonical)?exerciseGraphics[canonical]:null;}
function categoryGraphic(id){return typeof id==='string'&&Object.hasOwn(categoryGraphics,id)?categoryGraphics[id]:null;}

root.ExerciseGraphics=Object.freeze({exerciseIds,exerciseGraphics,categoryGraphics,exerciseGraphic,categoryGraphic});
})(globalThis);
