// The Burrito Céleste server — Strand-1 "friendly wall" (Batch 2). Spec:
// reference/npc-specs-batch-2.md §1.
//
// The dramatic-irony heart of the hunt: the PC stands where Jack stood and hears
// a warm, vivid account of him that yields precisely nothing actionable. She
// *likes* him; her ceiling is "a fine young man". All canon. No time-of-day gate
// (the place keeps daytime hours). She's chattier once the PC has bought a meal
// (FLAG_BOUGHT_AT_CELESTE, set by the cda_burrito stall in food.ts).
import { aliasedTopics } from "../../engine/authoring.js";
import { addNote } from "../../engine/notes.js";
import { FLAG_BOUGHT_AT_CELESTE, HOOK_TALKED_CELESTE_SERVER } from "./flags.js";
import { score } from "./scoring.js";
function bought(s) {
    return s.flags[FLAG_BOUGHT_AT_CELESTE] === true;
}
export const celesteServer = {
    id: "celeste_server",
    name: "the server",
    aliases: ["server", "woman", "cook", "owner", "proprietor", "her"],
    description: "She moves with the unhurried efficiency of someone who has run this hatch for years and found the " +
        "optimal path through every task. Not unfriendly — quite the opposite — but focused: the food is " +
        "happening, and everything else fits around it. Her uniform is spotless despite the evidence of a " +
        "long shift.",
    onTalk: (s) => {
        score(s, HOOK_TALKED_CELESTE_SERVER);
        addNote(s, {
            id: "celeste_encounter",
            source: "You",
            text: "Burrito Céleste server (Celestial Dining Area) — remembers the target well: a polite, hungry " +
                "teenage boy who sat in the corner and asked about the food. Hasn't seen him in a while. Knows " +
                "nothing about his movements or his name.",
            reliable: true,
        });
        return [
            "She looks up with the quick, assessing friendliness of someone who has been on their feet since " +
                "before you were hungry. \"What can I get you? The wrap today is *very* good — I'll say that without " +
                "reservation.\"",
        ];
    },
    topics: aliasedTopics([
        // The vivid ceiling — a fine young man, and nothing actionable.
        [["jackrabbit", "rabbit", "boy", "the boy", "young man", "target", "kid", "him", "someone", "lad"],
            "She considers. \"Young man — maybe fourteen, fifteen? — came in a few times. Polite. *Genuinely* " +
                "polite, not that reflex thing people do. Sat there —\" a small gesture toward the corner table, " +
                "\"— and ate like he meant it. You could tell he'd gone without. Asked about the wraps, what went in " +
                "them, whether I made the sauce myself.\" She smiles, briefly. \"I did. Still do.\" A beat. \"I " +
                "haven't seen him in a while — he's not a regular any more. But he made an impression. A fine young " +
                "man.\""],
        // Pressing harder — a gentle, final dead end.
        [["where", "where did he go", "gone", "find him", "movements", "left", "more", "anything else", "press"],
            "\"I'm sorry — I just served him food. I don't know where he went. People come and go on this " +
                "station; they don't file itineraries with me.\""],
        // The name lands on nothing.
        [["name", "jack", "his name", "called"],
            "She tilts her head. \"Is that what people call him? I didn't know his name. He just came in, ate, " +
                "said thank you, left.\""],
        // Her subject — she brightens.
        [["food", "wrap", "burrito", "menu", "sauce", "sourcing", "herbs", "cooking", "recipe"],
            (s) => bought(s)
                ? "She warms right up — this is her ground. \"You enjoyed it? Good. The herbs are arboretum-grown, " +
                    "station-side, picked the same morning where I can manage it. The sauce I make myself, and no, I " +
                    "won't tell you how.\" A small, pleased pride. \"The large wrap's worth the extra credit — people " +
                    "think they want the small. They don't.\""
                : "She brightens — this is plainly her subject. \"The wraps are the thing. Arboretum-grown herbs, " +
                    "station-side; I make the sauce myself. The large is worth the extra credit, whatever your eyes " +
                    "tell you.\" She says it like someone who has won this argument many times.",
        ],
    ]),
    unknownTopic: "\"I can tell you about the food. Anything else and you'd be better off asking someone who knows.\"",
};
