/** Browser fault injection. Wallet/RPC transport is controlled; no hosted funds are sent. */
import {chromium, expect} from '@playwright/test';
import {decodeInputData} from 'genlayer-js';
import {decodeFunctionData} from 'viem';
import {studionet} from 'genlayer-js/chains';
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {historicalRounds} from '../lib/seed';
import {upcomingRounds} from '../lib/upcoming';
import type {FilmPool} from '../lib/film-market';
import type {ClaimAttempt} from '../lib/pools';

const base = process.env.BULLSEYE_URL ?? 'http://localhost:3109';
const cached = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright/chromium-1243/chrome-win64/chrome.exe');
const browser = await chromium.launch({headless: true, ...(process.env.BULLSEYE_CHROME ? {executablePath: process.env.BULLSEYE_CHROME} : existsSync(cached) ? {executablePath: cached} : {})});
const wallet = '0x1111111111111111111111111111111111111111', other = '0x2222222222222222222222222222222222222222', contract = '0x3333333333333333333333333333333333333333';
const folder = 'docs/proofs/claim-recovery';
const results: unknown[] = [];
await mkdir(folder, {recursive: true});
try {
  for (const round of [historicalRounds()[0], upcomingRounds()[0]]) {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'}), page = await context.newPage();
    const source = round.spec.mode === 'historical' ? 'barbie-network-demo' : round.id, id = source + '-pool-v2-999';
    const signatures: {data: string; to: string; value?: string}[] = [], journal: string[] = [], errors: string[] = [];
    let attempt = 0, verificationReads = 0, walletBalance = 8n * 10n ** 18n, poolBalance = 4n * 10n ** 18n;
    let state: 'available' | ClaimAttempt['status'] = 'available';
    const amount = '4000000000000000000';
    const parent = () => '0x' + (attempt === 1 ? 'a' : 'b').repeat(64);
    const pool = (): FilmPool => ({id, source_round_id: source, contract, payout_version: 2, mode: round.spec.mode, title: round.title,
      status: 'resolved', entry_deadline: 1, observation_time: 1, resolution_deadline: 2, reference_winner: 2, reference_value: 162022044,
      pools: ['2000000000000000000', '0', '2000000000000000000', '0'], total: amount, minimum: '2000000000000000000', maximum: '100000000000000000000',
      entries: {[wallet]: {range: 2, stake: '2000000000000000000'}, [other]: {range: 0, stake: '2000000000000000000'}}, participants: [wallet, other],
      claims: state === 'paid' ? {[wallet]: amount} : {}, winner: 2, fixture: 'browser failure injection',
      claim_attempts: attempt ? {[wallet]: {attempt, amount, status: state as ClaimAttempt['status'], claim_hash: state === 'pending' ? null : parent(), transfer_hash: state === 'pending' ? null : '0x' + (attempt === 1 ? 'c' : 'd').repeat(64)}} : {}});
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => console.error('Request failed:', request.url(), request.failure()?.errorText));
    await page.exposeFunction('recoverySign', (tx: typeof signatures[number]) => {
      const outer = decodeFunctionData({abi: studionet.consensusMainContract!.abi, data: tx.data as `0x${string}`});
      assert.equal(outer.functionName, 'addTransaction');
      const outerArgs = outer.args as readonly unknown[];
      assert.equal(String(outerArgs[0]).toLowerCase(), wallet);
      assert.equal(String(outerArgs[1]).toLowerCase(), contract);
      const decoded = decodeInputData(outerArgs[4] as `0x${string}`, contract);
      assert.equal(decoded?.type, 'call');
      const raw = (decoded as {callData: Map<string, unknown> | {method: string; args: unknown[]}}).callData;
      const call = (raw instanceof Map ? Object.fromEntries(raw) : raw) as {method: string; args: unknown[]};
      assert.equal(call.method, 'claim'); assert.deepEqual(call.args.map(String), [id, String(attempt + 1)]);
      assert.equal(BigInt(tx.value ?? '0x0'), 0n);
      assert.ok(['available', 'failed'].includes(state), 'pending claims cannot be signed twice');
      signatures.push(tx); attempt++; state = 'pending'; journal.push('claim attempt ' + attempt);
      if (attempt === 2) {walletBalance += BigInt(amount); poolBalance -= BigInt(amount); journal.push('native credit exactly once');}
      return parent();
    });
    await page.addInitScript(`(() => {let address='${wallet}';const listeners={};window.ethereum={request:async({method,params})=>{if(method==='eth_accounts'||method==='eth_requestAccounts')return[address];if(method==='eth_chainId')return '0x${studionet.id.toString(16)}';if(method==='wallet_getSnaps')return {genlayer:{id:'npm:genlayer-wallet-plugin'}};if(method==='eth_sendTransaction')return window.recoverySign(params[0]);throw Error('Unexpected provider method '+method);},on:(event,fn)=>(listeners[event]??=[]).push(fn),removeListener:(event,fn)=>listeners[event]=(listeners[event]??[]).filter(f=>f!==fn)};window.recoveryAccount=next=>{address=next;for(const fn of listeners.accountsChanged??[])fn([next]);};})()`);
    await page.route('https://studio.genlayer.com/api', async route => {
      const body = route.request().postDataJSON(), result = body.method === 'eth_getTransactionCount' ? '0x0' : body.method === 'eth_estimateGas' ? '0x30d40' : body.method === 'eth_gasPrice' ? '0x0' : null;
      assert.notEqual(result, null, body.method); await route.fulfill({json: {jsonrpc: '2.0', id: body.id, result}});
    });
    await page.route('**/api/live', route => route.fulfill({json: {state: 'watching', records: []}}));
    await page.route('**/api/league', route => route.fulfill({json: {rounds: [...historicalRounds(), ...upcomingRounds()], predictions: [], receipts: [], profile: {name: 'Recovery tester'}, leaderboard: [], draft: '', serverTime: Math.floor(Date.now() / 1000)}}));
    await page.route('**/api/protocol', route => route.fulfill({json: {pending: true}}));
    await page.route('**/api/wallet?*', route => route.fulfill({json: {balance: String(walletBalance)}}));
    await page.route('**/api/film-pools', async route => {
      const body = route.request().postDataJSON();
      assert.deepEqual(body, {action: 'verify_claim', movie: round.id, poolId: id, participant: wallet, hash: parent()});
      if (state === 'pending') {state = attempt === 1 ? 'failed_pending_finality' : 'paid_pending_finality'; verificationReads = 0; journal.push('automatic receipt verification ' + attempt);}
      await route.fulfill({json: {state: 'pending'}});
    });
    await page.route('**/api/film-pools?*', async route => {
      const query = new URL(route.request().url()).searchParams;
      if (query.get('receipt')) {
        assert.equal(query.get('receipt'), parent());
        if (state.endsWith('_pending_finality') && ++verificationReads >= 2) {state = attempt === 1 ? 'failed' : 'paid'; journal.push('verification callback ' + state);}
        await route.fulfill({json: {action: 'claim', state: 'finalized', sender: wallet, poolId: id, payoutVersion: 2, recovery: state, amount,
          transfers: [{hash: '0x' + (attempt === 1 ? 'c' : 'd').repeat(64), state: attempt === 1 ? 'failed' : 'credited', recipient: wallet, value: amount}]}}); return;
      }
      if (query.get('poolId')) {await route.fulfill({json: pool()}); return;}
      await route.fulfill({json: {contract, sourceRoundId: source, source: {status: 'resolved', spec: round.spec, winner: 2, evidence: {normalized_value: 162022044}}, pools: [pool()], olderBefore: null, ready: true}});
    });
    await page.goto(base + '/rounds/' + round.id);
    try {await page.getByRole('button', {name: 'Collect 4 GEN', exact: true}).click();}
    catch (error) {await page.screenshot({path: '.data/recovery-ui-failure.png', fullPage: true}); console.error(errors, await page.locator('body').innerText()); throw error;}
    try {await expect(page.getByText('Checking the failed transfer…', {exact: true})).toBeVisible({timeout: 20000});}
    catch (error) {console.error({signatures: signatures.length, journal, state, errors}, await page.locator('body').innerText()); throw error;}
    assert.equal(signatures.length, 1); assert.equal(walletBalance, 8n * 10n ** 18n); assert.equal(poolBalance, BigInt(amount));
    await expect(page.getByRole('button', {name: 'Retry collection · 4 GEN', exact: true})).toBeVisible({timeout: 40000});
    await page.screenshot({path: folder + '/ui-' + round.id + '-retry.png', fullPage: true});
    await page.getByRole('button', {name: 'Retry collection · 4 GEN', exact: true}).click();
    await expect(page.getByText('GEN received in your wallet', {exact: true})).toBeVisible({timeout: 45000});
    assert.equal(signatures.length, 2); assert.equal(walletBalance, 12n * 10n ** 18n); assert.equal(poolBalance, 0n);
    await page.reload(); await expect(page.getByText('Collected', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: /Collect 4 GEN|Retry collection/})).toHaveCount(0);
    await page.evaluate(next => (window as unknown as {recoveryAccount: (address: string) => void}).recoveryAccount(next), other);
    await expect(page.getByText('Lost', {exact: true})).toBeVisible();
    await expect(page.getByText('Collected', {exact: true})).toHaveCount(0);
    assert.deepEqual(errors, []);
    results.push({movie: round.id, signatures: signatures.length, attempts: [1, 2], journal, finalWalletWei: String(walletBalance), finalPoolWei: String(poolBalance), reloadAndAccountIsolation: true});
    console.log(round.title + ': failed delivery → automatic verification → one retry → exact credit → reload/account isolation');
    await context.close();
  }
  await writeFile(folder + '/ui-verification.json', JSON.stringify({transport: 'controlled browser wallet and receipt fixtures; no hosted native failure', base, verifiedAt: new Date().toISOString(), results}, null, 2) + '\n');
} finally {await browser.close();}
