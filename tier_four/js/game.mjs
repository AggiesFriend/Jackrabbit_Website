// Tier Four screens. All game rules are in engine.mjs; this file loads the
// content, draws the state and passes on taps.
import {
    beginChapter, canRewind, chapterSummary, choose, currentChapter, currentScene, debrief, finishJump,
    hintsOf, newPlay, nextChapter, pendingJump, proceed, reveal, rewind, skipTo, validPlay, viewCampaign,
    visibleChoices, visibleLines,
} from './engine.mjs';
import { exportCode, importCode, jsonStore, saveKey, settings as settingsStore } from './storage.mjs';
import { runJump } from './snap.mjs';
import { audio } from './audio.mjs';
import { recorder } from './playtest.mjs';

const DATA_URL = new URL('../data/', import.meta.url);
const $ = id => document.getElementById(id);
const SCREENS = ['title', 'brief', 'play', 'snap', 'closed', 'end'];
const TRUST_NAMES = { frank: 'Frank', amanda: 'Amanda', eleanor: 'Eleanor', halsey: 'Director Halsey', chen: 'Administrator Chen' };

const store = settingsStore(() => window.localStorage);
const json = jsonStore(store);
const playtest = recorder(new URLSearchParams(location.search).has('playtest'));

// ------------------------------------------------------------ settings

const DEFAULTS = { textSize: 'normal', speed: 'normal', motion: 'system', sound: 'off', autoPlot: 'off' };
let prefs = { ...DEFAULTS, ...json.get('settings', {}) };

const reducedMotion = () => prefs.motion === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const instantText = () => prefs.speed === 'instant' || reducedMotion();

function applyPrefs() {
    document.documentElement.dataset.text = prefs.textSize === 'large' ? 'large' : '';
    document.documentElement.dataset.motion = prefs.motion === 'reduced' ? 'reduced' : '';
    for (const b of document.querySelectorAll('[data-setting]')) {
        b.setAttribute('aria-pressed', String(prefs[b.dataset.setting] === b.dataset.value));
    }
    audio.set(prefs.sound === 'on', document.body.dataset.ship);
}

function setPref(key, value) {
    prefs = { ...prefs, [key]: value };
    json.set('settings', prefs);
    applyPrefs();
    playtest.record('setting', { key, value });
}

// ---------------------------------------------------------------- state

let mode = store.get('mode', 'spoiler-free') === 'reader' ? 'reader' : 'spoiler-free';
let campaign = null;
let chapters = null;
const views = {};
let view = null;
let play = null;
let typing = null;      // { finish } while Aggie is typing
let revealing = false;

const viewFor = m => (views[m] ??= viewCampaign(campaign, chapters, m));

function save() {
    if (!play) return;
    if (!json.set(saveKey(mode), play)) $('save-note').textContent = 'Storage is blocked in this browser, so progress won’t be saved.';
}

function loadSave(m) {
    const saved = json.get(saveKey(m), null);
    return saved && validPlay(saved, viewFor(m)) ? saved : null;
}

// ------------------------------------------------------------- helpers

function element(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
}

const bookTitle = () => element('em', 'Coming of Age');

function show(name) {
    for (const s of SCREENS) $(`screen-${s}`).hidden = s !== name;
    window.scrollTo(0, 0);
    const heading = document.querySelector(`#screen-${name} [tabindex="-1"]`);
    heading?.focus();
    playtest.record('screen', { name });
}

function setShip(ship) {
    document.body.dataset.ship = ship ?? 'alc';
    audio.ship(ship ?? 'alc');
}

const shipName = ship => ship === 'jackrabbit' ? 'Jackrabbit' : 'ALC-7293';
const tierName = tier => tier === 0 ? 'Independent' : `Tier ${tier}`;
const modeName = m => m === 'reader' ? 'Spoilers on' : 'Spoiler-free';

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
    const form = dialog.querySelector('form');
    return new Promise(resolve => {
        const done = yes => {
            form.removeEventListener('submit', onSubmit);
            dialog.removeEventListener('cancel', onCancel);
            setTimeout(() => resolve(yes));
        };
        const onSubmit = event => done(event.submitter?.value === 'ok');
        const onCancel = () => done(false);
        form.addEventListener('submit', onSubmit);
        dialog.addEventListener('cancel', onCancel);
    });
}

