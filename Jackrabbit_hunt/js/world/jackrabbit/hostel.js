// Dockside Hostel — Horizon Outpost's budget lodging off the arrival concourse
// (canon: the "easy first roof" off a shuttle, at the far end of the dock from
// the courier-ship berth). A proper multi-storey building: 78 guest rooms across
// 8 floors (0–7), joined ONLY by a lift.
//
//   Floor 0 = reception foyer (entrance from the concourse) + 8 rooms (01–08).
//   Floors 1–7 = 10 rooms each (N01–N10) — identical apart from the numbers.
//   Total guest rooms: 8 + 7×10 = 78.
//
// NOT the PC's default base — that's Donovan's, pre-booked by their handlers
// (see horizon.ts). The hostel matters only if the PC goes off-grid (defection
// path): the PC may freely wander the foyer and corridors, but EVERY room door
// blinks red and refuses until they (1) BOOK a room at a public terminal and
// (2) scan in at the reception reader. On check-in a room is allocated AT RANDOM
// (stored in FLAG_HOSTEL_ROOM); only that door opens. Room 203 is deliberately
// EXCLUDED from allocation — reserved for a future easter-egg.
//
// Built procedurally with buildArea. The lift is built with withLiftDirs and
// registered via the hostel MODULES entry in index.ts; engine lift levels are
// 1-based, so engine level L = floor F + 1.
// Reached ON FOOT from the arrival concourse (foyer id horizon_hostel_entrance);
// not a 'Tube stop. The reception reader + room-door readers are described.
import { addNote } from "../../engine/notes.js";
import { buildArea } from "./area.js";
import { withLiftDirs, liftDescription } from "./lifts.js";
import { TERMINAL_IDS } from "./analysis.js";
import { FLAG_DONOVAN_CHECKED_OUT, FLAG_HOSTEL_BOOKED, FLAG_HOSTEL_CHECKED_IN, FLAG_HOSTEL_ROOM, } from "./flags.js";
const LIFT = "horizon_hostel_lift"; // lift base id → cars horizon_hostel_lift_l1.._l8
const FLOORS = [0, 1, 2, 3, 4, 5, 6, 7]; // floor number; engine level = floor + 1
const NAME = "Horizon Outpost — Dockside Hostel"; // room-name prefix
const EASTER_EGG_ROOM = "203"; // reserved (excluded from allocation)
// --- Shared prose -----------------------------------------------------------
const GENERIC_ROOM = "A standard hostel room, modest and spotless: a single bed against the wall with a thin grey blanket "
    + "folded at its foot, a small desk with a lamp and a plain wooden chair, a narrow wardrobe, and a small "
    + "curtained window onto the dockyard. A tiny en-suite — tiled floor, a latrine, a compact shower stall — "
    + "opens off to one side. Identical to every other room in the place, down to the folded blanket. The "
    + "corridor is back outside.";
// The PC's allocated room (canon prose; en-suite folded in; number is in the title).
const YOUR_ROOM = "Your room — modest, but spotless: the walls unblemished, free of any grime. A single bed is pushed "
    + "against the wall, a thin grey blanket folded neatly at its foot, the mattress firm but comfortable. "
    + "Beside it sits a small desk with an unmarred surface, a simple wooden chair, and a desk lamp casting a "
    + "warm, steady glow. A small window above the bed lets in the dockyard's artificial light, softened by "
    + "white curtains; through it, ships of every size come and go, their lights blinking against the far "
    + "boundary of the outpost. Opposite the bed stands a narrow wardrobe, its doors slightly ajar on a few "
    + "hangers and a small shelf. A tiny en-suite opens beside it — tiled floor, a latrine, a compact shower "
    + "stall. From the bed you can hear the faint noises of the dockyard mixed with the gentle whoosh of the "
    + "air circulation, a soothing background hum.\n\nThe corridor is back outside.";
