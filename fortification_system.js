// ============================================================================
// REVISED CITY WALL & DEFENSE SYSTEM 
// ============================================================================
let overheadCityGates = [];
let cityTowerDoors = []; // Tracks two-way inner tower doors (ground <-> wall)
let fortificationTroops = {}; 
 let cityLadders = [];
 
 function drawCityGateBlock(ctx, grid, gate, arch, midX, gateRadius, startY, endY, wallThick) {
    const tile = CITY_TILE_SIZE;
    const isNorth = gate.side === "north";
    const gateY0 = isNorth ? startY : endY - wallThick + 1;
    const gateY1 = gateY0 + wallThick - 1;
    const gateX0 = midX - gateRadius;
    const gateX1 = midX + gateRadius;

    const hp = Math.max(0, Math.min(1000, gate.gateHP ?? 1000));
    const wear = 1 - hp / 1000;
    const open = !!gate.isOpen || hp <= 0;

    const px = gateX0 * tile;
    const py = gateY0 * tile;
    const pw = (gateX1 - gateX0 + 1) * tile;
    const ph = (gateY1 - gateY0 + 1) * tile;
    const cx = px + pw / 2;

    // 1. Write collision for the whole gate block
    for (let x = gateX0; x <= gateX1; x++) {
        for (let y = gateY0; y <= gateY1; y++) {
            if (!grid[x] || grid[x][y] === undefined) continue;
            const isPillar = Math.abs(x - midX) === gateRadius;
            grid[x][y] = isPillar ? 6 : (open ? 1 : 6);
        }
    }

    // 2. Pillars at the outer edges
    ctx.fillStyle = "#37474f";
    ctx.fillRect(gateX0 * tile, py, tile, ph);
    ctx.fillRect(gateX1 * tile, py, tile, ph);

    // --- DYNAMIC ROOF CALCULATION ---
    // North Gate: roof at py (top edge). 
    // South Gate: roof at bottom edge (py + wall thickness - roof height).
    const capY = isNorth ? py : (py + ph - 4);

    if (open) {
        // --- OPEN GATE STATE ---
ctx.fillStyle = "rgba(140, 140, 140, 0)";
        ctx.fillRect(px, py, pw, ph);

 

        const leafIn = tile * 0.55;
        const leafOut = tile * 1.9;
        const topBias = isNorth ? 3 : 8;
        const bottomBias = isNorth ? 8 : 3;

        // Left leaf
        ctx.fillStyle = "#5d4037";
        ctx.strokeStyle = "#2a1b16";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + 2);
        ctx.lineTo(px + leafIn, py + topBias);
        ctx.lineTo(px + leafOut, py + ph - bottomBias);
        ctx.lineTo(px + 2, py + ph - 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right leaf
        ctx.fillStyle = "#5d4037";
        ctx.strokeStyle = "#2a1b16";
        ctx.beginPath();
        ctx.moveTo(px + pw - 2, py + 2);
        ctx.lineTo(px + pw - leafIn, py + topBias);
        ctx.lineTo(px + pw - leafOut, py + ph - bottomBias);
        ctx.lineTo(px + pw - 2, py + ph - 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

    

        return;
    }

 

    // vertical planks
    ctx.fillStyle = "#3e2723";
    for (let i = 1; i < pw; i += tile * 0.32) {
        ctx.fillRect(px + i, py, 1, ph);
    }

    // iron bands
    ctx.fillStyle = "#1f1f1f";
    ctx.fillRect(px, py + 1, pw, 2);
    ctx.fillRect(px, py + ph - 3, pw, 2);

    // DRAW ROOF (Using the same dynamic capY)
    ctx.fillStyle = isNorth ? "#8d1f1f" : "#7a1818";
    ctx.fillRect(px, capY, pw, 4);

    // wear overlay
    if (wear > 0.25) {
        ctx.fillStyle = `rgba(120, 40, 20, ${0.12 + wear * 0.28})`;
        ctx.fillRect(px + tile * 0.15, py + tile * 0.15, pw - tile * 0.3, ph - tile * 0.3);
    }

    if (wear > 0.6) {
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + tile * 0.25, py + tile * 0.2);
        ctx.lineTo(px + tile * 0.7, py + tile * 0.5);
        ctx.lineTo(px + tile * 0.35, py + tile * 0.75);
        ctx.stroke();
    }
}
function buildCityWalls(grid, arch, ctx, factionName) {
    // CRITICAL FIX: Wipe the old ladders so the player doesn't trigger ghost ladders!
    cityLadders = [];
    const gateDrawn = { north: false, south: false };
    const margin = 45; 
    const wallThick = 12; 
    const startX = margin;
    const endX = CITY_COLS - margin;
    const startY = margin;
    const endY = (typeof CITY_LOGICAL_ROWS !== 'undefined' ? CITY_LOGICAL_ROWS : CITY_ROWS) - margin;
    const midX = Math.floor(CITY_COLS / 2);
    const gateRadius = 6; 

    // Tower configuration tweaks
    const towerInterval = 75; 
    const cornerBuffer = 25;  

    overheadCityGates = [
        { x: midX, y: startY, arch: arch, isOpen: false, gateHP: 1000, side: "north" },
        { x: midX, y: endY, arch: arch, isOpen: false, gateHP: 1000, side: "south" } //TOGGLE HP 0 TO 1000 FOR DEBUGGING 
    ];
	
 

    //1 let
    let towers = [];
    let baseColor = arch.walls[1] || arch.walls[0];

    // 2. THE HOLLOW WALL & ENCLOSED GATES
    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            let isEdge = (x >= startX && x < startX + wallThick) || (x <= endX && x > endX - wallThick) || 
                         (y >= startY && y < startY + wallThick) || (y <= endY && y > endY - wallThick);
            
            if (!isEdge) continue;

            let isGateZone = Math.abs(x - midX) <= gateRadius;
            let isVerticalGate = (y >= startY && y < startY + wallThick) || (y <= endY && y > endY - wallThick);
            
            if (isGateZone && isVerticalGate) {
                const gate = (y < startY + wallThick)
                    ? overheadCityGates.find(g => g.side === "north")
                    : overheadCityGates.find(g => g.side === "south");

                if (gate && !gateDrawn[gate.side]) {
                    drawCityGateBlock(ctx, grid, gate, arch, midX, gateRadius, startY, endY, wallThick);
                    gateDrawn[gate.side] = true;
                }
                continue;
            }

            // --- INACCESSIBLE PARAPETS & WALKABLE FLOORS ---
            else {
                // Calculate this tile's distance to the nearest outer city boundary
                let distFromLeft = x - startX;
                let distFromRight = endX - x;
                let distFromTop = y - startY;
                let distFromBottom = endY - y;
                
                let minDistToEdge = Math.min(distFromLeft, distFromRight, distFromTop, distFromBottom);

                // Creates perfect concentric rings based on distance from the edge
                // 0 to 1 tiles from edge = Outer Parapet
                // 2 to 3 tiles from edge = Walkable Floor
                // 4 to 5 tiles from edge = Inner Parapet
                let isOuterParapet = (minDistToEdge < 2);
                let isInnerParapet = (minDistToEdge >= wallThick - 2); 

                let px = x * CITY_TILE_SIZE;
                let py = y * CITY_TILE_SIZE;

                if (isOuterParapet || isInnerParapet) {
                    grid[x][y] = 6; // Set to impassable obstacle
                    ctx.fillStyle = baseColor;
                    ctx.fillRect(px, py, CITY_TILE_SIZE, CITY_TILE_SIZE);

                    // --- DIAGNOSTIC TINT: Dark Grey for Outer, Lighter Grey for Inner ---
                    if (isOuterParapet) ctx.fillStyle = "rgba(40, 40, 40, 0.45)";
                    ctx.fillRect(px, py, CITY_TILE_SIZE, CITY_TILE_SIZE);

                    if (isOuterParapet) {
                        ctx.fillStyle = "#1a1a1a"; 
                        if ((y === startY || y === endY) && x % 3 === 0) {
                            ctx.fillRect(px + CITY_TILE_SIZE/2 - 2, py + (y===startY?0:CITY_TILE_SIZE-6), 4, 6);
                        } else if ((x === startX || x === endX) && y % 3 === 0) {
                            ctx.fillRect(px + (x===startX?0:CITY_TILE_SIZE-6), py + CITY_TILE_SIZE/2 - 2, 6, 4);
                        }
                    }
                } else {
                    // This is the walkable floor ring
                    grid[x][y] = 1; // Unblocks the collision grid so units can path through!
 
                    // Changed from jade (#4a6b4a) to a greyish-white (#e0e0e0)
                    ctx.fillStyle = "#b8b5ad"; 
                    ctx.fillRect(px, py, CITY_TILE_SIZE, CITY_TILE_SIZE);
                    
                    // Update stone floor pattern to be subtle against the white
                    // Using a light grey stroke and a very faint overlay
                    ctx.strokeStyle = "rgba(0,0,0,0.1)"; 
                    ctx.strokeRect(px, py, CITY_TILE_SIZE, CITY_TILE_SIZE);
                    
                    ctx.fillStyle = "rgba(255,255,255,0.3)"; // Adds a slight highlight/texture
                    ctx.fillRect(px + 1, py + 1, CITY_TILE_SIZE - 2, CITY_TILE_SIZE - 2);
                }
            }

            // --- GATHER INNER-FACING TOWER LOCATIONS ---
            if (!isGateZone) {
                let distToStartX = Math.abs(x - startX);
                let distToEndX = Math.abs(x - endX);
                let distToStartY = Math.abs(y - startY);
                let distToEndY = Math.abs(y - endY);

                let isCornerArea = (distToStartX < cornerBuffer || distToEndX < cornerBuffer) &&
                                   (distToStartY < cornerBuffer || distToEndY < cornerBuffer);

                if (!isCornerArea) {
                    if (y === startY + wallThick - 1 && x % towerInterval === 0) towers.push({ x: x, y: y + 1, side: 'N' });
                    else if (y === endY - wallThick + 1 && x % towerInterval === 0) towers.push({ x: x, y: y - 1, side: 'S' });
                    else if (x === startX + wallThick - 1 && y % towerInterval === 0) towers.push({ x: x + 1, y: y, side: 'W' });
                    else if (x === endX - wallThick + 1 && y % towerInterval === 0) towers.push({ x: x - 1, y: y, side: 'E' });
                }
            }
        }
    }

 

    // 3. RENDER INNER TOWERS & BIG WALKABLE LADDER BRIDGES
    for (let t of towers) {
        let towerSize = 10;
        let overlap = 4; 
        let rx, ry;

        // Determine orientation
        if (t.side === 'N') {
            rx = t.x - Math.floor(towerSize / 2); ry = t.y - overlap; 
        } else if (t.side === 'S') {
            rx = t.x - Math.floor(towerSize / 2); ry = t.y - towerSize + overlap; 
        } else if (t.side === 'W') {
            rx = t.x - overlap; ry = t.y - Math.floor(towerSize / 2);
        } else if (t.side === 'E') {
            rx = t.x - towerSize + overlap; ry = t.y - Math.floor(towerSize / 2);
        }

        // Mark Entire Tower Collision on grid (Impossible to walk through)
        for (let ix = rx; ix < rx + towerSize; ix++) {
            for (let iy = ry; iy < ry + towerSize; iy++) {
                if (grid[ix] && grid[ix][iy] !== undefined) grid[ix][iy] = 7; 
            }
        }

        // Render Tower Base
        ctx.fillStyle = "rgba(0,0,0,0.6)"; 
        ctx.fillRect(rx * CITY_TILE_SIZE, ry * CITY_TILE_SIZE, towerSize * CITY_TILE_SIZE, towerSize * CITY_TILE_SIZE);
        ctx.fillStyle = arch.walls[0];
        ctx.fillRect((rx + 1) * CITY_TILE_SIZE, (ry + 1) * CITY_TILE_SIZE, (towerSize - 2) * CITY_TILE_SIZE, (towerSize - 2) * CITY_TILE_SIZE);

        // Draw the 3D 'X' Roof
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rx * CITY_TILE_SIZE, ry * CITY_TILE_SIZE);
        ctx.lineTo((rx + towerSize) * CITY_TILE_SIZE, (ry + towerSize) * CITY_TILE_SIZE);
        ctx.moveTo((rx + towerSize) * CITY_TILE_SIZE, ry * CITY_TILE_SIZE);
        ctx.lineTo(rx * CITY_TILE_SIZE, (ry + towerSize) * CITY_TILE_SIZE);
        ctx.stroke();

        // --- NEW: WIDER PHYSICAL LADDER BRIDGES ALONG THE INNER WALL ---
        let ladderGridX, ladderGridY, ladW, ladH;
        let ladderOffset = 12; // Place it next to the tower to give room
        
        // Ladders now span 5 tiles to bridge over the 2-tile inner parapet
        if (t.side === 'N') {
            ladderGridX = t.x + ladderOffset; 
            ladderGridY = startY + wallThick - 3; // Starts on walkable floor, spans down to ground
            ladW = 6; ladH = 5;
        } else if (t.side === 'S') {
            ladderGridX = t.x + ladderOffset; 
            ladderGridY = endY - wallThick - 1;   // Starts on ground, spans up to walkable floor
            ladW = 6; ladH = 5;
        } else if (t.side === 'W') {
            ladderGridX = startX + wallThick - 3; 
            ladderGridY = t.y + ladderOffset; 
            ladW = 5; ladH = 6;
        } else if (t.side === 'E') {
            ladderGridX = endX - wallThick - 1; 
            ladderGridY = t.y + ladderOffset; 
            ladW = 5; ladH = 6;
        }

        // FIX: Mark Ladder as Tile 9 AND push its exact center coordinates to cityLadders array
        for (let ix = ladderGridX; ix < ladderGridX + ladW; ix++) {
            for (let iy = ladderGridY; iy < ladderGridY + ladH; iy++) {
                if (grid[ix] && grid[ix][iy] !== undefined) grid[ix][iy] = 9; // 9 = Ladder Bridge
            }
        }
        
        cityLadders.push({
            x: (ladderGridX + ladW / 2) * CITY_TILE_SIZE,
            y: (ladderGridY + ladH / 2) * CITY_TILE_SIZE
        });
     
        // Render 2x Size Larger Ladder
        let px = ladderGridX * CITY_TILE_SIZE;
        let py = ladderGridY * CITY_TILE_SIZE;
        let pW = ladW * CITY_TILE_SIZE;
        let pH = ladH * CITY_TILE_SIZE;

        ctx.fillStyle = "rgba(0,0,0,0.3)"; // Subtle shadow beneath ladder
        ctx.fillRect(px, py, pW, pH);

        ctx.strokeStyle = "#5d4037"; // Wood Brown
        ctx.lineWidth = 3; // Thicker for visibility
        ctx.beginPath();
        
        if (t.side === 'N' || t.side === 'S') {
            // Vertical Ladder
            ctx.moveTo(px + 4, py); ctx.lineTo(px + 4, py + pH);
            ctx.moveTo(px + pW - 4, py); ctx.lineTo(px + pW - 4, py + pH);
            for (let i = 4; i < pH; i += 6) {
                ctx.moveTo(px + 4, py + i); ctx.lineTo(px + pW - 4, py + i);
            }
        } else {
            // Horizontal Ladder
            ctx.moveTo(px, py + 4); ctx.lineTo(px + pW, py + 4);
            ctx.moveTo(px, py + pH - 4); ctx.lineTo(px + pW, py + pH - 4);
            for (let i = 4; i < pW; i += 6) {
                ctx.moveTo(px + i, py + 4); ctx.lineTo(px + i, py + pH - 4);
            }
        }
        ctx.stroke();
    
}
	
   // 4. SPAWN TROOPS 
    if (factionName) {
        fortificationTroops[factionName] = [];
        const weaponPool = ["spearman", "sword_shield"];
        const wallWeaponPool = ["archer", "crossbow"];
        
        // Use +5 / -5 margin so we don't accidentally spawn them inside the parapet limits
        for (let x = startX + 5; x <= endX - 5; x++) {
            for (let y = startY + 5; y <= endY - 5; y++) {
                
                let tile = grid[x][y];
                // Massive spawn rate boost for the walls so they actively populate
                let spawnChance = (tile === 8) ? 0.02 : (tile === 0 ? 0.001 : 0);

                if (spawnChance > 0 && Math.random() < spawnChance) {
                    let px = x * CITY_TILE_SIZE;
                    let py = y * CITY_TILE_SIZE;
                    
                    let tooClose = fortificationTroops[factionName].some(troop => Math.hypot(troop.x - px, troop.y - py) < 60);

                    if (!tooClose) {
                        let chosenWeapon = (tile === 8) 
                            ? wallWeaponPool[Math.floor(Math.random() * wallWeaponPool.length)]
                            : weaponPool[Math.floor(Math.random() * weaponPool.length)];
                        
                        fortificationTroops[factionName].push({
                            x: px, y: py,
                            vx: (Math.random() - 0.5) * 0.3,
                            vy: (Math.random() - 0.5) * 0.3,
                            animOffset: Math.random() * 100,
                            weapon: chosenWeapon,
                            isCavalry: false, 
                            dir: Math.random() > 0.5 ? 1 : -1,
                            onWall: tile === 8, 
                            unitName: tile === 8 ? "Wall Defender" : "City Guard"
                        });
                    }
                }
            }
        }
    }
}



