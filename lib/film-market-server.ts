import 'server-only';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createAccount, createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant, TransactionStatus, type TransactionHash} from 'genlayer-js/types';
import {readClient, successfulFinalized} from './protocol';
import {creditedTransfer} from './pool-proof';
import type {FilmPool, FilmSnapshot, MovieId} from './film-market';
import {upcomingFilms, upcomingRounds} from './upcoming';

type Proof = {contract: `0x${string}`; bullseye: `0x${string}`; payoutVerified?: boolean; deploymentVerified?: boolean; specificationHashes?: Partial<Record<MovieId, string>>; sourceRounds: Record<MovieId, string>};
const client = readClient();
const cache = new Map<string, {until: number; promise: Promise<unknown>}>();
const proofs = new Map<string, Promise<Proof>>();
const isUpcoming = (movie: MovieId) => upcomingFilms.some(film => film.id === movie);
const proof = (movie: MovieId) => {
  const file = isUpcoming(movie) ? 'upcoming-pool-proof.json' : 'film-pool-proof.json';
  if (!proofs.has(file)) proofs.set(file, readFile(join(process.cwd(), 'public', file), 'utf8').then(JSON.parse));
  return proofs.get(file)!;
};

function cached<T>(key: string, seconds: number, read: () => Promise<T>): Promise<T> {
  const existing = cache.get(key);
  if (existing && existing.until > Date.now()) return existing.promise as Promise<T>;
  const promise = read().catch(error => {cache.delete(key); throw error;});
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  cache.set(key, {until: Date.now() + seconds * 1000, promise});
  return promise;
}

export function invalidateFilm(movie: MovieId, poolId?: string) {
  for (const key of cache.keys()) if (key.startsWith('snapshot:' + movie) || key === 'source:' + movie || key === 'ids:' + movie || key === 'pool:' + poolId) cache.delete(key);
}

async function readPool(contract: `0x${string}`, id: string) {
  return JSON.parse(String(await client.readContract({address: contract, functionName: 'get_pool', args: [id], transactionHashVariant: TransactionHashVariant.LATEST_FINAL}))) as FilmPool;
}

export async function filmPool(movie: MovieId, id: string) {
  const p = await proof(movie);
  if (!id.startsWith(p.sourceRounds[movie] + '-pool-') || id.length > 100) throw Error('Unknown movie session.');
  const pool = await cached('pool:' + id, 8, () => readPool(p.contract, id));
  if (pool.source_round_id !== p.sourceRounds[movie]) throw Error('Unknown movie session.');
  return pool;
}

export async function filmSnapshot(movie: MovieId, before?: number): Promise<FilmSnapshot> {
  return cached('snapshot:' + movie + ':' + (before ?? 'latest'), 8, async () => {
    const p = await proof(movie);
    if (!p.contract) throw Error('Movie predictions are being updated. Please try again shortly.');
    const sourceRoundId = p.sourceRounds[movie];
    const [source, ids] = await Promise.all([
      cached('source:' + movie, isUpcoming(movie) && Date.now() / 1000 >= upcomingRounds().find(round => round.id === movie)!.spec.observation_time ? 30 : 300, async () => JSON.parse(String(await client.readContract({address: p.bullseye, functionName: 'get_round', args: [sourceRoundId], transactionHashVariant: TransactionHashVariant.LATEST_FINAL})))),
      cached('ids:' + movie, isUpcoming(movie) ? 300 : 8, () => client.readContract({address: p.contract, functionName: 'get_source_pool_ids', args: [sourceRoundId], transactionHashVariant: TransactionHashVariant.LATEST_FINAL}))
    ]);
    const list = ids as string[], end = before === undefined ? list.length : Math.min(before, list.length), start = Math.max(0, end - 5);
    const pools = await Promise.all(list.slice(start, end).reverse().map(id => cached('pool:' + id, isUpcoming(movie) ? 20 : 8, () => readPool(p.contract, id))));
    const ready = isUpcoming(movie) ? p.deploymentVerified === true && source.specification_hash === p.specificationHashes?.[movie] && ['open', 'closed', 'pending', 'resolved_pending_finality', 'resolved', 'void'].includes(source.status) : p.payoutVerified === true && source.status === 'resolved';
    return {contract: p.contract, sourceRoundId, source, pools, olderBefore: start > 0 ? start : null, ready};
  });
}

