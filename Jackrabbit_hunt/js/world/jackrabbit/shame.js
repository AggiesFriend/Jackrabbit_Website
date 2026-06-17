// The Shame Alarm. On Horizon Outpost, littering (and mis-filing your
// recycling) is a serious social crime. Drop litter in a public place and a
// cheerfully merciless civic alarm broadcasts your misdemeanour to everyone
// nearby — who promptly gather to stare you into shame.
//
// Two parts, composed into the world:
//   - shameOnDrop  -> World.onDrop: trips the alarm when you litter in public.
//   - shameTick    -> folded into World.onTick: runs the gathering crowd until
//                     you pick the litter back up (forgiven) or flee (shamed).
//
// It's telegraphed, non-lethal, and entirely social — Horizon's justice is
// never violent (see the Deportation/mischief notes in the design), but it is
// devastatingly passive-aggressive.
import { itemsInRoom } from "../../engine/items.js";
const SHAME_ROOM = "shame_room";
const SHAME_ITEM = "shame_item";
const SHAME_STAGE = "shame_stage";
/** Public, monitored areas of the Outpost. Private rooms (Donovan's), the
 *  pre-Horizon scenes, and the in-motion pod are exempt. */
function isMonitored(roomId) {
    if (roomId === "travelpod")
        return false;
    return roomId.startsWith("horizon_") || roomId.startsWith("tube_stop_");
}
function clearShame(s) {
    delete s.flags[SHAME_ROOM];
    delete s.flags[SHAME_ITEM];
    delete s.flags[SHAME_STAGE];
}
/** World.onDrop: littering in a monitored public area trips the Shame Alarm. */
export function shameOnDrop(s, itemId, roomId) {
    if (!isMonitored(roomId))
        return;
    s.flags[SHAME_ROOM] = roomId;
    s.flags[SHAME_ITEM] = itemId;
    s.flags[SHAME_STAGE] = 0;
    return [
        "── SHAME ALARM ──",
        "A chime rings out, bright and merciless, and a warm synthetic voice addresses everyone within "
            + "earshot: \"ATTENTION. A LITTERING VIOLATION HAS OCCURRED AT THIS LOCATION. CIVIC-MINDED "
            + "CITIZENS, PLEASE ATTEND.\"",
        "Heads turn. People are already drifting over.",
    ];
}
/** World.onTick fragment: the gathering, staring crowd. */
export function shameTick(s) {
    const room = s.flags[SHAME_ROOM];
    if (!room)
        return;
    const item = s.flags[SHAME_ITEM];
    const litterStillThere = item ? itemsInRoom(s, room).includes(item) : false;
    // Picked it back up → the crowd relents.
    if (!litterStillThere) {
        clearShame(s);
        return "You pick up after yourself. The crowd watches you do it, lets out a collective note of "
            + "grudging civic approval, and melts away. Horizon forgives. Horizon does not forget.";
    }
    // Left the scene with the litter still down → shamed in absentia.
    if (s.currentRoom !== room) {
        clearShame(s);
        return "Behind you, a small crowd has closed around your discarded litter to stare, with great "
            + "and pointed sadness, at the spot where you were standing. You walk a little faster.";
    }
    // Still here, litter still down → escalate, then settle into silent vigil.
    const stage = s.flags[SHAME_STAGE] ?? 0;
    s.flags[SHAME_STAGE] = stage + 1;
    switch (stage) {
        case 0:
            return "A dozen people have formed a loose, silent semicircle around your discarded litter. "
                + "Nobody says a word. That is, somehow, the worst part.";
        case 1:
            return "The crowd thickens. Someone is filming. A small child asks its parent, very loudly, why "
                + "anyone would do such a thing.";
        case 2:
            return "The crowd has settled into a patient, disappointed vigil. They can keep this up all day. "
                + "You could TAKE the litter back and end it — or live with what you have become.";
        default:
            return; // steady, silent, ongoing shame
    }
}
