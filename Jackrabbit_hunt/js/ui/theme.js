// Accessibility preferences: colour scheme + reading font, with full per-colour
// customisation and named, saved presets.
//
// Presentation only, and deliberately decoupled from the engine. Built-in
// schemes are CSS `:root[data-theme="…"]` blocks in style.css. Customisation
// works by setting the SAME CSS custom properties *inline* on <html> — inline
// styles win over the stylesheet, so a custom colour set transparently
// overrides whichever base scheme it was seeded from. Everything persists to
// its own localStorage keys (never the engine's game-state save slot), so a
// change applies on the fly and can neither affect nor be affected by
// save / load / restart.
// Colour schemes. `dark` is the style.css :root default (no override block), so
// it must stay first / be the fallback. The rest are tuned for Irlen and
// dyslexic readers: low-contrast, tinted backgrounds.
export const THEMES = [
    { id: "dark", label: "Dark (default)" },
    { id: "dark-soft", label: "Dark — low glare" },
    { id: "yellow", label: "Yellow" },
    { id: "goldenrod", label: "Goldenrod" },
    { id: "peach", label: "Peach" },
    { id: "rose", label: "Rose" },
    { id: "green", label: "Green" },
    { id: "aqua", label: "Aqua" },
    { id: "turquoise", label: "Turquoise" },
    { id: "blue-grey", label: "Blue-grey" },
    { id: "purple", label: "Purple" },
    { id: "grey", label: "Grey" },
];
// Reading fonts. `default` is the style.css :root monospace default.
export const FONTS = [
    { id: "default", label: "Mono (default)" },
    { id: "sans", label: "Sans — larger" },
    { id: "dyslexic", label: "Dyslexia-friendly" },
];
// The nine themeable colours, in editor display order. Each id is the CSS
// custom-property name used throughout style.css — the single source of truth
// shared by the stylesheet, the editor UI, and the persisted presets.
export const COLOR_VARS = [
    { id: "--bg", label: "Background" },
    { id: "--fg", label: "Body text" },
    { id: "--accent", label: "Headings / links / accent" },
    { id: "--echo", label: "Your typed commands" },
    { id: "--dim", label: "Dim / secondary text" },
    { id: "--death", label: "Danger / death" },
    { id: "--bar-bg", label: "Status-bar background" },
    { id: "--bar-fg", label: "Status-bar text" },
    { id: "--border", label: "Borders" },
];
// Selection ids that aren't built-in themes.
export const CUSTOM_ID = "custom";
export const PRESET_PREFIX = "preset:";
const THEME_KEY = "jackrabbit.theme"; // builtin id | "custom" | "preset:<name>"
const FONT_KEY = "jackrabbit.font";
const ACTIVE_COLORS_KEY = "jackrabbit.activeColors"; // inline overrides (custom/preset)
const PRESETS_KEY = "jackrabbit.presets";
const DEFAULT_THEME = THEMES[0].id;
const DEFAULT_FONT = FONTS[0].id;
function safeGet(key) {
    try {
        return localStorage.getItem(key);
    }
    catch {
        return null; // private-mode / disabled storage: fall back to defaults.
    }
}
function safeSet(key, value) {
    try {
        localStorage.setItem(key, value);
    }
    catch {
        /* ignore — preference simply won't persist */
    }
}
function safeRemove(key) {
    try {
        localStorage.removeItem(key);
    }
    catch {
        /* ignore */
    }
}
function isBuiltin(id) {
    return THEMES.some((t) => t.id === id);
}
export function presetSelectionId(name) {
    return PRESET_PREFIX + name;
}
// ---- Fonts ---------------------------------------------------------------
export function loadFont() {
    const v = safeGet(FONT_KEY);
    return FONTS.some((f) => f.id === v) ? v : DEFAULT_FONT;
}
export function applyFont(id) {
    const chosen = FONTS.some((f) => f.id === id) ? id : DEFAULT_FONT;
    document.documentElement.dataset.font = chosen;
    safeSet(FONT_KEY, chosen);
}
// ---- Colour value helpers ------------------------------------------------
/** Normalise any CSS colour string to lowercase #rrggbb (for <input type=color>). */
export function toHex(raw) {
    const s = raw.trim();
    if (!s)
        return "#000000";
    if (s[0] === "#") {
        if (s.length === 4) {
            // #rgb -> #rrggbb
            const r = s[1];
            const g = s[2];
            const b = s[3];
            return ("#" + r + r + g + g + b + b).toLowerCase();
        }
        return s.slice(0, 7).toLowerCase();
    }
    const m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
        const parts = m[1].split(",").map((p) => parseInt(p.trim(), 10));
        const [r, g, b] = parts;
        if (r != null && g != null && b != null) {
            const h = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
            return ("#" + h(r) + h(g) + h(b)).toLowerCase();
        }
    }
    return "#000000";
}
/** The currently-applied colour for every themeable var, as #rrggbb. */
export function currentColors() {
    const cs = getComputedStyle(document.documentElement);
    const out = {};
    for (const v of COLOR_VARS)
        out[v.id] = toHex(cs.getPropertyValue(v.id));
    return out;
}
// ---- Applying themes -----------------------------------------------------
/** Apply a built-in scheme: drop any inline custom colours, let CSS govern. */
export function applyTheme(id) {
    const chosen = isBuiltin(id) ? id : DEFAULT_THEME;
    const root = document.documentElement;
    for (const v of COLOR_VARS)
        root.style.removeProperty(v.id);
    root.dataset.theme = chosen;
    safeRemove(ACTIVE_COLORS_KEY);
    safeSet(THEME_KEY, chosen);
}
/**
 * Apply a custom colour set as inline overrides. `selectionId` is what the
 * dropdown should show: "custom" for unsaved edits, or "preset:<name>".
 */
