// ============================================================================
// EMPIRE OF THE 13TH CENTURY - BATTLEFIELD TACTICAL ENGINE
// ============================================================================


const BATTLE_WORLD_WIDTH = 2400; 
const BATTLE_WORLD_HEIGHT = 1600; 
const BATTLE_TILE_SIZE = 8;
const BATTLE_COLS = Math.floor(BATTLE_WORLD_WIDTH / BATTLE_TILE_SIZE);
const BATTLE_ROWS = Math.floor(BATTLE_WORLD_HEIGHT / BATTLE_TILE_SIZE);



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

 

// --- Game Configuration & Roles ---
const globalSettings = { formatNumbersWithCommas: false };

const ROLES = {
    GUNNER: "gunner", 
    SHIELD: "shield", 
    PIKE: "pike",
    ARCHER: "archer", 
    CAVALRY: "cavalry", 
    INFANTRY: "infantry",
    TWO_HANDED: "two_handed", 
    FIRELANCE: "firelance",
    BOMB: "bomb", 
    THROWING: "throwing", 
    HORSE_ARCHER: "horse_archer",
    CROSSBOW: "crossbow"
};

// --- RPG & Unit Class Definition ---
class Troop {
    constructor(name, role, isLarge, faction = "Generic") {
        this.name = name;
        this.role = role;
        this.isLarge = isLarge;
        this.faction = faction;
        
        this.experienceLevel = 1; this.morale = 100; this.stamina = 100;
        
        this.health = 50; this.meleeAttack = 10; this.meleeDefense = 10;
        this.armor = 15; this.shieldBlockChance = 0; this.bonusVsLarge = 0;
        
        this.isRanged = false; this.ammo = 0; this.accuracy = 0; 
        this.reloadSpeed = 0; this.missileBaseDamage = 0; this.missileAPDamage = 0;

        // Base speed & range mapping for your old engine
        this.speed = 0.8; 
        this.range = 20; 

        this.currentStance = "statusmelee"; 
    }

    gainExperience(amount) {
        this.experienceLevel += amount;
        this.meleeAttack += (amount * 0.5);
        this.accuracy += (amount * 0.2);
    }

    updateStance(targetDistance) {
        if (!this.isRanged) {
            this.currentStance = "statusmelee";
            return;
        }
        const MELEE_ENGAGEMENT_DISTANCE = 15;
        if (this.ammo <= 0 || targetDistance <= MELEE_ENGAGEMENT_DISTANCE) {
            this.currentStance = "statusmelee";
        } else {
            this.currentStance = "statusrange";
        }
    }
}

