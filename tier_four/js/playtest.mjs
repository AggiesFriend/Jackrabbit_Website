// Playtest mode, on with ?playtest in the address. Records, on this device
// only, what the development process asks for: time per step, SNAP
// attempts, hints seen, understandings logged, rewinds, the Spoilers switch
// and the screen size. Nothing is sent anywhere, and no personal data is
// kept. "Copy results" in the menu gives text to paste back.

export function recorder(active) {
    const events = [];
    const start = Date.now();
    let last = start;
    const record = (type, detail = {}) => {
        if (!active) return;
        const now = Date.now();
        events.push({ t: now - start, dt: now - last, type, ...detail });
        last = now;
    };
    return {
        active,
        record,
        results(play) {
            const lines = [
                `Tier Four playtest results`,
                `Screen: ${window.innerWidth} x ${window.innerHeight} CSS px, ${window.devicePixelRatio}x, ${navigator.maxTouchPoints ? 'touch' : 'no touch'}`,
                `Mode: ${play?.mode ?? '-'}; chapter: ${play?.chapter ?? '-'}; scene: ${play?.scene ?? '-'}`,
                `Cover: ${play?.cover ?? '-'}; rewinds: ${play?.rewinds ?? 0}; reviews: ${play?.reviews ?? 0}`,
                `Hints seen: ${play?.hints?.length ?? 0}; understandings logged: ${play?.logged?.length ?? 0}`,
                `Jumps: ${(play?.jumps ?? []).map(j => `${j.name} (${j.auto ? 'auto' : `${j.tries} ${j.tries === 1 ? 'try' : 'tries'}${j.late ? ', late' : ''}`})`).join('; ') || 'none'}`,
                `Session: ${Math.round((Date.now() - start) / 1000)} s, ${events.length} events`,
                '',
                'Events (seconds since start, seconds since previous):',
                ...events.map(e => {
                    const { t, dt, type, ...rest } = e;
                    const detail = Object.entries(rest).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' ');
                    return `${(t / 1000).toFixed(1)}\t+${(dt / 1000).toFixed(1)}\t${type}${detail ? `\t${detail}` : ''}`;
                }),
            ];
            return lines.join('\n');
        },
    };
}
