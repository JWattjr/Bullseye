# Music+ proof and release record — 14–15 October 2026

This update is in progress and has not been submitted to the Portal. The production alias still serves the previous release until the new live proof and browser checks pass.

The default contract review window is 24 hours. This StudioNet demo explicitly uses 600 seconds (10 minutes), with a two-hour ruling deadline. Listing deposits are 0.004 simulated GEN, bonds 0.001 GEN, and an amendment reward 0.001 GEN. No monetary value is implied for StudioNet GEN.

Candidate 4 is deployed and bound, with its actual payable/recovery schema verified before funding:

| Role | StudioNet address |
|---|---|
| Challenges | `0xee03ebD002BfACFba5379Ab01F17572081a8E373` |
| Markets v2 | `0x51F0427e7D523FDC005B80b6758e48ACa2898833` |
| Pools v2 | `0x190f37c4FeC9D3ECF1A0f900afed8d270A7E32aa` |
| Seasons v2 | `0x50Bfbd7BA19856E020455be55C2E669A9dad9f59` |

The owner separately authorized its exact 0.028 GEN package. All six listings and four bonds finalized, all three upcoming pools opened after their complete review windows, and the full package returned to the same wallet. The read-only verifier passed deployed source bytes, actual judgments, pools, history and native credit. Release review and submission packaging remain separate from contract deployment. Exact deployed source is pinned to commit `91ca437`. Earlier candidate receipts and the complete paid refund reconciliation are preserved under `candidate-3/` and `candidate-3-manifest.json`.

All three required bonded judgments on candidate 4 now finalized genuinely, with independently fetched quotations and no deadline fallback:

