# Tier Four — status

Last updated: 8 November 2026 (session 1)

**Phase:** 0, Foundations. Built and checked; the gate waits only on the iPhone test.
**Branches:** `tier-four` (from `main`) and `tier-four-foundations` (from `tier-four`). Local only, nothing pushed.

## Phase 0 gate

| Criterion | State |
|---|---|
| Automated checks pass on the placeholder | Passed, 8 November 2026 |
| The author opens the placeholder on their own phone over the local network | S25 Ultra: passed in Samsung Internet, 8 November 2026. Company iPhone: **to do (author)** |

## Done in session 1

- Fixed the High-Level Design's Milestones section: it said four phases, the process has five (0 to 4). The diagram now shows each phase with its gate criteria, taken from the process document.
- Updated the Development Process document: phone testing now uses `npm run serve`, and Playwright is installed locally in `tier_four_dev/` rather than assumed from cloud sessions.
- `tier_four/index.html`: placeholder entry page. It has the site's fonts and colours, `dvh` units and safe-area insets, 48 px buttons, the umami snippet before `</head>` and `noindex`. Its only text is the game's name, the book it goes with and "in development".
- `tier_four_dev/`, excluded from the site in `_config.yml`:
  - `npm run check` runs every automated check.
  - `npm run serve` serves the site on port 8000 of the local network for phone testing. It uses Node because Python isn't installed on this computer.
  - Playwright 1.64.1, pinned, from npm (Microsoft), with its Chromium build.
- `_config.yml`: `tier_four/` is left out of the sitemap until release.
- CLAUDE.md lists `tier_four/index.html` as an entry page and says `tier_four/` is hand-written, unlike the other game folders.

## Automated checks

| Check | From phase | State |
|---|---|---|
| Data validation: every JSON file in `tier_four/` parses | 0 | Running. Field and reference checks are added once data formats exist. |
| Site rules: umami on every standalone page and on no internal file (CLAUDE.md); in `tier_four/`, the snippet right before `</head>` and no broken local links | 0 | Running. Links elsewhere on the site aren't checked, so old pages can't block game work. |
| Layout sweep (Q9): no sideways scrolling, nothing off-screen, tap targets at least 44 px, body text at least 16 px, at all 7 sizes; screenshots saved | 1 (brought forward) | Running |
| Spoiler graph, engine unit tests, scripted play-through | 1 | Not started |
| Unlock bank, accessibility scan, performance budget, spelling | 2 | Not started |

Last run, 8 November 2026: all 3 checks passed. Each was also tested against a deliberately broken page (bad JSON, missing snippet, broken link, small tap target, an over-wide block) and failed as it should.

## Devices

Emulated by the layout sweep (Chromium, touch emulation under 768 px wide): 320 × 568, 360 × 640, 375 × 667, 390 × 844, 412 × 915, 768 × 1024, 1280 × 800.

Real devices for gate checks:

| Device | Stands in for | Notes |
|---|---|---|
| Samsung Galaxy S25 Ultra | Large Android, Chrome and Samsung Internet | A flagship, so it won't show slow-phone problems. Speed (Q8) needs CPU-throttled emulation as well. |
| Company iPhone (model to confirm) | Small iPhone, Safari on iOS | |

## How to try it on a phone

1. In `tier_four_dev/`, run `npm install` once, then `npx playwright install chromium` (needed only for `npm run check`).
2. Run `npm run serve`. It prints the address to open on the phone, such as `http://192.168.x.x:8000/tier_four/`.
3. If the phone can't connect, allow Node.js through Windows Firewall. The home Wi-Fi is set to Public, so the rule needs Public ticked.
4. Press Ctrl+C to stop the server.

Chrome on the S25 can't reach the local server (`ERR_TOO_MANY_RETRIES`; nothing arrives at the PC; no Chrome policies set). Samsung Internet on the same phone works, so use that for local tests. The cause is unknown.

## Next

1. Author: open the placeholder on the company iPhone, and record the result in the gate table above.
2. Phase 1, prototype. Suggested first session: agree the data format for a contract (truths, hints, understandings, spoiler tags) and extend data validation to match. Writing the tier 1 contract's outline needs the author first (content pipeline, step 1).

## Open questions

- Which model is the company iPhone? It decides whether it covers the 375 px small-iPhone class.
- Why Chrome on the S25 can't reach the local server. It matters only once Chrome-specific behaviour needs testing; a hosted preview would get round it.
- From the HLD, still open: when Jack gives the accidental directive in the book; what happens after 3 failed unlock attempts; who writes the unlock questions; whether a keyword can also turn on reader mode.
