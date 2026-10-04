# Bullseye

A film prediction platform powered by GenLayer. Browse movie markets, choose an opening-weekend range, stake GEN and collect your share of the winning pool. The current Barbie, Oppenheimer and Dune markets replay historical results with simulated StudioNet GEN. Free points practice and the forecasting league remain available.

## Run

Source repository: [JWattjr/Bullseye](https://github.com/JWattjr/Bullseye).

Hosted demonstration: [bullseye-genlayer.vercel.app](https://bullseye-genlayer.vercel.app). Deployment details are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Node 22+ (tested with 24.12), Python 3.14 for contract tests. Dependencies and the GenVM runner are pinned. Other workspace applications are untouched.

```powershell
git clone https://github.com/JWattjr/Bullseye.git
cd Bullseye
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3100. Choose a movie and revenue range, enter at least 2 GEN and confirm in your wallet. The app follows confirmation and settlement automatically. Open My predictions to track entries and collect available GEN with one wallet confirmation. Free points practice is available from the footer and each movie’s **Play for free points** disclosure; it needs no wallet and is excluded from competitive rankings.

**Run a rehearsal** creates an invented film with an eight-second entry window and a synthetic observation at ten seconds. Pick $30m–under $50m to match its $42,500,000 fixture. These timings never apply to competitive rounds. This is local application behavior, not a synthetic GenLayer receipt.

```powershell
npm run rehearse
npm test
npm run lint
npm run typecheck
npm run build
npm run start
npm run test:browser
python -m pip install -r requirements.txt
genvm-lint check contracts/bullseye.py
python -m pytest tests/direct -q
npm run test:network
```

The browser suite launches an isolated test browser. Set `BULLSEYE_CHROME` to a Chromium executable if needed, or install Playwright Chromium with `npx playwright install chromium`. Set `BULLSEYE_URL` to test another origin. Screenshots are under `.impeccable/review/`.

## Real GenLayer demonstration

Network: StudioNet, the hosted development simulator, not production-chain settlement. Contract: `0x756ddF8D588DA4D598F9F90947DB92Bced10D68E` (v2).

- Finalized specification: `0x85c2400a7fbf251866a5d0e56554e02a576849a923ca4d6cce182f4de8c0ee5d`
- Finalized exact-number prediction (`predict_exact`): `0xa44a0a1265250ec4078bb89c9e3477fbfffb15a1decf096c206bc170cefcd601`
- Finalized adjudication: `0x33827e917db45f627de3ed37a8690b0b1d7569fb089c3903edf4a03e420be24b`. Every validator re-read The Numbers and confirmed the stored passage, with the agreed $162,022,044, is on the page it read.
- Both finalization callbacks also finalized successfully. See [proof manifest](public/protocol-proof.json) and [independent network verification](docs/proofs/network-verification.json).

**A GEN pool settled on that result.** Pool contract `0x54fdb94340Ce8B9cE37EBb3d6C3179130c95c1b9` holds no outcome of its own: it reads the finalized round from the Bullseye contract. Stake `0x103925e1ab5f39c26317e95ba274d752b3a6ec7f45aeaa35408120870fd6bdd4`, settle `0xb94dfadc76d333b7d6bbe643fb3d7276982a204f91a0c13656e64ede5ef68aa6`, claim `0xcbdc9c0878efc1f7516490b955952a67ad1480ef26f14ff32e456dd99f31f893`, native transfer `0xf3d905f437bb2a3b99c6f5fffd4de5295223ed767fb3cada76ae15c8d4e37093`. Details in [round-pool proof](public/round-pool-proof.json).

Run `npm run test:network` to re-fetch every receipt and finalized state. It asserts successful execution as well as FINALIZED status, specification and passage hashes, exact number and winning range, and that the pool's winner and value equal the Bullseye round's. The first deployment (`0x72bAb093224a81823f2Cc83A6d374B5C72df2A09`), whose validators checked only the number and not the passage, is archived in `docs/proofs/v1/`.

To create a fresh deployment using your configured CLI account:

```powershell
genlayer network info
genlayer account
.\scripts\deploy.ps1 deploy
.\scripts\deploy.ps1 spec
# Wait until the recorded observation time, then:
.\scripts\deploy.ps1 adjudicate
# If polling times out, resume the same transaction; do not resubmit:
.\scripts\deploy.ps1 resume-adjudicate
```

The seed is historical and never competitive. The CLI's generated `.compiled.js` is removed by the wrapper before and after each invocation to prevent duplicate script discovery and stale-module execution. Back up the proof manifest before deploying another instance. To seed a second round on the same instance, give it a new round ID in the manifest. Scripts use the selected unlocked CLI account; the web application reads no operator key.

## Identity and persistence

Use **Connect wallet** in the header on any page. Live participation requires MetaMask and the GenLayer wallet plugin; the SDK requests StudioNet setup and plugin access. The header shows the wallet-authorized address, while guest practice remains available without connection. No transaction is sent merely by connecting. The wallet-control regression covers missing-provider and permission rejection plus a simulated EIP-1193 provider; real browser-wallet signing remains unverified.

Public browsing and guest practice need no wallet. With `NEXT_PUBLIC_PRACTICE_STORAGE=browser` (the hosted preview), practice, drafts, receipts and cached public protocol projections persist in that browser's local storage. Clearing site data removes practice. Practice is user-editable and has no competitive standing.

Without that setting, a single local Node process uses an opaque HttpOnly guest cookie and an atomic, serialized JSON database under `.data/`. Set `BULLSEYE_DATA_DIR` to a durable directory. This file mode is not a multi-process production database and must not be deployed to an ephemeral filesystem.

Persisted competitive identity is the participant's wallet address. The wallet signs directly against StudioNet using the documented SDK. Stakes and claims have no signing relay or operator custody. The server reads public protocol data and can submit a zero-value, permissionless settlement call from a disposable StudioNet account after entries close; it cannot choose a result or transfer a user’s funds. Connecting an address selects a public watch view, not a private identity claim. Browser storage caches finalized state; **Refresh protocol rounds** re-fetches authoritative finalized contract state. Leaderboard points derive from those entries and outcomes, not editable practice counters. All public entries are capped at 200 per round; indexing fetches the latest 20 rounds.

The creator form saves a draft and performs deterministic previews. GenLayer then interprets the question against the complete canonical specification. Only the deployed owner may submit creator proposals. Entries open through a self-message emitted after successful specification finality; participants cannot call that callback. Accepted outcomes are provisional. Result callbacks also wait for adjudication finality. Receipt refresh distinguishes provisional, finalized success and failed execution.

## Scope and limitations

The working preview demonstrates historical practice, a repeatable local synthetic rehearsal, and genuine finalized development-network consensus. Live competitive contract methods and wallet flows are implemented; no future competitive film round or browser-wallet signing session is claimed as tested. A future round requires its creator wallet, a precise event and The Numbers URL, and validator-accessible evidence at the frozen observation time. It does not require the historical demo to wait for a film release.

The Numbers retrieval and numeric extraction succeeded on StudioNet. Box Office Mojo retrieval consensus was undetermined and is excluded. Archive.org's July 25, 2023 capture index and exact selected capture were accessible from validators, but that old capture is not an eligible capture for this demo's 2026 observation window. The shipped rule uses the live approved publisher. The stored passage is checked by every validator: each re-reads the page and rejects the result unless the leader's exact passage, carrying the agreed number, appears on it. No full-page archival persistence, source truth guarantee or silent source fallback is claimed. See [evidence policy](docs/EVIDENCE.md).

The source repository is hosted at JWattjr/Bullseye. No Portal submission was posted, and no eligibility or reward points are promised. Tutorial and submission drafts are included. Real-money wagering, exchange liquidity, Arc settlement and a general marketplace are outside the MVP.

## Why GenLayer

Film evidence is not just a number: a page contains domestic, worldwide, cumulative, estimated, adjusted and individual-weekend figures. GenLayer validators independently interpret the creator's natural-language rule, reject ambiguity, and later identify the published number for the frozen event and metric. Deterministic code validates boundaries, authorization, time windows, normalization, scoring and retries. This moves interpretive authority away from a private administrator while leaving arithmetic out of the model.

Read [architecture](docs/ARCHITECTURE.md), [tutorial draft](docs/TUTORIAL.md), [submission draft](docs/SUBMISSION.md), and [verification records](docs/VERIFICATION.md).


GEN stakes now live directly on the Barbie, Oppenheimer and Dune: Part Two market pages, above free points practice. Minimum 2 GEN on StudioNet. Historical pool sessions use the actual finalized Bullseye validator result and preserve old claims when a new session starts. Closeness scoring remains available for free points predictions. See [staking and proof instructions](docs/POOLS.md).

## Consumer platform update

Markets is now the homepage, with search, film ranges and live pool totals. Each film has one prediction ticket, preset GEN amounts and a pool-based return estimate. Receipts and results refresh automatically; settlement is requested in the background from an open interface. My predictions shows wallet-specific stakes, outcomes and a single Collect action, with received status gated on an exact credited native transfer. Wallet balances update automatically. Free points, evidence, the creator and previous pools remain available through secondary entry points.

Run `npx tsx scripts/consumer-check.ts` for the isolated two-wallet SDK/browser flow. Run `BULLSEYE_VERIFY_FILMS=yes` with `scripts/movie-stakes-check.ts` for live read-only market checks. See [GEN pools](docs/POOLS.md) for the permissionless settlement boundary and offline-keeper limitation.
