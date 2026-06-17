// Tick system, fractional-rounding rules, and day/night cycle. Spec §4.3.
const listeners = [];
export function onPhaseChange(fn) {
    listeners.push(fn);
}
/**
 * Advance time by `n` ticks. Recomputes day/night and fires listeners on
 * phase transitions.
 */
export function advanceTime(state, n) {
    if (n <= 0)
        return;
    const wasDay = state.isDaytime;
    state.ticks += n;
    state.isDaytime = computeIsDaytime(state.ticks, state.dayLength);
    if (state.isDaytime !== wasDay) {
        for (const fn of listeners)
            fn(state, state.isDaytime ? "day" : "night");
    }
}
/**
 * 0 .. dayLength = day; dayLength .. 2*dayLength = night; repeat.
 */
export function computeIsDaytime(ticks, dayLength) {
    if (dayLength <= 0)
        return true;
    const fullCycle = dayLength * 2;
    const t = ((ticks % fullCycle) + fullCycle) % fullCycle;
    return t < dayLength;
}
/**
 * Given the engine's command-result tick cost, apply the hybrid model.
 *
 *  - cost === 0: free; no time advance, no fractional flush, no turn.
 *  - cost  <  1: fractional; accumulate; no turn.
 *  - cost  >= 1: standard / variable; ceil any pending fractional, add,
 *                advance time, increment `turns` (unless `free` is set).
 *
 * Returns the number of ticks actually advanced (for logging/debug).
 */
export function applyTickCost(state, cost, options = {}) {
    if (cost <= 0)
        return 0;
    if (cost < 1) {
        state.pendingFractional += cost;
        return 0;
    }
    const bonus = Math.ceil(state.pendingFractional);
    state.pendingFractional = 0;
    const total = cost + bonus;
    advanceTime(state, total);
    if (!options.free)
        state.turns += 1;
    return total;
}
/** Helpers for `wait until morning/night`. */
export function ticksUntilPhaseChange(state, target) {
    const dayLength = state.dayLength;
    if (dayLength <= 0)
        return 0;
    const fullCycle = dayLength * 2;
    const t = ((state.ticks % fullCycle) + fullCycle) % fullCycle;
    if (target === "day") {
        // We want next tick where computeIsDaytime is true and was false.
        if (t < dayLength) {
            // currently day; wait through remainder of day + a full night to next day
            return (dayLength - t) + dayLength;
        }
        return fullCycle - t; // currently night; wait to its end
    }
    else {
        if (t < dayLength)
            return dayLength - t; // currently day; wait to night
        return (fullCycle - t) + dayLength; // currently night; wait to next night
    }
}
/** Human-friendly label for the header bar. */
export function phaseLabel(state) {
    return state.isDaytime ? "Daytime" : "Nighttime";
}
