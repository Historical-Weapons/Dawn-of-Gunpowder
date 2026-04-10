
function getSiegePlazaY() {
    if (!(typeof inSiegeBattle !== 'undefined' && inSiegeBattle)) return null;

    const southGate = (typeof overheadCityGates !== 'undefined')
        ? overheadCityGates.find(g => g.side === "south")
        : null;

    // Plaza center fallback if gate data is missing
    return southGate
        ? (southGate.y * BATTLE_TILE_SIZE) - 450
        : (BATTLE_WORLD_HEIGHT / 2);
}

function isPlazaUnit(baseTemplate, comp) {
    const role = (baseTemplate?.role || "").toLowerCase();
    const type = (comp?.type || "").toLowerCase();

    return (
        baseTemplate?.isLarge === true ||
        role.includes("cavalry") ||
		        role.includes("keshig") ||
						        role.includes("lancer") ||
        role.includes("horse") ||
        type.includes("camel") ||
        type.includes("elephant")
    );
}

function getSiegePlazaOverride({ side, baseTemplate, comp, row, col, spawnXCenter, currentLineXOffset, spacingX }) {
    if (!(typeof inSiegeBattle !== 'undefined' && inSiegeBattle)) return null;

    // --- DEFENDER LOGIC (Keep whatever existing logic you have here) ---
    if (side === "enemy") {
        if (isPlazaUnit(baseTemplate, comp)) {
            let plazaY = getSiegePlazaY()-100;
            let safeX = Math.max(100, Math.min(BATTLE_WORLD_WIDTH - 100, spawnXCenter + currentLineXOffset));
            return { x: safeX, y: plazaY + (row * spacingX) };
        }
    }

    // --- NEW: ATTACKER CAVALRY REAR-GUARD SURGERY ---
    // Force player cavalry to clump at the absolute bottom edge of the map, behind the commander.
    if (side === "player" && isPlazaUnit(baseTemplate, comp)) {
        const bottomEdge = (typeof BATTLE_WORLD_HEIGHT !== 'undefined' ? BATTLE_WORLD_HEIGHT : 1600);
        
        const isCommander = baseTemplate?.isCommander === true;

        // Commander stands 120 pixels from the back edge.
        // Rest of the cavalry is clamped tightly at 40 pixels from the back edge (BEHIND the commander).
        const targetY = bottomEdge - (isCommander ? 120 : 40);

        // Discard the wide 'currentLineXOffset' and clump them tightly behind the center
        // Using modulo math to arrange them into a dense block rather than a long line
        const clumpSpacing = 15; 
        const targetX = spawnXCenter + ((col % 15) - 7) * clumpSpacing;

        return {
            x: targetX,
            y: targetY + (Math.random() * 10) // Tiny organic scatter to prevent exact overlapping
        };
    }

    return null; // Return null so infantry follow normal line-spawning rules
}


// ============================================================================
// FACTION COMPOSITIONS
// ============================================================================

const FACTION_COMPOSITIONS = {
    siege: {
        "Great Khaganate": [
            {type: "Archer", pct: 0.50},
            {type: "Heavy Crossbowman", pct: 0.20},
            {type: "Heavy Two Handed", pct: 0.10},
            {type: "Spearman", pct: 0.15},
            {type: "Shielded Infantry", pct: 0.05}
        ],

        "Dab Tribes": [
            {type: "Shielded Infantry", pct: 0.35},
            {type: "Poison Crossbowman", pct: 0.25},
            {type: "Javelinier", pct: 0.15},
            {type: "Spearman", pct: 0.25}
        ],

        "Hong Dynasty": [
            {type: "Shielded Infantry", pct: 0.30},
            {type: "Heavy Crossbowman", pct: 0.25},
            {type: "Rocket", pct: 0.15},
            {type: "Firelance", pct: 0.05},
            {type: "Repeater Crossbowman", pct: 0.05},
            {type: "Heavy Firelance", pct: 0.05},
            {type: "Bomb", pct: 0.05},
            {type: "Archer", pct: 0.05}
        ],

        "Tran Realm": [
            {type: "Firelance", pct: 0.10},
            {type: "Poison Crossbowman", pct: 0.25},
            {type: "Javelinier", pct: 0.20},
            {type: "Archer", pct: 0.15},
            {type: "Spearman", pct: 0.30}
        ],

        "Jinlord Confederacy": [
            {type: "Archer", pct: 0.20},
            {type: "Heavy Crossbowman", pct: 0.30},
            {type: "Shielded Infantry", pct: 0.20},
            {type: "Hand Cannoneer", pct: 0.15},
            {type: "Heavy Two Handed", pct: 0.10},
            {type: "Spearman", pct: 0.05}
        ],

        "Xiaran Dominion": [
            {type: "Hand Cannoneer", pct: 0.40},
            {type: "Slinger", pct: 0.25},
            {type: "Spearman", pct: 0.20},
            {type: "Shielded Infantry", pct: 0.15}
        ],

        "Goryun Kingdom": [
            {type: "Archer", pct: 0.40},
            {type: "Spearman", pct: 0.20},
            {type: "Shielded Infantry", pct: 0.20},
            {type: "Rocket", pct: 0.10},
            {type: "Hand Cannoneer", pct: 0.05},
            {type: "Repeater Crossbowman", pct: 0.05}
        ],

        "High Plateau Kingdoms": [
            {type: "Slinger", pct: 0.30},
            {type: "Archer", pct: 0.45},
            {type: "Shielded Infantry", pct: 0.25}
        ],

        "Yamato Clans": [
            {type: "Glaiveman", pct: 0.40},
            {type: "Heavy Two Handed", pct: 0.20},
            {type: "Archer", pct: 0.40}
        ],

        "Bandits": [
            {type: "Militia", pct: 0.70},
            {type: "Slinger", pct: 0.15},
            {type: "Javelinier", pct: 0.15}
        ],

        default: [
            {type: "Shielded Infantry", pct: 0.25},
            {type: "Spearman", pct: 0.30},
            {type: "Archer", pct: 0.20},
            {type: "Crossbowman", pct: 0.15},
            {type: "Light Two Handed", pct: 0.10}
        ]
    },

    field: {
        "Great Khaganate": [
            {type: "Horse Archer", pct: 0.50},
            {type: "Heavy Horse Archer", pct: 0.20},
            {type: "Keshig", pct: 0.10},
            {type: "Lancer", pct: 0.15},
            {type: "Heavy Lancer", pct: 0.05}
        ],

        "Dab Tribes": [
            {type: "War Elephant", pct: 0.05},
            {type: "Poison Crossbowman", pct: 0.25},
            {type: "Javelinier", pct: 0.15},
            {type: "Spearman", pct: 0.25},
            {type: "Shielded Infantry", pct: 0.30}
        ],

        "Hong Dynasty": [
            {type: "Shielded Infantry", pct: 0.30},
            {type: "Heavy Crossbowman", pct: 0.25},
            {type: "Rocket", pct: 0.15},
            {type: "Firelance", pct: 0.05},
            {type: "Repeater Crossbowman", pct: 0.05},
            {type: "Heavy Firelance", pct: 0.05},
            {type: "Bomb", pct: 0.05},
            {type: "Archer", pct: 0.05}
        ],

        "Tran Realm": [
            {type: "Firelance", pct: 0.10},
            {type: "Poison Crossbowman", pct: 0.25},
            {type: "Javelinier", pct: 0.20},
            {type: "Archer", pct: 0.15},
            {type: "Spearman", pct: 0.30}
        ],

        "Jinlord Confederacy": [
            {type: "Archer", pct: 0.20},
            {type: "Heavy Crossbowman", pct: 0.30},
            {type: "Shielded Infantry", pct: 0.20},
            {type: "Hand Cannoneer", pct: 0.15},
            {type: "Heavy Lancer", pct: 0.10},
            {type: "Elite Lancer", pct: 0.05}
        ],

        "Xiaran Dominion": [
            {type: "Camel Cannon", pct: 0.20},
            {type: "Hand Cannoneer", pct: 0.20},
            {type: "Slinger", pct: 0.25},
            {type: "Spearman", pct: 0.20},
            {type: "Lancer", pct: 0.15}
        ],

        "Goryun Kingdom": [
            {type: "Archer", pct: 0.40},
            {type: "Spearman", pct: 0.20},
            {type: "Shielded Infantry", pct: 0.20},
            {type: "Rocket", pct: 0.10},
            {type: "Hand Cannoneer", pct: 0.05},
            {type: "Repeater Crossbowman", pct: 0.05}
        ],

        "High Plateau Kingdoms": [
            {type: "Slinger", pct: 0.30},
            {type: "Heavy Horse Archer", pct: 0.20},
            {type: "Archer", pct: 0.25},
            {type: "Shielded Infantry", pct: 0.25}
        ],

        "Yamato Clans": [
            {type: "Glaiveman", pct: 0.40},
            {type: "Heavy Two Handed", pct: 0.20},
            {type: "Archer", pct: 0.30},
            {type: "Heavy Horse Archer", pct: 0.10}
        ],

        "Bandits": [
            {type: "Militia", pct: 0.70},
            {type: "Slinger", pct: 0.15},
            {type: "Javelinier", pct: 0.15}
        ],

        default: [
            {type: "Shielded Infantry", pct: 0.25},
            {type: "Spearman", pct: 0.20},
            {type: "Archer", pct: 0.20},
            {type: "Crossbowman", pct: 0.15},
            {type: "Lancer", pct: 0.10},
            {type: "Light Two Handed", pct: 0.10}
        ]
    }
};

