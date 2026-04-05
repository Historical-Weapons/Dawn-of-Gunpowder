// ============================================================================
// EMPIRE OF THE 13TH CENTURY - FULL CITY SIEGE ENGINE (V3 - TOPOGRAPHY UPDATE)
// ============================================================================

let inSiegeBattle = false;
let currentSiegeCity = null;

// --- SINGLE SOURCE OF TRUTH FOR SIEGE DIMENSIONS ---
const SiegeTopography = {
    wallTileY: 0,
    wallPixelY: 0,
    gateTileX: 0,
    gateTileY: 0,
    gatePixelX: 0,
    gatePixelY: 0,
    plazaPixelY: 0,
    campPixelY: 0
};

function establishSiegeTopography() {
    // 1. Fallback base based on city_system logic
    let foundWallY = Math.floor(CITY_LOGICAL_ROWS * 0.35); 
    
    // 2. Find the actual gate for pinpoint accuracy
    let southGate = typeof overheadCityGates !== 'undefined' ? overheadCityGates.find(g => g.side === "south") : null;
    
    if (southGate) {
        foundWallY = southGate.y; 
        SiegeTopography.gateTileX = southGate.x;
        SiegeTopography.gateTileY = southGate.y;
    } else {
        SiegeTopography.gateTileX = Math.floor(BATTLE_COLS / 2);
        SiegeTopography.gateTileY = foundWallY;
    }

    // 3. Bake the absolute coordinates
    SiegeTopography.wallTileY = foundWallY;
    SiegeTopography.wallPixelY = foundWallY * BATTLE_TILE_SIZE;
    SiegeTopography.gatePixelX = SiegeTopography.gateTileX * BATTLE_TILE_SIZE;
    SiegeTopography.gatePixelY = SiegeTopography.gateTileY * BATTLE_TILE_SIZE;
    
    // Plaza is deep inside the city (North)
    SiegeTopography.plazaPixelY = SiegeTopography.wallPixelY - 600; 
    
    // Camp is outside the walls (South), giving enough room for trebuchets
    SiegeTopography.campPixelY = SiegeTopography.wallPixelY + 500; 
    
    console.log("Siege Topography Established: Wall at Y=" + SiegeTopography.wallPixelY + ", Camp at Y=" + SiegeTopography.campPixelY);
}

function enterSiegeBattlefield(enemyNPC, playerObj, cityObj) {
    console.log(`INITIALIZING SIEGE BATTLE: ${cityObj.name}`);
	window.__SIEGE_AUTO_RETREAT_TRIGGERED__ = false;
    
    if (typeof closeParleUI === 'function') {
        closeParleUI(); 
    } else {
        const panel = document.getElementById('parle-panel');
        if (panel) panel.style.display = 'none';
        inParleMode = false;
        if (player) player.isMapPaused = true; 
    }

    // 1. STATE HIJACK
    inBattleMode = true;
    inSiegeBattle = true;
    currentSiegeCity = cityObj;

    BATTLE_WORLD_WIDTH = CITY_WORLD_WIDTH;  
    BATTLE_WORLD_HEIGHT = CITY_WORLD_HEIGHT; 
    BATTLE_COLS = CITY_COLS;
    BATTLE_ROWS = CITY_ROWS;

    // 2. COPY CITY ENVIRONMENT
    let faction = cityObj.originalFaction || cityObj.faction;
    
    if (typeof generateCity === 'function') {
        generateCity(faction);
        if (typeof city_system_troop_storage !== 'undefined') {
            city_system_troop_storage[faction] = []; 
        }
    }
    
    battleEnvironment.grid = JSON.parse(JSON.stringify(cityDimensions[faction].grid));
    battleEnvironment.bgCanvas = cityDimensions[faction].bgCanvas;
    battleEnvironment.fgCanvas = null; 
    battleEnvironment.groundColor = "#000000";
    battleEnvironment.visualPadding = 0; 
    // ---> ADD THIS LINE <---
    battleEnvironment.cityGates = typeof overheadCityGates !== 'undefined' ? overheadCityGates : [];
    // 3. CALIBRATE TOPOGRAPHY
    establishSiegeTopography();

    currentBattleData = {
        enemyRef: enemyNPC, 
        playerFaction: playerObj.faction || "Hong Dynasty",
        enemyFaction: faction,
        initialCounts: { player: 0, enemy: 0 },
        playerColor: (typeof FACTIONS !== 'undefined' && FACTIONS[playerObj.faction]) ? FACTIONS[playerObj.faction].color : "#ffffff",
        enemyColor: (typeof FACTIONS !== 'undefined' && FACTIONS[faction]) ? FACTIONS[faction].color : "#000000"
    };

// 4. initialize THE GATES
if (typeof overheadCityGates !== 'undefined') {
    overheadCityGates.forEach(gate => {
        gate.gateHP = 1000; // <--- Change this to 1000
        gate.isOpen = false; // <--- Change this to false
    });
    updateCityGates(battleEnvironment.grid); 
}

    // 5. DEPLOY ARMIES
    let playerTroops = playerObj.troops || 0;
    deploySiegeAttackers(currentBattleData.playerFaction, playerTroops, "player");
    deploySiegeDefenders(faction, enemyNPC.count, "enemy", enemyNPC.roster);
    
// Inside enterSiegeBattlefield()
    initSiegeEquipment();
 
    // --- NEW LOGIC: ASSIGN 20% FLY-SWARM AND COUNTER-BATTERY ROLES ---
    let pUnitsForRoles = battleEnvironment.units.filter(u => u.side === "player" && !u.isCommander);
    let validClimbers = pUnitsForRoles.filter(u => !u.stats?.isRanged && canUseSiegeEngines(u));
    let rangedTroops = pUnitsForRoles.filter(u => u.stats?.isRanged || String(u.stats?.role).toLowerCase().includes("archer"));

    // Assign 1% of eligible melee to be Ladder Fanatics
    let fanaticCount = Math.floor(validClimbers.length * 0.01);////////
    for (let i = 0; i < fanaticCount; i++) {
        let rIdx = Math.floor(Math.random() * validClimbers.length);
        let u = validClimbers.splice(rIdx, 1)[0];
        if (u) {
            u.siegeRole = "ladder_fanatic";
            u.orderType = "ladder_crew";
            u.disableAICombat = true; // Ignore enemies, prioritize ladder entirely
        }
    }

    // Assign 20% of eligible ranged to be Counter-Battery Snipers
    let sniperCount = Math.floor(rangedTroops.length * 0.20);
    for (let i = 0; i < sniperCount; i++) {
        let rIdx = Math.floor(Math.random() * rangedTroops.length);
        let u = rangedTroops.splice(rIdx, 1)[0];
        if (u) {
            u.siegeRole = "counter_battery";
        }
    }
    // -----------------------------------------------------------------
 
    // 6. CAMERA & AUDIO
    playerObj.x = SiegeTopography.gatePixelX;
    playerObj.y = SiegeTopography.campPixelY + 200; 

    // ---> SURGERY: LAZY AUTO-SIEGE START <---
    // Automatically order all troops to begin the assault so the player doesn't have to manually spam Q
    let pUnits = battleEnvironment.units.filter(u => u.side === "player" && !u.isCommander && !u.disableAICombat);
    if (typeof executeSiegeAssaultAI === 'function') {
       // executeSiegeAssaultAI(pUnits);
    }

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
    // Let the standard field battle logic spawn the army at the very bottom
    deployArmy(faction, totalTroops, side); 
 
    battleEnvironment.units.forEach(u => {
        if (u.side === "player") {
            let checkStr = String((u.stats?.role || "") + " " + (u.unitType || "")).toLowerCase();
            if (u.stats?.isLarge || checkStr.match(/(keshig|horse|lancer|mount|camel|eleph|general|commander)/)) {
                u.unitType = "Spearman";
                let bt = UnitRoster.allUnits["Spearman"] || UnitRoster.allUnits["Militia"];
                // Re-initialize stats for the new unit type
                u.stats = Object.assign(new Troop(bt.name, bt.role, bt.isLarge, u.faction), bt);
                u.hp = u.stats.health;
            }
        }
    });
 
	
    // SURGICAL SHIFT: Grab the entire deployed formation and move it up to the Siege Camp
    // Standard deployArmy puts them at BATTLE_WORLD_HEIGHT - 300
    let expectedSpawnY = BATTLE_WORLD_HEIGHT - 300; 
    let shiftY = expectedSpawnY - SiegeTopography.campPixelY;

    battleEnvironment.units.forEach(u => {
        if (u.side === "player") {
            u.y -= shiftY;
            if (u.target && u.target.isDummy) {
                u.target.y -= shiftY;
            }
        }
    });
}