// ----------------------------------------------------------- spoilers

function drawMode() {
    const on = mode === 'reader';
    for (const id of ['reader-switch', 'drawer-reader-switch']) $(id).setAttribute('aria-checked', String(on));
    $('mode-note').replaceChildren(...(on
        ? ['Spoilers are on. The game follows ', bookTitle(), ' to its ending.']
        : ['Spoiler-free. Nothing from Book 4 is given away.']));
}

// Turning spoilers on always shows the warning; turning them off never does.
// Wording approved by the author on 8 November 2026.
async function toggleSpoilers(fromDrawer = false) {
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
        if (!sure) {
            drawMode();
            return;
        }
        mode = 'reader';
    }
    store.set('mode', mode);
    playtest.record('spoilers', { mode });
    drawMode();
    if (fromDrawer) {
        $('drawer').close();
        toTitle();
    } else {
        drawTitle();
        $('reader-switch').focus();
    }
}

// --------------------------------------------------------------- title

function drawTitle() {
    setShip('alc');
    view = viewFor(mode);
    const saved = loadSave(mode);
    $('continue').hidden = !saved;
    $('new-career').textContent = saved ? 'Start again' : 'Start a new career';
    if (saved) {
        const chapter = currentChapter(saved, view);
        $('save-note').textContent = saved.phase === 'ended'
            ? `A finished ${modeName(mode).toLowerCase()} career is saved. Continue to see its debrief again.`
            : `Saved: ${chapter?.title ?? 'in progress'} (${tierName(chapter?.tier ?? 0)}).`;
        $('save-note').hidden = false;
    } else if (!store.available) {
        $('save-note').textContent = 'Storage is blocked in this browser, so progress won’t be saved between visits.';
        $('save-note').hidden = false;
    } else {
        $('save-note').hidden = true;
    }
    drawMode();
}

function toTitle() {
    play = null;
    drawTitle();
    show('title');
}

async function startCareer() {
    if (loadSave(mode)) {
        const sure = await confirmChoice({
            title: 'Start again?',
            text: [[`Your saved ${modeName(mode).toLowerCase()} career will be replaced. This can’t be undone.`]],
            ok: 'Start again',
            cancel: 'Keep my career',
        });
        if (!sure) return;
    }
    view = viewFor(mode);
    play = newPlay(view);
    playtest.record('new-career', { mode });
    save();
    audio.theme();
    render();
}

function continueCareer() {
    view = viewFor(mode);
    play = loadSave(mode);
    if (!play) return drawTitle();
    playtest.record('continue', { chapter: play.chapter, scene: play.scene });
    render();
}

// -------------------------------------------------------------- render

function render() {
    if (!play) return toTitle();
    const chapter = currentChapter(play, view);
    setShip(chapter?.ship ?? 'alc');
    if (play.phase === 'ended') return drawEnd();
    if (play.phase === 'brief') return drawBrief(chapter);
    if (play.phase === 'closed') return drawClosed();
    const jump = pendingJump(play, view);
    if (jump) return drawJump(jump, chapter);
    drawPlay(chapter);
}

function drawBrief(chapter) {
    $('brief-tier').textContent = tierName(chapter.tier);
    $('brief-ship').textContent = shipName(chapter.ship);
    $('brief-title').textContent = chapter.title;
    $('brief-subtitle').textContent = chapter.subtitle;
    const b = chapter.brief ?? {};
    $('brief-client').textContent = b.client ?? '';
    $('brief-route').textContent = b.route ?? '';
    $('brief-cargo').textContent = b.cargo ?? '';
    $('brief-fee').textContent = b.fee ?? '';
    $('brief-notes').textContent = b.notes ?? '';
    $('brief-notes-row').hidden = !b.notes;
    show('brief');
}

