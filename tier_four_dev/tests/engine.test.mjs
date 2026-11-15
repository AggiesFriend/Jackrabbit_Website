// Unit tests for tier_four/js/engine.mjs, run by checks/engine.mjs. They use
// the sample campaign in fixtures/chapters/valid/sample/, plus small changes
// to it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEV_DIR } from '../lib/paths.mjs';
import {
    beginChapter, canRewind, chapterSummary, choose, debrief, finishJump, hintsOf, newPlay, nextChapter,
    pendingJump, proceed, readingScore, reveal, rewind, validPlay, viewCampaign, viewChapter, visibleChoices,
    visibleLines,
} from '../../tier_four/js/engine.mjs';

const DIR = path.join(DEV_DIR, 'fixtures', 'chapters', 'valid', 'sample');
const read = name => JSON.parse(fs.readFileSync(path.join(DIR, `${name}.json`), 'utf8'));
const CAMPAIGN = read('campaign');
const CHAPTERS = Object.fromEntries(['sample-contract', 'sample-scene', 'sample-review'].map(id => [id, read(id)]));
const view = (mode, chapters = CHAPTERS, campaign = CAMPAIGN) => viewCampaign(campaign, structuredClone(chapters), mode);
const ids = list => list.map(x => x.id);
const texts = list => list.map(x => x.text);

// Everything in the sample that only reader mode may see.
const READER_ONLY = ['truth-b', 'hint-b1', 'und-b', 'sample-scene', 'Placeholder short reply', 'Ask about the tag', 'reader-only scene'];

// Through the brief and the jump into the first scene, with every line shown.
function opened(v) {
    let play = beginChapter(newPlay(v));
    play = finishJump(play, v, { tries: 1 });
    return reveal(play, v, 99);
}

