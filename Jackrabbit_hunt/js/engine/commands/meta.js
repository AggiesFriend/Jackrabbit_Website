// Meta verbs: score, time, help, notes, save, load, restart, quit.
// Spec §4.4, §4.11, §4.12.
import { phaseLabel } from "../time.js";
import { renderNotes, addNote } from "../notes.js";
// SAVE / LOAD / EXPORT / IMPORT live in save-slots.ts (the ten-slot picker +
// portable file I/O). Re-exported here so the engine's verb table and the world
// `load` router keep importing them from one place.
export { handleSave, handleLoad, handleExport, handleImport } from "./save-slots.js";
export function handleScore(_world, state, _cmd) {
    return {
        handled: true,
        tickCost: 0,
        free: true,
        output: [
            `Score: ${state.score} of a possible ${state.maxScore}. (${state.turns} turn${state.turns === 1 ? "" : "s"} taken.)`,
        ],
    };
}
export function handleTime(_world, state, _cmd) {
    return {
        handled: true,
        tickCost: 0,
        free: true,
        output: [`${phaseLabel(state)}. (Tick ${state.ticks}.)`],
    };
}
export function handleHelp(world, _state, _cmd) {
    const text = world.helpText ?? defaultHelp();
    return { handled: true, tickCost: 0, free: true, output: [text] };
}
export function handleNotes(_world, state, _cmd) {
    return { handled: true, tickCost: 0.1, output: renderNotes(state) };
}
/**
 * ADD NOTE <text>  (also JOT <text>) — the player writes their own entry into
 * the notepad/notes, stamped with the current tick (the timestamp `renderNotes`
 * shows as `[tick N]`). Free: organising your thoughts never costs a turn or
 * nudges a timed event. Content-agnostic; appends to the engine notes system
 * with source "You", so it surfaces in `notes` and any in-world notepad alike.
 */
export function handleAddNote(_world, state, cmd) {
    const text = noteTextFromCommand(cmd);
    if (!text) {
        return {
            handled: true,
            tickCost: 0,
            free: true,
            output: ["Add what? Try ADD NOTE followed by what you want to remember — e.g. ADD NOTE meet Burke after dark."],
        };
    }
    const seqRaw = state.flags["__playerNoteSeq"];
    const seq = typeof seqRaw === "number" ? seqRaw : 0;
    state.flags["__playerNoteSeq"] = seq + 1;
    addNote(state, { id: `player_note_${seq}`, source: "You", text, reliable: true });
    return {
        handled: true,
        tickCost: 0,
        free: true,
        output: [`Noted. (Tick ${state.ticks}.)`],
    };
}
/** Pull the free-text body out of an ADD NOTE / JOT command, keeping the
 *  player's original capitalisation (`cmd.raw` is lower-cased). Drops the verb
 *  word and a redundant leading "note"/"notes"/"entry" keyword. */
function noteTextFromCommand(cmd) {
    const src = (cmd.original ?? cmd.raw ?? "").trim();
    const afterVerb = src.replace(/^\S+\s*/, ""); // drop "add" / "jot"
    return afterVerb.replace(/^(note|notes|entry)\b[\s:]*/i, "").trim();
}
export function handleRestart(_world, state, _cmd) {
    state.flags["__pendingRestart"] = true;
    return { handled: true, tickCost: 0, free: true, output: ["Restarting..."] };
}
export function handleQuit(world, state, _cmd) {
    state.ended = true;
    // Prefer a world-defined "quit" ending so authors can give quitting
    // narrative weight (and an opportunity to link out). Fall back to a
    // sentinel + a generic farewell line if no such ending exists.
    if (!state.endingId) {
        state.endingId = world.endings?.["quit"] ? "quit" : "__quit";
    }
    const hasNarrative = state.endingId !== "__quit";
    return {
        handled: true,
        tickCost: 0,
        free: true,
        output: hasNarrative ? [] : ["You walk away from the game."],
    };
}
function defaultHelp() {
    return [
        "Commands: look (l), examine (x) <thing>, take/get <thing> (or 'take all'),",
        "          drop <thing>, push/pull/shove <thing>,",
        "          inventory (i), use <a> on <b>, talk to <npc>, ask <npc> about <topic>,",
        "          buy <thing>, read <thing>, search [thing], give <thing> to <npc>.",
        "Movement: n/s/e/w, up, down, in, out, go <direction>.",
        "Time:     wait, wait <N>, wait until morning, wait until night.",
        "Meta:     score, time, notes, add note <text>, help, save, load, restart, quit.",
        "Saves:    save / load open a 10-slot picker; export / import carry a game",
        "          to another browser as a portable file.",
        "",
        "Time advances each turn. Free verbs (score/time/help) don't cost a turn.",
    ].join("\n");
}