export function applyColors(colors, selectionId) {
    const root = document.documentElement;
    root.dataset.theme = CUSTOM_ID;
    const clean = {};
    for (const v of COLOR_VARS) {
        const c = colors[v.id];
        if (c) {
            const hex = toHex(c);
            root.style.setProperty(v.id, hex);
            clean[v.id] = hex;
        }
    }
    safeSet(ACTIVE_COLORS_KEY, JSON.stringify(clean));
    safeSet(THEME_KEY, selectionId);
}
// ---- Presets -------------------------------------------------------------
export function listPresets() {
    const raw = safeGet(PRESETS_KEY);
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((p) => p && typeof p.name === "string" && p.colors && typeof p.colors === "object");
    }
    catch {
        return [];
    }
}
export function findPreset(name) {
    return listPresets().find((p) => p.name === name);
}
/** Save (or overwrite by name) a named preset; returns the updated list. */
export function savePreset(name, colors) {
    const trimmed = name.trim();
    if (!trimmed)
        return listPresets();
    const presets = listPresets().filter((p) => p.name !== trimmed);
    presets.push({ name: trimmed, colors: { ...colors } });
    safeSet(PRESETS_KEY, JSON.stringify(presets));
    return presets;
}
export function deletePreset(name) {
    const presets = listPresets().filter((p) => p.name !== name);
    safeSet(PRESETS_KEY, JSON.stringify(presets));
    return presets;
}
// ---- Export / import -----------------------------------------------------
const EXPORT_FORMAT = "jackrabbit-themes";
const EXPORT_VERSION = 1;
/** Serialise all saved presets to a portable, versioned JSON string. */
export function exportPresetsJson() {
    const envelope = {
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        presets: listPresets(),
    };
    return JSON.stringify(envelope, null, 2);
}
/** Keep only recognised colour keys, normalised to #rrggbb. */
function sanitizeColors(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const src = raw;
    const out = {};
    for (const v of COLOR_VARS) {
        const val = src[v.id];
        if (typeof val === "string" && val.trim())
            out[v.id] = toHex(val);
    }
    return Object.keys(out).length ? out : null;
}
/**
 * Merge presets from an exported JSON string into local storage. Accepts either
 * the export envelope or a bare array of presets; same-named presets are
 * overwritten. Returns how many were imported (or a human-readable error).
 */
export function importPresetsJson(text) {
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        return { imported: 0, error: "That file isn't valid JSON." };
    }
    let rawPresets = [];
    if (Array.isArray(parsed)) {
        rawPresets = parsed;
    }
    else if (parsed && typeof parsed === "object") {
        const env = parsed;
        if (env.format === EXPORT_FORMAT && Array.isArray(env.presets))
            rawPresets = env.presets;
    }
    if (!rawPresets.length) {
        return { imported: 0, error: "No colour schemes found in that file." };
    }
    const byName = new Map(listPresets().map((p) => [p.name, p]));
    let imported = 0;
    for (const r of rawPresets) {
        if (!r || typeof r !== "object")
            continue;
        const rec = r;
        const name = typeof rec.name === "string" ? rec.name.trim() : "";
        if (!name)
            continue;
        const colors = sanitizeColors(rec.colors);
        if (!colors)
            continue;
        byName.set(name, { name, colors });
        imported++;
    }
    if (!imported) {
        return { imported: 0, error: "No usable colour schemes in that file." };
    }
    safeSet(PRESETS_KEY, JSON.stringify([...byName.values()]));
    return { imported };
}
// ---- Boot ----------------------------------------------------------------
/** What the theme dropdown currently shows. */
export function loadSelection() {
    return safeGet(THEME_KEY) ?? DEFAULT_THEME;
}
/** Apply whatever theme + font were stored last. Idempotent. */
export function applyStoredPrefs() {
    applyFont(loadFont());
    const sel = loadSelection();
    if (sel === CUSTOM_ID) {
        const raw = safeGet(ACTIVE_COLORS_KEY);
        if (raw) {
            try {
                applyColors(JSON.parse(raw), CUSTOM_ID);
                return;
            }
            catch {
                /* corrupt buffer: fall through to default */
            }
        }
        applyTheme(DEFAULT_THEME);
    }
    else if (sel.startsWith(PRESET_PREFIX)) {
        const preset = findPreset(sel.slice(PRESET_PREFIX.length));
        if (preset) {
            applyColors(preset.colors, sel);
            return;
        }
        applyTheme(DEFAULT_THEME); // preset was deleted out from under us
    }
    else {
        applyTheme(sel);
    }
}
