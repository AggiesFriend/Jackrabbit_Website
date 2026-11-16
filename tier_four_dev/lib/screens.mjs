// Screens the layout sweep visits. Each one starts from a fresh load of
// `path` and runs its `steps` to reach the screen. `tap` taps on touch
// devices and clicks elsewhere. The autoplayer (lib/autoplay.mjs) gets
// through the story; these steps only say where to stop.
import { playThrough, startCareer, step } from './autoplay.mjs';

const ok = page => page.locator('#confirm-ok');

// The title screen is ready once the content has loaded.
const ready = page => page.locator('#new-career:not([disabled])').waitFor();

// Plays until the given screen is visible, within `limit` steps.
async function until(page, tap, selector, { limit = 400, pick } = {}) {
    for (let i = 0; i < limit; i++) {
        if (await page.locator(selector).isVisible()) return;
        const did = await step(page, tap, { pick, onClosed: 'continue' });
        if (did === 'stuck') await page.waitForTimeout(100);
    }
    throw new Error(`never reached ${selector}`);
}

// Into the first scene with its first lines showing.
async function intoPlay(page, tap) {
    await ready(page);
    await startCareer(page, tap);
    await until(page, tap, '#screen-play');
    // Read a few lines so the transcript has content.
    for (let i = 0; i < 3; i++) await step(page, tap);
}

export const SCREENS = [
    { name: 'title', path: '/tier_four/', steps: ready },
    // Without the trailing slash, the server must redirect, or the page's
    // relative links to its stylesheet and scripts break.
    { name: 'title-no-slash', path: '/tier_four', steps: ready },
    {
        name: 'spoiler-warning',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await ready(page);
            await tap(page.locator('#reader-switch'));
        },
    },
    {
        name: 'spoilers-remembered',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await ready(page);
            await tap(page.locator('#reader-switch'));
            await tap(ok(page));
            await page.locator('#reader-switch[aria-checked="true"]').waitFor();
            await page.reload();
            await ready(page);
            await page.locator('#reader-switch[aria-checked="true"]').waitFor();
        },
    },
    {
        name: 'help',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await ready(page);
            await tap(page.locator('#how-to-play'));
        },
    },
    {
        name: 'settings',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await ready(page);
            await tap(page.locator('#title-settings'));
        },
    },
    {
        name: 'snap-hold-station',
        path: '/tier_four/',
        // Without auto-plotting, so the real puzzle shows.
        settings: { speed: 'instant', autoPlot: 'off', motion: 'reduced' },
        steps: async (page, tap) => {
            await ready(page);
            await startCareer(page, tap);
            await page.locator('#screen-snap .snap-axis').first().waitFor();
        },
    },
    {
        name: 'snap-map',
        path: '/tier_four/',
        settings: { speed: 'instant', autoPlot: 'off', motion: 'reduced' },
        steps: async (page, tap) => {
            await ready(page);
            await startCareer(page, tap);
            await page.locator('#screen-snap .snap-axis').first().waitFor();
            // Zero each axis with the thrust buttons, reading the display.
            for (const axis of await page.locator('.snap-axis').all()) {
                for (let guard = 0; guard < 80; guard++) {
                    const text = await axis.locator('.snap-read').innerText();
                    const v = parseFloat(text.replace('−', '-'));
                    if (Math.abs(v) < 0.05) break;
                    const size = Math.abs(v) >= 1 ? '1.0' : '0.1';
                    const sign = v > 0 ? 'minus' : 'plus';
                    await tap(axis.getByRole('button', { name: `thrust ${sign} ${size}` }));
                }
            }
            await tap(page.getByRole('button', { name: 'Holding station: cast strands' }));
            await page.locator('.snap-anchor.ready').first().waitFor();
        },
    },
    {
        name: 'play',
        path: '/tier_four/',
        steps: intoPlay,
    },
    {
        name: 'choices',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await ready(page);
            await startCareer(page, tap);
            await until(page, tap, '#choices > button:nth-child(2)');
        },
    },
    {
        name: 'journal',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await intoPlay(page, tap);
            await tap(page.locator('#play-journal'));
        },
    },
    {
        name: 'menu',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await intoPlay(page, tap);
            await tap(page.locator('#play-menu'));
        },
    },
    {
        name: 'contract-card',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await ready(page);
            await startCareer(page, tap);
            await until(page, tap, '#screen-brief', { limit: 600 });
        },
    },
    {
        name: 'decline-pushback',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await ready(page);
            await startCareer(page, tap);
            await until(page, tap, '#screen-brief', { limit: 600 });
            await tap(page.locator('#decline'));
            await tap(page.locator('#confirm[open] #confirm-ok'));
            await page.locator('#confirm[open] #confirm-ok', { hasText: 'Accept the contract' }).waitFor();
        },
    },
    {
        name: 'contract-closed',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await ready(page);
            await startCareer(page, tap);
            await until(page, tap, '#screen-brief', { limit: 600 });
            await playThrough(page, tap, { onClosed: 'stop', limit: 600 });
        },
    },
    {
        name: 'debrief',
        path: '/tier_four/?playtest',
        steps: async (page, tap) => {
            await ready(page);
            await startCareer(page, tap);
            await until(page, tap, '#screen-play');
            // Skip to the last chapter and play it out.
            await tap(page.locator('#play-menu'));
            const select = page.locator('#skip-to');
            const last = await select.locator('option').last().getAttribute('value');
            await select.selectOption(last);
            await playThrough(page, tap, { limit: 800 });
            await page.locator('#screen-end').waitFor();
        },
    },
];
