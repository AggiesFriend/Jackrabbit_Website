// Flag-name constants for the Jackrabbit Contract world. Centralised so a
// stray typo in any one file is caught by TypeScript rather than silently
// reading/writing the wrong key.
export const FLAG_PC_ALIAS = "PC_ALIAS";
export const FLAG_PC_PROFESSION = "PC_PROFESSION";
export const FLAG_PC_REAL_NAME = "PC_REAL_NAME";
/** Set true once the player completes the form in the Halberd lobby. */
export const FLAG_FORM_COMPLETE = "form_complete";
/** Set true once Miss Terry has briefed the player. */
export const FLAG_BRIEFING_COMPLETE = "briefing_complete";
/** Numeric credit balance, loaded onto the player's ID card. */
export const FLAG_CREDITS = "credits";
// --- Shuttle 1 ----------------------------------------------------------
/** state.ticks when the player first boarded shuttle1. Scene-relative baseline. */
export const FLAG_SHUTTLE1_BOARDED_AT = "shuttle1_boarded_at";
/** Set true once the docking-approach announcement (the 4-minute warning) has fired. */
export const FLAG_SHUTTLE1_DOCKED = "shuttle1_docked";
/** Set true once the shuttle has physically docked and the player may disembark. */
export const FLAG_SHUTTLE1_ARRIVED = "shuttle1_arrived";
/** Set true when the maintenance panel cover is open. */
export const FLAG_AIRLOCK_COVER_OPEN = "airlock_cover_open";
// --- Liner --------------------------------------------------------------
export const FLAG_LINER_BOARDED_AT = "liner_boarded_at";
export const FLAG_LINER_TALKED_TO_PASSENGER = "liner_talked_to_passenger";
/** state.ticks at which the player first spoke to the passenger — starts the
 *  disembarkation countdown so the beats can't all fire at once. */
export const FLAG_LINER_TALKED_AT = "liner_talked_at";
export const FLAG_LINER_REPEAT_HORIZON = "liner_repeat_horizon_asked";
export const FLAG_LINER_ANNOUNCED = "liner_announced";
/** state.ticks at which the departure announcement fired. */
export const FLAG_LINER_ANNOUNCED_AT = "liner_announced_at";
/** How many AetherLink advert spots the PC has watched on the lounge panel — the
 *  reel cycles through them (the "we look after our own" PR, planted here so the
 *  later predecessor / Burke reveal curdles it). Pure ambience, non-gating. */
export const FLAG_LINER_AD_SEEN = "liner_ad_seen";
// --- Strand 2: AetherLink analysis (Burke's software) -------------------
/** state.ticks at which the PC seeded Burke's blockchain-analysis software at a
 *  public terminal. Absent until seeded; the elapsed-time baseline for the run
 *  (same pattern as FLAG_SHUTTLE1_BOARDED_AT). */
export const FLAG_ANALYSIS_SEEDED_AT = "analysis_seeded_at";
/** Set true once the analysis has run long enough to FINISH COMPUTING. Fires the
 *  one-shot datapad NOTIFICATION; it does NOT yet name AetherLink — the PC must
 *  log on to a public terminal to read the result. */
export const FLAG_ANALYSIS_COMPLETE = "analysis_complete";
/** Set true once the PC has READ the completed result at a public terminal —
 *  AetherLink is named, the payoff is scored. This is the Strand-2 "learned it"
 *  flag (gates Burke Beat 3); distinct from merely finishing the computation. */
export const FLAG_ANALYSIS_RESOLVED = "analysis_resolved";
/** Which "still running" analysis nudge has fired (0..N) — the PC's own periodic
 *  reminder to go check a terminal (the pad can't be pinged out here). */
export const FLAG_ANALYSIS_NUDGE = "analysis_nudge_stage";
/** state.ticks of the last "it's surely done — go read it" reminder, so the
 *  post-completion nudge recurs about once a cycle until the PC reads the result. */
export const FLAG_ANALYSIS_REMIND_AT = "analysis_remind_at";
/** Day/night cycles the seeded analysis must run before it FINISHES COMPUTING
 *  (then the PC reads it at a terminal). A cycle = 2 × dayLength ticks, so the
 *  real threshold is computed against the world clock (analysisTicksToUnlock).
 *  Deliberately long — Burke would charge a fortune and sink days into this; the
 *  hope is the player wanders off and the completion chime is a genuine reminder.
 *  PROVISIONAL — tune in Phase D against the contract deadline (spec §9.2). */