function drawJump(jump, chapter) {
    show('snap');
    const spec = { ...jump, seed: `${chapter.id}/${play.scene}` };
    runJump($('screen-snap'), spec, {
        reducedMotion: reducedMotion(),
        autoPlot: prefs.autoPlot === 'on',
        onEvent: (type, detail) => {
            playtest.record(`snap-${type}`, detail);
            if (type === 'anchor') audio.tick(detail.ok ? 'tap' : 'bad');
            if (type === 'jump-done') audio.tick('jump');
        },
    }).then(result => {
        play = finishJump(play, view, result);
        save();
        render();
    });
}

function drawStatus(chapter) {
    $('play-ship').textContent = shipName(chapter.ship);
    $('play-tier').textContent = tierName(chapter.tier);
    $('cover-wrap').hidden = chapter.ship === 'jackrabbit';
    const fill = $('cover-fill');
    fill.style.width = `${play.cover}%`;
    fill.classList.toggle('warn', play.cover >= 50 && play.cover < 80);
    fill.classList.toggle('bad', play.cover >= 80);
    $('cover-text').textContent = `Cover: ${play.cover} of 100`;
    $('cover-wrap').setAttribute('aria-label', `Cover ${play.cover} of 100`);
}

// Draws the current scene: the lines revealed so far at once, then one
// more per tap of Continue, then the choices.
function drawPlay(chapter) {
    drawStatus(chapter);
    $('play-title').textContent = chapter.kind === 'contract' && chapter.subtitle ? `${chapter.title} · ${chapter.subtitle}` : chapter.title;
    const list = $('lines');
    const lines = visibleLines(play, view);
    const key = `${play.chapter}/${play.scene}`;
    if (list.dataset.scene !== key) {
        list.dataset.scene = key;
        list.replaceChildren();
        for (const line of lines.slice(0, play.shown)) list.append(lineElement(line, false));
    }
    show('play');
    if (play.shown === 0 && lines.length) {
        revealNext();
    } else {
        drawControls();
    }
    playtest.record('scene', { chapter: play.chapter, scene: play.scene });
}

function speakerName(who) {
    if (who === 'n') return '';
    if (who === 'jack') return 'Jack';
    return view.speakers[who]?.name ?? who;
}

function lineElement(line, animate) {
    const li = element('li', undefined, `line ${line.who === 'n' ? 'n' : line.who === 'aggie' ? 'aggie' : line.who === 'jack' ? 'jack' : 'other'}`);
    const name = speakerName(line.who);
    if (name) li.append(element('span', name, 'who'));
    const p = element('p');
    li.append(p);
    if (!animate) {
        p.textContent = pauseText(line);
        return li;
    }
    li.dataset.pending = 'true';
    return li;
}

const pauseText = line => line.kind === 'hesitate' && instantText() ? `(a pause) ${line.text}` : line.text;

// Reveals one more line. Aggie's lines type out, and a hesitation waits a
// moment first; a tap finishes either at once.
async function revealNext() {
    if (revealing) {
        typing?.finish();
        return;
    }
    const lines = visibleLines(play, view);
    if (play.shown >= lines.length) return drawControls();
    revealing = true;
    const line = lines[play.shown];
    const li = lineElement(line, true);
    $('lines').append(li);
    const p = li.querySelector('p');
    $('advance').textContent = '…';
    $('advance').disabled = line.who !== 'aggie';
    li.scrollIntoView({ block: 'end', behavior: reducedMotion() ? 'auto' : 'smooth' });
    if (line.who === 'aggie') audio.tick('aggie');
    else audio.tick('tap');
    await typeOut(p, line);
    play = reveal(play, view, play.shown + 1);
    save();
    revealing = false;
    if (line.kind) playtest.record('hint', { id: line.hint, kind: line.kind });
    drawControls();
}

function typeOut(p, line) {
    if (line.who !== 'aggie' || instantText()) {
        p.textContent = pauseText(line);
        return Promise.resolve();
    }
    return new Promise(resolve => {
        let i = 0;
        let timer = null;
        const text = line.text;
        const finish = () => {
            clearTimeout(timer);
            p.classList.remove('typing');
            p.textContent = text;
            typing = null;
            resolve();
        };
        typing = { finish };
        const type = () => {
            i = Math.min(text.length, i + 1 + (text.length > 160 ? 1 : 0));
            p.textContent = text.slice(0, i);
            if (i >= text.length) return finish();
            timer = setTimeout(type, /[.,;:!?]/.test(text[i - 1]) ? 110 : 22);
        };
        p.classList.add('typing');
        if (line.kind === 'hesitate') {
            p.innerHTML = '<span class="pause-dots">· · ·</span>';
            timer = setTimeout(() => {
                p.textContent = '';
                type();
            }, 1300);
        } else {
            timer = setTimeout(type, 180);
        }
    });
}

