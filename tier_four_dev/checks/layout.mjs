// Layout sweep (Q9): at every size in the device matrix, no sideways
// scrolling, nothing off-screen, tap targets at least 44 x 44 px, body text
// at least 16 px. Saves a screenshot of each page at each size.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { startServer } from '../lib/server.mjs';
import { DEVICES, PAGES } from '../lib/devices.mjs';
import { SCREENSHOT_DIR } from '../lib/paths.mjs';

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
    return out;
}

export default async function checkLayout() {
    const problems = [];
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    const server = await startServer();
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch();
    let shots = 0;
    try {
        for (const device of DEVICES) {
            const context = await browser.newContext({
                viewport: { width: device.width, height: device.height },
                isMobile: device.phone,
                hasTouch: device.phone,
                deviceScaleFactor: device.phone ? 2 : 1,
            });
            // Keep test visits out of the analytics.
            await context.route('https://cloud.umami.is/**', route => route.abort());
            const page = await context.newPage();
            for (const pagePath of PAGES) {
                await page.goto(base + pagePath, { waitUntil: 'load' });
                await page.evaluate(() => document.fonts.ready);
                const m = await page.evaluate(measure, { minTarget: MIN_TARGET, deviceWidth: device.width });
                const where = `${pagePath} at ${device.width} x ${device.height}`;
                if (m.scrollWidth > m.viewport) problems.push(`${where}: sideways scrolling (${m.scrollWidth} px content in ${m.viewport} px)`);
                if (m.bodyFont < MIN_BODY_TEXT) problems.push(`${where}: body text is ${m.bodyFont} px`);
                for (const s of m.small) problems.push(`${where}: tap target too small: ${s}`);
                for (const s of m.offscreen) problems.push(`${where}: off-screen: ${s}`);

                const slug = pagePath.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-') || 'root';
                await page.screenshot({
                    path: path.join(SCREENSHOT_DIR, `${slug}-${device.name}.png`),
                    fullPage: true,
                });
                shots++;
            }
            await context.close();
        }
    } finally {
        await browser.close();
        server.close();
    }
    return {
        name: 'Layout sweep',
        problems,
        summary: `${PAGES.length} page(s) at ${DEVICES.length} sizes; ${shots} screenshot(s) in tier_four_dev/screenshots/`,
    };
}
