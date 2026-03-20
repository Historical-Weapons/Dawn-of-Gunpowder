// ============================================================================
// EMPIRE OF THE 13TH CENTURY - BATTLEFIELD TACTICAL ENGINE
// ============================================================================


const BATTLE_WORLD_WIDTH = 2400; 
const BATTLE_WORLD_HEIGHT = 1600; 
const BATTLE_TILE_SIZE = 8;
const BATTLE_COLS = Math.floor(BATTLE_WORLD_WIDTH / BATTLE_TILE_SIZE);
const BATTLE_ROWS = Math.floor(BATTLE_WORLD_HEIGHT / BATTLE_TILE_SIZE);
let unitIdCounter = 0;
const VIEW_PADDING = 200;

function isOnScreen(unit, camera) {
    return (
        unit.x > camera.x - VIEW_PADDING &&
        unit.x < camera.x + camera.width + VIEW_PADDING &&
        unit.y > camera.y - VIEW_PADDING &&
        unit.y < camera.y + camera.height + VIEW_PADDING
    );
}

// Global state for battle exploration
let inBattleMode = false;
let currentBattleData = null;
let savedWorldPlayerState_Battle = { x: 0, y: 0 }; 

let battleEnvironment = {
    bgCanvas: null,
    grid: [],
    units: [],
    projectiles: [] // For arrows and fire lances
};

 
	
// Add this near the top of battlefield_system.js
function isExitAllowed() {
    if (!inBattleMode) return true; 
    
    // Check for remaining enemies (units not on player side with HP > 0)
    const enemyCount = battleEnvironment.units.filter(u => u.side !== 'player' && u.hp > 0).length;
    const playerDead = player.hp <= 0;
    
    return (playerDead || enemyCount === 0);
}

// --- GENERATE ORGANIC BATTLEFIELD TERRAIN ---
function generateBattleOrganicFeatures(grid, typeValue, count, maxSize) {
    for (let i = 0; i < count; i++) {
        let startX = Math.floor(Math.random() * (BATTLE_COLS - maxSize));
        let startY = Math.floor(Math.random() * (BATTLE_ROWS - maxSize));
        
        for (let j = 0; j < maxSize * 2; j++) {
            let cx = startX + Math.floor((Math.random() - 0.5) * maxSize);
            let cy = startY + Math.floor((Math.random() - 0.5) * maxSize);
            
            if (cx > 0 && cx < BATTLE_COLS && cy > 0 && cy < BATTLE_ROWS) {
                if (grid[cx][cy] === 0) grid[cx][cy] = typeValue; 
            }
        }
    }
}

