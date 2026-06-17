// Markdown-style link parsing for game output.
//
// We accept the form  [link text](url)  inside any line of output, and
// turn it into a sequence of text + link segments. The DOM renderer
// converts each segment into a text node or an <a> element.
//
// Rationale: writing raw HTML in world content is risky (XSS surface, easy
// to malform). The single-purpose syntax keeps authoring simple and lets
// the renderer escape all non-link text via DOM textContent.
//
// Security: only http/https/mailto schemes and relative paths are
// honoured. Anything else (e.g. `javascript:`) is passed through as plain
// text so the original input is still visible to the player.
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;
export function isSafeHref(href) {
    const h = href.trim();
    if (h.length === 0)
        return false;
    if (h.startsWith("/"))
        return true; // root-relative
    if (h.startsWith("#"))
        return true; // in-page anchor
    if (/^https?:\/\//i.test(h))
        return true; // http / https
    if (/^mailto:/i.test(h))
        return true; // mailto
    return false;
}
/**
 * Split `line` into a sequence of text and link segments. Unsafe URLs
 * fall through to text so the player still sees the original characters.
 */
export function parseLinks(line) {
    if (line.length === 0)
        return [{ kind: "text", value: "" }];
    const out = [];
    let cursor = 0;
    // Reset regex state — LINK_RE is a module-level RegExp with /g.
    LINK_RE.lastIndex = 0;
    let match;
    while ((match = LINK_RE.exec(line)) !== null) {
        const [whole, text, href] = match;
        const start = match.index;
        if (start > cursor) {
            out.push({ kind: "text", value: line.slice(cursor, start) });
        }
        if (text && href && isSafeHref(href)) {
            out.push({ kind: "link", text, href });
        }
        else {
            // Unsafe or malformed — preserve the raw text.
            out.push({ kind: "text", value: whole });
        }
        cursor = start + whole.length;
    }
    if (cursor < line.length) {
        out.push({ kind: "text", value: line.slice(cursor) });
    }
    if (out.length === 0)
        out.push({ kind: "text", value: line });
    return out;
}
