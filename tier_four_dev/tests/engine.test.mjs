// Unit tests for tier_four/js/engine.mjs, run by checks/engine.mjs. They use
// the contract the game loads, tier_four/data/contracts/example-contract.json
// (the valid fixture, with journal text that does not give away the answer),
// plus small changes to it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GAME_DIR } from '../lib/paths.mjs';
import {
    actionsOf, canTake, debrief, endContract, journal, nextHint, seenHints, startPlay, takeAction, viewContract,
} from '../../tier_four/js/engine.mjs';

const CONTRACT = JSON.parse(fs.readFileSync(path.join(GAME_DIR, 'data', 'contracts', 'example-contract.json'), 'utf8'));
const copy = () => structuredClone(CONTRACT);
const ids = list => list.map(x => x.id);

// IDs in the contract tagged reader-only, or tied to a reader-only truth.
const READER_ONLY = ['truth-b', 'hint-b1', 'und-b'];

function playThrough(mode, actions) {
    let play = startPlay(CONTRACT, mode);
    for (let i = 0; i < play.view.hints.length; i++) play = nextHint(play);
    for (const a of actions) play = takeAction(play, a);
    return endContract(play);
}

export const tests = {
    'loading: spoiler-free mode sees only items shown in that mode'() {
        const view = viewContract(CONTRACT, 'spoiler-free');
        assert.deepEqual(ids(view.truths), ['truth-a']);
        assert.deepEqual(ids(view.hints), ['hint-a1', 'hint-a2']);
        assert.deepEqual(ids(view.understandings), ['und-a', 'und-a-misread']);
    },

    'loading: reader mode sees everything in this contract'() {
        const view = viewContract(CONTRACT, 'reader');
        assert.deepEqual(ids(view.truths), ['truth-a', 'truth-b']);
        assert.deepEqual(ids(view.hints), ['hint-a1', 'hint-a2', 'hint-b1']);
        assert.deepEqual(ids(view.understandings), ['und-a', 'und-a-misread', 'und-b']);
    },

    'loading: refuses an unknown mode, a wrong format and a contract not shown in the mode'() {
        assert.throws(() => viewContract(CONTRACT, 'both'), /unknown mode/);
        assert.throws(() => viewContract({ ...copy(), format: 2 }, 'reader'), /format must be 1/);
        assert.throws(() => viewContract({ ...copy(), mode: 'reader' }, 'spoiler-free'), /not shown in spoiler-free/);
    },

    'loading: hides an item whose truth is hidden, even if the item itself is tagged both'() {
        const c = copy();
        c.hints.find(h => h.id === 'hint-b1').mode = 'both';
        assert.ok(!ids(viewContract(c, 'spoiler-free').hints).includes('hint-b1'));
    },

    'loading: the view does not change when the contract is changed afterwards'() {
        const c = copy();
        const view = viewContract(c, 'reader');
        c.truths.push({ id: 'truth-c', mode: 'both', text: 'Added later.' });
        assert.equal(view.truths.length, 2);
    },

    'modes: nothing reader-only reaches any part of a spoiler-free play'() {
        let play = startPlay(CONTRACT, 'spoiler-free');
        const seen = [JSON.stringify(play)];
        for (let i = 0; i < 5; i++) seen.push(JSON.stringify(play = nextHint(play)));
        for (const a of actionsOf(play.view)) seen.push(JSON.stringify(play = takeAction(play, a)));
        seen.push(JSON.stringify(journal(play)));
        play = endContract(play);
        seen.push(JSON.stringify(play), JSON.stringify(debrief(play)));
        for (const id of READER_ONLY) {
            assert.ok(!seen.some(s => s.includes(`"${id}"`)), `${id} leaked into spoiler-free play`);
        }
        const text = [...CONTRACT.truths, ...CONTRACT.hints].filter(x => READER_ONLY.includes(x.id)).map(x => x.text);
        for (const t of text) assert.ok(!seen.some(s => s.includes(t)), `"${t}" leaked into spoiler-free play`);
    },

    'modes: a reader play and a spoiler-free play share no state'() {
        const free = takeAction(startPlay(CONTRACT, 'spoiler-free'), 'decline-leg');
        const reader = startPlay(CONTRACT, 'reader');
        assert.deepEqual(reader.logged, []);
        assert.deepEqual(reader.actions, []);
        assert.deepEqual(free.logged, ['und-a-misread']);
    },

    'hints: arrive one at a time, in contract order, and stop at the last'() {
        let play = startPlay(CONTRACT, 'reader');
        assert.deepEqual(seenHints(play), []);
        play = nextHint(play);
        assert.deepEqual(ids(seenHints(play)), ['hint-a1']);
        play = nextHint(nextHint(play));
        assert.deepEqual(ids(seenHints(play)), ['hint-a1', 'hint-a2', 'hint-b1']);
        assert.equal(nextHint(play), play);
    },

    'hints: none arrive after the contract ends'() {
        const play = endContract(startPlay(CONTRACT, 'reader'));
        assert.equal(nextHint(play).hintsSeen, 0);
    },

    'actions: each distinct action is offered once, in order of first appearance'() {
        assert.deepEqual(actionsOf(viewContract(CONTRACT, 'reader')), ['inspect-cargo', 'decline-leg']);
        assert.deepEqual(actionsOf(viewContract(CONTRACT, 'spoiler-free')), ['inspect-cargo', 'decline-leg']);
    },

    'actions: an action logs every understanding in the mode that uses it'() {
        assert.deepEqual(takeAction(startPlay(CONTRACT, 'reader'), 'decline-leg').logged, ['und-a-misread', 'und-b']);
        assert.deepEqual(takeAction(startPlay(CONTRACT, 'spoiler-free'), 'decline-leg').logged, ['und-a-misread']);
    },

    'actions: can be taken before any hint, and only once'() {
        let play = takeAction(startPlay(CONTRACT, 'reader'), 'inspect-cargo');
        assert.deepEqual(play.logged, ['und-a']);
        assert.equal(canTake(play, 'inspect-cargo'), false);
        assert.equal(takeAction(play, 'inspect-cargo'), play);
    },

    'actions: an unknown action, or one after the end, changes nothing'() {
        const play = startPlay(CONTRACT, 'reader');
        assert.equal(takeAction(play, 'fly-to-the-moon'), play);
        const ended = endContract(play);
        assert.equal(takeAction(ended, 'inspect-cargo'), ended);
    },

    'actions: never say whether a reading was right during play'() {
        const play = takeAction(startPlay(CONTRACT, 'reader'), 'decline-leg');
        assert.deepEqual(journal(play), [
            'Placeholder journal entry, logged after declining the leg.',
            'A second placeholder journal entry, logged after declining the leg.',
        ]);
        assert.ok(journal(play).every(entry => typeof entry === 'string'), 'journal entries are text only');
    },

    'plays: are never changed in place'() {
        const play = startPlay(CONTRACT, 'reader');
        const before = JSON.stringify(play);
        endContract(takeAction(nextHint(play), 'inspect-cargo'));
        assert.equal(JSON.stringify(play), before);
    },

    'debrief: only after the contract ends'() {
        assert.throws(() => debrief(startPlay(CONTRACT, 'reader')), /has not ended/);
    },

    'debrief: shows hints seen and missed, and readings marked right or misread'() {
        let play = startPlay(CONTRACT, 'reader');
        play = takeAction(nextHint(play), 'decline-leg');
        const report = debrief(endContract(play));
        assert.equal(report.mode, 'reader');
        const [a, b] = report.truths;
        assert.deepEqual(a.hints.map(h => [h.id, h.seen]), [['hint-a1', true], ['hint-a2', false]]);
        assert.deepEqual(a.readings.map(r => [r.id, r.correct]), [['und-a-misread', false]]);
        assert.equal(a.read, false);
        assert.deepEqual(b.hints.map(h => [h.id, h.seen]), [['hint-b1', false]]);
        assert.deepEqual(b.readings.map(r => [r.id, r.correct]), [['und-b', true]]);
        assert.equal(b.read, true);
    },

    'debrief: a truth counts as read when a correct reading is logged, even beside a misreading'() {
        const report = debrief(playThrough('spoiler-free', ['decline-leg', 'inspect-cargo']));
        assert.equal(report.truths.length, 1);
        assert.equal(report.truths[0].read, true);
        assert.deepEqual(report.truths[0].readings.map(r => r.id), ['und-a', 'und-a-misread']);
    },

    'debrief: a contract with no truths ends with an empty debrief'() {
        const c = { ...copy(), sequence: 'side', truths: [], hints: [], understandings: [] };
        const report = debrief(endContract(startPlay(c, 'spoiler-free')));
        assert.deepEqual(report.truths, []);
    },
};
