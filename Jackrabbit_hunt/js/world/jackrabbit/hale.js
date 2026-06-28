// Captain Marcus Hale — Jack's flight instructor, and the last named Strand-1
// loyalty wall. Canon (jackrabbit-series.com, character 9): a veteran military
// pilot, stern/fair/no-nonsense, primary instructor on Horizon's Basic Pilot
// Certification; he recognised Jack's exceptional natural talent and quietly set
// him advanced problems "off the record" while keeping a gruff exterior; he is
// notably immune to the Drayton family's money (he taught Chas too, and refused
// to favour him). For the PC he is a WALL: warm, in hindsight, about a gifted boy
// — and entirely unwilling to give a hunter anything that could find him. No name,
// no whereabouts, no ship.
//
// DAYTIME-ONLY, on the Simulator Deck (training_sim_deck): the school keeps day
// hours, so he is absent at night. Presence is driven dynamically (the deck's
// onEnter + a World.onTick fragment), mirroring the night-only bar NPCs inverted.
import { aliasedTopics } from "../../engine/authoring.js";
import { addNote } from "../../engine/notes.js";
import { placeNpcInRoom } from "../../engine/npcs.js";
import { score } from "./scoring.js";
import { HOOK_TALKED_HALE, HOOK_HALE_WALL } from "./flags.js";
const SIM_DECK = "training_sim_deck";
/** Sentinel "room" Hale occupies at night — no real room, so he appears nowhere.
 *  (Dynamic placement here wins over any static Room.npcs listing.) */
const OFFSTAGE = "__hale_offstage_night";
/** Place Hale on the Simulator Deck by day, offstage by night. Idempotent. */
export function syncHale(s) {
    placeNpcInRoom(s, "hale", s.isDaytime ? SIM_DECK : OFFSTAGE);
}
/** World.onTick fragment — keeps Hale present/absent as the day/night turns. */
export function haleTick(s) {
    if (s.dead || s.ended)
        return;
    syncHale(s);
}
/** The loyalty wall: raising the boy/hunt draws out Hale's quiet, total refusal
 *  to give a student up. Scores HOOK_HALE_WALL once and files the wall note. No
 *  intel — by design he divulges nothing actionable. */