// --- The Global Faction Roster ---
const UnitRoster = {
    allUnits: {},
    create: function(id, name, role, isLarge, stats) {
        let t = new Troop(name, role, isLarge, "Generic");
        Object.assign(t, stats);
        t.currentStance = t.isRanged ? "statusrange" : "statusmelee";
        
        // Auto-Balancing Logic
        if (t.isRanged) {
            t.meleeAttack = Math.floor(t.meleeAttack * 0.85); 
            t.meleeDefense = Math.floor(t.meleeDefense * 0.85);
            const isCannonWeapon = t.name.toLowerCase().includes("cannon") || t.name.toLowerCase().includes("fire");
            if (!isCannonWeapon) {
                t.missileBaseDamage = Math.floor(t.missileBaseDamage * 0.4);
                t.missileAPDamage = Math.floor(t.missileAPDamage * 0.4);
            }
        }
        this.allUnits[id] = t;
    },
   init: function() {
        // Basic Infantry
        this.create("Axe Militia", "Axe Militia", "peasant", false, { health: 10, meleeAttack: 6, meleeDefense: 6, armor: 1, speed: 0.9, range: 15, morale: 35, magazine: 1, cost: 5 });
        this.create("Shielded Infantry", "Shielded Infantry", ROLES.SHIELD, false, { health: 40, meleeAttack: 12, meleeDefense: 18, armor: 15, shieldBlockChance: 20, speed: 0.8, range: 20, morale: 60, magazine: 1, cost: 30 });
        this.create("Heavy Shielded Spear", "Heavy Shielded Spear", ROLES.PIKE, false, { health: 45, meleeAttack: 15, meleeDefense: 22, armor: 15, bonusVsLarge: 25, speed: 0.7, range: 25, morale: 70, magazine: 1, cost: 50 });
        this.create("Spearman", "Spearman", ROLES.PIKE, false, { health: 15, meleeAttack: 13, meleeDefense: 16, armor: 5, bonusVsLarge: 20, speed: 0.75, range: 30, morale: 65, magazine: 1, cost: 10 });
        this.create("Glaiveman", "Glaiveman", ROLES.INFANTRY, false, { health: 35, meleeAttack: 18, meleeDefense: 14, armor: 5, speed: 0.75, range: 20, morale: 65, magazine: 1, cost: 45 });
        this.create("Heavy Shielded Mace", "Heavy Shielded Mace", ROLES.SHIELD, false, { health: 35, meleeAttack: 20, meleeDefense: 22, armor: 20, shieldBlockChance: 25, speed: 0.35, range: 20, morale: 75, magazine: 1, cost: 60 });

        // Two-Handed Infantry
        this.create("Heavy Two Handed", "Heavy Two Handed", ROLES.TWO_HANDED, false, { health: 30, meleeAttack: 24, meleeDefense: 12, armor: 12, speed: 0.65, range: 20, morale: 70, magazine: 1, cost: 55 });
        this.create("Light Two Handed", "Light Two Handed", ROLES.TWO_HANDED, false, { health: 25, meleeAttack: 18, meleeDefense: 10, armor: 5, speed: 0.85, range: 20, morale: 60, magazine: 1, cost: 35 });

        // Archers
        this.create("Archer", "Archer", ROLES.ARCHER, false, { isRanged: true, ammo: 25, health: 40, missileBaseDamage: 9, missileAPDamage: 2, accuracy: 55, armor: 5, speed: 0.8, range: 360, morale: 50, magazine: 1, cost: 25 });
        this.create("Horse Archer", "Horse Archer", ROLES.HORSE_ARCHER, true, { isRanged: true, ammo: 25, health: 55, missileBaseDamage: 8, missileAPDamage: 2, accuracy: 60, armor: 12, speed: 1.6, range: 360, morale: 65, magazine: 1, cost: 50 });
        this.create("Heavy Horse Archer", "Heavy Horse Archer", ROLES.HORSE_ARCHER, true, { isRanged: true, ammo: 22, health: 70, missileBaseDamage: 9, missileAPDamage: 4, accuracy: 65, armor: 15, speed: 1.4, range: 260, morale: 75, magazine: 1, cost: 70 });
        this.create("Light Horse Archer", "Light Horse Archer", ROLES.HORSE_ARCHER, true, { isRanged: true, ammo: 26, health: 50, missileBaseDamage: 7, missileAPDamage: 2, accuracy: 58, armor: 10, speed: 1.7, range: 260, morale: 60, magazine: 1, cost: 45 });

        // Crossbow Units
        this.create("Crossbowman", "Crossbowman", ROLES.CROSSBOW, false, { isRanged: true, ammo: 18, health: 45, missileBaseDamage: 12, missileAPDamage: 28, accuracy: 65, armor: 18, speed: 0.7, range: 440, morale: 55, magazine: 1, cost: 35 });
        this.create("Heavy Crossbowman", "Heavy Crossbowman", ROLES.CROSSBOW, false, { isRanged: true, ammo: 16, health: 55, missileBaseDamage: 15, missileAPDamage: 30, accuracy: 70, armor: 25, speed: 0.65, range: 440, morale: 65, magazine: 1, cost: 50 });
        this.create("Repeater Crossbowman", "Repeater Crossbowman", ROLES.CROSSBOW, false, { isRanged: true, ammo: 40, health: 40, missileBaseDamage: 15, missileAPDamage: 2, accuracy: 45, armor: 12, speed: 0.75, range: 200, morale: 50, magazine: 10, cost: 40 });
        this.create("Poison Crossbowman", "Poison Crossbowman", ROLES.CROSSBOW, false, { isRanged: true, ammo: 20, health: 40, missileBaseDamage: 100, missileAPDamage: 4, accuracy: 60, armor: 10, speed: 0.75, range: 230, morale: 55, magazine: 1, cost: 45 });

        // Skirmishers
        this.create("Javelinier", "Javelinier", ROLES.THROWING, false, { isRanged: true, ammo: 4, health: 50, missileBaseDamage: 18, missileAPDamage: 6, accuracy: 55, armor: 15, speed: 0.9, range: 120, morale: 50, magazine: 1, cost: 35 });
        this.create("Slinger", "Slinger", ROLES.THROWING, false, { isRanged: true, ammo: 30, health: 35, missileBaseDamage: 6, missileAPDamage: 1, accuracy: 50, armor: 5, speed: 0.85, range: 220, morale: 40, magazine: 1, cost: 20 });

        // Cavalry
        this.create("Lancer", "Lancer", ROLES.CAVALRY, true, { health: 85, meleeAttack: 20, meleeDefense: 16, armor: 35, speed: 1.4, range: 25, morale: 70, magazine: 1, cost: 60 });
        this.create("Heavy Lancer", "Heavy Lancer", ROLES.CAVALRY, true, { health: 110, meleeAttack: 24, meleeDefense: 20, armor: 45, speed: 1.2, range: 25, morale: 80, magazine: 1, cost: 90 });

        // Gunpowder Units
        this.create("Firelance", "Firelance", ROLES.FIRELANCE, false, { isRanged: true, ammo: 1, health: 45, missileBaseDamage: 14, missileAPDamage: 45, accuracy: 55, armor: 15, speed: 0.8, range: 30, morale: 60, magazine: 1, cost: 50 });
        this.create("Hand Cannoneer", "Hand Cannoneer", ROLES.GUNNER, false, { isRanged: true, ammo: 8, health: 50, missileBaseDamage: 20, missileAPDamage: 40, accuracy: 65, armor: 10, speed: 0.75, range: 120, morale: 70, magazine: 1, cost: 70 });
        this.create("Bomb", "Bomb", ROLES.BOMB, false, { isRanged: true, ammo: 1, health: 40, missileBaseDamage: 30, missileAPDamage: 100, accuracy: 50, armor: 10, speed: 0.7, range: 140, morale: 60, magazine: 1, cost: 65 });
        this.create("Rocket", "Rocket", ROLES.BOMB, false, { isRanged: true, ammo: 5, health: 35, missileBaseDamage: 16, missileAPDamage: 100, accuracy: 65, armor: 8, speed: 0.8, range: 220, morale: 55, magazine: 1, cost: 55 });
        this.create("Camel Cannon", "Camel Cannon", ROLES.CAVALRY, true, { isRanged: true, ammo: 30, health: 50, missileBaseDamage: 35, missileAPDamage: 40, accuracy: 60, armor: 25, speed: 1.0, range: 150, morale: 80, magazine: 1, cost: 150 });

        // Special Units
        this.create("War Elephant", "War Elephant", ROLES.CAVALRY, true, { health: 200, meleeAttack: 35, meleeDefense: 18, armor: 60, speed: 0.9, range: 25, morale: 100, magazine: 1, cost: 300 });
    }
};

UnitRoster.init(); ///suspicious if bugged; randomly here???

