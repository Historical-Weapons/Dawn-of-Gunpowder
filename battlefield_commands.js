// ============================================================================
// EMPIRE OF THE 13TH CENTURY - COMMAND & TACTICS ENGINE (REVISED)
// ============================================================================

let currentSelectionGroup = null; 
let currentFormationStyle = "line"; 

let isRightDragging = false;
let dragStartPos = { x: 0, y: 0 };
let dragCurrentPos = { x: 0, y: 0 };

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
    const activeCommander = battleEnvironment.units.find(u => u.side === 'player' && (u.isCommander || u.isPlayer));
    
    if (!activeCommander || activeCommander.hp <= 0) {
        console.log("Command failed: Player General is fallen or not found!");
        return; 
    }

    // 3. DEFINE SCOPES
    const playerUnits = battleEnvironment.units.filter(u => u.side === "player" && !u.isCommander && !u.isPlayer && u.hp > 0);
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
            let willBeSelected = (groupNum === 5) ? true : (COMMAND_GROUPS[groupNum] && COMMAND_GROUPS[groupNum].includes(u.stats.role));
            
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
        if (key === "z") currentFormationStyle = "tight";  
        if (key === "x") currentFormationStyle = "loose";  
        if (key === "c") currentFormationStyle = "line";   
        if (key === "v") currentFormationStyle = "circle"; 
        if (key === "b") currentFormationStyle = "square"; 
        
        selectedUnits.forEach(u => {
            u.hasOrders = true;
            u.orderType = "follow";
            u.orderTargetPoint = null;
            u.formationTimer = 240; // 4 seconds at 60fps for ranged units to focus on moving
        });

        if (commander) {
            calculateFormationOffsets(selectedUnits, currentFormationStyle, commander);
        }
        return;
    }

    // =========================
    // Q, E, R, F: TACTICAL ORDERS
    // =========================
    switch (key) {
        case "f": // FOLLOW COMMANDER
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
            break;

        case "r": // RETREAT 
            selectedUnits.forEach(u => {
                u.hasOrders = true;
                u.orderType = "retreat";
                let stagger = (Math.random() * 20); 
                u.orderTargetPoint = { x: u.x, y: BATTLE_WORLD_HEIGHT - 50 - stagger }; 
                u.formationTimer = 240;
            });
            break;

        case "e": // STOP / CANCEL ORDERS
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

// --- TACTICAL ROLE HELPER ---
function getTacticalRole(unit) {
    if (!unit.stats) return "INFANTRY";
    let r = unit.stats.role ? unit.stats.role : "";
    
    if ([ROLES.BOMB, ROLES.ROCKET, ROLES.FIRELANCE, ROLES.GUNNER].includes(r)) return "GUNPOWDER";
    if ([ROLES.CAVALRY, ROLES.HORSE_ARCHER, ROLES.MOUNTED_GUNNER, ROLES.CAMEL, ROLES.ELEPHANT].includes(r)) return "CAVALRY";
    if ([ROLES.ARCHER, ROLES.CROSSBOW, ROLES.THROWING].includes(r)) return "RANGED";
    if (r === ROLES.SHIELD) return "SHIELD";
    
    return "INFANTRY";
}

// --- FORMATION MATH ---
function calculateFormationOffsets(units, style, commander) {
    let shields = [], infantry = [], ranged = [], gunpowder = [], cavalry = [];

    units.forEach(u => {
        let role = getTacticalRole(u);
        if (role === "GUNPOWDER") gunpowder.push(u);
        else if (role === "CAVALRY") cavalry.push(u);
        else if (role === "RANGED") ranged.push(u);
        else if (role === "SHIELD") shields.push(u);
        else infantry.push(u);
    });

    const assignBlock = (group, startY, spacing, maxCols, isFlank = false, flankOffset = 250) => {
        group.forEach((u, i) => {
            let r = Math.floor(i / maxCols);
            let c = i % maxCols;
            let offset_X = (c - (Math.min(group.length - (r * maxCols), maxCols) - 1) / 2) * spacing;
            
            if (isFlank) {
                let sideMult = (i % 2 === 0) ? 1 : -1;
                offset_X = (flankOffset + (Math.floor(i/2) * spacing)) * sideMult;
            }
            
            u.formationOffsetX = offset_X + (Math.random() - 0.5) * 5; 
            u.formationOffsetY = startY + (r * spacing) + (Math.random() - 0.5) * 5;
        });
    };

    const assignRing = (group, radius) => {
        group.forEach((u, i) => {
            let angle = (i / group.length) * Math.PI * 2;
            u.formationOffsetX = Math.cos(angle) * radius + (Math.random() - 0.5) * 5;
            u.formationOffsetY = Math.sin(angle) * radius + (Math.random() - 0.5) * 5;
        });
    };

    switch (style) {
case "tight": 
    // LINE 1: SHIELDS (Absolute Front)
    // -75 puts them at the very tip of the formation
    assignBlock(shields, -75, 16, 30); 

    // LINE 2: OTHER INFANTRY (Directly behind shields)
    // -50 keeps them close enough to support the shield wall
    assignBlock(infantry, -50, 16, 30);

    // LINE 3: RANGED (Behind the infantry)
    // -25 gives them a clear view over the heads of the front lines
    assignBlock(ranged, -25, 16, 30);

    // GUNPOWDER: Specialized narrow line
    assignBlock(gunpowder, -55, 18, 5, true, 180); 
    
    // CAVALRY: Single-rank rear reserve (as per your previous revision)
    assignBlock(cavalry, 100, 15, 99, false);                  
    break;
        case "loose":
            assignBlock([...shields, ...infantry], -50, 40, 20);
            assignBlock(ranged, -90, 40, 20);
            assignBlock(gunpowder, -20, 40, 15);
            assignBlock(cavalry, -50, 45, 5, true, 280); 
            break;
        case "line":
            assignBlock([...shields, ...infantry], -20, 22, 45); 
            assignBlock(ranged, -45, 22, 45);
            assignBlock(gunpowder, -70, 22, 45);
            assignBlock(cavalry, -30, 22, 6, true, 250); 
            break;
            
case "circle":
            let allInfantry = [...shields, ...infantry, ...ranged, ...gunpowder];
            
            // Expanded inner ring to give breathing room in the center
            assignRing(cavalry, 80); 
            
            // Pushed outer ring further out (minimum 150px) to create a wide "lane" for pathing
            let outerRadius = Math.max(150, allInfantry.length * 4); 
            assignRing(allInfantry, outerRadius); 
            break;
            
        case "square":
            let squarePool = [...cavalry, ...shields, ...infantry, ...gunpowder, ...ranged];
            let sqCols = Math.ceil(Math.sqrt(squarePool.length));
            let sqSpacing = 24;
            let gridPoints = [];
            
            let half = (sqCols - 1) / 2;
            for (let r = 0; r < sqCols; r++) {
                for (let c = 0; c < sqCols; c++) {
                    gridPoints.push({
                        x: (c - half) * sqSpacing,
                        y: (r - half) * sqSpacing
                    });
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

// --- DYNAMIC AI OVERRIDE LOOP ---
function processTacticalOrders() {
    if (!inBattleMode || !battleEnvironment.units) return;
    
const commander = battleEnvironment.units.find(u => u.isCommander && u.side === 'player');

    battleEnvironment.units.forEach(unit => {
        if (unit.side !== "player" || unit.isCommander || unit.hp <= 0) return;

        // Decrement formation timer
        if (unit.formationTimer > 0) unit.formationTimer--;

        // 1. SELF-PRESERVATION / EMERGENCY CHECK
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

        // ====================================================================
        // SURVIVAL OVERRIDE (FIXED): Absolute priority if enemy is < 100px
        // ====================================================================
        if (nearestDist < emergencyThreshold && nearestEnemy) {
            // Restore weapons if they were lowered for marching
            if (unit.originalRange) {
                unit.stats.range = unit.originalRange;
                unit.originalRange = null;
            }
            
            // Snap out of the "marching trance" instantly
            unit.formationTimer = 0; 
            
            // Lock onto the immediate threat
            unit.target = nearestEnemy;
            
            // The 'return' halts all waypoint/formation logic below. 
            // They will fight the danger instead of walking past it. 
            return; 
        }

        // 2. EXECUTE ORDERS (Safe Waypoints & Ranged Shooting Focus)
        if (unit.hasOrders) {
			
			
			// ==========================
// SEEK & ENGAGE (NEW LOGIC)
// ==========================
if (unit.orderType === "seek_engage") {
    if (nearestEnemy) {
        unit.target = nearestEnemy;

        // OPTIONAL: mild forward bias (keeps army advancing instead of stalling)
        if (unit.stats.morale > 5) {
            let dx = nearestEnemy.x - unit.x;
            let dy = nearestEnemy.y - unit.y;
            let dist = Math.hypot(dx, dy);

            if (dist > unit.stats.range * 0.9) {
                // set a soft waypoint instead of forcing it
                unit.target = nearestEnemy;
            }
        }
    }
    return; // CRITICAL: skip formation movement logic
}
// ==========================
            // SMART SIEGE ASSAULT LOGIC
            // ==========================
            if (unit.orderType === "siege_assault") {
                let wallBoundaryY = (typeof CITY_LOGICAL_HEIGHT !== 'undefined' ? CITY_LOGICAL_HEIGHT : 3200) - 40;
                let southGate = typeof overheadCityGates !== 'undefined' ? overheadCityGates.find(g => g.side === "south") : null;
                let gateBreached = southGate && (southGate.gateHP <= 0 || southGate.isOpen);
                
                // --- PHASE 2: GATE IS BREACHED OR WE ARE OVER THE WALL ---
                if (gateBreached || unit.y < wallBoundaryY || unit.onWall) {
                    // 1. Force Ranged into Melee mode once inside the city walls
                    if (unit.y < wallBoundaryY && (unit.stats.role === "archer" || unit.stats.role === "crossbow" || getTacticalRole(unit) === "GUNPOWDER")) {
                        unit.stats.range = 10; // Lock to melee
                        unit.stats.currentStance = "statusmelee";
                    }

                    // 2. Everyone drops siege roles and floods the city
                    if (nearestEnemy) {
                        unit.target = nearestEnemy;
                        
                        // Cavalry gets aggressive pathing straight through the gate
                        if (unit.siegeRole === "cavalry_reserve" && unit.y > wallBoundaryY && southGate) {
                            unit.target = { x: southGate.x * BATTLE_TILE_SIZE, y: southGate.y * BATTLE_TILE_SIZE - 50, isDummy: true };
                        }
                    }
                    return; // Skip standard movement, let them swarm
                }

                // --- PHASE 1: SIEGE EQUIPMENT PUSH ---
                let destX = unit.x;
                let destY = unit.y;

                switch (unit.siegeRole) {
                    case "ram_pusher":
                        if (unit.siegeTarget && unit.siegeTarget.hp > 0) {
                            destX = unit.siegeTarget.x + (Math.random() - 0.5) * 15;
                            // Queue system: First 6 push, the rest line up behind them
                            let queueOffset = unit.queuePos > 6 ? (unit.queuePos * 4) : 0; 
                            destY = unit.siegeTarget.y + 15 + queueOffset;
                        } else {
                            unit.siegeRole = "infantry_reserve"; // Ram destroyed, become reserve
                        }
                        break;

                    case "ladder_carrier":
                        if (unit.siegeTarget && unit.siegeTarget.hp > 0) {
                            if (!unit.siegeTarget.isDeployed) {
                                // Move to carry or escort the ladder
                                destX = unit.siegeTarget.x + (Math.random() - 0.5) * 20;
                                let queueOffset = unit.queuePos > 2 ? (unit.queuePos * 5) : 0;
                                destY = unit.siegeTarget.y + 10 + queueOffset;
                            } else {
                                // Ladder is up! Climb it.
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
                            destY = unit.siegeTarget.y + 20 + (Math.random() * 10);
                        } else {
                            unit.siegeRole = "ranged_support";
                        }
                        break;

                    case "ranged_support":
                        // Move up close behind the infantry line / mantlets
                        destX = unit.x; // Keep horizontal spread
                        let frontLineY = siegeEquipment.rams[0] ? siegeEquipment.rams[0].y : wallBoundaryY + 300;
                        destY = Math.max(frontLineY + 120, wallBoundaryY + 150);
                        
                        // If they have a clean shot at a wall defender, take it
                        if (nearestEnemy && nearestEnemy.onWall && Math.hypot(unit.x - nearestEnemy.x, unit.y - nearestEnemy.y) < unit.stats.range) {
                            unit.target = nearestEnemy;
                            return;
                        }
                        break;

                    case "infantry_reserve":
                        destX = unit.x;
                        destY = wallBoundaryY + 200; // Wait patiently outside arrow range
                        break;

                    case "cavalry_reserve":
                        destX = unit.x;
                        destY = wallBoundaryY + 350; // Wait behind the archers
                        break;
                }

                // Assign the calculated staging waypoint
                unit.target = { 
                    x: destX, 
                    y: destY, 
                    hp: 100, 
                    isDummy: true,
                    side: unit.side, 
                    stats: { meleeDefense: 0, armor: 0, health: 100 } 
                };
                
                return; // Override standard pathing
            }

//standard
			
            let destX = unit.x;
            let destY = unit.y;

            if (unit.orderType === "follow" && commander) {
                destX = commander.x + (unit.formationOffsetX || 0);
                destY = commander.y + (unit.formationOffsetY || 0);
            } else if (unit.orderTargetPoint) {
                destX = unit.orderTargetPoint.x;
                destY = unit.orderTargetPoint.y;
            }

            let distToDest = Math.hypot(unit.x - destX, unit.y - destY);
            let shouldFocusOnShooting = false;
            
            if (distToDest > 20) {
                // Ranged units prioritize shooting over strict formation movement if timer is out
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

                // Lower weapons and keep marching if not focusing on shooting
                if (!shouldFocusOnShooting) {
                    if (!unit.originalRange && unit.stats.range > 20) {
                        unit.originalRange = unit.stats.range;
                    }
                    unit.stats.range = 10; 
                }
            } else {
                // Arrived at formation spot! Restore range so they can fire.
                if (unit.originalRange) {
                    unit.stats.range = unit.originalRange;
                    unit.originalRange = null; 
                }
            }

            // Assign the formation target only if they aren't currently distracted by shooting
            if (!shouldFocusOnShooting) {
                unit.target = { 
                    x: destX, 
                    y: destY, 
                    hp: 100, 
                    isDummy: true,
                    side: unit.side, 
                    stats: { meleeDefense: 0, armor: 0, health: 100, experienceLevel: 0, currentStance: "statusmelee" } 
                };
                unit.stats.currentStance = "statusmelee"; 
            }
            
        } else {
            // Fallback cleanup if orders are cancelled manually via the 'e' key
            if (unit.originalRange) {
                unit.stats.range = unit.originalRange;
                unit.originalRange = null;
            }
        }
    });
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
            u.selected = (u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY);
        });
        
        currentSelectionGroup = null; 
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('ui_click');
    } 
    // SINGLE / DOUBLE CLICK
    else {
        let clickedUnit = null;
        let closestDist = Infinity;
        
        playerUnits.forEach(u => {
            let hitbox = (u.stats.radius || 10) + 20; // Generous clicking area
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

    const playerUnits = battleEnvironment.units.filter(u => u.selected && u.hp > 0);
    if (playerUnits.length === 0) return;

    const targetPos = getBattleMousePos(e);

    // Calculate formation shape before issuing orders
    calculateFormationOffsets(playerUnits, currentFormationStyle, null);

    playerUnits.forEach(u => {
        u.hasOrders = true;
        u.orderType = "move_to_point";
        
        // Ensure they have a fallback of 0 if formation failed
        let offX = u.formationOffsetX || 0;
        let offY = u.formationOffsetY || 0;

        u.orderTargetPoint = {
            x: targetPos.x + offX,
            y: targetPos.y + offY
        };
        u.formationTimer = 240; 
    });

    if (typeof AudioManager !== 'undefined') AudioManager.playSound('ui_click'); 
});

// ============================================================================
// SIEGE ASSAULT COMMAND ENGINE
// ============================================================================
function executeSiegeAssaultAI(units) {
    if (!siegeEquipment) return;

    let meleeInfantry = [];
    let gunpowder = [];
    let archers = [];
    let cavalry = [];

    // 1. Categorize Troops
    units.forEach(u => {
        let role = getTacticalRole(u);
        let textCheck = (u.stats.name + " " + u.unitType).toLowerCase();
        
        if (role === "CAVALRY" || u.stats.isLarge || textCheck.includes("elephant") || textCheck.includes("camel")) {
            cavalry.push(u);
        } else if (role === "GUNPOWDER") {
            gunpowder.push(u);
        } else if (role === "RANGED") {
            archers.push(u);
        } else {
            meleeInfantry.push(u);
        }
    });

    // 2. Identify Artillery Crews (Gunpowder first, then Archers if needed)
    let artilleryCrews = [];
    let trebCount = siegeEquipment.trebuchets.length;
    let crewsNeeded = trebCount * 3; // 3 men per trebuchet visually

    while (artilleryCrews.length < crewsNeeded && gunpowder.length > 0) {
        artilleryCrews.push(gunpowder.shift());
    }
    while (artilleryCrews.length < crewsNeeded && archers.length > 0) {
        artilleryCrews.push(archers.shift());
    }

    // 3. Assign Orders
    let ramIndex = 0;
    let ladderIndex = 0;

    // Distribute Melee Infantry
    meleeInfantry.forEach((u, index) => {
        u.hasOrders = true;
        u.orderType = "siege_assault";
        u.siegeRole = "infantry_reserve";
        
        // Assign to Rams (Front of the queue)
        if (siegeEquipment.rams.length > 0 && index < 25) { 
            u.siegeRole = "ram_pusher";
            u.siegeTarget = siegeEquipment.rams[ramIndex % siegeEquipment.rams.length];
            u.queuePos = index; // Used to line them up behind the ram
            ramIndex++;
        } 
        // Assign to Ladders
        else if (siegeEquipment.ladders.length > 0 && index >= 25 && index < 60) {
            u.siegeRole = "ladder_carrier";
            u.siegeTarget = siegeEquipment.ladders[ladderIndex % siegeEquipment.ladders.length];
            u.queuePos = index - 25;
            ladderIndex++;
        }
    });

    // Distribute Artillery Crews
    artilleryCrews.forEach((u, index) => {
        u.hasOrders = true;
        u.orderType = "siege_assault";
        u.siegeRole = "trebuchet_crew";
        u.siegeTarget = siegeEquipment.trebuchets[index % trebCount];
    });

    // Distribute remaining Ranged (Support fire behind infantry)
    [...gunpowder, ...archers].forEach(u => {
        u.hasOrders = true;
        u.orderType = "siege_assault";
        u.siegeRole = "ranged_support";
    });

    // Distribute Cavalry (Rear Guard)
    cavalry.forEach(u => {
        u.hasOrders = true;
        u.orderType = "siege_assault";
        u.siegeRole = "cavalry_reserve";
    });

    if (typeof AudioManager !== 'undefined') AudioManager.playSound('charge');
}