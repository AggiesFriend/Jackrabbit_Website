// Site rules from CLAUDE.md:
// - every standalone page carries the umami snippet; internal files don't;
// - in tier_four/, the snippet sits immediately before </head>;
// - local links and assets in tier_four/ pages point at files that exist.
// Links in the rest of the site are not checked, so older pages can't block
// game work.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT } from '../lib/paths.mjs';

const SNIPPET = '<script defer src="https://cloud.umami.is/script.js" data-website-id="49bd03b2-61a5-4ce1-b653-a2d3f4f22441"></script>';

// Files that must NOT carry the snippet (see CLAUDE.md).
const INTERNAL = [
    /^Aggie_game\/scenes\/[^/]+\.html$/,
    /^googlecee4a38f115d2f04\.html$/,
];

const isInternal = file => INTERNAL.some(re => re.test(file));

async function siteHtmlFiles() {
    // Tracked files plus new, untracked ones, so a page is checked before
    // it is first committed.
    const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.html'],
        { cwd: REPO_ROOT, encoding: 'utf8' });
    const files = out.split('\n').map(s => s.trim()).filter(Boolean);
    const existing = [];
    for (const f of new Set(files)) {
        if (f.startsWith('tier_four_dev/')) continue;
        try {
            await fs.access(path.join(REPO_ROOT, f));
            existing.push(f);
        } catch { /* deleted in the working tree */ }
    }
    return existing.sort();
}

function localRefs(html) {
    const refs = [];
    const re = /\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi;
    let m;
    while ((m = re.exec(html))) refs.push(m[2]);
    return refs.filter(r => r && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(r));
}

export default async function checkSiteRules() {
    const problems = [];
    const files = await siteHtmlFiles();

    for (const file of files) {
        const html = await fs.readFile(path.join(REPO_ROOT, file), 'utf8');
        const has = html.includes('cloud.umami.is');
        if (isInternal(file) && has) problems.push(`${file}: internal file carries the umami snippet`);
        if (!isInternal(file) && !has) problems.push(`${file}: standalone page is missing the umami snippet`);
    }

    const gamePages = files.filter(f => f.startsWith('tier_four/'));
    for (const file of gamePages) {
        const html = await fs.readFile(path.join(REPO_ROOT, file), 'utf8');
        if (!isInternal(file) && !/<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="49bd03b2-61a5-4ce1-b653-a2d3f4f22441"><\/script>\s*<\/head>/.test(html)) {
            problems.push(`${file}: the umami snippet must sit immediately before </head>, exactly as in CLAUDE.md`);
        }
        if (html.split(SNIPPET).length > 2) problems.push(`${file}: the umami snippet appears more than once`);

        for (const ref of localRefs(html)) {
            const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
            if (!clean) continue;
            let target = clean.startsWith('/')
                ? path.join(REPO_ROOT, clean)
                : path.resolve(path.dirname(path.join(REPO_ROOT, file)), clean);
            if (clean.endsWith('/')) target = path.join(target, 'index.html');
            try {
                await fs.access(target);
            } catch {
                problems.push(`${file}: broken local link or asset "${ref}"`);
            }
        }
    }

    return {
        name: 'Site rules',
        problems,
        summary: `${files.length} page(s) checked for umami, ${gamePages.length} Tier Four page(s) checked for links`,
    };
}
