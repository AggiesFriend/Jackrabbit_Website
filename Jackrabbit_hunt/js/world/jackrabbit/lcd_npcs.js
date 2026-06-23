// Lower Commercial District NPCs (Batch 2): Teng the vessel broker and Dr Rajah
// the resistance contact. Spec: reference/npc-specs-batch-2.md §2–§3.
//
// Both belong to Strand 3 (the defect pathway).
//   - Teng's full berth-pointer beat is gated on FLAG_DEFECT_PATHWAY (the moral
//     pivot reached). Before that he's harmless atmospheric texture.
//   - Rajah is a THREE-STAGE thread (live on the defect route, gated on Burke's
//     Beat-3 referral, FLAG_BURKE_REFERRED_RAJAH):
//       1. Burke sends the PC to where she LIVES — a random, persistent address
//          in the Residential Zone B maze (FLAG_RAJAH_RESIDENCE). She's placed
//          there on referral; her LCD pharmacy stays shut until then.
//       2. Found at home, she won't talk there — she vets the PC and relocates
//          to her LCD unit, telling them to come (FLAG_RAJAH_HOME_MET).
//       3. At the unit, TALK takes her to the back consulting room (FLAG_RAJAH_
//          INVITED; the PC FOLLOWs). There she explains the room's guaranteed
//          medical privacy and makes the offer; only once the PC COMMITS to
//          abandoning the corporations (a yes/no confirm) does she hand over the
//          datacard (FLAG_RAJAH_COMMITTED) and urge an offline datapad.
//
// Also defines the resistance DATACARD and its hard prohibition: the PC must
// never load it onto (or near) their AetherLink datapad. Any such attempt →
// "That really would be an inconceivably stupid thing to do."
import { aliasedTopics, requestPushModal } from "../../engine/authoring.js";
import { addNote } from "../../engine/notes.js";
import { placeNpcInRoom } from "../../engine/npcs.js";
import { takeItemToInventory } from "../../engine/items.js";
import { handleLoad } from "../../engine/commands/meta.js";
import { residentialRooms } from "./residential.js";
import { FLAG_DEFECT_PATHWAY, FLAG_BURKE_REFERRED_RAJAH, FLAG_RAJAH_INVITED, FLAG_RAJAH_RESIDENCE, FLAG_RAJAH_HOME_MET, FLAG_RAJAH_COMMITTED, HOOK_TALKED_TENG, HOOK_RAJAH_DATACARD, } from "./flags.js";
import { score } from "./scoring.js";
const RAJAH_FRONT = "lcd_rajah_front";
const RAJAH_BACK = "lcd_rajah_back";
/** The one true response to any attempt to bring datacard and datapad together. */
export const STUPID = "That really would be an inconceivably stupid thing to do.";
// --- The resistance datacard --------------------------------------------
export const rajahDatacard = {
    id: "rajah_datacard",
    name: "resistance datacard",
    aliases: ["resistance datacard", "datacard", "card", "data card", "rajah's datacard"],
    description: "A small, anonymous datacard — no markings, no branding, nothing to say what it is or whose it is. " +
        "Dr Rajah said it holds coordinates and a transmission frequency, to be read on an OFFLINE machine, " +
        "far from here — emphatically NOT the AetherLink device in your pocket.",
    takeable: true,
    // Handed over by Rajah on commitment (see rajahHandsOverCard), never sat in a
    // room to be picked up — so the scoring/note live there, not in an onTake hook.
    // The prohibition, from the datacard's side.
    onUseWith: {
        datapad: () => STUPID,
    },
};
/** `load` / `insert` — intercepts an attempt to load the resistance datacard
 *  (onto the AetherLink datapad) with the one true answer. CRUCIAL: `load`
 *  (and its synonym `restore`) is ALSO the engine's restore-a-saved-game verb,
 *  and a world command shadows the built-in — so anything that ISN'T the
 *  datacard must delegate to the real `handleLoad`, or save/load breaks. */
