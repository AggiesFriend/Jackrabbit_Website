// Reusable "an NPC pursues the PC" mechanic — ambushes, muggings, a tail you
// have to shake. A game-layer convenience (like buildArea) built on the engine's
// NPC-movement primitives; nothing in the engine knows about pursuits.
//
// Each world tick the pursuer steps one room toward the PC (engine BFS over the
// map). Catch the PC → onCatch fires and the world decides what that means
// (a demand, a mugging, a mischief death, a scripted scene). Reach a SAFE room
// → the chase breaks off for good. An optional onApproach telegraph fires the
// moment the pursuer draws level one room behind — a fair warning the PC can act
// on, in keeping with the "telegraphed trap" rule.
//
// USAGE: position the pursuer (placeNpcInRoom) when the chase should begin, then
// compose the returned ticker into World.onTick alongside the others:
//
//   const mugger = makePursuer({
//     npcId: "mugger", world,
//     active: (s) => s.flags["mugger_loose"] === true,
//     isSafe: (room) => PUBLIC_ROOMS.has(room),
//     onApproach: () => "Footsteps quicken in the dark behind you.",
//     onCatch: (s) => { s.dead = true; s.deathReason = "..."; },
//   });
//   onTick: (s) => mugger(s),   // (or merge with other tickers)
import { npcRoom, stepNpcToward } from "../../engine/npcs.js";
/**
 * Build a World.onTick-compatible pursuit ticker. It self-disables once the
 * pursuer catches the PC or the PC escapes to a safe room (latched via a
 * per-pursuer flag so it survives save/load).
 */
export function makePursuer(opts) {
    const { npcId, world, onCatch, isSafe, onApproach, onEscape, active } = opts;
    const overFlag = `pursuit_${npcId}_over`;
    return (s) => {
        if (s.dead || s.ended)
            return;
        if (s.flags[overFlag])
            return;
        if (active && !active(s))
            return;
        const from = npcRoom(world, s, npcId);
        if (from === undefined)
            return; // pursuer not positioned yet
        const here = s.currentRoom;
        // Reached safety → break off for good.
        if (isSafe?.(here, s)) {
            s.flags[overFlag] = true;
            return onEscape?.(s);
        }
        // Already on top of the PC (e.g. positioned in-room) → catch.
        if (from === here) {
            s.flags[overFlag] = true;
            return onCatch(s);
        }
        const moved = stepNpcToward(world, s, npcId, here);
        if (moved === here) {
            s.flags[overFlag] = true;
            return onCatch(s);
        }
        // One room behind now → telegraph (fair warning before the next tick lands).
        if (moved !== undefined && onApproach && isAdjacent(world, s, moved, here)) {
            return onApproach(s);
        }
        return;
    };
}
/** True if `a` has a real, currently-passable exit straight into `b`. */
function isAdjacent(world, s, a, b) {
    const room = world.rooms[a];
    if (!room)
        return false;
    return Object.values(room.exits).some((def) => def?.to === b && (!def.gated || def.gated(s) === null));
}
