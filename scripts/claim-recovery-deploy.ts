import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {GenLayerClient, TransactionHash} from 'genlayer-js/types';
import {TransactionStatus, TransactionHashVariant} from 'genlayer-js/types';
import {studionet} from 'genlayer-js/chains';
import {successfulFinalized} from '../lib/protocol';
import {creditedTransfer} from '../lib/pool-proof';

const folder = 'docs/proofs/claim-recovery', path = folder + '/manifest.json';
const stringify = (value: unknown) => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? String(item) : item, 2) + '\n';

// Called by the CLI, which retains its own signing key. No key is exported.
export async function claimRecoveryDeploy(client: GenLayerClient<typeof studionet>) {
  if (client.chain?.id !== 61999) throw Error('Recovery verification requires StudioNet.');
  mkdirSync(folder, {recursive: true});
  const legacy = JSON.parse(readFileSync('public/film-pool-proof.json', 'utf8'));
  const proof = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {
    network: 'StudioNet', simulated: true, payoutVersion: 2, bullseye: legacy.bullseye,
    transactions: {}, contracts: {}, fundedStakeWei: '0', live: {},
  };
  const save = () => writeFileSync(path, stringify(proof));
  async function final(hash: TransactionHash, name: string, native = false, amount?: string) {
    const receipt = await client.waitForTransactionReceipt({hash, status: TransactionStatus.FINALIZED, retries: 48, interval: 5000});
    writeFileSync(folder + '/' + name + '.json', stringify(receipt));
    if (native ? !creditedTransfer(receipt as unknown as Record<string, unknown>, String(receipt.sender ?? ''), undefined, amount) : !successfulFinalized(receipt)) throw Error('Unsuccessful finalized receipt: ' + name);
    console.log(name + ': finalized ' + (native ? 'native credit' : 'successful execution'));
    return receipt;
  }
  async function deploy(key: string, code: string, args: string[]) {
    if (proof.contracts[key]) return proof.contracts[key] as `0x${string}`;
    const name = key + '-deploy';
    const hash = proof.transactions[name] ?? await client.deployContract({code: readFileSync(code, 'utf8'), args});
    proof.transactions[name] = hash; save();
    const receipt = await final(hash, name);
    proof.contracts[key] = receipt.recipient; save();
    return receipt.recipient as `0x${string}`;
  }
  async function write(name: string, address: `0x${string}`, method: string, args: Parameters<typeof client.writeContract>[0]['args'], value = 0n) {
    let hash: TransactionHash = proof.transactions[name];
    if (!hash) {
      if (value) {
        if (value !== 2n * 10n ** 18n || BigInt(proof.fundedStakeWei) + value > 4n * 10n ** 18n) throw Error('Authorized 4 GEN cumulative stake cap exceeded.');
        if (process.env.BULLSEYE_RECOVERY_FUNDS !== 'authorized-4-gen') throw Error('Explicit 4 GEN test authorization required.');
      }
      hash = await client.writeContract({address, functionName: method, args, value});
      proof.transactions[name] = hash;
      if (value) proof.fundedStakeWei = String(BigInt(proof.fundedStakeWei) + value);
      save();
    }
    await final(hash, name);
    const children = await client.getTriggeredTransactionIds({hash});
    for (const [index, child] of children.entries()) {
      const childName = name + '-child-' + index;
      proof.transactions[childName] = child; save();
      await final(child, childName, method === 'claim', method === 'claim' ? String(2n * 10n ** 18n) : undefined);
    }
    return hash;
  }
  const read = async (address: `0x${string}`, method: string, args: Parameters<typeof client.readContract>[0]['args']) => client.readContract({address, functionName: method, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL});
  const step = process.env.BULLSEYE_STEP;
  if (step === 'recovery-deploy') {
    await deploy('films', 'contracts/film_pools.py', [proof.bullseye]);
    await deploy('upcoming', 'contracts/forecast_pools.py', [proof.bullseye]);
    for (const key of ['films', 'upcoming']) {
      if (await read(proof.contracts[key], 'get_bullseye', []) !== proof.bullseye) throw Error('Oracle binding mismatch.');
    }
    proof.sourceHashes = Object.fromEntries(['film_pools', 'forecast_pools'].map(name => [name, createHash('sha256').update(readFileSync('contracts/' + name + '.py')).digest('hex')]));
    proof.deploymentVerified = true; save(); return;
  }
  if (step === 'recovery-create') {
    const upcoming = JSON.parse(readFileSync('public/upcoming-pool-proof.json', 'utf8'));
    proof.upcomingPools ??= {};
    for (const [movie, source] of Object.entries(upcoming.sourceRounds)) {
      await write(movie + '-create-v2', proof.contracts.upcoming, 'create_pool', [String(source)]);
      const ids = await read(proof.contracts.upcoming, 'get_source_pool_ids', [String(source)]) as string[];
      const record = JSON.parse(String(await read(proof.contracts.upcoming, 'get_pool', [ids[0]])));
      if (record.payout_version !== 2 || record.specification_hash !== upcoming.specificationHashes[movie]) throw Error('Upcoming v2 specification mismatch.');
      proof.upcomingPools[movie] = ids[0]; save();
    }
    return;
  }
  const key = process.env.BULLSEYE_RECOVERY_CASE === 'forecast' ? 'forecast' : 'historical';
  const address = key === 'historical' ? proof.contracts.films : await deploy('forecastFixturePools', 'contracts/forecast_pools.py', [await deploy('forecastFixtureOracle', 'tests/fixtures/recovery_oracle.py', [])]);
  const source = key === 'historical' ? 'barbie-network-demo' : 'forecast-recovery-fixture';
  if (!address) throw Error('Deploy replacement contracts first.');
  if (step === 'recovery-stake') {
    const wallet = typeof client.account === 'string' ? client.account : client.account?.address;
    if (!wallet || wallet.toLowerCase() !== '0xdb433ff614bdd1ece21aa97221c3e0a7ecf79c92') throw Error('Use the specifically authorized CLI test account.');
    const before = proof.live[key]?.walletBefore ?? String(await client.getBalance({address: wallet}));
    await write(key + '-stake', address, 'stake', [source, 2], 2n * 10n ** 18n);
    const ids = await read(address, 'get_source_pool_ids', [source]) as string[];
    proof.live[key] = {...proof.live[key], source, contract: address, pool: ids.at(-1), wallet, walletBefore: before,
      walletAfterStake: String(await client.getBalance({address: wallet})), stakeWei: String(2n * 10n ** 18n), oracleIsFixture: key === 'forecast'};
    save(); return;
  }
  if (step === 'recovery-claim') {
    const live = proof.live[key];
    if (live?.successVerified) return;
    if (!live?.pool) throw Error('Complete the authorized stake first.');
    const record = JSON.parse(String(await read(address, 'get_pool', [live.pool])));
    if (Math.floor(Date.now() / 1000) < record.entry_deadline) throw Error('Entry window is still open; resume after ' + new Date(record.entry_deadline * 1000).toISOString());
    live.walletBeforeClaim ??= String(await client.getBalance({address: live.wallet}));
    save();
    if (key === 'forecast') await write(key + '-resolve-fixture', proof.contracts.forecastFixtureOracle, 'resolve_fixture', []);
    await write(key + '-settle', address, 'settle', [live.pool]);
    const claimHash = await write(key + '-claim', address, 'claim', [live.pool, 1]);
    const parent = await client.getTransaction({hash: claimHash}), children = await client.getTriggeredTransactionIds({hash: claimHash});
    if (children.length !== 1) throw Error('Expected one native payout.');
    const transfer = await client.getTransaction({hash: children[0]});
    if (!creditedTransfer(transfer as unknown as Record<string, unknown>, address, live.wallet, live.stakeWei)) throw Error('Exact recipient credit missing.');
    live.beforeVerification = JSON.parse(String(await read(address, 'get_pool', [live.pool])));
    if (live.beforeVerification.claims[live.wallet.toLowerCase()]) throw Error('Claim incorrectly marked paid before verification.');
    await write(key + '-verify', address, 'verify_claim', [live.pool, live.wallet, claimHash]);
    live.claim = JSON.parse(String(await read(address, 'get_claim', [live.pool, live.wallet])));
    live.poolState = JSON.parse(String(await read(address, 'get_pool', [live.pool])));
    live.walletAfterPayout = String(await client.getBalance({address: live.wallet}));
    live.poolBalanceAfter = String(await client.getBalance({address}));
    if (live.claim.status !== 'paid' || BigInt(live.walletAfterPayout) !== BigInt(live.walletBeforeClaim) + BigInt(live.stakeWei) || live.poolBalanceAfter !== '0') throw Error('Final claim or exact balances mismatch.');
    live.parentHash = parent.hash; live.transferHash = children[0]; live.successVerified = true; save();
  }
}
