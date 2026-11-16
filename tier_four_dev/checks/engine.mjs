// Engine unit tests: runs every test in tests/*.test.mjs against the game's
// own engine modules in tier_four/js/. A test fails if it throws.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEV_DIR } from '../lib/paths.mjs';

const TEST_DIR = path.join(DEV_DIR, 'tests');

export default async function checkEngine() {
    const problems = [];
    let count = 0;
    const files = (await fs.readdir(TEST_DIR)).filter(f => f.endsWith('.test.mjs'));
    for (const file of files) {
        const { tests } = await import(pathToFileURL(path.join(TEST_DIR, file)));
        for (const [name, run] of Object.entries(tests)) {
            count++;
            try {
                await run();
            } catch (err) {
                problems.push(`${file}: ${name}: ${err.message.split('\n')[0]}`);
            }
        }
    }
    if (!count) problems.push('no engine tests found');
    return {
        name: 'Engine unit tests',
        problems,
        summary: `${count} test(s) in ${files.length} file(s)`,
    };
}
