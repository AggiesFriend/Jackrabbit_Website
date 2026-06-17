// NPCs for the Halberd pre-Horizon sequence.
// Spec: jackrabbit-pre-horizon-design.md §3 (Miss Terry).
import { aliasedTopics } from "../../engine/authoring.js";
import { takeItemToInventory } from "../../engine/items.js";
import { FLAG_BRIEFING_COMPLETE, FLAG_CREDITS, HOOK_TALKED_TERRY, HOOK_PERSON_OF_INTEREST, } from "./flags.js";
import { score } from "./scoring.js";
const STARTING_CREDITS = 500;
/**
 * Print the briefing (first time the player talks to Miss Terry) and issue
 * the starting items: fake_id, datapad, and the datapad's three sub-documents
 * (contract, reservation, notepad — hidden in inventory).
 *
 * The briefing text is printed by the topic dispatcher in onTalk; this side
 * effect runs alongside that.
 */
function deliverBriefing(state) {
    if (state.flags[FLAG_BRIEFING_COMPLETE])
        return;
    // The items live in world.items but aren't placed in any room — so
    // takeItemToInventory simply adds them to inventory (the off-stage delete
    // is a no-op).
    for (const id of ["fake_id", "datapad", "contract", "reservation", "notepad"]) {
        takeItemToInventory(state, id);
    }
    state.flags[FLAG_CREDITS] = STARTING_CREDITS;
    state.flags[FLAG_BRIEFING_COMPLETE] = true;
}
const BRIEFING_LINES = [
    "Miss Terry waves you to the chair opposite. She doesn't introduce herself —",
    "the form already has.",
    "",
    "\"The target is known as the Jackrabbit. Believed male. Known links with",
    "Horizon Outpost — not a regular, not known to frequent it. Links. That's the",
    "brief.\"",
    "",
    "\"The fee is substantial. Held in escrow, released on delivery of actionable",
    "intelligence, as I assess it. The client values discretion, so I won't be",
    "naming them. Don't ask.\"",
    "",
    "\"This is an intelligence engagement. You know the phrase 'person of",
    "interest'. You've heard it before. It means the client wants them found.",
    "What happens after the finding is not your department.\"",
    "",
    "She slides three things across the desk:",
    "  — a fresh ID card, registered with your alias and stated profession,",
    "  — a datapad, pre-loaded with the brief, a room reservation, and a notepad,",
    "  — travel: shuttle to liner docking, liner to a Horizon connection.",
    "",
    "\"Credits are loaded on the card. Tap it to the datapad if you want to check",
    "your balance.\"",
    "",
    "She pauses, very briefly. Then, pleasantly:",
    "",
    "\"The client values discretion. I'd extend that value to yourself, if I were",
    "you.\"",
    "",
    "She has already half-turned back to her screen.",
];
const POST_BRIEFING_OPENER = [
    "\"Safe travels.\"",
    "She has already looked back at her screen.",
];
const missTerry = {
    id: "miss_terry",
    name: "Miss Terry",
    aliases: ["terry", "miss terry", "handler", "woman", "contact"],
    description: "Efficient is the word. Not cold — there is a dry intelligence in her " +
        "manner that is almost warm, in the way that a well-made tool can feel " +
        "almost warm. She has clearly done this before and has no intention of " +
        "making it dramatic.",
    onTalk: (s) => {
        score(s, HOOK_TALKED_TERRY);
        if (s.flags[FLAG_BRIEFING_COMPLETE])
            return POST_BRIEFING_OPENER;
        deliverBriefing(s);
        return BRIEFING_LINES;
    },
    topics: aliasedTopics([
        [["client", "employer", "who"],
            "\"The client values discretion. That's all I have for you.\""],
        [["target", "jackrabbit", "rabbit"],
            "\"Male. Known links to Horizon Outpost. That's the brief.\""],
        [["horizon", "outpost", "why horizon"],
            "\"Last credible intelligence. Beyond that, it's your job to find out.\""],
        [["after", "what happens", "then what"],
            "(A pause.) \"You deliver intelligence. That's the scope of your engagement.\""],
        [["money", "fee", "credits", "payment", "escrow"],
            "\"In escrow. Released on delivery of actionable intelligence, as I assess it.\""],
        [["person of interest", "interest"], (s) => {
                score(s, HOOK_PERSON_OF_INTEREST);
                return "\"Standard terminology. I'm sure you're familiar with it.\"";
            }],
        [["discretion", "warning"],
            "She glances up, neutral. \"The advice stands.\""],
    ]),
    unknownTopic: "\"I've told you what I know. The rest is the job.\"",
};
export const npcs = { miss_terry: missTerry };
// Exported for the office room and engine tests.
export { BRIEFING_LINES, POST_BRIEFING_OPENER };