export const ANALYSIS_CYCLES_TO_UNLOCK = 5;
// --- Strand 1 / B4a: the predecessor ------------------------------------
/** Set true once the PC prises open the lavatory access panel and finds the
 *  predecessor's stashed kit. */
export const FLAG_CUBBYHOLE_OPEN = "cubbyhole_open";
/** Set true once the PC cracks the predecessor's sealed contract brief via the
 *  datapad failsafe (USE datapad ON datapad). Latches the reveal. */
export const FLAG_BRIEF_UNLOCKED = "predecessor_brief_unlocked";
/** Banked once the PC reads the predecessor's saved shipyard-records login.
 *  Forward-compatible: the (unbuilt) Shipyard route will consume this so the PC
 *  can reach the records without distracting Sophie (B4a). */
export const FLAG_SHIPYARD_CREDS = "shipyard_creds";
// --- Donovan's Lodging House (the PC's default, pre-booked base) --------
/** Set true once the PC scans in at Donovan's reception desk. */
export const FLAG_DONOVAN_CHECKED_IN = "donovan_checked_in";
/** The room number Donovan allocates on check-in (display string, e.g. "24"). */
export const FLAG_DONOVAN_ROOM = "donovan_room";
/** Set true once Donovan has delivered the full welcome (on check-in). Gates his
 *  short repeat-visit greeting. */
export const FLAG_DONOVAN_WELCOMED = "donovan_welcomed";
/** Set true once the PC checks OUT of Donovan's (releases the reservation).
 *  DECLARED here; set by the (Phase-3) check-out logic. Horizon's one-berth-per-
 *  registered-person policy means a hostel booking is refused until this is true
 *  (the PC arrives holding a Donovan's reservation). */
export const FLAG_DONOVAN_CHECKED_OUT = "donovan_checked_out";
// --- Dockside Hostel (the off-grid alternative; defection path) ---------
/** Set true once the PC books a hostel room at a public terminal. Prerequisite
 *  for hostel check-in. Blocked while still checked in at Donovan's. */
export const FLAG_HOSTEL_BOOKED = "hostel_booked";
/** Set true once the PC scans in at the hostel reception reader. */
export const FLAG_HOSTEL_CHECKED_IN = "hostel_checked_in";
/** The hostel room number allocated on check-in (e.g. "507"). Until check-in
 *  no room is allocated and every room door refuses. */
export const FLAG_HOSTEL_ROOM = "hostel_room";
// --- Dockside Retail: the public showers (ID-gated civic facility) -------
/** Set once the PC presents their ID at the shower-block turnstile. The showers
 *  are free but access-controlled (canon): the east exit refuses until this is
 *  set. Once admitted, stays admitted. */
export const FLAG_SHOWERS_UNLOCKED = "showers_unlocked";
// --- Barty (the first loyalty wall) -------------------------------------
/** Set true once Barty runs his hand-scanner over the PC's ID (first talk).
 *  Gates his use of the PC's alias in later topics. */
export const FLAG_ID_SCANNED = "id_scanned";
// --- Sophie / shipyard records (Strand 1 + the records route) -----------
/** Set once the PC pulls up the Jackrabbit ship record (Tier 1); gates Tier 2. */
export const FLAG_RECORDS_SHIP_FOUND = "records_ship_found";
// --- Brinn (Strand 1 emotional wall + defection/flee payoff) ------------
/** Latches the once-only second encounter so it can't re-fire. */
export const FLAG_BRINN_SECOND_DONE = "brinn_second_encounter_done";
/** Strand-3 path flags — DECLARED here; set by the (unbuilt) defection/flee
 *  logic. Brinn's second encounter is gated on one of these being true, so it
 *  stays dormant until Strand 3 lands. */
export const FLAG_DEFECTING = "defecting";
export const FLAG_FLEEING = "fleeing";
// --- The contract clock + the endgame departures (B7/B8, endgame.ts) ----
/** state.ticks at the moment the PC first set foot on Horizon — the contract
 *  clock's zero. Set in the arrival concourse onEnter; the deadline counts from
 *  here (transit time doesn't burn it). */
