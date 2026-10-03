import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant,type TransactionHash} from 'genlayer-js/types';
import {successfulFinalized} from '../lib/protocol';
import {specificationHash,hash} from '../lib/evidence';
const manifest=JSON.parse(await readFile('public/protocol-proof.json','utf8'));
const client=createClient({chain:studionet});
const results=[];
for(const [name,tx] of Object.entries(manifest.transactions)){
  const receipt=await client.getTransaction({hash:tx as TransactionHash});
  assert.ok(successfulFinalized(receipt),'Finalized successful execution required for '+name);results.push({name,hash:tx,verified:true});
}
const record=JSON.parse(String(await client.readContract({address:manifest.contract,functionName:'get_round',args:[manifest.roundId],transactionHashVariant:TransactionHashVariant.LATEST_FINAL})));
assert.equal(record.status,'resolved');assert.equal(record.evidence.normalized_value,162022044);assert.equal(record.winner,2);
assert.equal(record.specification_hash,specificationHash(record.spec));assert.equal(record.evidence.content_hash,hash(record.evidence.extracted_passage));
const ids=await client.readContract({address:manifest.contract,functionName:'get_round_ids',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});assert.ok(Array.isArray(ids)&&ids.includes(manifest.roundId));
const entries=JSON.parse(String(await client.readContract({address:manifest.contract,functionName:'get_entry_table',args:[manifest.roundId],transactionHashVariant:TransactionHashVariant.LATEST_FINAL})));assert.ok(Array.isArray(entries));
// The GEN pool must settle on exactly the range validators read in the Bullseye round.
const pool=JSON.parse(await readFile('public/round-pool-proof.json','utf8').catch(()=> 'null'));
let poolCheck=null;
if(pool){
  assert.equal(pool.bullseye.toLowerCase(),manifest.contract.toLowerCase());
  for(const [name,tx] of Object.entries(pool.transactions)){
    const receipt=await client.getTransaction({hash:tx as TransactionHash});
    if(name.startsWith('claim-child-'))continue; // native value credit has no consensus execution receipt
    assert.ok(successfulFinalized(receipt),'Finalized successful execution required for pool '+name);results.push({name:'pool-'+name,hash:tx,verified:true});
  }
  const state=JSON.parse(String(await client.readContract({address:pool.contract,functionName:'get_pool',args:[manifest.roundId],transactionHashVariant:TransactionHashVariant.LATEST_FINAL})));
  assert.equal(state.status,'resolved');assert.equal(state.winner,record.winner);assert.equal(state.value,record.evidence.normalized_value);
  poolCheck={contract:pool.contract,winner:state.winner,value:state.value,claims:state.claims};
}
await writeFile('docs/proofs/network-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),network:'studionet',contract:manifest.contract,receipts:results,finalizedRound:record.status,value:record.evidence.normalized_value,specificationHash:record.specification_hash,indexing:true,pool:poolCheck},null,2));
console.log('Verified finalized execution, callback receipts, frozen hash, evidence hash, exact range and contract indexing.');
