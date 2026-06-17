// Notes / leads system. Spec §4.8.
/**
 * Add a note. Dedup by `id` — calling twice with the same id is a no-op.
 * Stamps `tickAdded` from the current state.
 */
export function addNote(state, note) {
    if (state.notes.some(n => n.id === note.id))
        return false;
    state.notes.push({ ...note, tickAdded: state.ticks });
    return true;
}
/**
 * Render notes for display. `reliable` is internal — NEVER included.
 */
export function renderNotes(state) {
    if (state.notes.length === 0) {
        return ["You haven't written anything down yet."];
    }
    const lines = [`NOTES (${state.notes.length})`];
    for (const n of state.notes) {
        const src = n.source ? `${n.source}: ` : "";
        lines.push(`  [tick ${n.tickAdded}] ${src}${n.text}`);
    }
    return lines;
}
