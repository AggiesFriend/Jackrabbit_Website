// A generic point-to-point transit network: named STOPS joined by vehicles that
// take a few turns to ride between them. The game dresses this up as the
// "TravelTube" (mag-lev pods summoned by ID scan) — but nothing here is
// Jackrabbit-specific, so the mechanism gets a story-neutral name and the
// flavour ("TravelTube", "pod") stays in horizon.ts. A kit-candidate alongside
// router.ts / economy.ts / world-builder.ts.
//
// THE MODEL. The network is a flat set of stops, each at an abstract position
// `pos` on a line; ride time between two stops is clamp(|posA - posB|, 2, 8)
// turns, with optional per-pair overrides for routes whose pacing the geometry
// gets wrong. Stops are REGISTERED (mirroring lifts.ts), so each area declares
// its own stop instead of editing one central list. Selection is by fuzzy name
// match (matchDestination), ranked so a specific query beats a generic one.
const STOPS = {};
const RIDE_OVERRIDES = {};
function pairKey(a, b) {
    return [a, b].sort().join("|");
}
/** Register a stop on the network (idempotent by room id). */
export function registerTransitStop(stop) {
    STOPS[stop.room] = stop;
}
/** Register several stops at once. */
export function registerTransitStops(stops) {
    stops.forEach(registerTransitStop);
}
/**
 * Override the ride time between two stops (direction-agnostic), for a journey
 * whose pacing the `pos` geometry gets wrong — expressed by the network rather
 * than the abstract line (e.g. a well-used express run).
 */
export function registerRideOverride(a, b, ticks) {
    RIDE_OVERRIDES[pairKey(a, b)] = ticks;
}
export function isTransitStop(roomId) {
    return roomId in STOPS;
}
export function transitStop(roomId) {
    return STOPS[roomId];
}
/** Every stop's room id (used by tooling / the map exporter). */
export function transitStopRooms() {
    return Object.values(STOPS).map((s) => s.room);
}
/** Ride time, in ticks, between two stops: a per-pair override if set, else
 *  clamp(|posA - posB|, 2, 8). */
export function rideTicks(fromRoom, toRoom) {
    const override = RIDE_OVERRIDES[pairKey(fromRoom, toRoom)];
    if (override !== undefined)
        return override;
    const a = STOPS[fromRoom]?.pos ?? 0;
    const b = STOPS[toRoom]?.pos ?? 0;
    return Math.max(2, Math.min(8, Math.abs(a - b)));
}
/** Resolve a typed destination to a stop, excluding the origin. RANKED so a more
 *  specific query beats a generic stop-name: an exact or prefix match always wins
 *  over a name that is merely a substring of the query. (Without this, "ent 2"
 *  could reverse-match Zone 1's generic "entertainment" and the wrong stop wins.) */
export function matchDestination(noun, originRoom) {
    const n = noun.trim().toLowerCase();
    if (!n)
        return undefined;
    let best;
    let bestScore = 0;
    for (const stop of Object.values(STOPS)) {
        if (stop.room === originRoom)
            continue;
        let score = 0;
        for (const name of stop.names) {
            let s = 0;
            if (name === n)
                s = 100 + name.length; // exact
            else if (name.startsWith(n))
                s = 60 + n.length; // typed a prefix ("blue" -> "blue sector")
            else if (name.includes(n))
                s = 40 + n.length; // typed a substring
            else if (n.includes(name))
                s = 20 + name.length; // name is a substring of the query (generic - weakest)
            if (s > score)
                score = s;
        }
        if (score > bestScore) {
            bestScore = score;
            best = stop;
        }
    }
    return bestScore > 0 ? best : undefined;
}
/** Stops selectable from a given origin (for the in-pod touchscreen list). */
export function destinationsFrom(originRoom) {
    return Object.values(STOPS).filter((s) => s.room !== originRoom);
}
