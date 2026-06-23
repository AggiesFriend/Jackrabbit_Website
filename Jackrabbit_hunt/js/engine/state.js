// GameState factory and persistence (localStorage). Spec §4.7.
//
// Persistence model: TEN named save slots (`jackrabbit-save-slot-1..10`), each a
// self-describing envelope (version, name, location, timestamp + the state). The
// same envelope format is what EXPORT writes to a portable file and IMPORT reads
// back, so a save carries cleanly between browsers. A legacy single-slot save
// (`jackrabbit-save-1`, the old scheme) is migrated into slot 1 on first access.
import { seedItemLocations } from "./items.js";
const SAVE_VERSION = 1;
const LEGACY_KEY = "jackrabbit-save-1";
const SLOT_KEY_PREFIX = "jackrabbit-save-slot-";
export const SAVE_SLOT_COUNT = 10;
// Engine-internal pending-queue sentinels. These are consumed within the turn
// that sets them and must NEVER be persisted — a saved `__pendingLoad` would
// embed an entire nested state. Durable `__`-flags (e.g. `__playerNoteSeq`) are
// deliberately NOT listed here, so they round-trip like any other flag.
const TRANSIENT_FLAGS = new Set([
    "__pendingLoad", "__pendingRestart", "__pendingGoto", "__pendingPushModal",
    "__pendingExport", "__pendingImport",
]);
export function createInitialState(world) {
    const init = world.initialState ?? {};
    return {
        currentRoom: world.startRoom,
        roomEnteredAtTick: 0,
        inventory: [],
        itemLocations: seedItemLocations(world),
        npcLocations: {},
        score: 0,
        maxScore: world.maxScore,
        scoreHooks: new Set(),
        notes: [],
        ticks: 0,
        turns: 0,
        pendingFractional: 0,
        dayLength: init.dayLength ?? 100,
        isDaytime: init.isDaytime ?? true,
        flags: { ...(init.flags ?? {}) },
        dead: false,
        ended: false,
    };
}
function slotKey(slot) {
    return `${SLOT_KEY_PREFIX}${slot}`;
}
/** Drop engine-transient flags so they can never be written to a save. */
function sanitiseFlags(flags) {
    const out = {};
    for (const k of Object.keys(flags)) {
        if (!TRANSIENT_FLAGS.has(k))
            out[k] = flags[k];
    }
    return out;
}
/** Build the portable JSON envelope for a state — used by slots AND export. */
export function serializeState(state, name, locationName) {
    const payload = {
        version: SAVE_VERSION,
        savedAt: Date.now(),
        name,
        locationName,
        state: {
            ...state,
            flags: sanitiseFlags(state.flags),
            scoreHooks: Array.from(state.scoreHooks),
        },
    };
    return JSON.stringify(payload);
}
/** Rebuild a live GameState from an envelope (Set + sparse-map back-fills). */
function envelopeToState(env) {
    const s = env.state;
    return {
        ...s,
        flags: sanitiseFlags((s.flags ?? {})),
        scoreHooks: new Set(s.scoreHooks ?? []),
        // Older saves predate dynamic NPC positions; default to empty.
        npcLocations: s.npcLocations ?? {},
    };
}
/** Parse + validate a stored envelope (any key). Null on absent/bad/version. */
function readEnvelope(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== SAVE_VERSION || !parsed.state)
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
/** One-time fold of the old single-slot save into slot 1, then retire the key. */
function migrateLegacy() {
    try {
        if (localStorage.getItem(slotKey(1)))
            return; // slot 1 already in use
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (!legacy)
            return;
        const parsed = JSON.parse(legacy);
        if (!parsed || parsed.version !== SAVE_VERSION) {
            localStorage.removeItem(LEGACY_KEY);
            return;
        }
        parsed.name = parsed.name ?? "Recovered save";
        localStorage.setItem(slotKey(1), JSON.stringify(parsed));
        localStorage.removeItem(LEGACY_KEY);
    }
    catch {
        /* noop — a corrupt legacy key just isn't migrated */
    }
}
/** Write `state` to a slot (1..10) under a player-chosen name. True on success. */
export function saveToSlot(slot, name, locationName, state) {
    try {
        localStorage.setItem(slotKey(slot), serializeState(state, name, locationName));
        return true;
    }
    catch {
        return false;
    }
}
/** Restore the GameState held in a slot, or null if the slot is empty/unreadable. */
export function loadFromSlot(slot) {
    migrateLegacy();
    const env = readEnvelope(slotKey(slot));
    return env ? envelopeToState(env) : null;
}
/** Summarise a slot for the picker, or null if empty. */
export function slotSummary(slot) {
    migrateLegacy();
    const env = readEnvelope(slotKey(slot));
    if (!env)
        return null;
    return {
        slot,
        name: env.name ?? "(unnamed)",
        savedAt: env.savedAt ?? 0,
        locationName: env.locationName ?? "Unknown location",
        score: env.state?.score ?? 0,
        turns: env.state?.turns ?? 0,
    };
}
/** All ten slots' summaries (null for empty), in slot order. */
export function listSlots() {
    migrateLegacy();
    const out = [];
    for (let i = 1; i <= SAVE_SLOT_COUNT; i++)
        out.push(slotSummary(i));
    return out;
}
/** Parse a portable export file's text back into a restorable save (or null). */
export function deserializeSave(text) {
    try {
        const parsed = JSON.parse(text);
        if (!parsed || parsed.version !== SAVE_VERSION || !parsed.state)
            return null;
        return { state: envelopeToState(parsed), name: parsed.name, locationName: parsed.locationName };
    }
    catch {
        return null;
    }
}
export function hasSave() {
    return listSlots().some((s) => s !== null);
}
export function clearSave() {
    try {
        localStorage.removeItem(LEGACY_KEY);
        for (let i = 1; i <= SAVE_SLOT_COUNT; i++)
            localStorage.removeItem(slotKey(i));
    }
    catch {
        /* noop */
    }
}
// --- Legacy single-slot API ---------------------------------------------
// Retained so the engine's direct save/load unit tests (and any helper that
// predates slots) keep working; both map onto slot 1.
export function saveState(state) {
    return saveToSlot(1, "Quick save", undefined, state);
}
export function loadState() {
    return loadFromSlot(1);
}
