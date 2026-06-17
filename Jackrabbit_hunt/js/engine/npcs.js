// NPC-location helpers. Like items.ts, current NPC positions live on GameState
// so save/load/restart behave correctly and the static world is never mutated.
//
// The model is a SPARSE OVERRIDE: most NPCs never move and have NO entry here —
// their presence comes from the static `Room.npcs` arrays. An NPC gains an
// entry only once something explicitly relocates it (placeNpcInRoom), after
// which its dynamic location wins and its static placement(s) are ignored. This
// lets an NPC stay statically present in more than one room (e.g. a dock
// officer at both the concourse and his desk) while still supporting NPCs that
// walk a route for the player to FOLLOW.
/** NPC ids currently present in `roomId`: static occupants that haven't been
 *  moved, plus any NPC explicitly relocated here. */
export function npcsInRoom(world, state, roomId) {
    const moved = state.npcLocations ?? {};
    const movedIds = new Set(Object.keys(moved));
    const out = [];
    const room = world.rooms[roomId];
    if (room) {
        for (const id of room.npcs) {
            if (!movedIds.has(id))
                out.push(id);
        }
    }
    for (const [id, loc] of Object.entries(moved)) {
        if (loc === roomId && !out.includes(id))
            out.push(id);
    }
    return out;
}
/** The room an NPC is currently in: its dynamic location if it has been moved,
 *  otherwise the first static room that lists it. Undefined if it's nowhere. */
export function npcRoom(world, state, npcId) {
    const moved = state.npcLocations ?? {};
    if (npcId in moved)
        return moved[npcId];
    for (const room of Object.values(world.rooms)) {
        if (room.npcs.includes(npcId))
            return room.id;
    }
    return undefined;
}
/** Move an NPC into a room. From this point its location is tracked dynamically
 *  — used by world scripts to walk a "leader" NPC the player can `follow`. */
export function placeNpcInRoom(state, npcId, roomId) {
    if (!state.npcLocations)
        state.npcLocations = {};
    state.npcLocations[npcId] = roomId;
}
/**
 * Breadth-first NEXT HOP from `fromRoom` toward `toRoom` over real exits.
 * Returns the adjacent room to step into along a shortest path, or undefined if
 * `toRoom` is unreachable or equals `fromRoom`. Exits whose `gated` currently
 * refuses are treated as impassable, so pursuers can't walk through doors the
 * PC could only open from one side.
 */
export function nextHopToward(world, state, fromRoom, toRoom) {
    if (fromRoom === toRoom)
        return undefined;
    const cameFrom = new Map(); // child -> parent
    const seen = new Set([fromRoom]);
    const queue = [fromRoom];
    while (queue.length > 0) {
        const cur = queue.shift();
        const room = world.rooms[cur];
        if (!room)
            continue;
        for (const def of Object.values(room.exits)) {
            if (!def || !def.to)
                continue;
            if (def.gated && def.gated(state) !== null)
                continue; // currently blocked
            const next = def.to;
            if (seen.has(next))
                continue;
            seen.add(next);
            cameFrom.set(next, cur);
            if (next === toRoom) {
                // Walk back to the first hop out of fromRoom.
                let node = next;
                while (cameFrom.get(node) !== fromRoom)
                    node = cameFrom.get(node);
                return node;
            }
            queue.push(next);
        }
    }
    return undefined;
}
/**
 * Move `npcId` one hop along a shortest path toward `targetRoom`. Returns the
 * NPC's new room, or undefined if it didn't move (already there / unreachable /
 * not positioned). The building block for an NPC that pursues the PC.
 */
export function stepNpcToward(world, state, npcId, targetRoom) {
    const from = npcRoom(world, state, npcId);
    if (from === undefined || from === targetRoom)
        return undefined;
    const hop = nextHopToward(world, state, from, targetRoom);
    if (hop === undefined)
        return undefined;
    placeNpcInRoom(state, npcId, hop);
    return hop;
}
