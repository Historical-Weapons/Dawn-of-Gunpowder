// ============================================================================
// NAVAL BATTLE TACTICAL ENGINE (River, Coastal, Ocean) - Song Dynasty v4
// ============================================================================
// SAIL CANVAS INTERFACE for the main engine:
//   Each frame set:  navalEnvironment.cameraX / .cameraY / .cameraScale
//                    (mirror whatever translate/scale you apply to the main ctx)
//   On battle end:   cleanupNavalSailCanvas()
//
// The sail overlay runs its own requestAnimationFrame loop so no extra draw
// call is needed in the main engine — it stays in sync via navalEnvironment.
// ============================================================================

window.inNavalBattle = false;
window.navalEnvironment = {
    mapType    : "Ocean",
    coastSide  : -1,
    ships      : [],
    waves      : [],
    fishes     : [],
    seagulls   : [],
    waterColor : "#2b4a5f",
    landColor  : "#6b7a4a",
    shipSwayX  : 0,
    shipSwayY  : 0,
    // --- Sail overlay canvas ---
    sailCanvas : null,
    sailCtx    : null,
    mainCanvas : null,
    // --- Camera mirror (set these to match your main ctx transform each frame) ---
    cameraX    : 0,
    cameraY    : 0,
    cameraScale: 1
};

// Song Dynasty ship classes:
//   輕型哨船 Light Scout  |  中型戰船 Medium Warship  |  大型樓船 Heavy Tower Ship
const SHIP_TYPES = {
    LIGHT:  { maxMen:30,   width:750,  height:300, color:"#3d2418", deck:"#7a5c3a", mastCount:1, sailScale:0.40 },
    MEDIUM: { maxMen:80,   width:1200, height:480, color:"#2e1a0f", deck:"#6e5030", mastCount:2, sailScale:0.48 },
    HEAVY:  { maxMen:9999, width:1800, height:660, color:"#1e1008", deck:"#5e4228", mastCount:3, sailScale:0.54 }
};

// ============================================================================
// INIT
// ============================================================================

function initNavalBattle(enemyNPC, playerObj, tileType, pCount, eCount) {
    window.inNavalBattle = true;
    inBattleMode = true;
    if (typeof inSiegeBattle !== 'undefined') inSiegeBattle = false;

    navalEnvironment.mapType = tileType;
    if (tileType === "River") {
        navalEnvironment.waterColor = "#2c7278";
        navalEnvironment.landColor  = "#4a5d23";
    } else if (tileType === "Coastal") {
        navalEnvironment.waterColor = "#355b70";
        navalEnvironment.landColor  = "#c2a672";
        navalEnvironment.coastSide  = Math.floor(Math.random() * 4);
    } else {
        navalEnvironment.waterColor = "#1a3344";
        navalEnvironment.landColor  = "#000000";
    }

    generateNavalMap();
    generateShips(pCount, eCount);
    generateCosmetics();
    initSailCanvas();
}

// ============================================================================
// MAP GENERATION
// ============================================================================

function generateNavalMap() {
    const grid = Array.from({ length: BATTLE_COLS }, () => Array(BATTLE_ROWS).fill(11));

    if (navalEnvironment.mapType === "River") {
        for (let x = 0; x < BATTLE_COLS; x++) {
            for (let y = 0; y < BATTLE_ROWS; y++) {
                let bankL = (BATTLE_COLS * 0.25) + (Math.sin(y * 0.05) * 12);
                let bankR = (BATTLE_COLS * 0.75) + (Math.sin(y * 0.04 + 2) * 12);
                if (x < bankL || x > bankR) {
                    grid[x][y] = 0;
                    if (Math.random() > 0.95) grid[x][y] = 3;
                    else if (Math.random() > 0.98) grid[x][y] = 6;
                }
            }
        }
    } else if (navalEnvironment.mapType === "Coastal") {
        const side = navalEnvironment.coastSide;
        for (let x = 0; x < BATTLE_COLS; x++) {
            for (let y = 0; y < BATTLE_ROWS; y++) {
                let isLand = false;
                let wave   = Math.sin(x * 0.05 + y * 0.05) * 10;
                if      (side === 0 && x < (BATTLE_COLS * 0.2) + wave) isLand = true;
                else if (side === 1 && x > (BATTLE_COLS * 0.8) - wave) isLand = true;
                else if (side === 2 && y < (BATTLE_ROWS * 0.2) + wave) isLand = true;
                else if (side === 3 && y > (BATTLE_ROWS * 0.8) - wave) isLand = true;
                if (isLand) {
                    grid[x][y] = 0;
                    if (Math.random() > 0.97) grid[x][y] = 6;
                    if (Math.random() > 0.98 && Math.abs(wave) > 5) grid[x][y] = 3;
                }
            }
        }
    }

    battleEnvironment.grid        = grid;
    battleEnvironment.groundColor = navalEnvironment.waterColor;
}

