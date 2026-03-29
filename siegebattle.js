// ============================================================================
// EMPIRE OF THE 13TH CENTURY - FULL CITY SIEGE ENGINE
// ============================================================================

let inSiegeBattle = false;
let currentSiegeCity = null;

function enterSiegeBattlefield(enemyNPC, playerObj, cityObj) {
    console.log(`INITIALIZING SIEGE BATTLE: ${cityObj.name}`);
    
    // 1. STATE HIJACK
    inBattleMode = true;
    inSiegeBattle = true;
    currentSiegeCity = cityObj;

    // 2. OVERRIDE BATTLE DIMENSIONS TO MATCH CITY
    BATTLE_WORLD_WIDTH = CITY_WORLD_WIDTH;      // 3200
    BATTLE_WORLD_HEIGHT = CITY_WORLD_HEIGHT;    // 4000
    BATTLE_COLS = CITY_COLS;
    BATTLE_ROWS = CITY_ROWS;

    // 3. COPY CITY ENVIRONMENT TO BATTLE ENVIRONMENT
    let faction = cityObj.faction;
    
    // Deep copy the grid so we don't permanently ruin the world map city
    battleEnvironment.grid = JSON.parse(JSON.stringify(cityDimensions[faction].grid));
    battleEnvironment.bgCanvas = cityDimensions[faction].bgCanvas;
    battleEnvironment.groundColor = ARCHITECTURE[faction] ? ARCHITECTURE[faction].ground : "#767950";
    battleEnvironment.visualPadding = 0; // City maps don't need the abyss padding

    currentBattleData = {
        enemyRef: enemyNPC, // This is the temporary Garrison Force object
        playerFaction: playerObj.faction || "Hong Dynasty",
        enemyFaction: faction,
        initialCounts: { player: 0, enemy: 0 },
        playerColor: (typeof FACTIONS !== 'undefined' && FACTIONS[playerObj.faction]) ? FACTIONS[playerObj.faction].color : "#ffffff",
        enemyColor: (typeof FACTIONS !== 'undefined' && FACTIONS[faction]) ? FACTIONS[faction].color : "#000000"
    };

    // 4. SABOTAGE THE GATES (Force Open & Destroy)
    if (typeof overheadCityGates !== 'undefined') {
        overheadCityGates.forEach(gate => {
            gate.gateHP = 0;
            gate.isOpen = true;
        });
        // This updates the grid so tile 6 (Wall) becomes tile 1 (Road) at the gate
        updateCityGates(battleEnvironment.grid); 
    }

    // 5. DEPLOY ARMIES
    let playerTroops = playerObj.troops || 0;
    
    // Deploy Attackers (Player) in the bottom 800px Siege Camp
    deploySiegeAttackers(currentBattleData.playerFaction, playerTroops, "player");
    
    // Deploy Defenders (AI) inside the walls and on the parapets
    deploySiegeDefenders(faction, enemyNPC.count, "enemy", enemyNPC.roster);

// Add this line around step 5 of enterSiegeBattlefield:
initSiegeEquipment();

    // 6. CAMERA & AUDIO
    playerObj.x = BATTLE_WORLD_WIDTH / 2;
    playerObj.y = BATTLE_WORLD_HEIGHT - 200; // Start camera at the siege camp

    if (typeof AudioManager !== 'undefined') {
        AudioManager.init();
        AudioManager.playMP3('music/battlemusic.mp3', false);
        AudioManager.playSound("charge"); 
    }

    if (typeof triggerEpicZoom === 'function') {
        triggerEpicZoom(0.1, 1.3, 3500);
    }
}

function deploySiegeAttackers(faction, totalTroops, side) {
    // Reuses the standard deployment but locks Y to the bottom deployment zone
    let originalHeight = BATTLE_WORLD_HEIGHT;
    
    // Fake the height temporarily so deployArmy puts them at the bottom of the 4000px map
    // deployArmy puts player at BATTLE_WORLD_HEIGHT - 300. So 4000 - 300 = 3700. Perfect.
    deployArmy(faction, totalTroops, side); 
}

