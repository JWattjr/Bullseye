## verdict

All ten required affected-state round-2 captures were opened and are valid: desktop/mobile controlled preopening, closed, pending-credit, retry-credit and paid-credit. They show full pages from the document top, with legible content and the claimed states at 1440px/390px width. Development chrome is excluded. These captures use controlled RPC/wallet transport seeded from an actual finalized amendment; they establish UI behavior, not new native transfers or validator judgments. `browser-controlled.json` explicitly records no broadcast.

| Original material fix | Score | Evidence |
|---|---|---|
| 1. Failed native-transfer receipt and persistent review-withdrawal states | **Resolved** | Both retry captures show the error-toned “Transfer failed” receipt, restored 0.005 GEN credit, “Retry review collection” action and failed-transfer explanation. Both pending captures retain withdrawal status at zero available, explain verification and waiting, and offer no second collection action. Both paid captures retain independently verified paid status on the proposal at zero available. Source distinguishes failed/credited children, keeps nonterminal withdrawal collection locked and reuses MusicCredit on the review surface. The supplied controlled assertions cover delayed credit and retry gating. |
| 2. Review gate versus closed/result ticket copy | **Resolved** | Both preopening captures state “Staking opens after identity review clears,” identify the review/finality gate and keep outcomes inactive. Both closed captures state that the chart result will appear after verification, rather than directing users to a nonexistent result. The expanded completed-review passage records the approved specification without inviting stakes. Source confines “can accept stakes” to an open market before its entry deadline and preserves separate resolved/void copy. |

No material regression introduced by this correction batch is visible in the supplied affected-state captures or the changed branches. No fresh broad defect hunt or detector pass was performed.

## remaining

Clear for the two scored fixes only. This ship verdict does not certify the whole surface anew, contract correctness, live native-credit proof, deployment, video packaging, Portal eligibility or milestone readiness. Those retain their separate evidence and completion requirements.

disposition: ship
