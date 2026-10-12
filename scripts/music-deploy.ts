import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {GenLayerClient, TransactionHash} from 'genlayer-js/types';
import {TransactionStatus, TransactionHashVariant} from 'genlayer-js/types';
import {studionet} from 'genlayer-js/chains';
import {successfulFinalized} from '../lib/protocol';
import {creditedTransfer} from '../lib/pool-proof';

const folder = 'docs/proofs/music-2026-10-12-release';
const manifest = folder + '/manifest.json';
const stringify = (value: unknown) => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? String(item) : item, 2) + '\n';
const questions: Record<string, string> = {
  funded: 'Where did Renaissance by Beyonce debut on the Billboard 200 chart dated August 13, 2022? Count standard and deluxe editions together under the standard album entry.',
  renaissance: 'Where did Renaissance by Beyonce debut on the Billboard 200 chart dated August 13, 2022? Count standard and deluxe editions together under the standard album entry.',
  surrender: 'Where did Surrender by Maggie Rogers debut on the Billboard 200 chart dated August 13, 2022?',
  midnights: 'Where did Midnights (3am Edition) by Taylor Swift debut on the Billboard 200 chart dated November 5, 2022? Count this deluxe edition together with the standard Midnights entry.',
  pairing: 'Did Renaissance by Beyonce debut higher than Surrender by Maggie Rogers on the Billboard 200 chart dated August 13, 2022?',
  ambiguous: 'Where will Taylor Swift next studio album debut on the Billboard 200?',
};

