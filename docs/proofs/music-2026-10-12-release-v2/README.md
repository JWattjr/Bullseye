# Music release proof — live absence correction

Status: blocked on live consensus; not submission-ready yet. The three shipping contracts and source hashes are in `manifest.json`. The exact source commit is pinned in the manifest and independently matches the deployed byte hashes.

This release normalizes the finalized diagnostic's exact absent-album response: an empty quote with an omitted null position, after complete 200-row extraction. Quoted rows without positions, additional fields and partial charts remain invalid. All positive cases rerun on these addresses. The previous funded candidate is preserved in `../music-2026-10-12-release/`; its 0.01 GEN was fully collected, and its failed Patina receipt remains disclosed.

Checks completed before this live run:

- 199 direct contract/parser tests passed, including Film recovery and four additional omission/partial-chart regressions.
- The corrected Markets source passed GenVM lint. Pools and Seasons bytes are unchanged from their earlier passing lint and 199-test run.
- 30 existing and Music app tests passed.
- TypeScript, ESLint and the production webpack build passed. The new functional browser assertions will additionally inspect the real absent-album result and funded pool.
- Film desktop/mobile browser regression passed. Earlier read-only regression confirmed the original oracle and both pool registries, with current replacement pools at zero GEN and legacy Street Fighter and Cat in the Hat retaining 2 GEN each.
- The bounded Impeccable review is complete. No additional screenshots or visual review batches are needed for this contract correction.

Exactly one additional approved 0.01 simulated StudioNet GEN stake was deposited into this pool, settled, credited back to the approved wallet by the finalized native child, and independently verified paid by the contract callback. The wallet returned to its pre-stake balance of 8000999999999999956 wei. A pre-broadcast reservation and fixed recipient/account guard prevent a blind second deposit. No additional GEN is required or authorized. No Portal submission is performed.

Renaissance (#1) and Surrender (#12) are finalized with complete archived evidence and imported into the season. Patina and the same-week pairing are still awaiting consensus finality. The leader response or a submitted hash is not counted as a completed proof; the strict verifier remains gated on all required finalized results.

The strict read-only verifier ran and correctly failed on the unfinished Patina receipt. `consensus-blocker.json` records the saved hashes and observed disagreement. The current source/binding and Film regression check passed in `source-read-regression.json`; the separately scoped native payout check passed in `paid-candidate-verification.json`. These partial checks do not substitute for full milestone verification.

The existing Barbie Film prediction was also imported with a finalized successful zero-GEN transaction. The track record now contains Renaissance, Surrender and Film; Patina and pairing still require finalized source outcomes before import.
