// Gambling — the slot machines in EZ1's gaming house (The Long Odds). A small,
// self-contained mischief-colour mechanic: feed a machine 50 credits a spin,
// watch the reels blur, win or (far more often) lose.
//
// The house edge is real and deliberate — the expected return on a spin is well
// under the stake (see OUTCOMES) — but a rare jackpot keeps it tempting. This is
// pure colour: NO plot impact, NO death, NO scoring. Just the familiar, slow
// pleasure of giving a machine your money.
//
// Built on the shared credit economy (economy.ts): charge() debits the stake and
// credit() pays a win back. charge() now refuses below zero on its own, but the
// buy-in is still guarded here for the characterful "you're short" refusal and to
// gate the whole spin (mirroring every other paid transaction on the station).
import { balance, charge, canAfford, credit } from "./economy.js";
/** The room the machines live in — EZ1's gaming house. */
export const CASINO_ROOM = "ez1_long_odds";
/** Credits per spin. The machines' own label: LOAD 50 TO PLAY. */
export const SPIN_STAKE = 50;
const OUTCOMES = [
    {
        key: "jackpot", p: 0.008, pays: 1000,
        faces: () => ["7", "7", "7"],
        line: "JACKPOT. Lights strobe, a klaxon whoops, and three machines down someone " +
            "actually applauds. The reader sings as 1000 credits cascade onto your ID — and, " +
            "behind the smiles, a manager makes a quiet note of your face.",
    },
    {
        key: "bars", p: 0.035, pays: 250,
        faces: () => ["BAR", "BAR", "BAR"],
        line: "Three bars — a proper win. The machine trills and pays 250 credits. The staff " +
            "keep smiling; they can afford to.",
    },
    {
        key: "triple", p: 0.05, pays: 150,
        faces: () => tripleFaces(),
        line: "Three of a kind. 150 credits clatter home in a run of bright little chimes. Not bad at all.",
    },
    {
        key: "pair", p: 0.11, pays: 75,
        faces: () => pairFaces(),
        line: "Two of a kind — a small win, 75 credits, exactly the size engineered to keep you " +
            "sitting here. Which is, of course, the entire idea.",
    },
    {
        key: "cherry", p: 0.12, pays: SPIN_STAKE,
        faces: () => cherryFaces(),
        line: "A single cherry. The machine hands your 50 credits straight back — a consolation " +
            "tuned to feel like not-quite-losing, so you'll feed it the same fifty again.",
    },
    {
        key: "nothing", p: 0.677, pays: 0,
        faces: () => nothingFaces(),
        line: "Nothing. The reels settle on three strangers, the machine chirps its bright little " +
            "condolence, and your 50 credits are simply, cheerfully gone.",
    },
];
/** Select an outcome from a uniform roll in [0, 1) by cumulative weight. */
export function rollOutcome(r) {
    let acc = 0;
    for (const o of OUTCOMES) {
        acc += o.p;
        if (r < acc)
            return o;
    }
    return OUTCOMES[OUTCOMES.length - 1];
}
// --- reel rendering (cosmetic) -------------------------------------------
const MINOR = ["CHERRY", "BELL", "PLUM", "STAR"]; // generic faces (7 + BAR are reserved for the top lines)
const NON_CHERRY = ["BELL", "PLUM", "STAR", "BAR", "7"];
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
/** Centre a face in a fixed-width cell so the readout lines up like a machine. */
function cell(s) {
    const w = 6;
    const pad = Math.max(0, w - s.length);
    const left = Math.floor(pad / 2);
    return " ".repeat(left) + s + " ".repeat(pad - left);
}
/** Render a set of faces as the fixed-width ASCII readout (the transcript /
 *  headless rendering; the animated popup performs the same faces visually). */
