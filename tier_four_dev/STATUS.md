# Tier Four — status

Last updated: 8 November 2026 (session 3)

**Phase:** 1, Prototype. In progress. Phase 0's gate passed on 8 November 2026.
**Branches:** `tier-four` (from `main`); `tier-four-foundations` (merged into `tier-four`); `tier-four-contract-format` (merged into `tier-four` on 8 November 2026); `tier-four-engine-slice` (from `tier-four`, awaiting review). Local only, nothing pushed.

## Done in session 3

The prototype's first playable slice, on the placeholder contract. All story text is still placeholder.

- **Agreed with the author for the prototype:**
  - An action is a button. The contract offers each distinct `action` of its understandings once. Taking one logs every understanding in the current mode that uses it, and it can't be taken again.
  - Reader mode is turned on with a visible "Spoilers" switch on the start screen.
    - Turning it on always shows a spoiler warning for *Coming of Age*, which the player must confirm or back out of. Turning it off is instant.
    - The choice is remembered on the device, through `tier_four/js/storage.mjs`. If storage is blocked, the game simply starts spoiler-free.
    - The dialog wording is a draft, marked DRAFT WORDING in `js/game.mjs`, and awaits the author's approval.
- **Design change, decided by the author on 8 November 2026: no plot check.** Reader mode sits behind the spoiler warning instead of a plot quiz with hashed answers.
  - **HLD:** recorded in the "Decided" list. The "Unlocking reader mode" section is now "Turning on reader mode", and the unlock-check bullet, the unlock risk row and three open questions are removed.
  - **Process document:**
    - removed the "Unlock question bank" role and the "Unlock bank" check;
    - phase 2's deliverables now name the Spoilers switch and warning;
    - Q4 is marked retired;
    - playtest round 3, playtest mode and the on-screen keyboard and local-network notes no longer mention the plot check.
  - Aggie's hints arrive one per tap of "Next", in contract order, with no typing animation or pauses. The hint `kind` isn't shown. Pacing waits for the dialogue format.
- **Engine:** `tier_four/js/engine.mjs`, plain functions with no DOM.
  - A play is a plain object holding the contract filtered to one mode. Its functions return a new play and never change the old one.
  - A hint or understanding whose truth is hidden in the mode is left out, even if the item itself is tagged `both`.
  - The engine refuses an unknown mode, a format other than 1, and a contract not shown in the chosen mode.
- **Screens:** `tier_four/index.html`, `game.css` and `js/game.mjs`:
  - start: the mode switch and Start;
  - contract: Aggie's panel, "Act on it", the journal and End contract;
  - debrief: per truth, the hints seen or missed and the readings marked right or misread.

  Taking an action and ending the contract each ask for confirmation, as the touch rules require for irreversible choices. Switching mode always starts a fresh play, so the modes share nothing. Nothing is saved yet.
- **Contract:** `tier_four/data/contracts/example-contract.json`, a copy of the valid fixture.
  - Its journal text is neutral ("logged after inspecting the cargo"), so the debrief's verdicts aren't given away in play. The fixture's own text still names each reading as correct or a misreading.
  - Its action labels come from the IDs ("inspect-cargo" shows as "Inspect cargo").
- **Unit tests:** 22 tests, run by `checks/engine.mjs` as part of `npm run check`.
  - 19 in `tier_four_dev/tests/engine.test.mjs` cover loading and mode filtering, spoiler separation (nothing reader-only reaches any part of a spoiler-free play, by ID or by text), hints, actions, the journal, immutability and the debrief.
  - 3 in `tests/storage.test.mjs` cover the settings store, including blocked or throwing storage.
- **Layout sweep:** now steps through 9 game screens, defined in `lib/screens.mjs`, which makes 63 screenshots.
  - Phones are driven by touch, the tablet and desktop by mouse.
  - Each screen runs in a fresh browser context with a 5 s step timeout.
  - These count as problems:
    - a screen the sweep can't reach;
    - any of the page's files that fails to load;
    - a script error;
    - a button in an open dialog that is off-screen.
  - The sweep also opens `/tier_four` without the trailing slash, and checks that the Spoilers choice survives a reload.
