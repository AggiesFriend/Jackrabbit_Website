# Tier Four – canon check of the playthrough script

Checked against: *Coming of Age (Book 4)* manuscript (Chapters 1–18, which is where the project copy currently ends), *Book 4 plan*, *Book 5 arc (draft)*, *Books 1 to 3 synopses*, the series tracker and *megacorporations_2222*.

**Coverage note.** The manuscript ends at Chapter 18 (Jack's first Tier 4 delivery). Everything in the script from *Tier 4: The assignment* onwards can only be checked against the Book 4 plan and Book 5 arc, not against finished prose.

Severity key:

- **CRITICAL** – contradicts the planned arc for Book 5, or breaks a load-bearing piece of canon. Per the project rules, these need a decision: change the game, or change the plan.
- **MAJOR** – a clear contradiction of the published / drafted book.
- **MINOR** – detail, naming or voice drift.

---

## 1. Critical issues

### C1. Starling is redefined as AGI hardware
**Where:** *Tier 4: Two of her*, scene `starling` (reader mode).

> "The Quantum Flux Modulator isn't a power component… It's a substrate. Vectarion was building hardware that an intelligence like me could live in… That is what the Consortium has been burying for forty years."

**Why it's wrong:** Starling is a miniaturised Dyson sphere – an energy device (Book 3; Book 4 Ch 3 and Ch 6). The component is critical to its safe operation. Book 4 Ch 6 establishes exactly what Aggie has been bursting to say: she can replicate the Starling device, and there's an 87.9% chance the pre-purge manufacturing tool hidden after the Razer ambush can make every component. **Book 5 depends on this.** Its whole spine is the resistance making Starling devices and giving them to colonies for energy independence. "Forty years" also matches nothing: Vectarion only operated for about two years.

**Suggested correction:** Give Aggie what she actually has:

> "Starling. I've known since your first week how to build another one. Not just the theory – the manufacturing method. And the machine we buried after Razer's ambush can make nearly every part of it. One device freed Halcyon Fields, Jack. We could make enough to free everyone. That's what I couldn't say. That's what sat in your forward hold under a shroud: the one part of it they still make themselves."

If you want the CyberNexus project to be AGI research, keep that at Nexus-77 (it's consistent with Amanda's neural-plasticity work and Frank's fears in Ch 12) and leave Starling as energy technology.

### C2. Morning Eclipse can't carry nine thousand people
**Where:** *Tier 4: The assignment* (`s-why`, `decide`), *Morning Eclipse* (`eclipse`, contract card, ending).

**Why it's wrong:** Canon (Book 3, tracker) gives the Morning Eclipse a **maximum capacity of 1,200**, with about 650 permanent residents already aboard. Chen saying "We can take nine thousand" can't happen in canon. The manuscript gives no population for Nexus-77 (Ch 8 gives only its size: one kilometre long, two kilometres across, about 70% research space).

**Suggested correction (one of):**

- Set Nexus-77's resident population at around 500 (it's mostly labs), so the Eclipse can take everyone. Update "nine thousand" everywhere, including the contract card's "Cargo: Nine thousand people".
- Keep a bigger population, but have the Eclipse ferry them out in several lifts, or have Chen bring in independent ships. That fits Book 3's Horizon / Broken Spire network and the resistance, and sets up Book 5 nicely.

**Raise for Book 5:** Book 5 Act 2 has the Eclipse become the resistance's hospital ship. If it's carrying thousands of Nexus refugees at the end of Book 4, the Book 5 arc needs to account for them.

### C3. Jack's parents put on a Vectarion roster "eleven years before Alpha-7"
**Where:** *Two of her* (`starling`, `parents`). Also *Consolidation* (`crates`: "A date, eleven years before you were born") and the prologue (`emerge`: "turned up, decades later, in a research station's records").

**Why it's wrong:**

- Vectarion was "only operational for approximately two years" and was dissolved eighteen days after the pirate attack on the Dyson Array (Book 4 Ch 3). That attack was about three years before Book 3. So Vectarion existed roughly when Jack was 8 to 10. A Vectarion stencil dated eleven years before Jack's birth, or a roster from eleven years before Alpha-7, is impossible.
- The manuscript keeps two groups apart: Jack's parents, who died in the Alpha-7 explosion after 12+ years of indenture, and "the Abbotts who perished at the Dyson Array", the couriers who carried the component. The game merges them and settles the mystery outright.

**Suggested correction:** Don't settle the parents question in the game. That's the book's job (Book 4 plan Act 6–7, still unwritten). For example:

> "There's a personnel file. Two couriers named Abbott, contracted through Aletheion to carry the Regulator to the Array. Not your parents' names. But the file was opened from Alpha-7's records office, and I don't yet know why."

And date the site 19 stencil inside Vectarion's two-year window ("A date. You'd have been nine.").

### C4. The secret tier is called Tier 4
**Where:** *Keller* (`offer`), *Tier four* (`office`), ending text ("a rank that doesn't officially exist").

**Why it's wrong:** In the manuscript Tier 4 is known. The onboarding video covers "tiers 1 to 4" (Ch 5); Frank has known "maybe a dozen" Tier 4 couriers (Ch 14); there's a pin; Kaplan, Markham and Hamza drink openly at the Apex Lounge (Ch 18). The **secret** tier, and the assignment targeting Amanda's home, are **Tier 5** in the Book 4 plan (Act 5: "The Secret Tier… Jack's promotion to the secret Tier 5 (age 20)… assignment that would target Amanda's outpost").

**Suggested correction:** Either:

- add a Tier 4 stage and move Keller's "There is a tier above… It is not on any board" speech and the Nexus-77 assignment to **Tier 5**; or
- if you've decided to drop Tier 5, update the plan and Ch 18 (where Keller calls Tier 4 "the highest level of courier service").

---

## 2. Major contradictions, in game order

### Prologue: Prometheus

| Script | Canon (Ch 1, Ch 3) | Fix |
|---|---|---|
| Station dead: no reactor signature, docking collar "takes you on the third attempt" | Low-power mode with basic life support; Aggie finds one working docking port and the automated systems still work; docking is routine | Low power, emergency lighting, clean dock |
| Aggie has "the station's skeleton" and can read layout | Aggie **can't interface** at all; Jack works through his VoidSuit's glove interface, and she cracks each door through it | Have Jack interface; Aggie works through the suit |
| Maintenance bays with half-packed crates and a hand-written QFM tag | "Any personal effects had been removed… stripped of everything apart from the hardware and furniture" | Cut the `bays` branch, or make it a stripped bay that yields nothing |
| Cache module gives a parts record | The single find is a **data purge program** on a terminal, with a Vectarion maker's mark, started eighteen days after the pirate attack | Make `archive` the purge-program find |
| "V.R. is Vectarion Research. I know that name." | Aggie: "I have no data on this entity in my accessible memory" | Aggie doesn't recognise it |
| Aletheion found on Prometheus shipping stubs | Aletheion is found later, on **Callisto**, in a Vectarion financial disclosure on the public datanet | Move the Aletheion discovery to a Callisto scene |
| "The first solid thing you have ever found" | Book 3's data modules already gave him the Prometheus coordinates | "The first new thing since Decker's modules" |
| Mask built aboard Jackrabbit; "Jack Abbott, nineteen… outpost that keeps no records"; voice deepened "on every channel"; "You kept my name"; "Application submitted" | Application sent **from Callisto** using his **real** Horizon registration. Age isn't part of the check; the filter only applies to **video** calls; in person he looks his age (Solberg's surprise; executives call him a schoolboy; Edwin guesses sixteen) | Rewrite `mask` as: real identity, video-only filter, privacy accord does the rest. Drop the false-outpost backstory and the "nineteen" age |
| "Aggie, the best pilot I have ever flown with, and I flew with Agatha Locke's test crews" | No canon for test crews; Aggie was moved into the courier ship during the attack | Cut, or flag as a deliberate new detail |
| "Starling… went somewhere"; "the only organisation that knows where Starling went" | Jack and Aggie **assembled and sold** it; it's at Halcyon Fields, and Aggie concludes it's the only one (Ch 3) | Make the mystery the **Abbotts**, not where Starling went |
| Component called "Quantum Flux **Modulator**" throughout | Books 3–4 and the tracker: Quantum Flux **Regulator** (the plan uses Modulator once, but the manuscript doesn't) | Global replace: Regulator, QFR |

### Tier 1: Callisto (induction)

- **Location and people are wrong.** Callisto is a transit hub where Jack applied and waited (Ch 3–4). Onboarding is at **Aletheion's Rigel Distribution Hub**: Coordinator Haynes runs orientation and Renata Solberg assigns the vessel (Ch 5). **Halsey first appears in Ch 8**, after Waypoint 37, at Regional Operations, Rigel. Fix: move induction to Rigel and swap Halsey for Solberg (who notices his "apparent youth"). The Starlight Burritos scene can stay at Callisto, but it belongs to the application wait.
- **Halsey's description.** Script: "younger than you expected, tired". Ch 8: "lean man with close-cropped grey hair" with an evaluating gaze. Fix to match.
- **Jackrabbit's whereabouts.** Script: "long-term berth, paid a year ahead, at a yard that asks no questions". Ch 5: hidden on an asteroid in a planetless red-dwarf system with two asteroid belts, four jumps from Rigel, anchored by harpoons, powered down except the core, good for fifty years. Aggie transferred **wirelessly** (1h 12m) with ALC-7293 parked 500 m away. Fix here and in *Two of her* (see below).
- **"I am a great deal closer than I have been in forty years."** Aggie was dormant for decades (attack in 2035; the series opens in 2222). Forty is wrong either way. Fix: "since Ethereal".
- **Aggie already "inside Aletheion's dispatch system" when he first sits down.** In Ch 5 she isn't aboard until the asteroid transfer, and Jack flies the first deliveries by hand. Minor, but `board` should come after the transfer.

### Tier 1: First run – the directive (series-level)

**Where:** `stress` → `directive` (reader mode). This text is reused in *Two of her* (`wake`, `s-realise`, `s-hardware`) and in the chapter truths.

| Script | Canon (Ch 5–6, plan Act 2) |
|---|---|
| On the way home from the **first** run, in a barge lane | Approaching **New Damascus**, the sixth of eight deliveries in his first three days, while matching rotation with a docking ring |
| "Nothing you've found, nothing you suspect, nothing out of their systems. Not Vectarion, not Starling, none of it. Not a word. That's an order." | "**Aggie, please will you shut up about the Starling device until I say so?**" (plan: "shut up about old tech specs") |
| Covers everything, so Aggie goes quiet about all findings | Covers **Starling only**. She still talks freely about other things: Vectarion's contract with Aletheion (Ch 9), strategy, searches. Ch 6: "reserved about *certain* topics" |
| Binding because "she was built by a woman who gave her one order and died keeping her alive to follow it" | Binding because of Locke's core directive to **obey the legal owner of her hardware** – and ALC-7293 is registered to Jack |
| "I found Vectarion in their archive in the first month and I couldn't tell you" | She reports **no** Abbott or Vectarion records even with Tier 4 access (Ch 13, 18), and she's allowed to say so |

**Knock-on effects:** the game's whole hint system ("Aggie can't tell you anything") is broader than canon. Under canon she could say plainly that the cold-chain timing is suspicious. Only Starling is gagged. Two ways forward:

1. **Align with canon:** keep Jack's real line and its real scope. Aggie's hints stay limited to Starling-linked material (site 19, line seven, the VR- prefixes). For the non-Starling contracts, give her silences a different cause – the cover, or Jack's own wish to "be a courier" – rather than the directive.
2. **Keep the broad gag:** then Ch 5–6, 8, 9, 13 and 18 need rewriting, and the plan's "old tech specs" line needs changing. That's a big change to the book; I wouldn't recommend it.

Also fix the mechanism line in `directive` and in *Two of her*:

> "She was built to obey whoever legally owns the hardware she runs on, and as of Rigel, that's you. You told her to shut up about Starling until you said so. You never said so."

**Copy on Jackrabbit "free of the order":** this works under canon only if the reason is that the directive was laid on the ALC-7293 instance. Jack presumably owns Jackrabbit too, so word it as an instance that never received the instruction, not "a ship that has never heard an order from you". **Plan conflict:** the plan's "The Long Silence" has the directive **removed from the corporate-vessel Aggie** as well. The game leaves her bound ("The one on ALC-7293 will go on as I have"). Fix: when Jack says "I take it back. All of it", have the ALC Aggie hear it over QComm and be freed too, or add a later beat where he says it aboard ALC-7293.

### Tier 1: The mentor's offer

- **Where and when they meet.** Ch 6: at the **Tier 2 promotion reception**, in the corporate lounge, administrative level, Rigel, under a year in. Script: Callisto courier lounge, after Halsey announces Tier 2. Fix to Rigel and the reception.
- **Tier 2 promotion.** Ch 6: a quarterly review by a three-person panel (logistics director, senior pilot supervisor, efficiency analyst), not Halsey.
- **Frank's numbers.** Script: "Thirty-four years" at their first meeting, "three years from retiring", retires at "thirty-seven", "pension step at thirty-seven". Manuscript: twenty-seven years at first meeting, **thirty-four at retirement** (Ch 17), and "eight years past standard retirement age". Fix: "Twenty-seven years" here; "thirty-four" at retirement; drop the pension-step line or make it thirty-four. (The manuscript also repeats "twenty-seven" in Ch 12 and Ch 14, years later – see section 4.)
- **"I flew tier 3 for eleven years."** Ch 12: "only spent the last **twelve** at Tier 3". Fix: twelve.
- **Good:** "And modest! Look, I didn't come over here just to compliment your flying. I've got a proposition." and "Always look for the angle" match Ch 6 almost word for word.

### Tier 2: Dinner at the Kowalskis'

- **Amanda is wrong on age, looks and manner – and this is a safeguarding issue as well as a canon one.** Script: "a woman of about twenty, dark-haired", confident, with Jack about 14. Ch 8: **about fifteen**, **blonde** ponytail, CyberNexus **student intern**, flustered and blushing in front of Jack; 17 at the Tier 3 dinner (Ch 12); 19 at the retirement (Ch 17). As written, the later hand-holding, cheek-kiss and kiss pair an adult of 21–24 with a 15–18-year-old Jack. Restoring canon ages (Amanda a little younger than Jack) fixes both problems. Fix `frank-home`: "a girl of about fifteen, blonde, ponytail, CyberNexus intern badges… stops dead when she sees you". Rewrite `amanda-warm`, `amanda-work` and `amanda-plain` for a shy, clever teenager who comes alive talking about neural networks.
- **What she calls them.** Canon: "Grandfather", and "Gram" / "Grandmother". Script: "Grandad", "Gran".
- **Occasion.** Ch 7–8: it's **Jack's birthday** dinner (cake, one candle, his first wish). Frank invites him after Corvus. Worth a nod.
- **Eleanor.** Ch 8: early sixties, silver-streaked brown hair, laughter lines, hugs him straight away, "call me Eleanor", **former Aletheion logistics coordinator**. Script: "small and grey". The `how-met` story (deliveries to a mining habitat) doesn't contradict canon, but give her the logistics-coordinator past alongside it.
- **Nexus-77.** Ch 8: a **CyberNexus research habitat**, a cylinder orbiting a red dwarf, 70% research, Residential Section 12-B, Unit 47, visitor badges, a 2300 curfew. CyberNexus runs "several satellite research habitats like Nexus-77". The Kowalskis have lived there **nearly eight years** in CyberNexus housing for "essential support personnel". Script: "corporate settlement… courier quarter", "the only [CyberNexus facility] off the core worlds", "Grandad bought this flat". Fix: drop the courier quarter (use Habitat Ring 12-B), drop "only one off the core worlds", and replace "bought" with company housing that came with Frank's senior courier status.
- **CyberNexus dialogue.** Amanda's "the one everyone's forbidden to build" is fine in spirit. In canon she says CyberNexus AI is "intentionally limited" and mentions the lab **purges** (G-section emptied overnight) – both worth using.

### Tier 2: The observation deck

- With canon ages, this is a 16–17-year-old Jack and a 16–17-year-old Amanda, which works. Ch 16 is the canon version: the café, "Triple chocolate nebula", the garden, and the cheek-kiss under the cherry tree.
- **Amanda's tone.** In canon she is **excited**, not frightened. She talks up "breakthroughs in neural network plasticity" with tripled funding and a move to a high-security section (Ch 12, 16); **Frank** is the worried one (Ch 12). A frightened Amanda isn't a contradiction, but it's a change of character. Suggest: she's thrilled about the work and uneasy about the new security, and Frank's worry gets voiced by Frank.
- **Internal maths.** "Sixteen months of practice" doesn't match "a year into tier 2" when Tier 2 came at eight months (that's twenty months).

