# StudioNet GEN pools

This release adds three historical practice films (Barbie, Oppenheimer and Dune: Part Two) and a separate StudioNet native GEN pool rehearsal at `/pools`. It does not offer cash wagers or funded historical film predictions. StudioNet balances and transfers are simulated development funds.

The deterministic pool tests escrow and proportional payouts. The existing Bullseye film contract continues to own evidence adjudication; this rehearsal does not claim an AI-generated result. Its synthetic fixture is openly known before staking: The Last Projection opens at $42,500,000, the middle range wins.

Each wallet gets one immutable entry, 2–100 simulated GEN. Entries close 120 seconds after creation, resolution opens after 123 seconds, and an unresolved pool can be voided after 600 seconds. Successful finalized self-callbacks enable claims. Winners divide the entire pot proportionally, with cumulative integer allocation conserving wei dust. Voided pools and empty winning pools refund all entrants. No administrator withdraws funds; wallets sign directly. Root transactions and emitted transfer transactions have separate receipts.

## Verification

Contract: `0x8Dd889b59dE382749412B26FC5fDb2DE5cA08673` on StudioNet, chain ID 61999. Deployment rejects other networks. Runner is pinned in the source. `docs/proofs/pools/manifest.json` and `/pool-proof.json` retain deployment, start, 2 GEN stake, resolution callback, claim and transfer hashes.

The configured development account completed one winning 2 GEN deposit and payout. Its balance changed from 2,999,999,999,999,999,997 wei before claiming to 4,999,999,999,999,999,997 wei afterward. The native transfer receipt is finalized and explicitly has `value_credited=true`. Studio returns `NO_MAJORITY` and no consensus data on this EOA transfer; that label is not reinterpreted as successful contract execution. The UI checks native value credit separately from successful finalized contract execution.

Direct tests cover stake bounds, duplicates, closing deadlines, unauthorized callbacks, pending claims, whole-pot allocation and refund arithmetic. Frontend tests cover precision, bounds, finality and strict native credit validation. Desktop and 320px browser tests verify the film catalog and saved independent practice scores. Browser wallet tests use a simulated provider; the user's MetaMask signature flow has not been automated or independently verified.

The network proof has one entrant. Multi-entrant allocation and void/empty-winner refunds are directly tested, not yet demonstrated with multiple signed accounts on StudioNet. Failed emitted transfers do not have a retry mechanism; a claim record means transfer requested. The UI exposes follow-up receipt state rather than treating requested claims as delivered funds. This contract is a development rehearsal, not production escrow.

## Pools that settle on a real Bullseye round

`contracts/movie_pools.py` (`BullseyeRoundPools`) replaces hardcoded outcomes. A pool is tied to one Bullseye round: stakes close at that round's entry deadline, and `settle` reads the round from the Bullseye contract. It settles only once the round is `resolved` or `void`, which Bullseye reaches solely through its finality callbacks. It refuses to settle if the round's specification hash changed.

StudioNet proof: pool `0x54fdb94340Ce8B9cE37EBb3d6C3179130c95c1b9` on Bullseye `0x756ddF8D588DA4D598F9F90947DB92Bced10D68E`, round `barbie-network-demo`. One 2 GEN stake on the $150m–under $200m range, settled on the validator-read $162,022,044 and claimed back (single entrant). Receipts are in `docs/proofs/round-pool/`. Run it again with `deploy.ps1 spec` (set `BULLSEYE_ENTRY_SECONDS=900`), `round-pool-deploy`, `round-pool-stake`, `adjudicate`, then `round-pool-settle`.

## Running another proof

Use the configured unlocked development CLI account without exporting its key. `scripts/deploy.ps1` accepts `pool-deploy`, `pool-start`, `pool-resolve` and `pool-proof`. `pool-start` creates a new demo and signs a 2 GEN winning entry. Run `pool-resolve` after its observation time and before its resolution deadline. Read balances before and after the claim independently; `pool-proof` checks the saved native transfer and refreshes finalized state. Proof writes replace the current rehearsal manifest; retain prior receipts before running another deployment.

## Trying the interface

Connect MetaMask to StudioNet with the GenLayer wallet plugin, open GEN pools, and start a pool. Refresh its receipt until finalized and the new pool appears. Choose a range, leave the amount at 2 GEN, and sign the stake. After entries close, finalize the synthetic result and refresh until its callback resolves the pool. A winning entry can then claim; refresh the receipt to inspect the emitted transfer's credit and check your wallet balance.

Upcoming funded film rounds still require a future event catalog, audited production escrow, and verified final film adjudication linked to payouts. Neither the historical seeds nor this deterministic wallet rehearsal substitute for that work.
