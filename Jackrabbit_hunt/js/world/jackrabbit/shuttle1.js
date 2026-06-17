// Shuttle 1 — automated transfer from the HQ station to the liner docking point.
// Spec: jackrabbit-pre-horizon-design.md §6.
//
// Three rooms (cabin / hatch / maintenance bay), one death state (the Big Red
// Button), and a scene-relative countdown: an approach warning, then the
// shuttle physically docks and the player disembarks under their own steam
// (an exit opens from the cabin) rather than being teleported onward.
import { FLAG_AIRLOCK_COVER_OPEN, FLAG_SHUTTLE1_ARRIVED, FLAG_SHUTTLE1_BOARDED_AT, FLAG_SHUTTLE1_DOCKED, HOOK_ENTERED_MAINTENANCE, HOOK_PULLED_LEVER, HOOK_READ_WARNING_LABEL, } from "./flags.js";
import { score } from "./scoring.js";
const DOCKING_AT = 12; // ticks-in-scene at which the approach warning fires
const DOCKED_AT = 15; // ticks-in-scene at which the shuttle physically docks
function ticksInScene(s) {
    const baseline = s.flags[FLAG_SHUTTLE1_BOARDED_AT];
    if (typeof baseline !== "number")
        return -1;
    return s.ticks - baseline;
}
/** True if the player is anywhere in the shuttle1 scene. */
function inShuttle1(s) {
    return s.currentRoom === "shuttle1_cabin"
        || s.currentRoom === "shuttle1_hatch"
        || s.currentRoom === "shuttle1_maintenance";
}
// --- Items --------------------------------------------------------------
const viewport = {
    id: "shuttle1_viewport",
    name: "viewport",
    aliases: ["viewport", "window", "stars"],
    description: "Stars. The receding station. Nothing you haven't seen before.",
    takeable: false,
};
const transitScreen = {
    id: "shuttle1_screen",
    name: "transit screen",
    aliases: ["screen", "transit", "display"],
    // The ETA counts down with the scene clock (one tick ≈ one minute), so it
    // reads live rather than as a fixed string. The remaining figure is shared
    // with the docking-approach chime so the two never disagree.
    description: (s) => {
        if (s.flags[FLAG_SHUTTLE1_ARRIVED]) {
            return "DOCKED. DISEMBARK FORWARD FOR SHAMELESS EFFICIENCY CONNECTIONS.";
        }
        const mins = etaMinutes(s);
        return s.flags[FLAG_SHUTTLE1_DOCKED]
            ? `DOCKING APPROACH INITIATED. ETA: ${mins}.`
            : `DESTINATION: SHAMELESS EFFICIENCY DOCKING POINT. ETA: ${mins}.`;
    },
    takeable: false,
};
/** Minutes-to-dock as shown on the transit screen / approach chime. */
function etaMinutes(s) {
    const n = Math.max(0, ticksInScene(s));
    const remaining = Math.max(1, DOCKED_AT - n);
    return `${remaining} MINUTE${remaining === 1 ? "" : "S"}`;
}
const seats = {
    id: "shuttle1_seats",
    name: "seats",
    aliases: ["seats", "seat", "harness", "restraints"],
    description: "Standard zero-g passenger seating. Four seats, paired and facing. Harness restraints, lightly used.",
    takeable: false,
};
const hatchItem = {
    id: "shuttle1_hatch_item",
    name: "access hatch",
    aliases: ["hatch", "access hatch", "bulkhead", "maintenance access", "maintenance hatch"],
    description: "An unmarked access hatch set into the aft bulkhead. A notice reads: " +
        "MAINTENANCE ACCESS — AUTHORISED PERSONNEL ONLY. It is not locked.",
    takeable: false,
};
const hatchNotice = {
    id: "shuttle1_notice",
    name: "laminated notice",
    aliases: ["notice", "sign", "warning"],
    description: "It says what it says. There is no lock.",
    takeable: false,
};
const tetheredEquipment = {
    id: "shuttle1_equipment",
    name: "equipment",
    aliases: ["equipment", "tools", "gear", "spares"],
    description: "Standard shuttle maintenance equipment. Wrenches, diagnostic units, spares for components you couldn't name. " +
        "All of it secured against the zero-g. None of it useful to you.",
    takeable: false,
};
const maintenancePanel = {
    id: "shuttle1_panel",
    name: "emergency systems panel",
    aliases: ["panel", "controls", "emergency panel", "switches", "board"],
    description: "The panel reads: EMERGENCY SYSTEMS — MANUAL OVERRIDES.\n\n" +
        "Eight controls, each clearly labelled. Backup power relay. Thruster manual cutoff. " +
        "Distress beacon (three positions: OFF / STANDBY / ACTIVE). Environmental override. " +
        "Hull integrity monitor. Two others too technical to parse at a glance.\n\n" +
        "And at the far right, behind a hinged transparent cover that is closed but not locked:\n\n" +
        "  MANUAL AIRLOCK RELEASE — FOR EMERGENCY USE ONLY — DO NOT OPERATE IN TRANSIT.\n\n" +
        "The cover has no lock. The warning has no enforcement mechanism beyond itself. " +
        "The shuttle's designers clearly felt that was sufficient.",
    takeable: false,
};
const cover = {
    id: "shuttle1_cover",
    name: "lever cover",
    aliases: ["cover", "transparent cover", "hinged cover"],
    description: (s) => s.flags[FLAG_AIRLOCK_COVER_OPEN]
        ? "The transparent cover is open. The red-handled lever beneath it is exposed."
        : "A hinged transparent cover, closed but not locked. The lever sits beneath it.",
    takeable: false,
    onOpen: (s) => {
        if (s.flags[FLAG_AIRLOCK_COVER_OPEN])
            return "The cover is already open.";
        s.flags[FLAG_AIRLOCK_COVER_OPEN] = true;
        return "The cover swings open on a small hinge. The lever is right there.";
    },
    onClose: (s) => {
        if (!s.flags[FLAG_AIRLOCK_COVER_OPEN])
            return "The cover is already closed.";
        s.flags[FLAG_AIRLOCK_COVER_OPEN] = false;
        return "You close the cover. Good.";
    },
};
const lever = {
    id: "shuttle1_lever",
    name: "airlock release lever",
    aliases: ["lever", "release", "airlock release", "airlock lever", "airlock", "red lever", "red-handled lever", "button"],
    description: (s) => s.flags[FLAG_AIRLOCK_COVER_OPEN]
        ? "A lever, red-handled. Its cover stands open; nothing is between your hand and it now. " +
            "The label above it says everything that needs to be said. It assumes you'll listen."
        : "A lever, red-handled. The cover over it is a single flip of the thumb from open. " +
            "The label above it says everything that needs to be said. It assumes you'll listen.",
    takeable: false,
    // `use lever on <self>` is a stretch — instead we treat `push lever` /
    // `pull lever` as the operative interaction.
    onPush: (s) => operateLever(s),
};
const warningLabel = {
    id: "shuttle1_label",
    name: "warning label",
    aliases: ["label", "warning", "warning label"],
    description: "MANUAL AIRLOCK RELEASE — FOR EMERGENCY USE ONLY — DO NOT OPERATE IN TRANSIT.\n\n" +
        "It is, you have to admit, admirably clear.",
    takeable: false,
    // Points for reading the "DO NOT" sign — whether or not you then ignore it.
    onExamine: (s) => { score(s, HOOK_READ_WARNING_LABEL); },
};
const distressBeacon = {
    id: "shuttle1_beacon",
    name: "distress beacon",
    aliases: ["beacon", "distress"],
    description: "Three positions. Currently set to OFF. You leave it there.",
    takeable: false,
};
function operateLever(s) {
    // A blocked attempt (cover still closed) doesn't move the lever, so it
    // scores nothing — only an ACTUAL pull does. Check that case first.
    if (!s.flags[FLAG_SHUTTLE1_ARRIVED] && !s.flags[FLAG_AIRLOCK_COVER_OPEN]) {
        return "The cover is in the way. You would need to open it first.";
    }
    // From here the lever is actually pulled: award the hook in both the
    // post-docking (harmless) and in-transit (lethal) cases, per design. On
    // death the points show on the score summary but don't carry forward;
    // after docking they bank toward an ending.
    score(s, HOOK_PULLED_LEVER);
    // Post-docking: lever moves, nothing happens.
    if (s.flags[FLAG_SHUTTLE1_ARRIVED]) {
        return ("The shuttle has docked. The airlock is already equalised with the dock atmosphere. " +
            "The lever moves. Nothing else does.\n\n" +
            "The label still says not to. Some habits are worth keeping regardless.");
    }
    // In transit + cover open + lever pulled = death.
    s.dead = true;
    s.deathReason =
        "You pull the lever.\n\nThe pressure differential does the rest.\n\n" +
            "Cause of death: manual airlock release, shuttle in transit.";
    return "";
}
// --- Rooms --------------------------------------------------------------
// Layout (linear): cabin ──aft──> hatch ──aft──> maintenance.
// Repeatedly going `aft` from the cabin walks straight through to the end;
// repeatedly going `forward` from maintenance walks back to the cabin. No
// `back` exits — that token is ambiguous (means "the way I came from" in
// natural English) and would clutter the exit list.
const cabin = {
    id: "shuttle1_cabin",
    name: "Transfer Shuttle — Passenger Cabin",
    description: (s) => s.flags[FLAG_SHUTTLE1_ARRIVED]
        ? "Four seats with harness restraints, arranged in pairs facing each other. The screen on the " +
            "forward bulkhead reads DOCKED. The forward airlock has cycled open onto the liner's " +
            "boarding gangway; cool, faintly different air drifts in.\n\n" +
            "An access hatch in the aft bulkhead is marked MAINTENANCE ACCESS — AUTHORISED PERSONNEL ONLY."
        : "Four seats with harness restraints, arranged in pairs facing each other. You've taken one " +
            "without thinking — habit. A viewport to one side shows the station receding into the " +
            "dark; already it looks like nothing in particular. A screen on the forward bulkhead displays " +
            "transit status.\n\n" +
            "Handholds run along every surface. An access hatch in the aft bulkhead is marked " +
            "MAINTENANCE ACCESS — AUTHORISED PERSONNEL ONLY. It is not locked.",
    exits: {
        aft: { to: "shuttle1_hatch", description: "through the access hatch" },
        // The way off the shuttle. Closed until the shuttle physically docks;
        // not advertised before then.
        out: {
            to: "liner_lounge",
            gated: (s) => s.flags[FLAG_SHUTTLE1_ARRIVED]
                ? null
                : "The shuttle is still under way. The forward airlock won't cycle in transit.",
            hideWhenGated: true,
            description: "onto the liner",
        },
    },
    items: ["shuttle1_hatch_item", "shuttle1_viewport", "shuttle1_screen", "shuttle1_seats"],
    npcs: [],
    onEnter: (s) => {
        // First entry: stamp the scene baseline.
        if (typeof s.flags[FLAG_SHUTTLE1_BOARDED_AT] !== "number") {
            s.flags[FLAG_SHUTTLE1_BOARDED_AT] = s.ticks;
        }
    },
};
const hatch = {
    id: "shuttle1_hatch",
    name: "Transfer Shuttle — Access Tunnel",
    description: "A short crawlway, barely wide enough to turn around in. A laminated notice is fixed to the " +
        "wall at eye level: PASSENGER ACCESS BEYOND THIS POINT IS NOT PERMITTED.\n\n" +
        "The passenger cabin is forward. The maintenance bay is aft.",
    exits: {
        forward: { to: "shuttle1_cabin" },
        aft: { to: "shuttle1_maintenance" },
    },
    items: ["shuttle1_notice"],
    npcs: [],
};
const maintenance = {
    id: "shuttle1_maintenance",
    name: "Transfer Shuttle — Maintenance Bay",
    description: "A working space, not a passenger space. Tools, spares, and diagnostic units are tethered to " +
        "every surface with the cheerful thoroughness of people who know what happens when they aren't. " +
        "None of it is labelled for the benefit of someone who has no business being here. The smell is " +
        "mechanical: recycled air with a faint trace of lubricant.\n\n" +
        "On the forward bulkhead, a panel is mounted at chest height. It is larger than the surrounding " +
        "equipment. It is labelled in the way that only important things need to be labelled.",
    exits: {
        forward: { to: "shuttle1_hatch" },
    },
    items: ["shuttle1_equipment", "shuttle1_panel", "shuttle1_cover", "shuttle1_lever", "shuttle1_label", "shuttle1_beacon"],
    npcs: [],
    // Points for venturing into the off-limits maintenance bay at all.
    onEnter: (s) => { score(s, HOOK_ENTERED_MAINTENANCE); },
};
/**
 * Scene-level tick for the shuttle. Wired into World.onTick (NOT Room.onTick)
 * so it fires on every paid action including moves — otherwise a player who
 * spends the docking-window walking between rooms would have the countdown
 * fire only when they finally stand still, collapsing the warning and the
 * transition into adjacent turns.
 *
 * No-op if the player isn't in the shuttle or hasn't yet stamped the
 * baseline; returns the docking-announcement text on the tick it fires.
 */