function generateBattlefield(worldTerrainType) {
    const grid = Array.from({ length: BATTLE_COLS }, () => Array(BATTLE_ROWS).fill(0));
    
    let groundColor = "#767950"; 
    let treeColorPool = ["#2e4a1f", "#3a5f27", "#1f3315"];
    let rockColor = "#5c5c5c";

    // --- YOUR ORIGINAL TERRAIN LOGIC (DO NOT DELETE) ---
    if (worldTerrainType.includes("Forest")) {
        groundColor = "#425232";
        generateBattleOrganicFeatures(grid, 3, 150, 20); 
        generateBattleOrganicFeatures(grid, 7, 60, 15);  
    } else if (worldTerrainType.includes("Desert") || worldTerrainType.includes("Dunes")) {
        groundColor = "#cfae7e";
        treeColorPool = ["#8b7e71", "#a68a5c"]; 
        generateBattleOrganicFeatures(grid, 6, 70, 12);  
        generateBattleOrganicFeatures(grid, 7, 40, 25);  
    } else if (worldTerrainType.includes("Mountain") || worldTerrainType.includes("Highlands") || worldTerrainType.includes("Snowy")) {
        groundColor = worldTerrainType.includes("Snowy") ? "#d8d3c5" : "#826b52";
        rockColor = worldTerrainType.includes("Snowy") ? "#b0b0b0" : "#5c5c5c";
        generateBattleOrganicFeatures(grid, 6, 120, 20);  
        generateBattleOrganicFeatures(grid, 3, 30, 10);  
    } else {
        generateBattleOrganicFeatures(grid, 3, 60, 15);  
        generateBattleOrganicFeatures(grid, 4, 20, 12);  
        generateBattleOrganicFeatures(grid, 7, 30, 10);  
    }

    // --- SURGERY: CANVAS EXPANSION ---
    const VISUAL_PADDING = 1200; // The size of the "Outer Bound" area
    const canvas = document.createElement('canvas');
    // We make the canvas significantly larger than the gameplay area
    canvas.width = BATTLE_WORLD_WIDTH + (VISUAL_PADDING * 2);
    canvas.height = BATTLE_WORLD_HEIGHT + (VISUAL_PADDING * 2);
    const ctx = canvas.getContext('2d');

    // 1. Paint the "Infinite" Floor
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. SURGERY: Decorative Outer Bound Textures
    // This populates the "Abyss" so it looks like a real world
    for (let i = 0; i < canvas.width; i += 60) {
        for (let j = 0; j < canvas.height; j += 60) {
            // Only draw if we are OUTSIDE the playable battle area
            if (i < VISUAL_PADDING || i > BATTLE_WORLD_WIDTH + VISUAL_PADDING || 
                j < VISUAL_PADDING || j > BATTLE_WORLD_HEIGHT + VISUAL_PADDING) {
                
                let rand = Math.random();
                if (rand > 0.98) { // Decorative Trees
                    ctx.fillStyle = treeColorPool[Math.floor(Math.random() * treeColorPool.length)];
                    ctx.beginPath();
                    ctx.arc(i, j, 5 + (Math.random() * 8), 0, Math.PI * 2);
                    ctx.fill();
                } else if (rand > 0.97) { // Decorative Rocks
                    ctx.fillStyle = rockColor;
                    ctx.beginPath();
                    ctx.moveTo(i, j + 10);
                    ctx.lineTo(i + 5, j);
                    ctx.lineTo(i + 10, j + 10);
                    ctx.fill();
                }
            }
        }
    }

    // 3. Shift the context so your original grid logic draws in the center
    ctx.save();
    ctx.translate(VISUAL_PADDING, VISUAL_PADDING);

    // --- YOUR ORIGINAL GRID DRAWING LOOP (DO NOT DELETE) ---
    for (let i = 0; i < BATTLE_COLS; i++) {
        for (let j = 0; j < BATTLE_ROWS; j++) {
            let px = i * BATTLE_TILE_SIZE;
            let py = j * BATTLE_TILE_SIZE;

            if (grid[i][j] === 0 && Math.random() > 0.95) {
                ctx.fillStyle = "rgba(0,0,0,0.1)";
                ctx.fillRect(px + Math.random() * 4, py + Math.random() * 4, 3, 3);
            } else if (grid[i][j] === 3) { // Trees
                ctx.fillStyle = treeColorPool[Math.floor(Math.random() * treeColorPool.length)];
                ctx.beginPath();
                ctx.arc(px + 4, py + 4, 6 + (Math.random() * 5), 0, Math.PI * 2);
                ctx.fill();
            } else if (grid[i][j] === 4) { // Water
                ctx.fillStyle = "#3ba3ab";
                ctx.fillRect(px, py, BATTLE_TILE_SIZE, BATTLE_TILE_SIZE);
            } else if (grid[i][j] === 6) { // Rocks
                ctx.fillStyle = rockColor;
                ctx.beginPath();
                ctx.moveTo(px, py + BATTLE_TILE_SIZE);
                ctx.lineTo(px + BATTLE_TILE_SIZE/2, py);
                ctx.lineTo(px + BATTLE_TILE_SIZE, py + BATTLE_TILE_SIZE);
                ctx.fill();
            } else if (grid[i][j] === 7) { // Mud/Brush
                ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
                ctx.fillRect(px, py, BATTLE_TILE_SIZE, BATTLE_TILE_SIZE);
            }
        }
    }

    // 4. SURGERY: The Red Tactical Boundary
    ctx.strokeStyle = "rgba(255, 0, 0, 0.6)";
    ctx.lineWidth = 8;
    ctx.setLineDash([15, 15]); // Makes it look like a tactical UI line
    ctx.strokeRect(0, 0, BATTLE_WORLD_WIDTH, BATTLE_WORLD_HEIGHT);
    ctx.setLineDash([]); // Reset for other drawings
    
    ctx.restore(); // Back to global canvas space

    // Store state
    battleEnvironment.bgCanvas = canvas;
    battleEnvironment.grid = grid;
    battleEnvironment.groundColor = groundColor;
    battleEnvironment.visualPadding = VISUAL_PADDING; // Store this for the camera!
}
// --- ENTER BATTLE LOGIC ---
function enterBattlefield(enemyNPC, playerObj, currentWorldMapTile) {
    if (inCityMode) return; 
	

    savedWorldPlayerState_Battle.x = playerObj.x;
    savedWorldPlayerState_Battle.y = playerObj.y;
    
    inBattleMode = true;
currentBattleData = {
        enemyRef: enemyNPC,
        playerFaction: playerObj.faction || "Hong Dynasty",
        enemyFaction: enemyNPC.faction,
        initialCounts: { player: 0, enemy: 0 },
        // ADD THESE:
        
    // UPDATED:
    playerColor: (typeof FACTIONS !== 'undefined' && FACTIONS[playerObj.faction]) 
        ? FACTIONS[playerObj.faction].color 
        : "#ffffff", // white fallback

    enemyColor: (typeof FACTIONS !== 'undefined' && FACTIONS[enemyNPC.faction]) 
        ? FACTIONS[enemyNPC.faction].color 
        : "#000000" // black fallback

		};

    generateBattlefield(currentWorldMapTile.name || "Plains");

    playerObj.x = BATTLE_WORLD_WIDTH / 2;
    playerObj.y = BATTLE_WORLD_HEIGHT - 100;

// FIX: Pull the real troop count from the player object
    let playerTroopCount = playerObj.troops || 0; // Use actual troops, or 0 as a fallback
    let playerUniqueType = playerObj.uniqueUnit || null; // Get the unique unit name (e.g., "Mangudai")
    deployArmy(currentBattleData.playerFaction, playerTroopCount, "player"); 
    deployArmy(enemyNPC.faction, enemyNPC.count, "enemy");
	
	
	// ---> PASTE HERE <---
    let totalCombatants = playerTroopCount + enemyNPC.count;
    
    if (enemyNPC.faction === "Bandits") {
        AudioManager.playMusic("Bandits");
    } else if (totalCombatants > 300) {
        AudioManager.playMusic("Battle_Massive");
    } else if (enemyNPC.faction === "Hong Dynasty" || enemyNPC.faction === "Xiaran Dominion") {
        AudioManager.playMusic("Battle_Gunpowder"); // Heavily gunpowder focused factions
    } else {
        AudioManager.playMusic("Battle_Skirmish");
    }
    
    AudioManager.playSound("charge"); // Warcry SFX on spawn
	// Trigger the Epic Zoom: Starts at 0.3x (high up), lands at 1.5x (tactical view) over 1.5 seconds
    if (typeof triggerEpicZoom === 'function') {
        triggerEpicZoom(0.1, 1.5, 3500);
    }
}
 
