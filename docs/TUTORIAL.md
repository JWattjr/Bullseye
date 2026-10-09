# Build a film prediction platform with GenLayer

Bullseye divides responsibility between validators, who interpret the real-world event and evidence, and deterministic code, which controls time, ranges and GEN allocation. This walkthrough follows the deployed StudioNet implementation. Five upcoming films have frozen rules and unknown outcomes; historical sessions provide a repeatable demonstration.

Live: [Bullseye](https://bullseye-genlayer.vercel.app). Source: [JWattjr/Bullseye](https://github.com/JWattjr/Bullseye). Quick review: [DEMO.md](DEMO.md).

## 1. Run the frontend

Use Node 22 or later; this release was verified with Node 24.12. The lockfile pins Next.js 16.3.8, React 19.2.0 and genlayer-js 1.1.8. Python 3.14 was used for direct contract tests.

```powershell
git clone https://github.com/JWattjr/Bullseye.git
cd Bullseye
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3100. The template selects browser persistence for practice, drafts and receipt caches. No private signing key belongs in the web environment. Optional `CRON_SECRET` authenticates a server scheduler; it is not a signing key and must never have a `NEXT_PUBLIC_` prefix.

Upcoming contains five pre-release GEN markets; Practice contains Barbie, Oppenheimer and Dune: Part Two. Every ticket defaults to 2 GEN. Expand the rules: historical results are known; upcoming stakes remain held until a verified result or void.

For a wallet-free trial, open Barbie, expand **Play for free points**, pick **$150m – under $200m**, and confirm without an exact guess. Its $162,022,044 result yields 100 practice points and has no effect on competitive standings or GEN pools. Reload to inspect persistence. **Run a rehearsal** on `/practice` uses an invented film and synthetic $42,500,000 evidence; no protocol receipt is created.

## 2. Understand the interpretive work

A film page contains domestic, international, lifetime, estimated and individual-weekend numbers. A plausible number must still answer the precise event and metric promised to entrants.

[Optimistic Democracy](https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/optimistic-democracy) starts with a leader's execution and independent validator assessment. Non-deterministic answers use a contract-defined [Equivalence Principle](https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/optimistic-democracy/equivalence-principle). Bullseye compares bounded semantic fields instead of identical model prose. Hosted StudioNet does not establish production-validator performance or decentralization.

The oracle uses two interpretive paths: checking a proposal against its canonical specification, then independently retrieving and extracting the publisher's result. See `propose` and `adjudicate` in [bullseye.py](../contracts/bullseye.py). The source pins `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`. Its custom `gl.vm.run_nondet_unsafe` verifier performs substantive independent checking. Merely accepting a leader because it returned successfully would erase that safeguard.

## 3. Freeze rules before entries

[upcoming.ts](../lib/upcoming.ts) constructs the five specifications and proposals. [domain.ts](../lib/domain.ts) and the oracle enforce the film and Friday–Sunday event; domestic US/Canada revenue; The Numbers URL; integer USD, scale 1 and no rounding; exhaustive ranges; entry, observation and resolution deadlines; correction policy; and pending-then-void behavior.

Each lower range boundary is included; each upper boundary is excluded. The last range has no upper bound. Exactly $50m belongs to the range starting at $50m.

The proposal prompt returns `valid` or `ambiguous`. Validators rerun interpretation and compare the decision. Ambiguity reverts, as demonstrated by the retained first Hunger Games proposal receipt. A successful proposal stores `validated_pending_finality`. A protected self-message opens entries after proposal finality. Participants cannot invoke that callback or change the opened specification.

The creator form saves drafts and runs deterministic previews. Only the deployed oracle owner may propose new rounds. A saved preview is not validator approval.

## 4. Read finalized state and sign directly

The frontend uses an account-free client for public reads. With this installed SDK:

```typescript
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant} from 'genlayer-js/types';

const client = createClient({chain: studionet});
const round = JSON.parse(String(await client.readContract({
  address: '0x756ddF8D588DA4D598F9F90947DB92Bced10D68E',
  functionName: 'get_round',
  args: ['street-fighter-2026'],
  transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
})));
```

Wallet writes use `createClient({chain: studionet, account: address, provider})` followed by `client.connect('studionet')`. The app requires MetaMask and the GenLayer wallet plugin. Connect through the header; the wallet authorizes connection and signs each stake or claim. The server has no user signing key. The [SDK documentation](https://docs.genlayer.com/developers/decentralized-applications/genlayer-js) evolves; reproduce with this repository's pinned version rather than mixing in preview methods.

StudioNet is chain 61999 at `https://studio.genlayer.com/api`. The [network guide](https://docs.genlayer.com/developers/networks) lists Studio's built-in faucet. Fund the exact wallet connected to Bullseye. Asimov, Bradbury and Studio preview are different environments; balances and addresses are not interchangeable.

[use-film-market.ts](../lib/use-film-market.ts) submits `stake(sourceRoundId, rangeIndex)` with integer wei. The contract enforces 2–100 GEN, one immutable entry per wallet per upcoming market, and the cutoff. A hash means submitted, not confirmed. Receipts require finalized successful execution. Wallet-keyed caches preserve the correct view across reload and account switching.