// CLI retains its managed signing key. No private key or operator secret is read.
export async function musicDeploy(client: GenLayerClient<typeof studionet>) {
  if (client.chain?.id !== 61999) throw Error('Music proofs require StudioNet.');
  mkdirSync(folder, {recursive: true});
  const proof = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : {
    network: 'StudioNet', simulated: true, milestone: 'music', sourceCommit: null,
    contracts: {}, transactions: {}, sourceHashes: {}, markets: {}, fundedStakeWei: '0',
    film: '0x756ddF8D588DA4D598F9F90947DB92Bced10D68E',
    status: 'work-in-progress',
  };
  const save = () => {
    writeFileSync(manifest, stringify(proof));
    if (proof.deploymentVerified) writeFileSync('public/music-proof.json', stringify({
      network: proof.network, simulated: true, contracts: proof.contracts,
      transactions: proof.transactions, sourceCommit: proof.sourceCommit,
      status: proof.status, markets: proof.markets,
    }));
  };
  const read = async (address: `0x${string}`, method: string, args: Parameters<typeof client.readContract>[0]['args']) => client.readContract({address, functionName: method, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL});
  async function final(hash: TransactionHash, name: string, native = false, amount?: string) {
    const receipt = await client.waitForTransactionReceipt({hash, status: TransactionStatus.FINALIZED, retries: 48, interval: 5000});
    writeFileSync(folder + '/' + name + '.json', stringify(receipt));
    const valid = native ? creditedTransfer(receipt as unknown as Record<string, unknown>, String(receipt.sender ?? ''), undefined, amount) : successfulFinalized(receipt);
    if (!valid) throw Error('Finalized execution failed: ' + name);
    console.log(name + ': finalized successful ' + (native ? 'native credit' : 'execution'));
    return receipt;
  }
  async function deploy(key: string, file: string, args: Parameters<typeof client.deployContract>[0]['args']) {
    const code = readFileSync(file, 'utf8');
    const digest = createHash('sha256').update(code).digest('hex');
    if (proof.sourceHashes[key] && proof.sourceHashes[key] !== digest) throw Error('Deployed source changed; use a reviewed new deployment manifest.');
    if (proof.contracts[key]) return proof.contracts[key] as `0x${string}`;
    const name = key + '-deploy';
    const hash = proof.transactions[name] ?? await client.deployContract({code, args});
    proof.transactions[name] = hash; proof.sourceHashes[key] = digest; save();
    const receipt = await final(hash, name);
    proof.contracts[key] = receipt.recipient; save();
    return receipt.recipient as `0x${string}`;
  }
  async function write(name: string, address: `0x${string}`, method: string, args: Parameters<typeof client.writeContract>[0]['args'], value = 0n) {
    let hash: TransactionHash = proof.transactions[name];
    if (!hash) {
      if (value) {
        if (process.env.BULLSEYE_MUSIC_FUNDS !== 'authorized-0.01-gen' || value !== 10n ** 16n || BigInt(proof.fundedStakeWei) !== 0n) throw Error('New explicit owner authorization for one 0.01 GEN stake required.');
        const wallet = typeof client.account === 'string' ? client.account : client.account?.address;
        if (wallet?.toLowerCase() !== '0xdb433ff614bdd1ece21aa97221c3e0a7ecf79c92') throw Error('Use the specifically approved StudioNet account.');
      }
      hash = await client.writeContract({address, functionName: method, args, value});
      proof.transactions[name] = hash;
      if (value) proof.fundedStakeWei = String(value);
      save();
    }
    await final(hash, name);
    for (const [index, child] of (await client.getTriggeredTransactionIds({hash})).entries()) {
      const childName = name + '-child-' + index;
      proof.transactions[childName] = child; save();
      await final(child, childName, method === 'claim', method === 'claim' ? proof.fundedStakeWei : undefined);
    }
    return hash;
  }
  const step = process.env.BULLSEYE_STEP;
  if (step === 'music-compile-diagnostic') {
    const diagnostic = folder + '/compile-format-diagnostic-v3.json';
    const state = existsSync(diagnostic) ? JSON.parse(readFileSync(diagnostic, 'utf8')) : {};
    const persist = () => writeFileSync(diagnostic, stringify(state));
    if (!state.deploy) {state.deploy = await client.deployContract({code: readFileSync('tests/fixtures/music_compile_format_probe.py','utf8'), args: []});persist();}
    const deployed = await final(state.deploy, 'compile-format-probe-v3-deploy');state.address=deployed.recipient;persist();
    if (!state.probe) {state.probe=await client.writeContract({address:state.address,functionName:'probe',args:[questions.ambiguous],value:0n});persist();}
    await final(state.probe,'compile-format-probe-v3');
    state.result = JSON.parse(String(await read(state.address, 'get_result', [])));persist();console.log('Model format diagnostic:',stringify(state.result));return;
  }

  if (step === 'music-build-proof') {
    process.env.BULLSEYE_STEP = 'music-deploy'; await musicDeploy(client);
    process.env.BULLSEYE_STEP = 'music-free-cases'; await musicDeploy(client);
    process.env.BULLSEYE_STEP = 'music-finish-free'; await musicDeploy(client);
    return;
  }
  if (step === 'music-finish-free') {
    for (const selected of ['renaissance', 'surrender', 'midnights', 'pairing']) {
      const record = proof.markets[selected];
      while (Date.now() / 1000 < record.entry_deadline) await new Promise(resolve => setTimeout(resolve, Math.min(30_000, (record.entry_deadline - Date.now() / 1000) * 1000 + 100)));
      process.env.BULLSEYE_MUSIC_CASE = selected;
      for (const next of ['music-resolve', 'music-season']) {
        process.env.BULLSEYE_STEP = next; await musicDeploy(client);
      }
    }
    process.env.BULLSEYE_STEP = 'music-film-season'; await musicDeploy(client);
    return;
  }
  if (step === 'music-deploy') {
    const markets = await deploy('markets', 'contracts/music_markets.py', []);
    await deploy('pools', 'contracts/music_pools.py', [markets]);
    await deploy('seasons', 'contracts/seasons.py', [proof.film, markets, 'Bullseye 2026', 1767225600, 1798761600]);
    if (String(await read(proof.contracts.pools, 'get_bullseye', [])).toLowerCase() !== markets.toLowerCase()) throw Error('Music pool binding mismatch.');
    proof.deploymentVerified = true; save(); return;
  }
  const key = process.env.BULLSEYE_MUSIC_CASE ?? 'renaissance';
  if (step === 'music-free-cases') {
    for (const selected of ['ambiguous', 'renaissance', 'surrender', 'midnights', 'pairing']) {
      process.env.BULLSEYE_MUSIC_CASE = selected;
      for (const next of selected === 'ambiguous' ? ['music-compile'] : ['music-compile', 'music-open', 'music-predict']) {
        process.env.BULLSEYE_STEP = next;
        await musicDeploy(client);
      }
    }
    return;
  }
  if (!questions[key] || !proof.contracts.markets) throw Error('Deploy music and select a known proof case first.');
  const address = proof.contracts.markets as `0x${string}`;
  const identifier = key + '-music-proof';
  if (step === 'music-retry-ambiguous' && key === 'ambiguous') {
    const failed = proof.transactions['ambiguous-compile'];
    if (!failed || proof.transactions['ambiguous-compile-failed-1']) throw Error('Only the documented failed first compilation may be retried here.');
    proof.transactions['ambiguous-compile-failed-1'] = failed;
    proof.expectedFailedTransactions = ['ambiguous-compile-failed-1'];
    writeFileSync(folder + '/ambiguous-compile-failed-1.json', readFileSync(folder + '/ambiguous-compile.json'));
    delete proof.transactions['ambiguous-compile'];
    proof.markets[key].entry_deadline = Math.floor(Date.now() / 1000) + 900;
    proof.markets[key].resolution_deadline = Math.floor(Date.now() / 1000) + 86400;
    save();
    const m = proof.markets[key];
    await write('ambiguous-compile', address, 'compile', [identifier, m.question, m.entry_deadline, m.resolution_deadline, true]);
  }
  if (step === 'music-compile') {
    proof.markets[key] ??= {id: identifier, question: questions[key], entry_deadline: Math.floor(Date.now() / 1000) + 900, resolution_deadline: Math.floor(Date.now() / 1000) + 86400};
    save();
    const m = proof.markets[key];
    await write(key + '-compile', address, 'compile', [identifier, m.question, m.entry_deadline, m.resolution_deadline, true]);
  }
  if (step === 'music-open') {
    const record = JSON.parse(String(await read(address, 'get_market', [identifier])));
    if (record.status !== 'compiled' && !proof.transactions[key + '-open']) throw Error('Wait for a finalized accepted compilation.');
    await write(key + '-open', address, 'open_market', [identifier, record.specification_hash]);
  }
  if (step === 'music-predict') {
    const choice = key === 'surrender' ? 3 : 0;
    const rank = key === 'surrender' ? 12 : key === 'pairing' ? 0 : 1;
    await write(key + '-predict', address, 'predict', [identifier, choice, rank]);
  }
  if (step === 'music-resolve') {
    if (Date.now() / 1000 < proof.markets[key].entry_deadline) throw Error('Entries are still open; resolve after the frozen cutoff.');
    await write(key + '-resolve', address, 'adjudicate', [identifier]);
  }
  if (step === 'music-create-pool') {
    await write(key + '-create-pool', proof.contracts.pools, 'create_pool', [identifier]);
    proof.markets[key].pool = (await read(proof.contracts.pools, 'get_source_pool_ids', [identifier]) as string[])[0];
  }
  if (step === 'music-stake') {
    const wallet = typeof client.account === 'string' ? client.account : client.account!.address;
    if (!proof.transactions[key + '-stake']) proof.balanceBeforeStake = String(await client.getBalance({address: wallet as `0x${string}`}));
    await write(key + '-stake', proof.contracts.pools, 'stake', [identifier, 0], 10n ** 16n);
    proof.markets[key].pool = (await read(proof.contracts.pools, 'get_source_pool_ids', [identifier]) as string[])[0];
    proof.fundedPool = proof.markets[key].pool;
    proof.balanceAfterStake = String(await client.getBalance({address: wallet as `0x${string}`}));
  }
  if (step === 'music-settle') await write(key + '-settle', proof.contracts.pools, 'settle', [proof.markets[key].pool]);
  if (step === 'music-claim') {
    const hash = await write(key + '-claim', proof.contracts.pools, 'claim', [proof.markets[key].pool, 1]);
    const wallet = typeof client.account === 'string' ? client.account : client.account?.address;
    await write(key + '-verify-claim', proof.contracts.pools, 'verify_claim', [proof.markets[key].pool, wallet!, hash]);
    proof.balanceAfterClaim = String(await client.getBalance({address: wallet as `0x${string}`}));
  }
  if (step === 'music-season') {
    const wallet = typeof client.account === 'string' ? client.account : client.account?.address;
    await write(key + '-season', proof.contracts.seasons, 'sync_music', [identifier, wallet!]);
    proof.season = JSON.parse(String(await read(proof.contracts.seasons, 'get_track_record', [wallet!])));
  }
  if (step === 'music-film-season') {
    const wallet = typeof client.account === 'string' ? client.account : client.account?.address;
    const films = JSON.parse(readFileSync('public/film-pool-proof.json', 'utf8'));
    for (const roundId of Object.values(films.sourceRounds) as string[]) {
      if (await read(proof.film, 'get_prediction', [roundId, wallet!])) await write('film-season-' + roundId, proof.contracts.seasons, 'sync_film', [roundId, wallet!]);
    }
    proof.season = JSON.parse(String(await read(proof.contracts.seasons, 'get_track_record', [wallet!])));
  }
  proof.markets[key] = {...proof.markets[key], state: JSON.parse(String(await read(address, 'get_market', [identifier])))};
  save();
}
