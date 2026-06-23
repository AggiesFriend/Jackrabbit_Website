// B4a — the predecessor thread. An investigator was sent before the PC and
// vanished. He stashed his kit behind a loose access panel in the dockside
// lavatory and never came back for it. Finding it gives:
//   - a weathered datapad that is the SAME MODEL as the PC's own (the quiet
//     leash foreshadow — never spelled out);
//   - his diary (dated weeks ago): why he hid his kit, and a lead to a bar in
//     the entertainment district + a name, Drayton — with the entries ending
//     abruptly (sinister foreshadow of the Chas scene to come);
//   - a saved remote login for the Horizon shipyard records terminal, plus a
//     name (Sophie) — banked for the (unbuilt) Shipyard route.
//
// His contract brief stays LOCKED for now: the "he was doing your exact job"
// realisation is a deliberately later reveal (plot §2 / TODO B4a).
//
// NOTE: the bar is named here "the Long Shot" so the future Chas scene (B4b)
// can match it — see TODO.
import { placeItemInRoom, takeItemToInventory } from "../../engine/items.js";
import { addNote } from "../../engine/notes.js";
import { score } from "./scoring.js";
import { TERMINAL_IDS } from "./analysis.js";
import { accessRecordsViaCreds } from "./records.js";
import { FLAG_CUBBYHOLE_OPEN, FLAG_SHIPYARD_CREDS, FLAG_BRIEF_UNLOCKED, HOOK_FOUND_PREDECESSOR, HOOK_READ_PREDECESSOR_DIARY, HOOK_FOUND_SHIPYARD_CREDS, HOOK_PREDECESSOR_SAME_JOB, } from "./flags.js";
const LAVATORY = "horizon_unisex_lavatory";
const KIT_IDS = ["predecessor_datapad", "predecessor_brief", "predecessor_diary", "predecessor_creds"];
// --- The discovery -------------------------------------------------------
function openCubbyhole(s) {
    if (s.flags[FLAG_CUBBYHOLE_OPEN]) {
        return "The panel's already off. The compartment behind it is empty now — you took what was in it.";
    }
    s.flags[FLAG_CUBBYHOLE_OPEN] = true;
    for (const id of KIT_IDS)
        placeItemInRoom(s, id, LAVATORY);
    placeItemInRoom(s, "predecessor_wallet", LAVATORY); // atmosphere; stays in the room
    score(s, HOOK_FOUND_PREDECESSOR);
    addNote(s, {
        id: "predecessor_kit",
        source: "You",
        text: "Someone came before me — a contractor, by his kit — who hid his gear behind a panel in a "
            + "dockside lavatory and never came back for it. His datapad is the same model as mine. His "
            + "notes stop weeks ago.",
    });
    return [
        "The panel lifts away with a faint reluctance, the long-loosened screws barely biting, to reveal a "
            + "shallow compartment hollowed into the wall cavity behind it.",
        "Inside, tucked out of sight, is a small kit bag: a change of clothes, a few personal effects, some "
            + "long-stale ration packs — and a datapad. You ease it out.",
        "Something cool goes down your spine. It is exactly the same model as your own, down to the worn "
            + "patch where a thumb rests. Whoever stashed this meant to come back for it. The dust says they didn't.",
    ];
}
// --- The lavatory access panel (scenery, lives in the lavatory) ----------
export const lavatoryPanel = {
    id: "lavatory_panel",
    name: "access panel",
    aliases: ["panel", "access panel", "wall panel", "plate", "cover", "hatch"],
    description: (s) => s.flags[FLAG_CUBBYHOLE_OPEN]
        ? "The access panel hangs off the wall, the shallow compartment behind it open and — now — empty."
        : "A dull grey access panel low on the wall behind the far cubicle, the kind nobody gives a second "
            + "glance. Look closely, though, and one corner sits slightly proud of the wall: the paint is "
            + "scuffed around two screws that have plainly been out more than once. You could probably prise it open.",
    takeable: false,
    onOpen: (s) => openCubbyhole(s),
    onPush: (s) => openCubbyhole(s),
};
// --- The predecessor's kit ----------------------------------------------
const predecessorDatapad = {
    id: "predecessor_datapad",
    name: "weathered datapad",
    aliases: ["weathered datapad", "his datapad", "old datapad", "other datapad", "predecessor's datapad", "weathered"],
    description: (s) => "A weathered datapad, scuffed and dulled with handling — and unsettlingly familiar: the same model as "
        + "the one you carry, down to the worn patch where a thumb rests.\n\n"
        + (s.flags[FLAG_BRIEF_UNLOCKED]
            ? "The lock's down now — you woke it with its twin. His contract brief and his personal diary are "
                + "open, alongside a saved login. You can READ HIS BRIEF, READ HIS DIARY, or READ HIS CREDENTIALS."
            : "Its lock screen shows the usual courtesy notice — PROPERTY OF JOHN SMITH; IF FOUND, RETURN TO "
                + "ISSUER. Beyond that, the device is locked and whatever it holds is sealed behind the cipher — "
                + "there's no telling what's on it without cracking the 'pad open first."),
    takeable: true,
    // Carry the (hidden) sub-documents along when the datapad is pocketed, so they
    // stay readable after the PC leaves the lavatory.
    onTake: (s) => {
        for (const id of ["predecessor_brief", "predecessor_diary", "predecessor_creds"]) {
            takeItemToInventory(s, id);
        }
    },
    // The failsafe: the PC's own (identical, same-outfit) datapad can wake this one
    // and crack the sealed brief. Works either order — see the PC datapad in items.ts.
    onUseWith: {
        datapad: (s) => unlockBrief(s),
    },
};
// The dead man's kit bag — atmosphere only (no score). Revealed in the lavatory
// when the panel comes off; stays in the room (you've already eased the datapad
// out of it). Named to match the discovery narration ("a small kit bag").
const predecessorWallet = {
    id: "predecessor_wallet",
    name: "kit bag",
    aliases: ["kit bag", "bag", "kit", "his kit", "document wallet", "wallet", "clothes", "effects", "personal effects", "rations", "ration packs"],
    description: "His kit bag, light and half-empty now you've eased the datapad out of it: a change of clothes folded "
        + "with a tidiness that outlived him, a few small personal effects, some long-stale ration packs, and a "
        + "flat document wallet worn soft at the corners — built to hold the 'pad and not much else. Whoever he "
        + "was, he travelled light, and he didn't expect to be parted from any of it for long.",
    takeable: false,
};
/** The sealed brief's failsafe unlock (USE datapad ON datapad, either order).
 *  Requires both 'pads IN HAND — his has been dormant for weeks, far past the
 *  seven-day failsafe window. Scores predecessor_same_job; the brief does NOT
 *  name the paymaster (Strand 2 keeps that). */
