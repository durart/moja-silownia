import {loadConfig,saveConfig,clearConfig} from "./garmin-config.mjs";
import {syncMock} from "./garmin-sync.mjs";
import {loadSnapshot,saveSnapshot,clearSnapshot} from "./garmin-storage.mjs";

const settings=document.getElementById("garminSettings");
const recovery=document.getElementById("garminRecovery");
if(settings && recovery){
  settings.innerHTML='<h2>Integracja Garmin — test</h2><form><label>Adres prywatnego Workera<input name="endpoint" type="url" required placeholder="https://example.workers.dev/health"></label><label>Token dostępu<input name="token" type="password" autocomplete="off"></label><p>Token zapisany w pamięci przeglądarki może być dostępny dla skryptów tej samej domeny.</p><label><input name="consent" type="checkbox" required> Zapamiętaj na tym urządzeniu</label><button type="submit">Zapisz konfigurację</button></form><button type="button" data-action="sync">Synchronizuj Garmin</button><button type="button" data-action="disconnect">Odłącz Garmin</button><p role="status"></p>';
  const form=settings.querySelector("form"),status=settings.querySelector('[role="status"]');
  const syncButton=settings.querySelector('[data-action="sync"]'),disconnect=settings.querySelector('[data-action="disconnect"]');
  function render(){
    const config=loadConfig(),snapshot=loadSnapshot();
    syncButton.disabled=!config;disconnect.disabled=!config;
    recovery.replaceChildren();
    const heading=document.createElement("h2");heading.textContent="Regeneracja — dane testowe";recovery.append(heading);
    const summary=document.createElement("p");
    if(snapshot && config){const d=snapshot.data;summary.textContent="Sen: "+Math.floor(d.sleepSeconds/3600)+" h "+Math.floor(d.sleepSeconds%3600/60)+" min · HRV: "+d.hrvMs+" ms · Body Battery: "+d.bodyBattery+"/100 · Kroki: "+d.steps+" · Masa: "+d.weightKg+" kg. Synchronizacja: "+new Date(snapshot.syncedAt).toLocaleString("pl-PL");}
    else summary.textContent="Brak zsynchronizowanych danych testowych.";
    recovery.append(summary);
  }
  const initial=loadConfig();if(initial)form.elements.endpoint.value=initial.endpoint;
  form.addEventListener("submit",event=>{event.preventDefault();try{const previous=loadConfig();const endpoint=form.elements.endpoint.value;const token=form.elements.token.value || (previous?.endpoint===endpoint?previous.token:"");clearSnapshot();saveConfig({endpoint,token});form.elements.token.value="";status.textContent="Zapisano konfigurację.";render();}catch{status.textContent="Nie udało się zapisać konfiguracji."; }});
  syncButton.addEventListener("click",async()=>{const config=loadConfig();if(!config)return;syncButton.disabled=true;disconnect.disabled=true;for(const field of form.elements)field.disabled=true;status.textContent="Synchronizacja…";try{saveSnapshot(await syncMock(config.token,globalThis.fetch,config.endpoint));status.textContent="Pobrano dane testowe.";}catch{status.textContent="Błąd synchronizacji. Sprawdź połączenie i token.";}finally{for(const field of form.elements)field.disabled=false;render();}});
  disconnect.addEventListener("click",()=>{try{clearConfig();clearSnapshot();form.reset();status.textContent="Odłączono Garmin.";render();}catch{status.textContent="Nie udało się usunąć konfiguracji.";}});
  render();
}