function drawControls() {
    const lines = visibleLines(play, view);
    const advance = $('advance');
    const choicesBox = $('choices');
    const scene = currentScene(play, view);
    if (play.shown < lines.length) {
        advance.hidden = false;
        advance.disabled = false;
        advance.textContent = 'Continue';
        choicesBox.hidden = true;
        return;
    }
    const choices = visibleChoices(play, view);
    advance.hidden = true;
    choicesBox.hidden = false;
    choicesBox.replaceChildren();
    if (choices.length) {
        choices.forEach((choice, i) => {
            const b = element('button', choice.text);
            b.type = 'button';
            b.addEventListener('click', () => takeChoice(i, choice));
            choicesBox.append(b);
        });
    } else {
        const label = scene.rewindTo ? 'Try again' : scene.end || !scene.next ? (currentChapter(play, view).kind === 'contract' ? 'Close the contract' : 'Continue') : 'Continue';
        const b = element('button', label, 'primary');
        b.type = 'button';
        b.addEventListener('click', () => {
            audio.tick('choice');
            play = proceed(play, view);
            save();
            render();
        });
        choicesBox.append(b);
    }
    if (canRewind(play) && choices.length) {
        const r = element('button', 'Rewind to the last choice', 'rewind-link');
        r.type = 'button';
        r.addEventListener('click', doRewind);
        choicesBox.append(r);
    }
    choicesBox.firstChild?.focus({ preventScroll: true });
    choicesBox.scrollIntoView({ block: 'end', behavior: reducedMotion() ? 'auto' : 'smooth' });
}

async function takeChoice(index, choice) {
    if (choice.confirm) {
        const sure = await confirmChoice({ title: choice.text, text: [[choice.confirm]], ok: choice.text, cancel: 'Not yet' });
        if (!sure) return;
    }
    audio.tick('choice');
    playtest.record('choice', { chapter: play.chapter, scene: play.scene, text: choice.text, logs: choice.logs ?? [] });
    play = choose(play, view, index);
    save();
    render();
}

function doRewind() {
    if (!canRewind(play)) return;
    play = rewind(play);
    playtest.record('rewind', { chapter: play.chapter, scene: play.scene });
    save();
    $('drawer').close();
    render();
}

function drawClosed() {
    const s = chapterSummary(play, view);
    $('closed-label').textContent = `${tierName(s.tier)} · ${s.kind === 'contract' ? 'Contract closed' : 'Scene ends'}`;
    $('closed-title').textContent = s.title;
    const body = $('closed-body');
    body.replaceChildren();
    if (s.kind === 'contract') {
        const row = element('div', undefined, 'stat-row');
        const jumps = s.jumps.length ? `${s.jumps.length} jump${s.jumps.length === 1 ? '' : 's'}${s.jumps.some(j => j.late) ? ', late' : ', on time'}` : 'No jumps';
        row.append(statEl('Jumps', jumps), statEl('Aggie', `${s.hintsSeen} of ${s.hintsTotal} things she said`), statEl('Cover', `${s.cover} of 100`));
        body.append(row);
    }
    if (s.readings.length) {
        body.append(element('h3', 'Journal'));
        const ul = element('ul', undefined, 'summary-list');
        for (const t of s.readings) ul.append(element('li', t));
        for (const t of s.notes) ul.append(element('li', t, 'note'));
        body.append(ul);
    } else if (s.notes.length) {
        const ul = element('ul', undefined, 'summary-list');
        for (const t of s.notes) ul.append(element('li', t, 'note'));
        body.append(ul);
    } else if (s.kind === 'contract') {
        body.append(element('p', 'Nothing went in the journal this time.', 'status'));
    }
    show('closed');
}

