# Tutorial draft: forecasting a film weekend with Bullseye

Bullseye asks one question: where will a film's published domestic opening-weekend revenue land? Participants select a fixed range rather than betting money. Correct calls earn 100 free league points, and an optional exact number earns up to 100 more for closeness. The result includes the number, source passage and technical proof.

Clone the prepared repository, install the pinned npm dependencies, copy `.env.example` to `.env.local`, and run `npm run dev`. The feed is readable without a wallet. Start with Barbie's historical practice round, choose a range, and confirm. Picking $150m–under $200m matches its published $162,022,044. That awards 100 practice points and leaves the competitive leaderboard untouched. Reload: your receipt and prediction remain saved.

Use **Run a rehearsal** to exercise closing and pending states without waiting for a future release. The invented film closes in eight seconds and receives its synthetic $42,500,000 observation at ten seconds. This is expressly a local rehearsal. It has no GenLayer transaction and no competitive ranking effect.

Now inspect the separate development-network proof. `public/protocol-proof.json` contains the deployed contract, actual specification/adjudication hashes and finalized record. Run `npm run test:network` to independently fetch receipts and finalized state. The script rejects finalized execution errors, verifies both callback receipts, and confirms the exact number, range and hashes. StudioNet is a development simulator, not a production-chain award or settlement.

Why does the contract need interpretation? A film page contains domestic, international, worldwide, cumulative and individual-weekend figures. The creator's ordinary-language rule must identify one exact metric and event, not merely ask an AI to pick a winner. Bullseye freezes that interpretation before entries open. It includes source, scope, USD unit/scale, rounding, every interval boundary, closing/observation/resolution times, corrections and missing-evidence behavior.

To draft a competitive round, open **Create a round**, enter its film/year, opening Friday and The Numbers URL, and save/check the rule. This first step is a deterministic preview. The deployed owner can then submit with their wallet. Validators independently judge the natural-language proposal against the canonical specification. Ambiguous proposals revert. Successful specification finality triggers a protected self-message that opens entries; merely submitting or receiving ACCEPTED does not open a confirmed round.

Participants connect their own browser wallet for live predictions. The wallet signs directly; Bullseye has no custody or backend relay. After signing, receipts appear under My predictions. Refresh protocol rounds to fetch finalized entries and outcomes. Competitive points and accuracy derive from those confirmed records. Pending and void rounds never affect accuracy.

After observation begins, anyone may request resolution. Validators independently fetch the sole frozen publisher and extract a bounded answer. Code requires a literal integer dollar amount and an exact source passage, then determines the winning half-open interval. A finalized result callback publishes the result. Repeated callbacks cannot award duplicate points because scoring is derived, not incremented.

If evidence is missing or invalid, the round remains pending. After its fixed deadline, anyone may request void. A network/model execution failure applies no result. The repository includes a real failed adjudication receipt where the contract rejected a rephrased quotation; a subsequent retry succeeded without changing the rule.

Read `docs/EVIDENCE.md` before extending sources. Publisher truth, permanent full-page retention and archive eligibility are separate questions. Validator access to the selected 2023 Archive.org capture was verified, but it was not used for the 2026 observation. The retained exact passage and hash are provenance and integrity records, not a guarantee that every publisher fact is true.

Run the contract tests, application tests, browser suite, lint, strict typecheck and production build before changing the deployment. The available proof demonstrates historical finalized consensus; no untested future competitive round, production result or Portal award is claimed.
