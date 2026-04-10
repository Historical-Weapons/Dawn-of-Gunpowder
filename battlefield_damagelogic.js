
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

    let attackValue = attacker.meleeAttack || 10;
    let defenseValue = defender.meleeDefense || 10;

    // Add fallback to 0 to prevent NaN damage if a unit has no experience value
    attackValue += ((attacker.experienceLevel || 0) * 2);
    defenseValue += ((defender.experienceLevel || 0) * 2);

    if (states.includes("flanked")) defenseValue *= 0.5;
    if (states.includes("charging")) attackValue += 15;

    // ========================================================================
    // 1. FIRELANCE AMMO DRAIN & BURST FIX
    // ========================================================================

let safeName = attacker.unitType || (attacker.stats && attacker.stats.name) || "";
let safeRole = (attacker.stats && attacker.stats.role) || attacker.role || "";
let isFirelance = safeName.includes("Firelance") || (attacker.name && attacker.name.includes("Firelance"));

if (isFirelance && attacker.ammo > 0) {
    if (attacker.lastAmmoDrainTick !== Date.now()) {
        attacker.ammo -= 1;
        attacker.lastAmmoDrainTick = Date.now();
    }
    attackValue += 40; 
}
    if (isActuallyRangedAttacking) {
        // Ranged Damage Calculation
        if (states.includes("shielded_front") && Math.random() * 100 < defender.shieldBlockChance) return 0;

        let effectiveArmor = Math.max(0, defender.armor - (attacker.missileAPDamage || 0));
        let baseDamageDealt = Math.max(0, (attacker.missileBaseDamage || 0) - (effectiveArmor * 0.5));
        totalDamage = baseDamageDealt + (attacker.missileAPDamage || 0);

        // ========================================================================
        // 2. EXPONENTIAL AREA OF EFFECT (AoE) FOR BOMBS & TREBUCHETS
        // ========================================================================

// This covers both the new 'safe' lookups and your old direct property checks
let isBomb = (safeName === "Bomb" || safeRole === "bomb") || (attacker.name === "Bomb" || attacker.role === "bomb");

let isTrebuchet = safeName.includes("Trebuchet") || (attacker.name && attacker.name.includes("Trebuchet"));


        if (isBomb || isTrebuchet) {
            // Massive direct hit damage
            totalDamage *= 3.5; 

            // Set the blast scale
            let blastRadius = isTrebuchet ? 150 : 80; 
            let maxAoEDamage = isTrebuchet ? 200 : 100;

            // Apply exponential AoE to all surrounding units
            if (typeof battleEnvironment !== 'undefined' && battleEnvironment.units) {
                battleEnvironment.units.forEach(u => {
                    // Skip dead units or the direct target (who already takes totalDamage)
                    if (u.hp <= 0 || u === defender) return; 

                    let dx = u.x - defender.x;
                    let dy = u.y - defender.y;
                    let dist = Math.hypot(dx, dy);

                    if (dist <= blastRadius) {
                        // Exponential drop-off formula: y = e^(-k * dist)
                        // k = 4 ensures damage drops off steeply toward the edge of the blast
                        let dropoff = Math.pow(Math.E, -4 * (dist / blastRadius));
                        
                        let splashDamage = Math.floor(maxAoEDamage * dropoff);
                        
                        if (splashDamage > 0) {
                            u.hp -= splashDamage;
                        }
                    }
                });
            }
        }

        // Rocket bonus vs Large
        if (defender.isLarge && attacker.name && attacker.name.toLowerCase().includes("rocket")) {
            totalDamage += 30;
        }

    } else {
        // Melee Damage Calculation
        let hitChance = Math.max(10, Math.min(90, 40 + (attackValue - defenseValue)));

        if (Math.random() * 100 < hitChance) {
            let weaponDamage = attackValue + (defender.isLarge ? (attacker.bonusVsLarge || 0) : 0);
            totalDamage = Math.max(15, weaponDamage - (defender.armor * 0.3)); 
        }
    }

    if (attacker.stamina < 30) totalDamage *= 0.7;

    return Math.floor(totalDamage);
}

