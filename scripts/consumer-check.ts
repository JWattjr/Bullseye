import {chromium, expect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {studionet} from 'genlayer-js/chains';
import {historicalRounds} from '../lib/seed';
import {upcomingRounds} from '../lib/upcoming';
import type {FilmPool} from '../lib/film-market';

const base = process.env.BULLSEYE_URL ?? 'http://localhost:3109';
const browser = await chromium.launch({headless: true, executablePath: 'C:/Users/User/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const checks: string[] = [], movies = [...historicalRounds(), ...upcomingRounds()], a = '0x1111111111111111111111111111111111111111', b = '0x2222222222222222222222222222222222222222', contract = '0x3333333333333333333333333333333333333333';
const folder = '.impeccable/review/consumer'; await mkdir(folder, {recursive: true});
try {
  for (const width of [320, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 950}, reducedMotion: 'reduce'}), page = await context.newPage(), errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/film-pools?*', route => {const movie = movies.find(r => r.id === new URL(route.request().url()).searchParams.get('movie'))!; return route.fulfill({json: {contract, sourceRoundId: movie.id, source: {status: movie.spec.mode === 'competitive' ? 'open' : 'resolved', spec: movie.spec, winner: movie.winner, evidence: movie.evidence}, pools: [], olderBefore: null, ready: true}});});
    await page.goto(base);
    await expect(page.getByRole('heading', {name: 'Call the box office.', exact: true})).toBeVisible();
    await expect(page.locator('.movie-market-card')).toHaveCount(5);
    await page.getByRole('searchbox', {name: 'Search movies'}).fill('dune'); await expect(page.locator('.movie-market-card')).toHaveCount(1);
    await page.getByRole('searchbox', {name: 'Search movies'}).fill('missing'); await expect(page.getByText('No movies found', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Show all markets'}).click(); await expect(page.locator('.movie-market-card')).toHaveCount(8);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: folder + '/' + width + '-markets.png', fullPage: true});
    await page.getByRole('button', {name: 'Practice', exact: true}).click(); await expect(page.locator('.movie-market-card')).toHaveCount(3);
    await page.locator('.movie-market-card').first().getByRole('link', {name: /\$150m – under \$200m/}).click();
    const region = page.getByRole('region', {name: 'Barbie GEN staking'});
    await expect(region.locator('.market-options button[aria-pressed=true]')).toContainText('$150m – under $200m');
    await expect(region.getByRole('button', {name: 'Connect & predict', exact: true})).toBeEnabled();
    await expect(page.getByRole('button', {name: /Refresh GEN|Check GEN|Settle/})).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Confirm practice prediction', exact: true})).not.toBeVisible();
    await region.getByLabel('GEN stake', {exact: true}).fill('1'); await expect(region.getByRole('button', {name: 'Connect & predict'})).toBeDisabled();
    await region.getByRole('button', {name: 'Set stake to 5 GEN'}).click(); await expect(region.getByLabel('GEN stake')).toHaveValue('5');
    await region.getByRole('button', {name: 'Connect & predict'}).click(); await expect(region.getByRole('alert')).toContainText('MetaMask');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: folder + '/' + width + '-ticket.png', fullPage: true});
    await page.getByText('Play for free points', {exact: true}).click(); await page.getByRole('radio', {name: '$150m – under $200m', exact: true}).check(); await page.getByRole('button', {name: 'Confirm practice prediction', exact: true}).click();
    await page.getByText('Play for free points', {exact: true}).click(); await expect(page.locator('.result-points strong')).toHaveText('100');
    await page.goto(base + '/rounds/street-fighter-2026?range=1#prediction');
    const upcoming = page.getByRole('region', {name: 'Street Fighter GEN staking'});
    await expect(upcoming.locator('.market-options button[aria-pressed=true]')).toContainText('$25m');
    await expect(upcoming.getByRole('button', {name: 'Connect & predict'})).toBeEnabled();
    await expect(page.getByText('Play for free points', {exact: true})).toHaveCount(0);
    await expect(upcoming).toContainText('Entries close');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: folder + '/' + width + '-upcoming.png', fullPage: true});
    assert.deepEqual(errors, []); checks.push(width + ': five upcoming and three practice markets, filters/search/empty recovery, upcoming cutoff, direct range selection, single GEN ticket, stake presets and bounds, wallet recovery, secondary historical free practice, no manual transaction/settlement buttons or overflow');
    await context.close();
  }

  // Isolated provider and RPC fixtures exercise the real SDK without broadcasting
  // a transaction or accessing a user's wallet or funds.
  const context = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'}), page = await context.newPage();
  let phase = 'empty', closeAt = 0, settleAt = 0, claimReads = 0, autoCalls = 0, futureEntered = false, closeFuture = false;
  const future = upcomingRounds()[0];
  const transactions: {from: string; to: string; value: string; data: string}[] = [];
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const pool = (): FilmPool => ({id: 'barbie-network-demo-pool-999', source_round_id: 'barbie-network-demo', reference_winner: 2, reference_value: 162022044, title: 'Barbie', status: phase === 'open' ? 'open' : phase === 'resolving' ? 'resolved_pending_finality' : 'resolved', entry_deadline: closeAt, observation_time: closeAt, resolution_deadline: closeAt + 600, pools: ['2000000000000000000', '0', '2000000000000000000', '0'], total: '4000000000000000000', minimum: '2000000000000000000', maximum: '100000000000000000000', entries: {[a]: {range: 2, stake: '2000000000000000000'}, [b]: {range: 0, stake: '2000000000000000000'}}, participants: [a, b], claims: phase.startsWith('claim') || phase === 'credited' ? {[a]: '4000000000000000000'} : {}, winner: ['open', 'resolving'].includes(phase) ? null : 2, fixture: ''});
  const upcomingPool = (): FilmPool => ({...pool(), id: future.id + '-pool-1', source_round_id: future.id, mode: 'competitive', created_at: Math.floor(Date.now() / 1000), reference_winner: null, reference_value: null, status: 'open', entry_deadline: future.spec.entry_deadline, pools: ['0', '2000000000000000000', '0', '0'], total: '2000000000000000000', entries: {[a]: {range: 1, stake: '2000000000000000000'}}, participants: [a], claims: {}, winner: null});
  await page.exposeFunction('bullseyeTestTransaction', (transaction: typeof transactions[number]) => {
    transactions.push(transaction);
    if (transactions.length === 1) {phase = 'submitted'; return '0x' + 'a'.repeat(64);}
    if (transactions.length === 3) return '0x' + 'e'.repeat(64);
    phase = 'claim-submitted'; return '0x' + 'b'.repeat(64);
  });
  await page.addInitScript(`(() => {let address='${a}';const listeners={};window.ethereum={request:async({method,params})=>{if(method==='eth_accounts'||method==='eth_requestAccounts')return[address];if(method==='eth_chainId')return '0x${studionet.id.toString(16)}';if(method==='wallet_getSnaps')return {genlayer:{id:'npm:genlayer-wallet-plugin'}};if(method==='eth_sendTransaction')return window.bullseyeTestTransaction(params[0]);throw Error('Unexpected provider method: '+method);},on:(event,fn)=>(listeners[event]??=[]).push(fn),removeListener:(event,fn)=>listeners[event]=(listeners[event]??[]).filter(f=>f!==fn)};window.testWalletAccounts=next=>{address=next;for(const fn of listeners.accountsChanged??[])fn([next]);};})()`);
  await page.route('https://studio.genlayer.com/api', async route => {
    const body = route.request().postDataJSON(), result = body.method === 'eth_getTransactionCount' ? '0x0' : body.method === 'eth_estimateGas' ? '0x30d40' : body.method === 'eth_gasPrice' ? '0x0' : null;
    if (result === null) throw Error('Unexpected SDK RPC: ' + body.method);
    await route.fulfill({json: {jsonrpc: '2.0', id: body.id, result}});
  });
  await page.route('**/api/live', route => route.fulfill({json: {state: 'watching', records: []}}));
  await page.route('**/api/wallet?*', route => route.fulfill({json: {balance: new URL(route.request().url()).searchParams.get('address') === b ? '0' : phase === 'credited' ? '12000000000000000000' : phase === 'empty' ? '10000000000000000000' : '8000000000000000000'}}));
  await page.route('**/api/film-pools', async route => {autoCalls++; assert.equal(route.request().postDataJSON().poolId, 'barbie-network-demo-pool-999'); phase = 'resolving'; settleAt = Date.now(); await route.fulfill({json: {state: 'pending', hash: '0x' + 'c'.repeat(64)}});});
  await page.route('**/api/film-pools?*', async route => {
    const query = new URL(route.request().url()).searchParams, movie = movies.find(r => r.id === query.get('movie'))!;
    if (query.get('receipt')) {
      if (query.get('receipt') === '0x' + 'e'.repeat(64)) {futureEntered = true; await route.fulfill({json: {state: 'finalized', sender: a, transfers: []}}); return;}
      if (query.get('receipt') === '0x' + 'a'.repeat(64)) {phase = 'open'; closeAt = Math.floor(Date.now() / 1000) + 3; await route.fulfill({json: {state: 'finalized', sender: a, transfers: []}}); return;}
      claimReads++; phase = claimReads >= 2 ? 'credited' : 'claim-finalized';
      await route.fulfill({json: {state: 'finalized', sender: a, transfers: [{hash: '0x' + 'd'.repeat(64), state: phase === 'credited' ? 'credited' : 'pending', recipient: a, value: '4000000000000000000'}]}}); return;
    }
    if (query.get('poolId')) {await route.fulfill({json: pool()}); return;}
    if (phase === 'resolving' && Date.now() - settleAt >= 1000) phase = 'resolved';
    const spec = closeFuture && movie.id === 'clayface-2026' ? {...movie.spec, entry_deadline: Math.floor(Date.now() / 1000) - 1} : movie.spec;
    await route.fulfill({json: {contract, sourceRoundId: movie.id === 'barbie-practice' ? 'barbie-network-demo' : movie.id, source: {status: movie.spec.mode === 'competitive' ? 'open' : 'resolved', spec, winner: movie.winner, evidence: movie.evidence}, pools: movie.id === future.id && futureEntered ? [upcomingPool()] : movie.id === 'barbie-practice' && !['empty', 'submitted'].includes(phase) ? [pool()] : [], olderBefore: null, ready: true}});
  });
  await page.goto(base + '/rounds/barbie-practice'); const region = page.getByRole('region', {name: 'Barbie GEN staking'});
  await region.locator('.market-options button').nth(2).click(); await region.getByRole('button', {name: 'Predict with 2 GEN', exact: true}).click();
  await expect(page.getByText('Confirming your prediction…', {exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Prediction placed', exact: true})).toBeVisible({timeout: 20000});
  await expect(page.getByRole('button', {name: 'Collect 4 GEN', exact: true})).toBeVisible({timeout: 30000});
  assert.equal(autoCalls, 1); assert.equal(transactions.length, 1); assert.equal(transactions[0].value, '0x' + (2n * 10n ** 18n).toString(16));
  await page.getByRole('button', {name: 'Collect 4 GEN', exact: true}).click();
  await expect(page.getByText('Sending GEN to your wallet…', {exact: true})).toBeVisible();
  await expect(page.getByText('GEN received in your wallet', {exact: true})).toBeVisible({timeout: 35000});
  assert.equal(transactions.length, 2); assert.equal(transactions[1].value, '0x0');
  await page.reload(); await expect(page.getByText('Collected', {exact: true})).toBeVisible();
  await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'My predictions'}).click();
  await expect(page.getByText('Collected', {exact: true})).toBeVisible();
  await page.evaluate(second => (window as unknown as {testWalletAccounts: (address: string) => void}).testWalletAccounts(second), b);
  await expect(page.getByText('Lost', {exact: true})).toBeVisible(); await expect(page.getByRole('button', {name: 'Collect 4 GEN'})).toHaveCount(0);
  await page.evaluate(first => (window as unknown as {testWalletAccounts: (address: string) => void}).testWalletAccounts(first), a);
  await page.goto(base + '/rounds/' + future.id + '?range=1#prediction');
  const futureRegion = page.getByRole('region', {name: future.title + ' GEN staking'});
  await expect(futureRegion.getByRole('button', {name: 'Predict with 2 GEN', exact: true})).toBeEnabled();
  await futureRegion.getByRole('button', {name: 'Predict with 2 GEN', exact: true}).click();
  await expect(futureRegion.getByRole('heading', {name: 'Prediction placed', exact: true})).toBeVisible({timeout: 20000});
  for (const option of await futureRegion.locator('.market-options button').all()) await expect(option).toBeDisabled();
  assert.equal(transactions.length, 3); assert.equal(transactions[2].value, '0x' + (2n * 10n ** 18n).toString(16));
  assert.equal(autoCalls, 1);
  await page.reload(); await expect(page.getByRole('heading', {name: 'Prediction placed', exact: true})).toBeVisible();
  await page.goto(base + '/predictions'); await expect(page.getByRole('heading', {name: 'Your Street Fighter predictions', exact: true})).toBeVisible();
  closeFuture = true;
  await page.goto(base + '/rounds/clayface-2026?range=1#prediction');
  const closed = page.getByRole('region', {name: 'Clayface GEN staking'});
  await expect(closed.getByRole('button', {name: 'Entries closed', exact: true})).toBeDisabled();
  assert.equal(transactions.length, 3);
  checks.push('Upcoming SDK ticket: exactly 2 GEN sent to the forecast pool, one immutable entry, unknown result stays pending, reload and portfolio persistence, no early settlement, and cutoff disables late entries. Isolated wallet/RPC only.');
  assert.deepEqual(errors, []); checks.push('Isolated two-wallet SDK flow: one 2 GEN stake, automatic result/settlement with zero wallet prompts, one 4 GEN collection, exact native-credit verification, balance update, reload/portfolio persistence and account-switch separation. No transaction broadcast or user funds accessed.');
  await context.close();
  await writeFile('docs/consumer-ui-verification.json', JSON.stringify({base, verifiedAt: new Date().toISOString(),checks}, null, 2)); console.log(checks.join('\n'));
} finally {await browser.close();}