function deploySiegeDefenders(faction, totalTroops, side, npcRoster) {
    currentBattleData.initialCounts[side] += totalTroops;
    
    let color = currentBattleData.enemyColor;
    let grid = battleEnvironment.grid;
    
    let wallTiles = [];
    let groundTiles = [];

    // --- TRUE TOPOGRAPHY SCAN ---
    let wallY = SiegeTopography.wallTileY;
    
    for (let x = 20; x < BATTLE_COLS - 20; x++) {
        // 1. Wall Parapets (Allow a 3-tile wide strip exactly on the wall)
        for (let y = wallY - 1; y <= wallY + 1; y++) {
            if (grid[x] && (grid[x][y] === 6 || grid[x][y] === 8 || grid[x][y] === 10)) {
                wallTiles.push({x, y}); 
            }
        }
        
        // 2. City Interior (Strictly NORTH of the wall)
        for (let y = wallY - 40; y <= wallY - 4; y++) { 
            if (grid[x] && (grid[x][y] === 0 || grid[x][y] === 1 || grid[x][y] === 5)) {
                groundTiles.push({x, y}); 
            }
        }
    }

    wallTiles.sort(() => Math.random() - 0.5);
    groundTiles.sort(() => Math.random() - 0.5);

    let visualScale = totalTroops > 300 ? 5 : 1; 
    let unitsToSpawn = Math.round(totalTroops / visualScale); 

// Inside function deploySiegeDefenders(faction, totalTroops, side, npcRoster)
for (let i = 0; i < unitsToSpawn; i++) {
    let unitType = npcRoster[i % npcRoster.length].type;

    // --- SURGERY: NO MOUNTED/LARGE UNITS IN SIEGE (ENEMY) ---
    // Check if the current unit type or role contains cavalry/large keywords
    let checkTemplate = UnitRoster.allUnits[unitType] || UnitRoster.allUnits["Spearman"];
    let checkStr = String((checkTemplate.role || "") + " " + (unitType || "")).toLowerCase();
    
	if (checkTemplate.isLarge || checkStr.match(/(keshig|horse|lancer|mount|camel|eleph|general}|knight|cav|commander)/)) {
			unitType = "Spearman"; // Force conversion
		}

    let baseTemplate = UnitRoster.allUnits[unitType] || UnitRoster.allUnits["Spearman"];
    // ... remainder of the existing stats generation logic ...
        let unitStats = Object.assign(new Troop(baseTemplate.name, baseTemplate.role, baseTemplate.isLarge, faction), baseTemplate);
        unitStats.morale = 25; 
        unitStats.maxMorale = 25;
        
        let spawnSpot = null;
        let isElevated = false;

// SELECTION LOGIC
        if ((unitStats.isRanged) && wallTiles.length > 0) {
            spawnSpot = wallTiles.pop();
            isElevated = true;
       } else {
            // MELEE AND CAVALRY SPAWN NEAR SOUTH GATE
            let roleStr = String((unitStats.role || "") + " " + (baseTemplate.type || "")).toLowerCase();
            let isLarge = unitStats.isLarge || roleStr.match(/(cav|horse|keshig|commander|knight|general|mount|camel|eleph)/);

            let gateX = SiegeTopography.gateTileX || Math.floor(BATTLE_COLS / 2);
            let wallY = SiegeTopography.wallTileY;
            
            // New Spacing Logic:
            // Cavalry: Old spot + 100px North
            // Infantry: Old Cavalry spot + 50px North
            let yOffset = isLarge 
                ? -12 - Math.random() * 3 
                : -10 - Math.random() * 3; 

            // Spread them horizontally a bit more to prevent physical overlap clamping
            let xOffset = (Math.random() - 0.5) * 16; 

            spawnSpot = { x: gateX + xOffset, y: wallY + yOffset };
        }
        let finalX = (spawnSpot.x * BATTLE_TILE_SIZE) + ((Math.random() - 0.5) * BATTLE_TILE_SIZE);
        let finalY = (spawnSpot.y * BATTLE_TILE_SIZE) + ((Math.random() - 0.5) * BATTLE_TILE_SIZE);

        // HARD CLAMP: Ensure no defender EVER spawns South of the internal wall face
        if (!isElevated && finalY > SiegeTopography.wallPixelY - 24) {
            finalY = SiegeTopography.wallPixelY - 24 - (Math.random() * 20); 
        }
		
        if (isElevated) {
            unitStats.range = Math.floor((unitStats.range || 100) * 1.5); 
            unitStats.meleeDefense += 10; 
        }

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
            target: { x: finalX, y: finalY + 50, isDummy: true }, // Face South
            state: "idle", 
            animOffset: Math.random() * 100,
            cooldown: 0,
            hasOrders: false,
            onWall: isElevated 
        });
    }
}

