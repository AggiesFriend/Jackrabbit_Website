// The save system's player-facing verbs: SAVE / LOAD (a guided ten-slot picker)
// and EXPORT / IMPORT (a portable file the player can carry between browsers).
//
// SAVE and LOAD open an interactive modal (the engine's modal stack) rather than
// acting immediately: SAVE lists the slots, takes a slot number, confirms an
// overwrite, then takes a name; LOAD lists the slots and takes a number. EXPORT
// and IMPORT can't touch the DOM from here (the engine is DOM-free), so they set
// a transient pending flag the engine turns into a UI callback — the same
// indirection the casino uses for its slot-machine animation.
import { requestPushModal } from "../authoring.js";
import { SAVE_SLOT_COUNT, listSlots, slotSummary, saveToSlot, loadFromSlot, serializeState, } from "../state.js";
// --- small helpers -------------------------------------------------------
const CANCEL_WORDS = new Set(["cancel", "c", "q", "quit", "back", "exit"]);
function parseSlot(t) {
    if (!/^\d+$/.test(t))
        return null;
    const n = parseInt(t, 10);
    return n >= 1 && n <= SAVE_SLOT_COUNT ? n : null;
}
function relTime(ts) {
    if (!ts)
        return "—";
    const ms = Date.now() - ts;
    const min = Math.floor(ms / 60000);
    if (min < 1)
        return "just now";
    if (min < 60)
        return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24)
        return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
}
function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "save";
}
/** The numbered slot list, shared by both pickers. */
function renderSlotList(header) {
    const lines = [header];
    const slots = listSlots();
    for (let i = 0; i < slots.length; i++) {
        const n = i + 1;
        const sum = slots[i];
        if (!sum) {
            lines.push(`  ${n}. (empty)`);
        }
        else {
            lines.push(`  ${n}. ${sum.name} — ${sum.locationName} — ${sum.score}pts/${sum.turns}t — ${relTime(sum.savedAt)}`);
        }
    }
    return lines;
}
function currentLocationName(world, state) {
    return world.rooms[state.currentRoom]?.name ?? "Unknown location";
}
// --- SAVE picker ---------------------------------------------------------
const SAVE_HEADER = "Save to which slot? (1–10, or CANCEL)";
/** Multi-step SAVE modal: slot → [overwrite confirm] → name. */
function saveModal(world, state) {
    let step = "slot";
    let chosen = 0;
    const here = currentLocationName(world, state);
    return {
        persistAfterEnd: true,
        onEnter: () => renderSlotList(SAVE_HEADER),
        onInput: (line, s) => {
            const t = line.trim().toLowerCase();
            // The NAME step takes an arbitrary string (empty = default to location).
            if (step === "name") {
                if (CANCEL_WORDS.has(t))
                    return { output: ["Save cancelled."], pop: true };
                const name = line.trim() || here;
                const ok = saveToSlot(chosen, name, here, s);
                return {
                    output: [ok ? `Saved to slot ${chosen}: "${name}".` : "Could not save — is browser storage available?"],
                    pop: true,
                };
            }
            if (t === "" || CANCEL_WORDS.has(t))
                return { output: ["Save cancelled."], pop: true };
            if (step === "slot") {
                const n = parseSlot(t);
                if (n === null)
                    return { output: ["Pick a slot from 1 to 10, or CANCEL."] };
                chosen = n;
                const existing = slotSummary(n);
                if (existing) {
                    step = "confirm";
                    return {
                        output: [`Slot ${n} holds "${existing.name}" (${existing.locationName}, ${existing.score}pts/${existing.turns}t). Overwrite? (y/n)`],
                    };
                }
                step = "name";
                return { output: ["Name this save:"] };
            }
            // step === "confirm"
            if (t === "y" || t === "yes") {
                step = "name";
                return { output: ["Name this save:"] };
            }
            if (t === "n" || t === "no") {
                step = "slot";
                return { output: renderSlotList(SAVE_HEADER) };
            }
            return { output: ["Please answer y or n (or CANCEL)."] };
        },
    };
}
// --- LOAD picker ---------------------------------------------------------
const LOAD_HEADER = "Load which slot? (1–10, or CANCEL)";
function loadModal() {
    return {
        persistAfterEnd: true,
        onEnter: () => renderSlotList(LOAD_HEADER),
        onInput: (line, s) => {
            const t = line.trim().toLowerCase();
            if (t === "" || CANCEL_WORDS.has(t))
                return { output: ["Load cancelled."], pop: true };
            const n = parseSlot(t);
            if (n === null)
                return { output: ["Pick a slot from 1 to 10, or CANCEL."] };
            const loaded = loadFromSlot(n);
            if (!loaded)
                return { output: [`Slot ${n} is empty — pick another, or CANCEL.`] };
            const summary = slotSummary(n);
            // Hand the snapshot to the engine's pending-load swap (which runs onLoad).
            s.flags["__pendingLoad"] = loaded;
            return { output: [`Game loaded: "${summary?.name ?? `slot ${n}`}".`], pop: true };
        },
    };
}
// --- The four verbs ------------------------------------------------------
/** SAVE — opens the guided slot picker. */
export const handleSave = (world, state, _cmd) => {
    requestPushModal(state, saveModal(world, state));
    return { handled: true, tickCost: 0, free: true };
};
/** LOAD — opens the guided slot picker (the world `load` router delegates here
 *  for a bare LOAD; the casino's LOAD 50 / load datacard never reach this). */
export const handleLoad = (_world, state, _cmd) => {
    requestPushModal(state, loadModal());
    return { handled: true, tickCost: 0, free: true };
};
/** EXPORT — download the current game as a portable .jrsave file. */
export const handleExport = (world, state, _cmd) => {
    const here = currentLocationName(world, state);
    const json = serializeState(state, here, here);
    const filename = `jackrabbit-${sanitizeFilename(here)}.jrsave`;
    // The engine turns this into a UI download (no-op when no UI is wired).
    state.flags["__pendingExport"] = { filename, json };
    return {
        handled: true, tickCost: 0, free: true,
        output: [`Exported "${filename}" — carry it to any browser and IMPORT it there to pick up where you left off.`],
    };
};
/** IMPORT — open a file picker and resume the game it holds. */
export const handleImport = (_world, state, _cmd) => {
    state.flags["__pendingImport"] = true;
    return {
        handled: true, tickCost: 0, free: true,
        output: ["Choose a .jrsave file to import…"],
    };
};
