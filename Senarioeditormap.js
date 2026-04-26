// =============================================================================
// SCENARIO EDITOR — MAP ENGINE  (scenario_editor_map.js)
// Phase 2: Real working map functionality patched into window.ScenarioEditor.
//
// LOAD ORDER:  sandbox_overworld.js → story1_map_and_update.js
//              → scenario_editor.js → THIS FILE
//
// WHAT THIS ADDS:
//   • Load Sandbox map (window.worldMap)       — bgCanvas & game-ready tiles
//   • Load Story 1 Japan map (worldMap_story1) — bgCanvas & game-ready tiles
//   • Load from .json file on local PC
//   • Save / Export to .json file on local PC  + localStorage backup
//   • New blank map (250×187 Ocean tiles)
//   • Canvas tile renderer with zoom (scroll-wheel) + right-click/alt drag pan
//   • Terrain paint, erase, fill with active tile + brush size (1/3/5)
//   • Grid overlay toggle
//   • Live minimap with viewport rect
//   • Hover + cursor status bar
//   • Undo stack (Ctrl+Z, up to 30 stroke snapshots)
//   • “Test Play” — writes edited tiles back to worldMap / worldMap_story1,
//     repaints bgCanvas, closes editor so the game runs with edited terrain.
//     NPCs will pathfind correctly because impassable/speed props are preserved.
//
// NPC COMPATIBILITY:
//   Every tile name maps to { color, speed, impassable } via TILE_DEFS so any
//   NPC movement system reading tile.impassable / tile.speed keeps working
//   after the map is applied back to the game arrays.
// =============================================================================