// --- ARMY DEPLOYMENT BASED ON FACTION RACE & ACTUAL ROSTER ---
function deployArmy(faction, totalTroops, side, uniqueType) {
    
    // 1. Track initial counts for the battle summary
    if (!currentBattleData.initialCounts) {
        currentBattleData.initialCounts = { player: 0, enemy: 0 };
    }
    
    // 2. Setup spawn coordinates
    let spawnY = side === "player" ? BATTLE_WORLD_HEIGHT - 300 : 300;
    let spawnXCenter = BATTLE_WORLD_WIDTH / 2;
    let factionColor = (typeof FACTIONS !== 'undefined' && FACTIONS[faction]) ? FACTIONS[faction].color : "#ffffff";
    
    let composition = [];

// =========================================================
    // THE FIX: If it's the player, read EXACTLY what they bought
    // =========================================================
    if (side === "player" && typeof player !== 'undefined' && player.roster && player.roster.length > 0) {
        let counts = {};
        
        // Tally up the exact units in the roster
        player.roster.forEach(unit => {
            let rawType = unit.type || unit.name;
            if (!rawType) return;
            // Force exact UI capitalization so the Engine never misses the database name
            let type = rawType.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            if (type.toLowerCase() === "militia") type = "Militia";
            
            counts[type] = (counts[type] || 0) + 1;
        });

        // Convert the exact counts into percentages for your visual scaling engine
        let totalRosterSize = player.roster.length;
        for (let [type, count] of Object.entries(counts)) {
            composition.push({ type: type, pct: count / totalRosterSize });
        }

        // CRITICAL FIX: Sort ascending! 
        // This ensures rare unique units (like 2 Slingers) get calculated FIRST. 
        // Otherwise, Math.round() on the 90% Militia blob will hit the unit cap early and erase them.
        composition.sort((a, b) => a.pct - b.pct);

        // Override totalTroops to match the actual roster size
        totalTroops = totalRosterSize;

    } else {
        // =========================================================
        // ENEMY AI: Use the hardcoded percentage templates
        // =========================================================
        if (faction === "Great Khaganate") {
            composition = [
                {type: "Light Horse Archer", pct: 0.35}, {type: "Horse Archer", pct: 0.30},
                {type: "Heavy Horse Archer", pct: 0.20}, {type: "Lancer", pct: 0.10}, {type: "Heavy Lancer", pct: 0.05}
            ];
        } else if (faction === "Shahdom of Iransar") {
            composition = [
                {type: "Shielded Infantry", pct: 0.10}, {type: "Archer", pct: 0.10}, {type: "Spearman", pct: 0.10},
                {type: "Horse Archer", pct: 0.20}, {type: "Heavy Lancer", pct: 0.20}, {type: "Bomb", pct: 0.10}, {type: "Heavy Horse Archer", pct: 0.20}
            ];
        } else if (faction === "Hong Dynasty") {
            composition = [
                {type: "Shielded Infantry", pct: 0.40}, {type: "Spearman", pct: 0.10}, {type: "Poison Crossbowman", pct: 0.05},
                {type: "Repeater Crossbowman", pct: 0.10}, {type: "Heavy Crossbowman", pct: 0.10}, {type: "Bomb", pct: 0.05},
                {type: "Firelance", pct: 0.05}, {type: "Rocket", pct: 0.05}, {type: "Archer", pct: 0.10}
            ];
        } else if (faction === "Vietan Realm") {
            composition = [
                {type: "Shielded Infantry", pct: 0.15}, {type: "Glaiveman", pct: 0.20}, {type: "Repeater Crossbowman", pct: 0.15},
                {type: "Poison Crossbowman", pct: 0.15}, {type: "Firelance", pct: 0.15}, {type: "Archer", pct: 0.10}, {type: "Heavy Horse Archer", pct: 0.10}
            ];
        } else if (faction === "Jinlord Confederacy") {
            composition = [
                {type: "Shielded Infantry", pct: 0.15}, {type: "Spearman", pct: 0.15}, {type: "Crossbowman", pct: 0.20},
                {type: "Heavy Crossbowman", pct: 0.15}, {type: "Hand Cannoneer", pct: 0.15}, {type: "Heavy Lancer", pct: 0.10}, {type: "Archer", pct: 0.10}
            ];
        } else if (faction === "Xiaran Dominion") {
            composition = [
                {type: "Shielded Infantry", pct: 0.15}, {type: "Heavy Shielded Spear", pct: 0.15}, {type: "Crossbowman", pct: 0.15},
                {type: "Camel Cannon", pct: 0.15}, {type: "Hand Cannoneer", pct: 0.15}, {type: "Bomb", pct: 0.10}, {type: "Lancer", pct: 0.15}
            ];
        } else if (faction === "Goryun Kingdom") {
            composition = [
                {type: "Shielded Infantry", pct: 0.20}, {type: "Heavy Shielded Spear", pct: 0.15}, {type: "Heavy Crossbowman", pct: 0.15},
                {type: "Crossbowman", pct: 0.15}, {type: "Hand Cannoneer", pct: 0.15}, {type: "Rocket", pct: 0.10}, {type: "Archer", pct: 0.10}
            ];
        } else if (faction === "High Plateau Kingdoms") {
            composition = [
                {type: "Shielded Infantry", pct: 0.15}, {type: "Spearman", pct: 0.15}, {type: "Heavy Two Handed", pct: 0.20},
                {type: "Light Two Handed", pct: 0.15}, {type: "Archer", pct: 0.15}, {type: "Slinger", pct: 0.10}, {type: "Lancer", pct: 0.10}
            ];
        } else if (faction === "Yamato Clans") {
            composition = [
                {type: "Spearman", pct: 0.20}, {type: "Glaiveman", pct: 0.20}, {type: "Light Two Handed", pct: 0.15},
                {type: "Heavy Two Handed", pct: 0.10}, {type: "Archer", pct: 0.20}, {type: "Lancer", pct: 0.10}, {type: "Heavy Horse Archer", pct: 0.05}
            ];
        } else if (faction === "Bandits") {
            composition = [
                {type: "Militia", pct: 0.60}, {type: "Spearman", pct: 0.40}
            ];
        } else {
            composition = [
                {type: "Shielded Infantry", pct: 0.25}, {type: "Spearman", pct: 0.20}, {type: "Archer", pct: 0.20},
                {type: "Crossbowman", pct: 0.15}, {type: "Lancer", pct: 0.10}, {type: "Light Two Handed", pct: 0.10}
            ];
        }
    }

    currentBattleData.initialCounts[side] += totalTroops;

    // 3. Spawning Engine (Keeps your visual scale optimization)
    let visualScale = totalTroops > 300 ? 5 : 1; 
    let unitsToSpawn = Math.round(totalTroops / visualScale); 
    
    let spawnedSoFar = 0;

    composition.forEach(comp => {
        if (spawnedSoFar >= unitsToSpawn) return; 
        
        let count = Math.round(unitsToSpawn * comp.pct);
        if (count === 0 && unitsToSpawn > 0) count = 1;
        count = Math.min(count, unitsToSpawn - spawnedSoFar);
        spawnedSoFar += count;

        let baseTemplate = UnitRoster.allUnits[comp.type];
        
        // Safety check just in case a unit type is misspelled or missing
        if (!baseTemplate) {
            console.warn(`Unit type ${comp.type} missing from Roster! Defaulting to Militia.`);
            baseTemplate = UnitRoster.allUnits["Militia"];
        }

        for (let i = 0; i < count; i++) {
            let offsetX = (Math.random() - 0.5) * 600;
            let offsetY = (Math.random() - 0.5) * 50;
            
            // Apply new tactical positions if the function exists
            if (typeof getTacticalPosition === 'function') {
                let tacticalOffset = getTacticalPosition(baseTemplate.role, side);
                offsetX += tacticalOffset.x;
                offsetY += tacticalOffset.y;
            }

            let unitStats = Object.assign(
                new Troop(baseTemplate.name, baseTemplate.role, baseTemplate.isLarge, faction),
                baseTemplate
            );

            unitStats.experienceLevel = baseTemplate.experienceLevel || 1;
            unitStats.morale = 20;    
            unitStats.maxMorale = 20; 
            unitStats.faction = faction;

            battleEnvironment.units.push({
                id: unitIdCounter++,
                side: side,
                faction: faction,
                color: factionColor,
                unitType: comp.type, // Will correctly apply "Mangudai", "Rocket", etc.
                stats: unitStats, 
                hp: unitStats.health,
                x: spawnXCenter + offsetX,
                y: spawnY + offsetY,
                target: null,
                state: "idle", 
                animOffset: Math.random() * 100,
                cooldown: 0
            });
        }
    });
}

