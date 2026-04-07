// ============================================================================
// EMPIRE OF THE 13TH CENTURY - COMMAND & TACTICS ENGINE (REVISED)
// ============================================================================

let currentSelectionGroup = null; 
let currentFormationStyle = "line"; 
// --- SURGERY: ADD THIS LINE ---
let activeBattleFormation = null;
let isRightDragging = false;
let dragStartPos = { x: 0, y: 0 };
let dragCurrentPos = { x: 0, y: 0 };

// --- LAZY GENERAL FEATURE ---
let activeLazyGeneralInterval = null;

function startLazyGeneral() {
    if (activeLazyGeneralInterval) clearInterval(activeLazyGeneralInterval);
    activeLazyGeneralInterval = setInterval(() => {
        if (!inBattleMode || !battleEnvironment) {
            stopLazyGeneral();
            return;
        }
        
      const selectedUnits = battleEnvironment.units.filter(u => 
            u.side === "player" && 
            u.selected && 
            u.hp > 0 && 
            !u.isCommander && 
            !u.disableAICombat &&
            u.siegeRole !== "ladder_fanatic" && 
            u.siegeRole !== "counter_battery" &&
            u.siegeRole !== "treb_crew" &&       // SURGERY 3: Keep crews on the artillery!
            u.siegeRole !== "trebuchet_crew" 
        );

        if (selectedUnits.length === 0) return;

        if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle) {
            if (typeof executeSiegeAssaultAI === 'function') {
                executeSiegeAssaultAI(selectedUnits);
            }
        } else {
            selectedUnits.forEach(u => {
                u.hasOrders = true;
                u.orderType = "seek_engage"; 
                u.orderTargetPoint = null; 
            });
        }
    }, 1000);
}

function stopLazyGeneral() {
    if (activeLazyGeneralInterval) {
        clearInterval(activeLazyGeneralInterval);
        activeLazyGeneralInterval = null;
    }
}
// --- END LAZY GENERAL FEATURE ---

const COMMAND_GROUPS = {
    1: [ROLES.SHIELD, ROLES.PIKE, ROLES.INFANTRY, ROLES.TWO_HANDED, ROLES.THROWING], // Infantry & Skirmishers
    2: [ROLES.ARCHER, ROLES.CROSSBOW], // Ranged
    3: [ROLES.CAVALRY, ROLES.HORSE_ARCHER, ROLES.MOUNTED_GUNNER, ROLES.CAMEL, ROLES.ELEPHANT], // Cavalry & Beasts
    4: [ROLES.GUNNER, ROLES.FIRELANCE, ROLES.BOMB, ROLES.ROCKET] // Artillery/Gunpowder
};

