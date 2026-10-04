# Upcoming GEN markets

The catalog adds five independent shared pools, in release order. Dates and source pages were checked against [The Numbers release schedule](https://www.the-numbers.com/movies/release-schedule) on October 4, 2026.

| Film | US wide release | Entry cutoff (UTC) | First observation (UTC) |
| --- | --- | --- | --- |
| [Street Fighter](https://www.the-numbers.com/movie/Street-Fighter-(2026)) | October 16 | October 15, 00:00 | October 20, 12:00 |
| [Clayface](https://www.the-numbers.com/movie/Clayface-(2026)) | October 23 | October 22, 00:00 | October 27, 12:00 |
| [The Cat in the Hat](https://www.the-numbers.com/movie/Dr-Seuss-The-Cat-in-the-Hat-(2026)) | November 6 | November 5, 00:00 | November 10, 12:00 |
| [The Hunger Games: Sunrise on the Reaping](https://www.the-numbers.com/movie/Hunger-Games-The-Sunrise-on-the-Reaping-(2026)) | November 20 | November 19, 00:00 | November 24, 12:00 |
| [Dune: Part Three](https://www.the-numbers.com/movie/Dune-Part-Three-(2026)) | December 18 | December 17, 00:00 | December 22, 12:00 |

All dates are in 2026. The cutoff is before Thursday previews. The observation checks the frozen Friday–Sunday domestic opening weekend in integer USD for United States and Canada. Ranges cover zero to infinity with lower boundaries included and upper boundaries excluded.

## Contract boundary

`contracts/forecast_pools.py` is a StudioNet-only native GEN contract using the pinned GenVM runner. It references the existing Bullseye v2 validator oracle; it cannot choose or overwrite a result. The local metadata starts awaiting validation. The API enables entry only after reading the matching finalized specification from the oracle and a verified pool deployment.

Each film has one shared pool and one immutable 2–100 GEN entry per wallet. Setup uses zero-value deployment, proposal and `create_pool` calls, without placing stakes. Late stakes and repeat entries revert. Stakes stay locked until the source is resolved or void. The pool then settles and waits for its own successful finalization callback before claims open. The winning range divides the whole pot proportionally, conserving wei. A void source or empty winning range refunds participants.

The source is independently fetched and interpreted by GenLayer validators. Missing or unsuitable evidence remains pending; retry stops at the frozen deadline, eleven days after the opening Friday, then the source can be voided. Source corrections after the first verified result are ignored. A release-date change does not silently change the frozen weekend or source. No administrator can enter a replacement amount.

The three historical session markets, their proof files and earlier claims retain their existing contracts and mappings. Upcoming source IDs, exact specification hashes, deployment receipt, finalized specification callbacks and shared pool IDs are in [the manifest](../public/upcoming-pool-proof.json). The first Hunger Games proposal was rejected as ambiguous; its receipt is preserved beside the successful clarified proposal.

## Automatic settlement

Open Markets, movie pages and My predictions automatically request settlement after the observation time. The endpoint is limited to the listed film and its bound pool; it only signs zero-value permissionless adjudication, void and settlement calls with a disposable unfunded StudioNet account. It never stakes, claims or accepts a supplied outcome.

The background route `GET /api/cron/settle` follows source and pool callbacks, scans earlier historical sessions, isolates failures by film, and stops within a 240-second budget. The configured daily Vercel schedule is 16:00 UTC (17:00 Lagos), compatible with Hobby scheduling. This is daily checking, not an instant-result promise. The route rejects requests until an exact server-only `CRON_SECRET` is configured.

**Background activation is pending:** automatic approval review rejected creation of the new secret on `wattxs-projects/bullseye-genlayer`, even after its identity was verified against the existing production alias. No secret was created or transmitted. Explicit user permission is required for that remaining setting. Consumer settlement through open pages remains available.

## Verification limits

Published deployment: `dpl_FRS6bRBw9fqpMiQXa72fahA6c5SH`. All five oracle specifications and shared pools were independently re-read at `LATEST_FINAL`; each matches its local canonical hash and has no observed result. All successful setup receipts and specification callbacks were independently verified as finalized successful executions, with no native value credit. Studio omits explicit zero values on some receipts; the proof does not treat an omitted value as a positive transfer.

Verification passed: 77 direct contract tests, 23 application/domain tests, TypeScript, ESLint and production build. The public alias passed the eight-market live-read check at 390 pixels, plus the complete consumer SDK fixture at 320/1440 pixels. The free-practice regression retains 100/0 scores, exact-number bonuses, persistence, evidence and rehearsals. Native browser captures show the published directory and ticket.

Direct tests cover unknown outcomes, source and pool finality gates, pre-release cutoff, immutable entries, source hash changes, proportional allocation including wei dust, and void/empty-winner refunds. The SDK browser fixture covers one 2 GEN upcoming entry, wallet confirmation, reload and portfolio tracking, no premature settlement and closed entries, without broadcasting or accessing user funds. Keeper tests exercise offline source-to-pool finality and failure isolation.

No upcoming opening-weekend result or payout can be verified before release. The optional funded two-wallet network test rejected earlier was not retried. StudioNet GEN is simulated development currency.

## Repeat setup

Use the existing configured unlocked StudioNet CLI account. Do not export its key.

```powershell
.\scripts\deploy.ps1 upcoming-deploy
.\scripts\deploy.ps1 upcoming-spec
.\scripts\deploy.ps1 upcoming-pool
.\scripts\deploy.ps1 upcoming-proof
```

Submitted hashes are saved before waiting, so retries resume those transactions. A rejected finalized proposal can be retried explicitly with `BULLSEYE_RETRY_FAILED=yes`; the old hash and receipt are archived. Already finalized source rounds are read and verified without another proposal.