function spawnUniqueReinforcement(type, side, faction, color, centerX, centerY) {
    let baseTemplate = UnitRoster.allUnits[type];
    if (!baseTemplate) return;

    let unitStats = Object.assign(
        new Troop(baseTemplate.name, baseTemplate.role, baseTemplate.isLarge, faction),
        baseTemplate
    );
    
    // Position him slightly behind or to the side of the main group
    let offsetX = (Math.random() - 0.5) * 100;
    let offsetY = side === "player" ? 50 : -50; 

    battleEnvironment.units.push({
        id: unitIdCounter++,
        side: side,
        faction: faction,
        color: color,
        unitType: type,
        stats: unitStats,
        hp: unitStats.health,
        x: centerX + offsetX,
        y: centerY + offsetY,
        target: null,
        state: "idle",
        animOffset: Math.random() * 100,
        cooldown: 0
    });
}

// --- Damage Logic ---

function calculateDamageReceived(attacker, defender, stateString) {

    const states = stateString.split(" ");

    let totalDamage = 0;

    

    // Check if the attacker is FORCED into melee by their current stance

    const isActuallyRangedAttacking = states.includes("ranged_attack") && attacker.currentStance === "statusrange";



    let attackValue = attacker.meleeAttack;

    let defenseValue = defender.meleeDefense;


// We removed the weak 0.5 multiplier. Stats are saved permanently now, 
    // but we add a dynamic +2 to reward highly leveled troops with an edge in combat calculation.
    attackValue += (attacker.experienceLevel * 2); 
    defenseValue += (defender.experienceLevel * 2);
    

    if (states.includes("flanked")) defenseValue *= 0.5;

    if (states.includes("charging")) attackValue += 15;



    if (isActuallyRangedAttacking) {

        // Ranged Damage Calculation

        if (states.includes("shielded_front") && Math.random() * 100 < defender.shieldBlockChance) return 0;

        

        let effectiveArmor = Math.max(0, defender.armor - attacker.missileAPDamage);

        let baseDamageDealt = Math.max(0, attacker.missileBaseDamage - (effectiveArmor * 0.5));

        totalDamage = baseDamageDealt + attacker.missileAPDamage;

			// Add this:
		if (attacker.name === "Bomb") {
			totalDamage *= 3.5; // Bombs should be devastating on direct hit
		}

        if (defender.isLarge && attacker.name.toLowerCase().includes("rocket")) totalDamage += 30;

        

        // Optional: consume ammo when firing

        // attacker.ammo -= 1; 



} else {
        // Melee Damage Calculation
        let hitChance = Math.max(10, Math.min(90, 40 + (attackValue - defenseValue)));
        
        if (Math.random() * 100 < hitChance) {
            // FIX: Replace hardcoded 20 with the attacker's actual melee stat
            let weaponDamage = attacker.meleeAttack + (defender.isLarge ? attacker.bonusVsLarge : 0);
            
         
            totalDamage = Math.max(1, weaponDamage - (defender.armor * 0.3));
        }
    }

    

    if (attacker.stamina < 30) totalDamage *= 0.7;



let finalDamage = Math.floor(totalDamage);
    // If formatNumbersWithCommas is true, we still return a Number for calculations, 
    // but you can format it later in the UI.
    return finalDamage; 
}// Always return a pure number for math operations
 
