// Sophie & the Shipyard Records route (Strand 1 wall + the records reveal).
// Spec: reference/sophie-shipyard-records-final.md.
//
// Sophie staffs the shipyard reception (horizon_shipyard_reception). She is a
// loyalty wall — she knew the boy and won't say so — but her professional pride
// in the meticulous records is the signpost: she boasts the records are the
// best-kept on the station, refuses to let the PC see them, and the PC already
// has a remote login in their pocket (from the predecessor's kit, FLAG_SHIPYARD_
// CREDS). At any public terminal the PC can then ACCESS RECORDS and uncover the
// two-tier reveal:
//   Tier 1 — the "Jackrabbit" is a SHIP, repaired here and gone weeks ago.
//   Tier 2 — the intake report: it came in a near-wreck, repairs certified by
//            Foreman OSWALD (= Ozzy; the deferred onward breadcrumb).
import { aliasedTopics } from "../../engine/authoring.js";
import { addNote } from "../../engine/notes.js";
import { placeNpcInRoom } from "../../engine/npcs.js";
import { TERMINAL_IDS } from "./analysis.js";
import { FLAG_SHIPYARD_CREDS, FLAG_RECORDS_SHIP_FOUND, FLAG_JACKRABBIT_IS_SHIP, HOOK_TALKED_SOPHIE, HOOK_SOPHIE_RECORDS_HINT, HOOK_RECORDS_SHIP_JACKRABBIT, HOOK_RECORDS_SHIP_WRECK, } from "./flags.js";
import { score } from "./scoring.js";
// --- Sophie's hours (daytime only) --------------------------------------
// Sophie staffs reception by DAY. At night the desk is unmanned — which is the
// PC's chance to slip past into the yard (the reception->entrance door is gated
// open only at night, wired in shipyard.ts). Driven dynamically (like the night
// bar NPCs): present in reception by day, offstage by night. onEnter sync (in
// shipyard.ts) makes it correct on entry; the World.onTick keeps it correct as
// the cycle turns while the PC stands there.
const RECEPTION = "horizon_shipyard_reception";
const SOPHIE_OFFSTAGE = "__sophie_offshift";
/** Place Sophie in reception by day, send her off-shift by night. Idempotent. */
export function syncSophie(s) {
    placeNpcInRoom(s, "sophie", s.isDaytime ? RECEPTION : SOPHIE_OFFSTAGE);
}
/** World.onTick fragment — keeps Sophie's presence in step with the cycle. */
export function sophieDaytimeTick(s) {
    if (s.dead || s.ended)
        return;
    syncSophie(s);
}
// --- Sophie -------------------------------------------------------------
export const sophie = {
    id: "sophie",
    name: "Sophie",
    aliases: ["sophie", "receptionist", "records clerk", "clerk", "woman behind the desk"],
    description: "A muscular, middle-aged woman behind the reception desk, sleeves pushed up, entirely at home. She " +
        "looks up as you approach with the unbothered, faintly amused air of someone who's seen every kind " +
        "of chancer come through that door and isn't expecting you to be the exception. Sharp eyes — they've " +
        "taken your measure before you've opened your mouth.",
    onTalk: (s) => {
        score(s, HOOK_TALKED_SOPHIE);
        return [
            "\"Morning.\" She sets down what she's doing and gives you her attention — all of it, in the way " +
                "that tells you she's reading you while she's at it. \"Shipyard reception. Booking work, I'll need " +
                "your vessel registration. After the yard itself —\" a small, pleasant shake of the head \"— that's " +
                "customers only, I'm afraid. So. Which are you?\"",
        ];
    },
    topics: aliasedTopics([
        // The signpost — refusal IS the hook. Scores sophie_records_hint (once).
        [["records", "record", "the records", "files", "logs", "ship records", "see the records", "access", "archive"],
            (s) => {
                score(s, HOOK_SOPHIE_RECORDS_HINT);
                return "\"Our records?\" Something in her warms — professional pride, plain as day. \"Best-kept on " +
                    "the station, and I'll not pretend otherwise. Nothing crosses this yard we don't log — in, out, " +
                    "every job, every part, to the minute. I keep them myself and I keep them right.\" Then the " +
                    "shutters, friendly but firm. \"Which is also why I can't have you leafing through them. Customers " +
                    "only — and even then they see their own and no one else's.\" A pleasant smile. \"Lovely records, " +
                    "though. Take my word for it.\"";
            }],
        // The loyalty wall — she does NOT reveal she knew him. Scores nothing.
        [["jackrabbit", "rabbit", "boy", "the boy", "target", "young man", "someone", "person of interest"],
            "\"A boy.\" She says it flatly, turning the word over, and you get the distinct sense she's decided " +
                "something about you in the space of those two words. \"We get all sorts through here. Pilots, " +
                "traders, tourists who've taken a wrong turn.\" She holds your eye, good-humoured and completely " +
                "unreadable. \"Couldn't tell you about any one of them. Wouldn't, either. People's business is their " +
                "own — you'll have heard that by now, if you've been on Horizon more than a day.\""],
        // Ozzy/Oswald gatekeep — no onward access (Ozzy deferred). Scores nothing.
        [["ozzy", "oswald", "foreman", "the foreman", "boss"],
            "\"The foreman?\" A flick of something — loyalty, maybe. \"Busy. He doesn't take callers, and I " +
                "don't send them through.\" As far as she's concerned, that's the end of it."],
        // Colour.
        [["sophie", "herself", "yourself", "you", "job", "reception"],
            "\"Reception, records, and the gate.\" She says it without complaint. \"Somebody has to know where " +
                "everything is. Might as well be the somebody who likes knowing.\""],
        [["yard", "shipyard", "ships", "the yard", "repairs", "work"],
            "\"Working yard, this — repairs, refits, the odd salvage job. Customers and crew past this desk, " +
                "nobody else.\" A nod at the double doors. \"Quietest reception on the station, and I like it that way.\""],
    ]),
    unknownTopic: "A brief, not-unfriendly shrug. \"Not my department. Try the concourse — someone up there'll know.\"",
};
// --- The records access (puzzle + reveal) -------------------------------
const TIER1 = "The records open to you, meticulous as promised. You search the name you've carried since the start — " +
    "Jackrabbit — and get a single hit. But it isn't a person. It's a vessel: a medium courier ship, " +
    "registered, logged into Horizon Shipyard for repair and logged out again weeks later. The thing " +
    "you've been hunting has a name — and the name is painted on a hull.";
