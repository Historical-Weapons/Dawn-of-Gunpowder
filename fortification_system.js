// ============================================================================
// REVISED CITY WALL & DEFENSE SYSTEM (RESTORED RENDERING & FLIPPED SPEARS)
// ============================================================================
let overheadCityGates = []; 
let fortificationTroops = {}; 
 
function buildCityWalls(grid, arch, ctx, factionName) {
    const margin = 45; 
    const wallThick = 3; 
    const startX = margin;
    const endX = CITY_COLS - margin;
    const startY = margin;
    const endY = CITY_ROWS - margin;
    const midX = Math.floor(CITY_COLS / 2);
    const gateRadius = 4; 

    overheadCityGates = [];
    overheadCityGates.push({ x: midX, y: startY, arch: arch });
    overheadCityGates.push({ x: midX, y: endY, arch: arch });
	
    // 1. Force Grand Roads
    ctx.fillStyle = arch.road;
    for (let y = 0; y < CITY_ROWS; y++) {
        for (let x = midX - gateRadius; x <= midX + gateRadius; x++) {
            if (y <= startY + 5 || y >= endY - 5) {
                grid[x][y] = 1; 
                ctx.fillRect(x * CITY_TILE_SIZE, y * CITY_TILE_SIZE, CITY_TILE_SIZE, CITY_TILE_SIZE);
            }
        }
    }

    // 2. Define Thick Wall Grid & Collect Towers (SURGICAL UPGRADE)
    let towers = [];
    let baseColor = arch.walls[1] || arch.walls[0];
    ctx.fillStyle = baseColor;

    const towerInterval = 25; // Add a tower every 25 tiles

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            let isEdge = (x >= startX && x < startX + wallThick) || 
                         (x <= endX && x > endX - wallThick) || 
                         (y >= startY && y < startY + wallThick) || 
                         (y <= endY && y > endY - wallThick);
            
            if (!isEdge) continue;

            let isGate = ((y >= startY && y < startY + wallThick) || 
                          (y <= endY && y > endY - wallThick)) && 
                          Math.abs(x - midX) <= gateRadius;
            
            if (isGate) continue; 

            grid[x][y] = 6; 
            ctx.fillRect(x * CITY_TILE_SIZE, y * CITY_TILE_SIZE, CITY_TILE_SIZE, CITY_TILE_SIZE);

            // --- EPIC TOWER INJECTION ---
            // Check for corners OR interval points along the X and Y axes
            let isCorner = (x === startX || x === endX - wallThick + 1) && (y === startY || y === endY - wallThick + 1);
            let isIntervalX = (y === startY || y === endY - wallThick + 1) && (x % towerInterval === 0);
            let isIntervalY = (x === startX || x === endX - wallThick + 1) && (y % towerInterval === 0);

            if (isCorner || isIntervalX || isIntervalY) {
                towers.push({x: x, y: y});
            }
        }
    }

    // DRAWING: Render All Towers with a "Shadow" Offset for Depth
    for (let t of towers) {
        // Draw Shadow/Base
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect((t.x - 2) * CITY_TILE_SIZE, (t.y - 2) * CITY_TILE_SIZE, (wallThick + 4) * CITY_TILE_SIZE, (wallThick + 4) * CITY_TILE_SIZE);
        
        // Draw Tower Top
        ctx.fillStyle = arch.walls[0]; 
        ctx.fillRect((t.x - 1) * CITY_TILE_SIZE, (t.y - 1) * CITY_TILE_SIZE, (wallThick + 2) * CITY_TILE_SIZE, (wallThick + 2) * CITY_TILE_SIZE);
        
           }

    // 3. COLLISION FIX: Block absolute map exits at gates
    for (let g of overheadCityGates) {
        for (let i = -gateRadius; i <= gateRadius; i++) {
            if (g.y === startY) grid[g.x + i][g.y] = 6;
            if (g.y === endY) grid[g.x + i][g.y + (wallThick-1)] = 6;
        }
    }

    // 4. SPAWN TROOPS (5x Increase: 0.005 density)
    if (factionName) {
        fortificationTroops[factionName] = [];
        // Gunpowder completely removed. Added cavalry and poison crossbows.
const weaponPool = [
    "spearman", 
    "sword_shield", 
    "archer", 
    "crossbow", 
    "shortsword", 
    "Poison Crossbowman"
];
        for (let x = startX + 5; x <= endX - 5; x++) {
            for (let y = startY + 5; y <= endY - 5; y++) {
                // This creates a "Central Zone" that stays at least 10 tiles away from the walls 
// and fills everything all the way to the dead center.
let nearWall = (x > startX + 10) && (x < endX - 10) && (y > startY + 10) && (y < endY - 10);
                let px = x * CITY_TILE_SIZE;
let py = y * CITY_TILE_SIZE;
               // INCREASED: 80px radius ensures they don't spawn on top of each other
                let tooClose = fortificationTroops[factionName].some(t =>
                   Math.hypot(t.x - px, t.y - py) < 80 
                );

                if (!tooClose && nearWall && grid[x][y] === 0 && Math.random() < 0.0009) {
                    let chosenWeapon = weaponPool[Math.floor(Math.random() * weaponPool.length)];
                    let isCavalry = chosenWeapon.startsWith("cavalry");
                    
                    // Base their initial patrol speed on their unit type
let startSpeed = isCavalry ? 0.6 : 0.3; // Doubled spawn speed
                    
                    fortificationTroops[factionName].push({
                        x: px, y: py,
                        vx: (Math.random() - 0.5) * startSpeed,
                        vy: (Math.random() - 0.5) * startSpeed,
                        animOffset: Math.random() * 100,
                        weapon: chosenWeapon,
                        isCavalry: isCavalry,
                        dir: Math.random() > 0.5 ? 1 : -1,
                        unitName: isCavalry ? "Mounted Patrol" : "City Guard"
                    });
                }
            }
        }
    }
}
// Add these two guard variables at the very top of your fortification_system.js file
let lastFortificationTick = 0;
let lastFortifyRenderTime = 0; 

function fortification_system_renderDynamic(ctx, factionName, playerObj, allNPCs) {
    let troops = fortificationTroops[factionName];
    if (!troops) return;

    let now = Date.now();

    // --- 1. THE STACKING GUARD (Fixes "Bold/Stacked" look) ---
    // If the function is called multiple times in the SAME frame (same millisecond), 
    // we exit early so it doesn't draw 5 times on top of itself.
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

            if (typeof isCityCollision === 'function' && isCityCollision(nx, ny, factionName) || hitEntity) {
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