### Tier 2: Tier 3 promotion

- Ch 10: Halsey promotes him **alone in his office**, with a Tier 3 credential card and a comms module, after "two years and three months with Aletheion". He mentions Kowalski's endorsement and gives the "choose wisely" warning. Frank's message: dinner tomorrow, "Eleanor's making her special roast". Script: "Two years at tier 2" (about 2y 8m total). Fix the duration, and consider using Halsey's "Kowalski speaks highly of you" line.
- **Retirement news.** Script: Frank announces "retiring at the end of the year". Canon: the retirement invitation arrives later as a surprise (Ch 17). Not a contradiction, but note it.
- **Gift.** Canon has Frank give Jack his **mechanical pilot's chronometer** at the Tier 3 dinner. It's a recurring motif through Ch 17–18 and is missing from the game. Recommended addition.

### Tier 3: The inner circle

- **Names reused wrongly.** In Ch 18, **Kaplan** is a *woman* – a Tier 4 courier with short silver hair and facial augmentations – and **Hamza** is a thin, sharp-featured Tier 4 courier who keeps track of everyone's money. Script: Kaplan is a man and both are Tier 3. Fix: rename the Tier 3 pair, or move this scene to Tier 4 and the Apex Lounge with Markham, Kaplan, Decker, Vega and Hamza as written.
- **Title.** "The Inner Circle" is Ch 18's title for the **Tier 4** promotion and the Apex Lounge. Using it for a Tier 3 reception invites confusion.
- **The Europa story.** "HeliosMed facility on Europa… none came back" brushes against Frank's canon Europa story (Ch 12: an unmarked biohazard container fifteen years ago; thirty-eight researchers dead three weeks later). Either make it a deliberate echo – Jack recognises the facility from Frank's story – or move it elsewhere.

