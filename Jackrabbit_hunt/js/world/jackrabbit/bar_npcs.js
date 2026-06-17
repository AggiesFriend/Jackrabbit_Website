// The Entertainment-Zone-1 bar NPCs (Batch 2): Ozzy in the Brass Rail and Chas
// Drayton in the Long Shot behind it. Spec: reference/npc-specs-batch-2.md §4–§5.
//
// Both are NIGHT-ONLY: off-duty drinkers who are simply not there by day. There's
// no per-NPC presence hook in the engine, so we drive presence dynamically —
// placing each NPC in its bar at night and "offstage" (a sentinel non-room) by
// day. `syncBarNpcs` is called both from the bar rooms' onEnter (so they're
// present in the entry description the moment you walk in at night, before the
// post-move tick runs) and from World.onTick (so they appear/vanish correctly if
// night falls or breaks while you're standing there).
//
//   Ozzy  — Strand-1 loyalty wall: he refurbished and NAMED the ship Jackrabbit.
//           The ship-name confirmation (+2) only fires once the PC already knows
//           "Jackrabbit" is a ship (FLAG_JACKRABBIT_IS_SHIP, from the records).
//   Chas  — the spite-crack: the only Strand-1 source of HARD intel. He gives it
//           out of contempt, and only once the PC reveals they're hunting Jack.
import { aliasedTopics } from "../../engine/authoring.js";
import { addNote } from "../../engine/notes.js";
import { placeNpcInRoom } from "../../engine/npcs.js";
import { FLAG_JACKRABBIT_IS_SHIP, FLAG_JACK_REAL_NAME, FLAG_LONGSHOT_SEATED, FLAG_LONGSHOT_DRINKS, FLAG_CHAS_APPROACHED, HOOK_TALKED_OZZY, HOOK_OZZY_SHIP_NAME, HOOK_TALKED_CHAS, HOOK_CHAS_INTEL, } from "./flags.js";
import { score } from "./scoring.js";
import { balance, charge, canAfford } from "./economy.js";
const BRASS_RAIL = "ez1_brass_rail";
export const LONG_SHOT = "ez1_long_shot";
/** Sentinel "room" the night NPCs occupy by day — no real room, so they appear
 *  nowhere. (Dynamic placement here wins over any static Room.npcs listing.) */
const OFFSTAGE = "__offstage_day";
/** Place Ozzy/Chas in their bars at night, offstage by day. Idempotent. */
export function syncBarNpcs(s) {
    placeNpcInRoom(s, "ozzy", s.isDaytime ? OFFSTAGE : BRASS_RAIL);
    placeNpcInRoom(s, "chas", s.isDaytime ? OFFSTAGE : LONG_SHOT);
}
/** World.onTick fragment — keeps the night bar NPCs in sync as time passes. */
export function nightBarTick(s) {
    if (s.dead || s.ended)
        return;
    syncBarNpcs(s);
}
// --- Ozzy (Foreman Oswald) ----------------------------------------------
/** The Jackrabbit/ship topic. Branches on whether the PC already knows it's a
 *  ship: if so, the proud confirmation (+2); if not, the flat "person or a ship?"
 *  wall. */
