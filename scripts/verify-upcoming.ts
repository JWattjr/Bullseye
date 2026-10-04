import {readFile, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {TransactionHashVariant, type TransactionHash} from 'genlayer-js/types';
import {readClient, successfulFinalized} from '../lib/protocol';
import {upcomingRounds} from '../lib/upcoming';

const proof = JSON.parse(await readFile('public/upcoming-pool-proof.json', 'utf8'));
const client = readClient(), checks: string[] = [];
const pace = () => new Promise(resolve => setTimeout(resolve, 1800));
assert.equal(proof.network, 'StudioNet'); assert.equal(proof.simulated, true); assert.equal(proof.deploymentVerified, true);
assert.equal(String(await client.readContract({address: proof.contract, functionName: 'get_bullseye', args: [], transactionHashVariant: TransactionHashVariant.LATEST_FINAL})).toLowerCase(), proof.bullseye.toLowerCase());
for (const [name, hash] of Object.entries(proof.transactions)) {
  await pace();
  const receipt = await client.getTransaction({hash: hash as TransactionHash});
  if (name.includes('-rejected-')) {assert.equal(successfulFinalized(receipt), false); continue;}
  assert.equal(successfulFinalized(receipt), true, name + ' execution/finality');
  // Studio omits a zero value from some receipts. Require no native credit;
  // if an explicit value is returned, it must also be zero.
  assert.equal((receipt as unknown as {value_credited: boolean}).value_credited, false, name + ' must not credit funds');
  if (receipt.value !== undefined) assert.equal(String(receipt.value), '0', name + ' must not fund or stake');
  checks.push(name + ': successful finalized setup; no native value credit');
}
for (const round of upcomingRounds()) {
  await pace();
  const source = JSON.parse(String(await client.readContract({address: proof.bullseye, functionName: 'get_round', args: [proof.sourceRounds[round.id]], transactionHashVariant: TransactionHashVariant.LATEST_FINAL})));
  assert.equal(source.specification_hash, round.specification_hash);
  assert.equal(source.status, 'open'); assert.equal(source.winner, null); assert.equal(source.evidence, null);
  assert.deepEqual(source.spec, round.spec);
  await pace();
  const pool = JSON.parse(String(await client.readContract({address: proof.contract, functionName: 'get_pool', args: [proof.pools[round.id]], transactionHashVariant: TransactionHashVariant.LATEST_FINAL})));
  assert.equal(pool.source_round_id, proof.sourceRounds[round.id]);
  assert.equal(pool.specification_hash, source.specification_hash);
  assert.equal(pool.entry_deadline, round.spec.entry_deadline);
  assert.equal(pool.status, 'open'); assert.equal(pool.winner, null); assert.equal(pool.value, null);
  assert.equal(pool.mode, 'competitive');
  checks.push(round.title + ': matching finalized open oracle and shared pool; future result unknown');
}
await writeFile('docs/proofs/upcoming/network-verification.json', JSON.stringify({contract: proof.contract, bullseye: proof.bullseye, verifiedAt: new Date().toISOString(), checks}, null, 2) + '\n');
console.log(checks.join('\n'));
