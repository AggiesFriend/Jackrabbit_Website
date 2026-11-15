// Writes the whole game as a readable script in Markdown: for every chapter,
// in each mode it appears in, the brief, the truths, every scene's lines in
// reading order with its choices and where they lead, and the distinct
// routes through the chapter. Usage, from tier_four_dev/:
//   node tools/script.mjs [out.md]
import fs from 'node:fs';
import path from 'node:path';
import { GAME_DIR, DEV_DIR } from '../lib/paths.mjs';
import { viewCampaign, hintsOf } from '../../tier_four/js/engine.mjs';

const DATA = path.join(GAME_DIR, 'data');
const out = process.argv[2] ?? path.join(DEV_DIR, 'playthrough-script.md');
const campaign = JSON.parse(fs.readFileSync(path.join(DATA, 'campaign.json'), 'utf8'));
const chapters = {};
for (const f of fs.readdirSync(path.join(DATA, 'chapters'))) {
    const c = JSON.parse(fs.readFileSync(path.join(DATA, 'chapters', f), 'utf8'));
    chapters[c.id] = c;
}
const MODES = ['spoiler-free', 'reader'];
const views = Object.fromEntries(MODES.map(m => [m, viewCampaign(campaign, chapters, m)]));

const speaker = who => who === 'n' ? '' : who === 'jack' ? 'Jack' : (campaign.speakers[who]?.name ?? who);
const tierName = t => t === 0 ? 'Prologue' : `Tier ${t}`;
const modeTag = (item, chapterMode) => item.mode && item.mode !== 'both' && item.mode !== chapterMode ? ` *[${item.mode} only]*` : '';
const cond = item => {
    const bits = [];
    if (item.requires?.length) bits.push(`if ${item.requires.join(' and ')}`);
    if (item.unless?.length) bits.push(`unless ${item.unless.join(' or ')}`);
    return bits.length ? ` *[${bits.join('; ')}]*` : '';
};
const effects = c => {
    const bits = [];
    if (c.cover) bits.push(`cover ${c.cover > 0 ? '+' : ''}${c.cover}`);
    for (const [k, v] of Object.entries(c.trust ?? {})) bits.push(`${speaker(k)} trust ${v > 0 ? '+' : ''}${v}`);
    if (c.logs?.length) bits.push(`logs ${c.logs.join(', ')}`);
    if (c.set?.length) bits.push(`sets ${c.set.join(', ')}`);
    if (c.confirm) bits.push('asks to confirm');
    return bits.length ? ` *(${bits.join('; ')})*` : '';
};

// Every distinct route through a chapter view, as a list of scene ids.
// A rewind ends a route with a note; cycles are not followed.
function routes(chapter) {
    const found = [];
    const walk = (id, trail) => {
        const scene = chapter.scenes.find(s => s.id === id);
        if (!scene) return;
        const here = [...trail, id];
        const exits = [];
        for (const c of scene.choices) exits.push(c.goto);
        if (scene.next) exits.push(scene.next);
        if (scene.rewindTo) {
            found.push({ trail: here, end: `rewinds to ${scene.rewindTo}` });
            return;
        }
        if (scene.end || (!exits.length)) {
            found.push({ trail: here, end: 'end' });
            return;
        }
        for (const target of new Set(exits)) {
            if (target === 'end') found.push({ trail: here, end: 'end' });
            else if (here.includes(target)) found.push({ trail: here, end: `loops to ${target}` });
            else walk(target, here);
        }
    };
    walk(chapter.start, []);
    return found;
}

const lines = [];
const p = s => lines.push(s);
const raw = chapters;

