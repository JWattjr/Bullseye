import 'server-only';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createAccount, createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant, type TransactionHash} from 'genlayer-js/types';
import {readClient, successfulFinalized} from './protocol';
import {creditedTransfer} from './pool-proof';
import type {MusicContracts, MusicMarket, MusicPool, MusicSnapshot, MusicReceipt, TrackRecord, SeasonScore} from './music';
import {musicMaintenanceFinal} from './music';

const client = readClient();
const cache = new Map<string, {expires: number; promise: Promise<unknown>}>();
export const validMusicId = (id: string) => /^[a-z0-9-]{1,100}$/.test(id);
function cached<T>(key: string, seconds: number, read: () => Promise<T>): Promise<T> {
  const item = cache.get(key);
  if (item && item.expires > Date.now()) return item.promise as Promise<T>;
  const promise = read().catch(error => {cache.delete(key); throw error;});
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  cache.set(key, {expires: Date.now() + seconds * 1000, promise});
  return promise;
}
async function contracts(): Promise<MusicContracts> {
  return cached('contracts', 300, async () => {
    const config = JSON.parse(await readFile(join(process.cwd(), 'public/music-proof.json'), 'utf8'));
    if (!['markets', 'pools', 'seasons'].every(key => /^0x[a-fA-F0-9]{40}$/.test(config.contracts?.[key] ?? ''))) throw Error('Music deployment is unavailable.');
    return config.contracts;
  });
}
const read = (address: `0x${string}`, method: string, args: Parameters<typeof client.readContract>[0]['args']) => client.readContract({address, functionName: method, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL});
async function market(id: string) {
  if (!validMusicId(id)) throw Error('Invalid music market.');
  const addresses = await contracts();
  return cached('market:' + id, 15, async () => ({...JSON.parse(String(await read(addresses.markets, 'get_market', [id]))), id}) as MusicMarket);
}
export async function musicSnapshot(id?: string, participant?: string): Promise<MusicSnapshot> {
  const addresses = await contracts();
  if (!id) return cached('directory', 90, async () => {
    const ids = await read(addresses.markets, 'get_market_ids', []) as string[];
    const markets = await Promise.all(ids.slice(-20).reverse().map(market));
    return {contracts: addresses, markets, pools: [], serverTime: Math.floor(Date.now() / 1000)};
  });
  const source = await market(id);
  const proof = await cached('proof-transactions', 30, async () => JSON.parse(await readFile(join(process.cwd(), 'public/music-proof.json'), 'utf8')) as {markets: Record<string, {id: string}>; transactions: Record<string, string>});
  const caseKey = Object.entries(proof.markets).find(([, record]) => record.id === id)?.[0];
  const transactions = caseKey ? ['resolve', 'resolve-child-0'].flatMap((suffix, index) => {
    const hash = proof.transactions[caseKey + '-' + suffix];
    return /^0x[a-fA-F0-9]{64}$/.test(hash ?? '') ? [{label: index ? 'Final activation transaction' : 'Resolution transaction', hash}] : [];
  }) : [];
  const ids = await cached('pool-ids:' + id, 30, () => read(addresses.pools, 'get_source_pool_ids', [id])) as string[];
  const pools = await Promise.all(ids.slice(-5).map(poolId => cached('pool:' + poolId, 15, async () => JSON.parse(String(await read(addresses.pools, 'get_pool', [poolId]))) as MusicPool)));
  const rawPrediction = participant ? await cached('prediction:' + id + ':' + participant, 15, () => read(addresses.markets, 'get_prediction', [id, participant])) : null;
  return {contracts: addresses, markets: [source], market: source, pools, prediction: rawPrediction ? JSON.parse(String(rawPrediction)) : null, transactions, serverTime: Math.floor(Date.now() / 1000)};
}
export async function musicReceipt(hash: TransactionHash): Promise<Partial<MusicReceipt>> {
  const addresses = await contracts();
  return cached('receipt:' + hash, 8, async () => {
    const transaction = await client.getTransaction({hash});
    const raw = transaction as unknown as Record<string, unknown>;
    const contract = Object.values(addresses).find(address => address.toLowerCase() === String(raw.recipient ?? raw.to_address).toLowerCase());
    if (!contract) throw Error('Receipt belongs to another contract.');
    const status = String(raw.statusName ?? raw.status_name);
    const state = successfulFinalized(transaction) ? 'finalized-success' : ['FINALIZED', 'CANCELED'].includes(status) ? 'finalized-error' : status === 'ACCEPTED' ? 'accepted' : 'pending';
    const sender = String(raw.sender ?? raw.from_address).toLowerCase();
    const children = state === 'finalized-success' ? await Promise.all((await client.getTriggeredTransactionIds({hash})).slice(0, 4).map(async child => {
      const result = await client.getTransaction({hash: child});
      const tx = result as unknown as Record<string, unknown>;
      const native = tx.consensus_data === null;
      return {hash: child, state: native ? creditedTransfer(tx, contract, sender) ? 'credited' : String(tx.statusName ?? tx.status_name) === 'FINALIZED' && tx.value_credited === false ? 'failed' : 'pending' : successfulFinalized(result) ? 'finalized-success' : String(tx.statusName ?? tx.status_name) === 'FINALIZED' ? 'finalized-error' : 'pending', value: String(tx.value ?? '0')};
    })) : [];
    if (state === 'finalized-success') for (const key of cache.keys()) if (key.startsWith('market:') || key.startsWith('pool') || key === 'directory' || key.startsWith('season:')) cache.delete(key);
    return {hash, state, status, sender, children};
  });
}
const keeper = createClient({chain: studionet, account: createAccount()});
const writes = new Map<string, {hash: TransactionHash; at: number}>();
async function pendingMaintenance(key: string, knownHash?: TransactionHash) {
  const previous = writes.get(key);
  if (previous && Date.now() - previous.at < 90_000) return previous.hash;
  const hash = previous?.hash ?? knownHash;
  if (hash && !musicMaintenanceFinal(await musicReceipt(hash))) return hash;
}
export async function musicMaintenance(id: string, action: string, participant?: string, hash?: TransactionHash) {
  if (action === 'sync-film') {
    if (!participant) throw Error('Choose a wallet track record.');
    const addresses = await contracts();
    const config = JSON.parse(await readFile(join(process.cwd(), 'public/film-pool-proof.json'), 'utf8'));
    const profile = await musicSeason(participant);
    const submitted = [];
    for (const roundId of Object.values(config.sourceRounds) as string[]) {
      if (profile.profile?.results.some(result => result.category === 'film' && result.market_id === roundId)) continue;
      const key = 'sync-film:' + roundId + ':' + participant;
      if (await pendingMaintenance(key)) continue;
      const entry = await read(config.bullseye, 'get_prediction', [roundId, participant]);
      if (!entry) continue;
      const record = JSON.parse(String(await read(config.bullseye, 'get_round', [roundId])));
      if (!['resolved', 'void'].includes(record.status)) continue;
      const tx = await keeper.writeContract({address: addresses.seasons, functionName: 'sync_film', args: [roundId, participant], value: 0n});
      writes.set(key, {hash: tx, at: Date.now()}); submitted.push(tx);
    }
    return {state: submitted.length ? 'submitted' : 'complete', hashes: submitted};
  }
  if (action === 'sync-season') {
    if (!participant) throw Error('Choose a wallet track record.');
    const snapshot = await musicSnapshot(id, participant);
    if (!snapshot.prediction || !['resolved', 'void'].includes(snapshot.market!.status)) return {state: 'waiting'};
    const profile = await musicSeason(participant);
    if (profile.profile?.results.some(result => result.category === 'music' && result.market_id === id)) return {state: 'complete'};
    const key = action + ':' + id + ':' + participant;
    const previousHash = await pendingMaintenance(key);
    if (previousHash) return {state: 'pending', hash: previousHash};
    const tx = await keeper.writeContract({address: snapshot.contracts.seasons, functionName: 'sync_music', args: [id, participant], value: 0n});
    writes.set(key, {hash: tx, at: Date.now()});
    for (const key of cache.keys()) if (key.startsWith('season:')) cache.delete(key);
    return {state: 'submitted', hash: tx};
  }
  const snapshot = await musicSnapshot(id);
  const source = snapshot.market!;
  const pool = snapshot.pools[0];
  let address = snapshot.contracts.markets, method = '', args: Parameters<typeof keeper.writeContract>[0]['args'] = [];
  if (action === 'resolve') {
    if (!source.spec || !['open', 'closed', 'pending', 'compiled'].includes(source.status)) return {state: 'waiting'};
    if (snapshot.serverTime < source.spec.entry_deadline || snapshot.serverTime < source.spec.observation_time) return {state: 'waiting'};
    if (source.status === 'compiled' && snapshot.serverTime < source.spec.resolution_deadline) return {state: 'waiting'};
    method = snapshot.serverTime >= source.spec.resolution_deadline ? 'void' : 'adjudicate'; args = [id];
  } else if (action === 'settle') {
    if (!pool || pool.status !== 'open' || snapshot.serverTime < pool.entry_deadline) return {state: 'waiting'};
    if (!['resolved', 'void'].includes(source.status) && snapshot.serverTime < pool.refund_deadline) return {state: 'waiting'};
    address = snapshot.contracts.pools; method = 'settle'; args = [pool.id];
  } else if (action === 'verify-claim') {
    if (!pool || !participant || !hash || pool.claim_attempts[participant]?.status !== 'pending') return {state: 'waiting'};
    const receipt = await musicReceipt(hash);
    if (receipt.sender !== participant || receipt.state !== 'finalized-success' || !receipt.children?.some(child => ['credited', 'failed'].includes(child.state))) return {state: 'waiting'};
    address = snapshot.contracts.pools; method = 'verify_claim'; args = [pool.id, participant, hash];
  } else throw Error('Unknown maintenance action.');
  const key = action + ':' + id + ':' + (hash ?? '');
  // A published proof hash survives a cold server instance. Never duplicate its
  // in-flight judgment merely because the finalized market still looks open.
  let knownHash: TransactionHash | undefined;
  if (action === 'resolve') {
    const proof = await cached('maintenance-proof', 300, async () => JSON.parse(await readFile(join(process.cwd(), 'public/music-proof.json'), 'utf8')));
    const proofKey = Object.entries(proof.markets as Record<string, {id: string}>).find(([, record]) => record.id === id)?.[0];
    knownHash = proofKey ? proof.transactions[proofKey + '-resolve'] : undefined;
  }
  const previousHash = await pendingMaintenance(key, knownHash);
  if (previousHash) return {state: 'pending', hash: previousHash};
  const tx = await keeper.writeContract({address, functionName: method, args, value: 0n});
  if (writes.size > 500) writes.delete(writes.keys().next().value!);
  writes.set(key, {hash: tx, at: Date.now()});
  return {state: 'submitted', hash: tx};
}
export async function musicSeason(participant?: string) {
  const addresses = await contracts();
  return cached('season:' + (participant ?? 'all'), 60, async () => {
    const [competitive, historical, sources, profile, directory, films] = await Promise.all([
      read(addresses.seasons, 'get_leaderboard', [false]), read(addresses.seasons, 'get_leaderboard', [true]), read(addresses.seasons, 'get_sources', []),
      participant ? read(addresses.seasons, 'get_track_record', [participant]) : Promise.resolve(null),
      musicSnapshot(),
      cached('season-film-timeline', 300, async () => {
        const config = JSON.parse(await readFile(join(process.cwd(), 'public/film-pool-proof.json'), 'utf8'));
        return Promise.all(Object.entries(config.sourceRounds as Record<string, string>).map(async ([movie, id]) => {
          const record = JSON.parse(String(await read(config.bullseye, 'get_round', [id])));
          return {category: 'film', id, title: record.spec.event.split(', ')[0], status: record.status, time: record.spec.entry_deadline, href: '/rounds/' + movie, outcome: record.evidence ? '$' + new Intl.NumberFormat('en-US').format(record.evidence.normalized_value) : ''};
        }));
      }),
    ]);
    const recent = [...films, ...directory.markets.filter(market => market.spec).map(market => ({category: 'music', id: market.id, title: market.spec!.albums.map(album => album.title).join(' vs '), status: market.status, time: market.spec!.entry_deadline, href: '/music/' + market.id, outcome: market.evidence?.matches.map(match => match.position === null ? 'Did not chart' : '#' + match.position).join(' vs ') ?? ''}))].filter(record => ['resolved', 'void'].includes(record.status)).sort((a, b) => b.time - a.time).slice(0, 12);
    return {contracts: addresses, competitive: JSON.parse(String(competitive)) as ({participant: string} & SeasonScore)[], historical: JSON.parse(String(historical)) as ({participant: string} & SeasonScore)[], sources, profile: profile ? JSON.parse(String(profile)) as TrackRecord : null, recent};
  });
}
