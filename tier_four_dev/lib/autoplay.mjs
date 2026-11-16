// Drives the real game in a Playwright page: through contract cards, SNAP
// plots (Aggie plots them) and scenes, choosing by a policy. Used by the
// layout sweep to reach screens and by the play-through check to finish
// every chapter in both modes.

// Settings the autoplayer relies on: instant text and auto-plotting.
export const FAST_SETTINGS = { speed: 'instant', autoPlot: 'on', motion: 'reduced' };

// Puts the saved settings and mode in place before the page loads, so the
// spoiler warning doesn't need answering and text appears at once.
// The script runs on every load, so the mode is only written when asked
// for; otherwise a reload would undo the Spoilers switch.
export async function prepare(context, { mode = null, settings = FAST_SETTINGS } = {}) {
    await context.addInitScript(({ mode, settings }) => {
        try {
            localStorage.setItem('tier-four.settings', JSON.stringify(settings));
            if (mode) localStorage.setItem('tier-four.mode', mode);
        } catch { /* storage blocked */ }
    }, { mode, settings });
}

// Mulberry32, so a seeded policy makes the same choices every run.
export function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const visible = (page, selector) => page.locator(selector).isVisible();

// One step of play. Returns what it did: 'accept', 'plot', 'line', 'choice',
// 'proceed', 'closed', 'end', or 'stuck'.
export async function step(page, tap, { pick = () => 0, onClosed = 'continue' } = {}) {
    // A confirmation left open by the previous step is answered first.
    const pendingOk = page.locator('#confirm[open] #confirm-ok');
    if (await pendingOk.isVisible().catch(() => false)) {
        await tap(pendingOk);
        return 'confirm';
    }
    if (await visible(page, '#screen-end')) return 'end';
    if (await visible(page, '#screen-closed')) {
        if (onClosed === 'stop') return 'closed';
        await tap(page.locator('#closed-next'));
        return 'proceed';
    }
    if (await visible(page, '#screen-brief')) {
        // Now and then, decline first. A main contract pushes back and is
        // then accepted from the dialog; a side contract closes unflown.
        // (The default policy always returns 0, so it never declines.)
        if (pick(4) > 0.75) {
            await tap(page.locator('#decline'));
            await tap(page.locator('#confirm[open] #confirm-ok', { hasText: 'Decline' }));
            // Wait for the outcome before doing anything else: a side
            // contract's closing card, or a main contract's pushback.
            const pushback = page.locator('#confirm[open] #confirm-ok', { hasText: 'Accept the contract' });
            await pushback.or(page.locator('#screen-closed:not([hidden])')).first().waitFor();
            if (await pushback.isVisible()) {
                await tap(pushback);
                await page.locator('#screen-brief[hidden]').waitFor({ state: 'attached' });
            }
            return 'decline';
        }
        await tap(page.locator('#accept'));
        return 'accept';
    }
    if (await visible(page, '#screen-snap')) {
        const auto = page.getByRole('button', { name: 'Let Aggie plot the jump' }).first();
        if (await auto.isVisible()) {
            await tap(auto);
            return 'plot';
        }
        return 'stuck';
    }
    if (await visible(page, '#screen-play')) {
        const advance = page.locator('#advance');
        if (await advance.isVisible()) {
            if (await advance.isDisabled()) {
                await page.waitForTimeout(50);
                return 'line';
            }
            await tap(advance);
            return 'line';
        }
        // The buttons stay in the page while their list is hidden between
        // scenes, so only count them once the list is showing.
        const list = page.locator('#choices');
        const choices = page.locator('#choices > button:not(.rewind-link)');
        const n = await list.isVisible() ? await choices.count() : 0;
        if (!n) {
            await page.waitForTimeout(50);
            return 'line';
        }
        const i = n === 1 ? 0 : Math.min(n - 1, Math.floor(pick(n) * n));
        const label = await choices.nth(i).innerText();
        // If the scene moves on between looking and tapping, look again.
        try {
            await tap(choices.nth(i), { timeout: 3000 });
        } catch {
            return 'line';
        }
        // A choice may ask for confirmation; the dialog opens a moment later.
        const ok = page.locator('#confirm[open] #confirm-ok');
        await ok.waitFor({ timeout: 400 }).catch(() => {});
        if (await ok.isVisible().catch(() => false)) await tap(ok);
        return n === 1 ? 'proceed' : `choice:${label}`;
    }
    return 'stuck';
}

// Plays until the end screen, a closed card (if onClosed is 'stop'), or
// `limit` steps. Returns { outcome, steps, chapters } where chapters are
// the titles seen on contract cards and closing cards.
export async function playThrough(page, tap, { pick, limit = 4000, onClosed = 'continue', onStep } = {}) {
    const chapters = [];
    let last = '';
    for (let i = 0; i < limit; i++) {
        if (await visible(page, '#screen-closed')) {
            const title = await page.locator('#closed-title').innerText();
            if (title !== last) {
                chapters.push(title);
                last = title;
            }
        }
        const did = await step(page, tap, { pick, onClosed });
        onStep?.(did);
        if (did === 'end' || did === 'closed') return { outcome: did, steps: i, chapters };
        if (did === 'stuck') {
            await page.waitForTimeout(100);
            const again = await step(page, tap, { pick, onClosed });
            if (again === 'stuck') return { outcome: 'stuck', steps: i, chapters };
        }
    }
    return { outcome: 'limit', steps: limit, chapters };
}

// Starts a new career from the title screen.
export async function startCareer(page, tap) {
    await page.locator('#new-career:not([disabled])').waitFor();
    await tap(page.locator('#new-career'));
    // With a saved career, "Start again?" opens a moment after the tap.
    const ok = page.locator('#confirm[open] #confirm-ok');
    await ok.waitFor({ timeout: 800 }).catch(() => {});
    if (await ok.isVisible().catch(() => false)) await tap(ok);
}
