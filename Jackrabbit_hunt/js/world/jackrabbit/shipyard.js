// The Shipyard — a large multi-level, multi-area district, plus one ship in
// dock (the Untheatrical). Built straight from the user's mapper YAML via
// buildAreaFromYaml; three separate lifts (A/B/C) registered from the parsed
// areas; the four areas stitched together by three cross-area links.
//
// Reachability: the TravelTube stop is Shipyard Reception (Shipyard A, L1). From
// there the yard climbs by Lift A (small/medium bays) → outside medium bay 3
// crosses to Shipyard B (large bays) by Lift B → the Accessway crosses to Lift C
// → the Hub → the Untheatrical's airlock.
//
// CANON TODO (this is the "Shipyard — Canon + HUGE" area): Sophie at reception
// (records via the predecessor's creds, B4a), Ozzy's bay, night-gating + the
// snooping/Deported trap (B9a), and the heavy-cargo lift-zone mischief death
// (B10) are all still to layer on. This slice is topology + lifts + wiring only.
import { requestSceneTransition } from "../../engine/authoring.js";
import { buildAreaFromYaml } from "./area.js";
import { withLiftDirs, liftDefFromYaml, liftDescription } from "./lifts.js";
import { syncSophie } from "./records.js";
// --- The mapper YAML (topology) -----------------------------------------
const SHIPYARD_A_YAML = `
area: shipyard_A
areaName: "Shipyard"
levels: 3
lift: horizon_shipyard_lift_a
stop: horizon_shipyard_reception
rooms:
  - id: horizon_shipyard_reception
    level: 1
    name: "Shipyard Reception"
    stop: true
    exits: { north: horizon_shipyard_entrance }
  - id: horizon_shipyard_entrance
    level: 1
    name: "Shipyard Entrance"
    exits: { south: horizon_shipyard_reception, east: horizon_outside_small_bay_5, west: horizon_tool_store }
  - id: horizon_outside_small_bay_5
    level: 1
    name: "Outside Small Bay 5"
    exits: { north: horizon_small_bay_5, east: horizon_outside_small_bay_4, west: horizon_shipyard_entrance }
  - id: horizon_outside_small_bay_4
    level: 1
    name: "Outside Small Bay 4"
    exits: { north: horizon_small_bay_4, east: horizon_outside_small_bay_3, west: horizon_outside_small_bay_5 }
  - id: horizon_outside_small_bay_3
    level: 1
    name: "Outside Small Bay 3"
    exits: { north: horizon_small_bay_3, east: horizon_outside_small_bay_2, west: horizon_outside_small_bay_4 }
  - id: horizon_outside_small_bay_2
    level: 1
    name: "Outside Small Bay 2"
    exits: { north: horizon_small_bay_2, east: horizon_outside_small_bay_1, west: horizon_outside_small_bay_3 }
  - id: horizon_outside_small_bay_1
    level: 1
    name: "Outside Small Bay 1"
    exits: { north: horizon_small_bay_1, south: horizon_shipyard_lift_a_l1, west: horizon_outside_small_bay_2 }
  - id: horizon_small_bay_5
    level: 1
    name: "Small Bay 5"
    exits: { south: horizon_outside_small_bay_5 }
  - id: horizon_small_bay_4
    level: 1
    name: "Small Bay 4"
    exits: { south: horizon_outside_small_bay_4 }
  - id: horizon_small_bay_3
    level: 1
    name: "Small Bay 3"
    exits: { south: horizon_outside_small_bay_3 }
  - id: horizon_small_bay_2
    level: 1
    name: "Small Bay 2"
    exits: { south: horizon_outside_small_bay_2 }
  - id: horizon_small_bay_1
    level: 1
    name: "Small Bay 1"
    exits: { south: horizon_outside_small_bay_1 }
  - id: horizon_tool_store
    level: 1
    name: "Tool Store"
    exits: { east: horizon_shipyard_entrance }
  - id: horizon_outside_small_bay_6
    level: 2
    name: "Outside Small Bay 6"
    exits: { north: horizon_small_bay_6, south: horizon_shipyard_lift_a_l2, west: horizon_outside_small_bay_7 }
  - id: horizon_outside_small_bay_7
    level: 2
    name: "Outside Small Bay 7"
    exits: { north: horizon_small_bay_7, east: horizon_outside_small_bay_6, west: horizon_outside_small_bay_8 }
  - id: horizon_outside_small_bay_8
    level: 2
    name: "Outside Small Bay 8"
    exits: { north: horizon_small_bay_8, east: horizon_outside_small_bay_7, west: horizon_outside_small_bay_9 }
  - id: horizon_outside_small_bay_9
    level: 2
    name: "Outside Small Bay 9"
    exits: { north: horizon_small_bay_9, east: horizon_outside_small_bay_8, west: horizon_outside_small_bay_10 }
  - id: horizon_outside_small_bay_10
    level: 2
    name: "Outside Small Bay 10"
    exits: { north: horizon_small_bay_10, east: horizon_outside_small_bay_9 }
  - id: horizon_small_bay_10
    level: 2
    name: "Small Bay 10"
    exits: { south: horizon_outside_small_bay_10 }
  - id: horizon_small_bay_9
    level: 2
    name: "Small Bay 9"
    exits: { south: horizon_outside_small_bay_9 }
  - id: horizon_small_bay_8
    level: 2
    name: "Small Bay 8"
    exits: { south: horizon_outside_small_bay_8 }
  - id: horizon_small_bay_7
    level: 2
    name: "Small Bay 7"
    exits: { south: horizon_outside_small_bay_7 }
  - id: horizon_small_bay_6
    level: 2
    name: "Small Bay 6"
    exits: { south: horizon_outside_small_bay_6 }
  - id: horizon_outside_medium_bay_1
    level: 3
    name: "Outside Medium Bay 1"
    exits: { north: horizon_medium_bay_1, south: horizon_shipyard_lift_a_l3, west: horizon_outside_medium_bay_2 }
  - id: horizon_outside_medium_bay_2
    level: 3
    name: "Outside Medium Bay 2"
    exits: { north: horizon_medium_bay_2, east: horizon_outside_medium_bay_1, west: horizon_outside_medium_bay_3 }
  - id: horizon_outside_medium_bay_3
    level: 3
    name: "Outside Medium Bay 3"
    exits: { north: horizon_medium_bay_3, east: horizon_outside_medium_bay_2 }
  - id: horizon_medium_bay_3
    level: 3
    name: "Medium Bay 3"
    exits: { south: horizon_outside_medium_bay_3 }
  - id: horizon_medium_bay_2
    level: 3
    name: "Medium Bay 2"
    exits: { south: horizon_outside_medium_bay_2 }
  - id: horizon_medium_bay_1
    level: 3
    name: "Medium Bay 1"
    exits: { south: horizon_outside_medium_bay_1 }
  - id: horizon_shipyard_lift_a_l1
    level: 1
    name: "Shipyard Lift A"
    lift: true
    exits: { north: horizon_outside_small_bay_1 }
  - id: horizon_shipyard_lift_a_l2
    level: 2
    name: "Shipyard Lift A"
    lift: true
    exits: { north: horizon_outside_small_bay_6 }
  - id: horizon_shipyard_lift_a_l3
    level: 3
    name: "Shipyard Lift A"
    lift: true
    exits: { north: horizon_outside_medium_bay_1 }
`;
const SHIPYARD_B_YAML = `
area: shipyard_B
areaName: "Shipyard"
levels: 3
lift: horizon_shipyard_lift_b
stop: null
rooms:
  - id: horizon_outside_medium_bay_4
    level: 1
    name: "Outside Medium Bay 4"
    exits: { north: horizon_medium_bay_4, west: horizon_shipyard_lift_b_l1 }
  - id: horizon_medium_bay_4
    level: 1
    name: "Medium Bay 4"
    exits: { south: horizon_outside_medium_bay_4 }
  - id: horizon_gantry
    level: 2
    name: "Gantry"
    exits: { south: horizon_shipyard_lift_b_l2, west: horizon_outside_large_bay_1 }
  - id: horizon_outside_large_bay_1
    level: 2
    name: "Outside Large Bay 1"
    exits: { north: horizon_large_bay_1, east: horizon_gantry }
  - id: horizon_large_bay_1
    level: 2
    name: "Large Bay 1"
    exits: { south: horizon_outside_large_bay_1 }
  - id: gantry_2
    level: 3
    name: "Gantry"
    exits: { south: horizon_shipyard_lift_b_l3, west: horizon_outside_large_bay_2 }
  - id: horizon_outside_large_bay_2
    level: 3
    name: "Outside Large Bay 2"
    exits: { north: horizon_large_bay_2, east: gantry_2, west: horizon_accessway }
  - id: horizon_large_bay_2
    level: 3
    name: "Large Bay 2"
    exits: { south: horizon_outside_large_bay_2 }
  - id: horizon_accessway
    level: 3
    name: "Accessway"
    exits: { east: horizon_outside_large_bay_2 }
  - id: horizon_shipyard_lift_b_l1
    level: 1
    name: "Shipyard Lift B"
    lift: true
    exits: { east: horizon_outside_medium_bay_4 }
  - id: horizon_shipyard_lift_b_l2
    level: 2
    name: "Shipyard Lift B"
    lift: true
    exits: { north: horizon_gantry }
  - id: horizon_shipyard_lift_b_l3
    level: 3
    name: "Shipyard Lift B"
    lift: true
    exits: { north: gantry_2 }
`;
const SHIPYARD_C_YAML = `
area: shipyard_C
areaName: "Shipyard"
levels: 2
lift: horizon_shipyard_lift_c
stop: null
rooms:
  - id: horizon_hub_shipyard
    level: 2
    name: "Shipyard Hub"
    exits: { south: horizon_shipyard_lift_c_l2 }
  - id: horizon_shipyard_lift_c_l1
    level: 1
    name: "Shipyard Lift C"
    lift: true
    exits: {}
  - id: horizon_shipyard_lift_c_l2
    level: 2
    name: "Shipyard Lift C"
    lift: true
    exits: { north: horizon_hub_shipyard }
`;
const UNTHEATRICAL_YAML = `
area: untheatrical
areaName: "Untheatrical"
stop: null
rooms:
  - id: horizon_untheatrical_airlock
    name: "Untheatrical — Airlock"
    exits: { north: horizon_untheatrical_entrance_corridor }
  - id: horizon_untheatrical_entrance_corridor
    name: "Untheatrical — Entrance Corridor"
    exits: { north: horizon_untheatrical_corridor, south: horizon_untheatrical_airlock, west: horizon_untheatrical_armory }
  - id: horizon_untheatrical_armory
    name: "Untheatrical — Armoury"
    exits: { east: horizon_untheatrical_entrance_corridor }
  - id: horizon_untheatrical_corridor
    name: "Untheatrical — Corridor"
    exits: { south: horizon_untheatrical_entrance_corridor, east: horizon_untheatrical_bridge }
  - id: horizon_untheatrical_bridge
    name: "Untheatrical — Bridge"
    exits: { west: horizon_untheatrical_corridor }
`;
// --- Templated descriptions (lean on exit-signposting for the look-alikes) --
const OUTSIDE_APRON = "A railed access apron at the mouth of the bay, the air thick with the smell of cutting-gas and " +
    "machine oil. Telltales above the bay doors indicate whether work is in progress. The muffled clang " +
    "of unseen machinery carries through the structure. The bay itself opens off one side.";
