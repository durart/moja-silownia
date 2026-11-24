// Progressive ES module entry point. Classic inline UI remains compatible during migration.
import {detectRecords,isWorkingSet} from './records.js';
import {serializeBackup,parseBackup,isValidBackup,chooseBackup} from './storage.js';
import {validState,readState,selectInitialState,normalizeBaseState,recoverActiveState} from './state-core.js';
import {createStateStorage} from './state-storage.js';
const stateStorage=createStateStorage(window.localStorage,{key:'moja-silownia-preview-v01'});
const modules=Object.freeze({
 state:Object.freeze({validState,readState,selectInitialState,normalizeBaseState,recoverActiveState}),
 stateStorage,
 records:Object.freeze({detectRecords,isWorkingSet}),
 storage:Object.freeze({serializeBackup,parseBackup,isValidBackup,chooseBackup})
});
Object.defineProperty(window,'MojaSilowniaModules',{value:modules,configurable:false,writable:false});
window.dispatchEvent(new Event('moja-silownia:modules-ready'));