// --- CORE INPUT LISTENER ---
document.addEventListener("keydown", (event) => {
    // 1. TOP-LEVEL SAFETY CHECK (Must come first to prevent crashes)
    if (!inBattleMode || !event || !battleEnvironment || !Array.isArray(battleEnvironment.units)) return;
    
    const key = (typeof event.key === "string") ? event.key.toLowerCase() : null;
    if (!key) return;

    // 2. REVISED CHAIN OF COMMAND CHECK
    // We look for the unit that is BOTH a commander and on the player's side
    const activeCommander = battleEnvironment.units.find(u => u.side === 'player' && (u.isCommander || u.disableAICombat));
    
    if (!activeCommander || activeCommander.hp <= 0) {
        console.log("Command failed: Player General is fallen or not found!");
        return; 
    }

    // 3. DEFINE SCOPES
    const playerUnits = battleEnvironment.units.filter(u => u.side === "player" && !u.isCommander && !u.disableAICombat && u.hp > 0);
    const commander = activeCommander; // Alias for use in formation math

    // =========================
    // 1-5: UNIT SELECTION
    // =========================
    if (["1", "2", "3", "4", "5"].includes(key)) {
        let groupNum = parseInt(key);
        
        if (currentSelectionGroup === groupNum) {
            currentSelectionGroup = null;
            playerUnits.forEach(u => {
                if (u.selected) {
                    u.selected = false;
                    if (u.hasOrders && u.orderType === "follow") {
                        u.orderType = "hold_position";
                        u.orderTargetPoint = {
                            x: commander.x + (u.formationOffsetX || 0),
                            y: commander.y + (u.formationOffsetY || 0)
                        };
                    }
                }
            });
            return;
        }
		currentSelectionGroup = groupNum;
        playerUnits.forEach(u => {
            let roleCat = getTacticalRole(u);
            let willBeSelected = false;
            
            if (groupNum === 5) willBeSelected = true;
            if (groupNum === 1 && ["INFANTRY", "SHIELD"].includes(roleCat)) willBeSelected = true;
            if (groupNum === 2 && roleCat === "RANGED") willBeSelected = true;
			if (groupNum === 3 && isMountedOrBeast(u)) willBeSelected = true;
            if (groupNum === 4 && roleCat === "GUNPOWDER") willBeSelected = true;

            // STRICT OVERRIDE: Check the central logic gate
            if (willBeSelected && !canSelectUnitNow(u)) {
                willBeSelected = false;
            }
            if (u.selected && !willBeSelected) {
                if (u.hasOrders && u.orderType === "follow") {
                    u.orderType = "hold_position";
                    u.orderTargetPoint = { x: commander.x + (u.formationOffsetX || 0), y: commander.y + (u.formationOffsetY || 0) };
                }
            }
            u.selected = willBeSelected;
        });
        return;
    }

    const selectedUnits = playerUnits.filter(u => u.selected);
    if (selectedUnits.length === 0) return;

    // =========================
    // Z, X, C, V, B: FORMATIONS 
    // =========================
    if (["z", "x", "c", "v", "b"].includes(key)) {
        
        stopLazyGeneral(); // Disable lazy spam if manual formation ordered
         
        if (selectedUnits.length <= 1) return;

        if (key === "z") currentFormationStyle = "tight";  
        if (key === "x") currentFormationStyle = "standard";  
        if (key === "c") currentFormationStyle = "line";   
        if (key === "v") currentFormationStyle = "circle"; 
        if (key === "b") currentFormationStyle = "square"; 
        
        // 1. Calculate the Centroid (Average position of the selected group)
        let sumX = 0, sumY = 0;
        selectedUnits.forEach(u => {
            sumX += u.x;
            sumY += u.y;
        });
        let centroid = { 
            x: sumX / selectedUnits.length, 
            y: sumY / selectedUnits.length 
        };

        // 2. Calculate offsets based on the group's centroid, not the commander
        calculateFormationOffsets(selectedUnits, currentFormationStyle, centroid);

        // 3. Command the group to form up "In Place" at their centroid
        selectedUnits.forEach(u => {
            u.hasOrders = true;
            u.orderType = "move_to_point"; // Override follow behavior
            
            let rawDestX = centroid.x + (u.formationOffsetX || 0);
            let rawDestY = centroid.y + (u.formationOffsetY || 0);
            
            u.orderTargetPoint = getSafeMapCoordinates(rawDestX, rawDestY);
            u.formationTimer = 240; // 4 seconds at 60fps for ranged units to focus on moving
        });
        return;
    }

    // =========================
    // Q, E, R, F: TACTICAL ORDERS
    // =========================
    switch (key) {

        case "f": // FOLLOW COMMANDER
            
        stopLazyGeneral(); // Disable lazy spam if manual formation ordered
    
            if (!commander) break;
            selectedUnits.forEach(u => {
                u.hasOrders = true;
                u.orderType = "follow";
                u.orderTargetPoint = null;
                u.formationTimer = 240; // 4 seconds before shooting focus
            });
            calculateFormationOffsets(selectedUnits, currentFormationStyle, commander);
            break;

        case "q": // SEEK & ENGAGE or SMART SIEGE ASSAULT

            if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle) {
                // Initialize the complex Siege Assault logic
                executeSiegeAssaultAI(selectedUnits);
            } else {
                // Standard Field Battle Charge
                selectedUnits.forEach(u => {
                    u.hasOrders = true;
                    u.orderType = "seek_engage"; 
                    u.orderTargetPoint = null;   
                    u.formationTimer = 120;      
                });
            }
            startLazyGeneral();//reactivate
            break;

        case "r": // RETREAT 
            
        stopLazyGeneral(); // Disable lazy spam if manual formation ordered
    
            selectedUnits.forEach(u => {
                u.hasOrders = true;
                u.orderType = "retreat";
                let stagger = (Math.random() * 20); 
                // Define the raw target
                let targetX = u.x;
                let targetY = BATTLE_WORLD_HEIGHT - 50 - stagger;

                // HOOK CLAMP HERE
                u.orderTargetPoint = getSafeMapCoordinates(targetX, targetY);
 
                u.formationTimer = 240;
            });
            break;

        case "e": // STOP / CANCEL ORDERS
            
        stopLazyGeneral(); // Disable lazy spam if manual formation ordered
    
            selectedUnits.forEach(u => {
                u.hasOrders = false;
                u.orderType = null;
                u.orderTargetPoint = null;
                u.target = null; // Instantly clears target so default AI handles engagement
                u.formationTimer = 0;
                if (u.originalRange) {
                    u.stats.range = u.originalRange;
                    u.originalRange = null;
                }
            });
            break;
    }
});
function getTacticalRole(unit) {
    if (!unit) return "INFANTRY";
    
    // 1. Setup the identifiers
    let r = unit.stats && unit.stats.role ? String(unit.stats.role).toUpperCase() : "";
    let textCheck = String((unit.stats?.name || "") + " " + (unit.unitType || "") + " " + (unit.stats?.role || "")).toLowerCase();
    
    // 2. CAVALRY & BEASTS (The "Never Siege" Group)
    // We check for keywords like 'lancer', 'eleph', and 'keshig' here.
    if (["CAVALRY", "HORSE_ARCHER", "MOUNTED_GUNNER", "CAMEL", "ELEPHANT"].includes(r) || 
        unit.stats?.isLarge || 
        textCheck.match(/(cav|horse|mount|camel|lancer|eleph|keshig)/)) {
        return "CAVALRY";
    }

    // 3. GUNPOWDER
    if (["BOMB", "ROCKET", "FIRELANCE", "GUNNER"].includes(r) || textCheck.match(/(bomb|rocket|fire|cannon|gun)/)) {
        return "GUNPOWDER";
    }

    // 4. RANGED
    if (["ARCHER", "CROSSBOW", "THROWING"].includes(r) || textCheck.match(/(archer|bow|crossbow|sling|javelin)/)) {
        return "RANGED";
    }

    // 5. SHIELD
    if (r === "SHIELD" || textCheck.match(/(shield)/)) {
        return "SHIELD";
    }
    
    return "INFANTRY"; // Default for everyone else
}
function processTacticalOrders() {
    if (!inBattleMode || !battleEnvironment.units) return;
    
    const commander = battleEnvironment.units.find(u => u.isCommander && u.side === 'player');

    battleEnvironment.units.forEach(unit => {
        // SURGERY 1: Protect specialized AI crews from having their targets wiped by formation logic
        if (unit.side !== "player" || unit.isCommander || unit.disableAICombat || unit.hp <= 0) return;

        // Decrement formation timer
        if (unit.formationTimer > 0) unit.formationTimer--;

        let nearestDist = Infinity;
        let nearestEnemy = null;
        
        battleEnvironment.units.forEach(other => {
            if (other.side !== unit.side && other.hp > 0 && !other.isDummy) {
                let dist = Math.hypot(unit.x - other.x, unit.y - other.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestEnemy = other;
                }
            }
        });

        if (!nearestEnemy && !unit.hasOrders) {
            unit.target = null;
            return;
        }

        const tacticalRole = getTacticalRole(unit);
        const isRanged = (tacticalRole === "RANGED" || tacticalRole === "GUNPOWDER");
        let emergencyThreshold = 100; 

// Removed move_to_point and siege_assault from the absolute strict list
        const isStrictCommand = unit.hasOrders && ["retreat", "follow"].includes(unit.orderType);

        // ====================================================================
        // SURVIVAL OVERRIDE: 100px Emergency Self-Defense
        // ====================================================================
        if (nearestDist < emergencyThreshold && nearestEnemy && !isStrictCommand && !unit.disableAICombat) {
            if (unit.originalRange) {
                unit.stats.range = unit.originalRange;
                unit.originalRange = null;
            }
            
            unit.reactionDelay = 0; 
            unit.formationTimer = 0; 
            unit.target = nearestEnemy;
            return; // Halts waypoint logic so they fight immediately
        }

        // ====================================================================
        // STAGGERED REACTION DELAY
        // ====================================================================
        if (unit.reactionDelay > 0) {
            unit.reactionDelay--;
            return; 
        }

        // 2. EXECUTE ORDERS
        if (unit.hasOrders) {
            
            // ==========================
            // SEEK & ENGAGE (The only order where they are allowed to be distracted)
            // ==========================
            if (unit.orderType === "seek_engage") {
                if (nearestEnemy) {
                    unit.target = nearestEnemy;
                    if (unit.stats.morale > 5) {
                        let dx = nearestEnemy.x - unit.x;
                        let dy = nearestEnemy.y - unit.y;
                        let dist = Math.hypot(dx, dy);

                        if (dist > unit.stats.range * 0.9) {
                            unit.target = nearestEnemy;
                        }
                    }
                }
                return; 
            }
            
          // ==========================
            // SMART SIEGE ASSAULT LOGIC
            // ==========================
            if (unit.orderType === "siege_assault") {
                let wallBoundaryY = (typeof CITY_LOGICAL_HEIGHT !== 'undefined' ? CITY_LOGICAL_HEIGHT : 3200) - 40;
                let southGate = typeof overheadCityGates !== 'undefined' ? overheadCityGates.find(g => g.side === "south") : null;
                
                // Ensure we catch the global breach flag too
                let gateBreached = window.__SIEGE_GATE_BREACHED__ || (southGate && (southGate.gateHP <= 0 || southGate.isOpen));
                
				// --- SURGERY: Ensure the background AI NEVER touches the Ladder Fanatics ---
                if (gateBreached && unit.siegeRole !== "assault_complete" && unit.siegeRole !== "ladder_fanatic") {
                    unit.siegeRole = "assault_complete";
                    // SURGERY: Force them to immediately charge into the city to bypass the broken gate
                    let plazaX = typeof SiegeTopography !== 'undefined' ? SiegeTopography.gatePixelX : 1200;
                    let plazaY = typeof SiegeTopography !== 'undefined' ? SiegeTopography.plazaPixelY : 800;
                    unit.target = { 
                        x: plazaX + (Math.random() - 0.5) * 200, 
                        y: plazaY + (Math.random() - 0.5) * 200, 
                        isDummy: true, 
                        priority: "plaza" 
                    };
                    unit.orderTargetPoint = null; 
                }

                if (gateBreached || unit.y < wallBoundaryY || unit.onWall) {
                    const unitRole = unit.stats.role;
                    const isRangedAssault = (
                        unitRole === "archer" || 
                        unitRole === "horse_archer" || 
                        unitRole === "crossbow" || 
                        unitRole === "gunner" || 
                        unitRole === "mounted_gunner" || 
                        unitRole === "Rocket" || 
                        unitRole === "bomb" || 
                        unitRole === "throwing" || 
                        unitRole === "firelance"
                    );

                    if (isRangedAssault) {
                        unit.stats.range = 10; 
                        unit.stats.currentStance = "statusmelee"; 
                        unit.forceMelee = true; 
                    }

                    if (nearestEnemy) {
                        unit.target = nearestEnemy;
                        if (unit.siegeRole === "cavalry_reserve" && unit.y > wallBoundaryY && southGate) {
                            unit.target = { x: southGate.x * BATTLE_TILE_SIZE, y: southGate.y * BATTLE_TILE_SIZE - 50, isDummy: true };
                        }
                    }
                    return; 
                }

                let destX = unit.x;
                let destY = unit.y;

                switch (unit.siegeRole) {
                    case "ram_pusher":
                        if (unit.siegeTarget && unit.siegeTarget.hp > 0) {
                            destX = unit.siegeTarget.x + (Math.random() - 0.5) * 15;
                            let queueOffset = unit.queuePos > 6 ? (unit.queuePos * 4) : 0; 
                            destY = unit.siegeTarget.y + 15 + queueOffset;
                        } else {
                            unit.siegeRole = "infantry_reserve"; 
                        }
                        break;

                   case "ladder_carrier":
                        if (unit.siegeTarget && unit.siegeTarget.hp > 0) {
                            if (!unit.siegeTarget.isDeployed) {
                                // SURGERY: Total swarm logic. No queues, no orderly lines.
                                destX = unit.siegeTarget.x + (Math.random() - 0.5) * 60;
                                destY = unit.siegeTarget.y + (Math.random() - 0.5) * 50;
                            } else {
                                destX = unit.siegeTarget.x;
                                destY = unit.siegeTarget.y - 10;
                            }
                        } else {
                            unit.siegeRole = "infantry_reserve";
                        }
                        break;
						
                    case "trebuchet_crew":
                        if (unit.siegeTarget && unit.siegeTarget.hp > 0) {
                            destX = unit.siegeTarget.x + (Math.random() - 0.5) * 25;
                            destY = unit.siegeTarget.y + 20 + (Math.random() * 10)+80;
                        } else {
                            unit.siegeRole = "ranged_support";
                        }
                        break;

					case "ranged_support":
                        let isShortRange = String((unit.stats?.role || "") + " " + (unit.unitType || "")).toLowerCase().match(/(firelance|bomb|hand cannon)/);
                        
                        // Let short-range support keep their pushed-up target from siegebattle.js
                        if (isShortRange && unit.target && unit.target.isDummy && unit.target.y < wallBoundaryY + 150) {
                            destX = unit.target.x;
                            destY = unit.target.y;
                        } else {
                            destX = unit.x; 
                            let frontLineY = siegeEquipment.rams[0] ? siegeEquipment.rams[0].y : wallBoundaryY + 300;
                            destY = Math.max(frontLineY + 120, wallBoundaryY + 150);
                        }
                        
                        if (nearestEnemy && nearestEnemy.onWall) {
                            let dist = Math.hypot(unit.x - nearestEnemy.x, unit.y - nearestEnemy.y);
                            if (dist < unit.stats.range * 0.9) {
                                unit.target = nearestEnemy;
                                unit.orderTargetPoint = { x: unit.x, y: unit.y }; 
                                return;
                            }
                        } else if (nearestEnemy && Math.hypot(unit.x - nearestEnemy.x, unit.y - nearestEnemy.y) < unit.stats.range) {
                            unit.target = nearestEnemy;
                            return;
                        }
                        break;

						case "infantry_reserve":
                        // If siegebattle.js pushed them forward to funnel, respect it!
                        if (unit.target && unit.target.isDummy && unit.target.y < wallBoundaryY + 200) {
                            destX = unit.target.x;
                            destY = unit.target.y;
                        } else {
                            destX = unit.x;
                            destY = wallBoundaryY + 200; 
                        }
                        break;

					case "cavalry_reserve":
                        let destX2 = unit.x;
                        // FIX: Ensure they are staging behind the camp, not just the wall boundary
                        let safeCampY = typeof SiegeTopography !== 'undefined' ? SiegeTopography.campPixelY : wallBoundaryY + 300;
                        let destY2 = safeCampY + 500;

                        // Check if already at destination
                        if (Math.hypot(unit.x - destX2, unit.y - destY2) < 5) {
                            unit.hasOrders = false;       
                            unit.orderType = null;        
                            unit.target = null;           
                            unit.state = "idle";          
                        }
                        break;
				}
                unit.target = { 
                    x: destX, 
                    y: destY, 
                    hp: 100, 
                    isDummy: true,
                    side: unit.side, 
                    stats: { meleeDefense: 0, armor: 0, health: 100 } 
                };
                
                return; 
            }

            // ==========================
            // STANDARD / FIELD MOVEMENT
            // ==========================
            let rawDestX = unit.x;
            let rawDestY = unit.y;

            if (unit.orderType === "follow" && commander) {
                rawDestX = commander.x + (unit.formationOffsetX || 0);
                rawDestY = commander.y + (unit.formationOffsetY || 0);
            } else if (unit.orderTargetPoint) {
                rawDestX = unit.orderTargetPoint.x;
                rawDestY = unit.orderTargetPoint.y;
            }

            let safeDest = getSafeMapCoordinates(rawDestX, rawDestY);
            let destX3 = safeDest.x;
            let destY3 = safeDest.y;

            let distToDest = Math.hypot(unit.x - destX3, unit.y - destY3);
            let shouldFocusOnShooting = false;
            
            if (distToDest > 20) {
                if (isRanged && unit.formationTimer <= 0) {
                    if (unit.originalRange) {
                        unit.stats.range = unit.originalRange;
                        unit.originalRange = null;
                    }
                    if (nearestEnemy) {
                        let distToEnemy = Math.hypot(unit.x - nearestEnemy.x, unit.y - nearestEnemy.y);
                        if (distToEnemy <= unit.stats.range) {
                            unit.target = nearestEnemy;
                            shouldFocusOnShooting = true; 
                        }
                    }
                }

                if (!shouldFocusOnShooting) {
                    if (!unit.originalRange && unit.stats.range > 20) {
                        unit.originalRange = unit.stats.range;
                    }
                    unit.stats.range = 10; 
                }
            } else {
                if (unit.originalRange) {
                    unit.stats.range = unit.originalRange;
                    unit.originalRange = null; 
                }
            }

            if (!shouldFocusOnShooting) {
                unit.target = { 
                    x: destX3, 
                    y: destY3, 
                    hp: 100, 
                    isDummy: true,
                    side: unit.side, 
                    stats: { meleeDefense: 0, armor: 0, health: 100, experienceLevel: 0, currentStance: "statusmelee" } 
                };
                unit.stats.currentStance = "statusmelee"; 
            }
            
        } else {
            if (unit.originalRange) {
                unit.stats.range = unit.originalRange;
                unit.originalRange = null;
            }
        }
    });
}
// ============================================================================
// SIEGE ASSAULT COMMAND ENGINE (REVISED & FIXED)
// ============================================================================

