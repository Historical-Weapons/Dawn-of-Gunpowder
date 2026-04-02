// ============================================================================
// EMPIRE OF THE 13TH CENTURY - FULL CITY SIEGE ENGINE
// ============================================================================

let inSiegeBattle = false;
let currentSiegeCity = null;

function enterSiegeBattlefield(enemyNPC, playerObj, cityObj) {
    console.log(`INITIALIZING SIEGE BATTLE: ${cityObj.name}`);
    
    // 1. STATE HIJACK
    inBattleMode = true;
    inSiegeBattle = true;
    currentSiegeCity = cityObj;


    BATTLE_WORLD_WIDTH = CITY_WORLD_WIDTH;  
    BATTLE_WORLD_HEIGHT = CITY_WORLD_HEIGHT; 
    BATTLE_COLS = CITY_COLS;
    BATTLE_ROWS = CITY_ROWS;
// 3. COPY CITY ENVIRONMENT TO BATTLE ENVIRONMENT
    // --- SURGERY START: Pull the EXACT city you see in 'Visit Settlement' ---
    let faction = cityObj.originalFaction || cityObj.faction;
    
    // CRITICAL: Guarantee the city canvas, grid, and gates are fully generated in memory BEFORE copying
    if (typeof generateCity === 'function') {
        generateCity(faction);
		
		if (typeof city_system_troop_storage !== 'undefined') {
        city_system_troop_storage[faction] = []; 
    }
	
    }
    
    // Deep copy the exact grid and canvas used by the overworld logic
    battleEnvironment.grid = JSON.parse(JSON.stringify(cityDimensions[faction].grid));
    battleEnvironment.bgCanvas = cityDimensions[faction].bgCanvas;
    battleEnvironment.fgCanvas = null; // Clear any leftover forest canopies from field battles
   // battleEnvironment.groundColor = (typeof ARCHITECTURE !== 'undefined' && ARCHITECTURE[faction]) ? 
   
   //ARCHITECTURE[faction].ground : "#767950";
   
   battleEnvironment.groundColor = "#000000";
    battleEnvironment.visualPadding = 0; // City maps don't need the abyss padding
    // --- SURGERY END ---
	
	
    currentBattleData = {
        enemyRef: enemyNPC, // This is the temporary Garrison Force object
        playerFaction: playerObj.faction || "Hong Dynasty",
        enemyFaction: faction,
        initialCounts: { player: 0, enemy: 0 },
        playerColor: (typeof FACTIONS !== 'undefined' && FACTIONS[playerObj.faction]) ? FACTIONS[playerObj.faction].color : "#ffffff",
        enemyColor: (typeof FACTIONS !== 'undefined' && FACTIONS[faction]) ? FACTIONS[faction].color : "#000000"
    };

    // 4. SABOTAGE THE GATES (Force Open & Destroy)
    if (typeof overheadCityGates !== 'undefined') {
        overheadCityGates.forEach(gate => {
            gate.gateHP = 0;
            gate.isOpen = true;
        });
        // This updates the grid so tile 6 (Wall) becomes tile 1 (Road) at the gate
        updateCityGates(battleEnvironment.grid); 
    }

    // 5. DEPLOY ARMIES
    let playerTroops = playerObj.troops || 0;
    
    // Deploy Attackers (Player) in the bottom 800px Siege Camp
    deploySiegeAttackers(currentBattleData.playerFaction, playerTroops, "player");
    
    // Deploy Defenders (AI) inside the walls and on the parapets
    deploySiegeDefenders(faction, enemyNPC.count, "enemy", enemyNPC.roster);

// Add this line around step 5 of enterSiegeBattlefield:
initSiegeEquipment();

    // 6. CAMERA & AUDIO
    playerObj.x = BATTLE_WORLD_WIDTH / 2;
    playerObj.y = BATTLE_WORLD_HEIGHT - 200; // Start camera at the siege camp

    if (typeof AudioManager !== 'undefined') {
        AudioManager.init();
        AudioManager.playMP3('music/battlemusic.mp3', false);
        AudioManager.playSound("charge"); 
    }

    if (typeof triggerEpicZoom === 'function') {
        triggerEpicZoom(0.1, 1.3, 3500);
    }
}

function deploySiegeAttackers(faction, totalTroops, side) {
    // Reuses the standard deployment but locks Y to the bottom deployment zone
    let originalHeight = BATTLE_WORLD_HEIGHT;
    
    // Fake the height temporarily so deployArmy puts them at the bottom of the 4000px map
    // deployArmy puts player at BATTLE_WORLD_HEIGHT - 300. So 4000 - 300 = 3700. Perfect.
    deployArmy(faction, totalTroops, side); 
}

