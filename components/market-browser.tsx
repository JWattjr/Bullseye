'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {ArrowUpRight, Search, Clock, ChevronDown} from 'lucide-react';
import {rangeLabel, type Round} from '@/lib/domain';
import {displayGen, isMovie, movieIds, movieQuestion, marketDate, type FilmSnapshot} from '@/lib/film-market';

export function MarketArt({round}: {round: Round}) {
  return <div className={'market-art ' + round.artwork} aria-hidden="true"><span>{round.title.charAt(0)}</span><small>{round.year}</small></div>;
}

export default function MarketBrowser({rounds}: {rounds: Round[]}) {
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('upcoming'), [snapshots, setSnapshots] = useState<Record<string, FilmSnapshot>>({}), [failed, setFailed] = useState(false), [now, setNow] = useState(0);
  const movies = rounds.filter(round => isMovie(round.id)).sort((a, b) => Number(b.spec.mode === 'competitive') - Number(a.spec.mode === 'competitive') || (a.spec.mode === 'competitive' ? a.spec.entry_deadline - b.spec.entry_deadline : 0));
  useEffect(() => {
    let active = true, loading = false;
    const load = async () => {
      if (loading || document.visibilityState === 'hidden') return;
      loading = true;
      const results = await Promise.allSettled(movieIds.map(async id => {
        const response = await fetch('/api/film-pools?movie=' + id, {cache: 'no-store'}), result: FilmSnapshot = await response.json();
        if (!response.ok) throw Error();
        if (active) setSnapshots(previous => ({...previous, [id]: result}));
        const pool = result.pools[0], time = Date.now() / 1000;
        if (pool?.status === 'open' && pool.entry_deadline <= time && (result.source.spec.mode !== 'competitive' || result.source.spec.observation_time <= time)) await fetch('/api/film-pools', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({movie: id, poolId: pool.id})});
      }));
      if (active) {setFailed(results.some(result => result.status === 'rejected')); setNow(Math.floor(Date.now() / 1000));}
      loading = false;
    };
    void load(); const timer = setInterval(load, 45_000);
    const visible = () => {if (document.visibilityState === 'visible') void load();};
    document.addEventListener('visibilitychange', visible);
    return () => {active = false; clearInterval(timer); document.removeEventListener('visibilitychange', visible);};
  }, []);
  const visible = movies.filter(round => round.title.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (filter === 'upcoming') === (round.spec.mode === 'competitive')));
  return <section className="market-browser">
    <div className="market-browser-heading"><div><h1>Call the box office.</h1><p>Pick your movie. Choose a range. Back your call with GEN.</p></div><Link className="text-action" href="/predictions">My predictions <ArrowUpRight size={17}/></Link></div>
    <div className="market-browser-toolbar"><div className="market-filters" aria-label="Filter markets">{[['upcoming', 'Upcoming'], ['practice', 'Practice'], ['all', 'All markets']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><label className="market-search"><Search size={17}/><input type="search" placeholder="Search movies" aria-label="Search movies" value={search} onChange={e => setSearch(e.target.value)}/></label></div>
    <div className="market-grid">{visible.map(round => {
      const snapshot = snapshots[round.id], latest = snapshot?.pools[0], future = round.spec.mode === 'competitive', spec = snapshot?.source.spec ?? round.spec;
      const open = future ? snapshot?.ready && snapshot.source.status === 'open' && spec.entry_deadline > now : latest?.status === 'open' && latest.entry_deadline > now;
      const pool = future ? latest : open ? latest : undefined;
      const release = spec.event.split(', ').at(-1)!.split(' to ')[0];
      const state = !snapshot ? 'Loading…' : future ? !snapshot.ready ? 'Opening soon' : open ? 'Closes ' + marketDate(spec.entry_deadline) : ['resolved', 'void'].includes(latest?.status ?? '') ? latest?.status === 'void' ? 'Refunds available' : 'Result confirmed' : 'Entries closed' : open ? 'Session open' : '2-minute sessions';
      return <article className="movie-market-card" key={round.id}>
        <Link className="market-card-heading" href={'/rounds/' + round.id}><MarketArt round={round}/><div><h2>{round.title}</h2><span className="market-year">{future ? 'Opens ' + marketDate(Date.parse(release + 'T00:00:00Z') / 1000) : round.year} · US & Canada</span><span className="market-mode">{future ? 'Upcoming release' : 'Historical practice'}</span></div><ArrowUpRight size={18}/></Link>
        <p className="market-card-question">{movieQuestion(round)}</p>
        <div className="market-preview-ranges">{spec.ranges.map((range, index) => <Link key={index} href={'/rounds/' + round.id + '?range=' + index + '#prediction'}><span>{rangeLabel(range)}</span><strong>{snapshot ? displayGen(pool?.pools[index] ?? '0') + ' GEN' : '—'}</strong><ArrowUpRight size={14}/></Link>)}</div>
        <div className="market-card-footer"><span><strong>{snapshot ? displayGen(pool?.total ?? '0') + ' GEN' : 'Loading…'}</strong> pooled</span><span><Clock size={13}/>{state}</span></div>
      </article>;
    })}</div>
    {!visible.length && <div className="markets-empty"><h2>{search ? 'No movies found' : 'No markets here yet'}</h2><p>Try another film title or browse all markets.</p><button className="button secondary" onClick={() => {setSearch(''); setFilter('all');}}>Show all markets</button></div>}
    {failed && <p className="sync-notice" role="status">Pool totals are temporarily unavailable. We’ll retry automatically; open a movie to check its latest status.</p>}
    <div className="market-browser-footnote"><p>Minimum 2 GEN · Winners share the pool · No pool fee</p><details><summary>How it works <ChevronDown size={15}/></summary><p>Choose an opening-weekend range, enter your GEN stake and confirm in your wallet. Upcoming entries close before release. After the opening weekend, GenLayer verifies the published box-office result and settlement runs automatically. Collect available GEN from My predictions.</p><p>Practice markets replay historical films in two-minute sessions with known results. StudioNet GEN is simulated currency. Pool shares describe stakes, not the probability of winning.</p></details></div>
  </section>;
}