function isSiegeGateBreached() {

    // If not a siege, always allow
    if (typeof inSiegeBattle === "undefined" || !inSiegeBattle) {
        return true;
    }

    let southGate =
        typeof overheadCityGates !== "undefined"
            ? overheadCityGates.find(g => g.side === "south")
            : null;

    return (
        window.__SIEGE_GATE_BREACHED__ === true ||
        (southGate && (southGate.isOpen || southGate.gateHP <= 0))
    );
}

function isMountedOrBeast(unit) {
    if (!unit || !unit.stats) return false;
    if (unit.isCommander) return false; // Commander is exempt from "mounted" restrictions
    
    const role = (unit.stats.role || "").toLowerCase();
    const type = (unit.unitType || "").toLowerCase();
    const combined = `${role} ${type}`;
    
    // Check for "Large" flag or specific unit keywords
    return unit.stats.isLarge || 
           combined.match(/(cav|horse|lancer|mount|camel|eleph|beast|keshig|cataphract|zamburak)/);
}

function canSelectUnitNow(unit) {
    if (!unit || unit.hp <= 0) return false;
    if (unit.isCommander) return true;

    if (typeof inSiegeBattle !== "undefined" && inSiegeBattle) {
        // 🚫 Block all mounted/beast types until gate opens
        if (isMountedOrBeast(unit) && !isSiegeGateBreached()) {
            return false;
        }
    }
    return true;
}