export function shuttle1WorldTick(s) {
    if (s.dead)
        return;
    if (!inShuttle1(s))
        return;
    const n = ticksInScene(s);
    if (n < 0)
        return;
    // Both thresholds are checked on the same tick — a single large `wait`
    // can cross both at once, so we accumulate rather than early-returning.
    const out = [];
    // Approach warning.
    if (n >= DOCKING_AT && !s.flags[FLAG_SHUTTLE1_DOCKED]) {
        s.flags[FLAG_SHUTTLE1_DOCKED] = true;
        out.push(`── A soft chime. The transit screen updates. ──\n*DOCKING APPROACH INITIATED. ETA: ${etaMinutes(s)}.*`);
    }
    // Physical docking. The shuttle does NOT teleport the player onward — it
    // docks, opens the forward airlock, and leaves the player to disembark
    // themselves (the cabin's `out` exit is now live).
    if (n >= DOCKED_AT && !s.flags[FLAG_SHUTTLE1_ARRIVED]) {
        s.flags[FLAG_SHUTTLE1_ARRIVED] = true;
        const where = s.currentRoom === "shuttle1_cabin"
            ? "Ahead of you, the forward airlock cycles open onto the liner's boarding gangway. " +
                "You can go OUT when you're ready."
            : "Forward, you hear the airlock cycle open. The way off the shuttle is through the " +
                "passenger cabin.";
        out.push("── A heavy, settling thud runs through the hull. The shuttle has docked. ──");
        out.push(where);
    }
    return out.length > 0 ? out : undefined;
}
export const shuttle1Rooms = {
    shuttle1_cabin: cabin,
    shuttle1_hatch: hatch,
    shuttle1_maintenance: maintenance,
};
export const shuttle1Items = {
    shuttle1_hatch_item: hatchItem,
    shuttle1_viewport: viewport,
    shuttle1_screen: transitScreen,
    shuttle1_seats: seats,
    shuttle1_notice: hatchNotice,
    shuttle1_equipment: tetheredEquipment,
    shuttle1_panel: maintenancePanel,
    shuttle1_cover: cover,
    shuttle1_lever: lever,
    shuttle1_label: warningLabel,
    shuttle1_beacon: distressBeacon,
};
