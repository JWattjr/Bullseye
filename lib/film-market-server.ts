import 'server-only';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createAccount, createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant, type TransactionHash} from 'genlayer-js/types';
import {readClient, successfulFinalized} from './protocol';
import {creditedTransfer} from './pool-proof';
import type {FilmPool, FilmSnapshot, MovieId} from './film-market';

type Proof = {contract: `0x${string}`; bullseye: `0x${string}`; payoutVerified: boolean; sourceRounds: Record<MovieId, string>};
const client = readClient();
const cache = new Map<string, {until: number; promise: Promise<unknown>}>();
let proofPromise: Promise<Proof> | undefined;
const proof = () => proofPromise ??= readFile(join(process.cwd(), 'public/film-pool-proof.json'), 'utf8').then(JSON.parse);

function cached<T>(key: string, seconds: number, read: () => Promise<T>): Promise<T> {
  const existing = cache.get(key);
  if (existing && existing.until > Date.now()) return existing.promise as Promise<T>;
  const promise = read().catch(error => {cache.delete(key); throw error;});
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  cache.set(key, {until: Date.now() + seconds * 1000, promise});
  return promise;
}

export function invalidateFilm(movie: MovieId, poolId?: string) {
  for (const key of cache.keys()) if (key.startsWith('snapshot:' + movie) || key === 'ids:' + movie || key === 'pool:' + poolId) cache.delete(key);
}

async function readPool(contract: `0x${string}`, id: string) {
  return JSON.parse(String(await client.readContract({address: contract, functionName: 'get_pool', args: [id], transactionHashVariant: TransactionHashVariant.LATEST_FINAL}))) as FilmPool;
}

export async function filmPool(movie: MovieId, id: string) {
  const p = await proof();
  if (!id.startsWith(p.sourceRounds[movie] + '-pool-') || id.length > 100) throw Error('Unknown movie session.');
  const pool = await cached('pool:' + id, 8, () => readPool(p.contract, id));
  if (pool.source_round_id !== p.sourceRounds[movie]) throw Error('Unknown movie session.');
  return pool;
}

export async function filmSnapshot(movie: MovieId, before?: number): Promise<FilmSnapshot> {
  return cached('snapshot:' + movie + ':' + (before ?? 'latest'), 8, async () => {
    const p = await proof();
    if (!p.contract) throw Error('Movie predictions are being updated. Please try again shortly.');
    const sourceRoundId = p.sourceRounds[movie];
    const [source, ids] = await Promise.all([
      cached('source:' + movie, 300, async () => JSON.parse(String(await client.readContract({address: p.bullseye, functionName: 'get_round', args: [sourceRoundId], transactionHashVariant: TransactionHashVariant.LATEST_FINAL})))),
      cached('ids:' + movie, 8, () => client.readContract({address: p.contract, functionName: 'get_source_pool_ids', args: [sourceRoundId], transactionHashVariant: TransactionHashVariant.LATEST_FINAL}))
    ]);
    const list = ids as string[], end = before === undefined ? list.length : Math.min(before, list.length), start = Math.max(0, end - 5);
    const pools = await Promise.all(list.slice(start, end).reverse().map(id => cached('pool:' + id, 8, () => readPool(p.contract, id))));
    return {contract: p.contract, sourceRoundId, source, pools, olderBefore: start > 0 ? start : null, ready: p.payoutVerified === true && source.status === 'resolved'};
  });
}

export async function filmReceipt(movie: MovieId, hash: TransactionHash) {
  const p = await proof(), transaction = await client.getTransaction({hash}), raw = transaction as unknown as Record<string, unknown>;
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
    const p = await proof();
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

export const walletBalance = (address: `0x${string}`) => cached('balance:' + address.toLowerCase(), 8, async () => String(await client.getBalance({address})));
