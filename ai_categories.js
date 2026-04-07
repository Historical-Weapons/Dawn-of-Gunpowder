
function canUseSiegeEngines(unit) {
	
	
    if (!unit || !unit.stats) return false; 
    if (unit.isCommander) return false; // SURGERY 1: Hard block commander

    const txt = String(
        (unit.unitType || "") + " " + 
        (unit.stats?.role || "") + " " + 
        (unit.stats?.name || "")
    ).toLowerCase();

    const isCavalry = /(cav|horse|mounted|camel|eleph|lancer|keshig)/.test(txt);
    if (unit.stats.isLarge || unit.isMounted || isCavalry) return false;
   
 
// --- SURGERY: PROMOTE SPECIALISTS TO SIEGE ROLES ---
// Ensure txt is lowercase once at the start
const unitLabel = txt.toLowerCase();

// Use \b (word boundaries) so 'bombardier' doesn't trigger 'bomb'
const isRanged = unit.stats.isRanged || /\b(archer|bow|crossbow|slinger|rocket)\b/.test(unitLabel);

const isSpecialist = /\b(firelance|bomb|javelinier|repeater)\b/.test(unitLabel);

if (isRanged && !isSpecialist) {
    if (unit.siegeRole === "treb_crew" || unit.siegeRole === "trebuchet_crew" || unit.siegeRole === "counter_battery") return true;
    
    // Standard archers only touch equipment if explicitly forced
    if (unit.siegeRole === "ram_pusher" || unit.siegeRole === "ladder_carrier" || unit.siegeRole === "ladder_fanatic") return true;
    
    return false; 
}

// Firelances, Bombs, and Javelins now count as "Infantry" for siege purposes!
return true;
}
const AICategories = {

    cleanupDeadUnits: function(units, now) {
        return units.filter(u => {
            if (u.removeFromBattle) return false;
            if (u.hp <= 0) {
                if (!u.deathTime) handleUnitDeath(u);
   
                if (u.isCommander) return true;
                return (now - u.deathTime) < 1000;
            }
            return true;
        });
    },

    initBattleTrackers: function(currentBattleData) {
        if (!currentBattleData.fledCounts) currentBattleData.fledCounts = { player: 0, enemy: 0 };
        if (!currentBattleData.frames) currentBattleData.frames = 0;
        currentBattleData.frames++;
    },

handlePlayerOverride: function(unit, units, keys, battleEnv, player) {
        if (!unit.target || unit.target.hp <= 0) {
            let nearestDist = Infinity;
            units.forEach(other => {
                if (other.side !== unit.side && other.hp > 0 && !other.isDummy) {
                    let d = Math.hypot(unit.x - other.x, unit.y - other.y);
                    if (d < nearestDist) {
                        nearestDist = d;
                        unit.target = other;
                    }
                }
            });
        }

        if (unit.target) {
            let distToTarget = Math.hypot(unit.target.x - unit.x, unit.target.y - unit.y);
            unit.stats.updateStance(distToTarget);
            let effectiveRange = unit.stats.currentStance === "statusmelee" ? 30 : unit.stats.range;

            if (distToTarget <= effectiveRange) {
                // SURGERY: Force the combat execution to run for the player commander
                this._handleCombatExecution(unit, unit.target.x - unit.x, unit.target.y - unit.y, distToTarget, battleEnv, player);
                unit.state = "attacking";
            } else {
                unit.state = (keys['w'] || keys['a'] || keys['s'] || keys['d']) ? "moving" : "idle";
            }
        } else {
            unit.state = "idle";
        }
    },

    processMoraleAndFleeing: function(unit, pCount, eCount, currentBattleData) {
        let hpPct = unit.hp / unit.stats.health;
        let armorEffect = Math.min(unit.stats.armor / 50, 1.0);
        let baseTick = (hpPct <= 0.1) ? 0.12 : (hpPct <= 0.8 ? 0.04 : 0);

        const weOutnumberEnemy = (unit.side === 'player' && pCount > eCount) || (unit.side === 'enemy' && eCount > pCount);

        if (weOutnumberEnemy) {
            baseTick = 0;
        } else if ((unit.side === 'player' && eCount >= pCount * 5) || (unit.side === 'enemy' && pCount >= eCount * 5)) {
            baseTick = 0.2; 
        }

        if (unit.stats.armor >= 30 && currentBattleData.frames < 18000) baseTick *= 0.01;
        if (unit.stats.armor < 5 && unit.target && hpPct < 0.9 && !weOutnumberEnemy) baseTick += 0.02; 

        if (baseTick > 0) {
            unit.stats.morale -= baseTick * Math.max(0.1, (1.1 - armorEffect));
        } else if (unit.stats.morale < 20) {
            unit.stats.morale += 0.005;
        }

        if (unit.stats.morale <= 0) {
            this._handleBrokenFleeing(unit, currentBattleData);
            return true; 
        } 
        else if (unit.stats.morale <= 3) {
            this._handleWavering(unit);
            return true;
        }
        
        unit.escapePoint = null;
        unit.escapeType = null;
        return false; 
    },

    processTargeting: function(unit, units) {
        if (unit.disableAICombat || unit.orderType === "ladder_crew" || unit.orderType === "siege_assault") {
            return; 
        }
 
        let inSiege = typeof inSiegeBattle !== 'undefined' && inSiegeBattle;
        
        // ==========================================
        // SIEGE MACRO-TARGETING OVERHAUL
        // ==========================================
        if (inSiege) {
            let southGate = (typeof battleEnvironment !== 'undefined' && battleEnvironment.cityGates) 
                ? battleEnvironment.cityGates.find(g => g.side === "south") : null;
            let isGateBreached = !southGate || southGate.isOpen;
            
            let plazaTarget = {
                x: typeof SiegeTopography !== 'undefined' ? SiegeTopography.gatePixelX : BATTLE_WORLD_WIDTH / 2,
                y: typeof SiegeTopography !== 'undefined' ? SiegeTopography.plazaPixelY : BATTLE_WORLD_HEIGHT / 2,
                hp: 9999, isDummy: true, priority: "plaza"
            };

            // ATTACKER COMMON GOAL
            if (unit.side === "player") {
                if (isGateBreached && !unit.onWall) {
                    // Flood the gates if breached
                    if (!unit.target || unit.target.priority !== "plaza") {
                        unit.target = plazaTarget;
                    }
                    return; // Lock in the macro-target
		} else if (!canUseSiegeEngines(unit) && !isGateBreached) {
                    // Cavalry/Large sit back if walls are up to avoid clustering and dying to towers
                    let campY = typeof SiegeTopography !== 'undefined' ? SiegeTopography.campPixelY + 40 : BATTLE_WORLD_HEIGHT - 50;
                    // FIX: Pushed back to +500 so they stay safely behind the trebuchets (which spawn at +350)
                    unit.target = { x: unit.x, y: campY, hp: 9999, isDummy: true };
                    return;
                }
            }
            
            // DEFENDER COMMON GOAL
            if (unit.side === "enemy") {
                if (isGateBreached && !unit.onWall) {
                    // Organized fallback to Plaza if breached
                    if (!unit.target || unit.target.priority !== "plaza") {
                        unit.target = plazaTarget;
                    }
                    return;
                }
            }
        }
 
// ==========================================
        // COUNTER-BATTERY TARGET OVERRIDE
        // ==========================================
        if (unit.siegeRole === "counter_battery" && !unit.disableAICombat) {
            let bestSnipeTarget = null;
            let bestSnipeScore = Infinity; // Lower score is better

            units.forEach(other => {
                if (other.side !== unit.side && other.hp > 0 && !other.isDummy) {
                    let isEnemyRanged = other.stats?.isRanged || String(other.stats?.role || "").toLowerCase().includes("archer");
                    let dist = Math.hypot(unit.x - other.x, unit.y - other.y);
                    
                    // Artificially reduce the distance score of enemy archers by 5000 
                    // This guarantees they will ignore closer melee targets to shoot archers first
                    let score = isEnemyRanged ? (dist - 5000) : dist;
                    
                    if (score < bestSnipeScore) {
                        bestSnipeScore = score;
                        bestSnipeTarget = other;
                    }
                }
            });

            if (bestSnipeTarget) {
                unit.target = bestSnipeTarget;
                return; // Lock target and abort standard targeting
            }
        }
 
// SURGERY: Treat dummy targets as infinitely far so AI instantly snaps to real enemies!
        let currentTargetDist = (unit.target && unit.target.hp > 0 && !unit.target.isDummy) 
            ? Math.hypot(unit.x - unit.target.x, unit.y - unit.target.y) 
            : Infinity;

        // ---> SURGERY 1: Drop the target if they become inaccessible (e.g., climbing a ladder) <---
        if (!unit.target || unit.target.hp <= 0 || unit.target.disableAICombat || (currentTargetDist > 80 && Math.random() < 0.02) || (unit.target.isDummy && Math.random() < 0.05)) {
            let nearestDist = Infinity;
            let nearestEnemy = null;
            units.forEach(other => {
                // ---> SURGERY 1: Ensure new targets are not also inaccessible <---
                if (other.side !== unit.side && other.hp > 0 && !other.isDummy && !other.disableAICombat) {
                    let dist = Math.hypot(unit.x - other.x, unit.y - other.y);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestEnemy = other;
                    }
                }
            });
            
            if (nearestEnemy && nearestDist < currentTargetDist) {
                unit.target = nearestEnemy;
            }
        }
    },

    processAction: function(unit, battleEnv, currentBattleData, player) {
        
      // --- STAIR/LADDER OVERRIDE SURGERY ---
if (unit.target && !unit.target.isDummy && unit.onWall !== unit.target.onWall && canUseSiegeEngines(unit)) {
    
    // SURGERY: Only seek outer siege ladders if you are on the ground trying to get UP.
    if (!unit.onWall) { 
        const activeLadders = typeof siegeEquipment !== 'undefined' ? 
            siegeEquipment.ladders.filter(l => l.isDeployed && l.hp > 0) : [];
        
        if (activeLadders.length > 0) {
            let bestLadder = activeLadders.reduce((prev, curr) => {
                let scorePrev = Math.hypot(prev.x - unit.x, prev.y - unit.y) + (Math.random() * 50);
                let scoreCurr = Math.hypot(curr.x - unit.x, curr.y - unit.y) + (Math.random() * 50);
                return scoreCurr < scorePrev ? curr : prev;
            });

            unit.target = { 
                x: bestLadder.x, 
                y: bestLadder.y - 20, // Always point to the base to climb up
                onWall: true, 
                isDummy: true,
                isLadderAssault: true
            };
            unit.state = "moving";
            unit.hasOrders = true;
        }
    }
}
		let oldX = unit.x;
        let oldY = unit.y;
        
        let inSiege = typeof inSiegeBattle !== "undefined" && inSiegeBattle;

        // =========================================================
        // ---> FIX: PRE-BREACH CAVALRY HARD FREEZE <---
        // =========================================================
        if (inSiege && unit.side === "player" && unit.siegeRole === "cavalry_reserve") {
            let southGate = (typeof battleEnvironment !== 'undefined' && battleEnvironment.cityGates) 
                ? battleEnvironment.cityGates.find(g => g.side === "south") : null;
            let isGateBreached = window.__SIEGE_GATE_BREACHED__ || (southGate && (southGate.isOpen || southGate.gateHP <= 0));

            if (!isGateBreached) {
                unit.vx = 0;
                unit.vy = 0;
                unit.state = "idle";
                // Restore stamina while resting, but absolutely NO pathfinding, pinballing, or attacking
                if (unit.stats.stamina < 100 && Math.random() > 0.9) unit.stats.stamina++;
                return; 
            }
        }
  
       // ---> SURGERY 2: THE COMBAT/ACTION HARD BLOCK <---
        // Kept the hard block ONLY for pure pacifist roles like ladder carriers
        if (unit.disableAICombat || unit.orderType === "ladder_crew") {
            if (unit.target) {
                let dx = unit.target.x - unit.x;
                let dy = unit.target.y - unit.y;
                let dist = Math.hypot(dx, dy);
                this._handleMovement(unit, dx, dy, dist, battleEnv);
                let hasMoved = Math.abs(unit.x - oldX) > 0.1 || Math.abs(unit.y - oldY) > 0.1;
                unit.state = hasMoved ? "moving" : "idle";
            }
            return; 
        }

        // SURGERY: Allow 'siege_assault' and 'move_to_point' to fight back if their target is a REAL enemy.
        // If the target is just a dummy waypoint, they skip combat and keep walking.
        if ((unit.orderType === "siege_assault" || unit.orderType === "move_to_point") && unit.target && unit.target.isDummy) {
             let dx = unit.target.x - unit.x;
             let dy = unit.target.y - unit.y;
             let dist = Math.hypot(dx, dy);
             this._handleMovement(unit, dx, dy, dist, battleEnv);
             let hasMoved = Math.abs(unit.x - oldX) > 0.1 || Math.abs(unit.y - oldY) > 0.1;
             unit.state = hasMoved ? "moving" : "idle";
             return;
        }
         
        const txt = String(
            (unit.unitType || "") + " " +
            (unit.stats?.role || "") + " " +
            (unit.stats?.name || "")
        ).toLowerCase();

        const isMountedOrLarge = Boolean(
            unit.stats?.isLarge ||
            unit.isMounted ||
            /\b(cav|horse|mounted|camel|eleph|lancer)\b/.test(txt)
        );

        if (unit.target) {
            if (inSiege && unit.side === "player" && isMountedOrLarge) {
                if (unit.target.isDummy || unit.target.hp <= 0) {
                    
                    // Look for enemies if safe, otherwise chill
                    let nearestEnemy = null;
                    let nearestDist = Infinity;
                    if (battleEnv && battleEnv.units) {
                        for (let other of battleEnv.units) {
                            if (!other || other.hp <= 0 || other.side === unit.side || other.isDummy) continue;
                            let d = Math.hypot(other.x - unit.x, other.y - unit.y);
                            if (d < nearestDist) { nearestDist = d; nearestEnemy = other; }
                        }
                    }

                    if (nearestEnemy && nearestDist < 400) { // Only engage if relatively close
                        unit.target = nearestEnemy;
                    } else {
                        unit.state = "idle";
                        if (unit.stats.stamina < 100 && Math.random() > 0.9) unit.stats.stamina++;
                        return;
                    }
                }
            }

            let dx = unit.target.x - unit.x;
            let dy = unit.target.y - unit.y;
            let dist = Math.hypot(dx, dy);

            unit.stats.updateStance(dist);
            let effectiveRange = unit.stats.currentStance === "statusmelee" ? 30 : unit.stats.range;

            if (dist > effectiveRange * 0.8) {
                this._handleMovement(unit, dx, dy, dist, battleEnv);
            } else {
                this._handleCombatExecution(unit, dx, dy, dist, battleEnv, player);
            }

            let hasMoved = Math.abs(unit.x - oldX) > 0.1 || Math.abs(unit.y - oldY) > 0.1;
            if (hasMoved) {
                unit.state = "moving";
            } else if (unit.state !== "attacking") {
                unit.state = "idle";
            }
        } else {
            if (!unit.isCommander) unit.state = "idle";
            if (unit.stats.stamina < 100 && Math.random() > 0.9) unit.stats.stamina++;
        }
    },

    // --- INTERNAL HELPER FUNCTIONS ---

    _handleBrokenFleeing: function(unit, currentBattleData) {
        unit.state = "FLEEING";
        let inSiege = typeof inSiegeBattle !== 'undefined' && inSiegeBattle;

        if (!unit.escapePoint || unit.escapeType !== "OUTER") {
            unit.escapeType = "OUTER";
            unit.fleeTimer = 0;

            if (inSiege && unit.side === "enemy" && typeof battleEnvironment !== 'undefined' && battleEnvironment.cityGates) {
                let northGate = battleEnvironment.cityGates.find(g => g.side === "north");
                if (northGate && northGate.pixelRect) {
                    unit.escapePoint = { x: northGate.pixelRect.x + (northGate.pixelRect.w / 2), y: -500 };
                }
            } else {
                let distToLeft = unit.x;
                let distToRight = BATTLE_WORLD_WIDTH - unit.x;
                let distToTop = unit.y;
                let distToBottom = BATTLE_WORLD_HEIGHT - unit.y;
                let minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
                let padding = -2000;

                if (minDist === distToLeft) unit.escapePoint = { x: padding, y: unit.y };
                else if (minDist === distToRight) unit.escapePoint = { x: BATTLE_WORLD_WIDTH - padding, y: unit.y };
                else if (minDist === distToTop) unit.escapePoint = { x: unit.x, y: padding };
                else unit.escapePoint = { x: unit.x, y: BATTLE_WORLD_HEIGHT - padding };
            }
        }

// Check if we are in a siege and the unit is a defender (enemy)
if (inSiege && unit.side === "enemy" && typeof battleEnvironment !== 'undefined' && battleEnvironment.cityGates) {
    
    // Find the North Gate
    const northGate = battleEnvironment.cityGates.find(g => g.side === "north");

    // Only proceed if the gate exists, is currently CLOSED, and has valid hitboxes
    if (northGate && !northGate.isOpen && northGate.pixelRect) {
        
        // Calculate center once using the pixelRect
        const gateCenterX = northGate.pixelRect.x + (northGate.pixelRect.w / 2);
        const gateCenterY = northGate.pixelRect.y + (northGate.pixelRect.h / 2);
        
        // Use squared distance for better performance (avoids Math.sqrt/hypot every frame)
        const distSq = Math.pow(unit.x - gateCenterX, 2) + Math.pow(unit.y - gateCenterY, 2);

        if (distSq < 10000) { // 100 * 100 = 10000
            // 1. Flip the state immediately to prevent other units from re-triggering this loop
            northGate.isOpen = true; 
            northGate.hp = 0; // Ensure it's treated as "destroyed" by targeting AI

            // 2. Update the Pathfinding Grid
            const bounds = northGate.bounds;
            if (bounds && battleEnvironment.grid) {
                for (let x = bounds.x0; x <= bounds.x1; x++) {
                    // Check if column exists
                    if (!battleEnvironment.grid[x]) continue;

                    for (let y = bounds.y0; y <= bounds.y1; y++) {
                        // Keep the pillars solid, but make the gate pathable (1)
                        const isPillar = (x === bounds.x0 || x === bounds.x1);
                        if (!isPillar) {
                            battleEnvironment.grid[x][y] = 1; 
                        }
                    }
                }
            }

            console.log("Defenders have thrown open the North Gate to escape!");
            
            // 3. Audio/Visual feedback (Optional)
            if (typeof playSound === 'function') playSound("gate_creak");
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
            }
        }
    },

    _handleWavering: function(unit) {
        unit.state = "WAVERING";
        if (!unit.escapePoint || unit.escapeType !== "INNER") {
            let distToLeft = unit.x;
            let distToRight = BATTLE_WORLD_WIDTH - unit.x;
            let distToTop = unit.y;
            let distToBottom = BATTLE_WORLD_HEIGHT - unit.y;
            let minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
            let p = 20;

            if (minDist === distToLeft) unit.escapePoint = { x: p, y: unit.y };
            else if (minDist === distToRight) unit.escapePoint = { x: BATTLE_WORLD_WIDTH - p, y: unit.y };
            else if (minDist === distToTop) unit.escapePoint = { x: unit.x, y: p };
            else unit.escapePoint = { x: unit.x, y: BATTLE_WORLD_HEIGHT - p };

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
    },
    
_handleMovement: function(unit, dx, dy, dist, battleEnv) {
        if (unit.isCommander) return;

        let shouldHold = false;
        let inSiege = typeof inSiegeBattle !== 'undefined' && inSiegeBattle;
        let speedMod = 1.0;

        // ADD IT RIGHT HERE: Define it once so the whole function can use it
        let isLargeUnit = unit.stats?.isLarge || unit.isMounted || (unit.unitType && unit.unitType.toLowerCase().includes("cav"));

        // --- 1. LADDER TRANSITION STATE CHECK ---
        let isOnLadderTile = false;
        if (inSiege && unit.side === "player" && canUseSiegeEngines(unit) && battleEnv.grid && typeof BATTLE_TILE_SIZE !== 'undefined') {
            let tx = Math.floor(unit.x / BATTLE_TILE_SIZE);
            let ty = Math.floor(unit.y / BATTLE_TILE_SIZE);
            let currentTile = (battleEnv.grid[tx] && battleEnv.grid[tx][ty] !== undefined) ? battleEnv.grid[tx][ty] : 0;

            if (currentTile === 9) {
                isOnLadderTile = true;
                if (!unit.onWall && unit.side === "player") {
                    unit.onWall = true;
                    // THE POP: Throws them up onto the landing pad we just carved
                    let safeWallY = typeof SiegeTopography !== 'undefined' ? SiegeTopography.wallPixelY : (unit.y - 40);
                    unit.y = safeWallY - 20; 
                }
            }
            // ---> SURGERY: Safeguard 'onWall' stripping <---
            else if (currentTile === 1 || currentTile === 5 || currentTile === 0) {
                // ONLY strip 'onWall' if they are clearly SOUTH of the wall. 
                // If they are physically north of the boundary, let them stay on the wall.
                if (!(inSiege && unit.y <= SiegeTopography.wallPixelY)) {
                    unit.onWall = false; 
                }
            }
            else if (currentTile === 8 || currentTile === 10) unit.onWall = true;  
            
            if (currentTile === 4) speedMod = 0.4; 
            if (currentTile === 7) speedMod = 0.6; 
        }

        if (unit.side === "player" && !unit.hasOrders) {
            if (unit.stats.isRanged) shouldHold = true;
            else if (dist > 50) shouldHold = true; 
        }
// =========================================================
        // SIEGE MOVEMENT & ANTI-STUCK OVERHAUL
        // =========================================================
if (inSiege) {
            // ---> SURGERY: DETECT CLIMBING TILE <---
            let tx = Math.floor(unit.x / BATTLE_TILE_SIZE);
            let ty = Math.floor(unit.y / BATTLE_TILE_SIZE);
            let currentTile = (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty]) ? battleEnvironment.grid[tx][ty] : 0;
            isOnLadderTile = (currentTile === 9 || currentTile === 12);
            
            // Determine if unit is cavalry/large
          
          // If they are on the wall, their target is on the ground, and they are out of range, STOP moving.
if (unit.onWall && unit.target && !unit.target.onWall && !unit.target.isDummy) {
    let effRange = unit.stats.currentStance === "statusmelee" ? 30 : unit.stats.range;
    if (dist > effRange * 0.8) {
        
        // SURGERY: Only DEFENDERS should hold the wall. Attackers must push inward!
        if (unit.side === "enemy") { 
            shouldHold = true;
            unit.vx = 0; 
            unit.vy = 0;
        }
    }
}
            // Anti-Stuck Tracking: Monitors physical coordinate changes over time
            if (!unit.stuckLog) unit.stuckLog = { x: unit.x, y: unit.y, ticks: 0 };
            
            let distMovedInLog = Math.hypot(unit.x - unit.stuckLog.x, unit.y - unit.stuckLog.y);
            if (distMovedInLog < 1.0) {
                unit.stuckLog.ticks++;
            } else {
                unit.stuckLog.x = unit.x;
                unit.stuckLog.y = unit.y;
                unit.stuckLog.ticks = 0;
            }

            // DEFENDER COHESION
            if (unit.side === "enemy") {
                let southGate = battleEnvironment.cityGates ? battleEnvironment.cityGates.find(g => g.side === "south") : null;
                let isGateBreached = !southGate || southGate.isOpen;
                
                if (!isGateBreached) {
                    // Pre-Breach: Create an organized shield wall behind the gate, not just a random 100px shift
                    if (unit.target && unit.target.isDummy) {
                        let gateX = southGate ? southGate.pixelRect.x + (southGate.pixelRect.w / 2) : BATTLE_WORLD_WIDTH / 2;
                        let wallY = typeof SiegeTopography !== 'undefined' ? SiegeTopography.wallPixelY : 2000;
                        
                        // Funnel into a horizontal line behind the gate
                        unit.target.x = gateX + ((Math.random() - 0.5) * 150);
                        unit.target.y = wallY - 150; // Stand firmly 150px behind the breach point
                        
                        dx = unit.target.x - unit.x;
                        dy = unit.target.y - unit.y;
                        dist = Math.hypot(dx, dy);
                    }

                    if (dist < 30) shouldHold = true; 

                    let isMelee = !unit.stats.isRanged;
                    // Defend the line - hold formation
                    if (isMelee && !unit.onWall && dist < 40) {
                        shouldHold = true;
                        unit.vx = 0; 
                        unit.vy = 0;
                    }

                } else {
                    // Post-Breach Fallback
                    if (!unit.breachTimestamp) unit.breachTimestamp = Date.now();
                    if (Date.now() - unit.breachTimestamp < 10000) speedMod *= 1.30; 

                    let plazaX = typeof SiegeTopography !== 'undefined' ? SiegeTopography.gatePixelX : BATTLE_WORLD_WIDTH / 2;
                    let plazaY = typeof SiegeTopography !== 'undefined' ? SiegeTopography.plazaPixelY : BATTLE_WORLD_HEIGHT / 2;
                    let distToPlaza = Math.hypot(plazaX - unit.x, plazaY - unit.y);

                    if (distToPlaza > 200) {
                        shouldHold = false;
                        if (unit.onWall && !isOnLadderTile && typeof cityLadders !== 'undefined' && cityLadders.length > 0) {
                            let closestLadder = cityLadders.reduce((prev, curr) => Math.hypot(curr.x - unit.x, curr.y - unit.y) < Math.hypot(prev.x - unit.x, prev.y - unit.y) ? curr : prev);
                            dx = closestLadder.x - unit.x;
                            dy = closestLadder.y - unit.y;
                            dist = Math.hypot(dx, dy);
                        } 
                    } else {
                        // Organized Stand at Plaza
                        if (unit.target && unit.target.priority === "plaza") shouldHold = true; 
                    }
                }
            }
        }
        // =========================================================

        if (shouldHold) {
            unit.state = "idle";
            if (unit.stats.stamina < 100 && Math.random() > 0.9) unit.stats.stamina++;
        } else {
            if (Math.random() > 0.9) unit.stats.stamina = Math.max(0, unit.stats.stamina - 1);
            
            let moveVector = { dx: dx, dy: dy, dist: dist };
            if (inSiege && typeof getSiegePathfindingVector === 'function') {
                moveVector = getSiegePathfindingVector(unit, unit.target, dx, dy, dist);
            }

          // Calculate base velocity
            let vx = (moveVector.dx / moveVector.dist) * (unit.stats.speed * speedMod);
            let vy = (moveVector.dy / moveVector.dist) * (unit.stats.speed * speedMod);

// ---> SURGERY: LADDER PHYSICS ENGINE <---
            if (isOnLadderTile) {
                if (isLargeUnit) {
                    // 1. HARD BLOCK: Cavalry cannot move on ladder tiles
                    vx = 0;
                    vy = 0;
                    unit.vx = 0;
                    unit.vy = 0;
                } else {
                    // 2. SPEED DEBUFF & STONE TRAP FIX: Infantry moves straight up
                    vx = 0; // Lock horizontal movement so they cannot phase into stone walls
                    vy *= 0.30;
                }
            }

            if (unit.stats.morale > 3 && unit.stats.morale < 10) {
                let dir = unit.side === "player" ? 1 : -1;
                let safeEdge = unit.side === "player" ? BATTLE_WORLD_HEIGHT - 100 : 100;
                let notAtEdge = unit.side === "player" ? unit.y < safeEdge : unit.y > safeEdge;

                if (notAtEdge) {
                    vy = (unit.stats.speed * speedMod * 0.5) * dir;
                    vx = (Math.random() - 0.5);
                } else {
                    vx = 0; vy = 0;
                }
            }

            // STUCK PREVENTION: If a unit hasn't moved in 60 ticks (1 sec), override vector laterally
            if (inSiege && unit.stuckLog && unit.stuckLog.ticks > 60) {
                // Determine a perpendicular escape vector based on current target vector
                let perpX = -vy;
                let perpY = vx;
                
                // Add some chaotic slide to break out of geometry corners
                vx = perpX * 1.5 + ((Math.random() - 0.5) * unit.stats.speed);
                vy = perpY * 1.5 + ((Math.random() - 0.5) * unit.stats.speed);
                
                // If extremely stuck (> 180 ticks), temporarily clear target to force repathing
                if (unit.stuckLog.ticks > 180) {
                    unit.target = null;
                    unit.stuckLog.ticks = 0;
                }
            } else if (inSiege && unit.side === "player" && !unit.onWall && unit.target && unit.target.isLadderAssault) {
                // Clean straight pathing for ladder mounts to prevent clumping
                let climbDx = unit.target.x - unit.x;
                let climbDy = (unit.target.y - 15) - unit.y; 
                let climbDist = Math.hypot(climbDx, climbDy) || 1;
                vx = (climbDx / climbDist) * (unit.stats.speed * 1.2); 
                vy = (climbDy / climbDist) * (unit.stats.speed * 1.2);
            }

           let nextX = unit.x + vx;
            let nextY = unit.y + vy;

			if (typeof isBattleCollision === 'function') {
                // 1. Determine if this unit should phase through others (Ladders/Stairs)
                // Tile 9 = Ground Ladders, Tile 12 = Tower Wrap-around Ladders
                let ignoreCollision = (unit.siegeRole === "ladder_fanatic" || isOnLadderTile);

                // 2. SURGERY: CAVALRY BAN LOGIC
                // If the unit is large/mounted and they are on a ladder tile, 
                // we FORCE canMove to false so they cannot overlap with the ladder.
                let isBlockedCavalry = (isLargeUnit && isOnLadderTile);

                let canMoveX = !isBlockedCavalry && (ignoreCollision || !isBattleCollision(nextX, unit.y, unit.onWall, unit));
                let canMoveY = !isBlockedCavalry && (ignoreCollision || !isBattleCollision(unit.x, nextY, unit.onWall, unit));

                if (canMoveX) unit.x = nextX;
                if (canMoveY) unit.y = nextY;

                // 3. SURGERY: STUCK PROTECTION FOR LADDERS
                // If a large unit somehow ends up stuck inside Tile 12, push them back
                if (isBlockedCavalry) {
                    unit.vx = 0; unit.vy = 0;
                    // Optional: nudge them slightly south to get them off the ladder tile
                    unit.y += 2; 
                }

            } else {
                // Fallback for when collision function is missing
                if (!(isLargeUnit && isOnLadderTile)) {
                    unit.x = nextX;
                    unit.y = nextY;
                }
            }

            if (typeof applyPinballEscape === 'function') {
                applyPinballEscape(unit);
            }
        }
    },

    _handleCombatExecution: function(unit, dx, dy, dist, battleEnv, player) {
        if (unit.target.isDummy) {
            if (!unit.isCommander) unit.state = "idle";
            if (unit.stats.stamina < 100 && Math.random() > 0.9) unit.stats.stamina++;
            return;
        }

        if (!unit.isCommander || !player.isMoving) {
            unit.state = "attacking";
        }

        if (unit.cooldown <= 0) {
            if (unit.stats.currentStance === "statusrange" && unit.stats.ammo <= 0) {
                unit.stats.currentStance = "statusmelee";
            }

          if (unit.stats.currentStance === "statusrange") {
                
                // --- UNIVERSAL MAGAZINE SURGERY ---
                // 1. Get the max magazine size (Defaults to 1 for standard archers)
                let maxMag = (unit.stats && unit.stats.magazine) ? unit.stats.magazine : 1;
                
                // 2. Initialize current magazine if it doesn't exist
                if (unit.currentMag === undefined) {
                    unit.currentMag = maxMag;
                }

                // 3. Spend ammo
                unit.currentMag--;
                unit.stats.ammo--;

                // 4. Cooldown Routing
                if (unit.currentMag <= 0) {
                    // Magazine Empty: Trigger the full reload (e.g., 300 for repeater, 170 for archers)
                    unit.cooldown = getReloadTime(unit);
                    unit.currentMag = maxMag; // Refill the internal magazine
                } else {
                    // Magazine has ammo: Trigger the rapid burst
                    unit.cooldown = 50; 
                }
                // ----------------------------------

                let spread = (100 - unit.stats.accuracy) * 2.5;
                let targetX = unit.target.x + (Math.random() - 0.5) * spread;
                let targetY = unit.target.y + (Math.random() - 0.5) * spread;
                let angle = Math.atan2(targetY - unit.y, targetX - unit.x);
                let speed = 12; 

                battleEnv.projectiles.push({
                    x: unit.x, y: unit.y,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    startX: unit.x, startY: unit.y,
                    maxRange: unit.stats.range + 50,
                    attackerStats: unit.stats,
                    side: unit.side,
                    projectileType: (unit.unitType === "Rocket") ? "Archer" : unit.unitType,
                    isFire: ["Firelance", "Bomb", "Rocket"].includes(unit.unitType)
                });

                if (["Bomb", "Camel Cannon"].includes(unit.unitType)) AudioManager.playSound('bomb');
                else if (["Firelance", "Hand Cannoneer", "Rocket"].includes(unit.unitType)) AudioManager.playSound('firelance');
                else AudioManager.playSound('arrow');

            } else {
                unit.cooldown = getReloadTime(unit);
                let stateStr = "melee_attack";
                if (typeof ROLES !== 'undefined' && unit.stats.role === ROLES.CAVALRY) stateStr += " charging";
                if (typeof isFlanked !== 'undefined' && isFlanked(unit, unit.target)) stateStr += " flanked";

                let dmg = typeof calculateDamageReceived !== 'undefined' ? calculateDamageReceived(unit.stats, unit.target.stats, stateStr) : 10;
                unit.target.hp -= dmg;

                if (unit.side === "player" && unit.stats.gainExperience) {
                    let baseExp = unit.isCommander ? 0.05 : 0.35;
                    if (unit.target.hp <= 0) baseExp *= 3;
                    unit.stats.gainExperience(baseExp);

                    if (unit.isCommander && typeof gainPlayerExperience === 'function') {
                        gainPlayerExperience(baseExp);
                    }
                }

                if (dmg > (unit.target.stats.health * 0.25)) {
                    unit.target.stats.morale -= 5;
                }

                if (unit.unitType === "War Elephant") AudioManager.playSound('elephant');
                else AudioManager.playSound('sword_clash');

                if (dmg > 0) AudioManager.playSound('hit');
                else AudioManager.playSound('shield_block');

                unit.target.x += (dx / dist) * 5;
                unit.target.y += (dy / dist) * 5;
            }
        }
    
	},
	
	processProjectilesAndCleanup: function(battleEnvironment) {
        // ---> 30 SECOND CLEANUP LOGIC <---
        const THIRTY_SECONDS = 30000;
        const nowTime = Date.now();
        let units = battleEnvironment.units;

        if (battleEnvironment.groundEffects) {
            battleEnvironment.groundEffects = battleEnvironment.groundEffects.filter(g => (nowTime - g.timestamp) < THIRTY_SECONDS);
        }

        units.forEach(u => {
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
                p.x < -200 || p.x > (typeof BATTLE_WORLD_WIDTH !== 'undefined' ? BATTLE_WORLD_WIDTH : 2000) + 200 ||
                p.y < -200 || p.y > (typeof BATTLE_WORLD_HEIGHT !== 'undefined' ? BATTLE_WORLD_HEIGHT : 2000) + 200) {

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
                    let hitbox = u.stats && u.stats.isLarge ? 16 : 8;
                    let distToUnit = Math.hypot(p.x - u.x, p.y - u.y);

                    if (distToUnit < hitbox) {
                        hitMade = true;
                        let dmg = typeof calculateDamageReceived === 'function' ? calculateDamageReceived(p.attackerStats, u.stats, "ranged_attack") : 1;
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
                        let attackerUnit = units.find(a => a.stats === p.attackerStats);
                        if (attackerUnit && attackerUnit.side === "player" && p.attackerStats.gainExperience) {
                            let baseExp = attackerUnit.isCommander ? 0.05 : 0.35;
                            if (u.hp <= 0) baseExp *= 3;
                            p.attackerStats.gainExperience(baseExp);
                            if (attackerUnit.isCommander && typeof gainPlayerExperience === 'function') gainPlayerExperience(baseExp);
                        }

                        if (dmg > 0 && typeof AudioManager !== 'undefined') AudioManager.playSound('hit');
                        else if (typeof AudioManager !== 'undefined') AudioManager.playSound('shield_block');

                        break;
                    }
                }
            }
            if (hitMade) battleEnvironment.projectiles.splice(i, 1);
        }
    }
};