const SMALL_BAY = "A working bay, its floor solid underfoot — close to the circumference, the gravity here is as near " +
    "normal as anywhere on the station. Scaffolding and umbilicals stand ready around whatever berth is " +
    "in use. The apron is back outside.";
const MEDIUM_BAY = "A working bay of considerable size, the ceiling high overhead. The gravity is perceptibly lighter " +
    "here than on the dockside — nothing disorienting, but enough to notice in the way you plant your " +
    "feet. Scaffolding and umbilicals stand ready around the berths. The apron is back outside.";
const LARGE_BAY = "A vast working bay, the ceiling lost in the shadows far above. The reduced gravity — perhaps half " +
    "of what you'd feel at the circumference — gives everything a slightly deliberate quality; tools and " +
    "people alike move with a little more care than usual. Scaffolding and umbilicals loom around the " +
    "berths. The apron is back outside.";
const GANTRY = "A steel gantry running out high along the bay wall, the flank of a docked ship close enough to " +
    "touch. At this height, the reduced gravity makes every step feel slightly provisional — not " +
    "dangerous, exactly, but a reminder that the rules here are not quite the same as elsewhere. Not a " +
    "place for the unsteady.";
function shipyardDefault(r) {
    if (r.lift)
        return liftDescription;
    const n = r.name.toLowerCase();
    if (n.startsWith("outside"))
        return OUTSIDE_APRON;
    if (/^small bay \d+$/.test(n))
        return SMALL_BAY;
    if (/^medium bay \d+$/.test(n))
        return MEDIUM_BAY;
    if (/^large bay \d+$/.test(n))
        return LARGE_BAY;
    if (n.includes("gantry"))
        return GANTRY;
    return "A functional stretch of the shipyard.";
}
// --- Build the four areas -----------------------------------------------
const a = buildAreaFromYaml(SHIPYARD_A_YAML, {
    defaultDescription: shipyardDefault,
    rooms: {
        horizon_shipyard_reception: {
            npcs: ["sophie"],
            onEnter: syncSophie,
            description: (s) => "A marked contrast to the polish of the retail area: everything here serves a purpose, and " +
                "comfort is low on the list of priorities. The walls are plain metal, scuffed and marked with " +
                "the honest grime of an industrial workplace; the flooring hard and utilitarian; the lighting " +
                "adequate rather than welcoming. A long counter runs across the room, separating visitors from " +
                "the double doors to the yard beyond — through which seep the muffled sounds of work: the " +
                "distant clang of tools, the hiss of machinery, the occasional shout. A couple of hard benches " +
                "line one wall for those waiting. Nothing decorative, nothing wasted.\n\n" +
                "A TravelTube stop is set into the wall by the entrance. " +
                (s.flags["pod_summoned_at"] === "horizon_shipyard_reception"
                    ? "A pod waits in the bay, doors open — you can BOARD it."
                    : "Scan your ID at the reader to summon a pod."),
        },
        horizon_shipyard_entrance: {
            description: "Beyond the access doors, the working yard begins in earnest: the smell of cutting-gas and cold " +
                "metal, the racket of unseen machinery, and the immediate sense of being somewhere visitors are " +
                "tolerated rather than welcomed. The small-bay aprons run east; a tool store lies west; the " +
                "access doors are back south.",
        },
        horizon_tool_store: {
            description: "A well-ordered tool store: racked power-tools, spare umbilicals, and consumables arranged with " +
                "the particular precision of a place where losing track of equipment costs real money. Every " +
                "item tagged and logged. The entrance is back to the east.",
        },
    },
});
const b = buildAreaFromYaml(SHIPYARD_B_YAML, {
    defaultDescription: shipyardDefault,
    rooms: {
        horizon_accessway: {
            description: "A narrow accessway threading between the large-bay structures — half corridor, half catwalk, the " +
                "scale of the engineering on either side making it feel smaller than it is. The reduced gravity up " +
                "here lends the whole thing a slightly precarious quality. The large bays are back to the east; a " +
                "lift toward the yard's hub stands to the west.",
        },
    },
});
const c = buildAreaFromYaml(SHIPYARD_C_YAML, {
    defaultDescription: shipyardDefault,
    rooms: {
        horizon_hub_shipyard: {
            description: "The shipyard hub: a broad junction where the yard's structure knits together, gantries and " +
                "conduits converging from every direction. The gravity here is slight enough that careless " +
                "movement sends you drifting — handrails are positioned with the quiet insistence of long " +
                "experience. A lift drops south into the yard; to the north, an airlock stands open onto a ship " +
                "in dock — the Untheatrical, by the plate on the lock.",
        },
    },
});
const u = buildAreaFromYaml(UNTHEATRICAL_YAML, {
    rooms: {
        horizon_untheatrical_airlock: {
            description: "The Untheatrical's airlock: both inner and outer doors standing open, the ship apparently " +
                "unattended. The crew are elsewhere — ashore, most likely, making the most of a berth on Horizon " +
                "while the yard works on the aft sections. The ship proper is north; the shipyard hub is back south.",
        },
        horizon_untheatrical_entrance_corridor: {
            description: "Just inside the Untheatrical, the near-zero gravity of the hub follows you in — footing is " +
                "notional at best, and the grab rails positioned along the walls are less optional than they " +
                "look. The ship is silent save for the distant sounds of yard work reverberating through the " +
                "hull, every movement and breath echoing in the emptiness. The airlock is back south; the ship's " +
                "spine runs north; a side door opens west into what appears to be an armoury.",
        },
        horizon_untheatrical_armory: {
            description: "A well-stocked armoury, its walls lined with secure cabinets, each sealed with its own " +
                "combination keypad and labelled with its contents — the range running from compact energy " +
                "sidearms through to high-powered plasma rifles. Everything locked, everything accounted for. " +
                "Almost everything: one of the smaller cabinets has a damaged hinge, leaving a narrow gap between " +
                "door and frame. Not wide enough to be useful. Probably. The corridor is back to the east.",
        },
        horizon_untheatrical_corridor: {
            description: "The Untheatrical's central corridor, running fore and aft: a tired old workhorse of a ship, and " +
                "it shows. The handrails are worn smooth from years of hands, the walls scuffed at every junction " +
                "and doorframe where crew have pushed off or grabbed on in passing. The entrance is back south; " +
                "the bridge lies east.",
        },
        horizon_untheatrical_bridge: {
            description: "The Untheatrical's bridge: crash-couches at the helm and three workstations — navigation, " +
                "communications, and tactical — their consoles dark but ready. A wide forward viewport looks out " +
                "across the cavernous interior of the bay, yard lighting throwing long shadows across the " +
                "scaffolding and structures beyond the hull. Old and worn she may be, but everything is secured, " +
                "stowed, and shipshape; in a zero-g environment, tidiness is not a virtue but a necessity. The " +
                "corridor is back to the west.",
        },
    },
});
// --- Night-gate the yard: by day Sophie holds the counter (customers only);
// at night the desk is unmanned and the PC can slip through into the yard. ----
a.rooms["horizon_shipyard_reception"].exits.north = {
    to: "horizon_shipyard_entrance",
    description: "Shipyard Entrance",
    gated: (s) => s.isDaytime
        ? "Sophie doesn't so much as glance at the door. \"Past the counter's customers only, I'm afraid — " +
            "and you're not one.\" Friendly, final, and entirely immovable. Not while she's at that desk."
        : null,
};
// --- Cross-area links (the three joins the user asked for) ---------------
a.rooms["horizon_outside_medium_bay_3"].exits.west = { to: "horizon_outside_medium_bay_4", description: "Outside Medium Bay 4" };
b.rooms["horizon_outside_medium_bay_4"].exits.east = { to: "horizon_outside_medium_bay_3", description: "Outside Medium Bay 3" };
b.rooms["horizon_accessway"].exits.west = { to: "horizon_shipyard_lift_c_l1", description: "Shipyard Lift C" };
c.rooms["horizon_shipyard_lift_c_l1"].exits.east = { to: "horizon_accessway", description: "the Accessway" };
c.rooms["horizon_hub_shipyard"].exits.north = { to: "horizon_untheatrical_airlock", description: "the Untheatrical (airlock)" };
u.rooms["horizon_untheatrical_airlock"].exits.south = { to: "horizon_hub_shipyard", description: "the shipyard hub" };
// --- Register the three lifts (after cross-links, so step-out dirs resolve) --
const liftA = withLiftDirs(liftDefFromYaml(a.parsed, {
    1: { label: "Level 1 — Small Bays 1–5", names: ["1", "ground", "g", "small bays"] },
    2: { label: "Level 2 — Small Bays 6–10", names: ["2", "second"] },
    3: { label: "Level 3 — Medium Bays", names: ["3", "third", "medium"] },
}), a.rooms);
const liftB = withLiftDirs(liftDefFromYaml(b.parsed, {
    1: { label: "Level 1 — Medium Bay 4", names: ["1", "ground", "g"] },
    2: { label: "Level 2 — Large Bay 1", names: ["2", "second"] },
    3: { label: "Level 3 — Large Bay 2 & Accessway", names: ["3", "third", "accessway"] },
}), b.rooms);
// Lift C is the shipyard's rough industrial cage, not a mirror-walled car.
const liftC = liftDefFromYaml(c.parsed, {
    1: { label: "Level 1 — Accessway", names: ["1", "accessway", "down"] },
    2: { label: "Level 2 — Hub", names: ["2", "hub", "up"] },
});
liftC.intro =
    "Unlike the mirror-walled cars elsewhere on the station, this lift is a simple open-topped cage — " +
        "functional, industrial, entirely in keeping with the shipyard's no-nonsense character. A row of " +
        "grab-handles runs around the interior at chest height. A small, hand-lettered sign beside them reads: " +
        "HOLD ON. THIS MEANS YOU.";