function getFactionComposition(faction, isSiege = false) {
    const rosterSet = isSiege ? FACTION_COMPOSITIONS.siege : FACTION_COMPOSITIONS.field;
    return rosterSet[faction] || rosterSet.default;
}


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
	battleEnvironment.defenderGateDummyStartedAt = Date.now();
	battleEnvironment.defenderGateDummyDisabled = false;	
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

    // ---> NEW: GLOBAL BATTLE SCALE <---
    let totalCombatants = playerTroops + enemyNPC.count;
    window.GLOBAL_BATTLE_SCALE = totalCombatants > 400 ? Math.ceil(totalCombatants / 300) : 1;

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
	let cavCount = 0; 
    battleEnvironment.units.forEach(u => {
        if (u.side === "player" && !u.isCommander) { 
            let checkStr = String((u.stats?.role || "") + " " + (u.unitType || "")).toLowerCase();
            
            // Check if it's a horse/large unit
            if (u.stats?.isLarge || checkStr.match(/(cav|cavalry|keshig|horse|lancer|mount|camel|eleph|knight)/)) {
                
                // --- THE REAR-GUARD ASSIGNMENT ---
                u.siegeRole = "cavalry_reserve"; // This prevents them from swarming ladders
                u.hasOrders = false;             // Stop them from charging the walls immediately
                
                // We DON'T change u.unitType or u.stats
                // They stay exactly as they were in your roster.
                
                cavCount++;
            }
        }
    });

    if (cavCount > 0) {
        console.log(`[SIEGE SYSTEM] Detected ${cavCount} Cavalry units. Moved to Rear-Guard Reserve.`);
    }
	
    // SURGICAL SHIFT: Grab the entire deployed formation and move it up to the Siege Camp
    // Standard deployArmy puts them at BATTLE_WORLD_HEIGHT - 300
    let expectedSpawnY = BATTLE_WORLD_HEIGHT - 300; 
    let shiftY = expectedSpawnY - SiegeTopography.campPixelY+100;

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
        // 1. Wall Parapets (Shifted to stay strictly on/behind the wall)
        for (let y = wallY - 2; y <= wallY; y++) { // <--- CHANGE THIS LINE
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

// ---> SURGERY: Use Global Scale <---
    let visualScale = window.GLOBAL_BATTLE_SCALE || 1; 
    let unitsToSpawn = Math.round(totalTroops / visualScale);

// Inside function deploySiegeDefenders(faction, totalTroops, side, npcRoster)
for (let i = 0; i < unitsToSpawn; i++) {
    let unitType = npcRoster[i % npcRoster.length].type;

// --- SURGERY: NO MOUNTED/LARGE UNITS IN SIEGE (ENEMY) ---
    let checkTemplate = UnitRoster.allUnits[unitType] || UnitRoster.allUnits["Spearman"];
    let checkStr = String((checkTemplate.role || "") + " " + (unitType || "")).toLowerCase();
    
    // ---> Added !checkTemplate.isCommander safeguard <---
    if (!checkTemplate.isCommander && (checkTemplate.isLarge || checkStr.match(/(keshig|horse|lancer|mount|camel|eleph|knight|cav)/))) {
        unitType = "Spearman"; // Force conversion FOR DEFENDERS ONLY
    }

    let baseTemplate = UnitRoster.allUnits[unitType] || UnitRoster.allUnits["Spearman"];
    // ... remainder of the existing stats generation logic ...
        let unitStats = Object.assign(new Troop(baseTemplate.name, baseTemplate.role, baseTemplate.isLarge, faction), baseTemplate);
        unitStats.morale = 25; 
        unitStats.maxMorale = 25;
        
        let spawnSpot = null;
        let isElevated = false;

// --- NEW 85/15 ROLE ASSIGNMENT ---
        let wallRatio = 0.85; // 85% on walls, 15% at gate
        let isWallDefender = (i < unitsToSpawn * wallRatio);
        let currentRole = isWallDefender ? "wall_defender" : "gate_reserve";

        if (isWallDefender && wallTiles.length > 0) {
            spawnSpot = wallTiles.pop();
            isElevated = true;
        } else {
            // SPAWN NEAR SOUTH GATE (RESERVE)
            let gateX = SiegeTopography.gateTileX || Math.floor(BATTLE_COLS / 2);
            let wallY = SiegeTopography.wallTileY;
            
            let yOffset = -12 - Math.random() * 5; // Stay safely behind the wall
            let xOffset = (Math.random() - 0.5) * 200; // Spread horizontally

            spawnSpot = { x: gateX + xOffset, y: wallY + yOffset };
            isElevated = false;
        }
      let finalX = (spawnSpot.x * BATTLE_TILE_SIZE) + ((Math.random() - 0.5) * BATTLE_TILE_SIZE);
        let finalY = (spawnSpot.y * BATTLE_TILE_SIZE) + ((Math.random() - 0.5) * BATTLE_TILE_SIZE);

// =========================================================
        // HARD CLAMP OVERHAUL: Nobody spawns South of the wall line
        // =========================================================
        if (isElevated) {
            // SURGERY: Force defenders 200px North and completely revoke wall status
            finalY = SiegeTopography.wallPixelY - 200 - (Math.random() * 40);
            isElevated = false; 
        } else if (!isElevated && finalY > SiegeTopography.wallPixelY - 200) {
            // Push all ground reserves back to form an organized line
            finalY = SiegeTopography.wallPixelY - 200 - (Math.random() * 40); 
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
            y: finalY-30,
          startX: finalX, // Store original position
            startY: finalY, // Store original position
            siegeRole: currentRole, // Assign the new role
            target: { x: finalX, y: finalY + 50, isDummy: true },
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
siegeEquipment = { rams: [], trebuchets: [], mantlets: [], ladders: [], ballistas: [] };
    
  // --- GATE BREACH CHECK: No siege equipment spawns if gate is already broken ---
    let isGlobalBreach = window.__SIEGE_GATE_BREACHED__ === true;
    
    // FIX: Safely check the localized environment gates first so Custom Battles don't read dead global gates
    let gatePool = (typeof battleEnvironment !== 'undefined' && battleEnvironment.cityGates && battleEnvironment.cityGates.length > 0) 
        ? battleEnvironment.cityGates 
        : (typeof overheadCityGates !== 'undefined' ? overheadCityGates : []);
        
    let southGate = gatePool.find(g => g.side === "south");
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
            x: midX, y: campY + 250, targetGate: southGate, hp: 800, speed: 0.7, isBreaking: false,
            shieldHP: 520, shieldMaxHP: 520, shieldW: 54, shieldH: 28, shieldOffsetX: 0, shieldOffsetY: -52
        });
    }

