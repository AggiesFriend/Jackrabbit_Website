# Tier Four — status

Last updated: 15 November 2026 (session 4, the "full game" experiment)

**Phase:** the author asked for a complete, fully featured build in one
session, using Claude's own judgement and the series' public material,
to test and feed back on. This jumped the gated process (phases 1 to 3)
deliberately. Everything in the game is playable in both modes, but **no
story content has had a canon review yet**: see "Canon to check" below.

**Branch:** `tier-four`, merged up to date with `main` on 15 November 2026.
Local only, nothing pushed. Not merged into `main`.

## What exists

- `tier_four/index.html`, `game.css`, `js/`: the whole game, hand-written,
  no build step. Entry page carries the umami snippet; it is `noindex` and
  out of the sitemap until the author decides to release.
- `tier_four/data/campaign.json` and `data/chapters/*.json`: 20 chapters in
  the main sequence plus the compliance review. Format version 2, below.
- `games.html` lists Tier Four (card image `images/games/tier-four.jpg`,
  schema.org entry), `book4.html` has a "Play the Game" block, `index.html`
  says five games.
- `tier_four_dev/`: checks, fixtures, tests, the autoplayer and the local
  server. `npm run check` runs everything; `npm run serve` serves the site
  for a phone. `.claude/launch.json` has a `tier-four` dev server entry.

### Features

| HLD item | State |
|---|---|
| Two modes, Spoilers switch, warning every time it is turned on, remembered on the device | Done. One save slot per mode; switching returns to the title. |
| The directive: hints as deflect / hesitate / over-comply / question, truths, understandings never marked in play | Done. Hints are Aggie's lines with a `kind`; the kind is never shown. |
| Hint journal | Done: the Journal drawer's Aggie tab keeps every hint line reached. |
| SNAP plotting: hold station, cast strands, choose an anchor; moving debris and tighter deadlines at higher tiers; no timing | Done. Seeded per scene. "Let Aggie plot them" in Settings for accessibility. Late plots raise cover a little. |
| Cover meter; review scene when it fills; Jack always keeps his post | Done (`review-compliance`, cover resets to 55). |
| People: Frank, Eleanor, Amanda, Halsey; trust gates optional scenes | Done. `t2-amanda` needs trust with Amanda. Trust shows as words in Standing. |
| Prologue in the Jackrabbit with Aggie speaking freely; two ship interfaces | Done: amber Jackrabbit theme for the prologue and act 4's last two chapters. |
| Canon ending only; canon-breaking choices rewind with Aggie pressing | Done (`rewindTo` scenes in `t4-assignment`). |
| Debrief | Done, at the end of the career: per truth, hints heard or missed, readings right or misread. Closing cards never give verdicts. |
| Saves after every step; export/import as a text code | Done (`T4.` codes with a checksum). |
| Rewind to the last choice | Done, within a chapter, counted in the debrief. |
| Audio: hum, ticks, theme; off by default | Done with the Web Audio API, no files. |
| Accessibility: text for every hint, "(a pause)" under reduced motion, keyboard play, resizable text | Done. Space or Enter reads on. |
| Playtest mode `?playtest` | Done: records steps, SNAP attempts, hints, understandings, rewinds, the Spoilers switch, screen size; "Copy playtest results" in the menu; "Skip to a chapter" for testers. |

### Content outline

| Chapter | Kind | Mode | Truths |
|---|---|---|---|
| Prometheus (prologue) | scene, Jackrabbit | both | none: Aggie speaks freely |
| Callisto (induction) | scene | both | none |
| First run | contract | both | the inspector is Aletheion's vetting |
| The quiet run | contract | both | undeclared data module; reader: its Vectarion prefix |
| Cold chain (side) | contract | both | the delay is the point |
| The mentor's offer | scene | both | none |
| Dinner at the Kowalskis' | scene | both | none |
| Personal effects | contract | both | an absorbed firm's records |
| Relay down (side) | contract | both | the standard booking is a child's deadline |
| The observation deck | scene, needs Amanda's trust | both | none |
| Tier 3 | scene | both | none |
| The inner circle | scene | both | none |
| Consolidation (site 19) | contract | both | Vectarion under the labels; reader: the modulator rig |
| Keller | scene | both | none |
| Under escort | contract | both | the escort is watching Jack |
| Thirty-seven years | scene | both | none |
| Tier four | scene | both | none: spoiler-free career ends here |
| The assignment | contract | reader | the destruct sequence; why Nexus-77 |
| Two of her | scene, Jackrabbit | reader | the directive |
| Morning Eclipse | contract, Jackrabbit | reader | the station must look occupied |

## Canon to check

Things the game asserts that come from Claude's judgement, not the books
or the site. Each is easy to change in the chapter JSON.

1. **The directive's wording and moment.** In `t1-first-run` (reader mode),
   Jack, stressed in a barge lane on his first run, says: "Stop. I don't
   want to hear it. Nothing you've found, nothing you suspect, nothing out
   of their systems. Not Vectarion, not Starling, none of it. Not a word.
   ... That's an order." Aggie treats it as standing. It is written so she
   may still answer about things Jack can see himself (the manifest weight)
   but not volunteer anything she found. The HLD's open question on when
   the directive happens in the book is still open; the game places it at
   the end of act 1's first contract. In spoiler-free mode the same scene
   has Jack say "Not now. Please," and Aggie simply stops offering.
