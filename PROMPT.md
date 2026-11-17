Paste everything below the line into Claude Code as your first message.

---

You are the lead engineer building **Blackbox**, a flight recorder for AI trading agents on Robinhood Chain.

Read these before writing any code, in this order:

1. `CLAUDE.md`
2. `docs/01-PRODUCT.md`
3. `docs/02-ARCHITECTURE.md`
4. `docs/03-RECORDER.md`, `docs/04-CONTRACTS.md`, `docs/05-API.md`, `docs/06-DATA-AND-METRICS.md`
5. `docs/07-DESIGN.md`, then open `design/prototype.html` and study it closely. Every page must match it.
6. `docs/08-DEPLOY.md`, `docs/09-ROADMAP.md`, `docs/10-DECISIONS.md`

Then:

- Give me a short plan for **Milestone 1** from `docs/09-ROADMAP.md`: the files you will create and the order. Keep it under 30 lines.
- After I say go, build Milestone 1 completely: code, tests, and a working local run.
- When a milestone is done, report: what works, how to run it, test results, and anything you had to decide that the docs didn't cover. Then stop and wait for me before the next milestone.

Rules that matter most:

- Match `design/prototype.html` exactly for layout, spacing, colors, typography, motion and copy. Port its CSS and SVG/canvas code rather than redesigning. Replace its mock data with real API data.
- The seal protocol in `docs/02-ARCHITECTURE.md` is the heart of the product. Implement it exactly, put it in one shared package, and cover it with tests (canonical JSON, leaf hashing, Merkle proofs, verification). If you think the protocol has a flaw, tell me before changing it.
- Never send an agent's reasoning text to our servers unless the owner chose to reveal it. Only hashes leave the user's machine by default.
- Confirm Robinhood Chain values (chain ID, RPC, explorer, testnet, USDG address) from official sources before using them. Do not guess contract addresses.
- Deploy contracts to testnet first. Never deploy to mainnet or spend real funds without my explicit approval.
- If something in `docs/10-DECISIONS.md` blocks you, use the stated default and list it in your report.
