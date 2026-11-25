import {loadConfig,saveConfig,clearConfig} from "./garmin-config.mjs";
import {syncLive} from "./garmin-sync.mjs";
import {loadLiveSnapshot as loadSnapshot,saveLiveSnapshot as saveSnapshot,clearLiveSnapshot as clearSnapshot} from "./garmin-storage.mjs";

const settings=document.getElementById("garminSettings");
const recovery=document.getElementById("garminRecovery");
if(settings && recovery){
  settings.innerHTML='<h2>Integracja Garmin</h2><form><label>Adres prywatnego Workera<input name="endpoint" type="url" required placeholder="https://example.workers.dev/garmin/gym"></label><label>Token dostępu<input name="token" type="password" autocomplete="off"></label><p>Token zapisany w pamięci przeglądarki może być dostępny dla skryptów tej samej domeny.</p><label><input name="consent" type="checkbox" required> Zapamiętaj na tym urządzeniu</label><button type="submit">Zapisz konfigurację</button></form><button type="button" data-action="sync">Synchronizuj Garmin</button><button type="button" data-action="disconnect">Odłącz Garmin</button><p role="status"></p>';
  const form=settings.querySelector("form"),status=settings.querySelector('[role="status"]');
  const syncButton=settings.querySelector('[data-action="sync"]'),disconnect=settings.querySelector('[data-action="disconnect"]');
  function render(){
    const config=loadConfig(),snapshot=loadSnapshot();
    syncButton.disabled=!config;disconnect.disabled=!config;
    recovery.replaceChildren();
    const heading=document.createElement("h2");heading.textContent="Regeneracja · Garmin";recovery.append(heading);
    if (!snapshot || !config) {
      const message=document.createElement("p");
      message.textContent="Brak zsynchronizowanych danych Garmin.";
      recovery.append(message);
      return;
    }
    const d=snapshot.data;
    const grid=document.createElement("div");
    grid.style.cssText="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px";
    const duration=d.sleep?.sleepSeconds;
    const statusLabels={BALANCED:"Zrównoważone",UNBALANCED:"Niezrównoważone",LOW:"Niskie",POOR:"Słabe"};
    const rows=[
      ["Czas snu",duration==null?"—":Math.floor(duration/3600)+" h "+Math.floor(duration%3600/60)+" min",d.sleep?.date],
      ["Sleep Score",d.sleep?.sleepScore==null?"—":d.sleep.sleepScore+"/100",d.sleep?.date],
      ["HRV",d.hrv?.lastNightAvgMs==null?"—":d.hrv.lastNightAvgMs+" ms", [d.hrv?.date,statusLabels[d.hrv?.status]].filter(Boolean).join(" · ")],
      ["Body Battery",d.bodyBattery?.value==null?"—":d.bodyBattery.value+"/100",d.bodyBattery?.date],
      ["Masa ciała",d.weight?.weightKg==null?"—":d.weight.weightKg.toLocaleString("pl-PL")+" kg",d.weight?.date]
    ];
    for(const [label,value,date] of rows){
      const tile=document.createElement("div");
      tile.style.cssText="padding:12px;border:1px solid #64748b55;border-radius:10px";
      const title=document.createElement("small");title.textContent=label;
      const metric=document.createElement("strong");metric.style.display="block";metric.textContent=value;
      const detail=document.createElement("small");detail.textContent=date||"Brak pomiaru";
      tile.append(title,metric,detail);grid.append(tile);
    }
    const summary=document.createElement("p");
    summary.textContent="Ostatnia synchronizacja: "+new Date(snapshot.syncedAt).toLocaleString("pl-PL")+(snapshot.status==="partial"?" · częściowa":"");
    recovery.append(grid,summary);
  }
  const initial=loadConfig();if(initial)form.elements.endpoint.value=initial.endpoint;
  form.addEventListener("submit",event=>{event.preventDefault();try{const previous=loadConfig();const endpoint=form.elements.endpoint.value;const token=form.elements.token.value || (previous?.endpoint===endpoint?previous.token:"");saveConfig({endpoint,token});const current=loadConfig();if(previous?.endpoint!==current.endpoint||previous?.token!==current.token)clearSnapshot();form.elements.token.value="";status.textContent="Zapisano konfigurację.";render();}catch{status.textContent="Nie udało się zapisać konfiguracji."; }});
  syncButton.addEventListener("click",async()=>{const config=loadConfig();if(!config)return;syncButton.disabled=true;disconnect.disabled=true;for(const field of form.elements)field.disabled=true;status.textContent="Synchronizacja…";try{const snapshot=saveSnapshot(await syncLive(config.token,globalThis.fetch,config.endpoint));if(snapshot.data.weight)window.importGarminWeight(snapshot.data.weight);status.textContent=snapshot.status==="partial"?"Synchronizacja częściowa. Zachowano wcześniejsze pomiary.":"Pobrano dane Garmin.";}catch{status.textContent="Błąd synchronizacji. Sprawdź połączenie i token.";}finally{for(const field of form.elements)field.disabled=false;render();}});
  disconnect.addEventListener("click",()=>{try{clearConfig();clearSnapshot();form.reset();status.textContent="Odłączono Garmin.";render();}catch{status.textContent="Nie udało się usunąć konfiguracji.";}});
  render();
}


window.fillGarminPreWorkout = function() {
  if (!loadConfig()) return;
  const snapshot = loadSnapshot();
  if (!snapshot) return;
  const today = new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const {sleep,bodyBattery} = snapshot.data;
  const fill = (id,value) => {
    const field = document.getElementById(id);
    if (field && field.value === "" && value != null) field.value = String(value);
  };
  if (sleep?.date === today) {
    fill("preSleep",sleep.sleepSeconds == null ? null : Math.round(sleep.sleepSeconds/360)/10);
    fill("preSleepScore",sleep.sleepScore);
  }
  if (bodyBattery?.date === today && Date.now()-Date.parse(snapshot.syncedAt) <= 3600000 &&
      Date.now() >= Date.parse(snapshot.syncedAt)) fill("preBattery",bodyBattery.value);
};