// --- PLAYER TREBUCHETS ---
    for (let i = -1; i <= 1; i += 2) {
        siegeEquipment.trebuchets.push({
            x: midX + (i * 300), 
            y: campY + 350, 
            hp: 300, 
            cooldown: Math.random() * 100, 
            fireRate: 450,
            side: "player" // <--- Added explicitly
        });
    }

    // --- ENEMY TREBUCHETS (NEW) ---
const TREB_COUNT_PER_SIDE = 2;
const NO_TREB_RADIUS = 200;
const SPACING = 250;

let positions = [];

// Left side (negative direction)
for (let i = 0; i < TREB_COUNT_PER_SIDE; i++) {
    positions.push(midX - NO_TREB_RADIUS - (i + 1) * SPACING);
}

// Right side (positive direction)
for (let i = 0; i < TREB_COUNT_PER_SIDE; i++) {
    positions.push(midX + NO_TREB_RADIUS + (i + 1) * SPACING);
}

// Spawn them
positions.forEach(xPos => {
    siegeEquipment.trebuchets.push({
        x: xPos,
        y: SiegeTopography.wallPixelY - 220,  
        hp: 300,
        cooldown: Math.random() * 100,
        fireRate: 450,
        side: "enemy",
        crewAssigned: []
    });
	
	// ---> NEW: Spawn Ballistas +100px Y with random X offset
    siegeEquipment.ballistas.push({
        x: xPos + ((Math.random() - 0.5) * 160), // Randomness in X
        y: SiegeTopography.wallPixelY - 230 + 150, 
        hp: 200,
        cooldown: Math.random() * 100,
        fireRate: 350,
        side: "enemy",
        crewAssigned: []
    });
	
});
 // --- SURGERY: MANTLET SPREAD & GAP BRIDGING ---
// No manlets in the middle. Wings pushed to extreme left/right.
// Added specific scouts between Ladder 1 & 2 (-240) and Ladder 3 & 4 (240).
const mantletOffsets = [
    // GROUP 1: Extreme Left Wing (Pushed way out)
    -900, -860, -820, -780, -740, -700, -660, -620, -580, -540, 

    // GROUP 2: The "Gap Fillers" (One between each ladder set)
    -240, // Directly between Ladder 1 (-360) and Ladder 2 (-120)
     240, // Directly between Ladder 3 (120) and Ladder 4 (360)

    // GROUP 3: Extreme Right Wing (Pushed way out)
    540, 580, 620, 660, 700, 740, 780, 820, 860, 900
];

