'use client';
import {useCallback,useEffect,useState} from 'react';
import type {GenLayerClient} from 'genlayer-js/types';
import {studionet} from 'genlayer-js/chains';
import {rangeLabel,type Round,type Specification} from '@/lib/domain';
import {claimable,gen,parseStake,type Pool} from '@/lib/pools';
type FilmPool=Pool&{source_round_id:string;reference_winner:number;reference_value:number};
type Snapshot={contract:`0x${string}`;sourceRoundId:string;source:{status:string;spec:Specification;winner:number;evidence:{normalized_value:number}|null};pools:FilmPool[];olderBefore:number|null;ready:boolean};
type Receipt={hash:string;action:string;state:string;transfers?:{hash:string;state:string;recipient:string}[]};
export default function MovieStakes({round,connect}:{round:Round;connect:()=>Promise<GenLayerClient<typeof studionet>>}){
  const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[account,setAccount]=useState(''),[choice,setChoice]=useState<number|null>(null),[amount,setAmount]=useState('2'),[now,setNow]=useState(0),[receipt,setReceipt]=useState<Receipt|null>(null);
  const key='bullseye.film.receipt.'+round.id;
  const refresh=useCallback(async(before?:number)=>{
    const response=await fetch('/api/film-pools?movie='+round.id+(before===undefined?'':'&before='+before),{cache:'no-store'}),result=await response.json();
    if(!response.ok)throw Error(result.error);
    setData(previous=>before===undefined?result:{...result,pools:[...(previous?.pools??[]),...result.pools]});setNow(Math.floor(Date.now()/1000));
  },[round.id]);
  useEffect(()=>{
    let active=true;
    Promise.resolve().then(async()=>{try{const saved=localStorage.getItem(key);if(saved&&active)setReceipt(JSON.parse(saved));await refresh();}catch(e){if(active)setError((e as Error).message);}});
    const provider=(window as unknown as {ethereum?:{request:(args:{method:string})=>Promise<string[]>;on?:(event:string,fn:(accounts:string[])=>void)=>void;removeListener?:(event:string,fn:(accounts:string[])=>void)=>void}}).ethereum;
    const changed=(accounts:string[])=>{if(active)setAccount(accounts[0]?.toLowerCase()??'');};
    provider?.request({method:'eth_accounts'}).then(changed).catch(()=>{});provider?.on?.('accountsChanged',changed);
    const connected=(event:Event)=>{if(active)setAccount(String((event as CustomEvent).detail).toLowerCase());};window.addEventListener('bullseye:wallet-connected',connected);
    const timer=setInterval(()=>setNow(Math.floor(Date.now()/1000)),1000);
    return()=>{active=false;clearInterval(timer);provider?.removeListener?.('accountsChanged',changed);window.removeEventListener('bullseye:wallet-connected',connected);};
  },[key,refresh]);
  async function check(){if(!receipt)return;setBusy(true);setError('');try{const response=await fetch('/api/film-pools?movie='+round.id+'&receipt='+receipt.hash,{cache:'no-store'}),result=await response.json();if(!response.ok)throw Error(result.error);const next={...receipt,...result};setReceipt(next);localStorage.setItem(key,JSON.stringify(next));await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function submit(action:'stake'|'settle'|'claim',pool?:FilmPool){if(!data)return;setBusy(true);setError('');try{
    if(action==='stake'&&choice===null)throw Error('Choose a range before staking.');
    const value=action==='stake'?parseStake(amount):0n,client=await connect();
    const hash=await client.writeContract({address:data.contract,functionName:action,args:action==='stake'?[data.sourceRoundId,choice!]:[pool!.id],value});
    const next={hash,action,state:'submitted'};setReceipt(next);localStorage.setItem(key,JSON.stringify(next));
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const latest=data?.pools[0],open=latest?.status==='open'&&now<latest.entry_deadline;
  const entered=!!(open&&latest?.entries[account]);
  const ranges=data?.source.spec.ranges??round.spec.ranges;
  return <section className="movie-stakes" aria-label={round.title+' GEN staking'}>
    <div className="section-heading"><h2>Stake GEN on {round.title}</h2><span className="tag historical">StudioNet GEN</span></div>
    <p>Minimum 2 GEN. Each range is a pool. Winners share all stakes in proportion to their entry.</p>
    <p className="small">Historical result: ${new Intl.NumberFormat('en-US').format(data?.source.evidence?.normalized_value??round.evidence!.normalized_value)}. The outcome is already known. StudioNet GEN is simulated development currency.</p>
    {error&&<div className="error" role="alert">{error}</div>}
    {!data&&!error&&<p role="status">Loading this movie’s GEN pools…</p>}
    <div className="pool-options movie-options">{ranges.map((range,index)=><button key={index} disabled={busy||!data?.ready||entered} aria-pressed={choice===index} onClick={()=>setChoice(index)}><strong>{rangeLabel(range)}</strong><span>{gen(open?latest!.pools[index]:'0')} GEN pooled</span></button>)}</div>
    {entered?<p className="confirmed">Your GEN stake is in this pool. Entries close in {Math.max(0,latest!.entry_deadline-now)} seconds.</p>:<div className="pool-entry"><label>GEN stake<input type="text" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} aria-describedby={'stake-help-'+round.id}/></label><button className="button primary" disabled={busy||!data?.ready||choice===null} onClick={()=>submit('stake')}>{busy?'Waiting for wallet…':'Stake GEN on '+round.title}</button></div>}
    <p id={'stake-help-'+round.id} className="small">2–100 GEN per entry. {open?'This pool closes in '+Math.max(0,latest!.entry_deadline-now)+' seconds.':'Your first stake starts a shared two-minute pool for this movie.'} One entry per wallet per pool.</p>
    <button className="text-action" disabled={busy} onClick={()=>{setError('');refresh().catch(e=>setError(e.message));}}>Refresh GEN pools</button>
    {data&&!data.ready&&<p className="notice">This movie’s validator result or GEN payout verification is pending. Refresh to check again.</p>}
    {receipt&&<div className="notice" role="status"><strong>{receipt.action}: {receipt.state}</strong><p>Submitted transactions await successful finalization. After a claim, the separate transfer must be credited.</p><code>{receipt.hash}</code>{receipt.transfers?.map(transfer=><p key={transfer.hash}>Follow-up: {transfer.state} to <code>{transfer.recipient}</code>.</p>)}<button className="button secondary" disabled={busy} onClick={check}>Check GEN receipt & pools</button></div>}
    {data?.pools.map(pool=>{const entry=pool.entries[account],payout=claimable(pool,account);return <div className="film-pool-history" key={pool.id}><div className="section-heading"><h3>{pool.id}</h3><span>{pool.status.replaceAll('_',' ')}</span></div><p>Total staked: {gen(pool.total)} GEN.</p>{entry&&<p>Your stake: {gen(entry.stake)} GEN on {rangeLabel(ranges[entry.range])}. {pool.claims[account]?'Transfer requested: '+gen(pool.claims[account])+' GEN.':''}</p>}
      {pool.status==='open'&&now>=pool.entry_deadline&&<button className="button secondary" disabled={busy} onClick={()=>submit('settle',pool)}>Settle {round.title} pool</button>}
      {BigInt(payout)>0n&&<button className="button primary" disabled={busy} onClick={()=>submit('claim',pool)}>Claim {gen(payout)} GEN</button>}
      {pool.status==='resolved'&&entry&&payout==='0'&&!pool.claims[account]&&<p>Your range did not win. No GEN payout is due.</p>}
      {pool.status==='resolved'&&<p>Winning range: {rangeLabel(ranges[pool.winner!])}.</p>}
    </div>;})}
    {data?.olderBefore!==null&&data?.olderBefore!==undefined&&<button className="button secondary" disabled={busy} onClick={()=>refresh(data.olderBefore!).catch(e=>setError(e.message))}>Load older movie pools</button>}
    <details className="disclosure"><summary>GEN settlement rules</summary><p>The first stake starts a shared two-minute pool. After entries close, anyone may settle from the finalized Bullseye validator result. Claims open after the pool’s finality callback. The winning range receives the entire pot, with no pool fee; an empty winning range refunds all entrants. Later pools preserve earlier claims. Points and GEN stakes are separate records.</p><p>Claim receipts record a transfer request. Check the credited follow-up receipt and your wallet balance to confirm arrival.</p><a href="/film-pool-proof.json" target="_blank" rel="noreferrer">Inspect validator and GEN proof</a></details>
  </section>;
}
