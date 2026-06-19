// Engine smoke tests. Run via `npx tsx src/tests/engine.test.ts` or compile-then-node.
// These exercise the spec's load-bearing invariants (§4.3, §4.7, §4.9, §4.13).
//
// No test framework dependency: we throw on failure and print a summary.
import { GameEngine } from "../engine/engine.js";
import { createInitialState, saveState, loadState, clearSave } from "../engine/state.js";
import { applyTickCost, computeIsDaytime } from "../engine/time.js";
import { placeNpcInRoom, nextHopToward, stepNpcToward } from "../engine/npcs.js";
import { makePursuer } from "../world/jackrabbit/pursuit.js";
import { buildAreaFromYaml } from "../world/jackrabbit/area.js";
import { liftDefFromYaml } from "../world/jackrabbit/lifts.js";
import { shipyardRooms } from "../world/jackrabbit/shipyard.js";
import { awardScore } from "../engine/scoring.js";
import { parse } from "../engine/parser.js";
import { addNote } from "../engine/notes.js";
import { parseLinks } from "../engine/links.js";
import { aliasedTopics, requestSceneTransition, requestPushModal } from "../engine/authoring.js";
import { testWorld } from "../world/test-world.js";
import { jackrabbitWorld } from "../world/jackrabbit/index.js";
import { referRajahToResidence, STUPID } from "../world/jackrabbit/lcd_npcs.js";
import { rollOutcome, SPIN_STAKE, CASINO_ROOM } from "../world/jackrabbit/gambling.js";
import { balance, canAfford, charge, credit } from "../world/jackrabbit/economy.js";
import { assembleParts } from "../world/jackrabbit/world-builder.js";
import { isTransitStop } from "../world/jackrabbit/transit.js";
import { isLiftRoom } from "../world/jackrabbit/lifts.js";
import { InputHistory } from "../ui/history.js";
import { FLAG_BRIEFING_COMPLETE, FLAG_FORM_COMPLETE, FLAG_PC_ALIAS, FLAG_PC_PROFESSION, FLAG_PC_REAL_NAME, FLAG_CREDITS, } from "../world/jackrabbit/flags.js";
const _ls = {};
globalThis.localStorage = {
    getItem: (k) => (k in _ls ? _ls[k] : null),
    setItem: (k, v) => { _ls[k] = v; },
    removeItem: (k) => { delete _ls[k]; },
    clear: () => { for (const k of Object.keys(_ls))
        delete _ls[k]; },
    key: (i) => Object.keys(_ls)[i] ?? null,
    get length() { return Object.keys(_ls).length; },
};
// --- harness ------------------------------------------------------------
const captured = [];
const headerLog = [];
function makeEngine() {
    captured.length = 0;
    headerLog.length = 0;
    const engine = new GameEngine(testWorld, {
        render: (lines, opts) => captured.push({ lines, kind: opts?.kind }),
        updateHeader: (_s, location, alias) => headerLog.push({ location, ...(alias !== undefined ? { alias } : {}) }),
    });
    return engine;
}
/** Engine bound to an arbitrary world (used by per-feature mini-worlds). */
function makeEngineFrom(world) {
    captured.length = 0;
    headerLog.length = 0;
    const engine = new GameEngine(world, {
        render: (lines, opts) => captured.push({ lines, kind: opts?.kind }),
        updateHeader: (_s, location, alias) => headerLog.push({ location, ...(alias !== undefined ? { alias } : {}) }),
    });
    return engine;
}
/**
 * Build a minimal World from a partial spec — fills in mandatory fields with
 * sensible defaults so tests don't need to repeat boilerplate. The first room
 * in `rooms` becomes the start room unless overridden.
 */
function miniWorld(partial) {
    const firstRoomId = Object.keys(partial.rooms)[0];
    if (!firstRoomId)
        throw new Error("miniWorld: at least one room required");
    return {
        title: partial.title ?? "Test",
        startRoom: partial.startRoom ?? firstRoomId,
        rooms: partial.rooms,
        items: partial.items ?? {},
        npcs: partial.npcs ?? {},
        maxScore: partial.maxScore ?? 0,
        ...(partial.commands ? { commands: partial.commands } : {}),
        ...(partial.endings ? { endings: partial.endings } : {}),
        ...(partial.initialState ? { initialState: partial.initialState } : {}),
    };
}
let passed = 0;
let failed = 0;
function test(name, fn) {
    try {
        fn();
        passed += 1;
        console.log(`  PASS  ${name}`);
    }
    catch (e) {
        failed += 1;
        console.log(`  FAIL  ${name}`);
        console.log(`        ${e.message}`);
    }
}
function assert(cond, msg) {
    if (!cond)
        throw new Error(msg);
}
function eq(actual, expected, label) {
    if (actual !== expected)
        throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}
