# 07: Design system

Source of truth: `design/prototype.html`. Open it in Chrome at 1440 px and 390 px and keep it side by side while building. Port its CSS and drawing code; don't re-invent.

## Tokens

Put these in `apps/web/app/globals.css` as CSS variables and map them in `tailwind.config.ts` (`colors.bg`, `colors.tx2`, etc.).

```css
:root{
  --bg:#07080F; --bg2:#0A0C16; --bg3:#0E1120;
  --bd:rgba(255,255,255,.07); --bd2:rgba(255,255,255,.12); --bd3:rgba(255,255,255,.18);
  --tx:#F3F5F9; --tx2:#A2A9BA; --tx3:#666D80;
  --em:#FF6A1F; --em2:#FF9A57; --emg:linear-gradient(180deg,#FF8E45 0%,#FF5F1A 100%);
  --em-soft:rgba(255,106,31,.12);
  --ice:#9CC3FF; --vi:#7C6CFF;
  --up:#3EE09A; --down:#FF6B7A;
  --ease:cubic-bezier(.2,.7,.1,1);
}
```

- Ember orange (`--em`) is the brand: flight recorders are international orange. Use it only for primary buttons, the REC indicator, seal markers, the playhead and the featured card border.
- Ice blue (`--ice`) marks proof: seal hashes, sealed state, coverage bars.
- Green and red are for profit and loss only.
- `--tx3` is `#767E91` on the site (prototype: `#666D80`). The prototype value is 3.86:1 against `--bg`, below the 4.5:1 this document requires; `#767E91` is the smallest step that passes on the page and on glass cards. Set in `apps/web/app/site.css`; the copied prototype CSS is untouched.
- Never use a white or light background. Never pair black with gold.

## Typography

- Geist for everything, Geist Mono for hashes, block numbers, addresses, times and code. Load with `next/font/google` (`Geist`, `Geist_Mono`).
- Headings: weight 600, tight tracking. Hero h1 `clamp(48px,7.4vw,96px)`, line-height .96, letter-spacing −0.055em. Section h2 `clamp(36px,4.4vw,58px)`, −0.045em.
- Big headings use the `.grad` text fill (white to `#A9B0C3`).
- Body 15.5 px / 1.6, letter-spacing −0.008em. Secondary text `--tx2`, tertiary `--tx3`.
- Sentence case everywhere. No all-caps labels except the `REC` tag.

## Surfaces and shape

| Element | Spec |
|---|---|
| Glass card `.glass` | `linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015))`, 1px `--bd` border, radius 22px, inset top highlight `0 1px 0 rgba(255,255,255,.055)` |
| Featured card `.glow-border` | dark fill + gradient border (ember to faint white) via `padding-box` / `border-box` backgrounds |
| Spotlight hover `.spot` | radial highlight that follows the pointer (`--mx`, `--my` set on `pointermove`) |
| Buttons | pill radius, height 46 (38 small). Primary: ember gradient, dark text, inset highlight, soft ember shadow. Ghost: translucent white with `--bd2` border |
| Pills / chips | radius 999px |
| Nav | fixed floating pill, blurred glass, max width 1140px, 14px from top |
| Page background | `--bg` + subtle fractal noise overlay (SVG turbulence at 4.5% opacity) + one soft ember glow at the top. Grid lines only behind the landing hero |

## Motion (keep it to these)

1. Hero entrance: pill, headline, subline, CTAs rise in sequence (0.9 s, staggered 100 ms); the console tilts from `rotateX(18deg)` to flat (1.6 s). Runs once on load.
2. Hero console: canvas waveform scrolls continuously; new feed rows flash ember and go from "Sealing" (spinner) to "Sealed #block".
3. User-triggered only: spotlight hover, button lift, replay playback, chart crosshair, toast.
4. `prefers-reduced-motion`: disable all of the above, show the final state.

## Components to build (names suggested)

| Component | Prototype reference |
|---|---|
| `Nav`, `Footer`, `Toast`, `CopyChip` | header, footer, `.toast`, `.chip-copy` |
| `HeroConsole` (client) | `.console` with `ConsoleSidebar`, `Waveform` (port `startWave` canvas code), `LiveFeed` (SSE), `LatestSealCard`, `MiniArea` |
| `Bento` tiles | `ReplayTile`, `SealTile`, `PnlTile`, `AlertsTile`, `PrivateTile` |
| `RewriteDemo` (client) | `.try` card; use `packages/protocol` leaf hashing on the featured revealed record |
| `PodiumCard` | `.pc` |
| `MarketsList` | `.mk` |
| `CodeWindow` | `.code` with tabs |
| `PricingGrid` | `.plans` |
| `FeeFlow` | `.flow` bars |
| `LeaderboardTable` | `.lb`, sortable headers, `Spark`, `CoverageBar`, mobile column hiding |
| `AgentHeader`, `StatTile` | `.ah`, `.stat` |
| `EquityChart` (client) | port `drawEquity`: glow line, gradient area, crosshair, tooltip |
| `Replay` (client) | `.mini` timeline, `.r-list`, `.r-detail`, play/pause, keyboard |
| `VerifyForm`, `VerifyResult` | `.vform`, `.vcard`, `.checks` |
| `Avatar` | deterministic gradient from the agent id (see `PAIRS` in the prototype) |

## Built in Milestone 2

`apps/web/app/globals.css` is the prototype's stylesheet copied verbatim (Prettier skips it). Everything new is in `apps/web/app/site.css` with the same tokens: demo labels, mobile menu, wallet menu, waitlist form and dialog, FAQ, docs and legal layouts, connect steps, dashboard, private / late / no-reasoning / gap states, trust chip, pager, skeletons. The leaderboard's cells have 10px side padding (prototype: 12px) to fit the trust column.

## Responsive

Breakpoints from the prototype: 1100, 820, 640 px. At ≤ 820 the console drops its sidebar; ≤ 1100 it drops the right panel. Leaderboard on ≤ 640 shows rank, agent and return only. Check every page at 1440 and 390.

## Accessibility

Visible focus ring (2px ember, 3px offset), keyboard access for table rows, podium cards, replay list (up/down) and timeline markers, `aria-live` for verify results and toasts, chart `role="img"` with a text summary, contrast ≥ 4.5:1 for body text.
