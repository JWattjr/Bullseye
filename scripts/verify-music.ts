import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant,type TransactionHash} from 'genlayer-js/types';
import {successfulFinalized} from '../lib/protocol';
import {creditedTransfer} from '../lib/pool-proof';
const folder='docs/proofs/music-2026-10-12-release-v2';
const proof=JSON.parse(await readFile(folder+'/manifest.json','utf8'));
const client=createClient({chain:studionet}); // No account and no write methods.
const owner='0xdb433ff614bdd1ece21aa97221c3e0a7ecf79c92';
const checks:unknown[]=[];
for(const [role,file] of Object.entries({markets:'music_markets.py',pools:'music_pools.py',seasons:'seasons.py'})) {
 assert.equal(createHash('sha256').update(await readFile('contracts/'+file)).digest('hex'),proof.sourceHashes[role],role+' deployed source hash');
 const deployed = await client.getContractCode(proof.contracts[role]);
 assert.equal(createHash('sha256').update(deployed).digest('hex'),proof.sourceHashes[role],role+' actual on-chain source hash');
 if (proof.sourceCommit) {
  assert.match(proof.sourceCommit,/^[a-f0-9]{40}$/);
  const committed=execFileSync('git',['-c','safe.directory='+process.cwd(),'show',proof.sourceCommit+':contracts/'+file]);
  assert.equal(createHash('sha256').update(committed).digest('hex'),proof.sourceHashes[role],role+' recorded source commit');
 }
}
for(const [name,hash] of Object.entries(proof.transactions)) {
 const receipt=await client.getTransaction({hash:hash as TransactionHash});
 const expectedFailure=proof.expectedFailedTransactions?.includes(name);
 const native=receipt.consensus_data===null;
 if(expectedFailure) {assert.equal(receipt.statusName,'FINALIZED',name+' retained failure finality');assert.equal(successfulFinalized(receipt),false,name+' retained failure');}
 else if(native) assert.ok(creditedTransfer(receipt as unknown as Record<string,unknown>,proof.contracts.pools,owner,proof.fundedStakeWei),name+' exact native credit to approved wallet');
 else assert.ok(successfulFinalized(receipt),name+' finalized successful execution');
 if(name==='funded-stake') {
  const raw=receipt as unknown as Record<string,unknown>;
  assert.equal(String(raw.sender??raw.from_address).toLowerCase(),owner);
  assert.equal(String(raw.recipient??raw.to_address).toLowerCase(),proof.contracts.pools.toLowerCase());
  assert.equal(String(raw.value),'10000000000000000');
 }
 checks.push({name,hash,status:receipt.statusName,expectedFailure:!!expectedFailure,nativeCredit:native&&!expectedFailure});
 await new Promise(resolve=>setTimeout(resolve,1100)); // Respect StudioNet request capacity.
}
const read=async(address:`0x${string}`,functionName:string,args:Parameters<typeof client.readContract>[0]['args'])=>client.readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
const marketResults=[];
const identity=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const expectedAlbums:Record<string,[string,string][]>={renaissance:[['Renaissance','Beyonce']],funded:[['Renaissance','Beyonce']],surrender:[['Surrender','Maggie Rogers']],patina:[['Patina','Tallies']],pairing:[['Renaissance','Beyonce'],['Surrender','Maggie Rogers']]};
for(const [key,record] of Object.entries(proof.markets) as [string,{id:string;pool?:string}][]) {
 const market=JSON.parse(String(await read(proof.contracts.markets,'get_market',[record.id])));
 if(key==='midnights') {
  assert.equal(market.spec.albums[0].identity_rule,'combined_standard_deluxe');
  assert.ok(['pending','void','resolved'].includes(market.status),'retained archive diagnostic state');
  marketResults.push({key,id:record.id,diagnostic:true,status:market.status,evidence:market.evidence});
  continue;
 }
 if(key==='ambiguous') {assert.equal(market.status,'rejected');assert.ok(market.rejection_reason.trim());}
 else {assert.equal(market.status,'resolved',key+' live resolution required');assert.ok(market.evidence.charts.every((c:{capture:string;rows_digest:string;snapshot:string})=>/^\d{14}$/.test(c.capture)&&/^[a-f0-9]{64}$/.test(c.rows_digest)&&c.snapshot.includes(c.capture+'id_/')));}
 if(expectedAlbums[key]) {
  assert.equal(market.spec.market_type,key==='pairing'?'head_to_head':'rank');
  assert.equal(market.spec.albums.length,expectedAlbums[key].length);
  for(const [index,[title,artist]] of expectedAlbums[key].entries()) {
   const album=market.spec.albums[index];assert.equal(identity(album.title),identity(title));assert.equal(identity(album.artist),identity(artist));assert.equal(album.chart_week,'2022-08-13');
  }
 }
 const expected=key==='patina'?null:key==='surrender'?12:1;
 if(key!=='ambiguous') assert.equal(market.evidence.matches[0].position,expected);
 if(key==='patina') {assert.equal(market.winner,5);assert.equal(market.evidence.matches[0].quote,'');}
 if(key==='pairing') assert.equal(market.evidence.matches[1].position,12);
 if(key==='midnights') {assert.equal(market.spec.albums[0].identity_rule,'combined_standard_deluxe');assert.equal(market.spec.albums[0].title,'Midnights');}
 marketResults.push({key,id:record.id,status:market.status,winner:market.winner,evidence:market.evidence});
}
assert.ok(['renaissance','surrender','patina','pairing','ambiguous'].every(key=>proof.markets[key]),'all five required proof cases');
const sources=await read(proof.contracts.seasons,'get_sources',[]) as {film:string;music:string};assert.equal(sources.film.toLowerCase(),proof.film.toLowerCase());assert.equal(sources.music.toLowerCase(),proof.contracts.markets.toLowerCase());
const season=JSON.parse(String(await read(proof.contracts.seasons,'get_track_record',[owner])));
assert.ok(season.results.some((r:{category:string})=>r.category==='film'),'existing film imported');
assert.ok(season.results.filter((r:{category:string})=>r.category==='music').length>=4,'all free music predictions imported');
const film=JSON.parse(await readFile('public/film-pool-proof.json','utf8')),upcoming=JSON.parse(await readFile('public/upcoming-pool-proof.json','utf8'));
const regression=[];
for(const id of Object.values(film.sourceRounds) as string[]) {const record=JSON.parse(String(await read(proof.film,'get_round',[id])));assert.equal(record.status,'resolved');regression.push({id,status:record.status,value:record.evidence.normalized_value});}
for(const address of ['0xBC8b76e39B6364E16E85F5881ccC0ece5ddb9a25','0xD12AaAf442A01708f4DF0C5eb0B3171C3cAb9403']) assert.equal(String(await read(address as `0x${string}`,'get_bullseye',[])).toLowerCase(),proof.film.toLowerCase());
const upcomingPools=[];
for(const sourceId of Object.values(upcoming.sourceRounds) as string[]) {
 const ids=await read('0xBC8b76e39B6364E16E85F5881ccC0ece5ddb9a25','get_source_pool_ids',[sourceId]) as string[];
 assert.ok(ids.length,sourceId+' existing pool preserved');
 const state=JSON.parse(String(await read('0xBC8b76e39B6364E16E85F5881ccC0ece5ddb9a25','get_pool',[upcoming.pools[sourceId]])));
 assert.equal(state.source_round_id,sourceId);assert.ok(['open','resolved','void','resolved_pending_finality','void_pending_finality'].includes(state.status));assert.ok(BigInt(state.total)>=0n);assert.equal(Object.values(state.entries as Record<string,{stake:string}>).reduce((sum,entry)=>sum+BigInt(entry.stake),0n),BigInt(state.total),'current Film entry ledger conserved');assert.ok(ids.includes(upcoming.pools[sourceId]));
 upcomingPools.push({id:state.id,status:state.status,total:state.total});
}
const legacy=JSON.parse(await readFile('public/legacy-upcoming-pool-proof.json','utf8'));
assert.equal(legacy.contract,'0x9De7b19Cf61EDCF25d7960838D297bB51012ADA5');
assert.equal(String(await read(legacy.contract,'get_bullseye',[])).toLowerCase(),proof.film.toLowerCase());
const legacyPools=[];
for(const sourceId of Object.values(legacy.sourceRounds) as string[]) {
 const state=JSON.parse(String(await read(legacy.contract,'get_pool',[legacy.pools[sourceId]])));
 assert.equal(state.source_round_id,sourceId);assert.ok(BigInt(state.total)>=0n);if(['street-fighter-2026','cat-in-the-hat-2026'].includes(sourceId)) assert.ok(BigInt(state.total)>=2n*10n**18n,'recorded legacy Film stake preserved');assert.equal(Object.values(state.entries as Record<string,{stake:string}>).reduce((sum,entry)=>sum+BigInt(entry.stake),0n),BigInt(state.total),'legacy Film entry ledger conserved');
 legacyPools.push({id:state.id,status:state.status,total:state.total});
}
checks.push({filmBindings:'preserved',upcomingPools,legacyPools});
const funded=proof.fundedPool;
assert.ok(funded,'owner-approved tiny stake and claim still required');
const pool=JSON.parse(String(await read(proof.contracts.pools,'get_pool',[funded])));
assert.equal(pool.status,'resolved');assert.equal(pool.claims[owner],proof.fundedStakeWei);assert.equal(pool.claim_attempts[owner].status,'paid');assert.equal(proof.fundedStakeWei,'10000000000000000');
assert.equal(pool.source_round_id,proof.markets.funded.id);
assert.equal(pool.specification_hash,proof.markets.funded.state.specification_hash);
assert.equal(BigInt(proof.balanceBeforeStake)-BigInt(proof.balanceAfterStake),10n**16n,'exact approved debit');
assert.equal(proof.balanceBeforeStake,proof.balanceAfterClaim,'full approved stake collected');
const poolBalance=String(await client.getBalance({address:proof.contracts.pools}));
assert.equal(poolBalance,'0','no remaining native GEN in the proof pool');
assert.ok(proof.sourceCommit,'source commit recorded');
const report={verifiedAt:new Date().toISOString(),network:'StudioNet',simulated:true,contracts:proof.contracts,sourceCommit:proof.sourceCommit,checks,markets:marketResults,season,filmRegression:regression,fundedPool:pool.id,claim:pool.claim_attempts[owner],balances:{beforeStake:proof.balanceBeforeStake,afterStake:proof.balanceAfterStake,afterClaim:proof.balanceAfterClaim,pool:poolBalance}};
await writeFile(folder+'/verification.json',JSON.stringify(report,null,2)+'\n');
console.log('Verified five music cases, complete archive digests, finalized receipts, exact native credit, combined season and preserved Film bindings. No on-chain writes.');
