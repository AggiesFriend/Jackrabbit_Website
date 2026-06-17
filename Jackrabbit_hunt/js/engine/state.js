// GameState factory and persistence (localStorage). Spec §4.7.
import { seedItemLocations } from "./items.js";
const SAVE_KEY = "jackrabbit-save-1";
const SAVE_VERSION = 1;
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
/** Returns true on success. */
export function saveState(state) {
    try {
        const payload = {
            version: SAVE_VERSION,
            savedAt: Date.now(),
            state: {
                ...state,
                scoreHooks: Array.from(state.scoreHooks),
            },
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
        return true;
    }
    catch {
        return false;
    }
}
/** Returns the loaded state, or null if absent / unreadable / version mismatch. */
export function loadState() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== SAVE_VERSION)
            return null;
        const s = parsed.state;
        return {
            ...s,
            scoreHooks: new Set(s.scoreHooks ?? []),
            // Older saves predate dynamic NPC positions; default to empty.
            npcLocations: s.npcLocations ?? {},
        };
    }
    catch {
        return null;
    }
}
export function hasSave() {
    try {
        return localStorage.getItem(SAVE_KEY) !== null;
    }
    catch {
        return false;
    }
}
export function clearSave() {
    try {
        localStorage.removeItem(SAVE_KEY);
    }
    catch { /* noop */ }
}
