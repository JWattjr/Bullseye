# Release verification

Current product: five upcoming GEN markets and three historical GEN practice markets, deployed at [bullseye-genlayer.vercel.app](https://bullseye-genlayer.vercel.app). Network: StudioNet 61999, a hosted development simulator. Code release: `de1f896`; Vercel deployment: `dpl_FRS6bRBw9fqpMiQXa72fahA6c5SH`. The submission-document update does not replace contracts or their proofs.

## Verification matrix

| Layer | Result | What it establishes |
| --- | --- | --- |
| Direct Python contracts | 77 passing, rerun October 4 | Rules, evidence validation, authorization, finality, deadlines, allocation, void/refund and preservation of claims in the harness. |
| Application/domain tests | 23 passing, rerun October 4 | BigInt accounting, exact credited-transfer gates, cutoff/spec migration, persistence and keeper failure isolation. |
| ESLint and strict TypeScript | Passing, rerun October 4 | Static application checks. |
| Next.js production build | Passing locally and on published Vercel release | Build succeeds with pinned dependencies. |
| Published consumer UI | Passing at 320/1440 pixels | Filters, search, range links, single GEN ticket, presets/bounds, recovery, reload and account separation with isolated RPC/wallet fixtures. |
| Published live tickets | Eight passing at 390 pixels | Actual finalized StudioNet reads, working ranges, default 2 GEN, ready state and no horizontal overflow; no wallet transaction. |
| Practice regression | Passing | Keyboard selection, 100/0 scores, exact bonus, reload, evidence, drafts, synthetic rehearsal and injected error recovery. |
| Actual oracle result | Finalized successful execution plus callbacks | Validators retrieved The Numbers and agreed on Barbie's $162,022,044; its retained passage is bound to the frozen specification. |
| Actual historical film stakes/claims | Signed 2 GEN deposits and credited 2 GEN payouts for three films | One real development-account entrant per historical proof session, successful source/pool finality and native credit. |
| Actual upcoming setup | Five finalized open sources and pools | Exact specification hashes and cutoffs match; no winner/evidence exists yet; setup had no native value credit. |
| Two-wallet SDK consumer flow | Passing, isolated fixture | A winner collects a 4 GEN mock pot, exact-credit verification, balance updates, reload and wallet switching without broadcasts. |
| Daily background keeper | Implemented and directly tested; production inactive | Route rejects unauthorized calls; activation needs server-only CRON_SECRET. Open pages currently drive settlement. |

Detailed records:

- [Consumer fixtures](consumer-ui-verification.json) and [actual market reads](consumer-live-market-verification.json).
- [Practice regression](upcoming-practice-regression.json) and [prior hosted practice checks](consumer-practice-verification.json).
- [Oracle network verification](proofs/network-verification.json), [five-market verification](proofs/upcoming/network-verification.json), [historical raw receipts](proofs/films).
- [Oracle proof](../public/protocol-proof.json), [upcoming proof](../public/upcoming-pool-proof.json), [film proof](../public/film-pool-proof.json).
- [Published market capture](../.impeccable/review/consumer/upcoming-live.jpg) and [published mobile ticket](../.impeccable/review/consumer/upcoming-ticket-live.jpg).

## Failure evidence and limits

Protocol ACCEPTED is provisional. FINALIZED alone is also insufficient: execution must succeed. Oracle, opening and settlement callbacks are distinct transactions. A recorded claim is a transfer request; native payment needs explicit final credit with the exact sender, recipient and wei amount. Studio EOA NO_MAJORITY is not treated as successful consensus execution.

Retained failures include an ungrounded Barbie passage rejected during adjudication, Dune's initial insufficient-evidence attempt, and the first ambiguous Hunger Games proposal. Later successful attempts keep the frozen rules; old receipts are preserved. [Evidence policy](EVIDENCE.md).

No completed upcoming-film adjudication or payout, production-chain deployment, live multi-wallet proportional payout, or agent-performed MetaMask signing session is claimed. The optional additional funded two-wallet test was not run because its exact funding/staking flow lacked authorization. The existing signed CLI proofs and isolated consumer fixture establish different things.

The Numbers access succeeded from validators. Box Office Mojo retrieval consensus was undetermined and is excluded. One Archive.org capture was accessible, but it is outside the shipped observation window and is not settlement evidence. No permanent full-page archive or source-truth guarantee is claimed.

## Reproduce

```powershell
npm test
npm run lint
npm run typecheck
npm run build
python -m pip install -r requirements.txt
python -m pytest tests/direct -q
genvm-lint check contracts/bullseye.py
genvm-lint check contracts/forecast_pools.py
npm run test:network
npx tsx scripts/verify-upcoming.ts
```

The network commands above only read receipts and state. The upcoming verifier intentionally requires sources/pools to remain open with unknown outcomes; after an actual resolution its checks must be updated to the new finalized lifecycle stage.

Start the app before running `npm run test:browser`, `npx tsx scripts/consumer-check.ts`, or the live-read `scripts/movie-stakes-check.ts` with `BULLSEYE_VERIFY_FILMS=yes`. `BULLSEYE_URL` selects the origin. Playwright needs an installed Chromium executable; see [TUTORIAL.md](TUTORIAL.md).

Older incremental reports are retained in [VERIFICATION-HISTORY.md](VERIFICATION-HISTORY.md). Those entries describe earlier releases and do not supersede this matrix.