export const FLAG_CONTRACT_START_TICK = "contract_start_tick";
/** Set true once the contract deadline elapses. The contract is then cancelled:
 *  SUBMIT no longer pays, but the home route opens (return = survive, Failure). */
export const FLAG_CONTRACT_EXPIRED = "contract_expired";
/** Milestone-nudge stage already announced (0..N) — so each "time is getting on"
 *  reminder fires once. */
export const FLAG_CONTRACT_NUDGE = "contract_nudge_stage";
/** Set true once the PC files a report to the client (SUBMIT). Banks the payout
 *  (escrow pays by reflex — even a blank note) and opens the home route. */
export const FLAG_REPORT_SUBMITTED = "report_submitted";
/** Provisional contract length in day/night cycles (a cycle = 2 × dayLength
 *  ticks → 3000 ticks at the default dayLength 100). Long enough for the full
 *  Strand-2 trace (5-cycle analysis) + the Burke beats + slack. PROVISIONAL —
 *  tune in Phase D against the analysis duration (spec §9.2). */
export const CONTRACT_DEADLINE_CYCLES = 15;
// --- Batch-2 NPCs interlock (reference/npc-specs-batch-2.md) ------------
/** Set true once the PC learns the "Jackrabbit" is a SHIP (records Tier 1, or
 *  Chas's reveal). Unlocks Ozzy's ship-name confirmation beat. */
export const FLAG_JACKRABBIT_IS_SHIP = "jackrabbit_is_ship";
/** Set true once the PC learns Jack's real name (Jack Abbott) — from Chas. */
export const FLAG_JACK_REAL_NAME = "jack_real_name";
/** Set true once Burke refers the PC to Dr Rajah (Burke Beat 3 — DEFERRED).
 *  Declared here; gates Rajah's resistance conversation, which stays dormant
 *  until Strand 3 lands. */
export const FLAG_BURKE_REFERRED_RAJAH = "burke_referred_rajah";
/** Strand-3 defect pathway active (the moral pivot reached). Declared here; set
 *  by the (unbuilt) Burke Beat 3 / defection logic. Gates Teng's full beat. */
export const FLAG_DEFECT_PATHWAY = "defect_pathway";
/** Set if the PC has been careless about advertising the hunt on a loyal
 *  station. Declared here; calibration hook — no penalty wired yet. */
export const FLAG_INVESTIGATION_BROADCAST = "investigation_broadcast";
/** The Chas drink-staging (B4b): the PC is seated at a Long Shot table. */
export const FLAG_LONGSHOT_SEATED = "longshot_seated";
/** Count of drinks the PC has had, seated, in the Long Shot. */
export const FLAG_LONGSHOT_DRINKS = "longshot_drinks";
/** Set once Chas, having weighed the PC as another investigator to disappear,
 *  drops into the chair opposite — the menacing approach that opens the danger
 *  window. (No intel yet; the spite-crack is now the *release* from the menace.) */
export const FLAG_CHAS_APPROACHED = "chas_approached";
/** The menace counter: turns elapsed in the Long Shot since Chas's approach,
 *  while the PC hasn't raised the Jackrabbit. Drives the telegraph ladder and,
 *  at the limit, the demise. */
export const FLAG_CHAS_MENACE = "chas_menace";
/** Set once the PC raises the Jackrabbit (or the hunt) during the window: the
 *  danger is over, Chas's men stand down, and the PC may leave freely. */
export const FLAG_CHAS_DEFUSED = "chas_defused";
/** Set once the PC buys a meal at Burrito Céleste — warms the server's beat.
 *  (Persistent, unlike the per-item freshness key, which clears on eating.) */
export const FLAG_BOUGHT_AT_CELESTE = "bought_at_celeste";
/** Set once Dr Rajah invites the PC into the back room (the gated resistance
 *  beat) — she moves north and sets the datacard out. Latches the back-room
 *  hand-off. Dormant until FLAG_BURKE_REFERRED_RAJAH exists (Burke Beat 3). */
export const FLAG_RAJAH_INVITED = "rajah_invited";
/** The Residential Zone B address (room id) where Dr Rajah lives — chosen at
 *  random the first time Burke refers her, then persistent for the playthrough. */
