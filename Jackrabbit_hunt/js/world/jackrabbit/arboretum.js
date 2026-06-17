// The Arboretum — a 26-room green belt wrapping the station's midsection.
// Mapped with tools/mapper.html (topology validated: all exits reciprocal,
// nothing dangling, fully reachable from the entrance). Built via buildArea().
//
// Navigation aid: the arboretum is deliberately a gentle maze of near-identical
// paths. Two themed systems help orient — the FOOTPATHS are formal and
// manicured; the WINDING PATHS are wilder and meandering — and the GIANT TREE
// at the centre is visible from almost everywhere as an anchor. Five rooms have
// distinctive descriptions: the entrance (the TravelTube stop), the giant tree,
// the flower beds, the algae tanks, and the park bench.
//
// Plot-wise this is skeleton-first: a real place ready for events to be sited
// later (the quiet park bench is an obvious candidate for a clandestine
// encounter). No NPCs or scored clues here yet.
import { buildArea } from "./area.js";
// Shared atmospheric flavour appended to the generic path rooms, so even the
// repetitive corridors feel like somewhere.
const FOOTPATH_DESC = "A manicured footpath winds between clipped hedges and beds of green, the gravel raked and tended. " +
    "The light falls from the station's central axis far above — diffuse and directional, close enough " +
    "to natural daylight that the plants, at least, seem entirely convinced by it. Through gaps in the " +
    "planting the great tree at the arboretum's heart shows itself, a reliable landmark.";
const WINDING_DESC = "The path turns wilder here — looser planting, longer grass, the gravel giving way to trodden earth " +
    "that meanders rather than leads. The denser growth filters the axial light into something greener " +
    "and more fragmentary, and it is quieter on this side, easier to lose your bearings. The great tree " +
    "still shows itself above the canopy now and then — a reliable point of reference if you need one.";