export function unlockBrief(s) {
    if (!s.inventory.includes("predecessor_datapad")) {
        return "You'd need his datapad in hand for that — the failsafe wants the two units held back to back.";
    }
    if (s.flags[FLAG_BRIEF_UNLOCKED]) {
        return "The brief's already open: the same paymaster-shaped blank as your own, the same target, his "
            + "dates older than yours. You were the replacement.";
    }
    s.flags[FLAG_BRIEF_UNLOCKED] = true;
    score(s, HOOK_PREDECESSOR_SAME_JOB);
    addNote(s, {
        id: "predecessor_brief_unlocked",
        source: "His contract brief",
        text: "His brief is near enough a copy of mine: same hidden paymaster, same target, only the dates "
            + "differ — and his are older. He was sent first. I'm the one they sent when he stopped reporting in.",
    });
    return [
        "You hold the two units back to back. For a moment, nothing — then your own 'pad recognises its twin, "
            + "the way they're built to, and the dormant one yields. The cipher folds away. His contract brief "
            + "opens — and his diary with it; the whole device lies open to you now.",
        "It's a contract brief, and it's near enough a copy of your own: the same paymaster hidden behind the "
            + "same blank shell, the same target, the same careful absence where a reason ought to be. Only the "
            + "dates differ. His is older than yours. He was sent first — and you are the one they sent when the "
            + "first one stopped reporting in.",
        "You are holding a dead man's datapad, woken by its twin, and the twin is yours.",
    ];
}
const predecessorBrief = {
    id: "predecessor_brief",
    name: "his contract brief",
    aliases: ["his brief", "his contract", "locked brief", "sealed brief", "his engagement"],
    description: (s) => s.flags[FLAG_BRIEF_UNLOCKED]
        ? [
            "HALBERD RECOVERY SERVICES — ENGAGEMENT SUMMARY (his)",
            "",
            "Near-identical to your own: the same target, the same paymaster hidden behind the same blank "
                + "shell, the same careful absence where a reason ought to be. Only the dates differ — and his "
                + "are older than yours. He was sent first; you were sent when he stopped reporting in.",
        ].join("\n")
        : "The last document won't open. You can tell it's a contract brief — the header bar, the redaction "
            + "blocks, the shape of it — but it's sealed behind a corporate cipher: the same flavour of lock "
            + "that sits on your own contract.\n\n"
            + "Then you remember the failsafe. These units all have it: leave one dormant long enough — a week, "
            + "the manual says — and an identical 'pad, registered to the same outfit, can wake it where its "
            + "owner no longer can. His has been dark a great deal longer than a week. And the twin of it is in "
            + "your hand.",
    takeable: true,
    hidden: true,
    // Examining the sealed brief notes the failsafe lead (once, before it's cracked).
    onExamine: (s) => {
        if (!s.flags[FLAG_BRIEF_UNLOCKED]) {
            addNote(s, {
                id: "predecessor_brief_locked",
                source: "His datapad",
                text: "His contract brief is sealed behind a corporate cipher — but these units have a failsafe: a "
                    + "'pad left dormant a week can be woken by an identical one registered to the same outfit, and "
                    + "his has been dark far longer than that. Mine is the twin of it.",
            });
        }
    },
};
const predecessorDiary = {
    id: "predecessor_diary",
    name: "his diary",
    aliases: ["his diary", "diary", "his notepad", "his notes", "his journal"],
    description: (s) => {
        // His diary lives behind the device lock, same as the brief — only the saved
        // login sits outside it. Readable only once the 'pad is cracked (the failsafe).
        if (!s.flags[FLAG_BRIEF_UNLOCKED]) {
            return "His diary won't open — sealed behind the same device lock as the contract brief. You'll not "
                + "read it until you've cracked the 'pad.";
        }
        score(s, HOOK_READ_PREDECESSOR_DIARY);
        addNote(s, {
            id: "predecessor_bar_lead",
            source: "His diary",
            text: "The predecessor's last lead was a man called Drayton — bitter, hated the boy — who drinks "
                + "at the Long Shot, a bar in the entertainment district, after dark. The diary ends the night "
                + "he went to meet him.",
        });
        return [
            "[The entries are dated some three weeks before you landed.]",
            "",
            "— Settled in. The target's an open secret and a closed door: everyone's heard the name, nobody'll "
                + "say a word. Polite about it, which is somehow worse. Early days.",
            "",
            "— Slow going. This place looks after its own. The boy was well liked — quiet, regular habits, an "
                + "apricot-jam thing at the sandwich counter, of all the details to get freely. Nothing that matters, though.",
            "",
            "— Getting the distinct feeling I'm not the first to come asking after him. Can't say why. Being "
                + "careful from here: keeping my kit off-body. There's a loose panel in the dock-end lavatory that'll "
                + "do — nobody looks at it twice. Better safe.",
            "",
            "— Finally, a real thread. Everyone who actually knew the boy points the same way: a man named "
                + "Drayton. Bitter type, by all accounts — couldn't stand the kid. Drinks at the Long Shot, over in "
                + "the entertainment district. If anyone'll talk out of spite, it's him. After dark only; it's not a "
                + "daytime sort of place. Stashing the kit here on my way; going tonight.",
            "",
            "[The entry ends there. There are no further entries.]",
        ].join("\n");
    },
    takeable: true,
    hidden: true,
};
const predecessorCreds = {
    id: "predecessor_creds",
    name: "his saved login",
    aliases: ["his credentials", "his login", "credentials", "saved login", "login", "creds"],
    description: (s) => {
        // Sealed behind the device lock with the rest — readable only once cracked.
        if (!s.flags[FLAG_BRIEF_UNLOCKED]) {
            return "His saved login won't open — sealed behind the same device lock as the brief and the diary. "
                + "You'll not read it until you've cracked the 'pad.";
        }
        s.flags[FLAG_SHIPYARD_CREDS] = true; // bank it for the Shipyard records route
        score(s, HOOK_FOUND_SHIPYARD_CREDS);
        addNote(s, {
            id: "shipyard_creds",
            source: "His datapad",
            text: "Found a remote login for the Horizon shipyard records terminal among his effects — and a "
                + "name: Sophie, who keeps the records.",
        });
        return [
            "SAVED LOGIN — Horizon Shipyard, remote records terminal",
            "  username:  g.almeida.contract",
            "  password:  Kestrel-4471",
            "",
            "Note to self: Sophie runs the records desk. She won't hand these over and won't like being asked —",
            "but the remote terminal doesn't care who's asking.",
        ].join("\n");
    },
    takeable: true,
    hidden: true,
    // USE HIS CREDENTIALS ON <terminal> logs into the shipyard records (= ACCESS RECORDS).
    onUseWith: Object.fromEntries(TERMINAL_IDS.map((id) => [id, (s) => accessRecordsViaCreds(s)])),
};
export const predecessorItems = {
    lavatory_panel: lavatoryPanel,
    predecessor_datapad: predecessorDatapad,
    predecessor_wallet: predecessorWallet,
    predecessor_brief: predecessorBrief,
    predecessor_diary: predecessorDiary,
    predecessor_creds: predecessorCreds,
};
