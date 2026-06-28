// Burke — the keystone NPC (Strands 2 & 3 hinge). Spec: reference/burke-final.md
// (Beats 1–2) + reference/burke-beat3-design.md (Beat 3, approved 13 Jun 2026).
// All three beats are built here.
//
// BEAT 3 — the gated pivot. Once Strand 2 is complete (FLAG_ANALYSIS_RESOLVED)
//   AND the predecessor's brief is cracked (FLAG_BRIEF_UNLOCKED), the next TALK
//   fires the pivot: Burke names AetherLink's "look after their own" PR, names
//   the dead predecessor (John Smith → Stuart McAlister), speaks the PC's REAL
//   name, then lays two roads. The choice is DIEGETIC (no menu): the PC commits
//   by what they ask next — `ask burke about leaving` (Flee → confirm modal →
//   the Flee ending) or `ask burke about the name` (Defect → the hedged
//   Rajah rumour; sets FLAG_DEFECTING + FLAG_BURKE_REFERRED_RAJAH). Defect is
//   IRREVERSIBLE — taking the name shuts the Flee road. The PC stays blind to
//   the endings throughout.
//
// Burke works the Industrial Sector at NIGHT ONLY — his workshop door is shut by
// day (gated in industrial.ts). Reached via Donovan's grey-market hint.
//
// BEAT 1 — TALK is a GREETING ONLY (the perceptive read + the offer to deal; no
//   charge, nothing about the boy). The Beat-1 TRANSACTION (the sliver of truth
//   re Jack, charged electronically — NO CASH EXISTS — plus the free Strand-2
//   nudge) fires only when the PC deliberately ASKS ABOUT THE JACKRABBIT.
//
// BEAT 2 — having had the PC's coin pass over his reader in Beat 1, Burke turns
//   the *routing* over and, A FULL DAY LATER, volunteers (on the next TALK) that
//   it was laundered with deliberate care. He does NOT know whose it is — only
//   that someone took great pains to hide it (he's seen the shape once before;
//   the predecessor connection stays off-screen). He then offers two ways on: an
//   extortionate, unaffordable bespoke TRACE, or — cheaper — the blockchain-
//   ANALYSIS SOFTWARE. Buying the software finally PLACES `burke_software` in the
//   world and hands off to the existing Strand-2 analysis (seed at a public
//   terminal → elapsed time → the name). Burke never names the paymaster: that
//   payoff stays the software's, to keep the deadline tension intact.
import { aliasedTopics, requestPushModal, requestSceneTransition } from "../../engine/authoring.js";
import { addNote } from "../../engine/notes.js";
import { takeItemToInventory } from "../../engine/items.js";
import { balance, charge, canAfford } from "./economy.js";
import { referRajahToResidence } from "./lcd_npcs.js";
import { FLAG_BURKE_MET, FLAG_BURKE_TRANSACTED, FLAG_BURKE_AWAITING_PAYMENT, FLAG_BURKE_TXN_TICK, FLAG_BURKE_BEAT2, FLAG_BURKE_SOFTWARE_PENDING, FLAG_BURKE_SOFTWARE_BOUGHT, FLAG_BURKE_PIVOT_DONE, FLAG_BURKE_REFERRED_RAJAH, FLAG_PC_REAL_NAME, FLAG_ANALYSIS_RESOLVED, FLAG_BRIEF_UNLOCKED, FLAG_DEFECTING, FLAG_FLEEING, FLAG_DEFECT_PATHWAY, HOOK_FIRST_BURKE, HOOK_BOUGHT_ANALYSIS_SOFTWARE, HOOK_BURKE_PIVOT, } from "./flags.js";
import { score } from "./scoring.js";
const WORKSHOP = "horizon_burke_s_workshop";
/** The corridor outside the workshop (its only exit; entry is day-gated there). */
const WORKSHOP_CORRIDOR = "horizon_narrow_corridor8";
/** Night-only enforcement. The workshop door is gated shut by day, but SLEEP/WAIT
 *  can roll the clock into daytime while the PC is still inside. When that happens,
 *  Burke ushers them out to the corridor — a night-only room shouldn't stay
 *  occupiable into the day. Compose into World.onTick (after the day/night announce). */