function handleEntityGateTeleport(entity, grid) {
return;
}

// Add these two guard variables at the very top of your fortification_system.js file
let lastFortificationTick = 0;
let lastFortifyRenderTime = 0; 

function fortification_system_renderDynamic(ctx, factionName, playerObj, allNPCs) {
    let troops = fortificationTroops[factionName];
    if (!troops) return;

    let now = Date.now();

    // --- 1. THE STACKING GUARD (Fixes "Bold/Stacked" look) ---
    if (now === lastFortifyRenderTime) return;
    lastFortifyRenderTime = now;

    // --- 2. THE SPEED GUARD (Fixes "5x Speed" bug) ---
    let shouldUpdateLogic = false;
    if (now - lastFortificationTick > 15) {
        shouldUpdateLogic = true;
        lastFortificationTick = now;
    }

    // 3. YELLOW GUI TEXT
    if (overheadCityGates && playerObj) {
        const margin = 45; 
        for (let g of overheadCityGates) {
            let gx = g.x * CITY_TILE_SIZE;
            let gy = g.y * CITY_TILE_SIZE;
            let dist = Math.hypot(playerObj.x - gx, playerObj.y - gy);
            if (dist < 120) {
                ctx.save();
                ctx.fillStyle = "#ffeb3b"; ctx.font = "bold 14px monospace";
                ctx.textAlign = "center"; ctx.shadowBlur = 5; ctx.shadowColor = "black";
                ctx.fillText("PRESS [P] TO EXIT", gx, gy + (g.y === margin ? -40 : 40) + Math.sin(now/200)*3);
                ctx.restore();
            }
        }
    }

    // 4. TROOP RENDERING & COLLISION
    let fColor = (typeof ARCHITECTURE !== 'undefined' && ARCHITECTURE[factionName]) ? ARCHITECTURE[factionName].roofs[0] : "#4a4a4a";

    for (let t of troops) {
        let dx = t.x - playerObj.x;
        let dy = t.y - playerObj.y;
        if (dx*dx + dy*dy > 1200*1200) continue;

// --- POSITION UPDATE (Only runs 60 times per second) ---
        if (shouldUpdateLogic) {
            
            // FIX: Auto-transition Troops between ground and wall using ladders
            let tx = Math.floor(t.x / CITY_TILE_SIZE);
            let ty = Math.floor(t.y / CITY_TILE_SIZE);
            if (typeof cityDimensions !== 'undefined' && cityDimensions[factionName]) {
                let currentTile = cityDimensions[factionName].grid[tx] ? cityDimensions[factionName].grid[tx][ty] : 0;
                if (currentTile === 9) t.onWall = true; // Stepped on ladder, climb up!
                else if (currentTile === 0 || currentTile === 1 || currentTile === 5) t.onWall = false; // Back to ground!
            }

            let nx = t.x + t.vx;
            let ny = t.y + t.vy;

            let hitEntity = false;
            if (playerObj && Math.hypot(playerObj.x - nx, playerObj.y - ny) < 12) hitEntity = true;
            if (!hitEntity && allNPCs) {
                for(let n of allNPCs) {
                    if (Math.abs(n.x - nx) > 20 || Math.abs(n.y - ny) > 20) continue;
                    if(n !== t && Math.hypot(n.x - nx, n.y - ny) < 12) { hitEntity = true; break; }
                }
            }

            // FIX: Pass 't.onWall' to the collision engine!
            if (typeof isCityCollision === 'function' && isCityCollision(nx, ny, factionName, t.onWall) || hitEntity) {
                let bounceSpeed = t.isCavalry ? 0.4 : 0.2; 
                t.vx = (Math.random() - 0.5) * bounceSpeed;
                t.vy = (Math.random() - 0.5) * bounceSpeed; 
                t.dir = t.vx > 0 ? 1 : -1;
            } else {
                t.x = nx; t.y = ny;
            }
        }

        // --- DRAWING PASS (Runs every frame to stop flickering) ---
        let frame = (now / 60) + t.animOffset;
        let weaponBob = Math.sin(frame * 0.5) * 2;
        let dir = t.dir;

        // --- MOUNT RENDERING ---
        let humanY = t.y;
        if (t.isCavalry) {
            humanY = t.y - 8; 
            if (typeof drawHorse === 'function') {
                drawHorse(ctx, t.x, t.y, dir, frame, fColor);
            } else {
                ctx.save();
                ctx.translate(t.x, t.y);
                let legSwing = Math.sin(frame * 2) * 4 * dir;
                ctx.fillStyle = "#4e342e"; 
                ctx.beginPath(); ctx.ellipse(0, 2, 14, 7, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(12 * dir, -4, 6, 4, Math.PI/4 * dir, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 2;
                ctx.beginPath(); 
                ctx.moveTo(-1 * dir, 2); ctx.lineTo((-1 * dir) + legSwing, 10);
                ctx.moveTo(6 * dir, 2); ctx.lineTo((8 * dir) + legSwing, 10); 
                ctx.stroke();
                ctx.restore();
            }
        }

        if (typeof drawHuman === 'function') drawHuman(ctx, t.x, humanY, true, frame, fColor);

        ctx.save();
        ctx.translate(t.x, humanY);
        
        // --- WEAPON RENDERING (All logic preserved) ---
        if (t.weapon === "spearman") {
            let isGlaive = t.unitName === "Glaiveman"; 
            ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(-6 * dir, 4); 
            ctx.lineTo((28 + weaponBob) * dir, -24 + weaponBob); ctx.stroke();
            ctx.fillStyle = "#bdbdbd"; 
            if (isGlaive) {
                ctx.beginPath(); ctx.moveTo((26 + weaponBob) * dir, -22 + weaponBob);
                ctx.quadraticCurveTo((32 + weaponBob) * dir, -30 + weaponBob, (28 + weaponBob) * dir, -32 + weaponBob);
                ctx.lineTo((25 + weaponBob) * dir, -24 + weaponBob); ctx.fill();
            } else {
                ctx.save();
                ctx.translate((28 + weaponBob) * dir, -24 + weaponBob);
                ctx.rotate(dir === 1 ? -Math.PI * 0.25 : -Math.PI * 0.75);
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, 2); ctx.lineTo(8, 0); ctx.lineTo(-3, -2);
                ctx.closePath(); ctx.fill(); ctx.restore();
            }
        }
        else if (t.weapon === "cavalry_lancer" || t.isCavalry) {
            let isAttacking = Math.sin(frame * 1.5) > 0.6; 
            let attackThrust = isAttacking ? 10 * dir : 0;
            ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-4 * dir, -4); 
            ctx.lineTo((26 * dir) + attackThrust, -4 + (Math.abs(attackThrust)/3)); ctx.stroke();
            ctx.fillStyle = "#bdbdbd"; 
            ctx.fillRect((26 * dir) + attackThrust, -5 + (Math.abs(attackThrust)/3), 6 * dir, 2);
        }
        else if (t.weapon === "camel_gunner") {
            let isAttacking = Math.sin(frame * 1.5) > 0.8;
            ctx.strokeStyle = "#212121"; ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo((12 + weaponBob) * dir, -5); ctx.stroke();
            if (isAttacking) { 
                ctx.fillStyle = "#ff9800"; ctx.beginPath(); ctx.arc((14 + weaponBob) * dir, -5, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(158, 158, 158, 0.6)"; ctx.beginPath(); ctx.arc((18 + weaponBob) * dir, -8, 6, 0, Math.PI * 2); ctx.fill();
            }
        }
        else if (t.weapon === "Poison Crossbowman") {
            ctx.fillStyle = "#5d4037"; ctx.fillRect(0, -10, 12 * dir, 3); 
            ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(10 * dir, -8.5, 6.5, -Math.PI/2, Math.PI/2, dir < 0); ctx.stroke();
            ctx.strokeStyle = "rgba(200, 255, 200, 0.4)"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(10 * dir, -15); ctx.lineTo(10 * dir, -2); ctx.stroke();
        }
        else if (t.weapon === "crossbow" || t.weapon === "archer") { 
            ctx.fillStyle = "#5d4037"; ctx.fillRect(0, -10, 12 * dir, 3); 
            ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(10 * dir, -15); ctx.quadraticCurveTo(18 * dir, -11, 14 * dir, -8.5); 
            ctx.quadraticCurveTo(18 * dir, -6, 10 * dir, -2); ctx.stroke();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(10 * dir, -15); ctx.lineTo(10 * dir, -2); ctx.stroke();
        }
        
        ctx.restore();
    }
}

function spawnFortificationTroops(factionName, grid, arch) {
    if (!factionName || !grid) return;

    // Recalculate margins to match the wall boundaries
    const margin = 45; 
    const startX = margin;
    const endX = CITY_COLS - margin;
    const startY = margin;
    const endY = (typeof CITY_LOGICAL_ROWS !== 'undefined' ? CITY_LOGICAL_ROWS : CITY_ROWS) - margin;

    fortificationTroops[factionName] = [];
    const weaponPool = ["spearman", "sword_shield"];
    const wallWeaponPool = ["archer", "crossbow"];

    for (let x = startX + 5; x <= endX - 5; x++) {
        for (let y = startY + 5; y <= endY - 5; y++) {
            let tile = grid[x][y];
            
            // 8 = Walkable Wall floor, 0 = Ground
let spawnChance = (tile === 8) ? 0.002 : (tile === 0 ? 0.0002 : 0);

            if (spawnChance > 0 && Math.random() < spawnChance) {
                let px = x * CITY_TILE_SIZE;
                let py = y * CITY_TILE_SIZE;
                
                let tooClose = fortificationTroops[factionName].some(t => Math.hypot(t.x - px, t.y - py) < 60);

                if (!tooClose) {
                    let chosenWeapon = (tile === 8) 
                        ? wallWeaponPool[Math.floor(Math.random() * wallWeaponPool.length)]
                        : weaponPool[Math.floor(Math.random() * weaponPool.length)];
                    
                    fortificationTroops[factionName].push({
                        x: px, y: py,
                        vx: (Math.random() - 0.5) * 0.3,
                        vy: (Math.random() - 0.5) * 0.3,
                        animOffset: Math.random() * 100,
                        weapon: chosenWeapon,
                        isCavalry: false, 
                        dir: Math.random() > 0.5 ? 1 : -1,
                        onWall: tile === 8, 
                        unitName: tile === 8 ? "Wall Defender" : "City Guard"
                    });
                }
			 
            }
        }
    }
}

function updateCityGates(grid) {
    if (!overheadCityGates || !grid) return;

    const margin = 45;
    const wallThick = 12;
    const midX = Math.floor(CITY_COLS / 2);
    const gateRadius = 6;

    const startY = margin;
    const endY = (typeof CITY_LOGICAL_ROWS !== 'undefined' ? CITY_LOGICAL_ROWS : CITY_ROWS) - margin;

    for (let gate of overheadCityGates) {

        // --- AUTO STATE LOGIC ---
        if (gate.gateHP <= 0) {
            gate.isOpen = true; // destroyed = open
        }

        let yStart = (gate.side === "north") ? startY : endY - wallThick + 1;
        let yEnd   = (gate.side === "north") ? startY + wallThick - 1 : endY;

        for (let x = midX - gateRadius; x <= midX + gateRadius; x++) {
            for (let y = yStart; y <= yEnd; y++) {

                let isEdgePillar = Math.abs(x - midX) === gateRadius;

                if (isEdgePillar) {
                    grid[x][y] = 6; // always solid pillar
                    continue;
                }

                if (gate.isOpen) {
                    grid[x][y] = 1; // passable
                } else {
                    grid[x][y] = (gate.gateHP <= 0) ? 1 : 6;
                }
            }
        }
    }
}