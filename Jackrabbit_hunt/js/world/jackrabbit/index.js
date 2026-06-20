// The Jackrabbit Contract — assembled world.
// Currently covers the pre-Horizon sequence up to Miss Terry's briefing.
// Subsequent scenes (shuttle 1, liner, shuttle 2, Horizon arrival) will be
// added in further commits.
import { rooms } from "./rooms.js";
import { items } from "./items.js";
import { npcs } from "./npcs.js";
import { shuttle1Rooms, shuttle1Items, shuttle1WorldTick } from "./shuttle1.js";
import { linerRooms, linerItems, linerNpcs } from "./liner.js";
import { horizonRooms, horizonItems, horizonNpcs, horizonCommands, donovanLift } from "./horizon.js";
import { arboretumRooms, arboretumItems, arboretumNpcs } from "./arboretum.js";
import { analysisItems, analysisWorldTick } from "./analysis.js";
import { foodItems, foodCommands, spiceTick, buyCmd as foodBuyCmd, foodBuyRoute } from "./food.js";
import { shopBuyRoute } from "./shops.js";
import { predecessorItems } from "./predecessor.js";
import { shipyardRooms, holdCommand, liftCTick, shipyardLifts } from "./shipyard.js";
import { sophie, recordsCommands, sophieDaytimeTick } from "./records.js";
import { brinn, brinnTick } from "./brinn.js";
import { burke, burkeBuyRoute, burkeItems, burkeWorkshopDayTick } from "./burke.js";
import { dayNightTick } from "./daynight.js";
import { celesteServer } from "./celeste.js";
import { ozzy, chas, nightBarTick, barBuyRoute } from "./bar_npcs.js";
import { sleepCmd } from "./sleep.js";
import { teng, rajah, rajahDatacard, loadInsertCmd } from "./lcd_npcs.js";
import { gamblingCommands, casinoLoadRoute } from "./gambling.js";
import { armouryItems, shootCommands, convictEnding } from "./armoury.js";
import { shipyardSecurityTick, barredEnding } from "./shipyard_security.js";
import { routeCommand } from "./router.js";
import { residentialRooms, residentialLift } from "./residential.js";
import { serviceRooms } from "./service.js";
import { bazaarRooms } from "./bazaar.js";
import { industrialRooms } from "./industrial.js";
import { lowerCommercialRooms } from "./lower_commercial.js";
import { trainingRooms, trainingLift } from "./training.js";
import { entertainment1Rooms } from "./entertainment_1.js";
import { entertainment2Rooms } from "./entertainment_2.js";
import { celestialDiningRooms } from "./celestial_dining.js";
import { hostelRooms, hostelItems, hostelCommands, hostelLift } from "./hostel.js";
import { shameOnDrop, shameTick } from "./shame.js";
import { HOOK_CHECKED_BALANCE, MAX_SCORE } from "./flags.js";
import { score } from "./scoring.js";
import { balance } from "./economy.js";
import { assembleParts } from "./world-builder.js";
/**
 * `buy` — dispatched by a small room-keyed route registry (see router.ts). Each
 * commercial module owns its route; here we only list them in priority order, so
 * adding a vendor no longer edits this dispatch. Burke's workshop sells his
 * Beat-2 wares; the EZ1 bars stage drinks (the Chas build-up); food stalls sell
 * food/drink; non-food shops give a characterful wares reply; anything else falls
 * through to the food handler's "nothing for sale here".
 */
const buyCommand = routeCommand([burkeBuyRoute, barBuyRoute, foodBuyRoute, shopBuyRoute], foodBuyCmd);
/**
 * `load` — usually save-restore (+ the resistance-datacard prohibition), but in
 * EZ1's casino `LOAD 50` / `LOAD MACHINE` feeds a slot. The casino route claims
 * it only there (and only for machine-ish nouns); everything else falls through
 * to loadInsertCmd. (`insert` stays a direct alias of loadInsertCmd.)
 */
const loadCommand = routeCommand([casinoLoadRoute], loadInsertCmd);
/**
 * `check balance` / `check credits` — synthetic verb. Free action (mirrors
 * tap-ID-on-datapad). Refuses cleanly before the ID has been issued.
 */
const checkCommand = (_world, state, cmd) => {
    const noun = (cmd.noun ?? "").trim().toLowerCase();
    if (noun !== "balance" && noun !== "credits") {
        return { handled: true, output: ["Check what? Try CHECK BALANCE."], tickCost: 0, free: true };
    }
    if (!state.inventory.includes("fake_id")) {
        return { handled: true, output: ["You have no ID card to check a balance on."], tickCost: 0, free: true };
    }
    // Same hook as tap-ID-on-datapad: checking your balance scores once,
    // by whichever route the player discovers it.
    score(state, HOOK_CHECKED_BALANCE);
    return {
        handled: true,
        output: [`Available credit: ${balance(state)} credits.`],
        tickCost: 0,
        free: true,
    };
};
/**
 * The world, as a flat list of content modules — each entry groups one concern's
 * rooms / items / NPCs / verbs / world-tick / on-drop / TravelTube stop / lift in
 * one place, so adding an area is a single new entry rather than edits to a
 * fistful of parallel collections (see world-builder.ts). ORDER MATTERS for two
 * things only: (1) the cross-cutting verbs must come LAST so `buy`/`load` win
 * over an area's same-named verb (e.g. food's raw `buy`); (2) the ten tickers
 * fire in list order, so the day/night boundary set (bar/records/daynight/burke)
 * keeps its established sequence. TravelTube `pos` values are network-relative —
 * they read best together, which is why the stops live here rather than scattered
 * across the area files.
 */