p('# Tier Four: the full script');
p('');
p(`Generated ${new Date().toISOString().slice(0, 10)} from \`tier_four/data/\`. Every chapter in each mode it appears in: its brief, its truths, every scene in reading order with Aggie's hints marked, each choice with where it leads, and the distinct routes through the chapter. Lines shown only under a condition are annotated. Chapters are independent apart from flags carried between them, so the permutations of a whole career are the products of these routes.`);
p('');
p('## Contents');
p('');
for (const m of MODES) {
    p(`- **${m === 'reader' ? 'Reader mode (spoilers on)' : 'Spoiler-free mode'}**`);
    for (const c of views[m].chapters) p(`  - ${tierName(c.tier)}: ${c.title}`);
    p(`  - Review (when cover fills): ${views[m].reviews.any?.title ?? 'none'}`);
}
p('');
for (const m of MODES) {
    const view = views[m];
    p(`# ${m === 'reader' ? 'Reader mode (spoilers on)' : 'Spoiler-free mode'}`);
    p('');
    const ending = campaign.endings[m];
    const order = [...view.chapters, ...Object.values(view.reviews)];
    for (const c of order) {
        const rawChapter = raw[c.id];
        p(`## ${tierName(c.tier)}: ${c.title}${c.subtitle ? ` (${c.subtitle})` : ''}`);
        p('');
        p(`*${c.kind === 'contract' ? 'Contract' : 'Scene'} aboard the ${c.ship === 'jackrabbit' ? 'Jackrabbit' : 'ALC-7293'}; file \`${c.id}.json\`; chapter mode \`${rawChapter.mode}\`${c.requires.length ? `; only if ${c.requires.join(' and ')}` : ''}${Object.values(view.reviews).includes(c) ? '; played after a chapter in which cover reached 100' : ''}.*`);
        p('');
        if (c.brief) {
            p('**Contract card**');
            p('');
            for (const [k, v] of Object.entries(c.brief)) p(`- ${k[0].toUpperCase() + k.slice(1)}: ${v}`);
            p('');
            const own = c.decline ?? {};
            const base = view.decline ?? {};
            const side = Boolean(own.side);
            const who = own.who ?? base.who ?? 'dispatch';
            const text = own.text ?? (side ? base.sideText : base.text);
            const cover = own.cover ?? (side ? base.sideCover : base.cover) ?? 0;
            p(`**If declined** (${side ? 'side work: the contract closes unflown' : 'the contract stands and goes back to the card'}; cover ${cover > 0 ? '+' : ''}${cover}${own.text ? '' : '; the campaign’s default line'})`);
            p('');
            p(`**${speaker(who)}:** ${text}`);
            p('');
        }
        if (c.truths.length) {
            p('**Truths (never shown in play)**');
            p('');
            for (const t of c.truths) {
                p(`- \`${t.id}\`${modeTag(t, rawChapter.mode)}: ${t.text}`);
                for (const u of c.understandings.filter(u => u.truth === t.id)) p(`  - ${u.correct ? 'Right' : 'Misreading'} \`${u.id}\`${modeTag(u, rawChapter.mode)}: journal says “${u.journal}”`);
            }
            p('');
        }
        const hints = new Set(hintsOf(c).map(h => h.id));
        for (const s of c.scenes) {
            const rawScene = rawChapter.scenes.find(x => x.id === s.id);
            p(`### Scene \`${s.id}\`${modeTag(rawScene, rawChapter.mode)}${cond(s)}`);
            p('');
            if (s.jump) p(`*SNAP plot first: ${s.jump.name}, difficulty ${s.jump.difficulty}.*\n`);
            if (s.enter) p(`*On entry: ${JSON.stringify(s.enter)}.*\n`);
            for (const l of s.lines) {
                const who = speaker(l.who);
                const hint = l.kind && hints.has(l.hint) ? ` *[hint: ${l.kind}, for \`${l.truth}\`]*` : '';
                const tag = modeTag(l, rawChapter.mode) + cond(l) + hint;
                p(who ? `**${who}:** ${l.text}${tag}` : `${l.text}${tag}`);
                p('');
            }
            if (s.choices.length) {
                p('Choices:');
                p('');
                for (const ch of s.choices) p(`- ${ch.text}${modeTag(ch, rawChapter.mode)}${cond(ch)} → \`${ch.goto}\`${effects(ch)}`);
                p('');
            } else if (s.rewindTo) {
                p(`*Try again → rewinds to \`${s.rewindTo}\`.*\n`);
            } else if (s.end || !s.next) {
                p('*The chapter ends.*\n');
            } else {
                p(`*Continue → \`${s.next}\`.*\n`);
            }
        }
        const rs = routes(c);
        p(`**Routes through this chapter (${rs.length})**`);
        p('');
        rs.forEach((r, i) => p(`${i + 1}. ${r.trail.join(' → ')}${r.end === 'end' ? '' : ` (${r.end})`}`));
        p('');
    }
    p(`## Ending: ${ending.title}`);
    p('');
    for (const t of ending.text) p(`${t}\n`);
}
fs.writeFileSync(out, lines.join('\n'));
console.log(`${path.relative(process.cwd(), out)}: ${lines.length} lines, ${Math.round(fs.statSync(out).size / 1024)} KB`);
