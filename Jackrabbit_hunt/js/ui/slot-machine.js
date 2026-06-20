// The animated slot-machine popup — an utterly incongruous, gloriously over-the-
// top reel spin for a TEXT adventure. (Yes, on purpose. For a laugh.)
//
// This is the second browser-coupled file after dom.ts. It listens for the
// `SLOT_SPIN_EVENT` that gambling.ts fires whenever the player works a Long Odds
// machine, and pops up a cabinet whose three reels actually spin and clatter to
// a stop on the faces the game already rolled. It is pure theatre: the outcome,
// the payout and the running balance were all decided in gambling.ts and printed
// to the transcript before this ever runs. Nothing here feeds back into the
// engine, so the game is fully playable (and fully tested) with this file ripped
// out — the popup just decorates the moment.
//
// Decoupling: the world dispatches a DOM CustomEvent; we listen. The only shared
// surface is the event name + payload type imported below — the world never
// imports the UI. Styles live in public/style.css under "slot machine".
import { SLOT_SPIN_EVENT } from "../world/jackrabbit/gambling.js";
// Engine face name -> the glyph shown on a reel. 7 and BAR stay as classic text
// tiles (styled via .slot-cell-text); the fruit/bell/star become emoji.
const GLYPH = {
    "7": "7",
    BAR: "BAR",
    CHERRY: "\u{1F352}", // 🍒
    BELL: "\u{1F514}", // 🔔
    PLUM: "\u{1F347}", // 🍇 (a purple fruit reads as a plum on a reel)
    STAR: "\u{2B50}", // ⭐
};
// The pool of faces the reels blur through on the way to their target.
const FILLER = ["CHERRY", "BELL", "PLUM", "STAR", "BAR", "7"];
// Short, punchy result labels for the cabinet readout (the long narrative line
// is already in the transcript — the popup stays snappy).
const LABEL = {
    jackpot: "★ JACKPOT ★",
    bars: "THREE BARS",
    triple: "THREE OF A KIND",
    pair: "A PAIR",
    cherry: "CHERRY — STAKE BACK",
    nothing: "NO WIN",
};
const FILLER_PER_REEL = 32; // cells the strip scrolls through before the target
let mounted = false;
// --- DOM handles (built once, lazily) ---
let overlay;
let cabinet;
const reels = [];
const strips = [];
let readoutLabel;
let readoutPay;
let readoutBalance;
let hint;
// --- per-spin state ---
let generation = 0; // invalidates stale animation callbacks
let phase = "idle";
let current = null;
const reelFinals = []; // final translateY distance per reel
/** Wire the popup up. Idempotent; call once at boot (main.ts). */
export function mountSlotMachine() {
    if (mounted || typeof document === "undefined")
        return;
    mounted = true;
    document.addEventListener(SLOT_SPIN_EVENT, (e) => open(e.detail));
}
function ensureDom() {
    if (overlay)
        return;
    overlay = el("div", "slot-overlay");
    overlay.hidden = true;
    overlay.tabIndex = -1;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Slot machine");
    cabinet = el("div", "slot-cabinet");
    const marquee = el("div", "slot-marquee");
    marquee.textContent = "THE LONG ODDS";
    cabinet.appendChild(marquee);
    const reelRow = el("div", "slot-reels");
    for (let i = 0; i < 3; i++) {
        const reel = el("div", "slot-reel");
        const strip = el("div", "slot-strip");
        reel.appendChild(strip);
        reelRow.appendChild(reel);
        reels.push(reel);
        strips.push(strip);
    }
    cabinet.appendChild(reelRow);
    cabinet.appendChild(el("div", "slot-payline"));
    const readout = el("div", "slot-readout");
    readoutLabel = el("div", "slot-result");
    readoutPay = el("div", "slot-pay");
    readoutBalance = el("div", "slot-balance");
    readout.append(readoutLabel, readoutPay, readoutBalance);
    cabinet.appendChild(readout);
    hint = el("div", "slot-hint");
    cabinet.appendChild(hint);
    overlay.appendChild(cabinet);
    document.body.appendChild(overlay);
    // A click anywhere skips the spin / dismisses once revealed.
    overlay.addEventListener("click", interact);
    // Swallow keys while the popup is up so a press doesn't leak to the game's
    // input; the first press skips, the next dismisses.
    document.addEventListener("keydown", (e) => {
        if (overlay.hidden)
            return;
        e.preventDefault();
        e.stopPropagation();
        interact();
    }, true);
}
function open(detail) {
    ensureDom();
    current = detail;
    const myGen = ++generation;
    phase = "spinning";
    cabinet.classList.remove("win", "jackpot");
    readoutLabel.textContent = "";
    readoutPay.textContent = "";
    readoutBalance.textContent = "";
    hint.textContent = "";
    overlay.hidden = false;
    overlay.focus();
    const reduce = prefersReducedMotion();
    let stopped = 0;
    detail.symbols.forEach((face, i) => {
        const strip = strips[i];
        const reel = reels[i];
        if (reduce) {
            // No motion: just present the final face.
            strip.replaceChildren(cellEl(face));
            strip.style.transition = "none";
            strip.style.transform = "translateY(0)";
            reelFinals[i] = 0;
            return;
        }
        // Build a tall strip of filler faces ending on the target, then scroll to it.
        const cells = [];
        for (let k = 0; k < FILLER_PER_REEL; k++)
            cells.push(cellEl(rnd(FILLER)));
        cells.push(cellEl(face));
        strip.replaceChildren(...cells);
        strip.style.transition = "none";
        strip.style.transform = "translateY(0)";
        void strip.offsetHeight; // force reflow so the reset transform takes
        const distance = strip.scrollHeight - reel.clientHeight; // land target in the window
        reelFinals[i] = distance;
        reel.classList.add("slot-reel-spinning");
        const duration = 1200 + i * 500 + Math.random() * 150; // staggered, left-to-right
        requestAnimationFrame(() => {
            if (myGen !== generation)
                return;
            strip.style.transition = `transform ${duration}ms cubic-bezier(0.1, 0.6, 0.15, 1)`;
            strip.style.transform = `translateY(${-distance}px)`;
        });
        const onEnd = (ev) => {
            if (ev.propertyName !== "transform")
                return;
            strip.removeEventListener("transitionend", onEnd);
            reel.classList.remove("slot-reel-spinning");
            if (myGen !== generation)
                return;
            if (++stopped === 3)
                reveal(myGen);
        };
        strip.addEventListener("transitionend", onEnd);
    });
    if (reduce) {
        window.setTimeout(() => reveal(myGen), 220);
    }
}
/** Snap every reel to its final face (used on skip, and to guarantee exactness). */
function snapToFinal() {
    if (!current)
        return;
    current.symbols.forEach((_, i) => {
        const strip = strips[i];
        strip.style.transition = "none";
        strip.style.transform = `translateY(${-(reelFinals[i] ?? 0)}px)`;
        reels[i].classList.remove("slot-reel-spinning");
    });
}
function reveal(myGen) {
    if (myGen !== generation || phase === "revealed" || !current)
        return;
    phase = "revealed";
    snapToFinal();
    const d = current;
    readoutLabel.textContent = LABEL[d.key] ?? "";
    if (d.win > 0) {
        cabinet.classList.add("win");
        readoutPay.textContent = `+${d.win} cr`;
    }
    else {
        readoutPay.textContent = `−${d.stake} cr`; // −50 cr
    }
    if (d.key === "jackpot")
        cabinet.classList.add("jackpot");
    readoutBalance.textContent = `Balance: ${d.balance} cr`;
    hint.textContent = "click or press any key to continue";
}
function close() {
    overlay.hidden = true;
    phase = "idle";
    generation++; // invalidate any stragglers
    document.getElementById("input")?.focus();
}
/** First interaction skips a running spin to the result; the next dismisses. */
function interact() {
    if (phase === "spinning") {
        snapToFinal();
        reveal(generation);
    }
    else if (phase === "revealed") {
        close();
    }
}
// --- small helpers ---
function el(tag, className) {
    const node = document.createElement(tag);
    node.className = className;
    return node;
}
function cellEl(face) {
    const node = el("div", "slot-cell");
    if (face === "7" || face === "BAR")
        node.classList.add("slot-cell-text");
    if (face === "7")
        node.classList.add("slot-cell-seven");
    node.textContent = GLYPH[face] ?? face;
    return node;
}
function rnd(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function prefersReducedMotion() {
    return typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
