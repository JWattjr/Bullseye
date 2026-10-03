import {test} from 'node:test';
import assert from 'node:assert/strict';
import {baseSpec,closeness,defaultRanges,score,validateSpec,winningRange,type Prediction} from '../lib/domain';
import {makeEvidence,verifyEvidence,specificationHash} from '../lib/evidence';
import {historicalRound} from '../lib/seed';
import {refreshRehearsal,startRehearsal,submitPractice,type Database} from '../lib/store';
import {successfulFinalized} from '../lib/protocol';
test('exact half-open boundary and overflow accounting',()=>{for(const [value,index] of [[0,0],[99999999,0],[100000000,1],[150000000,2],[200000000,3],[1e15,3]])assert.equal(winningRange(defaultRanges,value),index);assert.throws(()=>winningRange(defaultRanges,-1));assert.throws(()=>winningRange(defaultRanges,1.5));});
test('invalid units, overlap, source, deadlines rejected',()=>{for(const change of [{currency:'EUR'},{scale:100},{source_url:'https://evil.example'},{entry_deadline:500},{ranges:[{lower:0,upper:100},{lower:99,upper:200},{lower:200,upper:null}]}])assert.ok(validateSpec({...baseSpec('historical',[100,200,300]),...change}).length>0);});
test('evidence hash binds passage and exact specification',()=>{const spec=baseSpec('historical',[100,200,300]);const e=makeEvidence(spec,'Opening Weekend: $162,022,044',162022044,200);assert.equal(verifyEvidence(e,spec),true);assert.equal(verifyEvidence({...e,extracted_passage:'changed'},spec),false);assert.equal(verifyEvidence(e,{...spec,entry_deadline:99}),false);assert.equal(specificationHash(spec),specificationHash(JSON.parse(JSON.stringify(spec))));});
test('practice, unresolved and void never count competitively',()=>{const r=historicalRound();const p:Prediction={id:'a',participant:'u',roundId:r.id,range:2,submittedAt:1,kind:'practice',state:'practice_confirmed'};assert.equal(score(p,r).practicePoints,100);assert.equal(score(p,r).counted,false);for(const status of ['pending','void','resolved_pending_finality'])assert.equal(score(p,{...r,status}).practicePoints,0);});
test('competitive points require finalized entry and resolved round',()=>{const r=historicalRound();r.spec.mode='competitive';const p:Prediction={id:'a',participant:'u',roundId:r.id,range:2,submittedAt:1,kind:'protocol',state:'submitted'};assert.equal(score(p,r).points,0);assert.equal(score({...p,state:'finalized'},r).points,100);assert.equal(score({...p,state:'finalized',range:1},r).points,0);});
test('protocol acceptance and finalized failure are never success',()=>{assert.equal(successfulFinalized({statusName:'ACCEPTED',txExecutionResultName:'FINISHED_WITH_RETURN'}),false);assert.equal(successfulFinalized({statusName:'FINALIZED',txExecutionResultName:'FINISHED_WITH_ERROR'}),false);assert.equal(successfulFinalized({statusName:'FINALIZED',txExecutionResultName:'FINISHED_WITH_RETURN'}),true);});
test('duplicate practice calls idempotent; changes and late entries rejected',()=>{const db:Database={rounds:[historicalRound()],predictions:[],profiles:{},drafts:{}};const a=submitPractice(db,'guest','barbie-practice',2,100);assert.equal(submitPractice(db,'guest','barbie-practice',2,101).id,a.id);assert.equal(db.rounds[0].histogram[2],1);assert.throws(()=>submitPractice(db,'guest','barbie-practice',1,101));const r=startRehearsal(db,'guest',100);assert.throws(()=>submitPractice(db,'guest',r.id,1,108));});
test('accelerated timings isolated; result and timeout cannot score twice',()=>{const db:Database={rounds:[],predictions:[],profiles:{},drafts:{}};const r=startRehearsal(db,'u',100);submitPractice(db,'u',r.id,1,101);refreshRehearsal(r,110);assert.equal(r.status,'resolved');assert.equal(r.winner,1);refreshRehearsal(r,500);assert.equal(r.status,'resolved');const late=startRehearsal(db,'u',100);refreshRehearsal(late,221);assert.equal(late.status,'void');});

test('closeness bonus matches the contract: full at exact, zero at 25% away', () => {
  assert.equal(closeness(162_022_044, 162_022_044), 100);
  assert.equal(closeness(180_000_000, 162_022_044), 56);
  assert.equal(closeness(120_000_000, 162_022_044), 0);
  assert.equal(closeness(undefined, 162_022_044), 0);
});
