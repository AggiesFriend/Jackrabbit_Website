// Scripted play-through: the whole career can be finished in both modes,
// by touch at the design phone size and by mouse on desktop, with several
// seeded choice policies, and nothing reader-only is ever shown in
// spoiler-free mode (the spoiler graph check, Q7, on what play actually
// reaches).
import { chromium } from 'playwright';
import { startServer } from '../lib/server.mjs';
import { prepare, playThrough, seeded, startCareer } from '../lib/autoplay.mjs';

// Phrases that only reader mode may ever show. Kept short and distinctive.
const READER_ONLY = [
    'That’s an order',
    'destruct sequence',
    'Morning Eclipse',
    'two of her',
    'the directive',
];

const RUNS = [
    { mode: 'spoiler-free', seed: 1, phone: true },
    { mode: 'spoiler-free', seed: 7, phone: false },
    { mode: 'spoiler-free', seed: 42, phone: true },
    { mode: 'reader', seed: 1, phone: true },
    { mode: 'reader', seed: 7, phone: false },
    { mode: 'reader', seed: 42, phone: true },
];

export default async function checkPlaythrough() {
    const problems = [];
    const server = await startServer();
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch();
    let runs = 0;
    let totalSteps = 0;
    try {
        for (const run of RUNS) {
            const where = `${run.mode}, seed ${run.seed}, ${run.phone ? 'phone by touch' : 'desktop by mouse'}`;
            const context = await browser.newContext({
                viewport: run.phone ? { width: 360, height: 640 } : { width: 1280, height: 800 },
                isMobile: run.phone,
                hasTouch: run.phone,
            });
            await context.route('https://cloud.umami.is/**', route => route.abort());
            await prepare(context, { mode: run.mode });
            context.setDefaultTimeout(5000);
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', err => errors.push(err.message));
            page.on('response', r => {
                if (r.status() >= 400 && r.url().startsWith(base)) errors.push(`${r.status()} for ${r.url().slice(base.length)}`);
            });
            const tap = locator => run.phone ? locator.tap() : locator.click();
            const pick = seeded(run.seed);
            const leaks = new Set();
            try {
                await page.goto(`${base}/tier_four/`, { waitUntil: 'load' });
                await startCareer(page, tap);
                const result = await playThrough(page, tap, {
                    pick,
                    onStep: async () => {
                        if (run.mode !== 'spoiler-free') return;
                        const text = await page.locator('#app').innerText().catch(() => '');
                        for (const phrase of READER_ONLY) if (text.includes(phrase)) leaks.add(phrase);
                    },
                });
                totalSteps += result.steps;
                if (result.outcome !== 'end') problems.push(`${where}: play stopped (${result.outcome}) after ${result.steps} steps, last at ${result.chapters.at(-1) ?? 'the start'}`);
                else {
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
                problems.push(`${where}: ${err.message.split('\n')[0]}`);
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
