# Bullseye — GenLayer Portal submission

Prepared October 4, 2026 against the authenticated Portal form. Category: **Builder → Projects**; primary tag: **Prediction Markets**; topics: **Event Forecasting** and **Outcome Resolution**. All seven required application fields have been prepared; no contribution has been posted. This is one project with a supporting tutorial, not multiple overlapping submissions. No eligibility or reward amount is asserted.

Use [PORTAL.md](PORTAL.md) for the exact form workflow and [portal-fields.json](submission/portal-fields.json) for copy within the current character limits. The longer description below is supporting documentation, not text to paste into the 1,000-character description field.

## Title

Bullseye: film prediction pools settled by GenLayer

## Short description

Bullseye turns opening-weekend box-office forecasts into GEN prediction pools. Choose a film and revenue range, stake at least 2 StudioNet GEN, and track your call. GenLayer validators verify the frozen rules and independently read the published result. Winners share the whole pool proportionally; unavailable evidence leads to refunds.

## Project description

Bullseye is a working film prediction platform with five upcoming markets and three historical practice markets. Film fans browse revenue ranges, back a call with 2–100 StudioNet GEN, follow confirmation and results, and collect available GEN from My predictions. The interface includes search, direct range selection, wallet balances, live pool totals, stake presets and mobile layouts. Winners share the entire pool in proportion to their stakes, with no pool fee. Pool shares describe stakes rather than calibrated probabilities.

GenLayer is central to settlement. Before a market opens, validators independently judge whether a natural-language proposal unambiguously matches its canonical specification. That freezes the film, Friday–Sunday weekend, domestic US/Canada metric, publisher, integer USD units, ranges and deadlines. After observation begins, validators independently retrieve The Numbers and identify the exact published amount for that event. They must agree on the normalized value and confirm the retained passage is present on the page they read. Deterministic code calculates the winning range; the model never controls payout arithmetic.

Successful finalization callbacks gate opening, published results and pool claims. The pool reads the finalized oracle record and its matching specification hash. It has no administrator-entered winner. Missing or unsuitable evidence remains pending until a fixed deadline, then permits void and refunds. An empty winning range also refunds entrants. Integer allocation conserves the entire pot, including wei dust.

Street Fighter, Clayface, The Cat in the Hat, The Hunger Games: Sunrise on the Reaping and Dune: Part Three each have an independently verified finalized specification and shared pool. Entries close before previews; their outcomes remain unknown. Barbie, Oppenheimer and Dune: Part Two offer repeatable two-minute historical GEN sessions. Retained signed development-account receipts demonstrate a 2 GEN deposit and credited 2 GEN payout for each historical film. A separate isolated two-wallet browser fixture verifies proportional collection, persistence and account switching without broadcasting transactions.

The public deployment, open-source contracts, walkthrough, raw proof receipts and verification records are linked below. The release passes 77 direct contract tests, 23 application tests, lint, strict type checking and a production build. Published desktop/mobile checks cover the consumer flow and actual finalized StudioNet reads for all eight markets.

This MVP runs on StudioNet, a hosted development simulator. It demonstrates genuine successful executions within that environment, not mainnet or Bradbury deployment, real-money wagering, or a completed future film outcome. Settlement is driven by open app pages; the daily background route is implemented but awaits its server-only authentication setting. Creators are restricted to the deployed oracle owner, and The Numbers is the sole settlement publisher. Source access and correctness remain explicit trust assumptions.

## Links to paste

| Resource | URL |
| --- | --- |
| Live app | https://bullseye-genlayer.vercel.app |
| Market directory | https://bullseye-genlayer.vercel.app/pools |
| Repository | https://github.com/JWattjr/Bullseye |
| Reviewer walkthrough | https://github.com/JWattjr/Bullseye/blob/main/docs/DEMO.md |
| Tutorial | https://github.com/JWattjr/Bullseye/blob/main/docs/TUTORIAL.md |
| Verification | https://github.com/JWattjr/Bullseye/blob/main/docs/VERIFICATION.md |
| Upcoming deployment and specifications | https://bullseye-genlayer.vercel.app/upcoming-pool-proof.json |
| Historical deposits, results and payouts | https://bullseye-genlayer.vercel.app/film-pool-proof.json |
| Oracle execution proof | https://bullseye-genlayer.vercel.app/protocol-proof.json |
| Evidence policy | https://github.com/JWattjr/Bullseye/blob/main/docs/EVIDENCE.md |

## Contract fields

Network: **StudioNet**, chain ID **61999**. The inspected form explicitly supports Studio contract explorer links; no different-network deployment is required by that form. This does not guarantee acceptance. Addresses must never be relabelled as Bradbury or another network.

| Role | Deployed address | Source |
| --- | --- | --- |
| Rule validation and evidence oracle | `0x756ddF8D588DA4D598F9F90947DB92Bced10D68E` | [bullseye.py](../contracts/bullseye.py) |
| Upcoming GEN pools | `0x9De7b19Cf61EDCF25d7960838D297bB51012ADA5` | [forecast_pools.py](../contracts/forecast_pools.py) |
| Historical GEN sessions | `0x6Ff023F19cE3e661A9F5Cf3e7782fec17f067Ed2` | [film_pools.py](../contracts/film_pools.py) |

The oracle is the main Intelligent Contract. The pools demonstrate deterministic financial logic consuming its interpreted result. Include the forecast pool as an additional address when the form supports it.

## Contribution value

- **Novelty:** film-specific numerical forecasts with frozen weekends and inspectable publisher passages, combining guest practice with upcoming GEN pools.
- **Complexity:** two independently checked interpretive stages, cross-contract specification binding, finality callbacks, exact native-credit verification and wei-conserving allocation.
- **Impact:** a consumer entry point and reusable patterns for evidence-backed numeric markets. No adoption, volume or user counts are asserted.

The [current Projects guidance](https://portal.genlayer.foundation/contribution-type/41) requires a trust problem, live or authoritative evidence, accurate source/docs, genuine frontend contract calls and lifecycle handling, and meaningful differentiation from boilerplate. The prepared application and verification matrix address those criteria. The [builder program announcement](https://talks.genlayer.foundation/t/introducing-genlayers-incentivized-builders-program/20) describes steward review by novelty, complexity and impact; neither source guarantees this project's acceptance or points.

The current form is prepared for owner review. Optional video is left blank; the written walkthrough and captures are linked. The project owner completes reCAPTCHA, reviews the draft, submits once and retains the resulting contribution ID. If a steward requests information, respond to that same contribution rather than create a duplicate.
