<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## GenLayer submission links — standing owner correction

Before filling a Portal form, generating submission evidence, or publishing explorer links, verify the current network's canonical explorer against official documentation and open the actual deployed contract page. Never infer an explorer URL from the RPC/IDE host or reuse an unverified template.

Verified on October 15, 2026 for StudioNet (chain 61999):
- Contract: `https://explorer-studio.genlayer.com/address/<address>`
- Transaction: `https://explorer-studio.genlayer.com/tx/<hash>`
- `https://studio.genlayer.com/api` is the RPC endpoint. `https://studio.genlayer.com/contracts/<address>` and `/transactions/<hash>` are incorrect evidence links.

Open every submitted contract link and confirm the displayed address and Contract page; confirm receipt links identify the expected transaction. The Portal must recognize contract evidence as **GenLayer Explorer Contract** without URL-format errors. Investigate failed detection; do not force a contract into Other to conceal an invalid URL. Transaction receipts may legitimately use Other.

Check generated drafts, their generators and app evidence links together. A test that asserts the same hard-coded URL assumption as the implementation is not independent verification: also open the destination and inspect the real record. Preserve dated raw proof artifacts; record later link corrections separately. For other networks, discover and verify their own explorer rather than substituting this StudioNet host.
