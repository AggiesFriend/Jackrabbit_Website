// Input history for the command box: Up recalls older entries, Down walks back
// toward the live draft. Pure (no DOM) so it can be unit-tested; dom.ts wires the
// keyboard to it. Shell-style: blanks and consecutive duplicates aren't recorded,
// the in-progress line is stashed as a "draft" the first time you arrow away from
// it, and arrowing back down past the newest entry restores that draft.
/** How many recent inputs to keep. The player only wants to thumb back through a
 *  handful, so a small ring is plenty. */
export const DEFAULT_HISTORY_LIMIT = 30;
export class InputHistory {
    constructor(limit = DEFAULT_HISTORY_LIMIT) {
        this.limit = limit;
        this.items = [];
        /** Cursor into `items`; === items.length means "on the live draft line". */
        this.index = 0;
        this.draft = "";
    }
    /** Record a just-submitted line, then reset navigation to the live line.
     *  Skips blank/whitespace-only lines and immediate repeats. */
    record(line) {
        if (line.trim().length > 0 && this.items[this.items.length - 1] !== line) {
            this.items.push(line);
            while (this.items.length > this.limit)
                this.items.shift();
        }
        this.index = this.items.length;
        this.draft = "";
    }
    /** Up arrow — the previous (older) entry. `current` is the live input value,
     *  stashed as the draft the first time we step off it. Returns the text to show,
     *  or null when there's nothing older to show (so the caller leaves the box be). */
    previous(current) {
        if (this.items.length === 0)
            return null;
        if (this.index === this.items.length)
            this.draft = current; // stepping off the live line
        if (this.index === 0)
            return this.items[0] ?? null; // already oldest — stay put
        this.index -= 1;
        return this.items[this.index] ?? null;
    }
    /** Down arrow — the next (newer) entry, or the stashed draft once we walk back
     *  past the newest. Returns the text to show, or null if already on the live
     *  draft (nothing newer). Note "" is a real result (an empty stashed draft). */
    next() {
        if (this.index >= this.items.length)
            return null; // already on the live line
        this.index += 1;
        return this.index === this.items.length ? this.draft : (this.items[this.index] ?? null);
    }
}
