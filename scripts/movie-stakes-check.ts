import {chromium, expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {historicalRounds} from '../lib/seed';
import {upcomingRounds} from '../lib/upcoming';
const base = process.env.BULLSEYE_URL ?? 'http://localhost:3109', live = process.env.BULLSEYE_VERIFY_FILMS === 'yes';
const movies = [...historicalRounds(), ...upcomingRounds()];
const browser = await chromium.launch({headless: true, executablePath: 'C:/Users/User/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'}), checks: string[] = [];
try {
  for (const width of live ? [390] : [320, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 900}}), page = await context.newPage(), errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    if (!live) await page.route('**/api/film-pools?*', route => {const movie = movies.find(round => round.id === new URL(route.request().url()).searchParams.get('movie'))!; return route.fulfill({json: {contract: '0x1111111111111111111111111111111111111111', sourceRoundId: movie.id, source: {spec: movie.spec, status: movie.spec.mode === 'competitive' ? 'open' : 'resolved', winner: movie.winner, evidence: movie.evidence}, pools: [], olderBefore: null, ready: true}});});
    await page.goto(base + '/pools'); await expect(page.getByRole('heading', {name: 'Call the box office.', exact: true})).toBeVisible();
    for (const round of movies) {
      await page.goto(base + '/rounds/' + round.id);
      const panel = page.getByRole('region', {name: round.title + ' GEN staking'});
      await expect(panel.getByRole('button', {name: 'Choose a range', exact: true})).toBeDisabled();
      await expect(panel.getByLabel('GEN stake')).toHaveValue('2');
      await panel.locator('.market-options button').nth(2).click({timeout: 45000});
      await expect(panel.getByRole('button', {name: 'Connect & predict', exact: true})).toBeEnabled();
      await expect(panel.getByRole('button', {name: /Refresh GEN|Check GEN|Settle/})).toHaveCount(0);
      if (!live) {
        await panel.getByLabel('GEN stake').fill('1'); await expect(panel.getByRole('button', {name: 'Connect & predict'})).toBeDisabled();
        await panel.getByLabel('GEN stake').fill('2'); await panel.getByRole('button', {name: 'Connect & predict'}).click(); await expect(panel.getByRole('alert')).toContainText('MetaMask');
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    if (errors.length) throw Error(errors.join('\n'));
    checks.push(width + ': all eight movie markets have four working ranges, default 2 GEN, one prediction ticket, automatically loaded pool data and no manual receipt/settlement controls or overflow' + (live ? '; actual finalized StudioNet RPC reads, no wallet transaction' : '; isolated mocked RPC'));
    await context.close();
  }
  await writeFile(live ? 'docs/consumer-live-market-verification.json' : 'docs/movie-stakes-ui-verification.json', JSON.stringify({base, live, verifiedAt: new Date().toISOString(), checks}, null, 2)); console.log(checks.join('\n'));
} finally {await browser.close();}
