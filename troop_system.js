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
    CROSSBOW: "crossbow",
	MOUNTED_GUNNER: "mounted_gunner",
	ROCKET: "Rocket" 
};

// --- NEW: ARMOR CLASSIFICATION SYSTEM ---
// 0-5: Cloth/Unarmored | 5-10: Gambeson/Leather | 10-20: Partial Lamellar | 20+: Full Lamellar/Heavy
const ARMOR_TIERS = {
    CLOTH: 2,             // Peasant clothes, bare minimum
    LEATHER: 8,           // Gambeson, hardened leather, organic
    PARTIAL_LAMELLAR: 15, // Chest plate + helmet, decent protection
    FULL_LAMELLAR: 25,    // Full suit of heavy lamellar armor
    SUPER_HEAVY: 40,      // Barded horses, elite cataphracts
    JUGGERNAUT: 60        // War Elephants, massive natural armor
};

// --- NEW: PHYSICAL WEIGHT CLASSES ---
// Tier determines who pushes who (Light cannot push Heavy). 
// Mass determines push ratio if tiers are equal.
// Radius determines how much physical space they take up.
const WEIGHT_CLASSES = {
    LIGHT_INF: { tier: 1, mass: 10,  radius: 5 },   // Peasants, Archers
    HEAVY_INF: { tier: 2, mass: 25,  radius: 7 },   // Armored Infantry, Pikemen
    CAV:       { tier: 3, mass: 80,  radius: 10 },  // Standard horses
    HEAVY_CAV: { tier: 4, mass: 150, radius: 12 },  // Barded Cataphracts
    ELEPHANT:  { tier: 5, mass: 500, radius: 18 }   // Unmovable Behemoths
};

