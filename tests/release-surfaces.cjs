'use strict';
// Independent release expectations; never derive expected values from the page under test.
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const expectations=require('./release-expectations.json');
const surfaces=Object.freeze(Object.fromEntries(Object.entries(expectations.surfaces).map(([name,value])=>[name,Object.freeze({...value})])));
const differences=Object.freeze(expectations.differences);
const literal=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function versionPattern(surface,prefix='v',suffix=''){
 return new RegExp(literal(prefix+surfaces[surface].version+suffix));
}
function cachePattern(surface){return new RegExp(literal(surfaces[surface].cache));}
function assetUrl(surface,name,fallback){const version=expectations.assetVersions?.[surface]?.[name]??fallback;assert.ok(Number.isInteger(version),name+' pinned version');return name+'?v='+version;}
function blobSha(buffer){return createHash('sha1').update('blob '+buffer.length+'\0').update(buffer).digest('hex');}
function assertParity(path,production,preview){
 if(surfaces.production.version!==surfaces.preview.version&&Object.hasOwn(differences,path)){
  assert.equal(blobSha(production),differences[path].production,path+' production baseline');
  assert.equal(blobSha(preview),differences[path].preview,path+' verified preview candidate');
 }else assert.deepEqual(production,preview,path);
}
module.exports=Object.freeze({surfaces,versionPattern,cachePattern,assetUrl,assertParity,blobSha});
