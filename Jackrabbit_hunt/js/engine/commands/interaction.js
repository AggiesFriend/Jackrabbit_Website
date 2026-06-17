// Interaction verbs: look, examine, read, search, take, drop, give, use, talk, ask, buy.
// Spec §4.4.
import { describeRoom, joinList } from "../output.js";
import { itemsInRoom, placeItemInRoom, takeItemToInventory } from "../items.js";
import { npcsInRoom } from "../npcs.js";
/**
 * Normalise the value returned by an item-action handler (onUseWith, onPush,
 * onOpen, onClose) into a CommandResult with sensible defaults.
 *
 *  - undefined / void: print nothing, charge 1 tick.
 *  - string / string[]: print as output, charge 1 tick.
 *  - object: respect the supplied output / tickCost / free fields, default to
 *    1 tick if tickCost not set, default to not free.
 */
function resultFromItemAction(result) {
    if (result === undefined)
        return { handled: true, output: [], tickCost: 1 };
    if (typeof result === "string")
        return { handled: true, output: [result], tickCost: 1 };
    if (Array.isArray(result))
        return { handled: true, output: result, tickCost: 1 };
    const lines = result.output === undefined
        ? []
        : Array.isArray(result.output) ? result.output : [result.output];
    const out = {
        handled: true,
        output: lines,
        tickCost: result.tickCost ?? 1,
    };
    if (result.free)
        out.free = true;
    return out;
}
// --- scope resolution ---------------------------------------------------
function room(world, state) {
    return world.rooms[state.currentRoom];
}
/**
 * Score how well an entity's name/aliases match a noun.
 *   "exact"     — name or any alias matches the noun verbatim (case-insensitive).
 *   "substring" — name or alias contains the noun as a substring.
 *   "none"      — no match.
 *
 * Callers prefer "exact" over "substring" so a specific name beats a partial
 * alias-match on another entity in the same scope. This is the load-bearing
 * rule that stops e.g. the lobby's `form_datapad` (alias "datapad") from
 * winning over a real `datapad` (exact name "datapad") in inventory.
 */
function matchKind(name, aliases, noun) {
    const n = noun.toLowerCase();
    if (name.toLowerCase() === n)
        return "exact";
    if (aliases) {
        for (const a of aliases)
            if (a.toLowerCase() === n)
                return "exact";
    }
    if (name.toLowerCase().includes(n))
        return "substring";
    if (aliases) {
        for (const a of aliases)
            if (a.toLowerCase().includes(n))
                return "substring";
    }
    return "none";
}
/**
 * Resolve a noun to the best-matching entity from the supplied id list.
 * Two-pass: every "exact" match beats every "substring" match. Within each
 * pass, the first id in the list wins — so callers establish priority by
 * order (e.g. inventory first, then room).
 */
function findBestItemMatch(world, ids, noun) {
    let substr;
    for (const id of ids) {
        const it = world.items[id];
        if (!it)
            continue;
        const k = matchKind(it.name, it.aliases, noun);
        if (k === "exact")
            return it; // exact match short-circuits everything
        if (k === "substring" && !substr)
            substr = it;
    }
    return substr;
}
export function findBestNpcMatch(world, ids, noun) {
    let substr;
    for (const id of ids) {
        const n = world.npcs[id];
        if (!n)
            continue;
        const k = matchKind(n.name, n.aliases, noun);
        if (k === "exact")
            return n;
        if (k === "substring" && !substr)
            substr = n;
    }
    return substr;
}
function findItemInScope(world, state, noun) {
    // Inventory listed first so that, when both an inventory item and a room
    // item match with the same precision, the one in the player's hand wins.
    // The two-pass exact/substring logic in findBestItemMatch is what stops
    // a partial room-item alias from beating an exact inventory match.
    const ids = [...state.inventory, ...itemsInRoom(state, state.currentRoom)];
    return findBestItemMatch(world, ids, noun);
}
function findNpcInScope(world, state, noun) {
    const r = room(world, state);
    if (!r)
        return undefined;
    return findBestNpcMatch(world, npcsInRoom(world, state, r.id), noun);
}
/**
 * True if `noun` resolves to an item or NPC currently in scope. Used by the
 * engine to support bare-noun input ("panel" → "examine panel") as a
 * fallback when the first token isn't a known verb.
 */