class Troop {
    constructor(name, role, isLarge, faction = "Generic") 
	{
        this.name = name;
        this.role = role;
        this.isLarge = isLarge;
        this.faction = faction;
        
		// Default fallbacks (will be overwritten by the roster)
        this.weightTier = WEIGHT_CLASSES.LIGHT_INF.tier;
        this.mass = WEIGHT_CLASSES.LIGHT_INF.mass;
        this.radius = WEIGHT_CLASSES.LIGHT_INF.radius;
		
		
		this.level = 1; this.morale = 20; this.maxMorale = 20; this.stamina = 100; this.health = 50; this.meleeAttack = 10; this.meleeDefense = 10;
        this.armor = ARMOR_TIERS.CLOTH; this.shieldBlockChance = 0; this.bonusVsLarge = 0;  this.isRanged = false; this.ammo = 0; this.accuracy = 0; this.reloadSpeed = 0; this.missileBaseDamage = 0; this.missileAPDamage = 0;
		this.speed = 0.8;  this.range = 20; 
        this.currentStance = "statusmelee"; 
    }
	
gainExperience(amount) {//troop non player version of gain exp
    if (this.experienceLevel >= 10) return; // Cap level at 10

    // 1. Add to a dedicated experience pool, NOT the level itself
    this.experience = (this.experience || 0) + (amount*5);

    // 2. Define how much is needed for the NEXT level
    // Formula: Level 1 needs 1.0, Level 2 needs 2.0, Level 3 needs 3.0...
    let expNeeded = this.experienceLevel * 1.0; 

    // 3. Level up logic with a "While" loop to handle large XP gains correctly
    while (this.experience >= expNeeded && this.experienceLevel < 10) {
        this.experience -= expNeeded; // Consume the XP
        this.experienceLevel++;
        
        // Boost stats on level up
        this.meleeAttack += 2;
        this.meleeDefense += 2;
        this.health = Math.min(this.maxHealth || 100, this.health + 10);
        
        console.log(`${this.name} reached Level ${this.experienceLevel}!`);
        
        // Update requirement for the NEXT level in the loop
        expNeeded = this.experienceLevel * 1.0;
    }
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

const UnitRoster = {
    allUnits: {},
    
    // --- EMBEDDED HIERARCHY DATA (Synced with GUI) ---
    hierarchy: {
        militia: {
            crossbow_line:   ["Crossbowman", "Heavy Crossbowman"],
            spear_line:      ["Javelinier", "Firelance", "Heavy Firelance"],
            archer_line:     ["Archer", "Horse Archer", "Heavy Horse Archer"],
            sabre_line:      ["Shielded Infantry", "Light Two Handed", "Heavy Two Handed"],
            scout_line:      ["Spearman", "Lancer", "Heavy Lancer"],
            specialist_line: ["Bomb", "Hand Cannoneer"] // Moved Bomb to branch directly from Militia
        },
        faction_uniques: {
            korean: "Rocket",
            mongol: "Mangudai",
            jurchen: "Elite Lancer",
            xia: "Camel Cannon",
            viet: "Poison Crossbowman",
            persian: "War Elephant",
            hong: "Repeater Crossbowman",
            tibetan: "Slinger",
            japanese: "Glaiveman"
        }
    },

    getAvailableUpgrades: function(currentType) {
        let upgrades = [];
        
        if (currentType === "Militia") {
            for (let line in this.hierarchy.militia) {
                upgrades.push(this.hierarchy.militia[line][0]);
            }
            return upgrades; 
        }
        
        for (let line in this.hierarchy.militia) {
            let arr = this.hierarchy.militia[line];
            let idx = arr.indexOf(currentType);
            if (idx !== -1 && idx < arr.length - 1) {
                upgrades.push(arr[idx + 1]);
                return upgrades; 
            }
        }
        
        return upgrades; 
    },

    create: function(id, name, role, isLarge, stats, faction = "Generic") {
        let t = new Troop(name, role, isLarge, faction);
        Object.assign(t, stats);
		
		// 2. ---> INSERT THE NEW WEIGHT LOGIC HERE <---
    // This maps the WEIGHT_CLASSES object data onto the individual unit
    if (stats.weightClass) {
        t.weightTier = stats.weightClass.tier;
        t.mass = stats.weightClass.mass;
        t.radius = stats.weightClass.radius;
    }
		
        t.morale = stats.morale || 20; 
        t.maxMorale = stats.morale || 20;
        t.currentStance = t.isRanged ? "statusrange" : "statusmelee"; 
        
        // Auto-Balancing Logic for Ranged Hybrids
        if (t.isRanged) {
            t.meleeAttack = Math.floor(t.meleeAttack * 0.85); 
            t.meleeDefense = Math.floor(t.meleeDefense * 0.85);
            const isCannonWeapon = t.name.toLowerCase().includes("cannon") || t.name.toLowerCase().includes("fire");
            if (!isCannonWeapon) {
                t.missileBaseDamage = Math.floor(t.missileBaseDamage * 0.7);
                t.missileAPDamage = Math.floor(t.missileAPDamage * 0.7);
            }
        } 
        this.allUnits[id] = t;
    },
    
init: function() {
        // --- BASE MILITIA (Tier 0) ---
        this.create("Militia", "Militia", ROLES.INFANTRY, false, { weightClass: WEIGHT_CLASSES.LIGHT_INF, health: 20, meleeAttack: 16, meleeDefense: 16, armor: ARMOR_TIERS.CLOTH, speed: 1.1, range: 25, morale: 35, cost: 5 });

        // --- CROSSBOW LINE ---
        this.create("Crossbowman", "Crossbowman", ROLES.CROSSBOW, false, { weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 30, health: 20, meleeAttack: 10, meleeDefense: 10, missileBaseDamage: 12, missileAPDamage: 28, accuracy: 65, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.7, range: 700, morale: 50, cost: 35 });
        this.create("Heavy Crossbowman", "Heavy Crossbowman", ROLES.CROSSBOW, false, { weightClass: WEIGHT_CLASSES.HEAVY_INF, isRanged: true, ammo: 25, health: 40, meleeAttack: 14, meleeDefense: 14, missileBaseDamage: 15, missileAPDamage: 30, accuracy: 70, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 0.6, range: 800, morale: 65, cost: 50 });
        this.create("Bomb", "Bomb", ROLES.BOMB, false, { weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 2, health: 20, meleeAttack: 8, meleeDefense: 8, missileBaseDamage: 30, missileAPDamage: 100, accuracy: 50, armor: ARMOR_TIERS.LEATHER, speed: 0.7, range: 140, morale: 60, cost: 65 });

        // --- SPEAR LINE ---
        this.create("Spearman", "Spearman", ROLES.PIKE, false, { weightClass: WEIGHT_CLASSES.HEAVY_INF, health: 20, meleeAttack: 14, meleeDefense: 16, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, bonusVsLarge: 20, speed: 0.75, range: 30, morale: 55, cost: 10 });
        this.create("Firelance", "Firelance", ROLES.FIRELANCE, false, { weightClass: WEIGHT_CLASSES.HEAVY_INF, isRanged: true, ammo: 1, health: 20, meleeAttack: 16, meleeDefense: 14, missileBaseDamage: 14, missileAPDamage: 45, accuracy: 55, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.8, range: 30, morale: 60, cost: 50 });
        this.create("Heavy Firelance", "Heavy Firelance", ROLES.FIRELANCE, false, { weightClass: WEIGHT_CLASSES.HEAVY_INF, isRanged: true, ammo: 2, health: 40, meleeAttack: 20, meleeDefense: 20, missileBaseDamage: 20, missileAPDamage: 60, accuracy: 60, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 0.75, range: 30, morale: 70, cost: 80 });

        // --- ARCHER LINE ---
        this.create("Archer", "Archer", ROLES.ARCHER, false, { weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 20, health: 20, meleeAttack: 8, meleeDefense: 10, missileBaseDamage: 13, missileAPDamage: 4, accuracy: 55, armor: ARMOR_TIERS.LEATHER, speed: 0.85, range: 700, morale: 50, cost: 25 });
        this.create("Horse Archer", "Horse Archer", ROLES.HORSE_ARCHER, true, { weightClass: WEIGHT_CLASSES.CAV, isRanged: true, ammo: 20, health: 40, meleeAttack: 12, meleeDefense: 12, missileBaseDamage: 11, missileAPDamage: 4, accuracy: 60, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 1.6, range: 700, morale: 60, cost: 50 });
        this.create("Heavy Horse Archer", "Heavy Horse Archer", ROLES.HORSE_ARCHER, true, { weightClass: WEIGHT_CLASSES.HEAVY_CAV, isRanged: true, ammo: 20, health: 40, meleeAttack: 16, meleeDefense: 18, missileBaseDamage: 11, missileAPDamage: 6, accuracy: 65, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 1.4, range: 700, morale: 70, cost: 75 });

        // --- SABRE LINE ---
        this.create("Shielded Infantry", "Shielded Infantry", ROLES.SHIELD, false, { weightClass: WEIGHT_CLASSES.HEAVY_INF, health: 40, meleeAttack: 10, meleeDefense: 18, armor: ARMOR_TIERS.LEATHER, shieldBlockChance: 25, speed: 0.5, range: 20, morale: 60, cost: 30 });
        this.create("Light Two Handed", "Light Two Handed", ROLES.TWO_HANDED, false, { weightClass: WEIGHT_CLASSES.LIGHT_INF, health: 20, meleeAttack: 30, meleeDefense: 12, armor: ARMOR_TIERS.LEATHER, speed: 0.9, range: 20, morale: 65, cost: 35 });
        this.create("Heavy Two Handed", "Heavy Two Handed", ROLES.TWO_HANDED, false, { weightClass: WEIGHT_CLASSES.HEAVY_INF, health: 25, meleeAttack: 36, meleeDefense: 16, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 0.65, range: 20, morale: 75, cost: 60 });

        // --- SCOUT LINE ---
        this.create("Lancer", "Lancer", ROLES.CAVALRY, true, { weightClass: WEIGHT_CLASSES.CAV, health: 25, meleeAttack: 18, meleeDefense: 14, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 1.5, range: 25, morale: 60, cost: 60 });
        this.create("Heavy Lancer", "Heavy Lancer", ROLES.CAVALRY, true, { weightClass: WEIGHT_CLASSES.HEAVY_CAV, health: 50, meleeAttack: 24, meleeDefense: 20, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 1.2, range: 25, morale: 75, cost: 90 });
        this.create("Elite Lancer", "Elite Lancer", ROLES.CAVALRY, true, { weightClass: WEIGHT_CLASSES.HEAVY_CAV, health: 100, meleeAttack: 28, meleeDefense: 24, armor: ARMOR_TIERS.SUPER_HEAVY + 5, speed: 1.2, range: 25, morale: 85, cost: 150 }); 

        // --- FACTION UNIQUES ---
        this.create("Rocket", "Rocket", ROLES.ROCKET, false, { weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 50, health: 30, meleeAttack: 8, meleeDefense: 8, missileBaseDamage: 15, missileAPDamage: 15, accuracy: 55, armor: ARMOR_TIERS.LEATHER, speed: 0.5, range: 520, morale: 55, cost: 55 });
        this.create("Mangudai", "Mangudai", ROLES.HORSE_ARCHER, true, { weightClass: WEIGHT_CLASSES.HEAVY_CAV, isRanged: true, ammo: 35, health: 45, meleeAttack: 18, meleeDefense: 16, missileBaseDamage: 14, missileAPDamage: 8, accuracy: 75, armor: ARMOR_TIERS.SUPER_HEAVY, speed: 1.8, range: 700, morale: 80, cost: 155 });
        this.create("Hand Cannoneer", "Hand Cannoneer", ROLES.GUNNER, false, { weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 30, health: 20, meleeAttack: 10, meleeDefense: 12, missileBaseDamage: 25, missileAPDamage: 50, accuracy: 65, armor: ARMOR_TIERS.CLOTH, speed: 0.75, range: 800, morale: 70, cost: 70 });
        this.create("Camel Cannon", "Camel Cannon", ROLES.MOUNTED_GUNNER, true, { weightClass: WEIGHT_CLASSES.CAV, isRanged: true, ammo: 60, health: 50, meleeAttack: 12, meleeDefense: 14, missileBaseDamage: 35, missileAPDamage: 80, accuracy: 40, armor: ARMOR_TIERS.CLOTH, speed: 0.75, range: 850, morale: 80, cost: 100 });
        this.create("Poison Crossbowman", "Poison Crossbowman", ROLES.CROSSBOW, false, { weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 30, health: 20, meleeAttack: 12, meleeDefense: 12, missileBaseDamage: 60, missileAPDamage: 1, accuracy: 90, armor: ARMOR_TIERS.LEATHER, speed: 0.8, range: 400, morale: 55, cost: 45 });
        this.create("War Elephant", "War Elephant", ROLES.CAVALRY, true, { weightClass: WEIGHT_CLASSES.ELEPHANT, health: 100, meleeAttack: 35, meleeDefense: 20, armor: ARMOR_TIERS.JUGGERNAUT, speed: 0.9, range: 25, morale: 100, cost: 300 });
        this.create("Repeater Crossbowman", "Repeater Crossbowman", ROLES.CROSSBOW, false, { weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 40, health: 30, meleeAttack: 8, meleeDefense: 10, missileBaseDamage: 15, missileAPDamage: 2, accuracy: 45, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.75, range: 700, morale: 55, cost: 40 });
        this.create("Slinger", "Slinger", ROLES.THROWING, false, { weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 30, health: 20, meleeAttack: 6, meleeDefense: 8, missileBaseDamage: 5, missileAPDamage: 7, accuracy: 50, armor: ARMOR_TIERS.CLOTH, speed: 1.0, range: 650, morale: 40, cost: 15 });
        this.create("Glaiveman", "Glaiveman", ROLES.INFANTRY, false, { weightClass: WEIGHT_CLASSES.HEAVY_INF, health: 30, meleeAttack: 18, meleeDefense: 14, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.75, range: 20, morale: 65, cost: 45 });
        
        // --- EXISTING NON-GUI UNITS ---
        this.create("Javelinier", "Javelinier", ROLES.THROWING, false, { weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 4, health: 20, meleeAttack: 10, meleeDefense: 10, missileBaseDamage: 18, missileAPDamage: 15, accuracy: 50, armor: ARMOR_TIERS.LEATHER, speed: 0.85, range: 300, morale: 50, cost: 25 });
    }
};

UnitRoster.init(); 
function getTacticalPosition(role, side, unitType) {
    let offsetX = 0;
    let offsetY = 0;
    let dir = (side === "player") ? -1 : 1;

    // 3. TACTICAL FORMATION LOGIC (Historical Setup)
    switch(role) {
        // --- FRONT LINE: MELEE INFANTRY ---
        // Tightened from 80 to 45 to close the gap to the ranged units
        case ROLES.SHIELD:
        case ROLES.PIKE:
        case ROLES.INFANTRY: 
        case ROLES.TWO_HANDED:
            offsetY = (45 * dir) + (Math.random() * 10 - 5); 
            break;

        // --- SECOND LINE: RANGED & SPECIALISTS ---
        // Tightened from 30 to 15 to stay immediately behind the infantry
        case ROLES.THROWING:
        case ROLES.GUNNER:
        case ROLES.CROSSBOW:
        case ROLES.ARCHER:
        case ROLES.FIRELANCE:
        case ROLES.BOMB:
        case ROLES.ROCKET:
            offsetY = (15 * dir) + (Math.random() * 6 - 3);
            break;

        // --- FLANKS: CAVALRY, CAMELS, ELEPHANTS ---
        // Cavalry is now centered vertically with the army core (0 offset)
        case ROLES.CAVALRY:
        case ROLES.HORSE_ARCHER:
        case ROLES.MOUNTED_GUNNER:
            offsetY = (0 * dir) + (Math.random() * 10 - 5);
            
            let flankSide = (Math.random() > 0.5) ? 1 : -1;
            let isHeavy = unitType && (unitType.includes("Elephant") || unitType.includes("Cannon"));
            
            // Fixed base width to keep them out of the center-line's way
            let baseFlankX = isHeavy ? 400 : 320;
            offsetX = (flankSide * baseFlankX) + (Math.random() * 40 - 20); 
            break;

        // --- REARGUARD / COMMANDER / UNKNOWN ---
        // Moved from -80 to -25. This puts the commander right behind the archers.
        default:
            offsetY = (-25 * dir) + (Math.random() * 4 - 2);
            break;
    }
    
    // 4. FINAL MICRO-JITTER
    // Restricting jitter to sub-pixel levels to maintain the grid feel
    offsetX += (Math.random() * 2 - 1);
    offsetY += (Math.random() * 2 - 1);

    return { x: offsetX, y: offsetY };
}
// ============================================================================
// BATTLE RESOLUTION & SUMMARY UI
// ============================================================================
 
function getReloadTime(unit) {
	
	    if (!unit || !unit.stats) return 60;
		
    const role = unit.stats.role;
    const name = unit.unitType;
	// Unit Type           | Time
// ------------------- | ------------------------
// Melee               | 1.0 sec
// Throwing            | 2.0 sec
// Archer              | 2.5 sec
// Crossbow            | 2.5 sec
// Repeater burst      | 0.5 sec (10 shots) then 8 second magazine reload
// Repeater full cycle | 5.83 sec
// Bomb                | 5.8 sec
// Rocket              | near instant
 

    if (name === "Rocket") return 15;
    if (name === "Repeater Crossbowman") return 150;
    
    if (role === ROLES.ARCHER || role === ROLES.HORSE_ARCHER) return 150;
    if (role === ROLES.CROSSBOW) return 300;
    if (role === ROLES.GUNNER || role === ROLES.MOUNTED_GUNNER) return 300; 
    if (role === ROLES.FIRELANCE) return 80;
    if (role === ROLES.THROWING) return 120;
    if (role === ROLES.BOMB) return 250;

	if (!unit.isRanged) {
		if (role === ROLES.TWO_HANDED) return 80;
		if (role === ROLES.SHIELD) return 50;
		if (role === ROLES.CAVALRY) return 70;
		return 60;
	}


    return 60; 
}

    let lastSortTime = 0;
    const SORT_INTERVAL = 100; 
	let sortedUnitsCache = []; // Store the sorted copy here
       ////////////////////////////////
        // BELOW IS ALL RENDERING WHICH SHOULD BE A NEW JS TBH
		////////////////////////////////
function drawBattleUnits(ctx) {
	
	// ---> ADD THIS FIX: Render Wagons before units so they sit on the ground <---
    const centerX = BATTLE_WORLD_WIDTH / 2 - 150; 
    const pColor = (currentBattleData && currentBattleData.playerColor) ? currentBattleData.playerColor : "#2196f3";
    const eColor = (currentBattleData && currentBattleData.enemyColor) ? currentBattleData.enemyColor : "#f44336";

    // Pass a dummy camera {x:0, y:0} because index.html already translated the canvas!
    drawSupplyLines(ctx, centerX, 80, eColor, {x: 0, y: 0});
    drawSupplyLines(ctx, centerX, BATTLE_WORLD_HEIGHT - 80, pColor, {x: 0, y: 0});
    // -----------------------------------------------------------------------------

 
// --- CLEAN FIX: Only sort the cache, leave the original array alone ---
    if (performance.now() - lastSortTime > SORT_INTERVAL) {
        sortedUnitsCache = [...battleEnvironment.units].sort((a, b) => a.y - b.y);
        lastSortTime = performance.now();
    }

    let time = Date.now() / 50;




 

    sortedUnitsCache.forEach(unit => {
		
		// --- FIREWALL: Skip corrupt data ---
    if (isNaN(unit.x) || isNaN(unit.y)) return; 
    // ---> INSERT CULLING HERE <---
        // Skip rendering if the unit is outside the viewable area
// ---> INSERT CULLING HERE <---
        // Skip rendering if the unit is outside the viewable area
        if (typeof camera !== 'undefined' && camera && typeof isOnScreen === 'function') {
            if (!isOnScreen(unit, camera)) return;
        }
        let isMoving = unit.state === "moving";
        let frame = time + unit.animOffset;
        let isAttacking = unit.state === "attacking" && unit.cooldown > (unit.stats.isRanged ? 30 : 40);

// ---> SURGERY: Draw Selection Ring <---
if (unit.selected && unit.hp > 0) {
            ctx.save();
            ctx.translate(unit.x, unit.y);
            ctx.strokeStyle = "rgba(255, 235, 59, 0.8)"; // Bright Yellow
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 5, 12, 6, 0, 0, Math.PI * 2.7); // Perspective oval under feet
            ctx.stroke();
            ctx.restore();
        }
        // ---> END SURGERY <---


        let visType = "peasant";
        
// --- UPDATED VISUAL TYPE LOGIC ---
if ((typeof player !== 'undefined' && unit === player) || unit.isPlayer) {
    visType = "horse_archer"; 
} else if (unit.stats.role === ROLES.CAVALRY || unit.stats.role === ROLES.MOUNTED_GUNNER) {
    // If it's a mounted gunner or the name contains "Camel", use the camel renderer
    if (unit.unitType === "War Elephant") {
        visType = "elephant";
    } else if (unit.unitType === "Camel Cannon" || unit.unitType.toLowerCase().includes("camel")) {
        visType = "camel";
    } else {
        visType = "cavalry";
    }
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
        } 
		else if (unit.stats.role === ROLES.FIRELANCE) {
    // Dedicated line for Firelances
		visType = "firelance";}
		
		else if (unit.stats.role === ROLES.ARCHER) {
            visType = "archer";
        } else if (unit.stats.role === ROLES.THROWING) {
            visType = "throwing"; 
        } else if (unit.stats.role === ROLES.GUNNER || unit.stats.role === ROLES.FIRELANCE) {
            visType = "gun";
        } else if (unit.stats.role === ROLES.BOMB) {
            visType = "bomb";
			} else if (unit.stats.role === ROLES.ROCKET) {
    visType = "rocket";
        } else if (unit.unitType === "Militia") {
            visType = "peasant";
        }
		
if (unit.stats.isRanged && unit.stats.ammo <= 0) {
    if (visType === "horse_archer") {
        visType = "cavalry"; 
    } else if (visType === "camel") {
        // KEEP it as a camel! We handle its melee mode inside drawCavalryUnit.
        visType = "camel"; 
    } else {
        visType = "shortsword"; 
    }
}

// ---> NEW: Determine if they are retreating <---
        // ONLY raise the white flag if they are broken AND have crossed the red tactical boundary
        let isFleeing = unit.stats.morale <= 0 && 
                        (unit.x < 0 || unit.x > BATTLE_WORLD_WIDTH || 
                         unit.y < 0 || unit.y > BATTLE_WORLD_HEIGHT);
						 
						 
						 
						 
						 
						 
// ---> INSERT ANIMATION SYNC HERE <---
// This calculates the specific frame progress for reload/release cycles
let reloadProgress = 0;
if (unit.state === "attacking" && unit.stats.isRanged) {
    // Standardizing the cycle to a 0.0 - 1.0 range for the renderers
    reloadProgress = (unit.cooldown / (unit.stats.fireRate || 100));
}
// ---> SURGERY: DEAD UNIT RENDERING <---
let isDead = unit.hp <= 0;
if (isDead) {
    drawBloodPool(ctx, unit);
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.rotate(unit.deathRotation || Math.PI / 2);
    ctx.translate(-unit.x, -unit.y);
}

// 1. Dispatch to the correct renderer
if (["cavalry", "elephant", "camel", "horse_archer"].includes(visType)) {
    drawCavalryUnit(
        ctx, unit.x, unit.y, isMoving, frame, unit.color, 
        isAttacking, visType, unit.side, unit.unitType, 
        isFleeing, unit.cooldown, unit.ammo, unit, reloadProgress
    );
} else {
    drawInfantryUnit(
        ctx, unit.x, unit.y, isMoving, frame, unit.color, 
        visType, isAttacking, unit.side, unit.unitType, 
        isFleeing, unit.cooldown, unit.ammo, unit, reloadProgress
    );
}

if (isDead) {
    ctx.restore();
    return; // EXIT EARLY: Skip drawing health bars, exp bars, and names on corpses
	}
	
	 


// 2. SURGICAL NAME OVERRIDE: Show "PLAYER" if it's the commander
ctx.fillStyle = "#ffffff";
ctx.font = unit.isCommander ? "bold 6px Georgia" : "4px Georgia"; // Bolder for player
ctx.textAlign = "center";
let displayName = unit.isCommander ? "PLAYER" : unit.unitType;
ctx.fillText(displayName, unit.x, unit.y - 21);

// 3. HEALTH BAR CONFIG
const barWidth = 24;
const barHeight = 4;
const barY = unit.y - 30; 

// --- SURGICAL DEBUG UI OVERRIDE --- 
// Changed from 'unit.isCommander' so ALL player troops show stats
if (unit.side === "player") {
    ctx.save();
    
    // 1. Configure Debug Font (Slightly smaller for troops so it doesn't clutter)
   ctx.textAlign = "center";
  ctx.font = unit.isCommander ? "bold 8px monospace" : "6px monospace"; 
    
    // Change color based on Level (Gold for Level 3+, White for recruits)
    let lvl = unit.stats.experienceLevel || 1;
   ctx.fillStyle = lvl >= 3 ? "#ffca28" : "#ffffff"; 

    // 2. Build the Debug String
  //  let ma = unit.stats.meleeAttack;
  //  let df = unit.stats.armor;    
  //  let acc = unit.stats.accuracy;

 //   let debugText = `LVL:${Math.floor(lvl)} | ATK:${ma} | DF:${df} | ACC:${acc}`;

    // 3. Draw the Label
  //  ctx.fillText(debugText, unit.x, barY - 10);

    // 4. SATISFACTION / EXP BAR
    const expProgress = lvl % 1; 
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
   ctx.fillRect(unit.x - barWidth / 2, barY - 6, barWidth, 2); // EXP Background
    
    // Blue for Commander, Green for regular troops
   ctx.fillStyle = unit.isCommander ? "#4fc3f7" : "#81c784"; 
   ctx.fillRect(unit.x - barWidth / 2, barY - 6, barWidth * expProgress, 2); // EXP Fill

    ctx.restore();
}

// 5. HEALTH BAR RENDERING
// Draw Background (Red/Empty)
ctx.fillStyle = "rgba(200, 0, 0, 0.5)";
ctx.fillRect(unit.x - barWidth / 2, barY, barWidth, barHeight);

// Draw Health Fill (Green for Allies, Orange/Red for Enemies)
const healthPercent = Math.max(0, unit.hp / unit.stats.health);
ctx.fillStyle = unit.side === "COMMANDER" ? "#4caf50" : "#ff5722"; 
ctx.fillRect(unit.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

// Draw Border
ctx.strokeStyle = "#000";
ctx.lineWidth = 1;
ctx.strokeRect(unit.x - barWidth / 2, barY, barWidth, barHeight);
}); 

battleEnvironment.projectiles.forEach(p => {
		if (isNaN(p.x) || isNaN(p.y)) return; // Safety check
		
		
// ---> INSERT CULLING HERE <---
        if (typeof camera !== 'undefined' && camera && typeof isOnScreen === 'function') {
            if (!isOnScreen(p, camera)) return;
        }
		
let vx = p.vx || p.dx || 0; 
let vy = p.vy || p.dy || 0;
let angle = (vx === 0 && vy === 0) ? 0 : Math.atan2(vy, vx);
        ctx.save(); 
        ctx.translate(p.x, p.y);

        let isBomb = p.attackerStats && p.attackerStats.role === "bomb";
		let isRocket = (p.type === "rocket") || 
               (p.attackerStats && (p.attackerStats.role === ROLES.ROCKET || p.attackerStats.name.includes("Rocket")));
			   let isJavelin = p.attackerStats && p.attackerStats.name === "Javelinier";
        let isSlinger = p.attackerStats && p.attackerStats.name === "Slinger";
		

let isBullet = p.attackerStats && (
    p.attackerStats.role === "gunner" || 
    p.attackerStats.role === "mounted_gunner" ||
    (p.attackerStats.name && p.attackerStats.name.toLowerCase().includes("camel"))
);

        let isBolt = p.attackerStats && p.attackerStats.name === "Crossbowman";
        // Default to arrow if it's not any of the above but comes from an archer/horse archer
		let isArrow = !isBomb && !isRocket && !isJavelin && !isSlinger && !isBolt && !isBullet;
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
    // 1. High-Velocity Angle & Physics
    ctx.rotate(angle);
    
    // Subtle high-frequency jitter for powder burning instability
    let jitterY = (Math.sin(Date.now() * 0.1) * 0.8);

    // 2. THE LONG SKINNY SHAFT (Medieval Arrow Base)
    ctx.strokeStyle = "#5d4037"; 
    ctx.lineWidth = 0.6; // Ultra skinny
    ctx.beginPath(); 
    ctx.moveTo(-28, jitterY); // Extended back for length
    ctx.lineTo(12, jitterY);  // Pointing forward
    ctx.stroke();

    // 3. FLETCHING (The feathers at the back)
    ctx.fillStyle = "#eeeeee"; // White feathers
    ctx.beginPath();
    ctx.moveTo(-28, jitterY);
    ctx.lineTo(-34, jitterY - 2.5);
    ctx.lineTo(-30, jitterY);
    ctx.lineTo(-34, jitterY + 2.5);
    ctx.closePath();
    ctx.fill();

    // 4. THE POWDER TUBE (Lashed to the shaft)
    // We draw this slightly offset to look like it's tied to the side
    ctx.fillStyle = "#4e342e"; 
    ctx.strokeStyle = "#212121";
    ctx.lineWidth = 0.5;
    // Small, slender tube lashed to the front-middle
    ctx.fillRect(-6, jitterY + 0.5, 14, 2.2); 
    ctx.strokeRect(-6, jitterY + 0.5, 14, 2.2);
    
    // Lashings (The string holding the tube to the arrow)
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.moveTo(-4, jitterY); ctx.lineTo(-4, jitterY + 2.5);
    ctx.moveTo(4, jitterY); ctx.lineTo(4, jitterY + 2.5);
    ctx.stroke();

    // 5. THE ARROWHEAD (Sharp Warhead)
    ctx.fillStyle = "#424242";
    ctx.beginPath();
    ctx.moveTo(12, jitterY - 1.2);
    ctx.lineTo(20, jitterY); // Very long, piercing tip
    ctx.lineTo(12, jitterY + 1.2);
    ctx.fill();

    // 6. PROPELLANT EFFECTS (Coming from the back of the tube)
    let tubeBackX = -6;
    let flameSize = 3 + Math.random() * 5;
    let fGrd = ctx.createLinearGradient(tubeBackX, 0, tubeBackX - flameSize, 0);
    fGrd.addColorStop(0, "#fff59d");
    fGrd.addColorStop(0.4, "#ff9800");
    fGrd.addColorStop(1, "rgba(255, 87, 34, 0)");
    
    ctx.fillStyle = fGrd;
    ctx.beginPath();
    ctx.moveTo(tubeBackX, jitterY + 1);
    ctx.lineTo(tubeBackX - flameSize, jitterY + 1.5);
    ctx.lineTo(tubeBackX, jitterY + 2);
    ctx.fill();

    // 7. VOLUMINOUS SMOKE TRAIL
    ctx.fillStyle = "rgba(200, 200, 200, 0.35)";
    for (let i = 0; i < 5; i++) {
        let smokeX = tubeBackX - (i * 7);
        let smokeSize = 1.5 + i;
        ctx.beginPath();
        // Smoke drifts slightly "up" relative to the arrow's path
        ctx.arc(smokeX, (jitterY + 1.5) + (Math.sin(Date.now()/40 + i) * 1.5), smokeSize, 0, Math.PI * 2);
        ctx.fill();
    }
}
		
else if (p.isFire || p.projectileType === "firelance" || (p.projectileType && p.projectileType.includes("Firelance"))) {

            ctx.rotate(angle);

            // 1. Scale Settings (5x the original size)
            // Original was ~6px wide, now 30-50px wide spread
            const blastLength = 65; 
            const blastWidth = 40; 
            const jitter = (Math.random() - 0.5) * 10; // Adds "flicker" effect

            // 2. Create the "Hot Core" to "Fading Ember" Gradient
            // This removes the "bullet" look by blending the origin into the flame
            let fireGrd = ctx.createRadialGradient(0, 0, 2, 20, 0, blastLength);
            fireGrd.addColorStop(0, "rgba(255, 255, 255, 0.9)");   // White-hot center
            fireGrd.addColorStop(0.2, "rgba(255, 230, 100, 0.8)"); // Bright Yellow
            fireGrd.addColorStop(0.4, "rgba(255, 100, 0, 0.6)");   // Deep Orange
            fireGrd.addColorStop(0.7, "rgba(200, 40, 0, 0.3)");    // Red Glow
            fireGrd.addColorStop(1, "rgba(50, 50, 50, 0)");        // Dissipating Smoke

            // 3. Draw the Conical Blast Shape
            ctx.fillStyle = fireGrd;
            ctx.beginPath();
            ctx.moveTo(-5, 0); // Start slightly behind the tip for better "attachment"
            
            // Top curve of the jet
            ctx.quadraticCurveTo(blastLength * 0.4, -blastWidth + jitter, blastLength, jitter);
            // Bottom curve of the jet back to origin
            ctx.quadraticCurveTo(blastLength * 0.4, blastWidth + jitter, -5, 0);
            
            ctx.fill();

            // 4. Heat Distortion / Inner Turbulence
            // This adds extra "thickness" to the blast without adding "bullets"
            ctx.globalCompositeOperation = "lighter"; // Makes the fire "glow" onto itself
            ctx.fillStyle = "rgba(255, 150, 50, 0.2)";
            for (let i = 0; i < 2; i++) {
                let s = 10 + Math.random() * 15;
                ctx.beginPath();
                ctx.arc(Math.random() * 30, (Math.random() - 0.5) * 15, s, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = "source-over"; // Reset to normal

            // 5. Large Smoke Clouds (Tail)
            ctx.fillStyle = "rgba(100, 100, 100, 0.2)";
            ctx.beginPath();
            ctx.arc(-15, jitter, 15, 0, Math.PI * 2);
            ctx.arc(-25, -jitter, 10, 0, Math.PI * 2);
            ctx.fill();
        }
else if (isJavelin) {
            // --- SURGERY START: High-Fidelity Javelin ---
            // Long thrown spear
            ctx.rotate(angle);
            
            // Shaft - matches unit's wood color
            ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.moveTo(-12, 0); // Tail
            ctx.lineTo(8, 0);   // To head base
            ctx.stroke();
            
            // Matching leaf-shaped iron tip
            ctx.fillStyle = "#bdbdbd";
            ctx.beginPath();
            ctx.moveTo(8, 0);      // Base of metal head
            ctx.lineTo(6, -2.5);   // Flare top back
            ctx.lineTo(16, 0);     // Sharp tip
            ctx.lineTo(6, 2.5);    // Flare bottom back
            ctx.closePath();
            ctx.fill();
            // --- SURGERY END ---
        }
        else if (isSlinger) {
            // --- SURGERY START: Slinger Stone ---
            // Small aerodynamic lead/stone bullet
            ctx.rotate(angle);
            
            // Subtle motion trail
            ctx.fillStyle = "rgba(158, 158, 158, 0.4)";
            ctx.beginPath();
            ctx.ellipse(-3, 0, 5, 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // The Stone itself
            ctx.fillStyle = "#9e9e9e";
            ctx.beginPath();
            ctx.arc(0, 0, 2.5, 0, Math.PI * 2); // Slightly larger than the unit-held stone for visibility
            ctx.fill();
            // --- SURGERY END ---
        }
		
		else if (isBolt) {
            // --- SURGERY START: Heavy Crossbow Bolt ---
            ctx.rotate(angle);
            
            // Bolts are shorter and thicker than arrows
            ctx.fillStyle = "#5d4037"; // Darker wood
            ctx.fillRect(-4, -1, 8, 2); 

            // Heavy triangular head
            ctx.fillStyle = "#757575"; 
            ctx.beginPath();
            ctx.moveTo(4, -2); ctx.lineTo(9, 0); ctx.lineTo(4, 2);
            ctx.fill();

            // Wood Fletchings (Brown/Tan instead of feathers)
            ctx.fillStyle = "#8d6e63"; 
            ctx.fillRect(-5, -1.5, 3, 3);
            // --- SURGERY END ---
        }
        else if (isArrow) {
            // --- SURGERY START: Slim Standard Arrow ---
            ctx.rotate(angle);
            
            // Thinner, longer shaft
            ctx.fillStyle = "#8d6e63"; 
            ctx.fillRect(-6, -0.5, 12, 1); 

            // Needle-like arrowhead
            ctx.fillStyle = "#9e9e9e"; 
            ctx.beginPath();
            ctx.moveTo(6, -1.5); ctx.lineTo(11, 0); ctx.lineTo(6, 1.5);
            ctx.fill();

            // Green "Forest" Fletchings (To differ from Red Horse Archer feathers)
            ctx.fillStyle = "#4caf50"; 
            ctx.fillRect(-7, -1.5, 4, 1);
            ctx.fillRect(-7, 0.5, 4, 1);
            // --- SURGERY END ---
        }
		else if (isBullet) {
 
            // --- SURGERY START: Handcannon Lead Ball ---
            ctx.rotate(angle);

            // 1. Long Motion Blur/Smoke Trail
            // This makes the fast bullet visible to the player
            let gradient = ctx.createLinearGradient(-15, 0, 0, 0);
            gradient.addColorStop(0, "rgba(140, 140, 140, 0)");   // Fade out
            gradient.addColorStop(1, "rgba(100, 100, 100, 0.6)"); // Smoke color
            
            ctx.fillStyle = gradient;
            ctx.fillRect(-18, -1, 18, 2); 

            // 2. The Lead Ball
            ctx.fillStyle = "#424242"; // Dark lead/iron
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 1);
            ctx.fill();

            // 3. Incandescent Tip (Heat from the barrel)
            // A tiny orange-hot glow at the very front
            ctx.fillStyle = "#ff5722"; 
            ctx.beginPath();
            ctx.arc(1, 0, 1, 0, Math.PI * 1);
            ctx.fill();
  
        }
        else {
            // FALLBACK: Standard Bolt if all else fails
            ctx.rotate(angle);
            ctx.fillStyle = "#8d6e63";
            ctx.fillRect(-4, -0.5, 8, 1);
            ctx.fillStyle = "#9e9e9e";
            ctx.fillRect(2, -1.5, 3, 3);
        }
ctx.restore();
    });
	
	
	
	// --- DRAW RTS SELECTION BOX ---
    if (typeof isBoxSelecting !== 'undefined' && isBoxSelecting) {
        ctx.save();
        ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
        ctx.fillStyle = "rgba(0, 255, 0, 0.15)";
        ctx.lineWidth = 1;
        
        let width = selectionBoxCurrent.x - selectionBoxStart.x;
        let height = selectionBoxCurrent.y - selectionBoxStart.y;
        
        ctx.fillRect(selectionBoxStart.x, selectionBoxStart.y, width, height);
        ctx.strokeRect(selectionBoxStart.x, selectionBoxStart.y, width, height);
        ctx.restore();
    }
	
	
	// ---> FINAL UI LAYER <---
    // This ensures the player stats/roster are never hidden by unit sprites
    if (typeof drawPlayerOverlay === 'function') {
        // We use a dummy camera or reset transform if the UI is screen-space
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        drawPlayerOverlay(ctx, player);
        ctx.restore();
    }
	
	
	
}


  