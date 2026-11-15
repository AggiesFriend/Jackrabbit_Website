// Scripted play-through: the whole career can be finished in both modes,
// by touch at the design phone size and by mouse on desktop, with several
// seeded choice policies, and nothing reader-only is ever shown in
// spoiler-free mode (the spoiler graph check, Q7, on what play actually
// reaches).
//
// TF_RUNS=reader:42:phone,spoiler-free:7:desktop narrows a run. A failed
// run says where it stopped and leaves a screenshot in screenshots/.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { startServer } from '../lib/server.mjs';
import { SCREENSHOT_DIR } from '../lib/paths.mjs';
import { prepare, playThrough, seeded, startCareer } from '../lib/autoplay.mjs';

// Phrases that only reader mode may ever show. Kept short and distinctive.
const READER_ONLY = [
    'shut up about the Starling device',
    'destruct sequence',
    'Morning Eclipse',
    'two of her',
    'legal owner of the hardware',
    'Tier 5',
];

const RUNS = [
    { mode: 'spoiler-free', seed: 1, phone: true },
    { mode: 'spoiler-free', seed: 7, phone: false },
    { mode: 'spoiler-free', seed: 42, phone: true },
    { mode: 'reader', seed: 1, phone: true },
    { mode: 'reader', seed: 7, phone: false },
    { mode: 'reader', seed: 42, phone: true },
];

const key = r => `${r.mode}:${r.seed}:${r.phone ? 'phone' : 'desktop'}`;
const selected = process.env.TF_RUNS ? RUNS.filter(r => process.env.TF_RUNS.split(',').includes(key(r))) : RUNS;

export default async function checkPlaythrough() {
    const problems = [];
    const server = await startServer();
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch();
    let runs = 0;
    let totalSteps = 0;
    try {
        // Starting again from the title must clear the old transcript, even
        // when the new career opens in the same scene.
        {
            const context = await browser.newContext({ viewport: { width: 360, height: 640 } });
            await context.route('https://cloud.umami.is/**', route => route.abort());
            await prepare(context, { mode: 'spoiler-free' });
            context.setDefaultTimeout(15000);
            const page = await context.newPage();
            const click = (locator, options) => locator.click(options);
            try {
                await page.goto(`${base}/tier_four/`, { waitUntil: 'load' });
                await startCareer(page, click);
                for (let i = 0; i < 12; i++) {
                    if (await page.locator('#screen-play').isVisible() && await page.locator('#lines .line').count() >= 3) break;
                    await (await import('../lib/autoplay.mjs')).step(page, click);
                }
                await click(page.locator('#play-menu'));
                await click(page.locator('#to-title'));
                await startCareer(page, click);
                await (await import('../lib/autoplay.mjs')).step(page, click);
                await page.locator('#screen-play').waitFor();
                const lines = await page.locator('#lines .line').count();
                const shown = await page.evaluate(() => JSON.parse(localStorage.getItem('tier-four.save.spoiler-free')).shown);
                if (lines !== shown) problems.push(`restart from the title: the transcript shows ${lines} line(s) but the new career has seen ${shown}`);
            } catch (err) {
                problems.push(`restart from the title: ${err.message.split('\n')[0]}`);
            }
            await context.close();
        }
        for (const run of selected) {
            const where = `${run.mode}, seed ${run.seed}, ${run.phone ? 'phone by touch' : 'desktop by mouse'}`;
            const context = await browser.newContext({
                viewport: run.phone ? { width: 360, height: 640 } : { width: 1280, height: 800 },
                isMobile: run.phone,
                hasTouch: run.phone,
            });
            await context.route('https://cloud.umami.is/**', route => route.abort());
            await prepare(context, { mode: run.mode });
            // Generous: a slow machine must not fail the career.
            context.setDefaultTimeout(15000);
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', err => errors.push(err.message));
            page.on('response', r => {
                if (r.status() >= 400 && r.url().startsWith(base)) errors.push(`${r.status()} for ${r.url().slice(base.length)}`);
            });
            const tap = (locator, options) => run.phone ? locator.tap(options) : locator.click(options);
            const pick = seeded(run.seed);
            const leaks = new Set();
            const recent = [];
            try {
                await page.goto(`${base}/tier_four/`, { waitUntil: 'load' });
                await startCareer(page, tap);
                const result = await playThrough(page, tap, {
                    pick,
                    onStep: async did => {
                        recent.push(did);
                        if (recent.length > 8) recent.shift();
                        if (run.mode !== 'spoiler-free') return;
                        const text = await page.locator('#app').innerText().catch(() => '');
                        for (const phrase of READER_ONLY) if (text.includes(phrase)) leaks.add(phrase);
                    },
                });
                totalSteps += result.steps;
                if (result.outcome !== 'end') {
                    problems.push(`${where}: play stopped (${result.outcome}) after ${result.steps} steps, last at ${result.chapters.at(-1) ?? 'the start'}`);
                } else {
                    // The debrief must list at least one truth per tier played.
                    const truths = await page.locator('#debrief .truth').count();
                    if (truths < 3) problems.push(`${where}: the debrief shows only ${truths} truth(s)`);
                    // The save must say the career is finished and reload to the same screen.
                    await page.reload({ waitUntil: 'load' });
                    await page.locator('#continue').waitFor();
                    await tap(page.locator('#continue'));
                    if (!await page.locator('#screen-end').isVisible()) problems.push(`${where}: a finished career didn't reload to its debrief`);
                }
            } catch (err) {
                // Say where it stopped, and keep a picture of it.
                const shot = path.join(SCREENSHOT_DIR, `playthrough-failure-${run.mode}-${run.seed}.png`);
                await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
                await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
                const state = await page.evaluate(() => ({
                    screen: [...document.querySelectorAll('.screen')].filter(s => !s.hidden).map(s => s.id).join(','),
                    dialog: [...document.querySelectorAll('dialog[open]')].map(d => d.id).join(','),
                    scene: document.querySelector('#lines')?.dataset.scene,
                })).catch(() => ({}));
                // Playwright's call log says why an action timed out.
                const why = err.message.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 8).join(' | ');
                problems.push(`${where}: ${why} at ${JSON.stringify(state)}; last steps: ${recent.join(' > ')}; see ${path.basename(shot)}`);
            }
            for (const e of errors) problems.push(`${where}: ${e}`);
            for (const phrase of leaks) problems.push(`${where}: reader-only text was shown: "${phrase}"`);
            runs++;
            await context.close();
        }
    } finally {
        await browser.close();
        server.close();
    }
    return {
        name: 'Scripted play-through',
        problems,
        summary: `${runs} career(s) played to the end, ${totalSteps} steps`,
    };
}