export function isExaminableNoun(world, state, noun) {
    return findItemInScope(world, state, noun) !== undefined
        || findNpcInScope(world, state, noun) !== undefined
        || (world.rooms[state.currentRoom]?.scenery?.[noun.trim().toLowerCase()] !== undefined);
}
// --- LOOK ---------------------------------------------------------------
export function handleLook(world, state, cmd) {
    // "look <noun>" (and "look at <noun>") behaves like examine. Bare "look"
    // re-describes the room.
    if (cmd.noun)
        return handleExamine(world, state, cmd);
    const r = room(world, state);
    if (!r)
        return { handled: true, output: ["You see nothing in particular."], tickCost: 0.1 };
    return { handled: true, output: describeRoom(world, state, r, "full"), tickCost: 0.1 };
}
// --- EXAMINE / READ / SEARCH -------------------------------------------
export function handleExamine(world, state, cmd) {
    if (!cmd.noun)
        return { handled: true, output: ["Examine what?"], tickCost: 0, free: true };
    // Try item, then NPC.
    const item = findItemInScope(world, state, cmd.noun);
    if (item) {
        if (item.onExamine)
            item.onExamine(state);
        return { handled: true, output: [resolveItemDescription(item, state)], tickCost: 1 };
    }
    const npc = findNpcInScope(world, state, cmd.noun);
    if (npc) {
        return { handled: true, output: [resolveNpcDescription(npc, state)], tickCost: 1 };
    }
    const sceneryText = findSceneryInScope(world, state, cmd.noun);
    if (sceneryText !== undefined) {
        return { handled: true, output: [sceneryText], tickCost: 1 };
    }
    return { handled: true, output: [`You see no ${cmd.noun} here.`], tickCost: 0, free: true };
}
/** Look up `noun` in the current room's `scenery` map (after items/NPCs fail). */
function findSceneryInScope(world, state, noun) {
    const scenery = room(world, state)?.scenery;
    if (!scenery)
        return undefined;
    const v = scenery[noun.trim().toLowerCase()];
    if (v === undefined)
        return undefined;
    return typeof v === "function" ? v(state) : v;
}
export function handleRead(world, state, cmd) {
    if (!cmd.noun)
        return { handled: true, output: ["Read what?"], tickCost: 0, free: true };
    const item = findItemInScope(world, state, cmd.noun);
    if (!item)
        return { handled: true, output: [`There is no ${cmd.noun} here to read.`], tickCost: 0, free: true };
    // Reading is a form of examining — fire the same side-effect hook so world
    // content can score (or otherwise react to) "read X" and "examine X" alike.
    if (item.onExamine)
        item.onExamine(state);
    return { handled: true, output: [resolveItemDescription(item, state)], tickCost: 1 };
}
function resolveItemDescription(item, state) {
    return typeof item.description === "function" ? item.description(state) : item.description;
}
function resolveNpcDescription(npc, state) {
    return typeof npc.description === "function" ? npc.description(state) : npc.description;
}
export function handleSearch(world, state, cmd) {
    if (!cmd.noun) {
        const ids = itemsInRoom(state, state.currentRoom);
        if (ids.length === 0)
            return { handled: true, output: ["You find nothing of interest."], tickCost: 1 };
        const names = ids.map(id => world.items[id]?.name).filter((n) => !!n);
        return { handled: true, output: [`You can see: ${joinList(names)}.`], tickCost: 1 };
    }
    return handleExamine(world, state, cmd);
}
// --- INVENTORY ----------------------------------------------------------
export function handleInventory(world, state, _cmd) {
    // Hidden items (e.g. datapad sub-documents) are in scope but don't display.
    const visible = state.inventory.filter(id => !world.items[id]?.hidden);
    if (visible.length === 0) {
        return { handled: true, output: ["You are carrying nothing."], tickCost: 0.1 };
    }
    const names = visible.map(id => world.items[id]?.name ?? id);
    return { handled: true, output: [`You are carrying: ${joinList(names)}.`], tickCost: 0.1 };
}
// --- TAKE / DROP --------------------------------------------------------
export function handleTake(world, state, cmd) {
    if (!cmd.noun)
        return { handled: true, output: ["Take what?"], tickCost: 0, free: true };
    // "take all" / "take everything" — pick up every takeable item in the room.
    const noun = cmd.noun.trim().toLowerCase();
    if (noun === "all" || noun === "everything") {
        return handleTakeAll(world, state);
    }
    // Only items currently in the room are takeable.
    const it = findBestItemMatch(world, itemsInRoom(state, state.currentRoom), cmd.noun);
    if (it) {
        if (!it.takeable) {
            return { handled: true, output: [`You can't take the ${it.name}.`], tickCost: 1 };
        }
        takeItemToInventory(state, it.id);
        if (it.onTake)
            it.onTake(state);
        return { handled: true, output: [`Taken: ${it.name}.`], tickCost: 1 };
    }
    // Already carrying it?
    if (findItemInScope(world, state, cmd.noun)) {
        return { handled: true, output: ["You already have it."], tickCost: 0, free: true };
    }
    return { handled: true, output: [`There is no ${cmd.noun} here.`], tickCost: 0, free: true };
}
/**
 * "take all" / "take everything" — pick up every takeable item in the room.
 * One command, one turn, regardless of how many items are picked up.
 * Fixed items are mentioned separately so the player knows what was left.
 * An empty room is free (no turn, no tick).
 */
