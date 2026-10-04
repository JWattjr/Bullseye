'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {ArrowUpRight, Search, Clock, ChevronDown} from 'lucide-react';
import {rangeLabel, type Round} from '@/lib/domain';
import {displayGen, isMovie, movieQuestion, type FilmSnapshot} from '@/lib/film-market';

export function MarketArt({round}: {round: Round}) {
  return <div className={'market-art ' + round.artwork} aria-hidden="true"><span>{round.title.charAt(0)}</span><small>{round.year}</small></div>;
}

export default function MarketBrowser({rounds}: {rounds: Round[]}) {
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('all'), [snapshots, setSnapshots] = useState<Record<string, FilmSnapshot>>({}), [failed, setFailed] = useState(false), [now, setNow] = useState(0);
  const movies = rounds.filter(round => isMovie(round.id));
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (document.visibilityState === 'hidden') return;
      const results = await Promise.allSettled(['barbie-practice', 'oppenheimer-practice', 'dune-two-practice'].map(async id => {
        const response = await fetch('/api/film-pools?movie=' + id, {cache: 'no-store'}), result = await response.json();
        if (!response.ok) throw Error();
        if (active) setSnapshots(previous => ({...previous, [id]: result}));
        const pool = result.pools[0];
        if (pool?.status === 'open' && pool.entry_deadline <= Date.now() / 1000) await fetch('/api/film-pools', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({movie: id, poolId: pool.id})});
      }));
      if (active) {setFailed(results.some(result => result.status === 'rejected')); setNow(Math.floor(Date.now() / 1000));}
    };
    void load(); const timer = setInterval(load, 45_000);
    const visible = () => {if (document.visibilityState === 'visible') void load();};
    document.addEventListener('visibilitychange', visible);
    return () => {active = false; clearInterval(timer); document.removeEventListener('visibilitychange', visible);};
  }, []);
  const visible = movies.filter(round => round.title.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || snapshots[round.id]?.pools[0]?.status === 'open' && snapshots[round.id].pools[0].entry_deadline > now));
  return <section className="market-browser">
    <div className="market-browser-heading"><div><h1>Call the box office.</h1><p>Pick your movie. Choose a range. Back your call with GEN.</p></div><Link className="text-action" href="/predictions">My predictions <ArrowUpRight size={17}/></Link></div>
    <div className="market-browser-toolbar"><div className="market-filters" aria-label="Filter markets">{[['all', 'All markets'], ['open', 'Open sessions']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><label className="market-search"><Search size={17}/><input type="search" placeholder="Search movies" aria-label="Search movies" value={search} onChange={e => setSearch(e.target.value)}/></label></div>
    <div className="market-grid">{visible.map(round => {
      const snapshot = snapshots[round.id], latest = snapshot?.pools[0], open = latest?.status === 'open' && latest.entry_deadline > now, pool = open ? latest : undefined;
      return <article className="movie-market-card" key={round.id}>
        <Link className="market-card-heading" href={'/rounds/' + round.id}><MarketArt round={round}/><div><h2>{round.title}</h2><span className="market-year">{round.year} · US & Canada</span><span className="market-mode">Historical practice</span></div><ArrowUpRight size={18}/></Link>
        <p className="market-card-question">{movieQuestion(round)}</p>
        <div className="market-preview-ranges">{round.spec.ranges.map((range, index) => <Link key={index} href={'/rounds/' + round.id + '?range=' + index + '#prediction'}><span>{rangeLabel(range)}</span><strong>{snapshot ? displayGen(pool?.pools[index] ?? '0') + ' GEN' : '—'}</strong><ArrowUpRight size={14}/></Link>)}</div>
        <div className="market-card-footer"><span><strong>{snapshot ? displayGen(pool?.total ?? '0') + ' GEN' : 'Loading…'}</strong> pooled</span><span><Clock size={13}/>{open ? 'Session open' : '2-minute sessions'}</span></div>
      </article>;
    })}</div>
    {!visible.length && <div className="markets-empty"><h2>{search ? 'No movies found' : 'No sessions open right now'}</h2><p>{search ? 'Try another film title.' : 'Your first prediction starts a session. Choose any movie to begin.'}</p><button className="button secondary" onClick={() => {setSearch(''); setFilter('all');}}>Show all markets</button></div>}
    {failed && <p className="sync-notice" role="status">Pool totals are temporarily unavailable. We’ll retry automatically; open a movie to check its latest status.</p>}
    <div className="market-browser-footnote"><p>Minimum 2 GEN · Winners share the pool · No pool fee</p><details><summary>How it works <ChevronDown size={15}/></summary><p>Choose an opening-weekend range, enter your GEN stake and confirm in your wallet. After the two-minute session, your result updates automatically. Collect available GEN from My predictions.</p><p>These three markets replay historical films with known results. StudioNet GEN is simulated currency. Pool shares describe stakes, not the probability of winning.</p></details></div>
  </section>;
}
