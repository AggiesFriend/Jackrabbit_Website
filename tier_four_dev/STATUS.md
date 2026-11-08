# Tier Four — status

Last updated: 8 November 2026 (session 2)

**Phase:** 1, Prototype. In progress. Phase 0's gate passed on 8 November 2026.
**Branches:** `tier-four` (from `main`); `tier-four-foundations` (merged into `tier-four`); `tier-four-contract-format` (merged into `tier-four` on 8 November 2026). Local only, nothing pushed.

## Done in session 2

- Agreed the contract data format with the author (below), version 1.
- Added two decisions to the HLD's "Decided on 8 November 2026" list: main-sequence contracts have 1 or 2 discoverable truths, while side contracts may have none; and an understanding may be a misreading.
- `tier_four_dev/lib/contract.mjs` validates it. `checks/data.mjs` runs it on every contract in `tier_four/data/contracts/` (none yet), plus a self-test against the samples in `tier_four_dev/fixtures/contracts/`.
- Fixtures, all placeholder text with no canon:
  - `valid/example-contract.json`: a main-sequence contract shown in both modes, with one truth in both modes and one in reader mode only, and a misreading;
  - `valid/example-side-contract.json`: a side contract with no truths;
  - `invalid/`: 23 broken cases, one mistake each. `invalid/expected.json` gives the reason each case is broken and the problem it must be reported with.

## Contract format (version 1)

One contract per JSON file in `tier_four/data/contracts/`.

| Field | Contract | Truth | Hint | Understanding |
|---|---|---|---|---|
| `id` | kebab-case, unique across files | kebab-case | kebab-case | kebab-case |
| `mode` | `spoiler-free`, `reader` or `both` | same | same | same |
| other | `format` (1), `tier` (1 to 4), `sequence` (`main` or `side`), `title`, `truths`, `hints`, `understandings` | `text` | `truth`, `kind` (`deflect`, `hesitate`, `over-comply`, `question`), `text` | `truth`, `action`, `correct` (true or false), `journal` |

Item IDs are unique within their contract. All fields are required, and an unknown field is an error, which catches typos.

Rules:

- **References:** every hint and understanding points to a truth that exists in the same contract.
- **Truths:** in each mode it appears in, a main-sequence contract has 1 or 2 truths. A side contract may have none. Each truth shown in a mode has, in that mode, at least one hint and at least one correct understanding.
- **Understandings:** an understanding with `"correct": false` is a misreading the player can log. Understandings are never marked right or wrong during play. Correctness only changes how the player reaches the canon ending, and what the debrief shows.
- **Spoiler tags:** an item can't be shown in a mode its contract isn't in. A hint or understanding can't be shown in a mode where its truth is hidden. This is a static check on each file. The spoiler graph check, which follows what play can actually reach, is still to come.
- **`action`:** for now this is only checked for being a well-formed ID. It is checked against a list once the engine defines its actions.
- **Hint pacing:** pauses, typing speed and the "(a pause)" text for reduced motion belong to the dialogue format, which isn't agreed yet.

## Phase 0 gate

| Criterion | State |
|---|---|
| Automated checks pass on the placeholder | Passed, 8 November 2026 |
| The author opens the placeholder on their own phone over the local network | Passed, 8 November 2026: S25 Ultra in Samsung Internet, iPhone 16e in Safari |

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
| Data validation: every JSON file in `tier_four/` parses; contracts match the contract format (fields, references, spoiler tags); self-test against valid and broken samples | 0 | Running. Contract checks added in session 2. Dialogue and other formats are added once agreed. |
| Site rules: umami on every standalone page and on no internal file (CLAUDE.md); in `tier_four/`, the snippet right before `</head>` and no broken local links | 0 | Running. Links elsewhere on the site aren't checked, so old pages can't block game work. |
| Layout sweep (Q9): no sideways scrolling, nothing off-screen, tap targets at least 44 px, body text at least 16 px, at all 7 sizes; screenshots saved | 1 (brought forward) | Running |
| Spoiler graph, engine unit tests, scripted play-through | 1 | Not started |
| Unlock bank, accessibility scan, performance budget, spelling | 2 | Not started |

Last run, 8 November 2026 (session 2): all 3 checks passed. Data validation: 2 valid samples accepted, 23 broken cases each rejected with the expected problem. The check also failed as it should when given a broken contract in `tier_four/data/contracts/`, a broken file among the valid samples, and a broken case missing from `expected.json`.

In session 1, each check was also tested against a deliberately broken page (bad JSON, missing snippet, broken link, small tap target, an over-wide block) and failed as it should.

## Devices

Emulated by the layout sweep (Chromium, touch emulation under 768 px wide): 320 × 568, 360 × 640, 375 × 667, 390 × 844, 412 × 915, 768 × 1024, 1280 × 800.

Real devices for gate checks:

| Device | Stands in for | Notes |
|---|---|---|
| Samsung Galaxy S25 Ultra | Large Android, Chrome and Samsung Internet (both work over the local network) | A flagship, so it won't show slow-phone problems. Speed (Q8) needs CPU-throttled emulation as well. |
| Company iPhone 16e, iOS 27.0 | Standard iPhone, Safari on iOS | 390 px wide, so it covers the 390 × 844 class. The 375 and 320 px classes rely on emulation. |

## How to try it on a phone

1. In `tier_four_dev/`, run `npm install` once, then `npx playwright install chromium` (needed only for `npm run check`).
2. Run `npm run serve`. It prints the address to open on the phone, such as `http://192.168.x.x:8000/tier_four/`.
3. If the phone can't connect, allow Node.js through Windows Firewall. The home Wi-Fi is set to Public, so the rule needs Public ticked.
4. Press Ctrl+C to stop the server.

If a phone browser fails with `ERR_TOO_MANY_RETRIES` and nothing reaches the PC, the browser probably lacks Android's "Nearby devices" permission, which it needs to reach the local network. Grant it in Settings → Apps → the browser → Permissions. This was the cause for Chrome on the S25.

## Next

1. Done: `tier-four-contract-format` reviewed and merged into `tier-four`.
2. Outline of the tier 1 contract: needs the author first (content pipeline, step 1). Alternatively, the prototype's engine can start on the placeholder sample contract while the outline is written.

## Open questions

- From the HLD, still open: when Jack gives the accidental directive in the book; what happens after 3 failed unlock attempts; who writes the unlock questions; whether a keyword can also turn on reader mode.
- From session 2: the HLD has correct understandings change how the player reaches the canon ending, not unlock anything. The author asked whether a true understanding leads to an unlock. If a separate unlock is wanted, it is a design change to agree, and it would add a field to the format.
