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
await writeFile('docs/proofs/network-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),network:'studionet',contract:manifest.contract,receipts:results,finalizedRound:record.status,value:record.evidence.normalized_value,specificationHash:record.specification_hash,indexing:true},null,2));
console.log('Verified finalized execution, callback receipts, frozen hash, evidence hash, exact range and contract indexing.');