function deploySiegeDefenders(faction, totalTroops, side, npcRoster) {
    currentBattleData.initialCounts[side] += totalTroops;
    
    let color = currentBattleData.enemyColor;
    let grid = battleEnvironment.grid;
    
    let wallTiles = [];
    let groundTiles = [];

    // --- SURGERY: ISOLATE THE SOUTH WALL ---
    // Calculate where the southern wall is based on the 45px margin
    let southWallTileY = Math.floor((CITY_LOGICAL_HEIGHT / BATTLE_TILE_SIZE) - (45 / BATTLE_TILE_SIZE));

    for (let x = 0; x < BATTLE_COLS; x++) {
        for (let y = 0; y < CITY_LOGICAL_ROWS; y++) {
            // Only grab wall tiles strictly on the southern defensive line
            if (grid[x][y] === 8 && y > southWallTileY - 8 && y < southWallTileY + 8) {
                wallTiles.push({x, y}); 
            }
            // Ground troops spawn just behind the south gate, not across the whole city
            if ((grid[x][y] === 1 || grid[x][y] === 5) && y > southWallTileY - 20 && y <= southWallTileY) {
                groundTiles.push({x, y}); 
            }
        }
    }

    wallTiles.sort(() => Math.random() - 0.5);
    groundTiles.sort(() => Math.random() - 0.5);

    let visualScale = totalTroops > 300 ? 5 : 1; 
    let unitsToSpawn = Math.round(totalTroops / visualScale); 

    for (let i = 0; i < unitsToSpawn; i++) {
        let unitType = npcRoster[i % npcRoster.length].type;
        let baseTemplate = UnitRoster.allUnits[unitType] || UnitRoster.allUnits["Militia"];
        
        let unitStats = Object.assign(new Troop(baseTemplate.name, baseTemplate.role, baseTemplate.isLarge, faction), baseTemplate);
        unitStats.morale = 25; 
        unitStats.maxMorale = 25;
        
        let spawnSpot = null;
        let isElevated = false;

        if ((unitStats.isRanged) && wallTiles.length > 0) {
            spawnSpot = wallTiles.pop();
            isElevated = true;
        } else if (groundTiles.length > 0) {
            spawnSpot = groundTiles.pop();
} else {
            // --- NEW SURGERY ---
            // Spread them horizontally so they don't collision-squirt vertically
            // y: southWallTileY - 12 is roughly 100px north of the wall (12 tiles * 8px)
            let horizontalSpread = Math.floor((Math.random() - 0.5) * 40); 
            spawnSpot = { x: (BATTLE_COLS/2) + horizontalSpread, y: southWallTileY - 12 }; 
        }

        let finalX = (spawnSpot.x * BATTLE_TILE_SIZE) + (Math.random() * 4);
        let finalY = (spawnSpot.y * BATTLE_TILE_SIZE) + (Math.random() * 4);

        if (isElevated) {
            unitStats.range = Math.floor(unitStats.range * 1.5); 
            unitStats.meleeDefense += 10; 
        }

        battleEnvironment.units.push({
            id: unitIdCounter++,
            side: side,
            faction: faction,
            color: color,
            unitType: unitType, 
            stats: unitStats, 
            hp: unitStats.health,
            x: finalX,
            y: finalY,
            target: null,
            state: "idle", 
            animOffset: Math.random() * 100,
            cooldown: 0,
            hasOrders: false,
            onWall: isElevated 
        });
    }
}

