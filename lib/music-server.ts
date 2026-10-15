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
async function contracts(previous = false): Promise<MusicContracts> {
  return cached('contracts:'+previous, 300, async () => {
    const config = JSON.parse(await readFile(join(process.cwd(), previous ? 'public/music-previous-proof.json' : 'public/music-proof.json'), 'utf8'));
    if (!['markets', 'pools', 'seasons'].every(key => /^0x[a-fA-F0-9]{40}$/.test(config.contracts?.[key] ?? ''))) throw Error('Music deployment is unavailable.');
    return config.contracts;
  });
}
const read = (address: `0x${string}`, method: string, args: Parameters<typeof client.readContract>[0]['args']) => client.readContract({address, functionName: method, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL});
async function market(id: string, previous = false) {
  if (!validMusicId(id)) throw Error('Invalid music market.');
  const addresses = await contracts(previous);
  return cached('market:' + addresses.markets + ':' + id, 20, async () => {
    const raw=await read(addresses.markets,'get_market',[id]);
    if(raw)return {...JSON.parse(String(raw)),id} as MusicMarket;
    const listing=addresses.challenges?await read(addresses.challenges,'get_listing',[id]):'';
    if(!listing)throw Error('Unknown music market.');
    const pending=JSON.parse(String(listing));return {id,creator:pending.creator,question:pending.question,status:pending.finances_closed?'rejected':'compiling',spec:null,specification_hash:'',rejection_reason:pending.finances_closed?'Compilation did not finalize before the listing deadline. The listing deposit was returned as withdrawal credit.':'',histogram:[],participants:[],winner:null,evidence:null};
  });
}
export async function musicSnapshot(id?: string, participant?: string, previous = false): Promise<MusicSnapshot> {
  if(id && !previous) {
    const old=await cached('previous-proof',300,async()=>JSON.parse(await readFile(join(process.cwd(),'public/music-previous-proof.json'),'utf8')));
    previous=Object.values(old.markets as Record<string,{id:string}>).some(record=>record.id===id);
  }
  const addresses = await contracts(previous);
  const reviewConfig=addresses.challenges?await cached('review-config',300,async()=>JSON.parse(String(await read(addresses.challenges!,'get_config',[])))):undefined;
  if (!id) {
   const directory=await cached('directory:'+previous, 90, async () => {
    const ids = await read(addresses.markets, 'get_market_ids', []) as string[];
    const markets = await Promise.all(ids.slice(-20).reverse().map(id=>market(id,previous)));
    return {contracts: addresses, previous, markets, pools: [], reviewConfig, serverTime: Math.floor(Date.now() / 1000)};
  });
   const credit=participant&&addresses.challenges?await cached('credit:'+participant,15,async()=>JSON.parse(String(await read(addresses.challenges!,'get_credit',[participant])))):undefined;
   return {...directory,credit};
  }
  const source = await market(id,previous);
  const proof = await cached('proof-transactions:'+previous, 30, async () => JSON.parse(await readFile(join(process.cwd(), previous?'public/music-previous-proof.json':'public/music-proof.json'), 'utf8')) as {markets: Record<string, {id: string;rulingTransaction?:string}>; transactions: Record<string, string>});
  const caseKey = Object.entries(proof.markets).find(([, record]) => record.id === id)?.[0];
  const labels=['Resolution transaction','Final activation transaction','Pool claim transaction','Native payout receipt'];
  const transactions = caseKey ? ['resolve', 'resolve-child-0','claim','claim-child-0'].flatMap((suffix, index) => {
    const hash = proof.transactions[caseKey + '-' + suffix];
    return /^0x[a-fA-F0-9]{64}$/.test(hash ?? '') ? [{label:labels[index], hash}] : [];
  }) : [];
  const ids = await cached('pool-ids:' + addresses.pools + ':' + id, 30, () => read(addresses.pools, 'get_source_pool_ids', [id])) as string[];
  const pools = await Promise.all(ids.slice(-5).map(poolId => cached('pool:' + addresses.pools + ':' + poolId, 20, async () => JSON.parse(String(await read(addresses.pools, 'get_pool', [poolId]))) as MusicPool)));
  const rawPrediction = participant ? await cached('prediction:' + addresses.markets + ':' + id + ':' + participant, 20, () => read(addresses.markets, 'get_prediction', [id, participant])) : null;
  const review=addresses.challenges?await cached('review:'+id+':'+(participant??''),20,async()=>{
    const raw=await read(addresses.challenges!,'get_listing',[id]);const listing=raw?JSON.parse(String(raw)):undefined;
    const challenges=listing?await Promise.all((listing.cases as string[]).map(async key=>JSON.parse(String(await read(addresses.challenges!,'get_challenge',[key]))))):[];
    const credit=participant?JSON.parse(String(await read(addresses.challenges!,'get_credit',[participant]))):undefined;
    return {listing,challenges,credit};
  }):{};
  const challengeKey=caseKey?proof.markets[caseKey].rulingTransaction??proof.transactions[caseKey+'-adjudicate']:undefined;
  if(challengeKey) transactions.push({label:'Identity ruling transaction',hash:challengeKey});
  return {contracts: addresses, previous, markets: [source], market: source, pools, ...review, reviewConfig, prediction: rawPrediction ? JSON.parse(String(rawPrediction)) : null, transactions, serverTime: Math.floor(Date.now() / 1000)};
}
export async function musicReceipt(hash: TransactionHash): Promise<Partial<MusicReceipt>> {
  const addresses = {...await contracts(),...Object.fromEntries(Object.entries(await contracts(true)).map(([key,value])=>['previous-'+key,value]))};
  return cached('receipt:' + hash, 8, async () => {
    const transaction = await client.getTransaction({hash});
    const raw = transaction as unknown as Record<string, unknown>;
    const contract = Object.values(addresses).find(address => typeof address==='string' && address.toLowerCase() === String(raw.recipient ?? raw.to_address).toLowerCase());
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
    if (state === 'finalized-success') for (const key of cache.keys()) if (['market:','pool','directory:','season:','review:','prediction:'].some(prefix=>key.startsWith(prefix))) cache.delete(key);
    return {hash, state, status, sender, recipient:contract, children};
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
export async function musicMaintenance(id: string, action: string, participant?: string, hash?: TransactionHash, previous = false) {
  if(action==='recover-deposit'||action==='verify-credit') {
    if(!participant||!hash)throw Error('Choose the actual wallet receipt.');
    const addresses=await contracts(),receipt=await musicReceipt(hash);
    if(!addresses.challenges||receipt.sender!==participant||receipt.recipient?.toLowerCase()!==addresses.challenges.toLowerCase()||receipt.state!==(action==='recover-deposit'?'finalized-error':'finalized-success'))return {state:'waiting'};
    if(action==='verify-credit'&&!receipt.children?.some(child=>['credited','failed'].includes(child.state)))return {state:'waiting'};
    const key=action+':'+hash;if(await pendingMaintenance(key))return {state:'pending'};
    const tx=await keeper.writeContract({address:addresses.challenges,functionName:action==='recover-deposit'?'recover_failed_deposit':'verify_claim',args:action==='recover-deposit'?[hash]:['challenge-credit',participant,hash],value:0n});
    writes.set(key,{hash:tx,at:Date.now()});for(const item of cache.keys())if(item.startsWith('credit:')||item.startsWith('review:'))cache.delete(item);
    return {state:'submitted',hash:tx};
  }
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
    const snapshot = await musicSnapshot(id, participant,previous);
    if (!snapshot.prediction || !['resolved', 'void'].includes(snapshot.market!.status)) return {state: 'waiting'};
    const profile = await musicSeason(participant);
    if (profile.profile?.results.some(result => result.category === 'music' && result.market_id === id)) return {state: 'complete'};
    const key = action + ':' + id + ':' + participant;
    const previousHash = await pendingMaintenance(key);
    if (previousHash) return {state: 'pending', hash: previousHash};
    const current=await contracts();
    const tx = await keeper.writeContract({address: current.seasons, functionName: snapshot.previous && current.challenges?'sync_previous_music':'sync_music', args: [id, participant], value: 0n});
    writes.set(key, {hash: tx, at: Date.now()});
    for (const key of cache.keys()) if (key.startsWith('season:')) cache.delete(key);
    return {state: 'submitted', hash: tx};
  }
  const snapshot = await musicSnapshot(id,participant,previous);
  const source = snapshot.market!;
  const pool = snapshot.pools[0];
  let address = snapshot.contracts.markets, method = '', args: Parameters<typeof keeper.writeContract>[0]['args'] = [];
  if(['judge-challenge','expire-challenge','open-reviewed','release-listing','verify-credit','recover-review','relay-review','recover-ruling'].includes(action)) {
    if(!snapshot.contracts.challenges||!snapshot.listing)return {state:'waiting'};
    const active=snapshot.challenges?.find(item=>item.id===snapshot.listing!.active_case);
    address=snapshot.contracts.challenges;
    if(action==='judge-challenge'||action==='expire-challenge') {
      if(!active||(action==='judge-challenge'?active.status!=='posted':!['posted','posted_pending_finality'].includes(active.status)))return {state:'waiting'};
      if(action==='judge-challenge'&&snapshot.serverTime>=active.deadline||action==='expire-challenge'&&snapshot.serverTime<active.deadline)return {state:'waiting'};
      method=action==='judge-challenge'?'adjudicate':'expire_challenge';args=[active.id];
    } else if(action==='open-reviewed') {
      if(source.status!=='compiled'||snapshot.listing.voided||snapshot.listing.active_case||snapshot.serverTime<(snapshot.listing.review_ends??Infinity)||snapshot.serverTime>=source.spec!.entry_deadline)return {state:'waiting'};
      address=snapshot.contracts.markets;method='open_market';args=[id,source.specification_hash];
    } else if(action==='release-listing') {
      if(snapshot.listing.finances_closed||snapshot.listing.active_case||!['open','closed','resolved','void'].includes(source.status)&&snapshot.serverTime<(source.spec?.entry_deadline??snapshot.listing.entry_deadline??Infinity))return {state:'waiting'};
      method='release_listing';args=[id];
    } else if(action==='verify-credit') {
      if(!participant||!hash||!snapshot.credit?.withdrawal||!['pending','paid_pending_finality','failed_pending_finality'].includes(snapshot.credit.withdrawal.status))return {state:'waiting'};
      const receipt=await musicReceipt(hash);if(receipt.sender!==participant||receipt.state!=='finalized-success'||!receipt.children?.some(child=>['credited','failed'].includes(child.state)))return {state:'waiting'};
      method='verify_claim';args=['challenge-credit',participant,hash];
    } else if(action==='recover-review') {
      if(!['review_pending_finality','void_pending_finality'].includes(source.status))return {state:'waiting'};
      address=snapshot.contracts.markets;method='recover_review';args=[id];
    } else if(action==='recover-ruling') {
      if(!active||active.status!=='ruling_pending_finality'||!hash)return {state:'waiting'};
      method='recover_ruling';args=[active.id,hash];
    } else {
      const last=snapshot.challenges?.findLast(item=>item.status==='finalized'&&['AMENDED','VOIDED'].includes(item.ruling?.verdict??''));if(!last)return {state:'waiting'};
      method='recover_market_review';args=[last.id];
    }
  } else if (action === 'resolve') {
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
      Promise.all([musicSnapshot(),musicSnapshot(undefined,undefined,true)]).then(([current,old])=>({markets:[...current.markets,...old.markets]})),
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
