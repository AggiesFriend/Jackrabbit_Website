// endgame.ts — the contract clock and the endgame departures (B7/B8).
//
// Every "main" ending fires at a DEPARTURE:
//
//   SUBMIT a report  -> banks the payout (escrow pays by reflex — even a blank
//                       note) and opens the home route. Doesn't end the game.
//   DEPART (home)     -> at the arrival concourse, once you've submitted OR the
//                       deadline has lapsed: take a berth back to Consortium
//                       space. Home is the SAFE vector, so you survive:
//                         Loyal           (you submitted -> paid)
//                         Timeout -> home (you didn't -> Failure)
//   STOW AWAY         -> hide aboard the hauler readying to leave the shipyard's
//                       large bay — a real off-vector ride. The leash trips and
//                       you die in deep space (the cold coda):
//                         Defect           (you committed to the resistance)
//                         Timeout -> elsewhere (the contract lapsed; you ran)
//
// (Flee is Burke's, scripted in burke.ts / index.ts: he strips the transponder,
// so it's the one off-vector exit that doesn't kill you.)
//
// THE LEASH (plot design §4). The datapad AetherLink issued carries a hidden
// SnapSpace transponder: it reports WHERE the PC is, jump by jump. A monitoring
// AI trips on any deviation from the expected "home" (Consortium-return) vector
// and computes the stepping-stones to intercept within ~6 jumps. So home = safe;
// any other vector while carrying the 'pad = death. On Horizon the Accord
// anonymises everything, so nothing on-station trips it — the kill only lands
// once the PC moves in open space. The PC stays blind to all of this until the
// coda. The datapad is non-droppable (items.ts), so the leash is inescapable —
// except in the Flee cut-scene, where Burke takes it.
import { requestPushModal } from "../../engine/authoring.js";
import { FLAG_CONTRACT_START_TICK, FLAG_CONTRACT_EXPIRED, FLAG_CONTRACT_NUDGE, FLAG_REPORT_SUBMITTED, CONTRACT_DEADLINE_CYCLES, FLAG_DEFECTING, } from "./flags.js";
const ARRIVAL_CONCOURSE = "horizon_arrival_concourse";
/** The big hauler readying to leave — the stowaway ride (a real off-vector
 *  departure). Sited in the shipyard's large bay (see shipyard.ts). */
export const STOWAWAY_BAY = "horizon_large_bay_2";
// --- The contract clock -------------------------------------------------
/** The deadline, in ticks, against the current dayLength. */
export function contractDeadlineTicks(s) {
    return CONTRACT_DEADLINE_CYCLES * 2 * s.dayLength;
}
/** Ticks elapsed on the contract clock (0 until the PC reaches Horizon). */
function contractElapsed(s) {
    const start = s.flags[FLAG_CONTRACT_START_TICK];
    if (typeof start !== "number")
        return 0;
    return s.ticks - start;
}
/** True once the PC may take a berth home (submitted, or the contract lapsed). */
export function homeRouteOpen(s) {
    return Boolean(s.flags[FLAG_REPORT_SUBMITTED]) || Boolean(s.flags[FLAG_CONTRACT_EXPIRED]);
}
/** Once-only "the days are getting on" nudges, by fraction of the clock spent. */
const NUDGES = [
    { at: 0.5, text: "Your datapad murmurs a quiet milestone: half the contract window gone. The figure means nothing to " +
            "the people who set it and everything to you." },
    { at: 0.75, text: "The datapad chimes — a scheduling reminder you didn't ask for. Three-quarters of your time is spent. " +
            "The deadline, abstract until now, has begun to have a shape." },
    { at: 0.9, text: "A sharper tone from the datapad: the engagement window is nearly closed. Whatever you mean to do, " +
            "you're running out of station to do it on." },
];
const EXPIRY_TEXT = "Your datapad sounds a flat, final tone and surfaces a notice you don't remember subscribing to: " +
    "ENGAGEMENT CLOSED. The contract window has lapsed; the escrow has reverted; there is nothing left at " +
    "the far end to deliver to. Whatever you do from here, you do on your own account.\n\n" +
    "You could make your way back to the docks and take a berth home — or not.";
/**
 * World.onTick fragment for the contract clock. A no-op until the PC reaches
 * Horizon (the clock's anchor) and again once it has expired. Fires the
 * once-only milestone nudges and, at the deadline, the cancellation notice
 * (which opens the home route but does NOT end the game — the PC keeps agency).
 */
