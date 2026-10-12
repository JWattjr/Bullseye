'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {TransactionHash} from 'genlayer-js/types';
import {musicWalletClient} from './music-wallet';
import {useWallet} from './use-wallet';
import {musicFinal, type MusicReceipt, type MusicSnapshot, type MusicContracts} from './music';

export function useMusic(id?: string) {
  const {account, balance} = useWallet();
  const [data, setData] = useState<MusicSnapshot | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [receipt, setReceipt] = useState<MusicReceipt | null>(null);
  const receiptRef = useRef<MusicReceipt | null>(null), maintenanceAt = useRef(0);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/music' + (id ? '?id=' + encodeURIComponent(id) + (account ? '&participant=' + account : '') : ''), {cache: 'no-store', signal});
    const result = await response.json();
    if (!response.ok) throw Error(result.error);
    if (!signal?.aborted) {setData(result); setError('');}
  }, [id, account]);
  const remember = useCallback((next: MusicReceipt, wallet: string) => {
    receiptRef.current = next; setReceipt(next);
    try {localStorage.setItem('bullseye.music.receipt.' + wallet.toLowerCase(), JSON.stringify(next));} catch {}
  }, []);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      receiptRef.current = null; setReceipt(null);
      try {
        const stored = account && localStorage.getItem('bullseye.music.receipt.' + account);
        if (stored) {
          const record: MusicReceipt = JSON.parse(stored);
          if (/^0x[a-fA-F0-9]{64}$/.test(record.hash)) {receiptRef.current = record; setReceipt(record);}
        }
      } catch {}
    });
    return () => {active = false;};
  }, [account]);
  useEffect(() => {
    let active = true, ticking = false;
    const controller = new AbortController();
    const tick = async () => {
      if (!active || ticking || document.visibilityState === 'hidden') return;
      ticking = true;
      try {
        const pending = receiptRef.current;
        if (pending && (!musicFinal(pending) || pending.action === 'claim' && pending.children?.some(child => child.state === 'pending'))) {
          const response = await fetch('/api/music?receipt=' + pending.hash, {cache: 'no-store'});
          const result = await response.json();
          if (response.ok && active && result.sender === account && receiptRef.current?.hash === pending.hash) {
            const next = {...pending, ...result}; remember(next, account);
            if (next.state === 'finalized-success') window.dispatchEvent(new Event('bullseye:balance-changed'));
          }
        }
        await refresh(controller.signal);
      } catch (reason) {if (active) setError(reason instanceof Error ? reason.message : 'Could not refresh. Retry in a moment.');}
      finally {ticking = false;}
    };
    void tick();
    const timer = setInterval(tick, id ? 15_000 : 90_000);
    return () => {active = false; controller.abort(); clearInterval(timer);};
  }, [id, account, refresh, remember]);
  useEffect(() => {
    if (!id || !data?.market || busy || Date.now() - maintenanceAt.current < 90_000) return;
    const source = data.market, pool = data.pools[0], now = Math.floor(Date.now() / 1000);
    const pendingClaim = pool?.claim_attempts[account];
    const action = pendingClaim?.status === 'pending' && pendingClaim.claim_hash ? 'verify-claim'
      : pool?.status === 'open' && now >= pool.entry_deadline && (['resolved', 'void'].includes(source.status) || now >= pool.refund_deadline) ? 'settle'
      : source.spec && now >= Math.max(source.spec.entry_deadline, source.spec.observation_time) && ['open', 'closed', 'pending'].includes(source.status) ? 'resolve'
      : data.prediction && ['resolved', 'void'].includes(source.status) ? 'sync-season' : null;
    const claimHash = pendingClaim?.claim_hash ?? (receipt?.action === 'claim' && receipt.state === 'finalized-success' ? receipt.hash : undefined);
    if (!action && !(pendingClaim?.status === 'pending' && claimHash)) return;
    maintenanceAt.current = Date.now();
    void fetch('/api/music', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, action: action ?? 'verify-claim', participant: account, hash: claimHash})}).catch(() => {});
  }, [id, data, busy, account, receipt]);
  async function submit(kind: keyof MusicContracts, action: string, args: Parameters<Awaited<ReturnType<typeof musicWalletClient>>['writeContract']>[0]['args'], value = 0n, marketId = id, poolId?: string) {
    if (busy || receiptRef.current && !musicFinal(receiptRef.current)) throw Error('Your previous transaction is still pending.');
    setBusy(true); setError('');
    try {
      const client = await musicWalletClient();
      const wallet = typeof client.account === 'string' ? client.account : client.account!.address;
      const contracts = data?.contracts ?? (await (await fetch('/api/music')).json()).contracts as MusicContracts;
      const hash = await client.writeContract({address: contracts[kind], functionName: action, args, value});
      const next: MusicReceipt = {hash: hash as TransactionHash, action, kind, marketId, poolId, sender: wallet.toLowerCase(), state: 'submitted'};
      remember(next, wallet);
      return next;
    } catch (reason) {
      const failure = reason as {code?: number; message?: string};
      const message = failure.code === 4001 ? 'Wallet confirmation cancelled. Your entry was not submitted.' : failure.message ?? 'Could not submit. Check your wallet and try again.';
      setError(message); throw Error(message);
    } finally {setBusy(false);}
  }
  const visibleData = id ? data?.market?.id === id ? data : null : data?.market ? null : data;
  return {data: visibleData, account, balance, error, busy, receipt, refresh, submit, pending: !!receipt && !musicFinal(receipt)};
}
