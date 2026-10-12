# Authority and settlement

The film oracle interprets rules and evidence; GEN pool contracts use that finalized result. The frontend owns the consumer flow and observes public state. It cannot set winners or authorize payouts.

```mermaid
flowchart TD
  A[Owner proposes film and canonical rules] --> B[Validators independently check meaning]
  B --> C[Successful finality and protected opening callback]
  C --> D[Wallet stakes in a fixed range before cutoff]
  D --> E[Observation time: validators independently fetch publisher]
  E --> F[Validate exact integer and retained passage]
  F --> G[Successful oracle result finality and callback]
  G --> H[Pool checks source hash and finalized outcome]
  H --> I[Pool settlement finality and callback]
  I --> J[Participant signs claim]
  J --> K[Exact native credit verified before received status]
```

Missing/unsuitable evidence remains pending until the frozen deadline, then permits void. A finalized void source or empty winning range refunds original entries. Source corrections after the first verified result are ignored. No administrator-entered result or source substitution exists.

## Contracts

**Bullseye v2 oracle** (`contracts/bullseye.py`) owns canonical specification checks, creator authorization, interpreted validity and extraction, exact amount normalization, interval arithmetic, evidence hashes and protected finality callbacks. Free league points derive from confirmed competitive oracle entries and resolved results; no mutable award counter can be duplicated by retries.

Both non-deterministic paths rerun substantive interpretation. Specification decisions must match. Evidence decisions match on bounded status and normalized value, and each validator verifies the leader's retained passage on the page it fetched. Execution errors never receive automatic validator agreement.

**Forecast pools** (`contracts/forecast_pools.py`) run only on StudioNet 61999. Each upcoming film has one shared pool bound to a competitive finalized open source and its specification hash. One immutable 2–100 GEN entry per wallet; fixed pre-release cutoff; no rollover. Claims await source and pool finality. Proportional cumulative integer allocation conserves the entire pot including wei dust.

**Historical sessions** (`contracts/film_pools.py`) consume already resolved sources. The first payable entry creates a shared two-minute pool atomically; later sessions preserve old claims. Known historical results are visible before entry and excluded from competitive forecasting claims.

## Client and server

Public RPC reads use pinned genlayer-js 1.1.8 and `TransactionHashVariant.LATEST_FINAL`. Successful execution and separate callback receipts matter in addition to lifecycle status. Stakes/claims are signed directly by the browser wallet. No operator key or custodial signing relay exists in Next.js.

The server can submit permissionless zero-value adjudication, void, settlement and claim verification from disposable unfunded StudioNet accounts. It accepts only listed movies and bound pool IDs; it cannot supply a result, stake or claim. Open-page polling drives this today. The daily keeper is implemented with a fixed market list, callback waits, per-film failure isolation, earlier-session pagination and a time budget. Production authentication is pending CRON_SECRET; an unset or wrong bearer token returns 401.

Both pool contracts reserve `claim(poolId, attempt)` before emitting a transfer. Permissionless `verify_claim` independently fetches the exact finalized parent and native child from the fixed Studio RPC through strict equality consensus. The pool ID, attempt nonce, sender, recipient and amount must match. A protected finality callback records paid only for explicit native credit, or failed for explicit terminal non-credit. Only failed attempts permit a new nonce; retry requires backing for all unpaid obligations. The app requests zero-value verification automatically and shows Retry collection after failure finality. [Recovery state machine and proof](CLAIM-RECOVERY.md).

## Persistence and limitations

Hosted browser storage contains guest practice, drafts and public receipt projections, keyed appropriately by wallet. It cannot authorize contract entries or payouts. Wallet-selected watch views are public projections, not authentication to private data. Alternatively, a local single-process serialized file database uses an HttpOnly guest cookie; this is unsuitable for an ephemeral or multi-process deployment.

The publisher controls source facts and availability. Retained passage hashes prove integrity of an excerpt, not permanent whole-page retention or factual truth. Only The Numbers and domestic opening-weekend revenue are supported. Creator authorization remains owner-only; pools cap 200 entrants and 2000 pool records. StudioNet is a development simulator; broader shared-testnet deployment, durable indexing and production monitoring remain later work.


## Adjacent Music contracts

```mermaid
flowchart LR
    U[Wallet: question and schedule] --> M[MusicMarkets: validator compilation]
    M --> O[Creator reviews frozen spec and opens]
    O --> P[MusicPools: native GEN, no LLM]
    A[Wayback CDX dated Billboard 200] --> E[Code extracts complete 200 rows]
    E --> J[Validators identify album; agree digest, rank and quote]
    J --> M
    M -->|finalized immutable result| P
    P --> C[Pull claim: exact native credit verified]
    F[Existing Film oracle: The Numbers judgment] --> FP[Existing Film pools]
    F -->|finalized free predictions| S[Seasons: points and streaks, no LLM]
    M -->|finalized free predictions| S
    S --> UI[Film + Music standings and results timeline]
```

The old Film oracle and both current Film pool addresses are preserved. Music uses separate source and pool records. `build-music-contracts.py` embeds the pure parser into a standalone pinned-runner source; the deployment helper refuses source-hash changes after recording an address. No local-only runner alias is used.

Judgment occurs only in Music compilation and album identification. Code chooses CDX captures after observation, validates dated Billboard 200 markers, requires complete ordered rows, hashes all row fields, checks exact quotes and debut weeks, and determines winners. Models see extracted bounded data, not publisher HTML. Accepted compiled identities agree in their complete canonical form. Results activate through protected finality callbacks. Archive/identity uncertainty stays pending until a fixed deadline.

MusicPools reads finalized source state, freezes its hash/deadlines, and distributes the whole pool through deterministic cumulative integer allocations. Void and empty-winner outcomes refund; unresolved sources allow a refund at the frozen source deadline plus one day. Claims use the existing verified-native-credit reservation/retry design. `verify_settlement` recovers a missed activation callback from a strictly validated finalized successful settlement receipt; it cannot invent a winner. Unknown native credit remains reserved until protocol evidence resolves it.

The server reads LATEST_FINAL only, caches and bounds directory reads, and sends zero-value permissionless maintenance requests. Wallet stakes/claims use the existing provider and never expose a key to the server. Public wallet-scoped receipt metadata survives reload; source and pool records remain authoritative. Open pages drive music resolution, settlement, claim verification, and season imports; the unconfigured daily scheduler remains inactive. Browser closures do not change contract deadlines, and another caller can execute each permissionless step.

Seasons imports finalized existing predictions rather than stake entries or administrator scores. It binds both source addresses and fixed season boundaries. Correct bins add 100, exact guesses add bounded closeness, and chronological idempotent records define hit rates and streaks. Historical exhibition remains distinct from competition. The dated proof manifest distinguishes actual network receipts from controlled browser transport and retained failed candidates.