liftC.selectLine = "SELECT a floor to ride to it, and mind the sign:";
// The cage runs into the hub's microgravity at the top, so you pull yourself out
// by the grab-handles rather than step out. (The hub room's own description
// carries the weightlessness; this is just the action prompt.)
liftC.exitLine = (dir) => `Pull yourself out (${dir}) by the grab-handles to leave the cage on this floor.`;
// The Lift C death (a "big red button"). The open cage runs through the hub's
// null-gravity; without a grip you are at the mercy of your own momentum. HOLD a
// handle first or pay for it: go UP un-held and your momentum carries you up
// through the still point of the hub and out the far side to the opposite deck
// (an instant splat); go DOWN un-held and the cage drops away without you,
// leaving you adrift — one turn to grab something solid, or you follow it down.
const LIFT_C_L1 = "horizon_shipyard_lift_c_l1"; // Accessway level
const LIFT_C_L2 = "horizon_shipyard_lift_c_l2"; // Hub level
const inLiftC = (s) => s.currentRoom === LIFT_C_L1 || s.currentRoom === LIFT_C_L2;
liftC.onSelectFloor = (s, from, to) => {
    if (s.flags["lift_c_holding"])
        return; // held on → safe, normal ride
    if (to.level > from.level) {
        // Ascending un-held: through the hub and out the far side.
        s.dead = true;
        s.deathReason =
            "The cage accelerates up toward the axis — and at the top, where the false gravity gives out, it " +
                "slows. You do not. Weightless, gripping nothing, you sail straight up out of the open cage, " +
                "through the still point of the hub, and on past it — to where 'up' quietly becomes 'down' again " +
                "and the deck of the outpost's far side begins, with gathering enthusiasm, to rush up to meet you. " +
                "Physics sees to the rest. The sign did try to tell you.\n\n" +
                "Cause of death: failure to HOLD ON, Shipyard Lift C.";
        return { blocked: true };
    }
    // Descending un-held: the cage leaves without you.
    s.flags["lift_c_falling_at"] = s.ticks;
    return {
        blocked: true,
        output: [
            "You tap the panel — and the cage simply drops away beneath you. In the null-gravity of the hub, " +
                "with nothing under your feet and no grip on the rails, you don't go with it.",
            "You hang there, weightless, the open top of the cage shrinking into the shaft below. Grab " +
                "something solid — a handrail, the lip of the shaft, anything — NOW. (HOLD ON.)",
        ],
        tickCost: 1,
    };
};
/** The shipyard's three lifts (A, B, and the industrial cage C). Registered via
 *  the shipyard MODULES entry in index.ts. */