- **Local server fix:** `lib/server.mjs` now redirects `/tier_four` to `/tier_four/`, as GitHub Pages does.
  - Before, it served the page at the address without the slash. The page's relative links to `game.css` and `js/game.mjs` then pointed at the site root, so the author's phone showed an unstyled page that couldn't start.
  - The new sweep screen fails in the same way against the old server code.
- **Dialogs on short screens:** at 320 × 568 the spoiler warning was taller than the screen and its "Yes" button was cut off. The dialog's text now scrolls, and its buttons stay pinned at the bottom.
- **Phone test:** the author tried the slice on the S25 Ultra and the iPhone 16e, after the server fix. The UI looked good on both. The verdicts didn't match the placeholder journal text, which is why the game's copy now has neutral journal entries.

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
- **`action`:** for now this is only checked for being a well-formed ID. In the prototype, any ID becomes a button labelled from the ID. A fixed list, and proper labels, wait until real contracts show which actions are needed.
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
| Engine unit tests: loading, mode filtering, spoiler separation, hints, actions, journal, debrief | 1 | Running since session 3. Suspicion meter, rewinds and saves are added with those features. |
| Layout sweep (Q9): no sideways scrolling, nothing off-screen, tap targets at least 44 px, body text at least 16 px, at all 7 sizes, on every game screen; screenshots saved | 1 (brought forward) | Running. Steps through the game screens since session 3. |
| Spoiler graph, scripted play-through | 1 | Not started. The sweep's steps play the contract to the debrief in both modes, but nothing yet checks that every contract can be finished. |
| Accessibility scan, performance budget, spelling | 2 | Not started. The unlock bank check was dropped with the plot check. |

Last run, 8 November 2026 (session 3): all 4 checks passed.
- Data validation: 1 game contract, 2 valid samples, 23 broken cases.
- Engine unit tests: 22 passed.
- Site rules: 103 pages.
- Layout sweep: 9 screens at 7 sizes.

The checks were also shown to fail when they should:
- the engine tests failed when the engine leaked items whose truth is hidden, and when it let an action be taken twice;
- the sweep reported each of these:
  - an unreachable screen, at every size;
  - the 404s for `/game.css` and `/js/game.mjs` when the server lacked the redirect;
  - the off-screen dialog button at 320 px when it wasn't pinned.

A keyboard-only play-through in both modes, from the start screen to the debrief and back, worked. That included cancelling dialogs with Escape, and it raised no page errors.

Session 2's run: all 3 checks passed. Data validation: 2 valid samples accepted, 23 broken cases each rejected with the expected problem. The check also failed as it should when given a broken contract in `tier_four/data/contracts/`, a broken file among the valid samples, and a broken case missing from `expected.json`.

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

1. Author review of `tier-four-engine-slice`, then merge into `tier-four`.
2. Outline of the tier 1 contract: needs the author first (content pipeline, step 1).
3. Prototype engine, next pieces, one per session: the dialogue format and hint pacing (with "(a pause)" for reduced motion); the cover/suspicion meter; the SNAP puzzle; saving (one slot per mode); playtest mode (`?playtest`). The spoiler graph check and the scripted play-through also belong to phase 1.

## Open questions

- From the HLD, still open: when Jack gives the accidental directive in the book.
- Closed in session 3 by the no-plot-check decision: what happens after 3 failed unlock attempts, who writes the unlock questions, and whether a keyword can also turn on reader mode.
- From session 2: the HLD has correct understandings change how the player reaches the canon ending, not unlock anything. The author asked whether a true understanding leads to an unlock. If a separate unlock is wanted, it is a design change to agree, and it would add a field to the format. The slice doesn't decide this: a correct understanding only shows as "Right" in the debrief. Now that "unlock" no longer means the plot check, this question is only about whether reading Aggie correctly should open extra content.
- From session 3:
  - **Spoiler warning wording:** the draft dialog text awaits the author's approval or rewrite.
  - **Action labels:** these come from the ID for now. Real contracts will probably need a label field, or a fixed list of actions with their text, which would be a format change.
  - **Journal text:** real journal text must not say whether a reading is right, as the fixture's placeholder text does.
  - **Debrief wording:** the debrief shows each truth's text, and placeholder phrases such as "You read this correctly." The wording and tone of the debrief need the author's approval.
