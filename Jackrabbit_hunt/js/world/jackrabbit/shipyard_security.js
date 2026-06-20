// Shipyard security — the price of being where you're not allowed.
//
// The yard-proper (everything past Sophie's reception counter) is off-limits.
// You can slip in at NIGHT, when the desk is unmanned (the gate is wired open at
// night in shipyard.ts) — and crossing the entrance ARMS the patrol (it sets
// FLAG_SHIPYARD_INTRUDING; only a real sneak-in arms it, never a teleport). Then:
//
//   NIGHT, in the OPEN (aprons, gantries, the hub, the accessway, the ship's
//     runs): a torch patrol quarters the yard. Pressure mounts tick by tick,
//     telegraphed, until it has you.
//   NIGHT, in COVER (a bay, a lift car, or a bolthole): you're out of the beam's
//     path — the pressure bleeds off.
//   DAY, anywhere past the counter but a bolthole: the working crew are
//     everywhere; you're collared on sight (the "stay out till you're done"
//     pressure — linger past dawn and you're caught).
//
// Two BOLTHOLES are safe day OR night: the Tool Store at the entrance and the
// Untheatrical's armoury deep in the yard — the same two rooms that hold the
// crowbar and the gun.
//
// Getting caught is NON-VIOLENT (Horizon's justice always is — see shame.ts): you
// are scanned, logged, warned, and walked back to reception. THREE strikes and
// the station is done being patient — evicted from your lodging and barred from
// the Outpost for good (the Deported ending).
//
// MODEL NOTE. The yard spans three levels joined ONLY by the lift `select`
// mechanic, not by room exits — so a room-to-room homing pursuer (pursuit.ts)
// can't cross levels and is the wrong tool here. This is a level-agnostic
// "exposure" model: time spent in the OPEN at night is the risk, with cover
// (the bays, the lift cars) and the two boltholes to break it. Calibration
// (PATROL_CATCH_AT, the room classification) is provisional — tune in Phase D.
import { requestSceneTransition } from "../../engine/authoring.js";
import { shipyardRooms } from "./shipyard.js";
import { score } from "./scoring.js";
import { FLAG_SHIPYARD_STRIKES, FLAG_SHIPYARD_PATROL_HEAT, FLAG_SHIPYARD_INTRUDING, HOOK_EVADED_PATROL, } from "./flags.js";
const RECEPTION = "horizon_shipyard_reception";
/** Yard-proper = every shipyard room EXCEPT reception (the public threshold). */
const YARD_ROOMS = new Set(Object.keys(shipyardRooms).filter((id) => id !== RECEPTION));
/** The two rooms that double as hiding places (also the crowbar / gun rooms).
 *  Safe day AND night. */
const BOLTHOLES = new Set([
    "horizon_tool_store",
    "horizon_untheatrical_armory",
]);
/** Ticks of OPEN-yard loitering at night before the patrol has you. The run-up
 *  is telegraphed; the catch lands on this tick. Sized so the long traverse to
 *  the Untheatrical is doable if you keep ducking into cover. (Provisional.) */
export const PATROL_CATCH_AT = 7;
/** Strikes before the station bars you from the Outpost for good. */
export const STRIKES_TO_BAR = 3;
/** The patrol counts as "within 2 rooms" — close enough that slipping it scores
 *  HOOK_EVADED_PATROL (+4, once) — once heat has reached this, i.e. 2 ticks shy
 *  of capture. */
export const EVASION_HEAT = PATROL_CATCH_AT - 2;
/** COVER at night: the bays themselves, the lift cars, and the boltholes — places
 *  off the open floor where the sweeping beam doesn't reach. Everything else in
 *  the yard (aprons, gantries, the hub, the accessway, the ship's open runs) is
 *  EXPOSED. */
function isCover(room) {
    if (BOLTHOLES.has(room))
        return true;
    if (/^horizon_(small|medium|large)_bay_\d+$/.test(room))
        return true; // the bays
    if (room.startsWith("horizon_shipyard_lift_"))
        return true; // lift cars
    return false;
}
/** Escalating telegraph as the patrol closes (one distinct beat per heat level,
 *  heat 1..PATROL_CATCH_AT-1; the last line is the final warning before capture). */
const TELEGRAPH = [
    "Somewhere off in the dark of the yard, a torch beam clicks on and starts a slow, unhurried sweep.",
    "The beam swings lazily along a distant row of bays. Not near yet — but a patrol is definitely out.",
    "Footsteps now: measured, in no hurry, somewhere past the next bulkhead. Working their way round.",
    "Closer — a boot-scuff, the creak of a tool-belt. The patrol's in the next bay but one.",
    "The beam rakes across the apron a few strides off and you flatten on instinct. Too close.",
    "Light splashes your boots; a second shadow swings up the wall beside your own. One more moment in the " +
        "open and they have you — into cover, NOW: a bay, the tool store, the ship.",
];
function telegraph(heat) {
    return TELEGRAPH[Math.min(heat, TELEGRAPH.length) - 1];
}
function strikes(s) {
    return Number(s.flags[FLAG_SHIPYARD_STRIKES]) || 0;
}
/** Process a capture: bank a strike, then either bar the PC (third strike) or
 *  escort them back out to reception with a logged warning. */