export const tests = {
    'view: spoiler-free mode sees only items shown in that mode'() {
        const v = view('spoiler-free');
        assert.deepEqual(ids(v.chapters), ['sample-contract']);
        const c = v.chapters[0];
        assert.deepEqual(ids(c.truths), ['truth-a']);
        assert.deepEqual(ids(c.understandings), ['und-a', 'und-a-misread']);
        assert.deepEqual(ids(hintsOf(c)), ['hint-a1', 'hint-a2']);
        assert.deepEqual(texts(c.scenes[0].choices).length, 3);
    },

    'view: reader mode sees everything'() {
        const v = view('reader');
        assert.deepEqual(ids(v.chapters), ['sample-contract', 'sample-scene']);
        const c = v.chapters[0];
        assert.deepEqual(ids(c.truths), ['truth-a', 'truth-b']);
        assert.deepEqual(ids(hintsOf(c)), ['hint-a1', 'hint-b1', 'hint-a2']);
        assert.equal(c.scenes[0].choices.length, 4);
        assert.equal(v.reviews.any.id, 'sample-review');
    },

    'view: refuses an unknown mode, a wrong format and a chapter not shown in the mode'() {
        assert.throws(() => viewChapter(CHAPTERS['sample-contract'], 'both'), /unknown mode/);
        assert.throws(() => viewChapter({ ...CHAPTERS['sample-contract'], format: 1 }, 'reader'), /format must be 2/);
        assert.throws(() => viewChapter(CHAPTERS['sample-scene'], 'spoiler-free'), /not shown in spoiler-free/);
    },

    'view: a hint whose truth is hidden is left out even if the line is tagged both'() {
        const chapters = structuredClone(CHAPTERS);
        chapters['sample-contract'].scenes[0].lines[2].mode = 'both';
        const v = view('spoiler-free', chapters);
        assert.ok(!ids(hintsOf(v.chapters[0])).includes('hint-b1'));
    },

    'spoilers: nothing reader-only is anywhere in a spoiler-free play, by ID or by text'() {
        const v = view('spoiler-free');
        let play = opened(v);
        play = choose(play, v, 0);
        play = proceed(play, v);
        play = proceed(play, v);
        const everything = JSON.stringify([v, play, debrief(play, v)]);
        for (const word of READER_ONLY) assert.ok(!everything.includes(word), `leaked: ${word}`);
    },

    'play: a new play starts at the contract card of the first chapter'() {
        const v = view('spoiler-free');
        const play = newPlay(v);
        assert.equal(play.chapter, 'sample-contract');
        assert.equal(play.phase, 'brief');
        assert.equal(play.scene, 'arrive');
        assert.equal(play.cover, 0);
    },

    'play: the first scene asks for its jump before anything else, once'() {
        const v = view('spoiler-free');
        let play = beginChapter(newPlay(v));
        assert.equal(pendingJump(play, v).name, 'Placeholder approach');
        play = finishJump(play, v, { tries: 2 });
        assert.equal(pendingJump(play, v), null);
        assert.equal(play.jumps.length, 1);
        assert.equal(finishJump(play, v, { tries: 1 }), play);
    },

    'play: a late jump raises cover and leaves a note'() {
        const v = view('spoiler-free');
        const play = finishJump(beginChapter(newPlay(v)), v, { tries: 4, late: true });
        assert.equal(play.cover, 4);
        assert.match(play.journal[0].text, /Late on the Placeholder approach jump/);
    },

    'lines: a line with requires only shows once its flag is set'() {
        const v = view('spoiler-free');
        const play = opened(v);
        assert.equal(visibleLines(play, v).length, 2);
        const met = { ...play, flags: [...play.flags, 'met-frank'] };
        assert.equal(visibleLines(met, v).length, 3);
    },

    'hints: revealing lines records the hints reached, and only those'() {
        const v = view('reader');
        let play = beginChapter(newPlay(v));
        play = finishJump(play, v, { tries: 1 });
        play = reveal(play, v, 2);
        assert.deepEqual(play.hints, [{ chapter: 'sample-contract', id: 'hint-a1' }]);
        play = reveal(play, v, 1);
        assert.equal(play.shown, 2, 'revealing fewer lines changes nothing');
        play = reveal(play, v, 3);
        assert.deepEqual(ids(play.hints), ['hint-a1', 'hint-b1']);
    },

    'choices: taking one applies its effects, logs its understandings and moves on'() {
        const v = view('spoiler-free');
        const before = opened(v);
        const play = choose(before, v, 0);
        assert.equal(play.scene, 'inspect');
        assert.equal(play.cover, 6);
        assert.deepEqual(play.logged, [{ chapter: 'sample-contract', id: 'und-a' }]);
        assert.ok(play.flags.includes('read:truth-a'));
        assert.ok(play.flags.includes('logged:und-a'));
        assert.ok(play.flags.includes('inspected'), 'the scene\'s enter effects apply');
        assert.deepEqual(texts(play.journal), ['Placeholder journal entry after inspecting the crate.', 'Placeholder note.']);
        assert.equal(before.scene, 'arrive', 'the old play is untouched');
        assert.equal(before.cover, 0);
    },

    'choices: a misreading is logged without being marked, and sets misread:<truth>'() {
        const v = view('spoiler-free');
        const play = choose(opened(v), v, 1);
        assert.ok(play.flags.includes('misread:truth-a'));
        assert.ok(!play.flags.includes('read:truth-a'));
        assert.equal(play.cover, 0, 'cover cannot go below zero');
        assert.ok(!JSON.stringify(play.journal).includes('correct'));
    },

    'choices: an out-of-range or hidden choice does nothing'() {
        const v = view('spoiler-free');
        const play = opened(v);
        assert.equal(choose(play, v, 7), play);
        assert.equal(visibleChoices(play, v).length, 3);
    },

    'flow: proceed follows next, then end closes the chapter'() {
        const v = view('spoiler-free');
        let play = choose(opened(v), v, 0);
        play = proceed(play, v);
        assert.equal(play.scene, 'deliver');
        play = proceed(play, v);
        assert.equal(play.phase, 'closed');
        assert.deepEqual(play.completed, ['sample-contract']);
        assert.ok(play.flags.includes('done:sample-contract'));
    },

    'flow: a chapter whose requirements fail is skipped'() {
        const v = view('reader');
        let play = choose(opened(v), v, 1);  // misread truth A
        play = proceed(play, v);
        play = nextChapter(play, v);
        assert.equal(play.phase, 'ended', 'sample-scene needs read:truth-a');
        let good = choose(opened(v), v, 0);
        good = proceed(proceed(good, v), v);
        good = nextChapter(good, v);
        assert.equal(good.chapter, 'sample-scene');
        assert.equal(good.phase, 'scene', 'a scene chapter has no contract card');
    },

    'flow: a canon-breaking choice rewinds to the scene it came from'() {
        const v = view('spoiler-free');
        const before = opened(v);
        let play = choose(before, v, 2);
        assert.equal(play.scene, 'refuse');
        play = proceed(play, v);
        assert.equal(play.scene, 'arrive');
        assert.equal(play.rewinds, 1);
        assert.equal(play.history.length, 0);
        assert.equal(play.shown, 0);
    },

    'rewind: goes back to before the last choice and counts it'() {
        const v = view('spoiler-free');
        const before = opened(v);
        let play = choose(before, v, 0);
        assert.ok(canRewind(play));
        play = rewind(play);
        assert.equal(play.scene, 'arrive');
        assert.equal(play.cover, 0);
        assert.deepEqual(play.logged, []);
        assert.equal(play.rewinds, 1);
        assert.ok(!canRewind(play));
        assert.equal(rewind(play), play);
    },

    'cover: filling the meter queues the review after the chapter, which resets it'() {
        const chapters = structuredClone(CHAPTERS);
        chapters['sample-contract'].scenes[0].choices[0].cover = 100;
        const v = view('spoiler-free', chapters);
        let play = choose(opened(v), v, 0);
        assert.equal(play.cover, 100);
        play = proceed(proceed(play, v), v);
        assert.deepEqual(play.queue, ['sample-review']);
        play = nextChapter(play, v);
        assert.equal(play.chapter, 'sample-review');
        play = reveal(play, v, 9);
        play = choose(play, v, 0);
        assert.equal(play.phase, 'closed');
        assert.equal(play.cover, 55);
        assert.equal(play.reviews, 1);
        assert.equal(nextChapter(play, v).phase, 'ended');
    },

    'trust: conditions on trust and cover work in requires'() {
        const v = view('reader');
        let play = choose(opened(v), v, 0);
        play = nextChapter(proceed(proceed(play, v), v), v);
        play = choose(reveal(play, v, 9), v, 0);
        assert.equal(play.trust.frank, 1);
        const { holds } = awaitImport();
        assert.ok(holds(play, 'trust.frank>=1'));
        assert.ok(!holds(play, 'trust.frank>1'));
        assert.ok(holds(play, 'cover<10'));
        assert.ok(holds(play, 'done:sample-contract'));
    },

    'summary: the closing card never says whether a reading was right'() {
        const v = view('spoiler-free');
        let play = choose(opened(v), v, 1);
        play = proceed(play, v);
        const s = chapterSummary(play, v);
        assert.equal(s.title, 'Sample contract');
        assert.equal(s.hintsSeen, 1);
        assert.equal(s.hintsTotal, 2);
        assert.deepEqual(s.readings, ['Placeholder journal entry after waving the crate through.']);
        assert.ok(!JSON.stringify(s).match(/correct|misread|right/i));
    },

    'debrief: hints seen or missed, readings right or misread, per truth'() {
        const v = view('reader');
        let play = choose(opened(v), v, 1);
        play = proceed(play, v);
        const d = debrief(play, v);
        assert.equal(d.chapters.length, 1);
        const [a, b] = d.chapters[0].truths;
        assert.equal(a.misread, true);
        assert.equal(a.read, false);
        assert.deepEqual(a.hints.map(h => [h.id, h.seen]), [['hint-a1', true], ['hint-a2', false]]);
        assert.equal(a.hints[0].kind, 'question');
        assert.equal(b.readings.length, 0);
        assert.equal(d.totals.truths, 2);
        assert.equal(d.totals.missed, 1);
        assert.equal(d.totals.misread, 1);
        assert.equal(readingScore(play, v), 0);
    },

    'debrief: refuses nothing and counts the read truths'() {
        const v = view('spoiler-free');
        let play = choose(opened(v), v, 0);
        play = proceed(proceed(play, v), v);
        assert.equal(debrief(play, v).totals.read, 1);
        assert.equal(readingScore(play, v), 1);
    },

    'save: a play survives JSON and is checked against its view'() {
        const v = view('spoiler-free');
        const play = choose(opened(v), v, 0);
        const back = JSON.parse(JSON.stringify(play));
        assert.ok(validPlay(back, v));
        assert.ok(!validPlay(back, view('reader')), 'a save belongs to one mode');
        assert.ok(!validPlay({ ...back, scene: 'gone' }, v));
        assert.ok(!validPlay({ ...back, version: 1 }, v));
        assert.equal(proceed(back, v).scene, 'deliver');
    },
};

// holds() is a named export too; imported lazily so the list above stays
// readable.
function awaitImport() {
    return { holds: holdsRef };
}
import { holds as holdsRef } from '../../tier_four/js/engine.mjs';
