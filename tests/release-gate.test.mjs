import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPaths, gatePassed, regressionPassed } from '../scripts/release-gate.mjs';
for (const [paths, expected] of [
 [['preview/index.html'],'staging'],
 [['preview/sw.js','preview/vendor/a.js'],'staging'],
 [['preview/index.html','index.html'],'production'],
 [['index.html'],'production'],
 [['preview/index.html','tests/a.mjs'],'infrastructure'],
 [['.github/workflows/release-gate.yml'],'infrastructure'],
 [['scripts/release-gate.mjs','index.html'],'infrastructure'],
 [['preview-other/index.html'],'production']
]) test(JSON.stringify(paths),()=>assert.equal(classifyPaths(paths),expected));
for (const paths of [[],['../preview/a'],['/preview/a'],['preview//a']]) test('reject '+JSON.stringify(paths),()=>assert.throws(()=>classifyPaths(paths)));
for (const [kind,regression,approval,enabled,expected] of [
 ['staging','success','skipped',false,true],
 ['staging','failure','skipped',true,false],
 ['production','success','skipped',true,false],
 ['production','success','success',false,false],
 ['production','success','success',true,true],
 ['infrastructure','success','success',true,true],
 ['infrastructure','success','cancelled',true,false],
 ['production','cancelled','success',true,false],
 ['unknown','success','success',true,false]
]) test([kind,regression,approval,enabled].join(' '),()=>assert.equal(gatePassed({kind,regression,approval,enabled}),expected));

for (const [kind,result,expected] of [
 ['staging','success',true], ['production','success',true], ['infrastructure','success',true],
 ['staging','failure',false], ['production','cancelled',false], ['infrastructure','skipped',false],
 ['unknown','success',false], ['', 'success',false], ['production','',false]
]) test('variant B regression '+kind+' '+result,()=>assert.equal(regressionPassed(kind,result),expected));
