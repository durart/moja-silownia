// Progressive ES module entry point. Classic inline UI remains compatible during migration.
import {detectRecords,isWorkingSet} from './records.js';
import {serializeBackup,parseBackup,isValidBackup,chooseBackup} from './storage.js';
const modules=Object.freeze({
 records:Object.freeze({detectRecords,isWorkingSet}),
 storage:Object.freeze({serializeBackup,parseBackup,isValidBackup,chooseBackup})
});
Object.defineProperty(window,'MojaSilowniaModules',{value:modules,configurable:false,writable:false});
window.dispatchEvent(new Event('moja-silownia:modules-ready'));
