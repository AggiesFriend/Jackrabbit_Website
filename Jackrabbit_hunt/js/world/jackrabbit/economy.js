// The station credit economy — the PC's ID-card balance and the debit/credit
// helpers every paid transaction shares. Extracted from food.ts (where it first
// grew up) so the bars, Burke, and the casino don't have to import "food" just to
// move money. Content-agnostic in shape: it knows only the FLAG_CREDITS slot, so
// it's a kit-candidate alongside router.ts.
//
// ONE PLACE TO SPEND. `charge()` is the single enforcement point for "you can't
// spend what you don't have": it refuses (and debits nothing) when the balance is
// short, so the balance can NEVER go negative — even if a call site forgets to
// guard. Credits only ever leave via charge() and only ever arrive via credit()
// (the one exception is the initial grant at the Halberd briefing, an absolute
// set in npcs.ts). Read with balance(); never poke s.flags[FLAG_CREDITS] directly.
import { FLAG_CREDITS } from "./flags.js";
/** The PC's current ID-card balance (0 before the card is loaded). */
export function balance(s) {
    const v = s.flags[FLAG_CREDITS];
    return typeof v === "number" ? v : 0;
}
/** True if the balance covers a charge of `n`. The affordability predicate every
 *  paid transaction's guard should use, so "can I afford it?" lives in one place. */
export function canAfford(s, n) {
    return balance(s) >= n;
}
/**
 * Debit `n` credits from the ID balance. THE backstop for "you can't spend what
 * you don't have": if the balance won't cover it, nothing is debited and it
 * returns `false`; otherwise it debits and returns `true`. The balance can never
 * go negative. Call sites still guard first (with `canAfford`) to print their own
 * characterful "you're short" refusal — but a missed or wrong guard can no longer
 * overdraw the card. New transactions can also just branch on the return:
 * `if (!charge(s, n)) return refusal;`.
 */
export function charge(s, n) {
    if (!canAfford(s, n))
        return false;
    s.flags[FLAG_CREDITS] = balance(s) - n;
    return true;
}
/** Add `n` credits to the ID balance (a payout, a refund, a top-up). */
export function credit(s, n) {
    s.flags[FLAG_CREDITS] = balance(s) + n;
}
