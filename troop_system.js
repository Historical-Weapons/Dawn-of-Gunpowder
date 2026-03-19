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

class Troop {
    constructor(name, role, isLarge, faction = "Generic") 
	{
        this.name = name;
        this.role = role;
        this.isLarge = isLarge;
        this.faction = faction;
        
		this.experienceLevel = 1; this.morale = 20; this.maxMorale = 20; this.stamina = 100; this.health = 50; this.meleeAttack = 10; this.meleeDefense = 10;
        this.armor = ARMOR_TIERS.CLOTH; this.shieldBlockChance = 0; this.bonusVsLarge = 0;  this.isRanged = false; this.ammo = 0; this.accuracy = 0; this.reloadSpeed = 0; this.missileBaseDamage = 0; this.missileAPDamage = 0;
		this.speed = 0.8;  this.range = 20; 
        this.currentStance = "statusmelee"; 
    }
	
gainExperience(amount) {
    if (this.level >= 10) return; // Cap level at 10

    // 1. Add to a dedicated experience pool, NOT the level itself
    this.experience = (this.experience || 0) + amount;

    // 2. Define how much is needed for the NEXT level
    // Formula: Level 1 needs 1.0, Level 2 needs 2.0, Level 3 needs 3.0...
    let expNeeded = this.level * 1.0; 

    // 3. Level up logic with a "While" loop to handle large XP gains correctly
    while (this.experience >= expNeeded && this.level < 10) {
        this.experience -= expNeeded; // Consume the XP
        this.level++;
        
        // Boost stats on level up
        this.meleeAttack += 2;
        this.meleeDefense += 2;
        this.health = Math.min(this.maxHealth || 100, this.health + 10);
        
        console.log(`${this.name} reached Level ${this.level}!`);
        
        // Update requirement for the NEXT level in the loop
        expNeeded = this.level * 1.0;
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
        this.create("Militia", "Militia", ROLES.INFANTRY, false, { health: 20, meleeAttack: 6, meleeDefense: 6, armor: ARMOR_TIERS.CLOTH, speed: 1.1, range: 15, morale: 35, cost: 5 });

        // --- CROSSBOW LINE ---
        this.create("Crossbowman", "Crossbowman", ROLES.CROSSBOW, false, { isRanged: true, ammo: 18, health: 20, meleeAttack: 10, meleeDefense: 10, missileBaseDamage: 12, missileAPDamage: 28, accuracy: 65, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.7, range: 800, morale: 50, cost: 35 });
        this.create("Heavy Crossbowman", "Heavy Crossbowman", ROLES.CROSSBOW, false, { isRanged: true, ammo: 16, health: 22, meleeAttack: 14, meleeDefense: 14, missileBaseDamage: 15, missileAPDamage: 30, accuracy: 70, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 0.65, range: 800, morale: 65, cost: 50 });
        this.create("Bomb", "Bomb", ROLES.BOMB, false, { isRanged: true, ammo: 1, health: 20, meleeAttack: 8, meleeDefense: 8, missileBaseDamage: 30, missileAPDamage: 100, accuracy: 50, armor: ARMOR_TIERS.LEATHER, speed: 0.7, range: 140, morale: 60, cost: 65 });

        // --- SPEAR LINE ---
        this.create("Spearman", "Spearman", ROLES.PIKE, false, { health: 20, meleeAttack: 14, meleeDefense: 16, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, bonusVsLarge: 20, speed: 0.75, range: 30, morale: 55, cost: 10 });
        this.create("Firelance", "Firelance", ROLES.FIRELANCE, false, { isRanged: true, ammo: 2, health: 20, meleeAttack: 16, meleeDefense: 14, missileBaseDamage: 14, missileAPDamage: 45, accuracy: 55, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.8, range: 30, morale: 60, cost: 50 });
        this.create("Heavy Firelance", "Heavy Firelance", ROLES.FIRELANCE, false, { isRanged: true, ammo: 2, health: 25, meleeAttack: 20, meleeDefense: 20, missileBaseDamage: 20, missileAPDamage: 60, accuracy: 60, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 0.75, range: 30, morale: 70, cost: 80 });

        // --- ARCHER LINE ---
        this.create("Archer", "Archer", ROLES.ARCHER, false, { isRanged: true, ammo: 25, health: 20, meleeAttack: 8, meleeDefense: 10, missileBaseDamage: 12, missileAPDamage: 4, accuracy: 55, armor: ARMOR_TIERS.LEATHER, speed: 0.85, range: 700, morale: 50, cost: 25 });
        this.create("Horse Archer", "Horse Archer", ROLES.HORSE_ARCHER, true, { isRanged: true, ammo: 25, health: 40, meleeAttack: 12, meleeDefense: 12, missileBaseDamage: 10, missileAPDamage: 4, accuracy: 60, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 1.6, range: 700, morale: 60, cost: 50 });
        this.create("Heavy Horse Archer", "Heavy Horse Archer", ROLES.HORSE_ARCHER, true, { isRanged: true, ammo: 22, health: 45, meleeAttack: 16, meleeDefense: 18, missileBaseDamage: 11, missileAPDamage: 6, accuracy: 65, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 1.4, range: 700, morale: 70, cost: 75 });

        // --- SABRE LINE ---
        this.create("Shielded Infantry", "Shielded Infantry", ROLES.SHIELD, false, { health: 40, meleeAttack: 10, meleeDefense: 18, armor: ARMOR_TIERS.LEATHER, shieldBlockChance: 25, speed: 0.5, range: 20, morale: 60, cost: 30 });
        this.create("Light Two Handed", "Light Two Handed", ROLES.TWO_HANDED, false, { health: 20, meleeAttack: 30, meleeDefense: 12, armor: ARMOR_TIERS.LEATHER, speed: 0.9, range: 20, morale: 65, cost: 35 });
        this.create("Heavy Two Handed", "Heavy Two Handed", ROLES.TWO_HANDED, false, { health: 25, meleeAttack: 36, meleeDefense: 16, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 0.65, range: 20, morale: 75, cost: 60 });

        // --- SCOUT LINE ---
        this.create("Lancer", "Lancer", ROLES.CAVALRY, true, { health: 25, meleeAttack: 18, meleeDefense: 14, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 1.5, range: 25, morale: 60, cost: 60 });
        this.create("Heavy Lancer", "Heavy Lancer", ROLES.CAVALRY, true, { health: 50, meleeAttack: 24, meleeDefense: 20, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 1.2, range: 25, morale: 75, cost: 90 });
        this.create("Elite Lancer", "Elite Lancer", ROLES.CAVALRY, true, { health: 100, meleeAttack: 28, meleeDefense: 24, armor: ARMOR_TIERS.SUPER_HEAVY + 5, speed: 1.2, range: 25, morale: 85, cost: 130 }); 

        // --- FACTION UNIQUES ---
        this.create("Rocket", "Rocket", ROLES.BOMB, false, { isRanged: true, ammo: 5, health: 20, meleeAttack: 8, meleeDefense: 8, missileBaseDamage: 16, missileAPDamage: 100, accuracy: 65, armor: ARMOR_TIERS.LEATHER, speed: 0.8, range: 220, morale: 55, cost: 55 });
        this.create("Mangudai", "Mangudai", ROLES.HORSE_ARCHER, true, { isRanged: true, ammo: 35, health: 45, meleeAttack: 18, meleeDefense: 16, missileBaseDamage: 14, missileAPDamage: 8, accuracy: 75, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 1.8, range: 700, morale: 80, cost: 95 });
        this.create("Hand Cannoneer", "Hand Cannoneer", ROLES.GUNNER, false, { isRanged: true, ammo: 8, health: 20, meleeAttack: 10, meleeDefense: 12, missileBaseDamage: 25, missileAPDamage: 80, accuracy: 65, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.75, range: 120, morale: 70, cost: 70 });
        this.create("Camel Cannon", "Camel Cannon", ROLES.CAVALRY, true, { isRanged: true, ammo: 30, health: 50, meleeAttack: 12, meleeDefense: 14, missileBaseDamage: 35, missileAPDamage: 80, accuracy: 60, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 1.0, range: 150, morale: 80, cost: 150 });
        this.create("Poison Crossbowman", "Poison Crossbowman", ROLES.CROSSBOW, false, { isRanged: true, ammo: 20, health: 20, meleeAttack: 12, meleeDefense: 12, missileBaseDamage: 100, missileAPDamage: 4, accuracy: 60, armor: ARMOR_TIERS.LEATHER, speed: 0.8, range: 400, morale: 55, cost: 45 });
        this.create("War Elephant", "War Elephant", ROLES.CAVALRY, true, { health: 100, meleeAttack: 35, meleeDefense: 20, armor: ARMOR_TIERS.JUGGERNAUT, speed: 0.9, range: 25, morale: 100, cost: 300 });
        this.create("Repeater Crossbowman", "Repeater Crossbowman", ROLES.CROSSBOW, false, { isRanged: true, ammo: 40, health: 20, meleeAttack: 8, meleeDefense: 10, missileBaseDamage: 15, missileAPDamage: 2, accuracy: 45, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.75, range: 400, morale: 55, cost: 40 });
        this.create("Slinger", "Slinger", ROLES.THROWING, false, { isRanged: true, ammo: 30, health: 20, meleeAttack: 6, meleeDefense: 8, missileBaseDamage: 8, missileAPDamage: 12, accuracy: 50, armor: ARMOR_TIERS.CLOTH, speed: 1.0, range: 320, morale: 40, cost: 5 });
        this.create("Glaiveman", "Glaiveman", ROLES.INFANTRY, false, { health: 22, meleeAttack: 18, meleeDefense: 14, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.75, range: 20, morale: 65, cost: 45 });
        
        // --- EXISTING NON-GUI UNITS ---
        this.create("Javelinier", "Javelinier", ROLES.THROWING, false, { isRanged: true, ammo: 6, health: 20, meleeAttack: 10, meleeDefense: 10, missileBaseDamage: 18, missileAPDamage: 15, accuracy: 50, armor: ARMOR_TIERS.LEATHER, speed: 0.85, range: 250, morale: 50, cost: 25 });
    }
};

UnitRoster.init(); 

function getTacticalPosition(role, side) {
    let position = { x: 0, y: 0 };
    let dir = side === "player" ? -1 : 1; 
    switch(role) {
        case ROLES.GUNNER:  position.y = 40 * dir; break; 
        case ROLES.SHIELD:  position.y = 20 * dir; break; 
        case ROLES.PIKE:    position.y = 0; break; 
        case ROLES.ARCHER:  position.y = -40 * dir; break;
        case ROLES.CAVALRY: position.y = 20 * dir; position.x = Math.random() > 0.5 ? 200 : -200; break;
    }
    return position;
}

// ============================================================================
// BATTLE RESOLUTION & SUMMARY UI
// ============================================================================
 
function getReloadTime(unit) {
    const role = unit.stats.role;
    const name = unit.unitType;

    if (name === "Rocket") return 400;
    if (name === "Repeater Crossbowman") return 300;
    
    if (role === ROLES.ARCHER || role === ROLES.HORSE_ARCHER) return 100;
    if (role === ROLES.CROSSBOW) return 200;
    if (role === ROLES.GUNNER) return 300;
    if (role === ROLES.FIRELANCE) return 300;
    if (role === ROLES.THROWING) return 120;
    if (role === ROLES.BOMB) return 350;

    return 60; 
}



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

let activeUnits = battleEnvironment.units; // <--- RENAME TO activeUnits
  
