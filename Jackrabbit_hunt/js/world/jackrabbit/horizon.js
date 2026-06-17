// Horizon Outpost — Phase B content (the main investigation).
// Architecture locked in jackrabbit-horizon-plot-design.md; spec v0.5 §5.
//
// LAYOUT (canon-driven):
//   Dock (arrival concourse) is at the edge of the docking area. A short walk
//   leads through the Food Hall to the Retail Area, which holds the TravelTube
//   stop NEAREST the dock. The 'Tube is a single network of mag-lev pods (no
//   "lines"); every public district has a STOP. Pods are summoned by ID scan,
//   boarded, and a destination chosen on an in-pod touchscreen; the ride
//   occupies real turns (2–8 ticks by distance).
//
// Directions on Horizon are cardinal (n/s/e/w, up/down) — the ship-relative
// aft/forward set belongs to the pre-Horizon shuttle only.
//
// BUILT SO FAR: Dock (concourse + officer's desk), Food Hall (traversal),
//   Retail Area (tube stop), the TravelPod, and Blue Sector (tube stop +
//   Donovan's). Other districts attach as further slices land.
import { itemsInRoom } from "../../engine/items.js";
import { aliasedTopics, requestSceneTransition, requestPushModal } from "../../engine/authoring.js";
import { addNote } from "../../engine/notes.js";
import { HOOK_ARRIVED_HORIZON, HOOK_TALKED_BARTY, HOOK_ASKED_BARTY_HORIZON, HOOK_ASKED_BARTY_SENSITIVE, HOOK_REACHED_DONOVANS, HOOK_TALKED_DONOVAN, HOOK_RODE_TUBE, HOOK_TALKED_SANDWICH_VENDOR, HOOK_SANDWICH_HE, HOOK_SANDWICH_JAM, HOOK_SANDWICH_PHOTOS, FLAG_PC_ALIAS, FLAG_ID_SCANNED, FLAG_DONOVAN_CHECKED_IN, FLAG_DONOVAN_ROOM, FLAG_DONOVAN_WELCOMED, HOOK_DONOVAN_GREY_MARKET, HOOK_PENTHOUSE_SNOOP, FLAG_SHOWERS_UNLOCKED, } from "./flags.js";
import { score } from "./scoring.js";
import { buildArea, buildAreaFromYaml } from "./area.js";
import { placeNpcInRoom } from "../../engine/npcs.js";
import { withLiftDirs, liftDescription, isLiftRoom, liftSelect } from "./lifts.js";
import { registerRideOverride, isTransitStop, transitStop, rideTicks, matchDestination, destinationsFrom, } from "./transit.js";
import { scanToPay, isFoodStallRoom } from "./food.js";
import { longShotSit, longShotStand, LONG_SHOT } from "./bar_npcs.js";
// --- TravelTube model ---------------------------------------------------
// The TravelTube is the game's dress for the generic transit network (see
// transit.ts): named stops joined by mag-lev pods, summoned by ID scan. Each
// area now declares its own stop in its MODULES entry (index.ts), registered
// during world assembly; in-game everything below stays "TravelTube". One
// network detail stays here: the well-used Retail<->LCD run is paced by the
// network, not the abstract geometry.
registerRideOverride("horizon_dockside_retail_area_zone_1", "lcd_tube_stop", 3);
// --- TravelTube world commands ------------------------------------------
// scan/summon (at a stop) → board → select (in pod) → ride → arrive.
// disembark leaves the pod before departure.
/** Shared summon logic, used by the SCAN verb and by `use id on reader`. */
export function summonPod(s) {
    if (!isTransitStop(s.currentRoom)) {
        return { output: ["There's no TravelTube reader here to scan."], tickCost: 0, free: true };
    }
    if (s.flags["pod_summoned_at"] === s.currentRoom) {
        return { output: ["A pod already waits in the bay, doors open. You can BOARD it."], tickCost: 0, free: true };
    }
    s.flags["pod_summoned_at"] = s.currentRoom;
    return {
        output: [
            "You present your ID to the reader. A green flash. A moment later a pod glides into " +
                "the bay and its doors slide open.",
            "You can BOARD it.",
        ],
        tickCost: 1,
    };
}
/** Normalise an item handler's ItemActionResult into a CommandResult. */
function asCommandResult(res) {
    if (res === undefined)
        return { handled: true, tickCost: 1 };
    if (typeof res === "string")
        return { handled: true, output: [res], tickCost: 1 };
    if (Array.isArray(res))
        return { handled: true, output: res, tickCost: 1 };
    const output = res.output === undefined ? undefined : (Array.isArray(res.output) ? res.output : [res.output]);
    return { handled: true, output, tickCost: res.tickCost ?? 1, free: res.free };
}
function scanTargetsInRoom(w, s) {
    const out = [];
    if (isTransitStop(s.currentRoom)) {
        out.push({
            keys: ["tube", "traveltube", "travel tube", "pod", "reader", "tube reader", "scanner", "post", "stop"],
            short: "tube",
            label: "the TravelTube reader (to summon a pod)",
            run: () => ({ handled: true, ...summonPod(s) }),
        });
    }
    for (const id of itemsInRoom(s, s.currentRoom)) {
        const it = w.items[id];
        if (!it?.onScan)
            continue;
        out.push({
            keys: [it.name.toLowerCase(), ...(it.aliases ?? []).map((a) => a.toLowerCase())],
            short: it.name,
            label: `the ${it.name}`,
            run: () => s.inventory.includes("fake_id")
                ? asCommandResult(it.onScan(s))
                : { handled: true, output: ["You have no ID card to scan."], tickCost: 0, free: true },
        });
    }
    if (isFoodStallRoom(s.currentRoom)) {
        out.push({
            keys: ["pay", "honesty", "honesty scanner", "counter", "stall", "food"],
            short: "counter",
            label: "the counter (to pay)",
            run: () => scanToPay(s) ?? { handled: true, output: ["There's nothing to pay for here."], tickCost: 0, free: true },
        });
    }
    return out;
}
const ID_WORDS = new Set(["", "id", "card", "my id", "id card", "identification", "pass"]);
const scanCmd = (w, s, cmd) => {
    const targets = scanTargetsInRoom(w, s);
    if (targets.length === 0) {
        return { handled: true, output: ["There's no ID reader here to scan."], tickCost: 0, free: true };
    }
    // An explicit target named in the command: SCAN TURNSTILE, SCAN ID ON TERMINAL.
    let explicit = (cmd.noun2 ?? "").trim().toLowerCase();
    if (!explicit) {
        const n = (cmd.noun ?? "").trim().toLowerCase();
        if (!ID_WORDS.has(n))
            explicit = n;
    }
    if (explicit) {
        let matches = targets.filter((t) => t.keys.includes(explicit));
        if (matches.length === 0) {
            matches = targets.filter((t) => t.keys.some((k) => k.includes(explicit) || explicit.includes(k)));
        }
        if (matches.length === 1)
            return matches[0].run();
        if (matches.length === 0) {
            return { handled: true, output: [`There's nothing like "${explicit}" to scan your ID on here.`], tickCost: 0, free: true };
        }
        // still ambiguous — fall through to the prompt
    }
    else if (targets.length === 1) {
        return targets[0].run();
    }
    // More than one scanner here (a stop that also hosts a facility): ask which.
    const labels = targets.map((t) => t.label);
    const list = labels.length === 2 ? `${labels[0]} or ${labels[1]}` : labels.join(", ");
    const eg = targets.map((t) => `SCAN ${t.short.toUpperCase()}`).join(" or ");
    return {
        handled: true,
        output: [`There's more than one reader here. Scan your ID on which — ${list}? (${eg}.)`],
        tickCost: 0, free: true,
    };
};
/** SUMMON — the no-prompt shortcut for a TravelTube pod (so the common action
 *  stays one word even at a stop that also hosts a facility). */
const summonCmd = (_w, s, _cmd) => isTransitStop(s.currentRoom)
    ? { handled: true, ...summonPod(s) }
    : { handled: true, output: ["There's no TravelTube pod to summon here."], tickCost: 0, free: true };
const boardCmd = (_w, s, _cmd) => {
    if (!isTransitStop(s.currentRoom)) {
        return { handled: true, output: ["There's nothing to board here."], tickCost: 0, free: true };
    }
    if (s.flags["pod_summoned_at"] !== s.currentRoom) {
        return { handled: true, output: ["You'll need to summon a pod first — SCAN your ID at the reader."], tickCost: 0, free: true };
    }
    delete s.flags["pod_summoned_at"];
    // Boarding docks the pod at this stop. A fresh boarding clears any prior trip
    // state (the pod is a persistent vehicle once you're aboard).
    s.flags["pod_at"] = s.currentRoom;
    delete s.flags["pod_selected"];
    delete s.flags["pod_moving"];
    delete s.flags["pod_seated"];
    requestSceneTransition(s, "travelpod");
    return { handled: true, output: ["You step through the sliding doors into the pod. The doors stay open; she won't move until you've chosen a stop and sat down."], tickCost: 1 };
};
// SELECT only CHOOSES a destination; the pod departs when you SIT DOWN (canon:
// it won't move until everyone aboard is seated). DISEMBARK lets you change your
// mind before then.
const selectCmd = (w, s, cmd) => {
    // `select` is shared: a lift floor when in a lift car, a pod stop when aboard.
    if (isLiftRoom(s.currentRoom))
        return liftSelect(w, s, cmd);
    if (s.currentRoom !== "travelpod") {
        return { handled: true, output: ["There's nothing here to select."], tickCost: 0, free: true };
    }
    if (s.flags["pod_moving"]) {
        return { handled: true, output: ["The pod is already under way. Sit tight."], tickCost: 0, free: true };
    }
    const noun = (cmd.noun ?? "").trim();
    if (!noun) {
        return { handled: true, output: ["Select which destination? Examine the touchscreen for the list."], tickCost: 0, free: true };
    }
    const at = s.flags["pod_at"] ?? "";
    const dest = matchDestination(noun, at);
    if (!dest) {
        return {
            handled: true,
            output: [`The touchscreen doesn't offer "${noun}". (Examine the screen for the destination list.)`],
            tickCost: 0, free: true,
        };
    }
    s.flags["pod_selected"] = dest.room;
    return {
        handled: true,
        output: [
            `You tap ${dest.label} on the screen; it lights, selected. The pod stays put, doors open — ` +
                "it won't move until you SIT DOWN. (Or DISEMBARK to step back out.)",
        ],
        tickCost: 1,
    };
};
// SIT departs (if a destination is chosen). The trigger is the act of sitting.
const sitCmd = (_w, s, _cmd) => {
    if (s.currentRoom === LONG_SHOT)
        return longShotSit(s);
    if (s.currentRoom !== "travelpod") {
        return { handled: true, output: ["There's nowhere in particular to sit just here."], tickCost: 0, free: true };
    }
    if (s.flags["pod_moving"]) {
        return { handled: true, output: ["You're already seated, and she's already running."], tickCost: 0, free: true };
    }
    const dest = s.flags["pod_selected"];
    if (!dest) {
        return { handled: true, output: ["You sit — but the pod won't go anywhere until you SELECT a destination."], tickCost: 1 };
    }
    s.flags["pod_seated"] = true;
    s.flags["pod_moving"] = true;
    s.flags["pod_depart_tick"] = s.ticks;
    s.flags["pod_travel"] = rideTicks(s.flags["pod_at"] ?? "", dest);
    return {
        handled: true,
        output: [
            "You settle into a seat. The doors seal with a soft hush and the pod slides into motion — " +
                "smooth, fast, and all but silent.",
        ],
        tickCost: 1,
    };
};
// STAND is refused in transit (no standing while she runs).
const standCmd = (_w, s, _cmd) => {
    if (s.currentRoom === LONG_SHOT)
        return longShotStand(s);
    if (s.currentRoom !== "travelpod") {
        return { handled: true, output: ["You're already on your feet."], tickCost: 0, free: true };
    }
    if (s.flags["pod_moving"]) {
        return { handled: true, output: ["No standing while she runs — the restraints won't have it, and neither would the pod."], tickCost: 0, free: true };
    }
    if (s.flags["pod_seated"]) {
        delete s.flags["pod_seated"];
        return { handled: true, output: ["You get back to your feet."], tickCost: 0, free: true };
    }
    return { handled: true, output: ["You're already standing."], tickCost: 0, free: true };
};
const disembarkCmd = (_w, s, _cmd) => {
    if (s.currentRoom !== "travelpod") {
        return { handled: true, output: ["You're not aboard a pod."], tickCost: 0, free: true };
    }
    if (s.flags["pod_moving"]) {
        return { handled: true, output: ["The pod is in motion; the doors are sealed."], tickCost: 0, free: true };
    }
    const at = s.flags["pod_at"] ?? "horizon_dockside_retail_area_zone_1";
    delete s.flags["pod_at"];
    delete s.flags["pod_selected"];
    delete s.flags["pod_seated"];
    requestSceneTransition(s, at);
    return { handled: true, output: ["You step out of the pod onto the platform."], tickCost: 1 };
};
export const horizonCommands = {
    scan: scanCmd, present: scanCmd, summon: summonCmd,
    board: boardCmd,
    select: selectCmd,
    sit: sitCmd, stand: standCmd,
    disembark: disembarkCmd,
};
// --- Rooms --------------------------------------------------------------
// --- Dockside (mapped with tools/mapper.html) ---------------------------
// A vast docking complex: the arrival concourse, the dock officer's desk, four
// docking zones (A–D) each opening onto a bank of twelve numbered bays, a
// corridor to a meeting-rooms suite. The Food Hall attaches at Docking Zone C
// (north). Anchors preserved: horizon_arrival_concourse (Shuttle-2 landing +
// arrived_horizon hook + Barty + signage) and horizon_dock_desk (Barty).
//
//   concourse ──E── zone A ──E── zone B ──E── zone C ──E── zone D ──E── corridor ──E── meeting access
//   concourse ──N── dock desk            zone C ──N── Food Hall (cross-area)
//   each zone ──S── its bay-access (12 bays)         meeting access → rooms 1/2/3
const BAY_DESC = (range, zone) => `A broad access gallery serving bays ${range}. Along the outer side, numbered ship-doors large ` +
    `enough to navigate a small vessel through stand closed or open onto their berths. On the inner ` +
    `side, pedestrian doors give access to each bay directly from the gallery. Cargo drones weave ` +
    `between pallets and pedestrians with unhurried indifference. Docking Zone ${zone} is back to the north.`;
