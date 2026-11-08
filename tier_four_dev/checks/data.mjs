// Data validation:
// - every JSON file in tier_four/ must parse;
// - contracts in tier_four/data/contracts/ must match the contract format
//   (lib/contract.mjs): fields, references between items, spoiler tags;
// - self-test: the sample contracts in fixtures/contracts/valid/ pass, and
//   every broken one in fixtures/contracts/invalid/ fails with the problem
//   listed for it in expected.json.
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEV_DIR, GAME_DIR, REPO_ROOT } from '../lib/paths.mjs';
import { validateContracts } from '../lib/contract.mjs';

const CONTRACT_DIR = path.join(GAME_DIR, 'data', 'contracts');
const FIXTURE_DIR = path.join(DEV_DIR, 'fixtures', 'contracts');

async function listJson(dir) {
    const found = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) found.push(...await listJson(full));
        else if (entry.name.toLowerCase().endsWith('.json')) found.push(full);
    }
    return found;
}

const exists = dir => fs.access(dir).then(() => true, () => false);
const relative = file => path.relative(REPO_ROOT, file).replaceAll('\\', '/');

// Reads JSON files as contract entries. Files that don't parse are left out,
// since they are reported by the parse check.
async function readContracts(files) {
    const entries = [];
    for (const file of files) {
        try {
            entries.push({ name: relative(file), data: JSON.parse(await fs.readFile(file, 'utf8')) });
        } catch { /* reported elsewhere */ }
    }
    return entries;
}

async function selfTest(problems) {
    const valid = await listJson(path.join(FIXTURE_DIR, 'valid'));
    for (const p of validateContracts(await readContracts(valid))) {
        problems.push(`self-test: a valid sample was rejected: ${p}`);
    }

    const invalidDir = path.join(FIXTURE_DIR, 'invalid');
    const expected = JSON.parse(await fs.readFile(path.join(invalidDir, 'expected.json'), 'utf8'));
    const cases = (await fs.readdir(invalidDir)).filter(name => name !== 'expected.json');
    for (const entry of cases) {
        const name = entry.replace(/\.json$/i, '');
        const full = path.join(invalidDir, entry);
        if (!expected[name]) {
            problems.push(`self-test: ${relative(full)} has no entry in expected.json`);
            continue;
        }
        const files = (await fs.stat(full)).isDirectory() ? await listJson(full) : [full];
        const found = validateContracts(await readContracts(files));
        if (!found.some(p => p.includes(expected[name].expect))) {
            problems.push(`self-test: ${relative(full)} (${expected[name].why}) should fail with `
                + `"${expected[name].expect}", but got: ${found.length ? found.join('; ') : 'no problems'}`);
        }
    }
    const listed = Object.keys(expected).filter(name => !cases.some(c => c.replace(/\.json$/i, '') === name));
    for (const name of listed) problems.push(`self-test: expected.json lists "${name}", but there is no such fixture`);
    return { valid: valid.length, invalid: cases.length };
}

export default async function checkData() {
    const problems = [];
    const files = await listJson(GAME_DIR);
    for (const file of files) {
        try {
            JSON.parse(await fs.readFile(file, 'utf8'));
        } catch (err) {
            problems.push(`${relative(file)}: ${err.message}`);
        }
    }

    const contractFiles = await exists(CONTRACT_DIR) ? await listJson(CONTRACT_DIR) : [];
    problems.push(...validateContracts(await readContracts(contractFiles)));

    const tested = await selfTest(problems);
    return {
        name: 'Data validation',
        problems,
        summary: `${files.length} JSON file(s) parsed, ${contractFiles.length} contract(s) validated; `
            + `self-test: ${tested.valid} valid sample(s), ${tested.invalid} broken case(s)`,
    };
}
