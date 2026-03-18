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

    const canvas = document.createElement('canvas');
    canvas.width = BATTLE_WORLD_WIDTH;
    canvas.height = BATTLE_WORLD_HEIGHT;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = groundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    battleEnvironment.bgCanvas = canvas;
    battleEnvironment.grid = grid;
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
        // STEP 2: Initialize counts here so they are ready for deployArmy
        initialCounts: { player: 0, enemy: 0 } 
    };

    generateBattlefield(currentWorldMapTile.name || "Plains");

    playerObj.x = BATTLE_WORLD_WIDTH / 2;
    playerObj.y = BATTLE_WORLD_HEIGHT - 100;

// FIX: Pull the real troop count from the player object
    let playerTroopCount = playerObj.troops || 0; // Use actual troops, or 0 as a fallback
    
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
}
 

// --- ARMY DEPLOYMENT BASED ON FACTION RACE ---
function deployArmy(faction, totalTroops, side) {
	
	// 1. NEW: Track initial counts for the battle summary
    if (!currentBattleData.initialCounts) {
        currentBattleData.initialCounts = { player: 0, enemy: 0 };
    }
    currentBattleData.initialCounts[side] += totalTroops;

    // 2. Setup spawn coordinates
    let spawnY = side === "player" ? BATTLE_WORLD_HEIGHT - 300 : 300;
    let spawnXCenter = BATTLE_WORLD_WIDTH / 2;
    
    let factionColor = (typeof FACTIONS !== 'undefined' && FACTIONS[faction]) ? FACTIONS[faction].color : "#ffffff";
    let composition = [];
    
    // Dynamic Faction Logic
// Dynamic Faction Logic
// Dynamic Faction Logic
if (faction === "Great Khaganate") {
    composition = [
        {type: "Light Horse Archer", pct: 0.35},
        {type: "Horse Archer", pct: 0.30},
        {type: "Heavy Horse Archer", pct: 0.20},
        {type: "Lancer", pct: 0.10},
        {type: "Heavy Lancer", pct: 0.05}
    ];

} else if (faction === "Shahdom of Iransar") {
    composition = [
        {type: "Shielded Infantry", pct: 0.10},
        {type: "Archer", pct: 0.10},
        {type: "Spearman", pct: 0.10},

        {type: "Horse Archer", pct: 0.20},
        {type: "Heavy Lancer", pct: 0.20},

        {type: "Bomb", pct: 0.10},
        {type: "Heavy Horse Archer", pct: 0.20}
    ];

} else if (faction === "Hong Dynasty") {
    composition = [
        {type: "Shielded Infantry", pct: 0.40},
        {type: "Spearman", pct: 0.10},
        {type: "Poison Crossbowman", pct: 0.05},
        {type: "Repeater Crossbowman", pct: 0.10},
        {type: "Heavy Crossbowman", pct: 0.10},
{type: "Bomb", pct: 0.05},
        {type: "Firelance", pct: 0.05},
        {type: "Rocket", pct: 0.05},

        {type: "Archer", pct: 0.10}
    ];

} else if (faction === "Vietan Realm") {
    composition = [
        {type: "Shielded Infantry", pct: 0.15},
        {type: "Glaiveman", pct: 0.20},

        {type: "Repeater Crossbowman", pct: 0.15},
        {type: "Poison Crossbowman", pct: 0.15},

        {type: "Firelance", pct: 0.15},
        {type: "Archer", pct: 0.10},

        {type: "Heavy Horse Archer", pct: 0.10}
    ];

} else if (faction === "Jinlord Confederacy") {
    composition = [
        {type: "Shielded Infantry", pct: 0.15},
        {type: "Spearman", pct: 0.15},

        {type: "Crossbowman", pct: 0.20},
        {type: "Heavy Crossbowman", pct: 0.15},

        {type: "Hand Cannoneer", pct: 0.15},
        {type: "Heavy Lancer", pct: 0.10},

        {type: "Archer", pct: 0.10}
    ];

} else if (faction === "Xiaran Dominion") {
    composition = [
        {type: "Shielded Infantry", pct: 0.15},
        {type: "Heavy Shielded Spear", pct: 0.15},

        {type: "Crossbowman", pct: 0.15},
        {type: "Camel Cannon", pct: 0.15},

        {type: "Hand Cannoneer", pct: 0.15},
        {type: "Bomb", pct: 0.10},

        {type: "Lancer", pct: 0.15}
    ];

} else if (faction === "Goryun Kingdom") {
    composition = [
        {type: "Shielded Infantry", pct: 0.20},
        {type: "Heavy Shielded Spear", pct: 0.15},

        {type: "Heavy Crossbowman", pct: 0.15},
        {type: "Crossbowman", pct: 0.15},

        {type: "Hand Cannoneer", pct: 0.15},
        {type: "Rocket", pct: 0.10},

        {type: "Archer", pct: 0.10}
    ];

} else if (faction === "High Plateau Kingdoms") {
    composition = [
        {type: "Shielded Infantry", pct: 0.15},
        {type: "Spearman", pct: 0.15},

        {type: "Heavy Two Handed", pct: 0.20},
        {type: "Light Two Handed", pct: 0.15},

        {type: "Archer", pct: 0.15},
        {type: "Slinger", pct: 0.10},

        {type: "Lancer", pct: 0.10}
    ];

} else if (faction === "Yamato Clans") {
    composition = [
        {type: "Spearman", pct: 0.20},
        {type: "Glaiveman", pct: 0.20},

        {type: "Light Two Handed", pct: 0.15},
        {type: "Heavy Two Handed", pct: 0.10},

        {type: "Archer", pct: 0.20},

        {type: "Lancer", pct: 0.10},
        {type: "Heavy Horse Archer", pct: 0.05}
    ];

} else if (faction === "Bandits") {
    composition = [
		{		type: "Militia", pct: 0.60},        // Main Horde
        {type: "Spearman", pct: 0.40},           
 
    ];

} else {
    composition = [
        {type: "Shielded Infantry", pct: 0.25},
        {type: "Spearman", pct: 0.20},
        {type: "Archer", pct: 0.20},
        {type: "Crossbowman", pct: 0.15},
        {type: "Lancer", pct: 0.10},
        {type: "Light Two Handed", pct: 0.10}
    ];
}

    // Scale down rendering to prevent lag if armies are massive (e.g. 1 unit visually represents 10 troops)
    let visualScale = totalTroops > 300 ? 5 : 1; 
    let unitsToSpawn = Math.round(totalTroops / visualScale); // Use round instead of floor
	
	
  
// In your existing deployArmy function, replace the template generation with this:
    composition.forEach(comp => {
      let count = Math.round(unitsToSpawn * comp.pct) || (unitsToSpawn > 0 && comp.pct > 0 ? 1 : 0);
        let baseTemplate = UnitRoster.allUnits[comp.type];

        for (let i = 0; i < count; i++) {
            let offsetX = (Math.random() - 0.5) * 600;
            let offsetY = (Math.random() - 0.5) * 50;
            
            // Apply new tactical positions
            let tacticalOffset = getTacticalPosition(baseTemplate.role, side);
            offsetX += tacticalOffset.x;
            offsetY += tacticalOffset.y;

            // Deep copy the class instance so each unit has independent HP/Ammo
            let unitStats = Object.assign(
    new Troop(baseTemplate.name, baseTemplate.role, baseTemplate.isLarge, faction),
    baseTemplate
);
// PERSISTENCE FIX:
unitStats.experienceLevel = baseTemplate.experienceLevel || 1;
unitStats.morale = 20;    // Reset to current max for the new battle
unitStats.maxMorale = 20; // Ensure the cap is consistent
			
            unitStats.faction = faction;

            battleEnvironment.units.push({
				id: unitIdCounter++,
                side: side,
                faction: faction,
                color: factionColor,
                unitType: comp.type,
                stats: unitStats, // Now uses the robust Troop class
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


// --- Damage Logic ---

function calculateDamageReceived(attacker, defender, stateString) {

    const states = stateString.split(" ");

    let totalDamage = 0;

    

    // Check if the attacker is FORCED into melee by their current stance

    const isActuallyRangedAttacking = states.includes("ranged_attack") && attacker.currentStance === "statusrange";



    let attackValue = attacker.meleeAttack;

    let defenseValue = defender.meleeDefense;



    attackValue += (attacker.experienceLevel * 0.5);

    

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
            
            // FIX: Buff armor mitigation so heavy troops feel like actual tanks
            // Changed from 0.3 to 0.6 so 20 armor = 12 damage blocked
            totalDamage = Math.max(1, weaponDamage - (defender.armor * 0.6));
        }
    }

    

    if (attacker.stamina < 30) totalDamage *= 0.7;



let finalDamage = Math.floor(totalDamage);
    // If formatNumbersWithCommas is true, we still return a Number for calculations, 
    // but you can format it later in the UI.
    return finalDamage; 
}// Always return a pure number for math operations
 

// --- TACTICAL AI UPDATE LOOP ---
function updateBattleUnits() {
    let units = battleEnvironment.units;
    
    // Clean dead units
    battleEnvironment.units = units.filter(u => u.hp > 0);
    units = battleEnvironment.units;

// Initialize Flee Tracker for the UI
    if (!currentBattleData.fledCounts) currentBattleData.fledCounts = { player: 0, enemy: 0 };

units.forEach(unit => {
    // Only process morale for living, non-commander troops
    if (!unit.isCommander && unit.hp > 0) {
        let hpPct = unit.hp / unit.stats.health;
        
        // 1. BRAVERY FACTOR MATH
        // Armor of 50 = 1.0 (Full resistance). 
        // We cap it so higher armor (like Elephants at 60) doesn't break the game, 
        // just treats them as maximum bravery.
        let armorEffect = Math.min(unit.stats.armor / 50, 1.0);
        
        // 2. DEFINE BASE TICK (How fast morale drops based on health)
        // If they are critically wounded (<10% HP), the panic is faster.
let baseTick = (hpPct <= 0.1) ? 0.22 : (hpPct <= 0.6 ? 0.11 : 0);
        // 3. APPLY ARMOR MITIGATION
        // (1.1 - armorEffect) means:
        // - 0 Armor loses 1.1x base tick (~20-25 seconds to flee)
        // - 25 Armor loses 0.6x base tick (~50-60 seconds to flee)
        // - 50+ Armor loses 0.1x base tick (~5 minutes to flee)
        if (baseTick > 0) {
            unit.stats.morale -= baseTick * (1.1 - armorEffect);
        }

// 4. FLEEING STATE (Morale hits 0 - The "Shameful Display")
        if (unit.stats.morale <= 0) {
            unit.state = "moving"; 
            
            // A. Initialize escape point if they just started routing
            if (!unit.escapePoint) {
                let distToLeft = unit.x;
                let distToRight = BATTLE_WORLD_WIDTH - unit.x;
                let distToTop = unit.y;
                let distToBottom = BATTLE_WORLD_HEIGHT - unit.y;

                let minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

                // Set target point 100px outside the map for a clean exit
                if (minDist === distToLeft) unit.escapePoint = { x: -100, y: unit.y };
                else if (minDist === distToRight) unit.escapePoint = { x: BATTLE_WORLD_WIDTH + 100, y: unit.y };
                else if (minDist === distToTop) unit.escapePoint = { x: unit.x, y: -100 };
                else unit.escapePoint = { x: unit.x, y: BATTLE_WORLD_HEIGHT + 100 };
            }

            // B. Move toward the escape point (with 50% adrenaline speed boost)
            let dx = unit.escapePoint.x - unit.x;
            let dy = unit.escapePoint.y - unit.y;
            let dist = Math.hypot(dx, dy);

            if (dist > 5) {
                unit.x += (dx / dist) * (unit.stats.speed * 1.5);
                unit.y += (dy / dist) * (unit.stats.speed * 1.5);
            }

            // C. DESERTION CONDITION: Remove only once they touch the "Black Border"
            let isOffMap = (unit.x < 0 || unit.x > BATTLE_WORLD_WIDTH || 
                            unit.y < 0 || unit.y > BATTLE_WORLD_HEIGHT);

            if (isOffMap) { 
                unit.hp = 0; // This triggers your .filter clean-up on the next frame
                if (currentBattleData && currentBattleData.fledCounts) {
                    currentBattleData.fledCounts[unit.side]++;
                }
            }

            return; // Skip combat/targeting logic because they've thrown down their weapons
        }
    }
    
    // ... rest of your combat/movement logic
 
        // -----------------------

        // 1. Find nearest enemy if no target
		

        // 1. Find nearest enemy if no target
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

// Inside your existing updateBattleUnits function:
        // ... (Keep the target finding logic)
// 2. Act on target
        if (unit.target) {
            let dx = unit.target.x - unit.x;
            let dy = unit.target.y - unit.y;
            // FIX: Use Math.hypot to get the true linear distance
			let dist = Math.hypot(dx, dy);

            // NEW: Update RPG Stance based on distance
            unit.stats.updateStance(dist);
// ---> 1. ADD THIS LINE: Shrink range if they are using melee <---
            let effectiveRange = unit.stats.currentStance === "statusmelee" ? 20 : unit.stats.range;
            // Move into range
           if (dist > effectiveRange*0.8) {
                unit.state = "moving";
                if (Math.random() > 0.9) unit.stats.stamina = Math.max(0, unit.stats.stamina - 1);
                
                let speedMod = 1.0;
                let tx = Math.floor(unit.x / BATTLE_TILE_SIZE);
                let ty = Math.floor(unit.y / BATTLE_TILE_SIZE);
                if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 4) speedMod = 0.4;
                if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 7) speedMod = 0.6;

                // --- MORALE BACK-OFF LOGIC (Morale 1 to 9) ---
                if (!unit.isCommander && unit.stats.morale > 0 && unit.stats.morale < 10) {
                    let dir = unit.side === "player" ? 1 : -1;
                    let safeEdge = unit.side === "player" ? BATTLE_WORLD_HEIGHT - 100 : 100; // Keep them in bounds
                    let notAtEdge = unit.side === "player" ? unit.y < safeEdge : unit.y > safeEdge;
                    
                    if (notAtEdge) {
                        unit.y += (unit.stats.speed * speedMod * 0.5) * dir; // Slowly drift backward
                        unit.x += (Math.random() - 0.5); // Slight nervous wiggle
                    }
                } else {
                    // Normal Advance
                    unit.x += (dx / dist) * (unit.stats.speed * speedMod);
                    unit.y += (dy / dist) * (unit.stats.speed * speedMod);
                }
            } else {
                // In range: Attack
unit.state = "attacking";
if (unit.cooldown <= 0) {
    if (unit.stats.currentStance === "statusrange") {
        
        // --- REPEATER BURST LOGIC ---
        let isRepeater = unit.unitType === "Repeater Crossbowman";
        
        // 1. Determine the reload/fire rate
        if (isRepeater && unit.stats.magazine > 1) {
            unit.cooldown = 5; // Rapid fire speed
            unit.stats.magazine--; 
        } else {
            // Standard Reload or Long Reload for Repeater
    // Ask the 'Reload Brain' for the correct speed based on unit type
unit.cooldown = getReloadTime(unit);
            if (isRepeater) unit.stats.magazine = 10; // Reset magazine
        }
  unit.stats.ammo--; 
        let spread = (100 - unit.stats.accuracy) * 0.6;

let targetX = unit.target.x + (Math.random() - 0.5) * spread;
let targetY = unit.target.y + (Math.random() - 0.5) * spread;
        battleEnvironment.projectiles.push({
            x: unit.x, y: unit.y, 
            tx: unit.target.x, ty: unit.target.y,
            attackerStats: unit.stats,
            target: unit.target,
           projectileType: (unit.unitType === "Rocket") ? "Archer" : unit.unitType,
            isFire: unit.unitType === "Firelance" || unit.unitType === "Bomb"|| unit.unitType === "Rocket",
        });
		
		// ---> PASTE HERE <---
        // Play appropriate ranged sound effect
        if (unit.unitType === "Bomb" || unit.unitType === "Camel Cannon") {
            AudioManager.playSound('bomb');
        } else if (unit.unitType === "Firelance" || unit.unitType === "Hand Cannoneer" || unit.unitType === "Rocket") {
            AudioManager.playSound('firelance');
        } else {
            AudioManager.playSound('arrow');
        }
		
    } else {
        // ... rest of your melee logic
                        // NEW: Melee Damage Calculation
                        unit.cooldown = 60;
                        
                        // Build state string (e.g., check if target is facing away for "flanked")
                        let stateStr = "melee_attack";
                        if (unit.stats.role === ROLES.CAVALRY) stateStr += " charging";
                        
                        let dmg = calculateDamageReceived(unit.stats, unit.target.stats, stateStr);
                        unit.target.hp -= dmg;
                        // ---> ADD THIS SHOCK DAMAGE <---
// If the hit takes away more than 25% of their total health in one swing, they lose chunk of morale instantly
if (dmg > (unit.target.stats.health * 0.25)) {
    unit.target.stats.morale -= 5; // Instant 25% morale drop
}
						// ---> PASTE HERE <---
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
		
                        unit.target.x += (dx / dist) * 5;
                        unit.target.y += (dy / dist) * 5;
                    }
                }
        }
        } else {
            unit.state = "idle";
            // Recover stamina when idle
            if (unit.stats.stamina < 100 && Math.random() > 0.9) unit.stats.stamina++;
        }
battleEnvironment
        if (unit.cooldown > 0) unit.cooldown--;
    });

    // Update Projectiles logic
    for (let i = battleEnvironment.projectiles.length - 1; i >= 0; i--) {
    let p = battleEnvironment.projectiles[i];
        let dx = p.tx - p.x;
        let dy = p.ty - p.y;
        let dist = Math.hypot(dx, dy);
        
        if (dist < 10) {
            if (p.target) {
                // NEW: Ranged Damage Calculation on impact
                let dmg = calculateDamageReceived(p.attackerStats, p.target.stats, "ranged_attack");
                p.target.hp -= dmg;
				
				// ---> PASTE HERE <---
                if (dmg > 0) {
                    AudioManager.playSound('hit');
                } else {
                    AudioManager.playSound('shield_block'); // Arrow hit a shield
                }
				
            }
            battleEnvironment.projectiles.splice(i, 1);
        } else {
            p.x += (dx / dist) * 8;
            p.y += (dy / dist) * 8;
        }
    }
}


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
});