function deploySiegeDefenders(faction, totalTroops, side, npcRoster) {
    currentBattleData.initialCounts[side] += totalTroops;
    
    let color = currentBattleData.enemyColor;
    let grid = battleEnvironment.grid;
    
    let wallTiles = [];
    let groundTiles = [];

    // --- COORDINATE CALIBRATION ---
    let margin = 45; 
    let wallThick = 12; 
    let southWallTileY = BATTLE_ROWS - margin; 
    
    // Convert wall boundary to pixel Y for the Hard Clamp
    const wallPixelBoundaryY = (southWallTileY - wallThick - 5) * BATTLE_TILE_SIZE;

    // --- IMPROVED TILE SCAN ---
    for (let x = margin + 5; x < BATTLE_COLS - margin - 5; x++) {
        for (let y = margin + 5; y <= southWallTileY; y++) {
            if (!grid[x]) continue;

            // 1. Wall Tiles (Elevated Positions)
            if (y > southWallTileY - wallThick && y <= southWallTileY) {
                // Include Road (1) or standard Wall (6)
                if (grid[x][y] === 1 || grid[x][y] === 6) {
                    wallTiles.push({x, y}); 
                }
            }
            
            // 2. City Interior Ground Tiles
            // Expanded to include 0 (empty) and 1 (road) and 4 (decoration)
            if (y < southWallTileY - wallThick) { 
                if (grid[x][y] === 0 || grid[x][y] === 1 || grid[x][y] === 4) {
                    groundTiles.push({x, y}); 
                }
            }
        }
    }

    // Shuffle for organic placement
    wallTiles.sort(() => Math.random() - 0.5);
    groundTiles.sort(() => Math.random() - 0.5);

    let visualScale = totalTroops > 300 ? 5 : 1; 
    let unitsToSpawn = Math.round(totalTroops / visualScale); 

    for (let i = 0; i < unitsToSpawn; i++) {
        let unitType = npcRoster[i % npcRoster.length].type;
        let baseTemplate = UnitRoster.allUnits[unitType] || UnitRoster.allUnits["Militia"];
        
        let unitStats = Object.assign(new Troop(baseTemplate.name, baseTemplate.role, baseTemplate.isLarge, faction), baseTemplate);
        unitStats.morale = 25; 
        unitStats.maxMorale = 25;
        
        let spawnSpot = null;
        let isElevated = false;

        // SELECTION LOGIC
        if ((unitStats.isRanged) && wallTiles.length > 0) {
            spawnSpot = wallTiles.pop();
            isElevated = true;
        } else if (groundTiles.length > 0) {
            spawnSpot = groundTiles.pop();
        } else {
            // --- SURGICAL FALLBACK: SCATTERED DEEP CITY SPAWN ---
            // If tiles run out or scan fails, spawn in a WIDE box at the top of the map
            // This prevents the "Ring" near the engines.
            let spreadX = margin + 20 + (Math.random() * (BATTLE_COLS - (margin * 2) - 40)); 
            let spreadY = margin + 10 + (Math.random() * 30); // Forced to the top 1/5th of city
            spawnSpot = { x: spreadX, y: spreadY }; 
        }

        // --- POSITIONING & JITTER ---
        let finalX = (spawnSpot.x * BATTLE_TILE_SIZE);
        let finalY = (spawnSpot.y * BATTLE_TILE_SIZE);

        // Add enough jitter so they don't overlap and trigger the "Ring" explosion
        finalX += (Math.random() - 0.5) * 20;
        finalY += (Math.random() - 0.5) * 20;

        // --- THE CRITICAL SURGERY: HARD PIXEL CLAMP ---
        // If it's a ground unit, force them North of the interior wall line.
        if (!isElevated && finalY > wallPixelBoundaryY) {
            finalY = wallPixelBoundaryY - (Math.random() * 50); 
        }

        if (isElevated) {
            unitStats.range = Math.floor((unitStats.range || 100) * 1.5); 
            unitStats.meleeDefense += 10; 
        }

        // Facing South towards the wall
        let initialTarget = { x: finalX, y: finalY + 50, isDummy: true }; 

        battleEnvironment.units.push({
            id: unitIdCounter++,
            side: side,
            faction: faction,
            color: color,
            unitType: unitType, 
            stats: unitStats, 
            hp: unitStats.health,
            x: finalX,
            y: finalY,
            target: initialTarget,
            state: "idle", // Start idle so they don't immediately vibrate/clump
            animOffset: Math.random() * 100,
            cooldown: 0,
            hasOrders: false,
            onWall: isElevated 
        });
    }
    console.log(`Siege Deployment: ${wallTiles.length} wall slots left, ${groundTiles.length} ground slots left.`);
}

// --- THE FUNNEL OVERRIDE ---
// This is called inside battlefield_system.js to steer attackers through the gate
// --- THE REVISED FUNNEL OVERRIDE ---
// Handles both Gates and Deployed Ladders
function getSiegePathfindingVector(unit, target, originalDx, originalDy, originalDist) {
    // 1. HARD SAFETY: If not a siege or unit is already on the wall, do nothing.
    if (!inSiegeBattle || unit.side !== "player" || unit.onWall) {
        return { dx: originalDx, dy: originalDy, dist: originalDist };
    }

    const wallBoundaryY = CITY_LOGICAL_HEIGHT - 40; 

    // 2. FUNNEL LOGIC: If attacker is outside and target is inside
    if (unit.y > wallBoundaryY && target.y < wallBoundaryY) {
        
        // Priority A: Check for the South Gate
        let southGate = overheadCityGates.find(g => g.side === "south");
        
        // Priority B: Check for deployed ladders
        let activeLadders = siegeEquipment.ladders.filter(l => l.isDeployed && l.hp > 0);

        let bestEntryPoint = null;

        if (southGate && southGate.isOpen) {
            // Gate is open, head there
            bestEntryPoint = { x: southGate.x * BATTLE_TILE_SIZE, y: southGate.y * BATTLE_TILE_SIZE + 20 };
        } else if (activeLadders.length > 0) {
            // Gate is shut! Find the closest deployed ladder
            let closestLadder = activeLadders.reduce((prev, curr) => {
                return Math.hypot(curr.x - unit.x, curr.y - unit.y) < Math.hypot(prev.x - unit.x, prev.y - unit.y) ? curr : prev;
            });
            bestEntryPoint = { x: closestLadder.x, y: closestLadder.y + 10 };
        }

        if (bestEntryPoint) {
            let distToEntry = Math.hypot(bestEntryPoint.x - unit.x, bestEntryPoint.y - unit.y);
            // If not yet at the entry, force move toward it
            if (distToEntry > 30) {
                return {
                    dx: bestEntryPoint.x - unit.x,
                    dy: bestEntryPoint.y - unit.y,
                    dist: distToEntry
                };
            }
        }
    }
    
    return { dx: originalDx, dy: originalDy, dist: originalDist };
}
// ============================================================================
// SIEGE EQUIPMENT & ASSAULT LOGIC (APPEND TO SIEGEBATTLE.JS)
// ============================================================================