// --- THE FUNNEL OVERRIDE ---
// This is called inside battlefield_system.js to steer attackers through the gate
// --- THE REVISED FUNNEL OVERRIDE ---
// Handles both Gates and Deployed Ladders
function getSiegePathfindingVector(unit, target, originalDx, originalDy, originalDist) {
    // 1. HARD SAFETY: If not a siege or unit is already on the wall, do nothing.
    if (!inSiegeBattle || unit.side !== "player" || unit.onWall) {
        return { dx: originalDx, dy: originalDy, dist: originalDist };
    }

    const wallBoundaryY = CITY_LOGICAL_HEIGHT - 40; 

    // 2. FUNNEL LOGIC: If attacker is outside and target is inside
    if (unit.y > wallBoundaryY && target.y < wallBoundaryY) {
        
        // Priority A: Check for the South Gate
        let southGate = overheadCityGates.find(g => g.side === "south");
        
        // Priority B: Check for deployed ladders
        let activeLadders = siegeEquipment.ladders.filter(l => l.isDeployed && l.hp > 0);

        let bestEntryPoint = null;

        if (southGate && southGate.isOpen) {
            // Gate is open, head there
            bestEntryPoint = { x: southGate.x * BATTLE_TILE_SIZE, y: southGate.y * BATTLE_TILE_SIZE + 20 };
        } else if (activeLadders.length > 0) {
            // Gate is shut! Find the closest deployed ladder
            let closestLadder = activeLadders.reduce((prev, curr) => {
                return Math.hypot(curr.x - unit.x, curr.y - unit.y) < Math.hypot(prev.x - unit.x, prev.y - unit.y) ? curr : prev;
            });
            bestEntryPoint = { x: closestLadder.x, y: closestLadder.y + 10 };
        }

        if (bestEntryPoint) {
            let distToEntry = Math.hypot(bestEntryPoint.x - unit.x, bestEntryPoint.y - unit.y);
            // If not yet at the entry, force move toward it
            if (distToEntry > 30) {
                return {
                    dx: bestEntryPoint.x - unit.x,
                    dy: bestEntryPoint.y - unit.y,
                    dist: distToEntry
                };
            }
        }
    }
    
    return { dx: originalDx, dy: originalDy, dist: originalDist };
}
// ============================================================================
// SIEGE EQUIPMENT & ASSAULT LOGIC (APPEND TO SIEGEBATTLE.JS)
// ============================================================================

let siegeEquipment = {
    rams: [],
    trebuchets: [],
    mantlets: [],
    ladders: []
};

// --- 1. INITIALIZE EQUIPMENT ---
// Call this immediately after deploySiegeAttackers() inside enterSiegeBattlefield()
function initSiegeEquipment() {
    siegeEquipment = { rams: [], trebuchets: [], mantlets: [], ladders: [] };
    
    // 1. REPAIR THE GATE FOR THE RAM
    let southGate = overheadCityGates.find(g => g.side === "south");
    if (southGate) {
        southGate.gateHP = 1500; // Give the gate massive HP for the ram to break
        southGate.isOpen = false;
        updateCityGates(battleEnvironment.grid); // Reset grid collision to solid (6)
    }

    let campY = CITY_WORLD_HEIGHT - 350;
    let midX = CITY_WORLD_WIDTH / 2;

    // 2. SPAWN BATTERING RAM (Aligned with the South Gate)
    if (southGate) {
        siegeEquipment.rams.push({
            x: southGate.x * BATTLE_TILE_SIZE,
            y: campY - 50,
            targetGate: southGate,
            hp: 800,
            speed: 0.3,
            isBreaking: false
        });
    }

    // 3. SPAWN TRACTION TREBUCHETS (Artillery at the very back)
    for (let i = -1; i <= 1; i += 2) {
        siegeEquipment.trebuchets.push({
            x: midX + (i * 300),
            y: campY + 150,
            hp: 300,
            cooldown: Math.random() * 300,
            fireRate: 600 // Fires a massive boulder every 10 seconds
        });
    }

    // 4. SPAWN LARGE SHIELDS (Mantlets) - A protective wall for the infantry
    for (let i = -5; i <= 5; i++) {
        if (i === 0) continue; // Leave a gap in the center for the ram
        siegeEquipment.mantlets.push({
            x: midX + (i * 60),
            y: campY - 120,
            hp: 400
        });
    }

    // 5. SPAWN ASSAULT LADDERS (Distributed among the front lines)
    for (let i = -3; i <= 3; i += 2) {
        siegeEquipment.ladders.push({
            x: midX + (i * 120),
            y: campY - 80,
            carriedBy: null, // Will attach to a nearby unit
            isDeployed: false,
            hp: 150
        });
    }
}