/* --- TACTICAL AI UPDATE LOOP --- */
function updateBattleUnits() {
    let units = battleEnvironment.units;
    
    /* Clean dead units and initialize global battle trackers */
    battleEnvironment.units = units.filter(u => u.hp > 0);
    units = battleEnvironment.units;

    if (!currentBattleData.fledCounts) {
        currentBattleData.fledCounts = { player: 0, enemy: 0 };
    }
    if (!currentBattleData.frames) {
        currentBattleData.frames = 0;
    }
    currentBattleData.frames++;

    const pCount = units.filter(u => u.side === 'player').length;
    const eCount = units.filter(u => u.side === 'enemy').length;

    /* Process Units */
    units.forEach(unit => {
        
        /* 1. SKIP DEAD UNITS ONLY (Let Commander pass through) */
        if (unit.hp <= 0) return;

        /* 2. MORALE & COWARDICE MATH (AI ONLY - Commander never flees) */
        /* 2. MORALE & COWARDICE MATH (AI ONLY - Commander never flees) */
        if (!unit.isCommander) {
            let hpPct = unit.hp / unit.stats.health;
            let armorEffect = Math.min(unit.stats.armor / 50, 1.0);
            
            // Base drain only starts if they are actually hurt (below 80% HP)
            let baseTick = (hpPct <= 0.1) ? 0.12 : (hpPct <= 0.8 ? 0.04 : 0);

            /* REVISED OUTNUMBERING: Confidence Boost */
            // If our side has more units than the enemy, we don't lose morale from "combat stress"
            const weOutnumberEnemy = (unit.side === 'player' && pCount > eCount) || (unit.side === 'enemy' && eCount > pCount);
            
            if (weOutnumberEnemy) {
                baseTick = 0; 
            } else if ((unit.side === 'player' && eCount >= pCount * 5) || 
                       (unit.side === 'enemy' && pCount >= eCount * 5)) {
                /* Severe Cowardice: Only triggers if heavily outnumbered 5-to-1 */
                baseTick = 0.2; 
            }

            /* Armor check: Brave veterans (30+ armor) rarely flee early on */
            if (unit.stats.armor >= 30 && currentBattleData.frames < 18000) {
                baseTick *= 0.01; 
            }

            /* REVISED TRASH MOB LOGIC: Only drain if they are zero-armor AND losing/hurt */
            if (unit.stats.armor < 5 && unit.target && hpPct < 0.9 && !weOutnumberEnemy) {
                baseTick += 0.02;
            }

            // Apply the drain or the recovery
            if (baseTick > 0) {
                unit.stats.morale -= baseTick * Math.max(0.1, (1.1 - armorEffect));
            } else if (unit.stats.morale < 20) { 
                // Recovery: If winning or safe, slowly regain morale (up to max of 20)
                unit.stats.morale += 0.005; 
            }

            /* FLEEING MECHANICS (TWO-STAGE) */
            /* STAGE 2: Broken (Run Off Map, White Flag outside border) */
            if (unit.stats.morale <= 0) {
                unit.state = "FLEEING";
                
                if (!unit.escapePoint || unit.escapeType !== "OUTER") {
                    let distToLeft = unit.x;
                    let distToRight = BATTLE_WORLD_WIDTH - unit.x;
                    let distToTop = unit.y;
                    let distToBottom = BATTLE_WORLD_HEIGHT - unit.y;
                    let minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
                    
                    // Make the escape point massive so they never reach it and just keep running
                    let outerPadding = -2000; 
                    
                    if (minDist === distToLeft) unit.escapePoint = { x: outerPadding, y: unit.y };
                    else if (minDist === distToRight) unit.escapePoint = { x: BATTLE_WORLD_WIDTH - outerPadding, y: unit.y };
                    else if (minDist === distToTop) unit.escapePoint = { x: unit.x, y: outerPadding };
                    else unit.escapePoint = { x: unit.x, y: BATTLE_WORLD_HEIGHT - outerPadding };
                    
                    unit.escapeType = "OUTER";
                    unit.fleeTimer = 0; // Initialize our new despawn timer
                }

                let dx = unit.escapePoint.x - unit.x;
                let dy = unit.escapePoint.y - unit.y;
                let dist = Math.hypot(dx, dy);

                // They will always be > 8 distance away, so they keep running continuously
                if (dist > 8) {
                    unit.x += (dx / dist + (Math.random() - 0.5) * 0.3) * (unit.stats.speed * 2.5);
                    unit.y += (dy / dist + (Math.random() - 0.5) * 0.3) * (unit.stats.speed * 2.5);
                }

                // Check if they have officially crossed the red boundary line
                let isOutsideBorder = unit.x < 0 || unit.x > BATTLE_WORLD_WIDTH || unit.y < 0 || unit.y > BATTLE_WORLD_HEIGHT;
                
                if (isOutsideBorder) {
                    unit.fleeTimer = (unit.fleeTimer || 0) + 1;
                    
                     if (unit.fleeTimer >= 300) { 
                        unit.hp = 0; 
                        let sideTotal = currentBattleData.initialCounts[unit.side] || 0;
                        let scale = sideTotal > 300 ? 5 : 1;
                        currentBattleData.fledCounts[unit.side] += scale; 
                    }
                }
                return; 
            }
            
            /* STAGE 1: Wavering (Linger at Inner Border until Morale hits 0 or restores) */
            else if (unit.stats.morale <= 3) {
                unit.state = "WAVERING";
                
                if (!unit.escapePoint || unit.escapeType !== "INNER") {
                    let distToLeft = unit.x;
                    let distToRight = BATTLE_WORLD_WIDTH - unit.x;
                    let distToTop = unit.y;
                    let distToBottom = BATTLE_WORLD_HEIGHT - unit.y;
                    let minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
                    
                    let innerPadding = 20;
                    
                    if (minDist === distToLeft) unit.escapePoint = { x: innerPadding, y: unit.y };
                    else if (minDist === distToRight) unit.escapePoint = { x: BATTLE_WORLD_WIDTH - innerPadding, y: unit.y };
                    else if (minDist === distToTop) unit.escapePoint = { x: unit.x, y: innerPadding };
                    else unit.escapePoint = { x: unit.x, y: BATTLE_WORLD_HEIGHT - innerPadding };
                    
                    unit.escapeType = "INNER";
                }

                let dx = unit.escapePoint.x - unit.x;
                let dy = unit.escapePoint.y - unit.y;
                let dist = Math.hypot(dx, dy);

                if (dist > 8) {
                    unit.x += (dx / dist) * (unit.stats.speed * 1.5);
                    unit.y += (dy / dist) * (unit.stats.speed * 1.5);
                } else {
                    unit.state = "idle";
                }
                return;
            }

            unit.escapePoint = null;
            unit.escapeType = null;
        }
        /* 3. COMBAT & TARGETING LOGIC */
        if (!unit.target || unit.target.hp <= 0) {
            let nearestDist = Infinity;
            let nearestEnemy = null;
            units.forEach(other => {
                if (other.side !== unit.side) {
                    let dist = Math.hypot(unit.x - other.x, unit.y - other.y);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestEnemy = other;
                    }
                }
            });
            unit.target = nearestEnemy;
        }

        if (unit.target) {
            let dx = unit.target.x - unit.x;
            let dy = unit.target.y - unit.y;
            let dist = Math.hypot(dx, dy);

            unit.stats.updateStance(dist);
            let effectiveRange = unit.stats.currentStance === "statusmelee" ? 20 : unit.stats.range;

            if (dist > effectiveRange * 0.8) {
                
                // ONLY AI CONTROLLED UNITS MOVE AUTOMATICALLY
                if (!unit.isCommander) {
                    unit.state = "moving";
                    if (Math.random() > 0.9) unit.stats.stamina = Math.max(0, unit.stats.stamina - 1);
                    
                    let speedMod = 1.0;
                    let tx = Math.floor(unit.x / BATTLE_TILE_SIZE);
                    let ty = Math.floor(unit.y / BATTLE_TILE_SIZE);
                    
                    if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 4) speedMod = 0.4;
                    if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 7) speedMod = 0.6;

                    if (unit.stats.morale > 3 && unit.stats.morale < 10) {
                        let dir = unit.side === "player" ? 1 : -1;
                        let safeEdge = unit.side === "player" ? BATTLE_WORLD_HEIGHT - 100 : 100;
                        let notAtEdge = unit.side === "player" ? unit.y < safeEdge : unit.y > safeEdge;
                        
                        if (notAtEdge) {
                            unit.y += (unit.stats.speed * speedMod * 0.5) * dir;
                            unit.x += (Math.random() - 0.5); 
                        }
                    } else {
          /* Revised: Added 0.2 jitter so they don't move in perfect robotic lines */
unit.x += (dx / dist + (Math.random() - 0.5) * 0.2) * (unit.stats.speed * speedMod);
unit.y += (dy / dist + (Math.random() - 0.5) * 0.2) * (unit.stats.speed * speedMod);
                    }
                }

            } else {
                /* Attack Logic */
                unit.state = "attacking";
                if (unit.cooldown <= 0) {
                    if (unit.stats.currentStance === "statusrange") {
                        
                        /* Ranged Combat */
                        let isRepeater = unit.unitType === "Repeater Crossbowman";
                        
                        if (isRepeater && unit.stats.magazine > 1) {
                            unit.cooldown = 5;
                            unit.stats.magazine--; 
                        } else {
                            unit.cooldown = getReloadTime(unit);
                            if (isRepeater) unit.stats.magazine = 10;
                        }
						unit.stats.ammo--; 
                        
                        // 1. Amplified Spread Math (0.6 -> 2.5) for true visual scatter
                        let spread = (100 - unit.stats.accuracy) * 2.5;
                        let targetX = unit.target.x + (Math.random() - 0.5) * spread;
                        let targetY = unit.target.y + (Math.random() - 0.5) * spread;
                        
                        // 2. Calculate continuous velocity vector
                        let angle = Math.atan2(targetY - unit.y, targetX - unit.x);
                        let speed = 8; // Projectile flight speed

                        battleEnvironment.projectiles.push({
                            x: unit.x, y: unit.y, 
                            vx: Math.cos(angle) * speed, // Velocity X
                            vy: Math.sin(angle) * speed, // Velocity Y
                            startX: unit.x, startY: unit.y,
                            maxRange: unit.stats.range + 50, // Fly slightly past max range
                            attackerStats: unit.stats,
                            side: unit.side, // Track side to prevent friendly fire
                            projectileType: (unit.unitType === "Rocket") ? "Archer" : unit.unitType,
                            isFire: unit.unitType === "Firelance" || unit.unitType === "Bomb" || unit.unitType === "Rocket"
                        });
                        /* Ranged Audio */
                        if (unit.unitType === "Bomb" || unit.unitType === "Camel Cannon") {
                            AudioManager.playSound('bomb');
                        } else if (unit.unitType === "Firelance" || unit.unitType === "Hand Cannoneer" || unit.unitType === "Rocket") {
                            AudioManager.playSound('firelance');
                        } else {
                            AudioManager.playSound('arrow');
                        }
                        
                    } else {
                        
                        /* Melee Combat */
                        unit.cooldown = 60;
                        let stateStr = "melee_attack";
                        if (unit.stats.role === ROLES.CAVALRY) stateStr += " charging";
                        
                        let dmg = calculateDamageReceived(unit.stats, unit.target.stats, stateStr);
                        unit.target.hp -= dmg;
						
						// --- EXP GAIN SURGERY (MELEE) ---
                        if (unit.side === "player" && unit.stats.gainExperience) {
                            // Commander gets 80% less (0.05), Ally troops gain much faster (0.35)
                            let baseExp = unit.isCommander ? 0.05 : 0.35; 
                            if (unit.target.hp <= 0) baseExp *= 3; // Triple EXP for a kill
                            unit.stats.gainExperience(baseExp);
                        }
                        // --------------------------------
                        
                        if (dmg > (unit.target.stats.health * 0.25)) {
                            unit.target.stats.morale -= 5;
                        }
                        
                        /* Melee Audio */
                        if (unit.unitType === "War Elephant") {
                            AudioManager.playSound('elephant');
                        } else {
                            AudioManager.playSound('sword_clash');
                        }
                        if (dmg > 0) {
                            AudioManager.playSound('hit');
                        } else {
                            AudioManager.playSound('shield_block');
                        }
                        
                        /* Knockback */
                        unit.target.x += (dx / dist) * 5;
                        unit.target.y += (dy / dist) * 5;
                    }
                }
            }
        } else {
            /* Idle Recovery */
            // ONLY set idle if it's an AI so player movement isn't overwritten
            if (!unit.isCommander) {
                 unit.state = "idle";
            }
            if (unit.stats.stamina < 100 && Math.random() > 0.9) unit.stats.stamina++;
        }
        
        if (unit.cooldown > 0) unit.cooldown--;
    });