export function burkeWorkshopDayTick(s) {
    if (s.dead || s.ended)
        return;
    if (s.currentRoom !== WORKSHOP || !s.isDaytime)
        return;
    requestSceneTransition(s, WORKSHOP_CORRIDOR);
    return "\"Right — that's us done till the lights go down.\" A hand like a shovel arrives between your " +
        "shoulder-blades, not unkind but not up for discussion, and steers you doorward. \"I don't do daylight, " +
        "and you don't do it in here. Out. Come back when it's dark.\" The heavy door rattles shut at your back.";
}
/** The modest electronic fee Burke charges for the Beat-1 sliver. */
const BURKE_FEE = 10;
/** Beat 2: the analysis software (cheaper) vs. a bespoke trace (extortionate). */
const SOFTWARE_PRICE = 50;
const TRACE_PRICE = 5000;
/** Ticks that must elapse after the Beat-1 payment before Burke volunteers Beat 2.
 *  A day-length (one phase) — long enough to feel like "he's slept on it", short
 *  enough to be reachable in a normal play loop. (PLACEHOLDER — Phase D.) */
const BEAT2_DELAY_TICKS = 100; // = the default dayLength
/** Beat 2 opens once Beat 1 is paid AND enough time has elapsed since it. */
function beat2Available(s) {
    if (!s.flags[FLAG_BURKE_TRANSACTED])
        return false;
    const txn = s.flags[FLAG_BURKE_TXN_TICK];
    if (typeof txn !== "number")
        return false;
    return s.ticks - txn >= BEAT2_DELAY_TICKS;
}
const NUDGE = "\"You're chasing a boy for people who won't put their name to the work. Doesn't strike you as the " +
    "wrong end of the thing to be curious about?\" He holds your eye. \"My advice — and you're getting it " +
    "either way — stop wondering who the Jackrabbit is. Start wondering who you're actually working for.\"";
/** `ask burke about jackrabbit` — Beat 1, step 1: he names his price and divulges
 *  NOTHING until paid. Sets the awaiting-payment flag; the PC must then SCAN their
 *  ID at his reader (burkePay) to be charged and told the sliver. Once transacted,
 *  asking again just repeats the sliver. */
function burkeJackrabbit(s) {
    if (s.flags[FLAG_BURKE_TRANSACTED]) {
        return "\"Told you. Came through Horizon, gone again — that's the truth and the whole of what I'll " +
            "say. I don't sell where a man went, even when I know. Especially then.\"";
    }
    s.flags[FLAG_BURKE_AWAITING_PAYMENT] = true;
    return "\"The Jackrabbit.\" He weighs the word, and doesn't say anything more with it — not yet. \"I " +
        `might know a thing. I don't give things away.\" He nods at a battered reader on the bench. \"${BURKE_FEE} ` +
        "credits. SCAN your ID there, and we'll talk. Not before.\"";
}
/** burkePay — the workshop reader's onScan. Routes whichever payment is owed:
 *  the Beat-2 software datacard (once the PC has agreed to buy it), or the Beat-1
 *  sliver. Each is paid by scanning your ID at his reader. */
