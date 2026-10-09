import {test} from 'node:test';
import assert from 'node:assert/strict';
import {poolShare, positionState, projectedReturn, receiptComplete, receiptCopy, receiptFailed, type FilmPool, type FilmReceipt} from '../lib/film-market';

test('a collection is complete only after the exact transfer is credited to its signer', () => {
  const receipt: FilmReceipt = {hash: '0x1', action: 'claim', state: 'finalized', sender: '0xabc', amount: '4000000000000000000', transfers: []};
  assert.equal(receiptComplete(receipt), false);
  const transfer = {hash: '0x2', state: 'credited', recipient: '0xabc', value: receipt.amount!};
  assert.equal(receiptComplete({...receipt, transfers: [transfer]}), true);
  for (const change of [{recipient: '0xdef'}, {value: '2000000000000000000'}, {state: 'finalized'}, {state: 'pending'}]) assert.equal(receiptComplete({...receipt, transfers: [{...transfer, ...change}]}), false);
  const failed = {...receipt, transfers: [{...transfer, state: 'failed'}]};
  assert.equal(receiptFailed(failed), true); assert.equal(receiptComplete(failed), true);
  assert.equal(receiptCopy(failed), 'Transfer needs attention');
});

test('stake shares and estimated returns conserve bigint precision and describe a two-wallet pool', () => {
  const pool = {total: '4000000000000000000', pools: ['2000000000000000000', '0', '2000000000000000000', '0']} as FilmPool;
  assert.equal(poolShare(pool, 2), 50);
  assert.equal(projectedReturn(pool, 2, 2n * 10n ** 18n), '3000000000000000000');
  assert.equal(projectedReturn(undefined, 2, 2000000000000000001n), '2000000000000000001');
});

test('failed v2 delivery remains pending until independent verification permits recovery', () => {
  const receipt: FilmReceipt = {hash: '0x1', action: 'claim', state: 'finalized', payoutVersion: 2, recovery: 'pending', sender: '0xabc', amount: '4', transfers: [{hash: '0x2', state: 'failed', recipient: '0xabc', value: '4'}]};
  assert.equal(receiptComplete(receipt), false);
  assert.equal(receiptCopy(receipt), 'Checking the failed transfer…');
  assert.equal(receiptComplete({...receipt, recovery: 'failed_pending_finality'}), false);
  assert.equal(receiptComplete({...receipt, recovery: 'failed'}), true);
  assert.equal(receiptCopy({...receipt, recovery: 'failed'}), 'Your GEN is ready to collect again');
  const credited = {...receipt, transfers: [{...receipt.transfers![0], state: 'credited'}]};
  assert.equal(receiptComplete(credited), false);
  assert.equal(receiptComplete({...credited, recovery: 'paid'}), true);
});

test('pending results, losses and empty-winning-pool refunds have distinct consumer states', () => {
  const pool = {status: 'open', entry_deadline: 100, winner: 2, total: '4', pools: ['2', '0', '2', '0'], participants: ['a', 'b'], entries: {a: {range: 0, stake: '2'}, b: {range: 2, stake: '2'}}, claims: {}} as unknown as FilmPool;
  assert.equal(positionState(pool, 'a', 50), 'Open'); assert.equal(positionState(pool, 'a', 101), 'Resolving');
  pool.status = 'resolved_pending_finality'; assert.equal(positionState(pool, 'b', 101), 'Resolving');
  pool.status = 'resolved'; assert.equal(positionState(pool, 'a', 101), 'Lost'); assert.equal(positionState(pool, 'b', 101), 'Won');
  pool.pools[2] = '0'; assert.equal(positionState(pool, 'a', 101), 'Refund available');
});
