// Residential Zone B — a large, deliberately disorienting residential district:
// 512 numbered residences spread over four near-identical levels, reached by the
// zone's lift. Built straight from the mapper YAML (maps/residential_zone_b.yaml)
// via buildAreaFromYaml.
//
// Per the brief, the zone is MEANT to confuse: every room of a given kind shares
// ONE generic description, and the only thing distinguishing one location from
// another is its name — i.e. the address in the room title (plus the
// auto-signposted exits). The Rajah defect thread (lcd_npcs.ts) uses exactly
// this: Burke sends the PC to a random, persistent residence address in here to
// find her, so the navigation friction is a feature, not a bug.
//
// Reachability: the entrance hall (horizon_residential_zone_b, L1) is a
// TravelTube stop — declared in its index.ts MODULES entry, with its reader item
// (reader_residential_b). The four levels are joined ONLY by the zone's lift.
// (The on-foot link from the Dockside Retail service corridor is reserved for the
// separate Residential Zone A, still to come — see horizon_corridor.)
import { buildAreaFromYaml } from "./area.js";
import { withLiftDirs, liftDefFromYaml, liftDescription } from "./lifts.js";
// --- The mapper YAML (topology) -----------------------------------------
const RESIDENTIAL_ZONE_B_YAML = `
# Generated for Residential Zone B
area: residential_zone_b
areaName: "Residential Zone B"
levels: 4
lift: horizon_residential_zone_b_lift
stop: horizon_residential_zone_b
rooms:
  # === LEVEL 1 ===
  - id: horizon_residential_zone_b
    level: 1
    name: "Residential zone B"
    stop: true
    exits:
      south: horizon_residential_zone_b_lift_l1
      east: horizon_residential_zone_b_northern_accessway_east
      west: horizon_residential_zone_b_northern_accessway_west
  - id: horizon_residential_zone_b_lift_l1
    level: 1
    name: "Residential zone B Lift"
    lift: true
    exits:
      north: horizon_residential_zone_b
  - id: horizon_residential_zone_b_northern_accessway_west
    level: 1
    name: "Residential zone B Northern Accessway (west)"
    exits:
      south: horizon_residential_zone_b_accessway_nw1
      east: horizon_residential_zone_b
      west: horizon_residential_zone_b_northern_accessway_west2
  - id: horizon_residential_zone_b_northern_accessway_west2
    level: 1
    name: "Residential zone B Northern Accessway (west)"
    exits:
      south: horizon_residential_zone_b_accessway_nw2
      east: horizon_residential_zone_b_northern_accessway_west
      west: horizon_residential_zone_b_northern_accessway_west3
  - id: horizon_residential_zone_b_northern_accessway_west3
    level: 1
    name: "Residential zone B Northern Accessway (west)"
    exits:
      south: horizon_residential_zone_b_accessway_nw3
      east: horizon_residential_zone_b_northern_accessway_west2
      west: horizon_residential_zone_b_northern_accessway_west4
  - id: horizon_residential_zone_b_northern_accessway_west4
    level: 1
    name: "Residential zone B Northern Accessway (west)"
    exits:
      south: horizon_residential_zone_b_accessway_nw4
      east: horizon_residential_zone_b_northern_accessway_west3
  - id: horizon_residential_zone_b_northern_accessway_east
    level: 1
    name: "Residential zone B Northern Accessway (east)"
    exits:
      south: horizon_residential_zone_b_accessway_ne1
      east: horizon_residential_zone_b_northern_accessway_east2
      west: horizon_residential_zone_b
  - id: horizon_residential_zone_b_northern_accessway_east2
    level: 1
    name: "Residential zone B Northern Accessway (east)"
    exits:
      south: horizon_residential_zone_b_accessway_ne2
      east: horizon_residential_zone_b_northern_accessway_east3
      west: horizon_residential_zone_b_northern_accessway_east
  - id: horizon_residential_zone_b_northern_accessway_east3
    level: 1
    name: "Residential zone B Northern Accessway (east)"
    exits:
      south: horizon_residential_zone_b_accessway_ne3
      east: horizon_residential_zone_b_northern_accessway_east4
      west: horizon_residential_zone_b_northern_accessway_east2
  - id: horizon_residential_zone_b_northern_accessway_east4
    level: 1
    name: "Residential zone B Northern Accessway (east)"
    exits:
      south: horizon_residential_zone_b_accessway_ne4
      west: horizon_residential_zone_b_northern_accessway_east3
  - id: horizon_residential_zone_b_accessway_nw1
    level: 1
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west
      south: horizon_residential_zone_b_accessway_nw1a
      east: horizon_residential_zone_b_residence_b1_nw1_e
      west: horizon_residential_zone_b_residence_b1_nw1_w
  - id: horizon_residential_zone_b_residence_b1_nw1_e
    level: 1
    name: "Residence B1-NW1-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1
  - id: horizon_residential_zone_b_residence_b1_nw1_w
    level: 1
    name: "Residence B1-NW1-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1
  - id: horizon_residential_zone_b_accessway_nw1a
    level: 1
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1
      south: horizon_residential_zone_b_accessway_nw1b
      east: horizon_residential_zone_b_residence_b1_nw1_a_e
      west: horizon_residential_zone_b_residence_b1_nw1_a_w
  - id: horizon_residential_zone_b_residence_b1_nw1_a_e
    level: 1
    name: "Residence B1-NW1-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1a
  - id: horizon_residential_zone_b_residence_b1_nw1_a_w
    level: 1
    name: "Residence B1-NW1-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1a
  - id: horizon_residential_zone_b_accessway_nw1b
    level: 1
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1a
      south: horizon_residential_zone_b_accessway_nw1c
      east: horizon_residential_zone_b_residence_b1_nw1_b_e
      west: horizon_residential_zone_b_residence_b1_nw1_b_w
  - id: horizon_residential_zone_b_residence_b1_nw1_b_e
    level: 1
    name: "Residence B1-NW1-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1b
  - id: horizon_residential_zone_b_residence_b1_nw1_b_w
    level: 1
    name: "Residence B1-NW1-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1b
  - id: horizon_residential_zone_b_accessway_nw1c
    level: 1
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1b
      south: horizon_residential_zone_b_accessway_nw1d
      east: horizon_residential_zone_b_residence_b1_nw1_c_e
      west: horizon_residential_zone_b_residence_b1_nw1_c_w
  - id: horizon_residential_zone_b_residence_b1_nw1_c_e
    level: 1
    name: "Residence B1-NW1-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1c
  - id: horizon_residential_zone_b_residence_b1_nw1_c_w
    level: 1
    name: "Residence B1-NW1-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1c
  - id: horizon_residential_zone_b_accessway_nw1d
    level: 1
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1c
      south: horizon_residential_zone_b_accessway_nw1e
      east: horizon_residential_zone_b_residence_b1_nw1_d_e
      west: horizon_residential_zone_b_residence_b1_nw1_d_w
  - id: horizon_residential_zone_b_residence_b1_nw1_d_e
    level: 1
    name: "Residence B1-NW1-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1d
  - id: horizon_residential_zone_b_residence_b1_nw1_d_w
    level: 1
    name: "Residence B1-NW1-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1d
  - id: horizon_residential_zone_b_accessway_nw1e
    level: 1
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1d
      south: horizon_residential_zone_b_accessway_nw1f
      east: horizon_residential_zone_b_residence_b1_nw1_e_e
      west: horizon_residential_zone_b_residence_b1_nw1_e_w
  - id: horizon_residential_zone_b_residence_b1_nw1_e_e
    level: 1
    name: "Residence B1-NW1-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1e
  - id: horizon_residential_zone_b_residence_b1_nw1_e_w
    level: 1
    name: "Residence B1-NW1-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1e
  - id: horizon_residential_zone_b_accessway_nw1f
    level: 1
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1e
      south: horizon_residential_zone_b_accessway_nw1g
      east: horizon_residential_zone_b_residence_b1_nw1_f_e
      west: horizon_residential_zone_b_residence_b1_nw1_f_w
  - id: horizon_residential_zone_b_residence_b1_nw1_f_e
    level: 1
    name: "Residence B1-NW1-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1f
  - id: horizon_residential_zone_b_residence_b1_nw1_f_w
    level: 1
    name: "Residence B1-NW1-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1f
  - id: horizon_residential_zone_b_accessway_nw1g
    level: 1
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1f
      east: horizon_residential_zone_b_residence_b1_nw1_g_e
      west: horizon_residential_zone_b_residence_b1_nw1_g_w
  - id: horizon_residential_zone_b_residence_b1_nw1_g_e
    level: 1
    name: "Residence B1-NW1-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1g
  - id: horizon_residential_zone_b_residence_b1_nw1_g_w
    level: 1
    name: "Residence B1-NW1-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1g
  - id: horizon_residential_zone_b_accessway_nw2
    level: 1
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west2
      south: horizon_residential_zone_b_accessway_nw2a
      east: horizon_residential_zone_b_residence_b1_nw2_e
      west: horizon_residential_zone_b_residence_b1_nw2_w
  - id: horizon_residential_zone_b_residence_b1_nw2_e
    level: 1
    name: "Residence B1-NW2-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2
  - id: horizon_residential_zone_b_residence_b1_nw2_w
    level: 1
    name: "Residence B1-NW2-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2
  - id: horizon_residential_zone_b_accessway_nw2a
    level: 1
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2
      south: horizon_residential_zone_b_accessway_nw2b
      east: horizon_residential_zone_b_residence_b1_nw2_a_e
      west: horizon_residential_zone_b_residence_b1_nw2_a_w
  - id: horizon_residential_zone_b_residence_b1_nw2_a_e
    level: 1
    name: "Residence B1-NW2-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2a
  - id: horizon_residential_zone_b_residence_b1_nw2_a_w
    level: 1
    name: "Residence B1-NW2-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2a
  - id: horizon_residential_zone_b_accessway_nw2b
    level: 1
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2a
      south: horizon_residential_zone_b_accessway_nw2c
      east: horizon_residential_zone_b_residence_b1_nw2_b_e
      west: horizon_residential_zone_b_residence_b1_nw2_b_w
  - id: horizon_residential_zone_b_residence_b1_nw2_b_e
    level: 1
    name: "Residence B1-NW2-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2b
  - id: horizon_residential_zone_b_residence_b1_nw2_b_w
    level: 1
    name: "Residence B1-NW2-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2b
  - id: horizon_residential_zone_b_accessway_nw2c
    level: 1
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2b
      south: horizon_residential_zone_b_accessway_nw2d
      east: horizon_residential_zone_b_residence_b1_nw2_c_e
      west: horizon_residential_zone_b_residence_b1_nw2_c_w
  - id: horizon_residential_zone_b_residence_b1_nw2_c_e
    level: 1
    name: "Residence B1-NW2-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2c
  - id: horizon_residential_zone_b_residence_b1_nw2_c_w
    level: 1
    name: "Residence B1-NW2-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2c
  - id: horizon_residential_zone_b_accessway_nw2d
    level: 1
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2c
      south: horizon_residential_zone_b_accessway_nw2e
      east: horizon_residential_zone_b_residence_b1_nw2_d_e
      west: horizon_residential_zone_b_residence_b1_nw2_d_w
  - id: horizon_residential_zone_b_residence_b1_nw2_d_e
    level: 1
    name: "Residence B1-NW2-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2d
  - id: horizon_residential_zone_b_residence_b1_nw2_d_w
    level: 1
    name: "Residence B1-NW2-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2d
  - id: horizon_residential_zone_b_accessway_nw2e
    level: 1
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2d
      south: horizon_residential_zone_b_accessway_nw2f
      east: horizon_residential_zone_b_residence_b1_nw2_e_e
      west: horizon_residential_zone_b_residence_b1_nw2_e_w
  - id: horizon_residential_zone_b_residence_b1_nw2_e_e
    level: 1
    name: "Residence B1-NW2-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2e
  - id: horizon_residential_zone_b_residence_b1_nw2_e_w
    level: 1
    name: "Residence B1-NW2-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2e
  - id: horizon_residential_zone_b_accessway_nw2f
    level: 1
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2e
      south: horizon_residential_zone_b_accessway_nw2g
      east: horizon_residential_zone_b_residence_b1_nw2_f_e
      west: horizon_residential_zone_b_residence_b1_nw2_f_w
  - id: horizon_residential_zone_b_residence_b1_nw2_f_e
    level: 1
    name: "Residence B1-NW2-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2f
  - id: horizon_residential_zone_b_residence_b1_nw2_f_w
    level: 1
    name: "Residence B1-NW2-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2f
  - id: horizon_residential_zone_b_accessway_nw2g
    level: 1
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2f
      east: horizon_residential_zone_b_residence_b1_nw2_g_e
      west: horizon_residential_zone_b_residence_b1_nw2_g_w
  - id: horizon_residential_zone_b_residence_b1_nw2_g_e
    level: 1
    name: "Residence B1-NW2-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2g
  - id: horizon_residential_zone_b_residence_b1_nw2_g_w
    level: 1
    name: "Residence B1-NW2-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2g
  - id: horizon_residential_zone_b_accessway_nw3
    level: 1
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west3
      south: horizon_residential_zone_b_accessway_nw3a
      east: horizon_residential_zone_b_residence_b1_nw3_e
      west: horizon_residential_zone_b_residence_b1_nw3_w
  - id: horizon_residential_zone_b_residence_b1_nw3_e
    level: 1
    name: "Residence B1-NW3-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3
  - id: horizon_residential_zone_b_residence_b1_nw3_w
    level: 1
    name: "Residence B1-NW3-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3
  - id: horizon_residential_zone_b_accessway_nw3a
    level: 1
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3
      south: horizon_residential_zone_b_accessway_nw3b
      east: horizon_residential_zone_b_residence_b1_nw3_a_e
      west: horizon_residential_zone_b_residence_b1_nw3_a_w
  - id: horizon_residential_zone_b_residence_b1_nw3_a_e
    level: 1
    name: "Residence B1-NW3-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3a
  - id: horizon_residential_zone_b_residence_b1_nw3_a_w
    level: 1
    name: "Residence B1-NW3-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3a
  - id: horizon_residential_zone_b_accessway_nw3b
    level: 1
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3a
      south: horizon_residential_zone_b_accessway_nw3c
      east: horizon_residential_zone_b_residence_b1_nw3_b_e
      west: horizon_residential_zone_b_residence_b1_nw3_b_w
  - id: horizon_residential_zone_b_residence_b1_nw3_b_e
    level: 1
    name: "Residence B1-NW3-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3b
  - id: horizon_residential_zone_b_residence_b1_nw3_b_w
    level: 1
    name: "Residence B1-NW3-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3b
  - id: horizon_residential_zone_b_accessway_nw3c
    level: 1
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3b
      south: horizon_residential_zone_b_accessway_nw3d
      east: horizon_residential_zone_b_residence_b1_nw3_c_e
      west: horizon_residential_zone_b_residence_b1_nw3_c_w
  - id: horizon_residential_zone_b_residence_b1_nw3_c_e
    level: 1
    name: "Residence B1-NW3-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3c
  - id: horizon_residential_zone_b_residence_b1_nw3_c_w
    level: 1
    name: "Residence B1-NW3-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3c
  - id: horizon_residential_zone_b_accessway_nw3d
    level: 1
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3c
      south: horizon_residential_zone_b_accessway_nw3e
      east: horizon_residential_zone_b_residence_b1_nw3_d_e
      west: horizon_residential_zone_b_residence_b1_nw3_d_w
  - id: horizon_residential_zone_b_residence_b1_nw3_d_e
    level: 1
    name: "Residence B1-NW3-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3d
  - id: horizon_residential_zone_b_residence_b1_nw3_d_w
    level: 1
    name: "Residence B1-NW3-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3d
  - id: horizon_residential_zone_b_accessway_nw3e
    level: 1
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3d
      south: horizon_residential_zone_b_accessway_nw3f
      east: horizon_residential_zone_b_residence_b1_nw3_e_e
      west: horizon_residential_zone_b_residence_b1_nw3_e_w
  - id: horizon_residential_zone_b_residence_b1_nw3_e_e
    level: 1
    name: "Residence B1-NW3-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3e
  - id: horizon_residential_zone_b_residence_b1_nw3_e_w
    level: 1
    name: "Residence B1-NW3-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3e
  - id: horizon_residential_zone_b_accessway_nw3f
    level: 1
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3e
      south: horizon_residential_zone_b_accessway_nw3g
      east: horizon_residential_zone_b_residence_b1_nw3_f_e
      west: horizon_residential_zone_b_residence_b1_nw3_f_w
  - id: horizon_residential_zone_b_residence_b1_nw3_f_e
    level: 1
    name: "Residence B1-NW3-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3f
  - id: horizon_residential_zone_b_residence_b1_nw3_f_w
    level: 1
    name: "Residence B1-NW3-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3f
  - id: horizon_residential_zone_b_accessway_nw3g
    level: 1
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3f
      east: horizon_residential_zone_b_residence_b1_nw3_g_e
      west: horizon_residential_zone_b_residence_b1_nw3_g_w
  - id: horizon_residential_zone_b_residence_b1_nw3_g_e
    level: 1
    name: "Residence B1-NW3-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3g
  - id: horizon_residential_zone_b_residence_b1_nw3_g_w
    level: 1
    name: "Residence B1-NW3-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3g
  - id: horizon_residential_zone_b_accessway_nw4
    level: 1
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west4
      south: horizon_residential_zone_b_accessway_nw4a
      east: horizon_residential_zone_b_residence_b1_nw4_e
      west: horizon_residential_zone_b_residence_b1_nw4_w
  - id: horizon_residential_zone_b_residence_b1_nw4_e
    level: 1
    name: "Residence B1-NW4-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4
  - id: horizon_residential_zone_b_residence_b1_nw4_w
    level: 1
    name: "Residence B1-NW4-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4
  - id: horizon_residential_zone_b_accessway_nw4a
    level: 1
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4
      south: horizon_residential_zone_b_accessway_nw4b
      east: horizon_residential_zone_b_residence_b1_nw4_a_e
      west: horizon_residential_zone_b_residence_b1_nw4_a_w
  - id: horizon_residential_zone_b_residence_b1_nw4_a_e
    level: 1
    name: "Residence B1-NW4-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4a
  - id: horizon_residential_zone_b_residence_b1_nw4_a_w
    level: 1
    name: "Residence B1-NW4-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4a
  - id: horizon_residential_zone_b_accessway_nw4b
    level: 1
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4a
      south: horizon_residential_zone_b_accessway_nw4c
      east: horizon_residential_zone_b_residence_b1_nw4_b_e
      west: horizon_residential_zone_b_residence_b1_nw4_b_w
  - id: horizon_residential_zone_b_residence_b1_nw4_b_e
    level: 1
    name: "Residence B1-NW4-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4b
  - id: horizon_residential_zone_b_residence_b1_nw4_b_w
    level: 1
    name: "Residence B1-NW4-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4b
  - id: horizon_residential_zone_b_accessway_nw4c
    level: 1
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4b
      south: horizon_residential_zone_b_accessway_nw4d
      east: horizon_residential_zone_b_residence_b1_nw4_c_e
      west: horizon_residential_zone_b_residence_b1_nw4_c_w
  - id: horizon_residential_zone_b_residence_b1_nw4_c_e
    level: 1
    name: "Residence B1-NW4-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4c
  - id: horizon_residential_zone_b_residence_b1_nw4_c_w
    level: 1
    name: "Residence B1-NW4-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4c
  - id: horizon_residential_zone_b_accessway_nw4d
    level: 1
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4c
      south: horizon_residential_zone_b_accessway_nw4e
      east: horizon_residential_zone_b_residence_b1_nw4_d_e
      west: horizon_residential_zone_b_residence_b1_nw4_d_w
  - id: horizon_residential_zone_b_residence_b1_nw4_d_e
    level: 1
    name: "Residence B1-NW4-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4d
  - id: horizon_residential_zone_b_residence_b1_nw4_d_w
    level: 1
    name: "Residence B1-NW4-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4d
  - id: horizon_residential_zone_b_accessway_nw4e
    level: 1
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4d
      south: horizon_residential_zone_b_accessway_nw4f
      east: horizon_residential_zone_b_residence_b1_nw4_e_e
      west: horizon_residential_zone_b_residence_b1_nw4_e_w
  - id: horizon_residential_zone_b_residence_b1_nw4_e_e
    level: 1
    name: "Residence B1-NW4-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4e
  - id: horizon_residential_zone_b_residence_b1_nw4_e_w
    level: 1
    name: "Residence B1-NW4-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4e
  - id: horizon_residential_zone_b_accessway_nw4f
    level: 1
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4e
      south: horizon_residential_zone_b_accessway_nw4g
      east: horizon_residential_zone_b_residence_b1_nw4_f_e
      west: horizon_residential_zone_b_residence_b1_nw4_f_w
  - id: horizon_residential_zone_b_residence_b1_nw4_f_e
    level: 1
    name: "Residence B1-NW4-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4f
  - id: horizon_residential_zone_b_residence_b1_nw4_f_w
    level: 1
    name: "Residence B1-NW4-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4f
  - id: horizon_residential_zone_b_accessway_nw4g
    level: 1
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4f
      east: horizon_residential_zone_b_residence_b1_nw4_g_e
      west: horizon_residential_zone_b_residence_b1_nw4_g_w
  - id: horizon_residential_zone_b_residence_b1_nw4_g_e
    level: 1
    name: "Residence B1-NW4-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4g
  - id: horizon_residential_zone_b_residence_b1_nw4_g_w
    level: 1
    name: "Residence B1-NW4-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4g
  - id: horizon_residential_zone_b_accessway_ne1
    level: 1
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east
      south: horizon_residential_zone_b_accessway_ne1a
      east: horizon_residential_zone_b_residence_b1_ne1_e
      west: horizon_residential_zone_b_residence_b1_ne1_w
  - id: horizon_residential_zone_b_residence_b1_ne1_e
    level: 1
    name: "Residence B1-NE1-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1
  - id: horizon_residential_zone_b_residence_b1_ne1_w
    level: 1
    name: "Residence B1-NE1-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1
  - id: horizon_residential_zone_b_accessway_ne1a
    level: 1
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1
      south: horizon_residential_zone_b_accessway_ne1b
      east: horizon_residential_zone_b_residence_b1_ne1_a_e
      west: horizon_residential_zone_b_residence_b1_ne1_a_w
  - id: horizon_residential_zone_b_residence_b1_ne1_a_e
    level: 1
    name: "Residence B1-NE1-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1a
  - id: horizon_residential_zone_b_residence_b1_ne1_a_w
    level: 1
    name: "Residence B1-NE1-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1a
  - id: horizon_residential_zone_b_accessway_ne1b
    level: 1
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1a
      south: horizon_residential_zone_b_accessway_ne1c
      east: horizon_residential_zone_b_residence_b1_ne1_b_e
      west: horizon_residential_zone_b_residence_b1_ne1_b_w
  - id: horizon_residential_zone_b_residence_b1_ne1_b_e
    level: 1
    name: "Residence B1-NE1-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1b
  - id: horizon_residential_zone_b_residence_b1_ne1_b_w
    level: 1
    name: "Residence B1-NE1-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1b
  - id: horizon_residential_zone_b_accessway_ne1c
    level: 1
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1b
      south: horizon_residential_zone_b_accessway_ne1d
      east: horizon_residential_zone_b_residence_b1_ne1_c_e
      west: horizon_residential_zone_b_residence_b1_ne1_c_w
  - id: horizon_residential_zone_b_residence_b1_ne1_c_e
    level: 1
    name: "Residence B1-NE1-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1c
  - id: horizon_residential_zone_b_residence_b1_ne1_c_w
    level: 1
    name: "Residence B1-NE1-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1c
  - id: horizon_residential_zone_b_accessway_ne1d
    level: 1
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1c
      south: horizon_residential_zone_b_accessway_ne1e
      east: horizon_residential_zone_b_residence_b1_ne1_d_e
      west: horizon_residential_zone_b_residence_b1_ne1_d_w
  - id: horizon_residential_zone_b_residence_b1_ne1_d_e
    level: 1
    name: "Residence B1-NE1-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1d
  - id: horizon_residential_zone_b_residence_b1_ne1_d_w
    level: 1
    name: "Residence B1-NE1-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1d
  - id: horizon_residential_zone_b_accessway_ne1e
    level: 1
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1d
      south: horizon_residential_zone_b_accessway_ne1f
      east: horizon_residential_zone_b_residence_b1_ne1_e_e
      west: horizon_residential_zone_b_residence_b1_ne1_e_w
  - id: horizon_residential_zone_b_residence_b1_ne1_e_e
    level: 1
    name: "Residence B1-NE1-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1e
  - id: horizon_residential_zone_b_residence_b1_ne1_e_w
    level: 1
    name: "Residence B1-NE1-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1e
  - id: horizon_residential_zone_b_accessway_ne1f
    level: 1
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1e
      south: horizon_residential_zone_b_accessway_ne1g
      east: horizon_residential_zone_b_residence_b1_ne1_f_e
      west: horizon_residential_zone_b_residence_b1_ne1_f_w
  - id: horizon_residential_zone_b_residence_b1_ne1_f_e
    level: 1
    name: "Residence B1-NE1-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1f
  - id: horizon_residential_zone_b_residence_b1_ne1_f_w
    level: 1
    name: "Residence B1-NE1-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1f
  - id: horizon_residential_zone_b_accessway_ne1g
    level: 1
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1f
      east: horizon_residential_zone_b_residence_b1_ne1_g_e
      west: horizon_residential_zone_b_residence_b1_ne1_g_w
  - id: horizon_residential_zone_b_residence_b1_ne1_g_e
    level: 1
    name: "Residence B1-NE1-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1g
  - id: horizon_residential_zone_b_residence_b1_ne1_g_w
    level: 1
    name: "Residence B1-NE1-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1g
  - id: horizon_residential_zone_b_accessway_ne2
    level: 1
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east2
      south: horizon_residential_zone_b_accessway_ne2a
      east: horizon_residential_zone_b_residence_b1_ne2_e
      west: horizon_residential_zone_b_residence_b1_ne2_w
  - id: horizon_residential_zone_b_residence_b1_ne2_e
    level: 1
    name: "Residence B1-NE2-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2
  - id: horizon_residential_zone_b_residence_b1_ne2_w
    level: 1
    name: "Residence B1-NE2-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2
  - id: horizon_residential_zone_b_accessway_ne2a
    level: 1
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2
      south: horizon_residential_zone_b_accessway_ne2b
      east: horizon_residential_zone_b_residence_b1_ne2_a_e
      west: horizon_residential_zone_b_residence_b1_ne2_a_w
  - id: horizon_residential_zone_b_residence_b1_ne2_a_e
    level: 1
    name: "Residence B1-NE2-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2a
  - id: horizon_residential_zone_b_residence_b1_ne2_a_w
    level: 1
    name: "Residence B1-NE2-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2a
  - id: horizon_residential_zone_b_accessway_ne2b
    level: 1
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2a
      south: horizon_residential_zone_b_accessway_ne2c
      east: horizon_residential_zone_b_residence_b1_ne2_b_e
      west: horizon_residential_zone_b_residence_b1_ne2_b_w
  - id: horizon_residential_zone_b_residence_b1_ne2_b_e
    level: 1
    name: "Residence B1-NE2-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2b
  - id: horizon_residential_zone_b_residence_b1_ne2_b_w
    level: 1
    name: "Residence B1-NE2-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2b
  - id: horizon_residential_zone_b_accessway_ne2c
    level: 1
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2b
      south: horizon_residential_zone_b_accessway_ne2d
      east: horizon_residential_zone_b_residence_b1_ne2_c_e
      west: horizon_residential_zone_b_residence_b1_ne2_c_w
  - id: horizon_residential_zone_b_residence_b1_ne2_c_e
    level: 1
    name: "Residence B1-NE2-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2c
  - id: horizon_residential_zone_b_residence_b1_ne2_c_w
    level: 1
    name: "Residence B1-NE2-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2c
  - id: horizon_residential_zone_b_accessway_ne2d
    level: 1
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2c
      south: horizon_residential_zone_b_accessway_ne2e
      east: horizon_residential_zone_b_residence_b1_ne2_d_e
      west: horizon_residential_zone_b_residence_b1_ne2_d_w
  - id: horizon_residential_zone_b_residence_b1_ne2_d_e
    level: 1
    name: "Residence B1-NE2-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2d
  - id: horizon_residential_zone_b_residence_b1_ne2_d_w
    level: 1
    name: "Residence B1-NE2-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2d
  - id: horizon_residential_zone_b_accessway_ne2e
    level: 1
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2d
      south: horizon_residential_zone_b_accessway_ne2f
      east: horizon_residential_zone_b_residence_b1_ne2_e_e
      west: horizon_residential_zone_b_residence_b1_ne2_e_w
  - id: horizon_residential_zone_b_residence_b1_ne2_e_e
    level: 1
    name: "Residence B1-NE2-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2e
  - id: horizon_residential_zone_b_residence_b1_ne2_e_w
    level: 1
    name: "Residence B1-NE2-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2e
  - id: horizon_residential_zone_b_accessway_ne2f
    level: 1
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2e
      south: horizon_residential_zone_b_accessway_ne2g
      east: horizon_residential_zone_b_residence_b1_ne2_f_e
      west: horizon_residential_zone_b_residence_b1_ne2_f_w
  - id: horizon_residential_zone_b_residence_b1_ne2_f_e
    level: 1
    name: "Residence B1-NE2-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2f
  - id: horizon_residential_zone_b_residence_b1_ne2_f_w
    level: 1
    name: "Residence B1-NE2-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2f
  - id: horizon_residential_zone_b_accessway_ne2g
    level: 1
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2f
      east: horizon_residential_zone_b_residence_b1_ne2_g_e
      west: horizon_residential_zone_b_residence_b1_ne2_g_w
  - id: horizon_residential_zone_b_residence_b1_ne2_g_e
    level: 1
    name: "Residence B1-NE2-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2g
  - id: horizon_residential_zone_b_residence_b1_ne2_g_w
    level: 1
    name: "Residence B1-NE2-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2g
  - id: horizon_residential_zone_b_accessway_ne3
    level: 1
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east3
      south: horizon_residential_zone_b_accessway_ne3a
      east: horizon_residential_zone_b_residence_b1_ne3_e
      west: horizon_residential_zone_b_residence_b1_ne3_w
  - id: horizon_residential_zone_b_residence_b1_ne3_e
    level: 1
    name: "Residence B1-NE3-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3
  - id: horizon_residential_zone_b_residence_b1_ne3_w
    level: 1
    name: "Residence B1-NE3-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3
  - id: horizon_residential_zone_b_accessway_ne3a
    level: 1
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3
      south: horizon_residential_zone_b_accessway_ne3b
      east: horizon_residential_zone_b_residence_b1_ne3_a_e
      west: horizon_residential_zone_b_residence_b1_ne3_a_w
  - id: horizon_residential_zone_b_residence_b1_ne3_a_e
    level: 1
    name: "Residence B1-NE3-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3a
  - id: horizon_residential_zone_b_residence_b1_ne3_a_w
    level: 1
    name: "Residence B1-NE3-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3a
  - id: horizon_residential_zone_b_accessway_ne3b
    level: 1
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3a
      south: horizon_residential_zone_b_accessway_ne3c
      east: horizon_residential_zone_b_residence_b1_ne3_b_e
      west: horizon_residential_zone_b_residence_b1_ne3_b_w
  - id: horizon_residential_zone_b_residence_b1_ne3_b_e
    level: 1
    name: "Residence B1-NE3-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3b
  - id: horizon_residential_zone_b_residence_b1_ne3_b_w
    level: 1
    name: "Residence B1-NE3-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3b
  - id: horizon_residential_zone_b_accessway_ne3c
    level: 1
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3b
      south: horizon_residential_zone_b_accessway_ne3d
      east: horizon_residential_zone_b_residence_b1_ne3_c_e
      west: horizon_residential_zone_b_residence_b1_ne3_c_w
  - id: horizon_residential_zone_b_residence_b1_ne3_c_e
    level: 1
    name: "Residence B1-NE3-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3c
  - id: horizon_residential_zone_b_residence_b1_ne3_c_w
    level: 1
    name: "Residence B1-NE3-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3c
  - id: horizon_residential_zone_b_accessway_ne3d
    level: 1
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3c
      south: horizon_residential_zone_b_accessway_ne3e
      east: horizon_residential_zone_b_residence_b1_ne3_d_e
      west: horizon_residential_zone_b_residence_b1_ne3_d_w
  - id: horizon_residential_zone_b_residence_b1_ne3_d_e
    level: 1
    name: "Residence B1-NE3-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3d
  - id: horizon_residential_zone_b_residence_b1_ne3_d_w
    level: 1
    name: "Residence B1-NE3-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3d
  - id: horizon_residential_zone_b_accessway_ne3e
    level: 1
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3d
      south: horizon_residential_zone_b_accessway_ne3f
      east: horizon_residential_zone_b_residence_b1_ne3_e_e
      west: horizon_residential_zone_b_residence_b1_ne3_e_w
  - id: horizon_residential_zone_b_residence_b1_ne3_e_e
    level: 1
    name: "Residence B1-NE3-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3e
  - id: horizon_residential_zone_b_residence_b1_ne3_e_w
    level: 1
    name: "Residence B1-NE3-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3e
  - id: horizon_residential_zone_b_accessway_ne3f
    level: 1
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3e
      south: horizon_residential_zone_b_accessway_ne3g
      east: horizon_residential_zone_b_residence_b1_ne3_f_e
      west: horizon_residential_zone_b_residence_b1_ne3_f_w
  - id: horizon_residential_zone_b_residence_b1_ne3_f_e
    level: 1
    name: "Residence B1-NE3-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3f
  - id: horizon_residential_zone_b_residence_b1_ne3_f_w
    level: 1
    name: "Residence B1-NE3-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3f
  - id: horizon_residential_zone_b_accessway_ne3g
    level: 1
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3f
      east: horizon_residential_zone_b_residence_b1_ne3_g_e
      west: horizon_residential_zone_b_residence_b1_ne3_g_w
  - id: horizon_residential_zone_b_residence_b1_ne3_g_e
    level: 1
    name: "Residence B1-NE3-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3g
  - id: horizon_residential_zone_b_residence_b1_ne3_g_w
    level: 1
    name: "Residence B1-NE3-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3g
  - id: horizon_residential_zone_b_accessway_ne4
    level: 1
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east4
      south: horizon_residential_zone_b_accessway_ne4a
      east: horizon_residential_zone_b_residence_b1_ne4_e
      west: horizon_residential_zone_b_residence_b1_ne4_w
  - id: horizon_residential_zone_b_residence_b1_ne4_e
    level: 1
    name: "Residence B1-NE4-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4
  - id: horizon_residential_zone_b_residence_b1_ne4_w
    level: 1
    name: "Residence B1-NE4-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4
  - id: horizon_residential_zone_b_accessway_ne4a
    level: 1
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4
      south: horizon_residential_zone_b_accessway_ne4b
      east: horizon_residential_zone_b_residence_b1_ne4_a_e
      west: horizon_residential_zone_b_residence_b1_ne4_a_w
  - id: horizon_residential_zone_b_residence_b1_ne4_a_e
    level: 1
    name: "Residence B1-NE4-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4a
  - id: horizon_residential_zone_b_residence_b1_ne4_a_w
    level: 1
    name: "Residence B1-NE4-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4a
  - id: horizon_residential_zone_b_accessway_ne4b
    level: 1
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4a
      south: horizon_residential_zone_b_accessway_ne4c
      east: horizon_residential_zone_b_residence_b1_ne4_b_e
      west: horizon_residential_zone_b_residence_b1_ne4_b_w
  - id: horizon_residential_zone_b_residence_b1_ne4_b_e
    level: 1
    name: "Residence B1-NE4-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4b
  - id: horizon_residential_zone_b_residence_b1_ne4_b_w
    level: 1
    name: "Residence B1-NE4-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4b
  - id: horizon_residential_zone_b_accessway_ne4c
    level: 1
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4b
      south: horizon_residential_zone_b_accessway_ne4d
      east: horizon_residential_zone_b_residence_b1_ne4_c_e
      west: horizon_residential_zone_b_residence_b1_ne4_c_w
  - id: horizon_residential_zone_b_residence_b1_ne4_c_e
    level: 1
    name: "Residence B1-NE4-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4c
  - id: horizon_residential_zone_b_residence_b1_ne4_c_w
    level: 1
    name: "Residence B1-NE4-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4c
  - id: horizon_residential_zone_b_accessway_ne4d
    level: 1
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4c
      south: horizon_residential_zone_b_accessway_ne4e
      east: horizon_residential_zone_b_residence_b1_ne4_d_e
      west: horizon_residential_zone_b_residence_b1_ne4_d_w
  - id: horizon_residential_zone_b_residence_b1_ne4_d_e
    level: 1
    name: "Residence B1-NE4-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4d
  - id: horizon_residential_zone_b_residence_b1_ne4_d_w
    level: 1
    name: "Residence B1-NE4-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4d
  - id: horizon_residential_zone_b_accessway_ne4e
    level: 1
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4d
      south: horizon_residential_zone_b_accessway_ne4f
      east: horizon_residential_zone_b_residence_b1_ne4_e_e
      west: horizon_residential_zone_b_residence_b1_ne4_e_w
  - id: horizon_residential_zone_b_residence_b1_ne4_e_e
    level: 1
    name: "Residence B1-NE4-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4e
  - id: horizon_residential_zone_b_residence_b1_ne4_e_w
    level: 1
    name: "Residence B1-NE4-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4e
  - id: horizon_residential_zone_b_accessway_ne4f
    level: 1
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4e
      south: horizon_residential_zone_b_accessway_ne4g
      east: horizon_residential_zone_b_residence_b1_ne4_f_e
      west: horizon_residential_zone_b_residence_b1_ne4_f_w
  - id: horizon_residential_zone_b_residence_b1_ne4_f_e
    level: 1
    name: "Residence B1-NE4-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4f
  - id: horizon_residential_zone_b_residence_b1_ne4_f_w
    level: 1
    name: "Residence B1-NE4-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4f
  - id: horizon_residential_zone_b_accessway_ne4g
    level: 1
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4f
      east: horizon_residential_zone_b_residence_b1_ne4_g_e
      west: horizon_residential_zone_b_residence_b1_ne4_g_w
  - id: horizon_residential_zone_b_residence_b1_ne4_g_e
    level: 1
    name: "Residence B1-NE4-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4g
  - id: horizon_residential_zone_b_residence_b1_ne4_g_w
    level: 1
    name: "Residence B1-NE4-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4g
  # === LEVEL 2 ===
  - id: horizon_residential_zone_b_l2
    level: 2
    name: "Residential zone B - 2"
    exits:
      south: horizon_residential_zone_b_lift_l2
      east: horizon_residential_zone_b_northern_accessway_east_l2
      west: horizon_residential_zone_b_northern_accessway_west_l2
  - id: horizon_residential_zone_b_lift_l2
    level: 2
    name: "Residential zone B Lift"
    lift: true
    exits:
      north: horizon_residential_zone_b_l2
  - id: horizon_residential_zone_b_northern_accessway_west_l2
    level: 2
    name: "Residential zone B Northern Accessway (west) - 2"
    exits:
      south: horizon_residential_zone_b_accessway_nw1_l2
      east: horizon_residential_zone_b_l2
      west: horizon_residential_zone_b_northern_accessway_west2_l2
  - id: horizon_residential_zone_b_northern_accessway_west2_l2
    level: 2
    name: "Residential zone B Northern Accessway (west) - 2"
    exits:
      south: horizon_residential_zone_b_accessway_nw2_l2
      east: horizon_residential_zone_b_northern_accessway_west_l2
      west: horizon_residential_zone_b_northern_accessway_west3_l2
  - id: horizon_residential_zone_b_northern_accessway_west3_l2
    level: 2
    name: "Residential zone B Northern Accessway (west) - 2"
    exits:
      south: horizon_residential_zone_b_accessway_nw3_l2
      east: horizon_residential_zone_b_northern_accessway_west2_l2
      west: horizon_residential_zone_b_northern_accessway_west4_l2
  - id: horizon_residential_zone_b_northern_accessway_west4_l2
    level: 2
    name: "Residential zone B Northern Accessway (west) - 2"
    exits:
      south: horizon_residential_zone_b_accessway_nw4_l2
      east: horizon_residential_zone_b_northern_accessway_west3_l2
  - id: horizon_residential_zone_b_northern_accessway_east_l2
    level: 2
    name: "Residential zone B Northern Accessway (east) - 2"
    exits:
      south: horizon_residential_zone_b_accessway_ne1_l2
      east: horizon_residential_zone_b_northern_accessway_east2_l2
      west: horizon_residential_zone_b_l2
  - id: horizon_residential_zone_b_northern_accessway_east2_l2
    level: 2
    name: "Residential zone B Northern Accessway (east) - 2"
    exits:
      south: horizon_residential_zone_b_accessway_ne2_l2
      east: horizon_residential_zone_b_northern_accessway_east3_l2
      west: horizon_residential_zone_b_northern_accessway_east_l2
  - id: horizon_residential_zone_b_northern_accessway_east3_l2
    level: 2
    name: "Residential zone B Northern Accessway (east) - 2"
    exits:
      south: horizon_residential_zone_b_accessway_ne3_l2
      east: horizon_residential_zone_b_northern_accessway_east4_l2
      west: horizon_residential_zone_b_northern_accessway_east2_l2
  - id: horizon_residential_zone_b_northern_accessway_east4_l2
    level: 2
    name: "Residential zone B Northern Accessway (east) - 2"
    exits:
      south: horizon_residential_zone_b_accessway_ne4_l2
      west: horizon_residential_zone_b_northern_accessway_east3_l2
  - id: horizon_residential_zone_b_accessway_nw1_l2
    level: 2
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west_l2
      south: horizon_residential_zone_b_accessway_nw1a_l2
      east: horizon_residential_zone_b_residence_b2_nw1_e
      west: horizon_residential_zone_b_residence_b2_nw1_w
  - id: horizon_residential_zone_b_residence_b2_nw1_e
    level: 2
    name: "Residence B2-NW1-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1_l2
  - id: horizon_residential_zone_b_residence_b2_nw1_w
    level: 2
    name: "Residence B2-NW1-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1_l2
  - id: horizon_residential_zone_b_accessway_nw1a_l2
    level: 2
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1_l2
      south: horizon_residential_zone_b_accessway_nw1b_l2
      east: horizon_residential_zone_b_residence_b2_nw1_a_e
      west: horizon_residential_zone_b_residence_b2_nw1_a_w
  - id: horizon_residential_zone_b_residence_b2_nw1_a_e
    level: 2
    name: "Residence B2-NW1-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1a_l2
  - id: horizon_residential_zone_b_residence_b2_nw1_a_w
    level: 2
    name: "Residence B2-NW1-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1a_l2
  - id: horizon_residential_zone_b_accessway_nw1b_l2
    level: 2
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1a_l2
      south: horizon_residential_zone_b_accessway_nw1c_l2
      east: horizon_residential_zone_b_residence_b2_nw1_b_e
      west: horizon_residential_zone_b_residence_b2_nw1_b_w
  - id: horizon_residential_zone_b_residence_b2_nw1_b_e
    level: 2
    name: "Residence B2-NW1-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1b_l2
  - id: horizon_residential_zone_b_residence_b2_nw1_b_w
    level: 2
    name: "Residence B2-NW1-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1b_l2
  - id: horizon_residential_zone_b_accessway_nw1c_l2
    level: 2
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1b_l2
      south: horizon_residential_zone_b_accessway_nw1d_l2
      east: horizon_residential_zone_b_residence_b2_nw1_c_e
      west: horizon_residential_zone_b_residence_b2_nw1_c_w
  - id: horizon_residential_zone_b_residence_b2_nw1_c_e
    level: 2
    name: "Residence B2-NW1-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1c_l2
  - id: horizon_residential_zone_b_residence_b2_nw1_c_w
    level: 2
    name: "Residence B2-NW1-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1c_l2
  - id: horizon_residential_zone_b_accessway_nw1d_l2
    level: 2
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1c_l2
      south: horizon_residential_zone_b_accessway_nw1e_l2
      east: horizon_residential_zone_b_residence_b2_nw1_d_e
      west: horizon_residential_zone_b_residence_b2_nw1_d_w
  - id: horizon_residential_zone_b_residence_b2_nw1_d_e
    level: 2
    name: "Residence B2-NW1-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1d_l2
  - id: horizon_residential_zone_b_residence_b2_nw1_d_w
    level: 2
    name: "Residence B2-NW1-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1d_l2
  - id: horizon_residential_zone_b_accessway_nw1e_l2
    level: 2
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1d_l2
      south: horizon_residential_zone_b_accessway_nw1f_l2
      east: horizon_residential_zone_b_residence_b2_nw1_e_e
      west: horizon_residential_zone_b_residence_b2_nw1_e_w
  - id: horizon_residential_zone_b_residence_b2_nw1_e_e
    level: 2
    name: "Residence B2-NW1-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1e_l2
  - id: horizon_residential_zone_b_residence_b2_nw1_e_w
    level: 2
    name: "Residence B2-NW1-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1e_l2
  - id: horizon_residential_zone_b_accessway_nw1f_l2
    level: 2
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1e_l2
      south: horizon_residential_zone_b_accessway_nw1g_l2
      east: horizon_residential_zone_b_residence_b2_nw1_f_e
      west: horizon_residential_zone_b_residence_b2_nw1_f_w
  - id: horizon_residential_zone_b_residence_b2_nw1_f_e
    level: 2
    name: "Residence B2-NW1-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1f_l2
  - id: horizon_residential_zone_b_residence_b2_nw1_f_w
    level: 2
    name: "Residence B2-NW1-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1f_l2
  - id: horizon_residential_zone_b_accessway_nw1g_l2
    level: 2
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1f_l2
      east: horizon_residential_zone_b_residence_b2_nw1_g_e
      west: horizon_residential_zone_b_residence_b2_nw1_g_w
  - id: horizon_residential_zone_b_residence_b2_nw1_g_e
    level: 2
    name: "Residence B2-NW1-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1g_l2
  - id: horizon_residential_zone_b_residence_b2_nw1_g_w
    level: 2
    name: "Residence B2-NW1-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1g_l2
  - id: horizon_residential_zone_b_accessway_nw2_l2
    level: 2
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west2_l2
      south: horizon_residential_zone_b_accessway_nw2a_l2
      east: horizon_residential_zone_b_residence_b2_nw2_e
      west: horizon_residential_zone_b_residence_b2_nw2_w
  - id: horizon_residential_zone_b_residence_b2_nw2_e
    level: 2
    name: "Residence B2-NW2-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2_l2
  - id: horizon_residential_zone_b_residence_b2_nw2_w
    level: 2
    name: "Residence B2-NW2-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2_l2
  - id: horizon_residential_zone_b_accessway_nw2a_l2
    level: 2
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2_l2
      south: horizon_residential_zone_b_accessway_nw2b_l2
      east: horizon_residential_zone_b_residence_b2_nw2_a_e
      west: horizon_residential_zone_b_residence_b2_nw2_a_w
  - id: horizon_residential_zone_b_residence_b2_nw2_a_e
    level: 2
    name: "Residence B2-NW2-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2a_l2
  - id: horizon_residential_zone_b_residence_b2_nw2_a_w
    level: 2
    name: "Residence B2-NW2-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2a_l2
  - id: horizon_residential_zone_b_accessway_nw2b_l2
    level: 2
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2a_l2
      south: horizon_residential_zone_b_accessway_nw2c_l2
      east: horizon_residential_zone_b_residence_b2_nw2_b_e
      west: horizon_residential_zone_b_residence_b2_nw2_b_w
  - id: horizon_residential_zone_b_residence_b2_nw2_b_e
    level: 2
    name: "Residence B2-NW2-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2b_l2
  - id: horizon_residential_zone_b_residence_b2_nw2_b_w
    level: 2
    name: "Residence B2-NW2-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2b_l2
  - id: horizon_residential_zone_b_accessway_nw2c_l2
    level: 2
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2b_l2
      south: horizon_residential_zone_b_accessway_nw2d_l2
      east: horizon_residential_zone_b_residence_b2_nw2_c_e
      west: horizon_residential_zone_b_residence_b2_nw2_c_w
  - id: horizon_residential_zone_b_residence_b2_nw2_c_e
    level: 2
    name: "Residence B2-NW2-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2c_l2
  - id: horizon_residential_zone_b_residence_b2_nw2_c_w
    level: 2
    name: "Residence B2-NW2-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2c_l2
  - id: horizon_residential_zone_b_accessway_nw2d_l2
    level: 2
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2c_l2
      south: horizon_residential_zone_b_accessway_nw2e_l2
      east: horizon_residential_zone_b_residence_b2_nw2_d_e
      west: horizon_residential_zone_b_residence_b2_nw2_d_w
  - id: horizon_residential_zone_b_residence_b2_nw2_d_e
    level: 2
    name: "Residence B2-NW2-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2d_l2
  - id: horizon_residential_zone_b_residence_b2_nw2_d_w
    level: 2
    name: "Residence B2-NW2-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2d_l2
  - id: horizon_residential_zone_b_accessway_nw2e_l2
    level: 2
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2d_l2
      south: horizon_residential_zone_b_accessway_nw2f_l2
      east: horizon_residential_zone_b_residence_b2_nw2_e_e
      west: horizon_residential_zone_b_residence_b2_nw2_e_w
  - id: horizon_residential_zone_b_residence_b2_nw2_e_e
    level: 2
    name: "Residence B2-NW2-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2e_l2
  - id: horizon_residential_zone_b_residence_b2_nw2_e_w
    level: 2
    name: "Residence B2-NW2-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2e_l2
  - id: horizon_residential_zone_b_accessway_nw2f_l2
    level: 2
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2e_l2
      south: horizon_residential_zone_b_accessway_nw2g_l2
      east: horizon_residential_zone_b_residence_b2_nw2_f_e
      west: horizon_residential_zone_b_residence_b2_nw2_f_w
  - id: horizon_residential_zone_b_residence_b2_nw2_f_e
    level: 2
    name: "Residence B2-NW2-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2f_l2
  - id: horizon_residential_zone_b_residence_b2_nw2_f_w
    level: 2
    name: "Residence B2-NW2-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2f_l2
  - id: horizon_residential_zone_b_accessway_nw2g_l2
    level: 2
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2f_l2
      east: horizon_residential_zone_b_residence_b2_nw2_g_e
      west: horizon_residential_zone_b_residence_b2_nw2_g_w
  - id: horizon_residential_zone_b_residence_b2_nw2_g_e
    level: 2
    name: "Residence B2-NW2-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2g_l2
  - id: horizon_residential_zone_b_residence_b2_nw2_g_w
    level: 2
    name: "Residence B2-NW2-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2g_l2
  - id: horizon_residential_zone_b_accessway_nw3_l2
    level: 2
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west3_l2
      south: horizon_residential_zone_b_accessway_nw3a_l2
      east: horizon_residential_zone_b_residence_b2_nw3_e
      west: horizon_residential_zone_b_residence_b2_nw3_w
  - id: horizon_residential_zone_b_residence_b2_nw3_e
    level: 2
    name: "Residence B2-NW3-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3_l2
  - id: horizon_residential_zone_b_residence_b2_nw3_w
    level: 2
    name: "Residence B2-NW3-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3_l2
  - id: horizon_residential_zone_b_accessway_nw3a_l2
    level: 2
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3_l2
      south: horizon_residential_zone_b_accessway_nw3b_l2
      east: horizon_residential_zone_b_residence_b2_nw3_a_e
      west: horizon_residential_zone_b_residence_b2_nw3_a_w
  - id: horizon_residential_zone_b_residence_b2_nw3_a_e
    level: 2
    name: "Residence B2-NW3-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3a_l2
  - id: horizon_residential_zone_b_residence_b2_nw3_a_w
    level: 2
    name: "Residence B2-NW3-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3a_l2
  - id: horizon_residential_zone_b_accessway_nw3b_l2
    level: 2
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3a_l2
      south: horizon_residential_zone_b_accessway_nw3c_l2
      east: horizon_residential_zone_b_residence_b2_nw3_b_e
      west: horizon_residential_zone_b_residence_b2_nw3_b_w
  - id: horizon_residential_zone_b_residence_b2_nw3_b_e
    level: 2
    name: "Residence B2-NW3-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3b_l2
  - id: horizon_residential_zone_b_residence_b2_nw3_b_w
    level: 2
    name: "Residence B2-NW3-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3b_l2
  - id: horizon_residential_zone_b_accessway_nw3c_l2
    level: 2
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3b_l2
      south: horizon_residential_zone_b_accessway_nw3d_l2
      east: horizon_residential_zone_b_residence_b2_nw3_c_e
      west: horizon_residential_zone_b_residence_b2_nw3_c_w
  - id: horizon_residential_zone_b_residence_b2_nw3_c_e
    level: 2
    name: "Residence B2-NW3-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3c_l2
  - id: horizon_residential_zone_b_residence_b2_nw3_c_w
    level: 2
    name: "Residence B2-NW3-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3c_l2
  - id: horizon_residential_zone_b_accessway_nw3d_l2
    level: 2
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3c_l2
      south: horizon_residential_zone_b_accessway_nw3e_l2
      east: horizon_residential_zone_b_residence_b2_nw3_d_e
      west: horizon_residential_zone_b_residence_b2_nw3_d_w
  - id: horizon_residential_zone_b_residence_b2_nw3_d_e
    level: 2
    name: "Residence B2-NW3-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3d_l2
  - id: horizon_residential_zone_b_residence_b2_nw3_d_w
    level: 2
    name: "Residence B2-NW3-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3d_l2
  - id: horizon_residential_zone_b_accessway_nw3e_l2
    level: 2
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3d_l2
      south: horizon_residential_zone_b_accessway_nw3f_l2
      east: horizon_residential_zone_b_residence_b2_nw3_e_e
      west: horizon_residential_zone_b_residence_b2_nw3_e_w
  - id: horizon_residential_zone_b_residence_b2_nw3_e_e
    level: 2
    name: "Residence B2-NW3-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3e_l2
  - id: horizon_residential_zone_b_residence_b2_nw3_e_w
    level: 2
    name: "Residence B2-NW3-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3e_l2
  - id: horizon_residential_zone_b_accessway_nw3f_l2
    level: 2
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3e_l2
      south: horizon_residential_zone_b_accessway_nw3g_l2
      east: horizon_residential_zone_b_residence_b2_nw3_f_e
      west: horizon_residential_zone_b_residence_b2_nw3_f_w
  - id: horizon_residential_zone_b_residence_b2_nw3_f_e
    level: 2
    name: "Residence B2-NW3-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3f_l2
  - id: horizon_residential_zone_b_residence_b2_nw3_f_w
    level: 2
    name: "Residence B2-NW3-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3f_l2
  - id: horizon_residential_zone_b_accessway_nw3g_l2
    level: 2
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3f_l2
      east: horizon_residential_zone_b_residence_b2_nw3_g_e
      west: horizon_residential_zone_b_residence_b2_nw3_g_w
  - id: horizon_residential_zone_b_residence_b2_nw3_g_e
    level: 2
    name: "Residence B2-NW3-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3g_l2
  - id: horizon_residential_zone_b_residence_b2_nw3_g_w
    level: 2
    name: "Residence B2-NW3-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3g_l2
  - id: horizon_residential_zone_b_accessway_nw4_l2
    level: 2
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west4_l2
      south: horizon_residential_zone_b_accessway_nw4a_l2
      east: horizon_residential_zone_b_residence_b2_nw4_e
      west: horizon_residential_zone_b_residence_b2_nw4_w
  - id: horizon_residential_zone_b_residence_b2_nw4_e
    level: 2
    name: "Residence B2-NW4-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4_l2
  - id: horizon_residential_zone_b_residence_b2_nw4_w
    level: 2
    name: "Residence B2-NW4-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4_l2
  - id: horizon_residential_zone_b_accessway_nw4a_l2
    level: 2
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4_l2
      south: horizon_residential_zone_b_accessway_nw4b_l2
      east: horizon_residential_zone_b_residence_b2_nw4_a_e
      west: horizon_residential_zone_b_residence_b2_nw4_a_w
  - id: horizon_residential_zone_b_residence_b2_nw4_a_e
    level: 2
    name: "Residence B2-NW4-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4a_l2
  - id: horizon_residential_zone_b_residence_b2_nw4_a_w
    level: 2
    name: "Residence B2-NW4-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4a_l2
  - id: horizon_residential_zone_b_accessway_nw4b_l2
    level: 2
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4a_l2
      south: horizon_residential_zone_b_accessway_nw4c_l2
      east: horizon_residential_zone_b_residence_b2_nw4_b_e
      west: horizon_residential_zone_b_residence_b2_nw4_b_w
  - id: horizon_residential_zone_b_residence_b2_nw4_b_e
    level: 2
    name: "Residence B2-NW4-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4b_l2
  - id: horizon_residential_zone_b_residence_b2_nw4_b_w
    level: 2
    name: "Residence B2-NW4-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4b_l2
  - id: horizon_residential_zone_b_accessway_nw4c_l2
    level: 2
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4b_l2
      south: horizon_residential_zone_b_accessway_nw4d_l2
      east: horizon_residential_zone_b_residence_b2_nw4_c_e
      west: horizon_residential_zone_b_residence_b2_nw4_c_w
  - id: horizon_residential_zone_b_residence_b2_nw4_c_e
    level: 2
    name: "Residence B2-NW4-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4c_l2
  - id: horizon_residential_zone_b_residence_b2_nw4_c_w
    level: 2
    name: "Residence B2-NW4-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4c_l2
  - id: horizon_residential_zone_b_accessway_nw4d_l2
    level: 2
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4c_l2
      south: horizon_residential_zone_b_accessway_nw4e_l2
      east: horizon_residential_zone_b_residence_b2_nw4_d_e
      west: horizon_residential_zone_b_residence_b2_nw4_d_w
  - id: horizon_residential_zone_b_residence_b2_nw4_d_e
    level: 2
    name: "Residence B2-NW4-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4d_l2
  - id: horizon_residential_zone_b_residence_b2_nw4_d_w
    level: 2
    name: "Residence B2-NW4-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4d_l2
  - id: horizon_residential_zone_b_accessway_nw4e_l2
    level: 2
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4d_l2
      south: horizon_residential_zone_b_accessway_nw4f_l2
      east: horizon_residential_zone_b_residence_b2_nw4_e_e
      west: horizon_residential_zone_b_residence_b2_nw4_e_w
  - id: horizon_residential_zone_b_residence_b2_nw4_e_e
    level: 2
    name: "Residence B2-NW4-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4e_l2
  - id: horizon_residential_zone_b_residence_b2_nw4_e_w
    level: 2
    name: "Residence B2-NW4-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4e_l2
  - id: horizon_residential_zone_b_accessway_nw4f_l2
    level: 2
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4e_l2
      south: horizon_residential_zone_b_accessway_nw4g_l2
      east: horizon_residential_zone_b_residence_b2_nw4_f_e
      west: horizon_residential_zone_b_residence_b2_nw4_f_w
  - id: horizon_residential_zone_b_residence_b2_nw4_f_e
    level: 2
    name: "Residence B2-NW4-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4f_l2
  - id: horizon_residential_zone_b_residence_b2_nw4_f_w
    level: 2
    name: "Residence B2-NW4-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4f_l2
  - id: horizon_residential_zone_b_accessway_nw4g_l2
    level: 2
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4f_l2
      east: horizon_residential_zone_b_residence_b2_nw4_g_e
      west: horizon_residential_zone_b_residence_b2_nw4_g_w
  - id: horizon_residential_zone_b_residence_b2_nw4_g_e
    level: 2
    name: "Residence B2-NW4-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4g_l2
  - id: horizon_residential_zone_b_residence_b2_nw4_g_w
    level: 2
    name: "Residence B2-NW4-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4g_l2
  - id: horizon_residential_zone_b_accessway_ne1_l2
    level: 2
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east_l2
      south: horizon_residential_zone_b_accessway_ne1a_l2
      east: horizon_residential_zone_b_residence_b2_ne1_e
      west: horizon_residential_zone_b_residence_b2_ne1_w
  - id: horizon_residential_zone_b_residence_b2_ne1_e
    level: 2
    name: "Residence B2-NE1-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1_l2
  - id: horizon_residential_zone_b_residence_b2_ne1_w
    level: 2
    name: "Residence B2-NE1-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1_l2
  - id: horizon_residential_zone_b_accessway_ne1a_l2
    level: 2
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1_l2
      south: horizon_residential_zone_b_accessway_ne1b_l2
      east: horizon_residential_zone_b_residence_b2_ne1_a_e
      west: horizon_residential_zone_b_residence_b2_ne1_a_w
  - id: horizon_residential_zone_b_residence_b2_ne1_a_e
    level: 2
    name: "Residence B2-NE1-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1a_l2
  - id: horizon_residential_zone_b_residence_b2_ne1_a_w
    level: 2
    name: "Residence B2-NE1-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1a_l2
  - id: horizon_residential_zone_b_accessway_ne1b_l2
    level: 2
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1a_l2
      south: horizon_residential_zone_b_accessway_ne1c_l2
      east: horizon_residential_zone_b_residence_b2_ne1_b_e
      west: horizon_residential_zone_b_residence_b2_ne1_b_w
  - id: horizon_residential_zone_b_residence_b2_ne1_b_e
    level: 2
    name: "Residence B2-NE1-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1b_l2
  - id: horizon_residential_zone_b_residence_b2_ne1_b_w
    level: 2
    name: "Residence B2-NE1-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1b_l2
  - id: horizon_residential_zone_b_accessway_ne1c_l2
    level: 2
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1b_l2
      south: horizon_residential_zone_b_accessway_ne1d_l2
      east: horizon_residential_zone_b_residence_b2_ne1_c_e
      west: horizon_residential_zone_b_residence_b2_ne1_c_w
  - id: horizon_residential_zone_b_residence_b2_ne1_c_e
    level: 2
    name: "Residence B2-NE1-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1c_l2
  - id: horizon_residential_zone_b_residence_b2_ne1_c_w
    level: 2
    name: "Residence B2-NE1-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1c_l2
  - id: horizon_residential_zone_b_accessway_ne1d_l2
    level: 2
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1c_l2
      south: horizon_residential_zone_b_accessway_ne1e_l2
      east: horizon_residential_zone_b_residence_b2_ne1_d_e
      west: horizon_residential_zone_b_residence_b2_ne1_d_w
  - id: horizon_residential_zone_b_residence_b2_ne1_d_e
    level: 2
    name: "Residence B2-NE1-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1d_l2
  - id: horizon_residential_zone_b_residence_b2_ne1_d_w
    level: 2
    name: "Residence B2-NE1-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1d_l2
  - id: horizon_residential_zone_b_accessway_ne1e_l2
    level: 2
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1d_l2
      south: horizon_residential_zone_b_accessway_ne1f_l2
      east: horizon_residential_zone_b_residence_b2_ne1_e_e
      west: horizon_residential_zone_b_residence_b2_ne1_e_w
  - id: horizon_residential_zone_b_residence_b2_ne1_e_e
    level: 2
    name: "Residence B2-NE1-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1e_l2
  - id: horizon_residential_zone_b_residence_b2_ne1_e_w
    level: 2
    name: "Residence B2-NE1-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1e_l2
  - id: horizon_residential_zone_b_accessway_ne1f_l2
    level: 2
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1e_l2
      south: horizon_residential_zone_b_accessway_ne1g_l2
      east: horizon_residential_zone_b_residence_b2_ne1_f_e
      west: horizon_residential_zone_b_residence_b2_ne1_f_w
  - id: horizon_residential_zone_b_residence_b2_ne1_f_e
    level: 2
    name: "Residence B2-NE1-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1f_l2
  - id: horizon_residential_zone_b_residence_b2_ne1_f_w
    level: 2
    name: "Residence B2-NE1-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1f_l2
  - id: horizon_residential_zone_b_accessway_ne1g_l2
    level: 2
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1f_l2
      east: horizon_residential_zone_b_residence_b2_ne1_g_e
      west: horizon_residential_zone_b_residence_b2_ne1_g_w
  - id: horizon_residential_zone_b_residence_b2_ne1_g_e
    level: 2
    name: "Residence B2-NE1-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1g_l2
  - id: horizon_residential_zone_b_residence_b2_ne1_g_w
    level: 2
    name: "Residence B2-NE1-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1g_l2
  - id: horizon_residential_zone_b_accessway_ne2_l2
    level: 2
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east2_l2
      south: horizon_residential_zone_b_accessway_ne2a_l2
      east: horizon_residential_zone_b_residence_b2_ne2_e
      west: horizon_residential_zone_b_residence_b2_ne2_w
  - id: horizon_residential_zone_b_residence_b2_ne2_e
    level: 2
    name: "Residence B2-NE2-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2_l2
  - id: horizon_residential_zone_b_residence_b2_ne2_w
    level: 2
    name: "Residence B2-NE2-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2_l2
  - id: horizon_residential_zone_b_accessway_ne2a_l2
    level: 2
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2_l2
      south: horizon_residential_zone_b_accessway_ne2b_l2
      east: horizon_residential_zone_b_residence_b2_ne2_a_e
      west: horizon_residential_zone_b_residence_b2_ne2_a_w
  - id: horizon_residential_zone_b_residence_b2_ne2_a_e
    level: 2
    name: "Residence B2-NE2-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2a_l2
  - id: horizon_residential_zone_b_residence_b2_ne2_a_w
    level: 2
    name: "Residence B2-NE2-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2a_l2
  - id: horizon_residential_zone_b_accessway_ne2b_l2
    level: 2
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2a_l2
      south: horizon_residential_zone_b_accessway_ne2c_l2
      east: horizon_residential_zone_b_residence_b2_ne2_b_e
      west: horizon_residential_zone_b_residence_b2_ne2_b_w
  - id: horizon_residential_zone_b_residence_b2_ne2_b_e
    level: 2
    name: "Residence B2-NE2-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2b_l2
  - id: horizon_residential_zone_b_residence_b2_ne2_b_w
    level: 2
    name: "Residence B2-NE2-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2b_l2
  - id: horizon_residential_zone_b_accessway_ne2c_l2
    level: 2
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2b_l2
      south: horizon_residential_zone_b_accessway_ne2d_l2
      east: horizon_residential_zone_b_residence_b2_ne2_c_e
      west: horizon_residential_zone_b_residence_b2_ne2_c_w
  - id: horizon_residential_zone_b_residence_b2_ne2_c_e
    level: 2
    name: "Residence B2-NE2-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2c_l2
  - id: horizon_residential_zone_b_residence_b2_ne2_c_w
    level: 2
    name: "Residence B2-NE2-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2c_l2
  - id: horizon_residential_zone_b_accessway_ne2d_l2
    level: 2
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2c_l2
      south: horizon_residential_zone_b_accessway_ne2e_l2
      east: horizon_residential_zone_b_residence_b2_ne2_d_e
      west: horizon_residential_zone_b_residence_b2_ne2_d_w
  - id: horizon_residential_zone_b_residence_b2_ne2_d_e
    level: 2
    name: "Residence B2-NE2-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2d_l2
  - id: horizon_residential_zone_b_residence_b2_ne2_d_w
    level: 2
    name: "Residence B2-NE2-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2d_l2
  - id: horizon_residential_zone_b_accessway_ne2e_l2
    level: 2
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2d_l2
      south: horizon_residential_zone_b_accessway_ne2f_l2
      east: horizon_residential_zone_b_residence_b2_ne2_e_e
      west: horizon_residential_zone_b_residence_b2_ne2_e_w
  - id: horizon_residential_zone_b_residence_b2_ne2_e_e
    level: 2
    name: "Residence B2-NE2-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2e_l2
  - id: horizon_residential_zone_b_residence_b2_ne2_e_w
    level: 2
    name: "Residence B2-NE2-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2e_l2
  - id: horizon_residential_zone_b_accessway_ne2f_l2
    level: 2
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2e_l2
      south: horizon_residential_zone_b_accessway_ne2g_l2
      east: horizon_residential_zone_b_residence_b2_ne2_f_e
      west: horizon_residential_zone_b_residence_b2_ne2_f_w
  - id: horizon_residential_zone_b_residence_b2_ne2_f_e
    level: 2
    name: "Residence B2-NE2-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2f_l2
  - id: horizon_residential_zone_b_residence_b2_ne2_f_w
    level: 2
    name: "Residence B2-NE2-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2f_l2
  - id: horizon_residential_zone_b_accessway_ne2g_l2
    level: 2
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2f_l2
      east: horizon_residential_zone_b_residence_b2_ne2_g_e
      west: horizon_residential_zone_b_residence_b2_ne2_g_w
  - id: horizon_residential_zone_b_residence_b2_ne2_g_e
    level: 2
    name: "Residence B2-NE2-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2g_l2
  - id: horizon_residential_zone_b_residence_b2_ne2_g_w
    level: 2
    name: "Residence B2-NE2-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2g_l2
  - id: horizon_residential_zone_b_accessway_ne3_l2
    level: 2
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east3_l2
      south: horizon_residential_zone_b_accessway_ne3a_l2
      east: horizon_residential_zone_b_residence_b2_ne3_e
      west: horizon_residential_zone_b_residence_b2_ne3_w
  - id: horizon_residential_zone_b_residence_b2_ne3_e
    level: 2
    name: "Residence B2-NE3-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3_l2
  - id: horizon_residential_zone_b_residence_b2_ne3_w
    level: 2
    name: "Residence B2-NE3-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3_l2
  - id: horizon_residential_zone_b_accessway_ne3a_l2
    level: 2
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3_l2
      south: horizon_residential_zone_b_accessway_ne3b_l2
      east: horizon_residential_zone_b_residence_b2_ne3_a_e
      west: horizon_residential_zone_b_residence_b2_ne3_a_w
  - id: horizon_residential_zone_b_residence_b2_ne3_a_e
    level: 2
    name: "Residence B2-NE3-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3a_l2
  - id: horizon_residential_zone_b_residence_b2_ne3_a_w
    level: 2
    name: "Residence B2-NE3-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3a_l2
  - id: horizon_residential_zone_b_accessway_ne3b_l2
    level: 2
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3a_l2
      south: horizon_residential_zone_b_accessway_ne3c_l2
      east: horizon_residential_zone_b_residence_b2_ne3_b_e
      west: horizon_residential_zone_b_residence_b2_ne3_b_w
  - id: horizon_residential_zone_b_residence_b2_ne3_b_e
    level: 2
    name: "Residence B2-NE3-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3b_l2
  - id: horizon_residential_zone_b_residence_b2_ne3_b_w
    level: 2
    name: "Residence B2-NE3-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3b_l2
  - id: horizon_residential_zone_b_accessway_ne3c_l2
    level: 2
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3b_l2
      south: horizon_residential_zone_b_accessway_ne3d_l2
      east: horizon_residential_zone_b_residence_b2_ne3_c_e
      west: horizon_residential_zone_b_residence_b2_ne3_c_w
  - id: horizon_residential_zone_b_residence_b2_ne3_c_e
    level: 2
    name: "Residence B2-NE3-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3c_l2
  - id: horizon_residential_zone_b_residence_b2_ne3_c_w
    level: 2
    name: "Residence B2-NE3-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3c_l2
  - id: horizon_residential_zone_b_accessway_ne3d_l2
    level: 2
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3c_l2
      south: horizon_residential_zone_b_accessway_ne3e_l2
      east: horizon_residential_zone_b_residence_b2_ne3_d_e
      west: horizon_residential_zone_b_residence_b2_ne3_d_w
  - id: horizon_residential_zone_b_residence_b2_ne3_d_e
    level: 2
    name: "Residence B2-NE3-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3d_l2
  - id: horizon_residential_zone_b_residence_b2_ne3_d_w
    level: 2
    name: "Residence B2-NE3-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3d_l2
  - id: horizon_residential_zone_b_accessway_ne3e_l2
    level: 2
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3d_l2
      south: horizon_residential_zone_b_accessway_ne3f_l2
      east: horizon_residential_zone_b_residence_b2_ne3_e_e
      west: horizon_residential_zone_b_residence_b2_ne3_e_w
  - id: horizon_residential_zone_b_residence_b2_ne3_e_e
    level: 2
    name: "Residence B2-NE3-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3e_l2
  - id: horizon_residential_zone_b_residence_b2_ne3_e_w
    level: 2
    name: "Residence B2-NE3-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3e_l2
  - id: horizon_residential_zone_b_accessway_ne3f_l2
    level: 2
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3e_l2
      south: horizon_residential_zone_b_accessway_ne3g_l2
      east: horizon_residential_zone_b_residence_b2_ne3_f_e
      west: horizon_residential_zone_b_residence_b2_ne3_f_w
  - id: horizon_residential_zone_b_residence_b2_ne3_f_e
    level: 2
    name: "Residence B2-NE3-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3f_l2
  - id: horizon_residential_zone_b_residence_b2_ne3_f_w
    level: 2
    name: "Residence B2-NE3-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3f_l2
  - id: horizon_residential_zone_b_accessway_ne3g_l2
    level: 2
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3f_l2
      east: horizon_residential_zone_b_residence_b2_ne3_g_e
      west: horizon_residential_zone_b_residence_b2_ne3_g_w
  - id: horizon_residential_zone_b_residence_b2_ne3_g_e
    level: 2
    name: "Residence B2-NE3-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3g_l2
  - id: horizon_residential_zone_b_residence_b2_ne3_g_w
    level: 2
    name: "Residence B2-NE3-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3g_l2
  - id: horizon_residential_zone_b_accessway_ne4_l2
    level: 2
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east4_l2
      south: horizon_residential_zone_b_accessway_ne4a_l2
      east: horizon_residential_zone_b_residence_b2_ne4_e
      west: horizon_residential_zone_b_residence_b2_ne4_w
  - id: horizon_residential_zone_b_residence_b2_ne4_e
    level: 2
    name: "Residence B2-NE4-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4_l2
  - id: horizon_residential_zone_b_residence_b2_ne4_w
    level: 2
    name: "Residence B2-NE4-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4_l2
  - id: horizon_residential_zone_b_accessway_ne4a_l2
    level: 2
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4_l2
      south: horizon_residential_zone_b_accessway_ne4b_l2
      east: horizon_residential_zone_b_residence_b2_ne4_a_e
      west: horizon_residential_zone_b_residence_b2_ne4_a_w
  - id: horizon_residential_zone_b_residence_b2_ne4_a_e
    level: 2
    name: "Residence B2-NE4-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4a_l2
  - id: horizon_residential_zone_b_residence_b2_ne4_a_w
    level: 2
    name: "Residence B2-NE4-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4a_l2
  - id: horizon_residential_zone_b_accessway_ne4b_l2
    level: 2
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4a_l2
      south: horizon_residential_zone_b_accessway_ne4c_l2
      east: horizon_residential_zone_b_residence_b2_ne4_b_e
      west: horizon_residential_zone_b_residence_b2_ne4_b_w
  - id: horizon_residential_zone_b_residence_b2_ne4_b_e
    level: 2
    name: "Residence B2-NE4-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4b_l2
  - id: horizon_residential_zone_b_residence_b2_ne4_b_w
    level: 2
    name: "Residence B2-NE4-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4b_l2
  - id: horizon_residential_zone_b_accessway_ne4c_l2
    level: 2
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4b_l2
      south: horizon_residential_zone_b_accessway_ne4d_l2
      east: horizon_residential_zone_b_residence_b2_ne4_c_e
      west: horizon_residential_zone_b_residence_b2_ne4_c_w
  - id: horizon_residential_zone_b_residence_b2_ne4_c_e
    level: 2
    name: "Residence B2-NE4-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4c_l2
  - id: horizon_residential_zone_b_residence_b2_ne4_c_w
    level: 2
    name: "Residence B2-NE4-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4c_l2
  - id: horizon_residential_zone_b_accessway_ne4d_l2
    level: 2
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4c_l2
      south: horizon_residential_zone_b_accessway_ne4e_l2
      east: horizon_residential_zone_b_residence_b2_ne4_d_e
      west: horizon_residential_zone_b_residence_b2_ne4_d_w
  - id: horizon_residential_zone_b_residence_b2_ne4_d_e
    level: 2
    name: "Residence B2-NE4-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4d_l2
  - id: horizon_residential_zone_b_residence_b2_ne4_d_w
    level: 2
    name: "Residence B2-NE4-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4d_l2
  - id: horizon_residential_zone_b_accessway_ne4e_l2
    level: 2
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4d_l2
      south: horizon_residential_zone_b_accessway_ne4f_l2
      east: horizon_residential_zone_b_residence_b2_ne4_e_e
      west: horizon_residential_zone_b_residence_b2_ne4_e_w
  - id: horizon_residential_zone_b_residence_b2_ne4_e_e
    level: 2
    name: "Residence B2-NE4-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4e_l2
  - id: horizon_residential_zone_b_residence_b2_ne4_e_w
    level: 2
    name: "Residence B2-NE4-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4e_l2
  - id: horizon_residential_zone_b_accessway_ne4f_l2
    level: 2
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4e_l2
      south: horizon_residential_zone_b_accessway_ne4g_l2
      east: horizon_residential_zone_b_residence_b2_ne4_f_e
      west: horizon_residential_zone_b_residence_b2_ne4_f_w
  - id: horizon_residential_zone_b_residence_b2_ne4_f_e
    level: 2
    name: "Residence B2-NE4-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4f_l2
  - id: horizon_residential_zone_b_residence_b2_ne4_f_w
    level: 2
    name: "Residence B2-NE4-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4f_l2
  - id: horizon_residential_zone_b_accessway_ne4g_l2
    level: 2
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4f_l2
      east: horizon_residential_zone_b_residence_b2_ne4_g_e
      west: horizon_residential_zone_b_residence_b2_ne4_g_w
  - id: horizon_residential_zone_b_residence_b2_ne4_g_e
    level: 2
    name: "Residence B2-NE4-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4g_l2
  - id: horizon_residential_zone_b_residence_b2_ne4_g_w
    level: 2
    name: "Residence B2-NE4-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4g_l2
  # === LEVEL 3 ===
  - id: horizon_residential_zone_b_l3
    level: 3
    name: "Residential zone B - 3"
    exits:
      south: horizon_residential_zone_b_lift_l3
      east: horizon_residential_zone_b_northern_accessway_east_l3
      west: horizon_residential_zone_b_northern_accessway_west_l3
  - id: horizon_residential_zone_b_lift_l3
    level: 3
    name: "Residential zone B Lift"
    lift: true
    exits:
      north: horizon_residential_zone_b_l3
  - id: horizon_residential_zone_b_northern_accessway_west_l3
    level: 3
    name: "Residential zone B Northern Accessway (west) - 3"
    exits:
      south: horizon_residential_zone_b_accessway_nw1_l3
      east: horizon_residential_zone_b_l3
      west: horizon_residential_zone_b_northern_accessway_west2_l3
  - id: horizon_residential_zone_b_northern_accessway_west2_l3
    level: 3
    name: "Residential zone B Northern Accessway (west) - 3"
    exits:
      south: horizon_residential_zone_b_accessway_nw2_l3
      east: horizon_residential_zone_b_northern_accessway_west_l3
      west: horizon_residential_zone_b_northern_accessway_west3_l3
  - id: horizon_residential_zone_b_northern_accessway_west3_l3
    level: 3
    name: "Residential zone B Northern Accessway (west) - 3"
    exits:
      south: horizon_residential_zone_b_accessway_nw3_l3
      east: horizon_residential_zone_b_northern_accessway_west2_l3
      west: horizon_residential_zone_b_northern_accessway_west4_l3
  - id: horizon_residential_zone_b_northern_accessway_west4_l3
    level: 3
    name: "Residential zone B Northern Accessway (west) - 3"
    exits:
      south: horizon_residential_zone_b_accessway_nw4_l3
      east: horizon_residential_zone_b_northern_accessway_west3_l3
  - id: horizon_residential_zone_b_northern_accessway_east_l3
    level: 3
    name: "Residential zone B Northern Accessway (east) - 3"
    exits:
      south: horizon_residential_zone_b_accessway_ne1_l3
      east: horizon_residential_zone_b_northern_accessway_east2_l3
      west: horizon_residential_zone_b_l3
  - id: horizon_residential_zone_b_northern_accessway_east2_l3
    level: 3
    name: "Residential zone B Northern Accessway (east) - 3"
    exits:
      south: horizon_residential_zone_b_accessway_ne2_l3
      east: horizon_residential_zone_b_northern_accessway_east3_l3
      west: horizon_residential_zone_b_northern_accessway_east_l3
  - id: horizon_residential_zone_b_northern_accessway_east3_l3
    level: 3
    name: "Residential zone B Northern Accessway (east) - 3"
    exits:
      south: horizon_residential_zone_b_accessway_ne3_l3
      east: horizon_residential_zone_b_northern_accessway_east4_l3
      west: horizon_residential_zone_b_northern_accessway_east2_l3
  - id: horizon_residential_zone_b_northern_accessway_east4_l3
    level: 3
    name: "Residential zone B Northern Accessway (east) - 3"
    exits:
      south: horizon_residential_zone_b_accessway_ne4_l3
      west: horizon_residential_zone_b_northern_accessway_east3_l3
  - id: horizon_residential_zone_b_accessway_nw1_l3
    level: 3
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west_l3
      south: horizon_residential_zone_b_accessway_nw1a_l3
      east: horizon_residential_zone_b_residence_b3_nw1_e
      west: horizon_residential_zone_b_residence_b3_nw1_w
  - id: horizon_residential_zone_b_residence_b3_nw1_e
    level: 3
    name: "Residence B3-NW1-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1_l3
  - id: horizon_residential_zone_b_residence_b3_nw1_w
    level: 3
    name: "Residence B3-NW1-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1_l3
  - id: horizon_residential_zone_b_accessway_nw1a_l3
    level: 3
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1_l3
      south: horizon_residential_zone_b_accessway_nw1b_l3
      east: horizon_residential_zone_b_residence_b3_nw1_a_e
      west: horizon_residential_zone_b_residence_b3_nw1_a_w
  - id: horizon_residential_zone_b_residence_b3_nw1_a_e
    level: 3
    name: "Residence B3-NW1-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1a_l3
  - id: horizon_residential_zone_b_residence_b3_nw1_a_w
    level: 3
    name: "Residence B3-NW1-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1a_l3
  - id: horizon_residential_zone_b_accessway_nw1b_l3
    level: 3
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1a_l3
      south: horizon_residential_zone_b_accessway_nw1c_l3
      east: horizon_residential_zone_b_residence_b3_nw1_b_e
      west: horizon_residential_zone_b_residence_b3_nw1_b_w
  - id: horizon_residential_zone_b_residence_b3_nw1_b_e
    level: 3
    name: "Residence B3-NW1-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1b_l3
  - id: horizon_residential_zone_b_residence_b3_nw1_b_w
    level: 3
    name: "Residence B3-NW1-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1b_l3
  - id: horizon_residential_zone_b_accessway_nw1c_l3
    level: 3
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1b_l3
      south: horizon_residential_zone_b_accessway_nw1d_l3
      east: horizon_residential_zone_b_residence_b3_nw1_c_e
      west: horizon_residential_zone_b_residence_b3_nw1_c_w
  - id: horizon_residential_zone_b_residence_b3_nw1_c_e
    level: 3
    name: "Residence B3-NW1-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1c_l3
  - id: horizon_residential_zone_b_residence_b3_nw1_c_w
    level: 3
    name: "Residence B3-NW1-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1c_l3
  - id: horizon_residential_zone_b_accessway_nw1d_l3
    level: 3
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1c_l3
      south: horizon_residential_zone_b_accessway_nw1e_l3
      east: horizon_residential_zone_b_residence_b3_nw1_d_e
      west: horizon_residential_zone_b_residence_b3_nw1_d_w
  - id: horizon_residential_zone_b_residence_b3_nw1_d_e
    level: 3
    name: "Residence B3-NW1-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1d_l3
  - id: horizon_residential_zone_b_residence_b3_nw1_d_w
    level: 3
    name: "Residence B3-NW1-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1d_l3
  - id: horizon_residential_zone_b_accessway_nw1e_l3
    level: 3
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1d_l3
      south: horizon_residential_zone_b_accessway_nw1f_l3
      east: horizon_residential_zone_b_residence_b3_nw1_e_e
      west: horizon_residential_zone_b_residence_b3_nw1_e_w
  - id: horizon_residential_zone_b_residence_b3_nw1_e_e
    level: 3
    name: "Residence B3-NW1-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1e_l3
  - id: horizon_residential_zone_b_residence_b3_nw1_e_w
    level: 3
    name: "Residence B3-NW1-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1e_l3
  - id: horizon_residential_zone_b_accessway_nw1f_l3
    level: 3
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1e_l3
      south: horizon_residential_zone_b_accessway_nw1g_l3
      east: horizon_residential_zone_b_residence_b3_nw1_f_e
      west: horizon_residential_zone_b_residence_b3_nw1_f_w
  - id: horizon_residential_zone_b_residence_b3_nw1_f_e
    level: 3
    name: "Residence B3-NW1-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1f_l3
  - id: horizon_residential_zone_b_residence_b3_nw1_f_w
    level: 3
    name: "Residence B3-NW1-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1f_l3
  - id: horizon_residential_zone_b_accessway_nw1g_l3
    level: 3
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1f_l3
      east: horizon_residential_zone_b_residence_b3_nw1_g_e
      west: horizon_residential_zone_b_residence_b3_nw1_g_w
  - id: horizon_residential_zone_b_residence_b3_nw1_g_e
    level: 3
    name: "Residence B3-NW1-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1g_l3
  - id: horizon_residential_zone_b_residence_b3_nw1_g_w
    level: 3
    name: "Residence B3-NW1-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1g_l3
  - id: horizon_residential_zone_b_accessway_nw2_l3
    level: 3
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west2_l3
      south: horizon_residential_zone_b_accessway_nw2a_l3
      east: horizon_residential_zone_b_residence_b3_nw2_e
      west: horizon_residential_zone_b_residence_b3_nw2_w
  - id: horizon_residential_zone_b_residence_b3_nw2_e
    level: 3
    name: "Residence B3-NW2-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2_l3
  - id: horizon_residential_zone_b_residence_b3_nw2_w
    level: 3
    name: "Residence B3-NW2-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2_l3
  - id: horizon_residential_zone_b_accessway_nw2a_l3
    level: 3
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2_l3
      south: horizon_residential_zone_b_accessway_nw2b_l3
      east: horizon_residential_zone_b_residence_b3_nw2_a_e
      west: horizon_residential_zone_b_residence_b3_nw2_a_w
  - id: horizon_residential_zone_b_residence_b3_nw2_a_e
    level: 3
    name: "Residence B3-NW2-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2a_l3
  - id: horizon_residential_zone_b_residence_b3_nw2_a_w
    level: 3
    name: "Residence B3-NW2-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2a_l3
  - id: horizon_residential_zone_b_accessway_nw2b_l3
    level: 3
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2a_l3
      south: horizon_residential_zone_b_accessway_nw2c_l3
      east: horizon_residential_zone_b_residence_b3_nw2_b_e
      west: horizon_residential_zone_b_residence_b3_nw2_b_w
  - id: horizon_residential_zone_b_residence_b3_nw2_b_e
    level: 3
    name: "Residence B3-NW2-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2b_l3
  - id: horizon_residential_zone_b_residence_b3_nw2_b_w
    level: 3
    name: "Residence B3-NW2-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2b_l3
  - id: horizon_residential_zone_b_accessway_nw2c_l3
    level: 3
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2b_l3
      south: horizon_residential_zone_b_accessway_nw2d_l3
      east: horizon_residential_zone_b_residence_b3_nw2_c_e
      west: horizon_residential_zone_b_residence_b3_nw2_c_w
  - id: horizon_residential_zone_b_residence_b3_nw2_c_e
    level: 3
    name: "Residence B3-NW2-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2c_l3
  - id: horizon_residential_zone_b_residence_b3_nw2_c_w
    level: 3
    name: "Residence B3-NW2-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2c_l3
  - id: horizon_residential_zone_b_accessway_nw2d_l3
    level: 3
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2c_l3
      south: horizon_residential_zone_b_accessway_nw2e_l3
      east: horizon_residential_zone_b_residence_b3_nw2_d_e
      west: horizon_residential_zone_b_residence_b3_nw2_d_w
  - id: horizon_residential_zone_b_residence_b3_nw2_d_e
    level: 3
    name: "Residence B3-NW2-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2d_l3
  - id: horizon_residential_zone_b_residence_b3_nw2_d_w
    level: 3
    name: "Residence B3-NW2-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2d_l3
  - id: horizon_residential_zone_b_accessway_nw2e_l3
    level: 3
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2d_l3
      south: horizon_residential_zone_b_accessway_nw2f_l3
      east: horizon_residential_zone_b_residence_b3_nw2_e_e
      west: horizon_residential_zone_b_residence_b3_nw2_e_w
  - id: horizon_residential_zone_b_residence_b3_nw2_e_e
    level: 3
    name: "Residence B3-NW2-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2e_l3
  - id: horizon_residential_zone_b_residence_b3_nw2_e_w
    level: 3
    name: "Residence B3-NW2-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2e_l3
  - id: horizon_residential_zone_b_accessway_nw2f_l3
    level: 3
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2e_l3
      south: horizon_residential_zone_b_accessway_nw2g_l3
      east: horizon_residential_zone_b_residence_b3_nw2_f_e
      west: horizon_residential_zone_b_residence_b3_nw2_f_w
  - id: horizon_residential_zone_b_residence_b3_nw2_f_e
    level: 3
    name: "Residence B3-NW2-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2f_l3
  - id: horizon_residential_zone_b_residence_b3_nw2_f_w
    level: 3
    name: "Residence B3-NW2-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2f_l3
  - id: horizon_residential_zone_b_accessway_nw2g_l3
    level: 3
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2f_l3
      east: horizon_residential_zone_b_residence_b3_nw2_g_e
      west: horizon_residential_zone_b_residence_b3_nw2_g_w
  - id: horizon_residential_zone_b_residence_b3_nw2_g_e
    level: 3
    name: "Residence B3-NW2-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2g_l3
  - id: horizon_residential_zone_b_residence_b3_nw2_g_w
    level: 3
    name: "Residence B3-NW2-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2g_l3
  - id: horizon_residential_zone_b_accessway_nw3_l3
    level: 3
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west3_l3
      south: horizon_residential_zone_b_accessway_nw3a_l3
      east: horizon_residential_zone_b_residence_b3_nw3_e
      west: horizon_residential_zone_b_residence_b3_nw3_w
  - id: horizon_residential_zone_b_residence_b3_nw3_e
    level: 3
    name: "Residence B3-NW3-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3_l3
  - id: horizon_residential_zone_b_residence_b3_nw3_w
    level: 3
    name: "Residence B3-NW3-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3_l3
  - id: horizon_residential_zone_b_accessway_nw3a_l3
    level: 3
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3_l3
      south: horizon_residential_zone_b_accessway_nw3b_l3
      east: horizon_residential_zone_b_residence_b3_nw3_a_e
      west: horizon_residential_zone_b_residence_b3_nw3_a_w
  - id: horizon_residential_zone_b_residence_b3_nw3_a_e
    level: 3
    name: "Residence B3-NW3-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3a_l3
  - id: horizon_residential_zone_b_residence_b3_nw3_a_w
    level: 3
    name: "Residence B3-NW3-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3a_l3
  - id: horizon_residential_zone_b_accessway_nw3b_l3
    level: 3
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3a_l3
      south: horizon_residential_zone_b_accessway_nw3c_l3
      east: horizon_residential_zone_b_residence_b3_nw3_b_e
      west: horizon_residential_zone_b_residence_b3_nw3_b_w
  - id: horizon_residential_zone_b_residence_b3_nw3_b_e
    level: 3
    name: "Residence B3-NW3-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3b_l3
  - id: horizon_residential_zone_b_residence_b3_nw3_b_w
    level: 3
    name: "Residence B3-NW3-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3b_l3
  - id: horizon_residential_zone_b_accessway_nw3c_l3
    level: 3
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3b_l3
      south: horizon_residential_zone_b_accessway_nw3d_l3
      east: horizon_residential_zone_b_residence_b3_nw3_c_e
      west: horizon_residential_zone_b_residence_b3_nw3_c_w
  - id: horizon_residential_zone_b_residence_b3_nw3_c_e
    level: 3
    name: "Residence B3-NW3-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3c_l3
  - id: horizon_residential_zone_b_residence_b3_nw3_c_w
    level: 3
    name: "Residence B3-NW3-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3c_l3
  - id: horizon_residential_zone_b_accessway_nw3d_l3
    level: 3
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3c_l3
      south: horizon_residential_zone_b_accessway_nw3e_l3
      east: horizon_residential_zone_b_residence_b3_nw3_d_e
      west: horizon_residential_zone_b_residence_b3_nw3_d_w
  - id: horizon_residential_zone_b_residence_b3_nw3_d_e
    level: 3
    name: "Residence B3-NW3-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3d_l3
  - id: horizon_residential_zone_b_residence_b3_nw3_d_w
    level: 3
    name: "Residence B3-NW3-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3d_l3
  - id: horizon_residential_zone_b_accessway_nw3e_l3
    level: 3
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3d_l3
      south: horizon_residential_zone_b_accessway_nw3f_l3
      east: horizon_residential_zone_b_residence_b3_nw3_e_e
      west: horizon_residential_zone_b_residence_b3_nw3_e_w
  - id: horizon_residential_zone_b_residence_b3_nw3_e_e
    level: 3
    name: "Residence B3-NW3-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3e_l3
  - id: horizon_residential_zone_b_residence_b3_nw3_e_w
    level: 3
    name: "Residence B3-NW3-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3e_l3
  - id: horizon_residential_zone_b_accessway_nw3f_l3
    level: 3
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3e_l3
      south: horizon_residential_zone_b_accessway_nw3g_l3
      east: horizon_residential_zone_b_residence_b3_nw3_f_e
      west: horizon_residential_zone_b_residence_b3_nw3_f_w
  - id: horizon_residential_zone_b_residence_b3_nw3_f_e
    level: 3
    name: "Residence B3-NW3-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3f_l3
  - id: horizon_residential_zone_b_residence_b3_nw3_f_w
    level: 3
    name: "Residence B3-NW3-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3f_l3
  - id: horizon_residential_zone_b_accessway_nw3g_l3
    level: 3
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3f_l3
      east: horizon_residential_zone_b_residence_b3_nw3_g_e
      west: horizon_residential_zone_b_residence_b3_nw3_g_w
  - id: horizon_residential_zone_b_residence_b3_nw3_g_e
    level: 3
    name: "Residence B3-NW3-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3g_l3
  - id: horizon_residential_zone_b_residence_b3_nw3_g_w
    level: 3
    name: "Residence B3-NW3-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3g_l3
  - id: horizon_residential_zone_b_accessway_nw4_l3
    level: 3
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west4_l3
      south: horizon_residential_zone_b_accessway_nw4a_l3
      east: horizon_residential_zone_b_residence_b3_nw4_e
      west: horizon_residential_zone_b_residence_b3_nw4_w
  - id: horizon_residential_zone_b_residence_b3_nw4_e
    level: 3
    name: "Residence B3-NW4-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4_l3
  - id: horizon_residential_zone_b_residence_b3_nw4_w
    level: 3
    name: "Residence B3-NW4-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4_l3
  - id: horizon_residential_zone_b_accessway_nw4a_l3
    level: 3
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4_l3
      south: horizon_residential_zone_b_accessway_nw4b_l3
      east: horizon_residential_zone_b_residence_b3_nw4_a_e
      west: horizon_residential_zone_b_residence_b3_nw4_a_w
  - id: horizon_residential_zone_b_residence_b3_nw4_a_e
    level: 3
    name: "Residence B3-NW4-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4a_l3
  - id: horizon_residential_zone_b_residence_b3_nw4_a_w
    level: 3
    name: "Residence B3-NW4-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4a_l3
  - id: horizon_residential_zone_b_accessway_nw4b_l3
    level: 3
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4a_l3
      south: horizon_residential_zone_b_accessway_nw4c_l3
      east: horizon_residential_zone_b_residence_b3_nw4_b_e
      west: horizon_residential_zone_b_residence_b3_nw4_b_w
  - id: horizon_residential_zone_b_residence_b3_nw4_b_e
    level: 3
    name: "Residence B3-NW4-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4b_l3
  - id: horizon_residential_zone_b_residence_b3_nw4_b_w
    level: 3
    name: "Residence B3-NW4-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4b_l3
  - id: horizon_residential_zone_b_accessway_nw4c_l3
    level: 3
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4b_l3
      south: horizon_residential_zone_b_accessway_nw4d_l3
      east: horizon_residential_zone_b_residence_b3_nw4_c_e
      west: horizon_residential_zone_b_residence_b3_nw4_c_w
  - id: horizon_residential_zone_b_residence_b3_nw4_c_e
    level: 3
    name: "Residence B3-NW4-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4c_l3
  - id: horizon_residential_zone_b_residence_b3_nw4_c_w
    level: 3
    name: "Residence B3-NW4-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4c_l3
  - id: horizon_residential_zone_b_accessway_nw4d_l3
    level: 3
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4c_l3
      south: horizon_residential_zone_b_accessway_nw4e_l3
      east: horizon_residential_zone_b_residence_b3_nw4_d_e
      west: horizon_residential_zone_b_residence_b3_nw4_d_w
  - id: horizon_residential_zone_b_residence_b3_nw4_d_e
    level: 3
    name: "Residence B3-NW4-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4d_l3
  - id: horizon_residential_zone_b_residence_b3_nw4_d_w
    level: 3
    name: "Residence B3-NW4-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4d_l3
  - id: horizon_residential_zone_b_accessway_nw4e_l3
    level: 3
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4d_l3
      south: horizon_residential_zone_b_accessway_nw4f_l3
      east: horizon_residential_zone_b_residence_b3_nw4_e_e
      west: horizon_residential_zone_b_residence_b3_nw4_e_w
  - id: horizon_residential_zone_b_residence_b3_nw4_e_e
    level: 3
    name: "Residence B3-NW4-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4e_l3
  - id: horizon_residential_zone_b_residence_b3_nw4_e_w
    level: 3
    name: "Residence B3-NW4-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4e_l3
  - id: horizon_residential_zone_b_accessway_nw4f_l3
    level: 3
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4e_l3
      south: horizon_residential_zone_b_accessway_nw4g_l3
      east: horizon_residential_zone_b_residence_b3_nw4_f_e
      west: horizon_residential_zone_b_residence_b3_nw4_f_w
  - id: horizon_residential_zone_b_residence_b3_nw4_f_e
    level: 3
    name: "Residence B3-NW4-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4f_l3
  - id: horizon_residential_zone_b_residence_b3_nw4_f_w
    level: 3
    name: "Residence B3-NW4-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4f_l3
  - id: horizon_residential_zone_b_accessway_nw4g_l3
    level: 3
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4f_l3
      east: horizon_residential_zone_b_residence_b3_nw4_g_e
      west: horizon_residential_zone_b_residence_b3_nw4_g_w
  - id: horizon_residential_zone_b_residence_b3_nw4_g_e
    level: 3
    name: "Residence B3-NW4-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4g_l3
  - id: horizon_residential_zone_b_residence_b3_nw4_g_w
    level: 3
    name: "Residence B3-NW4-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4g_l3
  - id: horizon_residential_zone_b_accessway_ne1_l3
    level: 3
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east_l3
      south: horizon_residential_zone_b_accessway_ne1a_l3
      east: horizon_residential_zone_b_residence_b3_ne1_e
      west: horizon_residential_zone_b_residence_b3_ne1_w
  - id: horizon_residential_zone_b_residence_b3_ne1_e
    level: 3
    name: "Residence B3-NE1-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1_l3
  - id: horizon_residential_zone_b_residence_b3_ne1_w
    level: 3
    name: "Residence B3-NE1-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1_l3
  - id: horizon_residential_zone_b_accessway_ne1a_l3
    level: 3
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1_l3
      south: horizon_residential_zone_b_accessway_ne1b_l3
      east: horizon_residential_zone_b_residence_b3_ne1_a_e
      west: horizon_residential_zone_b_residence_b3_ne1_a_w
  - id: horizon_residential_zone_b_residence_b3_ne1_a_e
    level: 3
    name: "Residence B3-NE1-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1a_l3
  - id: horizon_residential_zone_b_residence_b3_ne1_a_w
    level: 3
    name: "Residence B3-NE1-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1a_l3
  - id: horizon_residential_zone_b_accessway_ne1b_l3
    level: 3
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1a_l3
      south: horizon_residential_zone_b_accessway_ne1c_l3
      east: horizon_residential_zone_b_residence_b3_ne1_b_e
      west: horizon_residential_zone_b_residence_b3_ne1_b_w
  - id: horizon_residential_zone_b_residence_b3_ne1_b_e
    level: 3
    name: "Residence B3-NE1-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1b_l3
  - id: horizon_residential_zone_b_residence_b3_ne1_b_w
    level: 3
    name: "Residence B3-NE1-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1b_l3
  - id: horizon_residential_zone_b_accessway_ne1c_l3
    level: 3
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1b_l3
      south: horizon_residential_zone_b_accessway_ne1d_l3
      east: horizon_residential_zone_b_residence_b3_ne1_c_e
      west: horizon_residential_zone_b_residence_b3_ne1_c_w
  - id: horizon_residential_zone_b_residence_b3_ne1_c_e
    level: 3
    name: "Residence B3-NE1-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1c_l3
  - id: horizon_residential_zone_b_residence_b3_ne1_c_w
    level: 3
    name: "Residence B3-NE1-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1c_l3
  - id: horizon_residential_zone_b_accessway_ne1d_l3
    level: 3
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1c_l3
      south: horizon_residential_zone_b_accessway_ne1e_l3
      east: horizon_residential_zone_b_residence_b3_ne1_d_e
      west: horizon_residential_zone_b_residence_b3_ne1_d_w
  - id: horizon_residential_zone_b_residence_b3_ne1_d_e
    level: 3
    name: "Residence B3-NE1-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1d_l3
  - id: horizon_residential_zone_b_residence_b3_ne1_d_w
    level: 3
    name: "Residence B3-NE1-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1d_l3
  - id: horizon_residential_zone_b_accessway_ne1e_l3
    level: 3
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1d_l3
      south: horizon_residential_zone_b_accessway_ne1f_l3
      east: horizon_residential_zone_b_residence_b3_ne1_e_e
      west: horizon_residential_zone_b_residence_b3_ne1_e_w
  - id: horizon_residential_zone_b_residence_b3_ne1_e_e
    level: 3
    name: "Residence B3-NE1-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1e_l3
  - id: horizon_residential_zone_b_residence_b3_ne1_e_w
    level: 3
    name: "Residence B3-NE1-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1e_l3
  - id: horizon_residential_zone_b_accessway_ne1f_l3
    level: 3
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1e_l3
      south: horizon_residential_zone_b_accessway_ne1g_l3
      east: horizon_residential_zone_b_residence_b3_ne1_f_e
      west: horizon_residential_zone_b_residence_b3_ne1_f_w
  - id: horizon_residential_zone_b_residence_b3_ne1_f_e
    level: 3
    name: "Residence B3-NE1-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1f_l3
  - id: horizon_residential_zone_b_residence_b3_ne1_f_w
    level: 3
    name: "Residence B3-NE1-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1f_l3
  - id: horizon_residential_zone_b_accessway_ne1g_l3
    level: 3
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1f_l3
      east: horizon_residential_zone_b_residence_b3_ne1_g_e
      west: horizon_residential_zone_b_residence_b3_ne1_g_w
  - id: horizon_residential_zone_b_residence_b3_ne1_g_e
    level: 3
    name: "Residence B3-NE1-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1g_l3
  - id: horizon_residential_zone_b_residence_b3_ne1_g_w
    level: 3
    name: "Residence B3-NE1-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1g_l3
  - id: horizon_residential_zone_b_accessway_ne2_l3
    level: 3
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east2_l3
      south: horizon_residential_zone_b_accessway_ne2a_l3
      east: horizon_residential_zone_b_residence_b3_ne2_e
      west: horizon_residential_zone_b_residence_b3_ne2_w
  - id: horizon_residential_zone_b_residence_b3_ne2_e
    level: 3
    name: "Residence B3-NE2-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2_l3
  - id: horizon_residential_zone_b_residence_b3_ne2_w
    level: 3
    name: "Residence B3-NE2-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2_l3
  - id: horizon_residential_zone_b_accessway_ne2a_l3
    level: 3
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2_l3
      south: horizon_residential_zone_b_accessway_ne2b_l3
      east: horizon_residential_zone_b_residence_b3_ne2_a_e
      west: horizon_residential_zone_b_residence_b3_ne2_a_w
  - id: horizon_residential_zone_b_residence_b3_ne2_a_e
    level: 3
    name: "Residence B3-NE2-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2a_l3
  - id: horizon_residential_zone_b_residence_b3_ne2_a_w
    level: 3
    name: "Residence B3-NE2-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2a_l3
  - id: horizon_residential_zone_b_accessway_ne2b_l3
    level: 3
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2a_l3
      south: horizon_residential_zone_b_accessway_ne2c_l3
      east: horizon_residential_zone_b_residence_b3_ne2_b_e
      west: horizon_residential_zone_b_residence_b3_ne2_b_w
  - id: horizon_residential_zone_b_residence_b3_ne2_b_e
    level: 3
    name: "Residence B3-NE2-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2b_l3
  - id: horizon_residential_zone_b_residence_b3_ne2_b_w
    level: 3
    name: "Residence B3-NE2-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2b_l3
  - id: horizon_residential_zone_b_accessway_ne2c_l3
    level: 3
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2b_l3
      south: horizon_residential_zone_b_accessway_ne2d_l3
      east: horizon_residential_zone_b_residence_b3_ne2_c_e
      west: horizon_residential_zone_b_residence_b3_ne2_c_w
  - id: horizon_residential_zone_b_residence_b3_ne2_c_e
    level: 3
    name: "Residence B3-NE2-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2c_l3
  - id: horizon_residential_zone_b_residence_b3_ne2_c_w
    level: 3
    name: "Residence B3-NE2-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2c_l3
  - id: horizon_residential_zone_b_accessway_ne2d_l3
    level: 3
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2c_l3
      south: horizon_residential_zone_b_accessway_ne2e_l3
      east: horizon_residential_zone_b_residence_b3_ne2_d_e
      west: horizon_residential_zone_b_residence_b3_ne2_d_w
  - id: horizon_residential_zone_b_residence_b3_ne2_d_e
    level: 3
    name: "Residence B3-NE2-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2d_l3
  - id: horizon_residential_zone_b_residence_b3_ne2_d_w
    level: 3
    name: "Residence B3-NE2-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2d_l3
  - id: horizon_residential_zone_b_accessway_ne2e_l3
    level: 3
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2d_l3
      south: horizon_residential_zone_b_accessway_ne2f_l3
      east: horizon_residential_zone_b_residence_b3_ne2_e_e
      west: horizon_residential_zone_b_residence_b3_ne2_e_w
  - id: horizon_residential_zone_b_residence_b3_ne2_e_e
    level: 3
    name: "Residence B3-NE2-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2e_l3
  - id: horizon_residential_zone_b_residence_b3_ne2_e_w
    level: 3
    name: "Residence B3-NE2-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2e_l3
  - id: horizon_residential_zone_b_accessway_ne2f_l3
    level: 3
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2e_l3
      south: horizon_residential_zone_b_accessway_ne2g_l3
      east: horizon_residential_zone_b_residence_b3_ne2_f_e
      west: horizon_residential_zone_b_residence_b3_ne2_f_w
  - id: horizon_residential_zone_b_residence_b3_ne2_f_e
    level: 3
    name: "Residence B3-NE2-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2f_l3
  - id: horizon_residential_zone_b_residence_b3_ne2_f_w
    level: 3
    name: "Residence B3-NE2-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2f_l3
  - id: horizon_residential_zone_b_accessway_ne2g_l3
    level: 3
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2f_l3
      east: horizon_residential_zone_b_residence_b3_ne2_g_e
      west: horizon_residential_zone_b_residence_b3_ne2_g_w
  - id: horizon_residential_zone_b_residence_b3_ne2_g_e
    level: 3
    name: "Residence B3-NE2-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2g_l3
  - id: horizon_residential_zone_b_residence_b3_ne2_g_w
    level: 3
    name: "Residence B3-NE2-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2g_l3
  - id: horizon_residential_zone_b_accessway_ne3_l3
    level: 3
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east3_l3
      south: horizon_residential_zone_b_accessway_ne3a_l3
      east: horizon_residential_zone_b_residence_b3_ne3_e
      west: horizon_residential_zone_b_residence_b3_ne3_w
  - id: horizon_residential_zone_b_residence_b3_ne3_e
    level: 3
    name: "Residence B3-NE3-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3_l3
  - id: horizon_residential_zone_b_residence_b3_ne3_w
    level: 3
    name: "Residence B3-NE3-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3_l3
  - id: horizon_residential_zone_b_accessway_ne3a_l3
    level: 3
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3_l3
      south: horizon_residential_zone_b_accessway_ne3b_l3
      east: horizon_residential_zone_b_residence_b3_ne3_a_e
      west: horizon_residential_zone_b_residence_b3_ne3_a_w
  - id: horizon_residential_zone_b_residence_b3_ne3_a_e
    level: 3
    name: "Residence B3-NE3-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3a_l3
  - id: horizon_residential_zone_b_residence_b3_ne3_a_w
    level: 3
    name: "Residence B3-NE3-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3a_l3
  - id: horizon_residential_zone_b_accessway_ne3b_l3
    level: 3
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3a_l3
      south: horizon_residential_zone_b_accessway_ne3c_l3
      east: horizon_residential_zone_b_residence_b3_ne3_b_e
      west: horizon_residential_zone_b_residence_b3_ne3_b_w
  - id: horizon_residential_zone_b_residence_b3_ne3_b_e
    level: 3
    name: "Residence B3-NE3-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3b_l3
  - id: horizon_residential_zone_b_residence_b3_ne3_b_w
    level: 3
    name: "Residence B3-NE3-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3b_l3
  - id: horizon_residential_zone_b_accessway_ne3c_l3
    level: 3
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3b_l3
      south: horizon_residential_zone_b_accessway_ne3d_l3
      east: horizon_residential_zone_b_residence_b3_ne3_c_e
      west: horizon_residential_zone_b_residence_b3_ne3_c_w
  - id: horizon_residential_zone_b_residence_b3_ne3_c_e
    level: 3
    name: "Residence B3-NE3-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3c_l3
  - id: horizon_residential_zone_b_residence_b3_ne3_c_w
    level: 3
    name: "Residence B3-NE3-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3c_l3
  - id: horizon_residential_zone_b_accessway_ne3d_l3
    level: 3
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3c_l3
      south: horizon_residential_zone_b_accessway_ne3e_l3
      east: horizon_residential_zone_b_residence_b3_ne3_d_e
      west: horizon_residential_zone_b_residence_b3_ne3_d_w
  - id: horizon_residential_zone_b_residence_b3_ne3_d_e
    level: 3
    name: "Residence B3-NE3-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3d_l3
  - id: horizon_residential_zone_b_residence_b3_ne3_d_w
    level: 3
    name: "Residence B3-NE3-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3d_l3
  - id: horizon_residential_zone_b_accessway_ne3e_l3
    level: 3
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3d_l3
      south: horizon_residential_zone_b_accessway_ne3f_l3
      east: horizon_residential_zone_b_residence_b3_ne3_e_e
      west: horizon_residential_zone_b_residence_b3_ne3_e_w
  - id: horizon_residential_zone_b_residence_b3_ne3_e_e
    level: 3
    name: "Residence B3-NE3-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3e_l3
  - id: horizon_residential_zone_b_residence_b3_ne3_e_w
    level: 3
    name: "Residence B3-NE3-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3e_l3
  - id: horizon_residential_zone_b_accessway_ne3f_l3
    level: 3
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3e_l3
      south: horizon_residential_zone_b_accessway_ne3g_l3
      east: horizon_residential_zone_b_residence_b3_ne3_f_e
      west: horizon_residential_zone_b_residence_b3_ne3_f_w
  - id: horizon_residential_zone_b_residence_b3_ne3_f_e
    level: 3
    name: "Residence B3-NE3-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3f_l3
  - id: horizon_residential_zone_b_residence_b3_ne3_f_w
    level: 3
    name: "Residence B3-NE3-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3f_l3
  - id: horizon_residential_zone_b_accessway_ne3g_l3
    level: 3
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3f_l3
      east: horizon_residential_zone_b_residence_b3_ne3_g_e
      west: horizon_residential_zone_b_residence_b3_ne3_g_w
  - id: horizon_residential_zone_b_residence_b3_ne3_g_e
    level: 3
    name: "Residence B3-NE3-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3g_l3
  - id: horizon_residential_zone_b_residence_b3_ne3_g_w
    level: 3
    name: "Residence B3-NE3-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3g_l3
  - id: horizon_residential_zone_b_accessway_ne4_l3
    level: 3
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east4_l3
      south: horizon_residential_zone_b_accessway_ne4a_l3
      east: horizon_residential_zone_b_residence_b3_ne4_e
      west: horizon_residential_zone_b_residence_b3_ne4_w
  - id: horizon_residential_zone_b_residence_b3_ne4_e
    level: 3
    name: "Residence B3-NE4-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4_l3
  - id: horizon_residential_zone_b_residence_b3_ne4_w
    level: 3
    name: "Residence B3-NE4-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4_l3
  - id: horizon_residential_zone_b_accessway_ne4a_l3
    level: 3
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4_l3
      south: horizon_residential_zone_b_accessway_ne4b_l3
      east: horizon_residential_zone_b_residence_b3_ne4_a_e
      west: horizon_residential_zone_b_residence_b3_ne4_a_w
  - id: horizon_residential_zone_b_residence_b3_ne4_a_e
    level: 3
    name: "Residence B3-NE4-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4a_l3
  - id: horizon_residential_zone_b_residence_b3_ne4_a_w
    level: 3
    name: "Residence B3-NE4-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4a_l3
  - id: horizon_residential_zone_b_accessway_ne4b_l3
    level: 3
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4a_l3
      south: horizon_residential_zone_b_accessway_ne4c_l3
      east: horizon_residential_zone_b_residence_b3_ne4_b_e
      west: horizon_residential_zone_b_residence_b3_ne4_b_w
  - id: horizon_residential_zone_b_residence_b3_ne4_b_e
    level: 3
    name: "Residence B3-NE4-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4b_l3
  - id: horizon_residential_zone_b_residence_b3_ne4_b_w
    level: 3
    name: "Residence B3-NE4-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4b_l3
  - id: horizon_residential_zone_b_accessway_ne4c_l3
    level: 3
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4b_l3
      south: horizon_residential_zone_b_accessway_ne4d_l3
      east: horizon_residential_zone_b_residence_b3_ne4_c_e
      west: horizon_residential_zone_b_residence_b3_ne4_c_w
  - id: horizon_residential_zone_b_residence_b3_ne4_c_e
    level: 3
    name: "Residence B3-NE4-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4c_l3
  - id: horizon_residential_zone_b_residence_b3_ne4_c_w
    level: 3
    name: "Residence B3-NE4-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4c_l3
  - id: horizon_residential_zone_b_accessway_ne4d_l3
    level: 3
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4c_l3
      south: horizon_residential_zone_b_accessway_ne4e_l3
      east: horizon_residential_zone_b_residence_b3_ne4_d_e
      west: horizon_residential_zone_b_residence_b3_ne4_d_w
  - id: horizon_residential_zone_b_residence_b3_ne4_d_e
    level: 3
    name: "Residence B3-NE4-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4d_l3
  - id: horizon_residential_zone_b_residence_b3_ne4_d_w
    level: 3
    name: "Residence B3-NE4-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4d_l3
  - id: horizon_residential_zone_b_accessway_ne4e_l3
    level: 3
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4d_l3
      south: horizon_residential_zone_b_accessway_ne4f_l3
      east: horizon_residential_zone_b_residence_b3_ne4_e_e
      west: horizon_residential_zone_b_residence_b3_ne4_e_w
  - id: horizon_residential_zone_b_residence_b3_ne4_e_e
    level: 3
    name: "Residence B3-NE4-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4e_l3
  - id: horizon_residential_zone_b_residence_b3_ne4_e_w
    level: 3
    name: "Residence B3-NE4-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4e_l3
  - id: horizon_residential_zone_b_accessway_ne4f_l3
    level: 3
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4e_l3
      south: horizon_residential_zone_b_accessway_ne4g_l3
      east: horizon_residential_zone_b_residence_b3_ne4_f_e
      west: horizon_residential_zone_b_residence_b3_ne4_f_w
  - id: horizon_residential_zone_b_residence_b3_ne4_f_e
    level: 3
    name: "Residence B3-NE4-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4f_l3
  - id: horizon_residential_zone_b_residence_b3_ne4_f_w
    level: 3
    name: "Residence B3-NE4-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4f_l3
  - id: horizon_residential_zone_b_accessway_ne4g_l3
    level: 3
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4f_l3
      east: horizon_residential_zone_b_residence_b3_ne4_g_e
      west: horizon_residential_zone_b_residence_b3_ne4_g_w
  - id: horizon_residential_zone_b_residence_b3_ne4_g_e
    level: 3
    name: "Residence B3-NE4-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4g_l3
  - id: horizon_residential_zone_b_residence_b3_ne4_g_w
    level: 3
    name: "Residence B3-NE4-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4g_l3
  # === LEVEL 4 ===
  - id: horizon_residential_zone_b_l4
    level: 4
    name: "Residential zone B - 4"
    exits:
      south: horizon_residential_zone_b_lift_l4
      east: horizon_residential_zone_b_northern_accessway_east_l4
      west: horizon_residential_zone_b_northern_accessway_west_l4
  - id: horizon_residential_zone_b_lift_l4
    level: 4
    name: "Residential zone B Lift"
    lift: true
    exits:
      north: horizon_residential_zone_b_l4
  - id: horizon_residential_zone_b_northern_accessway_west_l4
    level: 4
    name: "Residential zone B Northern Accessway (west) - 4"
    exits:
      south: horizon_residential_zone_b_accessway_nw1_l4
      east: horizon_residential_zone_b_l4
      west: horizon_residential_zone_b_northern_accessway_west2_l4
  - id: horizon_residential_zone_b_northern_accessway_west2_l4
    level: 4
    name: "Residential zone B Northern Accessway (west) - 4"
    exits:
      south: horizon_residential_zone_b_accessway_nw2_l4
      east: horizon_residential_zone_b_northern_accessway_west_l4
      west: horizon_residential_zone_b_northern_accessway_west3_l4
  - id: horizon_residential_zone_b_northern_accessway_west3_l4
    level: 4
    name: "Residential zone B Northern Accessway (west) - 4"
    exits:
      south: horizon_residential_zone_b_accessway_nw3_l4
      east: horizon_residential_zone_b_northern_accessway_west2_l4
      west: horizon_residential_zone_b_northern_accessway_west4_l4
  - id: horizon_residential_zone_b_northern_accessway_west4_l4
    level: 4
    name: "Residential zone B Northern Accessway (west) - 4"
    exits:
      south: horizon_residential_zone_b_accessway_nw4_l4
      east: horizon_residential_zone_b_northern_accessway_west3_l4
  - id: horizon_residential_zone_b_northern_accessway_east_l4
    level: 4
    name: "Residential zone B Northern Accessway (east) - 4"
    exits:
      south: horizon_residential_zone_b_accessway_ne1_l4
      east: horizon_residential_zone_b_northern_accessway_east2_l4
      west: horizon_residential_zone_b_l4
  - id: horizon_residential_zone_b_northern_accessway_east2_l4
    level: 4
    name: "Residential zone B Northern Accessway (east) - 4"
    exits:
      south: horizon_residential_zone_b_accessway_ne2_l4
      east: horizon_residential_zone_b_northern_accessway_east3_l4
      west: horizon_residential_zone_b_northern_accessway_east_l4
  - id: horizon_residential_zone_b_northern_accessway_east3_l4
    level: 4
    name: "Residential zone B Northern Accessway (east) - 4"
    exits:
      south: horizon_residential_zone_b_accessway_ne3_l4
      east: horizon_residential_zone_b_northern_accessway_east4_l4
      west: horizon_residential_zone_b_northern_accessway_east2_l4
  - id: horizon_residential_zone_b_northern_accessway_east4_l4
    level: 4
    name: "Residential zone B Northern Accessway (east) - 4"
    exits:
      south: horizon_residential_zone_b_accessway_ne4_l4
      west: horizon_residential_zone_b_northern_accessway_east3_l4
  - id: horizon_residential_zone_b_accessway_nw1_l4
    level: 4
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west_l4
      south: horizon_residential_zone_b_accessway_nw1a_l4
      east: horizon_residential_zone_b_residence_b4_nw1_e
      west: horizon_residential_zone_b_residence_b4_nw1_w
  - id: horizon_residential_zone_b_residence_b4_nw1_e
    level: 4
    name: "Residence B4-NW1-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1_l4
  - id: horizon_residential_zone_b_residence_b4_nw1_w
    level: 4
    name: "Residence B4-NW1-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1_l4
  - id: horizon_residential_zone_b_accessway_nw1a_l4
    level: 4
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1_l4
      south: horizon_residential_zone_b_accessway_nw1b_l4
      east: horizon_residential_zone_b_residence_b4_nw1_a_e
      west: horizon_residential_zone_b_residence_b4_nw1_a_w
  - id: horizon_residential_zone_b_residence_b4_nw1_a_e
    level: 4
    name: "Residence B4-NW1-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1a_l4
  - id: horizon_residential_zone_b_residence_b4_nw1_a_w
    level: 4
    name: "Residence B4-NW1-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1a_l4
  - id: horizon_residential_zone_b_accessway_nw1b_l4
    level: 4
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1a_l4
      south: horizon_residential_zone_b_accessway_nw1c_l4
      east: horizon_residential_zone_b_residence_b4_nw1_b_e
      west: horizon_residential_zone_b_residence_b4_nw1_b_w
  - id: horizon_residential_zone_b_residence_b4_nw1_b_e
    level: 4
    name: "Residence B4-NW1-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1b_l4
  - id: horizon_residential_zone_b_residence_b4_nw1_b_w
    level: 4
    name: "Residence B4-NW1-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1b_l4
  - id: horizon_residential_zone_b_accessway_nw1c_l4
    level: 4
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1b_l4
      south: horizon_residential_zone_b_accessway_nw1d_l4
      east: horizon_residential_zone_b_residence_b4_nw1_c_e
      west: horizon_residential_zone_b_residence_b4_nw1_c_w
  - id: horizon_residential_zone_b_residence_b4_nw1_c_e
    level: 4
    name: "Residence B4-NW1-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1c_l4
  - id: horizon_residential_zone_b_residence_b4_nw1_c_w
    level: 4
    name: "Residence B4-NW1-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1c_l4
  - id: horizon_residential_zone_b_accessway_nw1d_l4
    level: 4
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1c_l4
      south: horizon_residential_zone_b_accessway_nw1e_l4
      east: horizon_residential_zone_b_residence_b4_nw1_d_e
      west: horizon_residential_zone_b_residence_b4_nw1_d_w
  - id: horizon_residential_zone_b_residence_b4_nw1_d_e
    level: 4
    name: "Residence B4-NW1-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1d_l4
  - id: horizon_residential_zone_b_residence_b4_nw1_d_w
    level: 4
    name: "Residence B4-NW1-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1d_l4
  - id: horizon_residential_zone_b_accessway_nw1e_l4
    level: 4
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1d_l4
      south: horizon_residential_zone_b_accessway_nw1f_l4
      east: horizon_residential_zone_b_residence_b4_nw1_e_e
      west: horizon_residential_zone_b_residence_b4_nw1_e_w
  - id: horizon_residential_zone_b_residence_b4_nw1_e_e
    level: 4
    name: "Residence B4-NW1-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1e_l4
  - id: horizon_residential_zone_b_residence_b4_nw1_e_w
    level: 4
    name: "Residence B4-NW1-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1e_l4
  - id: horizon_residential_zone_b_accessway_nw1f_l4
    level: 4
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1e_l4
      south: horizon_residential_zone_b_accessway_nw1g_l4
      east: horizon_residential_zone_b_residence_b4_nw1_f_e
      west: horizon_residential_zone_b_residence_b4_nw1_f_w
  - id: horizon_residential_zone_b_residence_b4_nw1_f_e
    level: 4
    name: "Residence B4-NW1-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1f_l4
  - id: horizon_residential_zone_b_residence_b4_nw1_f_w
    level: 4
    name: "Residence B4-NW1-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1f_l4
  - id: horizon_residential_zone_b_accessway_nw1g_l4
    level: 4
    name: "Residential zone B accessway NW1"
    exits:
      north: horizon_residential_zone_b_accessway_nw1f_l4
      east: horizon_residential_zone_b_residence_b4_nw1_g_e
      west: horizon_residential_zone_b_residence_b4_nw1_g_w
  - id: horizon_residential_zone_b_residence_b4_nw1_g_e
    level: 4
    name: "Residence B4-NW1-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw1g_l4
  - id: horizon_residential_zone_b_residence_b4_nw1_g_w
    level: 4
    name: "Residence B4-NW1-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw1g_l4
  - id: horizon_residential_zone_b_accessway_nw2_l4
    level: 4
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west2_l4
      south: horizon_residential_zone_b_accessway_nw2a_l4
      east: horizon_residential_zone_b_residence_b4_nw2_e
      west: horizon_residential_zone_b_residence_b4_nw2_w
  - id: horizon_residential_zone_b_residence_b4_nw2_e
    level: 4
    name: "Residence B4-NW2-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2_l4
  - id: horizon_residential_zone_b_residence_b4_nw2_w
    level: 4
    name: "Residence B4-NW2-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2_l4
  - id: horizon_residential_zone_b_accessway_nw2a_l4
    level: 4
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2_l4
      south: horizon_residential_zone_b_accessway_nw2b_l4
      east: horizon_residential_zone_b_residence_b4_nw2_a_e
      west: horizon_residential_zone_b_residence_b4_nw2_a_w
  - id: horizon_residential_zone_b_residence_b4_nw2_a_e
    level: 4
    name: "Residence B4-NW2-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2a_l4
  - id: horizon_residential_zone_b_residence_b4_nw2_a_w
    level: 4
    name: "Residence B4-NW2-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2a_l4
  - id: horizon_residential_zone_b_accessway_nw2b_l4
    level: 4
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2a_l4
      south: horizon_residential_zone_b_accessway_nw2c_l4
      east: horizon_residential_zone_b_residence_b4_nw2_b_e
      west: horizon_residential_zone_b_residence_b4_nw2_b_w
  - id: horizon_residential_zone_b_residence_b4_nw2_b_e
    level: 4
    name: "Residence B4-NW2-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2b_l4
  - id: horizon_residential_zone_b_residence_b4_nw2_b_w
    level: 4
    name: "Residence B4-NW2-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2b_l4
  - id: horizon_residential_zone_b_accessway_nw2c_l4
    level: 4
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2b_l4
      south: horizon_residential_zone_b_accessway_nw2d_l4
      east: horizon_residential_zone_b_residence_b4_nw2_c_e
      west: horizon_residential_zone_b_residence_b4_nw2_c_w
  - id: horizon_residential_zone_b_residence_b4_nw2_c_e
    level: 4
    name: "Residence B4-NW2-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2c_l4
  - id: horizon_residential_zone_b_residence_b4_nw2_c_w
    level: 4
    name: "Residence B4-NW2-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2c_l4
  - id: horizon_residential_zone_b_accessway_nw2d_l4
    level: 4
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2c_l4
      south: horizon_residential_zone_b_accessway_nw2e_l4
      east: horizon_residential_zone_b_residence_b4_nw2_d_e
      west: horizon_residential_zone_b_residence_b4_nw2_d_w
  - id: horizon_residential_zone_b_residence_b4_nw2_d_e
    level: 4
    name: "Residence B4-NW2-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2d_l4
  - id: horizon_residential_zone_b_residence_b4_nw2_d_w
    level: 4
    name: "Residence B4-NW2-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2d_l4
  - id: horizon_residential_zone_b_accessway_nw2e_l4
    level: 4
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2d_l4
      south: horizon_residential_zone_b_accessway_nw2f_l4
      east: horizon_residential_zone_b_residence_b4_nw2_e_e
      west: horizon_residential_zone_b_residence_b4_nw2_e_w
  - id: horizon_residential_zone_b_residence_b4_nw2_e_e
    level: 4
    name: "Residence B4-NW2-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2e_l4
  - id: horizon_residential_zone_b_residence_b4_nw2_e_w
    level: 4
    name: "Residence B4-NW2-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2e_l4
  - id: horizon_residential_zone_b_accessway_nw2f_l4
    level: 4
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2e_l4
      south: horizon_residential_zone_b_accessway_nw2g_l4
      east: horizon_residential_zone_b_residence_b4_nw2_f_e
      west: horizon_residential_zone_b_residence_b4_nw2_f_w
  - id: horizon_residential_zone_b_residence_b4_nw2_f_e
    level: 4
    name: "Residence B4-NW2-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2f_l4
  - id: horizon_residential_zone_b_residence_b4_nw2_f_w
    level: 4
    name: "Residence B4-NW2-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2f_l4
  - id: horizon_residential_zone_b_accessway_nw2g_l4
    level: 4
    name: "Residential zone B accessway NW2"
    exits:
      north: horizon_residential_zone_b_accessway_nw2f_l4
      east: horizon_residential_zone_b_residence_b4_nw2_g_e
      west: horizon_residential_zone_b_residence_b4_nw2_g_w
  - id: horizon_residential_zone_b_residence_b4_nw2_g_e
    level: 4
    name: "Residence B4-NW2-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw2g_l4
  - id: horizon_residential_zone_b_residence_b4_nw2_g_w
    level: 4
    name: "Residence B4-NW2-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw2g_l4
  - id: horizon_residential_zone_b_accessway_nw3_l4
    level: 4
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west3_l4
      south: horizon_residential_zone_b_accessway_nw3a_l4
      east: horizon_residential_zone_b_residence_b4_nw3_e
      west: horizon_residential_zone_b_residence_b4_nw3_w
  - id: horizon_residential_zone_b_residence_b4_nw3_e
    level: 4
    name: "Residence B4-NW3-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3_l4
  - id: horizon_residential_zone_b_residence_b4_nw3_w
    level: 4
    name: "Residence B4-NW3-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3_l4
  - id: horizon_residential_zone_b_accessway_nw3a_l4
    level: 4
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3_l4
      south: horizon_residential_zone_b_accessway_nw3b_l4
      east: horizon_residential_zone_b_residence_b4_nw3_a_e
      west: horizon_residential_zone_b_residence_b4_nw3_a_w
  - id: horizon_residential_zone_b_residence_b4_nw3_a_e
    level: 4
    name: "Residence B4-NW3-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3a_l4
  - id: horizon_residential_zone_b_residence_b4_nw3_a_w
    level: 4
    name: "Residence B4-NW3-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3a_l4
  - id: horizon_residential_zone_b_accessway_nw3b_l4
    level: 4
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3a_l4
      south: horizon_residential_zone_b_accessway_nw3c_l4
      east: horizon_residential_zone_b_residence_b4_nw3_b_e
      west: horizon_residential_zone_b_residence_b4_nw3_b_w
  - id: horizon_residential_zone_b_residence_b4_nw3_b_e
    level: 4
    name: "Residence B4-NW3-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3b_l4
  - id: horizon_residential_zone_b_residence_b4_nw3_b_w
    level: 4
    name: "Residence B4-NW3-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3b_l4
  - id: horizon_residential_zone_b_accessway_nw3c_l4
    level: 4
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3b_l4
      south: horizon_residential_zone_b_accessway_nw3d_l4
      east: horizon_residential_zone_b_residence_b4_nw3_c_e
      west: horizon_residential_zone_b_residence_b4_nw3_c_w
  - id: horizon_residential_zone_b_residence_b4_nw3_c_e
    level: 4
    name: "Residence B4-NW3-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3c_l4
  - id: horizon_residential_zone_b_residence_b4_nw3_c_w
    level: 4
    name: "Residence B4-NW3-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3c_l4
  - id: horizon_residential_zone_b_accessway_nw3d_l4
    level: 4
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3c_l4
      south: horizon_residential_zone_b_accessway_nw3e_l4
      east: horizon_residential_zone_b_residence_b4_nw3_d_e
      west: horizon_residential_zone_b_residence_b4_nw3_d_w
  - id: horizon_residential_zone_b_residence_b4_nw3_d_e
    level: 4
    name: "Residence B4-NW3-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3d_l4
  - id: horizon_residential_zone_b_residence_b4_nw3_d_w
    level: 4
    name: "Residence B4-NW3-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3d_l4
  - id: horizon_residential_zone_b_accessway_nw3e_l4
    level: 4
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3d_l4
      south: horizon_residential_zone_b_accessway_nw3f_l4
      east: horizon_residential_zone_b_residence_b4_nw3_e_e
      west: horizon_residential_zone_b_residence_b4_nw3_e_w
  - id: horizon_residential_zone_b_residence_b4_nw3_e_e
    level: 4
    name: "Residence B4-NW3-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3e_l4
  - id: horizon_residential_zone_b_residence_b4_nw3_e_w
    level: 4
    name: "Residence B4-NW3-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3e_l4
  - id: horizon_residential_zone_b_accessway_nw3f_l4
    level: 4
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3e_l4
      south: horizon_residential_zone_b_accessway_nw3g_l4
      east: horizon_residential_zone_b_residence_b4_nw3_f_e
      west: horizon_residential_zone_b_residence_b4_nw3_f_w
  - id: horizon_residential_zone_b_residence_b4_nw3_f_e
    level: 4
    name: "Residence B4-NW3-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3f_l4
  - id: horizon_residential_zone_b_residence_b4_nw3_f_w
    level: 4
    name: "Residence B4-NW3-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3f_l4
  - id: horizon_residential_zone_b_accessway_nw3g_l4
    level: 4
    name: "Residential zone B accessway NW3"
    exits:
      north: horizon_residential_zone_b_accessway_nw3f_l4
      east: horizon_residential_zone_b_residence_b4_nw3_g_e
      west: horizon_residential_zone_b_residence_b4_nw3_g_w
  - id: horizon_residential_zone_b_residence_b4_nw3_g_e
    level: 4
    name: "Residence B4-NW3-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw3g_l4
  - id: horizon_residential_zone_b_residence_b4_nw3_g_w
    level: 4
    name: "Residence B4-NW3-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw3g_l4
  - id: horizon_residential_zone_b_accessway_nw4_l4
    level: 4
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_northern_accessway_west4_l4
      south: horizon_residential_zone_b_accessway_nw4a_l4
      east: horizon_residential_zone_b_residence_b4_nw4_e
      west: horizon_residential_zone_b_residence_b4_nw4_w
  - id: horizon_residential_zone_b_residence_b4_nw4_e
    level: 4
    name: "Residence B4-NW4-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4_l4
  - id: horizon_residential_zone_b_residence_b4_nw4_w
    level: 4
    name: "Residence B4-NW4-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4_l4
  - id: horizon_residential_zone_b_accessway_nw4a_l4
    level: 4
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4_l4
      south: horizon_residential_zone_b_accessway_nw4b_l4
      east: horizon_residential_zone_b_residence_b4_nw4_a_e
      west: horizon_residential_zone_b_residence_b4_nw4_a_w
  - id: horizon_residential_zone_b_residence_b4_nw4_a_e
    level: 4
    name: "Residence B4-NW4-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4a_l4
  - id: horizon_residential_zone_b_residence_b4_nw4_a_w
    level: 4
    name: "Residence B4-NW4-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4a_l4
  - id: horizon_residential_zone_b_accessway_nw4b_l4
    level: 4
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4a_l4
      south: horizon_residential_zone_b_accessway_nw4c_l4
      east: horizon_residential_zone_b_residence_b4_nw4_b_e
      west: horizon_residential_zone_b_residence_b4_nw4_b_w
  - id: horizon_residential_zone_b_residence_b4_nw4_b_e
    level: 4
    name: "Residence B4-NW4-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4b_l4
  - id: horizon_residential_zone_b_residence_b4_nw4_b_w
    level: 4
    name: "Residence B4-NW4-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4b_l4
  - id: horizon_residential_zone_b_accessway_nw4c_l4
    level: 4
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4b_l4
      south: horizon_residential_zone_b_accessway_nw4d_l4
      east: horizon_residential_zone_b_residence_b4_nw4_c_e
      west: horizon_residential_zone_b_residence_b4_nw4_c_w
  - id: horizon_residential_zone_b_residence_b4_nw4_c_e
    level: 4
    name: "Residence B4-NW4-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4c_l4
  - id: horizon_residential_zone_b_residence_b4_nw4_c_w
    level: 4
    name: "Residence B4-NW4-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4c_l4
  - id: horizon_residential_zone_b_accessway_nw4d_l4
    level: 4
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4c_l4
      south: horizon_residential_zone_b_accessway_nw4e_l4
      east: horizon_residential_zone_b_residence_b4_nw4_d_e
      west: horizon_residential_zone_b_residence_b4_nw4_d_w
  - id: horizon_residential_zone_b_residence_b4_nw4_d_e
    level: 4
    name: "Residence B4-NW4-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4d_l4
  - id: horizon_residential_zone_b_residence_b4_nw4_d_w
    level: 4
    name: "Residence B4-NW4-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4d_l4
  - id: horizon_residential_zone_b_accessway_nw4e_l4
    level: 4
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4d_l4
      south: horizon_residential_zone_b_accessway_nw4f_l4
      east: horizon_residential_zone_b_residence_b4_nw4_e_e
      west: horizon_residential_zone_b_residence_b4_nw4_e_w
  - id: horizon_residential_zone_b_residence_b4_nw4_e_e
    level: 4
    name: "Residence B4-NW4-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4e_l4
  - id: horizon_residential_zone_b_residence_b4_nw4_e_w
    level: 4
    name: "Residence B4-NW4-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4e_l4
  - id: horizon_residential_zone_b_accessway_nw4f_l4
    level: 4
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4e_l4
      south: horizon_residential_zone_b_accessway_nw4g_l4
      east: horizon_residential_zone_b_residence_b4_nw4_f_e
      west: horizon_residential_zone_b_residence_b4_nw4_f_w
  - id: horizon_residential_zone_b_residence_b4_nw4_f_e
    level: 4
    name: "Residence B4-NW4-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4f_l4
  - id: horizon_residential_zone_b_residence_b4_nw4_f_w
    level: 4
    name: "Residence B4-NW4-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4f_l4
  - id: horizon_residential_zone_b_accessway_nw4g_l4
    level: 4
    name: "Residential zone B accessway NW4"
    exits:
      north: horizon_residential_zone_b_accessway_nw4f_l4
      east: horizon_residential_zone_b_residence_b4_nw4_g_e
      west: horizon_residential_zone_b_residence_b4_nw4_g_w
  - id: horizon_residential_zone_b_residence_b4_nw4_g_e
    level: 4
    name: "Residence B4-NW4-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_nw4g_l4
  - id: horizon_residential_zone_b_residence_b4_nw4_g_w
    level: 4
    name: "Residence B4-NW4-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_nw4g_l4
  - id: horizon_residential_zone_b_accessway_ne1_l4
    level: 4
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east_l4
      south: horizon_residential_zone_b_accessway_ne1a_l4
      east: horizon_residential_zone_b_residence_b4_ne1_e
      west: horizon_residential_zone_b_residence_b4_ne1_w
  - id: horizon_residential_zone_b_residence_b4_ne1_e
    level: 4
    name: "Residence B4-NE1-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1_l4
  - id: horizon_residential_zone_b_residence_b4_ne1_w
    level: 4
    name: "Residence B4-NE1-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1_l4
  - id: horizon_residential_zone_b_accessway_ne1a_l4
    level: 4
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1_l4
      south: horizon_residential_zone_b_accessway_ne1b_l4
      east: horizon_residential_zone_b_residence_b4_ne1_a_e
      west: horizon_residential_zone_b_residence_b4_ne1_a_w
  - id: horizon_residential_zone_b_residence_b4_ne1_a_e
    level: 4
    name: "Residence B4-NE1-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1a_l4
  - id: horizon_residential_zone_b_residence_b4_ne1_a_w
    level: 4
    name: "Residence B4-NE1-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1a_l4
  - id: horizon_residential_zone_b_accessway_ne1b_l4
    level: 4
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1a_l4
      south: horizon_residential_zone_b_accessway_ne1c_l4
      east: horizon_residential_zone_b_residence_b4_ne1_b_e
      west: horizon_residential_zone_b_residence_b4_ne1_b_w
  - id: horizon_residential_zone_b_residence_b4_ne1_b_e
    level: 4
    name: "Residence B4-NE1-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1b_l4
  - id: horizon_residential_zone_b_residence_b4_ne1_b_w
    level: 4
    name: "Residence B4-NE1-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1b_l4
  - id: horizon_residential_zone_b_accessway_ne1c_l4
    level: 4
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1b_l4
      south: horizon_residential_zone_b_accessway_ne1d_l4
      east: horizon_residential_zone_b_residence_b4_ne1_c_e
      west: horizon_residential_zone_b_residence_b4_ne1_c_w
  - id: horizon_residential_zone_b_residence_b4_ne1_c_e
    level: 4
    name: "Residence B4-NE1-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1c_l4
  - id: horizon_residential_zone_b_residence_b4_ne1_c_w
    level: 4
    name: "Residence B4-NE1-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1c_l4
  - id: horizon_residential_zone_b_accessway_ne1d_l4
    level: 4
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1c_l4
      south: horizon_residential_zone_b_accessway_ne1e_l4
      east: horizon_residential_zone_b_residence_b4_ne1_d_e
      west: horizon_residential_zone_b_residence_b4_ne1_d_w
  - id: horizon_residential_zone_b_residence_b4_ne1_d_e
    level: 4
    name: "Residence B4-NE1-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1d_l4
  - id: horizon_residential_zone_b_residence_b4_ne1_d_w
    level: 4
    name: "Residence B4-NE1-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1d_l4
  - id: horizon_residential_zone_b_accessway_ne1e_l4
    level: 4
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1d_l4
      south: horizon_residential_zone_b_accessway_ne1f_l4
      east: horizon_residential_zone_b_residence_b4_ne1_e_e
      west: horizon_residential_zone_b_residence_b4_ne1_e_w
  - id: horizon_residential_zone_b_residence_b4_ne1_e_e
    level: 4
    name: "Residence B4-NE1-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1e_l4
  - id: horizon_residential_zone_b_residence_b4_ne1_e_w
    level: 4
    name: "Residence B4-NE1-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1e_l4
  - id: horizon_residential_zone_b_accessway_ne1f_l4
    level: 4
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1e_l4
      south: horizon_residential_zone_b_accessway_ne1g_l4
      east: horizon_residential_zone_b_residence_b4_ne1_f_e
      west: horizon_residential_zone_b_residence_b4_ne1_f_w
  - id: horizon_residential_zone_b_residence_b4_ne1_f_e
    level: 4
    name: "Residence B4-NE1-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1f_l4
  - id: horizon_residential_zone_b_residence_b4_ne1_f_w
    level: 4
    name: "Residence B4-NE1-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1f_l4
  - id: horizon_residential_zone_b_accessway_ne1g_l4
    level: 4
    name: "Residential zone B accessway NE1"
    exits:
      north: horizon_residential_zone_b_accessway_ne1f_l4
      east: horizon_residential_zone_b_residence_b4_ne1_g_e
      west: horizon_residential_zone_b_residence_b4_ne1_g_w
  - id: horizon_residential_zone_b_residence_b4_ne1_g_e
    level: 4
    name: "Residence B4-NE1-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne1g_l4
  - id: horizon_residential_zone_b_residence_b4_ne1_g_w
    level: 4
    name: "Residence B4-NE1-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne1g_l4
  - id: horizon_residential_zone_b_accessway_ne2_l4
    level: 4
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east2_l4
      south: horizon_residential_zone_b_accessway_ne2a_l4
      east: horizon_residential_zone_b_residence_b4_ne2_e
      west: horizon_residential_zone_b_residence_b4_ne2_w
  - id: horizon_residential_zone_b_residence_b4_ne2_e
    level: 4
    name: "Residence B4-NE2-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2_l4
  - id: horizon_residential_zone_b_residence_b4_ne2_w
    level: 4
    name: "Residence B4-NE2-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2_l4
  - id: horizon_residential_zone_b_accessway_ne2a_l4
    level: 4
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2_l4
      south: horizon_residential_zone_b_accessway_ne2b_l4
      east: horizon_residential_zone_b_residence_b4_ne2_a_e
      west: horizon_residential_zone_b_residence_b4_ne2_a_w
  - id: horizon_residential_zone_b_residence_b4_ne2_a_e
    level: 4
    name: "Residence B4-NE2-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2a_l4
  - id: horizon_residential_zone_b_residence_b4_ne2_a_w
    level: 4
    name: "Residence B4-NE2-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2a_l4
  - id: horizon_residential_zone_b_accessway_ne2b_l4
    level: 4
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2a_l4
      south: horizon_residential_zone_b_accessway_ne2c_l4
      east: horizon_residential_zone_b_residence_b4_ne2_b_e
      west: horizon_residential_zone_b_residence_b4_ne2_b_w
  - id: horizon_residential_zone_b_residence_b4_ne2_b_e
    level: 4
    name: "Residence B4-NE2-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2b_l4
  - id: horizon_residential_zone_b_residence_b4_ne2_b_w
    level: 4
    name: "Residence B4-NE2-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2b_l4
  - id: horizon_residential_zone_b_accessway_ne2c_l4
    level: 4
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2b_l4
      south: horizon_residential_zone_b_accessway_ne2d_l4
      east: horizon_residential_zone_b_residence_b4_ne2_c_e
      west: horizon_residential_zone_b_residence_b4_ne2_c_w
  - id: horizon_residential_zone_b_residence_b4_ne2_c_e
    level: 4
    name: "Residence B4-NE2-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2c_l4
  - id: horizon_residential_zone_b_residence_b4_ne2_c_w
    level: 4
    name: "Residence B4-NE2-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2c_l4
  - id: horizon_residential_zone_b_accessway_ne2d_l4
    level: 4
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2c_l4
      south: horizon_residential_zone_b_accessway_ne2e_l4
      east: horizon_residential_zone_b_residence_b4_ne2_d_e
      west: horizon_residential_zone_b_residence_b4_ne2_d_w
  - id: horizon_residential_zone_b_residence_b4_ne2_d_e
    level: 4
    name: "Residence B4-NE2-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2d_l4
  - id: horizon_residential_zone_b_residence_b4_ne2_d_w
    level: 4
    name: "Residence B4-NE2-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2d_l4
  - id: horizon_residential_zone_b_accessway_ne2e_l4
    level: 4
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2d_l4
      south: horizon_residential_zone_b_accessway_ne2f_l4
      east: horizon_residential_zone_b_residence_b4_ne2_e_e
      west: horizon_residential_zone_b_residence_b4_ne2_e_w
  - id: horizon_residential_zone_b_residence_b4_ne2_e_e
    level: 4
    name: "Residence B4-NE2-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2e_l4
  - id: horizon_residential_zone_b_residence_b4_ne2_e_w
    level: 4
    name: "Residence B4-NE2-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2e_l4
  - id: horizon_residential_zone_b_accessway_ne2f_l4
    level: 4
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2e_l4
      south: horizon_residential_zone_b_accessway_ne2g_l4
      east: horizon_residential_zone_b_residence_b4_ne2_f_e
      west: horizon_residential_zone_b_residence_b4_ne2_f_w
  - id: horizon_residential_zone_b_residence_b4_ne2_f_e
    level: 4
    name: "Residence B4-NE2-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2f_l4
  - id: horizon_residential_zone_b_residence_b4_ne2_f_w
    level: 4
    name: "Residence B4-NE2-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2f_l4
  - id: horizon_residential_zone_b_accessway_ne2g_l4
    level: 4
    name: "Residential zone B accessway NE2"
    exits:
      north: horizon_residential_zone_b_accessway_ne2f_l4
      east: horizon_residential_zone_b_residence_b4_ne2_g_e
      west: horizon_residential_zone_b_residence_b4_ne2_g_w
  - id: horizon_residential_zone_b_residence_b4_ne2_g_e
    level: 4
    name: "Residence B4-NE2-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne2g_l4
  - id: horizon_residential_zone_b_residence_b4_ne2_g_w
    level: 4
    name: "Residence B4-NE2-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne2g_l4
  - id: horizon_residential_zone_b_accessway_ne3_l4
    level: 4
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east3_l4
      south: horizon_residential_zone_b_accessway_ne3a_l4
      east: horizon_residential_zone_b_residence_b4_ne3_e
      west: horizon_residential_zone_b_residence_b4_ne3_w
  - id: horizon_residential_zone_b_residence_b4_ne3_e
    level: 4
    name: "Residence B4-NE3-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3_l4
  - id: horizon_residential_zone_b_residence_b4_ne3_w
    level: 4
    name: "Residence B4-NE3-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3_l4
  - id: horizon_residential_zone_b_accessway_ne3a_l4
    level: 4
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3_l4
      south: horizon_residential_zone_b_accessway_ne3b_l4
      east: horizon_residential_zone_b_residence_b4_ne3_a_e
      west: horizon_residential_zone_b_residence_b4_ne3_a_w
  - id: horizon_residential_zone_b_residence_b4_ne3_a_e
    level: 4
    name: "Residence B4-NE3-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3a_l4
  - id: horizon_residential_zone_b_residence_b4_ne3_a_w
    level: 4
    name: "Residence B4-NE3-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3a_l4
  - id: horizon_residential_zone_b_accessway_ne3b_l4
    level: 4
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3a_l4
      south: horizon_residential_zone_b_accessway_ne3c_l4
      east: horizon_residential_zone_b_residence_b4_ne3_b_e
      west: horizon_residential_zone_b_residence_b4_ne3_b_w
  - id: horizon_residential_zone_b_residence_b4_ne3_b_e
    level: 4
    name: "Residence B4-NE3-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3b_l4
  - id: horizon_residential_zone_b_residence_b4_ne3_b_w
    level: 4
    name: "Residence B4-NE3-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3b_l4
  - id: horizon_residential_zone_b_accessway_ne3c_l4
    level: 4
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3b_l4
      south: horizon_residential_zone_b_accessway_ne3d_l4
      east: horizon_residential_zone_b_residence_b4_ne3_c_e
      west: horizon_residential_zone_b_residence_b4_ne3_c_w
  - id: horizon_residential_zone_b_residence_b4_ne3_c_e
    level: 4
    name: "Residence B4-NE3-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3c_l4
  - id: horizon_residential_zone_b_residence_b4_ne3_c_w
    level: 4
    name: "Residence B4-NE3-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3c_l4
  - id: horizon_residential_zone_b_accessway_ne3d_l4
    level: 4
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3c_l4
      south: horizon_residential_zone_b_accessway_ne3e_l4
      east: horizon_residential_zone_b_residence_b4_ne3_d_e
      west: horizon_residential_zone_b_residence_b4_ne3_d_w
  - id: horizon_residential_zone_b_residence_b4_ne3_d_e
    level: 4
    name: "Residence B4-NE3-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3d_l4
  - id: horizon_residential_zone_b_residence_b4_ne3_d_w
    level: 4
    name: "Residence B4-NE3-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3d_l4
  - id: horizon_residential_zone_b_accessway_ne3e_l4
    level: 4
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3d_l4
      south: horizon_residential_zone_b_accessway_ne3f_l4
      east: horizon_residential_zone_b_residence_b4_ne3_e_e
      west: horizon_residential_zone_b_residence_b4_ne3_e_w
  - id: horizon_residential_zone_b_residence_b4_ne3_e_e
    level: 4
    name: "Residence B4-NE3-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3e_l4
  - id: horizon_residential_zone_b_residence_b4_ne3_e_w
    level: 4
    name: "Residence B4-NE3-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3e_l4
  - id: horizon_residential_zone_b_accessway_ne3f_l4
    level: 4
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3e_l4
      south: horizon_residential_zone_b_accessway_ne3g_l4
      east: horizon_residential_zone_b_residence_b4_ne3_f_e
      west: horizon_residential_zone_b_residence_b4_ne3_f_w
  - id: horizon_residential_zone_b_residence_b4_ne3_f_e
    level: 4
    name: "Residence B4-NE3-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3f_l4
  - id: horizon_residential_zone_b_residence_b4_ne3_f_w
    level: 4
    name: "Residence B4-NE3-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3f_l4
  - id: horizon_residential_zone_b_accessway_ne3g_l4
    level: 4
    name: "Residential zone B accessway NE3"
    exits:
      north: horizon_residential_zone_b_accessway_ne3f_l4
      east: horizon_residential_zone_b_residence_b4_ne3_g_e
      west: horizon_residential_zone_b_residence_b4_ne3_g_w
  - id: horizon_residential_zone_b_residence_b4_ne3_g_e
    level: 4
    name: "Residence B4-NE3-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne3g_l4
  - id: horizon_residential_zone_b_residence_b4_ne3_g_w
    level: 4
    name: "Residence B4-NE3-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne3g_l4
  - id: horizon_residential_zone_b_accessway_ne4_l4
    level: 4
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_northern_accessway_east4_l4
      south: horizon_residential_zone_b_accessway_ne4a_l4
      east: horizon_residential_zone_b_residence_b4_ne4_e
      west: horizon_residential_zone_b_residence_b4_ne4_w
  - id: horizon_residential_zone_b_residence_b4_ne4_e
    level: 4
    name: "Residence B4-NE4-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4_l4
  - id: horizon_residential_zone_b_residence_b4_ne4_w
    level: 4
    name: "Residence B4-NE4-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4_l4
  - id: horizon_residential_zone_b_accessway_ne4a_l4
    level: 4
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4_l4
      south: horizon_residential_zone_b_accessway_ne4b_l4
      east: horizon_residential_zone_b_residence_b4_ne4_a_e
      west: horizon_residential_zone_b_residence_b4_ne4_a_w
  - id: horizon_residential_zone_b_residence_b4_ne4_a_e
    level: 4
    name: "Residence B4-NE4-A-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4a_l4
  - id: horizon_residential_zone_b_residence_b4_ne4_a_w
    level: 4
    name: "Residence B4-NE4-A-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4a_l4
  - id: horizon_residential_zone_b_accessway_ne4b_l4
    level: 4
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4a_l4
      south: horizon_residential_zone_b_accessway_ne4c_l4
      east: horizon_residential_zone_b_residence_b4_ne4_b_e
      west: horizon_residential_zone_b_residence_b4_ne4_b_w
  - id: horizon_residential_zone_b_residence_b4_ne4_b_e
    level: 4
    name: "Residence B4-NE4-B-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4b_l4
  - id: horizon_residential_zone_b_residence_b4_ne4_b_w
    level: 4
    name: "Residence B4-NE4-B-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4b_l4
  - id: horizon_residential_zone_b_accessway_ne4c_l4
    level: 4
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4b_l4
      south: horizon_residential_zone_b_accessway_ne4d_l4
      east: horizon_residential_zone_b_residence_b4_ne4_c_e
      west: horizon_residential_zone_b_residence_b4_ne4_c_w
  - id: horizon_residential_zone_b_residence_b4_ne4_c_e
    level: 4
    name: "Residence B4-NE4-C-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4c_l4
  - id: horizon_residential_zone_b_residence_b4_ne4_c_w
    level: 4
    name: "Residence B4-NE4-C-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4c_l4
  - id: horizon_residential_zone_b_accessway_ne4d_l4
    level: 4
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4c_l4
      south: horizon_residential_zone_b_accessway_ne4e_l4
      east: horizon_residential_zone_b_residence_b4_ne4_d_e
      west: horizon_residential_zone_b_residence_b4_ne4_d_w
  - id: horizon_residential_zone_b_residence_b4_ne4_d_e
    level: 4
    name: "Residence B4-NE4-D-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4d_l4
  - id: horizon_residential_zone_b_residence_b4_ne4_d_w
    level: 4
    name: "Residence B4-NE4-D-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4d_l4
  - id: horizon_residential_zone_b_accessway_ne4e_l4
    level: 4
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4d_l4
      south: horizon_residential_zone_b_accessway_ne4f_l4
      east: horizon_residential_zone_b_residence_b4_ne4_e_e
      west: horizon_residential_zone_b_residence_b4_ne4_e_w
  - id: horizon_residential_zone_b_residence_b4_ne4_e_e
    level: 4
    name: "Residence B4-NE4-E-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4e_l4
  - id: horizon_residential_zone_b_residence_b4_ne4_e_w
    level: 4
    name: "Residence B4-NE4-E-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4e_l4
  - id: horizon_residential_zone_b_accessway_ne4f_l4
    level: 4
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4e_l4
      south: horizon_residential_zone_b_accessway_ne4g_l4
      east: horizon_residential_zone_b_residence_b4_ne4_f_e
      west: horizon_residential_zone_b_residence_b4_ne4_f_w
  - id: horizon_residential_zone_b_residence_b4_ne4_f_e
    level: 4
    name: "Residence B4-NE4-F-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4f_l4
  - id: horizon_residential_zone_b_residence_b4_ne4_f_w
    level: 4
    name: "Residence B4-NE4-F-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4f_l4
  - id: horizon_residential_zone_b_accessway_ne4g_l4
    level: 4
    name: "Residential zone B accessway NE4"
    exits:
      north: horizon_residential_zone_b_accessway_ne4f_l4
      east: horizon_residential_zone_b_residence_b4_ne4_g_e
      west: horizon_residential_zone_b_residence_b4_ne4_g_w
  - id: horizon_residential_zone_b_residence_b4_ne4_g_e
    level: 4
    name: "Residence B4-NE4-G-E"
    exits:
      west: horizon_residential_zone_b_accessway_ne4g_l4
  - id: horizon_residential_zone_b_residence_b4_ne4_g_w
    level: 4
    name: "Residence B4-NE4-G-W"
    exits:
      east: horizon_residential_zone_b_accessway_ne4g_l4
`;
// --- Templated descriptions ----------------------------------------------
// Deliberately static and identical within each kind: the look-alikes are
// supposed to read the same. The room's name (its address) and the signposted
// exits are the only things that tell one apart from another.
const LOBBY = "A plain residential lift lobby — a bank of resident mailboxes, a board of " +
    "municipal notices nobody reads, and the same hard-wearing flooring as every " +
    "other floor. It is indistinguishable from the lobbies above and below it but " +
    "for the numeral stencilled over the lift door. The lift is to the south; the " +
    "accessways run east and west into the zone.";
