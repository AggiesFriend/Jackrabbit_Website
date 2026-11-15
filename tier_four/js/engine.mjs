// Tier Four engine. Plain functions with no DOM, so the checks in
// tier_four_dev can run them in Node.
//
// Content is a campaign (an ordered list of chapters) and one JSON file per
// chapter. A chapter is a contract or a scene between contracts. Every item
// is tagged for spoiler-free mode, reader mode or both, and a play only ever
// holds a view of the content filtered to its own mode.
//
// A play is a plain JSON-safe object. Every function that changes it returns
// a new one and leaves the old one alone, so a play can be saved as it is.

export const FORMAT = 2;
export const MODES = ['spoiler-free', 'reader'];
export const HINT_KINDS = ['deflect', 'hesitate', 'over-comply', 'question'];
export const COVER_MAX = 100;
export const COVER_AFTER_REVIEW = 55;
const SHOWN_IN = {
    'spoiler-free': ['spoiler-free'],
    reader: ['reader'],
    both: ['spoiler-free', 'reader'],
};

export const shownIn = (item, mode) => SHOWN_IN[item?.mode ?? 'both']?.includes(mode) ?? false;

// ---------------------------------------------------------------- views

// A chapter as a player in `mode` sees it. Items whose truth is hidden in
// the mode are left out even if tagged `both`, and so are lines, choices
// and scenes tagged for the other mode. The data checks validate the full
// format; this only refuses what would make play unsafe.
export function viewChapter(chapter, mode) {
    if (!MODES.includes(mode)) throw new Error(`unknown mode "${mode}"`);
    if (chapter?.format !== FORMAT) throw new Error(`chapter format must be ${FORMAT}`);
    if (!shownIn(chapter, mode)) throw new Error(`chapter "${chapter.id}" is not shown in ${mode} mode`);
    const truths = (chapter.truths ?? []).filter(t => shownIn(t, mode));
    const visible = new Set(truths.map(t => t.id));
    const understandings = (chapter.understandings ?? []).filter(u => shownIn(u, mode) && visible.has(u.truth));
    const scenes = chapter.scenes.filter(s => shownIn(s, mode)).map(scene => ({
        ...scene,
        lines: (scene.lines ?? []).filter(l => shownIn(l, mode) && (!l.truth || visible.has(l.truth))),
        choices: (scene.choices ?? []).filter(c => shownIn(c, mode)),
    }));
    return {
        id: chapter.id,
        mode,
        tier: chapter.tier,
        kind: chapter.kind,
        ship: chapter.ship,
        title: chapter.title,
        subtitle: chapter.subtitle ?? '',
        brief: chapter.brief ?? null,
        requires: chapter.requires ?? [],
        unless: chapter.unless ?? [],
        start: chapter.start,
        truths,
        understandings,
        scenes,
    };
}

// The whole campaign in one mode: the chapters in order, plus the review
// chapters by tier. `chapters` maps id to raw chapter data.
export function viewCampaign(campaign, chapters, mode) {
    if (campaign?.format !== FORMAT) throw new Error(`campaign format must be ${FORMAT}`);
    const get = id => {
        if (!chapters[id]) throw new Error(`chapter "${id}" is missing`);
        return chapters[id];
    };
    const order = campaign.chapters.map(get).filter(c => shownIn(c, mode)).map(c => viewChapter(c, mode));
    const reviews = {};
    for (const [tier, id] of Object.entries(campaign.reviews ?? {})) {
        const c = get(id);
        if (shownIn(c, mode)) reviews[tier] = viewChapter(c, mode);
    }
    return { mode, title: campaign.title, speakers: campaign.speakers ?? {}, chapters: order, reviews };
}

export const chapterById = (view, id) =>
    view.chapters.find(c => c.id === id) ?? Object.values(view.reviews).find(c => c.id === id) ?? null;

export const sceneById = (chapter, id) => chapter.scenes.find(s => s.id === id) ?? null;

// All hints in a chapter view: Aggie's lines with a `kind`, in scene order.
export function hintsOf(chapter) {
    const out = [];
    for (const scene of chapter.scenes) {
        for (const line of scene.lines) {
            if (line.kind) out.push({ id: line.hint, truth: line.truth, kind: line.kind, text: line.text, scene: scene.id });
        }
    }
    return out;
}

// ----------------------------------------------------------- conditions

