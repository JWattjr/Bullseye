export type MusicContracts = {markets: `0x${string}`; pools: `0x${string}`; seasons: `0x${string}`};
export type Album = {title: string; artist: string; aliases: string[]; chart_week: string; identity_rule: 'combined_standard_deluxe' | 'exact_edition'};
export type MusicSpec = {version: number; market_type: 'rank' | 'head_to_head'; albums: Album[]; bins: ({lower: number | null; upper: number | null} | string)[]; entry_deadline: number; observation_time: number; resolution_deadline: number; historical: boolean; snapshot_policy: string; missing_evidence: string};
export type MusicEvidence = {status: string; charts: {week: string; capture: string; snapshot: string; cdx_digest: string; rows_digest: string}[]; matches: {position: number | null; quote: string}[]};
export type MusicMarket = {id: string; creator: string; question: string; status: string; spec: MusicSpec | null; specification_hash: string; rejection_reason: string; histogram: number[]; participants: string[]; winner: number | null; evidence: MusicEvidence | null};
export type MusicClaim = {attempt: number; amount: string; status: string; claim_hash?: string; transfer_hash?: string};
export type MusicPool = {id: string; source_round_id: string; status: string; specification_hash: string; entry_deadline: number; refund_deadline: number; total: string; pools: string[]; participants: string[]; entries: Record<string, {range: number; stake: string}>; claims: Record<string, string>; claim_attempts: Record<string, MusicClaim>; winner: number | null};
export type MusicSnapshot = {contracts: MusicContracts; markets: MusicMarket[]; market?: MusicMarket; pools: MusicPool[]; prediction?: {choice: number; exact_rank: number; submitted_at: number} | null; serverTime: number; transactions?: {label: string; hash: string}[]};
export type MusicReceipt = {hash: `0x${string}`; action: string; marketId?: string; poolId?: string; kind: keyof MusicContracts; sender?: string; state: 'submitted' | 'pending' | 'accepted' | 'finalized-success' | 'finalized-error'; status?: string; children?: {hash: string; state: string; value: string}[]};
export type SeasonScore = {entries: number; hits: number; points: number; streak: number; best_streak: number; average_closeness: number | null; hit_rate: number | null};
export type SeasonResult = {category: 'film' | 'music'; market_id: string; participant: string; entry_deadline: number; historical: boolean; void: boolean; correct: boolean; has_exact: boolean; closeness: number; points: number; specification_hash: string};
export type TrackRecord = {participant: string; competitive: SeasonScore; historical: SeasonScore; results: SeasonResult[]};
export const rankLabels = ['#1', '#2–5', '#6–10', '#11–50', '#51–200', 'Did not chart'];
export function exactRankError(value: string, choice: number | null): string {
  if (!value) return '';
  if (!/^\d{1,3}$/.test(value) || Number(value) < 1 || Number(value) > 200) return 'Enter an exact rank from 1 to 200.';
  const rank = Number(value);
  const bin = rank === 1 ? 0 : rank <= 5 ? 1 : rank <= 10 ? 2 : rank <= 50 ? 3 : 4;
  return bin !== choice ? 'Your exact rank must fit the selected outcome.' : '';
}
export const outcomeLabel = (market: MusicMarket, choice: number) => market.spec?.market_type === 'head_to_head' ? market.spec.albums[choice]?.title ?? 'Album' : rankLabels[choice] ?? 'Outcome';
export const musicDate = (time: number) => new Date(time * 1000).toLocaleString('en-GB', {timeZone: 'UTC', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) + ' UTC';
export const musicFinal = (receipt: MusicReceipt) => receipt.state === 'finalized-success' || receipt.state === 'finalized-error';
export const musicMaintenanceFinal = (receipt: Partial<MusicReceipt>) => ['finalized-success', 'finalized-error'].includes(receipt.state ?? '') && (receipt.children ?? []).every(child => ['finalized-success', 'finalized-error', 'credited', 'failed'].includes(child.state));
export function musicStake(value: string): bigint {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(value)) throw Error('Enter a GEN amount from 0.01 to 100.');
  const [whole, fraction = ''] = value.split('.');
  const wei = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'));
  if (wei < 10n ** 16n || wei > 100n * 10n ** 18n) throw Error('Stake from 0.01 to 100 GEN.');
  return wei;
}
export function musicAllocation(pool: MusicPool, participant: string): bigint {
  const entry = pool.entries[participant];
  if (!entry || !['resolved', 'void'].includes(pool.status) || pool.claims[participant]) return 0n;
  if (pool.claim_attempts[participant] && pool.claim_attempts[participant].status !== 'failed') return 0n;
  if (pool.status === 'void' || pool.winner === null || BigInt(pool.pools[pool.winner]) === 0n) return BigInt(entry.stake);
  if (entry.range !== pool.winner) return 0n;
  let prefix = 0n;
  for (const wallet of pool.participants) {
    const other = pool.entries[wallet];
    if (other.range !== pool.winner) continue;
    if (wallet === participant) return BigInt(pool.total) * (prefix + BigInt(entry.stake)) / BigInt(pool.pools[pool.winner]) - BigInt(pool.total) * prefix / BigInt(pool.pools[pool.winner]);
    prefix += BigInt(other.stake);
  }
  return 0n;
}
