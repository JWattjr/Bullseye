# Evidence policy and verified access

Checked on 2026-10-01 against StudioNet from deployed `AccessProbe` at `0x788f7bFA5e223bE787DED3Ac91B244401734621a`, using `gl.nondet.web.get`, not ordinary browser fetches. Probe logs contain actual receipts. Strict comparison of probe metadata is deliberately a conservative diagnostic; undetermined consensus is not evidence of successful retrieval.

| Source | Validator result | Decision |
|---|---|---|
| The Numbers Barbie film page | HTTP 200; expected number present; finalized Bullseye extraction returned 162022044 | Sole shipped publisher |
| Box Office Mojo Barbie weekend page | UNDETERMINED probe transaction, no stored result | Excluded, no fallback |
| Archive.org CDX index, 2023-07-25 through 2023-07-26 | HTTP 200, index returned captures | Index access verified |
| Exact archive capture 20230725030010 | HTTP 200; expected number present | Retrieval verified for that capture only |

For an archive-backed future version, eligible selection must be fixed before entries: exact original URL, successful HTML response, earliest capture timestamp at or after observation and no later than resolution deadline, chronological timestamp then digest tie-break. Select from the publisher's capture index, never from a participant-submitted convenient snapshot. Verify that final retrieval uses the exact timestamp and original URL, rather than accepting a closest-capture redirect outside the window. If no eligible capture exists, remain pending, then void. This candidate policy is documented and access-probed, but **not the shipped settlement policy**.

The verified July 2023 archive is not eligible for the finalized demo's October 2026 observation. Shipped rounds freeze direct-source observation instead: first successful consensus retrieval at or after observation and before the fixed deadline. Later corrections are ignored. The same sole source is used on every retry. Missing or invalid evidence remains pending; after the deadline anyone can request deterministic void. No administrator supplies the number.

The original publisher URL doubles as the approved capture URL for direct observation. The exact extracted passage is retained in contract state, along with its UTF-8 SHA-256 hash, normalized integer, observation timestamp and specification hash. The application joins it with the adjudication transaction from the saved proof. A source publication timestamp is recorded as null when unavailable. A passage hash commits to retained evidence, not the publisher's entire changing HTML response and not factual truth.

Validators re-fetch independently, compare bounded status and exact normalized value, and require every leader passage to be an actual substring containing the quoted amount. Rephrased or fabricated passages revert. One such finalized execution error is preserved as `adjudication-rejected-passage.json`; the subsequent successful retry is a separate receipt, not a fabricated correction to that file.

The numeric normalizer accepts literal integer USD dollar strings with valid comma grouping, rejects decimals, shorthand millions, signs and exponents, and uses no floating-point money. Source content is only evidence inside the extraction prompt; it cannot rewrite stored specifications, deadlines, ranges or point rules.

Trust assumptions: the publisher is accurate; the endpoint represents the named publisher; independent validators can obtain and interpret it; successful protocol consensus and finality behave as documented. StudioNet simulates the development protocol. A retained passage makes the adjudication inspectable but does not preserve the complete original page forever. A permanent artifact service, dispute process, broader source adapters and archive-backed settlement are later work. No silent substitution to an archive, another publisher, or manual result exists.

Historical local practice is a retrospective exercise with a checked public source, not a timing-valid competitive market. Its excerpt-record timestamp records creation of the local evidence record; it is not a claimed publisher fetch timestamp. Its original film weekend is historical. Synthetic rehearsal uses invented evidence and application timing only; it has no adjudication transaction.

Official sources: [The Numbers film page](https://www.the-numbers.com/movie/Barbie-%282023%29), [Box Office Mojo weekend page](https://www.boxofficemojo.com/release/rl1077904129/weekend/), [GenLayer finality](https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/optimistic-democracy/finality), [messages](https://docs.genlayer.com/developers/intelligent-contracts/features/messages), [transaction context](https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context).
