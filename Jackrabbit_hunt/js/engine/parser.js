// Two-word parser with mild forgiveness. Spec §4.4.
//
// Accepted forms:
//   <verb>
//   <verb> <noun>
//   <verb> <noun> <preposition> <noun2>
//   <direction>            (shorthand: "n", "north" => "go north")
// Words stripped from input before tokenising.
const NOISE_WORDS = new Set([
    "the", "a", "an",
]);
// "to" and "at" are noise except when they may appear as prepositions; we
// keep them in for the prep-pass and the verb table treats them sensibly.
const PREPOSITIONS = new Set([
    "on", "in", "with", "to", "at", "about", "from", "into", "onto", "under", "over", "behind",
]);
// Canonical verb -> set of accepted aliases (excluding the canonical form itself,
// which is always accepted). Direction tokens are handled separately.
export const VERB_SYNONYMS = {
    // movement
    go: ["move", "walk", "travel", "head"],
    follow: ["trail"],
    north: ["n"],
    south: ["s"],
    east: ["e"],
    west: ["w"],
    up: ["u"],
    down: ["d"],
    in: [],
    out: [],
    enter: [],
    exit: [],
    // looking / examining
    look: ["l"],
    examine: ["x", "inspect", "describe"],
    read: [],
    search: [],
    // inventory
    inventory: ["i", "inv"],
    take: ["get", "grab", "pick"],
    drop: ["leave", "discard"],
    give: [],
    // interaction
    use: [],
    push: ["shove", "pull"],
    open: ["flip", "lift"],
    close: ["shut"],
    tap: [],
    talk: ["speak"],
    ask: ["tell"],
    buy: ["purchase"],
    // meta
    score: [],
    time: [],
    help: ["?"],
    notes: ["journal", "note"],
    add: ["jot"],
    save: [],
    load: ["restore"],
    export: [],
    import: [],
    restart: ["reset"],
    quit: ["exit-game"],
    // wait
    wait: ["z"],
};
const ALIAS_TO_VERB = (() => {
    const m = new Map();
    for (const [verb, aliases] of Object.entries(VERB_SYNONYMS)) {
        m.set(verb, verb);
        for (const a of aliases)
            m.set(a, verb);
    }
    return m;
})();
const COMPASS = new Set([
    "north", "south", "east", "west", "up", "down", "in", "out",
    // Shipboard directions, used by the shuttle and liner scenes. These don't
    // alias to compass directions (port isn't reliably "west" on a rotating
    // cylinder or shuttle); world content just declares exits using them.
    // 'back' is deliberately NOT included — too easily confused with "the way I
    // came from", and it would shadow any author intent to give it that meaning.
    "aft", "forward", "fore", "port", "starboard",
]);
const COMPASS_ALIAS_TO_DIR = {
    n: "north", s: "south", e: "east", w: "west", u: "up", d: "down",
};
/** Normalise an input string. */
export function normalise(input) {
    return input.trim().toLowerCase().replace(/\s+/g, " ");
}
/**
 * Parse a single input line into a ParsedCommand. Returns null only for
 * empty input; otherwise always returns a command (the engine decides whether
 * the verb is meaningful).
 */
export function parse(input) {
    const raw = normalise(input);
    if (!raw)
        return null;
    // Case-preserving, whitespace-collapsed copy of the input — for commands that
    // carry free text (e.g. ADD NOTE), where the player's capitalisation matters.
    const original = input.trim().replace(/\s+/g, " ");
    // Tokenise then drop pure noise words.
    let tokens = raw.split(" ").filter(t => t.length > 0);
    tokens = tokens.filter(t => !NOISE_WORDS.has(t));
    if (tokens.length === 0)
        return { verb: "", raw, original };
    // Direction shorthand: a single token that's a compass dir or alias.
    const first = tokens[0];
    if (tokens.length === 1) {
        if (COMPASS.has(first)) {
            return { verb: "go", rawVerb: first, noun: first, raw, original };
        }
        if (first in COMPASS_ALIAS_TO_DIR) {
            return { verb: "go", rawVerb: first, noun: COMPASS_ALIAS_TO_DIR[first], raw, original };
        }
    }
    // Resolve verb via alias map; if the first token isn't a known verb, pass
    // it through as-is so the engine can complain meaningfully.
    const verb = ALIAS_TO_VERB.get(first) ?? first;
    const rawVerb = first;
    let rest = tokens.slice(1);
    // Strip a leading CONNECTIVE preposition: "talk TO passenger", "look AT
    // panel", "listen TO music". Without this, "talk to X about Y" would find its
    // first preposition at index 0 ("to") and fail to split on the real one
    // ("about"), folding the topic into the noun ("X about Y").
    if (rest.length > 0 && PREPOSITIONS.has(rest[0]))
        rest = rest.slice(1);
    if (rest.length === 0)
        return { verb, rawVerb, raw, original };
    // Look for the first preposition to split <noun> <prep> <noun2>.
    const prepIdx = rest.findIndex(t => PREPOSITIONS.has(t));
    if (prepIdx > 0 && prepIdx < rest.length - 1) {
        const noun = rest.slice(0, prepIdx).join(" ");
        const preposition = rest[prepIdx];
        const noun2 = rest.slice(prepIdx + 1).join(" ");
        return { verb, rawVerb, noun, preposition, noun2, raw, original };
    }
    // Otherwise everything after the verb is the noun phrase.
    const noun = rest.join(" ");
    return noun ? { verb, rawVerb, noun, raw, original } : { verb, rawVerb, raw, original };
}
/** Expose the canonical verb table (useful for help text and tests). */
export function knownVerbs() {
    return Object.keys(VERB_SYNONYMS).sort();
}