function handleTakeAll(world, state) {
    const ids = itemsInRoom(state, state.currentRoom);
    if (ids.length === 0) {
        return { handled: true, output: ["There is nothing here to take."], tickCost: 0, free: true };
    }
    const taken = [];
    const refused = [];
    for (const id of ids) {
        const it = world.items[id];
        if (!it)
            continue;
        // Hidden items (sub-documents of a parent item) are never swept up by
        // "take all" — they travel with their parent (e.g. the datapad's onTake).
        if (it.hidden)
            continue;
        if (!it.takeable) {
            refused.push(it.name);
            continue;
        }
        takeItemToInventory(state, id);
        if (it.onTake)
            it.onTake(state);
        taken.push(it.name);
    }
    // Nothing actually takeable: free action; just explain.
    if (taken.length === 0) {
        const detail = refused.length > 0
            ? `You can't take: ${joinList(refused)}.`
            : "There is nothing here you can take.";
        return { handled: true, output: [detail], tickCost: 0, free: true };
    }
    // At least one thing taken: one turn, list everything that happened.
    const out = [`Taken: ${joinList(taken)}.`];
    if (refused.length > 0)
        out.push(`You can't take: ${joinList(refused)}.`);
    return { handled: true, output: out, tickCost: 1 };
}
export function handleDrop(world, state, cmd) {
    if (!cmd.noun)
        return { handled: true, output: ["Drop what?"], tickCost: 0, free: true };
    const it = findBestItemMatch(world, state.inventory, cmd.noun);
    if (!it) {
        return { handled: true, output: [`You aren't carrying any ${cmd.noun}.`], tickCost: 0, free: true };
    }
    // Some items can't be dropped (e.g. the datapad). Refuse, but charge no time.
    if (it.droppable === false) {
        return { handled: true, output: [`You decide to keep the ${it.name}.`], tickCost: 0, free: true };
    }
    placeItemInRoom(state, it.id, state.currentRoom);
    const out = [`Dropped: ${it.name}.`];
    if (world.onDrop) {
        const extra = world.onDrop(state, it.id, state.currentRoom);
        if (extra !== undefined)
            out.push(...(Array.isArray(extra) ? extra : [extra]));
    }
    return { handled: true, output: out, tickCost: 1 };
}
// --- USE / GIVE ---------------------------------------------------------
export function handleUse(world, state, cmd) {
    return handleUseLike(world, state, cmd, "use");
}
/**
 * `tap X on Y` — semantically identical to `use X on Y` but with phrasing
 * that mirrors the verb the player typed (e.g. "Tap your ID on what?").
 */