let siegeEquipment = {
    rams: [],
    trebuchets: [],
    mantlets: [],
    ladders: []
};

// --- 1. INITIALIZE EQUIPMENT ---
// Call this immediately after deploySiegeAttackers() inside enterSiegeBattlefield()
function initSiegeEquipment() {
    siegeEquipment = { rams: [], trebuchets: [], mantlets: [], ladders: [] };
    
    // 1. REPAIR THE GATE FOR THE RAM
    let southGate = overheadCityGates.find(g => g.side === "south");
    if (southGate) {
        southGate.gateHP = 1500; // Give the gate massive HP for the ram to break
        southGate.isOpen = false;
        updateCityGates(battleEnvironment.grid); // Reset grid collision to solid (6)
    }

    let campY = CITY_WORLD_HEIGHT - 350;
    let midX = CITY_WORLD_WIDTH / 2;

    // 2. SPAWN BATTERING RAM (Aligned with the South Gate)
    if (southGate) {
        siegeEquipment.rams.push({
            x: southGate.x * BATTLE_TILE_SIZE,
            y: campY - 50,
            targetGate: southGate,
            hp: 800,
            speed: 0.3,
            isBreaking: false,
			
			    // NEW: forward shield / armored nose
    shieldHP: 220,
    shieldMaxHP: 220,
    shieldW: 54,
    shieldH: 28,
    shieldOffsetX: 0,
    shieldOffsetY: -52
        });
    }

    // 3. SPAWN TRACTION TREBUCHETS (Artillery at the very back)
    for (let i = -1; i <= 1; i += 2) {
        siegeEquipment.trebuchets.push({
            x: midX + (i * 300),
            y: campY + 150,
            hp: 300,
            cooldown: Math.random() * 300,
            fireRate: 600 // Fires a massive boulder every 10 seconds
        });
    }

    // 4. SPAWN LARGE SHIELDS (Mantlets) - A protective wall for the infantry
    for (let i = -5; i <= 5; i++) {
        if (i === 0) continue; // Leave a gap in the center for the ram
        siegeEquipment.mantlets.push({
            x: midX + (i * 60),
            y: campY - 120,
            hp: 1000
        });
    }

    // 5. SPAWN ASSAULT LADDERS (Distributed among the front lines)
    for (let i = -3; i <= 3; i += 2) {
        siegeEquipment.ladders.push({
            x: midX + (i * 120),
            y: campY - 80,
            carriedBy: null, // Will attach to a nearby unit
            isDeployed: false,
            hp: 150
        });
    }
}

// Add this global variable outside the function to track time
let siegeAITick = 0;

