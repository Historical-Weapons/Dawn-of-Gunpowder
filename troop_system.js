

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
    let oldLevel = Math.floor(this.experienceLevel);
    this.experienceLevel += amount;
    let newLevel = Math.floor(this.experienceLevel);

    if (newLevel > oldLevel) {
        // Only boost stats when the "Whole Number" increases
        this.meleeAttack += 5; 
        this.accuracy += 2;
        console.log(this.name + " LEVELED UP!");
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

// --- The Global Faction Roster ---
// --- The Global Faction Roster ---
const UnitRoster = {
    allUnits: {},
    
    // ✅ Accept 'faction' as an argument, defaulting to "Generic" if left blank
    create: function(id, name, role, isLarge, stats, faction = "Generic") {
        let t = new Troop(name, role, isLarge, faction);
        Object.assign(t, stats);
        t.currentStance = t.isRanged ? "statusrange" : "statusmelee";
        
        // Auto-Balancing Logic
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
        // Basic Infantry
        // Basic Infantry
        this.create("Militia", "Militia", "peasant", false, { health: 10, meleeAttack: 6, meleeDefense: 6, armor: 1, speed: 0.9, range: 15, morale: 35, magazine: 1, cost: 5 });
        this.create("Shielded Infantry", "Shielded Infantry", ROLES.SHIELD, false, { health: 40, meleeAttack: 12, meleeDefense: 18, armor: 15, shieldBlockChance: 20, speed: 0.8, range: 20, morale: 60, magazine: 1, cost: 30 });
        this.create("Heavy Shielded Spear", "Heavy Shielded Spear", ROLES.PIKE, false, { health: 45, meleeAttack: 15, meleeDefense: 22, armor: 15, bonusVsLarge: 25, speed: 0.7, range: 25, morale: 70, magazine: 1, cost: 50 });
        this.create("Spearman", "Spearman", ROLES.PIKE, false, { health: 15, meleeAttack: 13, meleeDefense: 16, armor: 5, bonusVsLarge: 20, speed: 0.75, range: 30, morale: 65, magazine: 1, cost: 10 });
        this.create("Glaiveman", "Glaiveman", ROLES.INFANTRY, false, { health: 35, meleeAttack: 18, meleeDefense: 14, armor: 5, speed: 0.75, range: 20, morale: 65, magazine: 1, cost: 45 });
        this.create("Heavy Shielded Mace", "Heavy Shielded Mace", ROLES.SHIELD, false, { health: 35, meleeAttack: 20, meleeDefense: 22, armor: 20, shieldBlockChance: 25, speed: 0.35, range: 20, morale: 75, magazine: 1, cost: 60 });

        // Two-Handed Infantry
        this.create("Heavy Two Handed", "Heavy Two Handed", ROLES.TWO_HANDED, false, { health: 30, meleeAttack: 24, meleeDefense: 12, armor: 12, speed: 0.65, range: 20, morale: 70, magazine: 1, cost: 55 });
        this.create("Light Two Handed", "Light Two Handed", ROLES.TWO_HANDED, false, { health: 25, meleeAttack: 18, meleeDefense: 10, armor: 5, speed: 0.85, range: 20, morale: 60, magazine: 1, cost: 35 });

        // Archers
        this.create("Archer", "Archer", ROLES.ARCHER, false, { isRanged: true, ammo: 25, health: 40, missileBaseDamage: 9, missileAPDamage: 2, accuracy: 55, armor: 5, speed: 0.8, range: 700, morale: 50, magazine: 1, cost: 25 });
        this.create("Horse Archer", "Horse Archer", ROLES.HORSE_ARCHER, true, { isRanged: true, ammo: 25, health: 55, missileBaseDamage: 8, missileAPDamage: 2, accuracy: 60, armor: 12, speed: 1.6, range: 700, morale: 65, magazine: 1, cost: 50 });
        this.create("Heavy Horse Archer", "Heavy Horse Archer", ROLES.HORSE_ARCHER, true, { isRanged: true, ammo: 22, health: 70, missileBaseDamage: 9, missileAPDamage: 4, accuracy: 65, armor: 15, speed: 1.4, range: 700, morale: 75, magazine: 1, cost: 70 });
        this.create("Light Horse Archer", "Light Horse Archer", ROLES.HORSE_ARCHER, true, { isRanged: true, ammo: 26, health: 50, missileBaseDamage: 7, missileAPDamage: 2, accuracy: 58, armor: 10, speed: 1.7, range: 700, morale: 60, magazine: 1, cost: 45 });

        // Crossbow Units
        this.create("Crossbowman", "Crossbowman", ROLES.CROSSBOW, false, { isRanged: true, ammo: 18, health: 45, missileBaseDamage: 12, missileAPDamage: 28, accuracy: 65, armor: 18, speed: 0.7, range: 800, morale: 55, magazine: 1, cost: 35 });
        this.create("Heavy Crossbowman", "Heavy Crossbowman", ROLES.CROSSBOW, false, { isRanged: true, ammo: 16, health: 55, missileBaseDamage: 15, missileAPDamage: 30, accuracy: 70, armor: 25, speed: 0.65, range: 800, morale: 65, magazine: 1, cost: 50 });
        this.create("Repeater Crossbowman", "Repeater Crossbowman", ROLES.CROSSBOW, false, { isRanged: true, ammo: 40, health: 40, missileBaseDamage: 15, missileAPDamage: 2, accuracy: 45, armor: 12, speed: 0.75, range: 400, morale: 50, magazine: 10, cost: 40 });
        this.create("Poison Crossbowman", "Poison Crossbowman", ROLES.CROSSBOW, false, { isRanged: true, ammo: 20, health: 40, missileBaseDamage: 100, missileAPDamage: 4, accuracy: 60, armor: 10, speed: 0.75, range: 400, morale: 55, magazine: 1, cost: 45 });

        // Skirmishers
        this.create("Javelinier", "Javelinier", ROLES.THROWING, false, { isRanged: true, ammo: 4, health: 50, missileBaseDamage: 18, missileAPDamage: 6, accuracy: 55, armor: 15, speed: 0.9, range: 1000, morale: 50, magazine: 1, cost: 35 });
        this.create("Slinger", "Slinger", ROLES.THROWING, false, { isRanged: true, ammo: 30, health: 35, missileBaseDamage: 6, missileAPDamage: 1, accuracy: 50, armor: 5, speed: 0.85, range: 320, morale: 40, magazine: 1, cost: 20 });

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
// Add this as a safety alias 
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


// ============================================================================
// BATTLE RESOLUTION & SUMMARY UI
// ============================================================================
 
function getReloadTime(unit) {

    const role = unit.stats.role;
    const name = unit.unitType;

    // Special
    if (name === "Rocket") return 400;
    if (name === "Repeater Crossbowman") return 300;

    // Archers
    if (role === ROLES.ARCHER || role === ROLES.HORSE_ARCHER)
        return 100;

    // Crossbows
    if (role === ROLES.CROSSBOW)
        return 200;

    // Gunpowder
    if (role === ROLES.GUNNER)
        return 300;

    // Firelance
    if (name === "Firelance")
        return 300;

    return 60; // melee attack speed
}


// ============================================================================
// ADVANCED UNIT RENDERING (WEAPONS & MOUNTS)
// ============================================================================

// Override the generic draw function to use our new specialized renderers
function drawBattleUnits(ctx) {
    let units = battleEnvironment.units;
    let time = Date.now() / 50;

let lastSortTime = 0;
const SORT_INTERVAL = 100; // ms

if (performance.now() - lastSortTime > SORT_INTERVAL) {
    units.sort((a, b) => a.y - b.y);
    lastSortTime = performance.now();
}

units.forEach(unit => {
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
        } else if (unit.unitType === "Militia") {
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

// 1. Dispatch to the correct renderer (No logic changes here)
if (["cavalry", "elephant", "camel", "horse_archer"].includes(visType)) {
    drawCavalryUnit(ctx, unit.x, unit.y, isMoving, frame, unit.color, isAttacking, visType, unit.side, unit.unitType);
} else {
    drawInfantryUnit(ctx, unit.x, unit.y, isMoving, frame, unit.color, visType, isAttacking, unit.side, unit.unitType);
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
    
   // Head 
    ctx.fillStyle = "#d4b886"; 
    ctx.beginPath(); ctx.arc(0, -12, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    //   DYNAMIC HAT LOGIC BASED ON FACTION COLOR
    if (factionColor === "#c2185b") { 
        // Yamato Clans (Crimson) -> Samurai Kabuto Helmet
        ctx.fillStyle = "#212121";
        ctx.beginPath(); ctx.arc(0, -13, 4, Math.PI, 0); ctx.fill(); // Dome
        ctx.fillRect(-5, -13, 10, 2); // Brim
        ctx.strokeStyle = "#fbc02d"; ctx.lineWidth = 1.5; // Gold Horns
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-4, -19); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(4, -19); ctx.stroke();
        
    } else if (factionColor === "#1976d2" || factionColor === "#455a64") { 
        // Great Khaganate / Jinlord -> Mongol Helmet (Ported from your menu)
        ctx.fillStyle = "#9e9e9e"; ctx.strokeStyle = "#424242"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, -14, 4.5, Math.PI, 0); ctx.fill(); ctx.stroke(); 
        ctx.fillStyle = "#616161";
        ctx.beginPath(); ctx.moveTo(-1.5, -18.5); ctx.lineTo(1.5, -18.5); ctx.lineTo(0, -23); ctx.fill(); // Spike
        ctx.fillStyle = "#4e342e"; // Fur/Leather Flaps
        ctx.fillRect(-5, -14, 3, 5);
        ctx.fillRect(2, -14, 3, 5);
        
    } else if (factionColor === "#00838f") {
        // Iransar (Teal) -> Turban/Conical Steel
        ctx.fillStyle = "#eeeeee";
        ctx.beginPath(); ctx.arc(0, -14, 4, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#00838f";
        ctx.beginPath(); ctx.arc(0, -15, 3.5, Math.PI, 0); ctx.fill();
        
    } else {
        // Default -> Rice Hat (Hong Dynasty, Vietan, generic)
        ctx.fillStyle = (type === "peasant" || type === "throwing") ? "#8d6e63" : "#607d8b"; 
        ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(0, -17); ctx.lineTo(6, -12);
        ctx.quadraticCurveTo(0, -14, -6, -12); ctx.fill(); ctx.stroke();
    }
    // === WEAPON RENDERING ===
    let weaponBob = isAttacking ? Math.sin(frame * 0.8) * 4 * dir : 0;
    
if (type === "peasant") {
    let tipX = (12 + weaponBob) * dir;
    let tipY = -12 + weaponBob;

    // Draw the wooden shaft
    ctx.strokeStyle = "#5d4037"; 
    ctx.lineWidth = 1.5;
    ctx.beginPath(); 
    ctx.moveTo(-2 * dir, -4); 
    ctx.lineTo(tipX, tipY); 
    ctx.stroke();

    // Check for specific Militia weapon head (INSIDE the peasant block)
if (unitName === "Militia") {
    ctx.fillStyle = "#9e9e9e";   // Iron color
    ctx.strokeStyle = "#444444"; // Dark outline
    ctx.lineWidth = 1;

    ctx.beginPath();
    // 1. The Neck (Connecting handle to blade)
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + (1.5 * dir), tipY + 1); 

    // 2. The Blade (Half the height and width)
    ctx.lineTo(tipX + (2.5 * dir), tipY + 6);   // Bottom front corner
    ctx.lineTo(tipX - (0.5 * dir), tipY + 6.5); // Bottom back corner
    ctx.lineTo(tipX - (1 * dir), tipY + 1.5);   // Top back corner
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Small dot to show the handle tip
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(tipX, tipY, 1, 0, Math.PI * 2);
    ctx.fill();
}
} // This closes the 'if (type === "peasant")' block
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
    
	// SURGERY: If frame is missing or 0, use a global time to keep animation alive
    let animFrame = frame || (Date.now() / 100);
	
    let dir = side === "player" ? 1 : -1;
    ctx.scale(dir, 1);
    // SURGERY: Ensure legs move if there is velocity, even if 'moving' boolean is glitchy
    let isMoving = moving || (typeof vx !== 'undefined' && (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1));
	
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

// 3. RIDER (Surgical Replacement: Faction-Specific Armor & Headwear)
    if (!isElephant) {
        ctx.save();
        ctx.translate(-1, (isCamel ? -7 : -4) + bob + riderBob);
        
        // --- Body & Heavy Lamellar Armor ---
        ctx.fillStyle = factionColor; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(2, -9); ctx.lineTo(-2, -9);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        
        // Detect heavy status for armor lines
        let isHeavy = unitName && (unitName.includes("Heavy") || type === "cataphract");
        if (isHeavy) {
            ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 0.5;
            for(let i = -7; i < -1; i+=2.5) {
                ctx.beginPath(); ctx.moveTo(-3, i); ctx.lineTo(3, i); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-1.5, i); ctx.lineTo(-1.5, i+2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(1.5, i); ctx.lineTo(1.5, i+2); ctx.stroke();
            }
        }
        
        // --- Head ---
        ctx.fillStyle = "#d4b886";
        ctx.beginPath(); ctx.arc(0, -11, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // --- DYNAMIC RIDER HAT LOGIC ---
        if (factionColor === "#c2185b") { 
            // Yamato (Samurai Kabuto)
            ctx.fillStyle = "#212121";
            ctx.beginPath(); ctx.arc(0, -12, 3.5, Math.PI, 0); ctx.fill();
            ctx.fillRect(-4, -12, 8, 1.5);
            ctx.strokeStyle = "#fbc02d"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-3, -17); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(3, -17); ctx.stroke();
            
        } else if (factionColor === "#1976d2" || factionColor === "#455a64") { 
            // Mongol/Jinlord Helmet
            ctx.fillStyle = "#9e9e9e"; ctx.strokeStyle = "#424242"; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.arc(0, -13, 4, Math.PI, 0); ctx.fill(); ctx.stroke(); 
            ctx.fillStyle = "#616161";
            ctx.beginPath(); ctx.moveTo(-1, -16); ctx.lineTo(1, -16); ctx.lineTo(0, -20); ctx.fill();
            ctx.fillStyle = "#4e342e"; // Flaps
            ctx.fillRect(-4, -13, 2.5, 4); ctx.fillRect(1.5, -13, 2.5, 4);
            
        } else if (factionColor === "#00838f") {
            // Iransar Turban
            ctx.fillStyle = "#eeeeee";
            ctx.beginPath(); ctx.arc(0, -13, 3.5, Math.PI, 0); ctx.fill();
            ctx.fillStyle = "#00838f";
            ctx.beginPath(); ctx.arc(0, -14, 3, Math.PI, 0); ctx.fill();
            
        } else {
            // Default Rice Hat
            ctx.fillStyle = (type === "horse_archer") ? "#8d6e63" : "#607d8b"; 
            ctx.beginPath(); ctx.moveTo(-7, -11); ctx.lineTo(0, -15); ctx.lineTo(7, -11);
            ctx.quadraticCurveTo(0, -12.5, -7, -11); ctx.fill(); ctx.stroke();
        }

        // --- WEAPON LOGIC CONTINUES BELOW ---
        let weaponBob = isAttacking ? Math.sin(frame * 0.8) * 4 : 0;
// Catches "Horse Archer", "Heavy Horse Archer", and "Light Horse Archer"
if (type === "horse_archer") {
    // 1. TIMING & STATE (Replace with your game's fire-timer if available)
    let time = Date.now() / 200; 
    let pull = (Math.sin(time) * 0.5 + 0.5); // Ranges 0 to 1 (0 = idle, 1 = full draw)
    
    // Khatra: The bow rotates forward/down slightly during the "release" 
    // This triggers when 'pull' is low (after the snap)
    let khatra = (1 - pull) * 0.4; 

    // 2. POSITIONING
    // Shifted base X further right (+4px from your original)
    let handX = 6 + weaponBob;
    let handY = -6; // The pivot point (the grip)

    ctx.save();
    
    // 3. APPLY KHATRA ROTATION
    // Pivot around the hand grip
    ctx.translate(handX, handY);
    ctx.rotate(khatra); 
    ctx.translate(-handX, -handY);

    // 4. DRAW THE BOW (The Wood)
    ctx.strokeStyle = "#3e2723"; 
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Top Limb
    ctx.moveTo(handX - 4, -14); 
    ctx.quadraticCurveTo(handX + 6, -10, handX, handY); 
    // Bottom Limb
    ctx.quadraticCurveTo(handX + 6, -2, handX - 4, 2); 
    ctx.stroke();

    // 5. DRAW THE STRING (Dynamic Pull)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; 
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(handX - 4, -14); // String top
    
    // The "Nocking Point" moves back based on the pull
    let stringX = (handX - 4) - (pull * 8); 
    ctx.lineTo(stringX, handY); // Pull point
    
    ctx.lineTo(handX - 4, 2);   // String bottom
    ctx.stroke();

    ctx.restore();
}

else if (type === "camel") {
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