// --- 2. UPDATE SIEGE EQUIPMENT LOGIC ---
// Call this inside updateBattleUnits() every frame
function processSiegeEngines() {
    if (!inSiegeBattle) return;
    
    let units = battleEnvironment.units;
    let playerUnits = units.filter(u => u.side === "player" && u.hp > 0);
    let enemyUnits = units.filter(u => u.side === "enemy" && u.hp > 0 && u.onWall);

    // 1. BATTERING RAM LOGIC
    siegeEquipment.rams.forEach(ram => {
        if (ram.hp <= 0 || !ram.targetGate) return;

let pushers = playerUnits.filter(u => {
    const role = String(u.stats?.role || "").toLowerCase();
    const name = String(u.stats?.name || u.name || "").toLowerCase();
    const type = String(u.unitType || "").toLowerCase();

    const text = `${role} ${name} ${type}`;

    const isMountedOrLarge =
        u.stats?.isLarge ||
        text.includes("cavalry") ||
        text.includes("horse") ||
        text.includes("mounted") ||
        text.includes("rider") ||
        text.includes("camel") ||
        text.includes("elephant") ||
        text.includes("eleph") ||
        text.includes("lancer") ||
        text.includes("knight") ||
        text.includes("dragoon") ||
        text.includes("charger") ||
        text.includes("horsearcher") ||
        text.includes("horse archer") ||
        text.includes("camel archer") ||
        text.includes("camel gun") ||
        text.includes("camel gunner") ||
        text.includes("mounted gun") ||
        text.includes("mounted gunner");

    return (
        Math.hypot(u.x - ram.x, u.y - ram.y) < 60 &&
        !isMountedOrLarge
    );
});
		
		
        let gateY = ram.targetGate.y * BATTLE_TILE_SIZE;
        let distToGate = ram.y - gateY;

        if (pushers.length > 0 && distToGate > 40) {
            // Ram moves forward
            ram.y -= ram.speed * Math.min(pushers.length * 0.2, 1); // Caps at max speed
            ram.isBreaking = false;
        } else if (distToGate <= 40 && pushers.length > 0) {
            // Ram is at the gate and being manned
            ram.isBreaking = true;
            if (Math.random() > 0.95) { // Damage tick
                ram.targetGate.gateHP -= 15 + (pushers.length * 2);
                if (typeof AudioManager !== 'undefined') AudioManager.playSound('hit'); // Heavy thud
                
                // Gate Breaks!
                if (ram.targetGate.gateHP <= 0) {
                    ram.targetGate.isOpen = true;
                    updateCityGates(battleEnvironment.grid);
                    console.log("THE GATES HAVE BEEN BREACHED!");
                }
            }
        } else {
            ram.isBreaking = false; // Abandoned
        }
    });

    // 2. LADDER ASSAULT LOGIC
    let wallBoundaryY = CITY_LOGICAL_HEIGHT - 60; // Outer edge of the stone wall

    siegeEquipment.ladders.forEach(ladder => {
        if (ladder.hp <= 0 || ladder.isDeployed) return;

		if (!ladder.carriedBy || ladder.carriedBy.hp <= 0) {
			ladder.carriedBy = playerUnits.find(u => 
				Math.hypot(u.x - ladder.x, u.y - ladder.y) < 30 && 
				!u.isCommander && 
				!u.stats.isLarge && 
				!u.stats.role.includes("cavalry") && 
				!u.stats.role.includes("horse")
			);
		}

        if (ladder.carriedBy) {
            // Ladder follows the unit carrying it
            ladder.x = ladder.carriedBy.x;
            ladder.y = ladder.carriedBy.y;

            // Force the carrier to run straight for the wall
            if (ladder.y > wallBoundaryY) {
                ladder.carriedBy.target = { x: ladder.x, y: wallBoundaryY - 10, isDummy: true };
            }

            // Deploy Ladder!
            if (ladder.y <= wallBoundaryY + 10) {
                deployAssaultLadder(ladder);
            }
        }
    });

    // 3. MANTLET (SHIELD) AURA & ARROW INTERCEPTION
    // Attackers behind shields take 50% fewer arrow hits.
    for (let i = battleEnvironment.projectiles.length - 1; i >= 0; i--) {
        let p = battleEnvironment.projectiles[i];
        
        // If it's an enemy arrow flying south towards the attackers
        if (p.side === "enemy" && p.vy > 0) {
            for (let m of siegeEquipment.mantlets) {
                if (m.hp > 0 && Math.abs(p.x - m.x) < 30 && Math.abs(p.y - m.y) < 20) {
                    if (Math.random() < 0.50) { // 50% block chance
                        m.hp -= p.attackerStats.missileBaseDamage || 10;
                        battleEnvironment.projectiles.splice(i, 1); // Delete arrow
                        break; 
                    }
                }
            }
        }
    }

    // 4. TREBUCHET ARTILLERY
    siegeEquipment.trebuchets.forEach(treb => {
        if (treb.hp <= 0) return;
        
        treb.cooldown--;
        if (treb.cooldown <= 0 && enemyUnits.length > 0) {
            treb.cooldown = treb.fireRate;
            
            // Pick a random defender on the wall
            let target = enemyUnits[Math.floor(Math.random() * enemyUnits.length)];
            
            let dx = target.x - treb.x;
            let dy = target.y - treb.y;
            let dist = Math.hypot(dx, dy);
            let speed = 6;

            battleEnvironment.projectiles.push({
                x: treb.x, y: treb.y,
                vx: (dx / dist) * speed,
                vy: (dy / dist) * speed,
                startX: treb.x, startY: treb.y,
                maxRange: 3500,
                attackerStats: { role: "bomb", missileAPDamage: 150, missileBaseDamage: 50, name: "Trebuchet Boulder" },
                side: "player",
                projectileType: "bomb", // Reusing your bomb visual/logic
                isFire: false
            });
            
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('bomb'); // Boom sound
        }
    });
}

