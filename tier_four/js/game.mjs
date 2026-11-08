// Tier Four prototype screens: start, contract and debrief. All game rules
// are in engine.mjs; this file only draws them and passes on taps.
import {
    actionsOf, canTake, debrief, endContract, journal, nextHint, seenHints, startPlay, takeAction,
} from './engine.mjs';
import { settings } from './storage.mjs';

const CONTRACT_URL = new URL('../data/contracts/example-contract.json', import.meta.url);

const $ = id => document.getElementById(id);
const screens = ['start', 'contract', 'debrief'];
const saved = settings(() => window.localStorage);

// Reader mode is remembered on this device once the player has confirmed
// the spoiler warning.
let mode = saved.get('mode', 'spoiler-free') === 'reader' ? 'reader' : 'spoiler-free';
let contract = null;
let play = null;

// Placeholder labels until the format gives actions their own text:
// "inspect-cargo" becomes "Inspect cargo".
const actionLabel = action => action.charAt(0).toUpperCase() + action.slice(1).replaceAll('-', ' ');
const modeName = m => m === 'reader' ? 'Spoilers on' : 'Spoiler-free';

function show(name) {
    for (const s of screens) $(`screen-${s}`).hidden = s !== name;
    window.scrollTo(0, 0);
    document.querySelector(`#screen-${name} [tabindex="-1"]`).focus();
}

function element(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
}

// The book's title, in italics.
const bookTitle = () => element('em', 'Coming of Age');

// Resolves to true if the player chose the confirming button. `text` is a
// list of paragraphs, each a list of strings and elements.
function confirmChoice({ title, text, ok, cancel }) {
    const dialog = $('confirm');
    $('confirm-text').replaceChildren(...text.map(parts => {
        const p = element('p');
        p.append(...parts);
        return p;
    }));
    if (typeof dialog.showModal !== 'function') {
        return Promise.resolve(window.confirm(`${title}\n\n${$('confirm-text').textContent}`));
    }
    $('confirm-title').textContent = title;
    $('confirm-ok').textContent = ok;
    $('confirm-cancel').textContent = cancel;
    dialog.returnValue = '';
    dialog.showModal();
    $('confirm-cancel').focus();
    // Not the "close" event: it fires later, and a late one from the last
    // dialog can arrive after this one has opened. "submit" and "cancel"
    // fire just before the dialog closes, so resolve in the next task, once
    // it has closed and callers can move focus.
    const form = dialog.querySelector('form');
    return new Promise(resolve => {
        const done = ok => {
            form.removeEventListener('submit', onSubmit);
            dialog.removeEventListener('cancel', onCancel);
            setTimeout(() => resolve(ok));
        };
        const onSubmit = event => done(event.submitter?.value === 'ok');
        const onCancel = () => done(false);
        form.addEventListener('submit', onSubmit);
        dialog.addEventListener('cancel', onCancel);
    });
}

// Start screen

function drawMode() {
    const on = mode === 'reader';
    $('reader-switch').setAttribute('aria-checked', String(on));
    $('mode-note').replaceChildren(...(on
        ? ['Spoilers are on. The game follows ', bookTitle(), ' to its ending.']
        : ['Spoiler-free. Nothing from Book 4 is given away.']));
}

// Turning spoilers on always shows the warning; turning them off never does.
// DRAFT WORDING, awaiting the author's approval.
async function toggleSpoilers() {
    if (mode === 'reader') {
        mode = 'spoiler-free';
    } else {
        const sure = await confirmChoice({
            title: 'Turn on spoilers?',
            text: [
                ['With spoilers on, the game follows Book 4, ', bookTitle(),
                    ', all the way to its ending, and gives away its biggest twists. '
                    + 'If you haven’t read the book, they will be spoiled for you.'],
                ['A short quiz on the plot was considered as a way to unlock this, and dropped. '
                    + 'Instead, the choice is yours.'],
                ['Only continue if you have read ', bookTitle(), ', or you’re happy to have it spoiled.'],
            ],
            ok: 'Yes, show me spoilers',
            cancel: 'No, keep it spoiler-free',
        });
        if (sure) mode = 'reader';
    }
    saved.set('mode', mode);
    drawMode();
    $('reader-switch').focus();
}

// Contract screen

