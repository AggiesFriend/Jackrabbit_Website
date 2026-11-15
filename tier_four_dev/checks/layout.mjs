// Layout sweep (Q9): at every size in the device matrix, no sideways
// scrolling, nothing off-screen, tap targets at least 44 x 44 px, body text
// at least 16 px. Steps through each game screen (lib/screens.mjs) by touch
// on phones and by mouse elsewhere, and saves a screenshot of each screen at
// each size.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { startServer } from '../lib/server.mjs';
import { DEVICES } from '../lib/devices.mjs';
import { SCREENS } from '../lib/screens.mjs';
import { SCREENSHOT_DIR } from '../lib/paths.mjs';
import { FAST_SETTINGS, prepare } from '../lib/autoplay.mjs';

const MIN_TARGET = 44;
const MIN_BODY_TEXT = 16;

// `deviceWidth` is the width the device was set to. A mobile browser zooms
// out to fit over-wide content, which widens the page's own viewport, so
// that can't be trusted to reveal sideways scrolling.
function measure({ minTarget, deviceWidth }) {
    const doc = document.documentElement;
    const out = {
        viewport: deviceWidth,
        scrollWidth: Math.max(doc.scrollWidth, document.body.scrollWidth),
        bodyFont: parseFloat(getComputedStyle(document.body).fontSize),
        small: [],
        offscreen: [],
    };
    const describe = el => {
        const text = (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().replace(/\s+/g, ' ');
        return `<${el.tagName.toLowerCase()}> "${text.slice(0, 40)}"`;
    };
    const targets = document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])');
    for (const el of targets) {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || style.visibility === 'hidden') continue;
        if (r.width < minTarget || r.height < minTarget) {
            out.small.push(`${describe(el)} is ${Math.round(r.width)} x ${Math.round(r.height)} px`);
        }
    }
    for (const el of document.body.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.left < -1 || r.right > out.viewport + 1) {
            out.offscreen.push(`${describe(el)} spans ${Math.round(r.left)} to ${Math.round(r.right)} px`);
        }
    }
    // The confirmation dialog can't be scrolled with the page, so its
    // buttons must be on screen as it opens. The drawer scrolls.
    for (const el of document.querySelectorAll('#confirm[open] button')) {
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight + 1) {
            out.offscreen.push(`${describe(el)} in an open dialog spans ${Math.round(r.top)} to ${Math.round(r.bottom)} px, below the ${window.innerHeight} px screen`);
        }
    }
    return out;
}

// For development: TF_SCREENS=play,choices TF_DEVICES=design-360 narrows a run.
const only = (list, env) => process.env[env] ? list.filter(x => process.env[env].split(",").includes(x.name)) : list;

export default async function checkLayout() {
    const problems = [];
    const devices = only(DEVICES, "TF_DEVICES");
    const screens = only(SCREENS, "TF_SCREENS");
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    const server = await startServer();
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch();
    let shots = 0;
    try {
        for (const device of devices) {
            const tap = locator => device.phone ? locator.tap() : locator.click();
            for (const screen of screens) {
                const where = `${screen.name} screen at ${device.width} x ${device.height}`;
                // A fresh context per screen, so neither a failed step nor
                // anything the game remembers on the device carries over.
                const context = await browser.newContext({
                    viewport: { width: device.width, height: device.height },
                    isMobile: device.phone,
                    hasTouch: device.phone,
                    deviceScaleFactor: device.phone ? 2 : 1,
                });
                // Keep test visits out of the analytics.
                await context.route('https://cloud.umami.is/**', route => route.abort());
                // Instant text and auto-plotting unless the screen says otherwise.
                await prepare(context, { settings: screen.settings ?? FAST_SETTINGS });
                // A step that can't find its button fails fast rather than
                // waiting the default 30 s.
                context.setDefaultTimeout(5000);
                // Loading can wait on the web fonts, so it gets longer.
                context.setDefaultNavigationTimeout(30000);
                const page = await context.newPage();
                // A page that lays out fine can still be missing its
                // stylesheet or script.
                const broken = [];
                page.on('pageerror', err => broken.push(`script error: ${err.message}`));
                page.on('response', r => {
                    if (r.status() >= 400 && r.url().startsWith(base)) broken.push(`${r.status()} for ${r.url().slice(base.length)}`);
                });
                try {
                    await page.goto(base + screen.path, { waitUntil: 'load' });
                    await page.evaluate(() => document.fonts.ready);
                    await screen.steps(page, tap);
                } catch (err) {
                    problems.push(`${where}: couldn't reach the screen: ${err.message.split('\n')[0]}`);
                    for (const b of broken) problems.push(`${where}: ${b}`);
                    await context.close();
                    continue;
                }
                for (const b of broken) problems.push(`${where}: ${b}`);
                const m = await page.evaluate(measure, { minTarget: MIN_TARGET, deviceWidth: device.width });
                if (m.scrollWidth > m.viewport) problems.push(`${where}: sideways scrolling (${m.scrollWidth} px content in ${m.viewport} px)`);
                if (m.bodyFont < MIN_BODY_TEXT) problems.push(`${where}: body text is ${m.bodyFont} px`);
                for (const s of m.small) problems.push(`${where}: tap target too small: ${s}`);
                for (const s of m.offscreen) problems.push(`${where}: off-screen: ${s}`);

                const slug = `${screen.path.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-') || 'root'}-${screen.name}`;
                await page.screenshot({
                    path: path.join(SCREENSHOT_DIR, `${slug}-${device.name}.png`),
                    fullPage: true,
                });
                shots++;
                await context.close();
            }
        }
    } finally {
        await browser.close();
        server.close();
    }
    return {
        name: 'Layout sweep',
        problems,
        summary: `${screens.length} screen(s) at ${devices.length} sizes; ${shots} screenshot(s) in tier_four_dev/screenshots/`,
    };
}
