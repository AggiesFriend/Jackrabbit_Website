// Unit tests for tier_four/js/storage.mjs, run by checks/engine.mjs.
import assert from 'node:assert/strict';
import { settings } from '../../tier_four/js/storage.mjs';

function memory() {
    const data = new Map();
    return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
}

export const tests = {
    'storage: saves and reads back a setting, under the game\'s own prefix'() {
        const store = memory();
        const s = settings(() => store);
        assert.equal(s.get('mode', 'spoiler-free'), 'spoiler-free');
        assert.equal(s.set('mode', 'reader'), true);
        assert.equal(s.get('mode', 'spoiler-free'), 'reader');
        assert.deepEqual([...store.data.keys()], ['tier-four.mode']);
    },

    'storage: falls back to the default when reading storage throws'() {
        const s = settings(() => { throw new Error('SecurityError'); });
        assert.equal(s.get('mode', 'spoiler-free'), 'spoiler-free');
        assert.equal(s.set('mode', 'reader'), false);
    },

    'storage: falls back when getItem or setItem throws, or there is no storage'() {
        const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
        const s = settings(() => throwing);
        assert.equal(s.get('mode', 'spoiler-free'), 'spoiler-free');
        assert.equal(s.set('mode', 'reader'), false);
        assert.equal(settings(() => undefined).get('mode', 'x'), 'x');
    },
};
