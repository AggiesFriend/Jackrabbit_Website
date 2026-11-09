#!/usr/bin/env node
// Shared header nav and footer for the main site of www.jackrabbit-series.com
//
// The nav and the footer are defined once, in _tools/layout.json, and this
// script writes them into every page that carries their markers:
//
//     <!-- main-nav: generated from _tools/layout.json by _tools/layout.mjs -->
//     ...the generated <nav class="navbar"> block...
//     <!-- /main-nav -->
//
//     <!-- main-footer: generated from _tools/layout.json by _tools/layout.mjs -->
//     ...the generated <footer> block...
//     <!-- /main-footer -->
//
// Usage (from anywhere):
//     node _tools/layout.mjs           update every page that is out of date
//     node _tools/layout.mjs --check   list out-of-date pages and exit 1; change nothing
//
// In layout.json, write every href as a path from the site root with no
// leading slash ("books.html", "trust-us/index.html"). The script turns it
// into the right relative path for each page ("../books.html" from
// encyclopaedia/), or a "/"-rooted path for pages listed in
// "absolutePathPages" (404.html, which is served at any missing URL).
// Full URLs (https://...) are left as they are.
//
// A nav link with a "menu" list gets a sub-menu, like Books. Its styles are
// in css/styles.css and its open/close behaviour is in js/script.js.
//
// To give a new page the nav and footer, copy an existing page (the markers
// come with it), or put the marker lines where they belong and run this
// script. A page can carry either set of markers, or both. Folders starting
// with "." or "_" are skipped, as are node_modules. Jekyll does not publish
// "_" folders either, so this folder stays off the live site.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = join(ROOT, '_tools', 'layout.json');
const SOURCE_NOTE = 'generated from _tools/layout.json by _tools/layout.mjs';
const PARTS = [
    { name: 'main-nav', render: renderNav },
    { name: 'main-footer', render: renderFooter },
];
const checkOnly = process.argv.includes('--check');

// ----- Config -----
let config;
try {
    config = JSON.parse(readFileSync(CONFIG, 'utf8'));
} catch (err) {
    fail(`Could not read ${rel(CONFIG)}: ${err.message}`);
}
validate(config);

// ----- Pages -----
const pages = findHtml(ROOT).filter((file) => {
    const src = readFileSync(file, 'utf8');
    return PARTS.some((p) => src.includes(`<!-- ${p.name}`));
});
if (pages.length === 0) fail('No pages carry the main-nav or main-footer markers.');

const stale = [];
for (const file of pages) {
    const page = rel(file);
    const original = readFileSync(file, 'utf8');
    const eol = original.includes('\r\n') ? '\r\n' : '\n';
    let src = original;

    for (const part of PARTS) {
        const startPrefix = `<!-- ${part.name}`;
        const end = `<!-- /${part.name} -->`;
        const start = src.indexOf(startPrefix);
        if (start < 0) continue;
        if (src.indexOf(startPrefix, start + startPrefix.length) !== -1) {
            fail(`${page}: carries the ${part.name} markers more than once.`);
        }
        const endAt = src.indexOf(end, start);
        if (endAt < 0) fail(`${page}: has "${startPrefix} ..." but no "${end}" after it.`);

        const lineStart = src.lastIndexOf('\n', start) + 1;
        const indent = src.slice(lineStart, start);
        if (/\S/.test(indent)) fail(`${page}: the ${part.name} start marker must be on a line of its own.`);

        const lines = [`<!-- ${part.name}: ${SOURCE_NOTE} -->`, ...part.render(prefixFor(page)), end];
        src = src.slice(0, lineStart) + lines.map((l) => indent + l).join(eol) + src.slice(endAt + end.length);
    }

    if (src !== original) {
        stale.push(page);
        if (!checkOnly) writeFileSync(file, src);
    }
}

if (checkOnly) {
    if (stale.length) {
        console.log(`${stale.length} of ${pages.length} pages are out of date:`);
        stale.forEach((p) => console.log(`  ${p}`));
        console.log('Run: node _tools/layout.mjs');
        process.exit(1);
    }
    console.log(`All ${pages.length} pages are up to date.`);
} else {
    console.log(stale.length
        ? `Updated ${stale.length} of ${pages.length} pages.`
        : `All ${pages.length} pages were already up to date.`);
}

// ----- Rendering -----
function linker(prefix) {
    return (h) => esc(/^[a-z]+:/i.test(h) ? h : prefix + h);
}

