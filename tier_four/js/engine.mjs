// Tier Four engine, prototype slice: one contract, its hints, the actions
// that log understandings, and the debrief. Plain functions with no DOM, so
// tier_four_dev/checks/engine.mjs can run them in Node.
//
// A play is a plain object. Every function that changes it returns a new one,
// so a play can be saved later as it is. Spoiler-free and reader plays are
// separate: a play holds a view of the contract filtered to its own mode, and
// nothing from the other mode is ever in it.

export const FORMAT = 1;
export const MODES = ['spoiler-free', 'reader'];
const SHOWN_IN = {
    'spoiler-free': ['spoiler-free'],
    reader: ['reader'],
    both: ['spoiler-free', 'reader'],
};

const shownIn = (item, mode) => SHOWN_IN[item.mode]?.includes(mode) ?? false;

// The contract as a player in `mode` sees it. The data checks validate the
// full format; this only refuses what would make play unsafe.
export function viewContract(contract, mode) {
    if (!MODES.includes(mode)) throw new Error(`unknown mode "${mode}"`);
    if (contract?.format !== FORMAT) throw new Error(`contract format must be ${FORMAT}`);
    if (!shownIn(contract, mode)) throw new Error(`contract "${contract.id}" is not shown in ${mode} mode`);
    const truths = contract.truths.filter(t => shownIn(t, mode));
    const visible = new Set(truths.map(t => t.id));
    const keep = item => shownIn(item, mode) && visible.has(item.truth);
    return {
        id: contract.id,
        mode,
        tier: contract.tier,
        title: contract.title,
        truths,
        hints: contract.hints.filter(keep),
        understandings: contract.understandings.filter(keep),
    };
}

// The distinct actions in the view, in the order they first appear.
export function actionsOf(view) {
    return [...new Set(view.understandings.map(u => u.action))];
}

export function startPlay(contract, mode) {
    const view = viewContract(contract, mode);
    return { view, hintsSeen: 0, actions: [], logged: [], ended: false };
}

export const nextHint = play => play.hintsSeen < play.view.hints.length && !play.ended
    ? { ...play, hintsSeen: play.hintsSeen + 1 }
    : play;

export const seenHints = play => play.view.hints.slice(0, play.hintsSeen);

export const canTake = (play, action) =>
    !play.ended && actionsOf(play.view).includes(action) && !play.actions.includes(action);

// Taking an action logs every understanding in the view that uses it. Each
// action can be taken once. Nothing says whether a reading was right.
export function takeAction(play, action) {
    if (!canTake(play, action)) return play;
    const ids = play.view.understandings.filter(u => u.action === action).map(u => u.id);
    return { ...play, actions: [...play.actions, action], logged: [...play.logged, ...ids] };
}

// The journal entries logged so far, in the order they were logged.
export function journal(play) {
    const byId = new Map(play.view.understandings.map(u => [u.id, u]));
    return play.logged.map(id => byId.get(id).journal);
}

export const endContract = play => play.ended ? play : { ...play, ended: true };

// For each truth: which of its hints were seen, and which understandings of
// it were logged, marked right or misread. `read` is true if at least one
// correct understanding of it was logged.
export function debrief(play) {
    if (!play.ended) throw new Error('the contract has not ended');
    const seen = new Set(seenHints(play).map(h => h.id));
    const logged = new Set(play.logged);
    return {
        title: play.view.title,
        mode: play.view.mode,
        truths: play.view.truths.map(truth => {
            const hints = play.view.hints.filter(h => h.truth === truth.id)
                .map(h => ({ id: h.id, text: h.text, seen: seen.has(h.id) }));
            const readings = play.view.understandings
                .filter(u => u.truth === truth.id && logged.has(u.id))
                .map(u => ({ id: u.id, journal: u.journal, correct: u.correct }));
            return { id: truth.id, text: truth.text, hints, readings, read: readings.some(r => r.correct) };
        }),
    };
}
