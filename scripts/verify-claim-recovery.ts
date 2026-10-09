/** Read-only verification: never signs or broadcasts transactions. */
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {TransactionHashVariant, type TransactionHash} from 'genlayer-js/types';
import {readClient, successfulFinalized} from '../lib/protocol';
import {creditedTransfer} from '../lib/pool-proof';

const path = 'docs/proofs/claim-recovery/manifest.json', proof = JSON.parse(await readFile(path, 'utf8'));
const client = readClient(), checks: string[] = [], sourceHashes: Record<string, string> = {};
assert.equal(proof.network, 'StudioNet'); assert.equal(proof.payoutVersion, 2);
assert.equal(proof.fundedStakeWei, '4000000000000000000');
for (const [key, file] of Object.entries({films: 'film_pools', upcoming: 'forecast_pools', forecastFixturePools: 'forecast_pools'})) {
  const code = await client.getContractCode(proof.contracts[key]);
  assert.equal(code, await readFile('contracts/' + file + '.py', 'utf8'), key + ' deployed code equals reviewed source');
  sourceHashes[key] = createHash('sha256').update(code).digest('hex');
  checks.push(key + ': deployed code exactly matches reviewed source');
}
for (const key of ['historical', 'forecast']) {
  const live = proof.live[key]; assert.equal(live.successVerified, true);
  assert.deepEqual(live.beforeVerification.claims, {});
  assert.equal(live.beforeVerification.claim_attempts[live.wallet.toLowerCase()].status, 'pending');
  const parent = await client.getTransaction({hash: live.parentHash as TransactionHash});
  assert.equal(successfulFinalized(parent), true);
  assert.deepEqual(await client.getTriggeredTransactionIds({hash: live.parentHash as TransactionHash}), [live.transferHash]);
  const transfer = await client.getTransaction({hash: live.transferHash as TransactionHash});
  assert.equal(creditedTransfer(transfer as unknown as Record<string, unknown>, live.contract, live.wallet, live.stakeWei), true);
  const claim = JSON.parse(String(await client.readContract({address: live.contract, functionName: 'get_claim', args: [live.pool, live.wallet], transactionHashVariant: TransactionHashVariant.LATEST_FINAL})));
  assert.equal(claim.status, 'paid'); assert.equal(claim.attempt, 1);
  assert.equal(claim.claim_hash, live.parentHash); assert.equal(claim.transfer_hash, live.transferHash);
  assert.equal(BigInt(live.walletAfterPayout), BigInt(live.walletBeforeClaim) + BigInt(live.stakeWei));
  assert.equal(live.poolBalanceAfter, '0');
  for (const suffix of ['verify', 'verify-child-0']) {
    const receipt = await client.getTransaction({hash: proof.transactions[key + '-' + suffix]});
    assert.equal(successfulFinalized(receipt), true, key + ' verification finality');
  }
  checks.push(key + ': exact finalized credit, paid state only after verification, recorded exact balances; oracle ' + (live.oracleIsFixture ? 'test fixture' : 'published historical result'));
}
assert.equal(proof.live.historical.walletAfterPayout, proof.live.forecast.walletBeforeClaim);
assert.equal(proof.live.forecast.walletAfterPayout, proof.live.historical.walletBefore);
await writeFile('docs/proofs/claim-recovery/network-verification.json', JSON.stringify({verifiedAt: new Date().toISOString(), sourceHashes, checks, limitations: 'Hosted successful native transfers only; failed delivery and retry are covered by controlled adversarial contract-ledger and browser fixtures.'}, null, 2) + '\n');
console.log(checks.join('\n'));