export function contractDeadlineTick(s) {
    if (s.dead || s.ended)
        return;
    if (typeof s.flags[FLAG_CONTRACT_START_TICK] !== "number")
        return;
    if (s.flags[FLAG_CONTRACT_EXPIRED])
        return;
    const total = contractDeadlineTicks(s);
    const elapsed = contractElapsed(s);
    if (elapsed >= total) {
        s.flags[FLAG_CONTRACT_EXPIRED] = true;
        return EXPIRY_TEXT;
    }
    const stage = Number(s.flags[FLAG_CONTRACT_NUDGE]) || 0;
    const next = NUDGES[stage];
    if (next && elapsed / total >= next.at) {
        s.flags[FLAG_CONTRACT_NUDGE] = stage + 1;
        return next.text;
    }
}
// --- SUBMIT (file the report) -------------------------------------------
function submitConfirmModal() {
    return {
        onInput: (line, s) => {
            const yes = /^\s*(y|yes|yep|yeah|aye|do it|file|submit|send)\b/i.test(line);
            if (!yes) {
                return { pop: true, output: ["You leave it unfiled. The cursor blinks, patient, for whenever you're ready."] };
            }
            s.flags[FLAG_REPORT_SUBMITTED] = true;
            return {
                pop: true,
                output: [
                    "You compile what you have — much, little, or nothing — attach it to the engagement record, and " +
                        "send. The upload takes a moment; the datapad confirms it with a small, satisfied tone, and the " +
                        "report slides away down the slow ledger toward a client you will never meet.",
                    "The contract is discharged. Whatever the intel is worth, the escrow is configured to pay on " +
                        "delivery, and delivery is done. There's nothing holding you here now — you can make your way " +
                        "back to the docks and DEPART for home whenever you're ready.",
                ],
            };
        },
    };
}
/** SUBMIT / REPORT / FILE / SEND (the findings). Banks the payout + opens the
 *  home route; doesn't end the game (boarding home does). */
export const submitCommand = (_w, s) => {
    if (typeof s.flags[FLAG_CONTRACT_START_TICK] !== "number") {
        return { handled: true, tickCost: 0, free: true,
            output: ["There's nothing to file yet — the engagement proper begins at Horizon."] };
    }
    if (s.flags[FLAG_REPORT_SUBMITTED]) {
        return { handled: true, tickCost: 0, free: true,
            output: ["You've already filed your report. It's gone down the slow ledger — no recall, no addendum."] };
    }
    if (s.flags[FLAG_CONTRACT_EXPIRED]) {
        return { handled: true, tickCost: 0, free: true,
            output: ["Too late for that — the engagement's closed. There's no one at the far end to file to now."] };
    }
    if (!s.inventory.includes("datapad")) {
        return { handled: true, tickCost: 0, free: true,
            output: ["You'd file it through the datapad, and you're not carrying it."] };
    }
    requestPushModal(s, submitConfirmModal());
    return { handled: true, tickCost: 0, free: true,
        output: ["File your report to the client now and discharge the contract? Whatever you've gathered — or " +
                "haven't — goes in as it stands; there's no recall once it's sent. (YES / NO)"] };
};
// --- DEPART (home — the survive route) ----------------------------------
/** DEPART / GO HOME / BOARD (a homebound berth). At the arrival concourse, once
 *  the home route is open: take the slow ride back to Consortium space. Home is
 *  the safe vector — you survive. Loyal if you submitted, else Timeout -> home. */
export const departCommand = (_w, s) => {
    if (s.currentRoom !== ARRIVAL_CONCOURSE) {
        return { handled: true, tickCost: 0, free: true,
            output: ["There's no outbound berth here. Homebound shuttles run from the arrival concourse, down by " +
                    "the docks."] };
    }
    if (!homeRouteOpen(s)) {
        return { handled: true, tickCost: 0, free: true,
            output: ["You've a contract to discharge first. Until you've filed something — or it's run out from " +
                    "under you — there's nothing pulling you home, and a half-done job is no job at all."] };
    }
    s.ended = true;
    s.endingId = s.flags[FLAG_REPORT_SUBMITTED] ? "loyal" : "timeout_home";
    return { handled: true, tickCost: 1, output: [] };
};
// --- STOW AWAY (the off-vector death) -----------------------------------
/** STOW AWAY / STOW / HIDE (aboard) — in the large-bay hauler only, and only
 *  with a reason to run off-Consortium (defecting, or the contract lapsed).
 *  The leash does the rest. Defect, or Timeout -> elsewhere. */
export const stowawayCommand = (_w, s) => {
    if (s.currentRoom !== STOWAWAY_BAY) {
        return { handled: true, tickCost: 0, free: true,
            output: ["There's nothing here to stow away aboard."] };
    }
    const defecting = Boolean(s.flags[FLAG_DEFECTING]);
    const timedOut = Boolean(s.flags[FLAG_CONTRACT_EXPIRED]);
    if (!defecting && !timedOut) {
        return { handled: true, tickCost: 0, free: true,
            output: ["You look at the open hold and the slow business of a ship readying to leave, and step back " +
                    "from the edge of it. You're not a stowaway fleeing from nothing — not yet. You've a contract that " +
                    "isn't finished, and somewhere still to be that isn't the dark."] };
    }
    s.ended = true;
    s.endingId = defecting ? "defect" : "timeout_elsewhere";
    return { handled: true, tickCost: 1, output: [] };
};
// --- The endings --------------------------------------------------------
/** The loyal epilogue (plot §5): a routine portfolio review severs the shell
 *  chain; automation, never deliberation. "No one will ever know you existed." */
