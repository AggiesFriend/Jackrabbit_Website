// Chapter data format, version 2: a campaign of chapters, each with scenes,
// lines, choices, truths and understandings, every item tagged for
// spoiler-free mode, reader mode or both. The format is described in
// tier_four_dev/STATUS.md. The validators return lists of problems; an
// empty list means the data is valid.

const FORMAT = 2;
const MODES = {
    'spoiler-free': ['spoiler-free'],
    reader: ['reader'],
    both: ['spoiler-free', 'reader'],
};
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CONDITION = /^(?:[a-z0-9:.-]+|(?:cover|trust\.[a-z0-9-]+)(?:>=|<=|>|<|==)-?\d+)$/;
const KINDS = ['deflect', 'hesitate', 'over-comply', 'question'];
const SHIPS = ['jackrabbit', 'alc'];
const CHAPTER_KINDS = ['contract', 'scene'];

const oneOf = values => v => values.includes(v) ? null : `must be one of ${values.map(x => `"${x}"`).join(', ')}`;
const isObject = v => v && typeof v === 'object' && !Array.isArray(v);

// Each type returns an error message, or null if the value is fine.
const TYPES = {
    format: v => v === FORMAT ? null : `must be ${FORMAT}`,
    id: v => typeof v === 'string' && ID.test(v) ? null : 'must be a lower-case kebab-case ID',
    tier: v => Number.isInteger(v) && v >= 0 && v <= 4 ? null : 'must be a whole number from 0 to 4',
    difficulty: v => Number.isInteger(v) && v >= 1 && v <= 4 ? null : 'must be a whole number from 1 to 4',
    count: v => Number.isInteger(v) && v >= 1 ? null : 'must be a whole number of at least 1',
    integer: v => Number.isInteger(v) ? null : 'must be a whole number',
    text: v => typeof v === 'string' && v.trim() ? null : 'must be non-empty text',
    list: v => Array.isArray(v) ? null : 'must be a list',
    object: v => isObject(v) ? null : 'must be an object',
    boolean: v => typeof v === 'boolean' ? null : 'must be true or false',
    mode: oneOf(Object.keys(MODES)),
    kind: oneOf(KINDS),
    ship: oneOf(SHIPS),
    chapterKind: oneOf(CHAPTER_KINDS),
    conditions: v => Array.isArray(v) && v.every(c => typeof c === 'string' && CONDITION.test(c))
        ? null : 'must be a list of flags or comparisons such as "cover>=60"',
    ids: v => Array.isArray(v) && v.every(x => typeof x === 'string' && ID.test(x)) ? null : 'must be a list of IDs',
    trust: v => isObject(v) && Object.entries(v).every(([k, n]) => ID.test(k) && Number.isInteger(n))
        ? null : 'must map names to whole numbers',
    target: v => v === 'end' || (typeof v === 'string' && ID.test(v)) ? null : 'must be a scene ID or "end"',
};

// Field specs: name -> type, or [type] for an optional field.
const CHAPTER = {
    format: 'format', id: 'id', tier: 'tier', kind: 'chapterKind', mode: 'mode', ship: 'ship',
    title: 'text', subtitle: ['text'], brief: ['object'], requires: ['conditions'], unless: ['conditions'],
    truths: 'list', understandings: 'list', start: 'id', scenes: 'list',
};
const BRIEF = { client: 'text', route: 'text', cargo: 'text', fee: 'text', notes: ['text'] };
const TRUTH = { id: 'id', mode: 'mode', text: 'text' };
const UNDERSTANDING = { id: 'id', mode: 'mode', truth: 'id', correct: 'boolean', journal: 'text' };
const SCENE = {
    id: 'id', mode: ['mode'], jump: ['object'], enter: ['object'], lines: 'list', choices: ['list'],
    next: ['target'], end: ['boolean'], rewindTo: ['id'], requires: ['conditions'], unless: ['conditions'],
};
const JUMP = { name: 'text', difficulty: 'difficulty', deadline: ['count'], lateCover: ['integer'] };
const EFFECTS = { cover: ['integer'], trust: ['trust'], set: ['conditions'], clear: ['conditions'], note: ['text'] };
const LINE = {
    who: 'id', text: 'text', mode: ['mode'], kind: ['kind'], hint: ['id'], truth: ['id'],
    requires: ['conditions'], unless: ['conditions'],
};
const CHOICE = {
    text: 'text', goto: 'target', mode: ['mode'], logs: ['ids'], confirm: ['text'],
    requires: ['conditions'], unless: ['conditions'], ...EFFECTS,
};