function updateBattleUnits() {
    if (typeof processSiegeEngines === 'function') processSiegeEngines();
    if (typeof processTacticalOrders === 'function') processTacticalOrders();

    // --- NEW SURGERY: Real-time Collision Grid Synchronization ---
    if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle && battleEnvironment.grid) {
        
        // 1. Sync the Gate Collision (Flips 6 to 1 when destroyed)
        if (typeof updateCityGates === 'function') {
            updateCityGates(battleEnvironment.grid);
        }
        
// 2. Sync Deployed Ladders (Carves through overlapping drawbridge barriers)
        if (typeof siegeEquipment !== 'undefined' && siegeEquipment.ladders) {
            siegeEquipment.ladders.forEach(l => {
                if (l.isDeployed && l.hp > 0) {
                    let bTile = typeof BATTLE_TILE_SIZE !== 'undefined' ? BATTLE_TILE_SIZE : 8;
                    let tx = Math.floor(l.x / bTile);
                    let ty = Math.floor(l.y / bTile);
                    
                    // SURGERY: Expand Y-loop to 'ty - 16' to carve completely through the thick parapet.
                    for (let x = tx - 2; x <= tx + 2; x++) {
                        for (let y = ty - 16; y <= ty + 2; y++) {
                            if (battleEnvironment.grid[x] && battleEnvironment.grid[x][y] !== undefined) {
                                let cTile = battleEnvironment.grid[x][y];
                                
                                // FORCE OVERWRITE solid wall parapets (6), ground (0), towers (7), or wooden platforms (8)
                                if (cTile === 6 || cTile === 0 || cTile === 7 || cTile === 8) {
                                    // If deep into the wall, assign walkable wall (10) to pop them up onto the ramparts.
                                    battleEnvironment.grid[x][y] = (y < ty - 1) ? 10 : 9;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // --- END SURGERY ---
	
    const now = Date.now();

    // 1. Clean Dead Units (Surgery intact: keep bodies for 10s, Commander never decays)
    battleEnvironment.units = AICategories.cleanupDeadUnits(battleEnvironment.units, now);
    let units = battleEnvironment.units;

    // 2. Initialize Global Trackers
    AICategories.initBattleTrackers(currentBattleData);

    const pCount = units.filter(u => u.side === 'player').length;
    const eCount = units.filter(u => u.side === 'enemy').length;

updateCasualtyMoralePressure(units, currentBattleData);

    // 3. Process Each Unit
    units.forEach(unit => {
        // Death Hook
        if (unit.hp <= 0) {
            handleUnitDeath(unit);
            return; 
        }

// Player Override (Stops AI, updates Animation State)
        if (unit.disableAICombat && unit.isCommander) {
            // FIX: Decrement the commander's cooldown before the early return so they can shoot again!
            if (unit.cooldown > 0) unit.cooldown--;
            
            AICategories.handlePlayerOverride(unit, units, typeof keys !== 'undefined' ? keys : {}, battleEnvironment, player);
            return; 
        }

        // Morale & Cowardice (AI Only)
        if (!unit.isCommander) {
			
			
            const isFleeingOrWavering = AICategories.processMoraleAndFleeing(unit, pCount, eCount, currentBattleData);
            if (isFleeingOrWavering) return; // Skip normal targeting/combat if they are running away
        }
		
		// --- NEW: A. THE STUCK EXTRACTOR ---
		if (typeof applyStuckExtractor === 'function') {
			applyStuckExtractor(unit);
		}

        // --- NEW: B. MOUNT LADDER DROP CHECK ---
        if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle) {
            let typeStr = String(unit.type || unit.role || "").toLowerCase();
            let isMount = typeStr.match(/(horse|camel|eleph|cav)/) || unit.isLarge;
            
            if (isMount && (unit.carryingLadder || unit.ladderRef)) {
                if (unit.ladderRef) { 
                    unit.ladderRef.isCarried = false; 
                    unit.ladderRef.carriedBy = null; 
                }
                unit.carryingLadder = false;
                unit.ladderRef = null;
                unit.y += 200; // Move 200 pixels backwards
                unit.target = null; // Reset AI so they re-evaluate targets
            }
        }
		
		
        // Targeting & Action (Movement or Attack)
        AICategories.processTargeting(unit, units);
        AICategories.processAction(unit, battleEnvironment, currentBattleData, player);

        // Cooldowns
        if (unit.cooldown > 0) unit.cooldown--;
    });

    // 4. Collisions
    applyUnitCollisions(units);
	applyWallGravity(units);
// 5. Update Projectiles & Ground Effects Cleanup (Migrated)
    if (battleEnvironment.projectiles && battleEnvironment.projectiles.length > 0 || battleEnvironment.groundEffects) {
        AICategories.processProjectilesAndCleanup(battleEnvironment);
    }

 
    let playerCmdr = units.find(u => u.isCommander && u.side === "player");
    if (playerCmdr && playerCmdr.hp > 0) {
        // Force visual direction based on keyboard movement instead of AI targeting
        if (typeof keys !== 'undefined') {
            if (keys['a'] || keys['arrowleft']) playerCmdr.direction = -1;
            else if (keys['d'] || keys['arrowright']) playerCmdr.direction = 1;
        }
        // INTENTION = Clear any AI-assigned targets so it doesn't try to auto-chase
      //  playerCmdr.target = null;
    }

    // Explicitly ensure this is an ENEMY before feeding it to the AI
    let enemyCmdr = units.find(u => u.isCommander && u.side === "enemy");
    if (enemyCmdr && enemyCmdr.hp > 0) {
        if (typeof processEnemyCommanderAI === 'function') processEnemyCommanderAI(enemyCmdr);
    }
}
	

// --- DYNAMIC TIERED COLLISION ENGINE ---
function applyUnitCollisions(units) {
	
 

    for (let i = 0; i < units.length; i++) {
        let u1 = units[i];
        if (u1.hp <= 0 || u1.state === "FLEEING") continue; 

// SURGERY Fix: If u1 is climbing, skip entirely. They are locked to the ladder.
        if (u1.isClimbing) continue;
		
        for (let j = i + 1; j < units.length; j++) {
            let u2 = units[j];
            if (u2.hp <= 0 || u2.state === "FLEEING") continue;
            
            // SURGERY Fix: Also skip if u2 is climbing! 
            // This prevents ground units from pushing climbing units sideways.
            if (u2.isClimbing) continue;

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
                // ... (Hierarchy Rule logic remains exactly the same) ...
                else {
                    // Same Tier? Distribute the push based on exact mass.
                    let totalMass = u1.stats.mass + u2.stats.mass;
                    push1 = (u2.stats.mass / totalMass) * overlap;
                    push2 = (u1.stats.mass / totalMass) * overlap;
                }

                // Cache original X positions before displacement
                let oldX1 = u1.x;
                let oldX2 = u2.x;

                // Apply physical separation
                u1.x -= nx * push1;
                u1.y -= ny * push1;
                u2.x += nx * push2;
                u2.y += ny * push2;

// AFTER — revert ANY X displacement on a climbing unit:
if (u1.isClimbing) u1.x = oldX1;
if (u2.isClimbing) u2.x = oldX2;
            }
        }
    }
}
function applyWallGravity(units) {
    if (!inSiegeBattle || !battleEnvironment.grid) return;

    units.forEach(u => {
        if (u.hp <= 0 || u.isClimbing || u.onWall) {
            u.isFalling = false; // Reset if they regain footing
            return;
        }

        let tx = Math.floor(u.x / BATTLE_TILE_SIZE);
        let ty = Math.floor(u.y / BATTLE_TILE_SIZE);

        if (tx < 0 || tx >= BATTLE_COLS || ty < 0 || ty >= BATTLE_ROWS) return;

        let currentTile = battleEnvironment.grid[tx][ty];

        // Start falling if inside a wall or already falling
        if (currentTile === 6 || currentTile === 7 || u.isFalling) {
            u.isFalling = true;
            
            // Move down. Because we changed isBattleCollision, 
            // the physics engine won't block this movement anymore.
            u.y += 1.5; 

            // Look ahead to see if the NEXT position is soil
            let nextTy = Math.floor((u.y + 2) / BATTLE_TILE_SIZE);
            if (nextTy < BATTLE_ROWS) {
                let groundTile = battleEnvironment.grid[tx][nextTy];
                
                // If it's ground (0, 1, or any non-wall tile)
                if (groundTile !== 6 && groundTile !== 7) {
                    u.isFalling = false;
                    u.y = nextTy * BATTLE_TILE_SIZE; // Snap to soil
                    u.ignoreCollisionTicks = 20; // Stay ghosted long enough to walk away
                }
            }
        }
    });
}

function isBattleCollision(x, y, onWall = false, unit = null) {
    let tx = Math.floor(x / BATTLE_TILE_SIZE);
    let ty = Math.floor(y / BATTLE_TILE_SIZE);

    if (tx < 0 || tx >= BATTLE_COLS || ty < 0 || ty >= BATTLE_ROWS) return true;

    let tile = (battleEnvironment.grid && battleEnvironment.grid[tx]) ? battleEnvironment.grid[tx][ty] : null;

    let isLarge = false;
    if (unit) {
        let typeStr = String(unit.type || unit.unitType || unit.role || "").toLowerCase();
        isLarge = unit.stats?.isLarge || unit.isMounted || typeStr.match(/(cav|horse|camel|eleph|general|player|commander)/);
    }
    
if (inSiegeBattle) {
        // 1. MOUNT/LARGE UNIT RESTRICTIONS
        // Prevents horses from getting onto ladders (9, 12) or walking on parapets/platforms (8, 10)
        if (isLarge && (tile === 9 || tile === 12 || tile === 8 || tile === 10)) return true;

        // 2. LADDER LOCK (No horizontal sliding while climbing)
        if (unit) {
            let currentTx = Math.floor(unit.x / BATTLE_TILE_SIZE);
            let currentTy = Math.floor(unit.y / BATTLE_TILE_SIZE);
            let currentTile = (battleEnvironment.grid && battleEnvironment.grid[currentTx]) ? battleEnvironment.grid[currentTx][currentTy] : null;
            
            let isOnLadder = (currentTile === 9 || currentTile === 12 || unit.isClimbing);
            
            // If on a ladder, any X-axis change is blocked to prevent hovering off the side
            if (isOnLadder && x !== unit.x) return true;
        }

        // 3. THE "GHOST FALL" SURGERY (The fix for the stuck units)
        // If a unit is falling, we FORCE Tile 6 and 7 to be non-solid. 
        // This allows them to pass through the "Gray Wall" until they hit soil.
        if (unit && unit.isFalling) {
            if (tile === 6 || tile === 7) return false; 
        }

        // 4. UNIVERSAL PASSABLE TILES
        // Ladders, broken gate debris, and interior walkways are always passable
        if (tile === 9 || tile === 12 || tile === 13) return false;

        // 5. THE SOLID WALL LOGIC
        const isSolidWall = (tile === 6 || tile === 7);

        if (onWall) {
            // While ON the wall, the stone (6, 7) acts as the boundary (parapet)
            return isSolidWall;
        } else {
            // While ON the ground:
            
            // If they just landed or were extracted, let them walk through walls for a few frames
            if (unit && unit.ignoreCollisionTicks > 0) {
                // They can walk through everything EXCEPT the solid stone
                // Note: Keep this 'true' so they don't walk through the wall from the ground
                return isSolidWall; 
            }

            // Standard ground blocking: Water (2), Deep Mud (3), Props (4), and Solid Walls (6, 7)
            return tile === 2 || tile === 3 || tile === 4 || isSolidWall;
        }
    }
    
    // --- STANDARD FIELD BATTLES ---
    if (unit && unit.ignoreCollisionTicks > 0) {
        if (tile === 3 || tile === 6 || tile === 7) return false;
    }

    return tile === 6; 
}

// Add 'seed' as a third parameter
function drawStuckProjectileOrEffect(ctx, type, seed = 0) {
// Adding 1.1 ensures seed 0 doesn't result in sin(0)
    let rand = Math.abs(Math.sin((seed + 1.1) * 12.9898) * 43758.5453) % 1;

if (type === "javelin") {
    if (rand < 0.60) {
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(4, 0); ctx.stroke(); 
    } else if (rand < 0.80) {
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-2, 0); ctx.stroke(); 
        ctx.save(); ctx.translate(-1, 3); ctx.rotate(0.5);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = "#bdbdbd"; ctx.beginPath();
        ctx.moveTo(8, 0); ctx.lineTo(7.33, -0.83); ctx.lineTo(10.67, 0); ctx.lineTo(7.33, 0.83); ctx.fill();
        ctx.restore();
    } else {
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = "#bdbdbd"; ctx.beginPath();
  ctx.moveTo(8, 0); ctx.lineTo(7.33, -0.83); ctx.lineTo(10.67, 0); ctx.lineTo(7.33, 0.83); ctx.fill();
    }
}
	
	
	else if (type === "bolt") {
        if (rand < 0.60) {
            ctx.fillStyle = "#5d4037"; ctx.fillRect(-4, -1, 6, 2); 
            ctx.fillStyle = "#8d6e63"; ctx.fillRect(-5, -1.5, 3, 3);
        } else if (rand < 0.80) {
            ctx.fillStyle = "#5d4037"; ctx.fillRect(-4, -1, 4, 2); 
            ctx.fillStyle = "#8d6e63"; ctx.fillRect(-5, -1.5, 3, 3);
            ctx.save(); ctx.translate(1, 2); ctx.rotate(0.4);
            ctx.fillStyle = "#5d4037"; ctx.fillRect(0, -1, 4, 2);
            ctx.fillStyle = "#757575"; ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(9, 0); ctx.lineTo(4, 2); ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = "#5d4037"; ctx.fillRect(-4, -1, 8, 2);
            ctx.fillStyle = "#757575"; ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(9, 0); ctx.lineTo(4, 2); ctx.fill();
            ctx.fillStyle = "#8d6e63"; ctx.fillRect(-5, -1.5, 3, 3);
        }
    } else if (type === "stone") {
        if (rand < 0.70) {
            ctx.fillStyle = "#9e9e9e"; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#bdbdbd"; ctx.beginPath(); ctx.arc(-0.8, -0.8, 1, 0, Math.PI * 2); ctx.fill();
        } else if (rand < 0.90) {
            ctx.fillStyle = "#9e9e9e"; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#424242"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(-1.5, -1.5); ctx.lineTo(1, 1); ctx.moveTo(0, 0); ctx.lineTo(1.8, -0.5); ctx.stroke();
        } else {
            ctx.fillStyle = "#757575"; 
            ctx.beginPath(); ctx.arc(-1.5, 1, 1.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(1.5, -0.5, 1, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(0, 2, 1, 1); ctx.fillRect(-2, -2, 1.2, 1.2);
        }
} else if (type === "rocket") {
        ctx.scale(0.5, 0.5); // Scaled down for sticking
        
        if (rand < 0.45) {
            // 45% Chance: Stuck in ground (Head & Tube buried)
            // Bamboo tube and arrowhead are underground, only the long shaft is visible
            ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 0.6; 
            ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(-4, 0); ctx.stroke();
        } else if (rand < 0.80) {
            // 35% Chance: Intact / Bounced (Tube & Shaft attached)
            // The full assembly survived the impact
            ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 0.6; 
            ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(12, 0); ctx.stroke();
            ctx.fillStyle = "#4e342e"; ctx.fillRect(-6, 0.5, 14, 2.2); // Bamboo Tube
            ctx.fillStyle = "#424242"; ctx.beginPath(); // Arrowhead
            ctx.moveTo(12, -1.2); ctx.lineTo(20, 0); ctx.lineTo(12, 1.2); ctx.fill();
        } else if (rand < 0.95) {
            // 15% Chance: Headless Shaft (Tube intact, Arrowhead snapped off)
            // Common in impact; the heavy metal tip breaks off but the tube stays tied
            ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 0.6; 
            ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(12, 0); ctx.stroke();
            ctx.fillStyle = "#4e342e"; ctx.fillRect(-6, 0.5, 14, 2.2); // Tube remains
        } else {
            // 5% Chance: EXTREMELY RARE (Tube propeller break/separation)
            // The bindings failed and the bamboo tube snapped away from the shaft
            ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(12, 0); ctx.stroke(); // Bare shaft
            
            ctx.save(); // The propellant tube lying nearby
            ctx.translate(5, 4);
            ctx.rotate(0.8);
            ctx.fillStyle = "#4e342e"; ctx.fillRect(0, 0, 14, 2.2);
            ctx.fillStyle = "#424242"; ctx.beginPath(); 
            ctx.moveTo(14, -1.2); ctx.lineTo(20, 1.1); ctx.lineTo(14, 3.4); ctx.fill();
            ctx.restore();
        }
        
        ctx.scale(2, 2); // Reset scale
} else if (type === "bomb_crater") {
        if (rand < 0.25) {
            // 25% Chance: Heavy Deep Crater (Layered soot + internal debris)
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(30, 20, 10, 0.5)"; // Earthy undertone
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#212121";
            for(let i=0; i<8; i++) {
                let r = 6 + (Math.sin(i + seed) * 6);
                ctx.fillRect(Math.cos(i) * r, Math.sin(i) * r, 2.5, 2.5);
            }
        } else if (rand < 0.45) {
            // 20% Chance: Starburst Scorch (Flash burn with thin radiating lines)
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "rgba(0, 0, 0, 0.6)"; ctx.lineWidth = 0.8;
            for(let i=0; i<12; i++) {
                let angle = (i / 12) * Math.PI * 2 + seed;
                let len = 10 + (Math.cos(i * seed) * 5);
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len); ctx.stroke();
            }
        } else if (rand < 0.65) {
            // 20% Chance: Debris Field (Small central mark with wide shrapnel)
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#424242";
            for(let i=0; i<10; i++) {
                let offX = Math.sin(i * seed) * 15;
                let offY = Math.cos(i * seed) * 15;
                let size = 1 + (Math.abs(Math.sin(i)) * 2);
                ctx.fillRect(offX, offY, size, size);
            }
        } else if (rand < 0.80) {
            // 15% Chance: Skidding/Directional Blast (Elongated oval)
            ctx.save();
            ctx.rotate(seed % Math.PI); // Random orientation
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.beginPath(); ctx.ellipse(0, 0, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.beginPath(); ctx.ellipse(-4, 0, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (rand < 0.92) {
            // 12% Chance: Double Impact (Two overlapping small craters)
            for(let i=0; i<2; i++) {
                let offX = (i === 0) ? -4 : 4;
                let offY = (i === 0) ? -2 : 3;
                ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                ctx.beginPath(); ctx.arc(offX, offY, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#1a1a1a";
                ctx.fillRect(offX, offY, 2, 2);
            }
        } else {
            // 8% Chance: "Dud" or Shallow Thud (Faint grey ring)
            ctx.strokeStyle = "rgba(60, 60, 60, 0.4)";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        }
		
    } else { // arrow
        if (rand < 0.60) {
            ctx.fillStyle = "#8d6e63"; ctx.fillRect(-6, -0.5, 8, 1); 
            ctx.fillStyle = "#4caf50"; ctx.fillRect(-7, -1.5, 4, 1); ctx.fillRect(-7, 0.5, 4, 1);
        } else if (rand < 0.80) {
            ctx.fillStyle = "#8d6e63"; ctx.fillRect(-6, -0.5, 5, 1); 
            ctx.fillStyle = "#4caf50"; ctx.fillRect(-7, -1.5, 4, 1); ctx.fillRect(-7, 0.5, 4, 1);
            ctx.save(); ctx.translate(0, 2); ctx.rotate(0.6);
            ctx.fillStyle = "#8d6e63"; ctx.fillRect(0, -0.5, 6, 1);
            ctx.fillStyle = "#9e9e9e"; ctx.beginPath(); ctx.moveTo(6, -1.5); ctx.lineTo(11, 0); ctx.lineTo(6, 1.5); ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = "#8d6e63"; ctx.fillRect(-6, -0.5, 12, 1);
            ctx.fillStyle = "#9e9e9e"; ctx.beginPath(); ctx.moveTo(6, -1.5); ctx.lineTo(11, 0); ctx.lineTo(6, 1.5); ctx.fill();
            ctx.fillStyle = "#4caf50"; ctx.fillRect(-7, -1.5, 4, 1); ctx.fillRect(-7, 0.5, 4, 1);
        }
    }
}
function leaveBattlefield(playerObj) {
	
	
    console.log("Leaving battlefield. Restoring overworld state...");

 window.pendingSallyOut = false;
window.inParleMode = false;
if (typeof player !== 'undefined') player.stunTimer = 0;

    // --- 1. THE MODE SWITCH (CRITICAL FIX) ---
    inBattleMode = false; 
    if (typeof inSiegeBattle !== 'undefined') inSiegeBattle = false; // Reset Siege state

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
	// ADD THIS LINE TO CLEAR CRATERS, STUCK ARROWS, AND SCORCH MARKS
	battleEnvironment.groundEffects = []; 

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
    
// Draw the randomized ellipse with 20% randomness
const randomFactorX = 1.4 + Math.random() * 0.04;  
const randomFactorY = 1.4 + Math.random() * 0.04;  

ctx.ellipse(
    0, 0, 
    stats.radiusX * randomFactorX, 
    stats.radiusY * randomFactorY, 
    stats.rotation, 
    0, Math.PI * 2
);
    
    ctx.fill();
    ctx.restore();
}


function updateCasualtyMoralePressure(units, currentBattleData) {
    if (!Array.isArray(units) || !currentBattleData || !currentBattleData.initialCounts) return;

    const pStart = Math.max(1, currentBattleData.initialCounts.player || 0);
    const eStart = Math.max(1, currentBattleData.initialCounts.enemy || 0);

    const pAlive = units.filter(u => u && u.side === "player" && u.hp > 0 && !u.isCommander).length;
    const eAlive = units.filter(u => u && u.side === "enemy" && u.hp > 0 && !u.isCommander).length;

    const pLostPct = 1 - (pAlive / pStart);
    const eLostPct = 1 - (eAlive / eStart);

    applyCasualtyPressureToSide(units, "player", pLostPct);
    applyCasualtyPressureToSide(units, "enemy", eLostPct);
}

function applyCasualtyPressureToSide(units, side, casualtyPct) {
    let moraleMultiplier = 1;
    let panicLock = false;

    if (casualtyPct >= 0.60) {
        moraleMultiplier = 4.0;
        panicLock = true;
    } else if (casualtyPct >= 0.45) {
        moraleMultiplier = 2.5;
    } else if (casualtyPct >= 0.30) {
        moraleMultiplier = 1.5;
    }

    units.forEach(u => {
        if (!u || u.side !== side || u.hp <= 0) return;

        // put flags on the unit
        u.casualtyMoraleMultiplier = moraleMultiplier;
        u.forcePanicFromCasualties = panicLock;
        u.casualtyMoralePct = casualtyPct;

        // also put flags on stats in case morale logic reads there
        if (u.stats) {
            u.stats.casualtyMoraleMultiplier = moraleMultiplier;
            u.stats.forcePanicFromCasualties = panicLock;
            u.stats.casualtyMoralePct = casualtyPct;
        }

        // keep morale fields in sync if one of them exists
        if (u.stats && typeof u.stats.morale !== "number" && typeof u.morale === "number") {
            u.stats.morale = u.morale;
        } else if (typeof u.morale !== "number" && u.stats && typeof u.stats.morale === "number") {
            u.morale = u.stats.morale;
        }
    });
}