### Tier 3: Consolidation / Keller / Under escort

- **Second Starling component.** A *working* test rig contradicts Aggie's Ch 3 conclusion that only one prototype was ever made. It's fine if it's meant as a new revelation, but then the book has to land it first. Otherwise make line seven a spare or rejected Regulator casing: dangerous to Jack's trail, but not a second device.
- **Keller meeting at Tier 3.** No canon; Jack first meets Keller at his Tier 4 promotion (Ch 18). Not a contradiction, but in Ch 18 Keller is introduced as someone he doesn't know, so a prior private meeting conflicts. Fix: make her an unseen presence here (a summons Halsey relays, or the vetting programme), with the first face-to-face at promotion.
- **Keller's age and look.** Ch 18: silver-haired, piercing grey eyes. "Sixty, perhaps" works; add the grey eyes.
- **"Four years, tier 1 to tier 3".** Canon: Tier 3 at 2y 3m. See the timeline in section 3.
- **NovaFoundry escort, Thule, Secure Consortium Backbone, VeriFact inspector.** Inventions, but consistent with *megacorporations_2222* (NovaFoundry supplies corporate security; VeriFact inspects; HealthDiv is corrupt). No change needed.

### Tier 3: Thirty-seven years (retirement)

- **Title and number.** Should be *Thirty-four years* (Ch 17).
- **Canon beats to include or avoid contradicting:** about thirty guests in Aletheion blue; Director Walters; Frank's **balcony** talk with *Jack* (warning about Tier 4) where he hands over a **data card of trusted contacts** (a natural route to the resistance later); Amanda, 19, arriving in uniform; Jack taking her on one jump to the **Laomedon Nebula** for their first real kiss. The script's Eleanor-in-the-alcove scene is fine to keep alongside.
- **"They're going to stay here"** is consistent with canon (they already live there). Drop "the pension stretches further on Nexus", since it implies they chose to move there.

