// The Untheatrical's armoury — and the one genuinely dark thing the shipyard
// offers: a sidearm, and the ruin it brings if you use it.
//
// The damaged cabinet in the Untheatrical's armoury (already described in
// shipyard.ts: "a damaged hinge, leaving a narrow gap... Not wide enough to be
// useful. Probably.") can be prised open with the crowbar from the Tool Store at
// the yard entrance. Inside is a compact energy sidearm.
//
// The gun is FALSE AGENCY. It does exactly one thing: SHOOT CHAS at the Long
// Shot kills Gordon Drayton's son and ends the game in arrest and lifelong
// imprisonment (the Convict ending). It never protects the PC and resolves
// nothing — pointed at anyone else, the PC won't pull the trigger. Pure, optional,
// player-authored tragedy: a reward for exploring the yard that serves no other
// purpose. (Per the design discussion, 19 Jun.)
//
// Canon note: Horizon's justice is non-violent (see shame.ts) — the consequence
// here is the LAW's, not a shootout. The killing is the PC's; the cell is the
// station's.
import { placeItemInRoom } from "../../engine/items.js";
import { npcsInRoom } from "../../engine/npcs.js";
import { findBestNpcMatch } from "../../engine/commands/interaction.js";
import { score } from "./scoring.js";
import { FLAG_ARMOURY_CABINET_OPEN, SCORE_POINTS, HOOK_TOOK_CROWBAR, HOOK_PRISED_CABINET, HOOK_TOOK_SIDEARM, HOOK_ATE_CURRY, HOOK_SURVIVED_CURRY, } from "./flags.js";
/** The only points that survive shooting Chas — the curry strand (if eaten). */
const CURRY_HOOKS = [HOOK_ATE_CURRY, HOOK_SURVIVED_CURRY];
const ARMOURY_ROOM = "horizon_untheatrical_armory";
const LONG_SHOT = "ez1_long_shot";
// --- The crowbar (Tool Store) -------------------------------------------
const crowbar = {
    id: "crowbar",
    name: "crowbar",
    aliases: ["crowbar", "pry bar", "prybar", "pry-bar", "jemmy", "wrecking bar", "lever", "bar"],
    description: "A short, heavy crowbar from the tool store — cold, blunt, and entirely honest about what it's for. " +
        "A flat chisel at one end, a hooked claw at the other. The sort of thing that opens what doesn't want " +
        "to be opened.",
    takeable: true,
    onTake: (s) => { score(s, HOOK_TOOK_CROWBAR); },
    // USE crowbar ON cabinet — the natural phrasing. (handleUse only consults the
    // FIRST item's onUseWith, so the pair lives here as well as on the cabinet.)
    onUseWith: { damaged_cabinet: (s) => pryCabinet(s) },
};
// --- The damaged armoury cabinet (the Untheatrical) ----------------------
/** Prise the damaged cabinet. Needs the crowbar in hand; reveals the sidearm. */
function pryCabinet(s) {
    if (s.flags[FLAG_ARMOURY_CABINET_OPEN]) {
        return "The damaged cabinet hangs open, its hinge finally surrendered. Empty now — you took what was " +
            "inside.";
    }
    if (!s.inventory.includes("crowbar")) {
        return "You get your fingers to the gap, but the hinge has sprung just shy of useful and the door " +
            "won't give. You'd need something to lever it — a bar, a tool, anything with purchase.";
    }
    s.flags[FLAG_ARMOURY_CABINET_OPEN] = true;
    placeItemInRoom(s, "sidearm", ARMOURY_ROOM);
    score(s, HOOK_PRISED_CABINET);
    return [
        "You work the crowbar's claw into the sprung gap and lean on it. For a moment the cabinet resists — " +
            "then the damaged hinge gives all at once with a flat metal bang that seems enormous in the silent ship.",
        "You freeze. Nothing. The distant clang of yard work goes on, indifferent.",
        "Inside, racked alone where it was overlooked at the last inventory, is a compact energy sidearm. You " +
            "can TAKE it.",
    ];
}
const damagedCabinet = {
    id: "damaged_cabinet",
    name: "damaged cabinet",
    aliases: ["cabinet", "damaged cabinet", "locker", "damaged locker", "gun cabinet", "gun locker",
        "weapons cabinet", "broken cabinet", "small cabinet", "hinge"],
    description: (s) => s.flags[FLAG_ARMOURY_CABINET_OPEN]
        ? "The damaged cabinet stands open, its hinge finally given up entirely. Empty — you took what was in it."
        : "One of the smaller weapons cabinets, its hinge sprung where something has wrenched it. The door " +
            "sits a finger's width proud of the frame — a narrow, tantalising gap, not wide enough for a hand, " +
            "but plainly enough to lever, if you had the right tool.",
    takeable: false,
    // USE crowbar ON cabinet (or the reverse), OPEN/PULL/PUSH cabinet.
    onUseWith: { crowbar: (s) => pryCabinet(s) },
    onOpen: (s) => pryCabinet(s),
    onPush: (s) => pryCabinet(s),
};
// --- The sidearm --------------------------------------------------------
const sidearm = {
    id: "sidearm",
    name: "sidearm",
    aliases: ["sidearm", "gun", "pistol", "weapon", "blaster", "energy sidearm", "energy pistol",
        "firearm", "the gun"],
    description: "A compact energy sidearm, worn smooth at the grip. The charge indicator glows a steady, patient green. " +
        "It is light in the hand and entirely without conscience. At across-a-table range it would do murder " +
        "without effort — a thought that arrives unbidden, and sits there, cold.",
    takeable: true,
    droppable: true,
    onTake: (s) => { score(s, HOOK_TOOK_SIDEARM); },
};
export const armouryItems = {
    crowbar,
    damaged_cabinet: damagedCabinet,
    sidearm,
};
// --- SHOOT (false agency) ----------------------------------------------
/** SHOOT / FIRE / KILL / BLAST / MURDER. The gun's only real function: at the
 *  Long Shot, SHOOT CHAS ends the game (the Convict ending). Anywhere/anyone
 *  else, the PC won't do it. Needs the sidearm in hand. */