const SEVERANCE_REVEAL = "Months later, and a long way from any of it, a thing happens that you never see and never could.\n\n" +
    "An over-keen junior in some accountancy arm three shells up runs a routine portfolio review, finds a " +
    "dormant recovery-services subsidiary returning nothing, and — tidy by temperament — sells it off with a " +
    "batch of other dead weight. The shell that held your contract is folded into the sale; the chain that " +
    "ran up, link by deniable link, to AetherLink is quietly severed in a spreadsheet. Your report, your " +
    "name, the boy you hunted and the people who paid to have him found: all of it falls into the gap " +
    "between two ledgers and is gone.\n\n" +
    "No one decided this. No one read your findings and judged them wanting; no one buried them. A process " +
    "ran, the way processes do, and the horror of it is the smallness: no one at AetherLink will ever know " +
    "you existed at all. The escrow paid, because escrow pays. That much, at least, was automatic too.";
/** The cold death coda (plot §5), shared by the two off-vector deaths. */
const COLD_CODA = "It is, in the end, nothing personal — which is the worst of it.\n\n" +
    "Back on Horizon a fixer named you precisely, once, to your face, to make you feel watched. Out here " +
    "there is no one of the kind. The thing that found you was a monitoring routine that flagged a vector " +
    "off the expected line and handed the sum to an interceptor that had never heard your name and could " +
    "not have cared if it had. It did not know you were defecting, or fleeing, or anything at all. It knew " +
    "a deviation, and it corrected it.\n\n" +
    "The crew who never knew you were in their hold die in the same white instant, for the same reason: " +
    "nothing they did, and nothing they could have known. The ledger will catch up weeks later, slow as " +
    "everything out here, and record a ship that did not arrive. By then even that much of you is gone.";
export const loyalEnding = {
    id: "loyal",
    survived: true,
    text: "You make your way back down to the docks, file off the last of it, and take a berth on the next " +
        "homebound run — shuttle to the liner, the liner to the long quiet vector back toward Consortium " +
        "space. The station dwindles in the viewport, vast and turning, indifferent to your leaving as it was " +
        "to your arriving.\n\n" +
        "You never caught him. You're fairly sure, by now, that no one was ever going to. But the contract is " +
        "discharged, the escrow will pay what it pays, and you are going home with your skin and your name and " +
        "whatever this was worth — which is, you tell yourself, the shape of a job done.",
    closingText: SEVERANCE_REVEAL,
};
export const timeoutHomeEnding = {
    id: "timeout_home",
    survived: true,
    forcedRank: "Failure",
    text: "The window's shut and there's nothing left to file. You do the only sensible thing a professional " +
        "does with a dead contract: you cut it loose. Back to the docks, a berth on the homebound run, the " +
        "long safe vector toward Consortium space, and Horizon turning away behind you with everything it never " +
        "told you still locked up inside it.\n\n" +
        "You didn't catch him; you didn't even finish wondering who you were really working for. Some jobs run " +
        "out from under you. You'll make the next one pay.",
    closingText: "There's always a next one. By the time you've docked you're half thinking about it already — the " +
        "Jackrabbit filed, with the rest, under things that didn't work out.",
};
export const defectEnding = {
    id: "defect",
    survived: false,
    text: "You fold yourself into the hauler's hold among the strapped-down cargo and the cold, and you wait. " +
        "In time the bay-clamps release; there's the long shove of departure, the queasy lurch of the first " +
        "SnapSpace jump, and then the dark and the quiet and the slow ticking-down of someone else's voyage " +
        "carrying you somewhere it was never going.\n\n" +
        "You have Rajah's card in your pocket — coordinates you can't read, a frequency you'll raise when " +
        "you're clear, a door you mean to knock on at the far end of all this. You will never reach it. A few " +
        "jumps out from Horizon, without alarm or warning or any sound you'll remember, the dark fills with a " +
        "hard white light that is the last thing it ever does.",
    closingText: COLD_CODA,
};
export const timeoutElsewhereEnding = {
    id: "timeout_elsewhere",
    survived: false,
    text: "The contract's dead and the thought of crawling home to Consortium space with empty hands is somehow " +
        "worse than the dark. So you don't. You stow away in the hauler's hold and let it take you on — " +
        "anywhere that isn't back, anywhere that's yours to choose.\n\n" +
        "The clamps release; the first jump turns your stomach over; the station falls away behind. For a " +
        "little while, in the cold and the dark of a stranger's hold, it even feels like freedom. A few jumps " +
        "out it ends in a single hard flare of light you barely have time to notice, and do not understand.",
    closingText: COLD_CODA,
};
/** All four endgame-departure endings, for index.ts to register. */
export const endgameEndings = {
    loyal: loyalEnding,
    timeout_home: timeoutHomeEnding,
    defect: defectEnding,
    timeout_elsewhere: timeoutElsewhereEnding,
};
/** The verbs index.ts wires for the endgame departures. */
export const endgameCommands = {
    submit: submitCommand, report: submitCommand, file: submitCommand,
    depart: departCommand, embark: departCommand,
    stow: stowawayCommand, stowaway: stowawayCommand,
};
