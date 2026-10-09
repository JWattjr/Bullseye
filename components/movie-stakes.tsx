'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {ArrowRight, Check, Clock, Wallet, ChevronDown} from 'lucide-react';
import {rangeLabel, type Round} from '@/lib/domain';
import {claimable, gen, parseStake} from '@/lib/pools';
import {displayGen, marketDate, poolShare, projectedReturn, positionState, receiptComplete, receiptCopy, receiptFailed, type MovieId} from '@/lib/film-market';
import {useFilmMarket, type FilmConnect} from '@/lib/use-film-market';

type Market = ReturnType<typeof useFilmMarket>;
export function TransactionStatus({market}: {market: Market}) {
  const receipt = market.receipt;
  if (!receipt) return null;
  return <div className={'transaction-status ' + (receiptFailed(receipt) ? 'transaction-failed' : receiptComplete(receipt) ? 'transaction-complete' : '')} role="status" aria-live="polite">
    {receiptComplete(receipt) && !receiptFailed(receipt) ? <Check size={18}/> : <Clock size={18}/>}
    <div><strong>{receiptCopy(receipt)}</strong><p>{receipt.recovery === 'failed' ? 'The first transfer failed. Retry collection below with one wallet confirmation.' : receiptFailed(receipt) ? receipt.payoutVersion === 2 ? 'We’re verifying that no GEN arrived before opening a safe retry.' : 'Your transfer or prediction needs review. The network record is available in transaction details.' : receiptComplete(receipt) ? receipt.action === 'claim' ? 'Your balance updates automatically.' : 'We’ll update your result here and in My predictions.' : 'You can leave this page. Track it in My predictions.'}</p></div>
  </div>;
}

export function MoviePositions({round, market}: {round: Round; market: Market}) {
  const {data, account, now, busy, pending, submit, receipt, credits} = market;
  const owned = data?.pools.filter(pool => pool.entries[account]) ?? [];
  if (!owned.length) return null;
  return <section className="movie-positions" aria-label={round.title + ' predictions'}><div className="section-heading"><h2>Your {round.title} predictions</h2><span>{owned.length} {owned.length === 1 ? 'entry' : 'entries'}</span></div>
    {owned.map(pool => {
      const entry = pool.entries[account], payout = claimable(pool, account), paid = credits[pool.id] ?? (receipt?.poolId === pool.id ? receipt : null), credited = !!(paid && paid.action === 'claim' && receiptComplete(paid) && !receiptFailed(paid));
      const status = credited ? 'Collected' : positionState(pool, account, now), retry = pool.claim_attempts?.[account]?.status === 'failed';
      return <div className="position-row" id={pool.id} key={pool.id}>
        <div><span className={'position-state ' + (status === 'Won' || status === 'Collected' ? 'position-positive' : '')}>{status === 'Open' && now ? pool.mode === 'competitive' ? 'Closes ' + marketDate(pool.entry_deadline) : 'Closes in ' + Math.max(0, pool.entry_deadline - now) + 's' : status}</span><h3>{rangeLabel((data!.source.spec.ranges)[entry.range])}</h3><p>{displayGen(entry.stake)} GEN staked · {marketDate(pool.created_at ?? pool.entry_deadline - 120)}</p></div>
        <div className="position-return">{BigInt(payout) > 0n ? <button className="button primary" disabled={busy || pending} onClick={() => submit('claim', undefined, undefined, pool)}>{busy ? 'Confirm in wallet…' : (retry ? 'Retry collection · ' : 'Collect ') + displayGen(payout) + ' GEN'}<ArrowRight size={16}/></button> : <><strong>{displayGen(pool.claims[account] ?? pool.claim_attempts?.[account]?.amount ?? '0')} GEN</strong><span>{credited || status === 'Collected' ? 'Received' : pool.claims[account] || pool.claim_attempts?.[account] ? 'Transfer requested' : status === 'Lost' ? 'Return' : 'Result pending'}</span></>}</div>
      </div>;
    })}
  </section>;
}