function executeSiegeAssaultAI(units) {
    if (!siegeEquipment) return;
    const gateBreached = window.__SIEGE_GATE_BREACHED__;

    // --- FIX 1: Initialize ALL required arrays and variables ---
    let meleeInfantry = [];
    let gunpowder = [];
    let archers = [];
    let cavalry = [];
    let artilleryCrews = []; 
    
    let trebCount = (siegeEquipment.trebuchets) ? siegeEquipment.trebuchets.length : 0;

    // 1. Categorize Troops (REVISED)
    units.forEach(u => {
        let role = getTacticalRole(u);
        let textCheck = String((u.stats?.name || "") + " " + (u.unitType || "") + " " + (u.stats?.role || "")).toLowerCase();
        
        // PRIORITY 1: Identify Artillery Crews first so they aren't drafted as infantry
        if (u.siegeRole === "treb_crew" || u.siegeRole === "trebuchet_crew" || textCheck.includes("crew")) {
            artilleryCrews.push(u);
            return;
        }

        // PRIORITY 2: Is it a beast/horse? Sort them to Cavalry immediately.
        if (role === "CAVALRY" || u.stats?.isLarge || textCheck.match(/(cav|horse|mount|camel|lancer|eleph|keshig)/)) {
            cavalry.push(u);
            
            // If gate isn't broken, make them stay put unless ordered
            if (!gateBreached && !u.hasOrders) {
                u.state = "idle";
                u.target = null;
            }
            return; 
        } 
// PRIORITY 3: Sort remaining humans
        let isSpecialist = textCheck.match(/(firelance|bomb|javelin|repeater)/);

        if (role === "GUNPOWDER" && !isSpecialist) {
            gunpowder.push(u);
        } else if (role === "RANGED" && !isSpecialist) {
            archers.push(u);
        } else {
            meleeInfantry.push(u); // Specialists go to the meatgrinder!
        }
    });

    // 2. MEATGRINDER DRAFT: Only pull from ranged if melee is critical (< 20)
    if (meleeInfantry.length < 20) {
        let neededTroops = 60 - meleeInfantry.length;
        // Splice from archers first, then gunpowder
        let draftedArchers = archers.splice(0, neededTroops);
        let draftedGunners = gunpowder.splice(0, Math.max(0, neededTroops - draftedArchers.length));
        
        meleeInfantry.push(...draftedArchers, ...draftedGunners);
    }

    // 3. Assign Orders
    let ramIndex = 0;
    let ladderIndex = 0;

    // Distribute Melee Infantry to Rams & Ladders
    meleeInfantry.forEach((u, index) => {
        u.hasOrders = true;
        u.orderType = "siege_assault";
        u.siegeRole = "infantry_reserve";
        
        if (siegeEquipment.rams.length > 0 && index < 25) { 
            u.siegeRole = "ram_pusher";
            u.siegeTarget = siegeEquipment.rams[ramIndex % siegeEquipment.rams.length];
            u.queuePos = index; 
            ramIndex++;
        } 
        else if (siegeEquipment.ladders.length > 0 && index >= 25 && index < 60) {
            u.siegeRole = "ladder_carrier";
            u.siegeTarget = siegeEquipment.ladders[ladderIndex % siegeEquipment.ladders.length];
            u.queuePos = index - 25;
            ladderIndex++;
        }
    });

    // --- FIX 2: Assign Artillery Crews (Safely uses trebCount) ---
    if (trebCount > 0) {
        artilleryCrews.forEach((u, index) => {
            u.hasOrders = true;
            u.orderType = "siege_assault";
            u.siegeRole = "trebuchet_crew";
            u.siegeTarget = siegeEquipment.trebuchets[index % trebCount];
        });
    }

    // Distribute remaining Ranged as Support
    [...gunpowder, ...archers].forEach(u => {
        u.hasOrders = true;
        u.orderType = "siege_assault";
        u.siegeRole = "ranged_support";
    });

// Distribute Cavalry (Rear Guard)
    let southGate = typeof overheadCityGates !== 'undefined' ? overheadCityGates.find(g => g.side === "south") : null;
    let campY = typeof SiegeTopography !== 'undefined' ? SiegeTopography.campPixelY : (BATTLE_WORLD_HEIGHT - 500); // <-- ADD THIS
    cavalry.forEach(u => {
        u.hasOrders = true;
        u.orderType = "siege_assault";
        u.siegeRole = "cavalry_reserve";
        if (southGate) {
            // FIX: Point them 500px behind the camp, not the wall
            u.orderTargetPoint = { x: southGate.x * BATTLE_TILE_SIZE, y: campY + 500 }; 
        }
    });

    if (typeof AudioManager !== 'undefined') AudioManager.playSound('charge');
}
// ============================================================================
// RTS MOUSE CONTROLS (SELECTION & MOVEMENT) - FIXED VERSION
// ============================================================================

