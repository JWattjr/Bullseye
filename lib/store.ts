import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {historicalRounds,addHistoricalRounds} from './seed';
import {addUpcomingRounds} from './upcoming';
import type {Database} from './practice';
export type {Database} from './practice';
export {refreshRehearsal,startRehearsal,submitPractice} from './practice';
const directory=process.env.BULLSEYE_DATA_DIR??join(process.cwd(),'.data');
const file=join(directory,'league.json');
let queue:Promise<unknown>=Promise.resolve();
export function transaction<T>(action:(db:Database)=>T|Promise<T>):Promise<T> {
  const operation=queue.then(async()=>{
    await mkdir(directory,{recursive:true});
    let db:Database;
    try { db=JSON.parse(await readFile(file,'utf8')) as Database; }
    catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error; db={rounds:historicalRounds(),predictions:[],profiles:{},drafts:{}};}
    addHistoricalRounds(db.rounds);
    addUpcomingRounds(db.rounds);
    const result=await action(db);
    const temporary=file+'.'+randomUUID()+'.tmp';
    await writeFile(temporary,JSON.stringify(db),{mode:0o600});
    await rename(temporary,file);
    return result;
  });
  queue=operation.catch(()=>undefined);
  return operation;
}
export const guestToken=()=>randomBytes(32).toString('hex');