export const FLAG_RAJAH_RESIDENCE = "rajah_residence";
/** Set once the PC has found Rajah at her Zone B residence and she's redirected
 *  them to her LCD unit (she relocates to the pharmacy shopfront). */
export const FLAG_RAJAH_HOME_MET = "rajah_home_met";
/** Set once the PC commits to abandoning the corporations and Rajah hands over
 *  the resistance datacard (the irreversible defect endpoint). */
export const FLAG_RAJAH_COMMITTED = "rajah_committed";
// --- Shipyard yard-proper: the armoury gun + the night patrol -----------
/** Set once the PC prises open the Untheatrical's damaged armoury cabinet (with
 *  the crowbar from the Tool Store) and the sidearm is revealed inside. */
export const FLAG_ARMOURY_CABINET_OPEN = "armoury_cabinet_open";
/** How many times the PC has been caught snooping in the shipyard yard-proper
 *  (night patrol or day crew). Three strikes => barred from the Outpost. */
export const FLAG_SHIPYARD_STRIKES = "shipyard_strikes";
/** Transient detection level while loitering in the OPEN yard at night. Rises
 *  each tick in the open (telegraphed); reset by a bolthole or leaving the yard;
 *  a capture clears it. Not persisted intent — purely the live patrol pressure. */
export const FLAG_SHIPYARD_PATROL_HEAT = "shipyard_patrol_heat";
/** Set once the PC actually sneaks past Sophie's gate into the yard proper (the
 *  shipyard entrance's onEnter). The night patrol / day-crew capture only arms
 *  while this is set, so it tracks a real intrusion — not a teleport. Cleared on
 *  leaving the yard. */
export const FLAG_SHIPYARD_INTRUDING = "shipyard_intruding";
// --- Burke (Strand 2 keystone; Beats 1 & 2 built) -----------------------
/** Set true once the PC has met Burke (gates his repeat greeting). */
export const FLAG_BURKE_MET = "burke_met";
/** Set true once the PC has paid for Burke's sliver re the Jackrabbit (Beat 1).
 *  Charged once; subsequent asks just repeat the sliver. */
export const FLAG_BURKE_TRANSACTED = "burke_transacted";
/** Set true once the PC has ASKED Burke about the Jackrabbit and he's named his
 *  price — he won't divulge anything until the PC SCANS their ID to pay. */
export const FLAG_BURKE_AWAITING_PAYMENT = "burke_awaiting_payment";
/** state.ticks at the Beat-1 transaction. Beat 2 (the peculiar-routing reveal)
 *  opens once a full day-night has elapsed since this. */
export const FLAG_BURKE_TXN_TICK = "burke_txn_tick";
/** Set true once Burke has volunteered the Beat-2 reveal (your funding took a
 *  deliberately laundered route — he can't yet say whose). */
export const FLAG_BURKE_BEAT2 = "burke_beat2";
/** Set true once the PC agrees to buy Burke's analysis software (BUY SOFTWARE /
 *  asking the price) — arms the bench reader so the next ID scan pays the 50 and
 *  Burke hands over the software datacard. Cleared on hand-over. */
export const FLAG_BURKE_SOFTWARE_PENDING = "burke_software_pending";
/** Set true once the PC has bought Burke's blockchain-analysis software (the
 *  thing that finally places `burke_software` in the world). */
export const FLAG_BURKE_SOFTWARE_BOUGHT = "burke_software_bought";
/** Set true once Burke has delivered the Beat-3 pivot speech (the real-name
 *  reveal + the two roads). Fires once; gates the road-commit topics. */
