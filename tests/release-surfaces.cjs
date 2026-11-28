'use strict';
// Independent release expectations; never derive expected values from the page under test.
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const surfaces=Object.freeze({
 production:Object.freeze({version:'4.1.1',cache:'moja-silownia-shell-v64-4.1.1',storageKey:'moja-silownia-v01'}),
 preview:Object.freeze({version:'4.1.1',cache:'moja-silownia-preview-shell-v64-4.1.1',storageKey:'moja-silownia-preview-v01'})
});
const differences=Object.freeze({});
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