function statEl(label, value) {
    const span = element('span');
    span.append(`${label}: `, element('strong', value));
    return span;
}

function drawEnd() {
    const ending = campaign.endings?.[mode] ?? { title: 'Career complete', text: [] };
    $('end-label').textContent = modeName(mode);
    $('end-title').textContent = ending.title;
    $('end-text').replaceChildren(...ending.text.map(t => element('p', t)));
    const d = debrief(play, view);
    const totals = $('debrief-totals');
    totals.replaceChildren(
        total(d.totals.read, `of ${d.totals.truths} read right`),
        total(d.totals.misread, 'misread'),
        total(d.totals.missed, 'missed'),
        total(d.totals.hintsSeen, `of ${d.totals.hints} hints seen`),
    );
    const box = $('debrief');
    box.replaceChildren();
    for (const chapter of d.chapters) {
        const section = element('section', undefined, 'debrief-chapter');
        section.append(element('h3', `${tierName(chapter.tier)} · ${chapter.title}`));
        chapter.truths.forEach(truth => {
            const t = element('div', undefined, 'truth');
            t.append(element('h4', truth.text));
            const verdict = element('p', undefined, 'verdict');
            verdict.append(truth.read
                ? element('span', 'You read this.', 'tag right')
                : truth.misread ? element('span', 'You misread this.', 'tag misread') : element('span', 'You never acted on this.', 'tag missed'));
            t.append(verdict);
            t.append(element('p', 'What Aggie said', 'label'));
            const ul = element('ul');
            for (const h of truth.hints) {
                const li = element('li');
                li.append(element('span', h.seen ? 'Heard: ' : 'Missed: ', `tag ${h.seen ? 'right' : 'missed'}`), `“${h.text}”`);
                ul.append(li);
            }
            t.append(ul);
            if (truth.readings.length) {
                t.append(element('p', 'What you made of it', 'label'));
                const rl = element('ul');
                for (const r of truth.readings) {
                    const li = element('li');
                    li.append(element('span', r.correct ? 'Right: ' : 'Misread: ', `tag ${r.correct ? 'right' : 'misread'}`), r.journal);
                    rl.append(li);
                }
                t.append(rl);
            }
            section.append(t);
        });
        box.append(section);
    }
    show('end');
    playtest.record('ended', d.totals);
}

function total(n, label) {
    const div = element('div');
    div.append(element('strong', String(n)), element('span', label));
    return div;
}

// -------------------------------------------------------------- drawer

function openDrawer(tab = 'log') {
    drawDrawer();
    selectTab(tab);
    $('drawer').showModal();
}

function selectTab(name) {
    for (const t of ['log', 'aggie', 'standing', 'settings']) {
        $(`tab-${t}`).setAttribute('aria-selected', String(t === name));
        $(`panel-${t}`).hidden = t !== name;
    }
    $('drawer-title').textContent = name === 'settings' ? 'Menu' : 'Journal';
    $(`tab-${name}`).focus();
}