function renderNav(prefix) {
    const nav = config.nav;
    const href = linker(prefix);
    const out = [
        '<nav class="navbar" aria-label="Primary navigation">',
        '    <div class="logo">',
        `        <a href="${href(nav.logo.href)}">${esc(nav.logo.text)}</a>`,
        '    </div>',
        '    <ul class="nav-links">',
    ];
    for (const link of nav.links) {
        if (!link.menu) {
            out.push(`        <li><a href="${href(link.href)}">${esc(link.text)}</a></li>`);
            continue;
        }
        const id = `${slug(link.text)}-submenu`;
        out.push(
            '        <li class="has-submenu">',
            `            <a href="${href(link.href)}">${esc(link.text)}</a>`,
            `            <button class="submenu-toggle" type="button" aria-expanded="false" aria-controls="${id}"><span class="visually-hidden">Show the ${esc(link.text)} menu</span></button>`,
            `            <ul class="submenu" id="${id}">`,
            ...link.menu.map((item) => `                <li><a href="${href(item.href)}">${esc(item.text)}</a></li>`),
            '            </ul>',
            '        </li>',
        );
    }
    out.push(
        '    </ul>',
        '    <div class="burger" role="button" aria-label="Toggle navigation menu" aria-expanded="false" tabindex="0">',
        '        <div class="line1"></div>',
        '        <div class="line2"></div>',
        '        <div class="line3"></div>',
        '    </div>',
        '</nav>',
    );
    return out;
}

function renderFooter(prefix) {
    const footer = config.footer;
    const href = linker(prefix);
    return [
        '<footer>',
        '    <div class="container">',
        '        <div class="footer-content">',
        '            <div class="footer-logo">',
        `                <h3>${esc(footer.title)}</h3>`,
        ...(footer.tagline ? [`                <p>${esc(footer.tagline)}</p>`] : []),
        '            </div>',
        '            <div class="footer-links" role="navigation" aria-label="Footer navigation">',
        '                <ul>',
        ...footer.links.map((l) => `                    <li><a href="${href(l.href)}">${esc(l.text)}</a></li>`),
        '                </ul>',
        '            </div>',
        '        </div>',
        '        <div class="copyright">',
        `            <p>${esc(footer.copyright)}</p>`,
        '        </div>',
        '    </div>',
        '</footer>',
    ];
}

function prefixFor(page) {
    if ((config.absolutePathPages || []).includes(page)) return '/';
    return '../'.repeat(page.split('/').length - 1);
}

// ----- Helpers -----
function validate(c) {
    const problems = [];
    const text = (v, where, name) => {
        if (typeof v !== 'string' || !v.trim()) problems.push(`${where}: needs a "${name}"`);
    };
    const checkLink = (l, where) => {
        text(l && l.text, where, 'text');
        if (!l || typeof l.href !== 'string' || !l.href.trim()) { problems.push(`${where}: needs an "href"`); return; }
        if (l.href.startsWith('/')) problems.push(`${where}: write "${l.href}" without the leading slash`);
        else if (!/^[a-z]+:/i.test(l.href) && !existsSync(join(ROOT, l.href.split('#')[0]))) {
            problems.push(`${where}: "${l.href}" does not exist in the site`);
        }
    };
    const checkList = (list, where) => {
        if (!Array.isArray(list) || list.length === 0) { problems.push(`${where}: must be a list of links`); return false; }
        return true;
    };

    if (!c.nav) problems.push('needs a "nav" section');
    else {
        checkLink(c.nav.logo, 'nav.logo');
        if (checkList(c.nav.links, 'nav.links')) c.nav.links.forEach((l, i) => {
            checkLink(l, `nav.links[${i}]`);
            if (l && l.menu !== undefined && checkList(l.menu, `nav.links[${i}].menu`)) {
                l.menu.forEach((m, j) => checkLink(m, `nav.links[${i}].menu[${j}]`));
            }
        });
    }

    if (!c.footer) problems.push('needs a "footer" section');
    else {
        text(c.footer.title, 'footer', 'title');
        text(c.footer.copyright, 'footer', 'copyright');
        if (c.footer.tagline !== undefined && typeof c.footer.tagline !== 'string') problems.push('footer.tagline: must be text');
        if (checkList(c.footer.links, 'footer.links')) c.footer.links.forEach((l, i) => checkLink(l, `footer.links[${i}]`));
    }

    if (problems.length) fail(`Problems in ${rel(CONFIG)}:\n  ${problems.join('\n  ')}`);
}

function findHtml(dir) {
    const found = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || entry.name.startsWith('_') || entry.name === 'node_modules') continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) found.push(...findHtml(full));
        else if (entry.name.endsWith('.html')) found.push(full);
    }
    return found;
}

function rel(file) {
    return relative(ROOT, file).split(sep).join('/');
}

function slug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function esc(text) {
    return String(text)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/©/g, '&copy;');
}

function fail(message) {
    console.error(message);
    process.exit(2);
}
