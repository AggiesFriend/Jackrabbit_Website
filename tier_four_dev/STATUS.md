# Tier Four — status

Last updated: 15 November 2026 (session 5, the canon pass)

**Phase:** the full game was built in one session on 15 November 2026 at
the author's request ("use your own judgement, implement a fully featured
version, I'll test"), jumping the gated process. The author then supplied
a canon check and a proposed master timeline (`feedback/`), and the game
was brought into line with them in the same day. The timeline is a
proposal for the author to approve; the game now follows it.

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
- `tier_four_dev/playthrough-script.md`: the whole game as a readable
  script, per chapter and mode, with every choice, where it leads and the
  routes through each chapter. Regenerate after any content change with
  `node tools/script.mjs`.
- `tier_four_dev/feedback/`: the author's canon check and master timeline.

### Features

| HLD item | State |
|---|---|
| Two modes, Spoilers switch, warning every time it is turned on, remembered on the device | Done. One save slot per mode; switching returns to the title. |
| The directive: hints as deflect / hesitate / over-comply / question, truths, understandings never marked in play | Done. Hints are Aggie's lines with a `kind`; the kind is never shown. |
| Hint journal | Done: the Journal drawer's Aggie tab keeps every hint line reached. |
| SNAP plotting: hold station, cast strands, choose an anchor; moving debris and tighter deadlines at higher tiers; no timing | Done. Seeded per scene. "Let Aggie plot them" in Settings for accessibility. Late plots raise cover a little. |
| Cover meter; review scene when it fills; Jack always keeps his post | Done (`review-compliance`, cover resets to 55). |
| Links to the main site | Done. A line can link a page with `[text](../path.html)`, opening in a new tab (the escort contract links the CDS encyclopaedia entry). Characters with a page are linked on their first mention in a career, from `characters` in the campaign; the choice is saved with the play, so reloads and rewinds draw the same links. A line can opt out with `nolink` (the Apex Lounge Decker, a Tier 4 courier, not the Eclipse captain; Vega there is not Dr Eli Vega, so Vega has no entry). The data check confirms every linked page exists. |
| Refusing contracts raises suspicion | Done: Decline on the contract card. Side contracts (Cold chain, Relay down) close unflown and stay out of the debrief; main contracts draw their own pushback line and stay on the card. Either way it costs cover, goes in the journal and counts in Standing. Halsey notices a declined Cold chain. |
| People: Frank, Eleanor, Amanda, Halsey; trust gates optional scenes | Done. `t2-amanda` needs trust with Amanda. Trust shows as words in Standing. |
| Prologue in the Jackrabbit with Aggie speaking freely; two ship interfaces | Done: amber Jackrabbit theme for the prologue and the last two chapters. |
| Canon ending only; canon-breaking choices rewind with Aggie pressing | Done (`rewindTo` scenes in `t4-assignment`). |
| Debrief | Done, at the end of the career. Closing cards never give verdicts. |
| Saves after every step; export/import as a text code | Done (`T4.` codes with a checksum). |
| Rewind to the last choice | Done, within a chapter, counted in the debrief. |
| Audio: hum, ticks, theme; off by default | Done with the Web Audio API, no files. |
| Accessibility: text for every hint, "(a pause)" under reduced motion, keyboard play, resizable text | Done. Space or Enter reads on. |
| Playtest mode `?playtest` | Done: records steps, SNAP attempts, hints, understandings, rewinds, the Spoilers switch, screen size; "Copy playtest results" in the menu; "Skip to a chapter" for testers. |

### Content outline (after the canon pass)

Month 0 is the day Jack collects ALC-7293 at Rigel, aged 13. Amanda is a
year younger than Jack.

