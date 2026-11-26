import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
for(const prefix of ['', 'preview/']){
 const html=readFileSync(new URL('../'+prefix+'index.html',import.meta.url),'utf8');
 const init=html.slice(html.indexOf('let storageRecoveryBlocked=false;'),html.indexOf('if(!Array.isArray(state.plans))',html.indexOf('let storageRecoveryBlocked=false;')));
 const save=html.slice(html.indexOf('function save(){'),html.indexOf('/* Naprawa starszego zapisu'));
 const valid=JSON.stringify({exercises:[],active:[],sessions:[{id:1}]});
 function run(primary,backup,fail=false){
  const values=new Map([['main',primary],['backup',backup]].filter(([,v])=>v!==null));
  let reads=0;
  const localStorage={getItem(k){if(fail&&reads++===0)throw Error('read failure');return values.get(k)??null;},setItem(k,v){values.set(k,v);}};
  const ctx=vm.createContext({localStorage,key:'main',backupKey:'backup',corruptKey:'corrupt',seeds:[],readState(raw){try{return JSON.parse(raw)}catch{return null}},validState(v){return !!v},window:{addEventListener(){}},console:{error(){},warn(){}},alert(){}});
  vm.runInContext(init+'\nlet storageWarningShown=false;\n'+save,ctx);
  return {values,result:vm.runInContext('save()',ctx)};
 }
 test(prefix+' transient read failure cannot overwrite existing data',()=>{const r=run(valid,null,true);assert.equal(r.result,false);assert.equal(r.values.get('main'),valid);});
 test(prefix+' corrupt primary with valid backup blocks automatic write',()=>{const r=run('{',valid);assert.equal(r.result,false);assert.equal(r.values.get('main'),'{');assert.equal(r.values.get('backup'),valid);});
 test(prefix+' missing primary with existing backup blocks automatic write',()=>{const r=run(null,valid);assert.equal(r.result,false);assert.equal(r.values.has('main'),false);});
 test(prefix+' first launch can save',()=>{assert.equal(run(null,null).result,true);});
 test(prefix+' healthy existing state can save',()=>{assert.equal(run(valid,null).result,true);});
}