export default function MovieStakes({round, connect}: {round: Round; connect: FilmConnect}) {
  const market = useFilmMarket(round.id as MovieId, connect), {data, error, syncError, busy, receipt, now, account, balance, pending, submit, refresh} = market;
  const [choice, setChoice] = useState<number | null>(null), [amount, setAmount] = useState('2');
  const jumped = useRef(false);
  const showTicket = () => {if (window.matchMedia('(max-width: 760px)').matches) document.getElementById('ticket-' + round.id)?.scrollIntoView({block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});};
  useEffect(() => {
    const initial = new URL(window.location.href).searchParams.get('range');
    if (initial !== null && /^\d$/.test(initial) && Number(initial) < round.spec.ranges.length) Promise.resolve().then(() => setChoice(Number(initial)));
  }, [round.id, round.spec.ranges.length]);
  useEffect(() => {
    if (data?.ready && choice !== null && !jumped.current && window.location.hash === '#prediction') {jumped.current = true; document.getElementById(window.matchMedia('(max-width: 760px)').matches ? 'ticket-' + round.id : 'prediction')?.scrollIntoView({block: 'start'});}
  }, [data?.ready, choice, round.id]);
  const future = round.spec.mode === 'competitive', sourceSpec = data?.source.spec ?? round.spec;
  const latest = data?.pools[0], open = future ? data?.source.status === 'open' && now < sourceSpec.entry_deadline : latest?.status === 'open' && now < latest.entry_deadline, current = future ? latest : open ? latest : undefined;
  const closed = future && now > 0 && !open;
  const entered = !!((future || open) && latest?.entries[account]), ranges = sourceSpec.ranges;
  let amountError = '', stake = 0n;
  try {stake = parseStake(amount);} catch (e) {amountError = (e as Error).message;}
  const insufficient = balance !== null && stake > BigInt(balance);
  const minutes = !future && open ? Math.floor((latest!.entry_deadline - now) / 60) + ':' + String((latest!.entry_deadline - now) % 60).padStart(2, '0') : null;
  return <section className="consumer-market" id="prediction" aria-label={round.title + ' GEN staking'}>
    <div className="market-stats"><div><span>{future ? 'Market pool' : 'Session pool'}</span><strong>{data ? displayGen(current?.total ?? '0') : '—'} <small>GEN</small></strong></div><div><span>Predictions</span><strong>{data ? current?.participants.length ?? 0 : '—'}</strong></div><div><span>{future ? 'Entries close · UTC' : open ? 'Entries close in' : 'Session length'}</span><strong>{future ? marketDate(sourceSpec.entry_deadline) : minutes ?? '2 minutes'}</strong></div></div>
    <div className="market-trade-layout"><div className="outcome-list"><div className="section-heading"><h2>Choose your range</h2><span>GEN pooled</span></div>
      <div className="market-options">{ranges.map((range, index) => <button key={index} className={choice === index ? 'outcome-selected' : ''} disabled={busy || pending || !data?.ready || entered || closed} aria-pressed={choice === index} onClick={() => {setChoice(index); showTicket();}}>
        <span className="outcome-fill" style={{width: poolShare(current, index) + '%'}} aria-hidden="true"/>
        <span className="outcome-name"><span className="selection-circle" aria-hidden="true">{choice === index && <Check size={13}/>}</span><strong>{rangeLabel(range)}</strong></span>
        <span className="outcome-amount"><strong>{data ? displayGen(current?.pools[index] ?? '0') : '—'}</strong><small>{poolShare(current, index)}% of pool</small></span>
      </button>)}</div><p className="market-caption">Winners share the whole pool. Your return depends on how much you stake.</p>
      <details className="market-rules"><summary>Market rules & result <ChevronDown size={16}/></summary>{future ? <p>Predict the United States and Canada opening-weekend revenue in exact USD for {sourceSpec.event.split(', ').at(-1)}. Entries close {marketDate(sourceSpec.entry_deadline)} at 00:00 UTC, before previews. Stakes stay in the pool until the result is verified. GenLayer begins checking The Numbers on {marketDate(sourceSpec.observation_time)} at 12:00 UTC and retries until {marketDate(sourceSpec.resolution_deadline)} at 00:00 UTC. If the frozen weekend result is unavailable by then, entries are refunded. {data?.source.evidence && <>Published result: <strong>${new Intl.NumberFormat('en-US').format(data.source.evidence.normalized_value)}</strong>.</>}</p> : <p>This is a two-minute practice session for a past opening weekend. The published result is <strong>${new Intl.NumberFormat('en-US').format(data?.source.evidence?.normalized_value ?? round.evidence!.normalized_value)}</strong>.</p>}<p>Every range is a separate pool; winners share all GEN proportionally. If nobody picks the winning range, all entries are refunded. One 2–100 GEN entry per wallet, per {future ? 'market' : 'session'}. The first verified result is final; later source corrections are ignored.</p><p>Results come from the finalized GenLayer record. Stakes use simulated StudioNet GEN.</p><a href={round.spec.source_url} target="_blank" rel="noreferrer">View box-office source</a></details>
    </div><div className="prediction-ticket" id={'ticket-' + round.id}>
      <h2>{entered ? 'Prediction placed' : 'Your prediction'}</h2>
      {entered ? <><div className="ticket-confirmation"><Check size={20}/><strong>{rangeLabel(ranges[latest!.entries[account].range])}</strong></div><div className="ticket-line"><span>Your stake</span><strong>{displayGen(latest!.entries[account].stake)} GEN</strong></div><p className="ticket-help">{future ? 'Your result appears after the opening weekend is verified.' : 'Your result appears here automatically after entries close.'}</p><Link className="button secondary full" href="/predictions">My predictions <ArrowRight size={16}/></Link></> : <>
        <p className={'ticket-selection ' + (choice !== null ? 'has-selection' : '')}>{choice === null ? 'Pick a range to get started.' : rangeLabel(ranges[choice])}</p>
        <label className="stake-label" htmlFor={'stake-' + round.id}>Your stake</label><div className="stake-field"><input id={'stake-' + round.id} type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy || pending} aria-label="GEN stake" aria-invalid={!!amountError || insufficient} aria-describedby={'stake-help-' + round.id}/><span>GEN</span></div>
        <div className="stake-presets">{['2', '5', '10', '25'].map(value => <button key={value} aria-label={'Set stake to ' + value + ' GEN'} aria-pressed={amount === value} onClick={() => setAmount(value)} disabled={busy || pending}>{value}</button>)}</div>
        <p id={'stake-help-' + round.id} className={'ticket-help ' + (amountError || insufficient ? 'field-error' : '')}>{amountError || (insufficient ? 'Not enough GEN in your wallet.' : 'Minimum 2 GEN · Maximum 100 GEN')}</p>
        <div className="ticket-line"><span>Wallet balance</span><strong>{account ? balance === null ? 'Loading…' : displayGen(balance) + ' GEN' : 'Connect to view'}</strong></div>
        <div className="ticket-estimate"><span>Estimated return if you win</span><strong>{choice !== null && stake > 0n ? displayGen(projectedReturn(current, choice, stake)) + ' GEN' : '—'}</strong><small>Based on the current pool. Changes as others enter.</small></div>
        <button className="button primary full predict-button" disabled={busy || pending || !data?.ready || choice === null || !!amountError || insufficient || closed} onClick={() => submit('stake', choice!, amount)}>{busy ? 'Confirm in wallet…' : pending ? 'Confirming prediction…' : closed ? 'Entries closed' : choice === null ? 'Choose a range' : account ? 'Predict with ' + amount + ' GEN' : 'Connect & predict'}{!busy && !pending && <ArrowRight size={18}/>}</button>
        <p className="ticket-help">{future ? 'Stake held until the opening-weekend result. One entry per wallet.' : open ? 'Join this session before the countdown ends.' : 'Your prediction starts a new two-minute session.'}</p>
      </>}
      {error && <div className="trade-error" role="alert">{error}</div>}
      <TransactionStatus market={market}/>
      {!data && !syncError && <p className="ticket-help" role="status">Loading market…</p>}
      {syncError && <p className="sync-notice" role="status">{syncError}</p>}
      {data && !data.ready && <p className="sync-notice" role="status">This market is being verified. We’ll update it automatically.</p>}
    </div></div>
    <MoviePositions round={round} market={market}/>
    {data?.olderBefore !== null && data?.olderBefore !== undefined && <button className="text-action older-predictions" disabled={busy || pending} onClick={() => refresh(data.olderBefore!).catch(() => {})}>Find earlier predictions <ArrowRight size={15}/></button>}
    {receipt && <details className="transaction-details"><summary>Transaction details <ChevronDown size={15}/></summary><p>{receipt.action === 'stake' ? 'Prediction' : 'Collection'}: {receipt.state}</p><code>{receipt.hash}</code>{receipt.transfers?.map(transfer => <p key={transfer.hash}>{transfer.state}: {gen(transfer.value)} GEN to <code>{transfer.recipient}</code></p>)}<a href={future ? '/upcoming-pool-proof.json' : '/film-pool-proof.json'} target="_blank" rel="noreferrer">View verified contract records</a></details>}
    <p className="market-bottom-note"><Wallet size={14}/> StudioNet · Simulated GEN · {future ? 'Upcoming release' : 'Historical practice'}</p>
  </section>;
}
