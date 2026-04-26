// =============================================================================
// SCENARIO EDITOR  (scenario_editor.js)
// Age of Empires II–style developer scenario editor.
// INTERFACE ONLY — all buttons are visual stubs.
//
// ARCHITECTURE OVERVIEW (for future Claude):
// ─────────────────────────────────────────────────────────────────────────────
// window.ScenarioEditor
//   .open()     — builds & shows the full editor DOM, pauses the game
//   .close()    — tears down DOM, resumes the game
//
// DOM STRUCTURE (injected into document.body):
//   #se-root                     ← Full-screen fixed overlay
//     #se-titlebar               ← Top bar: file ops + mode tabs + close
//     #se-workspace              ← flex row: left panel | center canvas | right panel
//       #se-left-panel           ← Tool palette + Terrain tiles + Brush size
//       #se-center               ← flex column: toolbar ribbon | map viewport | status bar
//         #se-ribbon             ← Secondary toolbar (zoom, grid, snap, etc.)
//         #se-viewport           ← The map canvas area (div, future: canvas)
//         #se-statusbar          ← Bottom status strip
//       #se-right-panel          ← Properties inspector (faction/NPC/city config)
//     #se-timeline               ← Bottom drawer: triggers, chronology, dialogue
//       #se-timeline-tabs        ← Tabs: Triggers | Objectives | Dialogue | Economy
//       #se-timeline-body        ← Content area for whichever tab is active
//
// MODES (top tab bar, mutually exclusive):
//   MAP        — terrain painting, tile placement, island generation
//   FACTIONS   — assign factions to regions, set colours, diplomacy
//   CITIES     — place/move/delete settlements, configure pop/gold/food/garrison
//   NPCS       — configure NPC armies, patrol routes, spawn rules
//   TRIGGERS   — chronological event scripting with dialogue & economy hooks
//
// DATA FLOW (FUTURE CLAUDE — implement in Phase 2):
//   • Each mode should read from / write to a global `window._seScenario` object:
//       _seScenario = {
//           meta:       { name, author, description, mode },
//           mapTiles:   [ [tile,…], … ],  // COLS × ROWS 2D array of tile names
//           factions:   { …FACTIONS_story1 },
//           cities:     [ …FIXED_SETTLEMENTS_story1 ],
//           npcs:       [ …globalNPCs snapshot ],
//           triggers:   [ { id, time, condition, actions:[], dialogue } ]
//       }
//   • The MAP panel canvas should render using the same PALETTE object and
//     TILE_SIZE constants from sandbox_overworld.js / story1_map_and_update.js.
//   • The Export button should serialise *seScenario → JSON → localStorage
//     key “SE_scenario*<name>” so save_system.js can pick it up.
//   • The Load button should open a file picker or list saved scenarios.
//
// TILE PALETTE (future Claude: pull dynamically from PALETTE keys):
//   All tiles currently used in story1_map_and_update.js:
//   Ocean, Coastal, River, Plains, Steppes, Forest, Dense Forest,
//   Highlands, Mountains
//   (Do NOT add Desert / Dunes for Story 1 — wrong climate)
//
// FACTION CONFIG (future Claude):
//   Right panel faction form should push changes into FACTIONS[name] directly
//   and call applyStory1Factions() if in Story1 mode.
//
// CITY CONFIG (future Claude):
//   City rows in the city list should allow drag on the viewport canvas to
//   reposition.  nx/ny should be stored and pixel coords derived via
//   nx*WORLD_WIDTH / ny*WORLD_HEIGHT.  Snap-to-land logic from
//   _s1SnapToLand() in story1_map_and_update.js should be reused.
//
// TRIGGER SYSTEM (future Claude):
//   Triggers fire when: turn count, player position, city captured, faction
//   eliminated, or custom condition (JS string eval — dev-only).
//   Each trigger has: id, label, condition (type+params), actions array.
//   Actions: showDialogue, setRelation, spawnArmy, giveGold, lockCity,
//            playSound, setObjective, setWeather.
// =============================================================================

