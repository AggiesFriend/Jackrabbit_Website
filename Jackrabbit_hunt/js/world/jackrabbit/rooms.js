// Rooms for the Halberd pre-Horizon sequence.
// Spec: jackrabbit-pre-horizon-design.md §3.
import { requestPushModal } from "../../engine/authoring.js";
import { makeCharacterCreationModal } from "./character-creation.js";
import { FLAG_BRIEFING_COMPLETE, FLAG_FORM_COMPLETE } from "./flags.js";
const halberdLobby = {
    id: "halberd_lobby",
    name: "Halberd Recovery Services — Lobby",
    description: (s) => s.flags[FLAG_FORM_COMPLETE]
        ? "The waiting room is much as you left it. The datapad on the table " +
            "has gone to standby; the reception terminal still glows blandly. " +
            "A door to the north leads to the inner offices."
        : "A waiting room designed to communicate nothing about the people who " +
            "use it. Neutral upholstery, a low table, frosted glass panels " +
            "obscuring whatever lies beyond. A reception terminal stands unmanned " +
            "against one wall.\n\n" +
            "On the table, a datapad is already active, the registration form open " +
            "and waiting. Nothing here is going to happen until you've dealt with it. " +
            "The frosted-glass door to the north stays shut until you do.",
    exits: {
        north: {
            to: "halberd_office",
            gated: (s) => s.flags[FLAG_FORM_COMPLETE]
                ? null
                : "The door stays shut. Deal with the registration form on the table first.",
            // Don't advertise the door until the form is done — the form is the
            // only thing the player can act on at the start.
            hideWhenGated: true,
        },
        // Door to the transfer shuttle. Hidden from the exit list until Miss
        // Terry's briefing has happened — no point teasing a door the player
        // can't use yet — but still traversable the moment it opens.
        out: {
            to: "shuttle1_cabin",
            gated: (s) => s.flags[FLAG_BRIEFING_COMPLETE]
                ? null
                : "Your business here isn't finished yet.",
            hideWhenGated: true,
            description: "to the transfer shuttle",
        },
    },
    items: ["form_datapad", "terminal"],
    npcs: [],
    onEnter: (s) => {
        // First entry: present the registration form. Re-entries (post-form)
        // do nothing — the player is free to walk around.
        if (!s.flags[FLAG_FORM_COMPLETE]) {
            requestPushModal(s, makeCharacterCreationModal());
        }
    },
};
const halberdOffice = {
    id: "halberd_office",
    name: "Halberd Recovery Services — Miss Terry's Office",
    description: (s) => s.flags[FLAG_BRIEFING_COMPLETE]
        ? "Miss Terry is at her desk. There is nothing left to discuss here."
        : "Small, tidy, functional. A desk with two chairs. A screen on the wall " +
            "showing nothing of interest. Miss Terry is behind the desk, watching " +
            "you with the expression of someone who has already assessed you and " +
            "moved on to the next problem.",
    exits: {
        south: { to: "halberd_lobby" },
    },
    items: [],
    npcs: ["miss_terry"],
};
export const rooms = {
    halberd_lobby: halberdLobby,
    halberd_office: halberdOffice,
};
