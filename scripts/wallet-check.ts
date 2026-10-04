import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {studionet} from 'genlayer-js/chains';
const base=process.env.BULLSEYE_URL??'http://localhost:3102';
const browser=await chromium.launch({headless:true,executablePath:process.env.BULLSEYE_CHROME??'C:/Users/User/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const folder='.impeccable/review/wallet';await mkdir(folder,{recursive:true});const checks:string[]=[];
try{
  for(const width of [320,390,1440]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();
    for(const route of ['/','/create','/predictions','/league','/rounds/barbie-practice','/rounds/barbie-practice/result']){await page.goto(base+route);await expect(page.getByRole('button',{name:'Connect wallet',exact:true})).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
    await page.goto(base+'/create');await page.getByRole('button',{name:'Connect wallet',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'MetaMask'})).toBeVisible();await page.screenshot({path:folder+'/'+width+'-missing-wallet.png',fullPage:true});await context.close();checks.push(width+': connection button on every route, no horizontal overflow, missing-wallet recovery');
  }
  const context=await browser.newContext({viewport:{width:1440,height:960}});const page=await context.newPage();const address='0x1111111111111111111111111111111111111111';
  // Raw browser code avoids capturing tsx's function-name helpers in this fixture.
  await page.addInitScript(`(()=>{const address=${JSON.stringify(address)};const chain=${JSON.stringify('0x'+studionet.id.toString(16))};let connected=false;const listeners={};Object.assign(window,{ethereum:{request:async({method})=>{if(method==='eth_accounts')return connected?[address]:[];if(method==='eth_requestAccounts'){if(sessionStorage.getItem('reject-wallet'))throw Object.assign(new Error('User rejected'),{code:4001});connected=true;return[address];}if(method==='eth_chainId')return chain;if(method==='wallet_getSnaps')return {'genlayer':{id:'npm:genlayer-wallet-plugin'}};throw new Error('Unexpected wallet call: '+method);},on:(event,listener)=>{listeners[event]=listener;},removeListener:(event)=>{delete listeners[event];}},testWalletAccounts:(accounts)=>listeners.accountsChanged?.(accounts)});})()`);
  await page.goto(base);await expect(page.getByRole('heading',{level:1})).toBeVisible();await page.evaluate(()=>sessionStorage.setItem('reject-wallet','yes'));await page.getByRole('button',{name:'Connect wallet',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Connection cancelled'})).toBeVisible();
  await page.evaluate(()=>sessionStorage.removeItem('reject-wallet'));await page.getByRole('button',{name:'Connect wallet',exact:true}).click();await expect(page.getByRole('button',{name:'Wallet connected: '+address,exact:true})).toBeVisible({timeout:30000});await page.screenshot({path:folder+'/desktop-connected.png',fullPage:true});
  await page.evaluate(()=>{(window as unknown as {testWalletAccounts:(accounts:string[])=>void}).testWalletAccounts([]);});await expect(page.getByRole('button',{name:'Connect wallet',exact:true})).toBeVisible();
  checks.push('Simulated EIP-1193 provider: rejection/retry, SDK StudioNet connection, watch address, connected label, account removal. No real signing or transaction.');
  await context.close();await writeFile('docs/wallet-ui-verification.json',JSON.stringify({base,verifiedAt:new Date().toISOString(),checks},null,2));console.log(checks.join('\n'));
}finally{await browser.close();}
