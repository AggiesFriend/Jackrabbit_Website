// A small static file server for the whole site, so pages load the way
// GitHub Pages serves them. Used by the layout sweep and by serve.mjs.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT } from './paths.mjs';

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
};

async function resolveFile(urlPath) {
    let rel;
    try {
        rel = decodeURIComponent(urlPath.split('?')[0]);
    } catch {
        return null;
    }
    const target = path.resolve(REPO_ROOT, '.' + rel);
    // Never serve anything outside the repo.
    if (target !== REPO_ROOT && !target.startsWith(REPO_ROOT + path.sep)) return null;
    // Keep the dev tools and git internals off the network.
    const inside = path.relative(REPO_ROOT, target).split(path.sep)[0];
    if (inside === '.git' || inside === 'tier_four_dev') return null;
    try {
        const stat = await fs.stat(target);
        if (stat.isDirectory()) {
            const index = path.join(target, 'index.html');
            await fs.access(index);
            // Like GitHub Pages, send "/folder" to "/folder/", so the page's
            // relative links resolve inside the folder.
            if (!rel.endsWith('/')) return { redirect: `${urlPath.split('?')[0]}/` };
            return index;
        }
        return target;
    } catch {
        return null;
    }
}

export function startServer({ port = 0, host = '127.0.0.1' } = {}) {
    const server = http.createServer(async (req, res) => {
        const file = await resolveFile(req.url);
        if (!file) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
        }
        if (file.redirect) {
            const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
            res.writeHead(301, { Location: file.redirect + query });
            res.end();
            return;
        }
        const body = await fs.readFile(file);
        res.writeHead(200, {
            'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
            'Cache-Control': 'no-store',
        });
        res.end(body);
    });
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => resolve(server));
    });
}