// A condition is a flag name, or a comparison on cover or trust:
// "cover>=60", "trust.frank>=2". `requires` must all hold; `unless` must all
// fail.
export function holds(play, cond) {
    const m = /^(cover|trust\.([a-z0-9-]+))(>=|<=|>|<|==)(-?\d+)$/.exec(cond);
    if (!m) return play.flags.includes(cond);
    const value = m[1] === 'cover' ? play.cover : (play.trust[m[2]] ?? 0);
    const n = Number(m[4]);
    switch (m[3]) {
        case '>=': return value >= n;
        case '<=': return value <= n;
        case '>': return value > n;
        case '<': return value < n;
        default: return value === n;
    }
}

export const allowed = (play, item) =>
    (item.requires ?? []).every(c => holds(play, c)) && !(item.unless ?? []).some(c => holds(play, c));

// ---------------------------------------------------------------- play

export function newPlay(view) {
    const play = {
        version: FORMAT,
        mode: view.mode,
        position: -1,        // index into view.chapters of the current main chapter
        queue: [],           // chapter ids to play before moving on (reviews)
        chapter: null,
        scene: null,
        phase: 'brief',      // brief | scene | closed | ended
        shown: 0,            // lines revealed in the current scene
        jumpDone: false,
        cover: 0,
        trust: {},
        flags: [],
        logged: [],          // { chapter, id }
        hints: [],           // { chapter, id }
        journal: [],         // { chapter, kind: 'reading' | 'note', text }
        jumps: [],           // { chapter, scene, name, tries, late, auto }
        completed: [],
        history: [],         // snapshots for rewinding within the chapter
        rewinds: 0,
        reviews: 0,
        choices: 0,
        started: Date.now(),
    };
    return advance(play, view);
}

const clone = play => JSON.parse(JSON.stringify(play));
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export const currentChapter = (play, view) => play.chapter ? chapterById(view, play.chapter) : null;

export function currentScene(play, view) {
    const chapter = currentChapter(play, view);
    return chapter && play.scene ? sceneById(chapter, play.scene) : null;
}

// Lines of the current scene that apply to this play.
export const visibleLines = (play, view) => (currentScene(play, view)?.lines ?? []).filter(l => allowed(play, l));

export const visibleChoices = (play, view) => (currentScene(play, view)?.choices ?? []).filter(c => allowed(play, c));

// The jump the current scene asks for, if it hasn't been flown yet.
export function pendingJump(play, view) {
    const scene = currentScene(play, view);
    return scene?.jump && !play.jumpDone && play.phase === 'scene' ? scene.jump : null;
}

// Moves to the next chapter the play can enter: queued reviews first, then
// the main sequence, skipping chapters whose requirements aren't met.
// Ends the play when nothing is left.
function advance(play, view) {
    const next = clone(play);
    next.history = [];
    next.jumpDone = false;
    next.shown = 0;
    let chapter = null;
    if (next.queue.length) {
        chapter = chapterById(view, next.queue.shift());
    } else {
        while (next.position + 1 < view.chapters.length) {
            next.position++;
            const candidate = view.chapters[next.position];
            if (allowed(next, candidate)) {
                chapter = candidate;
                break;
            }
        }
    }
    if (!chapter) {
        next.chapter = null;
        next.scene = null;
        next.phase = 'ended';
        return next;
    }
    next.chapter = chapter.id;
    next.phase = chapter.kind === 'contract' ? 'brief' : 'scene';
    return enterScene(next, view, chapter.start);
}

// From the contract card into the first scene.
export function beginChapter(play) {
    if (play.phase !== 'brief') return play;
    return { ...clone(play), phase: 'scene' };
}

function applyEffects(play, effects, where) {
    if (effects.cover) play.cover = clamp(play.cover + effects.cover, 0, COVER_MAX);
    for (const [who, n] of Object.entries(effects.trust ?? {})) play.trust[who] = (play.trust[who] ?? 0) + n;
    for (const flag of effects.set ?? []) if (!play.flags.includes(flag)) play.flags.push(flag);
    for (const flag of effects.clear ?? []) play.flags = play.flags.filter(f => f !== flag);
    if (effects.note) play.journal.push({ chapter: where.chapter, kind: 'note', text: effects.note });
}

// Logging an understanding writes its journal text and sets flags later
// scenes can test: read:<truth> for a correct reading, misread:<truth> for a
// misreading, logged:<id> either way. Nothing tells the player which.
function logUnderstanding(play, chapter, id) {
    const u = chapter.understandings.find(x => x.id === id);
    if (!u || play.logged.some(l => l.chapter === chapter.id && l.id === id)) return;
    play.logged.push({ chapter: chapter.id, id });
    play.journal.push({ chapter: chapter.id, kind: 'reading', text: u.journal });
    const flags = [`logged:${id}`, `${u.correct ? 'read' : 'misread'}:${u.truth}`];
    for (const f of flags) if (!play.flags.includes(f)) play.flags.push(f);
}