// ============================================================================
// SHIP GENERATION
// ============================================================================

function generateShips(pCount, eCount) {
    navalEnvironment.ships = [];

    let pType = SHIP_TYPES.HEAVY;
    if (pCount <= 30)  pType = SHIP_TYPES.LIGHT;
    else if (pCount <= 100) pType = SHIP_TYPES.MEDIUM;

    let eType = SHIP_TYPES.HEAVY;
    if (eCount <= 30)  eType = SHIP_TYPES.LIGHT;
    else if (eCount <= 100) eType = SHIP_TYPES.MEDIUM;

    let centerX = BATTLE_WORLD_WIDTH  / 2;
    let centerY = BATTLE_WORLD_HEIGHT / 2;

    if (navalEnvironment.mapType === "Coastal") {
        if (navalEnvironment.coastSide === 0) centerX = BATTLE_WORLD_WIDTH  * 0.65;
        if (navalEnvironment.coastSide === 1) centerX = BATTLE_WORLD_WIDTH  * 0.35;
        if (navalEnvironment.coastSide === 2) centerY = BATTLE_WORLD_HEIGHT * 0.65;
        if (navalEnvironment.coastSide === 3) centerY = BATTLE_WORLD_HEIGHT * 0.35;
    }

    let gap = 20;

    let pShip = {
        side:"player", x:centerX, y:centerY + (pType.height/2) + gap,
        width:pType.width, height:pType.height,
        color:pType.color, deck:pType.deck,
        mastCount:pType.mastCount, sailScale:pType.sailScale
    };
    let eShip = {
        side:"enemy",  x:centerX, y:centerY - (eType.height/2) - gap,
        width:eType.width, height:eType.height,
        color:eType.color, deck:eType.deck,
        mastCount:eType.mastCount, sailScale:eType.sailScale
    };

    navalEnvironment.ships.push(pShip, eShip);

    // Stamp collision into grid
    navalEnvironment.ships.forEach(s => {
        let startX = Math.max(0, Math.floor((s.x - s.width/2)  / BATTLE_TILE_SIZE));
        let endX   = Math.min(BATTLE_COLS-1, Math.floor((s.x + s.width/2)  / BATTLE_TILE_SIZE));
        let startY = Math.max(0, Math.floor((s.y - s.height/2) / BATTLE_TILE_SIZE));
        let endY   = Math.min(BATTLE_ROWS-1, Math.floor((s.y + s.height/2) / BATTLE_TILE_SIZE));

        for (let tx = startX; tx <= endX; tx++) {
            for (let ty = startY; ty <= endY; ty++) {
                let dx = tx * BATTLE_TILE_SIZE - s.x;
                let dy = ty * BATTLE_TILE_SIZE - s.y;
                let rx = s.width/2, ry = s.height/2;
                let dist = Math.pow(Math.abs(dx)/rx, 2.5) + Math.pow(Math.abs(dy)/ry, 2.5);
                if (dist <= 1) {
                    battleEnvironment.grid[tx][ty] = 0;
                    if (dist > 0.92) battleEnvironment.grid[tx][ty] = 8;
                    if (Math.abs(dx) < 250) {
                        if (s.side === "player" && dy < 0) battleEnvironment.grid[tx][ty] = 0;
                        if (s.side === "enemy"  && dy > 0) battleEnvironment.grid[tx][ty] = 0;
                    }
                }
            }
        }
    });
}

// ============================================================================
// COSMETICS
// ============================================================================