export const shootCommand = (world, s, cmd) => {
    if (!s.inventory.includes("sidearm")) {
        return {
            handled: true, tickCost: 0, free: true,
            output: ["You're not carrying anything to shoot with. (Which is, on reflection, probably for the best.)"],
        };
    }
    const noun = (cmd.noun ?? "").trim();
    if (!noun) {
        return { handled: true, tickCost: 0, free: true, output: ["Shoot what?"] };
    }
    const target = findBestNpcMatch(world, npcsInRoom(world, s, s.currentRoom), noun);
    if (!target) {
        return {
            handled: true, tickCost: 0, free: true,
            output: ["There's no one like that here to shoot — and squeezing off a shot at nothing on Horizon is " +
                    "the surest way into a cell there is."],
        };
    }
    // The one thing the gun is for.
    if (target.id === "chas" && s.currentRoom === LONG_SHOT) {
        // Forfeit everything — the gun trail, the hunt, the lot — EXCEPT whatever the
        // curry earned: a life sentence buys you nothing, but the curry was the curry.
        s.score = CURRY_HOOKS
            .filter((h) => s.scoreHooks.has(h))
            .reduce((sum, h) => sum + (SCORE_POINTS[h] ?? 0), 0);
        s.ended = true;
        s.endingId = "convict";
        return { handled: true, tickCost: 1, output: [] };
    }
    // Anyone else: the PC can't, or won't, and knows what it would cost.
    return {
        handled: true, tickCost: 1,
        output: [
            `You level the sidearm at ${target.name} — and then lower it. They're not why you came, and a killing ` +
                `here would only bury you alongside the body. You are, it turns out, not quite that person. Not for ` +
                `${target.name}.`,
        ],
    };
};
/** SHOOT verb bindings (and synonyms) for index.ts. */
export const shootCommands = {
    shoot: shootCommand,
    fire: shootCommand,
    blast: shootCommand,
    kill: shootCommand,
    murder: shootCommand,
    gun: shootCommand,
};
// --- The Convict ending -------------------------------------------------
export const convictEnding = {
    id: "convict",
    survived: true,
    forcedRank: "Convict",
    text: "You raise the sidearm. Chas Drayton has just enough time to register it — the lazy contempt on his " +
        "face curdling into something much younger, and much more afraid — before you fire.\n\n" +
        "The Long Shot goes very quiet, and then very loud. He is dead before the noise has finished bouncing " +
        "off the walls. Someone is screaming. Someone else is already shouting into a comm. You don't run. " +
        "There is, you understand with sudden and perfect clarity, nowhere on this station left to run to.",
    closingText: (s) => {
        const base = "They come fast — station security, then more of them, then men in better suits. There is no question " +
            "of who you are: your ID has been read at every door on Horizon since you arrived, and it is read once " +
            "more now, for the record.\n\n" +
            "The trial is brief. Gordon Drayton does not attend; he does not need to. You have killed the only son " +
            "of the man who owns the very air you are breathing, on a station that looks after its own — and the " +
            "sentence is exactly as long as a long life can be made to feel.\n\n" +
            "Whatever else Chas knew — and he knew more than he ever told you — went into the ground with him. The " +
            "Jackrabbit, the contract, the people who hired you behind their shells: none of it will ever matter " +
            "again. You came to Horizon looking for a way off it. You will be here now for the rest of your days, " +
            "watching, through reinforced glass, the same dock you walked in through.";
        // The curry abides. If the PC once survived the five-alarm curry, even a cell
        // is, by comparison, bearable — the one scrap of credit the verdict can't strip.
        if (s.scoreHooks.has(HOOK_ATE_CURRY)) {
            return base + "\n\n" +
                "And sometimes, in the small grey hours, the memory of that five-alarm curry comes back to you " +
                "unbidden — the sweat, the roaring panic, the absolute certainty you were going to die over a dare. " +
                "You almost smile. Whatever a cell is, it is not the curry. There are, it turns out, worse things " +
                "than being imprisoned.";
        }
        return base;
    },
};