// Call this inside updateBattleUnits() every frame
function processSiegeEngines() {
    if (!inSiegeBattle) return;
    
    siegeAITick++; // Advance the timer every frame

    let units = battleEnvironment.units;
    let playerUnits = units.filter(u => u.side === "player" && u.hp > 0);
    
    // Separated enemy lists for clear targeting
    let allAliveEnemies = units.filter(u => u.side === "enemy" && u.hp > 0);
    let wallEnemies = allAliveEnemies.filter(u => u.onWall);

    // --- BATTLEFIELD AWARENESS & ANCHORS ---
    // The South Gate acts as the focal point for both y-coordinates and x-coordinates
    let southGate = typeof overheadCityGates !== 'undefined' ? overheadCityGates.find(g => g.side === "south") : null;
    
    let gateX = southGate ? southGate.x * BATTLE_TILE_SIZE : BATTLE_WORLD_WIDTH / 2;
    let gateY = southGate ? southGate.y * BATTLE_TILE_SIZE : BATTLE_WORLD_HEIGHT - 400;
    
    let wallY = gateY; // The wall line is horizontally aligned with the gate
    let plazaY = gateY - 500; // Deep inside the city for the last stand
    
    // --- BREACH CONDITIONS ---
    let isGateBreached = southGate && (southGate.isOpen || southGate.gateHP <= 0);
    let activeLadders = siegeEquipment.ladders.filter(l => l.isDeployed && l.hp > 0);
    let isWallBreached = activeLadders.length > 0;
    
    // If either the gate falls or ladders are up, the assault phase begins
    let generalBreachAchieved = isGateBreached || isWallBreached;

// SURGICAL FIX: Hard NPC Collision Clamp (Handles Side Walls + Smart Gate/Ladder Logic)
    let wallPixelY = gateY; 
    let westWallX = 45 * BATTLE_TILE_SIZE; // Standard city margin
    let eastWallX = (BATTLE_COLS - 45) * BATTLE_TILE_SIZE;
    let gateHalfWidth = 24; // Approx 6 tiles wide gate

    battleEnvironment.units.forEach(u => {
        if (!u.onWall && u.hp > 0) {
            
            // 1. SOUTH WALL & GATE COLLISION (Y-Axis)
            if (u.side === "player") {
                // If attackers are South of the wall and trying to push North
                if (u.y < wallPixelY + 20) {
                    let atOpenGate = (isGateBreached && Math.abs(u.x - gateX) < gateHalfWidth);
                    let atLadder = activeLadders.some(l => Math.abs(u.x - l.x) < 24);
                    
                    // Only allow passage if at the gate or a ladder
                    if (!atOpenGate && !atLadder) {
                        u.y = wallPixelY + 20; // Hard bounce back
                    }
                }
            } else if (u.side === "enemy") {
                // defenders trying to flee South out of the city
                if (u.y > wallPixelY - 20) {
                    let atOpenGate = (isGateBreached && Math.abs(u.x - gateX) < gateHalfWidth);
                    if (!atOpenGate) {
                        u.y = wallPixelY - 20; // Hard bounce back inside
                    }
                }
            }

            // 2. SIDE WALL COLLISION (X-Axis)
            // Only apply if the unit is latitudinally "inside" the city walls
            if (u.y < wallPixelY) { 
                if (u.x < westWallX) {
                    u.x = westWallX; // Bounce off West Wall
                }
                if (u.x > eastWallX) {
                    u.x = eastWallX; // Bounce off East Wall
                }
            }
        }
    });
	
	
	
// ========================================================================
    // 1. SIEGE EQUIPMENT LOGIC
    // ========================================================================

    // A. BATTERING RAM LOGIC
    siegeEquipment.rams.forEach(ram => {
        if (ram.hp <= 0 || !ram.targetGate) return;

        // Initialize persistent carrier array so the main AI loop doesn't steal them
        if (!ram.carriedBy) ram.carriedBy = [];
        ram.carriedBy = ram.carriedBy.filter(u => u.hp > 0); // Clean out casualties

        // Auto-assign pushers if we need more (max 6) and gate is not breached
        if (!ram.targetGate.isOpen && ram.carriedBy.length < 6) {
            let potential = playerUnits.find(u => {
                const text = String(u.stats?.role || u.unitType || "").toLowerCase();
                const isMountedOrLarge = u.stats?.isLarge || text.match(/(cav|horse|mount|camel|eleph)/);
                return (!isMountedOrLarge && u.hp > 0 && Math.hypot(u.x - ram.x, u.y - ram.y) < 80 && !ram.carriedBy.includes(u));
            });
            if (potential) ram.carriedBy.push(potential);
        }

        let exactGateY = ram.targetGate.y * BATTLE_TILE_SIZE;

        if (!ram.targetGate.isOpen && ram.targetGate.gateHP > 0) {
            // SURGICAL FIX 1: Drive to EXACT Y coordinate of the gate (No 60px offset)
            if (ram.y > exactGateY) {
                ram.y -= ram.speed * Math.min(ram.carriedBy.length * 0.2, 1);
                ram.isBreaking = false;
                
                // Command pushers to walk directly with the ram
                ram.carriedBy.forEach(p => {
                    p.target = { x: ram.x, y: ram.y + 20, isDummy: true };
                    p.state = "moving";
                    p.hasOrders = true;
                });
            } else {
                // SURGICAL FIX 2: Reached exact position, STICK to gate
                ram.y = exactGateY;
                ram.isBreaking = true;
                
                // Lock their state to 'attacking' so the line-formation AI ignores them
                ram.carriedBy.forEach(p => {
                    p.target = { x: ram.x, y: ram.y + 20, isDummy: true };
                    p.state = "attacking"; 
                    p.hasOrders = true;
                });

                if (Math.random() > 0.95 && ram.carriedBy.length > 0) { 
                    ram.targetGate.gateHP -= 550 + (ram.carriedBy.length * 2);
                    if (typeof AudioManager !== 'undefined') AudioManager.playSound('hit'); 
                    
                    if (ram.targetGate.gateHP <= 0) {
                        ram.targetGate.isOpen = true;
                        updateCityGates(battleEnvironment.grid);
                        console.log("THE GATES HAVE BEEN BREACHED!");
                    }
                }
            }
        } else {
            // SURGICAL FIX 3: Gate is broken! Release the pushers to join the charge.
            ram.isBreaking = false;
            ram.carriedBy.forEach(p => {
                p.state = "idle";
                p.hasOrders = false;
            });
            ram.carriedBy = [];
        }
    });

    // A1. RAM SHIELD INTERCEPTION
    for (let i = battleEnvironment.projectiles.length - 1; i >= 0; i--) {
        let p = battleEnvironment.projectiles[i];
        if (p.stuck) continue; 

        if (p.side === "enemy" && p.vy > 0) {
            for (let ram of siegeEquipment.rams) {
                if (ram.hp <= 0 || ram.shieldHP <= 0) continue;

                const shieldX = ram.x + (ram.shieldOffsetX || 0);
                const shieldY = ram.y + (ram.shieldOffsetY || 0);

                if (Math.abs(p.x - shieldX) < (ram.shieldW || 54) / 2 &&
                    Math.abs(p.y - shieldY) < (ram.shieldH || 28) / 2) {

                    ram.shieldHP -= p.attackerStats?.missileBaseDamage || 10;
// 🔴 SURGICAL FIX: Safely delete the blocked projectile instead of calling a missing function
                    battleEnvironment.projectiles.splice(i, 1);

                    if (ram.shieldHP <= 0) ram.shieldHP = 0;
                    break;
                }
            }
        }
    }

    // B. LADDER ASSAULT LOGIC
    siegeEquipment.ladders.forEach(ladder => {
        if (ladder.hp <= 0 || ladder.isDeployed) return;

        // Velocity tracking to detect if the unit is stuck against the wall
        if (ladder.lastY === undefined) ladder.lastY = ladder.y;
        if (ladder.stuckTicks === undefined) ladder.stuckTicks = 0;

        // Auto-assign carrier if empty (ignoring ram pushers)
        if (!ladder.carriedBy || ladder.carriedBy.hp <= 0) {
            ladder.carriedBy = playerUnits.find(u => 
                Math.hypot(u.x - ladder.x, u.y - ladder.y) < 40 && 
                !u.isCommander && !u.stats?.isLarge && 
                !String(u.stats?.role || "").toLowerCase().includes("cav") &&
                !siegeEquipment.rams.some(r => r.carriedBy && r.carriedBy.includes(u)) 
            );
        }

        if (ladder.carriedBy) {
            ladder.x = ladder.carriedBy.x;
            ladder.y = ladder.carriedBy.y;

            // Target the absolute wall limit
            let targetPixelY = gateY + 20; 
            
            ladder.carriedBy.target = { x: ladder.x, y: targetPixelY, isDummy: true };
            ladder.carriedBy.state = "moving";
            ladder.carriedBy.hasOrders = true;

            // Check if stuck (Y position isn't changing because of collision bounds)
            if (Math.abs(ladder.lastY - ladder.y) < 0.5) {
                ladder.stuckTicks++;
            } else {
                ladder.stuckTicks = 0;
            }
            ladder.lastY = ladder.y;

            // Deploy if firmly stuck against the wall for 15 ticks, or physically reached it
            if ((ladder.stuckTicks > 15 && ladder.y < gateY + 60) || ladder.y <= gateY + 25) {
                deployAssaultLadder(ladder); 
            }
        }
    });

    // C. MANTLET (SHIELD) INTERCEPTION
    for (let i = battleEnvironment.projectiles.length - 1; i >= 0; i--) {
        let p = battleEnvironment.projectiles[i];
        if (p.side === "enemy" && p.vy > 0) { 
            for (let m of siegeEquipment.mantlets) {
                if (m.hp > 0 && Math.abs(p.x - m.x) < 30 && Math.abs(p.y - m.y) < 20) {
                    if (Math.random() < 0.50) { 
                        m.hp -= p.attackerStats?.missileBaseDamage || 10;
                        battleEnvironment.projectiles.splice(i, 1); 
                        break; 
                    }
                }
            }
        }
    }

    // D. TREBUCHET ARTILLERY (Requires Crew)
    siegeEquipment.trebuchets.forEach(treb => {
        if (treb.hp <= 0) return;

        let crew = playerUnits.filter(u => Math.hypot(u.x - treb.x, u.y - treb.y) < 80);
        
        if (crew.length >= 3) {
            treb.cooldown--;
            treb.isManned = true; 
        } else {
            treb.isManned = false;
            return; 
        }
        
        if (treb.cooldown <= 0 && wallEnemies.length > 0) {
            treb.cooldown = treb.fireRate;
            let target = wallEnemies[Math.floor(Math.random() * wallEnemies.length)];
            
            let dx = target.x - treb.x;
            let dy = target.y - treb.y;
            let dist = Math.hypot(dx, dy);
            let speed = 6;

            battleEnvironment.projectiles.push({
                x: treb.x, y: treb.y,
                vx: (dx / dist) * speed, vy: (dy / dist) * speed,
                startX: treb.x, startY: treb.y,
                maxRange: 3500,
                attackerStats: { role: "bomb", missileAPDamage: 150, missileBaseDamage: 50, name: "Trebuchet Boulder" },
                side: "player",
                projectileType: "bomb", 
                isFire: false
            });
            
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('bomb'); 
        }
    });

    // ========================================================================
    // 2. DEFENDER AI (ENEMY) - Throttled to 6 ticks
    // ========================================================================
    if (siegeAITick % 6 === 0) {
        let southGate = overheadCityGates.find(g => g.side === "south");
        let gateY = southGate ? southGate.y * BATTLE_TILE_SIZE : BATTLE_WORLD_HEIGHT - 800;
        let gateX = southGate ? southGate.x * BATTLE_TILE_SIZE : BATTLE_WORLD_WIDTH / 2;

        allAliveEnemies.forEach(u => {
            if (u.onWall) {
                if (Math.random() < 0.3 && (u.state === "idle" || !u.hasOrders)) {
                    u.target = { 
                        x: gateX + (Math.random() - 0.5) * 600, 
                        y: gateY, 
                        isDummy: true 
                    };
                    u.state = "moving";
                    u.hasOrders = true;
                }
            } 
            else {
                let closestAttacker = null;
                let minDist = Infinity;
                
                for (let i = 0; i < playerUnits.length; i++) {
                    let attacker = playerUnits[i];
                    let dist = Math.hypot(u.x - attacker.x, u.y - attacker.y);
                    if (dist < minDist) {
                        minDist = dist;
                        closestAttacker = attacker;
                    }
                }

                if (closestAttacker && (u.state === "idle" || !u.hasOrders || (u.target && u.target.isDummy))) {
                    u.target = closestAttacker; 
                    u.state = "moving";
                    u.hasOrders = true;
                } else if (!closestAttacker && (u.state === "idle" || !u.hasOrders)) {
                    u.target = {
                        x: BATTLE_WORLD_WIDTH / 2 + (Math.random() - 0.5) * 200, 
                        y: BATTLE_WORLD_HEIGHT / 2 + (Math.random() - 0.5) * 200, 
                        isDummy: true
                    };
                    u.state = "moving";
                    u.hasOrders = true;
                }
            }
        });
    }

// ========================================================================
    // 3. ATTACKER AI (PLAYER) - Throttled to 4 ticks (Offset from defenders)
    // ========================================================================
    if (siegeAITick % 4 === 0) {
        playerUnits.forEach((u, index) => {
            
            // ---> SURGICAL FIX: Stop the Siege Engine from hijacking the Commander! <---
            if (u.isCommander || u.isPlayer) return; 

            if (u.state === "attacking" && u.target && !u.target.isDummy) return;

            const roleStr = String(u.stats?.role || u.unitType || "").toLowerCase();
            const isCavalry = u.stats?.isLarge || roleStr.includes("cav");
            
            // ... (the rest of the logic remains exactly the same)
            const isRanged = roleStr.includes("ranged") || roleStr.includes("archer");

            // Evaluate if this specific unit is officially registered to equipment
            let isOperatingEquipment = 
                siegeEquipment.ladders.some(l => l.carriedBy === u) || 
                siegeEquipment.rams.some(r => r.carriedBy && r.carriedBy.includes(u));

            // --- CONDITION A: BREACH ACHIEVED (CHARGE THE ENEMY) ---
            if (generalBreachAchieved && !isOperatingEquipment) {
                let closestEnemy = null;
                let minDist = Infinity;
                
                for (let i = 0; i < allAliveEnemies.length; i++) {
                    let enemy = allAliveEnemies[i];
                    let dist = Math.hypot(u.x - enemy.x, u.y - enemy.y);
                    if (dist < minDist) {
                        minDist = dist;
                        closestEnemy = enemy;
                    }
                }

                if (closestEnemy && minDist > 35) {
                    u.target = closestEnemy;
                    u.state = "moving";
                    u.hasOrders = true;
                    if (isRanged) u.forceMelee = true; 
                }
            } 
            
            // --- CONDITION B: NO BREACH (FOCUS ON SIEGE) ---
            else if (!isOperatingEquipment && (u.state === "idle" || !u.hasOrders)) {
                
                // 1. Cavalry waits far in the back
                if (isCavalry) {
                    u.target = {
                        x: gateX + ((index % 10) - 5) * 60,
                        y: wallY + 600 + (Math.floor(index / 10) * 60), 
                        isDummy: true
                    };
                }
                // 2. Archers stay slightly behind melee and shoot
                else if (isRanged) {
                    u.target = {
                        x: gateX + ((index % 20) - 10) * 35, 
                        y: wallY + 250 + (Math.floor(index / 20) * 30), 
                        isDummy: true
                    };
                }
                // 3. Melee queues up with strict spacing to wait for breach/ladders
                else {
                    u.target = {
                        x: gateX + ((index % 16) - 8) * 40,
                        y: wallY + 120 + (Math.floor((index % 64) / 16) * 40), 
                        isDummy: true
                    };
                }

                u.state = "moving";
                u.hasOrders = true;
            }
        });
}

}

