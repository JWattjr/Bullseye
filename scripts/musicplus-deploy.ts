import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import type {GenLayerClient,TransactionHash} from 'genlayer-js/types';
import {TransactionStatus,TransactionHashVariant} from 'genlayer-js/types';
import {studionet} from 'genlayer-js/chains';
import {successfulFinalized} from '../lib/protocol';
import {creditedTransfer} from '../lib/pool-proof';

const folder='docs/proofs/musicplus-2026-10-14';
const originals:Record<string,string>={
 rules:'https://www.billboard.com/music/chart-beat/taylor-swift-midnights-back-number-one-billboard-200-til-dawn-late-nights-1235345655/',
 rhino:'https://media.rhino.com/press-release/different-kind-truth',
 andy:'https://www.hollywoodrecords.com/press/andygrammer/',
};
const stringify=(v:unknown)=>JSON.stringify(v,(_,i)=>typeof i==='bigint'?String(i):i,2)+'\n';
const owner='0xdb433ff614bdd1ece21aa97221c3e0a7ecf79c92';
const approvedRecipient='0xee03ebD002BfACFba5379Ab01F17572081a8E373';
const approvedFundsFlag='authorized-candidate4-0.028-gen';
const cases:Record<string,{id:string;question:string;release?:string;chart?:string;ground?:string;argument?:string;historical:boolean;entry?:string;source?:string}>={
 andy:{id:'big-stupid-heart-2026',question:'Where will Big Stupid Heart by Andy Grammer debut on the Billboard 200 chart dated October 31, 2026? Count all standard and deluxe editions together.',historical:false,entry:'2026-10-16',chart:'2026-10-31',release:'2026-10-16',source:'https://www.hollywoodrecords.com/press/andygrammer/'},
 bernie:{id:'the-sea-has-no-mercy-2026',question:'Where will The Sea Has No Mercy by Bernie Taupin debut on the Billboard 200 chart dated November 7, 2026? Count all standard and deluxe editions together.',historical:false,entry:'2026-10-23',chart:'2026-11-07',release:'2026-10-23',source:'https://shorefire.com/releases/entry/bernie-taupin-teams-up-with-his-daughter-georgey-taupin-on-new-single-one-hundred-ways'},
 vanhalen:{id:'a-different-kind-of-truth-reissue-2026',question:'What Billboard 200 chart position will A Different Kind of Truth (2026 physical reissue) by Van Halen reach on the chart dated November 7, 2026? Treat this physical reissue as a separate edition entry, not the combined standard album. This is a re-entry chart position question, not its 2012 debut.',historical:false,entry:'2026-10-23',chart:'2026-11-07',release:'2026-10-23',source:'https://media.rhino.com/press-release/different-kind-truth',ground:'EDITION_RULE',argument:'The actual October 23 physical reissue is the same 2012 album, not a newly debuted album. Check whether the archived Billboard treatment of standard and deluxe formats requires the combined album entry rather than a distinct physical-edition row.'},
 upheld:{id:'lover-identity-review',question:'Where did Lover by Taylor Swift debut on the Billboard 200 chart dated September 7, 2019? Count all standard and deluxe editions together under the standard album entry.',historical:true,ground:'EDITION_RULE',argument:'Verify whether the proposed combined standard and deluxe identity for Lover is supported by the frozen Billboard account of its four collectible deluxe CDs and widely available standard format contributing to one album entry.'},
 amended:{id:'surrender-chart-week-review',question:'Where did Surrender by Maggie Rogers debut on the Billboard 200 chart dated August 6, 2022?',historical:true,ground:'WRONG_CHART_WEEK',argument:'The archived release evidence says July 29, 2022. The proposed August 6 chart week ignores the lag between the Friday-to-Thursday sales tracking period and the dated Billboard chart. Choose the correct provided week if the frozen rule supports it.'},
 voided:{id:'surrender-unrepairable-week-review',question:'Where did Surrender by Maggie Rogers debut on the Billboard 200 chart dated June 4, 2022?',historical:true,ground:'WRONG_CHART_WEEK',argument:'The proposed June 4 chart week precedes the actual July 29 release by almost two months. The correct debut week is outside every bounded amendment candidate. Check the archived release evidence and decide if this proposed market can be repaired.'},
};
const releaseEvidence='https://en.wikipedia.org/w/index.php?title=Surrender_%28Maggie_Rogers_album%29&oldid=1308571311';
const stamp=(day:string)=>Math.floor(Date.parse(day+'T00:00:00Z')/1000);