function burkePay(s) {
    // Beat 2 takes priority once agreed: by the time software is pending, Beat 1 is
    // long settled, so a scan here means "pay for the datacard".
    if (s.flags[FLAG_BURKE_SOFTWARE_PENDING] && !s.flags[FLAG_BURKE_SOFTWARE_BOUGHT]) {
        if (!canAfford(s, SOFTWARE_PRICE)) {
            return `Burke watches the reader flash short. \"${SOFTWARE_PRICE} credits for the card, and you're short of it. Come back when you're not.\"`;
        }
        return burkeHandOverSoftware(s);
    }
    if (s.flags[FLAG_BURKE_TRANSACTED]) {
        return "Burke glances at the reader. \"Your coin's already crossed that. Ask, if you're asking — or BUY, if you're buying.\"";
    }
    if (!s.flags[FLAG_BURKE_AWAITING_PAYMENT]) {
        return "Burke doesn't look up. \"Scan it for what? Ask me something first, then we'll see about your coin.\"";
    }
    if (!canAfford(s, BURKE_FEE)) {
        return `Burke watches the reader flash short. \"${BURKE_FEE} credits, and you're light. Come back when you're not.\"`;
    }
    s.flags[FLAG_BURKE_TRANSACTED] = true;
    s.flags[FLAG_BURKE_AWAITING_PAYMENT] = false;
    s.flags[FLAG_BURKE_TXN_TICK] = s.ticks;
    charge(s, BURKE_FEE);
    score(s, HOOK_FIRST_BURKE);
    addNote(s, {
        id: "burke_first_transaction",
        source: "You",
        text: "Burke — grey-market engineer, Industrial Sector, nights only — confirmed the Jackrabbit " +
            "passed through Horizon and would say no more. Told me to stop wondering who the Jackrabbit is and " +
            "start wondering who I'm really working for. Says he can trace things others can't, for a price.",
        reliable: true,
    });
    return [
        `You scan your ID at the bench reader; your balance ticks down by ${BURKE_FEE}. Only then does Burke ` +
            "speak. \"The Jackrabbit came through Horizon, right enough. That much I'll give you — and it's what " +
            "half the station could've told you for nothing. He was here. Don't ask me where he went; I don't " +
            "know, and if I did, I'd not be selling it to you.\"",
        `(Balance: ${balance(s)} credits.)`,
        "Then he leans back, and the read sharpens. \"Here's something worth more than your fee, and I'll not " +
            "charge you, because it'll nag at me otherwise.\" " + NUDGE,
    ].join("\n\n");
}
/** Beat 2 hand-over: once paid via the reader, Burke presses the software datacard
 *  into the PC's hand. Places `burke_software` in the world, scores, files the note. */
function burkeHandOverSoftware(s) {
    charge(s, SOFTWARE_PRICE);
    takeItemToInventory(s, "burke_software");
    s.flags[FLAG_BURKE_SOFTWARE_BOUGHT] = true;
    s.flags[FLAG_BURKE_SOFTWARE_PENDING] = false;
    score(s, HOOK_BOUGHT_ANALYSIS_SOFTWARE);
    addNote(s, {
        id: "bought_burke_software",
        source: "You",
        text: "Bought Burke's analysis software — it's on a datacard (the 'software datacard'). Jack it into a " +
            "public terminal and give it time; it'll walk the payment chain back to whoever's really paying.",
        reliable: true,
    });
    return [
        `You scan your ID at the bench reader; your balance ticks down by ${SOFTWARE_PRICE}. Burke thumbs a small ` +
            "datacard off the bench and presses it into your palm — the analysis package, his end of the bargain.",
        `(Balance: ${balance(s)} credits.)`,
        "\"Find yourself a public terminal — any of the network'll do — and jack it in. It'll take as long as it " +
            "takes; don't hover. It'll tell you when it's done.\" He's already turning back to the bench. \"And when " +
            "it does — you didn't get it from me.\"",
    ];
}
/** The workshop's bench reader — Burke takes electronic payment over it (no cash
 *  exists). SCAN ID / TAP READER / USE ID ON READER all route here. */
export const burkeReader = {
    id: "burke_reader",
    name: "bench reader",
    aliases: ["reader", "bench reader", "scanner", "card reader", "burke's reader"],
    description: "A battered ID reader bolted to the corner of Burke's bench, its contact plate worn shiny. Whatever " +
        "Burke charges, he charges over this — electronically, like everything on Horizon. No cash changes hands.",
    takeable: false,
    onScan: (s) => burkePay(s),
};
export const burkeItems = { burke_reader: burkeReader };
/** Beat 2 — Burke volunteers the peculiar-routing observation (on the timed
 *  return TALK). Fires once; sets FLAG_BURKE_BEAT2 + files the note. */