// Records that the player has seen the first `count` lines of the current
// scene, so a reload resumes mid-scene and the debrief knows which hints
// were reached.
export function reveal(play, view, count) {
    const lines = visibleLines(play, view);
    const n = clamp(count, 0, lines.length);
    if (n <= play.shown) return play;
    const next = clone(play);
    next.shown = n;
    for (const line of lines.slice(0, n)) {
        if (line.kind && !next.hints.some(h => h.chapter === play.chapter && h.id === line.hint)) {
            next.hints.push({ chapter: play.chapter, id: line.hint });
        }
    }
    return next;
}

export const revealAll = (play, view) => reveal(play, view, visibleLines(play, view).length);

function enterScene(play, view, sceneId) {
    const chapter = currentChapter(play, view);
    const scene = sceneById(chapter, sceneId);
    if (!scene) throw new Error(`scene "${sceneId}" is not in chapter "${chapter.id}"`);
    play.scene = sceneId;
    play.shown = 0;
    play.jumpDone = false;
    if (scene.enter) applyEffects(play, scene.enter, { chapter: chapter.id });
    return play;
}

// Takes the choice at `index` among the visible choices. Pushes a snapshot
// first so the player can rewind to it.
export function choose(play, view, index) {
    if (play.phase !== 'scene') return play;
    const choices = visibleChoices(play, view);
    const choice = choices[index];
    if (!choice) return play;
    const chapter = currentChapter(play, view);
    const before = revealAll(play, view);
    const next = clone(before);
    next.history = [...before.history.slice(-29), snapshot(before)];
    next.choices++;
    applyEffects(next, choice, { chapter: chapter.id });
    for (const id of choice.logs ?? []) logUnderstanding(next, chapter, id);
    return follow(next, view, choice.goto);
}

// A scene with `next` and no choices: one Continue button.
export function proceed(play, view) {
    if (play.phase !== 'scene') return play;
    const scene = currentScene(play, view);
    if (!scene || visibleChoices(play, view).length) return play;
    const before = revealAll(play, view);
    if (scene.rewindTo) {
        // A choice that would break canon: back to the scene it came from,
        // with the play as it was there, except that the rewind is counted.
        const last = before.history[before.history.length - 1];
        const restored = last ? clone(last) : clone(before);
        restored.history = before.history.slice(0, -1);
        restored.rewinds = before.rewinds + 1;
        if (restored.scene !== scene.rewindTo) enterScene(restored, view, scene.rewindTo);
        restored.shown = 0;
        return restored;
    }
    const next = clone(before);
    next.history = [...before.history.slice(-29), snapshot(before)];
    if (scene.end || !scene.next) return closeChapter(next, view);
    return follow(next, view, scene.next);
}

function follow(play, view, target) {
    if (target === 'end') return closeChapter(play, view);
    return enterScene(play, view, target);
}

// A snapshot is the part of the play that a rewind restores.
function snapshot(play) {
    const { history, ...rest } = play;
    return rest;
}

export const canRewind = play => play.phase === 'scene' && play.history.length > 0;

export function rewind(play) {
    if (!canRewind(play)) return play;
    const history = play.history.slice(0, -1);
    const restored = clone(play.history[play.history.length - 1]);
    restored.history = history;
    restored.rewinds = play.rewinds + 1;
    return restored;
}

// The chapter is done: record it, queue a review if cover has filled, and
// show the closing card.
function closeChapter(play, view) {
    const next = clone(play);
    const chapter = currentChapter(next, view);
    next.completed.push(chapter.id);
    if (!next.flags.includes(`done:${chapter.id}`)) next.flags.push(`done:${chapter.id}`);
    next.phase = 'closed';
    next.history = [];
    const isReview = Object.values(view.reviews).some(r => r.id === chapter.id);
    if (isReview) {
        next.cover = Math.min(next.cover, COVER_AFTER_REVIEW);
        next.reviews++;
    } else if (next.cover >= COVER_MAX) {
        const review = view.reviews[chapter.tier] ?? view.reviews.any;
        if (review && !next.queue.includes(review.id)) next.queue.push(review.id);
    }
    return next;
}

// Playtest mode: start a fresh run at the given main-sequence chapter.
export function skipTo(view, chapterId) {
    const index = view.chapters.findIndex(c => c.id === chapterId);
    if (index < 0) throw new Error(`chapter "${chapterId}" is not in the main sequence`);
    const play = newPlay(view);
    play.position = index - 1;
    play.queue = [];
    return advance(play, view);
}

