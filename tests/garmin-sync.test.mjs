import {test} from "node:test";
import assert from "node:assert/strict";
import {syncMock,validateMock} from "../garmin/garmin-sync.mjs";
import {saveConfig,loadConfig,clearConfig} from "../garmin/garmin-config.mjs";
import {saveSnapshot,loadSnapshot,clearSnapshot} from "../garmin/garmin-storage.mjs";
const payload={status:"ok",mode:"mock",authenticated:true,data:{steps:5000,weightKg:80,sleepSeconds:27000,hrvMs:45,bodyBattery:70}};
const endpoint="https://example.workers.dev/health";
function memory(){const map=new Map();return {setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k)??null,removeItem:k=>map.delete(k)};}
test("valid mock payload",()=>assert.deepEqual(validateMock(payload).data,payload.data));
test("reject live and invalid data",()=>{assert.throws(()=>validateMock({...payload,mode:"live"}));assert.throws(()=>validateMock({...payload,data:{...payload.data,bodyBattery:101}}));});
test("reject insecure endpoint before request",async()=>{await assert.rejects(syncMock("test",()=>assert.fail("unexpected request"),"http://example.workers.dev/health"));});
test("request uses bearer and disables cache",async()=>{const result=await syncMock("test",async(url,options)=>{assert.equal(url,endpoint);assert.equal(options.headers.Authorization,"Bearer test");assert.equal(options.cache,"no-store");assert.equal(options.redirect,"error");return {ok:true,json:async()=>payload};},endpoint);assert.equal(result.data.steps,5000);});
test("reject unauthorized response",async()=>{await assert.rejects(syncMock("test",async()=>({status:401,ok:false}),endpoint));});
test("configuration lifecycle",()=>{const storage=memory();saveConfig({endpoint,token:"test"},storage);assert.equal(loadConfig(storage).token,"test");clearConfig(storage);assert.equal(loadConfig(storage),null);});
test("snapshot lifecycle preserves unrelated state",()=>{const storage=memory();storage.setItem("workouts","unchanged");saveSnapshot({...validateMock(payload),syncedAt:new Date().toISOString()},storage);assert.equal(loadSnapshot(storage).data.steps,5000);clearSnapshot(storage);assert.equal(loadSnapshot(storage),null);assert.equal(storage.getItem("workouts"),"unchanged");});