mantletOffsets.forEach(offsetX => {
    let baseX = midX + offsetX;
    let baseY = campY - 182;

    // Natural Randomness: Kept ±6px for that hand-placed look
    let randomOffsetX = (Math.random() - 0.5) * 12; 
    let randomOffsetY = (Math.random() - 0.5) * 80; 

    siegeEquipment.mantlets.push({
        x: baseX + randomOffsetX,
        y: baseY + randomOffsetY,
        hp: 1000
    });
});
for (let i = -3; i <= 3; i += 2) {

    // Base spacing
    let baseX = midX + (i * 120);
    let baseY = campY + 180;

    // 5% positional randomness (based on 120 spacing)
    let randomOffsetX = (Math.random() - 0.5) * 120 * 0.05; // ±3 px
    let randomOffsetY = (Math.random() - 0.5) * 120 * 0.05; // ±3 px

    siegeEquipment.ladders.push({
        x: baseX + randomOffsetX,
        y: baseY + randomOffsetY,
        carriedBy: null,
        isDeployed: false,
        hp: 400
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
                            
                            // NEW SURGERY: Slide towards the ladder if assigned, otherwise slide to gate
                            if (u.target && u.target.isLadderAssault) {
                                let dirX = (u.target.x > u.x) ? 1 : -1;
                                u.x += dirX * 1.8;
                            } else {
                                let dirX = (SiegeTopography.gatePixelX > u.x) ? 1 : -1;
                                u.x += dirX * 1.8; 
                            }
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
        const ramSpeed = ram.speed || ram.stats?.speed || 0.6;

        const isGateBroken = !ram.targetGate || ram.targetGate.gateHP <= 0 || window.__SIEGE_GATE_BREACHED__;
        
        if (!isGateBroken) {
            if (ram.y > exactGateY+30) {
                ram.state = "moving_to_gate";
                ram.isBreaking = false;
                ram.y -= ramSpeed; 
            } else {
                ram.y = exactGateY+30; 
                ram.state = "attacking_gate";
                ram.isBreaking = true;
                
                if (Math.random() > 0.99) { 
                    ram.targetGate.gateHP -= 35; 
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

// SURGERY: Move ladder 20 pixels further forward before deploying
        let targetPixelY = SiegeTopography.wallPixelY - 5;
        const LADDER_SPEED = 0.67;
        
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
        let fallbackCrew = playerUnits.filter(u => u.orderType !== "ladder_crew" && u.siegeRole !== "ladder_fanatic" && !u.onWall && Math.hypot(u.x - ladder.x, u.y - ladder.y) < 60 && !u.stats?.isRanged);
		 
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

// ============================================================================
    // TREBUCHET LOGIC & CREW AI MANAGER
    // ============================================================================
    siegeEquipment.trebuchets.forEach(treb => {
        if (treb.hp <= 0) return;

        let isEnemyTreb = treb.side === "enemy";
        let poolToDrawFrom = isEnemyTreb ? allAliveEnemies : playerUnits;
        
        // SURGERY: Allow player trebs to bombard the plaza/units if the wall is completely empty
        let targetPool = isEnemyTreb ? playerUnits : (wallEnemies.length > 0 ? wallEnemies : allAliveEnemies);
        let requiredCrew = isEnemyTreb ? 2 : 3; 

        // --- UNIVERSAL CREW AI REPLENISHMENT ---
        // 1. Purge dead crew members from the assigned list
        treb.crewAssigned = (treb.crewAssigned || []).filter(id => {
            let u = poolToDrawFrom.find(e => e.id === id);
            return u && u.hp > 0;
        });
// 2. Draft new crew if we fall below the required threshold (Now applies to BOTH sides)
        while (treb.crewAssigned.length < requiredCrew) {
            let availableRecruits = poolToDrawFrom.filter(u => 
                !u.isCommander && 
                u.siegeRole !== "treb_crew" && 
                canUseSiegeEngines(u) && 
                // ---> SURGERY 3: Bypass the target distance restriction for enemy defenders!
                (u.side === "enemy" || !u.target || u.target.isDummy || Math.hypot(u.x - u.target.x, u.y - u.target.y) > 150)
            );
            if (availableRecruits.length > 0) {
                let closest = availableRecruits.reduce((prev, curr) => 
                    Math.hypot(curr.x - treb.x, curr.y - treb.y) < Math.hypot(prev.x - treb.x, prev.y - treb.y) ? curr : prev
                );
                
                treb.crewAssigned.push(closest.id);
                closest.siegeRole = "treb_crew";
                closest.disableAICombat = true; 
            } else {
                break; 
            }
        }

// 3. Issue strict movement orders to the assigned crew
        treb.crewAssigned.forEach(id => {
            let u = poolToDrawFrom.find(e => e.id === id);
            if (u) {
                // SURGERY: Force enemy crews to the absolute North side (traction cords)
                let targetY = isEnemyTreb 
                    ? treb.y - 45 - (Math.random() * 15) 
                    : treb.y - 25 - (Math.random() * 15);

                u.target = { 
                    x: treb.x + ((Math.random() - 0.5) * 40), 
                    y: targetY, 
                    isDummy: true 
                };
                u.state = "moving";
                u.hasOrders = true;
            }
        });

        // --- FIRING EXECUTION ---
        let physicallyPresentCrew = poolToDrawFrom.filter(u => Math.hypot(u.x - treb.x, u.y - treb.y) < 80);
        
        if (physicallyPresentCrew.length >= requiredCrew) {
            treb.cooldown--;
            treb.isManned = true; 
        } else {
            treb.isManned = false;
            return; 
        }
        
        if (treb.cooldown <= 0 && targetPool.length > 0) {
            // ... (Keep the rest of your projectile spawning code the exact same)
            treb.cooldown = treb.fireRate;
            let target = targetPool[Math.floor(Math.random() * targetPool.length)];
            
            let dx = target.x - treb.x;
            let dy = target.y - treb.y;
            let dist = Math.hypot(dx, dy);
            let speed = 6;

battleEnvironment.projectiles.push({
                x: treb.x, y: treb.y,
                vx: (dx / dist) * speed, vy: (dy / dist) * speed,
                startX: treb.x, startY: treb.y,
                maxRange: 3500,
                attackerStats: { 
                    role: "bomb", 
                    missileAPDamage: 15, 
                    missileBaseDamage: 35, 
                    name: "Trebuchet Boulder",
                    currentStance: "statusrange", // <--- THE CRITICAL FIX
                    isRanged: true                // <--- Safety fallback
                },
                side: treb.side,
                projectileType: "bomb", 
                isFire: false
            });
            
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('bomb'); 
        }
    });
	
	
	// ============================================================================
    // BALLISTA LOGIC & 1-MAN CREW AI
    // ============================================================================
    siegeEquipment.ballistas.forEach(bal => {
        if (bal.hp <= 0) return;

        let poolToDrawFrom = allAliveEnemies;
        let targetPool = playerUnits;
        let requiredCrew = 1; 

        // 1. Purge dead crew members
        bal.crewAssigned = (bal.crewAssigned || []).filter(id => {
            let u = poolToDrawFrom.find(e => e.id === id);
            return u && u.hp > 0;
        });

        // 2. Draft new crew if empty
        while (bal.crewAssigned.length < requiredCrew) {
            let availableRecruits = poolToDrawFrom.filter(u => 
                !u.isCommander && !u.siegeRole.includes("crew") && canUseSiegeEngines(u)
            );
            if (availableRecruits.length > 0) {
                let closest = availableRecruits.reduce((prev, curr) => 
                    Math.hypot(curr.x - bal.x, curr.y - bal.y) < Math.hypot(prev.x - bal.x, prev.y - bal.y) ? curr : prev
                );
                bal.crewAssigned.push(closest.id);
                closest.siegeRole = "ballista_crew";
                closest.disableAICombat = true; 
            } else break; 
        }

        // 3. Move crew to the Ballista
        bal.crewAssigned.forEach(id => {
            let u = poolToDrawFrom.find(e => e.id === id);
            if (u) {
                u.target = { x: bal.x, y: bal.y - 20, isDummy: true };
                u.state = "moving";
                u.hasOrders = true;
            }
        });

        // 4. Firing Execution
        let physicallyPresentCrew = poolToDrawFrom.filter(u => Math.hypot(u.x - bal.x, u.y - bal.y) < 40);
        
        if (physicallyPresentCrew.length >= requiredCrew) {
            bal.cooldown--;
            bal.isManned = true; 
        } else {
            bal.isManned = false;
            return; 
        }
        
        if (bal.cooldown <= 0 && targetPool.length > 0) {
            bal.cooldown = bal.fireRate;
            
            // Ballistas aim for the closest target for accuracy
            let target = targetPool.reduce((prev, curr) => 
                Math.hypot(curr.x - bal.x, curr.y - bal.y) < Math.hypot(prev.x - bal.x, prev.y - bal.y) ? curr : prev
            );
            
            let dx = target.x - bal.x;
            let dy = target.y - bal.y;
            let dist = Math.hypot(dx, dy);
            let speed = 16; // Fast projectile

            battleEnvironment.projectiles.push({
                x: bal.x, y: bal.y,
                vx: (dx / dist) * speed, vy: (dy / dist) * speed,
                startX: bal.x, startY: bal.y,
                maxRange: 1500,
                attackerStats: { 
                    role: "crossbowman", 
                    missileAPDamage: 120, // Ballistas pierce armor easily
                    missileBaseDamage: 50, 
                    name: "Crossbowman", // Tricks your renderer into drawing a heavy bolt
                    currentStance: "statusrange",
                    isRanged: true                
                },
                side: bal.side,
                projectileType: "bolt", 
                isFire: false
            });
            
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('arrow'); 
        }
    });
	
	
	// ============================================================================
// 2. DEFENDER AI (ENEMY)
// ============================================================================
if (siegeAITick % 6 === 0) {
    allAliveEnemies.forEach(u => {
        
        if (u.siegeRole === "treb_crew") return;
        
        let roleStr = String((u.stats?.role || "") + " " + (u.unitType || "") + " " + (u.stats?.name || "")).toLowerCase();
        let isLarge = u.stats?.isLarge || roleStr.match(/(cav|horse|mount|camel|eleph)/);

        // ---> PIN WALL DEFENDERS TO THEIR POSTS (Upgraded Aggro) <---
        if (u.siegeRole === "wall_defender") {
            let localThreats = battleEnvironment.units.filter(p => 
                p.side === "player" && p.hp > 0 && 
                Math.hypot(p.x - u.x, p.y - u.y) < 250
            );
            
            if (localThreats.length === 0) {
                let distToStart = Math.hypot(u.startX - u.x, u.startY - u.y);
                if (distToStart > 10) {
                    u.target = { x: u.startX, y: u.startY, isDummy: true }; 
                    u.state = "moving";
                } else {
                    u.state = "idle";
                }
                u.hasOrders = true; 
                return; 
            }
        }

        // ---> HOLD RESERVE UNTIL BREACH <---
        if (u.siegeRole === "gate_reserve") {
            let southGate = overheadCityGates.find(g => g.side === "south");
            if (southGate && !southGate.isOpen && southGate.gateHP > 200) {
                let emergencyThreat = playerUnits.find(p => Math.hypot(p.x - u.x, p.y - u.y) < 100);
                if (!emergencyThreat) {
                    u.target = { x: u.startX, y: u.startY, isDummy: true };
                    u.hasOrders = true;
                    return;
                }
            }
        }

        if (!isGateBreached) {
            // GATE INTACT
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
                // ---> NEW SURGERY: WIDE PATROL & PROXIMITY AGGRO <---
                let attackRange = isSiegeRangedDefender(u) ? (u.stats.range || 400) : 50;
                let closestAttacker = null;
                let minDist = Infinity;
                
                // 1. Scan for nearby enemies to aggro
                for (let i = 0; i < playerUnits.length; i++) {
                    let attacker = playerUnits[i];
                    let dist = Math.hypot(u.x - attacker.x, u.y - attacker.y);
                    if (dist < minDist) { minDist = dist; closestAttacker = attacker; }
                }

                // 2. If an enemy is within range, attack immediately
                if (closestAttacker && minDist <= attackRange) {
                    u.target = closestAttacker;
                    u.state = "attacking";
                    u.hasOrders = true;
                } 
                // 3. Otherwise, perform a wide patrol behind the wall
                else {
                    let isPatrolling = (u.state === "moving" && u.target && u.target.isDummy);
                    
                    if (u.state === "idle" || !u.hasOrders || !isPatrolling) {
                        // Spread out across 80% of the map width, and varying depths behind the wall
                        let spreadWidth = BATTLE_WORLD_WIDTH * 0.8;
                        let targetX = (BATTLE_WORLD_WIDTH / 2) + ((Math.random() - 0.5) * spreadWidth);
                        let targetY = SiegeTopography.wallPixelY - 150 - (Math.random() * 400); // Deep patrol depth

                        u.target = { x: targetX, y: targetY, isDummy: true };
                        u.state = "moving";
                        u.hasOrders = true;
                    } else {
                        // Stop moving once they reach their random patrol waypoint
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
		}}
		else {
            // GATE IS BROKEN: FALLBACK TO PLAZA OR ATTACK
            let plazaX = SiegeTopography.gatePixelX; 
            let plazaY = SiegeTopography.plazaPixelY;
            let distToPlaza = Math.hypot(plazaX - u.x, plazaY - u.y);

            // ---> LARGE UNITS EARLY PLAZA RETURN <---
            if (isLarge && distToPlaza > 150) {
                // Force cavalry/elephants out of the gate choke point immediately
                u.target = {
                    x: plazaX + (Math.random() - 0.5) * 400, 
                    y: plazaY + (Math.random() - 0.5) * 200, 
                    isDummy: true
                };
                u.state = "moving";
                u.hasOrders = true;
            } else {
                // Standard Infantry Aggro / Hysteresis
                let closestAttacker = null;
                let minDist = Infinity;
                
                let currentTargetDist = (u.target && !u.target.isDummy && u.target.hp > 0) 
                    ? Math.hypot(u.x - u.target.x, u.y - u.target.y) 
                    : Infinity;
                
                for (let i = 0; i < playerUnits.length; i++) {
                    let attacker = playerUnits[i];
                    let dist = Math.hypot(u.x - attacker.x, u.y - attacker.y);
                    if (dist < minDist) { minDist = dist; closestAttacker = attacker; }
                }

                let stickToCurrentTarget = (currentTargetDist < minDist + 40) && currentTargetDist < 300;

                if (stickToCurrentTarget) {
                    u.state = "attacking"; 
                } else if (closestAttacker && minDist < 400) { 
                    u.target = closestAttacker; 
                    u.state = "moving";
                    u.hasOrders = true;
                } else if (distToPlaza > 250 && !u.onWall) {
                    u.target = {
                        x: plazaX + (Math.random() - 0.5) * 350, 
                        y: plazaY + (Math.random() - 0.5) * 200, 
                        isDummy: true
                    };
                    u.state = "moving";
                    u.hasOrders = true;
                } else if (u.state === "idle" || !u.hasOrders) {
                    u.target = { x: u.x + (Math.random() - 0.5) * 20, y: u.y + (Math.random() - 0.5) * 20, isDummy: true };
                    u.state = "idle";
                    u.hasOrders = true;
                }
            }
        }

        // ========================================================================
        // ---> ABSOLUTE LAVA OVERRIDE (NEVER WALK SOUTH OF THIS LINE) <---
        // ========================================================================
        let lavaBoundaryY = SiegeTopography.gatePixelY + 5; // <<<<<<< TWEAK BUFFER HERE

        // 1. If the unit physically falls off or gets pushed past the line, scramble back inside
        if (u.y > lavaBoundaryY) {
            u.target = { x: u.x, y: lavaBoundaryY - 40, isDummy: true };
            u.state = "moving";
            u.hasOrders = true;
        } 
        // 2. If their target is past the line, intercept their movement
        else if (u.target && u.target.y > lavaBoundaryY) {
            let isRanged = roleStr.includes("ranged") || roleStr.includes("archer");
            
            if (isRanged) {
                // Ranged units keep their target so they can shoot down, but we kill their velocity at the edge
                if (u.y > lavaBoundaryY - 20) {
                    u.state = "idle";
                    u.vx = 0; 
                    u.vy = 0;
                }
            } else {
                // Melee units must abandon the target and hold the line at the edge
                u.target = { x: u.target.x, y: lavaBoundaryY - 15, isDummy: true };
                if (u.state === "attacking") u.state = "moving";
                u.hasOrders = true;
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
        if (u.state === "attacking" && u.target && !u.target.isDummy && u.target.hp > 0) return; // Prevent target hesitation
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
            
            // Hysteresis calculation for attackers
            let currentTargetDist = (u.target && !u.target.isDummy && u.target.hp > 0) 
                ? Math.hypot(u.x - u.target.x, u.y - u.target.y) 
                : Infinity;
            
            for (let i = 0; i < allAliveEnemies.length; i++) {
                let enemy = allAliveEnemies[i];
                let dist = Math.hypot(u.x - enemy.x, u.y - enemy.y);
                if (dist < minDist) { minDist = dist; closestEnemy = enemy; }
            }
            
            let switchTarget = minDist < (currentTargetDist - 30); // Need strong reason to switch

            if (isRanged) {
                // Ensure they never get stuck in forced melee mode
                u.forceMelee = false;
                let attackRange = u.stats.range || 150; // Fallback range if undefined

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

                    // 1. If an enemy is in range, prioritize targeting them directly (stay at a distance)
                    if (closestEnemy && minDist <= attackRange) {
                        if (switchTarget || !u.target || u.target.isDummy) {
                            u.target = closestEnemy;
                            u.state = "moving";
                            u.hasOrders = true;
                        }
                    }
                    // 2. If out of range, move to the breach to get inside/get line of sight (Remaining Ranged)
                    else if (bestEntry && minEntryDist > 80) {
                        u.target = { x: bestEntry.x, y: bestEntry.y, isDummy: true };
                        u.state = "moving";
                        u.hasOrders = true;
                    } 
                    // 3. Otherwise, track the closest enemy
                    else if (closestEnemy && minDist > 35 && (switchTarget || u.target.isDummy)) {
                        u.target = closestEnemy;
                        u.state = "moving";
                        u.hasOrders = true;
                    }
                } else {
                    if (closestEnemy && (switchTarget || !u.target || u.target.isDummy)) { 
                        u.target = closestEnemy; 
                        u.state = "moving"; 
                        u.hasOrders = true; 
                    }
                }
            } else {
                // Melee post-breach logic
                if (closestEnemy && minDist > 35 && (switchTarget || !u.target || u.target.isDummy)) {
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
                // Completely freeze them until the breach. 
                // ai_categories.js will guide them to the back line, this kills the vibrating slide.
                u.vx = 0;
                u.vy = 0;
                u.state = "idle";
                u.hasOrders = true;
                return; // Abort further targeting logic so they stay perfectly still
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
                // Pre-breach ranged behavior (unchanged, works as intended)
                u.forceMelee = false; // Added safeguard

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
                        // ---> SURGERY 4A: Send short-ranged Firelances/Bombs to the front line!
                        let isShortRange = roleStr.includes("firelance") || roleStr.includes("bomb") || roleStr.includes("hand cannoneer");
                        if (isShortRange) {
                            u.target = { x: gateX + ((Math.random() - 0.5) * 200), y: wallY + 80 + (Math.random() * 40), isDummy: true };
                        } else {
                            // Standard archers stay back
                            u.target = { x: gateX + ((index % 20) - 10) * 45, y: wallY + 280 + (Math.floor(index / 20) * 35), isDummy: true };
                        }
                        u.state = "moving";
                        u.hasOrders = true;
                    }
                }
            } else {
                // Melee pre-breach logic
            let availableLadders = typeof activeLadders !== "undefined" ? activeLadders : siegeEquipment.ladders.filter(l => l.isDeployed && l.hp > 0);
                
                if (availableLadders.length > 0 && canUseSiegeEngines(u)) {
                    let bestLadder = availableLadders.reduce((prev, curr) => 
                        Math.hypot(curr.x - u.x, curr.y - u.y) < Math.hypot(prev.x - u.x, prev.y - u.y) ? curr : prev
                    );
                    // ---> SURGERY 1B: Drive them DEEP into the ladder so they hit Tile 9
                    u.target = { x: bestLadder.x, y: bestLadder.y - 15, isDummy: true };
                    u.state = "moving";
                    u.hasOrders = true;
                } else if (u.state === "idle" || !u.hasOrders || (u.target && u.target.isDummy && u.target.y > wallY + 150)) {
                    // Aggressive Gate Funneling (Only if no ladders to climb)
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

    // ---> SURGERY 1: Paint the ladder deep into the dirt (y + 6) so ground troops can actually step on it!
    for (let x = tileX - 2; x <= tileX + 2; x++) {
        for (let y = tileY - 8; y <= tileY + 6; y++) {
            if (battleEnvironment.grid[x] && battleEnvironment.grid[x][y] !== undefined) {
                battleEnvironment.grid[x][y] = 9; // 9 = Ladder Tile
            }
        }
    }

    if (typeof cityLadders !== 'undefined') {
        cityLadders.push({ x: ladder.x, y: ladder.y - 20 });
    }

    // SURGERY: Remove the '- 20' offset so it carves the TRUE outer lip of the wall
    let wallTileY = Math.floor(SiegeTopography.wallPixelY / BATTLE_TILE_SIZE); 
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
        // SURGERY: Make the bridge 20 pixels longer (from 30 to 50) to ensure units cross
        ctx.fillRect(-18, -50, 36, 50); 
        ctx.strokeRect(-18, -50, 36, 50);

        // Ramp Rungs
        ctx.strokeStyle = "#2a1b16";
        for(let r = -45; r < 0; r += 5) {
            ctx.beginPath();
            ctx.moveTo(-18, r); ctx.lineTo(18, r);
            ctx.stroke();
        }

        // --- THE STRINGS (CHAINS) ---
        ctx.restore(); 
        
        ctx.strokeStyle = "#999999"; 
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        // Left Chain
        ctx.moveTo(-18, 20);  
        ctx.lineTo(-18, -95); // Adjusted for the extra 20px length
        
        // Right Chain
        ctx.moveTo(18, 20);   
        ctx.lineTo(18, -95);
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
// 477 creates a full cycle every 3 seconds
let cycle = Math.sin(Date.now() / 477); 

// Raising to the power of 9 makes the 'wait' even longer/flatter
// We use Math.max(0, ...) so it only lunges forward and doesn't pull back into the roof
let lunge = r.isBreaking ? Math.max(0, Math.pow(cycle, 9)) * 25 : 0;
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

// ---> SURGERY: FLIP 180 DEGREES FOR ENEMY <---
    // This perfectly inverts the local space, making them face and fire South
    if (t.side === "enemy") {
        ctx.rotate(Math.PI);
    }
	
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
    ctx.strokeStyle = "#ffffff"; 
    ctx.lineWidth = 1.1;
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

// ============================================================================
    // --- TRACTION CREW PULLING PORTION (NORTH END) ---
    // ============================================================================
    
    // 1. Calculate the "Short Arm" Tip
    let shortArmTipX = -tipX * 0.35;
    let shortArmTipY = -tipY * 0.35;

    // 2. REVISED DIMENSIONS: Bringing the crew back toward the chassis
    // groundY: -66 -> -36 (Closer to the machine/troops)
    let groundY = -36; 
    let ropeFannedWidth = 10; 

    // Draw the Short Arm beam extension
    ctx.strokeStyle = "#4e342e"; 
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0); 
    ctx.lineTo(shortArmTipX, shortArmTipY);
    ctx.stroke();

   // ... (Keep your Short Arm Tip and groundY logic the same)

    // Draw the Pulling Ropes
    ctx.strokeStyle = "#d7ccc8"; 
    ctx.lineWidth = 0.35; 
    
    for (let i = 0; i < 5; i++) {
        let fanX = -ropeFannedWidth / 2 + (i * (ropeFannedWidth / 4));
        
        ctx.beginPath();
        ctx.moveTo(shortArmTipX, shortArmTipY);
        
        // --- NEW: Calculate distance to prevent the "Oval Loop" ---
        let dx = fanX - shortArmTipX;
        let dy = groundY - shortArmTipY;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (!isFiring) {
            // LOADED: Saggy Logic
            let midX = (shortArmTipX + fanX) / 2;
            let midY = (shortArmTipY + groundY) / 2;
            
            // Only add sag if the rope is long enough to sag
            let sagAmount = dist > 10 ? 12 : 0; 

            ctx.quadraticCurveTo(midX, midY + sagAmount, fanX, groundY);
        } else {
            // FIRING: Tension Jitter
            // --- FIX: We scale the jitter by the distance ---
            // If dist is small (arm is passing the crew), jitter becomes 0.
            let jitterStrength = Math.min(1.5, dist / 20); 
            let jitterX = (Math.random() - 0.5) * jitterStrength;
            let jitterY = (Math.random() - 0.5) * jitterStrength;

            // If the points are extremely close, just use lineTo to avoid Bezier loops
            if (dist < 5) {
                ctx.lineTo(fanX, groundY);
            } else {
                ctx.quadraticCurveTo(
                    ((shortArmTipX + fanX) / 2) + jitterX, 
                    ((shortArmTipY + groundY) / 2) + jitterY, 
                    fanX, 
                    groundY
                );
            }
        }
        ctx.stroke();
    
    }

    // Optional: Small dust/tension marks at the ground points during firing
    if (isFiring && throwPhase < 0.5) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.ellipse(0, groundY, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
});

// ============================================================================
// BALLISTA RENDERING (BIRDS-EYE)
// ============================================================================
siegeEquipment.ballistas.forEach(bal => {
    if (bal.hp <= 0) return;
    ctx.save();
    ctx.translate(bal.x, bal.y);

    if (bal.side === "enemy") {
        ctx.rotate(Math.PI); // Invert 180 degrees to face South
    }

    // Determine state (True if snapped forward / just fired)
    const isFired = bal.cooldown > bal.fireRate - 15;
    
    // --- 1. RESILIENT SEED GENERATION FOR BALLISTA TYPE ---
    let seed = 0;
    if (bal.id !== undefined && bal.id !== null) {
        if (typeof bal.id === 'number') {
            seed = Math.abs(bal.id);
        } else if (typeof bal.id === 'string') {
            for (let i = 0; i < bal.id.length; i++) {
                seed += bal.id.charCodeAt(i);
            }
        }
    } else {
        // Fallback permanent random seed to prevent flickering
        if (typeof bal._typeSeed === 'undefined') {
            bal._typeSeed = Math.floor(Math.random() * 1000);
        }
        seed = bal._typeSeed;
    }

    const availableTypes = ["single", "double", "m-type", "d-type"];
    // If it has a valid type assigned, keep it. Otherwise, use the seed.
    const ballistaType = (bal.type && availableTypes.includes(bal.type)) ? bal.type : availableTypes[seed % availableTypes.length];

    // --- 2. 2/3 SCALED BASE & STOCK ---
    ctx.fillStyle = "#3e2723"; // Dark heavy wood base
    ctx.fillRect(-10, -8, 20, 16); 
    
    ctx.fillStyle = "#4e342e"; // Main central stock
    ctx.fillRect(-4, -23, 8, 40);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.strokeRect(-4, -23, 8, 40);

    // Iron mounting beams and Winch mechanism at the rear
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-9, -7, 18, 4);  // Main mounting crossbeam
    ctx.fillRect(-7, 10, 14, 5);  // Rear winch housing
    ctx.fillStyle = "#5c5c5c";
    ctx.fillRect(-3, 9, 6, 8);    // Spool / Latch

    // --- 3. HELPER FUNCTION: LONGER BOWS, LESS TENSION ---
    const drawBowLayer = (yOffset, thickness, woodColor, isComposite, isInverted = false) => {
        ctx.strokeStyle = "#c0baba"; // Hemp string color
        ctx.lineWidth = 1.0; 
        ctx.beginPath();
        
        // Much wider span relative to the new 2/3 scale body
        const spanX = 36; 
        const drawX = 28; 
        const latchY = 10; // Scaled down latch position

        if (isInverted) {
            // INVERTED BOW STRING (Faces rear operator)
            if (isFired) {
                ctx.moveTo(-spanX, 9 + yOffset);
                ctx.lineTo(spanX, 9 + yOffset);
            } else {
                ctx.moveTo(-drawX, 3 + yOffset);
                ctx.lineTo(0, latchY); // Pulled back to latch
                ctx.lineTo(drawX, 3 + yOffset);
            }
        } else {
            // STANDARD BOW STRING (Faces forward)
            if (isFired) {
                ctx.moveTo(-spanX, -3 + yOffset);
                ctx.lineTo(spanX, -3 + yOffset);
            } else {
                ctx.moveTo(-drawX, 5 + yOffset);
                ctx.lineTo(0, latchY); // Pulled back to latch
                ctx.lineTo(drawX, 5 + yOffset);
            }
        }
        ctx.stroke();

        // Bow Limbs
        ctx.strokeStyle = woodColor;
        ctx.lineWidth = thickness * 0.66; // Scaled down limb thickness
        ctx.lineCap = "round";
        ctx.beginPath();
        
        if (isInverted) {
            // INVERTED BOW SHAPE
            let flexY = -3 + yOffset;
            if (isFired) {
                ctx.moveTo(-spanX, 9 + yOffset);
                ctx.quadraticCurveTo(0, flexY, spanX, 9 + yOffset);
            } else {
                ctx.moveTo(-drawX, 3 + yOffset);
                ctx.quadraticCurveTo(0, flexY, drawX, 3 + yOffset);
            }
        } else if (isComposite) {
            // M-SHAPE RECURVE (Gentler curves)
            let flexY = -3 + yOffset;
            let peakY = isFired ? -16 + yOffset : -12 + yOffset; 
            if (isFired) {
                ctx.moveTo(-spanX, -3 + yOffset);
                ctx.bezierCurveTo(-18, peakY, -8, flexY, 0, -10 + yOffset);
                ctx.bezierCurveTo(8, flexY, 18, peakY, spanX, -3 + yOffset);
            } else {
                ctx.moveTo(-drawX, 5 + yOffset);
                ctx.bezierCurveTo(-15, peakY, -8, flexY, 0, -10 + yOffset);
                ctx.bezierCurveTo(8, flexY, 15, peakY, drawX, 5 + yOffset);
            }
        } else {
            // STANDARD D-SHAPE (Drastically reduced tension)
            let flexY = isFired ? -18 + yOffset : -20 + yOffset; 
            if (isFired) {
                ctx.moveTo(-spanX, -3 + yOffset);
                ctx.quadraticCurveTo(0, flexY, spanX, -3 + yOffset);
            } else {
                ctx.moveTo(-drawX, 5 + yOffset);
                ctx.quadraticCurveTo(0, flexY, drawX, 5 + yOffset);
            }
        }
        ctx.stroke();
    };

    // --- 4. RENDER SPECIFIC BALLISTA TYPES ---
    // Scaled Y-offsets for the double-bow
    switch (ballistaType) {
        case "single":
            drawBowLayer(0, 6, "#5d4037", false, false);
            break;
            
        case "double":
            drawBowLayer(-6, 5, "#4e342e", false, false); // Front bow
            drawBowLayer(4, 5, "#5d4037", false, true);   // Rear bow
            break;
            
        case "m-type":
            drawBowLayer(0, 7, "#2c2c2c", true, false); 
            break;
            
        case "d-type":
            drawBowLayer(0, 8, "#8d6e63", false, false); 
            break;
    }

    // --- 5. THE LOADED BOLT (TINY ARROWHEAD, 2/3 SCALE SHAFT) ---
    if (!isFired) {
        // Tiny Iron Tip
        ctx.fillStyle = "#a0a0a0"; 
        ctx.beginPath();
        ctx.moveTo(0, -28); // Tip
        ctx.lineTo(-1.5, -22); // Ultra-narrow base
        ctx.lineTo(1.5, -22);
        ctx.fill();
        
        // Heavy Wooden shaft
        ctx.fillStyle = "#3e2723"; 
        ctx.fillRect(-1, -22, 2, 28); // Narrower, shorter shaft

        // Small Fletchings
        ctx.fillStyle = "#8b0000"; 
        ctx.fillRect(-2, 2, 1, 4);
        ctx.fillRect(1, 2, 1, 4);
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

function concludeSiegeBattlefield(playerObj, forceVictory = false) {
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
    let didPlayerWin = forceVictory || eUnitsAlive <5;
    let city = currentSiegeCity;
 
    
    // SURGERY: Hard block campaign logic if this is a Custom Battle
    if (!city) {
        console.log("Custom Siege Concluded. Bypassing Campaign Logic.");
        if (typeof window.leaveBattlefield === 'function') window.leaveBattlefield(playerObj);
        return;
    }

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
            
        // ---> SURGERY: Use the accurate global scale to reconstruct the city garrison <---
        let scale = window.GLOBAL_BATTLE_SCALE || 1;
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
	    battleEnvironment.groundEffects = [];
}

function monitorSiegeEndState(playerObj) { //obsolete
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

// 2. Retreat Defenders & Rush Attackers
    if (battleEnvironment.units) {
        battleEnvironment.units.forEach(u => {
            
           // --- SURGERY: ALL PLAYER UNITS RUSH THE PLAZA (STAGE 1 FUNNEL) ---
            if (u.side === "player" && !u.isCommander) {
                // MANDATORY EXCEPTION: Ladder fanatics keep swarming the walls!
                if (u.siegeRole !== "ladder_fanatic") {
                    u.hasOrders = true;
                    u.orderType = "siege_assault"; 
                    u.siegeRole = "assault_complete"; // Forces them to drop rams
                    u.target = null; // Clears current distractions
                    
                    let gateX = typeof SiegeTopography !== 'undefined' ? SiegeTopography.gatePixelX : 1200;
                    let gateY = typeof SiegeTopography !== 'undefined' ? SiegeTopography.gatePixelY : 2000;
                    
                    // Immediately point them strictly at the gate centroid
                    u.orderTargetPoint = { 
                        x: gateX + (Math.random() - 0.5) * 80, // Tight spread to force the funnel
                        y: gateY - 20 // Pulls them across the threshold
                    };
                }
            }
            
            if (u.side === "enemy") u.retreatToPlaza = true;
        });
    }
// 3. Obliterate Collision Grid (Set to 1 / Road)
    const bounds = gate.bounds;
    if (bounds && battleEnvironment.grid) {
        for (let x = bounds.x0; x <= bounds.x1; x++) {
            // SURGERY: Identify the outer edges (Pillars) and protect them
            let isPillar = (x === bounds.x0 || x === bounds.x1);
            
            for (let y = bounds.y0; y <= bounds.y1; y++) {
                if (!isPillar && battleEnvironment.grid[x]?.[y] !== undefined) {
                    battleEnvironment.grid[x][y] = 1; // Only make the middle walkable
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

        // 1. Force state reset so the engine stops trying to run siege AI
        inSiegeBattle = false; 
        if (typeof inBattleMode !== 'undefined') inBattleMode = false;

        battleEnvironment.units.forEach(u => {
            if (u.side === "enemy" && u.hp > 0) {
                u.state = "FLEEING";
                u.target = null;
                u.retreatToPlaza = true;
            }
        });

// 2.1. Check the global flag
// 2.2. Check if the city object is totally missing
// 2.3. Check if the city object is a "Dummy" (missing campaign stats like militaryPop)
const isCustom = window.__CUSTOM_BATTLE_MODE__ || 
                 !currentSiegeCity || 
                 (currentSiegeCity && typeof currentSiegeCity.militaryPop === 'undefined');

console.log(`[SIEGE SYSTEM] Battle Mode Detected: ${isCustom ? "CUSTOM" : "CAMPAIGN"}`);
if (isCustom) {
    console.log("Cleaning up Custom Siege Battle...");

    // SNAPSHOT THE FINAL SIEGE STATE BEFORE CLEARING ANYTHING
    window.__CUSTOM_SIEGE_RESULT__ = "victory";
    window.__CUSTOM_SIEGE_COUNTS__ = {
        pAlive: battleEnvironment.units.filter(u => u.side === "player" && u.hp > 0).length,
        eAlive: battleEnvironment.units.filter(u => u.side === "enemy" && u.hp > 0).length
    };

    // Clear runtime objects
    battleEnvironment.units = [];
    battleEnvironment.projectiles = [];
    battleEnvironment.groundEffects = [];

    // Trigger the UI menu return cleanly
    if (typeof window.leaveBattlefield === 'function') {
        window.leaveBattlefield(typeof player !== 'undefined' ? player : null);
    }
}
		
		else {
            console.log("Concluding Campaign Siege...");
            let pObj = (typeof playerObj !== 'undefined') ? playerObj : (window.player || null);
            let victory = (typeof forceVictory !== 'undefined') ? forceVictory : false;

            if (typeof concludeSiegeBattlefield === 'function') {
                concludeSiegeBattlefield(pObj, victory);
            }
        }
        // 3. WIPE TOPOGRAPHY: Prevents the next battle from using old gate/wall positions
        for (let key in SiegeTopography) {
            SiegeTopography[key] = 0;
        }

    }, 15000);
}

}

function prepareLadderLanding(ladder, wallTileY) {
    let tx = Math.floor(ladder.x / BATTLE_TILE_SIZE);
    
    // Create a 4-wide "landing pad" on the wall that is WALKABLE
    // We use tile '10' instead of '1' so ai_categories.js maintains their "onWall" status!
    for(let x = tx - 2; x <= tx + 2; x++) {
        if(battleEnvironment.grid[x]) {
            
            // ---> SURGERY 2: Carve a 12-tile deep path through the Solid Stone (Zone 1) 
            // to connect directly to the Wooden Walkway (Zone 3).
            for(let depth = 0; depth <= 12; depth++) {
                let targetY = wallTileY - depth;
                if(battleEnvironment.grid[x][targetY] !== undefined) {
                    let currentTile = battleEnvironment.grid[x][targetY];
                    
// --- SURGERY: Player Passage Protection ---
                    // If we are near the gate's X coordinate, DO NOT use Tile 10.
                    // Use Tile 1 (Normal Ground) so the player doesn't get blocked.
                    let isGateEntry = Math.abs(x - SiegeTopography.gateTileX) < 5;
                    
                    if (currentTile === 6 || currentTile === 0) {
                        battleEnvironment.grid[x][targetY] = isGateEntry ? 1 : 10; 
                    }
                }
            }
            
            // Guarantee the outer lip is always walkable for the dismount
            if(battleEnvironment.grid[x][wallTileY] !== undefined) battleEnvironment.grid[x][wallTileY] = 10;
            if(battleEnvironment.grid[x][wallTileY - 1] !== undefined) battleEnvironment.grid[x][wallTileY - 1] = 10;
        }
    }
}