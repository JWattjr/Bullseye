import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
const base=process.env.BULLSEYE_URL??'http://localhost:3100';
const captureDirectory=process.env.BULLSEYE_CAPTURE_DIR??'.impeccable/review';
const verificationPath=process.env.BULLSEYE_VERIFICATION_PATH??'docs/browser-verification.json';
const cached=join(process.env.LOCALAPPDATA??'','ms-playwright','chromium-1243','chrome-win64','chrome.exe');
const browser=await chromium.launch({headless:true,...(process.env.BULLSEYE_CHROME?{executablePath:process.env.BULLSEYE_CHROME}:existsSync(cached)?{executablePath:cached}:{})});
await mkdir(captureDirectory,{recursive:true});const checks:string[]=[];
try{
for(const [name,viewport,chosen,points] of [['desktop',{width:1440,height:960},'$150m – under $200m','100'],['mobile',{width:390,height:844},'Under $100m','0']] as const){
  const context=await browser.newContext({viewport});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const capture=async(route:string,label:string)=>{await page.goto(base+route);await expect(page.getByRole('heading',{level:1})).toBeVisible();await expect(page.getByText('Loading the programme…')).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:captureDirectory+'/'+name+'-'+label+'.png',fullPage:true});};
  await capture('/','feed');await page.getByRole('link',{name:'Make your first call'}).click();await expect(page.getByRole('button',{name:'Confirm practice prediction'})).toBeDisabled();
  await page.getByRole('radio',{name:chosen,exact:true}).focus();await page.keyboard.press('Space');await expect(page.getByRole('radio',{name:chosen,exact:true})).toBeChecked();
  await page.screenshot({path:captureDirectory+'/'+name+'-round.png',fullPage:true});
  await page.getByRole('button',{name:'Confirm practice prediction'}).click();await expect(page.getByText('Your call is on the record.',{exact:true})).toBeVisible();await expect(page.locator('.result-points strong')).toHaveText(points);await expect(page.getByText('$162,022,044',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText('Your call is on the record.',{exact:true})).toBeVisible();await expect(page.locator('.result-points strong')).toHaveText(points);await page.getByText('Evidence & technical record',{exact:true}).click();await expect(page.getByText('Content hash',{exact:true})).toBeVisible();await page.screenshot({path:captureDirectory+'/'+name+'-result.png',fullPage:true});
  await capture('/predictions','predictions');await expect(page.getByText(points+' practice pts',{exact:true})).toBeVisible();await capture('/league','league');await expect(page.getByText('The leaderboard starts with proof.',{exact:true})).toBeVisible();
  await capture('/create','creator');await page.getByLabel('Film and release year').fill('Review Film (2027)');await page.getByLabel('Opening Friday (UTC)').fill('2027-01-08');await page.getByLabel('The Numbers film URL').fill('https://www.the-numbers.com/movie/Review-Film-(2027)');await page.getByRole('button',{name:'Save draft & check rules'}).click();await expect(page.getByText('Rule preview ready. GenLayer validation is still pending.',{exact:true})).toBeVisible();await page.reload();await expect(page.getByLabel('Film and release year')).toHaveValue('Review Film (2027)');
  await page.goto(base+'/');await page.getByRole('button',{name:'Run a rehearsal'}).click();await page.getByRole('radio',{name:'$30m – under $50m',exact:true}).check();await page.getByRole('button',{name:'Confirm practice prediction'}).click();await expect(page.getByText('Your call is on the record.',{exact:true})).toBeVisible();await expect(page.locator('.result-points strong')).toHaveText('100',{timeout:18000});await expect(page.getByText('$42,500,000',{exact:true})).toBeVisible();await page.screenshot({path:captureDirectory+'/'+name+'-rehearsal.png',fullPage:true});
  assertNoErrors(errors);checks.push(name+': responsive feed, keyboard selection, correct '+points+' score, reload persistence, evidence, empty rankings, draft persistence, accelerated rehearsal');await context.close();
}
const recovery=await browser.newContext();const page=await recovery.newPage();let fail=true;await page.route('**/api/league',async route=>{if(fail){fail=false;await route.fulfill({status:500,contentType:'application/json',body:'{}'});}else await route.continue();});await page.goto(base);await expect(page.getByRole('alert').filter({hasText:'could not load'})).toContainText('could not load');await page.getByRole('button',{name:'Retry loading'}).click();await expect(page.getByRole('heading',{name:'BIG SCREEN. BETTER CALLS.'})).toBeVisible();checks.push('Loading error and retry recovery (test-injected HTTP 500)');await recovery.close();
await writeFile(verificationPath,JSON.stringify({base,verifiedAt:new Date().toISOString(),checks},null,2));console.log(checks.join('\n'));
}finally{await browser.close();}
function assertNoErrors(errors:string[]){if(errors.length)throw new Error('Browser errors: '+errors.join('\n'));}