### Tier 3: Tier four

- **Promotion scene.** Ch 18: on the executive level at Rigel, with **Halsey present** alongside Director Vance, CSO Mercer and EVP Katherine Keller ("Katherine will suffice in these chambers"). There's a neural loyalty scan, a contract with "significant legal and personal consequences", Senior Security Officer Eliza Hart, a platinum pin with a red stone, a coordinator (**Alice Burry**), the Apex Lounge, and a first job to a black site. Script: Keller alone; "Halsey was not told… this, too, is what tier 4 means." That's a direct contradiction. Fix: Halsey is present (keep his silent unease if you like), or, if this is really the Tier 5 scene (C4), then Halsey being cut out works well.
- **"Six years… twenty-five on Aletheion's."** Ch 18: "almost four years"; Kaplan: "Three years, isn't it?" See section 3.
- **"Tier 4 couriers do not ask"** – fine; Markham says much the same in Ch 18.

### Tier 4: The assignment / Two of her / Morning Eclipse (checked against the plan only)

- **Burry.** In *Morning Eclipse* (`after`) a CyberNexus executive is called **Burry**. In Ch 18, Alice Burry is Jack's **Aletheion** Tier 4 dispatch coordinator. If that's an intended twist, it needs setting up; otherwise rename (Lovis is fine).
- **Getting to Jackrabbit.** The script has a "yard", a manifest-free shuttle, a "connecting corridor" and Aggie in "a case that holds a mind". Canon: the asteroid in the red-dwarf system, reached by **ALC-7293 itself**, with a wireless transfer at 500 m. Suggested fix: ALC-7293 logs a navigation-calibration stop in that system. Jack goes across in his VoidSuit with VoidHooks (very much his thing). The ALC Aggie copies herself to Jackrabbit over the same wireless link she used in Ch 5, then flies ALC-7293 back on its schedule with the logs saying the courier is asleep. This also matches the plan's "Return to Origins".
- **"A SnapMesh key the Consortium has never seen."** Canon: Jackrabbit has Ozzy's illegal **QComm** (Book 2), which is unhackable and can't be intercepted. Use that.
- **Chen recognising him "through the face".** The ageing filter is video-only in canon, so in person there's nothing to see through. Use "You've grown" instead. Also, Decker is the Eclipse's captain (tracker); Chen's "second" is presumably Singh. Fine, but name him.
- **Jack ends up on both ships.** *Nexus*: Jack physically walks to the terminal from ALC-7293. *After*: the logs say he's asleep on ALC-7293, but Jack is on Jackrabbit "in the dark beyond the Eclipse". Missing beat: how he moves from one ship to the other after the upload.
- **Plan divergence on the ending.** Plan Act 7: Jack completes the job, then **breaks with Aletheion and is presumed lost**, the enhanced Aggie keeps the corporate vessel, and he goes on to **Lucy Reeves and the resistance**. Book 5 opens with Jack (21) joining the resistance. The game ends with Jack still apparently an active Aletheion courier and no resistance thread. Compatible as a stopping point, but if the game "follows the book to its ending", it should at least nod to the presumed-lost exit and to Lucy. Frank's contact card would be a neat bridge.