export const loadInsertCmd = (world, s, cmd) => {
    const noun = (cmd.noun ?? "").trim().toLowerCase();
    const aboutCard = /card|datacard|frequency|coord/.test(noun);
    if (aboutCard && s.inventory.includes("rajah_datacard")) {
        return { handled: true, output: [STUPID], tickCost: 0, free: true };
    }
    // Not the datacard. `load`/`restore` is the save-game verb — hand it back to
    // the engine's loader. (`insert` is not an engine verb; nothing else to load.)
    if (cmd.verb === "load")
        return handleLoad(world, s, cmd);
    return { handled: true, output: ["There's nothing to load."], tickCost: 0, free: true };
};
// --- Teng (vessel broker) -----------------------------------------------
function tengShip(s) {
    if (!s.flags[FLAG_DEFECT_PATHWAY]) {
        return "\"Off-Consortium, mid-range, something specific?\" He gestures at the wall screens, professionally " +
            "incurious. \"Tell me what you're after and I'll search the stock. I deal in working vessels — yachts, " +
            "light freighters, personal transports.\" Nothing here is what you need, and he offers nothing more.";
    }
    if (score(s, HOOK_TALKED_TENG)) {
        addNote(s, {
            id: "teng_encounter",
            source: "You",
            text: "Teng (vessel broker, Lower Commercial District) — buying passage off-Consortium costs hundreds " +
                "of thousands; out of reach. His off-the-record tip instead: a bulk hauler finishing repairs in the " +
                "SHIPYARD's large bay, bound out-system within a day. Get into the yard after dark, into her open " +
                "hold, and STOW AWAY. They run light on crew and don't search their own hold.",
            reliable: true,
        });
    }
    return [
        "\"Off-Consortium?\" He says it the way a doctor names a diagnosis — neutrally, without alarm. \"It can " +
            "be done. I have three vessels that could make the run. The cheapest —\" he taps a screen, and the " +
            "price appears: a figure in the hundreds of thousands. \"That's with a discount for immediate " +
            "settlement.\"",
        "He watches the realisation land. \"I thought so. Most people who come to me with that look can't " +
            "afford it either.\" A pause; he lowers his voice, and the broker's polish goes with it. \"There's " +
            "another way, but it isn't one I'd put my name to. Up in the shipyard there's a bulk hauler — big repair " +
            "job, near enough done, and she's cleared to leave within the day. Bound well out-system. Her sort run " +
            "light on crew, and nobody searches their own hold.\"",
        "He lets that sit. \"A man who got himself into that yard after dark, and into that hold among the " +
            "cargo, would be a very long way from Horizon before anyone thought to look. The yard's no friendly " +
            "place at night, mind. But that's the road, if you've the nerve for it. And I'd not advertise where " +
            "you're going.\"",
    ].join("\n\n");
}
export const teng = {
    id: "teng",
    name: "Teng",
    aliases: ["teng", "broker", "vessel broker", "ship dealer", "dealer"],
    description: "A trim man behind a very clean desk, dressed without fuss in the kind of neat practical clothes that " +
        "say *business* without saying *money*. He has the unhurried watchfulness of someone who has spent " +
        "decades reading buyers — who's serious, who's window-shopping, who's in trouble — and given up caring " +
        "which one you are.",
    onTalk: (s) => {
        if (s.flags[FLAG_DEFECT_PATHWAY]) {
            return ["He takes you in with the same unhurried attention, but something shifts in his assessment — " +
                    "a very faint recalibration. \"You're not here to browse,\" he says. Not accusing; simply noting a " +
                    "fact. \"Something more specific. Something heading away from the main routes, I'd imagine.\""];
        }
        return ["\"Welcome. Looking to buy, or just looking?\" He gestures at the wall screens — listings scroll " +
                "past. \"I deal in working vessels, mostly mid-range. If you have something specific in mind, I can " +
                "search the current stock.\""];
    },
    topics: aliasedTopics([
        [["ship", "vessel", "buy", "escape", "leaving", "leave", "off-consortium", "berth", "transport", "passage", "run"],
            (s) => tengShip(s)],
        [["jackrabbit", "rabbit", "jack", "boy", "investigation", "target"],
            "\"I sell ships. I don't track the people who sail them.\" Not unfriendly; just a clean boundary."],
        [["teng", "yourself", "you", "business", "brokerage"],
            "\"Second-hand ships, long enough that the transaction stopped being interesting and only the ships " +
                "still are. I'm not affiliated with anyone. Makes for a quieter life.\""],
    ]),
    unknownTopic: "\"Not my area. Vessels and the logistics of moving them — that's what I can help with.\"",
};
// --- Dr Rajah (resistance contact — the three-stage thread) -------------
/** The pool of Zone B residence rooms (the maze's 512 numbered units), by id. */
function zoneBResidenceIds() {
    return Object.keys(residentialRooms).filter(id => id.includes("residential_zone_b_residence_"));
}
/** Burke's referral endpoint: pick (once, at random) the Zone B residence Dr
 *  Rajah lives at, persist it, place her there, and return its address (the room
 *  name, e.g. "Residence B2-NE3-D-E"). Idempotent — re-quotes the stored address. */