/* 4. UPDATE PROJECTILES (PHYSICS BASED COLLISION) */
    for (let i = battleEnvironment.projectiles.length - 1; i >= 0; i--) {
        let p = battleEnvironment.projectiles[i];
        
        // 1. Move projectile along its vector
        p.x += p.vx;
        p.y += p.vy;
        
        // 2. Range & Bounds Check (Despawn if it misses everything)
        let distFlown = Math.hypot(p.x - p.startX, p.y - p.startY);
        if (distFlown > p.maxRange || 
            p.x < -200 || p.x > BATTLE_WORLD_WIDTH + 200 || 
            p.y < -200 || p.y > BATTLE_WORLD_HEIGHT + 200) {
            battleEnvironment.projectiles.splice(i, 1);
            continue;
        }

        // 3. Physical Hitbox Collision
        let hitMade = false;
        
        for (let j = 0; j < units.length; j++) {
            let u = units[j];
            
            // Only check living enemies (Prevents friendly fire and hitting corpses)
            if (u.hp > 0 && u.side !== p.side) {
                
                // Dynamic hitbox: Large units (elephants/horses) are easier to hit
                let hitbox = u.stats.isLarge ? 16 : 8; 
                let distToUnit = Math.hypot(p.x - u.x, p.y - u.y);
                
                if (distToUnit < hitbox) {
                    // TRUE IMPACT!
                    hitMade = true;
                    let dmg = calculateDamageReceived(p.attackerStats, u.stats, "ranged_attack");
                    u.hp -= dmg;
                    
                    // --- EXP GAIN SURGERY (RANGED) ---
                    let attackerUnit = battleEnvironment.units.find(a => a.stats === p.attackerStats);
                    if (attackerUnit && attackerUnit.side === "player" && p.attackerStats.gainExperience) {
                        let baseExp = attackerUnit.isCommander ? 0.05 : 0.35; 
                        if (u.hp <= 0) baseExp *= 3; 
                        p.attackerStats.gainExperience(baseExp);
                    }
                    // ---------------------------------
                    
                    if (dmg > 0) {
                        AudioManager.playSound('hit');
                    } else {
                        AudioManager.playSound('shield_block');
                    }
                    
                    break; // Projectile stops after hitting one person
                }
            }
        }
        
        // Destroy the arrow if it impacted someone
        if (hitMade) {
            battleEnvironment.projectiles.splice(i, 1);
        }
    }
	
	
	
	
}

