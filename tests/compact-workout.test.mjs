import test from 'node:test';
import assert from 'node:assert/strict';
import { isComplete, resolveOpenCard, restoreSelection, extendDeadline } from '../modules/compact-workout-core.mjs';
const c=(key,done,total)=>({key,done,total});
const prev=(...cards)=>new Map(cards.map(card=>[card.key,card]));
test('opens first incomplete and never treats zero rows as finished',()=>{
  assert.equal(resolveOpenCard([c('a',3,3),c('b',0,0)],null,new Map(),false),'b');
  assert.equal(isComplete(c('b',0,0)),false);
});
test('advances only on newly completed selected exercise',()=>{
  assert.equal(resolveOpenCard([c('a',2,2),c('b',0,2)],'a',prev(c('a',1,2)),true),'b');
  assert.equal(resolveOpenCard([c('a',1,1),c('b',0,2)],'a',prev(c('a',1,2)),true),'a');
  assert.equal(resolveOpenCard([c('a',2,2)],'a',prev(c('a',1,2)),true),null);
});
test('respects deliberate collapse and permits reopening completed cards',()=>{
  assert.equal(resolveOpenCard([c('a',0,2)],null,new Map(),true),null);
  assert.equal(resolveOpenCard([c('a',2,2)],'a',prev(c('a',2,2)),true),'a');
});
test('recovers from removed selection and wraps to earlier unfinished exercise',()=>{
  assert.equal(resolveOpenCard([c('b',0,2)],'a',new Map(),true),'b');
  assert.equal(resolveOpenCard([c('a',0,2),c('b',2,2)],'b',prev(c('b',1,2)),true),'a');
});
test('restores only same workout, including intentionally closed state',()=>{
  assert.deepEqual(restoreSelection('{"session":"s","open":null}','s'),{initialized:true,open:null});
  assert.deepEqual(restoreSelection('{"session":"s","open":"slot:1"}','s'),{initialized:true,open:'slot:1'});
  assert.deepEqual(restoreSelection('{"session":"other","open":"a"}','s'),{initialized:false,open:null});
  assert.deepEqual(restoreSelection('invalid','s'),{initialized:false,open:null});
});
test('rest extension preserves current deadline and cannot restart an expired timer',()=>{
  assert.equal(extendDeadline(10000,5000),25000);
  assert.equal(extendDeadline(5000,5000),null);
  assert.equal(extendDeadline(null,5000),null);
});