// From the closing card to whatever comes next.
export function nextChapter(play, view) {
    if (play.phase !== 'closed') return play;
    return advance(play, view);
}

// The SNAP jump for the current scene has been flown. A late jump raises
// cover a little: Aletheion notices delays.
export function finishJump(play, view, result) {
    const jump = pendingJump(play, view);
    if (!jump) return play;
    const next = clone(play);
    next.jumpDone = true;
    next.jumps.push({
        chapter: play.chapter,
        scene: play.scene,
        name: jump.name,
        tries: result.tries ?? 1,
        late: Boolean(result.late),
        auto: Boolean(result.auto),
    });
    if (result.late) {
        next.cover = clamp(next.cover + (jump.lateCover ?? 4), 0, COVER_MAX);
        next.journal.push({ chapter: play.chapter, kind: 'note', text: `Late on the ${jump.name} jump. Dispatch logged the delay.` });
    }
    return next;
}

// --------------------------------------------------------------- reports

// What the closing card of a chapter shows. Nothing here says whether a
// reading was right.
export function chapterSummary(play, view, chapterId = play.chapter) {
    const chapter = chapterById(view, chapterId);
    const readings = play.journal.filter(j => j.chapter === chapterId && j.kind === 'reading').map(j => j.text);
    const notes = play.journal.filter(j => j.chapter === chapterId && j.kind === 'note').map(j => j.text);
    const jumps = play.jumps.filter(j => j.chapter === chapterId);
    return {
        id: chapter.id,
        title: chapter.title,
        kind: chapter.kind,
        tier: chapter.tier,
        readings,
        notes,
        jumps,
        hintsSeen: play.hints.filter(h => h.chapter === chapterId).length,
        hintsTotal: hintsOf(chapter).length,
        cover: play.cover,
    };
}

// The debrief at the end: for every chapter played, each truth with the
// hints seen or missed and the readings marked right or misread.
export function debrief(play, view) {
    const seen = new Set(play.hints.map(h => `${h.chapter}/${h.id}`));
    const logged = new Set(play.logged.map(l => `${l.chapter}/${l.id}`));
    const chapters = [];
    for (const id of play.completed) {
        const chapter = chapterById(view, id);
        if (!chapter || !chapter.truths.length) continue;
        const hints = hintsOf(chapter);
        chapters.push({
            id,
            title: chapter.title,
            tier: chapter.tier,
            truths: chapter.truths.map(truth => {
                const readings = chapter.understandings
                    .filter(u => u.truth === truth.id && logged.has(`${id}/${u.id}`))
                    .map(u => ({ id: u.id, journal: u.journal, correct: u.correct }));
                return {
                    id: truth.id,
                    text: truth.text,
                    hints: hints.filter(h => h.truth === truth.id)
                        .map(h => ({ id: h.id, kind: h.kind, text: h.text, seen: seen.has(`${id}/${h.id}`) })),
                    readings,
                    read: readings.some(r => r.correct),
                    misread: readings.length > 0 && !readings.some(r => r.correct),
                };
            }),
        });
    }
    const truths = chapters.flatMap(c => c.truths);
    return {
        mode: play.mode,
        chapters,
        totals: {
            truths: truths.length,
            read: truths.filter(t => t.read).length,
            misread: truths.filter(t => t.misread).length,
            missed: truths.filter(t => !t.readings.length).length,
            hints: truths.reduce((n, t) => n + t.hints.length, 0),
            hintsSeen: truths.reduce((n, t) => n + t.hints.filter(h => h.seen).length, 0),
            jumps: play.jumps.length,
            lateJumps: play.jumps.filter(j => j.late).length,
            rewinds: play.rewinds,
            reviews: play.reviews,
            cover: play.cover,
        },
    };
}

// How well the player has read Aggie so far, as a share of the truths in
// completed chapters. The final act uses it to choose its path.
export function readingScore(play, view) {
    const d = debrief(play, view);
    return d.totals.truths ? d.totals.read / d.totals.truths : 0;
}

// A saved play is only trusted if it fits the content it was saved against.
export function validPlay(play, view) {
    if (!play || play.version !== FORMAT || play.mode !== view.mode) return false;
    if (play.phase === 'ended') return true;
    const chapter = currentChapter(play, view);
    if (!chapter) return false;
    if (!sceneById(chapter, play.scene)) return false;
    return Array.isArray(play.flags) && Array.isArray(play.journal);
}
