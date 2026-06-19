// DOM bindings. Header, output area, command input. Spec §4.5, §4.6.
import { phaseLabel } from "../engine/time.js";
import { isHeading, stripHeadingMarker } from "../engine/output.js";
import { parseLinks } from "../engine/links.js";
import { InputHistory } from "./history.js";
import { THEMES, FONTS, COLOR_VARS, CUSTOM_ID, PRESET_PREFIX, applyTheme, applyFont, applyColors, loadFont, loadSelection, currentColors, listPresets, findPreset, savePreset, deletePreset, presetSelectionId, exportPresetsJson, importPresetsJson, } from "./theme.js";
export function bindUi() {
    const output = mustGet("output");
    const form = mustGet("input-form");
    const input = mustGet("input");
    const score = mustGet("status-score");
    const time = mustGet("status-time");
    const location = mustGet("status-location");
    const aliasWrap = mustGet("status-alias-wrap");
    const alias = mustGet("status-alias");
    // Command history: Up/Down recall recent inputs into the box (editable before
    // submit). Recorded on submit; navigated here.
    const history = new InputHistory();
    function setInputAtEnd(value) {
        input.value = value;
        const end = value.length;
        input.setSelectionRange(end, end);
    }
    input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") {
            const v = history.previous(input.value);
            if (v !== null) {
                e.preventDefault();
                setInputAtEnd(v);
            }
        }
        else if (e.key === "ArrowDown") {
            const v = history.next();
            if (v !== null) {
                e.preventDefault();
                setInputAtEnd(v);
            }
        }
    });
    function render(lines, opts) {
        const kind = opts?.kind ?? "normal";
        const block = document.createElement("div");
        block.classList.add("block");
        if (kind !== "normal")
            block.classList.add(kind);
        for (const raw of lines) {
            const line = raw ?? "";
            const div = document.createElement("div");
            if (isHeading(line)) {
                // Headings are plain text — no links in a room name.
                div.classList.add("heading");
                div.textContent = stripHeadingMarker(line);
            }
            else {
                // Body lines may contain [text](url) — render as a mix of text
                // nodes and anchor elements. All text uses textContent, so any
                // non-link character (including stray < or &) is safe.
                for (const seg of parseLinks(line)) {
                    if (seg.kind === "text") {
                        div.appendChild(document.createTextNode(seg.value));
                    }
                    else {
                        const a = document.createElement("a");
                        a.textContent = seg.text;
                        a.href = seg.href;
                        a.target = "_blank";
                        a.rel = "noopener noreferrer";
                        div.appendChild(a);
                    }
                }
            }
            block.appendChild(div);
        }
        output.appendChild(block);
        output.scrollTop = output.scrollHeight;
    }
    function updateHeader(state, locationName, aliasValue) {
        score.textContent = `Score: ${state.score}`;
        time.textContent = phaseLabel(state);
        location.textContent = locationName;
        if (aliasValue) {
            alias.textContent = aliasValue;
            aliasWrap.hidden = false;
        }
        else {
            aliasWrap.hidden = true;
        }
    }
    function bindSubmit(onSubmit) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const line = input.value;
            input.value = "";
            history.record(line);
            // Always forward — even an empty line. The engine decides what to do:
            // in normal mode a bare Enter is silently ignored; in modal mode (e.g.
            // a "Press ENTER to continue" screen) it's a meaningful input.
            onSubmit(line);
            input.focus();
        });
    }
    function focusInput() { input.focus(); }
    return { render, updateHeader, bindSubmit, focusInput };
}
// Pin the #app column to the *visually* visible viewport. On iOS Safari the
// on-screen keyboard overlays the page rather than resizing the layout viewport
// (it ignores `interactive-widget=resizes-content`, which only Android honours),
// so `100dvh` doesn't shrink and the input gets hidden behind the keyboard. The
// VisualViewport API reports the real visible rectangle; we mirror its height
// onto #app (and nudge for offsetTop, which iOS sets while the URL bar / keyboard
// animate). A no-op where VisualViewport is unavailable — `100dvh` carries those.
export function bindVisualViewport() {
    const vv = window.visualViewport;
    if (!vv)
        return;
    const app = document.getElementById("app");
    if (!app)
        return;
    let frame = 0;
    const sync = () => {
        frame = 0;
        app.style.height = `${vv.height}px`;
        // While the URL bar / keyboard slide, the visual viewport can be offset from
        // the top of the layout viewport; translate to keep the column glued to it.
        app.style.transform = `translateY(${vv.offsetTop}px)`;
    };
    const schedule = () => {
        if (frame)
            return;
        frame = requestAnimationFrame(sync);
    };
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    sync();
}
// Populate + wire the accessibility controls: a colour-scheme dropdown (built-in
// themes + saved presets + a "Custom…" entry), a reading-font dropdown, and a
// collapsible panel of per-colour pickers with preset save/delete. Pure UI: all
// state is applied to <html> and persisted by theme.ts, independent of the
// engine and the game-state save slot. Safe to call once after boot.
export function setupAccessibilityControls() {
    const themeSel = document.getElementById("theme-select");
    const fontSel = document.getElementById("font-select");
    const toggle = document.getElementById("customise-toggle");
    const panel = document.getElementById("customise-panel");
    if (!themeSel || !fontSel)
        return;
    // --- Reading-font dropdown ---
    for (const f of FONTS)
        fontSel.appendChild(makeOption(f.id, f.label));
    fontSel.value = loadFont();
    fontSel.addEventListener("change", () => applyFont(fontSel.value));
    const colorInputs = new Map();
    const swatches = new Map();
    let nameInput = null;
    function rebuildThemeSelect() {
        themeSel.replaceChildren();
        const builtins = document.createElement("optgroup");
        builtins.label = "Themes";
        for (const t of THEMES)
            builtins.appendChild(makeOption(t.id, t.label));
        themeSel.appendChild(builtins);
        const presets = listPresets();
        if (presets.length) {
            const saved = document.createElement("optgroup");
            saved.label = "Saved";
            for (const p of presets)
                saved.appendChild(makeOption(presetSelectionId(p.name), p.name));
            themeSel.appendChild(saved);
        }
        const custom = document.createElement("optgroup");
        custom.label = "—";
        custom.appendChild(makeOption(CUSTOM_ID, "Custom…"));
        themeSel.appendChild(custom);
        themeSel.value = loadSelection();
    }
    function refreshPanelInputs() {
        const cur = currentColors();
        for (const v of COLOR_VARS) {
            const c = cur[v.id] ?? "#000000";
            const inp = colorInputs.get(v.id);
            if (inp)
                inp.value = c;
            const sw = swatches.get(v.id);
            if (sw)
                sw.style.background = c;
        }
    }
    // Show the Delete button only for a saved preset, and prefill its name so a
    // re-save overwrites it.
    function updatePanelChrome() {
        const sel = loadSelection();
        const isPreset = sel.startsWith(PRESET_PREFIX);
        const del = panel?.querySelector(".customise-delete");
        if (del)
            del.hidden = !isPreset;
        if (nameInput && isPreset)
            nameInput.value = sel.slice(PRESET_PREFIX.length);
    }
    // Editing any single colour seeds a custom set from whatever is *currently*
    // applied (built-in or custom), changes the one swatch, and leaves the rest
    // intact — so tweaking one colour of "Irlen yellow" keeps the other eight.
    function onColorChange(varId, value) {
        const colors = currentColors();
        colors[varId] = value;
        applyColors(colors, CUSTOM_ID);
        rebuildThemeSelect();
        refreshPanelInputs();
        updatePanelChrome();
    }
    // --- Customise panel ---
    if (panel) {
        const grid = document.createElement("div");
        grid.className = "customise-grid";
        for (const v of COLOR_VARS) {
            // The row is a proxy: a visible swatch + label. The *real* colour input
            // is parked off to the left of the panel (over the empty game text) and
            // triggered programmatically — the OS dialog anchors to it there, so it
            // never covers the element list. (A button can't contain an interactive
            // <input>, so the launcher is a panel-level sibling, not a child.)
            const row = document.createElement("button");
            row.type = "button";
            row.className = "customise-row";
            const swatch = document.createElement("span");
            swatch.className = "customise-swatch";
            swatch.setAttribute("aria-hidden", "true");
            swatches.set(v.id, swatch);
            const label = document.createElement("span");
            label.className = "customise-label";
            label.textContent = v.label;
            const input = document.createElement("input");
            input.type = "color";
            input.className = "customise-launcher";
            input.tabIndex = -1;
            input.setAttribute("aria-hidden", "true");
            input.addEventListener("input", () => onColorChange(v.id, input.value));
            colorInputs.set(v.id, input);
            row.appendChild(swatch);
            row.appendChild(label);
            row.addEventListener("click", () => input.click());
            grid.appendChild(row);
            panel.appendChild(input);
        }
        panel.appendChild(grid);
        const saveRow = document.createElement("div");
        saveRow.className = "customise-save";
        nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = "Preset name";
        nameInput.maxLength = 40;
        nameInput.setAttribute("aria-label", "Preset name");
        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.textContent = "Save";
        saveBtn.addEventListener("click", () => {
            const name = nameInput.value.trim();
            if (!name) {
                nameInput.focus();
                return;
            }
            const colors = currentColors();
            savePreset(name, colors);
            applyColors(colors, presetSelectionId(name));
            rebuildThemeSelect();
            updatePanelChrome();
        });
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "customise-delete";
        delBtn.textContent = "Delete";
        delBtn.hidden = true;
        delBtn.addEventListener("click", () => {
            const sel = loadSelection();
            if (!sel.startsWith(PRESET_PREFIX))
                return;
            deletePreset(sel.slice(PRESET_PREFIX.length));
            applyTheme(THEMES[0].id);
            rebuildThemeSelect();
            refreshPanelInputs();
            updatePanelChrome();
        });
        saveRow.appendChild(nameInput);
        saveRow.appendChild(saveBtn);
        saveRow.appendChild(delBtn);
        panel.appendChild(saveRow);
        // Export / import saved schemes as a portable JSON file.
        const ioMsg = document.createElement("p");
        ioMsg.className = "customise-io-msg";
        ioMsg.setAttribute("role", "status");
        function showIoMessage(text, isError) {
            ioMsg.textContent = text;
            ioMsg.classList.toggle("error", isError);
        }
        const ioRow = document.createElement("div");
        ioRow.className = "customise-io";
        const exportBtn = document.createElement("button");
        exportBtn.type = "button";
        exportBtn.textContent = "Export";
        exportBtn.addEventListener("click", () => {
            if (!listPresets().length) {
                showIoMessage("No saved schemes to export — save one first.", true);
                return;
            }
            const blob = new Blob([exportPresetsJson()], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "jackrabbit-themes.json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            const n = listPresets().length;
            showIoMessage(`Exported ${n} scheme${n === 1 ? "" : "s"}.`, false);
        });
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "application/json,.json";
        fileInput.className = "visually-hidden";
        fileInput.addEventListener("change", () => {
            const file = fileInput.files?.[0];
            if (!file)
                return;
            const reader = new FileReader();
            reader.onload = () => {
                const result = importPresetsJson(String(reader.result ?? ""));
                fileInput.value = ""; // let the same file be re-imported later
                if (result.error) {
                    showIoMessage(result.error, true);
                    return;
                }
                rebuildThemeSelect();
                updatePanelChrome();
                showIoMessage(`Imported ${result.imported} scheme${result.imported === 1 ? "" : "s"}.`, false);
            };
            reader.onerror = () => showIoMessage("Couldn't read that file.", true);
            reader.readAsText(file);
        });
        const importBtn = document.createElement("button");
        importBtn.type = "button";
        importBtn.textContent = "Import";
        importBtn.addEventListener("click", () => fileInput.click());
        ioRow.appendChild(exportBtn);
        ioRow.appendChild(importBtn);
        panel.appendChild(ioRow);
        panel.appendChild(fileInput);
        panel.appendChild(ioMsg);
        panel.hidden = true;
        if (toggle) {
            toggle.addEventListener("click", () => {
                const show = panel.hidden;
                panel.hidden = !show;
                toggle.setAttribute("aria-expanded", String(show));
                if (show) {
                    refreshPanelInputs();
                    updatePanelChrome();
                }
            });
        }
        // Dismiss the panel once the player is done with it: a click anywhere
        // outside it (or Escape) closes it. We use pointerdown rather than
        // focusout so opening a native colour picker — which can briefly pull
        // focus to an OS dialog — doesn't snap the panel shut mid-edit.
        document.addEventListener("pointerdown", (e) => {
            if (panel.hidden)
                return;
            const target = e.target;
            if (target && (panel.contains(target) || toggle?.contains(target)))
                return;
            closePanel();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape")
                closePanel();
        });
    }
    function closePanel() {
        if (!panel || panel.hidden)
            return;
        panel.hidden = true;
        toggle?.setAttribute("aria-expanded", "false");
    }
    // --- Theme dropdown ---
    themeSel.addEventListener("change", () => {
        const val = themeSel.value;
        if (val === CUSTOM_ID) {
            applyColors(currentColors(), CUSTOM_ID); // seed from whatever's applied now
            if (panel && panel.hidden) {
                panel.hidden = false;
                toggle?.setAttribute("aria-expanded", "true");
            }
        }
        else if (val.startsWith(PRESET_PREFIX)) {
            const preset = findPreset(val.slice(PRESET_PREFIX.length));
            if (preset)
                applyColors(preset.colors, val);
        }
        else {
            applyTheme(val);
        }
        refreshPanelInputs();
        updatePanelChrome();
    });
    rebuildThemeSelect();
    refreshPanelInputs();
    updatePanelChrome();
}
function makeOption(value, label) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    return o;
}
function mustGet(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Missing DOM element: #${id}`);
    return el;
}
