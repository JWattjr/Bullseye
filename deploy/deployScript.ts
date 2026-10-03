import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import type {GenLayerClient, TransactionHash} from 'genlayer-js/types';
import {studionet} from 'genlayer-js/chains';
import {TransactionStatus,TransactionHashVariant} from 'genlayer-js/types';
// Studio's native EOA transfers have no consensus execution receipt. Verify
// explicit value credit separately; never reinterpret NO_MAJORITY as execution success.
function creditedTransfer(receipt:Record<string,unknown>,from:string,to?:string,amount?:string){return String(receipt.statusName??receipt.status_name)==='FINALIZED'&&receipt.value_credited===true&&receipt.consensus_data===null&&String(receipt.from_address??receipt.sender).toLowerCase()===from.toLowerCase()&&(!to||String(receipt.to_address??receipt.recipient).toLowerCase()===to.toLowerCase())&&(!amount||String(receipt.value)===amount);}

function successfulFinalized(receipt:unknown){
  const r=receipt as {statusName?:string;status_name?:string;txExecutionResultName?:string;consensus_data?:{leader_receipt?:Array<{execution_result?:string;result?:{status?:string}}>}};
  const leader=r.consensus_data?.leader_receipt?.[0];
  return (r.statusName??r.status_name)==='FINALIZED'&&['SUCCESS','FINISHED_WITH_RETURN'].includes(r.txExecutionResultName??leader?.execution_result??'')&&leader?.result?.status!=='rollback';
}
type Manifest={contract:`0x${string}`;network:string;roundId:string;transactions:Record<string,`0x${string}`>;record?:unknown};
const file='docs/proofs/manifest.json';
export default async function main(client:GenLayerClient<typeof studionet>){
  if(process.env.BULLSEYE_STEP?.startsWith('pool-')){await poolRun(client);return;}
  if(process.env.BULLSEYE_STEP?.startsWith('round-pool-')){await roundPoolRun(client);return;}
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
    // Long enough for the open-round callback to finalize and a pool stake to land.
    const entry=Number(process.env.BULLSEYE_ENTRY_SECONDS??90);
    const spec={event:'Barbie (2023), 2023-07-21 to 2023-07-23',metric:'domestic opening-weekend box-office revenue',source_url:'https://www.the-numbers.com/movie/Barbie-(2023)',geography:'United States and Canada',currency:'USD',unit:'dollars',scale:1,rounding:'exact published integer; no rounding',ranges:[{lower:0,upper:100000000},{lower:100000000,upper:150000000},{lower:150000000,upper:200000000},{lower:200000000,upper:null}],entry_deadline:time+entry,observation_time:time+entry+5,resolution_deadline:time+3600,correction_policy:'first successful consensus observation; ignore later corrections',missing_evidence:'pending until deadline then void',mode:'historical'};
    const proposal='Forecast Barbie (2023) domestic opening-weekend box-office revenue for July 21–23, 2023 in United States and Canada, in exact integer USD dollars, reported at https://www.the-numbers.com/movie/Barbie-(2023). Historical practice only. All ranges, deadlines, correction and missing-evidence rules are exactly the attached canonical specification.';
    await write('specification','propose',[manifest.roundId,proposal,JSON.stringify(spec)]);
  }
  if(step==='predict')await write('prediction','predict_exact',[manifest.roundId,2,160000000]);
  if(step==='adjudicate')await write('adjudication','adjudicate',[manifest.roundId]);
  if(step==='resume-adjudicate'){
    const hash=manifest.transactions.adjudication;await finalized(hash,'adjudication');
    const children=await client.getTriggeredTransactionIds({hash:hash as TransactionHash});
    for(let i=0;i<children.length;i++){manifest.transactions['adjudication-callback-'+i]=children[i];save();await finalized(children[i],'adjudication-callback-'+i);}
  }
  if(step==='proof'||step==='predict'||step==='adjudicate'||step==='spec'||step==='resume-adjudicate'){
    const record=await client.readContract({address:manifest.contract,functionName:'get_round',args:[manifest.roundId],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
    manifest.record=typeof record==='string'?JSON.parse(record):record;save();
    writeFileSync('public/protocol-proof.json',JSON.stringify(manifest,null,2));console.log('Saved finalized state projection.');
  }
}

async function poolRun(client:GenLayerClient<typeof studionet>){
  mkdirSync('docs/proofs/pools',{recursive:true});
  const path='docs/proofs/pools/manifest.json';
  const proof=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{network:'StudioNet',simulated:true,transactions:{}};
  const save=()=>{writeFileSync(path,JSON.stringify(proof,null,2));writeFileSync('public/pool-proof.json',JSON.stringify(proof,null,2));};
  async function final(hash:TransactionHash,name:string){
    const receipt=await client.waitForTransactionReceipt({hash,status:TransactionStatus.FINALIZED,retries:24,interval:5000});
    writeFileSync('docs/proofs/pools/'+name+'.json',JSON.stringify(receipt,(_,v)=>typeof v==='bigint'?v.toString():v,2));
    if(name.startsWith('claim-child-')&&creditedTransfer(receipt as unknown as Record<string,unknown>,proof.contract)){
      console.log(name,hash,'FINALIZED native value credit (no consensus execution)');return receipt;
    }
    if(!successfulFinalized(receipt))throw Error('Unsuccessful finalized execution: '+name);
    console.log(name,hash,'FINALIZED and successful');return receipt;
  }
  async function write(name:string,method:string,args:Parameters<typeof client.writeContract>[0]['args'],value=0n){
    const hash=await client.writeContract({address:proof.contract,functionName:method,args,value});proof.transactions[name]=hash;save();await final(hash as TransactionHash,name);
    const children=await client.getTriggeredTransactionIds({hash});
    for(let i=0;i<children.length;i++){proof.transactions[name+'-child-'+i]=children[i];save();await final(children[i] as TransactionHash,name+'-child-'+i);}
  }
  const step=process.env.BULLSEYE_STEP;
  if(step==='pool-deploy'){
    const hash=await client.deployContract({code:readFileSync('contracts/pool_rehearsal.py','utf8'),args:[]});proof.transactions.deploy=hash;save();
    proof.contract=(await final(hash as TransactionHash,'deploy')).recipient;save();
  }
  if(step==='pool-start'){
    await write('start','start_demo',[]);
    const ids=await client.readContract({address:proof.contract,functionName:'get_round_ids',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}) as string[];
    proof.roundId=ids.at(-1);save();
    await write('stake','stake',[proof.roundId,1],2n*10n**18n);
  }
  if(step==='pool-resolve'){await write('resolve','resolve',[proof.roundId]);await write('claim','claim',[proof.roundId]);}
  if(step==='pool-proof'){
    const transfer=JSON.parse(readFileSync('docs/proofs/pools/claim-child-0.json','utf8'));
    const deposit=JSON.parse(readFileSync('docs/proofs/pools/stake.json','utf8'));
    if(!creditedTransfer(transfer,proof.contract,deposit.from_address,'2000000000000000000'))throw Error('No verified native value credit');
    proof.payoutVerified=true;
    proof.transferVerification='Finalized native EOA value_credited=true and wallet balance increased by 2 GEN; Studio labels this transfer NO_MAJORITY because it has no contract consensus execution.';
  }
  if(proof.contract){proof.record=JSON.parse(String(await client.readContract({address:proof.contract,functionName:'get_round',args:[proof.roundId??'pool-1'],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}).catch(()=> 'null')));save();}
}

// GEN pools that settle on a finalized Bullseye round (contracts/movie_pools.py).
async function roundPoolRun(client:GenLayerClient<typeof studionet>){
  mkdirSync('docs/proofs/round-pool',{recursive:true});
  const path='docs/proofs/round-pool/manifest.json';
  const market:Manifest=JSON.parse(readFileSync(file,'utf8'));
  const proof=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{network:'StudioNet',simulated:true,bullseye:market.contract,roundId:market.roundId,transactions:{}};
  const save=()=>{writeFileSync(path,JSON.stringify(proof,null,2));writeFileSync('public/round-pool-proof.json',JSON.stringify(proof,null,2));};
  async function final(hash:TransactionHash,name:string){
    const receipt=await client.waitForTransactionReceipt({hash,status:TransactionStatus.FINALIZED,retries:36,interval:5000});
    writeFileSync('docs/proofs/round-pool/'+name+'.json',JSON.stringify(receipt,(_,v)=>typeof v==='bigint'?v.toString():v,2));
    if(name.startsWith('claim-child-')&&creditedTransfer(receipt as unknown as Record<string,unknown>,proof.contract)){console.log(name,hash,'FINALIZED native value credit');return receipt;}
    if(!successfulFinalized(receipt))throw Error('Unsuccessful finalized execution: '+name);
    console.log(name,hash,'FINALIZED and successful');return receipt;
  }
  async function write(name:string,method:string,args:Parameters<typeof client.writeContract>[0]['args'],value=0n){
    const hash=await client.writeContract({address:proof.contract,functionName:method,args,value});proof.transactions[name]=hash;save();await final(hash as TransactionHash,name);
    const children=await client.getTriggeredTransactionIds({hash});
    for(let i=0;i<children.length;i++){proof.transactions[name+'-child-'+i]=children[i];save();await final(children[i] as TransactionHash,name+'-child-'+i);}
  }
  const step=process.env.BULLSEYE_STEP;
  if(step==='round-pool-deploy'){
    const hash=await client.deployContract({code:readFileSync('contracts/movie_pools.py','utf8'),args:[market.contract]});proof.transactions.deploy=hash;save();
    proof.contract=(await final(hash as TransactionHash,'deploy')).recipient;save();
  }
  if(step==='round-pool-stake')await write('stake','stake',[proof.roundId,2],2n*10n**18n);
  if(step==='round-pool-settle'){await write('settle','settle',[proof.roundId]);await write('claim','claim',[proof.roundId]);}
  if(proof.contract){proof.record=JSON.parse(String(await client.readContract({address:proof.contract,functionName:'get_pool',args:[proof.roundId],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}).catch(()=> 'null')));save();}
}
