import type {Round, Specification} from './domain';
import {claimable, gen, type Pool} from './pools';

export const movieIds = ['barbie-practice', 'oppenheimer-practice', 'dune-two-practice'] as const;
export type MovieId = typeof movieIds[number];
export const isMovie = (id: string): id is MovieId => movieIds.some(movie => movie === id);
export type FilmPool = Pool & {source_round_id: string; reference_winner: number; reference_value: number};
export type FilmSnapshot = {
  contract: `0x${string}`;
  sourceRoundId: string;
  source: {status: string; spec: Specification; winner: number; evidence: {normalized_value: number} | null};
  pools: FilmPool[];
  olderBefore: number | null;
  ready: boolean;
};
export type FilmReceipt = {
  hash: string;
  action: 'stake' | 'claim';
  state: string;
  sender?: string;
  poolId?: string;
  amount?: string;
  transfers?: {hash: string; state: string; recipient: string; value: string}[];
};

export function displayGen(wei: string) {
  const exact = gen(wei), [whole, fraction = ''] = exact.split('.');
  const decimals = fraction.slice(0, 3).replace(/0+$/, '');
  return BigInt(wei) > 0n && BigInt(wei) < 10n ** 15n ? '<0.001' :
    new Intl.NumberFormat('en-US').format(Number(whole)) + (decimals ? '.' + decimals : '');
}

// Stake shares describe the pot, never a probability or a promised return.
export function poolShare(pool: FilmPool | undefined, range: number) {
  return !pool || BigInt(pool.total) === 0n ? 0 : Number(BigInt(pool.pools[range]) * 100n / BigInt(pool.total));
}

export function projectedReturn(pool: FilmPool | undefined, range: number, stake: bigint) {
  const total = BigInt(pool?.total ?? '0'), winning = BigInt(pool?.pools[range] ?? '0');
  return String((total + stake) * stake / (winning + stake));
}

export function positionState(pool: FilmPool, account: string, now: number) {
  if (pool.claims[account]) return 'Transfer requested';
  if (pool.status === 'void' || pool.status === 'resolved' && pool.winner !== null && BigInt(pool.pools[pool.winner]) === 0n) return 'Refund available';
  if (pool.status === 'resolved') return BigInt(claimable(pool, account)) > 0n ? 'Won' : 'Lost';
  return now < pool.entry_deadline ? 'Open' : 'Resolving';
}

export function receiptFailed(receipt: FilmReceipt) {
  return receipt.state === 'failed' || receipt.action === 'claim' && receipt.transfers?.some(t => t.state === 'failed' && t.recipient.toLowerCase() === receipt.sender?.toLowerCase()) === true;
}

export function receiptComplete(receipt: FilmReceipt) {
  if (receiptFailed(receipt)) return true;
  if (receipt.action === 'stake') return receipt.state === 'finalized';
  return receipt.transfers?.some(t => t.state === 'credited' &&
    t.recipient.toLowerCase() === receipt.sender?.toLowerCase() && t.value === receipt.amount) === true;
}

export function receiptCopy(receipt: FilmReceipt) {
  if (receiptFailed(receipt)) return receipt.action === 'stake' ? 'Prediction did not go through' : 'Transfer needs attention';
  if (receipt.action === 'stake') return receipt.state === 'finalized' ? 'Your prediction is in' : 'Confirming your prediction…';
  return receiptComplete(receipt) ? 'GEN received in your wallet' : 'Sending GEN to your wallet…';
}

export const movieQuestion = (round: Round) => `How much did ${round.title} make on opening weekend?`;
