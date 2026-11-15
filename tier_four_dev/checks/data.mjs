// Data validation:
// - every JSON file in tier_four/ must parse;
// - the campaign and every chapter in tier_four/data/ must match the
//   chapter format (lib/chapter.mjs): fields, references, spoiler tags,
//   reachability;
// - self-test: the sample chapters in fixtures/chapters/valid/ pass, and
//   every broken one in fixtures/chapters/invalid/ fails with the problem
//   listed for it in expected.json.
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEV_DIR, GAME_DIR, REPO_ROOT } from '../lib/paths.mjs';
import { validateCampaign } from '../lib/chapter.mjs';

const DATA_DIR = path.join(GAME_DIR, 'data');
const CHAPTER_DIR = path.join(DATA_DIR, 'chapters');
const FIXTURE_DIR = path.join(DEV_DIR, 'fixtures', 'chapters');

async function listJson(dir) {
    const found = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) found.push(...await listJson(full));
        else if (entry.name.toLowerCase().endsWith('.json')) found.push(full);
    }
    return found.sort();
}

const relative = file => path.relative(REPO_ROOT, file).replaceAll('\\', '/');

// Reads JSON files as entries. Files that don't parse are left out, since
// they are reported by the parse check.
async function readEntries(files) {
    const entries = [];
    for (const file of files) {
        try {
            entries.push({ name: relative(file), data: JSON.parse(await fs.readFile(file, 'utf8')) });
        } catch { /* reported elsewhere */ }
    }
    return entries;
}

// A fixture is a folder with a campaign.json and its chapter files, or a
// single chapter file checked against a minimal campaign of its own.
async function readFixture(full) {
    if ((await fs.stat(full)).isDirectory()) {
        const files = await listJson(full);
        const campaignFile = files.find(f => path.basename(f) === 'campaign.json');
        const campaign = campaignFile ? JSON.parse(await fs.readFile(campaignFile, 'utf8')) : null;
        return { campaign, entries: await readEntries(files.filter(f => f !== campaignFile)) };
    }
    const [entry] = await readEntries([full]);
    const id = entry?.data?.id;
    return {
        campaign: { format: 2, title: 'Fixture', chapters: typeof id === 'string' ? [id] : [], speakers: { aggie: { name: 'Aggie' }, frank: { name: 'Frank' } } },
        entries: entry ? [entry] : [],
    };
}

async function selfTest(problems) {
    const validDir = path.join(FIXTURE_DIR, 'valid');
    const validCases = await fs.readdir(validDir);
    for (const name of validCases) {
        const { campaign, entries } = await readFixture(path.join(validDir, name));
        for (const p of validateCampaign(campaign, entries)) problems.push(`self-test: valid sample ${name} was rejected: ${p}`);
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
        const { campaign, entries } = await readFixture(full);
        const found = validateCampaign(campaign, entries);
        if (!found.some(p => p.includes(expected[name].expect))) {
            problems.push(`self-test: ${relative(full)} (${expected[name].why}) should fail with `
                + `"${expected[name].expect}", but got: ${found.length ? found.join('; ') : 'no problems'}`);
        }
    }
    const listed = Object.keys(expected).filter(name => !cases.some(c => c.replace(/\.json$/i, '') === name));
    for (const name of listed) problems.push(`self-test: expected.json lists "${name}", but there is no such fixture`);
    return { valid: validCases.length, invalid: cases.length };
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

    let chapterCount = 0;
    try {
        const campaign = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'campaign.json'), 'utf8'));
        const entries = await readEntries(await listJson(CHAPTER_DIR));
        chapterCount = entries.length;
        problems.push(...validateCampaign(campaign, entries));
    } catch (err) {
        problems.push(`tier_four/data/campaign.json: ${err.message}`);
    }

    // Links in lines, written [text](url), must be relative paths to pages
    // that exist; they resolve from tier_four/.
    let links = 0;
    for (const file of await listJson(CHAPTER_DIR)) {
        let chapter;
        try {
            chapter = JSON.parse(await fs.readFile(file, 'utf8'));
        } catch { continue; }
        for (const scene of chapter.scenes ?? []) {
            for (const line of scene.lines ?? []) {
                for (const m of String(line.text ?? '').matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
                    links++;
                    const target = m[2].split('#')[0];
                    if (/^[a-z]+:|^\/\//i.test(target)) {
                        problems.push(`${relative(file)}: scene ${scene.id}: link "${m[2]}" must be a relative path to a page on this site`);
                        continue;
                    }
                    const full = path.resolve(GAME_DIR, target);
                    if (!full.startsWith(REPO_ROOT) || !await fs.access(full).then(() => true, () => false)) {
                        problems.push(`${relative(file)}: scene ${scene.id}: link "${m[2]}" points at a page that doesn't exist`);
                    }
                }
            }
        }
    }

    // Character pages named in the campaign must exist.
    try {
        const campaign = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'campaign.json'), 'utf8'));
        for (const [key, who] of Object.entries(campaign.characters ?? {})) {
            links++;
            const full = path.resolve(GAME_DIR, String(who?.page ?? ''));
            if (!full.startsWith(REPO_ROOT) || !await fs.access(full).then(() => true, () => false)) {
                problems.push(`tier_four/data/campaign.json: character "${key}" page "${who?.page}" doesn't exist`);
            }
        }
    } catch { /* reported above */ }

    const tested = await selfTest(problems);
    return {
        name: 'Data validation',
        problems,
        summary: `${files.length} JSON file(s) parsed, ${chapterCount} chapter(s) validated, ${links} link(s) checked; `
            + `self-test: ${tested.valid} valid sample(s), ${tested.invalid} broken case(s)`,
    };
}
