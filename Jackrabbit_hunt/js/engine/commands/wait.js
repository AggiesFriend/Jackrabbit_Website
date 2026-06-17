// Wait verbs. Spec §4.4 / §4.3.
import { phaseLabel, ticksUntilPhaseChange } from "../time.js";
export function handleWait(_world, state, cmd) {
    const rest = (cmd.noun ?? "").trim();
    if (!rest) {
        return { handled: true, output: ["Time passes."], tickCost: 1 };
    }
    // "wait N" — interruptible: if something happens before N ticks elapse,
    // the wait is cut short at that point (so the player can't sleep through a
    // scripted beat). The duration is therefore not promised in the message.
    const asInt = parseInt(rest, 10);
    if (!Number.isNaN(asInt) && /^\d+$/.test(rest)) {
        const n = Math.max(1, Math.min(asInt, 500));
        return { handled: true, output: ["Time passes."], tickCost: n, interruptible: true };
    }
    // "wait until morning|night|day" — also interruptible.
    const lower = rest.toLowerCase();
    if (/^until (morning|day|daytime)$/.test(lower)) {
        const n = ticksUntilPhaseChange(state, "day");
        if (n <= 0)
            return { handled: true, output: ["It is already daytime."], tickCost: 0, free: true };
        return { handled: true, output: ["You settle in to wait."], tickCost: n, interruptible: true };
    }
    if (/^until (night|nighttime|evening)$/.test(lower)) {
        const n = ticksUntilPhaseChange(state, "night");
        if (n <= 0)
            return { handled: true, output: ["It is already nighttime."], tickCost: 0, free: true };
        return { handled: true, output: ["You settle in to wait."], tickCost: n, interruptible: true };
    }
    // Fall through.
    return {
        handled: true,
        output: [`You can't wait "${rest}". Try "wait", "wait 5", or "wait until morning". Currently: ${phaseLabel(state)}.`],
        tickCost: 0,
        free: true,
    };
}
