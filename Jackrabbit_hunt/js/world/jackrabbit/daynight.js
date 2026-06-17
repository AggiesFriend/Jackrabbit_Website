// A one-line announcement when Horizon rolls between day and night, so the cycle
// is visible in the main output (it drives Burke's hours, the bars, the night
// shipyard, etc.). Folded into World.onTick. Only speaks once the PC is actually
// on the station — the pre-Horizon shuttle/liner don't have "station lights".
import { HOOK_ARRIVED_HORIZON } from "./flags.js";
const LAST_PHASE = "__last_day_phase";
export function dayNightTick(s) {
    if (s.dead || s.ended)
        return;
    if (!s.scoreHooks.has(HOOK_ARRIVED_HORIZON))
        return; // only on-station
    const now = s.isDaytime ? "day" : "night";
    const last = s.flags[LAST_PHASE];
    if (last !== "day" && last !== "night") {
        s.flags[LAST_PHASE] = now; // first on-station tick: just record, don't announce
        return;
    }
    if (last === now)
        return;
    s.flags[LAST_PHASE] = now;
    return s.isDaytime
        ? "The station's lighting warms and brightens by slow degrees around you — Horizon is rolling into its day."
        : "The station's lighting dims and cools by slow degrees around you — Horizon is settling into its night.";
}
