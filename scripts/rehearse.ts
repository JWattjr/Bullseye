import {startRehearsal,submitPractice,refreshRehearsal,type Database} from '../lib/practice';
import {score} from '../lib/domain';
const db:Database={rounds:[],predictions:[],profiles:{},drafts:{}};
const time=Math.floor(Date.now()/1000);const round=startRehearsal(db,'rehearsal',time);const prediction=submitPractice(db,'rehearsal',round.id,1,time);
console.log('SYNTHETIC local domain rehearsal, no protocol transaction:',prediction);
await new Promise(resolve=>setTimeout(resolve,11000));
refreshRehearsal(round,Math.floor(Date.now()/1000));console.log({round,score:score(prediction,round)});