const docksideDefs = [
    {
        id: "horizon_arrival_concourse",
        name: "Horizon Outpost — Arrival Concourse",
        description: "The arrival concourse: the throat of the whole docking complex, a long shallow valley of foot " +
            "traffic curving away with the cylinder until the far end seems, impossibly, to rise. The air " +
            "smells of metal, hydraulic fluid, and the faint ozone tang of pressure seals — a working " +
            "dockyard, unmistakably. Dozens of people mill and cross and pause, the chatter a continuous " +
            "good-natured hubbub in a dozen or more languages, punctuated by the occasional wheeled drone " +
            "scurrying past on errands of its own. Bright, multicoloured signs glow along the inner wall, " +
            "advertising shops, services, and eateries further into the station.\n\n" +
            "Closest of all, to the west, a quieter frontage stands a little apart from the bustle: a dockside " +
            "hostel, by its modest illuminated sign — the easy first roof for anyone straight off a shuttle, an " +
            "ID reader glowing beside the door in place of any reception desk. A dock officer's desk sits in a " +
            "recess to the north, and the docking zones proper begin to the east.",
        exits: { west: "horizon_hostel_entrance", north: "horizon_dock_desk", east: "horizon_docking_zone_a" },
        items: ["concourse_signage"],
        npcs: ["barty"],
        onEnter: (s) => { score(s, HOOK_ARRIVED_HORIZON); },
    },
    {
        id: "horizon_dock_desk",
        name: "Horizon Outpost — Dock Officer's Desk",
        description: "A tidy recess off the main flow, just wide enough for a counter, a stool, and the dock " +
            "officer behind them. A worn brass nameplate reads BARTRAM. Behind him, a board of docking " +
            "slots updates itself in slow, patient increments.\n\nThe concourse is back to the south.",
        exits: { south: "horizon_arrival_concourse" },
        // Barty is statically on the concourse greeting arrivals; the first time the
        // PC comes to his desk he settles here for good (and so disappears from the
        // concourse — an NPC is only ever in one place under the npcLocations model).
        npcs: [],
        onEnter: (s) => { placeNpcInRoom(s, "barty", "horizon_dock_desk"); },
    },
    // Docking zones A–D (the spine east from the concourse)
    {
        id: "horizon_docking_zone_a", name: "Horizon Outpost — Docking Zone A",
        description: "The first of the docking zones: a vast commercial hall lined with chandlers, freight offices, " +
            "and the occasional shuttered front. Busy but not frantic — the steady commerce of a working " +
            "port. The hall runs east to the neighbouring zones and west back toward the arrival concourse; " +
            "the bay-access gallery for bays 1–12 opens to the south.",
        exits: { west: "horizon_arrival_concourse", east: "horizon_docking_zone_b", south: "horizon_docking_bay_1_12_access" },
    },
    {
        id: "horizon_docking_zone_b", name: "Horizon Outpost — Docking Zone B",
        description: "Docking Zone B: much like Zone A but louder — a freight handler's trolley grinding past, two " +
            "dockhands arguing cheerfully over a manifest near the far wall. One side is dominated by a large " +
            "chandlery whose open doors spill the smell of rope, oil, and packaged rations out into the hall. " +
            "The zones continue east and west; the bay-access gallery for bays 13–24 opens to the south.",
        exits: { west: "horizon_docking_zone_a", east: "horizon_docking_zone_c", south: "horizon_docking_bay_13_24_access" },
    },
    {
        id: "horizon_docking_zone_c", name: "Horizon Outpost — Docking Zone C",
        description: "The busiest of the four zones, Zone C has the feel of a proper marketplace: more foot traffic, " +
            "more noise, more signs competing for attention overhead. To the north, an archway and the smell " +
            "of cooking mark the way through to the Food Hall. The zones continue east and west; the bay-" +
            "access gallery for bays 25–36 opens to the south.",
        exits: {
            west: "horizon_docking_zone_b", east: "horizon_docking_zone_d",
            south: "horizon_docking_bay_25_36_access", north: "horizon_food_hall_zone_3",
        },
    },
    {
        id: "horizon_docking_zone_d", name: "Horizon Outpost — Docking Zone D",
        description: "The quiet end of the docking concourse, where the through-traffic thins and the bays mostly " +
            "stand idle — long-term freighters, a few vessels that look like they haven't moved in months. " +
            "The hall gives way to a plainer service corridor heading east. The bay-access gallery for bays " +
            "37–48 opens to the south; Zone C is back to the west.",
        exits: { west: "horizon_docking_zone_c", east: "horizon_dockside_corridor", south: "horizon_docking_bay_37_48_access" },
    },
    // Bay-access galleries (one per zone)
    { id: "horizon_docking_bay_1_12_access", name: "Horizon Outpost — Docking Bays 1–12", description: BAY_DESC("1–12", "A"), exits: { north: "horizon_docking_zone_a" } },
    { id: "horizon_docking_bay_13_24_access", name: "Horizon Outpost — Docking Bays 13–24", description: BAY_DESC("13–24", "B"), exits: { north: "horizon_docking_zone_b" } },
    { id: "horizon_docking_bay_25_36_access", name: "Horizon Outpost — Docking Bays 25–36", description: BAY_DESC("25–36", "C"), exits: { north: "horizon_docking_zone_c" } },
    { id: "horizon_docking_bay_37_48_access", name: "Horizon Outpost — Docking Bays 37–48", description: BAY_DESC("37–48", "D"), exits: { north: "horizon_docking_zone_d" } },
    // Corridor + meeting-rooms suite (off Zone D, away from the public flow)
    {
        id: "horizon_dockside_corridor", name: "Horizon Outpost — Dockside Corridor",
        description: "A relatively plain but well-maintained corridor leading away from the docking halls, the noise " +
            "and bustle of the berths fading behind you. The lighting is clean and even, the floor unmarked. " +
            "Docking Zone D is back to the west; a suite of meeting rooms lies east.",
        exits: { west: "horizon_docking_zone_d", east: "horizon_meeting_rooms_access" },
    },
    {
        id: "horizon_meeting_rooms_access", name: "Horizon Outpost — Meeting Rooms",
        description: "A small lobby serving three meeting rooms — the kind of bland, deniable space where dockside " +
            "business gets done out of the crowd's earshot. Doors lead off to rooms 1 (north), 2 (east), and " +
            "3 (south); the corridor runs back west.",
        exits: {
            west: "horizon_dockside_corridor",
            north: "horizon_meeting_room_1", east: "horizon_meeting_room_2", south: "horizon_meeting_room_3",
        },
    },
    { id: "horizon_meeting_room_1", name: "Horizon Outpost — Meeting Room 1", description: "Small but more comfortable than the lobby suggests: a settee and a pair of chairs around a low table, and a terminal set against one wall — the kind with an official-looking slot in the front that hints at administrative functions beyond simple messaging. The door has a deadbolt, lockable by personal code for a set period. Whatever is said here stays here. The lobby is back to the south.", exits: { south: "horizon_meeting_rooms_access" } },
    { id: "horizon_meeting_room_2", name: "Horizon Outpost — Meeting Room 2", description: "A small meeting room: four chairs around a central table, scuffed at the edges from years of elbows and briefcases. Someone has left a half-empty cup of something long cold on the table, which says everything about the kind of meetings held here. The lobby is back to the west.", exits: { west: "horizon_meeting_rooms_access" } },
    { id: "horizon_meeting_room_3", name: "Horizon Outpost — Meeting Room 3", description: "A small meeting room, identical in layout to the others — five chairs, a table, walls that have heard things and kept them — but with a faint smell of disinfectant that suggests recent and thorough cleaning. Whatever happened here, it has been dealt with. The lobby is back to the north.", exits: { north: "horizon_meeting_rooms_access" } },
    // The Dockside Hostel (off the arrival concourse, west; on foot) is a large
    // multi-floor, lift-served building — built procedurally in hostel.ts. The
    // concourse's west exit (above) points at its reception foyer
    // (horizon_hostel_entrance); the labelled cross-area exit is set after buildArea.
];
const docksideRooms = buildArea(docksideDefs);
// Cross-area, on-foot link west into the Dockside Hostel's reception foyer (the
// hostel is built procedurally in hostel.ts). Labelled here so the concourse
// signposts "The Hostel".
docksideRooms["horizon_arrival_concourse"].exits.west =
    { to: "horizon_hostel_entrance", description: "The Hostel" };