// --- tests --------------------------------------------------------------
console.log("Engine smoke tests");
test("input history: Up/Down recall recent inputs, with a stashed live draft", () => {
    const h = new InputHistory(3);
    h.record("look");
    h.record("north");
    h.record("examine panel");
    // Up walks oldest-ward from the live line; the live draft ("ta") is stashed.
    eq(h.previous("ta"), "examine panel", "first Up = newest");
    eq(h.previous("examine panel"), "north", "second Up = older");
    eq(h.previous("north"), "look", "third Up = oldest");
    eq(h.previous("look"), "look", "Up at the oldest stays put");
    // Down walks back toward the live line, restoring the stashed draft at the end.
    eq(h.next(), "north", "Down = newer");
    eq(h.next(), "examine panel", "Down = newer");
    eq(h.next(), "ta", "Down past the newest restores the live draft");
    eq(h.next(), null, "Down on the live line = no change");
    // Cap (3): the oldest fell off; blanks and consecutive dupes aren't recorded.
    const h2 = new InputHistory(3);
    for (const c of ["a", "b", "b", "   ", "c", "d"])
        h2.record(c);
    eq(h2.previous(""), "d", "newest");
    eq(h2.previous("d"), "c", "older");
    eq(h2.previous("c"), "b", "oldest kept (dupe 'b' collapsed, blank skipped)");
    eq(h2.previous("b"), "b", "only three retained — 'a' fell off the ring");
});
test("parser: bare compass shorthand maps to go <dir>", () => {
    const p = parse("n");
    assert(p, "parsed");
    eq(p.verb, "go", "verb");
    eq(p.noun, "north", "noun");
});
test("parser: shipboard directions (fore, aft, forward, port, starboard) route through go", () => {
    for (const dir of ["fore", "aft", "forward", "port", "starboard"]) {
        const p = parse(dir);
        assert(p, `parsed ${dir}`);
        eq(p.verb, "go", `${dir} -> verb=go`);
        eq(p.noun, dir, `${dir} -> noun=${dir}`);
    }
});
test("parser: 'back' is NOT a direction shortcut (too easily confused with 'the way I came')", () => {
    const p = parse("back");
    assert(p, "parsed");
    // Falls through as an unknown verb rather than 'go back'.
    assert(p.verb !== "go", "back does not map to go");
});
test("parser: three-arg form splits on preposition", () => {
    const p = parse("use key on door");
    assert(p, "parsed");
    eq(p.verb, "use", "verb");
    eq(p.noun, "key", "noun");
    eq(p.preposition, "on", "prep");
    eq(p.noun2, "door", "noun2");
});
test("parser: noise words are stripped", () => {
    const p = parse("take the badge");
    assert(p, "parsed");
    eq(p.verb, "take", "verb");
    eq(p.noun, "badge", "noun");
});
test("time: applyTickCost rounds pending fractional up", () => {
    const s = createInitialState(testWorld);
    applyTickCost(s, 0.1); // 0.1
    applyTickCost(s, 0.1); // 0.2
    applyTickCost(s, 0.1); // 0.3
    eq(s.ticks, 0, "no ticks advanced for fractional");
    eq(s.turns, 0, "no turn for fractional");
    applyTickCost(s, 1); // ceil(0.3) = 1, plus cost 1 = 2 ticks
    eq(s.ticks, 2, "ticks advanced with fractional bonus");
    eq(s.turns, 1, "exactly one turn for the costed action");
    eq(s.pendingFractional, 0, "fractional flushed");
});
test("time: zero-cost commands do not advance time or turns", () => {
    const s = createInitialState(testWorld);
    applyTickCost(s, 0);
    eq(s.ticks, 0, "ticks");
    eq(s.turns, 0, "turns");
});
test("time: day/night cycle alternates around dayLength", () => {
    assert(computeIsDaytime(0, 10), "tick 0 is day");
    assert(computeIsDaytime(9, 10), "tick 9 is day");
    assert(!computeIsDaytime(10, 10), "tick 10 is night");
    assert(!computeIsDaytime(19, 10), "tick 19 is night");
    assert(computeIsDaytime(20, 10), "tick 20 is day again");
});
test("scoring: awardScore is idempotent per hook", () => {
    const s = createInitialState(testWorld);
    const a = awardScore(s, "foo", 3);
    const b = awardScore(s, "foo", 3);
    assert(a === true, "first awards");
    assert(b === false, "second is a no-op");
    eq(s.score, 3, "score is 3, not 6");
});
test("save/load: round-trips a Set<string> scoreHook", () => {
    clearSave();
    const s = createInitialState(testWorld);
    awardScore(s, "examined_badge", 5);
    s.ticks = 42;
    s.turns = 7;
    s.currentRoom = "lab";
    assert(saveState(s), "save ok");
    const loaded = loadState();
    assert(loaded, "loaded");
    eq(loaded.score, 5, "score restored");
    eq(loaded.ticks, 42, "ticks restored");
    eq(loaded.turns, 7, "turns restored");
    eq(loaded.currentRoom, "lab", "room restored");
    assert(loaded.scoreHooks instanceof Set, "scoreHooks is a Set");
    assert(loaded.scoreHooks.has("examined_badge"), "hook restored");
});
test("engine: rejected verb costs zero ticks and zero turns", () => {
    const engine = makeEngine();
    engine.start();
    const before = { ticks: engine.state.ticks, turns: engine.state.turns };
    engine.submit("frobnicate");
    eq(engine.state.ticks, before.ticks, "ticks unchanged");
    eq(engine.state.turns, before.turns, "turns unchanged");
});
test("engine: gated exit refuses by day and passes at night", () => {
    const engine = makeEngine();
    engine.start();
    // Day at start: south bulkhead refuses.
    engine.submit("go south");
    eq(engine.state.currentRoom, "corridor", "still in corridor");
    // Wait until night, then try again.
    engine.submit("wait until night");
    assert(!engine.state.isDaytime, "now nighttime");
    engine.submit("go south");
    eq(engine.state.currentRoom, "vault", "passed through bulkhead at night");
});
test("engine: travel tube exit costs the configured ticks", () => {
    const engine = makeEngine();
    engine.start();
    const before = engine.state.ticks;
    engine.submit("go east"); // 3-tick travel tube
    // 3 ticks for travel; no fractional pending => exactly 3.
    eq(engine.state.ticks - before, 3, "3-tick travel cost applied");
    eq(engine.state.currentRoom, "observation", "arrived");
});
test("engine: examining the badge fires the score hook exactly once", () => {
    const engine = makeEngine();
    engine.start();
    engine.submit("go north");
    engine.submit("take badge");
    engine.submit("examine badge");
    eq(engine.state.score, 5, "scored 5");
    engine.submit("examine badge"); // again
    eq(engine.state.score, 5, "still 5; hook idempotent");
});
test("engine: walking into the airlock kills the player; no epilogue", () => {
    const engine = makeEngine();
    engine.start();
    engine.submit("go down"); // unsealed airlock onEnter -> dead
    assert(engine.state.dead, "dead flag set");
    assert(engine.state.deathReason && engine.state.deathReason.length > 0, "has reason");
    assert(!engine.state.ended, "ended NOT set (death is distinct from ending)");
    // Confirm no epilogue text appeared.
    const flat = captured.flatMap(c => c.lines).join("\n");
    assert(!flat.includes("portfolio review"), "universal epilogue did not play on death");
});
test("engine: free verbs (score, help, time) do not advance ticks/turns", () => {
    const engine = makeEngine();
    engine.start();
    const before = { ticks: engine.state.ticks, turns: engine.state.turns };
    engine.submit("score");
    engine.submit("time");
    engine.submit("help");
    eq(engine.state.ticks, before.ticks, "ticks unchanged after free verbs");
    eq(engine.state.turns, before.turns, "turns unchanged after free verbs");
});
test("engine: restart restores items to their starting rooms (regression)", () => {
    const engine = makeEngine();
    engine.start();
    engine.submit("go north");
    engine.submit("take badge");
    // Confirm we have it.
    assert(engine.state.inventory.includes("badge"), "badge picked up");
    // Die.
    engine.submit("go south");
    engine.submit("go down"); // unsealed airlock
    assert(engine.state.dead, "dead after airlock");
    // Restart.
    engine.submit("restart");
    assert(!engine.state.dead, "no longer dead after restart");
    eq(engine.state.currentRoom, "corridor", "back at start");
    assert(!engine.state.inventory.includes("badge"), "badge NOT in inventory after restart");
    // Walk into the lab — the badge must be there again.
    engine.submit("go north");
    eq(engine.state.currentRoom, "lab", "in lab");
    const lab = engine.world.rooms["lab"];
    // After the fix this comes from state, not from the world singleton.
    const labItems = lab.items.slice();
    assert(labItems.includes("badge") || labItems.length >= 0, "lab known"); // placeholder
    // The real check: the badge is examinable in the lab.
    const beforeScore = engine.state.score;
    engine.submit("examine badge");
    // If badge is missing from the lab, examine prints "you see no badge here"
    // and score stays zero. If present, the hook fires for 5.
    eq(engine.state.score, beforeScore + 5, "badge present and examinable in lab");
});
test("take all: picks up every takeable item; leaves fixed items behind", () => {
    const engine = makeEngine();
    engine.start();
    engine.submit("go north"); // lab: badge, spanner, workbench
    const beforeTurns = engine.state.turns;
    engine.submit("take all");
    assert(engine.state.inventory.includes("badge"), "badge taken");
    assert(engine.state.inventory.includes("spanner"), "spanner taken");
    assert(!engine.state.inventory.includes("workbench"), "workbench NOT taken (fixed)");
    // Workbench is still in the lab.
    // (Read state directly to avoid coupling to renderer formatting.)
    eq(engine.state.itemLocations["workbench"], "lab", "workbench remains in lab");
    // Single command = single turn, regardless of how many items.
    eq(engine.state.turns - beforeTurns, 1, "take all counts as one turn");
});
test("take all: in an empty room is free (no tick, no turn)", () => {
    const engine = makeEngine();
    engine.start();
    // Corridor is empty (no items).
    const before = { ticks: engine.state.ticks, turns: engine.state.turns };
    engine.submit("take all");
    eq(engine.state.ticks, before.ticks, "no ticks for empty take-all");
    eq(engine.state.turns, before.turns, "no turn for empty take-all");
});
test("take all: alias 'take everything' works", () => {
    const engine = makeEngine();
    engine.start();
    engine.submit("go north");
    engine.submit("take everything");
    assert(engine.state.inventory.includes("badge"), "badge taken via 'everything'");
    assert(engine.state.inventory.includes("spanner"), "spanner taken via 'everything'");
});
test("take all: after taking some items, take all picks up the rest", () => {
    const engine = makeEngine();
    engine.start();
    engine.submit("go north");
    engine.submit("take badge");
    engine.submit("take all"); // should now only pick up the spanner
    assert(engine.state.inventory.includes("spanner"), "spanner taken on second pass");
    // badge unaffected.
    assert(engine.state.inventory.includes("badge"), "badge still held");
});
test("push: undetached workbench refuses; flag unchanged", () => {
    const engine = makeEngine();
    engine.start();
    engine.submit("go north");
    engine.submit("push workbench");
    eq(engine.state.flags["workbench_detached"], undefined, "still bolted");
    // Also check the push counter hasn't ticked.
    eq(engine.state.flags["workbench_pushes"], undefined, "no pushes yet");
});
test("use: spanner on workbench detaches it; spanner stays in inventory", () => {
    const engine = makeEngine();
    engine.start();
    engine.submit("go north");
    engine.submit("take spanner");
    engine.submit("use spanner on workbench");
    eq(engine.state.flags["workbench_detached"], true, "detached flag set");
    assert(engine.state.inventory.includes("spanner"), "spanner not consumed");
});
test("use: spanner on workbench twice is a no-op the second time", () => {
    const engine = makeEngine();
    engine.start();
    engine.submit("go north");
    engine.submit("take spanner");
    engine.submit("use spanner on workbench");
    engine.submit("use spanner on workbench");
    eq(engine.state.flags["workbench_detached"], true, "still detached");
});
test("push: detached workbench can be pushed; counter increments", () => {
    const engine = makeEngine();
    engine.start();
    engine.submit("go north");
    engine.submit("take spanner");
    engine.submit("use spanner on workbench");
    engine.submit("push workbench");
    eq(engine.state.flags["workbench_pushes"], 1, "pushed once");
    engine.submit("push workbench");
    eq(engine.state.flags["workbench_pushes"], 2, "pushed twice");
});
test("push without a noun is a free no-op", () => {
    const engine = makeEngine();
    engine.start();
    const before = { ticks: engine.state.ticks, turns: engine.state.turns };
    engine.submit("push");
    eq(engine.state.ticks, before.ticks, "no ticks");
    eq(engine.state.turns, before.turns, "no turn");
});
test("push alias 'shove' works", () => {
    const engine = makeEngine();
    engine.start();
    engine.submit("go north");
    engine.submit("take spanner");
    engine.submit("use spanner on workbench");
    engine.submit("shove workbench");
    eq(engine.state.flags["workbench_pushes"], 1, "shove counts as a push");
});
test("examine workbench reflects its current state (dynamic description)", () => {
    const engine = makeEngine();
    engine.start();
    engine.submit("go north");
    // Before detachment.
    captured.length = 0;
    engine.submit("examine workbench");
    const beforeText = captured.flatMap(c => c.lines).join(" ");
    assert(beforeText.toLowerCase().includes("bolt"), "described as bolted before");
    // Detach and re-examine.
    engine.submit("take spanner");
    engine.submit("use spanner on workbench");
    captured.length = 0;
    engine.submit("examine workbench");
    const afterText = captured.flatMap(c => c.lines).join(" ");
    assert(afterText.toLowerCase().includes("loose"), "described as loose after");
});
test("links: plain text yields a single text segment", () => {
    const segs = parseLinks("Just plain text.");
    eq(segs.length, 1, "one segment");
    eq(segs[0].kind, "text", "kind");
    eq(segs[0].kind === "text" && segs[0].value, "Just plain text.", "value");
});
test("links: a single [text](url) becomes three segments", () => {
    const segs = parseLinks("Visit [the site](https://example.com) for more.");
    eq(segs.length, 3, "three segments");
    eq(segs[0].kind, "text", "pre");
    eq(segs[1].kind, "link", "middle is link");
    if (segs[1].kind === "link") {
        eq(segs[1].text, "the site", "link text");
        eq(segs[1].href, "https://example.com", "link href");
    }
    eq(segs[2].kind, "text", "post");
});
test("links: javascript: URLs are rejected and rendered as plain text", () => {
    const segs = parseLinks("Click [me](javascript:alert(1)) please.");
    // The dangerous link must NOT produce a link segment.
    for (const s of segs) {
        assert(s.kind !== "link", "no link segment produced for javascript: URL");
    }
    // The whole input survives intact as text.
    const reassembled = segs.map(s => s.kind === "text" ? s.value : "").join("");
    eq(reassembled, "Click [me](javascript:alert(1)) please.", "raw text preserved");
});
test("links: mailto: and relative paths are accepted", () => {
    const a = parseLinks("[email me](mailto:foo@example.com)");
    assert(a[0].kind === "link" && a[0].href === "mailto:foo@example.com", "mailto accepted");
    const b = parseLinks("[home](/index.html)");
    assert(b[0].kind === "link" && b[0].href === "/index.html", "relative path accepted");
});
test("links: multiple links in one line all parse", () => {
    const segs = parseLinks("[one](https://a) and [two](https://b).");
    const links = segs.filter(s => s.kind === "link");
    eq(links.length, 2, "two link segments");
});
// --- Step 1: custom verbs, richer return types, hidden items, topic aliases ---
test("authoring: aliasedTopics expands key groups", () => {
    const t = aliasedTopics([
        [["client", "employer", "who"], "X"],
        [["target", "rabbit"], "Y"],
    ]);
    eq(t["client"], "X", "client");
    eq(t["employer"], "X", "employer");
    eq(t["who"], "X", "who");
    eq(t["target"], "Y", "target");
    eq(t["rabbit"], "Y", "rabbit");
});
test("authoring: aliasedTopics lowercases keys", () => {
    const t = aliasedTopics([[["FOO", "Bar"], "x"]]);
    assert("foo" in t, "FOO -> foo");
    assert("bar" in t, "Bar -> bar");
});
test("verbs: 'open' calls onOpen; without onOpen reports un-openable", () => {
    const world = miniWorld({
        rooms: {
            r1: { id: "r1", name: "R1", description: ".", exits: {}, items: ["box", "rock"], npcs: [] },
        },
        items: {
            box: {
                id: "box", name: "box", description: ".", takeable: false,
                onOpen: (s) => {
                    s.flags["box_opened"] = true;
                    return "The box clicks open.";
                },
            },
            rock: { id: "rock", name: "rock", description: ".", takeable: false },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.submit("open box");
    eq(engine.state.flags["box_opened"], true, "onOpen fired");
    // 'open rock' has no onOpen.
    engine.submit("open rock");
    // Confirm the un-openable path was reached: rock didn't set any flag.
    eq(engine.state.flags["rock_opened"], undefined, "rock has no onOpen");
});
test("verbs: 'flip' and 'lift' are open synonyms; 'shut' is a close synonym", () => {
    const world = miniWorld({
        rooms: {
            r1: { id: "r1", name: "R1", description: ".", exits: {}, items: ["box"], npcs: [] },
        },
        items: {
            box: {
                id: "box", name: "box", description: ".", takeable: false,
                onOpen: (s) => { s.flags["box_opened"] = true; },
                onClose: (s) => { s.flags["box_opened"] = false; },
            },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.submit("flip box");
    eq(engine.state.flags["box_opened"], true, "flip = open");
    engine.submit("shut box");
    eq(engine.state.flags["box_opened"], false, "shut = close");
    engine.submit("lift box");
    eq(engine.state.flags["box_opened"], true, "lift = open");
});
test("verbs: 'tap X on Y' behaves like 'use X on Y'", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: ["pad", "id"], npcs: [] } },
        items: {
            pad: { id: "pad", name: "datapad", description: ".", takeable: true },
            id: {
                id: "id", name: "ID card", description: ".", takeable: true,
                onUseWith: { pad: (s) => { s.flags["tapped"] = true; return "Beep."; } },
            },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.submit("take all");
    engine.submit("tap id on pad");
    eq(engine.state.flags["tapped"], true, "tap routed through onUseWith");
});
test("verbs: 'tap X' (no target) prompts with tap-specific phrasing", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: ["id"], npcs: [] } },
        items: { id: { id: "id", name: "ID card", description: ".", takeable: true } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.submit("take id");
    captured.length = 0;
    engine.submit("tap id");
    const flat = captured.flatMap(c => c.lines).join("\n");
    assert(flat.toLowerCase().includes("tap"), "uses tap phrasing");
    assert(flat.toLowerCase().includes("on what"), "asks 'on what'");
});
test("item-action: onUseWith handler may return { tickCost: 0, free: true }", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: ["pad", "id"], npcs: [] } },
        items: {
            pad: { id: "pad", name: "datapad", description: ".", takeable: true },
            id: {
                id: "id", name: "ID card", description: ".", takeable: true,
                onUseWith: {
                    pad: () => ({ output: "Balance: 500 credits.", tickCost: 0, free: true }),
                },
            },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.submit("take all");
    const before = { ticks: engine.state.ticks, turns: engine.state.turns };
    engine.submit("tap id on pad");
    eq(engine.state.ticks, before.ticks, "no ticks for free action");
    eq(engine.state.turns, before.turns, "no turn for free action");
});
test("items: hidden items are in scope for commands but not listed in inventory", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: ["pad", "contract"], npcs: [] } },
        items: {
            pad: { id: "pad", name: "datapad", description: "A pad.", takeable: true },
            contract: { id: "contract", name: "contract", description: "Secret contract.", takeable: true, hidden: true },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.submit("take all");
    // Both items are in inventory, but inventory listing only mentions the pad.
    captured.length = 0;
    engine.submit("inventory");
    const inv = captured.flatMap(c => c.lines).join("\n");
    assert(inv.includes("datapad"), "datapad listed");
    assert(!inv.includes("contract"), "contract NOT listed");
    // But `read contract` resolves it (it's in scope).
    captured.length = 0;
    engine.submit("read contract");
    const read = captured.flatMap(c => c.lines).join("\n");
    assert(read.includes("Secret contract"), "hidden item still readable");
});
test("verbs: World.commands can register a fully custom verb", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
        items: {},
        commands: {
            check: (_w, s, cmd) => {
                if (cmd.noun === "balance" || cmd.noun === "credits") {
                    s.flags["checked_balance"] = true;
                    return { handled: true, output: ["Balance: 500 credits."], tickCost: 0, free: true };
                }
                return { handled: true, output: [`Check what?`], tickCost: 0, free: true };
            },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    const before = { ticks: engine.state.ticks, turns: engine.state.turns };
    engine.submit("check balance");
    eq(engine.state.flags["checked_balance"], true, "custom verb ran");
    eq(engine.state.ticks, before.ticks, "free; no ticks");
    eq(engine.state.turns, before.turns, "free; no turn");
});
// --- Step 2: virtual exits, Room.onTick, programmatic scene transition ----
test("virtual exit: a gated exit with no `to` refuses cleanly with the gated message", () => {
    const world = miniWorld({
        rooms: {
            lounge: {
                id: "lounge", name: "Lounge", description: "A lounge.",
                exits: {
                    // Named non-exit: always refused with custom text.
                    cabin: { gated: () => "Your cabin is three doors down — barely worth visiting." },
                },
                items: [], npcs: [],
            },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    const before = { ticks: engine.state.ticks, turns: engine.state.turns };
    engine.submit("go cabin");
    eq(engine.state.currentRoom, "lounge", "still in lounge");
    eq(engine.state.ticks, before.ticks, "no ticks for refused virtual exit");
    eq(engine.state.turns, before.turns, "no turn for refused virtual exit");
    const flat = captured.flatMap(c => c.lines).join("\n");
    assert(flat.includes("three doors down"), "custom refusal text printed");
});
test("onTick: fires after each costed action with relative ticks-in-room", () => {
    const log = [];
    const world = miniWorld({
        rooms: {
            r1: {
                id: "r1", name: "R1", description: ".", exits: { east: { to: "r2" } },
                items: [], npcs: [],
                onTick: (_s, ticksInRoom) => { log.push(ticksInRoom); },
            },
            r2: { id: "r2", name: "R2", description: ".", exits: { west: { to: "r1" } }, items: [], npcs: [] },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.submit("wait"); // 1 tick  -> onTick(1)
    engine.submit("wait"); // 1 tick  -> onTick(2)
    // `wait 3` is interruptible, so it advances one tick at a time and fires
    // onTick on each: ticksInRoom 3, 4, 5. (Per-tick firing is what lets a wait
    // stop early on an event; it's also more precise than the old single call.)
    engine.submit("wait 3");
    eq(JSON.stringify(log), JSON.stringify([1, 2, 3, 4, 5]), "onTick log");
});
test("onTick: a free action (score) does NOT fire onTick", () => {
    let calls = 0;
    const world = miniWorld({
        rooms: {
            r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [],
                onTick: () => { calls += 1; },
            },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.submit("score");
    engine.submit("help");
    eq(calls, 0, "no onTick from free verbs");
});
test("onTick: moving INTO a room does not fire its onTick for the entry tick", () => {
    let firstSeenTicksInRoom;
    const world = miniWorld({
        rooms: {
            r1: { id: "r1", name: "R1", description: ".", exits: { east: { to: "r2" } }, items: [], npcs: [] },
            r2: { id: "r2", name: "R2", description: ".", exits: {}, items: [], npcs: [],
                onTick: (_s, n) => { if (firstSeenTicksInRoom === undefined)
                    firstSeenTicksInRoom = n; },
            },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.submit("go east"); // 1 tick, room changes
    eq(firstSeenTicksInRoom, undefined, "no onTick fired on entry");
    engine.submit("wait"); // 1 tick in r2
    eq(firstSeenTicksInRoom, 1, "first onTick after entry sees ticksInRoom=1");
});
test("requestSceneTransition: world handler can transition the player", () => {
    const world = miniWorld({
        rooms: {
            shuttle: {
                id: "shuttle", name: "Shuttle", description: "In transit.",
                exits: {}, items: [], npcs: [],
                onTick: (s, n) => {
                    if (n >= 3 && !s.flags["docked"]) {
                        s.flags["docked"] = true;
                        requestSceneTransition(s, "liner");
                    }
                },
            },
            liner: { id: "liner", name: "Liner", description: "Arrived.", exits: {}, items: [], npcs: [] },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.submit("wait");
    engine.submit("wait");
    engine.submit("wait"); // ticksInRoom reaches 3 here → transition
    eq(engine.state.currentRoom, "liner", "transitioned to liner");
    eq(engine.state.flags["docked"], true, "docked flag set");
});
// --- Step 3: modal input handler stack ------------------------------------
test("modal: pushed handler intercepts input; pops when done", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    const captured_input = [];
    const modal = {
        onEnter: () => ["MODAL PROMPT"],
        onInput: (line) => {
            captured_input.push(line);
            return { output: `You said: ${line}`, pop: true };
        },
    };
    engine.pushModal(modal);
    assert(engine.inModalMode(), "in modal mode");
    engine.submit("hello world");
    eq(captured_input[0], "hello world", "modal saw raw line");
    assert(!engine.inModalMode(), "exited modal mode after pop");
});
test("modal: modal mode prevents verb parsing", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: { east: { to: "r2" } }, items: [], npcs: [] },
            r2: { id: "r2", name: "R2", description: ".", exits: {}, items: [], npcs: [] } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    const seen = [];
    engine.pushModal({ onInput: (line) => { seen.push(line); return {}; } });
    engine.submit("go east");
    eq(engine.state.currentRoom, "r1", "didn't move — verb parser skipped");
    eq(seen[0], "go east", "modal saw the raw text");
});
test("modal: ticks do NOT advance while modal mode is active", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.pushModal({ onInput: () => ({}) });
    const before = { ticks: engine.state.ticks, turns: engine.state.turns };
    engine.submit("anything");
    eq(engine.state.ticks, before.ticks, "no ticks for modal input");
    eq(engine.state.turns, before.turns, "no turn for modal input");
});
test("modal: result.push stacks another handler (sequential form pattern)", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    const log = [];
    const step2 = {
        onEnter: () => ["STEP 2 PROMPT"],
        onInput: (line) => { log.push(`step2:${line}`); return { pop: true }; },
    };
    const step1 = {
        onEnter: () => ["STEP 1 PROMPT"],
        onInput: (line) => {
            log.push(`step1:${line}`);
            return { pop: true, push: step2 };
        },
    };
    engine.pushModal(step1);
    engine.submit("foo");
    engine.submit("bar");
    eq(log[0], "step1:foo", "first input went to step1");
    eq(log[1], "step2:bar", "second input went to step2");
    assert(!engine.inModalMode(), "stack empty after both pop");
});
test("modal: requestPushModal from a room's onEnter enters modal mode on game start", () => {
    let started = false;
    const formModal = {
        onEnter: () => { started = true; return ["NAME?"]; },
        onInput: (line, s) => { s.flags["alias"] = line; return { pop: true }; },
    };
    const world = miniWorld({
        rooms: {
            lobby: {
                id: "lobby", name: "Lobby", description: ".", exits: {}, items: [], npcs: [],
                onEnter: (s) => requestPushModal(s, formModal),
            },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    assert(started, "modal onEnter fired during engine.start()");
    assert(engine.inModalMode(), "modal active after start");
    engine.submit("Foo");
    eq(engine.state.flags["alias"], "Foo", "captured alias");
    assert(!engine.inModalMode(), "modal popped after completion");
});
test("modal: can requestSceneTransition while active", () => {
    const world = miniWorld({
        rooms: {
            shuttle: { id: "shuttle", name: "Shuttle", description: ".", exits: {}, items: [], npcs: [] },
            arrival: { id: "arrival", name: "Arrival", description: ".", exits: {}, items: [], npcs: [] },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    // Push a "press any key" transition modal.
    engine.pushModal({
        onInput: (_line, s) => {
            requestSceneTransition(s, "arrival");
            return { pop: true };
        },
    });
    engine.submit("ok");
    eq(engine.state.currentRoom, "arrival", "transitioned via modal");
    assert(!engine.inModalMode(), "modal popped");
});
test("modal: death still wins over modal mode", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.state.dead = true;
    engine.state.deathReason = "Test death.";
    engine.pushModal({ onInput: () => { throw new Error("should not be called"); } });
    // Should NOT throw — the dead/ended check fires before the modal one.
    engine.submit("anything");
    // Modal is still on the stack but bypassed; not the cleanest behaviour
    // but the alternative (auto-clearing the stack on death) risks surprising
    // world content. Confirm: death message shown, no exception.
    // (Asserts via "no throw" above.)
});
// --- Step 4: PC_ALIAS header slot -----------------------------------------
test("header: alias is undefined until state.flags['PC_ALIAS'] is set", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    // First header call from start(): no alias.
    const first = headerLog[0];
    eq(first.alias, undefined, "no alias at start");
    // Set the alias and trigger a refresh by running any command.
    engine.state.flags["PC_ALIAS"] = "Foo";
    engine.submit("look");
    const last = headerLog[headerLog.length - 1];
    eq(last.alias, "Foo", "alias appears once set");
});
test("header: empty-string alias is treated as absent", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.state.flags["PC_ALIAS"] = "";
    engine.submit("look");
    const last = headerLog[headerLog.length - 1];
    eq(last.alias, undefined, "empty string -> alias hidden");
});
// --- Step 5: Halberd pre-Horizon scene — integration ---------------------
function makeJackrabbit() {
    captured.length = 0;
    headerLog.length = 0;
    // Each test gets a fresh save slot (the jackrabbit world is the same World
    // singleton across tests, but with itemLocations moved to GameState there's
    // no cross-test contamination).
    clearSave();
    return new GameEngine(jackrabbitWorld, {
        render: (lines, opts) => captured.push({ lines, kind: opts?.kind }),
        updateHeader: (_s, location, alias) => headerLog.push({ location, ...(alias !== undefined ? { alias } : {}) }),
    });
}
function flatOutput() {
    return captured.flatMap(c => c.lines).join("\n");
}
test("jackrabbit: lobby pushes the form modal on game start", () => {
    const engine = makeJackrabbit();
    engine.start();
    assert(engine.inModalMode(), "modal pushed by lobby onEnter");
    assert(flatOutput().includes("HRS/ID/7(b)"), "form header printed");
});
test("jackrabbit: completing the form sets the PC vars and pops the modal", () => {
    const engine = makeJackrabbit();
    engine.start();
    engine.submit("Foo Bar"); // alias
    engine.submit("2"); // profession = Freelance technician
    engine.submit("Real Name"); // real name
    engine.submit("yes"); // confirm
    assert(!engine.inModalMode(), "modal popped");
    eq(engine.state.flags[FLAG_PC_ALIAS], "Foo Bar", "alias stored");
    eq(engine.state.flags[FLAG_PC_PROFESSION], "Freelance technician", "profession stored");
    eq(engine.state.flags[FLAG_PC_REAL_NAME], "Real Name", "real name stored");
    eq(engine.state.flags[FLAG_FORM_COMPLETE], true, "form complete flag");
});
test("jackrabbit: form 'no' at confirm starts over", () => {
    const engine = makeJackrabbit();
    engine.start();
    engine.submit("First");
    engine.submit("1");
    engine.submit("RealOne");
    engine.submit("no");
    assert(engine.inModalMode(), "still in modal after no");
    // Should be back at the alias step — try a fresh sequence.
    engine.submit("Second");
    engine.submit("3");
    engine.submit("RealTwo");
    engine.submit("yes");
    eq(engine.state.flags[FLAG_PC_ALIAS], "Second", "second pass took effect");
    eq(engine.state.flags[FLAG_PC_PROFESSION], "Journalist / media correspondent", "profession from second pass");
});
test("jackrabbit: form accepts free-text profession (non-listed)", () => {
    const engine = makeJackrabbit();
    engine.start();
    engine.submit("Foo");
    engine.submit("Astrophotographer"); // not in PROFESSIONS
    engine.submit("Real");
    engine.submit("yes");
    eq(engine.state.flags[FLAG_PC_PROFESSION], "Astrophotographer", "free-text profession accepted");
});
test("jackrabbit: north exit gated until form complete; freely passable after", () => {
    const engine = makeJackrabbit();
    engine.start();
    // While in modal: 'go north' goes to the modal, not the parser. Exit form
    // first by completing it.
    engine.submit("Foo");
    engine.submit("1");
    engine.submit("Real");
    engine.submit("yes");
    assert(!engine.inModalMode(), "out of modal");
    eq(engine.state.currentRoom, "halberd_lobby", "still in lobby");
    // Now we can move north.
    engine.submit("go north");
    eq(engine.state.currentRoom, "halberd_office", "moved to office");
});
test("jackrabbit: talking to Miss Terry delivers the briefing and issues items", () => {
    const engine = makeJackrabbit();
    engine.start();
    // Complete form, walk into office.
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    // Talk.
    captured.length = 0;
    engine.submit("talk miss terry");
    const said = flatOutput();
    assert(said.includes("Jackrabbit"), "target name said");
    assert(said.includes("escrow"), "fee in escrow mentioned");
    assert(said.includes("discretion"), "discretion line present");
    // Items issued.
    assert(engine.state.inventory.includes("fake_id"), "fake_id issued");
    assert(engine.state.inventory.includes("datapad"), "datapad issued");
    assert(engine.state.inventory.includes("contract"), "contract (hidden) issued");
    assert(engine.state.inventory.includes("reservation"), "reservation (hidden) issued");
    assert(engine.state.inventory.includes("notepad"), "notepad (hidden) issued");
    // Credits loaded.
    eq(engine.state.flags[FLAG_CREDITS], 500, "500 credits loaded");
    eq(engine.state.flags[FLAG_BRIEFING_COMPLETE], true, "briefing flag set");
});
test("jackrabbit: re-talking to Miss Terry after briefing gives the 'Safe travels' line", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    captured.length = 0;
    engine.submit("talk miss terry");
    assert(flatOutput().includes("Safe travels"), "Safe travels line");
});
test("jackrabbit: 'check balance' is free and reports credits after briefing", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    const before = { ticks: engine.state.ticks, turns: engine.state.turns };
    captured.length = 0;
    engine.submit("check balance");
    eq(engine.state.ticks, before.ticks, "no ticks for check");
    eq(engine.state.turns, before.turns, "no turn for check");
    assert(flatOutput().includes("500 credits"), "balance reported");
});
test("jackrabbit: 'check balance' refuses before ID is issued", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    captured.length = 0;
    engine.submit("check balance");
    assert(flatOutput().toLowerCase().includes("no id"), "refuses without ID");
});
test("jackrabbit: 'tap id on datapad' is free and reports balance", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    const before = { ticks: engine.state.ticks, turns: engine.state.turns };
    captured.length = 0;
    engine.submit("tap id on datapad");
    eq(engine.state.ticks, before.ticks, "no ticks for tap");
    eq(engine.state.turns, before.turns, "no turn for tap");
    assert(flatOutput().includes("500 credits"), "balance reported");
});
test("jackrabbit: read contract / reservation / notepad all resolve", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Lurker", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    captured.length = 0;
    engine.submit("read contract");
    assert(flatOutput().includes("ENGAGEMENT SUMMARY"), "contract read");
    captured.length = 0;
    engine.submit("read reservation");
    const r = flatOutput();
    assert(r.includes("DONOVAN'S"), "reservation read");
    assert(r.includes("Lurker"), "reservation includes alias");
    captured.length = 0;
    engine.submit("read notepad");
    assert(flatOutput().includes("No entries yet"), "empty notepad shown");
});
test("add note: the player can jot a timestamped entry into the notepad", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Lurker", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    const turnsBefore = engine.state.turns;
    // Add a note; capitalisation is preserved (the parser's raw is lower-cased).
    captured.length = 0;
    engine.submit("add note Meet Burke after dark");
    assert(flatOutput().toLowerCase().includes("noted"), "confirmation shown");
    eq(engine.state.turns, turnsBefore, "jotting a note is free (no turn cost)");
    // It surfaces in BOTH the notepad sub-document and the notes command, stamped.
    captured.length = 0;
    engine.submit("read notepad");
    const np = flatOutput();
    assert(np.includes("Meet Burke after dark"), "original capitalisation preserved");
    assert(np.includes("[tick"), "timestamped");
    captured.length = 0;
    engine.submit("notes");
    assert(flatOutput().includes("Meet Burke after dark"), "also appears via the notes command");
    // The JOT alias works too.
    captured.length = 0;
    engine.submit("jot buy ice cream before the curry");
    captured.length = 0;
    engine.submit("read notepad");
    assert(flatOutput().includes("buy ice cream before the curry"), "jot alias adds an entry");
    // A bodyless ADD NOTE asks what to write rather than filing an empty entry.
    const noteCount = engine.state.notes.length;
    captured.length = 0;
    engine.submit("add note");
    assert(flatOutput().toLowerCase().includes("add what"), "empty add note prompts");
    eq(engine.state.notes.length, noteCount, "no empty note filed");
});
test("LCD: the concourse directory points the way to Rajah (west)", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "lcd_concourse";
    captured.length = 0;
    engine.submit("examine directory");
    const d = flatOutput();
    assert(d.includes("Rajah"), "the directory names Rajah's pharmacy");
    assert(d.toUpperCase().includes("WEST"), "and points west, where she actually is");
});
test("jackrabbit: inventory hides the sub-documents", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    captured.length = 0;
    engine.submit("inventory");
    const inv = flatOutput();
    assert(inv.includes("ID card"), "ID card listed");
    assert(inv.includes("datapad"), "datapad listed");
    assert(!inv.includes("contract"), "contract NOT listed");
    assert(!inv.includes("reservation"), "reservation NOT listed");
    assert(!inv.includes("notepad"), "notepad NOT listed");
});
test("jackrabbit: PC_ALIAS reaches the header bar after form completion", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    // Trigger a render after form completion via any command.
    engine.submit("look");
    const last = headerLog[headerLog.length - 1];
    eq(last.alias, "Foo", "alias appears in header");
});
test("jackrabbit: 'take form_datapad' is refused (it's tethered)", () => {
    const engine = makeJackrabbit();
    engine.start();
    // We're inside the modal; bypass it for this test.
    engine.popModal();
    captured.length = 0;
    engine.submit("take datapad");
    // Note: 'datapad' alias resolves form_datapad in the lobby (no fake datapad yet).
    const out = flatOutput().toLowerCase();
    assert(out.includes("can't take"), "refused with takeable=false message");
});
test("noun resolution: exact match beats substring match; inventory beats room (regression)", () => {
    // Reported bug: while standing in the Halberd lobby with the datapad in
    // inventory, EXAMINE DATAPAD returned the description of the lobby's
    // form_datapad (its aliases include "datapad"), not the real one.
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    engine.submit("go south"); // back to the lobby where form_datapad lives
    eq(engine.state.currentRoom, "halberd_lobby", "back in lobby");
    assert(engine.state.inventory.includes("datapad"), "real datapad in inventory");
    captured.length = 0;
    engine.submit("examine datapad");
    const out = flatOutput();
    // Real datapad: "Three documents loaded...".
    // Form datapad post-completion: "gone to standby".
    assert(out.includes("Three documents loaded"), "examined the real datapad, not the form one");
    assert(!out.includes("standby"), "did NOT examine the form datapad");
});
test("noun resolution: a substring-only noun still finds the scenery item", () => {
    // Negative side: examining "registration" (only the form datapad uses
    // that alias) must still find the form datapad.
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    engine.submit("go south");
    captured.length = 0;
    engine.submit("examine registration");
    assert(flatOutput().toLowerCase().includes("standby"), "found the form datapad");
});
test("jackrabbit: ask Miss Terry about 'person of interest' resolves the multi-word topic", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    captured.length = 0;
    engine.submit("ask terry about person of interest");
    assert(flatOutput().includes("Standard terminology"), "topic resolved");
});
// --- Shuttle 1 + Liner + Shuttle 2 + Horizon stub --------------------------
function bootJackrabbitPastBriefing() {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    engine.submit("go south"); // back to lobby
    return engine;
}
/**
 * Boot through the briefing, board the shuttle, dock, and disembark to the
 * liner. Note the two waits: with the interruptible-wait cap, the first big
 * wait stops at the docking-approach warning (tick 12); the second carries on
 * to the actual dock (tick 15).
 */
function bootToLiner() {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out"); // board shuttle cabin
    engine.submit("wait 30"); // stops at the approach warning (tick 12)
    engine.submit("wait 30"); // carries on; shuttle docks (tick 15)
    engine.submit("go out"); // disembark to the liner
    return engine;
}
/** Boot all the way to the Horizon arrival concourse (through the liner + shuttle 2). */
function bootToHorizon() {
    const engine = bootToLiner();
    engine.submit("talk passenger"); // start the disembark countdown
    engine.submit("wait 30"); // departure announcement
    engine.submit("wait 30"); // shuttle-2 narrative modal
    engine.submit(""); // press ENTER -> arrival concourse
    return engine;
}
test("shuttle1: 'out' from the lobby boards the shuttle after the briefing", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    eq(engine.state.currentRoom, "shuttle1_cabin", "boarded shuttle cabin");
});
test("shuttle1: docking announcement fires around tick 12 in scene", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    // Burn 12 ticks. (wait 12 = one action, 12 ticks.)
    captured.length = 0;
    engine.submit("wait 12");
    const out = flatOutput();
    assert(out.includes("DOCKING APPROACH"), "docking announcement printed");
});
test("shuttle1: docks (does not auto-transition); player disembarks via 'out'", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    engine.submit("wait 30"); // interrupted by the approach warning at tick 12
    captured.length = 0;
    engine.submit("wait 30"); // carries on; docks at tick 15
    assert(flatOutput().includes("has docked"), "docking narration printed");
    // Crucially, the player is STILL on the shuttle — no teleport.
    eq(engine.state.currentRoom, "shuttle1_cabin", "still aboard after docking");
    // The 'out' exit is now live; the player disembarks under their own steam.
    engine.submit("go out");
    eq(engine.state.currentRoom, "liner_lounge", "disembarked to the liner");
});
test("wait cap: a long wait stops early at the docking-approach warning (regression)", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    // Scene baseline is stamped on boarding (FLAG_SHUTTLE1_BOARDED_AT).
    const sceneBaseline = engine.state.flags["shuttle1_boarded_at"];
    captured.length = 0;
    engine.submit("wait 500"); // would blow way past everything, uncapped
    // Stops at the warning (scene tick 12), NOT at docking (scene tick 15).
    assert(flatOutput().includes("DOCKING APPROACH"), "approach warning fired");
    assert(!flatOutput().includes("has docked"), "did NOT overshoot to docking");
    eq(engine.state.ticks - sceneBaseline, 12, "advanced exactly to the warning tick");
});
test("shuttle1: 'out' refuses before docking", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out"); // board
    captured.length = 0;
    engine.submit("go out"); // too early
    eq(engine.state.currentRoom, "shuttle1_cabin", "still aboard");
    assert(flatOutput().includes("under way") || flatOutput().includes("won't cycle"), "refused with in-transit message");
});
test("shuttle1: if docking happens in the maintenance bay, player walks forward to disembark", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    engine.submit("aft");
    engine.submit("aft"); // maintenance bay
    engine.submit("wait 30"); // stops at the approach warning
    engine.submit("wait 30"); // carries on; docks while aft
    eq(engine.state.flags["shuttle1_arrived"], true, "docked");
    eq(engine.state.currentRoom, "shuttle1_maintenance", "still in the bay");
    engine.submit("forward");
    engine.submit("forward"); // back to cabin
    engine.submit("go out");
    eq(engine.state.currentRoom, "liner_lounge", "disembarked after walking to the cabin");
});
test("shuttle1: Big Red Button — cover closed + pull lever refuses", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    engine.submit("aft"); // cabin -> hatch
    engine.submit("aft"); // hatch -> maintenance
    eq(engine.state.currentRoom, "shuttle1_maintenance", "in maintenance bay");
    engine.submit("push lever");
    assert(!engine.state.dead, "still alive — cover closed");
});
test("shuttle1: Big Red Button — open cover + pull lever in transit = death", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    engine.submit("aft");
    engine.submit("aft");
    engine.submit("open cover");
    engine.submit("pull lever");
    assert(engine.state.dead, "player is dead");
    assert(engine.state.deathReason?.includes("airlock"), "death reason references airlock");
});
test("shuttle1: layout is linear — repeated 'aft' walks cabin -> hatch -> maintenance (regression)", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    eq(engine.state.currentRoom, "shuttle1_cabin", "start: cabin");
    engine.submit("aft");
    eq(engine.state.currentRoom, "shuttle1_hatch", "aft -> hatch");
    engine.submit("aft");
    eq(engine.state.currentRoom, "shuttle1_maintenance", "aft again -> maintenance");
    captured.length = 0;
    engine.submit("aft");
    eq(engine.state.currentRoom, "shuttle1_maintenance", "no further aft");
    assert(flatOutput().toLowerCase().includes("can't go aft"), "refused with direction message");
    // And `forward` walks back the other way, monotonically.
    engine.submit("forward");
    eq(engine.state.currentRoom, "shuttle1_hatch", "forward -> hatch");
    engine.submit("forward");
    eq(engine.state.currentRoom, "shuttle1_cabin", "forward again -> cabin");
});
test("shuttle1: scene clock advances even while the player is moving (regression)", () => {
    // Reported bug: the player walked between shuttle rooms while the scene
    // clock advanced. Room.onTick was skipped on every move turn, so the
    // warning didn't fire until the player stood still. Fix: world.onTick fires
    // on every paid action, including moves.
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    captured.length = 0;
    // Walk the shuttle back and forth, never standing still. Each loop is 4
    // paid moves; 4 loops = 16 paid actions, past both warning and docking.
    for (let i = 0; i < 4; i += 1) {
        engine.submit("aft"); // cabin -> hatch
        engine.submit("aft"); // hatch -> maintenance
        engine.submit("forward"); // maintenance -> hatch
        engine.submit("forward"); // hatch -> cabin
    }
    const flat = captured.flatMap(c => c.lines).join("\n");
    assert(flat.includes("DOCKING APPROACH"), "approach warning printed during movement");
    assert(flat.includes("has docked"), "docking narration printed during movement");
    // The player ends docked back in the cabin and disembarks themselves.
    eq(engine.state.currentRoom, "shuttle1_cabin", "ended in cabin, docked");
    engine.submit("go out");
    eq(engine.state.currentRoom, "liner_lounge", "disembarked");
});
test("input: noise-only input ('a') gives feedback, not a silent no-op (regression)", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    engine.submit("a"); // 'a' is a noise word -> reduces to empty
    const flat = captured.flatMap(c => c.lines).join("\n");
    // Should echo the input AND give a don't-understand response (not silence).
    assert(flat.includes("don't understand"), "noise-only input gets feedback");
});
test("input: a bare Enter (empty line) stays silent", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    engine.submit("   "); // whitespace only
    const flat = captured.flatMap(c => c.lines).join("\n");
    assert(!flat.includes("don't understand"), "empty input is not an error");
});
test("shuttle1: the warning label can be read (lever description points at it)", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    engine.submit("aft");
    engine.submit("aft"); // maintenance bay
    captured.length = 0;
    engine.submit("read label");
    assert(flatOutput().includes("MANUAL AIRLOCK RELEASE"), "label readable");
});
test("jackrabbit: restart re-fires the lobby onEnter and re-pushes the form (regression)", () => {
    const engine = makeJackrabbit();
    engine.start();
    // Complete the form, briefing, board the shuttle, and die.
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    engine.submit("go south");
    engine.submit("go out");
    engine.submit("aft");
    engine.submit("aft");
    engine.submit("open cover");
    engine.submit("pull lever");
    assert(engine.state.dead, "dead before restart");
    // Restart.
    captured.length = 0;
    engine.submit("restart");
    // State is fully reset...
    assert(!engine.state.dead, "alive after restart");
    eq(engine.state.flags["form_complete"], undefined, "form_complete cleared");
    eq(engine.state.currentRoom, "halberd_lobby", "back in lobby");
    // ...and the character-creation form modal is active again.
    assert(engine.inModalMode(), "form modal re-pushed after restart");
    assert(captured.flatMap(c => c.lines).join("\n").includes("HRS/ID/7(b)"), "form header reprinted");
    // And it actually works: completing it again sets the alias.
    engine.submit("Second");
    engine.submit("1");
    engine.submit("RealTwo");
    engine.submit("yes");
    eq(engine.state.flags[FLAG_PC_ALIAS], "Second", "form usable after restart");
});
test("jackrabbit: lobby does not advertise the 'out' exit before the briefing (regression)", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    // In the lobby, pre-briefing: 'out' is gated and hidden.
    captured.length = 0;
    engine.submit("look");
    const before = flatOutput();
    assert(before.includes("Exits:"), "exits listed");
    assert(!before.includes("out"), "'out' NOT advertised before briefing");
    // After the briefing, 'out' appears.
    engine.submit("go north");
    engine.submit("talk miss terry");
    engine.submit("go south");
    captured.length = 0;
    engine.submit("look");
    assert(flatOutput().includes("out"), "'out' advertised after briefing");
});
test("jackrabbit: a hidden gated exit still works (and refuses) when tried by name", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    // 'out' is hidden but typing it still yields the gate's refusal, not
    // "you can't go out from here".
    captured.length = 0;
    engine.submit("go out");
    assert(flatOutput().includes("business here isn't finished"), "gate refusal still fires for hidden exit");
});
test("look <noun> behaves like examine", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: "A room.", exits: {}, items: ["rock"], npcs: [] } },
        items: { rock: { id: "rock", name: "rock", description: "A grey rock.", takeable: false } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    engine.submit("look rock");
    assert(flatOutput().includes("grey rock"), "look <noun> examined the rock");
});
test("look at <noun> also examines (preposition stripped)", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: "A room.", exits: {}, items: ["rock"], npcs: [] } },
        items: { rock: { id: "rock", name: "rock", description: "A grey rock.", takeable: false } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    engine.submit("look at rock");
    assert(flatOutput().includes("grey rock"), "look at <noun> examined the rock");
});
test("bare noun examines a matching item in scope", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: "A room.", exits: {}, items: ["panel"], npcs: [] } },
        items: { panel: { id: "panel", name: "control panel", aliases: ["panel"], description: "Lots of switches.", takeable: false } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    engine.submit("panel");
    assert(flatOutput().includes("Lots of switches"), "bare 'panel' examined it");
});
test("bare noun examines a matching NPC in scope", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: "A room.", exits: {}, items: [], npcs: ["bob"] } },
        npcs: { bob: { id: "bob", name: "Bob", description: "A nervous man.", topics: {} } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    engine.submit("bob");
    assert(flatOutput().includes("nervous man"), "bare 'bob' examined the NPC");
});
test("bare noun that resolves to nothing still says 'I don't understand'", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: "A room.", exits: {}, items: [], npcs: [] } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    engine.submit("xyzzy");
    assert(flatOutput().includes("don't understand"), "unknown bare noun is rejected");
});
test("virtual exits (no destination) are not advertised in the exit list", () => {
    const world = miniWorld({
        rooms: {
            lounge: {
                id: "lounge", name: "Lounge", description: "A lounge.",
                exits: {
                    aft: { to: "hall" },
                    cabin: { gated: () => "Nothing there." },
                    bed: { gated: () => "Nothing there." },
                },
                items: [], npcs: [],
            },
            hall: { id: "hall", name: "Hall", description: ".", exits: {}, items: [], npcs: [] },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    engine.submit("look");
    const out = flatOutput();
    assert(out.includes("aft"), "real exit listed");
    assert(!out.includes("cabin"), "virtual exit 'cabin' not listed");
    assert(!out.includes("bed"), "virtual exit 'bed' not listed");
    // But the virtual exit still works (gives its refusal) when typed.
    captured.length = 0;
    engine.submit("go cabin");
    assert(flatOutput().includes("Nothing there"), "virtual exit still refuses when used");
});
test("shuttle1: 'pull airlock lever' resolves the lever (alias polish)", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    engine.submit("aft");
    engine.submit("aft");
    engine.submit("open cover");
    captured.length = 0;
    engine.submit("pull airlock lever");
    // Either it kills you (cover open, in transit) — confirming it resolved
    // the lever rather than "there is no airlock lever here".
    assert(engine.state.dead, "airlock lever resolved and operated");
});
test("shuttle1: lever description reflects cover state (regression)", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    engine.submit("aft");
    engine.submit("aft"); // maintenance bay
    // Cover closed: description mentions the cover being closed/flippable.
    captured.length = 0;
    engine.submit("examine lever");
    assert(flatOutput().includes("flip of the thumb"), "closed-cover description");
    // Open the cover, re-examine: description must change.
    engine.submit("open cover");
    captured.length = 0;
    engine.submit("examine lever");
    const after = flatOutput();
    assert(after.includes("stands open"), "open-cover description");
    assert(!after.includes("flip of the thumb"), "no longer the closed description");
});
test("shuttle1: 'examine hatch' in the cabin resolves the access hatch", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out");
    captured.length = 0;
    engine.submit("examine hatch");
    assert(flatOutput().toLowerCase().includes("maintenance access"), "hatch description shown");
});
test("liner: passenger first-time greeting; repeat-asking about Horizon gives the observant beat", () => {
    const engine = bootToLiner();
    eq(engine.state.currentRoom, "liner_lounge", "in liner");
    captured.length = 0;
    engine.submit("talk passenger");
    assert(flatOutput().includes("Finally"), "first-time line");
    // Ask once: standard answer.
    captured.length = 0;
    engine.submit("ask passenger about horizon");
    assert(flatOutput().includes("nowhere like it"), "standard answer");
    // Ask again: observant beat.
    captured.length = 0;
    engine.submit("ask passenger about horizon");
    assert(flatOutput().includes("never been"), "observant beat on repeat");
});
test("liner: virtual exit 'go cabin' refuses with custom prose; no ticks spent", () => {
    const engine = bootToLiner();
    const before = { ticks: engine.state.ticks, turns: engine.state.turns };
    captured.length = 0;
    engine.submit("go cabin");
    eq(engine.state.currentRoom, "liner_lounge", "still in lounge");
    eq(engine.state.ticks, before.ticks, "no ticks for virtual-exit refusal");
    assert(flatOutput().includes("three doors down"), "custom refusal text");
});
test("liner -> shuttle 2 -> Horizon: talk + wait triggers the narrative modal then transitions", () => {
    const engine = bootToLiner();
    engine.submit("talk passenger"); // starts the disembark countdown
    // Two staged beats, timed from the conversation: the departure announcement,
    // then the shuttle-2 approach. The interruptible wait stops at the
    // announcement first, so a second wait carries on to the approach.
    engine.submit("wait 30"); // stops at the announcement
    engine.submit("wait 30"); // carries on; pushes the modal
    assert(engine.inModalMode(), "shuttle 2 narrative modal active");
    engine.submit(""); // bare ENTER -> requestSceneTransition
    eq(engine.state.currentRoom, "horizon_arrival_concourse", "arrived at Horizon stub");
    assert(!engine.inModalMode(), "modal popped after disembark");
});
test("liner: beats are timed from the conversation, not boarding — no pile-up (regression)", () => {
    // Reported bug: a player who waited a long time BEFORE talking then saw the
    // announcement AND the approach fire on the same turn. The countdown now
    // starts when they talk, so the announcement comes first and on its own.
    const engine = bootToLiner();
    engine.submit("wait 100"); // dawdle a long time before talking
    captured.length = 0;
    engine.submit("talk passenger"); // starts the countdown now
    const afterTalk = flatOutput();
    assert(afterTalk.includes("Going to Horizon"), "got the greeting");
    assert(!afterTalk.includes("disembarkation"), "announcement did NOT fire on the talk turn");
    assert(!engine.inModalMode(), "approach did NOT fire on the talk turn");
    // The announcement is the next beat, on its own.
    captured.length = 0;
    engine.submit("wait 30");
    assert(flatOutput().includes("disembarkation"), "announcement fires after talking");
    assert(!engine.inModalMode(), "approach has NOT also fired");
});
test("modal: a bare ENTER advances a press-enter modal (regression)", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    let advanced = false;
    engine.pushModal({
        onEnter: () => ["Press ENTER to continue."],
        onInput: () => { advanced = true; return { pop: true }; },
    });
    engine.submit(""); // bare Enter
    assert(advanced, "empty input reached the modal");
    assert(!engine.inModalMode(), "modal popped");
});
test("input: a bare ENTER in normal play is a complete no-op (no echo)", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    engine.submit("   ");
    eq(captured.length, 0, "nothing rendered at all for a bare Enter");
});
test("jackrabbit: tapping the ID on the lobby terminal gives a humorous rejection (not 'achieves nothing')", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry"); // get the ID issued
    engine.submit("go south"); // lobby (terminal is here)
    captured.length = 0;
    engine.submit("use id on terminal");
    const out = flatOutput();
    assert(out.includes("ACCESS DENIED"), "got the rejection flavour");
    assert(!out.includes("achieves nothing"), "no longer the generic message");
});
// --- Scoring -------------------------------------------------------------
test("scoring: a full non-lethal pre-Horizon run banks the pre-Horizon points (19)", () => {
    const engine = makeJackrabbit();
    engine.start();
    // Form (+1)
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    eq(engine.state.score, 1, "form complete = 1");
    engine.submit("go north");
    engine.submit("talk miss terry"); // talk Terry (+1)
    engine.submit("ask terry about person of interest"); // (+2)
    engine.submit("read contract"); // (+1)
    engine.submit("tap id on datapad"); // check balance (+1)
    engine.submit("go south");
    engine.submit("use id on terminal"); // ID on terminal (+2) => 8
    eq(engine.state.score, 8, "halberd phase total = 8");
    engine.submit("go out");
    engine.submit("aft");
    engine.submit("aft"); // maintenance bay (+1) => 9
    engine.submit("read label"); // warning label (+1) => 10
    // Dock without dying: wait to warning, wait to dock, then pull the (now
    // harmless) lever for the +5.
    engine.submit("wait 30"); // approach warning
    engine.submit("wait 30"); // docks
    engine.submit("open cover");
    engine.submit("pull lever"); // harmless post-dock pull (+5) => 15
    assert(!engine.state.dead, "did not die — pulled after docking");
    eq(engine.state.score, 15, "shuttle phase total = 15");
    // The 'out' exit to the liner is on the cabin — walk forward from the bay.
    engine.submit("forward");
    engine.submit("forward"); // back to cabin
    engine.submit("go out"); // to liner
    engine.submit("talk passenger"); // (+1) => 16
    engine.submit("ask passenger about horizon"); // first (+1) => 17
    engine.submit("ask passenger about horizon"); // second (+2) => 19
    eq(engine.state.score, 19, "pre-Horizon perfect run = 19");
    // Horizon hooks now exist, so the pre-Horizon run no longer maxes the score.
    assert(engine.state.maxScore > 19, "maxScore exceeds the pre-Horizon total once Horizon hooks exist");
});
test("scoring: hooks are idempotent — repeating actions doesn't double-score", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    engine.submit("talk miss terry"); // again — no extra point
    engine.submit("ask terry about person of interest");
    engine.submit("ask terry about person of interest"); // again — no extra
    const afterTerry = engine.state.score; // 1 (form) +1 +2 = 4
    eq(afterTerry, 4, "no double-scoring on repeats");
});
test("scoring: pulling the lever in transit awards the 5 points even though it kills you", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    engine.submit("go south");
    engine.submit("go out");
    engine.submit("aft");
    engine.submit("aft"); // maintenance (+1)
    const before = engine.state.score;
    engine.submit("open cover");
    engine.submit("pull lever"); // in transit -> death, but +5
    assert(engine.state.dead, "died");
    eq(engine.state.score - before, 5, "lever still scored 5 on the lethal pull");
});
test("scoring: a blocked lever pull (cover closed) scores nothing", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    engine.submit("go south");
    engine.submit("go out");
    engine.submit("aft");
    engine.submit("aft"); // maintenance (+1)
    const before = engine.state.score;
    engine.submit("pull lever"); // cover closed -> blocked, lever doesn't move
    assert(!engine.state.dead, "not dead");
    eq(engine.state.score, before, "blocked attempt scored nothing");
});
test("scoring: check balance via 'check balance' and 'tap id on datapad' score the same hook once", () => {
    const engine = makeJackrabbit();
    engine.start();
    for (const line of ["Foo", "1", "Real", "yes"])
        engine.submit(line);
    engine.submit("go north");
    engine.submit("talk miss terry");
    const before = engine.state.score;
    engine.submit("check balance"); // +1
    engine.submit("tap id on datapad"); // same hook, no extra
    engine.submit("check balance"); // still no extra
    eq(engine.state.score - before, 1, "balance hook scored exactly once across both routes");
});
// --- Phase B slice 1: Horizon Dockyard spine ----------------------------
test("horizon: shuttle 2 lands the player on the real arrival concourse", () => {
    const engine = bootToHorizon();
    eq(engine.state.currentRoom, "horizon_arrival_concourse", "arrived on Horizon");
    // No longer the old stub text.
    captured.length = 0;
    engine.submit("look");
    assert(!flatOutput().includes("not yet built"), "stub text is gone");
    assert(flatOutput().includes("Arrival Concourse") || flatOutput().includes("concourse"), "real concourse description");
});
test("horizon: arrival scores the arrived hook once", () => {
    const engine = bootToHorizon();
    assert(engine.state.scoreHooks.has("arrived_horizon"), "arrived hook fired");
});
/** Walk from the arrival concourse, through the docking zones and Food Hall, to
 *  the Retail tube stop. Concourse →E zone A →E B →E C →N food hall (zone 3)
 *  →N zone 2 →N zone 1 →N Retail. */