const MODULES = [
    // Pre-Horizon: Halberd HQ, the shuttle, the liner.
    { rooms, items, npcs },
    { rooms: shuttle1Rooms, items: shuttle1Items, tick: shuttle1WorldTick },
    { rooms: linerRooms, items: linerItems, npcs: linerNpcs },
    // Horizon Outpost core (two dock-area stops + Donovan's lift) + the arboretum.
    {
        rooms: horizonRooms, items: horizonItems, npcs: horizonNpcs, commands: horizonCommands,
        lifts: [donovanLift],
        transitStops: [
            { room: "horizon_dockside_retail_area_zone_1", label: "the Retail Area (Dockside)", pos: 0,
                names: ["retail", "retail area", "dockside", "shops", "dock", "dockyard"] },
            { room: "horizon_blue_sector_concourse", label: "Blue Sector (Residential / Donovan's)", pos: 4,
                names: ["blue", "blue sector", "residential", "donovan", "donovans", "home", "lodging", "concourse"] },
        ],
    },
    {
        rooms: arboretumRooms, items: arboretumItems, npcs: arboretumNpcs,
        transitStops: [
            { room: "horizon_arboretum_entrance", label: "the Arboretum", pos: 9,
                names: ["arboretum", "garden", "gardens", "park", "green"] },
        ],
    },
    // Strand-2 analysis; the Shame Alarm; the Food Hall + predecessor kit.
    { items: analysisItems, tick: analysisWorldTick },
    { tick: shameTick, onDrop: shameOnDrop },
    { items: foodItems, commands: foodCommands, tick: spiceTick },
    { items: predecessorItems },
    // Mapped areas (each declares its own TravelTube stop + lift, if any).
    {
        rooms: shipyardRooms, tick: liftCTick, lifts: shipyardLifts,
        transitStops: [
            { room: "horizon_shipyard_reception", label: "the Shipyard", pos: 13,
                names: ["shipyard", "ship yard", "yard"] },
        ],
    },
    {
        rooms: residentialRooms, lifts: [residentialLift],
        transitStops: [
            { room: "horizon_residential_zone_b", label: "Residential Zone B", pos: 6,
                names: ["zone b", "residential zone b", "residential b", "zone-b", "res b"] },
        ],
    },
    {
        rooms: serviceRooms,
        transitStops: [
            { room: "horizon_service_access_corridor", label: "the Service Area", pos: 2,
                names: ["service", "service area", "service access", "maintenance", "maintenance area"] },
        ],
    },
    { rooms: bazaarRooms },
    {
        rooms: industrialRooms,
        transitStops: [
            { room: "horizon_tube_stop", label: "the Industrial Sector", pos: 11,
                names: ["industrial", "industrial sector", "industrial zone", "workshops", "workshop", "works"] },
        ],
    },
    {
        rooms: lowerCommercialRooms,
        transitStops: [
            { room: "lcd_tube_stop", label: "the Lower Commercial District (Sector 4)", pos: 8,
                names: ["lower commercial", "lower commercial district", "commercial district", "commercial",
                    "sector 4", "sector four", "rajah", "rajahs", "pharmacy", "brokerage", "ship dealer", "ships"] },
        ],
    },
    {
        rooms: trainingRooms, lifts: [trainingLift],
        transitStops: [
            { room: "training_tube_stop", label: "the Flight Training Area", pos: 15,
                names: ["training", "flight training", "flight school", "pilot school", "academy",
                    "flight academy", "simulator", "classrooms", "classroom"] },
        ],
    },
    {
        rooms: entertainment1Rooms,
        transitStops: [
            { room: "ez1_tube_stop", label: "Entertainment Zone 1", pos: 10,
                names: ["entertainment", "entertainment 1", "entertainment zone 1", "ent 1", "zone 1",
                    "nightlife", "the strip", "strip", "nightclub", "club"] },
        ],
    },
    {
        rooms: entertainment2Rooms,
        transitStops: [
            { room: "ez2_tube_stop", label: "Entertainment Zone 2 (Arcade)", pos: 12,
                names: ["arcade", "entertainment 2", "entertainment zone 2", "ent 2", "zone 2",
                    "games", "games arcade", "amusements", "pool"] },
        ],
    },
    {
        rooms: celestialDiningRooms,
        transitStops: [
            { room: "cda_tube_stop", label: "the Celestial Dining Area", pos: 7,
                names: ["celestial", "celestial dining", "dining", "restaurants", "restaurant",
                    "fine dining", "burrito", "burrito celeste", "celeste"] },
        ],
    },
    { rooms: hostelRooms, items: hostelItems, commands: hostelCommands, lifts: [hostelLift] },
    // NPCs & threads (tick order here matches the old onTick list: brinn,
    // bar_npcs, records, daynight, burke).
    { npcs: { brinn }, tick: brinnTick },
    { npcs: { ozzy, chas }, tick: nightBarTick },
    { npcs: { sophie }, commands: recordsCommands, tick: sophieDaytimeTick },
    { npcs: { celeste_server: celesteServer } },
    { tick: dayNightTick },
    { npcs: { burke }, items: burkeItems, tick: burkeWorkshopDayTick },
    { npcs: { teng, rajah }, items: { rajah_datacard: rajahDatacard } },
    { commands: gamblingCommands },
    // The shipyard yard-proper: the armoury gun trail (items + the SHOOT verb) and
    // the night patrol / 3-strike security ticker. The tick sits AFTER dayNightTick
    // (above) so it reads the current phase — a tick that flips to dawn collars a
    // loiterer at once.
    { items: armouryItems, commands: shootCommands, tick: shipyardSecurityTick },
    // Cross-cutting verbs — LAST so they win key clashes (food's raw `buy`, etc.).
    {
        commands: {
            check: checkCommand,
            buy: buyCommand,
            hold: holdCommand, grip: holdCommand, cling: holdCommand,
            load: loadCommand, insert: loadInsertCmd,
            sleep: sleepCmd, rest: sleepCmd, nap: sleepCmd, doze: sleepCmd, snooze: sleepCmd,
        },
    },
];
export const jackrabbitWorld = {
    title: "The Jackrabbit Contract",
    startRoom: "halberd_lobby",
    maxScore: MAX_SCORE,
    endings: {
        // Flee — the disillusioned exit (Burke's pivot, road one). STUB (B8): a
        // serviceable minimal ending so the Flee road resolves coherently; the full
        // cut-scene (Burke lifting the transponder on-screen, the transport, the
        // bespoke closer) is still to be authored. survived = true, unpaid.
        flee: {
            id: "flee",
            survived: true,
            text: "Burke holds out one enormous hand. \"The 'pad. You'll not need their notes where you're going — " +
                "and you'll not want their kit on you.\" You hesitate, then set it in his palm; he pockets it " +
                "without a word, and something you hadn't known was tight in your chest lets go.\n\n" +
                "He's as good as it. A freight tender, no manifest, no questions; a berth that smells of machine " +
                "oil and other people's cargo. By the time the station's lights have shrunk to one more star " +
                "behind you, the contract, the boy, the people who never gave you their name — all of it is " +
                "somebody else's business now. You don't look back.",
            closingText: "You walk away with nothing but your own name and whatever you make of it next — which, you're " +
                "beginning to think, might be the only honest pay this job was ever going to offer.",
        },
        // Convict — the dark, optional end of the shipyard gun trail: shoot Chas
        // Drayton at the Long Shot and the station's law buries you (armoury.ts).
        convict: convictEnding,
        // Deported — three strikes snooping in the shipyard yard and the Outpost
        // bars you for good (shipyard_security.ts).
        barred: barredEnding,
    },
    initialState: {
        dayLength: 100,
        isDaytime: true,
        flags: {},
    },
    openingText: "── THE JACKRABBIT CONTRACT ──\n\n" +
        "You arrive at Halberd Recovery Services for the contract briefing. " +
        "The third-floor office is unremarkable in the way that offices designed " +
        "not to be noticed are unremarkable.",
    helpText: "Commands:\n" +
        "  look (l), examine (x) <thing>, take/get <thing> (or 'take all'),\n" +
        "  drop <thing>, push/pull/shove <thing>, open/close <thing>,\n" +
        "  inventory (i), use <a> on <b>, tap <a> on <b>, talk to <npc>,\n" +
        "  ask <npc> about <topic>, buy <thing>, eat <thing>, read <thing>,\n" +
        "  give <thing> to <npc>, check balance, scan id (at any reader).\n" +
        "Movement: n/s/e/w, up, down, in, out, go <direction>, follow <person>.\n" +
        "Also:     sit, stand, hold (grip a handhold).\n" +
        "Time:     wait, wait <N>, wait until morning, wait until night.\n" +
        "Meta:     score, time, notes, add note <text>, help, save, load, restart, quit.\n\n" +
        "Free verbs (score / help / time) don't cost a turn.\n" +
        "Saves use one slot in your browser's local storage.",
    // rooms / items / npcs / commands / onTick / onDrop are merged from MODULES
    // above (see world-builder.ts): scene tickers fold into one onTick (each a
    // no-op outside its scene; a big WAIT reports them all) and the Shame Alarm's
    // onDrop chains in the same way.
    ...assembleParts(MODULES),
    // Header alias is driven from state.flags[PC_ALIAS], populated by the form.
    // Rank bands are placeholders until the real max is settled (user's call).
    rankFromScore: (sc, max) => {
        if (max === 0)
            return "—";
        if (sc === 0)
            return "Bystander";
        if (sc < max * 0.5)
            return "Contractor";
        return "Operator";
    },
};