function formatReels(f) {
    return `      [ ${cell(f[0])} | ${cell(f[1])} | ${cell(f[2])} ]`;
}
function tripleFaces() { const s = rnd(MINOR); return [s, s, s]; }
function pairFaces() {
    const s = rnd(MINOR);
    let t = rnd(NON_CHERRY);
    for (let g = 0; t === s && g < 10; g++)
        t = rnd(NON_CHERRY);
    return [s, s, t];
}
function cherryFaces() {
    const a = rnd(NON_CHERRY);
    let b = rnd(NON_CHERRY);
    for (let g = 0; b === a && g < 10; g++)
        b = rnd(NON_CHERRY);
    return ["CHERRY", a, b];
}
function nothingFaces() {
    const a = rnd(NON_CHERRY);
    let b = rnd(NON_CHERRY);
    for (let g = 0; b === a && g < 20; g++)
        b = rnd(NON_CHERRY);
    let c = rnd(NON_CHERRY);
    for (let g = 0; (c === a || c === b) && g < 20; g++)
        c = rnd(NON_CHERRY);
    return [a, b, c];
}
// --- animated-popup bridge (browser only) --------------------------------
// The UI layer (src/ui/slot-machine.ts) listens for this DOM event and pops up
// an (utterly incongruous, gloriously over-the-top) animated reel spin. It is
// PURE cosmetic theatre: the outcome is already decided and already printed to
// the transcript below — the popup just performs it. The world and the UI stay
// decoupled through this documented DOM-event contract, so the world never
// imports the UI and the headless tests (which never touch the DOM) are wholly
// unaffected — the guard below is a no-op under Node.
/** Event name on `document` carrying a `SlotSpinDetail`. */
export const SLOT_SPIN_EVENT = "jackrabbit:slot-spin";
function announceSpin(detail) {
    if (typeof document === "undefined")
        return; // headless / Node: nothing to show
    document.dispatchEvent(new CustomEvent(SLOT_SPIN_EVENT, { detail }));
}
// --- the command ---------------------------------------------------------
/** PLAY / GAMBLE / BET / SPIN / SLOT — a single 50-credit spin at a Long Odds
 *  machine. Only works in the casino; guards the buy-in; rolls and pays out. */
export const gambleCmd = (_w, s, cmd) => {
    if (s.currentRoom !== CASINO_ROOM) {
        return {
            handled: true, tickCost: 0, free: true,
            output: ["There's nothing here to play. The machines are over in The Long Odds, " +
                    "the gaming house in Entertainment Zone 1."],
        };
    }
    if (!s.inventory.includes("fake_id")) {
        return {
            handled: true, tickCost: 0, free: true,
            output: ["The machines take payment by ID scan, and you've no ID card to feed them."],
        };
    }
    const bal = balance(s);
    if (!canAfford(s, SPIN_STAKE)) {
        return {
            handled: true, tickCost: 0, free: true,
            output: [`A spin is ${SPIN_STAKE} credits and you have ${bal}. The machine flashes an ` +
                    `unsympathetic LOAD ${SPIN_STAKE} TO PLAY and waits. The house does not extend credit.`],
        };
    }
    charge(s, SPIN_STAKE); // load the stake
    const o = rollOutcome(Math.random()); // FIRST roll fixes the outcome (the reels are cosmetic)
    if (o.pays > 0)
        credit(s, o.pays);
    const faces = o.faces(); // roll the cosmetic faces once...
    const after = balance(s);
    // ...and let the browser perform them in an animated popup (no-op headless).
    announceSpin({ symbols: faces, stake: SPIN_STAKE, win: o.pays, key: o.key, line: o.line, balance: after });
    return {
        handled: true, tickCost: 1,
        output: [
            `You scan your ID — ${SPIN_STAKE} credits gone — and the reels blur into a streak of light...`,
            formatReels(faces),
            o.line,
            `(Balance: ${after} credits.)`,
        ],
    };
};
/** LOAD route — overloaded. In the casino, `LOAD 50` / `LOAD MACHINE` plays a
 *  spin (players type what the machine's label tells them). The route matches
 *  ONLY there, and only for machine-ish nouns; everything else — `load game`,
 *  `load datacard`, a bare `LOAD` to restore a save — falls through to the real
 *  load handler (index.ts wires loadInsertCmd as the fallback), so save-restore
 *  and the resistance-datacard prohibition are untouched. (PLAY/SPIN/GAMBLE cover
 *  the no-noun spin.) */
export const casinoLoadRoute = {
    match: (s, cmd) => {
        const noun = (cmd.noun ?? "").trim().toLowerCase();
        return (s.currentRoom === CASINO_ROOM &&
            /^(machine|machines|slot|slots|reel|reels|fifty|stake|50)\b|credit/.test(noun));
    },
    handler: gambleCmd,
};
/** Verb bindings for index.ts. (LOAD is wired separately via casinoLoadRoute so
 *  it can still reach save-restore and the datacard prohibition.) */
export const gamblingCommands = {
    play: gambleCmd,
    gamble: gambleCmd,
    bet: gambleCmd,
    spin: gambleCmd,
    slot: gambleCmd,
    slots: gambleCmd,
};