function generateCosmetics() {
    navalEnvironment.waves = []; navalEnvironment.fishes = []; navalEnvironment.seagulls = [];

    for (let i = 0; i < 300; i++) {
        navalEnvironment.waves.push({
            x:Math.random()*BATTLE_WORLD_WIDTH, y:Math.random()*BATTLE_WORLD_HEIGHT,
            speed:0.2+Math.random()*0.4, length:30+Math.random()*50, offset:Math.random()*100
        });
    }
    for (let i = 0; i < 40; i++) {
        navalEnvironment.fishes.push({
            x:Math.random()*BATTLE_WORLD_WIDTH, y:Math.random()*BATTLE_WORLD_HEIGHT,
            angle:Math.random()*Math.PI*2, speed:0.5+Math.random(), length:15+Math.random()*15,
            wiggleRate:2+Math.random()*3
        });
    }
    for (let i = 0; i < 15; i++) {
        navalEnvironment.seagulls.push({
            x:Math.random()*BATTLE_WORLD_WIDTH, y:Math.random()*BATTLE_WORLD_HEIGHT,
            angle:Math.random()*Math.PI*2, speed:2+Math.random()*2,
            flapRate:8+Math.random()*5, scale:0.8+Math.random()*0.6
        });
    }
}

// ============================================================================
// SAIL CANVAS — second HTML canvas layer, rendered above all units
// ============================================================================

function initSailCanvas() {
    let old = document.getElementById('navalSailCanvas');
    if (old) old.remove();

    let mc = document.getElementById('battleCanvas')
          || document.getElementById('gameCanvas')
          || document.querySelector('canvas');
    if (!mc) { console.warn('[NavalEngine] No main canvas found — sail overlay disabled.'); return; }

    navalEnvironment.mainCanvas = mc;

    let sc       = document.createElement('canvas');
    sc.id        = 'navalSailCanvas';
    sc.width     = mc.width;
    sc.height    = mc.height;
    sc.style.cssText = [
        'position:absolute',
        'pointer-events:none',
        'z-index:' + (parseInt(mc.style.zIndex || '0') + 5),
        'left:'    + mc.offsetLeft + 'px',
        'top:'     + mc.offsetTop  + 'px'
    ].join(';');

    mc.parentNode.insertBefore(sc, mc.nextSibling);
    navalEnvironment.sailCanvas = sc;
    navalEnvironment.sailCtx    = sc.getContext('2d');

    _startSailLoop();
}

function cleanupNavalSailCanvas() {
    let el = document.getElementById('navalSailCanvas');
    if (el) el.remove();
    navalEnvironment.sailCanvas = null;
    navalEnvironment.sailCtx    = null;
}

// Self-contained RAF loop — does not need a call from the main engine
function _startSailLoop() {
    (function loop() {
        if (!inNavalBattle || !navalEnvironment.sailCtx) return;
        drawNavalSailOverlay();
        requestAnimationFrame(loop);
    })();
}

// Can also be called manually if preferred over the auto-loop
function drawNavalSailOverlay() {
    if (!inNavalBattle) return;
    let ctx = navalEnvironment.sailCtx;
    if (!ctx) return;

    let sc = navalEnvironment.sailCanvas;
    let mc = navalEnvironment.mainCanvas;
    if (mc && (sc.width !== mc.width || sc.height !== mc.height)) {
        sc.width = mc.width; sc.height = mc.height;
    }

    ctx.clearRect(0, 0, sc.width, sc.height);
    ctx.save();
    ctx.translate(navalEnvironment.cameraX,    navalEnvironment.cameraY);
    ctx.scale(navalEnvironment.cameraScale,    navalEnvironment.cameraScale);
    ctx.translate(navalEnvironment.shipSwayX,  navalEnvironment.shipSwayY);

    navalEnvironment.ships.forEach(s => _drawJunkSails(ctx, s));

    ctx.restore();
}

// ============================================================================
// JUNK SAIL DRAWING — Song/Ming battened lug sails, top-down view
// ============================================================================

