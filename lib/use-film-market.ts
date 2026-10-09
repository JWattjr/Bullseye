'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {GenLayerClient} from 'genlayer-js/types';
import {studionet} from 'genlayer-js/chains';
import {claimable, parseStake} from './pools';
import {receiptComplete, receiptFailed, type FilmPool, type FilmReceipt, type FilmSnapshot, type MovieId} from './film-market';
import {useWallet} from './use-wallet';
import {upcomingFilms} from './upcoming';

export type FilmConnect = () => Promise<GenLayerClient<typeof studionet>>;
export function useFilmMarket(movie: MovieId, connect: FilmConnect) {
  const {account, balance} = useWallet();
  const [data, setData] = useState<FilmSnapshot | null>(null), [error, setError] = useState(''), [syncError, setSyncError] = useState('');
  const [busy, setBusy] = useState(false), [receipt, setReceipt] = useState<FilmReceipt | null>(null), [now, setNow] = useState(0), [credits, setCredits] = useState<Record<string, FilmReceipt>>({});
  const receiptRef = useRef<FilmReceipt | null>(null), loaded = useRef(false), lastSettlement = useRef(new Map<string, number>()), refreshedAt = useRef(0);
  const key = 'bullseye.film.receipt.' + movie + '.' + account;
  const saveReceipt = useCallback((next: FilmReceipt) => {
    receiptRef.current = next; setReceipt(next);
    try {localStorage.setItem(key, JSON.stringify(next));} catch {}
    if (next.action === 'claim' && next.poolId && receiptComplete(next) && !receiptFailed(next)) setCredits(previous => {
      const updated = {...previous, [next.poolId!]: next};
      try {localStorage.setItem(key.replace('.receipt.', '.credits.'), JSON.stringify(updated));} catch {}
      return updated;
    });
  }, [key]);
  const refresh = useCallback(async (before?: number) => {
    const response = await fetch('/api/film-pools?movie=' + movie + (before === undefined ? '' : '&before=' + before), {cache: 'no-store'}), result = await response.json();
    if (!response.ok) throw Error(result.error);
    setData(previous => before === undefined ? {...result, pools: [...result.pools, ...(previous?.pools.filter(pool => !result.pools.some((p: FilmPool) => p.id === pool.id)) ?? [])], olderBefore: previous && previous.olderBefore !== null && previous.olderBefore < (result.olderBefore ?? Infinity) ? previous.olderBefore : result.olderBefore} : {...result, pools: [...(previous?.pools ?? []), ...result.pools.filter((pool: FilmPool) => !previous?.pools.some(p => p.id === pool.id))]});
    refreshedAt.current = Date.now(); setNow(Math.floor(Date.now() / 1000)); setSyncError('');
  }, [movie]);

  useEffect(() => {
    let active = true; loaded.current = false; receiptRef.current = null;
    Promise.resolve().then(async () => {
      if (!active) return;
      setReceipt(null); setCredits({}); setError('');
      try {
        const saved = account && localStorage.getItem(key);
        if (saved) {const r = JSON.parse(saved); if (/^0x[a-fA-F0-9]{64}$/.test(r.hash)) {receiptRef.current = r; setReceipt(r);}}
        const paid = account && localStorage.getItem(key.replace('.receipt.', '.credits.')); if (paid) setCredits(JSON.parse(paid));
        if (!saved && account) {
          const legacy = localStorage.getItem('bullseye.film.receipt.' + movie);
          if (legacy) {
            const old = JSON.parse(legacy);
            if (/^0x[a-fA-F0-9]{64}$/.test(old.hash) && ['stake', 'claim'].includes(old.action)) {
              const response = await fetch('/api/film-pools?movie=' + movie + '&receipt=' + old.hash, {cache: 'no-store'}), result = await response.json();
              if (active && response.ok && result.sender === account) saveReceipt({...old, ...result});
            }
          }
        }
      } catch {}
      loaded.current = true;
    });
    return () => {active = false;};
  }, [key, account, movie, saveReceipt]);

  useEffect(() => {
    let active = true, ticking = false;
    const tick = async () => {
      if (ticking || document.visibilityState === 'hidden') return;
      ticking = true;
      try {
        let receiptUpdated = false;
        const pending = receiptRef.current;
        if (loaded.current && pending && !receiptComplete(pending)) {
          const response = await fetch('/api/film-pools?movie=' + movie + '&receipt=' + pending.hash, {cache: 'no-store'}), result = await response.json();
          if (response.ok && active && receiptRef.current?.hash === pending.hash && (!result.sender || result.sender === account)) {
            const next: FilmReceipt = {...pending, ...result}; saveReceipt(next); receiptUpdated = receiptComplete(next);
            if (next.action === 'claim' && next.payoutVersion === 2 && next.state === 'finalized' && next.poolId && next.sender && next.transfers?.some(transfer => ['credited', 'failed'].includes(transfer.state)) && !['paid', 'failed'].includes(next.recovery ?? '')) {
              await fetch('/api/film-pools', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'verify_claim', movie, poolId: next.poolId, participant: next.sender, hash: next.hash})});
            }
            if (next.action === 'claim' && next.state === 'finalized' && next.poolId) {
              const poolResponse = await fetch('/api/film-pools?movie=' + movie + '&poolId=' + next.poolId, {cache: 'no-store'});
              if (poolResponse.ok && active) {const pool: FilmPool = await poolResponse.json(); setData(previous => previous ? {...previous, pools: previous.pools.map(p => p.id === pool.id ? pool : p)} : previous);}
            }
            if (receiptComplete(next) && !receiptFailed(next)) window.dispatchEvent(new Event('bullseye:balance-changed'));
          }
        }
        if (active && (!refreshedAt.current || Date.now() - refreshedAt.current >= (upcomingFilms.some(film => film.id === movie) ? 30_000 : 11_000) || receiptUpdated)) await refresh();
      } catch (e) {if (active) setSyncError((e as Error).message);} finally {ticking = false;}
    };
    void tick(); const timer = setInterval(tick, 12_000);
    const visible = () => {if (document.visibilityState === 'visible') void tick();};
    document.addEventListener('visibilitychange', visible);
    const clock = setInterval(() => {if (active) setNow(Math.floor(Date.now() / 1000));}, 1000);
    return () => {active = false; clearInterval(timer); clearInterval(clock); document.removeEventListener('visibilitychange', visible);};
  }, [movie, account, saveReceipt, refresh]);

  useEffect(() => {
    if (!data || !now) return;
    for (const pool of data.pools) {
      if (pool.status !== 'open' || now < pool.entry_deadline || (data.source.spec.mode === 'competitive' && now < data.source.spec.observation_time) || now - (lastSettlement.current.get(pool.id) ?? 0) < 30) continue;
      lastSettlement.current.set(pool.id, now);
      void fetch('/api/film-pools', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({movie, poolId: pool.id})}).then(response => {if (!response.ok) throw Error('The result is taking longer than usual. We’ll retry automatically.'); return refresh();}).catch(e => setSyncError(e.message));
    }
  }, [data, movie, now, refresh]);

  async function submit(action: 'stake' | 'claim', choice?: number, amount?: string, pool?: FilmPool) {
    if (!data || busy || (receipt && !receiptComplete(receipt))) return;
    setBusy(true); setError('');
    try {
      const value = action === 'stake' ? parseStake(amount ?? '') : 0n;
      if (action === 'stake' && data.source.spec.mode === 'competitive' && (Math.floor(Date.now() / 1000) >= data.source.spec.entry_deadline || data.source.status !== 'open')) throw Error('Predictions for this movie have closed.');
      if (action === 'stake' && (choice === undefined || choice < 0 || choice >= data.source.spec.ranges.length)) throw Error('Choose an opening-weekend range.');
      if (action === 'stake' && balance !== null && BigInt(balance) < value) throw Error('Your wallet needs more GEN for this stake. Add StudioNet GEN, then try again.');
      const client = await connect(), sender = typeof client.account === 'string' ? client.account : client.account?.address;
      const args = action === 'stake' ? [data.sourceRoundId, choice!] : pool?.payout_version === 2 ? [pool.id, (pool.claim_attempts?.[sender!.toLowerCase()]?.attempt ?? 0) + 1] : [pool!.id];
      const hash = await client.writeContract({address: action === 'claim' ? pool?.contract ?? data.contract : data.contract, functionName: action, args, value});
      const next: FilmReceipt = {hash, action, state: 'submitted', sender: sender?.toLowerCase(), poolId: pool?.id, payoutVersion: pool?.payout_version, amount: action === 'claim' && pool && sender ? claimable(pool, sender.toLowerCase()) : String(value)};
      receiptRef.current = next; setReceipt(next);
      try {localStorage.setItem('bullseye.film.receipt.' + movie + '.' + next.sender, JSON.stringify(next));} catch {}
    } catch (e) {
      const reason = e as {code?: number; message?: string};
      setError(reason.code === 4001 || /reject|declin/i.test(reason.message ?? '') ? 'Wallet request cancelled. You can try again when you’re ready.' : reason.message ?? 'Could not submit. Please try again.');
    } finally {setBusy(false);}
  }
  return {data, error, syncError, busy, receipt, credits, now, account, balance, refresh, submit, pending: !!(receipt && !receiptComplete(receipt))};
}
