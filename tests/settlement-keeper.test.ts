import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runSettlementKeeper} from '../lib/settlement-keeper';
import {upcomingRounds} from '../lib/upcoming';
import {historicalRounds} from '../lib/seed';
import type {FilmSnapshot, MovieId} from '../lib/film-market';

const rounds = [...historicalRounds(), ...upcomingRounds()];
function snapshot(movie: MovieId, pool = false): FilmSnapshot {
  const round = rounds.find(round => round.id === movie)!;
  return {contract: '0x1111111111111111111111111111111111111111', sourceRoundId: movie, source: {spec: round.spec, status: 'open', winner: null, evidence: null}, pools: pool ? [{id: movie + '-pool-1', source_round_id: movie, status: 'open', entry_deadline: round.spec.entry_deadline}] as FilmSnapshot['pools'] : [], ready: true, olderBefore: null};
}

test('offline keeper never requests an upcoming result before its observation time', async () => {
  const reads: string[] = [], writes: string[] = [];
  const results = await runSettlementKeeper({
    snapshot: async movie => {reads.push(movie); return snapshot(movie);},
    settle: async movie => {writes.push(movie); return {state: 'pending'};},
    wait: async () => {throw Error('Must not wait');}, invalidate: () => {},
    clock: () => Date.parse('2026-10-04T12:00:00Z'),
  });
  assert.equal(results.filter(result => result.state === 'scheduled').length, 5);
  assert.deepEqual(reads, ['barbie-practice', 'oppenheimer-practice', 'dune-two-practice']);
  assert.deepEqual(writes, []);
});

test('offline resolution waits for oracle and pool finality, without a user wallet', async () => {
  const future = upcomingRounds()[0], calls: string[] = [];
  let stage = 0;
  const results = await runSettlementKeeper({
    snapshot: async movie => snapshot(movie, movie === future.id),
    settle: async movie => {
      assert.equal(movie, future.id);
      calls.push('submit:' + stage);
      return stage === 0 ? {state: 'pending', hash: 'oracle'} : stage === 1 ? {state: 'pending', hash: 'pool'} : {state: 'resolved'};
    },
    wait: async hash => {calls.push('finality:' + hash); stage++;},
    invalidate: movie => {calls.push('refresh:' + movie);},
    clock: () => future.spec.observation_time * 1000 + 1000,
  });
  assert.equal(stage, 2);
  assert.deepEqual(calls.filter(call => call.startsWith('finality:')), ['finality:oracle', 'finality:pool']);
  assert.ok(results.some(result => result.movie === future.id && result.state === 'resolved'));
});

test('a pending observation and a failed market cannot block other films', async () => {
  const future = upcomingRounds()[0];
  let waits = 0;
  const results = await runSettlementKeeper({
    snapshot: async movie => {if (movie === 'barbie-practice') throw Error('RPC temporarily unavailable'); return snapshot(movie, movie === future.id);},
    settle: async () => ({state: 'pending', hash: 'same-observation'}),
    wait: async () => {waits++;}, invalidate: () => {},
    clock: () => future.spec.observation_time * 1000 + 1000,
  });
  assert.equal(waits, 1);
  assert.ok(results.some(result => result.movie === 'barbie-practice' && result.state === 'retry_required'));
  assert.ok(results.some(result => result.movie === 'oppenheimer-practice' && result.state === 'up_to_date'));
});