function burkeBeat2Reveal(s) {
    s.flags[FLAG_BURKE_BEAT2] = true;
    addNote(s, {
        id: "burke_routing_oddity",
        source: "Burke",
        text: "Burke says the money that paid him — mine — took a deliberately laundered route, built to be " +
            "untraceable. He can't yet say whose it is, only that someone took great pains to hide it. He'll " +
            "sell me analysis software to walk the chain back myself, or run a trace himself for a fortune.",
        reliable: true,
    });
    return [
        "He's already looking at you when you come in, which he wasn't, last time. \"You.\" He wipes his " +
            "hands on a rag that makes them no cleaner. \"Been turning over that payment of yours — the one you " +
            "tapped onto my reader. Force of habit; I look at where money comes from.\"",
        "\"It came a long way round. Too long. Most coin on this station goes A to B; yours went through more " +
            "hands than it had any honest reason to, and every one of them set up to forget it ever touched " +
            "them.\" He sets the rag down. \"I don't know whose it is — not yet. But I know what deliberate looks " +
            "like, and that was deliberate. Somebody went to a great deal of trouble to make sure nobody could do " +
            "what I just did by accident.\"",
        "\"Seen the shape of it once before.\" A pause; he leaves what he doesn't say exactly where it is. " +
            "\"Now — you can keep wondering, or you can find out. Two ways I can help, and you'll not like the " +
            "price of the first. Ask about the SOFTWARE, or the TRACE. Or BUY, if you've made up your mind.\"",
    ];
}
// --- The Beat-2 purchase (buy software / buy trace at the workshop) -------
const SOFTWARE_PITCH = "\"A bit of kit — blockchain analysis, on a datacard. Walks the payment chain back on its own, given an " +
    "open ledger to read and time enough to read it. A public terminal'll do for the ledger; the time's on " +
    `you.\" He names a price: ${SOFTWARE_PRICE} credits. \"Cheap, for what it'll tell you. Say the word — BUY ` +
    "SOFTWARE — then SCAN your ID at the reader, and the card's yours.\"";
const TRACE_PITCH = "\"I run it down myself. Deep digging — days of it — and I don't come cheap for that.\" He names a " +
    `number: ${TRACE_PRICE} credits, and watches it land. \"Aye. That's why the software's the smart buy: ` +
    "same answer, and you do the waiting instead of me.\"";
/** `buy software` / `buy trace` at Burke's workshop. */
/** BUY route: Burke's bench (his software / trace wares). Wired in index.ts. */
export const burkeBuyRoute = {
    match: (s) => s.currentRoom === WORKSHOP,
    handler: (w, s, cmd) => burkeBuyCmd(w, s, cmd),
};
export const burkeBuyCmd = (_w, s, cmd) => {
    const noun = (cmd.noun ?? "").trim().toLowerCase();
    const wantsSoftware = /soft|analysis|kit|program|package|chip|tool/.test(noun);
    const wantsTrace = /trace|dig|run it/.test(noun);
    if (!wantsSoftware && !wantsTrace) {
        return { handled: true, output: ["\"Buy what?\" Burke grunts. \"I deal in the SOFTWARE, or a TRACE. Say which.\""], tickCost: 0, free: true };
    }
    if (!s.flags[FLAG_BURKE_BEAT2]) {
        return { handled: true, output: ["\"Sell you what?\" He doesn't look up. \"Ask the right questions first.\""], tickCost: 0, free: true };
    }
    if (wantsTrace) {
        if (!canAfford(s, TRACE_PRICE)) {
            return {
                handled: true,
                output: [`\"${TRACE_PRICE} credits, for me to run it down by hand.\" He sees your face. \"Thought not. ` +
                        "Buy the SOFTWARE — it's a fraction of that, and it'll get you there.\""],
                tickCost: 1,
            };
        }
        // Affordable in theory; Burke still steers to the software (he won't be tied up for days).
        return {
            handled: true,
            output: ["\"You've the coin, I'll grant you — but it'd have me elbow-deep in this for days, and I've " +
                    "work of my own. The SOFTWARE's the smart buy: same answer, you do the waiting.\""],
            tickCost: 1,
        };
    }
    // wantsSoftware — BUY agrees the deal; payment is the ID scan at his reader.
    if (s.flags[FLAG_BURKE_SOFTWARE_BOUGHT]) {
        return { handled: true, output: ["\"You've got it already. Find a public terminal and jack it in — then wait.\""], tickCost: 0, free: true };
    }
    s.flags[FLAG_BURKE_SOFTWARE_PENDING] = true;
    return {
        handled: true,
        output: [`\"Good.\" He nods at the bench reader. \"${SOFTWARE_PRICE} credits — SCAN your ID there, and the ` +
                "card's yours. That's how we do it; no cash, no paper, no record worth the name.\""],
        tickCost: 0,
        free: true,
    };
};
// --- Phase-aware topic helpers ------------------------------------------
function employerTopic(s) {
    if (s.flags[FLAG_BURKE_BEAT2]) {
        return "\"Same answer as before, only now I've looked: whoever's paying you went to deliberate " +
            "trouble to stay hidden. That's not shy — that's professional. Honest money doesn't take that road.\" " +
            "A shrug. \"Run the software. It'll put a name to it. I'll not guess one for you.\"";
    }
    return "\"There it is.\" A grim flicker of approval. \"" + NUDGE.slice(1);
}
function softwareTopic(s) {
    if (s.flags[FLAG_BURKE_SOFTWARE_BOUGHT]) {
        return "\"You've got the kit. A public terminal, then wait — that's all that's left to do.\"";
    }
    if (s.flags[FLAG_BURKE_BEAT2]) {
        // Quoting the price arms the reader: a scan now pays for the card.
        s.flags[FLAG_BURKE_SOFTWARE_PENDING] = true;
        return SOFTWARE_PITCH;
    }
    return "\"Not tonight.\" He doesn't look up. \"Come back when you've started asking the right questions. You'll know when.\"";
}
function traceTopic(s) {
    if (s.flags[FLAG_BURKE_BEAT2])
        return TRACE_PITCH;
    return "\"Trace what?\" He doesn't look up. \"Ask the right questions first.\"";
}
// --- Beat 3: the pivot (the Strand-3 hinge) -----------------------------
/** The PC's real name (captured at character creation). Burke speaking it is
 *  the reveal; every other NPC has only ever used the alias. */
