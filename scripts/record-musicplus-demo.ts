/** Real production browser recording. No wallet injection or mocked network. */
import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const base='https://bullseye-genlayer.vercel.app';
const proof=JSON.parse(await readFile('docs/proofs/musicplus-2026-10-14/manifest.json','utf8'));
assert.ok(proof.markets.andy?.pool&&proof.markets.amended?.ruling?.ruling?.verdict==='AMENDED','actual live pool and amended bonded proof required');
const cache=join(process.env.LOCALAPPDATA??'','ms-playwright');
const executable=join(cache,'chromium-1243/chrome-win64/chrome.exe');
const ffmpeg=process.env.BULLSEYE_FFMPEG??execFileSync('py',['-3.14','-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
assert.ok(existsSync(ffmpeg),'Full ffmpeg binary required for video chapter concatenation');
const folder=resolve('docs/media'),scratch=resolve('.data/musicplus-video');await mkdir(folder,{recursive:true});await mkdir(scratch,{recursive:true});
const browser=await chromium.launch({headless:true,...(existsSync(executable)?{executablePath:executable}:{})});
const warm=await browser.newContext({viewport:{width:1440,height:900}}),warmPage=await warm.newPage();
const routes=['/music','/music/'+proof.markets.andy.id,'/music/'+proof.markets.amended.id,'/music/previous/renaissance-music-proof','/music/previous/funded-music-proof','/season','/music/propose'];
try {
 const registry=await (await warm.request.get(base+'/music-proof.json')).json();assert.equal(registry.contracts.challenges.toLowerCase(),proof.contracts.challenges.toLowerCase());
 for(const route of routes){await warmPage.goto(base+route);await expect(warmPage.locator('main h1')).toBeVisible();if(!route.endsWith('/propose')){await expect(warmPage.getByText(/Loading (live music|the music|finalized season)/)).toHaveCount(0,{timeout:90000});}await warmPage.evaluate(()=>document.fonts.ready);}
 await warm.close();
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:scratch,size:{width:1440,height:900}},timezoneId:'UTC',reducedMotion:'reduce'}),page=await context.newPage();
 const video=page.video()!;const origin=Date.now(),chapters:{caption:string;start:number;duration:number}[]=[];
 const caption=async(text:string)=>page.evaluate(value=>{document.getElementById('demo-caption')?.remove();const el=document.createElement('div');el.id='demo-caption';el.textContent=value;el.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#242424;color:#fff;padding:16px 40px;font:500 20px/1.4 "DM Sans",sans-serif;text-align:center;pointer-events:none';document.body.append(el);},text);
 const shot=async(text:string,duration:number,interact?:()=>Promise<void>)=>{await caption(text);const start=Date.now();chapters.push({caption:text,start:(start-origin)/1000,duration});if(interact)await interact();await page.waitForTimeout(Math.max(0,duration*1000-(Date.now()-start)));};
 const visit=async(route:string)=>{await page.goto(base+route);await expect(page.locator('main h1')).toBeVisible();await expect(page.getByText(/Loading (live music|the music|finalized season)/)).toHaveCount(0,{timeout:90000});await page.evaluate(()=>document.fonts.ready);};
 await visit('/music');await expect(page.locator('.album-market').filter({hasText:'Big Stupid Heart'})).toContainText('Live — settles');await shot('Bullseye Music: real upcoming albums, unknown outcomes, simulated StudioNet GEN.',10);
 await visit('/music/'+proof.markets.andy.id);await shot('Choose a chart range; your wallet confirms GEN stakes. No new stake is sent here, and the future result is unknown.',10,async()=>{await page.waitForTimeout(1000);await page.locator('.music-options button').nth(1).click();});
 await visit('/music/propose');await shot('A plain-English question starts compilation. This exact proposal was compiled earlier; no new deposit is sent in this recording.',11,async()=>{await page.getByLabel('Your question',{exact:true}).pressSequentially(proof.markets.andy.question,{delay:12});});
 await visit('/music/'+proof.markets.andy.id);await page.getByText('How this settles',{exact:true}).click();await page.getByText('View compiled specification',{exact:true}).click();await page.locator('.music-rules pre').scrollIntoViewIfNeeded();await shot('The actual finalized specification freezes the album, chart week, entry cutoff and outcomes.',11);
 await visit('/music/'+proof.markets.amended.id);const review=page.locator('.music-review-disclosure');if(!await review.evaluate(element=>(element as HTMLDetailsElement).open))await review.locator('summary').first().click();await expect(page.getByText('AMENDED',{exact:true})).toBeVisible();await page.locator('.music-verdict').scrollIntoViewIfNeeded();await shot('A bonded challenge corrected the wrong chart week using a code-generated option. Validators independently checked both frozen sources.',12);
 await page.getByRole('heading',{name:'Quoted rule'}).scrollIntoViewIfNeeded();await shot('The ruling retains exact rule and release quotations. The approved week is August 13, 2022.',12);
 await visit('/music/previous/renaissance-music-proof');await page.locator('.music-result').scrollIntoViewIfNeeded();await shot('Previous release: Renaissance resolved #1 from an archived complete 200-row chart, with its matched row and snapshot.',12);
 await visit('/music/previous/funded-music-proof');await page.getByRole('heading',{name:'Collected pool payouts'}).scrollIntoViewIfNeeded();await shot('The existing 0.01 GEN pool claim was collected. Its finalized claim and exact credited native transfer are linked here; no new claim is broadcast.',12);
 await visit('/season');await page.getByRole('button',{name:'Historical exhibition',exact:true}).click();await shot('Film and Music predictions share a season. Known historical results remain separate from competitive forecasts.',12);
 await context.close();const raw=await video.path();
 const clips:string[]=[];
 for(const [index,chapter] of chapters.entries()){const clip=join(scratch,'chapter-'+index+'.webm');execFileSync(ffmpeg,['-y','-ss',String(chapter.start),'-i',raw,'-t',String(chapter.duration),'-an','-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','6','-b:v','1200k',clip],{stdio:'pipe'});clips.push(clip);}
 const list=join(scratch,'chapters.txt');await writeFile(list,clips.map(path=>"file '"+path.replaceAll('\\','/').replaceAll("'","'\\''")+"'").join('\n')+'\n');
 const destination=join(folder,'bullseye-musicplus-2026-10-14.webm'),temp=join(scratch,'edited.webm');execFileSync(ffmpeg,['-y','-f','concat','-safe','0','-i',list,'-c','copy',temp],{stdio:'pipe'});await rename(temp,destination);
 const inspection=spawnSync(ffmpeg,['-i',destination],{encoding:'utf8'}).stderr;
 const duration=inspection.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);assert.ok(duration,'actual video duration required');const seconds=Number(duration[1])*3600+Number(duration[2])*60+Number(duration[3]);assert.ok(seconds<150);assert.match(inspection,/1440x900/);
 await writeFile(join(folder,'bullseye-musicplus-2026-10-14.json'),JSON.stringify({recordedAt:new Date().toISOString(),url:base,viewport:{width:1440,height:900},walletInjected:false,mockedNetwork:false,newBroadcasts:false,chapters,actualDurationSeconds:seconds,sourceCommit:proof.sourceCommit},null,2)+'\n');
 console.log(destination);
} finally {await browser.close();}