// --- 3. DEPLOY LADDER TO GRID ---
function deployAssaultLadder(ladder) {
    ladder.isDeployed = true;
    ladder.carriedBy = null;

    let tileX = Math.floor(ladder.x / BATTLE_TILE_SIZE);
    let tileY = Math.floor((ladder.y - 20) / BATTLE_TILE_SIZE); // Map it slightly forward onto the wall

    // Change grid IDs to 9 (Ladder Bridge) so units can walk up
    for (let x = tileX - 2; x <= tileX + 2; x++) {
        for (let y = tileY - 4; y <= tileY; y++) {
            if (battleEnvironment.grid[x] && battleEnvironment.grid[x][y] !== undefined) {
                battleEnvironment.grid[x][y] = 9; 
            }
        }
    }

    // Register globally so troops know they can use it
    if (typeof cityLadders !== 'undefined') {
        cityLadders.push({
            x: ladder.x,
            y: ladder.y - 20
        });
    }
    console.log("Assault Ladder Deployed!");
}

// --- 4. RENDER SIEGE EQUIPMENT ---
function renderSiegeEngines(ctx) {
    if (!inSiegeBattle) return;

    // 1. MANTLETS (Heavy wooden barricades)
    siegeEquipment.mantlets.forEach(m => {
        if (m.hp <= 0) return;
        ctx.fillStyle = "#4e342e";
        ctx.fillRect(m.x - 25, m.y - 5, 50, 10);
        ctx.fillStyle = "#3e2723"; // Wood planks
        ctx.fillRect(m.x - 23, m.y - 3, 46, 2);
        ctx.fillRect(m.x - 23, m.y + 1, 46, 2);
        // Props holding it up
        ctx.fillRect(m.x - 15, m.y + 5, 4, 15);
        ctx.fillRect(m.x + 11, m.y + 5, 4, 15);
    });

    // 2. LADDERS
    siegeEquipment.ladders.forEach(l => {
        if (l.hp <= 0) return;
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.strokeStyle = "#8d6e63";
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        if (l.isDeployed) {
            // Rendered Vertically against the wall
            ctx.moveTo(-10, -40); ctx.lineTo(-10, 20);
            ctx.moveTo(10, -40); ctx.lineTo(10, 20);
            for(let r = -35; r < 20; r += 10) {
                ctx.moveTo(-10, r); ctx.lineTo(10, r);
            }
        } else {
            // Rendered Horizontally (Being carried)
            ctx.moveTo(-30, -5); ctx.lineTo(30, -5);
            ctx.moveTo(-30, 5); ctx.lineTo(30, 5);
            for(let r = -25; r < 30; r += 10) {
                ctx.moveTo(r, -5); ctx.lineTo(r, 5);
            }
        }
        ctx.stroke();
        ctx.restore();
    });

    // 3. BATTERING RAMS
    siegeEquipment.rams.forEach(r => {
        if (r.hp <= 0) return;
        ctx.save();
        ctx.translate(r.x, r.y);
        
        // Ram momentum visual
        let lunge = r.isBreaking ? Math.sin(Date.now() / 50) * 8 : 0;

        // Wooden Penthouse (Roof to protect pushers)
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(-20, -30, 40, 60);
        ctx.fillStyle = "#3e2723";
        ctx.fillRect(-22, -32, 44, 15); // Front armor plate

        // The actual Ram Log
        ctx.fillStyle = "#212121"; // Iron Head
        ctx.fillRect(-6, -45 + lunge, 12, 15);
        ctx.fillStyle = "#4e342e"; // Wood shaft
        ctx.fillRect(-4, -30 + lunge, 8, 50);

        // Wheels
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(-26, -20, 6, 12); ctx.fillRect(20, -20, 6, 12);
        ctx.fillRect(-26, 10, 6, 12); ctx.fillRect(20, 10, 6, 12);

        ctx.restore();
    });

    // 4. TREBUCHETS
    siegeEquipment.trebuchets.forEach(t => {
        if (t.hp <= 0) return;
        ctx.save();
        ctx.translate(t.x, t.y);

        // Base frame
        ctx.fillStyle = "#3e2723";
        ctx.fillRect(-15, -20, 30, 40);
        
        // Throwing Arm (Animates when firing)
        let armAngle = (t.cooldown > t.fireRate - 30) ? -Math.PI / 4 : Math.PI / 6;
        ctx.rotate(armAngle);
        
        ctx.fillStyle = "#4e342e";
        ctx.fillRect(-4, -35, 8, 50); // The long arm
        
        // Counterweight
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(-10, 15, 20, 15);
        
        ctx.restore();
    });
}