// --- Food Hall (mapped with tools/mapper.html) --------------------------
// A three-zone promenade running north from the dock concourse to the Retail
// Area, with stalls branching east/west off each zone. No TravelTube stop here
// (canon: the nearest stop is in Retail, reached through the hall).
//
//   concourse → (n) zone 3 → (n) zone 2 → (n) zone 1 → (n) Retail
//   zone 3: E salad bowls,  W lavatory
//   zone 2: E sandwich counter (canonical hook), W Hank's burgers
//   zone 1: E ice cream hut, W Bengali delights
const foodHallZone3 = {
    id: "horizon_food_hall_zone_3",
    name: "Horizon Outpost — Food Hall (South End)",
    description: "The food hall's south end, where it spills out toward the docks: a bright, clattering cavern of " +
        "grills and steamers and cold-cases under a forest of colourful signs which individually would be " +
        "eye-catching, but concentrated as they are, spending too long looking at them is more nauseating " +
        "than anything on the menu. The air is thick with the competing smells of a dozen cuisines — frying " +
        "oil, spice, something sweetly caramelised underneath it all. Travellers eat standing, crouched on " +
        "rails, or wedged at shared tables.\n\n" +
        "A salad bar gleams to the east; a public lavatory is signed to the west. The hall runs on " +
        "to the north; back south, an archway opens onto Docking Zone C.",
    exits: {
        south: { to: "horizon_docking_zone_c", description: "back to the docks (Zone C)" },
        north: { to: "horizon_food_hall_zone_2", description: "deeper into the hall" },
        east: { to: "horizon_fresh_salad_bowls", description: "Fresh Salad Bowls" },
        west: { to: "horizon_unisex_lavatory", description: "the lavatory" },
    },
    items: [],
    npcs: [],
};
const foodHallZone2 = {
    id: "horizon_food_hall_zone_2",
    name: "Horizon Outpost — Food Hall (Middle)",
    description: "The thick of the food hall, where the noise and the smells reach their peak: the crowd densest " +
        "here, conversations overlapping in half a dozen languages. The aromas of every stall compete for " +
        "dominance, each shift in the air bringing a different assault — a wave of fierce, heady spice that " +
        "threatens to overwhelm everything, then gone just as suddenly, swept aside by the smell of burgers " +
        "griddling on an open flame. The movement of people stirs it all into a constant, kaleidoscopic " +
        "churn of scent that is, against all odds, utterly appetising.\n\n" +
        "A sandwich counter does the briskest trade of anything in sight, off to the east; a burger grill " +
        "flames and hisses to the west. The hall continues north and south.",
    exits: {
        south: { to: "horizon_food_hall_zone_3", description: "toward the docks end" },
        north: { to: "horizon_food_hall_zone_1", description: "toward the retail end" },
        east: { to: "horizon_sandwich_counter", description: "the sandwich counter" },
        west: { to: "horizon_hanks_burgers", description: "Hank's Burgers" },
    },
    items: [],
    npcs: [],
};
const foodHallZone1 = {
    id: "horizon_food_hall_zone_1",
    name: "Horizon Outpost — Food Hall (North End)",
    description: "The food hall thins toward its north end — fewer stalls, fewer people, the roar of the middle " +
        "section fading to a manageable hum. The smells of cooking gradually give way to the cleaner, " +
        "cooler air drifting in from the Retail Area beyond. An ice-cream hut glows cheerfully to the east; " +
        "to the west, Bengali Delights perfumes the air with spices so fierce and complex they make your " +
        "eyes water from ten metres away.\n\n" +
        "The Retail Area is north; the hall runs back south.",
    exits: {
        south: { to: "horizon_food_hall_zone_2", description: "deeper into the hall" },
        north: { to: "horizon_dockside_retail_area_zone_1", description: "to the Retail Area" },
        east: { to: "horizon_ice_cream_hut", description: "the ice-cream hut" },
        west: { to: "horizon_bengali_delights", description: "Bengali Delights" },
    },
    items: [],
    npcs: [],
};
// --- Food Hall stalls ---------------------------------------------------
const sandwichCounter = {
    id: "horizon_sandwich_counter",
    name: "Horizon Outpost — Sandwich Counter",
    description: "A narrow, immaculate counter, its hatch framed on every side by colour photographs of " +
        "sandwiches. They are, on inspection, all the same sandwich — the same white bread, the same " +
        "neat diagonal cut — distinguished one from another only by the colour of the filling " +
        "between the slices: a wall of identical bread bracketing a paint-chart of reds, browns, " +
        "yellows, and one warm orange. The seller works fast and cheerfully behind it.\n\n" +
        "The middle of the hall is back to the west.",
    exits: {
        west: { to: "horizon_food_hall_zone_2", description: "back into the hall" },
    },
    items: ["sandwich_menu", "sandwich_photos"],
    npcs: ["sandwich_vendor"],
};
const hanksBurgers = {
    id: "horizon_hanks_burgers",
    scenery: {
        griddle: "A wall of flame and griddle-smoke, worked by Hank with theatrical disregard for his own safety and total command of the result.",
        burgers: "Enormous burgers, smelling frankly magnificent. BUY a BURGER, or chance the Hank Special if you've an hour to spare and no flight to catch.",
        counter: "A counter forever slick with grease and glory, Hank presiding over it like a man who has never once doubted his calling.",
    },
    name: "Horizon Outpost — Hank's Burgers",
    description: "A wall of flame and griddle-smoke behind a counter manned by a vast, genial man who must " +
        "be Hank. The burgers are enormous and smell, frankly, magnificent. Nothing about the place " +
        "suggests it has ever thought about anything but burgers.\n\n" +
        "The hall is back to the east.",
    exits: {
        east: { to: "horizon_food_hall_zone_2", description: "back into the hall" },
    },
    items: [],
    npcs: ["hank"],
};
const bengaliDelights = {
    id: "horizon_bengali_delights",
    scenery: {
        spices: "Spices stacked in vivid heaps, the air above them thick enough to make your eyes water in pre-emptive self-defence. The smell is extraordinary — complex, fierce, and not entirely safe.",
        sign: "A small, handwritten sign: Today's special: Not for the faint-hearted. It is not, you suspect, being modest.",
        brass: "Brass fittings polished to a glow, a jewel-box of a stall around a kitchen that means you genuine harm.",
        curry: "The day's curry, deep red and innocent-looking. You've heard the stories. BUY a CURRY if you fancy your chances — and BUY an ICE CREAM first if you value your life.",
    },
    name: "Horizon Outpost — Bengali Delights",
    description: "A jewel-box of a stall, all brass fittings and vivid colour, the air inside thick with spices " +
        "that cause your eyes to start watering in defence. The smell is extraordinary — complex, fierce, " +
        "and not entirely safe. A small, handwritten sign on the counter reads: Today's special: Not for " +
        "the faint-hearted.\n\n" +
        "The hall is back to the east.",
    exits: {
        east: { to: "horizon_food_hall_zone_1", description: "back into the hall" },
    },
    items: [],
    npcs: [],
};
const iceCreamHut = {
    id: "horizon_ice_cream_hut",
    scenery: {
        tubs: "Tubs of impossible colours under frost-fogged glass, the flavours labelled in a hopeful hand. BUY an ICE CREAM — and eat it fast, before it betrays you.",
        glass: "Frost-fogged glass over the tubs, cold air pooling pleasantly around your ankles where it spills out below.",
        queue: "A queue of children and the recently-childish, shuffling past the flavours with the solemnity the choice deserves.",
    },
    name: "Horizon Outpost — Ice-Cream Hut",
    description: "A small bright hut ringed with tubs of impossible colours under frost-fogged glass, a " +
        "queue of children and the recently-childish shuffling past the flavours. Cold air pools " +
        "pleasantly around your ankles.\n\n" +
        "The hall is back to the west.",
    exits: {
        west: { to: "horizon_food_hall_zone_1", description: "back into the hall" },
    },
    items: [],
    npcs: [],
};
const freshSaladBowls = {
    id: "horizon_fresh_salad_bowls",
    scenery: {
        greens: "Build-your-own bowls of improbably crisp greens, arboretum-grown and quietly smug about it. BUY a SALAD, or SCAN to pay the honesty box.",
        sign: "A sign boasting ARBORETUM-GROWN, which on a station this far from soil is less a boast than a small miracle.",
        scanner: "A small ID scanner on the counter — the honesty box, trusting you to scan and pay before helping yourself. SCAN to pay.",
        bowls: "Build-your-own bowls doing steady, virtuous trade. BUY a SALAD if you're feeling superior to the burger queue.",
    },
    name: "Horizon Outpost — Fresh Salad Bowls",
    description: "An aggressively healthy counter of build-your-own bowls, the greens improbably crisp for a " +
        "station this far from anywhere with soil. A sign boasts ARBORETUM-GROWN. The stall is unmanned — " +
        "a small ID scanner on the counter serves as an honesty box, trusting you to scan and pay before " +
        "helping yourself. Doing steady, virtuous trade.\n\n" +
        "The hall is back to the west.",
    exits: {
        west: { to: "horizon_food_hall_zone_3", description: "back into the hall" },
    },
    items: [],
    npcs: [],
};
const unisexLavatory = {
    id: "horizon_unisex_lavatory",
    name: "Horizon Outpost — Public Lavatory",
    description: "A clean, well-kept public convenience: a row of cubicles, basins, and the eternal patient " +
        "hum of an air handler. A notice thanks you, in eight languages, for keeping Horizon tidy. A dull " +
        "access panel sits low on the wall behind the far cubicle, ignored by everyone.\n\n" +
        "The hall is back to the east.",
    exits: {
        east: { to: "horizon_food_hall_zone_3", description: "back into the hall" },
    },
    items: ["lavatory_panel"],
    npcs: [],
};
// --- Retail Area (Dockside) — expanded from the user's mapper export -----
// A three-zone retail spine off the Food Hall, with shops, a recycling station,
// public showers / laundrette, a public-terminal alcove, and a service corridor
// north out toward a (TBD) further area. Zone 1 holds the dockside TravelTube
// stop. Built straight from the mapper YAML via buildAreaFromYaml; the south
// boundary back to the Food Hall is a cross-area link, added below.
const RETAIL_YAML = `
area: retail_dockside
areaName: "Retail Area (Dockside)"
stop: horizon_dockside_retail_area_zone_1
rooms:
  - id: horizon_dockside_retail_area_zone_1
    name: "Horizon Outpost — Retail Area (Zone 1)"
    stop: true
    exits: { north: horizon_dockside_retail_area_zone_2, east: horizon_public_showers, west: horizon_laundrette }
  - id: horizon_dockside_retail_area_zone_2
    name: "Horizon Outpost — Retail Area (Zone 2)"
    exits: { north: horizon_dockside_retail_area_zone_3, south: horizon_dockside_retail_area_zone_1, east: horizon_recycling_area, west: horizon_gadget_shop }
  - id: horizon_dockside_retail_area_zone_3
    name: "Horizon Outpost — Retail Area (Zone 3)"
    exits: { north: horizon_corridor, south: horizon_dockside_retail_area_zone_2, east: horizon_public_terminal_dockside_retail, west: horizon_clothing_emporium }
  - id: horizon_recycling_area
    name: "Horizon Outpost — Recycling Station"
    exits: { west: horizon_dockside_retail_area_zone_2 }
  - id: horizon_gadget_shop
    name: "Horizon Outpost — Gadget Shop"
    exits: { east: horizon_dockside_retail_area_zone_2 }
  - id: horizon_clothing_emporium
    name: "Horizon Outpost — Clothing Emporium"
    exits: { east: horizon_dockside_retail_area_zone_3, west: horizon_changing_room }
  - id: horizon_changing_room
    name: "Horizon Outpost — Changing Room"
    exits: { east: horizon_clothing_emporium }
  - id: horizon_public_terminal_dockside_retail
    name: "Horizon Outpost — Public Terminal Alcove"
    exits: { west: horizon_dockside_retail_area_zone_3 }
  - id: horizon_public_showers
    name: "Horizon Outpost — Public Showers"
    exits: { west: horizon_dockside_retail_area_zone_1 }
  - id: horizon_laundrette
    name: "Horizon Outpost — Laundrette"
    exits: { east: horizon_dockside_retail_area_zone_1 }
  - id: horizon_corridor
    name: "Horizon Outpost — Service Corridor"
    exits: { south: horizon_dockside_retail_area_zone_3 }
`;
const { rooms: retailRooms } = buildAreaFromYaml(RETAIL_YAML, {
    rooms: {
        horizon_dockside_retail_area_zone_1: {
            description: (s) => "The south end of the dockside retail area: clean, bright, and carefully designed to part " +
                "travellers from their credits before they've quite decided to spend them. The shopfronts are " +
                "glossy, the lighting warm and considered, the prices — on closer inspection — optimistic. A " +
                "TravelTube stop is set into one wall. " +
                (s.flags["pod_summoned_at"] === "horizon_dockside_retail_area_zone_1"
                    ? "A pod waits in the bay, doors open — you can BOARD it."
                    : "Scan your ID at the reader to summon a pod.") +
                "\n\nPublic showers open east, behind an ID turnstile; a laundrette west; the retail area runs " +
                "on north, and the Food Hall is back south.",
            items: ["reader_retail", "shower_turnstile"],
        },
        horizon_dockside_retail_area_zone_2: {
            description: "The middle of the retail run: the shopfronts have the familiar look of transit retail anywhere " +
                "in human space, but a closer glance at the merchandise tells a different story. The range is " +
                "broader than any Consortium station would carry, the quality — even at these prices — a quiet " +
                "step above the corporate standard. A gadget shop to the west; the recycling station to the " +
                "east, unmissable behind its bank of colour-coded chutes. The area continues north and south.",
        },
        horizon_dockside_retail_area_zone_3: {
            description: "The retail area's north end, where the glossy shopfronts begin to thin and the corridor beyond " +
                "reasserts the station's more functional character. A clothing emporium stands to the west; a " +
                "public-terminal alcove to the east. The service corridor leads on north; the bulk of the " +
                "retail area lies to the south.",
        },
        horizon_recycling_area: {
            scenery: {
                hoppers: "Seven colour-coded hoppers in a row: blue for plastics, brown for paper, green for glass, red for metals, yellow for food waste, grey for electronics and batteries, and black for everything else. Each bears a symbol and a small, sober sign.",
                hopper: "A colour-coded recycling hopper, its slot sized for its category, its signage notably less garish than everything else in the retail area.",
                bins: "Seven sorting hoppers, colour-coded and humourless — Horizon takes its recycling very seriously indeed.",
                panel: "A discreet panel wired into the station's monitoring systems, keeping a quiet eye on who sorts what into where. You suspect it notices everything.",
            },
            description: "A waste disposal point tucked into the edge of the retail area — a far more complicated affair " +
                "than you might expect. Seven colour-coded hoppers stand in a row: blue for plastics, brown for " +
                "paper, green for glass, red for metals, yellow for food waste, grey for electronics and " +
                "batteries, and black for everything else. Each bears a symbol as well as a small, utilitarian " +
                "sign — notably less garish than everything else in the retail area — indicating its purpose. A " +
                "discreet panel nearby is wired into the station's monitoring systems. Horizon, you gather, " +
                "takes its recycling very seriously indeed.\n\nThe retail area is back to the west.",
        },
        horizon_gadget_shop: {
            scenery: {
                gadgets: "Adaptors, chargers, and travel gizmos of deeply questionable necessity, all of them better made than the equivalent on any Consortium station — and priced to remind you of it.",
                drones: "Novelty drones in clamshell packaging, promising aerial selfies and delivering, you suspect, mostly tangled rotors and buyer's remorse.",
                toys: "A surprisingly well-stocked section of toys and games that draws as many browsers as the tech — proper ones, too, well made and built to last.",
                games: "Boxed games and puzzles, the good kind, the kind a station this far out keeps because the nights are long.",
            },
            description: "A cramped, over-bright shop crammed with adaptors, chargers, novelty drones, travel gizmos of " +
                "deeply questionable necessity, and a surprisingly well-stocked section of toys and games that " +
                "draws as many browsers as the tech — though on closer inspection, everything is better made " +
                "than the equivalent on any Consortium station. The prices, naturally, reflect this. The retail " +
                "area is back to the east.",
        },
        horizon_clothing_emporium: {
            scenery: {
                racks: "Garment racks in neat sections — womenswear to one side, practical wear and footwear further in. Clean, commercial, taking itself just seriously enough.",
                clothing: "Mid-range station clothing, neither luxurious nor cheap. Nothing here is a problem your contract is going to solve.",
                desk: "A payment desk by the entrance, bearing a small, brazen sign: Personal Shopper Service — 100 credits per hour. A prince's ransom, by any measure.",
                sign: "Personal Shopper Service — 100 credits per hour, the sign says, with no apparent shame whatsoever.",
                suites: "A door at the back marked Private Styling Suites leads to a more secluded area, with comfortable chairs nearby for waiting companions to be bored in.",
            },
            description: "A mid-sized clothing shop, its garment racks arranged in neat sections across the floor: " +
                "womenswear to one side, practical wear and footwear further in. The strip lighting gives the " +
                "space a clean, commercial feel — neither luxurious nor cheap, the kind of place that takes " +
                "itself just seriously enough. Near the entrance, a payment desk bears a small sign: Personal " +
                "Shopper Service — 100 credits per hour (a prince's ransom, by any measure). Towards the back, a " +
                "door marked Private Styling Suites leads to a more secluded area, a cluster of comfortable " +
                "chairs positioned nearby for waiting companions.\n\nThe changing room is to the west; the " +
                "retail area is back to the east.",
        },
        horizon_changing_room: {
            scenery: {
                mirror: "A mirror that has been, mercifully, calibrated to flatter — you look about a year better-rested than you have any right to.",
                stool: "A small stool for the awkward business of changing, draped with whatever you were brave enough to try on.",
                curtain: "A privacy curtain, never quite wide enough, the eternal compromise of the changing cubicle.",
            },
            description: "A small curtained cubicle with a stool and a mirror that has been, mercifully, calibrated to " +
                "flatter. The emporium is back east.",
        },
        horizon_public_terminal_dockside_retail: {
            description: "A shallow alcove set into the concourse wall, slightly recessed from the retail bustle — enough " +
                "separation to use the terminal without being jostled, though no real privacy. The terminal " +
                "itself is a large, sleek, free-standing unit, clearly well-maintained, its wide display screen " +
                "visible from some distance. Mounted prominently on its face, an ID reader waits with patient " +
                "readiness.\n\n" +
                "In standby, the screen is anything but dormant: a three-dimensional model of Horizon Outpost " +
                "rotates slowly at its centre, the outpost's vast cylindrical form and docking structures " +
                "rendered in crisp, luminous detail against a star-scattered background. It serves no " +
                "informational purpose in this state — purely decorative, as anyone familiar with the system " +
                "will tell you — but it is quietly, unhurriedly magnificent, and more than one newcomer has " +
                "stopped simply to watch it turn. The glow of the display casts a faint cool light onto the " +
                "floor of the alcove, a surprisingly tranquil focal point in the bustle beyond.\n\n" +
                "Present your station ID to the reader to wake the terminal fully and access Horizon Outpost's " +
                "complete suite of public services. The retail area is back to the west.",
            items: ["public_terminal_retail"],
        },
        horizon_public_showers: {
            scenery: {
                cubicles: "A row of shower cubicles, each with a sliding door and a small green light for vacancy; the occupied ones announce themselves with running water.",
                cubicle: "A shower cubicle with a sliding door, a vacancy light, and a control panel of colour-coded buttons within.",
                panel: "A simple control panel of colour-coded buttons inside each cubicle — water flow, temperature, detergent, and a thoughtful automatic warm-air dry.",
                buttons: "Colour-coded buttons for flow, heat, detergent, and the dry cycle. Civic design at its most reassuringly literal.",
            },
            description: "A stark, utilitarian shower block — walls of bare metal, slightly tarnished from years of " +
                "steam, the air carrying a faint background note of disinfectant. A row of cubicles lines one " +
                "side, each with a sliding door and a small green light to indicate vacancy; occupied ones " +
                "announce themselves with the sound of running water. Entry is by ID scan — free of charge, " +
                "like everything civic on Horizon. Inside each cubicle, a simple control panel of colour-coded " +
                "buttons manages water flow, temperature, detergent, and — a thoughtful touch — an automatic " +
                "warm-air dry cycle when you're done.\n\nThe retail area is back to the west.",
        },
        horizon_laundrette: {
            description: "A warm, humming laundrette: a bank of machines tumbling, and a couple of residents waiting " +
                "them out with the patience of people who do this every week. The retail run is back east.",
            items: ["laundrette_machines"],
        },
        horizon_corridor: {
            description: "An unadorned access corridor connecting the dockside retail area to the nearest residential " +
                "section — clean, evenly lit, and unhurried after the bustle to the south. The retail area is " +
                "back to the south; the residential section lies north, and the Bazaar opens off to the east.",
        },
    },
});
// Cross-area boundary back to the Food Hall (the mapper drops cross-area exits).
retailRooms["horizon_dockside_retail_area_zone_1"].exits.south =
    { to: "horizon_food_hall_zone_1", description: "toward the Food Hall" };