## 5. Retrieve and publish evidence

After observation, `adjudicate` calls `gl.nondet.web.get(spec['source_url'])` and `gl.nondet.exec_prompt(..., response_format='json')`. Source commands cannot change stored rules. Bounded output is resolved, insufficient evidence or invalid evidence.

Code accepts only a literal integer USD amount with valid comma grouping, rejecting decimals, shorthand millions, signs and exponents. The exact passage must appear in fetched text and contain the amount. Validators independently fetch and extract, agree on status/value, and verify the retained leader passage on their own page. Independently extracted wording may differ; invented retained quotes are rejected.

The contract computes the winning interval and retains publisher URL, exact passage, UTF-8 passage hash, normalized value, observation timestamp and specification hash. A finalized callback publishes the resolved state. Missing evidence remains pending until the deadline permits void. No alternate publisher, administrator amount or participant-selected archive is substituted. See [EVIDENCE.md](EVIDENCE.md) for actual access probes and trust assumptions.

## 6. Allocate the GEN pot

[forecast_pools.py](../contracts/forecast_pools.py) binds each pool to its oracle specification hash. It cannot write a result. After entries close it accepts only a resolved or void source and waits for its own settlement-finality callback before claims.

With a 10 GEN pot and winning stakes of 2 and 3 GEN, those winners receive 4 and 6 GEN. Cumulative integer division preserves every wei. Void or an empty winning range refunds original stakes.

The participant signs `claim(poolId, attempt)` with attempt 1 initially and the next integer on a retry. The reservation prevents duplicate emissions but is not a paid claim. The app requests permissionless, zero-value `verify_claim(poolId, participant, claimHash)` automatically. Every validator reads the fixed RPC and checks the exact finalized parent calldata and native credit. A protected callback records paid or failed. Only finalized failed attempts expose Retry collection; unknown or pending credit never unlocks it. Retry also requires fully backed unpaid obligations. [Detailed recovery and proofs](CLAIM-RECOVERY.md). Legacy contracts retain their original one-argument claim ABI.

Historical [film_pools.py](../contracts/film_pools.py) sessions consume already resolved sources and close two minutes after the first stake. New sessions preserve earlier claims. Upcoming pools never roll into replacement sessions.

Open app pages request permissionless, zero-value adjudication and settlement using disposable unfunded StudioNet accounts, without staking or claiming for participants. The daily keeper is implemented but inactive until its server-only secret is configured. Until activation, someone must return to an app page; no manual consumer settlement button is required.

## 7. Reproduce tests and proofs

Existing deployment verification needs no transactions:

```powershell
npm run test:network
npx tsx scripts/verify-upcoming.ts
npm test
npm run lint
npm run typecheck
npm run build
python -m pip install -r requirements.txt
python -m pytest tests/direct --artifacts-dir artifacts/gltest -q
genvm-lint check contracts/bullseye.py
genvm-lint check contracts/forecast_pools.py
```

Direct Python tests use the harness without network broadcasts. Start the app and set `BULLSEYE_URL` for browser tests. `npm run test:browser` verifies practice/recovery; `npx tsx scripts/consumer-check.ts` uses isolated wallet/RPC fixtures; `BULLSEYE_VERIFY_FILMS=yes` with `npx tsx scripts/movie-stakes-check.ts` uses actual finalized reads for all eight tickets. Run `npx playwright install chromium` if Chromium is not installed, or set `BULLSEYE_CHROME` to its executable. All three suites respect that override, use the known Windows cache when present, and otherwise use Playwright's installed browser.

[VERIFICATION.md](VERIFICATION.md) separates direct tests, mocked browser signatures, real reads and retained signed network receipts. Future film results and payouts cannot be verified before release. The recovery proof uses an explicitly isolated test oracle for the forecast-contract payout, without resolving any listed future film. Run `npx tsx scripts/verify-claim-recovery.ts` for read-only verification and `npx tsx scripts/claim-recovery-ui-check.ts` for browser failure injection.

## 8. Deploy your own instance

Use a separate clone and your own Studio or CLI account. Preserve published manifests as reference and store your new addresses separately.

In [GenLayer Studio](https://studio.genlayer.com), select stable StudioNet, paste the pinned [oracle](../contracts/bullseye.py), and deploy with your account as owner. Deploy [forecast_pools.py](../contracts/forecast_pools.py) using your oracle's address as constructor argument. Propose a new ID with a precise proposal and valid future specification. Wait for successful finalization and the opening callback, then call `create_pool` for that ID. Inspect matching hashes and finalized open state before enabling a ticket. The [Studio guide](https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio) explains account, transaction and state inspection.

The PowerShell wrapper and [upcoming-deploy.ts](../scripts/upcoming-deploy.ts) demonstrate resumable setup. Hashes are persisted before waiting; rejected attempts are archived. Those scripts target the shipped IDs: use your own IDs and separate manifests for a new deployment. Setup transfers zero GEN; funded participation is a separate participant signature.

A shared-testnet release needs separate deployment verification, durable indexing and operational monitoring. This StudioNet prototype does not claim those steps are complete.