function _drawJunkSails(ctx, s) {
    let w    = s.width;
    let h    = s.height;
    let time = Date.now() / 1000;

    // Mast layout along the ship centerline (stern at -X, bow at +X)
    let masts = [];
    if (s.mastCount === 1) {
        masts = [{ x: w*0.06, sw: w*0.13, sh: h*s.sailScale, isMain:true }];
    } else if (s.mastCount === 2) {
        masts = [
            { x:-w*0.11, sw:w*0.10, sh:h*s.sailScale*0.82, isMain:false }, // mizzen
            { x: w*0.16, sw:w*0.13, sh:h*s.sailScale,      isMain:true  }  // main
        ];
    } else {
        masts = [
            { x:-w*0.22, sw:w*0.08, sh:h*s.sailScale*0.72, isMain:false }, // mizzen
            { x: w*0.04, sw:w*0.15, sh:h*s.sailScale,      isMain:true  }, // main
            { x: w*0.24, sw:w*0.10, sh:h*s.sailScale*0.84, isMain:false }  // fore
        ];
    }

    ctx.save();
    ctx.translate(s.x, s.y);

    masts.forEach((mast, idx) => {
        let mx  = mast.x;
        let sw  = mast.sw;
        let sh  = mast.sh;
        // Wind billow: leeward edge bows out based on a gentle sine
        let billow = Math.sin(time * 0.55 + idx * 1.4) * (sw * 0.05) + sw * 0.045;

        // --- Deck shadow cast by the sail ---
        ctx.save();
        ctx.globalAlpha = 0.20;
        ctx.fillStyle   = "#000";
        ctx.beginPath();
        ctx.ellipse(mx + sw*0.28 + 5, 4, sw*0.70, sh*0.36, 0.06, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();

        // --- Clip sails inside hull ellipse so they never bleed outside ---
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, w*0.47, h*0.44, 0, 0, Math.PI*2);
        ctx.clip();

        // Sail colour: player = ochre/tan, enemy = deep rust red
        let sailBase = s.side === "player" ? "#c8a055" : "#b03428";
        let sailEdge = s.side === "player" ? "#9e7628" : "#881e10";

        // Sail shape — near-rectangular, leeward edge billowed by quadratic curve
        ctx.beginPath();
        ctx.moveTo(mx - sw*0.5,  -sh*0.5);
        ctx.lineTo(mx + sw*0.5 + billow, -sh*0.5);
        ctx.quadraticCurveTo(mx + sw*0.5 + billow*1.9, 0,
                             mx + sw*0.5 + billow,  sh*0.5);
        ctx.lineTo(mx - sw*0.5,   sh*0.5);
        ctx.closePath();

        // Horizontal gradient: luff (dark) → middle (light) → leech (dark)
        let grad = ctx.createLinearGradient(mx - sw*0.5, 0, mx + sw*0.5 + billow, 0);
        grad.addColorStop(0,    sailEdge);
        grad.addColorStop(0.35, sailBase);
        grad.addColorStop(1,    sailEdge);
        ctx.fillStyle = grad;
        ctx.fill();

        // Sail perimeter stroke
        ctx.strokeStyle = "#180e04";
        ctx.lineWidth   = 1.8;
        ctx.stroke();

        // --- BATTENS — the defining feature of a Chinese junk sail ---
        // Song-era junks used 6-9 bamboo battens per sail; more battens = more rigidity
        let battenCount = mast.isMain ? 8 : 6;
        ctx.strokeStyle = "#2e1a08";
        ctx.lineWidth   = mast.isMain ? 2.8 : 2.2;
        ctx.lineCap     = "round";
        for (let b = 0; b <= battenCount; b++) {
            let by     = -sh*0.5 + (sh / battenCount) * b;
            // Each batten follows the local billow (tapers at top and bottom of sail)
            let localB = billow * Math.sin((b / battenCount) * Math.PI);
            ctx.beginPath();
            ctx.moveTo(mx - sw*0.5,             by);
            ctx.lineTo(mx + sw*0.5 + localB,    by);
            ctx.stroke();
        }

        // Alternate panel shading — gives each cloth panel depth between battens
        ctx.globalAlpha = 0.07;
        ctx.fillStyle   = "#000";
        for (let b = 0; b < battenCount; b += 2) {
            let by0 = -sh*0.5 + (sh / battenCount) * b;
            let ph  = sh / battenCount;
            ctx.fillRect(mx - sw*0.5, by0, sw + billow, ph);
        }
        ctx.globalAlpha = 1;

        ctx.restore(); // end hull clip

        // --- MAST cross-section (viewed from directly above) ---
        let mastR = mast.isMain ? 7 : 5;
        // Drop shadow
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath(); ctx.arc(mx+3, 3, mastR+1, 0, Math.PI*2); ctx.fill();
        // Lacquered wood
        ctx.fillStyle = "#2c1508";
        ctx.beginPath(); ctx.arc(mx, 0, mastR, 0, Math.PI*2); ctx.fill();
        // Highlight
        ctx.fillStyle = "#5c3018";
        ctx.beginPath(); ctx.arc(mx-1, -1, mastR*0.5, 0, Math.PI*2); ctx.fill();

        // Halyard rope (faint dashed line from mast head to top-leech corner)
        ctx.strokeStyle = "rgba(120,80,40,0.45)";
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(mx, 0);
        ctx.lineTo(mx + sw*0.5 + billow, -sh*0.5);
        ctx.stroke();
        ctx.setLineDash([]);
    });

    ctx.restore();
}