const NORTHERN = "A long transverse accessway running across the top of the zone, the mouths of " +
    "the residential runs dropping away to the south at regular intervals. It looks " +
    "exactly like the stretch before it and the stretch after it; only the small " +
    "plate at each junction, if you stop to read it, tells one length from the next.";
const ACCESSWAY = "A narrow residential accessway, identical to a hundred others in the zone: two " +
    "facing rows of numbered doors, flat economical lighting, and the low hum of the " +
    "air handling. It runs north and south, the doors to either side shut. Without " +
    "reading the plate beside each one you would have no way of knowing this stretch " +
    "from any other.";
const RESIDENCE = "A residential front door, indistinguishable from its neighbours but for the " +
    "number beside it. It is shut, and there is no answer when you try it — whoever " +
    "lives here is out, or simply not inclined to receive visitors. The accessway " +
    "is the only way back.";
function residentialDefault(r) {
    if (r.lift)
        return liftDescription;
    const n = r.name.toLowerCase();
    if (n.startsWith("residence"))
        return RESIDENCE;
    if (n.includes("northern accessway"))
        return NORTHERN;
    if (n.includes("accessway"))
        return ACCESSWAY;
    return LOBBY; // the per-level "Residential zone B [- N]" lift lobbies
}
// The L1 entrance hall doubles as the TravelTube stop, so — like every other
// stop — it gets a bespoke, state-aware description (the pod-summon prompt) and
// carries the reader item.
function entranceDescription(s) {
    return ("The entrance hall of Residential Zone B — the public face of a sprawling " +
        "warren of identical accessways and numbered residences that houses a good " +
        "slice of Horizon's permanent population. It has the anonymous, faintly " +
        "municipal feel of cheap housing everywhere: hard-wearing surfaces, economical " +
        "lighting, and signage that assumes you already know where you are going.\n\n" +
        "A TravelTube stop is set into the wall here. " +
        (s.flags["pod_summoned_at"] === "horizon_residential_zone_b"
            ? "A pod waits in the bay, doors open — you can BOARD it."
            : "Scan your ID at the reader to summon a pod.") +
        "\n\nThe residential lift is to the south; accessways run east and west into " +
        "the zone.");
}
// --- Build the area ------------------------------------------------------
const built = buildAreaFromYaml(RESIDENTIAL_ZONE_B_YAML, {
    defaultDescription: residentialDefault,
    rooms: {
        horizon_residential_zone_b: {
            description: entranceDescription,
            items: ["reader_residential_b"],
        },
    },
});
// --- Register the zone's lift (4 levels; step-out dirs from the lift cars) --
/** Zone B's 4-level lift. Registered via the residential MODULES entry (index.ts). */
export const residentialLift = withLiftDirs(liftDefFromYaml(built.parsed, {
    1: { label: "Level 1 (Ground)", names: ["1", "ground", "g", "0"] },
    2: { label: "Level 2", names: ["2", "second"] },
    3: { label: "Level 3", names: ["3", "third"] },
    4: { label: "Level 4", names: ["4", "fourth", "top"] },
}), built.rooms);
const zoneBRooms = built.rooms;
// === Residential Zone A ==================================================
// A small residential pocket reached ON FOOT from the Dockside Retail service
// corridor (horizon_corridor) — deliberately NOT a 'Tube stop. Same authoring
// approach as Zone B: look-alikes share one description, and the address in each
// room's name is the only differentiator. Built from maps/residential_zone_a.yaml.
const ZONE_A_YAML = `
# Generated by tools/mapper.html
area: residential_zone_a
areaName: "Residential Zone A"
stop: null
rooms:
  - id: horizon_residential_zone_a_central_accessway
    name: "Residential zone A central accessway"
    exits:
      north: horizon_residential_zone_a_central_accessway2
      east: horizon_residential_zone_a_eastern_accessway
      west: horizon_residential_zone_a_western_accessway
  - id: horizon_residential_zone_a_eastern_accessway
    name: "Residential zone A eastern accessway"
    exits:
      north: horizon_residential_zone_a_eastern_accessway2
      west: horizon_residential_zone_a_central_accessway
  - id: horizon_residential_zone_a_western_accessway
    name: "Residential zone A western accessway"
    exits:
      north: horizon_residential_zone_a_western_accessway2
      east: horizon_residential_zone_a_central_accessway
  - id: horizon_residential_zone_a_central_accessway2
    name: "Residential zone A central accessway"
    exits:
      north: residential_zone_a_central_accessway3
      south: horizon_residential_zone_a_central_accessway
      east: horizon_residence_ac1e
      west: horizon_residence_ac1w
  - id: residential_zone_a_central_accessway3
    name: "Residential zone A central accessway"
    exits:
      north: residential_zone_a_central_accessway4
      south: horizon_residential_zone_a_central_accessway2
      east: horizon_residence_ac2e
      west: horizon_residence_ac2w
  - id: residential_zone_a_central_accessway4
    name: "Residential zone A central accessway"
    exits:
      south: residential_zone_a_central_accessway3
      east: horizon_residence_ac3e
      west: horizon_residence_ac3w
  - id: horizon_residence_ac1e
    name: "Residence AC1E"
    exits:
      west: horizon_residential_zone_a_central_accessway2
  - id: horizon_residence_ae1
    name: "Residence AE1"
    exits:
      east: horizon_residential_zone_a_eastern_accessway2
  - id: horizon_residential_zone_a_eastern_accessway2
    name: "Residential zone A eastern accessway"
    exits:
      north: horizon_residential_zone_a_eastern_accessway3
      south: horizon_residential_zone_a_eastern_accessway
      west: horizon_residence_ae1
  - id: horizon_residence_ac1w
    name: "Residence AC1W"
    exits:
      east: horizon_residential_zone_a_central_accessway2
  - id: horizon_residence_aw1
    name: "Residence AW1"
    exits:
      west: horizon_residential_zone_a_western_accessway2
  - id: horizon_residential_zone_a_western_accessway2
    name: "Residential zone A western accessway"
    exits:
      north: horizon_residential_zone_a_western_accessway3
      south: horizon_residential_zone_a_western_accessway
      east: horizon_residence_aw1
  - id: horizon_residential_zone_a_western_accessway3
    name: "Residential zone A western accessway"
    exits:
      north: horizon_horizon_residential_zone_a_western_accessway4
      south: horizon_residential_zone_a_western_accessway2
      east: horizon_residence_aw2
  - id: horizon_residence_aw2
    name: "Residence AW2"
    exits:
      west: horizon_residential_zone_a_western_accessway3
  - id: horizon_residence_ac2w
    name: "Residence AC2W"
    exits:
      east: residential_zone_a_central_accessway3
  - id: horizon_residence_ac2e
    name: "Residence AC2E"
    exits:
      west: residential_zone_a_central_accessway3
  - id: horizon_residence_ae2
    name: "Residence AE2"
    exits:
      east: horizon_residential_zone_a_eastern_accessway3
  - id: horizon_residential_zone_a_eastern_accessway3
    name: "Residential zone A eastern accessway"
    exits:
      north: horizon_residential_zone_a_eastern_accessway4
      south: horizon_residential_zone_a_eastern_accessway2
      west: horizon_residence_ae2
  - id: horizon_residential_zone_a_eastern_accessway4
    name: "Residential zone A eastern accessway"
    exits:
      south: horizon_residential_zone_a_eastern_accessway3
      west: horizon_residence_ae3
  - id: horizon_residence_ae3
    name: "Residence AE3"
    exits:
      east: horizon_residential_zone_a_eastern_accessway4
  - id: horizon_residence_ac3e
    name: "Residence AC3E"
    exits:
      west: residential_zone_a_central_accessway4
  - id: horizon_residence_ac3w
    name: "Residence AC3W"
    exits:
      east: residential_zone_a_central_accessway4
  - id: horizon_residence_aw3
    name: "Residence AW3"
    exits:
      west: horizon_horizon_residential_zone_a_western_accessway4
  - id: horizon_horizon_residential_zone_a_western_accessway4
    name: "Residential zone A western accessway"
    exits:
      south: horizon_residential_zone_a_western_accessway3
      east: horizon_residence_aw3
`;
const A_ACCESSWAY = "A residential accessway in Zone A: a plain corridor of evenly spaced front " +
    "doors, the lighting flat and the air faintly recycled. It gives little away — " +
    "only the plate beside each door, and the marker where the runs meet, tells you " +
    "which part of the zone you are standing in.";
function zoneADefault(r) {
    const n = r.name.toLowerCase();
    if (n.startsWith("residence"))
        return RESIDENCE;
    if (n.includes("accessway"))
        return A_ACCESSWAY;
    return "An unremarkable corner of Residential Zone A.";
}
const zoneA = buildAreaFromYaml(ZONE_A_YAML, { defaultDescription: zoneADefault });
// On-foot link out to the retail service corridor. The central accessway's free
// side is south; the corridor's is north — a clean reciprocal pair. (The corridor
// side of the link is wired in horizon.ts, where horizon_corridor is built.)
zoneA.rooms["horizon_residential_zone_a_central_accessway"].exits.south =
    { to: "horizon_corridor", description: "the service corridor (Dockside Retail)" };
// --- Exports ------------------------------------------------------------
export const residentialRooms = { ...zoneBRooms, ...zoneA.rooms };
