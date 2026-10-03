# GEN staking on the movie markets

Barbie, Oppenheimer and Dune: Part Two accept native StudioNet GEN on their existing `/rounds/...-practice` pages. Staking appears above free points practice. A saved points prediction does not block a GEN entry. `/pools` links to these three markets; `/pools/rehearsal` retains access to earlier synthetic-pool claims.

StudioNet GEN is simulated development currency. These are historical films whose published results are already known and shown before staking. They are funded historical practice, excluded from competitive rankings. This release does not advertise them as future film wagers.

## Contract and settlement

The new `contracts/film_pools.py` contract builds on Claude's `BullseyeRoundPools` implementation and keeps its essential boundary: the winning range comes from the Bullseye validator contract, rather than from frontend constants or administrator input. Bullseye v2 remains `0x756ddF8D588DA4D598F9F90947DB92Bced10D68E`. The historical-session pool contract is `0x6Ff023F19cE3e661A9F5Cf3e7782fec17f067Ed2`, StudioNet chain ID 61999, with the pinned runner in its first source line.

Each source round must already have a resolved validator result. The first signed 2–100 GEN stake starts a shared two-minute pool for that film in the same payable transaction. Subsequent wallets join it until entries close. One immutable entry is allowed per wallet per pool. After closing, anyone can settle; the contract re-reads the source result and checks its frozen specification hash. Claims open only after a successful finalized self-callback. Winners divide the whole pot proportionally, with cumulative integer allocation conserving all wei. An empty winning range refunds everyone. No pool fee is deducted. New sessions preserve all earlier entries and claims.

The API reads source rounds and pools with `LATEST_FINAL`; browser caches and free practice scores do not authorize payouts. Wallets sign directly. There is no operator withdrawal or backend-held signing key. Claim requests and their emitted native transfers are checked separately. A transfer is reported credited only when its receipt is finalized and explicitly has `value_credited=true`; Studio's EOA `NO_MAJORITY` result label is not treated as successful consensus execution.

## Evidence and verification

`public/film-pool-proof.json` and `docs/proofs/films/manifest.json` map the three local market IDs to their actual source-round IDs. They retain source specifications, adjudications, finalized callbacks and pool transactions. Barbie uses the existing finalized `barbie-network-demo`; Oppenheimer and Dune have newly proposed and adjudicated source rounds in the same v2 Bullseye deployment. Dune's first extraction returned insufficient evidence and stayed pending. Its retry resolved under the unchanged source and rules; the first attempt is retained.

Direct tests cover each film's pool, shared stakes, proportional whole-pot allocation, closed entries, repeat sessions, preservation of old claims, rejected unfinalized source results, changed specification hashes and empty-winner refunds. Browser checks at 320 and 1440 pixels cover all three same-page staking forms, default 2 GEN, invalid minimum and missing-provider recovery, and staking after a saved Barbie points prediction. The full practice regression preserves Claude's optional closeness bonus and existing 100/0 outcomes when no exact guess is supplied.

A 2 GEN stake and credited 2 GEN payout completed for each of the three movies, with successful finalized settlement callbacks. The configured development account finished with its original balance; the pool contract held zero after these proof claims. The signing proof uses the configured development account. Browser tests with mocked RPC state do not establish real MetaMask signing. Production checks read actual finalized RPC state. Failed native transfers have no automatic retry mechanism; the claim record represents a transfer request, and the credited follow-up receipt plus wallet balance establishes delivery. Multi-wallet proportional allocation is directly tested; the live proof uses one entrant per movie.

## Trying a movie pool

1. Open Barbie, Oppenheimer or Dune from GEN pools or the programme.
2. Choose a GEN range, leave the amount at 2 or enter up to 100 GEN, and sign **Stake GEN on [movie]**.
3. Use **Check GEN receipt & pools** to confirm successful finalization. This also refreshes your entry and pot.
4. When the two-minute entry window closes, sign **Settle [movie] pool**, then refresh until its callback finalizes.
5. If a payout or refund is due, sign **Claim ... GEN** and check its separate credited transfer and your wallet balance.

Free points practice stays below the staking form and keeps its own saved prediction and optional exact-number bonus. Those points are not GEN balances.

## Reproducing the development proof

Use the already configured unlocked StudioNet CLI account without reading or exporting its key. `scripts/deploy.ps1` accepts `film-deploy`, `film-spec`, `film-adjudicate`, `film-stake` and `film-claim`; set `BULLSEYE_FILM` to the local movie ID. `film-claim` waits for the entry window, verifies settlement and its callback, then requires a finalized credited 2 GEN transfer to the account that made the proof stake. It is a single-entrant proof helper, not a general payout estimator. Earlier synthetic and Claude round-pool proof files remain intact.