// ============================================================================
// PHYSICS UPDATE
// ============================================================================

function updateNavalPhysics() {
    if (!inNavalBattle) return;

    let time = Date.now();
    navalEnvironment.shipSwayX = Math.sin(time / 1500) * 8;
    navalEnvironment.shipSwayY = Math.cos(time / 1200) * 4;

    battleEnvironment.units.forEach(unit => {
        if (unit.hp <= 0) return;
        let tx          = Math.floor(unit.x / BATTLE_TILE_SIZE);
        let ty          = Math.floor(unit.y / BATTLE_TILE_SIZE);
        let currentTile = (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty]) ? battleEnvironment.grid[tx][ty] : 0;
        let inWater     = (currentTile === 4 || currentTile === 11);

        if (inWater) {
            unit.overboardTimer = (unit.overboardTimer || 0) + 1;
            if (unit.overboardTimer > 120) {
                unit.isSwimming = true;
            } else {
                unit.isSwimming = false;
                unit.vx *= 0.3; unit.vy *= 0.3;
            }
        } else {
            unit.overboardTimer = 0;
            unit.isSwimming     = false;
        }

        if (unit.isSwimming) {
            unit.vx *= 0.15; unit.vy *= 0.15;
            if (!unit.drownTimer) unit.drownTimer = 0;
            let drownThreshold = Math.max(150, 1500 - ((unit.stats.weightTier||1)*250) - (unit.stats.mass||10));
            unit.drownTimer++;
            if (unit.drownTimer > drownThreshold) {
                unit.hp = 0; unit.deathRotation = 0;
                if (typeof logGameEvent === 'function') logGameEvent(`${unit.unitType} drowned beneath the waves!`, "danger");
            }
        } else {
            if (unit.drownTimer > 0) unit.drownTimer -= 2;
        }
    });

    navalEnvironment.fishes.forEach(f => {
        f.x += Math.cos(f.angle) * f.speed;
        f.y += Math.sin(f.angle) * f.speed;
        if (Math.random() > 0.98) f.angle += (Math.random() - 0.5) * 2;
        if (f.x < 0) f.x = BATTLE_WORLD_WIDTH;  if (f.x > BATTLE_WORLD_WIDTH)  f.x = 0;
        if (f.y < 0) f.y = BATTLE_WORLD_HEIGHT; if (f.y > BATTLE_WORLD_HEIGHT) f.y = 0;
        f.currentWiggle = (Date.now() / 1000) * f.wiggleRate;
    });

    navalEnvironment.seagulls.forEach(g => {
        g.x += Math.cos(g.angle) * g.speed;
        g.y += Math.sin(g.angle) * g.speed;
        let banking = (Math.random() > 0.99) ? 0.05 : 0.005;
        g.angle += banking;
        g.speed  = (Math.random() > 0.99) ? 2 + Math.random()*4 : Math.max(1.5, g.speed*0.995);
        if (g.x < -100) g.x = BATTLE_WORLD_WIDTH+100;  if (g.x > BATTLE_WORLD_WIDTH+100)  g.x = -100;
        if (g.y < -100) g.y = BATTLE_WORLD_HEIGHT+100; if (g.y > BATTLE_WORLD_HEIGHT+100) g.y = -100;
        g.currentFlap = (Date.now() / 1000) * g.flapRate;
    });
}

// ============================================================================
// SHIP DETECTION
// ============================================================================

function isUnitOnShip(unit) {
    let tx = Math.floor(unit.x / BATTLE_TILE_SIZE);
    let ty = Math.floor(unit.y / BATTLE_TILE_SIZE);
    if (!battleEnvironment.grid[tx] || battleEnvironment.grid[tx][ty] === undefined) return false;
    return battleEnvironment.grid[tx][ty] === 0 || battleEnvironment.grid[tx][ty] === 8;
}

// ============================================================================
// BACKGROUND DRAW
// ============================================================================

function drawNavalBackground(ctx) {
    if (!inNavalBattle) return;
    if (navalEnvironment.mapType !== "Ocean") {
        ctx.fillStyle = navalEnvironment.landColor;
        for (let x = 0; x < BATTLE_COLS; x++) {
            for (let y = 0; y < BATTLE_ROWS; y++) {
                if (battleEnvironment.grid[x][y] !== 11) {
                    ctx.fillRect(x*BATTLE_TILE_SIZE, y*BATTLE_TILE_SIZE, BATTLE_TILE_SIZE, BATTLE_TILE_SIZE);
                }
            }
        }
    }
}