function haleWall(s) {
    if (score(s, HOOK_HALE_WALL)) {
        addNote(s, {
            id: "hale_wall",
            source: "You",
            text: "Captain Hale taught the target to fly and plainly rated him — set him harder problems than the " +
                "syllabus, off the record. But he is a wall: he won't give a name, a destination, or anything a " +
                "hunter could use. Says he's had my sort on his deck before. Also taught (and refused to favour) a " +
                "Drayton.",
            reliable: true,
        });
    }
    return "Something in him goes still — the wariness of a man who has just seen where a conversation is " +
        "heading. He turns from the screen and looks at you properly for the first time. \"The boy.\" Not a " +
        "question. \"You're another one, then. Come asking after a student of mine as though he were lost " +
        "property.\" The contempt is quiet, and total. \"I'll tell you what I told the last one up here with " +
        "that same look. I have taught a great many pilots on this deck, and a few of them could truly fly. " +
        "Where they went after, what they are doing and whatever they might call themselves now — none of that " +
        "is mine to give, and none of it is yours to have.\" He turns back to the display. \"We're done here.\"";
}
export const hale = {
    id: "hale",
    name: "Captain Hale",
    aliases: ["hale", "captain", "captain hale", "marcus hale", "marcus", "instructor", "the captain"],
    description: "A spare, upright man somewhere past sixty, grey-cropped and weather-cut, with the unmistakable bearing " +
        "of a great many years spent in a cockpit. He stands at a portable console watching a trainee flounder " +
        "through a docking exercise on the wall display, his expression that of a man who has seen every mistake " +
        "a human being can make at the stick and is waiting, without much hope, for this one to invent a new " +
        "one.",
    onTalk: (s) => {
        if (score(s, HOOK_TALKED_HALE)) {
            addNote(s, {
                id: "hale_encounter",
                source: "You",
                text: "Captain Hale — pilot instructor, Flight Training (Simulator Deck; daytime only). Veteran " +
                    "military flyer, stern and fair, deeply unforthcoming. Runs the Basic Pilot Certification.",
                reliable: true,
            });
        }
        return [
            "He doesn't turn round at once — he finishes whatever judgement he's forming about the screen first. " +
                "Then, flatly: \"You're not one of mine.\" It isn't a greeting; it's a fact, established and filed. " +
                "\"This is a working deck, not a thoroughfare. State your business — briefly, and to the point.\"",
        ];
    },
    topics: aliasedTopics([
        // The wall — raising the boy / the hunt.
        [["jackrabbit", "rabbit", "jack", "boy", "the boy", "young man", "target", "him", "kid", "lad", "student",
                "hunting", "hunt", "looking", "searching", "find him", "hired", "investigation"],
            (s) => haleWall(s)],
        // The covert pride — canon: he spots a natural and quietly stretches them. No
        // name, no intel; the warmth shuts off as fast as it shows.
        [["flying", "fly", "talent", "natural", "best", "gifted", "skill", "ability", "good pilot"],
            "For a moment the instructor's mask slips — not far. \"Now and again one comes through who doesn't have " +
                "to think about it. The hands know before the head does. You can't teach that; you can only get out of " +
                "its way and try not to ruin it.\" He says it to the screen, not to you. \"I may, once or twice, have " +
                "set a pilot like that harder problems than the certification calls for. Off the record. It would be a " +
                "waste of the rare thing to leave it idling on basic manoeuvres.\" The warmth closes off as suddenly as " +
                "it came. \"Most of them, mind, are exactly as good as they work. You may write that down.\""],
        // The Drayton link — fair to all, immune to the money. (He taught Chas.)
        [["chas", "drayton", "gordon", "family", "money", "influence", "son", "rich"],
            "\"Drayton.\" The name lands flat as a dropped tool. \"I have taught a Drayton, yes. Money buys a seat " +
                "in my classroom. It does not buy a pass mark, and it does not buy one soft word from me — a control " +
                "stick could not care less whose son is gripping it.\" A short, hard pause. \"If you've come up here on " +
                "that account, you've wasted a long climb.\""],
        // His subject — the rigour. (Canon: uses the strugglers as cautionary tales.)
        [["training", "school", "course", "certification", "standards", "students", "class", "teach", "lessons"],
            "\"Basic Pilot Certification. I have run it longer than most of my students have been alive.\" A " +
                "flicker of grim satisfaction. \"They arrive certain that flying is a thing one feels. I disabuse them " +
                "of it. Flying is a thing one does, correctly, ten thousand times — until the once it matters, you do " +
                "it without feeling anything at all.\" A nod at the trainee fumbling the docking sim. \"That one will " +
                "pass. Eventually. If only as a lesson to the next intake.\""],
        // Names — a clean refusal.
        [["name", "his name", "called", "names", "real name"],
            "\"I have had a roll of names every term for thirty years, and given up not one of them to anyone. I'll " +
                "not start with a stranger who hasn't troubled to give me his.\""],
        // Whereabouts — the hard deflect.
        [["where", "gone", "left", "location", "whereabouts", "went", "flew off", "leave"],
            "\"I teach them to leave, Mister Whoever-You-Are. Where they fly to afterward is rather the entire " +
                "point of the exercise — and no concern of mine. Nor, I'd hazard, any business of yours.\""],
        // Himself — the military past, lightly closed off.
        [["hale", "captain", "yourself", "you", "military", "background", "history", "career", "service"],
            "\"Captain Hale. Some decades putting military pilots into seats they'd no business walking away from, " +
                "and a good few more since putting civilians into ones they'll never properly appreciate.\" He does " +
                "not expand on the decades, and something in the way he doesn't tells you not to go after it. \"I came " +
                "here to teach. It's honest work, and the gravity's kinder.\""],
    ]),
    unknownTopic: "\"Not a flying matter, and so not mine. Was there anything else — anything actually to the point?\"",
};