// The public showers are ID-gated (canon: access by scan). The turnstile lives
// in Zone 1; present your ID (USE/TAP ID ON TURNSTILE) to set FLAG_SHOWERS_UNLOCKED.
retailRooms["horizon_dockside_retail_area_zone_1"].exits.east = {
    to: "horizon_public_showers",
    description: "Public Showers",
    gated: (s) => s.flags[FLAG_SHOWERS_UNLOCKED]
        ? null
        : "A turnstile bars the way into the shower block. Its reader wants your ID first — SCAN your ID at " +
            "the turnstile (SCAN TURNSTILE) to go through.",
};
// North out of the service corridor (the old dead-end) into Residential Zone A,
// on foot. The Zone A side of the link is wired in residential.ts.
retailRooms["horizon_corridor"].exits.north =
    { to: "horizon_residential_zone_a_central_accessway", description: "Residential Zone A" };
// East out of the service corridor into the Bazaar (the Bazaar side of the link
// is built in bazaar.ts; the mapper's bazaar.yaml stands this corridor in as a
// placeholder, which we deliberately don't rebuild).
retailRooms["horizon_corridor"].exits.east =
    { to: "horizon_clothing_vendor", description: "the Bazaar" };
const travelPod = {
    id: "travelpod",
    name: "TravelTube — Pod",
    description: (s) => {
        if (s.flags["pod_moving"]) {
            const dest = transitStop(s.flags["pod_selected"]);
            return ("Inside, the pod is all clean lines and quiet: banks of four seats facing each other, " +
                "soft handholds, a route display ticking through the stops. It runs so smoothly that " +
                "only the display tells you you're moving at all.\n\n" +
                `The board shows your destination: ${dest?.label ?? "—"}. No standing while she runs; ` +
                "nothing to do now but wait for arrival.");
        }
        const at = s.flags["pod_at"] ?? "";
        const dests = destinationsFrom(at);
        const list = dests.map(d => `  • ${d.label}`).join("\n");
        const sel = s.flags["pod_selected"];
        const selLine = sel
            ? `\n\nSelected: ${transitStop(sel)?.label ?? "—"}. SIT DOWN to depart.`
            : "";
        return ("Inside, the pod is all clean lines and quiet: banks of four seats facing each other in blocks, " +
            "soft handholds, and wide windows offering views of the station as it passes. Impeccably " +
            "maintained, as everything on Horizon seems to be. A touchscreen just inside the doors stands " +
            "ready; the doors themselves stand open.\n\n" +
            "The touchscreen offers these stops — SELECT one and SIT to depart, or DISEMBARK to step " +
            "out:\n" + list + selLine);
    },
    exits: {}, // movement is via sit (depart) / disembark; no walking out
    items: ["pod_touchscreen", "pod_seats"],
    npcs: [],
    // The pod is a persistent vehicle: on arrival it stops with doors open but
    // does NOT eject the player — they DISEMBARK when they choose, or SELECT a new
    // stop and SIT to ride on.
    onTick: (s) => {
        if (!s.flags["pod_moving"])
            return;
        const depart = s.flags["pod_depart_tick"] ?? s.ticks;
        const travel = s.flags["pod_travel"] ?? 2;
        if (s.ticks - depart >= travel) {
            const dest = s.flags["pod_selected"];
            s.flags["pod_at"] = dest;
            delete s.flags["pod_moving"];
            delete s.flags["pod_seated"];
            delete s.flags["pod_selected"];
            delete s.flags["pod_travel"];
            delete s.flags["pod_depart_tick"];
            score(s, HOOK_RODE_TUBE);
            const label = transitStop(dest)?.label ?? "your stop";
            return (`The pod slows, settles, and stops. The doors part with a soft chime — you've arrived at ${label}.\n\n` +
                "You can DISEMBARK here, or SELECT another stop and SIT to ride on.");
        }
        return;
    },
};
// --- Blue Sector / Donovan's (mapped with tools/mapper.html) ------------
// The PC's base, a FIVE-LEVEL lodging house served by a lift (multi-level area).
// Level 1 = Ground: TravelTube concourse (stop) → lobby (Donovan), guest
// lavatory, dining room. Levels 2–5 are guest floors reached only by the lift:
//   L2 First Floor (rooms 11–13), L3 Second Floor (21–26), L4 Third Floor
//   (31–36), L5 Penthouse. The lift is `horizon_donovan_s_lift_l<level>`; SELECT
//   a floor inside it to ride (see lifts.ts). Repeated landing names are an
//   intentional same-floor effect, like the arboretum's footpaths.
const GUEST_ROOM = "One of Donovan's guest rooms: a neat bed, a chair, a washstand, and a window looking out over " +
    "the lamplit roofs of the Blue Sector, the great curve of the outpost's interior climbing away " +
    "and over until the far districts hang, impossibly, overhead. Comfortable, and anonymous in the " +
    "way Donovan's guests tend to prefer. The landing is just outside.";