window.ScenarioEditor = (function () {
“use strict”;

```
// ── Internal state ────────────────────────────────────────────────────────
let _root          = null;   // The #se-root element
let _activeMode    = "MAP";  // MAP | FACTIONS | CITIES | NPCS | TRIGGERS
let _activeTab     = "TRIGGERS"; // bottom panel tab
let _activeTool    = "PAINT";    // PAINT | ERASE | SELECT | PLACE | INSPECT
let _activeTile    = "Plains";   // currently selected tile for painting
let _brushSize     = 1;          // 1 | 3 | 5

// ── CSS custom properties (AoE2 stone + gold palette) ─────────────────────
const CSS = `
    /* ── RESET & ROOT ─────────────────────────────────────────────── */
    #se-root *, #se-root *::before, #se-root *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        user-select: none;
        -webkit-user-select: none;
    }
    #se-root {
        --se-bg:         #1a140e;
        --se-panel:      #221a12;
        --se-panel-alt:  #2c2016;
        --se-border:     #5a4020;
        --se-border-hi:  #c8921a;
        --se-gold:       #e8b832;
        --se-gold-dim:   #a07820;
        --se-text:       #d8c890;
        --se-text-dim:   #8a7858;
        --se-text-hi:    #fff8e0;
        --se-red:        #c83820;
        --se-blue:       #2868a8;
        --se-green:      #3a8830;
        --se-accent:     #c07828;
        --se-stone:      #3a2e22;
        --se-stone-hi:   #4e4030;
        --se-inset:      #120e08;
        font-family: 'Georgia', 'Times New Roman', serif;
        color: var(--se-text);
        position: fixed;
        inset: 0;
        z-index: 20000;
        background: var(--se-bg);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    /* ── SCROLLBARS ────────────────────────────────────────────────── */
    #se-root ::-webkit-scrollbar { width: 8px; height: 8px; }
    #se-root ::-webkit-scrollbar-track { background: var(--se-inset); }
    #se-root ::-webkit-scrollbar-thumb { background: var(--se-border); border-radius: 2px; }
    #se-root ::-webkit-scrollbar-thumb:hover { background: var(--se-gold-dim); }

    /* ── TITLEBAR ──────────────────────────────────────────────────── */
    #se-titlebar {
        flex-shrink: 0;
        height: 42px;
        background: linear-gradient(to bottom, #3c2c14, #221a0e);
        border-bottom: 2px solid var(--se-border-hi);
        display: flex;
        align-items: stretch;
        gap: 0;
        box-shadow: 0 3px 12px rgba(0,0,0,0.6);
    }
    .se-logo {
        display: flex;
        align-items: center;
        padding: 0 16px;
        gap: 8px;
        border-right: 1px solid var(--se-border);
        color: var(--se-gold);
        font-size: 14px;
        font-weight: bold;
        letter-spacing: 2px;
        text-transform: uppercase;
        white-space: nowrap;
        text-shadow: 0 0 8px rgba(232,184,50,0.5);
    }
    .se-logo span { font-size: 18px; }

    /* File ops cluster */
    .se-file-ops {
        display: flex;
        align-items: center;
        padding: 0 8px;
        gap: 2px;
        border-right: 1px solid var(--se-border);
    }

    /* Mode tabs */
    .se-mode-tabs {
        display: flex;
        align-items: stretch;
        flex: 1;
        padding: 0 8px;
        gap: 2px;
    }
    .se-mode-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 18px;
        cursor: pointer;
        border: none;
        background: transparent;
        color: var(--se-text-dim);
        font-family: 'Georgia', serif;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
        position: relative;
        transition: color 0.15s, background 0.15s;
        border-bottom: 3px solid transparent;
        margin-bottom: -2px;
    }
    .se-mode-tab:hover { color: var(--se-text); background: rgba(255,255,255,0.05); }
    .se-mode-tab.active {
        color: var(--se-gold);
        border-bottom-color: var(--se-gold);
        background: rgba(232,184,50,0.08);
    }
    .se-mode-tab .se-tab-icon { font-size: 14px; }

    /* Right cluster */
    .se-title-right {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 10px;
        border-left: 1px solid var(--se-border);
    }

    /* ── SHARED BUTTON STYLES ───────────────────────────────────────── */
    .se-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        background: linear-gradient(to bottom, var(--se-stone-hi), var(--se-stone));
        border: 1px solid var(--se-border);
        color: var(--se-text);
        font-family: 'Georgia', serif;
        font-size: 11px;
        cursor: pointer;
        border-radius: 2px;
        white-space: nowrap;
        transition: all 0.12s;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.8);
    }
    .se-btn:hover {
        background: linear-gradient(to bottom, #6a5030, #4e3c24);
        border-color: var(--se-gold-dim);
        color: var(--se-text-hi);
    }
    .se-btn:active { transform: translateY(1px); }
    .se-btn.primary {
        background: linear-gradient(to bottom, #7a4010, #4a2408);
        border-color: var(--se-accent);
        color: var(--se-gold);
    }
    .se-btn.primary:hover {
        background: linear-gradient(to bottom, #a85818, #7a3010);
        border-color: var(--se-gold);
    }
    .se-btn.danger { background: linear-gradient(to bottom, #6a1810, #3a0c08); border-color: var(--se-red); color: #ff8878; }
    .se-btn.danger:hover { background: linear-gradient(to bottom, #8a2818, #5a1810); }
    .se-btn.success { background: linear-gradient(to bottom, #1a5020, #0e3014); border-color: var(--se-green); color: #80e890; }
    .se-btn.icon-only { padding: 4px 7px; font-size: 13px; }
    .se-btn[disabled], .se-btn.stub {
        opacity: 0.45;
        cursor: not-allowed;
        pointer-events: auto; /* keep hover tooltip visible even if disabled */
    }

    /* ── WORKSPACE ─────────────────────────────────────────────────── */
    #se-workspace {
        flex: 1;
        display: flex;
        overflow: hidden;
        min-height: 0;
    }

    /* ── LEFT PANEL ─────────────────────────────────────────────────── */
    #se-left-panel {
        width: 190px;
        flex-shrink: 0;
        background: var(--se-panel);
        border-right: 2px solid var(--se-border);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    /* ── SECTION HEADER ─────────────────────────────────────────────── */
    .se-section-header {
        padding: 6px 10px;
        background: linear-gradient(to right, var(--se-stone), transparent);
        border-bottom: 1px solid var(--se-border);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: var(--se-gold-dim);
    }

    /* ── TOOL PALETTE ───────────────────────────────────────────────── */
    .se-tool-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 3px;
        padding: 8px;
    }
    .se-tool {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 6px 2px;
        background: var(--se-stone);
        border: 1px solid var(--se-border);
        border-radius: 2px;
        cursor: pointer;
        font-size: 9px;
        color: var(--se-text-dim);
        transition: all 0.12s;
    }
    .se-tool:hover { background: var(--se-stone-hi); color: var(--se-text); border-color: var(--se-gold-dim); }
    .se-tool.active {
        background: linear-gradient(to bottom, #5a3a10, #3a2208);
        border-color: var(--se-gold);
        color: var(--se-gold);
        box-shadow: 0 0 6px rgba(232,184,50,0.3) inset;
    }
    .se-tool-icon { font-size: 16px; }

    /* ── TILE PALETTE ───────────────────────────────────────────────── */
    .se-tile-palette {
        flex: 1;
        overflow-y: auto;
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    .se-tile-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        border-radius: 2px;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.1s;
    }
    .se-tile-row:hover { background: var(--se-stone-hi); border-color: var(--se-border); }
    .se-tile-row.active { background: #3a2808; border-color: var(--se-gold); }
    .se-tile-swatch {
        width: 20px;
        height: 20px;
        border-radius: 2px;
        border: 1px solid rgba(0,0,0,0.5);
        flex-shrink: 0;
    }
    .se-tile-name { font-size: 11px; }

    /* Brush size */
    .se-brush-row {
        padding: 8px;
        border-top: 1px solid var(--se-border);
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .se-brush-row label { font-size: 10px; color: var(--se-text-dim); text-transform: uppercase; letter-spacing: 1px; }
    .se-brush-btns { display: flex; gap: 4px; }
    .se-brush-btn {
        flex: 1; padding: 4px; text-align: center;
        background: var(--se-stone); border: 1px solid var(--se-border);
        cursor: pointer; font-family: 'Georgia', serif; font-size: 11px;
        color: var(--se-text-dim); border-radius: 2px;
        transition: all 0.1s;
    }
    .se-brush-btn:hover { border-color: var(--se-gold-dim); color: var(--se-text); }
    .se-brush-btn.active { background: #3a2808; border-color: var(--se-gold); color: var(--se-gold); }

    /* ── CENTER AREA ────────────────────────────────────────────────── */
    #se-center {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
    }

    /* ── RIBBON TOOLBAR ─────────────────────────────────────────────── */
    #se-ribbon {
        flex-shrink: 0;
        height: 36px;
        background: var(--se-panel-alt);
        border-bottom: 1px solid var(--se-border);
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 0 8px;
    }
    .se-ribbon-sep {
        width: 1px;
        height: 20px;
        background: var(--se-border);
        margin: 0 4px;
    }
    .se-ribbon-label {
        font-size: 10px;
        color: var(--se-text-dim);
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-right: 3px;
    }
    .se-zoom-display {
        font-size: 11px;
        color: var(--se-text);
        background: var(--se-inset);
        border: 1px solid var(--se-border);
        padding: 2px 8px;
        min-width: 46px;
        text-align: center;
    }

    /* ── MAP VIEWPORT ───────────────────────────────────────────────── */
    #se-viewport {
        flex: 1;
        background: #0a0806;
        position: relative;
        overflow: hidden;
        cursor: crosshair;
    }
    #se-viewport-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
    }
    /* Placeholder grid overlay (rendered before a real map is loaded) */
    .se-viewport-placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        pointer-events: none;
    }
    .se-viewport-placeholder .se-ph-icon { font-size: 48px; opacity: 0.18; }
    .se-viewport-placeholder .se-ph-text {
        font-size: 13px;
        color: var(--se-text-dim);
        opacity: 0.5;
        text-align: center;
        line-height: 1.8;
    }
    /* Minimap inset */
    #se-minimap {
        position: absolute;
        bottom: 10px;
        right: 10px;
        width: 130px;
        height: 90px;
        background: var(--se-inset);
        border: 2px solid var(--se-border);
        border-radius: 2px;
        overflow: hidden;
    }
    .se-minimap-label {
        position: absolute;
        top: 3px; left: 5px;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--se-text-dim);
        opacity: 0.8;
    }

    /* ── STATUS BAR ─────────────────────────────────────────────────── */
    #se-statusbar {
        flex-shrink: 0;
        height: 22px;
        background: var(--se-inset);
        border-top: 1px solid var(--se-border);
        display: flex;
        align-items: center;
        padding: 0 10px;
        gap: 20px;
        font-size: 10px;
        color: var(--se-text-dim);
    }
    .se-status-cell { display: flex; align-items: center; gap: 4px; }
    .se-status-val { color: var(--se-text); }

    /* ── RIGHT PANEL ────────────────────────────────────────────────── */
    #se-right-panel {
        width: 240px;
        flex-shrink: 0;
        background: var(--se-panel);
        border-left: 2px solid var(--se-border);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .se-right-scroll { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 10px; }

    /* Inspector card */
    .se-card {
        background: var(--se-inset);
        border: 1px solid var(--se-border);
        border-radius: 2px;
        overflow: hidden;
    }
    .se-card-header {
        padding: 5px 8px;
        background: linear-gradient(to right, #3a2808, transparent);
        border-bottom: 1px solid var(--se-border);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--se-gold-dim);
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .se-card-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; }

    /* Form fields */
    .se-field { display: flex; flex-direction: column; gap: 3px; }
    .se-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: var(--se-text-dim); }
    .se-input, .se-select, .se-textarea {
        background: #1e1608;
        border: 1px solid var(--se-border);
        color: var(--se-text);
        font-family: 'Georgia', serif;
        font-size: 11px;
        padding: 4px 6px;
        border-radius: 1px;
        width: 100%;
        outline: none;
        transition: border-color 0.1s;
    }
    .se-input:focus, .se-select:focus, .se-textarea:focus { border-color: var(--se-gold-dim); }
    .se-textarea { resize: vertical; min-height: 50px; line-height: 1.5; }
    .se-select option { background: #1e1608; }

    /* Color swatch picker row */
    .se-color-row { display: flex; align-items: center; gap: 6px; }
    .se-color-preview {
        width: 28px;
        height: 22px;
        border: 1px solid var(--se-border);
        border-radius: 2px;
        flex-shrink: 0;
        cursor: pointer;
    }
    .se-color-input { flex: 1; }

    /* Slider */
    .se-slider {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        background: var(--se-border);
        outline: none;
        border-radius: 2px;
    }
    .se-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        background: var(--se-gold);
        border-radius: 50%;
        cursor: pointer;
    }

    /* Faction list mini-table */
    .se-faction-list { display: flex; flex-direction: column; gap: 3px; }
    .se-faction-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        background: var(--se-stone);
        border: 1px solid var(--se-border);
        border-radius: 2px;
        cursor: pointer;
        transition: border-color 0.1s;
    }
    .se-faction-row:hover { border-color: var(--se-gold-dim); }
    .se-faction-row.active { border-color: var(--se-gold); background: #2c1e08; }
    .se-faction-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
        border: 1px solid rgba(0,0,0,0.5);
    }
    .se-faction-name { flex: 1; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .se-faction-badge {
        font-size: 8px;
        padding: 1px 4px;
        border-radius: 2px;
        background: rgba(255,255,255,0.08);
        color: var(--se-text-dim);
    }

    /* City list */
    .se-city-list { display: flex; flex-direction: column; gap: 3px; max-height: 180px; overflow-y: auto; }
    .se-city-row {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: 4px;
        padding: 3px 6px;
        background: var(--se-stone);
        border: 1px solid var(--se-border);
        border-radius: 2px;
        font-size: 10px;
        cursor: pointer;
        transition: border-color 0.1s;
    }
    .se-city-row:hover { border-color: var(--se-gold-dim); }
    .se-city-type-badge {
        font-size: 8px;
        padding: 1px 4px;
        border-radius: 2px;
        color: var(--se-text-dim);
        background: rgba(255,255,255,0.06);
        white-space: nowrap;
    }

    /* Two-column grid for numeric fields */
    .se-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .se-three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }

    /* ── TIMELINE PANEL ─────────────────────────────────────────────── */
    #se-timeline {
        flex-shrink: 0;
        height: 220px;
        background: var(--se-panel);
        border-top: 2px solid var(--se-border-hi);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    #se-timeline-tabs {
        flex-shrink: 0;
        height: 32px;
        background: var(--se-panel-alt);
        border-bottom: 1px solid var(--se-border);
        display: flex;
        align-items: stretch;
        gap: 0;
    }
    .se-tl-tab {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 0 16px;
        cursor: pointer;
        border: none;
        background: transparent;
        color: var(--se-text-dim);
        font-family: 'Georgia', serif;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: all 0.12s;
    }
    .se-tl-tab:hover { color: var(--se-text); background: rgba(255,255,255,0.04); }
    .se-tl-tab.active { color: var(--se-gold); border-bottom-color: var(--se-gold); background: rgba(232,184,50,0.06); }

    #se-timeline-body {
        flex: 1;
        display: flex;
        overflow: hidden;
    }

    /* Trigger lane */
    .se-trigger-lane {
        width: 220px;
        flex-shrink: 0;
        border-right: 1px solid var(--se-border);
        display: flex;
        flex-direction: column;
    }
    .se-trigger-lane-header {
        padding: 5px 8px;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--se-text-dim);
        background: var(--se-panel-alt);
        border-bottom: 1px solid var(--se-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .se-trigger-list { flex: 1; overflow-y: auto; }
    .se-trigger-item {
        padding: 6px 8px;
        border-bottom: 1px solid var(--se-border);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: background 0.1s;
    }
    .se-trigger-item:hover { background: var(--se-stone); }
    .se-trigger-item.active { background: #2c1e08; border-left: 3px solid var(--se-gold); }
    .se-trigger-num {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--se-stone-hi);
        border: 1px solid var(--se-border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        color: var(--se-text-dim);
        flex-shrink: 0;
    }
    .se-trigger-item.active .se-trigger-num { background: var(--se-gold-dim); border-color: var(--se-gold); color: #fff; }
    .se-trigger-info { flex: 1; overflow: hidden; }
    .se-trigger-label { font-size: 11px; color: var(--se-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .se-trigger-cond { font-size: 9px; color: var(--se-text-dim); margin-top: 1px; }
    .se-trigger-status {
        font-size: 9px;
        padding: 1px 5px;
        border-radius: 2px;
    }
    .se-trigger-status.enabled { background: rgba(58,136,48,0.3); color: #80e890; border: 1px solid #3a8830; }
    .se-trigger-status.disabled { background: rgba(90,50,20,0.3); color: var(--se-text-dim); border: 1px solid var(--se-border); }

    /* Timeline horizontal area */
    .se-timeline-track {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .se-track-ruler {
        height: 24px;
        border-bottom: 1px solid var(--se-border);
        background: var(--se-panel-alt);
        display: flex;
        align-items: center;
        padding: 0 8px;
        gap: 0;
        overflow: hidden;
    }
    .se-ruler-tick {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding-left: 4px;
        min-width: 80px;
        border-left: 1px solid var(--se-border);
    }
    .se-ruler-tick-label { font-size: 8px; color: var(--se-text-dim); }
    .se-track-rows { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 8px; display: flex; flex-direction: column; gap: 4px; }
    .se-track-row {
        height: 30px;
        background: var(--se-inset);
        border: 1px solid var(--se-border);
        border-radius: 2px;
        display: flex;
        align-items: center;
        padding: 0 8px;
        gap: 6px;
        font-size: 10px;
    }
    .se-track-event {
        height: 22px;
        padding: 0 8px;
        border-radius: 2px;
        display: flex;
        align-items: center;
        font-size: 10px;
        cursor: pointer;
        white-space: nowrap;
    }
    .se-track-event.dialogue { background: #3a1a68; border: 1px solid #6a3ab8; color: #c0a0ff; }
    .se-track-event.army     { background: #6a1010; border: 1px solid #a83030; color: #ffa0a0; }
    .se-track-event.economy  { background: #1a4818; border: 1px solid #3a7838; color: #90e890; }
    .se-track-event.cutscene { background: #4a3808; border: 1px solid #8a6818; color: #e8c870; }

    /* ── TRIGGER EDITOR (right side of timeline) ────────────────────── */
    .se-trig-editor {
        width: 320px;
        flex-shrink: 0;
        border-left: 1px solid var(--se-border);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .se-trig-editor-header {
        padding: 5px 10px;
        background: var(--se-panel-alt);
        border-bottom: 1px solid var(--se-border);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--se-gold-dim);
    }
    .se-trig-editor-body { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
    .se-action-list { display: flex; flex-direction: column; gap: 4px; }
    .se-action-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px;
        background: var(--se-stone);
        border: 1px solid var(--se-border);
        border-radius: 2px;
        font-size: 10px;
    }
    .se-action-handle { color: var(--se-text-dim); cursor: grab; font-size: 12px; }
    .se-action-type {
        font-size: 9px;
        padding: 1px 6px;
        border-radius: 2px;
    }
    .se-action-type.dialogue { background: rgba(106,58,184,0.4); color: #c0a0ff; }
    .se-action-type.army     { background: rgba(168,48,48,0.4); color: #ffa0a0; }
    .se-action-type.economy  { background: rgba(58,120,56,0.4); color: #90e890; }
    .se-action-type.relation { background: rgba(40,104,168,0.4); color: #90c0ff; }
    .se-action-type.sound    { background: rgba(168,120,40,0.4); color: #e8d090; }
    .se-action-detail { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--se-text); }

    /* ── DIALOGUE TAB ───────────────────────────────────────────────── */
    .se-dialogue-editor {
        flex: 1;
        padding: 10px;
        display: flex;
        gap: 10px;
        overflow: hidden;
    }
    .se-dialogue-list { width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
    .se-dialogue-item {
        padding: 6px 8px;
        background: var(--se-stone);
        border: 1px solid var(--se-border);
        border-radius: 2px;
        cursor: pointer;
        font-size: 10px;
    }
    .se-dialogue-item:hover { border-color: var(--se-gold-dim); }
    .se-dialogue-item.active { border-color: var(--se-gold); background: #2c1e08; }
    .se-dialogue-speaker { color: var(--se-gold-dim); font-size: 9px; text-transform: uppercase; margin-bottom: 3px; }
    .se-dialogue-preview { color: var(--se-text); font-style: italic; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .se-dialogue-form { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }

    /* ── ECONOMY TAB ────────────────────────────────────────────────── */
    .se-economy-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        padding: 10px;
        overflow-y: auto;
        flex: 1;
    }
    .se-economy-card {
        background: var(--se-inset);
        border: 1px solid var(--se-border);
        border-radius: 2px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .se-economy-card-title { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: var(--se-gold-dim); }
    .se-economy-value { font-size: 18px; color: var(--se-text-hi); font-weight: bold; }
    .se-economy-sub { font-size: 9px; color: var(--se-text-dim); }

    /* ── OBJECTIVES TAB ─────────────────────────────────────────────── */
    .se-obj-list { flex: 1; padding: 10px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
    .se-obj-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 6px 8px;
        background: var(--se-stone);
        border: 1px solid var(--se-border);
        border-radius: 2px;
    }
    .se-obj-num { width: 22px; height: 22px; border-radius: 50%; background: var(--se-stone-hi); border: 1px solid var(--se-border); display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
    .se-obj-body { flex: 1; }
    .se-obj-title { font-size: 12px; color: var(--se-text); margin-bottom: 2px; }
    .se-obj-desc { font-size: 10px; color: var(--se-text-dim); font-style: italic; }
    .se-obj-type { font-size: 8px; padding: 1px 5px; border-radius: 2px; white-space: nowrap; }
    .se-obj-type.primary { background: rgba(200,146,26,0.3); color: var(--se-gold); border: 1px solid var(--se-gold-dim); }
    .se-obj-type.secondary { background: rgba(90,64,32,0.3); color: var(--se-text-dim); border: 1px solid var(--se-border); }

    /* ── TOOLTIP ────────────────────────────────────────────────────── */
    .se-tooltip {
        position: fixed;
        background: #1e1608;
        border: 1px solid var(--se-gold-dim);
        color: var(--se-text);
        font-size: 11px;
        padding: 5px 10px;
        border-radius: 2px;
        pointer-events: none;
        z-index: 30000;
        max-width: 220px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.8);
        display: none;
    }

    /* ── ANIMATIONS ─────────────────────────────────────────────────── */
    @keyframes se-fadein {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    #se-root { animation: se-fadein 0.18s ease-out; }
`;

// ── Tile palette data (matches PALETTE used in sandbox_overworld.js) ────
// FUTURE CLAUDE: Pull dynamically via Object.entries(PALETTE) when PALETTE
// is confirmed to be in scope. The colours below are the actual hex values
// used by sandbox_overworld.js so the swatches are pixel-accurate.
const TILES = [
    { name: "Ocean",        color: "#1a3f5c" },
    { name: "Coastal",      color: "#2a6080" },
    { name: "River",        color: "#3a7090" },
    { name: "Plains",       color: "#6a8c3a" },
    { name: "Steppes",      color: "#9a9c5a" },
    { name: "Forest",       color: "#2a5a1a" },
    { name: "Dense Forest", color: "#1a3a0e" },
    { name: "Highlands",    color: "#7a6040" },
    { name: "Mountains",    color: "#4a3820" },
];

// ── Faction data (mirrors npc_systems_story1.js FACTIONS_story1) ────────
// FUTURE CLAUDE: Pull dynamically via Object.entries(FACTIONS) so that
// sandbox and story1 factions are always in sync with the editor.
const FACTIONS_PREVIEW = [
    { name: "Kamakura Shogunate", color: "#c62828", role: "Major" },
    { name: "Shoni Clan",         color: "#1565c0", role: "Major" },
    { name: "So Clan",            color: "#2e7d32", role: "Regional" },
    { name: "Kikuchi Clan",       color: "#6a1b9a", role: "Regional" },
    { name: "Otomo Clan",         color: "#e65100", role: "Regional" },
    { name: "Matsura Clan",       color: "#00695c", role: "Regional" },
    { name: "Yuan Dynasty",       color: "#b71c1c", role: "Invader" },
    { name: "Ronin",              color: "#37474f", role: "Neutral" },
    { name: "Kyushu Defender",    color: "#ffffff", role: "Player" },
];

// ── Sample trigger data (stub — future Claude: bind to _seScenario.triggers)
const TRIGGERS_PREVIEW = [
    { id: 1, label: "Yuan Fleet Sighted",     cond: "Turn 1",          status: "enabled"  },
    { id: 2, label: "Tsushima Falls",          cond: "City Captured",   status: "enabled"  },
    { id: 3, label: "Iki Garrison Rallies",    cond: "Unit in Region",  status: "enabled"  },
    { id: 4, label: "Hakata Bay Landing",      cond: "Turn 4",          status: "enabled"  },
    { id: 5, label: "Hakozaki Shrine Burns",   cond: "City Destroyed",  status: "enabled"  },
    { id: 6, label: "Torikai Battle Begins",   cond: "Unit in Region",  status: "enabled"  },
    { id: 7, label: "Mizuki Last Stand",       cond: "City HP < 30%",   status: "disabled" },
    { id: 8, label: "Storm Kamikaze",          cond: "Turn 8",          status: "disabled" },
];

// ── Sample objectives (stub) ─────────────────────────────────────────────
const OBJECTIVES_PREVIEW = [
    { num: 1, title: "Hold Hakata Bay",     desc: "Prevent Yuan forces from establishing a beachhead for 6 turns.", type: "primary"   },
    { num: 2, title: "Defend Dazaifu",      desc: "The Mizuki earthwork must not fall.",                           type: "primary"   },
    { num: 3, title: "Rally the Clans",     desc: "Bring Kikuchi Clan and Ōtomo Clan into your alliance.",        type: "secondary" },
    { num: 4, title: "Destroy the Fleet",   desc: "Sink or scatter 50% of Yuan ships in Hakata Bay.",            type: "secondary" },
    { num: 5, title: "Recover Tsushima",    desc: "Recapture Sasuura from Yuan control.",                         type: "secondary" },
];

// ── Build the full editor DOM ─────────────────────────────────────────────
function _build() {
    const root = document.createElement("div");
    root.id = "se-root";

    // ── Inject CSS ───────────────────────────────────────────────────────
    const style = document.createElement("style");
    style.id = "se-styles";
    style.textContent = CSS;
    document.head.appendChild(style);

    root.innerHTML = `
        ${_buildTitlebar()}
        <div id="se-workspace">
            ${_buildLeftPanel()}
            <div id="se-center">
                ${_buildRibbon()}
                <div id="se-viewport">
                    <canvas id="se-viewport-canvas"></canvas>
                    <div class="se-viewport-placeholder">
                        <div class="se-ph-icon">🗺</div>
                        <div class="se-ph-text">
                            No map loaded.<br>
                            Click <strong style="color:#c8921a">New Map</strong> or <strong style="color:#c8921a">Load Scenario</strong><br>
                            to begin editing.
                        </div>
                    </div>
                    <div id="se-minimap">
                        <div class="se-minimap-label">Overview</div>
                    </div>
                </div>
                ${_buildStatusBar()}
            </div>
            ${_buildRightPanel()}
        </div>
        ${_buildTimeline()}
        <div class="se-tooltip" id="se-tooltip"></div>
    `;

    return root;
}

// ── Titlebar ─────────────────────────────────────────────────────────────
function _buildTitlebar() {
    const modeTabs = [
        { id: "MAP",      icon: "🏔", label: "Map Editor" },
        { id: "FACTIONS", icon: "⚑",  label: "Factions"   },
        { id: "CITIES",   icon: "🏯", label: "Cities"     },
        { id: "NPCS",     icon: "⚔",  label: "NPCs"       },
        { id: "TRIGGERS", icon: "⚡", label: "Triggers"   },
    ];

    return `
    <div id="se-titlebar">
        <div class="se-logo">
            <span>📜</span>
            SCENARIO EDITOR
        </div>

        <!-- File operations -->
        <!-- FUTURE CLAUDE:
             • "New Map" → prompt for COLS×ROWS, generate blank worldMap_story1 array,
               fill with "Ocean" tiles, call generateMap_story1() variant.
             • "Load Scenario" → read from localStorage keys matching "SE_scenario_*"
               or open file picker for .json export.
             • "Save" → JSON.stringify(_seScenario) → localStorage / download.
             • "Export to Game" → call applyStory1Factions(), then populate
               worldMap and cities arrays from _seScenario, then call initGame_story1().
             • "Test Play" → temporarily patch initGame_story1 to use _seScenario data
               and launch without the loading screen countdown. -->
        <div class="se-file-ops">
            <button class="se-btn stub" title="[FUTURE] Create a blank map with specified dimensions">+ New Map</button>
            <button class="se-btn stub" title="[FUTURE] Load an existing .json scenario file">📂 Load</button>
            <button class="se-btn primary stub" title="[FUTURE] Save scenario to localStorage">💾 Save</button>
            <button class="se-btn stub" title="[FUTURE] Export scenario as JSON file">↗ Export</button>
            <button class="se-btn success stub" title="[FUTURE] Launch the scenario in-game for testing">▶ Test Play</button>
        </div>

        <!-- Mode tabs -->
        <div class="se-mode-tabs">
            ${modeTabs.map(t => `
            <button class="se-mode-tab ${t.id === _activeMode ? 'active' : ''}"
                    data-mode="${t.id}"
                    onclick="window.ScenarioEditor._setMode('${t.id}')"
                    title="Switch to ${t.label} mode">
                <span class="se-tab-icon">${t.icon}</span>
                ${t.label}
            </button>`).join('')}
        </div>

        <!-- Right controls -->
        <!-- FUTURE CLAUDE: Undo/Redo should maintain a _seHistory[] stack of
             serialised tile/city/faction snapshots (max 50 entries).
             Each paint stroke, city placement, or faction change pushes to stack. -->
        <div class="se-title-right">
            <button class="se-btn icon-only stub" title="[FUTURE] Undo last action (Ctrl+Z)">↩</button>
            <button class="se-btn icon-only stub" title="[FUTURE] Redo last undone action (Ctrl+Y)">↪</button>
            <button class="se-btn icon-only stub" title="[FUTURE] Open editor settings / keybinds">⚙</button>
            <button class="se-btn danger" onclick="window.ScenarioEditor.close()" title="Close Scenario Editor and return to Main Menu">✕ Close</button>
        </div>
    </div>`;
}

// ── Left Panel ────────────────────────────────────────────────────────────
function _buildLeftPanel() {
    const tools = [
        { id: "PAINT",   icon: "🖌", label: "Paint",   tip: "Paint terrain tiles onto the map" },
        { id: "ERASE",   icon: "🧹", label: "Erase",   tip: "Erase tiles back to Ocean" },
        { id: "FILL",    icon: "🪣", label: "Fill",    tip: "[FUTURE] Flood-fill a contiguous region" },
        { id: "SELECT",  icon: "⬚",  label: "Select",  tip: "[FUTURE] Marquee-select a region" },
        { id: "PLACE",   icon: "📍", label: "Place",   tip: "Place a city or NPC unit" },
        { id: "INSPECT", icon: "🔍", label: "Inspect", tip: "Click any tile or entity to view its properties" },
        { id: "MOVE",    icon: "✥",  label: "Move",    tip: "[FUTURE] Drag cities or NPC units to new positions" },
        { id: "MEASURE", icon: "📏", label: "Measure", tip: "[FUTURE] Measure tile distances" },
    ];

    return `
    <div id="se-left-panel">
        <div class="se-section-header">Tools</div>
        <div class="se-tool-grid">
            ${tools.map(t => `
            <div class="se-tool ${t.id === _activeTool ? 'active' : ''}"
                 data-tool="${t.id}"
                 title="${t.tip}"
                 onclick="window.ScenarioEditor._setTool('${t.id}')">
                <span class="se-tool-icon">${t.icon}</span>
                ${t.label}
            </div>`).join('')}
        </div>

        <div class="se-section-header">Terrain Tiles</div>
        <!-- FUTURE CLAUDE: Clicking a tile row should:
             1. Set _activeTile to the tile name
             2. Switch _activeTool to PAINT if not already
             3. Update left panel .active classes
             All paint strokes write to _seScenario.mapTiles[x][y]
             and redraw the viewport canvas. -->
        <div class="se-tile-palette">
            ${TILES.map(t => `
            <div class="se-tile-row ${t.name === _activeTile ? 'active' : ''}"
                 data-tile="${t.name}"
                 onclick="window.ScenarioEditor._setTile('${t.name}')"
                 title="Paint with: ${t.name}">
                <div class="se-tile-swatch" style="background:${t.color}"></div>
                <span class="se-tile-name">${t.name}</span>
            </div>`).join('')}
        </div>

        <!-- Brush size controls -->
        <!-- FUTURE CLAUDE: Brush size affects how many tiles are painted per
             mouse event. Size 1 = 1 tile, Size 3 = 3×3 block, Size 5 = 5×5 block.
             For Size 5, iterate from (tx-2,ty-2) to (tx+2,ty+2). -->
        <div class="se-brush-row">
            <label>Brush Size</label>
            <div class="se-brush-btns">
                <div class="se-brush-btn ${_brushSize===1?'active':''}"
                     onclick="window.ScenarioEditor._setBrush(1)"
                     title="1×1 tile brush">1×1</div>
                <div class="se-brush-btn ${_brushSize===3?'active':''}"
                     onclick="window.ScenarioEditor._setBrush(3)"
                     title="3×3 tile brush">3×3</div>
                <div class="se-brush-btn ${_brushSize===5?'active':''}"
                     onclick="window.ScenarioEditor._setBrush(5)"
                     title="5×5 tile brush">5×5</div>
            </div>
        </div>
    </div>`;
}

// ── Ribbon ────────────────────────────────────────────────────────────────
function _buildRibbon() {
    return `
    <div id="se-ribbon">
        <!-- Zoom controls -->
        <!-- FUTURE CLAUDE: Zoom should scale the viewport canvas transform.
             Use CSS transform: scale(zoom) on #se-viewport-canvas.
             Store zoom level in _seZoom (range 0.25–4.0, step 0.25).
             Pan is handled by mousedown+mousemove on the viewport with
             _seOffsetX / _seOffsetY state variables. -->
        <span class="se-ribbon-label">Zoom</span>
        <button class="se-btn icon-only stub" title="Zoom out">−</button>
        <div class="se-zoom-display">100%</div>
        <button class="se-btn icon-only stub" title="Zoom in">+</button>
        <button class="se-btn stub" title="[FUTURE] Fit entire map in viewport">Fit</button>

        <div class="se-ribbon-sep"></div>

        <!-- Grid / Snap toggles -->
        <!-- FUTURE CLAUDE: Grid overlay draws a 1px rgba(255,255,255,0.08)
             line every TILE_SIZE pixels on a separate canvas layer rendered
             above the terrain canvas but below the entity canvas. -->
        <button class="se-btn stub" title="[FUTURE] Toggle tile grid overlay">⊞ Grid</button>
        <button class="se-btn stub" title="[FUTURE] Snap entity placement to tile centres">◫ Snap</button>
        <button class="se-btn stub" title="[FUTURE] Show faction territory overlay">⚑ Territory</button>
        <button class="se-btn stub" title="[FUTURE] Show NPC patrol route arrows">→ Routes</button>
        <button class="se-btn stub" title="[FUTURE] Show trigger zones as tinted rectangles">⚡ Zones</button>

        <div class="se-ribbon-sep"></div>

        <!-- Map generation helpers -->
        <!-- FUTURE CLAUDE: "Gen Island" should call generateMap_story1() with
             the current _seScenario.meta dimensions and blit the result into
             the viewport canvas. "Smooth" applies a 3×3 blur convolution to
             the tile array (neighbour-majority vote per tile). -->
        <button class="se-btn stub" title="[FUTURE] Procedurally generate island terrain using story1_map_and_update.js">🏔 Gen Island</button>
        <button class="se-btn stub" title="[FUTURE] Smooth jagged coastlines using neighbour-vote algorithm">≈ Smooth</button>
        <button class="se-btn stub" title="[FUTURE] Auto-place rivers following elevation gradient">〜 Rivers</button>
    </div>`;
}

// ── Status Bar ────────────────────────────────────────────────────────────
function _buildStatusBar() {
    return `
    <div id="se-statusbar">
        <div class="se-status-cell">Mode: <span class="se-status-val" id="se-st-mode">${_activeMode}</span></div>
        <div class="se-status-cell">Tool: <span class="se-status-val" id="se-st-tool">${_activeTool}</span></div>
        <div class="se-status-cell">Tile: <span class="se-status-val" id="se-st-tile">${_activeTile}</span></div>
        <div class="se-status-cell">Cursor: <span class="se-status-val" id="se-st-cursor">—</span></div>
        <div class="se-status-cell">Brush: <span class="se-status-val" id="se-st-brush">${_brushSize}×${_brushSize}</span></div>
        <div class="se-status-cell" style="margin-left:auto">Scenario: <span class="se-status-val" id="se-st-scenario">[Unsaved]</span></div>
    </div>`;
}

// ── Right Panel ───────────────────────────────────────────────────────────
function _buildRightPanel() {
    return `
    <div id="se-right-panel">
        <div class="se-section-header">Inspector</div>
        <div class="se-right-scroll">

            <!-- ── Scenario Meta ──────────────────────────────────────── -->
            <!-- FUTURE CLAUDE: These fields write to _seScenario.meta.
                 The "Map Mode" dropdown sets which initGame_* function is
                 called during Test Play (initGame (sandbox) vs initGame_story1). -->
            <div class="se-card">
                <div class="se-card-header">📋 Scenario Meta</div>
                <div class="se-card-body">
                    <div class="se-field">
                        <span class="se-label">Name</span>
                        <input class="se-input stub" type="text" placeholder="Bun'ei Invasion — 1274" />
                    </div>
                    <div class="se-field">
                        <span class="se-label">Author</span>
                        <input class="se-input stub" type="text" placeholder="Developer" />
                    </div>
                    <div class="se-field">
                        <span class="se-label">Map Mode</span>
                        <select class="se-select stub">
                            <option>Story 1 — Northern Kyūshū</option>
                            <option>Sandbox</option>
                            <option>[Future] Story 2</option>
                        </select>
                    </div>
                    <div class="se-two-col">
                        <div class="se-field">
                            <span class="se-label">Map Width (tiles)</span>
                            <input class="se-input stub" type="number" value="160" min="40" max="512" />
                        </div>
                        <div class="se-field">
                            <span class="se-label">Map Height (tiles)</span>
                            <input class="se-input stub" type="number" value="120" min="40" max="512" />
                        </div>
                    </div>
                    <div class="se-field">
                        <span class="se-label">Historical Date</span>
                        <input class="se-input stub" type="text" placeholder="November 1274" />
                    </div>
                </div>
            </div>

            <!-- ── Faction List ───────────────────────────────────────── -->
            <!-- FUTURE CLAUDE: Clicking a faction row should populate the
                 Faction Config card below with that faction's data from
                 FACTIONS[name]. Colour changes call
                 document.querySelectorAll('.se-faction-dot').
                 GeoWeight sliders write to FACTIONS_story1[name].geoWeight
                 and immediately trigger regenerateNPCCities() if the map
                 has been generated. -->
            <div class="se-card">
                <div class="se-card-header">
                    ⚑ Factions
                    <button class="se-btn primary stub" style="margin-left:auto;font-size:9px;padding:2px 6px" title="[FUTURE] Add a new faction">+ Add</button>
                </div>
                <div class="se-card-body">
                    <div class="se-faction-list">
                        ${FACTIONS_PREVIEW.map((f, i) => `
                        <div class="se-faction-row ${i===1?'active':''}"
                             title="Click to configure ${f.name}">
                            <div class="se-faction-dot" style="background:${f.color}"></div>
                            <span class="se-faction-name">${f.name}</span>
                            <span class="se-faction-badge">${f.role}</span>
                        </div>`).join('')}
                    </div>
                </div>
            </div>

            <!-- ── Faction Config ─────────────────────────────────────── -->
            <!-- FUTURE CLAUDE: All fields here must be connected to the
                 selected FACTIONS_story1 entry. The "Has Cities" toggle
                 controls whether this faction can own settlements (Yuan/Ronin = off).
                 GeoWeight sliders call getFactionByGeography() internally to
                 preview which zone the faction dominates. -->
            <div class="se-card">
                <div class="se-card-header">⚙ Faction Config — Shoni Clan</div>
                <div class="se-card-body">
                    <div class="se-field">
                        <span class="se-label">Display Name</span>
                        <input class="se-input stub" type="text" value="Shoni Clan" />
                    </div>
                    <div class="se-field">
                        <span class="se-label">Faction Color</span>
                        <div class="se-color-row">
                            <div class="se-color-preview" style="background:#1565c0"></div>
                            <input class="se-input stub se-color-input" type="text" value="#1565c0" />
                        </div>
                    </div>
                    <div class="se-two-col">
                        <div class="se-field">
                            <span class="se-label">Role</span>
                            <select class="se-select stub">
                                <option>Major</option>
                                <option>Regional</option>
                                <option>Invader</option>
                                <option>Neutral</option>
                                <option>Player</option>
                            </select>
                        </div>
                        <div class="se-field">
                            <span class="se-label">Has Cities</span>
                            <select class="se-select stub">
                                <option selected>Yes</option>
                                <option>No (Army Only)</option>
                            </select>
                        </div>
                    </div>
                    <div class="se-section-header" style="margin:4px -8px;padding-left:8px">GeoWeight (0–1)</div>
                    <div class="se-field">
                        <span class="se-label">North ↑  <span style="float:right;color:var(--se-text)">0.25</span></span>
                        <input class="se-slider stub" type="range" min="0" max="1" step="0.01" value="0.25" />
                    </div>
                    <div class="se-field">
                        <span class="se-label">South ↓  <span style="float:right;color:var(--se-text)">0.55</span></span>
                        <input class="se-slider stub" type="range" min="0" max="1" step="0.01" value="0.55" />
                    </div>
                    <div class="se-field">
                        <span class="se-label">West ←   <span style="float:right;color:var(--se-text)">0.35</span></span>
                        <input class="se-slider stub" type="range" min="0" max="1" step="0.01" value="0.35" />
                    </div>
                    <div class="se-field">
                        <span class="se-label">East →   <span style="float:right;color:var(--se-text)">0.65</span></span>
                        <input class="se-slider stub" type="range" min="0" max="1" step="0.01" value="0.65" />
                    </div>
                    <div class="se-field">
                        <span class="se-label">Syllable Pool (comma-separated)</span>
                        <textarea class="se-textarea stub">Haka,Sho,Kage,Haru,Kawa,Yama,Hana,Tsuki,Mori,Take,Ishi,Umi,Hako,Naka,Zaki,Saki,Ura</textarea>
                    </div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap">
                        <button class="se-btn primary stub" style="flex:1">Apply to Game</button>
                        <button class="se-btn danger stub">Delete</button>
                    </div>
                </div>
            </div>

            <!-- ── City List ──────────────────────────────────────────── -->
            <!-- FUTURE CLAUDE: City rows are built from FIXED_SETTLEMENTS_story1.
                 Clicking a row selects it and highlights its position on the
                 viewport (draw a gold ring at city.nx*viewW, city.ny*viewH).
                 Dragging on the viewport while a city is selected updates its nx/ny.
                 "+ Add City" opens an inline form that appends to FIXED_SETTLEMENTS_story1
                 and pushes to cities_story1. -->
            <div class="se-card">
                <div class="se-card-header">
                    🏯 Settlements
                    <button class="se-btn primary stub" style="margin-left:auto;font-size:9px;padding:2px 6px">+ Add City</button>
                </div>
                <div class="se-card-body" style="padding:4px">
                    <div class="se-city-list">
                        ${[
                            {n:"Hakata",         t:"MAJOR_CITY", f:"Shoni"},
                            {n:"Dazaifu",        t:"MAJOR_CITY", f:"Kamakura"},
                            {n:"Mizuki",         t:"FORTRESS",   f:"Kamakura"},
                            {n:"Hakozaki",       t:"TOWN",       f:"Shoni"},
                            {n:"Munakata",       t:"TOWN",       f:"Shoni"},
                            {n:"Karatsu",        t:"TOWN",       f:"Matsura"},
                            {n:"Torikai",        t:"VILLAGE",    f:"Kikuchi"},
                            {n:"Sohara",         t:"VILLAGE",    f:"Shoni"},
                            {n:"Imazu",          t:"VILLAGE",    f:"Matsura"},
                            {n:"Nishijin",       t:"VILLAGE",    f:"Shoni"},
                            {n:"Akasaka",        t:"VILLAGE",    f:"Shoni"},
                            {n:"Sasuura",        t:"TOWN",       f:"So"},
                            {n:"Iki-no-Matsubara",t:"TOWN",      f:"Shoni"},
                            {n:"Shiga",          t:"VILLAGE",    f:"Shoni"},
                            {n:"Noko",           t:"VILLAGE",    f:"Shoni"},
                            {n:"Genkai",         t:"VILLAGE",    f:"Shoni"},
                        ].map(c=>`
                        <div class="se-city-row" title="Click to select and inspect ${c.n}">
                            <span>${c.n}</span>
                            <span class="se-city-type-badge">${c.t}</span>
                            <button class="se-btn icon-only stub" style="font-size:9px;padding:1px 4px" title="[FUTURE] Focus viewport on ${c.n}">◎</button>
                        </div>`).join('')}
                    </div>
                </div>
            </div>

            <!-- ── Selected City Config ───────────────────────────────── -->
            <!-- FUTURE CLAUDE: This card is populated when a city row or a
                 city marker on the viewport is clicked.
                 All fields write directly to the matching entry in
                 FIXED_SETTLEMENTS_story1 (matched by name).
                 nx/ny fields are two-way synced with drag on the viewport. -->
            <div class="se-card">
                <div class="se-card-header">🏯 City Config — Hakata</div>
                <div class="se-card-body">
                    <div class="se-field">
                        <span class="se-label">Settlement Name</span>
                        <input class="se-input stub" type="text" value="Hakata" />
                    </div>
                    <div class="se-two-col">
                        <div class="se-field">
                            <span class="se-label">Type</span>
                            <select class="se-select stub">
                                <option>MAJOR_CITY</option>
                                <option>FORTRESS</option>
                                <option>TOWN</option>
                                <option>VILLAGE</option>
                            </select>
                        </div>
                        <div class="se-field">
                            <span class="se-label">Owning Faction</span>
                            <select class="se-select stub">
                                <option>Shoni Clan</option>
                                <option>Kamakura Shogunate</option>
                                <option>So Clan</option>
                                <option>Kikuchi Clan</option>
                                <option>Otomo Clan</option>
                                <option>Matsura Clan</option>
                                <option>Kyushu Defender</option>
                            </select>
                        </div>
                    </div>
                    <div class="se-two-col">
                        <div class="se-field">
                            <span class="se-label">nx (0–1)</span>
                            <input class="se-input stub" type="number" value="0.510" step="0.001" min="0" max="1" />
                        </div>
                        <div class="se-field">
                            <span class="se-label">ny (0–1)</span>
                            <input class="se-input stub" type="number" value="0.362" step="0.001" min="0" max="1" />
                        </div>
                    </div>
                    <div class="se-two-col">
                        <div class="se-field">
                            <span class="se-label">Population</span>
                            <input class="se-input stub" type="number" value="12000" step="100" />
                        </div>
                        <div class="se-field">
                            <span class="se-label">Garrison</span>
                            <input class="se-input stub" type="number" value="800" step="50" />
                        </div>
                    </div>
                    <div class="se-two-col">
                        <div class="se-field">
                            <span class="se-label">Starting Gold</span>
                            <input class="se-input stub" type="number" value="3500" step="100" />
                        </div>
                        <div class="se-field">
                            <span class="se-label">Starting Food</span>
                            <input class="se-input stub" type="number" value="2200" step="100" />
                        </div>
                    </div>
                    <div class="se-field">
                        <span class="se-label">Visual Radius (px)</span>
                        <input class="se-slider stub" type="range" min="10" max="60" value="42" />
                    </div>
                    <div style="display:flex;gap:4px">
                        <button class="se-btn primary stub" style="flex:1">Apply</button>
                        <button class="se-btn stub" title="[FUTURE] Snap city to nearest valid land tile">⬗ Snap</button>
                        <button class="se-btn danger stub">Delete</button>
                    </div>
                </div>
            </div>

        </div>
    </div>`;
}

// ── Timeline Panel ────────────────────────────────────────────────────────
function _buildTimeline() {
    const tlTabs = ["TRIGGERS","OBJECTIVES","DIALOGUE","ECONOMY"];

    return `
    <div id="se-timeline">
        <div id="se-timeline-tabs">
            ${tlTabs.map(t => `
            <button class="se-tl-tab ${t===_activeTab?'active':''}"
                    data-tltab="${t}"
                    onclick="window.ScenarioEditor._setTab('${t}')">
                ${{TRIGGERS:'⚡',OBJECTIVES:'🎯',DIALOGUE:'💬',ECONOMY:'💰'}[t]} ${t}
            </button>`).join('')}
            <div style="flex:1"></div>
            <!-- FUTURE CLAUDE: "Add Trigger" should append a new entry to
                 _seScenario.triggers[] and rebuild the trigger lane list.
                 Trigger IDs should auto-increment from the current max. -->
            <button class="se-btn primary stub" style="align-self:center;margin-right:8px">+ Add Trigger</button>
            <button class="se-btn stub" style="align-self:center;margin-right:8px" title="[FUTURE] Collapse/expand this panel">▼</button>
        </div>

        <div id="se-timeline-body">
            ${_buildTriggersTab()}
        </div>
    </div>`;
}

// ── Triggers tab content ──────────────────────────────────────────────────
function _buildTriggersTab() {
    return `
    <!-- LEFT: Trigger list lane -->
    <div class="se-trigger-lane">
        <div class="se-trigger-lane-header">
            <span>Triggers (${TRIGGERS_PREVIEW.length})</span>
            <div style="display:flex;gap:3px">
                <button class="se-btn icon-only stub" style="font-size:9px;padding:1px 5px" title="[FUTURE] Sort by turn order">↕</button>
                <button class="se-btn icon-only stub" style="font-size:9px;padding:1px 5px" title="[FUTURE] Filter enabled only">✓</button>
            </div>
        </div>
        <div class="se-trigger-list">
            ${TRIGGERS_PREVIEW.map((t, i) => `
            <div class="se-trigger-item ${i===0?'active':''}"
                 title="Click to edit trigger: ${t.label}">
                <div class="se-trigger-num">${t.id}</div>
                <div class="se-trigger-info">
                    <div class="se-trigger-label">${t.label}</div>
                    <div class="se-trigger-cond">${t.cond}</div>
                </div>
                <span class="se-trigger-status ${t.status}">${t.status==='enabled'?'ON':'OFF'}</span>
            </div>`).join('')}
        </div>
    </div>

    <!-- CENTER: Timeline track -->
    <!-- FUTURE CLAUDE: The ruler ticks represent in-game turns (or real time if
         you add a timer mode). Each track row is a named "channel" (Dialogue,
         Army Events, Economy Events, Cutscenes). Events on the track are
         draggable blocks that set the trigger's activation turn.
         Render them as absolutely-positioned divs inside a scrollable container,
         width proportional to turn duration if multi-turn. -->
    <div class="se-timeline-track">
        <div class="se-track-ruler">
            ${Array.from({length:10},(_,i)=>`
            <div class="se-ruler-tick">
                <div class="se-ruler-tick-label">Turn ${i+1}</div>
            </div>`).join('')}
        </div>
        <div class="se-track-rows">
            <div class="se-track-row">
                <span style="font-size:9px;color:var(--se-text-dim);width:60px;flex-shrink:0">Dialogue</span>
                <div class="se-track-event dialogue" title="Yuan Fleet Sighted — Turn 1">⚡ Yuan Fleet Sighted</div>
                <div class="se-track-event dialogue" style="margin-left:60px" title="Hakata Bay Landing — Turn 4">⚡ Hakata Landing</div>
            </div>
            <div class="se-track-row">
                <span style="font-size:9px;color:var(--se-text-dim);width:60px;flex-shrink:0">Army</span>
                <div class="se-track-event army" style="margin-left:20px" title="Yuan invasion force spawns">⚔ Yuan Spawns</div>
                <div class="se-track-event army" style="margin-left:80px">⚔ Iki Garrison</div>
            </div>
            <div class="se-track-row">
                <span style="font-size:9px;color:var(--se-text-dim);width:60px;flex-shrink:0">Economy</span>
                <div class="se-track-event economy" title="Shogunate emergency supply — Turn 1">💰 Emergency Supply</div>
                <div class="se-track-event economy" style="margin-left:180px">💰 Tribute</div>
            </div>
            <div class="se-track-row">
                <span style="font-size:9px;color:var(--se-text-dim);width:60px;flex-shrink:0">Cutscene</span>
                <div class="se-track-event cutscene" style="margin-left:300px" title="Kamikaze storm — Turn 8">🌀 Storm Kamikaze</div>
            </div>
        </div>
    </div>

    <!-- RIGHT: Trigger editor detail -->
    <!-- FUTURE CLAUDE: This panel shows the full editable detail for the
         currently selected trigger from the left lane.
         Condition types: TURN_COUNT, CITY_CAPTURED, CITY_HP, UNIT_IN_REGION,
         FACTION_ELIMINATED, PLAYER_GOLD, CUSTOM_JS.
         Actions array is drag-reorderable; each action type has its own
         inline form (e.g. SHOW_DIALOGUE needs speaker + text + portrait;
         SPAWN_ARMY needs faction + count + entry point nx/ny). -->
    <div class="se-trig-editor">
        <div class="se-trig-editor-header">⚡ Editing: Yuan Fleet Sighted</div>
        <div class="se-trig-editor-body">
            <div class="se-two-col">
                <div class="se-field">
                    <span class="se-label">Trigger Label</span>
                    <input class="se-input stub" type="text" value="Yuan Fleet Sighted" />
                </div>
                <div class="se-field">
                    <span class="se-label">Enabled</span>
                    <select class="se-select stub">
                        <option selected>Yes</option>
                        <option>No</option>
                    </select>
                </div>
            </div>
            <div class="se-card">
                <div class="se-card-header">Condition</div>
                <div class="se-card-body">
                    <div class="se-two-col">
                        <div class="se-field">
                            <span class="se-label">Type</span>
                            <select class="se-select stub">
                                <option selected>TURN_COUNT</option>
                                <option>CITY_CAPTURED</option>
                                <option>CITY_HP</option>
                                <option>UNIT_IN_REGION</option>
                                <option>FACTION_ELIMINATED</option>
                                <option>PLAYER_GOLD</option>
                                <option>CUSTOM_JS</option>
                            </select>
                        </div>
                        <div class="se-field">
                            <span class="se-label">Turn Number</span>
                            <input class="se-input stub" type="number" value="1" min="1" />
                        </div>
                    </div>
                </div>
            </div>
            <div class="se-card">
                <div class="se-card-header">
                    Actions
                    <!-- FUTURE CLAUDE: "Add Action" dropdown presents all action types.
                         Each selection appends to the action list below and inserts
                         the relevant inline form fields. -->
                    <button class="se-btn stub" style="margin-left:auto;font-size:9px;padding:2px 6px">+ Add Action</button>
                </div>
                <div class="se-card-body">
                    <div class="se-action-list">
                        <div class="se-action-row">
                            <span class="se-action-handle">⣿</span>
                            <span class="se-action-type dialogue">DIALOGUE</span>
                            <span class="se-action-detail">"A vast fleet has been sighted..."</span>
                            <button class="se-btn icon-only stub" style="font-size:9px;padding:1px 4px" title="[FUTURE] Edit this action">✎</button>
                            <button class="se-btn icon-only danger stub" style="font-size:9px;padding:1px 4px">✕</button>
                        </div>
                        <div class="se-action-row">
                            <span class="se-action-handle">⣿</span>
                            <span class="se-action-type army">SPAWN_ARMY</span>
                            <span class="se-action-detail">Yuan Dynasty — 1500 troops @ Genkai</span>
                            <button class="se-btn icon-only stub" style="font-size:9px;padding:1px 4px">✎</button>
                            <button class="se-btn icon-only danger stub" style="font-size:9px;padding:1px 4px">✕</button>
                        </div>
                        <div class="se-action-row">
                            <span class="se-action-handle">⣿</span>
                            <span class="se-action-type sound">PLAY_SOUND</span>
                            <span class="se-action-detail">music/invasion_theme.mp3</span>
                            <button class="se-btn icon-only stub" style="font-size:9px;padding:1px 4px">✎</button>
                            <button class="se-btn icon-only danger stub" style="font-size:9px;padding:1px 4px">✕</button>
                        </div>
                        <div class="se-action-row">
                            <span class="se-action-handle">⣿</span>
                            <span class="se-action-type relation">SET_RELATION</span>
                            <span class="se-action-detail">Yuan Dynasty ↔ All Japanese → WAR</span>
                            <button class="se-btn icon-only stub" style="font-size:9px;padding:1px 4px">✎</button>
                            <button class="se-btn icon-only danger stub" style="font-size:9px;padding:1px 4px">✕</button>
                        </div>
                    </div>
                </div>
            </div>
            <div style="display:flex;gap:4px">
                <button class="se-btn primary stub" style="flex:1">Apply Changes</button>
                <button class="se-btn danger stub">Delete Trigger</button>
            </div>
        </div>
    </div>`;
}

// ── Objectives tab content ────────────────────────────────────────────────
function _buildObjectivesTab() {
    return `
    <div class="se-obj-list">
        ${OBJECTIVES_PREVIEW.map(o=>`
        <div class="se-obj-row" title="Click to edit this objective">
            <div class="se-obj-num">${o.num}</div>
            <div class="se-obj-body">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
                    <div class="se-obj-title">${o.title}</div>
                    <span class="se-obj-type ${o.type}">${o.type.toUpperCase()}</span>
                </div>
                <div class="se-obj-desc">${o.desc}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0">
                <button class="se-btn icon-only stub" style="font-size:9px;padding:1px 5px" title="[FUTURE] Edit">✎</button>
                <button class="se-btn icon-only danger stub" style="font-size:9px;padding:1px 5px">✕</button>
            </div>
        </div>`).join('')}
        <button class="se-btn primary stub" style="align-self:flex-start;margin-top:4px">+ Add Objective</button>
    </div>`;
}

// ── Dialogue tab content ──────────────────────────────────────────────────
function _buildDialogueTab() {
    const convos = [
        { speaker:"Shōni Sukeyoshi", preview:"A vast fleet has been sighted off Tsushima. Prepare the bay defenses at once." },
        { speaker:"Sō Clan Messenger", preview:"The islands fall. Sasuura burns. They come for Kyūshū next." },
        { speaker:"Yuan Admiral Xin Du", preview:"The shogunate's samurai fight with honour but not with numbers." },
        { speaker:"Kikuchi Takefusa", preview:"We drive them back from Akasaka! Hold the line at Torikai!" },
    ];

    return `
    <div class="se-dialogue-editor">
        <div class="se-dialogue-list">
            ${convos.map((c,i)=>`
            <div class="se-dialogue-item ${i===0?'active':''}" title="Click to edit this dialogue entry">
                <div class="se-dialogue-speaker">${c.speaker}</div>
                <div class="se-dialogue-preview">${c.preview}</div>
            </div>`).join('')}
            <button class="se-btn primary stub" style="margin-top:4px;font-size:10px">+ New Dialogue</button>
        </div>
        <div class="se-dialogue-form">
            <!-- FUTURE CLAUDE: Each dialogue entry maps to a trigger action
                 of type SHOW_DIALOGUE.  Fields here should write to
                 _seScenario.triggers[selectedId].actions[actionIdx].
                 The portrait field is an emoji or path to a face sprite.
                 Choices array enables branching (not yet implemented). -->
            <div class="se-field">
                <span class="se-label">Speaker Name</span>
                <input class="se-input stub" type="text" value="Shōni Sukeyoshi" />
            </div>
            <div class="se-two-col">
                <div class="se-field">
                    <span class="se-label">Portrait / Emoji</span>
                    <input class="se-input stub" type="text" value="🏯" />
                </div>
                <div class="se-field">
                    <span class="se-label">Display Duration (ms)</span>
                    <input class="se-input stub" type="number" value="4000" step="500" />
                </div>
            </div>
            <div class="se-field">
                <span class="se-label">Dialogue Text</span>
                <textarea class="se-textarea stub" style="min-height:70px">A vast fleet has been sighted off Tsushima. Prepare the bay defenses at once. All clans must rally to Hakata Bay!</textarea>
            </div>
            <div class="se-field">
                <span class="se-label">Linked Trigger</span>
                <select class="se-select stub">
                    <option selected>T1 — Yuan Fleet Sighted</option>
                    <option>T2 — Tsushima Falls</option>
                    <option>T4 — Hakata Bay Landing</option>
                    <option>T5 — Hakozaki Shrine Burns</option>
                </select>
            </div>
            <div style="display:flex;gap:4px">
                <button class="se-btn primary stub" style="flex:1">Apply</button>
                <button class="se-btn stub" title="[FUTURE] Preview dialogue in-game overlay">▶ Preview</button>
            </div>
        </div>
    </div>`;
}

// ── Economy tab content ───────────────────────────────────────────────────
function _buildEconomyTab() {
    const fEcon = [
        { name:"Kamakura Shogunate", gold:5000, food:3000, color:"#c62828" },
        { name:"Shoni Clan",         gold:2800, food:1800, color:"#1565c0" },
        { name:"Yuan Dynasty",       gold:8000, food:5000, color:"#b71c1c" },
        { name:"Kikuchi Clan",       gold:1600, food:1400, color:"#6a1b9a" },
        { name:"Otomo Clan",         gold:2200, food:1600, color:"#e65100" },
        { name:"Matsura Clan",       gold:1800, food:2000, color:"#00695c" },
    ];

    return `
    <div class="se-economy-grid">
        ${fEcon.map(f=>`
        <div class="se-economy-card" title="Click to configure ${f.name} starting economy">
            <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
                <div style="width:10px;height:10px;border-radius:50%;background:${f.color};border:1px solid rgba(0,0,0,0.5)"></div>
                <span class="se-economy-card-title" style="font-size:8px">${f.name}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:flex-end">
                <div>
                    <div class="se-economy-sub">Gold</div>
                    <div class="se-economy-value" style="font-size:14px;color:#ffca28">${f.gold.toLocaleString()}</div>
                </div>
                <div>
                    <div class="se-economy-sub">Food</div>
                    <div class="se-economy-value" style="font-size:14px;color:#8bc34a">${f.food.toLocaleString()}</div>
                </div>
            </div>
            <div style="display:flex;gap:3px;margin-top:6px">
                <button class="se-btn stub" style="flex:1;font-size:9px;padding:2px 4px">Edit</button>
            </div>
        </div>`).join('')}

        <!-- FUTURE CLAUDE: Economy card "Edit" should open an inline form within
             the card (or the right panel) to set:
             - Starting gold / food
             - Per-turn income (from city count * base_income)
             - Resource trade routes (which resources this faction prioritises)
             - Trade embargo flags (Yuan Dynasty should be embargoed from JP factions)
             Changes write to _seScenario.factions[name].economy and are applied
             by initializeCityData() when Test Play launches. -->

        <div class="se-economy-card">
            <div class="se-economy-card-title">Trade Routes</div>
            <div style="font-size:10px;color:var(--se-text-dim);line-height:1.6;margin-top:4px">
                Active routes: <span style="color:var(--se-text)">8</span><br>
                Embargoed: <span style="color:#ffa0a0">Yuan Dynasty</span><br>
                Market tick: <span style="color:var(--se-text)">600 frames</span>
            </div>
            <button class="se-btn stub" style="margin-top:6px;font-size:9px;width:100%">Configure Routes</button>
        </div>

        <div class="se-economy-card">
            <div class="se-economy-card-title">Difficulty Multiplier</div>
            <div class="se-economy-value" style="font-size:24px;color:var(--se-accent)">1.0×</div>
            <div class="se-economy-sub">attritionDifficultyMultiplier</div>
            <input class="se-slider stub" type="range" min="0.5" max="3.0" step="0.1" value="1.0" style="margin-top:6px" />
        </div>
    </div>`;
}

// ── Public API ────────────────────────────────────────────────────────────

function open() {
    if (_root) return; // Already open
    window.isPaused = true;

    _root = _build();
    document.body.appendChild(_root);

    // Set initial tab content
    _setTab(_activeTab);

    console.log("[ScenarioEditor] Opened.");
}

function close() {
    if (!_root) return;
    _root.remove();
    _root = null;

    // Remove injected CSS
    const style = document.getElementById("se-styles");
    if (style) style.remove();

    window.isPaused = false;

    // Restore main menu UI if it was hidden
    const menuUI = document.getElementById("main-menu-ui-container");
    if (menuUI) menuUI.style.display = "flex";

    console.log("[ScenarioEditor] Closed.");
}

// ── Mode switching ────────────────────────────────────────────────────────
// FUTURE CLAUDE: Each mode should show/hide specific sections in the right
// panel and left panel. E.g. MAP mode shows tile palette; CITIES mode shows
// city list; NPCS mode shows NPC roster with patrol route config.
function _setMode(mode) {
    _activeMode = mode;
    if (!_root) return;
    _root.querySelectorAll(".se-mode-tab").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    const el = _root.querySelector("#se-st-mode");
    if (el) el.textContent = mode;
}

// ── Tool switching ────────────────────────────────────────────────────────
function _setTool(tool) {
    _activeTool = tool;
    if (!_root) return;
    _root.querySelectorAll(".se-tool").forEach(el => {
        el.classList.toggle("active", el.dataset.tool === tool);
    });
    const st = _root.querySelector("#se-st-tool");
    if (st) st.textContent = tool;

    // FUTURE CLAUDE: Change cursor on #se-viewport based on tool:
    //   PAINT   → crosshair
    //   ERASE   → cell
    //   SELECT  → default
    //   PLACE   → copy
    //   INSPECT → zoom-in
    //   MOVE    → move
}

// ── Tile switching ────────────────────────────────────────────────────────
function _setTile(tile) {
    _activeTile = tile;
    if (!_root) return;
    _root.querySelectorAll(".se-tile-row").forEach(el => {
        el.classList.toggle("active", el.dataset.tile === tile);
    });
    const st = _root.querySelector("#se-st-tile");
    if (st) st.textContent = tile;
    // Auto-switch to paint tool when a tile is selected
    if (_activeTool !== "PAINT") _setTool("PAINT");
}

// ── Brush size switching ──────────────────────────────────────────────────
function _setBrush(size) {
    _brushSize = size;
    if (!_root) return;
    _root.querySelectorAll(".se-brush-btn").forEach(el => {
        el.classList.toggle("active", el.textContent.trim() === `${size}×${size}`);
    });
    const st = _root.querySelector("#se-st-brush");
    if (st) st.textContent = `${size}×${size}`;
}

// ── Timeline tab switching ────────────────────────────────────────────────
// FUTURE CLAUDE: Each tab should replace the innerHTML of #se-timeline-body
// with the appropriate content builder (_buildTriggersTab, etc.).
// Store the active tab's unsaved form data before switching to avoid loss.
function _setTab(tab) {
    _activeTab = tab;
    if (!_root) return;

    _root.querySelectorAll(".se-tl-tab").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tltab === tab);
    });

    const body = _root.querySelector("#se-timeline-body");
    if (!body) return;

    switch (tab) {
        case "TRIGGERS":   body.innerHTML = _buildTriggersTab();   break;
        case "OBJECTIVES": body.innerHTML = _buildObjectivesTab(); break;
        case "DIALOGUE":   body.innerHTML = _buildDialogueTab();   break;
        case "ECONOMY":    body.innerHTML = _buildEconomyTab();    break;
    }
}

// ── Expose public surface ─────────────────────────────────────────────────
return {
    open,
    close,
    _setMode,
    _setTool,
    _setTile,
    _setBrush,
    _setTab,
};
```

})();

console.log(”[ScenarioEditor] scenario_editor.js loaded — window.ScenarioEditor ready.”);