function realName(s) {
    const v = s.flags[FLAG_PC_REAL_NAME];
    return typeof v === "string" && v.trim() ? v.trim() : "investigator";
}
/** Beat 3 opens once Strand 2 has resolved (AetherLink named) AND the PC has
 *  cracked the predecessor's sealed brief (knows it's the same job, he's dead). */
function beat3Available(s) {
    return !!s.flags[FLAG_ANALYSIS_RESOLVED] && !!s.flags[FLAG_BRIEF_UNLOCKED];
}
/** The pivot speech — fires once on TALK when the gate is met. The real-name
 *  reveal + the eye-opening collision + the two roads. Scores HOOK_BURKE_PIVOT. */
function burkePivotSpeech(s) {
    s.flags[FLAG_BURKE_PIVOT_DONE] = true;
    score(s, HOOK_BURKE_PIVOT);
    const name = realName(s);
    addNote(s, {
        id: "burke_pivot",
        source: "Burke",
        text: "Burke named AetherLink as the people paying me — and named the investigator before me: " +
            "John Smith on the 'pad, but really Stuart McAlister. Same contract, arrived about a month ago, " +
            "vanished within weeks, nobody looking. He knew my real name, too. Two roads out, he says: he can " +
            "get me off-station clean, or there's a name — Doctor Rajah — for those who'd want what I've worked out.",
        reliable: true,
    });
    return [
        "He's not working when you come in. The bench is quiet, his hands still on it, and he's looking at the " +
            "door before you're through it — the way a man looks who's decided something and is only waiting on the " +
            "other party to arrive.",
        "\"You ran the software. So you've a name now — the one at the bottom of all those shells, the one that's " +
            "been paying you to chase a boy across a station full of folk who'd sooner spit than help you.\" A slow " +
            "nod. \"AetherLink. Big name. Clean name. You'll have seen the same adverts I have — they look after " +
            "their own. Every soul who carries the badge, even the ones they post out to the far dark. Nobody left " +
            "behind.\"",
        "He lets that sit, then says a name. \"John Smith.\" A short, joyless sound that isn't a laugh. \"That's " +
            "the name on the 'pad you found behind the lavatory wall. No more his name than the one on your card is " +
            "yours.\" He says the next one carefully, like setting down a tool that's sharper than it looks. \"Stuart " +
            "McAlister. Came in a month back, give or take — stepped off a transport the same as you did. Same " +
            "contract, word for word; same datapad, same boy, same people paying. Lasted a fortnight, maybe three. " +
            "Then he walked off into the dark, and that was the end of him. Gone these couple of weeks, and not one " +
            "soul looking.\" A beat. \"They didn't leave the post empty, mind. They filled it. With you.\"",
        "Then, quiet, and this is the part that goes through you: \"" + name + ".\"",
        "Your real name. Not the one on your card. The one you left behind a wall of shell companies and a hired " +
            "alias — the one nobody on this station should have. He says it the way you'd set down something " +
            "fragile. \"Aye. Found it the same road I found the money — patient, and minded to look. Which means " +
            "anyone with more reach than me and a reason to look has had it a deal longer. You were never anonymous, " +
            "friend. You only felt it.\"",
        "He finally moves — wipes clean hands on a rag. \"So here's me done selling, and telling, the once. Two " +
            "roads out, and you choose, not me.\"",
        "\"One: I get you gone. Tonight, quiet, on a transport that doesn't ask questions, to a colony that " +
            "doesn't either. You leave their kit with me, you leave the pay, you leave the boy — and you walk into " +
            "the rest of your life with none of them at your back. That's the clean road. I've walked a soul down it " +
            "before.\"",
        "\"Two —\" and he weighs it, the way he weighed the boy's name your first night here \"— there's maybe " +
            "folk who'd want to hear what you've worked out. Who love AetherLink no better than you're learning to. I " +
            "don't know them. I don't want to. But I know a name who might, and that road you'd walk on your own two " +
            "legs, carrying everything you came in with.\" Flat. \"I'll not tell you which is the wiser. I'm not sure " +
            "I know.\"",
        "\"Think on it. Don't think long — that's the one thing out here nobody's got spare. You know where I " +
            "am.\"",
        "His eyes stay on you a moment longer. \"When you're sure of it: ask me to get you GONE, and the clean " +
            "road's yours. Or ask me for the NAME, and you walk the other on your own two legs. One word or the " +
            "other does it — and don't be long deciding.\"",
    ];
}
/** Road one (Flee) — the terminal confirm. Yes → set FLAG_FLEEING and trigger
 *  the Flee ending; no/anything else → back out, pivot stays open. */
