// Assemble the game World from a flat list of content modules.
//
// THE PROBLEM IT SOLVES. The world is built from ~25 content files, each
// contributing some mix of rooms, items, NPCs, verbs, a world-tick, and an
// on-drop reaction. Wiring in a new area used to mean editing several PARALLEL
// collections in index.ts — the rooms spread, the items spread, the npcs spread,
// the commands map, the onTick list, onDrop — and it was easy to add one and
// forget another. A `WorldModule` groups one concern's contributions in a single
// object; `assembleParts` merges a list of them, so adding an area is one new
// entry rather than edits scattered across six sites.
//
// Content-agnostic (engine types only) — a kit-candidate alongside router.ts /
// economy.ts. World-level scalars (title, startRoom, endings, openingText, …)
// stay on the World literal in index.ts; this assembles only the
// collection-shaped parts.
import { registerTransitStops } from "./transit.js";
import { registerLift } from "./lifts.js";
/**
 * Merge modules, in order, into the World's collection fields. Maps are spread
 * (later wins on a key clash); every `tick` is folded into one onTick that runs
 * them in list order and concatenates their output (the long-standing "no-op
 * outside its scene; one big WAIT reports them all" contract); `onDrop` handlers
 * chain the same way. Tick order therefore follows module order — keep
 * co-firing tickers (e.g. the day/night boundary set) in their intended sequence.
 *
 * SIDE EFFECT: each module's `transitStops` and `lifts` are registered with the
 * transit / lift registries (transit.ts / lifts.ts) as part of assembly — those
 * subsystems keep their own module-global state, so this is the one place the
 * world's stops and lifts get wired up.
 */
export function assembleParts(modules) {
    const rooms = {};
    const items = {};
    const npcs = {};
    const commands = {};
    const tickers = [];
    const dropHandlers = [];
    const transitStops = [];
    const lifts = [];
    for (const m of modules) {
        if (m.rooms)
            Object.assign(rooms, m.rooms);
        if (m.items)
            Object.assign(items, m.items);
        if (m.npcs)
            Object.assign(npcs, m.npcs);
        if (m.commands)
            Object.assign(commands, m.commands);
        if (m.tick)
            tickers.push(m.tick);
        if (m.onDrop)
            dropHandlers.push(m.onDrop);
        if (m.transitStops)
            transitStops.push(...m.transitStops);
        if (m.lifts)
            lifts.push(...m.lifts);
    }
    registerTransitStops(transitStops);
    lifts.forEach(registerLift);
    const onTick = (s) => collect(tickers.map((fn) => fn(s)));
    const onDrop = dropHandlers.length === 0
        ? undefined
        : (s, itemId, roomId) => collect(dropHandlers.map((fn) => fn(s, itemId, roomId)));
    return { rooms, items, npcs, commands, onTick, onDrop };
}
/** Concatenate scene-callback returns into one output array (or undefined). */
function collect(results) {
    const out = [];
    for (const r of results) {
        if (r !== undefined)
            out.push(...(Array.isArray(r) ? r : [r]));
    }
    return out.length > 0 ? out : undefined;
}
