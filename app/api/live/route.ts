import {cookies} from 'next/headers';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {TransactionHashVariant,type TransactionHash} from 'genlayer-js/types';
import {readClient,successfulFinalized} from '@/lib/protocol';
import {transaction} from '@/lib/store';
import {type Round,type Specification,type Prediction} from '@/lib/domain';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const final=TransactionHashVariant.LATEST_FINAL;
async function config(){const proof=JSON.parse(await readFile(join(process.cwd(),'public/protocol-proof.json'),'utf8'));return {contract:proof.contract as `0x${string}`,client:readClient()};}
export async function POST(request:Request){
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Same-origin request required.'},{status:403});
  const token=(await cookies()).get('bullseye_guest')?.value;if(!token||!/^[a-f0-9]{64}$/.test(token))return Response.json({error:'Load the league before connecting.'},{status:401});
  try{
    const body=await request.json();const {contract,client}=await config();
    if(body.action==='watch'){
      if(!/^0x[a-fA-F0-9]{40}$/.test(body.address))throw new Error('Invalid wallet address.');
      if(process.env.NEXT_PUBLIC_PRACTICE_STORAGE!=='browser')await transaction(db=>{db.profiles[token]??={name:'Guest forecaster'};db.profiles[token].watchAddress=body.address.toLowerCase();});return Response.json({saved:true});
    }
    if(body.action==='receipt'){
      if(!/^0x[a-fA-F0-9]{64}$/.test(body.hash))throw new Error('Invalid transaction hash.');
      const receipt=await client.getTransaction({hash:body.hash as TransactionHash});
      const loose=receipt as unknown as Record<string,unknown>;
      if(String(loose.recipient??loose.to_address).toLowerCase()!==contract.toLowerCase())throw new Error('Receipt targets a different contract.');
      const rawStatus=String(loose.statusName??loose.status_name??'SUBMITTED');
      const state=successfulFinalized(receipt)?'finalized':rawStatus==='FINALIZED'?'failed':rawStatus==='ACCEPTED'?'provisional':rawStatus.toLowerCase();
      if(process.env.NEXT_PUBLIC_PRACTICE_STORAGE!=='browser')await transaction(db=>{db.receipts??={};db.receipts[body.hash]={hash:body.hash,roundId:'guest-'+token.slice(0,8),state};});return Response.json({state});
    }
    if(body.action!=='sync')throw new Error('Unknown live action.');
    const ids=await client.readContract({address:contract,functionName:'get_round_ids',args:[],transactionHashVariant:final}) as string[];
    const results: {round:Round;entries:Prediction[]}[]=[];
    // Cap indexing work per request. The contract caps each round at 200 players.
    for(const id of ids.slice(-20)){
      const raw=await client.readContract({address:contract,functionName:'get_round',args:[id],transactionHashVariant:final});
      const record=JSON.parse(String(raw)) as {spec:Specification;status:string;specification_hash:string;histogram:number[];evidence:Round['evidence'];winner:number|null};
      const table=JSON.parse(String(await client.readContract({address:contract,functionName:'get_entry_table',args:[id],transactionHashVariant:final}))) as {participant:string;entry:{range:number;guess?:number;submitted_at:number}}[];
      const title=record.spec.event.split(', ')[0];
      results.push({round:{...record,id,title,year:record.spec.mode==='competitive'?'LIVE':'HISTORICAL',description:'Validator-validated rules and evidence, from finalized StudioNet state.',artwork:'lime',protocol:{contract,specificationTx:'See protocol transaction history',adjudicationTx:null,status:'finalized_state'}},entries:table.map(({participant,entry})=>({id:contract+':'+id+':'+participant,participant:participant.toLowerCase(),roundId:id,range:entry.range,...(entry.guess?{guess:entry.guess}:{}),submittedAt:entry.submitted_at,kind:'protocol',state:'finalized'}))});
    }
    if(process.env.NEXT_PUBLIC_PRACTICE_STORAGE!=='browser')await transaction(db=>{for(const {round,entries} of results){const index=db.rounds.findIndex(r=>r.id===round.id);if(index<0)db.rounds.push(round);else db.rounds[index]=round;for(const p of entries){const old=db.predictions.findIndex(e=>e.id===p.id);if(old<0)db.predictions.push(p);else db.predictions[old]=p;db.profiles[p.participant]??={name:p.participant.slice(0,6)+'…'+p.participant.slice(-4)};}}});
    return Response.json({synced:results.length,records:results});
  }catch(error){return Response.json({error:error instanceof Error?error.message:'Live synchronization failed. Practice is still available.'},{status:502});}
}
