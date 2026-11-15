// SNAP plotting: the jump puzzle, built from the encyclopaedia's SnapSpace
// entry. Three steps, all by taps or keys, with no timing: hold station
// relative to the nearest gravity well, cast the probe strands, then choose
// an anchor point with room for the ship plus a safety margin.
//
// runJump(host, spec, options) draws the puzzle into `host` and resolves
// with { tries, late, auto } when the jump is made. The puzzle is seeded, so
// the same jump is the same for every player.

const ns = 'http://www.w3.org/2000/svg';
const W = 320;
const H = 240;
const SHIP_R = 9;
const MARGIN = 7;

// Mulberry32: small, seeded, good enough for a puzzle.
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return h >>> 0;
}

// Difficulty 1: one axis to hold, a sparse field, 3 tries before "late".
// Difficulty 4: two axes, a crowded field with moving debris, 2 tries.
function settingsFor(difficulty) {
    return {
        axes: difficulty >= 2 ? 2 : 1,
        bodies: [3, 5, 7, 9][difficulty - 1],
        moving: [0, 0, 2, 3][difficulty - 1],
        candidates: [6, 7, 8, 9][difficulty - 1],
        deadline: difficulty >= 3 ? 2 : 3,
        cycles: 3,
    };
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Builds the field: bodies (stations, debris, traffic), some moving, and
// candidate anchors of which at least one is clear now and on arrival.
function buildField(seed, s) {
    const rand = rng(seed);
    const bodies = [];
    const kinds = ['station', 'debris', 'debris', 'traffic', 'debris'];
    let guard = 0;
    while (bodies.length < s.bodies && guard++ < 500) {
        const r = 10 + rand() * 18;
        const b = { x: 30 + rand() * (W - 60), y: 24 + rand() * (H - 48), r, kind: kinds[bodies.length % kinds.length], vx: 0, vy: 0 };
        if (bodies.every(o => dist(o, b) > o.r + b.r + 6)) bodies.push(b);
    }
    for (let i = 0; i < s.moving && i < bodies.length; i++) {
        const b = bodies[bodies.length - 1 - i];
        b.kind = 'drift';
        const angle = rand() * Math.PI * 2;
        const speed = 8 + rand() * 8;
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
    }
    const need = SHIP_R + MARGIN;
    const clearAt = (p, t) => bodies.every(b => dist(p, { x: b.x + b.vx * t, y: b.y + b.vy * t }) > b.r + need);
    const clearNow = p => clearAt(p, 0);
    const clearLater = p => clearAt(p, s.cycles);
    const candidates = [];
    guard = 0;
    // One sure anchor first.
    while (candidates.length < 1 && guard++ < 2000) {
        const p = { x: 24 + rand() * (W - 48), y: 24 + rand() * (H - 48) };
        if (clearNow(p) && clearLater(p)) candidates.push({ ...p, ok: true });
    }
    guard = 0;
    while (candidates.length < s.candidates && guard++ < 4000) {
        const p = { x: 20 + rand() * (W - 40), y: 20 + rand() * (H - 40) };
        if (candidates.some(c => dist(c, p) < 34)) continue;
        const now = clearNow(p);
        const later = clearLater(p);
        // Prefer tempting wrong answers: clear now but not on arrival, or
        // only just inside a margin.
        const nearMiss = bodies.some(b => {
            const d = dist(p, b) - b.r;
            return d > SHIP_R - 2 && d < need;
        });
        if (now && later) {
            if (candidates.filter(c => c.ok).length >= 2) continue;
            candidates.push({ ...p, ok: true });
        } else if (nearMiss || (now && !later) || rand() < 0.4) {
            candidates.push({ ...p, ok: false, now, later });
        }
    }
    const shuffled = candidates.slice().sort(() => rand() - 0.5);
    const velocity = [];
    for (let i = 0; i < s.axes; i++) {
        let v = 0;
        while (Math.abs(v) < 0.6) v = Math.round((rand() * 6 - 3) * 10) / 10;
        velocity.push(v);
    }
    return { bodies, candidates: shuffled, velocity, need };
}

function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v);
    }
    node.append(...children);
    return node;
}

function svgEl(tag, attrs = {}) {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
}

