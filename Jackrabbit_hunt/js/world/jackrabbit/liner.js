// The Liner (Shameless Efficiency) and Shuttle 2's narrative transition.
// Spec: jackrabbit-pre-horizon-design.md §7, §8.
import { aliasedTopics, requestPushModal, requestSceneTransition } from "../../engine/authoring.js";
import { FLAG_LINER_ANNOUNCED, FLAG_LINER_ANNOUNCED_AT, FLAG_LINER_BOARDED_AT, FLAG_LINER_REPEAT_HORIZON, FLAG_LINER_TALKED_AT, FLAG_LINER_TALKED_TO_PASSENGER, HOOK_ASKED_HORIZON_1, HOOK_ASKED_HORIZON_2, HOOK_TALKED_PASSENGER, } from "./flags.js";
import { score } from "./scoring.js";
// Disembarkation beats are timed from the conversation with the passenger
// (the actual trigger), not from boarding — so they can't all land at once
// however long the player dawdled first. The gap between them is wide enough
// that an interruptible `wait` stops at the announcement before the approach.
const ANNOUNCE_AFTER_TALK = 4; // ticks after talking -> departure announcement
const APPROACH_AFTER_ANNOUNCE = 3; // ticks after announcement -> shuttle 2 modal
// --- Refreshment terminal ----------------------------------------------
const refreshmentTerminal = {
    id: "refreshment_terminal",
    name: "refreshment terminal",
    aliases: ["terminal", "food terminal", "drinks", "refreshments", "refreshment"],
    description: "Standard liner catering. Hot drinks, cold drinks, sealed food packets. " +
        "Prices are modest. Selection is limited. Nothing about it is bad enough to complain about.",
    takeable: false,
};
const linerViewport = {
    id: "liner_viewport",
    name: "viewport",
    aliases: ["viewport", "window", "stars", "starfield"],
    description: "Ordinary stars, hanging steady. Between SnapSpace jumps the liner simply coasts through normal " +
        "space, and there is nothing to see that you couldn't see from a planet's night side — until " +
        "the next jump folds the distance away in an eyeblink and a fresh, unfamiliar arrangement of " +
        "stars takes their place. You've stopped finding it remarkable. Most people do.",
    takeable: false,
};
// --- The passenger -----------------------------------------------------
const passenger = {
    id: "liner_passenger",
    name: "the passenger",
    aliases: ["passenger", "woman", "traveller", "lady"],
    description: "Middle-aged, settled, comfortable in zero-g in the way of someone who travels regularly " +
        "and has long since stopped noticing it. She is reading something on a small personal screen " +
        "and looks up when you approach with the easy openness of someone who doesn't mind company.",
    onTalk: (s) => {
        if (!s.flags[FLAG_LINER_TALKED_TO_PASSENGER]) {
            s.flags[FLAG_LINER_TALKED_TO_PASSENGER] = true;
            score(s, HOOK_TALKED_PASSENGER);
            // Start the disembarkation countdown from this moment, so the
            // announcement and the approach can't pile up on a single turn even if
            // the player dawdled for ages beforehand.
            s.flags[FLAG_LINER_TALKED_AT] = s.ticks;
            return [
                "She looks up and smiles — genuinely, not socially.",
                "\"Going to Horizon?\"",
                "A beat.",
                "\"Me too. Finally.\"",
                "She says the last word with feeling.",
            ];
        }
        return "She looks up pleasantly. She's not unwilling to talk, just not going to do it for you.";
    },
    topics: aliasedTopics([
        [["horizon", "horizon outpost", "outpost"], (s) => {
                // Special: repeat ask about horizon gets the "you've never been" beat.
                if (s.flags[FLAG_LINER_REPEAT_HORIZON]) {
                    score(s, HOOK_ASKED_HORIZON_2); // second ask: +2
                    return ("She tilts her head slightly, reading you with the comfortable accuracy of someone who " +
                        "spends a lot of time with travellers.\n" +
                        "\"You've never been, have you?\"\n" +
                        "Not unkindly. Just observant.");
                }
                s.flags[FLAG_LINER_REPEAT_HORIZON] = true;
                score(s, HOOK_ASKED_HORIZON_1); // first ask: +1
                return ("\"There's nowhere like it. I know people say that about everywhere, but — no, genuinely. " +
                    "You'll see.\" She seems to consider elaborating, then decides that some things are better " +
                    "discovered than described.");
            }],
        [["consortium"],
            "A brief pause. Carefully chosen words. \"It's very efficient. Very organised. I'm sure it " +
                "suits some people very well.\" She leaves it there."],
        [["journey", "travel", "snapspace", "ship", "liner"],
            "\"Two more jumps. Then the shuttle. Then home.\" She says the last word like it means something."],
        [["business", "visit", "why consortium", "what brought you"],
            "\"Business. The kind that could only be done in person, unfortunately. All settled now.\" " +
                "She doesn't elaborate. Her tone suggests she'd rather not dwell on it."],
        [["home"],
            "\"Horizon. Blue sector, mostly. But the whole place is home, really — once you've lived there a while, it gets into you.\""],
    ]),
    unknownTopic: "\"I couldn't really say. I'm not much of an expert on anything outside my own lane.\"",
};
// --- The liner lounge ---------------------------------------------------
const lounge = {
    id: "liner_lounge",
    name: "Shameless Efficiency — Passenger Lounge",
    description: "The passenger lounge is functional and just comfortable enough to make you forget, briefly, " +
        "that you're in zero-g on a commercial liner somewhere between one unremarkable point in space " +
        "and another. Padded seating with discrete restraint clips. A refreshment terminal on one wall. " +
        "Through the viewport, ordinary starfield — the *Shameless Efficiency* is coasting between jumps, " +
        "as she will be for most of the trip.\n\n" +
        "Most seats are empty. One passenger is awake: a woman of middle age, settled into her seat with " +
        "the ease of someone who does this regularly and doesn't mind it.",
    exits: {
        // Named non-exit — refused with custom prose. (Virtual exit pattern.)
        cabin: {
            gated: () => "Your cabin is three doors down — barely enough space to strap in and read, which is " +
                "approximately all it offers. There's nothing there that isn't here.",
        },
        room: { gated: () => "Your cabin is three doors down. There's nothing there that isn't here." },
        bed: { gated: () => "Your cabin is three doors down. There's nothing there that isn't here." },
    },
    items: ["refreshment_terminal", "liner_viewport"],
    npcs: ["liner_passenger"],
    onEnter: (s) => {
        if (typeof s.flags[FLAG_LINER_BOARDED_AT] !== "number") {
            s.flags[FLAG_LINER_BOARDED_AT] = s.ticks;
        }
    },
    onTick: (s) => {
        // Nothing happens until the player has spoken to the passenger.
        const talkedAt = s.flags[FLAG_LINER_TALKED_AT];
        if (typeof talkedAt !== "number")
            return;
        // Beat 1: departure announcement, a few ticks after the conversation.
        if (!s.flags[FLAG_LINER_ANNOUNCED] && s.ticks - talkedAt >= ANNOUNCE_AFTER_TALK) {
            s.flags[FLAG_LINER_ANNOUNCED] = true;
            s.flags[FLAG_LINER_ANNOUNCED_AT] = s.ticks;
            return ("── A chime sounds through the cabin. ──\n" +
                "*Passengers for Horizon Outpost connection, please prepare for disembarkation at the " +
                "next docking station.*");
        }
        // Beat 2: the approach itself, a few ticks after the announcement. An
        // interruptible wait will have stopped at beat 1, so this lands on a
        // subsequent action — never the same turn.
        const announcedAt = s.flags[FLAG_LINER_ANNOUNCED_AT];
        if (s.flags[FLAG_LINER_ANNOUNCED] &&
            typeof announcedAt === "number" &&
            s.ticks - announcedAt >= APPROACH_AFTER_ANNOUNCE &&
            !s.flags["__liner_transitioned"]) {
            s.flags["__liner_transitioned"] = true;
            // Shuttle 2 is a narrative-only scene. Push the modal that displays
            // the approach prose and, on any input, transitions to Horizon.
            requestPushModal(s, shuttle2NarrativeModal());
        }
        return;
    },
};
// --- Shuttle 2 — narrative-only transition ------------------------------
function shuttle2NarrativeModal() {
    const lines = [
        "",
        "── DISEMBARKATION ──",
        "",
        "The lounge empties in an unhurried trickle. You go with it — out through the " +
            "boarding gangway, along a corridor that smells of other people's luggage, and " +
            "into the connecting shuttle for the last short hop to the outpost proper. The " +
            "passenger you spoke to is a few rows ahead, already half-asleep against the " +
            "bulkhead with the ease of the genuinely nearly-home. You take a seat and the " +
            "restraints settle over you.",
        "",
        "── SHUTTLE 2 — APPROACH TO HORIZON OUTPOST ──",
        "",
        "The shuttle banks on its final approach and Horizon Outpost fills the viewport.",
        "",
        "You were expecting something impressive. What you weren't expecting was *that kind* of " +
            "impressive — the sheer physical fact of the cylinder, rotating with slow, absolute certainty. " +
            "At this distance you can see the lights of the dockyard end, the dark band of what must be the " +
            "arboretum wrapping the midsection, the glint of ships at various distances from the hub. It is " +
            "enormous in a way that the numbers in the briefing documents did not prepare you for.",
        "",
        "The shuttle steadies on its docking vector. Around you, other passengers are gathering bags, " +
            "checking screens, doing the small mundane things people do when they are nearly home or nearly " +
            "somewhere.",
        "",
        "You are nearly somewhere.",
        "",
        "── Press ENTER to disembark. ──",
    ];
    return {
        onEnter: () => lines,
        onInput: (_line, s) => {
            requestSceneTransition(s, "horizon_arrival_concourse");
            return { pop: true };
        },
    };
}
// The liner's Shuttle-2 modal transitions to `horizon_arrival_concourse`, which
// now lives in horizon.ts (the real Horizon Outpost content).
export const linerRooms = {
    liner_lounge: lounge,
};
export const linerItems = {
    refreshment_terminal: refreshmentTerminal,
    liner_viewport: linerViewport,
};
export const linerNpcs = { liner_passenger: passenger };
