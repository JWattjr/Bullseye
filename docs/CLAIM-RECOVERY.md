# Payout recovery correction — October 9, 2026

Both pool implementations previously recorded a claim before the asynchronous native GEN transfer was independently confirmed, with no retry after failure. They now reserve an attempt, verify the exact native receipt through validator consensus, and finalize paid or failed separately. The app handles verification and presents one retry action after confirmed failure.

**StudioNet 61999, simulated development GEN.** This is a development-environment correction, not a mainnet security certification.

## Reviewed deployments

| Implementation | Current StudioNet deployment | Source |
| --- | --- | --- |
| Historical sessions | `0xD12AaAf442A01708f4DF0C5eb0B3171C3cAb9403` | [film_pools.py](../contracts/film_pools.py) |
| Listed upcoming markets | `0xBC8b76e39B6364E16E85F5881ccC0ece5ddb9a25` | [forecast_pools.py](../contracts/forecast_pools.py) |
| Isolated forecast payout test | `0x4680745D2fB09f9A68B2Cb22cfF1Eab41D684b8C` | Identical forecast source, bound to [test-only oracle](../tests/fixtures/recovery_oracle.py) |

[Network verification](proofs/claim-recovery/network-verification.json) compares deployed source bytes with the reviewed files and retains SHA-256 hashes. Both published contracts remain bound to original oracle `0x756ddF8D588DA4D598F9F90947DB92Bced10D68E`. The five listed future-film specifications remain frozen and outcomes unknown.

## Claim authority and lifecycle

1. The participant signs `claim(poolId, attempt)`, initially attempt 1. The immutable allocation must be positive, the pool settled and the contract funded. A pending reservation is stored before one native transfer is emitted. **`claims` remains empty.** Pending attempts block duplicate emissions.
2. Anyone can call zero-value `verify_claim(poolId, participant, claimHash)`. The app requests it automatically with a disposable unfunded account. The server cannot specify a decision, source URL, recipient or transfer amount.
3. Each validator independently re-fetches the parent and its one child from fixed `https://studio.genlayer.com/api` under strict equality. It checks exact hashes, finalized successful parent execution, wallet sender, pool recipient, decoded claim calldata containing the exact pool and latest attempt, parent-child linkage, native type and finalized phase, exact pool sender, wallet recipient and wei amount, and explicit boolean credit.
4. Final credit selects `paid_pending_finality`; terminal non-credit selects `failed_pending_finality`. Missing, pending, unknown, unrelated or ambiguous evidence rejects verification and leaves the reservation locked. A timeout never unlocks retry.
5. Only a finalized self callback completes the transition. Paid records the amount once in `claims` and increments `total_paid` once. Failed restores claimability without recording payment. Another account cannot invoke the callback, and stale attempt callbacks do nothing.
6. Retry requires the next nonce and a finalized failed prior attempt. Balance must back **all unpaid obligations**, preventing use of another pool's escrow while a failed transfer's refund or another claim's verification is outstanding. Pending/paid attempts and old receipt replays cannot emit again.

The app reports GEN received only after exact native credit and paid finality. Terminal failure opens **Retry collection · N GEN**, requiring one wallet confirmation. GET endpoints only read; verification is a constrained POST. Reload and account switching preserve wallet-specific state.

## Adversarial evidence

**121 direct contract tests pass**, including **44 recovery cases** across both implementations in [test_claim_recovery.py](../tests/direct/test_claim_recovery.py). Actual contract code runs with controlled receipt transport, asynchronous delivery and a three-wallet ledger. Coverage includes success, failed delivery, finality-gated retry, duplicate claims, replayed receipts/callbacks, wrong nonce/pool/wallet/amount/hash/type/phase, ambiguous children, unknown credit, insufficient backing, independent validator re-fetches and dissent, proportional allocation and wei dust.

The failure scenario starts three wallets with 10 GEN each and stakes of 2 GEN + 1 wei, 3 GEN + 2 wei, and 2 GEN. Failed delivery changes no wallet balance. Retry delivers once. Winning allocations total the entire 7 GEN + 3 wei pot, escrow ends at zero, and wallets plus escrow conserve exactly 30 GEN. The loser cannot claim. These are controlled direct-mode ledger tests, not hosted failures.

