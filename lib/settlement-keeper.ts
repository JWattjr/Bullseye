import type {FilmSnapshot, MovieId} from './film-market';
import {movieIds} from './film-market';
import {upcomingRounds} from './upcoming';

type Dependencies = {
  snapshot: (movie: MovieId, before?: number) => Promise<FilmSnapshot>;
  settle: (movie: MovieId, id: string) => Promise<{state: string; hash?: string}>;
  wait: (hash: string, until: number) => Promise<void>;
  invalidate: (movie: MovieId, poolId?: string) => void;
  clock?: () => number;
};

// Fixed listed markets only. No supplied addresses, results, stakes or claims.
export async function runSettlementKeeper(deps: Dependencies, budgetMs = 240_000) {
  const clock = deps.clock ?? Date.now, until = clock() + budgetMs;
  const results: {movie: MovieId; state: string; poolId?: string; error?: string}[] = [];
  for (const movie of movieIds) {
    if (clock() >= until - 10_000) {results.push({movie, state: 'budget_exhausted'}); continue;}
    const future = upcomingRounds().find(round => round.id === movie);
    if (future && clock() / 1000 < future.spec.observation_time) {results.push({movie, state: 'scheduled'}); continue;}
    try {
      let before: number | undefined;
      do {
        const snapshot = await deps.snapshot(movie, before);
        if (!snapshot.ready) {results.push({movie, state: 'not_ready'}); break;}
        for (const pool of snapshot.pools) {
          if (pool.status !== 'open' || clock() / 1000 < pool.entry_deadline) continue;
          if (clock() >= until - 10_000) break;
          let lastHash: string | undefined;
          // Source adjudication -> source callback -> pool settlement -> pool callback.
          for (let pass = 0; pass < 3 && clock() < until - 10_000; pass++) {
            const result = await deps.settle(movie, pool.id);
            results.push({movie, poolId: pool.id, state: result.state});
            if (!result.hash || result.hash === lastHash) break;
            lastHash = result.hash;
            await deps.wait(result.hash, until);
            deps.invalidate(movie, pool.id);
          }
        }
        before = snapshot.olderBefore ?? undefined;
      } while (before !== undefined && clock() < until - 10_000);
      if (!results.some(result => result.movie === movie)) results.push({movie, state: 'up_to_date'});
    } catch (error) {
      results.push({movie, state: 'retry_required', error: (error as Error).message});
    }
  }
  return results;
}