// Call this inside your unit update loop: if (inSiegeBattle) checkAssaultLadders(unit);
function checkAssaultLadders(unit) {
    if (!inSiegeBattle || unit.hp <= 0 || unit.onWall) return;

    // Check if unit is standing on a ladder tile (Grid ID 9)
    let tx = Math.floor(unit.x / BATTLE_TILE_SIZE);
    let ty = Math.floor(unit.y / BATTLE_TILE_SIZE);

    if (battleEnvironment.grid[tx] && battleEnvironment.grid[tx][ty] === 9) {
        // SUCCESS: Unit climbs the ladder
        unit.onWall = true;
        unit.y -= 40; // Teleport slightly onto the wall floor to prevent glitching back down
        
        if (unit.isCommander) {
            console.log("Commander has reached the ramparts!");
        }
    }
}

 
function concludeSiegeBattlefield(playerObj) {
    console.log("Concluding Siege Assault...");

    inBattleMode = false; 
    inSiegeBattle = false;

    // Tally up survivors
    let pUnitsAlive = battleEnvironment.units.filter(u => u.side === "player" && !u.isCommander && u.hp > 0).length;
    let eUnitsAlive = battleEnvironment.units.filter(u => u.side === "enemy" && u.hp > 0).length; 

    let scale = (currentBattleData.initialCounts.player > 300) ? 5 : 1; 
    let playerLost = currentBattleData.initialCounts.player - (pUnitsAlive * scale);
    
    // Apply losses to global player
    playerObj.troops = Math.max(0, (playerObj.troops || 0) - playerLost);

    let city = currentSiegeCity;
    let didPlayerWin = eUnitsAlive === 0;

    // GUI Elements
    const siegeGui = document.getElementById("siege-gui");
    const statusText = document.getElementById("siege-status-text");
    const guiContinueBtn = document.getElementById("gui-continue-btn");
    const guiAssaultBtn = document.getElementById("gui-assault-btn");
    const guiLeaveBtn = document.getElementById("gui-leave-btn");

    if (didPlayerWin) {
        // PLAYER WINS: Conquer the city
        console.log(`${city.name} has fallen to the Assault!`);
        city.faction = playerObj.faction;
        city.color = (typeof FACTIONS !== 'undefined' && FACTIONS[playerObj.faction]) ? FACTIONS[playerObj.faction].color : "#ffffff";
        
        let occupyingForce = Math.max(5, Math.floor(playerObj.troops * 0.3));
        city.militaryPop = occupyingForce;
        city.troops = occupyingForce;
        playerObj.troops -= occupyingForce;
        city.isUnderSiege = false;
        
        if (typeof activeSieges !== 'undefined') {
            let sIndex = activeSieges.findIndex(s => s.defender === city);
            if (sIndex > -1) activeSieges.splice(sIndex, 1);
        }
        
        // NATIVE GUI UPDATE: VICTORY
        if (siegeGui) siegeGui.style.display = 'block';
        if (statusText) statusText.innerHTML = `ASSAULT SUCCESSFUL!<br><span style="font-size:0.9rem; color:#fff;">${city.name} is yours. You lost ${playerLost} troops in the breach. You left ${occupyingForce} men to garrison.</span>`;
        if (guiContinueBtn) guiContinueBtn.style.display = 'none';
        if (guiAssaultBtn) guiAssaultBtn.style.display = 'none';
        if (guiLeaveBtn) {
            guiLeaveBtn.innerText = "Enter City";
            guiLeaveBtn.onclick = () => {
                siegeGui.style.display = 'none';
                playerObj.isSieging = false;
                playerObj.stunTimer = 0;  
            };
        }
        
    } else {
        // PLAYER RETREATS: Attrition phase resumes
        console.log("Assault called off. Resuming blockade.");
        city.militaryPop = Math.max(1, eUnitsAlive * scale);
        city.troops = city.militaryPop;
        
        // NATIVE GUI UPDATE: DEFEAT
        if (siegeGui) siegeGui.style.display = 'block';
        if (statusText) statusText.innerHTML = `ASSAULT FAILED!<br><span style="font-size:0.9rem; color:#aaa;">You retreated with ${playerLost} casualties.<br>The blockade continues against ${city.militaryPop} defenders.</span>`;
        
        if (guiContinueBtn) guiContinueBtn.style.display = 'block';
        if (guiAssaultBtn) guiAssaultBtn.style.display = 'block';
       if (guiLeaveBtn) {
            guiLeaveBtn.innerText = "Abandon Siege";
            guiLeaveBtn.onclick = () => {
                if (typeof endSiege === 'function') endSiege(false);
                
                // --- SURGERY: Force unfreeze the player and clear states ---
                playerObj.isSieging = false;
                playerObj.stunTimer = 0; 
                
                if (siegeGui) siegeGui.style.display = 'none';
            };
        }

        // CRITICAL STATE FIX: Keep player locked into the siege overworld loop
        playerObj.isSieging = true;
        playerObj.stunTimer = 9999; 
        
        if (typeof restoreSiegeAfterBattle === 'function') {
            restoreSiegeAfterBattle(false);
        }
    }

    // Restore Camera and State
    if (savedWorldPlayerState_Battle.x !== 0) {
        playerObj.x = savedWorldPlayerState_Battle.x;
        playerObj.y = savedWorldPlayerState_Battle.y;
    }

    if (typeof camera !== 'undefined') {
        camera.x = playerObj.x - canvas.width / 2;
        camera.y = playerObj.y - canvas.height / 2;
    }

    // Cleanup Memory
    currentBattleData = null; 
    currentSiegeCity = null;
    battleEnvironment.units = []; 
    battleEnvironment.projectiles = [];
}


function monitorSiegeEndState(playerObj) {
    if (!inSiegeBattle) return;

    let attackersAlive = battleEnvironment.units.filter(u => u.side === "player" && u.hp > 0).length;
    let defendersAlive = battleEnvironment.units.filter(u => u.side === "enemy" && u.hp > 0).length;

    // Trigger your existing conclusion function if conditions are met
    if (defendersAlive === 0) {
        concludeSiegeBattlefield(playerObj); // Victory!
    } else if (attackersAlive === 0 || !isCommanderAlive()) {
        concludeSiegeBattlefield(playerObj); // Defeat/Retreat
    }
}