// ============================================================================
// SHIP HULL DRAW — Song Dynasty 樓船 top-down view
// Sails are rendered on the separate sail canvas overlay, NOT here.
// ============================================================================

function drawNavalShips(ctx) {
    if (!inNavalBattle) return;

    ctx.save();
    ctx.translate(navalEnvironment.shipSwayX, navalEnvironment.shipSwayY);

    navalEnvironment.ships.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        let w = s.width, h = s.height;

        // ── 1. HULL WATER SHADOW ──────────────────────────────────────────
        ctx.save();
        ctx.globalAlpha = 0.26;
        ctx.fillStyle   = "#000";
        ctx.beginPath();
        ctx.ellipse(10, 8, w*0.49, h*0.41, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();

        // ── 2. ANTI-FOULING WATERLINE (red ochre — authentic Song practice) ──
        ctx.fillStyle = "#6b1515";
        ctx.beginPath();
        ctx.moveTo(-w*0.470, -h*0.375);
        ctx.quadraticCurveTo(-w*0.08, -h*0.595, w*0.390, -h*0.298);
        ctx.lineTo( w*0.520, 0);
        ctx.lineTo( w*0.390,  h*0.298);
        ctx.quadraticCurveTo(-w*0.08,  h*0.595, -w*0.470,  h*0.375);
        ctx.lineTo(-w*0.545, 0);
        ctx.closePath();
        ctx.fill();

        // ── 3. MAIN HULL (dark lacquered teak / camphor wood) ─────────────
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(-w*0.445, -h*0.348);
        ctx.quadraticCurveTo(-w*0.06, -h*0.548, w*0.372, -h*0.272);
        ctx.lineTo( w*0.492, 0);
        ctx.lineTo( w*0.372,  h*0.272);
        ctx.quadraticCurveTo(-w*0.06,  h*0.548, -w*0.445,  h*0.348);
        ctx.lineTo(-w*0.512, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#110804"; ctx.lineWidth = 5; ctx.stroke();

        // ── 4. HULL STRAKES (structural planking lines on the hull sides) ──
        //    Two subtle curves near the perimeter only — NO full-deck planking
        ctx.strokeStyle = "rgba(0,0,0,0.27)"; ctx.lineWidth = 1.5;
        [0.870, 0.932].forEach(so => {
            ctx.beginPath();
            ctx.moveTo(-w*0.42*so, -h*0.32*so);
            ctx.quadraticCurveTo(-w*0.02*so, -h*0.52*so, w*0.35*so, -h*0.25*so);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-w*0.42*so,  h*0.32*so);
            ctx.quadraticCurveTo(-w*0.02*so,  h*0.52*so, w*0.35*so,  h*0.25*so);
            ctx.stroke();
        });

        // ── 5. DECK SURFACE (lighter wood, clean — no planking grid) ──────
        ctx.fillStyle = s.deck;
        ctx.beginPath();
        ctx.moveTo(-w*0.402, -h*0.272);
        ctx.quadraticCurveTo(-w*0.02, -h*0.432, w*0.300, -h*0.196);
        ctx.lineTo( w*0.395, 0);
        ctx.lineTo( w*0.300,  h*0.196);
        ctx.quadraticCurveTo(-w*0.02,  h*0.432, -w*0.402,  h*0.272);
        ctx.lineTo(-w*0.442, 0);
        ctx.closePath();
        ctx.fill();

        // Very subtle centerline grain only (3 faint marks, not a grid)
        ctx.strokeStyle = "rgba(0,0,0,0.10)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-w*0.38, 0);        ctx.lineTo(w*0.36, 0);        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-w*0.34,-h*0.10);   ctx.lineTo(w*0.30,-h*0.08);   ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-w*0.34, h*0.10);   ctx.lineTo(w*0.30, h*0.08);   ctx.stroke();

        // ── 6. STERN CASTLE 艉樓 (port/-X) — tiered tower ship structure ──
        // Tier 1 base
        ctx.fillStyle = "#2a1608";
        ctx.beginPath();
        ctx.moveTo(-w*0.462, -h*0.292);
        ctx.lineTo(-w*0.196, -h*0.292);
        ctx.lineTo(-w*0.176,  0);
        ctx.lineTo(-w*0.196,  h*0.292);
        ctx.lineTo(-w*0.462,  h*0.292);
        ctx.lineTo(-w*0.512,  0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#8b1c1c"; ctx.lineWidth = 3; ctx.stroke();

        // Tier 1 eave curves (red lacquer roof edge seen from above)
        ctx.strokeStyle = "#a52020"; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w*0.456, -h*0.284);
        ctx.quadraticCurveTo(-w*0.322, -h*0.324, -w*0.200, -h*0.282);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w*0.456,  h*0.284);
        ctx.quadraticCurveTo(-w*0.322,  h*0.324, -w*0.200,  h*0.282);
        ctx.stroke();

        // Tier 2 upper level — medium and heavy ships
        if (w >= 1100) {
            ctx.fillStyle = "#38200e";
            ctx.beginPath();
            ctx.moveTo(-w*0.452, -h*0.202);
            ctx.lineTo(-w*0.237, -h*0.202);
            ctx.lineTo(-w*0.218,  0);
            ctx.lineTo(-w*0.237,  h*0.202);
            ctx.lineTo(-w*0.452,  h*0.202);
            ctx.lineTo(-w*0.490,  0);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#b02424"; ctx.lineWidth = 2; ctx.stroke();
            ctx.strokeStyle = "#c83030"; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-w*0.446, -h*0.196);
            ctx.quadraticCurveTo(-w*0.342, -h*0.222, -w*0.242, -h*0.194);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-w*0.446,  h*0.196);
            ctx.quadraticCurveTo(-w*0.342,  h*0.222, -w*0.242,  h*0.194);
            ctx.stroke();
        }

        // Tier 3 command pavilion — heavy ships only (大型樓船)
        if (w >= 1550) {
            ctx.fillStyle = "#4a2812";
            ctx.beginPath();
            ctx.ellipse(-w*0.432, 0, w*0.040, h*0.108, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = "#d03030"; ctx.lineWidth = 1.5; ctx.stroke();
        }

        // ── 7. BOW CASTLE 前樓 (starboard/+X) — forward fire platform ────
        ctx.fillStyle = "#2e1b0d";
        ctx.beginPath();
        ctx.moveTo( w*0.216, -h*0.178);
        ctx.lineTo( w*0.366, -h*0.122);
        ctx.lineTo( w*0.436,  0);
        ctx.lineTo( w*0.366,  h*0.122);
        ctx.lineTo( w*0.216,  h*0.178);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#7a1818"; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = "#992222"; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(w*0.222, -h*0.172);
        ctx.quadraticCurveTo(w*0.292, -h*0.202, w*0.362, -h*0.118);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w*0.222,  h*0.172);
        ctx.quadraticCurveTo(w*0.292,  h*0.202, w*0.362,  h*0.118);
        ctx.stroke();

 

        // ── 9. STERN LANTERNS (red paper lanterns with candle flicker) ───
        let t    = Date.now() / 1000;
        let flick = 0.85 + Math.sin(t*4.3 + s.y*0.001) * 0.15;
        [-h*0.196, h*0.196].forEach(ly => {
            ctx.save();
            ctx.globalAlpha = 0.18 * flick;
            ctx.fillStyle   = "#ff6020";
            ctx.beginPath(); ctx.arc(-w*0.490, ly, 16, 0, Math.PI*2); ctx.fill();
            ctx.restore();
            ctx.fillStyle = "#cc2020";
            ctx.beginPath(); ctx.ellipse(-w*0.490, ly, 5, 7, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#d4a010";
            ctx.fillRect(-w*0.490-5, ly-8, 10, 2);
            ctx.fillRect(-w*0.490-5, ly+6, 10, 2);
        });

        // ── 10. BOW ANCHOR FITTING ────────────────────────────────────────
        ctx.fillStyle = "#666"; ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(w*0.442, 0, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#555"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(w*0.442, 0, 9, -Math.PI*0.4, Math.PI*0.4); ctx.stroke();

        ctx.restore(); // end ship translate
    });

    // ── BOARDING PLANKS ───────────────────────────────────────────────────
    if (navalEnvironment.ships.length === 2) {
        let pShip = navalEnvironment.ships.find(s => s.side === "player");
        let eShip = navalEnvironment.ships.find(s => s.side === "enemy");
        if (pShip && eShip) {
           let originalStart  = eShip.y + (eShip.height/2) - 15;
let originalEnd    = (pShip.y - (pShip.height/2)) + 15;

// 1. Find midpoint between ships
let midPoint = (originalStart + originalEnd) / 2;

// 2. Double the height
let gapHeight = (originalEnd - originalStart) * 2;

// 3. Re-center so it's perfectly symmetrical
let gapStart = midPoint - (gapHeight / 2);
            if (gapHeight > 0) {
                for (let i = -1.5; i <= 1.5; i++) {
                    let px = pShip.x + (i*90) - 25;
                    ctx.fillStyle = "#5c4033";
                    ctx.fillRect(px, gapStart, 50, gapHeight);
                    // Wood grain
                    ctx.strokeStyle = "rgba(0,0,0,0.17)"; ctx.lineWidth = 1;
                    for (let g = 14; g < gapHeight; g += 20) {
                        ctx.beginPath();
                        ctx.moveTo(px+4,  gapStart+g);
                        ctx.lineTo(px+46, gapStart+g);
                        ctx.stroke();
                    }
                    // Plank border
                    ctx.strokeStyle = "#2e1a0f"; ctx.lineWidth = 3;
                    ctx.strokeRect(px, gapStart, 50, gapHeight);
                    // Iron nails
                    ctx.fillStyle = "#888";
                    [[12,12],[38,12],[12,gapHeight-16],[38,gapHeight-16]].forEach(([nx,ny]) => {
                        ctx.beginPath(); ctx.arc(px+nx, gapStart+ny, 2.5, 0, Math.PI*2); ctx.fill();
                    });
                }
            }
        }
    }

    ctx.restore(); // end sway translate
}

