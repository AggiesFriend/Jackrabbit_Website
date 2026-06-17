// Strand 2 — the AetherLink analysis (spec §5.4; plot §2; TODO B5).
//
// Burke sells the PC a blockchain-analysis package. The PC SEEDS it at a public
// terminal (open ledgers + civic data), and from that moment it RUNS on the
// world clock: a background process that resolves after a set number of ticks,
// at which point it names AetherLink as the ultimate paymaster. This is the
// "software + public-terminal access + elapsed time" mechanism — deliberately
// time-bound so it can later be tensioned against the contract deadline.
//
// The elapsed-time tracking mirrors the shuttle's scene clock: stamp a baseline
// tick when seeded (FLAG_ANALYSIS_SEEDED_AT), then `s.ticks - baseline` is how
// long it has been running. analysisWorldTick() is wired into World.onTick, so
// it advances on every paid turn no matter where the PC is — the analysis runs
// while they go about their business, and chimes in when it's done.
//
// NOTE: Burke himself isn't built yet, so nothing places `burke_software` in
// the world automatically. The item + the whole timer are ready for him to
// hand over; until then the mechanism is exercised by the tests.
import { FLAG_ANALYSIS_SEEDED_AT, FLAG_ANALYSIS_COMPLETE, FLAG_ANALYSIS_RESOLVED, ANALYSIS_CYCLES_TO_UNLOCK, HOOK_SEEDED_ANALYSIS, HOOK_AETHERLINK_IDENTIFIED, FLAG_DONOVAN_CHECKED_IN, FLAG_HOSTEL_BOOKED, FLAG_HOSTEL_CHECKED_IN, } from "./flags.js";
import { score } from "./scoring.js";
import { addNote } from "../../engine/notes.js";
/** Where the analysis is in its lifecycle. "complete" = finished computing and
 *  the datapad has chimed, but the PC hasn't yet logged on to read it; "resolved"
 *  = read at a terminal (AetherLink learned, scored). */
export function analysisPhase(s) {
    if (s.flags[FLAG_ANALYSIS_RESOLVED])
        return "resolved";
    if (s.flags[FLAG_ANALYSIS_COMPLETE])
        return "complete";
    if (typeof s.flags[FLAG_ANALYSIS_SEEDED_AT] === "number")
        return "running";
    return "unseeded";
}
/** Ticks the analysis has been running, or -1 if it hasn't been seeded yet. */
export function analysisTicksElapsed(s) {
    const seeded = s.flags[FLAG_ANALYSIS_SEEDED_AT];
    if (typeof seeded !== "number")
        return -1;
    return s.ticks - seeded;
}
/** The completion threshold in ticks: ANALYSIS_CYCLES_TO_UNLOCK full day/night
 *  cycles (a cycle = 2 × dayLength), computed against the live clock. */
export function analysisTicksToUnlock(s) {
    return ANALYSIS_CYCLES_TO_UNLOCK * 2 * s.dayLength;
}
/** Ticks remaining before completion, or -1 if not running. */
export function analysisTicksRemaining(s) {
    if (analysisPhase(s) !== "running")
        return -1;
    return Math.max(0, analysisTicksToUnlock(s) - analysisTicksElapsed(s));
}
// --- The resolution event -----------------------------------------------
/** The actual reveal — shown only when the PC LOGS ON to a terminal to read the
 *  finished result (never on the datapad, never auto-dumped). */
const RESOLUTION_TEXT = "Burke's software finishes its long walk back through the ledger — shell to shell, " +
    "intermediary to intermediary — and resolves, at the end of it all, to a single name: " +
    "AetherLink. The same AetherLink whose logo sits on your own contract. Whoever you've really " +
    "been working for, it was them the whole way down.";
/** The completion chime — fired on the world clock when the computation finishes.
 *  Says nothing about WHO: the datapad can't show the result, so the PC must go
 *  and log on to a public terminal to read it. */
const COMPLETE_NOTICE = [
    "── Your datapad chimes: the analysis you left running has FINISHED. ──",
    "The 'pad won't show you the result itself — you'll need to log on to a public terminal to read what it found.",
];
/**
 * World-clock tick for the analysis. Fires once, on the first tick at or past
 * the threshold, wherever the PC happens to be: it marks the run COMPLETE and
 * chimes the datapad — but does NOT name AetherLink or score. The reveal happens
 * when the PC reads it at a terminal (readAnalysisResult). Wired into World.onTick.
 */
