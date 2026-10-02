# Verification, October 1, 2026

The implementation was checked against the actual deployed contract, not invented receipts. StudioNet is a development simulator; this is not production-chain settlement.

| Check | Result |
|---|---|
| Python direct contract tests | 34 passed |
| TypeScript domain and persistence tests | 9 passed |
| Contract lint | Passed with a newer-runner advisory; the tested runner remains pinned |
| ESLint and strict TypeScript | Passed |
| Next.js production build | Passed locally and on Vercel |
| Desktop 1440×960 and mobile 390×844 | Historical selection, 100/0 scores, reload, evidence, predictions, honest empty league, creator draft, synthetic rehearsal passed |
| Keyboard and recovery | Native radio selection with Space; test-injected HTTP 500 and Retry loading passed |
| Independent visual review | All 14 views reviewed; one transition frame recaptured; final disposition ship |
| Network integration | Finalized successful deployment, specification, adjudication, both callbacks, exact hashes/value/range and round index re-fetched |

The original local browser record is [browser-verification.json](browser-verification.json); the final production build also passed the same full desktop/mobile/recovery suite, recorded in [browser-final-verification.json](browser-final-verification.json). The public hosted historical round was independently confirmed for 100 practice points and checked after navigation. The corrected protected preview's protocol endpoint matches the real manifest, saved in [hosted-protocol-verification.json](hosted-protocol-verification.json). Network verification and raw receipts are under [proofs](proofs/). The failed ungrounded-passage adjudication is preserved there: FINALIZED alone was not treated as successful execution. A later successful transaction used the same frozen rules. No result or points were awarded for the failure.

The Numbers and an exact Archive.org capture were fetched by validators. Box Office Mojo did not achieve retrieval consensus. The archival capture is outside the demo observation window and is not used as settlement evidence. See [EVIDENCE.md](EVIDENCE.md).

The local `/api/live` sync returned one resolved protocol round with the actual value 162022044. Practice remains excluded from competitive standings. No completed future competitive round, browser-wallet signing session, multi-process production database, or full HTML archive is claimed as verified.

After user-approved production publication, the complete desktop/mobile/recovery suite also passed on https://bullseye-genlayer.vercel.app, recorded in [browser-hosted-verification.json](browser-hosted-verification.json). Anonymous API checks returned HTTP 200 and matched the finalized manifest; a fresh-browser check confirmed the corrected synthetic source link. A missing production storage setting found during promotion was fixed before recording these successful checks; see [DEPLOYMENT.md](DEPLOYMENT.md).

Wallet discoverability fix: the header exposes Connect wallet on all routes at 320, 390 and 1440 pixels. The production build, lint, strict typecheck and 9 application tests passed. Full practice regression passed separately. [wallet-ui-verification.json](wallet-ui-verification.json) records missing-provider recovery and a simulated EIP-1193 provider exercising permission rejection/retry, SDK connection, public watch address, connected label and account removal. These simulated checks do not establish real wallet signing or a transaction. Reproduce with `npx tsx scripts/wallet-check.ts` and `BULLSEYE_URL` set to the running app.

Reproduce application checks with `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Contract checks: install the pinned `requirements.txt`, run `genvm-lint check contracts/bullseye.py`, then `python -m pytest tests/direct -q`. Run `npm run test:network` for live read-only receipt/state verification. Start the production app before `npm run test:browser`. `npm run rehearse` runs an isolated, invented ten-second rehearsal without a protocol transaction.

Catalog and GEN pool update: lint, strict typecheck, production build, 13 application tests and 41 direct contract tests passed. The full browser regression and simulated-wallet suite passed again. Catalog checks at 320 and 1440 pixels preserved an existing Barbie loss, added the two films, saved independent scores across reload, and loaded the real finalized pool from StudioNet. The claim endpoint returned finalized with an explicitly credited native transfer. See [catalog verification](catalog-ui-verification.json) and [pool proof and limits](POOLS.md).

The catalog, pool loading, native-credit receipt, wallet visibility and full practice regression checks also passed on the public production alias after deployment. The new pool-specific direct tests passed again with explicit finalized refund checks for voided and empty-winning-pool cases.