function getSiegePathfindingVector(unit, target, originalDx, originalDy, originalDist) {
if (!inSiegeBattle || unit.side !== "player" || unit.onWall) {
        return { dx: originalDx, dy: originalDy, dist: originalDist };
    }

    const wallBoundaryY = SiegeTopography.wallPixelY - 10; 

    if (unit.y > wallBoundaryY && target.y < wallBoundaryY) {
        
       let southGate = overheadCityGates.find(g => g.side === "south");
        let activeLadders = typeof siegeEquipment !== 'undefined' ? siegeEquipment.ladders.filter(l => l.isDeployed && l.hp > 0) : [];
        let bestEntryPoint = null;

        if (southGate && southGate.isOpen) {
            bestEntryPoint = { x: SiegeTopography.gatePixelX, y: SiegeTopography.gatePixelY + 20 };
        // SURGERY 1: Added canUseSiegeEngines(unit) check to prevent commander pathing
        } else if (activeLadders.length > 0 && canUseSiegeEngines(unit)) {
            let closestLadder = activeLadders.reduce((prev, curr) => {
                return Math.hypot(curr.x - unit.x, curr.y - unit.y) < Math.hypot(prev.x - unit.x, prev.y - unit.y) ? curr : prev;
            });
            bestEntryPoint = { x: closestLadder.x, y: closestLadder.y - 10 }; 
        }

        if (bestEntryPoint) {
            let distToEntry = Math.hypot(bestEntryPoint.x - unit.x, bestEntryPoint.y - unit.y);
            if (distToEntry > 15) {
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
 
function initSiegeEquipment() {
    siegeEquipment = { rams: [], trebuchets: [], mantlets: [], ladders: [] };
    
    // --- GATE BREACH CHECK: No siege equipment spawns if gate is already broken ---
    let isGlobalBreach = window.__SIEGE_GATE_BREACHED__ === true;
    let southGate = overheadCityGates.find(g => g.side === "south");
    let isGateBrokenBeforeBattle = isGlobalBreach || (southGate && (southGate.isOpen || southGate.gateHP <= 0));

    if (isGateBrokenBeforeBattle) {
        console.log("Gate was broken prior to deployment! Skipping siege equipment spawn.");
        return; // Leave all arrays empty, immediately aborting engine deployment
    }

    if (southGate) {
        southGate.gateHP = 1000; 
        southGate.isOpen = false;
        updateCityGates(battleEnvironment.grid); 
    }

    let campY = SiegeTopography.campPixelY;
    let midX = SiegeTopography.gatePixelX; 

    // (Spawn Rams, Trebuchets, Mantlets, and Ladders as usual...)
    if (southGate) {
        siegeEquipment.rams.push({
            x: midX, y: campY - 50, targetGate: southGate, hp: 800, speed: 0.3, isBreaking: false,
            shieldHP: 520, shieldMaxHP: 520, shieldW: 54, shieldH: 28, shieldOffsetX: 0, shieldOffsetY: -52
        });
    }

    for (let i = -1; i <= 1; i += 2) {
        siegeEquipment.trebuchets.push({
            x: midX + (i * 300), y: campY + 150, hp: 300, cooldown: Math.random() * 100, fireRate: 200 
        });
    }

    for (let i = -12; i <= 12; i++) {
        if (i === 0) continue; 
        siegeEquipment.mantlets.push({ x: midX + (i * 60), y: campY - 120, hp: 1000 });
    }

    for (let i = -3; i <= 3; i += 2) {
        siegeEquipment.ladders.push({
            x: midX + (i * 120), y: campY - 80, carriedBy: null, isDeployed: false, hp: 400
        });
    }
}

let siegeAITick = 0;

function processSiegeEngines() {
    if (!inSiegeBattle) return;
    
    siegeAITick++; 

    let units = battleEnvironment.units;
    let playerUnits = units.filter(u => u.side === "player" && u.hp > 0);
    let allAliveEnemies = units.filter(u => u.side === "enemy" && u.hp > 0);
    let wallEnemies = allAliveEnemies.filter(u => u.onWall);

    let southGate = battleEnvironment.cityGates 
        ? battleEnvironment.cityGates.find(g => g.side === "south") 
        : null;

    // TRUE breach detection
    let isGateBreached = window.__SIEGE_GATE_BREACHED__ || !southGate || southGate.isOpen || southGate.gateHP <= 0;
    let activeLadders = siegeEquipment.ladders.filter(l => l.isDeployed && l.hp > 0);
    let isWallBreached = activeLadders.length > 0;

    // HARD NPC COLLISION CLAMP (Funneling logic)
    let wallPixelY = SiegeTopography.wallPixelY; 
    let westWallX = 45 * BATTLE_TILE_SIZE; 
    let eastWallX = (BATTLE_COLS - 45) * BATTLE_TILE_SIZE;
 let gateHalfWidth = 80; // SURGERY: Massively widened so they don't clip the gate frame

    battleEnvironment.units.forEach(u => {
        if (!u.onWall && u.hp > 0) {
            
            let atOpenGate = (isGateBreached && Math.abs(u.x - SiegeTopography.gatePixelX) < gateHalfWidth);
            let atLadder = activeLadders.some(l => Math.abs(u.x - l.x) < 24);

            // 1. FRONT WALL COLLISION
            if (u.side === "player" && !u.isCommander) {
                if (u.y < wallPixelY + 20 && !atLadder && !atOpenGate) {
                    u.y = wallPixelY + 20; // Hard clamp on the Y axis
                    
                    // SURGERY: Force them to slide like water toward the gate
                    let dirX = (SiegeTopography.gatePixelX > u.x) ? 1 : -1;
                    u.x += dirX * 1.8; 
                }
            } else if (u.side === "enemy") {
                if (u.y > wallPixelY - 20 && !atOpenGate) {
                    u.y = wallPixelY - 20; 
                }
            }

            // 2. SIDE WALL COLLISION
            if (u.y < wallPixelY) { 
                if (u.x < westWallX) u.x = westWallX; 
                if (u.x > eastWallX) u.x = eastWallX; 
            }
        }
    });

    // ============================================================================
    // A. RAM ASSAULT LOGIC
    // ============================================================================
    siegeEquipment.rams.forEach(ram => {
        if (ram.hp <= 0) return;

        const exactGateY = SiegeTopography.gatePixelY;
        const safeRetreatY = exactGateY + 150; 
        const ramSpeed = ram.speed || ram.stats?.speed || 1;

        const isGateBroken = !ram.targetGate || ram.targetGate.gateHP <= 0 || window.__SIEGE_GATE_BREACHED__;
        
        if (!isGateBroken) {
            if (ram.y > exactGateY) {
                ram.state = "moving_to_gate";
                ram.isBreaking = false;
                ram.y -= ramSpeed; 
            } else {
                ram.y = exactGateY; 
                ram.state = "attacking_gate";
                ram.isBreaking = true;
                
                if (Math.random() > 0.95) { 
                    ram.targetGate.gateHP -= 15; 
                    if (typeof AudioManager !== 'undefined') AudioManager.playSound('hit'); 
                    
                    if (ram.targetGate.gateHP <= 0) {
                        triggerGateBreach(ram.targetGate);
                        ram.targetGate = null; 
                    }
                }
            }
        } else {
            // RETREATING
            ram.isBreaking = false;
            ram.targetGate = null; 
            ram.hasOrders = true;  
            ram.stuckTicks = 0;
            if (ram.path) ram.path = null;

            if (ram.y < safeRetreatY) {
                ram.state = "retreating";
                ram.y += (ramSpeed * 0.5); 
            } else {
                ram.state = "idle";
                ram.hasOrders = false; 
            }
        }
    });

    // RAM SHIELD INTERCEPTION
    for (let i = battleEnvironment.projectiles.length - 1; i >= 0; i--) {
        let p = battleEnvironment.projectiles[i];
        if (p.stuck) continue; 

        if (p.side === "enemy" && p.vy > 0) {
            for (let ram of siegeEquipment.rams) {
                if (ram.hp <= 0 || ram.shieldHP <= 0) continue;

                const shieldX = ram.x + (ram.shieldOffsetX || 0);
                const shieldY = ram.y + (ram.shieldOffsetY || 0);

                if (Math.abs(p.x - shieldX) < (ram.shieldW || 54) / 2 && Math.abs(p.y - shieldY) < (ram.shieldH || 28) / 2) {
                    ram.shieldHP -= p.attackerStats?.missileBaseDamage || 10;
                    battleEnvironment.projectiles.splice(i, 1);
                    if (ram.shieldHP <= 0) ram.shieldHP = 0;
                    break;
                }
            }
        }
    }

   // ============================================================================
    // B. LADDER ASSAULT LOGIC (UPGRADED FLY-SWARM AI)
    // ============================================================================
    let undeployedLadders = siegeEquipment.ladders.filter(l => !l.isDeployed && l.hp > 0);

    // 1. Force the 20% Ladder Fanatics to swarm undeployed ladders
    playerUnits.forEach(u => {
        if (u.siegeRole === "ladder_fanatic") {
            if (undeployedLadders.length > 0) {
                // Find the absolute closest ladder
                let closestLadder = undeployedLadders.reduce((prev, curr) => 
                    Math.hypot(curr.x - u.x, curr.y - u.y) < Math.hypot(prev.x - u.x, prev.y - u.y) ? curr : prev
                );
                
                // Swarm tightly around the ladder's center like flies
                let offsetX = (Math.random() - 0.5) * 45;
                let offsetY = (Math.random() - 0.5) * 45;
                
                u.target = { x: closestLadder.x + offsetX, y: closestLadder.y + offsetY, isDummy: true };
                u.state = "moving";
                u.hasOrders = true;
                u.disableAICombat = true; // Stay pacifist until deployed
                u.orderType = "ladder_crew";
            } else {
                // Ladders are up or destroyed! Revert back to bloodthirsty mode.
                u.siegeRole = "normal";
                u.disableAICombat = false;
                u.orderType = "siege_assault";
            }
        }
    });

    // 2. Process physical ladder movement and deployment
    siegeEquipment.ladders.forEach(ladder => {
        if (ladder.hp <= 0 || ladder.isDeployed) return;

        let targetPixelY = SiegeTopography.wallPixelY + 15;
        const LADDER_SPEED = 0.35; 
        
// The ladder now moves toward the target independently
if (ladder.y > targetPixelY) {
    ladder.y -= LADDER_SPEED;
    ladder.lastY = ladder.y;
}
        if (ladder.y <= targetPixelY && !ladder.isDeployed) {
            deployAssaultLadder(ladder);
            return; 
        }

        // Legacy Fallback: In case the 20% fanatics die, pull a couple random nearby units to help
        let fallbackCrew = playerUnits.filter(u => u.orderType !== "ladder_crew" && u.siegeRole !== "ladder_fanatic" && !u.onWall && Math.hypot(u.x - ladder.x, u.y - ladder.y) < 60);
        fallbackCrew.slice(0, 2).forEach(u => {
             u.target = { x: ladder.x, y: ladder.y + 35, isDummy: true }; 
             u.hasOrders = true;
        });
    });
    // ============================================================================
    // C. MANTLET & TREBUCHET LOGIC
    // ============================================================================
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

    // ============================================================================
    // 2. DEFENDER AI (ENEMY)
    // ============================================================================
    if (siegeAITick % 6 === 0) {
        allAliveEnemies.forEach(u => {
            let roleStr = String((u.stats?.role || "") + " " + (u.unitType || "") + " " + (u.stats?.name || "")).toLowerCase();
            let isLarge = u.stats?.isLarge || roleStr.match(/(cav|horse|mount|camel|eleph)/);

            if (!isGateBreached) {
                // GATE INTACT (Ladders may be up, but don't abandon gate!)
                if (u.onWall) {
                    if (Math.random() < 0.2 && (u.state === "idle" || !u.hasOrders)) {
                        u.target = { 
                            x: SiegeTopography.gatePixelX + (Math.random() - 0.5) * 600, 
                            y: SiegeTopography.wallPixelY, 
                            isDummy: true 
                        };
                        u.state = "moving";
                        u.hasOrders = true;
                    }
                } else {
                    // Ground troops plug the gate. 
                    let targetY = SiegeTopography.wallPixelY - (isLarge ? 650 : 480); 
                    let targetX = SiegeTopography.gatePixelX + (Math.random() - 0.5) * 360;

                    if (u.state === "idle" || !u.hasOrders || (u.target && !u.target.isDummy)) {
                        u.target = { x: targetX, y: targetY - (Math.random() * 50), isDummy: true };
                        u.state = "moving";
                        u.hasOrders = true;
                    } else {
                        // Anti-vibration: Lock strictly into position when close
                        let distToTarget = Math.hypot(u.x - u.target.x, u.y - u.target.y);
                        if (distToTarget < 30) {
                            u.state = "idle";
                            u.target.x = u.x;
                            u.target.y = u.y;
                            u.vx = 0; 
                            u.vy = 0;
                        }
                    }
                }
            } else {
                // GATE IS BROKEN: FALLBACK TO PLAZA
                let plazaX = SiegeTopography.gatePixelX; 
                let plazaY = SiegeTopography.plazaPixelY;
                let distToPlaza = Math.hypot(plazaX - u.x, plazaY - u.y);

                if (distToPlaza > 250 && !u.onWall) {
                    u.target = {
                        x: plazaX + (Math.random() - 0.5) * 350, 
                        y: plazaY + (Math.random() - 0.5) * 250, 
                        isDummy: true
                    };
                    u.state = "moving";
                    u.hasOrders = true;
                } else {
                    let closestAttacker = null;
                    let minDist = Infinity;
                    
                    for (let i = 0; i < playerUnits.length; i++) {
                        let attacker = playerUnits[i];
                        let dist = Math.hypot(u.x - attacker.x, u.y - attacker.y);
                        if (dist < minDist) { minDist = dist; closestAttacker = attacker; }
                    }

                    if (closestAttacker && minDist < 300) {
                        u.target = closestAttacker; 
                        u.state = "moving";
                        u.hasOrders = true;
                    } else if (u.state === "idle" || !u.hasOrders) {
                        u.target = { x: u.x + (Math.random() - 0.5) * 20, y: u.y + (Math.random() - 0.5) * 20, isDummy: true };
                        u.state = "idle";
                        u.hasOrders = true;
                    }
                }
            }
        });
    }

    // ============================================================================
    // 3. ATTACKER AI (PLAYER)
    // ============================================================================
    if (siegeAITick % 4 === 0) {
        playerUnits.forEach((u, index) => {
            if (u.isCommander || u.disableAICombat || u.selected) return; 
            if (u.hasOrders && !["siege_assault", "seek_engage", "ladder_crew"].includes(u.orderType)) return; 
            if (u.state === "attacking" && u.target && !u.target.isDummy) return;
            if (u.orderType === "ladder_crew" && !isGateBreached && !isWallBreached) return;

            const roleStr = String((u.stats?.role || "") + " " + (u.unitType || "") + " " + (u.stats?.name || "")).toLowerCase();
            const isCavalry = u.stats?.isLarge || roleStr.match(/(cav|horse|mount|camel|eleph)/);
            const isRanged = roleStr.includes("ranged") || roleStr.includes("archer");
            const isEquipmentCrew = (u.id % 5 === 0);

            let isOperatingEquipment = siegeEquipment.ladders.some(l => l.carriedBy === u) || 
                                       siegeEquipment.rams.some(r => r.carriedBy && r.carriedBy.includes(u));

            if ((isGateBreached || isWallBreached) && !isOperatingEquipment) {
                let closestEnemy = null;
                let minDist = Infinity;
                
                for (let i = 0; i < allAliveEnemies.length; i++) {
                    let enemy = allAliveEnemies[i];
                    let dist = Math.hypot(u.x - enemy.x, u.y - enemy.y);
                    if (dist < minDist) { minDist = dist; closestEnemy = enemy; }
                }

                if (isRanged) {
					if (isGateBreached || siegeAITick >= 1200) {
                        let bestEntry = null;
                        let minEntryDist = Infinity;

                        if (isGateBreached) {
                            minEntryDist = Math.hypot(u.x - SiegeTopography.gatePixelX, u.y - SiegeTopography.gatePixelY);
                            bestEntry = { x: SiegeTopography.gatePixelX, y: SiegeTopography.gatePixelY + 20 };
                        }
                        
                        if (canUseSiegeEngines(u)) {
                            activeLadders.forEach(l => {
                                let d = Math.hypot(u.x - l.x, u.y - l.y);
                                if (d < minEntryDist) { minEntryDist = d; bestEntry = { x: l.x, y: l.y + 10 }; }
                            });
                        }

                        if (bestEntry && minEntryDist > 60) {
                            u.target = { x: bestEntry.x, y: bestEntry.y, isDummy: true };
                            u.state = "moving";
                            u.hasOrders = true;
                            u.forceMelee = true; 
                            u.stats.range = 10; 
                            u.stats.currentStance = "statusmelee";
                        } else if (closestEnemy && minDist > 35) {
                            u.target = closestEnemy;
                            u.state = "moving";
                            u.hasOrders = true;
                        }
                    } else {
                        if (closestEnemy) { u.target = closestEnemy; u.state = "moving"; u.hasOrders = true; }
                    }
                } else {
                    if (closestEnemy && minDist > 35) {
                        u.target = closestEnemy;
                        u.state = "moving";
                        u.hasOrders = true;
                    }
                }
            } 
            else if (!isOperatingEquipment) {
                // PRE-BREACH LOGIC
                let gateX = SiegeTopography.gatePixelX;
                let wallY = SiegeTopography.wallPixelY;

                if (isCavalry) {
                    if (u.state === "idle" || !u.hasOrders) {
                        u.target = { x: u.x, y: u.y, isDummy: true };
                        u.state = "idle";
                        u.hasOrders = true;
                    }
                } else if (isEquipmentCrew && !isRanged) {
                    let undeployedLadders = siegeEquipment.ladders.filter(l => !l.isDeployed && l.hp > 0);
                    if (undeployedLadders.length > 0) {
                        let closestLadder = undeployedLadders.reduce((prev, curr) =>
                            Math.hypot(curr.x - u.x, curr.y - u.y) < Math.hypot(prev.x - u.x, prev.y - u.y) ? curr : prev
                        );
                        u.target = { x: closestLadder.x, y: closestLadder.y + 30, isDummy: true };
                        u.state = "moving";
                        u.hasOrders = true;
                        u.orderType = "ladder_crew";
                    }
                } else if (isRanged) {
                    if (!u.target || u.target.hp <= 0 || u.target.isDummy) {
                        let targetEnemy = null;
                        let minWDist = Infinity;
                        wallEnemies.forEach(e => {
                            let d = Math.hypot(u.x - e.x, u.y - e.y);
                            if (d < minWDist) { minWDist = d; targetEnemy = e; }
                        });

                        if (targetEnemy) {
                            u.target = targetEnemy;
                            u.state = "moving";
                            u.hasOrders = true;
                        } else if (u.state === "idle" || !u.hasOrders) {
                            u.target = { x: gateX + ((index % 20) - 10) * 35, y: wallY + 250 + (Math.floor(index / 20) * 30), isDummy: true };
                            u.state = "moving";
                            u.hasOrders = true;
                        }
                    }
              } else {
if (u.state === "idle" || !u.hasOrders || (u.target && u.target.isDummy && u.target.y > wallY + 150)) {
                        // SURGERY: Aggressive Gate Funneling
                        // Tightly clumps the remaining army right in front of the gate opening
                        u.target = { 
                            x: gateX + ((Math.random() - 0.5) * 160), 
                            y: wallY + 30 + (Math.random() * 80), 
                            isDummy: true 
                        };
                        u.state = "moving";
                        u.hasOrders = true;
                    }
                }
            }
        });
    }
}

function applyDamageToGate(gateId, damageAmount) {
    // Find the specific gate being attacked
    const gateIndex = battleEnvironment.cityGates.findIndex(g => g.id === gateId || g.side === gateId);
    if (gateIndex === -1) return; 

    const targetGate = battleEnvironment.cityGates[gateIndex];
    targetGate.gateHP -= damageAmount;

    // Check for destruction
    if (targetGate.gateHP <= 0) {
        targetGate.isOpen = true; // Signals render to draw open/destroyed

        // STEP 1: Erase the collision
        let bounds = targetGate.bounds;
        if (bounds) {
            for (let x = bounds.x0; x <= bounds.x1; x++) {
                for (let y = bounds.y0; y <= bounds.y1; y++) {
                    let isPillar = (x === bounds.x0 || x === bounds.x1);
                    if (!isPillar && battleEnvironment.grid[x] && battleEnvironment.grid[x][y] !== undefined) {
                        battleEnvironment.grid[x][y] = 1; // 1 = Road
                    }
                }
            }
        }

        // STEP 2: Remove from rendering array if you want it to completely vanish
        // If you want to keep drawing the "destroyed" sprite, DO NOT splice it.
        // battleEnvironment.cityGates.splice(gateIndex, 1);
    }
}

function deployAssaultLadder(ladder) {
    ladder.isDeployed = true;
    
    if (ladder.carriedBy && isNeverLadderCarrier(ladder.carriedBy)) {
        ladder.carriedBy.disableAICombat = false;
        ladder.carriedBy = null;
    }

    let tileX = Math.floor(ladder.x / BATTLE_TILE_SIZE);
    let tileY = Math.floor(ladder.y / BATTLE_TILE_SIZE); 

    // Paint the ladder deep into the wall to ensure connection
    for (let x = tileX - 2; x <= tileX + 2; x++) {
        for (let y = tileY - 6; y <= tileY; y++) {
            if (battleEnvironment.grid[x] && battleEnvironment.grid[x][y] !== undefined) {
                battleEnvironment.grid[x][y] = 9; // 9 = Ladder Tile
            }
        }
    }

    if (typeof cityLadders !== 'undefined') {
        cityLadders.push({ x: ladder.x, y: ladder.y - 20 });
    }

    // ---> NEW SURGERY: Call the landing prep function! <---
    // Calculate the absolute Y tile for the top of the wall
    let wallTileY = Math.floor((SiegeTopography.wallPixelY - 20) / BATTLE_TILE_SIZE);
    prepareLadderLanding(ladder, wallTileY);
}

function renderSiegeEngines(ctx) {
    if (!inSiegeBattle) return;

	siegeEquipment.mantlets.forEach(m => {
    if (m.hp <= 0) return;
    ctx.save();
    ctx.translate(m.x, m.y);

    // 1. REAR SUPPORT STRUCTURE (The "Kickstand")
    // These are the legs that prop the shield up
    ctx.fillStyle = "#2a1b16";
    ctx.fillRect(-18, 2, 4, 15); // Left strut
    ctx.fillRect(14, 2, 4, 15);  // Right strut
    // Cross-brace for the legs
    ctx.fillRect(-18, 12, 36, 3);

    // 2. THE MAIN SHIELD PLATE (Pavise)
    // We draw this with a slight gradient or layering to show it's slanted
    
    // Base Wood (Darker)
    ctx.fillStyle = "#4e342e";
    ctx.fillRect(-25, -5, 50, 12); 

    // Individual Vertical Planks (Adding texture)
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 1;
    for (let px = -25; px < 25; px += 5) {
        ctx.strokeRect(px, -5, 5, 12);
    }

    // 3. FRONT REINFORCEMENT (Heavy Iron Bands)
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-26, -3, 52, 2); // Top band
    ctx.fillRect(-26, 4, 52, 2);  // Bottom band

    // Iron Studs (Rivets)
    ctx.fillStyle = "#757575";
    for (let sx = -22; sx <= 22; sx += 11) {
        ctx.beginPath();
        ctx.arc(sx, -2, 1.2, 0, Math.PI * 2);
        ctx.arc(sx, 5, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // 4. THE VIEWING SLIT (The Archery Port)
    // A dark narrow gap in the center of the shield
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-6, -1, 12, 3);
    
    // 5. TOP EDGE SHADOW
    // Gives it a birds-eye "thickness" look
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(-25, -7, 50, 2);

    ctx.restore();
});
// ============================================================================
// B. LADDER ASSAULT LOGIC -> SIEGE TOWER CONVERSION (BIRDS EYE)
// ============================================================================
// In processSiegeEngines(), targetPixelY is wallPixelY + 15.
// We align the deployed state to imply the ramp rests on the wall boundary.
siegeEquipment.ladders.forEach(l => {
    if (l.hp <= 0) return;
    ctx.save();
    ctx.translate(l.x, l.y);

    // --- SIEGE TOWER (BIRDS-EYE) ---
    // Length: 90 (1.5x), Width: 52 
    const isMoving = !l.isDeployed;

    // 1. WHEELS (Hidden under the chassis shadow)
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-29, -30, 6, 15); // FL
    ctx.fillRect(23, -30, 6, 15);  // FR
    ctx.fillRect(-29, 20, 6, 15);   // BL
    ctx.fillRect(23, 20, 6, 15);   // BR

    // 2. CHASSIS & ENCLOSURE
    // Base shadow implies people are inside pushing
    ctx.fillStyle = "#2a1b16";
    ctx.fillRect(-26, -45, 52, 90);

    // 3. LAYERED SHIELD WALLS (Perimeter)
    ctx.fillStyle = "#6b4c3a";
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 1;

    // Front shield wall top-down view
    for (let fx = -22; fx <= 22; fx += 8) {
        let sx = fx - 4;
        let sy = -47;
        let offY = Math.abs(fx % 16) === 0 ? 0 : 2; 
        ctx.beginPath();
        ctx.moveTo(sx, sy + offY);
        ctx.quadraticCurveTo(sx + 4, sy + offY - 3, sx + 8, sy + offY);
        ctx.lineTo(sx + 8, sy + offY + 10);
        ctx.lineTo(sx, sy + offY + 10);
        ctx.fill();
        ctx.stroke();
    }

    // Side Walls (Structure edges)
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(-26, -45, 10, 90); // Left
    ctx.fillRect(16, -45, 10, 90);  // Right

    // 4. TOP DECK (Where the ramp is anchored)
    ctx.fillStyle = "#2a1b16"; // Dark interior floor
    ctx.fillRect(-16, -35, 32, 70);

    // Deck Planks (Inspired by the Ram's roof)
    ctx.strokeStyle = "#2a1b16";
    ctx.fillStyle = "#5d4037";
    for(let px = -12; px <= 12; px += 8) {
        ctx.fillRect(px - 4, -30, 8, 65);
        ctx.strokeRect(px - 4, -30, 8, 65);
    }

    // 5. DEPLOYMENT LOGIC
    if (l.isDeployed) {
        ctx.save();
        ctx.translate(0, -45); // Move to the front edge to drop the ramp

        // DRAWBRIDGE / RAMP
        ctx.fillStyle = "#4e342e";
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 2;
        ctx.fillRect(-18, -30, 36, 30); // Extends toward the wall
        ctx.strokeRect(-18, -30, 36, 30);

        // Ramp Rungs
        ctx.strokeStyle = "#2a1b16";
        for(let r = -25; r < 0; r += 5) {
            ctx.beginPath();
            ctx.moveTo(-18, r); ctx.lineTo(18, r);
            ctx.stroke();
        }

        // --- THE STRINGS (CHAINS) ---
        // Only visible when deployed. 
        // Origin: Opposite direction (The rear support beams of the top deck)
        // Target: The far corners of the lowered ramp
        ctx.restore(); // Back to Tower local space (l.x, l.y)
        
        ctx.strokeStyle = "#999999"; // Iron chain color
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        // Left Chain: From Rear-Left Support to Front-Left Ramp Corner
        ctx.moveTo(-18, 20);  // Opposite direction (Rear)
        ctx.lineTo(-18, -75); // Target (Front of deployed ramp)
        
        // Right Chain: From Rear-Right Support to Front-Right Ramp Corner
        ctx.moveTo(18, 20);   // Opposite direction (Rear)
        ctx.lineTo(18, -75);  // Target (Front of deployed ramp)
        
        ctx.stroke();
    } else {
        // MOVING STATE: 
        // No strings drawn here. 
        // Just the top front crossbeam to show the "hatch" is closed.
        ctx.fillStyle = "#3e2723";
        ctx.fillRect(-18, -45, 36, 4);
    }

    ctx.restore();
});

    siegeEquipment.rams.forEach(r => {
        if (r.hp <= 0) return;
        ctx.save();
        ctx.translate(r.x, r.y);
        
        // The swinging logic for the actual battering log
        let lunge = r.isBreaking ? Math.sin(Date.now() / 50) * 8 : 0;

        // 1. WHEELS (Base layer)
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(-26, -20, 6, 12); // Front Left
        ctx.fillRect(20, -20, 6, 12);  // Front Right
        ctx.fillRect(-26, 15, 6, 12);  // Back Left
        ctx.fillRect(20, 15, 6, 12);   // Back Right

        // 2. THE BATTERING LOG (Extends out the front and swings)
        // Iron head
        ctx.fillStyle = "#212121"; 
        ctx.fillRect(-6, -45 + lunge, 12, 15);
        // Wooden trunk
        ctx.fillStyle = "#4e342e"; 
        ctx.fillRect(-4, -30 + lunge, 8, 55); 

        // 3. THE PROTECTED ROOF / ARCH (Implies an enclosed chassis for units)
        // Base dark shadow of the interior
        ctx.fillStyle = "#2a1b16";
        ctx.fillRect(-22, -28, 44, 60);

        // Layered wooden pitched roof
        // Outer lower planks
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(-22, -26, 10, 56); // Left edge
        ctx.fillRect(12, -26, 10, 56);  // Right edge
        
        // Inner upper planks (creating the arch depth)
        ctx.fillStyle = "#4e342e";
        ctx.fillRect(-12, -26, 10, 56); // Mid left
        ctx.fillRect(2, -26, 10, 56);   // Mid right

        // Central heavy ridge beam (spine of the roof)
        ctx.fillStyle = "#3e2723";
        ctx.fillRect(-4, -28, 8, 60);

        // Heavy horizontal crossbeams holding the roof together
        ctx.fillStyle = "#2a1b16";
        ctx.fillRect(-23, -15, 46, 4);
        ctx.fillRect(-23, 15, 46, 4);

        // 4. THE LAYERED WOODEN SHIELD (Front Mantlet)
        // Drawn slightly elevated and angled at the front of the chassis
        ctx.save();
        ctx.translate(0, -35);
        
        // Shield backplate shadow
        ctx.fillStyle = "#2a1b16";
        ctx.beginPath();
        ctx.moveTo(-30, -8);
        ctx.lineTo(30, -8);
        ctx.lineTo(24, 6);
        ctx.lineTo(-24, 6);
        ctx.fill();

        // Interlayers of wood (Distinct vertical planks)
        ctx.fillStyle = "#6b4c3a";
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#3e2723"; // Dark lines separating planks
        
        for (let w = -24; w <= 24; w += 8) {
            // Draw each plank and outline it for that layered texture
            ctx.fillRect(w - 4, -6, 8, 10);
            ctx.strokeRect(w - 4, -6, 8, 10);
        }

        // Heavy iron reinforcement band binding the shield planks
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(-26, -2, 52, 3);
        
        // Iron studs riveted into the reinforcement band
        ctx.fillStyle = "#757575";
        for (let s = -22; s <= 22; s += 11) {
            ctx.beginPath();
            ctx.arc(s, -0.5, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore(); // Restore from shield offset

        ctx.restore(); // Restore main ram coordinates
    });
         
siegeEquipment.trebuchets.forEach(t => {
    if (t.hp <= 0) return;
    ctx.save();
    ctx.translate(t.x, t.y);

    // ==========================================
    // 1. BASE FRAME (Realistic Top-Down Chassis)
    // ==========================================
    
    // Heavy Ground Rails
    ctx.fillStyle = "#3e2723";
    ctx.fillRect(-15, -30, 6, 65); // Left rail
    ctx.fillRect(9, -30, 6, 65);   // Right rail
    
    // Crossbeams securing the base to the ground
    ctx.fillStyle = "#2a1b16";
    ctx.fillRect(-15, -25, 30, 5); // Front crossbeam
    ctx.fillRect(-15, 25, 30, 5);  // Rear crossbeam

    // Heavy A-Frame Supports (Tapering up to the axle)
    ctx.fillStyle = "#4e342e";
    ctx.beginPath();
    ctx.moveTo(-15, -10); ctx.lineTo(-15, 10); ctx.lineTo(-8, 5); ctx.lineTo(-8, -5); ctx.fill(); // Left
    ctx.beginPath();
    ctx.moveTo(15, -10); ctx.lineTo(15, 10); ctx.lineTo(8, 5); ctx.lineTo(8, -5); ctx.fill();     // Right

    // Central Iron Axle
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-18, -3, 36, 6);

    // ==========================================
    // 2. ANIMATION STATE LOGIC
    // ==========================================
    const fireAnimDuration = 15; // Frames the throw animation takes
    let isFiring = t.cooldown > (t.fireRate - fireAnimDuration);
    
    // Interpolate progress from 0.0 (loaded) to 1.0 (fired)
    let throwPhase = 0;
    if (isFiring) {
        let animProgress = (t.cooldown - (t.fireRate - fireAnimDuration)) / fireAnimDuration;
        throwPhase = 1.0 - animProgress; 
    }

    // ==========================================
    // 3. ARM ROTATION
    // ==========================================
    ctx.save();
    
    // Loaded: Pointing backwards (South). Fired: Snapped forwards (North).
    let startAngle = Math.PI * 0.85; 
    let endAngle = -Math.PI * 0.1;
    
    // Ease-out formula for a snappy mechanical throw
    let easeOut = 1 - Math.pow(1 - throwPhase, 3);
    let currentAngle = startAngle + (endAngle - startAngle) * easeOut;
    
    ctx.rotate(currentAngle);

    // The Tapered Throwing Arm
    ctx.fillStyle = "#5d4037";
    ctx.beginPath();
    ctx.moveTo(-3, 15);   // Short end (traction ropes attach here)
    ctx.lineTo(3, 15);
    ctx.lineTo(1.5, -45); // Long end (sling attaches here)
    ctx.lineTo(-1.5, -45);
    ctx.fill();

    // Iron Reinforcement Bands
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-2.5, -20, 5, 2);
    ctx.fillRect(-2, -35, 4, 2);
    
    ctx.restore(); // Revert rotation so we can draw ground objects cleanly

    // ==========================================
    // 4. THE SLING (Ground Level Physics)
    // ==========================================
    
    // Map the rotated arm tip back into absolute coordinates
    let tipX = 45 * Math.sin(currentAngle);
    let tipY = -45 * Math.cos(currentAngle);

    let pouchX, pouchY;

    if (!isFiring) {
        // LOADED: Pouch rests heavily on the ground, directly behind the treb
        pouchX = 0;
        pouchY = 55; 
    } else {
        // FIRING: Pouch whips forward past the chassis
        pouchX = tipX * 1.2; 
        pouchY = 55 - (115 * easeOut); // Arcs from +55 up to -60
    }

    // Sling Ropes (From arm tip to grounded pouch)
    ctx.strokeStyle = "#8d6e63"; 
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (!isFiring) {
        // Slack curve resting on the dirt
        ctx.moveTo(tipX, tipY);
        ctx.quadraticCurveTo(tipX + 10, tipY + 20, pouchX, pouchY); 
    } else {
        // Taut snapping line in the air
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(pouchX, pouchY); 
    }
    ctx.stroke();

    // The Leather Pouch
    ctx.fillStyle = "#3e2723";
    ctx.beginPath();
    ctx.arc(pouchX, pouchY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // The Boulder (Disappears right as it leaves the pouch)
    if (throwPhase < 0.8) {
        ctx.fillStyle = "#9e9e9e"; 
        ctx.beginPath();
        ctx.arc(pouchX, pouchY, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

 

    ctx.restore();
});

}
function checkAssaultLadders(unit) {
  if (!inSiegeBattle || unit.hp <= 0 || unit.onWall) return;
    if (unit.side !== "player" || unit.y < SiegeTopography.wallPixelY) return;
    if (!canUseSiegeEngines(unit)) return; // SURGERY 1: Prevent climbing

    const tx = Math.floor(unit.x / BATTLE_TILE_SIZE);
    const ty = Math.floor(unit.y / BATTLE_TILE_SIZE);

    if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 9) {
        unit.onWall = true;
        unit.y = SiegeTopography.wallPixelY - 20;
        if (unit.isCommander) console.log("Commander has reached the ramparts!");
    }
}

function concludeSiegeBattlefield(playerObj) {
    console.log("Concluding Siege Assault...");

    inBattleMode = false;
    inSiegeBattle = false;
    playerObj.isMoving = true; // Ensure movement is unlocked
    playerObj.stunTimer = 0;   // Clear any stuns
    
    if (playerObj.hp <= 0) {
        playerObj.hp = 100; // Give a "second chance" health pool
    }

    let pSurvivors = battleEnvironment.units.filter(u => u.side === "player" && !u.isCommander && u.hp > 0);
    playerObj.roster = [];
    pSurvivors.forEach(u => {
        let exp = u.stats ? (u.stats.experienceLevel || 1) : 1;
        playerObj.roster.push({ type: u.unitType, exp: exp });
    });
    
    // Merge reserves back in if they exist
    if (playerObj.reserveRoster && playerObj.reserveRoster.length > 0) {
        playerObj.roster = playerObj.roster.concat(playerObj.reserveRoster);
        playerObj.reserveRoster = [];
    }
    
    // Force the troop count to equal the living roster
    playerObj.troops = playerObj.roster.length;

    // Calculate accurate losses based on the single source of truth
    let initialCount = (currentBattleData.trueInitialCounts && currentBattleData.trueInitialCounts.player) 
        ? currentBattleData.trueInitialCounts.player 
        : currentBattleData.initialCounts.player;
        
    let playerLost = Math.max(0, initialCount - playerObj.troops);
    let eUnitsAlive = battleEnvironment.units.filter(u => u.side === "enemy" && u.hp > 0).length; 

    let city = currentSiegeCity;
    let didPlayerWin = eUnitsAlive === 0;

    const siegeGui = document.getElementById("siege-gui");
    const statusText = document.getElementById("siege-status-text");
    const guiContinueBtn = document.getElementById("gui-continue-btn");
    const guiAssaultBtn = document.getElementById("gui-assault-btn");
    const guiLeaveBtn = document.getElementById("gui-leave-btn");

    if (didPlayerWin) {
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
        console.log("Assault called off.");
        let initialEnemy = (currentBattleData.trueInitialCounts && currentBattleData.trueInitialCounts.enemy) 
            ? currentBattleData.trueInitialCounts.enemy 
            : 100;
        let scale = initialEnemy > 300 ? 5 : 1;
        city.militaryPop = Math.max(1, eUnitsAlive * scale);
        city.troops = city.militaryPop;
        
        if (siegeGui) siegeGui.style.display = 'block';
        if (statusText) statusText.innerHTML = `ASSAULT FAILED!<br><span style="font-size:0.9rem; color:#aaa;">You retreated with ${playerLost} casualties.<br>Enemy has ${city.militaryPop} defenders.</span>`;
        
        if (guiContinueBtn) guiContinueBtn.style.display = 'none';
        if (guiAssaultBtn) guiAssaultBtn.style.display = 'none';
        
        if (guiLeaveBtn) {
            guiLeaveBtn.innerText = "Abandon Siege";
            guiLeaveBtn.onclick = () => {
                if (typeof endSiege === 'function') endSiege(false);
                playerObj.isSieging = false;
                playerObj.stunTimer = 0; 
                if (siegeGui) siegeGui.style.display = 'none';
            };
        }

        playerObj.isSieging = true;
        playerObj.stunTimer = 9999; 
        
        if (typeof restoreSiegeAfterBattle === 'function') {
            restoreSiegeAfterBattle(false);
        }
    }

    if (savedWorldPlayerState_Battle.x !== 0) {
        playerObj.x = savedWorldPlayerState_Battle.x;
        playerObj.y = savedWorldPlayerState_Battle.y;
    }

    if (typeof camera !== 'undefined') {
        camera.x = playerObj.x - canvas.width / 2;
        camera.y = playerObj.y - canvas.height / 2;
    }

    currentBattleData = null; 
    currentSiegeCity = null;
    battleEnvironment.units = []; 
    battleEnvironment.projectiles = [];
}

function monitorSiegeEndState(playerObj) {
    if (!inSiegeBattle) return;

    let attackersAlive = battleEnvironment.units.filter(u => u.side === "player" && u.hp > 0).length;
    let defendersAlive = battleEnvironment.units.filter(u => u.side === "enemy" && u.hp > 0).length;

    if (defendersAlive === 0 || attackersAlive === 0 || !isCommanderAlive()) {
        concludeSiegeBattlefield(playerObj); 
        siegeEquipment.rams = [];
        siegeEquipment.ladders = [];
        siegeEquipment.mantlets = [];
        siegeEquipment.trebuchets = [];
    }
}

function applyStuckExtractor(unit) {
    // Initialize tracking variables if they don't exist
    if (!unit.lastPos) {
        unit.lastPos = { x: unit.x, y: unit.y };
        unit.stuckTicks = 0;
        unit.extractorCooldown = 0;
        unit.ignoreCollisionTicks = 0; // NEW: Tracks the 1-second ghost mode
    }

    // Tick down ghost mode if active
    if (unit.ignoreCollisionTicks > 0) {
        unit.ignoreCollisionTicks--;
    }

    // Don't extract if on cooldown from a recent extraction
    if (unit.extractorCooldown > 0) {
        unit.extractorCooldown--;
        unit.lastPos = { x: unit.x, y: unit.y };
        return; 
    }

    // Only apply logic if the unit has a target or is actively trying to move
    if (unit.target || unit.isMoving || unit.state === "moving") {
        let dx = unit.x - unit.lastPos.x;
        let dy = unit.y - unit.lastPos.y;
        let distSq = (dx * dx) + (dy * dy);

        // If distance squared is less than 0.5 pixels over this tick, they are snagged
        if (distSq < 0.5) {
            // ONLY trigger if they are physically touching a Wall (6), Tower (7), or Tree (3)
            let tx = Math.floor(unit.x / BATTLE_TILE_SIZE);
            let ty = Math.floor(unit.y / BATTLE_TILE_SIZE);
            let touchingObstacle = false;

            if (typeof battleEnvironment !== 'undefined' && battleEnvironment.grid) {
                // Check a 3x3 grid around the unit for the specific tiles
                for (let ox = -1; ox <= 1; ox++) {
                    for (let oy = -1; oy <= 1; oy++) {
                        let cx = tx + ox;
                        let cy = ty + oy;
                        if (battleEnvironment.grid[cx] && battleEnvironment.grid[cx][cy] !== undefined) {
                            let tile = battleEnvironment.grid[cx][cy];
                            if (tile === 3 || tile === 6 || tile === 7) {
                                touchingObstacle = true;
                            }
                        }
                    }
                }
            }

            if (touchingObstacle) {
                unit.stuckTicks++;
            } else {
                unit.stuckTicks = 0; // They are snagged on another unit/something else, ignore.
            }
        } else {
            // They are moving normally, reset the stuck counter
            unit.stuckTicks = 0;
        }

        // If snagged for 90 consecutive frames (approx. 1.5 seconds at 60fps)
        if (unit.stuckTicks > 90) {
            // GHOST MODE: Allow them to pass through the snagged tile for 60 frames (1 second)
            unit.ignoreCollisionTicks = 60;
            unit.stuckTicks = 0;
            unit.extractorCooldown = 180; // 3 seconds cooldown before attempting another extract
            
            // Briefly clear their current pathing node to force a smooth repath out of the tile
            if (unit.path) unit.path = null; 
        }
    }
    
    // Update last position for the next frame
    unit.lastPos = { x: unit.x, y: unit.y };
}

function isNeverLadderCarrier(u) {
    if (!u || !u.stats) return true; // Safety fallback: invalid units don't carry ladders

    const txt = String(
        (u.unitType || "") + " " +
        (u.stats.role || "") + " " +
        (u.stats.name || "")
    ).toLowerCase();

    // 1. Explicitly check flags
    if (u.isMounted || u.stats.isLarge || u.isCommander || u.isDummy) {
        return true; 
    }

    // 2. Comprehensive Regex for ANY cavalry terminology
    // Added 'knight' and 'cataphract' just in case
    const isCavalryText = /\b(cav|horse|mounted|camel|eleph|lancer|archer|cataphract)\b/.test(txt);
    
    return isCavalryText;
}

// --- HELPER FUNCTION: Fire this ONLY ONCE when the gate breaks ---
function triggerGateBreach(gate) {
 
    console.log("Gate Breached! Defenders retreating to Plaza.");
    window.__SIEGE_GATE_BREACHED__ = true; // Global Hard Flag

    // 1. Update Gate Data
    gate.isOpen = true;
    gate.gateHP = 0;

    // 2. Retreat Defenders
    if (battleEnvironment.units) {
        battleEnvironment.units.forEach(u => {
			
			if (u.side === "player" && !canUseSiegeEngines(u)) {
            u.hasOrders = true;
            u.orderType = "move";
            u.orderTargetPoint = { x: gate.pixelX, y: gate.pixelY };
        }
			
			
            if (u.side === "enemy") u.retreatToPlaza = true;
        });
    }

    // 3. Obliterate Collision Grid (Set to 1 / Road)
    const bounds = gate.bounds;
    if (bounds && battleEnvironment.grid) {
        for (let x = bounds.x0; x <= bounds.x1; x++) {
            for (let y = bounds.y0; y <= bounds.y1; y++) {
                if (battleEnvironment.grid[x]?.[y] !== undefined) {
                    battleEnvironment.grid[x][y] = 1; 
                }
            }
        }
    }

    // 4. Remove from Render Array
    if (battleEnvironment.cityGates) {
        const gateIndex = battleEnvironment.cityGates.findIndex(g => g.side === gate.side);
        if (gateIndex !== -1) {
            battleEnvironment.cityGates.splice(gateIndex, 1);
        }
    }
	
	// --- AUTO-RETREAT TIMER AFTER BREACH ---
if (!window.__SIEGE_AUTO_RETREAT_TRIGGERED__) {
    window.__SIEGE_AUTO_RETREAT_TRIGGERED__ = true;

    setTimeout(() => {
        console.log("AUTO-RETREAT: Gate breach timer completed.");

        if (!inSiegeBattle) return;

        battleEnvironment.units.forEach(u => {
            if (u.side === "enemy" && u.hp > 0) {
                u.morale = 0;
                u.maxMorale = Math.max(u.maxMorale || 0, 0);
                u.state = "FLEEING";
                u.hasOrders = true;
                u.target = null;
                u.vx = 0;
                u.vy = 0;
                u.retreatToPlaza = true;
            }
        });

        // Let the existing flee / cleanup / victory logic handle the rest
        if (typeof monitorSiegeEndState === "function") {
            monitorSiegeEndState(player);
        }
    }, 1000);
}

}

function prepareLadderLanding(ladder, wallTileY) {
    let tx = Math.floor(ladder.x / BATTLE_TILE_SIZE);
    
    // Create a 4-wide "landing pad" on the wall that is WALKABLE
    // We use tile '10' instead of '1' so ai_categories.js maintains their "onWall" status!
    for(let x = tx - 2; x <= tx + 2; x++) {
        if(battleEnvironment.grid[x] && battleEnvironment.grid[x][wallTileY] !== undefined) {
            battleEnvironment.grid[x][wallTileY] = 10; 
            battleEnvironment.grid[x][wallTileY - 1] = 10; // Extra depth
        }
    }
}