let isBoxSelecting = false;
let selectionBoxStart = { x: 0, y: 0 };
let selectionBoxCurrent = { x: 0, y: 0 };
let lastClickTime = 0;
let lastClickedUnitType = null;

// --- BULLETPROOF COORDINATE MAPPER ---
function getBattleMousePos(e) {
    // 1. HARD TARGET THE CANVAS
    const canvas = document.querySelector('canvas'); 
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    // 2. Base screen-to-canvas ratio (Raw Mouse Pixels)
    let rawX = (e.clientX - rect.left) * (canvas.width / rect.width);
    let rawY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 3. REVERSE-ENGINEER THE INDEX.HTML CAMERA MATH
    // In index.html you do: center canvas -> scale by zoom -> move to -player position
    // Here, we do the exact opposite to turn a mouse click back into world coordinates:
    
    // Fallback variables just in case the globals haven't loaded
    let currentZoom = typeof zoom !== 'undefined' ? zoom : 1;
    let camX = typeof player !== 'undefined' ? player.x : 0;
    let camY = typeof player !== 'undefined' ? player.y : 0;

    let worldX = ((rawX - (canvas.width / 2)) / currentZoom) + camX;
    let worldY = ((rawY - (canvas.height / 2)) / currentZoom) + camY;

    return { x: worldX, y: worldY };
}

function isCommanderAlive() {
    return battleEnvironment.units.some(u => u.isCommander && u.hp > 0);
}

// --- MOUSE DOWN (Start Box Select) ---
document.addEventListener('mousedown', (e) => {
    if (!inBattleMode || !battleEnvironment) return;
    // CRITICAL: Ignore clicks if they clicked a UI element instead of the game
    if (e.target.tagName !== 'CANVAS') return; 
    if (!isCommanderAlive()) return;

    if (e.button === 0) { 
        isBoxSelecting = true;
        selectionBoxStart = getBattleMousePos(e);
        selectionBoxCurrent = { x: selectionBoxStart.x, y: selectionBoxStart.y };
    }
});