export function referRajahToResidence(s) {
    let id = typeof s.flags[FLAG_RAJAH_RESIDENCE] === "string" ? s.flags[FLAG_RAJAH_RESIDENCE] : "";
    if (!id) {
        const pool = zoneBResidenceIds();
        id = pool[Math.floor(Math.random() * pool.length)] ?? "";
        s.flags[FLAG_RAJAH_RESIDENCE] = id;
        if (id)
            placeNpcInRoom(s, "rajah", id);
    }
    return residentialRooms[id]?.name ?? "Residential Zone B";
}
/** True when the PC is standing in Rajah's (referred) residence, pre-redirect. */
function atRajahResidence(s) {
    const home = s.flags[FLAG_RAJAH_RESIDENCE];
    return typeof home === "string" && home.length > 0 && s.currentRoom === home;
}
/** Stage 2 — found at home. She vets the PC at the door, won't talk there, and
 *  redirects to her LCD unit, relocating to the shopfront. Fires once. */
function rajahResidenceRedirect(s) {
    if (!s.flags[FLAG_RAJAH_HOME_MET]) {
        s.flags[FLAG_RAJAH_HOME_MET] = true;
        placeNpcInRoom(s, "rajah", RAJAH_FRONT);
        addNote(s, {
            id: "rajah_home_met",
            source: "You",
            text: "Found Dr Rajah at her home in Residential Zone B. She wouldn't talk there — told me to come to " +
                "her unit instead: the pharmacy in the Lower Commercial District (Sector 4, west off the concourse), " +
                "where she says there's a back room that's genuinely private.",
            reliable: true,
        });
    }
    return "She opens the door only as far as the chain allows and studies you the way she'd read an X-ray — " +
        "unhurried, weighing what's underneath. Whatever Burke saw in you, she seems to find it too. \"Not " +
        "here.\" Quiet, and final; a glance past you down the accessway. \"My home is my home. If we're to talk " +
        "— and I've not yet said we are — it's at my unit, and nowhere else. The pharmacy, Sector Four, west " +
        "off the concourse. There's a room in back.\" The door eases shut. \"Come when you're certain. Not " +
        "before.\"";
}
/** Stage 3a — at the unit shopfront. TALK (or the resistance topic) takes her
 *  through to the consulting room; the PC FOLLOWs. Fires once. */
function rajahToBackRoom(s) {
    if (!s.flags[FLAG_RAJAH_INVITED]) {
        s.flags[FLAG_RAJAH_INVITED] = true;
        placeNpcInRoom(s, "rajah", RAJAH_BACK);
    }
    return "\"You came.\" She sets down what she's holding, crosses to the beaded curtain, and lifts it. \"Not " +
        "out here. Come through.\" She steps into the back room and waits for you to follow. (FOLLOW her, or " +
        "head NORTH.)";
}
/** Stage 3b — in the consulting room. The privacy explanation + the invitation
 *  to ask; or, post-commit, the parting line. */
