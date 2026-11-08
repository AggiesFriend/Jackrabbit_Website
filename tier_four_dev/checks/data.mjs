// Data validation: every JSON file in tier_four/ must parse. Field and
// reference checks for contracts, dialogue and hints are added here as each
// data format is agreed (phase 1 onwards).
import fs from 'node:fs/promises';
import path from 'node:path';
import { GAME_DIR, REPO_ROOT } from '../lib/paths.mjs';

async function listJson(dir) {
    const found = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) found.push(...await listJson(full));
        else if (entry.name.toLowerCase().endsWith('.json')) found.push(full);
    }
    return found;
}

export default async function checkData() {
    const problems = [];
    const files = await listJson(GAME_DIR);
    for (const file of files) {
        try {
            JSON.parse(await fs.readFile(file, 'utf8'));
        } catch (err) {
            problems.push(`${path.relative(REPO_ROOT, file)}: ${err.message}`);
        }
    }
    return {
        name: 'Data validation',
        problems,
        summary: `${files.length} JSON file(s) checked`,
    };
}