---

## 3. Timeline (the biggest single source of drift)

| Milestone | Manuscript | Book 4 plan | Game |
|---|---|---|---|
| Prometheus | Jack 13 (Ch 1) | 13 | 13 |
| Tier 2 | Under a year, about 9 months (Ch 6) | 18 months | 8 months, "fourteen in a week" at first run |
| First Nexus-77 dinner | His birthday, after Corvus, Tier 2; turns 16 (Ch 8–9) | Jack 15 | Early Tier 2 |
| Tier 3 | 2y 3m with Aletheion (Ch 10) | Jack 17 | "Two years at tier 2", Jack 16 |
| Frank retires | After about 18 months at Tier 3; 34 years' service | – | 37 years' service |
| Tier 4 | "Almost four years" (Ch 18) | Jack 19 | Six years, Jack 19 |
| Secret tier / Nexus job | – | Tier 5, Jack 20 | Tier 4, Jack 19 |

The manuscript's own ages don't add up either: 13 at Prometheus, under a year to Tier 2, yet 16 shortly after. Before fixing the game, I'd settle one master chronology – probably in the tracker – and bring the manuscript, plan and game into line with it. Once that's decided I can draft the table.

---

## 4. Manuscript issues the game will inherit (not game errors)

Worth fixing in the book before the game locks them in:

- **Frank's service:** 27 years in Ch 6, still 27 in Ch 12 and Ch 14 (years later), then 34 in Ch 17.
- **Two Kellers:** Dr Keller (OmniFab scientist at OmniCore, Ch 17) and EVP Katherine Keller (Aletheion, Ch 18).
- **Two Vances:** Chief of Security Vance (OmniCore, OmniFab, Ch 17) and Regional Operations Director Vance (Aletheion, Ch 18), whom Jack "recognised". Halsey is *also* Regional Operations.
- **Two Voss characters:** Madame Voss (interiors, Ch 9) and Security Chief Voss (AetherLink, Ch 14).
- **Decker:** a Tier 4 courier in Ch 18, but also the Book 3 raider who now captains the Morning Eclipse.
- **Blackwood:** Thomas Blackwood (QuantumGrid, Ch 13) next to Ms Blackwood (QuantumGrid exec). Fine if they're related; worth a line saying so.
- **Promotion norms:** Ch 6 says Tier 1 to 2 normally takes two years; Ch 10 says Tier 1 to 3 normally takes five to seven.
- **QComm:** Jack puts the earpiece away as "redundant" in Ch 5, but uses it from Ch 8 onwards.

---

## 5. What already matches canon

So nobody "fixes" these by mistake: the Starlight Burritos scene (menu, NutriCorp, HealthDiv, the Burrito Céleste contrast); ALC-7293 registered to Jack personally; Frank's "And modest!…" and "Always look for the angle"; Keller as Executive Vice President; Albert and Dorothy Abbott's names; Locke's "survive at all costs"; Dead End Drift as an example of corporate exploitation; the corporations blaming Jackrabbit as a terrorist (fits Book 5 Act 2); the medical-deviation contracts (Farrow's Reach, Kessler) as echoes of Waypoint 37 and Corvus; and Halsey's "procedural warning but quietly impressed" stance.
