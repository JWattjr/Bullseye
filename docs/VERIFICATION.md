# Release verification

Payout recovery correction: October 9, 2026. Product: five upcoming GEN markets and three historical practice markets at [Bullseye](https://bullseye-genlayer.vercel.app), StudioNet 61999. [CLAIM-RECOVERY.md](CLAIM-RECOVERY.md) describes the new contracts, protocol assumptions, exact balances and immutable legacy deployments.

## Verification matrix

| Layer | Result | What it establishes |
| --- | --- | --- |
| Direct contract suite | 121 passing, October 9 | Oracle rules/evidence, authorization, finality, deadlines, allocation, refunds and recovery. |
| Recovery adversarial cases | 44 passing across both implementations | Actual contract code, controlled asynchronous delivery/receipts and three-wallet ledger; failed delivery, finality-gated retry, replay rejection, exact balances and wei conservation. |
| Application tests | 24 passing, October 9 | BigInt accounting, exact credit gates, recovery finality, migration, persistence and keeper isolation. |
| GenVM lint | Both pool implementations pass | Concrete pinned runner, contract declarations and method structure. |
| Deployed source | Exact byte match, October 9 | Reviewed film and forecast source equals both current deployments and the isolated forecast fixture deployment. |
| Hosted recovery payout proofs | Two signed 2 GEN deposits and actual credited 2 GEN payouts | Both implementations reserve before emission and mark paid only after independent native-credit verification and protected finality; recorded wallet returns exactly to its initial balance and both proof escrows end at zero. |
| Five upcoming v2 pools | Finalized successful setup, October 9 | Original frozen specifications/cutoffs match; outcomes remain unknown; setup sends no GEN. |
| Browser recovery | Passing, mobile historical and forecast views | Controlled wallet/RPC/API transport; actual SDK encoding; attempts 1 then 2, automatic checking, failure finality before retry, exact credit, reload and account isolation. |
| ESLint / TypeScript / build | Release checks | Run with pinned dependencies before deployment; deployment/build records accompany the release. |
| Published consumer/practice checks | Passing, October 9, public alias | Search, filters, ranges, 2 GEN ticket, free practice, persistence, 320/1440 layouts and controlled two-wallet SDK flow. |
| Published eight-market reads | Passing, October 9, 390 width | All eight tickets load actual finalized StudioNet pool state, expose four ranges and a default 2 GEN ticket, with no wallet transaction. |
| Daily background keeper | Implemented/tested; production inactive | Unauthorized requests rejected; server-only authentication configuration remains pending. |

## Evidence

- [Recovery manifest and exact wei balances](proofs/claim-recovery/manifest.json), [read-only source/receipt verification](proofs/claim-recovery/network-verification.json), [published release checks](proofs/claim-recovery/release-verification.json), [browser recovery report](proofs/claim-recovery/ui-verification.json), and [raw recovery receipts](proofs/claim-recovery).
- [Five current pools](proofs/upcoming/network-verification.json), [current historical proof](../public/film-pool-proof.json), [current upcoming proof](../public/upcoming-pool-proof.json), and [public recovery proof](../public/claim-recovery-proof.json).
- [Legacy historical manifest](../public/legacy-film-pool-proof.json), [legacy upcoming manifest](../public/legacy-upcoming-pool-proof.json), and [original historical raw receipts](proofs/films). Earlier three-film payouts remain identified with their actual old deployment.
- [Original oracle verification](proofs/network-verification.json), [published consumer fixtures](consumer-ui-verification.json), [published actual market reads](consumer-live-market-verification.json), and [practice regression](upcoming-practice-regression.json).

## Failure evidence and limits

FINALIZED alone does not prove successful contract execution or native credit. Current claim reservations are separate from paid `claims`. Paid requires the exact linked finalized native receipt with explicit credit, independently verified through the fixed official Studio RPC, followed by successful verification finality and self callback. Unknown or pending evidence stays locked. Terminal non-credit permits only the next nonce, with conservative backing for all unpaid obligations.

Failure/retry tests use controlled transport and native ledgers. Hosted native failure and live multi-wallet proportional payout are not claimed. The forecast hosted payout uses an explicitly isolated synthetic oracle and identical forecast source; no listed future film is prematurely settled. StudioNet is a development simulator. RPC honesty/finality, native refund availability, source access and publisher truth remain assumptions. Old deployed contracts cannot be patched retroactively.

Earlier oracle failures remain retained: rejected ungrounded Barbie passage, initially insufficient Dune evidence and the first ambiguous Hunger Games proposal. Retries preserved frozen rules. See [evidence policy](EVIDENCE.md).

## Reproduce

```powershell
npm test
npm run lint
npm run typecheck
npm run build
python -m pip install -r requirements.txt
python -m pytest tests/direct --artifacts-dir artifacts/gltest -q
genvm-lint check contracts/film_pools.py
genvm-lint check contracts/forecast_pools.py
npm run test:network
npx tsx scripts/verify-claim-recovery.ts
npx tsx scripts/verify-upcoming.ts
```

Network verifiers only read. With the app running and Chromium installed, use `npx tsx scripts/claim-recovery-ui-check.ts`, `npx tsx scripts/consumer-check.ts`, and `scripts/movie-stakes-check.ts` with `BULLSEYE_VERIFY_FILMS=yes`. `BULLSEYE_URL` selects the origin and `BULLSEYE_CHROME` can select the browser executable. See [tutorial](TUTORIAL.md).

The upcoming verifier intentionally checks open unknown outcomes; update it for a later actual finalized lifecycle rather than treating a valid future resolution as failure. Older reports are retained in [VERIFICATION-HISTORY.md](VERIFICATION-HISTORY.md).