[Browser test](../scripts/claim-recovery-ui-check.ts) executes the application's actual components and SDK encoding with controlled wallet/RPC/API transport. It decodes the consensus envelope and calldata to assert attempts 1 then 2, forces a failed child, verifies automatic checking and finality before retry, checks only two participant signatures and exact balances, then reloads and switches accounts. Both historical and forecast views are exercised. [Browser report](proofs/claim-recovery/ui-verification.json) and retry screenshots explicitly identify the fixture. They do not claim a hosted failed transfer.

**24 application tests pass**, including keeping failed v2 delivery pending until failure verification finalizes. Both pool contracts pass GenVM lint with their concrete runner pinned.

## Live successful transfers and balances

The owner authorized **4 GEN cumulative test stakes**. Two 2 GEN entries and both native payouts completed. No further test stake or second-wallet transfer was sent. The account was CLI-managed `0xdb433ff614bdd1ece21aa97221c3e0a7ecf79c92`; no private key was exported or placed in the app.

| Observation | Exact wallet GEN | Respective proof escrow GEN |
| --- | --- | --- |
| Before both stakes | 8.000999999999999998 | 0 |
| After historical stake | 6.000999999999999998 | 2 |
| After forecast fixture stake | 4.000999999999999998 | 2 |
| After historical payout | 6.000999999999999998 | 0 |
| After forecast payout | 8.000999999999999998 | 0 |

Before each verification, finalized pool state still had empty `claims` and a pending attempt despite the native credit already existing. After verification and its protected callback, finalized state was paid. The [manifest](proofs/claim-recovery/manifest.json) retains before/after states, transaction hashes and exact wei balances; raw receipts are alongside it.

- Barbie with the original publisher-verified result: [claim receipt](proofs/claim-recovery/historical-claim.json), [native credit](proofs/claim-recovery/historical-claim-child-0.json), [verification](proofs/claim-recovery/historical-verify.json), [callback](proofs/claim-recovery/historical-verify-child-0.json).
- Forecast implementation with an isolated test oracle: [claim receipt](proofs/claim-recovery/forecast-claim.json), [native credit](proofs/claim-recovery/forecast-claim-child-0.json), [verification](proofs/claim-recovery/forecast-verify.json), [callback](proofs/claim-recovery/forecast-verify-child-0.json).

The forecast test oracle is owned, time-gated, synthetic and deployed separately. It is omitted from listed film manifests and never settles a listed future film. It tests the identical forecast pool implementation's actual transfer and verification path. Hosted success and controlled failure establish different things: **no hosted failed-transfer or live multi-wallet payout proof is claimed**.

## Trust and migration limits

Validators verify the same fixed official Studio RPC. This assumes it honestly reports finalized immutable credit and that the protocol does not re-execute a terminal uncredited child. [Studio's native-transfer code](https://github.com/genlayerlabs/genlayer-studio/blob/main/backend/consensus/base.py) guards credited transfers against second credit. A compromised RPC is outside the prototype's guarantees. RPC outage or ambiguous evidence fails closed. Conservative backing checks can delay retry until refunds or other claim verifications finish.

Old contracts are immutable. New stakes use v2; old position reads, settlement and original claim ABI remain directed to their actual addresses. No old escrow is moved, failed legacy claim repaired, or old receipt overwritten. Original manifests remain in [legacy film proof](../public/legacy-film-pool-proof.json), [legacy upcoming proof](../public/legacy-upcoming-pool-proof.json) and the old raw receipt directories. New IDs include `-pool-v2-` to avoid collisions.

Open pages drive settlement and claim checking. The daily keeper remains inactive pending its server authentication setting. No administrator unlock or timeout-based retry is introduced.

## Reproduce without spending GEN

```powershell
npm test
npm run typecheck
npm run lint
python -m pytest tests/direct --artifacts-dir artifacts/gltest -q
genvm-lint check contracts/film_pools.py
genvm-lint check contracts/forecast_pools.py
npx tsx scripts/verify-claim-recovery.ts
npx tsx scripts/verify-upcoming.ts
# With the app running and Playwright Chromium installed:
npx tsx scripts/claim-recovery-ui-check.ts
```

`BULLSEYE_URL` selects the browser origin and `BULLSEYE_CHROME` can select Chromium. Network verifiers only read. The separate resumable deployment helper requires the specified account and explicit authorization, with a cumulative 4 GEN stake cap; deployment is not required to reproduce review checks.

Owner demo: https://youtu.be/IUI4EQOu00M. This later correction report supplements that earlier recording.
