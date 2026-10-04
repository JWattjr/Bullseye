import {baseSpec, type Round} from './domain';
import {specificationHash} from './evidence';

// US wide-release dates checked against The Numbers on October 4, 2026.
// Dates and ranges are frozen by the validator contract before GEN entries open.
export const upcomingFilms = [
  {id: 'street-fighter-2026', title: 'Street Fighter', release: '2026-10-16', slug: 'Street-Fighter-(2026)', artwork: 'ochre', bounds: [25, 50, 75]},
  {id: 'clayface-2026', title: 'Clayface', release: '2026-10-23', slug: 'Clayface-(2026)', artwork: 'slate', bounds: [20, 40, 60]},
  {id: 'cat-in-the-hat-2026', title: 'The Cat in the Hat', release: '2026-11-06', slug: 'Dr-Seuss-The-Cat-in-the-Hat-(2026)', artwork: 'lime', bounds: [25, 50, 75]},
  {id: 'hunger-games-sunrise-2026', title: 'The Hunger Games: Sunrise on the Reaping', release: '2026-11-20', slug: 'Hunger-Games-The-Sunrise-on-the-Reaping-(2026)', artwork: 'ochre', bounds: [50, 75, 100]},
  {id: 'dune-three-2026', title: 'Dune: Part Three', release: '2026-12-18', slug: 'Dune-Part-Three-(2026)', artwork: 'slate', bounds: [75, 100, 150]},
] as const;

export function upcomingRounds(): Round[] {
  return upcomingFilms.map(film => {
    const release = Date.parse(film.release + 'T00:00:00Z') / 1000;
    const end = new Date((release + 2 * 86400) * 1000).toISOString().slice(0, 10);
    const bounds = [0, ...film.bounds.map(value => value * 1_000_000)];
    // Close Wednesday evening in North America, before Thursday previews.
    // First observation: Tuesday 12:00 UTC. Retry up to the following Friday.
    const spec = baseSpec('competitive', [release - 86400, release + 4.5 * 86400, release + 11 * 86400], bounds.map((lower, index) => ({lower, upper: bounds[index + 1] ?? null})));
    spec.event = film.title + ' (2026), ' + film.release + ' to ' + end;
    spec.source_url = 'https://www.the-numbers.com/movie/' + film.slug;
    return {id: film.id, title: film.title, year: '2026', description: 'Forecast the domestic opening weekend. Entries close before release; GenLayer verifies the published result.', artwork: film.artwork, spec, status: 'awaiting_validation', specification_hash: specificationHash(spec), evidence: null, winner: null, histogram: spec.ranges.map(() => 0)};
  });
}

export function addUpcomingRounds(rounds: Round[]) {
  for (const round of upcomingRounds()) {
    const existing = rounds.findIndex(item => item.id === round.id);
    if (existing < 0) rounds.push(round);
    // Local seed metadata is not a resolved protocol record.
    else if (!rounds[existing].protocol) rounds[existing] = round;
  }
}