const defs = [
    // --- Entrance (TravelTube stop) ---
    {
        id: "horizon_arboretum_entrance",
        name: "Arboretum — Entrance",
        description: (s) => "The TravelTube opens directly onto the arboretum: a belt of green wrapped around the station's " +
            "midsection, wider than it first appears, stretching away in both directions. The air is cool, " +
            "damp, and alive with the smell of growing things — a startling contrast to the rest of Horizon's " +
            "carefully managed but essentially industrial atmosphere.\n\n" +
            "A TravelTube stop sits right here. " +
            (s.flags["pod_summoned_at"] === "horizon_arboretum_entrance"
                ? "A pod waits in the bay, doors open — you can BOARD it. "
                : "Scan your ID at the reader to summon a pod. ") +
            "A footpath leads south into the green.",
        exits: { south: "horizon_footpath" },
        items: ["arboretum_reader"],
    },
    // --- Footpath system (formal/manicured) ---
    { id: "horizon_footpath", name: "Arboretum — Footpath", description: FOOTPATH_DESC,
        exits: { north: "horizon_arboretum_entrance", south: "horizon_footpath_2", east: "horizon_winding_path_9", west: "horizon_footpath_10" } },
    { id: "horizon_footpath_2", name: "Arboretum — Footpath", description: FOOTPATH_DESC,
        exits: { north: "horizon_footpath", south: "horizon_footpath_3" } },
    { id: "horizon_footpath_3", name: "Arboretum — Footpath", description: FOOTPATH_DESC,
        exits: { north: "horizon_footpath_2", south: "horizon_footpath_4", west: "horizon_flower_beds" } },
    { id: "horizon_footpath_4", name: "Arboretum — Footpath", description: FOOTPATH_DESC,
        exits: { north: "horizon_footpath_3", south: "horizon_giant_tree" } },
    { id: "horizon_footpath_5", name: "Arboretum — Footpath", description: FOOTPATH_DESC,
        exits: { east: "horizon_giant_tree", west: "horizon_footpath_6" } },
    { id: "horizon_footpath_6", name: "Arboretum — Footpath", description: FOOTPATH_DESC,
        exits: { north: "horizon_footpath_7", east: "horizon_footpath_5" } },
    { id: "horizon_footpath_7", name: "Arboretum — Footpath", description: FOOTPATH_DESC,
        exits: { north: "horizon_footpath_8", south: "horizon_footpath_6" } },
    { id: "horizon_footpath_8", name: "Arboretum — Footpath", description: FOOTPATH_DESC,
        exits: { north: "horizon_footpath_9", south: "horizon_footpath_7", east: "horizon_flower_beds" } },
    { id: "horizon_footpath_9", name: "Arboretum — Footpath", description: FOOTPATH_DESC,
        exits: { north: "horizon_footpath_10", south: "horizon_footpath_8" } },
    { id: "horizon_footpath_10", name: "Arboretum — Footpath", description: FOOTPATH_DESC,
        exits: { south: "horizon_footpath_9", east: "horizon_footpath" } },
    { id: "horizon_footpath_11", name: "Arboretum — Footpath", description: FOOTPATH_DESC,
        exits: { north: "horizon_giant_tree", south: "horizon_footpath_12" } },
    { id: "horizon_footpath_12", name: "Arboretum — Footpath", description: FOOTPATH_DESC,
        exits: { north: "horizon_footpath_11", east: "horizon_algae_tanks" } },
    // --- Winding path system (wild/meandering) ---
    { id: "horizon_winding_path", name: "Arboretum — Winding Path", description: WINDING_DESC,
        exits: { north: "horizon_winding_path_2", west: "horizon_giant_tree" } },
    { id: "horizon_winding_path_2", name: "Arboretum — Winding Path", description: WINDING_DESC,
        exits: { north: "horizon_winding_path_3", south: "horizon_winding_path" } },
    { id: "horizon_winding_path_3", name: "Arboretum — Winding Path", description: WINDING_DESC,
        exits: { south: "horizon_winding_path_2", east: "horizon_winding_path_4" } },
    { id: "horizon_winding_path_4", name: "Arboretum — Winding Path", description: WINDING_DESC,
        exits: { north: "horizon_winding_path_5", south: "horizon_park_bench", west: "horizon_winding_path_3" } },
    { id: "horizon_winding_path_5", name: "Arboretum — Winding Path", description: WINDING_DESC,
        exits: { south: "horizon_winding_path_4", west: "horizon_winding_path_6" } },
    { id: "horizon_winding_path_6", name: "Arboretum — Winding Path", description: WINDING_DESC,
        exits: { north: "horizon_winding_path_7", east: "horizon_winding_path_5" } },
    { id: "horizon_winding_path_7", name: "Arboretum — Winding Path", description: WINDING_DESC,
        exits: { south: "horizon_winding_path_6", east: "horizon_winding_path_8" } },
    { id: "horizon_winding_path_8", name: "Arboretum — Winding Path", description: WINDING_DESC,
        exits: { north: "horizon_winding_path_9", west: "horizon_winding_path_7" } },
    { id: "horizon_winding_path_9", name: "Arboretum — Winding Path", description: WINDING_DESC,
        exits: { south: "horizon_winding_path_8", west: "horizon_footpath" } },
    // --- Distinctive feature rooms ---
    {
        id: "horizon_giant_tree",
        name: "Arboretum — The Giant Tree",
        description: "At the arboretum's heart stands the tree: a single vast specimen, decades old, its crown " +
            "reaching up toward the central axis far above, its roots buckling the path into slow waves. " +
            "Benches ring its base; people come simply to sit beneath it. The axial light catches the upper " +
            "canopy and filters down through layer after layer of leaf. From here paths run off in every " +
            "direction — the manicured footpaths to the north and west, the wilder winding paths to the east, " +
            "and a quieter path south toward the working end of the arboretum.",
        exits: { north: "horizon_footpath_4", south: "horizon_footpath_11", east: "horizon_winding_path", west: "horizon_footpath_5" },
        items: ["the_giant_tree"],
    },
    {
        id: "horizon_flower_beds",
        name: "Arboretum — Flower Beds",
        description: "A blaze of cultivated colour, improbable this far from any planet: tiered beds of blooms " +
            "in careful gradients, labelled with little ceramic markers, tended to within an inch of " +
            "their lives. The scent is almost too much in the enclosed air. Paths rejoin the green to " +
            "the east and west.",
        exits: { east: "horizon_footpath_3", west: "horizon_footpath_8" },
        items: ["flower_beds"],
    },
    {
        id: "horizon_algae_tanks",
        name: "Arboretum — Algae Tanks",
        description: "The arboretum's working heart, half-hidden behind the ornamental green: ranks of tall " +
            "translucent tanks glowing a deep, lit emerald, bubbling softly. This is where a good part " +
            "of Horizon's air is actually made — the pretty trees are, a small sign concedes, mostly " +
            "for morale. A footpath leads back west.",
        exits: { west: "horizon_footpath_12" },
        items: ["algae_tanks"],
    },
    {
        id: "horizon_park_bench",
        name: "Arboretum — Quiet Bench",
        description: "A single worn bench in a pocket of stillness, tucked off the winding path where the " +
            "planting grows close and the sightlines are short. It is about the most private spot in a " +
            "public place that you've found on Horizon — the kind of bench where a quiet word would " +
            "carry no further than the person beside you. The path runs back north.",
        exits: { north: "horizon_winding_path_4" },
        items: ["the_bench"],
    },
];
export const arboretumRooms = buildArea(defs);
// --- Scenery items (examinable feature objects) -------------------------
const giantTree = {
    id: "the_giant_tree",
    name: "giant tree",
    aliases: ["tree", "giant tree", "trunk", "crown", "roots"],
    description: "Up close the tree is staggering — bark you could lose a hand in the cracks of, a trunk it " +
        "would take six people to ring. Someone has carved initials into it over the years, low " +
        "down, the older ones healed to pale scars. It has clearly been here almost as long as the " +
        "station, and is plainly loved.",
    takeable: false,
};
const flowerBeds = {
    id: "flower_beds",
    name: "flower beds",
    aliases: ["flowers", "beds", "blooms", "markers"],
    description: "Beds of cultivated flowers in careful gradients, each clump labelled with a little ceramic " +
        "marker giving its name and origin world. A surprising number are from places that, the " +
        "markers note in small print, no longer exist.",
    takeable: false,
};
const algaeTanks = {
    id: "algae_tanks",
    name: "algae tanks",
    aliases: ["tanks", "algae", "vats"],
    description: "Tall tanks of dense green culture, lit from within, threaded with rising chains of bubbles. " +
        "A panel tracks oxygen output in real time. This unglamorous green soup, not the handsome " +
        "trees, is what actually keeps Horizon breathing.",
    takeable: false,
};
const theBench = {
    id: "the_bench",
    name: "bench",
    aliases: ["bench", "park bench", "seat"],
    description: "A weathered bench, the wood silvered with age, half-screened by overgrown planting. Someone " +
        "has sat here a great deal: the slats are worn smooth. It is private in a way almost nowhere " +
        "on a station ever is.",
    takeable: false,
};
export const arboretumItems = {
    the_giant_tree: giantTree,
    flower_beds: flowerBeds,
    algae_tanks: algaeTanks,
    the_bench: theBench,
};
// NPCs: none yet (skeleton-first). Exported empty for symmetry with horizon.ts.
export const arboretumNpcs = {};
