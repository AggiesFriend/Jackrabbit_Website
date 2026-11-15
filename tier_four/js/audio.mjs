// Sound: a low ship hum, short interface ticks and a quiet two-note theme,
// all made with the Web Audio API so there are no files to load. Off by
// default; started only after a tap, as browsers require.

let ctx = null;
let hum = null;
let enabled = false;

function context() {
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
}

function startHum(ship) {
    const c = context();
    if (!c || hum) return;
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.connect(c.destination);
    const oscs = [ship === 'jackrabbit' ? 46 : 58, ship === 'jackrabbit' ? 92.5 : 116.3].map(f => {
        const o = c.createOscillator();
        o.type = ship === 'jackrabbit' ? 'sawtooth' : 'sine';
        o.frequency.value = f;
        const g = c.createGain();
        g.gain.value = ship === 'jackrabbit' ? 0.012 : 0.03;
        o.connect(g).connect(gain);
        o.start();
        return o;
    });
    gain.gain.linearRampToValueAtTime(1, c.currentTime + 1.5);
    hum = { gain, oscs, ship };
}

function stopHum() {
    if (!hum || !ctx) return;
    const h = hum;
    hum = null;
    h.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    setTimeout(() => h.oscs.forEach(o => o.stop()), 700);
}

export const audio = {
    get enabled() {
        return enabled;
    },
    set(on, ship = 'alc') {
        enabled = on;
        if (on) startHum(ship);
        else stopHum();
    },
    ship(ship) {
        if (enabled && hum && hum.ship !== ship) {
            stopHum();
            startHum(ship);
        } else if (enabled && !hum) {
            startHum(ship);
        }
    },
    tick(kind = 'tap') {
        if (!enabled) return;
        const c = context();
        if (!c) return;
        const o = c.createOscillator();
        const g = c.createGain();
        const f = { tap: 880, aggie: 660, choice: 520, jump: 300, bad: 180 }[kind] ?? 700;
        o.type = kind === 'aggie' ? 'triangle' : 'square';
        o.frequency.value = f;
        g.gain.value = 0.0001;
        o.connect(g).connect(c.destination);
        const t = c.currentTime;
        g.gain.exponentialRampToValueAtTime(kind === 'aggie' ? 0.03 : 0.02, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'jump' ? 0.5 : 0.09));
        if (kind === 'jump') o.frequency.exponentialRampToValueAtTime(1200, t + 0.45);
        o.start(t);
        o.stop(t + 0.6);
    },
    theme() {
        if (!enabled) return;
        const c = context();
        if (!c) return;
        const notes = [220, 277.2, 329.6, 277.2];
        notes.forEach((f, i) => {
            const o = c.createOscillator();
            const g = c.createGain();
            o.type = 'sine';
            o.frequency.value = f;
            g.gain.value = 0.0001;
            o.connect(g).connect(c.destination);
            const t = c.currentTime + i * 0.55;
            g.gain.exponentialRampToValueAtTime(0.05, t + 0.05);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
            o.start(t);
            o.stop(t + 0.6);
        });
    },
};
