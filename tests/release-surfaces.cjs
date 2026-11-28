'use strict';
// Independent release expectations; never derive expected values from the page under test.
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const surfaces=Object.freeze({
 production:Object.freeze({version:'4.1.0',cache:'moja-silownia-shell-v63-4.1.0',storageKey:'moja-silownia-v01'}),
 preview:Object.freeze({version:'4.1.1',cache:'moja-silownia-preview-shell-v64-4.1.1',storageKey:'moja-silownia-preview-v01'})
});
const differences=Object.freeze({
 'muscle-fatigue-core.js':Object.freeze({production:'e5f8af284fc5ce8f9858f19856d62b5390a7a950',preview:'7b1277692edfa6c029bb7f43246ef64fd9b8ba30'})
});
const literal=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function versionPattern(surface,prefix='v',suffix=''){
 return new RegExp(literal(prefix+surfaces[surface].version+suffix));
}
function cachePattern(surface){return new RegExp(literal(surfaces[surface].cache));}
function blobSha(buffer){return createHash('sha1').update('blob '+buffer.length+'\0').update(buffer).digest('hex');}
function assertParity(path,production,preview){
 if(surfaces.production.version!==surfaces.preview.version&&Object.hasOwn(differences,path)){
  assert.equal(blobSha(production),differences[path].production,path+' production baseline');
  assert.equal(blobSha(preview),differences[path].preview,path+' verified preview candidate');
 }else assert.deepEqual(production,preview,path);
}
module.exports=Object.freeze({surfaces,versionPattern,cachePattern,assertParity,blobSha});