/* --- I DONT THINK THIS ONE IS EVEN USED --- */
// --- MAIN RENDER LOOP ---
function drawBattlefield(ctx, camera) {
    if (!inBattleMode) return;

    // 1. CLEAR SCREEN (Dynamic Palette Fix)
    // This fills the screen with the ground color we saved in Surgery 1
    ctx.fillStyle = battleEnvironment.groundColor || "#000000"; 
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // 2. DRAW BACKGROUND (bgCanvas)
    if (battleEnvironment.bgCanvas) {
        ctx.drawImage(
            battleEnvironment.bgCanvas,
            // SOURCE: Add the padding so (0,0) in world-space is the start of the red line
            camera.x + battleEnvironment.visualPadding, 
            camera.y + battleEnvironment.visualPadding, 
            camera.width, camera.height,
            // DESTINATION: Fill the screen
            0, 0, ctx.canvas.width, ctx.canvas.height
        );
    }

// --- SUPPLY WAGONS (OUTSIDE BOUNDS) ---
// --- EMERGENCY RENDER: SUPPLY LINES ---
    // We use BATTLE_WORLD_WIDTH/2 to center them.
    const centerX = BATTLE_WORLD_WIDTH / 2 - 150; // Offset for the group of 5
    
    // Hardcoded colors to ensure they show up even if data is missing
    const pColor = (currentBattleData && currentBattleData.playerColor) ? currentBattleData.playerColor : "#2196f3";
    const eColor = (currentBattleData && currentBattleData.enemyColor) ? currentBattleData.enemyColor : "#f44336";

    // TOP WAGONS (Enemy) - Placed at Y: 80 (Inside the map)
    drawSupplyLines(ctx, centerX, 80, eColor, camera);

    // BOTTOM WAGONS (Player) - Placed at Y: 1520 (Inside the map)
    drawSupplyLines(ctx, centerX, BATTLE_WORLD_HEIGHT - 80, pColor, camera);
	
	
	
    // 3. DRAW UNITS
    battleEnvironment.units.forEach(unit => {
        if (isOnScreen(unit, camera)) {
            // Convert world coordinates to screen coordinates
            let screenX = (unit.x - camera.x) * (ctx.canvas.width / camera.width);
            let screenY = (unit.y - camera.y) * (ctx.canvas.height / camera.height);
            
            // Draw the unit (Assuming drawTroop exists in troop_system.js)
            if (typeof drawTroop === "function") {
                drawTroop(ctx, screenX, screenY, unit);
            }
        }
    });

    // 4. DRAW PROJECTILES
    battleEnvironment.projectiles.forEach(p => {
        let screenX = (p.x - camera.x) * (ctx.canvas.width / camera.width);
        let screenY = (p.y - camera.y) * (ctx.canvas.height / camera.height);
        
        ctx.fillStyle = p.isFire ? "#ff4500" : "#ffffff";
        ctx.beginPath();
        ctx.arc(screenX, screenY, 2, 0, Math.PI * 2);
        ctx.fill();
    });
}
/* --- END SURGERY --- */

function isBattleCollision(x, y) {
    let tx = Math.floor(x / BATTLE_TILE_SIZE);
    let ty = Math.floor(y / BATTLE_TILE_SIZE);

    // Out of bounds
    if (tx < 0 || tx >= BATTLE_COLS || ty < 0 || ty >= BATTLE_ROWS) return true;

    // Check grid: 6 is Rocks (Impassable)
    // You can also add 4 (Water) if you don't want the player to swim
    if (battleEnvironment.grid[tx][ty] === 6) return true;

    return false;
}

function leaveBattlefield(playerObj) {
    // --- 1. CALCULATE EVERYTHING FIRST (While data still exists) ---
    
    // FIX: Ignore the Commander, otherwise the engine thinks you gained a free troop!
    let pUnitsAlive = battleEnvironment.units.filter(u => u.side === "player" && !u.isCommander).length;
    let eUnitsAlive = battleEnvironment.units.filter(u => u.side === "enemy" && !u.isCommander).length;
    
    // Get the scale and initial counts before we null the data
    let scale = currentBattleData.initialCounts.player > 300 ? 5 : 1; 
    let playerLost = currentBattleData.initialCounts.player - (pUnitsAlive * scale);
    let enemyLost = currentBattleData.initialCounts.enemy - (eUnitsAlive * scale);

    let isFleeing = eUnitsAlive > 0;
    
    // ... [The rest of the function remains exactly the same] ...

    // --- 2. APPLY OVERWORLD CONSEQUENCES (Your full logic) ---
    
playerObj.troops = Math.max(0, (playerObj.troops || 0) - playerLost);

    if (currentBattleData.enemyRef) {
        let overworldNPC = currentBattleData.enemyRef;
        overworldNPC.count -= enemyLost;

        if (overworldNPC.count <= 0 || !isFleeing) {
            overworldNPC.count = 0; 
            
            // THE FIX: Restore the player's coordinates on victory!
            playerObj.x = savedWorldPlayerState_Battle.x;
            playerObj.y = savedWorldPlayerState_Battle.y;
            
        } else {
            // Player fled: Bounce away
            playerObj.x = savedWorldPlayerState_Battle.x + 40;
            playerObj.y = savedWorldPlayerState_Battle.y + 40;
        }
    } else {
        playerObj.x = savedWorldPlayerState_Battle.x;
        playerObj.y = savedWorldPlayerState_Battle.y;
    }

    // Show the UI using the variables we calculated at the top
    createBattleSummaryUI(isFleeing ? "Retreat!" : "Victory!", playerLost, enemyLost);

    // --- 3. CLEAN UP AT THE VERY END ---
    inBattleMode = false;
    currentBattleData = null; // Safe to null now
    battleEnvironment.units = []; // Safe to clear now
    battleEnvironment.projectiles = [];
	lastBattleTime = Date.now();
	
	// --- 4. HOOK BATTLE EXIT (Fixes Teleportation & UI bugs) ---
//const originalLeaveBattlefield = leaveBattlefield;


//;
	
}