function ozzyJackrabbit(s) {
    if (s.flags[FLAG_JACKRABBIT_IS_SHIP]) {
        if (score(s, HOOK_OZZY_SHIP_NAME)) {
            addNote(s, {
                id: "ozzy_encounter",
                source: "You",
                text: "Foreman Oswald (Ozzy) — off duty, the Brass Rail, nights only. Named the Jackrabbit himself; " +
                    "called her a vintage vessel, \"they don't make them like that any more\". Confirmed she's gone; " +
                    "volunteered nothing further. Knows Burke.",
                reliable: true,
            });
        }
        return "He sets his glass down. Looks at you for a moment — the full, unhurried assessment. \"Where'd " +
            "you hear that?\" Not alarmed; not aggressive. Careful. \"That's a job I did. Named her myself, as it " +
            "happens.\" Something settles in him — quiet pride. \"Vintage vessel, she was. They don't make them " +
            "like that any more, and they don't fix them like that any more either — but I did.\" His eyes don't " +
            "move from yours. \"She's gone now. Moved on. I don't know where and I wouldn't tell you if I did.\" " +
            "He picks up his glass again. \"Is that what you came to ask me?\"";
    }
    return "\"Is that a person or a ship?\" A flat, neutral question. Whatever you say, he turns it over for a " +
        "moment, then: \"Can't help you.\" No elaboration; no heat; simply a door that is not open.";
}
export const ozzy = {
    id: "ozzy",
    name: "Foreman Oswald",
    aliases: ["ozzy", "oswald", "foreman", "foreman oswald", "the foreman"],
    description: "A broad man in his fifties, settled on his stool the way furniture settles — as though he has been " +
        "there long enough to become part of the room. His hands on the glass are the hands of someone who " +
        "works with them: thick-fingered, nicked and calloused, faintly blue-grey at the knuckles from years " +
        "of ingrained metal dust. He is not watching you, exactly, but he notices you.",
    onTalk: (s) => {
        if (score(s, HOOK_TALKED_OZZY)) {
            addNote(s, {
                id: "ozzy_encounter",
                source: "You",
                text: "Foreman Oswald (Ozzy) — off duty, the Brass Rail, nights only. Shipyard foreman, thirty " +
                    "years. Sociable enough; gives nothing about the boy. Knows Burke.",
                reliable: true,
            });
        }
        return [
            "He doesn't make you work for an opener. \"Evening.\" A lift of the glass, half-welcome, " +
                "half-assessment. \"You're new. Just off a ship, or have I just not been paying attention?\"",
        ];
    },
    topics: aliasedTopics([
        [["jackrabbit", "rabbit", "ship", "the ship", "jack", "boy", "the boy", "young man", "target"],
            (s) => ozzyJackrabbit(s)],
        [["work", "shipyard", "yard", "job", "ships", "repairs", "refit"],
            "\"Shipyard foreman. Thirty-odd years of it. Every ship that's been through those bays in the last " +
                "two decades, I've had my hands on at some point.\" A note of quiet satisfaction. \"It's good work.\""],
        [["oswald", "foreman", "name", "records", "your name"],
            "\"People call me Ozzy.\" A beat. \"Where'd you see the name?\" He does not confirm or deny the " +
                "shipyard connection until you explain — and if it's the records, he nods once and says nothing more."],
        [["burke", "engineer", "fixer"],
            "\"Good man. Different kind of work to mine, but — if something needs finding or fixing and the " +
                "legitimate channels aren't an option —\" a shrug, \"— you could do worse.\" He does not expand."],
        [["ozzy", "yourself", "you", "drink", "stool"],
            "\"Off the clock,\" he says, with the contentment of a man who has earned it. \"This is where I do my " +
                "thinking, and most of my thinking is about not thinking. Sit, if you like.\""],
    ]),
    unknownTopic: "\"Not my department.\" And back to his drink.",
};
// --- Chas Drayton -------------------------------------------------------
/** Score/flag/note the crack itself (idempotent). Returns true the first time. */
function chasCrackScore(s) {
    if (s.scoreHooks.has(HOOK_CHAS_INTEL))
        return false;
    score(s, HOOK_CHAS_INTEL);
    s.flags[FLAG_JACK_REAL_NAME] = true;
    s.flags[FLAG_JACKRABBIT_IS_SHIP] = true;
    addNote(s, {
        id: "chas_intel",
        source: "Chas Drayton",
        text: "Chas Drayton (the Long Shot, nights only) — son of Gordon Drayton. Despises the target. Gave me " +
            "the name — JACK ABBOTT — and confirmed the ship is called the Jackrabbit. He's gone; Chas doesn't " +
            "know where. Called him a \"nasty little squirt\".",
        reliable: true,
    });
    return true;
}
/** The crack via the VERBAL route — the PC reveals the hunt and Chas, delighted,
 *  spills it out of spite. One-shot; gives Jack's real name + ship name (+4). */