// ============================================================================
// WAVES & COSMETICS DRAW
// ============================================================================

function drawCosmeticWaves(ctx) {
    if (!inNavalBattle) return;
    let time = Date.now() / 1000;

    ctx.strokeStyle = "rgba(255,255,255,0.13)"; ctx.lineWidth = 2;
    navalEnvironment.waves.forEach(w => {
        let wx = w.x + Math.sin(time * w.speed + w.offset) * 20;
        let tx = Math.floor(wx / BATTLE_TILE_SIZE);
        let ty = Math.floor(w.y / BATTLE_TILE_SIZE);
        if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 11) {
            ctx.beginPath();
            ctx.quadraticCurveTo(wx + w.length/2, w.y - 5, wx + w.length, w.y);
            ctx.stroke();
        }
    });

    ctx.save();
    ctx.fillStyle = "rgba(10,25,40,0.40)";
    navalEnvironment.fishes.forEach(f => {
        let tx = Math.floor(f.x / BATTLE_TILE_SIZE);
        let ty = Math.floor(f.y / BATTLE_TILE_SIZE);
        if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 11) {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.angle + Math.sin(f.currentWiggle||0) * 0.2);
            ctx.beginPath(); ctx.ellipse(0, 0, f.length, f.length/4, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-f.length,0); ctx.lineTo(-f.length-8,-6); ctx.lineTo(-f.length-8,6); ctx.fill();
            ctx.restore();
        }
    });
    ctx.restore();

    navalEnvironment.seagulls.forEach(g => {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.13)";
        ctx.beginPath();
        ctx.ellipse(g.x+15*g.scale, g.y+15*g.scale, 4*g.scale, 2*g.scale, g.angle, 0, Math.PI*2);
        ctx.fill();

        ctx.translate(g.x, g.y); ctx.scale(g.scale, g.scale); ctx.rotate(g.angle);
        let flap = Math.sin(g.currentFlap||0) * 8;

        ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(-10,-12+flap,-22, 2+flap); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo( 10,-12+flap, 22, 2+flap); ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.ellipse(1,0,4,2,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = "#ffc107";
        ctx.beginPath(); ctx.moveTo(4,-1); ctx.lineTo(7,0); ctx.lineTo(4,1); ctx.fill();
        ctx.restore();
    });
}

// ============================================================================
// SWIMMING / DROWNING VISUAL
// ============================================================================

function applyWaterClippingPlaceholder(ctx, unit) {
    if (unit.isSwimming && unit.hp > 0) {
        let swayX = navalEnvironment.shipSwayX;
        let swayY = navalEnvironment.shipSwayY;
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.ellipse(unit.x+swayX, unit.y+5+swayY, 15, 6, 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(unit.x-50+swayX, unit.y-50+swayY, 100, 55);
        ctx.clip();
    }
}