| Case | Finalized adjudication | Effect |
|---|---|---|
| Lover identity | [UPHELD](https://studio.genlayer.com/transactions/0x4b10296527ae03c59cbe87a7b4b4cd69c94692705395cae0f9aae004eac19479) | Combined standard/deluxe identity preserved. |
| Surrender chart week | [AMENDED](https://studio.genlayer.com/transactions/0xac9ac7018e5e32009f4f50e809347b82a7859c7f78e9564f3ed4bd1bdd5fe550) | Source specification changed from August 6 to the generated August 13, 2022 option. |
| Surrender unrepairable week | [VOIDED](https://studio.genlayer.com/transactions/0x699ab346284c4b1455c2e489ef9954decca74b3a4226cfe84d161c6dffd38630) | Source permanently void; no pool can open. |

The first upcoming market was opened by the actual resumable keeper only after the full review window. Its opening, pool creation and listing-credit release are journaled and imported into the proof. The previous-release read-only verifier also passed again, including exact earlier native credit, Music cases, combined season and preserved Film pools. The reissue challenge genuinely finalized AMENDED to `MERGE_ALL_EDITIONS`; all three upcoming sources and their zero-stake GEN pools read back as open, with no evidence or known winner. Candidate 4 returned its full 0.028 GEN: [exact finalized native credit](https://studio.genlayer.com/transactions/0xa0fe43e2e07631006943310079e5ae38286eb653fb54779c900c11082e7bbed6). Deposited and paid ledgers both equal 0.028 GEN, remaining contract balance is zero, and this package had no outside wallet-balance change. See [read-only verification](proofs/musicplus-2026-10-14/verification.json).

The frozen Billboard reference is the real [Lover chart report captured on 10 October 2021](https://web.archive.org/web/20211010140829id_/https://www.billboard.com/articles/business/chart-beat/8528870/taylor-swift-lover-album-debuts-at-no-1-on-billboard-200-chart/). Its 2019 reporting describes standard and deluxe editions contributing to one album and dates the chart against its tracking week. It is an archived reference, not a claim that every 2026 publisher policy is identical. StudioNet validators fetched it successfully; extracted-text SHA-256: `73b700456c70d804fcc35ebe7cc987c47113eef0673f4c88ce9180c9437448af`.

Release dates were verified from official or authoritative announcements:

| Album | Release | Billboard chart date | Entry cutoff (UTC) | Resolution deadline (UTC) | Source |
|---|---|---|---|---|---|
| Big Stupid Heart — Andy Grammer | 16 October 2026 | 31 October 2026 | 16 October, 00:00 | 14 November, 00:00 | [Hollywood Records](https://www.hollywoodrecords.com/press/andygrammer/) |
| The Sea Has No Mercy — Bernie Taupin | 23 October 2026 | 7 November 2026 | 23 October, 00:00 | 21 November, 00:00 | [Artist publicist](https://shorefire.com/releases/entry/bernie-taupin-teams-up-with-his-daughter-georgey-taupin-on-new-single-one-hundred-ways) |
| A Different Kind of Truth — Van Halen, physical reissue | 23 October 2026 | 7 November 2026 | 23 October, 00:00 | 21 November, 00:00 | [Rhino](https://media.rhino.com/press-release/different-kind-truth) |

The Van Halen market asks for chart position/re-entry, not a new debut: the album originally debuted in 2012. Its initial proposal requests a separate physical-edition entry, a real premise validators must review against the frozen format treatment. Validators independently selected `MERGE_ALL_EDITIONS`, then the actual source amendment finalized before its pool opened: [upcoming adjudication](https://studio.genlayer.com/transactions/0xebe4642067dd5c9b34320dd3d2b934be74b9069bdac90cda8cd7216a378eeb7c).

The historical date challenges use the permanent [Surrender Wikipedia revision](https://en.wikipedia.org/w/index.php?title=Surrender_%28Maggie_Rogers_album%29&oldid=1308571311), which states release on 29 July 2022. The proposed 6 August week is deliberately contested; the June 4 proposal requires a date outside the bounded amendment candidates. These are historical tests with known outcomes, not competitive forecasting.

## Candidate history and spending

The first candidate's listing and bond methods lacked a payable declaration. Direct-mode tests bypassed the entry-dispatch check. Its first 0.004 GEN listing call finalized with an execution error and native value credit, without a listing. That immutable candidate cannot return the unrecorded deposit. The owner was informed, and the failed receipt is retained in `candidate-1-manifest.json`; it must never be counted as successful proof.

Candidate 2 was deployed with corrected payable declarations, but no funds were sent; an RPC response interruption is retained in its manifest. Candidate 3 adds receipt-verified recovery for failed exact listing/bond deposits as pull credit for their original sender, with one-time receipt tracking and balance backing. The actual deployed schema was checked before deposits.

The owner authorized exactly 0.028 GEN for six candidate-3 listings and four bonds, followed by collection to the same wallet. Three listings and three bonds actually deposited 0.015 GEN; the remaining 0.013 GEN was held before broadcast. The 0.004 GEN first-candidate loss is separate. No new pool stakes are included. Native credits are marked paid only after independently verified finalized parent/child receipts. A new immutable recipient needs fresh deposit approval.

Candidate 3's unrepairable Surrender chart-week challenge finalized genuinely VOIDED with both quotations, without a fallback: [actual adjudication](https://studio.genlayer.com/transactions/0xac606fe5d2acd57ca6b0fd3203822ef4fd96447ccfd6e9693fcf3fa9999daf42). Markets read back as void, preventing entry. Other attempts safely rejected quotations that were not exact fetched text or left missing evidence pending. Those attempts are preserved; they are not successful UPHELD/AMENDED proofs.

The final source revision asks models to select bounded passage IDs and expands them into exact fetched quotes before storage. Specification passages contain the album identity or rank bins rather than unrelated deadline fragments. Zero-GEN diagnostic contracts read real compiled candidate-3 specifications, fetched actual archived evidence and reran independent judgments. Both diagnostic versions returned UPHELD, AMENDED to August 13, and VOIDED. Diagnostics do not move deposits, amend actual listings or count as bonded live proof. All three real bonded outcomes were then repeated against candidate 4, as linked above.

The final citation diagnostic independently returned all three verdicts. Candidate 3's unresolved cases then exited through explicitly labelled insufficient-evidence deadline fallbacks, which are not live judgment proofs. Its complete 0.015 GEN package was collected back: [exact native credit](https://studio.genlayer.com/transactions/0x90e88ea2a47d1dc1d1604c03bd1a7a167d87ed2384198006bcec52598d60e68c), followed by independently finalized paid state. The wallet went from 11.996999999999999956 to 19.996999999999999956 GEN during the package, including an additional 8 GEN balance increase outside it. No source for that increase is asserted. Exact transfer receipts and the empty contract balance establish the package return; before/after wallet equality would be inaccurate here.

## Settlement commands

After the verified registry is published, `npm run settle:music` reads actual final state and performs only zero-GEN maintenance. Its `.data/music-keeper.json` journal preserves submitted hashes across restarts. It does not sign stakes, listings, bonds, or withdrawals.

Run from the repository root:

```sh
# 31 October 2026, at or after 00:00 UTC; retry when an eligible complete archive exists.
npm run settle:music -- big-stupid-heart-2026

# 7 November 2026, at or after 00:00 UTC.
npm run settle:music -- the-sea-has-no-mercy-2026
npm run settle:music -- a-different-kind-of-truth-reissue-2026

# Or process all published markets and eligible pool settlements.
npm run settle:music
```

An observation date is the earliest settlement attempt, not a promise of immediate archive availability. Missing or ambiguous evidence stays pending until the fixed resolution deadline, then voids. Unresolved pools permit refunds one day later: 15 November or 22 November at 00:00 UTC. No daily scheduler or new server secret is configured. The owner must run the keeper, or another permissionless caller can execute it.

Remaining completion gates: updated production, actual Playwright WebM, and final submission draft/documentation. The finish reviewer scored both material UI fixes resolved; the final actual desktop/mobile API matrix also passed. All three required bonded verdicts and the upcoming reissue's genuine edition amendment have finalized. The owner submits the Portal update and uploads the video.