    // ... rest of the function remains the same
	
    let units = battleEnvironment.units;
    let time = Date.now() / 50;

    let lastSortTime = 0;
    const SORT_INTERVAL = 100; 

    if (performance.now() - lastSortTime > SORT_INTERVAL) {
        units.sort((a, b) => a.y - b.y);
        lastSortTime = performance.now();
    }

    units.forEach(unit => {
        let isMoving = unit.state === "moving";
        let frame = time + unit.animOffset;
        let isAttacking = unit.state === "attacking" && unit.cooldown > (unit.stats.isRanged ? 30 : 40);

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
            visType = "throwing"; 
        } else if (unit.stats.role === ROLES.GUNNER || unit.stats.role === ROLES.FIRELANCE) {
            visType = "gun";
        } else if (unit.stats.role === ROLES.BOMB) {
            visType = "bomb";
        } else if (unit.unitType === "Militia") {
            visType = "peasant";
        }
		
        if (unit.stats.isRanged && unit.stats.ammo <= 0) {
            if (visType === "horse_archer" ) {
                visType = "cavalry"; 
            } else {
                visType = "shortsword"; 
            }
        }

// ---> NEW: Determine if they are retreating <---
        // ONLY raise the white flag if they are broken AND have crossed the red tactical boundary
        let isFleeing = unit.stats.morale <= 0 && 
                        (unit.x < 0 || unit.x > BATTLE_WORLD_WIDTH || 
                         unit.y < 0 || unit.y > BATTLE_WORLD_HEIGHT);
        // 1. Dispatch to the correct renderer
        if (["cavalry", "elephant", "camel", "horse_archer"].includes(visType)) {
            // ADD 'isFleeing' as the final parameter
            drawCavalryUnit(ctx, unit.x, unit.y, isMoving, frame, unit.color, isAttacking, visType, unit.side, unit.unitType, isFleeing);
        } else {
            // ADD 'isFleeing' as the final parameter
            drawInfantryUnit(ctx, unit.x, unit.y, isMoving, frame, unit.color, visType, isAttacking, unit.side, unit.unitType, isFleeing);
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
    let ma = unit.stats.meleeAttack;
    let df = unit.stats.armor;    
    let acc = unit.stats.accuracy;

    let debugText = `LVL:${Math.floor(lvl)} | ATK:${ma} | DF:${df} | ACC:${acc}`;

    // 3. Draw the Label
    ctx.fillText(debugText, unit.x, barY - 10);

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
}); // <--- ADD THIS LINE HERE to close the units.forEach loop
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

function drawInfantryUnit(ctx, x, y, moving, frame, factionColor, type, isAttacking, side, unitName, isFleeing) {
    ctx.save();
    ctx.translate(x, y);

   // --- DYNAMIC ARMOR RETRIEVAL ---
    let armorVal = 2; 
    if (typeof UnitRoster !== 'undefined' && UnitRoster.allUnits[unitName]) {
        armorVal = UnitRoster.allUnits[unitName].armor;
    } else if (unitName && (unitName.includes("Elite") || type === "cataphract")) {
        armorVal = 40; // Elite/Super Heavy fallback
    } else if (unitName && unitName.includes("Heavy")) {
        armorVal = 25; // Standard Heavy fallback (matches Heavy Horse Archer)
    }

    if (unitName === "PLAYER" || unitName === "Commander") armorVal = Math.max(armorVal, 40);
	
    let legSwing = moving ? Math.sin(frame * 0.3) * 6 : 0;
    let bob = moving ? Math.abs(Math.sin(frame * 0.3)) * 2 : 0;
    let dir = side === "player" ? 1 : -1; 

    // 1. Legs
    ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-3 - legSwing, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(3 + legSwing, 9); ctx.stroke();

    ctx.translate(0, -bob); 
    
    // 2. Body: Base Faction Tunic (Mobs always wear faction color underneath)
    ctx.fillStyle = factionColor; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(3, -10); ctx.lineTo(-3, -10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    
    // 3. ARMOR LAYERING
    if (armorVal >= 25) {
        // --- HEAVY TIER (25+): Steel Lamellar & SQUARE Pauldrons ---
        ctx.fillStyle = "#9e9e9e"; // Steel/Iron color
        ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(4, -1); ctx.lineTo(3, -9); ctx.lineTo(-3, -9);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        
        // Steel Lamellar Texture (Lines)
        ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 0.5;
        for(let i = -8; i < -1; i+=2.5) {
            ctx.beginPath(); ctx.moveTo(-3, i); ctx.lineTo(3, i); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-1.5, i); ctx.lineTo(-1.5, i+2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(1.5, i); ctx.lineTo(1.5, i+2); ctx.stroke();
        }

        // SQUARE Asian-style Pauldrons
        ctx.fillStyle = factionColor; 
        ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
        // Left pauldron
        ctx.fillRect(-6.5, -9.5, 3, 4.5); ctx.strokeRect(-6.5, -9.5, 3, 4.5);
        // Right pauldron
        ctx.fillRect(3.5, -9.5, 3, 4.5); ctx.strokeRect(3.5, -9.5, 3, 4.5);
        
        // Lamellar lines on the square pauldrons
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath(); ctx.moveTo(-6.5, -7.5); ctx.lineTo(-3.5, -7.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3.5, -7.5); ctx.lineTo(6.5, -7.5); ctx.stroke();

} else if (armorVal >= 8) {
        // --- MEDIUM TIER (8-24): Smooth Leather + FACTION PAULDRONS ---
        ctx.fillStyle = "#5d4037"; // Dark smooth leather/cloth vest
        ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(4, -1); ctx.lineTo(2.5, -9); ctx.lineTo(-2.5, -9);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // ADDED: Square Pauldrons for Medium Tier (Faction Color, No Lines)
        ctx.fillStyle = factionColor; 
        ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
        // Left pauldron
        ctx.fillRect(-6, -9, 2.5, 4); ctx.strokeRect(-6, -9, 2.5, 4);
        // Right pauldron
        ctx.fillRect(3.5, -9, 2.5, 4); ctx.strokeRect(3.5, -9, 2.5, 4);
    }
    // Low tier (<8) is left as the standard cloth tunic.

    // 4. Head Base
    ctx.fillStyle = "#d4b886"; 
    ctx.beginPath(); ctx.arc(0, -12, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    // 5. DYNAMIC HEADGEAR BY ARMOR TIER AND FACTION
    if (armorVal >= 25) {
        // --- HIGH TIER -> HEAVY HELMETS ---
        if (factionColor === "#c2185b") { 
            // Yamato (Crimson) -> Samurai Kabuto Helmet with Horns
            ctx.fillStyle = "#212121";
            ctx.beginPath(); ctx.arc(0, -13, 4, Math.PI, 0); ctx.fill(); 
            ctx.fillRect(-5, -13, 10, 2); 
            ctx.strokeStyle = "#fbc02d"; ctx.lineWidth = 1.5; 
            ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-4, -19); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(4, -19); ctx.stroke();
        } else if (factionColor === "#1976d2" || factionColor === "#455a64") { 
            // Mongol / Jinlord -> Heavy Spiked Steel Helmet with flaps
            ctx.fillStyle = "#9e9e9e"; ctx.strokeStyle = "#424242"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, -14, 4.5, Math.PI, 0); ctx.fill(); ctx.stroke(); 
            ctx.fillStyle = "#616161";
            ctx.beginPath(); ctx.moveTo(-1.5, -18.5); ctx.lineTo(1.5, -18.5); ctx.lineTo(0, -23); ctx.fill(); 
            ctx.fillStyle = "#4e342e"; 
            ctx.fillRect(-5, -14, 3, 5); ctx.fillRect(2, -14, 3, 5);
        } else if (factionColor === "#00838f") {
            // Iransar (Teal) -> Heavy Steel Conical Helm with Wrap
            ctx.fillStyle = "#eeeeee";
            ctx.beginPath(); ctx.arc(0, -14, 4, Math.PI, 0); ctx.fill();
            ctx.fillStyle = "#9e9e9e"; // Steel tip
            ctx.beginPath(); ctx.arc(0, -15, 3.5, Math.PI, 0); ctx.fill(); ctx.stroke();
        } else {
            // Default (Chinese/Korean) -> Steel Dome with Lamellar Neck Guard
            ctx.fillStyle = "#9e9e9e";
            ctx.beginPath(); ctx.arc(0, -14, 4, Math.PI, 0); ctx.fill(); ctx.stroke();
            ctx.fillStyle = factionColor; // Neck guard matching faction
            ctx.fillRect(-4.5, -14, 9, 3);
        }
    } else if (armorVal >= 8) {
        // --- MEDIUM TIER -> FACTION SPECIFIC LIGHT HATS ---
        if (factionColor === "#c2185b") { 
            // Yamato -> Ashigaru Jingasa (Flat Conical Hat)
            ctx.fillStyle = "#212121"; ctx.strokeStyle = "#fbc02d"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(0, -15); ctx.lineTo(6, -12);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (factionColor === "#1976d2" || factionColor === "#455a64") { 
            // Mongol -> Fur-trimmed Leather Cap
            ctx.fillStyle = "#4e342e"; ctx.beginPath(); ctx.arc(0, -13, 3.5, Math.PI, 0); ctx.fill();
            ctx.fillStyle = "#795548"; ctx.fillRect(-4, -13, 8, 2); 
        } else if (factionColor === "#00838f") {
            // Iransar -> Simple Cloth Turban
            ctx.fillStyle = "#eeeeee";
            ctx.beginPath(); ctx.arc(0, -13.5, 3.5, 0, Math.PI * 2); ctx.fill();
        } else {
            // Default/Chinese/Viet -> Bamboo Rice Hat
            ctx.fillStyle = "#8d6e63"; 
            ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(0, -16); ctx.lineTo(6, -12);
            ctx.quadraticCurveTo(0, -13.5, -6, -12); ctx.fill(); ctx.stroke();
        }
    } else {
        // --- LOW TIER -> Bare Head / Topknot ---
        ctx.fillStyle = "#212121"; // Dark hair
        ctx.beginPath(); ctx.arc(0, -14.5, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    
    // 6. WEAPONS LOGIC (Preserved perfectly)
    let weaponBob = isAttacking ? Math.sin(frame * 0.8) * 4 : 0;
    
    if (isFleeing) {
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(2 * dir, -4); ctx.lineTo(4 * dir, -22 + weaponBob); ctx.stroke(); 
        ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#cccccc"; ctx.lineWidth = 0.5;
        let flap = moving ? Math.sin(frame * 1.5) * 3 : 0; 
        ctx.beginPath();
        ctx.moveTo(4 * dir, -21 + weaponBob); 
        ctx.quadraticCurveTo((-4 * dir), -22 + weaponBob + flap, (-10 * dir), -18 + weaponBob); 
        ctx.quadraticCurveTo((-6 * dir), -14 + weaponBob - flap, 3 * dir, -12 + weaponBob); 
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    else if (type === "peasant") {
        let tipX = (12 + weaponBob) * dir; let tipY = -12 + weaponBob;
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-2 * dir, -4); ctx.lineTo(tipX, tipY); ctx.stroke();

        if (unitName === "Militia") {
            ctx.fillStyle = "#9e9e9e"; ctx.strokeStyle = "#444444"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(tipX + (1.5 * dir), tipY + 1); 
            ctx.lineTo(tipX + (2.5 * dir), tipY + 6); ctx.lineTo(tipX - (0.5 * dir), tipY + 6.5); 
            ctx.lineTo(tipX - (1 * dir), tipY + 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(tipX, tipY, 1, 0, Math.PI * 2); ctx.fill();
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
            ctx.save();
            ctx.translate((28 + weaponBob) * dir, -24 + weaponBob);
            ctx.rotate(Math.PI * -0.25 * dir); 
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, 2); ctx.lineTo(8, 0); 
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }
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
        ctx.fillStyle = "#5d4037"; ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc((6 + weaponBob/2) * dir, -4, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); 
        ctx.fillStyle = "#424242"; 
        ctx.beginPath(); ctx.arc((6 + weaponBob/2) * dir, -4, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    else if (type === "two_handed") {
        ctx.strokeStyle = "#757575"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-2 * dir, -4); 
        ctx.quadraticCurveTo((10 + weaponBob) * dir, -10 + weaponBob, (18 + weaponBob) * dir, -22 + weaponBob); ctx.stroke();
        ctx.strokeStyle = "#212121"; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(2 * dir, -7); ctx.stroke();
    }
    else if (type === "archer") {
        ctx.fillStyle = "#3e2723"; ctx.fillRect(-4, -8, 3, 7); 
        ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(5, -16); ctx.quadraticCurveTo(14, -10, 10, -8); 
        ctx.quadraticCurveTo(14, -6, 5, 0); ctx.stroke(); 
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(5, -16); ctx.lineTo(5, 0); ctx.stroke(); 
        ctx.strokeStyle = "#d4b886"; ctx.lineWidth = 1;
    }
    else if (type === "throwing") {
        if (unitName === "Slinger") {
            let handX = 4 * dir; let handY = -6;
            let swing = isAttacking ? frame * 0.6 : 0.5; 
            ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(handX, handY);
            ctx.lineTo(handX + (Math.cos(swing) * 10 * dir), handY + (Math.sin(swing) * 8)); ctx.stroke();
            ctx.fillStyle = "#9e9e9e"; ctx.beginPath(); 
            ctx.arc(handX + (Math.cos(swing) * 10 * dir), handY + (Math.sin(swing) * 8), 1.5, 0, Math.PI*2); ctx.fill();
        } else { 
            let thrust = isAttacking ? Math.sin(frame * 0.5) * 10 * dir : -6 * dir;
            ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo((-10 * dir) + thrust, -12); ctx.lineTo((10 * dir) + thrust, -16); ctx.stroke(); 
        }
    }
    else if (type === "crossbow") { 
        if (unitName === "Repeater Crossbowman") {
            ctx.save(); ctx.scale(dir, 1); 
            let isFiringBurst = isAttacking;
            let shakeX = isFiringBurst ? Math.sin(Date.now() / 30) * 1.5 : 0;
            let shakeY = isFiringBurst ? Math.cos(Date.now() / 30) * 1.2 : 0;
            ctx.translate(shakeX, shakeY);
            ctx.fillStyle = "#3e2723"; ctx.fillRect(-3, -12 + bob, 6, 6); 
            ctx.fillStyle = "#4e342e"; ctx.fillRect(3, -11 + bob, 18, 3); 
            ctx.save(); ctx.translate(5, -17 + bob); 
            ctx.fillStyle = "#5d4037"; ctx.fillRect(0, 0, 14, 6); 
            ctx.strokeStyle = "#2b1b17"; ctx.lineWidth = 0.8; ctx.strokeRect(0, 0, 14, 6);
            ctx.fillStyle = "#9e9e9e"; ctx.fillRect(11, 1, 2, 1); ctx.fillRect(11, 3, 2, 1);
            ctx.restore();
            ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(9, -10 + bob); ctx.lineTo(4, -16 + bob); ctx.stroke();
            ctx.fillStyle = "#212121"; ctx.beginPath(); ctx.arc(9, -10 + bob, 1, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#212121"; ctx.fillRect(21, -11 + bob, 2, 3); 
            ctx.restore();
        } else if (unitName === "Poison Crossbowman") {
            ctx.fillStyle = "#5d4037"; ctx.fillRect(0, -10, 12, 3); 
            ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(10, -8.5, 6.5, -Math.PI/2, Math.PI/2); ctx.stroke();
            ctx.strokeStyle = "rgba(200, 255, 200, 0.4)"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(10, -15); ctx.lineTo(10, -2); ctx.stroke();
        } else {
            ctx.fillStyle = "#5d4037"; ctx.fillRect(0, -10, 12, 3); 
            ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(10, -15); ctx.quadraticCurveTo(18, -11, 14, -8.5); ctx.quadraticCurveTo(18, -6, 10, -2); ctx.stroke();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(10, -15); ctx.lineTo(10, -2); ctx.stroke();
        }
    }
    else if (unitName && unitName.includes("Firelance")) {
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(21 + weaponBob, -8); ctx.stroke();
        ctx.fillStyle = "#212121"; ctx.fillRect(14 + weaponBob, -10, 7, 4);
        ctx.fillStyle = "#9e9e9e"; 
        ctx.beginPath(); ctx.moveTo(21 + weaponBob, -8); ctx.lineTo(24 + weaponBob, -10); 
        ctx.lineTo(29 + weaponBob, -8); ctx.lineTo(24 + weaponBob, -6); ctx.closePath(); ctx.fill();
        if (isAttacking) {
            ctx.fillStyle = "#ff5722"; ctx.beginPath(); ctx.arc(22 + weaponBob, -8, 1.5 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(100, 100, 100, 0.4)";
            ctx.beginPath(); ctx.arc(24 + weaponBob, -10, 4 + Math.random()*3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(28 + weaponBob, -12, 2 + Math.random()*2, 0, Math.PI * 2); ctx.fill();
        }
    } 
    else if (type === "gun") {
        ctx.strokeStyle = "#424242"; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(14 + weaponBob, -8); ctx.stroke();
        if (isAttacking) { 
            ctx.fillStyle = "#ff5722"; ctx.beginPath(); ctx.arc(16 + weaponBob, -9, 1 + Math.random()*1, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(140, 140, 140, 0.5)"; 
            ctx.beginPath(); ctx.arc(20 + weaponBob, -11, 5 + Math.random()*4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(26 + weaponBob, -13, 7 + Math.random()*5, 0, Math.PI * 2); ctx.fill();
        }
    }
    else if (unitName === "Bomb") {
        ctx.save();
        if (isAttacking) { ctx.rotate(Math.PI / 4); } else { ctx.rotate(-Math.PI / 10); }
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
        ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -22); ctx.quadraticCurveTo(4, -18, 3, -14); ctx.stroke();
        ctx.fillStyle = "#424242"; ctx.beginPath(); ctx.arc(3, -14, 2.5, 0, Math.PI * 2); ctx.fill();
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
            ctx.fillStyle = "rgba(180, 180, 180, 0.6)";
            for(let j=0; j<3; j++) {
                ctx.beginPath(); ctx.arc(-14 * dir - (j*5), 2 + (Math.random()*4-2), 3+j, 0, Math.PI*2); ctx.fill();
            }
        }
        ctx.strokeStyle = "#ff9800"; ctx.lineWidth = 1; 
        ctx.beginPath(); ctx.moveTo(-10 * dir, 0); ctx.lineTo(-14 * dir, 4); ctx.stroke();
        ctx.restore();
    }
    else if (type === "shortsword" || (typeof unit !== 'undefined' && unit.stats && unit.stats.isRanged && unit.stats.ammo <= 0)) {
        if (type === "shortsword" || (typeof unit !== 'undefined' && unit.stats.isRanged)) {
            ctx.strokeStyle = "#9e9e9e"; ctx.lineWidth = 2.5; 
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo((12 + weaponBob) * dir, -10 + (weaponBob / 2)); ctx.stroke(); 
            ctx.strokeStyle = "#212121"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(1 * dir, -5); ctx.lineTo(3 * dir, -8); ctx.stroke();
        }
    }
    ctx.restore();
}
 