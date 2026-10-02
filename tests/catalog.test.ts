import {test} from 'node:test';
import assert from 'node:assert/strict';
import {historicalRound,historicalRounds,addHistoricalRounds} from '../lib/seed';
import {validateSpec,score} from '../lib/domain';
import {verifyEvidence} from '../lib/evidence';
import {submitPractice,type Database} from '../lib/practice';
test('film expansion preserves old predictions and adds each historical round once',()=>{
  const old=historicalRound();old.histogram[3]=1;const db:Database={rounds:[old],predictions:[],profiles:{},drafts:{}};
  addHistoricalRounds(db.rounds);addHistoricalRounds(db.rounds);assert.equal(db.rounds.length,3);assert.equal(db.rounds[0],old);assert.equal(old.histogram[3],1);
  for(const round of db.rounds){assert.deepEqual(validateSpec(round.spec),[]);assert.equal(verifyEvidence(round.evidence!,round.spec),true);}
  for(const round of db.rounds.slice(1)){const p=submitPractice(db,'u',round.id,2,0);assert.equal(score(p,round).practicePoints,100);assert.equal(score(p,round).counted,false);}
  assert.equal(db.predictions.length,2);assert.deepEqual(historicalRounds().slice(1).map(r=>r.evidence!.normalized_value),[82455420,82505391]);
});
