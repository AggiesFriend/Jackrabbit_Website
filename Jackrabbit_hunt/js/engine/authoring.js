// Authoring conveniences for world content. Pure helpers — no engine state.
/**
 * Request the engine transition the player to a different room after this
 * action completes. Safe to call from any handler (onEnter, onTick, onUseWith,
 * onPush, NPC topics, World.commands). The transition fires the destination
 * room's onEnter and re-stamps the room-entry tick.
 *
 * Implemented via a state flag so handlers don't need a reference to the
 * engine. The engine drains the flag in its post-action pending step.
 */
export function requestSceneTransition(state, to) {
    state.flags["__pendingGoto"] = to;
}
/**
 * Request the engine push a modal input handler after this action completes.
 * Lets onEnter / onTick / NPC topic handlers enter modal mode (character
 * creation, terminal menus, narrative transitions) without holding an
 * engine reference. Drained by the engine in its post-action pending step.
 *
 * Modal handlers themselves can push more modals via their own ModalResult
 * — this helper is for entering modal mode from non-modal handlers.
 */
export function requestPushModal(state, handler) {
    state.flags["__pendingPushModal"] = handler;
}
/**
 * Build a topic map where multiple keys share one response. Saves the
 * per-key duplication of declaring NPCs like Miss Terry, where
 * "client", "employer", and "who" all reply the same way.
 *
 * Example:
 *   topics: aliasedTopics([
 *     [["client", "employer", "who"], "The client values discretion."],
 *     [["target", "jackrabbit", "rabbit"], "Male. Known links to Horizon."],
 *   ])
 */
export function aliasedTopics(groups) {
    const out = {};
    for (const [keys, response] of groups) {
        for (const key of keys) {
            out[key.toLowerCase()] = response;
        }
    }
    return out;
}