const isSubset = (a, b) => a.every(x => b.includes(x));
const modesOf = (item, fallback) => MODES[item.mode ?? fallback ?? 'both'] ?? [];

// Checks required fields, their types and unknown fields (usually typos).
function checkFields(value, spec, where, problems) {
    if (!isObject(value)) {
        problems.push(`${where}: must be an object`);
        return false;
    }
    let ok = true;
    for (const [field, typeSpec] of Object.entries(spec)) {
        const optional = Array.isArray(typeSpec);
        const type = optional ? typeSpec[0] : typeSpec;
        if (!(field in value)) {
            if (!optional) {
                problems.push(`${where}: missing field "${field}"`);
                ok = false;
            }
            continue;
        }
        const error = TYPES[type](value[field]);
        if (error) {
            problems.push(`${where}: "${field}" ${error}`);
            ok = false;
        }
    }
    for (const field of Object.keys(value)) {
        if (!(field in spec)) {
            problems.push(`${where}: unknown field "${field}"`);
            ok = false;
        }
    }
    return ok;
}

export function validateChapter(chapter, { speakers = null } = {}) {
    const problems = [];
    const fieldsOk = checkFields(chapter, CHAPTER, 'chapter', problems);
    if (!isObject(chapter)) return problems;
    const chapterModes = MODES[chapter.mode] ?? [];

    if (chapter.kind === 'contract' && !chapter.brief) problems.push('chapter: a contract needs a "brief"');
    if (chapter.brief !== undefined) checkFields(chapter.brief, BRIEF, 'brief', problems);

    // Truths and understandings.
    const truths = new Map();
    const seen = new Map();
    const note = (id, where) => {
        if (seen.has(id)) problems.push(`${where}: ID "${id}" is already used by ${seen.get(id)}`);
        else seen.set(id, where);
    };
    (Array.isArray(chapter.truths) ? chapter.truths : []).forEach((t, i) => {
        const where = `truths[${i}]${typeof t?.id === 'string' ? ` (${t.id})` : ''}`;
        if (!checkFields(t, TRUTH, where, problems)) return;
        note(t.id, where);
        if (!isSubset(MODES[t.mode], chapterModes)) problems.push(`${where}: mode "${t.mode}" would show it outside its chapter, which is "${chapter.mode}"`);
        truths.set(t.id, t);
    });
    const understandings = new Map();
    (Array.isArray(chapter.understandings) ? chapter.understandings : []).forEach((u, i) => {
        const where = `understandings[${i}]${typeof u?.id === 'string' ? ` (${u.id})` : ''}`;
        if (!checkFields(u, UNDERSTANDING, where, problems)) return;
        note(u.id, where);
        understandings.set(u.id, u);
        const truth = truths.get(u.truth);
        if (!truth) problems.push(`${where}: truth "${u.truth}" does not exist`);
        else if (!isSubset(MODES[u.mode], MODES[truth.mode])) problems.push(`${where}: mode "${u.mode}" would show it where its truth "${truth.id}" (mode "${truth.mode}") is hidden`);
    });

    // Scenes, lines and choices.
    const scenes = new Map();
    const hints = [];
    const hintIds = new Map();
    const edges = []; // { from, to, modes, where }
    (Array.isArray(chapter.scenes) ? chapter.scenes : []).forEach((s, i) => {
        const where = `scenes[${i}]${typeof s?.id === 'string' ? ` (${s.id})` : ''}`;
        if (!checkFields(s, SCENE, where, problems)) return;
        note(s.id, where);
        const sceneModes = modesOf(s, chapter.mode);
        if (!isSubset(sceneModes, chapterModes)) problems.push(`${where}: mode "${s.mode}" would show it outside its chapter, which is "${chapter.mode}"`);
        scenes.set(s.id, { scene: s, modes: sceneModes, where });
        if (s.jump) checkFields(s.jump, JUMP, `${where}.jump`, problems);
        if (s.enter) checkFields(s.enter, EFFECTS, `${where}.enter`, problems);

        s.lines.forEach((l, j) => {
            const lw = `${where}.lines[${j}]`;
            if (!checkFields(l, LINE, lw, problems)) return;
            const lineModes = modesOf(l, s.mode ?? chapter.mode);
            if (!isSubset(lineModes, sceneModes)) problems.push(`${lw}: mode "${l.mode}" would show it outside its scene`);
            if (speakers && l.who !== 'n' && l.who !== 'jack' && !speakers[l.who]) problems.push(`${lw}: unknown speaker "${l.who}"`);
            if (l.kind || l.hint || l.truth) {
                if (!(l.kind && l.hint && l.truth)) problems.push(`${lw}: a hint needs "kind", "hint" and "truth" together`);
                if (l.who !== 'aggie') problems.push(`${lw}: only Aggie's lines can be hints`);
                if (l.hint) {
                    if (hintIds.has(l.hint)) problems.push(`${lw}: hint ID "${l.hint}" is already used by ${hintIds.get(l.hint)}`);
                    else hintIds.set(l.hint, lw);
                }
                const truth = l.truth && truths.get(l.truth);
                if (l.truth && !truth) problems.push(`${lw}: truth "${l.truth}" does not exist`);
                else if (truth && !isSubset(lineModes, MODES[truth.mode])) problems.push(`${lw}: mode would show it where its truth "${truth.id}" (mode "${truth.mode}") is hidden`);
                if (truth) hints.push({ truth: l.truth, modes: lineModes, scene: s.id });
            }
        });

        const choices = s.choices ?? [];
        choices.forEach((c, j) => {
            const cw = `${where}.choices[${j}]`;
            if (!checkFields(c, CHOICE, cw, problems)) return;
            const choiceModes = modesOf(c, s.mode ?? chapter.mode);
            if (!isSubset(choiceModes, sceneModes)) problems.push(`${cw}: mode "${c.mode}" would show it outside its scene`);
            for (const id of c.logs ?? []) {
                const u = understandings.get(id);
                if (!u) problems.push(`${cw}: understanding "${id}" does not exist`);
                else if (!isSubset(choiceModes, MODES[u.mode])) problems.push(`${cw}: logs "${id}" in a mode where it is hidden`);
            }
            edges.push({ from: s.id, to: c.goto, modes: choiceModes, where: cw });
        });
        const exits = [choices.length > 0, s.next !== undefined, s.end === true, s.rewindTo !== undefined].filter(Boolean).length;
        if (exits === 0) problems.push(`${where}: a scene needs choices, "next", "end" or "rewindTo"`);
        if (choices.length && (s.next !== undefined || s.rewindTo !== undefined)) problems.push(`${where}: a scene with choices can't also have "next" or "rewindTo"`);
        if (s.next !== undefined) edges.push({ from: s.id, to: s.next, modes: sceneModes, where: `${where}.next` });
        if (s.rewindTo !== undefined) edges.push({ from: s.id, to: s.rewindTo, modes: sceneModes, where: `${where}.rewindTo` });
        if (s.end) edges.push({ from: s.id, to: 'end', modes: sceneModes, where });
    });

    if (!fieldsOk) return problems;

    // Targets exist and are shown wherever the step to them is shown.
    const start = scenes.get(chapter.start);
    if (!start) problems.push(`chapter: start scene "${chapter.start}" does not exist`);
    else if (!isSubset(chapterModes, start.modes)) problems.push(`chapter: start scene "${chapter.start}" must be shown in every mode the chapter is`);
    for (const e of edges) {
        if (e.to === 'end') continue;
        const target = scenes.get(e.to);
        if (!target) problems.push(`${e.where}: scene "${e.to}" does not exist`);
        else if (!isSubset(e.modes, target.modes)) problems.push(`${e.where}: leads to scene "${e.to}", which is hidden in a mode where this step is shown`);
    }

    // Per mode: 0 to 2 truths, each hinted and readable; every scene
    // reachable; the chapter can end.
    for (const mode of chapterModes) {
        const shownTruths = [...truths.values()].filter(t => MODES[t.mode].includes(mode));
        if (shownTruths.length > 2) problems.push(`chapter: at most 2 truths in ${mode} mode, found ${shownTruths.length}`);
        for (const truth of shownTruths) {
            if (!hints.some(h => h.truth === truth.id && h.modes.includes(mode))) problems.push(`truth "${truth.id}": no hint points to it in ${mode} mode`);
            if (![...understandings.values()].some(u => u.truth === truth.id && u.correct && MODES[u.mode].includes(mode))) {
                problems.push(`truth "${truth.id}": no correct understanding of it in ${mode} mode`);
            }
        }
        if (!start) continue;
        const reached = new Set();
        let ends = false;
        const stack = [chapter.start];
        while (stack.length) {
            const id = stack.pop();
            if (reached.has(id)) continue;
            reached.add(id);
            for (const e of edges) {
                if (e.from !== id || !e.modes.includes(mode)) continue;
                if (e.to === 'end') ends = true;
                else if (scenes.has(e.to)) stack.push(e.to);
            }
        }
        for (const [id, { modes }] of scenes) {
            if (modes.includes(mode) && !reached.has(id)) problems.push(`scene "${id}": unreachable in ${mode} mode`);
        }
        if (!ends) problems.push(`chapter: no path reaches the end in ${mode} mode`);
    }
    return problems;
}

