import {syntheticRound} from './seed';
import {makeEvidence} from './evidence';
import {winningRange,type Round,type Prediction} from './domain';
export type Database = {rounds:Round[];predictions:Prediction[];profiles:Record<string,{name:string;rehearsals?:string[];watchAddress?:string}>;drafts:Record<string,string>;receipts?:Record<string,{hash:string;roundId:string;state:string}>};
export function refreshRehearsal(round:Round,time:number) {
  if(round.spec.mode!=='synthetic'||round.status==='resolved'||round.status==='void')return;
  if(time>=round.spec.resolution_deadline){round.status='void';return;}
  if(time>=round.spec.observation_time){
    round.evidence=makeEvidence(round.spec,'SYNTHETIC: The Last Projection domestic opening weekend USD $42,500,000',42_500_000,time,true);
    round.winner=winningRange(round.spec.ranges,42_500_000);round.status='resolved';
  }else if(time>=round.spec.entry_deadline)round.status='closed';
}
export function submitPractice(db:Database,participant:string,roundId:string,range:number,time:number):Prediction {
  const round=db.rounds.find(r=>r.id===roundId);if(!round)throw new Error('Round not found.');
  if(round.spec.mode==='competitive'||round.protocol)throw new Error('Use a wallet for protocol participation.');
  if(!Number.isInteger(range)||range<0||range>=round.spec.ranges.length)throw new Error('Choose one of the listed ranges.');
  if(round.spec.mode==='synthetic'&&(time>=round.spec.entry_deadline||round.status!=='open'))throw new Error('This rehearsal has closed. Start a new rehearsal.');
  const prior=db.predictions.find(p=>p.participant===participant&&p.roundId===roundId);
  if(prior){if(prior.range===range)return prior;throw new Error('This prediction is already confirmed.');}
  const prediction:Prediction={id:crypto.randomUUID(),participant,roundId,range,submittedAt:time,kind:'practice',state:'practice_confirmed'};
  db.predictions.push(prediction);round.histogram[range]+=1;
  return prediction;
}
export function startRehearsal(db:Database,participant:string,time:number) {
  const round=syntheticRound('rehearsal-'+crypto.randomUUID(),time);db.rounds.push(round);
  db.profiles[participant]??={name:'Guest forecaster'};
  db.profiles[participant].rehearsals??=[];
  db.profiles[participant].rehearsals!.push(round.id);return round;
}