function rajahBackRoomTalk(s) {
    if (s.flags[FLAG_RAJAH_COMMITTED]) {
        return "\"You have what you came for. Read it somewhere safe, on something offline — and not a word of " +
            "where you got it.\"";
    }
    return "\"This is a consulting room,\" she says, and slides a heavy door across behind the beaded " +
        "curtain — it seats into its frame with the soft, total finality of proper soundproofing. \"A medical " +
        "consultation is private, by law and by build: no monitoring, no recording, no exception. There are " +
        "perhaps three places on this whole station where that's truly so, and you're sitting in one of them. " +
        "It's the reason I keep the shop.\" She folds her hands. \"Burke sent you, which means " +
        "you've worked something out and didn't care for the shape of it. So ask me plainly what you came to " +
        "ask — about the people who help a man step out of all this. RESISTANCE, if you want the word for it.\"";
}
/** Stage 3c — she hands the datacard over (PC has committed). Scores + notes. */
function rajahHandsOverCard(s) {
    takeItemToInventory(s, "rajah_datacard");
    score(s, HOOK_RAJAH_DATACARD);
    addNote(s, {
        id: "rajah_datacard",
        source: "You",
        text: "Committed to the defect route. Dr Rajah gave me a resistance datacard: coordinates and a " +
            "transmission frequency. No names exchanged, by design. CRITICAL: never bring it near the AetherLink " +
            "datapad — I need an OFFLINE, air-gapped datapad to read it, somewhere far from Horizon. To get off " +
            "the station, Rajah says to see Teng, the broker in this district — he'll know a ship to slip aboard.",
        reliable: true,
    });
    return "She reaches into a drawer and presses a small, unmarked datacard into your hand — into your hand, " +
        "not onto the desk, so the choice is already made. \"Coordinates, and a transmission frequency. Use " +
        "them and the right people find you. I don't know their names; they don't know mine; that is the whole " +
        "of the point.\" Her fingers close briefly over your wrist. \"Now hear the one thing that matters: do " +
        "NOT bring this near that networked pad in your pocket. Not to read it, not to copy it, not once. Get " +
        "yourself an OFFLINE machine — an old datapad that's never touched a network and never will — and read " +
        "it on that, far from here. Put this and that together and you hang us all.\"\n\n" +
        "She releases your wrist, and something almost like concern crosses her face. \"And you'll want to be " +
        "off this station — quick, and quiet. You'll not manage it on what's in your pocket, and you can't be " +
        "seen buying passage. There's a broker down this district: Teng. He knows which ships are leaving, and " +
        "which of them won't ask a stowaway his name. Go to him for the way out — and tell him nothing of me.\" " +
        "A last look. \"Go, now. And not a word of where you got any of it.\"";
}
/** Road-end commit (the irreversible step). Yes -> hand over the card; no -> the
 *  offer keeps; anything else -> press for a straight answer. */