const CORRIDOR = "A quiet hostel corridor — even light, thin but clean carpet, and a row of identical cream doors, each "
    + "with its own ID reader and a small numbered plate. Only your own room — once you've checked in — will "
    + "open to your card.";
const FOYER_BASE = "The hostel's reception foyer: a worn, practical space that turns over a lot of tired travellers and "
    + "doesn't pretend otherwise. There's no reception desk — a booking system handles arrivals remotely, and "
    + "an ID reader by the inner door handles the rest. A rack of laminated notices covers checkout times, "
    + "lockers, and what the management will and won't tolerate. The concourse is back east; the lift serves "
    + "all eight floors to the north, and this floor's rooms run off to the west.";
// --- Helpers ----------------------------------------------------------------
/** Guest-room display number for floor F, kth room (k = 1..10). Floor 0 = "01".."08";
 *  floors 1–7 = "<F>01".."<F>10" (so Floor 2, room 3 = "203"). */
function roomNumber(floor, k) {
    if (floor === 0)
        return `0${k}`; // 01..08
    return k < 10 ? `${floor}0${k}` : `${floor}10`;
}
const roomId = (num) => `horizon_hostel_room_${num}`;
const corrId = (floor, seg) => `horizon_hostel_f${floor}_corr${seg}`;
const carId = (floor) => `${LIFT}_l${floor + 1}`;
/** Floor for a room number: "01".."08" → 0; "NXX" → N. */
const floorOf = (num) => (num.length === 2 ? 0 : parseInt(num[0], 10));
// Every allocatable room number (filled during generation; excludes 203).
const ALLOCATABLE = [];
/** The PC's allocated hostel room number, or null until they have checked in.
 *  The room is chosen and stored (FLAG_HOSTEL_ROOM) only by hostelCheckIn(). */
function allocatedRoom(s) {
    const n = s.flags[FLAG_HOSTEL_ROOM];
    return typeof n === "string" ? n : null;
}
function foyerDescription(s) {
    const num = allocatedRoom(s);
    if (!num)
        return FOYER_BASE;
    const f = floorOf(num);
    return FOYER_BASE + `\n\nYour room is Room ${num}, on Floor ${f}`
        + (f === 0 ? " — this floor, off to the west." : " — take the lift north.");
}
// --- Check-in (reception reader) --------------------------------------------
const LOCKED_BEFORE = "You present your card to the door's reader. It blinks red, and the door stays shut.";
const LOCKED_WRONG_ROOM = "You present your card to the door's reader. It blinks red — this isn't your room — and the door stays shut.";
/** `use id on reader` / `tap card on reader` at the hostel reception. Requires a
 *  booking (FLAG_HOSTEL_BOOKED). Allocates a room at random on success. */
export function hostelCheckIn(s) {
    if (s.flags[FLAG_HOSTEL_CHECKED_IN]) {
        const num = allocatedRoom(s);
        return `The reader flashes green — but you're already checked in. Room ${num}, Floor ${floorOf(num)}.`;
    }
    if (!s.flags[FLAG_HOSTEL_BOOKED]) {
        // No message needed beyond the red flash (per the design doc) — but a small
        // hint at where to book keeps the puzzle fair.
        return "You present your card to the reception reader. It flashes red — no booking on file. "
            + "(Lodgings are booked at any public terminal.)";
    }
    const num = ALLOCATABLE[Math.floor(Math.random() * ALLOCATABLE.length)] ?? "101";
    s.flags[FLAG_HOSTEL_ROOM] = num;
    s.flags[FLAG_HOSTEL_CHECKED_IN] = true;
    const f = floorOf(num);
    addNote(s, {
        id: "hostel_room_allocated",
        source: "Hostel System",
        text: `Room ${num}, Floor ${f}. Entry by ID card reader on the door. Check-out is at 11:00 local time.`,
        reliable: true,
    });
    return [
        "You present your card to the reception reader. It flashes green, and the system allocates you a room.",
        `Room ${num}, on Floor ${f}. Your card now opens that door — and only that door. Check-out, the `
            + "notice reminds you, is at 11:00 local time.",
    ];
}
// The reception ID reader, by the inner door. Distinct from the TravelTube
// readers; `use id on reader` is wired from the ID-card side (items.ts).
export const hostelReader = {
    id: "hostel_reader",
    name: "reception reader",
    aliases: ["reader", "reception reader", "scanner", "id reader", "desk", "reception desk", "inner door"],
    description: (s) => "An ID reader set into the wall by the inner door — the hostel's whole reception, really. "
        + (s.flags[FLAG_HOSTEL_CHECKED_IN]
            ? "Its light glows a steady green; you're checked in."
            : s.flags[FLAG_HOSTEL_BOOKED]
                ? "A booking sits on file under your card. SCAN your ID here to check in and be allocated a room."
                : "It expects a booking it doesn't have. You'd need to book a room first (any public terminal does it)."),
    takeable: false,
    onScan: (s) => hostelCheckIn(s),
};
// --- Booking (at a public terminal) -----------------------------------------
/** `book` / `book hostel` — make a hostel reservation at a public terminal.
 *  Blocked while still checked in at Donovan's (the PC must check out first —
 *  that mechanic is deferred to Phase 3). */
