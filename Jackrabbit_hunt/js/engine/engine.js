// GameEngine — main loop and command dispatch. Spec §4.
import { parse } from "./parser.js";
import { applyTickCost, advanceTime } from "./time.js";
import { createInitialState } from "./state.js";
import { describeRoom } from "./output.js";
import { handleGo, handleDirection, handleFollow, enterRoom } from "./commands/movement.js";
import { handleLook, handleExamine, handleRead, handleSearch, handleInventory, handleTake, handleDrop, handleGive, handleUse, handleTap, handlePush, handleOpen, handleClose, handleTalk, handleAsk, handleBuy, isExaminableNoun, } from "./commands/interaction.js";
import { handleScore, handleTime, handleHelp, handleNotes, handleAddNote, handleSave, handleLoad, handleRestart, handleQuit, } from "./commands/meta.js";
import { handleWait } from "./commands/wait.js";
const VERB_TABLE = {
    // movement
    go: handleGo,
    north: handleDirection, south: handleDirection, east: handleDirection, west: handleDirection,
    up: handleDirection, down: handleDirection, in: handleDirection, out: handleDirection,
    enter: handleDirection, exit: handleDirection,
    follow: handleFollow,
    // looking
    look: handleLook,
    examine: handleExamine, read: handleRead, search: handleSearch,
    // inventory
    inventory: handleInventory, take: handleTake, drop: handleDrop, give: handleGive,
    // interaction
    use: handleUse, tap: handleTap, push: handlePush,
    open: handleOpen, close: handleClose,
    talk: handleTalk, ask: handleAsk, buy: handleBuy,
    // meta
    score: handleScore, time: handleTime, help: handleHelp, notes: handleNotes, add: handleAddNote,
    save: handleSave, load: handleLoad, restart: handleRestart, quit: handleQuit,
    // wait
    wait: handleWait,
};
export class GameEngine {
    constructor(world, cb, initial) {
        this.world = world;
        this.cb = cb;
        /** Stack of modal input handlers. Empty = normal verb-parser mode. */
        this.modalStack = [];
        this.state = initial ?? createInitialState(world);
    }
    /** Push a modal handler onto the stack and fire its onEnter. */
    pushModal(handler) {
        this.modalStack.push(handler);
        if (handler.onEnter) {
            this.renderHandlerOutput(handler.onEnter(this.state));
        }
    }
    /** Pop the top modal handler (if any), firing its onExit. */
    popModal() {
        const h = this.modalStack.pop();
        if (h?.onExit)
            h.onExit(this.state);
    }
    /** True if a modal handler is currently intercepting input. */
    inModalMode() {
        return this.modalStack.length > 0;
    }
    renderHandlerOutput(output) {
        if (output === undefined)
            return;
        const lines = Array.isArray(output) ? output : [output];
        if (lines.length > 0)
            this.cb.render(lines, { kind: "system" });
    }
    /** Print the opening text and the starting room description. Call once. */
    start() {
        if (this.world.openingText) {
            this.cb.render([this.world.openingText], { kind: "system" });
        }
        this.enterCurrentRoomFresh();
    }
    /**
     * Enter the current room as if for the first time: stamp the entry tick,
     * fire its onEnter, render its description, refresh the header, and drain
     * any pending operations the onEnter requested (e.g. the lobby pushing the
     * character-creation modal). Shared by start() and restart so they can't
     * drift apart.
     */
    enterCurrentRoomFresh() {
        const r = this.world.rooms[this.state.currentRoom];
        if (r) {
            this.state.roomEnteredAtTick = this.state.ticks;
            if (r.onEnter)
                r.onEnter(this.state);
            this.cb.render(describeRoom(this.world, this.state, r, "full"));
        }
        this.refreshHeader();
        this.handlePending();
    }
    /**
     * Programmatic scene transition. Used by world handlers (e.g. after the
     * shuttle docks). Mirrors what `go` does on a successful move: stamps
     * roomEnteredAtTick, fires the room's onEnter, prints its description.
     * Refreshes the header.
     */
    gotoRoom(roomId) {
        enterRoom(this.world, this.state, roomId);
        const r = this.world.rooms[roomId];
        if (r)
            this.cb.render(describeRoom(this.world, this.state, r, "full"));
        this.refreshHeader();
    }
    /** Process a single line of input from the player. */
    submit(line) {
        // A bare Enter / whitespace-only line is a complete no-op in normal play
        // (no echo, no message). But when a modal is active it's meaningful (e.g.
        // a "Press ENTER to continue" screen), so let it through to the modal.
        if (!line.trim() && this.modalStack.length === 0 && !this.state.dead && !this.state.ended) {
            return;
        }
        // Echo the command.
        this.cb.render([`> ${line}`], { kind: "echo" });
        if (this.state.dead || this.state.ended) {
            // Only restart / load accepted post-mortem. (Modal handlers are
            // explicitly bypassed when the game is over — death wins.)
            const parsed = parse(line);
            if (parsed && (parsed.verb === "restart" || parsed.verb === "load")) {
                this.runOne(parsed);
            }
            else {
                this.cb.render(["The game is over. Type RESTART or LOAD."], { kind: "system" });
            }
            this.refreshHeader();
            return;
        }
        // Modal mode: top handler intercepts the raw line. No verb parsing,
        // no tick cost. The handler decides whether to pop itself, push another,
        // or stay active.
        if (this.modalStack.length > 0) {
            this.runModal(line);
            this.refreshHeader();
            this.checkEndStates();
            return;
        }
        const parsed = parse(line);
        // Truly empty input (a bare Enter, or only whitespace) is ignored
        // silently. But input that was non-empty yet reduced to nothing — e.g.
        // the player typed "a", which is a noise word — should still get
        // feedback rather than vanishing into a confusing silent no-op.
        if (!parsed)
            return;
        if (!parsed.verb) {
            this.cb.render([`I don't understand "${parsed.raw}".`], { kind: "system" });
            this.refreshHeader();
            return;
        }
        this.runOne(parsed);
        this.refreshHeader();
        this.checkEndStates();
    }
    runModal(line) {
        const top = this.modalStack[this.modalStack.length - 1];
        if (!top)
            return;
        const result = top.onInput(line, this.state);
        this.renderHandlerOutput(result.output);
        if (result.pop)
            this.popModal();
        if (result.push)
            this.pushModal(result.push);
        // Modal handlers may have requested a scene transition while running.
        this.handlePending();
    }
    runOne(parsed) {
        // World-defined verbs take precedence (they may also override built-ins
        // if the author really wants to). Worlds wire one entry per accepted
        // spelling — the engine doesn't apply synonym normalisation to them.
        const worldCommands = this.world.commands;
        let handler = worldCommands?.[parsed.verb]
            ?? worldCommands?.[parsed.rawVerb ?? ""]
            ?? VERB_TABLE[parsed.verb];
        if (!handler) {
            // Bare-noun affordance: if the player typed just an object's name
            // (e.g. "panel", "viewport") and it resolves to something in scope,
            // treat it as "examine <that>". Natural for casual players.
            if (!parsed.noun && isExaminableNoun(this.world, this.state, parsed.raw)) {
                parsed = { ...parsed, verb: "examine", noun: parsed.raw };
                handler = handleExamine;
            }
            else {
                this.cb.render([`I don't understand "${parsed.raw}".`], { kind: "system" });
                return; // unknown verbs cost zero ticks, no turn increment.
            }
        }
        const beforeRoom = this.state.currentRoom;
        const result = handler(this.world, this.state, parsed);
        if (!result.handled) {
            this.cb.render([`I don't understand "${parsed.raw}".`], { kind: "system" });
            return;
        }
        if (result.output && result.output.length > 0)
            this.cb.render(result.output);
        // Tick cost: charge time unless this is a free / zero-cost action.
        const cost = result.tickCost ?? 1;
        if (result.interruptible && cost > 1 && !result.free) {
            // Interruptible multi-tick action (e.g. `wait N`): advance one tick at a
            // time, firing scene callbacks each tick, and stop early the moment
            // something happens. One command = one turn regardless of ticks elapsed.
            this.runInterruptibleTicks(cost, beforeRoom);
        }
        else {
            applyTickCost(this.state, cost, { free: result.free });
            // Re-stamp roomEnteredAtTick on room change so Room.onTick has a fresh
            // clock; per-room onTick still does NOT fire on the move-in turn.
            if (this.state.currentRoom !== beforeRoom) {
                this.state.roomEnteredAtTick = this.state.ticks;
            }
            // Tick callbacks fire only on real (non-free) ticks.
            if (cost >= 1 && !result.free) {
                this.fireTickCallbacks(beforeRoom);
            }
        }
        // Handle pending meta operations (load, restart, scene transition).
        this.handlePending();
    }
    /**
     * Fire world.onTick (always) and the current room's onTick (only if the
     * player hasn't just changed rooms). Renders any returned text. Returns
     * true if either callback produced output — used as an "an event happened"
     * signal by the interruptible-wait loop.
     */
    fireTickCallbacks(beforeRoom) {
        let fired = false;
        const s = this.state;
        if (this.world.onTick) {
            s.tickOutputAmbient = false;
            const wOut = this.world.onTick(s);
            if (wOut !== undefined) {
                const lines = Array.isArray(wOut) ? wOut : [wOut];
                // Ambient output (e.g. the shipyard patrol telegraph) still renders but
                // must not interrupt an in-progress wait — only "real" beats stop it.
                if (lines.length > 0) {
                    this.cb.render(lines, { kind: "system" });
                    if (!s.tickOutputAmbient)
                        fired = true;
                }
            }
        }
        if (s.currentRoom === beforeRoom) {
            const r = this.world.rooms[s.currentRoom];
            if (r?.onTick) {
                s.tickOutputAmbient = false;
                const ticksInRoom = s.ticks - s.roomEnteredAtTick;
                const tickOutput = r.onTick(s, ticksInRoom);
                if (tickOutput !== undefined) {
                    const lines = Array.isArray(tickOutput) ? tickOutput : [tickOutput];
                    if (lines.length > 0) {
                        this.cb.render(lines, { kind: "system" });
                        if (!s.tickOutputAmbient)
                            fired = true;
                    }
                }
            }
        }
        s.tickOutputAmbient = false;
        return fired;
    }
    /**
     * Advance `cost` ticks one at a time, firing tick callbacks each tick and
     * stopping the moment an event occurs: a callback prints, a transition or
     * modal is queued, or the player dies/ends. Counts as exactly one turn.
     * Accumulated fractional time is flushed up front (ceil), matching
     * applyTickCost's rounding.
     */
    runInterruptibleTicks(cost, beforeRoom) {
        const s = this.state;
        s.turns += 1;
        let remaining = cost + Math.ceil(s.pendingFractional);
        s.pendingFractional = 0;
        while (remaining > 0) {
            advanceTime(s, 1);
            remaining -= 1;
            const fired = this.fireTickCallbacks(beforeRoom);
            if (fired || s.dead || s.ended ||
                s.flags["__pendingGoto"] !== undefined ||
                s.flags["__pendingPushModal"] !== undefined) {
                break;
            }
        }
    }
    handlePending() {
        const flags = this.state.flags;
        if (flags["__pendingLoad"]) {
            const loaded = flags["__pendingLoad"];
            this.state = loaded;
            delete this.state.flags["__pendingLoad"];
            // A load restores an exact mid-game snapshot, so we do NOT re-fire the
            // room's onEnter (that would re-trigger first-entry side effects). Just
            // clear any transient modal stack and redescribe.
            this.modalStack = [];
            const r = this.world.rooms[this.state.currentRoom];
            if (r)
                this.cb.render(describeRoom(this.world, this.state, r, "full"));
            this.refreshHeader();
            return;
        }
        if (flags["__pendingRestart"]) {
            // Full re-initialisation: fresh state, empty modal stack, and re-enter
            // the start room exactly as a new game would — firing its onEnter so
            // first-entry hooks (e.g. the lobby's character-creation form) run again.
            this.modalStack = [];
            this.state = createInitialState(this.world);
            this.enterCurrentRoomFresh();
            return;
        }
        // Handler-requested scene transition (e.g. shuttle docking → liner).
        // World handlers set state.flags["__pendingGoto"] = "<roomId>" via
        // requestSceneTransition(); the engine processes it here so it survives
        // arbitrary call depths (including onTick callbacks).
        if (flags["__pendingGoto"]) {
            const target = flags["__pendingGoto"];
            delete this.state.flags["__pendingGoto"];
            this.gotoRoom(target);
        }
        // Handler-requested modal push (e.g. lobby's onEnter pushes the
        // character-creation form). Set via requestPushModal().
        if (flags["__pendingPushModal"]) {
            const h = flags["__pendingPushModal"];
            delete this.state.flags["__pendingPushModal"];
            this.pushModal(h);
        }
    }
    checkEndStates() {
        if (this.state.dead) {
            this.cb.render([
                "",
                this.state.deathReason ?? "You have died.",
                "",
                this.endgameSummary(),
            ], { kind: "death" });
            this.cb.onEnd?.(this.state, "death");
            return;
        }
        if (this.state.ended) {
            const ending = this.state.endingId ? this.world.endings?.[this.state.endingId] : undefined;
            // Record survival onto state (default: survived, unless the ending says
            // otherwise). Drives life/death flavour; an ending may have set it already.
            if (ending && this.state.survived === undefined) {
                this.state.survived = ending.survived ?? true;
            }
            // 1. Ending narrative.
            if (ending) {
                const text = typeof ending.text === "function" ? ending.text(this.state) : ending.text;
                this.cb.render(["", text], { kind: "ending" });
            }
            // 2. Score / turns summary (with the ending's forced rank if any).
            this.cb.render(["", this.endgameSummary(ending?.forcedRank)], { kind: "ending" });
            // 3. This ending's OWN closing passage (no shared universal epilogue —
            //    the severance reveal is just the Loyal ending's closer, etc.).
            if (ending?.closingText) {
                const closer = typeof ending.closingText === "function"
                    ? ending.closingText(this.state)
                    : ending.closingText;
                if (closer)
                    this.cb.render(["", closer], { kind: "ending" });
            }
            this.cb.onEnd?.(this.state, "ending");
        }
    }
    endgameSummary(forcedRank) {
        const s = this.state;
        // A forced rank (from the ending) supersedes the score-band mapping.
        const rank = forcedRank ?? this.world.rankFromScore?.(s.score, s.maxScore);
        const base = `You scored ${s.score} out of a possible ${s.maxScore}, in ${s.turns} turn${s.turns === 1 ? "" : "s"}.`;
        return rank ? `${base}\n\nRank: ${rank}` : base;
    }
    refreshHeader() {
        const r = this.world.rooms[this.state.currentRoom];
        const aliasRaw = this.state.flags["PC_ALIAS"];
        const alias = typeof aliasRaw === "string" && aliasRaw.length > 0 ? aliasRaw : undefined;
        this.cb.updateHeader(this.state, r?.name ?? "—", alias);
    }
}