function fleeConfirmModal() {
    return {
        onInput: (line, s) => {
            const t = line.trim().toLowerCase();
            const yes = /^(y|yes|yeah|yep|yup|aye|sure|ok|okay|do it|please|leave|go|get me|now|certain)\b/.test(t);
            const no = /^(n|no|nae|not|wait|stop|cancel|stay|think|hold|back|later|never)\b/.test(t);
            if (yes) {
                s.flags[FLAG_FLEEING] = true;
                // Hand off to the Flee ending (world.endings["flee"] — fleshed out in index.ts). Engine renders it after this modal pops (submit → checkEndStates).
                s.ended = true;
                s.endingId = "flee";
                s.survived = true;
                return { pop: true };
            }
            if (no) {
                return { pop: true, output: ["\"Then think a while longer. I'll be here — nights.\""] };
            }
            return { output: ["Burke waits, unhurried. \"Aye or no. Do I get you gone, or not?\""] };
        },
    };
}
/** `ask burke about leaving / getting out / the clean road` (post-pivot). */
function fleeRoadTopic(s) {
    if (!s.flags[FLAG_BURKE_PIVOT_DONE]) {
        return "\"Leaving?\" He doesn't look up. \"You've given me no reason to talk about roads yet. Ask the " +
            "right questions first.\"";
    }
    if (s.flags[FLAG_DEFECTING]) {
        return "\"You made your choice when you took that name off me. The clean road's closed now — you opened " +
            "the other one.\"";
    }
    // Arm the terminal confirm and return the lead-in prompt.
    requestPushModal(s, fleeConfirmModal());
    return "\"You're sure of it.\" Not really a question. \"Once you're on that transport there's no coming " +
        "back to pick at it — not the pay, not the boy, not one loose thread. Sure?\"";
}
/** The level number embedded in a Zone B address ("Residence B2-..." -> "2"). */
function rajahLevel(address) {
    const m = /Residence B(\d)/.exec(address);
    return m ? m[1] : "1";
}
/** `ask burke about the name / rajah / the other road` (post-pivot). The Defect
 *  commit — irreversible: sets FLAG_DEFECTING (shuts the Flee road) and the
 *  Rajah-gate flag, picks her (random, persistent) Zone B home address, and
 *  sends the PC THERE — not to her shop. */