const bookCmd = (_w, s, cmd) => {
    const atTerminal = TERMINAL_IDS.some((id) => s.itemLocations[id] === s.currentRoom);
    if (!atTerminal) {
        return { handled: true, output: ["There's no public terminal here to book from."], tickCost: 0, free: true };
    }
    const noun = (cmd.noun ?? "").trim().toLowerCase();
    if (noun && !/hostel|room|lodging|bed|dockside|stay/.test(noun)) {
        return {
            handled: true,
            output: [`The terminal can't book "${noun}". Try BOOK HOSTEL.`],
            tickCost: 0, free: true,
        };
    }
    // Horizon's strict berth policy: accommodation berths are capped to the number
    // of registered visitors — one bed each. The PC arrives holding a Donovan's
    // reservation, so a hostel booking is refused until they release it (check out
    // of Donovan's — the defection path; FLAG_DONOVAN_CHECKED_OUT, Phase 3).
    if (!s.flags[FLAG_DONOVAN_CHECKED_OUT]) {
        return {
            handled: true,
            output: [
                "The booking system declines: \"Under Horizon's berth policy, only one accommodation booking is "
                    + "permitted per registered visitor, and a reservation is already held in your name at Donovan's "
                    + "Lodging House. Please release that reservation before booking elsewhere.\"",
            ],
            tickCost: 1,
        };
    }
    if (s.flags[FLAG_HOSTEL_BOOKED]) {
        return {
            handled: true,
            output: ["You've already booked a room at the Dockside Hostel. Scan in at its reception reader to check in."],
            tickCost: 0, free: true,
        };
    }
    s.flags[FLAG_HOSTEL_BOOKED] = true;
    addNote(s, {
        id: "hostel_booked",
        source: "Dockside Hostel",
        text: "Room booked at the Dockside Hostel (off the arrival concourse). Scan in at the reception reader to check in.",
        reliable: true,
    });
    return {
        handled: true,
        output: [
            "You bring up the station lodgings listing and book a room at the Dockside Hostel — no name beyond "
                + "your card, no questions, the cheap default for anyone who'd rather not be on anyone's books.",
            "BOOKING CONFIRMED. Present your ID at the hostel's reception reader to check in.",
        ],
        tickCost: 1,
    };
};
export const hostelCommands = {
    book: bookCmd,
};
// --- Build the room defs ----------------------------------------------------
const defs = [];
for (const floor of FLOORS) {
    const roomsOnFloor = floor === 0 ? 8 : 10;
    const segs = roomsOnFloor / 2; // 2 rooms per corridor segment
    // Lift car for this floor (steps out SOUTH onto the floor's entry room).
    const entry = floor === 0 ? "horizon_hostel_entrance" : corrId(floor, 1);
    defs.push({
        id: carId(floor),
        name: `${NAME} — Lift`,
        description: liftDescription,
        exits: { south: entry },
    });
    if (floor === 0) {
        // Reception foyer: concourse (E), lift car (N), and the room corridor (W).
        // No allocation on arrival — a room is only allocated on check-in (see
        // hostelCheckIn), gated behind a public-terminal booking.
        defs.push({
            id: "horizon_hostel_entrance",
            name: `${NAME} (Reception)`,
            description: foyerDescription,
            exits: { east: "horizon_arrival_concourse", north: carId(0), west: corrId(0, 1) },
            items: ["hostel_reader"],
        });
    }
    // Corridor segments + their two rooms each.
    for (let seg = 1; seg <= segs; seg++) {
        const exits = {};
        // Spine: floor 0 runs E–W off the foyer; floors 1+ run N–S off the lift.
        if (floor === 0) {
            exits.east = seg === 1 ? "horizon_hostel_entrance" : corrId(0, seg - 1);
            if (seg < segs)
                exits.west = corrId(0, seg + 1);
        }
        else {
            exits.north = seg === 1 ? carId(floor) : corrId(floor, seg - 1);
            if (seg < segs)
                exits.south = corrId(floor, seg + 1);
        }
        // Two rooms per segment (west + east doors). Hang them off the perpendicular
        // directions (never used by the spine).
        const numW = roomNumber(floor, seg * 2 - 1);
        const numE = roomNumber(floor, seg * 2);
        exits[floor === 0 ? "north" : "west"] = roomId(numW);
        exits[floor === 0 ? "south" : "east"] = roomId(numE);
        defs.push({ id: corrId(floor, seg), name: `${NAME} (Corridor)`, description: CORRIDOR, exits });
        for (const num of [numW, numE]) {
            if (num !== EASTER_EGG_ROOM)
                ALLOCATABLE.push(num);
            const back = floor === 0
                ? (num === numW ? { south: corrId(floor, seg) } : { north: corrId(floor, seg) })
                : (num === numW ? { east: corrId(floor, seg) } : { west: corrId(floor, seg) });
            defs.push({
                id: roomId(num),
                name: `${NAME}, Room ${num}`,
                // The allocated room shows the "your room" prose; every other room generic.
                description: (s) => (allocatedRoom(s) === num ? YOUR_ROOM : GENERIC_ROOM),
                exits: back,
            });
        }
    }
}
export const hostelRooms = buildArea(defs);
export const hostelItems = {
    hostel_reader: hostelReader,
};
// Gate every guest-room door: nothing opens until the PC has checked in, and
// then ONLY their allocated room. Every other door (including the reserved Room
// 203) blinks red and refuses. The door's room number is parsed from its `to`;
// spine/lift exits and the rooms' back-exits are untouched.
for (const room of Object.values(hostelRooms)) {
    for (const ex of Object.values(room.exits)) {
        if (ex?.to && ex.to.startsWith("horizon_hostel_room_")) {
            const num = ex.to.slice("horizon_hostel_room_".length);
            ex.gated = (s) => {
                if (allocatedRoom(s) === num)
                    return null;
                return s.flags[FLAG_HOSTEL_CHECKED_IN] ? LOCKED_WRONG_ROOM : LOCKED_BEFORE;
            };
        }
    }
}
// --- Register the lift (8 floors; cars step out south; engine level = floor+1) ---
const floors = FLOORS.map((f) => ({
    level: f + 1,
    room: carId(f),
    label: f === 0 ? "Floor 0 (Reception)" : `Floor ${f}`,
    names: f === 0
        ? ["0", "ground", "g", "reception", "foyer", "lobby"]
        : [String(f)],
}));
/** The hostel's multi-floor lift; registered via the hostel MODULES entry (index.ts). */
export const hostelLift = withLiftDirs({ id: LIFT, floors }, hostelRooms);