// --- 3. DEPLOY LADDER TO GRID ---
function deployAssaultLadder(ladder) {
    ladder.isDeployed = true;
    ladder.carriedBy = null;

    let tileX = Math.floor(ladder.x / BATTLE_TILE_SIZE);
    let tileY = Math.floor((ladder.y - 20) / BATTLE_TILE_SIZE); // Map it slightly forward onto the wall

    // Change grid IDs to 9 (Ladder Bridge) so units can walk up
    for (let x = tileX - 2; x <= tileX + 2; x++) {
        for (let y = tileY - 4; y <= tileY; y++) {
            if (battleEnvironment.grid[x] && battleEnvironment.grid[x][y] !== undefined) {
                battleEnvironment.grid[x][y] = 9; 
            }
        }
    }

    // Register globally so troops know they can use it
    if (typeof cityLadders !== 'undefined') {
        cityLadders.push({
            x: ladder.x,
            y: ladder.y - 20
        });
    }
    console.log("Assault Ladder Deployed!");
}

// --- 4. RENDER SIEGE EQUIPMENT ---
function renderSiegeEngines(ctx) {
    if (!inSiegeBattle) return;

    // 1. MANTLETS (Heavy wooden barricades)
    siegeEquipment.mantlets.forEach(m => {
        if (m.hp <= 0) return;
        ctx.fillStyle = "#4e342e";
        ctx.fillRect(m.x - 25, m.y - 5, 50, 10);
        ctx.fillStyle = "#3e2723"; // Wood planks
        ctx.fillRect(m.x - 23, m.y - 3, 46, 2);
        ctx.fillRect(m.x - 23, m.y + 1, 46, 2);
        // Props holding it up
        ctx.fillRect(m.x - 15, m.y + 5, 4, 15);
        ctx.fillRect(m.x + 11, m.y + 5, 4, 15);
    });

    // 2. LADDERS
    siegeEquipment.ladders.forEach(l => {
        if (l.hp <= 0) return;
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.strokeStyle = "#8d6e63";
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        if (l.isDeployed) {
            // Rendered Vertically against the wall
            ctx.moveTo(-10, -40); ctx.lineTo(-10, 20);
            ctx.moveTo(10, -40); ctx.lineTo(10, 20);
            for(let r = -35; r < 20; r += 10) {
                ctx.moveTo(-10, r); ctx.lineTo(10, r);
            }
        } else {
            // Rendered Horizontally (Being carried)
            ctx.moveTo(-30, -5); ctx.lineTo(30, -5);
            ctx.moveTo(-30, 5); ctx.lineTo(30, 5);
            for(let r = -25; r < 30; r += 10) {
                ctx.moveTo(r, -5); ctx.lineTo(r, 5);
            }
        }
        ctx.stroke();
        ctx.restore();
    });

    // 3. BATTERING RAMS
    siegeEquipment.rams.forEach(r => {
        if (r.hp <= 0) return;
        ctx.save();
        ctx.translate(r.x, r.y);
        
        // Ram momentum visual
        let lunge = r.isBreaking ? Math.sin(Date.now() / 50) * 8 : 0;

        // Wooden Penthouse (Roof to protect pushers)
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(-20, -30, 40, 60);
        ctx.fillStyle = "#3e2723";
        ctx.fillRect(-22, -32, 44, 15); // Front armor plate

        // The actual Ram Log
        ctx.fillStyle = "#212121"; // Iron Head
        ctx.fillRect(-6, -45 + lunge, 12, 15);
        ctx.fillStyle = "#4e342e"; // Wood shaft
        ctx.fillRect(-4, -30 + lunge, 8, 50);

        // Wheels
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(-26, -20, 6, 12); ctx.fillRect(20, -20, 6, 12);
        ctx.fillRect(-26, 10, 6, 12); ctx.fillRect(20, 10, 6, 12);

        ctx.restore();
		
		// Forward shield / armored nose
ctx.save();
ctx.globalAlpha = r.shieldHP > 0 ? 0.92 : 0.35;
ctx.fillStyle = r.shieldHP > 0 ? "#6b5a4a" : "#3a2e28";
ctx.beginPath();
ctx.moveTo(-26, -48);
ctx.lineTo(26, -48);
ctx.lineTo(18, -34);
ctx.lineTo(-18, -34);
ctx.closePath();
ctx.fill();

// little rim so it looks like a shield face
ctx.strokeStyle = "rgba(255,255,255,0.12)";
ctx.lineWidth = 2;
ctx.stroke();
ctx.restore();

    });

    // 4. TREBUCHETS
    siegeEquipment.trebuchets.forEach(t => {
        if (t.hp <= 0) return;
        ctx.save();
        ctx.translate(t.x, t.y);

        // Base frame
        ctx.fillStyle = "#3e2723";
        ctx.fillRect(-15, -20, 30, 40);
        
        // Throwing Arm (Animates when firing)
        let armAngle = (t.cooldown > t.fireRate - 30) ? -Math.PI / 4 : Math.PI / 6;
        ctx.rotate(armAngle);
        
        ctx.fillStyle = "#4e342e";
        ctx.fillRect(-4, -35, 8, 50); // The long arm
        
        // Counterweight
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(-10, 15, 20, 15);
        
        ctx.restore();
    });
}

