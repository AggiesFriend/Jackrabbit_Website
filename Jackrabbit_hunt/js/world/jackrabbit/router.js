// Room-keyed command routing — a small, content-agnostic dispatcher that lets a
// single verb (BUY, LOAD, …) be handled by whichever module owns the current
// room, instead of one growing hand-maintained if-chain in index.ts.
//
// THE PROBLEM IT SOLVES. Several verbs mean different things in different rooms:
// BUY at Burke's bench sells software, at a bar sells a drink, at a food stall
// sells food, at a non-food shop gives a wares reply. Each commercial module
// already owns a handler + a "is this my room?" predicate; what was missing was
// a way to compose them WITHOUT index.ts importing every predicate and growing a
// new `if` per area (and a parallel regex-router for LOAD). With a route
// registry each module exports its own `CommandRoute`, and index.ts just lists
// them in priority order — adding a vendor no longer edits the dispatch logic.
//
// This is a game-layer convenience built only on engine types (like buildArea /
// makePursuer): the engine knows nothing about it, and nothing here knows about
// Jackrabbit. It is a candidate to migrate into a shared `kit/` layer if/when a
// second world wants it.
/**
 * Build a CommandHandler that dispatches to the FIRST matching route (highest
 * priority first, then the order they were listed), falling back to `fallback`
 * when none match. With `fallback` omitted, an unmatched call returns
 * `{ handled: false }` so the engine treats the verb as unknown.
 *
 * Routes are ordered once, at build time (the registry is static).
 */
export function routeCommand(routes, fallback) {
    const ordered = routes
        .map((route, i) => ({ route, i }))
        .sort((a, b) => (b.route.priority ?? 0) - (a.route.priority ?? 0) || a.i - b.i)
        .map((x) => x.route);
    return (world, state, cmd) => {
        for (const { match, handler } of ordered) {
            if (match(state, cmd))
                return handler(world, state, cmd);
        }
        return fallback ? fallback(world, state, cmd) : { handled: false };
    };
}
