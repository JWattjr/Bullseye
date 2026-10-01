import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import type {GenLayerClient, TransactionHash} from 'genlayer-js/types';
import {studionet} from 'genlayer-js/chains';
import {TransactionStatus,TransactionHashVariant} from 'genlayer-js/types';
function successfulFinalized(receipt:unknown){
  const r=receipt as {statusName?:string;status_name?:string;txExecutionResultName?:string;consensus_data?:{leader_receipt?:Array<{execution_result?:string;result?:{status?:string}}>}};
  const leader=r.consensus_data?.leader_receipt?.[0];
  return (r.statusName??r.status_name)==='FINALIZED'&&['SUCCESS','FINISHED_WITH_RETURN'].includes(r.txExecutionResultName??leader?.execution_result??'')&&leader?.result?.status!=='rollback';
}
type Manifest={contract:`0x${string}`;network:string;roundId:string;transactions:Record<string,`0x${string}`>;record?:unknown};
const file='docs/proofs/manifest.json';
export default async function main(client:GenLayerClient<typeof studionet>){
  mkdirSync('docs/proofs',{recursive:true});mkdirSync('public',{recursive:true});
  const manifest:Manifest=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{contract:process.env.BULLSEYE_CONTRACT,network:'studionet',roundId:'barbie-network-demo',transactions:{}};
  const save=()=>writeFileSync(file,JSON.stringify(manifest,null,2));
  const step=process.env.BULLSEYE_STEP??'proof';
  async function finalized(hash:`0x${string}`,name:string){
    const receipt=await client.waitForTransactionReceipt({hash:hash as TransactionHash,status:TransactionStatus.FINALIZED,retries:12,interval:5000});
    writeFileSync('docs/proofs/'+name+'.json',JSON.stringify(receipt,(_,v)=>typeof v==='bigint'?v.toString():v,2));
    if(!successfulFinalized(receipt))throw new Error('Finalized execution did not succeed: '+name);
    console.log(name,hash,'FINALIZED + successful execution');return receipt;
  }
  async function write(name:string,method:string,args:Parameters<typeof client.writeContract>[0]['args']){
    const hash=await client.writeContract({address:manifest.contract,functionName:method,args,value:0n});
    manifest.transactions[name]=hash;save();await finalized(hash,name);
    const children=await client.getTriggeredTransactionIds({hash:hash as TransactionHash});
    for(let i=0;i<children.length;i++){manifest.transactions[name+'-callback-'+i]=children[i];save();await finalized(children[i],name+'-callback-'+i);}
  }
  if(step==='deploy'){
    const hash=await client.deployContract({code:readFileSync('contracts/bullseye.py','utf8'),args:[]});
    manifest.transactions.deploy=hash;save();const receipt=await finalized(hash,'deploy');
    manifest.contract=receipt.recipient as `0x${string}`;save();
  }
  if(step==='spec'){
    const time=Math.floor(Date.now()/1000);
    const spec={event:'Barbie (2023), 2023-07-21 to 2023-07-23',metric:'domestic opening-weekend box-office revenue',source_url:'https://www.the-numbers.com/movie/Barbie-(2023)',geography:'United States and Canada',currency:'USD',unit:'dollars',scale:1,rounding:'exact published integer; no rounding',ranges:[{lower:0,upper:100000000},{lower:100000000,upper:150000000},{lower:150000000,upper:200000000},{lower:200000000,upper:null}],entry_deadline:time+90,observation_time:time+95,resolution_deadline:time+3600,correction_policy:'first successful consensus observation; ignore later corrections',missing_evidence:'pending until deadline then void',mode:'historical'};
    const proposal='Forecast Barbie (2023) domestic opening-weekend box-office revenue for July 21–23, 2023 in United States and Canada, in exact integer USD dollars, reported at https://www.the-numbers.com/movie/Barbie-(2023). Historical practice only. All ranges, deadlines, correction and missing-evidence rules are exactly the attached canonical specification.';
    await write('specification','propose',[manifest.roundId,proposal,JSON.stringify(spec)]);
  }
  if(step==='adjudicate')await write('adjudication','adjudicate',[manifest.roundId]);
  if(step==='resume-adjudicate'){
    const hash=manifest.transactions.adjudication;await finalized(hash,'adjudication');
    const children=await client.getTriggeredTransactionIds({hash:hash as TransactionHash});
    for(let i=0;i<children.length;i++){manifest.transactions['adjudication-callback-'+i]=children[i];save();await finalized(children[i],'adjudication-callback-'+i);}
  }
  if(step==='proof'||step==='adjudicate'||step==='spec'||step==='resume-adjudicate'){
    const record=await client.readContract({address:manifest.contract,functionName:'get_round',args:[manifest.roundId],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
    manifest.record=typeof record==='string'?JSON.parse(record):record;save();
    writeFileSync('public/protocol-proof.json',JSON.stringify(manifest,null,2));console.log('Saved finalized state projection.');
  }
}
