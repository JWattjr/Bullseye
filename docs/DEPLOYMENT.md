# Hosted demonstration

Public app: https://bullseye-genlayer.vercel.app

Vercel project: `wattxs-projects/bullseye-genlayer`. First deployment ID: `dpl_FvC9W6GNSz8AD8hD7TT3iHnN45up`; immutable deployment URL: https://bullseye-genlayer-bwkmzyfyf-wattxs-projects.vercel.app. Vercel assigned the new project's first deployment to its production alias automatically. This remains an MVP demonstration, not a production-chain claim. The immutable deployment URL requires Vercel login; the public alias was verified anonymously.

The source-only `release-preview/` staging directory excludes private environment files, practice databases, generated scripts and restricted test caches. It contains app, components, lib, public and the pinned Next.js/package configuration. Its Vercel project link is ignored by Git. `NEXT_PUBLIC_PRACTICE_STORAGE=browser` is set for both build and runtime: practice, creator drafts and receipts persist in each browser without writing a serverless filesystem.

Update the stage with the corresponding source files, then run `vercel deploy --cwd release-preview` to create a protected preview. After verification and authorization, `vercel promote <deployment-url>` updates the public alias. Access protection was not changed. Retain the current public proof manifest until a replacement network deployment has independently verified receipts and state.

The final source changes synthetic rules to name `/api/synthetic-evidence` rather than inheriting the historical publisher URL. Synthetic practice remains excluded from ranking and makes no claim that its fixture was fetched by validators.

Corrected preview: https://bullseye-genlayer-rkxo52yxi-wattxs-projects.vercel.app (Vercel access required). Deployment ID `dpl_5j8ekeq2RSbAaPNB8iqt7daVEmwF`. It preserves the same finalized GenLayer proof.

On October 1, 2026, the user explicitly approved promotion of this verified correction. `vercel promote` created deployment `dpl_8ha3HBU44oFaBQw8GZT76bApVKC2`, but hosted verification caught a missing production environment setting: `/api/league` attempted `mkdir /var/task/.data` and returned HTTP 500. READY alone was not treated as working verification.

The nonsecret `NEXT_PUBLIC_PRACTICE_STORAGE=browser` setting was then saved in the project's Production environment with Config visibility. The verified source was redeployed with `vercel deploy --prod --yes`, rather than relying on preview runtime configuration surviving promotion. Keep this project setting when updating production. The earlier approval block is resolved by the user's explicit authorization. See [promotion.log](promotion.log), [production deployment](production-deployment.log), [hosted browser verification](browser-hosted-verification.json), and [public proof verification](public-protocol-verification.json).

Current verified production deployment: `dpl_D8Lntc4rnwN7p9Ud1yQRextqjrvF`, https://bullseye-genlayer-25j2twckn-wattxs-projects.vercel.app, aliased to https://bullseye-genlayer.vercel.app. Anonymous league and proof endpoints return HTTP 200; the proof matches the finalized manifest. The full desktop/mobile browser suite passed on the public alias, including 100/0 historical scores, reload persistence, evidence, drafts, accelerated rehearsal and test-injected error recovery. A separate fresh-browser check confirmed the synthetic settlement link uses `/api/synthetic-evidence`.