function rajahCommitModal() {
    return {
        onInput: (line, s) => {
            const t = line.trim().toLowerCase();
            const yes = /^(y|yes|yeah|yep|yup|aye|sure|ok|okay|i am|i'm|im|done|do it|in|certain|definitely|please)\b/.test(t);
            const no = /^(n|no|nae|not|wait|stop|cancel|maybe|unsure|think|hold|back|later|never|don't)\b/.test(t);
            if (yes) {
                s.flags[FLAG_RAJAH_COMMITTED] = true;
                return { pop: true, output: [rajahHandsOverCard(s)] };
            }
            if (no) {
                return { pop: true, output: ["\"Then we never had this conversation.\" No offence in it — if " +
                            "anything, a flicker of approval. \"The offer keeps. Come back when there's no 'maybe' left in " +
                            "you. Not before.\""] };
            }
            return { output: ["She waits, unmoving. \"Yes or no. Are you done with them?\""] };
        },
    };
}
/** The resistance/defection topic — context-aware across the three stages. */
function rajahResistance(s) {
    if (!s.flags[FLAG_BURKE_REFERRED_RAJAH]) {
        return "She gives you a level, unhurried look — the look of someone deciding how to take a question. " +
            "\"I'm a pharmacist,\" she says, pleasantly enough. \"I sell medical supplies and the occasional " +
            "consultation. I think you may have the wrong shop.\" Whatever she's read in you, she keeps it to " +
            "herself.";
    }
    // Stage 2: asked at her residence -> the vetting redirect.
    if (atRajahResidence(s) && !s.flags[FLAG_RAJAH_HOME_MET]) {
        return rajahResidenceRedirect(s);
    }
    // Stage 3a: at the unit, pre-back-room -> take her through.
    if (s.currentRoom === RAJAH_FRONT && s.flags[FLAG_RAJAH_HOME_MET] && !s.flags[FLAG_RAJAH_INVITED]) {
        return rajahToBackRoom(s);
    }
    // Stage 3b/c: in the consulting room.
    if (s.currentRoom === RAJAH_BACK && s.flags[FLAG_RAJAH_INVITED]) {
        if (s.flags[FLAG_RAJAH_COMMITTED]) {
            return "\"You have it. The rest is up to you — read it offline, far from here, and not a word of " +
                "where you got it.\"";
        }
        requestPushModal(s, rajahCommitModal());
        return "She doesn't reach for anything yet. \"Understand what you're asking. The people on that card " +
            "don't take the curious, or the hedging, or the man keeping one foot in his old life in case this " +
            "doesn't suit. They take the ones who are done — done with the corporations, the contracts, the whole " +
            "arrangement, and not going back.\" Her eyes hold yours. \"So I'll ask you once. Are you done with " +
            "them? Truly?\"";
    }
    // Referred, but the PC is somewhere else and hasn't done the home visit yet.
    return "\"Not here, and not like this.\" A small shake of the head. \"If Burke sent you, he told you " +
        "where to start. Start there.\"";
}
export const rajah = {
    id: "rajah",
    name: "Dr Rajah",
    aliases: ["rajah", "dr rajah", "doctor", "pharmacist", "proprietor", "her"],
    description: "A woman in her fifties who wears her authority quietly: unhurried eyes, hands that move with medical " +
        "economy, the badge an afterthought on a jacket that has seen a long career. She looks at you the way " +
        "someone looks at a patient — gathering information before speaking — and nods when she has enough.",
    onTalk: (s) => {
        // Stage 2: at her residence — the vetting redirect to her unit.
        if (atRajahResidence(s) && !s.flags[FLAG_RAJAH_HOME_MET]) {
            return [rajahResidenceRedirect(s)];
        }
        // Stage 3a: at the unit shopfront, post-redirect — through to the back room.
        if (s.currentRoom === RAJAH_FRONT && s.flags[FLAG_RAJAH_HOME_MET] && !s.flags[FLAG_RAJAH_INVITED]) {
            return [rajahToBackRoom(s)];
        }
        // Stage 3b: in the consulting room.
        if (s.currentRoom === RAJAH_BACK && s.flags[FLAG_RAJAH_INVITED]) {
            return [rajahBackRoomTalk(s)];
        }
        // Fallback greeting (e.g. the open shopfront before she takes you through).
        return ["\"Good morning — or afternoon, I lose track. What do you need?\" Businesslike, pleasant: she is " +
                "a pharmacist, and the transaction is medical supplies or a consultation."];
    },
    topics: aliasedTopics([
        [["resistance", "defection", "defect", "anti-consortium", "consortium", "escape", "help me", "side",
                "underground", "join", "card", "datacard"],
            (s) => rajahResistance(s)],
        [["jackrabbit", "rabbit", "jack", "boy", "target"],
            "\"I know the name. I can't help you with that.\" Quietly final; no further elaboration."],
        [["coordinates", "frequency", "offline", "datapad"],
            (s) => s.flags[FLAG_RAJAH_COMMITTED]
                ? "\"You have the card. Read it on something offline — never that networked pad — somewhere far " +
                    "from here. Then it's out of my hands, and yours to use.\""
                : "\"I don't know what you mean.\" Mild, and entirely unforthcoming. You get the sense the answer " +
                    "depends on a question you haven't earned the right to ask.",
        ],
        [["reasons", "why", "yourself", "rajah", "doctor"],
            "\"Does it matter? I help people who need it. I've been doing it for a long time.\""],
    ]),
    unknownTopic: "\"I'm a pharmacist. If it isn't medical, you'll want to ask elsewhere.\"",
};