function chasReveal(s) {
    if (!chasCrackScore(s)) {
        return "\"I told you what I know — and enjoyed it. Jack Abbott, the ship's the Jackrabbit, he's gone. " +
            "There's no encore.\" He raises his glass a lazy inch. \"But do come back if you find anyone else to " +
            "be disappointed by.\"";
    }
    return [
        "Something shifts in his face — very quickly, and not quite hidden. Interest, real interest, and " +
            "underneath it something brighter and less comfortable. He sets his glass down. \"You're looking for " +
            "him.\" Not a question. \"Properly looking. Someone hired you.\"",
        "\"Well.\" He leans back. \"I'm going to enjoy this.\" He doesn't smile so much as let the expression " +
            "he's been suppressing show. \"His name is Jack Abbott. The ship — *his* ship, the one your people are " +
            "presumably trying to track — she's called Jackrabbit. He named her that himself, apparently, because " +
            "he thought it was funny. I don't know where he's gone, but he left. A while ago now.\" He picks up his " +
            "glass. \"Does that help?\"",
    ].join("\n\n");
}
// --- The Long Shot drinking build-up (B4b) ------------------------------
// The PC takes a table, drinks, and lets Chas scope them while they scope him.
// A few drinks in, Chas judges the PC drunk enough to bait without a fight and
// comes over looking for an argument — and the spite spills the intel.
const DRINK_PRICE = 2;
const CHAS_APPROACH_AT = 4;
/** SIT at a Long Shot table. */
export function longShotSit(s) {
    if (s.flags[FLAG_LONGSHOT_SEATED]) {
        return { handled: true, output: ["You're already settled at a table."], tickCost: 0, free: true };
    }
    s.flags[FLAG_LONGSHOT_SEATED] = true;
    return {
        handled: true,
        output: ["You take a table with a clear line on the room — and on the young man slouched at the end of " +
                "the bar, who has already clocked you. You can BUY a DRINK and bide your time."],
        tickCost: 1,
    };
}
/** STAND up from the table. */
export function longShotStand(s) {
    if (!s.flags[FLAG_LONGSHOT_SEATED]) {
        return { handled: true, output: ["You're already on your feet."], tickCost: 0, free: true };
    }
    delete s.flags[FLAG_LONGSHOT_SEATED];
    return { handled: true, output: ["You get up from the table."], tickCost: 1 };
}
const DRINK_GLANCE = {
    1: "Down the bar, the young man clocks you over the rim of his glass, then looks away.",
    2: "He glances over again — longer this time. You're the most interesting thing to walk in tonight, and he's bored.",
    3: "He keeps looking now, a small smile starting. Whatever he's deciding about you, he's nearly decided it.",
};
/** Chas comes over spoiling for a fight — and the spite does the rest. */
function chasDrinkApproach(s) {
    s.flags[FLAG_CHAS_APPROACHED] = true;
    chasCrackScore(s);
    return [
        "A chair scrapes. He's up and crossing to your table before you've decided whether you want him to, " +
            "drink in hand, that smile fixed in place. \"You've been watching me all night,\" he says, dropping " +
            "uninvited into the chair opposite. \"Or watching the door. Either way — you're after someone.\"",
        "He doesn't wait to be answered; he's enjoying himself too much. \"Let me save you the legwork. The " +
            "Jackrabbit. Nasty little squirt — hung around like he owned the place, and everyone let him.\" The " +
            "contempt is entirely genuine. \"Jack Abbott, his name is. The ship's the *Jackrabbit* — he named her " +
            "himself, thought it was clever. He's gone. Months back. Don't know where, don't care.\"",
        "He sits back, pleased with the effect. \"There. Now we've both had a night out of it.\"",
    ].join("\n\n");
}
/** BUY DRINK in the Long Shot (seated) or the Brass Rail (casual). Drives the
 *  drink-staging that brings Chas over. */
