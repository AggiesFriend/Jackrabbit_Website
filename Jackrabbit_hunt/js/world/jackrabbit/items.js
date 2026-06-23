// Items for the Halberd pre-Horizon sequence.
// Spec: jackrabbit-pre-horizon-design.md §4 (starting items) and §3 (lobby scenery).
import { requestPushModal } from "../../engine/authoring.js";
import { renderNotes } from "../../engine/notes.js";
import { makeCharacterCreationModal } from "./character-creation.js";
import { summonPod, donovanCheckIn, unlockShowers } from "./horizon.js";
import { hostelCheckIn } from "./hostel.js";
import { unlockBrief } from "./predecessor.js";
import { STUPID } from "./lcd_npcs.js";
import { FLAG_CREDITS, FLAG_FORM_COMPLETE, FLAG_PC_ALIAS, FLAG_PC_PROFESSION, HOOK_CHECKED_BALANCE, HOOK_ID_ON_TERMINAL, HOOK_READ_CONTRACT, } from "./flags.js";
import { score } from "./scoring.js";
// --- Helpers ------------------------------------------------------------
function balance(s) {
    const v = s.flags[FLAG_CREDITS];
    return typeof v === "number" ? v : 0;
}
function alias(s) {
    return s.flags[FLAG_PC_ALIAS] ?? "<unnamed>";
}
function profession(s) {
    return s.flags[FLAG_PC_PROFESSION] ?? "<undeclared>";
}
// --- The lobby's form datapad ------------------------------------------
const formDatapad = {
    id: "form_datapad",
    name: "registration datapad",
    aliases: ["form", "datapad", "pad", "tablet"],
    description: (s) => {
        if (!s.flags[FLAG_FORM_COMPLETE]) {
            return "A datapad rests on the low table, its screen active and patient. It is waiting for you to begin.";
        }
        return "The datapad has gone to standby. Whatever it does next is not your problem.";
    },
    takeable: false, // Tethered to the desk (D7).
    onExamine: (s) => {
        // Examining the form datapad before it's complete triggers the form.
        if (!s.flags[FLAG_FORM_COMPLETE]) {
            requestPushModal(s, makeCharacterCreationModal());
        }
    },
};
// --- Lobby scenery: the unmanned terminal ------------------------------
const terminal = {
    id: "terminal",
    name: "reception terminal",
    aliases: ["terminal", "reception", "computer", "screen"],
    description: (s) => s.flags[FLAG_FORM_COMPLETE]
        ? "A bland login screen, the kind every multi-tenant building runs. The only " +
            "interactive element is an ID scanner — for tenants and their staff, which " +
            "you are emphatically not."
        : "A bland login screen, the kind every multi-tenant building runs. The only " +
            "interactive element is an ID scanner, and you've nothing yet to scan.",
    takeable: false,
};
// --- The starting items, issued by Miss Terry after the briefing -------
const fakeId = {
    id: "fake_id",
    name: "ID card",
    aliases: ["id", "card", "identification", "pass"],
    description: (s) => `A standard-format personal ID card. Your photograph, your alias, your ` +
        `stated profession. It looks entirely legitimate because, in all the ways ` +
        `that matter, it is — registered through channels you'd rather not think ` +
        `about too carefully. The balance display on the reverse updates on ` +
        `contact with a reader.\n\n` +
        `Your alias is ${alias(s)}. Profession listed as ${profession(s)}. ` +
        `Balance display currently reads: ${balance(s)} credits.`,
    takeable: true,
    onUseWith: {
        // tap ID on datapad -> credit balance check (free action).
        datapad: (s) => {
            score(s, HOOK_CHECKED_BALANCE);
            return {
                output: [
                    "You tap your ID against the datapad's reader. A small balance window opens.",
                    `Available credit: ${balance(s)} credits.`,
                ],
                tickCost: 0,
                free: true,
            };
        },
        // tap ID on the lobby terminal -> polite rejection (humorous).
        terminal: (s) => {
            score(s, HOOK_ID_ON_TERMINAL);
            return ("You wave the card at the scanner. It thinks about it for a moment, then " +
                "displays: ACCESS DENIED — UNRECOGNISED TENANT. A small consolation: it " +
                "didn't laugh.");
        },
        // tap/use ID at a reception reader -> check in (Donovan's / the hostel).
        donovan_reception_desk: (s) => donovanCheckIn(s),
        hostel_reader: (s) => hostelCheckIn(s),
        // tap/use ID on a TravelTube reader -> summon a pod (same as SCAN).
        reader_retail: (s) => summonPod(s),
        reader_blue: (s) => summonPod(s),
        arboretum_reader: (s) => summonPod(s),
        reader_residential_b: (s) => summonPod(s),
        reader_service: (s) => summonPod(s),
        reader_industrial: (s) => summonPod(s),
        reader_lcd: (s) => summonPod(s),
        reader_training: (s) => summonPod(s),
        reader_ez1: (s) => summonPod(s),
        reader_ez2: (s) => summonPod(s),
        reader_cda: (s) => summonPod(s),
        // tap/use ID on the shower turnstile -> admit to the (ID-gated) showers.
        shower_turnstile: (s) => unlockShowers(s),
    },
};
const datapad = {
    id: "datapad",
    name: "datapad",
    aliases: ["pad", "tablet", "computer", "device", "my datapad", "own datapad"],
    description: "A personal datapad, slim and well-used. Three documents loaded: the " +
        "contract brief, a room reservation, and a blank notepad.\n\n" +
        "You can read contract, read reservation, or read notepad — and ADD NOTE <text> to jot something down yourself.",
    takeable: true,
    // The leash: AetherLink's device carries a hidden SnapSpace transponder (plot
    // design §4). It never leaves the PC's hands in normal play — the only
    // exception is the scripted Flee, where Burke takes it. So: non-droppable. (The
    // PC stays blind to the transponder; it surfaces only in the death coda.)
    droppable: false,
    // The failsafe: hold your 'pad against the predecessor's identical, dormant one
    // to wake it and crack his sealed brief (works in this order too).
    onUseWith: {
        predecessor_datapad: (s) => unlockBrief(s),
        // The hard prohibition: never bring the resistance datacard near the
        // AetherLink datapad (reference/npc-specs-batch-2.md §3).
        rajah_datacard: () => STUPID,
    },
};
// Sub-documents — hidden inventory items, so `read contract` works without
// listing them in the inventory summary.
const contract = {
    id: "contract",
    name: "contract brief",
    aliases: ["contract", "brief", "engagement", "summary"],
    description: [
        "HALBERD RECOVERY SERVICES — ENGAGEMENT SUMMARY",
        "",
        "Target designation: The Jackrabbit. Believed male.",
        "Known links: Horizon Outpost.",
        "Objective: Deliver actionable intelligence regarding",
        "           target's identity and/or location.",
        "Delivery: File findings to the client through this device",
        "          (command: SUBMIT) at any time before the term",
        "          elapses. Escrow releases on delivery.",
        "Engagement term: Bounded. The escrow window closes on",
        "                 expiry; nothing is owed thereafter.",
        "Remuneration: [withheld pending engagement] — held in escrow.",
        "Handler contact: Miss Terry (secure channel, registered to",
        "                 this device).",
        "Client identity: Confidential.",
        "",
        "This document is for contractor reference only and will",
        "auto-delete on contract completion or expiry.",
    ].join("\n"),
    takeable: true,
    hidden: true,
    // Reading the brief is playing the game properly — score it. (read fires
    // onExamine too, so `read contract` and `examine contract` both count.)
    onExamine: (s) => { score(s, HOOK_READ_CONTRACT); },
};
const reservation = {
    id: "reservation",
    name: "Donovan's reservation",
    aliases: ["reservation", "booking", "donovans", "donovan"],
    description: (s) => [
        "DONOVAN'S",
        "Horizon Outpost — Blue Sector",
        "",
        "Reservation confirmed.",
        `Name: ${alias(s)}`,
        "Check-in: on arrival",
        "Check-out: open",
        "Payment: on departure",
        "",
        "No further confirmation required.",
        "Present ID on arrival.",
    ].join("\n"),
    takeable: true,
    hidden: true,
};
const notepad = {
    id: "notepad",
    name: "notepad",
    aliases: ["notepad", "notes", "journal"],
    description: (s) => (s.notes.length === 0 ? "[No entries yet.]" : renderNotes(s).join("\n")) +
        "\n\n(Jot your own with ADD NOTE <text>.)",
    takeable: true,
    hidden: true,
};
export const items = {
    form_datapad: formDatapad,
    terminal,
    fake_id: fakeId,
    datapad,
    contract,
    reservation,
    notepad,
};
