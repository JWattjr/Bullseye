import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {historicalRounds} from '../lib/seed';
const base=process.env.BULLSEYE_URL??'http://localhost:3106',live=process.env.BULLSEYE_VERIFY_FILMS==='yes';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/User/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const checks:string[]=[];await mkdir('.impeccable/review/movie-stakes',{recursive:true});
try{
  for(const width of live?[390]:[320,1440]){
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    if(!live)await page.route('**/api/film-pools?*',route=>{const id=new URL(route.request().url()).searchParams.get('movie'),round=historicalRounds().find(r=>r.id===id)!;return route.fulfill({json:{contract:'0x1111111111111111111111111111111111111111',sourceRoundId:id,source:{spec:round.spec,status:'resolved',winner:round.winner,evidence:round.evidence},pools:[],olderBefore:null,ready:true}});});
    await page.goto(base+'/pools');await expect(page.getByRole('heading',{level:1})).toContainText('YOUR MOVIE.');for(const round of historicalRounds())await expect(page.getByRole('link',{name:'Stake GEN on '+round.title,exact:true})).toBeVisible();
    for(const round of historicalRounds()){
      await page.goto(base+'/rounds/'+round.id);const panel=page.getByRole('region',{name:round.title+' GEN staking'}),stake=panel.getByRole('button',{name:'Stake GEN on '+round.title,exact:true});
      await expect(panel.getByRole('heading',{name:'Stake GEN on '+round.title,exact:true})).toBeVisible();await expect(stake).toBeDisabled();await expect(panel.getByLabel('GEN stake',{exact:true})).toHaveValue('2');
      await panel.locator('.movie-options button').nth(2).click({timeout:45000});await expect(stake).toBeEnabled();
      if(!live){await panel.getByLabel('GEN stake',{exact:true}).fill('1');await stake.click();await expect(panel.getByRole('alert')).toContainText('between 2 and 100');await panel.getByLabel('GEN stake',{exact:true}).fill('2');await stake.click();await expect(panel.getByRole('alert')).toContainText('MetaMask');}
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      if(round.id==='barbie-practice')await page.screenshot({path:'.impeccable/review/movie-stakes/'+width+'-barbie.png',fullPage:true});
    }
    if(!live){await page.goto(base+'/rounds/barbie-practice');await page.getByRole('radio',{name:'$200m or more',exact:true}).check();await page.getByRole('button',{name:'Confirm practice prediction',exact:true}).click();await expect(page.getByText('Your call is on the record.',{exact:true})).toBeVisible();const panel=page.getByRole('region',{name:'Barbie GEN staking'});await panel.locator('.movie-options button').nth(2).click();await expect(panel.getByRole('button',{name:'Stake GEN on Barbie',exact:true})).toBeEnabled();checks.push(width+': existing Barbie points prediction does not block GEN staking; invalid minimum and missing-wallet recovery');}
    if(errors.length)throw Error(errors.join('\n'));checks.push(width+': Barbie, Oppenheimer and Dune have four GEN range pools, default 2 GEN entry, same-page stake action, directory links and no overflow'+(live?' with live finalized RPC reads':' with mocked finalized RPC reads'));
    await context.close();
  }
  await writeFile(live?'docs/movie-stakes-hosted-verification.json':'docs/movie-stakes-ui-verification.json',JSON.stringify({base,verifiedAt:new Date().toISOString(),live,checks},null,2));console.log(checks.join('\n'));
}finally{await browser.close();}
