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
import { FLAG_JACKRABBIT_IS_SHIP, FLAG_JACK_REAL_NAME, FLAG_LONGSHOT_SEATED, FLAG_LONGSHOT_DRINKS, FLAG_CHAS_APPROACHED, FLAG_CHAS_MENACE, FLAG_CHAS_DEFUSED, FLAG_BURKE_PIVOT_DONE, HOOK_TALKED_OZZY, HOOK_OZZY_SHIP_NAME, HOOK_TALKED_CHAS, HOOK_CHAS_INTEL, } from "./flags.js";
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
/** World.onTick fragment — keeps the night bar NPCs in sync as time passes, and
 *  drives the Chas menace window once his approach has opened it. */
export function nightBarTick(s) {
    if (s.dead || s.ended)
        return;
    syncBarNpcs(s);
    return chasMenaceTick(s);
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
/** The spiteful-repeat once the intel is already out. */
const CHAS_SPITE_REPEAT = "\"I told you what I know — and enjoyed it. Jack Abbott, the ship's the Jackrabbit, he's gone. " +
    "There's no encore.\" He raises his glass a lazy inch. \"But do come back if you find anyone else to " +
    "be disappointed by.\"";
/** Pre-approach (no drink build-up): Chas brushes the boy off with contempt and
 *  gives nothing away. The real intel is the *release* from the menace — it only
 *  comes once he's weighed you and you've shown him you're after the boy. */
const CHAS_PRE_AMBLE = "He shrugs. \"Everyone's heard of the Jackrabbit. Some kid who hung around the station and thought he was " +
    "interesting.\" He takes a drink. \"He wasn't. Little nobody. Gone now, thank God.\" He does not " +
    "elaborate — there's nothing in it for him.";
/**
 * Raising the Jackrabbit (or the hunt) to Chas. The one move that matters:
 *  - already out  → the spiteful repeat;
 *  - window open  → the DEFUSE: relief, his men stand down, and the spite spills
 *                   the intel (+4). Closes the danger;
 *  - pre-approach → the wary contempt brush-off (no intel; the menace gates it).
 */
function chasRaiseJackrabbit(s) {
    if (s.scoreHooks.has(HOOK_CHAS_INTEL))
        return CHAS_SPITE_REPEAT;
    if (s.flags[FLAG_CHAS_APPROACHED]) {
        // The defuse. Danger over; his men drift back to the bar; the spite does
        // the rest. (chasCrackScore banks the +4, the flags, and the note.)
        s.flags[FLAG_CHAS_DEFUSED] = true;
        delete s.flags[FLAG_CHAS_MENACE];
        chasCrackScore(s);
        return [
            "Something in his face changes — fast, and not quite hidden. The weighing stops. \"*Him,*\" he says, " +
                "and it comes out somewhere between a laugh and a sneer. \"You're after the *boy.*\" The relief in it " +
                "is ugly; he flicks two fingers and, over by the door, the two men lose interest and drift back to the " +
                "bar. \"Should've led with that. I'd have bought *you* the drink.\"",
            "Then the spite does the rest. \"Jack Abbott. The ship — his ship, the one your people are chasing — " +
                "she's the Jackrabbit; he named her that himself, thought it was clever. Gone, months back. Don't know " +
                "where, don't care. Nasty little squirt.\" He sits back, pleased with himself. \"There. Now we've both " +
                "had a night out of it.\"",
        ].join("\n\n");
    }
    return CHAS_PRE_AMBLE;
}
// --- The menace window + the demise (the sinister redesign) --------------
// chas-scene-design.md (reviewed 15 Jun): the bar scene is a timed survival
// beat. Chas — who disappears investigators for a living — weighs the PC as
// another one, and the ONLY way out is to convince him you're after the boy he
// despises. Raise the Jackrabbit (or the hunt) and you live (with the intel for
// your trouble); stall, or try to leave, and his men walk you out to a death the
// predecessor already died.
/** Turns in the Long Shot, post-approach and undefused, before the trap springs.
 *  n=1 is the approach turn itself (silent); the telegraph beats land at 2/3/4;
 *  the demise at 5. */
export const CHAS_MENACE_LIMIT = 5;
/** The escalating telegraph (keyed by menace count). n=1 is silent — the
 *  approach copy has just played. */
const CHAS_MENACE_BEATS = {
    2: "Chas keeps you talking, easy and unhurried — and one by one the bar's few other regulars find they " +
        "have business at the far end of the room. Without quite seeing it happen, you are being left alone with " +
        "him.",
    3: "The narrow door swings. Two men come in off the Promenade — heavy, deliberate, not here to drink — and " +
        "settle one to either side of it. Neither looks at you. Both know exactly where you are.",
    4: "Chas's eyes flick once, over your shoulder, to the door — and back to you. Whatever he has been " +
        "weighing, he is nearly done weighing it. By the door, one of the men straightens off the wall.",
};
/** The mischief death (dead=true; no epilogue, per v0.5). Shared by all three
 *  routes into it: the clock running out, trying to leave, and standing to go. */
function chasDemise(s) {
    s.dead = true;
    s.deathReason =
        "They walk you out like old friends, one to either side, Chas talking the whole way — the bar sees a few " +
            "drinkers leaving together and thinks nothing of it. The \"better place\" is a door you don't choose, a " +
            "maintenance run the public map doesn't show, a stretch of cold corridor where the music thins away " +
            "behind you. You realise, far too late, that you were never the one doing the hunting.\n\n" +
            "Somewhere past a service airlock the lights are very bright, and then they are not.\n\n" +
            "Disappeared by Chas Drayton's people.";
}
/** The §7 intercept — printed before the demise when the PC tries to LEAVE
 *  (move out, or stand to go) with the window open. */
const CHAS_LEAVE_INTERCEPT = "You're barely out of your chair when the two by the door are simply *there*, one to each elbow, unhurried " +
    "and immovable. \"Off so soon?\" Chas is at your shoulder, all warmth. \"We'll see you out. There's a " +
    "better place just down the way — quieter. You'll like it.\" It is not a suggestion.";
/** True while the kill is live: Chas has approached and the PC hasn't defused. */
function chasWindowOpen(s) {
    return Boolean(s.flags[FLAG_CHAS_APPROACHED]) && !s.flags[FLAG_CHAS_DEFUSED];
}
/**
 * World.onTick fragment for the menace window. While the window is open:
 *  - if the PC has slipped out of the Long Shot (a bolt for the door), the trap
 *    springs (the leave-guard normally catches a deliberate exit first; this is
 *    the backstop for any other way out);
 *  - otherwise the menace mounts each time-costing turn, telegraphed, until at
 *    CHAS_MENACE_LIMIT it springs.
 * Free actions (look/examine/score/inventory) don't tick, so they don't advance
 * it — exactly as the design wants.
 */
export function chasMenaceTick(s) {
    if (s.dead || s.ended)
        return;
    if (!chasWindowOpen(s))
        return;
    if (s.currentRoom !== LONG_SHOT) {
        // Out of the room with the window still open — the men close in.
        chasDemise(s);
        return;
    }
    const n = (Number(s.flags[FLAG_CHAS_MENACE]) || 0) + 1;
    s.flags[FLAG_CHAS_MENACE] = n;
    if (n >= CHAS_MENACE_LIMIT) {
        chasDemise(s);
        return "Chas's gaze settles past your shoulder, and the small nod finishes itself. The two men come off " +
            "the wall by the door without hurry. \"Right, then.\" He rises, all easy warmth. \"Let's get you some air.\"";
    }
    return CHAS_MENACE_BEATS[n];
}
/**
 * Exit guard for the Long Shot's west door. Returns the intercept copy (and sets
 * the demise) when the PC tries to leave with the window open; undefined when the
 * way is clear. Wired as `gated` on ez1_long_shot's west exit in entertainment_1.
 */
export function chasLeaveGuard(s) {
    if (!chasWindowOpen(s))
        return null;
    chasDemise(s);
    return CHAS_LEAVE_INTERCEPT;
}
// --- The Long Shot drinking build-up (B4b) ------------------------------
// The PC takes a table, drinks, and lets Chas scope them while they scope him.
// A few drinks in, Chas — having decided what the PC is — comes over, not to
// gossip but to weigh a job. The approach opens the danger window (above); the
// intel is no longer handed over here, it is the *release* from the menace.
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
/** STAND up from the table. While the menace window is open, standing to leave
 *  springs the trap (the §7 intercept → the demise). */
export function longShotStand(s) {
    if (!s.flags[FLAG_LONGSHOT_SEATED]) {
        return { handled: true, output: ["You're already on your feet."], tickCost: 0, free: true };
    }
    delete s.flags[FLAG_LONGSHOT_SEATED];
    if (chasWindowOpen(s)) {
        chasDemise(s);
        return { handled: true, output: [CHAS_LEAVE_INTERCEPT], tickCost: 1 };
    }
    return { handled: true, output: ["You get up from the table."], tickCost: 1 };
}
const DRINK_GLANCE = {
    1: "Down the bar, the young man clocks you over the rim of his glass, then looks away.",
    2: "He glances over again — longer this time. You're the most interesting thing to walk in tonight, and he's bored.",
    3: "He keeps looking now, a small smile starting. Whatever he's deciding about you, he's nearly decided it.",
};
/** Chas comes over — not to gossip, but to weigh the PC as a job. Opens the
 *  danger window (no intel here). The §4 menace approach. */
function chasDrinkApproach(s) {
    s.flags[FLAG_CHAS_APPROACHED] = true;
    return [
        "A chair scrapes. He crosses to your table before you've decided whether you want him to, and folds into " +
            "the seat opposite without invitation, drink in hand. He looks at you the way a man looks at a delivery. " +
            "\"You've the smell of it,\" he says, almost kindly. \"The suit, the questions, the careful way you don't " +
            "ask them. We get your sort through here, now and again.\"",
        "A slow sip. \"Funny thing — they never seem to leave. Place must agree with them.\" The smile doesn't " +
            "reach anything. \"So. What is it you came to ask me?\"",
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
    // Already cracked (or defused): he's said his piece and lost interest.
    if (s.scoreHooks.has(HOOK_CHAS_INTEL)) {
        return { handled: true, output: [`You buy another. Chas, having had his fun, ignores you now. ${bal}`], tickCost: 1 };
    }
    // Window already open (approached, undefused): another drink just buys time —
    // and the clock is ticking (the menace tick handles the danger).
    if (s.flags[FLAG_CHAS_APPROACHED]) {
        return { handled: true, output: [`You buy another and turn the glass in your hand, taking your time. Chas watches you do it, in no hurry at all. ${bal}`], tickCost: 1 };
    }
    // Drunk enough — but Chas only ENGAGES once the PC is, to his eye, worth the
    // trouble: late in the game, after the funding trail leads to AetherLink and
    // Burke's pivot (FLAG_BURKE_PIVOT_DONE). Until then he's a bored young man who
    // never crosses the room — no approach, no menace, no intel.
    if (n >= CHAS_APPROACH_AT) {
        if (!s.flags[FLAG_BURKE_PIVOT_DONE]) {
            return { handled: true, output: [`You buy another; the room's gone soft and warm at the edges. Down the bar the young man stopped paying you any mind a drink or two ago — and the feeling's mutual. ${bal}`], tickCost: 1 };
        }
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
        // Raising the hunt — during the window, the defuse (and the intel); the move
        // that saves the PC. Pre-approach, the wary brush-off.
        [["hunting", "hunt", "hired", "investigating", "investigation", "looking", "searching",
                "find him", "finding", "searching for jackrabbit", "looking for jackrabbit", "after the jackrabbit",
                "mission", "assignment", "the job", "contract", "reveal", "tell him"],
            (s) => chasRaiseJackrabbit(s)],
        // Raising the Jackrabbit/Jack/the boy — same: the defuse during the window,
        // contempt before it. (User: the trigger to live is to ask about the Jackrabbit.)
        [["jackrabbit", "rabbit", "jack", "boy", "the boy", "kid"],
            (s) => chasRaiseJackrabbit(s)],
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