| Chapter | Month, Jack's age | Kind | Mode | Truths |
|---|---|---|---|---|
| Prometheus (prologue): the purge program, Callisto, the application | −2 to −1, 13 | scene, Jackrabbit | both | none |
| Rigel (induction): Haynes, Solberg, the asteroid, the transfer | 0, 13 | scene | both | none |
| First run: Meridian vetting; the directive at New Damascus | 0, 13 | contract | both | the inspector is Aletheion's vetting |
| The quiet run | 1, 13 | contract | both | undeclared data module; reader: its Vectarion prefix |
| Cold chain (side) | 2 to 10, 13 | contract | both | the delay is the point |
| The mentor's offer: Halsey, the panel, the reception, Frank (29 years) | 11, 13 | scene | both | none |
| Dinner at the Kowalskis': the 14th birthday | 12, 14 | scene | both | none |
| Personal effects | 13 to 35, 14 to 15 | contract | both | an absorbed firm's records |
| Relay down (side) | 13 to 35 | contract | both | the standard booking is a child's deadline |
| The observation deck (needs Amanda's trust) | about 40, 16 | scene | both | none |
| Tier 3: Halsey's office, the roast, the chronometer, Europa | 44 to 45, 16 | scene | both | none |
| The reception (Okafor, Lindqvist; the Europa echo) | 48, 17 | scene | both | none |
| Consolidation (site 19) | 48 to 56, 17 | contract | both | Vectarion under the labels; reader: the Regulator casing |
| Keller's office (relayed by Halsey; no face-to-face) | 48 to 56, 17 | scene | both | none |
| Under escort | 48 to 56, 17 | contract | both | the escort is watching Jack |
| Thirty-four years: Walters, the balcony and the data card, Laomedon | 63, 18 | scene | both | none |
| Tier four: Keller, Vance, Mercer, Halsey, Hart, the pin, Burry, the Apex Lounge | 72, 19 | scene | both | none; the spoiler-free career ends here |
| The assignment: the secret Tier 5; the Nexus-77 package | 84, 20 | contract | reader | the destruct sequence; why Nexus-77 |
| Two of her: the asteroid, the copy, both of her freed | 84, 20 | scene, Jackrabbit | reader | the directive |
| Morning Eclipse: Chen, Singh, Decker; 500 people; presumed lost | 85, 20 | contract, Jackrabbit | reader | the habitat must look occupied |

## Canon: what the feedback changed

Applied from `feedback/tier-four-canon-check.md` and
`feedback/tier-four-master-timeline.md` (the recommended options wherever
the check offered a choice):

- **Starling** is the miniaturised Dyson sphere; its component is the
  **Quantum Flux Regulator**. Aggie's revelation is that she can replicate
  the device and that the hidden manufacturing tool can make nearly every
  part. Line seven at site 19 is a rejected Regulator casing, not a second
  working device.
- **The directive** is the canon line on the New Damascus approach, sixth
  of eight deliveries in the first three days: "Aggie, please will you shut
  up about the Starling device until I say so?" It binds because Aggie
  obeys the legal owner of her hardware, and ALC-7293 is Jack's. It covers
  Starling only. Aggie's other silences are her honouring Jack's request,
  in the same breath, to be let alone to be a courier: she stops
  volunteering and nudges instead. In spoiler-free mode the scene has only
  "Not now. Please. Let me be a courier." When Jack takes it back aboard
  the Jackrabbit, the ALC-7293 Aggie hears it over the QComm and is freed
  too.
- **The secret tier is Tier 5.** Tier 4 is the known top tier (onboarding
  video, Apex Lounge, the pin). The Tier 4 promotion follows chapter 18:
  Keller, Vance, Mercer and Halsey present, the neural loyalty scan, the
  contract, Eliza Hart, the platinum pin with a red stone, Alice Burry as
  coordinator, the Apex Lounge with Markham, Kaplan (a woman, silver hair,
  augmentations), Hamza (tracks the money), Decker and Vega. Spoiler-free
  mode ends there. Keller's "a tier above, not on any board" speech opens
  the Tier 5 chapter, where Halsey is not told.
- **Timeline** per the master timeline: Tier 2 at month 11 (Jack 13, under a
  year, by a three-person panel; Frank met at the reception with 29 years'
  service), the 14th-birthday dinner at month 12, Tier 3 at month 44 ("three
  years and nine months", Halsey alone with a credential card), Frank's
  retirement at month 63 with 34 years, Tier 4 at month 72 ("six years",
  Jack 19), Tier 5 and Nexus-77 at months 84 to 85 ("seven years", Jack 20).
- **Amanda** is a year younger than Jack: about thirteen at the first dinner,
  blonde ponytail, CyberNexus student intern, flustered; "Grandfather" and
  "Gram"; sixteen and on the plasticity project at the deck scene (excited,
  uneasy about the security; Frank is the worried one); eighteen and in
  uniform at the retirement, with the Laomedon Nebula and the first kiss.
- **Nexus-77** is a CyberNexus research habitat (a cylinder, red dwarf, 70%
  research, Residential 12-B, Unit 47, visitor badges, 2300 curfew), one of
  several such habitats; the Kowalskis have had company housing there for
  eight years. About **500 residents**. The Morning Eclipse is rated for
  1,200 and carries 650.
- **Jack's identity**: his real name and Horizon registration, applied for
  from Callisto; the ageing filter is video-only; in person he looks his
  age (Solberg, the inspector and Edwin Tanner all notice).
- **Prometheus**: low power, routine docking, Aggie works through the
  VoidSuit glove, the station is stripped, the one find is the purge
  program with a Vectarion maker's mark started eighteen days after the
  Array; Aggie has no data on Vectarion; Aletheion is found on Callisto in
  a Vectarion financial disclosure. The mystery is the Abbotts who died at
  the Array, not where Starling went.
- **Rigel** is Aletheion's hub (Haynes, Solberg); Callisto is the transit
  hub of the application. Halsey (lean, close-cropped grey hair) first
  appears at the Farrow's Reach warning, month 11.
- **The Jackrabbit** is harpooned to an asteroid in a planetless red-dwarf
  system four jumps from Rigel; Aggie transferred wirelessly in an hour and
  twelve minutes; ALC-7293 returns there on a logged calibration stop, and
  Jack crosses by docking tube and connecting corridor (chapter 23's
  wording). The summons to the Eclipse goes over Ozzy's QComm.
- **The parents** are not settled: a personnel file on two couriers named
  Abbott, opened from Alpha-7's records office, is all Aggie has. The site
  19 stencil's date is "You would have been eight."
- **Frank**: 29 years at first meeting, Tier 3 for the last twelve, 34 at
  retirement, eight years past standard retirement; the mechanical
  chronometer at the Tier 3 dinner; the Europa story; the data card of
  trusted contacts on the balcony, which leads to Lucy Reeves at the end.
- **Ending**: Jack completes the upload, ALC-7293 departs on schedule, the
  ALC Aggie files him lost overboard three days later and stays inside the
  machine; Jack and the Jackrabbit head for Horizon and Lucy Reeves.
- Eleanor is a former Aletheion logistics coordinator, early sixties;
  Aggie says "since Ethereal" rather than "forty years"; Keller has grey
  eyes; "Kowalski speaks highly of you"; "choose wisely".

### Still for the author

1. The master timeline's open questions (approve the spine; Tier 5;
   the Tier 2 gap in the manuscript; Aggie's dormancy; calendar years). The
   game assumes the recommended answers.
2. The checker's manuscript copy ended at chapter 18. The Book 4 page's own
   excerpts run to chapter 26 and show Burry and Lovis in the CyberNexus
   "necessary sacrifice" scene, Jack entering Jackrabbit through a
   connecting corridor (chapter 23) and Eleanor's "home is the people"
   aboard the converted liner (chapter 26). The game keeps all three. Note
   that Alice Burry is also Aletheion's Tier 4 coordinator in chapter 18;
   if that is not an intended twist, one of them needs a new name.
3. The chapter 26 excerpt says "five years of corporate life"; the master
   timeline makes it seven by then.
4. Still invented for the game: Meridian Transfer, Oberon Station,
   Farrow's Reach, Tethys Yards, Vantage Relay, Hub Meridian, Kessler
   Habitat, QuantumGrid site 19, the Thule node; the inspector, the
   compliance officer, the escort lead, Okafor and Lindqvist, the medics;
   fifty-one hours on the signature chain and four hours for the sequence;
   Chen knowing for three years; Vega at the Apex Lounge talking about
   Europa.

## Chapter format (version 2)

One file per chapter in `tier_four/data/chapters/<id>.json`, listed in
order in `data/campaign.json` (`chapters`), with review chapters under
`reviews` (by tier, or `any`), `speakers` (key to name) and `endings`
(per mode: `title`, `text[]`) `characters` (key to `page` and `names`, for first-mention links) and the default `decline` terms (`who`, `text`, `cover`, `sideText`, `sideCover`).

| Field | Chapter | Scene | Line | Choice |
|---|---|---|---|---|
| required | `format` (2), `id`, `tier` (0 to 5), `kind` (`contract` or `scene`), `mode`, `ship` (`jackrabbit` or `alc`), `title`, `truths`, `understandings`, `start`, `scenes` | `id`, `lines`, and one of `choices`, `next`, `end`, `rewindTo` | `who`, `text` | `text`, `goto` (scene id or `end`) |
| optional | `subtitle`, `brief` (required for a contract: `client`, `route`, `cargo`, `fee`, `notes`), `decline` (contracts only: `side`, `who`, `text`, `cover`), `requires`, `unless` | `mode`, `jump` (`name`, `difficulty` 1 to 4, `deadline`, `lateCover`), `enter` (effects), `requires`, `unless` | `mode`, `kind` + `hint` + `truth` (a hint, Aggie or the Jackrabbit Aggie only), `nolink` (character keys), `requires`, `unless` | `mode`, `logs` (understanding ids), `confirm`, `requires`, `unless`, effects |

Declining sets `refused:<id>` on a main contract or `declined:<id>` on a side one.
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

`npm run check`, 15 November 2026, after the canon pass:

| Check | Result |
|---|---|
| Data validation | 22 JSON files, 21 chapters, 1 valid sample, 28 broken cases: passes |
| Engine unit tests | 26 tests: pass |
| Site rules | 107 pages checked for umami, 1 Tier Four page checked for links: passes |
| Scripted play-through | 6 careers to the end (3 seeds × 2 modes, phone by touch and desktop by mouse), no page errors, no reader-only text in spoiler-free play: passes |
| Layout sweep | 15 screens at 7 sizes, 105 screenshots: passed before the canon pass; the pass changed text only |

The play-through runs six whole careers through a real browser and takes
about six minutes. When other Playwright runs or the browser pane were busy
at the same time, one career once stopped on a tap timeout; alone it passes
every time. The per-action timeout is 15 s and a failure reports its last
steps and saves a screenshot. Run the suite on a quiet machine.

Narrowing a run while working: `TF_CHECKS=playthrough,layout`,
`TF_SCREENS=play,choices`, `TF_DEVICES=design-360`,
`TF_RUNS=reader:42:phone`, in any combination, before `npm run check`.

## Next

- The author plays both modes and feeds back. Playtest mode (`?playtest`)
  records what the process asks for; "Skip to a chapter" in the menu
  jumps around.
- Answer the timeline's open questions; adjust the few numbers that depend
  on them.
- Spelling check (en-GB) and the accessibility/performance scans from
  phase 2 are not written.
- For release: remove `noindex` from `tier_four/index.html` and the
  `tier_four` sitemap exclusion in `_config.yml`.
