'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {TransactionHash} from 'genlayer-js/types';
import {musicWalletClient} from './music-wallet';
import {useWallet} from './use-wallet';
import {musicFinal, type MusicReceipt, type MusicSnapshot, type MusicContracts} from './music';

export function useMusic(id?: string, previous = false) {
  const {account, balance} = useWallet();
  const [data, setData] = useState<MusicSnapshot | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [receipt, setReceipt] = useState<MusicReceipt | null>(null);
  const receiptRef = useRef<MusicReceipt | null>(null), maintenanceAt = useRef(0);
  const creditMaintenance=useRef(0);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const query = new URLSearchParams(); if(id) query.set('id',id); if(account) query.set('participant',account); if(previous) query.set('previous','1');
    const response = await fetch('/api/music?' + query, {cache: 'no-store', signal});
    const result = await response.json();
    if (!response.ok) throw Error(result.error);
    if (!signal?.aborted) {setData(result); setError('');}
  }, [id, account, previous]);
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
        const awaitingNative=pending?.action==='claim'&&pending.state==='finalized-success'&&(!pending.children?.length||pending.children.some(child=>child.state==='pending'));
        if (pending && (!musicFinal(pending) || awaitingNative)) {
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
    const timer = setInterval(tick, id || account ? 15_000 : 90_000);
    return () => {active = false; controller.abort(); clearInterval(timer);};
  }, [id, account, refresh, remember]);
  useEffect(()=>{
    if(!receipt||receipt.kind!=='challenges'||!account||Date.now()-creditMaintenance.current<90_000)return;
    const action=receipt.state==='finalized-error'&&['list_market','challenge'].includes(receipt.action)?'recover-deposit':receipt.state==='finalized-success'&&receipt.action==='claim'?'verify-credit':null;
    if(!action)return;creditMaintenance.current=Date.now();
    void fetch('/api/music',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:receipt.marketId??'review-credit',action,participant:account,hash:receipt.hash})}).catch(()=>{});
  },[receipt,account,data]);
  useEffect(() => {
    if (!id || !data?.market || busy || Date.now() - maintenanceAt.current < 90_000) return;
    const source = data.market, pool = data.pools[0], now = Math.floor(Date.now() / 1000);
    const pendingClaim = pool?.claim_attempts[account];
    const review = data.listing, reviewCase = data.challenges?.find(item=>item.id===review?.active_case);
    const recoveryKey='bullseye.music.review-maintenance.'+data.contracts.challenges+':'+id;
    let rulingHash=data.transactions?.find(item=>item.label==='Identity ruling transaction')?.hash;
    try {rulingHash=localStorage.getItem(recoveryKey)??rulingHash;}catch{}
    const relayCase=data.challenges?.findLast(item=>item.status==='finalized'&&(item.ruling?.verdict==='VOIDED'||item.ruling?.verdict==='AMENDED'&&source.specification_hash!==review?.approved_hash));
    const action = ['review_pending_finality','void_pending_finality'].includes(source.status)?'recover-review'
      : reviewCase?.status==='ruling_pending_finality'&&rulingHash?'recover-ruling'
      : source.status==='compiled'&&relayCase?'relay-review'
      : reviewCase&&['posted','posted_pending_finality'].includes(reviewCase.status)&&now>=reviewCase.deadline?'expire-challenge'
      : reviewCase?.status === 'posted' ? 'judge-challenge'
      : source.status === 'compiled' && review && !review.active_case && !review.voided && now >= (review.review_ends ?? Infinity) && now < source.spec!.entry_deadline ? 'open-reviewed'
      : review && !review.finances_closed && !review.active_case && (['open','closed','resolved','void'].includes(source.status) || now >= (source.spec?.entry_deadline??review.entry_deadline??Infinity)) ? 'release-listing'
      : data.credit?.withdrawal && ['pending','paid_pending_finality','failed_pending_finality'].includes(data.credit.withdrawal.status) && receipt?.kind === 'challenges' && receipt.action === 'claim' && receipt.state === 'finalized-success' ? 'verify-credit'
      : pendingClaim?.status === 'pending' && pendingClaim.claim_hash ? 'verify-claim'
      : pool?.status === 'open' && now >= pool.entry_deadline && (['resolved', 'void'].includes(source.status) || now >= pool.refund_deadline) ? 'settle'
      : source.spec && now >= Math.max(source.spec.entry_deadline, source.spec.observation_time) && ['open', 'closed', 'pending'].includes(source.status) ? 'resolve'
      : data.prediction && ['resolved', 'void'].includes(source.status) ? 'sync-season' : null;
    const claimHash = data.credit?.withdrawal?.claim_hash ?? pendingClaim?.claim_hash ?? (receipt?.action === 'claim' && receipt.state === 'finalized-success' ? receipt.hash : undefined);
    if (!action && !(pendingClaim?.status === 'pending' && claimHash)) return;
    maintenanceAt.current = Date.now();
    void fetch('/api/music', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, action: action ?? 'verify-claim', participant: account, hash:action==='recover-ruling'?rulingHash:claimHash, previous:data.previous, caseId:reviewCase?.id})}).then(async response=>{
      const result=await response.json();
      if(response.ok&&['judge-challenge','expire-challenge'].includes(action??'')&&/^0x[a-fA-F0-9]{64}$/.test(result.hash??''))try{localStorage.setItem(recoveryKey,result.hash);}catch{}
    }).catch(() => {});
  }, [id, data, busy, account, receipt]);
  async function submit(kind: keyof MusicContracts, action: string, args: Parameters<Awaited<ReturnType<typeof musicWalletClient>>['writeContract']>[0]['args'], value = 0n, marketId = id, poolId?: string) {
    if (busy || receiptRef.current && !musicFinal(receiptRef.current)) throw Error('Your previous transaction is still pending.');
    setBusy(true); setError('');
    try {
      const client = await musicWalletClient();
      const wallet = typeof client.account === 'string' ? client.account : client.account!.address;
      const contracts = data?.contracts ?? (await (await fetch('/api/music')).json()).contracts as MusicContracts;
      const address=contracts[kind]; if(!address) throw Error('This release does not support identity challenges.');
      const hash = await client.writeContract({address, functionName: action, args, value});
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