export const shipyardLifts = [liftA, liftB, withLiftDirs(liftC, c.rooms)];
/** HOLD (a handle) — grip the cage's rails so a Lift C ride won't fling you; or,
 *  in the one-turn grace after an un-held descent, the lunge that saves you. */
export const holdCommand = (_w, s, _cmd) => {
    if (s.flags["lift_c_falling_at"] !== undefined && s.currentRoom === LIFT_C_L2) {
        delete s.flags["lift_c_falling_at"];
        requestSceneTransition(s, "horizon_hub_shipyard");
        return {
            handled: true,
            output: [
                "You twist, snatch at a handrail at the lip of the shaft, and haul yourself out hand over hand " +
                    "along the hub's grab-rails — no floor to find your feet on here, only handholds, and you cling " +
                    "to them a moment, breathing hard. That was far, far too close.",
            ],
            tickCost: 1,
        };
    }
    if (inLiftC(s)) {
        s.flags["lift_c_holding"] = true;
        return { handled: true, output: ["You take a firm grip on the grab-handles. HOLD ON. THIS MEANS YOU."], tickCost: 1 };
    }
    return { handled: true, output: ["There's nothing here that particularly needs holding on to."], tickCost: 0, free: true };
};
/** World.onTick fragment for Lift C: drops the held grip once you leave the cage,
 *  and runs the one-turn descent grace to its fatal conclusion. */
export function liftCTick(s) {
    if (s.dead || s.ended)
        return;
    if (!inLiftC(s))
        delete s.flags["lift_c_holding"]; // you let go on leaving
    const at = s.flags["lift_c_falling_at"];
    if (typeof at !== "number")
        return;
    if (s.currentRoom !== LIFT_C_L2) {
        delete s.flags["lift_c_falling_at"];
        return;
    } // reached safety
    if (s.ticks - at >= 2) {
        delete s.flags["lift_c_falling_at"];
        s.dead = true;
        s.deathReason =
            "You drift down the shaft after the cage — slowly at first, then less slowly as the false gravity " +
                "reasserts its claim on you the further you fall. You catch up with it, eventually, at the bottom. " +
                "It does not make room.\n\nCause of death: failure to HOLD ON, Shipyard Lift C.";
        return;
    }
}
// --- Exports ------------------------------------------------------------
export const shipyardRooms = {
    ...a.rooms, ...b.rooms, ...c.rooms, ...u.rooms,
};
