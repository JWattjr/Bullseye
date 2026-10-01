import {chromium,expect} from '@playwright/test';
import {join} from 'node:path';
const browser=await chromium.launch({executablePath:process.env.BULLSEYE_CHROME??join(process.env.LOCALAPPDATA??'','ms-playwright','chromium-1243','chrome-win64','chrome.exe')});
try{const page=await browser.newPage({viewport:{width:390,height:844}});await page.emulateMedia({reducedMotion:'reduce'});await page.goto((process.env.BULLSEYE_URL??'http://localhost:3100')+'/league');await expect(page.getByText('The leaderboard starts with proof.',{exact:true})).toBeVisible();await page.mouse.move(1,1);await page.screenshot({path:'.impeccable/review/mobile-league.png',fullPage:true});console.log('Mobile league recaptured in settled reduced-motion state.');}finally{await browser.close();}
