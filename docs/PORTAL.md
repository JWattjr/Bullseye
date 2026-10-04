# GenLayer Portal handoff

The authenticated [submission form](https://portal.genlayer.foundation/submit-contribution) was inspected on October 4, 2026. The prepared draft uses **Builder → Projects**, with **Prediction Markets**, **Event Forecasting** and **Outcome Resolution**. Searching the owner's submissions for Bullseye returned no matches at preparation time. No contribution has been sent.

## What is prepared

| Current form requirement | Prepared content |
| --- | --- |
| Project name | Bullseye |
| Primary tag | Prediction Markets |
| One-liner, maximum 180 characters | 148 characters |
| Description, maximum 1,000 characters | 991 characters; includes StudioNet and open-page settlement limits |
| How-to | Four steps: browse, immediate practice, verify actual execution, optional owner-signed GEN session |
| Expected verification outcome, maximum 500 characters | 485 characters; exact $162,022,044 / 100 practice points and finalized proofs |
| Website | Public Vercel alias |
| Supporting repository evidence | Public GitHub repository plus walkthrough, verification, tutorial and two pool manifests |
| Optional deployment links | Oracle, forecast pool and historical-session pool on Studio Explorer |
| Optional video | Left blank; no recording or public social post is claimed |
| Optional logo | Original [512px PNG](submission/bullseye-logo.png), prepared locally; not uploaded |

Exact strings and links are in [portal-fields.json](submission/portal-fields.json). The current form reports **7/7 required application fields complete**. The GitHub evidence requirement is additional to that count. Link attachments and all deployment URLs must also remain present when sending.

## Why this is a Project

The [current quality bar](https://portal.genlayer.foundation/contribution-type/41) describes complete apps whose central workflow uses actual Intelligent Contracts. Bullseye has a usable consumer interface, source-rule interpretation, publisher extraction and GEN settlement. Submit it as one project with its supporting tutorial and proof, rather than separate overlapping entries for each pool.

The form explicitly supports Studio, Studio Dev, Bradbury and Asimov explorer address URLs. StudioNet is therefore represented accurately without relabelling the deployment. Acceptance and scoring still depend on steward review. The site lists Projects separately from Milestones; milestones require an already accepted project in Project Explorer and meaningful new work.

The form's criteria are addressed by the [submission explanation](SUBMISSION.md), [architecture](ARCHITECTURE.md), [evidence policy](EVIDENCE.md), [tutorial](TUTORIAL.md) and [verification matrix](VERIFICATION.md). No guaranteed score, adoption statistic, production-chain claim or completed future payout is included.

## Owner's final action

1. Review the prepared Chrome tab, including the StudioNet limitation and evidence links. If it has been closed or reset, use `portal-fields.json` to restore the exact copy.
2. Optionally choose the provided PNG as the logo. It is 512×512 and below the form's 2 MB limit. Video is optional and can remain blank.
3. Complete the visible reCAPTCHA yourself and click **Submit Contribution** once. This final action creates the public application and sends it into steward review; it has not been performed by the agent.
4. Save the resulting contribution ID and verify it appears in My submissions. The frontend's 7/7 count alone is not a server submission or acceptance receipt.

If review requests more information, update/respond on that same submission. Do not create duplicate contributions to seek a different score. If a later category or form rule changes, use the live form's requirements.

## Operational note

Settlement currently runs when an app page is open. The daily background route and tests are implemented, but creation of its server-only CRON_SECRET still needs explicit permission. This setting is disclosed in the prepared description and is not a required Portal field. It should be enabled for ongoing unattended operation; the present submission does not advertise an active scheduler.