const LANDING = (floor) => `A quiet carpeted landing on Donovan's ${floor}: guest-room doors to either side, the lift at the ` +
    "north end. The carpet and quiet wouldn't be out of place in any comfortable hotel anywhere.";
const GUEST_VIEW = "The window looks out over the lamplit roofs of the Blue Sector — and past them the great curve of the " +
    "outpost's interior, whole districts climbing away and hanging, impossibly, overhead. You could watch it " +
    "for a long while.";
const GUEST_SCENERY = {
    bed: "A neat single bed, the covers turned down with more care than the room strictly warrants. You could SLEEP here when you need to.",
    chair: "A plain wooden chair set by the window — functional, unremarkable, and exactly enough.",
    washstand: "A washstand with a basin and a folded towel. The water runs warm: a small, real luxury after the station's communal facilities.",
    basin: "A washstand with a basin and a folded towel. The water runs warm: a small, real luxury after the station's communal facilities.",
    window: GUEST_VIEW,
    view: GUEST_VIEW,
    roofs: GUEST_VIEW,
};
const guest = (id, exits, level) => ({
    id, name: "Donovan's — " + id.replace(/^horizon_donovan_s_room_/, "Room "), description: GUEST_ROOM, exits, flags: { level },
    scenery: GUEST_SCENERY,
});
const blueSectorDefs = [
    // --- Level 1: Ground ---
    {
        id: "horizon_blue_sector_concourse",
        name: "Horizon Outpost — Blue Sector Concourse",
        description: (s) => "A calmer concourse than anything on the dockside: quieter, unhurried, planters along the walls " +
            "and the air noticeably fresher. The kind of place where people nod at familiar faces. A " +
            "TravelTube stop is set into one wall. " +
            (s.flags["pod_summoned_at"] === "horizon_blue_sector_concourse"
                ? "A pod waits in the bay, doors open — you can BOARD it. A public terminal stands beside it."
                : "Scan your ID at the reader to summon a pod; a public terminal stands beside it.") +
            "\n\nDonovan's lodging house is through the doors to the north.",
        exits: { north: "horizon_donovans_lobby" },
        items: ["reader_blue", "public_terminal_blue"],
    },
    {
        id: "horizon_donovans_lobby",
        name: "Donovan's — Lobby",
        description: "Donovan's lodging house is warm in a way the rest of the station is merely functional: " +
            "mismatched chairs, a real rug worn pale down its centre line, and the smell of something " +
            "slow-cooked drifting from the dining room. A board of room keys hangs behind the desk, one " +
            "hook empty — yours. An ID reader is set into the desk's counter. Donovan keeps the desk, and " +
            "seems to keep half the sector's secrets with it.\n\n" +
            "The TravelTube concourse is back to the south; a guest lavatory lies west, the dining room " +
            "east, and the lift up to the guest floors north.",
        exits: {
            south: "horizon_blue_sector_concourse",
            west: "horizon_donovan_s_lavatory",
            east: "horizon_donovan_s_dining_room",
            north: "horizon_donovan_s_lift_l1",
        },
        npcs: ["donovan"],
        items: ["donovan_reception_desk"],
        onEnter: (s) => { score(s, HOOK_REACHED_DONOVANS); },
    },
    {
        id: "horizon_donovan_s_lavatory",
        name: "Donovan's — Guest Lavatory",
        description: "A small, spotless guest washroom: a basin, a mirror, and a neat stack of real cloth towels — " +
            "a quiet luxury after the station's communal facilities. The lobby is back to the east.",
        exits: { east: "horizon_donovans_lobby" },
    },
    {
        id: "horizon_donovan_s_dining_room",
        name: "Donovan's — Dining Room",
        description: "A long communal table under a low, warm light, set for more guests than seem to be staying. " +
            "Whatever is slow-cooking somewhere behind it smells extraordinary. A couple of residents nod " +
            "at you and return to their plates. The lobby is back to the west.",
        exits: { west: "horizon_donovans_lobby" },
    },
    { id: "horizon_donovan_s_lift_l1", name: "Donovan's — Lift", description: liftDescription, exits: { south: "horizon_donovans_lobby" } },
    // --- Level 2: First Floor (rooms 11–13) ---
    { id: "horizon_landing_first_floor", name: "Donovan's — Landing (First Floor)", description: LANDING("first floor"),
        exits: { north: "horizon_donovan_s_lift_l2", south: "horizon_donovan_s_room_12", east: "horizon_donovan_s_room_13", west: "horizon_donovan_s_room_11" } },
    guest("horizon_donovan_s_room_11", { east: "horizon_landing_first_floor" }, 2),
    guest("horizon_donovan_s_room_12", { north: "horizon_landing_first_floor" }, 2),
    guest("horizon_donovan_s_room_13", { west: "horizon_landing_first_floor" }, 2),
    { id: "horizon_donovan_s_lift_l2", name: "Donovan's — Lift", description: liftDescription, exits: { south: "horizon_landing_first_floor" } },
    // --- Level 3: Second Floor (rooms 21–26) ---
    { id: "horizon_donovan_s_landing_second_floor", name: "Donovan's — Landing (Second Floor)", description: LANDING("second floor"),
        exits: { north: "horizon_donovan_s_lift_l3", south: "horizon_landing_second_floor_a", east: "horizon_donovan_s_room_22", west: "horizon_donovan_s_room_21" } },
    { id: "horizon_landing_second_floor_a", name: "Donovan's — Landing (Second Floor)", description: LANDING("second floor"),
        exits: { north: "horizon_donovan_s_landing_second_floor", south: "horizon_donovan_s_landing_second_floor_b", east: "horizon_donovan_s_room_24", west: "horizon_donovan_s_room_23" } },
    { id: "horizon_donovan_s_landing_second_floor_b", name: "Donovan's — Landing (Second Floor)", description: LANDING("second floor"),
        exits: { north: "horizon_landing_second_floor_a", east: "horizon_donovan_s_room_26", west: "horizon_donovan_s_room_25" } },
    guest("horizon_donovan_s_room_21", { east: "horizon_donovan_s_landing_second_floor" }, 3),
    guest("horizon_donovan_s_room_22", { west: "horizon_donovan_s_landing_second_floor" }, 3),
    guest("horizon_donovan_s_room_23", { east: "horizon_landing_second_floor_a" }, 3),
    guest("horizon_donovan_s_room_24", { west: "horizon_landing_second_floor_a" }, 3),
    guest("horizon_donovan_s_room_25", { east: "horizon_donovan_s_landing_second_floor_b" }, 3),
    guest("horizon_donovan_s_room_26", { west: "horizon_donovan_s_landing_second_floor_b" }, 3),
    { id: "horizon_donovan_s_lift_l3", name: "Donovan's — Lift", description: liftDescription, exits: { south: "horizon_donovan_s_landing_second_floor" } },
    // --- Level 4: Third Floor (rooms 31–36) ---
    { id: "horizon_donovan_s_landing_third_floor", name: "Donovan's — Landing (Third Floor)", description: LANDING("third floor"),
        exits: { north: "horizon_donovan_s_lift_l4", south: "horizon_landing_third_floor_a", east: "horizon_donovan_s_room_32", west: "horizon_donovan_s_room_31" } },
    { id: "horizon_landing_third_floor_a", name: "Donovan's — Landing (Third Floor)", description: LANDING("third floor"),
        exits: { north: "horizon_donovan_s_landing_third_floor", south: "horizon_landing_third_floor_b", east: "horizon_donovan_s_room_34", west: "horizon_donovan_s_room_33" } },
    { id: "horizon_landing_third_floor_b", name: "Donovan's — Landing (Third Floor)", description: LANDING("third floor"),
        exits: { north: "horizon_landing_third_floor_a", east: "horizon_donovan_s_room_36", west: "horizon_donovan_s_room_35" } },
    guest("horizon_donovan_s_room_31", { east: "horizon_donovan_s_landing_third_floor" }, 4),
    guest("horizon_donovan_s_room_32", { west: "horizon_donovan_s_landing_third_floor" }, 4),
    guest("horizon_donovan_s_room_33", { east: "horizon_landing_third_floor_a" }, 4),
    guest("horizon_donovan_s_room_34", { west: "horizon_landing_third_floor_a" }, 4),
    guest("horizon_donovan_s_room_35", { east: "horizon_landing_third_floor_b" }, 4),
    guest("horizon_donovan_s_room_36", { west: "horizon_landing_third_floor_b" }, 4),
    { id: "horizon_donovan_s_lift_l4", name: "Donovan's — Lift", description: liftDescription, exits: { south: "horizon_donovan_s_landing_third_floor" } },
    // --- Level 5: Penthouse ---
    {
        id: "horizon_donovan_s_pentouse",
        name: "Donovan's — Penthouse",
        description: "The top of the house: Donovan's penthouse — as high up the Blue Sector as the building climbs, " +
            "which on a spun cylinder means as near the axis as the structure reaches. The view is the " +
            "opposite of what a planet-dweller expects: not down and out at stars, but up and across the vast " +
            "curved interior of the outpost, whole districts spread overhead in the soft haze, their lights " +
            "and greenery stretching away in both directions until the cylinder closes above you. Follow the " +
            "curve toward the midsection and you can pick out the dark band of the arboretum — and, you're " +
            "fairly sure, the crown of the great tree at its heart. A pair of deep armchairs face it. The " +
            "lift is back to the north.",
        exits: { north: "horizon_donovan_s_lift_l5" },
    },
    { id: "horizon_donovan_s_lift_l5", name: "Donovan's — Lift", description: liftDescription, exits: { south: "horizon_donovan_s_pentouse" } },
];
const blueSectorRooms = buildArea(blueSectorDefs);
// Guest-room doors are ID-keyed: your card opens exactly ONE door, the room
// Donovan allocates at check-in. Gate every landing->room exit accordingly.
// (The rooms' own exits point back to landings, so you can always leave yours.)
const DONOVAN_ROOM_ID_RE = /^horizon_donovan_s_room_(\d+)$/;
for (const room of Object.values(blueSectorRooms)) {
    for (const [dir, def] of Object.entries(room.exits)) {
        const m = def?.to?.match(DONOVAN_ROOM_ID_RE);
        if (!m)
            continue;
        const roomNum = m[1];
        room.exits[dir] = {
            ...def,
            gated: (s) => {
                if (!s.flags[FLAG_DONOVAN_CHECKED_IN]) {
                    return "The door doesn't budge — you've no key to it yet. Check in with Donovan at the desk first.";
                }
                if (String(s.flags[FLAG_DONOVAN_ROOM]) !== roomNum) {
                    return `Your card won't open this one. Donovan gave you Room ${s.flags[FLAG_DONOVAN_ROOM]} — and a key here opens that door and no other.`;
                }
                return null;
            },
        };
    }
}
// The penthouse is the snooper's reward: maintenance left the door ajar, so a
// nosey guest can let themselves in. Visiting it once scores (it's never your room).
const penthouse = blueSectorRooms["horizon_donovan_s_pentouse"];
if (penthouse) {
    const baseDesc = penthouse.description;
    penthouse.description = "The lift doors open straight onto it — the penthouse door propped ajar, left that " +
        "way, by the look of it, by whoever was last up here to service the place. Nobody's stopping you, so " +
        "you step in.\n\n" + baseDesc;
    penthouse.scenery = {
        view: "Up and across, not down and out: the vast curved interior of the outpost, whole districts spread overhead in the soft haze, their lights and greenery stretching away until the cylinder closes above you.",
        armchairs: "A pair of deep, well-worn armchairs, angled at the view. Donovan's, presumably — and clearly where he does his thinking.",
        arboretum: "Following the curve toward the midsection, you can pick out the dark band of the arboretum — and, you're fairly sure, the crown of the great tree at its heart.",
        tree: "Far off along the curve, at the heart of the arboretum's dark band, the crown of the great tree is just about distinguishable.",
    };
    penthouse.onEnter = (s) => {
        if (score(s, HOOK_PENTHOUSE_SNOOP)) {
            addNote(s, {
                id: "penthouse_snoop",
                source: "You",
                text: "Donovan's penthouse door was propped ajar — maintenance, by the look of it. No business of " +
                    "mine, strictly, but the view from the top of the house is something else, and a nosey guest takes " +
                    "what's left open.",
            });
        }
    };
}
// Donovan's 5-level lift (Blue Sector). Exported as data; registered via the
// horizon MODULES entry in index.ts (SELECT a floor inside the lift car).
export const donovanLift = withLiftDirs({
    id: "horizon_donovan_s_lift",
    floors: [
        { level: 1, room: "horizon_donovan_s_lift_l1", label: "Ground (Lobby)", names: ["ground", "g", "lobby", "ground floor", "0"] },
        { level: 2, room: "horizon_donovan_s_lift_l2", label: "First Floor", names: ["first", "first floor", "1"] },
        { level: 3, room: "horizon_donovan_s_lift_l3", label: "Second Floor", names: ["second", "second floor", "2"] },
        { level: 4, room: "horizon_donovan_s_lift_l4", label: "Third Floor", names: ["third", "third floor", "3"] },
        { level: 5, room: "horizon_donovan_s_lift_l5", label: "Penthouse", names: ["penthouse", "pent", "top", "p", "5"] },
    ],
}, blueSectorRooms);
// --- Items (scenery) ----------------------------------------------------
// --- Dockside Retail scenery + the shower turnstile ---------------------
const laundretteMachines = {
    id: "laundrette_machines",
    name: "machines",
    aliases: ["machine", "machines", "washer", "washers", "washing machine", "washing machines", "dryer", "dryers", "bank of machines"],
    description: "A bank of industrial washer-dryers, most of them mid-cycle — drums tumbling bright tangles of " +
        "clothing behind round glass doors, the air warm and soap-scented. A worn instruction panel above the " +
        "row takes ID payment and walks you through the wash; a couple of the units have hand-written OUT OF " +
        "ORDER cards taped to them, as such places always do.",
    takeable: false,
};
/** Admit the PC to the shower block (free, but access-controlled — canon). Shared
 *  by the turnstile's own scan (USE/TAP TURNSTILE) and USE ID ON TURNSTILE. */
