// MVP test world. Throwaway content used only to validate the engine.
// Spec §4.13. NOT shipped in the final build.
//
// Contains:
//  - Three rooms (corridor, lab, observation deck).
//  - One takeable item with onExamine.
//  - One NPC with two topics.
//  - One scoring hook (first examination of the item).
//  - One travel-tube-style exit (3 ticks).
//  - One death state (an unsealed airlock).
//  - One day/night gate (a door open only at night).
import { awardScore } from "../engine/scoring.js";
export const testWorld = {
    title: "Engine Test World",
    startRoom: "corridor",
    maxScore: 10,
    initialState: {
        dayLength: 20, // short for testing day/night
        isDaytime: true,
    },
    openingText: "ENGINE TEST WORLD\n" +
        "A throwaway world that exists to prove the engine works. Try LOOK, TAKE BADGE,\n" +
        "TAKE ALL, EXAMINE BADGE, TALK TO TECHNICIAN, ASK TECHNICIAN ABOUT BADGE,\n" +
        "GO NORTH, GO EAST, WAIT UNTIL NIGHT, GO DOWN, SAVE, LOAD, RESTART.",
    helpText: "Try: look, examine <thing>, take <thing>, inventory, talk to <npc>,\n" +
        "ask <npc> about <topic>, n/s/e/w/up/down, wait, wait until night, save,\n" +
        "load, restart, score, time, notes, help, quit.",
    rankFromScore: (score, max) => {
        if (score === 0)
            return "Bystander";
        if (score < max * 0.5)
            return "Curious Visitor";
        if (score < max)
            return "Diligent Tester";
        return "Engine Validator, First Class";
    },
    rooms: {
        corridor: {
            id: "corridor",
            name: "Service Corridor",
            description: "A narrow service corridor with humming conduits along the ceiling. " +
                "Doors lead off in several directions; a heavy bulkhead seals one wall.",
            exits: {
                north: { to: "lab", description: "into a small lab" },
                east: {
                    to: "observation",
                    ticks: 3,
                    description: "via the travel tube (3 ticks)",
                },
                down: {
                    to: "vacuum",
                    description: "into an unsealed airlock",
                },
                south: {
                    to: "vault",
                    description: "through a heavy bulkhead",
                    gated: (s) => s.isDaytime
                        ? "The bulkhead is sealed. A panel reads: NIGHT CYCLE ONLY."
                        : null,
                },
            },
            items: [],
            npcs: [],
        },
        lab: {
            id: "lab",
            name: "Small Lab",
            description: "Workbenches strewn with tools and the residue of unfinished projects. " +
                "A technician in oil-stained coveralls glances up at you.",
            exits: {
                south: { to: "corridor" },
            },
            items: ["badge", "spanner", "workbench"],
            npcs: ["technician"],
        },
        observation: {
            id: "observation",
            name: "Observation Deck",
            description: "A curved transparent wall onto the dark. Stars wheel slowly with the station's rotation. " +
                "There is nothing to do here but look.",
            exits: {
                west: { to: "corridor", ticks: 3, description: "via the travel tube (3 ticks)" },
            },
            items: [],
            npcs: [],
        },
        vault: {
            id: "vault",
            name: "Sealed Vault",
            description: "A spartan chamber the size of a cupboard. The bulkhead clicks shut behind you. " +
                "There is nothing here but the faint smell of ozone.",
            exits: {
                north: { to: "corridor" },
            },
            items: [],
            npcs: [],
        },
        vacuum: {
            id: "vacuum",
            name: "Unsealed Airlock",
            description: "The outer door is open. Your ears pop. You have a moment to regret your choices.",
            exits: {},
            items: [],
            npcs: [],
            onEnter: (s) => {
                s.dead = true;
                s.deathReason =
                    "The outer airlock door was open. You are ejected into vacuum. " +
                        "The station continues its rotation, unconcerned.";
            },
        },
    },
    items: {
        badge: {
            id: "badge",
            name: "ID badge",
            aliases: ["badge", "id", "identification"],
            description: "A standard staff ID badge. The photo is of someone who probably doesn't work here any more.",
            takeable: true,
            onExamine: (s) => {
                awardScore(s, "examined_badge", 5);
            },
        },
        spanner: {
            id: "spanner",
            name: "adjustable spanner",
            aliases: ["spanner", "wrench", "tool"],
            description: "A cheap adjustable spanner. The jaws are slightly worn.",
            takeable: true,
            // Using the spanner on the workbench unbolts it from the deck.
            onUseWith: {
                workbench: (s) => {
                    if (s.flags["workbench_detached"]) {
                        return "The workbench is already loose.";
                    }
                    s.flags["workbench_detached"] = true;
                    return ("You work the spanner around the deck bolts. After a minute they yield. " +
                        "The workbench shifts a fraction — you could push it now.");
                },
            },
        },
        workbench: {
            id: "workbench",
            name: "workbench",
            aliases: ["workbench", "bench", "table"],
            // Dynamic description tracks state.
            description: (s) => {
                if (!s.flags["workbench_detached"]) {
                    return "A heavy workbench, bolted to the deck plate. You aren't moving it.";
                }
                const n = s.flags["workbench_pushes"] ?? 0;
                if (n === 0) {
                    return "A heavy workbench. The deck bolts have been worked loose — it sits where it always has, but it's no longer fixed in place.";
                }
                return "A heavy workbench, sitting where you last shoved it. Faint scrape marks trail back to its original position on the deck.";
            },
            takeable: false,
            onPush: (s) => {
                if (!s.flags["workbench_detached"]) {
                    return "The workbench is bolted to the deck. It doesn't budge.";
                }
                const prev = s.flags["workbench_pushes"] ?? 0;
                s.flags["workbench_pushes"] = prev + 1;
                if (prev === 0) {
                    return "You shoulder the workbench across the deck. It slides with a low, satisfying grind.";
                }
                return "You shove the workbench a little further. Diminishing returns.";
            },
        },
    },
    npcs: {
        technician: {
            id: "technician",
            name: "Technician",
            aliases: ["technician", "tech", "engineer", "woman"],
            description: "A wiry technician with grease on her cheek and the look of someone who has been " +
                "on shift too long.",
            topics: {
                badge: "\"That badge? Belonged to whoever was here before me. Take it if you like.\"",
                bulkhead: "\"That bulkhead? Engineering protocol: it cycles open at night. " +
                    "Why? You'd have to ask the architects, and they're all dead.\"",
            },
            unknownTopic: "\"Couldn't tell you,\" she says, returning to her work.",
        },
    },
    endings: {
        // Triggered by the QUIT verb (the engine prefers a "quit" ending if defined).
        quit: {
            id: "quit",
            text: "You decide you've seen enough of the engine. You walk out into the corridor and keep walking.\n\n" +
                "For the world this engine is being built to serve, see [The Jackrabbit Series](https://www.jackrabbit-series.com/).",
            survived: true,
            closingText: "Somewhere, an accountant signs a routine portfolio review. Nothing about it concerns you. " +
                "The world goes on.",
        },
    },
};