export function handleTap(world, state, cmd) {
    return handleUseLike(world, state, cmd, "tap");
}
function handleUseLike(world, state, cmd, verbWord) {
    const cap = verbWord === "use" ? "Use" : "Tap";
    if (!cmd.noun)
        return { handled: true, output: [`${cap} what?`], tickCost: 0, free: true };
    const item = findItemInScope(world, state, cmd.noun);
    if (!item)
        return { handled: true, output: [`You don't have a ${cmd.noun}.`], tickCost: 0, free: true };
    if (cmd.preposition && cmd.noun2) {
        const target = findItemInScope(world, state, cmd.noun2);
        if (!target) {
            return { handled: true, output: [`There is no ${cmd.noun2} here.`], tickCost: 0, free: true };
        }
        const fn = item.onUseWith?.[target.id];
        if (!fn) {
            const verbPhrase = verbWord === "tap" ? "Tapping" : "Using";
            return { handled: true, output: [`${verbPhrase} the ${item.name} on the ${target.name} achieves nothing.`], tickCost: 1 };
        }
        return resultFromItemAction(fn(state));
    }
    // `use <reader>` / `tap <reader>` with no target: if the thing is an ID
    // reader (defines onScan), presenting your ID to it is the obvious intent.
    // Fire its scan, the same as the `scan` verb would. (Content-agnostic — the
    // handler decides what scanning does.)
    if (item.onScan) {
        return resultFromItemAction(item.onScan(state));
    }
    const phrase = verbWord === "tap"
        ? `${cap} your ${item.name} on what?`
        : `You'll need to say what to use the ${item.name} on.`;
    return { handled: true, output: [phrase], tickCost: 0, free: true };
}
export function handleGive(world, state, cmd) {
    if (!cmd.noun || !cmd.noun2) {
        return { handled: true, output: ["Give what to whom?"], tickCost: 0, free: true };
    }
    const item = findItemInScope(world, state, cmd.noun);
    if (!item)
        return { handled: true, output: [`You don't have a ${cmd.noun}.`], tickCost: 0, free: true };
    const npc = findNpcInScope(world, state, cmd.noun2);
    if (!npc)
        return { handled: true, output: [`There is no ${cmd.noun2} here.`], tickCost: 0, free: true };
    return { handled: true, output: [`${npc.name} declines the ${item.name}.`], tickCost: 1 };
}
// --- PUSH / PULL / SHOVE ------------------------------------------------
/**
 * Generic "push <item>" handler. Items that define an `onPush` callback
 * handle their own response (and may emit text); items that don't are
 * declared unpushable.
 *
 * Only objects in the room are pushable; you can't push something you're
 * carrying in your hand.
 */
export function handlePush(world, state, cmd) {
    if (!cmd.noun)
        return { handled: true, output: ["Push what?"], tickCost: 0, free: true };
    // Search the room only (not inventory).
    const target = findBestItemMatch(world, itemsInRoom(state, state.currentRoom), cmd.noun);
    if (!target) {
        // If they're holding it, give a clearer message.
        if (findItemInScope(world, state, cmd.noun)) {
            return { handled: true, output: [`You'd have to put the ${cmd.noun} down first.`], tickCost: 0, free: true };
        }
        return { handled: true, output: [`There is no ${cmd.noun} here.`], tickCost: 0, free: true };
    }
    if (!target.onPush) {
        return { handled: true, output: [`The ${target.name} won't budge.`], tickCost: 1 };
    }
    return resultFromItemAction(target.onPush(state));
}
// --- OPEN / CLOSE -------------------------------------------------------
/**
 * `open <item>` (also `flip`, `lift`) and `close <item>` (also `shut`).
 * Items must opt in via onOpen / onClose; without the hook the engine
 * reports the item as un-openable. Search scope is room + inventory
 * (you can open a notebook you're carrying).
 */
