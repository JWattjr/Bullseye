'use client';
import Link from 'next/link';
import {useCallback, useEffect, useState} from 'react';
import {ArrowRight, Wallet} from 'lucide-react';
import {type Round} from '@/lib/domain';
import {claimable} from '@/lib/pools';
import {displayGen, isMovie} from '@/lib/film-market';
import {useFilmMarket, type FilmConnect} from '@/lib/use-film-market';
import {useWallet} from '@/lib/use-wallet';
import {MoviePositions, TransactionStatus} from './movie-stakes';

type Summary = {account: string; entries: number; staked: string; available: string; loaded: boolean};
function PortfolioMovie({round, connect, report}: {round: Round; connect: FilmConnect; report: (id: string, summary: Summary) => void}) {
  const market = useFilmMarket(round.id as 'barbie-practice' | 'oppenheimer-practice' | 'dune-two-practice', connect);
  const {data, account, refresh, busy, pending} = market;
  const entries = data?.pools.filter(pool => pool.entries[account]) ?? [];
  useEffect(() => {
    const own = data?.pools.filter(pool => pool.entries[account]) ?? [];
    report(round.id, {account, entries: own.length, staked: String(own.reduce((total, pool) => total + (!['resolved', 'void'].includes(pool.status) ? BigInt(pool.entries[account].stake) : 0n), 0n)), available: String(own.reduce((total, pool) => total + BigInt(claimable(pool, account)), 0n)), loaded: !!data});
  }, [data, account, report, round.id]);
  return <div className="portfolio-movie">
    {market.receipt && <TransactionStatus market={market}/>}
    <MoviePositions round={round} market={market}/>
    {entries.length > 0 && <Link className="text-action" href={'/rounds/' + round.id}>Open {round.title} market <ArrowRight size={15}/></Link>}
    {market.error && <p className="trade-error" role="alert">{market.error}</p>}
    {market.syncError && <p className="sync-notice" role="status">{round.title}: {market.syncError}</p>}
    {data?.olderBefore !== null && data?.olderBefore !== undefined && <button className="text-action older-predictions" disabled={busy || pending} onClick={() => refresh(data.olderBefore!).catch(() => {})}>Find earlier {round.title} predictions <ArrowRight size={15}/></button>}
  </div>;
}

export default function MoviePortfolio({rounds, connect}: {rounds: Round[]; connect: FilmConnect}) {
  const {account} = useWallet(), [summaries, setSummaries] = useState<Record<string, Summary>>({}), [connecting, setConnecting] = useState(false), [error, setError] = useState('');
  const report = useCallback((id: string, summary: Summary) => setSummaries(previous => JSON.stringify(previous[id]) === JSON.stringify(summary) ? previous : {...previous, [id]: summary}), []);
  const current = Object.values(summaries).filter(summary => summary.account === account), loaded = current.filter(summary => summary.loaded).length === 3;
  const count = current.reduce((total, summary) => total + summary.entries, 0), staked = current.reduce((total, summary) => total + BigInt(summary.staked), 0n), available = current.reduce((total, summary) => total + BigInt(summary.available), 0n);
  async function request() {setConnecting(true); setError(''); try {await connect();} catch (e) {setError((e as Error).message);} finally {setConnecting(false);}}
  return <section className="consumer-portfolio"><div className="market-browser-heading"><div><h1>Your predictions.</h1><p>Track your stakes, follow results and collect your GEN.</p></div><Link className="text-action" href="/">Browse markets <ArrowRight size={17}/></Link></div>
    {!account ? <div className="portfolio-empty"><Wallet size={28}/><h2>Your wallet. Your predictions.</h2><p>Connect the wallet you used to stake. Your entries and available winnings appear here.</p><button className="button primary" disabled={connecting} onClick={request}>{connecting ? 'Connecting…' : 'Connect wallet'}<ArrowRight size={17}/></button>{error && <p className="trade-error" role="alert">{error}</p>}</div> : <>
      <div className="portfolio-stats"><div><span>Predictions in view</span><strong>{loaded ? count : '—'}</strong></div><div><span>Open stakes</span><strong>{loaded ? displayGen(String(staked)) : '—'} <small>GEN</small></strong></div><div><span>Available to collect</span><strong>{loaded ? displayGen(String(available)) : '—'} <small>GEN</small></strong></div></div>
      <p className="portfolio-help">Results update automatically. Collect available GEN with one wallet confirmation.</p>
      {!loaded && <p className="sync-notice" role="status">Finding your predictions…</p>}
      {rounds.filter(round => isMovie(round.id)).map(round => <PortfolioMovie key={round.id + account} round={round} connect={connect} report={report}/>)}
      {loaded && count === 0 && <div className="portfolio-empty"><h2>Make your first prediction.</h2><p>Choose a movie and back an opening-weekend range with at least 2 GEN.</p><Link className="button primary" href="/">Explore markets <ArrowRight size={17}/></Link></div>}
    </>}
    <p className="market-bottom-note">Latest sessions shown first · StudioNet practice GEN</p>
  </section>;
}