function drawDrawer() {
    const inPlay = Boolean(play) && play.phase !== 'ended';
    $('play-controls').hidden = !play;
    $('rewind').disabled = !(play && canRewind(play));
    $('playtest-group').hidden = !playtest.active;
    $('export-note').hidden = true;
    $('import-note').textContent = '';
    $('results-note').textContent = '';
    drawMode();

    // Log
    const log = $('panel-log');
    log.replaceChildren();
    if (!play || !play.journal.length) {
        log.append(element('p', inPlay ? 'Nothing logged yet. Acting on what Aggie seems to mean writes it here.' : 'Start a career to keep a journal.', 'empty'));
    } else {
        let lastChapter = null;
        let ul = null;
        for (const entry of play.journal) {
            if (entry.chapter !== lastChapter) {
                lastChapter = entry.chapter;
                log.append(element('h3', chapterTitle(entry.chapter)));
                ul = element('ul', undefined, 'journal-list');
                log.append(ul);
            }
            ul.append(element('li', entry.text, entry.kind === 'note' ? 'note' : ''));
        }
    }

    // Aggie
    const ag = $('panel-aggie');
    ag.replaceChildren();
    if (!play || !play.hints.length) {
        ag.append(element('p', 'What Aggie says, when it seems to matter, is kept here so you can look back for the pattern.', 'empty'));
    } else {
        let lastChapter = null;
        let ul = null;
        for (const h of play.hints) {
            const chapter = view.chapters.find(c => c.id === h.chapter) ?? Object.values(view.reviews).find(c => c.id === h.chapter);
            const hint = chapter && hintsOf(chapter).find(x => x.id === h.id);
            if (!hint) continue;
            if (h.chapter !== lastChapter) {
                lastChapter = h.chapter;
                ag.append(element('h3', chapterTitle(h.chapter)));
                ul = element('ul', undefined, 'journal-list');
                ag.append(ul);
            }
            ul.append(element('li', `“${hint.text}”`, 'aggie'));
        }
    }

    // Standing
    const st = $('panel-standing');
    st.replaceChildren();
    if (!play) {
        st.append(element('p', 'Start a career to see where Jack stands.', 'empty'));
    } else {
        const chapter = currentChapter(play, view);
        st.append(standingRow('Rank', chapter ? tierName(chapter.tier) : '—'));
        st.append(standingRow('Cover', coverWords(play.cover)));
        for (const [key, name] of Object.entries(TRUST_NAMES)) {
            if (play.trust[key] === undefined) continue;
            st.append(standingRow(name, trustWords(play.trust[key])));
        }
        const late = play.jumps.filter(j => j.late).length;
        st.append(standingRow('Jumps', play.jumps.length ? `${play.jumps.length} flown, ${late} late` : 'None yet'));
        st.append(standingRow('Contracts closed', String(play.completed.length)));
        if (play.reviews) st.append(standingRow('Reviews', String(play.reviews)));
    }

    // Playtest
    if (playtest.active) {
        const select = $('skip-to');
        select.replaceChildren(element('option', 'Choose a chapter…'));
        for (const c of viewFor(mode).chapters) {
            const o = element('option', `${tierName(c.tier)} · ${c.title}`);
            o.value = c.id;
            select.append(o);
        }
    }
}

function chapterTitle(id) {
    const c = view.chapters.find(x => x.id === id) ?? Object.values(view.reviews).find(x => x.id === id);
    return c ? `${tierName(c.tier)} · ${c.title}` : id;
}

function standingRow(label, value) {
    const row = element('div', undefined, 'standing-row');
    row.append(element('span', label), element('strong', value));
    return row;
}

const coverWords = c => c < 20 ? `Clean (${c})` : c < 50 ? `Noticed (${c})` : c < 80 ? `Watched (${c})` : `Under review (${c})`;
const trustWords = t => t <= 0 ? 'Guarded' : t === 1 ? 'Civil' : t === 2 ? 'Warm' : t === 3 ? 'Close' : 'Family';

async function copyText(text, noteEl, okMessage) {
    try {
        await navigator.clipboard.writeText(text);
        noteEl.textContent = okMessage;
    } catch {
        noteEl.textContent = 'Copying isn’t allowed here. Select the code below and copy it yourself.';
        const ta = $('import-code');
        ta.value = text;
        ta.focus();
        ta.select();
    }
    noteEl.hidden = false;
}

async function abandon() {
    const sure = await confirmChoice({
        title: 'Abandon this career?',
        text: [['Your progress in this mode will be deleted. This can’t be undone. Copy a save code first if you might want it back.']],
        ok: 'Abandon it',
        cancel: 'Keep playing',
    });
    if (!sure) return;
    json.remove(saveKey(mode));
    playtest.record('abandon');
    $('drawer').close();
    toTitle();
}

function importSave() {
    const note = $('import-note');
    try {
        const loaded = importCode($('import-code').value);
        const m = loaded?.mode;
        if (!['spoiler-free', 'reader'].includes(m) || !validPlay(loaded, viewFor(m))) throw new Error('That save code doesn’t fit this version of the game.');
        json.set(saveKey(m), loaded);
        if (m !== mode) {
            mode = m;
            store.set('mode', mode);
        }
        view = viewFor(mode);
        play = loaded;
        note.textContent = 'Loaded.';
        playtest.record('import', { mode: m });
        $('drawer').close();
        render();
    } catch (err) {
        note.textContent = err.message;
    }
}

