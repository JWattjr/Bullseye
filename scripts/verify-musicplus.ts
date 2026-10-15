/** Read-only verification: no account, secret, or write method. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant,type TransactionHash} from 'genlayer-js/types';
import {successfulFinalized} from '../lib/protocol';
import {creditedTransfer} from '../lib/pool-proof';
const folder='docs/proofs/musicplus-2026-10-14';
const proof=JSON.parse(await readFile(folder+'/manifest.json','utf8'));
const client=createClient({chain:studionet}),owner='0xdb433ff614bdd1ece21aa97221c3e0a7ecf79c92';
const rpcInterval=Math.min(30000,Math.max(2500,Number(process.env.BULLSEYE_RPC_INTERVAL_MS??2500)));
const pause=()=>new Promise(resolve=>setTimeout(resolve,rpcInterval));
const read=async(address:`0x${string}`,functionName:string,args:Parameters<typeof client.readContract>[0]['args'])=>{await pause();return client.readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});};
const digest=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const sources={challenges:'music_challenges.py',markets:'music_markets_v2.py',pools:'music_pools_v2.py',seasons:'seasons_v2.py'};
assert.ok(proof.sourceCommit,'actual immutable source commit required');
for(const [role,file] of Object.entries(sources)) {
 const expected=proof.sourceHashes[role];assert.equal(digest(await readFile('contracts/'+file)),expected,role+' local source');
 await pause();assert.equal(digest(await client.getContractCode(proof.contracts[role])),expected,role+' actual deployed bytes');
 assert.equal(digest(execFileSync('git',['-c','safe.directory='+process.cwd(),'show',proof.sourceCommit+':contracts/'+file])),expected,role+' source commit');
}
await pause();const schema=await client.getContractSchema(proof.contracts.challenges);
assert.equal(schema.methods.list_market.payable,true);assert.equal(schema.methods.challenge.payable,true);assert.ok(schema.methods.recover_failed_deposit);
const config=JSON.parse(String(await read(proof.contracts.challenges,'get_config',[])));
assert.equal(config.markets.toLowerCase(),proof.contracts.markets.toLowerCase());assert.equal(config.window_seconds,600);assert.equal(config.demo_window,true);
assert.equal(config.rules_snapshot,proof.research['snapshot-rules-lover'].snapshot);
assert.equal(proof.research['snapshot-rules-lover'].status,200);
assert.equal(String(await read(proof.contracts.markets,'get_challenges',[])).toLowerCase(),proof.contracts.challenges.toLowerCase());
assert.equal(String(await read(proof.contracts.pools,'get_bullseye',[])).toLowerCase(),proof.contracts.markets.toLowerCase());
const checks=[];
for(const [name,hash] of Object.entries(proof.transactions)) {
 await pause();const tx=await client.getTransaction({hash:hash as TransactionHash});const raw=tx as unknown as Record<string,unknown>;
 const expectedFailure=proof.expectedFailedTransactions?.includes(name);
 if(expectedFailure) {assert.equal(tx.statusName,'FINALIZED');assert.equal(successfulFinalized(tx),false,'retained failed quote check');}
 else assert.ok(raw.consensus_data===null?creditedTransfer(raw,proof.contracts.challenges,owner):successfulFinalized(tx),name+' finalized successful execution or exact native credit');
 checks.push({name,hash,state:tx.statusName,native:raw.consensus_data===null});
 if(name.endsWith('-list')||name.endsWith('-challenge')) {assert.equal(String(raw.sender??raw.from_address).toLowerCase(),owner);assert.equal(String(raw.recipient??raw.to_address).toLowerCase(),proof.contracts.challenges.toLowerCase());assert.equal(String(raw.value),name.endsWith('-list')?'4000000000000000':'1000000000000000');}
}
const cases=[];
for(const [key,verdict] of [['upheld','UPHELD'],['amended','AMENDED'],['voided','VOIDED']] as const) {
 const record=proof.markets[key];assert.ok(record?.challenge,key+' live challenge required');
 const item=JSON.parse(String(await read(proof.contracts.challenges,'get_challenge',[record.challenge])));
 assert.equal(item.status,'finalized');assert.equal(item.ruling.verdict,verdict);assert.equal(item.fallback,false,'a deadline fallback is not a validator proof');
 assert.ok(item.ruling.rule_quote.length>=20&&item.ruling.evidence_quote.length>=20);assert.equal(item.ruling.rules_digest,proof.research['snapshot-rules-lover'].digest);
 if(verdict==='AMENDED')assert.ok(item.options.some((option:{id:string})=>option.id===item.ruling.option));
 const market=JSON.parse(String(await read(proof.contracts.markets,'get_market',[record.id])));
 if(verdict==='AMENDED'){assert.equal(market.spec.albums[0].chart_week,'2022-08-13');assert.notEqual(market.specification_hash,item.source_hash);}
 if(verdict==='VOIDED')assert.equal(market.status,'void');
 cases.push({key,id:record.id,verdict,case:item,market});
}
const upcoming=[];
for(const [key,chart] of [['andy','2026-10-31'],['bernie','2026-11-07'],['vanhalen','2026-11-07']] as const) {
 const record=proof.markets[key];assert.ok(record,key+' actual proposed listing required');
 const source=JSON.parse(String(await read(proof.contracts.markets,'get_market',[record.id])));
 if(key==='vanhalen'&&source.status==='void') {
  assert.equal(source.spec.historical,false);assert.equal(source.spec.ranking_mode,'chart_position');
  const ids=await read(proof.contracts.pools,'get_source_pool_ids',[record.id]) as string[];assert.equal(ids.length,0,'voided identity never opens a GEN pool');
  upcoming.push({key,id:record.id,status:'voided-identity',chart,pool:null});continue;
 }
 assert.ok(record.pool,key+' actual GEN pool required');
 const pool=JSON.parse(String(await read(proof.contracts.pools,'get_pool',[record.pool])));
 assert.equal(source.spec.historical,false);assert.equal(source.spec.albums[0].chart_week,chart);assert.equal(source.status,'open');assert.equal(source.winner,null);assert.equal(source.evidence,null);
 assert.equal(pool.status,'open');assert.equal(pool.source_round_id,record.id);assert.equal(pool.specification_hash,source.specification_hash);assert.equal(pool.total,'0');
 assert.ok(source.spec.observation_time>Math.floor(Date.now()/1000),'future undecided chart required for milestone proof');
 upcoming.push({key,id:record.id,chart,entryCutoff:source.spec.entry_deadline,resolutionDeadline:source.spec.resolution_deadline,pool:record.pool});
}
assert.ok(upcoming.filter(item=>item.pool!==null).length>=2,'at least two real undecided open GEN pools required');
const upcomingCase=JSON.parse(String(await read(proof.contracts.challenges,'get_challenge',[proof.markets.vanhalen.challenge])));assert.equal(upcomingCase.status,'finalized');assert.equal(upcomingCase.fallback,false);
const season=JSON.parse(String(await read(proof.contracts.seasons,'get_track_record',[owner])));assert.ok(season.results.some((row:{category:string})=>row.category==='film'));assert.equal(season.results.filter((row:{category:string;release:string})=>row.category==='music'&&row.release==='previous').length,4);
assert.equal(String(await read(proof.contracts.seasons,'get_previous_music',[])).toLowerCase(),proof.previousContracts.markets.toLowerCase());
const credit=JSON.parse(String(await read(proof.contracts.challenges,'get_credit',[owner])));assert.equal(credit.available,'0');assert.equal(credit.withdrawal.status,'paid');
assert.equal(config.total_deposited,'28000000000000000');assert.equal(config.total_paid,config.total_deposited);
await pause();const balance=String(await client.getBalance({address:proof.contracts.challenges}));assert.equal(balance,'0');
const walletBalanceDeltaOutsidePackage=String(BigInt(proof.balanceAfterPackage)-BigInt(proof.balanceBeforePackage));
const failed=JSON.parse(await readFile(folder+'/candidate-1-manifest.json','utf8'));await pause();const negative=await client.getTransaction({hash:failed.transactions['upheld-list']});assert.equal(successfulFinalized(negative),false,'retained failed deposit stays a failed proof');
const retired=JSON.parse(await readFile(folder+'/candidate-3-manifest.json','utf8'));
assert.equal(retired.retirementReconciliation.contractBalance,'0');assert.equal(retired.retirementReconciliation.totalPaid,'15000000000000000');assert.equal(retired.credit.withdrawal.status,'paid');
await pause();const retiredTransfer=await client.getTransaction({hash:retired.credit.withdrawal.transfer_hash});assert.ok(creditedTransfer(retiredTransfer as unknown as Record<string,unknown>,retired.contracts.challenges,owner,'15000000000000000'));
const report={verifiedAt:new Date().toISOString(),network:'StudioNet',simulated:true,sourceCommit:proof.sourceCommit,contracts:proof.contracts,config,checks,cases,upcoming,upcomingChallenge:upcomingCase,season,credit,balance,walletBalances:{beforePackage:proof.balanceBeforePackage,afterPackage:proof.balanceAfterPackage,deltaOutsidePackage:walletBalanceDeltaOutsidePackage,note:'Exact deposited/paid ledger and finalized native transfers prove package returns. Other wallet activity is outside this package.'},retiredCandidateReturn:retired.retirementReconciliation,retainedFailedDeposit:{hash:failed.transactions['upheld-list'],amount:'0.004',recipient:failed.contracts.challenges,recoverable:false}};
await writeFile(folder+'/verification.json',JSON.stringify(report,null,2)+'\n');console.log('Actual Music+ judgments, upcoming pools, source bytes, finality, season history and returned native credits verified read-only.');