export async function musicPlusDeploy(client:GenLayerClient<typeof studionet>) {
 if(client.chain?.id!==61999)throw Error('Music+ proofs require StudioNet.');
 mkdirSync(folder,{recursive:true});
 const path=folder+'/manifest.json';
 const proof=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{network:'StudioNet',simulated:true,status:'in-progress-not-submission-ready',contracts:{},transactions:{},sourceHashes:{},research:{},markets:{},sourceCommit:null,previousRelease:'docs/proofs/music-2026-10-12-release-v2/manifest.json'};
 const save=()=>{
  writeFileSync(path,stringify(proof));
  if(proof.payableSchema&&['markets','pools','seasons','challenges'].every(key=>proof.contracts[key]))writeFileSync('public/music-proof.json',stringify({network:'StudioNet',simulated:true,contracts:Object.fromEntries(['markets','pools','seasons','challenges'].map(key=>[key,proof.contracts[key]])),transactions:proof.transactions,sourceCommit:proof.sourceCommit,status:proof.status,markets:proof.markets,previousRelease:'/music/previous'}));
 };
 const read=async(address:`0x${string}`,functionName:string,args:Parameters<typeof client.readContract>[0]['args'])=>{await new Promise(r=>setTimeout(r,2500));return client.readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});};
 async function final(hash:TransactionHash,name:string) {
  const receipt=await client.waitForTransactionReceipt({hash,status:TransactionStatus.FINALIZED,retries:120,interval:5000});
  writeFileSync(folder+'/'+name+'.json',stringify(receipt));
  if(!successfulFinalized(receipt)&&!creditedTransfer(receipt as unknown as Record<string,unknown>,proof.contracts.challenges,owner)) {proof.expectedFailedTransactions??=[];if(!proof.expectedFailedTransactions.includes(name))proof.expectedFailedTransactions.push(name);save();throw Error('Finalized execution failed: '+name);}
  console.log(name+': finalized successful execution');return receipt;
 }
 async function deploy(role:string,file:string,args:Parameters<typeof client.deployContract>[0]['args']) {
  const code=readFileSync(file,'utf8'),digest=createHash('sha256').update(code).digest('hex');
  if(proof.sourceHashes[role]&&proof.sourceHashes[role]!==digest)throw Error('Recorded deployed source changed; use a new immutable candidate manifest.');
  if(proof.contracts[role])return proof.contracts[role];
  const name=role+'-deploy',hash=proof.transactions[name]??await client.deployContract({code,args});
  proof.transactions[name]=hash;proof.sourceHashes[role]=digest;save();
  proof.contracts[role]=(await final(hash,name)).recipient;save();return proof.contracts[role];
 }
 async function descendants(hash:TransactionHash,name:string,depth=0):Promise<void> {
  if(depth>5)throw Error('Unexpected callback depth. Inspect saved receipts before continuing.');
  await new Promise(r=>setTimeout(r,2500));
  for(const [index,child] of (await client.getTriggeredTransactionIds({hash})).entries()) {
   const label=name+'-child-'+index;proof.transactions[label]=child;save();await final(child,label);await descendants(child,label,depth+1);
  }
 }
 async function write(name:string,address:`0x${string}`,functionName:string,args:Parameters<typeof client.writeContract>[0]['args'],value=0n) {
  if(value&&!proof.transactions[name]) {
   if(existsSync('.data/musicplus-hold-deposits'))throw Error('Deposits held until real StudioNet evidence and quotation preflight succeeds.');
   const wallet=typeof client.account==='string'?client.account:client.account?.address;
   if(process.env.BULLSEYE_MUSICPLUS_FUNDS!==approvedFundsFlag||wallet?.toLowerCase()!==owner||address.toLowerCase()!==proof.approvedDepositRecipient?.toLowerCase()||address.toLowerCase()!==proof.contracts.challenges.toLowerCase())throw Error('Exact owner-approved Music+ wallet, recipient and deposit package required.');
   if(!cases[selected]||!['list_market','challenge'].includes(functionName)||value!==(functionName==='list_market'?4n*10n**15n:10n**15n))throw Error('Only the six approved listings and four approved bonds are funded.');
   proof.depositReservations??={};
   if(proof.depositReservations[name])throw Error('Deposit reserved without a recorded hash. Reconcile the wallet nonce; never broadcast twice.');
   const total=Object.values(proof.depositReservations).reduce<bigint>((sum,amount)=>sum+BigInt(String(amount)),0n);
   if(total+value>28n*10n**15n)throw Error('Approved 0.028 GEN package exhausted.');
   proof.depositReservations[name]=String(value);save();
  }
  const hash=proof.transactions[name]??await client.writeContract({address,functionName,args,value});
  proof.transactions[name]=hash;save();await final(hash,name);
  await descendants(hash,name);
 }
 const step=process.env.BULLSEYE_STEP,selected=process.env.BULLSEYE_MPLUS_CASE??'rules';
 if(step==='musicplus-import-keeper-proof') {
  if(!existsSync('.data/music-keeper.json'))return;
  const journal=JSON.parse(readFileSync('.data/music-keeper.json','utf8'));
  for(const [key,item] of Object.entries(cases))for(const [role,operation] of [['markets','open'],['pools','pool'],['challenges','release']]) {
   const address=proof.contracts[role],hash=journal[address.toLowerCase()+':'+operation+':'+item.id];if(!hash)continue;
   await new Promise(resolve=>setTimeout(resolve,2500));const raw=await client.getTransaction({hash}) as unknown as Record<string,unknown>;
   // Studio omits the optional value field on zero-value calls. Require its
   // explicit no-credit flag in that case; never treat an unknown amount as zero.
   const zeroValue=raw.value===undefined?raw.value_credited===false:BigInt(String(raw.value))===0n;
   if(String(raw.recipient??raw.to_address).toLowerCase()!==address.toLowerCase()||!zeroValue)throw Error('Keeper proof must be an exact current zero-GEN contract call.');
   const name='keeper-'+operation+'-'+key;proof.transactions[name]=hash;save();await final(hash,name);await descendants(hash,name);
  }
  return;
 }
 if(step==='musicplus-reconcile-credit') {
  const credit=JSON.parse(String(await read(proof.contracts.challenges,'get_credit',[owner])));
  const config=JSON.parse(String(await read(proof.contracts.challenges,'get_config',[])));
  const total=Object.values(proof.depositReservations??{}).reduce<bigint>((sum,amount)=>sum+BigInt(String(amount)),0n);
  const contractBalance=String(await client.getBalance({address:proof.contracts.challenges}));
  if(credit.available!=='0'||credit.withdrawal?.status!=='paid'||String(config.total_deposited)!==String(total)||String(config.total_paid)!==String(total)||contractBalance!=='0')throw Error('Actual deposit/paid ledger and empty native balance must reconcile.');
  await new Promise(resolve=>setTimeout(resolve,2500));const transfer=await client.getTransaction({hash:credit.withdrawal.transfer_hash});
  if(!creditedTransfer(transfer as unknown as Record<string,unknown>,proof.contracts.challenges,owner,String(credit.withdrawal.amount)))throw Error('Exact finalized native credit required.');
  proof.retirementReconciliation={verifiedAt:new Date().toISOString(),contractBalance,totalDeposited:String(total),totalPaid:String(total),nativeTransfer:credit.withdrawal.transfer_hash,walletBalanceIncreaseOutsidePackage:String(BigInt(proof.balanceAfterPackage)-BigInt(proof.balanceBeforePackage)),balanceNote:'Before/after wallet balances include activity outside this proof package; exact package returns are established by the finalized native receipt and contract ledger.'};save();return;
 }
 if(step==='musicplus-retire-candidate') {
  for(const key of ['upheld','amended','voided']) {
   const record=proof.markets[key];if(!record?.challenge)continue;
   let item=JSON.parse(String(await read(proof.contracts.challenges,'get_challenge',[record.challenge])));
   if(['posted','posted_pending_finality'].includes(item.status)) {
    if(Math.floor(Date.now()/1000)<item.deadline)throw Error('Wait for the recorded challenge deadline before retirement: '+key);
    await write('retire-expire-'+key,proof.contracts.challenges,'expire_challenge',[record.challenge]);
    item=JSON.parse(String(await read(proof.contracts.challenges,'get_challenge',[record.challenge])));
   }
   if(item.status!=='finalized')throw Error('Finalize the actual ruling before releasing deposits: '+key);
   let source=JSON.parse(String(await read(proof.contracts.markets,'get_market',[record.id])));
   if(source.status==='compiled') {
    const gate=JSON.parse(String(await read(proof.contracts.challenges,'get_open_gate',[record.id])));
    if(!gate.ready)throw Error('Recorded review gate is not clear: '+key);
    await write('retire-open-'+key,proof.contracts.markets,'open_market',[record.id,gate.approved_hash]);
   }
   await write('retire-release-'+key,proof.contracts.challenges,'release_listing',[record.id]);
   source=JSON.parse(String(await read(proof.contracts.markets,'get_market',[record.id])));
   record.retired={diagnostic:true,challenge:item,source};save();
  }
  proof.retirementCredit=JSON.parse(String(await read(proof.contracts.challenges,'get_credit',[owner])));save();return;
 }
 const probeRole=process.env.BULLSEYE_MPLUS_PROBE_ROLE??'reviewProbe';
 if(!['reviewProbe','reviewProbeV2'].includes(probeRole))throw Error('Choose a recorded diagnostic role.');
 if(step==='musicplus-review-probe-deploy') {await deploy(probeRole,'tests/fixtures/musicplus_review_probe.py',[proof.research['snapshot-rules-lover'].snapshot,proof.contracts.markets]);return;}
 if(step==='musicplus-probe-access') {
  const url=process.env.BULLSEYE_MPLUS_PROBE_URL;if(!url||!proof.contracts.reviewProbe)throw Error('Deploy the zero-GEN probe and choose a real frozen URL.');
  await write('access-'+selected,proof.contracts.reviewProbe,'access',[selected,url]);proof.research['access-'+selected]=JSON.parse(String(await read(proof.contracts.reviewProbe,'get_result',[selected])));save();return;
 }
 if(step==='musicplus-probe-review') {
  const record=proof.markets[selected],item=cases[selected];if(!record||!item?.ground)throw Error('Use an actual compiled historical diagnostic case.');
  const url=process.env.BULLSEYE_MPLUS_PROBE_URL??(item.ground==='WRONG_CHART_WEEK'?releaseEvidence:'');
  const name='preflight-'+selected+(probeRole==='reviewProbeV2'?'-v2':'');
  await write(name,proof.contracts[probeRole],'preview',[name,record.id,item.ground,item.argument!,url]);proof.research[name]=JSON.parse(String(await read(proof.contracts[probeRole],'get_result',[name])));save();return;
 }
 if(step==='musicplus-deploy') {
  proof.sourceCommit??=execFileSync('git',['-c','safe.directory='+process.cwd(),'rev-parse','HEAD'],{encoding:'utf8'}).trim();save();
  const rules=proof.research['snapshot-rules-lover'];if(rules?.status!==200)throw Error('Actual StudioNet frozen-rules access proof required.');
  await deploy('challenges','contracts/music_challenges.py',[rules.snapshot,JSON.stringify(['www.billboard.com','ca.billboard.com','media.rhino.com','www.hollywoodrecords.com']),600,7200]);
  await deploy('markets','contracts/music_markets_v2.py',[proof.contracts.challenges]);
  await write('bind-markets',proof.contracts.challenges,'bind_markets',[proof.contracts.markets]);
  await deploy('pools','contracts/music_pools_v2.py',[proof.contracts.markets]);
  const old=JSON.parse(readFileSync(proof.previousRelease,'utf8'));
  proof.film=old.film;proof.previousContracts=old.contracts;
  await deploy('seasons','contracts/seasons_v2.py',[old.film,proof.contracts.markets,'bullseye-2026-musicplus',stamp('2026-01-01'),stamp('2027-01-01'),old.contracts.markets]);
  proof.challengeConfig=JSON.parse(String(await read(proof.contracts.challenges,'get_config',[])));save();return;
 }
 if(step==='musicplus-schema') {
  const schema=await client.getContractSchema(proof.contracts.challenges);
  if(!schema.methods.list_market?.payable||!schema.methods.challenge?.payable||schema.methods.recover_failed_deposit?.payable!==false&&schema.methods.recover_failed_deposit?.payable!==undefined||!schema.methods.recover_failed_deposit)throw Error('Live GenVM payable dispatch and failed-deposit recovery schema required.');
  proof.payableSchema={list_market:schema.methods.list_market,challenge:schema.methods.challenge,recover_failed_deposit:schema.methods.recover_failed_deposit};save();console.log('Actual deployed payable entry schema verified.');return;
 }
 if(step==='musicplus-list') {
  if(!proof.payableSchema)throw Error('Verify actual deployed payable dispatch before any deposit.');
  if(process.env.BULLSEYE_MUSICPLUS_FUNDS===approvedFundsFlag&&proof.contracts.challenges.toLowerCase()===approvedRecipient.toLowerCase()) {proof.approvedDepositRecipient=approvedRecipient;proof.depositApproval='Owner authorized exactly 0.028 StudioNet GEN for candidate 4: six listings and four bonds, then return credits to the same wallet.';save();}
  proof.balanceBeforePackage??=String(await client.getBalance({address:owner}));save();
  const item=cases[selected];if(!item)throw Error('Choose an approved proof case.');
  if(!proof.markets[selected]) {
   const now=Math.floor(Date.now()/1000),entry=item.entry?stamp(item.entry):now+12*3600,resolution=item.chart?stamp(item.chart)+14*86400:now+24*3600;
   proof.markets[selected]={...item,entry_deadline:entry,resolution_deadline:resolution};save();
  }
  const record=proof.markets[selected];
  await write(selected+'-list',proof.contracts.challenges,'list_market',[item.id,item.question,record.entry_deadline,record.resolution_deadline,item.historical],4n*10n**15n);
  record.compiled=JSON.parse(String(await read(proof.contracts.markets,'get_market',[item.id])));record.listing=JSON.parse(String(await read(proof.contracts.challenges,'get_listing',[item.id])));save();return;
 }
 if(step==='musicplus-challenge') {
  const item=cases[selected];if(!item?.ground||!proof.markets[selected])throw Error('Fund the named real challenge case first.');
  const id=selected+'-identity';proof.markets[selected].challenge=id;save();
  await write(selected+'-challenge',proof.contracts.challenges,'challenge',[id,item.id,item.ground,item.argument!,item.ground==='WRONG_CHART_WEEK'?releaseEvidence:''],10n**15n);
  await write(selected+'-adjudicate',proof.contracts.challenges,'adjudicate',[id]);
  proof.markets[selected].rulingTransaction=proof.transactions[selected+'-adjudicate'];proof.markets[selected].ruling=JSON.parse(String(await read(proof.contracts.challenges,'get_challenge',[id])));proof.markets[selected].compiled=JSON.parse(String(await read(proof.contracts.markets,'get_market',[item.id])));save();return;
 }
 if(step==='musicplus-judge') {
  const record=proof.markets[selected],attempt=process.env.BULLSEYE_MPLUS_ATTEMPT;if(!record?.challenge||!attempt||!/^[2-9]$/.test(attempt))throw Error('Explicit new zero-GEN judgment attempt required.');
  const item=JSON.parse(String(await read(proof.contracts.challenges,'get_challenge',[record.challenge])));if(item.status!=='posted')throw Error('Only an actually posted challenge can be retried.');
  const previous=selected+'-adjudicate';if(proof.transactions[previous]) {const receipt=await client.getTransaction({hash:proof.transactions[previous]});if(!successfulFinalized(receipt)&&receipt.statusName==='FINALIZED') {proof.expectedFailedTransactions??=[];if(!proof.expectedFailedTransactions.includes(previous))proof.expectedFailedTransactions.push(previous);save();}}
  const name=selected+'-adjudicate-'+attempt;await write(name,proof.contracts.challenges,'adjudicate',[record.challenge]);
  record.rulingTransaction=proof.transactions[name];record.ruling=JSON.parse(String(await read(proof.contracts.challenges,'get_challenge',[record.challenge])));record.compiled=JSON.parse(String(await read(proof.contracts.markets,'get_market',[record.id])));save();return;
 }
 if(step==='musicplus-open') {
  const record=proof.markets[selected];if(!record)throw Error('Named listing required.');
  const source=JSON.parse(String(await read(proof.contracts.markets,'get_market',[record.id])));
  if(source.status==='compiled') {
   const gate=JSON.parse(String(await read(proof.contracts.challenges,'get_open_gate',[record.id])));
   if(!gate.ready)throw Error('Review not yet clear: '+JSON.stringify(gate));
   await write(selected+'-open',proof.contracts.markets,'open_market',[record.id,gate.approved_hash]);
  } else if(source.status!=='open')throw Error('Only a reviewed compiled/open market can open its pool.');
  const existing=await read(proof.contracts.pools,'get_source_pool_ids',[record.id]) as string[];
  if(!existing.length)await write(selected+'-pool',proof.contracts.pools,'create_pool',[record.id]);
  record.pool=(await read(proof.contracts.pools,'get_source_pool_ids',[record.id]) as string[]).at(-1);
  await write(selected+'-release-listing',proof.contracts.challenges,'release_listing',[record.id]);
  record.final=JSON.parse(String(await read(proof.contracts.markets,'get_market',[record.id])));record.poolState=JSON.parse(String(await read(proof.contracts.pools,'get_pool',[record.pool])));save();return;
 }
 if(step==='musicplus-release-void') {
  const record=proof.markets[selected];if(!record)throw Error('Recorded voided listing required.');
  const source=JSON.parse(String(await read(proof.contracts.markets,'get_market',[record.id])));
  if(source.status!=='void')throw Error('Only an actual finalized void can use this release path.');
  const ids=await read(proof.contracts.pools,'get_source_pool_ids',[record.id]);if((ids as string[]).length)throw Error('Voided pre-stake identity must never have a pool.');
  await write(selected+'-release-void',proof.contracts.challenges,'release_listing',[record.id]);record.final=source;record.pool=null;save();return;
 }
 if(step==='musicplus-import-season') {
  const old=JSON.parse(readFileSync(proof.previousRelease,'utf8'));
  for(const key of ['renaissance','surrender','patina','pairing'])await write('season-previous-'+key,proof.contracts.seasons,'sync_previous_music',[old.markets[key].id,owner]);
  await write('season-film-barbie',proof.contracts.seasons,'sync_film',['barbie-network-demo',owner]);
  proof.season=JSON.parse(String(await read(proof.contracts.seasons,'get_track_record',[owner])));save();return;
 }
 if(step==='musicplus-collect-credit') {
  const credit=JSON.parse(String(await read(proof.contracts.challenges,'get_credit',[owner])));
  const attempt=(credit.withdrawal?.attempt??0)+1;
  const name='credit-claim-'+attempt;
  await write(name,proof.contracts.challenges,'claim',['challenge-credit',attempt]);
  await write('credit-verify-'+attempt,proof.contracts.challenges,'verify_claim',['challenge-credit',owner,proof.transactions[name]]);
  proof.credit=JSON.parse(String(await read(proof.contracts.challenges,'get_credit',[owner])));proof.balanceAfterPackage=String(await client.getBalance({address:owner}));save();return;
 }
 if(step==='musicplus-research-index-all') {
  for(const key of ['rules','rhino','andy']) {process.env.BULLSEYE_STEP='musicplus-research-index';process.env.BULLSEYE_MPLUS_CASE=key;await musicPlusDeploy(client);}
  return;
 }
 if(step==='musicplus-research-deploy') {await deploy('accessProbe','tests/fixtures/musicplus_access_probe.py',[]);return;}
 if(step==='musicplus-research-snapshot-deploy') {await deploy('accessProbeSnapshot','tests/fixtures/musicplus_access_probe.py',[]);return;}
 if(!proof.contracts.accessProbe)throw Error('Deploy the zero-GEN access probe first.');
 if(step==='musicplus-research-index') {
  if(!originals[selected])throw Error('Choose a verified official URL.');
  await write('index-'+selected,proof.contracts.accessProbe,'index',[selected,originals[selected]]);
  proof.research[selected]=JSON.parse(String(await read(proof.contracts.accessProbe,'get_result',[selected])));save();return;
 }
 if(step==='musicplus-research-snapshot') {
  const url=process.env.BULLSEYE_MPLUS_SNAPSHOT;
  if(!url||!/^https:\/\/web\.archive\.org\/web\/\d{14}id_\/https:\/\//.test(url))throw Error('Use a real CDX-discovered frozen id_ URL.');
  const name='snapshot-'+selected;
  const probe=proof.contracts.accessProbeSnapshot??proof.contracts.accessProbe;
  await write(name,probe,'snapshot',[name,url]);
  proof.research[name]=JSON.parse(String(await read(probe,'get_result',[name])));save();return;
 }
 throw Error('Unsupported Music+ step.');
}
