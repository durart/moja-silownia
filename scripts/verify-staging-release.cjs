'use strict';
// A preview-only publication must match the verified candidate and leave all production files intact.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {surfaces}=require('../tests/release-surfaces.cjs');
const base='163a8e3818d2576e85730691c684eb89a8778ca4';
const candidate='fb760a2dd66e39c085fcd23709e72216ad4d7390';
const allowed=new Set([
 'preview/index.html','preview/sw.js','preview/muscle-fatigue-core.js',
 'tests/release-surfaces.cjs','tests/staging-release.test.cjs','tests/preview-upgrade-browser.cjs',
 'tests/progression-v184.test.cjs','tests/session-mode.test.cjs','tests/progression-v2-staging.test.cjs',
 'tests/progression-v2.test.cjs','tests/progress-blank-regression.test.cjs','tests/trainer-regression.test.mjs',
 'tests/production-progression-v2.test.cjs','tests/musclemap-hybrid.test.cjs','tests/calisthenics-programs.test.cjs',
 'tests/user-profile.test.mjs','tests/timed-workout-browser-smoke.cjs','tests/cardio-preview-browser-smoke.cjs',
 'tests/adaptive-browser.cjs','.github/workflows/progression-v184.yml',
 '.github/workflows/staging-release.yml','scripts/verify-staging-release.cjs','docs/staging-release-4.1.1.md'
]);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(surfaces.production.version===surfaces.preview.version){
 // Promotion must preserve the accepted preview and use the exact tested root runtime.
 for(const file of ['index.html','sw.js','muscle-fatigue-core.js']){
  assert.equal(git('diff','--name-only',candidate,'HEAD','--',file),'','Root candidate changed: '+file);
 }
 assert.equal(git('diff','--name-only',candidate,'HEAD','--','preview/'),'','Accepted preview changed');
 console.log('PASS: synchronized release root and complete preview match the verified candidate');
 process.exit(0);
}
const changed=git('diff','--name-only','--no-renames',base,'HEAD').split('\n').filter(Boolean);
assert.ok(changed.length>0);
for(const file of changed)assert.ok(allowed.has(file),'Unapproved change: '+file);
for(const file of ['preview/index.html','preview/sw.js','preview/muscle-fatigue-core.js'])assert.ok(changed.includes(file),file);
assert.equal(git('diff','--name-only',candidate,'HEAD','--','preview/'),'','Preview differs from fully verified candidate');
console.log('PASS: all production application files unchanged from '+base);
console.log('PASS: complete preview tree identical to '+candidate);
console.log('Allowed preview/CI changes: '+changed.length);