const CAMPAIGN = { format: 'format', title: 'text', chapters: 'ids', reviews: ['object'], speakers: ['object'], endings: ['object'] };

// `entries`: [{ name, data }], one per chapter file, plus the campaign.
// Chapter IDs must be unique across files, and the campaign must list
// chapters that exist.
export function validateCampaign(campaign, entries) {
    const problems = [];
    const ok = checkFields(campaign, CAMPAIGN, 'campaign', problems);
    const speakers = isObject(campaign?.speakers) ? campaign.speakers : null;
    const owners = new Map();
    for (const { name, data } of entries) {
        for (const p of validateChapter(data, { speakers })) problems.push(`${name}: ${p}`);
        const id = data?.id;
        if (typeof id !== 'string') continue;
        if (owners.has(id)) problems.push(`${name}: chapter ID "${id}" is also used by ${owners.get(id)}`);
        else owners.set(id, name);
        const base = name.split('/').pop().replace(/\.json$/i, '');
        if (base !== id) problems.push(`${name}: file name should match the chapter ID "${id}"`);
    }
    if (!ok) return problems;
    for (const id of campaign.chapters) {
        if (!owners.has(id)) problems.push(`campaign: chapter "${id}" has no file`);
    }
    if (new Set(campaign.chapters).size !== campaign.chapters.length) problems.push('campaign: a chapter is listed twice');
    for (const [tier, id] of Object.entries(campaign.reviews ?? {})) {
        if (!/^([0-4]|any)$/.test(tier)) problems.push(`campaign: reviews key "${tier}" must be a tier or "any"`);
        if (!owners.has(id)) problems.push(`campaign: review chapter "${id}" has no file`);
        else if (campaign.chapters.includes(id)) problems.push(`campaign: review chapter "${id}" must not also be in the main sequence`);
    }
    for (const id of owners.keys()) {
        if (!campaign.chapters.includes(id) && !Object.values(campaign.reviews ?? {}).includes(id)) {
            problems.push(`${owners.get(id)}: chapter "${id}" is not used by the campaign`);
        }
    }
    for (const [key, who] of Object.entries(speakers ?? {})) {
        if (!ID.test(key) || !isObject(who) || typeof who.name !== 'string') problems.push(`campaign: speaker "${key}" needs a name`);
    }
    return problems;
}
