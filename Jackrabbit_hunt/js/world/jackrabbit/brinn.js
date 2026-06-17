// Brinn Sullivan — Jack's closest friend on Horizon (Strand 1 emotional wall +
// the defection/flee payoff). Spec: reference/brinn-npc-final.md.
//
// First encounter: the arcade pool tables (ez2_pool_tables). The least polished
// wall in the game — a thirteen-year-old who goes visibly still when the wrong
// name lands. The flinch IS the payload.
//
// Second encounter: a one-shot beat in the narrow LCD corridor (lcd_corridor_w2),
// the moral payoff of the defection/flee path. It is GATED on Strand-3 flags
// (FLAG_DEFECTING / FLAG_FLEEING) — now created, and FLAG_DEFECTING is set by
// Burke's Beat 3 — so the encounter is LIVE on the defect route: brinnTick fires
// once the PC has met Brinn (HOOK_TALKED_BRINN) and is on the defect/flee path.
import { aliasedTopics } from "../../engine/authoring.js";
import { addNote } from "../../engine/notes.js";
import { placeNpcInRoom } from "../../engine/npcs.js";
import { FLAG_BRINN_SECOND_DONE, FLAG_DEFECTING, FLAG_FLEEING, HOOK_TALKED_BRINN, HOOK_BRINN_WALL, HOOK_BRINN_SECOND, } from "./flags.js";
import { score } from "./scoring.js";
const SECOND_ENCOUNTER_ROOM = "lcd_corridor_w2";
/** Sentinel "room" Brinn occupies once he bolts from the pool tables — no real
 *  room, so he appears nowhere. (The scripted second encounter doesn't depend on
 *  his position, so this doesn't affect it.) */
