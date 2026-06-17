// Scoring hooks. Spec §4.9.
//
// Hook ids are strings, defined entirely by world content.
// Each hook is idempotent: awarding it twice scores once.
export function awardScore(state, hookId, points) {
    if (state.scoreHooks.has(hookId))
        return false;
    state.scoreHooks.add(hookId);
    state.score += points;
    return true;
}
export function hasScored(state, hookId) {
    return state.scoreHooks.has(hookId);
}