const TIER2 = "You open the intake report. When the Jackrabbit first came in, it was barely a ship at all — the " +
    "assessment reads like a catalogue of everything that can fail on a hull, and most of it had. Whoever " +
    "brought it in was lucky to arrive at all. Weeks later, the work was signed off complete — repairs " +
    "certified, Foreman Oswald — and the ship left the yard whole again. Whoever Oswald is, he put it back " +
    "together with care.";
/** The two-tier records reveal itself, once the PC is at a terminal and has valid
 *  credentials. Repeatable: first opens Tier 1 (the ship), the next Tier 2 (intake). */
function recordTiers(s) {
    if (!s.flags[FLAG_RECORDS_SHIP_FOUND]) {
        s.flags[FLAG_RECORDS_SHIP_FOUND] = true;
        // The interlock: knowing the Jackrabbit is a SHIP unlocks Ozzy's ship-name
        // confirmation beat (reference/npc-specs-batch-2.md).
        s.flags[FLAG_JACKRABBIT_IS_SHIP] = true;
        score(s, HOOK_RECORDS_SHIP_JACKRABBIT);
        addNote(s, {
            id: "records_ship_jackrabbit",
            source: "Shipyard records",
            text: "The Jackrabbit is a VESSEL — a medium courier ship, logged into Horizon Shipyard for repair " +
                "and out again weeks later. The name you've been hunting is painted on a hull.",
            reliable: true,
        });
        return { output: [TIER1, "", "An intake report is attached to the record — ACCESS RECORDS again to open it."], tickCost: 1 };
    }
    if (!s.scoreHooks.has(HOOK_RECORDS_SHIP_WRECK)) {
        score(s, HOOK_RECORDS_SHIP_WRECK);
        addNote(s, {
            id: "records_ship_wreck",
            source: "Shipyard records",
            text: "The Jackrabbit came in a near-wreck and left whole weeks later. Repairs certified complete by " +
                "Foreman Oswald.",
            reliable: true,
        });
        return { output: [TIER2], tickCost: 1 };
    }
    return {
        output: ["The Jackrabbit's record sits open: the ship, the wreck it arrived as, the repairs signed off " +
                "by Foreman Oswald. Nothing on the screen you haven't already read."],
        tickCost: 0, free: true,
    };
}
/** `access records` / `log in` / `records` — read the shipyard records from a
 *  public terminal, gated on the predecessor's saved login (FLAG_SHIPYARD_CREDS). */
const recordsCmd = (_w, s, _cmd) => {
    const atTerminal = TERMINAL_IDS.some((id) => s.itemLocations[id] === s.currentRoom);
    if (!atTerminal) {
        return { handled: true, output: ["You'd need a public terminal to reach the shipyard records."], tickCost: 0, free: true };
    }
    if (!s.flags[FLAG_SHIPYARD_CREDS]) {
        return {
            handled: true,
            output: ["The shipyard records are customers-only — and the login prompt isn't one you can bluff. " +
                    "You'd need credentials you don't have."],
            tickCost: 0, free: true,
        };
    }
    const r = recordTiers(s);
    const obj = typeof r === "object" && !Array.isArray(r) && r !== undefined ? r : { output: r };
    return { handled: true, output: (obj.output ?? []), tickCost: obj.tickCost ?? 1, ...(obj.free ? { free: true } : {}) };
};
/** `use his credentials on <terminal>` — the natural way to "log in" with the
 *  predecessor's saved shipyard login. Same reveal as ACCESS RECORDS. */
export function accessRecordsViaCreds(s) {
    if (!s.flags[FLAG_SHIPYARD_CREDS]) {
        return "The login won't load — you've nothing valid to authenticate with.";
    }
    return recordTiers(s);
}
export const recordsCommands = {
    records: recordsCmd,
    login: recordsCmd,
    access: recordsCmd,
};