function capture(s, mode) {
    const n = strikes(s) + 1;
    s.flags[FLAG_SHIPYARD_STRIKES] = n;
    delete s.flags[FLAG_SHIPYARD_PATROL_HEAT];
    if (n >= STRIKES_TO_BAR) {
        s.ended = true;
        s.endingId = "barred";
        return []; // barredEnding narrates it
    }
    requestSceneTransition(s, RECEPTION);
    const caught = mode === "day"
        ? "Dawn has crept into the yard, and with it the day shift. A foreman in a scuffed hi-vis tabard takes " +
            "one look at you, sighs the sigh of a man who has seen it all, and beckons two of his crew over."
        : "A torch beam catches you square in the face and holds. \"Right. Stand still.\" A firm hand closes on " +
            "your arm before you've finished deciding whether to bolt.";
    const warning = n === 1
        ? "They run your ID — you're in the log now — walk you back to reception, and turn you loose with a flat " +
            "warning. (That's one.)"
        : "Your ID gets scanned again; this time it's flagged, not merely logged, and you're marched back to " +
            "reception. \"Third time,\" the guard mentions, almost pleasantly, \"and you're off Horizon for good. " +
            "There isn't a fourth.\" (That's two.)";
    return [caught, warning];
}
/**
 * World.onTick fragment for shipyard security. A no-op everywhere but the
 * yard-proper, and only once the PC has actually sneaked in (FLAG_SHIPYARD_
 * INTRUDING). Fold into World.onTick AFTER the day/night ticker so it reads the
 * up-to-date phase (a tick that flips to dawn collars a loiterer at once).
 */
export function shipyardSecurityTick(s) {
    if (s.dead || s.ended)
        return;
    const here = s.currentRoom;
    // Outside the yard proper (incl. reception): stand down, clear all pressure.
    // Slipping OUT a stride ahead of a closing patrol counts as an evasion.
    if (!YARD_ROOMS.has(here)) {
        const wasHeat = Number(s.flags[FLAG_SHIPYARD_PATROL_HEAT]) || 0;
        if (s.flags[FLAG_SHIPYARD_PATROL_HEAT] !== undefined)
            delete s.flags[FLAG_SHIPYARD_PATROL_HEAT];
        if (s.flags[FLAG_SHIPYARD_INTRUDING])
            delete s.flags[FLAG_SHIPYARD_INTRUDING];
        if (wasHeat >= EVASION_HEAT) {
            score(s, HOOK_EVADED_PATROL);
            return "You slip out of the yard a stride ahead of the sweep, into the bright ordinariness beyond — " +
                "heart still going hard.";
        }
        return;
    }
    // Only a real sneak-in through the gate arms the patrol (teleport stays inert).
    if (!s.flags[FLAG_SHIPYARD_INTRUDING])
        return;
    // DAY: the working yard is crew everywhere. Only the boltholes hide you.
    if (s.isDaytime) {
        if (BOLTHOLES.has(here)) {
            if (s.flags[FLAG_SHIPYARD_PATROL_HEAT] !== undefined)
                delete s.flags[FLAG_SHIPYARD_PATROL_HEAT];
            return;
        }
        return capture(s, "day");
    }
    // NIGHT in cover (a bay, a lift car, a bolthole): out of the beam's path.
    // Ducking in just as the patrol closes (within 2) is a scored evasion.
    if (isCover(here)) {
        const wasHeat = Number(s.flags[FLAG_SHIPYARD_PATROL_HEAT]) || 0;
        if (s.flags[FLAG_SHIPYARD_PATROL_HEAT] !== undefined) {
            delete s.flags[FLAG_SHIPYARD_PATROL_HEAT];
            if (wasHeat >= EVASION_HEAT) {
                score(s, HOOK_EVADED_PATROL); // +4, once
                return "Heart hammering, you fold into cover just as the beam sweeps the spot where you were " +
                    "standing — and passes on. You've given them the slip, this time.";
            }
            return "You slip out of sight and wait. The torch beam sweeps across the mouth of the bay, pauses — " +
                "and moves on.";
        }
        return;
    }
    // NIGHT in the open: the pressure mounts, telegraphed, until it bites.
    const heat = (Number(s.flags[FLAG_SHIPYARD_PATROL_HEAT]) || 0) + 1;
    if (heat >= PATROL_CATCH_AT)
        return capture(s, "night");
    s.flags[FLAG_SHIPYARD_PATROL_HEAT] = heat;
    return telegraph(heat);
}
// --- The barred / Deported ending ---------------------------------------
export const barredEnding = {
    id: "barred",
    survived: true,
    forcedRank: "Deported",
    text: "This time there is no warning, because there is none left to give. The third strike is the last one. " +
        "Hands take you by both arms — unhurried, almost bored — and walk you out of the yard for the final time.\n\n" +
        "You are processed with the brisk, total efficiency of a station that has done this many times before. " +
        "Your lodging is cleared while you wait; your few effects are bagged; your ID is flagged, permanently, " +
        "at every reader on Horizon. No charges. You are simply, comprehensively, no longer welcome.",
    closingText: "They put you aboard the first outbound transport with a free berth — not a destination of your " +
        "choosing — and the lock cycles shut behind you.\n\n" +
        "Horizon's justice was never going to be violent. It didn't need to be. It simply decided you were not " +
        "one of its own and removed you, the way you'd strike a name from a list. The contract is somewhere " +
        "behind you now, with the boy you never found and the people who never gave you their names. By the " +
        "time the station has shrunk to a single cold point of light, even that much is fading.",
};
