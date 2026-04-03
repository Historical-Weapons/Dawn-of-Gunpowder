
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

            totalDamage = Math.max(15, weaponDamage - (defender.armor * 0.3)); // reasonable 15 for blunt
        }
    }

    if (attacker.stamina < 30) totalDamage *= 0.7;

    let finalDamage = Math.floor(totalDamage);
    // If formatNumbersWithCommas is true, we still return a Number for calculations,
    // but you can format it later in the UI.
    return finalDamage;
} // Always return a pure number for math operations
 
function updateBattleUnits() {

    // Add to the top of updateBattleUnits():
    if (typeof processSiegeEngines === 'function') processSiegeEngines();

    const now = Date.now();

    if (typeof processTacticalOrders === 'function') {
        processTacticalOrders();
    }

    // --- REVISED SURGERY: Keep dead units for 10 seconds ---
    battleEnvironment.units = battleEnvironment.units.filter(u => {
        if (u.removeFromBattle) return false;

        if (u.hp <= 0) {
            if (!u.deathTime) handleUnitDeath(u);

            // BULLETPROOF FIX: The Commander's body must never decay!
            // If it decays, update.js loses its reference and freezes the game.
            if (u.isCommander) return true;

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

        // 2. REVISED ROOT CAUSE FIX: Stop AI but update Animation State
        if (unit.disableAICombat) {
            // 1. Manually find the nearest target so the player unit "knows" who it is fighting
            if (!unit.target || unit.target.hp <= 0) {
                let nearestDist = Infinity;
                units.forEach(other => {
                    if (other.side !== unit.side && other.hp > 0) {
                        let d = Math.hypot(unit.x - other.x, unit.y - other.y);
                        if (d < nearestDist) {
                            nearestDist = d;
                            unit.target = other;
                        }
                    }
                });
            }

            // 2. FIX THE TWERKING: Update the animation state based on distance
            if (unit.target) {
                let distToTarget = Math.hypot(unit.target.x - unit.x, unit.target.y - unit.y);

                // If we are within 50px (combat range), stop the horse leg animation
                if (distToTarget < 50) {
                    unit.state = "idle";
                } else {
                    // Only set to moving if the player is actually holding movement keys
                    // This assumes your 'keys' object is globally accessible
                    unit.state = (keys['w'] || keys['a'] || keys['s'] || keys['d']) ? "moving" : "idle";
                }
            } else {
                unit.state = "idle";
            }

            // 3. EXIT: We updated the state for the renderer, now skip the AI math below
            return;
        }

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
            /* STAGE 2: Broken (Run Off Map) */
            if (unit.stats.morale <= 0) {
                unit.state = "FLEEING";

                if (!unit.escapePoint || unit.escapeType !== "OUTER") {
                    unit.escapeType = "OUTER";
                    unit.fleeTimer = 0;

                    // --- PHASE 3: COWARDS OPEN THE NORTH GATE AND FLEE ---
                    if (inSiegeBattle && unit.side === "enemy" && typeof overheadCityGates !== 'undefined') {
                        let northGate = overheadCityGates.find(g => g.side === "north");
                        if (northGate) {
                            // Set escape point far north, directly through the gate
                            unit.escapePoint = { x: northGate.x * BATTLE_TILE_SIZE, y: -500 };
                        }
                    } else {
                        // Standard battle flee logic
                        let distToLeft = unit.x;
                        let distToRight = BATTLE_WORLD_WIDTH - unit.x;
                        let distToTop = unit.y;
                        let distToBottom = BATTLE_WORLD_HEIGHT - unit.y;
                        let minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

                        let outerPadding = -2000;
                        if (minDist === distToLeft) unit.escapePoint = { x: outerPadding, y: unit.y };
                        else if (minDist === distToRight) unit.escapePoint = { x: BATTLE_WORLD_WIDTH - outerPadding, y: unit.y };
                        else if (minDist === distToTop) unit.escapePoint = { x: unit.x, y: outerPadding };
                        else unit.escapePoint = { x: unit.x, y: BATTLE_WORLD_HEIGHT - outerPadding };
                    }
                }

                // If a fleeing enemy reaches the North Gate, they throw it open in panic
                if (inSiegeBattle && unit.side === "enemy") {
                    let northGate = overheadCityGates.find(g => g.side === "north");
                    if (northGate && !northGate.isOpen) {
                        let distToGate = Math.hypot(unit.x - (northGate.x * BATTLE_TILE_SIZE), unit.y - (northGate.y * BATTLE_TILE_SIZE));
                        if (distToGate < 100) {
                            northGate.isOpen = true;
                            northGate.gateHP = 0;
                            if (typeof updateCityGates === 'function') updateCityGates(battleEnvironment.grid);
                            console.log("Defenders have thrown open the North Gate to escape!");
                        }
                    }
                }

                let dx = unit.escapePoint.x - unit.x;
                let dy = unit.escapePoint.y - unit.y;
                let dist = Math.hypot(dx, dy);

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
        // Calculate distance to current target (if any)
        let currentTargetDist = (unit.target && unit.target.hp > 0) 
            ? Math.hypot(unit.x - unit.target.x, unit.y - unit.target.y) 
            : Infinity;

        // Re-evaluate if: No target, target is dead, OR occasionally checking for closer threats if chasing someone far away
        if (!unit.target || unit.target.hp <= 0 || (currentTargetDist > 80 && Math.random() < 0.02)) {
            let nearestDist = Infinity;
            let nearestEnemy = null;
            units.forEach(other => {
                // Ensure it's an enemy, alive, and NOT a dummy waypoint
                if (other.side !== unit.side && other.hp > 0 && !other.isDummy) {
                    let dist = Math.hypot(unit.x - other.x, unit.y - other.y);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestEnemy = other;
                    }
                }
            });
            
            // Lock onto the new target if we didn't have one, or if this new enemy is closer than the old one!
            if (nearestEnemy && nearestDist < currentTargetDist) {
                unit.target = nearestEnemy;
            }
        }

        // --- TRACK POSITION BEFORE MOVEMENT ---
        let oldX = unit.x;
        let oldY = unit.y;

        if (unit.target) {
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

                    // =========================================================
                    // --- SURGERY: SIEGE DEFENDER AI OVERRIDE ---
                    // =========================================================
                    if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle && unit.side === "enemy") {
                        let southGate = typeof overheadCityGates !== 'undefined' ? overheadCityGates.find(g => g.side === "south") : null;

                        // PHASE 1: Gate is intact. Hold positions.
                        if (southGate && (!southGate.isOpen && southGate.gateHP > 0)) {
                            shouldHold = true;
                        }
                        // PHASE 2: Gate Breached! Fall back to Plaza Last Stand.
                        else {
                            let plazaX = BATTLE_WORLD_WIDTH / 2;
                            let plazaY = (typeof CITY_LOGICAL_HEIGHT !== 'undefined' ? CITY_LOGICAL_HEIGHT : 3200) / 2;
                            let distToPlaza = Math.hypot(plazaX - unit.x, plazaY - unit.y);

                            if (distToPlaza > 150) {
                                shouldHold = false;

                                // If they are trapped on the wall, steer them toward the closest ladder first
                                if (unit.onWall && typeof cityLadders !== 'undefined' && cityLadders.length > 0) {
                                    let closestLadder = cityLadders.reduce((prev, curr) =>
                                        Math.hypot(curr.x - unit.x, curr.y - unit.y) < Math.hypot(prev.x - unit.x, prev.y - unit.y) ? curr : prev
                                    );
                                    dx = closestLadder.x - unit.x;
                                    dy = closestLadder.y - unit.y;
                                    dist = Math.hypot(dx, dy);
                                } else {
                                    // Ground pathing to plaza
                                    dx = plazaX - unit.x;
                                    dy = plazaY - unit.y;
                                    dist = distToPlaza;
                                }
                            } else {
                                // Phase 2b: Formed up at the plaza
                                shouldHold = true;
                            }
                        }
                    }
                    // =========================================================


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
                            let moveVector = { dx: dx, dy: dy, dist: dist };

                            // OVERRIDE: Only call the siege logic if we are actually in a siege battle
                            if (inSiegeBattle && typeof getSiegePathfindingVector === 'function') {
                                moveVector = getSiegePathfindingVector(unit, unit.target, dx, dy, dist);
                            }

                            unit.x += (moveVector.dx / moveVector.dist) * (unit.stats.speed * speedMod);
                            unit.y += (moveVector.dy / moveVector.dist) * (unit.stats.speed * speedMod);
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
                        // --- DEEP FIX: Force stance update if ammo is depleted ---
                        if (unit.stats.currentStance === "statusrange" && unit.stats.ammo <= 0) {
                            unit.stats.currentStance = "statusmelee";
                        }

                        if (unit.stats.currentStance === "statusrange") {

                            /* Ranged Combat */
                            let isRepeater = unit.unitType === "Repeater Crossbowman";

                            if (isRepeater && unit.stats.magazine > 0) {
                                //repeater burst
                                unit.cooldown = 50; //0.5 sec a shot
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
                            let speed = 12; // Projectile flight speed

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
    }); //end for loop in beginning

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
                    if (isJavelin || isBolt || isArrow || isRocket) {
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

    // 🔴 SURGERY: Prevent Player from Flipping & Trigger Enemy AI
    // THE FIX: Search by side and isCommander instead of the missing disableAICombat tag
    let playerCmdr = battleEnvironment.units.find(u => u.isCommander && u.side === "player");
    if (playerCmdr && playerCmdr.hp > 0) {
        // Force visual direction based on keyboard movement instead of AI targeting
        if (typeof keys !== 'undefined') {
            if (keys['a'] || keys['arrowleft']) playerCmdr.direction = -1;
            else if (keys['d'] || keys['arrowright']) playerCmdr.direction = 1;
        }
        // Clear any AI-assigned targets so it doesn't try to auto-chase
        playerCmdr.target = null;
    }

    // THE FIX: Explicitly ensure this is an ENEMY before feeding it to the AI
    let enemyCmdr = battleEnvironment.units.find(u => u.isCommander && u.side === "enemy");
    if (enemyCmdr && enemyCmdr.hp > 0) {
        processEnemyCommanderAI(enemyCmdr);
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

function isBattleCollision(x, y, onWall = false) {
    let tx = Math.floor(x / BATTLE_TILE_SIZE);
    let ty = Math.floor(y / BATTLE_TILE_SIZE);

    if (tx < 0 || tx >= BATTLE_COLS || ty < 0 || ty >= BATTLE_ROWS) return true;

    if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle) {
        let tile = battleEnvironment.grid[tx][ty];
        if (tile === 9) return false; // Ladders always walkable
        if (onWall) {
            return !(tile === 8 || tile === 10); // Must stay on parapet
        } else {
            // Player and troops CANNOT walk on buildings (2), trees (3), water (4), solid walls (6), tower bases (7)
            return tile === 2 || tile === 3 || tile === 4 || tile === 6 || tile === 7; 
        }
    }

    if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 6) return true;
    return false;
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


 // ============================================================================
// ENEMY COMMANDER SKIRMISH AI (20s PHASE THEN MELEE RUSH)
// ============================================================================
function processEnemyCommanderAI(cmdr) {
    if (cmdr.hp <= 0 || cmdr.state === "FLEEING") return;

    // --- 0. THE 60-SECOND TIMER ---
    // Mark the exact millisecond the commander charge
    cmdr.skirmishStartTime = cmdr.skirmishStartTime || Date.now();
    let elapsed = Date.now() - cmdr.skirmishStartTime;
    let isSkirmishPhase = elapsed < 60000; // 60 seconds

    // --- 1. DECISION THROTTLING ---
    cmdr.aiTick = (cmdr.aiTick || 0) + 1;
    if (cmdr.aiTick % 10 !== 0 && cmdr.target && cmdr.target.hp > 0) {
        applySkirmishPhysics(cmdr);
        return;
    }

    let closestDist = Infinity;
    let closestEnemy = null;

    // --- 2. TARGET PERSISTENCE ---
    if (cmdr.target && cmdr.target.hp > 0) {
        let d = Math.hypot(cmdr.target.x - cmdr.x, cmdr.target.y - cmdr.y);
        if (d < 600) { 
            closestEnemy = cmdr.target;
            closestDist = d;
        }
    }

    if (!closestEnemy) {
        for (let u of battleEnvironment.units) {
            if (u.side === 'player' && u.hp > 0) {
                let d = Math.hypot(u.x - cmdr.x, u.y - cmdr.y);
                if (d < closestDist) {
                    closestDist = d;
                    closestEnemy = u;
                }
            }
        }
    }

    if (!closestEnemy) {
        cmdr.state = "idle";
        cmdr.isMoving = false;
        cmdr.vx *= 0.9; cmdr.vy *= 0.9; 
        return;
    }

    cmdr.target = closestEnemy;

    let dx = closestEnemy.x - cmdr.x;
    let dy = closestEnemy.y - cmdr.y;
    let angle = Math.atan2(dy, dx);
    cmdr.direction = dx > 0 ? 1 : -1;

// --- 3. PHASE LOGIC ---
    // Added safety check to ensure we also look at cmdr.stats.ammo
    if (!isSkirmishPhase || (cmdr.ammo || 0) <= 0 || (cmdr.stats && cmdr.stats.ammo <= 0)) {
        // ==========================================
        // PHASE 2: MELEE RUSH (No more arrows!)
        // ==========================================
        
        // CRITICAL FIX: Wipe ammo on BOTH the wrapper and the stats object
        cmdr.ammo = 0; 
        cmdr.isRanged = false; 
        if (cmdr.stats) {
            cmdr.stats.ammo = 0;
            cmdr.stats.isRanged = false;
            cmdr.stats.currentStance = "statusmelee"; // Instantly force melee stance
        }

        // SPEED FIX: Scale charge speed dynamically instead of a flat 4.5
        const baseSpeed = (cmdr.stats && cmdr.stats.speed) ? cmdr.stats.speed : 1.0;
        const chargeSpeed = baseSpeed * 1.0; // Gives a 0% charge bonus
        const meleeRange = 40;   // Get right in their face

        if (closestDist > meleeRange) {
            // CHARGE!
            cmdr.state = "moving";
            cmdr.isMoving = true;
            cmdr.targetVx = Math.cos(angle) * chargeSpeed;
            cmdr.targetVy = Math.sin(angle) * chargeSpeed;
        } else {
            // STRIKE!
            cmdr.state = "attacking"; 
            cmdr.isMoving = false;
            cmdr.targetVx = 0;
            cmdr.targetVy = 0;
        }
    } else {
        // ==========================================
        // PHASE 1: ANNOYING SKIRMISH (First 20s)
        // ==========================================
        const IDEAL_MIN = 200; 
        const IDEAL_MAX = 500; 
        const speed = 1.0; 

        if (closestDist < IDEAL_MIN) {
            // Retreat
            cmdr.state = "moving";
            cmdr.isMoving = true;
            cmdr.targetVx = -Math.cos(angle) * speed; 
            cmdr.targetVy = -Math.sin(angle) * speed; 
        } else if (closestDist > IDEAL_MAX) {
            // Advance cautiously
            cmdr.state = "moving";
            cmdr.isMoving = true;
            cmdr.targetVx = Math.cos(angle) * speed * 0.8;
            cmdr.targetVy = Math.sin(angle) * speed * 0.8;
        } else {
            // Hold and Shoot
            cmdr.state = "attacking"; 
            cmdr.isMoving = false;
            cmdr.targetVx = 0;
            cmdr.targetVy = 0;
        }
    }

    applySkirmishPhysics(cmdr);

    // --- 4. COMBAT EXECUTION ---
    // The ultimate safeguard: He is ONLY allowed to shoot if the 20-second
    // phase is active AND he actually has ammo.
    if (isSkirmishPhase && cmdr.state === "attacking" && cmdr.cooldown <= 0 && (cmdr.ammo || 0) > 0) {
        fireCommanderProjectile(cmdr, angle);
    }
    
    if (cmdr.cooldown > 0) cmdr.cooldown--;
}

function applySkirmishPhysics(cmdr) {
    const lerp = 0.15; 
    cmdr.vx = (cmdr.vx || 0) * (1 - lerp) + (cmdr.targetVx || 0) * lerp;
    cmdr.vy = (cmdr.vy || 0) * (1 - lerp) + (cmdr.targetVy || 0) * lerp;

    cmdr.x += cmdr.vx;
    cmdr.y += cmdr.vy;

    let margin = 60;
    cmdr.x = Math.max(margin, Math.min(BATTLE_WORLD_WIDTH - margin, cmdr.x));
    cmdr.y = Math.max(margin, Math.min(BATTLE_WORLD_HEIGHT - margin, cmdr.y));
}

function fireCommanderProjectile(cmdr, angle) {
    let projSpeed = 12;
    battleEnvironment.projectiles.push({
        x: cmdr.x, y: cmdr.y,
        vx: Math.cos(angle) * projSpeed,
        vy: Math.sin(angle) * projSpeed,
        startX: cmdr.x, startY: cmdr.y,
        maxRange: cmdr.stats.range || 650,
        attackerStats: cmdr.stats,
        side: cmdr.side,
        projectileType: "Arrow",
        isFire: false
    });

    if (typeof AudioManager !== 'undefined') AudioManager.playSound('arrow');
    cmdr.ammo--;
    cmdr.cooldown = 150;
}