// --- MOUSE MOVE (Update Box Select) ---
document.addEventListener('mousemove', (e) => {
    if (!inBattleMode || !isBoxSelecting) return;
    selectionBoxCurrent = getBattleMousePos(e);
});

// --- MOUSE UP (Process Box Select & Clicks) ---
document.addEventListener('mouseup', (e) => {
    if (!inBattleMode || !battleEnvironment || !isBoxSelecting) {
        isBoxSelecting = false;
        return;
    }
    
    isBoxSelecting = false;
    if (!isCommanderAlive()) return;

    const pos = getBattleMousePos(e);
    const playerUnits = battleEnvironment.units.filter(u => u.side === "player" && !u.isCommander && u.hp > 0);
    
    const dx = pos.x - selectionBoxStart.x;
    const dy = pos.y - selectionBoxStart.y;
    const dragDistance = Math.hypot(dx, dy);

    // BOX SELECT
    if (dragDistance > 10) { // Increased deadzone slightly to prevent accidental box clicks
        const minX = Math.min(selectionBoxStart.x, pos.x);
        const maxX = Math.max(selectionBoxStart.x, pos.x);
        const minY = Math.min(selectionBoxStart.y, pos.y);
        const maxY = Math.max(selectionBoxStart.y, pos.y);

        playerUnits.forEach(u => {
u.selected = (u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY && canSelectUnitNow(u));
        });
        
        currentSelectionGroup = null; 
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('ui_click');
    } 
    // SINGLE / DOUBLE CLICK
    else {
        let clickedUnit = null;
        let closestDist = Infinity;
        
playerUnits.forEach(u => {
    if (!canSelectUnitNow(u)) return;

    let hitbox = (u.stats.radius || 10) + 20;
    let d = Math.hypot(u.x - pos.x, u.y - pos.y);
    if (d < hitbox && d < closestDist) {
        closestDist = d;
        clickedUnit = u;
    }
});
        const now = Date.now();
        const isDoubleClick = (now - lastClickTime < 350) && clickedUnit && (lastClickedUnitType === clickedUnit.unitType);

        if (clickedUnit) {
            if (isDoubleClick) {
                playerUnits.forEach(u => u.selected = (u.unitType === clickedUnit.unitType));
            } else {
                playerUnits.forEach(u => u.selected = false);
                clickedUnit.selected = true;
            }
            lastClickedUnitType = clickedUnit.unitType;
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('ui_click');
        } else {
            // Clicked empty dirt -> Deselect all
            playerUnits.forEach(u => u.selected = false);
        }
        
        currentSelectionGroup = null;
        lastClickTime = now;
    }
});

// --- RIGHT CLICK (Move Command) ---
document.addEventListener('contextmenu', (e) => {
    if (!inBattleMode || !battleEnvironment) return;
    if (e.target.tagName === 'CANVAS') e.preventDefault(); // Only prevent default if clicking the game

    if (!isCommanderAlive()) return;

    stopLazyGeneral(); // Disable lazy spam on manual move

    const playerUnits = battleEnvironment.units.filter(u => u.selected && u.hp > 0);
    if (playerUnits.length === 0) return;

    const targetPos = getBattleMousePos(e);

    // Skip formation geometry if only 1 unit is moving
    if (playerUnits.length === 1) {
        let u = playerUnits[0];
        u.hasOrders = true;
        u.orderType = "move_to_point";
        u.orderTargetPoint = getSafeMapCoordinates(targetPos.x, targetPos.y);
        u.formationTimer = 200;
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('ui_click'); 
        return;
    }

    // Calculate formation shape centered around the DESTINATION point
    calculateFormationOffsets(playerUnits, currentFormationStyle, targetPos);

    playerUnits.forEach(u => {
        u.hasOrders = true;
        u.orderType = "move_to_point";
        
        let offX = u.formationOffsetX || 0;
        let offY = u.formationOffsetY || 0;

        let rawDestX = targetPos.x + offX;
        let rawDestY = targetPos.y + offY;
        u.orderTargetPoint = getSafeMapCoordinates(rawDestX, rawDestY);
        
        u.formationTimer = 200; 
    });

    if (typeof AudioManager !== 'undefined') AudioManager.playSound('ui_click'); 
});

// ============================================================================
// UNIVERSAL MAP BOUNDARY CLAMP ENGINE (THE RED LINE)
// ============================================================================
function getSafeMapCoordinates(targetX, targetY, margin = 50) {
    // Fallbacks in case city variables or normal variables are missing
    const maxWidth = typeof BATTLE_WORLD_WIDTH !== 'undefined' ? BATTLE_WORLD_WIDTH : 2400;
    const maxHeight = typeof BATTLE_WORLD_HEIGHT !== 'undefined' ? BATTLE_WORLD_HEIGHT : 1600;

    let safeX = targetX;
    let safeY = targetY;

    // Clamp X (Prevents walking past the Left and Right Red Lines)
    if (safeX < margin) safeX = margin;
    if (safeX > maxWidth - margin) safeX = maxWidth - margin;

    // Clamp Y (Prevents walking past the Top and Bottom Red Lines)
    if (safeY < margin) safeY = margin;
    if (safeY > maxHeight - margin) safeY = maxHeight - margin;

    return { x: safeX, y: safeY };
}

