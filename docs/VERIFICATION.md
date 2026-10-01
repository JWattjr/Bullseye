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

Reproduce application checks with `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Contract checks: install the pinned `requirements.txt`, run `genvm-lint check contracts/bullseye.py`, then `python -m pytest tests/direct -q`. Run `npm run test:network` for live read-only receipt/state verification. Start the production app before `npm run test:browser`. `npm run rehearse` runs an isolated, invented ten-second rehearsal without a protocol transaction.