function defectRoadTopic(s) {
    if (!s.flags[FLAG_BURKE_PIVOT_DONE]) {
        return "\"A name?\" He shakes his head. \"Earn the question first. You're not there yet.\"";
    }
    if (s.flags[FLAG_BURKE_REFERRED_RAJAH]) {
        const addr = referRajahToResidence(s); // re-quotes the stored address
        return "\"Rajah. I told you — where she lives, not her shop. Residential Zone B, " + addr + ". " +
            "I'll not say it a third time.\" He's already back at the bench.";
    }
    s.flags[FLAG_DEFECTING] = true;
    s.flags[FLAG_BURKE_REFERRED_RAJAH] = true;
    // Wakes Teng's off-the-record berth tip (the shipyard hauler / stow-away road).
    s.flags[FLAG_DEFECT_PATHWAY] = true;
    const addr = referRajahToResidence(s);
    const level = rajahLevel(addr);
    const name = realName(s);
    addNote(s, {
        id: "burke_rajah_rumour",
        source: "Burke",
        text: "Doctor Rajah. Go to where she LIVES, not her shop: Residential Zone B, " + addr + " (level " +
            level + "). Burke's word, not his knowledge: knock there first, and don't go near her unit until she " +
            "says so.",
        reliable: true,
    });
    return "\"The name.\" He never writes anything down. \"Rajah. Doctor Rajah. Aye, she keeps a chemist's " +
        "down the low commercial end — but you don't walk up on a body like her over a shop counter. You go to " +
        "where she lives.\" He says it once, plainly. \"Residential Zone B. " + addr + " — that's level " +
        level + ". Take the 'Tube to the zone, the lift up, and find the door yourself; I'll not draw you a map " +
        "of that warren.\" A raised hand before you can ask. \"Knock there. If she takes to you, she'll say " +
        "where to talk proper. I don't know what she is — could be I'm sending you to a chemist who'll sell you " +
        "cough syrup and wonder what you're about. That's word, not knowledge.\" He turns back to the bench. " +
        "\"Tell her less than you've told me. And " + name + " — mind the dark on the way. It's a long station, " +
        "and not all of it likes a question.\"";
}
/** Post-pivot TALK — re-cue the choice without re-dumping the whole speech. */
function burkePostPivotTalk(s) {
    if (s.flags[FLAG_DEFECTING]) {
        return ["\"You've taken the name. Residential Zone B, then — where she lives. Knock, and mind yourself. " +
                "Nothing more for you here.\" He turns back to the bench."];
    }
    return ["\"Still here.\" He doesn't stop working. \"Two roads, same as I laid them. I can get you gone — " +
            "ask me to — that's GONE, the clean road. Or ask me for the NAME, and you walk the other yourself. Your " +
            "choice, not mine.\""];
}
/** Burke deflecting a question about himself (Quentin stays buried). */
const BURKE_SELF = "\"What I am is the man who fixes things and finds things, when he's minded to. The rest of it's mine " +
    "to keep.\" He doesn't elaborate, and you get the sense he never does.";
/** "name" is context-aware: post-pivot it means the road-two contact (Rajah);
 *  before that it's a question about Burke himself. */
