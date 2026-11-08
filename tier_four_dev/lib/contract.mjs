// Contract data format, version 1: truths, hints and understandings, each
// tagged for spoiler-free mode, reader mode or both. The format is described
// in tier_four_dev/STATUS.md. validateContracts() returns a list of
// problems; an empty list means the contracts are valid.

const FORMAT = 1;
const MODES = {
    'spoiler-free': ['spoiler-free'],
    reader: ['reader'],
    both: ['spoiler-free', 'reader'],
};
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const oneOf = values => v => values.includes(v)
    ? null : `must be one of ${values.map(x => `"${x}"`).join(', ')}`;

// Each type returns an error message, or null if the value is fine.
const TYPES = {
    format: v => v === FORMAT ? null : `must be ${FORMAT}`,
    id: v => typeof v === 'string' && ID.test(v) ? null : 'must be a lower-case kebab-case ID',
    tier: v => Number.isInteger(v) && v >= 1 && v <= 4 ? null : 'must be a whole number from 1 to 4',
    text: v => typeof v === 'string' && v.trim() ? null : 'must be non-empty text',
    list: v => Array.isArray(v) ? null : 'must be a list',
    boolean: v => typeof v === 'boolean' ? null : 'must be true or false',
    mode: oneOf(Object.keys(MODES)),
    sequence: oneOf(['main', 'side']),
    kind: oneOf(['deflect', 'hesitate', 'over-comply', 'question']),
};

const CONTRACT = {
    format: 'format', id: 'id', tier: 'tier', sequence: 'sequence', mode: 'mode',
    title: 'text', truths: 'list', hints: 'list', understandings: 'list',
};
const ITEMS = {
    truths: { id: 'id', mode: 'mode', text: 'text' },
    hints: { id: 'id', mode: 'mode', truth: 'id', kind: 'kind', text: 'text' },
    understandings: { id: 'id', mode: 'mode', truth: 'id', action: 'id', correct: 'boolean', journal: 'text' },
};

const isSubset = (a, b) => a.every(x => b.includes(x));

// Checks required fields, their types and unknown fields (usually typos).
function checkFields(value, spec, where, problems) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        problems.push(`${where}: must be an object`);
        return false;
    }
    let ok = true;
    for (const [field, type] of Object.entries(spec)) {
        if (!(field in value)) {
            problems.push(`${where}: missing field "${field}"`);
            ok = false;
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

export function validateContract(contract) {
    const problems = [];
    checkFields(contract, CONTRACT, 'contract', problems);
    if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return problems;
    const contractModes = MODES[contract.mode];

    // Fields and IDs of each item. Only items whose fields are valid go on
    // to the reference and spoiler checks, so one mistake isn't reported
    // several times over: references to a broken item are skipped, and the
    // per-mode checks wait until every item's fields are valid.
    const items = {};
    const seen = new Map();
    const broken = new Set();
    for (const [list, spec] of Object.entries(ITEMS)) {
        items[list] = [];
        if (!Array.isArray(contract[list])) continue;
        contract[list].forEach((item, i) => {
            const id = typeof item?.id === 'string' ? ` (${item.id})` : '';
            const where = `${list}[${i}]${id}`;
            if (!checkFields(item, spec, where, problems)) {
                broken.add(item?.id);
                return;
            }
            if (seen.has(item.id)) problems.push(`${where}: ID "${item.id}" is already used by ${seen.get(item.id)}`);
            else seen.set(item.id, where);
            if (contractModes && !isSubset(MODES[item.mode], contractModes)) {
                problems.push(`${where}: mode "${item.mode}" would show it outside its contract, which is "${contract.mode}"`);
            }
            items[list].push({ item, where });
        });
    }

    // References: hints and understandings point at a truth, and must never
    // be shown in a mode where that truth is hidden.
    const truths = new Map(items.truths.map(({ item }) => [item.id, item]));
    for (const { item, where } of [...items.hints, ...items.understandings]) {
        const truth = truths.get(item.truth);
        if (broken.has(item.truth)) continue;
        if (!truth) {
            problems.push(`${where}: truth "${item.truth}" does not exist`);
        } else if (!isSubset(MODES[item.mode], MODES[truth.mode])) {
            problems.push(`${where}: mode "${item.mode}" would show it where its truth "${truth.id}" (mode "${truth.mode}") is hidden`);
        }
    }

    // In each mode the contract appears in, a main-sequence contract has 1
    // or 2 truths, and every truth shown can be hinted at and read correctly.
    if (broken.size || !Object.keys(ITEMS).every(list => Array.isArray(contract[list]))) return problems;
    for (const mode of contractModes ?? []) {
        const shown = list => items[list].filter(({ item }) => MODES[item.mode].includes(mode));
        const shownTruths = shown('truths');
        if (contract.sequence === 'main' && (shownTruths.length < 1 || shownTruths.length > 2)) {
            problems.push(`contract: a main-sequence contract needs 1 or 2 truths in ${mode} mode, found ${shownTruths.length}`);
        }
        for (const { item: truth, where } of shownTruths) {
            if (!shown('hints').some(({ item }) => item.truth === truth.id)) {
                problems.push(`${where}: no hint points to it in ${mode} mode`);
            }
            if (!shown('understandings').some(({ item }) => item.truth === truth.id && item.correct)) {
                problems.push(`${where}: no correct understanding of it in ${mode} mode`);
            }
        }
    }
    return problems;
}

// entries: [{ name, data }], one per contract file. Contract IDs must be
// unique across files.
export function validateContracts(entries) {
    const problems = [];
    const owners = new Map();
    for (const { name, data } of entries) {
        for (const p of validateContract(data)) problems.push(`${name}: ${p}`);
        const id = data?.id;
        if (typeof id !== 'string') continue;
        if (owners.has(id)) problems.push(`${name}: contract ID "${id}" is also used by ${owners.get(id)}`);
        else owners.set(id, name);
    }
    return problems;
}