export function analysisWorldTick(s) {
    if (s.dead || s.ended)
        return;
    if (analysisPhase(s) !== "running")
        return;
    if (analysisTicksElapsed(s) < analysisTicksToUnlock(s))
        return;
    s.flags[FLAG_ANALYSIS_COMPLETE] = true;
    addNote(s, {
        id: "analysis_finished",
        source: "You",
        text: "The blockchain analysis I set running has finished computing. I need to log on to a public " +
            "terminal to read who it traced the money back to.",
        reliable: true,
    });
    return COMPLETE_NOTICE;
}
/** Reading the finished result at a terminal: names AetherLink, scores the payoff,
 *  files the journal note, and latches the "learned it" flag (which gates Beat 3).
 *  Idempotent — only the first read scores. Returns the reveal text. */
function readAnalysisResult(s) {
    const first = !s.flags[FLAG_ANALYSIS_RESOLVED];
    s.flags[FLAG_ANALYSIS_RESOLVED] = true;
    if (first && score(s, HOOK_AETHERLINK_IDENTIFIED)) {
        addNote(s, {
            id: "aetherlink_identified",
            source: "You",
            text: "Read the analysis at a public terminal: the laundered chain that pays me runs all the way back " +
                "to AetherLink — the same name on my own contract. They're who really hired me.",
            reliable: true,
        });
    }
    return RESOLUTION_TEXT;
}
// --- Seeding (the start gun) --------------------------------------------
/** `use software on terminal` — set the analysis running at the public terminal. */
function seedAnalysis(s) {
    if (s.flags[FLAG_ANALYSIS_RESOLVED]) {
        return "The analysis has already run its course, and you've read the result. " +
            "Nothing more for the software to do.";
    }
    if (s.flags[FLAG_ANALYSIS_COMPLETE]) {
        return "The analysis has already finished — it's waiting on the network for you to log on at a " +
            "terminal and read what it found.";
    }
    if (typeof s.flags[FLAG_ANALYSIS_SEEDED_AT] === "number") {
        const n = analysisTicksElapsed(s);
        return `Burke's software is already seeded here and walking the ledger — ${n} ` +
            `${n === 1 ? "tick" : "ticks"} in. It'll resolve in its own time; there's nothing to do but wait.`;
    }
    s.flags[FLAG_ANALYSIS_SEEDED_AT] = s.ticks;
    score(s, HOOK_SEEDED_ANALYSIS);
    return [
        "You jack Burke's software into the public terminal. It wakes, fingerprints itself against " +
            "the open ledger, and begins quietly walking the payment chain backwards — transaction by " +
            "transaction, shell company by shell company — toward whoever is really paying.",
        "There's nothing to watch. It will take as long as it takes; leave it running and get on " +
            "with things.",
    ];
}
// --- Public terminals (canonically interlinked) -------------------------
//
// Horizon's public terminals are one networked system: seed the analysis at
// ANY terminal and read its progress/result at ANY other. We model that the
// way the TravelTube readers are modelled — each physical terminal is its own
// Item instance (a distinct id, since itemLocations maps one id to one room)
// but they all SHARE a single phase-aware description and a single seeding
// handler, and the analysis STATE is global (s.flags). So they behave
// identically by construction.
//
// To add a terminal in a newly-mapped district: add one entry to
// TERMINAL_LOCATIONS *and* list its id in that room's `items` array. The
// seeding wiring (burke_software.onUseWith) is generated from this registry,
// so nothing else needs touching.
export const TERMINAL_LOCATIONS = [
    { id: "public_terminal_retail", room: "horizon_public_terminal_dockside_retail" },
    { id: "public_terminal_blue", room: "horizon_blue_sector_concourse" },
];
/** Every terminal item id (for the seeding wiring and tests). */
export const TERMINAL_IDS = TERMINAL_LOCATIONS.map((t) => t.id);
const TERMINAL_ALIASES = ["terminal", "public terminal", "kiosk", "console", "public console", "data terminal"];
/** A line advertising the terminal's lodgings-booking function — shown unless
 *  the PC is settled elsewhere. The booking itself is the `book` verb (hostel.ts). */
function bookingLine(s) {
    if (s.flags[FLAG_HOSTEL_CHECKED_IN])
        return "";
    if (s.flags[FLAG_DONOVAN_CHECKED_IN]) {
        return "\n\nAmong its public services is lodgings booking — though it notes a reservation is " +
            "already held in your name at Donovan's.";
    }
    if (s.flags[FLAG_HOSTEL_BOOKED]) {
        return "\n\nIts lodgings panel shows your Dockside Hostel booking confirmed — check in at the hostel reader.";
    }
    return "\n\nAmong its public services is lodgings booking: you could BOOK HOSTEL here.";
}
/** The PASSIVE view (examine, not logged on): a neutral public standby that
 *  leaks NOTHING private — no analysis status, no booking, nothing tied to the
 *  PC. Everything personal is gated behind logging on (wakeTerminal). */
