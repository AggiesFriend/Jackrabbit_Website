// Output formatting helpers (room descriptions, exit lists, etc.). Spec §4.6.
import { itemsInRoom } from "./items.js";
import { npcsInRoom } from "./npcs.js";
export function describeRoom(world, state, room, mode = "full") {
    const out = [];
    out.push(headingFor(room.name));
    if (mode === "full") {
        const body = typeof room.description === "function"
            ? room.description(state)
            : room.description;
        if (body)
            out.push(body);
    }
    // Items present (read from state, not the world singleton). Hidden items —
    // sub-documents of a parent item, e.g. the documents ON a datapad — stay in
    // scope for commands but are never listed.
    const presentItemIds = itemsInRoom(state, room.id);
    if (presentItemIds.length > 0) {
        const names = presentItemIds
            .filter(id => !world.items[id]?.hidden)
            .map(id => world.items[id]?.name)
            .filter((n) => !!n);
        if (names.length > 0) {
            out.push(`You can see: ${joinList(names)}.`);
        }
    }
    // NPCs present (read dynamic positions, not the static Room.npcs).
    const presentNpcIds = npcsInRoom(world, state, room.id);
    if (presentNpcIds.length > 0) {
        const names = presentNpcIds
            .map(id => world.npcs[id]?.name)
            .filter((n) => !!n);
        if (names.length > 0) {
            // Capitalise the sentence's first letter only — the NPC's stored name
            // stays lowercase (e.g. "the passenger") for mid-sentence uses elsewhere;
            // here it's sentence-initial, so "The passenger is here."
            out.push(capitalizeFirst(`${joinList(names)} ${names.length === 1 ? "is" : "are"} here.`));
        }
    }
    // Exits.
    const exitText = exitList(room, state);
    if (exitText)
        out.push(exitText);
    return out;
}
export function exitList(room, state) {
    const dirs = Object.entries(room.exits)
        .filter(([, def]) => {
        if (!def)
            return false;
        // Virtual exits (no destination) are flavour-only refusals — never
        // advertised. They still work when typed, yielding their gated message.
        if (!def.to)
            return false;
        // Omit exits that opt to hide while their gate is currently refusing.
        if (def.hideWhenGated && def.gated && def.gated(state) !== null)
            return false;
        return true;
    })
        .map(([dir, def]) => def?.description ? `${dir} (${def.description})` : dir);
    if (dirs.length === 0)
        return "There are no obvious exits.";
    return `Exits: ${dirs.join(", ")}.`;
}
/** Uppercase the first character of a rendered sentence (leaves the rest, and
 *  the source data, untouched). */
export function capitalizeFirst(s) {
    return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
export function joinList(items) {
    if (items.length === 0)
        return "";
    if (items.length === 1)
        return items[0];
    if (items.length === 2)
        return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
function headingFor(name) {
    // A simple visual marker — the UI styles ".heading" lines.
    return `<<HEADING>>${name}`;
}
/** True if this line should be styled as a heading by the renderer. */
export function isHeading(line) {
    return line.startsWith("<<HEADING>>");
}
export function stripHeadingMarker(line) {
    return line.startsWith("<<HEADING>>") ? line.slice("<<HEADING>>".length) : line;
}
