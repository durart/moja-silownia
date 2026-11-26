// Progressive ES module entry point. Classic inline UI remains compatible during migration.
import {detectRecords,isWorkingSet} from './records.js';
import {serializeBackup,parseBackup,isValidBackup,chooseBackup} from './storage.js';
import {validState,readState,selectInitialState,normalizeBaseState,recoverActiveState} from './state-core.js';
import {createStateStorage} from './state-storage.js';
import {canonicalExerciseId,projectCatalog,projectHistorySets} from './exercise-identity.mjs';
import {prepareExerciseMigration,persistExerciseMigration} from './exercise-migration.mjs';
const stateStorage=createStateStorage(window.localStorage);
const modules=Object.freeze({
 state:Object.freeze({validState,readState,selectInitialState,normalizeBaseState,recoverActiveState}),
 stateStorage,
 exerciseIdentity:Object.freeze({canonicalExerciseId,projectCatalog,projectHistorySets,prepareExerciseMigration,persistExerciseMigration}),
 records:Object.freeze({detectRecords,isWorkingSet}),
 storage:Object.freeze({serializeBackup,parseBackup,isValidBackup,chooseBackup})
});
Object.defineProperty(window,'MojaSilowniaModules',{value:modules,configurable:false,writable:false});
window.dispatchEvent(new Event('moja-silownia:modules-ready'));
