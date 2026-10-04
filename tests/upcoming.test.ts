import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addUpcomingRounds, upcomingRounds} from '../lib/upcoming';
import {historicalRounds} from '../lib/seed';
import {validateSpec} from '../lib/domain';
import {specificationHash} from '../lib/evidence';

test('five upcoming markets freeze a pre-preview cutoff and later evidence window', () => {
  const rounds = upcomingRounds();
  assert.equal(rounds.length, 5);
  assert.equal(new Set(rounds.map(round => round.id)).size, 5);
  for (const round of rounds) {
    assert.deepEqual(validateSpec(round.spec), []);
    const release = Date.parse(round.spec.event.split(', ').at(-1)!.split(' to ')[0] + 'T00:00:00Z') / 1000;
    assert.equal(round.spec.entry_deadline, release - 86400);
    assert.equal(round.spec.observation_time, release + 4.5 * 86400);
    assert.equal(round.spec.resolution_deadline, release + 11 * 86400);
    assert.equal(round.specification_hash, specificationHash(round.spec));
    assert.equal(round.evidence, null);
    assert.equal(round.winner, null);
    assert.equal(round.status, 'awaiting_validation');
    assert.deepEqual(round.histogram, [0, 0, 0, 0]);
  }
});

test('upcoming migration is idempotent and preserves historical predictions and protocol records', () => {
  const rounds = historicalRounds(), prior = JSON.stringify(rounds);
  addUpcomingRounds(rounds);
  addUpcomingRounds(rounds);
  assert.equal(rounds.length, 8);
  assert.equal(JSON.stringify(rounds.slice(0, 3)), prior);
  rounds[3].protocol = {contract: '0xabc', specificationTx: '0x123', adjudicationTx: null, status: 'open'};
  rounds[3].status = 'open';
  addUpcomingRounds(rounds);
  assert.equal(rounds[3].status, 'open');
  assert.equal(rounds[3].protocol?.contract, '0xabc');
});
