// Area builder — turns a compact room-definition array (mirroring the YAML the
// map tool exports) into engine Room records. Lets a 26-room area be expressed
// as data rather than two dozen hand-written object literals.
/** Short label for an exit hint: the part after the area prefix, so
 *  "Arboretum — The Giant Tree" → "The Giant Tree", "Donovan's — Room 22" →
 *  "Room 22". Lets repeated-name areas signpost where each exit leads. */
function shortName(name) {
    const i = name.lastIndexOf(" — ");
    return i >= 0 ? name.slice(i + 3) : name;
}
/**
 * Build a Record<RoomId, Room> from an array of RoomDefs. Exit string targets
 * become ExitDef { to, description }, where the description is the destination
 * room's short name — so the exit list signposts each direction ("east (Room
 * 22)"), the way the Food Hall does, without bespoke prose in look-alike rooms.
 * (Exits to rooms outside this def set — e.g. another area — stay unlabelled;
 * those are usually covered by the room's prose.) A fallback description is used
 * for rooms with none (handy for skeleton/topology-first authoring).
 */
export function buildArea(defs, fallbackDescription = "An unremarkable spot.") {
    const byId = {};
    for (const d of defs)
        byId[d.id] = d;
    const rooms = {};
    for (const d of defs) {
        const exits = {};
        for (const [dir, to] of Object.entries(d.exits ?? {})) {
            if (!to)
                continue;
            const dest = byId[to];
            exits[dir] = dest ? { to, description: shortName(dest.name) } : { to };
        }
        const room = {
            id: d.id,
            name: d.name,
            description: d.description ?? fallbackDescription,
            exits,
            items: d.items ?? [],
            npcs: d.npcs ?? [],
        };
        if (d.onEnter)
            room.onEnter = d.onEnter;
        if (d.onTick)
            room.onTick = d.onTick;
        if (d.flags)
            room.flags = d.flags;
        if (d.scenery)
            room.scenery = d.scenery;
        rooms[d.id] = room;
    }
    return rooms;
}
function unquote(v) {
    v = v.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        try {
            return JSON.parse(v.replace(/^'|'$/g, '"'));
        }
        catch {
            return v.slice(1, -1);
        }
    }
    return v;
}
/** Parse the mapper's YAML (area/areaName/levels/lift/stop + rooms with
 *  id/name/level/stop/lift/exits). Comments and blank lines are ignored. */
export function parseAreaYaml(text) {
    const data = { area: "new_area", areaName: "New Area", levels: 1, lift: null, stop: null, rooms: [] };
    let cur = null;
    let inExits = false;
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.replace(/\t/g, "    ");
        if (!line.trim() || line.trim().startsWith("#"))
            continue;
        const indent = line.length - line.trimStart().length;
        const s = line.trim();
        let m;
        if (indent === 0) {
            if ((m = s.match(/^area:\s*(.+)$/))) {
                data.area = unquote(m[1]);
                inExits = false;
                continue;
            }
            if ((m = s.match(/^areaName:\s*(.+)$/))) {
                data.areaName = unquote(m[1]);
                inExits = false;
                continue;
            }
            if ((m = s.match(/^levels:\s*(.+)$/))) {
                data.levels = parseInt(unquote(m[1]), 10) || 1;
                inExits = false;
                continue;
            }
            if ((m = s.match(/^lift:\s*(.+)$/))) {
                const v = unquote(m[1]);
                data.lift = v === "null" ? null : v;
                inExits = false;
                continue;
            }
            if ((m = s.match(/^stop:\s*(.+)$/))) {
                const v = unquote(m[1]);
                data.stop = v === "null" ? null : v;
                inExits = false;
                continue;
            }
            if (s.match(/^rooms:\s*$/)) {
                inExits = false;
                continue;
            }
            continue;
        }
        if ((m = s.match(/^-\s*id:\s*(.+)$/))) {
            cur = { id: unquote(m[1]), name: "", level: 1, stop: false, lift: false, exits: {} };
            data.rooms.push(cur);
            inExits = false;
            continue;
        }
        if (!cur)
            continue;
        if ((m = s.match(/^name:\s*(.+)$/))) {
            cur.name = unquote(m[1]);
            inExits = false;
            continue;
        }
        if ((m = s.match(/^level:\s*(.+)$/))) {
            cur.level = parseInt(unquote(m[1]), 10) || 1;
            inExits = false;
            continue;
        }
        if ((m = s.match(/^lift:\s*(.+)$/))) {
            cur.lift = /true/i.test(m[1]);
            inExits = false;
            continue;
        }
        if ((m = s.match(/^stop:\s*(.+)$/))) {
            cur.stop = /true/i.test(m[1]);
            inExits = false;
            continue;
        }
        if ((m = s.match(/^exits:\s*\{(.+)\}\s*$/))) { // inline: exits: { north: a, east: b }
            for (const pair of m[1].split(",")) {
                const mm = pair.trim().match(/^(north|south|east|west|up|down):\s*(.+)$/);
                if (mm)
                    cur.exits[mm[1]] = unquote(mm[2].trim());
            }
            inExits = false;
            continue;
        }
        if (s.match(/^exits:\s*\{\s*\}\s*$/)) {
            inExits = false;
            continue;
        } // exits: {}
        if (s.match(/^exits:\s*$/)) {
            inExits = true;
            continue;
        } // block form
        if (inExits && (m = s.match(/^(north|south|east|west|up|down):\s*(.+)$/))) {
            cur.exits[m[1]] = unquote(m[2]);
            continue;
        }
    }
    return data;
}
/** Build an area straight from the mapper's YAML, layering prose/items/NPCs on
 *  top. Returns the rooms and the parsed structure (use the latter to register
 *  a lift — see lifts.ts `liftDefFromYaml`). */
export function buildAreaFromYaml(text, overrides = {}) {
    const parsed = parseAreaYaml(text);
    const defs = parsed.rooms.map(r => {
        const ov = overrides.rooms?.[r.id] ?? {};
        const def = {
            id: r.id,
            name: ov.name ?? r.name,
            description: ov.description ?? overrides.defaultDescription?.(r) ?? "An unremarkable spot.",
            exits: r.exits,
        };
        if (ov.items)
            def.items = ov.items;
        if (ov.npcs)
            def.npcs = ov.npcs;
        if (ov.onEnter)
            def.onEnter = ov.onEnter;
        if (ov.onTick)
            def.onTick = ov.onTick;
        if (ov.scenery)
            def.scenery = ov.scenery;
        return def;
    });
    return { rooms: buildArea(defs), parsed };
}