export function handleOpen(world, state, cmd) {
    return handleOpenClose(world, state, cmd, "open");
}
export function handleClose(world, state, cmd) {
    return handleOpenClose(world, state, cmd, "close");
}
function handleOpenClose(world, state, cmd, which) {
    if (!cmd.noun) {
        const cap = which === "open" ? "Open" : "Close";
        return { handled: true, output: [`${cap} what?`], tickCost: 0, free: true };
    }
    const target = findItemInScope(world, state, cmd.noun);
    if (!target) {
        return { handled: true, output: [`There is no ${cmd.noun} here.`], tickCost: 0, free: true };
    }
    const fn = which === "open" ? target.onOpen : target.onClose;
    if (!fn) {
        const msg = which === "open"
            ? `The ${target.name} doesn't open.`
            : `The ${target.name} isn't something you can close.`;
        return { handled: true, output: [msg], tickCost: 1 };
    }
    return resultFromItemAction(fn(state));
}
// --- TALK / ASK ---------------------------------------------------------
export function handleTalk(world, state, cmd) {
    if (!cmd.noun)
        return { handled: true, output: ["Talk to whom?"], tickCost: 0, free: true };
    // "talk to X about Y" is natural phrasing for "ask X about Y" — route it there
    // so the topic actually resolves instead of being treated as part of the name.
    if (cmd.noun2)
        return handleAsk(world, state, cmd);
    const npc = findNpcInScope(world, state, cmd.noun);
    if (!npc)
        return { handled: true, output: [`There is no ${cmd.noun} here.`], tickCost: 0, free: true };
    // If onTalk returns text, use it as the NPC's spoken response; otherwise
    // fall back to the engine's default opener.
    if (npc.onTalk) {
        const result = npc.onTalk(state);
        if (result !== undefined)
            return resultFromItemAction(result);
    }
    const opener = npc.topics
        ? `${npc.name} acknowledges you. Try: ask ${npc.name.split(/\s+/)[0]?.toLowerCase()} about <topic>.`
        : `${npc.name} nods, but says nothing of substance.`;
    return { handled: true, output: [opener], tickCost: 1 };
}
export function handleAsk(world, state, cmd) {
    if (!cmd.noun || !cmd.noun2) {
        return { handled: true, output: ["Ask whom about what?"], tickCost: 0, free: true };
    }
    const npc = findNpcInScope(world, state, cmd.noun);
    if (!npc)
        return { handled: true, output: [`There is no ${cmd.noun} here.`], tickCost: 0, free: true };
    const topicKey = cmd.noun2.toLowerCase();
    const topic = npc.topics?.[topicKey];
    if (topic === undefined) {
        const fallback = npc.unknownTopic ?? `${npc.name} shrugs. "Couldn't tell you."`;
        return { handled: true, output: [fallback], tickCost: 1 };
    }
    const text = typeof topic === "function" ? topic(state) : topic;
    return { handled: true, output: [text], tickCost: 1 };
}
// --- BUY ----------------------------------------------------------------
export function handleBuy(world, state, cmd) {
    if (!cmd.noun)
        return { handled: true, output: ["Buy what?"], tickCost: 0, free: true };
    // Default behaviour: pass through to NPC topic "buy <noun>" if an NPC is present.
    const r = room(world, state);
    if (!r)
        return { handled: true, output: ["There is nowhere to buy anything."], tickCost: 0, free: true };
    for (const id of npcsInRoom(world, state, r.id)) {
        const npc = world.npcs[id];
        if (!npc)
            continue;
        const t = npc.topics?.[`buy ${cmd.noun.toLowerCase()}`];
        if (t !== undefined) {
            const text = typeof t === "function" ? t(state) : t;
            return { handled: true, output: [text], tickCost: 1 };
        }
    }
    return { handled: true, output: [`There is no ${cmd.noun} for sale here.`], tickCost: 0, free: true };
}