// Call this inside your unit update loop: if (inSiegeBattle) checkAssaultLadders(unit);
function checkAssaultLadders(unit) {
    if (!inSiegeBattle || unit.hp <= 0 || unit.onWall) return;

    // Check if unit is standing on a ladder tile (Grid ID 9)
    let tx = Math.floor(unit.x / BATTLE_TILE_SIZE);
    let ty = Math.floor(unit.y / BATTLE_TILE_SIZE);

    if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 9) {
        // SUCCESS: Unit climbs the ladder
        unit.onWall = true;
        unit.y -= 40; // Teleport slightly onto the wall floor to prevent glitching back down
        
        if (unit.isCommander) {
            console.log("Commander has reached the ramparts!");
        }
    }
}

 
function concludeSiegeBattlefield(playerObj) {
    console.log("Concluding Siege Assault...");

    inBattleMode = false; 
    inSiegeBattle = false;

    // Tally up survivors
    let pUnitsAlive = battleEnvironment.units.filter(u => u.side === "player" && !u.isCommander && u.hp > 0).length;
    let eUnitsAlive = battleEnvironment.units.filter(u => u.side === "enemy" && u.hp > 0).length; 

    let scale = (currentBattleData.initialCounts.player > 300) ? 5 : 1; 
    let playerLost = currentBattleData.initialCounts.player - (pUnitsAlive * scale);
    
    // Apply losses to global player
    playerObj.troops = Math.max(0, (playerObj.troops || 0) - playerLost);

    let city = currentSiegeCity;
    let didPlayerWin = eUnitsAlive === 0;

    // GUI Elements
    const siegeGui = document.getElementById("siege-gui");
    const statusText = document.getElementById("siege-status-text");
    const guiContinueBtn = document.getElementById("gui-continue-btn");
    const guiAssaultBtn = document.getElementById("gui-assault-btn");
    const guiLeaveBtn = document.getElementById("gui-leave-btn");

    if (didPlayerWin) {
        // PLAYER WINS: Conquer the city
        console.log(`${city.name} has fallen to the Assault!`);
        city.faction = playerObj.faction;
        city.color = (typeof FACTIONS !== 'undefined' && FACTIONS[playerObj.faction]) ? FACTIONS[playerObj.faction].color : "#ffffff";
        
        let occupyingForce = Math.max(5, Math.floor(playerObj.troops * 0.3));
        city.militaryPop = occupyingForce;
        city.troops = occupyingForce;
        playerObj.troops -= occupyingForce;
        city.isUnderSiege = false;
        
if (typeof activeSieges !== 'undefined') {
            let sIndex = activeSieges.findIndex(s => s.defender === city);
            if (sIndex > -1) activeSieges.splice(sIndex, 1);
        }
        
        // NATIVE GUI UPDATE: VICTORY
        if (siegeGui) siegeGui.style.display = 'block';
        if (statusText) statusText.innerHTML = `ASSAULT SUCCESSFUL!<br><span style="font-size:0.9rem; color:#fff;">${city.name} is yours. You lost ${playerLost} troops in the breach. You left ${occupyingForce} men to garrison.</span>`;
        if (guiContinueBtn) guiContinueBtn.style.display = 'none';
        if (guiAssaultBtn) guiAssaultBtn.style.display = 'none';
        if (guiLeaveBtn) {
            guiLeaveBtn.innerText = "Enter City";
            guiLeaveBtn.onclick = () => {
                siegeGui.style.display = 'none';
                playerObj.isSieging = false;
                playerObj.stunTimer = 0;  
            };
        }
        
    } else {
        // PLAYER RETREATS: Attrition phase resumes
        console.log("Assault called off. Resuming blockade.");
        city.militaryPop = Math.max(1, eUnitsAlive * scale);
        city.troops = city.militaryPop;
        
        // NATIVE GUI UPDATE: DEFEAT
        if (siegeGui) siegeGui.style.display = 'block';
        if (statusText) statusText.innerHTML = `ASSAULT FAILED!<br><span style="font-size:0.9rem; color:#aaa;">You retreated with ${playerLost} casualties.<br>The blockade continues against ${city.militaryPop} defenders.</span>`;
        
        // Changed to 'none' so Abandon Siege is the only button available
        if (guiContinueBtn) guiContinueBtn.style.display = 'none';
        if (guiAssaultBtn) guiAssaultBtn.style.display = 'none';
        
        if (guiLeaveBtn) {
            guiLeaveBtn.innerText = "Abandon Siege";
            guiLeaveBtn.onclick = () => {
                if (typeof endSiege === 'function') endSiege(false);
                
                // --- SURGERY: Force unfreeze the player and clear states ---
                playerObj.isSieging = false;
                playerObj.stunTimer = 0; 
                
                if (siegeGui) siegeGui.style.display = 'none';
            };
        }

        // CRITICAL STATE FIX: Keep player locked into the siege overworld loop
        playerObj.isSieging = true;
        playerObj.stunTimer = 9999; 
        
        if (typeof restoreSiegeAfterBattle === 'function') {
            restoreSiegeAfterBattle(false);
        }
    }

    // Restore Camera and State
    if (savedWorldPlayerState_Battle.x !== 0) {
        playerObj.x = savedWorldPlayerState_Battle.x;
        playerObj.y = savedWorldPlayerState_Battle.y;
    }

    if (typeof camera !== 'undefined') {
        camera.x = playerObj.x - canvas.width / 2;
        camera.y = playerObj.y - canvas.height / 2;
    }

    // Cleanup Memory
    currentBattleData = null; 
    currentSiegeCity = null;
    battleEnvironment.units = []; 
    battleEnvironment.projectiles = [];
}


function monitorSiegeEndState(playerObj) {
    if (!inSiegeBattle) return;

    let attackersAlive = battleEnvironment.units.filter(u => u.side === "player" && u.hp > 0).length;
    let defendersAlive = battleEnvironment.units.filter(u => u.side === "enemy" && u.hp > 0).length;

    // Trigger your existing conclusion function if conditions are met
    if (defendersAlive === 0) {
        concludeSiegeBattlefield(playerObj); // Victory!
		// Clear siege engines so they disappear
siegeEquipment.rams = [];
siegeEquipment.ladders = [];
siegeEquipment.mantlets = [];
siegeEquipment.trebuchets = [];
    } else if (attackersAlive === 0 || !isCommanderAlive()) {
        concludeSiegeBattlefield(playerObj); // Defeat/Retreat
		// Clear siege engines so they disappear
siegeEquipment.rams = [];
siegeEquipment.ladders = [];
siegeEquipment.mantlets = [];
siegeEquipment.trebuchets = [];
    }
}