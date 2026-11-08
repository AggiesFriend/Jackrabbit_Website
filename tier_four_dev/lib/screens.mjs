// Screens the layout sweep visits. Each one starts from a fresh load of
// `path` and runs its `steps` to reach the screen. `tap` taps on touch
// devices and clicks elsewhere.
const ok = page => page.locator('#confirm-ok');
const button = (page, name) => page.getByRole('button', { name, exact: true });

async function startContract(page, tap, { reader = false, hints = 0 } = {}) {
    if (reader) {
        await tap(page.locator('#reader-switch'));
        await tap(ok(page));
    }
    await tap(button(page, 'Start contract'));
    for (let i = 0; i < hints; i++) await tap(page.locator('#next-hint'));
}

async function act(page, tap, name) {
    await tap(button(page, name));
    await tap(ok(page));
}

async function end(page, tap) {
    await tap(button(page, 'End contract'));
    await tap(ok(page));
}

// The start screen is ready once the contract has loaded.
const ready = page => page.locator('#start:not([disabled])').waitFor();

export const SCREENS = [
    { name: 'start', path: '/tier_four/', steps: ready },
    // Without the trailing slash, the server must redirect, or the page's
    // relative links to its stylesheet and scripts break.
    { name: 'start-no-slash', path: '/tier_four', steps: ready },
    {
        name: 'spoiler-warning',
        path: '/tier_four/',
        steps: (page, tap) => tap(page.locator('#reader-switch')),
    },
    {
        name: 'spoilers-remembered',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await tap(page.locator('#reader-switch'));
            await tap(ok(page));
            await page.locator('#reader-switch[aria-checked="true"]').waitFor();
            await page.reload();
            await ready(page);
            await page.locator('#reader-switch[aria-checked="true"]').waitFor();
        },
    },
    {
        name: 'contract',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await startContract(page, tap, { hints: 2 });
            await act(page, tap, 'Inspect cargo');
        },
    },
    {
        name: 'confirm-action',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await startContract(page, tap, { hints: 1 });
            await tap(button(page, 'Decline leg'));
        },
    },
    {
        name: 'debrief',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await startContract(page, tap, { hints: 1 });
            await act(page, tap, 'Decline leg');
            await end(page, tap);
        },
    },
    {
        name: 'contract-reader',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await startContract(page, tap, { reader: true, hints: 3 });
            await act(page, tap, 'Decline leg');
        },
    },
    {
        name: 'debrief-reader',
        path: '/tier_four/',
        steps: async (page, tap) => {
            await startContract(page, tap, { reader: true, hints: 3 });
            await act(page, tap, 'Decline leg');
            await act(page, tap, 'Inspect cargo');
            await end(page, tap);
        },
    },
];
