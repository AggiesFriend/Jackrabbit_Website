// Entry point. Wires the UI to the engine and starts The Jackrabbit Contract.
//
// The engine MVP test world (src/world/test-world.ts) is retained as a smoke-
// test fixture for the engine itself but is not booted into the live game.
import { GameEngine } from "./engine/engine.js";
import { bindUi, setupAccessibilityControls } from "./ui/dom.js";
import { applyStoredPrefs } from "./ui/theme.js";
import { jackrabbitWorld } from "./world/jackrabbit/index.js";
function boot() {
    // Presentation prefs first — independent of the engine / game state.
    applyStoredPrefs();
    setupAccessibilityControls();
    const ui = bindUi();
    const engine = new GameEngine(jackrabbitWorld, {
        render: ui.render,
        updateHeader: ui.updateHeader,
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