function walkToRetailStop(engine) {
    engine.submit("east"); // Docking Zone A
    engine.submit("east"); // Zone B
    engine.submit("east"); // Zone C
    engine.submit("north"); // Food Hall (south end / zone 3)
    engine.submit("north"); // zone 2
    engine.submit("north"); // zone 1
    engine.submit("north"); // Retail (nearest tube stop)
}
/** From the concourse to the Retail Area's public-terminal alcove (off Zone 3). */
function walkToRetailTerminal(engine) {
    walkToRetailStop(engine); // → Retail Zone 1 (the stop)
    engine.submit("north"); // Zone 2
    engine.submit("north"); // Zone 3
    engine.submit("east"); // public-terminal alcove
}
/** Walk from the arrival concourse to the Food Hall south end (zone 3). */
function walkToFoodHall(engine) {
    engine.submit("east"); // Zone A
    engine.submit("east"); // Zone B
    engine.submit("east"); // Zone C
    engine.submit("north"); // Food Hall (zone 3)
}
/** From the arrival concourse, ride the 'Tube to Donovan's (Blue Sector). */
function rideToDonovans(engine) {
    walkToRetailStop(engine); // concourse → … → Retail (the nearest stop)
    engine.submit("summon"); // summon a pod (no-prompt shortcut)
    engine.submit("board"); // enter the pod
    engine.submit("select blue sector"); // choose destination (does not depart)
    engine.submit("sit"); // sitting departs the pod
    engine.submit("wait 10"); // ride (interruptible; stops on arrival)
    engine.submit("disembark"); // step out at the Blue stop
    engine.submit("north"); // Blue stop → Donovan's
}
test("horizon: cardinal directions — concourse ↔ dock desk (north/south)", () => {
    const engine = bootToHorizon();
    engine.submit("north"); // to dock desk
    eq(engine.state.currentRoom, "horizon_dock_desk", "north → dock desk");
    engine.submit("talk barty");
    assert(engine.state.scoreHooks.has("talked_to_barty"), "talked to Barty");
    engine.submit("south"); // back to concourse
    eq(engine.state.currentRoom, "horizon_arrival_concourse", "south → concourse");
});
test("dockside: docking zones A–D spine, bays, and meeting suite reachable", () => {
    const engine = bootToHorizon();
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_docking_zone_a", "concourse E → Zone A");
    engine.submit("south");
    eq(engine.state.currentRoom, "horizon_docking_bay_1_12_access", "Zone A S → bays 1–12");
    engine.submit("north");
    engine.submit("east");
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_docking_zone_c", "→ Zone C");
    engine.submit("north");
    eq(engine.state.currentRoom, "horizon_food_hall_zone_3", "Zone C N → Food Hall (cross-area link)");
    engine.submit("south");
    eq(engine.state.currentRoom, "horizon_docking_zone_c", "and back");
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_docking_zone_d", "→ Zone D");
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_dockside_corridor", "Zone D E → corridor");
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_meeting_rooms_access", "→ meeting rooms");
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_meeting_room_2", "access E → room 2");
});
test("horizon: walk dock → Food Hall → Retail (nearest tube stop)", () => {
    const engine = bootToHorizon();
    walkToRetailStop(engine); // concourse → z3 → z2 → z1 → retail
    eq(engine.state.currentRoom, "horizon_dockside_retail_area_zone_1", "promenade ends at Retail (tube stop)");
});
test("horizon: full TravelTube journey scan→board→select→ride→arrive at Donovan's", () => {
    const engine = bootToHorizon();
    rideToDonovans(engine);
    eq(engine.state.currentRoom, "horizon_donovans_lobby", "arrived at Donovan's via the 'Tube");
    assert(engine.state.scoreHooks.has("rode_traveltube"), "rode-the-tube hook");
    assert(engine.state.scoreHooks.has("reached_donovans"), "reached-Donovan's hook");
    engine.submit("talk donovan");
    assert(engine.state.scoreHooks.has("talked_to_donovan"), "talked to Donovan");
});
test("horizon: 'use id on reader' also summons a pod", () => {
    const engine = bootToHorizon();
    walkToRetailStop(engine); // to the retail stop
    captured.length = 0;
    engine.submit("use id on reader");
    assert(flatOutput().includes("green flash"), "ID-on-reader summons a pod");
    eq(engine.state.flags["pod_summoned_at"], "horizon_dockside_retail_area_zone_1", "pod summoned at this stop");
});
test("horizon: pod ride occupies real turns, then waits for you to disembark", () => {
    const engine = bootToHorizon();
    walkToRetailStop(engine);
    engine.submit("summon");
    engine.submit("board");
    eq(engine.state.currentRoom, "travelpod", "aboard the pod");
    engine.submit("select blue sector"); // choose only
    eq(engine.state.currentRoom, "travelpod", "selecting does not depart");
    assert(!engine.state.flags["pod_moving"], "still stationary after select");
    engine.submit("sit"); // depart
    assert(engine.state.flags["pod_moving"], "sitting departs the pod");
    engine.submit("wait");
    eq(engine.state.currentRoom, "travelpod", "still in transit after 1 tick");
    engine.submit("wait 10"); // finish the ride
    eq(engine.state.currentRoom, "travelpod", "arrives but stays aboard (proactive disembark)");
    eq(engine.state.flags["pod_at"], "horizon_blue_sector_concourse", "pod now docked at the Blue stop");
    assert(engine.state.scoreHooks.has("rode_traveltube"), "rode-the-tube hook on arrival");
    engine.submit("disembark");
    eq(engine.state.currentRoom, "horizon_blue_sector_concourse", "disembarked onto the Blue platform");
});
test("horizon: pod waits for SIT, lets you change your mind, forbids standing in transit", () => {
    const engine = bootToHorizon();
    walkToRetailStop(engine);
    captured.length = 0;
    engine.submit("select blue sector"); // not aboard yet
    assert(flatOutput().toLowerCase().includes("nothing here to select"), "select refused off-pod");
    engine.submit("summon");
    engine.submit("board");
    engine.submit("select blue sector");
    engine.submit("disembark"); // change your mind before departing
    eq(engine.state.currentRoom, "horizon_dockside_retail_area_zone_1", "stepped back out, never departed");
    // Board again, commit this time.
    engine.submit("summon");
    engine.submit("board");
    engine.submit("select blue sector");
    engine.submit("sit");
    captured.length = 0;
    engine.submit("stand"); // no standing in motion
    assert(flatOutput().includes("No standing"), "standing refused in transit");
    captured.length = 0;
    engine.submit("disembark"); // and no disembark in motion
    assert(flatOutput().includes("sealed"), "disembark refused in motion");
});
test("blue sector: concourse → lobby (Donovan) → lavatory / dining / lift", () => {
    const engine = bootToHorizon();
    rideToDonovans(engine); // disembark at the concourse → north to the lobby
    eq(engine.state.currentRoom, "horizon_donovans_lobby", "arrived in Donovan's lobby");
    assert(engine.state.scoreHooks.has("reached_donovans"), "reached-base hook fired");
    engine.submit("talk donovan");
    assert(engine.state.scoreHooks.has("talked_to_donovan"), "Donovan is in the lobby");
    engine.submit("west");
    eq(engine.state.currentRoom, "horizon_donovan_s_lavatory", "W → guest lavatory");
    engine.submit("east");
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_donovan_s_dining_room", "E → dining room");
    engine.submit("west");
    engine.submit("north");
    eq(engine.state.currentRoom, "horizon_donovan_s_lift_l1", "N → lift (ground)");
    engine.submit("south");
    eq(engine.state.currentRoom, "horizon_donovans_lobby", "lift S → lobby");
});
test("lift: select a floor rides to that level; step out onto it; floors are lift-only", () => {
    const engine = bootToHorizon();
    rideToDonovans(engine); // in the lobby (ground)
    engine.submit("north"); // into the ground-floor lift car
    eq(engine.state.currentRoom, "horizon_donovan_s_lift_l1", "in the lift (ground)");
    // ride to the Penthouse (level 5)
    engine.submit("select penthouse");
    eq(engine.state.currentRoom, "horizon_donovan_s_lift_l5", "rode to the penthouse lift car");
    engine.submit("south");
    eq(engine.state.currentRoom, "horizon_donovan_s_pentouse", "stepped out into the penthouse");
    // back into the lift, down to the Second Floor by name
    engine.submit("north");
    engine.submit("select second");
    eq(engine.state.currentRoom, "horizon_donovan_s_lift_l3", "rode to the second-floor lift car");
    engine.submit("south");
    eq(engine.state.currentRoom, "horizon_donovan_s_landing_second_floor", "out onto the second-floor landing");
    // a guest room (force the allocation so its ID-keyed door opens), then back
    engine.state.flags["donovan_checked_in"] = true;
    engine.state.flags["donovan_room"] = "22";
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_donovan_s_room_22", "E → room 22 (your allocated door)");
});
test("donovan: only your allocated room opens; the ajar penthouse rewards snoopers (+2)", () => {
    const engine = bootToHorizon();
    rideToDonovans(engine); // lobby
    engine.submit("scan id"); // check in (random room allocated)
    engine.submit("no preference"); // answer Donovan's privacy modal
    engine.state.flags["donovan_room"] = "25"; // pin it for the test
    // Go up to the second floor and try a room that ISN'T yours.
    engine.submit("north");
    engine.submit("select second");
    engine.submit("south");
    captured.length = 0;
    engine.submit("east"); // room 22 — not yours
    eq(engine.state.currentRoom, "horizon_donovan_s_landing_second_floor", "someone else's door won't open");
    assert(flatOutput().includes("Room 25"), "told which room is yours");
    // Your own door opens (room 25 is west off the third landing segment).
    engine.submit("south");
    engine.submit("south"); // to the b-landing
    engine.submit("west");
    eq(engine.state.currentRoom, "horizon_donovan_s_room_25", "your card opens Room 25");
    // The penthouse is ajar — snooping it scores once.
    const before = engine.state.score;
    engine.state.currentRoom = "horizon_donovan_s_lift_l5";
    engine.submit("south");
    eq(engine.state.currentRoom, "horizon_donovan_s_pentouse", "let yourself into the ajar penthouse");
    assert(engine.state.scoreHooks.has("donovan_penthouse_snoop"), "snooping the penthouse scores");
    eq(engine.state.score, before + 2, "+2 for the nosey detour");
});
test("blue sector: structural — every exit is reciprocal and points at a real room", () => {
    const w = jackrabbitWorld;
    const opp = { north: "south", south: "north", east: "west", west: "east", up: "down", down: "up" };
    const ids = Object.keys(w.rooms).filter(id => id === "horizon_blue_sector_concourse" || id.startsWith("horizon_donovan") || id.startsWith("horizon_landing"));
    assert(ids.length >= 30, `expected the full multi-level Donovan's (got ${ids.length} rooms)`);
    for (const id of ids) {
        const room = w.rooms[id];
        for (const [dir, def] of Object.entries(room.exits)) {
            if (!def || !def.to)
                continue;
            const dest = w.rooms[def.to];
            assert(dest, `${id} ${dir} → ${def.to} (no such room)`);
            const back = dest.exits[opp[dir]];
            assert(back && back.to === id, `${id} ${dir} → ${def.to} is not reciprocal`);
        }
    }
});
test("lift: selecting the current floor is a no-op; unknown floor is refused", () => {
    const engine = bootToHorizon();
    rideToDonovans(engine);
    engine.submit("north"); // ground lift car
    captured.length = 0;
    engine.submit("select ground");
    assert(flatOutput().includes("already at"), "selecting the current floor no-ops");
    eq(engine.state.currentRoom, "horizon_donovan_s_lift_l1", "didn't move");
    captured.length = 0;
    engine.submit("select basement");
    assert(flatOutput().includes("no floor"), "unknown floor refused");
});
// --- Shipyard (4 mapped areas + 3 lifts + 3 cross-area joins) ------------
test("shipyard: reachable by TravelTube; reception is the stop", () => {
    const engine = bootToHorizon();
    walkToRetailStop(engine);
    engine.submit("summon");
    engine.submit("board");
    engine.submit("select shipyard");
    engine.submit("sit");
    engine.submit("wait 12");
    engine.submit("disembark");
    eq(engine.state.currentRoom, "horizon_shipyard_reception", "arrived at the shipyard reception stop");
});
test("shipyard: structural — every exit reciprocal & real across all four areas + joins", () => {
    const w = jackrabbitWorld;
    const opp = { north: "south", south: "north", east: "west", west: "east", up: "down", down: "up" };
    const ids = Object.keys(shipyardRooms);
    assert(ids.length >= 50, `expected the full shipyard (got ${ids.length} rooms)`);
    for (const id of ids) {
        const room = w.rooms[id];
        for (const [dir, def] of Object.entries(room.exits)) {
            if (!def || !def.to)
                continue;
            const dest = w.rooms[def.to];
            assert(dest, `${id} ${dir} → ${def.to} (no such room)`);
            const back = dest.exits[opp[dir]];
            assert(back && back.to === id, `${id} ${dir} → ${def.to} is not reciprocal`);
        }
    }
});
test("shipyard: Lift A rides between the bay floors", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_shipyard_lift_a_l1";
    engine.submit("select medium"); // level 3 (medium bays)
    eq(engine.state.currentRoom, "horizon_shipyard_lift_a_l3", "rode Lift A to level 3");
    engine.submit("north");
    eq(engine.state.currentRoom, "horizon_outside_medium_bay_1", "stepped out onto the medium-bay floor");
});
test("shipyard: the three cross-area joins connect A↔B, B↔C, and C↔the Untheatrical", () => {
    const engine = bootToHorizon();
    // Join 1: Shipyard A ↔ B (outside medium bay 3 ↔ 4)
    engine.state.currentRoom = "horizon_outside_medium_bay_3";
    engine.submit("west");
    eq(engine.state.currentRoom, "horizon_outside_medium_bay_4", "A→B");
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_outside_medium_bay_3", "B→A reciprocal");
    // Join 2: B (Accessway) ↔ C (Lift C, level 1)
    engine.state.currentRoom = "horizon_accessway";
    engine.submit("west");
    eq(engine.state.currentRoom, "horizon_shipyard_lift_c_l1", "Accessway → Lift C");
    // up to the hub (HOLD first — the cage is lethal un-held), then Join 3: C ↔ Untheatrical
    engine.submit("hold");
    engine.submit("select hub");
    eq(engine.state.currentRoom, "horizon_shipyard_lift_c_l2", "Lift C → hub level");
    engine.submit("north");
    eq(engine.state.currentRoom, "horizon_hub_shipyard", "out at the hub");
    engine.submit("north");
    eq(engine.state.currentRoom, "horizon_untheatrical_airlock", "Hub → Untheatrical airlock");
    engine.submit("north");
    engine.submit("north");
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_untheatrical_bridge", "...on through to the bridge");
});
// --- Shipyard Lift C death (HOLD ON) -------------------------------------
test("lift C: riding UP without a grip flings you to your death", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_shipyard_lift_c_l1"; // accessway level
    engine.submit("select hub"); // up, un-held
    assert(engine.state.dead, "splat: carried through the hub");
    assert((engine.state.deathReason ?? "").includes("HOLD ON"), "death blames the un-held ride");
});
test("lift C: HOLD first and the ride up is safe", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_shipyard_lift_c_l1";
    engine.submit("hold");
    engine.submit("select hub");
    assert(!engine.state.dead, "survived with a grip");
    eq(engine.state.currentRoom, "horizon_shipyard_lift_c_l2", "rode up to the hub level");
});
test("lift C: descending un-held strands you — a one-turn grace to grab on", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_shipyard_lift_c_l2"; // hub level
    engine.submit("select accessway"); // down, un-held
    assert(!engine.state.dead, "not instantly fatal going down");
    eq(engine.state.currentRoom, "horizon_shipyard_lift_c_l2", "left behind as the cage drops");
    assert(engine.state.flags["lift_c_falling_at"] !== undefined, "adrift in the shaft");
    engine.submit("hold"); // grab on within the grace
    eq(engine.state.currentRoom, "horizon_hub_shipyard", "hauled to safety at the hub");
    assert(!engine.state.dead, "saved");
    assert(engine.state.flags["lift_c_falling_at"] === undefined, "no longer falling");
});
test("lift C: miss the grace and you follow the cage down, fatally", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_shipyard_lift_c_l2";
    engine.submit("select accessway"); // un-held descent
    engine.submit("wait"); // dither instead of grabbing
    assert(engine.state.dead, "caught up with the cage at the bottom");
    assert((engine.state.deathReason ?? "").includes("HOLD ON"), "same fatal cause");
});
// --- YAML → world helper (mapper output ingestion) -----------------------
const SAMPLE_AREA_YAML = `
# Generated by tools/mapper.html
area: demo
areaName: "Demo Tower"
levels: 2
lift: demo_lift
stop: demo_concourse
rooms:
  - id: demo_concourse
    level: 1
    name: "Concourse"
    stop: true
    exits:
      north: demo_lobby
  - id: demo_lobby
    level: 1
    name: "Lobby"
    exits:
      south: demo_concourse
      north: demo_lift_l1
  - id: demo_lift_l1
    level: 1
    name: "Lift"
    lift: true
    exits:
      south: demo_lobby
  - id: demo_room
    level: 2
    name: "Upper Room"
    exits:
      north: demo_lift_l2
  - id: demo_lift_l2
    level: 2
    name: "Lift"
    lift: true
    exits:
      south: demo_room
`;
test("yaml: buildAreaFromYaml turns mapper output into rooms + exits, with overrides", () => {
    const { rooms, parsed } = buildAreaFromYaml(SAMPLE_AREA_YAML, {
        defaultDescription: (r) => (r.lift ? "LIFTCAR" : `desc:${r.name}`),
        rooms: { demo_lobby: { description: "the lobby", items: ["x"] } },
    });
    eq(parsed.levels, 2, "levels parsed");
    eq(parsed.lift, "demo_lift", "lift base parsed");
    eq(parsed.stop, "demo_concourse", "stop parsed");
    // exits wired (string targets → ExitDef{to})
    eq(rooms["demo_lobby"].exits.north?.to, "demo_lift_l1", "lobby north → lift l1");
    eq(rooms["demo_lift_l1"].exits.south?.to, "demo_lobby", "lift l1 south → lobby");
    eq(rooms["demo_room"].exits.north?.to, "demo_lift_l2", "upper room → lift l2");
    // overrides + defaults
    eq(rooms["demo_lobby"].description, "the lobby", "per-room description override");
    eq(rooms["demo_lobby"].items[0], "x", "per-room items override");
    eq(rooms["demo_lift_l1"].description, "LIFTCAR", "default description dispatched by lift flag");
    eq(rooms["demo_concourse"].name, "Concourse", "name carried from yaml");
});
test("area: buildArea signposts each exit with the destination's short name", () => {
    const w = jackrabbitWorld;
    const landing = w.rooms["horizon_donovan_s_landing_second_floor"];
    eq(landing.exits.north?.description, "Lift", "north → Lift");
    eq(landing.exits.east?.description, "Room 22", "east → Room 22");
    eq(landing.exits.west?.description, "Room 21", "west → Room 21");
    // Cross-area exits (to rooms outside the def set) stay unlabelled.
    const zoneC = w.rooms["horizon_docking_zone_c"];
    assert(zoneC.exits.north && !zoneC.exits.north.description, "cross-area exit (→ Food Hall) is unlabelled");
});
test("yaml: liftDefFromYaml builds lift floors from the parsed area", () => {
    const { parsed } = buildAreaFromYaml(SAMPLE_AREA_YAML);
    const def = liftDefFromYaml(parsed, {
        1: { label: "Ground", names: ["ground", "g"] },
        2: { label: "Upper", names: ["upper", "2"] },
    });
    eq(def.id, "demo_lift", "lift id from yaml");
    eq(def.floors.length, 2, "one floor per level");
    eq(def.floors[0].room, "demo_lift_l1", "floor-1 instance id derived");
    eq(def.floors[1].room, "demo_lift_l2", "floor-2 instance id derived");
    eq(def.floors[0].label, "Ground", "labels applied");
});
test("horizon: Barty is a loyalty wall — deflects the Jackrabbit", () => {
    const engine = bootToHorizon();
    engine.submit("talk barty");
    captured.length = 0;
    engine.submit("ask barty about jackrabbit");
    const out = flatOutput();
    assert(out.includes("I wouldn't, whoever it was") || out.includes("don't pass it on"), "Barty deflects rather than divulges");
    assert(engine.state.scoreHooks.has("asked_barty_sensitive"), "the refusal scores the sensitive hook");
});
test("horizon: Donovan is a loyalty wall — heard the name, never met him", () => {
    const engine = bootToHorizon();
    rideToDonovans(engine); // ends in Donovan's
    engine.submit("talk donovan");
    captured.length = 0;
    engine.submit("ask donovan about jackrabbit");
    assert(flatOutput().includes("not a conversation I have"), "Donovan: a settled, personal refusal");
});
test("donovan: the grey-market hint scores once (+2) and is idempotent", () => {
    const engine = bootToHorizon();
    rideToDonovans(engine);
    const before = engine.state.score;
    engine.submit("ask donovan about market");
    assert(engine.state.scoreHooks.has("donovan_grey_market_hint"), "grey-market hook fired");
    eq(engine.state.score, before + 2, "scored +2");
    engine.submit("ask donovan about unofficial"); // ask again
    eq(engine.state.score, before + 2, "no double-score (idempotent)");
});
test("donovan: greeting is full on the first visit, short once welcomed", () => {
    const engine = bootToHorizon();
    rideToDonovans(engine);
    captured.length = 0;
    engine.submit("talk donovan"); // first visit
    assert(flatOutput().toLowerCase().includes("good to see you made it"), "full first-visit greeting");
    engine.submit("scan id"); // check in (sets welcomed)
    engine.submit("whatever"); // dismiss privacy modal
    captured.length = 0;
    engine.submit("talk donovan"); // repeat visit
    assert(flatOutput().toLowerCase().includes("help yourself"), "short repeat greeting");
    assert(!flatOutput().toLowerCase().includes("good to see you made it"), "no longer the first-visit line");
});
test("barty: leaves the concourse for good once seen at his desk", () => {
    const engine = bootToHorizon(); // concourse — Barty greeting arrivals
    engine.submit("look");
    assert(flatOutput().includes("Bartram"), "Barty starts on the concourse");
    engine.submit("north"); // to his desk → he settles here
    assert(flatOutput().includes("Bartram"), "Barty is at his desk");
    engine.submit("south"); // back to the concourse
    captured.length = 0;
    engine.submit("look");
    assert(!flatOutput().includes("Bartram"), "Barty no longer on the concourse after the desk");
    // ...and he's still single-located at the desk.
    engine.submit("north");
    assert(flatOutput().includes("Bartram"), "still found at the desk");
});
// --- NPC pathing primitives + pursuit ------------------------------------
test("npc pathing: nextHopToward / stepNpcToward walk a shortest route", () => {
    const state = createInitialState(jackrabbitWorld);
    // concourse →E zone A →E zone B: first hop toward B is zone A.
    eq(nextHopToward(jackrabbitWorld, state, "horizon_arrival_concourse", "horizon_docking_zone_b"), "horizon_docking_zone_a", "BFS picks the right first hop");
    placeNpcInRoom(state, "donovan", "horizon_docking_zone_b");
    eq(stepNpcToward(jackrabbitWorld, state, "donovan", "horizon_arrival_concourse"), "horizon_docking_zone_a", "stepped one room closer to the target");
});
/** Tiny linear world r0(safe) — r1 — r2 — r3(mugger) for pursuit tests. */
function makePursuitEngine(hooks) {
    const mk = (id, exits, npcs = []) => ({
        id, name: id.toUpperCase(), description: "",
        exits: Object.fromEntries(Object.entries(exits).map(([d, to]) => [d, { to }])),
        items: [], npcs,
    });
    const world = {
        title: "pursuit", startRoom: "r1", maxScore: 0,
        rooms: {
            r0: mk("r0", { east: "r1" }),
            r1: mk("r1", { west: "r0", east: "r2" }),
            r2: mk("r2", { west: "r1", east: "r3" }),
            r3: mk("r3", { west: "r2" }, ["mugger"]),
        },
        items: {},
        npcs: { mugger: { id: "mugger", name: "the mugger", description: "trouble" } },
    };
    world.onTick = makePursuer({
        npcId: "mugger", world,
        isSafe: (room) => room === "r0",
        onApproach: () => { hooks.approached?.(); return "Footsteps, closer now."; },
        onCatch: (s) => { hooks.caught?.(); s.dead = true; s.deathReason = "Mugged."; return "A hand closes on your shoulder."; },
        onEscape: () => { hooks.escaped?.(); return "You duck into the light; the steps fall away."; },
    });
    return makeEngineFrom(world);
}
test("pursuit: an NPC closes on the PC and catches them if they dawdle", () => {
    let caught = false, approached = false;
    const engine = makePursuitEngine({ caught: () => (caught = true), approached: () => (approached = true) });
    engine.start(); // PC at r1; mugger at r3
    engine.submit("wait"); // mugger r3 → r2 (now one room behind)
    assert(approached, "approach telegraphed when one room behind");
    assert(!caught, "not caught yet");
    engine.submit("wait"); // mugger r2 → r1 = caught
    assert(caught, "caught after dawdling");
    assert(engine.state.dead, "onCatch killed the PC");
});
test("pursuit: reaching a safe room breaks off the chase", () => {
    let caught = false, escaped = false;
    const engine = makePursuitEngine({ caught: () => (caught = true), escaped: () => (escaped = true) });
    engine.start(); // PC at r1
    engine.submit("west"); // into r0 (safe) before the mugger arrives
    assert(escaped, "escaped into the safe room");
    assert(!caught, "not caught");
    engine.submit("wait");
    engine.submit("wait");
    assert(!caught, "chase stays broken off afterwards");
});
// --- the curry death (and its ice-cream antidote) ------------------------
test("curry: the spice is lethal if no relief comes within the window", () => {
    const engine = bootToHorizon();
    engine.state.inventory.push("curry");
    engine.state.flags["food_bought_curry"] = engine.state.ticks; // fresh
    const before = engine.state.score;
    engine.submit("eat curry");
    assert(!engine.state.dead, "not instantly fatal — there's a window");
    assert(engine.state.flags["spice_death_at"] !== undefined, "the spice clock is running");
    assert(engine.state.score > before, "eating the curry scores (many points for the bravado)");
    assert(engine.state.notes.some(n => n.id === "curry_dare"), "the dare is jotted down");
    engine.submit("wait");
    engine.submit("wait");
    engine.submit("wait");
    assert(engine.state.dead, "died of spice once the window closed");
    assert((engine.state.deathReason ?? "").includes("curry"), "death attributed to the curry");
});
test("curry: an UNMELTED ice cream within the window saves you", () => {
    const engine = bootToHorizon();
    engine.state.inventory.push("curry", "ice_cream");
    engine.state.flags["food_bought_curry"] = engine.state.ticks;
    engine.state.flags["food_bought_ice_cream"] = engine.state.ticks; // fresh, unmelted
    engine.submit("eat curry");
    const afterCurry = engine.state.score;
    captured.length = 0;
    engine.submit("eat ice cream");
    assert(flatOutput().includes("gutters") || flatOutput().includes("Saved"), "the inferno is quenched");
    assert(engine.state.flags["spice_death_at"] === undefined, "spice clock cleared");
    assert(engine.state.score > afterCurry, "surviving scores a few more points");
    assert(engine.state.notes.some(n => n.id === "curry_survived"), "the antidote lesson is jotted down");
    engine.submit("wait");
    engine.submit("wait");
    engine.submit("wait");
    engine.submit("wait");
    assert(!engine.state.dead, "out of danger");
});
test("curry: a MELTED ice cream is no antidote — you still die", () => {
    const engine = bootToHorizon();
    engine.state.inventory.push("curry", "ice_cream");
    engine.state.flags["food_bought_curry"] = engine.state.ticks;
    engine.state.flags["food_bought_ice_cream"] = engine.state.ticks - 50; // long melted
    engine.submit("eat curry");
    captured.length = 0;
    engine.submit("eat ice cream");
    assert(flatOutput().includes("no help"), "the melted cone doesn't cure");
    assert(engine.state.flags["spice_death_at"] !== undefined, "still doomed");
    engine.submit("wait");
    engine.submit("wait");
    engine.submit("wait");
    assert(engine.state.dead, "the spice finishes the job");
});
// --- the Shame Alarm (littering) -----------------------------------------
test("shame: dropping litter in public trips the alarm and gathers a crowd", () => {
    const engine = bootToHorizon(); // arrival concourse (public)
    engine.state.inventory.push("ice_cream"); // some litter to drop
    captured.length = 0;
    engine.submit("drop ice cream");
    const out = flatOutput();
    assert(out.includes("SHAME ALARM"), "the alarm broadcasts");
    assert(out.includes("semicircle"), "a crowd gathers the same turn");
    eq(engine.state.flags["shame_room"], "horizon_arrival_concourse", "shame is active here");
});
test("shame: picking the litter back up earns grudging forgiveness", () => {
    const engine = bootToHorizon();
    engine.state.inventory.push("ice_cream");
    engine.submit("drop ice cream");
    captured.length = 0;
    engine.submit("take ice cream");
    assert(flatOutput().includes("does not forget"), "crowd relents on tidy-up");
    assert(engine.state.flags["shame_room"] === undefined, "shame cleared");
});
test("shame: fleeing the scene leaves you shamed in absentia", () => {
    const engine = bootToHorizon();
    engine.state.inventory.push("ice_cream");
    engine.submit("drop ice cream");
    captured.length = 0;
    engine.submit("east"); // walk off, litter left behind
    assert(flatOutput().includes("walk a little faster"), "shamed as you leave");
    assert(engine.state.flags["shame_room"] === undefined, "shame cleared on flight");
});
test("shame: no alarm in private/non-Horizon space", () => {
    const engine = bootToLiner(); // the liner lounge — not Horizon
    engine.state.inventory.push("ice_cream");
    captured.length = 0;
    engine.submit("drop ice cream");
    assert(!flatOutput().includes("SHAME ALARM"), "no civic shaming off-station");
});
// --- B4a: the predecessor's cubbyhole ------------------------------------
/** From the arrival concourse, walk to the dock-end lavatory (off Food Hall zone 3). */
function walkToLavatory(engine) {
    walkToFoodHall(engine); // concourse → Zone C → Food Hall zone 3
    engine.submit("west"); // zone 3 → lavatory
}
test("predecessor: prising the panel reveals the kit, scores, and adds a note", () => {
    const engine = bootToHorizon();
    walkToLavatory(engine);
    eq(engine.state.currentRoom, "horizon_unisex_lavatory", "at the lavatory");
    captured.length = 0;
    engine.submit("open panel");
    assert(flatOutput().includes("same model as your own"), "the identical-datapad foreshadow");
    assert(engine.state.scoreHooks.has("found_predecessor_kit"), "scored the discovery");
    assert(engine.state.notes.some(n => n.id === "predecessor_kit"), "journal note added");
    // The weathered datapad is now present and takeable.
    engine.submit("take weathered datapad");
    assert(engine.state.inventory.includes("predecessor_datapad"), "picked up the datapad");
});
test("predecessor: brief, diary AND creds are all locked until the 'pad is cracked", () => {
    const engine = bootToHorizon();
    walkToLavatory(engine);
    engine.submit("open panel");
    engine.submit("take weathered datapad"); // carries the hidden sub-docs along
    engine.submit("east"); // leave the lavatory — docs still in scope
    // Before cracking: the diary won't open, and scores nothing.
    captured.length = 0;
    engine.submit("read his diary");
    assert(flatOutput().toLowerCase().includes("won't open") || flatOutput().toLowerCase().includes("sealed"), "his diary is locked behind the device lock");
    assert(!engine.state.scoreHooks.has("read_predecessor_diary"), "no diary score while locked");
    // The brief is sealed too, and hints the failsafe.
    captured.length = 0;
    engine.submit("read his brief");
    assert(flatOutput().toLowerCase().includes("failsafe"), "the failsafe lead is hinted");
    assert(engine.state.notes.some(n => n.id === "predecessor_brief_locked"), "sealed-brief lead noted");
    // The saved login is sealed behind the lock too now — and banks nothing yet.
    captured.length = 0;
    engine.submit("read his credentials");
    assert(flatOutput().toLowerCase().includes("sealed") || flatOutput().toLowerCase().includes("won't open"), "credentials are locked until cracked");
    assert(!engine.state.flags["shipyard_creds"], "no creds banked while locked");
    // Crack it (the failsafe) → the diary opens, with the Drayton / Long Shot lead.
    engine.submit("use datapad on weathered datapad");
    captured.length = 0;
    engine.submit("read his diary");
    const diary = flatOutput();
    assert(diary.includes("Long Shot") && diary.includes("Drayton"), "bar + name lead now legible");
    assert(diary.includes("going tonight") && diary.includes("entry ends there"), "ends as he leaves to meet Drayton");
    assert(!diary.includes("not what I expected"), "no impossible post-meeting entry");
    assert(engine.state.scoreHooks.has("read_predecessor_diary"), "scored reading the diary");
    assert(engine.state.notes.some(n => n.id === "predecessor_bar_lead"), "bar lead noted");
});
test("predecessor: his saved login banks the shipyard creds + Sophie (once cracked)", () => {
    const engine = bootToHorizon();
    walkToLavatory(engine);
    engine.submit("open panel");
    engine.submit("take weathered datapad");
    engine.submit("use datapad on weathered datapad"); // crack it first — creds are sealed too
    captured.length = 0;
    engine.submit("read his credentials");
    const creds = flatOutput();
    assert(creds.includes("username") && creds.includes("Sophie"), "shows login + names Sophie");
    assert(engine.state.flags["shipyard_creds"] === true, "creds banked for the Shipyard route");
    assert(engine.state.scoreHooks.has("found_shipyard_creds"), "scored");
});
// --- food: buying + perishable eating ------------------------------------
test("food: buy a burger from Hank — charges credits, lands in inventory", () => {
    const engine = bootToHorizon();
    walkToFoodHall(engine); // Food Hall south (zone 3)
    engine.submit("north");
    engine.submit("west"); // zone 2 → Hank's
    eq(engine.state.currentRoom, "horizon_hanks_burgers", "at Hank's");
    const before = engine.state.flags["credits"];
    captured.length = 0;
    engine.submit("buy a burger");
    assert(engine.state.inventory.includes("burger"), "burger now carried");
    eq(engine.state.flags["credits"], before - 3, "charged the burger's price");
    assert(flatOutput().includes("Balance:"), "reports the new balance");
});
test("food: can't buy what a stall doesn't sell, or what you can't afford", () => {
    const engine = bootToHorizon();
    walkToFoodHall(engine);
    engine.submit("north");
    engine.submit("west"); // Hank's
    captured.length = 0;
    engine.submit("buy salad");
    assert(flatOutput().includes("no salad for sale"), "Hank doesn't sell salad");
    engine.state.flags["credits"] = 1; // skint (burger now costs 3)
    captured.length = 0;
    engine.submit("buy burger");
    assert(flatOutput().includes("you have 1"), "refused: can't afford");
    assert(!engine.state.inventory.includes("burger"), "no burger taken");
});
test("food: a fresh burger eats well; a stale one is grim but edible", () => {
    const engine = bootToHorizon();
    walkToFoodHall(engine);
    engine.submit("north");
    engine.submit("west");
    engine.submit("buy burger");
    captured.length = 0;
    engine.submit("eat burger");
    assert(flatOutput().includes("magnificent") || flatOutput().includes("everything Hank promised"), "fresh eat");
    assert(!engine.state.inventory.includes("burger"), "consumed");
    // Now a stale one: buy again, let it go cold (freshTicks 10).
    engine.submit("buy burger");
    engine.submit("wait 12"); // past the 10-tick window
    captured.length = 0;
    engine.submit("eat burger");
    assert(flatOutput().includes("cold"), "stale (cold) eat flavour");
    assert(!engine.state.inventory.includes("burger"), "consumed even when cold");
});
test("food: a salad spoils inedibly past its window (self-service honesty scanner)", () => {
    const engine = bootToHorizon();
    walkToFoodHall(engine);
    engine.submit("east"); // zone 3 → Fresh Salad Bowls
    eq(engine.state.currentRoom, "horizon_fresh_salad_bowls", "at the salad stall");
    captured.length = 0;
    engine.submit("buy salad");
    assert(flatOutput().includes("HONESTY SCANNER"), "no-NPC self-service flavour");
    assert(engine.state.inventory.includes("salad"), "salad carried");
    engine.submit("wait 14"); // past freshTicks 12 → spoils
    captured.length = 0;
    engine.submit("eat salad");
    assert(flatOutput().includes("bin it") || flatOutput().includes("No eating"), "spoiled, binned");
    assert(!engine.state.inventory.includes("salad"), "gone");
});
// --- transcript fixes (Charles's playtest) -------------------------------
test("food: SCAN pays at the honesty stall (the prose's 'scan and pay')", () => {
    const engine = bootToHorizon();
    walkToFoodHall(engine);
    engine.submit("east"); // → Fresh Salad Bowls
    eq(engine.state.currentRoom, "horizon_fresh_salad_bowls", "at the salad stall");
    const before = engine.state.flags["credits"];
    captured.length = 0;
    engine.submit("scan id"); // the honesty-box flow
    assert(engine.state.inventory.includes("salad"), "scanning bought the salad");
    eq(engine.state.flags["credits"], before - 2, "charged the salad's price");
    assert(flatOutput().includes("Balance:"), "reports the new balance");
});
test("food: SCAN at a multi-item (served) stall nudges toward BUY", () => {
    const engine = bootToHorizon();
    walkToFoodHall(engine);
    engine.submit("north");
    engine.submit("west"); // Hank's (2 items)
    captured.length = 0;
    engine.submit("scan id");
    assert(flatOutput().toLowerCase().includes("more than one"), "asks which item");
    assert(!engine.state.inventory.includes("burger"), "nothing auto-bought at a served stall");
});
// --- world-builder: assembling the World from a module list ----------------
/** Normalise a scene-callback return (string | string[] | void) to an array. */
const asArr = (x) => x === undefined ? [] : Array.isArray(x) ? x : [x];
test("world-builder: merges maps; later commands win; ticks compose in order", () => {
    const log = [];
    const room = (id) => ({ id, name: id, description: "", exits: {}, items: [], npcs: [] });
    const modules = [
        { rooms: { a: room("a") }, commands: { buy: () => ({ handled: true, output: ["raw"] }) }, tick: () => { log.push("t1"); return "one"; } },
        { rooms: { b: room("b") }, tick: () => { log.push("t2"); return "two"; } },
        // Cross-cutting last: its `buy` must win the clash.
        { commands: { buy: () => ({ handled: true, output: ["routed"] }) } },
    ];
    const parts = assembleParts(modules);
    eq(Object.keys(parts.rooms).sort().join(","), "a,b", "rooms from every module merged");
    const buy = parts.commands["buy"];
    eq(buy({}, {}, {}).output?.[0], "routed", "last module's command wins");
    const out = parts.onTick({});
    eq(log.join(","), "t1,t2", "tickers ran in module order");
    eq(asArr(out).join(","), "one,two", "tick outputs concatenated in order");
});
test("world-builder: a module's transitStops and lifts are registered during assembly", () => {
    assembleParts([
        { transitStops: [{ room: "wb_test_stop", label: "Test Stop", pos: 1, names: ["wbtest"] }] },
        { lifts: [{ id: "wb_test_lift", floors: [
                        { level: 1, room: "wb_test_lift_l1", label: "G", names: ["g"] },
                        { level: 2, room: "wb_test_lift_l2", label: "1", names: ["1"] },
                    ] }] },
    ]);
    assert(isTransitStop("wb_test_stop"), "the module's transit stop registered on the network");
    assert(isLiftRoom("wb_test_lift_l1"), "the module's lift registered (its car rooms are lift rooms)");
});
test("world-builder: onDrop is undefined when no module supplies one, else chains", () => {
    const none = assembleParts([{ tick: () => undefined }]);
    assert(none.onDrop === undefined, "no onDrop contributor -> undefined (engine skips it)");
    const dropped = [];
    const chained = assembleParts([
        { onDrop: (_s, id) => { dropped.push(`x:${id}`); return "litter!"; } },
    ]);
    const r = chained.onDrop({}, "can", "park");
    eq(dropped[0], "x:can", "onDrop fired with the dropped item id");
    eq(asArr(r).join(""), "litter!", "onDrop output returned");
});
// --- economy: balance / charge / credit (the credit chokepoint) -----------
test("economy: balance reads FLAG_CREDITS and defaults to 0", () => {
    const s = createInitialState(testWorld);
    eq(balance(s), 0, "no card loaded yet");
    s.flags[FLAG_CREDITS] = 42;
    eq(balance(s), 42, "reads the loaded balance");
});
test("economy: charge debits and returns true when affordable", () => {
    const s = createInitialState(testWorld);
    s.flags[FLAG_CREDITS] = 100;
    assert(charge(s, 30) === true, "charge succeeded");
    eq(balance(s), 70, "debited exactly 30");
    assert(charge(s, 70) === true, "can spend down to exactly zero");
    eq(balance(s), 0, "balance is zero");
});
test("economy: charge refuses an overdraft — the PC can never go negative", () => {
    const s = createInitialState(testWorld);
    s.flags[FLAG_CREDITS] = 20;
    assert(canAfford(s, 20) === true && canAfford(s, 21) === false, "canAfford gates at the balance");
    assert(charge(s, 21) === false, "an unaffordable charge is refused");
    eq(balance(s), 20, "nothing debited on a refused charge — balance unchanged, never negative");
});
test("economy: credit adds to the balance", () => {
    const s = createInitialState(testWorld);
    s.flags[FLAG_CREDITS] = 10;
    credit(s, 1000);
    eq(balance(s), 1010, "payout added");
});
// --- gambling: the EZ1 slot machines (The Long Odds) ----------------------
/** bootToHorizon + teleport onto the casino floor with a full float. */
function bootToCasino() {
    const engine = bootToHorizon();
    if (!engine.state.inventory.includes("fake_id"))
        engine.state.inventory.push("fake_id");
    engine.state.currentRoom = CASINO_ROOM;
    engine.state.flags[FLAG_CREDITS] = 500;
    return engine;
}
test("gambling: a spin costs the stake; a forced jackpot pays out", () => {
    const engine = bootToCasino();
    const before = engine.state.flags[FLAG_CREDITS];
    const orig = Math.random;
    Math.random = () => 0; // first (best) outcome: jackpot
    try {
        captured.length = 0;
        engine.submit("play");
    }
    finally {
        Math.random = orig;
    }
    assert(flatOutput().toUpperCase().includes("JACKPOT"), "jackpot narrated");
    eq(engine.state.flags[FLAG_CREDITS], before - SPIN_STAKE + 1000, "staked 50, paid 1000");
    assert(flatOutput().includes("Balance:"), "running balance reported");
});
test("gambling: a forced loss just costs the stake", () => {
    const engine = bootToCasino();
    const before = engine.state.flags[FLAG_CREDITS];
    const orig = Math.random;
    Math.random = () => 0.999; // last outcome: nothing
    try {
        captured.length = 0;
        engine.submit("spin");
    }
    finally {
        Math.random = orig;
    }
    eq(engine.state.flags[FLAG_CREDITS], before - SPIN_STAKE, "lost exactly the stake");
    assert(/nothing|gone/i.test(flatOutput()), "loss narrated");
});
test("gambling: the buy-in is guarded — no spin you can't afford", () => {
    const engine = bootToCasino();
    engine.state.flags[FLAG_CREDITS] = SPIN_STAKE - 1; // a credit short
    captured.length = 0;
    engine.submit("play");
    eq(engine.state.flags[FLAG_CREDITS], SPIN_STAKE - 1, "not charged");
    assert(flatOutput().includes(`LOAD ${SPIN_STAKE}`), "refused with the machine's own label");
});
test("gambling: PLAY does nothing off the casino floor", () => {
    const engine = bootToHorizon(); // standing on the arrival concourse
    const before = engine.state.flags[FLAG_CREDITS];
    captured.length = 0;
    engine.submit("play");
    eq(engine.state.flags[FLAG_CREDITS], before, "no credits moved");
    assert(flatOutput().toLowerCase().includes("the long odds"), "points you to the gaming house");
});
test("gambling: the house edge is real — expected return is under the stake", () => {
    // Densely sample the cumulative table: the mean payout equals the EV.
    let total = 0;
    const N = 100000;
    for (let i = 0; i < N; i++)
        total += rollOutcome((i + 0.5) / N).pays;
    const ev = total / N;
    assert(ev < SPIN_STAKE, `expected return (${ev.toFixed(1)}) sits below the ${SPIN_STAKE} stake`);
    assert(ev > 0, "but a win is possible (not a pure sink)");
});
test("gambling: LOAD still reaches the datacard prohibition on the casino floor", () => {
    const engine = bootToCasino();
    engine.state.inventory.push("rajah_datacard");
    captured.length = 0;
    engine.submit("load datacard");
    assert(flatOutput().includes(STUPID), "LOAD <datacard> isn't swallowed by the machines");
    // ...but LOAD 50 at a machine spins.
    engine.state.flags[FLAG_CREDITS] = 500;
    const before = engine.state.flags[FLAG_CREDITS];
    const orig = Math.random;
    Math.random = () => 0.999;
    try {
        captured.length = 0;
        engine.submit("load 50");
    }
    finally {
        Math.random = orig;
    }
    eq(engine.state.flags[FLAG_CREDITS], before - SPIN_STAKE, "LOAD 50 played a spin");
});
// --- the buy / wares / scenery sweep -------------------------------------
/** bootToHorizon + teleport into a named room with an ID and a float. */
function bootAt(room) {
    const engine = bootToHorizon();
    if (!engine.state.inventory.includes("fake_id"))
        engine.state.inventory.push("fake_id");
    engine.state.currentRoom = room;
    engine.state.flags[FLAG_CREDITS] = 200;
    return engine;
}
test("sweep: the Bazaar drinks vendor actually sells a drink (transcript gap)", () => {
    const engine = bootAt("horizon_drinks_vendor");
    captured.length = 0;
    engine.submit("buy drink");
    assert(engine.state.inventory.includes("fizzy_drink"), "a fizzy drink is now carried");
    assert(flatOutput().includes("Balance:"), "charged and reported");
    captured.length = 0;
    engine.submit("drink fizzy drink");
    assert(!engine.state.inventory.includes("fizzy_drink"), "DRINK consumes it");
});
test("sweep: the doughnut and hot-dog vendors each sell their ware", () => {
    let engine = bootAt("horizon_doughnut_vendor");
    engine.submit("buy doughnut");
    assert(engine.state.inventory.includes("doughnut"), "doughnut bought");
    engine = bootAt("horizon_hot_dog_vendor");
    engine.submit("buy hot dog");
    assert(engine.state.inventory.includes("hot_dog"), "hot dog bought");
});
test("sweep: the Humidor sells whisky to carry and a cigar to smoke on the spot", () => {
    const engine = bootAt("ez1_humidor");
    engine.submit("buy whisky");
    assert(engine.state.inventory.includes("whisky"), "whisky carried");
    const before = engine.state.flags[FLAG_CREDITS];
    captured.length = 0;
    engine.submit("buy cigar");
    assert(!engine.state.inventory.includes("cigar"), "a cigar is smoked on the spot, not carried");
    assert(engine.state.flags[FLAG_CREDITS] < before, "but the cigar still charged");
});
test("sweep: a non-food shop answers BUY in character, not 'nothing for sale'", () => {
    const engine = bootAt("horizon_gadget_shop");
    captured.length = 0;
    engine.submit("buy drone");
    assert(!flatOutput().includes("nothing for sale here"), "the gadget shop has wares");
    assert(/drone|gizmo|toys|better made/i.test(flatOutput()), "characterful wares reply");
    engine.state.currentRoom = "horizon_corridor"; // an ordinary corridor
    captured.length = 0;
    engine.submit("buy drone");
    assert(flatOutput().includes("nothing for sale here"), "an ordinary corridor sells nothing");
});
test("sweep: mentioned objects are examinable (scenery)", () => {
    const engine = bootAt("horizon_clothing_emporium");
    captured.length = 0;
    engine.submit("examine racks");
    assert(/womenswear|practical wear|sections/i.test(flatOutput()), "the emporium racks answer EXAMINE");
    engine.state.currentRoom = "ez1_humidor";
    captured.length = 0;
    engine.submit("examine cigars");
    assert(/humidity|cigar/i.test(flatOutput()), "the humidor cigars answer EXAMINE");
    engine.state.currentRoom = "cda_unit_orrery";
    captured.length = 0;
    engine.submit("examine orrery");
    assert(/brass|planetary|orbit/i.test(flatOutput()), "the orrery answers EXAMINE");
});
test("predecessor: the kit bag is named what the narration calls it", () => {
    const engine = bootToHorizon();
    walkToLavatory(engine);
    engine.submit("open panel");
    captured.length = 0;
    engine.submit("take kit bag");
    // The refusal names the kit bag — not a different object the player never typed.
    assert(flatOutput().includes("kit bag"), "refusal references the kit bag");
    assert(!flatOutput().toLowerCase().includes("document wallet"), "no surprise 'document wallet'");
    captured.length = 0;
    engine.submit("examine kit bag");
    assert(flatOutput().toLowerCase().includes("kit bag"), "examines as the kit bag");
});
test("food: the salad now lasts long enough to still be fresh at 10 ticks", () => {
    const engine = bootToHorizon();
    walkToFoodHall(engine);
    engine.submit("east"); // Fresh Salad Bowls
    engine.submit("scan id"); // buy via the honesty box
    engine.submit("wait 10"); // within the new 12-tick window
    captured.length = 0;
    engine.submit("eat salad");
    assert(flatOutput().toLowerCase().includes("crisp") || flatOutput().toLowerCase().includes("virtuous"), "still fresh at 10 ticks (was spoiling at 8)");
});
test("showers: ID-gated — SCAN TURNSTILE admits you, the exit refuses until then", () => {
    const engine = bootToHorizon();
    walkToRetailStop(engine); // → Retail Zone 1
    eq(engine.state.currentRoom, "horizon_dockside_retail_area_zone_1", "at the retail stop");
    captured.length = 0;
    engine.submit("east"); // blocked
    eq(engine.state.currentRoom, "horizon_dockside_retail_area_zone_1", "turnstile bars the way");
    assert(flatOutput().toLowerCase().includes("turnstile"), "told about the turnstile");
    engine.submit("scan turnstile"); // name the scanner
    assert(engine.state.flags["showers_unlocked"] === true, "scanning the turnstile admits you");
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_public_showers", "now through to the showers");
});
test("scan: a stop that also hosts a facility asks which reader", () => {
    const engine = bootToHorizon();
    walkToRetailStop(engine); // tube stop + shower turnstile
    captured.length = 0;
    engine.submit("scan id"); // ambiguous → prompt
    assert(flatOutput().toLowerCase().includes("more than one"), "asks which reader");
    assert(!engine.state.flags["showers_unlocked"], "nothing chosen yet");
    assert(engine.state.flags["pod_summoned_at"] !== "horizon_dockside_retail_area_zone_1", "no pod either");
    // Disambiguate either way.
    engine.submit("scan tube");
    eq(engine.state.flags["pod_summoned_at"], "horizon_dockside_retail_area_zone_1", "scan tube summons a pod");
    engine.submit("scan turnstile");
    assert(engine.state.flags["showers_unlocked"] === true, "scan turnstile admits to the showers");
});
test("scan: the Blue Sector stop + public terminal disambiguates too", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_blue_sector_concourse"; // tube stop + terminal
    captured.length = 0;
    engine.submit("scan id");
    assert(flatOutput().toLowerCase().includes("more than one"), "asks which reader");
    engine.submit("scan terminal");
    assert(flatOutput().toLowerCase().includes("public-services") || flatOutput().toLowerCase().includes("book hostel"), "naming the terminal wakes it");
});
test("showers: USE/TAP TURNSTILE (no target) still works too", () => {
    const engine = bootToHorizon();
    walkToRetailStop(engine);
    engine.submit("use turnstile"); // engine: use a reader = scan it
    assert(engine.state.flags["showers_unlocked"] === true, "use-the-reader admits you");
});
test("laundrette: the machines have a description (x machine)", () => {
    const engine = bootToHorizon();
    walkToRetailStop(engine);
    engine.submit("west"); // Laundrette
    eq(engine.state.currentRoom, "horizon_laundrette", "in the laundrette");
    captured.length = 0;
    engine.submit("examine machine");
    assert(flatOutput().toLowerCase().includes("washer") || flatOutput().toLowerCase().includes("drum"), "the machines describe themselves");
    assert(!flatOutput().toLowerCase().includes("see no machine"), "no longer 'you see no machine here'");
});
test("public terminal: USE / PRESENT / SCAN all wake it (the prose's promise)", () => {
    const engine = bootToHorizon();
    walkToRetailTerminal(engine);
    eq(engine.state.currentRoom, "horizon_public_terminal_dockside_retail", "at the terminal alcove");
    for (const cmd of ["use terminal", "present id", "scan id"]) {
        captured.length = 0;
        engine.submit(cmd);
        assert(flatOutput().toLowerCase().includes("present your id") || flatOutput().toLowerCase().includes("public-services") || flatOutput().toLowerCase().includes("book hostel"), `'${cmd}' wakes the terminal to its services`);
    }
});
test("predecessor: the lock screen names John Smith (alias); creds locked until cracked", () => {
    const engine = bootToHorizon();
    walkToLavatory(engine);
    engine.submit("open panel");
    engine.submit("take weathered datapad");
    captured.length = 0;
    engine.submit("examine weathered datapad");
    assert(flatOutput().includes("JOHN SMITH"), "lock screen names the predecessor's alias");
});
test("records: USE CREDENTIALS ON TERMINAL logs into the shipyard records", () => {
    const engine = bootToHorizon();
    walkToLavatory(engine);
    engine.submit("open panel");
    engine.submit("take weathered datapad");
    engine.submit("use datapad on weathered datapad"); // crack → creds now readable
    engine.submit("read his credentials"); // banks shipyard_creds
    engine.state.currentRoom = "horizon_public_terminal_dockside_retail";
    captured.length = 0;
    engine.submit("use credentials on terminal"); // the natural "log in"
    assert(flatOutput().toLowerCase().includes("jackrabbit") && flatOutput().toLowerCase().includes("vessel"), "logging in with the creds opens the records (Tier 1)");
    assert(engine.state.scoreHooks.has("records_ship_jackrabbit"), "scored the ship reveal");
});
test("shipyard: Sophie holds the door by day; at night the desk is unmanned", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_shipyard_reception";
    engine.state.ticks = 5;
    engine.state.isDaytime = true;
    engine.submit("wait"); // sync: Sophie present
    captured.length = 0;
    engine.submit("north");
    eq(engine.state.currentRoom, "horizon_shipyard_reception", "day: the door is held");
    assert(flatOutput().toLowerCase().includes("customers only"), "Sophie's polite refusal");
    // Night: the desk empties and the yard opens.
    engine.state.ticks = engine.state.dayLength + 5;
    engine.state.isDaytime = false;
    engine.submit("wait"); // sync: Sophie off-shift
    captured.length = 0;
    engine.submit("talk sophie");
    assert(flatOutput().toLowerCase().includes("no sophie"), "she's gone at night");
    engine.submit("north");
    eq(engine.state.currentRoom, "horizon_shipyard_entrance", "night: slip into the yard");
});
test("day/night: the cycle is announced once the PC is on-station", () => {
    const engine = bootToHorizon();
    engine.state.ticks = 95;
    engine.state.isDaytime = true; // daytime, near the boundary
    engine.submit("wait"); // baseline the phase tracker
    captured.length = 0;
    engine.submit("wait 10"); // crosses into night at tick 100
    assert(flatOutput().toLowerCase().includes("settling into its night"), "the night transition is reported");
});
test("ask synonyms: TELL works (Chas cracks on TELL ... about the hunt)", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "ez1_long_shot";
    engine.state.ticks = engine.state.dayLength + 5;
    engine.state.isDaytime = false;
    engine.submit("wait"); // Chas present at night
    captured.length = 0;
    engine.submit("tell chas about investigation"); // 'tell' routes to 'ask'
    assert(engine.state.scoreHooks.has("chas_gave_intel"), "TELL ... about the hunt cracks Chas");
    assert(flatOutput().includes("Jack Abbott"), "the real name lands");
});
test("guest rooms: the bed and window are examinable scenery", () => {
    const engine = bootToHorizon();
    engine.state.flags["donovan_checked_in"] = true;
    engine.state.flags["donovan_room"] = "25";
    engine.state.currentRoom = "horizon_donovan_s_room_25";
    captured.length = 0;
    engine.submit("examine bed");
    assert(flatOutput().toLowerCase().includes("sleep here"), "the bed responds (and points to SLEEP)");
    captured.length = 0;
    engine.submit("examine window");
    assert(flatOutput().toLowerCase().includes("curve") || flatOutput().toLowerCase().includes("blue sector"), "the window has a real view");
});
test("sleep: passes to the next phase (day in -> night out, and back)", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_donovan_s_room_25";
    delete engine.state.flags["__last_day_phase"]; // align the phase announcer baseline
    engine.state.ticks = 90;
    engine.state.isDaytime = true; // day, near the boundary (100)
    engine.submit("sleep");
    assert(!engine.state.isDaytime, "slept through the day, woke at night");
    eq(engine.state.ticks, 100, "woke exactly at the phase boundary");
    // And the other way.
    engine.state.ticks = 190;
    engine.state.isDaytime = false; // night, near the boundary (200)
    engine.submit("sleep");
    assert(engine.state.isDaytime, "slept through the night, woke in the day");
});
test("long shot: drinking seated brings Chas over with the intel (B4b)", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "ez1_long_shot";
    engine.state.ticks = engine.state.dayLength + 5;
    engine.state.isDaytime = false;
    engine.submit("wait"); // Chas present at night
    // Ordering before sitting is refused.
    captured.length = 0;
    engine.submit("buy drink");
    assert(flatOutput().toLowerCase().includes("table first"), "you have to sit first");
    // Sit, then drink up — Chas comes over on the fourth.
    engine.submit("sit");
    engine.submit("buy drink");
    engine.submit("buy drink");
    engine.submit("buy drink");
    const before = engine.state.score;
    captured.length = 0;
    engine.submit("buy drink"); // the fourth: the approach
    assert(flatOutput().includes("Jack Abbott"), "Chas comes over and spills the name");
    assert(flatOutput().toLowerCase().includes("squirt"), "the canon 'nasty little squirt'");
    assert(engine.state.scoreHooks.has("chas_gave_intel"), "the crack scores via the drink route");
    eq(engine.state.score, before + 4, "+4 for the intel");
});
test("shuttle1: the transit screen ETA counts down (was a static string)", () => {
    const engine = bootJackrabbitPastBriefing();
    engine.submit("go out"); // board the shuttle
    const eta = () => { const m = flatOutput().match(/ETA:\s*(\d+)\s*MINUTE/); return m ? Number(m[1]) : NaN; };
    captured.length = 0;
    engine.submit("examine screen");
    const a = eta();
    engine.submit("wait 3");
    captured.length = 0;
    engine.submit("examine screen");
    const b = eta();
    assert(Number.isFinite(a) && Number.isFinite(b), "screen shows a numeric ETA");
    assert(a > b, `ETA counts down as time passes (${a} -> ${b})`);
});
test("output: a lowercase NPC name is capitalised at the start of the presence line", () => {
    const engine = bootToLiner();
    captured.length = 0;
    engine.submit("look");
    assert(flatOutput().includes("The passenger is here."), "sentence-initial capital");
    assert(!flatOutput().includes("the passenger is here."), "not left lowercase");
});
test("parser: 'talk to X about Y' resolves the topic (like 'ask X about Y')", () => {
    const engine = bootToLiner();
    engine.submit("talk passenger"); // greet first (starts the countdown)
    captured.length = 0;
    engine.submit("talk to passenger about horizon"); // natural phrasing → ask
    assert(flatOutput().includes("nowhere like it"), "the horizon topic answered");
    assert(engine.state.scoreHooks.has("asked_passenger_horizon_first"), "scored via talk-to-about");
});
// --- follow <npc> --------------------------------------------------------
test("follow: steps the PC into an adjacent room behind a leading NPC", () => {
    const engine = bootToHorizon(); // arrival concourse
    placeNpcInRoom(engine.state, "donovan", "horizon_dock_desk"); // one room north
    captured.length = 0;
    engine.submit("follow donovan");
    eq(engine.state.currentRoom, "horizon_dock_desk", "followed Donovan north into the next room");
    assert(flatOutput().includes("follow Donovan"), "acknowledges the follow");
});
test("follow: fails (no move) when the NPC isn't right ahead", () => {
    const engine = bootToHorizon(); // concourse
    placeNpcInRoom(engine.state, "donovan", "horizon_donovans_lobby"); // far across the station
    captured.length = 0;
    engine.submit("follow donovan");
    eq(engine.state.currentRoom, "horizon_arrival_concourse", "didn't move — they're not adjacent");
    assert(flatOutput().includes("lost sight"), "told you've lost them");
});
test("follow: in the same room, you're not behind them yet", () => {
    const engine = bootToHorizon(); // Barty is here
    captured.length = 0;
    engine.submit("follow barty");
    eq(engine.state.currentRoom, "horizon_arrival_concourse", "no movement when together");
    assert(flatOutput().includes("right here"), "told they're already with you");
});
test("follow: chains room to room as long as you stay right behind", () => {
    const engine = bootToHorizon(); // concourse
    placeNpcInRoom(engine.state, "donovan", "horizon_docking_zone_a"); // east
    engine.submit("follow donovan");
    eq(engine.state.currentRoom, "horizon_docking_zone_a", "followed east once");
    placeNpcInRoom(engine.state, "donovan", "horizon_docking_zone_b"); // leader walks on
    engine.submit("follow donovan");
    eq(engine.state.currentRoom, "horizon_docking_zone_b", "kept up as they moved on");
});
test("follow: a relocated NPC leaves its old room and appears in the new one", () => {
    const engine = bootToHorizon();
    // Barty starts statically in the concourse; move him and check presence flips.
    placeNpcInRoom(engine.state, "barty", "horizon_docking_zone_a");
    captured.length = 0;
    engine.submit("look");
    assert(!flatOutput().includes("Bartram"), "Barty no longer listed in the concourse he left");
    engine.submit("east");
    assert(flatOutput().includes("Bartram"), "Barty now present in the room he moved to");
});
// --- Phase B Strand 2: the AetherLink analysis (Burke's software) --------
test("strand 2: seeding the software at the public terminal starts a world-clock run", () => {
    const engine = bootToHorizon();
    walkToRetailTerminal(engine); // the public-terminal alcove
    engine.state.inventory.push("burke_software"); // (normally bought from Burke)
    captured.length = 0;
    engine.submit("use software on terminal");
    assert(flatOutput().toLowerCase().includes("ledger"), "seeding message printed");
    assert(typeof engine.state.flags["analysis_seeded_at"] === "number", "baseline tick stamped");
    assert(engine.state.scoreHooks.has("seeded_analysis"), "seeding scored");
    assert(!engine.state.flags["analysis_resolved"], "doesn't resolve on the seeding turn");
});
test("strand 2: re-seeding while it runs reports progress, doesn't restart the clock", () => {
    const engine = bootToHorizon();
    walkToRetailTerminal(engine);
    engine.state.inventory.push("burke_software");
    engine.submit("use software on terminal");
    const baseline = engine.state.flags["analysis_seeded_at"];
    engine.submit("wait"); // let a tick pass
    captured.length = 0;
    engine.submit("use software on terminal"); // try again
    assert(flatOutput().includes("already seeded"), "reports it's already running");
    eq(engine.state.flags["analysis_seeded_at"], baseline, "baseline unchanged");
});
test("strand 2: the analysis finishes (datapad notification), then reads out at a terminal", () => {
    const engine = bootToHorizon();
    walkToRetailTerminal(engine);
    engine.state.inventory.push("burke_software");
    engine.submit("use software on terminal");
    assert(!engine.state.flags["analysis_complete"], "still running just after seeding");
    // Fast-forward the run past the threshold, then one tick fires the completion chime.
    engine.state.flags["analysis_seeded_at"] = engine.state.ticks - (10 * engine.state.dayLength + 5);
    captured.length = 0;
    engine.submit("wait");
    assert(engine.state.flags["analysis_complete"], "computation finished");
    assert(!engine.state.flags["analysis_resolved"], "but NOT yet read");
    assert(flatOutput().toUpperCase().includes("FINISHED"), "the datapad notification chimes");
    assert(!flatOutput().includes("AetherLink"), "the notification does NOT name the paymaster");
    assert(!engine.state.scoreHooks.has("aetherlink_identified"), "no payoff score until it's read");
    // Log on at the terminal to read it — that's where AetherLink lands.
    captured.length = 0;
    engine.submit("use terminal");
    assert(engine.state.flags["analysis_resolved"], "reading at the terminal resolves it");
    assert(flatOutput().includes("AetherLink"), "the read-out names AetherLink");
    assert(engine.state.scoreHooks.has("aetherlink_identified"), "Strand-2 payoff scored on the read");
});
test("strand 2: the analysis finishes in the background wherever the PC goes", () => {
    const engine = bootToHorizon();
    walkToRetailTerminal(engine);
    engine.state.inventory.push("burke_software");
    engine.submit("use software on terminal");
    // Walk away from the terminal; the run keeps ticking on the world clock and
    // FINISHES (chimes the 'pad) while the PC is elsewhere — but stays unread.
    engine.state.flags["analysis_seeded_at"] = engine.state.ticks - (10 * engine.state.dayLength + 5);
    engine.submit("west"); // back to Zone 3
    engine.submit("north"); // into the service corridor
    assert(engine.state.flags["analysis_complete"], "finished off-site, on the world clock");
    assert(!engine.state.flags["analysis_resolved"], "stays unread until a terminal");
});
test("strand 2: terminals are interlinked — seed at one, read the result at another", () => {
    const engine = bootToHorizon();
    walkToRetailTerminal(engine);
    engine.state.inventory.push("burke_software");
    engine.submit("use software on terminal"); // seed at the Retail terminal
    assert(engine.state.flags["analysis_seeded_at"] !== undefined, "seeded at Retail");
    // At a DIFFERENT terminal (Blue Sector stop), logging on shows the same run.
    engine.state.currentRoom = "horizon_blue_sector_concourse";
    captured.length = 0;
    engine.submit("use terminal"); // log on at Blue
    assert(flatOutput().includes("ANALYSIS IN PROGRESS"), "the Blue terminal shows the same running analysis");
    // Re-seeding at this other terminal is a no-op (already running globally).
    captured.length = 0;
    engine.submit("use software on terminal");
    assert(flatOutput().includes("already seeded"), "can't restart it at a second terminal");
    // Finish the run, then read it out HERE — global state, available at whichever
    // terminal the PC logs on to.
    engine.state.flags["analysis_seeded_at"] = engine.state.ticks - (10 * engine.state.dayLength + 5);
    engine.submit("wait"); // completes (chimes the 'pad)
    assert(engine.state.flags["analysis_complete"], "finished while standing at the Blue terminal");
    captured.length = 0;
    engine.submit("use terminal"); // log on here to read it
    assert(flatOutput().includes("AetherLink"), "the result reads out at the second terminal");
    assert(engine.state.flags["analysis_resolved"], "reading it here resolves it globally");
});
test("strand 2: a public terminal leaks nothing private until you log on", () => {
    const engine = bootToHorizon();
    walkToRetailTerminal(engine);
    engine.state.inventory.push("burke_software");
    engine.submit("use software on terminal"); // running
    captured.length = 0;
    engine.submit("examine terminal");
    assert(!flatOutput().includes("ANALYSIS IN PROGRESS"), "standby hides the running analysis");
    assert(flatOutput().toUpperCase().includes("LOG ON"), "passive view only invites you to log on");
    // Even once finished, passive examine still reveals nothing and doesn't read it.
    engine.state.flags["analysis_seeded_at"] = engine.state.ticks - (10 * engine.state.dayLength + 5);
    engine.submit("wait"); // completes
    captured.length = 0;
    engine.submit("examine terminal");
    assert(!flatOutput().includes("AetherLink"), "standby never names the paymaster");
    assert(!engine.state.flags["analysis_resolved"], "passive examine does not read/resolve it");
});
// --- Phase B slice 3: Food Hall -----------------------------------------
test("food hall: promenade runs Zone C → zone 3 → 2 → 1 → retail", () => {
    const engine = bootToHorizon();
    walkToFoodHall(engine); // concourse → Zone C → (N) Food Hall zone 3
    eq(engine.state.currentRoom, "horizon_food_hall_zone_3", "Zone C → zone 3");
    engine.submit("north");
    eq(engine.state.currentRoom, "horizon_food_hall_zone_2", "zone 3 → 2");
    engine.submit("north");
    eq(engine.state.currentRoom, "horizon_food_hall_zone_1", "zone 2 → 1");
    engine.submit("north");
    eq(engine.state.currentRoom, "horizon_dockside_retail_area_zone_1", "zone 1 → retail");
    // and back south to the docks (zone 3 south now returns to Docking Zone C)
    engine.submit("south");
    engine.submit("south");
    engine.submit("south");
    eq(engine.state.currentRoom, "horizon_food_hall_zone_3", "back to zone 3");
    engine.submit("south");
    eq(engine.state.currentRoom, "horizon_docking_zone_c", "zone 3 → Docking Zone C");
});
test("food hall: stalls branch off each zone and return", () => {
    const engine = bootToHorizon();
    walkToFoodHall(engine); // zone 3
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_fresh_salad_bowls", "zone3 E → salad");
    engine.submit("west");
    eq(engine.state.currentRoom, "horizon_food_hall_zone_3", "back");
    engine.submit("west");
    eq(engine.state.currentRoom, "horizon_unisex_lavatory", "zone3 W → lavatory");
    engine.submit("east");
    engine.submit("north"); // zone 2
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_sandwich_counter", "zone2 E → sandwich counter");
    engine.submit("west");
    engine.submit("west");
    eq(engine.state.currentRoom, "horizon_hanks_burgers", "zone2 W → Hank's");
    engine.submit("east");
    engine.submit("north"); // zone 1
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_ice_cream_hut", "zone1 E → ice cream");
    engine.submit("west");
    engine.submit("west");
    eq(engine.state.currentRoom, "horizon_bengali_delights", "zone1 W → Bengali");
});
/** From the arrival concourse, walk to the sandwich counter. */
function toSandwichCounter(engine) {
    walkToFoodHall(engine); // → Food Hall zone 3
    engine.submit("north"); // zone 2
    engine.submit("east"); // sandwich counter
}
test("food hall: sandwich vendor — canonical hook (he + apricot jam), scores", () => {
    const engine = bootToHorizon();
    toSandwichCounter(engine);
    eq(engine.state.currentRoom, "horizon_sandwich_counter", "at the counter");
    engine.submit("talk vendor");
    assert(engine.state.scoreHooks.has("talked_to_sandwich_vendor"), "talked-to-vendor hook");
    captured.length = 0;
    engine.submit("ask vendor about jackrabbit");
    const out = flatOutput();
    assert(out.toLowerCase().includes("apricot"), "apricot-jam detail revealed");
    assert(out.includes("Nice lad") || out.toLowerCase().includes("lad"), "confirms a young 'he'");
    assert(engine.state.scoreHooks.has("sandwich_vendor_he"), "he-hook scored");
    assert(engine.state.scoreHooks.has("sandwich_vendor_jam"), "jam-hook scored");
});
test("food hall: examining the sandwich photographs scores (canon detail)", () => {
    const engine = bootToHorizon();
    toSandwichCounter(engine);
    const before = engine.state.score;
    captured.length = 0;
    engine.submit("examine photographs");
    assert(flatOutput().toLowerCase().includes("filling"), "photo description shown");
    assert(engine.state.scoreHooks.has("sandwich_photos"), "photos hook scored");
    eq(engine.state.score - before, 2, "photos worth 2 points");
    // idempotent
    engine.submit("examine photographs");
    assert(engine.state.score - before === 2, "no double-score on re-examine");
});
test("food hall: Hank is pure atmosphere — knows nothing", () => {
    const engine = bootToHorizon();
    walkToFoodHall(engine); // zone 3
    engine.submit("north"); // zone 2
    engine.submit("west"); // Hank's
    engine.submit("talk hank");
    captured.length = 0;
    engine.submit("ask hank about jackrabbit");
    assert(flatOutput().toLowerCase().includes("grill") || flatOutput().toLowerCase().includes("faces"), "Hank deflects to burgers");
});
// --- Phase B slice 4: Arboretum (skeleton) ------------------------------
test("arboretum: every exit is reciprocal and points at a real room (structural)", () => {
    const world = jackrabbitWorld;
    const OPP = { north: "south", south: "north", east: "west", west: "east", up: "down", down: "up" };
    const arbIds = Object.keys(world.rooms).filter(id => id === "horizon_arboretum_entrance" || id.startsWith("horizon_footpath") ||
        id.startsWith("horizon_winding_path") || id === "horizon_giant_tree" ||
        id === "horizon_flower_beds" || id === "horizon_algae_tanks" || id === "horizon_park_bench");
    assert(arbIds.length === 26, `expected 26 arboretum rooms, got ${arbIds.length}`);
    for (const id of arbIds) {
        const room = world.rooms[id];
        for (const [dir, def] of Object.entries(room.exits)) {
            const to = def?.to;
            assert(to && world.rooms[to], `${id} ${dir} -> ${to}: target missing`);
            const opp = OPP[dir];
            assert(opp, `unexpected direction ${dir} in ${id}`);
            const back = world.rooms[to].exits[opp]?.to;
            eq(back, id, `${id} ${dir} -> ${to} should reciprocate via ${opp}`);
        }
    }
});
test("arboretum: reachable by TravelTube; entrance is a stop; bench reachable", () => {
    const engine = bootToHorizon();
    // ride from the dock-side retail stop to the arboretum
    walkToRetailStop(engine);
    engine.submit("summon");
    engine.submit("board");
    engine.submit("select arboretum");
    engine.submit("sit"); // choose, then sit to depart
    engine.submit("wait 12"); // ride (interruptible; stops on arrival)
    engine.submit("disembark"); // step out at the arboretum stop
    eq(engine.state.currentRoom, "horizon_arboretum_entrance", "arrived at the arboretum stop");
    // walk to the giant tree (entrance S → footpath → footpath_2 → _3 → _4 → giant tree)
    engine.submit("south");
    engine.submit("south");
    engine.submit("south");
    engine.submit("south");
    engine.submit("south");
    eq(engine.state.currentRoom, "horizon_giant_tree", "reached the giant tree");
    captured.length = 0;
    engine.submit("examine tree");
    assert(flatOutput().toLowerCase().includes("bark"), "giant tree examinable");
    // and onward to the quiet bench (tree E → winding → _2 → _3 → _4 → S bench)
    engine.submit("east");
    engine.submit("north");
    engine.submit("north");
    engine.submit("east");
    engine.submit("south");
    eq(engine.state.currentRoom, "horizon_park_bench", "reached the quiet bench");
});
test("residential zone B: every exit is reciprocal and points at a real room (structural)", () => {
    const world = jackrabbitWorld;
    const OPP = { north: "south", south: "north", east: "west", west: "east", up: "down", down: "up" };
    const ids = Object.keys(world.rooms).filter(id => id.startsWith("horizon_residential_zone_b"));
    assert(ids.length === 808, `expected 808 residential rooms, got ${ids.length}`);
    for (const id of ids) {
        const room = world.rooms[id];
        for (const [dir, def] of Object.entries(room.exits)) {
            const to = def?.to;
            assert(to && world.rooms[to], `${id} ${dir} -> ${to}: target missing`);
            const opp = OPP[dir];
            assert(opp, `unexpected direction ${dir} in ${id}`);
            const back = world.rooms[to].exits[opp]?.to;
            eq(back, id, `${id} ${dir} -> ${to} should reciprocate via ${opp}`);
        }
    }
});
test("residential zone B: look-alikes share one description; only the name (address) differs", () => {
    const world = jackrabbitWorld;
    const a = world.rooms["horizon_residential_zone_b_residence_b1_nw1_e"];
    const b = world.rooms["horizon_residential_zone_b_residence_b1_nw1_w"];
    eq(a.description, b.description, "two residences read identically");
    assert(a.name !== b.name, "but their names (addresses) differ");
    // accessway segments within a run also share prose
    const c = world.rooms["horizon_residential_zone_b_accessway_nw1"];
    const d = world.rooms["horizon_residential_zone_b_accessway_nw1a"];
    eq(c.description, d.description, "accessway segments read identically");
    // the residence prose is generic — it must NOT embed any specific address
    assert(typeof a.description === "string" && !a.description.includes("NW1"), "residence description carries no address");
});
test("residential zone B: reachable by 'Tube; lift rides between levels; corridor stays a dead end", () => {
    const world = jackrabbitWorld;
    // The Dockside Retail service corridor's on-foot link goes to Zone A, NOT
    // Zone B — Zone B is reachable only by 'Tube.
    eq(world.rooms["horizon_corridor"].exits.north?.to, "horizon_residential_zone_a_central_accessway", "service corridor's north foot-link is Zone A, not Zone B");
    const engine = bootToHorizon();
    walkToRetailStop(engine);
    engine.submit("summon");
    engine.submit("board");
    engine.submit("select zone b");
    engine.submit("sit");
    engine.submit("wait 12"); // ride (interruptible; stops on arrival)
    engine.submit("disembark");
    eq(engine.state.currentRoom, "horizon_residential_zone_b", "arrived at the Zone B stop");
    // Into the lift and up to level 2, then step out onto that floor.
    engine.submit("south");
    eq(engine.state.currentRoom, "horizon_residential_zone_b_lift_l1", "S → lift car (ground)");
    engine.submit("select 2");
    eq(engine.state.currentRoom, "horizon_residential_zone_b_lift_l2", "rode to the level-2 car");
    engine.submit("north");
    eq(engine.state.currentRoom, "horizon_residential_zone_b_l2", "stepped out onto level 2");
});
test("residential zone A: on-foot from the retail service corridor; reciprocal exits", () => {
    const world = jackrabbitWorld;
    const OPP = { north: "south", south: "north", east: "west", west: "east", up: "down", down: "up" };
    const ids = Object.keys(world.rooms).filter(id => id.startsWith("horizon_residential_zone_a") || id.startsWith("residential_zone_a") ||
        id.startsWith("horizon_residence_a") || id.startsWith("horizon_horizon_residential_zone_a"));
    assert(ids.length === 24, `expected 24 Zone A rooms, got ${ids.length}`);
    for (const id of ids) {
        const room = world.rooms[id];
        for (const [dir, def] of Object.entries(room.exits)) {
            const to = def?.to;
            assert(to && world.rooms[to], `${id} ${dir} -> ${to}: target missing`);
            const back = world.rooms[to].exits[OPP[dir]]?.to;
            eq(back, id, `${id} ${dir} -> ${to} should reciprocate via ${OPP[dir]}`);
        }
    }
    // walkable from the retail corridor and back (the link both this test and the
    // engine rely on)
    const engine = bootToHorizon();
    walkToRetailStop(engine); // → Retail Zone 1
    engine.submit("north");
    engine.submit("north"); // Zone 2, Zone 3
    engine.submit("north"); // service corridor (old dead-end)
    eq(engine.state.currentRoom, "horizon_corridor", "reached the service corridor");
    engine.submit("north"); // into Zone A on foot
    eq(engine.state.currentRoom, "horizon_residential_zone_a_central_accessway", "on foot into Zone A");
    engine.submit("south"); // and back out
    eq(engine.state.currentRoom, "horizon_corridor", "back out to the corridor");
});
test("service area: a 'Tube-only stub — reachable by pod, gantry walkable", () => {
    const engine = bootToHorizon();
    walkToRetailStop(engine);
    engine.submit("summon");
    engine.submit("board");
    engine.submit("select service");
    engine.submit("sit");
    engine.submit("wait 12"); // ride (interruptible; stops on arrival)
    engine.submit("disembark");
    eq(engine.state.currentRoom, "horizon_service_access_corridor", "arrived at the service stop");
    engine.submit("east");
    engine.submit("north");
    engine.submit("north");
    eq(engine.state.currentRoom, "horizon_service_access_gantry", "walked to the gantry");
});
test("quit: routes to a world-defined 'quit' ending; narrative + closing text play", () => {
    const engine = makeEngine();
    engine.start();
    captured.length = 0;
    engine.submit("quit");
    assert(engine.state.ended, "ended");
    eq(engine.state.endingId, "quit", "endingId routed to 'quit'");
    const flat = captured.flatMap(c => c.lines).join("\n");
    assert(flat.includes("The Jackrabbit Series"), "narrative text printed");
    assert(flat.includes("https://www.jackrabbit-series.com/"), "link URL present in raw output");
    assert(flat.includes("portfolio review"), "ending's closingText printed");
});
// --- Phase A (v0.5 engine deltas) ---------------------------------------
test("droppable: an item with droppable:false refuses to be dropped (no ticks)", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: ["pad", "rock"], npcs: [] } },
        items: {
            pad: { id: "pad", name: "datapad", description: "a pad", takeable: true, droppable: false },
            rock: { id: "rock", name: "rock", description: "a rock", takeable: true },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    engine.submit("take all");
    const before = { ticks: engine.state.ticks, turns: engine.state.turns };
    captured.length = 0;
    engine.submit("drop datapad");
    assert(engine.state.inventory.includes("pad"), "datapad still carried");
    eq(engine.state.ticks, before.ticks, "no ticks for a refused drop");
    assert(flatOutput().toLowerCase().includes("keep"), "refusal flavour shown");
    // A normal item still drops fine.
    engine.submit("drop rock");
    assert(!engine.state.inventory.includes("rock"), "rock dropped normally");
});
test("npc description may be a function of state", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: ["x"] } },
        npcs: {
            x: {
                id: "x", name: "stranger",
                description: (s) => s.flags["met"] ? "An old acquaintance." : "A wary stranger.",
            },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    engine.submit("examine stranger");
    assert(flatOutput().includes("wary stranger"), "pre-state description");
    engine.state.flags["met"] = true;
    captured.length = 0;
    engine.submit("examine stranger");
    assert(flatOutput().includes("old acquaintance"), "post-state description");
});
test("ending: survived defaults true; closingText prints after the score summary", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
        endings: {
            quit: {
                id: "quit",
                text: "You step away.",
                closingText: "And the world goes on without you.",
            },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    engine.submit("quit");
    eq(engine.state.survived, true, "survived defaults true");
    const flat = flatOutput();
    assert(flat.includes("You step away."), "ending narrative");
    assert(flat.includes("out of a possible"), "score summary");
    assert(flat.includes("world goes on without you"), "closingText shown");
});
test("ending-as-death: ended=true with survived=false (NOT a mischief death)", () => {
    const world = miniWorld({
        rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
        endings: {
            doom: {
                id: "doom",
                text: "You set off, and never arrive.",
                survived: false,
                closingText: "The automaton that erased you neither knew nor cared.",
            },
        },
        commands: {
            defect: (_w, s) => { s.ended = true; s.endingId = "doom"; return { handled: true, tickCost: 0, free: true }; },
        },
    });
    const engine = makeEngineFrom(world);
    engine.start();
    captured.length = 0;
    engine.submit("defect");
    assert(engine.state.ended, "ended set");
    assert(!engine.state.dead, "NOT flagged as a mischief death");
    eq(engine.state.survived, false, "survived recorded false");
    const flat = flatOutput();
    assert(flat.includes("never arrive"), "death-ending narrative");
    assert(flat.includes("neither knew nor cared"), "cold coda (closingText) shown");
});
test("ending forcedRank overrides the score-band rankFromScore", () => {
    const world = {
        ...miniWorld({
            rooms: { r1: { id: "r1", name: "R1", description: ".", exits: {}, items: [], npcs: [] } },
            endings: {
                quit: { id: "quit", text: "Home you go.", forcedRank: "Failure" },
            },
        }),
        maxScore: 10,
        rankFromScore: () => "Operator", // would say Operator without the override
    };
    const engine = makeEngineFrom(world);
    engine.start();
    engine.state.score = 9; // high score
    captured.length = 0;
    engine.submit("quit");
    const flat = flatOutput();
    assert(flat.includes("Rank: Failure"), "forced rank wins");
    assert(!flat.includes("Operator"), "score-band rank suppressed");
});
test("engine: notes is fractional (0.1) and dedups", () => {
    const engine = makeEngine();
    engine.start();
    addNote(engine.state, { id: "n1", text: "test note", source: "harness" });
    addNote(engine.state, { id: "n1", text: "duplicate", source: "harness" });
    eq(engine.state.notes.length, 1, "dedup by id");
    const beforeTurns = engine.state.turns;
    engine.submit("notes"); // fractional
    eq(engine.state.turns, beforeTurns, "no turn increment for fractional command");
});
// --- Donovan's & Dockside Hostel check-in mechanics ---------------------
test("donovan: tap card on the desk checks in, allocates a room, files a note", () => {
    const engine = bootToHorizon();
    rideToDonovans(engine); // ends in Donovan's lobby
    assert(!engine.state.flags["donovan_checked_in"], "not checked in on arrival");
    // Talking first should point the PC at the reader (no room yet).
    captured.length = 0;
    engine.submit("talk donovan");
    assert(flatOutput().toLowerCase().includes("reader"), "Donovan directs the PC to the reader");
    assert(!engine.state.flags["donovan_checked_in"], "talk alone does not check in");
    // The scan checks in.
    engine.submit("tap card on desk");
    assert(engine.state.flags["donovan_checked_in"] === true, "scan sets checked-in flag");
    assert(typeof engine.state.flags["donovan_room"] === "string", "a room number was allocated");
    assert(engine.state.notes.some(n => n.id === "donovan_room_allocated"), "room-allocation note filed");
    // The privacy question is now waiting as a modal.
    assert(engine.inModalMode(), "privacy question opens as a modal");
});
test("donovan: the privacy question is flavour — any answer closes it", () => {
    const engine = bootToHorizon();
    rideToDonovans(engine);
    engine.submit("use id on desk"); // alternate phrasing also works
    assert(engine.inModalMode(), "privacy modal active");
    captured.length = 0;
    engine.submit("whatever you like"); // the answer doesn't matter
    assert(!engine.inModalMode(), "answering closes the modal");
    assert(flatOutput().toLowerCase().includes("as you wish"), "Donovan's uniform reply");
});
test("scan: the standardised reader verb checks in at reception (Donovan's & hostel)", () => {
    // Donovan's — `scan id` works just like the TravelTube reader verb.
    let engine = bootToHorizon();
    rideToDonovans(engine);
    engine.submit("scan id");
    assert(engine.state.flags["donovan_checked_in"] === true, "scan id checks in at Donovan's");
    engine.submit("whatever"); // dismiss the privacy modal
    // Hostel — same verb, once a booking is on file.
    engine = bootToHorizon();
    engine.state.flags["hostel_booked"] = true;
    engine.state.currentRoom = "horizon_hostel_entrance";
    engine.submit("scan id");
    assert(engine.state.flags["hostel_checked_in"] === true, "scan id checks in at the hostel");
    // Where there's no reader at all, the refusal is honest (not a tube-only message).
    engine.submit("east"); // foyer → arrival concourse (no reader)
    captured.length = 0;
    engine.submit("scan id");
    assert(flatOutput().toLowerCase().includes("no id reader"), "honest refusal where no reader exists");
});
test("hostel: every room door blinks red until booked & checked in", () => {
    const engine = bootToHorizon();
    engine.submit("west"); // arrival concourse → hostel foyer
    eq(engine.state.currentRoom, "horizon_hostel_entrance", "reached the hostel reception foyer");
    // The reception reader refuses without a booking.
    captured.length = 0;
    engine.submit("tap card on reader");
    assert(flatOutput().toLowerCase().includes("red"), "no-booking scan flashes red");
    assert(!engine.state.flags["hostel_checked_in"], "no check-in without a booking");
    assert(engine.state.flags["hostel_room"] === undefined, "no room allocated");
    // And a room door refuses too.
    engine.submit("west"); // foyer → floor-0 corridor
    eq(engine.state.currentRoom, "horizon_hostel_f0_corr1", "out into the corridor");
    captured.length = 0;
    engine.submit("north"); // try Room 01's door
    eq(engine.state.currentRoom, "horizon_hostel_f0_corr1", "the door stays shut");
    assert(flatOutput().toLowerCase().includes("red"), "room door flashes red");
});
test("hostel: book at a public terminal (off-grid), then check in at reception", () => {
    const engine = bootToHorizon();
    engine.state.flags["donovan_checked_out"] = true; // released the Donovan's reservation (defection)
    walkToRetailTerminal(engine); // to a public terminal
    engine.submit("book hostel");
    assert(engine.state.flags["hostel_booked"] === true, "booking sets the booked flag");
    assert(engine.state.notes.some(n => n.id === "hostel_booked"), "booking note filed");
    // Now check in at the hostel reception reader.
    engine.state.currentRoom = "horizon_hostel_entrance";
    engine.submit("tap card on reader");
    assert(engine.state.flags["hostel_checked_in"] === true, "scan checks in once booked");
    assert(typeof engine.state.flags["hostel_room"] === "string", "a room was allocated");
    assert(engine.state.flags["hostel_room"] !== "203", "the reserved easter-egg room is never allocated");
    assert(engine.state.notes.some(n => n.id === "hostel_room_allocated"), "room-allocation note filed");
});
test("hostel: the one-berth policy blocks a booking while the Donovan's reservation is held", () => {
    const engine = bootToHorizon(); // PC arrives holding the Donovan's reservation
    walkToRetailTerminal(engine);
    captured.length = 0;
    engine.submit("book hostel");
    assert(!engine.state.flags["hostel_booked"], "booking refused while the reservation is held");
    assert(flatOutput().includes("Donovan") && flatOutput().toLowerCase().includes("berth policy"), "the refusal cites the berth policy and the Donovan's reservation");
});
test("hostel: only the allocated room's door opens to the card", () => {
    const engine = bootToHorizon();
    engine.state.flags["hostel_checked_in"] = true;
    engine.state.flags["hostel_room"] = "01"; // force a floor-0 allocation
    engine.state.currentRoom = "horizon_hostel_entrance";
    engine.submit("west"); // floor-0 corridor
    engine.submit("north"); // Room 01 — allocated → opens
    eq(engine.state.currentRoom, "horizon_hostel_room_01", "your own door opens");
    engine.submit("south"); // back to the corridor
    captured.length = 0;
    engine.submit("south"); // Room 02 — not yours → refused
    eq(engine.state.currentRoom, "horizon_hostel_f0_corr1", "someone else's door stays shut");
    assert(flatOutput().toLowerCase().includes("isn't your room"), "wrong-room refusal");
});
// --- Sophie + the shipyard records route --------------------------------
test("sophie: reception talk + the records signpost score; the boy is a wall", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_shipyard_reception";
    engine.submit("talk sophie");
    assert(engine.state.scoreHooks.has("talked_to_sophie"), "talked-to-Sophie hook");
    engine.submit("ask sophie about records");
    assert(engine.state.scoreHooks.has("sophie_records_hint"), "records signpost scored");
    captured.length = 0;
    engine.submit("ask sophie about the boy");
    assert(flatOutput().toLowerCase().includes("people's business is their own"), "loyalty wall on the boy");
    assert(!engine.state.scoreHooks.has("records_ship_jackrabbit"), "the wall reveals nothing");
    captured.length = 0;
    engine.submit("ask sophie about oswald");
    assert(flatOutput().toLowerCase().includes("foreman"), "Ozzy/Oswald gatekept");
});
test("records: gated on the predecessor's login; reveals ship then wreck", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_blue_sector_concourse"; // has a public terminal
    // Without the saved login, the records are closed.
    captured.length = 0;
    engine.submit("access records");
    assert(!engine.state.scoreHooks.has("records_ship_jackrabbit"), "no access without credentials");
    assert(flatOutput().toLowerCase().includes("credentials") || flatOutput().toLowerCase().includes("customers-only"), "refused without the login");
    // With the login banked, the two-tier reveal unlocks.
    engine.state.flags["shipyard_creds"] = true;
    engine.submit("access records"); // Tier 1 — the ship
    assert(engine.state.scoreHooks.has("records_ship_jackrabbit"), "Tier 1: the Jackrabbit is a ship");
    assert(engine.state.notes.some(n => n.id === "records_ship_jackrabbit"), "Tier 1 note filed");
    engine.submit("access records"); // Tier 2 — the intake report
    assert(engine.state.scoreHooks.has("records_ship_wreck"), "Tier 2: the wreck / Oswald");
    assert(engine.state.notes.some(n => n.id === "records_ship_wreck"), "Tier 2 note filed");
    const sc = engine.state.score;
    engine.submit("access records"); // nothing new
    eq(engine.state.score, sc, "re-reading the open record scores nothing further");
});
// --- Brinn (the child's wall + the dormant second encounter) -------------
test("brinn: pool-tables wall — the flinch, then he bolts", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "ez2_pool_tables";
    engine.submit("talk brinn");
    assert(engine.state.scoreHooks.has("talked_to_brinn"), "talked-to-Brinn hook");
    captured.length = 0;
    engine.submit("ask brinn about tour");
    assert(flatOutput().toLowerCase().includes("tour"), "warm tour-tempt before the wall");
    captured.length = 0;
    engine.submit("ask brinn about jackrabbit");
    assert(engine.state.scoreHooks.has("brinn_wall"), "the wall scores");
    assert(flatOutput().toLowerCase().includes("bad lie"), "the visible flinch");
    assert(flatOutput().toLowerCase().includes("homework"), "he makes a child's excuse and goes");
    // He's scarpered — no longer at the pool tables.
    captured.length = 0;
    engine.submit("look");
    assert(!flatOutput().includes("Brinn is here"), "Brinn has left the pool tables");
    captured.length = 0;
    engine.submit("talk brinn");
    assert(!flatOutput().includes("New face"), "he's gone — can't be talked to here");
});
test("tube SELECT: a specific query beats a generic stop name (entertainment 2 -> Zone 2)", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_blue_sector_concourse"; // a tube stop, neither zone
    engine.submit("summon");
    engine.submit("board");
    captured.length = 0;
    engine.submit("select entertainment 2");
    assert(flatOutput().includes("Entertainment Zone 2"), "selects Zone 2");
    assert(!flatOutput().includes("Entertainment Zone 1"), "not the generic-named Zone 1");
});
test("burke: night-only — sleeping in the workshop, daybreak ushers you out", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_burke_s_workshop";
    engine.state.ticks = engine.state.dayLength + 5;
    engine.state.isDaytime = false; // night, 95 ticks shy of daybreak
    captured.length = 0;
    engine.submit("sleep"); // sleeps to daybreak; Burke then ejects
    assert(engine.state.isDaytime, "woke into the day");
    eq(engine.state.currentRoom, "horizon_narrow_corridor8", "ushered out to the corridor");
    assert(flatOutput().toLowerCase().includes("daylight"), "Burke's eject line landed");
});
test("brinn: the second encounter stays dormant until the defection/flee path", () => {
    const engine = bootToHorizon();
    engine.state.scoreHooks.add("talked_to_brinn"); // met him already
    engine.state.currentRoom = "lcd_corridor_w2";
    engine.submit("wait"); // tick in the corridor
    assert(!engine.state.scoreHooks.has("brinn_second_encounter"), "no second encounter without the path flag");
    // Once on the defection path, entering/acting in the corridor fires it once.
    engine.state.flags["defecting"] = true;
    captured.length = 0;
    engine.submit("wait");
    assert(engine.state.scoreHooks.has("brinn_second_encounter"), "second encounter fires on the path");
    assert(flatOutput().includes("Brinn"), "the encounter names Brinn so the player knows who it is");
    assert(flatOutput().toLowerCase().includes("i hope he still does"), "the farewell line lands");
    assert(engine.state.notes.some(n => n.id === "brinn_second_encounter"), "second-encounter note filed");
    const sc = engine.state.score;
    engine.submit("wait");
    eq(engine.state.score, sc, "it fires only once");
});
// --- Burke Beat 1 (night-only; the first transaction) --------------------
test("burke: the workshop is shut by day, open at night", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_narrow_corridor8";
    engine.state.ticks = 50;
    engine.state.isDaytime = true; // daytime (ticks < dayLength)
    captured.length = 0;
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_narrow_corridor8", "day: the door is shut");
    assert(flatOutput().toLowerCase().includes("back at night"), "day: the BACK AT NIGHT card");
    engine.state.ticks = engine.state.dayLength + 5;
    engine.state.isDaytime = false; // night
    engine.submit("east");
    eq(engine.state.currentRoom, "horizon_burke_s_workshop", "night: the door opens");
});
test("burke: talk is a greeting; the transaction fires only on asking about the boy", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_burke_s_workshop";
    engine.state.ticks = engine.state.dayLength + 5;
    engine.state.isDaytime = false; // night (isDaytime is derived from ticks)
    // TALK = greeting only: no charge, no score, no boy.
    const start = engine.state.flags["credits"];
    captured.length = 0;
    engine.submit("talk burke");
    assert(engine.state.flags["burke_met"] === true, "burke_met latched on talk");
    assert(!engine.state.scoreHooks.has("first_burke_transaction"), "talk doesn't transact");
    eq(engine.state.flags["credits"], start, "talk doesn't charge");
    assert(!flatOutput().includes("Jackrabbit"), "talk doesn't reveal the boy");
    // ASK ABOUT JACKRABBIT = step 1: he names his price, divulges nothing, no charge.
    captured.length = 0;
    engine.submit("ask burke about jackrabbit");
    assert(!engine.state.scoreHooks.has("first_burke_transaction"), "no transaction before payment");
    eq(engine.state.flags["credits"], start, "nothing charged before payment");
    assert(flatOutput().toLowerCase().includes("scan"), "he demands an ID scan to pay first");
    // SCAN ID (at his bench reader) = pay → only THEN the sliver + the free nudge.
    captured.length = 0;
    engine.submit("scan id");
    assert(engine.state.scoreHooks.has("first_burke_transaction"), "paying scores the transaction");
    assert(engine.state.notes.some(n => n.id === "burke_first_transaction"), "transaction note filed");
    eq(engine.state.flags["credits"], start - 10, "the fee debited on payment");
    assert(flatOutput().toLowerCase().includes("who you're actually working for"), "the Strand-2 nudge thrown in");
    // Paying / asking again doesn't re-charge or re-score.
    const sc = engine.state.score, bal = engine.state.flags["credits"];
    engine.submit("scan id");
    eq(engine.state.flags["credits"], bal, "no second charge on a re-scan");
    engine.submit("ask burke about jackrabbit");
    eq(engine.state.score, sc, "no re-score");
});
// --- Batch 2 NPCs: Celeste server, Ozzy, Chas (+ the interlock) -----------
test("celeste server: talk scores + the vivid ceiling, nothing actionable", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "cda_burrito";
    captured.length = 0;
    engine.submit("talk server");
    assert(engine.state.scoreHooks.has("talked_to_celeste_server"), "talking scores");
    assert(engine.state.notes.some(n => n.id === "celeste_encounter"), "encounter note filed");
    captured.length = 0;
    engine.submit("ask server about jackrabbit");
    assert(flatOutput().toLowerCase().includes("fine young man"), "her ceiling: a fine young man");
    assert(!flatOutput().toLowerCase().includes("abbott"), "she never gives a real name");
});
test("celeste server: buying a meal warms her food topic", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "cda_burrito";
    engine.state.flags["credits"] = 50;
    engine.submit("buy burrito");
    assert(engine.state.flags["bought_at_celeste"] === true, "the purchase flag latches");
    assert(engine.state.inventory.includes("celeste_meal"), "the meal is in hand");
    captured.length = 0;
    engine.submit("ask server about food");
    assert(flatOutput().toLowerCase().includes("won't tell you how"), "warmer, customer-grade food talk");
});
test("ozzy: night-gated in the Brass Rail — absent by day, present by night", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "ez1_brass_rail";
    // Day: not there.
    engine.state.ticks = 5;
    engine.state.isDaytime = true;
    engine.submit("wait");
    captured.length = 0;
    engine.submit("talk ozzy");
    assert(flatOutput().toLowerCase().includes("no ozzy"), "absent by day");
    // Night: present.
    engine.state.ticks = engine.state.dayLength + 5;
    engine.state.isDaytime = false;
    engine.submit("wait");
    captured.length = 0;
    engine.submit("talk ozzy");
    assert(engine.state.scoreHooks.has("talked_to_ozzy"), "present and talkable by night");
    assert(engine.state.notes.some(n => n.id === "ozzy_encounter"), "ozzy note filed");
});
test("ozzy: the ship-name confirmation needs the records reveal first", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "ez1_brass_rail";
    engine.state.ticks = engine.state.dayLength + 5;
    engine.state.isDaytime = false;
    engine.submit("wait");
    // Without knowing it's a ship: the flat "person or a ship?" wall.
    captured.length = 0;
    engine.submit("ask ozzy about jackrabbit");
    assert(flatOutput().toLowerCase().includes("person or a ship"), "the wall when it's still a name");
    assert(!engine.state.scoreHooks.has("ozzy_ship_name_confirm"), "no ship-name score yet");
    // Knowing it's a ship: he confirms he named her (+2).
    engine.state.flags["jackrabbit_is_ship"] = true;
    captured.length = 0;
    engine.submit("ask ozzy about jackrabbit");
    assert(engine.state.scoreHooks.has("ozzy_ship_name_confirm"), "the proud confirmation scores");
    assert(flatOutput().toLowerCase().includes("named her myself"), "he named her");
});
test("interlock: the records reveal sets the Jackrabbit-is-a-ship flag", () => {
    const engine = bootToHorizon();
    engine.state.flags["shipyard_creds"] = true; // banked from the predecessor's kit
    engine.state.currentRoom = "horizon_blue_sector_concourse"; // has a public terminal
    engine.submit("access records"); // Tier 1 — it's a ship
    assert(engine.state.flags["jackrabbit_is_ship"] === true, "Tier 1 unlocks Ozzy's beat");
});
test("chas: Beat 1 contempt, then the spite-crack on revealing the hunt (+4)", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "ez1_long_shot";
    engine.state.ticks = engine.state.dayLength + 5;
    engine.state.isDaytime = false;
    engine.submit("wait");
    // Beat 1: present, talk scores, jackrabbit topic gives contempt but no name.
    captured.length = 0;
    engine.submit("talk chas");
    assert(engine.state.scoreHooks.has("talked_to_chas"), "first conversation scores");
    captured.length = 0;
    engine.submit("ask chas about jackrabbit");
    assert(flatOutput().toLowerCase().includes("little nobody"), "Beat 1 contempt");
    assert(!flatOutput().toLowerCase().includes("abbott"), "no name in Beat 1");
    // Beat 2: reveal the hunt -> the crack.
    const before = engine.state.score;
    captured.length = 0;
    engine.submit("ask chas about hunting");
    assert(engine.state.scoreHooks.has("chas_gave_intel"), "the crack scores");
    eq(engine.state.score, before + 4, "+4 for the hard intel");
    assert(flatOutput().includes("Jack Abbott"), "Jack's real name");
    assert(engine.state.flags["jack_real_name"] === true, "real-name flag set");
    assert(engine.state.flags["jackrabbit_is_ship"] === true, "ship flag set as a side effect");
    assert(engine.state.notes.some(n => n.id === "chas_intel"), "intel note filed");
    // Idempotent.
    const sc = engine.state.score;
    engine.submit("ask chas about hunting");
    eq(engine.state.score, sc, "the crack fires only once");
});
test("long shot: a back bar reached east from the Brass Rail", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "ez1_brass_rail";
    engine.submit("east");
    eq(engine.state.currentRoom, "ez1_long_shot", "east into the Long Shot");
    engine.submit("west");
    eq(engine.state.currentRoom, "ez1_brass_rail", "and back west");
});
test("teng: atmospheric until the defect pathway, then the berth pointer (+2)", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "lcd_teng_brokerage";
    // Dormant: the ship topic gives nothing, scores nothing.
    captured.length = 0;
    engine.submit("ask teng about ship");
    assert(!engine.state.scoreHooks.has("talked_to_teng"), "no score off the defect pathway");
    assert(flatOutput().toLowerCase().includes("nothing here is what you need"), "professional, unhelpful");
    // On the defect pathway: the full beat + the berth pointer.
    engine.state.flags["defect_pathway"] = true;
    const before = engine.state.score;
    captured.length = 0;
    engine.submit("ask teng about escape");
    assert(engine.state.scoreHooks.has("talked_to_teng"), "the berth-pointer beat scores");
    eq(engine.state.score, before + 2, "+2 for the pointer");
    assert(flatOutput().toLowerCase().includes("bay 47"), "points at Bay 47 / the Raven");
    assert(engine.state.notes.some(n => n.id === "teng_encounter"), "teng note filed");
    // Jack topic: a clean refusal at all times.
    captured.length = 0;
    engine.submit("ask teng about jackrabbit");
    assert(flatOutput().toLowerCase().includes("i sell ships"), "clean Jack refusal");
});
test("rajah: the three-stage thread — home, the unit, the back room, the commit (+3)", () => {
    const engine = bootToHorizon();
    // Before Burke's referral she's nowhere, and her unit is shut.
    engine.state.currentRoom = "lcd_rajah_front";
    captured.length = 0;
    engine.submit("look");
    assert(flatOutput().toLowerCase().includes("shut"), "the pharmacy is shut before the thread");
    assert(!engine.state.flags["rajah_home_met"], "not yet redirected");
    // Burke's referral picks + places her at a random Zone B residence.
    const address = referRajahToResidence(engine.state);
    const home = engine.state.flags["rajah_residence"];
    assert(typeof home === "string" && home.length > 0, "a residence was chosen");
    assert(engine.state.npcLocations?.["rajah"] === home, "Rajah placed at her home");
    engine.state.flags["burke_referred_rajah"] = true;
    // Stage 2: found at home, she won't talk there — redirects to her unit.
    engine.state.currentRoom = home;
    captured.length = 0;
    engine.submit("talk rajah");
    assert(flatOutput().toLowerCase().includes("not here"), "she won't talk at home");
    assert(engine.state.flags["rajah_home_met"] === true, "home meeting latches");
    const relocated = engine.state.npcLocations?.["rajah"];
    assert(relocated === "lcd_rajah_front", "she relocates to her unit");
    assert(engine.state.notes.some(n => n.id === "rajah_home_met"), "home-meeting note filed");
    // Stage 3a: at the unit, TALK takes her through to the consulting room.
    engine.state.currentRoom = "lcd_rajah_front";
    captured.length = 0;
    engine.submit("look");
    assert(flatOutput().toLowerCase().includes("consulting room"), "the unit is open now");
    engine.submit("talk rajah");
    assert(engine.state.flags["rajah_invited"] === true, "she heads for the back room");
    const inBack = engine.state.npcLocations?.["rajah"];
    assert(inBack === "lcd_rajah_back", "she's in the consulting room");
    engine.submit("follow rajah"); // the PC follows her through
    eq(engine.state.currentRoom, "lcd_rajah_back", "the PC follows into the consulting room");
    // Stage 3b: the privacy explanation; the card is NOT lying in the room.
    captured.length = 0;
    engine.submit("talk rajah");
    assert(flatOutput().toLowerCase().includes("private"), "she explains the guaranteed privacy");
    captured.length = 0;
    engine.submit("look");
    assert(!flatOutput().toLowerCase().includes("datacard"), "the card is not sitting in the room");
    // Stage 3c: asking arms the commit; declining keeps the offer, no card.
    captured.length = 0;
    engine.submit("ask rajah about resistance");
    assert(flatOutput().toLowerCase().includes("done with them"), "she asks for commitment");
    engine.submit("no");
    assert(!engine.state.flags["rajah_committed"], "declining does not commit");
    assert(!engine.state.inventory.includes("rajah_datacard"), "no card without commitment");
    // Committing hands the card over (scores +3) and urges an offline datapad.
    const before = engine.state.score;
    engine.submit("ask rajah about resistance");
    captured.length = 0;
    engine.submit("yes");
    assert(engine.state.flags["rajah_committed"] === true, "commitment latches");
    assert(engine.state.inventory.includes("rajah_datacard"), "she hands the card over");
    assert(flatOutput().toLowerCase().includes("offline"), "she urges an offline machine");
    assert(engine.state.scoreHooks.has("received_rajah_datacard"), "the datacard scores");
    eq(engine.state.score, before + 3, "+3 for the datacard");
    assert(engine.state.notes.some(n => n.id === "rajah_datacard"), "datacard note filed");
});
test("rajah datacard: never load it onto the AetherLink datapad", () => {
    const engine = bootToHorizon();
    // Hand the PC the card directly (the hand-off is exercised above).
    engine.state.inventory.push("rajah_datacard");
    const stupid = "inconceivably stupid";
    captured.length = 0;
    engine.submit("use datapad on datacard");
    assert(flatOutput().toLowerCase().includes(stupid), "datapad → datacard refused");
    captured.length = 0;
    engine.submit("use datacard on datapad");
    assert(flatOutput().toLowerCase().includes(stupid), "datacard → datapad refused");
    captured.length = 0;
    engine.submit("load datacard");
    assert(flatOutput().toLowerCase().includes(stupid), "load datacard refused");
});
test("datacards: qualified names disambiguate when the PC holds both", () => {
    const engine = bootToHorizon();
    engine.state.inventory.push("burke_software"); // the "software datacard"
    engine.state.inventory.push("rajah_datacard"); // the "resistance datacard"
    captured.length = 0;
    engine.submit("examine software datacard");
    assert(flatOutput().toLowerCase().includes("payment chain"), "software datacard -> Burke's analysis package");
    captured.length = 0;
    engine.submit("examine resistance datacard");
    assert(flatOutput().toLowerCase().includes("coordinates"), "resistance datacard -> Rajah's");
});
test("save/load: the datacard's world `load` command must not shadow restoring a save", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_blue_sector_concourse"; // a distinctive room
    engine.submit("save");
    engine.state.currentRoom = "horizon_arrival_concourse"; // move away
    captured.length = 0;
    engine.submit("load"); // the bare restore verb
    assert(flatOutput().includes("Game loaded"), "`load` restores the save (not the datacard handler)");
    eq(engine.state.currentRoom, "horizon_blue_sector_concourse", "state was actually restored");
    // `restore` (the synonym) must work too.
    engine.state.currentRoom = "horizon_arrival_concourse";
    captured.length = 0;
    engine.submit("restore");
    eq(engine.state.currentRoom, "horizon_blue_sector_concourse", "`restore` also restores the save");
    // ...and the datacard prohibition still fires when the card is in hand.
    engine.state.inventory.push("rajah_datacard");
    captured.length = 0;
    engine.submit("load datacard");
    assert(flatOutput().toLowerCase().includes("inconceivably stupid"), "load datacard still refused");
});
// --- A–C: Barty, the sandwich-buy leak, the predecessor failsafe ---------
test("barty: the scan-in greeting + the independence stance score", () => {
    const engine = bootToHorizon();
    captured.length = 0;
    engine.submit("talk barty");
    assert(engine.state.flags["id_scanned"] === true, "Barty scans the ID on first talk");
    assert(flatOutput().toLowerCase().includes("hostel"), "his opener points at the hostel");
    engine.submit("ask barty about horizon");
    assert(engine.state.scoreHooks.has("asked_barty_horizon"), "the independence stance scores");
});
test("barty: either sensitive refusal scores asked_barty_sensitive once", () => {
    const engine = bootToHorizon();
    engine.submit("talk barty");
    const before = engine.state.score;
    engine.submit("ask barty about ships");
    assert(engine.state.scoreHooks.has("asked_barty_sensitive"), "the docks/ships refusal scores");
    eq(engine.state.score, before + 2, "+2 for the first sensitive refusal");
    engine.submit("ask barty about jackrabbit");
    eq(engine.state.score, before + 2, "the target refusal doesn't double-score");
});
test("food hall: she asks which filling; only apricot jam leaks the Jackrabbit (Nkosi)", () => {
    const engine = bootToHorizon();
    toSandwichCounter(engine);
    // A bare "buy sandwich" no longer defaults to apricot — she asks which filling.
    captured.length = 0;
    engine.submit("buy sandwich");
    assert(flatOutput().toLowerCase().includes("what filling"), "she asks which filling");
    assert(!engine.state.inventory.includes("sandwich"), "nothing bought on the prompt");
    assert(!engine.state.scoreHooks.has("sandwich_vendor_jam"), "no leak from the prompt");
    // A non-apricot filling: a plain sandwich, no leak, no score.
    captured.length = 0;
    engine.submit("buy cheese sandwich");
    assert(engine.state.inventory.includes("sandwich"), "a cheese sandwich is a sandwich");
    assert(!engine.state.scoreHooks.has("sandwich_vendor_jam"), "no leak from the cheese order");
    engine.submit("eat sandwich"); // clear it so we can buy again
    // The apricot-jam easter egg: the leak + both hooks.
    captured.length = 0;
    engine.submit("buy apricot sandwich");
    assert(flatOutput().includes("Jackrabbit's favourite"), "apricot draws out the volunteer leak");
    assert(engine.state.scoreHooks.has("sandwich_vendor_he"), "gender hook via the leak");
    assert(engine.state.scoreHooks.has("sandwich_vendor_jam"), "jam hook via the leak");
});
test("predecessor: the datapad failsafe cracks the sealed brief (+5)", () => {
    const engine = bootToHorizon();
    walkToLavatory(engine);
    engine.submit("open panel");
    engine.submit("take weathered datapad"); // carries the brief; PC already holds its twin
    const before = engine.state.score;
    captured.length = 0;
    engine.submit("use datapad on weathered datapad"); // the failsafe (either order works)
    assert(engine.state.flags["predecessor_brief_unlocked"] === true, "the brief unlocks");
    assert(engine.state.scoreHooks.has("predecessor_same_job"), "scores predecessor_same_job");
    eq(engine.state.score, before + 5, "+5 for the failsafe crack");
    assert(flatOutput().toLowerCase().includes("sent first") || flatOutput().toLowerCase().includes("replacement"), "the reveal: he was sent first; you're the replacement");
    assert(engine.state.notes.some(n => n.id === "predecessor_brief_unlocked"), "unlock note filed");
    captured.length = 0;
    engine.submit("read his brief");
    assert(!flatOutput().includes("won't open"), "the brief now reads as open");
});
test("LCD: the noodle counter actually sells noodles", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "lcd_noodle_counter";
    const before = engine.state.flags["credits"];
    engine.submit("buy noodles");
    assert(engine.state.inventory.includes("noodles"), "noodles now carried");
    eq(engine.state.flags["credits"], before - 2, "charged the noodle price");
    captured.length = 0;
    engine.submit("eat noodles");
    assert(flatOutput().toLowerCase().includes("broth"), "ate the noodles");
    assert(!engine.state.inventory.includes("noodles"), "consumed");
});
test("tube: the Retail↔LCD ride is overridden to 3 ticks", () => {
    const engine = bootToHorizon();
    walkToRetailStop(engine);
    engine.submit("summon");
    engine.submit("board");
    engine.submit("select lower commercial");
    const before = engine.state.ticks;
    engine.submit("sit"); // departs; ride runs on the pod's clock
    engine.submit("wait 20"); // interruptible; stops on arrival
    engine.submit("disembark");
    eq(engine.state.currentRoom, "lcd_tube_stop", "arrived at the LCD stop");
    // sit (1) + 3-tick ride + disembark (1) = 5 ticks total — well under the old 8-tick ride.
    assert(engine.state.ticks - before <= 6, `short hop (took ${engine.state.ticks - before} ticks incl. boarding moves)`);
});
test("hidden items: sub-documents aren't listed in the room or swept by 'take all'", () => {
    const engine = bootToHorizon();
    walkToLavatory(engine);
    engine.submit("open panel"); // kit (incl. hidden sub-docs) now in the room
    captured.length = 0;
    engine.submit("look");
    const look = flatOutput();
    assert(look.includes("weathered datapad"), "the datapad is listed");
    assert(!look.includes("his diary") && !look.includes("his saved login") && !look.includes("his contract brief"), "the datapad's sub-documents are not listed in the room");
    captured.length = 0;
    engine.submit("take all");
    assert(engine.state.inventory.includes("predecessor_datapad"), "take all picks up the datapad");
    assert(!flatOutput().includes("his diary"), "take all doesn't name the sub-documents");
    // The sub-docs still travelled with the datapad (via its onTake) and stay in scope.
    // Crack the 'pad (both held), then the now-unsealed login reads — proving scope.
    engine.submit("use datapad on weathered datapad");
    captured.length = 0;
    engine.submit("read his credentials");
    assert(flatOutput().includes("Sophie"), "sub-documents remain in scope after take all");
});
test("predecessor: the failsafe wants his datapad in hand", () => {
    const engine = bootToHorizon();
    walkToLavatory(engine);
    engine.submit("open panel"); // his pad is in the room, not held
    captured.length = 0;
    engine.submit("use datapad on weathered datapad");
    assert(flatOutput().toLowerCase().includes("in hand"), "nudged to pick his datapad up first");
    assert(!engine.state.flags["predecessor_brief_unlocked"], "no unlock from the floor");
    engine.submit("take weathered datapad");
    engine.submit("use datapad on weathered datapad");
    assert(engine.state.flags["predecessor_brief_unlocked"] === true, "unlocks once both are held");
});
test("burke: Beat 2 — the timed routing reveal, then sells the analysis software", () => {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_burke_s_workshop";
    engine.state.ticks = engine.state.dayLength + 5;
    engine.state.isDaytime = false; // night (isDaytime is derived from ticks)
    engine.submit("talk burke"); // greeting
    engine.submit("ask burke about jackrabbit"); // Beat 1 step 1 — names the price
    engine.submit("scan id"); // pay → stamps the Beat-2 clock
    // Same night: nothing new yet.
    captured.length = 0;
    engine.submit("talk burke");
    assert(!engine.state.flags["burke_beat2"], "Beat 2 not open the same night");
    assert(flatOutput().includes("Back again"), "just the holding greeting");
    // A full day-night later, Burke volunteers the routing oddity (no paymaster name).
    engine.state.ticks += engine.state.dayLength * 2 + 1;
    captured.length = 0;
    engine.submit("talk burke");
    assert(engine.state.flags["burke_beat2"] === true, "Beat 2 fires on the timed return");
    assert(flatOutput().toLowerCase().includes("deliberate"), "the laundered-routing reveal");
    assert(!flatOutput().toLowerCase().includes("aetherlink"), "Burke does NOT name the paymaster");
    assert(engine.state.notes.some(n => n.id === "burke_routing_oddity"), "routing note filed");
    // The unaffordable trace steers to the software.
    captured.length = 0;
    engine.submit("buy trace");
    assert(flatOutput().toLowerCase().includes("software"), "the trace is unaffordable; points at the software");
    assert(!engine.state.inventory.includes("burke_software"), "no software from the trace path");
    // BUY SOFTWARE agrees the deal but doesn't charge — payment is the ID scan.
    const before = engine.state.flags["credits"];
    captured.length = 0;
    engine.submit("buy software");
    assert(!engine.state.inventory.includes("burke_software"), "not handed over until you pay");
    eq(engine.state.flags["credits"], before, "no charge on agreeing");
    assert(flatOutput().toLowerCase().includes("scan"), "directed to scan the reader");
    // SCAN ID at the bench reader pays the 50 and Burke hands over the software datacard.
    captured.length = 0;
    engine.submit("scan id");
    assert(engine.state.inventory.includes("burke_software"), "the software datacard is now carried");
    eq(engine.state.flags["credits"], before - 50, "charged the software price on the scan");
    assert(engine.state.scoreHooks.has("bought_analysis_software"), "scored the purchase");
    assert(engine.state.flags["burke_software_bought"] === true, "purchase latched");
    assert(engine.state.notes.some(n => n.id === "bought_burke_software"), "purchase note filed");
    assert(flatOutput().toLowerCase().includes("datacard"), "handed over as a datacard");
});
test("burke: the bought software seeds the Strand-2 analysis at a public terminal", () => {
    const engine = bootToHorizon();
    engine.state.inventory.push("burke_software"); // as if bought from Burke
    engine.state.currentRoom = "horizon_blue_sector_concourse"; // has a public terminal
    engine.submit("use software on terminal");
    assert(engine.state.scoreHooks.has("seeded_analysis"), "the bought software starts the analysis running");
});
/** Position the PC at Burke's, mid-game, with the Beat-3 gate satisfied. */
function bootToBurkePivotGate() {
    const engine = bootToHorizon();
    engine.state.currentRoom = "horizon_burke_s_workshop";
    engine.state.ticks = engine.state.dayLength + 5;
    engine.state.isDaytime = false; // night (isDaytime is derived from ticks)
    engine.state.flags["burke_met"] = true; // Beats 1-2 already behind us
    engine.state.flags["burke_software_bought"] = true; // software bought...
    engine.state.flags["analysis_resolved"] = true; // ...and resolved (Strand 2 complete)
    engine.state.flags["predecessor_brief_unlocked"] = true; // predecessor brief cracked (same job, he's dead)
    engine.state.flags["PC_REAL_NAME"] = "Dana Okoro";
    return engine;
}
test("burke: Beat 3 — the pivot fires on the gate; the real name + predecessor land", () => {
    const engine = bootToBurkePivotGate();
    captured.length = 0;
    engine.submit("talk burke");
    const out = flatOutput();
    assert(engine.state.flags["burke_pivot_done"] === true, "the pivot fired");
    assert(engine.state.scoreHooks.has("burke_pivot"), "scored reaching the pivot");
    assert(out.includes("Dana Okoro"), "Burke speaks the PC's real name");
    assert(out.includes("John Smith") && out.includes("Stuart McAlister"), "predecessor alias + real name revealed");
    assert(engine.state.notes.some(n => n.id === "burke_pivot"), "pivot note filed");
    // The gate must hold: it must NOT have fired the 'go use the terminal' reminder.
    assert(!out.toLowerCase().includes("set it running"), "the software reminder did not pre-empt the pivot");
    // Re-talk re-cues the choice without re-dumping the speech.
    captured.length = 0;
    engine.submit("talk burke");
    assert(flatOutput().includes("Two roads"), "post-pivot talk re-cues the choice");
    assert(!flatOutput().includes("Stuart McAlister"), "the speech is not replayed");
});
test("burke: Beat 3 — Defect takes the Rajah rumour and shuts the Flee road (irreversible)", () => {
    const engine = bootToBurkePivotGate();
    engine.submit("talk burke"); // the pivot
    captured.length = 0;
    engine.submit("ask burke about name"); // "the name" -> the Defect road
    assert(flatOutput().toLowerCase().includes("rajah"), "Burke names Rajah");
    // He sends the PC to where she LIVES — a Zone B residence — not her shop.
    assert(flatOutput().toLowerCase().includes("residential zone b"), "directs to her Zone B home");
    assert(!flatOutput().toLowerCase().includes("scrap"), "no longer references the (eastern) scrap dealer");
    assert(engine.state.flags["defecting"] === true, "defecting latched");
    assert(engine.state.flags["burke_referred_rajah"] === true, "Rajah's resistance gate opened");
    // A random-but-persistent residence is chosen, and Rajah is placed there.
    const home = engine.state.flags["rajah_residence"];
    assert(typeof home === "string" && home.includes("residential_zone_b_residence_"), "a Zone B residence is chosen");
    assert(flatOutput().includes(engine.world.rooms[home].name), "Burke quotes the actual address");
    assert(engine.state.npcLocations?.["rajah"] === home, "Rajah is placed at that residence");
    assert(engine.state.notes.some(n => n.id === "burke_rajah_rumour"), "Rajah note filed");
    // The Flee road is now permanently shut.
    captured.length = 0;
    engine.submit("ask burke about leaving");
    assert(flatOutput().toLowerCase().includes("closed"), "the clean road is closed after defecting");
    assert(!engine.state.ended, "asking to leave after defecting does NOT end the game");
});
test("burke: Beat 3 — the Flee confirm triggers the (stub) Flee ending", () => {
    const engine = bootToBurkePivotGate();
    engine.submit("talk burke"); // the pivot
    captured.length = 0;
    engine.submit("ask burke about leaving"); // arms the terminal confirm
    assert(flatOutput().includes("sure"), "the terminal confirm prompt");
    const endedBeforeConfirm = engine.state.ended;
    assert(!endedBeforeConfirm, "the confirm has not resolved yet");
    engine.submit("yes"); // commit
    assert(engine.state.flags["fleeing"] === true, "fleeing latched");
    assert(engine.state.ended === true, "the Flee ending resolved");
    eq(engine.state.endingId, "flee", "endingId = flee");
    assert(engine.state.survived === true, "survived the flee");
});
// --- summary ------------------------------------------------------------
setTimeout(() => {
    console.log("");
    console.log(`Result: ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
}, 50);
//# sourceMappingURL=engine.test.js.map