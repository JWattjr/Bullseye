import {chromium, expect} from '@playwright/test';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import type {MusicMarket, MusicPool} from '../lib/music';
const base=process.env.BULLSEYE_URL??'http://localhost:3101';
const folder='.impeccable/review/music'; await mkdir(folder,{recursive:true});
const cached=join(process.env.LOCALAPPDATA??'','ms-playwright/chromium-1243/chrome-win64/chrome.exe');
const browser=await chromium.launch({headless:true,...(existsSync(cached)?{executablePath:cached}:{})});
const controlledOnly=process.env.BULLSEYE_CONTROLLED_ONLY==='1';
const capture=process.env.BULLSEYE_SKIP_CAPTURE!=='1';
const checks:string[]=[]; const wallet='0x1111111111111111111111111111111111111111';
const proof=JSON.parse(await readFile('public/music-previous-proof.json','utf8'));
const source:MusicMarket={...proof.markets.renaissance.state,id:proof.markets.renaissance.id};
try {
for(const [label,viewport] of [['desktop',{width:1440,height:960}],['mobile',{width:390,height:844}]] as const) {
 const context=await browser.newContext({viewport,reducedMotion:'reduce',timezoneId:'UTC'}), page=await context.newPage(), errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(!controlledOnly) for(const [route,name,ready] of [['/music','directory','Call the charts.'],['/music/renaissance-music-proof','result','Renaissance'],['/music/patina-music-proof','absence','Patina'],['/music/funded-music-proof','funded','Renaissance'],['/music/pairing-music-proof','pairing-result','Renaissance vs Surrender'],['/music/ambiguous-music-proof','rejection','Music question'],['/music/propose','proposal','Write the next chart call.'],['/season','season','Every call counts.']]) {
  const loaded=page.waitForResponse(response=>response.url().includes('/api/music')&&response.status()===200); await page.goto(base+route); await loaded; await page.evaluate(()=>document.fonts.ready); await expect(page.getByRole('heading',{name:ready,exact:true,level:1})).toBeVisible({timeout:45000});
  if(name==='directory') await expect(page.locator('.album-market')).not.toHaveCount(0,{timeout:45000});
  if(name==='result') {await expect(page.getByText('The chart is in.',{exact:true})).toBeVisible(); await page.getByText('How this settles',{exact:true}).click(); await expect(page.getByText('Rows SHA-256:',{exact:false})).toBeVisible();await expect(page.getByRole('link',{name:'Resolution transaction',exact:true})).toHaveAttribute('href','https://explorer-studio.genlayer.com/tx/'+proof.transactions['renaissance-resolve']);}
  if(name==='absence') {await expect(page.getByText('The chart is in.',{exact:true})).toBeVisible();await expect(page.getByText('Did not appear in the complete 200-row chart.',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Resolution transaction',exact:true})).toHaveAttribute('href','https://explorer-studio.genlayer.com/tx/'+proof.transactions['patina-resolve']);}
  if(name==='funded') {await expect(page.getByText('The chart is in.',{exact:true})).toBeVisible();await expect(page.getByText('0.01 GEN pooled',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Resolution transaction',exact:true})).toHaveAttribute('href','https://explorer-studio.genlayer.com/tx/'+proof.transactions['funded-resolve']);}
  if(name==='pairing-result') {await expect(page.getByText('The chart is in.',{exact:true})).toBeVisible();await expect(page.locator('.matched-album')).toHaveCount(2);await expect(page.getByRole('link',{name:'Resolution transaction',exact:true})).toHaveAttribute('href','https://explorer-studio.genlayer.com/tx/'+proof.transactions['pairing-resolve']);}
  if(name==='rejection') await expect(page.getByRole('heading',{name:'Question needs more detail',exact:true})).toBeVisible();
  if(name==='season') {await expect(page.getByText('Loading finalized season standings…',{exact:true})).toHaveCount(0,{timeout:45000});await page.getByRole('button',{name:'Historical exhibition',exact:true}).click();}
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(capture) await page.screenshot({path:folder+'/'+label+'-'+name+'.png',fullPage:true});
 }
 assert.deepEqual(errors,[]); if(!controlledOnly) checks.push(label+': actual StudioNet directory, finalized archive result/spec, proposal, combined Film/Music season, no overflow or console errors'); await context.close();
 // Controlled transport exercises wallet UX with the real SDK and no broadcast.
 const fixture=await browser.newContext({viewport,reducedMotion:'reduce',timezoneId:'UTC'}), p=await fixture.newPage();
 const transactions:{value:string}[]=[]; let market:MusicMarket={...source,id:'ui-music-test',status:'open',evidence:null,winner:null,spec:{...source.spec!,entry_deadline:Math.floor(Date.now()/1000)+3600}};
 const poolHolder:{current?:MusicPool}={}; let receiptState='accepted', children:{hash:string;state:string;value:string}[]=[];
 await p.exposeFunction('musicTestSend',(tx:{value:string})=>{transactions.push(tx);return '0x'+String(transactions.length).padStart(64,'a');});
 await p.addInitScript(`window.ethereum={request:async({method,params})=>{if(method==='eth_accounts'||method==='eth_requestAccounts')return ['${wallet}'];if(method==='eth_chainId')return '0xf22f';if(method==='wallet_getSnaps')return {genlayer:{id:'npm:genlayer-wallet-plugin'}};if(method==='eth_sendTransaction')return window.musicTestSend(params[0]);throw Error('Unexpected provider '+method);},on:()=>{},removeListener:()=>{}};`);
 await p.route('https://studio.genlayer.com/api',route=>{const b=route.request().postDataJSON();const result=b.method==='eth_getTransactionCount'?'0x0':b.method==='eth_estimateGas'?'0x30d40':b.method==='eth_gasPrice'?'0x0':null;assert.notEqual(result,null);return route.fulfill({json:{jsonrpc:'2.0',id:b.id,result}});});
 await p.route('**/api/wallet?*',r=>r.fulfill({json:{balance:'1000000000000000000'}}));
 await p.route('**/api/music**',r=>{const pool=poolHolder.current;const q=new URL(r.request().url()).searchParams;if(r.request().method()==='POST')return r.fulfill({json:{state:'waiting'}});if(q.has('receipt'))return r.fulfill({json:{sender:wallet,state:receiptState,status:receiptState==='accepted'?'ACCEPTED':'FINALIZED',children}});return r.fulfill({json:{contracts:proof.contracts,markets:[market],market:q.has('id')?{...market,id:q.get('id')}:undefined,pools:pool?[pool]:[],serverTime:Math.floor(Date.now()/1000)}});});
 await p.goto(base+'/music/ui-music-test'); await expect(p.getByRole('button',{name:/Stake 0.01 GEN/})).toBeDisabled();
 await p.locator('.music-options button').first().focus(); await p.keyboard.press('Space');
 await p.getByLabel('Your stake',{exact:true}).fill('0.001'); await expect(p.getByRole('button',{name:/Stake 0.001 GEN/})).toBeDisabled();
 await p.getByLabel('Your stake',{exact:true}).fill('0.01');
 await p.getByRole('button',{name:'Or make a free points prediction'}).click();await p.getByLabel('Exact rank (optional)').fill('12');await expect(p.getByRole('button',{name:'Save free prediction'})).toBeDisabled();
 await p.getByLabel('Exact rank (optional)').fill('1');await expect(p.getByRole('button',{name:'Save free prediction'})).toBeEnabled();
 if(!controlledOnly && capture) await p.screenshot({path:folder+'/'+label+'-ticket.png',fullPage:true});
 await p.getByRole('button',{name:/Stake 0.01 GEN/}).click();await expect(p.getByText('Submitted to StudioNet',{exact:true})).toBeVisible();assert.equal(BigInt(transactions[0].value),10n**16n);
 await p.reload();await expect(p.getByText('Accepted · awaiting finality',{exact:true})).toBeVisible({timeout:20000});await expect(p.getByRole('button',{name:'Transaction pending…'})).toBeDisabled();
 receiptState='finalized-error';await expect(p.getByText('Transaction failed',{exact:true})).toBeVisible({timeout:20000});
 await p.evaluate(()=>localStorage.clear());
 market={...market,question:'Did Renaissance by Beyonce debut higher than Surrender by Maggie Rogers on the Billboard 200 chart dated August 13, 2022?',spec:{...market.spec!,market_type:'head_to_head',albums:[market.spec!.albums[0],{title:'Surrender',artist:'Maggie Rogers',chart_week:'2022-08-13',aliases:[],identity_rule:'combined_standard_deluxe'}],bins:['A','B']},histogram:[0,0]};
 await p.reload();await expect(p.getByRole('heading',{name:'Who debuts higher?'})).toBeVisible(); await p.locator('.music-options button').nth(1).click();await expect(p.locator('.ticket-selection')).toHaveText('Surrender');
 if(!controlledOnly && capture) await p.screenshot({path:folder+'/'+label+'-pairing.png',fullPage:true});

 await p.evaluate(()=>localStorage.clear());await p.goto(base+'/music/propose');
 await p.getByLabel('Your question',{exact:true}).fill('Where did Renaissance by Beyonce debut August 13, 2022?');
 await p.getByLabel('Entries close · your local time').fill('2020-01-01T12:00');await p.getByLabel('Resolution deadline · your local time').fill('2020-01-02T12:00');
 await p.getByRole('button',{name:'Compile my question'}).click();await expect(p.getByRole('alert').filter({hasText:'full review window'})).toContainText('full review window plus one minute');
 const date=(seconds:number)=>new Date(Date.now()+seconds*1000).toISOString().slice(0,16);
 await p.getByLabel('Entries close · your local time').fill(date(3600));await p.getByLabel('Resolution deadline · your local time').fill(date(7200));
 market={...source,id:'proposal',status:'compiled'};receiptState='finalized-success';
 await p.getByRole('button',{name:'Compile my question'}).click();await expect(p.getByRole('heading',{name:'Review your compiled market'})).toBeVisible({timeout:20000});
 await p.reload();await expect(p.getByRole('heading',{name:'Review your compiled market'})).toBeVisible({timeout:20000});await expect(p.getByRole('button',{name:'Open this market'})).toBeEnabled({timeout:20000});
 await p.getByRole('button',{name:'Open this market'}).click();await expect.poll(()=>transactions.length).toBe(3);await expect(p.getByText('Submitted to StudioNet',{exact:true})).toBeVisible();assert.equal(BigInt(transactions.at(-1)!.value),0n);
 await p.evaluate(()=>localStorage.clear());await p.goto(base+'/music/propose');
 await p.getByLabel('Your question',{exact:true}).fill('Where will Taylor Swift next album debut?');
 await p.getByLabel('Entries close · your local time').fill(date(3600));await p.getByLabel('Resolution deadline · your local time').fill(date(7200));
 market={...market,status:'rejected',spec:null,rejection_reason:'Name the exact album and chart week.'};
 await p.getByRole('button',{name:'Compile my question'}).click();await expect(p.getByText('Name the exact album and chart week.',{exact:true})).toBeVisible({timeout:20000});
 await p.getByRole('button',{name:'Edit the question'}).click();await expect(p.getByLabel('Your question',{exact:true})).toBeVisible();

 await p.evaluate(()=>localStorage.clear());
 market={...source,id:'ui-music-test',status:'resolved'};
 const pool:MusicPool={id:'ui-pool',source_round_id:market.id,status:'resolved',specification_hash:market.specification_hash,entry_deadline:1,refund_deadline:2,total:'10000000000000000',pools:['10000000000000000','0','0','0','0','0'],participants:[wallet],entries:{[wallet]:{range:0,stake:'10000000000000000'}},claims:{},claim_attempts:{[wallet]:{attempt:1,amount:'10000000000000000',status:'failed'}},winner:0};
 poolHolder.current=pool;
 await p.goto(base+'/music/ui-music-test');await expect(p.getByRole('button',{name:/Retry collection/})).toBeEnabled();
 children=[{hash:'0x'+'b'.repeat(64),state:'pending',value:'10000000000000000'}];
 await p.getByRole('button',{name:/Retry collection/}).click();await expect.poll(()=>transactions.length).toBe(5);await expect(p.getByText('Submitted to StudioNet',{exact:true})).toBeVisible();
 pool.claim_attempts[wallet].status='pending';await p.reload();
 await expect(p.getByText('Collection requested. We are verifying the native transfer.',{exact:true})).toBeVisible({timeout:20000});await expect(p.getByRole('button',{name:/Collect|Retry collection/})).toHaveCount(0);
 children[0].state='credited';pool.claims[wallet]='10000000000000000';pool.claim_attempts[wallet].status='paid';
 await expect(p.getByText('Native GEN credit confirmed. Your wallet balance updates automatically.',{exact:true})).toBeVisible({timeout:20000});await expect(p.getByText('Native payout verified and received.',{exact:true})).toBeVisible();
 checks.push(label+': controlled failed-transfer retry, pending native credit reservation, reload and confirmed-credit display');
 assert.equal(transactions.length,5);assert.ok(transactions.slice(1).every(tx=>BigInt(tx.value)===0n));
 checks.push(label+': controlled proposal date validation, compiled preview, reload restoration, zero-GEN opening and rejected-question editing');
 checks.push(label+': controlled SDK 0.01 GEN request (not broadcast), keyboard bins, bounds, exact rank validation, reload persistence, provisional/failure states and head-to-head ticket');
 await fixture.close();
}
await writeFile(controlledOnly?'.data/music-controlled-verification.json':'docs/proofs/music-2026-10-12-release-v2/browser-verification.json',JSON.stringify({base,verifiedAt:new Date().toISOString(),contracts:proof.contracts,sourceCommit:proof.sourceCommit,screenshotsCaptured:capture&&!controlledOnly,checks,controlledTransport:'Wallet tests use isolated provider/RPC fixtures. No wallet transaction is broadcast.'},null,2)+'\n'); console.log(checks.join('\n'));
} finally {await browser.close();}