export function unlockShowers(s) {
    if (!s.inventory.includes("fake_id")) {
        return "The turnstile's reader waits for an ID you don't have to hand.";
    }
    if (s.flags[FLAG_SHOWERS_UNLOCKED]) {
        return "Your ID reads green again; the turnstile's already open. The showers are east.";
    }
    s.flags[FLAG_SHOWERS_UNLOCKED] = true;
    return "You present your ID to the turnstile. It blinks green — no charge, civic facility — and the " +
        "barrier folds aside. The shower block is open to the east.";
}
const showerTurnstile = {
    id: "shower_turnstile",
    name: "turnstile",
    aliases: ["turnstile", "barrier", "shower turnstile", "shower door", "gate"],
    description: (s) => (s.flags[FLAG_SHOWERS_UNLOCKED]
        ? "The shower-block turnstile stands open, your access already logged. "
        : "A waist-high turnstile guards the shower block, an ID reader set into its post. ") +
        "Entry is by ID scan — free, like everything civic on Horizon, but logged. SCAN your ID at the " +
        "turnstile (SCAN TURNSTILE) to go through.",
    takeable: false,
    onScan: (s) => unlockShowers(s),
};
const concourseSignage = {
    id: "concourse_signage",
    name: "signage",
    aliases: ["sign", "signs", "signage", "board", "directory", "route map", "map"],
    description: "Directions to everywhere and clarity about nothing: the Food Hall and Retail Area close by, " +
        "and — all reachable by TravelTube — the Tech Quarter, the Shipyard, the Celestial Dining " +
        "Area, the Arboretum, an Entertainment Zone, and the Flight Academy. The nearest 'Tube stop, " +
        "a footnote adds, is in the Retail Area, through the Food Hall.",
    takeable: false,
};
function readerDescription() {
    return ("A squat reader post with a worn contact plate, beside a marked boarding bay. The notice " +
        "repeats the Horizon line in three scripts: scanning is for ACCESS CONTROL ONLY — never " +
        "payment. It still leaves a record of where you boarded and where you got off. On Horizon, " +
        "that record stays on Horizon.\n\nSCAN your ID here to summon a pod.");
}
// SCAN/SUMMON is the primary route; `use id on reader` also works, wired from
// the ID card side in items.ts (onUseWith keys off the subject item).
const readerRetail = {
    id: "reader_retail",
    name: "TravelTube reader",
    aliases: ["reader", "reader post", "scanner", "post", "id reader", "tube reader"],
    description: readerDescription(),
    takeable: false,
};
const readerBlue = {
    id: "reader_blue",
    name: "TravelTube reader",
    aliases: ["reader", "reader post", "scanner", "post", "id reader", "tube reader"],
    description: readerDescription(),
    takeable: false,
};
const readerArboretum = {
    id: "arboretum_reader",
    name: "TravelTube reader",
    aliases: ["reader", "reader post", "scanner", "post", "id reader", "tube reader"],
    description: readerDescription(),
    takeable: false,
};
const readerResidentialB = {
    id: "reader_residential_b",
    name: "TravelTube reader",
    aliases: ["reader", "reader post", "scanner", "post", "id reader", "tube reader"],
    description: readerDescription(),
    takeable: false,
};
const readerService = {
    id: "reader_service",
    name: "TravelTube reader",
    aliases: ["reader", "reader post", "scanner", "post", "id reader", "tube reader"],
    description: readerDescription(),
    takeable: false,
};
const readerIndustrial = {
    id: "reader_industrial",
    name: "TravelTube reader",
    aliases: ["reader", "reader post", "scanner", "post", "id reader", "tube reader"],
    description: readerDescription(),
    takeable: false,
};
const readerLcd = {
    id: "reader_lcd",
    name: "TravelTube reader",
    aliases: ["reader", "reader post", "scanner", "post", "id reader", "tube reader"],
    description: readerDescription(),
    takeable: false,
};
const readerTraining = {
    id: "reader_training",
    name: "TravelTube reader",
    aliases: ["reader", "reader post", "scanner", "post", "id reader", "tube reader"],
    description: readerDescription(),
    takeable: false,
};
const readerEz1 = {
    id: "reader_ez1",
    name: "TravelTube reader",
    aliases: ["reader", "reader post", "scanner", "post", "id reader", "tube reader"],
    description: readerDescription(),
    takeable: false,
};
const readerEz2 = {
    id: "reader_ez2",
    name: "TravelTube reader",
    aliases: ["reader", "reader post", "scanner", "post", "id reader", "tube reader"],
    description: readerDescription(),
    takeable: false,
};
const readerCda = {
    id: "reader_cda",
    name: "TravelTube reader",
    aliases: ["reader", "reader post", "scanner", "post", "id reader", "tube reader"],
    description: readerDescription(),
    takeable: false,
};
const sandwichPhotos = {
    id: "sandwich_photos",
    name: "sandwich photographs",
    aliases: ["photos", "photographs", "pictures", "photos of sandwiches", "wall"],
    description: "Dozens of glossy colour photographs ring the hatch, and the joke of them only lands when " +
        "you look closely: every sandwich is identical — same white bread, same diagonal cut — and " +
        "the only thing telling one from the next is the colour of the filling. Reds, browns, " +
        "yellows, a near-black, and one unmistakable warm apricot orange. Whoever shot them clearly " +
        "thought the bread was the point.",
    takeable: false,
    onExamine: (s) => { score(s, HOOK_SANDWICH_PHOTOS); },
};
const sandwichMenu = {
    id: "sandwich_menu",
    name: "filling list",
    aliases: ["menu", "card", "list", "fillings", "jams", "jam"],
    description: "The day's fillings, chalked up fresh: cheese and pickle, three kinds of cured meat, a " +
        "roasted-vegetable thing. And below, the smaller card: HOME-MADE JAMS — strawberry, " +
        "blackcurrant, marmalade, and apricot. The apricot has a hand-drawn star beside it.",
    takeable: false,
};
const podTouchscreen = {
    id: "pod_touchscreen",
    name: "touchscreen",
    aliases: ["touchscreen", "screen", "touch screen", "interface", "panel"],
    description: (s) => {
        if (s.flags["pod_moving"]) {
            const dest = transitStop(s.flags["pod_selected"]);
            return `The touchscreen shows the route in progress. Destination locked: ${dest?.label ?? "—"}.`;
        }
        const dests = destinationsFrom(s.flags["pod_at"] ?? "");
        const sel = s.flags["pod_selected"];
        return ("A simple destination picker just inside the doors. SELECT a stop, then SIT to depart:\n" +
            dests.map(d => `  • ${d.label}`).join("\n") +
            (sel ? `\n\nSelected: ${transitStop(sel)?.label ?? "—"} — SIT DOWN to go.` : "") +
            "\n(Restricted destinations would ask you to re-scan your ID; none of these do.)");
    },
    takeable: false,
};
const podSeats = {
    id: "pod_seats",
    name: "seats",
    aliases: ["seats", "seat", "bench", "benches", "handholds"],
    description: "Banks of four, facing each other, in hard-wearing blue. Room for two dozen; today, mostly " +
        "empty. A sign reminds passengers: no standing while the pod is in motion.",
    takeable: false,
};
// --- NPCs ---------------------------------------------------------------
// Barty — the FIRST loyalty wall and the template for the rest: warm and
// forthcoming about the station; smooth, patient, and entirely blank about
// people. He scans the PC's ID on first talk (capturing the alias) and uses only
// that cover name — later Burke will use the PC's REAL name, completing the
// one-way-visibility theme. Dramatic irony: Barty is the man who set Jack free.
const barty = {
    id: "barty",
    name: "Dock Officer Bartram",
    aliases: ["barty", "bartram", "bartrum", "dock officer", "officer"],
    description: "A man in his late fifties with greying hair and moustache, deep laugh-lines, and a broad easy " +
        "smile. Navy dock-officer's tunic, a battered silver star badge. Jovial and unhurried — the genuine " +
        "warmth of someone who's met every sort of person off every sort of ship and decided, on the whole, " +
        "to like them anyway.",
    onTalk: (s) => {
        score(s, HOOK_TALKED_BARTY);
        s.flags[FLAG_ID_SCANNED] = true;
        return [
            "\"First time on Horizon?\" He doesn't wait for an answer — it's always yes, or it's none of his " +
                "business. \"Welcome aboard.\" He lifts a hand-held scanner from the desk. \"Routine — won't take a " +
                `second.\" A soft bip as he passes it over your ID, and he glances at the readout. \"There we are. ` +
                `${pcAlias(s)}. All in order.\" He sets it down. \"She's a big old wheel, Horizon, and friendlier ` +
                "than she looks. The TravelTube'll take you anywhere worth going — free, just scan your ID at any " +
                "stop and pick where you fancy. Shops and food are signposted off the concourse. If it's a bed you " +
                "want tonight, easiest thing's the hostel — just west, you'll have walked past it on your way in. As " +
                "long as you've got a booking, then just scan your ID and the check-in screen will tell you your " +
                "room number.\" He nods at the crowd drifting past. \"Anything you need, just ask. Me, or anyone. " +
                "We're a sociable lot.\"",
        ];
    },
    topics: aliasedTopics([
        // The independence/privacy stance — the Strand-1 theme. Scores once.
        [["horizon", "station", "outpost", "accord", "independence", "independent"], (s) => {
                score(s, HOOK_ASKED_BARTY_HORIZON);
                return "\"What's Horizon like?\" He weighs it as though no one's asked before, which they likely " +
                    "haven't. \"Independent. That's the short of it, and the long of it too. No megacorp owns the air " +
                    "you breathe out here — which means no megacorp's counting your breaths, either.\" A slight set to " +
                    "his jaw. \"I've read papers in my time that turned my stomach — the things a Consortium ledger " +
                    "will do to a person, all legal, all filed in triplicate. Not here. Out here, what you get up to " +
                    "is your own affair. A person's business is their business — and we look after that, on Horizon.\" " +
                    "The warmth comes back. \"You'll find folk friendly and helpful. You'll also find they don't talk " +
                    "about each other. Took me a while to see those were the same thing.\"";
            }],
        // Lodging — Hostel-first (matches the talk opener), Donovan's the homelier alternative.
        [["lodging", "bed", "accommodation", "where to stay", "hostel", "stay", "sleep", "room"],
            "\"Lodging? Easiest thing's the hostel, just west — as long as you've got a booking, scan your ID at " +
                "the door and the screen sorts you out. If you're after something homelier and you don't mind a " +
                "'Tube ride, there's Donovan's over in Blue Sector — good house. Either'll see you right.\""],
        [["donovan", "donovans"],
            "\"Donovan's, Blue Sector — take the 'Tube. Tell him Barty sent you. Won't get you a discount, mind, " +
                "but he'll know you're no trouble.\" A smile. \"Discreet sort, Donovan. You'll get on.\""],
        [["traveltube", "tube", "transport", "pod", "stop"],
            "\"Scan in, pick your stop, off you go — access, not money; Horizon doesn't sell you your " +
                "own movements. Nearest stop's through the Food Hall, in the Retail Area.\""],
        [["food hall", "food", "retail", "shops"],
            "\"Straight west, through the gates. Food Hall first — you'll smell it before you see it — " +
                "then the Retail Area beyond. The 'Tube stop's in there.\""],
        // The walls. EITHER refusal fires asked_barty_sensitive (idempotent).
        [["docks", "ships", "departures", "arrivals", "who came", "who left", "movement", "manifest"], (s) => {
                score(s, HOOK_ASKED_BARTY_SENSITIVE);
                return "\"Ships?\" The good humour doesn't shift a millimetre. \"Plenty of those. What comes and goes " +
                    "through these docks, though — who, when, aboard what — that's between the dock and the traveller, " +
                    "and I'm the dock.\" He spreads his hands, apologetic and entirely immovable. \"Nothing personal. " +
                    "Someone came asking after you, I'd tell them exactly the same. It's the job — and round here, " +
                    "it's the manners.\"";
            }],
        [["jackrabbit", "rabbit", "target", "young man", "boy", "man", "person of interest", "someone"], (s) => {
                score(s, HOOK_ASKED_BARTY_SENSITIVE);
                return "\"Looking for someone in particular?\" He nods, unsurprised — half the people off any ship " +
                    `are. \"Can't help you there, ${pcAlias(s)}, and I wouldn't, whoever it was. Names, faces, who's ` +
                    "ashore, who's shipped out — I don't pass it on.\" He tips his head toward the concourse. \"Ask " +
                    "around, by all means. People here are kind. Whether they're talkative is their lookout, not mine.\"";
            }],
        [["barty", "bartram", "yourself", "job", "duty", "post", "work"],
            "\"Thirty-six years on this desk.\" He says it like a man who'd swap it for nothing. \"Bartram. " +
                "Everyone says Barty. I meet the ships, sort the lost from the merely confused, and send the decent " +
                "ones somewhere warm to sleep. Not a glamorous post.\" He watches the endless crossing crowd, fond. " +
                "\"But you'd be amazed who walks past. Or you wouldn't. Either way, I keep it to myself.\""],
    ]),
    unknownTopic: "He turns the question over politely. \"Couldn't say. I'm a dock officer, not an oracle. Try a " +
        "terminal — or try asking someone who isn't paid to be discreet.\" A grin. \"Bit thin on the ground, " +
        "round here, mind.\"",
};
// --- Donovan's check-in (the PC's pre-booked, default base) -------------
// Donovan's is pre-booked by the PC's handlers; formal check-in is still an ID
// scan at the reception desk (`tap card on desk` / `use id on reader`). On scan
// Donovan allocates a room, the PC notes it, and Donovan asks the privacy
// question (modal). The answer is pure character flavour — it carries no flags
// and changes nothing in play. (Canon: Burke reaches the PC via Donovan
// regardless — significant for the Strand-2 messenger beat, Phase 3.)
function pcAlias(s) {
    const a = s.flags[FLAG_PC_ALIAS];
    return typeof a === "string" && a ? a : "our new guest";
}
// Donovan's allocatable guest rooms (the penthouse is his own). Numbers only —
// the rooms themselves are shared, anonymous prose; the number is for flavour.
const DONOVAN_ROOMS = ["11", "12", "13", "21", "22", "23", "24", "25", "26", "31", "32", "33", "34", "35", "36"];
/** The privacy question Donovan asks once, on check-in (the question itself is
 *  printed as the last line of the welcome). Whatever the PC answers, Donovan's
 *  reply is the same — it has no gameplay effect — and he closes warmly. */