// --- FORMATION MATH (CENTROID & ROTATION ENGINE) ---
function calculateFormationOffsets(units, style, centerPoint) {
    if (!units || units.length === 0) return;

    // 1. Establish Map Dimensions & Center Data
    const mapWidth = typeof BATTLE_WORLD_WIDTH !== 'undefined' ? BATTLE_WORLD_WIDTH : 2400;
    const cp = centerPoint || { x: mapWidth / 2, y: (typeof BATTLE_WORLD_HEIGHT !== 'undefined' ? BATTLE_WORLD_HEIGHT : 1600) / 2 };

    // 2. Progressive Angular Offset Logic (Lines become diagonal near map edges)
 
    let distFromCenterX = cp.x - (mapWidth / 2);
    let normalizedDist = distFromCenterX / (mapWidth / 2); // Ranges from -1 (Left) to 1 (Right)

    // 1. FLIP THE ANGLE (Negative sign ensures Left = \ and Right = /)
    // 2. FLAT CENTER (Cubing the distance keeps the center 80% perfectly flat, only curving at extreme edges)
    let mapAngle = -(Math.pow(normalizedDist, 3)) * 1.13; 

    // Disable diagonal rotation entirely for geometric shapes
    if (style === "square" || style === "circle") {
        mapAngle = 0;
    }

    // Helper: Rotates coordinates around a 0,0 center based on the map angle
    const applyRotation = (x, y) => {
        if (mapAngle === 0) return { x: x, y: y }; // Bypass math entirely for flat lines & squares
        return {
            x: x * Math.cos(mapAngle) - y * Math.sin(mapAngle),
            y: x * Math.sin(mapAngle) + y * Math.cos(mapAngle)
        };
    };

    // 3. Sort Units into Tactical Groups
    let shields = [], infantry = [], ranged = [], gunpowder = [], cavalry = [], largeUnits = [];

    units.forEach(u => {
        let role = getTacticalRole(u);
        let isLarge = u.stats && u.stats.isLarge; 
        
        // Group large mounts and beasts for specialized concentric rings
        if (role === "CAVALRY" || isLarge) largeUnits.push(u); 

        if (role === "CAVALRY") cavalry.push(u);
        else if (role === "GUNPOWDER") gunpowder.push(u);
        else if (role === "RANGED") ranged.push(u);
        else if (role === "SHIELD") shields.push(u);
        else infantry.push(u);
    });

    // --- FORMATION GENERATORS ---
    const assignBlock = (group, startY, spacingX, spacingY, maxCols) => {
        let rows = Math.ceil(group.length / maxCols);
        group.forEach((u, i) => {
            let r = Math.floor(i / maxCols);
            let c = i % maxCols;
            
            // Auto-center the row mathematically based on unit count
            let unitsInThisRow = Math.min(group.length - (r * maxCols), maxCols);
            let rawX = (c - (unitsInThisRow - 1) / 2) * spacingX;
            let rawY = startY + (r * spacingY);
            
            rawX += (Math.random() - 0.5) * 5; // Human Jitter
            rawY += (Math.random() - 0.5) * 5;

            // Apply angular diagonal rotation
            let rotated = applyRotation(rawX, rawY);
            u.formationOffsetX = rotated.x;
            u.formationOffsetY = rotated.y;
        });
    };

    const assignRing = (group, radius) => {
        group.forEach((u, i) => {
            // Pure geometric circle math - ignores mapWidth/mapAngle entirely
            let angle = (i / group.length) * Math.PI * 2;
            u.formationOffsetX = Math.cos(angle) * radius + (Math.random() - 0.5) * 5;
            u.formationOffsetY = Math.sin(angle) * radius + (Math.random() - 0.5) * 5;
            
            // Logic check: Since it's a circle, we don't apply the 'mapAngle' rotation here.
            // This ensures the "North" of the circle is always the "North" of the map.
        });
    };
    // --- GEOMETRY STYLES ---
    switch (style) {
        case "tight": 
            assignBlock(shields, -40, 16, 16, 30); 
            assignBlock(infantry, -20, 16, 16, 30);
            assignBlock(ranged, 0, 16, 16, 30);
            assignBlock(gunpowder, 20, 18, 16, 15); 
            assignBlock(cavalry, 60, 20, 20, 40);                  
            break;

        case "standard":
            assignBlock([...shields, ...infantry], -30, 40, 30, 20);
            assignBlock(ranged, -60, 40, 30, 20);
            assignBlock(gunpowder, 0, 40, 30, 15);
            assignBlock(cavalry, 40, 50, 40, 10); 
            break;

        case "line":
            let lineGroup = [...shields, ...infantry, ...ranged, ...gunpowder, ...cavalry];
            assignBlock(lineGroup, 0, 35, 30, 40); // Base line wraps gracefully at 40 width
            break;
            
        case "circle":
            let nonLarge = [...shields, ...infantry, ...ranged, ...gunpowder];
            
            if (units.length <= 12) {
                // Skirmish mode: Beasts in the middle, small guard ring around them
                largeUnits.forEach(u => {
                    u.formationOffsetX = (Math.random() - 0.5) * 15;
                    u.formationOffsetY = (Math.random() - 0.5) * 15;
                });
                assignRing(nonLarge, Math.max(50, units.length * 8));
            } else {
                // Army mode: Dynamic scaling rings
                let innerRadius = Math.max(60, nonLarge.length * 3.5);
                assignRing(nonLarge, innerRadius);
                
                if (largeUnits.length > 0) {
                    let outerRadius = innerRadius + 60 + (largeUnits.length * 1.5);
                    assignRing(largeUnits, outerRadius);
                }
            }
            break;
            
        case "square":
            let squarePool = [...cavalry, ...shields, ...infantry, ...gunpowder, ...ranged];
            let sqCols = Math.ceil(Math.sqrt(squarePool.length));
            
            // Dynamically tighten the grid based on how many units are in the box
            let sqSpacing = Math.max(20, 40 - (squarePool.length * 0.1)); 
            let gridPoints = [];
            
            let half = (sqCols - 1) / 2;
            for (let r = 0; r < sqCols; r++) {
                for (let c = 0; c < sqCols; c++) {
                    let rawX = (c - half) * sqSpacing;
                    let rawY = (r - half) * sqSpacing;
                    
                    // Standard upright grid coordinates, ignoring all diagonal tilt math
                    gridPoints.push({ x: rawX, y: rawY });
                }
            }
            
            gridPoints.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
            
            squarePool.forEach((u, i) => {
                let pt = gridPoints[i];
                if (pt) {
                    u.formationOffsetX = pt.x + (Math.random() - 0.5) * 5;
                    u.formationOffsetY = pt.y + (Math.random() - 0.5) * 5;
                }
            });
            break;
    }
}