(function (SE) {
“use strict”;

```
if (!SE) { console.error("[MapEngine] ScenarioEditor not found!"); return; }

// =========================================================================
// 1. TILE DEFINITIONS  (canonical NPC-compatible tile data)
//    Colour values match sandbox_overworld.js PALETTE exactly.
// =========================================================================
const TILE_DEFS = {
    "Ocean":        { color: "#2b4a5f", speed: 1.40, impassable: true  },
    "Coastal":      { color: "#3a5f75", speed: 1.40, impassable: true  },
    "River":        { color: "#3a7090", speed: 1.30, impassable: false },
    "Plains":       { color: "#6b7a4a", speed: 0.85, impassable: false },
    "Steppes":      { color: "#a3a073", speed: 0.80, impassable: false },
    "Meadow":       { color: "#6b7a4a", speed: 0.85, impassable: false },
    "Forest":       { color: "#425232", speed: 0.40, impassable: false },
    "Dense Forest": { color: "#244222", speed: 0.30, impassable: false },
    "Highlands":    { color: "#626b42", speed: 0.45, impassable: false },
    "Mountains":    { color: "#3E2723", speed: 0.40, impassable: true  },
    "Snow":         { color: "#7B5E3F", speed: 0.50, impassable: false },
    "Desert":       { color: "#bfa373", speed: 0.70, impassable: false },
    "Dunes":        { color: "#cfae7e", speed: 0.55, impassable: false },
};

// =========================================================================
// 2. ENGINE STATE
// =========================================================================
let _map      = null;   // { cols, rows, tileSize, tiles:[][]{name,color,speed,impassable}, cities:[] }
let _mapType  = null;   // "sandbox" | "story1" | "custom"
let _zoom     = 1.0;
let _offX     = 0, _offY = 0;     // viewport pan offset in screen px
let _panning  = false;
let _panStart = {};
let _painting = false;
let _showGrid = false;
let _raf      = null;
let _dirty    = true;
let _hoverCol = -1, _hoverRow = -1;

// Minimap offscreen canvas (pre-rendered, updated on load + per stroke)
let _mmCvs = null, _mmCtx = null;
const MM_W = 130, MM_H = 90;

// Undo stack — each entry is an array of { col, row, prev, next } tile-name changes
const _undoStack = [];
const MAX_UNDO   = 30;
let   _curStroke = null;   // tile-name changes during the current mouse-drag

// =========================================================================
// 3. DOM HELPERS
// =========================================================================
const $ = (sel) => document.querySelector(sel);

function _vp()  { return $("#se-viewport"); }
function _vc()  { return $("#se-viewport-canvas"); }

function _getActiveTile() {
    const r = $(".se-tile-row.active");
    return r ? (r.dataset.tile || "Plains") : "Plains";
}
function _getBrush() {
    const b = $(".se-brush-btn.active");
    return b ? (parseInt(b.textContent) || 1) : 1;
}
function _getActiveTool() {
    const t = $(".se-tool.active");
    return t ? (t.dataset.tool || "PAINT") : "PAINT";
}

function _setStatus(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}
function _flash(msg, dur = 3000) {
    _setStatus("se-st-scenario", msg);
    setTimeout(() => {
        if (_map) _setStatus("se-st-scenario", (_mapType || "custom") + " [loaded]");
    }, dur);
}
function _updateZoomLabel() {
    const el = $(".se-zoom-display");
    if (el) el.textContent = Math.round(_zoom * 100) + "%";
}

// =========================================================================
// 4. MAP CREATION HELPERS
// =========================================================================

/** Clone a tile object from the game's worldMap array into a lean editor tile. */
function _cloneTile(src) {
    if (!src) return { name: "Ocean", ...TILE_DEFS["Ocean"] };
    const name = src.name || "Ocean";
    const def  = TILE_DEFS[name] || TILE_DEFS["Ocean"];
    return {
        name,
        color:      src.color      || def.color,
        speed:      src.speed      ?? def.speed,
        impassable: src.impassable ?? def.impassable
    };
}

/** Build _map from any COLS×ROWS worldMap-style 2D array. */
function _buildMap(wm, cols, rows, tileSize, cities) {
    const tiles = [];
    for (let i = 0; i < cols; i++) {
        tiles[i] = [];
        for (let j = 0; j < rows; j++) {
            tiles[i][j] = _cloneTile(wm[i] && wm[i][j]);
        }
    }
    return {
        cols, rows, tileSize,
        tiles,
        cities: (cities || []).map(c => ({ ...c }))
    };
}

/** Create a blank Ocean-filled map. */
function _newBlankMap(cols, rows, tileSize) {
    const tiles = [];
    for (let i = 0; i < cols; i++) {
        tiles[i] = [];
        for (let j = 0; j < rows; j++) {
            tiles[i][j] = { name: "Ocean", ...TILE_DEFS["Ocean"] };
        }
    }
    return { cols, rows, tileSize, tiles, cities: [] };
}

// =========================================================================
// 5. MAP LOADERS
// =========================================================================

function _onMapReady(type, msg) {
    _mapType = type;
    _mmDirty_rebuild();
    _fitToView();
    _dirty = true;
    _hidePlaceholder();
    _setStatus("se-st-scenario", type + " [loaded]");
    _flash(msg);
}

function loadSandbox() {
    // worldMap, COLS, ROWS, TILE_SIZE are globals from sandbox_overworld.js
    const wm = (typeof worldMap !== "undefined") ? worldMap : null;
    if (!wm || wm.length === 0) {
        _flash("⚠ Sandbox map not generated yet — launch Sandbox mode first!"); return;
    }
    const cols = (typeof COLS !== "undefined") ? COLS : 250;
    const rows = (typeof ROWS !== "undefined") ? ROWS : 187;
    const ts   = (typeof TILE_SIZE !== "undefined") ? TILE_SIZE : 16;
    const cits = (typeof window.cities_sandbox !== "undefined") ? window.cities_sandbox : [];
    _map = _buildMap(wm, cols, rows, ts, cits);
    _onMapReady("sandbox", `✓ Sandbox map loaded (${cols}×${rows} tiles)`);
}

function loadStory1() {
    const wm = (typeof worldMap_story1 !== "undefined") ? worldMap_story1 : null;
    if (!wm || wm.length === 0) {
        _flash("⚠ Story 1 map not generated yet — launch Story 1 first!"); return;
    }
    const cols = (typeof COLS !== "undefined") ? COLS : 250;
    const rows = (typeof ROWS !== "undefined") ? ROWS : 187;
    const ts   = (typeof TILE_SIZE !== "undefined") ? TILE_SIZE : 16;
    const cits = (typeof cities_story1 !== "undefined") ? cities_story1 : [];
    _map = _buildMap(wm, cols, rows, ts, cits);
    _onMapReady("story1", `✓ Northern Kyūshū 1274 loaded (${cols}×${rows} tiles)`);
}

function newMap(cols, rows) {
    cols = cols || 250; rows = rows || 187;
    const ts = (typeof TILE_SIZE !== "undefined") ? TILE_SIZE : 16;
    _map = _newBlankMap(cols, rows, ts);
    _onMapReady("custom", `✓ New blank map created (${cols}×${rows} tiles)`);
}

// ── Save to local PC ─────────────────────────────────────────────────────
function saveMap() {
    if (!_map) { _flash("⚠ No map loaded to save!"); return; }

    // Serialize as flat row-major array of tile names (compact + readable)
    const flat = [];
    for (let j = 0; j < _map.rows; j++)
        for (let i = 0; i < _map.cols; i++)
            flat.push(_map.tiles[i][j].name);

    const payload = {
        version:  2,
        mapType:  _mapType,
        cols:     _map.cols,
        rows:     _map.rows,
        tileSize: _map.tileSize,
        tiles:    flat,
        // Serialize cities for NPC spawn points
        cities: (_map.cities || []).map(c => ({
            name:     c.name,
            x:        c.x,
            y:        c.y,
            faction:  c.faction,
            pop:      c.pop,
            type:     c.type,
            radius:   c.radius,
            isPlayerHome: c.isPlayerHome
        }))
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = (_mapType || "map") + "_scenario_" + Date.now() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Backup to localStorage (survives browser refresh for quick re-load)
    try {
        const key = "SE_scenario_" + (_mapType || "custom");
        localStorage.setItem(key, json);
        console.log("[MapEngine] Saved to localStorage key:", key);
    } catch (e) { /* quota exceeded — ignore */ }

    _flash("✓ Map saved to PC! (" + flat.length.toLocaleString() + " tiles)");
}

// ── Load from local PC ───────────────────────────────────────────────────
function loadFromFile() {
    const inp = document.createElement("input");
    inp.type   = "file";
    inp.accept = ".json,application/json";
    inp.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const rd = new FileReader();
        rd.onload = (ev) => {
            try { _deserializeMap(JSON.parse(ev.target.result)); }
            catch (err) { _flash("⚠ Load error: " + err.message); }
        };
        rd.readAsText(file);
    };
    inp.click();
}

function _deserializeMap(data) {
    if (!data.tiles || !data.cols || !data.rows) {
        _flash("⚠ Invalid scenario file!"); return;
    }
    const cols = data.cols, rows = data.rows;
    const ts   = data.tileSize || 16;
    const tiles = [];
    let idx = 0;
    for (let i = 0; i < cols; i++) {
        tiles[i] = [];
        for (let j = 0; j < rows; j++) {
            const name = data.tiles[idx++] || "Ocean";
            const def  = TILE_DEFS[name] || TILE_DEFS["Ocean"];
            tiles[i][j] = { name, ...def };
        }
    }
    _map = {
        cols, rows, tileSize: ts,
        tiles,
        cities: (data.cities || [])
    };
    _onMapReady(data.mapType || "custom",
        `✓ Loaded ${data.mapType || "map"} from file (${cols}×${rows})`);
}

// =========================================================================
// 6. MINIMAP (pre-rendered offscreen canvas for speed)
// =========================================================================

function _mmDirty_rebuild() {
    if (!_map) return;
    _mmCvs = document.createElement("canvas");
    _mmCvs.width  = MM_W;
    _mmCvs.height = MM_H;
    _mmCtx = _mmCvs.getContext("2d");
    _mmRedrawFull();
}

function _mmRedrawFull() {
    if (!_mmCtx || !_map) return;
    const scX = MM_W / _map.cols;
    const scY = MM_H / _map.rows;
    const pw  = Math.max(1, scX + 0.5);
    const ph  = Math.max(1, scY + 0.5);
    for (let i = 0; i < _map.cols; i++) {
        for (let j = 0; j < _map.rows; j++) {
            _mmCtx.fillStyle = _map.tiles[i][j].color;
            _mmCtx.fillRect(i * scX, j * scY, pw, ph);
        }
    }
}

/** Patch just the painted tiles into the minimap — no full redraw needed. */
function _mmPatchTiles(changes) {
    if (!_mmCtx || !_map) return;
    const scX = MM_W / _map.cols;
    const scY = MM_H / _map.rows;
    const pw  = Math.max(1, scX + 0.5);
    const ph  = Math.max(1, scY + 0.5);
    changes.forEach(({ col, row }) => {
        const t = _map.tiles[col][row];
        _mmCtx.fillStyle = t.color;
        _mmCtx.fillRect(col * scX, row * scY, pw, ph);
    });
}

// =========================================================================
// 7. CANVAS RENDERER  (tile-culled, only visible tiles drawn each frame)
// =========================================================================

function _render() {
    _raf = requestAnimationFrame(_render);
    if (!_dirty) return;
    _dirty = false;

    const vc = _vc();
    const vp = _vp();
    if (!vc || !vp) return;

    const W = vp.clientWidth  || 800;
    const H = vp.clientHeight || 500;
    if (vc.width !== W)  vc.width  = W;
    if (vc.height !== H) vc.height = H;

    const ctx = vc.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    if (!_map) {
        // Keep placeholder visible — nothing to draw
        return;
    }

    const ts = _map.tileSize * _zoom;  // rendered tile size in px

    // ── Tile culling (only draw tiles visible in the viewport) ──────────
    const c0 = Math.max(0, Math.floor(-_offX / ts));
    const r0 = Math.max(0, Math.floor(-_offY / ts));
    const c1 = Math.min(_map.cols, Math.ceil((W - _offX) / ts) + 1);
    const r1 = Math.min(_map.rows, Math.ceil((H - _offY) / ts) + 1);

    // ── Background fill (for areas outside the map) ─────────────────────
    ctx.fillStyle = "#0a0806";
    ctx.fillRect(0, 0, W, H);

    // ── Tile drawing ─────────────────────────────────────────────────────
    for (let i = c0; i < c1; i++) {
        for (let j = r0; j < r1; j++) {
            ctx.fillStyle = _map.tiles[i][j].color;
            // +0.5 closes sub-pixel seams at small zoom levels
            ctx.fillRect(
                _offX + i * ts | 0, _offY + j * ts | 0,
                ts + 0.6 | 0, ts + 0.6 | 0
            );
        }
    }

    // ── Grid overlay ─────────────────────────────────────────────────────
    if (_showGrid && ts >= 4) {
        ctx.strokeStyle = "rgba(255,255,255,0.09)";
        ctx.lineWidth   = 0.5;
        ctx.beginPath();
        for (let i = c0; i <= c1; i++) {
            const x = _offX + i * ts;
            ctx.moveTo(x, _offY + r0 * ts);
            ctx.lineTo(x, _offY + r1 * ts);
        }
        for (let j = r0; j <= r1; j++) {
            const y = _offY + j * ts;
            ctx.moveTo(_offX + c0 * ts, y);
            ctx.lineTo(_offX + c1 * ts, y);
        }
        ctx.stroke();
    }

    // ── Map border ───────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(200,146,26,0.4)";
    ctx.lineWidth   = 2;
    ctx.strokeRect(
        _offX, _offY,
        _map.cols * ts, _map.rows * ts
    );

    // ── City markers ─────────────────────────────────────────────────────
    if (_map.cities && _map.cities.length > 0) {
        _map.cities.forEach(city => {
            // city.x / city.y are pixel coords at tileSize=16 scale
            const cx = _offX + (city.x / _map.tileSize) * ts;
            const cy = _offY + (city.y / _map.tileSize) * ts;

            // Only draw if on screen
            if (cx < -20 || cx > W + 20 || cy < -20 || cy > H + 20) return;

            const r = Math.max(3, ts * 0.38);

            // City dot
            ctx.fillStyle = city.isPlayerHome ? "#ffffff" : "#e8b832";
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // Black border ring
            ctx.strokeStyle = "rgba(0,0,0,0.7)";
            ctx.lineWidth   = Math.max(0.8, r * 0.22);
            ctx.stroke();

            // Label when zoomed in enough
            if (ts >= 6 && city.name) {
                const fontSize = Math.max(8, Math.min(14, ts * 0.7));
                ctx.font        = `bold ${fontSize}px Georgia`;
                ctx.fillStyle   = "#fff8e0";
                ctx.textShadow  = "1px 1px 2px #000";
                ctx.shadowColor = "rgba(0,0,0,0.8)";
                ctx.shadowBlur  = 3;
                ctx.fillText(city.name, cx + r + 2, cy + fontSize * 0.35);
                ctx.shadowBlur = 0;
            }
        });
    }

    // ── Hover tile highlight ─────────────────────────────────────────────
    if (_hoverCol >= 0 && _hoverRow >= 0 && ts >= 2) {
        const hx = _offX + _hoverCol * ts;
        const hy = _offY + _hoverRow * ts;
        ctx.strokeStyle = "rgba(232,184,50,0.85)";
        ctx.lineWidth   = Math.max(1, ts * 0.07);
        ctx.strokeRect(hx, hy, ts, ts);

        // Brush preview (faint highlight of affected tiles)
        const brush = _getBrush();
        if (brush > 1) {
            const half = Math.floor(brush / 2);
            ctx.fillStyle = "rgba(232,184,50,0.08)";
            ctx.fillRect(
                _offX + (_hoverCol - half) * ts,
                _offY + (_hoverRow - half) * ts,
                brush * ts, brush * ts
            );
        }
    }

    // ── Minimap ──────────────────────────────────────────────────────────
    _drawMinimap(ctx, W, H);
}

function _drawMinimap(ctx, vpW, vpH) {
    if (!_mmCvs || !_map) return;

    const MX = vpW - 10 - MM_W;
    const MY = vpH - 10 - MM_H;

    // Panel background
    ctx.fillStyle   = "rgba(10,8,6,0.88)";
    ctx.strokeStyle = "#5a4020";
    ctx.lineWidth   = 2;
    ctx.fillRect(MX - 2, MY - 2, MM_W + 4, MM_H + 18);
    ctx.strokeRect(MX - 2, MY - 2, MM_W + 4, MM_H + 18);

    // Pre-rendered map thumbnail
    ctx.drawImage(_mmCvs, MX, MY, MM_W, MM_H);

    // Viewport indicator rect
    const ts  = _map.tileSize * _zoom;
    const scX = MM_W / _map.cols;
    const scY = MM_H / _map.rows;

    const vRX = MX + Math.max(0, (-_offX / ts) * scX);
    const vRY = MY + Math.max(0, (-_offY / ts) * scY);
    const vRW = Math.min(MM_W, (vpW / ts) * scX);
    const vRH = Math.min(MM_H, (vpH / ts) * scY);

    ctx.strokeStyle = "rgba(232,184,50,0.9)";
    ctx.lineWidth   = 1;
    ctx.strokeRect(vRX, vRY, vRW, vRH);

    // Label
    ctx.fillStyle = "rgba(216,200,144,0.7)";
    ctx.font      = "bold 8px Georgia";
    ctx.fillText("OVERVIEW", MX + 3, MY + MM_H + 11);
}

// =========================================================================
// 8. TILE PAINTING
// =========================================================================

function _screenToTile(sx, sy) {
    if (!_map) return null;
    const ts  = _map.tileSize * _zoom;
    const col = Math.floor((sx - _offX) / ts);
    const row = Math.floor((sy - _offY) / ts);
    if (col < 0 || col >= _map.cols || row < 0 || row >= _map.rows) return null;
    return { col, row };
}

function _paintAt(col, row) {
    if (!_map) return;
    const tool      = _getActiveTool();
    const tileName  = (tool === "ERASE") ? "Ocean" : _getActiveTile();
    const def       = TILE_DEFS[tileName] || TILE_DEFS["Ocean"];
    const brush     = _getBrush();
    const half      = Math.floor(brush / 2);
    const changed   = [];

    for (let di = -half; di <= half; di++) {
        for (let dj = -half; dj <= half; dj++) {
            const ci = col + di, cj = row + dj;
            if (ci < 0 || ci >= _map.cols || cj < 0 || cj >= _map.rows) continue;

            const prev = _map.tiles[ci][cj].name;
            if (prev === tileName) continue; // No change, skip

            _map.tiles[ci][cj] = { name: tileName, ...def };
            changed.push({ col: ci, row: cj, prev, next: tileName });
        }
    }

    if (changed.length === 0) return;
    if (_curStroke) _curStroke.push(...changed);
    _mmPatchTiles(changed);
    _dirty = true;
}

// ── Fill tool (flood fill) ────────────────────────────────────────────────
function _floodFill(col, row) {
    if (!_map) return;
    const targetName = _map.tiles[col][row].name;
    const fillName   = _getActiveTile();
    const def        = TILE_DEFS[fillName] || TILE_DEFS["Ocean"];
    if (targetName === fillName) return;

    const changed = [];
    const stack   = [[col, row]];
    const visited = new Uint8Array(_map.cols * _map.rows);

    while (stack.length > 0) {
        const [ci, cj] = stack.pop();
        if (ci < 0 || ci >= _map.cols || cj < 0 || cj >= _map.rows) continue;
        const idx = ci * _map.rows + cj;
        if (visited[idx]) continue;
        if (_map.tiles[ci][cj].name !== targetName) continue;
        visited[idx] = 1;

        const prev = _map.tiles[ci][cj].name;
        _map.tiles[ci][cj] = { name: fillName, ...def };
        changed.push({ col: ci, row: cj, prev, next: fillName });

        stack.push([ci+1,cj],[ci-1,cj],[ci,cj+1],[ci,cj-1]);
    }

    if (changed.length === 0) return;
    _undoStack.push(changed);
    if (_undoStack.length > MAX_UNDO) _undoStack.shift();
    _mmRedrawFull();
    _dirty = true;
    _flash(`Filled ${changed.length} tiles with ${fillName}`);
}

// =========================================================================
// 9. UNDO
// =========================================================================

function _undo() {
    if (_undoStack.length === 0) return;
    const stroke = _undoStack.pop();
    stroke.forEach(({ col, row, prev }) => {
        const def = TILE_DEFS[prev] || TILE_DEFS["Ocean"];
        _map.tiles[col][row] = { name: prev, ...def };
    });
    _mmRedrawFull();
    _dirty = true;
    _flash(`Undo — restored ${stroke.length} tile(s)`);
}

// =========================================================================
// 10. ZOOM & PAN
// =========================================================================

function _fitToView() {
    if (!_map) return;
    const vp = _vp();
    if (!vp) return;
    const vW = vp.clientWidth  || 800;
    const vH = vp.clientHeight || 500;
    const mW = _map.cols * _map.tileSize;
    const mH = _map.rows * _map.tileSize;
    _zoom  = Math.min(vW / mW, vH / mH) * 0.94;
    _offX  = (vW - mW * _zoom) / 2;
    _offY  = (vH - mH * _zoom) / 2;
    _dirty = true;
    _updateZoomLabel();
}

function _clampZoom(z) { return Math.max(0.04, Math.min(10, z)); }

// =========================================================================
// 11. MOUSE / WHEEL EVENTS
// =========================================================================

function _setupEvents() {
    const vp = _vp();
    if (!vp) return;

    // ── Mouse Down ───────────────────────────────────────────────────────
    vp.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const rect = vp.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        // Right-click or Alt+drag → pan
        if (e.button === 2 || e.altKey) {
            _panning  = true;
            _panStart = { mx: e.clientX, my: e.clientY, ox: _offX, oy: _offY };
            return;
        }

        const tool = _getActiveTool();

        if (tool === "PAINT" || tool === "ERASE") {
            const t = _screenToTile(sx, sy);
            if (t) {
                _painting   = true;
                _curStroke  = [];
                _paintAt(t.col, t.row);
            }
        } else if (tool === "FILL") {
            const t = _screenToTile(sx, sy);
            if (t) _floodFill(t.col, t.row);
        } else if (tool === "INSPECT") {
            const t = _screenToTile(sx, sy);
            if (t) _inspectTile(t.col, t.row);
        }
    });

    // ── Mouse Move ───────────────────────────────────────────────────────
    vp.addEventListener("mousemove", (e) => {
        const rect = vp.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        if (_panning) {
            _offX  = _panStart.ox + (e.clientX - _panStart.mx);
            _offY  = _panStart.oy + (e.clientY - _panStart.my);
            _dirty = true;
            return;
        }

        if (_painting) {
            const t = _screenToTile(sx, sy);
            if (t) _paintAt(t.col, t.row);
        }

        // Update hover
        const t = _screenToTile(sx, sy);
        const prevH = _hoverCol, prevR = _hoverRow;
        if (t) {
            _hoverCol = t.col; _hoverRow = t.row;
            const tile = _map.tiles[t.col][t.row];
            _setStatus("se-st-cursor",
                `(${t.col}, ${t.row})  ${tile.name}  spd:${tile.speed.toFixed(2)}  ${tile.impassable ? "⛔" : "✓"}`
            );
        } else {
            _hoverCol = -1; _hoverRow = -1;
            _setStatus("se-st-cursor", "—");
        }
        if (_hoverCol !== prevH || _hoverRow !== prevR) _dirty = true;
    });

    // ── Mouse Up ─────────────────────────────────────────────────────────
    vp.addEventListener("mouseup", () => {
        if (_painting && _curStroke && _curStroke.length > 0) {
            _undoStack.push(_curStroke);
            if (_undoStack.length > MAX_UNDO) _undoStack.shift();
        }
        _painting = false;
        _panning  = false;
        _curStroke = null;
    });

    vp.addEventListener("mouseleave", () => {
        _painting = false; _panning = false; _curStroke = null;
        _hoverCol = -1; _hoverRow = -1;
        _dirty = true;
    });

    // ── Scroll Wheel → Zoom toward cursor ────────────────────────────────
    vp.addEventListener("wheel", (e) => {
        e.preventDefault();
        const rect  = vp.getBoundingClientRect();
        const mx    = e.clientX - rect.left;
        const my    = e.clientY - rect.top;
        const delta = e.deltaY < 0 ? 1.12 : 0.89;
        const newZ  = _clampZoom(_zoom * delta);
        _offX  = mx - (mx - _offX) * (newZ / _zoom);
        _offY  = my - (my - _offY) * (newZ / _zoom);
        _zoom  = newZ;
        _dirty = true;
        _updateZoomLabel();
    }, { passive: false });

    vp.addEventListener("contextmenu", (e) => e.preventDefault());

    // ── Global keyboard shortcuts ─────────────────────────────────────────
    document.addEventListener("keydown", _onKey);
}

function _onKey(e) {
    // Only active while editor is open
    if (!document.getElementById("se-root")) return;
    if (e.ctrlKey && e.key === "z") { e.preventDefault(); _undo(); }
    if (e.ctrlKey && e.key === "s") { e.preventDefault(); saveMap(); }
}

// =========================================================================
// 12. TILE INSPECT (right panel update)
// =========================================================================

function _inspectTile(col, row) {
    if (!_map) return;
    const tile = _map.tiles[col][row];
    const card = document.querySelector(".se-card-header");
    // Update the first card header with tile info
    // (Full inspector wired to right panel in future phase)
    _setStatus("se-st-cursor",
        `INSPECT (${col},${row}): ${tile.name} | speed:${tile.speed} | ${tile.impassable ? "IMPASSABLE" : "passable"}`
    );
}

// =========================================================================
// 13. APPLY MAP TO GAME  (Test Play / Export to Game)
// =========================================================================

function applyToGame() {
    if (!_map) { _flash("⚠ No map loaded!"); return; }

    const ts = _map.tileSize;
    let applied = false;

    // Write edited tiles back into the game's worldMap or worldMap_story1 array
    function _writeBack(wm) {
        for (let i = 0; i < _map.cols; i++) {
            if (!wm[i]) wm[i] = [];
            for (let j = 0; j < _map.rows; j++) {
                const src = _map.tiles[i][j];
                if (wm[i][j]) {
                    // Preserve any game-specific fields (e, m, isProcRiver etc)
                    wm[i][j].name       = src.name;
                    wm[i][j].color      = src.color;
                    wm[i][j].speed      = src.speed;
                    wm[i][j].impassable = src.impassable;
                } else {
                    wm[i][j] = { ...src };
                }
            }
        }
    }

    if (_mapType === "sandbox" && typeof worldMap !== "undefined") {
        _writeBack(worldMap);
        applied = true;
    } else if (_mapType === "story1" && typeof worldMap_story1 !== "undefined") {
        _writeBack(worldMap_story1);
        applied = true;
    }

    // Redraw bgCanvas so the game canvas reflects edits immediately
    if (applied && typeof bgCtx !== "undefined" && typeof bgCanvas !== "undefined") {
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        for (let i = 0; i < _map.cols; i++) {
            for (let j = 0; j < _map.rows; j++) {
                bgCtx.fillStyle = _map.tiles[i][j].color;
                bgCtx.fillRect(i * ts, j * ts, ts, ts);
            }
        }
        console.log("[MapEngine] bgCanvas repainted with edited map.");
    }

    if (applied) {
        _flash("✓ Map applied! Closing editor…");
        setTimeout(() => SE.close(), 1200);
    } else {
        _flash("⚠ Cannot apply — map type: " + _mapType + ". Use Save instead.");
    }
}

// =========================================================================
// 14. BUTTON WIRING
// =========================================================================

function _wireButtons() {
    const root = document.getElementById("se-root");
    if (!root) return;

    // ── Rebuild file-ops strip with working buttons ───────────────────────
    const fileOps = root.querySelector(".se-file-ops");
    if (fileOps) {
        fileOps.innerHTML = `
            <button class="se-btn" id="se-btn-new"    title="Create new blank 250×187 map">＋ New</button>
            <button class="se-btn" id="se-btn-sandbox" title="Load the Sandbox (Ancient China) map — requires Sandbox mode to have been run">
                📂 Sandbox
            </button>
            <button class="se-btn" id="se-btn-story1"  title="Load the Story 1 Northern Kyūshū 1274 map — requires Story 1 to have been run">
                📂 Japan
            </button>
            <button class="se-btn" id="se-btn-file"   title="Load a saved .json scenario file from your PC">📂 Load File</button>
            <button class="se-btn primary" id="se-btn-save"  title="Save map to your PC as .json (Ctrl+S)">💾 Save</button>
            <button class="se-btn success"  id="se-btn-test"  title="Apply edits back to the game map and close editor">▶ Test Play</button>
        `;

        root.querySelector("#se-btn-new").onclick = () => {
            if (!_map || confirm("Create new blank map? This will discard the current map."))
                newMap(250, 187);
        };
        root.querySelector("#se-btn-sandbox").onclick = loadSandbox;
        root.querySelector("#se-btn-story1").onclick  = loadStory1;
        root.querySelector("#se-btn-file").onclick    = loadFromFile;
        root.querySelector("#se-btn-save").onclick    = saveMap;
        root.querySelector("#se-btn-test").onclick    = applyToGame;
    }

    // ── Ribbon: zoom + grid + fit ─────────────────────────────────────────
    const ribbon = root.querySelector("#se-ribbon");
    if (ribbon) {
        // Select buttons by position (they're in order: −, zoom display, +, Fit, Grid, Snap, Territory, Routes, Zones, Sep, Gen Island, Smooth, Rivers)
        const btns = ribbon.querySelectorAll(".se-btn");

        // Zoom −
        const zoomOut = ribbon.querySelector(".se-btn:nth-child(2)");
        const zoomIn  = ribbon.querySelector(".se-btn:nth-child(4)");
        const fitBtn  = ribbon.querySelector(".se-btn:nth-child(5)");
        const gridBtn = Array.from(btns).find(b => b.textContent.includes("Grid"));
        const snapBtn = Array.from(btns).find(b => b.textContent.includes("Snap"));

        btns.forEach(b => {
            if (b.textContent.trim() === "−") b.onclick = () => {
                _zoom = _clampZoom(_zoom * 0.80); _dirty = true; _updateZoomLabel();
            };
            if (b.textContent.trim() === "+") b.onclick = () => {
                _zoom = _clampZoom(_zoom * 1.25); _dirty = true; _updateZoomLabel();
            };
            if (b.textContent.includes("Fit")) {
                b.classList.remove("stub"); b.onclick = _fitToView;
            }
            if (b.textContent.includes("Grid")) {
                b.classList.remove("stub");
                b.onclick = () => {
                    _showGrid = !_showGrid;
                    b.style.background = _showGrid
                        ? "linear-gradient(to bottom,#5a3a10,#3a2208)"
                        : "";
                    b.style.borderColor = _showGrid ? "var(--se-gold)" : "";
                    _dirty = true;
                };
            }
        });
    }

    // ── Undo/Redo buttons (title bar) ─────────────────────────────────────
    const titleRight = root.querySelector(".se-title-right");
    if (titleRight) {
        const undoBtn = titleRight.querySelectorAll(".se-btn")[0];
        if (undoBtn) { undoBtn.classList.remove("stub"); undoBtn.onclick = _undo; }
    }
}

// =========================================================================
// 15. PLACEHOLDER MANAGEMENT
// =========================================================================

function _hidePlaceholder() {
    const ph = document.querySelector(".se-viewport-placeholder");
    if (ph) ph.style.display = "none";
}
function _showPlaceholder() {
    const ph = document.querySelector(".se-viewport-placeholder");
    if (ph) ph.style.display = "";
}

// =========================================================================
// 16. INIT  (called after ScenarioEditor.open() inserts the DOM)
// =========================================================================

function _init() {
    _wireButtons();
    _setupEvents();
    _updateZoomLabel();

    // If a map was already loaded in a previous open() session, show it
    if (_map) {
        _hidePlaceholder();
        _dirty = true;
    }

    // Start the render loop
    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(_render);

    console.log("[MapEngine] Initialised. Map:", _map ? `${_map.cols}×${_map.rows}` : "none");
}

// =========================================================================
// 17. HOOK INTO ScenarioEditor OPEN / CLOSE
// =========================================================================

const _origOpen  = SE.open.bind(SE);
const _origClose = SE.close.bind(SE);

SE.open = function () {
    _origOpen();
    // DOM is inserted synchronously, so we can init immediately.
    // Use setTimeout(0) to let the browser measure clientWidth/Height.
    setTimeout(_init, 0);
};

SE.close = function () {
    // Clean up RAF before removing DOM
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    document.removeEventListener("keydown", _onKey);
    _origClose();
};

// =========================================================================
// 18. PUBLIC EXTENSION API
// =========================================================================

SE.mapEngine = {
    loadSandbox,
    loadStory1,
    loadFromFile,
    saveMap,
    newMap,
    applyToGame,
    undo: _undo,
    getMap:     () => _map,
    getMapType: () => _mapType,
    TILE_DEFS,
};

console.log("[ScenarioEditor] Map Engine v2 loaded — window.ScenarioEditor.mapEngine ready.");
```

})(window.ScenarioEditor);