function nameTopic(s) {
    return s.flags[FLAG_BURKE_PIVOT_DONE] ? defectRoadTopic(s) : BURKE_SELF;
}
export const burke = {
    id: "burke",
    name: "Burke",
    aliases: ["burke", "engineer", "fixer", "fixit man", "the big man"],
    description: "A mountain of a man behind the bench, filling the space the way furniture doesn't. A vast greying " +
        "beard swallows the lower half of a weathered, unhurried face; pale eyes take you in with the flat, " +
        "complete attention of someone pricing a job. His work jacket is so worked-into that the oil is part " +
        "of the weave now. When his hands move — and they're enormous — they move with a watchmaker's " +
        "precision the rest of him doesn't advertise.",
    onTalk: (s) => {
        // First meeting — the read + the offer to deal. No charge, no boy.
        if (!s.flags[FLAG_BURKE_MET]) {
            s.flags[FLAG_BURKE_MET] = true;
            return [
                "He doesn't look up at first — just lets you stand there while something delicate happens under " +
                    "those enormous hands. Then he does, and the attention is total, unhurried, faintly insulting. " +
                    "\"Investigator.\" Not a question. \"Independent, too — you've not quite got the smell of a corpie " +
                    "about you. Freelance. Hired at arm's length by someone who never gave you their name.\" He sets " +
                    "his tools down. \"How am I doing?\"",
                "\"I fix things, and I find things — when I'm minded to, and for a price. Ask, if you're asking.\" " +
                    "Already half-turned back to the bench. \"Come back at night, mind. I don't do daylight.\"",
            ];
        }
        // Beat 3: once the pivot's been delivered, re-cue the choice (don't re-dump it).
        if (s.flags[FLAG_BURKE_PIVOT_DONE]) {
            return burkePostPivotTalk(s);
        }
        // Beat 3 gate met (Strand 2 resolved + predecessor brief cracked): the pivot.
        if (beat3Available(s)) {
            return burkePivotSpeech(s);
        }
        // Once the software's sold, he points you at the terminal and little else.
        if (s.flags[FLAG_BURKE_SOFTWARE_BOUGHT]) {
            return ["\"You've got what you need. Find a terminal, set it running, and wait. The rest's not mine to do.\""];
        }
        // Beat 2 delivered, still deciding — he keeps the offer open.
        if (s.flags[FLAG_BURKE_BEAT2]) {
            return ["\"Made your mind up?\" He doesn't stop working. \"The SOFTWARE, or the TRACE. Or neither — your coin, your business.\""];
        }
        // The timed return: Burke volunteers the routing oddity (Beat 2).
        if (beat2Available(s)) {
            return burkeBeat2Reveal(s);
        }
        // Paid Beat 1, but Beat 2 isn't ripe yet — signpost that there's more coming.
        if (s.flags[FLAG_BURKE_TRANSACTED]) {
            return ["\"Back again.\" He doesn't stop what he's doing. \"Nothing new tonight — but I've been " +
                    "turning that payment of yours over, and there's a thing or two about it nagging at me. Give it a " +
                    "day, come back, and ask me about your EMPLOYER. I'll have chewed it through by then.\""];
        }
        // Met, but nothing new to say yet.
        return ["\"Back again.\" He doesn't stop what he's doing. \"Ask, if you're asking. Or buy, if you're buying. I'll be here — nights.\""];
    },
    topics: aliasedTopics([
        // The Beat-1 paid transaction — only on a deliberate ask about the boy.
        [["jackrabbit", "rabbit", "boy", "the boy", "target", "young man", "him"], (s) => burkeJackrabbit(s)],
        // A hint toward the predecessor-datapad failsafe, for a player who's stuck.
        [["datapad", "weathered datapad", "weathered", "his datapad", "old datapad", "other datapad",
                "second datapad", "two datapads", "twin", "unlock", "crack", "open it", "locked"],
            "He doesn't even look up. \"Come into a second 'pad, have you? His, by the smell of it — same model " +
                "as the one you're carrying, and locked.\" A grunt. \"Those units have a failsafe built in. Leave one " +
                "dark long enough and an identical one, registered to the same outfit, can wake it — that's the " +
                "manufacturer being clever, not me. Hold yours against his, back to back, and let them talk. It'll " +
                "open. You'll not need me for that.\""],
        [["employer", "paying", "who's paying", "client", "contract", "boss", "work for", "working for",
                "routing", "money", "payment", "paymaster", "funding"], (s) => employerTopic(s)],
        [["software", "analysis", "blockchain", "kit", "program", "chip"], (s) => softwareTopic(s)],
        [["trace", "dig", "run it down"], (s) => traceTopic(s)],
        // Beat 3 — the two roads (live after the pivot speech; deflect before it).
        [["leaving", "leave", "out", "get out", "getting out", "get me out", "way out", "clean road", "clean",
                "road one", "road 1", "first road", "first", "one", "flee", "run", "disappear", "vanish",
                "escape", "transport", "gone", "exit"], (s) => fleeRoadTopic(s)],
        [["rajah", "doctor rajah", "other road", "the other road", "other", "road two", "road 2", "second road",
                "second", "two", "defect", "defection", "turn", "turncoat", "join", "resistance", "contact",
                "those people"], (s) => defectRoadTopic(s)],
        // "name" routes context-aware (his name pre-pivot; the Rajah road after).
        [["name"], (s) => nameTopic(s)],
        [["burke", "yourself", "you", "workshop", "quentin"], BURKE_SELF],
    ]),
    unknownTopic: "\"Not what I'm here for. You want a thing fixed or a thing found, say so.\"",
};
export { WORKSHOP as BURKE_WORKSHOP };
