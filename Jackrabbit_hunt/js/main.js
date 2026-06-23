// Entry point. Wires the UI to the engine and starts The Jackrabbit Contract.
//
// The engine MVP test world (src/world/test-world.ts) is retained as a smoke-
// test fixture for the engine itself but is not booted into the live game.
import { GameEngine } from "./engine/engine.js";
import { bindUi, createSaveIo, setupAccessibilityControls, bindVisualViewport } from "./ui/dom.js";
import { applyStoredPrefs } from "./ui/theme.js";
import { mountSlotMachine } from "./ui/slot-machine.js";
import { jackrabbitWorld } from "./world/jackrabbit/index.js";
function boot() {
    // Presentation prefs first — independent of the engine / game state.
    applyStoredPrefs();
    setupAccessibilityControls();
    bindVisualViewport();
    mountSlotMachine(); // the animated reel-spin popup (listens for the casino's spin event)
    const ui = bindUi();
    // EXPORT/IMPORT file I/O. The import callback resolves `engine` lazily (it's
    // assigned just below), so a picked file resumes via engine.loadSnapshot.
    let engine;
    const saveIo = createSaveIo((text) => engine.loadSnapshot(text));
    engine = new GameEngine(jackrabbitWorld, {
        render: ui.render,
        updateHeader: ui.updateHeader,
        requestExport: saveIo.requestExport,
        requestImport: saveIo.requestImport,
    });
    ui.bindSubmit((line) => engine.submit(line));
    engine.start();
    ui.focusInput();
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
}
else {
    boot();
}