// -------------------------------------------------------------- wiring

$('reader-switch').addEventListener('click', () => toggleSpoilers(false));
$('drawer-reader-switch').addEventListener('click', () => toggleSpoilers(true));
$('new-career').addEventListener('click', startCareer);
$('continue').addEventListener('click', continueCareer);
$('how-to-play').addEventListener('click', () => $('help').showModal());
$('help-close').addEventListener('click', () => $('help').close());
$('title-settings').addEventListener('click', () => openDrawer('settings'));
$('accept').addEventListener('click', () => {
    audio.tick('choice');
    playtest.record('accept', { chapter: play.chapter });
    play = beginChapter(play);
    save();
    render();
});
$('brief-journal').addEventListener('click', () => openDrawer('log'));
$('play-journal').addEventListener('click', () => openDrawer('log'));
$('play-menu').addEventListener('click', () => openDrawer('settings'));
$('closed-journal').addEventListener('click', () => openDrawer('log'));
$('advance').addEventListener('click', revealNext);
$('transcript').addEventListener('click', () => {
    if (revealing) typing?.finish();
});
$('closed-next').addEventListener('click', () => {
    play = nextChapter(play, view);
    save();
    render();
});
$('end-restart').addEventListener('click', startCareer);
$('end-title-button').addEventListener('click', toTitle);
$('drawer-close').addEventListener('click', () => $('drawer').close());
for (const t of ['log', 'aggie', 'standing', 'settings']) $(`tab-${t}`).addEventListener('click', () => selectTab(t));
$('rewind').addEventListener('click', doRewind);
$('restart').addEventListener('click', abandon);
$('to-title').addEventListener('click', () => {
    $('drawer').close();
    toTitle();
});
$('export-save').addEventListener('click', () => copyText(exportCode(play), $('export-note'), 'Copied. Paste it into another browser’s Load box.'));
$('import-save').addEventListener('click', importSave);
$('copy-results').addEventListener('click', () => copyText(playtest.results(play), $('results-note'), 'Copied. Paste it into a message.'));
$('skip-to').addEventListener('change', event => {
    const id = event.target.value;
    if (!id) return;
    view = viewFor(mode);
    play = skipTo(view, id);
    save();
    $('drawer').close();
    render();
});
for (const b of document.querySelectorAll('[data-setting]')) {
    b.addEventListener('click', () => setPref(b.dataset.setting, b.dataset.value));
}

// Space or Enter anywhere but a control reads on.
document.addEventListener('keydown', event => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    if (event.target.closest('button, a, input, textarea, select, dialog')) return;
    if ($('screen-play').hidden) return;
    event.preventDefault();
    if (!$('advance').hidden) revealNext();
});

// Mode switches on the tablist by arrow keys.
$('drawer').querySelector('.tabs').addEventListener('keydown', event => {
    const tabs = ['log', 'aggie', 'standing', 'settings'];
    const i = tabs.findIndex(t => $(`tab-${t}`) === document.activeElement);
    if (i < 0) return;
    if (event.key === 'ArrowRight') selectTab(tabs[(i + 1) % tabs.length]);
    if (event.key === 'ArrowLeft') selectTab(tabs[(i + tabs.length - 1) % tabs.length]);
});

// ---------------------------------------------------------------- boot

$('playtest-banner').hidden = !playtest.active;
applyPrefs();
drawMode();
try {
    const response = await fetch(new URL('campaign.json', DATA_URL));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    campaign = await response.json();
    const ids = [...campaign.chapters, ...Object.values(campaign.reviews ?? {})];
    const loaded = await Promise.all(ids.map(async id => {
        const r = await fetch(new URL(`chapters/${id}.json`, DATA_URL));
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${id}`);
        return [id, await r.json()];
    }));
    chapters = Object.fromEntries(loaded);
    $('new-career').disabled = false;
    drawTitle();
} catch (err) {
    $('load-error').textContent = `The game’s content couldn’t be loaded (${err.message}). Try reloading the page.`;
    $('load-error').hidden = false;
}
