// SLEEP / REST — pass the time until the station next turns over. Sleeping in
// the daytime wakes you at the start of night; sleeping at night wakes you at
// the start of day. You can sleep anywhere (a proper bed is comfortable; rougher
// spots work too — handy for lying low in, say, the shipyard until dark), but not
// in a moving pod. The wait is interruptible, so anything that happens (an event,
// a danger) wakes you early.
import { ticksUntilPhaseChange } from "../../engine/time.js";
import { requestSceneTransition } from "../../engine/authoring.js";
/** Rooms with a real bed — a comfortable sleep. (Donovan's guest rooms; hostel rooms.) */
function isBed(roomId) {
    return /horizon_donovan_s_room_\d+$/.test(roomId) || /horizon_hostel_room_/.test(roomId);
}
export const sleepCmd = (_w, s, _cmd) => {
    if (s.dead || s.ended) {
        return { handled: true, output: ["That's rather beyond you now."], tickCost: 0, free: true };
    }
    if (s.currentRoom === "travelpod" && s.flags["pod_moving"]) {
        return { handled: true, output: ["Not while the pod's running — you'd miss your stop."], tickCost: 0, free: true };
    }
    // You don't doss down in Burke's workshop; he turns you straight out (the room is
    // night-only — see burkeWorkshopDayTick in burke.ts for the same eject at dawn).
    if (s.currentRoom === "horizon_burke_s_workshop") {
        requestSceneTransition(s, "horizon_narrow_corridor8");
        return { handled: true, tickCost: 1, output: [
                "\"None of that in here.\" Burke doesn't look up from the bench, but a hand the size of a shovel " +
                    "arrives at your shoulder and turns you doorward. \"This is a workshop, not a doss-house. You want a " +
                    "kip, find a bed that isn't my floor.\" The heavy door rattles shut at your back."
            ] };
    }
    const target = s.isDaytime ? "night" : "day";
    const n = ticksUntilPhaseChange(s, target);
    if (n <= 0) {
        return { handled: true, output: ["You're too wound up to settle just now."], tickCost: 0, free: true };
    }
    const intro = isBed(s.currentRoom)
        ? "You turn in, pull the covers up, and let the station's hum carry you under — meaning to wake when it turns."
        : "It's no kind of bed, but you've slept rougher. You tuck yourself out of the way, settle as best you " +
            "can, and let your eyes close — meaning to wake when the station turns.";
    // Interruptible: the day/night changeover (and any event) wakes you. The wait
    // stops at the phase boundary, when the day/night announcer chimes.
    return { handled: true, output: [intro], tickCost: n, interruptible: true };
};