const GONE = "__brinn_gone";
export const brinn = {
    id: "brinn",
    name: "Brinn",
    aliases: ["brinn", "boy", "kid", "lad", "sullivan"],
    description: "A round-faced boy of about thirteen, hair cropped close, a scatter of freckles, and a grin that " +
        "arrives without the least encouragement. He has the easy, boundless energy of a kid who's grown up " +
        "running these decks and knows every inch of them. Striped shirt, well-worn at the hem; chalk on his " +
        "fingers. He's halfway through a game and entirely at home.",
    onTalk: (s) => {
        score(s, HOOK_TALKED_BRINN);
        return [
            "He's lining up a shot when he notices you, and straightens with a grin. \"You play?\" He doesn't " +
                "wait for an answer — just chalks his cue and nods at the table as though roping in a passing " +
                "stranger is the most natural thing in the world. \"I'm Brinn. You're new — I'd remember you. I " +
                "remember everyone.\" Cheerful, not boastful; it's simply true. \"So what d'you reckon to the place? " +
                "Horizon. Best station there is, if you ask me. Not that I've been to any others.\" A quick laugh. " +
                "\"But still.\"",
        ];
    },
    topics: aliasedTopics([
        [["pool", "game", "playing", "play", "table", "cue"],
            "\"You sure you don't play? Go on.\" He racks up anyway, optimistic. \"Loads of machines here, but " +
                "the pool's where it's at. You learn to read people, playing pool — who's bluffing, who's good and " +
                "hiding it.\" He sinks one, easy. \"I'm good. I'm not hiding it.\""],
        [["brinn", "yourself", "you", "how long", "live here", "mum", "mother", "family"],
            "\"Born here. Well — not *here* here, not the arcade.\" He grins. \"The station. My whole life. It's " +
                "just me and Mum, but Horizon sort of fills in around you — I've never minded it.\" He spins the cue " +
                "in his hands. \"I know all the good places. The ones that aren't on any map. If you ever want to see " +
                "somewhere worth seeing, I'm your man.\""],
        // The wall — the visible flinch, and then he bolts. Scores brinn_wall (once)
        // and Brinn leaves the pool tables (moved offstage; he's gone thereafter).
        [["jackrabbit", "jack", "rabbit", "that boy", "your friend", "target", "young man", "someone", "friend"],
            (s) => {
                score(s, HOOK_BRINN_WALL);
                placeNpcInRoom(s, "brinn", GONE);
                return "The grin goes. It's quick — there and then gone — but you see it. He sets the cue against " +
                    "the edge of the table, and when he looks back at you he seems a little older than he did a " +
                    "moment ago. \"Don't know who that is.\" It's a bad lie, and he knows it's a bad lie, and he " +
                    "holds it anyway — for about a second. Then he's racking the cue, not quite meeting your eye. " +
                    "\"I — I've got to go. Homework.\" It's a child's excuse and he knows it, but he's already moving, " +
                    "ducking past you and away into the noise of the arcade before you can get another word out.";
            }],
        // Tour-tempt before the wall; a cool brush-off once the wall has been hit.
        [["places", "station", "horizon", "tour", "good places", "show me", "sights", "somewhere"],
            (s) => s.scoreHooks.has(HOOK_BRINN_WALL)
                ? "\"Thought you were looking for someone.\" He doesn't glance up from the table. \"Not really in " +
                    "a touring mood.\""
                : "\"Want the tour?\" His whole face lights at the idea. \"I know spots on this station nobody's " +
                    "put on a map. Best views, best hideaways. Say the word.\"",
        ],
    ]),
    unknownTopic: "He shrugs, easy again. \"Couldn't tell you. Ask me something else.\"",
};
// --- Second encounter (defection/flee payoff) — LIVE on the defect route ----
const SECOND_ENCOUNTER = [
    "It's Brinn. He's coming the other way down the passage when he sees you, and stops dead. There's " +
        "nowhere for either of you to go — the walls are close enough to touch on both sides. For a moment he " +
        "just looks at " +
        "you: that same shuttered expression from the arcade, except warier now, because what are *you* doing " +
        "all the way down here?",
    "",
    "You tell him before he can ask. That you're not looking for the Jackrabbit any more. That you've " +
        "learned some things since the arcade — about who you were working for, and what you were really being " +
        "asked to do — and that it's changed the way you see all of it.",
    "",
    "He listens without moving. When you finish, he says nothing for a long moment. Then: \"Yeah?\" Quiet. " +
        "Testing it.",
    "",
    "\"Yeah,\" you say.",
    "",
    "Something in his face eases — not all the way, but enough. He nods slowly, like he's putting it " +
        "somewhere safe. \"Okay.\" And then, quieter, almost to himself: \"Good.\"",
    "",
    "He steps past you in the narrow space, close enough that you could stop him if you wanted to. You " +
        "don't. A pace on, he pauses — doesn't turn round. \"He laughed at everything, you know. Like he'd only " +
        "just found out he was allowed.\" A beat. \"I hope he still does.\" And then he's gone, and the passage " +
        "is empty, and you're left alone with that.",
];
/**
 * World-clock tick for Brinn's second encounter. Fires once on entering
 * `lcd_corridor_w2` when the PC has met Brinn AND is on the defection/flee path.
 * Those Strand-3 flags don't exist yet, so this is dormant for now. Compose into
 * World.onTick.
 */
export function brinnTick(s) {
    if (s.dead || s.ended)
        return;
    if (s.flags[FLAG_BRINN_SECOND_DONE])
        return;
    if (s.currentRoom !== SECOND_ENCOUNTER_ROOM)
        return;
    if (!s.scoreHooks.has(HOOK_TALKED_BRINN))
        return;
    if (!s.flags[FLAG_DEFECTING] && !s.flags[FLAG_FLEEING])
        return;
    s.flags[FLAG_BRINN_SECOND_DONE] = true;
    score(s, HOOK_BRINN_SECOND);
    addNote(s, {
        id: "brinn_second_encounter",
        source: "You",
        text: "Met Brinn again in the lower-commercial passages and told him you'd stopped hunting the " +
            "Jackrabbit. He let you go — and said he hoped the boy still laughs at everything.",
        reliable: true,
    });
    return SECOND_ENCOUNTER;
}