// =========================================================
// AI PINBALL ESCAPE SYSTEM (Anti-Stuck Fallback)
// =========================================================

function applyPinballEscape(unit) {
    // 1. Initialize trackers
    if (!unit.positionHistory) unit.positionHistory = [];
    if (!unit.pinballTimer) unit.pinballTimer = 0;

    // 2. Are we currently in Pinball Mode?
    if (unit.pinballTimer > 0) {
        // Violently bounce them in the saved random direction
        unit.x += unit.pinballVector.x;
        unit.y += unit.pinballVector.y;
        unit.pinballTimer--;
        return true; // We moved them, skip normal movement this frame!
    }

    // 3. Track their history (Save last 30 frames)
    unit.positionHistory.push({ x: unit.x, y: unit.y });
    if (unit.positionHistory.length > 30) {
        unit.positionHistory.shift(); // Keep array size small
    }

    // 4. Check if they are stuck
    // If they have a target but haven't moved more than 5 pixels in 30 frames
    if (unit.positionHistory.length === 30 && unit.hasOrders) {
        let oldPos = unit.positionHistory[0];
        let dx = unit.x - oldPos.x;
        let dy = unit.y - oldPos.y;
        let distanceMovedSq = (dx * dx) + (dy * dy);
if (distanceMovedSq < 9) { // 5 pixels squared
            
            // ---> SURGERY 4B: DO NOT BOUNCE UNITS MOVING TO DUMMY WAYPOINTS! ---
            if (unit.target && unit.target.isDummy) {
                unit.positionHistory = []; 
                return false; 
            }

            // --- NEW GUARD: DO NOT BOUNCE INTENTIONALLY IDLE UNITS OR LADDER SWARMERS! ---
            if (unit.siegeRole === "ladder_fanatic" || unit.state === "idle" || unit.siegeRole === "cavalry_reserve" || unit.siegeRole === "treb_crew" || unit.siegeRole === "trebuchet_crew") {
                unit.positionHistory = []; // Clear history to prevent memory bloat
                return; // Abort the pinball logic entirely for this unit
            }
            // UNIT IS STUCK! INITIATE PINBALL BOUNCE!
            
            // Generate a random aggressive bounce vector to knock them loose
            let bounceAngle = Math.random() * Math.PI * 2;
            let bounceForce = 1.3; // Speed of the bounce
            
            unit.pinballVector = {
                x: Math.cos(bounceAngle) * bounceForce,
                y: Math.sin(bounceAngle) * bounceForce
            };
            
            unit.pinballTimer = 15; // Bounce continuously for 15 frames
            unit.positionHistory = []; // Clear history so they don't instantly bounce again
            
            // Optional: Give them a tiny bit of damage or stamina drain if you want to penalize clumping
            return true;
        }
    }
    
    return false; // Not stuck, proceed with normal movement
}