const TERMINAL_STANDBY = "A sleek, free-standing public terminal in standby: its wide display turns a slow, luminous model of " +
    "Horizon Outpost — purely decorative, and deliberately uninformative until you identify yourself. " +
    "Present your ID at the reader to LOG ON and reach the station's public services.";
/** The LOGGED-ON readout (only ever shown via wakeTerminal). Reads global analysis
 *  state, so the result is identical at whichever terminal you stand. */
function terminalDescription(s) {
    let body;
    switch (analysisPhase(s)) {
        case "resolved":
            body = RESOLUTION_TEXT + "\n\nThe findings sit on the screen for as long as you care to read them.";
            break;
        case "running": {
            const n = analysisTicksElapsed(s);
            body = "A free-to-use public terminal, part of the station-wide network: open ledgers, " +
                "station notices, public registries. Just now it's also showing something of yours — " +
                "Burke's software, grinding back through the payment chain on whichever terminal you " +
                `seeded it. A status line blinks: ANALYSIS IN PROGRESS (${n} ${n === 1 ? "tick" : "ticks"} ` +
                "elapsed). No use hovering over it.";
            break;
        }
        default:
            body = "A free-to-use public terminal, part of the station-wide network: open ledgers, " +
                "station notices, public registries — exactly the kind of open data feed a clever " +
                "piece of software could be turned loose on, if you had one to run.";
    }
    return body + bookingLine(s);
}
/** Waking the terminal (SCAN / PRESENT ID / USE TERMINAL) brings it out of its
 *  decorative standby and lists what you can actually do here. The services
 *  themselves are their own verbs (BOOK HOSTEL, ACCESS RECORDS, USE SOFTWARE ON
 *  TERMINAL); this is the "present your ID to wake it" step the prose promises. */
function wakeTerminal(s) {
    // Logging on while a finished job waits IS the read: reveal AetherLink + score.
    if (analysisPhase(s) === "complete") {
        const reveal = readAnalysisResult(s);
        const booking = bookingLine(s).replace(/^\n+/, "");
        const out = [
            "You present your ID. The slow-turning model of the outpost dissolves — and the terminal brings up the " +
                "job you left running, finished and waiting.",
            reveal,
        ];
        if (booking)
            out.push(booking);
        return out;
    }
    return [
        "You present your ID. The slow-turning model of the outpost dissolves, and the terminal wakes to its " +
            "public-services menu.",
        terminalDescription(s),
    ];
}
function makeTerminal(id) {
    return {
        id,
        name: "public terminal",
        aliases: TERMINAL_ALIASES,
        description: TERMINAL_STANDBY, // passive: nothing private until you LOG ON
        takeable: false,
        onScan: (s) => wakeTerminal(s),
    };
}
// --- Items --------------------------------------------------------------
/** Burke's blockchain-analysis package (B3). Acquired from Burke; carried until
 *  seeded at a public terminal. The onUseWith map is generated from the terminal
 *  registry, so `use software on terminal` works at every terminal. */
export const burkeSoftware = {
    id: "burke_software",
    name: "software datacard",
    // NB: "datacard" alone is deliberately NOT an alias here — it stays unambiguous
    // for Dr Rajah's "resistance datacard" (and its load-onto-the-datapad
    // prohibition). Burke's is reached via "software" / "software datacard".
    aliases: [
        "software datacard", "software", "analysis software", "analysis datacard",
        "blockchain software", "blockchain analysis", "burke's software", "burke's datacard",
        "datachip", "data chip", "chip", "program",
    ],
    description: "A scuffed datacard, its contents bought off Burke: a blockchain-analysis package that " +
        "claims it can untangle a laundered payment chain back to its source — given an open ledger " +
        "to read and time enough to read it. It needs a public terminal to run on.",
    takeable: true,
    onUseWith: Object.fromEntries(TERMINAL_IDS.map((id) => [id, (s) => seedAnalysis(s)])),
};
export const analysisItems = {
    burke_software: burkeSoftware,
    ...Object.fromEntries(TERMINAL_LOCATIONS.map((t) => [t.id, makeTerminal(t.id)])),
};