function makePrivacyModal() {
    return {
        onInput: () => ({
            output: [
                "\"As you wish.\"",
                "",
                "\"Anything that's within my power to provide,\" he adds, \"you've only to ask.\"",
            ],
            pop: true,
        }),
    };
}
/** `scan id` / `tap card on desk` / `use id on reader` at Donovan's reception.
 *  Allocates a room, files the note, and triggers the welcome + privacy question. */
export function donovanCheckIn(s) {
    if (s.flags[FLAG_DONOVAN_CHECKED_IN]) {
        const num = s.flags[FLAG_DONOVAN_ROOM];
        return `The reader glows green. \"You're all squared away — Room ${num},\" Donovan reminds you. \"Make yourself at home.\"`;
    }
    const num = DONOVAN_ROOMS[Math.floor(Math.random() * DONOVAN_ROOMS.length)];
    s.flags[FLAG_DONOVAN_CHECKED_IN] = true;
    s.flags[FLAG_DONOVAN_ROOM] = num;
    s.flags[FLAG_DONOVAN_WELCOMED] = true;
    addNote(s, {
        id: "donovan_room_allocated",
        source: "Donovan's",
        text: `Room ${num}, Donovan's Lodging House, Blue Sector. Breakfast: 0600–0900. Front entrance locks at midnight.`,
        reliable: true,
    });
    requestPushModal(s, makePrivacyModal());
    return [
        `The reader accepts your card with a soft tone. \"Room ${num},\" Donovan says, consulting briefly. ` +
            "\"Your card's on it now — the only door in the building it'll open, so don't lose it.\" He folds " +
            "his hands on the desk. \"Breakfast's in the dining room, six till nine. I lock the front at " +
            "midnight; be back before then, or tap the afterhours buzzer and I'll hear it.\"",
        "A slight pause. \"One thing I ask all my guests — if anyone comes looking for you, how would you " +
            "like me to handle it?\"",
    ];
}
// Donovan — the PC's landlord; immensely well-connected, immovably discreet.
const donovanReceptionDesk = {
    id: "donovan_reception_desk",
    name: "reception desk",
    aliases: ["desk", "reception desk", "reader", "id reader", "scanner", "counter", "key board"],
    description: (s) => "A worn wooden reception desk, a board of room keys behind it. An ID reader is set flush into " +
        "the counter." +
        (s.flags[FLAG_DONOVAN_CHECKED_IN]
            ? " Your key is off its hook now; you're checked in."
            : " One hook stands empty — yours. SCAN your ID (or tap your card on the reader) to check in."),
    takeable: false,
    onScan: (s) => donovanCheckIn(s),
};
const donovan = {
    id: "donovan",
    name: "Donovan",
    aliases: ["donovan", "landlord", "proprietor", "host", "innkeeper"],
    description: "A man in his fifties with a neatly trimmed salt-and-pepper beard and keen eyes that take a " +
        "visitor's measure in a single comprehensive glance. A pleasant baritone, and a manner that is " +
        "settled, comfortable, and professionally opaque — he runs the house by noticing everything and " +
        "remarking on none of it.",
    onTalk: (s) => {
        score(s, HOOK_TALKED_DONOVAN);
        const alias = pcAlias(s);
        if (s.flags[FLAG_DONOVAN_WELCOMED]) {
            return [`He glances up as you come in. \"${alias}.\" A slight nod toward the common room. \"Help yourself.\"`];
        }
        return [
            "He looks up as you come in — a quick, comprehensive assessment, over in a glance, nothing " +
                `impolite about it. \"Good to see you made it, ${alias}.\" He doesn't ask about the journey. ` +
                "\"Tap your card on the reader there when you're ready, and we'll get you sorted.\"",
        ];
    },
    topics: aliasedTopics([
        // Seeds the grey market — the "official registers" nudge. Scores nothing.
        [["horizon", "station", "outpost", "accord"],
            "\"Thirty-odd years.\" He says it like a number he stopped minding some time back. \"Most " +
                "people come through here on their way to somewhere else. I just... stayed.\" He considers for " +
                "a moment. \"Horizon rewards that. Independence is the official word for what she's got — but it " +
                "goes further than that. People here find ways of getting things done that don't always show up " +
                "in the official registers.\" A brief pause. \"I've found that works out well, on balance. For " +
                "most people.\""],
        // The payoff: getting Donovan to acknowledge the unofficial layer. Scores once.
        [["market", "grey market", "black market", "unofficial", "channels", "grey", "dealings", "trade", "registers", "underworld"],
            (s) => {
                score(s, HOOK_DONOVAN_GREY_MARKET);
                return "He gives you a long, comfortable look. \"Let's just say that official channels aren't " +
                    "the only way things get done around here.\" He sets his cup down. \"Horizon's independent — " +
                    "and independence cuts more than one way. If you ever find yourself needing something the " +
                    "official side of the station can't help you with, there are people who can.\" He picks his " +
                    "cup back up, entirely at ease. \"That's all I'll say on the subject.\"";
            }],
        // Colour; manner relaxes subtly at Burke's name (canon). Scores nothing.
        [["burke", "tech quarter", "fence"],
            "\"Burke?\" A short nod — something in him settles a little at the name. \"Good man. Been here " +
                "longer than most residents, and I've never heard of anything he can't fix.\" He leaves it " +
                "there — as though, coming from Donovan, that's entirely sufficient."],
        // The wall: personal, settled, final. Scores nothing.
        [["jackrabbit", "rabbit", "target", "young man", "boy", "person of interest", "someone"],
            (s) => `\"Looking for someone?\" He doesn't change register at all. \"I run a quiet house, ${pcAlias(s)}. ` +
                "What my guests get up to, what brings them here — that's not a conversation I have. With " +
                "anyone.\" He's not unfriendly. He's just decided. \"You'll find the same's generally true on " +
                "Horizon, if you haven't already.\""],
        // Colour about Donovan himself.
        [["donovan", "yourself", "you", "how long", "history", "soundproof", "soundproofed"],
            "\"Thirty-odd years.\" He says it without nostalgia or regret. \"Arrived on the back of a cargo " +
                "run, looked around, and didn't see much reason to leave. Built this place up from a set of " +
                "rooms with wafer-thin walls.\" A slight smile. \"All of my rooms are properly soundproofed now. " +
                "What happens in them stays in them.\""],
        // Colour about the neighbourhood.
        [["blue sector", "blue", "neighbourhood", "neighborhood", "area", "sector", "roots"],
            "\"Good part of the station.\" He means it. \"People keep to themselves mostly, but they'll " +
                "help if you need it. It's the kind of place you can put down roots.\" He glances up. \"Most " +
                "people passing through aren't after that. But it's there.\""],
    ]),
    unknownTopic: "He shakes his head, not unkindly. \"Can't help you there. Station this size, though — ask " +
        "around. Someone usually knows.\"",
};
// Sandwich vendor — THE canonical Strand-1 hook. NOT a wall but a LEAK: a small,
// elderly woman who knew the boy only as a fond regular and gives him up entirely
// by accident — confirming the Jackrabbit is a "he" (the one fact that survives
// into the books) and the apricot-jam detail. She has no idea she's informing on
// anyone. (The buy-the-jam-sandwich "Nkosi path" leak lives in food.ts.)
const sandwichVendor = {
    id: "sandwich_vendor",
    name: "the sandwich seller",
    aliases: ["sandwich seller", "sandwich vendor", "vendor", "seller", "sandwich lady", "old woman", "woman"],
    description: "A small, elderly woman in a clean uniform, moving behind the hatch with the unhurried efficiency " +
        "of someone who has made several thousand sandwiches and sees no reason to rush any of them. " +
        "Cheerful in a way that seems entirely genuine.",
    onTalk: (s) => {
        score(s, HOOK_TALKED_SANDWICH_VENDOR);
        return [
            "She's already reaching for the bread before you've finished approaching. \"What can I get you?\" " +
                "The hatch smells of fresh bread and something sweet underneath. \"Photos are all up there, if you " +
                "want a look.\"",
        ];
    },
    topics: aliasedTopics([
        // Path A — direct enquiry. The canonical reveal: a "he", and the apricot jam.
        [["jackrabbit", "rabbit", "young man", "boy", "target", "lad"], (s) => {
                score(s, HOOK_SANDWICH_HE);
                score(s, HOOK_SANDWICH_JAM);
                return "\"The Jackrabbit?\" She pauses, fond rather than guarded. \"Oh, yes — lovely lad. Always had " +
                    "the apricot jam, that orange one there.\" She nods at the photos. \"Said please and thank you, " +
                    "which you'd be surprised how many people don't.\" A slight pause. \"Haven't seen him for a few " +
                    "weeks now, mind. Come and go, don't they.\"";
            }],
        [["apricot", "jam", "orange", "favourite", "filling", "unusual"], (s) => {
                score(s, HOOK_SANDWICH_HE);
                score(s, HOOK_SANDWICH_JAM);
                return "\"Apricot jam? Lovely filling, that — not many people go for it.\" She taps the photo. " +
                    "\"There was a young lad used to have it regular. Haven't seen him for a few weeks, mind.\"";
            }],
        [["he", "him", "she", "her", "man", "woman", "gender"], (s) => {
                score(s, HOOK_SANDWICH_HE);
                return "\"Him?\" She glances up, briefly puzzled. \"Yes, he's a young lad — why d'you ask?\" She " +
                    "doesn't wait long for an answer.";
            }],
        // Genuine ignorance — she knows the order, not the person.
        [["where", "gone", "left", "now", "ship", "destination", "more"],
            "She shakes her head. \"Couldn't tell you, love. I know a regular when I see one and I know what " +
                "they order. Beyond that —\" she picks up the bread again \"— I just do sandwiches.\""],
        [["menu", "food", "have", "photos", "photographs", "pictures"],
            "\"It's all up there.\" A nod at the photos. \"See what takes your fancy.\""],
    ]),
    unknownTopic: "\"Sorry, love — I just do sandwiches.\"",
};
// Hank — pure atmosphere. A genial wall who knows nothing and proves the hall
// is a real place full of people, not a corridor of plot.
const hank = {
    id: "hank",
    name: "Hank",
    aliases: ["hank", "burger man", "cook"],
    description: "A mountain of a man, sweat-sheened and beaming, flipping burgers with balletic disregard for the flames.",
    onTalk: () => [
        "\"BURGERS,\" Hank announces, as though you might have come for something else. \"Best on the " +
            "station. Only thing on the station, far as I'm concerned.\"",
        "He does not appear to know, or wish to know, anything about anything that is not a burger.",
    ],
    topics: aliasedTopics([
        [["jackrabbit", "rabbit", "young man", "boy"],
            "\"Can't say. People come, people eat, people go. I'm watching the grill, not the faces.\""],
        [["burger", "burgers", "food", "menu"],
            "\"Quarter-pounder, half-pounder, the Hank Special which I will not describe to a man who " +
                "has to fly anywhere after. Which'll it be?\""],
    ]),
    unknownTopic: "\"Mate, I do burgers. Ask me about burgers.\"",
};
// --- Exports ------------------------------------------------------------
export const horizonRooms = {
    // Dockside (concourse, dock desk, zones A–D, bay galleries, meeting rooms)
    ...docksideRooms,
    // Food Hall
    horizon_food_hall_zone_3: foodHallZone3,
    horizon_food_hall_zone_2: foodHallZone2,
    horizon_food_hall_zone_1: foodHallZone1,
    horizon_sandwich_counter: sandwichCounter,
    horizon_hanks_burgers: hanksBurgers,
    horizon_bengali_delights: bengaliDelights,
    horizon_ice_cream_hut: iceCreamHut,
    horizon_fresh_salad_bowls: freshSaladBowls,
    horizon_unisex_lavatory: unisexLavatory,
    // Retail + tube
    ...retailRooms,
    travelpod: travelPod,
    ...blueSectorRooms,
};
export const horizonItems = {
    concourse_signage: concourseSignage,
    laundrette_machines: laundretteMachines,
    shower_turnstile: showerTurnstile,
    sandwich_menu: sandwichMenu,
    sandwich_photos: sandwichPhotos,
    reader_retail: readerRetail,
    reader_blue: readerBlue,
    arboretum_reader: readerArboretum,
    reader_residential_b: readerResidentialB,
    reader_service: readerService,
    reader_industrial: readerIndustrial,
    reader_lcd: readerLcd,
    reader_training: readerTraining,
    reader_ez1: readerEz1,
    reader_ez2: readerEz2,
    reader_cda: readerCda,
    pod_touchscreen: podTouchscreen,
    pod_seats: podSeats,
    donovan_reception_desk: donovanReceptionDesk,
};
export const horizonNpcs = {
    barty,
    donovan,
    sandwich_vendor: sandwichVendor,
    hank,
};
