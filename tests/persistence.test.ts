import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('atomic file persistence serializes concurrent retries and survives a module reload',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'bullseye-test-'));process.env.BULLSEYE_DATA_DIR=directory;
  const {transaction,submitPractice}=await import('../lib/store');
  await Promise.all(Array.from({length:8},()=>transaction(db=>submitPractice(db,'guest','barbie-practice',2,100))));
  const saved=JSON.parse(await readFile(join(directory,'league.json'),'utf8'));assert.equal(saved.predictions.length,1);assert.equal(saved.rounds[0].histogram[2],1);
  const again=await transaction(db=>db.predictions[0]);assert.equal(again.id,saved.predictions[0].id);
});