function createBattleSummaryUI(title, pLost, eLost) {
    const summaryDiv = document.createElement('div');
	
	// ---> PASTE HERE <---
    if (title === "Victory!") {
        AudioManager.playMusic("Victory");
    } else {
        AudioManager.playMusic("Defeat");
    }
	
    summaryDiv.id = 'battle-summary';
    summaryDiv.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: linear-gradient(to bottom, rgba(50, 10, 10, 0.95), rgba(20, 5, 5, 0.98));
        color: #f5d76e; padding: 30px; border: 2px solid #b71c1c; border-radius: 8px;
        text-align: center; z-index: 1000; font-family: 'Georgia', serif; min-width: 300px;
        box-shadow: 0 10px 40px rgba(0,0,0,1);
    `;
    
    summaryDiv.innerHTML = `
        <h2 style="color: ${title === "Victory!" ? "#ffca28" : "#d32f2f"}; font-size: 2.5rem; margin: 0 0 15px 0; text-shadow: 2px 2px 4px #000;">${title}</h2>
        <div style="font-size: 1.2rem; color: #fff; margin-bottom: 10px;">Our Casualties: <span style="color: #f44336;">${Math.max(0, pLost)}</span></div>
        <div style="font-size: 1.2rem; color: #fff; margin-bottom: 25px;">Enemy Casualties: <span style="color: #4caf50;">${Math.max(0, eLost)}</span></div>
        <button id="close-summary-btn" style="
            background: linear-gradient(to bottom, #7b1a1a, #4a0a0a); color: #f5d76e; 
            border: 1px solid #d4b886; padding: 10px 20px; font-weight: bold; cursor: pointer; text-transform: uppercase;">
            Return to World Map
        </button>
    `;
    
    document.body.appendChild(summaryDiv);
    document.getElementById('close-summary-btn').onclick = () => {
        summaryDiv.remove();
    };
}



 
document.addEventListener("keydown", (event) => {
    if (!inBattleMode) return; // Only process if in a battle
// Guard: make sure event + key exist
if (!event || typeof event.key !== "string") return;

// Normalize key safely
const key = event.key.toLowerCase();

// Guard: make sure battleEnvironment + units exist
if (!battleEnvironment || !Array.isArray(battleEnvironment.units)) {
    console.warn("Battle environment not ready yet");
    return;
}

switch (key) {

    // =========================
    // UNIT SELECTION
    // =========================
    case "1":
        console.log("Command 1: Select All Infantry");
        battleEnvironment.units.forEach(u => {
            if (!u || !u.stats) return;
            u.selected = (
                u.side === "player" &&
                !u.stats.isLarge &&
                !u.stats.isRanged
            );
        });
        break;

    case "2":
        console.log("Command 2: Select All Archers");
        break;

    case "3":
        console.log("Command 3: Select All Cavalry");
        break;

    case "4":
        console.log("Command 4: Select All Artillery");
        break;

    case "5":
        console.log("Command 5: Select All Units");
        break;


    // =========================
    // FORMATIONS
    // =========================
    case "z":
        console.log("Formation: Tight Formation");
        break;

    case "x":
        console.log("Formation: Loose Formation");
        break;

    case "c":
        console.log("Formation: Line Formation");
        break;

    case "v":
        console.log("Formation: Circle Formation");
        break;


    // =========================
    // COMMANDS
    // =========================
    case "f":
        console.log("Order: Follow Commander");
        break;

    case "q":
        console.log("Order: Advance");
        break;

    case "r":
        console.log("Order: Retreat");
        break;

    case "e":
        console.log("Order: Stop");
        break;

    default:
        console.log(`Unassigned key pressed: ${key}`);
        break;
}
});function drawSupplyLines(ctx, x, y, factionColor, camera) {
    // Spacing increased slightly to account for the more detailed profile
    for (let i = 0; i < 5; i++) {
        const spacing = i * 85; 
        drawDetailedChineseWagon(ctx, x + spacing - camera.x, y - camera.y, factionColor);
    }
}

function drawDetailedChineseWagon(ctx, x, y, factionColor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.2, 1.2); // Balanced scale

    // --- 1. THE SHADOW ---
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 35, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- 2. THE CHASSIS (Heavy Timber) ---
    const woodDark = "#3e2723";
    const woodMid = "#5d4037";
    
    // Main base beams
    ctx.fillStyle = woodDark;
    ctx.fillRect(-28, 5, 56, 6); // Main floor
    ctx.fillStyle = woodMid;
    ctx.fillRect(-28, 5, 56, 2); // Top highlight of beam
    
    // Front shafts (The "Tongue" for the horse/ox)
    ctx.strokeStyle = woodDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-28, 8);
    ctx.lineTo(-45, 12);
    ctx.stroke();

    // --- 3. THE CANVAS COVER (Barrel Vault) ---
    const canvasBase = "#d7ccc8"; // Aged parchment/canvas color
    const canvasShadow = "#bcaaa4";
    
    // Draw the main cloth body
    ctx.fillStyle = canvasBase;
    ctx.beginPath();
    ctx.moveTo(-25, 5);
    // The "Barrel" arch
    ctx.bezierCurveTo(-25, -35, 25, -35, 25, 5);
    ctx.fill();

    // DRAW THE "LINES" (Structural Ribs/Folds)
    // This gives it the realistic bamboo-frame look instead of a flat "salt" texture
    ctx.save();
ctx.beginPath();
ctx.moveTo(-25, 5);
ctx.bezierCurveTo(-25, -35, 25, -35, 25, 5);
ctx.closePath();
ctx.clip();

ctx.strokeStyle = "rgba(0,0,0,0.12)";
ctx.lineWidth = 1;

for (let i = -20; i <= 20; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 5);
    ctx.lineTo(i, -30);
    ctx.stroke();
}

ctx.restore();

    // Front/Back Openings (The dark interior look)
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.moveTo(-25, 5);
    ctx.quadraticCurveTo(-25, -28, -18, -20);
    ctx.lineTo(-18, 5);
    ctx.fill();

    // --- 4. THE FACTION FLAG (Small & Detailed) ---
    ctx.strokeStyle = "#212121";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(15, -15);
    ctx.lineTo(15, -35); // Flag pole
    ctx.stroke();

    ctx.fillStyle = factionColor || "#cc0000";
    ctx.beginPath();
    ctx.moveTo(15, -35);
    ctx.lineTo(28, -30);
    ctx.lineTo(15, -25);
    ctx.fill();
    // Tiny flag detail
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();

    // --- 5. THE WHEELS (Large Chinese Spoked Wheels) ---
    // We draw two wheels, one slightly offset for 2.5D depth
    drawSpokedWheel(ctx, -16, 12, 10); // Front wheel
    drawSpokedWheel(ctx, 18, 12, 10);  // Back wheel

    ctx.restore();
}

function drawSpokedWheel(ctx, x, y, radius) {
    ctx.save();
    ctx.translate(x, y);
    
    // Outer Rim (Tire)
    ctx.strokeStyle = "#1a1a1a"; // Iron/Dark Wood rim
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Wood Rim
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
    ctx.stroke();

    // The Hub (Center)
    ctx.fillStyle = "#212121";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // The Spokes (12 Spokes for 13th Century style)
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(0, radius - 2);
        ctx.stroke();
    }

    ctx.restore();
}