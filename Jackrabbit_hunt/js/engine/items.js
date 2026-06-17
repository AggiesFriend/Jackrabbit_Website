// Item-location helpers. The world's `Room.items` is initial-placement only;
// current locations live on GameState so restart and save/load work.
/**
 * Build the initial item-location map from a world definition.
 * Each item placed in a room becomes itemLocations[itemId] = roomId.
 */
export function seedItemLocations(world) {
    const out = {};
    for (const room of Object.values(world.rooms)) {
        for (const itemId of room.items) {
            out[itemId] = room.id;
        }
    }
    return out;
}
/** Items currently sitting in the given room. */
export function itemsInRoom(state, roomId) {
    const out = [];
    for (const [id, loc] of Object.entries(state.itemLocations)) {
        if (loc === roomId)
            out.push(id);
    }
    return out;
}
/** Move an item from wherever it is into a room. */
export function placeItemInRoom(state, itemId, roomId) {
    // Remove from inventory if present.
    const idx = state.inventory.indexOf(itemId);
    if (idx >= 0)
        state.inventory.splice(idx, 1);
    state.itemLocations[itemId] = roomId;
}
/** Move an item from wherever it is into the player's inventory. */
export function takeItemToInventory(state, itemId) {
    delete state.itemLocations[itemId];
    if (!state.inventory.includes(itemId))
        state.inventory.push(itemId);
}
/** Remove an item from the world entirely (consumed / destroyed). */
export function removeItem(state, itemId) {
    delete state.itemLocations[itemId];
    const idx = state.inventory.indexOf(itemId);
    if (idx >= 0)
        state.inventory.splice(idx, 1);
}
export function isInInventory(state, itemId) {
    return state.inventory.includes(itemId);
}