function getTacticalPosition(role, side) {
    let position = { x: 0, y: 0 };
    let dir = side === "player" ? -1 : 1; // Flips formation based on side
    switch(role) {
        case ROLES.GUNNER:  position.y = 40 * dir; break; 
        case ROLES.SHIELD:  position.y = 20 * dir; break; 
        case ROLES.PIKE:    position.y = 0; break; 
        case ROLES.ARCHER:  position.y = -40 * dir; break;
        case ROLES.CAVALRY: position.y = 20 * dir; position.x = Math.random() > 0.5 ? 200 : -200; break;
    }
    return position;
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
        playerFaction: playerObj.faction || "Hong Dynasty", // Default player faction if undefined
        enemyFaction: enemyNPC.faction
    };

    generateBattlefield(currentWorldMapTile.name || "Plains");

    playerObj.x = BATTLE_WORLD_WIDTH / 2;
    playerObj.y = BATTLE_WORLD_HEIGHT - 100;

// FIX: Pull the real troop count from the player object
    let playerTroopCount = playerObj.troops || 0; // Use actual troops, or 0 as a fallback
    
    deployArmy(currentBattleData.playerFaction, playerTroopCount, "player"); 
    deployArmy(enemyNPC.faction, enemyNPC.count, "enemy");
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
		{		type: "Axe Militia", pct: 0.60},        // Main Horde
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
            let unitStats = Object.assign(new Troop(), baseTemplate);
            unitStats.faction = faction;

            battleEnvironment.units.push({
                id: Math.random().toString(36).substr(2, 9),
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

        // Melee Damage Calculation (Now also applies to ranged units in 'statusmelee')

        let hitChance = Math.max(10, Math.min(90, 40 + (attackValue - defenseValue)));

        if (Math.random() * 100 < hitChance) {

            let weaponDamage = 20 + (defender.isLarge ? attacker.bonusVsLarge : 0);

            totalDamage = Math.max(1, weaponDamage - (defender.armor * 0.3));

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

    units.forEach(unit => {
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
            let dist = Math.hypot(dx, dy);

            // NEW: Update RPG Stance based on distance
            unit.stats.updateStance(dist);
// ---> 1. ADD THIS LINE: Shrink range if they are using melee <---
            let effectiveRange = unit.stats.currentStance === "statusmelee" ? 20 : unit.stats.range;
            // Move into range
            if (dist > effectiveRange) {
                unit.state = "moving";
                // Optional: Drain stamina while moving
                if (Math.random() > 0.9) unit.stats.stamina = Math.max(0, unit.stats.stamina - 1);
                
                let speedMod = 1.0;
                let tx = Math.floor(unit.x / BATTLE_TILE_SIZE);
                let ty = Math.floor(unit.y / BATTLE_TILE_SIZE);
                if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 4) speedMod = 0.4;
                if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 7) speedMod = 0.6;

                unit.x += (dx / dist) * (unit.stats.speed * speedMod);
                unit.y += (dy / dist) * (unit.stats.speed * speedMod);
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
    } else {
        // ... rest of your melee logic
                        // NEW: Melee Damage Calculation
                        unit.cooldown = 60;
                        
                        // Build state string (e.g., check if target is facing away for "flanked")
                        let stateStr = "melee_attack";
                        if (unit.stats.role === ROLES.CAVALRY) stateStr += " charging";
                        
                        let dmg = calculateDamageReceived(unit.stats, unit.target.stats, stateStr);
                        unit.target.hp -= dmg;
                        
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

// ============================================================================
// BATTLE RESOLUTION & SUMMARY UI
// ============================================================================
 
 function getReloadTime(unit) {
    const type = unit.type; 
    const name = unit.unitName;

    // Fast/Special Logic
    if (name === "Rocket Launcher") return 1000; 
    if (name === "Repeater Crossbowman") return 1300; // Long magazine swap
    if (type === "archer") return 300; // Fast
    
    // Moderate Logic
    if (type === "crossbow") return 1000;
    if (name === "Hand Cannon") return 1000; // Slow Gunpowder
    
    // Terrible Reload Speed
    if (name === "Firelance") return 1500;
    
    // Default Melee
    return 800; 
}

function leaveBattlefield(playerObj) {
    // --- 1. CALCULATE EVERYTHING FIRST (While data still exists) ---
    
    // Get counts before we clear the array
    let pUnitsAlive = battleEnvironment.units.filter(u => u.side === "player").length;
    let eUnitsAlive = battleEnvironment.units.filter(u => u.side === "enemy").length;
    
    // Get the scale and initial counts before we null the data
    let scale = currentBattleData.initialCounts.player > 300 ? 5 : 1; 
    let playerLost = currentBattleData.initialCounts.player - (pUnitsAlive * scale);
    let enemyLost = currentBattleData.initialCounts.enemy - (eUnitsAlive * scale);

    let isFleeing = eUnitsAlive > 0;

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
}

function createBattleSummaryUI(title, pLost, eLost) {
    const summaryDiv = document.createElement('div');
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


// ============================================================================
// ADVANCED UNIT RENDERING (WEAPONS & MOUNTS)
// ============================================================================

// Override the generic draw function to use our new specialized renderers
function drawBattleUnits(ctx) {
    let units = battleEnvironment.units;
    let time = Date.now() / 50;

    // Draw alive units sorted by Y for correct overlap
    units.sort((a, b) => a.y - b.y).forEach(unit => {
        let isMoving = unit.state === "moving";
        let frame = time + unit.animOffset;
let isAttacking = unit.state === "attacking" && unit.cooldown > (unit.stats.isRanged ? 30 : 40);

        // Consolidated visual category logic
        let visType = "peasant";
        
        if ((typeof player !== 'undefined' && unit === player) || unit.isPlayer) {
            visType = "cavalry"; 
        } else if (unit.stats.role === ROLES.CAVALRY) {
            visType = unit.unitType === "War Elephant" ? "elephant" : (unit.unitType === "Camel Cannon" ? "camel" : "cavalry");
        } else if (unit.stats.role === ROLES.HORSE_ARCHER) {
            visType = "horse_archer";
        } else if (unit.stats.role === ROLES.PIKE || unit.unitType.includes("Glaive")) {
            visType = "spearman";
        } else if (unit.stats.role === ROLES.SHIELD || unit.unitType === "Glaiveman") {
            visType = "sword_shield";
        } else if (unit.stats.role === ROLES.TWO_HANDED) {
            visType = "two_handed";
        } else if (unit.stats.role === ROLES.CROSSBOW) {
            visType = "crossbow";
		} else if (unit.stats.role === ROLES.ARCHER) {
            visType = "archer";
        } else if (unit.stats.role === ROLES.THROWING) {
            visType = "throwing"; // Changed from "archer" to "throwing"
        } else if (unit.stats.role === ROLES.GUNNER || unit.stats.role === ROLES.FIRELANCE) {
            visType = "gun";
        } else if (unit.stats.role === ROLES.BOMB) {
            visType = "bomb";
        } else if (unit.unitType === "Axe Militia") {
            visType = "peasant";
        }
		
		

// ---> 1. ADD THIS NEW OVERRIDE BLOCK HERE <---
        if (unit.stats.isRanged && unit.stats.ammo <= 0) {
            if (visType === "horse_archer" ) {
                visType = "cavalry"; // Switch mounted ranged to melee
            } else {
                visType = "shortsword";    // Switch infantry ranged to melee
            }
        }

// Dispatch to the correct renderer (NOW PASSING unit.unitType)
        if (["cavalry", "elephant", "camel", "horse_archer"].includes(visType)) {
            drawCavalryUnit(ctx, unit.x, unit.y, isMoving, frame, unit.color, isAttacking, visType, unit.side, unit.unitType);
        } else {
            drawInfantryUnit(ctx, unit.x, unit.y, isMoving, frame, unit.color, visType, isAttacking, unit.side, unit.unitType);
        }
// Draw Unit Name
        ctx.fillStyle = "#ffffff";
        ctx.font = "4px Georgia";
        ctx.textAlign = "center";
        ctx.fillText(unit.unitType, unit.x, unit.y - 21);

       const barWidth = 24;
    const barHeight = 4;
    const barY = unit.y - 30; // Positions bar above the unit's head

    // Draw Background (Red/Empty)
    ctx.fillStyle = "rgba(200, 0, 0, 0.5)";
    ctx.fillRect(unit.x - barWidth / 2, barY, barWidth, barHeight);

    // Draw Health Fill (Green)
    const healthPercent = Math.max(0, unit.hp / unit.stats.health);
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(unit.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

    // Optional: Draw Border
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(unit.x - barWidth / 2, barY, barWidth, barHeight);
    });

    // Draw Projectiles
    battleEnvironment.projectiles.forEach(p => {
        let angle = Math.atan2(p.ty - p.y, p.tx - p.x);
        ctx.save(); 
        ctx.translate(p.x, p.y); 

        let isBomb = p.attackerStats && p.attackerStats.role === "bomb";
        let isRocket = p.attackerStats && p.attackerStats.name === "Rocket";
        let isJavelin = p.attackerStats && p.attackerStats.name === "Javelinier";

	if (isBomb) {
            // Spinning round bomb
            let spin = Date.now() / 50;
            ctx.rotate(spin);
            
            // 1. The Bomb Body
            ctx.fillStyle = "#212121"; 
            ctx.beginPath(); 
            ctx.arc(0, 0, 4.5, 0, Math.PI * 2); 
            ctx.fill();

            // 2. The Flying Fuse/Spark (Now travels with the projectile)
            ctx.strokeStyle = "#ffa000"; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(5, -5);
            ctx.stroke();

            // The glowing tip of the fuse
            ctx.fillStyle = "#ff5722";
            ctx.beginPath();
            ctx.arc(5, -5, 1.5 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
		else if (isRocket) {
            // Flying arrow-rocket with trail
            ctx.rotate(angle);
            ctx.fillStyle = "#795548"; ctx.fillRect(-8, -1, 16, 2); // stick
            ctx.fillStyle = "#424242"; ctx.fillRect(-2, -3, 8, 6); // powder tube
            ctx.fillStyle = "#ff9800"; ctx.beginPath(); ctx.arc(-8, 0, 4 + Math.random()*3, 0, Math.PI*2); ctx.fill(); // Thrust flame
        } else if (p.isFire) {
            // Firelance blast
            ctx.rotate(angle);
            ctx.fillStyle = "#ff9800"; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(255, 152, 0, 0.5)"; ctx.beginPath(); ctx.arc(-6, 0, 6, 0, Math.PI * 2); ctx.fill(); // Smoke/Flame trail
        } else if (isJavelin) {
            // Long thrown spear
            ctx.rotate(angle);
            ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
            ctx.fillStyle = "#bdbdbd"; ctx.fillRect(8, -2, 4, 4); // Iron tip
        } else {
            // Standard arrow/bolt
            ctx.rotate(angle);
            ctx.fillRect(-4, -0.5, 8, 1); // shaft
            ctx.fillStyle = "#9e9e9e"; ctx.fillRect(2, -1.5, 3, 3); // arrowhead
        
		// ADD THIS: Small rocket motor head for rockets
if (p.isFire && p.attackerStats.role === ROLES.BOMB && p.attackerStats.name !== "Rocket") {
    ctx.fillStyle = "#5d4037"; // Dark cylinder
    ctx.fillRect(0, -1, 4, 2); 
    
    ctx.fillStyle = "#ff5722"; // Orange ignition spark
    ctx.beginPath(); ctx.arc(4, 0, 1, 0, Math.PI*2); ctx.fill();
}
		}
        ctx.restore();
    });
}

function drawInfantryUnit(ctx, x, y, moving, frame, factionColor, type, isAttacking, side, unitName) {
    ctx.save();
    ctx.translate(x, y);
    
    let legSwing = moving ? Math.sin(frame * 0.3) * 6 : 0;
    let bob = moving ? Math.abs(Math.sin(frame * 0.3)) * 2 : 0;
    let dir = side === "player" ? 1 : -1; 

    // Legs
    ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-3 - legSwing, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(3 + legSwing, 9); ctx.stroke();

    ctx.translate(0, -bob); 
    
    // Body & Heavy Lamellar Armor
    ctx.fillStyle = factionColor; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(3, -10); ctx.lineTo(-3, -10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    
    let isHeavy = ["sword_shield", "spearman", "two_handed", "crossbow"].includes(type);
    if (isHeavy) {
        ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 0.5;
        for(let i = -8; i < -1; i+=2.5) {
            ctx.beginPath(); ctx.moveTo(-4, i); ctx.lineTo(4, i); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-2, i); ctx.lineTo(-2, i+2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(2, i); ctx.lineTo(2, i+2); ctx.stroke();
        }
    }
    
    // Head & Hat
    ctx.fillStyle = "#d4b886"; 
    ctx.beginPath(); ctx.arc(0, -12, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = (type === "peasant" || type === "throwing") ? "#8d6e63" : "#607d8b"; 
    ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(0, -17); ctx.lineTo(6, -12);
    ctx.quadraticCurveTo(0, -14, -6, -12); ctx.fill(); ctx.stroke();

    // === WEAPON RENDERING ===
    let weaponBob = isAttacking ? Math.sin(frame * 0.8) * 4 * dir : 0;
    
if (type === "peasant") {
        let tipX = (12 + weaponBob) * dir;
        let tipY = -12 + weaponBob;

        // Draw the wooden shaft
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-2 * dir, -4); ctx.lineTo(tipX, tipY); ctx.stroke();

        // ---> ADD THE IRON BLADE FOR THE HOE <---
        if (unitName === "Hoe Militia") {
            ctx.strokeStyle = "#9e9e9e"; // Iron color
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            // Draw the blade hooking downwards and slightly inwards
            ctx.lineTo(tipX - (2 * dir), tipY + 5); 
            ctx.stroke();
        }
    }
	else if (type === "spearman") {
        let isGlaive = unitName === "Glaiveman";
        ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-6 * dir, 4); ctx.lineTo((28 + weaponBob) * dir, -24 + weaponBob); ctx.stroke();
        
        ctx.fillStyle = "#bdbdbd"; 
        if (isGlaive) {
            ctx.beginPath(); ctx.moveTo((26 + weaponBob) * dir, -22 + weaponBob);
            ctx.quadraticCurveTo((32 + weaponBob) * dir, -30 + weaponBob, (28 + weaponBob) * dir, -32 + weaponBob);
            ctx.lineTo((25 + weaponBob) * dir, -24 + weaponBob); ctx.fill();
        } else {
            // FIX: Symmetric Spear Head aligned to shaft axis
            ctx.save();
            ctx.translate((28 + weaponBob) * dir, -24 + weaponBob);
            ctx.rotate(Math.PI * -0.25 * dir); // Align with the 45-degree shaft
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-3, 2);
            ctx.lineTo(8, 0); // Point
            
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }
		// ---> ADD THIS NEW BLOCK TO RENDER THE SHIELD <---
        if (unitName.includes("Shield")) {
            ctx.fillStyle = "#5d4037"; ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc((6 + weaponBob/2) * dir, -4, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); 
            ctx.fillStyle = "#424242"; 
            ctx.beginPath(); ctx.arc((6 + weaponBob/2) * dir, -4, 2.5, 0, Math.PI * 2); ctx.fill();
        }
    }
    else if (type === "sword_shield") {
        ctx.strokeStyle = "#9e9e9e"; ctx.lineWidth = 2.5; 
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo((14 + weaponBob) * dir, -12 + (weaponBob/2)); ctx.stroke(); 
        
        // FIXED: Slightly decreased shield height/radius
        ctx.fillStyle = "#5d4037"; ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc((6 + weaponBob/2) * dir, -4, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); 
        ctx.fillStyle = "#424242"; 
        ctx.beginPath(); ctx.arc((6 + weaponBob/2) * dir, -4, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    else if (type === "two_handed") {
        // FIXED: Katana Curve
        ctx.strokeStyle = "#757575"; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-2 * dir, -4); 
        ctx.quadraticCurveTo((10 + weaponBob) * dir, -10 + weaponBob, (18 + weaponBob) * dir, -22 + weaponBob);
        ctx.stroke();
        ctx.strokeStyle = "#212121"; ctx.lineWidth = 3; // Crossguard
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(2 * dir, -7); ctx.stroke();
    }
    else if (type === "archer") {
        // FIXED: Long Bow, Quiver, and Nocked Arrow
        ctx.fillStyle = "#3e2723"; ctx.fillRect(-4, -8, 3, 7); // Quiver on back
        ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(5, -16); ctx.quadraticCurveTo(14, -10, 10, -8); 
        ctx.quadraticCurveTo(14, -6, 5, 0); ctx.stroke(); // Longer Bow
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(5, -16); ctx.lineTo(5, 0); ctx.stroke(); // String
        ctx.strokeStyle = "#d4b886"; ctx.lineWidth = 1;
        
    }
 else if (type === "throwing") {
        if (unitName === "Slinger") {
            // FIX: Rotation shifted to the side (hand position) instead of body center
            let handX = 4 * dir;
            let handY = -6;
            let swing = isAttacking ? frame * 0.6 : 0.5; // Balearic swing speed
            ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(handX, handY);
            // Circular rotation from the hand point
            ctx.lineTo(handX + (Math.cos(swing) * 10 * dir), handY + (Math.sin(swing) * 8)); 
            ctx.stroke();
            // Sling stone
            ctx.fillStyle = "#9e9e9e";
            ctx.beginPath(); 
            ctx.arc(handX + (Math.cos(swing) * 10 * dir), handY + (Math.sin(swing) * 8), 1.5, 0, Math.PI*2);
            ctx.fill();

			} 
			
			else { //javelin
          // REVISED: Dynamic thrusting motion using frame
            let thrust = isAttacking ? Math.sin(frame * 0.5) * 10 * dir : -6 * dir;
            ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.moveTo((-10 * dir) + thrust, -12); 
            ctx.lineTo((10 * dir) + thrust, -16); 
            ctx.stroke(); }
    }
    else if (type === "crossbow") { 
		if (unitName === "Repeater Crossbowman") {ctx.save();
    ctx.scale(dir, 1); 

    // --- MECHANICAL TIMING & VIBRATION ---
    // We only vibrate if the cooldown is low (actively firing the burst).
    // In your engine, cooldown 1800 is the reload. We vibrate if cooldown < 120 (approx 2 seconds).
let isFiringBurst = isAttacking;
    // Slower, heavier vibration (Math.sin creates a rhythmic 'thumping' shake)
    let shakeX = isFiringBurst ? Math.sin(Date.now() / 30) * 1.5 : 0;
    let shakeY = isFiringBurst ? Math.cos(Date.now() / 30) * 1.2 : 0;
    ctx.translate(shakeX, shakeY);

    // 1. BUTTSTOCK (At the belly)
    ctx.fillStyle = "#3e2723"; 
    ctx.fillRect(-3, -12 + bob, 6, 6); 

    // 2. MAIN RAIL (Extended right for proper reach)
    ctx.fillStyle = "#4e342e"; 
    ctx.fillRect(3, -11 + bob, 18, 3); 

    // 3. TINY COMPACT MAGAZINE
    ctx.save();
    // Shifted forward to position 9, scaled down to 7x6
ctx.translate(5, -17 + bob); 
    
    ctx.fillStyle = "#5d4037"; 
    ctx.fillRect(0, 0, 14, 6); // Width increased from 7 to 14
    
    ctx.strokeStyle = "#2b1b17"; 
    ctx.lineWidth = 0.8;
    ctx.strokeRect(0, 0, 14, 6);

    // 4. BOLTS (Offset to the new top-right "mouth")
    ctx.fillStyle = "#9e9e9e";
    // Moved to 11 so they sit at the far right edge of the widened box
    ctx.fillRect(11, 1, 2, 1);
    ctx.fillRect(11, 3, 2, 1);
    ctx.restore();

    // 5. REVERSED LEVER (Backward toward belly)
    ctx.strokeStyle = "#3e2723"; 
    ctx.lineWidth = 3;
    ctx.beginPath();
ctx.moveTo(9, -10 + bob); // Pivot at the back of the small magazine
ctx.lineTo(4, -16 + bob);  // Points UP and LEFT (upleft)
    ctx.stroke();
    
    // Iron Pivot Pin
    ctx.fillStyle = "#212121";
    ctx.beginPath(); ctx.arc(9, -10 + bob, 1, 0, Math.PI*2); ctx.fill();

    // 6. MUZZLE
    ctx.fillStyle = "#212121";
    ctx.fillRect(21, -11 + bob, 2, 3); 

    ctx.restore();
        }
else if (unitName === "Poison Crossbowman") {
            // 1. Stock (Same as Standard Crossbow)
            ctx.fillStyle = "#5d4037"; 
            ctx.fillRect(0, -10, 12, 3); 

            // 2. Simple D-Shape Bow Arms
            // We use a dark green color (#2e7d32) to indicate poison
            ctx.strokeStyle = "#2e7d32"; 
            ctx.lineWidth = 2;
            ctx.beginPath();
            // This creates a perfect semi-circle 'D' shape
            ctx.arc(10, -8.5, 6.5, -Math.PI/2, Math.PI/2); 
            ctx.stroke();

            // 3. Bowstring
            ctx.strokeStyle = "rgba(200, 255, 200, 0.4)"; // Light green-ish white
            ctx.lineWidth = 0.5;
            ctx.beginPath(); 
            ctx.moveTo(10, -15); ctx.lineTo(10, -2); 
            ctx.stroke();

  
        }

		else {
            // Standard Crossbow
            ctx.fillStyle = "#5d4037"; ctx.fillRect(0, -10, 12, 3); 
            ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(10, -15); ctx.quadraticCurveTo(18, -11, 14, -8.5); 
            ctx.quadraticCurveTo(18, -6, 10, -2); ctx.stroke();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(10, -15); ctx.lineTo(10, -2); ctx.stroke();
	}}
else if (unitName && unitName.includes("Firelance")) {
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(21 + weaponBob, -8); ctx.stroke();
        ctx.fillStyle = "#212121"; ctx.fillRect(14 + weaponBob, -10, 7, 4);
        // --- ADD THIS SPEARHEAD BLOCK ---
        ctx.fillStyle = "#9e9e9e"; // Steel color
        ctx.beginPath();
        ctx.moveTo(21 + weaponBob, -8);      // Base of spearhead (at the end of the tube)
        ctx.lineTo(24 + weaponBob, -10);     // Top point
        ctx.lineTo(29 + weaponBob, -8);      // Tip point
        ctx.lineTo(24 + weaponBob, -6);      // Bottom point
        ctx.closePath(); ctx.fill();
        // --------------------------------
        if (isAttacking) {
            // Realistic small flash
            ctx.fillStyle = "#ff5722"; ctx.beginPath(); ctx.arc(22 + weaponBob, -8, 1.5 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
            // Firelance Smoke
            ctx.fillStyle = "rgba(100, 100, 100, 0.4)";
            ctx.beginPath(); ctx.arc(24 + weaponBob, -10, 4 + Math.random()*3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(28 + weaponBob, -12, 2 + Math.random()*2, 0, Math.PI * 2); ctx.fill();
        }
    } 
    else if (type === "gun") {
        ctx.strokeStyle = "#424242"; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(14 + weaponBob, -8); ctx.stroke();
        
        if (isAttacking) { 
            // Realistically small muzzle flash
            ctx.fillStyle = "#ff5722"; ctx.beginPath(); ctx.arc(16 + weaponBob, -9, 1 + Math.random()*1, 0, Math.PI * 2); ctx.fill();
            // Thick Gun Smoke
            ctx.fillStyle = "rgba(140, 140, 140, 0.5)"; 
            ctx.beginPath(); ctx.arc(20 + weaponBob, -11, 5 + Math.random()*4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(26 + weaponBob, -13, 7 + Math.random()*5, 0, Math.PI * 2); ctx.fill();
        }
    }
else if (unitName === "Bomb") {
        ctx.save();
        
        // 1. Animate the Staff Trebuchet swing
        if (isAttacking) {
            // Swings the staff sharply forward when attacking
            // (If you have an animation timer like unit.attackTimer, you can use it here for a smooth sweep!)
            ctx.rotate(Math.PI / 4); // ~45 degrees forward
        } else {
            // Resting idle position (angled slightly backward)
            ctx.rotate(-Math.PI / 10); 
        }

        // 2. Draw the Staff pole
        ctx.strokeStyle = "#5d4037"; 
        ctx.lineWidth = 1.5;
        ctx.beginPath(); 
        ctx.moveTo(0, 0); 
        ctx.lineTo(0, -22); // Straight line up (length matches your old 12,-18 diagonal)
        ctx.stroke();

        // 3. Draw the rope/sling connector
        ctx.strokeStyle = "#3e2723"; 
        ctx.lineWidth = 1;
        ctx.beginPath(); 
        ctx.moveTo(0, -22); 
        ctx.quadraticCurveTo(4, -18, 3, -14); 
        ctx.stroke();

        // 4. Draw the bomb in the sling
        // (Optional for Step C: Wrap this in `if (!unit.hasThrownBomb) { ... }` later!)
        ctx.fillStyle = "#424242"; 
        ctx.beginPath(); 
        ctx.arc(3, -14, 2.5, 0, Math.PI * 2); 
        ctx.fill();

        ctx.restore();
    } 
    else if (unitName === "Rocket") {
        ctx.save();
        ctx.translate(4 * dir, -6);
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
        for(let i=-1; i<=1; i++) { 
            ctx.beginPath(); ctx.moveTo(-8 * dir, i*2); ctx.lineTo(10 * dir + weaponBob, -4 + i*2); ctx.stroke();
        }
        ctx.fillStyle = "#424242"; ctx.fillRect(-10 * dir, -3, 4 * dir, 6); 
        
        if (isAttacking) {
            // Rocket Exhaust Smoke
            ctx.fillStyle = "rgba(180, 180, 180, 0.6)";
            for(let j=0; j<3; j++) {
                ctx.beginPath();
                ctx.arc(-14 * dir - (j*5), 2 + (Math.random()*4-2), 3+j, 0, Math.PI*2);
                ctx.fill();
            }
        }
        ctx.strokeStyle = "#ff9800"; ctx.lineWidth = 1; 
        ctx.beginPath(); ctx.moveTo(-10 * dir, 0); ctx.lineTo(-14 * dir, 4); ctx.stroke();
        ctx.restore();
    }
// ---> ADD THIS NEW SHORTSWORD BLOCK <---
    else if (type === "shortsword") {
        // Ranged unit out of ammo - drawing a simple shortsword
        ctx.strokeStyle = "#9e9e9e"; ctx.lineWidth = 2.5; 
        ctx.beginPath(); 
        ctx.moveTo(0, -6); 
        ctx.lineTo((12 + weaponBob) * dir, -10 + (weaponBob/2)); 
        ctx.stroke(); 
        
        // Simple Iron Crossguard
        ctx.strokeStyle = "#212121"; ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.moveTo(1 * dir, -5); 
        ctx.lineTo(3 * dir, -8); 
        ctx.stroke();
    }
    ctx.restore();
}

function drawCavalryUnit(ctx, x, y, moving, frame, factionColor, isAttacking, type, side, unitName) {
    ctx.save();
    ctx.translate(x, y);
    
    let dir = side === "player" ? 1 : -1;
    ctx.scale(dir, 1);
    
    let legSwing = moving ? Math.sin(frame * 0.4) * 8 : 0;
    let bob = moving ? Math.sin(frame * 0.4) * 2 : 0;
    let riderBob = moving ? Math.sin(frame * 0.4 + 0.5) * 1.5 : 0;

    ctx.lineCap = "round"; ctx.lineJoin = "round";

    let isElephant = type === "elephant";
    let isCamel = type === "camel";
    let mountColor = isElephant ? "#757575" : (isCamel ? "#c2b280" : "#795548");

    // 1. BACK LEGS
    ctx.strokeStyle = isElephant ? "#424242" : "#3e2723"; 
    ctx.lineWidth = isElephant ? 4 : 1.8; 
    ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(-6 - legSwing, 10);
    ctx.moveTo(3, 2); ctx.lineTo(1 - legSwing, 10); ctx.stroke();

    // 2. MOUNT BODY
    ctx.fillStyle = mountColor; ctx.strokeStyle = isElephant ? "#424242" : "#3e2723";
    ctx.beginPath(); 
    if (isElephant) {
        ctx.ellipse(0, bob - 2, 18, 14, 0, 0, Math.PI * 2); 
    } else {
        ctx.ellipse(0, bob, 11, 7, 0, 0, Math.PI * 2); 
        if (isCamel) ctx.arc(-2, bob - 6, 5, Math.PI, 0); // Camel hump
    }
    ctx.fill(); ctx.stroke();

    // 3. RIDER 
    if (!isElephant) {
        ctx.save();
        ctx.translate(-1, (isCamel ? -7 : -4) + bob + riderBob);
        
        ctx.fillStyle = factionColor; ctx.strokeStyle = "#1a1a1a";
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(2, -9); ctx.lineTo(-2, -9);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        
        if (unitName && unitName.includes("Heavy")) {
            ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 0.5;
            for(let i = -7; i < -1; i+=2) {
                ctx.beginPath(); ctx.moveTo(-3, i); ctx.lineTo(3, i); ctx.stroke();
            }
        }
        
        ctx.fillStyle = "#d4b886";
        ctx.beginPath(); ctx.arc(0, -11, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#607d8b"; 
        ctx.beginPath(); ctx.moveTo(-8, -11); ctx.lineTo(0, -16); ctx.lineTo(8, -11);
        ctx.quadraticCurveTo(0, -13, -8, -11); ctx.fill(); ctx.stroke();
        
        let weaponBob = isAttacking ? Math.sin(frame * 0.8) * 4 : 0;
        
        if (type === "horse_archer") {
            ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(2 + weaponBob, -14);
            ctx.quadraticCurveTo(8 + weaponBob, -10, 4 + weaponBob, -6);
            ctx.quadraticCurveTo(8 + weaponBob, -2, 2 + weaponBob, 2);
            ctx.stroke();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(2 + weaponBob, -14); ctx.lineTo(2 + weaponBob, 2); ctx.stroke();
        } else if (type === "camel") {
            ctx.strokeStyle = "#212121"; ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(12 + weaponBob, -5); ctx.stroke();
            if (isAttacking) { 
                ctx.fillStyle = "#ff9800"; ctx.beginPath(); ctx.arc(14 + weaponBob, -5, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(158, 158, 158, 0.6)"; ctx.beginPath(); ctx.arc(18 + weaponBob, -8, 6, 0, Math.PI * 2); ctx.fill();
            }
        } else {
            let attackThrust = isAttacking ? 10 : 0;
            ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(26 + attackThrust, -4 + (attackThrust/3)); ctx.stroke();
            ctx.fillStyle = "#bdbdbd"; ctx.fillRect(26 + attackThrust, -5 + (attackThrust/3), 6, 2); 
        }
        ctx.restore();
    }

    // 4. FRONT LEGS
    ctx.beginPath(); ctx.moveTo(-1, 2); ctx.lineTo(-1 + legSwing, 10);
    ctx.moveTo(6, 2); ctx.lineTo(8 + legSwing, 10); ctx.stroke();

    // 5. MOUNT HEAD
    ctx.save();
    if (isElephant) {
        ctx.translate(14, -2 + bob);
        ctx.fillStyle = mountColor;
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); 
        ctx.lineWidth = 4; ctx.strokeStyle = mountColor; 
        ctx.beginPath(); ctx.moveTo(4, 2); ctx.quadraticCurveTo(8, 12, 4, 16); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = "#eeeeee"; 
        ctx.beginPath(); ctx.moveTo(2, 4); ctx.quadraticCurveTo(8, 8, 12, 2); ctx.stroke();
    } else {
        ctx.translate(8, (isCamel ? -5 : -2) + bob);
        ctx.fillStyle = mountColor;
        ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(8, -6); ctx.lineTo(16, -11); 
        ctx.lineTo(14, -13); ctx.lineTo(6, -11); ctx.lineTo(5, -14); 
        ctx.lineTo(3, -14); ctx.lineTo(1, -10); ctx.lineTo(-4, -1); 
        ctx.closePath(); ctx.fill(); ctx.stroke();
        
        if (!isCamel) {
            ctx.fillStyle = "#3e2723";
            ctx.beginPath(); ctx.moveTo(1, -10); ctx.quadraticCurveTo(-2, -9, -5, 0); ctx.lineTo(-2, -1); ctx.fill();
        }
    }
    ctx.restore();

    // 6. TAIL
    ctx.strokeStyle = isElephant ? "#424242" : "#3e2723"; 
    ctx.lineWidth = isElephant ? 1.5 : 2.5;
    ctx.beginPath(); ctx.moveTo(isElephant ? -16 : -10, -1 + bob);
    ctx.quadraticCurveTo(-16, 1, -14, 10 + bob); ctx.stroke();

    ctx.restore();
}

 
document.addEventListener("keydown", (event) => {
    if (!inBattleMode) return; // Only process if in a battle

    switch(event.key) {
        case "1":
            console.log("Command 1: Select All Infantry");
            // Example: Highlight infantry
            battleEnvironment.units.forEach(u => {
                u.selected = (u.side === "player" && !u.stats.isLarge && !u.stats.isRanged);
            });
            break;
        case "3":
            console.log("Command 3: Hold Position");
            // Example: Force units to stay put
            battleEnvironment.units.forEach(u => {
                if (u.side === "player") u.state = "holding"; // You'll need to add a check in updateBattleUnits to stop moving if state is 'holding'
            });
            break;
    }
});