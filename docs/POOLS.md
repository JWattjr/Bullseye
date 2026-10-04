# GEN staking on the movie markets

Barbie, Oppenheimer and Dune: Part Two accept native StudioNet GEN on their existing `/rounds/...-practice` pages. One prediction ticket is the main flow; free points practice is a secondary disclosure. A saved points prediction does not block a GEN entry. `/` and `/pools` open the searchable movie-market directory; `/pools/rehearsal` retains access to earlier synthetic-pool claims.

StudioNet GEN is simulated development currency. These are historical films whose published results are already known and available under Market rules & result before staking. They are funded historical practice, excluded from competitive rankings. This release does not advertise them as future film wagers.

## Contract and settlement

The new `contracts/film_pools.py` contract builds on Claude's `BullseyeRoundPools` implementation and keeps its essential boundary: the winning range comes from the Bullseye validator contract, rather than from frontend constants or administrator input. Bullseye v2 remains `0x756ddF8D588DA4D598F9F90947DB92Bced10D68E`. The historical-session pool contract is `0x6Ff023F19cE3e661A9F5Cf3e7782fec17f067Ed2`, StudioNet chain ID 61999, with the pinned runner in its first source line.

Each source round must already have a resolved validator result. The first signed 2–100 GEN stake starts a shared two-minute pool for that film in the same payable transaction. Subsequent wallets join it until entries close. One immutable entry is allowed per wallet per pool. After closing, anyone can settle; the contract re-reads the source result and checks its frozen specification hash. Claims open only after a successful finalized self-callback. Winners divide the whole pot proportionally, with cumulative integer allocation conserving all wei. An empty winning range refunds everyone. No pool fee is deducted. New sessions preserve all earlier entries and claims.

The API reads source rounds and pools with `LATEST_FINAL`; browser caches and free practice scores do not authorize payouts. Wallets sign stakes and claims directly. There is no operator withdrawal or custody. Automatic settlement uses a disposable, unfunded StudioNet account to submit only the existing permissionless `settle(pool_id)` method with zero value; it cannot select an outcome or move a user’s stake. No persistent signing secret or user wallet key is used by the server. Claim requests and their emitted native transfers are checked separately. A transfer is reported credited only when its receipt is finalized and explicitly has `value_credited=true`; Studio's EOA `NO_MAJORITY` result label is not treated as successful consensus execution.

## Evidence and verification

`public/film-pool-proof.json` and `docs/proofs/films/manifest.json` map the three local market IDs to their actual source-round IDs. They retain source specifications, adjudications, finalized callbacks and pool transactions. Barbie uses the existing finalized `barbie-network-demo`; Oppenheimer and Dune have newly proposed and adjudicated source rounds in the same v2 Bullseye deployment. Dune's first extraction returned insufficient evidence and stayed pending. Its retry resolved under the unchanged source and rules; the first attempt is retained.

Direct tests cover each film's pool, shared stakes, proportional whole-pot allocation, closed entries, repeat sessions, preservation of old claims, rejected unfinalized source results, changed specification hashes and empty-winner refunds. Browser checks at 320 and 1440 pixels cover all three same-page staking forms, default 2 GEN, invalid minimum and missing-provider recovery, and staking after a saved Barbie points prediction. The full practice regression preserves Claude's optional closeness bonus and existing 100/0 outcomes when no exact guess is supplied.

A 2 GEN stake and credited 2 GEN payout completed for each of the three movies, with successful finalized settlement callbacks. The configured development account finished with its original balance; the pool contract held zero after these proof claims. The signing proof uses the configured development account. Browser tests with mocked RPC state do not establish real MetaMask signing. Production checks read actual finalized RPC state. Failed native transfers have no automatic retry mechanism; the claim record represents a transfer request, and the credited follow-up receipt plus wallet balance establishes delivery. Multi-wallet proportional allocation is directly tested; the live proof uses one entrant per movie.

## Consumer flow

1. Choose a movie and range from Markets. The range opens preselected in the prediction ticket.
2. Enter 2–100 GEN and confirm the prediction in your wallet.
3. Follow the result in the market or My predictions; receipts and finalized pools update automatically. Once entries close, the open interface requests permissionless settlement in the background.
4. If GEN is available, use Collect and confirm once. The interface verifies the exact credited native transfer, then updates the balance and collection status.

There is no manual refresh, receipt-check or settlement action in the consumer flow. Polling pauses in hidden pages and resumes when visible. Settlement is driven by an open market, the directory or My predictions; this release has no always-on offline keeper. A session left unopened can therefore remain pending until someone returns.

Free points, exact-number bonuses, technical evidence, creator drafts, the league and older synthetic claims remain available through secondary disclosures or footer links. GEN positions are keyed to the connected wallet. Saved receipts from the earlier layout are migrated only after their on-network sender matches that wallet. Earlier sessions remain accessible through Find earlier predictions. Portfolio totals describe sessions currently in view.

## Reproducing the development proof

Use the already configured unlocked StudioNet CLI account without reading or exporting its key. `scripts/deploy.ps1` accepts `film-deploy`, `film-spec`, `film-adjudicate`, `film-stake` and `film-claim`; set `BULLSEYE_FILM` to the local movie ID. `film-claim` waits for the entry window, verifies settlement and its callback, then requires a finalized credited 2 GEN transfer to the account that made the proof stake. It is a single-entrant proof helper, not a general payout estimator. Earlier synthetic and Claude round-pool proof files remain intact.

## Consumer verification (2026-10-04)

The isolated browser SDK test covers a two-wallet 4 GEN pool, automatic settlement without a wallet signature, a 4 GEN winner collection, credit confirmation, balance updates, reload and account switching. It uses mocked RPC and provider responses; no transaction is broadcast. The optional live two-wallet CLI test was rejected by automatic approval review for lacking explicit authorization of its exact funding/staking flow. Existing signed single-entrant proofs remain intact; live read-only checks verify current sources, market state, wallet balance and credited receipts.
