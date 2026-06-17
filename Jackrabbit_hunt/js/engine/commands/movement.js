// Movement verbs. Spec §4.4.
import { describeRoom } from "../output.js";
import { npcRoom, npcsInRoom } from "../npcs.js";
import { findBestNpcMatch } from "./interaction.js";
const COMPASS_TO_DIR = {
    north: "north", south: "south", east: "east", west: "west",
    up: "up", down: "down", in: "in", out: "out",
};
export function handleGo(world, state, cmd) {
    const target = (cmd.noun ?? cmd.verb ?? "").trim();
    if (!target)
        return { handled: true, output: ["Go where?"], tickCost: 0, free: true };
    const dir = COMPASS_TO_DIR[target] ?? target;
    const room = world.rooms[state.currentRoom];
    if (!room)
        return { handled: true, output: ["You are nowhere. (Engine error: unknown room.)"], tickCost: 0, free: true };
    const exit = room.exits[dir];
    if (!exit) {
        return { handled: true, output: [`You can't go ${dir} from here.`], tickCost: 0, free: true };
    }
    if (exit.gated) {
        const refusal = exit.gated(state);
        if (refusal)
            return { handled: true, output: [refusal], tickCost: 0, free: true };
    }
    // Virtual exit (no `to`) that wasn't refused by `gated`: misconfigured world.
    if (!exit.to) {
        return { handled: true, output: [`You can't go ${dir} from here.`], tickCost: 0, free: true };
    }
    const dest = world.rooms[exit.to];
    if (!dest) {
        return { handled: true, output: ["That exit leads nowhere. (Engine error.)"], tickCost: 0, free: true };
    }
    enterRoom(world, state, dest.id);
    const output = describeRoom(world, state, dest, "full");
    const ticks = exit.ticks ?? 1;
    return { handled: true, output, tickCost: ticks };
}
/**
 * Update state to reflect the player being in `roomId`, firing onEnter and
 * stamping the entry tick used by per-room onTick callbacks. Shared between
 * player-driven movement and programmatic transitions.
 */
export function enterRoom(world, state, roomId) {
    state.currentRoom = roomId;
    state.roomEnteredAtTick = state.ticks;
    const dest = world.rooms[roomId];
    if (dest?.onEnter)
        dest.onEnter(state);
}
/**
 * `follow <npc>` — step into the room a moving NPC just walked into, but ONLY
 * while you're right behind them: the NPC must be in a room directly connected
 * to yours (they stepped one exit ahead). If they're further off — because you
 * stopped to do something else — you've lost them, and follow fails (no tick).
 *
 * NPC movement itself is world-driven: a "leader" NPC is walked along its route
 * by world script (World.onTick + placeNpcInRoom). This verb is the player's
 * half — it resolves the direction to the NPC automatically and walks it.
 */
export function handleFollow(world, state, cmd) {
    const noun = (cmd.noun ?? "").trim();
    if (!noun)
        return { handled: true, output: ["Follow whom?"], tickCost: 0, free: true };
    const npc = findBestNpcMatch(world, Object.keys(world.npcs), noun);
    if (!npc)
        return { handled: true, output: [`There's no one called ${noun} to follow.`], tickCost: 0, free: true };
    const here = state.currentRoom;
    // Already in the room with you? Then you're alongside them, not behind — no
    // follow. (Checked via presence so an NPC statically placed in several rooms
    // is recognised here, not chased to a different instance.)
    if (npcsInRoom(world, state, here).includes(npc.id)) {
        return { handled: true, output: [`${npc.name} is right here with you.`], tickCost: 0, free: true };
    }
    const target = npcRoom(world, state, npc.id);
    if (target === undefined) {
        return { handled: true, output: [`There's no sign of ${npc.name} to follow.`], tickCost: 0, free: true };
    }
    // "Right behind" = the NPC is one connected room ahead. Find the exit to them.
    const room = world.rooms[here];
    let exit;
    for (const def of Object.values(room?.exits ?? {})) {
        if (def?.to === target) {
            exit = def;
            break;
        }
    }
    if (!exit || !exit.to) {
        return { handled: true, output: [`You've lost sight of ${npc.name}.`], tickCost: 0, free: true };
    }
    if (exit.gated) {
        const refusal = exit.gated(state);
        if (refusal)
            return { handled: true, output: [refusal], tickCost: 0, free: true };
    }
    const dest = world.rooms[exit.to];
    if (!dest)
        return { handled: true, output: ["That way leads nowhere. (Engine error.)"], tickCost: 0, free: true };
    enterRoom(world, state, dest.id);
    const output = [`You follow ${npc.name}.`, ...describeRoom(world, state, dest, "full")];
    return { handled: true, output, tickCost: exit.ticks ?? 1 };
}
/**
 * Handle bare direction verbs (north, south, ...) by delegating to handleGo.
 * The parser already maps single-token compass directions into `go <dir>`,
 * but explicit "north" as a multi-token sentence still arrives here.
 */
export function handleDirection(world, state, cmd) {
    return handleGo(world, state, { ...cmd, verb: "go", noun: cmd.verb });
}