export async function filmReceipt(movie: MovieId, hash: TransactionHash) {
  const p = await proof(movie), transaction = await client.getTransaction({hash}), raw = transaction as unknown as Record<string, unknown>;
  if (String(raw.recipient ?? raw.to_address).toLowerCase() !== p.contract.toLowerCase()) throw Error('Receipt belongs to a different contract.');
  const sender = String(raw.sender ?? raw.from_address).toLowerCase();
  const ids = await client.getTriggeredTransactionIds({hash});
  const transfers = await Promise.all(ids.slice(0, 4).map(async child => {
    const receipt = await client.getTransaction({hash: child}), r = receipt as unknown as Record<string, unknown>;
    return {hash: child, state: creditedTransfer(r, p.contract, sender) ? 'credited' : successfulFinalized(receipt) ? 'finalized' : String(r.statusName ?? r.status_name) === 'FINALIZED' ? 'failed' : 'pending', recipient: String(r.recipient ?? r.to_address), value: String(r.value ?? '0')};
  }));
  const state = successfulFinalized(transaction) ? 'finalized' : String(raw.statusName ?? raw.status_name) === 'FINALIZED' ? 'failed' : 'pending';
  const readable = (raw.data as {calldata?: {readable?: string}} | undefined)?.calldata?.readable ?? '';
  const method = /"method"\s*:\s*"(stake|claim|settle)"/.exec(readable)?.[1];
  const argument = /"args"\s*:\s*\[\s*"([A-Za-z0-9-]+)"/.exec(readable)?.[1];
  const poolId = method === 'claim' && argument?.startsWith(p.sourceRounds[movie] + '-pool-') ? argument : undefined;
  if (state === 'finalized') {
    invalidateFilm(movie);
    for (const key of cache.keys()) if (key.startsWith('pool:') || key === 'balance:' + sender) cache.delete(key);
  }
  const amount = poolId && state === 'finalized' ? (await filmPool(movie, poolId)).claims[sender] : undefined;
  return {state, sender, transfers, ...(method === 'stake' || method === 'claim' ? {action: method} : {}), ...(poolId ? {poolId} : {}), ...(amount ? {amount} : {})};
}

const settling = new Map<string, Promise<{state: string; hash?: string}>>();
const settlements = new Map<string, {hash: TransactionHash; at: number}>();

// Anyone can settle this contract. A disposable, unfunded StudioNet account
// submits only this zero-value call. The endpoint cannot stake, claim or select a result.
export async function settleFilm(movie: MovieId, id: string) {
  const running = settling.get(id);
  if (running) return running;
  const run = (async () => {
    const p = await proof(movie);
    if (studionet.id !== 61999 || !id.startsWith(p.sourceRounds[movie] + '-pool-')) throw Error('Unknown movie session.');
    const pool = await readPool(p.contract, id);
    if (pool.source_round_id !== p.sourceRounds[movie]) throw Error('Unknown movie session.');
    if (pool.status !== 'open') {invalidateFilm(movie, id); return {state: pool.status};}
    if (Date.now() / 1000 < pool.entry_deadline) throw Error('Predictions are still open.');
    const prior = settlements.get(id);
    if (prior) {
      if (Date.now() - prior.at < 120_000) return {state: 'pending', hash: prior.hash};
      const receipt = await client.getTransaction({hash: prior.hash}), r = receipt as unknown as Record<string, unknown>;
      if (String(r.statusName ?? r.status_name) !== 'FINALIZED' || successfulFinalized(receipt)) return {state: 'pending', hash: prior.hash};
      settlements.delete(id);
    }
    if (isUpcoming(movie)) {
      const source = JSON.parse(String(await client.readContract({address: p.bullseye, functionName: 'get_round', args: [p.sourceRounds[movie]], transactionHashVariant: TransactionHashVariant.LATEST_FINAL})));
      if (source.specification_hash !== p.specificationHashes?.[movie] || pool.specification_hash !== source.specification_hash) throw Error('Market specification mismatch.');
      if (!['resolved', 'void'].includes(source.status)) {
        if (Date.now() / 1000 < source.spec.observation_time) return {state: 'awaiting_result'};
        if (!['open', 'closed', 'pending'].includes(source.status)) return {state: 'pending'};
        const action = Date.now() / 1000 >= source.spec.resolution_deadline ? 'void' : 'adjudicate';
        const hash = await requestSourceResult(movie, p, action);
        return {state: 'pending', hash};
      }
    }
    const signer = createClient({chain: studionet, account: createAccount()});
    const hash = await signer.writeContract({address: p.contract, functionName: 'settle', args: [id], value: 0n});
    if (settlements.size > 64) settlements.delete(settlements.keys().next().value!);
    settlements.set(id, {hash, at: Date.now()});
    invalidateFilm(movie, id);
    return {state: 'pending', hash};
  })();
  settling.set(id, run);
  try {return await run;} finally {settling.delete(id);}
}

const sourceRequests = new Map<string, {hash: TransactionHash; at: number}>();
async function requestSourceResult(movie: MovieId, p: Proof, action: 'adjudicate' | 'void') {
  const key = movie + ':' + action, previous = sourceRequests.get(key);
  if (previous && Date.now() - previous.at < 600_000) return previous.hash;
  if (previous) {
    const receipt = await client.getTransaction({hash: previous.hash});
    if (!successfulFinalized(receipt) && String((receipt as unknown as {statusName?: string}).statusName) !== 'FINALIZED') return previous.hash;
  }
  const signer = createClient({chain: studionet, account: createAccount()});
  const hash = await signer.writeContract({address: p.bullseye, functionName: action, args: [p.sourceRounds[movie]], value: 0n});
  sourceRequests.set(key, {hash, at: Date.now()}); invalidateFilm(movie);
  return hash;
}

export const walletBalance = (address: `0x${string}`) => cached('balance:' + address.toLowerCase(), 8, async () => String(await client.getBalance({address})));

// The background job follows both source finality and the pool's self callback.
// It never signs a stake or collection, and stops at its invocation budget.
export async function waitForSettlement(hash: string, until: number) {
  async function wait(id: TransactionHash) {
    const seconds = Math.min(60, Math.floor((until - Date.now()) / 1000));
    if (seconds < 5) throw Error('Settlement continues on the next check.');
    const receipt = await client.waitForTransactionReceipt({hash: id, status: TransactionStatus.FINALIZED, retries: Math.max(1, Math.floor(seconds / 5)), interval: 5000});
    if (!successfulFinalized(receipt)) throw Error('Settlement execution failed.');
  }
  await wait(hash as TransactionHash);
  for (const child of (await client.getTriggeredTransactionIds({hash: hash as TransactionHash})).slice(0, 4)) await wait(child);
}
