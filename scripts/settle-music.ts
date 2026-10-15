/** Resumable zero-GEN maintenance. Never signs stakes, bonds, or listings. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createAccount,createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionStatus,TransactionHashVariant,type TransactionHash} from 'genlayer-js/types';
import {successfulFinalized} from '../lib/protocol';
import type {MusicMarket,MusicListing,MusicChallenge,MusicPool} from '../lib/music';
const proof=JSON.parse(await readFile('public/music-proof.json','utf8'));
if(!proof.contracts.challenges)throw Error('Publish the verified Music+ registry first. Previous Music release is unchanged.');
const addresses=proof.contracts,client=createClient({chain:studionet,account:createAccount()});
await mkdir('.data',{recursive:true});const path='.data/music-keeper.json';
let journal:Record<string,TransactionHash>;try{journal=JSON.parse(await readFile(path,'utf8'));}catch{journal={};}
const interval=Number(process.env.BULLSEYE_RPC_INTERVAL_MS??2500);
if(!Number.isFinite(interval)||interval<2500||interval>30000)throw Error('RPC interval must be 2500–30000 ms.');
const delay=()=>new Promise(resolve=>setTimeout(resolve,interval));
const read=async(address:`0x${string}`,functionName:string,args:Parameters<typeof client.readContract>[0]['args'])=>{await delay();return client.readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});};
const decode=<T>(value:unknown)=>JSON.parse(String(value)) as T;
async function final(hash:TransactionHash) {
 const receipt=await client.waitForTransactionReceipt({hash,status:TransactionStatus.FINALIZED,retries:48,interval:5000});
 if(!successfulFinalized(receipt))throw Error('Execution failed; preserved hash '+hash+'. Inspect it before changing the journal.');
 await delay();for(const child of await client.getTriggeredTransactionIds({hash}))await final(child);
}
async function write(key:string,address:`0x${string}`,functionName:string,args:Parameters<typeof client.writeContract>[0]['args']) {
 key=address.toLowerCase()+':'+key;
 if(!journal[key]) {await delay();journal[key]=await client.writeContract({address,functionName,args,value:0n});await writeFile(path,JSON.stringify(journal,null,2)+'\n');}
 await final(journal[key]);console.log(functionName+' finalized: '+journal[key]);return journal[key];
}
const selected=process.argv[2],sourceIds=await read(addresses.markets,'get_market_ids',[]) as string[];
const listingIds=await read(addresses.challenges,'get_listing_ids',[]) as string[];
const ids=[...new Set([...sourceIds,...listingIds])];
if(selected&&!ids.includes(selected))throw Error('Choose an actual published source market.');
for(const id of selected?[selected]:ids) {
 const raw=await read(addresses.markets,'get_market',[id]),now=Math.floor(Date.now()/1000);
 let listing=decode<MusicListing>(await read(addresses.challenges,'get_listing',[id]));
 if(!raw) {
  if(!listing.finances_closed&&!listing.active_case&&now>=(listing.entry_deadline??Infinity))await write('release:'+id,addresses.challenges,'release_listing',[id]);
  console.log(id+': awaiting compilation or listing refund');continue;
 }
 let market=decode<MusicMarket>(raw);
 if(listing.active_case) {
  const item=decode<MusicChallenge>(await read(addresses.challenges,'get_challenge',[listing.active_case]));
  if(item.status==='ruling_pending_finality') {
   const registry=Object.values(proof.markets??{}).find((value)=> (value as {id?:string}).id===id) as {rulingTransaction?:TransactionHash}|undefined;
   const recorded=Object.entries(journal).filter(([key])=>key.startsWith(addresses.challenges.toLowerCase()+':judge:'+item.id+':')||key===addresses.challenges.toLowerCase()+':expire:'+item.id).at(-1)?.[1]??registry?.rulingTransaction;
   if(!recorded)throw Error('Ruling callback recovery needs the finalized adjudicate/expire receipt for '+item.id+'. No new bond or judgment will be sent.');
   await write('ruling-recovery:'+item.id,addresses.challenges,'recover_ruling',[item.id,recorded]);
  }
  if(['posted','posted_pending_finality'].includes(item.status)&&now>=item.deadline)await write('expire:'+item.id,addresses.challenges,'expire_challenge',[item.id]);
  else if(item.status==='posted')await write('judge:'+item.id+':'+Math.floor(now/3600),addresses.challenges,'adjudicate',[item.id]);
 }
 listing=decode<MusicListing>(await read(addresses.challenges,'get_listing',[id]));
 market=decode<MusicMarket>(await read(addresses.markets,'get_market',[id]));
 for(const caseId of listing.cases) {
  const item=decode<MusicChallenge>(await read(addresses.challenges,'get_challenge',[caseId]));
  if(item.status==='finalized'&&item.ruling&&market.status==='compiled'&&(item.ruling.verdict==='VOIDED'||item.ruling.verdict==='AMENDED'&&market.specification_hash!==listing.approved_hash)) {
   await write('relay:'+caseId,addresses.challenges,'recover_market_review',[caseId]);
   market=decode<MusicMarket>(await read(addresses.markets,'get_market',[id]));
  }
 }
 if(['review_pending_finality','void_pending_finality'].includes(market.status))await write('review-recovery:'+id,addresses.markets,'recover_review',[id]);
 if(market.status==='compiled'&&now<market.spec!.entry_deadline) {
  const gate=decode<{ready:boolean;approved_hash:string}>(await read(addresses.challenges,'get_open_gate',[id]));
  if(gate.ready)await write('open:'+id,addresses.markets,'open_market',[id,gate.approved_hash]);
 }
 market=decode<MusicMarket>(await read(addresses.markets,'get_market',[id]));
 let poolIds=await read(addresses.pools,'get_source_pool_ids',[id]) as string[];
 if(market.status==='open'&&now<market.spec!.entry_deadline&&!poolIds.length) {await write('pool:'+id,addresses.pools,'create_pool',[id]);poolIds=await read(addresses.pools,'get_source_pool_ids',[id]) as string[];}
 if(!listing.finances_closed&&!listing.active_case&&(['open','closed','resolved','void'].includes(market.status)||market.spec&&now>=market.spec.entry_deadline))await write('release:'+id,addresses.challenges,'release_listing',[id]);
 if(market.spec&&now>=Math.max(market.spec.entry_deadline,market.spec.observation_time)&&['open','closed','pending','compiled'].includes(market.status)) {
  if(now>=market.spec.resolution_deadline)await write('void:'+id,addresses.markets,'void',[id]);
  else if(market.status!=='compiled')await write('resolve:'+id+':'+Math.floor(now/3600),addresses.markets,'adjudicate',[id]);
 }
 market=decode<MusicMarket>(await read(addresses.markets,'get_market',[id]));
 for(const poolId of poolIds) {
  const pool=decode<MusicPool>(await read(addresses.pools,'get_pool',[poolId]));
  if(pool.status==='open'&&now>=pool.entry_deadline&&(['resolved','void'].includes(market.status)||now>=pool.refund_deadline))await write('settle:'+poolId,addresses.pools,'settle',[poolId]);
 }
 console.log(id+': '+market.status+(market.spec?' · chart '+market.spec.albums.map(item=>item.chart_week).join(' / '):''));
}
