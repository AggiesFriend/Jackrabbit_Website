// Lifts — multi-level areas. A lift is a car that exists on every level of an
// area as a separate room (`<base>_l<level>`); the floors are connected ONLY by
// the lift, not by walking. Inside a lift, SELECT a floor to ride to that
// level's lift room (one turn); step out (south, per the maps) onto that floor.
//
// This is the game-side counterpart to the mapper's multi-level export
// (tools/mapper.html → `levels:`/`lift:` + per-level `<base>_l<n>` instances).
//
// Reusable: register any number of lifts. The `select` verb (shared with the
// TravelTube pod) dispatches here when the player is in a lift room — see the
// selectCmd in horizon.ts.
import { requestSceneTransition } from "../../engine/authoring.js";
const DEFAULT_INTRO = "A small mirror-walled lift car, just big enough for a few people and their bags. A floor-" +
    "selection panel glows beside the door.";
/** Fill in each floor's step-out direction from its built lift-car room (the
 *  car has a single walking exit). Call after cross-area links are wired. */
export function withLiftDirs(def, rooms) {
    for (const f of def.floors) {
        const room = rooms[f.room];
        if (!room)
            continue;
        const dir = Object.keys(room.exits).find(d => room.exits[d]?.to);
        if (dir)
            f.dir = dir;
    }
    return def;
}
/** Build a LiftDef from a parsed multi-level area: the instance room ids
 *  (`<base>_l<level>`) come from the YAML; you supply the human floor labels and
 *  selection names per level. */
export function liftDefFromYaml(parsed, labels) {
    if (!parsed.lift)
        throw new Error("area has no lift");
    const base = parsed.lift;
    const floors = [];
    for (let level = 1; level <= parsed.levels; level++) {
        const l = labels[level] ?? { label: `Level ${level}`, names: [String(level)] };
        floors.push({ level, room: `${base}_l${level}`, label: l.label, names: l.names });
    }
    return { id: base, floors };
}
const LIFTS = [];
export function registerLift(def) {
    if (!LIFTS.some(l => l.id === def.id))
        LIFTS.push(def);
}
function liftOfRoom(roomId) {
    return LIFTS.find(l => l.floors.some(f => f.room === roomId));
}
export function isLiftRoom(roomId) { return !!liftOfRoom(roomId); }
function floorOfRoom(lift, roomId) {
    return lift.floors.find(f => f.room === roomId);
}
/** Dynamic description for a lift car (give this to each lift room's RoomDef). */
export function liftDescription(s) {
    const lift = liftOfRoom(s.currentRoom);
    if (!lift)
        return "A small lift car.";
    const here = floorOfRoom(lift, s.currentRoom);
    const list = lift.floors
        .map(f => `  • ${f.label}${f.room === s.currentRoom ? "  — you are here" : ""}`)
        .join("\n");
    const dir = here?.dir ?? "out";
    const exit = lift.exitLine && here
        ? lift.exitLine(dir, here)
        : `Step out (${dir}) to leave the lift on this floor.`;
    return ((lift.intro ?? DEFAULT_INTRO) + "\n\n" +
        `Currently at: ${here?.label ?? "—"}.\n` +
        (lift.selectLine ?? "SELECT a floor to ride to it:") + "\n" + list +
        "\n\n" + exit);
}
/** `select <floor>` while inside a lift. Rides to that floor's lift room (1 turn). */
export const liftSelect = (_w, s, cmd) => {
    const lift = liftOfRoom(s.currentRoom);
    if (!lift)
        return { handled: true, output: ["There's nothing here to select."], tickCost: 0, free: true };
    const noun = (cmd.noun ?? "").trim().toLowerCase();
    if (!noun) {
        return { handled: true, output: ["Select which floor? (e.g. SELECT ground, SELECT penthouse.)"], tickCost: 0, free: true };
    }
    const target = lift.floors.find(f => f.names.includes(noun) || f.label.toLowerCase() === noun || f.label.toLowerCase().includes(noun));
    if (!target) {
        const opts = lift.floors.map(f => f.label).join(", ");
        return { handled: true, output: [`The panel has no floor "${noun}". Floors: ${opts}.`], tickCost: 0, free: true };
    }
    if (target.room === s.currentRoom) {
        return { handled: true, output: [`You're already at ${target.label}.`], tickCost: 0, free: true };
    }
    // Per-lift danger hook (e.g. the shipyard cage). May cancel the ride.
    const current = floorOfRoom(lift, s.currentRoom);
    if (lift.onSelectFloor && current) {
        const r = lift.onSelectFloor(s, current, target);
        if (r && r.blocked) {
            const out = r.output === undefined ? [] : Array.isArray(r.output) ? r.output : [r.output];
            return { handled: true, output: out, tickCost: r.tickCost ?? 1 };
        }
    }
    requestSceneTransition(s, target.room);
    return {
        handled: true,
        output: [`The doors close; a soft chime, a brief sink-and-rise, and they open again at ${target.label}.`],
        tickCost: 1,
    };
};