export const FLAG_BURKE_PIVOT_DONE = "burke_pivot_done";
// (FLAG_BURKE_REFERRED_RAJAH is declared above with the Batch-2 NPC interlock;
//  Burke Beat 3 sets it on the Defect commit, which also irreversibly shuts the
//  Flee road — see burke.ts.)
// --- Scoring hooks ------------------------------------------------------
// Named hook ids passed to awardScore(). Each scores at most once. The point
// value lives at the award site; SCORE_POINTS documents them in one place and
// MAX_SCORE is their sum (the endgame "out of N" figure).
export const HOOK_FORM_COMPLETE = "form_complete";
export const HOOK_TALKED_TERRY = "talked_to_terry";
export const HOOK_PERSON_OF_INTEREST = "asked_terry_person_of_interest";
export const HOOK_READ_CONTRACT = "read_contract";
export const HOOK_CHECKED_BALANCE = "checked_balance";
export const HOOK_ID_ON_TERMINAL = "id_on_terminal";
export const HOOK_ENTERED_MAINTENANCE = "entered_maintenance";
export const HOOK_READ_WARNING_LABEL = "read_warning_label";
export const HOOK_PULLED_LEVER = "pulled_airlock_lever";
export const HOOK_TALKED_PASSENGER = "talked_to_passenger";
export const HOOK_ASKED_HORIZON_1 = "asked_passenger_horizon_first";
export const HOOK_ASKED_HORIZON_2 = "asked_passenger_horizon_second";
// Watching each of the three liner advert spots scores +1 (once per spot). The
// reel cycles in order, so the array index lines up with the spot shown.
export const HOOK_LINER_AD = [
    "watched_liner_ad_1", "watched_liner_ad_2", "watched_liner_ad_3",
];
// --- Horizon Outpost (Phase B) ---
export const HOOK_ARRIVED_HORIZON = "arrived_horizon"; // first step onto the station
export const HOOK_TALKED_BARTY = "talked_to_barty"; // Strand-1 wall
export const HOOK_ASKED_BARTY_HORIZON = "asked_barty_horizon"; // drew out the independence/privacy stance
export const HOOK_ASKED_BARTY_SENSITIVE = "asked_barty_sensitive"; // first smooth refusal (docks/ships OR target)
export const HOOK_RODE_TUBE = "rode_traveltube"; // first TravelTube journey
export const HOOK_REACHED_DONOVANS = "reached_donovans"; // found the base
export const HOOK_TALKED_DONOVAN = "talked_to_donovan"; // Strand-1 wall
export const HOOK_DONOVAN_GREY_MARKET = "donovan_grey_market_hint"; // got Donovan to acknowledge the unofficial layer
export const HOOK_PENTHOUSE_SNOOP = "donovan_penthouse_snoop"; // nosed into Donovan's (ajar) penthouse
export const HOOK_TALKED_SANDWICH_VENDOR = "talked_to_sandwich_vendor"; // canonical hook
export const HOOK_SANDWICH_HE = "sandwich_vendor_he"; // learned the Jackrabbit is "he"
export const HOOK_SANDWICH_JAM = "sandwich_vendor_jam"; // learned the apricot-jam detail
export const HOOK_SANDWICH_PHOTOS = "sandwich_photos"; // examined the sandwich pictures
export const HOOK_SEEDED_ANALYSIS = "seeded_analysis"; // ran Burke's software at a public terminal
export const HOOK_AETHERLINK_IDENTIFIED = "aetherlink_identified"; // Strand-2 payoff: the paymaster named
export const HOOK_FOUND_PREDECESSOR = "found_predecessor_kit"; // opened the cubbyhole, found the kit
export const HOOK_READ_PREDECESSOR_DIARY = "read_predecessor_diary"; // read his diary (the bar lead)
export const HOOK_FOUND_SHIPYARD_CREDS = "found_shipyard_creds"; // read his saved shipyard login
export const HOOK_PREDECESSOR_SAME_JOB = "predecessor_same_job"; // cracked his sealed brief: same job, he's dead
// --- Phase 2 NPCs / threads (Sophie, Brinn, Burke Beat 1) ---
export const HOOK_TALKED_SOPHIE = "talked_to_sophie"; // talked to Sophie at the shipyard
export const HOOK_SOPHIE_RECORDS_HINT = "sophie_records_hint"; // drew out the meticulous-records boast (signpost)
export const HOOK_RECORDS_SHIP_JACKRABBIT = "records_ship_jackrabbit"; // records: the Jackrabbit is a SHIP
export const HOOK_RECORDS_SHIP_WRECK = "records_ship_wreck"; // intake report: came in a wreck, certified by Oswald
export const HOOK_TALKED_BRINN = "talked_to_brinn"; // first talk with Brinn at the pool tables
export const HOOK_BRINN_WALL = "brinn_wall"; // the Jackrabbit question; the visible reaction
export const HOOK_BRINN_SECOND = "brinn_second_encounter"; // defect/flee payoff in the LCD corridor
export const HOOK_FIRST_BURKE = "first_burke_transaction"; // Burke Beat 1: the sliver + the employer nudge
export const HOOK_BOUGHT_ANALYSIS_SOFTWARE = "bought_analysis_software"; // Burke Beat 2: bought the blockchain-analysis software
export const HOOK_BURKE_PIVOT = "burke_pivot"; // Burke Beat 3: reached the pivot (real-name reveal + the two roads)
// --- Batch-2 NPCs (reference/npc-specs-batch-2.md) ---
export const HOOK_TALKED_CELESTE_SERVER = "talked_to_celeste_server"; // Strand-1 friendly wall (Burrito Céleste)
export const HOOK_TALKED_OZZY = "talked_to_ozzy"; // Strand-1 wall (the man who named the ship)
export const HOOK_OZZY_SHIP_NAME = "ozzy_ship_name_confirm"; // he confirms he named the Jackrabbit (needs FLAG_JACKRABBIT_IS_SHIP)
export const HOOK_TALKED_CHAS = "talked_to_chas"; // first conversation with Chas
export const HOOK_CHAS_INTEL = "chas_gave_intel"; // the spite-crack: Jack's name + ship name
export const HOOK_TALKED_TENG = "talked_to_teng"; // Strand-3 berth pointer (defect pathway only)
export const HOOK_RAJAH_DATACARD = "received_rajah_datacard"; // took the resistance datacard (defect endpoint)
export const HOOK_TALKED_HALE = "talked_to_hale"; // Strand-1 wall (Jack's flight instructor; sim deck, daytime)
export const HOOK_HALE_WALL = "hale_wall"; // raised the boy and met the loyal-instructor wall
// --- Food Hall: the curry death (B10) ---
export const HOOK_ATE_CURRY = "ate_curry"; // took the dare and ate the five-alarm curry
export const HOOK_SURVIVED_CURRY = "survived_curry"; // doused it with an unmelted ice cream in time
// --- Shipyard gun trail + the night patrol ---
export const HOOK_TOOK_CROWBAR = "took_crowbar"; // grabbed the Tool Store crowbar
export const HOOK_PRISED_CABINET = "prised_armoury_cabinet"; // levered open the Untheatrical gun locker
export const HOOK_TOOK_SIDEARM = "took_sidearm"; // pocketed the sidearm
export const HOOK_EVADED_PATROL = "evaded_shipyard_patrol"; // gave a closing night patrol the slip (once)
/** Point value for each scoring hook. The sum is MAX_SCORE. */
export const SCORE_POINTS = {
    [HOOK_FORM_COMPLETE]: 1,
    [HOOK_TALKED_TERRY]: 1,
    [HOOK_PERSON_OF_INTEREST]: 2,
    [HOOK_READ_CONTRACT]: 1,
    [HOOK_CHECKED_BALANCE]: 1,
    [HOOK_ID_ON_TERMINAL]: 2,
    [HOOK_ENTERED_MAINTENANCE]: 1,
    [HOOK_READ_WARNING_LABEL]: 1,
    [HOOK_PULLED_LEVER]: 5,
    [HOOK_TALKED_PASSENGER]: 1,
    [HOOK_ASKED_HORIZON_1]: 1,
    [HOOK_ASKED_HORIZON_2]: 2,
    [HOOK_LINER_AD[0]]: 1, // +1 per liner advert spot watched (3 spots = 3 pts)
    [HOOK_LINER_AD[1]]: 1,
    [HOOK_LINER_AD[2]]: 1,
    // Horizon (Phase B) — provisional values, calibrated later (Phase D).
    [HOOK_ARRIVED_HORIZON]: 1,
    [HOOK_TALKED_BARTY]: 1,
    [HOOK_ASKED_BARTY_HORIZON]: 1, // the independence/privacy stance (Strand-1 theme)
    [HOOK_ASKED_BARTY_SENSITIVE]: 2, // first smooth refusal — protection-of-everyone
    [HOOK_RODE_TUBE]: 1,
    [HOOK_REACHED_DONOVANS]: 1,
    [HOOK_TALKED_DONOVAN]: 1,
    [HOOK_DONOVAN_GREY_MARKET]: 2, // drew out the "independence cuts more than one way" grey-market hint
    [HOOK_PENTHOUSE_SNOOP]: 2, // nosed into the penthouse the maintenance crew left ajar
    [HOOK_TALKED_SANDWICH_VENDOR]: 1,
    [HOOK_SANDWICH_HE]: 2, // canonical Strand-1 fact: the Jackrabbit is "he"
    [HOOK_SANDWICH_JAM]: 1, // the apricot-jam colour detail
    [HOOK_SANDWICH_PHOTOS]: 2, // noticed the all-identical-but-the-filling photos
    [HOOK_SEEDED_ANALYSIS]: 2, // set Burke's software running at a public terminal
    [HOOK_AETHERLINK_IDENTIFIED]: 5, // Strand 2 complete: AetherLink named as paymaster
    [HOOK_FOUND_PREDECESSOR]: 3, // found the predecessor's stashed kit
    [HOOK_READ_PREDECESSOR_DIARY]: 3, // read his diary (surfaces the bar / Drayton lead)
    [HOOK_FOUND_SHIPYARD_CREDS]: 2, // banked the remote shipyard login
    [HOOK_PREDECESSOR_SAME_JOB]: 5, // cracked the sealed brief — same job, he's dead, you're the replacement
    // Phase 2 NPCs / threads
    [HOOK_TALKED_SOPHIE]: 1,
    [HOOK_SOPHIE_RECORDS_HINT]: 2, // the records signpost (refusal-is-the-hook)
    [HOOK_RECORDS_SHIP_JACKRABBIT]: 3, // the big twist: the Jackrabbit is a ship
    [HOOK_RECORDS_SHIP_WRECK]: 2, // intake: a wreck, certified by Foreman Oswald
    [HOOK_TALKED_BRINN]: 1,
    [HOOK_BRINN_WALL]: 1, // the child's wall — the visible flinch
    [HOOK_BRINN_SECOND]: 5, // the defection/flee emotional payoff
    [HOOK_FIRST_BURKE]: 2, // Burke Beat 1 — seeds Strand 2
    [HOOK_BOUGHT_ANALYSIS_SOFTWARE]: 2, // Burke Beat 2 — bought the analysis software (unlocks Strand 2 proper)
    [HOOK_BURKE_PIVOT]: 5, // Burke Beat 3 — reaching the pivot (Strands 2 + predecessor complete); provisional
    // Batch-2 NPCs — provisional values (Phase D calibration).
    [HOOK_TALKED_CELESTE_SERVER]: 1,
    [HOOK_TALKED_OZZY]: 1,
    [HOOK_OZZY_SHIP_NAME]: 2,
    [HOOK_TALKED_CHAS]: 1,
    [HOOK_CHAS_INTEL]: 4, // the hard-intel prize: Jack's real name + ship name
    [HOOK_TALKED_TENG]: 2,
    [HOOK_RAJAH_DATACARD]: 3,
    [HOOK_TALKED_HALE]: 1, // met Jack's flight instructor (the loyal sim-deck wall)
    [HOOK_HALE_WALL]: 2, // drew out his quiet, total refusal to sell a student
    // The curry: MANY points for the bravado of eating it, a FEW more for living
    // through it (provisional values — tune in Phase D).
    [HOOK_ATE_CURRY]: 8, // ate the notorious five-alarm Bengali curry
    [HOOK_SURVIVED_CURRY]: 2, // survived it on an unmelted ice cream
    // Shipyard gun trail + patrol (the gun trail's points are FORFEIT if you then
    // shoot Chas — see armoury.ts; the curry points are the only survivors).
    [HOOK_TOOK_CROWBAR]: 1,
    [HOOK_PRISED_CABINET]: 1,
    [HOOK_TOOK_SIDEARM]: 1,
    [HOOK_EVADED_PATROL]: 4, // slipped a patrol that was within 2 rooms (once)
};
/** Theoretical maximum — sum of all hook values. */
export const MAX_SCORE = Object.values(SCORE_POINTS).reduce((a, b) => a + b, 0);
/** Canonical profession choices the form offers. "Other" = free text. */
export const PROFESSIONS = [
    "Independent trader",
    "Freelance technician",
    "Journalist / media correspondent",
    "Academic researcher",
    "Private citizen (no profession declared)",
];