2. **What Starling is.** `t4-two-of-her` has Jackrabbit-Aggie say the
   Quantum Flux Modulator is a substrate for an intelligence like her to
   live in without a ship: small, cold, replicable. The site only says the
   QFM is a Starling component and that AGI replication across hardware
   makes Aggie's proliferation possible. If the book says otherwise, this
   is one line to change.
3. **Jack's parents.** The same chapter says Albert and Dorothy were on a
   Vectarion site roster as technicians before Alpha-7, and were "moved"
   into indenture. Invented as a hook, deliberately left unresolved.
4. **The mask.** Written as a digital alteration on every display and
   channel (from the Book 4 excerpt), with Jack's own name kept. How Jack
   passes in person is left unexplained.
5. **Places invented for the game:** Meridian Transfer, Oberon Station,
   Farrow's Reach, Tethys Yards, Vantage Relay, Hub Meridian (Aletheion's
   regional seat), Kessler Habitat, QuantumGrid site 19, the Thule node,
   "the quiet yard" where the Jackrabbit is berthed. Callisto, Nexus-77,
   Prometheus, the Morning Eclipse and Dead End Drift are from the books.
6. **People invented:** the inspector, the compliance officer, the escort
   lead, the receiving agent, the Kessler and Farrow's medics, the
   displaced Tethys owner. Hamza and Kaplan are from the chapter 20
   excerpt; Burry and Lovis from chapter 25. Edwin Tanner (OVAS) is not
   used.
7. **Nexus-77 numbers:** nine thousand people; fifty-one hours on the
   package's signature chain; four hours for the destruct sequence.
8. **Chen** knows Jack is a courier and has told nobody (three years).
9. **Frank's retirement** at thirty-seven years, to Nexus-77 with
   Eleanor; Amanda stays at the CyberNexus facility there.
10. **The ending** has the Aggie on ALC-7293 hold the station core blind
    while the Jackrabbit and the Eclipse empty the ring, and Jack upload
    the package to the empty station and depart on schedule. The CyberNexus
    "necessary sacrifice" scene follows, as in the chapter 25 excerpt.

Dialogue for Frank, Eleanor and Amanda follows the character pages in
substance; the two lines closest to the excerpts (Frank's offer, Eleanor on
home) are paraphrased, not verbatim.

## Chapter format (version 2)

One file per chapter in `tier_four/data/chapters/<id>.json`, listed in
order in `data/campaign.json` (`chapters`), with review chapters under
`reviews` (by tier, or `any`), `speakers` (key to name) and `endings`
(per mode: `title`, `text[]`).

| Field | Chapter | Scene | Line | Choice |
|---|---|---|---|---|
| required | `format` (2), `id`, `tier` (0 to 4), `kind` (`contract` or `scene`), `mode`, `ship` (`jackrabbit` or `alc`), `title`, `truths`, `understandings`, `start`, `scenes` | `id`, `lines`, and one of `choices`, `next`, `end`, `rewindTo` | `who`, `text` | `text`, `goto` (scene id or `end`) |
| optional | `subtitle`, `brief` (required for a contract: `client`, `route`, `cargo`, `fee`, `notes`), `requires`, `unless` | `mode`, `jump` (`name`, `difficulty` 1 to 4, `deadline`, `lateCover`), `enter` (effects), `requires`, `unless` | `mode`, `kind` + `hint` + `truth` (a hint, Aggie only), `requires`, `unless` | `mode`, `logs` (understanding ids), `confirm`, `requires`, `unless`, effects |

Effects: `cover` (±), `trust` (name to ±), `set` and `clear` (flags),
`note` (journal text). Conditions are flags or comparisons such as
`cover>=60` and `trust.amanda>=1`. Logging an understanding sets
`read:<truth>` or `misread:<truth>` and `logged:<id>`; a closed chapter sets
`done:<id>`. Truths: `id`, `mode`, `text`. Understandings: `id`, `mode`,
`truth`, `correct`, `journal`.

Rules the validator enforces (`lib/chapter.mjs`): kebab-case ids, unique
within a chapter and across files (file name = id); unknown fields are
errors; an item is never shown in a mode its chapter, scene or truth is
hidden in; every step leads to a scene shown wherever the step is; at most
2 truths per mode, each with a hint and a correct understanding in that
mode; every scene reachable and the end reachable in every mode; speakers
listed in the campaign.

## Automated checks

`npm run check`, 15 November 2026:

| Check | Result |
|---|---|
| Data validation | 22 JSON files, 21 chapters, 1 valid sample, 28 broken cases |
| Engine unit tests | 26 tests |
| Site rules | passes |
| Scripted play-through | 6 careers to the end (3 seeds × 2 modes, phone by touch and desktop by mouse), no page errors, no reader-only text in spoiler-free play |
| Layout sweep | 15 screens at 7 sizes; see the latest run's notes below |

`TF_SCREENS=play,choices TF_DEVICES=design-360 npm run check` narrows the
sweep while working on a screen.

## Next

- The author plays both modes and feeds back. Playtest mode (`?playtest`)
  records what the process asks for; "Skip to a chapter" in the menu
  jumps around.
- Canon review of the list above; fix lines in the JSON.
- Spelling check (en-GB) and the accessibility/performance scans from
  phase 2 are not written.
- For release: remove `noindex` from `tier_four/index.html` and the
  `tier_four` sitemap exclusion in `_config.yml`.
