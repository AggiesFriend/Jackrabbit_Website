// World-side scoring helper. Looks up a hook's point value and awards it
// (idempotently — awardScore only scores each hook once).
import { awardScore } from "../../engine/scoring.js";
import { SCORE_POINTS } from "./flags.js";
/** Award the points registered for `hookId`. No-op if already scored. */
export function score(s, hookId) {
    const points = SCORE_POINTS[hookId] ?? 0;
    return awardScore(s, hookId, points);
}