export function barBuyDrink(s) {
    const inLongShot = s.currentRoom === LONG_SHOT;
    const inBrass = s.currentRoom === BRASS_RAIL;
    if (!inLongShot && !inBrass) {
        return { handled: true, output: ["There's no bar here to order from."], tickCost: 0, free: true };
    }
    if (!s.inventory.includes("fake_id")) {
        return { handled: true, output: ["You'll need your ID to run a tab."], tickCost: 0, free: true };
    }
    if (!canAfford(s, DRINK_PRICE)) {
        return { handled: true, output: [`A drink's ${DRINK_PRICE} credits, and you're short. The barman shrugs.`], tickCost: 0, free: true };
    }
    if (inBrass) {
        charge(s, DRINK_PRICE);
        return { handled: true, output: [`You buy a drink at the Brass Rail and nurse it amiably. (Balance: ${balance(s)} credits.)`], tickCost: 1 };
    }
    // The Long Shot: drinking is the build-up to Chas — but you do it seated.
    if (!s.flags[FLAG_LONGSHOT_SEATED]) {
        return { handled: true, output: ["Grab a table first — SIT down, settle in, and then order. You're in no hurry, and that's the point."], tickCost: 0, free: true };
    }
    charge(s, DRINK_PRICE);
    const n = (Number(s.flags[FLAG_LONGSHOT_DRINKS]) || 0) + 1;
    s.flags[FLAG_LONGSHOT_DRINKS] = n;
    const bal = `(Balance: ${balance(s)} credits.)`;
    // Already cracked: he's said his piece and lost interest.
    if (s.scoreHooks.has(HOOK_CHAS_INTEL)) {
        return { handled: true, output: [`You buy another. Chas, having had his fun, ignores you now. ${bal}`], tickCost: 1 };
    }
    // Drunk enough: Chas comes over.
    if (n >= CHAS_APPROACH_AT) {
        return { handled: true, output: [`You buy another drink; the room has gone soft and warm at the edges. ${bal}`, "", chasDrinkApproach(s)], tickCost: 1 };
    }
    // Building up: the glances escalate.
    return { handled: true, output: [`You buy a drink and work through it. ${DRINK_GLANCE[n] ?? ""} ${bal}`.trim()], tickCost: 1 };
}
/** `buy drink` (and similar) routing for the bars. */
export const barBuyCmd = (_w, s, cmd) => {
    const noun = (cmd.noun ?? "").trim().toLowerCase();
    if (/drink|beer|ale|pint|whisky|whiskey|spirit|round|booze/.test(noun) || !noun) {
        return barBuyDrink(s);
    }
    return { handled: true, output: ["It's a bar — it's drink they sell. Try BUY DRINK."], tickCost: 0, free: true };
};
/** The bar rooms where BUY DRINK / SIT-at-a-table apply. */
export const BAR_ROOMS = new Set([BRASS_RAIL, LONG_SHOT]);
/** BUY route: the EZ1 bars (drinks; the Chas drink-staging). Wired in index.ts. */
export const barBuyRoute = {
    match: (s) => BAR_ROOMS.has(s.currentRoom),
    handler: barBuyCmd,
};
export const chas = {
    id: "chas",
    name: "Chas Drayton",
    aliases: ["chas", "chas drayton", "drayton", "young man", "him"],
    description: "A young man alone at the end of the bar, dressed to indicate money and pulling it off imperfectly — " +
        "something slightly off in the fit, the choice, the ease of it. His face is arranged in the studied " +
        "boredom of someone waiting to be entertained. He is, you estimate, about twenty, and has been twenty " +
        "for quite some time already.",
    onTalk: (s) => {
        if (s.scoreHooks.has(HOOK_CHAS_INTEL)) {
            return ["He's pleased with himself and entirely unhelpful. \"Back again. I've nothing left to give " +
                    "you, and I gave that freely. Buy a drink, at least.\""];
        }
        score(s, HOOK_TALKED_CHAS);
        return [
            "He glances at you with the particular attention of someone who has run out of things to look at. " +
                "\"New face.\" He doesn't say it warmly; he says it the way you'd note a change in the weather. " +
                "\"What brings you here? Not the ambience, presumably.\"",
        ];
    },
    topics: aliasedTopics([
        // The crack — explicit revelation of the hunt.
        [["hunting", "hunt", "hired", "investigating", "investigation", "looking", "searching",
                "find him", "finding", "searching for jackrabbit", "looking for jackrabbit", "after the jackrabbit",
                "mission", "assignment", "the job", "contract", "reveal", "tell him"],
            (s) => chasReveal(s)],
        // Jackrabbit/Jack as a topic — contempt, no detail, unless already cracked.
        [["jackrabbit", "rabbit", "jack", "boy", "the boy", "kid"],
            (s) => s.scoreHooks.has(HOOK_CHAS_INTEL)
                ? "\"Jack Abbott. The ship's the Jackrabbit. He's gone.\" He's delighted to repeat it. \"Still the " +
                    "most fun I've had in weeks.\""
                : "He shrugs. \"Everyone's heard of the Jackrabbit. Some kid who hung around the station and thought " +
                    "he was interesting.\" He takes a drink. \"He wasn't. Little nobody. Gone now, thank God.\" He " +
                    "does not elaborate — there's nothing in it for him.",
        ],
        // Why he dislikes Jack — a flicker of something almost honest.
        [["why", "dislike", "hate", "grudge", "problem", "personal"],
            "\"He's nobody. A jumped-up little —\" He stops. Resets. \"He had no right to be as liked as he " +
                "was.\" A pause that is almost honest. \"That's all.\""],
        // Family — the name, worn like a coat that doesn't quite fit.
        [["family", "father", "gordon", "gordon drayton", "drayton", "name", "money"],
            "\"My father runs this station.\" Said with the flatness of someone accustomed to saying it and no " +
                "longer sure whether it is a source of pride or embarrassment. \"Which means, technically, I could " +
                "have you removed from the premises at any point.\" He smiles slightly. \"I won't. You're the most " +
                "interesting thing that's walked in here tonight.\""],
        [["chas", "yourself", "you", "here", "bar", "drink"],
            "\"Me? I'm the local colour.\" He says it like it costs him something. \"I drink here because it's " +
                "quiet and nobody asks me for anything. Present company excepted.\""],
    ]),
    unknownTopic: "\"Couldn't tell you, and wouldn't trouble myself to find out.\" He sips his drink.",
};
