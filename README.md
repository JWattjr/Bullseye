# Bullseye

A free film forecasting league: choose a revenue range, save your call, and inspect how the published result was interpreted. Correct competitive forecasts earn 100 free points; misses earn zero. Points have no monetary value.

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

Open http://localhost:3100. Select **Make your first call**, choose the $150m–under $200m range, and confirm. Barbie's observed historical opening weekend was $162,022,044: 100 practice points. Reload and open My predictions to see the same saved call. The historical result is excluded from rankings.

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

Network: StudioNet, the hosted development simulator, not production-chain settlement. Final contract: `0x72bAb093224a81823f2Cc83A6d374B5C72df2A09`.

- Finalized specification: `0x3e37eda6e035b119fff3487a496edb5172f26929ef1870862125a743ad7950fc`
- Finalized adjudication: `0xd709d0b950f017d0394be3b8402bc03b69dfc261787f22b753d3eb18aa3d5f1f`
- Both finalization callbacks also finalized successfully. See [proof manifest](public/protocol-proof.json) and [independent network verification](docs/proofs/network-verification.json).

The final deployed source includes indexed rounds and entries. Run `npm run test:network` to re-fetch every receipt and finalized state. It asserts successful execution as well as FINALIZED status, specification and passage hashes, exact number and winning range. Failed adjudication evidence is retained in `docs/proofs/adjudication-rejected-passage.json`; that transaction applied no result or points.

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

Public browsing and guest practice need no wallet. With `NEXT_PUBLIC_PRACTICE_STORAGE=browser` (the hosted preview), practice, drafts, receipts and cached public protocol projections persist in that browser's local storage. Clearing site data removes practice. Practice is user-editable and has no competitive standing.

Without that setting, a single local Node process uses an opaque HttpOnly guest cookie and an atomic, serialized JSON database under `.data/`. Set `BULLSEYE_DATA_DIR` to a durable directory. This file mode is not a multi-process production database and must not be deployed to an ephemeral filesystem.

Persisted competitive identity is the participant's wallet address. The wallet signs directly against StudioNet using the documented SDK. There is no backend relay or custody. The server only reads public protocol data. Connecting an address selects a public watch view, not a private identity claim. Browser storage caches finalized state; **Refresh protocol rounds** re-fetches authoritative finalized contract state. Leaderboard points derive from those entries and outcomes, not editable practice counters. All public entries are capped at 200 per round; indexing fetches the latest 20 rounds.

The creator form saves a draft and performs deterministic previews. GenLayer then interprets the question against the complete canonical specification. Only the deployed owner may submit creator proposals. Entries open through a self-message emitted after successful specification finality; participants cannot call that callback. Accepted outcomes are provisional. Result callbacks also wait for adjudication finality. Receipt refresh distinguishes provisional, finalized success and failed execution.

## Scope and limitations

The working preview demonstrates historical practice, a repeatable local synthetic rehearsal, and genuine finalized development-network consensus. Live competitive contract methods and wallet flows are implemented; no future competitive film round or browser-wallet signing session is claimed as tested. A future round requires its creator wallet, a precise event and The Numbers URL, and validator-accessible evidence at the frozen observation time. It does not require the historical demo to wait for a film release.

The Numbers retrieval and numeric extraction succeeded on StudioNet. Box Office Mojo retrieval consensus was undetermined and is excluded. Archive.org's July 25, 2023 capture index and exact selected capture were accessible from validators, but that old capture is not an eligible capture for this demo's 2026 observation window. The shipped rule uses the live approved publisher and retains the exact consensus passage on-chain. No full-page archival persistence, source truth guarantee or silent source fallback is claimed. See [evidence policy](docs/EVIDENCE.md).

The source repository is hosted at JWattjr/Bullseye. No Portal submission was posted, and no eligibility or reward points are promised. Tutorial and submission drafts are included. Real-money wagering, exchange liquidity, Arc settlement and a general marketplace are outside the MVP.

## Why GenLayer

Film evidence is not just a number: a page contains domestic, worldwide, cumulative, estimated, adjusted and individual-weekend figures. GenLayer validators independently interpret the creator's natural-language rule, reject ambiguity, and later identify the published number for the frozen event and metric. Deterministic code validates boundaries, authorization, time windows, normalization, scoring and retries. This moves interpretive authority away from a private administrator while leaving arithmetic out of the model.

Read [architecture](docs/ARCHITECTURE.md), [tutorial draft](docs/TUTORIAL.md), [submission draft](docs/SUBMISSION.md), and [verification records](docs/VERIFICATION.md).