function drawContract() {
    const { view } = play;
    $('contract-tier').textContent = `Tier ${view.tier}`;
    $('contract-mode').textContent = modeName(view.mode);
    $('contract-title').textContent = view.title;

    const hints = seenHints(play);
    const list = $('hints');
    // Add only new hints, so the live region announces just the latest one.
    while (list.children.length > hints.length) list.lastChild.remove();
    for (const hint of hints.slice(list.children.length)) list.append(element('li', hint.text));
    $('hints-empty').hidden = hints.length > 0;
    const more = play.hintsSeen < view.hints.length;
    $('next-hint').disabled = !more;
    $('next-hint').textContent = more ? 'Next' : 'No more messages';

    const actions = $('action-list');
    actions.replaceChildren(...actionsOf(view).map(action => {
        const taken = !canTake(play, action);
        const button = element('button', taken ? `${actionLabel(action)} (done)` : actionLabel(action));
        button.type = 'button';
        button.dataset.action = action;
        button.disabled = taken;
        button.addEventListener('click', () => chooseAction(action));
        return button;
    }));

    const entries = journal(play);
    $('journal').replaceChildren(...entries.map(text => element('li', text)));
    $('journal-empty').hidden = entries.length > 0;
}

async function chooseAction(action) {
    const label = actionLabel(action);
    const sure = await confirmChoice({
        title: `${label}?`,
        text: [['This goes in your journal and can’t be undone.']],
        ok: label,
        cancel: 'Not yet',
    });
    if (sure) play = takeAction(play, action);
    drawContract();
    // The buttons were redrawn: keep focus on this action, or move it to the
    // next one still open, or to End contract.
    const buttons = [...$('action-list').children];
    const start = buttons.findIndex(b => b.dataset.action === action);
    const open = [...buttons.slice(start), ...buttons.slice(0, start)].find(b => !b.disabled);
    (open ?? $('end-contract')).focus();
}

async function finishContract() {
    const sure = await confirmChoice({
        title: 'End the contract?',
        text: [['You’ll go to the debrief and can’t return to this contract.']],
        ok: 'End contract',
        cancel: 'Keep going',
    });
    if (!sure) return;
    play = endContract(play);
    drawDebrief();
    show('debrief');
}

// Debrief screen

function drawDebrief() {
    const report = debrief(play);
    $('debrief-mode').textContent = modeName(report.mode);
    $('debrief-contract').textContent = report.title;
    $('debrief-truths').replaceChildren(...report.truths.map((truth, i) => {
        const box = element('section', undefined, 'truth');
        box.append(element('h3', `Truth ${i + 1}`), element('p', truth.text));
        const verdict = element('p');
        verdict.append(truth.read
            ? element('span', 'You read this correctly.', 'tag right')
            : element('span', 'You didn’t read this.', 'tag missed'));
        box.append(verdict);

        box.append(element('p', 'Aggie’s hints', 'label'));
        const hints = element('ul');
        for (const h of truth.hints) {
            const li = element('li');
            li.append(element('span', h.seen ? 'Seen: ' : 'Missed: ', `tag ${h.seen ? 'right' : 'missed'}`), h.text);
            hints.append(li);
        }
        box.append(hints);

        box.append(element('p', 'Your readings', 'label'));
        if (truth.readings.length) {
            const readings = element('ul');
            for (const r of truth.readings) {
                const li = element('li');
                li.append(element('span', r.correct ? 'Right: ' : 'Misread: ', `tag ${r.correct ? 'right' : 'misread'}`), r.journal);
                readings.append(li);
            }
            box.append(readings);
        } else {
            box.append(element('p', 'None logged.', 'status'));
        }
        return box;
    }));
}

// Wiring

$('reader-switch').addEventListener('click', toggleSpoilers);
$('start').addEventListener('click', () => {
    // A new play each time, in the chosen mode only.
    play = startPlay(contract, mode);
    $('hints').replaceChildren();
    drawContract();
    show('contract');
});
$('next-hint').addEventListener('click', () => {
    play = nextHint(play);
    drawContract();
    if ($('next-hint').disabled) $('end-contract').focus();
});
$('end-contract').addEventListener('click', finishContract);
$('play-again').addEventListener('click', () => {
    play = null;
    show('start');
});

drawMode();
try {
    const response = await fetch(CONTRACT_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    contract = await response.json();
    $('start').disabled = false;
} catch (err) {
    $('load-error').textContent = `The contract couldn’t be loaded (${err.message}). Try reloading the page.`;
    $('load-error').hidden = false;
}
