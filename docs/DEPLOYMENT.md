# Hosted demonstration

Public app: https://bullseye-genlayer.vercel.app

Vercel project: `wattxs-projects/bullseye-genlayer`. First deployment ID: `dpl_FvC9W6GNSz8AD8hD7TT3iHnN45up`; immutable deployment URL: https://bullseye-genlayer-bwkmzyfyf-wattxs-projects.vercel.app. Vercel assigned the new project's first deployment to its production alias automatically. This remains an MVP demonstration, not a production-chain claim. The immutable deployment URL requires Vercel login; the public alias was verified anonymously.

The source-only `release-preview/` staging directory excludes private environment files, practice databases, generated scripts and restricted test caches. It contains app, components, lib, public and the pinned Next.js/package configuration. Its Vercel project link is ignored by Git. `NEXT_PUBLIC_PRACTICE_STORAGE=browser` is set for both build and runtime: practice, creator drafts and receipts persist in each browser without writing a serverless filesystem.

Update the stage with the corresponding source files, then run `vercel deploy --cwd release-preview` to create a protected preview. Replacing the public alias requires explicit user authorization; automatic approval review rejected `--prod` because the brief authorized a preview. Access protection was not changed. Retain the current public proof manifest until a replacement network deployment has independently verified receipts and state.

The final source changes synthetic rules to name `/api/synthetic-evidence` rather than inheriting the historical publisher URL. The public first deployment already labels the fixture synthetic and excludes it from ranking; it predates that source-field correction. The correction is published separately as a protected preview. Source and UI labels make no claim that the synthetic fixture was fetched by validators.

Corrected preview: https://bullseye-genlayer-rkxo52yxi-wattxs-projects.vercel.app (Vercel access required). Deployment ID `dpl_5j8ekeq2RSbAaPNB8iqt7daVEmwF`, ready state READY, preview target. It preserves the same finalized GenLayer proof. The complete source in this directory matches this corrected preview.
