import {readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync} from 'node:fs';
import type {GenLayerClient, TransactionHash} from 'genlayer-js/types';
import {TransactionStatus, TransactionHashVariant} from 'genlayer-js/types';
import {studionet} from 'genlayer-js/chains';
import {upcomingRounds} from '../lib/upcoming';
import {successfulFinalized} from '../lib/protocol';

// Setup only: every write sends zero GEN. Stakes and claims are signed by users.
export async function upcomingDeploy(client: GenLayerClient<typeof studionet>) {
  if (client.chain?.id !== 61999) throw Error('Upcoming setup requires StudioNet.');
  const folder = 'docs/proofs/upcoming', path = folder + '/manifest.json';
  mkdirSync(folder, {recursive: true});
  const historical = JSON.parse(readFileSync('public/film-pool-proof.json', 'utf8'));
  const rounds = upcomingRounds();
  const proof = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {
    network: 'StudioNet', simulated: true, bullseye: historical.bullseye,
    sourceRounds: Object.fromEntries(rounds.map(round => [round.id, round.id])),
    specificationHashes: Object.fromEntries(rounds.map(round => [round.id, round.specification_hash])),
    transactions: {}, sources: {}, pools: {}, deploymentVerified: false,
  };
  const save = () => {
    const text = JSON.stringify(proof, null, 2) + '\n';
    writeFileSync(path, text); writeFileSync('public/upcoming-pool-proof.json', text);
  };
  async function finalized(hash: TransactionHash, name: string) {
    const receipt = await client.waitForTransactionReceipt({hash, status: TransactionStatus.FINALIZED, retries: 48, interval: 5000});
    writeFileSync(folder + '/' + name + '.json', JSON.stringify(receipt, (_, value) => typeof value === 'bigint' ? String(value) : value, 2) + '\n');
    if (!successfulFinalized(receipt)) throw Error('Finalized execution failed: ' + name);
    console.log(name + ': finalized execution succeeded');
    return receipt;
  }
  async function callbacks(hash: TransactionHash, name: string) {
    for (const [index, child] of (await client.getTriggeredTransactionIds({hash})).entries()) {
      proof.transactions[name + '-callback-' + index] = child; save();
      await finalized(child, name + '-callback-' + index);
    }
  }
  async function write(name: string, address: `0x${string}`, method: string, args: Parameters<typeof client.writeContract>[0]['args']) {
    // Persist before waiting; retries resume a submitted transaction.
    const previous: TransactionHash | undefined = proof.transactions[name];
    if (previous && process.env.BULLSEYE_RETRY_FAILED === 'yes') {
      const receipt = await client.getTransaction({hash: previous});
      if (receipt.statusName === 'FINALIZED' && !successfulFinalized(receipt)) {
        let attempt = 1;
        while (proof.transactions[name + '-rejected-' + attempt]) attempt++;
        proof.transactions[name + '-rejected-' + attempt] = previous;
        const original = folder + '/' + name + '.json';
        if (existsSync(original)) copyFileSync(original, folder + '/' + name + '-rejected-' + attempt + '.json');
        delete proof.transactions[name]; save();
      }
    }
    const hash: TransactionHash = proof.transactions[name] ?? await client.writeContract({address, functionName: method, args, value: 0n});
    proof.transactions[name] = hash; save();
    await finalized(hash, name); await callbacks(hash, name);
  }
  async function source(id: string) {
    return JSON.parse(String(await client.readContract({address: proof.bullseye, functionName: 'get_round', args: [id], transactionHashVariant: TransactionHashVariant.LATEST_FINAL})));
  }
  const step = process.env.BULLSEYE_STEP;
  if (step === 'upcoming-deploy') {
    if (!proof.contract) {
      const hash: TransactionHash = proof.transactions.deploy ?? await client.deployContract({code: readFileSync('contracts/forecast_pools.py', 'utf8'), args: [proof.bullseye]});
      proof.transactions.deploy = hash; save();
      proof.contract = (await finalized(hash, 'deploy')).recipient; save();
    }
    const oracle = String(await client.readContract({address: proof.contract, functionName: 'get_bullseye', args: [], transactionHashVariant: TransactionHashVariant.LATEST_FINAL}));
    if (oracle.toLowerCase() !== proof.bullseye.toLowerCase()) throw Error('Forecast pools reference a different oracle.');
    proof.deploymentVerified = true; proof.verifiedAt = new Date().toISOString(); save();
  }
  if (step === 'upcoming-spec' || step === 'upcoming-pool' || step === 'upcoming-proof') {
    if (!proof.deploymentVerified) throw Error('Deploy and verify the forecast contract first.');
    const selected = process.env.BULLSEYE_FILM ? rounds.filter(round => round.id === process.env.BULLSEYE_FILM) : rounds;
    if (!selected.length) throw Error('Unknown upcoming film.');
    const known = await client.readContract({address: proof.bullseye, functionName: 'get_round_ids', args: [], transactionHashVariant: TransactionHashVariant.LATEST_FINAL}) as string[];
    for (const round of selected) {
      const id = proof.sourceRounds[round.id];
      if (step === 'upcoming-spec' && !known.includes(id)) {
        const proposal = 'The event is ' + round.spec.event + '. The forecast metric is domestic opening-weekend box-office revenue. Geography: United States and Canada. Currency: USD. Unit: dollars. Scale: 1. Rounding: exact published integer; no rounding. The publisher is The Numbers; the only source URL is ' + round.spec.source_url + '. The entry ranges in integer USD are ' + JSON.stringify(round.spec.ranges) + '. Entry deadline: ' + round.spec.entry_deadline + ' UNIX seconds. Observation time: ' + round.spec.observation_time + ' UNIX seconds. Resolution deadline: ' + round.spec.resolution_deadline + ' UNIX seconds. Mode: competitive. Correction policy: first successful consensus observation; ignore later corrections. Missing evidence: pending until deadline then void.';
        await write(round.id + '-spec', proof.bullseye, 'propose', [id, proposal, JSON.stringify(round.spec)]);
      }
      const record = await source(id);
      if (record.specification_hash !== round.specification_hash || record.spec.mode !== 'competitive' || record.evidence !== null || record.winner !== null || record.status !== 'open') throw Error('Upcoming source has not finalized the expected open specification: ' + round.id);
      proof.sources[round.id] = record; save();
      if (step === 'upcoming-pool') {
        await write(round.id + '-pool', proof.contract, 'create_pool', [id]);
        const ids = await client.readContract({address: proof.contract, functionName: 'get_source_pool_ids', args: [id], transactionHashVariant: TransactionHashVariant.LATEST_FINAL}) as string[];
        if (ids.length !== 1) throw Error('Expected one shared market per film.');
        const pool = JSON.parse(String(await client.readContract({address: proof.contract, functionName: 'get_pool', args: [ids[0]], transactionHashVariant: TransactionHashVariant.LATEST_FINAL})));
        if (pool.specification_hash !== record.specification_hash || pool.entry_deadline !== round.spec.entry_deadline || pool.winner !== null || pool.status !== 'open') throw Error('Shared pool does not match its frozen future specification.');
        proof.pools[round.id] = ids[0]; save();
      }
      console.log(round.title + ': ' + record.status + ', entries close ' + new Date(round.spec.entry_deadline * 1000).toISOString());
    }
    proof.verifiedAt = new Date().toISOString(); save();
  }
}
