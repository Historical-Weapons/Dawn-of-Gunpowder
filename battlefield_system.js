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
    projectiles: [], // For arrows and fire lances
	groundEffects: [] // ---> NEW: For stuck ground projectiles and bomb craters
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
	
	
	// --- RENDER TOTAL WAR DRAG LINE ---
    if (typeof isRightDragging !== 'undefined' && isRightDragging) {
        ctx.save();
        
        // 1. Draw the main dragged line
        ctx.strokeStyle = "rgba(0, 150, 255, 0.6)"; // Tactical Blue
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(dragStartPos.x, dragStartPos.y);
        ctx.lineTo(dragCurrentPos.x, dragCurrentPos.y);
        ctx.stroke();

        // 2. Draw ghost markers showing exactly where units will stand
        const dx = dragCurrentPos.x - dragStartPos.x;
        const dy = dragCurrentPos.y - dragStartPos.y;
        const dragDist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        
        const playerUnits = battleEnvironment.units.filter(u => u.selected && u.hp > 0);
        const MIN_SPACING = 12; // Must match the value in battlefield_commands.js
        let spacing = dragDist / Math.max(1, playerUnits.length - 1);
        if (spacing < MIN_SPACING) spacing = MIN_SPACING;

        const centerX = dragStartPos.x + dx / 2;
        const centerY = dragStartPos.y + dy / 2;

        ctx.fillStyle = "rgba(0, 150, 255, 0.7)";
        playerUnits.forEach((u, index) => {
            const offsetDist = (index - (playerUnits.length - 1) / 2) * spacing;
            const markerX = centerX + Math.cos(angle) * offsetDist;
            const markerY = centerY + Math.sin(angle) * offsetDist;
            
            // Draw a ghost circle for each unit
            ctx.beginPath();
            ctx.arc(markerX, markerY, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
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
		composition.sort((a, b) => a.pct - b.pct);

        // Override totalTroops to match the actual roster size
        totalTroops = totalRosterSize;

    } else {
   // =========================================================
// ENEMY AI: Updated Composition Templates (v2.1)
// =========================================================

if (faction === "Great Khaganate") {
    composition = [
        {type: "Horse Archer", pct: 0.50}, 
        {type: "Heavy Horse Archer", pct: 0.20},
        {type: "Mangudai", pct: 0.10}, 
        {type: "Lancer", pct: 0.15}, 
        {type: "Heavy Lancer", pct: 0.05}
    ];
} else if (faction === "Shahdom of Iransar") {
    // Replaced Firelance with Shielded Infantry for a more traditional Persian-style front line
    composition = [
        {type: "War Elephant", pct: 0.05}, 
        {type: "Heavy Lancer", pct: 0.25}, 
        {type: "Horse Archer", pct: 0.25},
        {type: "Spearman", pct: 0.25}, 
        {type: "Shielded Infantry", pct: 0.20} 
    ];
} else if (faction === "Hong Dynasty") {
    composition = [
{type: "Shielded Infantry", pct: 0.30}, 
        {type: "Heavy Crossbowman", pct: 0.25}, 
        {type: "Rocket", pct: 0.15},
        {type: "Firelance", pct: 0.05}, 
        {type: "Repeater Crossbowman", pct: 0.05}, 
        {type: "Heavy Firelance", pct: 0.05}, 
        {type: "Bomb", pct: 0.05},
        {type: "Archer", pct: 0.05}
    ];
} else if (faction === "Vietan Realm") {
    composition = [
        {type: "Glaiveman", pct: 0.30}, 
        {type: "Poison Crossbowman", pct: 0.25}, 
        {type: "Javelinier", pct: 0.20},
        {type: "Archer", pct: 0.15}, 
        {type: "Spearman", pct: 0.10}
    ];
} else if (faction === "Jinlord Confederacy") {
    composition = [
 {type: "Archer", pct: 0.20}, 
        {type: "Heavy Crossbowman", pct: 0.30},
        {type: "Shielded Infantry", pct: 0.20},
        {type: "Hand Cannoneer", pct: 0.15}, 
        {type: "Heavy Lancer", pct: 0.10}, 
        {type: "Elite Lancer", pct: 0.05}
    ];
} else if (faction === "Xiaran Dominion") {
    composition = [
        {type: "Camel Cannon", pct: 0.20}, 
        {type: "Hand Cannoneer", pct: 0.20}, 
        {type: "Slinger", pct: 0.25},
        {type: "Spearman", pct: 0.20}, 
        {type: "Lancer", pct: 0.15}
    ];
} else if (faction === "Goryun Kingdom") {
    composition = [
		{type: "Archer", pct: 0.40}, 
        {type: "Spearman", pct: 0.20}, 
        {type: "Shielded Infantry", pct: 0.20},
        {type: "Rocket", pct: 0.10}, 
        {type: "Hand Cannoneer", pct: 0.05}, 
        {type: "Repeater Crossbowman", pct: 0.05}
    ];
} else if (faction === "High Plateau Kingdoms") {
    // Tibet-inspired: Heavy on skirmishers and high-altitude endurance
    composition = [
        {type: "Slinger", pct: 0.30}, 
        {type: "Heavy Horse Archer", pct: 0.20}, 
        {type: "Archer", pct: 0.25}, 
        {type: "Shielded Infantry", pct: 0.25}
    ];
} else if (faction === "Yamato Clans") {
    composition = [
        {type: "Glaiveman", pct: 0.40}, 
        {type: "Heavy Two Handed", pct: 0.20}, 
        {type: "Archer", pct: 0.30},
        {type: "Heavy Horse Archer", pct: 0.10}
    ];
} else if (faction === "Bandits") {
    composition = [
        {type: "Militia", pct: 0.70}, 
        {type: "Slinger", pct: 0.15}, 
        {type: "Javelinier", pct: 0.15}
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
	}}

    currentBattleData.initialCounts[side] += totalTroops;

   // --- 3. Spawning Engine (Distributed side-by-side) ---
let visualScale = totalTroops > 300 ? 5 : 1; 
let unitsToSpawn = Math.round(totalTroops / visualScale); 

// First, calculate the total width of all "Line" units (non-cavalry)
// This ensures we can center the entire army perfectly.
let totalLineWidth = 0;
const spacingX = 18;
const groupGap = 40; // Pixels between different unit types

composition.forEach(comp => {
    let baseTemplate = UnitRoster.allUnits[comp.type];
    if (baseTemplate && !baseTemplate.role.toLowerCase().includes("cavalry") && !baseTemplate.role.toLowerCase().includes("horse")) {
        let count = Math.round(unitsToSpawn * comp.pct);
        if (count > 0) {
            let unitsPerRow = 15;
            let groupWidth = Math.min(count, unitsPerRow) * spacingX;
            totalLineWidth += groupWidth + groupGap;
        }
    }
});

let currentLineXOffset = -(totalLineWidth / 2);
let spawnedSoFar = 0;

composition.forEach(comp => {
    let count = Math.round(unitsToSpawn * comp.pct);
    if (count === 0 && unitsToSpawn > 0) count = 1;
    count = Math.min(count, unitsToSpawn - spawnedSoFar);
    
    let baseTemplate = UnitRoster.allUnits[comp.type];
    if (!baseTemplate) {
        console.warn(`Unit type ${comp.type} missing! Defaulting to Militia.`);
        baseTemplate = UnitRoster.allUnits["Militia"];
    }

    // Grid Constants
    const unitsPerRow = 15;
    const spacingY = 16;
    const dir = (side === "player") ? -1 : 1;
    const rankDir = (side === "player") ? 1 : -1; 

    // Determine if this is a wing (cavalry) or center-line unit
    const isFlank = baseTemplate.role.toLowerCase().includes("cavalry") || 
                    baseTemplate.role.toLowerCase().includes("horse");

    let groupWidth = Math.min(count, unitsPerRow) * spacingX;

    for (let i = 0; i < count; i++) {
        let row = Math.floor(i / unitsPerRow);
        let col = i % unitsPerRow;

        // 1. Get Tactical Position (Vertical lines and Flank X)
        let tacticalX = 0;
        let tacticalY = 0;
        if (typeof getTacticalPosition === 'function') {
            let tPos = getTacticalPosition(baseTemplate.role, side, comp.type);
            tacticalX = tPos.x;
            tacticalY = tPos.y;
        }

        // 2. Calculate X/Y based on unit type
        let finalX, finalY;
        
        if (isFlank) {
            // Cavalry uses the tacticalX (far left or far right) and centers its own block
            let internalX = (col * spacingX) - (groupWidth / 2);
            finalX = spawnXCenter + tacticalX + internalX;
        } else {
            // Line units (Infantry/Archers) use the running horizontal offset
            finalX = spawnXCenter + currentLineXOffset + (col * spacingX);
            // Move offset to the next rank if necessary is handled by finalY
        }

        let gridY = row * spacingY * rankDir;
        finalY = spawnY + tacticalY + gridY;

        // 3. Human Jitter
        finalX += (Math.random() - 0.5) * 3;
        finalY += (Math.random() - 0.5) * 2;

        // 4. Create Troop and Push
        let unitStats = Object.assign(
            new Troop(baseTemplate.name, baseTemplate.role, baseTemplate.isLarge, faction),
            baseTemplate
        );
        unitStats.morale = 20;    
        unitStats.maxMorale = 20; 
        unitStats.faction = faction;

        battleEnvironment.units.push({
            id: unitIdCounter++,
            side: side,
            faction: faction,
            color: factionColor,
            unitType: comp.type, 
            stats: unitStats, 
            hp: unitStats.health,
            x: finalX,
            y: finalY,
            target: null,
            state: "idle", 
            animOffset: Math.random() * 100,
            cooldown: 0,
            hasOrders: false
        });
    }

    // If it was a line unit, move the "cursor" for the next group to the right
    if (!isFlank) {
        currentLineXOffset += groupWidth + groupGap;
    }
    
    spawnedSoFar += count;
});
	
	
	
}
// --- Damage Logic ---

function isFlanked(attacker, defender) {
    if (!attacker || !defender) return false;
    if (attacker.hp <= 0 || defender.hp <= 0) return false;
    if (attacker.isDummy || defender.isDummy) return false;

    // If the defender is not actively engaging someone, we cannot infer facing safely.
    const facingTarget = defender.target;
    if (!facingTarget || facingTarget.hp <= 0 || facingTarget.isDummy) return false;

    // Vector from defender -> defender's current target (the way defender is "facing")
    const fx = facingTarget.x - defender.x;
    const fy = facingTarget.y - defender.y;

    // Vector from defender -> attacker
    const ax = attacker.x - defender.x;
    const ay = attacker.y - defender.y;

    const fMag = Math.hypot(fx, fy);
    const aMag = Math.hypot(ax, ay);

    if (fMag < 0.001 || aMag < 0.001) return false;

    let cosTheta = (fx * ax + fy * ay) / (fMag * aMag);

    // Clamp for numerical safety
    cosTheta = Math.max(-1, Math.min(1, cosTheta));

    const angleDeg = Math.acos(cosTheta) * (180 / Math.PI);

    // 120°+ means side/rear attack.
    // Higher number = safer, fewer false positives.
    return angleDeg >= 120;
}


function calculateDamageReceived(attacker, defender, stateString) {

    const states = stateString.split(" ");

    let totalDamage = 0;

    

    // Check if the attacker is FORCED into melee by their current stance

    const isActuallyRangedAttacking = states.includes("ranged_attack") && attacker.currentStance === "statusrange";



    let attackValue = attacker.meleeAttack;

    let defenseValue = defender.meleeDefense;

// SURGERY: Add fallback to 0 to prevent NaN damage if a unit has no experience value
    attackValue += ((attacker.experienceLevel || 0) * 2); 
    defenseValue += ((defender.experienceLevel || 0) * 2);
    

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
const now = Date.now();

    if (typeof processTacticalOrders === 'function') {
        processTacticalOrders();
    }

    // --- REVISED SURGERY: Keep dead units for 10 seconds ---
   battleEnvironment.units = battleEnvironment.units.filter(u => {
    if (u.removeFromBattle) return false;

    if (u.hp <= 0) {
        if (!u.deathTime) handleUnitDeath(u);
        return (now - u.deathTime) < 10000;
    }

    return true;
});

    let units = battleEnvironment.units;
    
    /* Clean dead units and initialize global battle trackers */
    //battleEnvironment.units = units.filter(u => u.hp > 0);
    //units = battleEnvironment.units;

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
        
		// --- DEATH HOOK ---
				if (unit.hp <= 0) {
					handleUnitDeath(unit);
					return; // Skip normal AI/Movement for dead units
				}

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
    unit.state = "retreated";
    unit.removeFromBattle = true;
    unit.target = null;
    unit.cooldown = 0;

    let sideTotal = currentBattleData.initialCounts[unit.side] || 0;
    let scale = sideTotal > 300 ? 5 : 1;
    currentBattleData.fledCounts[unit.side] += scale;
    return;
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
			if (other.side !== unit.side && other.hp > 0) {
							let dist = Math.hypot(unit.x - other.x, unit.y - other.y);
							if (dist < nearestDist) {
								nearestDist = dist;
								nearestEnemy = other;
							}
						}
					});
					unit.target = nearestEnemy;
				}
			  // --- TRACK POSITION BEFORE MOVEMENT ---
			let oldX = unit.x;
			let oldY = unit.y;
			
			if (unit.target) 
			{
			let dx = unit.target.x - unit.x;
			let dy = unit.target.y - unit.y;
			let dist = Math.hypot(dx, dy);

			unit.stats.updateStance(dist);
			let effectiveRange = unit.stats.currentStance === "statusmelee" ? 30 : unit.stats.range;

		  

			if (dist > effectiveRange * 0.8) {
				// Only AI units auto-move
			   // --- INSIDE YOUR if (dist > effectiveRange * 0.8) BLOCK ---

		// Only AI units auto-move
				if (!unit.isCommander) {
					
					// --- NEW: HOLD POSITION & PANIC LOGIC ---
					let shouldHold = false;
					
					// Only apply holding logic to allied units that haven't received explicit player orders
					if (unit.side === "player" && !unit.hasOrders) {
						if (unit.stats.isRanged) {
							// Ranged units stay put and let enemies walk into their killzone
							shouldHold = true; 
						} else if (dist > 50) {
							// Melee units hold the shield wall UNTIL enemies breach 50px (Panic Charge)
							shouldHold = true;
						}
					}

					// Execute movement or hold ground
					if (shouldHold) {
						// Bypass movement coordinates entirely
						unit.state = "idle";
						if (unit.stats.stamina < 100 && Math.random() > 0.9) unit.stats.stamina++;
					} else {
						// --- EXISTING TARGET PURSUIT LOGIC ---
						if (Math.random() > 0.9) unit.stats.stamina = Math.max(0, unit.stats.stamina - 1);

						let speedMod = 1.0;
						let tx = Math.floor(unit.x / BATTLE_TILE_SIZE);
						let ty = Math.floor(unit.y / BATTLE_TILE_SIZE);

						if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 4) speedMod = 0.4; // Forest/Mud
						if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 7) speedMod = 0.6; // Broken Ground

						if (unit.stats.morale > 3 && unit.stats.morale < 10) {
							// Skirmishing/Retreating logic
							let dir = unit.side === "player" ? 1 : -1;
							let safeEdge = unit.side === "player" ? BATTLE_WORLD_HEIGHT - 100 : 100;
							let notAtEdge = unit.side === "player" ? unit.y < safeEdge : unit.y > safeEdge;

							if (notAtEdge) {
								unit.y += (unit.stats.speed * speedMod * 0.5) * dir;
								unit.x += (Math.random() - 0.5);
							}
						} else {
							// Standard Aggressive Movement
		// Remove the (Math.random() - 0.5) * 0.2 noise entirely for a clean line
		unit.x += (dx / dist) * (unit.stats.speed * speedMod);
		unit.y += (dy / dist) * (unit.stats.speed * speedMod);
						}
					}

					// --- DYNAMIC STATE DETECTION ---
					let hasMoved = Math.abs(unit.x - oldX) > 0.1 || Math.abs(unit.y - oldY) > 0.1;
					if (hasMoved) { unit.state = "moving"; } 
					else if (unit.state !== "attacking") { unit.state = "idle"; } 
				}
				//commander doesn't need else for commands and attack logic is later

		} // end if (dist > effectiveRange * 0.8) {
			else { //attack logic
				
				// ---> SURGERY: STAND DOWN IF TARGET IS A WAYPOINT <---
				if (unit.target.isDummy) {
					// We reached our formation spot. Stand idle and recover stamina.
					if (!unit.isCommander) {
						unit.state = "idle";
					}
					if (unit.stats.stamina < 100 && Math.random() > 0.9) unit.stats.stamina++;
				} 
				else {
					// ---> NORMAL COMBAT EXECUTION <---
					// FIX: Only set state to "attacking" if this isn't the Commander OR if the Commander isn't moving
					if (!unit.isCommander || !player.isMoving) {
						unit.state = "attacking";
					}
						 
					if (unit.cooldown <= 0) {
							if (unit.stats.currentStance === "statusrange") {
								
									/* Ranged Combat */
									let isRepeater = unit.unitType === "Repeater Crossbowman";
									
									if (isRepeater && unit.stats.magazine > 0) { 
									//repeater burst 
										unit.cooldown = 30; //0.5 sec a shot
										unit.stats.magazine--; 
									} else {
									//reload
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
						   unit.cooldown = getReloadTime(unit);
								
								let stateStr = "melee_attack";

									if (unit.stats.role === ROLES.CAVALRY) stateStr += " charging";

									if (isFlanked(unit, unit.target)) {
										stateStr += " flanked";
									}

								let dmg = calculateDamageReceived(unit.stats, unit.target.stats, stateStr);
								unit.target.hp -= dmg;
								
								// --- EXP GAIN SURGERY (MELEE) ---
								if (unit.side === "player" && unit.stats.gainExperience) {
									// Commander gets 80% less (0.05), Ally troops gain much faster (0.35)
									let baseExp = unit.isCommander ? 0.05 : 0.35; 
									if (unit.target.hp <= 0) baseExp *= 3; // Triple EXP for a kill
									unit.stats.gainExperience(baseExp);
									
									// 2. SURGERY: If it's the Commander, also update the Global Persistent Player
									if (unit.isCommander) {
										gainPlayerExperience(baseExp);
									}
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
			}
		} else {
		// Make sure we don't accidentally freeze the Commander here either
			if (!unit.isCommander) {
				unit.state = "idle";
			}
			if (unit.stats.stamina < 100 && Math.random() > 0.9) unit.stats.stamina++;
		}

		if (unit.cooldown > 0) unit.cooldown--;
});//end for loop in beginning

// ---> collison<---
applyUnitCollisions(units);

// ---> 30 SECOND CLEANUP LOGIC <---
    const THIRTY_SECONDS = 30000;
    const nowTime = Date.now();
    
    if (battleEnvironment.groundEffects) {
        battleEnvironment.groundEffects = battleEnvironment.groundEffects.filter(g => (nowTime - g.timestamp) < THIRTY_SECONDS);
    }
    
    battleEnvironment.units.forEach(u => {
        if (u.stuckProjectiles) {
            u.stuckProjectiles = u.stuckProjectiles.filter(sp => (nowTime - sp.timestamp) < THIRTY_SECONDS);
        }
    });

/* 4. UPDATE PROJECTILES (PHYSICS BASED COLLISION) */
    for (let i = battleEnvironment.projectiles.length - 1; i >= 0; i--) {
        let p = battleEnvironment.projectiles[i];
        
        // 1. Move projectile along its vector
        p.x += p.vx;
        p.y += p.vy;
        
        let role = p.attackerStats ? p.attackerStats.role : "";
        let name = p.attackerStats ? p.attackerStats.name : "";
        
        let isJavelin = name === "Javelinier";
        let isBolt = role === "crossbow" || role === "crossbowman";
        let isArrow = role === "archer" || role === "horse_archer";
        let isSlinger = name === "Slinger";
        let isRocket = (p.projectileType === "rocket") || (p.attackerStats && p.attackerStats.name.includes("Rocket"));
        let isBomb = role === "bomb" || name === "Bomb";
        
// 2. Range & Bounds Check (Hit the Ground)
let distFlown = Math.hypot(p.x - p.startX, p.y - p.startY);
if (distFlown > p.maxRange || 
    p.x < -200 || p.x > BATTLE_WORLD_WIDTH + 200 || 
    p.y < -200 || p.y > BATTLE_WORLD_HEIGHT + 200) {

    if (isJavelin || isBolt || isArrow || isSlinger || isRocket || isBomb) {
        if (!battleEnvironment.groundEffects) battleEnvironment.groundEffects = [];
        if (battleEnvironment.groundEffects.length < 400) {

            let effectType = isJavelin ? "javelin"
                : (isBolt ? "bolt"
                : (isSlinger ? "stone"
                : (isRocket ? "rocket"
                : (isBomb ? "bomb_crater" : "arrow"))));

            const bounceChance = 0.30;
            const landedX = p.x + (Math.random() - 0.5) * 18;
            const landedY = p.y + (Math.random() - 0.5) * 18;

            let landedAngle = Math.atan2(p.vy, p.vx) + (Math.random() - 0.5) * 0.9;

            // 30% of the time, add a stronger "bounce" style angle shift
            if (Math.random() < bounceChance) {
                landedAngle += (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.7);
            }

            battleEnvironment.groundEffects.push({
                type: effectType,
                x: landedX,
                y: landedY,
                angle: landedAngle,
                timestamp: Date.now()
            });
        }
    }

    battleEnvironment.projectiles.splice(i, 1);
    continue;
}

        // 3. Physical Hitbox Collision
        let hitMade = false;
        
        for (let j = 0; j < units.length; j++) {
            let u = units[j];
            
            // Only check living enemies
            if (u.hp > 0 && u.side !== p.side) {
                let hitbox = u.stats.isLarge ? 16 : 8; 
                let distToUnit = Math.hypot(p.x - u.x, p.y - u.y);
                
                if (distToUnit < hitbox) {
                    hitMade = true;
                    let dmg = calculateDamageReceived(p.attackerStats, u.stats, "ranged_attack");
                    u.hp -= dmg;

                    // Stick to Unit Bodies
                    if (isJavelin || isBolt || isArrow || isSlinger || isRocket) {
                        if (!u.stuckProjectiles) u.stuckProjectiles = [];
                        if (u.stuckProjectiles.length < 4) {
                            let effectType = isJavelin ? "javelin" : (isBolt ? "bolt" : (isSlinger ? "stone" : (isRocket ? "rocket" : "arrow")));
                            u.stuckProjectiles.push({
                                type: effectType,
                                offsetX: p.x - u.x, 
                                offsetY: p.y - u.y,
                                angle: Math.atan2(p.vy, p.vx),
                                timestamp: Date.now()
                            });
                        }
                    }
                    
                    // Bomb direct hits create craters directly under the unit
                    if (isBomb) {
                        if (!battleEnvironment.groundEffects) battleEnvironment.groundEffects = [];
                        battleEnvironment.groundEffects.push({
                            type: "bomb_crater",
                            x: p.x, y: p.y, angle: 0, timestamp: Date.now()
                        });
                    }
                    
                    // EXP and Audio Logic
                    let attackerUnit = battleEnvironment.units.find(a => a.stats === p.attackerStats);
                    if (attackerUnit && attackerUnit.side === "player" && p.attackerStats.gainExperience) {
                        let baseExp = attackerUnit.isCommander ? 0.05 : 0.35; 
                        if (u.hp <= 0) baseExp *= 3; 
                        p.attackerStats.gainExperience(baseExp);
                        if (attackerUnit.isCommander) gainPlayerExperience(baseExp);
                    }
                    
                    if (dmg > 0) AudioManager.playSound('hit');
                    else AudioManager.playSound('shield_block');
                    
                    break; 
                }
            }
        }
        
        if (hitMade) battleEnvironment.projectiles.splice(i, 1);
    }
    }
	
	
	

// --- DYNAMIC TIERED COLLISION ENGINE ---
function applyUnitCollisions(units) {
    for (let i = 0; i < units.length; i++) {
        let u1 = units[i];
        if (u1.hp <= 0 || u1.state === "FLEEING") continue; 

        for (let j = i + 1; j < units.length; j++) {
            let u2 = units[j];
            if (u2.hp <= 0 || u2.state === "FLEEING") continue;

// REVISION: Multiply the combined radius by 0.6 to shrink the collision bubble.
            // If both units have radius 10, minDistance becomes 12 instead of 20.
            // 12 is less than the 16-pixel attack threshold. Perfect.
            let minDistance = (u1.stats.radius + u2.stats.radius) * 0.6;
            let dx = u2.x - u1.x;
            let dy = u2.y - u1.y;
            let distSq = dx * dx + dy * dy;

            if (distSq < minDistance * minDistance && distSq > 0) {
                let dist = Math.sqrt(distSq);
                let overlap = minDistance - dist;

                let nx = dx / dist;
                let ny = dy / dist;

                let push1 = 0;
                let push2 = 0;

                // --- THE HIERARCHY RULE ---
                if (u1.stats.weightTier > u2.stats.weightTier) {
                    // u1 is heavier. u2 takes 100% of the displacement.
                    push2 = overlap; 
                    push1 = 0;       
                } 
                else if (u2.stats.weightTier > u1.stats.weightTier) {
                    // u2 is heavier. u1 takes 100% of the displacement.
                    push1 = overlap; 
                    push2 = 0;       
                } 
                else {
                    // Same Tier? Distribute the push based on exact mass.
                    let totalMass = u1.stats.mass + u2.stats.mass;
                    push1 = (u2.stats.mass / totalMass) * overlap;
                    push2 = (u1.stats.mass / totalMass) * overlap;
                }

                // Apply physical separation
                u1.x -= nx * push1;
                u1.y -= ny * push1;
                u2.x += nx * push2;
                u2.y += ny * push2;
            }
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

// Shared function to draw stuck projectiles and bomb marks
function drawStuckProjectileOrEffect(ctx, type) {
    if (type === "javelin") {
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = "#bdbdbd"; ctx.beginPath();
        ctx.moveTo(8, 0); ctx.lineTo(6, -2.5); ctx.lineTo(16, 0); ctx.lineTo(6, 2.5); ctx.fill();
    } else if (type === "bolt") {
        ctx.fillStyle = "#5d4037"; ctx.fillRect(-4, -1, 8, 2);
        ctx.fillStyle = "#757575"; ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(9, 0); ctx.lineTo(4, 2); ctx.fill();
        ctx.fillStyle = "#8d6e63"; ctx.fillRect(-5, -1.5, 3, 3);
    } else if (type === "stone") {
        ctx.fillStyle = "#9e9e9e"; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (type === "rocket") {
        ctx.scale(0.5, 0.5); // Scaled down for sticking
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(12, 0); ctx.stroke();
         ctx.fillStyle = "#4e342e"; ctx.fillRect(-6, 0.5, 14, 2.2);
        ctx.fillStyle = "#424242"; ctx.beginPath(); ctx.moveTo(12, -1.2); ctx.lineTo(20, 0); ctx.lineTo(12, 1.2); ctx.fill();
        ctx.scale(2, 2); // Reset scale
    } else if (type === "bomb_crater") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#424242"; // Shrapnel fragments
        ctx.fillRect(3, -5, 2, 2); ctx.fillRect(-6, 4, 1.5, 1.5); ctx.fillRect(5, 6, 2.5, 2.5); ctx.fillRect(-7, -3, 2, 2);
    } else { // arrow
        ctx.fillStyle = "#8d6e63"; ctx.fillRect(-6, -0.5, 12, 1);
        ctx.fillStyle = "#9e9e9e"; ctx.beginPath(); ctx.moveTo(6, -1.5); ctx.lineTo(11, 0); ctx.lineTo(6, 1.5); ctx.fill();
        ctx.fillStyle = "#4caf50"; ctx.fillRect(-7, -1.5, 4, 1); ctx.fillRect(-7, 0.5, 4, 1);
    }
}

function leaveBattlefield(playerObj) {
    console.log("Leaving battlefield. Restoring overworld state...");

    // --- 1. THE MODE SWITCH (CRITICAL FIX) ---
    // We flip this to FALSE immediately so the next frame draws the map, not the grass.
    inBattleMode = false; 

    // --- 2. EMERGENCY COORDINATE & CAMERA RESTORATION ---
    if (playerObj && savedWorldPlayerState_Battle) {
        if (savedWorldPlayerState_Battle.x !== 0 && savedWorldPlayerState_Battle.y !== 0) {
            playerObj.x = savedWorldPlayerState_Battle.x;
            playerObj.y = savedWorldPlayerState_Battle.y;
        }
    }

    // Update camera immediately so the map isn't showing 0,0 for one frame
    if (typeof camera !== 'undefined') {
        camera.x = playerObj.x - canvas.width / 2;
        camera.y = playerObj.y - canvas.height / 2;
    }

    // --- 3. CALCULATE BATTLE RESULTS (Keep your existing logic) ---
    let pUnitsAlive = battleEnvironment.units.filter(u => u.side === "player" && !u.isCommander && u.hp > 0).length;
    let eUnitsAlive = battleEnvironment.units.filter(u => u.side === "enemy" && !u.isCommander && u.hp > 0).length; 

    let scale = (currentBattleData && currentBattleData.initialCounts.player > 300) ? 5 : 1; 
    let playerLost = currentBattleData.initialCounts.player - (pUnitsAlive * scale);
    let enemyLost = currentBattleData.initialCounts.enemy - (eUnitsAlive * scale);

    let isFleeing = eUnitsAlive > 0;
    let didPlayerWin = !isFleeing;

    // Apply Overworld Consequences
    playerObj.troops = Math.max(0, (playerObj.troops || 0) - playerLost);

    if (currentBattleData.enemyRef) {
        let overworldNPC = currentBattleData.enemyRef;
        overworldNPC.count -= enemyLost;
        if (overworldNPC.count <= 0 || !isFleeing) {
            overworldNPC.count = 0; 
            overworldNPC.isDead = true; 
        } else {
            let escapeAngle = Math.random() * Math.PI * 2;
            overworldNPC.x += Math.cos(escapeAngle) * 50; 
            overworldNPC.y += Math.sin(escapeAngle) * 50;
            overworldNPC.waitTimer = 0;
            overworldNPC.isMoving = true;
            overworldNPC.targetX = overworldNPC.x + Math.cos(escapeAngle) * 200;
            overworldNPC.targetY = overworldNPC.y + Math.sin(escapeAngle) * 200;
        }
    }

    if (playerObj.hp <= 0) {
        playerObj.hp = playerObj.maxHealth; 
    }

    // --- 4. CONDITIONAL UI BRANCH (THE SIEGE FIX) ---
    // Instead of always showing the summary, we check if you were in a siege
    if (playerObj.isSieging && typeof restoreSiegeAfterBattle === 'function') {
        // This triggers the specific Siege Pause GUI we built
        restoreSiegeAfterBattle(didPlayerWin);
    } else if (typeof createBattleSummaryUI === 'function') {
        // Standard battle summary for non-siege fights
        createBattleSummaryUI(isFleeing ? "Retreat!" : "Victory!", playerLost, enemyLost);
    }

    // --- 5. CLEANUP ---
    currentBattleData = null; 
    battleEnvironment.units = []; 
    battleEnvironment.projectiles = [];
    lastBattleTime = Date.now();
    
    console.log("World Map Resumed at: ", playerObj.x, playerObj.y);
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





function drawSupplyLines(ctx, x, y, factionColor, camera) {
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

function gainPlayerExperience(amount) {
    // 1. Safety check for Level Cap
    if ((player.experienceLevel || 1) >= 20) return;

    // 2. Add XP with safety check for undefined
    player.experience = (player.experience || 0) + (amount*20);
    
    // 3. Calculate dynamic requirement
    let expNeeded = (player.experienceLevel || 1) * 10.0; 

    // 4. The Loop (Handles multi-leveling and carry-over)
    while (player.experience >= expNeeded && (player.experienceLevel || 1) < 20) {
        player.experience -= expNeeded;
        player.experienceLevel = (player.experienceLevel || 1) + 1;
        
        // Permanent stat boosts
        player.meleeAttack = (player.meleeAttack || 10) + 3;
        player.meleeDefense = (player.meleeDefense || 10) + 3;
        player.maxHealth = (player.maxHealth || 100) + 15;
        player.hp = player.maxHealth; // Full heal reward
        
        console.log(`%c LEVEL UP: You are now Level ${player.experienceLevel}!`, "color: #ffca28; font-weight: bold;");
        
        // Update requirement for the NEXT level in the loop
        expNeeded = player.experienceLevel * 10.0;
    }
}


function handleUnitDeath(unit) {
    if (unit.isDeadProcessed) return;

    unit.isDeadProcessed = true;
    unit.deathTime = Date.now();
    unit.state = "dead";
    unit.target = null;
    unit.hasOrders = false;
    
    // 1. Randomize body position & rotation
    unit.deathRotation = Math.random() * Math.PI * 2; 
    unit.deathFlip = Math.random() > 0.5 ? 1 : -1;

    // Add a slight "tumble" offset so they don't land perfectly on the grid
    unit.deathXOffset = (Math.random() - 0.5) * 8; 
    unit.deathYOffset = (Math.random() - 0.5) * 8;

    // 2. Pre-calculate unique blood pool stats
    // This prevents the blood from "flickering" or changing shape every frame
    unit.bloodStats = {
        radiusX: 8 + Math.random() * 8,   // Random width
        radiusY: 4 + Math.random() * 4,   // Random "flatness"
        rotation: Math.random() * Math.PI, // Random splatter angle
        opacity: 0.4 + Math.random() * 0.3 // Random thickness of blood
    };
}

function drawBloodPool(ctx, unit) {
    if (!unit.bloodStats) return;

    const stats = unit.bloodStats;
    ctx.save();
    
    // Position blood under the slightly offset body
    ctx.translate(unit.x + unit.deathXOffset, unit.y + unit.deathYOffset);
    
    // Use the unique pre-calculated stats for this specific death
    ctx.fillStyle = `rgba(100, 0, 0, ${stats.opacity})`; 
    ctx.beginPath();
    
    // Draw the randomized ellipse
    ctx.ellipse(
        0, 0, 
        stats.radiusX, 
        stats.radiusY, 
        stats.rotation, 
        0, Math.PI * 2
    );
    
    ctx.fill();
    ctx.restore();
}