const fmt = v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} m/s`;

export function runJump(host, spec, { reducedMotion = false, autoPlot = false, onEvent = () => {} } = {}) {
    const s = settingsFor(spec.difficulty ?? 1);
    const deadline = spec.deadline ?? s.deadline;
    const field = buildField(hash(spec.seed ?? spec.name), s);
    let tries = 0;
    let step = 0;

    return new Promise(resolve => {
        host.replaceChildren();
        const panel = el('section', { class: 'snap', 'aria-labelledby': 'snap-title' });
        const title = el('h2', { id: 'snap-title', tabindex: '-1', text: `SNAP plot: ${spec.name}` });
        const status = el('p', { class: 'snap-status', role: 'status', 'aria-live': 'polite' });
        const body = el('div', { class: 'snap-body' });
        const foot = el('div', { class: 'snap-foot' });
        panel.append(title, status, body, foot);
        host.append(panel);
        title.focus();

        const finish = result => {
            onEvent('jump-done', result);
            resolve(result);
        };

        if (autoPlot) {
            foot.append(el('button', { type: 'button', class: 'primary', text: 'Let Aggie plot the jump', onclick: () => finish({ tries: 2, late: false, auto: true }) }));
        }

        // ---- Step 1: hold station
        const holdStation = () => {
            step = 1;
            status.textContent = 'Step 1 of 3. Come to rest relative to the nearest gravity well: bring every axis to 0.0.';
            body.replaceChildren();
            const v = field.velocity.slice();
            const rows = v.map((_, i) => {
                const label = s.axes === 1 ? 'Relative velocity' : ['Along-track', 'Cross-track'][i];
                const read = el('output', { class: 'snap-read', text: fmt(v[i]) });
                const row = el('div', { class: 'snap-axis' }, el('span', { class: 'snap-axis-label', text: label }), read);
                const buttons = el('div', { class: 'snap-thrust' });
                for (const d of [-1, -0.1, 0.1, 1]) {
                    buttons.append(el('button', {
                        type: 'button',
                        text: `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}`,
                        'aria-label': `${label}: thrust ${d > 0 ? 'plus' : 'minus'} ${Math.abs(d).toFixed(1)}`,
                        onclick: () => {
                            v[i] = Math.round((v[i] + d) * 10) / 10;
                            if (Object.is(v[i], -0)) v[i] = 0;
                            read.textContent = fmt(v[i]);
                            row.classList.toggle('held', Math.abs(v[i]) < 0.05);
                            check();
                        },
                    }));
                }
                row.append(buttons);
                return row;
            });
            body.append(...rows);
            const go = el('button', { type: 'button', class: 'primary', text: 'Holding station: cast strands', disabled: 'true', onclick: castStrands });
            foot.replaceChildren(go);
            if (autoPlot) foot.append(el('button', { type: 'button', text: 'Let Aggie plot the jump', onclick: () => finish({ tries: 2, late: false, auto: true }) }));
            const check = () => {
                const held = v.every(x => Math.abs(x) < 0.05);
                go.disabled = !held;
                if (held) {
                    status.textContent = 'Holding station. The SNAP scanner is ready.';
                    go.focus();
                }
            };
        };

        // ---- Step 2 and 3: the map
        const castStrands = () => {
            step = 2;
            onEvent('strands');
            status.textContent = 'Step 2 of 3. Probe strands are surveying the target region.';
            body.replaceChildren();
            const wrap = el('div', { class: 'snap-map' });
            const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Star map of the target region' });
            // Stars
            const stars = rng(hash(spec.name + 'stars'));
            for (let i = 0; i < 60; i++) {
                svg.append(svgEl('circle', { cx: (stars() * W).toFixed(1), cy: (stars() * H).toFixed(1), r: (0.4 + stars() * 0.9).toFixed(2), class: 'snap-star' }));
            }
            // Strands: fine lines from the bottom edge fanning to the region
            const strands = svgEl('g', { class: reducedMotion ? 'snap-strands still' : 'snap-strands' });
            field.strands = { group: strands, paths: [] };
            for (let i = 0; i < 14; i++) {
                const x0 = W / 2 + (i - 6.5) * 6;
                const x1 = 20 + (i / 13) * (W - 40);
                const path = svgEl('path', { d: `M${x0} ${H + 4} Q${W / 2} ${H / 2} ${x1} 14`, class: 'snap-strand' });
                strands.append(path);
                field.strands.paths.push({ el: path, x0, x1 });
            }
            svg.append(strands);
            // Bodies, with arrival positions for the drifting ones
            for (const b of field.bodies) {
                if (b.kind === 'drift') {
                    const ax = b.x + b.vx * s.cycles;
                    const ay = b.y + b.vy * s.cycles;
                    svg.append(svgEl('line', { x1: b.x, y1: b.y, x2: ax, y2: ay, class: 'snap-vector' }));
                    svg.append(svgEl('circle', { cx: ax, cy: ay, r: b.r, class: 'snap-body ghost' }));
                }
                svg.append(svgEl('circle', { cx: b.x, cy: b.y, r: b.r, class: `snap-body ${b.kind}` }));
            }
            wrap.append(svg);
            // Each candidate's clearance ring is drawn on the map at true
            // scale; the tap target is a button laid over it.
            const letters = 'ABCDEFGHIJ';
            const rings = field.candidates.map(c => {
                const ring = svgEl('circle', { cx: c.x, cy: c.y, r: field.need, class: 'snap-ring' });
                svg.append(ring);
                return ring;
            });
            const anchors = el('div', { class: 'snap-anchors', role: 'group', 'aria-label': 'Candidate anchor points' });
            field.candidates.forEach((c, i) => {
                c.ring = rings[i];
                const btn = el('button', {
                    type: 'button',
                    class: 'snap-anchor',
                    text: letters[i],
                    'aria-label': `Anchor ${letters[i]}`,
                    style: `left:${(c.x / W) * 100}%;top:${(c.y / H) * 100}%`,
                    disabled: 'true',
                    onclick: () => pick(c, btn, letters[i]),
                });
                anchors.append(btn);
            });
            wrap.append(anchors);
            body.append(wrap);
            const legend = el('ul', { class: 'snap-legend', 'aria-label': 'Map key' },
                el('li', {}, el('i', { class: 'station' }), 'Station'),
                el('li', {}, el('i', { class: 'debris' }), 'Debris'),
                el('li', {}, el('i', { class: 'traffic' }), 'Traffic'),
            );
            if (s.moving) legend.append(el('li', {}, el('i', { class: 'ghost' }), `Drifting: where it will be when you arrive (${s.cycles} cycles)`));
            body.append(legend);
            foot.replaceChildren();
            const reveal = () => {
                step = 3;
                status.textContent = `Step 3 of 3. Choose an anchor with room for the ship and a safety margin: the ring must clear everything, including where drifting debris will be. ${deadline} ${deadline === 1 ? 'try' : 'tries'} before dispatch logs you late.`;
                for (const b of anchors.children) {
                    b.disabled = false;
                    b.classList.add('ready');
                }
                for (const r of rings) r.classList.add('ready');
                anchors.firstChild.focus();
            };
            if (reducedMotion) reveal();
            else setTimeout(reveal, 1400);
        };

        // The probe strands sweep in from the survey fan and converge on the
        // chosen anchor, each a moment after the last. Resolves when done.
        const converge = c => new Promise(resolve => {
            const { group, paths } = field.strands;
            const curve = (p, t) => {
                const ex = p.x1 + (c.x - p.x1) * t;
                const ey = 14 + (c.y - 14) * t;
                const qx = W / 2 + ((p.x0 + c.x) / 2 - W / 2) * t;
                const qy = H / 2 + ((H + c.y) / 2 - H / 2) * t;
                return `M${p.x0} ${H + 4} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
            };
            const finishUp = () => {
                for (const p of paths) p.el.setAttribute('d', curve(p, 1));
                group.classList.add('converged');
                c.ring.classList.add('pulse');
                resolve();
            };
            if (reducedMotion) return finishUp();
            const length = 900;
            const stagger = 35;
            const start = performance.now();
            const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
            const frame = now => {
                let done = true;
                paths.forEach((p, i) => {
                    const t = Math.min(1, Math.max(0, (now - start - i * stagger) / length));
                    if (t < 1) done = false;
                    p.el.setAttribute('d', curve(p, ease(t)));
                });
                if (done) finishUp();
                else requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        });

        const pick = async (c, btn, letter) => {
            tries++;
            onEvent('anchor', { letter, ok: c.ok, tries });
            if (c.ok) {
                btn.classList.add('locked');
                c.ring.classList.add('locked');
                for (const b of btn.parentNode.children) b.disabled = true;
                status.textContent = `Anchor ${letter} chosen. Strands converging…`;
                await converge(c);
                status.textContent = `Anchor ${letter} locked. ${tries === 1 ? 'A clean plot.' : tries <= deadline ? 'Plotted.' : 'Plotted, late.'}`;
                const jump = el('button', { type: 'button', class: 'primary', text: 'Jump', onclick: () => finish({ tries, late: tries > deadline, auto: false }) });
                foot.replaceChildren(jump);
                jump.focus();
                return;
            }
            btn.classList.add('rejected');
            c.ring.classList.add('rejected');
            btn.disabled = true;
            const reason = c.now && !c.later
                ? 'drifting debris will cross that point before you arrive'
                : 'something is inside the safety margin';
            const left = deadline - tries;
            status.textContent = `Scanner rejects anchor ${letter}: ${reason}. ${left > 0 ? `${left} ${left === 1 ? 'try' : 'tries'} left before you’re late.` : 'Dispatch will log the delay.'}`;
        };

        holdStation();
    });
}