// ============================================================================
// SURGERY: THE LAZY FORMATION ADJUSTMENT LOOP (Callable Function)
// ============================================================================
function applyFormationAdjustment() {
    // 1. Safety Checks
    if (typeof inBattleMode === 'undefined' || !inBattleMode || !battleEnvironment || !battleEnvironment.units) return;

    // 2. Filter units that are currently ALIVE, HOLDING A POSITION, and belong to the correct side.
    let adjustingUnits = battleEnvironment.units.filter(u =>
        u.hasOrders &&
        u.orderType === "move_to_point" &&
        u.orderTargetPoint &&
        u.hp > 0 &&
        (
            // --- PLAYER CONDITION ---
            (u.side === "player" && u.selected) 
            
            // --- ENEMY AI CONDITION (Commented out for later) ---
            // || (u.side === "enemy" && typeof u.aiSquadState !== 'undefined' && u.aiSquadState === "holding_formation")
        )
    );

    if (adjustingUnits.length <= 1) return; // Need at least 2 units to adjust a formation

    // 3. Check for nearby enemies (Interrupt adjustment if being attacked)
    let inDanger = false;
    let emergencyThreshold = 150; // Slightly larger than standard 100px survival override
    
    for (let u of adjustingUnits) {
        let nearestDist = Infinity;
        battleEnvironment.units.forEach(other => {
            if (other.side !== u.side && other.hp > 0 && !other.isDummy) {
                let dist = Math.hypot(u.x - other.x, u.y - other.y);
                if (dist < nearestDist) nearestDist = dist;
            }
        });
        if (nearestDist < emergencyThreshold) {
            inDanger = true;
            break; // Stop checking, the group is under threat
        }
    }

    // Abort adjustment; the survival override in processTacticalOrders will handle combat
    if (inDanger) return; 

    // 4. Determine the current Target Centroid of the group
    let sumX = 0, sumY = 0;
    adjustingUnits.forEach(u => {
        sumX += u.orderTargetPoint.x;
        sumY += u.orderTargetPoint.y;
    });
    let currentCentroid = { 
        x: sumX / adjustingUnits.length, 
        y: sumY / adjustingUnits.length 
    };

    // 5. Recalculate pure offsets to clean up any messy lines over time
    if (typeof currentFormationStyle !== 'undefined') {
        calculateFormationOffsets(adjustingUnits, currentFormationStyle, currentCentroid);
    }

    // 6. BOUNDARY SHIFT: Calculate the bounding box of the IDEAL formation
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    adjustingUnits.forEach(u => {
        let idealX = currentCentroid.x + (u.formationOffsetX || 0);
        let idealY = currentCentroid.y + (u.formationOffsetY || 0);
        
        if (idealX < minX) minX = idealX;
        if (idealX > maxX) maxX = idealX;
        if (idealY < minY) minY = idealY;
        if (idealY > maxY) maxY = idealY;
    });

    // 7. Calculate required shifts to keep the WHOLE formation out of the red lines
    const maxWidth = typeof BATTLE_WORLD_WIDTH !== 'undefined' ? BATTLE_WORLD_WIDTH : 2400;
    const maxHeight = typeof BATTLE_WORLD_HEIGHT !== 'undefined' ? BATTLE_WORLD_HEIGHT : 1600;
    const margin = 60; // Keep slightly away from the exact edge

    let shiftX = 0;
    let shiftY = 0;

    // If the left edge of the circle is off-map, push the whole centroid right, etc.
    if (minX < margin) shiftX = margin - minX; 
    if (maxX > maxWidth - margin) shiftX = (maxWidth - margin) - maxX; 
    if (minY < margin) shiftY = margin - minY; 
    if (maxY > maxHeight - margin) shiftY = (maxHeight - margin) - maxY; 

    // 8. Apply the shift to the Centroid
    if (shiftX !== 0 || shiftY !== 0) {
        currentCentroid.x += shiftX;
        currentCentroid.y += shiftY;
    }

// 9. Quietly update their target points
    adjustingUnits.forEach(u => {
        // --- SURGERY: PROTECT LADDER FANATICS FROM MOVEMENT COMMANDS ---
        if (u.siegeRole === "ladder_fanatic") return; // They ignore commands to keep swarming
        
        // --- SURGERY: ALLOW SNIPERS TO MOVE, BUT DON'T BREAK THEIR FIRING STANCE ---
        if (u.siegeRole === "counter_battery" && u.orderType === "attack") {
            // Keep their attack order active even if they are repositioning
        } else {
             u.orderType = "move";
        }

        let rawDestX = currentCentroid.x + (u.formationOffsetX || 0);
        let rawDestY = currentCentroid.y + (u.formationOffsetY || 0);
        
        if (typeof getSafeMapCoordinates === 'function') {
            u.orderTargetPoint = getSafeMapCoordinates(rawDestX, rawDestY);
        } else {
            u.orderTargetPoint = {x: rawDestX, y: rawDestY};
        }
    });
}

function isRangedType(unit) {
    if (!unit || !unit.stats) return false;
    const r = unit.stats.role;
   // SURGERY: Remove Firelances, Bombs, and Javelins from the "Ranged Stand-by" list
// This prevents them from clumping in the back line.
return ["archer", "horse_archer", "crossbow", "gunner", "mounted_gunner", "Rocket"].includes(r);
}

// ============================================================================
// --- SURGERY 4: SIEGE EQUIPMENT HELPER ---
// ============================================================================
function canUseSiegeEngines(unit) {
    const role = getTacticalRole(unit);
    // Cavalry and Large Beasts cannot push rams or climb ladders
    return !(role === "CAVALRY" || (unit.stats && unit.stats.isLarge));
}

function isCavalryUnit(unit) {
    if (!unit || !unit.stats) return false;
    // Exception: Always allow selection of the General
    if (unit.isCommander || unit.unitType === "General") return false;

    const txt = String(unit.unitType + " " + (unit.stats.role || "")).toLowerCase();
    const cavRegex = /(cav|cavalry|keshig|horse|lancer|mount|camel|eleph|knight)/;
    return cavRegex.test(txt);
}