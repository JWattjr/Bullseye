/** Actual API/on-chain reads and full-page browser evidence; never injects a wallet. */
import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const base=process.env.BULLSEYE_URL??'http://localhost:3101';
const routePause=Math.max(15000,Number(process.env.BULLSEYE_BROWSER_PAUSE_MS??15000));
const proof=JSON.parse(await readFile('docs/proofs/musicplus-2026-10-14/manifest.json','utf8'));
const capture=process.env.BULLSEYE_SKIP_CAPTURE!=='1',round=process.env.BULLSEYE_CAPTURE_ROUND??'1';
const folder='.impeccable/review/musicplus/round-'+round;await mkdir(folder,{recursive:true});
assert.ok(proof.markets.andy?.pool&&proof.markets.bernie?.pool,'two actual upcoming GEN pools required');
const executable=join(process.env.LOCALAPPDATA??'','ms-playwright/chromium-1243/chrome-win64/chrome.exe');
const browser=await chromium.launch({headless:true,...(existsSync(executable)?{executablePath:executable}:{})});
const checks:string[]=[],screenshots:string[]=[];
try {
 for(const [label,viewport] of [['desktop',{width:1440,height:960}],['mobile',{width:390,height:844}]] as const){
  const context=await browser.newContext({viewport,reducedMotion:'reduce',timezoneId:'UTC'}),page=await context.newPage(),errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  const registry=await (await context.request.get(base+'/music-proof.json')).json();assert.equal(registry.contracts.challenges.toLowerCase(),proof.contracts.challenges.toLowerCase());
  for(const [name,route] of [['directory','/music'],['live','/music/'+proof.markets.andy.id],['amended','/music/'+proof.markets.amended.id],['voided','/music/'+proof.markets.voided.id],['proposal','/music/propose'],['previous','/music/previous'],['paid','/music/previous/funded-music-proof'],['season','/season']]){
   const api=page.waitForResponse(response=>response.url().includes('/api/music')&&response.request().method()==='GET'&&response.status()===200,{timeout:90000});
   await page.goto(base+route);const snapshot=await (await api).json();await page.evaluate(()=>document.fonts.ready);await expect(page.locator('main h1')).toBeVisible();
   if(name==='directory'){
    assert.ok(snapshot.markets.filter((item:{spec:{historical:boolean};status:string})=>item.spec&&!item.spec.historical&&item.status==='open').length>=2);
    await expect(page.getByRole('link',{name:'Previous release · results & payouts'})).toHaveAttribute('href','/music/previous');
    await expect(page.locator('.album-market').filter({hasText:'Big Stupid Heart'})).toContainText('Live — settles');
    await expect(page.locator('.album-market').filter({hasText:'The Sea Has No Mercy'})).toContainText('Live — settles');
   }
   if(name==='live'){assert.equal(snapshot.market.status,'open');assert.equal(snapshot.market.evidence,null);assert.equal(snapshot.pools[0].status,'open');await expect(page.getByRole('button',{name:'Connect & stake'})).toBeDisabled();await page.locator('.music-options button').first().click();await expect(page.getByRole('button',{name:'Connect & stake'})).toBeEnabled();}
   if(name==='amended'||name==='voided'){
    const item=snapshot.challenges.find((item:{ruling?:{verdict:string}})=>item.ruling?.verdict===name.toUpperCase());assert.ok(item);assert.equal(item.fallback,false);assert.ok(item.ruling.rule_quote.length>=20&&item.ruling.evidence_quote.length>=20);
    const detail=page.locator('.music-review-disclosure');if(!await detail.evaluate(element=>(element as HTMLDetailsElement).open))await detail.locator('summary').first().click();
    await expect(page.getByText(name.toUpperCase(),{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Quoted rule'})).toBeVisible();
    if(name==='amended')assert.equal(snapshot.market.spec.albums[0].chart_week,'2022-08-13');else {assert.equal(snapshot.market.status,'void');await expect(page.getByRole('button',{name:/Stake .*GEN/})).toHaveCount(0);}
   }
   if(name==='proposal'){await expect(page.getByRole('button',{name:'List & compile · 0.004 GEN'})).toBeDisabled();await expect(page.getByText('Review window: 10 minutes for this demo; production default 24 hours.',{exact:false})).toBeVisible();}
   if(name==='previous'){assert.equal(snapshot.previous,true);await expect(page.getByRole('heading',{name:'Previous Music release',exact:true})).toBeVisible();}
   if(name==='paid'){assert.equal(snapshot.previous,true);assert.equal(snapshot.pools[0].claims['0xdb433ff614bdd1ece21aa97221c3e0a7ecf79c92'],'10000000000000000');await expect(page.getByRole('heading',{name:'Collected pool payouts'})).toBeVisible();await expect(page.getByRole('region',{name:'Verified native payouts'}).getByRole('link',{name:'Native payout receipt',exact:true})).toHaveAttribute('href','https://explorer-studio.genlayer.com/tx/0x0bc2af19984065e50c0391cd8e086443857a72fa72eb18419b4a73bca3787ecf');}
   if(name==='season'){await expect(page.getByText('Loading finalized season standings…')).toHaveCount(0,{timeout:90000});await page.getByRole('button',{name:'Historical exhibition',exact:true}).click();}
   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.evaluate(()=>window.scrollTo(0,0));await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
   if(capture){const path=folder+'/'+label+'-'+name+'.png';if(!existsSync(path))await page.screenshot({path,fullPage:true});screenshots.push(path);}
   checks.push(label+': actual '+name+' API state, accessible controls, finalized quotes/credit where applicable, no overflow');
   console.log(checks.at(-1));
   await page.goto('about:blank'); // Stop the app's live polling during the RPC cooldown.
   await page.waitForTimeout(routePause); // Bound aggregate cold RPC reads below the network bucket.
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 await writeFile('docs/proofs/musicplus-2026-10-14/browser-live.json',JSON.stringify({verifiedAt:new Date().toISOString(),url:base,walletInjected:false,mockedNetwork:false,contracts:proof.contracts,checks,screenshots},null,2)+'\n');console.log(checks.join('\n'));
}finally{await browser.close();}
